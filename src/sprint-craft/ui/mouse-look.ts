import type { CameraLike } from "../app";

export type MouseLookHandle = {
  dispose: () => void;
};

export function createMouseLook(options: {
  canvas: HTMLCanvasElement;
  document: Document;
  camera: CameraLike;
  sensitivity: number;
  pitchClampRad: number;
}): MouseLookHandle {
  const { canvas, document, camera, sensitivity, pitchClampRad } = options;

  const onMouseMove = (ev: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;

    // `movementX/Y` is the standard pointer-lock delta API. Some test environments
    // don't populate it on MouseEvent instances, so we read it permissively.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dx = (ev as any).movementX ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dy = (ev as any).movementY ?? 0;

    camera.rotation.y += dx * sensitivity;
    camera.rotation.x += dy * sensitivity;

    const clamp = Math.max(0.01, pitchClampRad);
    if (camera.rotation.x > clamp) camera.rotation.x = clamp;
    if (camera.rotation.x < -clamp) camera.rotation.x = -clamp;
  };

  document.addEventListener("mousemove", onMouseMove);

  return {
    dispose: () => {
      document.removeEventListener("mousemove", onMouseMove);
    }
  };
}

