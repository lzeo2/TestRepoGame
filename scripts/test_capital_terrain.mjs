import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const folder = new URL('../Games/Capital Drive/', import.meta.url);
const source = await readFile(new URL('terrain.js', folder), 'utf8');
const { createTerrainSampler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const baseBytes = await readFile(new URL('data/canberra.json', folder));
const base = JSON.parse(baseBytes);
const north = JSON.parse(await readFile(new URL('data/canberra-north.json', folder), 'utf8'));
const data = JSON.parse(await readFile(new URL('data/north-terrain.json', folder), 'utf8'));
const tile = data.terrain;
assert.equal(data.schemaVersion, 1);
assert.equal(tile.sourceSha256, base.meta.sourceHashes['Contour_2m.gdb.zip']);
assert.equal(tile.sourceSha256, 'b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9');
assert.deepEqual(tile.extent, [149.103, -35.303, 149.174, -35.268]);
assert.deepEqual(tile.origin, base.meta.origin);
assert.equal(tile.heights.length, tile.cols * tile.rows);
assert(tile.heights.every(Number.isFinite), 'all actual imported grid values finite');
assert(tile.heights.length < 500_000 && tile.cellSpacingMetres.every(value => value <= 25));
assert.equal(tile.validation.nearestFillCells, 0);
assert(tile.validation.trainingPoints > 100_000 && tile.validation.heldOutPoints > 10_000);
assert(tile.validation.heldOutP95AbsoluteMetres < 2, 'numerical contour consistency, not independent survey error');
assert(Math.max(...tile.heights) - Math.min(...tile.heights) > 50, 'extended terrain is not a flat north clamp');
assert(tile.minZ < -5500 && tile.maxZ > base.terrain.minZ && tile.minX === base.terrain.minX && tile.maxX === base.terrain.maxX);
const baseBefore = JSON.stringify(base), tileBefore = JSON.stringify(tile), northBefore = JSON.stringify(north);
const original = createTerrainSampler(base);
const map = { ...base, roads: [...base.roads, ...north.roads], terrainTiles: [tile] };
const sampler = createTerrainSampler(map);
assert.equal(sampler.stats.tiles, 1);
assert(sampler.stats.bridgeSegments > 30 && sampler.stats.bridgeSegments < 1000, 'bounded precomputed bridge profiles');
for (let x = tile.minX + 1; x < tile.maxX; x += 71) {
  for (let z = tile.blendSouthZ; z < base.terrain.maxZ; z += 163) {
    assert.equal(sampler.groundHeightAt(x, z), original.groundHeightAt(x, z), 'original southern ground remains exact');
  }
  for (const seam of [tile.blendSouthZ, tile.blendNorthZ]) {
    assert(Math.abs(sampler.groundHeightAt(x, seam - .001) - sampler.groundHeightAt(x, seam + .001)) < .05, 'continuous overlap seam');
  }
  for (let z = tile.minZ; z < base.terrain.minZ; z += 73) assert(Number.isFinite(sampler.groundHeightAt(x, z)));
}
const centre = north.landmarks.find(place => place.id === 'canberra-centre');
assert(centre, 'Canberra Centre has a sourced anchor');
assert(Number.isFinite(sampler.groundHeightAt(centre.x, centre.z)));
assert(Math.abs(sampler.groundHeightAt(centre.x, centre.z) - original.groundHeightAt(centre.x, centre.z)) > 1, 'Civic uses actual extended elevations');
const lakeBridges = north.roads.filter(road => road.sourceTags?.bridge === 'yes' && ['Kings Avenue', 'Commonwealth Avenue'].includes(road.name) &&
  Math.hypot(road.points.at(-1)[0] - road.points[0][0], road.points.at(-1)[1] - road.points[0][1]) > 200);
assert(lakeBridges.length >= 4);
for (const road of lakeBridges) {
  const a = road.points[0], b = road.points.at(-1), x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
  assert(sampler.isOnBridge(x, z, 1.1), `${road.id} supports vehicle-radius water exemption`);
  assert(sampler.bridgeHeightAt(x, z) >= 8.43, 'estimated deck clears assumed 5.93m lake surface by 2.5m');
  assert(sampler.heightAt(x, z) > sampler.groundHeightAt(x, z), 'deck is separate from ground');
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  assert(!sampler.isOnBridge(x - dz / length * 40, z + dx / length * 40), 'distant water/land does not inherit bridge height');
  assert.equal(sampler.heightAt(x - dz / length * 40, z + dx / length * 40), sampler.groundHeightAt(x - dz / length * 40, z + dx / length * 40));
}
// Shared OSM bridge joints must not gain a run-by-run height discontinuity.
const heightsAtJoints = new Map();
for (const segment of sampler.bridgeSegments) for (const [point, height] of [[segment.a, segment.y0], [segment.b, segment.y1]]) {
  const key = `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
  if (heightsAtJoints.has(key)) assert(Math.abs(heightsAtJoints.get(key) - height) < .001, 'connected bridge profile continuity');
  heightsAtJoints.set(key, height);
}
assert.equal(JSON.stringify(base), baseBefore);
assert.equal(JSON.stringify(tile), tileBefore);
assert.equal(JSON.stringify(north), northBefore);
console.log(JSON.stringify({ result: 'PASS', grid: [tile.cols, tile.rows], sourceSamples: tile.validation.trainingPoints,
  heldOutP95Metres: tile.validation.heldOutP95AbsoluteMetres, bridgeSegments: sampler.stats.bridgeSegments,
  baseSha256: createHash('sha256').update(baseBytes).digest('hex'), note: 'Numerical source/seam/deck checks only; no survey or hardware-performance certification.' }));
