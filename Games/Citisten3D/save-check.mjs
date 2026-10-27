import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';
import { RoadGrid } from './roads.mjs';
import { SAVE_KEY, readSave, saveTown } from './persistence.mjs';

const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.deepEqual(readSave(storage), { snapshot: null, error: '' });
for (const mode of ['free', 'defense']) {
  const sim = createSimulation({ size: 24, seed: 19, mode });
  sim.roads.place({ x: 5, z: 8 }, { x: 19, z: 8 });
  for (const [type, x, z] of [['power', 6, 7], ['water', 7, 7], ['residential', 11, 7], ['commercial', 14, 7], ['park', 12, 7], ['watchtower', 10, 12]]) assert(sim.place(type, x, z).ok);
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
growing.roads.place({ x: 5, z: 8 }, { x: 20, z: 8 });
growing.roads.place({ x: 10, z: 8 }, { x: 10, z: 11 });
for (const [type, x] of [['power', 5], ['water', 6], ['industrial', 7], ['commercial', 8]]) assert(growing.place(type, x, 7).ok);
for (let x = 9; x <= 20; x++) assert(growing.place('residential', x, 7).ok);
growing.update(600);
assert(growing.snapshot().runtime.milestone > 0, 'naturally earned milestone before save');
const milestoneCity = createSimulation({ snapshot: JSON.parse(JSON.stringify(growing.snapshot())) });
growing.update(20); milestoneCity.update(20);
assert.deepEqual(milestoneCity.snapshot(), growing.snapshot(), 'milestone high-water persists without duplicate rewards');
for (const tamper of [
  s => { s.state.rebuildRemaining = -1; },
  s => { s.runtime.milestone = 99; },
  s => { s.state.nextMilestone.grant++; },
  s => { s.state.growthDiagnosis = {}; },
  s => { s.state.buildings.find(b => b.type === 'townhall').hp = 0; s.state.townHallHp = 0; }
]) {
  const invalid = growing.snapshot(); tamper(invalid);
  assert.throws(() => createSimulation({ snapshot: invalid }), 'reject inconsistent milestone/recovery state');
}

// Keep notices queued across expiry, repair and later cycles: they need not still be active.
const civicCity = createSimulation({ size: 24, seed: 19 });
civicCity.roads.set(5, 6); assert(civicCity.place('commercial', 5, 5).ok);
civicCity.update(300);
const burst = civicCity.state.cityEvents.find(e => e.type === 'water-main-burst');
const [districtX, districtZ] = burst.district.split(',').map(Number);
assert(civicCity.repair(undefined, { x: districtX * 8, z: districtZ * 8 }).ok);
civicCity.update(1440);
const pendingCivic = civicCity.snapshot();
assert.equal(new Set(pendingCivic.runtime.events.filter(e => e.type === 'city-event-start').map(e => e.event.type)).size, 6);
assert(pendingCivic.runtime.events.some(e => e.type === 'city-event-end' && e.reason === 'expired'));
assert(pendingCivic.runtime.events.some(e => e.type === 'city-event-end' && e.reason === 'repaired'));
const shootingCity = createSimulation({ size: 12, mode: 'defense', seed: 8 });
assert(shootingCity.place('watchtower', 0, 1).ok);
shootingCity.update(240);
while (shootingCity.state.time < 300 && !shootingCity.snapshot().runtime.events.some(e => e.type === 'shot')) shootingCity.update(.25);
const liveShots = shootingCity.snapshot();
shootingCity.update(420 - shootingCity.state.time);
const pendingShots = shootingCity.snapshot();
assert(pendingShots.runtime.events.some(e => e.type === 'shot'), 'naturally pending shots, including historical targets');
function roundTrip(snapshot) {
  const loaded = createSimulation({ snapshot: JSON.parse(JSON.stringify(snapshot)) });
  assert.deepEqual(loaded.snapshot(), snapshot);
  const replay = createSimulation({ snapshot });
  loaded.update(1); replay.update(1);
  assert.deepEqual(loaded.snapshot(), replay.snapshot(), 'pending notices preserve deterministic continuation');
}
roundTrip(pendingCivic); roundTrip(pendingShots);
function rejectAtomically(base, tamper, label) {
  const invalid = structuredClone(base); tamper(invalid);
  const stored = JSON.stringify(invalid); memory.set(SAVE_KEY, stored);
  const roads = new RoadGrid(base.state.size); roads.set(0, 0);
  const cells = roads.cells, previous = [...cells], version = roads.version;
  assert.throws(() => createSimulation({ roads, snapshot: readSave(storage).snapshot }), RangeError, label);
  assert.equal(roads.cells, cells, `${label}: road set identity`);
  assert.deepEqual([...roads.cells], previous, `${label}: road cells`);
  assert.equal(roads.version, version, `${label}: road version`);
  assert.equal(memory.get(SAVE_KEY), stored, `${label}: stored slot unchanged`);
}
rejectAtomically(pendingCivic, s => { s.state.buildings.find(b => b.type === 'commercial').heading = Math.PI / 4; }, 'reject rotated building');
const zeroHeading = structuredClone(pendingCivic);
zeroHeading.state.buildings.forEach(b => { b.heading = 0; }); roundTrip(zeroHeading);
const movingHeading = structuredClone(liveShots);
assert(movingHeading.state.zombies.length > 0);
movingHeading.state.zombies[0].heading = Math.PI / 4; roundTrip(movingHeading);
// Three crash-inducing missing payloads, plus numeric/world and civic-definition boundaries.
for (const type of ['shot', 'city-event-start', 'city-event-end']) {
  rejectAtomically(pendingCivic, s => { s.runtime.events.push({ type, time: s.state.time }); }, `missing ${type} payload`);
}
const civicNotice = type => s => s.runtime.events.find(e => e.type === type);
for (const [label, tamper] of [
  ['unknown civic definition', s => { civicNotice('city-event-start')(s).event.type = 'unknown'; }],
  ['changed civic title', s => { civicNotice('city-event-start')(s).event.title = 'Forged'; }],
  ['changed civic description', s => { civicNotice('city-event-start')(s).event.description = null; }],
  ['changed civic duration', s => { civicNotice('city-event-end')(s).event.durationTicks++; }],
  ['invalid civic id', s => { civicNotice('city-event-end')(s).event.id = 'civic-999'; }],
  ['district beyond grid', s => { civicNotice('city-event-start')(s).event.district = '3,0'; }],
  ['future civic start', s => { civicNotice('city-event-start')(s).event.startTick = s.state.tick + 960; }],
  ['invalid end reason', s => { civicNotice('city-event-end')(s).reason = 'unknown'; }],
  ['expiry before duration', s => { civicNotice('city-event-end')(s).time = 299.75; }],
  ['invalid blackout flag', s => { s.runtime.events.push({ type: 'blackout', time: 0, active: 1 }); }],
  ['invalid wave number', s => { s.runtime.events.push({ type: 'wave', time: 0, night: -1 }); }],
  ['invalid milestone grant', s => { s.runtime.events.push({ type: 'milestone', time: 0, population: 500, name: 'First neighborhood', grant: -1 }); }],
  ['invalid rebuild cost', s => { s.runtime.events.push({ type: 'hall-rebuilt', time: 0, cost: -1 }); }],
  ['eager UI numeric coercion', s => { s.runtime.events.push({ type: 'placed', time: 0, night: { toString: 0 } }); }],
  ['eager UI name coercion', s => { s.runtime.events.push({ type: 'placed', time: 0, name: { toString: 0 } }); }],
  ['future notice time', s => { civicNotice('city-event-start')(s).time = s.state.time + .25; }],
]) rejectAtomically(pendingCivic, tamper, label);
const shot = s => s.runtime.events.find(e => e.type === 'shot');
for (const [label, tamper] of [
  ['missing shot destination', s => { delete shot(s).to; }],
  ['nonnumeric shot coordinate', s => { shot(s).from.x = '0'; }],
  ['negative shot coordinate', s => { shot(s).to.z = -Number.EPSILON; }],
  ['shot at exclusive grid edge', s => { shot(s).to.x = s.state.size; }],
  ['invalid shot source', s => { shot(s).source = 'unknown'; }],
]) rejectAtomically(pendingShots, tamper, label);
const edgeShot = structuredClone(pendingShots);
shot(edgeShot).from = { x: 0, z: 0 };
shot(edgeShot).to = { x: edgeShot.state.size - 1e-9, z: edgeShot.state.size - 1e-9 };
roundTrip(edgeShot);
const edgeDistrict = structuredClone(pendingCivic);
civicNotice('city-event-start')(edgeDistrict).event.district = '2,2'; roundTrip(edgeDistrict);
console.log('SAVE PAYLOAD PASS: rotated-building rejection; absent/zero building and moving headings; natural pending shots/all six civic starts/expired/repaired ends; payload/world/district boundaries; rejected loads preserve road cells/version and stored slot');

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
