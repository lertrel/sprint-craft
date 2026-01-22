# Iteration 5 Development Spec - Sprint Craft

Source of truth for this iteration:
- scope.md (non-negotiable game concept + validation checklist requirements)
- wip.md (Iteration 5 bullet list)
- docs/spec/iteration4-spec.md (style + testability bar)
- Development spec (for further discussion)
- Program impact analysis

This spec turns Iteration 5 bullets into implementable, testable requirements.

---

## Activity 1: Polish playable demo behavior

1. **Edge-case collision stability (crouch transitions, ceilings, ledges)**
   - **What to develop**: Improve player collision/stance handling so crouch transitions do not clip into blocks, ceiling collisions stop upward motion, and exterior corners do not permanently snag movement.
   - **Definition of done**: Stance transitions respect overhead clearance, ceiling impacts stop upward movement without penetration, and diagonal movement near corners remains responsive.
   - **Acceptance criteria (integration-testable)**:
     - Releasing Ctrl under a low ceiling keeps the player in a reduced stance; removing the overhead block allows standing on the next update.
     - Jumping into a low ceiling stops upward motion and the player returns to grounded on the next fall without entering the ceiling volume.
     - Moving diagonally into an exterior corner does not leave the player stuck; position remains finite and outside solid voxels after repeated updates.

2. **Simple sky/lighting/fog for readability**
   - **What to develop**: Apply a readable sky background and fog settings to the scene, and ensure lighting remains enabled so voxel surfaces are visible and shaded.
   - **Definition of done**: Scene background and fog parameters are configured on initialization, and lighting is present to provide depth and contrast.
   - **Acceptance criteria (integration-testable)**:
     - Scene initialization sets a non-default clear color and enables fog with defined parameters.
     - A hemispheric light is present alongside the fog/sky settings to ensure readable lighting.

3. **Chunk rebuild throttling**
   - **What to develop**: Ensure chunk mesh rebuilds are processed through a configurable per-frame budget so rebuild work is bounded over time.
   - **Definition of done**: Rebuild scheduling processes no more than the configured budget per step and can be verified deterministically.
   - **Acceptance criteria (integration-testable)**:
     - When multiple chunks are queued, a scheduler step with a small budget rebuilds only up to that budget.
     - Repeated scheduler steps eventually drain the queue without exceeding the per-step budget.

---

## Activity 2: Add standalone no-Node deliverable

1. **Standalone build output configuration**
   - **What to develop**: Provide a standalone build configuration that outputs a self-contained bundle in the standalone/ directory.
   - **Definition of done**: Standalone build config targets an IIFE bundle, uses a relative base path, and writes to the standalone output directory.
   - **Acceptance criteria (integration-testable)**:
     - Standalone build config uses base "./" and outputs a bundle named sprint-craft.js to the standalone directory.

2. **Standalone usage documentation**
   - **What to develop**: Document how to build and run the standalone output locally without Node at runtime.
   - **Definition of done**: Documentation clearly explains the two-file and single-file options and how to open them.
   - **Acceptance criteria (integration-testable)**:
     - README includes a standalone section with explicit build steps and local open instructions.

---

## Activity 3: Add self-validation checklist to documentation

1. **Checklist coverage**
   - **What to develop**: Add a self-validation checklist that covers all required playability/performance checks from scope.md.
   - **Definition of done**: The checklist includes each required item and is clearly labeled.
   - **Acceptance criteria (integration-testable)**:
     - README contains a "SELF-VALIDATION CHECKLIST" section listing all required items.

2. **Explicit confirmations**
   - **What to develop**: Mark each checklist item as confirmed to reflect the current working demo.
   - **Definition of done**: Each checklist item is explicitly marked as confirmed (checked).
   - **Acceptance criteria (integration-testable)**:
     - All checklist items are present and marked as checked.
