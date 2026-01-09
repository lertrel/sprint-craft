import { getBlockDef } from "../blocks";
import { CHUNK_SIZE, type Chunk } from "../chunk";
import type { MeshData } from "./mesh-types";

export type VoxelGetter = (wx: number, wy: number, wz: number) => number;

export type MeshChunkOptions = {
  chunk: Chunk;
  /**
   * World-space origin of the chunk (cx*size, cy*size, cz*size).
   * Passed explicitly so meshing can be pure and easily testable.
   */
  origin: { x: number; y: number; z: number };
  getVoxel: VoxelGetter;
};

type Face = {
  nx: number;
  ny: number;
  nz: number;
  // 4 vertices in CCW order when viewed from outside the cube.
  corners: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number]
  ];
  // neighbor offset from voxel center to determine face visibility
  neighborOffset: readonly [number, number, number];
};

const FACES: readonly Face[] = [
  // +X
  {
    nx: 1,
    ny: 0,
    nz: 0,
    neighborOffset: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1]
    ]
  },
  // -X
  {
    nx: -1,
    ny: 0,
    nz: 0,
    neighborOffset: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0]
    ]
  },
  // +Y
  {
    nx: 0,
    ny: 1,
    nz: 0,
    neighborOffset: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0]
    ]
  },
  // -Y
  {
    nx: 0,
    ny: -1,
    nz: 0,
    neighborOffset: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1]
    ]
  },
  // +Z
  {
    nx: 0,
    ny: 0,
    nz: 1,
    neighborOffset: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1]
    ]
  },
  // -Z
  {
    nx: 0,
    ny: 0,
    nz: -1,
    neighborOffset: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  }
];

export function meshChunk(options: MeshChunkOptions): MeshData {
  const { chunk, origin, getVoxel } = options;

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  let faces = 0;

  // Iterate in a deterministic order (z, y, x) or similar; doesn't matter as long as stable.
  for (let z = 0; z < CHUNK_SIZE; z += 1) {
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const id = chunk.getLocal(x, y, z);
        const def = getBlockDef(id);
        if (!def.isRenderable) continue;

        const wx = origin.x + x;
        const wy = origin.y + y;
        const wz = origin.z + z;

        for (const face of FACES) {
          const [ox, oy, oz] = face.neighborOffset;
          const nId = getVoxel(wx + ox, wy + oy, wz + oz);
          const nDef = getBlockDef(nId);
          if (nDef.isSolid) continue; // cull internal faces

          const baseIndex = positions.length / 3;
          for (const c of face.corners) {
            positions.push(wx + c[0], wy + c[1], wz + c[2]);
            normals.push(face.nx, face.ny, face.nz);
            colors.push(def.color[0], def.color[1], def.color[2], 1);
          }

          // Two triangles: (0,1,2) and (0,2,3)
          indices.push(
            baseIndex + 0,
            baseIndex + 1,
            baseIndex + 2,
            baseIndex + 0,
            baseIndex + 2,
            baseIndex + 3
          );
          faces += 1;
        }
      }
    }
  }

  return { positions, normals, indices, colors, faces };
}

