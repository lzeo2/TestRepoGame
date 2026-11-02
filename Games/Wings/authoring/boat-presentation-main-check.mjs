// Focused actual-Three/GLB CPU checks. PNG metadata fixtures are not decoded pixels or native proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools; install nothing');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const T = await import(pathToFileURL(resolve(three, 'build/three.webgpu.js')));
const { GLTFLoader } = await import(pathToFileURL(resolve(three, 'examples/jsm/loaders/GLTFLoader.js')));
const base = fileURLToPath(new URL('../', import.meta.url)), repo = resolve(base, '../..');
const src = resolve(base, 'source/games/wings/src'), pin = '11e83932ecbeb01553a902f432a345004e2ab92f';
const git = (...args) => execFileSync('git', args, { cwd: repo, maxBuffer: 16000000 });
const hash = b => createHash('sha256').update(b).digest('hex');
const plugin = { name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => {
    const key = path === 'three' ? '.' : `.${path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    if (typeof target === 'object') target = target.import;
    assert.equal(typeof target, 'string', key);
    return { path: pathToFileURL(resolve(three, target)).href, external: true };
  });
} };
async function sourceApi(reference = null) {
  const entries = ['render/aircraft.ts', 'render/camera.ts'];
  const compiled = await build({ stdin: { contents: entries.map(f => `export * from ${JSON.stringify(resolve(src, f))};`).join('\n'), resolveDir: src },
    bundle: true, write: false, platform: 'node', format: 'esm', minify: true, legalComments: 'none',
    plugins: [plugin, { name: 'actual-source-test-exports', setup(api) {
      api.onLoad({ filter: /\.ts$/ }, ({ path }) => {
        if (!path.startsWith(src + '/')) return;
        let contents = reference ? git('show', `${reference}:Games/Wings/source/games/wings/src${path.slice(src.length)}`).toString() : readFileSync(path, 'utf8');
        // Test access to the real template builder/cache, not a substitute loader/rig implementation.
        if (path.endsWith('/aircraft.ts')) contents += '\nexport {buildTemplate, templates};';
        if (path.endsWith('/camera.ts')) contents += '\nexport {COCKPIT,GUNNER,CHASE,GUNNER_LEAD,GUNNER_DROP};';
        return { contents, loader: 'ts' };
      });
    } }] });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
}
const api = await sourceApi(), old = await sourceApi(pin);
const original = Object.keys(old.CONFIG);
assert.equal(original.length, 27);
assert.deepEqual(Object.keys(api.CONFIG).filter(k => k !== 'speedboat'), original);
for (const kind of original) for (const key of ['CONFIG', 'COCKPIT', 'GUNNER', 'CHASE', 'GUNNER_LEAD', 'GUNNER_DROP'])
  assert.deepEqual(api[key][kind], old[key][kind], `${kind} exact old27 ${key}`);
console.log('PASS exact old27 configs and all five camera maps; boat append only');
const saved = { self: globalThis.self, bitmap: globalThis.createImageBitmap };
const raw = async file => {
  const bytes = readFileSync(resolve(base, file));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
const signature = template => ({ bones: template.bones.map(b => [b.name, b.parent, b.position.toArray(), b.quaternion.toArray(), b.scale.toArray()]),
  anchors: template.anchors.map(a => [a.key, a.bone, a.matrix.toArray()]), stats: template.stats,
  meshes: template.meshes.map(m => [m.role, Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, hash(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength))])),
    hash(Buffer.from(m.geometry.index.array.buffer)), m.shared && [m.shared.type, m.shared.color?.toArray(), m.shared.roughness, m.shared.metalness, m.shared.opacity]]) });
const bones = view => view.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones;
const near = (a, b, label) => assert(new T.Vector3(...a).distanceTo(new T.Vector3(...b)) < 1e-5, label);
try {
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async blob => {
    const bytes = Buffer.from(await blob.arrayBuffer()); assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() {} };
  };
  // Each original GLB is parsed once, then fed unchanged to both actual template builders.
  for (const kind of original) {
    const cfg = old.CONFIG[kind], gltf = await raw(`models/${cfg.file}.glb`);
    const currentTemplate = api.buildTemplate(kind, gltf.scene), oldTemplate = old.buildTemplate(kind, gltf.scene);
    assert.deepEqual(signature(currentTemplate), signature(oldTemplate), `${kind}: old geometry/UV/factors/bones/PBR`);
  }
  console.log('PASS all27 actual original GLB template geometry/UV/factors/bones/anchors/material signatures against exact11e');
  const bytes = readFileSync(resolve(base, 'models/speedboat.glb'));
  assert.equal(hash(bytes), '7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee');
  const gltf = await raw('models/speedboat.glb'), template = api.buildTemplate('speedboat', gltf.scene);
  assert.equal(template.stats.triangles, 17252); assert.equal(template.meshes.length, 92);
  const materials = new Map(); gltf.scene.traverse(o => { if (o.isMesh) materials.set(o.material.name, o.material); });
  for (const mesh of template.meshes) {
    assert(['toon', 'glass'].includes(mesh.role)); const mat = mesh.shared, source = materials.get(mat.name); assert(source);
    for (const key of ['roughness', 'metalness', 'opacity', 'transparent', 'alphaTest', 'side', 'depthWrite', 'vertexColors', 'clearcoat', 'clearcoatRoughness'])
      assert.equal(mat[key], source[key] ?? (key.startsWith('clearcoat') ? 0 : source[key]), `${mat.name}: ${key}`);
    for (const key of ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'aoMap', 'emissiveMap', 'alphaMap']) assert.equal(mat[key], source[key]);
    assert.deepEqual(mat.color.toArray(), source.color.toArray()); assert.deepEqual(mat.emissive.toArray(), source.emissive.toArray());
    assert(!mat.colorNode && !mat.roughnessNode && !mat.metalnessNode, 'no aircraft finish/weathering remap');
    assert(mesh.geometry.hasAttribute('uv')); assert(mesh.geometry.hasAttribute('color'));
  }
  api.templates.set('speedboat', template);
  const view = api.createAircraftView('speedboat', 0, 'low'), second = api.createAircraftView('speedboat', 1, 'high');
  assert(view.ready && second.ready); assert.equal(api.CONFIG.speedboat.turret.seat, 0); assert.deepEqual(api.CONFIG.speedboat.afterburners, []);
  const camera = new T.PerspectiveCamera(); camera.position.set(0, 10, 20); camera.updateMatrixWorld(true);
  const me = { kind: 'speedboat', alive: true, seats: ['pilot', null], aim: [[1, .2, -1], [-1, 0, -1]], weapons: [[], []],
    flight: { position: [0, 0, 3000], orientation: [0, 0, 0, 1], velocity: [0, 0, -14], throttle: .5, angularVelocity: [0, 0, 0], crashed: null, onGround: false, gearDown: false } };
  api.setAircraftGroundQuery(() => -10);
  view.update(me, [], .1, camera); view.root.updateMatrixWorld(true);
  const rig = bones(view), yaw = rig.find(b => b.name === 'cannon_yaw'), pitch = rig.find(b => b.name === 'cannon_pitch');
  assert(yaw.rotation.y < 0 && pitch.rotation.x > 0, 'pilot gun signed yaw/pitch');
  const gun = view.anchors.get('gun').getWorldPosition(new T.Vector3());
  const direction = new T.Vector3(0, 0, -1).applyQuaternion(pitch.getWorldQuaternion(new T.Quaternion()));
  assert(direction.x > 0 && direction.y > 0); assert(Number.isFinite(gun.length()));
  const props = rig.filter(b => /^prop_[LR]$/.test(b.name)); assert.equal(props.length, 2); assert(props[0].rotation.z * props[1].rotation.z < 0);
  const foam = view.root.children.filter(o => /^wake_._foam$/.test(o.name)); assert.equal(foam.length, 2); assert(foam.every(o => o.visible));
  assert.equal(view.root.scale.x, 1); assert(!view.root.getObjectByName('landing_light'));
  const priorYaw = yaw.quaternion.toArray(); me.aim[1] = [0, 1, 0]; me.seats[1] = 'forbidden-seat-fixture'; view.update(me, [], 0, camera);
  assert.deepEqual(yaw.quaternion.toArray(), priorYaw, 'seat1 cannot steer gun');
  me.seats[0] = null; view.update(me, [], 0, camera); near(yaw.rotation.toArray().slice(0, 3), [0, 0, 0], 'unoccupied pilot returns gun forward');
  me.flight.velocity = [0, 0, 0]; view.update(me, [], .1, camera); assert(foam.every(o => !o.visible));
  me.alive = false; view.update(me, [], .1, camera); assert(!view.root.visible && foam.every(o => !o.visible));
  let disposed = 0; foam[0].geometry.addEventListener('dispose', () => disposed++);
  view.dispose(); view.dispose(); assert.equal(disposed, 0, 'shared wake retained by second view');
  second.dispose(); assert.equal(disposed, 1, 'last wake user releases geometry once');
  console.log('PASS actual speedboat GLB PBR/maps/vertex colors, pilot-only signed gun, opposite props, bounded wake and disposal');
  for (const kind of [...original, 'speedboat']) {
    const current = new api.CameraRig(new T.PerspectiveCamera()), previous = kind === 'speedboat' ? null : new old.CameraRig(new T.PerspectiveCamera());
    for (const rig of [current, previous].filter(Boolean)) { rig.cockpitBody(.1, kind, [0, 0, 3000], [0, 0, 0, 1], .1, -.1); rig.apply(1); }
    if (previous) { assert.deepEqual(current.camera.position.toArray(), previous.camera.position.toArray()); assert.deepEqual(current.camera.quaternion.toArray(), previous.camera.quaternion.toArray()); }
    else { near(current.camera.position.toArray(), [0, 1.9, 3000.9], 'actual helm eye'); current.chaseBody(.1, kind, [0, 0, 3000], [0, 0, 0], [0, 0, 0, 1], 0, 0, () => -10); current.apply(1); near(current.camera.position.toArray(), [0, 4.8, 3013], 'actual boat follow'); }
  }
  console.log('PASS old27 actual cockpit pose parity and boat helm/chase poses; physical/native views remain held');
} finally {
  globalThis.self = saved.self; globalThis.createImageBitmap = saved.bitmap;
}
