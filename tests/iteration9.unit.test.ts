import { describe, expect, it } from "vitest";
import { createPlayerAvatar, DEFAULT_TORSO_COLOR, EYE_COLOR, FACE_COLOR } from "../src/sprint-craft/voxels/player-avatar";
import { formatUsername, getAnonymousUserName, resolveUsername } from "../src/sprint-craft/usernames";
import { createFakeBabylon } from "./fakes/fake-babylon";

describe("Iteration 9: username helpers (unit)", () => {
  it("resolves trimmed usernames and falls back to anonymous", () => {
    expect(resolveUsername("  John  ")).toBe("John");
    expect(resolveUsername("")).toBe(getAnonymousUserName());
    expect(resolveUsername("   ")).toBe("User 1");
  });

  it("formats usernames with angle brackets", () => {
    expect(formatUsername("John")).toBe("<John>");
  });
});

describe("Iteration 9: torso color (unit)", () => {
  it("uses the default torso color and keeps it across pose updates", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);

    const avatar = createPlayerAvatar({ babylon, scene });
    const lastScene = getLastScene();
    const torso = lastScene?.createdMeshObjects.find((m) => m.name === "player:torso");
    const head = lastScene?.createdMeshObjects.find((m) => m.name === "player:head");

    const torsoColor = (torso as any)?.material?.diffuseColor;
    const headColor = (head as any)?.material?.diffuseColor;
    expect(torsoColor).toBeDefined();
    expect(headColor).toBeDefined();
    expect(torsoColor.r).toBeCloseTo(DEFAULT_TORSO_COLOR[0], 5);
    expect(torsoColor.g).toBeCloseTo(DEFAULT_TORSO_COLOR[1], 5);
    expect(torsoColor.b).toBeCloseTo(DEFAULT_TORSO_COLOR[2], 5);
    expect(torsoColor.r).not.toBeCloseTo(headColor.r, 5);

    avatar.setPose({
      position: { x: 1, y: 2, z: 3 },
      yaw: 0.5,
      stance: "crouching",
      swing: { left: 0.1, right: 0 }
    });
    const torsoColor2 = (torso as any)?.material?.diffuseColor;
    expect(torsoColor2.r).toBeCloseTo(DEFAULT_TORSO_COLOR[0], 5);
    expect(torsoColor2.g).toBeCloseTo(DEFAULT_TORSO_COLOR[1], 5);
    expect(torsoColor2.b).toBeCloseTo(DEFAULT_TORSO_COLOR[2], 5);
  });

  it("applies a creation-time torso color override", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);

    createPlayerAvatar({ babylon, scene, appearance: { torsoColor: [0.2, 0.4, 0.6] } });
    const lastScene = getLastScene();
    const torso = lastScene?.createdMeshObjects.find((m) => m.name === "player:torso");
    const torsoColor = (torso as any)?.material?.diffuseColor;
    expect(torsoColor.r).toBeCloseTo(0.2, 5);
    expect(torsoColor.g).toBeCloseTo(0.4, 5);
    expect(torsoColor.b).toBeCloseTo(0.6, 5);
  });
});

describe("Iteration 9: face and eye colors (unit)", () => {
  it("applies face and eye material colors", () => {
    const { babylon, getLastScene } = createFakeBabylon();
    const canvas = document.createElement("canvas");
    const engine = new babylon.Engine(canvas, true);
    const scene = new babylon.Scene(engine);

    createPlayerAvatar({ babylon, scene });
    const lastScene = getLastScene();
    const face = lastScene?.createdMeshObjects.find((m) => m.name === "player:face");
    const eyeL = lastScene?.createdMeshObjects.find((m) => m.name === "player:eyeL");

    const faceColor = (face as any)?.material?.diffuseColor;
    const eyeColor = (eyeL as any)?.material?.diffuseColor;
    expect(faceColor.r).toBeCloseTo(FACE_COLOR[0], 5);
    expect(faceColor.g).toBeCloseTo(FACE_COLOR[1], 5);
    expect(faceColor.b).toBeCloseTo(FACE_COLOR[2], 5);
    expect(eyeColor.r).toBeCloseTo(EYE_COLOR[0], 5);
    expect(eyeColor.g).toBeCloseTo(EYE_COLOR[1], 5);
    expect(eyeColor.b).toBeCloseTo(EYE_COLOR[2], 5);
  });
});
