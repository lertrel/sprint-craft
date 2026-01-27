export type CrosshairHandle = {
  element: HTMLElement;
  dispose: () => void;
};

export function createCrosshair(options: {
  document: Document;
  container?: HTMLElement | null;
}): CrosshairHandle {
  const { document, container } = options;
  const existing = document.getElementById("crosshair");
  if (existing instanceof HTMLElement) {
    existing.style.pointerEvents = "none";
    return { element: existing, dispose: () => undefined };
  }

  const crosshair = document.createElement("div");
  crosshair.id = "crosshair";
  crosshair.style.pointerEvents = "none";
  (container ?? document.body).appendChild(crosshair);

  return {
    element: crosshair,
    dispose: () => {
      crosshair.remove();
    }
  };
}
