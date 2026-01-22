import { describe, expect, it } from "vitest";
import { BlockId, getHotbarBlockId } from "../src/sprint-craft/voxels/blocks";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { createChunkRebuildScheduler } from "../src/sprint-craft/voxels/rebuild-scheduler";
import { createBlockInteractor } from "../src/sprint-craft/voxels/block-interaction";
import { createDefaultPlayerState } from "../src/sprint-craft/voxels/player-state";
import { raycastVoxels } from "../src/sprint-craft/voxels/raycast";
import { CHUNK_SIZE } from "../src/sprint-craft/voxels/chunk";

type StubInput = {
  down: Set<number>;
  pressed: Set<number>;
};

function makeInput(): {
  state: StubInput;
  api: {
    isKeyDown: (_code: string) => boolean;
    wasKeyPressed: (_code: string) => boolean;
    wasKeyReleased: (_code: string) => boolean;
    isMouseDown: (button: number) => boolean;
    wasMousePressed: (button: number) => boolean;
    wasMouseReleased: (_button: number) => boolean;
    endFrame: () => void;
    dispose: () => void;
  };
} {
  const state: StubInput = {
    down: new Set(),
    pressed: new Set()
  };
  return {
    state,
    api: {
      isKeyDown: () => false,
      wasKeyPressed: () => false,
      wasKeyReleased: () => false,
      isMouseDown: (button) => state.down.has(button),
      wasMousePressed: (button) => state.pressed.has(button),
      wasMouseReleased: () => false,
      endFrame: () => {
        state.pressed.clear();
      },
      dispose: () => undefined
    }
  };
}

function makeCamera(position: { x: number; y: number; z: number }, yaw = 0, pitch = 0) {
  return {
    position: { ...position },
    rotation: { x: pitch, y: yaw, z: 0 }
  };
}

function step(interactor: { tick: (dt: number) => void }, input: { endFrame: () => void }, dt = 1 / 60) {
  interactor.tick(dt);
  input.endFrame();
}

describe("Iteration 4: block interaction system (integration-ish)", () => {
  it("raycast hits a solid block and returns the expected face normal", () => {
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

  it("raycast returns null when no solid is in range", () => {
    const w = createWorld();
    const hit = raycastVoxels({
      origin: { x: 0.5, y: 1.5, z: 0.5 },
      direction: { x: 0, y: 0, z: 1 },
      maxDistance: 6,
      getVoxel: w.getVoxel
    });

    expect(hit).toBeNull();
  });

  it("left-click breaks the targeted block and marks its chunk dirty", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 1
    });

    input.state.pressed.add(0);
    input.state.down.add(0);
    step(interactor, input.api);

    expect(w.getVoxel(0, 1, 2)).toBe(BlockId.Air);

    const rebuilt: string[] = [];
    scheduler.step(10, (id) => rebuilt.push(`${id.cx},${id.cy},${id.cz}`));
    expect(rebuilt).toContain("0,0,0");
  });

  it("right-click places a block adjacent to the hit face when empty", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    let selectedSlot = 2;
    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => selectedSlot
    });

    input.state.pressed.add(2);
    input.state.down.add(2);
    step(interactor, input.api);

    expect(w.getVoxel(0, 1, 1)).toBe(getHotbarBlockId(selectedSlot));
  });

  it("prevents placement when the target cell intersects the player AABB", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 1.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 1
    });

    input.state.pressed.add(2);
    input.state.down.add(2);
    step(interactor, input.api);

    expect(w.getVoxel(0, 1, 1)).toBe(BlockId.Air);
  });

  it("marks neighbor chunks dirty when edits are on a chunk boundary", () => {
    const w = createWorld();
    w.setVoxel(CHUNK_SIZE - 1, 1, 2, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: CHUNK_SIZE - 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: CHUNK_SIZE - 0.5, y: 1, z: 0.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 1
    });

    input.state.pressed.add(0);
    input.state.down.add(0);
    step(interactor, input.api);

    const rebuilt: string[] = [];
    scheduler.step(10, (id) => rebuilt.push(`${id.cx},${id.cy},${id.cz}`));
    const unique = new Set(rebuilt);
    expect(unique).toEqual(new Set(["0,0,0", "1,0,0"]));
  });

  it("changing hotbar selection changes placed block ids", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    w.setVoxel(2, 1, 2, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    let selectedSlot = 1;
    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => selectedSlot,
      cooldownSec: 0
    });

    input.state.pressed.add(2);
    input.state.down.add(2);
    step(interactor, input.api);

    selectedSlot = 3;
    cam.position.x = 2.5;
    input.state.down.delete(2);
    input.state.pressed.add(2);
    input.state.down.add(2);
    step(interactor, input.api);

    expect(w.getVoxel(0, 1, 1)).toBe(getHotbarBlockId(1));
    expect(w.getVoxel(2, 1, 1)).toBe(getHotbarBlockId(3));
  });

  it("respects cooldown: two rapid inputs only apply the first edit", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    w.setVoxel(0, 1, 3, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 1,
      cooldownSec: 0.5
    });

    input.state.pressed.add(0);
    input.state.down.add(0);
    step(interactor, input.api, 0.1);

    input.state.pressed.add(0);
    input.state.down.add(0);
    step(interactor, input.api, 0.1);

    expect(w.getVoxel(0, 1, 2)).toBe(BlockId.Air);
    expect(w.getVoxel(0, 1, 3)).toBe(BlockId.Stone);
  });

  it("applies cooldown across alternating break/place inputs", () => {
    const w = createWorld();
    w.setVoxel(0, 1, 2, BlockId.Stone);
    w.setVoxel(0, 1, 4, BlockId.Stone);
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 2,
      cooldownSec: 0.5
    });

    input.state.pressed.add(0);
    input.state.down.add(0);
    step(interactor, input.api, 0.1);

    input.state.down.delete(0);
    input.state.pressed.add(2);
    input.state.down.add(2);
    step(interactor, input.api, 0.1);

    expect(w.getVoxel(0, 1, 3)).toBe(BlockId.Air);
  });

  it("limits sustained input to the configured interaction rate", () => {
    const w = createWorld();
    for (let z = 2; z <= 6; z += 1) {
      w.setVoxel(0, 1, z, BlockId.Stone);
    }
    const scheduler = createChunkRebuildScheduler();
    const cam = makeCamera({ x: 0.5, y: 1.6, z: 0.5 });
    const input = makeInput();
    const player = createDefaultPlayerState();
    player.position = { x: 0.5, y: 1, z: 0.5 };

    const interactor = createBlockInteractor({
      input: input.api as any,
      camera: cam as any,
      world: w,
      scheduler,
      player,
      getSelectedSlot: () => 1,
      cooldownSec: 0.2
    });

    input.state.down.add(0);
    for (let i = 0; i < 10; i += 1) {
      step(interactor, input.api, 0.05);
    }

    let remaining = 0;
    for (let z = 2; z <= 6; z += 1) {
      if (w.getVoxel(0, 1, z) !== BlockId.Air) remaining += 1;
    }
    const removed = 5 - remaining;
    expect(removed).toBeLessThanOrEqual(3);
  });
});
