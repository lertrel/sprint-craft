import { BlockId, type BlockId as BlockIdT } from "./blocks";
import { CHUNK_SIZE, chunkKey, createChunk, type Chunk } from "./chunk";
import { floorDiv, mod } from "./math";
import type { WorldEvent } from "../../../shared/protocol";

/**
 * Compact diff entry for a single voxel change.
 * Uses a deterministic key format for consistent ordering.
 */
export type VoxelDiff = {
  /** Deterministic key: "x,y,z" for sorting */
  key: string;
  wx: number;
  wy: number;
  wz: number;
  oldBlockId: BlockIdT;
  newBlockId: BlockIdT;
};

/**
 * Result of applying authoritative world events.
 */
export type ApplyEventsResult = {
  applied: WorldEvent[];
  rejected: Array<{ event: WorldEvent; reason: string }>;
  diffs: VoxelDiff[];
};

export type World = {
  readonly chunks: Map<string, Chunk>;
  getChunk: (cx: number, cy: number, cz: number) => Chunk | undefined;
  ensureChunk: (cx: number, cy: number, cz: number) => Chunk;
  getVoxel: (wx: number, wy: number, wz: number) => BlockIdT;
  setVoxel: (wx: number, wy: number, wz: number, id: BlockIdT) => void;
  /**
   * Applies authoritative voxel edit events from the server.
   * Events are applied in deterministic order (sorted by serverTick, then eventId).
   */
  applyAuthoritativeEvents: (events: WorldEvent[]) => ApplyEventsResult;
  /**
   * Produces a compact diff of voxel changes between current state and a baseline.
   * Diffs are sorted deterministically by position key.
   */
  produceCompactDiff: (baseline: Map<string, BlockIdT>) => VoxelDiff[];
  /**
   * Captures current voxel state as a baseline for diff computation.
   * Only includes non-air voxels.
   */
  captureBaseline: () => Map<string, BlockIdT>;
};

export type WorldToChunk = {
  cx: number;
  cy: number;
  cz: number;
  lx: number;
  ly: number;
  lz: number;
};

/**
 * Creates a deterministic voxel key for consistent ordering across clients.
 */
export function voxelKey(wx: number, wy: number, wz: number): string {
  return `${wx},${wy},${wz}`;
}

/**
 * Parses a voxel key back into coordinates.
 */
export function parseVoxelKey(key: string): { wx: number; wy: number; wz: number } {
  const parts = key.split(",").map(Number);
  return { wx: parts[0] ?? 0, wy: parts[1] ?? 0, wz: parts[2] ?? 0 };
}

/**
 * Comparator for sorting world events deterministically.
 * Primary sort: serverTick ascending.
 * Secondary sort: eventId lexicographic ascending.
 */
export function compareWorldEvents(a: WorldEvent, b: WorldEvent): number {
  if (a.serverTick !== b.serverTick) {
    return a.serverTick - b.serverTick;
  }
  return a.eventId.localeCompare(b.eventId);
}

/**
 * Comparator for sorting voxel diffs deterministically by position.
 */
export function compareVoxelDiffs(a: VoxelDiff, b: VoxelDiff): number {
  return a.key.localeCompare(b.key);
}

export function worldToChunk(wx: number, wy: number, wz: number): WorldToChunk {
  const cx = floorDiv(wx, CHUNK_SIZE);
  const cy = floorDiv(wy, CHUNK_SIZE);
  const cz = floorDiv(wz, CHUNK_SIZE);

  return {
    cx,
    cy,
    cz,
    lx: mod(wx, CHUNK_SIZE),
    ly: mod(wy, CHUNK_SIZE),
    lz: mod(wz, CHUNK_SIZE)
  };
}

export function createWorld(): World {
  const chunks = new Map<string, Chunk>();

  const getChunk = (cx: number, cy: number, cz: number) =>
    chunks.get(chunkKey(cx, cy, cz));

  const ensureChunk = (cx: number, cy: number, cz: number) => {
    const key = chunkKey(cx, cy, cz);
    const existing = chunks.get(key);
    if (existing) return existing;
    const created = createChunk({ cx, cy, cz });
    chunks.set(key, created);
    return created;
  };

  const getVoxel = (wx: number, wy: number, wz: number): BlockIdT => {
    const { cx, cy, cz, lx, ly, lz } = worldToChunk(wx, wy, wz);
    const chunk = getChunk(cx, cy, cz);
    if (!chunk) return BlockId.Air;
    return chunk.getLocal(lx, ly, lz);
  };

  const setVoxel = (wx: number, wy: number, wz: number, id: BlockIdT) => {
    const { cx, cy, cz, lx, ly, lz } = worldToChunk(wx, wy, wz);
    const chunk = ensureChunk(cx, cy, cz);
    chunk.setLocal(lx, ly, lz, id);
  };

  /**
   * Applies authoritative voxel edit events from the server.
   * Events are sorted and applied in deterministic order.
   */
  const applyAuthoritativeEvents = (events: WorldEvent[]): ApplyEventsResult => {
    const applied: WorldEvent[] = [];
    const rejected: Array<{ event: WorldEvent; reason: string }> = [];
    const diffs: VoxelDiff[] = [];

    // Sort events deterministically for consistent application across clients
    const sortedEvents = [...events].sort(compareWorldEvents);

    for (const event of sortedEvents) {
      const { x: wx, y: wy, z: wz } = event.pos;
      const oldBlockId = getVoxel(wx, wy, wz);

      // Validate and apply the event
      if (event.action === "break") {
        if (oldBlockId === BlockId.Air) {
          rejected.push({ event, reason: "Cannot break air" });
          continue;
        }
        setVoxel(wx, wy, wz, BlockId.Air);
        diffs.push({
          key: voxelKey(wx, wy, wz),
          wx,
          wy,
          wz,
          oldBlockId,
          newBlockId: BlockId.Air
        });
        applied.push(event);
      } else if (event.action === "place") {
        // Cast to BlockIdT - validation of valid block IDs is done elsewhere
        const blockId = (event.blockId ?? BlockId.Stone) as BlockIdT;
        if (oldBlockId !== BlockId.Air) {
          rejected.push({ event, reason: "Cannot place in non-air voxel" });
          continue;
        }
        setVoxel(wx, wy, wz, blockId);
        diffs.push({
          key: voxelKey(wx, wy, wz),
          wx,
          wy,
          wz,
          oldBlockId,
          newBlockId: blockId
        });
        applied.push(event);
      } else {
        rejected.push({ event, reason: `Unknown action: ${(event as WorldEvent).action}` });
      }
    }

    // Sort diffs deterministically
    diffs.sort(compareVoxelDiffs);

    return { applied, rejected, diffs };
  };

  /**
   * Captures current voxel state as a baseline map.
   * Only includes non-air voxels to keep the baseline compact.
   */
  const captureBaseline = (): Map<string, BlockIdT> => {
    const baseline = new Map<string, BlockIdT>();
    for (const chunk of chunks.values()) {
      const { cx, cy, cz } = chunk;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const blockId = chunk.getLocal(lx, ly, lz);
            if (blockId !== BlockId.Air) {
              const wx = cx * CHUNK_SIZE + lx;
              const wy = cy * CHUNK_SIZE + ly;
              const wz = cz * CHUNK_SIZE + lz;
              baseline.set(voxelKey(wx, wy, wz), blockId);
            }
          }
        }
      }
    }
    return baseline;
  };

  /**
   * Produces a compact diff of voxel changes between current state and a baseline.
   * Diffs are sorted deterministically by position key for consistent ordering.
   */
  const produceCompactDiff = (baseline: Map<string, BlockIdT>): VoxelDiff[] => {
    const diffs: VoxelDiff[] = [];
    const processedKeys = new Set<string>();

    // Check all voxels in loaded chunks
    for (const chunk of chunks.values()) {
      const { cx, cy, cz } = chunk;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const blockId = chunk.getLocal(lx, ly, lz);
            const wx = cx * CHUNK_SIZE + lx;
            const wy = cy * CHUNK_SIZE + ly;
            const wz = cz * CHUNK_SIZE + lz;
            const key = voxelKey(wx, wy, wz);
            
            processedKeys.add(key);
            const oldBlockId = baseline.get(key) ?? BlockId.Air;
            if (oldBlockId !== blockId) {
              diffs.push({ key, wx, wy, wz, oldBlockId, newBlockId: blockId });
            }
          }
        }
      }
    }

    // Check for baseline voxels that are no longer in any loaded chunk
    for (const [key, oldBlockId] of baseline) {
      if (!processedKeys.has(key)) {
        const { wx, wy, wz } = parseVoxelKey(key);
        const currentBlockId = getVoxel(wx, wy, wz);
        if (currentBlockId !== oldBlockId) {
          diffs.push({ key, wx, wy, wz, oldBlockId, newBlockId: currentBlockId });
        }
      }
    }

    // Sort deterministically
    diffs.sort(compareVoxelDiffs);

    return diffs;
  };

  return {
    chunks,
    getChunk,
    ensureChunk,
    getVoxel,
    setVoxel,
    applyAuthoritativeEvents,
    produceCompactDiff,
    captureBaseline
  };
}

