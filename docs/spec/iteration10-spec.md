# Iteration 10 Development Spec - Sprint Craft (MVP3)

Source of truth for this iteration:
- scope.md (MVP3 goals)
- docs/spec/mvp3-spec.md (Iteration 10 activities)
- docs/spec/iteration9-spec.md (style + testability bar)

This spec turns Iteration 10 activities into implementable, testable requirements.

---

## Activity 1: Shared protocol + state model

1. **Canonical envelope + message types**
   - **What to develop**: Define the protocol envelope and the canonical message type list for MVP3.
   - **Definition of done**: A single shared module exports the envelope shape, message type union, and helper to create envelopes.
   - **Acceptance criteria (integration-testable)**:
     - A `createEnvelope` helper returns a payload wrapped with `v`, `t`, and `ts`.
     - The message type union includes client and server message categories (`C_*`, `S_*`).

2. **State schemas + classification**
   - **What to develop**: Define schemas for player volatile state, player progress state, world events, and room snapshot; classify states as {volatile-states} or {game-progress}.
   - **Definition of done**: The shared module exports the schemas and classification map for known state keys.
   - **Acceptance criteria (integration-testable)**:
     - `classifyState("playerVolatile")` returns `volatile`.
     - `classifyState("worldEvents")` returns `gameProgress`.

3. **State model mapping**
   - **What to develop**: A state model module that converts current single-player state into sync-ready structures.
   - **Definition of done**: Mapping functions exist for player volatile/progress and block world events.
   - **Acceptance criteria (integration-testable)**:
     - `toPlayerVolatile(...)` maps position/velocity/stance with provided yaw/pitch.
     - `toPlayerProgress(...)` uses the provided name and appearance.

---

## Activity 2: Colyseus integration skeleton

1. **Server bootstrap + room registration**
   - **What to develop**: A server entry that registers a room and exposes a start helper.
   - **Definition of done**: The server module exports a factory that registers `SprintCraftRoom` without auto-start side effects.
   - **Acceptance criteria (integration-testable)**:
     - Importing the server module does not start listening automatically.
     - The factory exposes a `listen` function for manual startup.

2. **Room skeleton behaviors**
   - **What to develop**: A Colyseus room with initial state, join/leave handling, and basic ping response.
   - **Definition of done**: Joining adds a player record; leaving removes it; `C_PING` replies with `S_PONG`.
   - **Acceptance criteria (integration-testable)**:
     - `C_PING` produces an `S_PONG` with the same `pingId`.
     - Joining and leaving update the room state player list.

3. **Client session wiring**
   - **What to develop**: A client session wrapper that joins a room and routes messages to adapters.
   - **Definition of done**: The session can connect, handle welcome/snapshot messages, and disconnect cleanly.
   - **Acceptance criteria (integration-testable)**:
     - `connect()` triggers a `C_HELLO` and sets `isConnected()` to true.
     - Receiving `S_WELCOME` invokes the adapter `applySnapshot`.

---

## Activity 3: Sync budget + ownership matrix baseline

1. **Ownership matrix**
   - **What to develop**: A shared ownership map that assigns state keys to `server`, `client`, or `shared`.
   - **Definition of done**: A single shared map exports owners for all known state keys.
   - **Acceptance criteria (integration-testable)**:
     - Ownership for `playerVolatile` is `client`.
     - Ownership for `worldEvents` is `server`.

2. **Sync budget tracker**
   - **What to develop**: A budget tracker that enforces per-state minimum intervals.
   - **Definition of done**: `canSend` and `recordSent` enforce a min-interval rule.
   - **Acceptance criteria (integration-testable)**:
     - Two sends in the same interval are rejected (`canSend` false).

---

## Activity 4: Tick alignment contract + adapter seam

1. **Tick contract**
   - **What to develop**: A shared contract that defines server tick rate, snapshot rate, and interpolation delay.
   - **Definition of done**: Default tick contract values and interval helpers are exported.
   - **Acceptance criteria (integration-testable)**:
     - `getTickIntervals()` returns snapshot interval derived from the contract rates.

2. **Adapter seam**
   - **What to develop**: A session adapter interface between the game loop and networking.
   - **Definition of done**: The adapter type includes local state getters and snapshot/delta handlers.
   - **Acceptance criteria (integration-testable)**:
     - The adapter surface includes `applySnapshot` and `applyDelta` hooks.

---

## Activity 5: Diagnostics baseline (checksum + ping + stats)

1. **Checksum helper**
   - **What to develop**: A deterministic checksum over a state snapshot.
   - **Definition of done**: The same input produces the same checksum across calls.
   - **Acceptance criteria (integration-testable)**:
     - `computeChecksum` returns identical values for identical inputs.

2. **Ping tracking + stats**
   - **What to develop**: Track ping RTT and expose basic diagnostics stats.
   - **Definition of done**: Diagnostics captures `lastPingMs` and `lastServerTick`.
   - **Acceptance criteria (integration-testable)**:
     - `recordPing` updates `lastPingMs`.

---

## Activity 6: Validation updates for Iteration 10

1. **Unit tests**
   - **What to develop**: Unit tests for protocol/classification, budgets, tick contract, and diagnostics checksum.
   - **Definition of done**: Unit tests cover the deterministic helpers from Activities 1, 3, 4, and 5.
   - **Acceptance criteria**:
     - Unit tests assert classification, budget gating, interval math, and checksum determinism.

2. **Integration tests**
   - **What to develop**: Integration tests for session lifecycle and protocol helpers.
   - **Definition of done**: Integration tests cover the key acceptance criteria for Activities 1-5.
   - **Acceptance criteria**:
     - Integration tests validate envelope creation, session connect + welcome, and ping RTT update.

---

## Definition of Done (Iteration 10)
- All Activity acceptance criteria are met.
- Unit and integration tests exist and pass.
- Manual test spec is documented in docs/spec/iteration10-test.md.
