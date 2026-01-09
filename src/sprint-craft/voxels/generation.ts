import { BlockId } from "./blocks";
import { CHUNK_SIZE, type Chunk } from "./chunk";
import type { World } from "./world";

export type GenerationOptions = {
  seed: number;
  /**
   * Radius in chunks (in X/Z). radius=1 => 3x3 chunks.
   */
  radiusChunks: number;
  /**
   * Base terrain height in voxels (within cy=0 chunk).
   */
  baseHeight: number;
  /**
   * Extra height variation amplitude (integer voxels).
   */
  heightVariation: number;
};

export const DEFAULT_GENERATION: GenerationOptions = {
  seed: 1337,
  radiusChunks: 1,
  baseHeight: 5,
  heightVariation: 3
};

function hash2i(x: number, z: number, seed: number): number {
  // Deterministic integer hash -> 0..2^32-1
  // Mix inspired by common bit-mixing patterns; sufficient for simple terrain.
  let h = seed | 0;
  h ^= x * 374761393;
  h = (h << 13) ^ h;
  h ^= z * 668265263;
  h = (h << 15) ^ h;
  // Force to uint32
  return h >>> 0;
}

function heightAt(x: number, z: number, opts: GenerationOptions): number {
  const h = hash2i(x, z, opts.seed);
  const v = h % opts.heightVariation; // 0..heightVariation-1
  return opts.baseHeight + v;
}

export function generateInitialWorld(world: World, options: Partial<GenerationOptions> = {}): {
  options: GenerationOptions;
  generatedChunks: Chunk[];
} {
  const opts: GenerationOptions = { ...DEFAULT_GENERATION, ...options };
  const generatedChunks: Chunk[] = [];

  // For Iteration 2 we generate only a single vertical layer of chunks (cy=0).
  // Heights are kept within [0, CHUNK_SIZE) for now to avoid multi-cy complexity.
  const maxHeight = opts.baseHeight + (opts.heightVariation - 1);
  const clampedMaxHeight = Math.min(maxHeight, CHUNK_SIZE - 1);

  for (let cz = -opts.radiusChunks; cz <= opts.radiusChunks; cz += 1) {
    for (let cx = -opts.radiusChunks; cx <= opts.radiusChunks; cx += 1) {
      const chunk = world.ensureChunk(cx, 0, cz);
      generatedChunks.push(chunk);

      const originX = cx * CHUNK_SIZE;
      const originZ = cz * CHUNK_SIZE;

      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
          const wx = originX + lx;
          const wz = originZ + lz;
          const h = Math.min(heightAt(wx, wz, opts), clampedMaxHeight);

          for (let y = 0; y <= h; y += 1) {
            const isTop = y === h;
            const depth = h - y;
            const id =
              isTop ? BlockId.Grass : depth <= 3 ? BlockId.Dirt : BlockId.Stone;
            chunk.setLocal(lx, y, lz, id);
          }
        }
      }
    }
  }

  return { options: opts, generatedChunks };
}

