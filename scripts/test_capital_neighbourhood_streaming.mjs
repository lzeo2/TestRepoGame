import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeSource = await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8');
const threeURL = moduleURL(threeSource);
const THREE = await import(threeURL);
const source = await readFile(new URL('../Games/Capital Drive/neighbourhood.js', import.meta.url), 'utf8');
const districtsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/districts.js', import.meta.url), 'utf8'));
const characterURL = moduleURL(await readFile(new URL('../Games/Capital Drive/suburb-character.js', import.meta.url), 'utf8'));
const roadsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/road-network.js', import.meta.url), 'utf8'));
const loadNeighbourhood = async text => import(moduleURL(text.replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadsURL).replace('./districts.js', districtsURL).replace('./suburb-character.js', characterURL)));
const { createNeighbourhoodDetails } = await loadNeighbourhood(source);

const { createInteriors } = await import(new URL('../Games/Capital Drive/interiors.js',import.meta.url));
const map = { roads: [], buildings: [], areas: [], landmarks: [], spawn: { x: 175, z: 175 } };
// Six widely separated populated districts make a full-cache implementation fail.
const areas = Array.from({ length: 6 }, (_, i) => ({ x: i * 2800 + 175, z: (i % 2) * 2800 + 175 }));
for (const [a, centre] of areas.entries()) for (let row = -2; row <= 2; row++) {
  const z = centre.z + row * 105;
  map.roads.push({ id: String(a * 10 + row + 3), name: 'Fixture Street', type: 'residential', points: [[centre.x - 700, z], [centre.x + 700, z]] });
  for (let column = -5; column <= 5; column++) {
    const x = centre.x + column * 110;
    map.buildings.push({ id: `home-${a}-${row}-${column}`, type: 'house', height: 4, points: [[x - 6, z + 20], [x + 6, z + 20], [x + 6, z + 32], [x - 6, z + 32], [x - 6, z + 20]] });
  }
}
const before = JSON.stringify(map);
let heightQueries = 0;
const terrain = (x, z) => { heightQueries++; return x * 0.002 + z * 0.004; };
const staticScene = new THREE.Scene(), streamScene = new THREE.Scene();
const legacy = createNeighbourhoodDetails(staticScene, map, terrain, { lowGraphics: true });
const details = createNeighbourhoodDetails(streamScene, map, terrain, { lowGraphics: true, streaming: true });
assert.equal(JSON.stringify(map), before, 'planning preserves every source body');
assert.deepEqual(details.entries, legacy.entries, 'all doors are available before distant geometry loads');
assert.equal(details.sourceStats.frontages, legacy.stats.frontages);
assert.equal(details.sourceStats.backyards, legacy.stats.backyards);
assert.equal(details.sourceStats.triangles, legacy.stats.triangles);
assert(details.stats.residentChunks > 0 && details.stats.residentChunks <= 1, 'constructor loads the nearest spawn chunk');
function chunks(scene) { return new Map(scene.children[0].children.map(group => [group.name, group])); }
function geometry(group) {
  const result = [];
  group.traverse(mesh => { if (mesh.isMesh) result.push([mesh.name, Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, a]) => [name, Array.from(a.array)]))]); });
  return result;
}
const reference = new Map([...chunks(staticScene)].map(([name, group]) => [name, geometry(group)]));
function measured() {
  let bytes = 0, triangles = 0;
  streamScene.traverse(mesh => {
    if (!mesh.isMesh) return;
    triangles += mesh.geometry.attributes.position.count / 3;
    for (const attribute of Object.values(mesh.geometry.attributes)) bytes += attribute.array.byteLength;
  });
  assert.equal(details.stats.residentBytes, bytes, 'resident bytes equal actual retained attributes');
  assert.equal(details.stats.residentTriangles, triangles);
  assert.equal(details.stats.residentChunks, chunks(streamScene).size);
  assert(details.stats.residentChunks <= 49);
  assert(bytes < legacy.stats.bufferBytes * 0.3, 'distant districts retain no geometry buffers');
}
function settle(pose) {
  for (let i = 0; i < 32; i++) {
    const loads = details.stats.loads;
    details.update(pose);
    assert(details.stats.loads - loads <= 1, 'one chunk generation per update');
    measured();
    if (!details.stats.queue) return;
  }
  assert.fail('bounded load queue did not settle');
}
let firstGeometry;
for (const [i, pose] of areas.entries()) {
  settle(pose);
  assert([...chunks(streamScene).keys()].some(name => reference.has(name)));
  for (const [name, group] of chunks(streamScene)) assert.deepEqual(geometry(group), reference.get(name), `${name} preserves all source geometry and art positions`);
  if (!i) firstGeometry = new Map([...chunks(streamScene)].map(([name, group]) => [name, geometry(group)]));
  assert.deepEqual(details.entries, legacy.entries, 'eviction cannot change public door descriptors');
}
assert(details.stats.evictions > 0, 'far geometry is removed and disposed');
settle(areas[0]);
for (const [name, group] of chunks(streamScene)) assert.deepEqual(geometry(group), firstGeometry.get(name), 'revisit regenerates identical geometry');
const loads = details.stats.loads, idleHeightQueries = heightQueries;
for (let i = 0; i < 100; i++) details.update(areas[0]);
assert.equal(details.stats.loads, loads, 'idle updates never rebuild a resident factory');
assert.equal(heightQueries, idleHeightQueries, 'idle updates do not reevaluate source factories or terrain');
// Distant room descriptors work even when their corresponding exterior was evicted.
const interiors = createInteriors({ ...map, interiorEntries: details.entries }, { heightAt: terrain });
assert.equal(interiors.stats.generatedPlans, 0);
const door = details.entries.find(e => e.buildingId.startsWith('home-5-'));
const actor = { x: door.x, z: door.z, y: terrain(door.x, door.z), yaw: 0 };
const entry = interiors.findEntry(actor);
assert(entry && entry.buildingId === door.buildingId);
assert(interiors.enter(entry, actor));
assert.equal(interiors.stats.generatedPlans, 1);
assert(interiors.leave(actor));
assert.equal(interiors.stats.activePlans, 0);
const resident = [...chunks(streamScene).values()][0];
let disposals = 0;
resident.traverse(mesh => { if (mesh.isMesh) mesh.geometry.addEventListener('dispose', () => disposals++); });
details.update({ x: -100000, z: -100000 });
assert(disposals > 0, 'eviction dispatches GPU disposal');
assert.equal(details.stats.residentBytes, 0);
const result = { sourceChunks: details.sourceStats.sourceChunks, sourceBytes: legacy.stats.bufferBytes, peakResidentBytes: details.stats.peakResidentBytes, loads: details.stats.loads, evictions: details.stats.evictions, doors: details.entries.length };
details.dispose(); details.dispose(); details.update(areas[0]);
assert.equal(streamScene.children.length, 0);
assert.equal(details.stats.residentBytes, 0);
legacy.dispose();
console.log('PASS neighbourhood streaming: six far districts, exact source geometry/doors, bounded actual CPU buffers, one-chunk budget, eviction/disposal, deterministic revisit, idle reuse and lazy house entry', JSON.stringify(result));

// Full-detail stores exercise draped aprons and the shared canvas sign atlas.
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const shopMap = { roads: [{ id: '1', name: 'Retail street', type: 'residential', points: [[-150, 0], [300, 0]] }], buildings: [
  { id: 'shop', type: 'commercial', points: [[-6, 20], [6, 20], [6, 32], [-6, 32], [-6, 20]] },
  { id: 'house', type: 'house', height: 4, points: [[74, 20], [86, 20], [86, 32], [74, 32], [74, 20]] },
  { id: 'school', type: 'school', points: [[154, 30], [166, 30], [166, 42], [154, 42], [154, 30]] }
], areas: [], landmarks: [{ id: 'kingston', x: 0, z: 20 }, { id: 'telopea', x: 160, z: 30 }], spawn: { x: 10, z: 10 } };
const fullScene = new THREE.Scene(), localScene = new THREE.Scene();
const full = createNeighbourhoodDetails(fullScene, shopMap, terrain);
const local = createNeighbourhoodDetails(localScene, shopMap, terrain, { streaming: true });
while (local.stats.queue) local.update(shopMap.spawn);
const fullChunks = chunks(fullScene);
assert(full.stats.retailAprons > 0 && full.stats.shopSigns > 0 && full.stats.gardenSeats > 0);
for (const [name, group] of chunks(localScene)) assert.deepEqual(geometry(group), geometry(fullChunks.get(name)), 'full-detail apron/sign/garden/school geometry is exact');
const original = new Map([...chunks(localScene)].map(([name, group]) => [name, geometry(group)]));
const sharedMaterial = [];
localScene.traverse(mesh => { if (mesh.isMesh) sharedMaterial.push(mesh.material); });
local.update({ x: 10000, z: 10000 });
local.update(shopMap.spawn);
while (local.stats.queue) local.update(shopMap.spawn);
for (const [name, group] of chunks(localScene)) assert.deepEqual(geometry(group), original.get(name));
localScene.traverse(mesh => { if (mesh.isMesh) assert(sharedMaterial.includes(mesh.material), 'regeneration reuses the original material and sign atlas'); });
local.dispose(); full.dispose(); delete globalThis.document;
console.log('PASS full-detail source recipes: exact draped aprons, shared sign texture/material, garden furniture and school fence after eviction/revisit');

if (process.argv.includes('--actual')) {
  const { createHash } = await import('node:crypto');
  const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
  const { applyMapExpansion } = await import(moduleURL(await readFile(new URL('../Games/Capital Drive/map-expansion.js', import.meta.url), 'utf8')));
  const { createTerrainSampler } = await import(moduleURL(await readFile(new URL('../Games/Capital Drive/terrain.js', import.meta.url), 'utf8')));
  const actualMap = applyMapExpansion(await json('canberra'), await json('canberra-north'));
  actualMap.terrainTiles = [(await json('north-terrain')).terrain]; actualMap.lakeWaterLevel = 5.93;
  const actualHeight = createTerrainSampler(actualMap).heightAt;
  const sourceHash = () => createHash('sha256').update(JSON.stringify(actualMap)).digest('hex');
  const initialHash = sourceHash();
  function hashes(scene) {
    return new Map([...chunks(scene)].map(([name, group]) => {
      const hash = createHash('sha256');
      group.traverse(mesh => {
        if (!mesh.isMesh) return;
        hash.update(mesh.name);
        for (const [key, attribute] of Object.entries(mesh.geometry.attributes)) hash.update(key).update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
      });
      return [name, hash.digest('hex')];
    }));
  }
  const fullScene = new THREE.Scene(), actualScene = new THREE.Scene();
  const baseline = createNeighbourhoodDetails(fullScene, actualMap, actualHeight, { lowGraphics: true });
  const baselineBytes = baseline.stats.bufferBytes, baselineCounts = { ...baseline.stats }, baselineEntries = baseline.entries;
  const baselineHashes = hashes(fullScene);
  baseline.dispose();
  const actual = createNeighbourhoodDetails(actualScene, actualMap, actualHeight, { lowGraphics: true, streaming: true });
  assert.deepEqual(actual.entries, baselineEntries, 'all actual house door bindings exist before far chunks load');
  for (const key of ['frontages', 'driveways', 'doors', 'backyards', 'triangles']) assert.equal(actual.sourceStats[key], baselineCounts[key]);
  const poses = [actualMap.spawn, ...['redhill', 'narrabundah', 'canberra-centre'].map(id => actualMap.landmarks.find(p => p.id === id)), { x: -2700, z: -4500 }, { x: 2600, z: 3000 }];
  let openingHashes;
  const measurements = [];
  for (const [index, pose] of [...poses, poses[0]].entries()) {
    for (let frame = 0; frame < 32; frame++) {
      const previousLoads = actual.stats.loads;
      actual.update(pose);
      assert(actual.stats.loads - previousLoads <= 1);
      assert(actual.stats.residentChunks <= 49);
      if (!actual.stats.queue) break;
    }
    assert.equal(actual.stats.queue, 0);
    const actualHashes = hashes(actualScene);
    for (const [name, hash] of actualHashes) assert.equal(hash, baselineHashes.get(name), `actual source chunk ${name}`);
    if (!index) openingHashes = actualHashes;
    if (index === poses.length) for (const [name, hash] of actualHashes) assert.equal(hash, openingHashes.get(name), 'actual revisit is identical');
    let bytes = 0;
    actualScene.traverse(mesh => { if (mesh.isMesh) for (const a of Object.values(mesh.geometry.attributes)) bytes += a.array.byteLength; });
    assert.equal(bytes, actual.stats.residentBytes);
    assert(bytes < baselineBytes * 0.35);
    assert.deepEqual(actual.entries, baselineEntries);
    measurements.push({ x: pose.x, z: pose.z, chunks: actual.stats.residentChunks, bytes });
  }
  assert(actual.stats.evictions > 0);
  const actualInteriors = createInteriors({ ...actualMap, interiorEntries: actual.entries }, { heightAt: actualHeight });
  assert(actualInteriors.entries.length > 1000);
  assert.equal(actualInteriors.stats.generatedPlans, 0);
  const home = actualInteriors.entries.find(e => e.type === 'house');
  const resident = { x: home.x, z: home.z, y: home.y, yaw: home.yaw };
  assert.equal(actualInteriors.findEntry(resident), home); assert(actualInteriors.enter(home, resident)); assert(actualInteriors.leave(resident));
  assert.equal(sourceHash(), initialHash);
  const report = { baselineBytes, sourceChunks: actual.sourceStats.sourceChunks, sourceDoors: actual.entries.length, lazyHomes: actualInteriors.entries.length, peakResidentBytes: actual.stats.peakResidentBytes, loads: actual.stats.loads, evictions: actual.stats.evictions, measurements };
  const root = actualScene.children[0];
  actual.dispose(); assert.equal(root.children.length, 0, 'disposed API retains no former geometry through its root');
  console.log('PASS actual merged-map neighbourhood: exact complete Low geometry hashes and4200door DTOs, six distant areas, actual buffer bounds, disposal and deterministic revisit', JSON.stringify(report));
}
