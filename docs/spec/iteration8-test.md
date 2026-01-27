# Iteration 8 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Crosshair HUD element exists):
  Test Case 1
    Step 1: Run `npm run dev`.
    Step 2: Open `http://localhost:5173`.
    Step 3: Confirm a crosshair is visible at the center of the screen.

Acceptance Criteria 2 (Target highlight mesh appears on targeted blocks):
  Test Case 1
    Step 1: Aim at a nearby block face.
    Step 2: Confirm a highlight appears around the targeted block.
    Step 3: Aim into empty space and confirm the highlight disappears.

Acceptance Criteria 3 (Placement preview shows only for valid placements):
  Test Case 1
    Step 1: Aim at a block face with empty adjacent space.
    Step 2: Confirm a transparent ghost block preview appears in the adjacent cell.
    Step 3: Move so the placement would intersect the player (standing inside the preview cell).
    Step 4: Confirm the preview hides when placement is invalid.

Acceptance Criteria 4 (Camera mode toggles with KeyV):
  Test Case 1
    Step 1: Press `V` once and confirm the camera switches to first-person view.
    Step 2: Press `V` again and confirm the camera returns to over-the-shoulder view.

Acceptance Criteria 5 (Shoulder orbit rear-arc clamp):
  Test Case 1
    Step 1: In over-the-shoulder view, rotate the camera around the avatar.
    Step 2: Confirm the camera cannot orbit to directly face the avatar's front.

Acceptance Criteria 6 (Avatar visibility rules in first-person):
  Test Case 1
    Step 1: Switch to first-person view (press `V`).
    Step 2: Confirm the avatar head, arms, and torso are hidden.
    Step 3: Switch back to over-the-shoulder view and confirm the head and arms are visible again.

Acceptance Criteria 7 (Standalone build stamp):
  Test Case 1
    Step 1: Run `npm run build:standalone`.
    Step 2: Open `standalone/index.html` in a browser.
    Step 3: Confirm a small timestamp is visible at the bottom right.
    Step 4: Verify the format is `dd-mm-yyyy:hh.mm.ss` and reflects UTC.
