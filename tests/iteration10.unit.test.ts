import { describe, expect, it } from "vitest";
import { classifyState, createEnvelope, PROTOCOL_VERSION, type WorldEvent, type PlayerVolatile } from "../shared/protocol";
import { createSyncBudgetTracker } from "../src/sprint-craft/multiplayer/sync-budget";
import { DEFAULT_TICK_CONTRACT, getTickIntervals } from "../src/sprint-craft/multiplayer/tick-contract";
import { computeChecksum } from "../src/sprint-craft/multiplayer/diagnostics";
import {
  createDefaultPlayerState,
  toPlayerSnapshot,
  fromPlayerVolatile,
  generatePlayerId
} from "../src/sprint-craft/voxels/player-state";
import {
  createWorld,
  voxelKey,
  parseVoxelKey,
  compareWorldEvents,
  compareVoxelDiffs
} from "../src/sprint-craft/voxels/world";
import { BlockId } from "../src/sprint-craft/voxels/blocks";

describe("Iteration 10: protocol helpers (unit)", () => {
  it("creates envelopes with version and timestamps", () => {
    const envelope = createEnvelope("C_PING", { pingId: 1, clientTs: 100 });
    expect(envelope.v).toBe(PROTOCOL_VERSION);
    expect(envelope.t).toBe("C_PING");
    expect(typeof envelope.ts).toBe("number");
  });

  it("classifies volatile vs game-progress state keys", () => {
    expect(classifyState("playerVolatile")).toBe("volatile");
    expect(classifyState("worldEvents")).toBe("gameProgress");
  });
});

describe("Iteration 10: sync budget tracker (unit)", () => {
  it("prevents sends within the minimum interval", () => {
    const tracker = createSyncBudgetTracker();
    const now = 1000;
    expect(tracker.canSend("playerVolatile", now)).toBe(true);
    tracker.recordSent("playerVolatile", now);
    expect(tracker.canSend("playerVolatile", now + 10)).toBe(false);
    expect(tracker.canSend("playerVolatile", now + 60)).toBe(true);
  });
});

describe("Iteration 10: tick contract intervals (unit)", () => {
  it("derives snapshot interval from the contract", () => {
    const intervals = getTickIntervals(DEFAULT_TICK_CONTRACT);
    expect(intervals.serverTickMs).toBe(50);
    expect(intervals.snapshotIntervalMs).toBe(100);
  });
});

describe("Iteration 10: diagnostics checksum (unit)", () => {
  it("produces deterministic checksums for identical input", () => {
    const input = { a: 1, b: [2, 3] };
    const first = computeChecksum(input);
    const second = computeChecksum(input);
    expect(second).toBe(first);
    expect(computeChecksum({ a: 2, b: [2, 3] })).not.toBe(first);
  });
});

describe("Iteration 10: player-state serialization (unit)", () => {
  it("creates default player state with local playerId", () => {
    const state = createDefaultPlayerState();
    expect(state.playerId).toBe("local");
    expect(state.position).toEqual({ x: 0, y: 6, z: 0 });
    expect(state.stance).toBe("standing");
  });

  it("creates player state with custom playerId", () => {
    const state = createDefaultPlayerState("player-123");
    expect(state.playerId).toBe("player-123");
  });

  it("converts player state to snapshot", () => {
    const state = createDefaultPlayerState("test-id");
    state.position = { x: 10, y: 20, z: 30 };
    state.velocity = { x: 1, y: 2, z: 3 };
    state.stance = "crouching";

    const snapshot = toPlayerSnapshot(state, {
      yaw: 1.5,
      pitch: 0.5,
      grounded: true,
      hotbarSlot: 3
    });

    expect(snapshot.id).toBe("test-id");
    expect(snapshot.pos).toEqual({ x: 10, y: 20, z: 30 });
    expect(snapshot.vel).toEqual({ x: 1, y: 2, z: 3 });
    expect(snapshot.yaw).toBe(1.5);
    expect(snapshot.pitch).toBe(0.5);
    expect(snapshot.stance).toBe("crouching");
    expect(snapshot.grounded).toBe(true);
    expect(snapshot.hotbarSlot).toBe(3);
  });

  it("converts PlayerVolatile to player state", () => {
    const volatile: PlayerVolatile = {
      id: "remote-player",
      pos: { x: 5, y: 10, z: 15 },
      vel: { x: 0.5, y: 0, z: 0.5 },
      yaw: 2.0,
      pitch: -0.3,
      stance: "standing",
      grounded: false
    };

    const state = fromPlayerVolatile(volatile);
    expect(state.playerId).toBe("remote-player");
    expect(state.position).toEqual({ x: 5, y: 10, z: 15 });
    expect(state.velocity).toEqual({ x: 0.5, y: 0, z: 0.5 });
    expect(state.stance).toBe("standing");
    // Should have default collider heights
    expect(state.colliderHeights.standing).toBe(1.8);
  });

  it("preserves existing collider heights when converting from volatile", () => {
    const existing = createDefaultPlayerState("test");
    existing.colliderHeights.standing = 2.0; // Custom height

    const volatile: PlayerVolatile = {
      id: "test",
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      stance: "standing",
      grounded: true
    };

    const state = fromPlayerVolatile(volatile, existing);
    expect(state.colliderHeights.standing).toBe(2.0);
  });

  it("generates unique player IDs", () => {
    const id1 = generatePlayerId();
    const id2 = generatePlayerId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
    expect(id1.length).toBeGreaterThan(0);
  });
});

describe("Iteration 10: world authoritative events (unit)", () => {
  it("applies break events deterministically", () => {
    const world = createWorld();
    // Place a block first
    world.setVoxel(0, 0, 0, BlockId.Stone);
    expect(world.getVoxel(0, 0, 0)).toBe(BlockId.Stone);

    const event: WorldEvent = {
      eventId: "evt-1",
      action: "break",
      pos: { x: 0, y: 0, z: 0 },
      clientId: "client-1",
      serverTick: 100
    };

    const result = world.applyAuthoritativeEvents([event]);
    expect(result.applied.length).toBe(1);
    expect(result.rejected.length).toBe(0);
    expect(world.getVoxel(0, 0, 0)).toBe(BlockId.Air);
  });

  it("applies place events deterministically", () => {
    const world = createWorld();

    const event: WorldEvent = {
      eventId: "evt-1",
      action: "place",
      pos: { x: 5, y: 5, z: 5 },
      blockId: BlockId.Dirt,
      clientId: "client-1",
      serverTick: 100
    };

    const result = world.applyAuthoritativeEvents([event]);
    expect(result.applied.length).toBe(1);
    expect(world.getVoxel(5, 5, 5)).toBe(BlockId.Dirt);
  });

  it("rejects break on air voxel", () => {
    const world = createWorld();

    const event: WorldEvent = {
      eventId: "evt-1",
      action: "break",
      pos: { x: 0, y: 0, z: 0 },
      clientId: "client-1",
      serverTick: 100
    };

    const result = world.applyAuthoritativeEvents([event]);
    expect(result.applied.length).toBe(0);
    expect(result.rejected.length).toBe(1);
    expect(result.rejected[0]?.reason).toContain("Cannot break air");
  });

  it("rejects place on non-air voxel", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);

    const event: WorldEvent = {
      eventId: "evt-1",
      action: "place",
      pos: { x: 0, y: 0, z: 0 },
      blockId: BlockId.Dirt,
      clientId: "client-1",
      serverTick: 100
    };

    const result = world.applyAuthoritativeEvents([event]);
    expect(result.applied.length).toBe(0);
    expect(result.rejected.length).toBe(1);
    expect(result.rejected[0]?.reason).toContain("Cannot place");
  });

  it("sorts events by serverTick then eventId", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);
    world.setVoxel(1, 0, 0, BlockId.Stone);

    // Events out of order
    const events: WorldEvent[] = [
      { eventId: "b", action: "break", pos: { x: 1, y: 0, z: 0 }, clientId: "c1", serverTick: 100 },
      { eventId: "a", action: "break", pos: { x: 0, y: 0, z: 0 }, clientId: "c1", serverTick: 100 }
    ];

    const result = world.applyAuthoritativeEvents(events);
    // Both should be applied (sorted by eventId for same serverTick)
    expect(result.applied.length).toBe(2);
    expect(result.applied[0]?.eventId).toBe("a");
    expect(result.applied[1]?.eventId).toBe("b");
  });

  it("produces diffs for applied events", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);

    const event: WorldEvent = {
      eventId: "evt-1",
      action: "break",
      pos: { x: 0, y: 0, z: 0 },
      clientId: "client-1",
      serverTick: 100
    };

    const result = world.applyAuthoritativeEvents([event]);
    expect(result.diffs.length).toBe(1);
    expect(result.diffs[0]?.oldBlockId).toBe(BlockId.Stone);
    expect(result.diffs[0]?.newBlockId).toBe(BlockId.Air);
  });
});

describe("Iteration 10: world compact diffs (unit)", () => {
  it("captures baseline of non-air voxels", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);
    world.setVoxel(1, 1, 1, BlockId.Dirt);

    const baseline = world.captureBaseline();
    expect(baseline.size).toBe(2);
    expect(baseline.get(voxelKey(0, 0, 0))).toBe(BlockId.Stone);
    expect(baseline.get(voxelKey(1, 1, 1))).toBe(BlockId.Dirt);
  });

  it("produces compact diff for changed voxels", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);
    const baseline = world.captureBaseline();

    // Modify the world
    world.setVoxel(0, 0, 0, BlockId.Dirt); // Changed
    world.setVoxel(1, 0, 0, BlockId.Grass); // New

    const diffs = world.produceCompactDiff(baseline);
    expect(diffs.length).toBe(2);
    
    // Diffs should be sorted by key
    const stoneChange = diffs.find(d => d.key === voxelKey(0, 0, 0));
    const grassNew = diffs.find(d => d.key === voxelKey(1, 0, 0));
    
    expect(stoneChange?.oldBlockId).toBe(BlockId.Stone);
    expect(stoneChange?.newBlockId).toBe(BlockId.Dirt);
    expect(grassNew?.oldBlockId).toBe(BlockId.Air);
    expect(grassNew?.newBlockId).toBe(BlockId.Grass);
  });

  it("detects removed voxels (now air)", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);
    const baseline = world.captureBaseline();

    // Remove the block
    world.setVoxel(0, 0, 0, BlockId.Air);

    const diffs = world.produceCompactDiff(baseline);
    expect(diffs.length).toBe(1);
    expect(diffs[0]?.oldBlockId).toBe(BlockId.Stone);
    expect(diffs[0]?.newBlockId).toBe(BlockId.Air);
  });

  it("returns empty diff for unchanged world", () => {
    const world = createWorld();
    world.setVoxel(0, 0, 0, BlockId.Stone);
    const baseline = world.captureBaseline();

    const diffs = world.produceCompactDiff(baseline);
    expect(diffs.length).toBe(0);
  });

  it("diffs are sorted deterministically", () => {
    const world = createWorld();
    // Set voxels in non-sorted order
    world.setVoxel(2, 0, 0, BlockId.Dirt);
    world.setVoxel(0, 0, 0, BlockId.Stone);
    world.setVoxel(1, 0, 0, BlockId.Grass);
    
    const baseline = new Map<string, number>();

    const diffs = world.produceCompactDiff(baseline);
    expect(diffs.length).toBe(3);
    // Should be sorted by key: "0,0,0" < "1,0,0" < "2,0,0"
    expect(diffs[0]?.key).toBe("0,0,0");
    expect(diffs[1]?.key).toBe("1,0,0");
    expect(diffs[2]?.key).toBe("2,0,0");
  });
});

describe("Iteration 10: world utility functions (unit)", () => {
  it("creates deterministic voxel keys", () => {
    expect(voxelKey(0, 0, 0)).toBe("0,0,0");
    expect(voxelKey(10, 20, 30)).toBe("10,20,30");
    expect(voxelKey(-5, 10, -15)).toBe("-5,10,-15");
  });

  it("parses voxel keys back to coordinates", () => {
    expect(parseVoxelKey("0,0,0")).toEqual({ wx: 0, wy: 0, wz: 0 });
    expect(parseVoxelKey("10,20,30")).toEqual({ wx: 10, wy: 20, wz: 30 });
    expect(parseVoxelKey("-5,10,-15")).toEqual({ wx: -5, wy: 10, wz: -15 });
  });

  it("compares world events deterministically", () => {
    const a: WorldEvent = { eventId: "a", action: "break", pos: { x: 0, y: 0, z: 0 }, clientId: "c", serverTick: 100 };
    const b: WorldEvent = { eventId: "b", action: "break", pos: { x: 0, y: 0, z: 0 }, clientId: "c", serverTick: 100 };
    const c: WorldEvent = { eventId: "a", action: "break", pos: { x: 0, y: 0, z: 0 }, clientId: "c", serverTick: 200 };

    expect(compareWorldEvents(a, b)).toBeLessThan(0); // Same tick, "a" < "b"
    expect(compareWorldEvents(b, a)).toBeGreaterThan(0);
    expect(compareWorldEvents(a, c)).toBeLessThan(0); // Different tick, 100 < 200
    expect(compareWorldEvents(c, a)).toBeGreaterThan(0);
  });

  it("compares voxel diffs deterministically", () => {
    const a = { key: "0,0,0", wx: 0, wy: 0, wz: 0, oldBlockId: 0, newBlockId: 1 };
    const b = { key: "1,0,0", wx: 1, wy: 0, wz: 0, oldBlockId: 0, newBlockId: 1 };

    expect(compareVoxelDiffs(a, b)).toBeLessThan(0);
    expect(compareVoxelDiffs(b, a)).toBeGreaterThan(0);
    expect(compareVoxelDiffs(a, a)).toBe(0);
  });
});
