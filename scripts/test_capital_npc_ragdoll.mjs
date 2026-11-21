import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createPedestrians } from '../Games/Capital Drive/pedestrians.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  roads: [{ id: 'street', name: 'Fixture Street', type: 'residential', width: 8, points: [[-350, 0], [350, 0]] }],
  buildings: [], spawn: { x: 0, z: 0, yaw: 0 }, landmarks: [] };
const observer = { x: 0, z: -100, speed: 0 };
function fixture(buildings = [], pedestrianBuildings = buildings) {
  const world = { ...map, buildings }, scene = new THREE.Scene();
  const simulation = createSimulation(world, { trafficCount: 0 });
  Object.assign(simulation.player, { x: 400, z: 400 });
  let sweeps = 0;
  const people = createPedestrians(scene, { ...world, buildings: pedestrianBuildings }, () => 0, { moveActor: (actor, dx, dz, radius) => {
    sweeps++; return simulation.moveActor(actor, dx, dz, radius);
  } });
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) people.update(observer, 1 / 60); };
  const contact = (target, speed = 28, extra = {}) => ({ targetId: `ped:${target.id}`, offenderId: 'traffic:test',
    speed, vx: 0, vz: -speed, interiorId: null, ...extra });
  return { people, scene, simulation, tick, contact, get sweeps() { return sweeps; } };
}
const fast = fixture(), target = fast.people.snapshot()[0];
fast.simulation.setExternalPeople(fast.people.writeContacts());
const car = { id: 'traffic:test', modelId: 'lantern', x: target.x, z: target.z + 5, yaw: 0,
  speed: 28, vx: 0, vz: -28, active: true };
fast.simulation.setExternalVehicles([car]);
assert(fast.simulation.moveVehicle(car, 0, -6).blocked, 'real full-body vehicle sweep contacts the street pedestrian');
const events = fast.simulation.drainVehicleImpacts();
assert(events.some(event => event.targetId === `ped:${target.id}` && event.speed === 28), 'pre-stop contact carries actual speed/identity');
assert.equal(fast.people.applyVehicleImpacts(events, 0), 0, 'zero supplied time cannot start a reaction');
assert.deepEqual(fast.people.snapshot()[0], target);
assert.equal(fast.people.applyVehicleImpacts(events, 1 / 60), 1);
assert.equal(fast.people.applyVehicleImpacts(events, 1 / 60), 0, 'repeated blocked sweeps cannot stack a launch');
fast.tick(.25);
const launched = fast.people.snapshot().find(p => p.id === target.id);
assert(launched.impactHeight > .5 && launched.z < target.z - .5, 'high-speed hit visibly launches the actual body');
assert.equal(launched.appearanceKey, target.appearanceKey, 'launch retains the same person identity');
assert.equal(launched.health, target.health, 'presentation adds no health/revival authority');
assert(fast.sweeps > 0, 'launch delegates horizontal travel to the physical sweep');
const physical = fast.people.writeContacts().find(p => p.id === `ped:${target.id}`);
assert.equal(physical.x, launched.x); assert.equal(physical.z, launched.z); assert(physical.active, 'airborne adults remain colliders');
const frozen = fast.people.snapshot(), matrices = fast.scene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]);
fast.people.update(observer, 0);
assert.deepEqual(fast.people.snapshot(), frozen);
assert.deepEqual(fast.scene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]), matrices, 'pause freezes every rendered part');
assert(Object.isFrozen(frozen) && Object.isFrozen(launched));
assert(fast.scene.children[0].children.every(mesh => [...mesh.instanceMatrix.array].every(Number.isFinite)), 'all pooled instance matrices stay finite');
assert.deepEqual(fast.people.drainEvents(), [], 'vehicle reaction does not manufacture witness/offence events');
fast.tick(1.1);
const landed = fast.people.snapshot().find(p => p.id === target.id);
assert.equal(landed.impactHeight, 0); assert(landed.impactTime > 0, 'body lands before its bounded get-up ends');
fast.tick(1.6);
assert.equal(fast.people.snapshot().find(p => p.id === target.id).impactTime, 0, 'get-up terminates');
assert(fast.people.stats.drawCalls <= 10, 'ragdoll retains the existing bounded batches');

const mild = fixture(), mildTarget = mild.people.snapshot()[0];
for (const speed of [0, 3, 7.999]) assert.equal(mild.people.applyVehicleImpacts([mild.contact(mildTarget, speed)], .05), 0);
assert.equal(mild.people.snapshot()[0].impactTime, 0, 'mild bumps do not fling people');
for (const extra of [{ targetId: 'police:0' }, { offenderId: null }, { speed: NaN }, { vx: Infinity },
  { vx: 0, vz: 0 }, { interiorId: 'room' }]) {
  assert.equal(mild.people.applyVehicleImpacts([mild.contact(mildTarget, 28, extra)], .05), 0);
}
const capped = fixture(), cappedTarget = capped.people.snapshot()[0];
assert.equal(capped.people.applyVehicleImpacts([capped.contact(cappedTarget, 10000)], .05), 1);
assert.equal(capped.people.snapshot()[0].impactStrength, 34);
assert(Math.hypot(capped.people.snapshot()[0].impactVX, capped.people.snapshot()[0].impactVZ) <= 14);
capped.tick(1);
assert.equal(capped.people.applyVehicleImpacts([capped.contact(cappedTarget, 10000)], .05), 0,
  'equal capped severity cannot repeatedly relaunch an active body after cooldown');
capped.people.resetPopulation(map.spawn);
assert.equal(capped.people.snapshot()[0].impactTime, 0, 'reset clears transient launch and offsets');
assert.equal(capped.people.snapshot()[0].impactSerial, 0);

// Build a thin wall from the actual target pose, then retain the identical seeded population.
const wallTarget = mildTarget;
const wall = fixture([{ points: [[wallTarget.x - 4, wallTarget.z - 1], [wallTarget.x + 4, wallTarget.z - 1],
  [wallTarget.x + 4, wallTarget.z - .95], [wallTarget.x - 4, wallTarget.z - .95]] }], []);
const victim = wall.people.snapshot().find(p => p.id === wallTarget.id);
assert.equal(victim.x, wallTarget.x);
{
  wall.people.applyVehicleImpacts([wall.contact(victim, 34)], .05); wall.tick(1);
  assert(wall.people.snapshot().find(p => p.id === victim.id).z >= wallTarget.z - .95 + .32 - 1e-6,
    'airborne root cannot tunnel through a thin static wall');
}

const queue = createSimulation({ ...map, roads: [] }, { trafficCount: 0 });
Object.assign(queue.player, { x: 400, z: 400 });
queue.setExternalPeople([{ id: 'ped:0', x: 0, z: 0, radius: .32 }]);
assert(!queue.canOccupy({ id: 'probe', x: 0, z: 2, yaw: 0 }));
assert.deepEqual(queue.drainVehicleImpacts(), [], 'occupancy probes never create a hit');
for (let i = 0; i < 40; i++) queue.moveVehicle({ id: `traffic:${i}`, x: 0, z: 5, yaw: 0, speed: 28 }, 0, -6);
assert.equal(queue.drainVehicleImpacts().length, 32, 'shared player/NPC contact queue remains bounded');
queue.setExternalPeople([{ id: 'police:0', x: 0, z: 0, radius: .32 }]);
queue.moveVehicle({ id: 'traffic:other', x: 0, z: 5, yaw: 0, speed: 28 }, 0, -6);
assert.deepEqual(queue.drainVehicleImpacts(), [], 'unowned NPC classes retain collision without an invented reaction');
mild.people.strike({ x: mildTarget.x, z: mildTarget.z + 1, yaw: 0, range: 1.2, damage: 100, kind: 'pistol' });
assert.equal(mild.people.snapshot()[0].health, 0);
assert.equal(mild.people.applyVehicleImpacts([mild.contact(mildTarget)], .05), 0, 'a downed/dead adult cannot be revived or relaunched');
for (const f of [fast, mild, capped, wall]) { f.people.dispose(); f.people.dispose(); }
assert.equal(fast.people.applyVehicleImpacts(events, .05), 0, 'disposed population rejects late contacts');
console.log('PASS actual NPC vehicle contacts, speed threshold/caps, swept launch/landing/get-up, identities, collision descriptors, pause, lifecycle and bounded queue');
