import { Client, Room } from "colyseus";
import { MapSchema, Schema, type } from "@colyseus/schema";
import type {
  CorrectionPayload,
  HelloPayload,
  InputFrame,
  InputPayload,
  PingPayload,
  PlayerProgress,
  PlayerVolatile,
  PongPayload,
  RoomSnapshot,
  StateDelta
} from "../../../shared/protocol";
import { createDefaultPlayerState } from "../../../src/sprint-craft/voxels/player-state";
import { applyInputFrame, DEFAULT_PLAYER_TUNING } from "../../../src/sprint-craft/voxels/player-controller";
import { DEFAULT_TICK_CONTRACT } from "../../../src/sprint-craft/multiplayer/tick-contract";

class PlayerEntry extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") joinedAt = 0;
}

class SprintCraftState extends Schema {
  @type("number") serverTick = 0;
  @type("number") worldSeed = 0;
  @type({ map: PlayerEntry }) players = new MapSchema<PlayerEntry>();
}

export class SprintCraftRoom extends Room<SprintCraftState> {
  private playerStates = new Map<
    string,
    {
      state: ReturnType<typeof createDefaultPlayerState>;
      grounded: boolean;
      lastSeq: number;
      lastYaw: number;
      lastPitch: number;
      lastHotbarSlot?: number;
      lastCorrectionTick: number;
    }
  >();
  private inputQueues = new Map<string, InputFrame[]>();
  private pendingRemovedIds: string[] = [];

  onCreate() {
    this.setState(new SprintCraftState());
    this.state.worldSeed = 1337;
    const serverTickMs = Math.round(1000 / DEFAULT_TICK_CONTRACT.serverTickHz);
    const snapshotEveryNTicks = Math.max(
      1,
      Math.round(DEFAULT_TICK_CONTRACT.serverTickHz / DEFAULT_TICK_CONTRACT.snapshotHz)
    );
    this.setSimulationInterval(() => {
      this.state.serverTick += 1;
      this.processInputs();
      if (this.state.serverTick % snapshotEveryNTicks === 0) {
        this.broadcastStateDelta();
      }
    }, serverTickMs);

    this.onMessage("C_HELLO", (client, payload) => {
      const hello = payload as HelloPayload;
      const entry = this.state.players.get(client.sessionId);
      if (!entry) return;
      entry.name = hello.name;
    });

    this.onMessage("C_INPUT", (client, payload) => {
      const input = payload as InputPayload;
      if (!input.frames || input.frames.length === 0) return;
      const queue = this.inputQueues.get(client.sessionId) ?? [];
      input.frames.forEach((frame) => queue.push(frame));
      queue.sort((a, b) => a.seq - b.seq);
      this.inputQueues.set(client.sessionId, queue);
    });

    this.onMessage("C_PING", (client, payload) => {
      const ping = payload as PingPayload;
      const pong: PongPayload = { pingId: ping.pingId, serverTs: Date.now() };
      client.send("S_PONG", pong);
    });
  }

  onJoin(client: Client) {
    const entry = new PlayerEntry();
    entry.id = client.sessionId;
    entry.name = "User";
    entry.joinedAt = Date.now();
    this.state.players.set(client.sessionId, entry);
    this.playerStates.set(client.sessionId, {
      state: createDefaultPlayerState(client.sessionId),
      grounded: true,
      lastSeq: -1,
      lastYaw: 0,
      lastPitch: 0,
      lastCorrectionTick: -999
    });
    const snapshot = this.buildSnapshot();
    client.send("S_WELCOME", {
      playerId: client.sessionId,
      tickRate: DEFAULT_TICK_CONTRACT.serverTickHz,
      worldSeed: this.state.worldSeed,
      snapshot
    });
    this.broadcast("S_PLAYER_JOIN", { playerId: client.sessionId });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.playerStates.delete(client.sessionId);
    this.inputQueues.delete(client.sessionId);
    this.pendingRemovedIds.push(client.sessionId);
    this.broadcast("S_PLAYER_LEAVE", { playerId: client.sessionId });
  }

  private processInputs() {
    this.playerStates.forEach((player, playerId) => {
      const queue = this.inputQueues.get(playerId);
      if (!queue || queue.length === 0) return;
      queue.forEach((frame) => {
        if (frame.seq <= player.lastSeq) return;
        const result = applyInputFrame({
          state: player.state,
          frame,
          grounded: player.grounded,
          getVoxel: this.getVoxelAt,
          tuning: DEFAULT_PLAYER_TUNING,
          respawn: () => this.resetPlayer(playerId)
        });
        player.grounded = result.grounded;
        player.lastSeq = frame.seq;
        player.lastYaw = frame.yaw;
        player.lastPitch = frame.pitch;
        player.lastHotbarSlot = frame.clientState?.hotbarSlot;

        const clientState = frame.clientState;
        if (clientState) {
          const divergence = distance(player.state.position, clientState.pos);
          const shouldCorrect =
            divergence > 0.35 &&
            this.state.serverTick - player.lastCorrectionTick >= 2;
          if (shouldCorrect) {
            player.lastCorrectionTick = this.state.serverTick;
            const correction: CorrectionPayload = {
              playerId,
              serverTick: this.state.serverTick,
              state: this.toPlayerVolatile(playerId, player),
              ackSeq: player.lastSeq,
              reason: "divergence"
            };
            const client = this.clients.find((c) => c.sessionId === playerId);
            client?.send("S_CORRECTION", correction);
          }
        }
      });
      this.inputQueues.set(playerId, []);
    });
  }

  private broadcastStateDelta() {
    const delta: StateDelta = {
      serverTick: this.state.serverTick,
      players: this.buildPlayerStates(),
      removedPlayerIds: this.pendingRemovedIds.length > 0 ? [...this.pendingRemovedIds] : undefined
    };
    if (this.pendingRemovedIds.length > 0) {
      this.pendingRemovedIds = [];
    }
    this.broadcast("S_STATE_DELTA", delta);
  }

  private buildPlayerStates(): PlayerVolatile[] {
    const states: PlayerVolatile[] = [];
    this.playerStates.forEach((entry, id) => {
      states.push(this.toPlayerVolatile(id, entry));
    });
    return states;
  }

  private buildSnapshot(): RoomSnapshot {
    const players: PlayerProgress[] = [];
    this.state.players.forEach((entry) => {
      players.push({
        id: entry.id,
        name: entry.name,
        joinedAt: entry.joinedAt
      });
    });
    return {
      serverTick: this.state.serverTick,
      worldSeed: this.state.worldSeed,
      players,
      playerStates: this.buildPlayerStates(),
      worldEvents: []
    };
  }

  private toPlayerVolatile(
    playerId: string,
    entry: {
      state: ReturnType<typeof createDefaultPlayerState>;
      grounded: boolean;
      lastYaw: number;
      lastPitch: number;
      lastHotbarSlot?: number;
    }
  ): PlayerVolatile {
    return {
      id: playerId,
      pos: { ...entry.state.position },
      vel: { ...entry.state.velocity },
      yaw: entry.lastYaw,
      pitch: entry.lastPitch,
      stance: entry.state.stance,
      grounded: entry.grounded,
      hotbarSlot: entry.lastHotbarSlot
    };
  }

  private resetPlayer(playerId: string) {
    const entry = this.playerStates.get(playerId);
    if (!entry) return;
    const state = entry.state;
    state.position.x = 0;
    state.position.y = 6;
    state.position.z = 0;
    state.velocity.x = 0;
    state.velocity.y = 0;
    state.velocity.z = 0;
    state.stance = "standing";
    entry.grounded = true;
  }

  private getVoxelAt(_wx: number, wy: number, _wz: number) {
    return wy <= 0 ? 1 : 0;
  }
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
