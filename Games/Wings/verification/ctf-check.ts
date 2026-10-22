// Synthetic CPU positions only. Not native gameplay, navigation, or integration evidence.
import assert from "node:assert/strict"
import { cloneCtfState, createCtfState, stepCtf } from "./src/sim/ctf"
import type { CtfEvent, CtfState } from "./src/sim/ctf"
import type { Vec3, VehicleEntity } from "./src/sim/types"

function vehicle(id: string, team: VehicleEntity["team"], position: Vec3, kind: VehicleEntity["kind"] = "fighter"): VehicleEntity {
  return {
    id, team, kind, hp: 100, maxHp: 100, alive: true, seats: [id, null], aim: [null, null],
    weapons: [[], []], flaresReadyAt: 0, flareCount: 0, abilityReadyAt: 0, spottedUntil: 0,
    lastDamagedBy: null,
    flight: {
      kind, position: [...position], velocity: [0, 0, 0], orientation: [0, 0, 0, 1],
      angularVelocity: [0, 0, 0], throttle: 0, onGround: false, gearDown: false,
      crashed: null, tick: 0,
    },
  }
}
const homes: [Vec3, Vec3] = [[0, 1, 0], [1000, 1, 0]]
const events: CtfEvent[] = []
const surface = (x: number, z: number) => x / 100 + z / 10
function tick(state: CtfState, vehicles: readonly VehicleEntity[], now = 0) {
  events.length = 0
  const before = JSON.stringify(vehicles)
  const winner = stepCtf(state, vehicles, now, surface, event => events.push(event))
  assert.equal(JSON.stringify(vehicles), before, "authority must not mutate vehicles")
  const changed = new Set<number>()
  for (const event of events) {
    assert.equal(event.type, "flag")
    assert(!changed.has(event.team), "at most one transition per flag per tick")
    changed.add(event.team)
  }
  const carriers = state.flags.flatMap(flag => flag.carrierId === null ? [] : [flag.carrierId])
  assert.equal(new Set(carriers).size, carriers.length, "one flag per vehicle")
  return winner
}
let checks = 0
function check(name: string, run: () => void) {
  run()
  checks++
  console.log(`PASS ${name}`)
}

check("constructor, nested clone and input-home isolation; limits 1..1000", () => {
  const input: [Vec3, Vec3] = [[1, 2, 3], [4, 5, 6]]
  const state = createCtfState(input, 3)
  input[0][0] = 999
  assert.equal(state.flags[0].home[0], 1)
  state.flags[0].position[0] = 888
  assert.equal(state.flags[0].home[0], 1)
  const clone = cloneCtfState(state)
  clone.flags[0].home[0] = 7
  clone.flags[0].position[1] = 7
  clone.flags[1].home[2] = 7
  clone.flags[1].position[2] = 7
  clone.flags[1].carrierId = "different"
  clone.scores[0] = 7
  clone.scores[1] = 7
  assert.equal(state.flags[0].home[0], 1)
  assert.equal(state.flags[0].position[1], 2)
  assert.deepEqual(state.flags[1].home, [4, 5, 6])
  assert.deepEqual(state.flags[1].position, [4, 5, 6])
  assert.equal(state.flags[1].carrierId, null)
  assert.deepEqual(state.scores, [0, 0])
  for (const limit of [0, -1, 1.5, 1001, NaN, Infinity]) assert.throws(() => createCtfState(homes, limit), RangeError)
  createCtfState(homes, 1)
  createCtfState(homes, 1000)
  for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => createCtfState([[bad, 0, 0], homes[1]], 3), RangeError)
  const shared: Vec3 = [1, 2, 3]
  const independent = createCtfState([shared, shared], 3)
  independent.flags[0].home[0] = 9
  assert.equal(independent.flags[1].home[0], 1)
})

check("alive, HP, occupied seats, team isolation and real 3D radius", () => {
  const state = createCtfState(homes, 3)
  const dead = vehicle("dead", 0, homes[1]); dead.alive = false
  const zero = vehicle("zero", 0, homes[1]); zero.hp = 0
  const negative = vehicle("negative", 0, homes[1]); negative.hp = -1
  const empty = vehicle("empty", 0, homes[1]); empty.seats = [null, null]
  const high = vehicle("high", 0, [1000, 41.01, 0])
  const diagonal = vehicle("diagonal", 0, [1030, 31, 0])
  tick(state, [dead, zero, negative, empty, high, diagonal, vehicle("two", 2, homes[1]), vehicle("three", 3, homes[1]), vehicle("friendly", 1, homes[1])])
  assert.equal(events.length, 0)
  const passenger = vehicle("passenger", 0, [1000, 41, 0], "speedboat")
  passenger.seats = [null, "crew"]
  tick(state, [passenger])
  assert.equal(state.flags[1].carrierId, passenger.id)
  assert.deepEqual(events, [{ type: "flag", action: "pickup", team: 1, vehicleId: passenger.id }])
})

check("stable candidate order, carrier following, no own-home/carried steal", () => {
  const state = createCtfState(homes, 3)
  const first = vehicle("first", 0, homes[1]), second = vehicle("second", 0, homes[1])
  tick(state, [first, second])
  assert.equal(state.flags[1].carrierId, "first")
  first.flight.position = [750, 200, 40]
  tick(state, [first, second, vehicle("owner", 1, first.flight.position)])
  assert.deepEqual(state.flags[1].position, [750, 202, 40])
  assert.equal(events.length, 0)
  assert.equal(state.flags[0].carrierId, null)
})

check("both teams steal; own flag home required before capture", () => {
  const state = createCtfState(homes, 3)
  const a = vehicle("a", 0, homes[1]), b = vehicle("b", 1, homes[0], "speedboat")
  tick(state, [a, b])
  assert.deepEqual(events.map(event => event.team), [0, 1])
  a.flight.position = [...homes[0]]; b.flight.position = [...homes[1]]
  tick(state, [a, b])
  assert.deepEqual(state.scores, [0, 0])
  assert.equal(events.length, 0)
  assert.equal(state.flags[0].carrierId, b.id)
  assert.equal(state.flags[1].carrierId, a.id)
})

for (const reason of ["death", "missing", "empty"] as const) {
  check(`carrier ${reason}: latest XZ, surface+1 drop, no same-tick pickup`, () => {
    const state = createCtfState(homes, 3), a = vehicle("a", 0, homes[1])
    tick(state, [a], 0)
    a.flight.position = [500, 300, 20]
    tick(state, [a], 1)
    a.flight.position = [600, 400, 30]
    if (reason === "death") a.hp = 0
    if (reason === "empty") a.seats = [null, null]
    const x = reason === "missing" ? 500 : 600, z = reason === "missing" ? 20 : 30
    const other = vehicle("other", 0, [x, surface(x, z) + 1, z])
    tick(state, reason === "missing" ? [other] : [a, other], 2)
    assert.deepEqual(state.flags[1].position, [x, surface(x, z) + 1, z])
    assert.equal(state.flags[1].droppedAt, 2)
    assert.deepEqual(events, [{ type: "flag", action: "drop", team: 1, vehicleId: "a", reason }])
    tick(state, [other], 3)
    assert.equal(state.flags[1].carrierId, "other")
    assert.equal(state.flags[1].droppedAt, null)
  })
}

check("friendly touch returns dropped flag once, then home remains untouched", () => {
  const state = createCtfState(homes, 3), thief = vehicle("thief", 0, homes[1])
  tick(state, [thief]); thief.flight.position = [400, 200, 0]; thief.alive = false
  tick(state, [thief], 1)
  const friend = vehicle("friend", 1, state.flags[1].position)
  tick(state, [friend], 2)
  assert.deepEqual(events, [{ type: "flag", action: "return", team: 1, vehicleId: "friend", reason: "touch" }])
  assert.deepEqual(state.flags[1].position, homes[1])
  friend.flight.position = [...homes[1]]
  tick(state, [friend], 3)
  assert.equal(events.length, 0)
})

check("auto-return at exactly 30 seconds, no immediate re-steal or repeat", () => {
  const state = createCtfState(homes, 3), thief = vehicle("thief", 0, homes[1])
  tick(state, [thief]); tick(state, [], 10)
  tick(state, [], 39.999)
  assert.equal(events.length, 0)
  const waiting = vehicle("waiting", 0, homes[1])
  tick(state, [waiting], 40)
  assert.deepEqual(events, [{ type: "flag", action: "return", team: 1, vehicleId: null, reason: "timeout" }])
  assert.equal(state.flags[1].carrierId, null)
  tick(state, [], 41)
  assert.equal(events.length, 0)
})

for (const team of [0, 1] as const) {
  check(`capture score limit winner ${team}, event team is flag owner; terminal idempotence`, () => {
    const state = createCtfState(homes, 2), enemy = team === 0 ? 1 : 0
    const carrier = vehicle("carrier", team, homes[enemy], team === 0 ? "speedboat" : "f35")
    for (let score = 1; score <= 2; score++) {
      carrier.flight.position = [...homes[enemy]]
      tick(state, [carrier], score * 2)
      carrier.flight.position = [homes[team][0], homes[team][1] + 40.01, homes[team][2]]
      assert.equal(tick(state, [carrier], score * 2 + 0.25), null)
      carrier.flight.position = [...homes[team]]
      const result = tick(state, [carrier], score * 2 + 1)
      assert.equal(result, score === 2 ? team : null)
      assert.equal(state.scores[team], score)
      assert.deepEqual(events, [{ type: "flag", action: "capture", team: enemy, vehicleId: "carrier" }])
      assert.deepEqual(state.flags[enemy].position, homes[enemy])
      assert.equal(state.flags[enemy].carrierId, null)
    }
    assert.equal(tick(state, [carrier], 20), team)
    assert.equal(events.length, 0)
  })
}

check("simultaneous return enables deterministic capture; kills alone never score", () => {
  const state = createCtfState(homes, 3)
  const a = vehicle("a", 0, homes[1]), b = vehicle("b", 1, homes[0])
  tick(state, [a, b])
  b.alive = false
  a.flight.position = [100, 1, 0]
  tick(state, [a, b], 1)
  const friend = vehicle("friend", 0, state.flags[0].position)
  a.flight.position = [...homes[0]]
  tick(state, [friend, a], 2)
  assert.deepEqual(events.map(event => [event.action, event.team]), [["return", 0], ["capture", 1]])
  assert.deepEqual(state.scores, [1, 0])
  const unrelated = vehicle("unrelated-dead", 1, homes[0])
  unrelated.alive = false
  tick(state, [unrelated], 3)
  assert.deepEqual(state.scores, [1, 0])
})

check("overlapping volumes still allow one flag only, one transition per tick", () => {
  const state = createCtfState([[0, 1, 0], [20, 1, 0]], 3)
  const a = vehicle("a", 0, [10, 1, 0])
  tick(state, [a])
  assert.equal(state.flags[0].carrierId, null)
  assert.equal(state.flags[1].carrierId, "a")
  assert.deepEqual(state.scores, [0, 0])
  assert.deepEqual(events.map(event => event.action), ["pickup"])
  tick(state, [a], 1)
  assert.deepEqual(events.map(event => event.action), ["capture"])
  assert.deepEqual(state.scores, [1, 0])
})

console.log(`PASS ${checks} CTF synthetic CPU checks; no native/integration evidence`)
