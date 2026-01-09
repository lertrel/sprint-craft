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

  // Ground: deterministic name for tests.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ground = babylon.MeshBuilder.CreateGround(
    "debugGround",
    { width: 64, height: 64, subdivisions: 2 },
    scene as unknown
  );
}

