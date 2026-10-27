import assert from 'node:assert/strict'
import { createLoopbackRoom } from './src/sim/loopback'
import { TICK_DT } from './src/sim/types'

const messages: string[] = []
const room = createLoopbackRoom({ teams: 2, bots: 0, listed: false }, 'Solo check', {
  onMessage: m => messages.push(m.type),
}, { manual: true })
await Promise.resolve()
assert(messages.includes('welcome'))
room.send({ type: 'spawn', kind: 'fighter' })
const vehicle = room.engine.vehicles.find(v => v.seats[0] === room.playerId)!
assert(vehicle)
const start = [...vehicle.flight.position]
for (let i = 1; i <= 900; i++) {
  room.send({ type: 'input', seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: 0, pitch: i > 120 ? 0.35 : 0, boost: true, brake: false } })
  room.step(TICK_DT)
}
await Promise.resolve()
const end = [...vehicle.flight.position]
console.log(JSON.stringify({ start, end, alive: vehicle.alive, onGround: vehicle.flight.onGround, speed: Math.hypot(...vehicle.flight.velocity), aircraft: room.engine.vehicles.length }))
assert(vehicle.alive, 'aircraft must survive takeoff')
assert(!vehicle.flight.onGround, 'aircraft must leave carrier deck')
assert(end[1] > start[1] + 50, 'pitch input must produce a climb')
assert(Math.hypot(...end.map((n,i) => n - start[i])) > 300, 'aircraft must move')
assert.equal(room.engine.vehicles.length, 1)
room.close()
const fresh = createLoopbackRoom({ teams: 2, bots: 0, listed: false }, 'Fresh round', { onMessage() {} }, { manual: true })
await Promise.resolve()
assert.equal(fresh.engine.time, 0)
fresh.send({ type: 'spawn', kind: 'fighter' })
const dive = fresh.engine.vehicles.find(v => v.seats[0] === fresh.playerId)!
assert.deepEqual(dive.flight.position, start)
for (let i = 1; i <= 900 && dive.alive; i++) {
  fresh.send({ type: 'input', seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: 0, pitch: -1, boost: true, brake: false } })
  fresh.step(TICK_DT)
}
assert(!dive.alive, 'ordinary dive input must crash')
const crashAt = fresh.engine.time
for (let i = 0; i < 600; i++) fresh.step(TICK_DT)
fresh.send({ type: 'spawn', kind: 'fighter' })
const respawn = fresh.engine.vehicles.find(v => v.seats[0] === fresh.playerId && v.alive)
assert(respawn, 'fighter must respawn after cooldown')
assert.notEqual(respawn.id, dive.id)
console.log(JSON.stringify({freshTime:0, crashAt, respawnAt:fresh.engine.time, respawnAlive:respawn.alive}))
fresh.close()
console.log('PASS: offline takeoff, fresh session, ordinary-input crash and respawn; rendering not tested')
