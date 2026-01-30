import type { BabylonApi, SceneLike } from "../app";
import type { PlayerProgress, PlayerVolatile, RoomSnapshot, StateDelta } from "../../../shared/protocol";
import { formatUsername } from "../usernames";
import { createNameplate } from "../ui/nameplate";
import { createPlayerAvatar } from "../voxels/player-avatar";
import { createDeadReckoner, type DeadReckoningOptions } from "./dead-reckoning";

type RemotePlayerEntry = {
  progress: PlayerProgress;
  avatar: ReturnType<typeof createPlayerAvatar>;
  nameplate: ReturnType<typeof createNameplate>;
  deadReckoner: ReturnType<typeof createDeadReckoner>;
  lastState: PlayerVolatile | null;
};

export type RemotePlayersHandle = {
  setLocalPlayerId: (id: string) => void;
  applySnapshot: (snapshot: RoomSnapshot, nowMs: number) => void;
  applyDelta: (delta: StateDelta, nowMs: number) => void;
  tick: (nowMs: number) => void;
  removePlayer: (id: string) => void;
  dispose: () => void;
  getPlayerIds: () => string[];
};

export function createRemotePlayers(options: {
  babylon: BabylonApi;
  scene: SceneLike;
  deadReckoning: DeadReckoningOptions;
}): RemotePlayersHandle {
  const { babylon, scene, deadReckoning } = options;
  const players = new Map<string, RemotePlayerEntry>();
  let localPlayerId = "local";

  const setLocalPlayerId = (id: string) => {
    localPlayerId = id;
  };

  const upsertProgress = (progress: PlayerProgress) => {
    if (progress.id === localPlayerId) return;
    if (players.has(progress.id)) {
      const entry = players.get(progress.id);
      if (entry) {
        entry.progress = progress;
        entry.nameplate.setText(formatUsername(progress.name));
      }
      return;
    }
    const avatar = createPlayerAvatar({ babylon, scene, appearance: progress.appearance });
    const nameplate = createNameplate({
      babylon,
      scene,
      text: formatUsername(progress.name),
      name: `remote:${progress.id}:nameplate`
    });
    const deadReckoner = createDeadReckoner(deadReckoning);
    players.set(progress.id, {
      progress,
      avatar,
      nameplate,
      deadReckoner,
      lastState: null
    });
  };

  const upsertState = (state: PlayerVolatile, nowMs: number) => {
    if (state.id === localPlayerId) return;
    let entry = players.get(state.id);
    if (!entry) {
      upsertProgress({
        id: state.id,
        name: state.id,
        joinedAt: nowMs
      });
      entry = players.get(state.id);
    }
    if (!entry) return;
    entry.lastState = state;
    entry.deadReckoner.pushSample(state, nowMs);
  };

  const applySnapshot = (snapshot: RoomSnapshot, nowMs: number) => {
    const snapshotIds = new Set<string>();
    snapshot.players.forEach((progress) => {
      snapshotIds.add(progress.id);
      upsertProgress(progress);
    });
    snapshot.playerStates.forEach((state) => {
      snapshotIds.add(state.id);
      upsertState(state, nowMs);
    });

    // Remove players not present in snapshot (excluding local).
    players.forEach((_, id) => {
      if (id === localPlayerId) return;
      if (!snapshotIds.has(id)) {
        removePlayer(id);
      }
    });
  };

  const applyDelta = (delta: StateDelta, nowMs: number) => {
    delta.players?.forEach((state) => {
      upsertState(state, nowMs);
    });
    delta.removedPlayerIds?.forEach((id) => {
      removePlayer(id);
    });
  };

  const tick = (nowMs: number) => {
    players.forEach((entry) => {
      const sample = entry.deadReckoner.sample(nowMs) ?? entry.lastState;
      if (!sample) return;
      entry.avatar.setPose({
        position: sample.pos,
        yaw: sample.yaw,
        stance: sample.stance,
        swing: { left: 0, right: 0 },
        rightArmPose: "idle"
      });
      entry.avatar.setFirstPersonVisibility(false);
      const head = entry.avatar.getHeadPosition();
      entry.nameplate.setPosition({
        x: head.x,
        y: head.y + 0.25,
        z: head.z
      });
    });
  };

  const removePlayer = (id: string) => {
    const entry = players.get(id);
    if (!entry) return;
    entry.avatar.dispose();
    entry.nameplate.dispose();
    players.delete(id);
  };

  const dispose = () => {
    players.forEach((_, id) => removePlayer(id));
  };

  return {
    setLocalPlayerId,
    applySnapshot,
    applyDelta,
    tick,
    removePlayer,
    dispose,
    getPlayerIds: () => Array.from(players.keys())
  };
}
