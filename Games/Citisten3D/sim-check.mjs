import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';

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
let movedCars = 0, carIds = new Set();
advance(sim, 600, () => {
  for (const c of sim.state.cars) { if (carIds.has(c.id) && c.progress > 0) movedCars++; carIds.add(c.id); }
});
log(`600s city: population=${Math.floor(sim.state.population)} budget=${sim.state.budget.toFixed(2)} initial=${initialBudget} income/s=${sim.state.income.toFixed(2)} upkeep/s=${sim.state.upkeep.toFixed(2)} car-movement-observations=${movedCars}`);
assert(sim.state.population >= 1400 && sim.state.population <= 1800, '600s growth balance');
assert(sim.state.budget !== initialBudget && sim.state.income > sim.state.upkeep, 'taxes and upkeep');
assert(movedCars > 100 && carIds.size > 10, 'road traffic moves and despawns');
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
assert(citizenShots > 0, 'armed residents defend structures');
armed.setMode('free'); advance(armed, 600);
assert.equal(armed.state.zombies.length, 0); assert.equal(armed.state.phase, 'day');
log(`Citizen shot events=${citizenShots}; defense -> free clears waves and keeps simulation ticking`);
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
log('Utility island limits, road cuts, pause/10x, protected hall, frozen loss, invalid input and mid-wave free-mode switch asserted.');
log('Headless assertions complete. Browser acceptance remains reviewer-owned.');
