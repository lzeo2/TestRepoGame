import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBuses } from '../Games/Capital Drive/buses.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const road = (id, points, nodes) => ({ id, points, nodes, oneway: 1, width: 11, type: 'residential' });
const roads = [road('a', [[0, 0], [180, 0]], [1, 2]), road('b', [[180, 0], [180, 180]], [2, 3]),
  road('c', [[180, 180], [0, 180]], [3, 4]), road('d', [[0, 180], [0, 0]], [4, 1]),
  road('e', [[300, 0], [480, 0]], [5, 6]), road('f', [[480, 0], [480, 180]], [6, 7]),
  road('g', [[480, 180], [300, 180]], [7, 8]), road('h', [[300, 180], [300, 0]], [8, 5])];
const map = { bounds: { minX: -500, maxX: 1000, minZ: -500, maxZ: 1000 }, roads, buildings: [],
  spawn: { x: -100, z: -100, yaw: 0 }, trafficSignals: { version: 1, signals: [
    { id: 2, sourceId: 'osm:2', x: 180, z: 0, tags: { highway: 'traffic_signals', 'traffic_signals:direction': 'forward' } }
  ] } };
const sim = createSimulation(map, { trafficCount: 0 }), buses = createBuses(map, sim);
sim.setExternalVehicles(buses.vehicles);
const originalCanOccupy = sim.canOccupy;
let busTurnSweeps = 0;
sim.canOccupy = (pose, options) => {
  const from = options?.fromPose;
  if (from && pose.x === from.x && pose.z === from.z && Math.abs(pose.yaw - from.yaw) > 1e-8) busTurnSweeps++;
  return originalCanOccupy(pose, options);
};
const bus = buses.vehicles[0];
const door = () => buses.nearest(bus);
const context = () => ({ pose: door(), onFoot: true, recovering: false, sandbox: false, indoors: false, busy: false });
const advance = (seconds, fleet = buses) => { for (let i = 0; i < seconds * 60; i++) fleet.step(1 / 60); };
assert.equal(buses.vehicles.length, 2); assert.equal(buses.passenger, false); assert.equal(buses.seatPose, null);
assert.equal(door().busId, bus.id); assert(door().door); assert(door().stopped);
assert.equal(buses.nearest({ x: 999, z: 999 }), null); assert.equal(buses.nearest({ x: NaN, z: 0 }), null);
assert.equal(buses.nearest(bus, -1), null);
for (const denied of [{ onFoot: false }, { recovering: true }, { indoors: true }, { busy: true }, { pose: { x: 999, z: 999 } }]) {
  assert.equal(buses.interact({ ...context(), ...denied }).ok, false); assert.equal(buses.passenger, false);
}
// A building/vehicle/water rejection in the shared sweep cannot be bypassed by E.
const canOccupy = sim.canOccupy, lineOfSight = sim.hasLineOfSight;
sim.hasLineOfSight = () => false;
assert.equal(buses.interact(context()).ok, false); assert.equal(buses.passenger, false);
sim.hasLineOfSight = lineOfSight;
sim.canOccupy = (pose, options) => options?.ignoreId === bus.id ? false : canOccupy(pose, options);
assert.equal(buses.interact(context()).ok, false); assert.equal(buses.passenger, false);
sim.canOccupy = canOccupy;
assert.equal(buses.interact({ ...context(), pose: { ...door(), x: door().x + 8 } }).ok, false, 'stopped boarding needs actual door reach');
const doorPlayer = { ...door(), id: 'player-body', radius: .35 };
sim.setExternalPeople([doorPlayer, { ...doorPlayer, id: 'other-adult' }]);
assert.equal(buses.interact(context()).ok, false, 'another adult at the public door blocks boarding');
sim.setExternalPeople([doorPlayer]);
assert(!sim.canOccupy(doorPlayer, { length: 1, width: .8, ignoreId: bus.id }), 'the foot player remains a physical registered body');
const boarding = buses.interact(context());
sim.setExternalPeople([]);
assert(boarding.ok && boarding.boarded); assert.equal(boarding.fare, 0); assert(buses.passenger); assert(bus.playerAboard);
assert.equal(buses.seatPose, bus, 'seat attachment is the stable physical bus descriptor');
const initial = buses.snapshot(); buses.step(0); buses.step(NaN); buses.step(Infinity);
assert.deepEqual(buses.snapshot(), initial, 'pause and invalid dt freeze the passenger and bus');
advance(3); assert(bus.speed > .5); assert(Math.hypot(bus.x - initial[0].x, bus.z - initial[0].z) > 1);
const beforeStop = { x: bus.x, z: bus.z, speed: bus.speed };
const stop = buses.interact(context()); assert(stop.stopping); assert.equal(buses.passenger, true);
assert.equal(bus.speed, beforeStop.speed, 'E requests braking rather than setting speed or position');
advance(3); assert.equal(bus.speed, 0);
assert(Math.hypot(bus.x - beforeStop.x, bus.z - beforeStop.z) < 8, 'bounded physical stopping distance');
sim.canOccupy = () => false;
assert.equal(buses.interact(context()).ok, false); assert(buses.passenger, 'blocked exit retains attachment');
sim.canOccupy = canOccupy;
const blockedPublicDoor = door(), insidePlayer = { id: 'player-body', radius: .35,
  x: blockedPublicDoor.x + Math.cos(bus.yaw) * 1.1, z: blockedPublicDoor.z - Math.sin(bus.yaw) * 1.1 };
sim.setExternalPeople([insidePlayer, { ...blockedPublicDoor, id: 'door-adult', radius: .35 }]);
assert.equal(buses.interact(context()).ok, false, 'other adults block the entire bus door exit sweep');
assert(buses.passenger);
sim.setExternalPeople([insidePlayer]);
const exit = buses.interact(context()); assert(exit.ok && exit.exited, 'exit ignores only its passenger own body');
sim.setExternalPeople([]); assert.equal(buses.passenger, false); assert.equal(bus.playerAboard, false);
assert.equal(buses.seatPose, null); assert([exit.exitPose.x, exit.exitPose.z, exit.exitPose.yaw].every(Number.isFinite));
assert(sim.canOccupy(exit.exitPose, { length: 1, width: .8 }), 'exit destination is outside the physical bus');
assert(Math.hypot(exit.exitPose.x - door().x, exit.exitPose.z - door().z) < 1, 'exit stays at the public front-left door');
advance(4); assert(bus.speed > 0, 'bus resumes its legal circuit after the exit hold');
const movingDoor = context(), speed = bus.speed;
const request = buses.interact(movingDoor); assert(request.stopping); assert.equal(bus.speed, speed);
const frozen = buses.snapshot(); buses.step(0); assert.deepEqual(buses.snapshot(), frozen);
advance(3); assert.equal(bus.speed, 0); assert.equal(buses.interact(context()).boarded, true);
buses.reset(); assert.equal(buses.passenger, false); assert.equal(buses.seatPose, null); assert(buses.vehicles.every(vehicle => !vehicle.playerAboard && !vehicle.stopRequested));

const blockedDoor = door();
const obstruction = { id: 'door-obstruction', points: [[blockedDoor.x - .6, blockedDoor.z - .3],
  [blockedDoor.x + .6, blockedDoor.z - .3], [blockedDoor.x + .6, blockedDoor.z + .3], [blockedDoor.x - .6, blockedDoor.z + .3]] };
for (const kind of ['building', 'water']) {
  const blockedMap = { ...map, buildings: kind === 'building' ? [obstruction] : [],
    areas: kind === 'water' ? [{ ...obstruction, type: 'water' }] : [] };
  const blockedSim = createSimulation(blockedMap, { trafficCount: 0 }), blockedBuses = createBuses(blockedMap, blockedSim);
  blockedSim.setExternalVehicles(blockedBuses.vehicles);
  const sameBus = blockedBuses.vehicles.find(vehicle => Math.hypot(vehicle.x - bus.x, vehicle.z - bus.z) < .01);
  assert(sameBus, 'door obstruction does not suppress the physically clear bus route');
  assert.equal(blockedBuses.interact({ pose: blockedBuses.nearest(sameBus), onFoot: true }).ok, false, `${kind} at the door blocks real boarding sweep`);
  assert.equal(blockedBuses.passenger, false);
}

// The actual shared signal controller owns amber/red; buses never advance it.
sim.trafficLights.step(sim.trafficLights.timing.green + .1);
const signalClock = sim.trafficLights.elapsed;
advance(35); assert.equal(sim.trafficLights.elapsed, signalClock);
assert(bus.speed < .01); assert(sim.trafficLights.stopDistance(bus, { length: 10.6 }) <= .3);
assert(bus.x + 10.6 / 2 < 178, 'full bus nose remains before the amber stop line');
assert(busTurnSweeps>0, 'bus turn checks retain the old yaw for angular people sweeps');
const amberPosition = bus.x;
sim.trafficLights.step(sim.trafficLights.timing.amber + .1); advance(3);
assert(Math.abs(bus.x - amberPosition) < .01, 'red holds the physical bus');
sim.trafficLights.reset(); advance(3); assert(bus.x > amberPosition + .5, 'green resumes without relocating the bus');

// Actual source map route, door, travel, stop and swept exit through public API.
const json = async name => JSON.parse(await read(`../Games/Capital Drive/data/${name}`));
const actualMap = applyMapExpansion(await json('canberra.json'), await json('canberra-north.json'));
actualMap.trafficSignals = await json('traffic-signals.json');
const actualSim = createSimulation(actualMap, { trafficCount: 0 }), actual = createBuses(actualMap, actualSim);
actualSim.setExternalVehicles(actual.vehicles);
let actualBoard = null;
for (const vehicle of actual.vehicles) {
  const near = actual.nearest(vehicle);
  const result = actual.interact({ pose: near, onFoot: true, sandbox: true });
  if (result.boarded) { actualBoard = vehicle; break; }
}
assert(actualBoard, 'at least one actual source bus has a safe front-left boarding door');
const actualStart = { x: actualBoard.x, z: actualBoard.z };
advance(5, actual); assert.equal(actual.seatPose, actualBoard); assert(actualBoard.playerAboard);
assert(Math.hypot(actualBoard.x - actualStart.x, actualBoard.z - actualStart.z) > .1, 'actual passenger travels physically');
assert(actual.interact({ onFoot: true }).stopping); advance(4, actual);
const actualExit = actual.interact({ onFoot: true });
assert(actualExit.exited); assert(actualSim.canOccupy(actualExit.exitPose, { length: 1, width: .8 }));

const threeURL = moduleURL(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = moduleURL((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const personURL = moduleURL((await read('../Games/Capital Drive/person-model.js')).replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL)));
const { appearanceForPerson } = await import(personURL);
const { createBusView } = await import(moduleURL((await read('../Games/Capital Drive/bus-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'./person-model.js'", JSON.stringify(personURL))));
buses.reset();
const scene = new THREE.Scene(), view = createBusView(scene, () => 12);
view.update(buses.vehicles, bus); assert.equal(view.stats.drawCalls, 4); assert.equal(view.stats.passengers, 0);
assert.equal(buses.interact(context()).boarded, true); const authoritative = buses.snapshot();
view.update(buses.vehicles, bus); assert.equal(view.stats.drawCalls, 5); assert.equal(view.stats.passengers, 1);
assert.deepEqual(buses.snapshot(), authoritative, 'view owns no passenger authority');
const passengerMesh = scene.children[0].children.find(child => child.isInstancedMesh);
assert(passengerMesh); assert.equal(passengerMesh.count, 1);
assert.deepEqual(passengerMesh.userData.appearance,appearanceForPerson('player'));
passengerMesh.geometry.computeBoundingBox();
assert(passengerMesh.geometry.boundingBox.max.y < 2.84,'shared rounded player head stays below bus roof');
assert(passengerMesh.geometry.boundingBox.min.y > 1.39,'shared player shoes stay above the bus floor');
assert(passengerMesh.geometry.index.count > 36*11,'rounded shared passenger replaces box art');
const geometry = passengerMesh.geometry, material = passengerMesh.material, buffer = passengerMesh.instanceMatrix.array;
const nodes = []; scene.traverse(object => nodes.push(object));
for (let i = 0; i < 2000; i++) {
  view.update(buses.vehicles, bus);
  assert(view.stats.drawCalls<=5 && view.stats.geometries===5 && view.stats.materials===2);
}
const repeatedNodes = []; scene.traverse(object => repeatedNodes.push(object));
assert.deepEqual(repeatedNodes,nodes,'boarding frames retain the same pooled nodes');
assert.equal(passengerMesh.geometry, geometry); assert.equal(passengerMesh.material, material); assert.equal(passengerMesh.instanceMatrix.array, buffer);
assert(buffer.every(Number.isFinite)); assert.equal(view.stats.geometries, 5); assert.equal(view.stats.materials, 2);
buses.reset(); view.update(buses.vehicles, bus); assert.equal(view.stats.passengers, 0); assert.equal(passengerMesh.count, 0);
let geometryDisposals = 0, materialDisposals = 0, instanceDisposals = 0;
const geometries = new Set(), materials = new Set();
scene.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
geometries.forEach(value => value.addEventListener('dispose', () => geometryDisposals++));
materials.forEach(value => value.addEventListener('dispose', () => materialDisposals++));
passengerMesh.addEventListener('dispose', () => instanceDisposals++);
view.dispose(); view.dispose(); assert.equal(scene.children.length, 0); assert.equal(geometryDisposals, 5); assert.equal(materialDisposals, 2); assert.equal(instanceDisposals, 1);
assert(view.stats.disposed); assert.equal(view.stats.drawCalls, 0);
console.log('PASS bus boarding: actual-source physical board/travel/brake/exit, front-left door reach/LOS/sweeps, busy/recovery/interior guards, pause/reset, free fictional fare, full-length amber/red hold and green resume, one pooled visible passenger, five draws and exact disposal');
