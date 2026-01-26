import { describe, expect, it } from "vitest";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { canPlaceBlock } from "../src/sprint-craft/voxels/block-interaction";
import { createTargeting, getPlacementTarget } from "../src/sprint-craft/voxels/targeting";
import { CAMERA_TOGGLE_KEY, createCameraMode } from "../src/sprint-craft/voxels/camera-mode";

describe("Iteration 8: targeting + placement rules (unit)", () => {
  it("computes placement target from hit face", () => {
    const hit = { wx: 2, wy: 3, wz: 4, face: { x: 0, y: 1, z: 0 }, distance: 1 };
    expect(getPlacementTarget(hit as any)).toEqual({ x: 2, y: 4, z: 4 });
    expect(getPlacementTarget(null)).toBeNull();
  });

  it("returns hit + placement for a valid raycast", () => {
    const world = createWorld();
    world.setVoxel(0, 1, 2, BlockId.Stone);
    const camera = {
      position: { x: 0.5, y: 1.5, z: 0.5 },
      rotation: { x: 0, y: 0, z: 0 }
    };
    const targeting = createTargeting({ camera: camera as any, world, maxDistance: 6 });
    const result = targeting.update();
    expect(result.hit).not.toBeNull();
    expect(result.hit).toMatchObject({ wx: 0, wy: 1, wz: 2 });
    expect(result.placement).toEqual({ x: 0, y: 1, z: 1 });
  });

  it("rejects placement when occupied or intersecting the player", () => {
    const world = createWorld();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    const target = { x: 0, y: 1, z: 1 };
    world.setVoxel(target.x, target.y, target.z, BlockId.Stone);
    expect(canPlaceBlock({ world, player, target })).toBe(false);

    world.setVoxel(target.x, target.y, target.z, BlockId.Air);
    expect(canPlaceBlock({ world, player, target })).toBe(true);

    player.position = { x: 0.5, y: 1, z: 1.5 };
    expect(canPlaceBlock({ world, player, target })).toBe(false);
  });
});

describe("Iteration 8: camera mode toggle (unit)", () => {
  it("toggles mode on KeyV and keeps mode otherwise", () => {
    const mode = createCameraMode();
    expect(mode.getMode()).toBe("shoulder");

    mode.toggleIfPressed((code) => code === CAMERA_TOGGLE_KEY);
    expect(mode.getMode()).toBe("firstPerson");

    mode.toggleIfPressed(() => false);
    expect(mode.getMode()).toBe("firstPerson");

    mode.toggleIfPressed((code) => code === CAMERA_TOGGLE_KEY);
    expect(mode.getMode()).toBe("shoulder");
  });
});
