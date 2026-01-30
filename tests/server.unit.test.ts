/**
 * Server Unit Tests
 * 
 * Tests the SprintCraftRoom logic in isolation using mock clients.
 * These tests verify the server-side behavior without network dependencies.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  HelloPayload,
  InputFrame,
  InputPayload,
  PingPayload,
  PongPayload
} from "../shared/protocol";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { applyInputFrame } from "../src/sprint-craft/voxels/player-controller";

// Mock client for testing server room logic
class MockServerClient {
  sessionId: string;
  sentMessages: Array<{ type: string; payload: unknown }> = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  send(type: string, payload: unknown) {
    this.sentMessages.push({ type, payload });
  }

  clearMessages() {
    this.sentMessages = [];
  }

  getLastMessage(type: string) {
    return this.sentMessages.filter(msg => msg.type === type).pop();
  }
}

// Simulated room state for testing
class MockPlayerEntry {
  id = "";
  name = "";
}

class MockSprintCraftState {
  serverTick = 0;
  worldSeed = 0;
  players = new Map<string, MockPlayerEntry>();
}

// Mock Room implementation that simulates SprintCraftRoom behavior
class MockSprintCraftRoom {
  state = new MockSprintCraftState();
  playerStates = new Map<
    string,
    {
      state: ReturnType<typeof createDefaultPlayerState>;
      grounded: boolean;
      lastSeq: number;
      lastCorrectionTick: number;
    }
  >();
  private messageHandlers = new Map<string, (client: MockServerClient, payload: unknown) => void>();
  private simulationCallback: (() => void) | null = null;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  onCreate() {
    // Register C_HELLO handler
    this.onMessage("C_HELLO", (client, payload) => {
      const hello = payload as HelloPayload;
      const entry = this.state.players.get(client.sessionId);
      if (!entry) return;
      entry.name = hello.name;
    });

    // Register C_INPUT handler
    this.onMessage("C_INPUT", (client, payload) => {
      const input = payload as InputPayload;
      if (!input.frames || input.frames.length === 0) return;
      const sim = this.playerStates.get(client.sessionId);
      if (!sim) return;
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

        if (frame.clientState) {
          const divergence = distance(sim.state.position, frame.clientState.pos);
          if (divergence > 0.35 && this.state.serverTick - sim.lastCorrectionTick >= 2) {
            sim.lastCorrectionTick = this.state.serverTick;
            client.send("S_CORRECTION", {
              playerId: client.sessionId,
              serverTick: this.state.serverTick,
              state: {
                id: client.sessionId,
                pos: { ...sim.state.position },
                vel: { ...sim.state.velocity },
                yaw: frame.yaw,
                pitch: frame.pitch,
                stance: sim.state.stance,
                grounded: sim.grounded
              },
              ackSeq: sim.lastSeq,
              reason: "divergence"
            });
          }
        }
      });
    });

    // Register C_PING handler
    this.onMessage("C_PING", (client, payload) => {
      const ping = payload as PingPayload;
      const pong: PongPayload = { pingId: ping.pingId, serverTs: Date.now() };
      client.send("S_PONG", pong);
    });

    // Set up simulation interval
    this.setSimulationInterval(() => {
      this.state.serverTick += 1;
    }, 1000 / 20);
  }

  onMessage(type: string, handler: (client: MockServerClient, payload: unknown) => void) {
    this.messageHandlers.set(type, handler);
  }

  setSimulationInterval(callback: () => void, ms: number) {
    this.simulationCallback = callback;
    this.simulationInterval = setInterval(callback, ms);
  }

  onJoin(client: MockServerClient) {
    const entry = new MockPlayerEntry();
    entry.id = client.sessionId;
    entry.name = "User";
    this.state.players.set(client.sessionId, entry);
    this.playerStates.set(client.sessionId, {
      state: createDefaultPlayerState(client.sessionId),
      grounded: true,
      lastSeq: -1,
      lastCorrectionTick: -999
    });
  }

  onLeave(client: MockServerClient) {
    this.state.players.delete(client.sessionId);
    this.playerStates.delete(client.sessionId);
  }

  // Simulate receiving a message from client
  handleMessage(client: MockServerClient, type: string, payload: unknown) {
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(client, payload);
    }
  }

  // Manual tick for testing
  manualTick() {
    this.simulationCallback?.();
  }

  dispose() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
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

describe("SprintCraftRoom: Server Unit Tests", () => {
  let room: MockSprintCraftRoom;

  beforeEach(() => {
    room = new MockSprintCraftRoom();
    room.onCreate();
  });

  afterEach(() => {
    room.dispose();
  });

  describe("onCreate", () => {
    it("initializes state with default values", () => {
      expect(room.state.serverTick).toBe(0);
      expect(room.state.worldSeed).toBe(0);
      expect(room.state.players.size).toBe(0);
    });

    it("sets up simulation interval that increments server tick", () => {
      const initialTick = room.state.serverTick;
      room.manualTick();
      expect(room.state.serverTick).toBe(initialTick + 1);
      room.manualTick();
      expect(room.state.serverTick).toBe(initialTick + 2);
    });
  });

  describe("onJoin", () => {
    it("creates a player entry with session ID", () => {
      const client = new MockServerClient("session-123");
      room.onJoin(client);
      
      expect(room.state.players.has("session-123")).toBe(true);
      const entry = room.state.players.get("session-123");
      expect(entry?.id).toBe("session-123");
    });

    it("sets default player name to User", () => {
      const client = new MockServerClient("session-456");
      room.onJoin(client);
      
      const entry = room.state.players.get("session-456");
      expect(entry?.name).toBe("User");
    });

    it("handles multiple players joining", () => {
      const client1 = new MockServerClient("player-1");
      const client2 = new MockServerClient("player-2");
      const client3 = new MockServerClient("player-3");

      room.onJoin(client1);
      room.onJoin(client2);
      room.onJoin(client3);

      expect(room.state.players.size).toBe(3);
      expect(room.state.players.has("player-1")).toBe(true);
      expect(room.state.players.has("player-2")).toBe(true);
      expect(room.state.players.has("player-3")).toBe(true);
    });
  });

  describe("onLeave", () => {
    it("removes player entry on disconnect", () => {
      const client = new MockServerClient("session-789");
      room.onJoin(client);
      expect(room.state.players.has("session-789")).toBe(true);

      room.onLeave(client);
      expect(room.state.players.has("session-789")).toBe(false);
    });

    it("does not affect other players when one leaves", () => {
      const client1 = new MockServerClient("player-a");
      const client2 = new MockServerClient("player-b");

      room.onJoin(client1);
      room.onJoin(client2);
      expect(room.state.players.size).toBe(2);

      room.onLeave(client1);
      expect(room.state.players.size).toBe(1);
      expect(room.state.players.has("player-b")).toBe(true);
    });
  });

  describe("C_HELLO message handling", () => {
    it("updates player name from hello payload", () => {
      const client = new MockServerClient("session-hello");
      room.onJoin(client);

      const helloPayload: HelloPayload = {
        name: "TestPlayer",
        appearance: undefined,
        clientBuild: "1.0.0"
      };

      room.handleMessage(client, "C_HELLO", helloPayload);
      
      const entry = room.state.players.get("session-hello");
      expect(entry?.name).toBe("TestPlayer");
    });

    it("ignores hello from unknown session", () => {
      const unknownClient = new MockServerClient("unknown-session");
      const helloPayload: HelloPayload = {
        name: "Unknown",
        appearance: undefined
      };

      // Should not throw, just silently ignore
      expect(() => {
        room.handleMessage(unknownClient, "C_HELLO", helloPayload);
      }).not.toThrow();
    });

    it("updates name multiple times with multiple hello messages", () => {
      const client = new MockServerClient("session-rename");
      room.onJoin(client);

      room.handleMessage(client, "C_HELLO", { name: "FirstName" });
      expect(room.state.players.get("session-rename")?.name).toBe("FirstName");

      room.handleMessage(client, "C_HELLO", { name: "SecondName" });
      expect(room.state.players.get("session-rename")?.name).toBe("SecondName");
    });
  });

  describe("C_PING message handling", () => {
    it("responds with S_PONG containing matching pingId", () => {
      const client = new MockServerClient("session-ping");
      room.onJoin(client);

      const pingPayload: PingPayload = {
        pingId: 42,
        clientTs: Date.now()
      };

      room.handleMessage(client, "C_PING", pingPayload);
      
      const pongMessage = client.getLastMessage("S_PONG");
      expect(pongMessage).toBeDefined();
      
      const pong = pongMessage?.payload as PongPayload;
      expect(pong.pingId).toBe(42);
    });

    it("includes server timestamp in pong response", () => {
      const client = new MockServerClient("session-pong-ts");
      room.onJoin(client);

      const beforeTs = Date.now();
      room.handleMessage(client, "C_PING", { pingId: 1, clientTs: beforeTs });
      const afterTs = Date.now();

      const pongMessage = client.getLastMessage("S_PONG");
      const pong = pongMessage?.payload as PongPayload;
      
      expect(pong.serverTs).toBeGreaterThanOrEqual(beforeTs);
      expect(pong.serverTs).toBeLessThanOrEqual(afterTs);
    });

    it("handles rapid sequential pings", () => {
      const client = new MockServerClient("session-rapid-ping");
      room.onJoin(client);

      for (let i = 1; i <= 5; i++) {
        room.handleMessage(client, "C_PING", { pingId: i, clientTs: Date.now() });
      }

      const pongMessages = client.sentMessages.filter(msg => msg.type === "S_PONG");
      expect(pongMessages.length).toBe(5);

      // Verify each pong has the correct pingId
      pongMessages.forEach((msg, index) => {
        const pong = msg.payload as PongPayload;
        expect(pong.pingId).toBe(index + 1);
      });
    });
  });

  describe("Server tick simulation", () => {
    it("increments tick at configured rate (20 ticks/sec)", async () => {
      // Clear any existing interval
      room.dispose();
      
      // Create fresh room with mocked timers
      vi.useFakeTimers();
      const testRoom = new MockSprintCraftRoom();
      testRoom.onCreate();

      expect(testRoom.state.serverTick).toBe(0);
      
      // Advance by 50ms (1 tick at 20 ticks/sec)
      vi.advanceTimersByTime(50);
      expect(testRoom.state.serverTick).toBe(1);

      // Advance by another 100ms (2 more ticks)
      vi.advanceTimersByTime(100);
      expect(testRoom.state.serverTick).toBe(3);

      testRoom.dispose();
      vi.useRealTimers();
    });
  });

  describe("C_INPUT message handling", () => {
    it("updates player state from input frames", () => {
      const client = new MockServerClient("session-input");
      room.onJoin(client);

      const frame: InputFrame = {
        seq: 1,
        dtSec: 1 / 60,
        keysDown: ["KeyW"],
        keysPressed: [],
        yaw: 0,
        pitch: 0
      };

      room.handleMessage(client, "C_INPUT", { frames: [frame] });

      const sim = room.playerStates.get("session-input");
      expect(sim).toBeDefined();
      expect(sim?.state.position.z).toBeGreaterThan(0);
    });

    it("emits correction when divergence is high", () => {
      const client = new MockServerClient("session-correction");
      room.onJoin(client);
      room.state.serverTick = 10;

      const frame: InputFrame = {
        seq: 1,
        dtSec: 1 / 60,
        keysDown: ["KeyW"],
        keysPressed: [],
        yaw: 0,
        pitch: 0,
        clientState: {
          id: "session-correction",
          pos: { x: 10, y: 6, z: 10 },
          vel: { x: 0, y: 0, z: 0 },
          yaw: 0,
          pitch: 0,
          stance: "standing",
          grounded: true
        }
      };

      room.handleMessage(client, "C_INPUT", { frames: [frame] });

      const correction = client.getLastMessage("S_CORRECTION");
      expect(correction).toBeDefined();
    });
  });
});

describe("SprintCraftRoom: Message Validation", () => {
  let room: MockSprintCraftRoom;

  beforeEach(() => {
    room = new MockSprintCraftRoom();
    room.onCreate();
  });

  afterEach(() => {
    room.dispose();
  });

  it("handles malformed hello payload gracefully", () => {
    const client = new MockServerClient("session-malformed");
    room.onJoin(client);

    // Payload missing required fields
    expect(() => {
      room.handleMessage(client, "C_HELLO", {});
    }).not.toThrow();

    // Payload with undefined name
    expect(() => {
      room.handleMessage(client, "C_HELLO", { name: undefined });
    }).not.toThrow();
  });

  it("handles malformed ping payload gracefully", () => {
    const client = new MockServerClient("session-bad-ping");
    room.onJoin(client);

    // Should not throw even with bad payload
    expect(() => {
      room.handleMessage(client, "C_PING", {});
    }).not.toThrow();
  });
});

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
