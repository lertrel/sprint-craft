# MVP3 Multiplayer Spec - Sprint Craft

This document captures the design-approved activities, design notes, and iteration
plan for MVP3 (multiplayer).

## Activities

Activity 1 - Multiplayer state model & protocol definition
- Purpose: Identify synchronized {states}, split into {volatile-states} vs {game-progress}, and define message flows + conflict resolution rules.
- Risks: Overly large or chatty state sync; unclear ownership rules can cause desync.
- Other Important Remarks: Mitigations covered by Activity 7 (sync budget + ownership matrix).

Activity 2 - Colyseus client/server integration architecture
- Purpose: Establish room lifecycle, connection flow, and authoritative server state structure (no persistence yet).
- Risks: Tight coupling to existing single-player loop; server tick cadence mismatches client update rhythm.
- Other Important Remarks: Mitigations covered by Activity 8 (integration seam + tick contract).

Activity 3 - Player movement replication (dead reckoning + client prediction)
- Purpose: Provide smooth remote player motion while keeping server authority for corrections.
- Risks: Rubber-banding if reconciliation is too aggressive; mismatch between client and server physics.
- Other Important Remarks: Mitigations covered by Activity 9 (tuning harness + physics parity).

Activity 4 - Block interaction replication with lag compensation
- Purpose: Synchronize break/place events across clients with authoritative server validation and lag compensation.
- Risks: Conflicting edits (competing placements) or stale edits (outdated removes) causing divergence.
- Other Important Remarks: Mitigations covered by Activity 10 (conflict resolution + timestamping).

Activity 5 - Anti-cheat & trust boundaries for MVP3
- Purpose: Prevent invalid movement or world edits; ensure server-side validation of player actions.
- Risks: Excessive server checks hurting responsiveness; insufficient checks enabling abuse.
- Other Important Remarks: Mitigations covered by Activity 11 (validation budget + rate limits).

Activity 6 - Multiplayer debugging + validation plan
- Purpose: Ensure deterministic validation of state sync correctness and performance under ~20 users.
- Risks: Hard-to-reproduce race conditions; lack of visibility into state mismatches.
- Other Important Remarks: Mitigations covered by Activity 12 (diagnostics + replay).

Activity 7 - State sync budget + ownership matrix
- Purpose: Mitigate chatty state sync and unclear ownership rules by defining budgets, authoritative owners, and update cadence per state class.
- Risks: Over-constraining updates may reduce responsiveness if budgets are too tight.
- Other Important Remarks: Mitigates Activity 1 risks: "state sync" and "ownership rules."

Activity 8 - Client/server integration seam + tick alignment contract
- Purpose: Decouple single-player loop from networking and define server/client tick cadence + interpolation windows.
- Risks: Extra abstraction may add complexity to initial integration.
- Other Important Remarks: Mitigates Activity 2 risks: "tight coupling" and "tick cadence mismatch."

Activity 9 - Prediction/reconciliation tuning harness + physics parity checklist
- Purpose: Provide a controlled way to tune reconciliation thresholds and ensure client/server physics match.
- Risks: Added test harness effort may slow initial implementation.
- Other Important Remarks: Mitigates Activity 3 risks: "rubber-banding" and "physics mismatch."

Activity 10 - Edit conflict resolution policy + request timestamping
- Purpose: Define authoritative conflict rules and stale-event handling for block edits with timestamps/sequence numbers.
- Risks: Overly rigid resolution rules may feel unfair to clients.
- Other Important Remarks: Mitigates Activity 4 risks: "conflicting edits" and "stale edits."

Activity 11 - Server validation budget + rate-limit thresholds
- Purpose: Balance responsiveness with security by defining minimal server checks and rate limits for actions.
- Risks: Incorrect thresholds could still allow abuse or feel restrictive.
- Other Important Remarks: Mitigates Activity 5 risks: "excessive checks" and "insufficient checks."

Activity 12 - Diagnostics instrumentation: state checksum, event tracing, replay
- Purpose: Improve visibility and reproducibility for multiplayer sync issues.
- Risks: Debug tooling could add noise if not gated or sampled.
- Other Important Remarks: Mitigates Activity 6 risks: "race conditions" and "lack of visibility."

## Design

Activity 1 - Multiplayer state model & protocol definition

NEW 1 - /workspace/shared/protocol.ts
- Purpose: Define canonical message types, state schemas, and classifications for {volatile-states} vs {game-progress}.
- Other Important Remarks: Keep payloads versioned and minimal; include event sequencing fields (client seq + server tick).

NEW 2 - /workspace/src/sprint-craft/multiplayer/state-model.ts
- Purpose: Map current single-player state (player, world edits, hotbar) into sync-ready structures.
- Other Important Remarks: Explicitly mark which fields are authoritative on server vs client.

UPDATE 1 - /workspace/src/sprint-craft/voxels/player-state.ts
- Change: Add stable playerId + minimal serialization helpers for snapshots.
- Other Important Remarks: Keep backwards-compatible defaults for local single-player.

UPDATE 2 - /workspace/src/sprint-craft/voxels/world.ts
- Change: Add helpers to apply authoritative voxel edit events and produce compact diffs.
- Other Important Remarks: Ensure diffs remain deterministic across clients.

TEST 1
- Purpose: Validate protocol schema, state classification, and serialization determinism.
- Concept: Unit tests for round-trip encode/decode and correct volatile/game-progress tagging.
- Other Important Remarks: No network required; pure schema tests.

Draft - Canonical message types, state schemas, classification

Canonical Envelope
```
Envelope<T> = {
  v: number,
  t: MsgType,
  ts: number,
  clientId?: string,
  serverTick?: number,
  seq?: number,
  payload: T
}
```

Client -> Server (examples)
```
C_HELLO = { name: string, appearance?: Appearance, clientBuild?: string }
C_INPUT = { frameSeq: number, dt: number, keys: string[], yaw: number, pitch: number }
C_BLOCK_EDIT = { editSeq: number, action: "break"|"place", hit: HitInfo, blockId?: number, clientTs: number }
C_PING = { pingId: number, clientTs: number }
```

Server -> Client (examples)
```
S_WELCOME = { playerId: string, tickRate: number, worldSeed: number, snapshot: RoomSnapshot }
S_STATE_SNAPSHOT = RoomSnapshot
S_STATE_DELTA = { players: PlayerVolatile[], removedPlayerIds: string[], worldEvents: WorldEvent[] }
S_BLOCK_RESULT = { editSeq: number, ok: boolean, reason?: string, event?: WorldEvent }
S_CORRECTION = { playerId: string, pos: Vec3, vel: Vec3, yaw: number, serverTick: number }
S_PONG = { pingId: number, serverTs: number }
S_PLAYER_JOIN = { player: PlayerProgress }
S_PLAYER_LEAVE = { playerId: string, reason?: string }
```

State schemas (draft)
```
Vec3 = { x: number, y: number, z: number }

PlayerVolatile = {
  id: string,
  pos: Vec3,
  vel: Vec3,
  yaw: number,
  pitch: number,
  stance: "standing"|"crouching"|"crawling",
  grounded: boolean
}

PlayerProgress = {
  id: string,
  name: string,
  appearance?: {
    torsoColor?: [number, number, number],
    faceColor?: [number, number, number],
    eyeColor?: [number, number, number]
  },
  joinedAt: number
}

WorldEvent = {
  eventId: string,
  action: "break"|"place",
  pos: { x: number, y: number, z: number },
  blockId?: number,
  clientId: string,
  clientSeq?: number,
  clientTs?: number,
  serverTick: number
}

RoomSnapshot = {
  serverTick: number,
  worldSeed: number,
  players: PlayerProgress[],
  playerStates: PlayerVolatile[],
  worldEvents: WorldEvent[]
}
```

Classification (draft)
- Volatile states: player transform (pos/vel/yaw/pitch/stance/grounded), animation cues, aim/target/preview, input frames, ping/latency metrics.
- Game-progress: world edits (authoritative), world seed/generation params, player identity (id/name/appearance), server config/versioning.

Activity 2 - Colyseus client/server integration architecture

NEW 1 - /workspace/server/src/index.ts
- Purpose: Colyseus server bootstrap, room registration, and server tick loop.
- Other Important Remarks: Keep server lightweight; no persistence in MVP3.

NEW 2 - /workspace/server/src/rooms/SprintCraftRoom.ts
- Purpose: Authoritative room state, player join/leave flow, and broadcast policy.
- Other Important Remarks: State should align with /workspace/shared/protocol.ts.

NEW 3 - /workspace/src/sprint-craft/multiplayer/colyseus-client.ts
- Purpose: Client connection wrapper (join, reconnect, message dispatch).
- Other Important Remarks: Expose clean events for session lifecycle and state updates.

NEW 4 - /workspace/src/sprint-craft/multiplayer/session.ts
- Purpose: Glue between network messages and local game systems.
- Other Important Remarks: Allow single-player fallback if no server.

UPDATE 1 - /workspace/src/sprint-craft/app.ts
- Change: Add optional multiplayer init and session wiring (env/flag driven).
- Other Important Remarks: Avoid breaking current single-player boot flow.

TEST 1
- Purpose: Verify join/leave lifecycle, message routing, and initial state sync.
- Concept: Integration tests using a mocked Colyseus client/server or local test room.
- Other Important Remarks: Ensure tests run without real networking.

Activity 3 - Player movement replication (dead reckoning + client prediction)

NEW 1 - /workspace/src/sprint-craft/multiplayer/prediction.ts
- Purpose: Client-side input buffering, prediction, and reconciliation with server snapshots.
- Other Important Remarks: Keep reconciliation thresholds configurable for tuning.

NEW 2 - /workspace/src/sprint-craft/multiplayer/dead-reckoning.ts
- Purpose: Remote player interpolation/extrapolation for smooth movement.
- Other Important Remarks: Use snapshot timestamps and fixed interpolation window.

NEW 3 - /workspace/src/sprint-craft/multiplayer/remote-players.ts
- Purpose: Manage remote player avatars and state updates.
- Other Important Remarks: Reuse existing avatar creation and pose APIs.

UPDATE 1 - /workspace/src/sprint-craft/voxels/player-controller.ts
- Change: Expose deterministic step function for prediction/replay.
- Other Important Remarks: Must remain deterministic across client/server.

UPDATE 2 - /workspace/src/sprint-craft/voxels/voxel-demo.ts
- Change: Integrate prediction for local player and remote player updates.
- Other Important Remarks: Ensure local controls remain responsive with corrections.

TEST 1
- Purpose: Validate prediction/reconciliation stability and smoothing behavior.
- Concept: Unit tests simulate input streams + server snapshots; assert bounded error.
- Other Important Remarks: Add deterministic time controls for tests.

Activity 4 - Block interaction replication with lag compensation

NEW 1 - /workspace/shared/world-events.ts
- Purpose: Canonical block edit event schema (break/place) with timestamps/seq.
- Other Important Remarks: Include client time and server tick fields.

NEW 2 - /workspace/server/src/lag/lag-compensation.ts
- Purpose: Server-side lag compensation for block edits using recent world history.
- Other Important Remarks: Store short-lived history only; no persistence.

UPDATE 1 - /workspace/src/sprint-craft/voxels/block-interaction.ts
- Change: Emit edit intents to server; apply client prediction with rollback on reject.
- Other Important Remarks: Avoid double-apply of edits when confirmed.

UPDATE 2 - /workspace/src/sprint-craft/voxels/world.ts
- Change: Apply authoritative edits in deterministic order.
- Other Important Remarks: Reject stale edits based on server time window.

TEST 1
- Purpose: Validate conflict handling (duplicate, competing, outdated edits).
- Concept: Unit tests for edit resolution policy + lag-compensation window rules.
- Other Important Remarks: Ensure world state stays consistent after conflicts.

Activity 5 - Anti-cheat & trust boundaries for MVP3

NEW 1 - /workspace/server/src/validation/movement.ts
- Purpose: Server-side movement validation (speed, bounds, collision sanity).
- Other Important Remarks: Keep checks minimal; focus on obvious abuse.

NEW 2 - /workspace/server/src/validation/blocks.ts
- Purpose: Validate block edits (reach distance, cooldown, placement rules).
- Other Important Remarks: Mirror client rules to avoid divergence.

UPDATE 1 - /workspace/server/src/rooms/SprintCraftRoom.ts
- Change: Enforce validations and reject invalid actions with reason codes.
- Other Important Remarks: Rejects must trigger client correction.

UPDATE 2 - /workspace/src/sprint-craft/multiplayer/session.ts
- Change: Handle rejection responses (rollback or reconcile).
- Other Important Remarks: Provide deterministic UI feedback.

TEST 1
- Purpose: Ensure invalid movement/edits are rejected and do not mutate state.
- Concept: Unit tests for validation logic with boundary and rate cases.
- Other Important Remarks: Keep tests deterministic and fast.

Activity 6 - Multiplayer debugging + validation plan

NEW 1 - /workspace/src/sprint-craft/multiplayer/diagnostics.ts
- Purpose: Client diagnostics (state checksum, ping, snapshot age).
- Other Important Remarks: Gate behind a debug flag.

NEW 2 - /workspace/server/src/diagnostics/server-stats.ts
- Purpose: Server-side diagnostics (tick drift, queue sizes, event rates).
- Other Important Remarks: Log at controlled intervals.

UPDATE 1 - /workspace/src/sprint-craft/app.ts
- Change: Toggle diagnostics display and log hooks.
- Other Important Remarks: Keep UI minimal and unobtrusive.

TEST 1
- Purpose: Validate diagnostics output format and checksum consistency.
- Concept: Unit test computing checksums for the same state across runs.
- Other Important Remarks: Ensure no non-deterministic fields in checksum input.

Activity 7 - State sync budget + ownership matrix

NEW 1 - /workspace/shared/state-ownership.ts
- Purpose: Define owner roles and authoritative sources per state class.
- Other Important Remarks: Explicitly map player-owned vs server-owned data.

NEW 2 - /workspace/src/sprint-craft/multiplayer/sync-budget.ts
- Purpose: Per-state update cadence + bandwidth budgeting.
- Other Important Remarks: Allow dynamic adjustment for load.

UPDATE 1 - /workspace/src/sprint-craft/multiplayer/session.ts
- Change: Apply budgets to outgoing updates.
- Other Important Remarks: Never drop critical game-progress state.

TEST 1
- Purpose: Ensure budgets throttle non-critical updates without losing correctness.
- Concept: Unit tests that simulate high update rates and assert throttling.
- Other Important Remarks: Preserve last-known states for late joiners.

Activity 8 - Client/server integration seam + tick alignment contract

NEW 1 - /workspace/src/sprint-craft/multiplayer/tick-contract.ts
- Purpose: Declare target server tick rate, snapshot cadence, and interpolation window.
- Other Important Remarks: Treat as single source of truth.

NEW 2 - /workspace/src/sprint-craft/multiplayer/adapters.ts
- Purpose: Interface boundary between local game loop and networking.
- Other Important Remarks: Minimize coupling to Babylon or Colyseus.

UPDATE 1 - /workspace/src/sprint-craft/voxels/voxel-demo.ts
- Change: Accept externally supplied tick timing + step hooks.
- Other Important Remarks: Preserve current render loop flow.

TEST 1
- Purpose: Verify tick alignment and deterministic step ordering.
- Concept: Unit tests that simulate server tick cadence and confirm client interpolation windows.
- Other Important Remarks: Tests remain offline (no networking).

Activity 9 - Prediction/reconciliation tuning harness + physics parity checklist

NEW 1 - /workspace/src/sprint-craft/multiplayer/prediction-harness.ts
- Purpose: Local harness to replay recorded inputs against prediction/reconciliation.
- Other Important Remarks: Output metrics (error, correction count).

UPDATE 1 - /workspace/src/sprint-craft/voxels/player-controller.ts
- Change: Expose parity hooks (applyInputFrame, getStateSnapshot).
- Other Important Remarks: Must be deterministic with fixed dt.

TEST 1
- Purpose: Ensure client/server movement parity under identical inputs.
- Concept: Unit tests comparing step-by-step snapshots.
- Other Important Remarks: Use fixed dt and seeded inputs.

Activity 10 - Edit conflict resolution policy + request timestamping

NEW 1 - /workspace/shared/event-sequencing.ts
- Purpose: Define sequence/timestamp fields and ordering rules.
- Other Important Remarks: Support server-authoritative ordering.

NEW 2 - /workspace/server/src/rooms/conflict-resolution.ts
- Purpose: Apply authoritative resolution for duplicate/competing/outdated edits.
- Other Important Remarks: Must be deterministic and documented.

UPDATE 1 - /workspace/shared/world-events.ts
- Change: Add sequence/timestamp metadata and resolution hints.
- Other Important Remarks: Keep backwards-compatible schema changes versioned.

TEST 1
- Purpose: Validate deterministic resolution outcomes.
- Concept: Unit tests for competing events applied in different orders.
- Other Important Remarks: Ensure final world state converges.

Activity 11 - Server validation budget + rate-limit thresholds

NEW 1 - /workspace/server/src/validation/rate-limits.ts
- Purpose: Centralize per-action rate limits and budget thresholds.
- Other Important Remarks: Keep values configurable for tuning.

UPDATE 1 - /workspace/server/src/rooms/SprintCraftRoom.ts
- Change: Apply rate-limit checks before processing actions.
- Other Important Remarks: Provide explicit reject reasons to clients.

TEST 1
- Purpose: Ensure throttling prevents abuse without blocking valid actions.
- Concept: Unit tests for burst vs steady inputs.
- Other Important Remarks: Use deterministic time controls.

Activity 12 - Diagnostics instrumentation: state checksum, event tracing, replay

NEW 1 - /workspace/src/sprint-craft/multiplayer/trace.ts
- Purpose: Client event tracing and export for replay.
- Other Important Remarks: Disable by default; opt-in via debug flag.

NEW 2 - /workspace/server/src/diagnostics/replay.ts
- Purpose: Server-side replay of captured events for desync analysis.
- Other Important Remarks: Use in-memory storage only for MVP3.

UPDATE 1 - /workspace/src/sprint-craft/multiplayer/diagnostics.ts
- Change: Include trace export and checksum diff utilities.
- Other Important Remarks: Keep UI minimal; avoid runtime overhead when disabled.

TEST 1
- Purpose: Verify trace export format and replay determinism.
- Concept: Unit tests on exported trace JSON and replay outcomes.
- Other Important Remarks: Ensure no nondeterministic fields.

## Iteration Plan

Iteration 10
- Define shared protocol and state model ({states}, {volatile-states}, {game-progress}).
- Add Colyseus server bootstrap + room skeleton; add client session wiring.
- Establish sync budgets and ownership matrix baseline.
- Introduce tick alignment contract and integration seam.
- Add initial diagnostics hooks (checksum, ping, basic stats).
- Add Iteration 10 unit/integration tests for protocol + session lifecycle.

List of activities implemented under this iteration

Activity 1 - Multiplayer state model & protocol definition (shared protocol, state schemas, classification of {volatile-states} vs {game-progress})
Activity 2 - Colyseus client/server integration architecture (server bootstrap, room skeleton, client session wiring)
Activity 6 - Multiplayer debugging + validation plan (initial diagnostics hooks: checksum, ping, basic stats) [partial implementation]
Activity 7 - State sync budget + ownership matrix (sync budgets and ownership matrix baseline)
Activity 8 - Client/server integration seam + tick alignment contract (tick alignment contract and adapter seam)

Key Deliverables
1	shared/protocol.ts, state-model.ts, player-state.ts (playerId + serialization), world.ts (authoritative events + diffs)
2	server/src/index.ts, SprintCraftRoom.ts, colyseus-client.ts, session.ts, app.ts multiplayer wiring
6	diagnostics.ts (checksum, ping RTT, snapshot age tracking)
7	shared/state-ownership.ts, sync-budget.ts
8	tick-contract.ts, adapters.ts

Iteration 11
- Implement movement replication: prediction, reconciliation, dead reckoning.
- Add remote player management and avatar updates.
- Deliver prediction tuning harness and physics parity checklist/tests.
- Add Iteration 11 tests for movement sync and reconciliation stability.

Iteration 12
- Implement block interaction replication with lag compensation.
- Add edit conflict resolution policy + sequencing.
- Enforce server validations and rate limits (anti-cheat baseline).
- Expand diagnostics with tracing + replay support.
- Add Iteration 12 tests for block edit sync, conflict handling, and validation.
