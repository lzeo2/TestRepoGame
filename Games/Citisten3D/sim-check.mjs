import assert from 'node:assert/strict';
import { createSimulation, CITY_EVENTS } from './sim.mjs';
import { applyTool } from './native-actions.mjs';

const log = text => console.log(text);
function build(sim, type, x, z) {
  const result = sim.place(type, x, z);
  assert(result.ok, `${type} at ${x},${z}: ${result.reason}`);
  return result.building;
}
function advance(sim, seconds, observe = () => {}) {
  for (let i = 0; i < seconds * 4; i++) { sim.update(0.25); observe(sim.drainEvents()); }
}
function city() {
  const sim = createSimulation({ size: 40, seed: 19 });
  for (const z of [9, 11, 13, 15, 17, 19, 21, 23]) sim.roads.place({ x: 5, z }, { x: 34, z });
  sim.roads.place({ x: 18, z: 9 }, { x: 18, z: 23 });
  const power = build(sim, 'power', 19, 10), water = build(sim, 'water', 20, 10);
  build(sim, 'police', 21, 10); build(sim, 'police', 22, 10); build(sim, 'park', 15, 16);
  for (const z of [12, 14, 18, 22]) for (let x = 7; x < 15; x++) build(sim, 'residential', x, z);
  for (let x = 23; x < 33; x++) { build(sim, 'industrial', x, 10); build(sim, 'commercial', x, 12); }
  return { sim, power, water };
}

const { sim, power, water } = city();
const initialBudget = sim.state.budget;
let movedCars = 0, jams = 0, parking = 0, carIds = new Set();
advance(sim, 600, () => {
  for (const c of sim.state.cars) {
    if (carIds.has(c.id) && c.progress > 0) movedCars++;
    if (c.progress === 0.8) jams++;
    if (c.parked) parking++;
    carIds.add(c.id);
  }
  const lanes = sim.state.cars.filter(c => !c.parked).map(c => c.lane);
  assert.equal(new Set(lanes).size, lanes.length, 'one moving car per directed lane segment');
});
log(`600s city: population=${Math.floor(sim.state.population)} budget=${sim.state.budget.toFixed(2)} initial=${initialBudget} income/s=${sim.state.income.toFixed(2)} upkeep/s=${sim.state.upkeep.toFixed(2)} car-movement-observations=${movedCars}`);
assert(sim.state.population >= 1400 && sim.state.population <= 1800, '600s growth balance');
assert(sim.state.budget !== initialBudget && sim.state.income > sim.state.upkeep, 'taxes and upkeep');
assert(movedCars > 100 && carIds.size > sim.state.cars.length, 'road traffic moves and despawns');
assert(jams > 0 && parking > 0, 'occupancy jams and destination parking');
log(`Traffic: unique trips=${carIds.size} jam steps=${jams} parked steps=${parking}`);
assert.equal(sim.state.night, 0, 'free build never starts a night');
assert.equal(sim.state.zombies.length, 0);
const beforeCut = sim.state.population;
assert(sim.bulldoze(power.x, power.z).ok);
advance(sim, 10);
log(`Power destroyed: unserved=${sim.state.power.unserved.toFixed(2)} population=${Math.floor(sim.state.population)} (was ${Math.floor(beforeCut)})`);
assert.equal(sim.state.power.supply, 0);
assert(sim.state.power.unserved > 0 && sim.state.population < beforeCut, 'blackout abandonment');
build(sim, 'power', power.x, power.z);
assert(sim.bulldoze(water.x, water.z).ok);
const beforeWater = sim.state.population;
advance(sim, 10);
assert(sim.state.water.unserved > 0 && sim.state.population < beforeWater, 'water-cut abandonment');
log(`Water destroyed: unserved=${sim.state.water.unserved.toFixed(2)} population=${Math.floor(sim.state.population)}`);
build(sim, 'water', water.x, water.z);
// An extra industrial district exceeds one plant, without fabricated supply overrides.
for (const z of [14, 16, 18, 22]) for (let x = 23; x < 34; x++) build(sim, 'industrial', x, z);
advance(sim, 2);
assert(sim.state.power.demand > sim.state.power.supply && sim.state.power.unserved > 0, 'overload sheds districts');
log(`Overload: power supply=${sim.state.power.supply} demand=${sim.state.power.demand.toFixed(2)} served=${sim.state.power.served.toFixed(2)} shed=${sim.state.power.unserved.toFixed(2)}`);
const time = sim.state.time; sim.setSpeed(0); sim.update(20); assert.equal(sim.state.time, time);
sim.setSpeed(10); sim.update(1); assert.equal(sim.state.time, time + 10); sim.setSpeed(1);
assert.throws(() => sim.setTaxRate(NaN)); assert.equal(sim.place('residential', NaN, 2).ok, false);

// Three real day/night cycles. Two defended victories, then unprotected loss.
const siege = createSimulation({ size: 24, mode: 'defense', seed: 8 });
siege.roads.place({ x: 0, z: 11 }, { x: 23, z: 11 });
siege.roads.place({ x: 13, z: 0 }, { x: 13, z: 23 });
const towers = [[9, 9], [15, 9], [9, 15], [15, 15]].map(([x, z]) => build(siege, 'watchtower', x, z));
// Four wall lots seal every cardinal entry to town hall, including road approaches.
const walls = [[12, 11], [13, 12], [12, 13], [11, 12]];
const wallIds = new Set(walls.map(([x, z]) => { siege.roads.set(x, z, false); return build(siege, 'wall', x, z).id; }));
let waveCounts = [], shots = 0, wallBites = 0, hallDamage = 0, lossEvents = 0, roadMoves = 0;
let survived = 0, hallFirstDamaged = false;
function observe(events) {
  for (const e of events) {
    if (e.type === 'wave') {
      waveCounts.push(e.count);
      assert(siege.state.zombies.every(z => z.x === 0 || z.z === 0 || z.x === 23 || z.z === 23), 'edge spawn');
      log(`t=${e.time}s night ${e.night}: ${e.count} zombies spawn at map edges`);
    }
    if (e.type === 'shot') shots++;
    if (e.type === 'damaged') {
      if (wallIds.has(e.id)) wallBites++;
      if (e.id === 1) {
        if (!hallFirstDamaged) { assert(wallBites > 0, 'wall bites precede town hall damage'); hallFirstDamaged = true; log(`t=${e.time}s town hall first bite: ${e.amount} HP, wall bite ticks=${wallBites}`); }
        assert(e.amount > 0 && e.amount <= 8, '8 HP bite math, clipped lethal bite'); hallDamage += e.amount;
        assert.equal(e.hp, 600 - hallDamage, 'town hall exact damage arithmetic');
      }
    }
    if (e.type === 'night-survived') { survived++; log(`t=${e.time}s night repelled: score=${e.score} kills=${siege.state.kills}`); }
    if (e.type === 'lost') { lossEvents++; log(`t=${e.time}s LOSS: score=${e.score} kills=${e.kills} peakPop=${e.peakPopulation} damage=${hallDamage}`); }
  }
  for (const z of siege.state.zombies) {
    if (z.move && siege.roads.has(z.move.x, z.move.z)) roadMoves++;
    const wall = siege.state.buildings.find(b => b.type === 'wall' && b.x === Math.round(z.x) && b.z === Math.round(z.z));
    assert(!wall, 'wall prevents zombie entry while alive');
  }
  const locations = siege.state.zombies.map(z => `${z.x.toFixed(5)},${z.z.toFixed(5)}`);
  assert.equal(new Set(locations).size, locations.length, 'no zombie overlap');
}
for (let t = 0; t < 2400 && siege.state.phase !== 'lost'; t += 0.25) {
  siege.update(0.25); observe(siege.drainEvents());
  if (survived === 2 && towers.some(b => siege.state.buildings.includes(b))) {
    for (const b of towers) siege.bulldoze(b.x, b.z);
    for (const b of siege.state.buildings) if (b.type === 'wall' && b.hp < b.maxHp) assert(siege.repair(b.id).ok);
    log(`t=${siege.state.time}s towers removed for loss proof; defenses repaired in day`);
  }
}
assert.deepEqual(waveCounts, [12, 14, 16]);
assert.equal(survived, 2); assert.equal(siege.state.score, 2);
assert(shots > 0 && siege.state.kills >= 26, 'tower kills');
assert(wallBites > 0 && roadMoves > 0, 'walls block and roads carry waves');
assert.equal(siege.state.phase, 'lost'); assert.equal(siege.state.townHallHp, 0);
assert.equal(hallDamage, 600); assert.equal(lossEvents, 1);
assert(!siege.repair(1).ok && !siege.bulldoze(12, 12).ok, 'loss frozen and hall protected');
const frozenTime = siege.state.time; advance(siege, 2); assert.equal(siege.state.time, frozenTime);
log(`Three-night totals: waves=${waveCounts.join('/')} shots=${shots} kills=${siege.state.kills} wall-bite-ticks=${wallBites} road-motion-steps=${roadMoves}`);

// Citizen shots are independently observable; no drops or free money on kills.
const armed = city().sim; advance(armed, 600); armed.setMode('defense');
let citizenShots = 0;
advance(armed, 400, events => { citizenShots += events.filter(e => e.type === 'shot' && e.source === 'citizen').length; });
assert(citizenShots > 0 && armed.state.kills >= 12, 'armed residents repel a wave without towers');
armed.setMode('free'); advance(armed, 600);
assert.equal(armed.state.zombies.length, 0); assert.equal(armed.state.phase, 'day');
log(`Citizen shot events=${citizenShots}, kills=${armed.state.kills}; defense -> free clears waves and keeps simulation ticking`);
const switcher = createSimulation({ size: 24, mode: 'defense' });
advance(switcher, 240); assert.equal(switcher.state.phase, 'night'); assert(switcher.state.zombies.length > 0);
switcher.setMode('free'); let freeWaves = 0;
advance(switcher, 700, events => { freeWaves += events.filter(e => e.type === 'wave').length; });
assert.equal(freeWaves, 0); assert.equal(switcher.state.zombies.length, 0); assert.equal(switcher.state.time, 940);

// A second plant on a disconnected island must not rescue an overloaded mainland.
const island = createSimulation({ size: 40 });
island.roads.place({ x: 1, z: 4 }, { x: 35, z: 4 });
build(island, 'power', 1, 3);
for (let x = 2; x < 35; x++) { build(island, 'industrial', x, 3); build(island, 'industrial', x, 5); }
build(island, 'power', 37, 35); advance(island, 1);
assert.equal(island.state.power.supply, 160);
assert(island.state.power.served <= 80 && island.state.power.unserved > 50, 'supply cannot teleport between networks');
// Road disconnection cuts service even while a plant remains alive.
const cut = createSimulation({ size: 24 });
cut.roads.place({ x: 2, z: 5 }, { x: 20, z: 5 });
build(cut, 'power', 2, 4); const consumer = build(cut, 'commercial', 18, 4);
advance(cut, 1); assert(consumer.powered);
cut.roads.set(10, 5, false); advance(cut, 1); assert(!consumer.powered);
const crimeCity = city().sim; advance(crimeCity, 600);
for (const b of [...crimeCity.state.buildings]) if (b.type === 'police') crimeCity.bulldoze(b.x, b.z);
const beforeCrime = crimeCity.state.population; let crimeWave = false;
advance(crimeCity, 10, () => { crimeWave ||= crimeCity.state.crime > 0.65; });
assert(crimeWave && crimeCity.state.population < beforeCrime, 'crime-wave abandonment');
log(`Police removed: population ${Math.floor(beforeCrime)} -> ${Math.floor(crimeCity.state.population)} during crime wave`);
log('Utility island limits, road cuts, pause/10x, protected hall, frozen loss, invalid input and mid-wave free-mode switch asserted.');
// Escalating hordes larger than the perimeter wait outside, rather than overlap or vanish.
const overflow = createSimulation({ size: 12, mode: 'defense', seed: 4 });
for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) {
  if ((x !== 6 || z !== 6) && overflow.state.budget >= 300) build(overflow, 'watchtower', x, z);
}
let expectedKills = 0, queued = false;
for (let i = 0; i < 14000 && overflow.state.score < 12 && overflow.state.phase !== 'lost'; i++) {
  overflow.update(0.25); queued ||= overflow.state.pendingZombies > 0;
  assert(overflow.state.zombies.length <= 44, 'live agents respect perimeter budget; full horde remains queued');
  for (const e of overflow.drainEvents()) if (e.type === 'wave') expectedKills += e.count;
}
assert.equal(overflow.state.score, 12); assert(queued);
assert.equal(overflow.state.kills, expectedKills, 'all queued horde members eventually spawn');
advance(overflow, 240); assert(overflow.state.pendingZombies > 0);
overflow.setMode('free'); assert.equal(overflow.state.pendingZombies, 0);
log(`Overflow horde check: 12 nights, ${expectedKills} kills, staged edge spawns accounted for; free mode clears queue.`);
log('Headless assertions complete. Browser acceptance remains reviewer-owned.');

// Civic fixtures grant occupancy/phase only to isolate effect arithmetic, not browser play.
function eventCity(seed = 19) {
  const s = createSimulation({ size: 24, seed });
  s.roads.place({ x: 8, z: 11 }, { x: 15, z: 11 });
  build(s, 'power', 8, 10); build(s, 'water', 9, 10);
  const park = build(s, 'park', 10, 10), shop = build(s, 'commercial', 11, 10);
  const home = build(s, 'residential', 13, 10); build(s, 'industrial', 14, 10);
  home.residents = 64; s.update(1); s.drainEvents();
  return { s, home, shop, park };
}
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const civic = eventCity(), c = civic.s, starts = [], ends = [];
function until(seconds) {
  advance(c, seconds - c.state.time, batch => {
    starts.push(...batch.filter(e => e.type === 'city-event-start'));
    ends.push(...batch.filter(e => e.type === 'city-event-end'));
  });
}
const baseIncome = c.state.income, baseWater = c.state.water.demand, basePower = c.state.power.demand;
until(59.75); assert.equal(starts.length, 0);
until(60); assert.equal(starts.length, 1);
assert.equal(starts[0].event.startTick, 240); assert.equal(starts[0].event.durationTicks, 960);
assert(starts[0].event.title && starts[0].event.description);
near(civic.home.happiness, 0.7); near(c.state.income, baseIncome * 1.25);
c.roads.set(16, 11);
const outside = build(c, 'residential', 16, 10); outside.residents = 0;
until(61); assert(outside.happiness < civic.home.happiness, 'festival is district-local');
c.bulldoze(outside.x, outside.z);
c.update(0); c.update(0.1); c.update(0.15); assert.equal(c.drainEvents().filter(e => e.type === 'city-event-start').length, 0);
c.setSpeed(0); c.update(500); assert.equal(c.state.tick, 245); c.setSpeed(1);
until(299.75); assert.equal(ends.length, 0);
until(300); assert.equal(ends[0].event.type, 'street-festival'); near(civic.home.happiness, 0.5);
assert.equal(starts[1].event.type, 'water-main-burst'); near(c.state.water.demand, baseWater * 2);
near(c.state.income, baseIncome);
until(540); near(c.state.income, baseIncome * 0.75);
assert(c.state.cityEvents.some(e => e.type === 'water-main-burst'), 'burst persists beyond a civic day');
const burst = c.state.cityEvents.find(e => e.type === 'water-main-burst');
const roadLot = { x: 8, z: 11 }, budget = c.state.budget;
c.state.phase = 'night'; assert.equal(applyTool(c, 'repair', roadLot).ok, false); c.state.phase = 'day';
c.state.budget = 119; assert.equal(applyTool(c, 'repair', roadLot).ok, false); assert(c.state.cityEvents.includes(burst));
c.state.budget = budget;
const fixed = applyTool(c, 'repair', roadLot); assert.equal(fixed.ok, true); assert.equal(fixed.cost, 120);
near(c.state.budget, budget - 120); near(c.state.water.demand, baseWater);
assert.equal(applyTool(c, 'repair', roadLot).ok, false); near(c.state.budget, budget - 120);
assert(c.drainEvents().some(e => e.type === 'city-event-end' && e.reason === 'repaired'));
until(780); near(c.state.income, baseIncome + 0.03);
c.bulldoze(civic.park.x, civic.park.z); until(781); near(c.state.income, baseIncome);
const farPark = build(c, 'park', 23, 23); until(782); near(c.state.income, baseIncome);
c.bulldoze(farPark.x, farPark.z);
until(1019.75); c.state.population = 1000; until(1020);
near(c.state.crime, 800 / 1800 - 0.3); near(c.state.income, baseIncome);
until(1259.75); c.state.population = 1000; until(1260); near(c.state.crime, 800 / 1800);
near(c.state.power.demand, basePower - 0.1); // market fixture removed its park
c.state.phase = 'night'; until(1261); near(c.state.power.demand, (basePower - 0.1) * 1.5);
until(1500); near(c.state.power.demand, basePower - 0.1);
assert.deepEqual(starts.slice(0, 6).map(e => e.event.type), CITY_EVENTS.map(e => e.type));
assert.equal(ends.filter(e => e.reason === 'expired').length, 5);
assert.equal(c.state.cityEvents.length, 1, 'next cycle starts a new festival at cold expiry');

// An unrepaired incident cannot duplicate even on a later rotation.
const persistent = createSimulation({ size: 12 }); let burstStarts = 0;
advance(persistent, 1740, batch => { burstStarts += batch.filter(e => e.type === 'city-event-start' && e.event.type === 'water-main-burst').length; });
assert.equal(burstStarts, 1); assert.equal(persistent.state.cityEvents.filter(e => e.type === 'water-main-burst').length, 1);
const replayA = city().sim, replayB = city().sim;
replayA.update(600);
for (let i = 0; i < 2400; i++) replayB.update(0.25);
assert.deepEqual(replayA.state, replayB.state); assert.deepEqual(replayA.drainEvents(), replayB.drainEvents());
const targets = [];
for (const seed of [19, 20]) { const s = eventCity(seed).s; build(s, 'park', 1, 1); advance(s, 300); targets.push(s.state.cityEvents.find(e => e.type === 'water-main-burst').district); }
assert.notEqual(targets[0], targets[1], 'original seed selects districts without consuming traffic/combat RNG');
log('CIVIC CHECK PASS: six scheduled effects, district/park/night limits, expiry, paid repair, no duplicates, pause and seeded replay');

// Skip runs the same fixed steps and emits exactly the normal play notices.
const skipped = createSimulation({ size: 24, mode: 'defense', seed: 8 });
const normal = createSimulation({ size: 24, mode: 'defense', seed: 8 });
skipped.update(0.1); normal.update(0.1);
assert.equal(skipped.skipToNight(), true); normal.update(180);
assert.deepEqual(skipped.snapshot(), normal.snapshot());
assert.equal(skipped.state.dayRemaining, 60); assert.equal(skipped.skipToNight(), false);
assert.equal(skipped.drainEvents().filter(e => e.type === 'wave-warning').length, 1);
assert.equal(createSimulation().skipToNight(), false);
skipped.update(60); assert.equal(skipped.skipToNight(), false);
log('SKIP CHECK PASS: fixed-step state/events equivalence, warning stop and mode/phase guards');

// The snapshot is detached, includes undrained events, and resumes fractional clocks/RNG.
const source = city().sim; source.update(321.1);
const saved = source.snapshot(), restored = createSimulation({ snapshot: saved });
assert.deepEqual(restored.snapshot(), saved);
restored.state.budget--; assert.equal(source.state.budget, saved.state.budget); restored.state.budget++;
source.update(100); restored.update(100); assert.deepEqual(restored.snapshot(), source.snapshot());
const supplied = createSimulation({ size: 40 }).roads; supplied.set(0, 0); const roadBefore = [...supplied.cells], versionBefore = supplied.version;
for (const corrupt of [
  x => { x.version = 2; }, x => { x.runtime.seed = -1; }, x => { x.runtime.nextId = 1; },
  x => { x.state.taxRate = 9; }, x => { x.state.time = NaN; }, x => { x.state.tick++; },
  x => { x.roads.push(x.roads[0]); }, x => { x.state.buildings[0].type = '__proto__'; },
  x => { x.state.buildings[0].hp = -1; }, x => { x.state.cityEvents[0].durationTicks = 5; },
  x => { x.state.cars[0].segment = 999; }, x => { x.runtime.events = null; }
]) {
  const bad = JSON.parse(JSON.stringify(saved)); corrupt(bad);
  assert.throws(() => createSimulation({ snapshot: bad, roads: supplied }));
  assert.deepEqual([...supplied.cells], roadBefore); assert.equal(supplied.version, versionBefore);
}
const attached = createSimulation({ snapshot: saved, roads: supplied }); assert.equal(attached.roads, supplied); assert.deepEqual(attached.snapshot(), saved);
log('SNAPSHOT CHECK PASS: detached round trip, fractional-clock replay and corrupt-input rejection before road mutation');
