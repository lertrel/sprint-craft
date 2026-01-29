import type { InputFrame, PlayerVolatile } from "../../../shared/protocol";
import { createDefaultPlayerState } from "../voxels/player-state";
import type { VoxelGetter } from "../voxels/voxel-collision";
import type { PlayerTuning } from "../voxels/player-controller";
import { applyInputFrame } from "../voxels/player-controller";
import { reconcilePrediction, createPredictionBuffer, recordInputFrame } from "./prediction";

export type HarnessResult = {
  maxError: number;
  avgError: number;
  corrections: number;
};

export function runPredictionHarness(options: {
  frames: InputFrame[];
  getVoxel?: VoxelGetter;
  tuning?: PlayerTuning;
  correctionEveryN?: number;
}): HarnessResult {
  const { frames, getVoxel = defaultVoxel, tuning, correctionEveryN = 5 } = options;
  const serverState = createDefaultPlayerState("server");
  const clientState = createDefaultPlayerState("client");
  let serverGrounded = true;
  let clientGrounded = true;

  const buffer = createPredictionBuffer();
  let maxError = 0;
  let totalError = 0;
  let errorSamples = 0;
  let corrections = 0;

  frames.forEach((frame, index) => {
    const serverResult = applyInputFrame({
      state: serverState,
      frame,
      grounded: serverGrounded,
      getVoxel,
      tuning,
      respawn: () => resetState(serverState)
    });
    serverGrounded = serverResult.grounded;

    recordInputFrame(buffer, frame);
    const clientResult = applyInputFrame({
      state: clientState,
      frame,
      grounded: clientGrounded,
      getVoxel,
      tuning,
      respawn: () => resetState(clientState)
    });
    clientGrounded = clientResult.grounded;

    if ((index + 1) % correctionEveryN === 0) {
      const serverVolatile = toVolatile(serverState, serverGrounded);
      const result = reconcilePrediction({
        state: clientState,
        grounded: clientGrounded,
        serverState: serverVolatile,
        ackSeq: frame.seq,
        pendingFrames: buffer.pendingFrames,
        getVoxel,
        tuning,
        respawn: () => resetState(clientState)
      });
      clientGrounded = result.grounded;
      buffer.pendingFrames = result.pendingFrames;
      corrections += 1;
      maxError = Math.max(maxError, result.errorDistance);
      totalError += result.errorDistance;
      errorSamples += 1;
    }
  });

  return {
    maxError,
    avgError: errorSamples > 0 ? totalError / errorSamples : 0,
    corrections
  };
}

function toVolatile(state: ReturnType<typeof createDefaultPlayerState>, grounded: boolean): PlayerVolatile {
  return {
    id: state.playerId,
    pos: { ...state.position },
    vel: { ...state.velocity },
    yaw: 0,
    pitch: 0,
    stance: state.stance,
    grounded
  };
}

function resetState(state: ReturnType<typeof createDefaultPlayerState>) {
  state.position.x = 0;
  state.position.y = 6;
  state.position.z = 0;
  state.velocity.x = 0;
  state.velocity.y = 0;
  state.velocity.z = 0;
  state.stance = "standing";
}

function defaultVoxel(_wx: number, wy: number, _wz: number) {
  return wy <= 0 ? 1 : 0;
}
