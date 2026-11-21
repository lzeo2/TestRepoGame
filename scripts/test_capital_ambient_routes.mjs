import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { POOL_BARRIERS, MANUKA_POOL_BASIN } from '../Games/Capital Drive/landmarks.js';
import { CAMPUS_BARRIERS } from '../Games/Capital Drive/campus.js';
import { BARRIERS, SKATE_BUILDING_OPENING } from '../Games/Capital Drive/civic-extras.js';
import { createCivicView } from '../Games/Capital Drive/civic-view.js';
import { createNoodleShopView } from '../Games/Capital Drive/noodle-shop-view.js';
import { createBuses } from '../Games/Capital Drive/buses.js';
import { generateParkedCars } from '../Games/Capital Drive/parking-layout.js';

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`, import.meta.url), 'utf8'));
const base = await json('canberra.json');
const map = applyMapExpansion(applyRoadProfiles(base, await json('road-profiles.json')), await json('canberra-north.json'));
map.terrainTiles = [(await json('north-terrain.json')).terrain];
map.lakeWaterLevel = 5.93;
// Keep the reproduced pre-signal scenario so light cycles cannot conceal blocked lane choices.
const terrain = createTerrainSampler(map);
map.barriers = [...POOL_BARRIERS, ...CAMPUS_BARRIERS, ...BARRIERS.map(barrier => {
  const dx = barrier.b[0] - barrier.a[0], dz = barrier.b[1] - barrier.a[1];
  const distance = Math.hypot(dx, dz) || 1, nx = -dz / distance * barrier.width / 2, nz = dx / distance * barrier.width / 2;
  return { ...barrier, points: [[barrier.a[0] + nx, barrier.a[1] + nz], [barrier.b[0] + nx, barrier.b[1] + nz],
    [barrier.b[0] - nx, barrier.b[1] - nz], [barrier.a[0] - nx, barrier.a[1] - nz]] };
})];
map.collisionReplacedBuildingIds = ['act-75267-0', 'osm-584970595'];
map.buildings = map.buildings.map(building => building.id === SKATE_BUILDING_OPENING.buildingId
  ? { ...building, innerRings: [{ points: SKATE_BUILDING_OPENING.polygon }] } : building);
map.areas = [...map.areas, { id: 'manuka-pool-water', type: 'water', points: MANUKA_POOL_BASIN }];
const scene = new THREE.Scene(), civic = createCivicView(scene, map, terrain.heightAt);
const noodle = createNoodleShopView(scene, terrain.heightAt);
try {
  map.barriers.push(...civic.barriers, ...noodle.obstacles);
  const road = (id, points, nodes, width = 8) => ({ id, name: id, type: 'residential', width, points, nodes, oneway: 0 });
  const bounds = { minX: -300, maxX: 300, minZ: -300, maxZ: 300 };
  const fixture = roads => ({ bounds, roads, buildings: [], areas: [], spawn: { x: 250, z: 250, yaw: 0 } });
  const place = (car, edge, position, speed = 0) => Object.assign(car, pointOnLane(edge, position), { edge, position, speed, active: true, overtake: 0 });
  const bodyClear = sim => sim.traffic.every(car => sim.canOccupy(car));
  const opposing = createSimulation(fixture([road('narrow-public', [[-100, 0], [100, 0]], [1, 2], 4.5)]), { trafficCount: 2 });
  place(opposing.traffic[0], opposing.graph.edges[0], 70);
  place(opposing.traffic[1], opposing.graph.edges[1], 70);
  for (let tick = 0; tick < 360; tick++) {
    opposing.step(1 / 60);
    assert(bodyClear(opposing), 'clear opposing lanes preserve swept vehicle clearance');
  }
  assert(opposing.traffic[0].x > 5 && opposing.traffic[1].x < -5, 'clear opposing cars pass on a real-width narrow public road');

  const crossing = createSimulation(fixture([
    road('east-public', [[-100, 0], [0, 0], [100, 0]], [1, 2, 3]),
    road('north-public', [[0, 100], [0, 0], [0, -100]], [4, 2, 5])
  ]), { trafficCount: 2 });
  const east = crossing.graph.edges.find(edge => edge.road.id === 'east-public' && edge.from.id === '1');
  const north = crossing.graph.edges.find(edge => edge.road.id === 'north-public' && edge.from.id === '4');
  place(crossing.traffic[0], north, 98);
  place(crossing.traffic[1], east, 91.16, 24);
  crossing.step(.05);
  assert(crossing.traffic[1].x <= -7.84 + 1e-8, 'fast yielding car cannot overshoot the six-metre junction clearance');
  for (let tick = 0; tick < 360; tick++) {
    crossing.step(1 / 60);
    assert(bodyClear(crossing), 'crossing yield and release preserve whole-body clearance');
  }
  assert(Math.hypot(crossing.traffic[1].x + 7.84, crossing.traffic[1].z + 1.84) > 15, 'yielding public-road car resumes once the crossing car clears');

  const simulation = createSimulation(map, { seed: 20261112, isOnBridge: terrain.isOnBridge });
  const parked = generateParkedCars(map, { isClear: (_x, _z, _radius, pose) => simulation.canOccupy(pose, { length: 4.8, width: 2 }) });
  simulation.setParkedCars(parked);
  const staticProbe = createSimulation(map, { trafficCount: 0, isOnBridge: terrain.isOnBridge });
  const auditedEdges = new Set();
  function staticEdgeClear(edge) {
    const samples = Math.max(1, Math.ceil(edge.length / .5));
    for (let sample = 0; sample <= samples; sample++) {
      if (!staticProbe.canOccupy(pointOnLane(edge, edge.length * sample / samples), { ignoreId: 'player' })) return false;
    }
    return true;
  }
  for (const edgeId of [30759, 26813, 27083, 27079, 26248, 29460, 26000, 33036]) {
    assert(!staticEdgeClear(simulation.graph.edges[edgeId]), `retained source geometry really obstructs edge ${edgeId}`);
  }
  const buses = createBuses(map, simulation);
  simulation.setExternalVehicles(buses.vehicles);
  assert.equal(simulation.traffic.length, 40);
  assert.equal(buses.vehicles.length, 2);
  assert.equal(parked.length, 887);
  function auditRoutes(frame) {
    for (const car of simulation.traffic) if (car.active) {
      if (!auditedEdges.has(car.edge.id)) {
        assert(staticEdgeClear(car.edge), `${car.id} selected source edge ${car.edge.id} with an impassable static lane at frame ${frame}`);
        auditedEdges.add(car.edge.id);
      }
    }
  }
  auditRoutes(0);
  const driven = simulation.traffic.map(() => 0);
  const snapshots = [];
  for (let frame = 1; frame <= 7200; frame++) {
    const previous = simulation.traffic.map(car => ({ x: car.x, z: car.z }));
    simulation.setExternalVehicles(buses.vehicles);
    simulation.step(1 / 60);
    buses.step(1 / 60);
    auditRoutes(frame);
    simulation.traffic.forEach((car, index) => {
      const distance = Math.hypot(car.x - previous[index].x, car.z - previous[index].z);
      if (distance <= 8.01) driven[index] += distance; // Exclude existing off-screen refreshes from driving proof.
    });
    if (frame === 3600 || frame === 7200) snapshots.push(simulation.traffic.map(car => ({ id: car.id, x: car.x, z: car.z, speed: car.speed })));
  }
  // The observed roundabout cars form a valid following queue behind the
  // stationary player. Do not demand that cars drive through that real blocker.
  const progressed = driven.filter(distance => distance > 30).length;
  assert(progressed >= 20, 'most ambient cars make useful progress on physically traversable source roads');
  const stopped = snapshots.map(snapshot => snapshot.filter(car => car.speed < .1).length);
  console.log(`PASS ambient routes: 40 cars, 2 buses, 887 parked and ${map.barriers.length} actual barriers; 7200 frames audit selected static lanes; ${auditedEdges.size} traversable directed lanes, ${progressed} cars progressed; stopped ${stopped.join('/')} (legitimate physical queues remain).`);
} finally {
  civic.dispose();
  noodle.dispose();
}
