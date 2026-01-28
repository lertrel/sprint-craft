Theme: MVP3 - Multi-player support in client-server architect with Colyseus integration

Assumption:
- Simple client-server architecture with minimum technology footprint
- Colyseus integration to avoid re-inventing game server from scratch
- No state persistence in this phase but prepare architecture for the next phase
- Game states should be synchronized and eqaul for all game nodes (users)
- Having conflict resolve for transactions generating from all game nodes (users)
- Workload: 
	- Internal use within same organization local network or VPN
	- Maximum concurrent users 20

Goals:

Technical design for game state and protocol to be synchronize {protocol}

	⁃	Identify game types of game state that shoud be synchronize e.g., player state, position, edit blocks, etc. Mark as {states}
	⁃	Classify {states} and categorize them into 2 groups a) volatile states ({volatile-states}), b) game progress ({game-progress})
	⁃	{volatile-states} are states that, when synchornized, will help another player interact with another player playing on different machine or browser tab (for debug), theses states will:
	⁃	Be broadcasted through all user nodes (fire and forget)
	⁃	Need optimization strategy (decide if this should be placed on server or client) mark as {state-optiomization}
	⁃	Example of {state-optiomization} a) duplicate 
	⁃	a) duplicate event e.g., same block is being removed from multiple nodes (users) concurrently
	⁃	b) competing event e.g., block placing at the same position from multiple nodes (users) concurrently
	⁃	c) outdate event e.g., attemp of removing block that already been removed by another node (user) due to lack of network
	⁃	{game-progress} are states that, persist across game session, even when new user joined later that the others, his/her {game-progress} will equal to other nodes (users):
	⁃	Component under {game-progress} should have universal identity across multiple nodes (users)
	⁃	{game-progress} should be consistent across all nodes (users)
	⁃	In next phase, {game-progress} should survive server restarting
	⁃	{volatile-sates}, {game-progress}, {state-optiomization} are part of {protocol}

Technical design for below aspects

The following aspects should be include and planned in one of suggested iterations

- {protocol}
- Colyseus integration
- Dead reckoning
- Client-side preduction
- State authority
- Lag compensation
- Auti-cheat

The plan can have one or more iterations
