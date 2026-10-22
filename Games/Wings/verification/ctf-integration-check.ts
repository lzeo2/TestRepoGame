// CPU integration only: real loopback/wire, RoomEngine, bots, combat, physics and flag authority.
// No browser/native acceptance. Only labelled carrier-loss/cleanup-clock boundaries mutate authority fixtures.
import assert from "node:assert/strict"
import { createLoopbackRoom } from "./src/sim/loopback"
import { ABANDONED_DESTROY_DELAY, PARKED_REMOVE_DELAY, RoomEngine, sanitizeConfig } from "./src/sim/room-engine"
import { CTF_ROOM_CONFIG, DEFAULT_ROOM_CONFIG, type ServerMessage, type Snapshot } from "./src/sim/protocol"
import { TICK_DT, type GameEvent } from "./src/sim/types"
import { FLEET } from "./src/sim/fleet"
import { VEHICLES } from "./src/sim/vehicles"

assert.deepEqual(sanitizeConfig({}), DEFAULT_ROOM_CONFIG)
const strict = sanitizeConfig({ mode: "ctf", teams: 4, bots: 0, maxPerTeam: 1, botFill: 1 })
assert.deepEqual([strict.mode, strict.teams, strict.bots, strict.maxPerTeam, strict.scoreLimit, strict.timeLimit], ["ctf", 2, 2, 3, 3, 300])
assert.equal(strict.botFill, undefined)
assert.equal(sanitizeConfig({ mode: "ctf", bots: 10 }).maxPerTeam, 11, "solo pilot cannot displace a requested bot")
assert.equal(sanitizeConfig({ mode: "invalid" }).mode, undefined)
console.log("PASS config: legacy defaults unchanged; CTF two teams/mixed-bot capacity/capture/timer defaults, no fill override")

// Negative boundary fixture only: carrier loss must not prevent a CTF spawn or end that mode.
const boundary = new RoomEngine("ctf-carrier-boundary", { ...CTF_ROOM_CONFIG }, { send() {} })
for (const ship of FLEET) {
  const live = boundary.combat.ships[ship.id]
  if (live) { live.hp = 0; live.sunk = true }
}
const pilot = boundary.addPlayer("Boundary")
boundary.handle(pilot, { type: "spawn", kind: "speedboat" })
assert(boundary.vehicles.some(v => v.seats[0] === pilot && v.kind === "speedboat"))
boundary.advance(TICK_DT)
assert.equal(boundary.matchEndedAt, null)
assert(boundary.snapshotFor(pilot).ctf)
const fleet = new RoomEngine("fleet-unchanged", { ...DEFAULT_ROOM_CONFIG }, { send() {} })
assert.equal(fleet.ctf, null)
assert.equal(fleet.snapshotFor("").ctf, undefined)
console.log("PASS synthetic carrier-loss boundary: CTF boat base remains available; Fleet has no flag state")

// Isolated cleanup-clock fixture, NOT mixed-match/native evidence. No method is replaced.
const parked = new RoomEngine("ctf-parked-clock", { ...CTF_ROOM_CONFIG }, { send() {} })
const owner = parked.addPlayer("Parked")
parked.handle(owner, { type: "spawn", kind: "speedboat" })
const hull = parked.vehicles.find(v => v.seats[0] === owner)!
parked.handle(owner, { type: "leave-vehicle" })
assert(hull.seats.every(id => id === null), "ordinary CTF base return must relinquish the boat")
const lifecycle = parked as unknown as { time: number; cleanupVehicles(): void; events: GameEvent[] }
lifecycle.cleanupVehicles()
lifecycle.time = ABANDONED_DESTROY_DELAY + TICK_DT
lifecycle.cleanupVehicles()
assert(hull.alive && parked.vehicles.includes(hull), "valid CTF parked boat must not crash at the abandoned delay")
lifecycle.time = PARKED_REMOVE_DELAY + TICK_DT
lifecycle.cleanupVehicles()
assert(!parked.vehicles.includes(hull), "parked CTF boat must quietly leave at the normal parked delay")
assert(!lifecycle.events.some(e => e.type === "kill" && e.victim === hull.id), "parking removal is not a crash kill")
console.log("PASS isolated cleanup-clock boundary: shared CTF boat-base predicate, no abandoned crash, quiet parked removal; not gameplay evidence")

let latest: Snapshot | null = null
const flagEvents: (Extract<GameEvent, { type: "flag" }> & { time: number })[] = []
const endEvents: Extract<GameEvent, { type: "match-end" }>[] = []
const seen = [new Set<string>(), new Set<string>()]
let kills = 0
const room = createLoopbackRoom({ mode: "ctf", scoreLimit: 1, timeLimit: 180, botSkill: 0.5 }, "Observer", {
  onMessage(message: ServerMessage) {
    if (message.type === "welcome") {
      assert.deepEqual([message.config.mode, message.config.teams, message.config.bots], ["ctf", 2, 2])
      assert.equal(message.config.scoreLimit, 1)
    }
    if (message.type === "snapshot") latest = message
    if (message.type === "events") for (const event of message.events) {
      if (event.type === "flag") flagEvents.push({ ...event, time: room.engine.time })
      if (event.type === "match-end") endEvents.push(event)
      if (event.type === "kill") kills++
    }
  },
}, { manual: true })
try {
  room.send({ type: "spawn", kind: "speedboat" })
  for (let tick = 0; tick < 181 / TICK_DT && room.engine.matchEndedAt === null; tick++) {
    room.step(TICK_DT)
    for (const v of room.engine.vehicles) {
      const owner = room.engine.players.get(v.seats[0] ?? "")
      if (owner?.info.bot && v.team < 2) seen[v.team].add(VEHICLES[v.kind].flight === "water" ? "boat" : "plane")
    }
    if (tick % 120 === 0) await Promise.resolve()
  }
  await Promise.resolve()
  const snap = latest as Snapshot | null
  assert(snap?.ctf)
  assert(seen.every(kinds => kinds.has("boat") && kinds.has("plane")), seen)
  assert(flagEvents.some(e => e.action === "pickup"), "mixed match never stole a flag")
  assert(flagEvents.some(e => e.action === "capture"), "mixed match never scored a real capture")
  assert(endEvents.some(e => e.reason === "score"), "capture limit did not end the mixed match")
  assert.deepEqual(snap.scores, snap.ctf.scores)
  const authorityScore = room.engine.ctf!.scores[0]
  snap.ctf.scores[0] = 999
  snap.ctf.flags[0].home[0] = 999
  snap.scores[0] = 999
  assert.equal(room.engine.ctf!.scores[0], authorityScore, "decoded snapshots must not grant authority")
  assert.notEqual(room.engine.ctf!.flags[0].home[0], 999)
  assert.notEqual(room.engine.scores[0], 999)
  const oldStarted = room.engine.matchStartedAt
  for (let i = 0; i < 16 / TICK_DT; i++) { room.step(TICK_DT); if (i % 120 === 0) await Promise.resolve() }
  assert(room.engine.matchStartedAt > oldStarted)
  assert.deepEqual(room.engine.ctf!.scores, [0, 0])
  assert(room.engine.ctf!.flags.every(f => f.carrierId === null && f.droppedAt === null))
  console.log(JSON.stringify({ mixedCombat: "PASS", simulatedSeconds: room.engine.time, seen: seen.map(s => [...s]), kills, flagEvents, endEvents }))
  console.log("PASS real mixed-team offline/wire CTF capture-limit end and clean automatic restart; no pose/flag/score grants in gameplay fixture")
} finally { room.close() }
const timerEvents: Extract<GameEvent, { type: "match-end" }>[] = []
const timed = new RoomEngine("ctf-timer", { ...CTF_ROOM_CONFIG, scoreLimit: 1000, timeLimit: 60 }, {
  send(_id, message) { if (message.type === "events") for (const e of message.events) if (e.type === "match-end") timerEvents.push(e) },
})
timed.addPlayer("Timer observer")
for (let tick = 0; tick < 61 / TICK_DT && timed.matchEndedAt === null; tick++) timed.advance(TICK_DT)
assert.equal(timed.matchEndedAt, 60)
assert.equal(timerEvents[0]?.reason, "time")
const [a, b] = timed.ctf!.scores
assert.equal(timed.winner, a === b ? null : a > b ? 0 : 1)
console.log("PASS real CTF round timer: capture scores choose winner or draw; no ship-damage tiebreak")
console.log("LIMIT: CPU simulation and synthetic carrier-loss boundary; no browser, pixels, hardware or native gameplay acceptance")
