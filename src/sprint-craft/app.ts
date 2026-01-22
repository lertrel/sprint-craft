/* eslint-disable no-console */

import type { InputState } from "./input";
import { createInputState } from "./input";
import { createHotbar } from "./ui/hotbar";
import { createToast } from "./ui/toast";
import { createPointerLock } from "./ui/pointer-lock";
import { createMouseLook } from "./ui/mouse-look";
import { createDebugGround } from "./world/debug-ground";
import { createVoxelDemo } from "./voxels/voxel-demo";

export type BabylonApi = {
  // Intentionally permissive so real Babylon classes are assignable under TS strict mode.
  Engine: new (...args: any[]) => EngineLike;
  Scene: new (...args: any[]) => SceneLike;
  FreeCamera: new (...args: any[]) => CameraLike;
  Vector3: new (...args: any[]) => any;
  HemisphericLight: new (...args: any[]) => unknown;
  MeshBuilder: {
    CreateGround: (...args: any[]) => unknown;
  };
  // Iteration 2 (optional in tests): custom mesh pipeline for chunk rendering.
  Mesh?: new (...args: any[]) => { dispose?: () => void };
  VertexData?: new (...args: any[]) => {
    positions?: number[] | ArrayLike<number> | null;
    normals?: number[] | ArrayLike<number> | null;
    indices?: number[] | ArrayLike<number> | null;
    colors?: number[] | ArrayLike<number> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyToMesh?: (mesh: any) => void;
  };
  StandardMaterial?: new (...args: any[]) => unknown;
  Color3?: new (...args: any[]) => unknown;
  Color4?: new (...args: any[]) => unknown;
};

export type EngineLike = {
  runRenderLoop: (cb: () => void) => void;
  resize: () => void;
  dispose?: () => void;
};

export type SceneLike = {
  render: () => void;
  dispose?: () => void;
};

export type Vec3Like = { x: number; y: number; z: number };

export type CameraLike = {
  fov?: number;
  position: Vec3Like;
  rotation: { x: number; y: number; z: number };
  setTarget?: (target: any) => void;
};

export type InitAppOptions = {
  babylon: BabylonApi;
  canvas: HTMLCanvasElement;
  document: Document;
  window: Window;
  enableDebugGround?: boolean;
  onLog?: (msg: string) => void;
};

export type AppHandle = {
  engine: EngineLike;
  scene: SceneLike;
  camera: CameraLike;
  input: InputState;
  getFrameCount: () => number;
  dispose: () => void;
};

function applySceneEnvironment(options: { babylon: BabylonApi; scene: SceneLike }): void {
  const { babylon, scene } = options;
  const envScene = scene as SceneLike & {
    clearColor?: { r: number; g: number; b: number; a: number };
    fogMode?: number;
    fogDensity?: number;
    fogColor?: { r: number; g: number; b: number };
    ambientColor?: { r: number; g: number; b: number };
  };
  const sky = { r: 0.63, g: 0.82, b: 0.98 };
  const Color3Ctor = "Color3" in babylon ? (babylon as any).Color3 : null;
  const Color4Ctor = "Color4" in babylon ? (babylon as any).Color4 : null;

  envScene.clearColor = Color4Ctor ? new Color4Ctor(sky.r, sky.g, sky.b, 1) : { ...sky, a: 1 };
  envScene.fogMode = (babylon as any).Scene?.FOGMODE_EXP2 ?? 2;
  envScene.fogDensity = 0.02;
  envScene.fogColor = Color3Ctor ? new Color3Ctor(sky.r, sky.g, sky.b) : { ...sky };
  envScene.ambientColor = Color3Ctor ? new Color3Ctor(0.4, 0.4, 0.4) : { r: 0.4, g: 0.4, b: 0.4 };
}

export function initApp(options: InitAppOptions): AppHandle {
  const {
    babylon,
    canvas,
    document,
    window,
    enableDebugGround = true,
    onLog
  } = options;

  const log = (msg: string) => {
    onLog?.(msg);
    console.info(msg);
  };

  const toastEl = document.getElementById("toast");
  const hotbarEl = document.getElementById("hotbar");
  const helpEl = document.getElementById("help");

  if (!toastEl || !hotbarEl || !helpEl) {
    throw new Error("Missing required HUD elements (#toast, #hotbar, #help)");
  }

  const toast = createToast(toastEl);
  const hotbar = createHotbar(hotbarEl);

  const input = createInputState({ target: window });
  input.onDigit = (digit) => {
    hotbar.setSelected(digit);
    toast.show(`Selected: ${digit}`);
  };

  // RMB should not open context menu while interacting.
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

  const engine = new babylon.Engine(canvas, true);
  log("Engine initialized");

  const scene = new babylon.Scene(engine);
  applySceneEnvironment({ babylon, scene });
  const camera = new babylon.FreeCamera(
    "camera",
    new babylon.Vector3(0, 1.7, -6),
    scene
  );
  camera.fov = 1.0;
  // Set near clipping plane very close to prevent geometry from being clipped
  // when the player is standing on blocks or near walls.
  // Default is typically 0.1 or 1.0, which clips too much for first-person voxel games.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ("minZ" in camera) (camera as any).minZ = 0.05;
  // Do not replace Babylon's rotation vector in runtime; only initialize its components.
  if (!camera.rotation) {
    // For test doubles only.
    (camera as unknown as { rotation: { x: number; y: number; z: number } }).rotation = {
      x: 0,
      y: 0,
      z: 0
    };
  } else {
    camera.rotation.x = 0;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
  }
  camera.setTarget?.(new babylon.Vector3(0, 1.4, 0));

  const pointerLock = createPointerLock({
    canvas,
    document,
    toast,
    helpEl,
    onLockedFirstTime: () => {
      // Implementation choice (Iteration 1): hide help after first successful lock.
      helpEl.style.display = "none";
    }
  });

  // Track pointer lock state changes to prevent browser shortcuts when playing.
  const onLockChange = () => {
    const isLocked = document.pointerLockElement === canvas;
    input.setPreventDefaults?.(isLocked);
  };
  document.addEventListener("pointerlockchange", onLockChange);
  // Initialize based on current lock state.
  onLockChange();

  const mouseLook = createMouseLook({
    canvas,
    document,
    camera,
    sensitivity: 0.002,
    pitchClampRad: Math.PI / 2 - 0.02
  });

  const voxelDemo = createVoxelDemo({
    babylon,
    scene,
    camera,
    input,
    getSelectedSlot: () => hotbar.getSelected(),
    rebuildBudgetPerFrame: 2
  });

  // Input is consumed on a per-frame cadence.
  let frameCount = 0;
  let lastNowMs: number | null = null;
  engine.runRenderLoop(() => {
    frameCount += 1;
    const nowMs = window.performance?.now?.() ?? Date.now();
    const dtSecRaw =
      lastNowMs === null ? 1 / 60 : Math.max(0, (nowMs - lastNowMs) / 1000);
    lastNowMs = nowMs;
    const dtSec = Number.isFinite(dtSecRaw) && dtSecRaw > 0 ? dtSecRaw : 1 / 60;
    voxelDemo.tick(dtSec);
    scene.render();
    input.endFrame();
  });

  const onResize = () => {
    engine.resize();
  };
  window.addEventListener("resize", onResize);

  if (enableDebugGround) {
    createDebugGround({
      babylon,
      scene
    });
  }

  return {
    engine,
    scene,
    camera,
    input,
    getFrameCount: () => frameCount,
    dispose: () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      mouseLook.dispose();
      pointerLock.dispose();
      input.dispose();
      voxelDemo.dispose();
      window.removeEventListener("resize", onResize);
      scene.dispose?.();
      engine.dispose?.();
    }
  };
}

export function initAppFromDom(options: { babylon: BabylonApi }): AppHandle | null {
  const { babylon } = options;
  const canvas = document.getElementById("renderCanvas");

  if (!(canvas instanceof HTMLCanvasElement)) {
    const banner = document.createElement("div");
    banner.id = "startupError";
    banner.style.position = "absolute";
    banner.style.inset = "12px";
    banner.style.padding = "10px 12px";
    banner.style.background = "rgba(140,0,0,0.25)";
    banner.style.border = "1px solid rgba(255,255,255,0.2)";
    banner.style.borderRadius = "10px";
    banner.style.color = "white";
    banner.style.fontFamily =
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    banner.textContent = "Startup error: missing #renderCanvas";
    document.body.appendChild(banner);
    console.error("Startup error: missing #renderCanvas");
    return null;
  }

  try {
    return initApp({
      babylon,
      canvas,
      document,
      window
    });
  } catch (err) {
    const banner = document.createElement("div");
    banner.id = "startupError";
    banner.style.position = "absolute";
    banner.style.inset = "12px";
    banner.style.padding = "10px 12px";
    banner.style.background = "rgba(140,0,0,0.25)";
    banner.style.border = "1px solid rgba(255,255,255,0.2)";
    banner.style.borderRadius = "10px";
    banner.style.color = "white";
    banner.style.fontFamily =
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    banner.textContent = `Startup error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    document.body.appendChild(banner);
    console.error(err);
    return null;
  }
}

