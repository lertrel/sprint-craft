export type CameraMode = "shoulder" | "firstPerson";

export type CameraModeHandle = {
  getMode: () => CameraMode;
  setMode: (mode: CameraMode) => void;
  toggle: () => CameraMode;
  toggleIfPressed: (wasPressed: (code: string) => boolean) => CameraMode;
};

export const CAMERA_TOGGLE_KEY = "KeyV";

export function createCameraMode(options: { initialMode?: CameraMode } = {}): CameraModeHandle {
  let mode: CameraMode = options.initialMode ?? "shoulder";

  const setMode = (next: CameraMode) => {
    mode = next;
  };

  const toggle = () => {
    mode = mode === "shoulder" ? "firstPerson" : "shoulder";
    return mode;
  };

  const toggleIfPressed = (wasPressed: (code: string) => boolean) => {
    if (wasPressed(CAMERA_TOGGLE_KEY)) {
      return toggle();
    }
    return mode;
  };

  return {
    getMode: () => mode,
    setMode,
    toggle,
    toggleIfPressed
  };
}
