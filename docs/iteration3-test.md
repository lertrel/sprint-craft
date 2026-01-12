# Iteration 3 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (WASD movement: forward follows view yaw):
  Test Case 1
    Step 1: Run `npm test -- -t "moves relative to yaw"`
    Step 2: Confirm the test passes, indicating movement direction changes when yaw changes.

Acceptance Criteria 2 (WASD movement: diagonal normalization):
  Test Case 1
    Step 1: Run `npm test -- -t "normalizes diagonal"`
    Step 2: Confirm the test passes, indicating forward+right is not faster than forward-only.

Acceptance Criteria 3 (Gravity: falls, lands, and rests stably):
  Test Case 1
    Step 1: Run `npm test -- -t "lands stably"`
    Step 2: Confirm the test passes, indicating the player falls onto terrain and does not sink/jitter at rest.

Acceptance Criteria 4 (Jump: only when grounded, no midair re-boost):
  Test Case 1
    Step 1: Run `npm test -- -t "only allows jump when grounded"`
    Step 2: Confirm the test passes, indicating jump works from grounded and does not re-trigger upward velocity while airborne.

Acceptance Criteria 5 (Sprint: greater displacement than walking):
  Test Case 1
    Step 1: Run `npm test -- -t "sprint increases displacement"`
    Step 2: Confirm the test passes, indicating sprinting produces greater movement over the same duration.

Acceptance Criteria 6 (Sprint: releasing Shift returns to walking speed immediately):
  Test Case 1
    Step 1: Run `npm test -- -t "sprint increases displacement"`
    Step 2: Confirm the test passes; the test suite asserts sprint is a reversible speed modifier (no persistent speed after sprint input is absent).

Acceptance Criteria 7 (Ctrl reduces collider height and reduces speed):
  Test Case 1
    Step 1: Run `npm test -- -t "crouch/crawl reduces speed"`
    Step 2: Confirm the test passes, indicating stance becomes non-standing and speed is reduced while Ctrl is held.

Acceptance Criteria 8 (Blocked stand-up under low ceiling):
  Test Case 1
    Step 1: Run `npm test -- -t "blocked by low ceiling"`
    Step 2: Confirm the test passes, indicating the player remains in a reduced stance when standing would intersect overhead blocks.

Acceptance Criteria 9 (Wall collision: stops motion toward wall, allows sliding):
  Test Case 1
    Step 1: Run `npm test -- -t "stops at walls"`
    Step 2: Confirm the test passes, indicating x-motion is blocked by a wall while z-motion continues (sliding).

Acceptance Criteria 10 (Ground collision: falling stops and sets grounded suitable for jumping):
  Test Case 1
    Step 1: Run `npm test -- -t "grounded reliably"`
    Step 2: Confirm the test passes, indicating stable grounded detection after landing.

Acceptance Criteria 11 (Ceiling collision: stops upward motion and falls normally):
  Test Case 1
    Step 1: Run `npm test -- -t "handles ceilings"`
    Step 2: Confirm the test passes, indicating upward motion is blocked by a ceiling and the player returns to ground.

Acceptance Criteria 12 (Axis-separated stability: no drift/sinking at rest):
  Test Case 1
    Step 1: Run `npm test -- -t "lands stably"`
    Step 2: Confirm the test passes, indicating position remains stable on flat ground over many frames.

Acceptance Criteria 13 (Edge behavior: grounded becomes false when leaving support):
  Test Case 1
    Step 1: Run `npm test`
    Step 2: Confirm all Iteration 3 tests pass; the integration-ish collision suite covers grounded transitions as part of continuous movement + gravity behavior.

Acceptance Criteria 14 (Minimal snag prevention at exterior corners):
  Test Case 1
    Step 1: Run `npm test -- -t "does not get permanently stuck on an exterior corner"`
    Step 2: Confirm the test passes, indicating no permanent stuck state and no solid interpenetration after diagonal corner approach.

Acceptance Criteria 15 (Safe spawn: does not intersect solids; settles onto terrain):
  Test Case 1
    Step 1: Run `npm test -- -t "spawns above ground without intersecting"`
    Step 2: Confirm the test passes, indicating spawn AABB does not intersect solids and the player settles to ground.

Acceptance Criteria 16 (Respawn: out-of-bounds triggers safe respawn; simulation continues):
  Test Case 1
    Step 1: Run `npm test -- -t "respawns when out of bounds"`
    Step 2: Confirm the test passes, indicating the player is relocated above ground and continues updating normally.

