// Import-time clearance in the same composed world used for play. Input points
// stay at the surveyed coordinates. Drop an obstructed point instead of moving it.
import {readFileSync} from 'node:fs';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {addCapitalWorldObstacles} from './capital-world-obstacles-fixture.mjs';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation, projectSegment} from '../Games/Capital Drive/simulation.js';
import {roadProfile} from '../Games/Capital Drive/road-network.js';

const candidates = JSON.parse(readFileSync(0, 'utf8'));
const map = await loadCapitalMap();
const terrain = createTerrainSampler(map);
addCapitalWorldObstacles(map, terrain);
const simulation = createSimulation(map, {trafficCount:0});
const roads = map.roads.map(road => {
  const xs = road.points.map(p => p[0]), zs = road.points.map(p => p[1]);
  return {points:road.points, halfWidth:roadProfile(road).driveWidth / 2,
    minX:Math.min(...xs), maxX:Math.max(...xs), minZ:Math.min(...zs), maxZ:Math.max(...zs)};
});

function intersectsLane(point, radius) {
  return roads.some(road => {
    const limit = road.halfWidth + radius;
    if (point.x < road.minX-limit || point.x > road.maxX+limit ||
        point.z < road.minZ-limit || point.z > road.maxZ+limit) return false;
    for (let i=1; i<road.points.length; i++) {
      if (projectSegment(point.x, point.z, road.points[i-1], road.points[i]).distance <= limit) return true;
    }
    return false;
  });
}

const retained = [];
const radius = point => point.kind === 'bbq' ? 1.55 : .85;
for (const point of candidates) {
  const r = radius(point);
  if (!Number.isFinite(terrain.heightAt(point.x, point.z))) continue;
  if (!simulation.canOccupy({...point, yaw:0}, {width:r*2, length:r*2})) continue;
  if (intersectsLane(point, r)) continue;
  if (retained.some(other => Math.hypot(point.x-other.x, point.z-other.z) <= r+radius(other))) continue;
  retained.push(point);
}
process.stdout.write(JSON.stringify(retained));
