import { Server } from "colyseus";
import { createServer } from "http";
import { SprintCraftRoom } from "./rooms/SprintCraftRoom";

export type SprintCraftServer = {
  server: Server;
  httpServer: ReturnType<typeof createServer>;
  listen: (port?: number, host?: string) => Promise<void>;
};

export function createSprintCraftServer(): SprintCraftServer {
  const httpServer = createServer();
  const server = new Server({ server: httpServer });
  server.define("sprint-craft", SprintCraftRoom);

  const listen = (port = 2567, host = "0.0.0.0") =>
    new Promise<void>((resolve) => {
      httpServer.listen(port, host, () => resolve());
    });

  return { server, httpServer, listen };
}
