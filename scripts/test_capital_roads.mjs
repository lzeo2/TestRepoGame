import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = new URL('../Games/Capital Drive/', import.meta.url);
const networkSource = await readFile(new URL('road-network.js', base), 'utf8');
const networkUrl = `data:text/javascript;base64,${Buffer.from(networkSource).toString('base64')}`;
const { roadProfile, applyRoadProfiles, createRoutePlanner } = await import(networkUrl);
import {buildRoadGraph,createSimulation} from '../Games/Capital Drive/simulation.js';
const road = (id, points, nodes, extra = {}) => ({ id, points, nodes, type: 'residential', width: 8, oneway: 1, ...extra });
const roads = [road('a', [[0, 0], [40, 0]], [1, 2]), road('b', [[40, 0], [40, 40]], [2, 3]),
  road('c', [[40, 40], [0, 40]], [3, 4]), road('d', [[0, 40], [0, 0]], [4, 1]),
  road('private', [[40, 0], [0, 0]], [2, 1], { sourceTags: { access: 'private' } })];
const graph = buildRoadGraph(roads), planner = createRoutePlanner(graph);
assert.deepEqual(planner.findEdges('2', '1').map(e => e.road.id), ['b', 'c', 'd'], 'legal one-way loop excludes private shortcut');
assert.deepEqual(planner.findEdges({ x: 40, z: 0 }, { x: 0, z: 0 }, { kind: 'bus' }).map(e => e.road.id), ['b', 'c', 'd']);
const isolated = buildRoadGraph([roads[0], road('island', [[100, 0], [120, 0]], [7, 8])]);
assert.deepEqual(createRoutePlanner(isolated).findEdges('1', '8'), []);
assert.deepEqual(createRoutePlanner(isolated).findEdges({ x: 0, z: 0 }, { x: 40, z: 0 }).map(e => e.road.id), ['a'], 'point destination can be a one-way sink');
// Access metadata is read at planner construction only. Repeated searches use cached
// legal adjacency while retaining separate car/bus restrictions.
let profileReads = 0;
const cachedRoad = road('cached', [[0, 0], [20, 0], [40, 0]], [11, 12, 13]);
Object.defineProperty(cachedRoad, 'sourceTags', { get() { profileReads++; return { bus: 'no' }; } });
const cachedGraph = buildRoadGraph([cachedRoad]);
profileReads = 0;
const cachedPlanner = createRoutePlanner(cachedGraph);
assert.equal(profileReads, 1, 'each road profile is evaluated once when constructing planner');
for (let i = 0; i < 12; i++) {
  assert.equal(cachedPlanner.findEdges({ x: 0, z: 0 }, { x: 40, z: 0 }).length, 2);
  assert.deepEqual(cachedPlanner.findEdges('11', '13', { kind: 'bus' }), []);
  assert.deepEqual(cachedPlanner.findEdges('13', '11'), [], 'cached routes preserve direction');
}
assert.equal(profileReads, 1, 'route calls never reread road access profiles');
const sourceMap = { roads }, before = JSON.stringify(sourceMap);
const annotated = applyRoadProfiles(sourceMap, { roads: { a: { service: 'driveway', width: '3' } } });
assert.equal(JSON.stringify(sourceMap), before);
assert.equal(annotated.roads[0].profile.driveWidth, 3);
assert.equal(annotated.roads[0].profile.pavementWidth, 0);
assert.equal(annotated.roads[0].profile.trafficAllowed, false);
assert.equal(roadProfile({ type: 'service', sourceTags: { service: 'parking_aisle' } }).hasKerb, false);
assert.equal(roadProfile({ sourceTags: { bus: 'no' } }).busAllowed, false);
const map = { bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, roads,
  buildings: [{ points: [[10, -30], [10.1, -30], [10.1, 30], [10, 30]] }], spawn: { x: -100, z: -100, yaw: 0 } };
const sim = createSimulation(map, { trafficCount: 0 });
const bus = { id: 'bus:0', x: 0, z: 0, yaw: -Math.PI / 2, length: 12, width: 2.5, active: true };
sim.setExternalVehicles([bus]);
assert(sim.canOccupy(bus, { length: 12, width: 2.5 }), 'external object ignores its own stable ID');
assert(sim.canOccupy({ ...bus }, { length: 12, width: 2.5, ignoreId: bus.id }), 'copied pose also ignores self ID');
assert(!sim.canOccupy({ x: 5, z: 0, yaw: 0 }), 'external bus nose blocks car');
const longSweep = sim.moveVehicle(bus, 30, 0, { length: 12, width: 2.5 });
assert(longSweep.blocked && bus.x <= 4.01, 'front sweep cannot tunnel through thin wall and motion is bounded');
bus.x = -30; bus.z = 0;
const blocker = { id: 'patrol:1', x: -16, z: 0, yaw: 0, length: 4.5, width: 1.8, active: true };
sim.setExternalVehicles([bus, blocker]);
assert(sim.moveVehicle(bus, 8, 0, { length: 12, width: 2.5 }).blocked, 'external vehicle blocks swept bus front');
const actor = { x: -16, z: -5 };
assert(sim.moveActor(actor, 0, 8).blocked && actor.z < -2.5, 'foot sweep respects external rectangle');
blocker.active = false;
assert(sim.canOccupy({ x: -15, z: 0, yaw: 0 }), 'inactive external descriptors do not block');
const roadBytes = await readFile(new URL('data/canberra.json', base));
const actual = JSON.parse(roadBytes), sidecar = JSON.parse(await readFile(new URL('data/road-profiles.json', base)));
assert.equal(sidecar.source.mapSha256, createHash('sha256').update(roadBytes).digest('hex'));
assert.equal(sidecar.source.matchedRoads, actual.roads.length);
const ids = new Set(actual.roads.map(r => r.id));
assert(Object.keys(sidecar.roads).every(id => ids.has(id)));
const profiled = applyRoadProfiles(actual, sidecar);
const restricted = profiled.roads.filter(r => !r.profile.trafficAllowed);
assert(restricted.length > 500, 'actual source driveway/private profiles restrict ambient traffic');
const fleet = createSimulation(profiled, { trafficCount: 16 });
assert(fleet.traffic.every(c => c.edge && roadProfile(c.edge.road).trafficAllowed));
const occupied = fleet.traffic.find(c => c.active);
assert(occupied);
assert(fleet.nearbyVehicles(occupied.x, occupied.z, 1).find(c => c.id === occupied.id).occupied);
occupied.speed = 8;
assert(fleet.requestVehicleStop(occupied.id, 4));
fleet.step(1 / 60);
assert(occupied.speed > 0 && occupied.speed < 8, 'request applies braking rather than an instant stop');
for (let i = 0; i < 120; i++) fleet.step(1 / 60);
assert(occupied.speed < 0.1, 'stop request brakes traffic over time');
const contactMap = { bounds: map.bounds, roads: [road('straight', [[-150, 0], [150, 0]], [20, 21])],
  buildings: [], spawn: { x: -100, z: -100, yaw: 0 } };
const contactSim = createSimulation(contactMap, { trafficCount: 1 });
const trafficCar = contactSim.traffic[0], contactEdge = contactSim.graph.edges[0];
Object.assign(trafficCar, { edge: contactEdge, position: 60, x: -90, z: -contactEdge.laneOffset,
  yaw: contactEdge.yaw, speed: 10, active: true });
const trafficBlocker = { id: 'bus:blocker', x: -70, z: trafficCar.z, yaw: contactEdge.yaw, length: 12, width: 2.5, active: true };
contactSim.setExternalVehicles([trafficBlocker]);
for (let i = 0; i < 180; i++) contactSim.step(1 / 60);
assert(trafficCar.x < trafficBlocker.x - 8 && trafficCar.speed < 1, 'traffic brakes before external bus rather than crossing it');
Object.assign(contactSim.player, { x: -70, z: -25, yaw: 0, vx: 0, vz: 35 });
trafficBlocker.yaw = 0; trafficBlocker.z = -12;
for (let i = 0; i < 30; i++) contactSim.step(1 / 60);
assert(contactSim.player.z < -20, 'player sweep respects external bus rear');
console.log(`PASS road profiles: ${actual.roads.length} exact roads, ${Object.keys(sidecar.roads).length} tagged, ${restricted.length} restricted; directed routes, self-ignore, thin-wall sweeps, external car/foot blockers, bounded braking`);
