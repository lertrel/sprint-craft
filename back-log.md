Goals:
- Design states synchronization amoung distributed nodes for multi-player mode (e.g., player-state, block edits)
- Remove over-should view orbit lock 60 degree and change movement WASD to be avatar relative instead of camera relative
Purpose: Expand exploration beyond the initial generated area while keeping performance stable by loading/generating chunks around the player and unloading distant chunks.
Risks: Visible popping, rebuild spikes, and collision issues if the player reaches unloaded areas.
Other Important Remarks: Build on existing world/generation/scheduler; use a load/unload hysteresis radius and deterministic chunk keys to keep tests stable.
- World edit persistence (save/load)
Purpose: Preserve block edits across sessions via local storage or a simple export/import flow.
Risks: Storage size growth, schema/versioning drift, and serialization cost.
Other Important Remarks: Store diffs against generated terrain; add a minimal version header; provide clear UI triggers.
