export type UsernameDialogHandle = {
  element: HTMLElement;
  input: HTMLInputElement;
  button: HTMLButtonElement;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

const DIALOG_ID = "usernameDialog";
const INPUT_ID = "usernameInput";
const BUTTON_ID = "usernameOk";

export function createUsernameDialog(options: {
  document: Document;
  container?: HTMLElement | null;
  onConfirm: (value: string) => void;
}): UsernameDialogHandle {
  const { document, container, onConfirm } = options;
  const existing = document.getElementById(DIALOG_ID);
  const created = !(existing instanceof HTMLElement);
  const dialog = (existing as HTMLElement | null) ?? document.createElement("div");
  if (created) {
    dialog.id = DIALOG_ID;
  }

  const inputEl = document.getElementById(INPUT_ID);
  const createdInput = !(inputEl instanceof HTMLInputElement);
  let input: HTMLInputElement;
  if (inputEl instanceof HTMLInputElement) {
    input = inputEl;
  } else {
    input = document.createElement("input");
    input.id = INPUT_ID;
    input.type = "text";
    input.autocomplete = "off";
  }
  input.maxLength = 10;

  const buttonEl = document.getElementById(BUTTON_ID);
  const createdButton = !(buttonEl instanceof HTMLButtonElement);
  let button: HTMLButtonElement;
  if (buttonEl instanceof HTMLButtonElement) {
    button = buttonEl;
  } else {
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "OK";
  }

  if (created) {
    const label = document.createElement("label");
    label.setAttribute("for", INPUT_ID);
    label.textContent = "Choose avatar name";
    dialog.appendChild(label);
  }
  if (createdInput) dialog.appendChild(input);
  if (createdButton) dialog.appendChild(button);
  if (created) {
    (container ?? document.body).appendChild(dialog);
  }

  const hide = () => {
    dialog.classList.add("hidden");
  };
  const show = () => {
    dialog.classList.remove("hidden");
    input.focus?.();
  };

  const handleConfirm = () => {
    onConfirm(input.value);
    hide();
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      handleConfirm();
    }
  };

  button.addEventListener("click", handleConfirm);
  input.addEventListener("keydown", onKeyDown);

  return {
    element: dialog,
    input,
    button,
    show,
    hide,
    dispose: () => {
      button.removeEventListener("click", handleConfirm);
      input.removeEventListener("keydown", onKeyDown);
      if (created) {
        dialog.remove();
      }
    }
  };
}
