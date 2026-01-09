# Iteration 2 Development Spec — Sprint Craft

Source of truth for this iteration:
- `scope.md` (non‑negotiable game concept + tech stack)
- `wip.md` (Iteration 2 bullet list)
- `docs/spec/iteration1-spec.md` (style for turning bullets into implementable, testable requirements)

This spec turns Iteration 2 bullets into implementable, testable requirements.

---

## Activity 1: Add core data models in `src/`

1. **Block definitions (id, name, color/material)**
   - **What to develop**: A `BlockId` enum/union and a `BlockDef` registry (at minimum: `air`, `grass`, `dirt`, `stone`) that defines per-block render info (at least color; optionally material key for later).
   - **Definition of done**: Code can convert `BlockId -> BlockDef` deterministically; `air` is treated as “empty / not rendered”.
   - **Acceptance criteria (integration-testable)**:
     - Looking up any known `BlockId` returns a definition with `id`, `name`, and `color` (or `materialKey`).
     - `air` is explicitly defined and flagged as non-solid/non-rendered (e.g., `isSolid === false`, `isRenderable === false`).
     - Unknown ids are rejected or mapped to a safe default in a deterministic way (test asserts behavior).

2. **Chunk storage (fixed size, packed array, get/set)**
   - **What to develop**: A `Chunk` type with fixed dimensions (e.g., `CHUNK_SIZE = 16`) stored as a packed typed array (e.g., `Uint16Array`), plus fast `getLocal(x,y,z)` / `setLocal(x,y,z,id)` and bounds checks.
   - **Definition of done**: Chunk storage is O(1) indexing, memory-compact, and correct for all edge coordinates.
   - **Acceptance criteria**:
     - Setting and then getting a voxel at `(0,0,0)` / `(15,15,15)` returns the same `BlockId`.
     - Out-of-bounds local coords are handled deterministically (either throw with clear error OR return `air` and ignore set; spec the chosen behavior and test it).
     - Internal index mapping is consistent (test a handful of coordinates map to unique indices and round-trip).

3. **World container (chunk map, get/set world voxel)**
   - **What to develop**: A `World` that maps chunk coordinates `(cx, cy, cz)` to `Chunk` instances, with `getVoxel(wx,wy,wz)` / `setVoxel(wx,wy,wz,id)` that translate world coords into chunk+local coords and auto-create chunks when needed (for set).
   - **Definition of done**: World voxel access works across chunk boundaries and is deterministic for negative coordinates (explicitly define floor-division behavior).
   - **Acceptance criteria**:
     - `setVoxel(0,0,0, dirt)` then `getVoxel(0,0,0)` returns `dirt`.
     - Boundary correctness: setting `(15,0,0)` is in chunk `(0,0,0)`, while `(16,0,0)` is in `(1,0,0)`; tests assert both store correctly.
     - Negative coordinate correctness: e.g. `(-1,0,0)` maps to chunk `(-1,0,0)` local `15` (or your defined scheme); test asserts exact mapping.

4. **Player state (position, velocity, stance)**
   - **What to develop**: A lightweight `PlayerState` model that tracks `position`, `velocity`, and stance info (e.g., `standing/crouching/crawling`, plus height values), without implementing movement yet (Iteration 3).
   - **Definition of done**: Player state exists as a single source of truth that later systems (movement/collision, camera, spawn) can consume.
   - **Acceptance criteria**:
     - Defaults are deterministic and valid (e.g., `position.y` above ground for the generated world).
     - Stance transitions can be represented (even if no controller yet): test can set `stance` and verify derived values (e.g., collider height) if included.

---

## Activity 2: Implement chunk meshing (single mesh per chunk, face culling, per-block colors)

1. **Mesh data builder for one chunk (pure output)**
   - **What to develop**: A mesher that converts a chunk’s voxel data into mesh buffers (positions/normals/indices and either vertex colors or per-face color data). Keep it as “pure” as possible so it’s testable without Babylon.
   - **Definition of done**: Given chunk voxel data, mesher returns deterministic arrays that render only visible faces.
   - **Acceptance criteria**:
     - A chunk containing exactly one solid block produces exactly 6 faces (12 triangles) worth of indices.
     - All generated triangles are consistently wound (test checks normals or index order consistency if you expose it).
     - `air` produces zero geometry.

2. **Face culling (internal adjacency)**
   - **What to develop**: Omit faces between two solid neighboring voxels within the same chunk.
   - **Definition of done**: No internal faces exist between solid blocks; geometry count drops as expected.
   - **Acceptance criteria**:
     - Two adjacent blocks produce 10 faces (not 12). Test asserts index/triangle count.
     - A filled 2×2×2 cube produces only the outer surface faces (24 faces), not per-block faces.

3. **Neighbor awareness across chunk boundaries**
   - **What to develop**: Meshing that queries adjacent voxels in neighboring chunks (via `World` or a callback like `getVoxelAtWorld`) so boundary faces are culled when a neighboring chunk has a solid voxel.
   - **Definition of done**: Two blocks that touch across a chunk edge do not render the shared face.
   - **Acceptance criteria**:
     - Place a block at local `(15, y, z)` in chunk A and `(0, y, z)` in chunk B; meshing either chunk does not include the face between them (test via face/triangle count or via a “face emitted” debug counter).

4. **Per-block color/material mapping**
   - **What to develop**: Vertex color assignment per face/vertex based on `BlockDef.color` (or a material key mapping).
   - **Definition of done**: Different block types produce different colors consistently.
   - **Acceptance criteria**:
     - A chunk with `grass` and `stone` blocks produces vertex color data with at least two distinct expected color values.

---

## Activity 3: Implement world generation for a small area (flat + some variation)

1. **Deterministic generator**
   - **What to develop**: A generation function that fills a defined region around origin with terrain: flat baseline plus simple deterministic variation (e.g., stepped hills using a seeded hash/noise or simple sine-based height).
   - **Definition of done**: Same seed produces the same blocks every run; generated area is bounded and fast.
   - **Acceptance criteria**:
     - With a fixed seed, `getVoxel(x,y,z)` at a small set of sample coordinates returns expected `BlockId`s (snapshot-like assertions).
     - Generator creates a solid ground layer with no holes at baseline y-levels for the playable region.

2. **Chunk population for a target radius**
   - **What to develop**: Generate a small grid of chunks (e.g., 3×3 or 5×5 around `(0,0,0)`) sufficient to see “multiple chunks” immediately.
   - **Definition of done**: World contains multiple chunks, all meshed/rendered on load in Iteration 2.
   - **Acceptance criteria**:
     - World chunk map contains at least N chunks after generation (test asserts chunk count).
     - Edge chunks exist and contain expected data (not all air).

3. **Block layering rules**
   - **What to develop**: Simple “top layer” logic: e.g., topmost is `grass`, next few are `dirt`, deeper is `stone`.
   - **Definition of done**: Terrain looks coherent and uses at least 3 block types.
   - **Acceptance criteria**:
     - For a given column `(x,z)`, the highest solid block is `grass`; blocks beneath follow the defined layering rule (test asserts for a few columns).

---

## Activity 4: Implement chunk rebuild scheduling (dirty chunks + neighbor updates)

1. **Dirty marking API**
   - **What to develop**: A mechanism to mark a chunk “dirty” when its voxel data changes (even if editing comes later), plus a rebuild queue.
   - **Definition of done**: Dirty chunks are rebuilt exactly once per change batch; redundant marks do not cause repeated rebuild work.
   - **Acceptance criteria**:
     - Marking the same chunk dirty multiple times results in one queued rebuild (set semantics).
     - After rebuild, dirty flag clears and rebuild count increments deterministically (test via counters).

2. **Neighbor invalidation rules**
   - **What to develop**: If a voxel change occurs on a chunk boundary, also mark the adjacent neighbor chunk dirty so its boundary faces update.
   - **Definition of done**: Boundary edits update both sides’ meshes.
   - **Acceptance criteria**:
     - Changing voxel at local `x=0` marks this chunk and the neighbor at `cx-1` dirty; similarly for `x=CHUNK_SIZE-1` marking `cx+1` (repeat for z and optionally y if vertical chunking exists).

3. **Throttled rebuild (frame budget friendly)**
   - **What to develop**: Rebuild at most K chunks per frame (configurable), to avoid long frame spikes.
   - **Definition of done**: Rebuild processing is incremental and predictable.
   - **Acceptance criteria**:
     - With 10 dirty chunks queued and K=2, exactly 2 rebuilds are processed per “tick” call until queue empties (test via calling a scheduler step function repeatedly).

---

## Activity 5: Render initial world (multiple chunks) with acceptable performance (no one-mesh-per-block)

1. **Chunk mesh instances in Babylon (one mesh per chunk)**
   - **What to develop**: A renderer that takes mesher output and creates/updates a single Babylon mesh per chunk (not per-block), attached to the scene.
   - **Definition of done**: On load, multiple chunk meshes appear; updating a chunk replaces/updates that chunk’s single mesh.
   - **Acceptance criteria**:
     - The renderer creates exactly one renderable mesh object per generated chunk (testable via an internal registry size, even if Babylon is faked).
     - No code path creates meshes per voxel (test asserts mesh count stays near chunk count).

2. **World boot integration**
   - **What to develop**: During app init (or shortly after), create `World`, run generator, build chunk meshes, and keep references for later updates (Iteration 4 block interactions).
   - **Definition of done**: A fresh run shows voxel terrain instead of only the debug ground; render loop continues without errors.
   - **Acceptance criteria**:
     - App boot completes with no thrown errors and a non-empty world chunk set.
     - At least M chunk meshes are registered/created after boot.

3. **Performance guardrails**
   - **What to develop**: Baseline guardrails consistent with `scope.md` (“performance-conscious”): limit generated region size, avoid rebuilding all chunks every frame, and keep meshing allocations reasonable (reuse buffers if planned).
   - **Definition of done**: Scene remains responsive while rendering multiple chunks; meshing is only triggered by generation and dirty rebuilds.
   - **Acceptance criteria**:
     - After initial generation, calling a “tick” without changes does not rebuild any chunk meshes (test asserts rebuild counter unchanged).
     - With rebuild throttling enabled, dirty queue drains over multiple ticks, not all at once.

