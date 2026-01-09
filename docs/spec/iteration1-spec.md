# Iteration 1 Development Spec — Sprint Craft

Source of truth for this iteration:
- `scope.md` (non‑negotiable game concept + tech stack)
- `wip.md` (Iteration 1 bullet list)

This spec turns Iteration 1 bullets into implementable, testable requirements.

---

## Activity 1: Implement Babylon.js engine/scene bootstrap (`main.ts`): canvas, render loop, resize handling

1. **Engine + Scene bootstrap**
   - **What to develop**: Create `src/main.ts` that finds `#renderCanvas`, creates Babylon `Engine` + `Scene`, sets up a minimal camera, and starts a `runRenderLoop()` that renders every frame.
   - **Definition of done**: `npm install` + `npm run dev` loads the page and shows a Babylon-rendered scene with no runtime errors; render loop runs continuously.
   - **Acceptance criteria (integration-testable)**:
     - Page loads at `/` and `window` has no uncaught exceptions.
     - `#renderCanvas` exists and a Babylon engine is instantiated (observable via deterministic log line “Engine initialized” or equivalent test hook).
     - Scene renders at least 2 frames (e.g., via a frame counter or render callback invocation count).

2. **Resize handling**
   - **What to develop**: Add resize handling so the engine resizes on `window.resize` and maintains correct aspect ratio.
   - **Definition of done**: Resizing the browser window does not stretch, blur, or stop rendering; no console errors.
   - **Acceptance criteria**:
     - Programmatically trigger a resize and verify engine resize handler is invoked (observable/log/test hook).
     - After resize, rendering continues (frame counter keeps increasing).

3. **Graceful failure for missing canvas**
   - **What to develop**: Add minimal failure handling (missing canvas / init failure) that surfaces a readable error to the user (on-page message) and stops gracefully.
   - **Definition of done**: If required DOM elements are missing, the app fails fast with a clear message instead of repeated throws.
   - **Acceptance criteria**:
     - If `#renderCanvas` is absent, app displays a visible error banner/text and does not continuously throw.

---

## Activity 2: Add basic camera + pointer lock + mouse look

1. **Pointer lock flow**
   - **What to develop**: Clicking the canvas requests pointer lock; exiting pointer lock returns to normal cursor behavior.
   - **Definition of done**: Click enters pointer lock; ESC exits; state changes are reflected via toast/help as specified.
   - **Acceptance criteria**:
     - Clicking `#renderCanvas` triggers a pointer-lock request.
     - While locked, `document.pointerLockElement === canvas` (or equivalent tracked state in tests).
     - Exiting pointer lock updates the tracked state and UI messaging.

2. **Mouse look**
   - **What to develop**: Mouse-look updates camera yaw/pitch from `mousemove` deltas only while pointer-locked; clamp pitch to avoid flipping.
   - **Definition of done**: Camera rotates smoothly with mouse movement; pitch clamped (e.g., \(-89^\circ\) to \(+89^\circ\)).
   - **Acceptance criteria**:
     - With pointer lock active, synthetic mouse movement changes camera rotation deterministically.
     - Without pointer lock, synthetic mouse movement does not change camera rotation.
     - Pitch never exceeds clamp bounds.

3. **Camera defaults**
   - **What to develop**: Establish camera defaults aligned to scope: first-person framing, reasonable FOV, and stable starting orientation.
   - **Definition of done**: On load, view is usable (not inside geometry, not pointing straight up/down).
   - **Acceptance criteria**:
     - On first render, camera position/rotation match expected baseline ranges (assertable values).

---

## Activity 3: Add input system: key state tracking, number key hotbar selection (1–9), mouse buttons

1. **Central input state**
   - **What to develop**: A centralized input state for keyboard + mouse (pressed/held/released) with consistent per-frame updates.
   - **Definition of done**: Code can query “isDown” and edge-trigger events (“pressed this frame”) reliably.
   - **Acceptance criteria**:
     - Dispatch `keydown/keyup` and verify state transitions (`isDown` true/false; `pressed` only on transition frame).

2. **Hotbar selection**
   - **What to develop**: Map `Digit1`–`Digit9` to selected slot indices consistently (0–8 internally or 1–9 externally, but stable).
   - **Definition of done**: Pressing 1–9 changes selected slot deterministically and persists until changed.
   - **Acceptance criteria**:
     - Send `keydown` for `Digit3`; selected slot becomes “3”.
     - Out-of-range keys do not change selection.

3. **Mouse buttons + RMB context menu suppression**
   - **What to develop**: Track LMB/RMB state for future “break/place”; prevent context menu on RMB on the canvas.
   - **Definition of done**: RMB does not open context menu on the canvas; input state reflects mouse presses.
   - **Acceptance criteria**:
     - Right-click on canvas does not open context menu (`contextmenu` prevented).
     - LMB/RMB down/up events toggle input state.

---

## Activity 4: Add minimal UI wiring: update hotbar selected slot + toast/help behavior

1. **Hotbar rendering + selected styling**
   - **What to develop**: Render 9-slot hotbar into `#hotbar`; apply `.selected` to the active slot.
   - **Definition of done**: Hotbar exists with 9 slots; selected updates immediately on 1–9 press.
   - **Acceptance criteria**:
     - DOM contains 9 `.slot` elements.
     - After `Digit5`, exactly one `.slot.selected` exists and corresponds to slot 5.

2. **Toast system**
   - **What to develop**: A small toast system using `#toast` for transient messages (e.g., “Pointer locked”, “Selected: 4”).
   - **Definition of done**: Toast appears and hides automatically; rapid updates don’t break UI state.
   - **Acceptance criteria**:
     - Trigger toast; `#toast` gets `.show` and contains expected text.
     - After timeout, `.show` is removed.

3. **Help behavior**
   - **What to develop**: Predictable help behavior consistent with `index.html` intent. (Implementation choice must be documented; e.g., visible by default, hides after first pointer lock, or toggles via `H`.)
   - **Definition of done**: Help behavior is predictable and documented; does not block pointer interaction.
   - **Acceptance criteria**:
     - `#help` does not prevent clicking the canvas (still possible to request pointer lock).
     - Any implemented hide/toggle rule is testable via events and matches docs.

---

## Activity 5: Add basic “debug” ground (temporary) so the scene renders and input can be validated

1. **Visible debug ground**
   - **What to develop**: Add a visible ground plane (and optionally a reference object) to validate rendering and camera look.
   - **Definition of done**: On load, user sees ground/reference; mouse look changes view.
   - **Acceptance criteria**:
     - Scene contains a ground mesh with deterministic name/tag.

2. **Basic lighting**
   - **What to develop**: Add simple lighting (e.g., hemispheric) so the ground is visible without textures.
   - **Definition of done**: Ground clearly visible against background; not fully black.
   - **Acceptance criteria**:
     - Light exists in scene with deterministic name/tag (assertable).

3. **Isolate debug ground**
   - **What to develop**: Encapsulate debug ground creation so it can be removed later with minimal changes (e.g., `createDebugGround(scene)`).
   - **Definition of done**: Debug ground can be disabled via a flag without breaking app startup.
   - **Acceptance criteria**:
     - A single function is responsible for debug ground creation and can be skipped.

---

## Activity 6: Add `README.md` “How to run” section (`npm install`, `npm run dev`)

1. **Run instructions**
   - **What to develop**: Update `README.md` with prerequisites and run steps, and what to expect (click to pointer lock; basic controls).
   - **Definition of done**: A developer can run locally in under 5 minutes following README only.
   - **Acceptance criteria**:
     - README includes `npm install`, `npm run dev`, and the local URL/port (5173).
     - README includes minimal control mapping consistent with HUD.

2. **Troubleshooting**
   - **What to develop**: Document common first-run issues (pointer lock prompt, “nothing renders”, WebGL disabled).
   - **Definition of done**: Common setup problems have documented resolution steps.
   - **Acceptance criteria**:
     - README includes at least “click canvas to lock pointer”, “check console for errors”, and “ensure WebGL enabled”.

3. **Do not claim unbuilt deliverables**
   - **What to develop**: Keep README aligned with current state; don’t claim features not yet implemented. Mention `npm run build:standalone` only if/when the entry exists.
   - **Definition of done**: README statements match repo behavior.
   - **Acceptance criteria**:
     - README does not imply standalone output is working unless it is verifiably runnable.

