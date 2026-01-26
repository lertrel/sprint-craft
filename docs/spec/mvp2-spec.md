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

## Iteration Plan

Iteration 7
- Add front/back visual cues for the avatar (front marker and/or edge rendering).
- Implement movement-facing rules (most-recently-pressed key) and idle facing to camera yaw.
- Update right arm pose rules (down idle, forward while moving/aiming, action-only swing).
- Fix nameplate visuals (transparent background, bright red text).
- Add unit and integration tests for new facing/arm/nameplate behavior.
