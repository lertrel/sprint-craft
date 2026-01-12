import { describe, expect, it } from "vitest";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createPlayerController } from "../src/sprint-craft/voxels/player-controller";

type StubInput = {
  down: Set<string>;
  pressed: Set<string>;
};

function makeInput(): {
  state: StubInput;
  api: {
    isKeyDown: (code: string) => boolean;
    wasKeyPressed: (code: string) => boolean;
    wasKeyReleased: (_code: string) => boolean;
    isMouseDown: (_button: number) => boolean;
    wasMousePressed: (_button: number) => boolean;
    wasMouseReleased: (_button: number) => boolean;
    endFrame: () => void;
    dispose: () => void;
  };
} {
  const state: StubInput = { down: new Set(), pressed: new Set() };
  return {
    state,
    api: {
      isKeyDown: (code) => state.down.has(code),
      wasKeyPressed: (code) => state.pressed.has(code),
      wasKeyReleased: () => false,
      isMouseDown: () => false,
      wasMousePressed: () => false,
      wasMouseReleased: () => false,
      endFrame: () => {
        state.pressed.clear();
      },
      dispose: () => undefined
    }
  };
}

function makeCamera(yaw = 0) {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: yaw, z: 0 }
  };
}

function fillFlatGround(w: ReturnType<typeof createWorld>, options?: { y?: number; radius?: number }) {
  const y = options?.y ?? 0;
  const r = options?.radius ?? 8;
  for (let z = -r; z <= r; z += 1) {
    for (let x = -r; x <= r; x += 1) {
      w.setVoxel(x, y, z, BlockId.Dirt);
    }
  }
}

function stepN(controller: ReturnType<typeof createPlayerController>, input: { endFrame: () => void }, n: number, dt = 1 / 60) {
  for (let i = 0; i < n; i += 1) {
    controller.tick(dt);
    input.endFrame();
  }
}

describe("Iteration 3: player movement controller (unit-ish)", () => {
  it("moves relative to yaw and normalizes diagonal movement", () => {
    const w = createWorld();
    fillFlatGround(w);

    // Forward only at yaw=0
    const cam0 = makeCamera(0);
    const i0 = makeInput();
    i0.state.down.add("KeyW");
    const c0 = createPlayerController({
      input: i0.api as any,
      camera: cam0 as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 3, z: 0.5 })
    });
    const z0Before = c0.state.position.z;
    stepN(c0, i0.api, 60);
    const dz0 = c0.state.position.z - z0Before;
    expect(dz0).toBeGreaterThan(0.5);

    // Forward only at yaw=90deg should move mainly +x
    const cam90 = makeCamera(Math.PI / 2);
    const i90 = makeInput();
    i90.state.down.add("KeyW");
    const c90 = createPlayerController({
      input: i90.api as any,
      camera: cam90 as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 3, z: 0.5 })
    });
    const x90Before = c90.state.position.x;
    stepN(c90, i90.api, 60);
    const dx90 = c90.state.position.x - x90Before;
    expect(dx90).toBeGreaterThan(0.5);

    // Diagonal normalization: W vs W+D should be ~same horizontal speed.
    const camD = makeCamera(0);
    const iw = makeInput();
    iw.state.down.add("KeyW");
    const cw = createPlayerController({
      input: iw.api as any,
      camera: camD as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 3, z: 0.5 })
    });
    const pw0 = { ...cw.state.position };
    stepN(cw, iw.api, 60);
    const walkDist = Math.hypot(cw.state.position.x - pw0.x, cw.state.position.z - pw0.z);

    const camWD = makeCamera(0);
    const iwd = makeInput();
    iwd.state.down.add("KeyW");
    iwd.state.down.add("KeyD");
    const cwd = createPlayerController({
      input: iwd.api as any,
      camera: camWD as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 3, z: 0.5 })
    });
    const pwd0 = { ...cwd.state.position };
    stepN(cwd, iwd.api, 60);
    const diagDist = Math.hypot(
      cwd.state.position.x - pwd0.x,
      cwd.state.position.z - pwd0.z
    );

    expect(Math.abs(diagDist - walkDist)).toBeLessThan(0.15);
  });

  it("applies gravity, lands stably, and only allows jump when grounded", () => {
    const w = createWorld();
    fillFlatGround(w);

    const cam = makeCamera(0);
    const input = makeInput();
    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 10, z: 0.5 })
    });

    // Fall and land.
    stepN(c, input.api, 240);
    expect(c.isGrounded()).toBe(true);
    expect(Math.abs(c.state.position.y - 1)).toBeLessThan(1e-6);

    // Jump while grounded.
    input.state.pressed.add("Space");
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.position.y).toBeGreaterThan(1);

    // While airborne, pressing jump again should not reset upward velocity.
    const vyBefore = c.state.velocity.y;
    input.state.pressed.add("Space");
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.velocity.y).toBeLessThan(vyBefore);
  });

  it("sprint increases displacement; crouch/crawl reduces speed; standing is blocked by low ceiling", () => {
    const w = createWorld();
    fillFlatGround(w);

    // Build a low ceiling at y=2 over the spawn column.
    // With feet at y=1, standing height 1.8 intersects; crawling height 1.0 fits (touches).
    for (let z = 0; z <= 1; z += 1) {
      for (let x = 0; x <= 1; x += 1) {
        w.setVoxel(x, 2, z, BlockId.Stone);
      }
    }

    // Walk vs sprint displacement (open area)
    const camWalk = makeCamera(0);
    const iWalk = makeInput();
    iWalk.state.down.add("KeyW");
    const walk = createPlayerController({
      input: iWalk.api as any,
      camera: camWalk as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 5.5, y: 3, z: 5.5 })
    });
    const zWalk0 = walk.state.position.z;
    stepN(walk, iWalk.api, 60);
    const dzWalk = walk.state.position.z - zWalk0;

    const camSprint = makeCamera(0);
    const iSprint = makeInput();
    iSprint.state.down.add("KeyW");
    iSprint.state.down.add("ShiftLeft");
    const sprint = createPlayerController({
      input: iSprint.api as any,
      camera: camSprint as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 5.5, y: 3, z: 5.5 })
    });
    const zSprint0 = sprint.state.position.z;
    stepN(sprint, iSprint.api, 60);
    const dzSprint = sprint.state.position.z - zSprint0;
    expect(dzSprint).toBeGreaterThan(dzWalk);

    // Ctrl held reduces speed and reduces stance.
    const camCrouch = makeCamera(0);
    const iCrouch = makeInput();
    iCrouch.state.down.add("KeyW");
    iCrouch.state.down.add("ControlLeft");
    const crouch = createPlayerController({
      input: iCrouch.api as any,
      camera: camCrouch as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 5.5, y: 3, z: 5.5 })
    });
    const zC0 = crouch.state.position.z;
    stepN(crouch, iCrouch.api, 60);
    const dzCrouch = crouch.state.position.z - zC0;
    expect(dzCrouch).toBeLessThan(dzWalk);
    expect(crouch.state.stance).not.toBe("standing");

    // Under low ceiling: releasing Ctrl should not allow standing up.
    const camCeil = makeCamera(0);
    const iCeil = makeInput();
    iCeil.state.down.add("ControlLeft");
    const underCeil = createPlayerController({
      input: iCeil.api as any,
      camera: camCeil as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 1, z: 0.5 })
    });
    underCeil.tick(1 / 60);
    iCeil.api.endFrame();
    expect(underCeil.state.stance).toBe("crawling");

    // Release Ctrl; should stay reduced because standing would intersect ceiling.
    iCeil.state.down.delete("ControlLeft");
    underCeil.tick(1 / 60);
    iCeil.api.endFrame();
    expect(underCeil.state.stance).toBe("crawling");
  });
});

