## Iteration 7 Development Spec - Sprint Craft (MVP2 Continuation)

Source of truth for this iteration:
- scope.md (MVP2 goals)
- docs/spec/mvp2-spec.md (Iteration 7 activities)
- docs/spec/iteration6-spec.md (style + testability bar)

This spec turns Iteration 7 activities into implementable, testable requirements.

---

## Activity 1: Avatar visual clarity and front/back differentiation

1. **Front marker mesh**
   - **What to develop**: Add a small, deterministic "front marker" mesh on the avatar to clearly indicate the forward direction.
   - **Definition of done**: The marker is created with a deterministic name and remains attached to the avatar pose.
   - **Acceptance criteria (integration-testable)**:
     - Scene contains a mesh named `player:frontMarker`.
     - The marker is positioned in front of the torso/head relative to the avatar yaw.

2. **Edge rendering for silhouette clarity**
   - **What to develop**: Enable edge rendering on avatar meshes when Babylon supports it.
   - **Definition of done**: Avatar body parts have edge rendering enabled without throwing in test environments.
   - **Acceptance criteria**:
     - When edge rendering APIs are available, meshes report edge rendering enabled or edges width set.
     - Tests do not fail when Babylon edge APIs are missing.

---

## Activity 2: Movement-facing rules for W/A/S/D (single-key facing + idle yaw)

1. **Most-recently-pressed key tracking**
   - **What to develop**: Track the most-recently-pressed movement key among W/A/S/D.
   - **Definition of done**: When multiple movement keys are held, the avatar faces the most recently pressed key direction.
   - **Acceptance criteria (unit-testable)**:
     - Press W then A while both are held → facing follows A.
     - Releasing A reverts facing to W if W remains held.

2. **Idle facing aligns to camera yaw**
   - **What to develop**: When no movement keys are down, align avatar facing to camera yaw.
   - **Definition of done**: Avatar yaw updates to match camera yaw in idle state.
   - **Acceptance criteria (integration-testable)**:
     - With no movement input, avatar yaw equals camera yaw after a tick.

---

## Activity 3: Right-arm forward pose + action swing constraint

1. **Right arm base pose rules**
   - **What to develop**: Right arm rests down at idle and points forward while moving/aiming.
   - **Definition of done**: Base pose switches deterministically based on movement/aiming state.
   - **Acceptance criteria (integration-testable)**:
     - With no movement/aiming input, right arm rotation is the "down" pose.
     - With movement/aiming active, right arm rotation is the "forward" pose.

2. **Action-only swing for right arm**
   - **What to develop**: Right arm swing triggers only on successful break/place actions.
   - **Definition of done**: Right arm no longer swings with walk-cycle; action swing overlays base pose.
   - **Acceptance criteria (unit-testable)**:
     - Walking updates only left-arm swing (right swing remains zero without action).
     - Successful break/place produces a right-arm swing impulse.

---

## Activity 4: Nameplate style update (transparent background + bright red text)

1. **Transparent background**
   - **What to develop**: Clear the dynamic texture with transparent background before drawing text.
   - **Definition of done**: Nameplate renders with no black background.
   - **Acceptance criteria (unit/integration-testable)**:
     - The texture draw call uses a transparent background (e.g., rgba(0,0,0,0)).
     - Dynamic texture alpha is enabled when supported by Babylon.

2. **Bright red text**
   - **What to develop**: Draw the nameplate text in bright red.
   - **Definition of done**: Nameplate text color is red and remains readable.
   - **Acceptance criteria**:
     - Draw call uses a bright red color (e.g., #ff3333 or rgb(255,0,0)).

---

## Activity 5: Validation updates for new orientation/arm/nameplate rules

1. **Unit tests**
   - **What to develop**: Add unit tests for facing selection, right-arm swing constraints, and nameplate draw settings.
   - **Definition of done**: Unit tests exist and cover Activity 2-4 requirements.
   - **Acceptance criteria**:
     - Unit tests validate most-recently-pressed facing selection.
     - Unit tests validate right arm has no walk swing and action swing triggers.
     - Unit tests validate nameplate draw color/background settings.

2. **Integration tests**
   - **What to develop**: Add integration tests for front marker existence, idle yaw alignment, and right arm pose behavior.
   - **Definition of done**: Integration tests cover acceptance criteria for Activities 1-3.
   - **Acceptance criteria**:
     - Tests assert `player:frontMarker` exists.
     - Tests verify avatar yaw aligns to camera yaw when idle.
     - Tests verify right arm base pose changes between idle and moving/aiming states.

---

## Definition of Done (Iteration 7)
- All Activity acceptance criteria are met.
- Unit and integration tests exist and pass.
- Manual test spec is documented in docs/spec/iteration7-test.md.
