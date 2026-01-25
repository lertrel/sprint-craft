import type { CameraLike } from "../app";
import type { InputState } from "../input";
import { BlockId, getBlockDef, getHotbarBlockId } from "./blocks";
import { DEFAULT_PLAYER_TUNING } from "./player-controller";
import type { PlayerState } from "./player-state";
import { raycastVoxels } from "./raycast";
import type { ChunkRebuildScheduler } from "./rebuild-scheduler";
import type { World } from "./world";
import { aabbIntersectsAabb, makePlayerAabb } from "./voxel-collision";

export type BlockInteractor = {
  tick: (dtSec: number) => void;
};

export type BlockInteractorOptions = {
  input: InputState;
  camera: CameraLike;
  world: World;
  scheduler: ChunkRebuildScheduler;
  player: PlayerState;
  getSelectedSlot: () => number;
  maxDistance?: number;
  cooldownSec?: number;
  onAction?: (action: "break" | "place") => void;
};

const DEFAULT_MAX_DISTANCE = 6;
const DEFAULT_COOLDOWN_SEC = 0.2;

function getCameraForward(camera: CameraLike): { x: number; y: number; z: number } {
  const yaw = camera.rotation?.y ?? 0;
  const pitch = camera.rotation?.x ?? 0;
  const cosPitch = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cosPitch,
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * cosPitch
  };
}

export function createBlockInteractor(options: BlockInteractorOptions): BlockInteractor {
  const {
    input,
    camera,
    world,
    scheduler,
    player,
    getSelectedSlot,
    maxDistance = DEFAULT_MAX_DISTANCE,
    cooldownSec = DEFAULT_COOLDOWN_SEC,
    onAction
  } = options;

  let cooldownRemaining = 0;

  const tryBreak = (): boolean => {
    const hit = raycastVoxels({
      origin: camera.position,
      direction: getCameraForward(camera),
      maxDistance,
      getVoxel: world.getVoxel
    });
    if (!hit) return false;

    const id = world.getVoxel(hit.wx, hit.wy, hit.wz);
    if (id === BlockId.Air || !getBlockDef(id).isSolid) return false;

    world.setVoxel(hit.wx, hit.wy, hit.wz, BlockId.Air);
    scheduler.markDirtyForWorldVoxel(hit.wx, hit.wy, hit.wz);
    onAction?.("break");
    return true;
  };

  const tryPlace = (): boolean => {
    const hit = raycastVoxels({
      origin: camera.position,
      direction: getCameraForward(camera),
      maxDistance,
      getVoxel: world.getVoxel
    });
    if (!hit) return false;

    const target = {
      x: hit.wx + hit.face.x,
      y: hit.wy + hit.face.y,
      z: hit.wz + hit.face.z
    };

    if (world.getVoxel(target.x, target.y, target.z) !== BlockId.Air) return false;

    const playerHeight = player.colliderHeights[player.stance];
    const playerAabb = makePlayerAabb({
      position: player.position,
      halfWidth: DEFAULT_PLAYER_TUNING.halfWidth,
      height: playerHeight
    });
    const blockAabb = {
      min: { x: target.x, y: target.y, z: target.z },
      max: { x: target.x + 1, y: target.y + 1, z: target.z + 1 }
    };
    if (aabbIntersectsAabb(playerAabb, blockAabb)) return false;

    const blockId = getHotbarBlockId(getSelectedSlot());
    world.setVoxel(target.x, target.y, target.z, blockId);
    scheduler.markDirtyForWorldVoxel(target.x, target.y, target.z);
    onAction?.("place");
    return true;
  };

  const tick = (dtSec: number) => {
    const dt = Number.isFinite(dtSec) ? dtSec : 0;
    cooldownRemaining = Math.max(0, cooldownRemaining - dt);
    if (cooldownRemaining > 0) return;

    const wantsBreak = input.wasMousePressed(0) || input.isMouseDown(0);
    const wantsPlace = input.wasMousePressed(2) || input.isMouseDown(2);

    if (wantsBreak) {
      if (tryBreak()) cooldownRemaining = cooldownSec;
      return;
    }

    if (wantsPlace) {
      if (tryPlace()) cooldownRemaining = cooldownSec;
    }
  };

  return { tick };
}
