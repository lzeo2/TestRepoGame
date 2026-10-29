// Actual local Factions + manual native room + measured GLB CPU fixtures, not GPU/pixel proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools; install nothing');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const three = resolve(process.env.THREE_ROOT);
const T = await import(pathToFileURL(resolve(three, 'build/three.webgpu.js')));
const { build } = await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT, 'lib/main.js')));
const entry = resolve(root, 'Games/Wings/source/games/wings/src/ui/local-factions.ts');
const loopback = resolve(root, 'Games/Wings/source/games/wings/src/sim/loopback.ts');
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm',
  write: false, minify: true, legalComments: 'none', define: { 'import.meta.env.BASE_URL': '"./"' },
  plugins: [{ name: 'manual-room-and-factor-only-glb', setup(api) {
    api.onResolve({ filter: /^three\/addons\/loaders\/GLTFLoader\.js$/ }, () => ({ path: 'loader', namespace: 'fixture' }));
    api.onResolve({ filter: /^\.\.\/sim\/loopback$/ }, args => args.importer === entry ? { path: 'room', namespace: 'fixture' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: root,
      contents: args.path === 'loader' ? 'export class GLTFLoader { parseAsync(bytes) { return globalThis.__seaParse(bytes) } }'
        : `import {createLoopbackRoom as actual} from ${JSON.stringify(loopback)};
           export function createLoopbackRoom(c,n,h,o) { const r=actual(c,n,h,{...o,manual:true}); globalThis.__seaRoom=r; return r; }` }));
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
      const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      if (typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string'); return { path: resolve(three, target) };
    });
  } }],
});
const saved = new Map(['location', 'fetch', '__seaParse', '__seaRoom'].map(key => [key, globalThis[key]]));
let local;
try {
  globalThis.location = { href: 'http://127.0.0.1/' };
  globalThis.fetch = async url => {
    const parsed = new URL(url); assert.equal(parsed.origin, 'http://127.0.0.1');
    assert.match(parsed.pathname, /^\/models\/derived\/[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(root, 'Games/Wings', parsed.pathname.slice(1))));
  };
  globalThis.__seaParse = async bytes => { const { object } = modelGeometryFixture(T, bytes); return { scene: object, scenes: [object] }; };
  const { prepareLocalFactions } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
  const scene = new T.Scene(), caller = new T.Group(); caller.name = 'native-water-owner'; scene.add(caller);
  const host = { scene, quality: 'low', effects: { setFleetFrame() {}, fleetStats() { return {}; } } };
  local = await prepareLocalFactions(host); local.connect('CPU sea cues', { onMessage() {} });
  const room = globalThis.__seaRoom;
  let wake = false, smoke = false, fire = false, damaged = false, maxCounts = { foam: 0, smoke: 0, fire: 0 }, state;
  for (let i = 0; i < 10800 && room.engine.matchEndedAt === null; i++) {
    room.step(1 / 60); state = local.debug();
    if (!state.frame) continue;
    assert.equal(state.frame.units.length, 2, 'public two-unit contract');
    assert.equal(state.seaFX.tick, state.frame.tick); assert.equal(state.seaFX.seconds, state.frame.tick * .05);
    assert.equal(state.seaFX.counts.splashes, 0);
    assert.equal(scene.getObjectByName('authoritative-fleet-effects').children.length, 0, 'native events not duplicated');
    assert(!scene.getObjectByName('fleet-sea-water')); assert(!scene.getObjectByName('fleet-sea-splashes'));
    for (const key of Object.keys(maxCounts)) maxCounts[key] = Math.max(maxCounts[key], state.seaFX.counts[key]);
    wake ||= state.seaFX.counts.foam > 0; smoke ||= state.seaFX.counts.smoke > 0; fire ||= state.seaFX.counts.fire > 0;
    damaged ||= state.frame.units.some(u => u.hp < u.maxHp);
    for (const model of state.models) {
      assert.deepEqual(model.position, state.frame.units.find(u => u.id === model.id).position);
      assert.deepEqual(model.scale, [1, 1, 1]);
    }
    if (wake && !smoke && i === 180) {
      local.setPaused(true); const before = local.debug().seaFX; room.step(.25);
      assert.deepEqual(local.debug().seaFX, before); local.setPaused(false);
    }
  }
  assert(wake && damaged && smoke && fire); assert.notEqual(room.engine.matchEndedAt, null);
  console.log(`PASS actual host battle HP -> sea cues: ${JSON.stringify(maxCounts)}, outcome at ${room.engine.matchEndedAt}s (CPU)`);
  const frozen = local.debug().seaFX; assert(Object.isFrozen(frozen) && Object.isFrozen(frozen.counts));
  assert.throws(() => { frozen.counts.smoke = 999; }, TypeError);
  for (let i = 0; i < 902; i++) room.step(1 / 60);
  state = local.debug(); assert.equal(state.generations, 2);
  assert(state.frame.units.every(u => u.hp === u.maxHp)); assert.equal(state.seaFX.counts.smoke, 0); assert.equal(state.seaFX.counts.fire, 0);
  local.dispose(); local.dispose(); assert.deepEqual(scene.children, [caller]);
  assert.equal(local.debug().seaFX.disposed, true); assert.equal(local.debug().seaFX.counts.foam, 0);
  console.log('PASS host pause, automatic reset, read-only bounded counters, native owner isolation and cleanup; no GPU/pixel acceptance');
} finally {
  local?.dispose();
  for (const [key, value] of saved) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
}
