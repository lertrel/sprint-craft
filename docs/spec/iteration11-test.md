# Iteration 11 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`
- Run `npm run dev`
- Run the Colyseus server (`node server/dist` or `npm run server` if available)

---

Acceptance Criteria 1 (Prediction + reconciliation keeps local movement responsive):
  Test Case 1
    Step 1: Open `http://localhost:5173?mp=1` in two tabs.
    Step 2: Move forward in Tab A for a few seconds.
    Step 3: Confirm local movement remains responsive and smooth.

Acceptance Criteria 2 (Remote player dead reckoning is smooth):
  Test Case 1
    Step 1: In Tab A, move in a straight line.
    Step 2: Observe Tab B and confirm the remote avatar moves smoothly without jitter.

Acceptance Criteria 3 (Remote player creation/removal):
  Test Case 1
    Step 1: Open Tab A and Tab B connected to the same room.
    Step 2: Confirm each tab shows the other player's avatar.
    Step 3: Close Tab B and confirm Tab A removes the remote avatar.

Acceptance Criteria 4 (Server authoritative corrections apply when divergence occurs):
  Test Case 1
    Step 1: In Tab A, move while intermittently toggling the browser tab to induce lag.
    Step 2: Return to Tab A and confirm corrections bring the player back to the authoritative position.

Acceptance Criteria 5 (Prediction tuning harness produces metrics):
  Test Case 1
    Step 1: Run `npm test -- -t "Iteration 11: prediction harness"`.
    Step 2: Confirm the test outputs deterministic metrics (max/avg error).
