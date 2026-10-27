// World rendering — owned by the World agent. WebGPU / node materials ("STORMFRONT").
// Streams wet, dark island terrain (generated in a Web Worker), a GPU-animated stormy ocean, a
// layered storm sky with lightning, height fog, rain/spray particles, and the carrier strike groups.
// Installs the scene's dim key + hemisphere lights, the storm fog node and a storm environment map.
import {
  Color, DataTexture, DirectionalLight, EquirectangularReflectionMapping, FloatType, Group, LinearFilter, RGBAFormat,
  Vector3, type Camera, type Object3D, type Scene, type Texture,
} from "three"
import { MeshStandardNodeMaterial, type WebGPURenderer } from "three/webgpu"
import type { Quality } from "../sim/types"
import { STORM, stormFogNode } from "./world/atmosphere"
import {
  BREAK_DIRECTION, FOG_BREAK_COLOR, FOG_COLOR, LIGHTNING_COLOR, SKY_ZENITH,
} from "./world/palette"
import { createParticles } from "./world/rain"
import { WORLD_QUALITY, type WorldQualitySettings } from "./world/settings"
import { createDaylight } from "./world/daylight"
import { createFleet, type TurretHandle } from "./world/ships"
import { createCloudLayers, createLightning, createSky } from "./world/sky"
import { TerrainStreamer, type StreamerStats } from "./world/streamer"
import { createTreeResources } from "./world/trees"
import { createWater } from "./world/water"
import { createCraters } from "./world/craters"
import type { Crater, ShipState } from "../sim/protocol"
import { setShipStates } from "../sim/geography"
import * as aircraftModule from "./aircraft"

export interface WorldView {
  /** Add to the scene once. Contains terrain, ocean, sky, clouds, rain, ships, lights. */
  root: Object3D
  /** Stream LODs around the camera, animate the storm. Budgeted (≤ ~2 ms CPU). time in seconds. */
  update(cameraPosition: Vector3, dt: number, time: number): void
  setQuality(quality: Quality): void
  /** Absolute room simulation seconds, shared with interpolated gameplay. Zero = 09:00. */
  setTimeOfDay(seconds: number): void
  /** Kept for compatibility (safe-zone domes were removed). */
  setHighlightTeam(team: number | null): void
  /** True once terrain near the last camera position is generated. */
  ready(): boolean
  /** Camera far plane recommended for this quality. */
  far: number
  /** Current lightning flash intensity 0..1 (read every frame for bloom/exposure flashes). */
  readonly lightning: number
  /** Subscribe to lightning strikes (direction = world unit vector from the camera). Returns unsubscribe. */
  onLightning(cb: (intensity: number, direction: Vector3) => void): () => void
  /**
   * The current/most recent strike for thunder (audio delays by distance / 343 m/s): intensity is the
   * flash envelope's peak (1) while the strike is recent (< 30 s), position is mid-bolt in world space.
   */
  lightningSource(): { intensity: number; position: Vector3; age: number } | null
  /** Storm environment map (equirect, HDR) for wet reflections on other materials. */
  readonly environment: Texture
  /** Centre the bounded solar shadow map on the player's current position. */
  setShadowFocus(position: Vector3): void
  /** Refresh cascade bounds for the current scene camera before rendering. */
  prepareShadows(camera: Camera): void
  /** Aimable pivots of a ship turret (ids from fleet.ts): set yaw.rotation.y / pitch.rotation.x. */
  getShipTurret(shipId: string, turretId: string): TurretHandle | null
  /**
   * Ship damage from each snapshot (`Snapshot.ships`, `now` = snapshot room time): fires/smoke at
   * hit points, scorch, knocked-out turrets, list/settle, sinking. Also forwards to geography
   * setShipStates so sunk ships stop being ground/collision on the client.
   */
  applyShipStates(ships: readonly ShipState[] | undefined, now?: number): void
  /** Persistent island craters (`Snapshot.craters` / crater events); visual only. */
  addCraters(craters: readonly Crater[] | undefined): void
  dispose(): void
}

export type { TurretHandle }

/** Extra diagnostics for dev tools / preview pages. */
export interface WorldViewDebug extends WorldView {
  stats(): StreamerStats & { shoreProgress: number }
  streamer: TerrainStreamer
  strikeLightning(): void
}

let activeView: WorldView | null = null

/** Module-level convenience: focus the active world's solar shadow map. */
export function setShadowFocus(position: Vector3) {
  activeView?.setShadowFocus(position)
}

/** Module-level convenience: aimable pivots of a ship turret in the active world. */
export function getShipTurret(shipId: string, turretId: string): TurretHandle | null {
  return activeView?.getShipTurret(shipId, turretId) ?? null
}

/** Current lightning flash of the active world (0..1). */
/** Module-level convenience: apply ship damage states to the active world. */
export function applyShipStates(ships: readonly ShipState[] | undefined, now?: number) {
  activeView?.applyShipStates(ships, now)
}

/** Module-level convenience: add island craters to the active world. */
export function addCraters(craters: readonly Crater[] | undefined) {
  activeView?.addCraters(craters)
}

export function lightningIntensity(): number {
  return activeView?.lightning ?? 0
}

/** Small equirect HDR environment: dark zenith, bright misty horizon band toward the cloud break. */
function stormEnvironment(): Texture {
  const W = 128, H = 64
  const data = new Float32Array(W * H * 4)
  const zen = new Color(SKY_ZENITH), fogC = new Color(FOG_COLOR), brk = new Color(FOG_BREAK_COLOR), sea = new Color("#0d1312")
  const c = new Color()
  for (let j = 0; j < H; j++) {
    const v = 1 - (j + 0.5) / H // 1 = up
    const el = (v - 0.5) * Math.PI
    for (let i = 0; i < W; i++) {
      const az = ((i + 0.5) / W) * Math.PI * 2 - Math.PI
      // Equirect: direction (sin(az)cos(el), sin(el), cos(az)cos(el)) in three's convention.
      const dx = Math.sin(az), dz = Math.cos(az)
      const br = Math.max(0, dx * BREAK_DIRECTION[0] + dz * BREAK_DIRECTION[1]) ** 3
      if (el > 0) {
        c.copy(fogC).lerp(brk, br * 0.8).lerp(zen, Math.min(1, Math.pow(el / 1.2, 0.6)))
        c.multiplyScalar(1 + br * 1.6 * Math.exp(-el * 9))
      } else c.copy(fogC).lerp(sea, Math.min(1, -el * 4))
      const o = (j * W + i) * 4
      data[o] = c.r; data[o + 1] = c.g; data[o + 2] = c.b; data[o + 3] = 1
    }
  }
  const tex = new DataTexture(data, W, H, RGBAFormat, FloatType)
  tex.mapping = EquirectangularReflectionMapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

export function createWorldView(renderer: WebGPURenderer, scene: Scene, quality: Quality): WorldView {
  let settings: WorldQualitySettings = WORLD_QUALITY[quality]
  const root = new Group()
  root.name = "World"

  const sceneNodes = scene as Scene & { fogNode?: unknown }
  const previous = { fog: scene.fog, fogNode: sceneNodes.fogNode, background: scene.background, environment: scene.environment, environmentIntensity: scene.environmentIntensity }
  const daylight = createDaylight(scene, quality)
  let roomTime = 0
  // Lightning: a cold light from the strike direction, driven by the flash envelope.
  const flashLight = new DirectionalLight(LIGHTNING_COLOR, 0)
  root.add(daylight.root, flashLight, flashLight.target)

  // Storm fog for every node material, and a storm environment for wet reflections.
  scene.fog = null
  sceneNodes.fogNode = stormFogNode()
  scene.background = STORM.fogColor.value.clone()
  const environment = stormEnvironment()
  scene.environment = environment
  // Let the aircraft pick up the same wet storm reflections (if the aircraft module supports it).
  ;(aircraftModule as { setAircraftEnvironment?: (t: Texture) => void }).setAircraftEnvironment?.(environment)

  const terrainMaterial = new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 })
  terrainMaterial.name = "World · wet terrain"
  const trees = createTreeResources()
  const water = createWater(settings)
  const sky = createSky()
  const lightning = createLightning()
  const fleet = createFleet()
  let clouds = createCloudLayers(settings.cloudLayers, settings.oceanDetail >= 2 ? 5 : 4, renderer.reversedDepthBuffer)
  let rain = createParticles({ count: settings.rain, box: 110, fall: 24, brightness: 0.05, width: 0.012 })
  let spray = createParticles({ count: Math.max(1, settings.spray), box: 160, fall: 0, brightness: 0.05, width: 0.05, spray: true })
  spray.setVisibility(settings.spray > 0 ? 1 : 0)
  const streamer = new TerrainStreamer(settings, terrainMaterial, trees, (z0, _z1, rows) => water.writeRows(z0, rows))
  const craters = createCraters(terrainMaterial)
  streamer.onTreeMesh = (mesh, added) => added ? craters.trackTrees(mesh) : craters.untrackTrees(mesh)

  root.add(sky.mesh, water.mesh, streamer.terrainRoot, streamer.treeRoot, fleet.root, clouds.group, lightning.mesh, rain.mesh, spray.mesh)

  let shadowFocused = false
  const lastCam = new Vector3(Number.NaN, 0, 0)
  const camVel = new Vector3(), tmpVel = new Vector3()

  const view: WorldViewDebug = {
    root,
    far: settings.far,
    get lightning() { return lightning.value },
    onLightning: cb => lightning.onStrike(cb),
    lightningSource: () => lightning.age < 30 && lightning.age >= 0 && Number.isFinite(lightning.age)
      ? { intensity: Math.max(0.25, 1 - lightning.age / 30), position: lightning.position, age: lightning.age } : null,
    environment,
    update(cameraPosition, dt, time) {
      const step = Math.max(0, Math.min(dt, 0.5))
      // Camera velocity (smoothed) orients the rain streaks.
      if (Number.isFinite(lastCam.x) && step > 0) {
        tmpVel.subVectors(cameraPosition, lastCam).divideScalar(step)
        if (tmpVel.lengthSq() > 600 * 600) tmpVel.set(0, 0, 0) // teleport
        camVel.lerp(tmpVel, Math.min(1, step * 10))
      }
      lastCam.copy(cameraPosition)
      rain.setCameraVelocity(camVel)
      spray.setCameraVelocity(camVel)
      if (settings.spray > 0) spray.setVisibility(Math.max(0, Math.min(1, (220 - cameraPosition.y) / 160)))

      const flash = lightning.update(roomTime, cameraPosition)
      flashLight.intensity = flash * 2.2
      flashLight.position.copy(cameraPosition).addScaledVector(lightning.direction, 1000)
      flashLight.target.position.copy(cameraPosition)
      flashLight.target.updateMatrixWorld()
      daylight.flash(flash)
      // Spawn/menu/death cameras also need a nearby shadow volume.
      if (!shadowFocused) daylight.setFocus(cameraPosition)
      shadowFocused = false

      sky.update(cameraPosition, time)
      clouds.update(cameraPosition)
      water.update(time, cameraPosition)
      fleet.update(cameraPosition, step)
      streamer.update(cameraPosition, step)
    },
    prepareShadows(camera) { daylight.prepareShadows(camera) },
    setTimeOfDay(seconds) { roomTime = seconds; daylight.setTime(seconds) },
    setShadowFocus(position) { daylight.setFocus(position); shadowFocused = true },
    setQuality(q) {
      daylight.setQuality(q)
      if (WORLD_QUALITY[q] === settings) return
      settings = WORLD_QUALITY[q]
      view.far = settings.far
      streamer.setSettings(settings)
      water.setQuality(settings)
      root.remove(clouds.group, rain.mesh, spray.mesh)
      clouds.dispose(); rain.dispose(); spray.dispose()
      clouds = createCloudLayers(settings.cloudLayers, settings.oceanDetail >= 2 ? 5 : 4, renderer.reversedDepthBuffer)
      rain = createParticles({ count: settings.rain, box: 110, fall: 24, brightness: 0.05, width: 0.012 })
      spray = createParticles({ count: Math.max(1, settings.spray), box: 160, fall: 0, brightness: 0.05, width: 0.05, spray: true })
      spray.setVisibility(settings.spray > 0 ? 1 : 0)
      root.add(clouds.group, rain.mesh, spray.mesh)
    },
    setHighlightTeam(_team) {},
    getShipTurret: (shipId, turretId) => fleet.getShipTurret(shipId, turretId),
    applyShipStates(ships, now) {
      fleet.applyStates(ships, now)
      setShipStates(ships, now)
    },
    addCraters: list => craters.add(list),
    ready: () => streamer.ready(),
    stats: () => ({ ...streamer.stats, shoreProgress: streamer.shoreProgress }),
    streamer,
    strikeLightning: () => lightning.strike(lastCam),
    dispose() {
      if (activeView === view) activeView = null
      streamer.dispose()
      water.dispose(); sky.dispose(); clouds.dispose(); lightning.dispose(); rain.dispose(); spray.dispose(); fleet.dispose(); daylight.dispose()
      trees.dispose(); terrainMaterial.dispose(); environment.dispose()
      STORM.flash.value = 0
      root.removeFromParent()
      scene.fog = previous.fog
      sceneNodes.fogNode = previous.fogNode
      scene.background = previous.background
      scene.environment = previous.environment
      scene.environmentIntensity = previous.environmentIntensity
    },
  }
  activeView = view
  return view
}
