export type ToastHandle = {
  show: (message: string, durationMs?: number) => void;
  dispose: () => void;
};

export function createToast(el: HTMLElement): ToastHandle {
  let timer: number | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  return {
    show: (message, durationMs = 900) => {
      clearTimer();
      el.textContent = message;
      el.classList.add("show");
      timer = window.setTimeout(() => {
        el.classList.remove("show");
        timer = null;
      }, durationMs);
    },
    dispose: () => {
      clearTimer();
      el.classList.remove("show");
    }
  };
}

