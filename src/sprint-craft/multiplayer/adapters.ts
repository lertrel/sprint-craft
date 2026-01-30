import type {
  BlockResult,
  CorrectionPayload,
  InputFrame,
  RoomSnapshot,
  StateDelta
} from "../../../shared/protocol";
import type { PlayerProgress, PlayerVolatile } from "../../../shared/protocol";

export type SessionAdapter = {
  getLocalPlayerProgress: () => PlayerProgress;
  getLocalPlayerVolatile: () => PlayerVolatile;
  collectInputFrame?: (seq: number, nowMs: number, dtSec: number) => InputFrame | null;
  setLocalPlayerId?: (id: string) => void;
  applySnapshot: (snapshot: RoomSnapshot) => void;
  applyDelta: (delta: StateDelta) => void;
  applyCorrection?: (correction: CorrectionPayload) => void;
  handleBlockResult?: (result: BlockResult) => void;
};
