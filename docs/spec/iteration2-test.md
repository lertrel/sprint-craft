# Iteration 2 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Blocks: definition lookup + air semantics + unknown ids):

Test case 1 — `getBlockDef` returns required fields for known ids
 - Step 1: Run `npm test -- -t "Iteration 2: blocks (unit)"`
 - Step 2: Confirm the test output shows the Iteration 2 blocks unit test passing.

Test case 2 — `air` is explicitly non-solid and non-rendered
 - Step 1: Run `npm test -- -t "Iteration 2: blocks (unit)"`
 - Step 2: Confirm the test asserts `air.isSolid === false` and `air.isRenderable === false`.

Test case 3 — unknown ids are handled deterministically (mapped to air)
 - Step 1: Run `npm test -- -t "Iteration 2: blocks (unit)"`
 - Step 2: Confirm the test asserts `getBlockDef(9999)` returns the `air` definition.

---

Acceptance Criteria 2 (Chunk storage: packed array, correct edges, deterministic OOB behavior):

Test case 1 — set/get round-trip at chunk edges
 - Step 1: Run `npm test -- -t "Iteration 2: chunk storage (unit)"`
 - Step 2: Confirm the test sets `(0,0,0)` and `(15,15,15)` and reads back the same ids.

Test case 2 — out-of-bounds reads return air; writes are ignored
 - Step 1: Run `npm test -- -t "Iteration 2: chunk storage (unit)"`
 - Step 2: Confirm the test reads OOB and gets `air`, then writes OOB and verifies in-bounds data is unchanged.

---

Acceptance Criteria 3 (World container: get/set world voxels, boundary correctness, negative coordinates):

Test case 1 — boundary mapping at 15/16
 - Step 1: Run `npm test -- -t "Iteration 2: world voxel mapping (unit)"`
 - Step 2: Confirm the test asserts world `x=15` maps to chunk `cx=0,lx=15` and `x=16` maps to `cx=1,lx=0`.

Test case 2 — negative coordinate mapping uses floor division
 - Step 1: Run `npm test -- -t "Iteration 2: world voxel mapping (unit)"`
 - Step 2: Confirm the test asserts `x=-1` maps to `cx=-1,lx=15` (and similarly for `y=-1`).

Test case 3 — set/get works across chunk boundaries
 - Step 1: Run `npm test -- -t "set/get works across chunk boundaries"`
 - Step 2: Confirm the test sets voxels at `x=15`, `x=16`, and `x=-1` and reads them back correctly.

---

Acceptance Criteria 4 (Chunk meshing: 1 mesh per chunk geometry buffers; face culling; cross-chunk neighbor culling; per-block colors):

Test case 1 — one solid block emits 6 faces (12 triangles)
 - Step 1: Run `npm test -- -t "one solid block emits 6 faces"`
 - Step 2: Confirm the test asserts `faces === 6` and index count equals `12 * 3`.

Test case 2 — internal face culling for adjacent blocks (10 faces)
 - Step 1: Run `npm test -- -t "two adjacent blocks cull internal face"`
 - Step 2: Confirm the test asserts `faces === 10`.

Test case 3 — filled 2×2×2 emits only outer faces (24 faces)
 - Step 1: Run `npm test -- -t "filled 2x2x2"`
 - Step 2: Confirm the test asserts `faces === 24`.

Test case 4 — cross-chunk neighbor awareness culls boundary faces
 - Step 1: Run `npm test -- -t "culls faces across chunk boundaries"`
 - Step 2: Confirm the test sets blocks touching at the chunk boundary and asserts the meshed cube emits `5` faces (shared face removed).

Test case 5 — per-vertex colors vary across block types
 - Step 1: Run `npm test -- -t "encodes per-vertex colors"`
 - Step 2: Confirm the test asserts there are at least 2 distinct RGB triplets in the generated color buffer.

---

Acceptance Criteria 5 (World generation: deterministic, multi-chunk, no holes, coherent layering):

Test case 1 — deterministic generation for fixed seed
 - Step 1: Run `npm test -- -t "world generation (unit)"`
 - Step 2: Confirm the test generates two worlds with the same seed and asserts identical voxel ids at multiple sample coordinates.

Test case 2 — generates multiple chunks (3×3 by default)
 - Step 1: Run `npm test -- -t "world generation (unit)"`
 - Step 2: Confirm the test asserts exactly 9 generated chunks for `radiusChunks=1`.

Test case 3 — no holes in sampled ground columns
 - Step 1: Run `npm test -- -t "creates solid ground columns"`
 - Step 2: Confirm the test scans upward and verifies every voxel from `y=0` through the top solid voxel is non-air.

---

Acceptance Criteria 6 (Chunk rebuild scheduling: dirty dedupe, neighbor invalidation, throttled rebuild):

Test case 1 — dirty dedupe + step budget
 - Step 1: Run `npm test -- -t "chunk rebuild scheduling (unit)"`
 - Step 2: Confirm marking the same chunk dirty twice results in one rebuild, and `step(1, ...)` processes only one chunk.

Test case 2 — neighbor invalidation when voxel is on boundaries
 - Step 1: Run `npm test -- -t "marks neighbor chunks dirty"`
 - Step 2: Confirm marking the voxel at `(0,0,0)` also marks the expected neighbor chunks.

---

Acceptance Criteria 7 (Render initial world: multiple chunks visible; one mesh per chunk; no unnecessary rebuilds):

Test case 1 — app boots and creates one chunk mesh per generated chunk
 - Step 1: Run `npm test -- -t "Iteration 2 (integration-ish)"`
 - Step 2: Confirm the test asserts 9 meshes with names starting `chunk:` were created.

Test case 2 — no per-frame rebuild when nothing changes
 - Step 1: Run `npm test -- -t "should not rebuild meshes"`
 - Step 2: Confirm the test runs multiple frames and asserts no new meshes were created.

Test case 3 — manual visual smoke test (terrain visible)
 - Step 1: Run `npm run dev`
 - Step 2: Open `http://localhost:5173`
 - Step 3: Click the canvas to enter pointer lock.
 - Step 4: Move the mouse to look around.
 - Step 5: Verify you can see a voxel terrain made of colored cubes (grass/dirt/stone) spanning multiple chunks (not just a single flat debug ground plane).

