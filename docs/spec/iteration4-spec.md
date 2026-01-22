# Iteration 4 Development Spec — Sprint Craft

Source of truth for this iteration:
- `scope.md` (non‑negotiable game concept + controls)
- `wip.md` (Iteration 4 bullet list)
- `docs/spec/iteration3-spec.md` (style + testability bar)

This spec turns Iteration 4 bullets into implementable, testable requirements.

---

## Activity 1: Implement block interaction system

1. **Camera-based voxel targeting with face detection**
   - **What to develop**: A deterministic voxel ray query driven by the camera’s view direction that returns the first hit solid block and the face hit (normal).
   - **Definition of done**: For a given camera position/direction and world state, the target block and hit face are stable and repeatable.
   - **Acceptance criteria (integration-testable)**:
     - A ray fired at a solid block returns the correct world cell and a face normal aligned with the entry side.
     - A ray fired into empty space within the max range returns no hit.

2. **Left-click break + right-click place (adjacent cell)**
   - **What to develop**: Left-click removes the targeted block; right-click places a block in the adjacent cell indicated by the hit face normal.
   - **Definition of done**: A targeted solid block can be removed, and a new block can be placed adjacent to a targeted face.
   - **Acceptance criteria**:
     - Left-clicking a targeted block sets it to air and it stays removed in the world state.
     - Right-clicking a block face places a block in the adjacent cell when that cell is empty.

3. **Prevent placements intersecting the player**
   - **What to develop**: Placement is vetoed when the candidate block would intersect the player’s current AABB.
   - **Definition of done**: The player can never place a block that overlaps their collider volume.
   - **Acceptance criteria**:
     - If the adjacent placement cell intersects the player AABB, no block is placed and the world state is unchanged.

4. **Interaction updates world state and rendering**
   - **What to develop**: Interaction edits update the world state and trigger mesh rebuilds for affected chunks (including neighbors on chunk boundaries).
   - **Definition of done**: Edits are visible in the rendered world without full reload, including at chunk edges.
   - **Acceptance criteria**:
     - After breaking or placing a block, the next scheduled rebuild reflects the new geometry for the edited cell.
     - Edits on chunk boundaries update both the edited chunk and its neighbor where faces are shared.

---

## Activity 2: Add basic block types mapped to hotbar slots

1. **At least five distinct block types**
   - **What to develop**: Expand the block registry so there are at least five distinct, visually distinguishable block types available for placement.
   - **Definition of done**: The block registry includes at least five non-air, renderable block types with distinct colors.
   - **Acceptance criteria**:
     - At least five block types can be resolved by id and are visually distinct when rendered.

2. **Hotbar mapping to block types**
   - **What to develop**: Map hotbar slots (1–9) to specific block types so the current selection determines the placed block id.
   - **Definition of done**: Selecting a hotbar slot deterministically selects the corresponding block type for placement.
   - **Acceptance criteria**:
     - Changing the hotbar selection changes the block id placed on right-click.

3. **Selection reflects in placement behavior**
   - **What to develop**: Placement logic uses the current hotbar selection at the time of placement.
   - **Definition of done**: New placements always use the most recent selection.
   - **Acceptance criteria**:
     - After changing selection, successive placements use the newly selected block type until the selection changes again.

---

## Activity 3: Add interaction rate limiting (click cooldown)

1. **Cooldown gate**
   - **What to develop**: A simple interaction cooldown that limits how frequently break/place actions can occur.
   - **Definition of done**: Interactions cannot occur more frequently than the defined cooldown interval.
   - **Acceptance criteria**:
     - Two interaction inputs within the cooldown window result in only the first edit taking effect.

2. **Applies to break and place**
   - **What to develop**: Apply the cooldown to both left-click break and right-click place actions.
   - **Definition of done**: Both action types obey the same rate limit.
   - **Acceptance criteria**:
     - Alternating break and place inputs still respect the cooldown and do not exceed the rate.

3. **Handles rapid clicking or holding**
   - **What to develop**: Interaction handling remains stable for rapid input and for sustained input without producing unintended repeated edits.
   - **Definition of done**: Rapid/held inputs do not exceed the configured interaction rate.
   - **Acceptance criteria**:
     - Sustained input cannot produce edits more frequently than the cooldown interval.

