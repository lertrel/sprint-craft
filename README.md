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

- A `build:standalone` script exists for a later “download & open” deliverable, but the standalone entry/output is not part of Iteration 1 yet.
