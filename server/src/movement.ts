import type { InputFrame, Vec3 } from "../../shared/protocol";

export type ServerPlayerState = {
  playerId: string;
  position: Vec3;
  velocity: Vec3;
  stance: "standing" | "crouching";
};

export type ServerTuning = {
  walkSpeed: number;
  sprintMultiplier: number;
  crouchMultiplier: number;
  gravity: number;
  jumpSpeed: number;
  maxFallSpeed: number;
  outOfBoundsY: number;
  groundY: number;
};

export const DEFAULT_SERVER_TUNING: ServerTuning = {
  walkSpeed: 4.2,
  sprintMultiplier: 1.6,
  crouchMultiplier: 0.55,
  gravity: 18,
  jumpSpeed: 7.2,
  maxFallSpeed: 40,
  outOfBoundsY: -40,
  groundY: 1
};

export function createServerPlayerState(playerId: string): ServerPlayerState {
  return {
    playerId,
    position: { x: 0, y: 6, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    stance: "standing"
  };
}

export function applyInputFrameServer(options: {
  state: ServerPlayerState;
  frame: InputFrame;
  grounded: boolean;
  tuning?: Partial<ServerTuning>;
}): { grounded: boolean; didReset: boolean } {
  const { state, frame } = options;
  const tuning = { ...DEFAULT_SERVER_TUNING, ...options.tuning };

  if (!Number.isFinite(frame.dtSec) || frame.dtSec <= 0) {
    return { grounded: options.grounded, didReset: false };
  }

  const dtSec = clamp(frame.dtSec, 0, 0.25);
  const keysDown = new Set(frame.keysDown);
  const keysPressed = new Set(frame.keysPressed);

  const crouching = keysDown.has("Control") || keysDown.has("Alt");
  state.stance = crouching ? "crouching" : "standing";

  const forward = (keysDown.has("KeyW") ? 1 : 0) + (keysDown.has("KeyS") ? -1 : 0);
  const strafe = (keysDown.has("KeyD") ? 1 : 0) + (keysDown.has("KeyA") ? -1 : 0);
  const sprinting = keysDown.has("Shift");
  const stanceMultiplier = crouching ? tuning.crouchMultiplier : 1;

  const speed = tuning.walkSpeed * (sprinting ? tuning.sprintMultiplier : 1) * stanceMultiplier;
  const { x: dirX, z: dirZ } = normalizeDirection(forward, strafe, frame.yaw);

  state.velocity.x = dirX * speed;
  state.velocity.z = dirZ * speed;

  let grounded = options.grounded;
  if (keysPressed.has("Space") && grounded) {
    state.velocity.y = tuning.jumpSpeed;
    grounded = false;
  }

  state.velocity.y = clamp(state.velocity.y - tuning.gravity * dtSec, -tuning.maxFallSpeed, tuning.maxFallSpeed);

  state.position.x += state.velocity.x * dtSec;
  state.position.y += state.velocity.y * dtSec;
  state.position.z += state.velocity.z * dtSec;

  if (state.position.y <= tuning.groundY) {
    state.position.y = tuning.groundY;
    if (state.velocity.y < 0) state.velocity.y = 0;
    grounded = true;
  } else {
    grounded = false;
  }

  if (!Number.isFinite(state.position.y) || state.position.y < tuning.outOfBoundsY) {
    resetState(state);
    return { grounded: false, didReset: true };
  }

  return { grounded, didReset: false };
}

function normalizeDirection(forward: number, strafe: number, yaw: number) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const x = sin * forward + cos * strafe;
  const z = cos * forward - sin * strafe;
  const length = Math.hypot(x, z);
  if (length < 0.0001) {
    return { x: 0, z: 0 };
  }
  return { x: x / length, z: z / length };
}

function resetState(state: ServerPlayerState) {
  state.position.x = 0;
  state.position.y = 6;
  state.position.z = 0;
  state.velocity.x = 0;
  state.velocity.y = 0;
  state.velocity.z = 0;
  state.stance = "standing";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
