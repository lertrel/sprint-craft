import { describe, expect, it } from "vitest";
import { classifyState, createEnvelope, PROTOCOL_VERSION } from "../shared/protocol";
import { createSyncBudgetTracker } from "../src/sprint-craft/multiplayer/sync-budget";
import { DEFAULT_TICK_CONTRACT, getTickIntervals } from "../src/sprint-craft/multiplayer/tick-contract";
import { computeChecksum } from "../src/sprint-craft/multiplayer/diagnostics";

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
