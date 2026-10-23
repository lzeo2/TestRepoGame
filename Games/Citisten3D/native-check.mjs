import assert from 'node:assert/strict';
import { createSimulation } from './sim.mjs';
import { applyTool, syncModels } from './native-actions.mjs';
import { createNativeLoop } from './native-loop.mjs';
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

// Fake rAF proves sleep leaves no polling callback, without launching a browser.
const frames = new Map(), deltas = [], loopSim = createSimulation({ size: 20 });
let nextFrame = 0, hidden = false, paused = true, shots = 0;
const loop = createNativeLoop({
  requestFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
  cancelFrame(id) { frames.delete(id); },
  isHidden: () => hidden,
  update(dt) {
    deltas.push(dt);
    if (!paused) loopSim.update(dt);
    const pendingShots = shots > 0;
    shots = Math.max(0, shots - Math.min(.25, dt));
    return (!paused && loopSim.state.speed > 0 && loopSim.state.phase !== 'lost') || pendingShots;
  },
});
function step(now) {
  assert.equal(frames.size, 1, 'exactly one scheduled frame');
  const [id, fn] = frames.entries().next().value; frames.delete(id); fn(now);
}
hidden = true; loop.wake();
assert.equal(frames.size, 0, 'hidden startup schedules no work');
assert.equal(deltas.length, 0);
hidden = false; loop.wake(); loop.wake();
step(0); step(1000); step(1999); step(2000);
assert.equal(frames.size, 0, 'paused unchanged scene stops rendering and polling after 2s');
loop.wake(); step(10000);
assert.equal(deltas.at(-1), 0, 'input wakes without catching up idle time');
paused = false; loopSim.setSpeed(0);
step(11000); step(12000);
assert.equal(frames.size, 0, 'speed 0 also sleeps');
assert.equal(loopSim.state.time, 0);
loopSim.setSpeed(1); loop.wake(); step(13000); step(18000);
assert.equal(deltas.at(-1), 5, 'active simulation keeps the full frame delta');
assert.equal(loopSim.state.time, 5);
assert.equal(frames.size, 1, 'real simulation never sleeps');
hidden = true; loop.suspend(); loop.wake();
assert.equal(frames.size, 0, 'hidden cancels rAF and refuses input wakes');
const count = deltas.length;
hidden = false; loop.wake(); step(100000);
assert.equal(deltas.length, count + 1);
assert.equal(deltas.at(-1), 0, 'visibility resumes immediately without hidden-time catch-up');
assert.equal(loopSim.state.time, 5);
// Guard a queued callback too, if visibility changed before its event was handled.
hidden = true; step(101000);
assert.equal(deltas.length, count + 1, 'hidden callback does no simulation/render work');
assert.equal(frames.size, 0);
hidden = false; paused = true; shots = .14; loop.wake(); step(200000); step(200100); step(200200);
assert.equal(shots, 0, 'pending shots settle while paused');
step(200300); step(202200);
assert.equal(frames.size, 0, 'sleeps only after effects have settled');
loop.wake(); step(300000); step(301000);
loop.wake(); step(302000);
assert.equal(frames.size, 1, 'real input refreshes the idle deadline');
step(304000);
assert.equal(frames.size, 0);
loop.wake(); loop.stop(); loop.wake();
assert.equal(frames.size, 0, 'cleanup cancels work permanently');
console.log('NATIVE LOOP PASS: static skip, speed 0, input wake, active delta, hidden/resume, pending shots and cleanup');
