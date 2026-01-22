import { describe, expect, it } from "vitest";
import { BlockId, getBlockDef, getHotbarBlockId, getHotbarBlockIds } from "../src/sprint-craft/voxels/blocks";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { raycastVoxels } from "../src/sprint-craft/voxels/raycast";

describe("Iteration 4: voxel raycast (unit)", () => {
  it("hits the expected cell and face for a straight axis ray", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 3, BlockId.Stone);

    const hit = raycastVoxels({
      origin: { x: 0.5, y: 1.5, z: 0.5 },
      direction: { x: 0, y: 0, z: 1 },
      maxDistance: 6,
      getVoxel: w.getVoxel
    });

    expect(hit).not.toBeNull();
    expect(hit).toMatchObject({
      wx: 0,
      wy: 1,
      wz: 3,
      face: { x: 0, y: 0, z: -1 }
    });
  });

  it("returns null when there is no solid hit within range", () => {
    const w = createWorld();
    const hit = raycastVoxels({
      origin: { x: 0.5, y: 1.5, z: 0.5 },
      direction: { x: 0, y: 0, z: 1 },
      maxDistance: 6,
      getVoxel: w.getVoxel
    });

    expect(hit).toBeNull();
  });
});

describe("Iteration 4: hotbar block registry (unit)", () => {
  it("provides at least five distinct, renderable block types", () => {
    const ids = getHotbarBlockIds();
    const unique = new Set(ids);
    expect(unique.size).toBeGreaterThanOrEqual(5);

    for (const id of unique) {
      const def = getBlockDef(id);
      expect(def.isRenderable).toBe(true);
      expect(def.isSolid).toBe(true);
      expect(def.id).not.toBe(BlockId.Air);
    }
  });

  it("maps hotbar slots to block ids deterministically", () => {
    const slot1 = getHotbarBlockId(1);
    const slot2 = getHotbarBlockId(2);
    const slot9 = getHotbarBlockId(9);

    expect(slot1).not.toBe(BlockId.Air);
    expect(slot2).not.toBe(BlockId.Air);
    expect(slot9).not.toBe(BlockId.Air);
    expect(getHotbarBlockId(0)).toBe(slot1);
    expect(getHotbarBlockId(10)).toBe(slot1);
  });
});
