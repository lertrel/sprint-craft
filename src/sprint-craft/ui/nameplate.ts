import type { BabylonApi, SceneLike, Vec3Like } from "../app";

export type NameplateHandle = {
  setText: (text: string) => void;
  setPosition: (pos: Vec3Like) => void;
  dispose: () => void;
  meshName: string;
};

const DEFAULT_SIZE = { width: 1.4, height: 0.32 };
const DEFAULT_TEXTURE = { width: 512, height: 128 };

export function createNameplate(options: {
  babylon: BabylonApi;
  scene: SceneLike;
  text: string;
  name?: string;
}): NameplateHandle {
  const { babylon, scene, text, name = "player:nameplate" } = options;
  const builder = babylon.MeshBuilder;
  if (!builder.CreatePlane) {
    throw new Error("MeshBuilder.CreatePlane is required for nameplate");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plane = builder.CreatePlane(
    name,
    { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height },
    scene as any
  ) as any;
  plane.position = plane.position ?? { x: 0, y: 0, z: 0 };
  plane.rotation = plane.rotation ?? { x: 0, y: 0, z: 0 };
  plane.scaling = plane.scaling ?? { x: 1, y: 1, z: 1 };
  plane.isPickable = false;

  const DynamicTextureCtor = (babylon as any).DynamicTexture;
  const texture = DynamicTextureCtor
    ? new DynamicTextureCtor(
        `${name}:tex`,
        { width: DEFAULT_TEXTURE.width, height: DEFAULT_TEXTURE.height },
        scene as any,
        false
      )
    : null;

  const material =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial(`${name}:mat`, scene as any);
          if (texture) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).diffuseTexture = texture;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).useAlphaFromDiffuseTexture = true;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).backFaceCulling = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).disableLighting = true;
          if ("Color3" in babylon) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).emissiveColor = new (babylon as any).Color3(1, 1, 1);
          }
          return mat as unknown;
        })()
      : null;

  if (material) {
    plane.material = material;
  }

  const billboardMode =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (babylon as any).Mesh?.BILLBOARDMODE_ALL ?? 7;
  plane.billboardMode = billboardMode;

  const drawText = (value: string) => {
    if (!texture) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draw = (texture as any).drawText;
    if (typeof draw === "function") {
      draw.call(
        texture,
        value,
        null,
        null,
        "bold 64px Arial",
        "#ffffff",
        "transparent",
        true
      );
    }
  };

  drawText(text);

  return {
    setText: (value) => drawText(value),
    setPosition: (pos) => {
      plane.position.x = pos.x;
      plane.position.y = pos.y;
      plane.position.z = pos.z;
    },
    dispose: () => {
      plane.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (texture as any)?.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
    },
    meshName: name
  };
}
