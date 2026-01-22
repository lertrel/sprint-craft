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

## Controls (Iteration 1)

- **Click canvas**: pointer lock
- **Mouse**: look
- **WASD**: move (movement comes in later iterations)
- **Space**: jump (later iterations)
- **Shift**: sprint (later iterations)
- **Ctrl**: crouch/crawl (later iterations)
- **1–9**: select hotbar slot (shows toast)
- **LMB/RMB**: tracked for later block interactions

## Troubleshooting

- **Pointer lock doesn’t work**: click the canvas, then accept the browser prompt (press **Esc** to exit pointer lock).
- **Nothing renders / black screen**: open DevTools console and check for errors; ensure WebGL is enabled.
- **Stuck**: try a hard refresh and re-run `npm install`.

## Notes

- Iteration 1 includes the basic runtime + input/UI scaffolding and a standalone build output.

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
