import { describe, expect, it } from "vitest";
import { initApp } from "../src/sprint-craft/app";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createVoxelDemo, SHOULDER_ORBIT_MAX_YAW } from "../src/sprint-craft/voxels/voxel-demo";
import { createFakeBabylon } from "./fakes/fake-babylon";

type StubInputState = {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  mouseDown: Set<number>;
  mousePressed: Set<number>;
};

function makeInput() {
  const state: StubInputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    mouseDown: new Set(),
    mousePressed: new Set()
  };
  return {
    state,
    api: {
      isKeyDown: (code: string) => state.keysDown.has(code),
      wasKeyPressed: (code: string) => state.keysPressed.has(code),
      wasKeyReleased: (_code: string) => false,
      isMouseDown: (button: number) => state.mouseDown.has(button),
      wasMousePressed: (button: number) => state.mousePressed.has(button),
      wasMouseReleased: (_button: number) => false,
      endFrame: () => {
        state.keysPressed.clear();
        state.mousePressed.clear();
      },
      dispose: () => undefined
    }
  };
}

function setDom(html: string) {
  document.body.innerHTML = html;
  Object.defineProperty(document, "pointerLockElement", {
    value: null,
    writable: true,
    configurable: true
  });
}

function baseHudDom() {
  return `
    <div id="app">
      <canvas id="renderCanvas" tabindex="0"></canvas>
      <div id="hud">
        <div id="brandSplash">Sprint Craft</div>
        <div id="toast"></div>
        <div id="help">help</div>
        <div id="hotbar"></div>
      </div>
    </div>
  `;
}

function normalizeAngle(angle: number) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

describe("Iteration 8: crosshair + highlight (integration)", () => {
  it("creates crosshair and target highlight mesh", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const crosshair = document.getElementById("crosshair");
    expect(crosshair).not.toBeNull();

    const scene = getLastScene();
    expect(scene?.createdMeshes).toContain("target:highlight");

    app.dispose();
  });
});

describe("Iteration 8: preview visibility rules (integration)", () => {
  it("shows highlight and preview when placement is valid", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const world = demo.getWorld();
    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";
    camera.rotation.y = 0;
    camera.rotation.x = 0;

    world.setVoxel(0, 21, 3, BlockId.Stone);

    demo.tick(1 / 60);

    const sceneRef = getLastScene();
    const highlight = sceneRef?.createdMeshObjects.find((m) => m.name === "target:highlight");
    const preview = sceneRef?.createdMeshObjects.find((m) => m.name === "placement:preview");
    expect(highlight?.isVisible).toBe(true);
    expect(preview?.isVisible).toBe(true);
    expect(preview?.position).toMatchObject({ x: 0.5, y: 21.5, z: 2.5 });
    expect((preview as any)?.material?.alpha).toBeLessThan(1);

    demo.dispose();
  });

  it("hides preview when placement would intersect the player", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const world = demo.getWorld();
    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 2.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";
    camera.rotation.y = 0;
    camera.rotation.x = 0;

    world.setVoxel(0, 21, 3, BlockId.Stone);

    demo.tick(1 / 60);

    const sceneRef = getLastScene();
    const preview = sceneRef?.createdMeshObjects.find((m) => m.name === "placement:preview");
    expect(preview?.isVisible).toBe(false);

    demo.dispose();
  });
});

describe("Iteration 8: camera mode toggle + avatar visibility (integration)", () => {
  it("toggles to first-person on KeyV and hides head/arms", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";

    demo.tick(1 / 60);
    const shoulderZ = camera.position.z;

    input.state.keysPressed.add("KeyV");
    demo.tick(1 / 60);
    input.api.endFrame();

    const firstPersonZ = camera.position.z;
    expect(firstPersonZ).toBeGreaterThan(shoulderZ + 1.0);

    const sceneRef = getLastScene();
    const head = sceneRef?.createdMeshObjects.find((m) => m.name === "player:head");
    const torso = sceneRef?.createdMeshObjects.find((m) => m.name === "player:torso");
    const upperArmL = sceneRef?.createdMeshObjects.find((m) => m.name === "player:upperArmL");
    const upperArmR = sceneRef?.createdMeshObjects.find((m) => m.name === "player:upperArmR");
    expect(head?.isVisible).toBe(false);
    expect(torso?.isVisible).toBe(false);
    expect(upperArmL?.isVisible).toBe(false);
    expect(upperArmR?.isVisible).toBe(false);

    input.state.keysPressed.add("KeyV");
    demo.tick(1 / 60);
    input.api.endFrame();
    expect(head?.isVisible).toBe(true);

    demo.dispose();
  });

  it("clamps shoulder orbit behind the avatar while moving", () => {
    const { babylon } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";

    camera.rotation.y = 0;
    demo.tick(1 / 60);

    input.state.keysPressed.add("KeyW");
    input.state.keysDown.add("KeyW");
    demo.tick(1 / 60);
    input.api.endFrame();

    camera.rotation.y = Math.PI;
    demo.tick(1 / 60);

    const delta = Math.abs(normalizeAngle(camera.rotation.y - 0));
    expect(delta).toBeLessThanOrEqual(SHOULDER_ORBIT_MAX_YAW + 1e-4);

    demo.dispose();
  });

  it("keeps the shoulder anchor when moving from a front-facing camera", () => {
    const { babylon } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";

    camera.rotation.y = 0;
    demo.tick(1 / 60);

    camera.rotation.y = Math.PI;
    input.state.keysPressed.add("KeyW");
    input.state.keysDown.add("KeyW");
    demo.tick(1 / 60);
    input.api.endFrame();
    input.state.keysDown.delete("KeyW");

    camera.rotation.y = Math.PI;
    demo.tick(1 / 60);

    const delta = Math.abs(normalizeAngle(camera.rotation.y - 0));
    expect(delta).toBeLessThanOrEqual(SHOULDER_ORBIT_MAX_YAW + 1e-4);

    demo.dispose();
  });

  it("snaps shoulder yaw back to anchor when leaving first-person", () => {
    const { babylon } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);
    const input = makeInput();

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input.api as any,
      getSelectedSlot: () => 1,
      rebuildBudgetPerFrame: 0
    });

    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.stance = "standing";

    camera.rotation.y = 0;
    demo.tick(1 / 60);

    input.state.keysPressed.add("KeyV");
    demo.tick(1 / 60);
    input.api.endFrame();

    camera.rotation.y = Math.PI;

    input.state.keysPressed.add("KeyV");
    demo.tick(1 / 60);
    input.api.endFrame();

    const delta = Math.abs(normalizeAngle(camera.rotation.y - 0));
    expect(delta).toBeLessThanOrEqual(1e-4);

    demo.dispose();
  });
});
