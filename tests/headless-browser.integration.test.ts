/**
 * Headless Browser Integration Tests for Colyseus
 * 
 * These tests simulate a browser-like environment (via jsdom) to verify
 * the client-side Colyseus integration behaves correctly. The tests use
 * fake/mock implementations to avoid actual network calls while testing
 * the full integration flow.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  HelloPayload,
  InputFrame,
  PingPayload,
  PongPayload,
  RoomSnapshot,
  StateDelta,
  WelcomePayload,
  BlockResult
} from "../shared/protocol";
import { createMultiplayerSession } from "../src/sprint-craft/multiplayer/session";
import { createColyseusClient } from "../src/sprint-craft/multiplayer/colyseus-client";
import type { ColyseusClient, RoomLike, ClientLike } from "../src/sprint-craft/multiplayer/colyseus-client";
import type { SessionAdapter } from "../src/sprint-craft/multiplayer/adapters";
import { createDiagnostics, computeChecksum } from "../src/sprint-craft/multiplayer/diagnostics";
import { createSyncBudgetTracker } from "../src/sprint-craft/multiplayer/sync-budget";
import { DEFAULT_TICK_CONTRACT, getTickIntervals } from "../src/sprint-craft/multiplayer/tick-contract";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { applyInputFrame } from "../src/sprint-craft/voxels/player-controller";
import { createPredictionBuffer, recordInputFrame, reconcilePrediction } from "../src/sprint-craft/multiplayer/prediction";

/**
 * Mock WebSocket that simulates browser WebSocket behavior
 */
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  private messageQueue: unknown[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.(new Event("open"));
    }, 10);
  }

  send(data: string | ArrayBuffer) {
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // CLOSED
    const event = new CloseEvent("close", { code: code ?? 1000, reason: reason ?? "" });
    this.onclose?.(event);
  }

  // Test helpers
  simulateMessage(data: unknown) {
    const event = new MessageEvent("message", { data: JSON.stringify(data) });
    this.onmessage?.(event);
  }

  getMessageQueue() {
    return [...this.messageQueue];
  }

  static clearInstances() {
    MockWebSocket.instances = [];
  }
}

/**
 * Mock localStorage for session persistence testing
 */
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

/**
 * Browser-like Room implementation for testing
 */
class BrowserMockRoom implements RoomLike {
  id: string;
  name: string;
  
  private messageHandlers = new Map<string, Array<(message: unknown) => void>>();
  private stateChangeHandlers: Array<(state: unknown) => void> = [];
  private leaveHandlers: Array<(code: number) => void> = [];
  private connected = true;
  
  sentMessages: Array<{ type: string; payload?: unknown }> = [];
  receivedCount = 0;

  constructor(roomId: string, roomName: string) {
    this.id = roomId;
    this.name = roomName;
  }

  send(type: string, message?: unknown) {
    if (!this.connected) {
      throw new Error("Cannot send on disconnected room");
    }
    this.sentMessages.push({ type, payload: message });
  }

  onMessage(type: string, cb: (message: unknown) => void) {
    const handlers = this.messageHandlers.get(type) ?? [];
    handlers.push(cb);
    this.messageHandlers.set(type, handlers);
  }

  onStateChange(cb: (state: unknown) => void) {
    this.stateChangeHandlers.push(cb);
  }

  onLeave(cb: (code: number) => void) {
    this.leaveHandlers.push(cb);
  }

  async leave() {
    this.connected = false;
    this.leaveHandlers.forEach(cb => cb(1000));
  }

  // Test helpers
  emitMessage(type: string, payload: unknown) {
    this.receivedCount++;
    const handlers = this.messageHandlers.get(type) ?? [];
    handlers.forEach(handler => handler(payload));
  }

  emitStateChange(state: unknown) {
    this.stateChangeHandlers.forEach(cb => cb(state));
  }

  simulateDisconnect(code = 1000) {
    this.connected = false;
    this.leaveHandlers.forEach(cb => cb(code));
  }

  isConnected() {
    return this.connected;
  }

  getMessageHandler(type: string) {
    return this.messageHandlers.get(type);
  }
}

/**
 * Browser-like Client implementation
 */
class BrowserMockClient implements ClientLike {
  private rooms = new Map<string, BrowserMockRoom>();
  joinAttempts = 0;
  lastOptions: unknown = null;

  async joinOrCreate(roomName: string, options?: unknown): Promise<RoomLike> {
    this.joinAttempts++;
    this.lastOptions = options;
    
    const roomId = `browser-room-${Math.random().toString(36).substring(7)}`;
    const room = new BrowserMockRoom(roomId, roomName);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): BrowserMockRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): BrowserMockRoom[] {
    return Array.from(this.rooms.values());
  }
}

/**
 * Creates a browser-like test adapter with tracking
 */
function createBrowserAdapter(playerId: string) {
  const snapshots: RoomSnapshot[] = [];
  const deltas: StateDelta[] = [];
  const blockResults: BlockResult[] = [];

  const adapter: SessionAdapter = {
    getLocalPlayerProgress: () => ({
      id: playerId,
      name: `BrowserPlayer-${playerId}`,
      appearance: { torsoColor: [255, 0, 0] },
      joinedAt: Date.now()
    }),
    getLocalPlayerVolatile: () => ({
      id: playerId,
      pos: { x: Math.random() * 100, y: 64, z: Math.random() * 100 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: Math.random() * Math.PI * 2,
      pitch: 0,
      stance: "standing",
      grounded: true,
      hotbarSlot: 0
    }),
    applySnapshot: (snapshot) => snapshots.push(snapshot),
    applyDelta: (delta) => deltas.push(delta),
    handleBlockResult: (result) => blockResults.push(result)
  };

  return { adapter, snapshots, deltas, blockResults };
}

describe("Headless Browser Integration: Colyseus Client Setup", () => {
  it("creates Colyseus client with injected mock client", () => {
    const mockClient = new BrowserMockClient();
    const client = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
    
    expect(client).toBeDefined();
    expect(typeof client.joinOrCreate).toBe("function");
  });

  it("passes room options through to underlying client", async () => {
    const mockClient = new BrowserMockClient();
    const client = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
    
    const options = { customOption: "test-value" };
    await client.joinOrCreate("test-room", options);
    
    expect(mockClient.lastOptions).toEqual(options);
  });
});

describe("Headless Browser Integration: Full Session Lifecycle", () => {
  let mockClient: BrowserMockClient;
  let colyseusClient: ColyseusClient;

  beforeEach(() => {
    mockClient = new BrowserMockClient();
    colyseusClient = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
  });

  it("establishes connection and receives welcome message", async () => {
    const { adapter, snapshots } = createBrowserAdapter("browser-1");
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({
      client: colyseusClient,
      adapter,
      diagnostics
    });

    await session.connect();
    expect(session.isConnected()).toBe(true);

    // Simulate server welcome
    const room = mockClient.getAllRooms()[0];
    const welcomePayload: WelcomePayload = {
      playerId: "browser-1",
      tickRate: 20,
      worldSeed: 42,
      snapshot: {
        serverTick: 100,
        worldSeed: 42,
        players: [{ id: "browser-1", name: "Test", joinedAt: Date.now() }],
        playerStates: [],
        worldEvents: []
      }
    };
    room.emitMessage("S_WELCOME", welcomePayload);

    expect(snapshots.length).toBe(1);
    expect(snapshots[0].worldSeed).toBe(42);
    expect(diagnostics.getStats().lastServerTick).toBe(100);
  });

  it("sends C_HELLO with player progress on connect", async () => {
    const { adapter } = createBrowserAdapter("browser-hello");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();

    const room = mockClient.getAllRooms()[0];
    const helloMsg = room.sentMessages.find(m => m.type === "C_HELLO");
    
    expect(helloMsg).toBeDefined();
    const payload = helloMsg?.payload as HelloPayload;
    expect(payload.name).toBe("BrowserPlayer-browser-hello");
  });

  it("handles graceful disconnect", async () => {
    const { adapter } = createBrowserAdapter("browser-disconnect");
    const logs: string[] = [];
    const session = createMultiplayerSession({
      client: colyseusClient,
      adapter,
      logger: (msg) => logs.push(msg)
    });

    await session.connect();
    expect(session.isConnected()).toBe(true);

    await session.disconnect();
    expect(session.isConnected()).toBe(false);
    expect(logs).toContain("multiplayer: disconnected");
  });

  it("handles server-initiated disconnect", async () => {
    const { adapter } = createBrowserAdapter("browser-kicked");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();
    
    const room = mockClient.getAllRooms()[0];
    room.simulateDisconnect(1001); // Server closed

    expect(session.isConnected()).toBe(false);
  });
});

describe("Headless Browser Integration: Message Handling", () => {
  let mockClient: BrowserMockClient;
  let colyseusClient: ColyseusClient;

  beforeEach(() => {
    mockClient = new BrowserMockClient();
    colyseusClient = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
  });

  it("processes S_STATE_SNAPSHOT messages", async () => {
    const { adapter, snapshots } = createBrowserAdapter("snap-client");
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client: colyseusClient, adapter, diagnostics });

    await session.connect();

    const room = mockClient.getAllRooms()[0];
    const snapshot: RoomSnapshot = {
      serverTick: 200,
      worldSeed: 999,
      players: [
        { id: "snap-client", name: "Player1", joinedAt: Date.now() },
        { id: "other", name: "Player2", joinedAt: Date.now() }
      ],
      playerStates: [],
      worldEvents: []
    };

    room.emitMessage("S_STATE_SNAPSHOT", snapshot);

    expect(snapshots.length).toBe(1);
    expect(snapshots[0].players.length).toBe(2);
  });

  it("processes S_STATE_DELTA messages", async () => {
    const { adapter, deltas } = createBrowserAdapter("delta-client");
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client: colyseusClient, adapter, diagnostics });

    await session.connect();

    const room = mockClient.getAllRooms()[0];
    const delta: StateDelta = {
      serverTick: 150,
      players: [
        { id: "delta-client", pos: { x: 10, y: 20, z: 30 }, vel: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, stance: "standing", grounded: true }
      ]
    };

    room.emitMessage("S_STATE_DELTA", delta);

    expect(deltas.length).toBe(1);
    expect(deltas[0].serverTick).toBe(150);
    expect(diagnostics.getStats().lastServerTick).toBe(150);
  });

  it("processes S_BLOCK_RESULT messages", async () => {
    const { adapter, blockResults } = createBrowserAdapter("block-client");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();

    const room = mockClient.getAllRooms()[0];
    const blockResult: BlockResult = {
      editSeq: 1,
      ok: true,
      event: {
        eventId: "evt-1",
        action: "place",
        pos: { x: 5, y: 10, z: 15 },
        blockId: 1,
        clientId: "block-client",
        serverTick: 100
      }
    };

    room.emitMessage("S_BLOCK_RESULT", blockResult);

    expect(blockResults.length).toBe(1);
    expect(blockResults[0].ok).toBe(true);
    expect(blockResults[0].event?.action).toBe("place");
  });

  it("processes S_PONG and updates diagnostics", async () => {
    const { adapter } = createBrowserAdapter("pong-client");
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client: colyseusClient, adapter, diagnostics });

    await session.connect();

    const room = mockClient.getAllRooms()[0];
    
    // Send a ping
    const nowMs = 5000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);
    session.tick(nowMs);
    
    // Verify ping was sent
    const pingMsg = room.sentMessages.find(m => m.type === "C_PING");
    expect(pingMsg).toBeDefined();
    
    const pingPayload = pingMsg?.payload as PingPayload;
    
    // Simulate pong response
    const pongPayload: PongPayload = {
      pingId: pingPayload.pingId,
      serverTs: nowMs + 10
    };
    room.emitMessage("S_PONG", pongPayload);

    // Diagnostics should have recorded the ping
    const stats = diagnostics.getStats();
    expect(stats.lastPingMs).toBeGreaterThanOrEqual(0);

    vi.restoreAllMocks();
  });

  it("sends C_INPUT frames and applies corrections", async () => {
    const localState = createDefaultPlayerState("browser-correct");
    let grounded = true;
    const buffer = createPredictionBuffer();
    const getVoxel = (_wx: number, wy: number, _wz: number) => (wy <= 0 ? 1 : 0);

    const adapter: SessionAdapter = {
      getLocalPlayerProgress: () => ({
        id: "browser-correct",
        name: "BrowserCorrect",
        joinedAt: Date.now()
      }),
      getLocalPlayerVolatile: () => ({
        id: localState.playerId,
        pos: { ...localState.position },
        vel: { ...localState.velocity },
        yaw: 0,
        pitch: 0,
        stance: localState.stance,
        grounded
      }),
      collectInputFrame: (seq, _nowMs, dtSec) => {
        const frame: InputFrame = {
          seq,
          dtSec,
          keysDown: ["KeyW"],
          keysPressed: [],
          yaw: 0,
          pitch: 0,
          clientState: {
            id: localState.playerId,
            pos: { ...localState.position },
            vel: { ...localState.velocity },
            yaw: 0,
            pitch: 0,
            stance: localState.stance,
            grounded
          }
        };
        recordInputFrame(buffer, frame);
        const result = applyInputFrame({
          state: localState,
          frame,
          grounded,
          getVoxel,
          respawn: () => {}
        });
        grounded = result.grounded;
        return frame;
      },
      applySnapshot: () => {},
      applyDelta: () => {},
      applyCorrection: (correction) => {
        const result = reconcilePrediction({
          state: localState,
          grounded,
          serverState: correction.state,
          ackSeq: correction.ackSeq,
          pendingFrames: buffer.pendingFrames,
          getVoxel,
          respawn: () => {}
        });
        grounded = result.grounded;
        buffer.pendingFrames = result.pendingFrames;
      }
    };

    const session = createMultiplayerSession({ client: colyseusClient, adapter });
    await session.connect();
    const room = mockClient.getAllRooms()[0];

    session.tick(0);
    session.tick(50);
    const inputMsg = room.sentMessages.find((m) => m.type === "C_INPUT");
    expect(inputMsg).toBeDefined();

    room.emitMessage("S_CORRECTION", {
      playerId: "browser-correct",
      serverTick: 1,
      state: {
        id: "browser-correct",
        pos: { x: 0, y: 6, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        stance: "standing",
        grounded: true
      },
      ackSeq: 1,
      reason: "divergence"
    });

    expect(localState.position.z).toBeGreaterThanOrEqual(0);
  });
});

describe("Headless Browser Integration: Tick Loop", () => {
  let mockClient: BrowserMockClient;
  let colyseusClient: ColyseusClient;

  beforeEach(() => {
    mockClient = new BrowserMockClient();
    colyseusClient = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
  });

  it("sends periodic pings during tick", async () => {
    const { adapter } = createBrowserAdapter("tick-client");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();
    const room = mockClient.getAllRooms()[0];

    // Simulate multiple ticks at 2-second intervals (PING_INTERVAL_MS)
    // Ping is sent when (nowMs - lastPingSentMs) >= 2000
    // At t=0: 0 - 0 = 0, not >= 2000, no ping
    // At t=2000, 4000, 6000: pings sent
    for (let t = 0; t <= 6000; t += 2000) {
      session.tick(t);
    }

    const pings = room.sentMessages.filter(m => m.type === "C_PING");
    expect(pings.length).toBe(3); // t=2000, 4000, 6000
  });

  it("does not send pings before interval elapsed", async () => {
    const { adapter } = createBrowserAdapter("no-rapid-ping");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();
    const room = mockClient.getAllRooms()[0];

    // Rapid ticks within the same interval
    // Ping is only sent when (nowMs - lastPingSentMs) >= 2000
    // Since all these times are < 2000 from t=0, no pings should be sent
    session.tick(0);    // 0 - 0 = 0, not >= 2000, no ping
    session.tick(100);  // 100 - 0 = 100, not >= 2000, no ping
    session.tick(500);  // 500 - 0 = 500, not >= 2000, no ping
    session.tick(1000); // 1000 - 0 = 1000, not >= 2000, no ping
    session.tick(1500); // 1500 - 0 = 1500, not >= 2000, no ping
    session.tick(1900); // 1900 - 0 = 1900, not >= 2000, no ping

    const pings = room.sentMessages.filter(m => m.type === "C_PING");
    expect(pings.length).toBe(0); // No pings sent (all times < 2000ms from lastPingSentMs=0)
  });

  it("updates diagnostics snapshot age during tick", async () => {
    const { adapter } = createBrowserAdapter("age-client");
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client: colyseusClient, adapter, diagnostics });

    await session.connect();
    
    // Simulate receiving a snapshot
    const room = mockClient.getAllRooms()[0];
    vi.spyOn(Date, "now").mockReturnValue(1000);
    room.emitMessage("S_WELCOME", {
      playerId: "age-client",
      tickRate: 20,
      worldSeed: 1,
      snapshot: { serverTick: 1, worldSeed: 1, players: [], playerStates: [], worldEvents: [] }
    });

    // Tick at later time
    vi.spyOn(Date, "now").mockReturnValue(1500);
    session.tick(1500);

    const stats = diagnostics.getStats();
    // Note: property is snapshotAgeMs, not lastSnapshotAgeMs
    expect(stats.snapshotAgeMs).toBeGreaterThanOrEqual(0);

    vi.restoreAllMocks();
  });

  it("does not process ticks when disconnected", async () => {
    const { adapter } = createBrowserAdapter("disconnected-tick");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();
    const room = mockClient.getAllRooms()[0];
    room.sentMessages.length = 0; // Clear initial messages

    await session.disconnect();

    // Ticks should not send any messages
    session.tick(0);
    session.tick(2000);
    session.tick(4000);

    expect(room.sentMessages.length).toBe(0);
  });
});

describe("Headless Browser Integration: Sync Budget", () => {
  it("respects sync budget for different state types", () => {
    const tracker = createSyncBudgetTracker();
    const now = 1000;

    // First send should be allowed
    expect(tracker.canSend("playerVolatile", now)).toBe(true);
    tracker.recordSent("playerVolatile", now);

    // Immediate second send should be blocked
    expect(tracker.canSend("playerVolatile", now + 10)).toBe(false);

    // After minimum interval, should be allowed again
    expect(tracker.canSend("playerVolatile", now + 100)).toBe(true);
  });

  it("tracks different state keys independently", () => {
    const tracker = createSyncBudgetTracker();
    const now = 1000;

    tracker.recordSent("playerVolatile", now);
    
    // Different state type should be independent
    expect(tracker.canSend("worldEvents", now)).toBe(true);
    expect(tracker.canSend("playerVolatile", now + 10)).toBe(false);
  });
});

describe("Headless Browser Integration: Tick Contract", () => {
  it("derives correct intervals from default contract", () => {
    const intervals = getTickIntervals(DEFAULT_TICK_CONTRACT);
    
    expect(intervals.serverTickMs).toBe(50); // 20 ticks/sec
    expect(intervals.snapshotIntervalMs).toBe(100); // Every 2nd tick
    expect(intervals.clientSendIntervalMs).toBe(50);
  });

  it("uses tick contract in session creation", async () => {
    const mockClient = new BrowserMockClient();
    const colyseusClient = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
    const { adapter } = createBrowserAdapter("contract-client");

    const customContract = {
      serverTickRate: 10,
      snapshotEveryNTicks: 5,
      clientSendRate: 10
    };

    const session = createMultiplayerSession({
      client: colyseusClient,
      adapter,
      tickContract: customContract
    });

    await session.connect();
    expect(session.isConnected()).toBe(true);
  });
});

describe("Headless Browser Integration: Diagnostics", () => {
  it("computes deterministic checksums", () => {
    const state1 = { players: [{ id: "1", pos: { x: 1, y: 2, z: 3 } }] };
    const state2 = { players: [{ id: "1", pos: { x: 1, y: 2, z: 3 } }] };
    const state3 = { players: [{ id: "2", pos: { x: 1, y: 2, z: 3 } }] };

    expect(computeChecksum(state1)).toBe(computeChecksum(state2));
    expect(computeChecksum(state1)).not.toBe(computeChecksum(state3));
  });

  it("tracks server tick progression", () => {
    const diagnostics = createDiagnostics();

    diagnostics.recordServerTick(1);
    expect(diagnostics.getStats().lastServerTick).toBe(1);

    diagnostics.recordServerTick(5);
    expect(diagnostics.getStats().lastServerTick).toBe(5);

    diagnostics.recordServerTick(10);
    expect(diagnostics.getStats().lastServerTick).toBe(10);
  });

  it("tracks ping RTT", () => {
    const diagnostics = createDiagnostics();

    diagnostics.recordPing(50);
    expect(diagnostics.getStats().lastPingMs).toBe(50);

    diagnostics.recordPing(75);
    expect(diagnostics.getStats().lastPingMs).toBe(75);
  });
});

describe("Headless Browser Integration: Error Scenarios", () => {
  let mockClient: BrowserMockClient;
  let colyseusClient: ColyseusClient;

  beforeEach(() => {
    mockClient = new BrowserMockClient();
    colyseusClient = createColyseusClient({ url: "ws://localhost:2567", client: mockClient });
  });

  it("handles reconnection after disconnect", async () => {
    const { adapter, snapshots } = createBrowserAdapter("reconnect-client");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    // First connection
    await session.connect();
    const room1 = mockClient.getAllRooms()[0];
    room1.emitMessage("S_WELCOME", {
      playerId: "reconnect-client",
      tickRate: 20,
      worldSeed: 1,
      snapshot: { serverTick: 1, worldSeed: 1, players: [], playerStates: [], worldEvents: [] }
    });
    expect(snapshots.length).toBe(1);

    // Disconnect
    await session.disconnect();
    expect(session.isConnected()).toBe(false);

    // Create new session for reconnection
    const { adapter: adapter2, snapshots: snapshots2 } = createBrowserAdapter("reconnect-client");
    const session2 = createMultiplayerSession({ client: colyseusClient, adapter: adapter2 });
    await session2.connect();
    
    const room2 = mockClient.getAllRooms()[1];
    room2.emitMessage("S_WELCOME", {
      playerId: "reconnect-client",
      tickRate: 20,
      worldSeed: 2,
      snapshot: { serverTick: 100, worldSeed: 2, players: [], playerStates: [], worldEvents: [] }
    });
    expect(snapshots2.length).toBe(1);
    expect(snapshots2[0].worldSeed).toBe(2);
  });

  it("handles multiple rapid connect attempts", async () => {
    const { adapter } = createBrowserAdapter("rapid-connect");

    // Attempt multiple rapid connections (should not throw)
    const sessions = await Promise.all([
      createMultiplayerSession({ client: colyseusClient, adapter }).connect(),
      createMultiplayerSession({ client: colyseusClient, adapter }).connect(),
      createMultiplayerSession({ client: colyseusClient, adapter }).connect()
    ]);

    expect(mockClient.joinAttempts).toBe(3);
  });

  it("handles incomplete payloads gracefully", async () => {
    const { adapter, snapshots, deltas } = createBrowserAdapter("incomplete-payload");
    const session = createMultiplayerSession({ client: colyseusClient, adapter });

    await session.connect();
    const room = mockClient.getAllRooms()[0];

    // S_PONG with missing pingId should not throw (just won't update diagnostics)
    expect(() => room.emitMessage("S_PONG", {})).not.toThrow();
    
    // S_STATE_DELTA with minimal data should not throw
    expect(() => room.emitMessage("S_STATE_DELTA", { serverTick: 1 })).not.toThrow();
    
    // S_BLOCK_RESULT with minimal data
    expect(() => room.emitMessage("S_BLOCK_RESULT", { editSeq: 1, ok: true })).not.toThrow();
  });
});

describe("Headless Browser Integration: Browser Environment Simulation", () => {
  it("works with simulated localStorage", () => {
    const storage = new MockLocalStorage();
    
    storage.setItem("player_name", "TestUser");
    expect(storage.getItem("player_name")).toBe("TestUser");
    
    storage.setItem("session_token", "abc123");
    expect(storage.length).toBe(2);
    
    storage.removeItem("session_token");
    expect(storage.getItem("session_token")).toBeNull();
    
    storage.clear();
    expect(storage.length).toBe(0);
  });

  it("handles DOM-like environment (jsdom)", () => {
    // jsdom provides window and document
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
    
    // Can create elements
    const div = document.createElement("div");
    div.id = "game-container";
    document.body.appendChild(div);
    
    expect(document.getElementById("game-container")).toBe(div);
    
    // Cleanup
    document.body.removeChild(div);
  });

  it("simulates requestAnimationFrame for game loop", () => {
    vi.useFakeTimers();
    
    let frameCount = 0;
    const frames: number[] = [];

    function gameLoop(timestamp: number) {
      frameCount++;
      frames.push(timestamp);
      if (frameCount < 5) {
        requestAnimationFrame(gameLoop);
      }
    }

    requestAnimationFrame(gameLoop);
    
    // Advance through frames
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16); // ~60fps
    }

    expect(frameCount).toBe(5);
    
    vi.useRealTimers();
  });

  it("handles performance.now for timing", () => {
    const start = performance.now();
    
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += i;
    }
    
    const end = performance.now();
    
    expect(end).toBeGreaterThanOrEqual(start);
    expect(typeof start).toBe("number");
  });
});
