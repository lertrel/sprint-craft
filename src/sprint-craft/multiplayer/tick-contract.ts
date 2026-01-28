export type TickContract = {
  serverTickHz: number;
  snapshotHz: number;
  clientSendHz: number;
  interpolationDelayMs: number;
  maxExtrapolationMs: number;
};

export const DEFAULT_TICK_CONTRACT: TickContract = {
  serverTickHz: 20,
  snapshotHz: 10,
  clientSendHz: 20,
  interpolationDelayMs: 120,
  maxExtrapolationMs: 200
};

export type TickIntervals = {
  serverTickMs: number;
  snapshotIntervalMs: number;
  clientSendIntervalMs: number;
};

export function getTickIntervals(contract: TickContract = DEFAULT_TICK_CONTRACT): TickIntervals {
  return {
    serverTickMs: Math.round(1000 / contract.serverTickHz),
    snapshotIntervalMs: Math.round(1000 / contract.snapshotHz),
    clientSendIntervalMs: Math.round(1000 / contract.clientSendHz)
  };
}
