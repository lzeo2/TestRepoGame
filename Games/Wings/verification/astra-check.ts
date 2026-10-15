// Source-built regression: actual loopback/simulation and render descriptors, no GPU/world rendering.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { PerspectiveCamera } from 'three'
import { CameraRig } from './src/render/camera'
import { CONFIG } from './src/render/aircraft'
import { createLoopbackRoom } from './src/sim/loopback'
import { TICK_DT, type VehicleKind } from './src/sim/types'
import { VEHICLES, VEHICLE_KINDS } from './src/sim/vehicles'
import { DEFAULT_ROOM_CONFIG, type ServerMessage } from './src/sim/protocol'

const models = resolve(process.argv[2] ?? 'Games/Wings/models')
assert.deepEqual(VEHICLE_KINDS, ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'astra-interceptor', 'astra-trainer'])
assert.deepEqual(VEHICLE_KINDS.slice(0, 5).map(k => [VEHICLES[k].cruise, VEHICLES[k].boost]), [[135,185],[75,98],[105,135],[190,260],[150,180]])
const hashes = ['4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e', '98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d']
const results = []
for (const [index, kind] of (['astra-interceptor', 'astra-trainer'] as const).entries()) {
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
  for (let i = 1; i <= 900; i++) {
    room.send({ type: 'input', seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: i > 780 ? 0.15 : 0, pitch: i > 120 ? 0.35 : 0, boost: true, brake: false } })
    room.step(TICK_DT)
  }
  await Promise.resolve()
  assert(vehicle.alive && !vehicle.flight.onGround)
  assert(vehicle.flight.position[1] > start[1] + 50)
  assert(vehicle.flight.position.every(Number.isFinite))
  assert(messages.some(m => m.type === 'snapshot' && m.vehicles.some(v => v.kind === kind)))
  const desc = CONFIG[kind]
  assert.equal(VEHICLES[kind].model, `models/${desc.file}.glb`)
  const bytes = readFileSync(resolve(models, `${desc.file}.glb`))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[index])
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  const names = gltf.nodes.map((n: { name: string }) => n.name)
  for (const name of [...desc.pivots, ...desc.anchors.map(a => a.node)]) assert(names.includes(name), name)
  assert(!desc.pivots.includes('gear'))
  assert.deepEqual(desc.spinners, index ? [{ name: 'propeller', axis: 'z', speed: 40, driver: 'engine' }] : [])
  const rig = new CameraRig(new PerspectiveCamera())
  rig.cockpitBody(TICK_DT, kind, [0, 100, 0], [0, 0, 0, 1], 0, 0)
  assert(rig.pos.toArray().every(Number.isFinite))
  assert(Math.abs(rig.pos.y - 101.35) < 1e-6)
  results.push({ kind, start, end: vehicle.flight.position, speed: Math.hypot(...vehicle.flight.velocity), cockpit: rig.pos.toArray(), pitchQuaternionX: rig.quat.x, bytes: bytes.length })
  room.close()
}
assert.notEqual(results[0].speed, results[1].speed)
assert.notEqual(results[0].pitchQuaternionX, results[1].pitchQuaternionX)
console.log(JSON.stringify(results))
console.log('PASS: both selectable Astra kinds, offline config, validated spawn, wire snapshots, ordinary-input takeoff/turn, immutable GLBs, rig descriptors and cockpit math. No rendered flight/material/thumbnail acceptance.')
