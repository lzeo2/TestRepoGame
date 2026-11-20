import assert from 'node:assert/strict';
import { createDrivingState, prepareDriving, measureDriving } from '../Games/Capital Drive/driving-dynamics.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const state = createDrivingState();
const request = { throttle: 1, steer: 0, forward: 20, boost: true };
for (let i = 0; i < 301; i++) prepareDriving(state, 1/60, request);
assert(state.nitroFuel >= 0 && state.nitroFuel < 1/300);
assert.equal(state.nitroActive, false, 'held boost cannot run on an empty tank');
for (const denied of [{ throttle: 0 }, { throttle: -1 }, { forward: -4 }, { brake: true }, { handbrake: true }, { airborne: true }]) {
  const fuel = createDrivingState();
  prepareDriving(fuel, 1/60, { ...request, ...denied });
  assert.equal(fuel.nitroActive, false);
  assert.equal(fuel.nitroFuel, 1, 'no fuel consumed without eligible forward acceleration');
}
for (let i = 0; i < 120; i++) measureDriving(state, 1/60, { forward: 20, lateral: 0, boost: false });
assert(Math.abs(state.nitroFuel - .1) < .004, 'refill follows supplied time');
const before = state.nitroFuel;
prepareDriving(state, .05, { throttle: 1, steer: 1, forward: 20, handbrake: true });
measureDriving(state, .05, { forward: 20, lateral: -7 });
assert(state.driftActive && state.slipAngle < 0);
assert(Math.abs(state.nitroFuel - before - .005) < 1e-12, 'actual slip doubles refill');
const catchSlide = prepareDriving(state, .05, { throttle: 1, steer: -1, forward: 20 });
assert.equal(catchSlide.lateralGrip, 4, 'opposite steering catches lateral slide');
measureDriving(state, .05, { forward: 20, lateral: 0 });
assert.equal(state.driftActive, false, 'button press alone is not a measured drift');

const map = { bounds: { minX: -4000, maxX: 4000, minZ: -4000, maxZ: 4000 },
  roads: [{ id: 'wide', name: 'test', type: 'residential', width: 1000, speed: 50,
    points: [[0,3000],[0,-3000]], nodes: [1,2] }], buildings: [], landmarks: [], spawn: { x: 0, z: 500, yaw: 0 } };
const drive = () => createSimulation(map, { trafficCount: 0 });
const advance = (sim, seconds, input) => { for(let i=0;i<Math.round(seconds*60);i++) sim.step(1/60,input); };
const normal = drive(), boosted = drive();
advance(normal, 2, { throttle: 1 }); advance(boosted, 2, { throttle: 1, boost: true });
assert(boosted.player.speed > normal.player.speed + 5, 'nitro delivers additional real acceleration');
assert(boosted.driving.nitroFuel < .61 && boosted.driving.nitroFuel > .59);
const grip = drive(), drift = drive();
for(const sim of [grip,drift]) advance(sim, 2, { throttle: 1 });
advance(grip,.65,{ throttle: 1, steer: 1 });
advance(drift,.65,{ throttle: 1, steer: 1, handbrake: true });
assert(drift.driving.driftActive);
assert(Math.abs(drift.driving.lateralSpeed) > Math.abs(grip.driving.lateralSpeed)*1.4);
assert(drift.player.speed > 10, 'deliberate drift retains useful forward travel');
const slip = Math.abs(drift.driving.slipAngle);
advance(drift,1.5,{ throttle: 1 });
assert(Math.abs(drift.driving.slipAngle)<slip*.2, 'release restores road grip');
const snapshot = { ...drift.driving };
drift.step(0,{ throttle: 1, boost: true, handbrake: true });
assert.deepEqual(drift.driving,snapshot,'pause freezes fuel and drift');
drift.reset();
assert.deepEqual(drift.driving,createDrivingState(),'world reset restores full fuel and clears assists');
console.log('PASS driving dynamics: bounded fuel, eligible boost, supplied-time refill, measured drift bonus, countersteer, physical acceleration/slide/recovery and pause/reset');
