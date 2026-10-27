import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { createRiverTerrain } from './river-data.mjs';
import { createRiverGroundGeometry, groupRiverMaterials, createBridgePool } from './river-render.mjs';
import { createPlayableGroundGeometry, createRoadPool } from './world.mjs';
import { RoadGrid } from './roads.mjs';
import { createCityBuildingKit } from './city-render.mjs';
import { NEW_BUILDINGS } from './city-content.mjs';
import { syncModels } from './native-actions.mjs';

for (const size of [0, 11, 201, NaN, 12.5]) assert.throws(() => createRiverTerrain(size), RangeError);
assert.throws(() => createRiverTerrain(12, 'unknown'), RangeError);
let checkedCells = 0;
for (let size = 12; size <= 200; size++) {
  const a = createRiverTerrain(size), b = createRiverTerrain(size), flat = createRiverTerrain(size, 'legacy-flat');
  const mid = Math.floor(size / 2);
  assert.equal(a.layout, 'river-v1');
  for (let z = mid - 2; z <= mid + 2; z++) for (let x = mid - 2; x <= mid + 2; x++) {
    assert(!a.isWater(x, z) && !a.isBank(x, z), `dry starter ${size}:${x},${z}`);
    assert.equal(a.heightAt(x, z), 0);
  }
  for (let z = 0; z < size; z++) {
    const water = [], banks = [];
    for (let x = 0; x < size; x++) {
      checkedCells++;
      assert.equal(a.isWater(x, z), b.isWater(x, z));
      assert.equal(a.isBank(x, z), b.isBank(x, z));
      assert.equal(a.heightAt(x, z), b.heightAt(x, z));
      assert(!flat.isWater(x, z) && !flat.isBank(x, z)); assert.equal(flat.heightAt(x, z), 0);
      if (a.isWater(x, z)) { water.push(x); assert(a.heightAt(x, z) <= a.waterHeight + 1e-12); }
      if (a.isBank(x, z)) { banks.push(x); assert(a.heightAt(x, z) > a.waterHeight && a.heightAt(x, z) < 0); }
    }
    assert(water.length > 0, `full river length at ${size}:${z}`);
    assert.equal(water.at(-1) - water[0] + 1, water.length, 'contiguous E-W bridge candidates');
    assert(banks.some(x => x < water[0]) && banks.some(x => x > water.at(-1)), 'both banks');
    assert(water[0] > 0 && water.at(-1) < size - 1, 'dry approach lots on both sides');
    assert.equal(a.heightAt(0, z), 0, 'western dry buildable space');
    assert.equal(a.heightAt(size - 1, z), 0, 'eastern dry buildable space');
  }
  for (const [x, z] of [[NaN, 0], [0, Infinity], [-1, 0], [size, 0], [0, -1], [0, size]]) {
    assert(!a.isWater(x, z) && !a.isBank(x, z)); assert.equal(a.heightAt(x, z), 0);
  }
}
const large = createRiverTerrain(200);
assert.equal(large.centerAt(99.5), 88, 'river near hall, not distant perimeter');

let maxTriangles = 0;
for (const size of [12, 13, 20, 32, 64, 128, 199, 200]) {
  const terrain = createRiverTerrain(size), geometry = createRiverGroundGeometry(terrain, 10);
  const worldGeometry = createPlayableGroundGeometry(size * 5, terrain);
  assert.deepEqual(worldGeometry.attributes.position.array, geometry.attributes.position.array);
  worldGeometry.dispose();
  const p = geometry.attributes.position, index = geometry.index;
  maxTriangles = Math.max(maxTriangles, index.count / 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(p, index.getX(i)); b.fromBufferAttribute(p, index.getX(i + 1)); c.fromBufferAttribute(p, index.getX(i + 2));
    assert(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).y > 0);
    const x = (a.x + b.x + c.x) / 30 + size / 2 - .5;
    const z = (a.z + b.z + c.z) / 30 + size / 2 - .5;
    assert(Math.abs(terrain.heightAt(x, z) - (a.y + b.y + c.y) / 3) < .0001, 'rendered triangle matches authoritative height');
  }
  const originalTriangles = [];
  for (let i = 0; i < index.count; i += 3) originalTriangles.push([...index.array.slice(i, i + 3)].join(','));
  const diagnostics = { notes: [] };
  groupRiverMaterials(geometry, diagnostics);
  assert.equal(diagnostics.groundGroups, 3); assert.deepEqual(diagnostics.unused, []);
  assert(Object.values(diagnostics.groundTriangles).every(n => n > 0));
  const groupedTriangles = [];
  for (let i = 0; i < index.count; i += 3) groupedTriangles.push([...index.array.slice(i, i + 3)].join(','));
  assert.deepEqual(groupedTriangles.sort(), originalTriangles.sort(), 'material buckets preserve geometry/winding');
  geometry.dispose();

  const scene = new THREE.Scene(), grid = new RoadGrid(size), bridge = createBridgePool(scene, grid, terrain);
  assert(bridge.candidateCount <= size * 10, 'corridor cache, not whole-map instances');
  assert.equal(bridge.sync(), true); assert.equal(bridge.mesh.count, 0);
  const z = Math.floor(size / 2);
  grid.place({ x: 0, z }, { x: size - 1, z });
  const crossingCells = Array.from({ length: size }, (_, x) => x).filter(x => terrain.isWater(x, z) || terrain.isBank(x, z));
  assert.equal(bridge.sync(), true); assert.equal(bridge.mesh.count, crossingCells.length * 3, 'one deck and two side rails per corridor cell');
  const matrixVersion = bridge.mesh.instanceMatrix.version;
  assert.equal(bridge.sync(), false); assert.equal(bridge.mesh.instanceMatrix.version, matrixVersion, 'no unchanged-frame uploads');
  const matrix = new THREE.Matrix4();
  bridge.mesh.getMatrixAt(0, matrix);
  const pos = new THREE.Vector3(), scale = new THREE.Vector3(); matrix.decompose(pos, new THREE.Quaternion(), scale);
  assert(Math.abs(pos.y + scale.y / 2 - .01) < 1e-6, 'deck below existing asphalt and vehicle height');
  assert.equal(grid.path({ x: 0, z }, { x: size - 1, z }).length, size, 'existing routing crosses deck unchanged');
  const savedVersion = grid.version;
  grid.cells.clear(); grid.version = savedVersion;
  bridge.sync(true); assert.equal(bridge.mesh.count, 0, 'same-version restored roads force invalidation');
  bridge.dispose(); assert.equal(scene.children.length, 0);
  const roads = createRoadPool(scene, grid);
  roads.setTerrain(terrain); grid.place({ x: 0, z }, { x: size - 1, z }); roads.sync();
  assert(roads.bridges.mesh.count > 0);
  roads.setTerrain(createRiverTerrain(size, 'legacy-flat')); assert.equal(roads.bridges, null);
  roads.setTerrain(terrain); assert(roads.bridges.mesh.count > 0);
  roads.dispose(); assert.equal(scene.children.length, 0, 'layout swaps and pools clean up');
}
console.log(`RIVER CHECK PASS: sizes 12..200, ${checkedCells} cells; deterministic water/banks, dry 5x5 starter, full-length crossings, near-hall layout; exact rendered heights/material buckets, road-version bridge cache/forced restore/disposal; max ${maxTriangles} ground triangles`);

// Composite API with a supplied-model stub: no browser, image decoder or network.
function suppliedFixture(ready = Promise.resolve()) {
  const handles = new Set(), calls = []; let disposed = 0;
  return { types: ['residential', 'industrial', 'fire', 'commercial', 'water', 'power', 'citizen'], ready, lod: 0, handles, calls,
    spawn(type, pose) { const h = { type, pose, alive: true }; handles.add(h); calls.push(type); return h; },
    transform(h, pose) { assert(handles.has(h)); h.pose = pose; },
    remove(h) { h.alive = false; return handles.delete(h); },
    update() {}, dispose() { disposed++; for (const h of handles) h.alive = false; handles.clear(); },
    get disposals() { return disposed; }
  };
}
const cityScene = new THREE.Scene(), supplied = suppliedFixture(), city = createCityBuildingKit(cityScene, supplied, 20);
await city.ready;
assert.throws(() => city.spawn('not-a-building'), /Unknown/);
assert.throws(() => city.spawn('solar', { scale: -1 }), /Invalid transform/);
assert.equal(city.pools.get('solar').handles.length, 0);
const added = [...Object.keys(NEW_BUILDINGS), 'construction_site_0', 'construction_site_1', 'construction_site_2'];
const handles = added.map((type, i) => city.spawn(type, { x: i * 10, z: 5, rotation: .3 }));
for (const [i, h] of handles.entries()) {
  assert.equal(h.type, added[i], 'requested type retained');
  if (h.base) assert.equal(h.base.type, NEW_BUILDINGS[h.type].modelType);
  const p = city.pools.get(h.type), version = city.version, uploads = p.batch.instanceMatrix.version;
  assert(p.batch.isInstancedMesh); assert.equal(p.batch.count, 1);
  assert(p.geometry.attributes.position.count / 3 <= 252, 'bounded supplement triangles');
  const bounds = p.geometry.boundingBox;
  assert(bounds.min.x >= -4.6 && bounds.max.x <= 4.6 && bounds.min.z >= -4.6 && bounds.max.z <= 4.6, 'inside native single-lot reservation');
  city.transform(h, { ...h.pose }); assert.equal(city.version, version); assert.equal(p.batch.instanceMatrix.version, uploads);
  city.transform(h, { ...h.pose, y: 1, scale: 1.2 });
  assert.equal(city.version, version + 1);
  const matrix = new THREE.Matrix4(); p.batch.getMatrixAt(h.index, matrix);
  assert(matrix.elements.every((v, i) => Math.abs(v - h.matrix.elements[i]) < 1e-5));
  if (h.base) assert.deepEqual(h.base.pose, h.pose, 'supplied model and detail share transforms');
}
const pumpBounds = city.pools.get('river_pump').geometry.boundingBox;
assert(Math.abs(pumpBounds.min.y + .45) < 1e-6, 'pump pad seals the maximum .4m dry-bank depression');
assert.equal(pumpBounds.min.x, -3); assert.equal(pumpBounds.max.x, 3);
assert.equal(pumpBounds.min.z, -3); assert.equal(pumpBounds.max.z, 3);
assert(!supplied.calls.includes('power'), 'solar renders panels, not a disguised power plant');
assert.equal(cityScene.children.length, 9, 'at most one supplement draw per type');
const solarNormals = city.pools.get('solar').geometry.attributes.normal;
assert(Array.from({ length: solarNormals.count }, (_, i) => solarNormals.getY(i)).some(y => y > .9 && y < .99), 'actual tilted solar panel surfaces');
const stages = [0, 1, 2].map(i => city.pools.get(`construction_site_${i}`).geometry);
assert(stages[0].boundingBox.max.y < stages[1].boundingBox.max.y && stages[1].boundingBox.max.y < stages[2].boundingBox.max.y);
assert(stages[0].attributes.position.count < stages[1].attributes.position.count && stages[1].attributes.position.count < stages[2].attributes.position.count);
const extra = city.spawn('apartments', { x: 100 });
assert(city.remove(handles[0])); assert.equal(extra.index, 0); assert.equal(city.pools.get('apartments').batch.count, 1);
assert(!city.remove(handles[0])); assert.throws(() => city.transform(handles[0]), /removed/);
const beforeMobile = city.version, citizen = city.spawn('citizen');
city.transform(citizen, { x: 1 }); assert.equal(city.version, beforeMobile, 'mobile updates do not dirty AO');
assert.equal([...city.pools.values()].reduce((sum, p) => sum + p.handles.length, 0), 10, 'logical pools count each composite once');
const cache = new Map(), building = { id: 1, type: 'solar', x: 1, z: 1, constructionTotal: 9, constructionRemaining: 9 };
const state = { buildings: [building], cars: [], zombies: [], defenders: [] }, nativeWorld = { buildings: city, roads: new RoadGrid(12) };
for (const [remaining, type] of [[9, 'construction_site_0'], [5, 'construction_site_1'], [2, 'construction_site_2'], [0, 'solar']]) {
  const previous = cache.get('building:1'); building.constructionRemaining = remaining;
  syncModels(nativeWorld, state, cache);
  const current = cache.get('building:1'); assert.equal(current.type, type);
  if (previous) assert.equal(previous.alive, false, 'native stage replacement removes prior geometry');
  syncModels(nativeWorld, state, cache); assert.equal(cache.get('building:1'), current, 'unchanged native stage keeps stable handle');
}
while (city.pools.get('solar').handles.length < 20) city.spawn('solar');
assert.equal(city.pools.get('solar').allocation, 20, 'bounded pool grows past initial allocation');
assert.throws(() => city.spawn('solar'), /pool full/);
let released = 0;
for (const p of city.pools.values()) p.geometry?.addEventListener('dispose', () => released++);
cityScene.children[0].material.addEventListener('dispose', () => released++);
city.dispose(); city.dispose(); assert.equal(released, 10); assert.equal(supplied.disposals, 1);
assert.equal(cityScene.children.length, 0); assert.equal(city.pools.size, 0); assert.equal(supplied.handles.size, 0);
assert(handles.every(h => !h.alive)); assert.throws(() => city.spawn('solar'), /disposed/);
const failureScene = new THREE.Scene(), failedBase = suppliedFixture(Promise.reject(new Error('fixture load failed')));
const failedKit = createCityBuildingKit(failureScene, failedBase); const failedHandle = failedKit.spawn('solar');
await assert.rejects(failedKit.ready, /fixture load failed/);
assert(!failedHandle.alive); assert.equal(failureScene.children.length, 0); assert.equal(failedBase.disposals, 1);
console.log('CITY RENDER CHECK PASS: six requested IDs, three distinct construction stages, shared supplied transforms, real solar panels, bounded instancing, stable native stage handles, AO version, compaction and ready-failure/disposal');
