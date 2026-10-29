// Actual safe-frame callback, rig roots and HUD projection helper. CPU only, no pixel claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const three = resolve(process.env.THREE_ROOT), manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
const T = await import(pathToFileURL(resolve(three, 'build/three.webgpu.js')));
const { build } = await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT, 'lib/main.js')));
const src = resolve(root, 'Games/Wings/source/games/wings/src');
const aliases = { name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
    const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    if (typeof target === 'object') target = target.import;
    assert.equal(typeof target, 'string'); return { path: resolve(three, target) };
  });
} };
const options = { bundle: true, write: false, outdir: 'in-memory-hud-check', format: 'esm', minify: true, legalComments: 'none',
  define: { 'import.meta.env.BASE_URL': '"./"', 'import.meta.env.DEV': 'false' } };
const compiled = await build({ ...options, platform: 'browser', entryPoints: [resolve(src, 'main.ts')], plugins: [aliases] });
assert(compiled.outputFiles[0].contents.length > 0);
console.log(`PASS actual main.ts compile write:false (${compiled.outputFiles[0].contents.length} in-memory bytes)`);
const entry = resolve(src, 'ui/local-factions.ts');
const bridge = resolve(root, 'Games/Wings/authoring/retained-host-bridge.mjs');
const result = await build({ ...options, platform: 'node', stdin: { resolveDir: root, contents:
  `export * from ${JSON.stringify(entry)}; export * from ${JSON.stringify(resolve(src, 'ui/fleet-hud-targets.ts'))}; export {shipHasAAMounts} from ${JSON.stringify(resolve(src, 'sim/fleet.ts'))};` },
  plugins: [{ name: 'manual-room-and-glb-fixture', setup(api) {
    api.onResolve({ filter: /^three\/addons\/loaders\/GLTFLoader\.js$/ }, () => ({ path: 'loader', namespace: 'fixture' }));
    api.onResolve({ filter: /^\.\.\/sim\/loopback$/ }, args => args.importer === entry ? { path: 'room', namespace: 'fixture' } : undefined);
    api.onResolve({ filter: /retained-host-bridge\.mjs$/ }, args => args.importer === entry ? { path: 'bridge', namespace: 'fixture' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: root, contents:
      args.path === 'loader' ? 'export class GLTFLoader { parseAsync(b) { return globalThis.__hudParse(b) } }' : args.path === 'room' ?
        `import {createLoopbackRoom as actual} from ${JSON.stringify(resolve(src, 'sim/loopback.ts'))};
         export function createLoopbackRoom(c,n,h,o) { return globalThis.__hudRoom=actual(c,n,h,{...o,manual:true}) }` :
        `import {createRetainedHostBridge as actual} from ${JSON.stringify(bridge)};
         export function createRetainedHostBridge(o) { globalThis.__hudPublish=o.onSnapshot; return actual(o) }` }));
  } }, aliases] });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const saved = new Map(['location', 'fetch', '__hudParse', '__hudRoom', '__hudPublish'].map(k => [k, globalThis[k]]));
let local;
try {
  globalThis.location = { href: 'http://127.0.0.1/' };
  globalThis.fetch = async url => {
    const p = new URL(url); assert.equal(p.origin, 'http://127.0.0.1');
    assert.match(p.pathname, /^\/models\/derived\/[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(root, 'Games/Wings', p.pathname.slice(1))));
  };
  globalThis.__hudParse = async bytes => { const { object } = modelGeometryFixture(T, bytes); return { scene: object, scenes: [object] }; };
  const scene = new T.Scene();
  local = await api.prepareLocalFactions({ scene, quality: 'low', effects: { setFleetFrame() {}, fleetStats() { return {} } } });
  assert.deepEqual(local.safeTargets(), []);
  local.connect('HUD CPU', { onMessage() {} });
  const room = globalThis.__hudRoom; room.step(1 / 60);
  const frame = structuredClone(local.debug().frame), targets = local.safeTargets();
  assert.equal(targets.length, 2);
  assert(Object.isFrozen(targets) && Object.isFrozen(targets[0]) && Object.isFrozen(targets[0].position));
  const native = [{ id: 'native-carrier', position: [4000, 30, 4200], kind: 'carrier' }];
  assert.strictEqual(api.fleetHudCollection(undefined, () => native), native, 'ordinary collection unchanged');
  const selected = api.fleetHudCollection(targets, () => { throw Error('Factions must not query native poses'); });
  const camera = new T.PerspectiveCamera(60, 1, 1, 20000);
  for (const target of selected) {
    const unit = frame.units.find(u => u.id === target.id);
    assert.deepEqual(target.position, unit.position);
    assert.deepEqual(scene.getObjectByName(`fleet-unit:${target.id}`).position.toArray(), target.position);
    assert.deepEqual(Object.keys(target).sort(), ['id', 'team', 'kind', 'capital', 'position', 'heading', 'hp', 'maxHp'].sort());
    camera.position.set(target.position[0], 100, target.position[2] + 1000);
    camera.lookAt(...target.position); camera.updateMatrixWorld(true);
    const marker = api.fleetHudMarker(target, camera.position.toArray(), 0);
    assert.deepEqual(marker.position, unit.position);
    const p = new T.Vector3(...marker.position).project(camera);
    assert(Math.abs(p.x) < 1e-8 && Math.abs(p.y) < 1e-8, 'marker projects at actual model root');
    assert.notDeepEqual(marker.position, native[0].position);
    assert.equal(marker.distance, Math.hypot(...unit.position.map((n, i) => n - camera.position.toArray()[i])));
    assert.match(marker.label, new RegExp(`^${target.team === 0 ? 'friendly' : 'enemy'} flagship `));
    assert(!marker.label.includes('carrier'));
    assert(marker.label.endsWith(` · ${Math.round(unit.hp / unit.maxHp * 100)}%`));
    const forward = new T.Vector3(0, 0, -1).applyQuaternion(new T.Quaternion(...unit.view.orientation));
    assert.equal(target.heading, Math.atan2(-forward.x, -forward.z));
    const horizontal = Math.hypot(forward.x, forward.z);
    assert(Math.abs(Math.sin(-target.heading) - forward.x / horizontal) < 1e-8, 'map icon forward follows actual rig, not mirrored navigation yaw');
    assert(Math.abs(-Math.cos(-target.heading) - forward.z / horizontal) < 1e-8);
  }
  const radarTarget = { ...targets[0], position: [100, 0, -100], heading: .3 };
  let radar = api.fleetHudRadar(radarTarget, [0, 0, 0], 0, 78, 3000);
  assert.equal(radar.x, 2.6); assert.equal(radar.y, -2.6); assert.equal(radar.rotation, -.3);
  radar = api.fleetHudRadar(radarTarget, [100, 0, -100], 1, 78, 3000);
  assert.equal(Math.hypot(radar.x, radar.y), 0); assert.equal(radar.rotation, -1.3);
  radar = api.fleetHudRadar({ ...radarTarget, position: [9000, 0, 0] }, [0, 0, 0], Math.PI / 2, 78, 3000);
  assert(Math.abs(radar.y + 78) < 1e-10 && Math.abs(radar.x) < 1e-10, 'bounded forward-up radar');
  // Execute the actual controller AA branch, including its pre-return stale-state reset.
  const game = readFileSync(resolve(src, 'ui/game.ts'), 'utf8');
  const reset = game.slice(game.indexOf('    if (this.localFleet) { f.aaDist'), game.indexOf('    f.turret = null', game.indexOf('    if (this.localFleet) { f.aaDist')));
  const aa = game.slice(game.indexOf('    let nearShip = Infinity'), game.indexOf('    const aimDist = 1500'));
  const updateAA = new Function('f', 'posedFleet', 'pos', 'v', 'AA_RANGE', 'shipHasAAMounts', reset + aa);
  const warning = { aaDist: 123, aaFire: true };
  updateAA.call({ localFleet: local }, warning, () => { throw Error('disabled native AA queried'); }, [0, 0, 0], { team: 0 }, 1000, api.shipHasAAMounts);
  assert.deepEqual(warning, { aaDist: null, aaFire: false });
  updateAA.call({ localFleet: null, aaFiredAt: performance.now() / 1000 }, warning,
    () => [{ team: 0, kind: 'carrier', position: [1, 0, 0] }, { team: 1, kind: 'escort', position: [0, 0, 10] },
      { team: 1, kind: 'destroyer', position: [0, 0, 500] }], [0, 0, 0], { team: 0 }, 1000, api.shipHasAAMounts);
  assert.deepEqual(warning, { aaDist: 500, aaFire: true }, 'ordinary native AA retained');
  assert.throws(() => { targets[0].position[0] = 1; }, TypeError);
  const publish = units => globalThis.__hudPublish(room.playerId, { ...frame, units });
  const enemy = frame.units.find(u => u.team === 1);
  publish(frame.units.filter(u => u.team === 0));
  assert(local.safeTargets().every(u => u.team === 0), 'hidden enemy removed, no cached ghost');
  publish([{ ...enemy, alive: false, hp: 0 }]); assert.deepEqual(local.safeTargets(), []);
  publish([{ ...enemy, kind: 'sub', depth: 'surfaced' }]); assert.deepEqual(local.safeTargets(), [], 'no invented submarine tracks');
  globalThis.__hudPublish(room.playerId, { ...frame, tick: frame.tick + 20, units: [] });
  assert.deepEqual(api.fleetHudCollection(local.safeTargets(), () => { throw Error('empty fallback'); }), []);
  publish(frame.units); assert.equal(local.safeTargets().length, 2, 'lower-tick reset restores current snapshot only');
  assert.equal(local.debug().seaFX.tick, frame.tick, 'actual view reset consumed');
  const clone = local.safeTargets(); frame.units[0].position[0] += 700;
  assert.notEqual(clone[0].position[0], frame.units[0].position[0], 'no snapshot handles');
  const many = Array.from({ length: 30 }, (_, i) => ({ ...enemy, id: `unit${i}` }));
  assert.equal(api.safeFleetHudTargets({ ...frame, units: many }).length, api.FLEET_HUD_LIMIT);
  assert.deepEqual(api.safeFleetHudTargets(null), []);
  assert.deepEqual(api.safeFleetHudTargets({ ...frame, mode: 'normal' }), []);
  assert.deepEqual(api.safeFleetHudTargets({ ...frame, units: [{ ...enemy, position: [NaN, 0, 0] }] }), []);
  local.dispose(); assert.deepEqual(local.safeTargets(), []); assert.equal(local.debug().seaFX.disposed, true);
  console.log('PASS safe callback -> actual rig roots -> HUD projection/distance/HP; ordinary native identity; privacy/death/sub/reset/leave; cap12; cloned read-only DTO; seaFX preserved (CPU, native unverified)');
} finally {
  local?.dispose();
  for (const [k, v] of saved) if (v === undefined) delete globalThis[k]; else globalThis[k] = v;
}
