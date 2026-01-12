import { BlockId, type BlockId as BlockIdT } from "./blocks";
import { CHUNK_SIZE, chunkKey, createChunk, type Chunk } from "./chunk";
import { floorDiv, mod } from "./math";

export type World = {
  readonly chunks: Map<string, Chunk>;
  getChunk: (cx: number, cy: number, cz: number) => Chunk | undefined;
  ensureChunk: (cx: number, cy: number, cz: number) => Chunk;
  getVoxel: (wx: number, wy: number, wz: number) => BlockIdT;
  setVoxel: (wx: number, wy: number, wz: number, id: BlockIdT) => void;
};

export type WorldToChunk = {
  cx: number;
  cy: number;
  cz: number;
  lx: number;
  ly: number;
  lz: number;
};

export function worldToChunk(wx: number, wy: number, wz: number): WorldToChunk {
  const cx = floorDiv(wx, CHUNK_SIZE);
  const cy = floorDiv(wy, CHUNK_SIZE);
  const cz = floorDiv(wz, CHUNK_SIZE);

  return {
    cx,
    cy,
    cz,
    lx: mod(wx, CHUNK_SIZE),
    ly: mod(wy, CHUNK_SIZE),
    lz: mod(wz, CHUNK_SIZE)
  };
}

export function createWorld(): World {
  const chunks = new Map<string, Chunk>();

  const getChunk = (cx: number, cy: number, cz: number) =>
    chunks.get(chunkKey(cx, cy, cz));

  const ensureChunk = (cx: number, cy: number, cz: number) => {
    const key = chunkKey(cx, cy, cz);
    const existing = chunks.get(key);
    if (existing) return existing;
    const created = createChunk({ cx, cy, cz });
    chunks.set(key, created);
    return created;
  };

  const getVoxel = (wx: number, wy: number, wz: number): BlockIdT => {
    const { cx, cy, cz, lx, ly, lz } = worldToChunk(wx, wy, wz);
    const chunk = getChunk(cx, cy, cz);
    if (!chunk) return BlockId.Air;
    return chunk.getLocal(lx, ly, lz);
  };

  const setVoxel = (wx: number, wy: number, wz: number, id: BlockIdT) => {
    const { cx, cy, cz, lx, ly, lz } = worldToChunk(wx, wy, wz);
    const chunk = ensureChunk(cx, cy, cz);
    chunk.setLocal(lx, ly, lz, id);
  };

  return {
    chunks,
    getChunk,
    ensureChunk,
    getVoxel,
    setVoxel
  };
}

