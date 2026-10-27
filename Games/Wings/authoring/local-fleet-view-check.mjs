// CPU only: actual GLB geometry/TRS and factor-only fixtures, not texture/native acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createLocalFleetView } from './local-fleet-view.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { createFleet } from './fleet-sim.mjs';

if (!process.env.THREE_ROOT) throw new Error('Set THREE_ROOT to the approved existing Three 0.186.0 package; install nothing.');
const three = pathToFileURL(resolve(process.env.THREE_ROOT) + '/');
const T = await import(new URL('build/three.webgpu.js', three));
const { default: StandardNodeLibrary } = await import(new URL('src/renderers/webgpu/nodes/StandardNodeLibrary.js', three));
assert.equal(T.REVISION, '186');
const baseUrl = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, baseUrl));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await read('authoring/model-repairs.json'));
const descriptors = [...manifest.models, JSON.parse(await read('authoring/submarine-model.json'))];
const assets = descriptors.map((descriptor, i) => ({ id: ['type45', 'type054', 'sub'][i], url: descriptor.file, descriptor }));
const hashes = new Map();
for (const asset of assets) {
  hashes.set(asset.url, hash(await read(asset.url)));
  assert.equal(hashes.get(asset.url), asset.descriptor.sha256);
}
for (const [file, expected] of Object.entries(manifest.existing_model_sha256)) {
  hashes.set('models/' + file, hash(await read('models/' + file)));
  assert.equal(hashes.get('models/' + file), expected);
}
for (const file of ['authoring/fleet-rig.mjs', 'authoring/fleet-sim.mjs', 'authoring/model-repairs.json', 'authoring/submarine-model.json'])
  hashes.set(file, hash(await read(file)));
const callerInputs = JSON.stringify(assets);
let triangles = 0;
const disposals = new Map(), loaded = [];
function track(resource) {
  if (disposals.has(resource)) return;
  disposals.set(resource, 0);
  resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource) + 1));
}
async function load(url) {
  const { object, triangleCount } = modelGeometryFixture(T, await readFile(new URL(url)));
  triangles += triangleCount;
  object.traverse(node => {
    if (node.geometry) track(node.geometry);
    if (node.material) track(node.material);
  });
  loaded.push(object);
  return { scene: object, scenes: [object] };
}
const unit = (id, modelId, team, z) => ({ id, modelId, team, kind: 'surface', capital: true,
  position: [0, 0, z], heading: team ? Math.PI : 0, half: [12, 5, 12], hp: 60,
  speed: 0, route: [], weapons: [{ id: 'gun', medium: 'surface', range: 1000, speed: 200,
    ttlMs: 10000, cooldownMs: 500, damage: 10, depths: ['surfaced'], ammo: 100, mount: 'main_gun' }],
  sensor: null, depth: 'surfaced', depthPlan: [] });
const units = [unit('a', 'type45', 0, 180), unit('b', 'type054', 1, -180)];
const fleet = createFleet({ mode: 'factions', arena: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000,
  bottomY: -150, cell: 20, obstacles: [] }, geometry: assets.map(({ id, descriptor }) => ({ id, descriptor })),
  units, aircraft: [[{ id: 'planeA', weapons: [] }], [{ id: 'planeB', weapons: [] }]], matchMs: 600000, intermissionMs: 15000 });
const scene = new T.Scene(), caller = new T.Group();
scene.add(caller);
const callerMaterial = new T.MeshStandardMaterial(), callerGeometry = new T.BufferGeometry(), callerTexture = new T.Texture();
callerMaterial.map = callerTexture;
caller.add(new T.Mesh(callerGeometry, callerMaterial));
[callerMaterial, callerGeometry, callerTexture].forEach(track);
const callerState = JSON.stringify(caller.toJSON());
const options = { scene, team: 0, assets, units: [...units, { id: 'sub', modelId: 'sub' }, { id: 'legacy' }], baseUrl, load };
const view = await createLocalFleetView(T, options);
assert.equal(triangles, 28976);
assert.equal(loaded.length, 3);
assert.equal(view.root.parent, scene);
assert.deepEqual(view.root.matrix.elements, new T.Matrix4().elements);
const a = view.root.getObjectByName('fleet-unit:a');
const sub = view.root.getObjectByName('fleet-unit:sub');
assert.ok(a && sub && !a.visible && !sub.visible);
assert.notEqual(a.children[0], loaded[0]);
let originalMesh;
loaded[0].traverse(node => { if (node.isMesh) originalMesh ??= node; });
let boundMesh;
a.traverse(node => { if (node.isMesh) boundMesh ??= node; });
assert.equal(boundMesh.geometry, originalMesh.geometry);
assert.equal(boundMesh.material, originalMesh.material);
fleet.advance(500);
const snapshot = fleet.snapshot(0), frozen = JSON.stringify(snapshot);
view.update(snapshot);
assert.equal(a.visible, true);
assert.equal(sub.visible, false);
assert.deepEqual(a.position.toArray(), snapshot.units.find(u => u.id === 'a').position);
const gun = descriptors[0].articulation.find(control => control.limits_rad);
const angle = snapshot.units.find(u => u.id === 'a').view.angles[gun.node];
const expected = loaded[0].getObjectByName(gun.node).quaternion.clone().multiply(
  new T.Quaternion().setFromAxisAngle(new T.Vector3(...gun.axis_local), angle));
assert.ok(a.getObjectByName(gun.node).quaternion.angleTo(expected) < 1e-7);
const poses = () => {
  const result = [];
  view.root.traverse(node => result.push([node.uuid, node.visible, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
  return result;
};
const once = poses();
view.update(snapshot);
assert.deepEqual(poses(), once);
assert.equal(JSON.stringify(snapshot), frozen);
view.reset(); view.reset();
assert.equal(a.visible, false);
assert.ok(a.getObjectByName(gun.node).quaternion.equals(loaded[0].getObjectByName(gun.node).quaternion));
view.update(snapshot);
assert.equal(a.visible, true);

// Real library conversion preserves factors/maps without a GPU or image-decoding claim.
const library = new StandardNodeLibrary(), texture = new T.Texture();
for (const Material of [T.MeshStandardMaterial, T.MeshPhysicalMaterial]) {
  const material = new Material({ color: 0x789abc, metalness: .25, roughness: .72, map: texture, normalMap: texture });
  const node = library.fromMaterial(material);
  assert.ok(node.isNodeMaterial);
  for (const key of ['color', 'metalness', 'roughness', 'map', 'normalMap']) assert.equal(node[key], material[key]);
  node.dispose(); material.dispose();
}
texture.dispose();
view.dispose(); view.dispose();
assert.equal(view.root.parent, null);
assert.deepEqual(scene.children, [caller]);
assert.equal(JSON.stringify(caller.toJSON()), callerState);
assert.throws(() => view.update(snapshot), /disposed/);
assert.throws(() => view.reset(), /disposed/);
for (const [resource, count] of disposals) assert.equal(count, [callerMaterial, callerGeometry, callerTexture].includes(resource) ? 0 : 1);
console.log('PASS actual three-GLB binding, safe FC frame, repeated update/reset/dispose, caller isolation, PBR library mapping');

let calls = 0;
const forbiddenLoad = () => { calls++; throw new Error('Unexpected load'); };
for (const override of [
  { units: [{ id: 'bad', modelId: 'absent' }] }, { units: [{ id: 'a' }, { id: 'a' }] },
  { assets: [assets[0], assets[0]] }, { assets: [{ ...assets[0], id: '' }] },
  { team: 2 }, { assets: [{ ...assets[0], url: 'https://external.invalid/model.glb' }] },
]) await assert.rejects(createLocalFleetView(T, { ...options, ...override, load: forbiddenLoad }));
scene.position.x = 1;
await assert.rejects(createLocalFleetView(T, { ...options, load: forbiddenLoad }), /world frame/);
scene.position.x = 0;
assert.equal(calls, 0);
console.log('PASS invalid IDs, team, external URL and nonidentity scene reject before loading');

// Repeated units share one loaded asset; material-array/shared-texture disposal is exactly once.
const beforeShared = new Set(disposals.keys());
const sharedView = await createLocalFleetView(T, { ...options, assets: [assets[0]],
  units: [{ id: 'one', modelId: assets[0].id }, { id: 'two', modelId: assets[0].id }],
  load: async url => {
    const gltf = await load(url), map = new T.Texture(); track(map);
    let mesh;
    gltf.scene.traverse(node => { if (node.isMesh) { mesh ??= node; node.material.map = map; node.material.normalMap = map; } });
    mesh.material = [mesh.material, callerMaterial]; // Existing caller-owned resource is not ours.
    return gltf;
  } });
sharedView.dispose(); sharedView.dispose();
for (const [resource, count] of disposals) if (!beforeShared.has(resource)) assert.equal(count, 1);
assert.equal(disposals.get(callerMaterial), 0);
console.log('PASS duplicate model instances and shared material/texture resources dispose once');

for (const failure of ['load', 'bind', 'cleanup']) {
  const before = new Set(disposals.keys());
  let count = 0;
  const setupError = new Error('Injected load failure'), cleanupError = new Error('Injected dispose failure');
  const brokenAssets = failure === 'bind'
    ? [{ ...assets[0], descriptor: { ...assets[0].descriptor, root: 'missing-actual-root' } }]
    : assets;
  await assert.rejects(createLocalFleetView(T, { ...options, assets: brokenAssets,
    units: [{ id: 'one', modelId: assets[0].id }], load: async url => {
      if (++count === 2) throw setupError;
      const gltf = await load(url);
      if (failure === 'cleanup') {
        let material;
        gltf.scene.traverse(node => { if (node.material) material ??= node.material; });
        material.addEventListener('dispose', () => { throw cleanupError; });
      }
      return gltf;
    } }), error => failure === 'bind' ? /Missing actual root/.test(error.message)
      : failure === 'load' ? error === setupError
      : error instanceof AggregateError && error.errors[0] === setupError && error.errors[1].errors.includes(cleanupError));
  for (const [resource, count] of disposals) if (!before.has(resource)) assert.equal(count, 1);
  assert.deepEqual(scene.children, [caller]);
}
console.log('PASS partial-load/bind failures and cleanup errors release all returned owned resources');
const beforeMalformed = new Set(disposals.keys());
await assert.rejects(createLocalFleetView(T, { ...options, load: async url => {
  const gltf = await load(url);
  return { scene: null, scenes: [gltf.scene, caller] };
} }), /detached GLTF/);
for (const [resource, count] of disposals) if (!beforeMalformed.has(resource)) assert.equal(count, 1);
assert.equal(disposals.get(callerMaterial), 0);
const beforeFault = new Set(disposals.keys());
const faultView = await createLocalFleetView(T, { ...options, assets: [assets[0]], units: [units[0]] });
faultView.update(snapshot);
const effect = faultView.root.getObjectByName('authoritative-fleet-effects').children[0];
assert.ok(effect);
const fault = new Error('Injected live rig cleanup failure');
effect.geometry.addEventListener('dispose', () => { faultView.dispose(); throw fault; });
await assert.rejects(async () => faultView.dispose(), error =>
  error instanceof AggregateError && error.errors[0].errors.includes(fault));
faultView.dispose();
assert.throws(() => faultView.update(snapshot), /disposed/);
for (const [resource, count] of disposals) if (!beforeFault.has(resource)) assert.equal(count, 1);
assert.deepEqual(scene.children, [caller]);
console.log('PASS malformed load cleanup, live rig cleanup error and reentrant/idempotent disposal');
assert.equal(JSON.stringify(assets), callerInputs);
for (const [file, expected] of hashes) assert.equal(hash(await read(file)), expected, file);
assert.equal(JSON.stringify(caller.toJSON()), callerState);
console.log(`PASS ${hashes.size} model/descriptor/core hashes and caller inputs unchanged; CPU only, no browser/native acceptance`);
