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
        <div id="usernameDialog">
          <label for="usernameInput">Choose avatar name</label>
          <input id="usernameInput" type="text" />
          <button id="usernameOk" type="button">OK</button>
        </div>
        <div id="toast"></div>
        <div id="help">help</div>
        <div id="hotbar"></div>
      </div>
    </div>
  `;
}

describe("Iteration 9: username dialog + nameplate (integration)", () => {
  it("updates nameplate text and hides the dialog on OK", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const dialog = document.getElementById("usernameDialog") as HTMLElement;
    const label = dialog.querySelector("label");
    const input = document.getElementById("usernameInput") as HTMLInputElement;
    const button = document.getElementById("usernameOk") as HTMLButtonElement;

    expect(dialog).not.toBeNull();
    expect(label?.textContent).toBe("Choose avatar name");

    input.value = "  John  ";
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dialog.classList.contains("hidden")).toBe(true);

    const scene = getLastScene();
    const nameplate = scene?.createdMeshObjects.find((m) => m.name === "player:nameplate");
    const texture = (nameplate as any)?.material?.diffuseTexture;
    expect(texture?.lastDrawText).toBe("<John>");

    app.dispose();
  });

  it("falls back to <User 1> for blank input", () => {
    setDom(baseHudDom());
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const input = document.getElementById("usernameInput") as HTMLInputElement;
    const button = document.getElementById("usernameOk") as HTMLButtonElement;

    input.value = "   ";
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const scene = getLastScene();
    const nameplate = scene?.createdMeshObjects.find((m) => m.name === "player:nameplate");
    const texture = (nameplate as any)?.material?.diffuseTexture;
    expect(texture?.lastDrawText).toBe("<User 1>");

    app.dispose();
  });
});

describe("Iteration 9: face/eyes placement (integration)", () => {
  it("adds face and eyes on the front of the head", () => {
    setDom(baseHudDom());
    const { babylon, getLastEngine, getLastScene } = createFakeBabylon();
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const app = initApp({ babylon, canvas, document, window, enableDebugGround: false });
    const engine = getLastEngine();
    engine?.renderLoop?.();

    const scene = getLastScene();
    const head = scene?.createdMeshObjects.find((m) => m.name === "player:head");
    const face = scene?.createdMeshObjects.find((m) => m.name === "player:face");
    const eyeL = scene?.createdMeshObjects.find((m) => m.name === "player:eyeL");
    const eyeR = scene?.createdMeshObjects.find((m) => m.name === "player:eyeR");

    expect(face).toBeDefined();
    expect(eyeL).toBeDefined();
    expect(eyeR).toBeDefined();
    expect(face!.position.z).toBeGreaterThan(head!.position.z);
    expect(eyeL!.position.z).toBeGreaterThan(head!.position.z);
    expect(eyeR!.position.z).toBeGreaterThan(head!.position.z);

    const eyeColor = (eyeL as any)?.material?.diffuseColor;
    expect(eyeColor?.r).toBeCloseTo(0, 5);
    expect(eyeColor?.g).toBeCloseTo(0, 5);
    expect(eyeColor?.b).toBeCloseTo(0, 5);

    app.dispose();
  });
});
