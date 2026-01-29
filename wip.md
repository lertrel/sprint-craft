# WIP

- Iteration 6: MVP2 preparation for multi-player phase
- Iteration 7: MVP2 continuation (avatar facing, nameplate, right arm)

[Progress]
- Iteration 6 - DONE (spec, implementation, tests)

[Progress]
- Iteration 7 - DONE (spec, implementation, tests, docs)

[Progress]
- Iteration 8 - DONE (spec, implementation, tests, docs)

[Progress]
- Iteration 9 - DONE (spec, implementation, tests, docs)

[Progress]
- Iteration 10 - DONE (spec, implementation, tests, docs)
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

NOT see avatars from another tab yet with the current Iteration 10 implementation.


Both clients connect to the same Colyseus room
Both send C_HELLO with their player name
Both receive S_WELCOME and can exchange pings (C_PING/S_PONG)
The server tracks that both players joined
What is NOT implemented yet:

Player position is not sent to the server - The client doesn't broadcast its position/velocity/yaw/pitch
Remote player rendering doesn't exist - Even if positions were shared, there's no code to spawn and animate avatars for other players
State sync is diagnostic-only - The applySnapshot/applyDelta callbacks only record stats, they don't update game state

Both connect to the server ✓
Both appear in the room's player list on the server ✓
See each other's avatars ✗
Sync positions ✗