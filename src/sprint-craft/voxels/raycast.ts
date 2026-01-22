import { getBlockDef } from "./blocks";

export type Vec3 = { x: number; y: number; z: number };

export type RaycastHit = {
  wx: number;
  wy: number;
  wz: number;
  face: Vec3;
  distance: number;
};

const EPSILON = 1e-8;

function normalize(v: Vec3): Vec3 | null {
  const len = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(len) || len < EPSILON) return null;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function intbound(s: number, ds: number): number {
  if (ds > 0) {
    return (Math.floor(s + 1) - s) / ds;
  }
  if (ds < 0) {
    return (s - Math.floor(s)) / -ds;
  }
  return Number.POSITIVE_INFINITY;
}

export function raycastVoxels(options: {
  origin: Vec3;
  direction: Vec3;
  maxDistance: number;
  getVoxel: (wx: number, wy: number, wz: number) => number;
}): RaycastHit | null {
  const { origin, direction, maxDistance, getVoxel } = options;
  const dir = normalize(direction);
  if (!dir) return null;

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
  const stepY = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
  const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;

  let tMaxX = intbound(origin.x, dir.x);
  let tMaxY = intbound(origin.y, dir.y);
  let tMaxZ = intbound(origin.z, dir.z);

  const tDeltaX = stepX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dir.x);
  const tDeltaY = stepY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dir.y);
  const tDeltaZ = stepZ === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dir.z);

  let t = 0;
  let face: Vec3 = { x: 0, y: 0, z: 0 };

  while (t <= maxDistance) {
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      face = { x: -stepX, y: 0, z: 0 };
    } else if (tMaxY <= tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      face = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      face = { x: 0, y: 0, z: -stepZ };
    }

    if (t > maxDistance) break;

    const id = getVoxel(x, y, z);
    if (getBlockDef(id).isSolid) {
      return { wx: x, wy: y, wz: z, face, distance: t };
    }
  }

  return null;
}
