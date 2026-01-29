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
  playerVolatile: { owner: "client", class: classifyState("playerVolatile") },
  playerProgress: { owner: "server", class: classifyState("playerProgress") },
  worldEvents: { owner: "server", class: classifyState("worldEvents") },
  worldSeed: { owner: "server", class: classifyState("worldSeed") },
  inputFrames: { owner: "client", class: classifyState("inputFrames") },
  aimTarget: { owner: "client", class: classifyState("aimTarget") }
};

export function getStateOwner(key: StateKey): StateOwner {
  return STATE_OWNERSHIP[key]!;
}
