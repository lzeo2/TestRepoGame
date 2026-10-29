// Actual native source/GLBs/combat/RoomEngine. CPU state and PNG metadata, NOT pixels or listening.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools; no install');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const T = await import(pathToFileURL(resolve(three, 'build/three.module.js')));
const base = fileURLToPath(new URL('../', import.meta.url)), repo = resolve(base, '../..');
const src = resolve(base, 'source/games/wings/src'), pin = '9216a12f', pair = ['ah64d', 'mi28n'];
const git = (...args) => execFileSync('git', args, { cwd: repo, maxBuffer: 16000000 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const historicalModels = git('ls-tree', '-r', '--name-only', pin, 'Games/Wings/models').toString().trim().split('\n').filter(p => p.endsWith('.glb'));
assert.equal(historicalModels.length, 68);
const receipts = ['named', 'expanded', 'six-aircraft', 'four-vessel', 'eight-aircraft', 'five-vessel', 'ten-aircraft', 'twelve-aircraft', 'six-vessel', 'thirteen-aircraft', 'fourteen-aircraft', 'fifteen-aircraft', 'sixteen-aircraft'].map(n => `docs/wings-local-native/${n}-coalition-flight.json`);
for (const path of [...historicalModels, ...receipts, 'docs/wings-local-native/declared-rafale-yak-flight.json']) assert.deepEqual(readFileSync(resolve(repo, path)), git('show', `${pin}:${path}`), `${path}: preserved bytes`);
for (const path of ['native-fighter-pair.json', 'extended-escort-models.json', 'native-tu160.json']) assert.deepEqual(readFileSync(resolve(base, 'authoring', path)), git('show', `${pin}:Games/Wings/authoring/${path}`));
console.log('PASS all68 old GLBs, fighter/fleet/Tu160 metadata, 13 random receipts and declared Rafale/Yak receipt byte-exact');
assert(existsSync(resolve(base, 'authoring/native-helicopter-pair.json')), 'HOLD: clearance-accepted native-helicopter-pair.json and derivative GLBs are absent; no readiness claim');
const descriptor = JSON.parse(readFileSync(resolve(base, 'authoring/native-helicopter-pair.json')));
assert.equal(descriptor.schema, 'wings_native_helicopter_pair_v1');
assert.deepEqual(Object.keys(descriptor.models), pair);
function threePlugin(external = true) {
  return { name: 'approved-three', setup(api) {
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => {
      const key = path === 'three' ? '.' : `.${path.slice(5)}`;
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      if (typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string', key);
      const file = resolve(three, target);
      return external ? { path: pathToFileURL(file).href, external: true } : { path: file };
    });
  } };
}
const entries = {
  'sim/vehicles.ts': 'VEHICLES, VEHICLE_KINDS, WEAPONS, NATIVE_FIGHTER_MODELS, NATIVE_BOMBER_MODELS',
  'sim/flight.ts': 'createFlightState, stepFlight, NEUTRAL_INPUT, isStalled, HELI, HELI_DIRECT',
  'sim/combat.ts': 'ARMOR, createCombatState, createWeapons, applySeatInput, stepCombat, muzzlePosition, launchedHardpoint, bombReleasePosition, shipDamageFor',
  'sim/bots.ts': 'chooseBotVehicle',
  'render/aircraft.ts': 'CONFIG, createAircraftView, aircraftStats',
  'render/camera.ts': 'CameraRig, COCKPIT, GUNNER, CHASE, GUNNER_LEAD, GUNNER_DROP',
  'audio/engines.ts': 'EngineVoice, ENGINE_REF, ENGINE_LOUDNESS',
  'render/world/atmosphere.ts': 'STORM',
};
async function sourceApi(reference = null) {
  const result = await build({ stdin: { contents: Object.entries(entries).map(([file, names]) =>
    `export { ${names} } from ${JSON.stringify(resolve(src, file))};`).join('\n'), resolveDir: src },
    bundle: true, platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none',
    plugins: [threePlugin(), { name: 'actual-and-pinned-source', setup(api) {
      api.onLoad({ filter: /\.ts$/ }, ({ path }) => {
        if (!path.startsWith(src + '/')) return;
        let contents = reference ? git('show', `${reference}:Games/Wings/source/games/wings/src${path.slice(src.length)}`).toString() : readFileSync(path, 'utf8');
        if (path.endsWith('/flight.ts')) contents += '\nexport { HELI, HELI_DIRECT };';
        if (path.endsWith('/camera.ts')) contents += '\nexport { COCKPIT, GUNNER, CHASE, GUNNER_LEAD, GUNNER_DROP };';
        return { contents, loader: 'ts' };
      });
    } }] });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
}
const api = await sourceApi(), old = await sourceApi(pin);
assert.equal(old.VEHICLE_KINDS.length, 25);
assert.deepEqual(api.VEHICLE_KINDS, [...old.VEHICLE_KINDS, ...pair]);
assert.deepEqual(api.NATIVE_FIGHTER_MODELS, old.NATIVE_FIGHTER_MODELS);
assert.deepEqual(api.NATIVE_BOMBER_MODELS, old.NATIVE_BOMBER_MODELS);
assert.equal(api.shipDamageFor('bomb'), 2700);
assert.equal(api.shipDamageFor('bomb') * .5, 1350);
assert.deepEqual(api.WEAPONS, old.WEAPONS);
const world = { groundHeight: () => 20, onRunway: () => true, half: 1000000, ceiling: 10000 };
const spawn = { position: [0, 3000, 0], yaw: 0, onGround: false };
const entity = (kind, id = kind, team = 0, position = [0, 5000, 0]) => ({ id, kind, team, alive: true,
  flight: api.createFlightState(kind, { position, yaw: 0, onGround: false }), hp: api.VEHICLES[kind].maxHp, maxHp: api.VEHICLES[kind].maxHp,
  seats: [`${id}-pilot`, `${id}-officer`], aim: [null, null], weapons: api.createWeapons(kind),
  flareCount: 10, flaresReadyAt: 0, abilityReadyAt: 0, spottedUntil: 0, lastDamagedBy: null, spawnedAt: 0 });
const near = (a, b, label = 'position') => assert(new T.Vector3(...a).distanceTo(new T.Vector3(...b)) < 1e-4, `${label}: ${a} vs ${b}`);
const seatInput = (firePrimary = false) => ({ aim: [0, 0, -1], firePrimary, fireSecondary: false, flares: false, ability: false });
function combat() { const cs = api.createCombatState(); cs.ships = {}; cs.turrets = []; return cs; }
for (const kind of old.VEHICLE_KINDS) {
  for (const key of ['VEHICLES', 'CONFIG', 'ENGINE_REF', 'ENGINE_LOUDNESS', 'COCKPIT', 'GUNNER', 'CHASE', 'GUNNER_LEAD', 'GUNNER_DROP'])
    assert.deepEqual(api[key][kind], old[key][kind], `${kind}: exact old25 ${key}`);
  const a = api.createFlightState(kind, spawn), b = old.createFlightState(kind, spawn);
  for (let tick = 0; tick < 120; tick++) {
    const input = { ...api.NEUTRAL_INPUT, aim: tick < 60 ? null : [0, .1, -1], pitch: .1, yaw: .2, roll: .15, throttle: Math.sin(tick / 20) };
    api.stepFlight(a, input, 1 / 60, world); old.stepFlight(b, input, 1 / 60, world); assert.deepEqual(a, b);
  }
  for (const id of Object.keys(api.WEAPONS)) for (const ammo of [-5, -1, 0, 1, 2, 3, 4, 8])
    assert.equal(api.launchedHardpoint(id, ammo), old.launchedHardpoint(id, ammo), `${kind}: legacy two-rail helper`);
  const me = entity(kind);
  for (const q of [[0, 0, 0, 1], [0, Math.SQRT1_2, 0, Math.SQRT1_2]]) {
    me.flight.orientation = q;
    for (const id of Object.keys(api.WEAPONS)) for (const seat of [0, 1]) for (const rail of [-5, -2, -1, -.5, 0, .5, 1, 2, 5, NaN, Infinity, -Infinity])
      assert.deepEqual(api.muzzlePosition(me, seat, id, [0, 0, 0], rail), old.muzzlePosition(me, seat, id, [0, 0, 0], rail), `${kind}/${id}: shared muzzle old two-rail/fallback parity`);
    if (kind === 'tu160' || kind === 'bomber') for (let ammo = 8; ammo > 0; ammo--)
      assert.deepEqual(api.bombReleasePosition(me, ammo, [0, 0, 0]), old.bombReleasePosition(me, ammo, [0, 0, 0]), `${kind}: eight old bomb release points`);
  }
}
assert.deepEqual(api.HELI.apache, old.HELI.apache); assert.deepEqual(api.HELI_DIRECT.apache, old.HELI_DIRECT.apache);
assert.deepEqual(Object.keys(api.HELI), ['apache', ...pair]); assert.deepEqual(Object.keys(api.HELI_DIRECT), ['apache', ...pair]);
console.log('PASS old25 exact specs/rig/camera/audio tables, Apache HELI/HELI_DIRECT, 3000 changed-path flight ticks and all weapon/seat/negative-index muzzle parity');
// Real incoming cannon damage is mandatory for EVERY registered kind, never a pending-kind skip.
for (const kind of api.VEHICLE_KINDS) {
  assert(Number.isFinite(api.ARMOR[kind]) && api.ARMOR[kind] > 0, `${kind}: parent armor required`);
  const attacker = entity('fighter', 'attacker'), victim = entity(kind, 'victim', 1, [0, 5000, -120]), cs = combat();
  for (let tick = 0; tick < 60; tick++) {
    const now = 100 + tick / 60;
    api.applySeatInput(cs, attacker, 0, seatInput(true), [attacker, victim], now, []);
    api.stepCombat(cs, [attacker, victim], 1 / 60, now, []); assert(Number.isFinite(victim.hp));
  }
  assert(victim.hp < victim.maxHp, `${kind}: actual incoming damage`);
}
console.log('PASS all27 finite positive armor and actual incoming native damage');
// Numeric WebAudio spies execute the real graph; this is not audible evidence.
function audioSignature(module, kind) {
  const values = [], nodes = [];
  const node = () => {
    const n = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } }, index = nodes.push(n) - 1;
    for (const key of ['gain', 'frequency', 'detune', 'playbackRate', 'Q', 'positionX', 'positionY', 'positionZ'])
      n[key] = { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { assert(Number.isFinite(value)); this.value = value; values.push([index, key, value]); } };
    return n;
  };
  const ctx = { currentTime: 0, createGain: node, createBiquadFilter: node, createPanner: node, createOscillator: node, createBufferSource: node };
  const core = { ctx, now: 0, engineBus: node(), bank: { pink: {}, brown: {}, rotor: {} }, hrtfInUse: 0, distanceTo: () => 0, doppler: () => 1 };
  const me = entity(kind), voice = new module.EngineVoice(core, 'audio-fixture', kind, me);
  for (const throttle of [0, .5, 1]) { me.flight.throttle = throttle; core.now += .1; voice.update(me, true, false); }
  if (pair.includes(kind)) { assert(voice.chop && voice.tail); assert.equal(voice.burner, null); assert.equal(voice.roar2, null); }
  voice.release(); assert(voice.dying && Number.isFinite(voice.stopAt)); voice.dispose();
  assert(nodes.filter(n => n.started).every(n => n.stopped)); assert.equal(core.hrtfInUse, 0); return values;
}
for (const kind of old.VEHICLE_KINDS) assert.deepEqual(audioSignature(api, kind), audioSignature(old, kind));
for (const kind of pair) audioSignature(api, kind);
console.log('PASS old25 real audio parameter parity; both reuse existing finite rotor graph and disposal, no burner voice');
const saved = { fetch: globalThis.fetch, self: globalThis.self, bitmap: globalThis.createImageBitmap };
const { GLTFLoader } = await import(pathToFileURL(resolve(three, 'examples/jsm/loaders/GLTFLoader.js')));
try {
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async blob => {
    const bytes = Buffer.from(await blob.arrayBuffer()); assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: hash(bytes), close() {} };
  };
  globalThis.fetch = async input => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('blob:')) return saved.fetch(input);
    assert.match(url, /^\/models\/(?:derived\/)?[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(base, url.slice(1))));
  };
  const ready = async view => { const end = performance.now() + 15000; while (!view.ready && performance.now() < end) await delay(1); assert(view.ready, 'real native template ready'); };
  const bones = view => view.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones;
  // Small changed-shared-path parity, not another 159300-tick fighter rerun.
  for (const kind of old.VEHICLE_KINDS) {
    const views = [api.createAircraftView(kind, 0, 'low'), old.createAircraftView(kind, 0, 'low')];
    try {
      await Promise.all(views.map(ready)); const me = entity(kind), camera = new T.PerspectiveCamera(); camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true);
      views.forEach(v => v.setLocal(true));
      for (const ammo of [null, 0, 1]) {
        if (ammo !== null) for (const seat of me.weapons) for (const w of seat) w.ammo = ammo;
        views.forEach(v => { v.setFiring(0, 0, ammo === 0); for (let i = 0; i < 12; i++) v.update(me, [], 1 / 60, camera); });
        bones(views[0]).forEach((b, i) => { const other = bones(views[1])[i]; assert.equal(b.name, other.name); assert.deepEqual(b.position.toArray(), other.position.toArray()); assert.deepEqual(b.scale.toArray(), other.scale.toArray()); assert.deepEqual(b.quaternion.toArray(), other.quaternion.toArray()); });
      }
    } finally { views.forEach(v => v.dispose()); }
  }
  console.log('PASS all25 old actual GLB bone rest/spin/gun/ammo poses against pinned source');
  for (const [kind, slug, cruise, boost, hp] of [['ah64d', 'ah-64d-apache', 70, 92, 550], ['mi28n', 'mi-28n', 68, 90, 600]]) {
    const d = descriptor.models[kind], spec = api.VEHICLES[kind], cfg = api.CONFIG[kind];
    for (const rail of [-9, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 9]) {
      const index = ((rail % 4) + 4) % 4, me = entity(kind);
      near(api.muzzlePosition(me, 1, 'hellfire', [0, 0, 0], rail), d.hardpoints.missiles[1][index].map((x, i) => x + me.flight.position[i]));
    }
    assert.deepEqual([3, 2, 1, 0].map(ammo => api.launchedHardpoint('hellfire', ammo, 4)), [0, 1, 2, 3]);
    assert.equal(d.source_model_id, `wings.original.${slug}.v1`);
    assert.equal(d.source_sha256, kind === 'ah64d' ? '01965a9e0fd16e57483f6bbda7ffadb2299f773396bb3c3045351acee4ea0a59' : 'dc193d170b343ec1ca8075684b2eb5ec418b833ffbd8d1ae063be3d7ab7d0634');
    assert.equal(hash(readFileSync(resolve(base, `models/supplied/${slug}.glb`))), d.source_sha256);
    const bytes = readFileSync(resolve(base, d.file)); assert.equal(hash(bytes), d.sha256);
    assert.equal(spec.flight, 'heli'); assert.equal(spec.stall, 0); assert.equal(spec.cruise, cruise); assert.equal(spec.boost, boost); assert.equal(spec.maxHp, hp); assert(!spec.stealth);
    assert.deepEqual(spec.seatWeapons, [['rockets', null], ['hellfire', null]]); assert.deepEqual(spec.hardpoints, d.hardpoints); assert(!('gun' in d.hardpoints));
    assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
    assert.deepEqual(d.rotors.map(r => [r.node, r.axis, r.speed, r.driver]), [['main_rotor_spin', 'y', -30, 'rotor'], ['tail_rotor_spin', 'x', -70, 'rotor']]);
    assert.deepEqual(d.exhausts, []); assert(!('afterburning' in d)); assert.equal(cfg.placeholder.heli, true); assert.equal(cfg.sourcePbr, true); assert.deepEqual(cfg.afterburners, []); assert(!cfg.turret && !cfg.ballPod && !cfg.controls);
    const order = ['hellfire_L1', 'hellfire_R1', 'hellfire_L2', 'hellfire_R2'];
    assert.deepEqual(cfg.stores, [{ weapons: [[1, 0]], order }]); assert.deepEqual([...d.native_pivots].sort(), ['main_rotor_spin', 'tail_rotor_spin', ...order].sort());
    assert.deepEqual(d.hardpoints.missiles[0], []); assert.equal(d.hardpoints.missiles[1].length, 4); assert.equal(d.hardpoints.rockets.length, 2);
    const raw = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); raw.scene.updateMatrixWorld(true);
    // Exact analytic envelope of every vertex through a full rotor turn, including offset pivots.
    // Static parked-blade bounds are insufficient, especially for the five-blade Mi-28N.
    const swept = new T.Box3(), p = new T.Vector3(), axis = new T.Vector3();
    raw.scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      let rotor = null, ancestor = mesh;
      while (ancestor) { rotor = d.rotors.find(r => r.node === ancestor.name); if (rotor) break; ancestor = ancestor.parent; }
      const vertices = mesh.geometry.getAttribute('position');
      const inverse = ancestor && new T.Matrix4().copy(ancestor.matrixWorld).invert();
      if (rotor) axis.set(rotor.axis === 'x' ? 1 : 0, rotor.axis === 'y' ? 1 : 0, rotor.axis === 'z' ? 1 : 0);
      for (let i = 0; i < vertices.count; i++) {
        p.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
        if (!rotor) { swept.expandByPoint(p); continue; }
        p.applyMatrix4(inverse);
        const positions = [0, Math.PI / 2, Math.PI].map(angle => p.clone().applyAxisAngle(axis, angle).applyMatrix4(ancestor.matrixWorld));
        const center = positions[0].clone().add(positions[2]).multiplyScalar(.5), u = positions[0].clone().sub(center), v = positions[1].clone().sub(center);
        const radius = new T.Vector3(Math.hypot(u.x, v.x), Math.hypot(u.y, v.y), Math.hypot(u.z, v.z));
        swept.expandByPoint(center.clone().sub(radius)); swept.expandByPoint(center.clone().add(radius));
      }
    });
    near(swept.min.toArray(), d.bounds.min, 'full rotor swept min'); near(swept.max.toArray(), d.bounds.max, 'full rotor swept max');
    const point = name => { const n = raw.scene.getObjectByName(name); assert(n, name); return n.getWorldPosition(new T.Vector3()).toArray(); };
    near(point('cockpit_eye'), d.cockpit);
    order.forEach((n, i) => near(point(`${n}_launch`), d.hardpoints.missiles[1][i]));
    ['rocket_pod_L', 'rocket_pod_R'].forEach((n, i) => near(point(`${n}_launch`), d.hardpoints.rockets[i]));
    let blades = 0;
    raw.scene.getObjectByName('main_rotor_blade_assembly').traverse(m => {
      if (!m.isMesh || !m.material.name.startsWith('intake_and_seals')) return;
      const positions = m.geometry.attributes.position, parent = [], welded = new Map();
      const root = i => parent[i] === i ? i : (parent[i] = root(parent[i]));
      for (let i = 0; i < positions.count; i++) {
        parent[i] = i;
        const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].join(',');
        if (welded.has(key)) parent[root(i)] = root(welded.get(key)); else welded.set(key, i);
      }
      const ids = m.geometry.index;
      for (let i = 0; i < ids.count; i += 3) {
        parent[root(ids.getX(i + 1))] = root(ids.getX(i));
        parent[root(ids.getX(i + 2))] = root(ids.getX(i));
      }
      blades += new Set(parent.map((_, i) => root(i))).size;
    });
    assert.equal(blades, kind === 'ah64d' ? 4 : 5, 'actual connected main blade geometry');
    assert.deepEqual(d.fixed_gear, ['main_wheel_L', 'main_wheel_R', 'tailwheel']);
    const wheelPoints = [];
    for (const name of d.fixed_gear) {
      const wheel = raw.scene.getObjectByName(name); assert(wheel && !cfg.pivots.includes(name));
      wheel.traverse(m => { if (m.isMesh) for (let i = 0; i < m.geometry.attributes.position.count; i++)
        wheelPoints.push(new T.Vector3().fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); });
    }
    assert(wheelPoints.length > 0);
    const view = api.createAircraftView(kind, 0, 'low');
    try {
      await ready(view); assert(!view.root.getObjectByName('placeholder')); assert(!view.anchors.has('gun'));
      const meshes = view.root.getObjectByName('model').children.filter(m => m.isSkinnedMesh), skeleton = meshes[0].skeleton;
      const bone = name => { const b = skeleton.bones.find(b => b.name === name); assert(b, name); return b; };
      const fixedVertices = [];
      for (const mesh of meshes) {
        const positions = mesh.geometry.attributes.position, indices = mesh.geometry.attributes.skinIndex;
        for (let i = 0; i < positions.count; i++) if (indices.getX(i) === 0)
          fixedVertices.push(new T.Vector3().fromBufferAttribute(positions, i));
      }
      for (const point of wheelPoints) assert(fixedVertices.some(p => p.distanceToSquared(point) < 1e-8), 'actual wheel vertices bound to static root, never rotor/gear/store bone');
      let triangles = 0, mapped = 0;
      raw.scene.traverse(m => {
        if (!m.isMesh) return; triangles += m.geometry.index.count / 3;
        if (!m.material.map) return; mapped++;
        const dest = meshes.find(n => n.material.map && n.material.color.equals(m.material.color) && n.material.roughness === m.material.roughness && n.material.metalness === m.material.metalness); assert(dest);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) { assert.equal(!!dest.material[key], !!m.material[key]); if (m.material[key]) assert.equal(dest.material[key].image.sha256, m.material[key].image.sha256); }
        assert.equal(dest.material.opacity, m.material.opacity); assert.equal(dest.material.transparent, m.material.transparent); assert(dest.geometry.hasAttribute('uv'));
      });
      assert(mapped > 0); assert.equal(api.aircraftStats(kind).triangles, triangles); assert.equal(meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0), triangles);
      for (const name of d.native_pivots) {
        const index = skeleton.bones.indexOf(bone(name));
        assert(meshes.some(m => { const si = m.geometry.getAttribute('skinIndex'); for (let i = 0; i < si.count; i++) if (si.getX(i) === index) return true; return false; }), `${name}: actual geometry binding`);
      }
      assert(!meshes.some(m => ['flame', 'afterburner'].includes(m.name)));
      const me = entity(kind), camera = new T.PerspectiveCamera(); camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true); view.setLocal(true);
      const update = (dt = 1 / 60) => { view.update(me, [], dt, camera); view.root.updateMatrixWorld(true); };
      for (const q of [[0, 0, 0, 1], [0, Math.SQRT1_2, 0, Math.SQRT1_2]]) {
        me.flight.orientation = q; update();
        const transform = p => new T.Vector3(...p).applyQuaternion(new T.Quaternion(...q)).add(new T.Vector3(...me.flight.position)).toArray();
        for (const [weapon, seat, points, names] of [['hellfire', 1, d.hardpoints.missiles[1], order], ['rockets', 0, d.hardpoints.rockets, ['rocket_pod_L', 'rocket_pod_R']]])
          points.forEach((p, i) => { near(api.muzzlePosition(me, seat, weapon, [0, 0, 0], i), transform(p)); near(view.anchors.get(names[i]).getWorldPosition(new T.Vector3()).toArray(), transform(p)); });
        const rig = new api.CameraRig(new T.PerspectiveCamera()); rig.cockpitBody(1 / 60, kind, me.flight.position, q, 0, 0); rig.apply(1 / 60); near(rig.camera.position.toArray(), transform(d.cockpit));
      }
      me.flight.orientation = [0, 0, 0, 1]; update();
      const rest = d.rotors.map(r => bone(r.node).quaternion.clone());
      for (let i = 0; i < 60; i++) update(); d.rotors.forEach((r, i) => assert(bone(r.node).quaternion.angleTo(rest[i]) > .01));
      const paused = d.rotors.map(r => bone(r.node).quaternion.toArray()); update(0); assert.deepEqual(d.rotors.map(r => bone(r.node).quaternion.toArray()), paused);
      me.alive = false; update(); assert.equal(view.root.visible, false); assert.deepEqual(d.rotors.map(r => bone(r.node).quaternion.toArray()), paused);
      view.setLocal(false); update(); assert.equal(view.root.visible, false); me.alive = true; view.setLocal(true);
      // Actual lock progress, then four native launches. Only time advances between shots; no lock/ammo grants.
      const shooter = entity(kind), target = entity('fighter', 'target', 1, [0, 5000, -600]), cs = combat(), events = [];
      let now = 100; const hellfire = api.WEAPONS.hellfire;
      for (let i = 0; i <= Math.ceil(hellfire.lockTime * 60); i++) { api.applySeatInput(cs, shooter, 1, seatInput(), [shooter, target], now, events); now += 1 / 60; }
      assert.equal(shooter.weapons[1][0].lock, 1);
      for (let rail = 0; rail < 4; rail++) {
        api.applySeatInput(cs, shooter, 1, seatInput(true), [shooter, target], now, events);
        assert.equal(shooter.weapons[1][0].ammo, 3 - rail); assert.equal(cs.missiles.length, rail + 1);
        const missile = cs.missiles.at(-1); assert.equal(missile.owner, shooter.seats[1]); assert.equal(missile.weapon, 'hellfire');
        near(missile.position.map((n, i) => n + missile.velocity[i] / 60), d.hardpoints.missiles[1][rail].map((n, i) => n + shooter.flight.position[i]), 'real four-rail shot');
        view.update(shooter, [], 1 / 60, camera); order.forEach((n, i) => assert.equal(bone(n).scale.x > .9, i > rail));
        now += 1 / hellfire.rate;
      }
      const regen = combat();
      for (let count = 1; count <= 4; count++) { api.stepCombat(regen, [shooter], hellfire.refill / 4, now + hellfire.refillDelay + count * hellfire.refill, []); view.update(shooter, [], 1 / 60, camera); assert.equal(shooter.weapons[1][0].ammo, count); assert.equal(order.filter(n => bone(n).scale.x > .9).length, count); }
      const rockets = combat(); api.applySeatInput(rockets, me, 0, seatInput(true), [me], 100, []); assert.equal(me.weapons[0][0].ammo, 37);
      const rocket = rockets.projectiles[0]; assert.equal(rocket.weapon, 'rockets'); assert.equal(rocket.owner, me.seats[0]); assert.equal(rocket.ttl, api.WEAPONS.rockets.ttl);
      near(rocket.position.map((n, i) => n + rocket.velocity[i] / 60), api.muzzlePosition(me, 0, 'rockets', [0, 0, 0], 0));
      assert(Math.abs(Math.hypot(...rocket.velocity) - api.WEAPONS.rockets.speed) < 1e-6);
      const vy = rocket.velocity[1]; api.stepCombat(rockets, [me], 1 / 60, 100 + 1 / 60, []); assert(Math.abs(rocket.velocity[1] - vy + 9.81 / 60) < 1e-6);
      const reset = entity(kind); view.setLocal(false); view.setLocal(true); view.update(reset, [], 1 / 60, camera); assert(order.every(n => bone(n).scale.x > .9));
      const daylight = api.STORM.daylight.value;
      try {
        api.STORM.daylight.value = 0; update();
        const light = view.root.getObjectByName('landing_light'); assert(light?.visible && light.intensity > 0);
        assert.equal(light.target.position.y, -160, 'existing heli searchlight target');
        view.setLocal(false); update(); assert(!view.root.getObjectByName('landing_light'));
        view.setLocal(true); me.alive = false; update(); assert(!view.root.getObjectByName('landing_light')); me.alive = true;
      } finally { api.STORM.daylight.value = daylight; }
      console.log(`PASS ${kind}: ${JSON.stringify(api.aircraftStats(kind))}; actual PBR/rotor geometry, rotated rails/cockpit, four Hellfire lock/fire/stores/refill, Hydra ammo/ballistics, pause/death/seat/reset`);
      view.dispose(); view.update(reset, [], 1 / 60, camera); assert(!view.ready && view.root.children.length === 0);
      const stale = api.createAircraftView(kind, 0, 'low'); stale.dispose(); await delay(1); assert(!stale.ready && stale.root.children.length === 0);
    } finally { view.dispose(); }
    for (const mode of [null, [0, 0, -1]]) {
      const launch = api.createFlightState(kind, { position: [0, 21.9, 0], yaw: 0, onGround: true });
      for (let tick = 0; tick < 300; tick++) api.stepFlight(launch, { ...api.NEUTRAL_INPUT, aim: mode, throttle: 1 }, 1 / 60, world);
      assert(!launch.onGround && !launch.crashed && launch.position[1] > 30);
      assert(Math.hypot(launch.velocity[0], launch.velocity[2]) < 1e-8, 'vertical takeoff without catapult or horizontal impulse');
      const crash = api.createFlightState(kind, { position: [0, 22, 0], yaw: 0, onGround: false });
      crash.velocity = [0, -40, 0];
      for (let tick = 0; tick < 10 && !crash.crashed; tick++) api.stepFlight(crash, { ...api.NEUTRAL_INPUT, aim: mode }, 1 / 60, world);
      assert.equal(crash.crashed, 'terrain');
      const reset = api.createFlightState(kind, spawn); assert.equal(reset.crashed, null); assert(reset.gearDown);
      const turn = api.createFlightState(kind, spawn);
      for (let tick = 0; tick < 180; tick++) api.stepFlight(turn, { ...api.NEUTRAL_INPUT, aim: mode, pitch: -.2, throttle: .2, yaw: .3 }, 1 / 60, world);
      assert(!turn.crashed && turn.position[1] > spawn.position[1] && Math.abs(turn.orientation[1]) > .1 && Math.hypot(turn.velocity[0], turn.velocity[2]) > 1);
      const hover = api.createFlightState(kind, spawn);
      for (let i = 0; i < 120; i++) api.stepFlight(hover, { ...api.NEUTRAL_INPUT, aim: mode }, 1 / 60, world);
      near(hover.position, spawn.position, 'native hover'); assert(!api.isStalled(hover));
      for (const [axis, value] of [['throttle', 1], ['yaw', .4], ['roll', .35], ['pitch', -.25]]) {
        const flight = api.createFlightState(kind, spawn);
        for (let i = 0; i < 90; i++) api.stepFlight(flight, { ...api.NEUTRAL_INPUT, aim: mode, [axis]: value }, 1 / 60, world);
        assert(!flight.crashed && [...flight.position, ...flight.velocity, ...flight.orientation].every(Number.isFinite));
        if (axis === 'throttle') assert(flight.position[1] > spawn.position[1] + 1);
        if (axis === 'yaw') assert(Math.abs(flight.orientation[1]) > .1);
        if (axis === 'roll') assert(flight.position[0] > 0);
        if (axis === 'pitch') assert(flight.position[2] < 0);
        for (let i = 0; i < 120; i++) api.stepFlight(flight, { ...api.NEUTRAL_INPUT, aim: mode, brake: true }, 1 / 60, world);
        assert([...flight.position, ...flight.velocity, ...flight.orientation].every(Number.isFinite));
      }
    }
    console.log(`PASS ${kind}: ordinary native direct/aim hover, climb, yaw, strafe, pitch, neutral/hover-hold, no jet stall`);
  }
} finally { globalThis.fetch = saved.fetch; globalThis.self = saved.self; globalThis.createImageBitmap = saved.bitmap; }
// Prove both real build entries before parent-owned bridge/source guards can block later fixtures.
for (const entry of ['main.ts', 'render/aircraft-preview/main.ts']) {
  await build({ entryPoints: [resolve(src, entry)], bundle: true, write: false, outdir: 'unused', platform: 'browser', format: 'esm', plugins: [threePlugin(false)], loader: { '.css': 'css' }, define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'silent' });
}
console.log('PASS actual main/aircraft preview write:false compilation; CPU only, native pixels/listening/performance remain HOLD');
// Actual RoomEngine with explicitly declared legal one-kind rosters. No production chooser/RNG retune.
const { installRetainedHostLoader, retainedRoot } = await import('./retained-host-loader.mjs');
const { createRetainedHostBridge } = await import('./retained-host-bridge.mjs');
const { createLocalFleetConfig } = await import('./local-host-scenario.mjs');
const loader = installRetainedHostLoader();
try {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { shipAt, DECK_LAYOUT } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const { worldToShip, SHIP_SPECS } = await import(new URL('src/sim/fleet.ts', retainedRoot));
  // Original UI uses this same spawn message and seat protocol. CPU lifecycle, not DOM/pointer-lock proof.
  for (const kind of pair) {
    const room = createLoopbackRoom({ teams: 2, bots: 0, botFill: 0, listed: false }, 'Heli original spawn protocol', { onMessage() {} }, { manual: true });
    try {
      room.send({ type: 'spawn', kind });
      const v = room.engine.vehicles.find(v => v.seats[0] === room.playerId);
      assert(v && v.kind === kind && room.engine.onOwnDeck(v));
      v.spawnedAt = -100; // Explicit protection expiry fixture; deck permits crew changes, not airborne grants.
      let seq = 0;
      const shot = () => {
        for (let tick = 0; tick < 12; tick++) {
          room.send({ type: 'input', seq: seq++, flight: api.NEUTRAL_INPUT, seat: seatInput(tick < 2) });
          room.step(1 / 60); // Consume the real adaptive input buffer, not an immediate-send assumption.
        }
      };
      shot(); assert.equal(v.weapons[0][0].ammo, 37);
      room.send({ type: 'switch-seat', seat: 1 }); assert.equal(v.seats[1], room.playerId);
      shot(); assert.equal(v.weapons[1][0].ammo, 3);
      assert(room.engine.combat.missiles.some(m => m.owner === room.playerId && m.weapon === 'hellfire'));
      room.send({ type: 'switch-seat', seat: 0 }); assert.equal(v.seats[0], room.playerId);
      room.send({ type: 'leave-vehicle' }); assert(!v.seats.includes(room.playerId));
      console.log(`PASS ${kind}: actual RoomEngine original spawn/input/seat/fire/leave protocol with explicit protection fixture`);
    } finally { room.close(); }
    const fresh = createLoopbackRoom({ teams: 2, bots: 0, botFill: 0 }, 'Heli fresh lifecycle', { onMessage() {} }, { manual: true });
    try {
      fresh.send({ type: 'spawn', kind });
      const v = fresh.engine.vehicles.find(v => v.kind === kind && v.seats[0] === fresh.playerId);
      assert(v && v.weapons[1][0].ammo === 4);
      const start = [...v.flight.position];
      for (let tick = 0; tick < 300; tick++) {
        fresh.send({ type: 'input', seq: tick, flight: { ...api.NEUTRAL_INPUT, throttle: 1 }, seat: seatInput() });
        fresh.step(1 / 60);
      }
      assert(v.alive && !v.flight.onGround && v.flight.position[1] > start[1] + 10, 'fresh real local spawn and pilot vertical takeoff');
    } finally { fresh.close(); }
  }
  const lookup = JSON.parse(readFileSync(resolve(base, 'authoring/supplied-fighters/roster_lookup.json')));
  for (const [choice, kinds] of [['nato', pair], ['eastern', [...pair].reverse()]]) {
    const config = createLocalFleetConfig(choice);
    kinds.forEach((kind, team) => assert(lookup.factions.some(row => row.faction === ((choice === 'nato') === (team === 0) ? 'A' : 'B') && row.model_id === descriptor.models[kind].source_model_id), 'declared supplied faction legality'));
    config.aircraft = kinds.map(id => [{ id, weapons: [] }]); // ONLY coverage restriction; all ten ships unchanged.
    const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters: kinds.map(k => [k]) });
    const room = createLoopbackRoom({ teams: 2, bots: 2, botFill: 0, listed: false, timeLimit: 600 }, 'Heli coverage observer', { onMessage() {} }, { manual: true, code: `declared-native-heli-${choice}`, hostBridge: bridge });
    const records = new Map();
    try {
      for (let tick = 0; tick < 1200; tick++) {
        room.step(1 / 60);
        for (const v of room.engine.vehicles) {
          assert.equal(v.kind, kinds[v.team]); assert(Number.isFinite(v.hp) && v.flight.position.every(Number.isFinite));
          let row = records.get(v.id);
          if (!row) {
            assert(v.flight.onGround && room.engine.onOwnDeck(v), 'normal native carrier birth');
            const carrier = shipAt(v.flight.position[0], v.flight.position[2]); assert(carrier && carrier.team === v.team && carrier.kind === 'carrier');
            const local = worldToShip(carrier, v.flight.position);
            assert(DECK_LAYOUT.heloSpots.some(([x, z]) => Math.hypot(local[0] - x, local[2] - z) < 1e-6), 'actual aft helo spot, NOT catapult');
            assert(Math.abs(local[1] - SHIP_SPECS.carrier.deckHeight - 1.9) < 1e-6);
            row = { kind: v.kind, team: v.team, carrier: carrier.id, start: [...v.flight.position], local, airborne: 0, climb: 0 }; records.set(v.id, row);
          }
          if (v.alive && !v.flight.onGround) row.airborne++;
          row.climb = Math.max(row.climb, v.flight.position[1] - row.start[1]);
          const pilot = room.engine.players.get(v.seats[0]);
          if (v.alive) assert(pilot?.info.bot && pilot.brain.state.skill === .5, 'only normal default bot controls');
        }
      }
      assert.equal(room.engine.botCount(), 4);
      assert.equal(room.engine.players.get(room.playerId).info.vehicleId, null);
      for (const team of [0, 1]) assert([...records.values()].some(r => r.team === team && r.airborne > 60 && r.climb > 60), 'normal native vertical takeoff on each side');
      console.log(`PASS declared ${choice} normal native aft births/vertical takeoff: ${JSON.stringify([...records.values()])}`);
    } finally { room.close(); }
  }
  // Disclosed CPU approach/protection fixture, not natural strike or real weapon compatibility.
  for (const kind of pair) {
    const config = createLocalFleetConfig();
    Object.assign(config.arena, { minX: 3000, maxX: 4000, minZ: 0, maxZ: 1800, bottomY: -100 });
    for (const u of config.units) Object.assign(u, { position: u.team ? [3500, 0, 1000] : [3800, 0, 1400], heading: 0, speed: 0, route: [], weapons: [], hp: 1000 });
    config.aircraft = [[{ id: kind, weapons: [] }], [{ id: 'fighter', weapons: [] }]];
    const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters: [[kind], ['fighter']] });
    const room = createLoopbackRoom({ teams: 2, bots: 0, botFill: 0, timeLimit: 600 }, 'Hydra fixture', { onMessage() {} }, { manual: true, code: `heli-hydra-${kind}`, hostBridge: bridge });
    try {
      room.send({ type: 'spawn', kind });
      const v = room.engine.vehicles.find(v => v.seats[0] === room.playerId); assert(v);
      let projectile;
      for (let tick = 0; tick < 36; tick++) {
        Object.assign(v.flight, { position: [3500, 8, 1200], velocity: [0, 0, 0], orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false, crashed: null, throttle: .5 });
        v.spawnedAt = -100; // Explicit protection/approach fixture, never part of the flight cases above.
        room.send({ type: 'input', seq: tick, seat: seatInput(tick < 2) }); room.step(1 / 60);
        projectile ??= room.engine.combat.projectiles.find(p => p.weapon === 'rockets');
      }
      assert.equal(v.weapons[0][0].ammo, 37); assert(projectile && projectile.owner === room.playerId && projectile.vehicle === v.id);
      const snapshot = bridge.snapshot(room.engine, room.playerId), impacts = snapshot.events.filter(e => e.type === 'impact');
      assert.equal(snapshot.units.find(u => u.id === 'enemy').hp, 904); assert.equal(impacts.length, 1); assert(!room.engine.combat.projectiles.includes(projectile));
      console.log(`PASS ${kind}: accepted actual native Hydra 38->37, single measured fitted impact 1000->904; disclosed CPU pose fixture`);
    } finally { room.close(); }
  }
} finally { loader.dispose(); }
