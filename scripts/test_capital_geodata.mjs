import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const evidence = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/geodata-validation.json', import.meta.url), 'utf8'));
const terrain = map.terrain;
assert.equal(map.roads.length, 5197, 'established drivable road network is preserved');
assert.equal(new Set(map.roads.map(r => r.id)).size, map.roads.length);
for (const key of ['roadsUnchanged', 'boundsUnchanged', 'landmarksUnchanged', 'spawnUnchanged']) assert.equal(evidence[key], true, key);
assert.equal(terrain.cols, 513);
assert.equal(terrain.rows, 513);
assert.equal(terrain.heights.length, terrain.cols * terrain.rows);
assert.equal(terrain.verticalDatum, 'AHD');
assert.equal(terrain.nativeContourIntervalMetres, 2);
assert.match(terrain.source, /contour/);
assert(terrain.heights.every(Number.isFinite));
const minimum = terrain.heights.reduce((a, b) => Math.min(a, b), Infinity);
const maximum = terrain.heights.reduce((a, b) => Math.max(a, b), -Infinity);
assert(minimum + 550 > 500, 'all-zero or missing elevation source must never be admitted');
assert(maximum - minimum > 200, 'actual Red Hill relief is retained');
assert.equal(terrain.validation.nearestFillCells, 0, 'no fabricated filling outside contour coverage');
assert(terrain.validation.heldOutPoints > 10000);
assert(terrain.validation.heldOutP95AbsoluteMetres < 1, 'interpolation follows held-out contour heights');
assert(Number.isFinite(terrain.validation.heldOutMaxAbsoluteMetres));
assert(terrain.validation.heldOutMaxAbsoluteMetres >= terrain.validation.heldOutP95AbsoluteMetres);
assert(map.buildings.length > 12000, 'additional source-derived outlines are present');
assert.equal(new Set(map.buildings.map(b => b.id)).size, map.buildings.length);
const counts = { act: 0, osm: 0, microsoft: 0 };
for (const building of map.buildings) {
  assert(building.source in counts, `unknown outline source: ${building.id}`);
  counts[building.source]++;
  assert(building.points.length >= 4);
  assert(building.points.every(p => p.length === 2 && p.every(Number.isFinite)));
  assert(Number.isFinite(building.height) && building.height > 0);
  if (building.source === 'microsoft') {
    assert.match(building.id, /^ms-311230302-/);
    assert.match(building.heightSource, /estimate/);
  }
}
assert.deepEqual(counts, map.meta.sourceCounts.buildingSources);
assert.equal(evidence.newFootprints, map.buildings.length);
assert.equal(evidence.sampleLocations.length, 7);
assert(Object.keys(map.meta.sourceHashes).includes('Contour_2m.gdb.zip'));
assert(Object.keys(map.meta.sourceHashes).includes('ms-311230302.geojsonl.gz'));
console.log(`PASS geodata: ${map.buildings.length} attributed real-source outlines; 513x513 ACT contour terrain; finite AHD elevations, preserved map contract and disclosed validation limits`);
