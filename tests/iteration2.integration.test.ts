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
        <div id="toast"></div>
        <div id="help">help</div>
        <div id="hotbar"></div>
      </div>
    </div>
  `;
}

describe("Iteration 2 (integration-ish)", () => {
  it("renders an initial multi-chunk voxel world using one mesh per chunk and should not rebuild meshes when idle", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });

    const scene = getLastScene();
    expect(scene).not.toBeNull();

    const chunkMeshes = (scene?.createdMeshes ?? []).filter((n) => n.startsWith("chunk:"));
    // Default generation is radiusChunks=1 => 3x3 => 9 chunks => 9 meshes.
    expect(chunkMeshes).toHaveLength(9);

    // Guardrail: ensure we are NOT creating per-voxel meshes.
    expect(scene?.createdMeshes.length).toBeLessThanOrEqual(20);

    // Run a few frames; should not rebuild meshes if nothing changed.
    const engine = getLastEngine();
    const before = scene?.createdMeshes.length ?? 0;
    engine?.renderLoop?.();
    engine?.renderLoop?.();
    engine?.renderLoop?.();
    const after = scene?.createdMeshes.length ?? 0;
    expect(after).toBe(before);

    app.dispose();
  });
});

