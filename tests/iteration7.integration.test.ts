import { describe, expect, it } from "vitest";
import { initApp } from "../src/sprint-craft/app";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createVoxelDemo } from "../src/sprint-craft/voxels/voxel-demo";
import { createFakeBabylon } from "./fakes/fake-babylon";

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
        <div id="crosshair"></div>
        <div id="brandSplash">Sprint Craft</div>
        <div id="toast"></div>
        <div id="help">help</div>
        <div id="hotbar"></div>
      </div>
    </div>
  `;
}

function dismissUsernameDialog() {
  const input = document.getElementById("usernameInput") as HTMLInputElement | null;
  const button = document.getElementById("usernameOk") as HTMLButtonElement | null;
  if (input) input.value = "";
  button?.click();
  input?.blur();
}

describe("Iteration 7: avatar front marker + edges (integration)", () => {
  it("creates a front marker and enables edge rendering when supported", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const engine = getLastEngine();
    engine?.renderLoop?.();

    const scene = getLastScene();
    expect(scene?.createdMeshes).toContain("player:frontMarker");

    const torso = scene?.createdMeshObjects.find((m) => m.name === "player:torso");
    expect((torso as any)?.edgesEnabled).toBe(true);

    app.dispose();
  });
});

describe("Iteration 7: facing rules + right arm pose (integration)", () => {
  it("uses most-recently-pressed movement key for facing", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene, getLastCamera } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    dismissUsernameDialog();
    const engine = getLastEngine();
    const scene = getLastScene();
    const camera = getLastCamera();
    const torso = scene?.createdMeshObjects.find((m) => m.name === "player:torso");

    camera!.rotation.y = 0;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    engine?.renderLoop?.();
    expect(torso?.rotation.y).toBeCloseTo(0, 4);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
    engine?.renderLoop?.();
    expect(torso?.rotation.y).toBeCloseTo(Math.PI / 2, 4);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyA" }));
    engine?.renderLoop?.();
    expect(torso?.rotation.y).toBeCloseTo(0, 4);

    app.dispose();
  });

  it("aligns facing to camera yaw and updates right arm pose on movement", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene, getLastCamera } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    dismissUsernameDialog();
    const engine = getLastEngine();
    const scene = getLastScene();
    const camera = getLastCamera();

    const torso = scene?.createdMeshObjects.find((m) => m.name === "player:torso");
    const upperArmR = scene?.createdMeshObjects.find((m) => m.name === "player:upperArmR");

    camera!.rotation.y = 1.1;
    engine?.renderLoop?.();

    expect(torso?.rotation.y).toBeCloseTo(camera!.rotation.y, 4);

    const idleRotX = upperArmR?.rotation.x ?? 0;

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    engine?.renderLoop?.();

    const movingRotX = upperArmR?.rotation.x ?? 0;
    expect(movingRotX).not.toBe(idleRotX);
    expect(movingRotX).toBeLessThan(idleRotX + 0.001);

    app.dispose();
  });
});

describe("Iteration 7: action swing + nameplate styling (integration)", () => {
  it("adds right arm swing on successful action", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);

    let mousePressed = false;
    const keysDown = new Set<string>();
    const input = {
      isKeyDown: (code: string) => keysDown.has(code),
      wasKeyPressed: (_code: string) => false,
      wasKeyReleased: (_code: string) => false,
      isMouseDown: (_button: number) => false,
      wasMousePressed: (_button: number) => mousePressed,
      wasMouseReleased: (_button: number) => false,
      endFrame: () => {
        mousePressed = false;
      },
      dispose: () => undefined
    };

    const demo = createVoxelDemo({
      babylon,
      scene,
      camera: camera as any,
      input: input as any,
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
    for (let y = 21; y <= 22; y += 1) {
      world.setVoxel(0, y, 3, BlockId.Stone);
      world.setVoxel(1, y, 3, BlockId.Stone);
    }

    const sceneRef = getLastScene();
    const upperArmR = sceneRef?.createdMeshObjects.find((m) => m.name === "player:upperArmR");
    keysDown.add("KeyW");
    demo.tick(1 / 60);
    const baseRot = upperArmR?.rotation.x ?? 0;

    mousePressed = true;
    demo.tick(1 / 60);
    const actionRot = upperArmR?.rotation.x ?? 0;
    expect(world.getVoxel(0, 21, 3)).toBe(BlockId.Air);
    expect(actionRot).toBeGreaterThan(baseRot + 0.02);

    demo.dispose();
  });

  it("draws bright red text on a transparent nameplate", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const engine = getLastEngine();
    engine?.renderLoop?.();

    const scene = getLastScene();
    const nameplate = scene?.createdMeshObjects.find((m) => m.name === "player:nameplate");
    const texture = (nameplate as any)?.material?.diffuseTexture;
    expect(texture?.lastDrawTextArgs?.color).toBe("#ff3333");
    expect(texture?.lastDrawTextArgs?.clearColor).toBe("rgba(0,0,0,0)");
    expect(texture?.hasAlpha).toBe(true);

    app.dispose();
  });
});
