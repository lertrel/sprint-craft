import type { InputState } from "../input";
import type { CameraLike } from "../app";
import type { PlayerState, PlayerStance } from "./player-state";
import { createDefaultPlayerState } from "./player-state";
import type { VoxelGetter } from "./voxel-collision";
import { aabbIntersectsSolidVoxels, isStandingOnGround, makePlayerAabb, moveAndCollideAabb } from "./voxel-collision";

export type PlayerController = {
  readonly state: PlayerState;
  readonly isGrounded: () => boolean;
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
    setCameraPosition(camera, { x: state.position.x, y: state.position.y + eye, z: state.position.z });
  };

  // Spawn on creation.
  doRespawn();

  const tick = (dtSec: number) => {
    const dt = clamp(Number.isFinite(dtSec) ? dtSec : 1 / 60, 1 / 240, 1 / 20);

    // Respawn if in invalid state.
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
      doRespawn();
      return;
    }

    const crouchKey =
      input.isKeyDown("AltLeft") ||
      input.isKeyDown("AltRight") ||
      input.isKeyDown("ControlLeft") ||
      input.isKeyDown("ControlRight");
    if (crouchKey) {
      state.stance = chooseReducedStance(getVoxel, state, tuning.halfWidth);
    } else {
      state.stance = tryStandUp(getVoxel, state, tuning.halfWidth);
    }

    const height = stanceHeight(state, state.stance);
    const isReduced = state.stance !== "standing";

    const w = input.isKeyDown("KeyW") ? 1 : 0;
    const s = input.isKeyDown("KeyS") ? 1 : 0;
    const a = input.isKeyDown("KeyA") ? 1 : 0;
    const d = input.isKeyDown("KeyD") ? 1 : 0;

    const forward = w - s;
    const strafe = d - a;

    const yaw = getYaw(camera);
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };

    let dirX = fwd.x * forward + right.x * strafe;
    let dirZ = fwd.z * forward + right.z * strafe;
    ({ x: dirX, z: dirZ } = vec2Normalize(dirX, dirZ));

    const sprint = input.isKeyDown("ShiftLeft") || input.isKeyDown("ShiftRight");
    const sprintMul = sprint && !isReduced ? tuning.sprintMultiplier : 1;
    const stanceMul = isReduced ? tuning.crouchMultiplier : 1;
    const speed = tuning.walkSpeed * sprintMul * stanceMul;

    // Horizontal velocity is directly controlled (simple, deterministic).
    state.velocity.x = dirX * speed;
    state.velocity.z = dirZ * speed;

    // Gravity.
    state.velocity.y -= tuning.gravity * dt;
    state.velocity.y = clamp(state.velocity.y, -tuning.maxFallSpeed, Number.POSITIVE_INFINITY);

    // Jump (edge-triggered) only if grounded.
    if (input.wasKeyPressed("Space") && grounded) {
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

    // If we hit something vertically, stop vertical velocity.
    if (moved.collided.y) {
      if (state.velocity.y < 0 && moved.grounded) grounded = true;
      state.velocity.y = 0;
    }
    
    // Use stable ground detection to prevent bouncing oscillation.
    // This checks if there's solid ground directly beneath the player,
    // which is more reliable than collision detection at integer boundaries.
    if (state.velocity.y <= 0) {
      const standingOnGround = isStandingOnGround(getVoxel, state.position, tuning.halfWidth);
      if (standingOnGround) {
        grounded = true;
        // Snap to integer Y when on ground to prevent floating-point drift.
        // Use 0.01 epsilon (larger than COLLISION_EPSILON 0.001) to handle boundary cases.
        // When position.y = 6.001, we want blockBelowY = 5, not 6.
        // floor(6.001 - 0.01) = floor(5.991) = 5 ✓
        // floor(6.001 - 0.001) = floor(6.0) = 6 ✗
        const blockBelowY = Math.floor(state.position.y - 0.01);
        const snapY = blockBelowY + 1;
        if (Math.abs(state.position.y - snapY) < 0.02) {
          state.position.y = snapY;
        }
      } else if (!moved.collided.y) {
        // Only set grounded to false if we're not colliding AND not standing on ground
        grounded = false;
      }
    }

    // If we are intersecting after movement for any reason, force respawn (safety).
    const aabb = makePlayerAabb({ position: state.position, halfWidth: tuning.halfWidth, height });
    if (aabbIntersectsSolidVoxels(getVoxel, aabb)) {
      doRespawn();
      return;
    }

    const eye = computeEyeHeight(height);
    setCameraPosition(camera, { x: state.position.x, y: state.position.y + eye, z: state.position.z });
  };

  return {
    state,
    isGrounded: () => grounded,
    tick,
    respawn: doRespawn
  };
}

