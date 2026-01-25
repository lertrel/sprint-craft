# Iteration 6 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Branding splash shows and hides on first input):
  Test Case 1
    Step 1: Run `npm run dev`.
    Step 2: Open `http://localhost:5173` and confirm the centered "Sprint Craft" splash is visible.
    Step 3: Press any key or click the mouse.
    Step 4: Confirm the splash disappears and does not return.

Acceptance Criteria 2 (Full-body avatar meshes exist and align to standing height):
  Test Case 1
    Step 1: Run `npm run dev` and enter the world.
    Step 2: Confirm the avatar has head, torso, arms, and legs.
    Step 3: Confirm the avatar height is approximately the player height (about 1.8 blocks).

Acceptance Criteria 3 (Over-the-shoulder camera with clamp):
  Test Case 1
    Step 1: Stand near a wall behind the player.
    Step 2: Confirm the camera moves forward to avoid clipping into the wall.
    Step 3: Move away from the wall and confirm the camera returns to the shoulder offset.

Acceptance Criteria 4 (Hand/arm motion tied to movement and actions):
  Test Case 1
    Step 1: Walk forward and confirm arms swing.
    Step 2: Break or place a block and confirm the right arm swings.

Acceptance Criteria 5 (Nameplate above avatar head):
  Test Case 1
    Step 1: Observe the avatar and confirm a nameplate is visible above the head.
    Step 2: Move the player and confirm the nameplate follows the head.
