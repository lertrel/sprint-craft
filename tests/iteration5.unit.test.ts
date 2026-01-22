import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { moveAndCollideAabb } from "../src/sprint-craft/voxels/voxel-collision";
import { createChunkRebuildScheduler } from "../src/sprint-craft/voxels/rebuild-scheduler";
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

describe("Iteration 5: unit checks per spec item", () => {
  it("clamps upward movement when colliding with a ceiling", () => {
    const w = createWorld();
    // Ceiling block at y=3
    w.setVoxel(0, 3, 0, BlockId.Stone);

    const result = moveAndCollideAabb({
      getVoxel: w.getVoxel,
      position: { x: 0.5, y: 1, z: 0.5 },
      delta: { x: 0, y: 2, z: 0 },
      halfWidth: 0.3,
      height: 1.8
    });

    expect(result.collided.y).toBe(true);
    expect(result.position.y).toBeLessThanOrEqual(1.25);
  });

  it("applies fog and sky clear color during initialization", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });

    const scene = getLastScene();
    expect(scene?.clearColor).toMatchObject({ r: 0.63, g: 0.82, b: 0.98, a: 1 });
    expect(scene?.fogMode).toBeDefined();
    expect(scene?.fogDensity).toBe(0.02);
    expect(scene?.fogColor).toMatchObject({ r: 0.63, g: 0.82, b: 0.98 });

    app.dispose();
  });

  it("respects rebuild budget per scheduler step", () => {
    const scheduler = createChunkRebuildScheduler();
    const rebuilt: string[] = [];
    const rebuild = (id: { cx: number; cy: number; cz: number }) => rebuilt.push(`${id.cx},${id.cy},${id.cz}`);

    scheduler.markDirty(0, 0, 0);
    scheduler.markDirty(1, 0, 0);
    scheduler.markDirty(2, 0, 0);

    const processed = scheduler.step(1, rebuild);
    expect(processed).toBe(1);
    expect(rebuilt).toHaveLength(1);
  });

  it("standalone build config targets standalone output and IIFE bundle name", () => {
    const config = readFileSync("vite.standalone.config.ts", "utf8");
    expect(config).toContain('base: "./"');
    expect(config).toContain('outDir: "standalone"');
    expect(config).toContain('formats: ["iife"]');
    expect(config).toContain('fileName: () => "sprint-craft.js"');
  });

  it("README contains standalone usage instructions", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("Standalone (no Node/npm at runtime)");
    expect(readme).toContain("npm run build:standalone");
    expect(readme).toContain("standalone/sprint-craft.single.html");
  });

  it("README contains a self-validation checklist with required items", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("SELF-VALIDATION CHECKLIST");
    expect(readme).toContain("Game starts without runtime errors");
    expect(readme).toContain("Player moves correctly");
    expect(readme).toContain("Gravity works");
    expect(readme).toContain("Collision works");
    expect(readme).toContain("Blocks can be placed");
    expect(readme).toContain("Blocks can be broken");
    expect(readme).toContain("Performance is acceptable for a demo");
  });

  it("marks all checklist items as checked", () => {
    const readme = readFileSync("README.md", "utf8");
    const required = [
      "Game starts without runtime errors",
      "Player moves correctly",
      "Gravity works",
      "Collision works",
      "Blocks can be placed",
      "Blocks can be broken",
      "Performance is acceptable for a demo"
    ];

    for (const item of required) {
      expect(readme).toContain(`- [x] ${item}`);
    }
  });
});
