// Source-built regression: actual loopback/simulation and render descriptors, no GPU/world rendering.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { Box3, PerspectiveCamera, Vector3, Color, Matrix4, Quaternion } from 'three'
import { setTimeout as delay } from 'node:timers/promises'
import { CameraRig } from './src/render/camera'
import { CONFIG, preloadAircraft, aircraftReady, aircraftStats, createAircraftView } from './src/render/aircraft'
import { createLoopbackRoom } from './src/sim/loopback'
import { syncAircraftInput } from './src/ui/aircraft-input'
import { TICK_DT, type VehicleKind, type Vec3, type VehicleEntity, type GameEvent, type SeatInput } from './src/sim/types'
import { muzzlePosition, isHiddenStealth, stepCombat, createCombatState, createWeapons, applySeatInput } from './src/sim/combat'
import { createFlightState } from './src/sim/flight'
import { VEHICLES, VEHICLE_KINDS, WEAPONS } from './src/sim/vehicles'
import { DEFAULT_ROOM_CONFIG, type ServerMessage } from './src/sim/protocol'

const models = resolve(process.argv[2] ?? 'Games/Wings/models')
assert.deepEqual(VEHICLE_KINDS, ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'])
assert.deepEqual(VEHICLE_KINDS.slice(0, 5).map(k => [VEHICLES[k].cruise, VEHICLES[k].boost]), [[135,185],[75,98],[105,135],[190,260],[150,180]])
assert.deepEqual(VEHICLE_KINDS.slice(0, 5).map(k => VEHICLES[k].seatWeapons), [
  [['cannon20','aim9'],['tvmissile',null]], [['rockets',null],['chaingun30','hellfire']],
  [['gau8','rockets'],['maverick',null]], [[null,null],['aim47','radarpulse']], [['bomb',null],['bomb',null]],
])
assert(VEHICLE_KINDS.slice(0, 5).every(k => VEHICLES[k].hardpoints === undefined))
assert.deepEqual(VEHICLES.f15.seatWeapons, [['cannon20','aim9'],['maverick',null]])
assert.deepEqual(VEHICLES.f35.seatWeapons, [['cannon20','tvmissile'],['tvmissile',null]])
assert.equal(VEHICLES.f35.stealth, true)
assert.equal(CONFIG.bomber.doors?.seat, 1)
assert.equal(CONFIG.bomber.doors?.weapons, undefined, 'original bomber keeps its either-slot seat trigger')
const hashes = ['5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf', 'ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197']
function nodePosition(gltf: any, name: string): Vector3 {
  let i = gltf.nodes.findIndex((n: any) => n.name === name)
  assert(i >= 0, name)
  const matrix = new Matrix4()
  while (i >= 0) {
    const n = gltf.nodes[i]
    const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation ?? [0,0,0])), new Quaternion(...(n.rotation ?? [0,0,0,1])), new Vector3(...(n.scale ?? [1,1,1])))
    matrix.premultiply(local)
    i = gltf.nodes.findIndex((p: any) => p.children?.includes(i))
  }
  return new Vector3().setFromMatrixPosition(matrix)
}
const results = []
for (const [index, kind] of (['f15', 'f35'] as const).entries()) {
  const messages: ServerMessage[] = []
  const config = { ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false }
  const room = createLoopbackRoom(config, 'Astra check', { onMessage: m => messages.push(m) }, { manual: true })
  await Promise.resolve()
  assert.equal(room.engine.config.listed, false)
  assert.equal(room.engine.config.bots, 0)
  room.send({ type: 'spawn', kind: '__proto__' as VehicleKind })
  await Promise.resolve()
  assert.equal(room.engine.vehicles.length, 0)
  assert(messages.some(m => m.type === 'error' && m.message === 'Unknown aircraft kind.'))
  room.send({ type: 'spawn', kind })
  const vehicle = room.engine.vehicles.find(v => v.seats[0] === room.playerId)!
  assert.equal(vehicle.kind, kind)
  assert.equal(vehicle.flight.kind, kind)
  const start = [...vehicle.flight.position]
  let beforeTurn: number[] = []
  for (let i = 1; i <= 900; i++) {
    if (i === 781) beforeTurn = [...vehicle.flight.orientation]
    room.send({ type: 'input', seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: i > 780 ? 0.15 : 0, pitch: i > 120 ? 0.35 : 0, boost: true, brake: false } })
    room.step(TICK_DT)
  }
  await Promise.resolve()
  assert(vehicle.alive && !vehicle.flight.onGround)
  assert(vehicle.flight.position[1] > start[1] + 50)
  assert(vehicle.flight.position.every(Number.isFinite))
  assert(vehicle.flight.orientation.every(Number.isFinite))
  assert(Math.hypot(...vehicle.flight.orientation.map((v, i) => v - beforeTurn[i])) > 0.01)
  assert(messages.some(m => m.type === 'snapshot' && m.vehicles.some(v => v.kind === kind)))
  const desc = CONFIG[kind]
  assert.equal(VEHICLES[kind].model, `models/${desc.file}.glb`)
  const bytes = readFileSync(resolve(models, `${desc.file}.glb`))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[index])
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  const names = gltf.nodes.map((n: { name: string }) => n.name)
  const hp = VEHICLES[kind].hardpoints!
  assert(hp, 'model-derived combat hardpoints required')
  const expectedGun = nodePosition(gltf, 'gun_muzzle')
  assert(new Vector3(...hp.gun).distanceTo(expectedGun) < 1e-6)
  const originalPosition = [...vehicle.flight.position] as Vec3
  const originalOrientation = [...vehicle.flight.orientation] as [number,number,number,number]
  vehicle.flight.position = [17, 200, -31]
  const out: Vec3 = [0,0,0]
  for (const orientation of [[0,0,0,1], [0,Math.SQRT1_2,0,Math.SQRT1_2]] as [number,number,number,number][]) {
    vehicle.flight.orientation = orientation
    const expectedWorld = (p: Vector3) => p.clone().applyQuaternion(new Quaternion(...orientation)).add(new Vector3(...vehicle.flight.position))
    assert(new Vector3(...muzzlePosition(vehicle, 0, 'cannon20', out)).distanceTo(expectedWorld(expectedGun)) < 1e-6)
    for (const seat of [0,1] as const) for (const rail of [0,1] as const) {
      const point = nodePosition(gltf, `missile_${rail ? 'R' : 'L'}${seat ? 1 : 2}`)
      assert(new Vector3(...hp.missiles[seat][rail]).distanceTo(point) < 1e-6)
      const id = VEHICLES[kind].seatWeapons[seat][seat ? 0 : 1]!
      assert(new Vector3(...muzzlePosition(vehicle, seat, id, out, rail)).distanceTo(expectedWorld(point)) < 1e-6)
    }
  }
  vehicle.flight.position = originalPosition
  vehicle.flight.orientation = originalOrientation
  vehicle.spottedUntil = 0
  assert.equal(isHiddenStealth(vehicle, 1), kind === 'f35')
  vehicle.spottedUntil = 2
  assert.equal(isHiddenStealth(vehicle, 1), false)
  for (const name of [...desc.pivots, ...desc.anchors.map(a => a.node)]) assert(names.includes(name), name)
  assert.deepEqual(desc.spinners, [])
  assert.deepEqual(desc.stores.map(g => g.weapons), [[[0, 1]], [[1, 0]]])
  assert.equal(desc.stores.flatMap(g => g.order).length, 4)
  for (const g of desc.stores) for (const name of g.order) assert(desc.pivots.includes(name) && names.includes(name))
  assert.equal(desc.afterburners.length, kind === 'f15' ? 2 : 1)
  for (const ab of desc.afterburners) {
    assert(desc.pivots.includes(ab.name) && names.includes(ab.name))
    assert.deepEqual([ab.axis, ab.cone?.dir, ab.cone?.sign], ['z', 'z', 1])
    assert(ab.cone!.length > 0)
  }
  if (kind === 'f35') {
    assert.equal(desc.doors?.seat, 1)
    assert.deepEqual(desc.doors?.weapons, [[0, 1], [1, 0]])
    for (const [name] of desc.doors!.names) assert(desc.pivots.includes(name) && names.includes(name))
    for (const side of ['L', 'R']) {
      const bay = gltf.nodes.find((n: any) => n.name === `weapon_bay_${side}`)
      for (const slot of [1, 2]) assert(bay.children.includes(names.indexOf(`missile_${side}${slot}`)))
    }
  }
  assert(!names.some((n: string) => /^(gear|propeller|spinner)$/.test(n)))
  assert.deepEqual(desc.anchors.map(a => a.node).sort(), names.filter((n: string) => n === 'gun_muzzle' || /^weapon_|^exhaust(?:_[LR])?$/.test(n)).sort())
  assert.equal(desc.anchors.find(a => a.key === 'gun')?.node, 'gun_muzzle')
  for (const field of ['textures', 'images', 'skins', 'animations']) assert.equal(gltf[field]?.length ?? 0, 0)
  assert(gltf.buffers.every((b: { uri?: string }) => !b.uri))
  for (const id of gltf.scenes[gltf.scene].nodes) {
    const root = gltf.nodes[id]
    assert.deepEqual(root.translation ?? [0,0,0], [0,0,0])
    assert.deepEqual(root.rotation ?? [0,0,0,1], [0,0,0,1])
    assert.deepEqual(root.scale ?? [1,1,1], [1,1,1])
    assert.deepEqual(root.matrix ?? [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1], [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])
  }
  const primitives = gltf.meshes.flatMap((m: any) => m.primitives)
  assert(primitives.length >= 40)
  const triangles = primitives.reduce((sum: number, p: any) => {
    assert.equal(p.mode ?? 4, 4)
    for (const attr of ['POSITION', 'NORMAL', 'TEXCOORD_0']) assert(Number.isInteger(p.attributes[attr]))
    return sum + gltf.accessors[p.indices].count / 3
  }, 0)
  assert(triangles >= (index ? 35000 : 40000) && triangles <= (index ? 50000 : 55000))
  assert(bytes.length < 1200000)
  assert.equal(new Set(primitives.map((p: any) => p.material)).size, gltf.materials.length)
  assert(gltf.materials.some((m: any) => m.alphaMode === 'BLEND' && m.pbrMetallicRoughness.baseColorFactor[3] > 0 && m.pbrMetallicRoughness.baseColorFactor[3] < 1))
  const rig = new CameraRig(new PerspectiveCamera())
  rig.cockpitBody(TICK_DT, kind, [0, 100, 0], [0, 0, 0, 1], 0, 0)
  assert(rig.pos.toArray().every(Number.isFinite))
  const cockpit = gltf.nodes.find((n: any) => n.name === 'cockpit').translation
  assert(rig.quat.toArray().every(Number.isFinite))
  assert(rig.pos.distanceTo(new Vector3(cockpit[0], 100 + cockpit[1], cockpit[2])) < 1e-6)
  results.push({ kind, start, end: vehicle.flight.position, speed: Math.hypot(...vehicle.flight.velocity), cockpit: rig.pos.toArray(), pitchQuaternionX: rig.quat.x, bytes: bytes.length })
  room.close()
}
assert.notEqual(results[0].speed, results[1].speed)
assert.notEqual(results[0].pitchQuaternionX, results[1].pitchQuaternionX)
console.log(JSON.stringify(results))
// Node-only local-fetch adapter: actual exported loader/template/view, no GPU or network.
// Relative loader URLs become a reserved local origin, then only existing model files are read.
const NativeRequest = globalThis.Request
const nativeFetch = globalThis.fetch
const nativeProgressEvent = globalThis.ProgressEvent
class LocalRequest extends NativeRequest {
  constructor(input: any, init?: any) {
    super(typeof input === 'string' ? new URL(input, 'http://wings.invalid').href : input, init)
  }
}
globalThis.Request = LocalRequest
globalThis.ProgressEvent = class extends Event {
  constructor(type: string, init: any) { super(type); Object.assign(this, init) }
} as any
globalThis.fetch = async (input: any) => {
  const url = new URL(typeof input === 'string' ? input : input.url)
  assert.equal(url.origin, 'http://wings.invalid')
  assert(/^\/models\/[a-z0-9-]+\.glb$/.test(url.pathname), url.pathname)
  const bytes = readFileSync(resolve(models, url.pathname.split('/').pop()!))
  return new Response(bytes, { headers: { 'Content-Length': String(bytes.length) } })
}
const converted = []
const combatFixtures: unknown[] = []
// Construct deterministic high-altitude combat entities, not native-game state grants.
// Flight positions stay fixed during acquisition; real seat input, lock, fire and
// missile stepping run unchanged. Fleet actors are absent from this isolated fixture.
function combatEntity(kind: VehicleKind, id: string, team: 0 | 1, position: Vec3): VehicleEntity {
  return {
    id, kind, team, flight: createFlightState(kind, { position, yaw: 0, onGround: false }),
    hp: VEHICLES[kind].maxHp, maxHp: VEHICLES[kind].maxHp,
    seats: [`${id}-pilot`, `${id}-officer`], aim: [null, null], weapons: createWeapons(kind),
    flaresReadyAt: 0, flareCount: VEHICLES[kind].flares, abilityReadyAt: 0,
    spottedUntil: 0, lastDamagedBy: null, alive: true, spawnedAt: 0,
  }
}
try {
  // Identical sequential cold-template fixture, selectable references only. Single samples,
  // including file read, GLTF parse, conversion, view setup and event-loop wait, not GPU timing.
  for (const kind of ['fighter', 'blackbird', 'f15', 'f35'] as const) {
    assert.equal(aircraftReady(kind), false)
    const start = performance.now()
    const view = createAircraftView(kind, 0, 'low')
    const deadline = start + 20000
    while (!view.ready && performance.now() < deadline) await delay(1)
    assert(view.ready && aircraftReady(kind), `${kind}: real template failed to load`)
    const loadConversionViewMs = performance.now() - start
    const stats = aircraftStats(kind)!
    const model = view.root.getObjectByName('model')!
    assert(model)
    const batches = model.children.map((mesh: any) => ({ role: mesh.name, triangles: mesh.geometry.index.count / 3, metalness: mesh.material.metalness, opacity: mesh.material.opacity }))
    assert.equal(batches.reduce((s, b) => s + b.triangles, 0), stats.triangles)
    const bounds = new Box3().setFromObject(model).getSize(new Vector3()).toArray()
    if (kind === 'f15' || kind === 'f35') {
      const bytes = readFileSync(resolve(models, `${kind}.glb`))
      const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
      const primitives = gltf.meshes.flatMap((m: any) => m.primitives)
      const sourceTriangles = primitives.reduce((s: number, p: any) => s + gltf.accessors[p.indices].count / 3, 0)
      assert(stats.triangles > sourceTriangles, 'existing procedural exhaust cones must be present')
      assert.equal(stats.sourceMeshes, primitives.length)
      assert.equal(stats.sourceMaterials, gltf.materials.length)
      assert.equal(stats.drawCalls, 6)
      assert(batches.some(b => b.role === 'toon' && b.metalness === 0.05))
      assert(batches.some(b => b.role === 'toon' && b.metalness === 0.55))
      assert(batches.some(b => b.role === 'livery'))
      assert(batches.some(b => b.role === 'glass' && b.opacity > 0 && b.opacity < 1))
      assert(bounds[2] >= CONFIG[kind].placeholder.length - 1e-5 && bounds[2] < CONFIG[kind].placeholder.length + 3)
      assert(Math.abs(bounds[0] - CONFIG[kind].placeholder.span) < 1e-5)
      for (const a of CONFIG[kind].anchors) {
        const anchor = view.anchors.get(a.key)!
        assert(anchor.matrix.elements.every(Number.isFinite))
        const position = new Vector3().setFromMatrixPosition(anchor.matrix)
        assert(position.distanceTo(new Vector3(...gltf.nodes.find((n: any) => n.name === a.node).translation)) < 1e-6)
      }
      // Render-state fixtures exercise the actual converted rigid skeleton and materials.
      // They do not claim native input, rendered pixels or combat acceptance.
      const room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false }, 'Render state check', { onMessage() {} }, { manual: true })
      await Promise.resolve()
      room.send({ type: 'spawn', kind })
      const vehicle = room.engine.vehicles.find(v => v.seats[0] === room.playerId)!
      const camera = new PerspectiveCamera()
      camera.position.fromArray(vehicle.flight.position)
      camera.updateMatrixWorld(true)
      view.setLocal(true)
      const mesh = model.children.find((o: any) => o.isSkinnedMesh) as any
      const bone = (name: string) => {
        const b = mesh.skeleton.bones.find((b: any) => b.name === name)
        assert(b, `converted bone ${name}`)
        const bi = mesh.skeleton.bones.indexOf(b)
        assert(model.children.some((o: any) => {
          const indices = o.geometry?.getAttribute('skinIndex')
          if (!indices) return false
          for (let i = 0; i < indices.count; i++) if (indices.getX(i) === bi) return true
          return false
        }), `${name}: no converted geometry attached to pivot`)
        return b
      }
      const stepView = () => { view.update(vehicle, [], 1 / 60, camera); view.root.updateMatrixWorld(true) }
      stepView()
      for (const group of CONFIG[kind].stores) {
        const [seat, slot] = group.weapons[0]
        const shooter = combatEntity(kind, `${kind}-seat-${seat}`, 0, [0, 5000, 0])
        const target = combatEntity('fighter', `${kind}-hostile`, 1, [0, 5000, -600])
        const actors = [shooter, target]
        const combat = createCombatState()
        combat.ships = {}; combat.turrets = []
        const events: GameEvent[] = []
        const id = VEHICLES[kind].seatWeapons[seat][slot]!
        const spec = WEAPONS[id]
        const input: SeatInput = { aim: [0, 0, -1], firePrimary: false, fireSecondary: false, flares: false, ability: false }
        const runtime = shooter.weapons[seat][slot]
        const acquireTicks = Math.ceil(spec.lockTime! / TICK_DT)
        let now = 100
        for (let tick = 0; tick < acquireTicks; tick++) {
          applySeatInput(combat, shooter, seat, input, actors, now, events)
          assert.equal(combat.missiles.length, 0, 'acquisition alone must not fire')
          if (tick < acquireTicks - 1) assert(runtime.lock < 1, 'lock completed before configured acquisition time')
          stepCombat(combat, actors, TICK_DT, now, events)
          now += TICK_DT
        }
        assert.equal(runtime.lockTarget, target.id)
        assert.equal(runtime.lock, 1)
        assert(events.some(e => e.type === 'lock' && e.vehicle === shooter.id && e.target === target.id && e.locked))
        assert.equal(runtime.ammo, 2)
        camera.position.fromArray(shooter.flight.position); camera.updateMatrixWorld(true)
        view.update(shooter, [], TICK_DT, camera)
        for (const name of group.order) assert(bone(name).scale.x > 0.9)
        const expectedMuzzle: Vec3 = [0, 0, 0]
        muzzlePosition(shooter, seat, id, expectedMuzzle, 0)
        input.firePrimary = slot === 0; input.fireSecondary = slot === 1
        applySeatInput(combat, shooter, seat, input, actors, now, events)
        assert.equal(runtime.ammo, 1, 'real missile firing must consume exactly one own round')
        assert.equal(combat.missiles.length, 1)
        const missile = combat.missiles[0]
        assert.equal(missile.owner, shooter.seats[seat])
        assert.equal(missile.vehicle, shooter.id)
        assert.equal(missile.team, shooter.team)
        assert.equal(missile.seat, seat)
        assert.equal(missile.weapon, id)
        assert.equal(missile.target, target.id)
        assert.equal(missile.age, -TICK_DT)
        for (let axis = 0; axis < 3; axis++) {
          const forward = axis === 2 ? -1 : 0
          assert(Math.abs(missile.velocity[axis] - shooter.flight.velocity[axis] - forward * spec.speed) < 1e-6)
          assert(Math.abs(missile.position[axis] + missile.velocity[axis] * TICK_DT - expectedMuzzle[axis]) < 1e-6, 'one-tick-back missile origin must resolve to model launch point')
        }
        assert(events.some(e => e.type === 'fire' && e.vehicle === shooter.id && e.seat === seat && e.weapon === id && e.hardpoint === 0))
        view.setFiring(seat, slot, true) // Same client render hint as the seat trigger; not native input proof.
        const closedDoors = kind === 'f35' ? CONFIG.f35.doors!.names.map(([name]) => bone(name).quaternion.clone()) : []
        for (let tick = 0; tick < 60; tick++) view.update(shooter, [], TICK_DT, camera)
        assert(bone(group.order[0]).scale.x < 0.001)
        assert(bone(group.order[1]).scale.x > 0.9)
        for (const other of CONFIG[kind].stores.filter(g => g !== group)) for (const name of other.order) assert(bone(name).scale.x > 0.9)
        if (kind === 'f35') CONFIG.f35.doors!.names.forEach(([name], i) => assert(bone(name).quaternion.angleTo(closedDoors[i]) > 1, 'real missile trigger render hint must open F-35 bay'))
        view.setFiring(seat, slot, false)
        for (let tick = 0; tick < 240; tick++) view.update(shooter, [], TICK_DT, camera)
        if (kind === 'f35') CONFIG.f35.doors!.names.forEach(([name], i) => assert(bone(name).quaternion.angleTo(closedDoors[i]) < 0.001))
        stepCombat(combat, actors, TICK_DT, now, events)
        assert(missile.age >= 0 && missile.position.every(Number.isFinite), 'real missile step must advance a finite trajectory')
        combatFixtures.push({ kind, seat, slot, weapon: id, acquireTicks, target: target.id, owner: missile.owner, ammo: runtime.ammo, modelMuzzle: expectedMuzzle, missilePosition: [...missile.position], hiddenStore: group.order[0], visibleStore: group.order[1] })
      }
      camera.position.fromArray(vehicle.flight.position); camera.updateMatrixWorld(true)
      stepView()
      for (const group of CONFIG[kind].stores) for (const name of group.order) assert(bone(name).scale.x > 0.9)
      for (const group of CONFIG[kind].stores) {
        for (const name of group.order) assert(bone(name).scale.x > 0.9)
        assert.equal(group.weapons.length, 1)
        const [seat, slot] = group.weapons[0]
        const spec = WEAPONS[VEHICLES[kind].seatWeapons[seat][slot]!]
        assert.equal(spec.ammo, group.order.length)
        for (let remaining = spec.ammo - 1; remaining >= 0; remaining--) {
          vehicle.weapons[seat][slot]!.ammo--
          stepView()
          assert.equal(group.order.filter(name => bone(name).scale.x > 0.9).length, remaining, 'one spent round must hide exactly one store')
          group.order.forEach((name, i) => assert.equal(bone(name).scale.x > 0.9, i >= spec.ammo - remaining))
        }
        const regen = createCombatState()
        regen.ships = {}; regen.turrets = [] // Render fixture isolates real ammo regeneration from fleet combat.
        for (let restored = 1; restored <= spec.ammo; restored++) {
          stepCombat(regen, [vehicle], spec.refill / spec.ammo, 100 + restored * spec.refill, [])
          stepView()
          assert.equal(vehicle.weapons[seat][slot]!.ammo, restored)
          assert.equal(group.order.filter(name => bone(name).scale.x > 0.9).length, restored, 'regenerated round must restore one store')
        }
        for (const other of CONFIG[kind].stores.filter(g => g !== group)) for (const name of other.order) assert(bone(name).scale.x > 0.9, `${name}: unrelated slot changed`)
      }
      const flame = model.children.find((o: any) => o.name === 'flame') as any
      const glow = model.children.find((o: any) => o.name === 'afterburner') as any
      assert(flame && glow)
      vehicle.flight.throttle = 0
      view.setBoost(false)
      for (let i = 0; i < 120; i++) stepView()
      assert.equal(flame.visible, false)
      const idleGlow = glow.material.color.r + glow.material.color.g + glow.material.color.b
      const idleScales = CONFIG[kind].afterburners.map(ab => bone(ab.name).scale.z)
      vehicle.flight.throttle = 1
      for (let i = 0; i < 120; i++) stepView()
      assert.equal(flame.visible, true, 'high throttle must show exhaust without boost')
      const throttleGlow = glow.material.color.r + glow.material.color.g + glow.material.color.b
      assert(throttleGlow > idleGlow * 2)
      view.setBoost(true)
      for (let i = 0; i < 120; i++) stepView()
      assert.equal(flame.visible, true)
      assert(glow.material.color.r + glow.material.color.g + glow.material.color.b > idleGlow * 3)
      assert(glow.material.color.r + glow.material.color.g + glow.material.color.b > throttleGlow * 1.5)
      CONFIG[kind].afterburners.forEach((ab, i) => assert(bone(ab.name).scale.z > idleScales[i] * 2))
      if (kind === 'f35') {
        const closed = CONFIG.f35.doors!.names.map(([name]) => bone(name).quaternion.clone())
        // Measure actual converted door vertices in their bone-local frame, not a guessed
        // hinge offset. Angular magnitude alone can hide a cover rotating up through the hull.
        const doorCenters = CONFIG.f35.doors!.names.map(([name]) => {
          const b = bone(name)
          const bi = mesh.skeleton.bones.indexOf(b)
          const center = new Vector3()
          let count = 0
          for (const o of model.children as any[]) {
            const indices = o.geometry?.getAttribute('skinIndex')
            const positions = o.geometry?.getAttribute('position')
            if (!indices || !positions) continue
            for (let i = 0; i < indices.count; i++) {
              if (indices.getX(i) !== bi) continue
              center.add(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.skeleton.boneInverses[bi]))
              count++
            }
          }
          assert(count > 0, `${name}: door surface is missing`)
          center.divideScalar(count)
          return { local: center, closedY: center.clone().applyMatrix4(b.matrixWorld).y }
        })
        view.setFiring(0, 0, true)
        for (let i = 0; i < 120; i++) stepView()
        CONFIG.f35.doors!.names.forEach(([name], i) => assert(bone(name).quaternion.angleTo(closed[i]) < 0.001, 'pilot cannon must not open missile bay'))
        view.setFiring(0, 0, false)
        for (const [seat, slot] of CONFIG.f35.doors!.weapons!) {
          view.setFiring(seat, slot, true)
          for (let i = 0; i < 120; i++) stepView()
          CONFIG.f35.doors!.names.forEach(([name], i) => {
            assert(bone(name).quaternion.angleTo(closed[i]) > 1, `missile slot ${seat}/${slot} must open bay`)
            const openY = doorCenters[i].local.clone().applyMatrix4(bone(name).matrixWorld).y
            assert(openY < doorCenters[i].closedY - 0.05, `${name}: bay cover must swing downward, away from hull`)
          })
          view.setFiring(seat, slot, false)
          for (let i = 0; i < 240; i++) stepView()
          CONFIG.f35.doors!.names.forEach(([name], i) => {
            assert(bone(name).quaternion.angleTo(closed[i]) < 0.001, 'released missile trigger must close bay')
            assert(Math.abs(doorCenters[i].local.clone().applyMatrix4(bone(name).matrixWorld).y - doorCenters[i].closedY) < 0.001, `${name}: closed door surface did not return`)
          })
        }
        // Exercise the same complete-frame bridge the actual controller calls.
        // Converted bone/material observations remain CPU fixtures, not native input proof.
        const triggers = { firePrimary: false, fireSecondary: true }
        const doorsOpen = () => CONFIG.f35.doors!.names.every(([name], i) => bone(name).quaternion.angleTo(closed[i]) > 1)
        const doorsClosed = () => CONFIG.f35.doors!.names.every(([name], i) => bone(name).quaternion.angleTo(closed[i]) < 0.001)
        view.setLocal(true)
        syncAircraftInput(view, 0, triggers, true)
        for (let i = 0; i < 120; i++) stepView()
        assert(doorsOpen(), 'pilot missile hint must open bay')
        triggers.fireSecondary = false
        syncAircraftInput(view, 1, triggers, false)
        for (let i = 0; i < 240; i++) stepView()
        assert(doorsClosed(), 'switch to released officer must clear pilot missile hint')
        triggers.firePrimary = true
        syncAircraftInput(view, 1, triggers, false)
        for (let i = 0; i < 120; i++) stepView()
        assert(doorsOpen(), 'officer missile hint must open bay')
        syncAircraftInput(view, 0, triggers, false)
        for (let i = 0; i < 240; i++) stepView()
        assert(doorsClosed(), 'switch to pilot cannon must clear officer missile hint')
        triggers.firePrimary = false; triggers.fireSecondary = true
        syncAircraftInput(view, 0, triggers, true)
        for (let i = 0; i < 120; i++) stepView()
        syncAircraftInput(view, 0, null, true)
        for (let i = 0; i < 240; i++) stepView()
        assert(doorsClosed(), 'paused/inactive bridge must clear held triggers')
        // A stale explicit false boost must not suppress remote throttle inference.
        vehicle.flight.throttle = 1
        syncAircraftInput(view, 0, triggers, false)
        for (let i = 0; i < 120; i++) stepView()
        assert(doorsOpen())
        const noBoostGlow = glow.material.color.r + glow.material.color.g + glow.material.color.b
        view.setLocal(false)
        for (let i = 0; i < 240; i++) stepView()
        assert(doorsClosed(), 'ownership loss must clear both seats even without another input frame')
        const inferredBoostGlow = glow.material.color.r + glow.material.color.g + glow.material.color.b
        assert(inferredBoostGlow > noBoostGlow * 1.5, 'ownership loss must restore throttle-based boost inference')
        view.setLocal(true)
        syncAircraftInput(view, 0, triggers, false)
        for (let i = 0; i < 120; i++) stepView()
        const pilotFalseGlow = glow.material.color.r + glow.material.color.g + glow.material.color.b
        triggers.fireSecondary = false
        syncAircraftInput(view, 1, triggers, false)
        for (let i = 0; i < 240; i++) stepView()
        assert(doorsClosed())
        assert(glow.material.color.r + glow.material.color.g + glow.material.color.b > pilotFalseGlow * 1.5, 'officer transition must clear pilot boost override')
        syncAircraftInput(view, null, null, false)
      }
      const hull = model.children.find((o: any) => o.name === 'toon' && o.material.metalness === 0.05) as any
      const colors = hull.geometry.getAttribute('color')
      const darkBase = new Color('#232628')
      let hasDarkBase = false
      for (let i = 0; i < colors.count; i++) {
        if (Math.max(Math.abs(colors.getX(i) - darkBase.r), Math.abs(colors.getY(i) - darkBase.g), Math.abs(colors.getZ(i) - darkBase.b)) < 1e-6) hasDarkBase = true
      }
      assert(hasDarkBase, 'converted dark body palette missing')
      room.close()
    }
    converted.push({ kind, loadConversionViewMs, stats, batches, bounds, anchors: [...view.anchors.keys()] })
    view.dispose()
  }
  await preloadAircraft('http://wings.invalid/')
  assert(VEHICLE_KINDS.every(aircraftReady))
} finally {
  globalThis.Request = NativeRequest
  globalThis.fetch = nativeFetch
  globalThis.ProgressEvent = nativeProgressEvent
}
console.log(JSON.stringify({ converted }))
console.log('CPU COMBAT FIXTURES (not native acceptance): ' + JSON.stringify(combatFixtures))
console.log('PASS: F-15/F-35 distinct loadouts/stealth, model-derived gun/missile positions in identity and rotated poses, one-store-per-round depletion/regeneration, offline spawn/snapshot, invalid-kind rejection, ordinary-input takeoff/turn, hashes/budgets/material assignments, cockpit/anchor math and real CPU loader/template/view. Original five cruise/boost/loadouts and generic hardpoints unchanged. Timings include local I/O + GLTF parse + conversion + view setup; single samples, no GPU/rendered-flight/thumbnail acceptance.')
