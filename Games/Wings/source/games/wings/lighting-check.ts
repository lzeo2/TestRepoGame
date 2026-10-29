// CPU/render-state regression of the actual lighting code. No GPU or network.
import './time-of-day-check'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { installModelFixture } from './node-model-fixture'
import { VEHICLE_KINDS } from './src/sim/vehicles'
import { Color, PerspectiveCamera, Scene, SpotLight, Vector3 } from 'three'
import { createDaylight } from './src/render/world/daylight'
import { STORM } from './src/render/world/atmosphere'
import { SUN_DIRECTION } from './src/render/world/settings'
import { createLightning, createSky, createCloudLayers } from './src/render/world/sky'
import { createAircraftView, preloadAircraft, aircraftReady, setAircraftGroundQuery } from './src/render/aircraft'
import { createPaintMaterial, createGlassMaterial } from './src/render/toon'
import { createFlightState } from './src/sim/flight'
import { createWeapons } from './src/sim/combat'
import { type VehicleEntity } from './src/sim/types'

const scene = new Scene()
scene.background = new Color()
const lighting = createDaylight(scene, 'balanced')
scene.add(lighting.root)
const sky = createSky(), clouds = createCloudLayers(1)
assert(sky.mesh.material.colorNode && clouds.group.children.length === 1)
const paint = createPaintMaterial({ color: '#556677' }), glass = createGlassMaterial()
const focus = new Vector3(1000, 80, -500)
lighting.setFocus(focus)
const atHour = (hour: number) => (hour - 9) / 24 * 600
const close = (a: number, b: number, epsilon = 1e-8) => assert(Math.abs(a - b) < epsilon, `${a} != ${b}`)
const snapshot = () => ({
  sun: SUN_DIRECTION.toArray(), key: lighting.key.position.toArray(), intensity: lighting.key.intensity,
  ambient: lighting.hemi.intensity, zenith: STORM.zenith.value.toArray(), fog: STORM.fogColor.value.toArray(),
  fogBase: STORM.fogBase.value, fogSea: STORM.fogSea.value, env: paint.envMapIntensity,
})
lighting.setTime(atHour(12))
const noon = snapshot()
assert(lighting.key.castShadow)
assert(lighting.key.shadow.camera.left < 0 && lighting.key.shadow.camera.far >= 4800)
assert(lighting.key.target.position.equals(focus))
assert(new Vector3().subVectors(lighting.key.position, focus).normalize().distanceTo(SUN_DIRECTION) < 1e-8)
close(paint.envMapIntensity, 0.9)
close(glass.envMapIntensity, 1.6)
lighting.setTime(atHour(0))
const midnight = snapshot()
assert.equal(midnight.intensity, 0)
assert(midnight.ambient < noon.ambient / 10)
assert(midnight.env < noon.env / 10)
assert.notDeepEqual(midnight.zenith, noon.zenith)
assert.notDeepEqual(midnight.fog, noon.fog)
// At 1 km, even above sea mist the night transmittance is far lower, on Low too.
assert(Math.exp(-midnight.fogBase * 1000) < Math.exp(-noon.fogBase * 1000) * 0.6)
lighting.setQuality('low')
assert(!lighting.key.castShadow)
assert.equal(STORM.fogBase.value, midnight.fogBase)
lighting.setQuality('high')
assert(lighting.key.castShadow)
lighting.setTime(atHour(8))
assert(lighting.key.position.x > focus.x)
lighting.setTime(atHour(16))
assert(lighting.key.position.x < focus.x)
lighting.setTime(atHour(12) + 600)
assert.deepEqual(snapshot(), noon)
lighting.flash(1)
close(lighting.hemi.intensity, noon.ambient * 1.5)
lighting.flash(0)
close(lighting.hemi.intensity, noon.ambient)

const cameraPosition = new Vector3(20, 100, 30)
const stormA = createLightning(), stormB = createLightning()
let notifications = 0
stormA.onStrike(() => notifications++)
for (const time of [0, 8, 8, 8.1, 8.4, 27.2, 27.2, 600, 8.1, 0]) {
  const fresh = createLightning()
  const direct = fresh.update(time, cameraPosition)
  close(stormA.update(time, cameraPosition), direct)
  close(stormB.update(time, cameraPosition), direct)
  if (fresh.mesh.visible) assert.deepEqual(
    Array.from(stormA.mesh.geometry.attributes.position.array),
    Array.from(fresh.mesh.geometry.attributes.position.array),
  )
  fresh.dispose()
}
assert.equal(notifications, 2, 'no duplicated strikes on repeated sample or rewind')
stormA.dispose(); stormB.dispose()

// Same registered-model/PNG-metadata fixture as Astra, never native pixel evidence.
const restoreModels = installModelFixture(resolve(process.argv[2] ?? 'Games/Wings/models'))
try {
  await preloadAircraft('http://wings.invalid/')
  assert(VEHICLE_KINDS.every(aircraftReady), 'every registered aircraft must actually preload')
  setAircraftGroundQuery(() => 0)
  const camera = new PerspectiveCamera()
  camera.position.set(0, 50, 60); camera.updateMatrixWorld()
  for (const kind of ['f15', 'apache'] as const) {
    const view = createAircraftView(kind, 0, 'low')
    assert(view.ready)
    const vehicle = {
      id: 'lighting-test', kind, team: 0, alive: true, hp: 450, maxHp: 450,
      seats: ['pilot', null], aim: [null, null], weapons: createWeapons(kind),
      flight: createFlightState(kind, { position: [20, 30, 40], yaw: 0, onGround: false }),
      flaresReadyAt: 0, flareCount: 0, abilityReadyAt: 0, spottedUntil: 0, lastDamagedBy: null,
    } as VehicleEntity
    lighting.setTime(atHour(0))
    view.update(vehicle, [], 1 / 60, camera)
    assert(!view.root.getObjectByName('landing_light'), 'remote/thumbnail has no light')
    view.setLocal(true)
    view.update(vehicle, [], 1 / 60, camera)
    const lamp = view.root.getObjectByName('landing_light') as SpotLight
    assert(lamp?.isSpotLight && lamp.visible && lamp.intensity > 100000)
    assert.equal(lamp.castShadow, false)
    assert(lamp.distance >= 400 && lamp.angle > 0 && lamp.decay === 2)
    view.root.updateMatrixWorld(true)
    const a = lamp.getWorldPosition(new Vector3()), b = lamp.target.getWorldPosition(new Vector3())
    assert(b.y < a.y && b.z < a.z, 'beam points ahead and down')
    const direction = b.clone().sub(a).normalize()
    vehicle.flight.orientation = [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)]
    view.update(vehicle, [], 1 / 60, camera); view.root.updateMatrixWorld(true)
    const rotated = lamp.target.getWorldPosition(new Vector3()).sub(lamp.getWorldPosition(new Vector3())).normalize()
    assert(Math.abs(rotated.x - direction.z) < 1e-8 && Math.abs(rotated.z) < 1e-8, 'beam follows aircraft yaw')
    assert(!view.root.getObjectByName('ground_shadow')!.visible)
    lighting.setTime(atHour(8))
    view.update(vehicle, [], 1 / 60, camera)
    const shadow = view.root.getObjectByName('ground_shadow')!
    assert(shadow.visible)
    view.root.updateMatrixWorld(true)
    assert(shadow.getWorldPosition(new Vector3()).x < view.root.position.x)
    lighting.setTime(atHour(16)); view.update(vehicle, [], 1 / 60, camera); view.root.updateMatrixWorld(true)
    assert(shadow.getWorldPosition(new Vector3()).x > view.root.position.x)
    lighting.setTime(atHour(12)); view.update(vehicle, [], 1 / 60, camera)
    assert(!lamp.parent && !lamp.visible && lamp.intensity === 0, 'day removes night light')
    lighting.setTime(atHour(0)); view.update(vehicle, [], 1 / 60, camera)
    assert(lamp.parent)
    vehicle.alive = false; view.update(vehicle, [], 1 / 60, camera)
    assert(!lamp.parent && lamp.intensity === 0, 'death removes light')
    vehicle.alive = true; view.update(vehicle, [], 1 / 60, camera)
    view.setLocal(false)
    assert(!lamp.parent && lamp.intensity === 0, 'seat leave removes light')
    view.setLocal(true); view.update(vehicle, [], 1 / 60, camera)
    view.dispose()
    assert(!lamp.parent && !lamp.target.parent && !lamp.visible, 'dispose removes light and target')
  }
} finally {
  restoreModels()
  setAircraftGroundQuery(() => 0)
  lighting.setTime(0)
  lighting.dispose(); sky.dispose(); clouds.dispose(); paint.dispose(); glass.dispose()
}
console.log('PASS: real solar/ambient lights, sky/fog/environment uniforms, all-quality visibility, focused shadow direction, deterministic storm, converted F-15/Apache landing/search lights and lifecycle. CPU/render-state only; no GPU acceptance.')
