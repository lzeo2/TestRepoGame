import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Existing modules are browser ES modules; load their unchanged local graph
// through data URLs without adding a package/build dependency.
const moduleCache = new Map();
async function moduleURL(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const dependency = new URL(match[1], new URL(path, import.meta.url));
    source = source.replace(match[1], await moduleURL(dependency.href));
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  moduleCache.set(path, result);
  return result;
}
const THREE = await import(await moduleURL('../assets/car-arcade/vendor/three.module.js'));
const { createWorldView } = await import(await moduleURL('../Games/Capital Drive/world-view.js'));
const { createNeighbourhoodDetails } = await import(await moduleURL('../Games/Capital Drive/neighbourhood.js'));
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const actual = await json('canberra');
let map;
if (process.argv.includes('--actual')) {
  const { applyMapExpansion } = await import(await moduleURL('../Games/Capital Drive/map-expansion.js'));
  map = applyMapExpansion(actual, await json('canberra-north'));
  map.terrainTiles = [(await json('north-terrain')).terrain];
  map.lakeWaterLevel = 5.93;
} else {
  map = {
    bounds: { minX: -250, maxX: 1250, minZ: -250, maxZ: 250 }, spawn: { x: 0, z: 0 },
    roads: [{ id: 'street', type: 'residential', name: 'Test Street', width: 8, points: [[-200, 0], [1200, 0]] }],
    buildings: Array.from({ length: 20 }, (_, i) => ({ id: `home-${i}`, type: i % 4 ? 'house' : 'apartments', height: i % 4 ? 4 : 12,
      points: [[i * 55 - 6, 20], [i * 55 + 6, 20], [i * 55 + 6, 34], [i * 55 - 6, 34], [i * 55 - 6, 20]] })),
    areas: [], landmarks: []
  };
}
const sourceDigest = () => createHash('sha256').update(JSON.stringify(map)).digest('hex');
const before = sourceDigest();
function measure(scene, view, poses) {
  let bytes = 0, triangles = 0, meshes = 0;
  const fixed = createHash('sha256');
  scene.traverse(object => {
    if (!object.isMesh) return;
    meshes++; triangles += object.geometry.attributes.position.count / 3;
    for (const attribute of Object.values(object.geometry.attributes)) {
      bytes += attribute.array.byteLength;
      // Every terrain/road/pavement/water vertex must survive quality changes.
      if (/^Canberra (road|pavement|water)$/.test(object.name)) fixed.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
      if (object.name === 'Canberra surface') {
        const kinds = object.geometry.attributes.surfaceKind.array;
        // Roofs alone change tessellation. Hash the remaining contiguous runs
        // to compare terrain, bridge-grounding and footprint walls exactly.
        for (let start = 0; start < kinds.length;) {
          let end = start + 1;
          const roof = kinds[start] === 2;
          while (end < kinds.length && (kinds[end] === 2) === roof) end++;
          if (!roof) {
            const part = attribute.array.subarray(start * attribute.itemSize, end * attribute.itemSize);
            fixed.update(Buffer.from(part.buffer, part.byteOffset, part.byteLength));
          }
          start = end;
        }
      }
      for (const value of attribute.array) assert(Number.isFinite(value));
    }
  });
  assert.equal(bytes, view.stats.bufferBytes);
  assert.equal(triangles, view.stats.triangles);
  const visible = poses.map(pose => {
    view.update(pose);
    let draws = 0, triangles = 0;
    scene.traverseVisible(object => { if (object.isMesh) { draws++; triangles += object.geometry.attributes.position.count / 3; } });
    return { draws, triangles };
  });
  view.update({ x: 1e6, z: 1e6 });
  scene.traverseVisible(object => assert(!object.isMesh, 'distant geometry is culled'));
  return { bytes, triangles, meshes, visible, fixed: fixed.digest('hex'), stats: view.stats, entries: view.entries };
}
function run(lowGraphics) {
  const scene = new THREE.Scene();
  const world = createWorldView(scene, map, { lowGraphics });
  const poses = [map.spawn || { x: 0, z: 0 }, ...map.landmarks.filter(p => /manuka|kingston|telopea|civic/.test(p.id)).slice(0, 5)];
  const summary = { world: measure(scene, world, poses) };
  const ground = world.heightAt;
  for (const point of [[0, 0], [300, 400]]) assert.equal(ground(...point), world.groundHeightAt(...point));
  world.dispose(); world.dispose(); assert.equal(scene.children.length, 0);
  globalThis.gc?.();
  const details = createNeighbourhoodDetails(scene, map, ground, { lowGraphics });
  summary.neighbourhood = measure(scene, details, poses);
  details.dispose(); details.dispose(); assert.equal(scene.children.length, 0);
  assert.equal(sourceDigest(), before, 'quality rendering cannot mutate source data');
  return summary;
}
const normal = run(false);
globalThis.gc?.();
const low = run(true);
assert.equal(low.world.stats.lowGraphics, true);
assert.equal(normal.world.stats.lowGraphics, false);
assert.equal(low.world.stats.buildings, normal.world.stats.buildings);
assert.equal(low.world.stats.trees, normal.world.stats.trees, 'same accepted tree positions retain visible trees');
assert.equal(low.world.stats.treesNearSpawn, normal.world.stats.treesNearSpawn);
assert.equal(low.world.fixed, normal.world.fixed, 'terrain, footprint walls, road, pavement and water geometry is exact');
assert(low.world.stats.windows > 0 && low.world.stats.windows < normal.world.stats.windows);
assert(low.world.stats.roofFacets < normal.world.stats.roofFacets);
assert(low.world.bytes < normal.world.bytes * 0.7, 'Low cuts at least30% of world attribute storage');
assert(low.world.triangles < normal.world.triangles * 0.7, 'Low cuts at least30% of world triangles');
assert.deepEqual(low.neighbourhood.entries, normal.neighbourhood.entries, 'same rendered doors and entry ABI');
for (const name of ['doors', 'driveways', 'fences', 'hedges', 'backyards', 'frontages', 'retailAprons']) assert.equal(low.neighbourhood.stats[name], normal.neighbourhood.stats[name], `${name} retained`);
assert(low.neighbourhood.bytes < normal.neighbourhood.bytes);
for (const name of ['world', 'neighbourhood']) {
  low[name].visible.forEach((item, i) => {
    assert(item.draws <= normal[name].visible[i].draws);
    assert(item.triangles <= normal[name].visible[i].triangles);
  });
}
// The sourced complex school keeps its distinct two-storey windows and arches.
const school = actual.landmarks.find(p => p.id === 'telopea');
const schoolMap = { bounds: { minX: school.x - 220, maxX: school.x + 220, minZ: school.z - 220, maxZ: school.z + 220 },
  roads: actual.roads.filter(r => r.name === 'New South Wales Crescent'), buildings: [actual.buildings.find(b => b.id === 'act-101001-0')], landmarks: [school], areas: [] };
const schoolStats = [false, true].map(lowGraphics => { const scene = new THREE.Scene(), view = createWorldView(scene, schoolMap, { lowGraphics }); const stats = view.stats; view.dispose(); return stats; });
assert.equal(schoolStats[0].windows, schoolStats[1].windows);
assert.equal(schoolStats[0].roofFacets, schoolStats[1].roofFacets);
const report = Object.fromEntries(['world', 'neighbourhood'].map(name => [name, {
  normal: { bytes: normal[name].bytes, triangles: normal[name].triangles, meshes: normal[name].meshes, visible: normal[name].visible },
  low: { bytes: low[name].bytes, triangles: low[name].triangles, meshes: low[name].meshes, visible: low[name].visible }
}]));
console.log(`PASS ${process.argv.includes('--actual') ? 'actual merged map' : 'synthetic'} Low geometry, retained source/doors/fences/trees/school, finite buffers, culling and idempotent disposal`);
console.log(JSON.stringify(report));
