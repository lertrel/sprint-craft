import { describe, expect, it } from "vitest";
import { createNameplate } from "../src/sprint-craft/ui/nameplate";
import { createHandAnimator } from "../src/sprint-craft/voxels/hand-animation";
import {
  facingYawFromKey,
  resolveFacingKey,
  updateLastMovementKey,
  type MovementKey
} from "../src/sprint-craft/voxels/voxel-demo";
import { createFakeBabylon } from "./fakes/fake-babylon";

describe("Iteration 7: facing selection (unit)", () => {
  it("uses the most recently pressed movement key when multiple are held", () => {
    let last: MovementKey | null = null;
    const pressed = new Set<MovementKey>();
    const down = new Set<MovementKey>();
    const wasPressed = (key: MovementKey) => pressed.has(key);
    const isDown = (key: MovementKey) => down.has(key);

    pressed.add("KeyW");
    down.add("KeyW");
    last = updateLastMovementKey(last, wasPressed);
    pressed.clear();

    expect(resolveFacingKey(last, isDown)).toBe("KeyW");

    pressed.add("KeyA");
    down.add("KeyA");
    last = updateLastMovementKey(last, wasPressed);
    pressed.clear();

    expect(resolveFacingKey(last, isDown)).toBe("KeyA");

    down.delete("KeyA");
    expect(resolveFacingKey(last, isDown)).toBe("KeyW");
  });

  it("maps facing keys to camera yaw offsets", () => {
    const yaw = 0.5;
    expect(facingYawFromKey(yaw, "KeyW")).toBeCloseTo(yaw, 5);
    expect(facingYawFromKey(yaw, "KeyS")).toBeCloseTo(yaw + Math.PI, 5);
    expect(facingYawFromKey(yaw, "KeyA")).toBeCloseTo(yaw - Math.PI / 2, 5);
    expect(facingYawFromKey(yaw, "KeyD")).toBeCloseTo(yaw + Math.PI / 2, 5);
  });
});

describe("Iteration 7: right arm swing constraints (unit)", () => {
  it("keeps right arm swing at zero while walking", () => {
    const animator = createHandAnimator();
    const swing = animator.update({ dtSec: 1 / 60, moveSpeed: 4, actionTriggered: false });
    expect(Math.abs(swing.left)).toBeGreaterThan(0);
    expect(Math.abs(swing.right)).toBe(0);
  });

  it("triggers right arm swing on action", () => {
    const animator = createHandAnimator();
    animator.update({ dtSec: 1 / 60, moveSpeed: 0, actionTriggered: false });
    const swing = animator.update({ dtSec: 1 / 60, moveSpeed: 0, actionTriggered: true });
    expect(Math.abs(swing.right)).toBeGreaterThan(0);
  });
});

describe("Iteration 7: nameplate styling (unit)", () => {
  it("uses transparent background and bright red text", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);

    const nameplate = createNameplate({ babylon, scene, text: "<User 1>" });
    const lastScene = getLastScene();
    const mesh = lastScene?.createdMeshObjects.find((m) => m.name === nameplate.meshName);
    const texture = (mesh as any)?.material?.diffuseTexture;

    expect(texture?.lastDrawTextArgs?.color).toBe("#ff3333");
    expect(texture?.lastDrawTextArgs?.clearColor).toBe("rgba(0,0,0,0)");
    expect(texture?.hasAlpha).toBe(true);
  });
});
