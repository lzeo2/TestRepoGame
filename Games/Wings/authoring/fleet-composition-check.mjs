// Actual-model CPU composition fixtures, not served/natural flight, texture or native acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { createFactionsComposition } from './fleet-composition.mjs';
import { compileGeometry, mountPose } from './fleet-geometry.mjs';
import { MAP_IDS } from './map-pack/maps.mjs';
import { visualTransmittance } from './weather/weather.mjs';
if (!process.env.THREE_ROOT) throw new Error('Set THREE_ROOT to the existing Three 0.186.0 package; install nothing.');
const T = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.module.js')).href);
assert.equal(T.REVISION, '186');
const read = relative => readFile(new URL('../'+relative, import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const manifest = JSON.parse(await read('authoring/model-repairs.json'));
const sub = JSON.parse(await read('authoring/submarine-model.json'));
const descriptors = [...manifest.models, sub], models = [], sourceHashes = new Map();
let triangles = 0, modelDisposals = 0;
for (const [i, descriptor] of descriptors.entries()) {
  const bytes = await read(descriptor.file); assert.equal(sha(bytes), descriptor.sha256);
  sourceHashes.set(descriptor.file, sha(bytes));
  const parsed = modelGeometryFixture(T, bytes); triangles += parsed.triangleCount;
  parsed.object.traverse(node => { if (node.isMesh) {
    node.geometry.addEventListener('dispose', () => modelDisposals++);
    node.material.addEventListener('dispose', () => modelDisposals++);
  } });
  models.push({ id: ['type45', 'type054', 'originalSub'][i], descriptor, object: parsed.object });
}
const fitted = new Map(models.map(m => [m.id, compileGeometry(m.descriptor)]));
const geometryState = () => models.map(m => {
  const hash = createHash('sha256');
  m.object.traverse(node => { if (node.isMesh) {
    for (const attribute of Object.values(node.geometry.attributes)) hash.update(Buffer.from(attribute.array.buffer));
    if (node.geometry.index) hash.update(Buffer.from(node.geometry.index.array.buffer));
    hash.update(JSON.stringify([node.material.color.toArray(), node.material.metalness, node.material.roughness]));
  } });
  return hash.digest('hex');
});
const transformState = () => models.map(m => {
  const entries = []; m.object.traverse(node => entries.push([node.name, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray(), node.visible]));
  return entries;
});
const originalGeometry = geometryState(), originalTransforms = transformState();
const gun = (id = 'gun', extra = {}) => ({ id, medium: 'surface', range: 1200, speed: 500, ttlMs: 4000,
  cooldownMs: 500, damage: 20, depths: ['surfaced'], ammo: 200, acquisition: 'nonvisual', ...extra });
const underwater = () => ({ id: 'anonymousUW', medium: 'underwater', range: 1000, speed: 100, ttlMs: 20000,
  cooldownMs: 6000, damage: 1, depths: ['shallow', 'deep'], ammo: 2, acquisition: 'nonvisual' });
const profile = (id, team, capital, extra = {}) => ({ id, team, capital, kind: 'surface', position: [0, 0, 0],
  half: [12, 8, 40], hp: 1000, speed: 30, route: [], weapons: [], sensor: null,
  depth: 'surfaced', depthPlan: [], ...extra });
function surfaceProfiles(count = 2) {
  return [0, 1].flatMap(team => [profile(`capital${team}`, team, true, {
    modelId: team ? 'type054' : 'type45', weapons: [gun('gun', { mount: 'main_gun' })],
  }), ...(count === 4 ? [profile(`escort${team}`, team, false, {
    modelId: team ? 'type45' : 'type054', weapons: [gun('gun', { mount: 'main_gun' })],
  })] : [])]);
}
function mixedProfiles() {
  return [0, 1].flatMap(team => [
    // Explicitly anonymous LEGACY counterplay, not model-ready ASW art or inferred escort capabilities.
    profile(`capital${team}`, team, true, { speed: 0, weapons: [underwater()],
      sensor: { enabled: true, range: 1000, depths: ['shallow', 'deep'] } }),
    profile(`escort${team}`, team, false, { modelId: team ? 'type054' : 'type45', weapons: [gun('gun', { mount: 'main_gun' })] }),
    profile(`sub${team}`, team, false, { kind: 'sub', modelId: 'originalSub', half: [8, 10, 43], speed: 4,
      depth: 'deep', depthPlan: [{ atMs: 0, depth: 'shallow' }], weapons: [] }),
  ]);
}
function close(a, b, epsilon = 1e-5) {
  assert.equal(a.length, b.length); a.forEach((v, i) => assert(Math.abs(v-b[i]) < epsilon, `${a} != ${b}`));
}
const actorA = {}, actorB = {}, actorAlly = {}, identity = {};
const credentials = new Map([[actorA, { id: 'alice', team: 0 }], [actorB, { id: 'bob', team: 1 }], [actorAlly, { id: 'ally', team: 0 }]]);
const live = new Set();
function setup({ mapId = MAP_IDS[0], profiles = surfaceProfiles(), weather = {}, preferences = [{}, {}], matchMs = 120000, aircraftAcquisition = 'nonvisual', presentationFactory } = {}) {
  const targets = new Map(), steps = []; let launchPose, sequence = 0, lease;
  const app = createFactionsComposition({ mode: 'factions', mapId, seed: 71, profiles, models,
    aircraft: [[{ id: 'planeA', weapons: [gun('airGun', { acquisition: aircraftAcquisition })] }],
      [{ id: 'planeB', weapons: [gun('airGun', { acquisition: aircraftAcquisition })] }]],
    matchMs, intermissionMs: 1000, weather: { seed: 31, initialPreset: 'clear', holdMs: 90000, transitionMs: 30000, ...weather },
    host: { identity, authenticate: actor => credentials.get(actor),
      deriveAircraftAttack() { assert(launchPose, 'Trusted aircraft fixture pose must be provided'); return clone(launchPose); },
      stepAircraft(step) { steps.push(step); } }, THREE: T,
    createPresentation(principal) {
      assert.deepEqual(Object.keys(principal).sort(), ['playerId', 'team']);
      if (presentationFactory) return presentationFactory(principal);
      const target = { parent: new T.Group(), frames: [], fail: false, presentation: preferences[principal.team] };
      targets.set(principal.playerId, target);
      return { parent: target.parent, presentation: target.presentation, applyEnvironment(frame) {
        if (target.fail) throw new Error('presentation unavailable'); target.frames.push(clone(frame));
      } };
    } });
  live.add(app); lease = app.start(identity);
  return { app, targets, steps, profiles,
    advance(ms) { return app.update(lease, { sequence: ++sequence, elapsedMs: ms }); },
    restart() { lease = app.restart(identity); sequence = 0; return lease; },
    setPose(pose) { launchPose = pose; },
    dispose() { app.dispose(identity); live.delete(app); },
  };
}
const container = (target, id) => target.parent.getObjectByName(`fleet-unit:${id}`);
function visibleAnchor(target, id, name) {
  const body = container(target, id), anchor = body?.getObjectByName(name);
  if (!anchor) return null;
  for (let node = anchor; node; node = node.parent) if (!node.visible) return null;
  target.parent.updateWorldMatrix(true, true);
  return anchor.getWorldPosition(new T.Vector3()).toArray();
}
let passed = 0, failed = 0;
async function check(name, body) {
  try { await body(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.stack}`); }
  finally { for (const app of live) { app.dispose(identity); live.delete(app); } }
}
await check('shared parser preserves actual 3-model triangle count and rejects corrupt GLB bytes', () => {
  assert.equal(triangles, 28976);
  assert.throws(() => modelGeometryFixture(T, new Uint8Array(28)), /GLB/);
  assert(models.every(m => m.object.getObjectByName(m.descriptor.root)));
});
await check('non-Factions declines before accessing any host/model/config fields', () => {
  for (const mode of ['normal', 'solo', 'custom']) assert.equal(createFactionsComposition({ mode,
    get models() { throw new Error('ordinary models accessed'); }, get host() { throw new Error('ordinary host accessed'); } }), null);
});
await check('actual measured 2/4 surface models and map mesh/query/environment pipeline on ALL three maps', () => {
  assert.equal(MAP_IDS.length, 3);
  for (const mapId of MAP_IDS) for (const count of [2, 4]) {
    const f = setup({ mapId, profiles: surfaceProfiles(count) }); f.app.join(actorA); f.app.join(actorB);
    const world = f.app.world(identity), mesh = world.worldMesh();
    assert.throws(() => f.app.world({}));
    assert.deepEqual(world.allowedWeatherPresets().slice().sort(), ['clear', 'fog', 'overcast', 'rain', 'storm']);
    assert.equal(mesh.h.length, mesh.stride*mesh.stride); assert.equal(mesh.diag.length, mesh.n*mesh.n);
    for (const [i, j] of [[30, 30], [130, 170], [200, 200], [310, 250]]) {
      const k = j*mesh.stride+i;
      const a = new T.Vector3(mesh.vx[k], mesh.h[k], mesh.vz[k]);
      const b = new T.Vector3(mesh.vx[k+1], mesh.h[k+1], mesh.vz[k+1]);
      const c = new T.Vector3(mesh.vx[k+mesh.stride], mesh.h[k+mesh.stride], mesh.vz[k+mesh.stride]);
      const point = a.clone().multiplyScalar(.5).addScaledVector(b, .2).addScaledVector(c, .3);
      assert(Math.abs(world.terrainMeshHeight(point.x, point.z)-point.y) < 1e-6);
      assert(Math.abs(world.worldQuery.groundHeight(point.x, point.z)-Math.max(0, point.y)) < 1e-6);
      assert.equal(world.worldQuery.isWater(point.x, point.z), point.y <= 0);
    }
    f.advance(50); const safe = f.app.snapshot(actorA);
    assert.equal(safe.units.length, count);
    for (const u of safe.units) {
      const body = container(f.targets.get('alice'), u.id); assert(body.visible);
      close(body.position.toArray(), u.position); close(body.quaternion.toArray(), u.view.orientation);
    }
    assert.equal(f.steps.length, 1); assert.equal(f.steps[0].worldQuery, world.worldQuery);
    assert.equal(f.steps[0].environment.simulationMs, 0);
    f.dispose();
  }
});
const baselineMotion = new Map();
await check('original 1000-HP baseline: reciprocal measured fire/attributed damage/sinking and explicit 60s time draw', () => {
  // Authored mechanical fixture baseline, NOT served production balance. No HP override.
  const f = setup({ profiles: surfaceProfiles(4), matchMs: 60000 }); f.app.join(actorA); f.app.join(actorB);
  const shots = new Set(), damage = new Set(), sunk = new Set(), trace = { firstFire: {}, shots: {}, damage: {}, sinks: {} };
  let checkedPose = 0, advancedProp = false, outcome = null;
  for (let i = 0; i < 1200; i++) {
    f.advance(50); const safe = f.app.snapshot(actorA), target = f.targets.get('alice');
    baselineMotion.set(safe.tick, safe.units.map(u => ({ id: u.id, position: u.position, orientation: u.view.orientation })));
    for (const u of safe.units) {
      const body = container(target, u.id);
      if (!u.alive) continue; // Dead rigs perform their documented finite cosmetic sink/stop, not live propulsion.
      close(body.position.toArray(), u.position);
      for (const [name, spin] of Object.entries(u.view.spinners)) {
        const node = body.getObjectByName(name), phase = spin.phaseRad+spin.rateRadS*(safe.tick*.05-spin.epochSeconds);
        const axis = models.find(m => m.id === u.modelId).descriptor.articulation.find(c => c.node === name).axis_local;
        const expected = new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis), phase);
        assert(1-Math.abs(node.quaternion.dot(expected)) < 1e-6);
        if (Math.abs(spin.phaseRad) > .001) advancedProp = true;
      }
    }
    for (const e of safe.events.filter(e => e.tick === safe.tick)) {
      if (e.type === 'damage') {
        const attribution = `${e.source}->${e.unit}`; damage.add(attribution);
        trace.damage[attribution] = (trace.damage[attribution] ?? 0)+e.damage;
      }
      if (e.type === 'sunk') { sunk.add(e.unit); trace.sinks[e.unit] = safe.tick; }
      if (e.type === 'fire') {
        trace.firstFire[e.source] ??= safe.tick; trace.shots[e.source] = (trace.shots[e.source] ?? 0)+1;
        const u = safe.units.find(u => u.id === e.source); shots.add(e.team);
        const heading = 2*Math.atan2(u.view.orientation[1], u.view.orientation[3]);
        const pose = mountPose(fitted.get(u.modelId), u.position, heading, 'main_gun', u.view.angles);
        close(e.position, pose.position);
        close(visibleAnchor(target, u.id, 'main_gun_muzzle'), pose.position);
        close(target.parent.getObjectByName(`fleet-fire:${e.id}`).position.toArray(), e.position); checkedPose++;
      }
      if (e.type === 'impact') close(target.parent.getObjectByName(`fleet-impact:${e.id}`).position.toArray(), e.position);
    }
    if (safe.outcome) { outcome = safe.outcome; break; }
  }
  assert.equal(shots.size, 2, `Both factions must actually fire inside measured arcs/range; final ${JSON.stringify(f.app.snapshot(actorA).units.map(u => ({ id: u.id, position: u.position, orientation: u.view.orientation, angles: u.view.angles })))}`);
  assert(damage.has('escort0->escort1') && damage.has('escort1->escort0'), 'Both escorts must apply attributed damage');
  assert(sunk.size > 0, 'Real authoritative sinking required');
  assert.deepEqual(outcome, { winner: null, reason: 'time' });
  assert.equal(f.app.snapshot(actorA).tick, 1200); assert(checkedPose >= 2 && advancedProp);
  console.log('AI BASELINE TRACE', JSON.stringify(trace));
  f.dispose();
});
await check('40-HP named negative: one-sided early sinking is retained, not accepted as reciprocal combat', () => {
  const profiles = surfaceProfiles(4); profiles.forEach(u => { u.hp = 40; });
  const f = setup({ profiles, matchMs: 60000 }); f.app.join(actorA); f.app.join(actorB);
  const trace = { firstFire: {}, shots: {}, damageTicks: [], damage: 0, sinks: {} };
  for (let i = 0; i < 1200; i++) {
    f.advance(50); const safe = f.app.snapshot(actorA);
    if (trace.sinks.escort1 === undefined) assert.deepEqual(safe.units.map(u => ({
      id: u.id, position: u.position, orientation: u.view.orientation,
    })), baselineMotion.get(safe.tick), 'HP-only diagnostic preserves baseline motion through first sinking');
    for (const e of safe.events.filter(e => e.tick === safe.tick)) {
      if (e.type === 'fire') { trace.firstFire[e.source] ??= safe.tick; trace.shots[e.source] = (trace.shots[e.source] ?? 0)+1; }
      if (e.type === 'damage' && e.source === 'escort0' && e.unit === 'escort1') { trace.damageTicks.push(e.tick); trace.damage += e.damage; }
      if (e.type === 'sunk') {
        trace.sinks[e.unit] = e.tick;
        if (e.unit === 'escort1') assert.deepEqual(safe.units.map(u => ({ id: u.id, position: u.position, orientation: u.view.orientation })), baselineMotion.get(e.tick));
      }
    }
    if (safe.outcome) { assert.deepEqual(safe.outcome, { winner: null, reason: 'time' }); break; }
  }
  assert(Number.isInteger(trace.firstFire.escort0)); assert.equal(trace.firstFire.escort1, undefined);
  assert.equal(trace.damage, 40); assert.equal(trace.damageTicks.length, 2);
  assert(trace.sinks.escort1 > trace.firstFire.escort0); assert.equal(f.app.snapshot(actorA).tick, 1200);
  console.log('40-HP ONE-SIDED NEGATIVE TRACE', JSON.stringify(trace)); f.dispose();
});
await check('ordinary aircraft ownership/host launch/cooldown and friendly blocking use shared real authority/effects', () => {
  const f = setup(); f.app.join(actorA); f.app.join(actorB);
  assert(f.app.request(actorA, { type: 'spawn', kind: 'planeA' }).ok);
  assert.equal(f.app.request(actorA, { type: 'spawn', kind: 'capital0' }).ok, false);
  const state = f.app.snapshot(actorA), enemy = state.units.find(u => u.team === 1), friend = state.units.find(u => u.team === 0);
  const poseFor = u => ({ origin: [u.position[0], 2, u.position[2]-150], aim: [u.position[0], 2, u.position[2]] });
  const oldHp = enemy.hp; f.setPose(poseFor(enemy));
  assert.throws(() => f.app.attack(actorA, { weapon: 'airGun', origin: [0, 0, 0] }));
  assert(f.app.attack(actorA, { weapon: 'airGun' }).ok);
  assert.equal(f.app.attack(actorA, { weapon: 'airGun' }).ok, false);
  f.advance(250); f.advance(250);
  assert(f.app.snapshot(actorB).units.find(u => u.id === enemy.id).hp < oldHp);
  const friendHp = f.app.snapshot(actorA).units.find(u => u.id === friend.id).hp;
  f.setPose(poseFor(friend)); assert(f.app.attack(actorA, { weapon: 'airGun' }).ok);
  f.advance(250); f.advance(250);
  assert.equal(f.app.snapshot(actorA).units.find(u => u.id === friend.id).hp, friendHp);
  f.dispose();
});
await check('ordinary host-derived aircraft fire destroys the moving 1000-HP capital with 50 real 20-damage shots', () => {
  const f = setup({ matchMs: 60000 }); f.app.join(actorA); f.app.join(actorB);
  assert(f.app.request(actorA, { type: 'spawn', kind: 'planeA' }).ok);
  assert.equal(f.app.snapshot(actorA).units.find(u => u.id === 'capital0').hp, 1000);
  assert.equal(f.app.snapshot(actorB).units.find(u => u.id === 'capital1').hp, 1000);
  const events = new Map(), targetPositions = []; let accepted = 0;
  for (let shot = 0; shot < 50; shot++) {
    // Trusted host fixture reads the authenticated enemy-side authority state, NOT Alice's redacted view.
    const enemy = f.app.snapshot(actorB).units.find(u => u.id === 'capital1');
    assert(enemy.alive); targetPositions.push(enemy.position);
    f.setPose({ origin: [enemy.position[0], 2, enemy.position[2]-150], aim: [enemy.position[0], 2, enemy.position[2]] });
    assert(f.app.attack(actorA, { weapon: 'airGun' }).ok); accepted++;
    assert.equal(f.app.attack(actorA, { weapon: 'airGun' }).ok, false, 'Existing 500ms cooldown remains enforced');
    for (let half = 0; half < 2; half++) {
      f.advance(250);
      for (const event of f.app.snapshot(actorA).events) events.set(event.id, event);
    }
  }
  assert.equal(accepted, 50); assert.notDeepEqual(targetPositions[0], targetPositions.at(-1));
  const damage = [...events.values()].filter(e => e.type === 'damage' && e.source === 'aircraft_alice' && e.unit === 'capital1');
  assert.equal(damage.length, 50); assert(damage.every(e => e.damage === 20));
  assert.equal(damage.reduce((sum, e) => sum+e.damage, 0), 1000);
  const sinks = [...events.values()].filter(e => e.type === 'sunk' && e.unit === 'capital1');
  assert.equal(sinks.length, 1); assert.equal(sinks[0].source, 'aircraft_alice');
  const final = f.app.snapshot(actorA);
  assert.equal(final.units.find(u => u.id === 'capital1').hp, 0);
  assert.equal(final.units.find(u => u.id === 'capital1').alive, false);
  assert.deepEqual(final.outcome, { winner: 0, reason: 'capitals' }); assert(final.tick*50 <= 60000);
  console.log('PLAYER CAPITAL OBJECTIVE TRACE', JSON.stringify({ accepted, damage: 1000, sunkTick: sinks[0].tick, outcome: final.outcome }));
  f.dispose();
});
await check('one fixed-time environment: partition, pause, restart, visibility and presentation preferences stay separated', () => {
  const weather = { initialPreset: 'storm', baseVisibility: { fogBase: .0001, fogSea: .0002, fogFalloff: 1/300 }, minimumTransmittance: .1 };
  const prefs = [{ quality: 'high', reducedMotion: false, lightning: 'reduced' }, { quality: 'low', reducedMotion: true, lightning: 'off' }];
  const a = setup({ weather, preferences: prefs }), b = setup({ weather, preferences: prefs });
  for (const f of [a, b]) { f.app.join(actorA); f.app.join(actorB); }
  for (let i = 0; i < 10; i++) a.advance(50);
  b.advance(250); b.advance(250);
  assert.deepEqual(a.app.snapshot(actorA), b.app.snapshot(actorA)); assert.equal(a.steps.length, 10);
  assert.deepEqual(a.steps.map(s => s.environment.simulationMs), [0, 50, 100, 150, 200, 250, 300, 350, 400, 450]);
  const safe = a.app.snapshot(actorA), high = a.targets.get('alice').frames.at(-1), low = a.targets.get('bob').frames.at(-1);
  assert.equal(high.simulationMs, safe.tick*50); assert.deepEqual(high.visibility, safe.environment.visibility);
  assert.deepEqual(high.visibility, low.visibility); assert.deepEqual(high.weather.wind, low.weather.wind);
  assert.equal(low.weather.presentation.rainParticles, 0); assert(high.weather.presentation.rainParticles > 0);
  assert.equal(visualTransmittance(high.visibility, [0, 0, 0], [100, 0, 0]), visualTransmittance(safe.environment.visibility, [0, 0, 0], [100, 0, 0]));
  a.app.setPaused(identity, true); const paused = a.app.snapshot(actorA); a.advance(250);
  assert.deepEqual(a.app.snapshot(actorA), paused); assert.equal(a.steps.length, 10);
  a.restart(); assert.equal(a.app.snapshot(actorA).environment.simulationMs, 0);
  assert.equal(a.targets.get('alice').frames.at(-1).simulationMs, 0);
  a.dispose(); b.dispose();
});
await check('visual aircraft acquisition uses the SAME composed visibility density as presentation', () => {
  for (const fog of [false, true]) {
    const f = setup({ aircraftAcquisition: 'visual', weather: { initialPreset: fog ? 'fog' : 'clear',
      baseVisibility: { fogBase: fog ? .003 : 0, fogSea: fog ? .003 : 0, fogFalloff: 1/300 }, minimumTransmittance: .9 } });
    f.app.join(actorA); assert(f.app.request(actorA, { type: 'spawn', kind: 'planeA' }).ok);
    const safe = f.app.snapshot(actorA);
    // Trusted host scenario placement, never a reconstructed hidden pose supplied to presentation.
    const enemy = f.app.world(identity).staging().find(u => u.team === 1 && u.capital);
    if (fog) assert(!safe.units.some(u => u.team === 1));
    const pose = { origin: [enemy.position[0], 2, enemy.position[2]-150], aim: [enemy.position[0], 2, enemy.position[2]] };
    f.setPose(pose);
    const rendered = f.targets.get('alice').frames.at(-1);
    assert.deepEqual(rendered.visibility, safe.environment.visibility);
    assert.equal(visualTransmittance(rendered.visibility, pose.origin, pose.aim) >= safe.environment.minimumTransmittance, !fog);
    const result = f.app.attack(actorA, { weapon: 'airGun' }); assert.equal(result.ok, !fog);
    if (fog) assert.match(result.error, /visibility/i);
    f.dispose();
  }
});
await check('actual model clones are independent, caller resources unchanged, and leave/failure/dispose clean all clients', () => {
  const f = setup(); f.app.join(actorA); f.app.join(actorAlly); f.app.join(actorB);
  const a = f.targets.get('alice'), ally = f.targets.get('ally');
  const first = container(a, 'capital0'), second = container(ally, 'capital0');
  assert.notEqual(first, second); assert.notEqual(first.getObjectByName('main_turret_yaw'), second.getObjectByName('main_turret_yaw'));
  const before = second.getObjectByName('main_turret_yaw').quaternion.clone();
  first.getObjectByName('main_turret_yaw').quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), .4);
  assert(second.getObjectByName('main_turret_yaw').quaternion.equals(before));
  f.app.request(actorA, { type: 'spawn', kind: 'planeA' }); a.fail = true;
  f.advance(50); assert.equal(f.app.stats().clients, 2); assert.equal(a.parent.children.length, 0);
  assert.equal(f.app.snapshot(actorAlly).aircraft.length, 0);
  f.app.leave(actorAlly); assert.equal(ally.parent.children.length, 0);
  const last = f.targets.get('bob'); f.dispose(); assert.equal(last.parent.children.length, 0);
  assert.equal(modelDisposals, 0); assert.deepEqual(geometryState(), originalGeometry);
});
await check('invalid world root, skinned input, preferences and late binding fail closed without caller-resource disposal', () => {
  function make(changes = {}) {
    return createFactionsComposition({ mode: 'factions', mapId: MAP_IDS[0], seed: 71,
      profiles: surfaceProfiles(), models, aircraft: [[{ id: 'planeA', weapons: [] }], [{ id: 'planeB', weapons: [] }]],
      weather: { seed: 31, initialPreset: 'clear' }, host: { identity, authenticate: actor => credentials.get(actor),
        deriveAircraftAttack() { throw new Error('No aircraft attack in invalid-input test'); } }, THREE: T,
      createPresentation() { throw new Error('Presentation must not be created for invalid model input'); }, ...changes });
  }
  const tagged = models[0].object.clone(true); let mesh;
  tagged.traverse(node => { if (!mesh && node.isMesh) mesh = node; });
  tagged.add(new T.SkinnedMesh(mesh.geometry, mesh.material));
  assert.throws(() => make({ models: [{ ...models[0], object: tagged }, ...models.slice(1)] }), /rigid|skinned/i);
  for (const failure of ['world-root', 'preferences', 'binding']) {
    const parent = new T.Group(); if (failure === 'world-root') parent.position.x = 1;
    const prepared = failure === 'binding' ? models.map((m, i) => i === 1 ? {
      ...m, descriptor: { ...m.descriptor, root: 'missing_actual_root' },
    } : m) : models;
    const app = make({ models: prepared, createPresentation() { return { parent,
      presentation: failure === 'preferences' ? { quality: 'ultra' } : {}, applyEnvironment() {} }; } });
    live.add(app); app.start(identity);
    assert.throws(() => app.join(actorA), failure === 'world-root' ? /world frame/ : failure === 'preferences' ? /presentation/ : /Missing actual root/);
    assert.equal(parent.children.length, 0, `No partial rig survives ${failure}`);
    app.dispose(identity); live.delete(app);
  }
  assert.equal(modelDisposals, 0); assert.deepEqual(geometryState(), originalGeometry);
  assert.deepEqual(transformState(), originalTransforms);
});
await check('valid mixed six-role fixture animates real submarines without exposing hostile submerged model/muzzle/effects', () => {
  const f = setup({ profiles: mixedProfiles() }); f.app.join(actorA); f.app.join(actorB);
  const depths = [], target = f.targets.get('alice');
  for (let i = 0; i < 30; i++) {
    f.advance(50); const safe = f.app.snapshot(actorA), own = safe.units.find(u => u.id === 'sub0');
    depths.push(own.position[1]); close(container(target, own.id).position.toArray(), own.position);
    assert(!safe.units.some(u => u.id === 'sub1')); assert.equal(container(target, 'sub1').visible, false);
    assert.equal(visibleAnchor(target, 'sub1', sub.launch_origins[0].node), null);
    assert(!safe.events.some(e => e.source === 'sub1' || e.unit === 'sub1'));
    assert(own.view.spinners.propulsion_rotor.rateRadS > 0);
    for (const name of ['stern_dive_port', 'bow_dive_starboard']) {
      assert(own.view.angles[name] > 0);
      const control = sub.articulation.find(c => c.node === name), node = container(target, own.id).getObjectByName(name);
      const q = new T.Quaternion(...control.rest_rotation).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...control.axis_local), own.view.angles[name]));
      assert(1-Math.abs(node.quaternion.dot(q)) < 1e-6);
    }
  }
  assert(depths.every((depth, i) => !i || depth > depths[i-1])); f.dispose();
});
await check('all-measured six roles reject absent escort ASW mount/counterplay without stripping modelId', () => {
  const profiles = mixedProfiles();
  for (const u of profiles.filter(u => u.capital)) u.modelId = u.team ? 'type054' : 'type45';
  assert(profiles.every(u => u.modelId));
  assert.throws(() => setup({ profiles }), /mount|capability|counterplay/i);
  assert(profiles.every(u => u.modelId));
});
await check('actual weather-node consumer follows session time and cleans up once on leave/fault/disposal/setup rejection', async () => {
  const TSL = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.tsl.js')).href);
  const { createWeatherView } = await import('./weather/weather-view.mjs');
  for (const mode of ['leave', 'fault', 'dispose', 'rig-error', 'preferences', 'world-root', 'cleanup-error']) {
    const records = new Map();
    const f = setup({ weather: { initialPreset: 'rain' }, presentationFactory(principal) {
      const scene = new T.Scene(), sun = new T.DirectionalLight(0xffffff, 4);
      const ambient = new T.HemisphereLight(0xffffff, 0x222222, 3);
      const previousFog = TSL.fog(TSL.vec3(.2, .2, .2), TSL.float(0));
      scene.fogNode = previousFog; scene.add(sun, ambient);
      if (mode === 'world-root') scene.position.x = 1;
      const view = createWeatherView(T, TSL, { scene, sun, ambient,
        sampleDaylight: simulationMs => ({ sunIntensity: 2 + simulationMs/1000,
          ambientIntensity: 3, fogColor: [.3, .4, .5] }) });
      const record = { scene, sun, ambient, previousFog, view, disposals: 0, fail: false };
      records.set(principal.playerId, record);
      return { parent: scene, presentation: ['preferences', 'cleanup-error'].includes(mode) ? { quality: 'ultra' } : {},
        applyEnvironment(frame) { if (record.fail) throw new Error('weather consumer unavailable'); view.applyEnvironment(frame); },
        dispose() { record.disposals++; view.dispose(); if (mode === 'cleanup-error') throw new Error('host cleanup unavailable'); } };
    } });
    if (['preferences', 'world-root', 'cleanup-error'].includes(mode)) {
      assert.throws(() => f.app.join(actorA), error => mode === 'cleanup-error' ?
        error instanceof AggregateError && error.errors.length === 2 : /presentation|world frame/.test(error.message));
    } else {
      f.app.join(actorA); f.app.join(actorB);
      const a = records.get('alice'), node = a.scene.fogNode;
      assert.notEqual(node, a.previousFog); assert.equal(a.sun.intensity, .8);
      f.advance(50); assert.equal(a.scene.fogNode, node);
      assert(Math.abs(a.sun.intensity - 2.05*.4) < 1e-10);
      const pausedSun = a.sun.intensity;
      f.app.setPaused(identity, true); f.advance(250);
      assert.equal(a.sun.intensity, pausedSun); assert.equal(a.scene.fogNode, node);
      f.app.setPaused(identity, false);
      if (mode === 'leave') f.app.leave(actorA);
      if (mode === 'fault') { a.fail = true; f.advance(50); assert.equal(f.app.stats().clients, 1); }
      if (mode === 'dispose') f.dispose();
      if (mode === 'rig-error') {
        assert(f.app.request(actorA, { type: 'spawn', kind: 'planeA' }).ok);
        const enemy = f.app.snapshot(actorB).units.find(u => u.id === 'capital1');
        f.setPose({ origin: [enemy.position[0], 2, enemy.position[2]-150], aim: [enemy.position[0], 2, enemy.position[2]] });
        assert(f.app.attack(actorA, { weapon: 'airGun' }).ok);
        const projectile = a.scene.getObjectByName('fleet-projectile:1'); assert(projectile);
        projectile.geometry.addEventListener('dispose', () => { throw new Error('backend geometry disposal failed'); });
        assert(f.app.leave(actorA).ok); assert.equal(f.app.stats().viewFailures, 1);
        assert.equal(a.view.stats().disposed, true, 'Weather cleanup runs despite the rig exception');
      }
      assert.equal(a.disposals, 1); assert.equal(a.scene.fogNode, a.previousFog);
      assert.equal(a.sun.intensity, 4); assert.equal(a.ambient.intensity, 3);
      assert.equal(a.scene.children.length, 2, 'Caller lights remain; fleet rig is removed');
    }
    f.dispose(); f.dispose();
    for (const record of records.values()) {
      assert.equal(record.disposals, 1); assert.equal(record.scene.fogNode, record.previousFog);
      assert.equal(record.sun.intensity, 4); assert.equal(record.ambient.intensity, 3);
      assert.equal(record.scene.children.length, 2);
    }
  }
});
await check('model input files, original eleven assets and caller mesh/material resources remain exact', async () => {
  assert.deepEqual(geometryState(), originalGeometry); assert.deepEqual(transformState(), originalTransforms);
  assert.equal(modelDisposals, 0);
  for (const [file, expected] of sourceHashes) assert.equal(sha(await read(file)), expected);
  for (const [name, expected] of Object.entries(manifest.existing_model_sha256)) assert.equal(sha(await read('models/'+name)), expected);
});
for (const model of models) model.object.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
console.log(`COMPOSITION CPU RESULT: ${passed} passed / ${failed} failed groups; ${triangles} actual model triangles; no browser/build/native/decoded-texture or served-game acceptance.`);
if (failed) process.exitCode = 1;
