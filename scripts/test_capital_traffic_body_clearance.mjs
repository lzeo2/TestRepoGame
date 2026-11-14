import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
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
// Keep the reproduced pre-signal scenario: signal timing must not conceal a body-overlap bug.
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
  // Captured at 20.983333s in the original source roundabout replay. The
  // translation is clear; easing the old heading into its neighbour was not.
  const rotation = createSimulation(map, { trafficCount: 1, seed: 20261112, isOnBridge: terrain.isOnBridge });
  const turning = rotation.traffic[0];
  Object.assign(turning, { x: -352.18173012129444, z: -410.40571362257157,
    yaw: -1.6371285194705876, edge: rotation.graph.edges[31236], position: .19366101874075223,
    speed: 0, active: true, overtake: 0 });
  rotation.setExternalVehicles([{ id: 'captured-neighbour', x: -347.82616123696664, z: -408.3224891075777,
    yaw: -2.362502400571921, length: 4.5, width: 1.8, active: true }]);
  assert(rotation.canOccupy(turning), 'captured old heading has whole-body clearance');
  assert(!rotation.canOccupy({ ...turning, yaw: -1.6548962329647061 }), 'captured eased heading really intersects its neighbour');
  rotation.step(1 / 60);
  assert(rotation.canOccupy(turning), 'traffic rotation must preserve clearance after its swept translation');

  const held = { x: turning.x, z: turning.z };
  rotation.setExternalVehicles([]);
  for (let tick = 0; tick < 120; tick++) {
    rotation.step(1 / 60);
    assert(rotation.canOccupy(turning), 'released turning body keeps physical clearance');
  }
  assert(Math.hypot(turning.x - held.x, turning.z - held.z) > 3, 'removing the captured lead releases ordinary driving on the same source road');

  const simulation = createSimulation(map, { seed: 20261112, isOnBridge: terrain.isOnBridge });
  const parked = generateParkedCars(map, { isClear: (_x, _z, _radius, pose) => simulation.canOccupy(pose, { length: 4.8, width: 2 }) });
  simulation.setParkedCars(parked);
  const buses = createBuses(map, simulation);
  simulation.setExternalVehicles(buses.vehicles);
  assert.equal(simulation.traffic.length, 40);
  assert.equal(buses.vehicles.length, 2);
  assert.equal(parked.length, 887);
  function assertClear(frame) {
    for (const car of simulation.traffic) if (car.active) {
      assert(simulation.canOccupy(car), `${car.id} body overlaps at frame ${frame}, x=${car.x}, z=${car.z}, yaw=${car.yaw}`);
    }
  }
  assertClear(0);
  const snapshots = [];
  for (let frame = 1; frame <= 7200; frame++) {
    simulation.setExternalVehicles(buses.vehicles);
    simulation.step(1 / 60);
    buses.step(1 / 60);
    assertClear(frame);
    if (frame === 3600 || frame === 7200) snapshots.push(simulation.traffic.map(car => ({ id: car.id, x: car.x, z: car.z, speed: car.speed })));
  }
  // The observed roundabout cars form a valid following queue behind the
  // stationary player. Do not demand that cars drive through that real blocker.
  const stopped = snapshots.map(snapshot => snapshot.filter(car => car.speed < .1).length);
  console.log(`PASS traffic body clearance: 40 cars, 2 buses, 887 parked and ${map.barriers.length} actual barriers; all 7200 frames retain whole-body clearance; captured rotation/released lead verified; stopped ${stopped.join('/')} (legitimate physical queues remain).`);
} finally {
  civic.dispose();
  noodle.dispose();
}
