import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {prepareWarMemorial, WAR_MEMORIAL_DATA as site} from '../Games/Capital Drive/war-memorial.js';
import {buildWarMemorialGeometry, createWarMemorialView} from '../Games/Capital Drive/war-memorial-view.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';

const data = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`, import.meta.url)));
const base = await data('canberra.json'), north = await data('canberra-north.json');
const merged = applyMapExpansion(base, north);
merged.terrainTiles = [(await data('north-terrain.json')).terrain];
const before = JSON.stringify(merged), map = prepareWarMemorial(merged);
assert.equal(JSON.stringify(merged), before, 'preparation never mutates original geographic map');
assert.equal(map.buildings, merged.buildings, 'all existing physical collision owners retained');
assert.equal(map.roads, merged.roads); assert.equal(map.terrain, merged.terrain);
assert.equal(map.terrainTiles, merged.terrainTiles);
assert.equal(prepareWarMemorial(map), map, 'preparation idempotent');
assert.equal(prepareWarMemorial({buildings: []}).warMemorial, undefined, 'no geographic source means no invented landmark');
const original = map.buildings.find(b => b.id === 'osm-5090724');
assert.deepEqual(original.points, site.main.points, 'rendering retains the exact mapped outer footprint');
assert.deepEqual(map.buildings.find(b => b.id === 'osm-520199710').points, site.courtyard.points);
assert(map.landmarkBuildingIds.includes(original.id));
assert(map.landmarkBuildingIds.includes('osm-520199710'), 'no generic block fills the visible open source courtyard');
assert.equal(map.landmarks.filter(p => p.id === site.id).length, 1);
assert(map.landmarkTreeExclusions.includes(site.main.points));
for (const feature of site.paved) assert(map.landmarkTreeExclusions.includes(feature.points));
assert.equal(site.source.license, 'ODbL-1.0');
assert.equal(site.source.relationId, 'relation/7527080');
assert.match(site.source.sha256, /^[a-f\d]{64}$/);
assert.match(site.interpretation, /estimates/); assert.match(site.interpretation, /no interior/i);
assert(Object.isFrozen(site.main.points[0]));
assert.equal(site.main.points.length, 61); assert.equal(site.dome.points.length, 17);
assert.equal(site.paved.length, 10); assert.equal(site.lawns.length, 19); assert.equal(site.paths.length, 10);
for (const feature of [site.main, site.courtyard, site.tower, site.dome, ...site.paved, ...site.lawns, ...site.paths]) {
  assert.match(feature.sourceId, /^way\/\d+$/); assert(Number.isInteger(feature.version));
  for (const [x, z] of feature.points) assert(x >= map.bounds.minX && x <= map.bounds.maxX && z >= map.bounds.minZ && z <= map.bounds.maxZ,
    'the compiled public exterior is wholly contained by the existing source map');
}
const sampler = createTerrainSampler(map), geometry = buildWarMemorialGeometry(site, sampler.groundHeightAt);
assert(geometry.triangles > 5000 && geometry.triangles < 16000);
assert.equal(geometry.archedWindows,1);
assert.equal(geometry.domeSeams,site.dome.points.length-1);
assert(geometry.panels > 40 && geometry.panels <= 180);
assert.equal(geometry.terraceBands, 19, 'bounded tread detail stays within the mapped public stair polygon');
assert(geometry.groundTriangles > 4000, 'actual public paving/lawn polygons are finely draped over source terrain');
assert(Math.abs(geometry.roofY - geometry.baseY - 11.2) < 1e-9);
assert(Math.abs(geometry.domeTop - geometry.baseY - 28.7) < 1e-9, 'source dome height preserved');
for (const mesh of [geometry.body, geometry.detail]) {
  for (const name of ['position', 'color', 'normal']) assert([...mesh.attributes[name].array].every(Number.isFinite));
  assert.equal(mesh.attributes.position.count, mesh.attributes.color.count);
  assert(mesh.boundingSphere.radius < 250, 'one small local source landmark, not a city-scale mesh');
}
const ringArea = ring => Math.abs(ring.slice(1).reduce((sum, p, i) => sum + ring[i][0] * p[1] - p[0] * ring[i][1], 0) / 2);
const positions = geometry.body.attributes.position.array;
let roofArea = 0;
for (let i = 0; i < positions.length; i += 9) {
  if (![positions[i + 1], positions[i + 4], positions[i + 7]].every(y => Math.abs(y - geometry.roofY) < 0.00001)) continue;
  const ax = positions[i], az = positions[i + 2], bx = positions[i + 3], bz = positions[i + 5], cx = positions[i + 6], cz = positions[i + 8];
  roofArea += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2;
}
assert(Math.abs(roofArea - ringArea(site.main.points) + ringArea(site.courtyard.points)) < 0.05,
  'actual source roof triangles cover the main plan while retaining the entire mapped courtyard hole');
assert.throws(() => buildWarMemorialGeometry(site, () => NaN), /Non-finite/);
// Changing a map footprint must be explicit, never silently render stale art.
assert.throws(() => prepareWarMemorial({...merged, buildings: merged.buildings.map(b => b.id === original.id ? {...b, points: [[0, 0], [1, 0], [0, 1]]} : b)}), /footprint changed/);
// A genuinely paved public approach remains physically outside the source body.
const simulation = createSimulation(map, {trafficCount: 0, parkedCount: 0, isOnBridge: sampler.isOnBridge});
assert.equal(simulation.canOccupy({x: 1019.51, z: -4074.01, yaw: 0}, {length: 0.6, width: 0.6}), true);
assert.equal(simulation.canOccupy({x: 1110, z: -4189, yaw: 0}, {length: 0.6, width: 0.6}), false,
  'main shell retains actual source building collision');
const scene = new THREE.Scene(), view = createWarMemorialView(scene, map, sampler.groundHeightAt);
assert.equal(view.stats.meshes, 2); assert.equal(scene.children.length, 1);
view.update(site); assert.equal(view.stats.visibleMeshes, 2);
view.update({x: site.x + 800, z: site.z}); assert.equal(view.stats.visibleMeshes, 1);
view.update({x: site.x + 3100, z: site.z}); assert.equal(view.stats.visibleMeshes, 0);
view.update(null); assert.equal(view.stats.visibleMeshes, 0);
const root = scene.children[0], bodies = root.children.slice();
let disposedGeometries = 0, disposedMaterials = 0;
for (const mesh of bodies) mesh.geometry.addEventListener('dispose', () => disposedGeometries++);
bodies[0].material.addEventListener('dispose', () => disposedMaterials++);
for (let i = 0; i < 50; i++) view.update(site);
assert.equal(root.children.length, 2, 'supplied updates never create or grow meshes');
view.dispose(); view.dispose(); view.update(site);
assert.equal(disposedGeometries, 2); assert.equal(disposedMaterials, 1);
assert.equal(view.stats.visibleMeshes, 0); assert.equal(scene.children.length, 0);
const absent = createWarMemorialView(scene, {}, sampler.groundHeightAt);
absent.update(site); absent.dispose(); assert.equal(scene.children.length, 0);
geometry.body.dispose(); geometry.detail.dispose();
// Optional local raw-source closure and byte-for-byte deterministic regeneration.
const cacheIndex = process.argv.indexOf('--source-cache');
if (cacheIndex !== -1) {
  const directory = await mkdtemp(join(tmpdir(), 'capital-memorial-test-'));
  try {
    for (const file of ['first.js', 'second.js']) {
      const result = spawnSync('python3', ['-B', new URL('./build_capital_war_memorial.py', import.meta.url).pathname,
        '--source-cache', process.argv[cacheIndex + 1], '--output', join(directory, file)], {encoding: 'utf8'});
      assert.equal(result.status, 0, result.stderr);
    }
    const expected = await readFile(new URL('../Games/Capital Drive/war-memorial-data.js', import.meta.url));
    assert.deepEqual(await readFile(join(directory, 'first.js')), expected);
    assert.deepEqual(await readFile(join(directory, 'second.js')), expected);
  } finally { await rm(directory, {recursive: true, force: true}); }
}
console.log(`PASS Memorial exterior: exact source/collision, public approach, ${geometry.triangles} triangles, 2 draws, LOD, disposal${cacheIndex !== -1 ? ', pinned deterministic rebuild' : ''}`);
