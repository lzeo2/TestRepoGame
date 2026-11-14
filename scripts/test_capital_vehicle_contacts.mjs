import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createCar } from '../assets/car-arcade/models.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, roads: [], buildings: [],
  spawn: { x: 100, z: 100, yaw: 0 } };
const create = () => createSimulation(map, { trafficCount: 0 });
const models = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];
const visual = new Map(models.map(id => {
  const size = new THREE.Box3().setFromObject(createCar(id)).getSize(new THREE.Vector3());
  return [id, { length: size.z, width: size.x }];
}));
const local = (car, across, along) => ({ x: car.x + Math.cos(car.yaw) * across - Math.sin(car.yaw) * along,
  z: car.z - Math.sin(car.yaw) * across - Math.cos(car.yaw) * along });
const boxGap = (actor, car, length, width) => {
  const dx = actor.x - car.x, dz = actor.z - car.z;
  const along = Math.abs(-Math.sin(car.yaw) * dx - Math.cos(car.yaw) * dz);
  const across = Math.abs(Math.cos(car.yaw) * dx - Math.sin(car.yaw) * dz);
  return Math.hypot(Math.max(0, along - length / 2), Math.max(0, across - width / 2));
};

for (const modelId of models) for (const yaw of [0, .7, Math.PI / 2, -1.3]) {
  const simulation = create(), car = { id: 'parked-body', modelId, x: 0, z: 0, yaw };
  simulation.setParkedCars([car]);
  const size = visual.get(modelId);
  for (const [across, along] of [[0, size.length / 2 - .1], [size.width / 2 - .1, 0],
    [size.width / 2 + .15, size.length / 2 + .15]]) {
    const actor = local(car, across, along); // Normal foot actors have no vehicle id.
    assert(simulation.moveActor(actor, 0, 0, .45).blocked, `${modelId} visible end/side/corner blocks feet at yaw ${yaw}`);
  }
  for (const [across, along] of [[size.width / 2 + .6, 0], [0, size.length / 2 + .6]]) {
    assert(!simulation.moveActor(local(car, across, along), 0, 0, .45).blocked,
      `${modelId} clear space beside its real body stays walkable`);
  }
  const walker = local(car, 0, 6);
  const movement = simulation.moveActor(walker, Math.sin(yaw) * 12, Math.cos(yaw) * 12, .45);
  assert(movement.blocked && boxGap(walker, car, size.length, size.width) >= .44,
    `${modelId} fast foot sweep stops outside its visible front`);
  const diagonal = local(car, 3, 5), target = local(car, -3, -5);
  const slide = simulation.moveActor(diagonal, target.x - diagonal.x, target.z - diagonal.z, .45);
  assert(slide.blocked && boxGap(diagonal, car, size.length, size.width) >= .44,
    `${modelId} diagonal contact slides around the oriented body`);
  const overlap = local(car, 0, size.length / 2 + visual.get('lantern').length / 2 - .1);
  assert(!simulation.canOccupy({ id: 'player', modelId: 'lantern', ...overlap, yaw }), `${modelId} visible bumpers cannot overlap a driving car`);
}

for (const source of ['player', 'traffic', 'parked', 'abandoned', 'bus', 'yoober']) {
  const simulation = create();
  const car = { id: `contact-${source}`, modelId: 'atlas', x: 0, z: 0, yaw: .6, active: true };
  let registered;
  if (source === 'player') { Object.assign(simulation.player, car, { id: 'player' }); registered = simulation.player; }
  else if (source === 'traffic') { simulation.traffic.push(car); registered = car; }
  else if (source === 'parked') { simulation.setParkedCars([car]); registered = simulation.parkedCars[0]; }
  else if (source === 'abandoned') { simulation.abandonedCars.push(car); registered = car; }
  else { Object.assign(car, source === 'bus' ? { length: 10.6, width: 2.45 } : { length: 4.5, width: 1.8 }); simulation.setExternalVehicles([car]); registered = car; }
  const length = car.length || 5.4, width = car.width || 2.204;
  assert(simulation.moveActor(local(car, 0, length / 2 + .2), 0, 0, .45).blocked, `${source} end face is physical`);
  assert(simulation.moveActor(local(car, width / 2 + .2, 0), 0, 0, .45).blocked, `${source} side face is physical`);
  registered.active = false;
  assert(!simulation.moveActor(local(car, 0, length / 2 + .2), 0, 0, .45).blocked, `${source} inactive hidden body does not create a ghost obstacle`);
}

const driving = create();
driving.setParkedCars([{ id: 'atlas-obstacle', modelId: 'atlas', x: 0, z: 0, yaw: 0 }]);
const moving = { id: 'driving-lantern', modelId: 'lantern', x: 0, z: 10, yaw: 0 };
const impact = driving.moveVehicle(moving, 0, -12);
assert(impact.blocked && moving.z >= (visual.get('atlas').length + visual.get('lantern').length) / 2,
  'fast driving sweep retains both actual model lengths');
assert(driving.canOccupy(driving.player), 'the current vehicle ignores only its own registered body');
assert(driving.moveVehicle(driving.player, 1, 0).moved, 'ordinary own-vehicle driving remains possible');

const steering = createSimulation({ ...map, bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 },
  spawn: { x: -352.18173012129444, z: -410.40571362257157, yaw: -1.6371285194705876 } }, { trafficCount: 0 });
Object.assign(steering.player, { length: 4.5, width: 1.8, steer: 1,
  vx: -Math.sin(steering.player.yaw) * 8, vz: -Math.cos(steering.player.yaw) * 8 });
steering.setExternalVehicles([{ id: 'steering-neighbour', x: -347.82616123696664, z: -408.3224891075777,
  yaw: -2.362502400571921, length: 4.5, width: 1.8, active: true }]);
assert(steering.canOccupy(steering.player), 'captured driving turn starts with clear bodies');
steering.step(.05, { steer: 1 });
assert(steering.canOccupy(steering.player), 'blocked steering cannot rotate the driving body through another car');

const boundary = create();
boundary.setParkedCars([{ id: 'long-parked', x: 29, z: 0, yaw: -Math.PI / 2, length: 16, width: 2 }]);
assert(boundary.moveActor({ x: 37.3, z: 0 }, 0, 0, .45).blocked, 'parked broad phase includes a long rotated end across a grid boundary');
assert(!boundary.canOccupy({ id: 'player', modelId: 'lantern', x: 39, z: 0, yaw: -Math.PI / 2 }), 'driving broad phase includes that same long end');

const localOnly = create();
localOnly.setParkedCars(Array.from({ length: 2000 }, (_, i) => ({ id: `far-${i}`, x: 10000 + i * 10, z: 10000 })));
let distantReads = 0;
for (const car of localOnly.parkedCars) Object.defineProperty(car, 'active', { get() { distantReads++; return true; } });
assert(!localOnly.moveActor({ x: 0, z: 0 }, 4, 4).blocked);
assert(localOnly.canOccupy({ x: 20, z: 20, yaw: 0, modelId: 'atlas' }));
assert.equal(distantReads, 0, 'foot and driving contacts do not scan distant parked cars');
assert.equal(localOnly.canOccupy(null), false);
console.log('PASS vehicle contacts: six real factory bounds/four headings; foot end/side/corner/fast/diagonal sweeps; player/traffic/parked/abandoned/bus/Yoober active bodies; model-sized driving, rotated grid ends, own-body exclusion and zero distant parked reads');
