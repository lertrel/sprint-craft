import { CHUNK_SIZE, chunkKey } from "./chunk";
import { worldToChunk } from "./world";

export type ChunkId = { cx: number; cy: number; cz: number };

export type ChunkRebuildScheduler = {
  markDirty: (cx: number, cy: number, cz: number) => void;
  markDirtyForWorldVoxel: (wx: number, wy: number, wz: number) => void;
  hasPending: () => boolean;
  step: (maxChunks: number, rebuild: (id: ChunkId) => void) => number;
  getQueuedCount: () => number;
};

export function createChunkRebuildScheduler(): ChunkRebuildScheduler {
  const dirtySet = new Set<string>();
  const queue: ChunkId[] = [];

  const markDirty = (cx: number, cy: number, cz: number) => {
    const key = chunkKey(cx, cy, cz);
    if (dirtySet.has(key)) return;
    dirtySet.add(key);
    queue.push({ cx, cy, cz });
  };

  const markDirtyForWorldVoxel = (wx: number, wy: number, wz: number) => {
    const { cx, cy, cz, lx, ly, lz } = worldToChunk(wx, wy, wz);
    markDirty(cx, cy, cz);

    // If the voxel is on a chunk boundary, neighbor chunk mesh must also be updated.
    if (lx === 0) markDirty(cx - 1, cy, cz);
    if (lx === CHUNK_SIZE - 1) markDirty(cx + 1, cy, cz);
    if (lz === 0) markDirty(cx, cy, cz - 1);
    if (lz === CHUNK_SIZE - 1) markDirty(cx, cy, cz + 1);

    // Y neighbors (optional for vertical chunking). Safe to include for completeness.
    if (ly === 0) markDirty(cx, cy - 1, cz);
    if (ly === CHUNK_SIZE - 1) markDirty(cx, cy + 1, cz);
  };

  const hasPending = () => queue.length > 0;

  const step = (maxChunks: number, rebuild: (id: ChunkId) => void): number => {
    const budget = Math.max(0, Math.floor(maxChunks));
    let processed = 0;
    while (processed < budget && queue.length > 0) {
      const next = queue.shift()!;
      const key = chunkKey(next.cx, next.cy, next.cz);
      // If it was already rebuilt and cleared, skip.
      if (!dirtySet.has(key)) continue;
      rebuild(next);
      dirtySet.delete(key);
      processed += 1;
    }
    return processed;
  };

  return {
    markDirty,
    markDirtyForWorldVoxel,
    hasPending,
    step,
    getQueuedCount: () => queue.length
  };
}

