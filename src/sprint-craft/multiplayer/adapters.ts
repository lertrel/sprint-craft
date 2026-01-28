import type { BlockResult, RoomSnapshot, StateDelta } from "../../../shared/protocol";
import type { PlayerProgress, PlayerVolatile } from "../../../shared/protocol";

export type SessionAdapter = {
  getLocalPlayerProgress: () => PlayerProgress;
  getLocalPlayerVolatile: () => PlayerVolatile;
  applySnapshot: (snapshot: RoomSnapshot) => void;
  applyDelta: (delta: StateDelta) => void;
  handleBlockResult?: (result: BlockResult) => void;
};
