// Independent integration checks; fixtures below are not native gameplay proof.
import assert from 'node:assert/strict';
import { createSimulation, BUILDINGS } from './sim.mjs';
import { applyTool } from './native-actions.mjs';
import { BUILD_TIMES } from './city-content.mjs';
import { getStage, unlocked } from './progression.mjs';
import { RoadGrid } from './roads.mjs';
import { footprintLots } from './footprints.mjs';

let failed = 0;
function check(name, test) {
  try { test(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.stack}`); }
}
const production = options => createSimulation({ size: 40, terrainLayout: 'river-v1', timedConstruction: true, progressionEnabled: true, ...options });
const place = (sim, type, x, z) => {
  const result = sim.place(type, x, z); assert.equal(result.ok, true, `${type} ${x},${z}: ${result.reason}`); return result.building;
};
const tool = (sim, type, from, to = from) => {
  const result = applyTool(sim, type, from, to); assert.equal(result.ok, true, `${type}: ${result.reason}`); return result;
};
const run = (sim, seconds) => { for (let i = 0; i < seconds * 4; i++) sim.update(.25); };

check('river placement and all-footprint atomic rejection', () => {
  const sim = production(), hall = sim.state.buildings[0];
  assert.equal(sim.terrain.layout, 'river-v1');
  for (const p of footprintLots(hall)) {
    assert(!sim.terrain.isWater(p.x, p.z));
    assert.equal(sim.buildingAt(p.x, p.z).id, hall.id);
    const before = sim.snapshot();
    assert.equal(applyTool(sim, 'road', p).ok, false);
    assert.deepEqual(sim.snapshot(), before);
  }
  const wet = Array.from({ length: 40 }, (_, x) => ({ x, z: 7 })).find(p => sim.terrain.isWater(p.x, p.z));
  for (const p of [wet, { x: -1, z: 7 }, { x: 40, z: 7 }, { x: 2.5, z: 7 }]) {
    const before = sim.snapshot(); assert.equal(sim.place('park', p.x, p.z).ok, false); assert.deepEqual(sim.snapshot(), before);
  }
  const before = sim.snapshot();
  assert.equal(sim.place('river_pump', 35, 5).ok, false);
  assert.equal(sim.place('apartments', 30, 5).ok, false);
  assert.deepEqual(sim.snapshot(), before);
});

check('full bank bridge route, utilities and removal disconnection', () => {
  const sim = production({ timedConstruction: false, progressionEnabled: false }), z = 10;
  const wet = Array.from({ length: 40 }, (_, x) => x).filter(x => sim.terrain.isWater(x, z));
  const a = { x: wet[0] - 2, z }, b = { x: wet.at(-1) + 2, z };
  for (const [type, end] of [['road', b], ['bridge', { x: wet[0], z }], ['bridge', { ...b, z: z + 1 }]]) {
    const before = sim.snapshot(); assert.equal(applyTool(sim, type, a, end).ok, false); assert.deepEqual(sim.snapshot(), before);
  }
  const budget = sim.state.budget;
  tool(sim, 'bridge', a, b);
  assert.equal(sim.state.budget, budget - wet.length * 90 - (b.x - a.x + 1 - wet.length) * 10);
  const paid = sim.state.budget; tool(sim, 'bridge', a, b); assert.equal(sim.state.budget, paid);
  assert.equal(sim.roads.path(a, b).length, b.x - a.x + 1);
  place(sim, 'power', a.x, z - 1); place(sim, 'water', a.x + 1, z - 1);
  const home = place(sim, 'residential', b.x, z - 1);
  run(sim, 1); assert(home.powered && home.watered);
  createSimulation({ snapshot: sim.snapshot() });
  for (const removed of [{ x: wet[0], z }, { x: wet[0] - 1, z }]) {
    tool(sim, 'bulldoze', removed); run(sim, 1);
    assert(wet.every(x => !sim.roads.has(x, z)));
    assert.equal(sim.roads.path(a, b).length, 0);
    assert(!home.powered && !home.watered, 'both utility networks disconnect');
    tool(sim, 'bridge', a, b); run(sim, 1); assert(home.powered && home.watered);
  }
  tool(sim, 'bulldoze', { x: wet[0], z });
  sim.spend(sim.state.budget);
  const before = sim.snapshot(); assert.equal(applyTool(sim, 'bridge', a, b).ok, false); assert.deepEqual(sim.snapshot(), before);
});

check('construction pause, 1x/3x/10x, exact completion and cancellation', () => {
  for (const speed of [1, 3, 10]) {
    const sim = production(); sim.setSpeed(0);
    const before = sim.state.budget, site = place(sim, 'power', 30, 10);
    assert.equal(sim.state.budget, before - BUILDINGS.power.cost);
    assert.equal(site.constructionRemaining, BUILD_TIMES.power);
    const paused = sim.snapshot(); sim.update(30); assert.deepEqual(sim.snapshot(), paused);
    sim.setSpeed(speed); sim.update(3 / speed);
    assert.equal(site.constructionRemaining, BUILD_TIMES.power - 3);
    assert.equal(sim.state.power.supply, 0); assert.equal(sim.state.upkeep, BUILDINGS.townhall.upkeep);
    assert(!site.powered && !site.watered && !site.serviced && !site.residents);
    assert.equal(sim.place('park', 30, 10).ok, false, 'site reserves footprint');
    sim.update((BUILD_TIMES.power - 3 - .25) / speed);
    assert.equal(site.constructionRemaining, .25); assert.equal(sim.state.power.supply, 0);
    sim.update(.25 / speed); assert.equal(site.constructionRemaining, 0); assert.equal(sim.state.power.supply, BUILDINGS.power.supply);
    assert.equal(sim.drainEvents().filter(e => e.type === 'construction-complete' && e.id === site.id).length, 1);
    sim.update(1 / speed); assert.equal(sim.drainEvents().filter(e => e.type === 'construction-complete').length, 0);
    const completedBudget = sim.state.budget; assert.equal(sim.bulldoze(30, 10).refund, 0); assert.equal(sim.state.budget, completedBudget);
    const cancel = place(sim, 'water', 30, 10), paid = sim.state.budget;
    assert.equal(sim.bulldoze(30, 10).refund, cancel.constructionPaidCost * .75);
    assert.equal(sim.state.budget, paid + BUILDINGS.water.cost * .75);
    const cancelledBudget = sim.state.budget; assert.equal(sim.bulldoze(30, 10).ok, false); assert.equal(sim.state.budget, cancelledBudget);
  }
});

check('strict midpoint snapshot continuity and rejection before RoadGrid mutation', () => {
  const sim = production(), site = place(sim, 'power', 30, 10); run(sim, 6); sim.setSpeed(0);
  const midpoint = sim.snapshot(), restored = createSimulation({ snapshot: midpoint });
  assert.equal(restored.state.buildings.find(b => b.id === site.id).constructionRemaining, 6);
  restored.update(50); assert.deepEqual(restored.snapshot(), midpoint);
  sim.setSpeed(3); restored.setSpeed(3); sim.update(2); restored.update(2); assert.deepEqual(restored.snapshot(), sim.snapshot());
  const shared = new RoadGrid(40); shared.set(1, 1); const identity = shared.cells, version = shared.version;
  for (const mutate of [
    b => { b.constructionRemaining = -1; }, b => { b.constructionRemaining = 6.1; },
    b => { b.constructionRemaining = b.constructionTotal + .25; }, b => { delete b.constructionTotal; },
    b => { b.constructionPaidCost = -1; }, b => { b.powered = true; }, b => { b.residents = 1; }
  ]) {
    const bad = structuredClone(midpoint); mutate(bad.state.buildings.find(b => b.id === site.id));
    assert.throws(() => createSimulation({ roads: shared, snapshot: bad }), RangeError);
    assert.equal(shared.cells, identity); assert.deepEqual([...shared.cells], [41]); assert.equal(shared.version, version);
  }
});

check('cumulative progression thresholds exclude inactive and disconnected lots', () => {
  const lot = (type, extra = {}) => ({ type, hp: 100, powered: true, watered: true, ...extra });
  const state = { population: 11.99, progressionLevel: 0, buildings: [lot('residential'), lot('commercial'), lot('power'), lot('water'), lot('park'), lot('police')], power: { supply: 80, demand: 5, unserved: 0 }, water: { supply: 100, demand: 5, unserved: 0 } };
  for (const [population, expected] of [[11.99, 0], [12, 1], [59.99, 1], [60, 2], [149.99, 2], [150, 3]]) {
    state.population = population; assert.equal(getStage(state).level, expected);
  }
  state.buildings[0].constructionRemaining = .25; assert.equal(getStage(state).level, 0);
  delete state.buildings[0].constructionRemaining; state.buildings[1].hp = 0; assert.equal(getStage(state).level, 0);
  state.buildings[1].hp = 100; state.power.unserved = 1; assert.equal(getStage(state).level, 1);
  state.power.unserved = 0; state.buildings[4].watered = false; assert.equal(getStage(state).level, 2);
  state.progressionLevel = 3; state.population = 0; assert.equal(getStage(state).level, 3); assert(unlocked('school', state));
});

check('naturally earned highwater and grants do not repeat after setback/load', () => {
  const sim = production();
  tool(sim, 'road', { x: 18, z: 23 }, { x: 28, z: 23 });
  tool(sim, 'road', { x: 18, z: 23 }, { x: 20, z: 22 });
  place(sim, 'power', 24, 24); place(sim, 'water', 25, 24); place(sim, 'commercial', 23, 22);
  place(sim, 'residential', 21, 22); place(sim, 'residential', 22, 22); place(sim, 'residential', 24, 22);
  place(sim, 'park', 26, 24); place(sim, 'park', 27, 24);
  sim.drainEvents(); const earned = [];
  for (let i = 0; i < 240 && sim.state.progressionLevel < 3; i++) {
    const budget = sim.state.budget; sim.update(1);
    const rewards = sim.drainEvents().filter(e => e.type === 'stage-earned');
    earned.push(...rewards);
    assert(Math.abs(sim.state.budget - budget - sim.state.netIncome - rewards.reduce((n, e) => n + e.grant, 0)) < 1e-8);
  }
  assert.deepEqual(earned.map(e => [e.level, e.grant]), [[1, 300], [2, 500], [3, 750]]);
  sim.bulldoze(24, 24); sim.bulldoze(25, 24); run(sim, 5); sim.drainEvents();
  const restored = createSimulation({ snapshot: sim.snapshot() }); run(restored, 5);
  assert.equal(restored.state.progressionLevel, 3); assert(unlocked('school', restored.state));
  assert.equal(restored.drainEvents().filter(e => e.type === 'stage-earned').length, 0);
});

check('old completed flat snapshots override production new-game flags', () => {
  const old = createSimulation({ size: 40 }); const building = place(old, 'power', 3, 3); assert.equal(building.constructionRemaining, 0);
  old.drainEvents(); const snapshot = old.snapshot();
  for (const key of ['terrainLayout', 'timedConstruction', 'progressionEnabled', 'progressionLevel']) delete snapshot.state[key];
  for (const b of snapshot.state.buildings) for (const key of ['constructionRemaining', 'constructionTotal', 'constructionPaidCost']) delete b[key];
  const restored = production({ snapshot });
  assert.equal(restored.terrain.layout, 'legacy-flat'); assert.equal(restored.state.timedConstruction, false); assert.equal(restored.state.progressionEnabled, false);
  tool(restored, 'road', { x: 4, z: 5 });
  assert.equal(place(restored, 'apartments', 4, 4).constructionRemaining, 0);
  run(restored, 1); assert.equal(restored.state.power.supply, 80);
});

console.log(`RIVER UPGRADE CHECK: ${7 - failed}/7 passed (headless integration, not browser acceptance)`);
process.exitCode = failed ? 1 : 0;
