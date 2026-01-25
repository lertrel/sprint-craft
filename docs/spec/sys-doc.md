<!-- path: docs/spec/sys-doc.md -->
# System Documentation: Sprint Craft Voxel Demo

## Scope and Constraints
- Sources inspected: all files under src/ for behavior and API; tests/ only for directory listing.
- README.md and docs/spec were not inspected due to task scope constraints.
- No external tech documentation was consulted.

## Repository Discovery (Evidence of Completeness)
### Directory Tree (src/)
```text
src/
  main.ts
  standalone-entry.ts
  sprint-craft/
    app.ts
    input.ts
    ui/
      hotbar.ts
      mouse-look.ts
      nameplate.ts
      pointer-lock.ts
      toast.ts
    voxels/
      block-interaction.ts
      blocks.ts
      chunk.ts
      chunk-renderer.ts
      generation.ts
      hand-animation.ts
      math.ts
      meshing/
        mesh-types.ts
        mesher.ts
      player-avatar.ts
      player-controller.ts
      player-state.ts
      raycast.ts
      rebuild-scheduler.ts
      spawn.ts
      voxel-collision.ts
      voxel-demo.ts
      world.ts
    world/
      debug-ground.ts
```

### Directory Tree (tests/)
```text
tests/
  fakes/
    fake-babylon.ts
  input.unit.test.ts
  iteration1.integration.test.ts
  iteration2.integration.test.ts
  iteration2.unit.test.ts
  iteration3.integration.test.ts
  iteration3.unit.test.ts
  iteration4.integration.test.ts
  iteration4.unit.test.ts
  iteration5.integration.test.ts
  iteration5.unit.test.ts
  iteration6.integration.test.ts
  iteration6.unit.test.ts
```

### Counts
- Folders: 8 (src: 6, tests: 2)
- Files: 41 (src: 28, tests: 13)
- Approximate number of functions in src: ~247 (regex count of "function" and "=>" tokens in src)

## Program Document - Core Game Function
**Assumption:** The exact heading template requested was not provided in the prompt; the format below uses the required bold labels (File path, Objective, Function, Objective, Logic, Parameters, Returns, Side effects & dependencies, Errors/Exceptions, Performance notes).

### File: `src/main.ts`
**File path:** `src/main.ts`
**Objective:** Entry point for the standard Vite bundle; injects Babylon.js constructors into the app bootstrap and starts the app via the DOM at module load.
**Functions:**
- None (module side effect: calls `initAppFromDom({ babylon: ... })`).

### File: `src/standalone-entry.ts`
**File path:** `src/standalone-entry.ts`
**Objective:** Entry point for the standalone IIFE bundle; performs the same Babylon.js injection as `src/main.ts` for the standalone build target.
**Functions:**
- None (module side effect: calls `initAppFromDom({ babylon: ... })`).

### File: `src/sprint-craft/app.ts`
**File path:** `src/sprint-craft/app.ts`
**Objective:** Defines Babylon adapter types and the main application bootstrap that wires DOM, input, camera, and voxel systems together.
**Functions:**
- **Function:** `applySceneEnvironment(options: { babylon: BabylonApi; scene: SceneLike }): void`
  - **Objective:** Configure scene clear color, fog, and ambient lighting defaults.
  - **Logic:** Casts the scene to an extended shape, chooses Color3/Color4 constructors when available, sets clearColor, fogMode, fogDensity, fogColor, and ambientColor based on a fixed sky palette.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike }`)
  - **Returns:** `void` - mutates the scene for environment settings.
  - **Side effects & dependencies:** Mutates `scene` properties; depends on Babylon constructors and `Scene.FOGMODE_EXP2` when available.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Constant time, called once during initialization.

- **Function:** `initApp(options: InitAppOptions): AppHandle`
  - **Objective:** Create the full game runtime: HUD, input, camera, world, render loop, and cleanup hooks.
  - **Logic:** Validates HUD elements, builds toast/hotbar, creates input state, configures pointer lock and mouse look, wires the branding splash hide-on-first-input behavior, instantiates Babylon engine/scene/camera, sets camera parameters, creates the voxel demo, starts the render loop with delta time calculation, installs resize and visibility handlers, optionally creates debug lighting, and returns an `AppHandle` with `dispose`.
  - **Parameters:** `options` (`{ babylon: BabylonApi; canvas: HTMLCanvasElement; document: Document; window: Window; enableDebugGround?: boolean; onLog?: (msg: string) => void }`)
  - **Returns:** `AppHandle` - `{ engine, scene, camera, input, getFrameCount, dispose }`.
  - **Side effects & dependencies:** DOM queries and mutations, event listeners for pointer lock, focus/blur, visibility, resize; creates Babylon engine/scene/camera; starts render loop; calls `console.info`.
  - **Errors/Exceptions:** Throws `Error` if required HUD elements are missing. Babylon constructors or DOM APIs may throw if misconfigured.
  - **Performance notes:** The render loop runs every frame; per-frame work includes input processing, voxel tick, and scene render.

- **Function:** `AppHandle.getFrameCount(): number`
  - **Objective:** Report how many render loop iterations have occurred.
  - **Logic:** Returns a counter incremented once per render-loop tick.
  - **Parameters:** None.
  - **Returns:** `number` - total frames since initialization.
  - **Side effects & dependencies:** Reads `frameCount` maintained in `initApp`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `AppHandle.dispose(): void`
  - **Objective:** Tear down event listeners and dispose Babylon and game resources.
  - **Logic:** Removes pointer lock/focus/visibility/resize handlers; disposes mouse look, pointer lock, input, voxel demo, scene, and engine.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Removes DOM event listeners; calls dispose methods on subsystems; releases Babylon resources.
  - **Errors/Exceptions:** None explicit; downstream dispose calls may throw if mocks are incomplete.
  - **Performance notes:** O(N) in the number of resources/listeners; invoked on shutdown only.

- **Function:** `initAppFromDom(options: { babylon: BabylonApi }): AppHandle | null`
  - **Objective:** Bootstrap the app from the global document, showing a visible banner on failure.
  - **Logic:** Locates `#renderCanvas`. If missing, injects an error banner and returns `null`. Otherwise calls `initApp` in a try/catch; on failure, shows a banner with the error message and returns `null`.
  - **Parameters:** `options` (`{ babylon: BabylonApi }`)
  - **Returns:** `AppHandle | null` - null when the canvas is missing or initialization fails.
  - **Side effects & dependencies:** DOM reads/writes, `console.error`, creation of banner elements.
  - **Errors/Exceptions:** Catches initialization errors internally and does not rethrow.
  - **Performance notes:** Constant time; called once on startup.

### File: `src/sprint-craft/input.ts`
**File path:** `src/sprint-craft/input.ts`
**Objective:** Centralizes keyboard and mouse input state with per-frame edge detection and optional prevention of browser shortcuts.
**Functions:**
- **Function:** `createInputState(options: { target: Window }): InputState`
  - **Objective:** Create a reusable input state tracker with key/mouse edge detection.
  - **Logic:** Initializes internal `Set`s, registers key and mouse listeners (including capture-phase handlers to prevent browser shortcuts), tracks pressed/released transitions, invokes `onDigit` for number keys, and returns an `InputState` API.
  - **Parameters:** `options` (`{ target: Window }`)
  - **Returns:** `InputState` - methods for querying input, clearing per-frame state, and disposal.
  - **Side effects & dependencies:** Adds event listeners on `target`; calls `preventDefault` based on a flag.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Event-driven; per-event set operations are O(1).

- **Function:** `InputState.isKeyDown(code: string): boolean`
  - **Objective:** Query whether a key is currently held.
  - **Logic:** Checks membership in `keysDown`.
  - **Parameters:** `code` (`string`)
  - **Returns:** `boolean` - true if key is down.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.wasKeyPressed(code: string): boolean`
  - **Objective:** Query whether a key was pressed this frame.
  - **Logic:** Checks membership in `keysPressed`.
  - **Parameters:** `code` (`string`)
  - **Returns:** `boolean` - true if key was newly pressed since last `endFrame`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.wasKeyReleased(code: string): boolean`
  - **Objective:** Query whether a key was released this frame.
  - **Logic:** Checks membership in `keysReleased`.
  - **Parameters:** `code` (`string`)
  - **Returns:** `boolean` - true if key was released since last `endFrame`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.isMouseDown(button: number): boolean`
  - **Objective:** Query whether a mouse button is currently held.
  - **Logic:** Checks membership in `mouseDown`.
  - **Parameters:** `button` (`number`)
  - **Returns:** `boolean` - true if button is down.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.wasMousePressed(button: number): boolean`
  - **Objective:** Query whether a mouse button was pressed this frame.
  - **Logic:** Checks membership in `mousePressed`.
  - **Parameters:** `button` (`number`)
  - **Returns:** `boolean` - true if button was pressed since last `endFrame`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.wasMouseReleased(button: number): boolean`
  - **Objective:** Query whether a mouse button was released this frame.
  - **Logic:** Checks membership in `mouseReleased`.
  - **Parameters:** `button` (`number`)
  - **Returns:** `boolean` - true if button was released since last `endFrame`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.endFrame(): void`
  - **Objective:** Clear per-frame edge-triggered input state.
  - **Logic:** Empties pressed/released `Set`s for keys and mouse buttons.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates internal `Set`s.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(K) in the number of keys/buttons pressed this frame.

- **Function:** `InputState.dispose(): void`
  - **Objective:** Remove all registered event listeners.
  - **Logic:** Removes capture and bubble phase listeners added during creation.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Detaches listeners from the target window.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `InputState.setPreventDefaults(prevent: boolean): void`
  - **Objective:** Toggle prevention of browser defaults for game keys.
  - **Logic:** Sets an internal flag read by keyboard handlers.
  - **Parameters:** `prevent` (`boolean`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Affects subsequent key event handling.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/ui/hotbar.ts`
**File path:** `src/sprint-craft/ui/hotbar.ts`
**Objective:** Render and manage the 1-9 block selection hotbar in the HUD.
**Functions:**
- **Function:** `createHotbar(container: HTMLElement): HotbarHandle`
  - **Objective:** Build the hotbar DOM and return a control handle.
  - **Logic:** Clears the container, creates nine slot elements with swatches and labels, tracks a selected slot, and exposes `getSelected`, `setSelected`, and `dispose`.
  - **Parameters:** `container` (`HTMLElement`)
  - **Returns:** `HotbarHandle` - hotbar control API.
  - **Side effects & dependencies:** DOM creation and mutation; relies on `document.createElement`.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1) with a fixed 9-slot loop.

- **Function:** `HotbarHandle.getSelected(): number`
  - **Objective:** Read the currently selected slot (1-9).
  - **Logic:** Returns the internal `selected` value.
  - **Parameters:** None.
  - **Returns:** `number` - selected hotbar slot.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `HotbarHandle.setSelected(digit1to9: number): void`
  - **Objective:** Update the selected hotbar slot.
  - **Logic:** Validates the input is 1-9, updates internal state, and toggles the "selected" class across slots.
  - **Parameters:** `digit1to9` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates DOM classes on slot elements.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(9) due to reapplying selection.

- **Function:** `HotbarHandle.dispose(): void`
  - **Objective:** Tear down the hotbar DOM.
  - **Logic:** Clears container contents and resets slot list.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) for container clear.

### File: `src/sprint-craft/ui/mouse-look.ts`
**File path:** `src/sprint-craft/ui/mouse-look.ts`
**Objective:** Apply pointer-lock mouse movement to camera yaw/pitch.
**Functions:**
- **Function:** `createMouseLook(options: { canvas: HTMLCanvasElement; document: Document; camera: CameraLike; sensitivity: number; pitchClampRad: number }): MouseLookHandle`
  - **Objective:** Attach mousemove handling that rotates the camera while pointer-locked.
  - **Logic:** Registers a `mousemove` listener; when pointer-locked, reads `movementX/Y`, applies sensitivity, and clamps pitch within `pitchClampRad`.
  - **Parameters:** `options` (`{ canvas: HTMLCanvasElement; document: Document; camera: CameraLike; sensitivity: number; pitchClampRad: number }`)
  - **Returns:** `MouseLookHandle` - exposes `dispose`.
  - **Side effects & dependencies:** Adds document-level mouse listener; mutates camera rotation.
  - **Errors/Exceptions:** None.
  - **Performance notes:** Runs on every mousemove event; simple math operations.

- **Function:** `MouseLookHandle.dispose(): void`
  - **Objective:** Remove the mousemove listener.
  - **Logic:** Unregisters the `mousemove` handler from the document.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Detaches event listener.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/ui/pointer-lock.ts`
**File path:** `src/sprint-craft/ui/pointer-lock.ts`
**Objective:** Manage pointer lock state and show toast notifications for lock changes.
**Functions:**
- **Function:** `createPointerLock(options: { canvas: HTMLCanvasElement; document: Document; toast: ToastHandle; helpEl: HTMLElement; onLockedFirstTime?: () => void }): PointerLockHandle`
  - **Objective:** Provide a pointer lock controller that requests lock on click and tracks lock state.
  - **Logic:** Registers a click handler that calls `canvas.requestPointerLock`, listens for `pointerlockchange`, updates internal `locked` state, shows toast messages, and invokes `onLockedFirstTime` once.
  - **Parameters:** `options` (`{ canvas: HTMLCanvasElement; document: Document; toast: ToastHandle; helpEl: HTMLElement; onLockedFirstTime?: () => void }`)
  - **Returns:** `PointerLockHandle` - exposes `isLocked` and `dispose`.
  - **Side effects & dependencies:** Adds event listeners; calls pointer lock API; shows toast UI.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Event-driven; O(1) per event.

- **Function:** `PointerLockHandle.isLocked(): boolean`
  - **Objective:** Report whether the pointer is currently locked to the canvas.
  - **Logic:** Returns the internal `locked` flag.
  - **Parameters:** None.
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `PointerLockHandle.dispose(): void`
  - **Objective:** Remove pointer lock event listeners.
  - **Logic:** Detaches click and pointerlockchange listeners.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Removes event listeners.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/ui/toast.ts`
**File path:** `src/sprint-craft/ui/toast.ts`
**Objective:** Provide short-lived toast messages in the HUD.
**Functions:**
- **Function:** `createToast(el: HTMLElement): ToastHandle`
  - **Objective:** Create a toast controller that can show messages with a timed hide.
  - **Logic:** Manages a single timeout; `show` updates text and class, schedules class removal; `dispose` clears timers and removes class.
  - **Parameters:** `el` (`HTMLElement`)
  - **Returns:** `ToastHandle` - exposes `show` and `dispose`.
  - **Side effects & dependencies:** Uses `window.setTimeout`/`clearTimeout`; mutates DOM classes.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1); timers are minimal overhead.

- **Function:** `ToastHandle.show(message: string, durationMs?: number): void`
  - **Objective:** Display a toast for a fixed duration.
  - **Logic:** Clears any previous timer, sets text, adds `show` class, and schedules class removal.
  - **Parameters:** `message` (`string`), `durationMs` (`number`, optional, default 900).
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation and timeout scheduling.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `ToastHandle.dispose(): void`
  - **Objective:** Clear timers and hide the toast.
  - **Logic:** Cancels any pending timeout and removes the `show` class.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation; timer cleanup.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/ui/nameplate.ts`
**File path:** `src/sprint-craft/ui/nameplate.ts`
**Objective:** Create a billboarded nameplate mesh with dynamic text.
**Functions:**
- **Function:** `createNameplate(options: { babylon: BabylonApi; scene: SceneLike; text: string; name?: string }): NameplateHandle`
  - **Objective:** Build a plane mesh with a dynamic texture for the player nameplate.
  - **Logic:** Creates a plane, attaches a dynamic texture to a material, draws text, enables billboarding, and returns a handle for updates.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike; text: string; name?: string }`)
  - **Returns:** `NameplateHandle` - exposes `setText`, `setPosition`, `dispose`, and `meshName`.
  - **Side effects & dependencies:** Creates Babylon mesh/material/texture; mutates mesh position.
  - **Errors/Exceptions:** Throws if `MeshBuilder.CreatePlane` is missing.
  - **Performance notes:** Constant-time creation; text redraw is lightweight.

### File: `src/sprint-craft/world/debug-ground.ts`
**File path:** `src/sprint-craft/world/debug-ground.ts`
**Objective:** Provide simple lighting for the scene during development/debugging.
**Functions:**
- **Function:** `createDebugGround(options: { babylon: BabylonApi; scene: SceneLike }): void`
  - **Objective:** Add a hemispheric light to the scene for visibility.
  - **Logic:** Instantiates a `HemisphericLight` named `debugLight` with a downward direction; intentionally omits a ground mesh.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike }`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Creates a Babylon light attached to the scene.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Constant time.

### File: `src/sprint-craft/voxels/blocks.ts`
**File path:** `src/sprint-craft/voxels/blocks.ts`
**Objective:** Define voxel block IDs, colors, and hotbar mappings.
**Functions:**
- **Function:** `getBlockDef(id: number): BlockDef`
  - **Objective:** Resolve a block definition for a numeric ID with a safe fallback.
  - **Logic:** Looks up `BLOCKS_BY_ID` and falls back to `BlockId.Air` if missing.
  - **Parameters:** `id` (`number`)
  - **Returns:** `BlockDef` - resolved block definition.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `getHotbarBlockId(slot1to9: number): BlockId`
  - **Objective:** Map a hotbar slot to a block ID.
  - **Logic:** Validates `slot1to9`; returns the corresponding element in `HOTBAR_BLOCKS` or the default.
  - **Parameters:** `slot1to9` (`number`)
  - **Returns:** `BlockId`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `getHotbarBlockIds(): readonly BlockId[]`
  - **Objective:** Expose the list of block IDs used for the hotbar.
  - **Logic:** Returns the `HOTBAR_BLOCKS` constant.
  - **Parameters:** None.
  - **Returns:** `readonly BlockId[]`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `getBlockFaceColor(def: BlockDef, faceDirection: FaceDirection): Rgb01`
  - **Objective:** Resolve per-face color for a block.
  - **Logic:** Uses `def.faceColors` if present; otherwise uses `def.color`.
  - **Parameters:** `def` (`BlockDef`), `faceDirection` (`"top" | "bottom" | "side"`)
  - **Returns:** `Rgb01` - RGB tuple in 0..1.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/block-interaction.ts`
**File path:** `src/sprint-craft/voxels/block-interaction.ts`
**Objective:** Handle block breaking and placement based on player input and raycasting.
**Functions:**
- **Function:** `getCameraForward(camera: CameraLike): { x: number; y: number; z: number }`
  - **Objective:** Compute a forward direction vector from camera yaw/pitch.
  - **Logic:** Uses `sin`/`cos` of yaw and pitch to form a normalized forward vector in world space.
  - **Parameters:** `camera` (`CameraLike`)
  - **Returns:** `{ x: number; y: number; z: number }` - forward direction.
  - **Side effects & dependencies:** Reads camera rotation.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `createBlockInteractor(options: BlockInteractorOptions): BlockInteractor`
  - **Objective:** Create a per-frame block interaction controller (break/place).
  - **Logic:** Tracks a cooldown, raycasts from the camera to find target blocks, breaks solid blocks on LMB, places blocks on RMB (if air and not intersecting the player AABB), and schedules chunk rebuilds for changed voxels.
  - **Parameters:** `options` (`{ input: InputState; camera: CameraLike; world: World; scheduler: ChunkRebuildScheduler; player: PlayerState; getSelectedSlot: () => number; maxDistance?: number; cooldownSec?: number; onAction?: (action: "break" | "place") => void }`)
  - **Returns:** `BlockInteractor` - exposes `tick`.
  - **Side effects & dependencies:** Reads input; mutates world voxels; enqueues chunk rebuilds; depends on raycast and collision helpers.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Per-tick raycasts and AABB checks; cost depends on `maxDistance`.

- **Function:** `BlockInteractor.tick(dtSec: number): void`
  - **Objective:** Process input and attempt block break/place with cooldown enforcement.
  - **Logic:** Decrements cooldown, checks mouse buttons, calls internal `tryBreak` or `tryPlace`, and resets cooldown on success.
  - **Parameters:** `dtSec` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads input; may mutate world and scheduler through internal helpers.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) plus raycast when actions are triggered.

### File: `src/sprint-craft/voxels/chunk.ts`
**File path:** `src/sprint-craft/voxels/chunk.ts`
**Objective:** Define chunk data structure and local voxel indexing.
**Functions:**
- **Function:** `chunkKey(cx: number, cy: number, cz: number): string`
  - **Objective:** Create a stable string key for chunk coordinates.
  - **Logic:** Concatenates `cx,cy,cz` with commas.
  - **Parameters:** `cx` (`number`), `cy` (`number`), `cz` (`number`)
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `createChunk(pos: ChunkCoord): Chunk`
  - **Objective:** Create a new chunk with a voxel array and accessors.
  - **Logic:** Allocates a `Uint16Array` of size `CHUNK_VOLUME` and returns `getLocal` and `setLocal` closures with bounds checks.
  - **Parameters:** `pos` (`{ cx: number; cy: number; cz: number }`)
  - **Returns:** `Chunk`.
  - **Side effects & dependencies:** Allocates memory for voxel storage.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(CHUNK_VOLUME) allocation cost on creation.

- **Function:** `Chunk.getLocal(x: number, y: number, z: number): BlockId`
  - **Objective:** Read a voxel from local chunk coordinates.
  - **Logic:** Returns `BlockId.Air` if out of bounds; otherwise reads from the voxel array.
  - **Parameters:** `x` (`number`), `y` (`number`), `z` (`number`)
  - **Returns:** `BlockId`.
  - **Side effects & dependencies:** Reads internal `Uint16Array`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `Chunk.setLocal(x: number, y: number, z: number, id: BlockId): void`
  - **Objective:** Write a voxel to local chunk coordinates.
  - **Logic:** Bounds checks and writes to the voxel array.
  - **Parameters:** `x` (`number`), `y` (`number`), `z` (`number`), `id` (`BlockId`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates internal `Uint16Array`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `isInChunkBounds(x: number, y: number, z: number): boolean`
  - **Objective:** Validate local coordinates against chunk bounds.
  - **Logic:** Checks 0 <= x,y,z < CHUNK_SIZE.
  - **Parameters:** `x` (`number`), `y` (`number`), `z` (`number`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `localIndex(x: number, y: number, z: number): number`
  - **Objective:** Convert local voxel coordinates to a linear index.
  - **Logic:** Computes `x + CHUNK_SIZE * (y + CHUNK_SIZE * z)`.
  - **Parameters:** `x` (`number`), `y` (`number`), `z` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/chunk-renderer.ts`
**File path:** `src/sprint-craft/voxels/chunk-renderer.ts`
**Objective:** Generate and manage Babylon meshes for voxel chunks.
**Functions:**
- **Function:** `createChunkRenderer(options: { babylon: BabylonApi; scene: SceneLike; world: World }): ChunkRenderer`
  - **Objective:** Create a renderer that can upsert meshes for chunk data.
  - **Logic:** Creates a shared material (if available), stores meshes in a map keyed by chunk coordinates, and returns methods for upsert, dispose, and mesh counting.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike; world: World }`)
  - **Returns:** `ChunkRenderer`.
  - **Side effects & dependencies:** Creates Babylon material and meshes; depends on `meshChunk` and world voxel access.
  - **Errors/Exceptions:** None explicit; mesh creation is skipped if Babylon mesh classes are unavailable.
  - **Performance notes:** Material creation is constant; per-chunk mesh generation cost depends on chunk size.

- **Function:** `ChunkRenderer.upsertChunkMesh(chunk: Chunk): void`
  - **Objective:** Build or replace the mesh for a specific chunk.
  - **Logic:** Computes mesh data via `meshChunk`, disposes any existing mesh for the key, creates a new Babylon `Mesh`, applies `VertexData`, and enables edge rendering.
  - **Parameters:** `chunk` (`Chunk`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Allocates arrays, creates and disposes Babylon meshes, mutates scene graph.
  - **Errors/Exceptions:** None explicit; no-op if required Babylon constructors are absent.
  - **Performance notes:** Heavy operation; loops through all voxels in the chunk and allocates geometry arrays.

- **Function:** `ChunkRenderer.dispose(): void`
  - **Objective:** Dispose all chunk meshes and the shared material.
  - **Logic:** Iterates mesh map, calls `dispose`, clears map, and disposes material when present.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Releases Babylon resources.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(M) in number of meshes.

- **Function:** `ChunkRenderer.getMeshCount(): number`
  - **Objective:** Report the number of active chunk meshes.
  - **Logic:** Returns `meshes.size`.
  - **Parameters:** None.
  - **Returns:** `number`.
  - **Side effects & dependencies:** Reads internal map.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/generation.ts`
**File path:** `src/sprint-craft/voxels/generation.ts`
**Objective:** Generate deterministic terrain for a small area of voxel chunks.
**Functions:**
- **Function:** `hash2i(x: number, z: number, seed: number): number`
  - **Objective:** Produce a deterministic hash value for 2D coordinates.
  - **Logic:** Uses integer bit-mixing steps and returns an unsigned 32-bit integer.
  - **Parameters:** `x` (`number`), `z` (`number`), `seed` (`number`)
  - **Returns:** `number` - uint32 hash.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `heightAt(x: number, z: number, opts: GenerationOptions): number`
  - **Objective:** Compute terrain height for a world column.
  - **Logic:** Hashes the coordinate, clamps height variation to avoid divide-by-zero, and adds variation to the base height.
  - **Parameters:** `x` (`number`), `z` (`number`), `opts` (`GenerationOptions`)
  - **Returns:** `number` - height in voxels.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `generateInitialWorld(world: World, options?: Partial<GenerationOptions>): { options: GenerationOptions; generatedChunks: Chunk[] }`
  - **Objective:** Populate a new world with a simple heightmap-based terrain.
  - **Logic:** Merges defaults with options, iterates chunk coordinates in a radius, computes height per column, fills voxels with grass/dirt/stone, and returns generated chunk list.
  - **Parameters:** `world` (`World`), `options` (`Partial<GenerationOptions>` optional)
  - **Returns:** `{ options: GenerationOptions; generatedChunks: Chunk[] }`.
  - **Side effects & dependencies:** Mutates world chunks and voxel arrays.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Nested loops across chunks, columns, and height; O(radius^2 * CHUNK_SIZE^3) for generation area.

### File: `src/sprint-craft/voxels/math.ts`
**File path:** `src/sprint-craft/voxels/math.ts`
**Objective:** Provide math helpers for integer division and modulo behavior with negatives.
**Functions:**
- **Function:** `floorDiv(n: number, d: number): number`
  - **Objective:** Perform floor division that behaves correctly for negative numerators.
  - **Logic:** Returns `Math.floor(n / d)`.
  - **Parameters:** `n` (`number`), `d` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `mod(n: number, d: number): number`
  - **Objective:** Compute modulo in the range [0, d).
  - **Logic:** Normalizes JS remainder into a positive range via `((n % d) + d) % d`.
  - **Parameters:** `n` (`number`), `d` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/meshing/mesh-types.ts`
**File path:** `src/sprint-craft/voxels/meshing/mesh-types.ts`
**Objective:** Declare the `MeshData` shape used by the voxel mesher.
**Functions:**
- None (type-only module).

### File: `src/sprint-craft/voxels/meshing/mesher.ts`
**File path:** `src/sprint-craft/voxels/meshing/mesher.ts`
**Objective:** Convert voxel chunks into triangle meshes with per-vertex colors.
**Functions:**
- **Function:** `getFaceShading(face: { nx: number; ny: number; nz: number; direction: FaceDirection; corners: ...; neighborOffset: ... }): number`
  - **Objective:** Apply a directional brightness factor for a face.
  - **Logic:** Returns higher values for top faces, lower for bottom, and varied values for sides.
  - **Parameters:** `face` (internal face descriptor)
  - **Returns:** `number` - brightness multiplier.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `getAltitudeShading(wy: number): number`
  - **Objective:** Slightly brighten blocks at higher altitude.
  - **Logic:** Normalizes `wy` to a [0,1] range and maps to 0.8..1.0.
  - **Parameters:** `wy` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `meshChunk(options: MeshChunkOptions): MeshData`
  - **Objective:** Generate positions, normals, indices, and colors for visible faces in a chunk.
  - **Logic:** Iterates all voxels, skips non-renderables, checks neighbors for face visibility, computes per-face colors with shading, appends vertex data, and increments face count.
  - **Parameters:** `options` (`{ chunk: Chunk; origin: { x: number; y: number; z: number }; getVoxel: (wx: number, wy: number, wz: number) => number }`)
  - **Returns:** `MeshData` - arrays for Babylon `VertexData`.
  - **Side effects & dependencies:** Calls `getVoxel` for neighbor lookup; allocates arrays.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Hot path; triple nested loop over CHUNK_SIZE with per-face checks and allocations.

### File: `src/sprint-craft/voxels/hand-animation.ts`
**File path:** `src/sprint-craft/voxels/hand-animation.ts`
**Objective:** Provide procedural hand/arm swing data for walking and actions.
**Functions:**
- **Function:** `createHandAnimator(): HandAnimator`
  - **Objective:** Create a stateful animator for walk-cycle and action-triggered swings.
  - **Logic:** Tracks walk phase and action timer, computes left/right swing angles based on movement speed and action triggers.
  - **Parameters:** None.
  - **Returns:** `HandAnimator` - exposes `update` and `getState`.
  - **Side effects & dependencies:** Maintains internal timers and swing state.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) per update.

### File: `src/sprint-craft/voxels/player-avatar.ts`
**File path:** `src/sprint-craft/voxels/player-avatar.ts`
**Objective:** Create a full-body player avatar with pose updates.
**Functions:**
- **Function:** `createPlayerAvatar(options: { babylon: BabylonApi; scene: SceneLike }): PlayerAvatar`
  - **Objective:** Construct head, torso, arms, and legs as Babylon primitives and expose pose controls.
  - **Logic:** Builds meshes, applies proportional placement, updates positions/rotations per pose, and returns handle for updates.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike }`)
  - **Returns:** `PlayerAvatar` - exposes `setPose`, `getHeadPosition`, `getStandingHeight`, and `dispose`.
  - **Side effects & dependencies:** Creates Babylon meshes/materials; updates mesh transforms each tick.
  - **Errors/Exceptions:** Throws if `MeshBuilder.CreateBox` is missing.
  - **Performance notes:** O(1) per pose update; mesh creation is constant-time.

### File: `src/sprint-craft/voxels/player-controller.ts`
**File path:** `src/sprint-craft/voxels/player-controller.ts`
**Objective:** Simulate player movement, physics, and stance handling in the voxel world.
**Functions:**
- **Function:** `clamp(n: number, lo: number, hi: number): number`
  - **Objective:** Clamp a value into a range.
  - **Logic:** `Math.max(lo, Math.min(hi, n))`.
  - **Parameters:** `n` (`number`), `lo` (`number`), `hi` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `getYaw(camera: CameraLike): number`
  - **Objective:** Read the yaw value from the camera.
  - **Logic:** Returns `camera.rotation?.y ?? 0`.
  - **Parameters:** `camera` (`CameraLike`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** Reads camera rotation.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `setCameraPosition(camera: CameraLike, pos: { x: number; y: number; z: number }): void`
  - **Objective:** Update camera position to match player position plus eye height.
  - **Logic:** Assigns x/y/z onto the camera's position object.
  - **Parameters:** `camera` (`CameraLike`), `pos` (`{ x: number; y: number; z: number }`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates camera position.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `vec2Normalize(x: number, z: number): { x: number; z: number }`
  - **Objective:** Normalize a 2D vector used for movement direction.
  - **Logic:** Computes hypot, guards against zero length, returns normalized vector.
  - **Parameters:** `x` (`number`), `z` (`number`)
  - **Returns:** `{ x: number; z: number }`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `stanceHeight(s: PlayerState, stance: PlayerStance): number`
  - **Objective:** Return the collider height for a given stance.
  - **Logic:** Reads `s.colliderHeights[stance]`.
  - **Parameters:** `s` (`PlayerState`), `stance` (`PlayerStance`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `computeEyeHeight(height: number): number`
  - **Objective:** Compute camera eye height relative to collider height.
  - **Logic:** Returns `height - 0.15` with a minimum of 0.2.
  - **Parameters:** `height` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `canFitAtStance(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number, stance: PlayerStance): boolean`
  - **Objective:** Determine if the player can occupy a stance without intersecting voxels.
  - **Logic:** Builds a player AABB at current position and checks for voxel intersection.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `state` (`PlayerState`), `halfWidth` (`number`), `stance` (`PlayerStance`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Calls collision helpers and voxel getter.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(V) in nearby voxel checks.

- **Function:** `chooseReducedStance(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number): PlayerStance`
  - **Objective:** Select the lowest stance that fits (crouch or crawl).
  - **Logic:** Prefers crouching if it fits; otherwise uses crawling.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `state` (`PlayerState`), `halfWidth` (`number`)
  - **Returns:** `PlayerStance`.
  - **Side effects & dependencies:** Calls `canFitAtStance`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(V) due to collision checks.

- **Function:** `tryStandUp(getVoxel: VoxelGetter, state: PlayerState, halfWidth: number): PlayerStance`
  - **Objective:** Attempt to return to standing stance if space allows.
  - **Logic:** Returns standing if it fits; otherwise stays in reduced stance (or reduces further).
  - **Parameters:** `getVoxel` (`VoxelGetter`), `state` (`PlayerState`), `halfWidth` (`number`)
  - **Returns:** `PlayerStance`.
  - **Side effects & dependencies:** Calls `canFitAtStance`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(V) due to collision checks.

- **Function:** `createPlayerController(options: PlayerControllerOptions): PlayerController`
  - **Objective:** Initialize player state and provide per-frame movement/physics updates.
  - **Logic:** Creates default state, spawns the player, computes movement from input and camera yaw, applies gravity and jump, resolves collisions with voxel AABB movement, updates grounded state, snaps to ground for stability, validates state, and updates camera position.
  - **Parameters:** `options` (`{ input: InputState; camera: CameraLike; getVoxel: VoxelGetter; spawn: () => { x: number; y: number; z: number } }`)
  - **Returns:** `PlayerController` - exposes `state`, `tick`, `respawn`, and `isGrounded`.
  - **Side effects & dependencies:** Reads input, mutates player state and camera, queries voxel world, calls collision helpers.
  - **Errors/Exceptions:** None explicit; respawns on invalid states.
  - **Performance notes:** Hot path per frame; multiple collision checks and AABB computations.

- **Function:** `PlayerController.tick(dtSec: number): void`
  - **Objective:** Advance player simulation for one frame.
  - **Logic:** Clamps dt, handles respawn checks, computes movement vector, applies gravity and jump, resolves collisions, updates grounded and camera position, and validates for intersection.
  - **Parameters:** `dtSec` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates player state and camera; uses voxel collision queries.
  - **Errors/Exceptions:** None explicit; may trigger respawn.
  - **Performance notes:** Hot per-frame function; performance depends on collision checks.

- **Function:** `PlayerController.respawn(): void`
  - **Objective:** Reset player to a valid spawn location.
  - **Logic:** Calls the spawn callback, resets velocity, stance, grounded flag, and camera position.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates player state and camera.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `PlayerController.isGrounded(): boolean`
  - **Objective:** Query whether the player is currently grounded.
  - **Logic:** Returns internal `grounded` flag.
  - **Parameters:** None.
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/player-state.ts`
**File path:** `src/sprint-craft/voxels/player-state.ts`
**Objective:** Define player state data and default initialization.
**Functions:**
- **Function:** `createDefaultPlayerState(): PlayerState`
  - **Objective:** Provide a default player state with position, velocity, stance, and collider heights.
  - **Logic:** Returns a literal `PlayerState` object with default values.
  - **Parameters:** None.
  - **Returns:** `PlayerState`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/raycast.ts`
**File path:** `src/sprint-craft/voxels/raycast.ts`
**Objective:** Perform voxel raycasts to detect block intersections.
**Functions:**
- **Function:** `normalize(v: Vec3): Vec3 | null`
  - **Objective:** Normalize a vector or return null for near-zero length.
  - **Logic:** Computes length; returns normalized vector or null if too small.
  - **Parameters:** `v` (`{ x: number; y: number; z: number }`)
  - **Returns:** `Vec3 | null`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `intbound(s: number, ds: number): number`
  - **Objective:** Compute the parametric distance to the next integer grid boundary.
  - **Logic:** Uses floor/frac math based on sign of `ds`; returns infinity for zero direction.
  - **Parameters:** `s` (`number`), `ds` (`number`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `raycastVoxels(options: { origin: Vec3; direction: Vec3; maxDistance: number; getVoxel: (wx: number, wy: number, wz: number) => number }): RaycastHit | null`
  - **Objective:** Step through voxels along a ray to find the first solid block.
  - **Logic:** Normalizes direction, sets up a 3D DDA traversal (tMax/tDelta), steps through the grid until maxDistance, and returns the first solid voxel hit with face normal.
  - **Parameters:** `options` (`{ origin: Vec3; direction: Vec3; maxDistance: number; getVoxel: (wx: number, wy: number, wz: number) => number }`)
  - **Returns:** `RaycastHit | null`.
  - **Side effects & dependencies:** Calls `getVoxel` and `getBlockDef`.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(N) in the number of voxels traversed up to maxDistance.

### File: `src/sprint-craft/voxels/rebuild-scheduler.ts`
**File path:** `src/sprint-craft/voxels/rebuild-scheduler.ts`
**Objective:** Batch and budget chunk mesh rebuilds across frames.
**Functions:**
- **Function:** `createChunkRebuildScheduler(): ChunkRebuildScheduler`
  - **Objective:** Create a scheduler that tracks dirty chunks and processes them with a budget.
  - **Logic:** Maintains a `Set` and FIFO queue; exposes methods to mark dirty chunks, check pending work, and process a limited number per step.
  - **Parameters:** None.
  - **Returns:** `ChunkRebuildScheduler`.
  - **Side effects & dependencies:** Uses internal queue and set.
  - **Errors/Exceptions:** None.
  - **Performance notes:** Queue operations are O(1) except `shift` which is O(N) for arrays.

- **Function:** `ChunkRebuildScheduler.markDirty(cx: number, cy: number, cz: number): void`
  - **Objective:** Enqueue a chunk for rebuild if not already queued.
  - **Logic:** Adds key to set and pushes id to queue when new.
  - **Parameters:** `cx` (`number`), `cy` (`number`), `cz` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates internal set and queue.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `ChunkRebuildScheduler.markDirtyForWorldVoxel(wx: number, wy: number, wz: number): void`
  - **Objective:** Mark the chunk containing a world voxel and any adjacent boundary chunks.
  - **Logic:** Converts world coords to chunk coords, marks the chunk, and also marks neighbors when the voxel lies on a boundary.
  - **Parameters:** `wx` (`number`), `wy` (`number`), `wz` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Calls `worldToChunk`; enqueues multiple chunks.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) with a small constant neighbor set.

- **Function:** `ChunkRebuildScheduler.hasPending(): boolean`
  - **Objective:** Check if any chunks are queued for rebuild.
  - **Logic:** Returns `queue.length > 0`.
  - **Parameters:** None.
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Reads internal queue.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `ChunkRebuildScheduler.step(maxChunks: number, rebuild: (id: ChunkId) => void): number`
  - **Objective:** Process a limited number of queued chunk rebuilds.
  - **Logic:** Pops up to `maxChunks` from the queue, skips entries already cleared, calls `rebuild`, and clears dirty flags.
  - **Parameters:** `maxChunks` (`number`), `rebuild` (`(id: ChunkId) => void`)
  - **Returns:** `number` - number of chunks processed.
  - **Side effects & dependencies:** Mutates queue and set; calls external `rebuild`.
  - **Errors/Exceptions:** None explicit; `rebuild` may throw.
  - **Performance notes:** O(B) where B is the budget; uses `shift` on the array.

- **Function:** `ChunkRebuildScheduler.getQueuedCount(): number`
  - **Objective:** Return the number of queued chunk rebuilds.
  - **Logic:** Returns `queue.length`.
  - **Parameters:** None.
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/spawn.ts`
**File path:** `src/sprint-craft/voxels/spawn.ts`
**Objective:** Determine safe spawn positions above voxel terrain.
**Functions:**
- **Function:** `isSolid(getVoxel: VoxelGetter, wx: number, wy: number, wz: number): boolean`
  - **Objective:** Check if a world voxel is solid.
  - **Logic:** Reads voxel id and consults block definition solidity.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `wx` (`number`), `wy` (`number`), `wz` (`number`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Calls `getVoxel` and `getBlockDef`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `findTopSolidY(getVoxel: VoxelGetter, wx: number, wz: number, options?: { minY?: number; maxY?: number }): number`
  - **Objective:** Find the highest solid voxel in a vertical column.
  - **Logic:** Scans from minY to maxY and tracks the last solid voxel.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `wx` (`number`), `wz` (`number`), `options` (`{ minY?: number; maxY?: number }` optional)
  - **Returns:** `number` - top solid Y or `-Infinity` if none.
  - **Side effects & dependencies:** Calls `getVoxel`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(range) over the vertical scan.

- **Function:** `findSafeSpawnAboveGround(options: { world: World; player: PlayerState; halfWidth: number; column: { x: number; z: number } }): { x: number; y: number; z: number }`
  - **Objective:** Find a non-colliding spawn point above a terrain column.
  - **Logic:** Finds the top solid voxel, chooses a base Y, then increments Y until the player AABB does not intersect solids (or a fallback height is used).
  - **Parameters:** `options` (`{ world: World; player: PlayerState; halfWidth: number; column: { x: number; z: number } }`)
  - **Returns:** `{ x: number; y: number; z: number }`.
  - **Side effects & dependencies:** Uses world voxel queries and collision helper.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(H) in the number of vertical attempts (up to 64).

### File: `src/sprint-craft/voxels/voxel-collision.ts`
**File path:** `src/sprint-craft/voxels/voxel-collision.ts`
**Objective:** Provide AABB-based collision detection and resolution against voxel grids.
**Functions:**
- **Function:** `makePlayerAabb(options: { position: { x: number; y: number; z: number }; halfWidth: number; height: number }): Aabb`
  - **Objective:** Construct an axis-aligned bounding box for the player.
  - **Logic:** Builds min/max bounds from position, halfWidth, and height.
  - **Parameters:** `options` (`{ position: { x: number; y: number; z: number }; halfWidth: number; height: number }`)
  - **Returns:** `Aabb`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `voxelIsSolid(getVoxel: VoxelGetter, wx: number, wy: number, wz: number): boolean`
  - **Objective:** Determine if a voxel is solid for collision checks.
  - **Logic:** Reads the voxel id, treats air as non-solid, otherwise consults block definition.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `wx` (`number`), `wy` (`number`), `wz` (`number`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Calls `getVoxel` and `getBlockDef`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `isStandingOnGround(getVoxel: VoxelGetter, position: { x: number; y: number; z: number }, halfWidth: number): boolean`
  - **Objective:** Detect stable ground beneath the player to prevent bounce oscillation.
  - **Logic:** Samples blocks under the player's footprint using a larger epsilon and checks for solid voxels.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `position` (`{ x: number; y: number; z: number }`), `halfWidth` (`number`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Calls `getVoxel`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) with a fixed number of samples.

- **Function:** `aabbIntersectsSolidVoxels(getVoxel: VoxelGetter, aabb: Aabb): boolean`
  - **Objective:** Test if an AABB intersects any solid voxel.
  - **Logic:** Iterates voxel coordinates overlapped by the AABB (with epsilon shrink) and checks solidity.
  - **Parameters:** `getVoxel` (`VoxelGetter`), `aabb` (`Aabb`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** Calls `getVoxel`.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(V) in the number of voxels spanned by the AABB.

- **Function:** `aabbIntersectsAabb(a: Aabb, b: Aabb): boolean`
  - **Objective:** Test intersection between two AABBs with epsilon tolerance.
  - **Logic:** Performs axis overlap checks with a small epsilon.
  - **Parameters:** `a` (`Aabb`), `b` (`Aabb`)
  - **Returns:** `boolean`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `resolveAxis(options: { getVoxel: VoxelGetter; position: { x: number; y: number; z: number }; delta: { x: number; y: number; z: number }; axis: "x" | "y" | "z"; halfWidth: number; height: number }): { pos: { x: number; y: number; z: number }; collided: boolean; grounded: boolean }`
  - **Objective:** Resolve collisions along a single axis by clamping movement.
  - **Logic:** Tests the moved AABB; if colliding, scans intersecting voxels and clamps position based on movement direction, returning collision and grounded flags.
  - **Parameters:** `options` (`{ getVoxel: VoxelGetter; position: { x: number; y: number; z: number }; delta: { x: number; y: number; z: number }; axis: "x" | "y" | "z"; halfWidth: number; height: number }`)
  - **Returns:** `{ pos: { x: number; y: number; z: number }; collided: boolean; grounded: boolean }`.
  - **Side effects & dependencies:** Calls `getVoxel` multiple times; uses collision epsilon.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(V) over intersecting voxels for the axis.

- **Function:** `moveAndCollideAabb(options: { getVoxel: VoxelGetter; position: { x: number; y: number; z: number }; delta: { x: number; y: number; z: number }; halfWidth: number; height: number; stepHeight?: number; allowStepUp?: boolean }): { position: { x: number; y: number; z: number }; collided: { x: boolean; y: boolean; z: boolean }; grounded: boolean }`
  - **Objective:** Move an AABB with collision resolution and optional step-up behavior.
  - **Logic:** Resolves horizontal axes, attempts step-up when blocked, then resolves vertical axis and returns final position and collision flags.
  - **Parameters:** `options` (`{ getVoxel: VoxelGetter; position: { x: number; y: number; z: number }; delta: { x: number; y: number; z: number }; halfWidth: number; height: number; stepHeight?: number; allowStepUp?: boolean }`)
  - **Returns:** `{ position, collided, grounded }`.
  - **Side effects & dependencies:** Calls `resolveAxis` and voxel queries; may attempt step-up.
  - **Errors/Exceptions:** None.
  - **Performance notes:** Hot per-frame path; multiple voxel scans.

### File: `src/sprint-craft/voxels/voxel-demo.ts`
**File path:** `src/sprint-craft/voxels/voxel-demo.ts`
**Objective:** Orchestrate world generation, rendering, player control, and block interaction.
**Functions:**
- **Function:** `createVoxelDemo(options: { babylon: BabylonApi; scene: SceneLike; camera: CameraLike; input: InputState; getSelectedSlot: () => number; rebuildBudgetPerFrame?: number }): VoxelDemo`
  - **Objective:** Initialize the voxel world, renderer, player controller, avatar, and per-frame tick behavior.
  - **Logic:** Creates world, scheduler, renderer, generates initial terrain, rebuilds meshes, creates player controller and block interactor, wires hand animation and nameplate, applies a shoulder camera offset with voxel clamp, and returns a `VoxelDemo` API.
  - **Parameters:** `options` (`{ babylon: BabylonApi; scene: SceneLike; camera: CameraLike; input: InputState; getSelectedSlot: () => number; rebuildBudgetPerFrame?: number }`)
  - **Returns:** `VoxelDemo`.
  - **Side effects & dependencies:** Mutates world and scene; generates chunk data; creates Babylon meshes.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** Initial generation and rebuild can be heavy; per-frame tick includes player and rebuild steps.

- **Function:** `VoxelDemo.tick(dtSec: number): void`
  - **Objective:** Advance player and world systems each frame.
  - **Logic:** Calls `player.tick`, `interactor.tick`, and rebuilds a limited number of chunks.
  - **Parameters:** `dtSec` (`number`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates world and player; may update meshes.
  - **Errors/Exceptions:** None.
  - **Performance notes:** Per-frame; rebuild budget bounds work.

- **Function:** `VoxelDemo.dispose(): void`
  - **Objective:** Dispose renderer resources.
  - **Logic:** Calls renderer `dispose`.
  - **Parameters:** None.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Releases Babylon meshes.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(M) for mesh count.

- **Function:** `VoxelDemo.getChunkCount(): number`
  - **Objective:** Report total loaded chunks.
  - **Logic:** Returns `world.chunks.size`.
  - **Parameters:** None.
  - **Returns:** `number`.
  - **Side effects & dependencies:** Reads world map.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `VoxelDemo.getChunkMeshCount(): number`
  - **Objective:** Report total rendered chunk meshes.
  - **Logic:** Delegates to renderer `getMeshCount`.
  - **Parameters:** None.
  - **Returns:** `number`.
  - **Side effects & dependencies:** Reads renderer map.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `VoxelDemo.getRebuildCount(): number`
  - **Objective:** Report how many chunk rebuilds have been performed.
  - **Logic:** Returns internal `rebuildCount`.
  - **Parameters:** None.
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `VoxelDemo.getWorld(): World`
  - **Objective:** Expose the voxel world for tests and diagnostics.
  - **Logic:** Returns the internal world instance.
  - **Parameters:** None.
  - **Returns:** `World`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `VoxelDemo.getPlayerState(): PlayerState`
  - **Objective:** Expose the player state for tests and diagnostics.
  - **Logic:** Returns the internal player state instance.
  - **Parameters:** None.
  - **Returns:** `PlayerState`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

### File: `src/sprint-craft/voxels/world.ts`
**File path:** `src/sprint-craft/voxels/world.ts`
**Objective:** Store and access voxel chunks in world coordinates.
**Functions:**
- **Function:** `worldToChunk(wx: number, wy: number, wz: number): { cx: number; cy: number; cz: number; lx: number; ly: number; lz: number }`
  - **Objective:** Convert world voxel coordinates to chunk and local coordinates.
  - **Logic:** Uses `floorDiv` for chunk indices and `mod` for local indices.
  - **Parameters:** `wx` (`number`), `wy` (`number`), `wz` (`number`)
  - **Returns:** `{ cx: number; cy: number; cz: number; lx: number; ly: number; lz: number }`.
  - **Side effects & dependencies:** Calls math helpers.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `createWorld(): World`
  - **Objective:** Initialize the world chunk map and accessors.
  - **Logic:** Creates a `Map` of chunks and returns `getChunk`, `ensureChunk`, `getVoxel`, and `setVoxel` closures.
  - **Parameters:** None.
  - **Returns:** `World`.
  - **Side effects & dependencies:** Allocates a `Map` for chunk storage.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) setup.

- **Function:** `World.getChunk(cx: number, cy: number, cz: number): Chunk | undefined`
  - **Objective:** Retrieve a chunk if it exists.
  - **Logic:** Looks up the chunk map by `chunkKey`.
  - **Parameters:** `cx` (`number`), `cy` (`number`), `cz` (`number`)
  - **Returns:** `Chunk | undefined`.
  - **Side effects & dependencies:** Reads the chunk map.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `World.ensureChunk(cx: number, cy: number, cz: number): Chunk`
  - **Objective:** Retrieve or create a chunk at the given coordinates.
  - **Logic:** Returns existing chunk if present; otherwise creates and stores a new chunk.
  - **Parameters:** `cx` (`number`), `cy` (`number`), `cz` (`number`)
  - **Returns:** `Chunk`.
  - **Side effects & dependencies:** Allocates and stores a new chunk.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) for lookup; allocation cost when creating.

- **Function:** `World.getVoxel(wx: number, wy: number, wz: number): BlockId`
  - **Objective:** Read a voxel at world coordinates.
  - **Logic:** Converts to chunk/local coordinates, returns air if chunk missing, otherwise reads from chunk.
  - **Parameters:** `wx` (`number`), `wy` (`number`), `wz` (`number`)
  - **Returns:** `BlockId`.
  - **Side effects & dependencies:** Reads chunk map and voxel array.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `World.setVoxel(wx: number, wy: number, wz: number, id: BlockId): void`
  - **Objective:** Write a voxel at world coordinates.
  - **Logic:** Converts to chunk/local coordinates, ensures chunk exists, and writes to chunk.
  - **Parameters:** `wx` (`number`), `wy` (`number`), `wz` (`number`), `id` (`BlockId`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates chunk data; may allocate a chunk.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1) plus allocation if chunk absent.

