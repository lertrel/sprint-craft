<!-- path: docs/spec/test-doc.md -->
# Test Documentation: Sprint Craft

## Scope and Constraints
- Sources inspected: all files under tests/ (including sub-folders).
- README.md and other non-test files were not inspected directly, but some tests read them at runtime.
- No external tech documentation was consulted.

## Repository Discovery (Evidence of Completeness)
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
  iteration7.integration.test.ts
  iteration7.unit.test.ts
  iteration8.build.test.ts
  iteration8.integration.test.ts
  iteration8.unit.test.ts
  iteration9.integration.test.ts
  iteration9.unit.test.ts
```

### Counts
- Folders: 2
- Files: 20
- Approximate number of functions in tests: ~354 (regex count of "function" and "=>" tokens in tests)

## Program Document - Test Suite
**Assumption:** The heading template from sys-doc is reused for tests. Each test case is listed as a function-like entry using its `it("...")` description, plus any helper functions defined in the file.

### File: `tests/fakes/fake-babylon.ts`
**File path:** `tests/fakes/fake-babylon.ts`
**Objective:** Provide a fake Babylon.js API implementation for integration tests, capturing created resources and calls.
**Functions:**
- **Function:** `createFakeBabylon(): { babylon: BabylonApi; getLastEngine: () => FakeEngine | null; getLastScene: () => FakeScene | null; getLastCamera: () => FakeCamera | null }`
  - **Objective:** Construct a stub Babylon API and accessors for the latest engine/scene/camera instances.
  - **Logic:** Defines internal stub classes (Vector3, Engine, Scene, FreeCamera, HemisphericLight, Color3/Color4, StandardMaterial, Mesh, VertexData, DynamicTexture), tracks the last created engine/scene/camera, and exposes mesh visibility/material alpha fields for HUD preview assertions.
  - **Parameters:** None.
  - **Returns:** An object with `babylon` constructors and getters for last created engine/scene/camera.
  - **Side effects & dependencies:** Creates class definitions and maintains module-local tracking state.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1) setup; no heavy allocations beyond class definitions.

### File: `tests/input.unit.test.ts`
**File path:** `tests/input.unit.test.ts`
**Objective:** Unit test coverage for `createInputState` key and mouse tracking behavior.
**Functions:**
- **Function:** `it("tracks key down, pressed (edge), and released", ...)`
  - **Objective:** Verify key down, pressed edge, and released edge semantics.
  - **Logic:** Dispatches keydown/keyup events on `window`, asserts `isKeyDown`, `wasKeyPressed`, and `wasKeyReleased` behavior across frames.
  - **Parameters:** Test callback (Vitest).
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses DOM events; depends on `createInputState`.
  - **Errors/Exceptions:** Assertions may throw on failures.
  - **Performance notes:** O(1) event dispatches.

- **Function:** `it("tracks mouse button down/pressed/released", ...)`
  - **Objective:** Verify mouse button tracking and edge states.
  - **Logic:** Dispatches `mousedown`/`mouseup` events, asserts down/pressed/released states with `endFrame`.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events, input state mutations.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) event dispatches.

- **Function:** `it("invokes onDigit for Digit1..Digit9 only", ...)`
  - **Objective:** Ensure only digits 1-9 trigger `onDigit`.
  - **Logic:** Assigns `onDigit`, dispatches Digit and non-digit keydown events, asserts collected digits.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events and callback invocation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("prevents ctrl shortcuts while still tracking keys", ...)`
  - **Objective:** Verify browser shortcut prevention with Ctrl and key tracking.
  - **Logic:** Enables preventDefaults, dispatches Ctrl and Ctrl+W key events, asserts `defaultPrevented` and key states.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events with cancelable/bubbles, `preventDefault` behavior.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration1.integration.test.ts`
**File path:** `tests/iteration1.integration.test.ts`
**Objective:** Integration tests for app boot, DOM HUD wiring, pointer lock, and UI behavior in Iteration 1.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD HTML and make `document.pointerLockElement` writable for jsdom.
  - **Logic:** Sets `document.body.innerHTML`, defines `pointerLockElement` with writable property.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates DOM and document properties.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide the base HUD DOM used by tests.
  - **Logic:** Returns a template string with `#renderCanvas`, `#toast`, `#help`, and `#hotbar`.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("boots engine/scene and renders frames; logs 'Engine initialized'", ...)`
  - **Objective:** Validate engine/scene creation, render loop, and logging on startup.
  - **Logic:** Sets DOM, creates fake Babylon, spies on `console.info`, calls `initApp`, invokes render loop twice, asserts render calls and frame count.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses fake Babylon API; runs render loop callbacks; logs to console.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) for test-scale calls.

- **Function:** `it("resizes engine on window resize and continues rendering", ...)`
  - **Objective:** Ensure resize event triggers engine resize and does not block rendering.
  - **Logic:** Dispatches window resize, checks resizeCalls, runs render loop once.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Window event dispatch, fake engine.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("prevents RMB context menu on the canvas", ...)`
  - **Objective:** Verify context menu is prevented on the canvas.
  - **Logic:** Dispatches a cancelable contextmenu event on the canvas, asserts `defaultPrevented`.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events; relies on initApp canvas handler.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("renders 9-slot hotbar and updates selected slot on Digit keys + toast", ...)`
  - **Objective:** Validate hotbar rendering, selection change, and toast display.
  - **Logic:** Uses fake timers, checks slot count and selection, dispatches Digit5, asserts selection update and toast show/hide.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM manipulation, timers, input events.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) with fake timers.

- **Function:** `it("creates deterministic debug light when enabled (ground removed for visual clarity)", ...)`
  - **Objective:** Ensure debug lighting is created when enabled.
  - **Logic:** Initializes app with `enableDebugGround: true`, asserts `debugLight` present in created lights.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Fake Babylon lighting.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("requests pointer lock on click, hides help after first lock, and mouse look applies only while locked", ...)`
  - **Objective:** Validate pointer lock flow, help hiding, and mouse look gating.
  - **Logic:** Stubs `requestPointerLock`, dispatches mouse events before and after lock, checks toast, help display, and camera rotation changes.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM event dispatch, pointer lock state, camera mutation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) for test-scoped events.

- **Function:** `it("fails gracefully with a visible banner when #renderCanvas is missing", ...)`
  - **Objective:** Validate startup error banner when canvas is missing.
  - **Logic:** Sets DOM without canvas, calls `initAppFromDom`, asserts `startupError` banner is created.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation and error banner insertion.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration2.integration.test.ts`
**File path:** `tests/iteration2.integration.test.ts`
**Objective:** Integration test for initial voxel world meshing and idle stability.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets `document.body.innerHTML` and defines writable `pointerLockElement`.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide base HUD HTML markup.
  - **Logic:** Returns template string with canvas and HUD elements.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("renders an initial multi-chunk voxel world using one mesh per chunk and should not rebuild meshes when idle", ...)`
  - **Objective:** Ensure chunk meshing uses per-chunk meshes and does not rebuild while idle.
  - **Logic:** Initializes app, inspects created meshes count, runs multiple render loop iterations, asserts mesh list unchanged.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Fake Babylon scene; render loop.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) per test iteration.

### File: `tests/iteration2.unit.test.ts`
**File path:** `tests/iteration2.unit.test.ts`
**Objective:** Unit tests for block definitions, chunk storage, world mapping, meshing, generation, and scheduler behavior.
**Functions:**
- **Function:** `it("returns defs for known ids and maps unknown to air deterministically", ...)`
  - **Objective:** Validate block definition lookup and fallback behavior.
  - **Logic:** Fetches defs for known ids and an unknown id, asserts expected properties.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses block registry.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("round-trips set/get at edges and ignores out-of-bounds deterministically", ...)`
  - **Objective:** Validate chunk local voxel bounds and OOB handling.
  - **Logic:** Writes to edge voxels, reads back, verifies OOB reads are air and OOB writes do not mutate data.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses `createChunk`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("maps boundaries and negative coordinates deterministically", ...)`
  - **Objective:** Validate world-to-chunk mapping at boundaries and negatives.
  - **Logic:** Asserts expected `worldToChunk` outputs for boundary and negative values.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Calls `worldToChunk`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("set/get works across chunk boundaries", ...)`
  - **Objective:** Ensure world voxel set/get behaves across chunk edges.
  - **Logic:** Sets voxels at 15, 16, and -1, then reads them back and compares.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `createWorld`, `setVoxel`, `getVoxel`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("one solid block emits 6 faces (12 triangles)", ...)`
  - **Objective:** Verify mesher output for a single cube.
  - **Logic:** Creates a single voxel, meshes it, asserts face and index counts.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `meshChunk`, world access.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(CHUNK_SIZE^3) for meshing, minimal here.

- **Function:** `it("two adjacent blocks cull internal face (10 faces total)", ...)`
  - **Objective:** Validate face culling between adjacent voxels.
  - **Logic:** Sets two adjacent voxels, meshes, and asserts face count and indices length.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `meshChunk`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(CHUNK_SIZE^3) for meshing.

- **Function:** `it("a filled 2x2x2 cube emits only outer faces (24 faces total)", ...)`
  - **Objective:** Ensure internal faces are culled in a filled cube.
  - **Logic:** Sets 2x2x2 voxels, meshes, asserts face and index counts.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `meshChunk`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(CHUNK_SIZE^3) for meshing.

- **Function:** `it("culls faces across chunk boundaries via world voxel lookup", ...)`
  - **Objective:** Validate cross-chunk face culling.
  - **Logic:** Places boundary voxels in adjacent chunks, meshes one chunk, asserts face count.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `meshChunk` and `getVoxel`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(CHUNK_SIZE^3) for meshing.

- **Function:** `it("encodes per-vertex colors and produces multiple distinct colors for mixed blocks", ...)`
  - **Objective:** Validate vertex color output for mixed block types.
  - **Logic:** Meshes two block types and checks distinct colors in vertex data.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `meshChunk`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(CHUNK_SIZE^3) for meshing.

- **Function:** `it("is deterministic for a fixed seed and generates multiple chunks", ...)`
  - **Objective:** Validate deterministic world generation with fixed seed.
  - **Logic:** Generates two worlds with the same seed and compares voxel samples.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `generateInitialWorld`, world access.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(radius^2 * CHUNK_SIZE^3) for generation.

- **Function:** `it("creates solid ground columns (no holes) in the playable region", ...)`
  - **Objective:** Ensure generation fills columns without gaps below the surface.
  - **Logic:** Samples columns, finds top solid Y, and asserts no air below it.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `generateInitialWorld`, `getVoxel`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(sample_count * CHUNK_SIZE).

- **Function:** `it("deduplicates dirty marks and respects step budget", ...)`
  - **Objective:** Validate scheduler deduplication and step budget handling.
  - **Logic:** Marks chunks dirty, steps scheduler with different budgets, asserts processed counts.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler queue mutation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(B) per step.

- **Function:** `it("marks neighbor chunks dirty when a world voxel is on a chunk boundary", ...)`
  - **Objective:** Ensure boundary edits mark neighboring chunks.
  - **Logic:** Marks a boundary voxel, processes queue, asserts expected chunk ids in rebuild list.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler and world-to-chunk mapping.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration3.integration.test.ts`
**File path:** `tests/iteration3.integration.test.ts`
**Objective:** Integration tests for manual voxel collision, ground stability, and spawn/respawn behavior.
**Functions:**
- **Function:** `makeCamera(yaw = 0): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }`
  - **Objective:** Create a stub camera object for controller tests.
  - **Logic:** Returns a literal object with position and rotation.
  - **Parameters:** `yaw` (`number`, optional)
  - **Returns:** Camera-like object.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `makeInput(): { down: Set<string>; pressed: Set<string>; api: ... }`
  - **Objective:** Provide a stub input interface for controller tests.
  - **Logic:** Uses `Set`s for `down` and `pressed`, returns API that queries them.
  - **Parameters:** None.
  - **Returns:** Stub input object and API.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `stepN(c: ReturnType<typeof createPlayerController>, input: { endFrame: () => void }, n: number, dt = 1 / 60): void`
  - **Objective:** Advance the controller for `n` frames.
  - **Logic:** Calls `tick` and `endFrame` in a loop.
  - **Parameters:** `c` (controller), `input` (input API), `n` (`number`), `dt` (`number`, optional)
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates controller state.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(n).

- **Function:** `it("stops at walls, slides along walls, and handles ceilings + grounded reliably", ...)`
  - **Objective:** Validate wall collisions, sliding, ceilings, and grounded state.
  - **Logic:** Builds ground, wall, ceiling; runs controller; asserts position constraints and grounded behavior.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** World voxel mutations and controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps * collision_checks).

- **Function:** `it("does not bounce upward when crouch-sliding away from a wall", ...)`
  - **Objective:** Ensure crouch movement near walls does not induce upward bounce.
  - **Logic:** Builds ground and wall, moves into wall while crouching, then strafes away and measures Y range.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("does not get permanently stuck on an exterior corner (minimal snag prevention)", ...)`
  - **Objective:** Validate corner handling and ensure no permanent snag.
  - **Logic:** Builds corner voxels, simulates movement, verifies finite position and no AABB intersection.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Collision checks.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps * collision_checks).

- **Function:** `it("spawns above ground without intersecting solids and settles onto terrain", ...)`
  - **Objective:** Validate safe spawn placement and settling onto ground.
  - **Logic:** Builds ground and a pillar, uses `findSafeSpawnAboveGround`, asserts no intersection, simulates landing.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Spawn logic and controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("respawns when out of bounds and returns to normal simulation", ...)`
  - **Objective:** Ensure out-of-bounds detection triggers respawn and continues simulation.
  - **Logic:** Sets position below threshold, ticks controller, asserts new position is valid and remains finite.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller respawn logic.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

### File: `tests/iteration3.unit.test.ts`
**File path:** `tests/iteration3.unit.test.ts`
**Objective:** Unit-style tests for movement controller behavior and ground detection edge cases.
**Functions:**
- **Function:** `makeInput(): { state: StubInput; api: ... }`
  - **Objective:** Create a stub input with `down` and `pressed` sets.
  - **Logic:** Returns state and API methods tied to the sets.
  - **Parameters:** None.
  - **Returns:** Stub input object and API.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `makeCamera(yaw = 0): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }`
  - **Objective:** Create a camera stub for controller tests.
  - **Logic:** Returns a literal with position and rotation.
  - **Parameters:** `yaw` (`number`, optional)
  - **Returns:** Camera-like object.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `fillFlatGround(w: ReturnType<typeof createWorld>, options?: { y?: number; radius?: number }): void`
  - **Objective:** Fill a flat square of ground with dirt blocks.
  - **Logic:** Iterates x/z in a radius at a fixed y and sets voxels to dirt.
  - **Parameters:** `w` (world), `options` (y, radius).
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates world voxels.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(r^2).

- **Function:** `stepN(controller: ReturnType<typeof createPlayerController>, input: { endFrame: () => void }, n: number, dt = 1 / 60): void`
  - **Objective:** Advance controller state for `n` frames.
  - **Logic:** Loop over `tick` and `endFrame`.
  - **Parameters:** `controller`, `input`, `n`, `dt`.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates controller state.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(n).

- **Function:** `it("moves relative to yaw and normalizes diagonal movement", ...)`
  - **Objective:** Validate yaw-relative movement and diagonal normalization.
  - **Logic:** Simulates forward movement at different yaws and compares distances for W vs W+D.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("applies gravity, lands stably, and only allows jump when grounded", ...)`
  - **Objective:** Ensure gravity and jump gating behavior.
  - **Logic:** Spawns high, lets player fall to ground, tests jump only when grounded and ignores midair jump.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("sprint increases displacement; crouch/crawl reduces speed; standing is blocked by low ceiling", ...)`
  - **Objective:** Validate movement speed modifiers and stance constraints under low ceilings.
  - **Logic:** Compares walk vs sprint displacement, tests crouch speed and stance, verifies ceiling blocks standing.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics and collision.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("isStandingOnGround detects ground at exact integer position (y=1.0)", ...)`
  - **Objective:** Validate ground detection at integer boundary.
  - **Logic:** Fills ground and checks `isStandingOnGround` at y=1.0.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Ground detection helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("isStandingOnGround detects ground at integer + small epsilon (y=1.001)", ...)`
  - **Objective:** Validate ground detection with epsilon offset.
  - **Logic:** Uses y=1.001 and expects ground detection to be true.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Ground detection helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("isStandingOnGround detects ground at integer + 2*epsilon (y=1.002)", ...)`
  - **Objective:** Validate detection slightly above boundary.
  - **Logic:** Uses y=1.002 and expects ground detection to be true.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Ground detection helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("isStandingOnGround returns false when player is too high above ground", ...)`
  - **Objective:** Ensure ground detection fails when clearly above ground.
  - **Logic:** Uses y=1.5 and expects false.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Ground detection helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("isStandingOnGround returns false when there is no ground below", ...)`
  - **Objective:** Ensure detection fails with no ground.
  - **Logic:** Uses empty world and expects false.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Ground detection helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("player does not oscillate when standing at boundary position y=integer+epsilon", ...)`
  - **Objective:** Validate stable grounding and snap behavior at boundary positions.
  - **Logic:** Spawns at y=6.001 above ground and asserts stable y with no oscillation.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("player snaps to correct Y position after landing from boundary heights", ...)`
  - **Objective:** Ensure snap to correct ground height after fall.
  - **Logic:** Spawns high and asserts final y after landing is exactly 1.0 within epsilon.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

### File: `tests/iteration4.integration.test.ts`
**File path:** `tests/iteration4.integration.test.ts`
**Objective:** Integration tests for block interaction (raycast, place/break), hotbar selection, and cooldown behavior.
**Functions:**
- **Function:** `makeInput(): { state: StubInput; api: ... }`
  - **Objective:** Create a stub mouse input for block interactions.
  - **Logic:** Uses `Set`s for mouse buttons; returns API for mouse down/pressed states.
  - **Parameters:** None.
  - **Returns:** Stub input object and API.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `makeCamera(position: { x: number; y: number; z: number }, yaw = 0, pitch = 0): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }`
  - **Objective:** Build a camera stub for raycast tests.
  - **Logic:** Returns a literal with position and rotation.
  - **Parameters:** `position` (`{ x: number; y: number; z: number }`), `yaw` (`number`), `pitch` (`number`)
  - **Returns:** Camera-like object.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `step(interactor: { tick: (dt: number) => void }, input: { endFrame: () => void }, dt = 1 / 60): void`
  - **Objective:** Advance interactor one frame and clear input edges.
  - **Logic:** Calls `tick` then `endFrame`.
  - **Parameters:** `interactor`, `input`, `dt`.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates interactor state.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("raycast hits a solid block and returns the expected face normal", ...)`
  - **Objective:** Validate raycast hit and face normal.
  - **Logic:** Places a block and raycasts toward it, asserts hit position and face.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `raycastVoxels`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps along ray).

- **Function:** `it("raycast returns null when no solid is in range", ...)`
  - **Objective:** Ensure raycast returns null on empty space.
  - **Logic:** Raycasts in empty world and expects `null`.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `raycastVoxels`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps along ray).

- **Function:** `it("left-click breaks the targeted block and marks its chunk dirty", ...)`
  - **Objective:** Verify breaking a block updates world and scheduler.
  - **Logic:** Places a block, simulates LMB, ticks interactor, asserts voxel is air and scheduler queued chunk.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** World mutation, rebuild scheduler.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1) for test case.

- **Function:** `it("right-click places a block adjacent to the hit face when empty", ...)`
  - **Objective:** Verify placement uses hotbar block id.
  - **Logic:** Places target block, simulates RMB, ticks interactor, asserts placed block id matches selection.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** World mutation and hotbar mapping.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("prevents placement when the target cell intersects the player AABB", ...)`
  - **Objective:** Ensure placement is blocked when intersecting player.
  - **Logic:** Positions player so target cell overlaps AABB, attempts place, asserts voxel remains air.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Collision check via interactor.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("marks neighbor chunks dirty when edits are on a chunk boundary", ...)`
  - **Objective:** Ensure boundary edits dirty neighbor chunks.
  - **Logic:** Breaks a boundary block and inspects scheduler rebuild list for both chunks.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler queue.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("changing hotbar selection changes placed block ids", ...)`
  - **Objective:** Validate block placement reflects hotbar slot changes.
  - **Logic:** Places with slot 1, changes to slot 3, places again, asserts both placements.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Interactor, world mutation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("respects cooldown: two rapid inputs only apply the first edit", ...)`
  - **Objective:** Verify interaction cooldown prevents rapid repeated edits.
  - **Logic:** Issues two break attempts inside cooldown and checks only first block is removed.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Interactor cooldown logic.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("applies cooldown across alternating break/place inputs", ...)`
  - **Objective:** Verify cooldown is shared across break/place actions.
  - **Logic:** Breaks a block then immediately attempts placement, asserts placement does not occur.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Interactor cooldown logic.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("limits sustained input to the configured interaction rate", ...)`
  - **Objective:** Ensure sustained inputs respect cooldown rate limiting.
  - **Logic:** Holds input over multiple ticks and counts blocks removed, asserting upper bound.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Interactor cooldown logic.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

### File: `tests/iteration4.unit.test.ts`
**File path:** `tests/iteration4.unit.test.ts`
**Objective:** Unit tests for raycast logic and hotbar block registry.
**Functions:**
- **Function:** `it("hits the expected cell and face for a straight axis ray", ...)`
  - **Objective:** Validate raycast hit location and face for axis-aligned ray.
  - **Logic:** Places a block and asserts hit data for a forward ray.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `raycastVoxels`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps along ray).

- **Function:** `it("returns null when there is no solid hit within range", ...)`
  - **Objective:** Ensure raycast returns null in empty space.
  - **Logic:** Raycasts in empty world and expects null.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `raycastVoxels`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps along ray).

- **Function:** `it("provides at least five distinct, renderable block types", ...)`
  - **Objective:** Validate hotbar provides multiple renderable block types.
  - **Logic:** Gets hotbar ids, checks uniqueness and renderable/solid flags.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Block registry.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(N) for hotbar list size.

- **Function:** `it("maps hotbar slots to block ids deterministically", ...)`
  - **Objective:** Ensure slot mapping is deterministic and falls back for invalid slots.
  - **Logic:** Reads slots 1, 2, 9, and invalid slots; checks expected values.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** `getHotbarBlockId`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration5.integration.test.ts`
**File path:** `tests/iteration5.integration.test.ts`
**Objective:** Integration tests for Iteration 5 stability, fog/lighting, scheduler throttling, standalone output, and README checklist.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets HTML and defines writable `pointerLockElement`.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide base HUD markup.
  - **Logic:** Returns template string with canvas and HUD elements.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `makeCamera(yaw = 0): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }`
  - **Objective:** Create a stub camera.
  - **Logic:** Returns literal object with position and rotation.
  - **Parameters:** `yaw` (`number`, optional)
  - **Returns:** Camera-like object.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `makeInput(): { down: Set<string>; pressed: Set<string>; api: ... }`
  - **Objective:** Create a stub input API for movement tests.
  - **Logic:** Uses `down` and `pressed` sets with API methods that query them.
  - **Parameters:** None.
  - **Returns:** Stub input object and API.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `fillFlatGround(w: ReturnType<typeof createWorld>, options?: { y?: number; radius?: number }): void`
  - **Objective:** Fill flat ground for stability tests.
  - **Logic:** Loops over x/z in radius and sets dirt blocks at y.
  - **Parameters:** `w`, `options`.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates world voxels.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(r^2).

- **Function:** `stepN(controller: ReturnType<typeof createPlayerController>, input: { endFrame: () => void }, n: number, dt = 1 / 60): void`
  - **Objective:** Advance controller for N frames.
  - **Logic:** Loops `tick` and `endFrame`.
  - **Parameters:** `controller`, `input`, `n`, `dt`.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Mutates controller state.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(n).

- **Function:** `it("keeps a reduced stance under low ceilings until cleared", ...)`
  - **Objective:** Ensure stance remains reduced under low ceilings and returns to standing after removal.
  - **Logic:** Builds ceiling, spawns controller, checks stance with/without crouch key, removes ceiling and checks standing.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller stance logic and world mutation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("stops upward motion at ceilings and returns to grounded", ...)`
  - **Objective:** Validate ceiling collision and stable grounding after jump.
  - **Logic:** Builds ceiling, triggers jump, tracks max Y, asserts grounded and bounded height.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics and collisions.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("does not get stuck on an exterior corner after repeated updates", ...)`
  - **Objective:** Ensure no snag at exterior corners after many updates.
  - **Logic:** Builds corner voxels, runs movement, asserts finite position and no AABB intersection.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Controller physics and collision.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(steps).

- **Function:** `it("sets a non-default clear color and fog parameters on init", ...)`
  - **Objective:** Validate fog and clear color environment settings on init.
  - **Logic:** Initializes app with fake Babylon, asserts scene clearColor, fogMode, fogDensity, and fogColor.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** App initialization and fake scene state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("creates a hemispheric light alongside the fog/sky settings", ...)`
  - **Objective:** Ensure a light is created during init with debug ground enabled.
  - **Logic:** Initializes app with enableDebugGround, asserts debug light exists.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** App init and fake scene.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("rebuilds only up to the configured budget per step", ...)`
  - **Objective:** Validate scheduler budget enforcement.
  - **Logic:** Marks multiple chunks dirty, processes one step, asserts only one rebuild.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("drains the rebuild queue over multiple budgeted steps", ...)`
  - **Objective:** Ensure the scheduler drains queue over successive steps.
  - **Logic:** Marks multiple chunks and steps three times, asserts all processed.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(B) per step.

- **Function:** `it("uses a relative base and outputs sprint-craft.js to standalone/", ...)`
  - **Objective:** Validate standalone build config output settings.
  - **Logic:** Reads `vite.standalone.config.ts` and asserts base/outDir/fileName settings.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads file from disk.
  - **Errors/Exceptions:** Assertions may throw; file read may throw if missing.
  - **Performance notes:** O(file size).

- **Function:** `it("documents standalone build and local open steps", ...)`
  - **Objective:** Ensure README documents standalone build steps.
  - **Logic:** Reads `README.md` and asserts required text.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

- **Function:** `it("lists all required self-validation items", ...)`
  - **Objective:** Ensure README lists all self-validation checklist items.
  - **Logic:** Reads README and asserts presence of checklist items.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

- **Function:** `it("marks all self-validation items as checked", ...)`
  - **Objective:** Ensure README checklist items are marked as checked.
  - **Logic:** Reads README and asserts "- [x]" for each required item.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

### File: `tests/iteration5.unit.test.ts`
**File path:** `tests/iteration5.unit.test.ts`
**Objective:** Unit tests for collision ceiling clamping, fog settings, scheduler budget, and documentation/config assertions.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets DOM HTML and makes `pointerLockElement` writable.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide base HUD markup.
  - **Logic:** Returns template string with canvas and HUD elements.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("clamps upward movement when colliding with a ceiling", ...)`
  - **Objective:** Validate ceiling collision clamps upward movement.
  - **Logic:** Places a ceiling voxel, runs `moveAndCollideAabb`, asserts y collision and position clamp.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Collision helper.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(V) for collision scan.

- **Function:** `it("applies fog and sky clear color during initialization", ...)`
  - **Objective:** Validate environment settings on init.
  - **Logic:** Initializes app with fake Babylon, asserts fog and clearColor fields.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** App init and fake scene.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("respects rebuild budget per scheduler step", ...)`
  - **Objective:** Ensure scheduler step respects budget.
  - **Logic:** Marks multiple chunks dirty, steps once, asserts only one rebuild.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Scheduler queue.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("standalone build config targets standalone output and IIFE bundle name", ...)`
  - **Objective:** Validate standalone build config settings.
  - **Logic:** Reads config file and asserts base, outDir, formats, and fileName.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads file from disk.
  - **Errors/Exceptions:** Assertions may throw; file read may throw if missing.
  - **Performance notes:** O(file size).

- **Function:** `it("README contains standalone usage instructions", ...)`
  - **Objective:** Ensure README includes standalone instructions.
  - **Logic:** Reads README and asserts required lines.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

- **Function:** `it("README contains a self-validation checklist with required items", ...)`
  - **Objective:** Ensure README contains checklist items.
  - **Logic:** Reads README and asserts presence of checklist items.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

- **Function:** `it("marks all checklist items as checked", ...)`
  - **Objective:** Ensure README checklist items are marked as checked.
  - **Logic:** Reads README and asserts "- [x]" for each required item.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads README from disk.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(file size).

### File: `tests/iteration6.integration.test.ts`
**File path:** `tests/iteration6.integration.test.ts`
**Objective:** Integration tests for Iteration 6 branding splash, avatar/nameplate, and shoulder camera clamp.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets DOM HTML and makes `pointerLockElement` writable.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide HUD markup including the branding splash element.
  - **Logic:** Returns a template string with canvas and HUD elements.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("shows the splash on load and hides on first input", ...)`
  - **Objective:** Validate branding splash visibility and first-input dismissal.
  - **Logic:** Initializes app, asserts splash present, dispatches `keydown`, asserts splash hidden.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events; app initialization.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("creates full-body avatar meshes and nameplate text", ...)`
  - **Objective:** Ensure avatar body parts and nameplate are created.
  - **Logic:** Initializes app, inspects created meshes, and checks nameplate text.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Fake Babylon scene; mesh creation.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("clamps the camera forward when a voxel blocks the desired position", ...)`
  - **Objective:** Validate shoulder camera clamp behavior.
  - **Logic:** Creates a demo world with blocking voxels, ticks, and asserts camera distance shrinks.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** World state mutations; demo tick.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration6.unit.test.ts`
**File path:** `tests/iteration6.unit.test.ts`
**Objective:** Unit tests for Iteration 6 hand animation triggers.
**Functions:**
- **Function:** `it("activates a swing when an action is triggered", ...)`
  - **Objective:** Ensure action triggers set the swing timer and swing output.
  - **Logic:** Updates the animator, triggers an action, and asserts swing state is activated.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses `createHandAnimator`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration7.integration.test.ts`
**File path:** `tests/iteration7.integration.test.ts`
**Objective:** Integration tests for Iteration 7 avatar facing, front marker, right arm action swing, and nameplate styling.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets HTML and makes `pointerLockElement` writable.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide HUD markup including brand splash and HUD slots.
  - **Logic:** Returns template string with canvas and HUD elements.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("creates a front marker and enables edge rendering when supported", ...)`
  - **Objective:** Ensure the front marker mesh exists and edge rendering flags are set.
  - **Logic:** Boots app with fake Babylon, checks created meshes and edge flags.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses fake Babylon mesh creation and edge flags.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("uses most-recently-pressed movement key for facing", ...)`
  - **Objective:** Validate facing selection uses the most recently pressed key.
  - **Logic:** Dispatches W then A keydown events and asserts torso yaw follows the latest key.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events, fake Babylon mesh state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("aligns facing to camera yaw and updates right arm pose on movement", ...)`
  - **Objective:** Verify idle yaw alignment and right arm base pose change on movement.
  - **Logic:** Sets camera yaw, ticks render loop, inspects torso yaw; dispatches KeyW and checks right arm rotation update.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM events, fake Babylon mesh state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("adds right arm swing on successful action", ...)`
  - **Objective:** Ensure successful break/place triggers right arm swing.
  - **Logic:** Creates a demo, places a block in front of the camera, simulates a mouse press, and asserts right arm rotation changes.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses `createVoxelDemo`, world edits, fake Babylon mesh state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("draws bright red text on a transparent nameplate", ...)`
  - **Objective:** Validate nameplate styling in integration context.
  - **Logic:** Boots the app and inspects nameplate texture draw arguments for red text and transparent background.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses fake Babylon DynamicTexture state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration7.unit.test.ts`
**File path:** `tests/iteration7.unit.test.ts`
**Objective:** Unit tests for Iteration 7 facing rules, right-arm swing constraints, and nameplate styling.
**Functions:**
- **Function:** `it("uses the most recently pressed movement key when multiple are held", ...)`
  - **Objective:** Validate facing selection uses the most recently pressed key.
  - **Logic:** Simulates pressed/down sets, updates last key, and asserts facing resolution.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses facing helpers.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("maps facing keys to camera yaw offsets", ...)`
  - **Objective:** Ensure facing yaw offsets are correct for each key.
  - **Logic:** Calls `facingYawFromKey` for W/A/S/D and checks offsets.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** None beyond helper calls.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("keeps right arm swing at zero while walking", ...)`
  - **Objective:** Ensure walking swing does not affect the right arm.
  - **Logic:** Updates animator with movement and asserts right swing is zero.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses `createHandAnimator`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("triggers right arm swing on action", ...)`
  - **Objective:** Ensure action triggers produce right arm swing.
  - **Logic:** Calls animator update with actionTriggered and asserts right swing.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses `createHandAnimator`.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("uses transparent background and bright red text", ...)`
  - **Objective:** Validate nameplate draw parameters for color and transparency.
  - **Logic:** Creates a nameplate with fake Babylon and inspects drawText args.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Uses fake Babylon DynamicTexture state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration8.build.test.ts`
**File path:** `tests/iteration8.build.test.ts`
**Objective:** Unit tests for standalone build-stamp injection and UTC formatting.
**Functions:**
- **Function:** `extractStamp(html: string): string`
  - **Objective:** Extract the build stamp string from generated HTML.
  - **Logic:** Matches the `#buildStamp` element and returns its inner text.
  - **Parameters:** `html` (`string`)
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** Throws if the stamp element is missing.
  - **Performance notes:** O(N) over HTML length.

- **Function:** `stampToUtcMs(stamp: string): number`
  - **Objective:** Convert a `dd-mm-yyyy:hh.mm.ss` stamp into UTC milliseconds.
  - **Logic:** Parses the stamp and calls `Date.UTC` with the components.
  - **Parameters:** `stamp` (`string`)
  - **Returns:** `number`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** Throws on invalid format.
  - **Performance notes:** O(1).

- **Function:** `it("inserts a UTC timestamp into standalone outputs", ...)`
  - **Objective:** Ensure standalone HTML outputs include a UTC build stamp.
  - **Logic:** Creates a temp standalone layout, runs the generation script in a non-UTC TZ, and asserts the stamp exists, matches the format, and is near current UTC time.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** Reads/writes temp files, executes Node process.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(N) file IO and process spawn overhead.

### File: `tests/iteration8.integration.test.ts`
**File path:** `tests/iteration8.integration.test.ts`
**Objective:** Integration tests for crosshair/highlight, placement preview, and camera mode toggling.
**Functions:**
- **Function:** `makeInput(): { state: StubInputState; api: ... }`
  - **Objective:** Provide stub input state for camera toggle and interaction tests.
  - **Logic:** Uses `Set`s for pressed/down keys and mouse buttons; exposes query methods and an `endFrame` reset.
  - **Parameters:** None.
  - **Returns:** Stub input state and API.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM for initApp-based tests.
  - **Logic:** Sets `document.body.innerHTML` and makes `pointerLockElement` writable.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("creates crosshair and target highlight mesh", ...)`
  - **Objective:** Ensure crosshair element and highlight mesh are created.
  - **Logic:** Boots app with fake Babylon, checks `#crosshair` and `target:highlight` mesh presence.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** initApp, fake Babylon scene.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("shows highlight and preview when placement is valid", ...)`
  - **Objective:** Validate highlight/preview visibility and preview transparency.
  - **Logic:** Creates a demo world, places a target block, ticks, and asserts mesh visibility/position/alpha.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, fake Babylon meshes.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("hides preview when placement would intersect the player", ...)`
  - **Objective:** Ensure preview is hidden when placement is invalid.
  - **Logic:** Positions the player so the placement cell overlaps the AABB, ticks, and asserts preview is hidden.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, collision checks.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("toggles to first-person on KeyV and hides head/arms", ...)`
  - **Objective:** Validate camera mode toggle and avatar visibility rules.
  - **Logic:** Sends KeyV, ticks demo, and asserts camera position and head/arm/torso visibility.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, fake Babylon meshes.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("clamps shoulder orbit behind the avatar while moving", ...)`
  - **Objective:** Ensure the shoulder camera cannot orbit to the front of the avatar while moving.
  - **Logic:** Holds movement input, sets camera yaw to the front, and ticks the demo, asserting the yaw is clamped to the rear arc.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, camera rotation updates.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("keeps the shoulder anchor when moving from a front-facing camera", ...)`
  - **Objective:** Ensure movement input does not re-anchor the clamp when the camera is already in front.
  - **Logic:** Presses movement input while facing forward, ticks twice, and asserts the yaw remains clamped to the original rear arc.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, camera rotation updates.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("snaps shoulder yaw back to anchor when leaving first-person", ...)`
  - **Objective:** Ensure the camera yaw realigns to the shoulder anchor after switching back from first-person.
  - **Logic:** Switches to first-person, rotates the camera, switches back, and asserts yaw snaps to the anchor.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createVoxelDemo, camera mode toggling.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration8.unit.test.ts`
**File path:** `tests/iteration8.unit.test.ts`
**Objective:** Unit tests for targeting helpers, placement validation, and camera mode toggling.
**Functions:**
- **Function:** `it("computes placement target from hit face", ...)`
  - **Objective:** Validate placement target computation from a raycast hit.
  - **Logic:** Calls `getPlacementTarget` and asserts the adjacent coordinates.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("returns hit + placement for a valid raycast", ...)`
  - **Objective:** Validate targeting update output for a simple world.
  - **Logic:** Creates a world with a block, updates targeting, and asserts hit/placement values.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createTargeting, raycastVoxels.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(N) along the ray.

- **Function:** `it("rejects placement when occupied or intersecting the player", ...)`
  - **Objective:** Validate placement rules for occupied and overlapping cells.
  - **Logic:** Checks `canPlaceBlock` against occupied and overlapping targets.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** canPlaceBlock, collision helpers.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(V) for collision checks.

- **Function:** `it("toggles mode on KeyV and keeps mode otherwise", ...)`
  - **Objective:** Validate camera mode toggling behavior.
  - **Logic:** Calls `toggleIfPressed` with and without KeyV and asserts mode.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createCameraMode.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration9.integration.test.ts`
**File path:** `tests/iteration9.integration.test.ts`
**Objective:** Integration tests for username dialog behavior and avatar face/eyes placement.
**Functions:**
- **Function:** `setDom(html: string): void`
  - **Objective:** Install HUD DOM and allow pointerLockElement mutation.
  - **Logic:** Sets `document.body.innerHTML` and makes `pointerLockElement` writable.
  - **Parameters:** `html` (`string`)
  - **Returns:** `void`.
  - **Side effects & dependencies:** DOM mutation.
  - **Errors/Exceptions:** None explicit.
  - **Performance notes:** O(1).

- **Function:** `baseHudDom(): string`
  - **Objective:** Provide HUD markup including the username dialog elements.
  - **Logic:** Returns a template string with canvas, HUD elements, and username dialog.
  - **Parameters:** None.
  - **Returns:** `string`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** None.
  - **Performance notes:** O(1).

- **Function:** `it("updates nameplate text and hides the dialog on OK", ...)`
  - **Objective:** Validate dialog confirm behavior and formatted nameplate text.
  - **Logic:** Sets username input, clicks OK, asserts dialog hidden and nameplate text is `"<John>"`.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** initApp, fake Babylon nameplate texture updates.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("falls back to <User 1> for blank input", ...)`
  - **Objective:** Ensure blank input resolves to the anonymous default.
  - **Logic:** Sets blank input, clicks OK, asserts nameplate text is `"<User 1>"`.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** initApp, fake Babylon nameplate texture updates.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("adds face and eyes on the front of the head", ...)`
  - **Objective:** Validate face/eyes mesh existence and front placement.
  - **Logic:** Boots app, inspects meshes, asserts face/eyes z positions are in front of the head center and eyes are black.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** initApp, fake Babylon mesh state.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

### File: `tests/iteration9.unit.test.ts`
**File path:** `tests/iteration9.unit.test.ts`
**Objective:** Unit tests for username resolution/formatting and avatar appearance colors.
**Functions:**
- **Function:** `it("resolves trimmed usernames and falls back to anonymous", ...)`
  - **Objective:** Validate trimming and anonymous fallback.
  - **Logic:** Calls `resolveUsername` with trimmed and blank inputs.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("formats usernames with angle brackets", ...)`
  - **Objective:** Ensure nameplate text is formatted as `"<name>"`.
  - **Logic:** Calls `formatUsername` and compares output.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** None.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("uses the default torso color and keeps it across pose updates", ...)`
  - **Objective:** Validate default torso color and stability across poses.
  - **Logic:** Creates avatar, inspects torso material color, calls `setPose`, and re-checks color.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createPlayerAvatar, fake Babylon material.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("applies a creation-time torso color override", ...)`
  - **Objective:** Verify torso color override is honored on creation.
  - **Logic:** Creates avatar with `appearance.torsoColor` and inspects material color.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createPlayerAvatar, fake Babylon material.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

- **Function:** `it("applies face and eye material colors", ...)`
  - **Objective:** Verify face/eye materials use the configured colors.
  - **Logic:** Creates avatar and inspects face/eye material colors.
  - **Parameters:** Test callback.
  - **Returns:** `void`.
  - **Side effects & dependencies:** createPlayerAvatar, fake Babylon material.
  - **Errors/Exceptions:** Assertions may throw.
  - **Performance notes:** O(1).

