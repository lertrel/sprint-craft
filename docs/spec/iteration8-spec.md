# Iteration 8 Development Spec - Sprint Craft (MVP2 Continuation)

Source of truth for this iteration:
- scope.md (MVP2 goals)
- docs/spec/mvp2-spec.md (Iteration 8 activities)
- docs/spec/iteration7-spec.md (style + testability bar)

This spec turns Iteration 8 activities into implementable, testable requirements.

---

## Activity 1: Interaction feedback HUD (crosshair + target highlight)

1. **Crosshair HUD element**
   - **What to develop**: Add a lightweight HUD crosshair element that is always visible during gameplay.
   - **Definition of done**: Crosshair element exists in the DOM with a deterministic id and does not block pointer interactions.
   - **Acceptance criteria (integration-testable)**:
     - DOM contains `#crosshair`.
     - `#crosshair` remains visible after app init and does not prevent clicking the canvas.

2. **Target highlight mesh**
   - **What to develop**: Create a single highlight mesh that marks the currently targeted voxel based on the shared raycast result.
   - **Definition of done**: Highlight mesh is created once and toggles visibility/position deterministically from targeting data.
   - **Acceptance criteria (integration-testable)**:
     - Scene contains a mesh named `target:highlight`.
     - When a target is present, the highlight mesh becomes visible and is positioned at the targeted voxel.
     - When no target is present, the highlight mesh is hidden.

---

## Activity 2: Placement preview (ghost block) aligned to target face

1. **Ghost block mesh**
   - **What to develop**: Create a single transparent preview mesh for the placement candidate.
   - **Definition of done**: Preview mesh is created once, has a deterministic name, and can be shown/hidden.
   - **Acceptance criteria (integration-testable)**:
     - Scene contains a mesh named `placement:preview`.
     - Preview material uses transparency (alpha < 1).

2. **Preview visibility rules**
   - **What to develop**: Show the preview only when placement is valid (adjacent cell is air and does not intersect the player AABB).
   - **Definition of done**: Preview visibility follows the same placement validity rules as actual placement.
   - **Acceptance criteria (unit/integration-testable)**:
     - With a valid target and empty adjacent cell, preview is visible at the placement position.
     - When the placement cell would intersect the player AABB or is invalid, preview is hidden.

---

## Activity 3: Camera mode toggle with avatar visibility rules (KeyV)

1. **Camera mode state and toggle**
   - **What to develop**: Track camera mode (first-person vs shoulder) and toggle on `KeyV`.
   - **Definition of done**: Pressing `KeyV` switches between modes deterministically.
   - **Acceptance criteria (unit/integration-testable)**:
     - `KeyV` toggles the mode state between `firstPerson` and `shoulder`.
     - Mode state persists until toggled again.

2. **First-person camera placement**
   - **What to develop**: In first-person, place the camera at the player eye height with no shoulder offset.
   - **Definition of done**: Camera position in first-person matches the controller eye height.
   - **Acceptance criteria (integration-testable)**:
     - Switching to first-person moves the camera to eye height (distinct from shoulder offset position).

3. **Third-person shoulder camera with clamp**
   - **What to develop**: Continue to use the existing shoulder camera offset and voxel clamp in third-person mode.
   - **Definition of done**: Third-person camera uses offset + clamp behavior and remains stable.
   - **Acceptance criteria (integration-testable)**:
     - Switching to third-person restores the shoulder offset.
     - With a blocking voxel behind the player, camera distance is reduced.

4. **Avatar visibility rules**
   - **What to develop**: Hide head and arms in first-person mode; restore visibility in third-person.
   - **Definition of done**: Avatar visibility updates immediately on mode toggle.
   - **Acceptance criteria (integration-testable)**:
     - Head/arms are hidden in first-person mode.
     - Head/arms are visible in third-person mode.

---

## Activity 4: Validation updates for interaction feedback and camera modes

1. **Unit tests**
   - **What to develop**: Unit tests for targeting data, placement validity, and camera mode state toggling.
   - **Definition of done**: Unit tests cover Activity 1-3 deterministic behaviors.
   - **Acceptance criteria**:
     - Unit tests validate placement validity rules and camera mode toggle on `KeyV`.

2. **Integration tests**
   - **What to develop**: Integration tests for crosshair/highlight, placement preview, and camera mode visibility rules.
   - **Definition of done**: Integration tests cover acceptance criteria for Activities 1-3.
   - **Acceptance criteria**:
     - Tests assert `#crosshair`, `target:highlight`, and `placement:preview` behavior.
     - Tests verify camera toggle on `KeyV` and avatar visibility changes.

---

## Definition of Done (Iteration 8)
- All Activity acceptance criteria are met.
- Unit and integration tests exist and pass.
- Manual test spec is documented in docs/spec/iteration8-test.md.
