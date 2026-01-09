import type { ToastHandle } from "./toast";

export type PointerLockHandle = {
  isLocked: () => boolean;
  dispose: () => void;
};

export function createPointerLock(options: {
  canvas: HTMLCanvasElement;
  document: Document;
  toast: ToastHandle;
  helpEl: HTMLElement;
  onLockedFirstTime?: () => void;
}): PointerLockHandle {
  const { canvas, document, toast, onLockedFirstTime } = options;

  let locked = false;
  let hasEverLocked = false;

  const updateLockedState = () => {
    const nowLocked = document.pointerLockElement === canvas;
    if (nowLocked === locked) return;

    locked = nowLocked;
    if (locked) {
      toast.show("Pointer locked (Esc to release)");
      if (!hasEverLocked) {
        hasEverLocked = true;
        onLockedFirstTime?.();
      }
    } else {
      toast.show("Pointer unlocked");
    }
  };

  const onClick = () => {
    if (locked) return;
    const request = canvas.requestPointerLock;
    if (typeof request === "function") request.call(canvas);
  };

  canvas.addEventListener("click", onClick);
  document.addEventListener("pointerlockchange", updateLockedState);

  return {
    isLocked: () => locked,
    dispose: () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", updateLockedState);
    }
  };
}

