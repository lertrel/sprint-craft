import { describe, expect, it, vi } from "vitest";
import type { RoomSnapshot, StateDelta } from "../shared/protocol";
import { createEnvelope, classifyState } from "../shared/protocol";
import { createMultiplayerSession } from "../src/sprint-craft/multiplayer/session";
import type { ColyseusClient, RoomLike } from "../src/sprint-craft/multiplayer/colyseus-client";
import type { SessionAdapter } from "../src/sprint-craft/multiplayer/adapters";
import { createDiagnostics } from "../src/sprint-craft/multiplayer/diagnostics";
import { createSyncBudgetTracker } from "../src/sprint-craft/multiplayer/sync-budget";
import { DEFAULT_TICK_CONTRACT, getTickIntervals } from "../src/sprint-craft/multiplayer/tick-contract";

class FakeRoom implements RoomLike {
  id = "room-id";
  name = "sprint-craft";
  sent: Array<{ type: string; payload?: unknown }> = [];
  private messageHandlers = new Map<string, Array<(message: unknown) => void>>();
  private leaveHandlers: Array<(code: number) => void> = [];

  send(type: string, message?: unknown) {
    this.sent.push({ type, payload: message });
  }

  onMessage(type: string, cb: (message: unknown) => void) {
    const list = this.messageHandlers.get(type) ?? [];
    list.push(cb);
    this.messageHandlers.set(type, list);
  }

  onStateChange() {}

  onLeave(cb: (code: number) => void) {
    this.leaveHandlers.push(cb);
  }

  leave() {
    this.leaveHandlers.forEach((handler) => handler(0));
  }

  emitMessage(type: string, payload: unknown) {
    const list = this.messageHandlers.get(type) ?? [];
    list.forEach((handler) => handler(payload));
  }
}

class FakeClient implements ColyseusClient {
  room: FakeRoom;
  lastJoinOptions: unknown = null;

  constructor(room: FakeRoom) {
    this.room = room;
  }

  async joinOrCreate(_roomName: string, options?: unknown): Promise<RoomLike> {
    this.lastJoinOptions = options ?? null;
    return this.room;
  }
}

function makeAdapter() {
  const snapshots: RoomSnapshot[] = [];
  const deltas: StateDelta[] = [];
  const adapter: SessionAdapter = {
    getLocalPlayerProgress: () => ({ id: "local", name: "User 1", joinedAt: 123 }),
    getLocalPlayerVolatile: () => ({
      id: "local",
      pos: { x: 1, y: 2, z: 3 },
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

describe("Iteration 10: protocol + session lifecycle (integration)", () => {
  it("creates envelopes and classifies state keys", () => {
    const envelope = createEnvelope("C_PING", { pingId: 1, clientTs: 100 });
    expect(envelope.t).toBe("C_PING");
    expect(classifyState("playerVolatile")).toBe("volatile");
  });

  it("connects, sends hello, and handles welcome snapshots", async () => {
    const room = new FakeRoom();
    const client = new FakeClient(room);
    const { adapter, snapshots } = makeAdapter();
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client, adapter, diagnostics });

    await session.connect();
    expect(session.isConnected()).toBe(true);
    expect(room.sent.some((msg) => msg.type === "C_HELLO")).toBe(true);

    const snapshot: RoomSnapshot = {
      serverTick: 5,
      worldSeed: 1,
      players: [],
      playerStates: [],
      worldEvents: []
    };
    room.emitMessage("S_WELCOME", {
      playerId: "local",
      tickRate: 20,
      worldSeed: 1,
      snapshot
    });
    expect(snapshots.length).toBe(1);
    expect(session.getDiagnostics().lastServerTick).toBe(5);
  });

  it("updates ping diagnostics on pong", async () => {
    const room = new FakeRoom();
    const client = new FakeClient(room);
    const { adapter } = makeAdapter();
    const diagnostics = createDiagnostics();
    const session = createMultiplayerSession({ client, adapter, diagnostics });

    await session.connect();
    const nowMs = 2500;
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(nowMs);
    session.tick(nowMs);

    const ping = room.sent.find((msg) => msg.type === "C_PING");
    expect(ping).toBeDefined();

    room.emitMessage("S_PONG", { pingId: (ping?.payload as any).pingId, serverTs: nowMs + 5 });
    expect(session.getDiagnostics().lastPingMs).toBe(0);
    dateSpy.mockRestore();
  });
});

describe("Iteration 10: budgets + tick contract (integration)", () => {
  it("blocks rapid budgeted sends and computes intervals", () => {
    const tracker = createSyncBudgetTracker();
    expect(tracker.canSend("playerVolatile", 1000)).toBe(true);
    tracker.recordSent("playerVolatile", 1000);
    expect(tracker.canSend("playerVolatile", 1010)).toBe(false);

    const intervals = getTickIntervals(DEFAULT_TICK_CONTRACT);
    expect(intervals.snapshotIntervalMs).toBe(100);
  });
});
