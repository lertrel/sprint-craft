import type { BabylonApi, SceneLike } from "../app";
import { CHUNK_SIZE, chunkKey, type Chunk } from "./chunk";
import { meshChunk } from "./meshing/mesher";
import type { World } from "./world";

export type ChunkRenderer = {
  upsertChunkMesh: (chunk: Chunk) => void;
  dispose: () => void;
  getMeshCount: () => number;
};

export function createChunkRenderer(options: {
  babylon: BabylonApi;
  scene: SceneLike;
  world: World;
}): ChunkRenderer {
  const { babylon, scene, world } = options;

  const meshes = new Map<string, { dispose: () => void }>();

  const material =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial("chunkMat", scene as any);
          // Prefer vertex colors for block coloration.
          (mat as any).useVertexColor = true;
          // Make colors readable regardless of lighting setup.
          (mat as any).disableLighting = true;
          if ("Color3" in babylon) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).emissiveColor = new (babylon as any).Color3(1, 1, 1);
          }
          return mat as unknown;
        })()
      : null;

  const upsertChunkMesh = (chunk: Chunk) => {
    const key = chunkKey(chunk.cx, chunk.cy, chunk.cz);

    const origin = {
      x: chunk.cx * CHUNK_SIZE,
      y: chunk.cy * CHUNK_SIZE,
      z: chunk.cz * CHUNK_SIZE
    };

    const meshData = meshChunk({
      chunk,
      origin,
      getVoxel: world.getVoxel
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MeshCtor = (babylon as any).Mesh;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const VertexDataCtor = (babylon as any).VertexData;
    if (!MeshCtor || !VertexDataCtor) {
      // If running in an environment without Babylon mesh primitives, skip rendering.
      return;
    }

    const existing = meshes.get(key);
    if (existing) {
      existing.dispose();
      meshes.delete(key);
    }

    const meshName = `chunk:${key}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = new MeshCtor(meshName, scene as any);
    if (material) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mesh as any).material = material as any;
    }

    // Apply geometry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vd = new VertexDataCtor() as any;
    vd.positions = meshData.positions;
    vd.normals = meshData.normals;
    vd.indices = meshData.indices;
    vd.colors = meshData.colors;
    vd.applyToMesh(mesh);

    meshes.set(key, { dispose: () => mesh.dispose?.() });
  };

  return {
    upsertChunkMesh,
    dispose: () => {
      for (const m of meshes.values()) m.dispose();
      meshes.clear();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
    },
    getMeshCount: () => meshes.size
  };
}

