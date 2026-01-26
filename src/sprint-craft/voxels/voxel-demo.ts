import type { BabylonApi, SceneLike } from "../app";
import type { CameraLike } from "../app";
import type { InputState } from "../input";
import { generateInitialWorld, DEFAULT_GENERATION } from "./generation";
import { createChunkRebuildScheduler } from "./rebuild-scheduler";
import { createChunkRenderer } from "./chunk-renderer";
import { createWorld } from "./world";
import { createHandAnimator } from "./hand-animation";
import { createPlayerAvatar } from "./player-avatar";
import { createPlayerController, computeEyeHeight } from "./player-controller";
import { createDefaultPlayerState } from "./player-state";
import { findSafeSpawnAboveGround } from "./spawn";
import { canPlaceBlock, createBlockInteractor } from "./block-interaction";
import { raycastVoxels } from "./raycast";
import { createNameplate } from "../ui/nameplate";
import { getBlockDef, getBlockPreviewColor, getHotbarBlockId } from "./blocks";
import { createTargeting } from "./targeting";
import { createTargetHighlight } from "./target-highlight";
import { createPlacementPreview } from "./placement-preview";
import { createCameraMode } from "./camera-mode";

export type VoxelDemo = {
  tick: (dtSec: number) => void;
  dispose: () => void;
  getChunkCount: () => number;
  getChunkMeshCount: () => number;
  getRebuildCount: () => number;
  getWorld: () => ReturnType<typeof createWorld>;
  getPlayerState: () => ReturnType<typeof createDefaultPlayerState>;
};

export const MOVEMENT_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD"] as const;
export type MovementKey = (typeof MOVEMENT_KEYS)[number];
export const SHOULDER_ORBIT_MAX_YAW = Math.PI / 3;
const ANCHOR_UPDATE_MAX_DELTA = 0.01;

const FACING_YAW_OFFSETS: Record<MovementKey, number> = {
  KeyW: 0,
  KeyS: Math.PI,
  KeyA: Math.PI / 2,
  KeyD: -Math.PI / 2
};

export function updateLastMovementKey(
  lastKey: MovementKey | null,
  wasPressed: (key: MovementKey) => boolean
): MovementKey | null {
  let next = lastKey;
  for (const key of MOVEMENT_KEYS) {
    if (wasPressed(key)) next = key;
  }
  return next;
}

export function resolveFacingKey(
  lastKey: MovementKey | null,
  isDown: (key: MovementKey) => boolean
): MovementKey | null {
  const held = MOVEMENT_KEYS.filter((key) => isDown(key));
  if (held.length === 0) return null;
  if (lastKey && isDown(lastKey)) return lastKey;
  return held[0] ?? null;
}

export function facingYawFromKey(cameraYaw: number, key: MovementKey | null): number {
  if (!key) return cameraYaw;
  return cameraYaw + FACING_YAW_OFFSETS[key];
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clampShoulderYaw(yaw: number, anchorYaw: number): number {
  const delta = normalizeAngle(yaw - anchorYaw);
  if (delta > SHOULDER_ORBIT_MAX_YAW) return anchorYaw + SHOULDER_ORBIT_MAX_YAW;
  if (delta < -SHOULDER_ORBIT_MAX_YAW) return anchorYaw - SHOULDER_ORBIT_MAX_YAW;
  return yaw;
}

export function createVoxelDemo(options: {
  babylon: BabylonApi;
  scene: SceneLike;
  camera: CameraLike;
  input: InputState;
  getSelectedSlot: () => number;
  rebuildBudgetPerFrame?: number;
}): VoxelDemo {
  const { babylon, scene, camera, input, getSelectedSlot, rebuildBudgetPerFrame = 2 } = options;

  const world = createWorld();
  const scheduler = createChunkRebuildScheduler();
  const renderer = createChunkRenderer({ babylon, scene, world });

  const { generatedChunks } = generateInitialWorld(world, DEFAULT_GENERATION);

  // Initial build: mark generated chunks dirty and rebuild them.
  for (const c of generatedChunks) scheduler.markDirty(c.cx, c.cy, c.cz);

  let rebuildCount = 0;
  const rebuildOne = (id: { cx: number; cy: number; cz: number }) => {
    const chunk = world.getChunk(id.cx, id.cy, id.cz);
    if (!chunk) return;
    renderer.upsertChunkMesh(chunk);
    rebuildCount += 1;
  };

  // Build everything immediately once so the world is visible at boot.
  scheduler.step(Number.POSITIVE_INFINITY, rebuildOne);

  const playerModel = createDefaultPlayerState();
  const player = createPlayerController({
    input,
    camera,
    getVoxel: world.getVoxel,
    spawn: () =>
      findSafeSpawnAboveGround({
        world,
        player: playerModel,
        halfWidth: 0.3,
        column: { x: 0, z: 0 }
      })
  });

  const avatar = createPlayerAvatar({ babylon, scene });
  const nameplate = createNameplate({ babylon, scene, text: "<User 1>" });
  const handAnimator = createHandAnimator();
  let actionTriggered = false;
  let lastMoveKey: MovementKey | null = null;
  let shoulderAnchorYaw = camera.rotation?.y ?? 0;
  const cameraMode = createCameraMode();
  let lastCameraMode = cameraMode.getMode();
  const targetMaxDistance = 6;
  const targeting = createTargeting({ camera, world, maxDistance: targetMaxDistance });
  const highlight = createTargetHighlight({ babylon, scene });
  const preview = createPlacementPreview({ babylon, scene });

  const interactor = createBlockInteractor({
    input,
    camera,
    world,
    scheduler,
    player: player.state,
    getSelectedSlot,
    getTarget: () => targeting.get().hit,
    maxDistance: targetMaxDistance,
    onAction: () => {
      actionTriggered = true;
    }
  });

  const cameraOffset = { right: 0.35, up: -0.1, back: 2.1 };
  const minCameraDistance = 0.4;

  const tick = (dtSec: number) => {
    player.tick(dtSec);
    cameraMode.toggleIfPressed((code) => input.wasKeyPressed(code));

    lastMoveKey = updateLastMovementKey(lastMoveKey, (key) => input.wasKeyPressed(key));
    const pressedMoveKey = MOVEMENT_KEYS.find((key) => input.wasKeyPressed(key)) ?? null;
    const facingKey = resolveFacingKey(lastMoveKey, (key) => input.isKeyDown(key));
    const isMoving = MOVEMENT_KEYS.some((key) => input.isKeyDown(key));

    const currentMode = cameraMode.getMode();
    const isFirstPerson = currentMode === "firstPerson";
    if (currentMode !== lastCameraMode) {
      if (!isFirstPerson && camera.rotation) {
        camera.rotation.y = shoulderAnchorYaw;
      }
      lastCameraMode = currentMode;
    }

    let yaw = camera.rotation?.y ?? 0;
    if (!isFirstPerson) {
      const clampedYaw = clampShoulderYaw(yaw, shoulderAnchorYaw);
      if (pressedMoveKey) {
        const delta = Math.abs(normalizeAngle(clampedYaw - shoulderAnchorYaw));
        if (delta <= ANCHOR_UPDATE_MAX_DELTA) {
          shoulderAnchorYaw = clampedYaw;
        }
      }
      yaw = clampedYaw;
      if (camera.rotation) camera.rotation.y = yaw;
    }

    const avatarYaw = facingYawFromKey(yaw, facingKey);

    const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const back = { x: -forward.x, z: -forward.z };

    const eyeHeight = computeEyeHeight(
      player.state.colliderHeights[player.state.stance]
    );
    const anchor = {
      x: player.state.position.x,
      y: player.state.position.y + eyeHeight,
      z: player.state.position.z
    };
    if (isFirstPerson) {
      camera.position.x = anchor.x;
      camera.position.y = anchor.y;
      camera.position.z = anchor.z;
    } else {
      const desired = {
        x: anchor.x + right.x * cameraOffset.right + back.x * cameraOffset.back,
        y: anchor.y + cameraOffset.up,
        z: anchor.z + right.z * cameraOffset.right + back.z * cameraOffset.back
      };

      const dir = {
        x: desired.x - anchor.x,
        y: desired.y - anchor.y,
        z: desired.z - anchor.z
      };
      const dist = Math.hypot(dir.x, dir.y, dir.z);
      const norm =
        dist > 1e-6
          ? { x: dir.x / dist, y: dir.y / dist, z: dir.z / dist }
          : { x: 0, y: 0, z: -1 };

      let targetDistance = dist;
      if (dist > 0) {
        const hit = raycastVoxels({
          origin: anchor,
          direction: norm,
          maxDistance: dist,
          getVoxel: world.getVoxel
        });
        if (hit) {
          targetDistance = Math.max(minCameraDistance, hit.distance - 0.1);
        }
      }

      camera.position.x = anchor.x + norm.x * targetDistance;
      camera.position.y = anchor.y + norm.y * targetDistance;
      camera.position.z = anchor.z + norm.z * targetDistance;
    }

    const target = targeting.update();
    highlight.update(target.hit);
    const previewColor = getBlockPreviewColor(
      getBlockDef(getHotbarBlockId(getSelectedSlot()))
    );
    const canPreview =
      !!target.placement &&
      canPlaceBlock({ world, player: player.state, target: target.placement });
    preview.update({
      position: canPreview ? target.placement : null,
      color: previewColor
    });

    interactor.tick(dtSec);

    const moveSpeed = Math.hypot(player.state.velocity.x, player.state.velocity.z);
    const swing = handAnimator.update({
      dtSec,
      moveSpeed,
      actionTriggered
    });
    actionTriggered = false;

    const isAiming =
      input.isMouseDown(0) ||
      input.isMouseDown(2) ||
      input.wasMousePressed(0) ||
      input.wasMousePressed(2);
    const rightArmPose = isMoving || isAiming ? "forward" : "idle";

    avatar.setPose({
      position: player.state.position,
      yaw: avatarYaw,
      stance: player.state.stance,
      swing,
      rightArmPose
    });
    avatar.setFirstPersonVisibility(isFirstPerson);

    const headPos = avatar.getHeadPosition();
    nameplate.setPosition({
      x: headPos.x,
      y: headPos.y + 0.25 + (eyeHeight * 0.05),
      z: headPos.z
    });

    scheduler.step(rebuildBudgetPerFrame, rebuildOne);
  };

  return {
    tick,
    dispose: () => {
      renderer.dispose();
      highlight.dispose();
      preview.dispose();
      avatar.dispose();
      nameplate.dispose();
    },
    getChunkCount: () => world.chunks.size,
    getChunkMeshCount: () => renderer.getMeshCount(),
    getRebuildCount: () => rebuildCount,
    getWorld: () => world,
    getPlayerState: () => player.state
  };
}

