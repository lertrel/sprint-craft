import { describe, expect, it, vi } from "vitest";
import { initApp, initAppFromDom } from "../src/sprint-craft/app";
import { createFakeBabylon } from "./fakes/fake-babylon";

function setDom(html: string) {
  document.body.innerHTML = html;
  // jsdom doesn't provide pointerLockElement as writable; we make it so for tests.
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

describe("Iteration 1 (integration-ish)", () => {
  it("boots engine/scene and renders frames; logs 'Engine initialized'", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });

    expect(info).toHaveBeenCalledWith("Engine initialized");

    const engine = getLastEngine();
    const scene = getLastScene();
    expect(engine).not.toBeNull();
    expect(scene).not.toBeNull();
    expect(engine?.renderLoop).toBeTypeOf("function");

    // Simulate two frames.
    engine?.renderLoop?.();
    engine?.renderLoop?.();
    expect(scene?.renderCalls).toBe(2);
    expect(app.getFrameCount()).toBe(2);

    app.dispose();
  });

  it("resizes engine on window resize and continues rendering", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const engine = getLastEngine();
    const scene = getLastScene();

    expect(engine?.resizeCalls).toBe(0);
    window.dispatchEvent(new Event("resize"));
    expect(engine?.resizeCalls).toBe(1);

    engine?.renderLoop?.();
    expect(scene?.renderCalls).toBe(1);

    app.dispose();
  });

  it("prevents RMB context menu on the canvas", () => {
    setDom(baseHudDom());
    const { babylon } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });

    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    canvas.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);

    app.dispose();
  });

  it("renders 9-slot hotbar and updates selected slot on Digit keys + toast", () => {
    vi.useFakeTimers();
    setDom(baseHudDom());
    const { babylon } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });

    const slots = Array.from(document.querySelectorAll(".slot"));
    expect(slots).toHaveLength(9);
    expect(document.querySelectorAll(".slot.selected")).toHaveLength(1);
    expect((document.querySelector(".slot.selected") as HTMLElement).dataset.slot).toBe("1");

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit5" }));

    expect(document.querySelectorAll(".slot.selected")).toHaveLength(1);
    expect((document.querySelector(".slot.selected") as HTMLElement).dataset.slot).toBe("5");

    const toast = document.getElementById("toast") as HTMLElement;
    expect(toast.textContent).toBe("Selected: 5");
    expect(toast.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(toast.classList.contains("show")).toBe(false);

    app.dispose();
    vi.useRealTimers();
  });

  it("creates deterministic debug ground + light when enabled", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const app = initApp({ babylon, canvas, document, window, enableDebugGround: true });

    const scene = getLastScene();
    expect(scene?.createdLights).toContain("debugLight");
    expect(scene?.createdMeshes).toContain("debugGround");

    app.dispose();
  });

  it("requests pointer lock on click, hides help after first lock, and mouse look applies only while locked", () => {
    setDom(baseHudDom());
    const { babylon, getLastCamera } = createFakeBabylon();

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const toast = document.getElementById("toast") as HTMLElement;
    const help = document.getElementById("help") as HTMLElement;

    const requestPointerLock = vi.fn(() => {
      (document as unknown as { pointerLockElement: Element | null }).pointerLockElement = canvas;
      document.dispatchEvent(new Event("pointerlockchange"));
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvas as any).requestPointerLock = requestPointerLock;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const cam = getLastCamera();
    expect(cam).not.toBeNull();

    // Not locked: mouse movement does nothing.
    const beforeYaw = cam!.rotation.y;
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: 100, movementY: 50 }));
    expect(cam!.rotation.y).toBe(beforeYaw);

    canvas.click();
    expect(requestPointerLock).toHaveBeenCalled();
    expect(toast.textContent).toContain("Pointer locked");
    expect(help.style.display).toBe("none");

    // Locked: mouse movement changes camera rotation.
    const afterLockYaw = cam!.rotation.y;
    const mm = new MouseEvent("mousemove");
    Object.defineProperty(mm, "movementX", { value: 100 });
    Object.defineProperty(mm, "movementY", { value: 50 });
    document.dispatchEvent(mm);
    expect(cam!.rotation.y).not.toBe(afterLockYaw);
    // Pitch clamped (must be within ±(pi/2 - small epsilon)).
    expect(Math.abs(cam!.rotation.x)).toBeLessThanOrEqual(Math.PI / 2);

    app.dispose();
  });

  it("fails gracefully with a visible banner when #renderCanvas is missing", () => {
    setDom(`<div id="app"><div id="hud"><div id="toast"></div><div id="help"></div><div id="hotbar"></div></div></div>`);
    const { babylon } = createFakeBabylon();

    const app = initAppFromDom({ babylon });
    expect(app).toBeNull();
    const banner = document.getElementById("startupError");
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("missing #renderCanvas");
  });
});

