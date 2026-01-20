import { getBlockDef } from "./blocks";
import { BlockId } from "./blocks";

export type Aabb = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

export type VoxelGetter = (wx: number, wy: number, wz: number) => number;

export function makePlayerAabb(options: {
  position: { x: number; y: number; z: number }; // feet position
  halfWidth: number;
  height: number;
}): Aabb {
  const { position, halfWidth, height } = options;
  return {
    min: { x: position.x - halfWidth, y: position.y, z: position.z - halfWidth },
    max: { x: position.x + halfWidth, y: position.y + height, z: position.z + halfWidth }
  };
}

function voxelIsSolid(getVoxel: VoxelGetter, wx: number, wy: number, wz: number): boolean {
  const id = getVoxel(wx, wy, wz);
  if (id === BlockId.Air) return false;
  return getBlockDef(id).isSolid;
}

// Small epsilon to avoid floating-point precision issues at integer boundaries.
// This ensures that when the player is exactly at a boundary, we get consistent behavior.
const COLLISION_EPSILON = 0.001;

export function aabbIntersectsSolidVoxels(getVoxel: VoxelGetter, aabb: Aabb): boolean {
  // Voxels are unit cubes at integer coordinates [x,x+1) etc.
  // We shrink the AABB slightly inward to avoid false positives when merely touching a face.
  // This treats exact face-touching as non-intersecting, which allows sliding along walls.
  const minX = Math.floor(aabb.min.x + COLLISION_EPSILON);
  const maxX = Math.floor(aabb.max.x - COLLISION_EPSILON);
  const minY = Math.floor(aabb.min.y + COLLISION_EPSILON);
  const maxY = Math.floor(aabb.max.y - COLLISION_EPSILON);
  const minZ = Math.floor(aabb.min.z + COLLISION_EPSILON);
  const maxZ = Math.floor(aabb.max.z - COLLISION_EPSILON);

  for (let z = minZ; z <= maxZ; z += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (voxelIsSolid(getVoxel, x, y, z)) return true;
      }
    }
  }
  return false;
}

type ResolveResult = {
  position: { x: number; y: number; z: number };
  collided: { x: boolean; y: boolean; z: boolean };
  grounded: boolean;
};

function resolveAxis(options: {
  getVoxel: VoxelGetter;
  position: { x: number; y: number; z: number };
  delta: { x: number; y: number; z: number };
  axis: "x" | "y" | "z";
  halfWidth: number;
  height: number;
}): { pos: { x: number; y: number; z: number }; collided: boolean; grounded: boolean } {
  const { getVoxel, position, delta, axis, halfWidth, height } = options;
  const next = { x: position.x + delta.x, y: position.y + delta.y, z: position.z + delta.z };
  const aabb = makePlayerAabb({ position: next, halfWidth, height });
  if (!aabbIntersectsSolidVoxels(getVoxel, aabb)) {
    return { pos: next, collided: false, grounded: false };
  }

  // Find all voxels that could potentially intersect the AABB.
  // Use a slightly expanded range to ensure we catch all relevant voxels.
  const minX = Math.floor(aabb.min.x);
  const maxX = Math.floor(aabb.max.x);
  const minY = Math.floor(aabb.min.y);
  const maxY = Math.floor(aabb.max.y);
  const minZ = Math.floor(aabb.min.z);
  const maxZ = Math.floor(aabb.max.z);

  let grounded = false;
  const corrected = { ...next };
  let didClamp = false;

  for (let z = minZ; z <= maxZ; z += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!voxelIsSolid(getVoxel, x, y, z)) continue;
        if (axis === "x") {
          if (delta.x > 0) {
            // Push back so player's right edge doesn't penetrate block's left edge
            const candidateX = x - halfWidth - COLLISION_EPSILON;
            if (!didClamp || candidateX < corrected.x) corrected.x = candidateX;
            didClamp = true;
          } else if (delta.x < 0) {
            // Push forward so player's left edge doesn't penetrate block's right edge
            const candidateX = (x + 1) + halfWidth + COLLISION_EPSILON;
            if (!didClamp || candidateX > corrected.x) corrected.x = candidateX;
            didClamp = true;
          }
        } else if (axis === "z") {
          if (delta.z > 0) {
            const candidateZ = z - halfWidth - COLLISION_EPSILON;
            if (!didClamp || candidateZ < corrected.z) corrected.z = candidateZ;
            didClamp = true;
          } else if (delta.z < 0) {
            const candidateZ = (z + 1) + halfWidth + COLLISION_EPSILON;
            if (!didClamp || candidateZ > corrected.z) corrected.z = candidateZ;
            didClamp = true;
          }
        } else {
          if (delta.y > 0) {
            // Hitting ceiling - push down
            const candidateY = y - height - COLLISION_EPSILON;
            if (!didClamp || candidateY < corrected.y) corrected.y = candidateY;
            didClamp = true;
          } else if (delta.y < 0) {
            // Landing on ground - push up to stand on top of block
            const candidateY = y + 1;
            if (!didClamp || candidateY > corrected.y) corrected.y = candidateY;
            didClamp = true;
            grounded = true;
          }
        }
      }
    }
  }
  return { pos: corrected, collided: didClamp, grounded };
}

export function moveAndCollideAabb(options: {
  getVoxel: VoxelGetter;
  position: { x: number; y: number; z: number }; // feet position
  delta: { x: number; y: number; z: number };
  halfWidth: number;
  height: number;
  stepHeight?: number;
  allowStepUp?: boolean;
}): ResolveResult {
  const { getVoxel, position, delta, halfWidth, height, stepHeight = 0.5, allowStepUp = true } = options;

  // Horizontal first with optional minimal step-up.
  const tryHorizontal = (pos: { x: number; y: number; z: number }) => {
    const rx = resolveAxis({
      getVoxel,
      position: pos,
      delta: { x: delta.x, y: 0, z: 0 },
      axis: "x",
      halfWidth,
      height
    });
    const rz = resolveAxis({
      getVoxel,
      position: rx.pos,
      delta: { x: 0, y: 0, z: delta.z },
      axis: "z",
      halfWidth,
      height
    });
    return {
      pos: rz.pos,
      collidedX: rx.collided,
      collidedZ: rz.collided
    };
  };

  let pos = { ...position };
  let collidedX = false;
  let collidedZ = false;

  const h0 = tryHorizontal(pos);
  pos = h0.pos;
  collidedX = h0.collidedX;
  collidedZ = h0.collidedZ;

  if (allowStepUp && (collidedX || collidedZ) && stepHeight > 0) {
    // Attempt to step up and re-apply horizontal motion to avoid snagging.
    const stepped = { x: position.x, y: position.y + stepHeight, z: position.z };
    const steppedAabb = makePlayerAabb({ position: stepped, halfWidth, height });
    if (!aabbIntersectsSolidVoxels(getVoxel, steppedAabb)) {
      const hs = tryHorizontal(stepped);
      // Accept the step only if it reduces horizontal collisions.
      if ((!hs.collidedX && collidedX) || (!hs.collidedZ && collidedZ) || (!hs.collidedX && !hs.collidedZ)) {
        pos = hs.pos;
        collidedX = hs.collidedX;
        collidedZ = hs.collidedZ;
      }
    }
  }

  // Vertical after horizontal.
  const ry = resolveAxis({
    getVoxel,
    position: pos,
    delta: { x: 0, y: delta.y, z: 0 },
    axis: "y",
    halfWidth,
    height
  });
  pos = ry.pos;

  return {
    position: pos,
    collided: { x: collidedX, y: ry.collided, z: collidedZ },
    grounded: ry.grounded
  };
}

