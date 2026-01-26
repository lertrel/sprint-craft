# MVP2 Preparation for Multi-player Phase - Sprint Craft

This document captures the design-approved activities and iteration plan for MVP2.

## Activities

Activity 1 - Avatar visual clarity and front/back differentiation
- Purpose: Make the avatar easier to read and clearly distinguish front vs back.
- Risks: Over-stylization could clash with the minimal look; purely visual cues are hard to test.
- Other Important Remarks: Use lightweight, deterministic cues (edge rendering, asymmetric coloring, or a small front marker).

Activity 2 - Movement-facing rules for W/A/S/D (single-key facing + idle yaw)
- Purpose: Match scope: W=front, S=back, A=left side, D=right side; when not moving, align facing to camera yaw.
- Risks: Multi-key input may cause jitter if not handled deterministically.
- Other Important Remarks: Use most-recently-pressed key for facing when multiple keys are held.

Activity 3 - Right-arm forward pose + action swing constraint
- Purpose: Keep the right arm as a forward-facing cue and only swing on successful break/place.
- Risks: Conflicts with current walk-cycle swing; requires clear base pose rules.
- Other Important Remarks: Right arm is down at idle; forward while moving/aiming; action-only swing.

Activity 4 - Nameplate style update (transparent background + bright red text)
- Purpose: Ensure nameplate has no background and uses bright red text.
- Risks: Red text readability on bright backgrounds; transparency may require explicit alpha settings.
- Other Important Remarks: Explicitly clear the dynamic texture with transparent background and use bright red text.

Activity 5 - Validation updates for new orientation/arm/nameplate rules
- Purpose: Add unit and integration tests for avatar facing, right-arm constraints, and nameplate styling.
- Risks: Visual cues are hard to assert; may need deterministic hooks for tests.
- Other Important Remarks: Prefer deterministic state for assertions (facing key/yaw, arm pose, text color).

Activity 6 - Interaction feedback HUD (crosshair + target highlight)
- Purpose: Provide a clear aiming cue and highlight the targeted block for break/place.
- Risks: Per-frame highlight updates may add overhead; highlight may reduce readability in cluttered scenes.
- Other Important Remarks: Reuse existing raycast results; keep highlight deterministic and testable.

Activity 7 - Placement preview (ghost block) aligned to target face
- Purpose: Show the exact block placement location before placing.
- Risks: Ghost mesh could be mistaken for a real block; must hide preview when placement is invalid.
- Other Important Remarks: Drive preview from shared targeting data and hotbar selection.

Activity 8 - Camera mode toggle with avatar visibility rules (KeyV)
- Purpose: Switch between over-shoulder and first-person views without changing movement/collision behavior.
- Risks: Camera clipping, abrupt transitions, or obstructed first-person view.
- Other Important Remarks: Toggle on KeyV; hide head/arms in first-person to prevent obstruction.

Activity 9 - Validation updates for interaction feedback and camera modes
- Purpose: Add unit and integration tests for targeting feedback, preview behavior, and camera toggle rules.
- Risks: Visual cues are hard to assert; tests may need deterministic hooks for state and mesh visibility.
- Other Important Remarks: Prefer inspecting mesh names/visibility and draw parameters via fake Babylon.

## Design

Activity 1 - Avatar visual clarity and front/back differentiation
- UPDATE: /workspace/src/sprint-craft/voxels/player-avatar.ts
  - Add a small front marker mesh and/or asymmetric color to distinguish front/back.
  - Enable edge rendering on avatar parts when supported for clearer silhouettes.
- TEST: Integration test asserts front marker mesh exists and edge rendering flags are applied when available.

Activity 2 - Movement-facing rules for W/A/S/D (single-key facing + idle yaw)
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Track most-recently-pressed movement key (W/A/S/D) and set avatar yaw accordingly.
  - When no movement keys are down, align avatar yaw to camera yaw.
- TEST: Unit test verifies most-recently-pressed rule; integration test verifies idle yaw alignment.

Activity 3 - Right-arm forward pose + action swing constraint
- UPDATE: /workspace/src/sprint-craft/voxels/hand-animation.ts
  - Remove walk-cycle swing from the right arm; keep action-only swing on success.
- UPDATE: /workspace/src/sprint-craft/voxels/player-avatar.ts
  - Add base pose controls for right arm (down at idle, forward while moving/aiming).
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Determine moving/aiming state and apply right-arm base pose + action swing only.
- TEST: Unit test verifies right arm has no walk swing; integration test checks idle/forward/action poses.

Activity 4 - Nameplate style update (transparent background + bright red text)
- UPDATE: /workspace/src/sprint-craft/ui/nameplate.ts
  - Clear dynamic texture with transparent background and draw text in bright red.
  - Ensure alpha is preserved (texture/material settings) so no black background appears.
- TEST: Unit/integration test inspects drawText parameters and alpha settings via fake Babylon.

Activity 5 - Validation updates for new orientation/arm/nameplate rules
- NEW: /workspace/tests/iteration7.unit.test.ts
  - Facing rule, right arm swing constraints, nameplate draw settings.
- NEW: /workspace/tests/iteration7.integration.test.ts
  - Front marker existence, idle facing yaw, right arm pose behavior.
- UPDATE: /workspace/tests/fakes/fake-babylon.ts
  - Add minimal hooks to capture nameplate draw parameters and optional edge rendering flags.

Activity 6 - Interaction feedback HUD (crosshair + target highlight)
- NEW: /workspace/src/sprint-craft/ui/crosshair.ts
  - Add a DOM-based crosshair element with a deterministic id.
- NEW: /workspace/src/sprint-craft/voxels/targeting.ts
  - Centralize raycast targeting results for reuse across systems.
- NEW: /workspace/src/sprint-craft/voxels/target-highlight.ts
  - Create a single highlight mesh updated from targeting results.
- UPDATE: /workspace/src/sprint-craft/app.ts
  - Wire the crosshair into the HUD during initialization.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Update targeting per tick and drive highlight visibility and position.
- UPDATE: /workspace/src/sprint-craft/voxels/block-interaction.ts
  - Share or accept precomputed target data to avoid duplicate raycasts.
- TEST: Integration test asserts crosshair exists and highlight mesh toggles visibility.

Activity 7 - Placement preview (ghost block) aligned to target face
- NEW: /workspace/src/sprint-craft/voxels/placement-preview.ts
  - Create a ghost block mesh with transparent material and deterministic name.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Update preview each tick from targeting results and hotbar selection.
- UPDATE: /workspace/src/sprint-craft/voxels/block-interaction.ts
  - Reuse placement validity checks for preview and placement.
- UPDATE: /workspace/src/sprint-craft/voxels/blocks.ts
  - Provide a helper for preview colors (alpha or tint).
- TEST: Unit/integration tests verify preview visibility and suppression on invalid placement.

Activity 8 - Camera mode toggle with avatar visibility rules (KeyV)
- NEW: /workspace/src/sprint-craft/voxels/camera-mode.ts
  - Track camera mode state and toggle on KeyV.
- UPDATE: /workspace/src/sprint-craft/voxels/voxel-demo.ts
  - Apply first-person vs shoulder camera positioning; toggle on KeyV.
- UPDATE: /workspace/src/sprint-craft/voxels/player-avatar.ts
  - Hide head/arms in first-person and restore in third-person.
- UPDATE: /workspace/src/sprint-craft/ui/toast.ts (or app.ts)
  - Optional toast on camera mode changes.
- TEST: Integration test toggles KeyV and asserts camera position and avatar visibility.

Activity 9 - Validation updates for interaction feedback and camera modes
- NEW: /workspace/tests/iteration8.unit.test.ts
  - Targeting, placement validity, and camera mode state tests.
- NEW: /workspace/tests/iteration8.integration.test.ts
  - Crosshair/highlight/preview and camera toggle behavior.
- UPDATE: /workspace/tests/fakes/fake-babylon.ts
  - Add mesh visibility and material alpha hooks for highlight and preview.
- TEST: Manual test list for interaction feedback and camera modes.

## Iteration Plan

Iteration 7
- Add front/back visual cues for the avatar (front marker and/or edge rendering).
- Implement movement-facing rules (most-recently-pressed key) and idle facing to camera yaw.
- Update right arm pose rules (down idle, forward while moving/aiming, action-only swing).
- Fix nameplate visuals (transparent background, bright red text).
- Add unit and integration tests for new facing/arm/nameplate behavior.

Iteration 8
- Implement shared targeting (single raycast result) and HUD crosshair.
- Add target highlight mesh with deterministic visibility updates.
- Add placement preview (ghost block) tied to target + hotbar selection; suppress when invalid.
- Implement camera mode toggle on KeyV (first-person vs shoulder), reusing clamp logic in third-person.
- Apply avatar visibility rules (hide head/arms in first-person).
- Add Iteration 8 unit + integration tests and expand fake Babylon hooks as needed.
