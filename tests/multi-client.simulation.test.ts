/**
 * Multi-Client Server Simulation Tests
 * 
 * Tests simulating multiple clients connecting to the same Colyseus room,
 * verifying proper state synchronization and message routing between clients.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  HelloPayload,
  InputFrame,
  InputPayload,
  PingPayload,
  PongPayload,
  RoomSnapshot,
  StateDelta
} from "../shared/protocol";
import { createMultiplayerSession } from "../src/sprint-craft/multiplayer/session";
import type { ColyseusClient, RoomLike } from "../src/sprint-craft/multiplayer/colyseus-client";
import type { SessionAdapter } from "../src/sprint-craft/multiplayer/adapters";
import { createDiagnostics } from "../src/sprint-craft/multiplayer/diagnostics";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { applyInputFrame } from "../src/sprint-craft/voxels/player-controller";

// Simulated server state shared across all clients
class SimulatedServerState {
  serverTick = 0;
  worldSeed = 12345;
  players = new Map<string, { id: string; name: string }>();
  playerStates = new Map<
    string,
    {
      state: ReturnType<typeof createDefaultPlayerState>;
      grounded: boolean;
      lastSeq: number;
    }
  >();
}

// Simulated server room that manages multiple clients
class SimulatedServerRoom {
  state = new SimulatedServerState();
  private clients = new Map<string, SimulatedClientConnection>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private pendingWelcomes: Array<{ sessionId: string; payload: unknown }> = [];

  start() {
    this.tickInterval = setInterval(() => {
      this.state.serverTick += 1;
      this.broadcastStateDelta();
    }, 50); // 20 ticks/sec
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  addClient(connection: SimulatedClientConnection) {
    const sessionId = connection.sessionId;
    this.clients.set(sessionId, connection);
    
    // Add player to state
    this.state.players.set(sessionId, { id: sessionId, name: "User" });
    this.state.playerStates.set(sessionId, {
      state: createDefaultPlayerState(sessionId),
      grounded: true,
      lastSeq: -1
    });
    
    // Queue welcome message to be sent after handlers are set up
    // (simulates async network behavior)
    const welcomePayload = {
      playerId: sessionId,
      tickRate: 20,
      worldSeed: this.state.worldSeed,
      snapshot: this.createSnapshot()
    };
    this.pendingWelcomes.push({ sessionId, payload: welcomePayload });
    
    // Use setTimeout(0) to send after current call stack completes
    // This allows the client to set up message handlers first
    setTimeout(() => {
      this.flushPendingWelcomes();
    }, 0);

    // Broadcast player join to others
    this.broadcastExcept(sessionId, "S_PLAYER_JOIN", { playerId: sessionId });
  }
  
  private flushPendingWelcomes() {
    while (this.pendingWelcomes.length > 0) {
      const welcome = this.pendingWelcomes.shift()!;
      this.sendToClient(welcome.sessionId, "S_WELCOME", welcome.payload);
    }
  }

  removeClient(sessionId: string) {
    this.state.players.delete(sessionId);
    this.state.playerStates.delete(sessionId);
    this.clients.delete(sessionId);
    
    // Broadcast player leave
    this.broadcast("S_PLAYER_LEAVE", { playerId: sessionId });
  }

  handleMessage(sessionId: string, type: string, payload: unknown) {
    if (type === "C_HELLO") {
      const hello = payload as HelloPayload;
      const player = this.state.players.get(sessionId);
      if (player) {
        player.name = hello.name;
      }
    } else if (type === "C_PING") {
      const ping = payload as PingPayload;
      const pong: PongPayload = { pingId: ping.pingId, serverTs: Date.now() };
      this.sendToClient(sessionId, "S_PONG", pong);
    } else if (type === "C_INPUT") {
      const input = payload as InputPayload;
      const sim = this.state.playerStates.get(sessionId);
      if (!sim || !input.frames) return;
      input.frames.forEach((frame) => {
        if (frame.seq <= sim.lastSeq) return;
        const result = applyInputFrame({
          state: sim.state,
          frame,
          grounded: sim.grounded,
          getVoxel: this.getVoxelAt,
          respawn: () => this.resetPlayer(sim.state)
        });
        sim.grounded = result.grounded;
        sim.lastSeq = frame.seq;
      });
    }
  }

  private createSnapshot(): RoomSnapshot {
    const players = Array.from(this.state.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      joinedAt: Date.now()
    }));

    return {
      serverTick: this.state.serverTick,
      worldSeed: this.state.worldSeed,
      players,
      playerStates: this.createVolatileStates(),
      worldEvents: []
    };
  }

  private createDelta(): StateDelta {
    return {
      serverTick: this.state.serverTick,
      players: this.createVolatileStates()
    };
  }

  private createVolatileStates() {
    const states: StateDelta["players"] = [];
    this.state.playerStates.forEach((entry, id) => {
      states?.push({
        id,
        pos: { ...entry.state.position },
        vel: { ...entry.state.velocity },
        yaw: 0,
        pitch: 0,
        stance: entry.state.stance,
        grounded: entry.grounded
      });
    });
    return states ?? [];
  }

  private sendToClient(sessionId: string, type: string, payload: unknown) {
    const client = this.clients.get(sessionId);
    client?.receiveMessage(type, payload);
  }

  private broadcast(type: string, payload: unknown) {
    this.clients.forEach(client => {
      client.receiveMessage(type, payload);
    });
  }

  private broadcastExcept(excludeSessionId: string, type: string, payload: unknown) {
    this.clients.forEach((client, sessionId) => {
      if (sessionId !== excludeSessionId) {
        client.receiveMessage(type, payload);
      }
    });
  }

  private broadcastStateDelta() {
    const delta = this.createDelta();
    this.broadcast("S_STATE_DELTA", delta);
  }

  getPlayerCount() {
    return this.state.players.size;
  }

  getClientCount() {
    return this.clients.size;
  }

  private getVoxelAt(_wx: number, wy: number, _wz: number) {
    return wy <= 0 ? 1 : 0;
  }

  private resetPlayer(state: ReturnType<typeof createDefaultPlayerState>) {
    state.position.x = 0;
    state.position.y = 6;
    state.position.z = 0;
    state.velocity.x = 0;
    state.velocity.y = 0;
    state.velocity.z = 0;
    state.stance = "standing";
  }
}

// Client-side connection to the simulated server
class SimulatedClientConnection implements RoomLike {
  id: string;
  name = "sprint-craft";
  sessionId: string;
  
  private server: SimulatedServerRoom;
  private messageHandlers = new Map<string, (message: unknown) => void>();
  private leaveHandlers: Array<(code: number) => void> = [];
  private connected = true;
  
  sentMessages: Array<{ type: string; payload?: unknown }> = [];

  constructor(sessionId: string, server: SimulatedServerRoom) {
    this.sessionId = sessionId;
    this.id = `room-${Math.random().toString(36).substring(7)}`;
    this.server = server;
  }

  send(type: string, message?: unknown) {
    if (!this.connected) return;
    this.sentMessages.push({ type, payload: message });
    this.server.handleMessage(this.sessionId, type, message);
  }

  onMessage(type: string, cb: (message: unknown) => void) {
    this.messageHandlers.set(type, cb);
  }

  onStateChange() {}

  onLeave(cb: (code: number) => void) {
    this.leaveHandlers.push(cb);
  }

  async leave() {
    this.connected = false;
    this.server.removeClient(this.sessionId);
    this.leaveHandlers.forEach(cb => cb(0));
  }

  receiveMessage(type: string, payload: unknown) {
    const handler = this.messageHandlers.get(type);
    handler?.(payload);
  }

  isConnected() {
    return this.connected;
  }
}

// Factory to create client instances connected to the server
function createSimulatedClient(
  sessionId: string,
  server: SimulatedServerRoom
): { client: ColyseusClient; connection: SimulatedClientConnection } {
  const connection = new SimulatedClientConnection(sessionId, server);
  
  const client: ColyseusClient = {
    joinOrCreate: async () => {
      server.addClient(connection);
      return connection;
    }
  };

  return { client, connection };
}

function createTestAdapter(playerId: string) {
  const snapshots: RoomSnapshot[] = [];
  const deltas: StateDelta[] = [];
  
  const adapter: SessionAdapter = {
    getLocalPlayerProgress: () => ({ id: playerId, name: `Player-${playerId}`, joinedAt: Date.now() }),
    getLocalPlayerVolatile: () => ({
      id: playerId,
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      stance: "standing",
      grounded: true
    }),
    applySnapshot: (snapshot) => snapshots.push(snapshot),
    applyDelta: (delta) => deltas.push(delta)
  };

  return { adapter, snapshots, deltas };
}

describe("Multi-Client Server Simulation", () => {
  let server: SimulatedServerRoom;

  beforeEach(() => {
    server = new SimulatedServerRoom();
  });

  afterEach(() => {
    server.stop();
  });

  // Helper to wait for pending async operations
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));

  describe("Client connection", () => {
    it("handles single client connection", async () => {
      const { client } = createSimulatedClient("client-1", server);
      const { adapter, snapshots } = createTestAdapter("client-1");
      const session = createMultiplayerSession({ client, adapter });

      await session.connect();
      await tick(); // Wait for welcome message to be delivered

      expect(session.isConnected()).toBe(true);
      expect(server.getPlayerCount()).toBe(1);
      expect(snapshots.length).toBe(1);
    });

    it("handles multiple simultaneous clients", async () => {
      const sessions: ReturnType<typeof createMultiplayerSession>[] = [];

      for (let i = 1; i <= 5; i++) {
        const { client } = createSimulatedClient(`client-${i}`, server);
        const { adapter } = createTestAdapter(`client-${i}`);
        const session = createMultiplayerSession({ client, adapter });
        await session.connect();
        sessions.push(session);
      }

      expect(server.getPlayerCount()).toBe(5);
      sessions.forEach(s => expect(s.isConnected()).toBe(true));
    });

    it("handles client disconnect", async () => {
      const { client } = createSimulatedClient("client-disconnect", server);
      const { adapter } = createTestAdapter("client-disconnect");
      const session = createMultiplayerSession({ client, adapter });

      await session.connect();
      expect(server.getPlayerCount()).toBe(1);

      await session.disconnect();
      expect(session.isConnected()).toBe(false);
      expect(server.getPlayerCount()).toBe(0);
    });

    it("handles sequential connect/disconnect of multiple clients", async () => {
      const clientIds = ["a", "b", "c", "d", "e"];
      const sessions: ReturnType<typeof createMultiplayerSession>[] = [];

      // Connect all clients
      for (const id of clientIds) {
        const { client } = createSimulatedClient(id, server);
        const { adapter } = createTestAdapter(id);
        const session = createMultiplayerSession({ client, adapter });
        await session.connect();
        sessions.push(session);
      }
      expect(server.getPlayerCount()).toBe(5);

      // Disconnect first two
      await sessions[0].disconnect();
      await sessions[1].disconnect();
      expect(server.getPlayerCount()).toBe(3);

      // Connect two more
      for (const id of ["f", "g"]) {
        const { client } = createSimulatedClient(id, server);
        const { adapter } = createTestAdapter(id);
        const session = createMultiplayerSession({ client, adapter });
        await session.connect();
        sessions.push(session);
      }
      expect(server.getPlayerCount()).toBe(5);
    });
  });

  describe("Message routing", () => {
    it("sends C_HELLO on connect", async () => {
      const { client, connection } = createSimulatedClient("hello-client", server);
      const { adapter } = createTestAdapter("hello-client");
      const session = createMultiplayerSession({ client, adapter });

      await session.connect();

      const helloMsg = connection.sentMessages.find(m => m.type === "C_HELLO");
      expect(helloMsg).toBeDefined();
    });

    it("routes S_WELCOME to joining client only", async () => {
      const { client: client1, connection: conn1 } = createSimulatedClient("welcome-1", server);
      const { adapter: adapter1, snapshots: snap1 } = createTestAdapter("welcome-1");
      
      const { client: client2, connection: conn2 } = createSimulatedClient("welcome-2", server);
      const { adapter: adapter2, snapshots: snap2 } = createTestAdapter("welcome-2");

      const session1 = createMultiplayerSession({ client: client1, adapter: adapter1 });
      const session2 = createMultiplayerSession({ client: client2, adapter: adapter2 });

      await session1.connect();
      await tick();
      expect(snap1.length).toBe(1);

      await session2.connect();
      await tick();
      // Second client should get its own welcome
      expect(snap2.length).toBe(1);
    });

    it("handles ping/pong between client and server", async () => {
      const { client, connection } = createSimulatedClient("ping-client", server);
      const { adapter } = createTestAdapter("ping-client");
      const diagnostics = createDiagnostics();
      const session = createMultiplayerSession({ client, adapter, diagnostics });

      await session.connect();

      // Trigger ping by calling tick with enough time elapsed
      const nowMs = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(nowMs);
      session.tick(nowMs);

      const pingMsg = connection.sentMessages.find(m => m.type === "C_PING");
      expect(pingMsg).toBeDefined();

      // Server should have responded with S_PONG (handled internally)
      // Diagnostics should be updated
      const stats = session.getDiagnostics();
      expect(stats.lastPingMs).toBeGreaterThanOrEqual(0);

      vi.restoreAllMocks();
    });
  });

  describe("State synchronization", () => {
    it("includes all players in initial snapshot", async () => {
      // Connect first two clients
      const { client: client1 } = createSimulatedClient("sync-1", server);
      const { adapter: adapter1 } = createTestAdapter("sync-1");
      const session1 = createMultiplayerSession({ client: client1, adapter: adapter1 });
      await session1.connect();
      await tick();

      const { client: client2 } = createSimulatedClient("sync-2", server);
      const { adapter: adapter2 } = createTestAdapter("sync-2");
      const session2 = createMultiplayerSession({ client: client2, adapter: adapter2 });
      await session2.connect();
      await tick();

      // Third client should see both existing players in snapshot
      const { client: client3 } = createSimulatedClient("sync-3", server);
      const { adapter: adapter3, snapshots: snap3 } = createTestAdapter("sync-3");
      const session3 = createMultiplayerSession({ client: client3, adapter: adapter3 });
      await session3.connect();
      await tick();

      expect(snap3.length).toBe(1);
      expect(snap3[0].players.length).toBe(3);
    });

    it("broadcasts state deltas to all connected clients", async () => {
      vi.useFakeTimers();

      const { client: client1 } = createSimulatedClient("delta-1", server);
      const { adapter: adapter1, deltas: deltas1 } = createTestAdapter("delta-1");
      const session1 = createMultiplayerSession({ client: client1, adapter: adapter1 });
      await session1.connect();

      const { client: client2 } = createSimulatedClient("delta-2", server);
      const { adapter: adapter2, deltas: deltas2 } = createTestAdapter("delta-2");
      const session2 = createMultiplayerSession({ client: client2, adapter: adapter2 });
      await session2.connect();

      // Start server ticking
      server.start();

      // Advance time to trigger delta broadcasts
      vi.advanceTimersByTime(100); // 2 ticks

      server.stop();
      vi.useRealTimers();

      // Both clients should receive deltas
      expect(deltas1.length).toBeGreaterThan(0);
      expect(deltas2.length).toBeGreaterThan(0);
    });

    it("maintains consistent server tick across clients", async () => {
      vi.useFakeTimers();

      const sessions: { session: ReturnType<typeof createMultiplayerSession>; deltas: StateDelta[] }[] = [];

      for (let i = 1; i <= 3; i++) {
        const { client } = createSimulatedClient(`tick-client-${i}`, server);
        const { adapter, deltas } = createTestAdapter(`tick-client-${i}`);
        const session = createMultiplayerSession({ client, adapter });
        await session.connect();
        sessions.push({ session, deltas });
      }

      server.start();
      vi.advanceTimersByTime(150); // ~3 ticks
      server.stop();
      vi.useRealTimers();

      // All clients should have received the same tick numbers
      const ticks1 = sessions[0].deltas.map(d => d.serverTick);
      const ticks2 = sessions[1].deltas.map(d => d.serverTick);
      const ticks3 = sessions[2].deltas.map(d => d.serverTick);

      expect(ticks1).toEqual(ticks2);
      expect(ticks2).toEqual(ticks3);
    });

    it("propagates movement updates from input frames", async () => {
      vi.useFakeTimers();
      const { client: client1 } = createSimulatedClient("move-1", server);
      const { adapter: adapter1, deltas: deltas1 } = createTestAdapter("move-1");
      const session1 = createMultiplayerSession({ client: client1, adapter: adapter1 });
      await session1.connect();

      const frame: InputFrame = {
        seq: 1,
        dtSec: 1 / 60,
        keysDown: ["KeyW"],
        keysPressed: [],
        yaw: 0,
        pitch: 0
      };

      // Send input frame to server
      server.handleMessage("move-1", "C_INPUT", { frames: [frame] });

      server.start();
      vi.advanceTimersByTime(100);
      server.stop();
      vi.useRealTimers();

      const latestDelta = deltas1[deltas1.length - 1];
      expect(latestDelta?.players?.[0]?.pos.z ?? 0).toBeGreaterThan(0);
    });
  });

  describe("Stress testing", () => {
    it("handles rapid client connections", async () => {
      const sessionCount = 20;
      const sessions: ReturnType<typeof createMultiplayerSession>[] = [];

      for (let i = 0; i < sessionCount; i++) {
        const { client } = createSimulatedClient(`rapid-${i}`, server);
        const { adapter } = createTestAdapter(`rapid-${i}`);
        const session = createMultiplayerSession({ client, adapter });
        await session.connect();
        sessions.push(session);
      }

      expect(server.getPlayerCount()).toBe(sessionCount);
      expect(server.getClientCount()).toBe(sessionCount);
    });

    it("handles rapid ping messages from multiple clients", async () => {
      const { client: client1, connection: conn1 } = createSimulatedClient("rapid-ping-1", server);
      const { adapter: adapter1 } = createTestAdapter("rapid-ping-1");
      const session1 = createMultiplayerSession({ client: client1, adapter: adapter1 });

      const { client: client2, connection: conn2 } = createSimulatedClient("rapid-ping-2", server);
      const { adapter: adapter2 } = createTestAdapter("rapid-ping-2");
      const session2 = createMultiplayerSession({ client: client2, adapter: adapter2 });

      await session1.connect();
      await session2.connect();

      // Simulate pings at 2000ms intervals
      // Ping is sent when (nowMs - lastPingSentMs) >= 2000
      // At t=0: 0 - 0 = 0, not >= 2000, no ping
      // At t=2000: 2000 - 0 = 2000, >= 2000, ping sent
      // At t=4000, 6000, 8000: pings sent
      for (let t = 0; t < 10000; t += 2000) {
        session1.tick(t);
        session2.tick(t);
      }

      const pings1 = conn1.sentMessages.filter(m => m.type === "C_PING");
      const pings2 = conn2.sentMessages.filter(m => m.type === "C_PING");

      // Each client should have sent 4 pings (at t=2000, 4000, 6000, 8000)
      expect(pings1.length).toBe(4);
      expect(pings2.length).toBe(4);
    });
  });

  describe("Edge cases", () => {
    it("handles client reconnection", async () => {
      const { client, connection } = createSimulatedClient("reconnect-client", server);
      const { adapter, snapshots } = createTestAdapter("reconnect-client");

      // First connection
      const session = createMultiplayerSession({ client, adapter });
      await session.connect();
      await tick();
      expect(snapshots.length).toBe(1);
      expect(server.getPlayerCount()).toBe(1);

      // Disconnect
      await session.disconnect();
      expect(server.getPlayerCount()).toBe(0);

      // Reconnect with new session
      const { client: client2 } = createSimulatedClient("reconnect-client", server);
      const { adapter: adapter2, snapshots: snapshots2 } = createTestAdapter("reconnect-client");
      const session2 = createMultiplayerSession({ client: client2, adapter: adapter2 });
      await session2.connect();
      await tick();

      expect(snapshots2.length).toBe(1);
      expect(server.getPlayerCount()).toBe(1);
    });

    it("handles clients joining mid-game (server already running)", async () => {
      vi.useFakeTimers();

      // Start server and advance ticks
      server.start();
      vi.advanceTimersByTime(1000); // 20 ticks

      // New client joins mid-game
      const { client } = createSimulatedClient("late-joiner", server);
      const { adapter, snapshots } = createTestAdapter("late-joiner");
      const session = createMultiplayerSession({ client, adapter });
      await session.connect();
      
      // Advance timer to process the welcome message setTimeout
      vi.advanceTimersByTime(1);

      server.stop();
      vi.useRealTimers();

      // Should receive snapshot with current server tick
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].serverTick).toBeGreaterThan(0);
    });
  });
});
