// Actual retained source and GLTF templates. CPU state/PNG metadata only, not native pixels or listening.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const T = await import(pathToFileURL(resolve(three, 'build/three.module.js')));
const { GLTFLoader } = await import(pathToFileURL(resolve(three, 'examples/jsm/loaders/GLTFLoader.js')));
const base = fileURLToPath(new URL('../', import.meta.url)), repo = resolve(base, '../..'), src = resolve(base, 'source/games/wings/src');
const pin = '1b652d1b', prefix = 'Games/Wings/';
const git = (...args) => execFileSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024 });
const prior = path => git('show', `${pin}:${path}`);
const hash = b => createHash('sha256').update(b).digest('hex');
const d = JSON.parse(readFileSync(resolve(base, 'authoring/native-tu160.json'))).models.tu160;
function threePlugin(external = true) {
  return { name: 'approved-three', setup(api) {
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => {
      const key = path === 'three' ? '.' : `.${path.slice(5)}`;
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      if (typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string');
      const file = resolve(three, target);
      return external ? { path: pathToFileURL(file).href, external: true } : { path: file };
    });
  } };
}
const entries = {
  'sim/vehicles.ts': 'VEHICLES, VEHICLE_KINDS, WEAPONS',
  'sim/flight.ts': 'createFlightState, stepFlight, NEUTRAL_INPUT, isStalled, bombImpactPoint',
  'sim/combat.ts': 'ARMOR, createCombatState, createWeapons, applySeatInput, stepCombat',
  'sim/bots.ts': 'createBotBrain, botInput, chooseBotVehicle',
  'render/aircraft.ts': 'CONFIG, createAircraftView, aircraftStats',
  'render/camera.ts': 'CameraRig',
  'audio/engines.ts': 'EngineVoice, ENGINE_REF, ENGINE_LOUDNESS',
};
async function sourceApi(old = false) {
  const plugins = [threePlugin()];
  if (old) plugins.push({ name: 'actual-old-source', setup(api) {
    api.onLoad({ filter: /\.ts$/ }, ({ path }) => path.startsWith(src + '/') ?
      { contents: prior(prefix + 'source/games/wings/src' + path.slice(src.length)).toString(), loader: 'ts' } : undefined);
  } });
  const extra = old ? '' : `export { hasBombLoad, NATIVE_BOMBER_MODELS, NATIVE_FIGHTER_MODELS } from ${JSON.stringify(resolve(src, 'sim/vehicles.ts'))};\nexport { bombReleasePosition } from ${JSON.stringify(resolve(src, 'sim/combat.ts'))};`;
  const result = await build({ stdin: { contents: Object.entries(entries).map(([file, names]) =>
    `export { ${names} } from ${JSON.stringify(resolve(src, file))};`).join('\n') + '\n' + extra, resolveDir: src },
    bundle: true, platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none', plugins });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
}
const api = await sourceApi(), old = await sourceApi(true);
assert.equal(old.VEHICLE_KINDS.length, 24);
assert.deepEqual(api.VEHICLE_KINDS, [...old.VEHICLE_KINDS, 'tu160']);
assert.equal(Object.keys(api.NATIVE_FIGHTER_MODELS).length, 17);
assert.deepEqual(Object.keys(api.NATIVE_BOMBER_MODELS), ['tu160']);
assert(!api.VEHICLE_KINDS.includes('ah64d') && !api.VEHICLE_KINDS.includes('mi28n'));
assert.deepEqual(api.WEAPONS, old.WEAPONS);
const spec = api.VEHICLES.tu160, cfg = api.CONFIG.tu160;
assert.deepEqual(spec.seatWeapons, [['bomb', null], ['bomb', null]]);
assert.deepEqual(spec.hardpoints, d.hardpoints);
assert.deepEqual(Object.keys(spec.hardpoints), ['bombs']);
assert.deepEqual([spec.cruise, spec.boost, spec.stall, spec.maxHp], [155, 210, 65, 800]);
assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
assert(!spec.stealth && spec.model !== api.VEHICLES.bomber.model);
assert.deepEqual(api.VEHICLE_KINDS.filter(api.hasBombLoad), ['bomber', 'tu160']);
assert.deepEqual(cfg.afterburners, []); assert.deepEqual(cfg.spinners, []); assert.equal(cfg.doors, undefined);
assert.equal(cfg.controls.length, 3); assert.deepEqual(cfg.controls, d.controls);
assert(d.frozen_nodes.every(n => !cfg.pivots.includes(n) && !cfg.controls.some(c => c.node === n)));
assert.deepEqual(cfg.stores, [{ weapons: [[1, 0]], order: Array.from({ length: 8 }, (_, i) => `bomb_${i + 1}`) }]);
const spawn = { position: [0, 3000, 0], yaw: 0, onGround: false };
const world = { groundHeight: () => 1, onRunway: () => true, half: 1000000, ceiling: 10000 };
const entity = (mod, kind, id = kind, team = 0, position = [0, 5000, 0]) => ({ id, kind, team, alive: true,
  flight: mod.createFlightState(kind, { position: [...position], yaw: 0, onGround: false }), hp: mod.VEHICLES[kind].maxHp, maxHp: mod.VEHICLES[kind].maxHp,
  seats: [`${id}-pilot`, `${id}-officer`], aim: [null, null], weapons: mod.createWeapons(kind),
  flareCount: 10, flaresReadyAt: 0, abilityReadyAt: 0, spottedUntil: 0, lastDamagedBy: null, spawnedAt: 0 });
const input = { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false };
const near = (a, b, label = 'point') => assert(new T.Vector3(...a).distanceTo(new T.Vector3(...b)) < 1e-4, `${label}: ${a} != ${b}`);
function audioSignature(mod, kind) {
  const values = [], nodes = [];
  const node = () => {
    const n = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
    const index = nodes.push(n) - 1;
    for (const key of ['gain', 'frequency', 'detune', 'playbackRate', 'Q', 'positionX', 'positionY', 'positionZ'])
      n[key] = { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { assert(Number.isFinite(value)); this.value = value; values.push([index, key, value]); } };
    return n;
  };
  const ctx = { currentTime: 0, createGain: node, createBiquadFilter: node, createPanner: node, createOscillator: node, createBufferSource: node };
  const core = { ctx, now: 0, engineBus: node(), bank: { pink: {}, brown: {}, rotor: {} }, hrtfInUse: 0, distanceTo: () => 0, doppler: () => 1 };
  const me = entity(mod, kind), voice = new mod.EngineVoice(core, 'audio-fixture', kind, me);
  if (kind === 'tu160') assert.equal(voice.burner, null);
  for (const throttle of [0, .5, 1]) { me.flight.throttle = throttle; core.now += .1; voice.update(me, true, false); }
  voice.release(); assert(voice.dying && Number.isFinite(voice.stopAt)); voice.dispose();
  assert(nodes.filter(n => n.started).every(n => n.stopped)); assert.equal(core.hrtfInUse, 0);
  return values;
}
for (const kind of old.VEHICLE_KINDS) {
  assert.deepEqual(api.VEHICLES[kind], old.VEHICLES[kind]); assert.deepEqual(api.CONFIG[kind], old.CONFIG[kind]);
  assert.equal(api.ENGINE_REF[kind], old.ENGINE_REF[kind]); assert.equal(api.ENGINE_LOUDNESS[kind], old.ENGINE_LOUDNESS[kind]);
  assert.deepEqual(audioSignature(api, kind), audioSignature(old, kind), `${kind}: actual voice parity`);
  const a = api.createFlightState(kind, spawn), b = old.createFlightState(kind, spawn);
  for (let tick = 0; tick < 100; tick++) {
    const fi = { ...api.NEUTRAL_INPUT, pitch: .15, yaw: .2, roll: tick < 30 ? .2 : 0, boost: tick > 60 };
    api.stepFlight(a, fi, 1 / 60, world); old.stepFlight(b, fi, 1 / 60, world); assert.deepEqual(a, b);
  }
  for (const method of ['cockpitBody', 'chaseBody', 'gunner', 'bombsight']) {
    const a = new api.CameraRig(new T.PerspectiveCamera()), b = new old.CameraRig(new T.PerspectiveCamera());
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0] : method === 'chaseBody' ?
      [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 1] :
      [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, -1, 0), 2];
    // gunner's final argument is an optional Object3D anchor, not zoom.
    if (method === 'gunner') args.pop();
    a[method](...args); b[method](...args); assert.deepEqual(a.pos.toArray(), b.pos.toArray()); assert.deepEqual(a.quat.toArray(), b.quat.toArray());
  }
}
assert.notDeepEqual(audioSignature(api, 'tu160'), audioSignature(api, 'bomber'));
console.log('PASS old24 specs/rigs/WEAPONS/audio/cameras and 2400 focused flight ticks exact to1b652d1b; Tu160 distinct heavy jet/audio, no burner');
for (const kind of api.VEHICLE_KINDS) {
  assert(Number.isFinite(api.ARMOR[kind]) && api.ARMOR[kind] > 0, `${kind}: mandatory armor`);
  const attacker = entity(api, 'fighter', 'attacker'), victim = entity(api, kind, 'victim', 1, [0, 5000, -120]);
  const cs = api.createCombatState(); cs.ships = {}; cs.turrets = [];
  for (let tick = 0; tick < 60; tick++) {
    api.applySeatInput(cs, attacker, 0, input, [attacker, victim], 100 + tick / 60, []);
    api.stepCombat(cs, [attacker, victim], 1 / 60, 100 + tick / 60, []); assert(Number.isFinite(victim.hp));
  }
  assert(victim.hp < victim.maxHp, `${kind}: incoming actual damage`);
  assert.equal(api.chooseBotVehicle({ team: 0 }, [], [], () => .4, [kind]), kind);
}
console.log('PASS exact25 registry=original7+17fighters+Tu160, helis absent; all25 finite incoming native cannon damage');
// Real old API includes the pinned combat.ts, not current combat masquerading as a preimage.
for (const yaw of [0, .7]) {
  const a = entity(api, 'bomber'), b = entity(old, 'bomber');
  a.flight.orientation = b.flight.orientation = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
  const ca = api.createCombatState(), cb = old.createCombatState(); ca.ships = {}; cb.ships = {}; ca.turrets = []; cb.turrets = [];
  const ea = [], eb = [];
  assert.equal(a.weapons[0][0], a.weapons[1][0]); assert.equal(b.weapons[0][0], b.weapons[1][0]);
  for (let i = 0; i < 8; i++) {
    const now = 100 + i * 2, seat = i % 2;
    api.applySeatInput(ca, a, seat, input, [a], now, ea); old.applySeatInput(cb, b, seat, input, [b], now, eb);
    api.applySeatInput(ca, a, 1 - seat, input, [a], now, ea); old.applySeatInput(cb, b, 1 - seat, input, [b], now, eb);
    assert.equal(ca.projectiles.length, i + 1); assert.equal(a.weapons[0][0].ammo, 7 - i);
    assert.deepEqual(ca, cb); assert.deepEqual(ea, eb); assert.deepEqual(a, b);
  }
  for (let tick = 0; tick < 180; tick++) {
    api.stepCombat(ca, [a], 1 / 60, 116 + tick / 60, ea); old.stepCombat(cb, [b], 1 / 60, 116 + tick / 60, eb);
    assert.deepEqual(ca, cb); assert.deepEqual(ea, eb); assert.deepEqual(a, b);
  }
}
// Native terrain/ship obstruction + splash, with a genuinely released old B2 bomb.
for (const position of [[0, 4, 0], [1000, 4, 1000]]) {
  const a = entity(api, 'bomber', 'bomber', 0, position), b = entity(old, 'bomber', 'bomber', 0, position);
  a.flight.velocity = b.flight.velocity = [0, 0, 0];
  const va = entity(api, 'fighter', 'splash', 1, position), vb = entity(old, 'fighter', 'splash', 1, position);
  const ca = api.createCombatState(), cb = old.createCombatState(); ca.ships = {}; cb.ships = {}; ca.turrets = []; cb.turrets = [];
  const ea = [], eb = [];
  api.applySeatInput(ca, a, 0, input, [a, va], 100, ea); old.applySeatInput(cb, b, 0, input, [b, vb], 100, eb);
  for (let tick = 0; tick < 240 && ca.projectiles.length; tick++) {
    api.stepCombat(ca, [a, va], 1 / 60, 100 + tick / 60, ea); old.stepCombat(cb, [b, vb], 1 / 60, 100 + tick / 60, eb);
    assert.deepEqual(ca, cb); assert.deepEqual(ea, eb); assert.deepEqual(va, vb);
  }
  assert.equal(ca.projectiles.length, 0); assert(ea.some(e => e.type === 'explosion')); assert(va.hp < va.maxHp);
}
console.log('PASS old B2 eight alternating-seat drops/shared cadence/velocity/ammo/regen plus actual obstruction/splash exact to pinned old combat API');
const models = git('ls-tree', '-r', '--name-only', pin, prefix + 'models').toString().trim().split('\n').filter(p => p.endsWith('.glb'));
assert.equal(models.length, 66);
const receipts = ['named', 'expanded', 'six-aircraft', 'four-vessel', 'eight-aircraft', 'five-vessel', 'ten-aircraft', 'twelve-aircraft', 'six-vessel', 'thirteen-aircraft', 'fourteen-aircraft', 'fifteen-aircraft', 'sixteen-aircraft'].map(n => `docs/wings-local-native/${n}-coalition-flight.json`);
const protectedPaths = [...models, ...receipts, 'docs/wings-local-native/declared-rafale-yak-flight.json',
  ...git('ls-tree', '-r', '--name-only', pin, prefix + 'authoring/supplied-helicopters').toString().trim().split('\n'),
  prefix + 'authoring/native-fighter-pair.json', prefix + 'authoring/extended-escort-models.json'];
for (const path of protectedPaths) assert.deepEqual(readFileSync(resolve(repo, path)), prior(path), `${path}: preserved bytes`);
assert.equal(Object.keys(JSON.parse(readFileSync(resolve(base, 'authoring/extended-escort-models.json'))).models).length, 8);
console.log('PASS all66 older GLBs/17fighter/8fleet entries/13random+declared receipts/helicopter blocker+quarantine byte-exact');
const saved = { fetch: globalThis.fetch, self: globalThis.self, bitmap: globalThis.createImageBitmap };
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
  const load = async view => { const deadline = performance.now() + 10000; while (!view.ready && performance.now() < deadline) await delay(1); assert(view.ready, 'actual template ready'); };
  const bones = view => view.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones;
  for (const kind of old.VEHICLE_KINDS) {
    const a = api.createAircraftView(kind, 0, 'low'), b = old.createAircraftView(kind, 0, 'low');
    try {
      await load(a); await load(b);
      const me = entity(api, kind), camera = new T.PerspectiveCamera(); camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true);
      a.setLocal(true); b.setLocal(true);
      for (const rates of [[0, 0, 0], [100, -100, 100], [-100, 100, -100], [.17, -.23, -.31], [0, 0, 0]]) {
        me.flight.angularVelocity = rates;
        for (let tick = 0; tick < 30; tick++) { a.update(me, [], 1 / 60, camera); b.update(me, [], 1 / 60, camera); }
        bones(a).forEach((bone, i) => {
          assert.equal(bone.name, bones(b)[i].name); assert.deepEqual(bone.position.toArray(), bones(b)[i].position.toArray());
          assert.deepEqual(bone.scale.toArray(), bones(b)[i].scale.toArray()); assert(bone.quaternion.angleTo(bones(b)[i].quaternion) < 1e-7);
        });
      }
    } finally { a.dispose(); b.dispose(); }
  }
  console.log('PASS old24 actual GLTF/native bone rest/signed/mixed/return poses exact to1b652d1b');
  const bytes = readFileSync(resolve(base, d.file)); assert.equal(bytes.length, 199816); assert.equal(hash(bytes), d.sha256);
  assert.equal(hash(readFileSync(resolve(base, 'models/supplied/tu-160.glb'))), d.source_sha256);
  const raw = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''); raw.scene.updateMatrixWorld(true);
  const box = new T.Box3(), vertex = new T.Vector3();
  raw.scene.traverse(m => { if (m.isMesh) { const p = m.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) box.expandByPoint(vertex.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)); } });
  near(box.min.toArray(), d.bounds.min); near(box.max.toArray(), d.bounds.max);
  let rawTri = 0; raw.scene.traverse(m => { if (m.isMesh) rawTri += m.geometry.index.count / 3; }); assert.equal(rawTri, 3724);
  const view = api.createAircraftView('tu160', 0, 'low'); await load(view); view.setLocal(true);
  try {
    const me = entity(api, 'tu160'), camera = new T.PerspectiveCamera(); camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true);
    const update = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) view.update(me, [], dt, camera); view.root.updateMatrixWorld(true); };
    update();
    const model = view.root.getObjectByName('model'), meshes = model.children.filter(m => m.isSkinnedMesh), bs = bones(view);
    const bone = name => { const b = bs.find(b => b.name === name); assert(b, name); return b; };
    assert.equal(api.aircraftStats('tu160').triangles, rawTri); assert(!meshes.some(m => /flame|afterburner/.test(m.name)));
    assert(d.frozen_nodes.every(n => !bs.some(b => b.name === n)), 'frozen source sweep baked, not animated');
    const cores = meshes.filter(m => m.name === 'glow'); assert(cores.length > 0);
    const coreSignature = () => [cores.map(m => m.material.color.toArray()), d.exhausts.map(e => [bone(e.node).position.toArray(), bone(e.node).quaternion.toArray(), bone(e.node).scale.toArray()])];
    const coreRest = coreSignature();
    let mapped = 0;
    raw.scene.traverse(m => {
      if (!m.isMesh || !m.material.map) return;
      mapped++;
      const s = m.material, dest = meshes.find(m => m.material.map && m.material.color.equals(s.color) && m.material.roughness === s.roughness && m.material.metalness === s.metalness);
      assert(dest, 'actual PBR body');
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
        assert.equal(!!dest.material[key], !!s[key]); if (s[key]) assert.equal(dest.material[key].image.sha256, s[key].image.sha256);
      }
      const sourceUV = m.geometry.getAttribute('uv'), targetUV = dest.geometry.getAttribute('uv'); assert(targetUV);
      const set = new Set(Array.from({ length: targetUV.count }, (_, i) => `${targetUV.getX(i)},${targetUV.getY(i)}`));
      for (let i = 0; i < sourceUV.count; i++) assert(set.has(`${sourceUV.getX(i)},${sourceUV.getY(i)}`));
    }); assert(mapped > 0);
    for (const q of [[0, 0, 0, 1], new T.Quaternion().setFromEuler(new T.Euler(.15, .7, -.12)).toArray()]) {
      me.flight.orientation = q; update();
      const transform = p => new T.Vector3(...p).applyQuaternion(new T.Quaternion(...q)).add(new T.Vector3(...me.flight.position)).toArray();
      for (let i = 0; i < 8; i++) {
        near(raw.scene.getObjectByName(`bomb_${i + 1}_release`).getWorldPosition(new T.Vector3()).toArray(), d.hardpoints.bombs[i]);
        near(view.anchors.get(`bomb_${i + 1}`).getWorldPosition(new T.Vector3()).toArray(), transform(d.hardpoints.bombs[i]));
        near(api.bombReleasePosition(me, 8 - i, [0, 0, 0]), transform(d.hardpoints.bombs[i]));
      }
      for (const e of d.exhausts) near(view.anchors.get(e.anchor).getWorldPosition(new T.Vector3()).toArray(), transform(e.position));
      const rig = new api.CameraRig(new T.PerspectiveCamera()); rig.cockpitBody(1 / 60, 'tu160', me.flight.position, q, 0, 0); near(rig.pos.toArray(), transform(d.cockpit));
    }
    // Signed tetrahedron volume integration of each generated store, not a guessed node center.
    for (let i = 0; i < 8; i++) {
      let volume = 0; const sum = new T.Vector3();
      raw.scene.getObjectByName(`bomb_${i + 1}`).traverse(m => {
        if (!m.isMesh) return;
        const p = m.geometry.getAttribute('position'), idx = m.geometry.index;
        for (let k = 0; k < idx.count; k += 3) {
          const a = new T.Vector3().fromBufferAttribute(p, idx.getX(k)).applyMatrix4(m.matrixWorld);
          const b = new T.Vector3().fromBufferAttribute(p, idx.getX(k + 1)).applyMatrix4(m.matrixWorld);
          const c = new T.Vector3().fromBufferAttribute(p, idx.getX(k + 2)).applyMatrix4(m.matrixWorld);
          const v = a.dot(new T.Vector3().crossVectors(b, c)) / 6;
          volume += v; sum.add(a.add(b).add(c).multiplyScalar(v / 4));
        }
      });
      assert(Math.abs(volume) > 1e-4); near(sum.divideScalar(volume).toArray(), d.hardpoints.bombs[i], 'generated volume centroid');
    }
    assert.equal(new Set(d.hardpoints.bombs.map(p => p.join(','))).size, 8);
    for (const name of cfg.stores[0].order) assert(bs.some(b => b.name === name));
    me.flight.orientation = [0, 0, 0, 1]; update();
    const rest = d.controls.map(c => bone(c.node).quaternion.clone());
    for (const rates of [[100, 0, 0], [-100, 0, 0], [0, 100, 0], [0, -100, 0], [0, 0, 100], [.12, -.08, .3], [0, 0, 0]]) {
      me.flight.angularVelocity = rates; update(180);
      d.controls.forEach((c, i) => {
        const rate = rates[c.driver === 'pitch' ? 0 : c.driver === 'yaw' ? 1 : 2], angle = Math.max(-c.max_rad, Math.min(c.max_rad, rate * c.gain));
        const expected = rest[i].clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(c.axis === 'x' ? 1 : 0, c.axis === 'y' ? 1 : 0, c.axis === 'z' ? 1 : 0), angle));
        assert(bone(c.node).quaternion.angleTo(expected) < 1e-5);
      });
      assert(bone('tailplane_L').quaternion.angleTo(bone('tailplane_R').quaternion) < 1e-5, 'real symmetric pitch');
    }
    for (const local of [true, false, true]) for (const boost of [false, true]) for (const throttle of [0, 1]) {
      view.setLocal(local); view.setBoost(boost); me.flight.throttle = throttle; update(60); update(1, 0); assert.deepEqual(coreSignature(), coreRest);
    }
    view.setLocal(true);
    const cs = api.createCombatState(); cs.ships = {}; cs.turrets = []; const events = [];
    assert.equal(me.weapons[0][0], me.weapons[1][0]);
    for (let i = 0; i < 8; i++) {
      const now = 100 + i * 2, origin = api.bombReleasePosition(me, 8 - i, [0, 0, 0]), seat = i % 2;
      api.applySeatInput(cs, me, seat, input, [me], now, events); api.applySeatInput(cs, me, 1 - seat, input, [me], now, events);
      assert.equal(cs.projectiles.length, i + 1); near(cs.projectiles[i].position, origin); assert.deepEqual(cs.projectiles[i].velocity, me.flight.velocity);
      assert.equal(cs.projectiles[i].owner, me.seats[seat]); assert.equal(me.weapons[0][0].ammo, 7 - i); assert.equal(me.weapons[1][0].ammo, 7 - i);
      update(); assert.equal(cfg.stores[0].order.filter(n => bone(n).scale.x > .9).length, 7 - i);
    }
    assert.equal(events.filter(e => e.type === 'fire').length, 8);
    // Regen delay and one magazine clock. 7.5s regenerates exactly one round, not two.
    const regen = api.createCombatState(); regen.ships = {}; regen.turrets = [];
    api.stepCombat(regen, [me], 1, 115, []); assert.equal(me.weapons[0][0].ammo, 0);
    for (let n = 1; n <= 8; n++) { api.stepCombat(regen, [me], 7.5, 130 + n * 7.5, []); update(); assert.equal(me.weapons[0][0].ammo, n); assert.equal(cfg.stores[0].order.filter(s => bone(s).scale.x > .9).length, n); }
    const rig = new api.CameraRig(new T.PerspectiveCamera());
    for (const method of ['chaseBody', 'bombsight']) {
      if (method === 'chaseBody') { rig.chaseBody(1 / 60, 'tu160', me.flight.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 1); near(rig.pos.toArray(), [0, 5000 + d.bounds.max[1] + 6, (d.bounds.max[2] - d.bounds.min[2]) * 1.6 * (1 + 150 / 900)]); }
      else { rig.bombsight(1 / 60, 'tu160', me.flight.position, [0, 0, 0, 1], new T.Vector3(0, -1, 0), 2); near(rig.pos.toArray(), [0, 5000 + d.bounds.min[1] - 1.5, -6]); }
      assert([...rig.pos.toArray(), ...rig.quat.toArray()].every(Number.isFinite));
    }
    me.alive = false; update(); assert(!view.root.visible); view.setLocal(false); update(); assert(!view.root.visible);
    me.alive = true; me.flight.angularVelocity = [100, -100, 0]; me.weapons[0][0].ammo = 0; update(180);
    const clean = entity(api, 'tu160'); for (let i = 0; i < 180; i++) view.update(clean, [], 1 / 60, camera);
    assert.deepEqual(coreSignature(), coreRest); d.controls.forEach((c, i) => assert(bone(c.node).quaternion.angleTo(rest[i]) < 1e-5));
    assert(cfg.stores[0].order.every(n => bone(n).scale.x > .9));
    console.log('PASS Tu160 actual GLTF/PBR/UV/PNG metadata; raw2924 derived/native3724tri; three signed controls/symmetric tail/rest, frozen sweep, four invariant warm cores; eight rotated release identities/shared rounds/store depletion+regen; cameras/death/leave/reset');
    console.log('STATS ' + JSON.stringify(api.aircraftStats('tu160')));
    view.dispose(); view.update(clean, [], 1 / 60, camera); assert(!view.ready && view.root.children.length === 0);
    const stale = api.createAircraftView('tu160', 0, 'low'); stale.dispose(); await delay(1); assert(!stale.ready && !stale.root.children.length);
  } finally { view.dispose(); }
} finally { globalThis.fetch = saved.fetch; globalThis.self = saved.self; globalThis.createImageBitmap = saved.bitmap; }
for (const boost of [false, true]) {
  const s = api.createFlightState('tu160', { position: [0, 5, 0], yaw: 0, onGround: true });
  for (let tick = 0; tick < 1800; tick++) {
    api.stepFlight(s, { ...api.NEUTRAL_INPUT, throttle: 1, boost, pitch: tick > 240 ? .25 : 0 }, 1 / 60, world);
    if (tick === 59) { assert(s.onGround && !s.crashed); console.log(`ACCEL boost=${boost} speed=${Math.hypot(...s.velocity).toFixed(6)}`); }
  }
  assert(!s.crashed && !s.onGround && s.position[1] > 50);
  console.log(`TAKEOFF boost=${boost} y=${s.position[1].toFixed(6)} speed=${Math.hypot(...s.velocity).toFixed(6)}`);
}
const turn = api.createFlightState('tu160', spawn), fighter = api.createFlightState('fighter', spawn);
for (let tick = 0; tick < 120; tick++) for (const s of [turn, fighter]) api.stepFlight(s, { ...api.NEUTRAL_INPUT, yaw: .5, pitch: .1 }, 1 / 60, world);
assert(!turn.crashed && Math.abs(turn.angularVelocity[1]) < Math.abs(fighter.angularVelocity[1]));
const stall = api.createFlightState('tu160', spawn); stall.velocity = [0, 0, -10]; assert(api.isStalled(stall));
for (let i = 0; i < 60; i++) api.stepFlight(stall, api.NEUTRAL_INPUT, 1 / 60, world);
assert(stall.velocity.every(Number.isFinite)); stall.position = [0, 1, 0]; stall.velocity = [0, -50, 0]; api.stepFlight(stall, api.NEUTRAL_INPUT, 1 / 60, world); assert.equal(stall.crashed, 'terrain');
assert.equal(api.createFlightState('tu160', spawn).crashed, null);
const me = entity(api, 'tu160'), bot = { id: me.seats[0], team: 0, seat: 0 };
const ordinary = api.createBotBrain(232); api.botInput(ordinary, bot, me, [me], 100); assert.equal(ordinary.state.phase, 'strike');
const factions = api.createBotBrain(232), safeTargets = [{ id: 'declared', team: 1, kind: 'surface', capital: true, position: [100, 0, 100], aimPosition: [100, 1, 100] }];
const out = api.botInput(factions, bot, me, [me], 100, [], world, {}, [], true, safeTargets); assert.notEqual(factions.state.phase, 'strike'); assert(!out.seat.firePrimary);
console.log('PASS normal+boost noncatapult acceleration/takeoff, heavy turn/stall/crash/reset; ordinary bomber AI, Factions bombstrike remains unimplemented');
// Native drop rejection gates, without changing the weapon or granting flight stats.
for (const blocked of ['protected', 'dead', 'empty', 'cooldown']) {
  const v = entity(api, 'tu160'), cs = api.createCombatState();
  if (blocked === 'protected') v.spawnedAt = 100;
  if (blocked === 'dead') v.alive = false;
  if (blocked === 'empty') v.weapons[0][0].ammo = 0;
  if (blocked === 'cooldown') v.weapons[0][0].readyAt = 101;
  api.applySeatInput(cs, v, 0, input, [v], 100, []); assert.equal(cs.projectiles.length, 0, blocked);
}
console.log('PASS real native bomb gate rejects spawn protection/dead/empty/shared cooldown');
const ui = readFileSync(resolve(src, 'ui/game.ts'), 'utf8');
assert(!ui.includes('kind === "bomber"')); assert.match(ui, /hasBombLoad\(this\.myVehicle\(\)\?\.kind\)/); assert.match(ui, /hasBombLoad\(myVehicle\?\.kind\)/);
assert.match(ui, /bombImpactPoint\(this\.bombOrigin\(v\), vel/); assert.match(ui, /bombReleasePosition\(v, v\.weapons\[0\]\[0\]\.ammo/);
assert.match(ui, /!VEHICLES\[v\.kind\]\.stealth \? null/);
// Execute actual HUD methods and the actual key-handler body with bounded CPU host fixtures.
const keyBody = ui.match(/private onKeyDown = \(e: KeyboardEvent\) => \{([\s\S]*?)\n  \}\n\n  private exit/)[1];
const uiResult = await build({ stdin: { contents: ui.replace('class GameSession implements', 'export class GameSession implements') +
  `\nexport function keyFixture(e: KeyboardEvent) {${keyBody}\n}`, resolveDir: resolve(src, 'ui'), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, minify: true, plugins: [threePlugin(), { name: 'cpu-ui-host', setup(es) {
    es.onResolve({ filter: /^\.\.?\// }, args => {
      if (args.resolveDir === resolve(src, 'ui') && !args.path.startsWith('../sim/')) return { path: args.path, namespace: 'ui-host' };
    });
    es.onLoad({ filter: /.*/, namespace: 'ui-host' }, () => ({ contents:
      `export const TEAM_COLORS=['#000000'], TEAM_NAMES=['A','B'], BOMBSIGHT_CONE=1, RETICLE_LIMIT=1, settings={};\n` +
      ['createAircraftView','syncAircraftInput','createHud','setScoreboard','Input','getNet','createSpawnScreen','createPauseMenu','toast','onSettings','shipById','shipName','prepareLocalFactions'].map(n => `export function ${n}(){}`).join('\n'), loader: 'js' }));
  } }], define: { 'import.meta.env.BASE_URL': '"./"' } });
const uiApi = await import(`data:text/javascript;base64,${Buffer.from(uiResult.outputFiles[0].contents).toString('base64')}`);
for (const kind of ['tu160', 'bomber']) for (const seat of [0, 1]) {
  const v = entity(api, kind), session = Object.create(uiApi.GameSession.prototype);
  const frame = { weapons: [] }, hud = { update() {}, chatOpen: () => false };
  Object.assign(session, { hudFrame: frame, me: { id: v.seats[seat], team: 0, seat, vehicleId: v.id }, state: 'flying', pred: null,
    localFleet: null, flightWorld: world, shipStates: [], renderList: [], hud, input: { freeLook: false, zoomHeld: false, bombsight: seat === 1, mouseMode: 'aim', reticleMode: false, steeringBomb: false },
    deps: { host: { rig: { gunZoom: 2 }, setSpeedFx() {}, setFocus() {} }, audio: null }, view: 'chase', sentFlight: { boost: false }, offline: true,
    aim: [0, -1, 0], weaponsBuf: [{}, {}], bombFall: null, bombPeek: false, latestById: new Map([[v.id, v]]), aaFiredAt: -Infinity });
  const vis = { render: v, pos: v.flight.position, quat: v.flight.orientation };
  const snap = { time: 100, scores: [], missiles: [], projectiles: [] };
  session.updateHud(snap, vis, 100);
  assert(frame.bombSight && frame.bombSight.bombs === 8 && frame.bombSight.pilot === (seat === 0));
  const expected = [0, 0, 0], origin = kind === 'tu160' ? api.bombReleasePosition(v, 8, [0, 0, 0]) : v.flight.position;
  api.bombImpactPoint(origin, v.flight.velocity, expected, world); near(frame.bombImpact, expected, 'actual HUD predicted release');
  assert.equal(frame.stealth !== null, kind === 'bomber');
  uiApi.keyFixture.call(session, { code: 'KeyB', key: 'b', repeat: false }); assert.equal(session.bombPeek, seat === 0);
  session.bombFall = { id: 1, pos: [0, 100, 0], vel: [0, -10, -50] }; session.updateHud(snap, vis, 100); assert(frame.bombCam);
}
console.log('PASS actual retained GameSession HUD/key body: both seats eight rounds, Tu160 precise release-origin impact/no stealth, B2 retained stealth, pilot KeyB peek, falling-bomb HUD');
const compiled = await build({ entryPoints: [resolve(src, 'main.ts'), resolve(src, 'render/aircraft-preview/main.ts')], outdir: 'in-memory',
  bundle: true, platform: 'browser', format: 'esm', write: false, plugins: [threePlugin(false)], loader: { '.css': 'empty' }, define: { 'import.meta.env.BASE_URL': '"./"' } });
assert.equal(compiled.outputFiles.length, 2); assert(compiled.outputFiles.every(f => f.contents.length > 0));
console.log(`PASS actual main/preview write:false compilation ${compiled.outputFiles.map(f => f.contents.length).join('/')}B; bomb UI/peek/predicted-origin/stealth source guards`);
console.log('HOLD native pixels/input/listening/human/FPS/rights. Heightfield origin contact is not full-span runway wing-collision proof. No full-pool random run or historical159300-tick rerun claimed.');
