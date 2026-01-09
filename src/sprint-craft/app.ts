/* eslint-disable no-console */

import type { InputState } from "./input";
import { createInputState } from "./input";
import { createHotbar } from "./ui/hotbar";
import { createToast } from "./ui/toast";
import { createPointerLock } from "./ui/pointer-lock";
import { createMouseLook } from "./ui/mouse-look";
import { createDebugGround } from "./world/debug-ground";

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
  const camera = new babylon.FreeCamera(
    "camera",
    new babylon.Vector3(0, 1.7, -6),
    scene
  );
  camera.fov = 1.0;
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

  const mouseLook = createMouseLook({
    canvas,
    document,
    camera,
    sensitivity: 0.002,
    pitchClampRad: Math.PI / 2 - 0.02
  });

  // Input is consumed on a per-frame cadence.
  let frameCount = 0;
  engine.runRenderLoop(() => {
    frameCount += 1;
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
      mouseLook.dispose();
      pointerLock.dispose();
      input.dispose();
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

