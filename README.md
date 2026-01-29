# sprint-craft

Sprint Craft is a browser-based Minecraft-like voxel demo built with **TypeScript**, **Vite**, and **Babylon.js**. It supports both single-player and experimental multiplayer modes.

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
- Iteration 10: Multiplayer infrastructure with Colyseus integration; client abstraction layer; protocol definitions for state sync.

## Multiplayer Mode (Experimental)

Multiplayer mode allows multiple clients to connect to a shared Colyseus server. This feature is **disabled by default** and currently in experimental status.

### How to Enable

**Option 1: URL Parameter**
Add `?mp=1` to the URL:
```
http://localhost:5173?mp=1
```
or for standalone:
```
file:///path/to/standalone/sprint-craft.single.html?mp=1
```

**Option 2: Programmatic**
Pass `enableMultiplayer: true` when initializing the app options.

### What Happens When Enabled

When multiplayer is enabled, the client will:

1. **Connect to a Colyseus server** at `ws://localhost:2567` (default)
2. **Join or create** a room named `"sprint-craft"`
3. **Send a `C_HELLO` message** with player name and appearance on connect
4. **Send `C_PING` messages** every 2 seconds to measure latency
5. **Listen for server messages**:
   - `S_WELCOME` – Initial welcome with world seed and snapshot
   - `S_STATE_SNAPSHOT` – Full state synchronization
   - `S_STATE_DELTA` – Incremental state updates
   - `S_BLOCK_RESULT` – Block edit confirmations
   - `S_PONG` – Ping response for RTT calculation

### Running the Server

The Colyseus server must be running for multiplayer to work:

```bash
# In one terminal, start the server
npm run dev:server

# In another terminal, start the client
npm run dev
```

Then open the client with `?mp=1` in the URL.

### Server Location

The server code is located at:
- `server/src/index.ts` – Server entry point
- `server/src/rooms/SprintCraftRoom.ts` – Room logic

### Current Limitations

- **State sync is partial**: The adapter records diagnostics but doesn't fully synchronize game state yet
- **No player position broadcast**: Player movement/position is not yet sent to the server
- **Local server only**: Defaults to `localhost:2567`; no remote server support configured
- **No authoritative physics**: Block edits and collisions are client-side only

### Protocol Messages

| Client → Server | Description |
|-----------------|-------------|
| `C_HELLO`       | Player info (name, appearance) on connect |
| `C_PING`        | Latency probe with timestamp |
| `C_INPUT`       | (Future) Player input frames |
| `C_BLOCK_EDIT`  | (Future) Block place/break requests |

| Server → Client | Description |
|-----------------|-------------|
| `S_WELCOME`     | Welcome message with world seed and snapshot |
| `S_STATE_SNAPSHOT` | Full world state |
| `S_STATE_DELTA` | Incremental state update |
| `S_BLOCK_RESULT` | Block edit confirmation/rejection |
| `S_PONG`        | Ping response with server timestamp |

### Diagnostics

When connected, the multiplayer session tracks:
- **Last server tick**: The most recent tick number from the server
- **Ping RTT**: Round-trip time in milliseconds
- **Snapshot age**: Time since last state snapshot

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
