[Development Plan]

Iteration 1
- Implement Babylon.js engine/scene bootstrap (`main.ts`): canvas, render loop, resize handling
- Add basic camera + pointer lock + mouse look
- Add input system: key state tracking, number key hotbar selection (1–9), mouse buttons
- Add minimal UI wiring: update hotbar selected slot + toast/help behavior
- Add basic “debug” ground (temporary) so the scene renders and input can be validated
- Add `README.md` “How to run” section (`npm install`, `npm run dev`)

Iteration 2
- Add core data models in `src/`:
  - Block definitions (id, name, color/material)
  - Chunk storage (fixed size, packed array, get/set)
  - World container (chunk map, get/set world voxel)
  - Player state (position, velocity, stance)
- Implement chunk meshing (single mesh per chunk, face culling, per-block colors)
- Implement world generation for a small area (flat + some variation)
- Implement chunk rebuild scheduling (dirty chunks + neighbor updates)
- Render initial world (multiple chunks) with acceptable performance (no one-mesh-per-block)

Iteration 3
- Implement player movement controller (no physics engine):
  - WASD movement relative to view
  - Gravity + jump
  - Sprint (Shift) speed multiplier
  - Crouch/crawl (Ctrl) height reduction + speed reduction
- Implement manual voxel collision:
  - Player AABB against solid voxels
  - Axis-separated resolution (X/Y/Z) with grounded detection
  - Step/ledge handling (minimal: prevent snagging on corners)
- Spawn/respawn logic (safe spawn above ground)

Iteration 4
- Implement block interaction system:
  - DDA voxel raycast from camera
  - Face detection / hit normal
  - Left click: break block (set to air) and mark chunks dirty
  - Right click: place block on adjacent cell (respect hit face normal)
  - Prevent placing blocks intersecting player AABB
- Add basic block types (at least 5) mapped to hotbar slots 1–9
- Add interaction rate limiting (click cooldown) to avoid accidental spam

Iteration 5
- Polish “playable demo” behavior:
  - Fix edge-case collisions (crouch transitions, jumping into ceilings)
  - Add simple sky/lighting/fog for readability
  - Add chunk rebuild throttling to keep frame time stable
- Add “standalone no-Node” deliverable:
  - Build `standalone/` output (single HTML + bundled JS) and document how to open locally
- Add self-validation checklist to docs and confirm each requirement is met

[Progress]

Iteration 1 — DONE
- Implemented Babylon.js bootstrap + render loop + resize handling (`src/main.ts`, `src/sprint-craft/app.ts`)
- Implemented pointer lock click-to-lock and mouse look with pitch clamping; help hides after first successful lock
- Implemented input state tracking (keys + mouse), Digit1–Digit9 hotbar selection, and RMB context menu suppression on canvas
- Implemented hotbar UI rendering (9 slots) + selected slot styling + toast notifications
- Implemented temporary debug ground + lighting with deterministic names for validation
- Updated README with run instructions, controls, and troubleshooting
- Added unit + integration-style tests (Vitest + jsdom) that verify Iteration 1 acceptance criteria; tests pass

Iteration 2 — DONE
- Added voxel core data models (`src/sprint-craft/voxels/`): block registry, chunk storage (packed `Uint16Array`), world container with correct negative-coordinate mapping, and player state model
- Implemented chunk meshing (single mesh per chunk) with face culling (including cross-chunk neighbor awareness) and per-vertex block colors
- Implemented deterministic world generation for a 3×3 chunk area (flat baseline + small variation) with grass/dirt/stone layering
- Implemented chunk rebuild scheduling with dirty dedupe, neighbor invalidation, and per-frame rebuild budgeting
- Integrated voxel world boot into app startup and rendering; ensured no one-mesh-per-block behavior
- Added Iteration 2 unit + integration tests; all tests pass (`npm test`)
