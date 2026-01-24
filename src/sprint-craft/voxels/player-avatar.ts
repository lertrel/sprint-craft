import type { BabylonApi, SceneLike, Vec3Like } from "../app";
import type { PlayerStance } from "./player-state";

type MeshLike = {
  name?: string;
  position: Vec3Like;
  rotation: Vec3Like;
  scaling: Vec3Like;
  parent?: MeshLike | null;
  isVisible?: boolean;
  dispose?: () => void;
};

export type PlayerAvatarParts = {
  head: MeshLike;
  torso: MeshLike;
  upperArmL: MeshLike;
  lowerArmL: MeshLike;
  upperArmR: MeshLike;
  lowerArmR: MeshLike;
  upperLegL: MeshLike;
  lowerLegL: MeshLike;
  upperLegR: MeshLike;
  lowerLegR: MeshLike;
};

export type PlayerAvatar = {
  parts: PlayerAvatarParts;
  setPose: (pose: {
    position: Vec3Like;
    yaw: number;
    stance: PlayerStance;
    swing: { left: number; right: number };
  }) => void;
  getHeadPosition: () => Vec3Like;
  getStandingHeight: () => number;
  dispose: () => void;
};

const DIMENSIONS = {
  head: { w: 0.35, h: 0.3, d: 0.35 },
  torso: { w: 0.5, h: 0.6, d: 0.3 },
  arm: { w: 0.18, h: 0.35, d: 0.18 },
  leg: { w: 0.2, h: 0.45, d: 0.2 }
};

const STANDING_HEIGHT =
  DIMENSIONS.leg.h * 2 + DIMENSIONS.torso.h + DIMENSIONS.head.h;

export function createPlayerAvatar(options: {
  babylon: BabylonApi;
  scene: SceneLike;
}): PlayerAvatar {
  const { babylon, scene } = options;
  const builder = babylon.MeshBuilder;
  if (!builder.CreateBox) {
    throw new Error("MeshBuilder.CreateBox is required for player avatar");
  }

  const material =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial("playerMat", scene as any);
          if ("Color3" in babylon) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).diffuseColor = new (babylon as any).Color3(0.75, 0.8, 0.9);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).specularColor = new (babylon as any).Color3(0.1, 0.1, 0.1);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).disableLighting = false;
          return mat as unknown;
        })()
      : null;

  const makeBox = (name: string, size: { w: number; h: number; d: number }, parent?: MeshLike) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = builder.CreateBox(
      name,
      { width: size.w, height: size.h, depth: size.d },
      scene as any
    ) as MeshLike;
    if (!mesh.position) mesh.position = { x: 0, y: 0, z: 0 };
    if (!mesh.rotation) mesh.rotation = { x: 0, y: 0, z: 0 };
    if (!mesh.scaling) mesh.scaling = { x: 1, y: 1, z: 1 };
    if (material) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mesh as any).material = material as any;
    }
    if (parent) mesh.parent = parent;
    return mesh;
  };

  const head = makeBox("player:head", DIMENSIONS.head);
  const torso = makeBox("player:torso", DIMENSIONS.torso);
  const upperArmL = makeBox("player:upperArmL", DIMENSIONS.arm);
  const lowerArmL = makeBox("player:lowerArmL", DIMENSIONS.arm);
  const upperArmR = makeBox("player:upperArmR", DIMENSIONS.arm);
  const lowerArmR = makeBox("player:lowerArmR", DIMENSIONS.arm);
  const upperLegL = makeBox("player:upperLegL", DIMENSIONS.leg);
  const lowerLegL = makeBox("player:lowerLegL", DIMENSIONS.leg);
  const upperLegR = makeBox("player:upperLegR", DIMENSIONS.leg);
  const lowerLegR = makeBox("player:lowerLegR", DIMENSIONS.leg);

  const legTotal = DIMENSIONS.leg.h * 2;
  const torsoCenterY = legTotal + DIMENSIONS.torso.h / 2;
  const headCenterY = legTotal + DIMENSIONS.torso.h + DIMENSIONS.head.h / 2;
  const shoulderY = legTotal + DIMENSIONS.torso.h - 0.05;

  const armX = DIMENSIONS.torso.w / 2 + DIMENSIONS.arm.w / 2 + 0.05;
  const legX = DIMENSIONS.torso.w / 2 - DIMENSIONS.leg.w / 2 - 0.05;

  const lowerArmY = shoulderY - DIMENSIONS.arm.h - DIMENSIONS.arm.h / 2;
  const upperLegY = DIMENSIONS.leg.h + DIMENSIONS.leg.h / 2;
  const lowerLegY = DIMENSIONS.leg.h / 2;

  const basePositions: Record<keyof PlayerAvatarParts, Vec3Like> = {
    head: { x: 0, y: headCenterY, z: 0 },
    torso: { x: 0, y: torsoCenterY, z: 0 },
    upperArmL: { x: -armX, y: shoulderY - DIMENSIONS.arm.h / 2, z: 0 },
    lowerArmL: { x: -armX, y: lowerArmY, z: 0 },
    upperArmR: { x: armX, y: shoulderY - DIMENSIONS.arm.h / 2, z: 0 },
    lowerArmR: { x: armX, y: lowerArmY, z: 0 },
    upperLegL: { x: -legX, y: upperLegY, z: 0 },
    lowerLegL: { x: -legX, y: lowerLegY, z: 0 },
    upperLegR: { x: legX, y: upperLegY, z: 0 },
    lowerLegR: { x: legX, y: lowerLegY, z: 0 }
  };

  const parts: PlayerAvatarParts = {
    head,
    torso,
    upperArmL,
    lowerArmL,
    upperArmR,
    lowerArmR,
    upperLegL,
    lowerLegL,
    upperLegR,
    lowerLegR
  };

  let currentPose: {
    position: Vec3Like;
    stance: PlayerStance;
  } = {
    position: { x: 0, y: 0, z: 0 },
    stance: "standing"
  };

  const applyScale = (mesh: MeshLike, base: Vec3Like, scaleY: number, yaw: number, origin: Vec3Like) => {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const rx = base.x * cos - base.z * sin;
    const rz = base.x * sin + base.z * cos;
    mesh.position.x = origin.x + rx;
    mesh.position.y = origin.y + base.y * scaleY;
    mesh.position.z = origin.z + rz;
    mesh.scaling.x = 1;
    mesh.scaling.y = scaleY;
    mesh.scaling.z = 1;
  };

  const setPose = (pose: {
    position: Vec3Like;
    yaw: number;
    stance: PlayerStance;
    swing: { left: number; right: number };
  }) => {
    const stanceHeight =
      pose.stance === "standing"
        ? STANDING_HEIGHT
        : pose.stance === "crouching"
          ? 1.4
          : 1.0;
    const scaleY = stanceHeight / STANDING_HEIGHT;

    currentPose = { position: pose.position, stance: pose.stance };

    applyScale(head, basePositions.head, scaleY, pose.yaw, pose.position);
    applyScale(torso, basePositions.torso, scaleY, pose.yaw, pose.position);
    applyScale(upperArmL, basePositions.upperArmL, scaleY, pose.yaw, pose.position);
    applyScale(upperArmR, basePositions.upperArmR, scaleY, pose.yaw, pose.position);
    applyScale(lowerArmL, basePositions.lowerArmL, scaleY, pose.yaw, pose.position);
    applyScale(lowerArmR, basePositions.lowerArmR, scaleY, pose.yaw, pose.position);
    applyScale(upperLegL, basePositions.upperLegL, scaleY, pose.yaw, pose.position);
    applyScale(upperLegR, basePositions.upperLegR, scaleY, pose.yaw, pose.position);
    applyScale(lowerLegL, basePositions.lowerLegL, scaleY, pose.yaw, pose.position);
    applyScale(lowerLegR, basePositions.lowerLegR, scaleY, pose.yaw, pose.position);

    head.rotation.y = pose.yaw;
    torso.rotation.y = pose.yaw;
    upperArmL.rotation.y = pose.yaw;
    upperArmR.rotation.y = pose.yaw;
    lowerArmL.rotation.y = pose.yaw;
    lowerArmR.rotation.y = pose.yaw;
    upperLegL.rotation.y = pose.yaw;
    upperLegR.rotation.y = pose.yaw;
    lowerLegL.rotation.y = pose.yaw;
    lowerLegR.rotation.y = pose.yaw;

    upperArmL.rotation.x = pose.swing.left;
    upperArmR.rotation.x = pose.swing.right;
    lowerArmL.rotation.x = pose.swing.left * 0.5;
    lowerArmR.rotation.x = pose.swing.right * 0.5;
  };

  const getHeadPosition = (): Vec3Like => {
    const stanceHeight =
      currentPose.stance === "standing"
        ? STANDING_HEIGHT
        : currentPose.stance === "crouching"
          ? 1.4
          : 1.0;
    const scaleY = stanceHeight / STANDING_HEIGHT;
    const headY = basePositions.head.y * scaleY;
    return {
      x: currentPose.position.x,
      y: currentPose.position.y + headY,
      z: currentPose.position.z
    };
  };

  return {
    parts,
    setPose,
    getHeadPosition,
    getStandingHeight: () => STANDING_HEIGHT,
    dispose: () => {
      const all = Object.values(parts);
      for (const mesh of all) mesh.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
    }
  };
}
