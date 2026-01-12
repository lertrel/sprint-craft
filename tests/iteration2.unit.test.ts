import { describe, expect, it } from "vitest";
import { BlockId, getBlockDef } from "../src/sprint-craft/voxels/blocks";
import { CHUNK_SIZE, createChunk } from "../src/sprint-craft/voxels/chunk";
import { createWorld, worldToChunk } from "../src/sprint-craft/voxels/world";
import { meshChunk } from "../src/sprint-craft/voxels/meshing/mesher";
import { generateInitialWorld } from "../src/sprint-craft/voxels/generation";
import { createChunkRebuildScheduler } from "../src/sprint-craft/voxels/rebuild-scheduler";

describe("Iteration 2: blocks (unit)", () => {
  it("returns defs for known ids and maps unknown to air deterministically", () => {
    const grass = getBlockDef(BlockId.Grass);
    expect(grass.id).toBe(BlockId.Grass);
    expect(grass.name).toBe("grass");
    expect(grass.color).toHaveLength(3);
    expect(grass.isRenderable).toBe(true);
    expect(grass.isSolid).toBe(true);

    const air = getBlockDef(BlockId.Air);
    expect(air.isRenderable).toBe(false);
    expect(air.isSolid).toBe(false);

    const unknown = getBlockDef(9999);
    expect(unknown.id).toBe(BlockId.Air);
    expect(unknown.name).toBe("air");
  });
});

describe("Iteration 2: chunk storage (unit)", () => {
  it("round-trips set/get at edges and ignores out-of-bounds deterministically", () => {
    const c = createChunk({ cx: 0, cy: 0, cz: 0 });
    c.setLocal(0, 0, 0, BlockId.Dirt);
    c.setLocal(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1, BlockId.Stone);

    expect(c.getLocal(0, 0, 0)).toBe(BlockId.Dirt);
    expect(c.getLocal(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toBe(
      BlockId.Stone
    );

    // OOB reads are air; OOB writes are ignored.
    expect(c.getLocal(-1, 0, 0)).toBe(BlockId.Air);
    expect(c.getLocal(0, 999, 0)).toBe(BlockId.Air);
    c.setLocal(-1, 0, 0, BlockId.Grass);
    expect(c.getLocal(0, 0, 0)).toBe(BlockId.Dirt);
  });
});

describe("Iteration 2: world voxel mapping (unit)", () => {
  it("maps boundaries and negative coordinates deterministically", () => {
    // Boundary: 15 is chunk 0, 16 is chunk 1
    expect(worldToChunk(15, 0, 0)).toMatchObject({ cx: 0, lx: 15 });
    expect(worldToChunk(16, 0, 0)).toMatchObject({ cx: 1, lx: 0 });

    // Negative: -1 maps to chunk -1 local 15
    expect(worldToChunk(-1, 0, 0)).toMatchObject({ cx: -1, lx: 15 });
    expect(worldToChunk(0, -1, 0)).toMatchObject({ cy: -1, ly: 15 });
  });

  it("set/get works across chunk boundaries", () => {
    const w = createWorld();
    w.setVoxel(15, 0, 0, BlockId.Dirt);
    w.setVoxel(16, 0, 0, BlockId.Stone);
    w.setVoxel(-1, 0, 0, BlockId.Grass);

    expect(w.getVoxel(15, 0, 0)).toBe(BlockId.Dirt);
    expect(w.getVoxel(16, 0, 0)).toBe(BlockId.Stone);
    expect(w.getVoxel(-1, 0, 0)).toBe(BlockId.Grass);
  });
});

describe("Iteration 2: chunk meshing (unit)", () => {
  it("one solid block emits 6 faces (12 triangles)", () => {
    const w = createWorld();
    const c = w.ensureChunk(0, 0, 0);
    c.setLocal(0, 0, 0, BlockId.Dirt);

    const m = meshChunk({
      chunk: c,
      origin: { x: 0, y: 0, z: 0 },
      getVoxel: w.getVoxel
    });

    expect(m.faces).toBe(6);
    expect(m.indices).toHaveLength(12 * 3);
  });

  it("two adjacent blocks cull internal face (10 faces total)", () => {
    const w = createWorld();
    const c = w.ensureChunk(0, 0, 0);
    c.setLocal(0, 0, 0, BlockId.Dirt);
    c.setLocal(1, 0, 0, BlockId.Dirt);

    const m = meshChunk({
      chunk: c,
      origin: { x: 0, y: 0, z: 0 },
      getVoxel: w.getVoxel
    });

    expect(m.faces).toBe(10);
    expect(m.indices).toHaveLength(10 * 2 * 3);
  });

  it("a filled 2x2x2 cube emits only outer faces (24 faces total)", () => {
    const w = createWorld();
    const c = w.ensureChunk(0, 0, 0);
    for (let z = 0; z < 2; z += 1) {
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 2; x += 1) {
          c.setLocal(x, y, z, BlockId.Stone);
        }
      }
    }

    const m = meshChunk({
      chunk: c,
      origin: { x: 0, y: 0, z: 0 },
      getVoxel: w.getVoxel
    });

    expect(m.faces).toBe(24);
    expect(m.indices).toHaveLength(24 * 2 * 3);
  });

  it("culls faces across chunk boundaries via world voxel lookup", () => {
    const w = createWorld();
    const a = w.ensureChunk(0, 0, 0);
    const b = w.ensureChunk(1, 0, 0);

    // Touching across boundary: a at local x=15, b at local x=0
    a.setLocal(CHUNK_SIZE - 1, 0, 0, BlockId.Dirt);
    b.setLocal(0, 0, 0, BlockId.Dirt);

    const ma = meshChunk({
      chunk: a,
      origin: { x: 0, y: 0, z: 0 },
      getVoxel: w.getVoxel
    });

    // One cube would be 6 faces; the shared face should be culled => 5.
    expect(ma.faces).toBe(5);
  });

  it("encodes per-vertex colors and produces multiple distinct colors for mixed blocks", () => {
    const w = createWorld();
    const c = w.ensureChunk(0, 0, 0);
    c.setLocal(0, 0, 0, BlockId.Grass);
    c.setLocal(2, 0, 0, BlockId.Stone);

    const m = meshChunk({
      chunk: c,
      origin: { x: 0, y: 0, z: 0 },
      getVoxel: w.getVoxel
    });

    // colors are [r,g,b,a] per vertex
    expect(m.colors.length).toBeGreaterThan(0);
    const unique = new Set<string>();
    for (let i = 0; i < m.colors.length; i += 4) {
      unique.add(`${m.colors[i]!.toFixed(2)},${m.colors[i + 1]!.toFixed(2)},${m.colors[i + 2]!.toFixed(2)}`);
    }
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});

describe("Iteration 2: world generation (unit)", () => {
  it("is deterministic for a fixed seed and generates multiple chunks", () => {
    const w1 = createWorld();
    const w2 = createWorld();

    const g1 = generateInitialWorld(w1, { seed: 42, radiusChunks: 1 });
    const g2 = generateInitialWorld(w2, { seed: 42, radiusChunks: 1 });

    expect(g1.generatedChunks.length).toBe(9);
    expect(g2.generatedChunks.length).toBe(9);

    const samples: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, 0, 1],
      [10, 0, -3],
      [-5, 0, 7]
    ];

    for (const [x, y, z] of samples) {
      expect(w1.getVoxel(x, y, z)).toBe(w2.getVoxel(x, y, z));
    }
  });

  it("creates solid ground columns (no holes) in the playable region", () => {
    const w = createWorld();
    generateInitialWorld(w, { seed: 7, radiusChunks: 1 });

    // Sample a handful of columns across the generated region.
    const samples: Array<[number, number]> = [
      [0, 0],
      [5, 5],
      [-5, -5],
      [15, 2],
      [-12, 9]
    ];

    for (const [x, z] of samples) {
      // Find first air above ground by scanning upward.
      let topSolidY = -1;
      for (let y = 0; y < CHUNK_SIZE; y += 1) {
        if (w.getVoxel(x, y, z) !== BlockId.Air) topSolidY = y;
      }
      expect(topSolidY).toBeGreaterThanOrEqual(0);
      for (let y = 0; y <= topSolidY; y += 1) {
        expect(w.getVoxel(x, y, z)).not.toBe(BlockId.Air);
      }
    }
  });
});

describe("Iteration 2: chunk rebuild scheduling (unit)", () => {
  it("deduplicates dirty marks and respects step budget", () => {
    const s = createChunkRebuildScheduler();
    const rebuilt: string[] = [];
    const rebuild = (id: { cx: number; cy: number; cz: number }) => {
      rebuilt.push(`${id.cx},${id.cy},${id.cz}`);
    };

    s.markDirty(0, 0, 0);
    s.markDirty(0, 0, 0);
    s.markDirty(1, 0, 0);
    expect(s.getQueuedCount()).toBe(2);

    const n1 = s.step(1, rebuild);
    expect(n1).toBe(1);
    expect(rebuilt).toHaveLength(1);
    expect(s.hasPending()).toBe(true);

    const n2 = s.step(10, rebuild);
    expect(n2).toBe(1);
    expect(rebuilt).toHaveLength(2);
    expect(s.hasPending()).toBe(false);
  });

  it("marks neighbor chunks dirty when a world voxel is on a chunk boundary", () => {
    const s = createChunkRebuildScheduler();
    const rebuilt: string[] = [];
    const rebuild = (id: { cx: number; cy: number; cz: number }) => {
      rebuilt.push(`${id.cx},${id.cy},${id.cz}`);
    };

    // wx=0 is lx=0 boundary => should mark cx=0 and cx=-1.
    s.markDirtyForWorldVoxel(0, 0, 0);
    s.step(10, rebuild);

    expect(new Set(rebuilt)).toEqual(new Set(["0,0,0", "-1,0,0", "0,-1,0", "0,0,-1"]));
  });
});

