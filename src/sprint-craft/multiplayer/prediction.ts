import type { InputFrame, PlayerVolatile } from "../../../shared/protocol";
import type { PlayerState } from "../voxels/player-state";
import type { VoxelGetter } from "../voxels/voxel-collision";
import type { PlayerTuning } from "../voxels/player-controller";
import { applyInputFrame } from "../voxels/player-controller";

export type PredictionBuffer = {
  pendingFrames: InputFrame[];
};

export type PredictionReconcileResult = {
  corrected: boolean;
  errorDistance: number;
  grounded: boolean;
  pendingFrames: InputFrame[];
};

export function createPredictionBuffer(): PredictionBuffer {
  return { pendingFrames: [] };
}

export function recordInputFrame(buffer: PredictionBuffer, frame: InputFrame) {
  buffer.pendingFrames.push(frame);
}

export function dropAcknowledgedFrames(buffer: PredictionBuffer, ackSeq?: number) {
  if (ackSeq === undefined) {
    buffer.pendingFrames = [];
    return;
  }
  buffer.pendingFrames = buffer.pendingFrames.filter((frame) => frame.seq > ackSeq);
}

export function reconcilePrediction(options: {
  state: PlayerState;
  grounded: boolean;
  serverState: PlayerVolatile;
  ackSeq?: number;
  pendingFrames: InputFrame[];
  getVoxel: VoxelGetter;
  tuning?: PlayerTuning;
  respawn: () => void;
}): PredictionReconcileResult {
  const {
    state,
    grounded,
    serverState,
    ackSeq,
    pendingFrames,
    getVoxel,
    tuning,
    respawn
  } = options;
  const errorDistance = distance(state.position, serverState.pos);

  applyVolatileToState(state, serverState);
  let nextGrounded = serverState.grounded;
  const remaining =
    ackSeq === undefined
      ? []
      : pendingFrames.filter((frame) => frame.seq > ackSeq);

  for (const frame of remaining) {
    const result = applyInputFrame({
      state,
      frame,
      grounded: nextGrounded,
      getVoxel,
      tuning,
      respawn
    });
    nextGrounded = result.grounded;
  }

  return {
    corrected: true,
    errorDistance,
    grounded: nextGrounded,
    pendingFrames: remaining
  };
}

function applyVolatileToState(state: PlayerState, volatile: PlayerVolatile) {
  state.playerId = volatile.id;
  state.position.x = volatile.pos.x;
  state.position.y = volatile.pos.y;
  state.position.z = volatile.pos.z;
  state.velocity.x = volatile.vel.x;
  state.velocity.y = volatile.vel.y;
  state.velocity.z = volatile.vel.z;
  state.stance = volatile.stance;
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}
