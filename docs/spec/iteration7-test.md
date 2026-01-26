## Iteration 7 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Front marker mesh exists):
  Test Case 1
    Step 1: Run `npm run dev`.
    Step 2: Open `http://localhost:5173` and enter the world.
    Step 3: Confirm a small front marker is visible on the avatar (front/back are distinguishable).

Acceptance Criteria 2 (Edge rendering for avatar silhouette):
  Test Case 1
    Step 1: Run `npm run dev`.
    Step 2: Observe the avatar from multiple angles.
    Step 3: Confirm edges appear clearer than the voxel meshes (if supported by the browser).

Acceptance Criteria 3 (Most-recently-pressed movement key sets facing):
  Test Case 1
    Step 1: Hold W, then press A while still holding W.
    Step 2: Confirm the avatar turns to face its left side relative to movement.
    Step 3: Release A while holding W and confirm the avatar returns to facing forward.

Acceptance Criteria 4 (Idle facing aligns to camera yaw):
  Test Case 1
    Step 1: Release all movement keys.
    Step 2: Move the mouse to change camera yaw.
    Step 3: Confirm the avatar facing matches the camera yaw when idle.

Acceptance Criteria 5 (Right arm base pose rules):
  Test Case 1
    Step 1: Stand still without clicking or moving.
    Step 2: Confirm the right arm rests down.
    Step 3: Hold W or click to aim and confirm the right arm points forward.

Acceptance Criteria 6 (Right arm action-only swing):
  Test Case 1
    Step 1: Walk forward and confirm the right arm does not swing with walking.
    Step 2: Break or place a block successfully.
    Step 3: Confirm the right arm swings only on the successful action.

Acceptance Criteria 7 (Nameplate transparent background and red text):
  Test Case 1
    Step 1: Observe the nameplate above the avatar head.
    Step 2: Confirm the text is bright red and there is no black background behind it.
