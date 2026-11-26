import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { SULLIVANS_DISUSED_BRIDGE, disusedBridgeScenery } from '../Games/Capital Drive/disused-bridge.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createWorldView } from '../Games/Capital Drive/world-view.js';
import { loadCapitalMap } from './capital-map-fixture.mjs';

const map = await loadCapitalMap();
const terrain = createTerrainSampler(map);
const record = SULLIVANS_DISUSED_BRIDGE;
assert.equal(record.sourceId, 'way/1231840644');
assert.equal(record.sourceVersion, 2);
assert.deepEqual(record.points, [[509.52, -9337.43], [499.54, -9342.99]]);
assert(!map.roads.some(road => road.sourceId === record.sourceId));
const scenery = disusedBridgeScenery(map, terrain.groundHeightAt);
assert(scenery);
const { x, z, outline, parts } = scenery;
assert.equal(parts.length, 5);
assert.equal(outline.length, 4);
assert(parts.every(part => Object.values(part).every(Number.isFinite)));
assert(Math.abs(parts[0].span - 11.42) < .01);
const [a, b] = record.points;
for (const [u, source] of [[-parts[0].span / 2, a], [parts[0].span / 2, b]]) {
  assert(Math.abs(x + Math.cos(parts[0].yaw) * u - source[0]) < 1e-8);
  assert(Math.abs(z - Math.sin(parts[0].yaw) * u - source[1]) < 1e-8);
}
assert.equal(disusedBridgeScenery({ ...map, regionalExpansion: [] }, terrain.groundHeightAt), null);
assert.equal(disusedBridgeScenery(map, () => NaN), null);

// Render the source locality with the real terrain and both production modes.
// Comparing the same empty local cell without the north owner isolates scenery
// geometry without allocating or changing any physical route.
const focus = { x, z };
const local = {
  bounds: { minX: x - 40, maxX: x + 40, minZ: z - 40, maxZ: z + 40 },
  roads: [], areas: [], buildings: [], landmarks: [], spawn: focus,
  regionalExpansion: [{ regionId: 'north' }],
};
for (const lowGraphics of [true, false]) {
  const scene = new THREE.Scene();
  const options = { terrainSampler: terrain, lowGraphics, streaming: true, openingChunks: 4 };
  const view = createWorldView(scene, local, options);
  view.update(focus, { maxLoads: 8 });
  const baselineScene = new THREE.Scene();
  const baseline = createWorldView(baselineScene, { ...local, regionalExpansion: [] }, options);
  baseline.update(focus, { maxLoads: 8 });
  assert.equal(view.stats.triangles - baseline.stats.triangles, 60, 'five boxes inhabit the mapped chunk once');
  assert.equal(view.heightAt(x, z), baseline.heightAt(x, z), 'closed scenery never grants high ground or new access');
  view.dispose();
  baseline.dispose();
  assert.equal(scene.children.length, 0);
}
console.log('PASS disused source bridge: 11.42 m mapped span, 60 streamed triangles, no route or ground-height owner, both graphics profiles');
