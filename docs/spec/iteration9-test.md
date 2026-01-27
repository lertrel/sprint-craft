# Iteration 9 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`
- Run `npm run dev`

---

Acceptance Criteria 1 (Username dialog is visible and hides on OK):
  Test Case 1
    Step 1: Open `http://localhost:5173`.
    Step 2: Confirm a dialog labeled "Choose avatar name" is visible with a textbox and OK button.
    Step 3: Click OK.
    Step 4: Confirm the dialog disappears.

Acceptance Criteria 2 (Trimmed username and formatted nameplate text):
  Test Case 1
    Step 1: Reload the page to show the dialog again.
    Step 2: Enter `  John  ` in the textbox.
    Step 3: Click OK.
    Step 4: Confirm the nameplate text shows `<John>`.

Acceptance Criteria 3 (Blank input uses `<User 1>`):
  Test Case 1
    Step 1: Reload the page to show the dialog again.
    Step 2: Leave the textbox blank.
    Step 3: Click OK.
    Step 4: Confirm the nameplate text shows `<User 1>`.

Acceptance Criteria 4 (Torso default color distinct from body):
  Test Case 1
    Step 1: Observe the avatar.
    Step 2: Confirm the torso color differs from the head/arms/legs colors.

Acceptance Criteria 5 (Face and eyes on the front of the head):
  Test Case 1
    Step 1: Observe the avatar from the front.
    Step 2: Confirm a lighter face area is visible on the front of the head.
    Step 3: Confirm two black eyes are visible on the face.
