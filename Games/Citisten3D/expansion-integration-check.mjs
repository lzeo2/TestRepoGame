import assert from 'node:assert/strict';
import { createSimulation, BUILDINGS } from './sim.mjs';
import { RoadGrid } from './roads.mjs';
import { applyTool } from './native-actions.mjs';
import { effectiveBuilding, TECHNOLOGIES } from './development.mjs';
import { incidentEffectMap, incidentEffects } from './incidents.mjs';
import { validateEconomy } from './production.mjs';

// Real simulation/API fixtures only. Mutated saves below are isolated rejection tests.
const started = performance.now(), cpuStart = process.cpuUsage();
// Optional substring selects an independent group for bounded failure diagnosis.
const filter = process.argv[2] || '';
const copy = value => JSON.parse(JSON.stringify(value));
const near = (a, b, label) => assert(Math.abs(a - b) < 1e-7, `${label}: ${a} != ${b}`);
const neutral = { powerOut: false, waterOut: false, productionMultiplier: 1, unsafe: false };
let passed = 0, failed = 0, corruptions = 0, quarterChecks = 0;
const naturalIncidents = new Map(), industrialOutages = [], metrics = [];
function check(label, run) {
  if (filter && !label.includes(filter)) return;
  try { run(); passed++; console.log(`PASS ${label}`); }
  catch (error) { failed++; console.error(`FAIL ${label}: ${error.stack}`); }
}
function rejected(sim, run) {
  const before = sim.snapshot();
  assert.equal(run().ok, false);
  assert.deepEqual(sim.snapshot(), before, 'rejected action must be fully atomic');
}
function paid(sim, run, cost) {
  const budget = sim.state.budget, stocks = copy(sim.state.economy.stocks);
  const result = run(); assert.equal(result.ok, true, result.reason);
  assert.equal(result.cost, cost); assert.equal(sim.state.budget, budget - cost);
  assert.deepEqual(sim.state.economy.stocks, stocks, 'actions cannot reset stocks');
  return result;
}
function place(sim, type, x, z) {
  const budget = sim.state.budget, result = applyTool(sim, type, { x, z });
  assert.equal(result.ok, true, `${type}@${x},${z}: ${result.reason}`);
  assert.equal(sim.state.budget, budget - BUILDINGS[type].cost);
  return sim.buildingAt(x, z);
}
function starter(seed = 0, scenario = 'balanced', homes = 1) {
  const sim = createSimulation({ size: 40, seed, scenario, roads: new RoadGrid(40),
    expansionEnabled: true, timedConstruction: true, progressionEnabled: true });
  for (const [from, to] of [[{ x: 12, z: 16 }, { x: 28, z: 16 }],
    [{ x: 12, z: 18 }, { x: 28, z: 18 }], [{ x: 12, z: 16 }, { x: 12, z: 18 }]]) {
    assert(applyTool(sim, 'road', from, to).ok);
  }
  for (let z = 19; z <= 21; z++) for (let x = 19; x <= 21; x++) assert(!sim.roads.has(x, z));
  place(sim, 'power', 13, 17); place(sim, 'water', 14, 17);
  for (let i = 0; i < homes; i++) place(sim, 'residential', 15 + i, 17);
  place(sim, 'industrial', 18, 17); place(sim, 'commercial', 22, 17);
  place(sim, 'park', 27, 17);
  return sim;
}
function until(sim, predicate, seconds = 150) {
  const end = sim.state.time + seconds;
  while (!predicate() && sim.state.time < end) sim.update(.25);
  assert(predicate(), `natural condition not reached at t=${sim.state.time}, pop=${sim.state.population}`);
}
function finite(sim) {
  const s = sim.state, e = s.economy;
  validateEconomy(s);
  for (const key of ['population', 'budget', 'income', 'upkeep', 'netIncome', 'morale', 'housingCapacity', 'jobs']) assert(Number.isFinite(s[key]), key);
  assert(s.budget >= 0 && s.population >= 0 && s.morale >= 0 && s.morale <= 1);
  for (const good of ['food', 'materials', 'goods']) {
    assert(e.stocks[good] >= 0 && e.stocks[good] <= e.storage[good]);
    assert(e.exportable[good] >= 0 && e.exportable[good] <= e.stocks[good]);
  }
  for (const b of s.buildings) assert(b.hp > 0 && b.hp <= b.maxHp && b.residents >= 0);
}
function effects(sim) {
  const map = incidentEffectMap(sim.state);
  for (const b of sim.state.buildings) {
    assert.deepEqual(sim.effectsFor(b), map.get(b.id) || neutral);
    assert.deepEqual(sim.effectsFor(b), incidentEffects(sim.state, b));
  }
  quarterChecks++;
}
function observe(sim) {
  if (!sim.state.incidents.active.length) return;
  effects(sim);
  for (const event of sim.state.incidents.active) {
    if (!naturalIncidents.has(event.type)) naturalIncidents.set(event.type, sim.snapshot());
    if (event.type === 'outage' && !industrialOutages.length && event.buildingIds.some(id =>
      ['industrial', 'workshop'].includes(sim.state.buildings.find(b => b.id === id)?.type))) industrialOutages.push(sim.snapshot());
    for (const id of event.buildingIds) {
      const b = sim.state.buildings.find(b => b.id === id); assert(b);
      assert(event.tiles.some(p => p.x === b.x && p.z === b.z));
      if (event.type === 'outage') assert.equal(sim.effectsFor(b).productionMultiplier, 0);
    }
  }
}
function flowSecond(sim) {
  const before = sim.snapshot(); sim.update(1);
  const s = sim.state, e = s.economy;
  assert.equal(s.tick, before.state.tick + 4);
  // No grants can occur in these capped, already-progressed windows.
  assert.equal(s.progressionLevel, before.state.progressionLevel);
  assert.equal(s.nextMilestone?.population, before.state.nextMilestone?.population);
  near(s.budget - before.state.budget, s.netIncome, 'budget delta');
  near(s.netIncome, s.income - s.upkeep - e.last.importCost, 'net');
  near(s.income, e.breakdown.taxIncome + e.breakdown.serviceIncome + e.last.exportRevenue, 'gross');
  near(e.last.importCost, e.imported.food * 1.4 + e.imported.materials * 2.2, 'import debit');
  near(e.last.exportRevenue, e.exported.food + e.exported.materials * 1.5 + e.exported.goods * 6, 'sales');
  assert(e.last.importCost <= Math.max(0, before.state.budget - s.upkeep) + 1e-7, 'upkeep reserved before imports');
  for (const good of ['food', 'materials', 'goods']) {
    near(before.state.economy.stocks[good] + e.produced[good] + e.imported[good] - e.consumed[good] - e.exported[good], e.stocks[good], `${good} conservation`);
    assert(e.exported[good] <= e.demand[good] * (s.development.completed.includes('logistics') ? 1.25 : 1) * Math.min(1, before.state.population / 100) + 1e-7);
  }
  if (e.exported.food > 0) assert(e.stocks.food >= before.state.population * .0008 * 2 - 1e-7, 'household reserve cannot be sold');
  finite(sim);
}
let earned, midpoint;
check('natural seed-zero starter, prerequisites, paid planning/branch and exact paused midwork restore', () => {
  const sim = starter();
  assert.equal(sim.state.population, 0);
  rejected(sim, () => sim.research('planning'));
  rejected(sim, () => sim.research('agronomy'));
  rejected(sim, () => sim.specialize('agriculture'));
  rejected(sim, () => applyTool(sim, 'upgrade', { x: 15, z: 17 }));
  rejected(sim, () => applyTool(sim, 'road', { x: 19, z: 20 }, { x: 22, z: 20 }));
  until(sim, () => sim.state.population >= 12);
  assert.equal(sim.state.progressionLevel, 1);
  paid(sim, () => sim.research('planning'), 300);
  rejected(sim, () => sim.research('planning'));
  sim.update(12); assert.deepEqual(sim.state.development.completed, ['planning']);
  place(sim, 'workshop', 23, 17); sim.update(10);
  until(sim, () => sim.state.population >= 30);
  paid(sim, () => sim.research('agronomy'), 650);
  paid(sim, () => applyTool(sim, 'upgrade', { x: 23, z: 17 }), 210);
  rejected(sim, () => sim.upgrade(23, 17));
  sim.update(3.25); sim.setSpeed(0); midpoint = sim.snapshot();
  assert(midpoint.state.development.active.remaining > 0);
  assert(midpoint.state.buildings.find(b => b.type === 'workshop').upgradeRemaining > 0);
  sim.update(500); assert.deepEqual(sim.snapshot(), midpoint);
  const restored = createSimulation({ snapshot: copy(midpoint) }); assert.deepEqual(restored.snapshot(), midpoint);
  restored.setSpeed(1); restored.update(24);
  assert.deepEqual(restored.state.development.completed, ['planning', 'agronomy']);
  assert.equal(restored.buildingAt(23, 17).level, 1);
  paid(restored, () => restored.upgrade(23, 17), 420); restored.update(24);
  assert.equal(restored.buildingAt(23, 17).level, 2);
  rejected(restored, () => restored.upgrade(23, 17));
  rejected(restored, () => restored.research('fabrication'));
  until(restored, () => restored.state.population >= 64);
  assert(restored.state.progressionLevel >= 2);
  assert.equal(restored.state.housingCapacity, 64);
  finite(restored); earned = restored.snapshot();
  console.log(`  natural pop=${restored.state.population} stage=${restored.state.progressionLevel} t=${restored.state.time} budget=${restored.state.budget.toFixed(3)}`);
});
check('midwork large update, quarter steps, 10x and deterministic replay agree exactly', () => {
  assert(midpoint, 'natural midpoint required');
  const sims = Array.from({ length: 4 }, () => createSimulation({ snapshot: copy(midpoint) }));
  for (const sim of sims) sim.setSpeed(1);
  sims[0].update(40);
  for (let i = 0; i < 160; i++) sims[1].update(.25);
  sims[2].setSpeed(10); sims[2].update(4); sims[2].setSpeed(1);
  for (let i = 0; i < 40; i++) sims[3].update(1);
  for (const sim of sims.slice(1)) assert.deepEqual(sim.snapshot(), sims[0].snapshot());
  assert.deepEqual(starter().snapshot(), starter().snapshot());
});
check('effective upgrade output, health unchanged, upkeep/utilities and goods replace base industry income', () => {
  assert(earned, 'naturally earned save required');
  const sim = createSimulation({ snapshot: copy(earned) });
  const workshop = sim.buildingAt(23, 17), effective = effectiveBuilding(BUILDINGS.workshop, workshop, sim.state);
  assert.equal(workshop.hp, BUILDINGS.workshop.hp); assert.equal(effective.jobs, BUILDINGS.workshop.jobs * 1.5);
  assert.equal(effective.power, BUILDINGS.workshop.power * 1.6);
  assert.equal(effective.upkeep, BUILDINGS.workshop.upkeep * 1.8);
  paid(sim, () => sim.upgrade(13, 17), 1050); sim.update(12);
  assert.equal(sim.buildingAt(13, 17).level, 1);
  // Outputs are aggregated on whole economy seconds, not the quarter-step completion.
  sim.update(.75); assert.equal(sim.state.power.supply, 100);
  for (let i = 0; i < 5; i++) flowSecond(sim);
  const s = sim.state;
  const festival = b => s.cityEvents.some(e => e.type === 'street-festival' && e.district === `${Math.floor(b.x / 8)},${Math.floor(b.z / 8)}`) ? 1.25 : 1;
  const expectedServices = s.buildings.filter(b => b.powered && b.watered && !b.constructionRemaining && !['industrial', 'workshop'].includes(b.type))
    .reduce((n, b) => n + (BUILDINGS[b.type].income || 0) * Math.min(1, s.population / 32) * festival(b), 0);
  near(s.economy.breakdown.serviceIncome, expectedServices, 'only commercial service income');
  assert(s.economy.produced.goods > 0);
  paid(sim, () => sim.specialize('agriculture'), 120);
  paid(sim, () => sim.specialize('agriculture'), 0);
  paid(sim, () => sim.specialize('balanced'), 80);
  rejected(sim, () => sim.specialize('manufacturing'));
  rejected(sim, () => sim.research('__proto__'));
});
check('real spending exhausts import funds without grants, negative cash or stock reset', () => {
  assert(earned);
  const sim = createSimulation({ snapshot: copy(earned) });
  sim.update(.75); flowSecond(sim);
  assert(sim.state.economy.last.importCost > 0, 'natural workshop requires imported materials');
  const stocks = copy(sim.state.economy.stocks);
  assert(sim.spend(sim.state.budget)); assert.equal(sim.state.budget, 0);
  assert.deepEqual(sim.state.economy.stocks, stocks);
  sim.update(1); assert.equal(sim.state.economy.last.importCost, 0);
  near(sim.state.budget, Math.max(0, sim.state.netIncome), 'zero-cash exact net clamp');
  assert(sim.state.economy.bottlenecks.includes('Import budget'));
  finite(sim);
});
check('explicit legacy false preserved; missing legacy flag migrates only with expansion override', () => {
  const legacy = createSimulation({ size: 40, seed: 0 }); legacy.update(2);
  assert.equal(legacy.state.expansionEnabled, false);
  const explicit = createSimulation({ snapshot: legacy.snapshot(), expansionEnabled: true });
  assert.equal(explicit.state.expansionEnabled, false); assert.equal(explicit.state.economy, undefined);
  const old = legacy.snapshot(); delete old.state.expansionEnabled;
  assert.equal(createSimulation({ snapshot: old }).state.expansionEnabled, false);
  const migrated = createSimulation({ snapshot: old, expansionEnabled: true });
  assert.equal(migrated.state.expansionEnabled, true); assert.equal(migrated.state.economy.seed, 0);
  assert(migrated.state.incidents.nextTick > migrated.state.tick);
  migrated.update(.25); finite(migrated);
  assert.deepEqual(createSimulation({ snapshot: migrated.snapshot() }).snapshot(), migrated.snapshot());
});
function strategy(name, seed, scenario) {
  const sim = starter(seed, scenario, 3);
  until(sim, () => sim.state.population >= 12);
  paid(sim, () => sim.research('planning'), 300); sim.update(12);
  place(sim, 'workshop', 23, 17); place(sim, 'industrial', 24, 17); place(sim, 'workshop', 25, 17);
  sim.update(10); until(sim, () => sim.state.population >= 30);
  const tech = name === 'agriculture' ? 'agronomy' : name === 'manufacturing' ? 'fabrication' : 'logistics';
  if (tech === 'logistics') until(sim, () => sim.state.population >= 40);
  paid(sim, () => sim.research(tech), TECHNOLOGIES[tech].cost); sim.update(TECHNOLOGIES[tech].duration);
  if (name !== 'balanced') paid(sim, () => sim.specialize(name), name === 'agriculture' ? 120 : 180);
  const totals = { gross: 0, net: 0, imports: 0, foodImports: 0, pollution: 0, morale: 0, samples: 0 };
  // Run every actual quarter step, checking every incident target against both public APIs.
  while (sim.state.time < 600) {
    sim.update(.25); observe(sim);
    if (sim.state.tick % 4 === 0) {
      finite(sim); const s = sim.state, e = s.economy;
      totals.gross += s.income; totals.net += s.netIncome; totals.imports += e.last.importCost;
      totals.foodImports += e.imported.food; totals.pollution += e.pollution; totals.morale += s.morale; totals.samples++;
    }
  }
  metrics.push({ strategy: name, seed, scenario, seconds: sim.state.time,
    budget: +sim.state.budget.toFixed(3), grossPerSec: +(totals.gross / totals.samples).toFixed(5), netPerSec: +(totals.net / totals.samples).toFixed(5),
    imports: +totals.imports.toFixed(3), foodImports: +totals.foodImports.toFixed(3),
    pollution: +(totals.pollution / totals.samples).toFixed(5), morale: +(totals.morale / totals.samples).toFixed(5),
    population: +sim.state.population.toFixed(3), research: sim.state.development.completed, resourceFactors: sim.state.economy.multipliers });
  console.log(`  METRIC ${JSON.stringify(metrics.at(-1))}`);
}
for (const [name, seed, scenario] of [['agriculture', 0, 'fertile'], ['manufacturing', 17, 'mineral'], ['balanced', 42, 'balanced']]) {
  check(`600s natural ${name} path, finite capped stocks and scheduled effects`, () => strategy(name, seed, scenario));
}
check('housing-led agriculture, manufacturing and balanced paths cover operating costs with real tradeoffs', () => {
  const rows = [];
  for (const [policy, seed, scenario] of [['agriculture', 0, 'fertile'], ['manufacturing', 17, 'mineral'], ['balanced', 42, 'balanced']]) {
    const sim = starter(seed, scenario, 3);
    for (let x = 15; x < 20; x++) place(sim, 'residential', x, 15);
    until(sim, () => sim.state.population >= 12);
    paid(sim, () => sim.research('planning'), 300); sim.update(12);
    place(sim, 'workshop', 23, 17); place(sim, 'industrial', 24, 17); place(sim, 'workshop', 25, 17);
    sim.update(10); until(sim, () => sim.state.population >= 30);
    const tech = policy === 'agriculture' ? 'agronomy' : policy === 'manufacturing' ? 'fabrication' : 'logistics';
    until(sim, () => sim.state.population >= TECHNOLOGIES[tech].population);
    paid(sim, () => sim.research(tech), TECHNOLOGIES[tech].cost); sim.update(TECHNOLOGIES[tech].duration);
    paid(sim, () => sim.specialize(policy), policy === 'agriculture' ? 120 : policy === 'manufacturing' ? 180 : 0);
    while (sim.state.time < 600) sim.update(.25);
    let net = 0, pollution = 0, imports = 0, morale = 0;
    for (let i = 0; i < 300; i++) {
      sim.update(1); finite(sim);
      net += sim.state.netIncome; pollution += sim.state.economy.pollution;
      imports += sim.state.economy.imported.food; morale += sim.state.morale;
    }
    const row = { policy, homes: 8, population: sim.state.population, netPerSec: net / 300,
      pollution: pollution / 300, foodImports: imports, morale: morale / 300 };
    assert(row.netPerSec > 0, `${policy} must cover actual upkeep and imports, not just keep starting cash`);
    rows.push(row); console.log(`  HOUSING METRIC ${JSON.stringify(row)}`);
  }
  assert(rows[0].pollution < rows[1].pollution && rows[0].foodImports < rows[1].foodImports && rows[0].morale > rows[1].morale);
});
check('scheduled outage suppresses actual production and paid response restores target utility exactly once', () => {
  assert(industrialOutages.length, 'natural industrial outage required');
  const save = industrialOutages[0], blocked = createSimulation({ snapshot: copy(save) }), recovered = createSimulation({ snapshot: copy(save) });
  const event = recovered.state.incidents.active.find(e => e.type === 'outage');
  assert.deepEqual(recovered.snapshot(), save);
  paid(recovered, () => recovered.respondIncident(event.id), 70);
  rejected(recovered, () => recovered.respondIncident(event.id));
  for (const id of event.buildingIds) {
    const b = recovered.state.buildings.find(b => b.id === id);
    assert.deepEqual(recovered.effectsFor(b), neutral); assert(b.powered);
  }
  blocked.update(1); recovered.update(1);
  assert(blocked.state.economy.produced.goods + blocked.state.economy.produced.materials < recovered.state.economy.produced.goods + recovered.state.economy.produced.materials, 'outage must reduce real production');
  effects(blocked); effects(recovered);
  console.log(`  outage ${event.id} targets=${event.buildingIds.join(',')} production blocked=${JSON.stringify(blocked.state.economy.produced)} resolved=${JSON.stringify(recovered.state.economy.produced)}`);
});
check('scheduled fire damages real health, expires finitely, supplied fire station improves recovery', () => {
  assert(naturalIncidents.has('fire'), 'natural fire required');
  const save = naturalIncidents.get('fire'), uncovered = createSimulation({ snapshot: copy(save) }), covered = createSimulation({ snapshot: copy(save) });
  const event = save.state.incidents.active.find(e => e.type === 'fire');
  assert.deepEqual(uncovered.snapshot(), save);
  uncovered.setSpeed(0); const paused = uncovered.snapshot(); uncovered.update(100);
  assert.deepEqual(uncovered.snapshot(), paused); uncovered.setSpeed(1);
  place(covered, 'fire', 26, 17);
  const first = event.buildingIds[0], initialHp = uncovered.state.buildings.find(b => b.id === first).hp;
  let uncoveredSteps = 0, coveredSteps = 0;
  while (uncovered.state.incidents.active.some(e => e.id === event.id) && uncoveredSteps < 240) { uncovered.update(.25); effects(uncovered); uncoveredSteps++; }
  while (covered.state.incidents.active.some(e => e.id === event.id) && coveredSteps < 240) { covered.update(.25); effects(covered); coveredSteps++; }
  assert(coveredSteps < uncoveredSteps && uncoveredSteps < 240);
  const a = uncovered.state.buildings.find(b => b.id === first), b = covered.state.buildings.find(b => b.id === first);
  assert(a.hp < initialHp && b.hp > a.hp); assert.deepEqual(uncovered.effectsFor(a), neutral);
  assert(covered.drainEvents().some(e => e.type === 'incident-end' && e.id === event.id && e.reason === 'services'));
  const paidResponse = createSimulation({ snapshot: copy(save) });
  paid(paidResponse, () => paidResponse.respondIncident(event.id), 90);
  rejected(paidResponse, () => paidResponse.respondIncident(event.id));
  console.log(`  fire ${event.id} unserved=${uncoveredSteps / 4}s coveredIncludingConstruction=${coveredSteps / 4}s hp=${a.hp.toFixed(4)}/${b.hp.toFixed(4)}`);
});
check('river-bank real placements schedule floods, lose water, recover and accept paid response', () => {
  let flooded;
  for (let seed = 0; seed < 4 && !flooded; seed++) {
    const sim = createSimulation({ size: 40, seed, expansionEnabled: true, terrainLayout: 'river-v1', timedConstruction: true });
    // Real dry-bank industrial placements, no forced hazard or scheduler mutation.
    for (let z = 8; z < 18; z += 2) {
      let x = Math.ceil(sim.terrain.centerAt(z));
      while (sim.terrain.isWater(x, z)) x++;
      assert(applyTool(sim, 'road', { x: x + 1, z }).ok);
      place(sim, 'industrial', x, z);
    }
    until(sim, () => sim.state.incidents.active.length > 0, 185);
    if (sim.state.incidents.active[0].type === 'flood') flooded = sim.snapshot();
  }
  assert(flooded, 'scheduled flood not found in bounded seeds 0..3');
  const sim = createSimulation({ snapshot: copy(flooded) }); assert.deepEqual(sim.snapshot(), flooded);
  const event = sim.state.incidents.active[0]; naturalIncidents.set('flood', flooded);
  for (const id of event.buildingIds) {
    const b = sim.state.buildings.find(b => b.id === id);
    assert(sim.effectsFor(b).waterOut && sim.effectsFor(b).unsafe);
  }
  sim.update(1);
  for (const id of event.buildingIds) assert.equal(sim.state.buildings.find(b => b.id === id).watered, false);
  const resolved = createSimulation({ snapshot: copy(flooded) });
  paid(resolved, () => resolved.respondIncident(event.id), 110); rejected(resolved, () => resolved.respondIncident(event.id));
  const end = sim.state.time + 60;
  while (sim.state.incidents.active.some(e => e.id === event.id) && sim.state.time < end) { sim.update(.25); effects(sim); }
  assert(!sim.state.incidents.active.some(e => e.id === event.id));
  effects(sim);
  for (const id of event.buildingIds) assert.deepEqual(sim.effectsFor(sim.state.buildings.find(b => b.id === id)), neutral);
  console.log(`  flood seed=${flooded.state.economy.seed} targets=${event.buildingIds.join(',')} finiteRecovery=${sim.state.time - flooded.state.time}s`);
});
check('active-incident snapshots reject corrupt development/economy/hazards before caller roads mutate', () => {
  assert(naturalIncidents.size, 'natural active snapshot required');
  const base = naturalIncidents.values().next().value;
  const changes = [
    s => { s.state.expansionEnabled = 'true'; }, s => { s.state.development.completed.push('fabricated'); },
    s => { s.state.development.branch = 'manufacturing'; }, s => { s.state.economy.stocks.food = -1; },
    s => { s.state.economy.stocks.goods = 121; }, s => { s.state.economy.exportable.food = 201; },
    s => { s.state.economy.multipliers.food = 99; }, s => { s.state.economy.cumulative.importCost = -1; },
    s => { s.state.incidents.active[0].buildingIds = [1]; }, s => { s.state.incidents.active[0].tiles[0].x = 40; },
    s => { s.state.incidents.active[0].remaining = .1; }, s => { s.state.incidents.active[0].severity = 2; },
    s => { s.state.incidents.active[0].startTick = s.state.tick + 1; }, s => { s.state.incidents.nextTick = s.state.tick + 2000; },
    s => { s.state.incidents.active[0].buildingIds.push(s.state.incidents.active[0].buildingIds[0]); },
    s => { s.state.buildings[1].upgradeRemaining = 12; }, s => { s.state.economy.breakdown.netIncome = NaN; }
  ];
  for (const mutate of changes) {
    const bad = copy(base); mutate(bad);
    const roads = new RoadGrid(40); roads.set(0, 0); const identity = roads.cells, cells = [...roads.cells], version = roads.version;
    assert.throws(() => createSimulation({ snapshot: bad, roads }), RangeError);
    assert.equal(roads.cells, identity); assert.deepEqual([...roads.cells], cells); assert.equal(roads.version, version); corruptions++;
  }
  assert(midpoint);
  for (const mutate of [s => { s.state.development.active.paidCost = 0; }, s => { s.state.development.active.remaining = .1; },
    s => { s.state.buildings.find(b => b.type === 'workshop').upgradePaidCost = 0; }]) {
    const bad = copy(midpoint); mutate(bad); const roads = new RoadGrid(40); roads.set(1, 1); const identity = roads.cells, version = roads.version;
    assert.throws(() => createSimulation({ snapshot: bad, roads }), RangeError);
    assert.equal(roads.cells, identity); assert.deepEqual([...roads.cells], [41]); assert.equal(roads.version, version); corruptions++;
  }
});
check('seed/scenario choices affect actual resource factors and private event schedule', () => {
  const a = starter(0, 'fertile'), b = starter(17, 'mineral'), replay = starter(0, 'fertile');
  assert.deepEqual(a.snapshot(), replay.snapshot());
  assert.notDeepEqual(a.state.economy.multipliers, b.state.economy.multipliers);
  assert.notDeepEqual(a.state.economy.opportunities, b.state.economy.opportunities);
  assert.notEqual(a.state.incidents.nextTick, b.state.incidents.nextTick);
  a.update(2); replay.update(2); assert.deepEqual(a.snapshot(), replay.snapshot());
});
if (!passed && !failed) { failed++; console.error(`FAIL no group matches ${JSON.stringify(filter)}`); }
const cpu = process.cpuUsage(cpuStart);
console.log(`INTEGRATION ${failed ? 'FAIL' : 'PASS'}${filter ? ` SELECTED(${filter})` : ''} groups=${passed}/${passed + failed} corruptionRejections=${corruptions} targetQuarterChecks=${quarterChecks} cpuSeconds=${((cpu.user + cpu.system) / 1e6).toFixed(3)} wallSeconds=${((performance.now() - started) / 1000).toFixed(3)}`);
console.log('LIMITS: headless actual API only; full strategy groups vary policy+seed+scenario together, not controlled balance or native/visual acceptance; no population/research/budget grants.');
process.exitCode = failed ? 1 : 0;
