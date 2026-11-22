import assert from 'node:assert/strict';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';

const road = (id, points, nodes) => ({ id, name: id, type: 'residential', width: 8, speed: 50, oneway: 1, points, nodes });
const fixture = {
  bounds: { minX: -250, maxX: 600, minZ: -250, maxZ: 250 },
  buildings: [], spawn: { x: -190, z: -190, yaw: 0 },
  roads: [road('east', [[-100, 0], [500, 0]], [1, 2])],
};
function setup(map = fixture, options = {}) {
  const horns = [];
  const sim = createSimulation(map, { trafficCount: 1, seed: 17, ...options, onTrafficHorn: event => horns.push(event) });
  const car = sim.traffic[0];
  return { sim, car, horns };
}
function putDriverAndPlayer({ sim, car }, {
  edge = sim.graph.edges[0], position = 130, separation = 11, playerSide = 4.2, lateral = -5,
  along = 9, speed = 11, altitude,
} = {}) {
  Object.assign(car, pointOnLane(edge, position), { edge, position, active: true, speed, overtake: 0, anger: 0 });
  const ahead = pointOnLane(edge, position + separation);
  const vx = edge.dx * along + edge.dz * lateral, vz = edge.dz * along - edge.dx * lateral;
  Object.assign(sim.player, {
    x: ahead.x + edge.dz * playerSide, z: ahead.z - edge.dx * playerSide,
    yaw: Math.atan2(-vx, -vz), vx, vz, speed: Math.hypot(vx, vz), steer: 0, y: altitude,
  });
}
const positive = setup();
putDriverAndPlayer(positive);
const before = { x: positive.car.x, z: positive.car.z };
positive.sim.step(0);
assert.equal(positive.horns.length, 0, 'paused traffic emits no reaction');
positive.sim.step(.05);
assert.deepEqual(positive.horns, [{ id: positive.car.id, ...before, reason: 'cut-in' }]);
assert.equal(positive.car.honks, 1);
assert(positive.car.speed < 10.6 && positive.car.speed > 0, 'the driver brakes promptly without teleporting to a stop');
assert(positive.sim.canOccupy(positive.car), 'the nearby forecast operates before body contact');
assert(positive.car.overtakeCooldown >= 1, 'the driver will not immediately swerve into an overtake');
for (let i = 0; i < 4; i++) {
  putDriverAndPlayer(positive);
  positive.sim.step(.05);
}
assert.equal(positive.horns.length, 1, 'one driver has one audible reaction during its cooldown');
Object.assign(positive.sim.player, { x: -190, z: -190, vx: 0, vz: 0 });
for (let i = 0; i < 110; i++) positive.sim.step(.05);
putDriverAndPlayer(positive);
positive.sim.step(.05);
assert.equal(positive.horns.length, 2, 'a fresh close cut-in after the cooldown is audible');

for (const control of [
  { label: 'parallel pass', lateral: 0 },
  { label: 'leaving the lane', lateral: 5 },
  { label: 'ample following distance', separation: 23 },
  { label: 'behind the driver', separation: -7 },
  { label: 'slow player manoeuvre', along: 2, lateral: -3 },
  { label: 'slow driver', speed: 4 },
  { label: 'different bridge level', altitude: 8 },
]) {
  const probe = setup(fixture, { vehicleHeightAt: () => 0 });
  putDriverAndPlayer(probe, control);
  probe.sim.step(.05);
  assert.equal(probe.horns.length, 0, control.label + ' produces no immediate horn');
  assert.equal(probe.car.overtakeCooldown, 0, control.label + ' does not arm cut-in response');
}

const signalMap = {
  ...fixture,
  roads: [
    road('east', [[-100, 0], [0, 0], [100, 0]], [1, 2, 3]),
    road('south', [[0, -100], [0, -6], [0, 0], [0, 100]], [4, 5, 2, 6]),
  ],
  trafficSignals: { version: 1, signals: [{ id: '2', sourceId: 'node/2', x: 0, z: 0, tags: { highway: 'traffic_signals' } }] },
};
const red = setup(signalMap);
const edge = red.sim.graph.edges.find(edge => edge.road.id === 'south');
putDriverAndPlayer(red, { edge, position: 54 });
assert(Number.isFinite(red.sim.trafficLights.stopDistance(red.car)), 'fixture approaches a red signal');
red.sim.step(.05);
assert.equal(red.horns.length, 0, 'signal approach keeps priority over shouting at a cut-in');
assert.equal(red.car.overtakeCooldown, 0);

console.log('PASS traffic cut-ins: proactive physical braking, audible traffic callback, one horn per cooldown, safe passes, slow traffic, other levels, and red signal priority');
