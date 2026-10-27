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
const effectsPath = resolve(root, 'Games/Wings/source/games/wings/src/render/effects.ts');
const result = await build({ stdin: { contents: `export {prepareLocalFactions} from ${JSON.stringify(entry)};
  export {createEffects} from ${JSON.stringify(effectsPath)};
  export {preloadAircraft, createAircraftView} from ${JSON.stringify(resolve(root, 'Games/Wings/source/games/wings/src/render/aircraft.ts'))};
  export {createLoopbackRoom} from ${JSON.stringify(roomPath)};`, resolveDir: root }, bundle: true, platform: 'node', format: 'esm',
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
    assert.match(url.pathname, /^\/models\/(?:derived\/)?[\w.-]+\.glb$/);
    const bytes = readFileSync(resolve(root, 'Games/Wings', url.pathname.slice(1)));
    return new Response(bytes);
  };
  globalThis.__localParse = async (bytes, base) => {
    assert(bytes instanceof ArrayBuffer);
    assert(['http://127.0.0.1/models/derived/', 'http://127.0.0.1/models/'].includes(base));
    const { object } = modelGeometryFixture(THREE, bytes);
    return { scene: object, scenes: [object] };
  };
  const { prepareLocalFactions, createEffects, createLoopbackRoom, preloadAircraft, createAircraftView } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
  const effects = createEffects('low'), camera = new THREE.PerspectiveCamera();
  const host = { scene: new THREE.Scene(), effects };
  // Deliberate CPU authority-event fixture, not a natural battle or pixel claim.
  const fxFixture = createEffects('low');
  const fixture = { tick: 20, round: 0, units: [{ id: 'ship', position: [100, 0, 100] }],
    projectiles: [{ id: 1, position: [100, 3, 100], velocity: [240, 0, 0] }],
    events: [{ id: 1, tick: 20, round: 0, type: 'fire', projectile: 1, position: [100, 3, 100] },
      { id: 2, tick: 20, round: 0, type: 'impact', unit: 'ship', position: [110, 3, 100] },
      { id: 3, tick: 20, round: 0, type: 'sunk', unit: 'ship' }] };
  fxFixture.setFleetFrame(fixture); fxFixture.update(.05, 1, camera);
  assert.equal(fxFixture.fleetStats().events, 3);
  fxFixture.setTracers(0, () => {});
  assert.equal(fxFixture.root.getObjectByName('combat-tracers').count, 1);
  fxFixture.update(.05, 1.05, camera); assert.equal(fxFixture.fleetStats().events, 3, 'no replayed FX');
  fxFixture.setFleetFrame({ ...fixture, tick: 60, events: [{ ...fixture.events[0], id: 4 }] });
  fxFixture.update(.05, 3, camera); assert.equal(fxFixture.fleetStats().events, 3, 'stale fire is not replayed late');
  fxFixture.setFleetFrame({ ...fixture, round: 1, events: fixture.events.map(e => ({ ...e, round: 1 })) });
  fxFixture.update(.05, 3.05, camera); assert.equal(fxFixture.fleetStats().events, 3, 'new round reuses IDs');
  fxFixture.setFleetFrame(null); fxFixture.setTracers(0, () => {});
  assert.equal(fxFixture.root.getObjectByName('combat-tracers').count, 0);
  fxFixture.dispose();
  console.log('PASS real FX pools consume authority fire/impact/sink and tracers once; stale events/reset/leave checked (CPU fixture)');
  const ordinary = createLoopbackRoom({ teams: 2, bots: 4, botSkill: .5 }, 'Ordinary bots CPU', { onMessage() {} }, { manual: true });
  for (let i = 0; i < 300; i++) ordinary.step(1 / 60);
  const ordinarySnap = ordinary.engine.snapshotFor(ordinary.playerId);
  assert.equal(ordinarySnap.players.filter(p => p.bot).length, 8);
  assert(ordinarySnap.vehicles.some(v => v.team === 0 && v.alive));
  assert(ordinarySnap.vehicles.some(v => v.team === 1 && v.alive));
  assert(ordinarySnap.ships.some(s => s.hp > 0));
  await preloadAircraft('http://127.0.0.1/');
  camera.position.set(0, 761, 0); camera.updateMatrixWorld(true);
  for (const vehicle of ordinarySnap.vehicles) {
    const view = createAircraftView(vehicle.kind, vehicle.team, 'low');
    assert(view.ready, `actual ${vehicle.kind} GLB converted`);
    view.update(vehicle, ordinarySnap.players, 1 / 60, camera);
    assert(view.root.visible);
    assert.deepEqual(view.root.position.toArray(), vehicle.flight.position);
    assert(view.root.scale.x >= 1 && view.root.scale.x <= 1.6);
    let bodies = 0;
    view.root.traverse(mesh => { if (mesh.isSkinnedMesh && mesh.name === 'toon') {
      assert(mesh.geometry.getAttribute('position').count > 0);
      assert(mesh.boundingSphere.radius > 1 && Number.isFinite(mesh.boundingSphere.radius));
      bodies++;
    } });
    assert(bodies > 0, 'real opaque body batches, not a placeholder');
    view.dispose();
  }
  console.log('PASS actual ordinary bot snapshot -> converted GLB view: ready/visible/pose/scale/bounds/body materials (CPU, not pixels)');
  ordinary.close();
  const solo = createLoopbackRoom({ teams: 2, bots: 0 }, 'Intentional solo CPU', { onMessage() {} }, { manual: true });
  solo.step(5); assert.equal(solo.engine.vehicles.length, 0); solo.close();
  console.log('PASS ordinary Play with bots serializes actual allied/enemy aircraft and ships; Solo remains empty');
  local = await prepareLocalFactions(host);
  const connection = local.connect('Actual local adapter', { onMessage() {} });
  let room = globalThis.__localRoom;
  assert.equal(room.engine.config.bots, 2); assert(!room.engine.config.botFill);
  for (let i = 0; i < 180; i++) room.step(1 / 60);
  const factionsSnap = room.engine.snapshotFor(room.playerId);
  assert.equal(factionsSnap.players.filter(p => p.bot).length, 4);
  assert.equal(factionsSnap.players.filter(p => !p.bot).length, 1);
  for (const team of [0, 1]) {
    assert.equal(factionsSnap.players.filter(p => p.bot && p.team === team).length, 2);
    const aircraft = factionsSnap.vehicles.filter(v => v.team === team && v.alive);
    assert(aircraft.length > 0, `actual faction ${team} aircraft serialized`);
    for (const vehicle of aircraft) {
      const pilot = room.engine.players.get(vehicle.seats[0]);
      assert(pilot?.info.bot && pilot.info.vehicleId === vehicle.id);
      assert.equal(pilot.brain.state.vehicleId, vehicle.id, 'existing native bot brain ran');
      assert.equal(pilot.info.turret, null);
      const view = createAircraftView(vehicle.kind, vehicle.team, 'low');
      try {
        assert(view.ready); view.update(vehicle, factionsSnap.players, 1 / 60, camera);
        assert(view.root.visible); assert.deepEqual(view.root.position.toArray(), vehicle.flight.position);
        let bodies = 0;
        view.root.traverse(mesh => { if (mesh.isSkinnedMesh && mesh.name === 'toon') bodies++; });
        assert(bodies > 0, 'Factions reuses actual native model body batches');
      } finally { view.dispose(); }
    }
  }
  assert(factionsSnap.players.every(p => p.turret === null));
  console.log('PASS actual Factions four native AI identities/brains and allied/enemy snapshots -> reused aircraft views (CPU, not pixels)');
  connection.send({ type: 'spawn', kind: 'fighter' });
  const plane = room.engine.vehicles.find(vehicle => vehicle.seats[0] === room.playerId);
  assert(plane && plane.seats[0] === room.playerId);
  for (let seq = 0; seq < 40; seq++) {
    Object.assign(plane.flight, { position: [1600, 4, 3146], velocity: [0, 0, -135],
      orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false, gearDown: false, crashed: null, throttle: .5 });
    plane.spawnedAt = -100;
    connection.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
    room.step(1 / 60);
    effects.update(1 / 60, seq / 60, camera);
  }
  assert(effects.fleetStats().events > 0, 'authority impacts reach real combat pools');
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
  effects.dispose();
  console.log('7 local/ordinary entity and FX groups passed; CPU loader/timer instrumentation, not native GPU/input acceptance');
} finally {
  try { local?.dispose() } finally {
    globalThis.location = oldLocation; globalThis.fetch = oldFetch;
    if (oldParse === undefined) delete globalThis.__localParse; else globalThis.__localParse = oldParse;
    if (oldRoom === undefined) delete globalThis.__localRoom; else globalThis.__localRoom = oldRoom;
  }
}
