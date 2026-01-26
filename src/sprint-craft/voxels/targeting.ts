import type { CameraLike } from "../app";
import { raycastVoxels, type RaycastHit, type Vec3 } from "./raycast";
import type { World } from "./world";

export type PlacementTarget = {
  x: number;
  y: number;
  z: number;
};

export type TargetingResult = {
  hit: RaycastHit | null;
  placement: PlacementTarget | null;
};

export type TargetingHandle = {
  update: () => TargetingResult;
  get: () => TargetingResult;
};

const DEFAULT_MAX_DISTANCE = 6;

export function getCameraForward(camera: CameraLike): Vec3 {
  const yaw = camera.rotation?.y ?? 0;
  const pitch = camera.rotation?.x ?? 0;
  const cosPitch = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cosPitch,
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * cosPitch
  };
}

export function getPlacementTarget(hit: RaycastHit | null): PlacementTarget | null {
  if (!hit) return null;
  return {
    x: hit.wx + hit.face.x,
    y: hit.wy + hit.face.y,
    z: hit.wz + hit.face.z
  };
}

export function createTargeting(options: {
  camera: CameraLike;
  world: World;
  maxDistance?: number;
}): TargetingHandle {
  const { camera, world, maxDistance = DEFAULT_MAX_DISTANCE } = options;
  let current: TargetingResult = { hit: null, placement: null };

  const update = () => {
    const hit = raycastVoxels({
      origin: camera.position,
      direction: getCameraForward(camera),
      maxDistance,
      getVoxel: world.getVoxel
    });
    current = { hit, placement: getPlacementTarget(hit) };
    return current;
  };

  return {
    update,
    get: () => current
  };
}
