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
import { generateParkedCars } from '../Games/Capital Drive/parking-layout.js';

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`, import.meta.url), 'utf8'));
const base = await json('canberra.json'), sourceSpawn = { ...base.spawn };
const map = applyMapExpansion(applyRoadProfiles(base, await json('road-profiles.json')), await json('canberra-north.json'));
map.terrainTiles = [(await json('north-terrain.json')).terrain];
map.lakeWaterLevel = 5.93;
map.trafficSignals = await json('traffic-signals.json');
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
  const simulation = createSimulation(map, { isOnBridge: terrain.isOnBridge });
  const parked = generateParkedCars(map, { isClear: (x, z, radius, pose) => simulation.canOccupy(pose, { length: 4.8, width: 2 }) });
  simulation.setParkedCars(parked);
  assert.equal(simulation.traffic.length, 40, 'the actual runtime uses all forty traffic slots');
  assert(parked.length > 800, 'the actual source parking population is present');
  assert(map.barriers.length > 500, 'pool, campus, skate, Civic and noodle obstacles are present');
  assert.deepEqual({ x: simulation.player.x, z: simulation.player.z, yaw: simulation.player.yaw }, sourceSpawn);
  assert(simulation.canOccupy(simulation.player), 'the complete car body clears actual runtime geometry on fresh boot');
  const results = [];
  for (const throttle of [1, -1, 1]) {
    simulation.reset();
    assert(simulation.canOccupy(simulation.player), 'reset clears the whole body with parked cars and live traffic present');
    assert.deepEqual([simulation.player.x, simulation.player.z, simulation.player.yaw], [sourceSpawn.x, sourceSpawn.z, sourceSpawn.yaw]);
    assert.deepEqual([simulation.player.speed, simulation.player.vx, simulation.player.vz, simulation.player.odometer, simulation.player.crashes], [0, 0, 0, 0, 0]);
    const start = { ...simulation.player };
    // One second proves departure in both directions; the real campus fence
    // behind the gate remains a physical obstacle farther down the reverse path.
    for (let tick = 0; tick < 60; tick++) simulation.step(1 / 60, { throttle });
    const distance = Math.hypot(simulation.player.x - start.x, simulation.player.z - start.z);
    assert(distance > 4.5 && simulation.player.speed * throttle > 9, 'ordinary forward/reverse input accelerates away from spawn');
    assert(simulation.canOccupy(simulation.player), 'the car remains physically clear after leaving spawn');
    assert.equal(simulation.player.crashes, 0, 'the clear spawn departure creates no impact');
    results.push(`${throttle > 0 ? 'forward' : 'reverse'} ${distance.toFixed(2)}m`);
  }
  assert.deepEqual(base.spawn, sourceSpawn, 'source spawn coordinates remain unchanged');
  console.log(`PASS actual spawn: ${map.roads.length} roads, ${map.barriers.length} barriers, ${parked.length} parked, 40 traffic; ${results.join(', ')}. Geometry was already clear before this regression; saved vehicle health is controller-owned.`);
} finally {
  civic.dispose();
  noodle.dispose();
}
