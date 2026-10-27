// Run: node --experimental-vm-modules Games/Citisten3D/external-model-check.mjs
// Real GLTF parser/geometry/materials; only image decoding and HTTP are stubbed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import * as geometryUtils from './vendor/BufferGeometryUtils.js';
import * as buildingSurfaces from './building-surfaces.mjs';
import { BUILDING_ENVELOPES, footprintLots } from './footprints.mjs';

if (!vm.SourceTextModule) throw new Error('Run this check with node --experimental-vm-modules');
const root = new URL('./models/', import.meta.url), requests = [], bitmaps = [];
const nativeFetch = globalThis.fetch;
let failDirectory = null;
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => {
  const bitmap = { width: 1, height: 1, closed: false, close() { assert.equal(this.closed, false); this.closed = true; } };
  bitmaps.push(bitmap); return bitmap;
};
const origin = 'https://citisten.invalid';
const objectURLs = new Map(), createObjectURL = URL.createObjectURL.bind(URL), revokeObjectURL = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = blob => {
  const native = createObjectURL(blob), local = `blob:${origin}/${objectURLs.size}-${Date.now()}`;
  objectURLs.set(local, native); return local;
};
URL.revokeObjectURL = url => { revokeObjectURL(objectURLs.get(url) || url); objectURLs.delete(url); };
const localFetch = async (input, options) => {
  const url = new URL(input);
  if (url.protocol === 'blob:' || url.protocol === 'data:') return nativeFetch(objectURLs.get(url.href) || url);
  assert.equal(url.origin, origin); assert.equal(options.redirect, 'error');
  requests.push(url.pathname);
  if (failDirectory && url.pathname.includes(`/${failDirectory}/`)) return new Response('missing', { status: 404 });
  const relative = url.pathname.split('/models/')[1];
  assert.ok(relative && !relative.includes('..'));
  try { return new Response(await readFile(new URL(relative, root))); }
  catch { return new Response('missing', { status: 404 }); }
};
// SourceTextModule supplies a browser origin without a server or source patch.
// GLTFLoader itself executes in the host realm and uses the same guarded fetch.
globalThis.fetch = localFetch;
const context = vm.createContext({ URL, fetch: localFetch, TextDecoder, DataView, Uint8Array, console });
const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
  for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
}, { context });
const three = synthetic(THREE), loader = synthetic({ GLTFLoader }), utils = synthetic(geometryUtils);
const surfaces = synthetic(buildingSurfaces);
const assets = new vm.SourceTextModule(await readFile(new URL('./external-assets.mjs', import.meta.url), 'utf8'), {
  context, initializeImportMeta(meta) { meta.url = `${origin}/Games/Citisten3D/external-assets.mjs`; },
});
await assets.link(specifier => specifier.endsWith('GLTFLoader.js') ? loader : three);
await assets.evaluate();
const buildings = new vm.SourceTextModule(await readFile(new URL('./external-buildings.mjs', import.meta.url), 'utf8'), { context });
await buildings.link(specifier => specifier.endsWith('external-assets.mjs') ? assets : specifier.endsWith('building-surfaces.mjs') ? surfaces : specifier.endsWith('BufferGeometryUtils.js') ? utils : three);
await buildings.evaluate();
const { loadExternalModel, resourceURL, EXTERNAL_DIRECTORIES, disposeExternalModels } = assets.namespace;
const { createExternalBuildingKit } = buildings.namespace;
async function checkOrientation(kit) {
  const facades = new Set(['townhall', 'residential', 'commercial', 'police', 'fire']);
  const closeMatrix = (actual, expected, message) => assert.ok(actual.elements.every((n, i) => Math.abs(n - expected.elements[i]) < 1e-6), message);
  let doors = 0;
  for (const [type, pool] of kit.pools) {
    const { directory, rig } = pool.template.userData.external;
    const triangles = geometry => (geometry.index?.count ?? geometry.attributes.position.count) / 3;
    let authoredTriangles = 0;
    const originals = new Set();
    pool.template.traverse(node => {
      if (!node.isMesh) return;
      authoredTriangles += triangles(node.geometry); originals.add(node.material);
    });
    assert.equal(pool.parts.reduce((sum, part) => sum + triangles(part.geometry), 0), authoredTriangles, `${type}: material treatment cannot change triangles`);
    assert.equal(new Set(pool.parts.map(part => part.material)).size, originals.size, `${type}: no new material splits`);
    for (const part of pool.parts) {
      const original = [...originals].find(material => material.name === part.material.name);
      assert.ok(original); assert.notEqual(part.material, original);
      for (const key of Object.keys(original).filter(key => original[key]?.isTexture)) assert.equal(part.material[key], original[key], `${type}: borrowed ${key}`);
      assert.ok(part.material.normalScale.equals(original.normalScale));
      assert.ok(part.material.emissive.equals(original.emissive));
    }
    const filename = kit.lod ? `model_LOD${kit.lod}.glb` : 'model.glb';
    const bytes = await readFile(new URL(`${directory}/${filename}`, root));
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    if (BUILDING_ENVELOPES[type]) {
      const bounds = new THREE.Box3().setFromObject(pool.template);
      const lots = footprintLots({ type, x: 0, z: 0 });
      for (const axis of ['x', 'z']) {
        const min = Math.min(...lots.map(p => p[axis])) * 10 - 5;
        const max = Math.max(...lots.map(p => p[axis])) * 10 + 5;
        assert(bounds.min[axis] >= min - 1e-5 && bounds.max[axis] <= max + 1e-5, `${type}: actual LOD${kit.lod} mesh fits reserved ${axis} lots`);
      }
    }
    const normalization = new THREE.Matrix4().makeRotationY(facades.has(type) ? Math.PI : 0);
    closeMatrix(pool.template.matrix, normalization, `${type}: only declared facades rotate`);
    function visit(index, parentWorld) {
      const def = json.nodes[index], node = pool.template.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(def.name));
      assert.ok(node, `${type}: retained node ${def.name}`);
      const local = def.matrix ? new THREE.Matrix4().fromArray(def.matrix) : new THREE.Matrix4().compose(
        new THREE.Vector3().fromArray(def.translation || [0, 0, 0]),
        new THREE.Quaternion().fromArray(def.rotation || [0, 0, 0, 1]),
        new THREE.Vector3().fromArray(def.scale || [1, 1, 1]));
      closeMatrix(node.matrix, local, `${type}/${def.name}: authored local transform unchanged`);
      const world = new THREE.Matrix4().multiplyMatrices(parentWorld, local);
      closeMatrix(node.matrixWorld, normalization.clone().multiply(world), `${type}/${def.name}: world transform/grounding`);
      assert.ok(Math.abs(node.matrixWorld.elements[13] - world.elements[13]) < 1e-6, 'grounding Y unchanged');
      for (const child of def.children || []) visit(child, world);
    }
    for (const index of json.scenes[json.scene || 0].nodes) visit(index, new THREE.Matrix4());
    if (facades.has(type)) {
      const entries = rig.movable_nodes.filter(node => node.name.includes('door'));
      assert.ok(entries.length, `${type}: actual delivered door required`);
      for (const entry of entries) {
        const door = pool.template.getObjectByName(entry.name);
        assert.ok(door.getWorldPosition(new THREE.Vector3()).z < 0, `${type}/${entry.name}: normalized front is -Z`);
        doors++;
      }
    }
  }
  assert.equal(doors, 8, 'five architectural assets retain all eight facade door pivots');
  console.log(`PASS: LOD${kit.lod} five facades face -Z; all authored local transforms/grounding and other model orientations retained`);
}
assert.equal(EXTERNAL_DIRECTORIES.length, 18);
for (const url of ['https://third-party.invalid/a.png', '//third-party.invalid/a', 'javascript:1', 'file:///a', 'blob:https://third-party.invalid/id']) assert.throws(() => resourceURL(url), /Nonlocal/);
assert.equal(resourceURL('data:image/png;base64,AA=='), 'data:image/png;base64,AA==');
await assert.rejects(loadExternalModel('../escape'), /Unknown/);
await assert.rejects(loadExternalModel('citizen', 3), /LOD/);
await assert.rejects(loadExternalModel('terrain_water_materials', 2), /only LOD0/);

const scene = new THREE.Scene(), kit = createExternalBuildingKit(scene, 4);
const handles = new Map(kit.types.map(type => [type, kit.spawn(type, { x: 2, z: 4 })]));
const residential = handles.get('residential');
kit.transform(residential, { x: 3, z: 5 });
const removed = kit.spawn('residential');
assert.equal(kit.remove(removed), true);
const stable = kit.spawn('residential', { x: 8 });
assert.equal(kit.remove(residential), true);
assert.equal(stable.index, 0);
assert.throws(() => kit.transform(residential), /removed/);
assert.throws(() => kit.spawn('residential', { x: NaN }), /Invalid transform/);
await kit.ready;
assert.equal(stable.alive, true);
assert.equal(kit.pools.get('residential').mesh.count, 1);
assert.equal(kit.pools.get('residential').mesh.getMatrixAt(0, new THREE.Matrix4()).elements[12], 8);
const staticBuffers = kit.pools.get('residential').batches.map(batch => batch.instanceMatrix);
const staticVersions = staticBuffers.map(buffer => buffer.version), staticVersion = kit.version;
kit.transform(stable, { ...stable.pose });
assert.deepEqual(staticBuffers.map(buffer => buffer.version), staticVersions, 'unchanged pose never uploads matrices');
assert.equal(kit.version, staticVersion, 'unchanged pose never invalidates static AO');
for (const [i, key] of ['x', 'y', 'z', 'rotation', 'scale'].entries()) {
  kit.transform(stable, { ...stable.pose, [key]: stable.pose[key] + 1 });
  assert.deepEqual(staticBuffers.map(buffer => buffer.version), staticVersions.map(v => v + i + 1), `${key} change uploads matrices`);
  assert.equal(kit.version, staticVersion + i + 1, `${key} change invalidates static AO`);
}
assert.equal(requests.filter(path => path.endsWith('.glb')).length, 17);
assert.ok(requests.filter(path => path.endsWith('.glb')).every(path => path.endsWith('/model.glb')));
await checkOrientation(kit);
const batches = [...kit.pools.values()].flatMap(p => p.batches);
assert.ok(batches.every(mesh => mesh.isInstancedMesh));
assert.equal(batches.length, 240, 'material-only pass retains baseline LOD0 batching');
const cloneDisposals = new Map([...new Set(batches.map(batch => batch.material))].map(material => [material, 0]));
for (const material of cloneDisposals.keys()) material.addEventListener('dispose', () => cloneDisposals.set(material, cloneDisposals.get(material) + 1));
assert.ok(kit.pools.get('residential').batches.length < 22);
assert.ok(kit.pools.get('park').template.getObjectByName('root'));
assert.equal(kit.pools.get('park').template.children.at(-1).position.x, -2.5);
assert.equal(kit.pools.get('park').template.children.at(-1).scale.x, .85);
for (const batch of batches) {
  assert.ok(batch.geometry.attributes.position.count > 0);
  assert.ok(batch.material.isMeshStandardMaterial);
  if (batch.material.map) assert.ok(batch.geometry.attributes.uv, 'authored UV retained');
}
const citizen = handles.get('citizen'), car = handles.get('car');
assert.equal(citizen.rig.getObjectByName('citizen_left_upper_leg').userData.rigid_part, true);
kit.update(null, 1, .25);
assert.equal(citizen.action.time, 0, 'spawn does not walk');
const originalVersion = kit.version;
kit.transform(citizen, { x: 2, z: 3 }); kit.transform(car, { x: 2, z: 3 });
const mobileBuffers = ['citizen', 'car'].flatMap(type => kit.pools.get(type).batches.map(batch => batch.instanceMatrix));
const mobileVersions = mobileBuffers.map(buffer => buffer.version), pendingTravel = car.travel;
kit.transform(citizen, { ...citizen.pose }); kit.transform(car, { ...car.pose });
assert.deepEqual(mobileBuffers.map(buffer => buffer.version), mobileVersions, 'unchanged mobile pose never uploads matrices');
assert.equal(citizen.moved, true); assert.equal(car.moved, true);
assert.equal(car.travel, pendingTravel, 'unchanged pose preserves pending travel');
kit.update(null, 1, .25);
assert.ok(citizen.action.time > 0);
assert.ok(car.wheels.every(wheel => Math.abs(wheel.angle + 1 / wheel.radius) < 1e-6));
assert.equal(kit.version, originalVersion, 'moving agents does not dirty static AO');
const time = citizen.action.time, angle = car.wheels[0].angle;
kit.transform(citizen, { x: 2, z: 3 }); kit.transform(car, { x: 2, z: 3 });
kit.update(null, 1, .25);
assert.equal(citizen.action.time, time); assert.equal(car.wheels[0].angle, angle);
kit.transform(car, { x: 2, z: 4 }); kit.update(null, 1, .25);
assert.ok(car.wheels.every(wheel => Math.abs(wheel.angle) < 1e-6), 'reverse roll restores rest');
for (const type of ['zombie', 'patrol_car', 'utility_car']) {
  const h = handles.get(type), before = h.action?.time;
  kit.transform(h, { x: 2, z: 3 }); kit.update(null, 1, .25);
  if (h.action) {
    assert(h.action.time > before, `${type}: actual movement advances walk clip`);
    const time = h.action.time; kit.update(null, 1, .25);
    assert.equal(h.action.time, time, `${type}: stationary walk pauses`);
  } else {
    assert(h.wheels.every(w => Math.abs(w.angle + 1 / w.radius) < 1e-6), `${type}: forward wheel roll`);
    kit.transform(h, { x: 2, z: 4 }); kit.update(null, 1, .25);
    assert(h.wheels.every(w => Math.abs(w.angle) < 1e-6), `${type}: reverse restores rest`);
  }
}
const door = car.rig.getObjectByName('compact_car_front_left_door');
assert.ok(door.quaternion.equals(kit.pools.get('car').template.getObjectByName(door.name).quaternion));
const emission = batches.map(mesh => mesh.material.emissiveIntensity);
kit.update(null, 0, 0); kit.update(null, 1, 0); kit.update(null, 1, 0);
assert.deepEqual(batches.map(mesh => mesh.material.emissiveIntensity), emission, 'night factor never accumulates');
const sharedTexture = batches.find(mesh => mesh.material.map)?.material.map;
assert.ok(sharedTexture);
kit.spawn('car', { x: 10 });
assert.equal(kit.pools.get('car').mesh.count, 2);
assert.ok(kit.pools.get('car').batches.every(mesh => mesh.count === 2));
for (let i = 0; i < 3; i++) kit.spawn('residential', { x: i });
assert.throws(() => kit.spawn('residential'), /pool full/);
assert.equal(kit.pools.get('residential').mesh.count, 4);
assert.equal(kit.remove(stable), true);
assert.equal(kit.pools.get('residential').handles[0].index, 0);
assert.equal(kit.pools.get('residential').mesh.count, 3);
assert.ok(kit.pools.get('residential').batches.every(mesh => mesh.count === 3));
kit.dispose(); kit.dispose();
assert.ok([...cloneDisposals.values()].every(count => count === 1), 'each shared surface material disposed exactly once');
assert.equal(scene.children.length, 0);
assert.equal(citizen.alive, false);
assert.ok(bitmaps.every(bitmap => bitmap.closed), 'owned image bitmaps closed once');
assert.throws(() => kit.spawn('citizen'), /disposed/);
console.log(`PASS: 17 real LOD0 GLBs, ${batches.length} instanced batches; stable handles, UV/PBR, rig/walk/wheels, night baseline, cleanup`);

for (const lod of [1, 2]) {
  const start = requests.length, lowerKit = createExternalBuildingKit(new THREE.Scene(), 1, { lod });
  for (const type of lowerKit.types) lowerKit.spawn(type);
  await lowerKit.ready;
  const glbs = requests.slice(start).filter(path => path.endsWith('.glb'));
  assert.equal(glbs.length, 17);
  for (const directory of EXTERNAL_DIRECTORIES.filter(dir => dir !== 'terrain_water_materials')) assert.ok(glbs.includes(`/Games/Citisten3D/models/${directory}/model_LOD${lod}.glb`));
  for (const type of ['citizen', 'zombie']) assert.equal(lowerKit.pools.get(type).animations[0].name, `clip_${type}_walk`);
  await checkOrientation(lowerKit);
  lowerKit.dispose();
}
const sample = await loadExternalModel('terrain_water_materials');
assert.equal(Object.hasOwn(sample, 'parser'), false, 'real GLTF output releases completed parser caches');
assert.equal(sample.scene.userData.external.directory, 'terrain_water_materials');
assert.ok(sample.scene.isObject3D); disposeExternalModels([sample]);
failDirectory = 'citizen';
const failed = createExternalBuildingKit(new THREE.Scene(), 1);
const invalidated = failed.spawn('citizen');
await assert.rejects(failed.ready, /HTTP 404/);
assert.equal(invalidated.alive, false); failed.dispose();
assert.ok(bitmaps.every(bitmap => bitmap.closed));
failDirectory = null;
const abandoned = createExternalBuildingKit(new THREE.Scene(), 1);
abandoned.spawn('citizen'); abandoned.dispose();
await assert.rejects(abandoned.ready, /disposed before ready/);
assert.ok(bitmaps.every(bitmap => bitmap.closed));
assert.equal(objectURLs.size, 0);
console.log('PASS: all 17 selected LOD1/2 GLBs, material set, URL whitelist, failed/disposed readiness cleans successful siblings');
console.log('LIMIT: HTTP and image decoding are stubbed; no WebGL, visual, GPU performance or browser acceptance claimed.');
