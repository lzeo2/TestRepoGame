// Run: node scripts/citisten_save_resume_check.mjs
// CPU only: real simulation/persistence/roads/native-loop, no GPU or browser fixture.
import assert from 'node:assert/strict';
import { createSimulation, BUILDINGS } from '../Games/Citisten3D/sim.mjs';
import { applyTool } from '../Games/Citisten3D/native-actions.mjs';
import { RoadGrid } from '../Games/Citisten3D/roads.mjs';
import { SAVE_KEY, saveTown, readSave } from '../Games/Citisten3D/persistence.mjs';
import { createNativeLoop } from '../Games/Citisten3D/native-loop.mjs';

const memory = new Map();
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const tool = (sim, type, from, to = from) => {
  const result = applyTool(sim, type, from, to);
  assert.equal(result.ok, true, `${type}: ${result.reason}`);
  return result;
};
// Minimal counterpart of the existing native PLAN: one paid crossing and five sites.
const sim = createSimulation({ size: 200, seed: 3, scenario: 'balanced', mode: 'free',
  expansionEnabled: true, terrainLayout: 'river-v1', timedConstruction: true, progressionEnabled: true });
sim.setSpeed(0);
const z = 103, wet = Array.from({ length: 200 }, (_, x) => x).filter(x => sim.terrain.isWater(x, z));
const a = { x: wet[0] - 2, z }, b = { x: wet.at(-1) + 1, z };
const bridgeCost = wet.length * 90 + (b.x - a.x + 1 - wet.length) * 10, initialBudget = sim.state.budget;
tool(sim, 'bridge', a, b);
assert.equal(sim.state.budget, initialBudget - bridgeCost);
assert.equal(sim.roads.path(a, b).length, b.x - a.x + 1);
tool(sim, 'road', b, { x: b.x + 4, z });
const lots = [['water', a.x, z - 1], ['residential', b.x, z - 1], ['commercial', b.x + 1, z - 1],
  ['power', b.x + 2, z + 1], ['park', b.x + 3, z + 1]];
for (const [type, x, z] of lots) {
  const budget = sim.state.budget; tool(sim, type, { x, z });
  assert.equal(sim.state.budget, budget - BUILDINGS[type].cost);
}
const water = sim.buildingAt(a.x, z - 1);
assert.equal(water.constructionPaidCost, 1000); assert.equal(water.constructionTotal, 10);
assert.equal(water.constructionRemaining, 10);
const pausedSites = sim.snapshot(); sim.update(.5);
assert.deepEqual(sim.snapshot(), pausedSites, 'five sites paused for 500ms equivalent');
sim.setSpeed(1); sim.update(9.75);
assert.equal(water.constructionRemaining, .25); assert.equal(sim.state.water.supply, 0);
sim.update(.25); assert.equal(water.constructionRemaining, 0);
assert.equal(sim.state.water.supply, BUILDINGS.water.supply);
// Public update is the simulation's public stepping API; step itself is private.
let growthSteps = 0;
for (; growthSteps < 480 && (sim.state.population < 12 || sim.state.progressionLevel < 1); growthSteps++) sim.update(.25);
assert(sim.state.population >= 12 && sim.state.progressionLevel === 1, 'natural stage 1 within 120 simulated seconds');
for (const [type, x, z] of lots) {
  const site = sim.buildingAt(x, z);
  assert.equal(site.type, type); assert.equal(site.constructionRemaining, 0);
  assert(site.powered && site.watered, `${type} supplied across connected roads`);
}
console.log(`PASS 1/5 paid bridge=$${bridgeCost}, Water=$1000/10s, five paused sites, natural pop=${sim.state.population} stage=1 t=${sim.state.time}`);

const apartmentLot = { x: b.x + 4, z: z - 1 }, budget = sim.state.budget;
tool(sim, 'apartments', apartmentLot);
const apartment = sim.buildingAt(apartmentLot.x, apartmentLot.z), apartmentId = apartment.id;
assert.equal(sim.state.budget, budget - BUILDINGS.apartments.cost);
assert.equal(apartment.constructionTotal, 12); assert.equal(apartment.constructionPaidCost, BUILDINGS.apartments.cost);
sim.update(1.75); sim.setSpeed(0);
assert.equal(apartment.constructionRemaining, 10.25);
assert(apartment.constructionRemaining > 0 && apartment.constructionRemaining < 12);
const midpoint = sim.snapshot();
// Exact Menu Save boundary, with selected speed zero, through real storage API.
assert.deepEqual(saveTown(sim, { storage, speed: 0 }), { ok: true, error: '' });
const savedBytes = memory.get(SAVE_KEY), saved = readSave(storage);
assert.equal(saved.error, ''); assert.deepEqual(saved.snapshot, midpoint);
const freshRoads = new RoadGrid(200); freshRoads.set(0, 0);
const restored = createSimulation({ snapshot: saved.snapshot, roads: freshRoads });
assert.notEqual(restored, sim); assert.notEqual(restored.roads, sim.roads);
assert.equal(restored.roads, freshRoads); assert(!freshRoads.has(0, 0));
assert.deepEqual(restored.snapshot(), midpoint, 'complete authoritative snapshot including currency/ledger/economy/development/incidents/clocks/remaining/roads');
assert.deepEqual(restored.roads.path(a, b), sim.roads.path(a, b));
assert.equal(restored.state.expansionEnabled, true); assert.equal(restored.state.economy.seed, 3);
assert.equal(restored.state.economy.scenario, 'balanced'); assert.equal(restored.state.speed, 0);
console.log('PASS 2/5 real saveTown/readSave/createSimulation JSON round trip, fresh roads, exact partial=10.25/12 and selected speed=0');

// Deliver timestamps to the real scheduler. No DOM, render, RAF availability or wall-time claim.
const frames = new Map(), deltas = [], renderDeltas = [];
let frameId = 0;
const loop = createNativeLoop({ isHidden: () => false,
  requestFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelFrame: id => frames.delete(id),
  update(dt) {
    deltas.push(dt); restored.update(dt); // Production ordering: full dt reaches sim before rendering clamp.
    renderDeltas.push(Math.min(.25, dt));
    return restored.state.speed > 0;
  } });
function callback(ms) {
  assert.equal(frames.size, 1, 'one scheduler owner');
  const [id, fn] = frames.entries().next().value; frames.delete(id); fn(ms);
}
loop.wake(); callback(0); callback(500);
assert.deepEqual(restored.snapshot(), midpoint, 'Continue selected speed zero preserves ALL state over 500ms CPU clock');
callback(2500); assert.equal(frames.size, 0, 'paused scheduler sleeps');
restored.setSpeed(10); loop.wake();
const completionWindowStart = 3000;
callback(completionWindowStart);
assert.equal(deltas.at(-1), 0, 'first callback after wake has dt0');
assert.equal(restored.buildingAt(apartmentLot.x, apartmentLot.z).constructionRemaining, 10.25);
callback(4025);
assert.equal(deltas.at(-1), 1.025); assert.equal(renderDeltas.at(-1), .25);
assert(4025 - completionWindowStart <= 5000, 'original 5s window, simulated clock ONLY');
assert.equal(restored.state.time, midpoint.state.time + 10.25);
assert.equal(restored.buildingAt(apartmentLot.x, apartmentLot.z).constructionRemaining, 0);
sim.setSpeed(10); sim.update(1.025);
assert.deepEqual(restored.snapshot(), sim.snapshot(), 'full 10.25 simulation seconds, not 2.5 render-clamped seconds');
assert.equal(memory.get(SAVE_KEY), savedBytes, 'resuming never overwrites saved partial');
loop.stop(); assert.equal(frames.size, 0);
console.log('PASS 3/5 Continue CPU pause=500ms, idle wake dt0 then dt=1.025 at10x: 10.25 -> 0 within simulated 1025ms/5000ms; render clamp=.25 only');

// One bounded replay beyond completion, with three real persistence checkpoints while partial.
const oracle = createSimulation({ snapshot: midpoint });
let replay = createSimulation({ snapshot: readSave(storage).snapshot, roads: new RoadGrid(200) });
const cancelLot = { x: b.x + 3, z: z - 1 };
for (const city of [oracle, replay]) { city.setSpeed(1); tool(city, 'park', cancelLot); }
const cancelledId = oracle.buildingAt(cancelLot.x, cancelLot.z).id;
let checkpoints = 0;
for (let i = 0; i < 48; i++) {
  oracle.update(.25); replay.update(.25);
  if (i === 2) for (const city of [oracle, replay]) {
    const site = city.buildingAt(cancelLot.x, cancelLot.z), before = city.state.budget;
    assert(site.constructionRemaining > 0);
    assert.equal(tool(city, 'bulldoze', cancelLot).refund, site.constructionPaidCost * .75);
    assert.equal(city.state.budget, before + site.constructionPaidCost * .75);
    const cancelled = city.snapshot();
    assert.equal(applyTool(city, 'bulldoze', cancelLot).ok, false);
    assert.deepEqual(city.snapshot(), cancelled, 'second cancellation cannot refund or emit twice');
  }
  if ([0, 4, 12].includes(i)) {
    assert(replay.buildingAt(apartmentLot.x, apartmentLot.z).constructionRemaining > 0);
    assert(saveTown(replay, { storage }).ok);
    const loaded = readSave(storage); assert.equal(loaded.error, '');
    replay = createSimulation({ snapshot: loaded.snapshot, roads: new RoadGrid(200) }); checkpoints++;
  }
  assert.deepEqual(replay.snapshot(), oracle.snapshot(), `full replay snapshot at quarter ${i + 1}`);
}
const notices = replay.snapshot().runtime.events;
assert.equal(notices.filter(e => e.type === 'construction-complete' && e.id === apartmentId).length, 1);
assert.equal(notices.filter(e => e.type === 'construction-cancelled' && e.id === cancelledId).length, 1);
assert.equal(notices.filter(e => e.type === 'construction-complete' && e.id === cancelledId).length, 0);
assert.equal(replay.buildingAt(apartmentLot.x, apartmentLot.z).constructionRemaining, 0);
console.log(`PASS 4/5 deterministic full-snapshot replay: 48 quarters/12s, ${checkpoints} partial storage reloads, completion once, 75% cancellation once`);

// Two relevant trust-boundary corruptions only; existing suites cover legacy migration.
for (const mutate of [s => { s.state.economy.cumulative.importCost = -1; },
  s => { s.state.buildings.find(b => b.id === apartmentId).constructionRemaining = 10.1; }]) {
  const bad = structuredClone(midpoint); mutate(bad);
  memory.set(SAVE_KEY, JSON.stringify(bad));
  const roads = new RoadGrid(200); roads.set(0, 0);
  const cells = roads.cells, version = roads.version, contents = [...cells], bytes = memory.get(SAVE_KEY);
  const loaded = readSave(storage); assert.equal(loaded.error, '');
  assert.throws(() => createSimulation({ snapshot: loaded.snapshot, roads }), RangeError);
  assert.equal(roads.cells, cells); assert.equal(roads.version, version); assert.deepEqual([...cells], contents);
  assert.equal(memory.get(SAVE_KEY), bytes, 'rejection must not rewrite stored slot');
}
console.log('PASS 5/5 invalid economy ledger/partial clock rejected before road identity/cells/version mutation; stored bytes preserved');
console.log('SAVE RESUME PASS groups=5/5; CPU ONLY, not WebGL/native input/pixels/FPS or Water/SaveContinue acceptance');
