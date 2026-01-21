import { getBlockDef } from "./blocks";
import { BlockId } from "./blocks";
import type { World } from "./world";
import { aabbIntersectsSolidVoxels, makePlayerAabb, type VoxelGetter } from "./voxel-collision";
import type { PlayerState } from "./player-state";

function isSolid(getVoxel: VoxelGetter, wx: number, wy: number, wz: number): boolean {
  const id = getVoxel(wx, wy, wz);
  if (id === BlockId.Air) return false;
  return getBlockDef(id).isSolid;
}

export function findTopSolidY(getVoxel: VoxelGetter, wx: number, wz: number, options?: { minY?: number; maxY?: number }): number {
  const minY = options?.minY ?? -32;
  const maxY = options?.maxY ?? 64;
  let top = Number.NEGATIVE_INFINITY;
  for (let y = minY; y <= maxY; y += 1) {
    if (isSolid(getVoxel, wx, y, wz)) top = y;
  }
  return top;
}

export function findSafeSpawnAboveGround(options: {
  world: World;
  player: PlayerState;
  halfWidth: number;
  /**
   * Which world column to spawn above.
   * (kept explicit for deterministic testing)
   */
  column: { x: number; z: number };
}): { x: number; y: number; z: number } {
  const { world, player, halfWidth, column } = options;

  const wx = column.x;
  const wz = column.z;

  const top = findTopSolidY(world.getVoxel, wx, wz, { minY: -8, maxY: 64 });
  const baseY = Number.isFinite(top) ? top + 2 : 8;

  // Spawn near the center of the voxel column for stability.
  const x = wx + 0.5;
  const z = wz + 0.5;

  // Ensure clearance for standing; if not possible, try higher.
  const height = player.colliderHeights.standing;
  let y = baseY;
  for (let tries = 0; tries < 64; tries += 1) {
    const aabb = makePlayerAabb({ position: { x, y, z }, halfWidth, height });
    if (!aabbIntersectsSolidVoxels(world.getVoxel, aabb)) return { x, y, z };
    y += 1;
  }

  // As a last resort (should not happen with current terrain), place very high.
  return { x, y: 64, z };
}

