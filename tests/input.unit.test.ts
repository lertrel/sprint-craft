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
});

