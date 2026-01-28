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
  const client = options.client;
  if (client) {
    // If a ClientLike is provided, use it directly (already returns RoomLike)
    return {
      joinOrCreate: (roomName: string, opts?: unknown) => client.joinOrCreate(roomName, opts)
    };
  }

  // Use real Colyseus client and adapt Room to RoomLike
  const realClient = new Client(options.url);
  return {
    joinOrCreate: async (roomName: string, opts?: unknown): Promise<RoomLike> => {
      const room = await realClient.joinOrCreate(roomName, opts);
      return {
        id: room.roomId,
        name: room.name,
        send: (type, message) => room.send(type, message),
        onMessage: (type, cb) => room.onMessage(type, cb),
        onStateChange: (cb) => room.onStateChange(cb),
        onLeave: (cb) => room.onLeave(cb),
        leave: async () => { await room.leave(); },
      };
    }
  };
}
