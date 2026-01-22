export type InputState = {
  isKeyDown: (code: string) => boolean;
  wasKeyPressed: (code: string) => boolean;
  wasKeyReleased: (code: string) => boolean;
  isMouseDown: (button: number) => boolean;
  wasMousePressed: (button: number) => boolean;
  wasMouseReleased: (button: number) => boolean;
  endFrame: () => void;
  dispose: () => void;
  onDigit?: (digit: number) => void;
  setPreventDefaults?: (prevent: boolean) => void;
};

type InternalState = {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  keysReleased: Set<string>;
  mouseDown: Set<number>;
  mousePressed: Set<number>;
  mouseReleased: Set<number>;
};

// Game keys that should have their browser default prevented when playing.
// This stops Ctrl-W closing the tab, Ctrl-D bookmarking, Ctrl-S saving, etc.
const GAME_KEYS_PREVENT_DEFAULT = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9"
]);

export function createInputState(options: { target: Window }): InputState {
  const { target } = options;

  const state: InternalState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    keysReleased: new Set(),
    mouseDown: new Set(),
    mousePressed: new Set(),
    mouseReleased: new Set()
  };

  let onDigit: ((digit: number) => void) | undefined;
  let preventDefaults = false;

  // Handler for the capture phase - intercepts events before the browser processes them.
  // This is critical for preventing browser shortcuts like Ctrl-W, Ctrl-S, Ctrl-D.
  const onKeyDownCapture = (ev: KeyboardEvent) => {
    if (!preventDefaults) return;

    // Prevent ALL keyboard shortcuts when Ctrl, Alt, or Meta is held while playing.
    // This covers Ctrl-W (close tab), Ctrl-S (save), Ctrl-D (bookmark), etc.
    if (ev.ctrlKey || ev.altKey || ev.metaKey) {
      ev.preventDefault();
      return;
    }

    // Also prevent default for game keys even without modifiers
    if (GAME_KEYS_PREVENT_DEFAULT.has(ev.code)) {
      ev.preventDefault();
    }
  };

  const onKeyUpCapture = (ev: KeyboardEvent) => {
    if (!preventDefaults) return;
    if (ev.ctrlKey || ev.altKey || ev.metaKey) {
      ev.preventDefault();
    }
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    // Additional prevention in bubble phase for safety
    if (preventDefaults && GAME_KEYS_PREVENT_DEFAULT.has(ev.code)) {
      ev.preventDefault();
    }

    if (!state.keysDown.has(ev.code)) {
      state.keysDown.add(ev.code);
      state.keysPressed.add(ev.code);
    }

    if (ev.code.startsWith("Digit")) {
      const digit = Number(ev.code.slice("Digit".length));
      if (Number.isInteger(digit) && digit >= 1 && digit <= 9) {
        onDigit?.(digit);
      }
    }
  };

  const onKeyUp = (ev: KeyboardEvent) => {
    state.keysDown.delete(ev.code);
    state.keysReleased.add(ev.code);
  };

  const onMouseDown = (ev: MouseEvent) => {
    if (!state.mouseDown.has(ev.button)) {
      state.mouseDown.add(ev.button);
      state.mousePressed.add(ev.button);
    }
  };

  const onMouseUp = (ev: MouseEvent) => {
    state.mouseDown.delete(ev.button);
    state.mouseReleased.add(ev.button);
  };

  // Use capture phase for keydown to intercept browser shortcuts BEFORE they're processed.
  // This is the only reliable way to prevent Ctrl-W, Ctrl-S, etc.
  target.addEventListener("keydown", onKeyDownCapture, { capture: true });
  target.addEventListener("keyup", onKeyUpCapture, { capture: true });
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("mousedown", onMouseDown);
  target.addEventListener("mouseup", onMouseUp);

  return {
    isKeyDown: (code) => state.keysDown.has(code),
    wasKeyPressed: (code) => state.keysPressed.has(code),
    wasKeyReleased: (code) => state.keysReleased.has(code),
    isMouseDown: (button) => state.mouseDown.has(button),
    wasMousePressed: (button) => state.mousePressed.has(button),
    wasMouseReleased: (button) => state.mouseReleased.has(button),
    endFrame: () => {
      state.keysPressed.clear();
      state.keysReleased.clear();
      state.mousePressed.clear();
      state.mouseReleased.clear();
    },
    dispose: () => {
      target.removeEventListener("keydown", onKeyDownCapture, { capture: true });
      target.removeEventListener("keyup", onKeyUpCapture, { capture: true });
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("mousedown", onMouseDown);
      target.removeEventListener("mouseup", onMouseUp);
    },
    get onDigit() {
      return onDigit;
    },
    set onDigit(fn: ((digit: number) => void) | undefined) {
      onDigit = fn;
    },
    setPreventDefaults(prevent: boolean) {
      preventDefaults = prevent;
    }
  };
}

