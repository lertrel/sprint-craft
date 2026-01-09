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

