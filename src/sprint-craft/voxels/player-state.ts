export type PlayerStance = "standing" | "crouching" | "crawling";

export type PlayerState = {
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

export function createDefaultPlayerState(): PlayerState {
  return {
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

