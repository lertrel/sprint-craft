import { describe, expect, it } from "vitest";
import type { InputFrame, RoomSnapshot } from "../shared/protocol";
import { createMultiplayerSession } from "../src/sprint-craft/multiplayer/session";
import type { ColyseusClient, RoomLike } from "../src/sprint-craft/multiplayer/colyseus-client";
import type { SessionAdapter } from "../src/sprint-craft/multiplayer/adapters";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { applyInputFrame } from "../src/sprint-craft/voxels/player-controller";
import { createPredictionBuffer, recordInputFrame, reconcilePrediction } from "../src/sprint-craft/multiplayer/prediction";

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

describe("Iteration 11: movement sync + correction (integration)", () => {
  it("sends input frames and reconciles on correction", async () => {
    const room = new FakeRoom();
    const client = new FakeClient(room);
    const localState = createDefaultPlayerState("local");
    let grounded = true;
    const buffer = createPredictionBuffer();

    const getVoxel = (_wx: number, wy: number, _wz: number) => (wy <= 0 ? 1 : 0);

    const adapter: SessionAdapter = {
      getLocalPlayerProgress: () => ({ id: "local", name: "User 1", joinedAt: 1 }),
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
      applySnapshot: (_snapshot: RoomSnapshot) => {},
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

    const session = createMultiplayerSession({ client, adapter });
    await session.connect();

    session.tick(0);
    session.tick(50);

    const inputMsg = room.sent.find((msg) => msg.type === "C_INPUT");
    expect(inputMsg).toBeDefined();

    room.emitMessage("S_CORRECTION", {
      playerId: "local",
      serverTick: 1,
      state: {
        id: "local",
        pos: { x: 0, y: 6, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        stance: "standing",
        grounded: true
      },
      ackSeq: 1
    });

    expect(localState.position.z).toBeGreaterThanOrEqual(0);
  });
});
