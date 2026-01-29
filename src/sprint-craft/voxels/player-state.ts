import type { PlayerVolatile, Vec3 } from "../../../shared/protocol";

export type PlayerStance = "standing" | "crouching" | "crawling";

export type PlayerState = {
  /**
   * Stable player identifier. For local single-player, defaults to "local".
   * In multiplayer, assigned by the server.
   */
  playerId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  stance: PlayerStance;
  /**
   * Collider heights are pre-modeled here so Iteration 3 can implement stance transitions
   * without changing the data model.
   */
  colliderHeights: {
    standing: number;
    crouching: number;
    crawling: number;
  };
};

/**
 * Serializable snapshot of player state for multiplayer sync.
 * Matches PlayerVolatile from the protocol but derived from local state.
 */
export type PlayerSnapshot = {
  id: string;
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  stance: PlayerStance;
  grounded: boolean;
  hotbarSlot?: number;
};

/**
 * Creates a default player state with backwards-compatible defaults.
 * For local single-player, playerId defaults to "local".
 */
export function createDefaultPlayerState(playerId: string = "local"): PlayerState {
  return {
    playerId,
    position: { x: 0, y: 6, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    stance: "standing",
    colliderHeights: {
      standing: 1.8,
      crouching: 1.4,
      crawling: 1.0
    }
  };
}

/**
 * Converts local PlayerState to a serializable snapshot for network sync.
 * Requires yaw/pitch and grounded state which are typically managed externally.
 */
export function toPlayerSnapshot(
  state: PlayerState,
  extra: { yaw: number; pitch: number; grounded: boolean; hotbarSlot?: number }
): PlayerSnapshot {
  return {
    id: state.playerId,
    pos: { x: state.position.x, y: state.position.y, z: state.position.z },
    vel: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
    yaw: extra.yaw,
    pitch: extra.pitch,
    stance: state.stance,
    grounded: extra.grounded,
    hotbarSlot: extra.hotbarSlot
  };
}

/**
 * Converts a PlayerVolatile from network to local PlayerState.
 * Preserves collider heights from defaults.
 */
export function fromPlayerVolatile(
  volatile: PlayerVolatile,
  existing?: PlayerState
): PlayerState {
  const defaults = existing ?? createDefaultPlayerState(volatile.id);
  return {
    playerId: volatile.id,
    position: { x: volatile.pos.x, y: volatile.pos.y, z: volatile.pos.z },
    velocity: { x: volatile.vel.x, y: volatile.vel.y, z: volatile.vel.z },
    stance: volatile.stance,
    colliderHeights: defaults.colliderHeights
  };
}

/**
 * Generates a stable player ID for local single-player or as a fallback.
 * Uses crypto.randomUUID if available, otherwise a timestamp-based ID.
 */
export function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

