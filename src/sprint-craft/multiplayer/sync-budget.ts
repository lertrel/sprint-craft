import type { StateKey } from "../../../shared/protocol";

export type SyncBudget = {
  minIntervalMs: number;
  burst: number;
};

export const DEFAULT_SYNC_BUDGETS: Record<StateKey, SyncBudget> = {
  playerVolatile: { minIntervalMs: 50, burst: 3 },
  playerProgress: { minIntervalMs: 500, burst: 1 },
  worldEvents: { minIntervalMs: 0, burst: 10 },
  worldSeed: { minIntervalMs: 1000, burst: 1 },
  inputFrames: { minIntervalMs: 50, burst: 2 },
  aimTarget: { minIntervalMs: 100, burst: 2 }
};

type BudgetState = {
  lastSentMs: number | null;
  windowStartMs: number;
  burstCount: number;
};

export type SyncBudgetTracker = {
  canSend: (key: StateKey, nowMs: number) => boolean;
  recordSent: (key: StateKey, nowMs: number) => void;
  getState: (key: StateKey) => BudgetState;
};

export function createSyncBudgetTracker(
  budgets: Record<StateKey, SyncBudget> = DEFAULT_SYNC_BUDGETS
): SyncBudgetTracker {
  const states: Record<StateKey, BudgetState> = {
    playerVolatile: { lastSentMs: null, windowStartMs: 0, burstCount: 0 },
    playerProgress: { lastSentMs: null, windowStartMs: 0, burstCount: 0 },
    worldEvents: { lastSentMs: null, windowStartMs: 0, burstCount: 0 },
    worldSeed: { lastSentMs: null, windowStartMs: 0, burstCount: 0 },
    inputFrames: { lastSentMs: null, windowStartMs: 0, burstCount: 0 },
    aimTarget: { lastSentMs: null, windowStartMs: 0, burstCount: 0 }
  };

  const canSend = (key: StateKey, nowMs: number) => {
    const budget = budgets[key];
    const state = states[key];
    const windowMs = Math.max(1, budget.minIntervalMs * Math.max(1, budget.burst));
    if (nowMs - state.windowStartMs >= windowMs) {
      state.windowStartMs = nowMs;
      state.burstCount = 0;
    }

    if (
      state.lastSentMs !== null &&
      budget.minIntervalMs > 0 &&
      nowMs - state.lastSentMs < budget.minIntervalMs
    ) {
      return false;
    }

    if (state.burstCount >= budget.burst) {
      return false;
    }

    return true;
  };

  const recordSent = (key: StateKey, nowMs: number) => {
    const state = states[key];
    state.lastSentMs = nowMs;
    state.burstCount += 1;
  };

  const getState = (key: StateKey) => states[key];

  return { canSend, recordSent, getState };
}
