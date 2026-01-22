# Iteration 5 Manual Test List (acceptance-criteria based)

Prereqs:
- Run `npm install`

---

Acceptance Criteria 1 (Reduced stance persists under low ceiling until cleared):
  Test Case 1
    Step 1: Run `npm test -- -t "keeps a reduced stance under low ceilings until cleared"`
    Step 2: Confirm the test passes, indicating stance stays reduced until overhead blocks are removed.

Acceptance Criteria 2 (Ceiling collision stops upward motion and returns to grounded):
  Test Case 1
    Step 1: Run `npm test -- -t "stops upward motion at ceilings and returns to grounded"`
    Step 2: Confirm the test passes, indicating the player does not penetrate the ceiling and lands back on the ground.

Acceptance Criteria 3 (Exterior corner does not permanently snag movement):
  Test Case 1
    Step 1: Run `npm test -- -t "does not get stuck on an exterior corner after repeated updates"`
    Step 2: Confirm the test passes, indicating movement remains stable near corners.

Acceptance Criteria 4 (Scene sets sky clear color and fog parameters):
  Test Case 1
    Step 1: Run `npm test -- -t "sets a non-default clear color and fog parameters on init"`
    Step 2: Confirm the test passes, indicating sky and fog settings are applied at init.

Acceptance Criteria 5 (Hemispheric light present with fog/sky settings):
  Test Case 1
    Step 1: Run `npm test -- -t "creates a hemispheric light alongside the fog/sky settings"`
    Step 2: Confirm the test passes, indicating a light is created for readability.

Acceptance Criteria 6 (Scheduler step respects small rebuild budget):
  Test Case 1
    Step 1: Run `npm test -- -t "rebuilds only up to the configured budget per step"`
    Step 2: Confirm the test passes, indicating only the budgeted rebuilds occur.

Acceptance Criteria 7 (Repeated steps drain queue without exceeding budget):
  Test Case 1
    Step 1: Run `npm test -- -t "drains the rebuild queue over multiple budgeted steps"`
    Step 2: Confirm the test passes, indicating the queue drains across steps.

Acceptance Criteria 8 (Standalone config uses base "./" and outputs sprint-craft.js):
  Test Case 1
    Step 1: Run `npm test -- -t "uses a relative base and outputs sprint-craft.js to standalone/"`
    Step 2: Confirm the test passes, indicating standalone config settings are correct.

Acceptance Criteria 9 (README documents standalone build and local open steps):
  Test Case 1
    Step 1: Run `npm test -- -t "documents standalone build and local open steps"`
    Step 2: Confirm the test passes, indicating the documentation includes standalone instructions.

Acceptance Criteria 10 (README includes self-validation checklist with required items):
  Test Case 1
    Step 1: Run `npm test -- -t "lists all required self-validation items"`
    Step 2: Confirm the test passes, indicating the checklist lists all required items.

Acceptance Criteria 11 (Checklist items are marked as checked):
  Test Case 1
    Step 1: Run `npm test -- -t "marks all self-validation items as checked"`
    Step 2: Confirm the test passes, indicating each item is explicitly confirmed.
