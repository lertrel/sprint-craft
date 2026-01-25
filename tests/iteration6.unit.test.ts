import { describe, expect, it } from "vitest";
import { createHandAnimator } from "../src/sprint-craft/voxels/hand-animation";

describe("Iteration 6: hand animation (unit)", () => {
  it("activates a swing when an action is triggered", () => {
    const animator = createHandAnimator();
    animator.update({ dtSec: 1 / 60, moveSpeed: 0, actionTriggered: false });
    expect(animator.getState().actionTimer).toBe(0);

    animator.update({ dtSec: 1 / 60, moveSpeed: 0, actionTriggered: true });
    const state = animator.getState();
    expect(state.actionTimer).toBeGreaterThan(0);
    expect(Math.abs(state.swing.right)).toBeGreaterThan(0);
  });
});
