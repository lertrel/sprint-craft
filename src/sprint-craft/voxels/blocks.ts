export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export type Rgb01 = readonly [r: number, g: number, b: number];

export type BlockDef = {
  id: BlockId;
  name: string;
  /**
   * Linear RGB in 0..1 range.
   * Used for per-vertex colors in chunk meshes.
   */
  color: Rgb01;
  isSolid: boolean;
  isRenderable: boolean;
};

const BLOCKS_BY_ID: Record<number, BlockDef> = {
  [BlockId.Air]: {
    id: BlockId.Air,
    name: "air",
    color: [0, 0, 0],
    isSolid: false,
    isRenderable: false
  },
  [BlockId.Grass]: {
    id: BlockId.Grass,
    name: "grass",
    color: [0.28, 0.72, 0.28],
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Dirt]: {
    id: BlockId.Dirt,
    name: "dirt",
    color: [0.45, 0.32, 0.18],
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Stone]: {
    id: BlockId.Stone,
    name: "stone",
    color: [0.55, 0.55, 0.58],
    isSolid: true,
    isRenderable: true
  }
};

/**
 * Deterministically resolve a block definition from any numeric id.
 *
 * Behavior for unknown ids (spec choice):
 * - Maps to `air` so the world remains safe/renderable.
 */
export function getBlockDef(id: number): BlockDef {
  return BLOCKS_BY_ID[id] ?? BLOCKS_BY_ID[BlockId.Air]!;
}

