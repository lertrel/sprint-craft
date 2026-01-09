import { BlockId, type BlockId as BlockIdT } from "./blocks";

export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export type ChunkCoord = { cx: number; cy: number; cz: number };

export type Chunk = {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly voxels: Uint16Array;
  getLocal: (x: number, y: number, z: number) => BlockIdT;
  setLocal: (x: number, y: number, z: number, id: BlockIdT) => void;
};

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function createChunk(pos: ChunkCoord): Chunk {
  const voxels = new Uint16Array(CHUNK_VOLUME);

  const getLocal = (x: number, y: number, z: number): BlockIdT => {
    if (!isInChunkBounds(x, y, z)) return BlockId.Air;
    return voxels[localIndex(x, y, z)] as BlockIdT;
  };

  const setLocal = (x: number, y: number, z: number, id: BlockIdT) => {
    if (!isInChunkBounds(x, y, z)) return;
    voxels[localIndex(x, y, z)] = id;
  };

  return {
    cx: pos.cx,
    cy: pos.cy,
    cz: pos.cz,
    voxels,
    getLocal,
    setLocal
  };
}

export function isInChunkBounds(x: number, y: number, z: number): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    z >= 0 &&
    x < CHUNK_SIZE &&
    y < CHUNK_SIZE &&
    z < CHUNK_SIZE
  );
}

/**
 * Local voxel index mapping.
 *
 * Layout: X changes fastest, then Y, then Z.
 */
export function localIndex(x: number, y: number, z: number): number {
  return x + CHUNK_SIZE * (y + CHUNK_SIZE * z);
}

