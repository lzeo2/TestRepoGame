import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';
import { applyTool, syncModels } from './native-actions.mjs';
const sim = createSimulation({ size: 20 });
const initial = sim.state.budget;
assert.equal(applyTool(sim, 'road', { x: 8, z: 10 }, { x: 12, z: 10 }).ok, false);
assert.equal(sim.state.budget, initial); assert.equal(sim.roads.cells.size, 0);
assert.equal(applyTool(sim, 'road', { x: 7, z: 8 }, { x: 12, z: 8 }).ok, true);
assert.equal(sim.state.budget, initial - 60);
assert.equal(applyTool(sim, 'road', { x: 7, z: 8 }, { x: 12, z: 8 }).ok, true);
assert.equal(sim.state.budget, initial - 60);
assert.equal(applyTool(sim, 'residential', { x: 8, z: 7 }).ok, true);
assert.equal(applyTool(sim, 'residential', { x: 0, z: 0 }).ok, false);
assert.equal(applyTool(sim, 'bulldoze', { x: 10, z: 10 }).ok, false);
assert.equal(applyTool(sim, 'road', null).ok, false);
const cache = new Map(); let spawned = 0, removed = 0, transformed = 0;
const world = { roads: sim.roads, buildings: {
  spawn(type, pose) { spawned++; return { type, pose }; },
  transform(handle, pose) { transformed++; handle.pose = pose; },
  remove() { removed++; }
} };
syncModels(world, sim.state, cache); syncModels(world, sim.state, cache);
assert.equal(spawned, 2); assert.equal(cache.size, 2);
sim.state.cars.push({ id: 99, x: 8.2, z: 8, heading: 1 });
syncModels(world, sim.state, cache); syncModels(world, sim.state, cache);
assert.equal(spawned, 3); assert.equal(transformed, 1);
assert.equal(cache.get('car:99').pose.rotation, 1);
assert.deepEqual(cache.get('car:99').pose, { ...sim.roads.center(8.2, 8), rotation: 1 });
assert.equal(applyTool(sim, 'bulldoze', { x: 8, z: 7 }).ok, true);
sim.state.cars.length = 0; syncModels(world, sim.state, cache);
assert.equal(removed, 2); assert.equal(cache.size, 1);
assert.equal(applyTool(sim, 'bulldoze', { x: 8, z: 8 }).ok, true);
assert.equal(sim.roads.has(8, 8), false);
console.log('NATIVE CHECK PASS: atomic road cost/occupancy, zone placement, protected hall, stable meshes, grid poses and removal');
