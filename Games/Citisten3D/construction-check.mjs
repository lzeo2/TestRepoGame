import assert from 'node:assert/strict';
import { createSimulation, BUILDINGS } from './sim.mjs';
import { BUILD_TIMES, isBuildingActive } from './city-content.mjs';
import { CITY_STAGES } from './progression.mjs';
import { RoadGrid } from './roads.mjs';
import { applyTool } from './native-actions.mjs';

const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function build(sim, type, x, z) {
  const result = sim.place(type, x, z);
  assert(result.ok, `${type} ${x},${z}: ${result.reason}`);
  return result.building;
}
function town(options = {}) {
  const sim = createSimulation({ size: 40, seed: 19, timedConstruction: true, progressionEnabled: false, ...options });
  sim.roads.place({ x: 2, z: 5 }, { x: 36, z: 5 });
  return sim;
}

// Charged at reservation, never at completion; native roads share site occupancy.
const paid = town(), initial = paid.state.budget;
const home = build(paid, 'residential', 4, 4);
assert.equal(paid.state.budget, initial - BUILDINGS.residential.cost);
assert.equal(home.constructionPaidCost, BUILDINGS.residential.cost);
assert.equal(home.constructionTotal, BUILD_TIMES.residential);
assert.equal(paid.buildingAt(4, 4), home);
assert(!paid.place('residential', 4, 4).ok);
assert(!applyTool(paid, 'road', { x: 3, z: 4 }, { x: 5, z: 4 }).ok);
assert.equal(paid.state.budget, initial - BUILDINGS.residential.cost);
assert.equal(paid.state.buildings[0].constructionTotal, 0, 'hall is immediate');
paid.drainEvents(); paid.setSpeed(0); const paused = paid.snapshot(); paid.update(100);
assert.deepEqual(paid.snapshot(), paused, 'pause freezes every clock and site');
paid.setSpeed(1); paid.update(3.75);
assert.equal(home.constructionRemaining, .25);
assert.equal(paid.drainEvents().filter(e => e.type === 'construction-complete').length, 0);
const beforeComplete = paid.state.budget;
paid.update(.25); assert.equal(home.constructionRemaining, 0);
near(paid.state.budget, beforeComplete + paid.state.netIncome);
assert.equal(paid.drainEvents().filter(e => e.type === 'construction-complete' && e.id === home.id).length, 1);
paid.update(8); assert.equal(paid.drainEvents().filter(e => e.type === 'construction-complete').length, 0);
const beforeDemolition = paid.state.budget;
assert.deepEqual(paid.bulldoze(4, 4), { ok: true, refund: 0 });
assert.equal(paid.state.budget, beforeDemolition);

const cancelled = town(); const site = build(cancelled, 'workshop', 6, 4);
cancelled.update(1); cancelled.drainEvents(); const budget = cancelled.state.budget;
assert.equal(cancelled.bulldoze(site.x, site.z).refund, site.constructionPaidCost * .75);
assert.equal(cancelled.state.budget, budget + site.constructionPaidCost * .75);
assert(!cancelled.bulldoze(site.x, site.z).ok);
assert.equal(cancelled.state.budget, budget + site.constructionPaidCost * .75);
assert.equal(cancelled.drainEvents().filter(e => e.type === 'construction-cancelled').length, 1);
cancelled.update(20); assert(!cancelled.drainEvents().some(e => e.type === 'construction-complete'));
// Historical price is authoritative, not today's definition table.
const historical = town(); build(historical, 'residential', 4, 4);
const historicalSave = historical.snapshot();
historicalSave.state.buildings[1].constructionPaidCost = 57.5;
const historicalCity = createSimulation({ snapshot: historicalSave });
assert.equal(historicalCity.bulldoze(4, 4).refund, 57.5 * .75);
console.log('CONSTRUCTION PAYMENT PASS: exact once charge/reservation, hall immediate, pause, exact completion boundary, recorded-cost 75% cancellation once, no complete refund');

// Every economic/defense category stays inert, including all six additions.
const inert = town();
const types = Object.keys(BUILDINGS).filter(type => !['townhall', 'river_pump'].includes(type));
for (const [i, type] of types.entries()) build(inert, type, i + 2, 4);
inert.update(1);
assert.equal(inert.state.power.supply, 0); assert.equal(inert.state.water.supply, 0);
assert.equal(inert.state.power.demand, 1); assert.equal(inert.state.water.demand, 1);
assert.equal(inert.state.population, 0); assert.equal(inert.state.income, 0);
assert.equal(inert.state.demand.residential, .55, 'no unfinished jobs');
assert.equal(inert.state.upkeep, BUILDINGS.townhall.upkeep);
for (const b of inert.state.buildings.slice(1)) {
  assert(!isBuildingActive(b)); assert(!b.powered && !b.watered && !b.serviced); assert.equal(b.residents, 0);
}
inert.state.population = 120; inert.update(.5);
assert.equal(inert.state.cars.length, 0, 'unfinished buildings are not traffic endpoints');
inert.setMode('defense'); inert.state.dayRemaining = .25;
inert.update(.25); assert.equal(inert.state.defenders.length, 0, 'unfinished homes provide no defenders');
const tower = inert.state.buildings.find(b => b.type === 'watchtower');
inert.state.zombies = [{ id: 999, x: tower.x, z: tower.z + 1, cell: (tower.z + 1) * 40 + tower.x, hp: 60, cooldown: 100, move: null }];
inert.state.pendingZombies = 0; inert.drainEvents(); inert.update(.25);
assert(!inert.drainEvents().some(e => e.type === 'shot'), 'unfinished towers do not shoot');
console.log('CONSTRUCTION EFFECTS PASS: supply/demand, jobs/income/upkeep, housing/growth/services, traffic endpoints, towers and defenders inactive');

const speeds = [1, 3, 10].map(speed => {
  const sim = town(); build(sim, 'power', 3, 4); build(sim, 'water', 4, 4); build(sim, 'residential', 6, 4); build(sim, 'park', 7, 4);
  sim.setSpeed(speed); sim.update(12 / speed); sim.setSpeed(1); return sim.snapshot();
});
assert.deepEqual(speeds[0], speeds[1]); assert.deepEqual(speeds[0], speeds[2]);
const source = town(); build(source, 'power', 3, 4); build(source, 'water', 4, 4); build(source, 'residential', 6, 4); build(source, 'park', 7, 4);
source.update(5.13); const midpoint = source.snapshot();
const replay = createSimulation({ snapshot: midpoint, timedConstruction: false, progressionEnabled: true });
assert.deepEqual(replay.snapshot(), midpoint, 'saved gameplay flags override caller defaults');
for (const dt of [.1, .17, .5, 1.25, 7, 5]) { source.update(dt); replay.update(dt); assert.deepEqual(replay.snapshot(), source.snapshot()); }
assert.equal(source.snapshot().runtime.events.filter(e => e.type === 'construction-complete').length, 4);
console.log('CONSTRUCTION REPLAY PASS: 1x/3x/10x fixed-step equivalence; fractional accumulator midpoint, pending notices and exact once completion survive save/load');

// Legacy snapshots do not acquire river, sites, locks or retroactive grants.
const old = createSimulation({ size: 40 }); old.roads.set(4, 5); build(old, 'residential', 4, 4);
const legacy = old.snapshot();
for (const key of ['terrainLayout', 'timedConstruction', 'progressionEnabled', 'progressionLevel']) delete legacy.state[key];
for (const b of legacy.state.buildings) for (const key of ['constructionRemaining', 'constructionTotal', 'constructionPaidCost']) delete b[key];
const migrated = createSimulation({ snapshot: legacy, timedConstruction: true, progressionEnabled: true, terrainLayout: 'river-v1' });
assert.equal(migrated.terrain.layout, 'legacy-flat'); assert.equal(migrated.state.timedConstruction, false);
assert.equal(migrated.state.progressionEnabled, false); assert(isBuildingActive(migrated.buildingAt(4, 4)));
assert(migrated.place('solar', 7, 7).ok, 'legacy original capabilities and additions remain available');
assert(!migrated.drainEvents().some(e => e.type === 'stage-earned'));

function reject(base, tamper) {
  const snapshot = structuredClone(base); tamper(snapshot);
  const roads = new RoadGrid(snapshot.state.size); roads.set(0, 0);
  const cells = roads.cells, version = roads.version, contents = [...cells];
  assert.throws(() => createSimulation({ snapshot, roads }), RangeError);
  assert.equal(roads.cells, cells); assert.equal(roads.version, version); assert.deepEqual([...cells], contents);
}
for (const tamper of [
  s => { s.state.timedConstruction = 1; }, s => { s.state.progressionEnabled = 'true'; },
  s => { s.state.progressionEnabled = true; delete s.state.progressionLevel; },
  s => { delete s.state.progressionEnabled; delete s.state.progressionLevel; },
  s => { delete s.state.timedConstruction; },
  s => { for (const key of ['constructionRemaining', 'constructionTotal', 'constructionPaidCost']) delete s.state.buildings[1][key]; },
  s => { s.state.progressionLevel = -1; }, s => { s.state.progressionLevel = 4; }, s => { s.state.progressionLevel = .5; },
  s => { s.state.terrainLayout = 'unknown'; }, s => { s.state.buildings[1].constructionRemaining = -1; },
  s => { s.state.buildings[1].constructionRemaining = 99; }, s => { s.state.buildings[1].constructionTotal = .1; },
  s => { s.state.buildings[1].constructionPaidCost = '90'; }, s => { delete s.state.buildings[1].constructionPaidCost; },
  s => { s.state.buildings[1].constructionPaidCost = BUILDINGS.power.cost + .01; },
  s => { s.state.buildings[1].constructionTotal = BUILD_TIMES.power + .25; },
  s => { s.state.buildings[1].powered = true; }, s => { s.state.buildings[0].constructionTotal = 1; },
  s => { s.runtime.events.push({ type: 'stage-earned', time: 0, level: 1, name: 'Forged', grant: 300 }); },
  s => { s.runtime.events.push({ type: 'construction-cancelled', time: 0, id: 1, refund: {} }); }
]) reject(midpoint, tamper);

const river = createSimulation({ size: 64, timedConstruction: true, terrainLayout: 'river-v1' });
const z = 6, wet = [];
for (let x = 0; x < 64; x++) if (river.terrain.isWater(x, z)) wet.push(x);
assert(wet.length > 1);
const left = wet[0] - 1, right = wet.at(-1) + 1;
assert(applyTool(river, 'bridge', { x: left, z }, { x: right, z }).ok);
assert.doesNotThrow(() => createSimulation({ snapshot: river.snapshot() }));
reject(river.snapshot(), s => { s.roads = s.roads.filter(k => k !== z * 64 + wet[0]); });
reject(river.snapshot(), s => { s.roads = s.roads.filter(k => k !== z * 64 + left); });
reject(river.snapshot(), s => {
  s.roads = []; const b = structuredClone(s.state.buildings[0]);
  Object.assign(b, { id: s.runtime.nextId++, type: 'park', x: wet[0], z, hp: 80, maxHp: 80 });
  s.state.buildings.push(b);
});
// Pump supply is also withheld until completion on a legal authoritative bank.
const bank = { x: left, z: z + 3 };
while (river.terrain.isWater(bank.x, bank.z)) bank.x--;
while (!river.terrain.isWater(bank.x + 1, bank.z)) bank.x++;
const pump = build(river, 'river_pump', bank.x, bank.z); river.update(1);
assert.equal(river.state.water.supply, 0); assert(!pump.watered);
assert.doesNotThrow(() => createSimulation({ snapshot: river.snapshot() }), 'legal bank pump remains saveable');
reject(river.snapshot(), s => { Object.assign(s.state.buildings.find(b => b.id === pump.id), { x: 1, z: 1 }); });
console.log('CONSTRUCTION SAVE VALIDATION PASS: complete legacy migration; optional field, payload, water-footprint and fragmented-crossing rejection leaves road identity/cells/version unchanged');

// Natural early stages; all grants crossed in one economy tick are paid once.
const stages = town({ progressionEnabled: true });
stages.roads.place({ x: 18, z: 5 }, { x: 18, z: 20 }); // Supply the hall too: stages require no unserved demand.
assert(!stages.place('solar', 10, 4).ok);
for (const [type, x] of [['power', 2], ['water', 3], ['residential', 5], ['commercial', 6], ['park', 7]]) build(stages, type, x, 4);
stages.update(25);
assert.equal(stages.state.progressionLevel, 1);
assert(stages.drainEvents().some(e => e.type === 'stage-earned' && e.level === 1));
assert(stages.place('solar', 10, 4).ok); assert(!stages.place('clinic', 11, 4).ok);
for (const x of [12, 13]) build(stages, 'residential', x, 4);
build(stages, 'park', 14, 4); stages.update(5);
// Controlled occupancy only isolates multi-crossing arithmetic, not native acceptance.
stages.state.progressionLevel = 0;
for (const b of stages.state.buildings) if (b.type === 'residential') b.residents = 60;
stages.state.population = 180; stages.drainEvents(); const beforeGrants = stages.state.budget;
stages.update(1);
const earned = stages.drainEvents().filter(e => e.type === 'stage-earned');
assert.deepEqual(earned.map(e => e.level), [1, 2, 3]);
near(stages.state.budget, beforeGrants + stages.state.netIncome + CITY_STAGES.slice(1).reduce((n, s) => n + s.grant, 0));
assert.equal(stages.state.progressionLevel, 3);
const stageSave = stages.snapshot();
const stageReplay = createSimulation({ snapshot: stageSave });
for (const b of stageReplay.state.buildings) if (b.type === 'residential') b.residents = 0;
stageReplay.update(1); assert.equal(stageReplay.state.progressionLevel, 3);
assert(!stageReplay.drainEvents().some(e => e.type === 'stage-earned'));
assert(stageReplay.place('clinic', 11, 4).ok, 'setbacks/load do not relock earned tools');
const inferred = structuredClone(stageSave);
for (const key of ['progressionLevel', 'progressionEnabled', 'timedConstruction', 'terrainLayout']) delete inferred.state[key];
for (const b of inferred.state.buildings) for (const key of ['constructionRemaining', 'constructionTotal', 'constructionPaidCost']) delete b[key];
const oldHighwater = createSimulation({ snapshot: inferred });
assert.equal(oldHighwater.state.progressionLevel, 3); oldHighwater.update(1);
assert(!oldHighwater.drainEvents().some(e => e.type === 'stage-earned'));
// Apartments above the old ceiling are valid saved residents.
const apartmentCity = town(); const apartment = build(apartmentCity, 'apartments', 4, 4);
apartmentCity.update(12); apartment.residents = 160;
assert.doesNotThrow(() => createSimulation({ snapshot: apartmentCity.snapshot() }));
reject(apartmentCity.snapshot(), s => { s.state.buildings[1].residents = 160.01; });
console.log('CONSTRUCTION PROGRESSION PASS: natural stage 1/unlock guards; all crossed grants once; monotonic save/setback highwater, no legacy reward replay; apartment 160 capacity validation');

// Cross-bank agents use the same road crossing. No per-agent terrain path engine.
// Both cases have bank roads; only the second joins them.
for (const bridge of [false, true]) {
  // Reuse a fixture constructor with a dry starting bank road.
  const sim = createSimulation({ size: 40, mode: 'defense', terrainLayout: 'river-v1' });
  const z = 8, water = [];
  for (let x = 0; x < 40; x++) if (sim.terrain.isWater(x, z)) water.push(x);
  const west = water[0] - 2, east = water.at(-1) + 4;
  sim.roads.set(west, z); sim.roads.set(east, z);
  if (bridge) sim.roads.place({ x: west, z }, { x: east, z });
  const home = build(sim, 'residential', east, z + 1); const target = build(sim, 'park', west, z + 1);
  sim.state.phase = 'night'; sim.state.defenders = [{ id: 100, home: home.id, x: east, z: z + 1, cooldown: 1000 }];
  sim.state.zombies = [{ id: 101, x: west, z: target.z, cell: target.z * 40 + west, hp: 60, cooldown: 1000, move: null }];
  let defenderCrossed = false, zombieCrossed = false;
  for (let i = 0; i < 160; i++) {
    sim.update(.25);
    for (const a of [...sim.state.defenders, ...sim.state.zombies]) {
      const x = Math.round(a.x), z = Math.round(a.z);
      assert(!sim.terrain.isWater(x, z) || sim.roads.has(x, z), 'agent never walks unbridged water');
    }
    defenderCrossed ||= sim.state.defenders.some(c => c.x <= west + 1.5);
  }
  assert.equal(defenderCrossed, bridge, 'defender crosses only with a road bridge');
  // Release the stationary attacker to test the independent siege field.
  sim.bulldoze(target.x, target.z); sim.state.defenders = [];
  for (let i = 0; i < 160; i++) {
    sim.update(.25);
    for (const a of sim.state.zombies) {
      const x = Math.round(a.x), z = Math.round(a.z);
      assert(!sim.terrain.isWater(x, z) || sim.roads.has(x, z));
    }
    zombieCrossed ||= sim.state.zombies.some(c => c.x >= east);
  }
  if (bridge) assert(zombieCrossed, 'reachable siege crosses its bridge');
}
const perimeter = createSimulation({ size: 40, mode: 'defense', terrainLayout: 'river-v1', timedConstruction: true }); perimeter.update(240);
assert(perimeter.state.zombies.length > 0);
const hall = perimeter.state.buildings[0], reachable = new Set([hall.z * 40 + hall.x]), queue = [{ x: hall.x, z: hall.z }];
for (let i = 0; i < queue.length; i++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const x = queue[i].x + dx, z = queue[i].z + dz, k = z * 40 + x;
  if (!perimeter.roads.valid(x, z) || reachable.has(k) || (perimeter.terrain.isWater(x, z) && !perimeter.roads.has(x, z))) continue;
  reachable.add(k); queue.push({ x, z });
}
assert(perimeter.state.zombies.every(z => !perimeter.terrain.isWater(z.x, z.z) && reachable.has(z.cell)), 'natural no-bridge spawns all have finite hall reachability');
for (let i = 0; i < 2400 && perimeter.state.phase === 'night'; i++) perimeter.update(.25);
assert.notEqual(perimeter.state.phase, 'night', 'natural no-bridge wave cannot stalemate on the unreachable bank');

const demolition = createSimulation({ size: 64, mode: 'defense', terrainLayout: 'river-v1' });
const row = 8, water = [];
for (let x = 0; x < 64; x++) if (demolition.terrain.isWater(x, row)) water.push(x);
const west = water[0] - 2, east = water.at(-1) + 3;
assert(applyTool(demolition, 'bridge', { x: west, z: row }, { x: east, z: row }).ok);
const defenderHome = build(demolition, 'residential', east, row + 1);
demolition.state.phase = 'night';
demolition.state.defenders = [{ id: 100, home: defenderHome.id, x: water[0], z: row, cooldown: 1000 }];
demolition.state.zombies = [
  { id: 101, x: water[0], z: row, cell: row * 64 + water[0], hp: 60, cooldown: 1000, move: null },
  { id: 102, x: west, z: row, cell: row * 64 + west, hp: 60, cooldown: 1000, move: null }
];
assert(applyTool(demolition, 'bulldoze', { x: water[0], z: row }).ok);
demolition.update(.25);
for (const a of [...demolition.state.defenders, ...demolition.state.zombies]) {
  assert(!demolition.terrain.isWater(Math.round(a.x), Math.round(a.z)), 'removed deck rehomes stranded walkers onto dry lots');
  assert(!demolition.buildingAt(Math.round(a.x), Math.round(a.z)), 'rehome does not occupy buildings');
}
assert(demolition.state.zombies.every(z => z.x > demolition.terrain.centerAt(z.z)), 'disconnected enemies are rehomed to the reachable hall bank');
assert.equal(demolition.state.kills, 0); assert.equal(demolition.state.score, 0);
console.log('CONSTRUCTION RIVER AGENTS PASS: reachable dry perimeter spawns; natural no-bridge wave resolves; bridge-only defender routing, reachable siege crossing and dry non-building rehome after deck demolition');
console.log('CONSTRUCTION CHECK PASS');
