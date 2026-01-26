import { describe, expect, it } from "vitest";
import { initApp } from "../src/sprint-craft/app";
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

describe("Iteration 7: idle facing + right arm pose (integration)", () => {
  it("aligns facing to camera yaw and updates right arm pose on movement", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene, getLastCamera } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
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
