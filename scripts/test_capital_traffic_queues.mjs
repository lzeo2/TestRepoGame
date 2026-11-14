import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL('../Games/Capital Drive/', import.meta.url);
const read = name => readFile(new URL(name, base), 'utf8');
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const networkURL = moduleURL(await read('road-network.js'));
const { applyRoadProfiles } = await import(networkURL);
const { createSimulation, pointOnLane } = await import(moduleURL((await read('simulation.js'))
  .replace("'./road-network.js'", JSON.stringify(networkURL))));
const { applyMapExpansion } = await import(moduleURL(await read('map-expansion.js')));
const actual = applyMapExpansion(applyRoadProfiles(JSON.parse(await read('data/canberra.json')),
  JSON.parse(await read('data/road-profiles.json'))), JSON.parse(await read('data/canberra-north.json')));
const fixture = { bounds: { minX: -600, maxX: 600, minZ: -600, maxZ: 600 },
  spawn: { x: -100, z: -100, yaw: 0 }, buildings: [], roads: [
    { id: 'narrow', name: 'Narrow Street', type: 'residential', width: 7.5, oneway: 0,
      points: [[0, 0], [500, 0]], nodes: [1, 2] }
  ] };
function place(car, edge, position) {
  Object.assign(car, { edge, position, active: true, speed: 0, overtake: 0, anger: 0 }, pointOnLane(edge, position));
}
function advance(sim, seconds) { for (let i = 0; i < Math.ceil(seconds * 20); i++) sim.step(.05); }
function queue(map, roadId, segment = 0) {
  const sim = createSimulation(map, { trafficCount: 2, seed: 20261112 });
  const edge = sim.graph.edges.find(e => e.road.id === roadId && e.segment.index === segment && e.direction === 1);
  assert(edge && edge.length > 65);
  place(sim.traffic[0], edge, 15); place(sim.traffic[1], edge, 3);
  return { sim, edge };
}
const { sim, edge } = queue(fixture, 'narrow');
const blocker = { id: 'parked:legacy', ...pointOnLane(edge, 45), modelId: 'lantern', active: true };
sim.setParkedCars([blocker]);
advance(sim, 12);
assert(sim.traffic.every(car => car.position < 41 && car.speed < .1), 'a real stationary lane blocker stops the entire queue');
assert(sim.traffic[0].position - sim.traffic[1].position >= 6.9, 'stopped traffic retains a physical following gap');
assert(sim.traffic.every(car => sim.canOccupy(car)), 'queue never overlaps the parked car or another vehicle');
assert(sim.traffic.every(car => car.overtake === 0), 'narrow two-way roads do not use an unsafe passing lane');
const paused = structuredClone(sim.traffic);
for (let i = 0; i < 20; i++) sim.step(0);
assert.deepEqual(sim.traffic, paused, 'pause freezes positions, queue timers and stop requests');
sim.setParkedCars([]);
advance(sim, 6);
assert(sim.traffic.every(car => car.position > 45), 'removing only the invalid decorative placement releases both cars');
const external = { id: 'bus:stationary', ...pointOnLane(edge, sim.traffic[0].position + 28), length: 12, width: 2.5, active: true };
sim.setExternalVehicles([external]);
advance(sim, 12);
assert(sim.traffic.every(car => car.position < external.x - 8 && car.speed < .1), 'stationary external bus is still a full physical blocker');
assert(sim.traffic.every(car => sim.canOccupy(car)), 'bus queue remains collision free');

// Retained failed reproduction: production seed731 parked centres were W/2-.8.
// In the merged map this placed2065/2360 cars within1.8m of a public moving lane;
// a60s seed20261112 replay left36/40 cars stopped,26 behind a parked car.
// Replay that placement on an actual connected public-road segment, then clear
// just that invalid decoration. No traffic collision or direction is disabled.
const actualRoad = actual.roads.find(road => road.name === 'New South Wales Crescent' && road.width === 7.5 &&
  road.points.some((p, i) => i && Math.hypot(p[0] - road.points[i - 1][0], p[1] - road.points[i - 1][1]) > 70));
assert(actualRoad);
const actualSegment = actualRoad.points.findIndex((p, i) => i && Math.hypot(p[0] - actualRoad.points[i - 1][0], p[1] - actualRoad.points[i - 1][1]) > 70) - 1;
const replay = queue(actual, actualRoad.id, actualSegment);
const legacyPose = pointOnLane(replay.edge, 45), extraOffset = actualRoad.width / 2 - .8 - replay.edge.laneOffset;
replay.sim.setParkedCars([{ id: 'parked:actual-legacy', x: legacyPose.x + replay.edge.dz * extraOffset,
  z: legacyPose.z - replay.edge.dx * extraOffset, yaw: legacyPose.yaw }]);
advance(replay.sim, 12);
assert(replay.sim.traffic.every(car => car.position < 41 && car.speed < .1), 'exact source-road curb offset reproduces the real-map queue');
replay.sim.setParkedCars([]);
advance(replay.sim, 4);
assert(replay.sim.traffic[0].position > 47, 'real-map queue resumes on its existing legal directed route');

const local = createSimulation(fixture, { trafficCount: 2 });
local.setParkedCars(Array.from({ length: 2000 }, (_, i) => ({ x: 10000 + i * 10, z: 10000 })));
let distantReads = 0;
for (const car of local.parkedCars) Object.defineProperty(car, 'active', { get() { distantReads++; return true; } });
advance(local, 2);
assert.equal(distantReads, 0, 'queue and physical queries do not scan the distant decorative fleet');
console.log('PASS traffic queues: actual-map narrow-road parked overlap reproduced; physical following, legal release, pause, external bus and local-only parked queries');
