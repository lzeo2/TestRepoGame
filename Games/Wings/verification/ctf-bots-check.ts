// CPU fixtures, not native gameplay evidence. Bundle with the existing esbuild, run with Node.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { botInput, ctfBotInput, createBotBrain, chooseBotVehicle } from "./src/sim/bots"
import { createFlightState, stepFlight, boatNavigable, yawPitchRoll } from "./src/sim/flight"
import { createWeapons } from "./src/sim/combat"
import { createCtfState, stepCtf, type CtfEvent } from "./src/sim/ctf"
import { CTF_HOMES, ctfSpawnPoint } from "./src/sim/ctf-map"
import { bakeWorld, setFleetState, worldQuery } from "./src/sim/geography"
import { VEHICLES } from "./src/sim/vehicles"
import { TICK_DT, type PlayerInfo, type VehicleEntity, type VehicleKind } from "./src/sim/types"

function fixture(team: 0 | 1, kind: VehicleKind) {
  const bot: PlayerInfo = { id: "bot", name: "bot", bot: true, team, vehicleId: "vehicle", seat: 0, kills: 0, deaths: 0, respawnAt: 0 }
  const spec = VEHICLES[kind]
  const vehicle: VehicleEntity = {
    id: "vehicle", kind, team, flight: createFlightState(kind, ctfSpawnPoint(team, kind === "speedboat", 0)),
    hp: spec.maxHp, maxHp: spec.maxHp, seats: [bot.id, null], aim: [null, null], weapons: createWeapons(kind),
    flaresReadyAt: 0, flareCount: 10, abilityReadyAt: 0, spottedUntil: 0, lastDamagedBy: null, alive: true,
  }
  return { bot, vehicle, brain: createBotBrain(56, 0.7) }
}
setFleetState(0, 2)
console.log(JSON.stringify({ bakeMs: bakeWorld(), scope: "CPU default geography, actual inputs/physics/flag authority; no respawns or pose corrections" }))
let failed = false
for (const kind of (process.argv.includes("--classic-only") ? [] : ["speedboat", "fighter", "f15", "f35"]) as VehicleKind[]) for (const team of [0, 1] as const) {
  const { bot, vehicle, brain } = fixture(team, kind)
  const ctf = createCtfState(CTF_HOMES, 1), receipts: (CtfEvent & { tick: number })[] = []
  let tick = 0, minPickup = Infinity, maxAltitude = 0, minAltitude = Infinity, winner: number | null = null
  for (; tick < 600 / TICK_DT; tick++) {
    const now = tick * TICK_DT
    setFleetState(now, 2)
    const before = JSON.stringify([vehicle.flight, ctf])
    const out = ctfBotInput(brain, bot, vehicle, [vehicle], now, ctf)
    assert.equal(JSON.stringify([vehicle.flight, ctf]), before, "AI must not move hulls or grant flag state")
    assert(out.flight)
    for (const value of [out.flight.throttle, out.flight.yaw, out.flight.pitch, out.flight.roll, ...(out.flight.aim ?? [])]) assert(Number.isFinite(value))
    stepFlight(vehicle.flight, out.flight, TICK_DT, worldQuery)
    const pos = vehicle.flight.position
    if (kind === "speedboat" && tick % 60 === 0) assert(boatNavigable(worldQuery, pos[0], pos[2], yawPitchRoll(vehicle.flight.orientation).yaw))
    minPickup = Math.min(minPickup, Math.hypot(...pos.map((v, i) => v - CTF_HOMES[1 - team][i])))
    maxAltitude = Math.max(maxAltitude, pos[1]); minAltitude = Math.min(minAltitude, pos[1])
    winner = stepCtf(ctf, [vehicle], now, worldQuery.groundHeight, event => receipts.push({ ...event, tick }))
    if (winner !== null || vehicle.flight.crashed) break
  }
  const result = { kind, team, winner, tick, seconds: +(tick * TICK_DT).toFixed(2), crash: vehicle.flight.crashed,
    pos: vehicle.flight.position.map(v => +v.toFixed(2)), minPickup: +minPickup.toFixed(2), minAltitude, maxAltitude, receipts,
    route: brain.memory.ctfRoute }
  console.log(JSON.stringify(result))
  if (winner !== team || vehicle.flight.crashed || !receipts.some(e => e.action === "pickup") || !receipts.some(e => e.action === "capture")) failed = true
}
if (!process.argv.includes("--classic-only")) {
  // Initial authority fixtures test priorities, not awarded pickup/capture evidence.
  const own = fixture(0, "fighter"), carrier = fixture(1, "f35").vehicle
  carrier.id = "stealth-carrier"
  const initial = createCtfState(CTF_HOMES, 1)
  const stolen = { ...initial, flags: [{ ...initial.flags[0], carrierId: carrier.id, position: [...carrier.flight.position] }, initial.flags[1]] } as typeof initial
  const out = ctfBotInput(own.brain, own.bot, own.vehicle, [own.vehicle, carrier], 10, stolen)
  assert.equal(own.brain.state.targetId, carrier.id, "known stealth flag carrier remains an intercept target")
  assert(out.seat.aim && out.seat.aim[0] > 0)
  const boat = fixture(0, "speedboat")
  ctfBotInput(boat.brain, boat.bot, boat.vehicle, [boat.vehicle, carrier], 10, stolen)
  assert.equal((boat.brain.memory.ctfRoute as { goal: string }).goal, "water-home", "boat must not pursue an airborne flag")
  const dropped = { ...initial, flags: [{ ...initial.flags[0], droppedAt: 0 }, initial.flags[1]] } as typeof initial
  ctfBotInput(boat.brain, boat.bot, boat.vehicle, [boat.vehicle], 1, dropped)
  assert.equal((boat.brain.memory.ctfRoute as { goal: string }).goal, "return:0")
  const replacement = fixture(0, "speedboat").vehicle
  replacement.id = "replacement"
  ctfBotInput(boat.brain, boat.bot, replacement, [replacement], 2, initial)
  assert.equal((boat.brain.memory.ctfRoute as { vehicleId: string }).vehicleId, replacement.id)
  console.log("objective priorities/airborne fallback/vehicle-memory reset PASS")
}
// Compare this digest against the same fixture bundled with base 2f4e00e's unchanged bots.ts.
const classic = createHash("sha256")
setFleetState(0, 2)
for (const kind of ["fighter", "apache", "warthog", "blackbird", "bomber"] as const) {
  for (const seat of [0, 1] as const) {
    const a = fixture(0, kind), b = fixture(0, kind), enemy = fixture(1, "fighter").vehicle
    enemy.id = "enemy"
    a.bot.seat = b.bot.seat = seat
    for (let i = 0; i < 120; i++) {
      const out = botInput(a.brain, a.bot, a.vehicle, [a.vehicle, enemy], i * TICK_DT)
      assert.deepEqual(out, botInput(b.brain, b.bot, b.vehicle, [b.vehicle, enemy], i * TICK_DT))
      classic.update(JSON.stringify(out))
      if (out.flight) {
        stepFlight(a.vehicle.flight, out.flight, TICK_DT, worldQuery)
        stepFlight(b.vehicle.flight, b.brain.out.flight, TICK_DT, worldQuery)
      }
    }
  }
  const a = fixture(0, kind)
  for (let i = 0; i < 100; i++) {
    const choice = chooseBotVehicle(a.bot, [a.bot], [], () => i / 100)
    assert(!["speedboat", "f15", "f35"].includes(choice))
    classic.update(choice)
  }
}
const digest = classic.digest("hex")
assert.equal(digest, "258e3c43c437ccf87c0b34724699005cdfa5f9fc25efbf63612e4fc91313a0f0", "classic outputs differ from base 2f4e00e")
console.log("classic sha256=" + digest)
console.log("classic determinism/default weights PASS; capture fixtures " + (process.argv.includes("--classic-only") ? "SKIPPED" : failed ? "FAIL" : "PASS"))
assert(!failed, "ordinary-input CTF capture failed; see diagnostics above")
