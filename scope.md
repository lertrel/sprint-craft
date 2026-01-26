Theme: MVP2 - Preparation for multi-player phase (continue)
Goals:
- Interaction feedback (crosshair, target outline, placement preview)
Purpose: Improve usability for break/place actions with a clear targeting cue and optional ghost preview of the placed block.
Risks: Per-frame highlight updates may add overhead; overlays could conflict with HUD readability.
Other Important Remarks: Reuse existing raycast results; keep visuals simple and deterministic for tests.
- Camera mode toggle with avatar visibility rules
Purpose: Allow switching between over-shoulder and first-person views while preserving collision/clamp behavior.
Risks: Camera clipping, animation alignment issues, and inconsistent stance/eye height between modes.
Other Important Remarks: Leverage current player controller eye-height logic; hide head/arms in first-person to prevent obstruction.
