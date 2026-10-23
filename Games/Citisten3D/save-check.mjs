import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';
import { RoadGrid } from './roads.mjs';
import { SAVE_KEY, readSave, saveTown } from './persistence.mjs';

const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.deepEqual(readSave(storage), { snapshot: null, error: '' });
for (const mode of ['free', 'defense']) {
  const sim = createSimulation({ size: 24, seed: 19, mode });
  sim.roads.place({ x: 5, z: 11 }, { x: 19, z: 11 });
  for (const [type, x, z] of [['power', 6, 10], ['water', 7, 10], ['residential', 11, 10], ['commercial', 14, 10], ['park', 12, 10], ['watchtower', 10, 12]]) assert(sim.place(type, x, z).ok);
  sim.setTaxRate(.12);
  for (let i = 0; i < (mode === 'free' ? 281 : 973); i++) sim.update(.25);
  sim.update(.13); // Fractional fixed-step accumulator must survive JSON.
  sim.setSpeed(3); sim.drainEvents();
  const before = sim.snapshot();
  assert(saveTown(sim, { storage }).ok);
  const saved = readSave(storage); assert.equal(saved.error, '');
  const roads = new RoadGrid(24);
  roads.set(0, 0); // Loading replaces, rather than appends to, an existing grid.
  const restored = createSimulation({ size: 24, roads, snapshot: saved.snapshot });
  assert.equal(restored.roads, roads, 'renderer and simulation share the provided grid');
  assert.deepEqual(restored.snapshot(), before, `${mode} JSON round trip`);
  for (const seconds of [.1, .17, 1.25, 2, .13]) {
    sim.update(seconds); restored.update(seconds);
    assert.deepEqual(restored.state, sim.state, `${mode} future deterministic state`);
    assert.deepEqual(restored.drainEvents(), sim.drainEvents(), `${mode} future deterministic events`);
  }
  const detached = restored.snapshot(); detached.state.budget = -123;
  assert.notEqual(restored.state.budget, detached.state.budget, 'snapshot detached from live state');
  const corrupt = JSON.parse(memory.get(SAVE_KEY)); corrupt.state.buildings[0].x = -1;
  const previousRoads = [...roads.cells];
  assert.throws(() => createSimulation({ size: 24, roads, snapshot: corrupt }));
  assert.deepEqual([...roads.cells], previousRoads, 'rejected save does not mutate renderer roads');
  sim.setSpeed(0);
  assert(saveTown(sim, { storage, speed: 3 }).ok);
  assert.equal(readSave(storage).snapshot.state.speed, 3, 'menu pause saves selected speed');
  assert.equal(sim.state.speed, 0, 'saving does not unpause live town');
}
// Retained ruined hall and its recovery countdown must survive reload, too.
const siege = createSimulation({ size: 24, mode: 'defense', seed: 8 });
for (let i = 0; i < 2000 && !siege.state.rebuildRemaining; i++) siege.update(.25);
assert(siege.state.rebuildRemaining > 0, 'natural siege reaches rebuilding grace');
assert(saveTown(siege, { storage }).ok);
const grace = readSave(storage).snapshot;
const rebuilt = createSimulation({ snapshot: grace });
assert.deepEqual(rebuilt.snapshot(), siege.snapshot(), 'rebuilding round trip');
const hallId = siege.state.buildings.find(b => b.type === 'townhall').id;
assert.deepEqual(rebuilt.repair(hallId), siege.repair(hallId));
rebuilt.update(2); siege.update(2); assert.deepEqual(rebuilt.snapshot(), siege.snapshot(), 'loaded repair remains deterministic');
const expired = createSimulation({ snapshot: grace }); expired.update(121);
assert.equal(expired.state.phase, 'lost');
assert.deepEqual(createSimulation({ snapshot: expired.snapshot() }).snapshot(), expired.snapshot(), 'lost retained hall round trip');

const growing = createSimulation({ size: 24 });
growing.roads.place({ x: 5, z: 11 }, { x: 20, z: 11 });
for (const [type, x] of [['power', 5], ['water', 6], ['industrial', 7], ['commercial', 8]]) assert(growing.place(type, x, 10).ok);
for (let x = 9; x <= 20; x++) assert(growing.place('residential', x, 10).ok);
growing.update(600);
assert(growing.snapshot().runtime.milestone > 0, 'naturally earned milestone before save');
const milestoneCity = createSimulation({ snapshot: JSON.parse(JSON.stringify(growing.snapshot())) });
growing.update(20); milestoneCity.update(20);
assert.deepEqual(milestoneCity.snapshot(), growing.snapshot(), 'milestone high-water persists without duplicate rewards');

for (const json of ['{', '{}', '{"version":2}', 'x'.repeat(8_000_001)]) {
  memory.set(SAVE_KEY, json); const result = readSave(storage);
  assert.equal(result.snapshot, null); assert(result.error);
}
const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
assert(readSave(blocked).error.includes('denied'));
assert(saveTown(createSimulation({ size: 24 }), { storage: blocked }).error.includes('quota'));
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('getter denied'); } });
assert(readSave().error.includes('getter denied'));
assert(saveTown(createSimulation({ size: 24 })).error.includes('getter denied'));
if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
else delete globalThis.localStorage;
console.log('SAVE CHECK PASS: day/night JSON round trip, roads/buildings/economy/agents/clocks/RNG, deterministic continuation, detached state, invalid/corrupt/denied/quota handling, paused speed, rebuilding/repair/lost hall and one-shot milestone continuity');
