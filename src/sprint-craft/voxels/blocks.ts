export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Wood: 5,
  Brick: 6,
  Clay: 7,
  Slate: 8,
  Snow: 9
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
const SAND_COLOR: Rgb01 = [0.78, 0.72, 0.5]; // Sandy beige
const WOOD_COLOR: Rgb01 = [0.6, 0.42, 0.22]; // Warm wood brown
const BRICK_COLOR: Rgb01 = [0.7, 0.28, 0.24]; // Brick red
const CLAY_COLOR: Rgb01 = [0.72, 0.58, 0.48]; // Muted clay
const SLATE_COLOR: Rgb01 = [0.35, 0.36, 0.4]; // Dark slate
const SNOW_COLOR: Rgb01 = [0.92, 0.94, 0.97]; // Snow white

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
  },
  [BlockId.Sand]: {
    id: BlockId.Sand,
    name: "sand",
    color: SAND_COLOR,
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Wood]: {
    id: BlockId.Wood,
    name: "wood",
    color: WOOD_COLOR,
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Brick]: {
    id: BlockId.Brick,
    name: "brick",
    color: BRICK_COLOR,
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Clay]: {
    id: BlockId.Clay,
    name: "clay",
    color: CLAY_COLOR,
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Slate]: {
    id: BlockId.Slate,
    name: "slate",
    color: SLATE_COLOR,
    isSolid: true,
    isRenderable: true
  },
  [BlockId.Snow]: {
    id: BlockId.Snow,
    name: "snow",
    color: SNOW_COLOR,
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

const HOTBAR_BLOCKS: BlockId[] = [
  BlockId.Dirt,
  BlockId.Grass,
  BlockId.Stone,
  BlockId.Sand,
  BlockId.Wood,
  BlockId.Brick,
  BlockId.Clay,
  BlockId.Slate,
  BlockId.Snow
];

export function getHotbarBlockId(slot1to9: number): BlockId {
  if (!Number.isInteger(slot1to9) || slot1to9 < 1 || slot1to9 > 9) {
    return HOTBAR_BLOCKS[0]!;
  }
  return HOTBAR_BLOCKS[slot1to9 - 1] ?? HOTBAR_BLOCKS[0]!;
}

export function getHotbarBlockIds(): readonly BlockId[] {
  return HOTBAR_BLOCKS;
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

