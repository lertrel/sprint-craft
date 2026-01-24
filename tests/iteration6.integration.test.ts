import { describe, expect, it } from "vitest";
import { initApp } from "../src/sprint-craft/app";
import { createVoxelDemo } from "../src/sprint-craft/voxels/voxel-demo";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { computeEyeHeight } from "../src/sprint-craft/voxels/player-controller";
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

describe("Iteration 6: branding splash (integration)", () => {
  it("shows the splash on load and hides on first input", () => {
    setDom(baseHudDom());
    const { babylon } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const splash = document.getElementById("brandSplash") as HTMLElement;
    expect(splash).not.toBeNull();
    expect(splash.classList.contains("hidden")).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    expect(splash.classList.contains("hidden")).toBe(true);

    app.dispose();
  });
});

describe("Iteration 6: avatar + nameplate (integration)", () => {
  it("creates full-body avatar meshes and nameplate text", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const engine = getLastEngine();
    engine?.renderLoop?.();

    const scene = getLastScene();
    const meshNames = scene?.createdMeshes ?? [];
    expect(meshNames).toContain("player:head");
    expect(meshNames).toContain("player:torso");
    expect(meshNames).toContain("player:upperArmL");
    expect(meshNames).toContain("player:lowerArmL");
    expect(meshNames).toContain("player:upperLegL");
    expect(meshNames).toContain("player:lowerLegL");
    expect(meshNames).toContain("player:nameplate");

    const head = scene?.createdMeshObjects.find((m) => m.name === "player:head");
    const torso = scene?.createdMeshObjects.find((m) => m.name === "player:torso");
    const nameplate = scene?.createdMeshObjects.find((m) => m.name === "player:nameplate");
    expect(head).toBeDefined();
    expect(torso).toBeDefined();
    expect(nameplate).toBeDefined();
    expect(head!.position.y).toBeGreaterThan(torso!.position.y);
    expect(nameplate!.position.y).toBeGreaterThan(head!.position.y);

    const texture = (nameplate as any).material?.diffuseTexture;
    expect(texture?.lastDrawText).toBe("<User 1>");

    app.dispose();
  });
});

describe("Iteration 6: shoulder camera clamp (integration)", () => {
  it("clamps the camera forward when a voxel blocks the desired position", () => {
    const { babylon } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);
    const camera = new babylon.FreeCamera("cam", new babylon.Vector3(0, 0, 0), scene);

    const input = {
      isKeyDown: (_code: string) => false,
      wasKeyPressed: (_code: string) => false,
      wasKeyReleased: (_code: string) => false,
      isMouseDown: (_button: number) => false,
      wasMousePressed: (_button: number) => false,
      wasMouseReleased: (_button: number) => false,
      endFrame: () => undefined,
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

    const player = demo.getPlayerState();
    player.position = { x: 0.5, y: 20, z: 0.5 };
    player.stance = "standing";
    camera.rotation.y = 0;

    const world = demo.getWorld();
    world.setVoxel(0, 21, -1, BlockId.Stone);
    world.setVoxel(1, 21, -1, BlockId.Stone);

    demo.tick(1 / 60);

    const eyeHeight = computeEyeHeight(player.colliderHeights[player.stance]);
    const anchor = { x: player.position.x, y: player.position.y + eyeHeight, z: player.position.z };
    const desired = {
      x: anchor.x + 0.35,
      y: anchor.y - 0.1,
      z: anchor.z - 2.1
    };
    const desiredDistance = Math.hypot(
      desired.x - anchor.x,
      desired.y - anchor.y,
      desired.z - anchor.z
    );

    const actualDistance = Math.hypot(
      camera.position.x - anchor.x,
      camera.position.y - anchor.y,
      camera.position.z - anchor.z
    );
    expect(actualDistance).toBeLessThan(desiredDistance);

    world.setVoxel(0, 21, -1, BlockId.Air);
    world.setVoxel(1, 21, -1, BlockId.Air);
    demo.tick(1 / 60);

    const eyeHeight2 = computeEyeHeight(player.colliderHeights[player.stance]);
    const anchor2 = { x: player.position.x, y: player.position.y + eyeHeight2, z: player.position.z };
    const desired2 = {
      x: anchor2.x + 0.35,
      y: anchor2.y - 0.1,
      z: anchor2.z - 2.1
    };
    const desiredDistance2 = Math.hypot(
      desired2.x - anchor2.x,
      desired2.y - anchor2.y,
      desired2.z - anchor2.z
    );
    const actualDistance2 = Math.hypot(
      camera.position.x - anchor2.x,
      camera.position.y - anchor2.y,
      camera.position.z - anchor2.z
    );
    expect(Math.abs(actualDistance2 - desiredDistance2)).toBeLessThan(0.05);

    demo.dispose();
  });
});
