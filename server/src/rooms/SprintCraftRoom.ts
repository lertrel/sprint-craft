import { Client, Room } from "colyseus";
import { MapSchema, Schema, type } from "@colyseus/schema";
import type { HelloPayload, PingPayload, PongPayload } from "../../../shared/protocol";

class PlayerEntry extends Schema {
  @type("string") id = "";
  @type("string") name = "";
}

class SprintCraftState extends Schema {
  @type("number") serverTick = 0;
  @type("number") worldSeed = 0;
  @type({ map: PlayerEntry }) players = new MapSchema<PlayerEntry>();
}

export class SprintCraftRoom extends Room<SprintCraftState> {
  onCreate() {
    this.setState(new SprintCraftState());
    this.setSimulationInterval(() => {
      this.state.serverTick += 1;
    }, 1000 / 20);

    this.onMessage("C_HELLO", (client, payload) => {
      const hello = payload as HelloPayload;
      const entry = this.state.players.get(client.sessionId);
      if (!entry) return;
      entry.name = hello.name;
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
    this.state.players.set(client.sessionId, entry);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
