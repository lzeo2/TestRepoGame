import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const networkURL = url(await read('../Games/Capital Drive/road-network.js'));
import {createSimulation,buildRoadGraph} from '../Games/Capital Drive/simulation.js';
const { roadProfile } = await import(networkURL);
const { createBuses } = await import(url((await read('../Games/Capital Drive/buses.js')).replace("'./road-network.js'", JSON.stringify(networkURL))));
const road = (id, points, nodes, oneway = 1) => ({ id, points, nodes, oneway, width: 11, type: 'residential' });
const roads = [road('a', [[0, 0], [180, 0]], [1, 2]), road('b', [[180, 0], [180, 180]], [2, 3]),
  road('c', [[180, 180], [0, 180]], [3, 4]), road('d', [[0, 180], [0, 0]], [4, 1]),
  road('e', [[300, 0], [480, 0]], [5, 6]), road('f', [[480, 0], [480, 180]], [6, 7]),
  road('g', [[480, 180], [300, 180]], [7, 8]), road('h', [[300, 180], [300, 0]], [8, 5])];
const map = { bounds: { minX: -500, maxX: 1000, minZ: -500, maxZ: 1000 }, roads, buildings: [], spawn: { x: -100, z: -100, yaw: 0 } };
const sim = createSimulation(map, { trafficCount: 0 }), buses = createBuses(map, sim);
assert.equal(buses.vehicles.length, 2, 'two bounded buses on two legal directed circuits');
sim.setExternalVehicles(buses.vehicles);
const initial = buses.snapshot(); buses.step(0); assert.deepEqual(buses.snapshot(), initial);
const routeIds = buses.snapshot().flatMap(bus => bus.routeEdgeIds);
assert(routeIds.every(id => sim.graph.edges.some(edge => edge.id === id && roadProfile(edge.road).busAllowed)));
let sawLayover = false;
for (let tick = 0; tick < 60 * 180; tick++) {
  const before = buses.snapshot(); buses.step(1 / 60);
  if (tick > 120 && buses.vehicles[0].layover > 0) sawLayover = true;
  buses.vehicles.forEach((bus, i) => {
    assert([bus.x, bus.z, bus.yaw, bus.speed].every(Number.isFinite));
    assert(Math.hypot(bus.x - before[i].x, bus.z - before[i].z) <= 7.21 / 60, 'junctions never teleport');
    assert(Math.abs(Math.atan2(Math.sin(bus.yaw - before[i].yaw), Math.cos(bus.yaw - before[i].yaw))) <= .651 / 60, 'bounded turn rate');
  });
}
assert(sawLayover, 'bus stops briefly after completing its fictional circuit');
assert(Math.hypot(buses.vehicles[0].x - initial[0].x, buses.vehicles[0].z - initial[0].z) > 20, 'bus actually travels');
buses.reset(); assert.deepEqual(buses.snapshot(), initial, 'reset restores buses and cursors');
const first = buses.vehicles[0];
const blocker = { id: 'blocked-front', x: first.x - Math.sin(first.yaw) * 9, z: first.z - Math.cos(first.yaw) * 9,
  yaw: first.yaw, length: 4.5, width: 2, active: true };
sim.setExternalVehicles([...buses.vehicles, blocker]);
for (let i = 0; i < 600; i++) buses.step(1 / 60);
assert(Math.hypot(first.x - initial[0].x, first.z - initial[0].z) < 3, 'occupied front stops bus without passing blocker');
const actualMap = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const actualSim = createSimulation(actualMap, { trafficCount: 0 });
const actualBuses = createBuses(actualMap, actualSim);
actualSim.setExternalVehicles(actualBuses.vehicles);
const actualStart = actualBuses.snapshot();
for (let i = 0; i < 60 * 120; i++) actualBuses.step(1 / 60);
actualBuses.vehicles.forEach((bus, i) => assert(Math.hypot(bus.x - actualStart[i].x, bus.z - actualStart[i].z) > 30, 'actual map bus travels away from spawn'));
assert.equal(actualBuses.vehicles.length, 2, 'actual Canberra graph supports two fictional circuits');
for (const bus of actualBuses.snapshot()) {
  const edges = bus.routeEdgeIds.map(id => actualSim.graph.edges[id]);
  edges.forEach((edge, i) => {
    assert(roadProfile(edge.road).busAllowed);
    assert.equal(edge.to.id, edges[(i + 1) % edges.length].from.id, 'directed route closes legally');
    assert.notEqual(edge.segment, edges[(i + 1) % edges.length].segment, 'no instant reverse at terminus');
  });
}
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const { createBusView } = await import(url((await read('../Games/Capital Drive/bus-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))));
const scene = new THREE.Scene(), view = createBusView(scene, () => 12);
view.update(buses.vehicles, first);
assert.equal(view.stats.buses, 2); assert.equal(view.stats.drawCalls, 4); assert(view.stats.triangles < 5000);
const snapshot = buses.snapshot(); view.update(buses.vehicles, first); assert.deepEqual(buses.snapshot(), snapshot, 'rendering is read-only');
let released = 0, releasedMaterials = 0; const ownedMaterials = new Set(); scene.traverse(object => { if (object.isMesh) {
  assert([...object.geometry.attributes.position.array].every(Number.isFinite));
  object.geometry.addEventListener('dispose', () => released++);
  ownedMaterials.add(object.material);
} });
ownedMaterials.forEach(material => material.addEventListener('dispose', () => releasedMaterials++));
view.update(buses.vehicles, { x: 10000, z: 10000 }); assert.equal(view.stats.buses, 0);
view.dispose(); view.dispose(); assert.equal(released, 4); assert.equal(releasedMaterials, 2); assert.equal(scene.children.length, 0); assert(view.stats.disposed);
assert.equal(buildRoadGraph(roads).edges.length, 8);
console.log(`PASS buses: legal actual-map circuits, one-way closure, bounded turns/movement, pause/reset/front blockers; renderer ${view.stats.triangles} triangles/4 draws, finite geometry and idempotent disposal`);
