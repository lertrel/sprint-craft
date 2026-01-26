import type { BabylonApi, SceneLike } from "../app";
import type { RaycastHit } from "./raycast";

export type TargetHighlightHandle = {
  update: (hit: RaycastHit | null) => void;
  dispose: () => void;
  meshName: string;
};

const HIGHLIGHT_NAME = "target:highlight";
const HIGHLIGHT_SIZE = 1.02;

export function createTargetHighlight(options: {
  babylon: BabylonApi;
  scene: SceneLike;
}): TargetHighlightHandle {
  const { babylon, scene } = options;
  const builder = babylon.MeshBuilder;
  if (!builder.CreateBox) {
    throw new Error("MeshBuilder.CreateBox is required for target highlight");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mesh = builder.CreateBox(
    HIGHLIGHT_NAME,
    { width: HIGHLIGHT_SIZE, height: HIGHLIGHT_SIZE, depth: HIGHLIGHT_SIZE },
    scene as any
  ) as any;
  mesh.position = mesh.position ?? { x: 0, y: 0, z: 0 };
  mesh.rotation = mesh.rotation ?? { x: 0, y: 0, z: 0 };
  mesh.scaling = mesh.scaling ?? { x: 1, y: 1, z: 1 };
  mesh.isPickable = false;
  mesh.isVisible = false;

  if (typeof mesh.enableEdgesRendering === "function") {
    mesh.enableEdgesRendering();
    if ("edgesWidth" in mesh) mesh.edgesWidth = 2.0;
    if ("edgesColor" in mesh) {
      if ("Color4" in babylon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mesh.edgesColor = new (babylon as any).Color4(1, 1, 1, 1);
      } else {
        mesh.edgesColor = { r: 1, g: 1, b: 1, a: 1 };
      }
    }
  }

  const material =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial("targetHighlightMat", scene as any);
          if ("Color3" in babylon) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).emissiveColor = new (babylon as any).Color3(1, 1, 1);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).disableLighting = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).alpha = 0.5;
          return mat as unknown;
        })()
      : null;

  if (material) {
    mesh.material = material;
  }

  const update = (hit: RaycastHit | null) => {
    if (!hit) {
      mesh.isVisible = false;
      return;
    }
    mesh.isVisible = true;
    mesh.position.x = hit.wx + 0.5;
    mesh.position.y = hit.wy + 0.5;
    mesh.position.z = hit.wz + 0.5;
  };

  return {
    update,
    dispose: () => {
      mesh.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
    },
    meshName: HIGHLIGHT_NAME
  };
}
