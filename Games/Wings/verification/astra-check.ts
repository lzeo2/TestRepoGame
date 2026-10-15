// Source-built regression: actual loopback/simulation and render descriptors, no GPU/world rendering.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { setTimeout as delay } from 'node:timers/promises'
import { CameraRig } from './src/render/camera'
import { CONFIG, preloadAircraft, aircraftReady, aircraftStats, createAircraftView } from './src/render/aircraft'
import { createLoopbackRoom } from './src/sim/loopback'
import { TICK_DT, type VehicleKind } from './src/sim/types'
import { VEHICLES, VEHICLE_KINDS } from './src/sim/vehicles'
import { DEFAULT_ROOM_CONFIG, type ServerMessage } from './src/sim/protocol'

const models = resolve(process.argv[2] ?? 'Games/Wings/models')
assert.deepEqual(VEHICLE_KINDS, ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'])
assert.deepEqual(VEHICLE_KINDS.slice(0, 5).map(k => [VEHICLES[k].cruise, VEHICLES[k].boost]), [[135,185],[75,98],[105,135],[190,260],[150,180]])
const hashes = ['5787ebe4d03fc70ce08036ad1a37a7eff6ee1a0b73d132939a27cb02964ba0f8', '5e3cd65a8fa1c890907878b3219c863cfdfe4f63bc6da638b846411a5f5caafb']
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
  for (const name of [...desc.pivots, ...desc.anchors.map(a => a.node)]) assert(names.includes(name), name)
  for (const field of ['pivots', 'stores', 'spinners', 'afterburners'] as const) assert.deepEqual(desc[field], [])
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
      assert.equal(stats.triangles, primitives.reduce((s: number, p: any) => s + gltf.accessors[p.indices].count / 3, 0))
      assert.equal(stats.sourceMeshes, primitives.length)
      assert.equal(stats.sourceMaterials, gltf.materials.length)
      assert.equal(stats.drawCalls, 4)
      assert(batches.some(b => b.role === 'toon' && b.metalness === 0.05))
      assert(batches.some(b => b.role === 'toon' && b.metalness === 0.55))
      assert(batches.some(b => b.role === 'livery'))
      assert(batches.some(b => b.role === 'glass' && b.opacity > 0 && b.opacity < 1))
      assert(Math.abs(bounds[2] - CONFIG[kind].placeholder.length) < 1e-5)
      assert(Math.abs(bounds[0] - CONFIG[kind].placeholder.span) < 1e-5)
      for (const a of CONFIG[kind].anchors) {
        const anchor = view.anchors.get(a.key)!
        assert(anchor.matrix.elements.every(Number.isFinite))
        const position = new Vector3().setFromMatrixPosition(anchor.matrix)
        assert(position.distanceTo(new Vector3(...gltf.nodes.find((n: any) => n.name === a.node).translation)) < 1e-6)
      }
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
console.log('PASS: F-15/F-35 offline spawn/snapshot, invalid-kind rejection, ordinary-input takeoff/turn, actual hashes/budgets/material assignments, cockpit/anchor math and real CPU loader/template/view. Original five cruise/boost unchanged. Timings include local I/O + GLTF parse + conversion + view setup; single samples, no GPU/rendered-flight/thumbnail acceptance.')
