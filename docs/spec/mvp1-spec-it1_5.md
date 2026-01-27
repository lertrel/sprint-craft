You are a senior game engine engineer and technical architect.

Your task is to generate a COMPLETE, PLAYABLE, single-player, browser-based
Minecraft-like voxel demo using JavaScript/TypeScript named “Sprint Craft”

This is NOT a conceptual explanation only.
The final result MUST run locally and be playable with keyboard and mouse.

══════════════════════════════════════
🎯 GAME CONCEPT (NON-NEGOTIABLE)
══════════════════════════════════════

- First-person or over-the-shoulder avatar
- Keyboard movement identical to Minecraft:
  - W A S D: move
  - Mouse: look
  - Space: jump
  - Shift: sprint
  - Ctrl: crouch / crawl
- Gravity and collision with blocks
- Block world made of cube voxels
- Player can:
  - Walk and stand on blocks
  - Place blocks (right click)
  - Break blocks (left click)
  - Stack blocks vertically
- Multiple block types selectable via number keys (1–9)
- No networking, no backend
- Single HTML page + local dev server
- Performance-conscious (NO one-mesh-per-block design)

Visual fidelity is NOT critical.
Correct behavior and playability are.

══════════════════════════════════════
🧱 REQUIRED TECH STACK
══════════════════════════════════════

- Babylon.js
- TypeScript
- Vite
- No physics engine (manual voxel collision)
- Browser-only (Chrome/Edge/Firefox)

══════════════════════════════════════
🏗 REQUIRED ARCHITECTURE OUTPUT
══════════════════════════════════════

You MUST produce ALL of the following sections:

1. High-level system architecture diagram (text-based)
2. Folder structure (realistic, scalable)
3. Core data models:
   - Block
   - Chunk
   - World
   - Player
4. Rendering strategy:
   - Chunk meshing approach
   - Why this approach was chosen
5. Player movement system:
   - Gravity
   - Collision
   - Sprint / crouch / crawl handling
6. Block interaction system:
   - Raycasting
   - Face detection
   - Place vs break logic
7. Input mapping table (keys → actions)
8. Game loop design
9. Performance considerations and constraints

══════════════════════════════════════
💻 REQUIRED CODE OUTPUT
══════════════════════════════════════

You MUST include ACTUAL CODE (not pseudocode) for:

- package.json
- vite.config.ts
- index.html
- main.ts
- Engine / Scene bootstrap
- World + Chunk implementation
- Chunk mesh generation
- Player movement & collision
- Block placement & removal
- Input handling
- Minimal textures or solid colors

Code must be:
- Copy-paste runnable
- Use ES modules
- Free of missing imports
- Free of TODO placeholders

══════════════════════════════════════
▶ PLAYABILITY REQUIREMENTS
══════════════════════════════════════

The generated project must allow:

- `npm install`
- `npm run dev`
- Open browser
- Move player
- Jump
- Place blocks
- Break blocks
- Walk on placed blocks

══════════════════════════════════════
🧪 VALIDATION (MANDATORY)
══════════════════════════════════════

At the END, include a section called:

"SELF-VALIDATION CHECKLIST"

You must explicitly verify:
- [ ] Game starts without runtime errors
- [ ] Player moves correctly
- [ ] Gravity works
- [ ] Collision works
- [ ] Blocks can be placed
- [ ] Blocks can be broken
- [ ] Performance is acceptable for a demo

If any item fails, FIX IT before finalizing.

══════════════════════════════════════
🧠 QUALITY BAR
══════════════════════════════════════

- No skipped steps
- No “left as an exercise”
- No references to external tutorials
- No broken imports
- No conceptual-only sections

If a tradeoff is made, EXPLAIN IT.

══════════════════════════════════════
📦 FINAL DELIVERABLE
══════════════════════════════════════

A fully playable voxel sandbox demo
that a developer can run locally in under 5 minutes. In addition an all-bundled version that can be downloded and run on local browser without having npm or nodes js intalled


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

Iteration 3 — DONE
- Implemented player movement controller (WASD relative to view yaw, gravity/jump, sprint, crouch/crawl with blocked stand-up when low ceiling)
- Implemented manual voxel collision (player AABB vs solid voxels, axis-separated resolution, stable grounded detection, wall sliding, ceiling handling, minimal snag prevention)
- Implemented safe spawn above ground and deterministic respawn when out-of-bounds/invalid state
- Added Iteration 3 unit + integration-ish tests; all tests pass (`npm test`)

[Progress]

Iteration 4 — DONE
- Implemented block interaction system with camera raycast, face detection, break/place, and player-overlap placement veto
- Added additional block types and hotbar slot mapping for placement selection
- Added interaction cooldown gating to prevent rapid spam
- Added Iteration 4 unit + integration tests; all tests pass (`npm test`)

[Progress]

Iteration 5 — DONE
- Added sky/fog environment defaults for readability and retained lighting setup
- Validated edge-case collision behavior (crouch transitions, ceilings, corner snagging) with tests
- Confirmed rebuild throttling, standalone config, and docs via Iteration 5 tests
- Added self-validation checklist to README and Iteration 5 unit + integration tests; all tests pass (`npm test`)
