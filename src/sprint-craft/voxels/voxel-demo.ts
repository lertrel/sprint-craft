import type { BabylonApi, SceneLike } from "../app";
import { generateInitialWorld, DEFAULT_GENERATION } from "./generation";
import { createChunkRebuildScheduler } from "./rebuild-scheduler";
import { createChunkRenderer } from "./chunk-renderer";
import { createWorld } from "./world";

export type VoxelDemo = {
  tick: () => void;
  dispose: () => void;
  getChunkCount: () => number;
  getChunkMeshCount: () => number;
  getRebuildCount: () => number;
};

export function createVoxelDemo(options: {
  babylon: BabylonApi;
  scene: SceneLike;
  rebuildBudgetPerFrame?: number;
}): VoxelDemo {
  const { babylon, scene, rebuildBudgetPerFrame = 2 } = options;

  const world = createWorld();
  const scheduler = createChunkRebuildScheduler();
  const renderer = createChunkRenderer({ babylon, scene, world });

  const { generatedChunks } = generateInitialWorld(world, DEFAULT_GENERATION);

  // Initial build: mark generated chunks dirty and rebuild them.
  for (const c of generatedChunks) scheduler.markDirty(c.cx, c.cy, c.cz);

  let rebuildCount = 0;
  const rebuildOne = (id: { cx: number; cy: number; cz: number }) => {
    const chunk = world.getChunk(id.cx, id.cy, id.cz);
    if (!chunk) return;
    renderer.upsertChunkMesh(chunk);
    rebuildCount += 1;
  };

  // Build everything immediately once so the world is visible at boot.
  scheduler.step(Number.POSITIVE_INFINITY, rebuildOne);

  const tick = () => {
    scheduler.step(rebuildBudgetPerFrame, rebuildOne);
  };

  return {
    tick,
    dispose: () => {
      renderer.dispose();
    },
    getChunkCount: () => world.chunks.size,
    getChunkMeshCount: () => renderer.getMeshCount(),
    getRebuildCount: () => rebuildCount
  };
}

