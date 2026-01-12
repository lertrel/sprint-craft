# Iteration 3 Development Spec — Sprint Craft

Source of truth for this iteration:
- `scope.md` (non‑negotiable game concept + controls)
- `wip.md` (Iteration 3 bullet list)
- `docs/spec/iteration2-spec.md` (style + testability bar)

This spec turns Iteration 3 bullets into implementable, testable requirements.

---

## Activity 1: Implement player movement controller (no physics engine)

1. **WASD movement relative to view**
   - **What to develop**: A deterministic movement controller that converts WASD input into horizontal movement aligned to the player’s view yaw (forward/back/strafe), including diagonal normalization so diagonal movement is not faster than axial movement.
   - **Definition of done**: With the same input and camera yaw, the controller produces the same displacement regardless of frame rate; movement direction matches view direction.
   - **Acceptance criteria (integration-testable)**:
     - With “forward” input held, rotating yaw by 90° changes movement direction accordingly (world-space displacement rotates with yaw).
     - Holding forward+right produces the same overall horizontal speed as holding forward only (normalized diagonal).

2. **Gravity + jump**
   - **What to develop**: Continuous gravity affecting vertical velocity, and a grounded-only jump that imparts an immediate upward velocity on jump press.
   - **Definition of done**: Player falls when not supported, rests stably when supported, and can jump only when grounded (no double-jump from midair).
   - **Acceptance criteria**:
     - When initially placed above solid ground with no input, the player falls until contacting the ground and then remains at rest (no sinking/jitter).
     - Pressing jump while grounded produces an upward displacement within the next frame; pressing jump while airborne does not add repeated upward boosts.

3. **Sprint (Shift) speed multiplier**
   - **What to develop**: A sprint modifier that increases horizontal movement speed while Shift is held, without affecting gravity/jump behavior.
   - **Definition of done**: Sprint is an immediate, reversible multiplier on horizontal speed and does not destabilize collision/grounding.
   - **Acceptance criteria**:
     - For the same time interval and direction, displacement while sprinting is greater than displacement while walking.
     - Releasing Shift returns speed to walking speed immediately (next frame reflects the change).

4. **Crouch/crawl (Ctrl) height reduction + speed reduction**
   - **What to develop**: A stance system driven by Ctrl that reduces collider height (standing → crouching/crawling) and applies a speed reduction while active.
   - **Definition of done**: Stance changes update the effective player height deterministically, and standing back up is blocked if there is insufficient overhead clearance.
   - **Acceptance criteria**:
     - With Ctrl held, the player’s effective collider height is reduced and horizontal speed is reduced relative to standing.
     - If a solid block is directly overhead such that standing height would intersect it, releasing Ctrl does not allow the player to stand up (stance remains reduced until clearance exists).

---

## Activity 2: Implement manual voxel collision

1. **Player AABB against solid voxels**
   - **What to develop**: Manual collision between a player axis-aligned bounding box (AABB) and solid voxels. Collision should prevent interpenetration and allow sliding along surfaces.
   - **Definition of done**: The player cannot enter solid blocks via movement or gravity, and collision resolution is stable (no oscillation) under sustained input.
   - **Acceptance criteria**:
     - Moving into a solid wall stops motion toward the wall while still allowing motion along the wall.
     - Falling onto solid terrain stops vertical motion at contact and sets a grounded state suitable for jumping.
     - Jumping into a ceiling stops upward motion at contact and the player falls normally afterward.

2. **Axis-separated resolution (X/Y/Z) with grounded detection**
   - **What to develop**: A deterministic collision resolution strategy that resolves movement in separated axes and produces a reliable grounded signal.
   - **Definition of done**: Grounded is true only when supported; vertical velocity is zeroed on ground contact; ceiling contact zeroes upward velocity.
   - **Acceptance criteria**:
     - When standing still on flat ground for multiple frames, position remains constant (no drift, no gradual sinking).
     - When the player walks off an edge, grounded becomes false and gravity causes downward motion the next frames.

3. **Step/ledge handling (minimal: prevent snagging on corners)**
   - **What to develop**: Minimal “step up” or snag-prevention behavior so diagonal movement past block corners does not permanently stick. This does not need to support complex climbing—only basic smoothness for common corner cases.
   - **Definition of done**: Approaching an exterior corner diagonally does not leave the player trapped in a collision state; movement remains responsive.
   - **Acceptance criteria**:
     - When moving diagonally into an exterior corner, the player does not get permanently stuck; continuing to hold movement results in either sliding along one face or stopping cleanly without jitter.

---

## Activity 3: Spawn/respawn logic (safe spawn above ground)

1. **Safe spawn above ground**
   - **What to develop**: A spawn selection routine that places the player above the terrain in a non-intersecting location with enough clearance for the current stance, then allows gravity to settle them onto the ground.
   - **Definition of done**: On boot, the player starts in a valid, controllable state (not inside blocks) and falls onto the terrain if not already grounded.
   - **Acceptance criteria**:
     - On a fresh start, the player’s initial position does not intersect any solid voxel.
     - Within a short time window (a few seconds of simulated frames), the player ends up grounded on terrain near the spawn column without having intersected solid blocks.

2. **Respawn triggers and behavior**
   - **What to develop**: A deterministic respawn pathway that reuses the safe spawn routine when the player enters an invalid state (e.g., far below the world or invalid numeric state).
   - **Definition of done**: When the respawn trigger condition occurs, the player is relocated to a safe spawn position and resumes normal control without repeated respawn loops.
   - **Acceptance criteria**:
     - If the player is forced below a defined “out of bounds” threshold, the next update respawns them above ground in a non-intersecting location.
     - After respawn, movement and gravity continue to behave normally (no frozen input, no NaN propagation).

