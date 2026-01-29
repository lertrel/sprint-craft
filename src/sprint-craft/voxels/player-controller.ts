import type { InputState } from "../input";
import type { CameraLike } from "../app";
import type { PlayerState, PlayerStance } from "./player-state";
import { createDefaultPlayerState } from "./player-state";
import type { VoxelGetter } from "./voxel-collision";
import {
  aabbIntersectsSolidVoxels,
  isStandingOnGround,
  makePlayerAabb,
  moveAndCollideAabb
} from "./voxel-collision";
import type { InputFrame } from "../../../shared/protocol";

export type PlayerController = {
  readonly state: PlayerState;
  readonly isGrounded: () => boolean;
  readonly setGrounded: (grounded: boolean) => void;
  tick: (dtSec: number) => void;
  respawn: () => void;
};

export type PlayerControllerOptions = {
  input: InputState;
  camera: CameraLike;
  getVoxel: VoxelGetter;
  spawn: () => { x: number; y: number; z: number };
};

export type PlayerTuning = {
  halfWidth: number;
  walkSpeed: number;
  sprintMultiplier: number;
  crouchMultiplier: number;
  gravity: number;
  jumpSpeed: number;
  maxFallSpeed: number;
  outOfBoundsY: number;
  stepHeight: number;
};

export const DEFAULT_PLAYER_TUNING: PlayerTuning = {
  halfWidth: 0.3,
  walkSpeed: 4.2,
  sprintMultiplier: 1.6,
  crouchMultiplier: 0.55,
  gravity: 18,
  jumpSpeed: 7.2,
  maxFallSpeed: 40,
  outOfBoundsY: -40,
  // Iteration 3 requirement is "minimal snag prevention"; a conservative default avoids
  // accidental wall-climbing while still allowing smooth axis-separated sliding.
  stepHeight: 0
};

const INPUT_KEYS = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "Space"
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function getYaw(camera: CameraLike): number {
  return camera.rotation?.y ?? 0;
}

function setCameraPosition(camera: CameraLike, pos: { x: number; y: number; z: number }) {
  // CameraLike is permissive; real Babylon cameras have `position`.
  camera.position.x = pos.x;
  camera.position.y = pos.y;
  camera.position.z = pos.z;
}

function vec2Normalize(x: number, z: number): { x: number; z: number } {
  const len = Math.hypot(x, z);
  if (len <= 1e-9) return { x: 0, z: 0 };
  return { x: x / len, z: z / len };
}

function stanceHeight(s: PlayerState, stance: PlayerStance): number {
  return s.colliderHeights[stance];
}

export function computeEyeHeight(height: number): number {
  // Keep eye slightly below the top of the collider for stability.
  return Math.max(0.2, height - 0.15);
}

function canFitAtStance(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number, stance: PlayerStance): boolean {
  const height = stanceHeight(state, stance);
  const aabb = makePlayerAabb({ position: state.position, halfWidth, height });
  return !aabbIntersectsSolidVoxels(getVoxel, aabb);
}

function chooseReducedStance(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number): PlayerStance {
  // Prefer crouching, fall back to crawling if crouch doesn't fit.
  if (canFitAtStance(getVoxel, state, halfWidth, "crouching")) return "crouching";
  return "crawling";
}

function tryStandUp(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number): PlayerStance {
  if (canFitAtStance(getVoxel, state, halfWidth, "standing")) return "standing";
  // If can't stand, keep the current reduced stance (or reduce further).
  if (state.stance === "crawling") return "crawling";
  return chooseReducedStance(getVoxel, state, halfWidth);
}

export function applyInputFrame(options: {
  state: PlayerState;
  frame: InputFrame;
  grounded: boolean;
  getVoxel: VoxelGetter;
  tuning?: PlayerTuning;
  respawn: () => void;
}): { grounded: boolean; didRespawn: boolean } {
  const { state, frame, getVoxel, respawn } = options;
  const tuning = options.tuning ?? DEFAULT_PLAYER_TUNING;
  let grounded = options.grounded;
  const dt = clamp(
    Number.isFinite(frame.dtSec) ? frame.dtSec : 1 / 60,
    1 / 240,
    1 / 20
  );

  const p = state.position;
  const v = state.velocity;
  const invalid =
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.y) ||
    !Number.isFinite(p.z) ||
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y) ||
    !Number.isFinite(v.z) ||
    p.y < tuning.outOfBoundsY;
  if (invalid) {
    respawn();
    return { grounded: false, didRespawn: true };
  }

  const down = new Set(frame.keysDown);
  const pressed = new Set(frame.keysPressed);

  const crouchKey =
    down.has("AltLeft") ||
    down.has("AltRight") ||
    down.has("ControlLeft") ||
    down.has("ControlRight");
  if (crouchKey) {
    state.stance = chooseReducedStance(getVoxel, state, tuning.halfWidth);
  } else {
    state.stance = tryStandUp(getVoxel, state, tuning.halfWidth);
  }

  const height = stanceHeight(state, state.stance);
  const isReduced = state.stance !== "standing";

  const w = down.has("KeyW") ? 1 : 0;
  const s = down.has("KeyS") ? 1 : 0;
  const a = down.has("KeyA") ? 1 : 0;
  const d = down.has("KeyD") ? 1 : 0;

  const forward = w - s;
  const strafe = d - a;

  const yaw = frame.yaw;
  const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };

  let dirX = fwd.x * forward + right.x * strafe;
  let dirZ = fwd.z * forward + right.z * strafe;
  ({ x: dirX, z: dirZ } = vec2Normalize(dirX, dirZ));

  const sprint = down.has("ShiftLeft") || down.has("ShiftRight");
  const sprintMul = sprint && !isReduced ? tuning.sprintMultiplier : 1;
  const stanceMul = isReduced ? tuning.crouchMultiplier : 1;
  const speed = tuning.walkSpeed * sprintMul * stanceMul;

  state.velocity.x = dirX * speed;
  state.velocity.z = dirZ * speed;

  state.velocity.y -= tuning.gravity * dt;
  state.velocity.y = clamp(state.velocity.y, -tuning.maxFallSpeed, Number.POSITIVE_INFINITY);

  if (pressed.has("Space") && grounded) {
    state.velocity.y = tuning.jumpSpeed;
    grounded = false;
  }

  const delta = {
    x: state.velocity.x * dt,
    y: state.velocity.y * dt,
    z: state.velocity.z * dt
  };

  const moved = moveAndCollideAabb({
    getVoxel,
    position: state.position,
    delta,
    halfWidth: tuning.halfWidth,
    height,
    stepHeight: tuning.stepHeight,
    allowStepUp: grounded
  });

  state.position.x = moved.position.x;
  state.position.y = moved.position.y;
  state.position.z = moved.position.z;

  if (moved.collided.y) {
    if (state.velocity.y < 0 && moved.grounded) grounded = true;
    state.velocity.y = 0;
  }

  if (state.velocity.y <= 0) {
    const standingOnGround = isStandingOnGround(getVoxel, state.position, tuning.halfWidth);
    if (standingOnGround) {
      grounded = true;
      const blockBelowY = Math.floor(state.position.y - 0.01);
      const snapY = blockBelowY + 1;
      if (Math.abs(state.position.y - snapY) < 0.02) {
        state.position.y = snapY;
      }
    } else if (!moved.collided.y) {
      grounded = false;
    }
  }

  const aabb = makePlayerAabb({ position: state.position, halfWidth: tuning.halfWidth, height });
  if (aabbIntersectsSolidVoxels(getVoxel, aabb)) {
    respawn();
    return { grounded: false, didRespawn: true };
  }

  return { grounded, didRespawn: false };
}

export function createPlayerController(options: PlayerControllerOptions): PlayerController {
  const { input, camera, getVoxel, spawn } = options;
  const tuning = { ...DEFAULT_PLAYER_TUNING };

  const state = createDefaultPlayerState();

  let grounded = false;

  const doRespawn = () => {
    const p = spawn();
    state.position.x = p.x;
    state.position.y = p.y;
    state.position.z = p.z;
    state.velocity.x = 0;
    state.velocity.y = 0;
    state.velocity.z = 0;
    state.stance = "standing";
    grounded = false;
    const eye = computeEyeHeight(stanceHeight(state, state.stance));
    setCameraPosition(camera, {
      x: state.position.x,
      y: state.position.y + eye,
      z: state.position.z
    });
  };

  doRespawn();

  const tick = (dtSec: number) => {
    const dt = clamp(Number.isFinite(dtSec) ? dtSec : 1 / 60, 1 / 240, 1 / 20);
    const yaw = getYaw(camera);
    const pitch = camera.rotation?.x ?? 0;
    const keysDown = INPUT_KEYS.filter((code) => input.isKeyDown(code));
    const keysPressed = INPUT_KEYS.filter((code) => input.wasKeyPressed(code));

    const frame: InputFrame = {
      seq: 0,
      dtSec: dt,
      keysDown,
      keysPressed,
      yaw,
      pitch
    };

    const result = applyInputFrame({
      state,
      frame,
      grounded,
      getVoxel,
      tuning,
      respawn: doRespawn
    });
    grounded = result.grounded;

    const height = stanceHeight(state, state.stance);
    const eye = computeEyeHeight(height);
    setCameraPosition(camera, {
      x: state.position.x,
      y: state.position.y + eye,
      z: state.position.z
    });
  };

  return {
    state,
    isGrounded: () => grounded,
    setGrounded: (value) => {
      grounded = value;
    },
    tick,
    respawn: doRespawn
  };
}

