// Static port: the upstream in-browser room engine is the only transport.
import { createLoopbackRoom } from "../sim/loopback"
import type { LoopbackRoom, RoomHandlers } from "../sim/loopback"
import type { RoomConfig } from "../sim/protocol"

export type Connection = Pick<LoopbackRoom, "send" | "close">
const unavailable = (): never => { throw new Error("Multiplayer is not included in this offline port") }
const local = {
  createLocalRoom: (config: RoomConfig, name: string, handlers: RoomHandlers): Connection => createLoopbackRoom(config, name, handlers),
  connectRoom: unavailable,
  createRoom: unavailable,
  quickPlay: unavailable,
  listRooms: async () => [],
}
export async function getNet() { return local }
