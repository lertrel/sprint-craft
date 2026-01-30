import { describe, expect, it } from "vitest";
import type { InputFrame } from "../shared/protocol";
import { createDeadReckoner } from "../src/sprint-craft/multiplayer/dead-reckoning";
import {
  createPredictionBuffer,
  recordInputFrame,
  reconcilePrediction
} from "../src/sprint-craft/multiplayer/prediction";
import { runPredictionHarness } from "../src/sprint-craft/multiplayer/prediction-harness";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { applyInputFrame } from "../src/sprint-craft/voxels/player-controller";

const getVoxel = (_wx: number, wy: number, _wz: number) => (wy <= 0 ? 1 : 0);

function makeFrame(seq: number): InputFrame {
  return {
    seq,
    dtSec: 1 / 60,
    keysDown: ["KeyW"],
    keysPressed: [],
    yaw: 0,
    pitch: 0
  };
}

describe("Iteration 11: prediction reconciliation (unit)", () => {
  it("reconciles to authoritative state and trims frames", () => {
    const state = createDefaultPlayerState("local");
    let grounded = true;
    const buffer = createPredictionBuffer();

    const frame1 = makeFrame(1);
    const frame2 = makeFrame(2);
    recordInputFrame(buffer, frame1);
    recordInputFrame(buffer, frame2);

    let result = applyInputFrame({
      state,
      frame: frame1,
      grounded,
      getVoxel,
      respawn: () => {}
    });
    grounded = result.grounded;
    result = applyInputFrame({
      state,
      frame: frame2,
      grounded,
      getVoxel,
      respawn: () => {}
    });
    grounded = result.grounded;

    const serverState = {
      id: "local",
      pos: { x: 0, y: 6, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      stance: "standing" as const,
      grounded: true
    };

    const reconcile = reconcilePrediction({
      state,
      grounded,
      serverState,
      ackSeq: 2,
      pendingFrames: buffer.pendingFrames,
      getVoxel,
      respawn: () => {}
    });

    expect(reconcile.pendingFrames).toHaveLength(0);
    expect(state.position).toEqual({ x: 0, y: 6, z: 0 });
  });
});

describe("Iteration 11: dead reckoning interpolation (unit)", () => {
  it("interpolates between samples within delay window", () => {
    const deadReckoner = createDeadReckoner({
      interpolationDelayMs: 100,
      maxExtrapolationMs: 200
    });

    deadReckoner.pushSample(
      {
        id: "remote",
        pos: { x: 0, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        stance: "standing",
        grounded: true
      },
      0
    );
    deadReckoner.pushSample(
      {
        id: "remote",
        pos: { x: 10, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        stance: "standing",
        grounded: true
      },
      100
    );

    const mid = deadReckoner.sample(150); // target time = 50
    expect(mid).not.toBeNull();
    expect(mid?.pos.x).toBeCloseTo(5, 2);
  });
});

describe("Iteration 11: prediction harness determinism (unit)", () => {
  it("produces deterministic metrics for identical input streams", () => {
    const frames = [makeFrame(1), makeFrame(2), makeFrame(3), makeFrame(4), makeFrame(5)];
    const first = runPredictionHarness({ frames });
    const second = runPredictionHarness({ frames });

    expect(second).toEqual(first);
    expect(first.corrections).toBeGreaterThan(0);
  });
});
