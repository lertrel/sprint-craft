import type {
  BlockResult,
  CorrectionPayload,
  InputFrame,
  InputPayload,
  PingPayload,
  PongPayload,
  WelcomePayload
} from "../../../shared/protocol";
import type { ColyseusClient, RoomLike } from "./colyseus-client";
import type { DiagnosticsHandle } from "./diagnostics";
import { createDiagnostics } from "./diagnostics";
import type { SessionAdapter } from "./adapters";
import type { TickContract } from "./tick-contract";
import { DEFAULT_TICK_CONTRACT, getTickIntervals } from "./tick-contract";

export type MultiplayerSession = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  tick: (nowMs: number) => void;
  getDiagnostics: () => ReturnType<DiagnosticsHandle["getStats"]>;
};

export type MultiplayerSessionOptions = {
  client: ColyseusClient;
  adapter: SessionAdapter;
  roomName?: string;
  diagnostics?: DiagnosticsHandle;
  tickContract?: TickContract;
  logger?: (message: string) => void;
};

const DEFAULT_ROOM_NAME = "sprint-craft";
const PING_INTERVAL_MS = 2000;

export function createMultiplayerSession(options: MultiplayerSessionOptions): MultiplayerSession {
  const {
    client,
    adapter,
    roomName = DEFAULT_ROOM_NAME,
    diagnostics = createDiagnostics(),
    tickContract = DEFAULT_TICK_CONTRACT,
    logger
  } = options;

  let room: RoomLike | null = null;
  let connected = false;
  let lastPingSentMs = 0;
  let pingId = 0;
  const pendingPings = new Map<number, number>();
  const intervals = getTickIntervals(tickContract);
  const pendingInputs: InputFrame[] = [];
  let lastInputSentMs = 0;
  let nextInputSeq = 0;
  let lastTickMs: number | null = null;

  const log = (message: string) => logger?.(message);

  const connect = async () => {
    if (connected) return;
    pendingInputs.length = 0;
    nextInputSeq = 0;
    lastInputSentMs = 0;
    lastTickMs = null;
    room = await client.joinOrCreate(roomName, adapter.getLocalPlayerProgress());
    connected = true;
    log(`multiplayer: connected to ${roomName}`);

    room.onMessage("S_WELCOME", (payload) => {
      const welcome = payload as WelcomePayload;
      diagnostics.recordServerTick(welcome.snapshot.serverTick);
      diagnostics.recordSnapshotAt(Date.now());
      adapter.setLocalPlayerId?.(welcome.playerId);
      adapter.applySnapshot(welcome.snapshot);
    });

    room.onMessage("S_STATE_SNAPSHOT", (payload) => {
      diagnostics.recordSnapshotAt(Date.now());
      adapter.applySnapshot(payload as WelcomePayload["snapshot"]);
    });

    room.onMessage("S_STATE_DELTA", (payload) => {
      diagnostics.recordServerTick((payload as { serverTick: number }).serverTick);
      adapter.applyDelta(payload as Parameters<SessionAdapter["applyDelta"]>[0]);
    });

    room.onMessage("S_BLOCK_RESULT", (payload) => {
      adapter.handleBlockResult?.(payload as BlockResult);
    });

    room.onMessage("S_CORRECTION", (payload) => {
      adapter.applyCorrection?.(payload as CorrectionPayload);
    });

    room.onMessage("S_PONG", (payload) => {
      const pong = payload as PongPayload;
      const sentAt = pendingPings.get(pong.pingId);
      if (sentAt !== undefined) {
        diagnostics.recordPing(Date.now() - sentAt);
        pendingPings.delete(pong.pingId);
      }
    });

    room.onLeave(() => {
      connected = false;
      room = null;
      log("multiplayer: disconnected");
    });

    room.send("C_HELLO", adapter.getLocalPlayerProgress());
  };

  const disconnect = async () => {
    if (!room) return;
    await room.leave();
    room = null;
    connected = false;
  };

  const tick = (nowMs: number) => {
    if (!connected || !room) return;
    diagnostics.updateSnapshotAge(nowMs);
    const dtSec =
      lastTickMs === null ? 1 / 60 : Math.max(0, (nowMs - lastTickMs) / 1000);
    lastTickMs = nowMs;

    if (adapter.collectInputFrame) {
      const frame = adapter.collectInputFrame(nextInputSeq, nowMs, dtSec);
      if (frame) {
        pendingInputs.push(frame);
        nextInputSeq = Math.max(nextInputSeq, frame.seq + 1);
      }
    }

    const shouldSendInput =
      pendingInputs.length > 0 &&
      (nowMs - lastInputSentMs >= intervals.clientSendIntervalMs ||
        pendingInputs.length >= 6);
    if (shouldSendInput) {
      const payload: InputPayload = { frames: pendingInputs.splice(0) };
      room.send("C_INPUT", payload);
      lastInputSentMs = nowMs;
    }

    const shouldPing = nowMs - lastPingSentMs >= PING_INTERVAL_MS;
    if (shouldPing) {
      pingId += 1;
      const payload: PingPayload = { pingId, clientTs: nowMs };
      pendingPings.set(pingId, nowMs);
      room.send("C_PING", payload);
      lastPingSentMs = nowMs;
    }

  };

  const isConnected = () => connected;

  return {
    connect,
    disconnect,
    isConnected,
    tick,
    getDiagnostics: () => diagnostics.getStats()
  };
}
