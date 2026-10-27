import assert from 'node:assert/strict';
import { createSimulation, CITY_EVENTS, MILESTONES } from './sim.mjs';
import { applyTool } from './native-actions.mjs';
import { footprintLots } from './footprints.mjs';

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
  for (const p of footprintLots(sim.state.buildings[0])) sim.roads.set(p.x, p.z, false);
  const power = build(sim, 'power', 19, 10), water = build(sim, 'water', 20, 10);
  build(sim, 'police', 21, 10); build(sim, 'police', 22, 10); build(sim, 'park', 15, 16);
  for (const z of [12, 14, 18, 22]) for (let x = 7; x < 15; x++) build(sim, 'residential', x, z);
  for (let x = 23; x < 33; x++) { build(sim, 'industrial', x, 10); build(sim, 'commercial', x, 12); }
  return { sim, power, water };
}

const { sim, power, water } = city();
const initialBudget = sim.state.budget;
let movedCars = 0, jams = 0, parking = 0, carIds = new Set();
const naturalMilestones = [];
advance(sim, 600, events => {
  naturalMilestones.push(...events.filter(e => e.type === 'milestone'));
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
assert.deepEqual(naturalMilestones.map(({ population, name, grant }) => ({ population, name, grant })), MILESTONES.slice(0, 3));
assert.deepEqual(sim.state.nextMilestone, MILESTONES[3]);
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
siege.roads.place({ x: 0, z: 10 }, { x: 23, z: 10 });
siege.roads.place({ x: 14, z: 0 }, { x: 14, z: 23 });
const towers = [[9, 9], [15, 9], [9, 15], [15, 15]].map(([x, z]) => build(siege, 'watchtower', x, z));
// Twelve wall lots seal every cardinal entry to the hall's 3x3 footprint.
const walls = [11, 12, 13].flatMap(n => [[n, 10], [n, 14], [10, n], [14, n]]);
const wallIds = new Set(walls.map(([x, z]) => { siege.roads.set(x, z, false); return build(siege, 'wall', x, z).id; }));
let waveCounts = [], shots = 0, wallBites = 0, hallDamage = 0, lossEvents = 0, roadMoves = 0;
let survived = 0, hallFirstDamaged = false, fallenSnapshot;
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
    if (e.type === 'hall-fallen') {
      assert.equal(siege.state.phase, 'day'); assert.equal(siege.state.rebuildRemaining, 120);
      assert.equal(siege.state.zombies.length, 0); assert.equal(siege.state.pendingZombies, 0);
      assert.equal(siege.state.score, 2); assert.equal(siege.state.kills, 26);
      assert(siege.state.buildings.some(b => b.type === 'townhall' && b.hp === 0), 'ruined hall remains selectable');
      fallenSnapshot = siege.snapshot();
    }
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
assert(fallenSnapshot); assert.equal(siege.state.time - fallenSnapshot.state.time, 120, 'full recovery grace before loss');
assert.deepEqual(createSimulation({ snapshot: siege.snapshot() }).snapshot(), siege.snapshot(), 'lost city also round-trips');
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
  if (!overflow.buildingAt(x, z) && overflow.state.budget >= 300) build(overflow, 'watchtower', x, z);
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
  s.roads.place({ x: 8, z: 9 }, { x: 15, z: 9 });
  s.roads.place({ x: 10, z: 9 }, { x: 10, z: 11 }); // Reach the hall's western footprint edge without crossing it.
  build(s, 'power', 8, 8); build(s, 'water', 9, 8);
  const park = build(s, 'park', 10, 8), shop = build(s, 'commercial', 11, 8);
  const home = build(s, 'residential', 13, 8); build(s, 'industrial', 14, 8);
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
near(civic.home.happiness, 0.82); near(c.state.income, baseIncome * 1.25);
c.roads.set(16, 9);
const outside = build(c, 'residential', 16, 8); outside.residents = 0;
until(61); assert(outside.happiness < civic.home.happiness, 'festival is district-local');
c.bulldoze(outside.x, outside.z);
c.update(0); c.update(0.1); c.update(0.15); assert.equal(c.drainEvents().filter(e => e.type === 'city-event-start').length, 0);
c.setSpeed(0); c.update(500); assert.equal(c.state.tick, 245); c.setSpeed(1);
until(299.75); assert.equal(ends.length, 0);
until(300); assert.equal(ends[0].event.type, 'street-festival'); near(civic.home.happiness, 0.62); // Supplied park retains the new +0.12 amenity morale after festival expiry.
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

// Population fixtures isolate thresholds; natural growth above also earned the first three.
const rewards = city().sim;
for (const z of [12, 14, 18, 22]) for (let x = 15; x <= 17; x++) build(rewards, 'residential', x, z);
const rewardHomes = rewards.state.buildings.filter(b => b.type === 'residential');
for (const b of rewardHomes) b.residents = 64;
rewards.drainEvents(); const beforeRewards = rewards.state.budget;
rewards.update(1);
const earned = rewards.drainEvents().filter(e => e.type === 'milestone');
assert.deepEqual(earned.map(({ population, name, grant }) => ({ population, name, grant })), MILESTONES);
near(rewards.state.budget, beforeRewards + rewards.state.netIncome + MILESTONES.reduce((n, m) => n + m.grant, 0));
assert.equal(rewards.state.nextMilestone, null);
const paidCity = createSimulation({ snapshot: rewards.snapshot() });
for (const b of paidCity.state.buildings) if (b.type === 'residential') b.residents = 0;
paidCity.update(1);
for (const b of paidCity.state.buildings) if (b.type === 'residential') b.residents = 64;
paidCity.update(1);
assert.equal(paidCity.drainEvents().filter(e => e.type === 'milestone').length, 0, 'regrowth/reload never repeats a grant');
const pausedReward = createSimulation(); pausedReward.setSpeed(0); pausedReward.update(1000);
assert.equal(pausedReward.state.budget, 40000); assert.equal(pausedReward.snapshot().runtime.milestone, 0);
log('MILESTONE CHECK PASS: natural first three, all five named grants, exact budget, multi-crossing, pause and no regrowth/reload farming');

const diagnosis = createSimulation({ size: 40 });
advance(diagnosis, 5); assert.match(diagnosis.state.growthDiagnosis, /No homes yet/);
diagnosis.roads.place({ x: 2, z: 19 }, { x: 18, z: 19 });
build(diagnosis, 'power', 2, 18); const diagnosticWater = build(diagnosis, 'water', 3, 18);
const diagnosticHome = build(diagnosis, 'residential', 18, 18);
advance(diagnosis, 5); assert(diagnosis.state.population > 0); assert.equal(diagnosis.state.growthDiagnosis, '', 'baseline demand grows without jobs');
diagnosis.roads.set(10, 19, false); advance(diagnosis, 5);
assert(diagnosis.state.power.supply > 0); assert.match(diagnosis.state.growthDiagnosis, /Homes lack power/);
diagnosis.roads.set(10, 19); advance(diagnosis, 5); assert.equal(diagnosis.state.growthDiagnosis, '');
diagnosis.bulldoze(diagnosticWater.x, diagnosticWater.z); advance(diagnosis, 5);
assert.match(diagnosis.state.growthDiagnosis, /Homes lack water/);
build(diagnosis, 'water', diagnosticWater.x, diagnosticWater.z); advance(diagnosis, 5);
diagnosis.setTaxRate(0.3); advance(diagnosis, 5); assert.match(diagnosis.state.growthDiagnosis, /lower taxes/);
diagnosis.setTaxRate(0.1); advance(diagnosis, 5); assert.equal(diagnosis.state.growthDiagnosis, '');
diagnosticHome.residents = 64; advance(diagnosis, 10); assert.match(diagnosis.state.growthDiagnosis, /Homes are full/);
const distant = createSimulation({ size: 40 });
distant.roads.place({ x: 1, z: 3 }, { x: 5, z: 3 });
build(distant, 'power', 1, 2); build(distant, 'water', 3, 2); build(distant, 'residential', 2, 2);
advance(distant, 5); assert.match(distant.state.growthDiagnosis, /Homes lack services/);
build(distant, 'park', 4, 2); advance(distant, 5); assert.equal(distant.state.growthDiagnosis, '');
const lowDemand = city().sim;
for (const b of [...lowDemand.state.buildings]) {
  if (['commercial', 'industrial'].includes(b.type)) lowDemand.bulldoze(b.x, b.z);
  if (b.type === 'residential') b.residents = 50;
}
lowDemand.state.population = 1600; advance(lowDemand, 10);
assert.equal(lowDemand.state.demand.residential, 0); assert.match(lowDemand.state.growthDiagnosis, /demand is low/);
const unsupervised = city().sim;
for (const b of [...unsupervised.state.buildings]) {
  if (b.type === 'police') unsupervised.bulldoze(b.x, b.z);
  if (b.type === 'residential') b.residents = 64;
}
unsupervised.state.population = 2048; advance(unsupervised, 10);
assert.match(unsupervised.state.growthDiagnosis, /Crime is driving residents away/);
const diagnosisSave = createSimulation({ snapshot: diagnosis.snapshot() });
diagnosis.update(7.1); diagnosisSave.update(7.1); assert.deepEqual(diagnosisSave.snapshot(), diagnosis.snapshot());
log('DIAGNOSIS CHECK PASS: five-second cadence, power/network cut, water, services, crime, capacity, taxes, low demand, baseline jobs and reload');

// Replay a naturally fallen hall, then use the same Repair action as native input.
const rescue = createSimulation({ snapshot: fallenSnapshot });
assert.equal(rescue.setMode('free'), false); assert.equal(rescue.skipToNight(), false);
assert.equal(rescue.bulldoze(12, 12).ok, false); assert.equal(rescue.place('park', 12, 12).ok, false);
rescue.setSpeed(0); rescue.update(1000); assert.equal(rescue.state.rebuildRemaining, 120);
rescue.setSpeed(1); rescue.update(0.1);
const rescueCopy = createSimulation({ snapshot: rescue.snapshot() });
rescue.update(10); rescueCopy.update(10); assert.deepEqual(rescueCopy.snapshot(), rescue.snapshot());
assert.equal(rescue.state.rebuildRemaining, 110);
const recoveryHome = build(rescue, 'residential', 1, 9);
const survivors = rescue.state.buildings.map(b => b.id), savedBudget = rescue.state.budget;
rescue.state.budget = 239; assert.equal(applyTool(rescue, 'repair', { x: 12, z: 12 }).ok, false);
assert.equal(rescue.state.townHallHp, 0); assert.equal(rescue.state.budget, 239);
rescue.state.budget = savedBudget;
const rebuilt = applyTool(rescue, 'repair', { x: 12, z: 12 });
assert.equal(rebuilt.ok, true); assert.equal(rebuilt.cost, 240); near(rescue.state.budget, savedBudget - 240);
assert.equal(rescue.state.townHallHp, 600); assert.equal(rescue.state.rebuildRemaining, 0);
assert.equal(rescue.state.dayRemaining, 240); assert.equal(rescue.state.phase, 'day');
assert.deepEqual(rescue.state.buildings.map(b => b.id), survivors); assert(rescue.state.buildings.includes(recoveryHome));
assert.equal(rescue.state.score, 2); assert.equal(rescue.state.kills, 26);
assert.equal(rescue.drainEvents().filter(e => e.type === 'hall-rebuilt').length, 1);
const hallBurst = rescue.state.cityEvents.some(e => e.type === 'water-main-burst' && e.district === '1,1');
const followupRepair = applyTool(rescue, 'repair', { x: 12, z: 12 });
assert.equal(followupRepair.ok, hallBurst, 'rebuild takes priority, but any water-main leak still needs repair');
if (hallBurst) assert.equal(followupRepair.cost, 120);
advance(rescue, 239); assert.equal(rescue.state.night, 3);
advance(rescue, 1); assert.equal(rescue.state.night, 4); assert.equal(rescue.state.phase, 'night');
const expiry = createSimulation({ snapshot: fallenSnapshot }); expiry.setSpeed(10); expiry.update(11.975);
assert.equal(expiry.state.rebuildRemaining, 0.25); assert.equal(expiry.state.phase, 'day');
expiry.update(0.025); assert.equal(expiry.state.phase, 'lost');
assert.equal(expiry.drainEvents().filter(e => e.type === 'lost').length, 1);
const expiredTime = expiry.state.time; expiry.update(100); assert.equal(expiry.state.time, expiredTime);
log('RECOVERY CHECK PASS: natural fall, retained city, pause/10x, exact 120s expiry, paid native-tool rebuild, next wave, mode/skip guards and save replay');
