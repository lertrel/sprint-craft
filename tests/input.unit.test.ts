import { describe, expect, it } from "vitest";
import { createInputState } from "../src/sprint-craft/input";

describe("InputState (unit)", () => {
  it("tracks key down, pressed (edge), and released", () => {
    const input = createInputState({ target: window });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    expect(input.isKeyDown("KeyW")).toBe(true);
    expect(input.wasKeyPressed("KeyW")).toBe(true);
    expect(input.wasKeyReleased("KeyW")).toBe(false);

    // Same keydown again should not re-trigger "pressed".
    input.endFrame();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    expect(input.isKeyDown("KeyW")).toBe(true);
    expect(input.wasKeyPressed("KeyW")).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    expect(input.isKeyDown("KeyW")).toBe(false);
    expect(input.wasKeyReleased("KeyW")).toBe(true);

    input.dispose();
  });

  it("tracks mouse button down/pressed/released", () => {
    const input = createInputState({ target: window });

    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(input.isMouseDown(0)).toBe(true);
    expect(input.wasMousePressed(0)).toBe(true);

    input.endFrame();
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(input.wasMousePressed(0)).toBe(false);

    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    expect(input.isMouseDown(0)).toBe(false);
    expect(input.wasMouseReleased(0)).toBe(true);

    input.dispose();
  });

  it("invokes onDigit for Digit1..Digit9 only", () => {
    const input = createInputState({ target: window });
    const seen: number[] = [];
    input.onDigit = (d) => seen.push(d);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit3" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit0" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit9" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));

    expect(seen).toEqual([3, 9]);
    input.dispose();
  });

  it("ignores keyboard input while typing in a text field", () => {
    const input = createInputState({ target: window });
    input.setPreventDefaults?.(true);
    const seen: number[] = [];
    input.onDigit = (d) => seen.push(d);

    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();

    const digitDown = new KeyboardEvent("keydown", {
      code: "Digit5",
      cancelable: true,
      bubbles: true
    });
    field.dispatchEvent(digitDown);
    expect(digitDown.defaultPrevented).toBe(false);
    expect(seen).toEqual([]);
    expect(input.isKeyDown("Digit5")).toBe(false);

    const wDown = new KeyboardEvent("keydown", {
      code: "KeyW",
      cancelable: true,
      bubbles: true
    });
    field.dispatchEvent(wDown);
    expect(wDown.defaultPrevented).toBe(false);
    expect(input.isKeyDown("KeyW")).toBe(false);

    field.remove();
    input.dispose();
  });

  it("prevents ctrl shortcuts while still tracking keys", () => {
    const input = createInputState({ target: window });
    input.setPreventDefaults?.(true);

    const ctrlDown = new KeyboardEvent("keydown", {
      code: "ControlLeft",
      ctrlKey: true,
      cancelable: true,
      bubbles: true
    });
    window.dispatchEvent(ctrlDown);
    expect(ctrlDown.defaultPrevented).toBe(true);
    expect(input.isKeyDown("ControlLeft")).toBe(true);

    const wDown = new KeyboardEvent("keydown", {
      code: "KeyW",
      ctrlKey: true,
      cancelable: true,
      bubbles: true
    });
    window.dispatchEvent(wDown);
    expect(wDown.defaultPrevented).toBe(true);
    expect(input.isKeyDown("KeyW")).toBe(true);

    const wUp = new KeyboardEvent("keyup", {
      code: "KeyW",
      ctrlKey: true,
      cancelable: true,
      bubbles: true
    });
    window.dispatchEvent(wUp);
    expect(wUp.defaultPrevented).toBe(true);
    expect(input.isKeyDown("KeyW")).toBe(false);

    input.dispose();
  });
});

