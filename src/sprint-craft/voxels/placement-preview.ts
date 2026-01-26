import type { BabylonApi, SceneLike, Vec3Like } from "../app";
import type { Rgba01 } from "./blocks";

export type PlacementPreviewHandle = {
  update: (options: { position: Vec3Like | null; color: Rgba01 }) => void;
  dispose: () => void;
  meshName: string;
};

const PREVIEW_NAME = "placement:preview";
const PREVIEW_SCALE = 1.01;

export function createPlacementPreview(options: {
  babylon: BabylonApi;
  scene: SceneLike;
}): PlacementPreviewHandle {
  const { babylon, scene } = options;
  const builder = babylon.MeshBuilder;
  if (!builder.CreateBox) {
    throw new Error("MeshBuilder.CreateBox is required for placement preview");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mesh = builder.CreateBox(
    PREVIEW_NAME,
    { width: 1, height: 1, depth: 1 },
    scene as any
  ) as any;
  mesh.position = mesh.position ?? { x: 0, y: 0, z: 0 };
  mesh.rotation = mesh.rotation ?? { x: 0, y: 0, z: 0 };
  mesh.scaling = mesh.scaling ?? { x: 1, y: 1, z: 1 };
  mesh.scaling.x = PREVIEW_SCALE;
  mesh.scaling.y = PREVIEW_SCALE;
  mesh.scaling.z = PREVIEW_SCALE;
  mesh.isPickable = false;
  mesh.isVisible = false;

  const material =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial("placementPreviewMat", scene as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).disableLighting = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).alpha = 0.35;
          return mat as unknown;
        })()
      : null;

  if (material) {
    mesh.material = material;
  }

  const applyColor = (rgba: Rgba01) => {
    if (!material || !("Color3" in babylon)) return;
    const [r, g, b, a] = rgba;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (material as any).diffuseColor = new (babylon as any).Color3(r, g, b);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (material as any).emissiveColor = new (babylon as any).Color3(r, g, b);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (material as any).alpha = a;
  };

  const update = (options: { position: Vec3Like | null; color: Rgba01 }) => {
    const { position, color } = options;
    if (!position) {
      mesh.isVisible = false;
      return;
    }
    mesh.isVisible = true;
    mesh.position.x = position.x + 0.5;
    mesh.position.y = position.y + 0.5;
    mesh.position.z = position.z + 0.5;
    applyColor(color);
  };

  return {
    update,
    dispose: () => {
      mesh.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
    },
    meshName: PREVIEW_NAME
  };
}
