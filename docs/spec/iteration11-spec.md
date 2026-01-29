# Iteration 11 Development Spec - Sprint Craft (MVP3)

Source of truth for this iteration:
- scope.md (MVP3 goals)
- docs/spec/mvp3-spec.md (Iteration 11 activities)
- docs/spec/iteration10-spec.md (style + testability bar)

This spec turns Iteration 11 activities into implementable, testable requirements.

---

## Activity 1: Movement replication pipeline (prediction + reconciliation + dead reckoning) and remote player management

1. **Client prediction + reconciliation**
   - **What to develop**: Client-side input buffering and prediction that replays inputs against authoritative snapshots, with bounded reconciliation.
   - **Definition of done**: Local movement stays responsive while corrections converge to the authoritative state without excessive rubber-banding.
   - **Acceptance criteria (unit/integration-testable)**:
     - Given a deterministic input stream, local prediction advances every tick without server input.
     - When a server snapshot arrives, reconciliation converges to the snapshot within a bounded error threshold.

2. **Dead reckoning for remote players**
   - **What to develop**: Interpolation/extrapolation for remote player motion using snapshot timestamps and a fixed interpolation window.
   - **Definition of done**: Remote avatars move smoothly between snapshots without jitter under normal conditions.
   - **Acceptance criteria (integration-testable)**:
     - With regular snapshots, remote player positions advance smoothly across ticks (no frame-to-frame teleporting).
     - With a delayed snapshot, interpolation clamps to the configured window.

3. **Remote player management**
   - **What to develop**: Create, update, and remove remote player avatars based on session join/leave and volatile state updates.
   - **Definition of done**: Remote avatars appear for other clients and update pose/position deterministically.
   - **Acceptance criteria (integration-testable)**:
     - When a remote player joins, an avatar is created with the correct id/name.
     - When a remote player leaves, the avatar is removed.

4. **Server-authoritative movement flow**
   - **What to develop**: Server processes client input/volatile updates, tracks authoritative movement state, and emits snapshots/deltas + corrections.
   - **Definition of done**: Server emits S_STATE_DELTA and S_CORRECTION messages aligned with tick-contract cadence.
   - **Acceptance criteria (integration-testable)**:
     - Server emits S_STATE_DELTA containing player volatile states at the configured cadence.
     - When client prediction diverges beyond thresholds, server emits S_CORRECTION with serverTick.

---

## Activity 2: Prediction tuning harness + physics parity checklist

1. **Prediction tuning harness**
   - **What to develop**: A local harness that replays recorded inputs against prediction/reconciliation and reports error/correction metrics.
   - **Definition of done**: Harness produces deterministic metrics for the same input sequence.
   - **Acceptance criteria (unit-testable)**:
     - Replaying the same input stream yields identical error/correction outputs.

2. **Physics parity checklist**
   - **What to develop**: Hooks that expose deterministic state snapshots for parity comparisons.
   - **Definition of done**: Client and server simulation steps can be compared using fixed dt inputs.
   - **Acceptance criteria (unit-testable)**:
     - Step-by-step snapshots match when using identical inputs and fixed dt.

---

## Activity 3: Validation updates for Iteration 11

1. **Unit tests**
   - **What to develop**: Unit tests for prediction, reconciliation thresholds, dead reckoning interpolation window, and parity hooks.
   - **Definition of done**: Unit tests cover deterministic helper behavior for Activities 1 and 2.
   - **Acceptance criteria**:
     - Tests assert bounded error after reconciliation and deterministic harness metrics.

2. **Integration tests**
   - **What to develop**: Integration tests for client->server->client movement propagation, remote avatar creation, and correction application.
   - **Definition of done**: Integration tests cover Activity 1 acceptance criteria with mocked networking.
   - **Acceptance criteria**:
     - Tests validate S_STATE_DELTA processing, remote avatar updates, and correction application.

3. **Server unit tests**
   - **What to develop**: Unit tests for server authoritative state updates and correction emission rules.
   - **Definition of done**: Server tests cover movement state processing and correction thresholds.
   - **Acceptance criteria**:
     - Tests assert correction emission when divergence exceeds threshold.

4. **Multi-client simulation test**
   - **What to develop**: A simulation test that runs multiple clients against a mocked room state for movement sync.
   - **Definition of done**: Test asserts convergence and no runaway divergence across clients.
   - **Acceptance criteria**:
     - Multiple clients converge to bounded positional error over time.

5. **Headless-browser integration test**
   - **What to develop**: A headless-browser test that connects to a Colyseus room and verifies remote avatars update.
   - **Definition of done**: Test runs without manual steps and asserts remote visibility.
   - **Acceptance criteria**:
     - Headless test asserts remote avatar state updates after movement events.

---

## Definition of Done (Iteration 11)
- All Activity acceptance criteria are met.
- Unit, integration, server unit, multi-client simulation, and headless-browser tests exist and pass.
- Manual test spec is documented in docs/spec/iteration11-test.md.
