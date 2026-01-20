import { getBlockDef, getBlockFaceColor, type FaceDirection } from "../blocks";
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
  // Face direction for per-face coloring
  direction: FaceDirection;
  // 4 vertices in CW order when viewed from outside the cube (Babylon.js left-handed).
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
  // +X (side face)
  {
    nx: 1,
    ny: 0,
    nz: 0,
    direction: "side",
    neighborOffset: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1]
    ]
  },
  // -X (side face)
  {
    nx: -1,
    ny: 0,
    nz: 0,
    direction: "side",
    neighborOffset: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0]
    ]
  },
  // +Y (top face)
  {
    nx: 0,
    ny: 1,
    nz: 0,
    direction: "top",
    neighborOffset: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0]
    ]
  },
  // -Y (bottom face)
  {
    nx: 0,
    ny: -1,
    nz: 0,
    direction: "bottom",
    neighborOffset: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1]
    ]
  },
  // +Z (side face)
  {
    nx: 0,
    ny: 0,
    nz: 1,
    direction: "side",
    neighborOffset: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1]
    ]
  },
  // -Z (side face)
  {
    nx: 0,
    ny: 0,
    nz: -1,
    direction: "side",
    neighborOffset: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  }
];

/**
 * Compute a shading multiplier based on face direction.
 * This gives different faces different brightness to help define edges.
 * Top faces are brightest, side faces medium, bottom faces darkest.
 */
function getFaceShading(face: Face): number {
  // Top faces: brightest
  if (face.ny > 0) return 1.0;
  // Bottom faces: darkest
  if (face.ny < 0) return 0.65;
  // Side faces: vary slightly by direction for edge definition
  // +X/-X sides slightly different from +Z/-Z sides
  if (face.nx !== 0) return 0.8;
  return 0.85;
}

/**
 * Compute altitude-based shading to give depth perception.
 * Blocks at higher altitude are slightly brighter.
 * Range: 0.75 (at y=-16) to 1.0 (at y=48+)
 */
function getAltitudeShading(wy: number): number {
  // Normalize y to a 0..1 range across typical world height
  const minY = -16;
  const maxY = 48;
  const t = Math.max(0, Math.min(1, (wy - minY) / (maxY - minY)));
  // Subtle brightness boost from 0.8 to 1.0
  return 0.8 + t * 0.2;
}

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

          // Get face-specific color (supports per-face coloring for blocks like grass)
          const faceColor = getBlockFaceColor(def, face.direction);
          
          // Apply face-direction shading and altitude shading for better depth perception
          const faceShade = getFaceShading(face);
          const altShade = getAltitudeShading(wy);
          const combinedShade = faceShade * altShade;

          const baseIndex = positions.length / 3;
          for (const c of face.corners) {
            positions.push(wx + c[0], wy + c[1], wz + c[2]);
            normals.push(face.nx, face.ny, face.nz);
            // Apply shading to vertex colors
            colors.push(
              faceColor[0] * combinedShade,
              faceColor[1] * combinedShade,
              faceColor[2] * combinedShade,
              1
            );
          }

          // Two triangles: (0,2,1) and (0,3,2) - CW winding for Babylon.js left-handed system
          indices.push(
            baseIndex + 0,
            baseIndex + 2,
            baseIndex + 1,
            baseIndex + 0,
            baseIndex + 3,
            baseIndex + 2
          );
          faces += 1;
        }
      }
    }
  }

  return { positions, normals, indices, colors, faces };
}

