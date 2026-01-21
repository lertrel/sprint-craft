import type { BabylonApi, SceneLike } from "../app";

export function createDebugGround(options: {
  babylon: BabylonApi;
  scene: SceneLike;
}): void {
  const { babylon, scene } = options;

  // Lighting: ensure scene is readable without textures.
  // Name is deterministic for tests.
  // Direction points "down" from above.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const light = new babylon.HemisphericLight(
    "debugLight",
    new babylon.Vector3(0, 1, 0),
    scene as unknown
  );

  // Note: Debug ground plane removed to avoid visual confusion with voxel terrain.
  // The voxel terrain now has proper lighting and shading to be clearly visible.
  // Previously there was a flat plane at y=0 with no collision that caused confusion.
}

