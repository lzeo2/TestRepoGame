// Local-only playable composition: original controller/flight, existing FC authority and shared art.
import * as THREE from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { loadGlb } from "../render/glb"
import type { SceneHost } from "../render/scene"
import type { RoomHandlers, LoopbackRoom } from "../sim/loopback"
import type { VehicleKind } from "../sim/types"
import { createLoopbackRoom } from "../sim/loopback"
import { DEFAULT_ROOM_CONFIG } from "../sim/protocol"
import { createRetainedHostBridge } from "../../../../../authoring/retained-host-bridge.mjs"
import { createLocalFleetConfig, LOCAL_MODEL_ASSETS, COALITION_MODEL_ASSETS } from "../../../../../authoring/local-host-scenario.mjs"
import { createLocalFleetView } from "../../../../../authoring/local-fleet-view.mjs"
import { safeFleetHudTargets } from "./fleet-hud-targets"
import { compileGeometry, fittedHeightAt, fittedHit } from "../../../../../authoring/fleet-geometry.mjs"
import { coalitionPair } from "../../../../../authoring/coalition-rosters.mjs"

export async function prepareLocalFactions(host: SceneHost, coalition?: string) {
  const profiles = coalition === undefined ? null : coalitionPair(coalition)
  const config = createLocalFleetConfig(coalition)
  const aircraftKinds = Object.freeze(config.aircraft[0].map((entry: { id: string }) => entry.id as VehicleKind))
  const teamNames: readonly string[] = Object.freeze(profiles ? profiles.map(profile => profile.name) : ["Cobalt", "Amber"])
  const armament = profiles ? "cannon for fleet · air combat" : "guns, rockets and direct bombs"
  const geometry = new Map(config.geometry.map(({ id, descriptor }: any) => [id, compileGeometry(descriptor)]))
  const loader = new GLTFLoader()
  const view = await createLocalFleetView(THREE, {
    scene: host.scene, team: 0, assets: profiles ? COALITION_MODEL_ASSETS : LOCAL_MODEL_ASSETS, units: config.units,
    hostMode: true, quality: host.quality, reducedFlashes: true,
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
    lastFrame = null
    host.effects.setFleetFrame(null)
    try { room?.close() } finally { try { bridge.dispose() } finally { view.dispose() } }
  }
  return {
    connect(name: string, handlers: RoomHandlers) {
      if (room || disposed) throw new Error("Local Factions connects once")
      room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, name: profiles ? `${profiles[0].shortName} vs ${profiles[1].shortName}` : "Local Factions", teams: 2, bots: 2, botFill: 0,
        listed: false, timeLimit: config.matchMs / 1000 }, name, handlers, { hostBridge: bridge })
      return { send: room.send, close: dispose }
    },
    setPaused(value: boolean) { bridge.setPaused(value) },
    aircraftKinds() { return aircraftKinds },
    teamNames() { return teamNames },
    safeTargets() { return safeFleetHudTargets(lastFrame) },
    // Safe visible frame only, never the host authority. No model identities leave this closure.
    // Empty/before-frame/disposed frames and unmodelled units return null.
    surfaceHeightAt(x: number, z: number): number | null {
      let top: number | null = null
      for (const target of safeFleetHudTargets(lastFrame)) {
        const unit = lastFrame.units.find((u: any) => u.id === target.id)
        const g = geometry.get(unit?.modelId)
        const y = g ? fittedHeightAt(g, x, z, target.position, target.heading) : null
        if (y !== null && (top === null || y > top)) top = y
      }
      return top
    },
    surfaceSegment(a: readonly number[], b: readonly number[]): number | null {
      if (![a, b].every(p => Array.isArray(p) && p.length === 3 && p.every(n => Number.isFinite(n) && Math.abs(n) <= 100000))) return null
      let first: number | null = null
      for (const target of safeFleetHudTargets(lastFrame)) {
        const unit = lastFrame.units.find((u: any) => u.id === target.id)
        const g = geometry.get(unit?.modelId)
        const t = g ? fittedHit(g, a, b, target.position, target.heading) : null
        if (t !== null && (first === null || t < first)) first = t
      }
      return first
    },
    surfaceContact(point: readonly number[]) {
      if (!Array.isArray(point) || point.length !== 3 || !point.every(n => Number.isFinite(n) && Math.abs(n) <= 100000)) return null
      for (const target of safeFleetHudTargets(lastFrame)) {
        const unit = lastFrame.units.find((u: any) => u.id === target.id)
        const g = geometry.get(unit?.modelId)
        const top = g ? fittedHeightAt(g, point[0], point[2], target.position, target.heading) : null
        // Only the physical top, not nearby terrain, a padded footprint or near-miss damage.
        if (top !== null && Math.abs(point[1] - top) < 1e-5) return target
      }
      return null
    },
    objectives() { return lastFrame?.units.filter((unit: any) => unit.capital).map((unit: any) => ({
      team: unit.team, hp: unit.hp, maxHp: unit.maxHp, sunk: !unit.alive,
    })) },
    hint() {
      const enemy = safeFleetHudTargets(lastFrame).find(u => u.team === 1 && u.capital)
      const player = room?.engine.players.get(room.playerId)?.info
      const position = room?.engine.vehicles.find(vehicle => vehicle.id === player?.vehicleId)?.flight.position
      if (!enemy || !position) return `fleet objectives · ${armament} · aircraft only`
      const dx = enemy.position[0] - position[0], dz = enemy.position[2] - position[2]
      const bearing = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360
      return `${profiles?.[1].shortName ?? "amber"} flagship ${Math.ceil(enemy.hp)}/${enemy.maxHp} · ${Math.round(Math.hypot(dx, dz))} m · bearing ${Math.round(bearing)} · ${armament}`
    },
    debug() { return { ...bridge.stats(), coalitions: profiles?.map(profile => ({ id: profile.id, name: profile.name,
      aircraft: [...profile.aircraft], vessel: profile.vessel,
      vessels: profile.vessels.map(vessel => vessel.id) })), hostTick: room?.engine.tick, playerId: room?.playerId,
      frame: lastFrame, effects: host.effects.fleetStats(), seaFX: view.seaStats(), visible: view.root.visible, objects: view.root.children.length,
      roots: host.scene.children.filter(object => object.name === "fleet-presentation").length,
      models: config.units.map((unit: { id: string }) => {
        const object = view.root.getObjectByName(`fleet-unit:${unit.id}`)
        return { id: unit.id, visible: object?.visible, position: object?.position.toArray(),
          scale: object?.scale.toArray(), ready: !!object?.children.length }
      }) } },
    dispose,
  }
}
