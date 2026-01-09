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
};

type InternalState = {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  keysReleased: Set<string>;
  mouseDown: Set<number>;
  mousePressed: Set<number>;
  mouseReleased: Set<number>;
};

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

  const onKeyDown = (ev: KeyboardEvent) => {
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
    }
  };
}

