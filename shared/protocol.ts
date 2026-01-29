export const PROTOCOL_VERSION = 1;

export type MsgType =
  | "C_HELLO"
  | "C_INPUT"
  | "C_BLOCK_EDIT"
  | "C_PING"
  | "S_WELCOME"
  | "S_STATE_SNAPSHOT"
  | "S_STATE_DELTA"
  | "S_BLOCK_RESULT"
  | "S_CORRECTION"
  | "S_PONG"
  | "S_PLAYER_JOIN"
  | "S_PLAYER_LEAVE";

export type Envelope<T> = {
  v: number;
  t: MsgType;
  ts: number;
  clientId?: string;
  serverTick?: number;
  seq?: number;
  payload: T;
};

export type Vec3 = { x: number; y: number; z: number };

export type Appearance = {
  torsoColor?: [number, number, number];
  faceColor?: [number, number, number];
  eyeColor?: [number, number, number];
};

export type PlayerVolatile = {
  id: string;
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  stance: "standing" | "crouching" | "crawling";
  grounded: boolean;
  hotbarSlot?: number;
};

export type PlayerProgress = {
  id: string;
  name: string;
  appearance?: Appearance;
  joinedAt: number;
};

export type HitInfo = {
  wx: number;
  wy: number;
  wz: number;
  nx: number;
  ny: number;
  nz: number;
};

export type WorldEvent = {
  eventId: string;
  action: "break" | "place";
  pos: { x: number; y: number; z: number };
  blockId?: number;
  clientId: string;
  clientSeq?: number;
  clientTs?: number;
  serverTick: number;
};

export type RoomSnapshot = {
  serverTick: number;
  worldSeed: number;
  players: PlayerProgress[];
  playerStates: PlayerVolatile[];
  worldEvents: WorldEvent[];
};

export type StateDelta = {
  serverTick: number;
  players?: PlayerVolatile[];
  removedPlayerIds?: string[];
  worldEvents?: WorldEvent[];
};

export type BlockResult = {
  editSeq: number;
  ok: boolean;
  reason?: string;
  event?: WorldEvent;
};

export type HelloPayload = {
  name: string;
  appearance?: Appearance;
  clientBuild?: string;
};

export type PingPayload = {
  pingId: number;
  clientTs: number;
};

export type InputFrame = {
  seq: number;
  dtSec: number;
  keysDown: string[];
  keysPressed: string[];
  yaw: number;
  pitch: number;
  clientState?: PlayerVolatile;
};

export type InputPayload = {
  frames: InputFrame[];
};

export type PongPayload = {
  pingId: number;
  serverTs: number;
};

export type WelcomePayload = {
  playerId: string;
  tickRate: number;
  worldSeed: number;
  snapshot: RoomSnapshot;
};

export type CorrectionPayload = {
  playerId: string;
  serverTick: number;
  state: PlayerVolatile;
  ackSeq?: number;
  reason?: string;
};

export type StateKey =
  | "playerVolatile"
  | "playerProgress"
  | "worldEvents"
  | "worldSeed"
  | "inputFrames"
  | "aimTarget";

export type StateClass = "volatile" | "gameProgress";

export const STATE_CLASSIFICATION: Record<StateKey, StateClass> = {
  playerVolatile: "volatile",
  playerProgress: "gameProgress",
  worldEvents: "gameProgress",
  worldSeed: "gameProgress",
  inputFrames: "volatile",
  aimTarget: "volatile"
};

export function classifyState(key: StateKey): StateClass {
  return STATE_CLASSIFICATION[key];
}

export function createEnvelope<T>(
  type: MsgType,
  payload: T,
  meta?: {
    ts?: number;
    v?: number;
    clientId?: string;
    serverTick?: number;
    seq?: number;
  }
): Envelope<T> {
  return {
    v: meta?.v ?? PROTOCOL_VERSION,
    t: type,
    ts: meta?.ts ?? Date.now(),
    clientId: meta?.clientId,
    serverTick: meta?.serverTick,
    seq: meta?.seq,
    payload
  };
}

export function serializeEnvelope<T>(envelope: Envelope<T>): string {
  return JSON.stringify(envelope);
}

export function parseEnvelope<T>(text: string): Envelope<T> {
  return JSON.parse(text) as Envelope<T>;
}
