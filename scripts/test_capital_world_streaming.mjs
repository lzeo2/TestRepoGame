import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const cache = new Map();
async function moduleURL(path) {
  const url = new URL(path, import.meta.url);
  if (cache.has(url.href)) return cache.get(url.href);
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url).href));
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  cache.set(url.href, result);
  return result;
}
const THREE = await import(await moduleURL('../assets/car-arcade/vendor/three.module.js'));
const { createWorldView } = await import(await moduleURL('../Games/Capital Drive/world-view.js'));
// Atlas construction is shared across loads, just as in the browser.
let canvases = 0;
globalThis.document = { createElement: () => {
  canvases++;
  return { getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, fillRect() {}, strokeRect() {}, fillText() {} }) };
} };
let poses = [{ x: -900, z: -900 }, { x: 1800, z: -900 }, { x: 4000, z: -900 }, { x: 4000, z: 1900 }, { x: 1800, z: 4000 }, { x: -900, z: 1900 }];
const grid = (minZ, maxZ, rows) => ({ minX: -1500, maxX: 4500, minZ, maxZ, cols: 61, rows, heights: Array.from({ length: 61 * rows }, (_, i) => Math.sin(i % 61 * 0.2) * 2 + Math.floor(i / 61) * 0.25) });
let map = {
  bounds: { minX: -1500, maxX: 4500, minZ: -1500, maxZ: 4500 }, spawn: poses[0],
  terrain: grid(0, 4500, 46), terrainTiles: [grid(-1500, 0, 16)],
  roads: poses.flatMap((p, i) => [
    { id: `east-${i}`, name: `Source Street ${i}`, type: 'residential', points: [[p.x - 450, p.z], [p.x, p.z], [p.x + 450, p.z]] },
    { id: `south-${i}`, name: `Source Road ${i}`, type: 'secondary', points: [[p.x, p.z - 300], [p.x, p.z], [p.x, p.z + 300]] }
  ]),
  buildings: poses.flatMap((p, i) => Array.from({ length: 8 }, (_, j) => ({ id: `source-${i}-${j}`, type: j % 3 ? 'house' : 'apartments', height: j % 3 ? 4 : 12,
    points: [[p.x + j * 27, p.z + 30], [p.x + j * 27 + 18, p.z + 30], [p.x + j * 27 + 18, p.z + 52], [p.x + j * 27, p.z + 52], [p.x + j * 27, p.z + 30]] }))),
  areas: [{ id: 'source-water', type: 'water', points: [[-1500,-1500],[-1100,-1500],[-1100,-1200],[-1500,-1200]], innerRings: [{ points: [[-1400,-1400],[-1300,-1400],[-1300,-1300],[-1400,-1300]] }] }], landmarks: []
};
if (process.argv.includes('--actual')) {
  const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
  const { applyMapExpansion } = await import(await moduleURL('../Games/Capital Drive/map-expansion.js'));
  map = applyMapExpansion(await json('canberra'), await json('canberra-north'));
  map.terrainTiles = [(await json('north-terrain')).terrain];
  map.lakeWaterLevel = 5.93;
  poses = [map.spawn, map.landmarks.find(p => p.id === 'redhill'), map.landmarks.find(p => p.id === 'narrabundah'), map.landmarks.find(p => p.id === 'canberra-centre'), { x: -2700, z: -4500 }, { x: 2600, z: 3000 }];
}
const sourceHash = createHash('sha256').update(JSON.stringify(map)).digest('hex');
function chunkHashes(scene) {
  const result = new Map();
  for (const chunk of scene.children[0].children) {
    const hash = createHash('sha256');
    for (const mesh of [...chunk.children].sort((a, b) => a.name.localeCompare(b.name))) {
      hash.update(mesh.name);
      for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) hash.update(name).update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    result.set(chunk.name, hash.digest('hex'));
  }
  return result;
}
function measured(scene) {
  let bytes = 0, meshes = 0, triangles = 0;
  scene.traverse(object => {
    if (!object.isMesh) return;
    meshes++; triangles += object.geometry.attributes.position.count / 3;
    for (const attribute of Object.values(object.geometry.attributes)) bytes += attribute.array.byteLength;
  });
  return { bytes, meshes, triangles };
}
for (const lowGraphics of process.argv.includes('--actual') ? [true] : [true, false]) {
  const fullScene = new THREE.Scene(), full = createWorldView(fullScene, map, { lowGraphics });
  const reference = chunkHashes(fullScene), fullBytes = full.stats.bufferBytes;
  full.dispose();
  globalThis.gc?.();
  const scene = new THREE.Scene(), view = createWorldView(scene, map, { lowGraphics, streaming: true });
  const opening = view.stats, openingHashes = chunkHashes(scene);
  const worldRoot = scene.children[0];
  assert(opening.streaming && Object.isFrozen(opening));
  assert(opening.residentChunks > 4, 'opening neighbourhood is present before first render');
  assert.equal(opening.queuedChunks, 0);
  assert(opening.residentBytes < fullBytes * 0.4, 'far-city typed arrays are absent at startup');
  const materialIds = new Set(), observed = new WeakSet();
  let geometries = 0, disposedGeometry = 0;
  const observe = () => scene.traverse(object => {
    if (!object.isMesh) return;
    materialIds.add(object.material.uuid);
    if (!observed.has(object.geometry)) {
      observed.add(object.geometry); geometries++;
      object.geometry.addEventListener('dispose', () => disposedGeometry++);
    }
  });
  observe();
  const originalCanvases = canvases;
  for (const pose of [...poses.slice(1), poses[0]]) {
    let beforeLoads = view.stats.loads;
    view.update(pose);
    assert(view.stats.loads - beforeLoads <= 2, 'each supplied update builds at most two districts');
    while (view.stats.queuedChunks) {
      beforeLoads = view.stats.loads;
      view.update(pose);
      assert(view.stats.loads - beforeLoads <= 2);
      observe();
    }
    observe();
    const measurement = measured(scene), stats = view.stats;
    assert(stats.residentChunks <= 36, 'resident hard cap survives six distant areas');
    assert.equal(stats.residentBytes, measurement.bytes);
    assert.equal(stats.bufferBytes, measurement.bytes);
    assert.equal(stats.meshes, measurement.meshes);
    assert.equal(stats.triangles, measurement.triangles);
    for (const [name, hash] of chunkHashes(scene)) assert.equal(hash, reference.get(name), `source geometry, road alignment, terrain seam and tree seeds remain exact in ${name}`);
    const steady = view.stats;
    const identities = scene.children[0].children.flatMap(chunk => chunk.children.map(mesh => mesh.geometry));
    for (let i = 0; i < 10; i++) view.update(pose);
    assert.deepEqual(view.stats, steady, 'idle updates create no new geometry or queued work');
    assert.deepEqual(scene.children[0].children.flatMap(chunk => chunk.children.map(mesh => mesh.geometry)), identities);
  }
  assert(view.stats.evictions > 0 && disposedGeometry > 0, 'far resident CPU/GPU geometry is actually released');
  assert.deepEqual(chunkHashes(scene), openingHashes, 'evicted opening geometry rebuilds deterministically');
  assert.equal(canvases, originalCanvases, 'textures/atlases are allocated once');
  assert(materialIds.size <= 7, 'chunks share their material instances');
  const final = view.stats;
  view.dispose(); view.dispose(); view.update(poses[1]);
  assert.equal(disposedGeometry, geometries, 'every loaded mesh geometry is disposed exactly once');
  assert.equal(scene.children.length, 0);
  assert.equal(worldRoot.children.length, 0, 'disposed roots retain no former mesh/CPU-buffer references');
  assert.equal(view.stats.residentBytes, 0);
  assert.equal(view.stats.residentChunks, 0);
  assert.equal(opening.evictions, 0, 'earlier frozen stats remain detached snapshots');
  assert.equal(createHash('sha256').update(JSON.stringify(map)).digest('hex'), sourceHash, 'streaming does not modify geographic source data');
  console.log(`PASS ${lowGraphics ? 'Low' : 'Standard'} resident world: six far areas, exact full-scene chunk hashes, two-load budget, cap36, ${final.evictions} evictions, ${opening.residentBytes}/${fullBytes} opening bytes, ${final.peakResidentBytes} peak bytes, shared atlases/materials, idle/revisit/disposal`);
}
