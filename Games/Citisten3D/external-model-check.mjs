// Run: node --experimental-vm-modules Games/Citisten3D/external-model-check.mjs
// Real GLTF parser/geometry/materials; only image decoding and HTTP are stubbed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import * as geometryUtils from './vendor/BufferGeometryUtils.js';

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
const assets = new vm.SourceTextModule(await readFile(new URL('./external-assets.mjs', import.meta.url), 'utf8'), {
  context, initializeImportMeta(meta) { meta.url = `${origin}/Games/Citisten3D/external-assets.mjs`; },
});
await assets.link(specifier => specifier.endsWith('GLTFLoader.js') ? loader : three);
await assets.evaluate();
const buildings = new vm.SourceTextModule(await readFile(new URL('./external-buildings.mjs', import.meta.url), 'utf8'), { context });
await buildings.link(specifier => specifier.endsWith('external-assets.mjs') ? assets : specifier.endsWith('BufferGeometryUtils.js') ? utils : three);
await buildings.evaluate();
const { loadExternalModel, resourceURL, EXTERNAL_DIRECTORIES, disposeExternalModels } = assets.namespace;
const { createExternalBuildingKit } = buildings.namespace;
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
assert.equal(requests.filter(path => path.endsWith('.glb')).length, 17);
assert.ok(requests.filter(path => path.endsWith('.glb')).every(path => path.endsWith('/model.glb')));
const batches = [...kit.pools.values()].flatMap(p => p.batches);
assert.ok(batches.every(mesh => mesh.isInstancedMesh));
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
assert.equal(scene.children.length, 0);
assert.equal(citizen.alive, false);
assert.ok(bitmaps.every(bitmap => bitmap.closed), 'owned image bitmaps closed once');
assert.throws(() => kit.spawn('citizen'), /disposed/);
console.log(`PASS: 17 real LOD0 GLBs, ${batches.length} instanced batches; stable handles, UV/PBR, rig/walk/wheels, night baseline, cleanup`);

for (const lod of [1, 2]) for (const directory of EXTERNAL_DIRECTORIES.filter(dir => dir !== 'terrain_water_materials')) {
  const start = requests.length;
  const model = await loadExternalModel(directory, lod);
  assert.ok(model.scene.isObject3D);
  if (directory === 'citizen' || directory === 'zombie') assert.equal(model.animations[0].name, `clip_${directory}_walk`);
  assert.equal(requests.slice(start).filter(path => path.endsWith('.glb')).join(''), `/Games/Citisten3D/models/${directory}/model_LOD${lod}.glb`);
  disposeExternalModels([model]);
}
const sample = await loadExternalModel('terrain_water_materials');
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
