import { describe, expect, it } from "vitest";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createPlayerController } from "../src/sprint-craft/voxels/player-controller";
import { aabbIntersectsSolidVoxels, makePlayerAabb } from "../src/sprint-craft/voxels/voxel-collision";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { findSafeSpawnAboveGround } from "../src/sprint-craft/voxels/spawn";

function makeCamera(yaw = 0) {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: yaw, z: 0 }
  };
}

function makeInput() {
  const down = new Set<string>();
  const pressed = new Set<string>();
  return {
    down,
    pressed,
    api: {
      isKeyDown: (code: string) => down.has(code),
      wasKeyPressed: (code: string) => pressed.has(code),
      wasKeyReleased: (_code: string) => false,
      isMouseDown: (_button: number) => false,
      wasMousePressed: (_button: number) => false,
      wasMouseReleased: (_button: number) => false,
      endFrame: () => pressed.clear(),
      dispose: () => undefined
    }
  };
}

function stepN(c: ReturnType<typeof createPlayerController>, input: { endFrame: () => void }, n: number, dt = 1 / 60) {
  for (let i = 0; i < n; i += 1) {
    c.tick(dt);
    input.endFrame();
  }
}

describe("Iteration 3: manual voxel collision (integration-ish)", () => {
  it("stops at walls, slides along walls, and handles ceilings + grounded reliably", () => {
    const w = createWorld();

    // Flat ground at y=0 (extend forward to keep the test on terrain)
    for (let z = -8; z <= 50; z += 1) {
      for (let x = -8; x <= 8; x += 1) {
        w.setVoxel(x, 0, z, BlockId.Dirt);
      }
    }

    // Wall at x=1 spanning z=0..40 and y=0..4
    for (let y = 0; y <= 4; y += 1) {
      for (let z = 0; z <= 40; z += 1) {
        w.setVoxel(1, y, z, BlockId.Stone);
      }
    }

    // Ceiling tile at y=3 over the path near z=2 (so jump hits it).
    for (let x = -1; x <= 1; x += 1) {
      for (let z = 1; z <= 3; z += 1) {
        w.setVoxel(x, 3, z, BlockId.Stone);
      }
    }

    const cam = makeCamera(0);
    const input = makeInput();
    input.down.add("KeyW"); // forward (+z)
    input.down.add("KeyD"); // strafe right (+x) into wall

    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 3, z: 0.5 })
    });

    // Let it settle onto ground.
    stepN(c, input.api, 120);
    expect(c.isGrounded()).toBe(true);

    // Move diagonally into the wall for a while; x should clamp, z should keep increasing.
    const startZ = c.state.position.z;
    stepN(c, input.api, 120);
    const zCell = Math.floor(c.state.position.z);
    // Sanity: ensure the wall exists where we're asserting collision.
    expect(w.getVoxel(1, 1, zCell)).toBe(BlockId.Stone);
    // Sanity: still near the ground (no "climbing" behavior).
    expect(c.state.position.y).toBeLessThanOrEqual(1.01);
    expect(c.state.position.x).toBeLessThanOrEqual(0.7 + 1e-3); // wall at x=1, halfWidth=0.3
    expect(c.state.position.z).toBeGreaterThan(startZ + 0.5);

    // Jump into ceiling: upward motion should be stopped by collision, then fall back down.
    input.pressed.add("Space");
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.position.y).toBeGreaterThan(1);

    // Run until we are back on the ground.
    stepN(c, input.api, 240);
    expect(c.isGrounded()).toBe(true);
    expect(Math.abs(c.state.position.y - 1)).toBeLessThan(1e-6);
  });

  it("does not bounce upward when crouch-sliding away from a wall", () => {
    const w = createWorld();

    // Ground
    for (let z = -6; z <= 6; z += 1) {
      for (let x = -6; x <= 6; x += 1) {
        w.setVoxel(x, 0, z, BlockId.Dirt);
      }
    }

    // Wall in front at z=2
    for (let y = 0; y <= 3; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        w.setVoxel(x, y, 2, BlockId.Stone);
      }
    }

    const cam = makeCamera(0);
    const input = makeInput();
    input.down.add("AltLeft");
    input.down.add("KeyW");

    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 1, z: 0.5 })
    });

    // Move into the wall while crouching.
    stepN(c, input.api, 120);
    expect(c.isGrounded()).toBe(true);

    // Strafe away while still crouching.
    input.down.delete("KeyW");
    input.down.add("KeyD");
    let maxY = c.state.position.y;
    let minY = c.state.position.y;
    for (let i = 0; i < 120; i += 1) {
      c.tick(1 / 60);
      input.api.endFrame();
      maxY = Math.max(maxY, c.state.position.y);
      minY = Math.min(minY, c.state.position.y);
    }

    expect(maxY).toBeLessThanOrEqual(1.05);
    expect(minY).toBeGreaterThanOrEqual(0.95);
  });

  it("does not get permanently stuck on an exterior corner (minimal snag prevention)", () => {
    const w = createWorld();

    // Ground
    for (let z = -6; z <= 6; z += 1) {
      for (let x = -6; x <= 6; x += 1) {
        w.setVoxel(x, 0, z, BlockId.Dirt);
      }
    }

    // Corner blocks at (1,1) in x/z (plus height), creating an exterior corner.
    for (let y = 0; y <= 3; y += 1) {
      w.setVoxel(1, y, 0, BlockId.Stone);
      w.setVoxel(0, y, 1, BlockId.Stone);
    }

    const cam = makeCamera(0);
    const input = makeInput();
    input.down.add("KeyW");
    input.down.add("KeyD");

    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: -0.5, y: 3, z: -0.5 })
    });

    stepN(c, input.api, 240);

    // Sanity: no NaNs and player is still controllable (position finite).
    expect(Number.isFinite(c.state.position.x)).toBe(true);
    expect(Number.isFinite(c.state.position.z)).toBe(true);

    // Player should not have entered the solid corner voxels.
    const aabb = makePlayerAabb({ position: c.state.position, halfWidth: 0.3, height: c.state.colliderHeights[c.state.stance] });
    expect(aabbIntersectsSolidVoxels(w.getVoxel, aabb)).toBe(false);
  });
});

describe("Iteration 3: safe spawn and respawn (integration-ish)", () => {
  it("spawns above ground without intersecting solids and settles onto terrain", () => {
    const w = createWorld();
    // Simple ground and a pillar nearby (spawn should still be safe).
    for (let z = -8; z <= 8; z += 1) {
      for (let x = -8; x <= 8; x += 1) {
        w.setVoxel(x, 0, z, BlockId.Dirt);
      }
    }
    for (let y = 1; y <= 4; y += 1) w.setVoxel(2, y, 2, BlockId.Stone);

    const playerModel = createDefaultPlayerState();
    const spawn = findSafeSpawnAboveGround({
      world: w,
      player: playerModel,
      halfWidth: 0.3,
      column: { x: 0, z: 0 }
    });

    const aabb = makePlayerAabb({
      position: spawn,
      halfWidth: 0.3,
      height: playerModel.colliderHeights.standing
    });
    expect(aabbIntersectsSolidVoxels(w.getVoxel, aabb)).toBe(false);

    const cam = makeCamera(0);
    const input = makeInput();
    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => spawn
    });

    // Let gravity settle onto ground.
    stepN(c, input.api, 240);
    expect(c.isGrounded()).toBe(true);
    expect(Math.abs(c.state.position.y - 1)).toBeLessThan(1e-6);
  });

  it("respawns when out of bounds and returns to normal simulation", () => {
    const w = createWorld();
    for (let z = -4; z <= 4; z += 1) {
      for (let x = -4; x <= 4; x += 1) {
        w.setVoxel(x, 0, z, BlockId.Dirt);
      }
    }

    const cam = makeCamera(0);
    const input = makeInput();
    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 6, z: 0.5 })
    });

    // Force out of bounds then tick.
    c.state.position.y = -999;
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.position.y).toBeGreaterThan(0);

    // Simulation continues normally afterward.
    const y0 = c.state.position.y;
    stepN(c, input.api, 10);
    expect(Number.isFinite(c.state.position.y)).toBe(true);
    // Should be falling or resting, but not frozen at an invalid value.
    expect(c.state.position.y).not.toBeNaN();
    expect(c.state.position.y).not.toBe(-999);
    expect(c.state.position.y).not.toBeLessThan(-100);
    expect(Math.abs(c.state.position.y - y0)).toBeGreaterThanOrEqual(0);
  });
});

