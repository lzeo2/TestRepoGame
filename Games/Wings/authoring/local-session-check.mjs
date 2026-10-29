// Executes actual local-factions.ts + real room/authority/rig. Loader/timer instrumentation is CPU-only.
// Mechanical aircraft poses and factor-only decoded GLBs do NOT prove native flight or texture rendering.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { COALITION_MODEL_ASSETS } from './local-host-scenario.mjs';
import { compileGeometry, fittedHeightAt } from './fleet-geometry.mjs';

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
  export {VEHICLES, NATIVE_HELICOPTER_MODELS} from ${JSON.stringify(resolve(root, 'Games/Wings/source/games/wings/src/sim/vehicles.ts'))};
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
  const { prepareLocalFactions, createEffects, createLoopbackRoom, preloadAircraft, createAircraftView, VEHICLES, NATIVE_HELICOPTER_MODELS } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
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
  const rosters = { nato: ['f16c', 'typhoon', 'rafale', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'a10c', 'f35a', 'ah64d'],
    eastern: ['mig29', 'su35s', 'jf17', 'mig31', 'su34', 'yak130', 'su25sm', 'j20', 'tu160', 'mi28n'] };
  const lookup = JSON.parse(readFileSync(new URL('./supplied-fighters/roster_lookup.json', import.meta.url)));
  for (const [kind, source, side] of [['ah64d', 'wings.original.ah-64d-apache.v1', 'A'], ['mi28n', 'wings.original.mi-28n.v1', 'B']]) {
    assert.equal(NATIVE_HELICOPTER_MODELS[kind].source_model_id, source);
    assert(lookup.standard.some(row => row.model_id === source));
    assert(lookup.factions.some(row => row.model_id === source && row.faction === side));
    assert.equal(VEHICLES[kind].model, NATIVE_HELICOPTER_MODELS[kind].file);
    assert.deepEqual(VEHICLES[kind].seatWeapons, [['rockets', null], ['hellfire', null]]);
    assert(!('gun' in NATIVE_HELICOPTER_MODELS[kind].hardpoints));
  }
  let namedGroups = 0;
  for (const [coalition, selected] of Object.entries(rosters).flatMap(([id, kinds]) => kinds.map((_, i) => [id, i]))) {
    const kinds = coalition === 'nato' ? [rosters.nato, rosters.eastern] : [rosters.eastern, rosters.nato];
    const vessels = coalition === 'nato' ? [['type45', 'aquitaine', 'cb90', 'cdg', 'qe'], ['type054a', 'type055', 'type022', 'liaoning', 'kuz']] : [['type054a', 'type055', 'type022', 'liaoning', 'kuz'], ['type45', 'aquitaine', 'cb90', 'cdg', 'qe']];
    const messages = [];
    local = await prepareLocalFactions(host, coalition);
    assert.deepEqual(local.aircraftKinds(), kinds[0]); assert(Object.isFrozen(local.aircraftKinds()));
    assert(Object.isFrozen(local.teamNames()));
    assert.match(local.teamNames()[0], coalition === 'nato' ? /^NATO-inspired/ : /^Eastern-inspired/);
    const link = local.connect(`Named ${coalition} CPU`, { onMessage: message => messages.push(message) });
    room = globalThis.__localRoom;
    assert.equal(room.engine.players.get(room.playerId).info.team, 0);
    for (let i = 0; i < 180; i++) room.step(1 / 60);
    let named = local.debug();
    assert.deepEqual(named.coalitions.map(profile => profile.vessels), vessels);
    assert.deepEqual([0, 1].map(team => named.frame.units.filter(unit => unit.team === team)
      .sort((a, b) => vessels[team].indexOf(a.modelId) - vessels[team].indexOf(b.modelId)).map(unit => unit.modelId)), vessels);
    assert.equal(local.objectives().length, 2, 'escorts are not capital bars');
    assert.equal(local.safeTargets().length, 10, 'all ten genuine hulls reach safe HUD/physics queries');
    const safe = local.safeTargets(), safeUnit = named.frame.units.find(unit => unit.id === safe[0].id);
    assert(Object.isFrozen(safe) && Object.isFrozen(safe[0]) && Object.isFrozen(safe[0].position));
    assert.notStrictEqual(safe[0].position, safeUnit.position, 'safe HUD positions are cloned');
    assert.deepEqual(safe[0].position, safeUnit.position);
    assert(!JSON.stringify(safe).includes('modelId') && !JSON.stringify(safe).includes('weapons'), 'safe HUD omits model/weapon authority');
    const objective = local.objectives()[0], objectiveHp = objective.hp;
    objective.hp = -1; assert.equal(local.objectives()[0].hp, objectiveHp, 'objective bars cannot mutate authority');
    assert.equal(named.models.length, 10); assert(named.models.every(model => model.ready), 'actual ten GLBs loaded');
    for (const unit of named.frame.units.filter(unit => !unit.capital)) {
      const descriptor = COALITION_MODEL_ASSETS.find(asset => asset.id === unit.modelId).descriptor;
      const g = compileGeometry(descriptor), [x, , z] = unit.position;
      const y = fittedHeightAt(g, x, z, unit.position, 2 * Math.atan2(unit.view.orientation[1], unit.view.orientation[3]));
      assert.equal(local.surfaceHeightAt(x, z), y);
      assert.equal(local.surfaceContact([x, y, z]).id, unit.id);
      assert(Math.abs(local.surfaceSegment([x, 100, z], [x, -50, z]) - (100 - y) / 150) < 1e-8);
      assert(named.models.find(model => model.id === unit.id).ready, 'actual escort mesh is bound');
    }
    // Same safe component query powers HUD/client prediction and trusted native flight.
    for (const unit of named.frame.units.filter(unit => ['cdg', 'qe', 'liaoning', 'kuz'].includes(unit.modelId))) {
      const descriptor = COALITION_MODEL_ASSETS.find(asset => asset.id === unit.modelId).descriptor;
      const g = compileGeometry(descriptor), heading = 2 * Math.atan2(unit.view.orientation[1], unit.view.orientation[3]);
      const rotate = p => [Math.cos(heading) * p[0] + Math.sin(heading) * p[2] + unit.position[0],
        p[1], -Math.sin(heading) * p[0] + Math.cos(heading) * p[2] + unit.position[2]];
      for (const b of g.boxes) {
        const p = rotate(b.min.map((n, i) => (n + b.max[i]) / 2));
        const y = fittedHeightAt(g, p[0], p[2], unit.position, heading);
        assert.equal(local.surfaceHeightAt(p[0], p[2]), y);
        assert.equal(room.engine.combat.hostFleet.surfaceHeightAt(p[0], p[2]), y);
        assert.equal(local.surfaceContact([p[0], y, p[2]]).id, unit.id);
        assert(Math.abs(local.surfaceSegment([p[0], 100, p[2]], [p[0], -50, p[2]]) - (100 - y) / 150) < 1e-8);
      }
      assert.equal(g.gun, null); assert.deepEqual(g.launches, []);
      assert(!named.frame.events.some(event => event.type === 'fire' && event.source === unit.id));
    }
    const snap = room.engine.snapshotFor(room.playerId);
    assert(!JSON.stringify(snap).includes('modelId') && !JSON.stringify(snap).includes('source_model_id'), 'native wire omits private fleet identities');
    assert.equal(snap.players.filter(player => player.bot).length, 4);
    for (const team of [0, 1]) {
      const bots = snap.vehicles.filter(vehicle => vehicle.team === team && vehicle.alive);
      assert(bots.length > 0);
      for (const aircraft of bots) {
        assert(kinds[team].includes(aircraft.kind), 'actual opposing native AI roster');
        const view = createAircraftView(aircraft.kind, team, 'low');
        try { assert(view.ready); view.update(aircraft, snap.players, 1 / 60, camera); assert(view.root.visible); }
        finally { view.dispose(); }
      }
    }
    for (const foreign of kinds[1]) {
      const startErrors = messages.filter(message => message.type === 'error').length;
      link.send({ type: 'spawn', kind: foreign });
      await Promise.resolve(); // Actual queued wire outbox, not a synchronous stand-in.
      assert.equal(room.engine.players.get(room.playerId).info.vehicleId, null);
      const errors = messages.filter(message => message.type === 'error');
      assert.equal(errors.length, startErrors + 1); assert.match(errors.at(-1).message, /unavailable/);
    }
    link.send({ type: 'spawn', kind: kinds[0][selected] });
    const aircraft = room.engine.vehicles.find(vehicle => vehicle.seats[0] === room.playerId);
    assert(aircraft && aircraft.kind === kinds[0][selected] && Number.isFinite(aircraft.hp));
    namedGroups++;
    const selectedView = createAircraftView(aircraft.kind, 0, 'low');
    try {
      assert(selectedView.ready, `selected ${aircraft.kind} actual GLB ready`);
      selectedView.update(aircraft, room.engine.snapshotFor(room.playerId).players, 1 / 60, camera);
      assert(selectedView.root.visible);
    } finally { selectedView.dispose(); }
    const selectedSnap = room.engine.snapshotFor(room.playerId).vehicles.find(v => v.id === aircraft.id);
    assert.notStrictEqual(selectedSnap.flight.position, aircraft.flight.position);
    selectedSnap.flight.position[0] += 123;
    assert.notEqual(selectedSnap.flight.position[0], aircraft.flight.position[0], 'decoded aircraft pose cannot mutate host');
    const hp = local.debug().frame.units.find(unit => unit.team === 1 && unit.capital).hp;
    const ammo = aircraft.weapons[0][0].ammo;
    if (aircraft.kind === 'ah64d' || aircraft.kind === 'mi28n') {
      // One disclosed safe approach pose and expired spawn protection. No per-tick
      // repositioning, fake cannon, HP/ammo/guidance/physics override or seed search.
      const target = local.debug().frame.units.find(unit => unit.team === 1 && unit.capital);
      Object.assign(aircraft.flight, { position: [target.position[0], 8, target.position[2] + 220], velocity: [0, 0, -40],
        orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
        gearDown: false, crashed: null, throttle: .5 });
      aircraft.spawnedAt = -100;
      assert.equal(ammo, 38);
      const officerAmmo = aircraft.weapons[1][0].ammo;
      assert.equal(officerAmmo, 4);
      link.send({ type: 'input', seq: 0, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
      for (let tick = 0; tick < 12 && aircraft.weapons[0][0].ammo === ammo; tick++) room.step(1 / 60);
      assert.equal(aircraft.weapons[0][0].ammo, 37);
      const rocket = room.engine.combat.projectiles.find(p => p.vehicle === aircraft.id && p.weapon === 'rockets');
      assert(rocket && rocket.owner === room.playerId && rocket.team === 0, 'actual accepted native Hydra projectile');
      link.send({ type: 'input', seq: 1, seat: { aim: [0, 0, -1], firePrimary: false, viewDelay: 0 } });
      for (let tick = 0; tick < 60; tick++) room.step(1 / 60);
      const after = local.debug().frame.units.find(unit => unit.id === target.id);
      assert.equal(aircraft.weapons[0][0].ammo, 37, 'one rocket only, before native regeneration');
      assert.equal(aircraft.weapons[1][0].ammo, officerAmmo, 'no invented gun or missile launch');
      assert.equal(after.hp, hp - 96, 'one actual Hydra damages fitted capital at native damage');
      assert(!room.engine.combat.projectiles.includes(rocket), 'consumed actual rocket lifecycle');
      assert.equal(local.debug().frame.events.filter(e => e.type === 'damage' && e.source === `aircraft_${aircraft.id}`).length, 1);
      console.log(`PASS named ${coalition}/${aircraft.kind}: legal supplied identity, foreign rejection, ready cloned/private view; single safe approach/protection fixture Hydra38->37, officer4 unchanged, fitted capitalHP${hp}->${after.hp}, consumed projectile`);
      link.close(); local.dispose(); assert.equal(host.scene.children.length, 0);
      continue;
    }
    if (aircraft.kind === 'tu160') {
      // Declared moving-target drop, not natural bombing. The original20m fixture
      // crashed into fitted terrain before weapon evaluation; retain real clearance.
      const before = local.debug().frame.units.find(unit => unit.team === 1 && unit.capital);
      for (let tick = 0; tick < 3; tick++) room.step(1 / 60);
      const target = local.debug().frame.units.find(unit => unit.id === before.id);
      const velocity = target.position.map((n, i) => (n - before.position[i]) / .05);
      assert(Math.hypot(...velocity) > 0, 'measure actual authority motion, not assumed heading');
      Object.assign(aircraft.flight, { position: [target.position[0] + 1.1, 100, target.position[2] + 6], velocity,
        orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
        gearDown: false, crashed: null, throttle: .5 });
      aircraft.spawnedAt = -100;
      assert.strictEqual(aircraft.weapons[0][0], aircraft.weapons[1][0], 'one shared eight-bomb load');
      link.send({ type: 'input', seq: 0, seat: { aim: [0, -1, 0], firePrimary: true, viewDelay: 0 } });
      // Retain the real input jitter buffer: one packet is not consumed on tick1.
      for (let tick = 0; tick < 12; tick++) room.step(1 / 60);
      if (aircraft.weapons[0][0].ammo === ammo) {
        const pilot = room.engine.players.get(room.playerId);
        console.log('Tu160 fixture diagnostic', JSON.stringify({ alive: aircraft.alive, hp: aircraft.hp, flight: aircraft.flight,
          playerVehicle: pilot.info.vehicleId, seat: pilot.info.seat, seq: pilot.seq, ack: pilot.ack,
          input: pilot.seat, queued: pilot.queue, now: room.engine.time, weapons: aircraft.weapons }));
      }
      assert.equal(aircraft.weapons[0][0].ammo, ammo - 1);
      link.send({ type: 'input', seq: 1, seat: { aim: [0, -1, 0], firePrimary: false, viewDelay: 0 } });
      for (let tick = 0; tick < 420; tick++) room.step(1 / 60);
      const after = local.debug().frame.units.find(unit => unit.id === target.id);
      assert(after.hp < hp, 'actual native bomb damages fitted capital');
      console.log(`PASS named eastern/tu160: declared model-origin bomb, shared ammo${ammo}->${ammo - 1}, capitalHP${hp}->${after.hp}; not natural bombing`);
      link.close(); local.dispose(); assert.equal(host.scene.children.length, 0);
      continue;
    }
    // Explicit approach/protection fixture only: tests new-kind provenance and
    // unchanged native cannon -> fitted hull authority, not natural flight.
    for (let seq = 0; seq < 40; seq++) {
      Object.assign(aircraft.flight, { position: [1600, 4, 3146], velocity: [0, 0, -135],
        orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
        gearDown: false, crashed: null, throttle: .5 });
      aircraft.spawnedAt = -100;
      link.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
      room.step(1 / 60);
    }
    assert(aircraft.weapons[0][0].ammo < ammo);
    assert(local.debug().frame.units.find(unit => unit.team === 1 && unit.capital).hp < hp);
    if (selected === 3) {
      // Separate disclosed approach fixture: exercise native cannon against each
      // genuine noncapital hull, not evidence of an unforced escort strike.
      const escort = local.debug().frame.units.find(unit => unit.id === 'enemy-escort');
      const escortAmmo = aircraft.weapons[0][0].ammo;
      for (let seq = 40; seq < 80; seq++) {
        Object.assign(aircraft.flight, { position: [1600, 4, 2916], velocity: [0, 0, -135],
          orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
          gearDown: false, crashed: null, throttle: .5 });
        link.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
        room.step(1 / 60);
      }
      assert(aircraft.weapons[0][0].ammo < escortAmmo);
      assert(local.debug().frame.units.find(unit => unit.id === escort.id).hp < escort.hp);
      if (coalition === 'eastern') {
        // Disclosed low approach tracks the small moving CB90. The original100m
        // lane hit nearer Aquitaine;40m clears it without changing collision/HP/ammo.
        const boat = local.debug().frame.units.find(unit => unit.modelId === 'cb90');
        const boatAmmo = aircraft.weapons[0][0].ammo;
        for (let seq = 80; seq < 120; seq++) {
          const current = local.debug().frame.units.find(unit => unit.id === boat.id);
          Object.assign(aircraft.flight, { position: [current.position[0], 3, current.position[2] + 40], velocity: [0, 0, -135],
            orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
            gearDown: false, crashed: null, throttle: .5 });
          link.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
          room.step(1 / 60);
        }
        assert(aircraft.weapons[0][0].ammo < boatAmmo);
        assert(local.debug().frame.units.find(unit => unit.id === boat.id).hp < boat.hp);
        console.log(`PASS declared clear-lane native cannon -> CB90: ${boat.hp}->${local.debug().frame.units.find(unit => unit.id === boat.id).hp}`);
      }
    }
    if (coalition === 'nato' && selected === 5) {
      // Declared clear-lane approach to the real moving Type022 bridge, not
      // natural-flight evidence or a filled water-level catamaran tunnel.
      const boat = local.debug().frame.units.find(unit => unit.modelId === 'type022');
      const boatAmmo = aircraft.weapons[0][0].ammo;
      for (let seq = 40; seq < 80; seq++) {
        const current = local.debug().frame.units.find(unit => unit.id === boat.id);
        Object.assign(aircraft.flight, { position: [current.position[0], 3, current.position[2] + 30], velocity: [0, 0, -135],
          orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
          gearDown: false, crashed: null, throttle: .5 });
        link.send({ type: 'input', seq, seat: { aim: [0, 0, -1], firePrimary: true, viewDelay: 0 } });
        room.step(1 / 60);
      }
      assert(aircraft.weapons[0][0].ammo < boatAmmo);
      assert(local.debug().frame.units.find(unit => unit.id === boat.id).hp < boat.hp);
      console.log(`PASS declared native cannon -> Type022: ${boat.hp}->${local.debug().frame.units.find(unit => unit.id === boat.id).hp}`);
    }
    link.close(); local.dispose(); assert.equal(host.scene.children.length, 0);
    console.log(`PASS named ${coalition}/${kinds[0][selected]}: genuine opposing aircraft/vessels, original native bot brains/models, roster rejection and accepted new-kind cannon impacts (declared CPU approach fixture)`);
  }
  assert.equal(namedGroups, 20, 'all eighteen old named aircraft plus both supplied helicopters');
  for (const invalid of ['', 'NATO', 'cobalt', null]) await assert.rejects(() => prepareLocalFactions(host, invalid), /Unknown coalition/);
  assert.equal(host.scene.children.length, 0, 'invalid selection cannot create scene roots');
  effects.dispose();
  console.log('27 local/ordinary entity and FX groups passed (7 base + 20 named; 17 cannon, 1 bomb, 2 Hydra); CPU loader/timer instrumentation, not native GPU/input acceptance');
} finally {
  try { local?.dispose() } finally {
    globalThis.location = oldLocation; globalThis.fetch = oldFetch;
    if (oldParse === undefined) delete globalThis.__localParse; else globalThis.__localParse = oldParse;
    if (oldRoom === undefined) delete globalThis.__localRoom; else globalThis.__localRoom = oldRoom;
  }
}
