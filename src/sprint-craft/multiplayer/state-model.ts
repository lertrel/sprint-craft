import type { PlayerState } from "../voxels/player-state";
import type {
  Appearance,
  PlayerProgress,
  PlayerVolatile,
  RoomSnapshot,
  WorldEvent
} from "../../../shared/protocol";

export type PlayerVolatileInput = {
  id: string;
  state: PlayerState;
  yaw: number;
  pitch: number;
  grounded: boolean;
  hotbarSlot?: number;
};

export function toPlayerVolatile(input: PlayerVolatileInput): PlayerVolatile {
  const { id, state, yaw, pitch, grounded, hotbarSlot } = input;
  return {
    id,
    pos: { ...state.position },
    vel: { ...state.velocity },
    yaw,
    pitch,
    stance: state.stance,
    grounded,
    hotbarSlot
  };
}

export type PlayerProgressInput = {
  id: string;
  name: string;
  appearance?: Appearance;
  joinedAt?: number;
};

export function toPlayerProgress(input: PlayerProgressInput): PlayerProgress {
  return {
    id: input.id,
    name: input.name,
    appearance: input.appearance,
    joinedAt: input.joinedAt ?? Date.now()
  };
}

export type WorldEventInput = {
  eventId?: string;
  action: "break" | "place";
  position: { x: number; y: number; z: number };
  blockId?: number;
  clientId: string;
  clientSeq?: number;
  clientTs?: number;
  serverTick: number;
};

export function makeWorldEvent(input: WorldEventInput): WorldEvent {
  return {
    eventId: input.eventId ?? `${input.clientId}:${input.clientSeq ?? 0}:${input.serverTick}`,
    action: input.action,
    pos: { ...input.position },
    blockId: input.blockId,
    clientId: input.clientId,
    clientSeq: input.clientSeq,
    clientTs: input.clientTs,
    serverTick: input.serverTick
  };
}

export type SnapshotInput = {
  serverTick: number;
  worldSeed: number;
  players: PlayerProgress[];
  playerStates: PlayerVolatile[];
  worldEvents: WorldEvent[];
};

export function toRoomSnapshot(input: SnapshotInput): RoomSnapshot {
  return {
    serverTick: input.serverTick,
    worldSeed: input.worldSeed,
    players: input.players,
    playerStates: input.playerStates,
    worldEvents: input.worldEvents
  };
}
