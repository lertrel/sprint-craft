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
  frontMarker: MeshLike;
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
    rightArmPose?: RightArmPose;
  }) => void;
  setFirstPersonVisibility: (isFirstPerson: boolean) => void;
  getHeadPosition: () => Vec3Like;
  getStandingHeight: () => number;
  dispose: () => void;
};

export type RightArmPose = "idle" | "forward";

const DIMENSIONS = {
  head: { w: 0.35, h: 0.3, d: 0.35 },
  torso: { w: 0.5, h: 0.6, d: 0.3 },
  arm: { w: 0.18, h: 0.35, d: 0.18 },
  leg: { w: 0.2, h: 0.45, d: 0.2 },
  marker: { w: 0.14, h: 0.14, d: 0.06 }
};

const STANDING_HEIGHT =
  DIMENSIONS.leg.h * 2 + DIMENSIONS.torso.h + DIMENSIONS.head.h;
export const RIGHT_ARM_POSE_ANGLES: Record<RightArmPose, number> = {
  idle: 0,
  forward: -1.1
};
const RIGHT_ARM_LOWER_SCALE = 0.6;

export function createPlayerAvatar(options: {
  babylon: BabylonApi;
  scene: SceneLike;
}): PlayerAvatar {
  const { babylon, scene } = options;
  const builder = babylon.MeshBuilder;
  const createBox = builder.CreateBox;
  if (!createBox) {
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

  const markerMaterial =
    "StandardMaterial" in babylon
      ? (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mat = new (babylon as any).StandardMaterial("playerFrontMat", scene as any);
          if ("Color3" in babylon) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).diffuseColor = new (babylon as any).Color3(1, 0.2, 0.2);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mat as any).emissiveColor = new (babylon as any).Color3(1, 0.2, 0.2);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mat as any).disableLighting = false;
          return mat as unknown;
        })()
      : null;

  const applyEdgeRendering = (mesh: MeshLike) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mesh as any;
    if (typeof m.enableEdgesRendering === "function") {
      m.enableEdgesRendering();
      if ("edgesWidth" in m) m.edgesWidth = 1.4;
      if ("edgesColor" in m) {
        if ("Color4" in babylon) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.edgesColor = new (babylon as any).Color4(0, 0, 0, 1);
        } else {
          m.edgesColor = { r: 0, g: 0, b: 0, a: 1 };
        }
      }
    }
  };

  const makeBox = (
    name: string,
    size: { w: number; h: number; d: number },
    parent?: MeshLike,
    materialOverride?: unknown
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = createBox(
      name,
      { width: size.w, height: size.h, depth: size.d },
      scene as any
    ) as MeshLike;
    if (!mesh.position) mesh.position = { x: 0, y: 0, z: 0 };
    if (!mesh.rotation) mesh.rotation = { x: 0, y: 0, z: 0 };
    if (!mesh.scaling) mesh.scaling = { x: 1, y: 1, z: 1 };
    const appliedMaterial = materialOverride ?? material;
    if (appliedMaterial) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mesh as any).material = appliedMaterial as any;
    }
    if (parent) mesh.parent = parent;
    applyEdgeRendering(mesh);
    return mesh;
  };

  const head = makeBox("player:head", DIMENSIONS.head);
  const torso = makeBox("player:torso", DIMENSIONS.torso);
  const frontMarker = makeBox("player:frontMarker", DIMENSIONS.marker, undefined, markerMaterial);
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
  const markerZ = DIMENSIONS.torso.d / 2 + DIMENSIONS.marker.d / 2 + 0.02;

  const armX = DIMENSIONS.torso.w / 2 + DIMENSIONS.arm.w / 2 + 0.05;
  const legX = DIMENSIONS.torso.w / 2 - DIMENSIONS.leg.w / 2 - 0.05;

  const lowerArmY = shoulderY - DIMENSIONS.arm.h - DIMENSIONS.arm.h / 2;
  const upperLegY = DIMENSIONS.leg.h + DIMENSIONS.leg.h / 2;
  const lowerLegY = DIMENSIONS.leg.h / 2;

  const basePositions: Record<keyof PlayerAvatarParts, Vec3Like> = {
    head: { x: 0, y: headCenterY, z: 0 },
    torso: { x: 0, y: torsoCenterY, z: 0 },
    frontMarker: { x: 0, y: torsoCenterY + 0.05, z: markerZ },
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
    frontMarker,
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
    rightArmPose?: RightArmPose;
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
    applyScale(frontMarker, basePositions.frontMarker, scaleY, pose.yaw, pose.position);
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
    frontMarker.rotation.y = pose.yaw;
    upperArmL.rotation.y = pose.yaw;
    upperArmR.rotation.y = pose.yaw;
    lowerArmL.rotation.y = pose.yaw;
    lowerArmR.rotation.y = pose.yaw;
    upperLegL.rotation.y = pose.yaw;
    upperLegR.rotation.y = pose.yaw;
    lowerLegL.rotation.y = pose.yaw;
    lowerLegR.rotation.y = pose.yaw;

    upperArmL.rotation.x = pose.swing.left;
    const rightArmPose = pose.rightArmPose ?? "idle";
    const baseRight = RIGHT_ARM_POSE_ANGLES[rightArmPose];
    upperArmR.rotation.x = baseRight + pose.swing.right;
    lowerArmL.rotation.x = pose.swing.left * 0.5;
    lowerArmR.rotation.x = baseRight * RIGHT_ARM_LOWER_SCALE + pose.swing.right * 0.5;
  };

  const setFirstPersonVisibility = (isFirstPerson: boolean) => {
    const showHeadArms = !isFirstPerson;
    head.isVisible = showHeadArms;
    torso.isVisible = showHeadArms;
    frontMarker.isVisible = showHeadArms;
    upperArmL.isVisible = showHeadArms;
    lowerArmL.isVisible = showHeadArms;
    upperArmR.isVisible = showHeadArms;
    lowerArmR.isVisible = showHeadArms;
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
    setFirstPersonVisibility,
    getHeadPosition,
    getStandingHeight: () => STANDING_HEIGHT,
    dispose: () => {
      const all = Object.values(parts);
      for (const mesh of all) mesh.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (material as any)?.dispose?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (markerMaterial as any)?.dispose?.();
    }
  };
}
