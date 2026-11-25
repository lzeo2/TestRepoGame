import assert from 'node:assert/strict';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const map = await loadCapitalMap(), terrain = createTerrainSampler(map);
const simulation = createSimulation(map, { trafficCount: 0, isOnBridge: terrain.isOnBridge,
  groundHeightAt: terrain.groundHeightAt, vehicleHeightAt: terrain.vehicleHeightAt,
  actorHeightAt: pose => Number.isFinite(pose.y) ? pose.y : terrain.heightAt(pose.x, pose.z) });
for (const [id, segment, fraction] of [['31345303-0', 5, .1], ['4844798-0', 0, .9]]) {
  const edge = simulation.graph.edges.find(e => e.road.id === id && e.segment.index === segment && e.direction === 1);
  assert(edge, `mapped Bowen Drive edge ${id}`);
  const pose = { ...simulation.player, ...pointOnLane(edge, edge.length * fraction), edge, y: undefined, supportY: undefined };
  assert(simulation.canOccupy(pose, { ignoreId: 'player' }), `${id} passes below Kings Avenue rail`);
}
const rail = map.barriers.find(b => b.id === 'osm-guard-rail-1337307982-4');
assert(rail, 'upper rail remains in collision map');
const owner = map.roads.find(r => r.id === rail.roadContext.id);
const x = (rail.a[0] + rail.b[0]) / 2, z = (rail.a[1] + rail.b[1]) / 2;
const upperY = terrain.roadHeightAt(owner, x, z), groundY = terrain.groundHeightAt(x, z);
assert(upperY - groundY > 4, 'confirmed deck clearance');
assert(Math.abs(terrain.heightAt(x, z) - upperY) < .5, 'rendered rail support matches its retained deck owner');
const yaw = Math.atan2(-(rail.b[0] - rail.a[0]), -(rail.b[1] - rail.a[1]));
const car = { ...simulation.player, x, z, yaw, y: upperY + .18, edge: { road: owner } };
assert.equal(simulation.canOccupy(car, { ignoreId: 'player' }), false, 'upper deck car still hits rail');
assert.equal(simulation.canOccupy({ ...car, y: groundY + .18 }, { ignoreId: 'player' }), true, 'lower car clears the same retained rail');
assert.equal(simulation.moveActor({ x, z, y: groundY, height: 1.8 }, 0, 0, .4).blocked, false, 'walker passes below rail');
assert.equal(simulation.moveActor({ x, z, y: upperY, height: 1.8 }, 0, 0, .4).blocked, true, 'upper deck walker still hits rail');
console.log('PASS Kings Avenue guardrail preserves upper contacts and lower Bowen Drive passage');
