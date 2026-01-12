export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export type Rgb01 = readonly [r: number, g: number, b: number];

/**
 * Face direction identifiers for per-face coloring.
 * Maps to mesher face order.
 */
export type FaceDirection = "top" | "bottom" | "side";

/**
 * Per-face color mapping for blocks that need different colors on different faces.
 * If not provided, the default `color` is used for all faces.
 */
export type FaceColors = {
  top: Rgb01;
  bottom: Rgb01;
  side: Rgb01;
};

export type BlockDef = {
  id: BlockId;
  name: string;
  /**
   * Default linear RGB in 0..1 range.
   * Used for per-vertex colors when faceColors is not specified.
   */
  color: Rgb01;
  /**
   * Optional per-face colors for blocks like grass.
   * When specified, overrides the default color based on face direction.
   */
  faceColors?: FaceColors;
  isSolid: boolean;
  isRenderable: boolean;
};

// Grass block has green top, brown bottom (dirt showing), and a grass-dirt blend on sides
const GRASS_TOP: Rgb01 = [0.28, 0.72, 0.28]; // Bright green
const GRASS_SIDE: Rgb01 = [0.38, 0.52, 0.28]; // Greenish-brown (grass on top, dirt below)
const DIRT_COLOR: Rgb01 = [0.45, 0.32, 0.18]; // Brown

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
    color: GRASS_TOP, // default fallback
    faceColors: {
      top: GRASS_TOP, // Green grass on top
      bottom: DIRT_COLOR, // Brown dirt underneath
      side: GRASS_SIDE // Greenish-brown blend on sides
    },
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Dirt]: {
    id: BlockId.Dirt,
    name: "dirt",
    color: DIRT_COLOR,
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

/**
 * Get the color for a specific face of a block.
 * Supports per-face coloring for blocks like grass.
 *
 * @param def The block definition
 * @param faceDirection The face direction ("top", "bottom", or "side")
 * @returns RGB color tuple for the face
 */
export function getBlockFaceColor(def: BlockDef, faceDirection: FaceDirection): Rgb01 {
  if (def.faceColors) {
    return def.faceColors[faceDirection];
  }
  return def.color;
}

