import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initApp } from "../src/sprint-craft/app";
import { createWorld } from "../src/sprint-craft/voxels/world";
import { BlockId } from "../src/sprint-craft/voxels/blocks";
import { createPlayerController } from "../src/sprint-craft/voxels/player-controller";
import { aabbIntersectsSolidVoxels, makePlayerAabb } from "../src/sprint-craft/voxels/voxel-collision";
import { createChunkRebuildScheduler } from "../src/sprint-craft/voxels/rebuild-scheduler";
import standaloneConfig from "../vite.standalone.config";
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

function fillFlatGround(w: ReturnType<typeof createWorld>, options?: { y?: number; radius?: number }) {
  const y = options?.y ?? 0;
  const r = options?.radius ?? 6;
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

describe("Iteration 5: edge-case collision stability (integration)", () => {
  it("keeps a reduced stance under low ceilings until cleared", () => {
    const w = createWorld();
    fillFlatGround(w);
    // Low ceiling at y=2 over the spawn column.
    for (let z = 0; z <= 1; z += 1) {
      for (let x = 0; x <= 1; x += 1) {
        w.setVoxel(x, 2, z, BlockId.Stone);
      }
    }

    const cam = makeCamera(0);
    const input = makeInput();
    input.down.add("ControlLeft");
    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 1, z: 0.5 })
    });

    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.stance).not.toBe("standing");

    input.down.delete("ControlLeft");
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.stance).not.toBe("standing");

    // Remove ceiling and ensure standing resumes.
    for (let z = 0; z <= 1; z += 1) {
      for (let x = 0; x <= 1; x += 1) {
        w.setVoxel(x, 2, z, BlockId.Air);
      }
    }
    c.tick(1 / 60);
    input.api.endFrame();
    expect(c.state.stance).toBe("standing");
  });

  it("stops upward motion at ceilings and returns to grounded", () => {
    const w = createWorld();
    fillFlatGround(w);
    // Ceiling at y=3 over the jump area.
    for (let z = -1; z <= 1; z += 1) {
      for (let x = -1; x <= 1; x += 1) {
        w.setVoxel(x, 3, z, BlockId.Stone);
      }
    }

    const cam = makeCamera(0);
    const input = makeInput();
    const c = createPlayerController({
      input: input.api as any,
      camera: cam as any,
      getVoxel: w.getVoxel,
      spawn: () => ({ x: 0.5, y: 1, z: 0.5 })
    });

    input.pressed.add("Space");
    c.tick(1 / 60);
    input.api.endFrame();

    let maxY = c.state.position.y;
    for (let i = 0; i < 120; i += 1) {
      c.tick(1 / 60);
      input.api.endFrame();
      maxY = Math.max(maxY, c.state.position.y);
    }

    expect(maxY).toBeLessThanOrEqual(1.25);
    expect(c.isGrounded()).toBe(true);
    expect(Math.abs(c.state.position.y - 1)).toBeLessThan(0.02);
  });

  it("does not get stuck on an exterior corner after repeated updates", () => {
    const w = createWorld();
    fillFlatGround(w, { radius: 6 });

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
    expect(Number.isFinite(c.state.position.x)).toBe(true);
    expect(Number.isFinite(c.state.position.z)).toBe(true);

    const aabb = makePlayerAabb({
      position: c.state.position,
      halfWidth: 0.3,
      height: c.state.colliderHeights[c.state.stance]
    });
    expect(aabbIntersectsSolidVoxels(w.getVoxel, aabb)).toBe(false);
  });
});

describe("Iteration 5: sky/lighting/fog (integration)", () => {
  it("sets a non-default clear color and fog parameters on init", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: true });

    const scene = getLastScene();
    expect(scene?.clearColor).toMatchObject({ r: 0.63, g: 0.82, b: 0.98, a: 1 });
    expect(scene?.fogMode).toBeDefined();
    expect(scene?.fogDensity).toBe(0.02);
    expect(scene?.fogColor).toMatchObject({ r: 0.63, g: 0.82, b: 0.98 });

    app.dispose();
  });

  it("creates a hemispheric light alongside the fog/sky settings", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: true });

    const scene = getLastScene();
    expect(scene?.createdLights).toContain("debugLight");

    app.dispose();
  });
});

describe("Iteration 5: chunk rebuild throttling (integration)", () => {
  it("rebuilds only up to the configured budget per step", () => {
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

  it("drains the rebuild queue over multiple budgeted steps", () => {
    const scheduler = createChunkRebuildScheduler();
    const rebuilt: string[] = [];
    const rebuild = (id: { cx: number; cy: number; cz: number }) => rebuilt.push(`${id.cx},${id.cy},${id.cz}`);

    scheduler.markDirty(0, 0, 0);
    scheduler.markDirty(1, 0, 0);
    scheduler.markDirty(2, 0, 0);

    const p1 = scheduler.step(1, rebuild);
    const p2 = scheduler.step(1, rebuild);
    const p3 = scheduler.step(1, rebuild);

    expect(p1).toBeLessThanOrEqual(1);
    expect(p2).toBeLessThanOrEqual(1);
    expect(p3).toBeLessThanOrEqual(1);
    expect(rebuilt).toHaveLength(3);
    expect(scheduler.hasPending()).toBe(false);
  });
});

describe("Iteration 5: standalone deliverable (integration)", () => {
  it("uses a relative base and outputs sprint-craft.js to standalone/", () => {
    const config = standaloneConfig as unknown as { base?: string; build?: any };
    expect(config.base).toBe("./");
    expect(config.build?.outDir).toBe("standalone");
    expect(config.build?.lib?.fileName?.()).toBe("sprint-craft.js");
  });

  it("documents standalone build and local open steps", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toContain("Standalone (no Node/npm at runtime)");
    expect(readme).toContain("npm run build:standalone");
    expect(readme).toContain("Open `standalone/index.html`");
    expect(readme).toContain("standalone/sprint-craft.single.html");
  });
});

describe("Iteration 5: self-validation checklist (integration)", () => {
  it("lists all required self-validation items", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toContain("SELF-VALIDATION CHECKLIST");
    expect(readme).toContain("Game starts without runtime errors");
    expect(readme).toContain("Player moves correctly");
    expect(readme).toContain("Gravity works");
    expect(readme).toContain("Collision works");
    expect(readme).toContain("Blocks can be placed");
    expect(readme).toContain("Blocks can be broken");
    expect(readme).toContain("Performance is acceptable for a demo");
  });

  it("marks all self-validation items as checked", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
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
