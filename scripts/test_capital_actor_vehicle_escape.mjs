import assert from 'node:assert/strict';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';

// Detached flat-world fixture: exercise the live shared actor/vehicle owner.
const map = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  roads: [], buildings: [], spawn: { x: 80, z: 80, yaw: 0 } };
function fixture(yaw = 0) {
  const simulation = createSimulation(map, { trafficCount: 0 });
  simulation.setExternalVehicles([{ id: 'contact-car', x: 0, z: 0, yaw, length: 4, width: 2 }]);
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  return { simulation, right, actor: { x: right.x * 1.2, z: right.z * 1.2 } };
}
for (const yaw of [0, Math.PI / 4, Math.PI / 2]) {
  const { simulation, right, actor } = fixture(yaw);
  const result = simulation.moveActor(actor, right.x * .1, right.z * .1, .45);
  assert(result.moved, 'an actor already overlapping a car can take a small outward step');
  assert(Math.abs(actor.x * right.x + actor.z * right.z - 1.3) < 1e-9);
  const inward = simulation.moveActor(actor, -right.x * .1, -right.z * .1, .45);
  assert(!inward.moved, 'existing contact cannot deepen into the vehicle');
  for (let i = 0; i < 5; i++) simulation.moveActor(actor, right.x * .1, right.z * .1, .45);
  assert(actor.x * right.x + actor.z * right.z > 1.7, 'successive outward steps leave contact');
}
const through = fixture();
assert(!through.simulation.moveActor(through.actor, -3, 0, .45).moved,
  'a request through the car cannot escape via its opposite side');
const clear = fixture(); clear.actor.x = 1.6;
clear.simulation.moveActor(clear.actor, -2, 0, .45);
assert(clear.actor.x >= 1.45 - 1e-9, 'ordinary approaching foot movement retains full vehicle clearance');
const tangent = fixture();
assert(!tangent.simulation.moveActor(tangent.actor, 0, .1, .45).moved,
  'motion with unchanged penetration cannot slide through an existing body');
const swimming = fixture();
assert(swimming.simulation.moveSwimmingActor(swimming.actor, .1, 0, .45).moved,
  'the shared swimming actor sweep permits the same outward escape');
const occupied = fixture();
assert(occupied.simulation.moveActor({ ...occupied.actor }, 0, 0, .45).blocked,
  'standing probes continue to reject occupied positions');
// Normal gameplay input reaches the same owner; introduce contact after reset
// to model a freshly registered hull, rather than bypassing its entry checks.
const live = createSimulation(map, { trafficCount: 0 });
const gameplay = createGameplay(map, live, { sandbox: true });
gameplay.reset({ sandbox: true, onFoot: true, startPose: { x: 1.2, z: 0, yaw: 0 } });
live.setParkedCars([{ id: 'parked-contact', x: 0, z: 0, yaw: 0, length: 4, width: 2 }]);
gameplay.step(1 / 60, { moveX: 1 });
assert(gameplay.state.actor.x > 1.2, 'ordinary gameplay walking escapes a refreshed parked body');
console.log('PASS actor vehicle escape: rotated outward steps, continued release, inward/through/tangent denial, clear approach, standing probes, swimming and gameplay walking');
