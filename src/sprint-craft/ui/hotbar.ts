export type HotbarHandle = {
  getSelected: () => number;
  setSelected: (digit1to9: number) => void;
  dispose: () => void;
};

const DEFAULT_SWATCHES = [
  "#73522d", // dirt
  "#47b747", // grass
  "#8c8c94", // stone
  "#c7b880", // sand
  "#996b38", // wood
  "#b2473d", // brick
  "#b8947a", // clay
  "#595c66", // slate
  "#ebf0f7" // snow
];

export function createHotbar(container: HTMLElement): HotbarHandle {
  const slots: HTMLDivElement[] = [];
  let selected = 1;

  container.textContent = "";

  for (let digit = 1; digit <= 9; digit += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.slot = String(digit);

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = DEFAULT_SWATCHES[digit - 1] ?? "#ffffff";

    slot.appendChild(swatch);

    const label = document.createElement("div");
    label.textContent = String(digit);
    label.style.position = "absolute";
    label.style.left = "6px";
    label.style.bottom = "5px";
    label.style.fontSize = "11px";
    label.style.opacity = "0.9";
    slot.appendChild(label);

    container.appendChild(slot);
    slots.push(slot);
  }

  const applySelected = () => {
    for (const slot of slots) {
      const digit = Number(slot.dataset.slot);
      slot.classList.toggle("selected", digit === selected);
    }
  };

  applySelected();

  return {
    getSelected: () => selected,
    setSelected: (digit1to9) => {
      if (!Number.isInteger(digit1to9) || digit1to9 < 1 || digit1to9 > 9) return;
      selected = digit1to9;
      applySelected();
    },
    dispose: () => {
      container.textContent = "";
      slots.length = 0;
    }
  };
}

