import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL('../Games/Capital Drive/', import.meta.url);
const read = name => readFile(new URL(name, base), 'utf8');
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const networkURL = moduleURL(await read('road-network.js'));
const { applyRoadProfiles } = await import(networkURL);
import {createSimulation,pointOnLane} from '../Games/Capital Drive/simulation.js';
const { applyMapExpansion } = await import(moduleURL(await read('map-expansion.js')));
const { generateParkedCars } = await import(moduleURL((await read('parking-layout.js'))
  .replace("'./road-network.js'", JSON.stringify(networkURL))));
const road = (id, points, nodes) => ({ id, name: id, type: 'residential', width: 8, oneway: 1, points, nodes });
// A minimal source-shaped junction: the side road joins the one-way avenue at
// an oblique angle, so the departing side car can look like a lead to its peer.
const fixture = { bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, buildings: [],
  spawn: { x: -150, z: -150, yaw: 0 }, roads: [
    { ...road('east', [[-59.19, -43.3], [0, 0], [31.39, 22.96]], [1, 2, 3]), width: 7.5 },
    { ...road('south', [[58, -84], [0, 0]], [4, 2]), width: 7.5, oneway: 0 }
  ] };
const sim = createSimulation(fixture, { trafficCount: 2, seed: 17 });
const east = sim.graph.edges.find(e => e.road.id === 'east'), south = sim.graph.edges.find(e => e.road.id === 'south');
for (const [index, edge, position] of [[0, east, east.length - 30], [1, south, south.length - 30]]) {
  Object.assign(sim.traffic[index], { edge, position, speed: 0, active: true }, pointOnLane(edge, position));
}
assert(sim.traffic.every(car => sim.canOccupy(car)), 'crossing fixture starts with clear non-overlapping cars');
let minimumGap = Infinity;
for (let i = 0; i < 240; i++) {
  sim.step(.05);
  minimumGap = Math.min(minimumGap, Math.hypot(sim.traffic[0].x - sim.traffic[1].x, sim.traffic[0].z - sim.traffic[1].z));
  assert(sim.traffic.every(car => sim.canOccupy(car)), 'crossing priority retains swept vehicle clearance');
}
assert(sim.traffic.every(car => Math.hypot(car.x, car.z) > 20), 'both crossing approaches leave the junction rather than become mutual leads');
assert(minimumGap > 3, 'junction priority maintains physical spacing');
const frozen = structuredClone(sim.traffic);
sim.step(0);
assert.deepEqual(sim.traffic, frozen, 'pause freezes junction priority and movement');

const actual = applyMapExpansion(applyRoadProfiles(JSON.parse(await read('data/canberra.json')),
  JSON.parse(await read('data/road-profiles.json'))), JSON.parse(await read('data/canberra-north.json')));
const fleet = createSimulation(actual, { seed: 20261112 });
fleet.setParkedCars(generateParkedCars(actual, { isClear: (_x, _z, _r, car) => fleet.canOccupy(car, { length: 4.8, width: 2 }) }));
const observed = new Map();
let snapshots;
for (let i = 0; i < 2400; i++) {
  fleet.step(.05);
  for (const id of ['traffic:15', 'traffic:18', 'traffic:22', 'traffic:35']) {
    const car = fleet.traffic.find(car => car.id === id);
    assert(fleet.canOccupy(car), `${id} keeps physical vehicle/static clearance throughout the actual-map replay`);
    if (!observed.has(id)) observed.set(id, []);
    if (i === 1199 || i === 2399) observed.get(id).push({ x: car.x, z: car.z, speed: car.speed });
  }
  if (i === 1199) snapshots = fleet.traffic.map(car => ({ x: car.x, z: car.z, speed: car.speed }));
}
const oldJunctions = [{ x: -384, z: -564, ids: ['traffic:15', 'traffic:18'] }, { x: -661, z: -584, ids: ['traffic:22', 'traffic:35'] }];
for (const junction of oldJunctions) for (const id of junction.ids) {
  assert(observed.get(id).every(pose => Math.hypot(pose.x - junction.x, pose.z - junction.z) > 15), `${id} clears the formerly permanent source-map junction at60s and120s`);
}
assert.equal(fleet.traffic.length, 40, 'junction handling preserves stable40-car fleet');
assert(fleet.traffic.every(car => [car.x, car.z, car.yaw, car.speed].every(Number.isFinite)), 'actual-map routes stay finite');
const stopped60 = snapshots.filter(car => car.speed < .1).length;
const stopped120 = fleet.traffic.filter(car => car.speed < .1).length;
console.log(`PASS junction queues: crossing fixture clears with minimum${minimumGap.toFixed(2)}m spacing, pause; both archived actual-map cycles clear at60/120s;40cars, stopped${stopped60}/${stopped120} (building and other traffic holds remain)`);
