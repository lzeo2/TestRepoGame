import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';
import { applyTool, syncModels } from './native-actions.mjs';
import { footprintLots } from './footprints.mjs';

const sim = createSimulation({ size: 20 });
assert.equal(footprintLots(sim.state.buildings[0]).length, 9);
for (let z = 9; z <= 11; z++) for (let x = 9; x <= 11; x++) {
  const budget = sim.state.budget;
  assert.equal(sim.buildingAt(x, z).id, 1);
  assert.equal(sim.place('power', x, z).ok, false);
  assert.equal(applyTool(sim, 'road', { x: 0, z }, { x, z }).ok, false);
  assert.equal(sim.state.budget, budget, 'blocked drag spends nothing');
  assert.equal(sim.roads.cells.size, 0, 'blocked drag places nothing');
  assert.equal(sim.bulldoze(x, z).ok, false, 'all hall lots protected');
}
assert.equal(applyTool(sim, 'road', { x: 8, z: 8 }, { x: 12, z: 8 }).ok, true);
assert.equal(sim.place('power', 8, 9).ok, true);
sim.update(1);
assert(sim.state.buildings[0].powered, 'utility reaches occupied hall boundary');
sim.state.buildings[0].hp = 500; sim.state.townHallHp = 500;
assert.equal(applyTool(sim, 'repair', { x: 9, z: 9 }).cost, 40);
const restored = createSimulation({ snapshot: sim.snapshot() });
assert.equal(restored.buildingAt(11, 11).id, 1, 'reload reconstructs footprint occupancy');
const bad = sim.snapshot(); bad.roads.push(9 * 20 + 9);
assert.throws(() => createSimulation({ snapshot: bad, roads: sim.roads }));
assert.equal(sim.roads.has(9, 9), false, 'legacy overlapping saves rejected before mutating roads');
assert.equal(sim.bulldoze(8, 9).ok, true);
assert.equal(sim.place('water', 8, 9).ok, true, 'demolition releases occupied lots');

const close = (actual, expected) => assert(Math.abs(Math.sin(actual - expected)) < 1e-9 && Math.cos(actual - expected) > 0, `${actual} != ${expected}`);
for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
  const s = createSimulation({ size: 20, mode: 'defense' });
  const target = s.place('park', 6 + dx * 3, 6 + dz * 3).building;
  s.state.phase = 'night';
  s.state.defenders.push({ id: 100, x: 6, z: 6, cooldown: 10 });
  const x = target.x, z = target.z;
  s.state.zombies.push({ id: 101, x, z, cell: z * 20 + x, hp: 60, cooldown: 10,
    move: { x: x + dx, z: z + dz, key: (z + dz) * 20 + x + dx, progress: 0 } });
  s.update(.25);
  const heading = Math.atan2(-dx, -dz);
  close(s.state.defenders[0].heading, heading);
  close(s.state.zombies[0].heading, heading);
  const cache = new Map();
  syncModels({ roads: s.roads, buildings: { spawn: (type, pose) => ({ type, pose }) } }, s.state, cache);
  for (const key of ['citizen:100', 'zombie:101']) close(cache.get(key).pose.rotation, heading);
}

// Normal simulation trips, not API-only vehicle spawns.
const town = createSimulation({ size: 32, seed: 19 });
assert(applyTool(town, 'road', { x: 2, z: 6 }, { x: 25, z: 6 }).ok);
for (const [i, type] of ['power', 'water', 'park', 'police', 'fire', 'residential', 'commercial', 'industrial'].entries()) {
  assert(town.place(type, i + 3, 5).ok);
}
const seen = new Set(), cache = new Map(); let spawned = 0;
const world = { roads: town.roads, buildings: {
  spawn(type, pose) { spawned++; return { type, pose }; },
  transform(h, pose) { h.pose = pose; }, remove() {},
} };
for (let i = 0; i < 800; i++) {
  town.update(.25); syncModels(world, town.state, cache);
  for (const car of town.state.cars) {
    seen.add(car.vehicleType);
    assert.equal(cache.get(`car:${car.id}`).type, car.vehicleType);
  }
}
assert.deepEqual([...seen].sort(), ['car', 'patrol_car', 'utility_car']);
const before = spawned; syncModels(world, town.state, cache);
assert.equal(spawned, before, 'traffic variants retain stable model handles');
const snapshot = town.snapshot(), copy = createSimulation({ snapshot });
town.update(5); copy.update(5); assert.deepEqual(copy.snapshot(), town.snapshot());
const legacy = town.snapshot();
for (const car of legacy.state.cars) delete car.vehicleType;
assert.doesNotThrow(() => createSimulation({ snapshot: legacy }));
const invalid = town.snapshot(); assert(invalid.state.cars.length);
invalid.state.cars[0].vehicleType = 'townhall';
assert.throws(() => createSimulation({ snapshot: invalid }));
console.log('RUNTIME GAPS CHECK PASS: footprint placement/roads/repair/reload/utilities, four-way walker headings, all three natural traffic variants, stable handles and save validation');
