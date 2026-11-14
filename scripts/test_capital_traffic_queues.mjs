import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL('../Games/Capital Drive/', import.meta.url);
const read = name => readFile(new URL(name, base), 'utf8');
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const networkURL = moduleURL(await read('road-network.js'));
const { applyRoadProfiles, roadProfile } = await import(networkURL);
const { createSimulation, pointOnLane, projectSegment } = await import(moduleURL((await read('simulation.js'))
  .replace("'./road-network.js'", JSON.stringify(networkURL))));
const { generateParkedCars } = await import(moduleURL((await read('parking-layout.js'))
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

// Exercise the same pure layout and occupancy callback used by the controller.
// Archived placement is a negative control, retained to measure the reported jam.
// It deliberately uses the former raw-road width offset and random sequence.
function legacyParking(map, simulation) {
  let seed = 731, serial = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const cars = [];
  for (const road of map.roads) {
    if (!road.name || !['residential', 'tertiary', 'unclassified'].includes(road.type)) continue;
    let along = 30 + random() * 40;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      while (along < length) {
        const side = random() < .5 ? 1 : -1, offset = road.width / 2 - .8;
        cars.push({ id: `legacy:${serial++}`, x: a[0] + dx * along / length + dz / length * offset * side,
          z: a[1] + dz * along / length - dx / length * offset * side,
          yaw: Math.atan2(-dx, -dz) + (side < 0 ? Math.PI : 0) });
        random(); random(); // Former SUV and paint choices consumed these values.
        along += 90 + random() * 90;
      }
      along -= length;
    }
  }
  const road = simulation.nearestRoad(-298, -325.27), offset = Math.min(3.3, road.road.width / 2 - .8);
  const wagon = { id: 'mission-wagon', x: road.x - Math.cos(road.yaw) * offset,
    z: road.z + Math.sin(road.yaw) * offset, yaw: road.yaw };
  return [...cars.filter(car => Math.hypot(car.x - wagon.x, car.z - wagon.z) > 9), wagon];
}
const legacySim = createSimulation(actual, { seed: 20261112 });
const legacy = legacyParking(actual, legacySim);
assert(legacy.length > 2000, 'archived negative control retains the former dense curb fleet');
legacySim.setParkedCars(legacy);
advance(legacySim, 60);
const legacyStopped = legacySim.traffic.filter(car => car.active && car.speed < .1).length;
const layoutSim = createSimulation(actual, { seed: 20261112 });
const layoutOptions = { isClear: (_x, _z, _radius, car) => layoutSim.canOccupy(car, { length: 4.8, width: 2 }) };
const layout = generateParkedCars(actual, layoutOptions);
assert.deepEqual(generateParkedCars(actual, layoutOptions), layout, 'production parking generation is deterministic');
assert(layout.length > 50, 'dedicated source parking retains a useful decorative fleet');
assert.equal(new Set(layout.map(car => car.id)).size, layout.length, 'parked IDs are unique and stable');
const mission = layout.find(car => car.id === 'mission-wagon');
assert(mission && Math.hypot(mission.x + 298, mission.z + 325.27) <= 18.01, 'recovery-job wagon remains near its original task anchor');
assert(layout.some(car => car.parkingType === 'source-parking-aisle'), 'source parking aisles supply actual parking slots');
assert(layout.every(car => car.parkingType !== 'wide-curb' || roadProfile(actual.roads.find(road => (road.sourceId || road.id) === car.sourceRoadId)).driveWidth >= 12), 'ordinary narrow public roads do not receive curb blockers');
assert.deepEqual(generateParkedCars(actual, { isClear: () => false }), [], 'external physical-clearance rejection is authoritative');
const laneSegments = layoutSim.graph.edges.filter(edge => roadProfile(edge.road).trafficAllowed).map(edge => {
  const a = pointOnLane(edge, 0), b = pointOnLane(edge, edge.length);
  return { a: [a.x, a.z], b: [b.x, b.z], minX: Math.min(a.x, b.x) - 5, maxX: Math.max(a.x, b.x) + 5,
    minZ: Math.min(a.z, b.z) - 5, maxZ: Math.max(a.z, b.z) + 5 };
});
let minimumClearance = Infinity;
for (const car of layout) {
  assert(layoutSim.canOccupy(car, { length: 4.8, width: 2 }), `${car.id} respects actual-map building/water/bounds and live vehicles`);
  for (const offset of [-2.4, -1.2, 0, 1.2, 2.4]) {
    const x = car.x - Math.sin(car.yaw) * offset, z = car.z - Math.cos(car.yaw) * offset;
    for (const lane of laneSegments) {
      if (x < lane.minX || x > lane.maxX || z < lane.minZ || z > lane.maxZ) continue;
      const clearance = projectSegment(x, z, lane.a, lane.b).distance;
      minimumClearance = Math.min(minimumClearance, clearance);
      assert(clearance >= 2.5, `${car.id} front/body/rear keeps braking clearance from all directed public lanes (${clearance})`);
    }
  }
}
layoutSim.setParkedCars(layout);
assert(layoutSim.parkedCars.every(car => layoutSim.canOccupy(car, { length: 4.8, width: 2 })), 'the complete generated fleet has no mutual physical overlaps');
const startPositions = layoutSim.traffic.map(car => [car.x, car.z]);
const started = performance.now();
advance(layoutSim, 60);
const stopped = layoutSim.traffic.filter(car => car.active && car.speed < .1).length;
assert.equal(layoutSim.traffic.length, 40, 'actual map keeps the intended stable40-car population');
assert(layoutSim.traffic.every(car => [car.x, car.z, car.speed, car.yaw].every(Number.isFinite)), 'seeded60-second traffic stays finite');
assert(layoutSim.traffic.filter((car, i) => Math.hypot(car.x - startPositions[i][0], car.z - startPositions[i][1]) > 30).length >= 20, 'most real-map cars make useful route progress beside production parking');
assert(stopped <= legacyStopped - 10, `production parking releases at least10 additional cars (${stopped} stopped versus${legacyStopped} legacy)`);
assert(performance.now() - started < 20000, 'actual40-car replay stays within the bounded source-test budget');
console.log(`PASS production parking: ${layout.length} deterministic physical slots, mission wagon retained, minimum lane clearance${minimumClearance.toFixed(2)}m;60s/40cars:${stopped} stopped (legacy${legacyStopped}), no citywide parked-query scan`);
