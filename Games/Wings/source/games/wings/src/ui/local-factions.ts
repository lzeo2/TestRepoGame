// Local-only playable composition: original controller/flight, existing FC authority and shared art.
import * as THREE from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { loadGlb } from "../render/glb"
import type { SceneHost } from "../render/scene"
import type { RoomHandlers, LoopbackRoom } from "../sim/loopback"
import { createLoopbackRoom } from "../sim/loopback"
import { DEFAULT_ROOM_CONFIG } from "../sim/protocol"
import { createRetainedHostBridge } from "../../../../../authoring/retained-host-bridge.mjs"
import { createLocalFleetConfig, LOCAL_MODEL_ASSETS } from "../../../../../authoring/local-host-scenario.mjs"
import { createLocalFleetView } from "../../../../../authoring/local-fleet-view.mjs"

export async function prepareLocalFactions(host: SceneHost) {
  const config = createLocalFleetConfig()
  const loader = new GLTFLoader()
  const view = await createLocalFleetView(THREE, {
    scene: host.scene, team: 0, assets: LOCAL_MODEL_ASSETS, units: config.units,
    baseUrl: new URL(import.meta.env.BASE_URL, location.href).href,
    load: (url: string) => loadGlb(loader, url),
  })
  let room: LoopbackRoom | null = null, lastFrame: any = null, disposed = false
  const bridge = createRetainedHostBridge({ mode: "factions", config,
    rosters: config.aircraft.map((roster: { id: string }[]) => roster.map(a => a.id)),
    onSnapshot(id: string, frame: any) {
      if (id !== room?.playerId || disposed) return
      if (lastFrame && frame.tick < lastFrame.tick) view.reset()
      lastFrame = frame
      view.update(frame)
      host.effects.setFleetFrame(frame)
    },
  })!
  function dispose() {
    if (disposed) return
    disposed = true
    host.effects.setFleetFrame(null)
    try { room?.close() } finally { try { bridge.dispose() } finally { view.dispose() } }
  }
  return {
    connect(name: string, handlers: RoomHandlers) {
      if (room || disposed) throw new Error("Local Factions connects once")
      room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, name: "Local Factions", teams: 2, bots: 2, botFill: 0,
        listed: false, timeLimit: config.matchMs / 1000 }, name, handlers, { hostBridge: bridge })
      return { send: room.send, close: dispose }
    },
    setPaused(value: boolean) { bridge.setPaused(value) },
    objectives() { return lastFrame?.units.filter((unit: any) => unit.capital).map((unit: any) => ({
      team: unit.team, hp: unit.hp, maxHp: unit.maxHp, sunk: !unit.alive,
    })) },
    hint() {
      const enemy = lastFrame?.units.find((u: any) => u.team === 1 && u.capital)
      const player = room?.engine.players.get(room.playerId)?.info
      const position = room?.engine.vehicles.find(vehicle => vehicle.id === player?.vehicleId)?.flight.position
      if (!enemy || !position) return "fleet objectives · cannon fire · aircraft only"
      const dx = enemy.position[0] - position[0], dz = enemy.position[2] - position[2]
      const bearing = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360
      return `amber flagship ${Math.ceil(enemy.hp)}/${enemy.maxHp} · ${Math.round(Math.hypot(dx, dz))} m · bearing ${Math.round(bearing)} · cannon fire`
    },
    debug() { return { ...bridge.stats(), hostTick: room?.engine.tick, playerId: room?.playerId,
      frame: lastFrame, effects: host.effects.fleetStats(), visible: view.root.visible, objects: view.root.children.length,
      roots: host.scene.children.filter(object => object.name === "fleet-presentation").length,
      models: config.units.map((unit: { id: string }) => {
        const object = view.root.getObjectByName(`fleet-unit:${unit.id}`)
        return { id: unit.id, visible: object?.visible, position: object?.position.toArray(),
          scale: object?.scale.toArray(), ready: !!object?.children.length }
      }) } },
    dispose,
  }
}
