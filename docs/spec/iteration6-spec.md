# Iteration 6 Development Spec - Sprint Craft (MVP2 Prep)

Source of truth for this iteration:
- scope.md (non-negotiable game concept + controls)
- docs/spec/mvp2-spec.md (MVP2 design and activities)
- docs/spec/iteration5-spec.md (style and testability bar)

This spec turns Iteration 6 activities into implementable, testable requirements.

---

## Activity 1: Centered branding splash that hides on first input

1. **Branding splash element**
   - **What to develop**: Add a centered HUD element that displays "Sprint Craft" in white.
   - **Definition of done**: The splash is visible on load, centered, and styled for clear branding.
   - **Acceptance criteria (integration-testable)**:
     - DOM contains `#brandSplash` with text "Sprint Craft".
     - `#brandSplash` is visible on load (not hidden).

2. **Dismiss on first input**
   - **What to develop**: Hide the splash on the first keyboard or mouse input.
   - **Definition of done**: The splash disappears after the first input event and does not reappear.
   - **Acceptance criteria**:
     - Dispatching a `keydown` or `mousedown` event hides the splash.
     - Subsequent inputs do not show the splash again.

---

## Activity 2: Full-body avatar with over-the-shoulder camera

1. **Full-body avatar mesh**
   - **What to develop**: Construct a player avatar with head, torso, upper/lower arms, and upper/lower legs.
   - **Definition of done**: Avatar meshes are created with deterministic names and approximate the collider height.
   - **Acceptance criteria**:
     - Scene contains named meshes for each body part (head, torso, arms, legs).
     - Total avatar height aligns to the standing collider height (~1.8).

2. **Over-the-shoulder camera placement**
   - **What to develop**: Place the camera at a right-shoulder offset and aim at the head/eye target.
   - **Definition of done**: Camera position is offset from player position with a stable target.
   - **Acceptance criteria**:
     - Camera position differs from eye position by the configured offset.
     - Camera target aligns with head/eye height.

3. **Camera clamp against voxels**
   - **What to develop**: Prevent camera clipping by clamping the shoulder camera along a ray to avoid solids.
   - **Definition of done**: Camera is adjusted forward when a voxel blocks the desired position.
   - **Acceptance criteria**:
     - When a solid voxel lies behind the player, camera distance is reduced.
     - With no obstructions, camera stays at the desired offset distance.

---

## Activity 3: Hand/arm motion tied to actions

1. **Procedural swing for movement**
   - **What to develop**: A simple walk cycle that swings arms based on movement speed.
   - **Definition of done**: Arm rotation varies over time while moving.
   - **Acceptance criteria**:
     - With movement input, arm swing angle changes over successive ticks.

2. **Action-triggered swing**
   - **What to develop**: Trigger an arm swing when a break/place action succeeds.
   - **Definition of done**: Break/place sets a swing timer or impulse used by the animation.
   - **Acceptance criteria**:
     - On a successful break/place, a swing state is activated.

---

## Activity 4: Nameplate over avatar head

1. **Nameplate creation**
   - **What to develop**: Create a billboarded nameplate with text "<User 1>".
   - **Definition of done**: Nameplate mesh is present and readable.
   - **Acceptance criteria**:
     - Scene contains a named mesh for the nameplate.
     - Nameplate text is set to "<User 1>".

2. **Nameplate follows head**
   - **What to develop**: Update nameplate position to track the avatar head.
   - **Definition of done**: Nameplate stays above the head while the player moves.
   - **Acceptance criteria**:
     - Moving the player updates the nameplate position.

---

## Activity 5: Validation updates for MVP2 changes

1. **Unit tests**
   - **What to develop**: Add unit tests for hand animation action triggers.
   - **Definition of done**: Unit tests cover action-triggered swing.
   - **Acceptance criteria**:
     - Unit test asserts swing activation on action.

2. **Integration tests**
   - **What to develop**: Add integration tests for avatar creation, camera clamp, and nameplate follow.
   - **Definition of done**: Integration tests cover acceptance criteria for Activities 1-4.
   - **Acceptance criteria**:
     - Tests verify branding splash hide behavior.
     - Tests verify avatar mesh creation and camera clamp.
     - Tests verify nameplate presence and follow.

---

## Definition of Done (Iteration 6)
- All Activity acceptance criteria are met.
- Unit and integration tests exist and pass.
- Manual test spec is documented in docs/spec/iteration6-test.md.
