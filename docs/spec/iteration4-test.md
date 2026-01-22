# Iteration 4 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Raycast returns correct hit cell + face normal):
  Test Case 1
    Step 1: Run `npm test -- -t "raycast hits a solid block"`
    Step 2: Confirm the test passes, indicating the hit cell and face normal are correct.

Acceptance Criteria 2 (Raycast returns no hit in empty space):
  Test Case 1
    Step 1: Run `npm test -- -t "raycast returns null when no solid is in range"`
    Step 2: Confirm the test passes, indicating empty-space rays return no hit.

Acceptance Criteria 3 (Left-click breaks targeted block and persists):
  Test Case 1
    Step 1: Run `npm test -- -t "left-click breaks the targeted block"`
    Step 2: Confirm the test passes, indicating the block is removed from world state.

Acceptance Criteria 4 (Right-click places adjacent block when empty):
  Test Case 1
    Step 1: Run `npm test -- -t "right-click places a block adjacent"`
    Step 2: Confirm the test passes, indicating the adjacent cell is filled.

Acceptance Criteria 5 (Placement blocked when intersecting player AABB):
  Test Case 1
    Step 1: Run `npm test -- -t "prevents placement when the target cell intersects the player AABB"`
    Step 2: Confirm the test passes, indicating placement is vetoed when overlapping the player.

Acceptance Criteria 6 (Edits trigger rebuild scheduling for affected chunk):
  Test Case 1
    Step 1: Run `npm test -- -t "marks its chunk dirty"`
    Step 2: Confirm the test passes, indicating rebuild scheduling occurs after edits.

Acceptance Criteria 7 (Chunk boundary edits update neighbor chunk):
  Test Case 1
    Step 1: Run `npm test -- -t "marks neighbor chunks dirty when edits are on a chunk boundary"`
    Step 2: Confirm the test passes, indicating neighbor chunks are queued.

Acceptance Criteria 8 (At least five distinct block types available):
  Test Case 1
    Step 1: Run `npm test -- -t "provides at least five distinct"`
    Step 2: Confirm the test passes, indicating the hotbar registry contains five or more distinct blocks.

Acceptance Criteria 9 (Selection changes placed block id):
  Test Case 1
    Step 1: Run `npm test -- -t "changing hotbar selection changes placed block ids"`
    Step 2: Confirm the test passes, indicating selection controls placement.

Acceptance Criteria 10 (Selection persists until changed):
  Test Case 1
    Step 1: Run `npm test -- -t "changing hotbar selection changes placed block ids"`
    Step 2: Confirm the test passes, indicating successive placements use the current selection.

Acceptance Criteria 11 (Cooldown prevents rapid repeat edits):
  Test Case 1
    Step 1: Run `npm test -- -t "two rapid inputs only apply the first edit"`
    Step 2: Confirm the test passes, indicating cooldown blocks the second edit.

Acceptance Criteria 12 (Cooldown applies across break/place):
  Test Case 1
    Step 1: Run `npm test -- -t "applies cooldown across alternating break/place inputs"`
    Step 2: Confirm the test passes, indicating both actions share the cooldown.

Acceptance Criteria 13 (Sustained input does not exceed rate):
  Test Case 1
    Step 1: Run `npm test -- -t "limits sustained input to the configured interaction rate"`
    Step 2: Confirm the test passes, indicating sustained input is rate-limited.
