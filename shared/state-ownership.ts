import { classifyState, type StateClass, type StateKey } from "./protocol";

export type StateOwner = "server" | "client" | "shared";

export const STATE_OWNERSHIP: Record<StateKey, StateOwner> = {
  playerVolatile: "client",
  playerProgress: "server",
  worldEvents: "server",
  worldSeed: "server",
  inputFrames: "client",
  aimTarget: "client"
};

export type OwnershipEntry = {
  owner: StateOwner;
  class: StateClass;
};

export const STATE_OWNERSHIP_MATRIX: Record<StateKey, OwnershipEntry> = {
  playerVolatile: { owner: STATE_OWNERSHIP.playerVolatile, class: classifyState("playerVolatile") },
  playerProgress: { owner: STATE_OWNERSHIP.playerProgress, class: classifyState("playerProgress") },
  worldEvents: { owner: STATE_OWNERSHIP.worldEvents, class: classifyState("worldEvents") },
  worldSeed: { owner: STATE_OWNERSHIP.worldSeed, class: classifyState("worldSeed") },
  inputFrames: { owner: STATE_OWNERSHIP.inputFrames, class: classifyState("inputFrames") },
  aimTarget: { owner: STATE_OWNERSHIP.aimTarget, class: classifyState("aimTarget") }
};

export function getStateOwner(key: StateKey): StateOwner {
  return STATE_OWNERSHIP[key];
}
