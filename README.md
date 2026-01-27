# sprint-craft

Sprint Craft is a single-player, browser-based Minecraft-like voxel demo built with **TypeScript**, **Vite**, and **Babylon.js**.

## How to run (dev)

Prereqs:
- Node.js (recommended: Node 20+)

Commands:

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173`

## Controls

- **Click canvas**: pointer lock (Esc to release)
- **Mouse**: look
- **WASD**: move
- **Space**: jump
- **Shift**: sprint
- **Alt** (preferred) / **Ctrl**: crouch/crawl
- **1–9**: select hotbar slot (shows toast)
- **V**: toggle camera mode (first-person / shoulder)
- **LMB**: break block
- **RMB**: place block

## Troubleshooting

- **Pointer lock doesn’t work**: click the canvas, then accept the browser prompt (press **Esc** to exit pointer lock).
- **Nothing renders / black screen**: open DevTools console and check for errors; ensure WebGL is enabled.
- **Stuck**: try a hard refresh and re-run `npm install`.

## Notes

- The demo boots a procedurally generated voxel terrain at startup.
- Standalone build output lives in `standalone/` (see below).
- On first load, choose an avatar name; the nameplate shows `<Name>`.

## Implemented Features (Iterations 1-9)

- Iteration 1: Engine/scene bootstrap, pointer lock + mouse look, input state + hotbar UI, and initial debug lighting.
- Iteration 2: Core voxel data models, chunk meshing, world generation, rebuild scheduling, and multi-chunk rendering.
- Iteration 3: Player movement (WASD, jump, sprint), crouch/crawl stances, manual voxel collision, and safe spawn/respawn.
- Iteration 4: Block interaction (raycast, break/place), hotbar block types, placement collision checks, and click cooldown.
- Iteration 5: Collision edge-case polish, sky/fog readability, rebuild throttling, standalone build, and self-validation checklist.
  - Crouch input supports Alt (preferred) and Ctrl; shortcut prevention improved for gameplay focus.
  - Wall-crouch bounce fix prevents upward snapping when sliding away from walls.
- Iteration 6: Branding splash hides on first input; full-body avatar with shoulder camera + voxel clamp; action-tied arm swing; nameplate above head.
- Iteration 7: Front marker + edge rendering for avatar clarity; movement-facing rules (most recent key, idle aligns to camera yaw); right arm pose/action-only swing; nameplate style update (transparent background, bright red text).
- Iteration 8: Crosshair HUD, target highlight, and placement preview ghost block; `KeyV` camera mode toggle (first-person vs shoulder) with rear-arc clamp + avatar visibility rules; standalone build UTC stamp.
- Iteration 9: Username dialog and formatted nameplate updates; torso cloth color differentiation with override option; face plate + eyes on avatar head.

## Standalone (no Node/npm at runtime)

This produces **two install options**:
- **Two-file**: `standalone/index.html` + `standalone/sprint-craft.js`
- **Single-file**: `standalone/sprint-craft.single.html` (bundle inlined)

Build:

```bash
npm install
npm run build:standalone
```

Run (download → open):
- Open `standalone/index.html` (requires `standalone/sprint-craft.js` next to it), or
- Open `standalone/sprint-craft.single.html` (one file)

Note: some browsers restrict pointer lock when opened via `file://`. If pointer lock doesn’t work, serve the folder with any tiny static server (no npm required), e.g. `python -m http.server` from the `standalone/` directory.

## SELF-VALIDATION CHECKLIST

- [x] Game starts without runtime errors
- [x] Player moves correctly
- [x] Gravity works
- [x] Collision works
- [x] Blocks can be placed
- [x] Blocks can be broken
- [x] Performance is acceptable for a demo
