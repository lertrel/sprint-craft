import { Client } from "colyseus.js";

export type RoomLike = {
  id: string;
  name: string;
  send: (type: string, message?: unknown) => void;
  onMessage: (type: string, cb: (message: unknown) => void) => void;
  onStateChange: (cb: (state: unknown) => void) => void;
  onLeave: (cb: (code: number) => void) => void;
  leave: () => Promise<void> | void;
};

export type ClientLike = {
  joinOrCreate: (roomName: string, options?: unknown) => Promise<RoomLike>;
};

export type ColyseusClient = {
  joinOrCreate: (roomName: string, options?: unknown) => Promise<RoomLike>;
};

export function createColyseusClient(options: {
  url: string;
  client?: ClientLike;
}): ColyseusClient {
  const client = options.client ?? new Client(options.url);
  return {
    joinOrCreate: (roomName: string, opts?: unknown) => client.joinOrCreate(roomName, opts)
  };
}
