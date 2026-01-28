# Iteration 10 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Envelope helper produces versioned payloads):
  Test Case 1
    Step 1: Run `npm test -- -t "Iteration 10: protocol helpers (unit)"`
    Step 2: Confirm the test passes, asserting `createEnvelope` includes `v`, `t`, and `ts`.

Acceptance Criteria 2 (State classification returns volatile/game-progress):
  Test Case 1
    Step 1: Run `npm test -- -t "Iteration 10: protocol helpers (unit)"`
    Step 2: Confirm the test passes, asserting `classifyState` values.

Acceptance Criteria 3 (Session connect sends hello and handles welcome):
  Test Case 1
    Step 1: Run `npm test -- -t "connects, sends hello, and handles welcome"`
    Step 2: Confirm the integration test passes.

Acceptance Criteria 4 (Ping RTT diagnostics update):
  Test Case 1
    Step 1: Run `npm test -- -t "updates ping diagnostics on pong"`
    Step 2: Confirm the integration test passes.

Acceptance Criteria 5 (Sync budget gating + tick interval math):
  Test Case 1
    Step 1: Run `npm test -- -t "budgets + tick contract"`
    Step 2: Confirm the integration test passes.

Acceptance Criteria 6 (Checksum deterministic behavior):
  Test Case 1
    Step 1: Run `npm test -- -t "diagnostics checksum"`
    Step 2: Confirm the unit test passes.
