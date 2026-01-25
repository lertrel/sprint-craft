# MVP2 Preparation for Multi-player Phase - Sprint Craft

This document captures the design-approved activities and iteration plan for MVP2.

## Activities

Activity 1 - Branding splash (centered, hides on first input)
- Purpose: Show "Sprint Craft" prominently on load and hide after first keyboard or mouse input.
- Risks: Overlay could interfere with HUD readability if not styled carefully.
- Other Important Remarks: Use a centered, large, white label with a subtle shadow; remove on first input.

Activity 2 - Full-body avatar with over-the-shoulder camera
- Purpose: Render a complete avatar (head, torso, arms, legs) and shift camera to a shoulder offset.
- Risks: Camera clipping near walls; avatar alignment drift under stance changes.
- Other Important Remarks: Use simple primitive meshes and a camera clamp against voxels.

Activity 3 - Hand and arm motion tied to actions
- Purpose: Visible arm motion for walking and block interactions.
- Risks: Animation timing could feel off for rapid clicks.
- Other Important Remarks: Use lightweight procedural animation with action-triggered swings.

Activity 4 - Nameplate over avatar head
- Purpose: Display a user name above the avatar (example: "<User 1>").
- Risks: Readability against bright backgrounds; billboard alignment.
- Other Important Remarks: Use a billboarded plane with text drawn on a dynamic texture.

Activity 5 - Validation updates for MVP2 changes
- Purpose: Add unit and integration tests that cover the new visuals and behaviors.
- Risks: Visual behaviors are harder to test deterministically.
- Other Important Remarks: Expose deterministic IDs and state for assertions.

## Design

Activity 1 - Branding splash (centered, hides on first input)
- UPDATE: /workspace/index.html
  - Add a centered, large, white "Sprint Craft" splash element in the HUD.
  - Style for visibility and include a fade-out transition.
- UPDATE: /workspace/src/sprint-craft/app.ts
  - Add a one-time input listener (keyboard or mouse) to hide the splash.
- TEST: Integration test asserts splash is visible on load and hidden on first input.

Activity 2 - Full-body avatar with over-the-shoulder camera
- NEW: /workspace/src/sprint-craft/voxels/player-avatar.ts
  - Build a full-body avatar (head, torso, upper/lower arms, upper/lower legs).
- UPDATE: /workspace/src/sprint-craft/voxels/player-controller.ts
  - Expose camera target/anchor positions derived from player state.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Instantiate avatar, update pose each tick, and apply shoulder camera offset with voxel clamp.
- TEST: Integration tests verify avatar creation, height, and camera clamp behavior.

Activity 3 - Hand and arm motion tied to actions
- NEW: /workspace/src/sprint-craft/voxels/hand-animation.ts
  - Provide procedural swing data based on movement speed and action triggers.
- UPDATE: /workspace/src/sprint-craft/voxels/block-interaction.ts
  - Emit action events on successful break/place.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Feed movement/action signals into hand animation and apply to avatar.
- TEST: Unit test verifies action triggers set swing state.

Activity 4 - Nameplate over avatar head
- NEW: /workspace/src/sprint-craft/ui/nameplate.ts
  - Billboarded nameplate with a dynamic texture for text.
- UPDATE: /workspace/src/sprint-craft/voxels/player-avatar.ts
  - Provide head position for nameplate attachment.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Create and update nameplate each tick.
- TEST: Integration test verifies nameplate exists and follows avatar.

Activity 5 - Validation updates for MVP2 changes
- UPDATE: /workspace/tests/iteration6.integration.test.ts
  - Avatar creation, camera clamp, nameplate follow.
- UPDATE: /workspace/tests/iteration6.unit.test.ts
  - Hand animation action trigger behavior.

## Iteration Plan

Iteration 6
- Add a centered white "Sprint Craft" splash that hides on first keyboard or mouse input.
- Implement full-body avatar meshes aligned to the player collider height.
- Shift camera to a shoulder offset and clamp against voxels to prevent clipping.
- Add procedural arm/hand animation tied to movement and break/place actions.
- Add a nameplate above the avatar head with default text "<User 1>".
- Extend unit and integration tests to cover new behaviors.
