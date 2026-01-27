# Iteration 9 Development Spec - Sprint Craft (MVP2 Continuation)

Source of truth for this iteration:
- scope.md (MVP2 goals)
- docs/spec/mvp2-spec.md (Iteration 9 activities)
- docs/spec/iteration8-spec.md (style + testability bar)

This spec turns Iteration 9 activities into implementable, testable requirements.

---

## Activity 1: Dynamic username capture and nameplate assignment

1. **Username dialog on first load**
   - **What to develop**: Display a dialog with label "Choose avatar name", a textbox, and an OK button on initial load.
   - **Definition of done**: The dialog is visible at startup, accepts input, and hides once OK is pressed.
   - **Acceptance criteria (integration-testable)**:
     - DOM contains a visible dialog with the label text "Choose avatar name", an input textbox, and an OK button.
     - Clicking OK hides the dialog (not visible afterward).

2. **Username resolution and formatting**
   - **What to develop**: Trim the textbox value; if blank, use `getAnonymousUserName()` returning "User 1"; format the final value as `"<{username}>"`.
   - **Definition of done**: The resolved name is deterministic and always wrapped in angle brackets.
   - **Acceptance criteria (unit-testable)**:
     - `resolveUsername("  John  ")` returns `"John"`.
     - `resolveUsername("")` returns `"User 1"`.
     - `formatUsername("John")` returns `"<John>"`.

3. **Nameplate update**
   - **What to develop**: Update the avatar nameplate text to the formatted username on OK.
   - **Definition of done**: Nameplate text reflects the chosen name, using the `"<{username}>"` format.
   - **Acceptance criteria (integration-testable)**:
     - Clicking OK with "John" updates the nameplate text to `"<John>"`.
     - Clicking OK with blank updates the nameplate text to `"<User 1>"`.

---

## Activity 2: Torso color differentiation with creation-time option

1. **Default torso color**
   - **What to develop**: Apply a default torso "cloth" color distinct from the body and environment.
   - **Definition of done**: The torso uses a dedicated material color that is different from other body parts.
   - **Acceptance criteria (unit/integration-testable)**:
     - Torso material color matches the defined default cloth color.
     - Torso material color differs from the base body material color.

2. **Creation-time override**
   - **What to develop**: Allow a torso color override at avatar creation time.
   - **Definition of done**: Passing an override color applies that color to the torso on creation.
   - **Acceptance criteria (unit-testable)**:
     - When created with an override color, the torso material uses that override.

3. **Stable across pose updates**
   - **What to develop**: Ensure torso color remains unchanged across pose updates (standing/crouching, movement).
   - **Definition of done**: Torso color is stable unless explicitly overridden at creation.
   - **Acceptance criteria (unit-testable)**:
     - Calling `setPose` multiple times does not change torso material color.

---

## Activity 3: Face/eyes detail on avatar head front

1. **Face plate**
   - **What to develop**: Add a face plate mesh to the front of the head with a distinct face color.
   - **Definition of done**: Face plate is visible and positioned on the front side of the head.
   - **Acceptance criteria (integration-testable)**:
     - Scene contains a mesh named `player:face`.
     - `player:face` position is in front of the head center (z > head.z when yaw = 0).

2. **Eyes**
   - **What to develop**: Add two black eyes on the front of the head.
   - **Definition of done**: Eye meshes exist, are black, and are positioned on the face front.
   - **Acceptance criteria (integration-testable)**:
     - Scene contains meshes named `player:eyeL` and `player:eyeR`.
     - Eye materials use black color.

---

## Activity 4: Validation updates for username and appearance changes

1. **Unit tests**
   - **What to develop**: Add unit tests for username resolution/formatting, torso color defaults/overrides, and face/eye colors.
   - **Definition of done**: Unit tests cover deterministic behavior for Activities 1-3.
   - **Acceptance criteria**:
     - Unit tests validate `resolveUsername`, `formatUsername`, and torso color behavior.

2. **Integration tests**
   - **What to develop**: Add integration tests for dialog behavior, nameplate updates, and face/eyes mesh placement.
   - **Definition of done**: Integration tests cover Activities 1 and 3 acceptance criteria.
   - **Acceptance criteria**:
     - Integration tests assert dialog OK hides and updates nameplate text.
     - Integration tests assert face/eyes mesh existence and front placement.

---

## Definition of Done (Iteration 9)
- All Activity acceptance criteria are met.
- Unit and integration tests exist and pass.
- Manual test spec is documented in docs/spec/iteration9-test.md.
