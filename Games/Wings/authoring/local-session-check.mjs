// Executes actual local-factions.ts + real room/authority/rig. Loader/timer instrumentation is CPU-only.
// Mechanical aircraft poses and factor-only decoded GLBs do NOT prove native flight or texture rendering.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use existing exact external tools');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
assert.equal(JSON.parse(readFileSync(resolve(three, 'package.json'))).version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const THREE = await import(pathToFileURL(resolve(three, 'build/three.webgpu.js')));
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const entry = resolve(root, 'Games/Wings/source/games/wings/src/ui/local-factions.ts');
const roomPath = resolve(root, 'Games/Wings/source/games/wings/src/sim/loopback.ts');
const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm',
  write: false, minify: true, legalComments: 'none', define: { 'import.meta.env.BASE_URL': '"./"' },
  plugins: [{ name: 'explicit-cpu-instrumentation', setup(api) {
    api.onResolve({ filter: /^three\/addons\/loaders\/GLTFLoader\.js$/ }, () => ({ path: 'loader', namespace: 'fixture' }));
    api.onResolve({ filter: /^\.\.\/sim\/loopback$/ }, args => args.importer === entry ? { path: 'room', namespace: 'fixture' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: root, contents: args.path === 'loader'
      ? 'export class GLTFLoader { parseAsync(bytes, base) { return globalThis.__localParse(bytes, base) } }'
      : `import {createLoopbackRoom as actual} from ${JSON.stringify(roomPath)};
         export function createLoopbackRoom(config,name,handlers,options) {
           const room=actual(config,name,handlers,{...options,manual:true}); globalThis.__localRoom=room; return room;
         }` }));
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
      const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
      const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports)) {
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      }
      if (target && typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string', key);
      return { path: resolve(three, target) };
    });
  } }],
});
const oldLocation = globalThis.location, oldFetch = globalThis.fetch;
const oldParse = globalThis.__localParse, oldRoom = globalThis.__localRoom;
let local;
try {
  globalThis.location = { href: 'http://127.0.0.1/' };
  globalThis.fetch = async (...args) => {
    assert.equal(args.length, 1, 'native default fetch options');
    const url = new URL(args[0]);
    assert.equal(url.origin, globalThis.location.href.slice(0, -1));
    assert.equal(url.pathname, `/models/derived/${basename(url.pathname)}`);
    const bytes = readFileSync(resolve(root, 'Games/Wings/models/derived', basename(url.pathname)));
    return new Response(bytes);
  };
  globalThis.__localParse = async (bytes, base) => {
    assert(bytes instanceof ArrayBuffer);
    assert.equal(base, 'http://127.0.0.1/models/derived/');
    const { object } = modelGeometryFixture(THREE, bytes);
    return { scene: object, scenes: [object] };
  };
  const { prepareLocalFactions } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
  const host = { scene: new THREE.Scene() };
  local = await prepareLocalFactions(host);
  const connection = local.connect('Actual local adapter', { onMessage() {} });
  let room = globalThis.__localRoom;
  connection.send({ type: 'spawn', kind: 'fighter' });
  const plane = room.engine.vehicles[0];
  assert(plane && plane.seats[0] === room.playerId);
  for (let seq = 0; seq < 40; seq++) {
    Object.assign(plane.flight, { position: [1600, 4, 3146], velocity: [0, 0, -135],
      orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false, gearDown: false, crashed: null, throttle: .5 });
    plane.spawnedAt = -100;
    connection.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
    room.step(1 / 60);
  }
  let state = local.debug();
  const enemy = state.frame.units.find(unit => unit.id === 'enemy');
  assert(enemy.hp < 1000 && plane.weapons[0][0].ammo < 600);
  assert(local.objectives().find(unit => unit.team === 1).hp === enemy.hp);
  assert(local.hint().includes(String(Math.ceil(enemy.hp))));
  for (const model of state.models) {
    const unit = state.frame.units.find(unit => unit.id === model.id);
    assert(model.visible); assert.deepEqual(model.position, unit.position);
  }
  console.log(`PASS actual local session/player/authority/rig/HUD data: ammo ${plane.weapons[0][0].ammo}, enemy HP ${enemy.hp}`);
  local.setPaused(true); const tick = room.engine.tick; room.step(.25); assert.equal(room.engine.tick, tick);
  local.setPaused(false); room.step(1 / 60); assert.equal(room.engine.tick, tick + 1);
  connection.close(); local.dispose(); assert.equal(host.scene.children.length, 0);
  console.log('PASS actual local pause/resume and idempotent leave release all fleet scene roots');
  local = await prepareLocalFactions(host);
  local.connect('Fresh local session', { onMessage() {} }); room = globalThis.__localRoom;
  assert.equal(local.debug().roots, 1);
  for (let i = 0; i < 10800 && room.engine.matchEndedAt === null; i++) room.step(1 / 60);
  assert.notEqual(room.engine.matchEndedAt, null); assert(local.debug().frame.outcome);
  for (let i = 0; i < 902; i++) room.step(1 / 60);
  state = local.debug();
  assert.equal(state.generations, 2); assert.equal(state.roots, 1);
  assert(state.frame.units.every(unit => unit.hp === 1000 && unit.alive));
  assert(state.models.every(model => model.visible));
  local.dispose(); assert.equal(host.scene.children.length, 0);
  console.log('PASS actual local automatic capital outcome/15s reset reuses the view without snapshot-rewind faults');
  console.log('3 actual local session composition groups passed; CPU loader/timer instrumentation, not native GPU/input acceptance');
} finally {
  try { local?.dispose() } finally {
    globalThis.location = oldLocation; globalThis.fetch = oldFetch;
    if (oldParse === undefined) delete globalThis.__localParse; else globalThis.__localParse = oldParse;
    if (oldRoom === undefined) delete globalThis.__localRoom; else globalThis.__localRoom = oldRoom;
  }
}
