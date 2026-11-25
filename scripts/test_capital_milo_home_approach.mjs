import assert from 'node:assert/strict';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { addCapitalWorldObstacles } from './capital-world-obstacles-fixture.mjs';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';

const map = await loadCapitalMap(), terrain = createTerrainSampler(map);
const { simulation } = addCapitalWorldObstacles(map, terrain);
const origin = { x: 449.10381964678396, z: -156.51384147021463 };
const road = simulation.nearestRoad(origin.x, origin.z);
Object.assign(simulation.player, origin, { yaw: road.yaw, speed: 0, y: undefined, supportY: undefined });
const gameplay = createGameplay(map, simulation, { sandbox: true, heightAt: terrain.heightAt });
assert(gameplay.interact(), 'native interaction exits opening car');
const actor = gameplay.state.actor, start = { ...actor }, target = { x: 449.158, z: -134.290 };
const direct = { ...start };
assert(simulation.moveActor(direct, target.x - start.x, target.z - start.z, .45).blocked,
  'direct diagonal from driver door encounters local obstacles');
const waypoints = [{ x: start.x, z: -137.49552864640572 }, { x: 448.8410464140123, z: -134.99552864640572 }, target];
let distance = 0;
for (const point of waypoints) {
  for (let i = 0; i < 200 && Math.hypot(point.x - actor.x, point.z - actor.z) > .001; i++) {
    const dx = point.x - actor.x, dz = point.z - actor.z, length = Math.hypot(dx, dz), step = Math.min(.2, length);
    const moved = simulation.moveActor(actor, dx / length * step, dz / length * step, .45);
    assert(!moved.blocked, `opening home waypoint is reachable at ${actor.x},${actor.z}`);
    distance += moved.distance;
  }
  assert(Math.hypot(point.x - actor.x, point.z - actor.z) < .001, 'reached waypoint through continuous short sweeps');
}
const interiors = createInteriors(map), entry = interiors.findEntry(actor);
assert.equal(entry?.id, 'house-act-101738-0', 'approach detects actual marked house entrance');
assert(interiors.enter(entry, actor), 'ordinary entrance interaction enters first home');
console.log(`PASS Milo opening car exit, ${distance.toFixed(2)}m production-obstacle doorstep walk and actual home entry`);
