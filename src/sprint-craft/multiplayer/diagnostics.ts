export type DiagnosticsStats = {
  enabled: boolean;
  lastPingMs: number | null;
  lastServerTick: number | null;
  lastChecksum: number | null;
  lastSnapshotAtMs: number | null;
  snapshotAgeMs: number | null;
};

export type DiagnosticsHandle = {
  setEnabled: (enabled: boolean) => void;
  recordPing: (rttMs: number) => void;
  recordServerTick: (tick: number) => void;
  recordChecksum: (data: unknown) => number;
  recordSnapshotAt: (nowMs: number) => void;
  updateSnapshotAge: (nowMs: number) => void;
  getStats: () => DiagnosticsStats;
};

export function computeChecksum(data: unknown): number {
  const serialized = stableStringify(data);
  return fnv1a(serialized);
}

export function createDiagnostics(options?: { enabled?: boolean }): DiagnosticsHandle {
  let enabled = options?.enabled ?? true;
  let lastPingMs: number | null = null;
  let lastServerTick: number | null = null;
  let lastChecksum: number | null = null;
  let lastSnapshotAtMs: number | null = null;
  let snapshotAgeMs: number | null = null;

  const setEnabled = (value: boolean) => {
    enabled = value;
  };

  const recordPing = (rttMs: number) => {
    if (!enabled) return;
    lastPingMs = rttMs;
  };

  const recordServerTick = (tick: number) => {
    if (!enabled) return;
    lastServerTick = tick;
  };

  const recordChecksum = (data: unknown) => {
    if (!enabled) return lastChecksum ?? 0;
    lastChecksum = computeChecksum(data);
    return lastChecksum;
  };

  const recordSnapshotAt = (nowMs: number) => {
    if (!enabled) return;
    lastSnapshotAtMs = nowMs;
    snapshotAgeMs = 0;
  };

  const updateSnapshotAge = (nowMs: number) => {
    if (!enabled || lastSnapshotAtMs === null) return;
    snapshotAgeMs = Math.max(0, nowMs - lastSnapshotAtMs);
  };

  const getStats = (): DiagnosticsStats => ({
    enabled,
    lastPingMs,
    lastServerTick,
    lastChecksum,
    lastSnapshotAtMs,
    snapshotAgeMs
  });

  return {
    setEnabled,
    recordPing,
    recordServerTick,
    recordChecksum,
    recordSnapshotAt,
    updateSnapshotAge,
    getStats
  };
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}
