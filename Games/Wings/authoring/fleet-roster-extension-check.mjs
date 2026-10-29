// CPU only: actual factory/core/host/GLB geometry and factor PBR. No decoded texels, GPU or human flight claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLocalFleetConfig, LOCAL_MODEL_ASSETS, COALITION_MODEL_ASSETS } from './local-host-scenario.mjs';
import { COALITIONS, coalitionPair } from './coalition-rosters.mjs';
import { createFleet } from './fleet-sim.mjs';
import { createWeather } from './weather/weather.mjs';
import { compileGeometry, clearanceBounds, fittedBounds, fittedTargets, fittedHeightAt, mountPose, fittedHit, solveMount, yawRotate } from './fleet-geometry.mjs';
import { createFleetRig } from './fleet-rig.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';

if (!process.env.THREE_ROOT) throw Error('Set THREE_ROOT to the existing approved Three 0.186.0 package; install nothing.');
const T = await import(new URL('build/three.webgpu.js', pathToFileURL(resolve(process.env.THREE_ROOT) + '/')));
assert.equal(T.REVISION, '186');
const hash = data => createHash('sha256').update(data).digest('hex');
const base = new URL('../', import.meta.url), read = file => readFileSync(new URL(file, base));
const near = (a, b, epsilon = 1e-5) => assert(a.every((n, i) => Math.abs(n - b[i]) < epsilon), `${a} != ${b}`);
const loader = installRetainedHostLoader();
const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
const { TICK_DT } = await import(new URL('src/sim/types.ts', retainedRoot));
const { VEHICLES, VEHICLE_KINDS, NATIVE_HELICOPTER_MODELS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
const { isWater, terrainHeight, setFleetState } = await import(new URL('src/sim/geography.ts', retainedRoot));
let groups = 0, waterProbes = 0, heightProbes = 0, separationProbes = 0, poseProbes = 0, tunnelProbes = 0;
const receipts = [], failures = [], frames = createHash('sha256');
function requireEvidence(condition, message) {
  if (!condition) { failures.push(message); console.error(`FAIL ${message}`); }
}
const placementDiagnostic = process.argv.includes('--placement-correction');
const endpointX = placementDiagnostic ? 260 : 180;
function namedConfig(id) {
  const config = createLocalFleetConfig(id);
  if (placementDiagnostic) for (const u of config.units) {
    u.route[0][0] = u.team ? endpointX : -endpointX;
    if (!u.capital) { u.position[2] = 2696; u.route[0][2] = 2696; }
  }
  return config;
}
if (placementDiagnostic) console.log('DIAGNOSTIC ONLY: proposed named endpoint X +/-260; escort Z=2696 horizontal lane (30m initial shift); NOT production formation acceptance.');
const geometries = new Map(COALITION_MODEL_ASSETS.map(a => [a.id, compileGeometry(a.descriptor)]));
const radius = g => Math.max(...[g.clearance.min[0], g.clearance.max[0]].flatMap(x =>
  [g.clearance.min[2], g.clearance.max[2]].map(z => Math.hypot(x, z))));
const models = new Map();
const carrierIds = ['cdg', 'qe', 'liaoning', 'kuz'];
const isCarrier = id => carrierIds.includes(id);
const unarmed = id => ['cb90', 'type022', ...carrierIds].includes(id);
const oldArena = { minX: -1800, maxX: 2000, minZ: 2600, maxZ: 3200, bottomY: -40, cell: 20, obstacles: [] };
const namedArena = { ...oldArena, minX: -2350, maxX: 2750, minZ: 2500, maxZ: 3300 };
function pass(name) { groups++; console.log(`PASS ${name}`); }
function seaRect(minX, maxX, minZ, maxZ, include = () => true, keelY = 0) {
  const nx = Math.ceil((maxX - minX) / 5), nz = Math.ceil((maxZ - minZ) / 5);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = minX + (maxX - minX) * i / nx, z = minZ + (maxZ - minZ) * j / nz;
    if (!include(x, z)) continue;
    waterProbes++;
    assert(terrainHeight(x, z) < keelY && isWater(x, z), `native water/seabed blocked at ${x},${z}; terrain=${terrainHeight(x, z)}, keel=${keelY}`);
  }
}
function bounds(unit, full = true) {
  const heading = 2 * Math.atan2(unit.view.orientation[1], unit.view.orientation[3]);
  const b = (full ? clearanceBounds : fittedBounds)(geometries.get(unit.modelId), heading);
  return { min: b.min.map((n, i) => n + unit.position[i]), max: b.max.map((n, i) => n + unit.position[i]) };
}
function validateFrame(snapshot, config, binding) {
  for (const u of snapshot.units.filter(u => u.alive)) {
    const g = geometries.get(u.modelId), b = bounds(u), a = config.arena;
    assert(b.min[0] >= a.minX && b.max[0] <= a.maxX && b.min[2] >= a.minZ && b.max[2] <= a.maxZ && b.min[1] > a.bottomY,
      `full/swept hull outside arena: ${u.id} ${JSON.stringify(b)}`);
    if (snapshot.tick % 20 === 0) seaRect(b.min[0], b.max[0], b.min[2], b.max[2], () => true, b.min[1]);
    const heading = 2 * Math.atan2(u.view.orientation[1], u.view.orientation[3]);
    const box = g.boxes[0], center = box.min.map((n, i) => (n + box.max[i]) / 2);
    const target = fittedTargets(g, u.position, heading)[0];
    assert(fittedHeightAt(g, target[0], target[2], u.position, heading) >= u.position[1] + box.max[1]);
    assert(center.every(Number.isFinite)); heightProbes++;
    if (binding) {
      const expected = mountPose(g, u.position, heading, 'main_gun', u.view.angles);
      const actual = binding.rig.muzzleWorld(u.id);
      if (g.gun) {
        near(actual.position, expected.position); near(actual.direction, expected.direction); poseProbes++;
      } else {
        assert.equal(expected, null); assert.equal(actual, null);
        assert.deepEqual(u.view.angles, {});
        if (!isCarrier(u.modelId)) assert.deepEqual(u.view.spinners, {});
        else {
          assert.equal(Object.keys(u.view.spinners).length, snapshot.tick === 0 ? 0 : u.modelId === 'cdg' ? 2 : 4);
          if (snapshot.tick > 0 && snapshot.tick <= 300)
            assert(Object.values(u.view.spinners).every(spin => spin.rateRadS > 0 && spin.rateRadS <= 8));
        }
        assert(!snapshot.events.some(e => e.type === 'fire' && e.source === u.id));
      }
      const object = binding.objects.get(u.id);
      for (const c of g.controls) {
        const spin = u.view.spinners[c.node];
        const angle = c.limits_rad ? (u.view.angles[c.node] ?? 0) : spin ?
          (spin.phaseRad + spin.rateRadS * (snapshot.tick * .05 + snapshot.remainderMs / 1000 - spin.epochSeconds)) % (2 * Math.PI) : 0;
        const expectedQ = models.get(u.modelId).getObjectByName(c.node).quaternion.clone()
          .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...c.axis_local), angle));
        assert(object.getObjectByName(c.node).quaternion.angleTo(expectedQ) < 1e-6, `actual control pose ${u.id}/${c.node}`);
      }
    }
  }
  for (const team of [0, 1]) {
    const units = snapshot.units.filter(u => u.team === team && u.alive);
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      const a = units[i], b = units[j], clearance = radius(geometries.get(a.modelId)) + radius(geometries.get(b.modelId));
      if ([a.modelId, b.modelId].includes('type022')) {
        const ab = bounds(a), bb = bounds(b);
        assert(Math.max(ab.min[0] - bb.max[0], bb.min[0] - ab.max[0], ab.min[2] - bb.max[2], bb.min[2] - ab.max[2]) > 0,
          `friendly actual-oriented full/swept overlap ${a.id}/${b.id}`);
      } else assert(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) > clearance,
        `friendly all-heading overlap ${a.id}/${b.id}`);
      separationProbes++;
    }
  }
}
function bindModels(config) {
  const parent = new T.Scene(), rig = createFleetRig(T, { parent, team: 0 }), objects = new Map();
  for (const u of config.units) {
    const object = models.get(u.modelId).clone(true); objects.set(u.id, object);
    rig.bindUnit(u.id, object, geometries.get(u.modelId).descriptor);
  }
  return { rig, objects };
}
function setup(config) {
  const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters: config.aircraft.map(r => r.map(a => a.id)) });
  const room = createLoopbackRoom({ bots: 0, botFill: false, teams: 2, timeLimit: 180 }, 'Ten actual vessels', {},
    { manual: true, hostBridge: bridge });
  return { room, bridge, snapshot: () => bridge.snapshot(room.engine, room.playerId) };
}
try {
  // Execute the actual pre-edit factory, with only its relative imports resolved for a data URL.
  const oldSource = execFileSync('git', ['show', '2de5013c:Games/Wings/authoring/local-host-scenario.mjs'], { encoding: 'utf8' });
  assert.equal(hash(oldSource), 'da0157f5a7e9d5a0efd30ff3b24b1f7537dc8a46a4672b28882c570d4ce6f48b');
  const baseline = await import('data:text/javascript;base64,' + Buffer.from(oldSource.replace(/from '(\.\/[^']+)'/g,
    (_, file) => `from '${new URL(file, import.meta.url).href}'`)).toString('base64'));
  assert.deepEqual(createLocalFleetConfig(), baseline.createLocalFleetConfig());
  assert.deepEqual(LOCAL_MODEL_ASSETS, baseline.LOCAL_MODEL_ASSETS);
  assert.equal(COALITION_MODEL_ASSETS.length, 10);
  assert.equal(new Set(COALITION_MODEL_ASSETS.map(a => a.descriptor.source_model_id)).size, 10);
  assert.throws(() => createLocalFleetConfig('unknown'), /Unknown coalition/);
  pass('executable 2de5013c legacy config and ordered asset export exact parity');
  const historical = (file) => execFileSync('git', ['show', `0bde3e54:Games/Wings/authoring/${file}`], { encoding: 'utf8' });
  const dataURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
  const rebase = text => text.replace(/from '(\.\/[^']+)'/g, (_, file) => `from '${new URL(file, import.meta.url).href}'`);
  const oldCoalition = dataURL(rebase(historical('coalition-rosters.mjs')));
  const oldManifest = 'data:application/json;base64,' + Buffer.from(historical('extended-escort-models.json')).toString('base64');
  const oldFactorySource = historical('local-host-scenario.mjs');
  assert.equal(hash(oldFactorySource), 'ae6c0a79fa236ce3c3917bc11e95e4792f5097c0becbec5a6a27d403072811ed');
  const oldFactory = await import(dataURL(rebase(oldFactorySource
    .replace('./coalition-rosters.mjs', oldCoalition).replace('./extended-escort-models.json', oldManifest))));
  for (const own of COALITIONS) {
    const fresh = createLocalFleetConfig(own.id);
    assert.deepEqual(fresh.arena, namedArena); fresh.arena = structuredClone(oldArena);
    fresh.units = fresh.units.filter(u => !unarmed(u.modelId));
    fresh.geometry = fresh.geometry.filter(g => !unarmed(g.id));
    const previous = oldFactory.createLocalFleetConfig(own.id);
    for (const team of [0, 1]) assert.deepEqual(fresh.aircraft[team].slice(0, previous.aircraft[team].length), previous.aircraft[team],
      'all historical aircraft entries remain an exact prefix');
    // Fleet parity excludes only the separately validated appended aircraft kinds.
    fresh.aircraft = previous.aircraft;
    assert.deepEqual(fresh, previous);
  }
  const currentHistorical = file => execFileSync('git', ['show', `39d97e02:Games/Wings/authoring/${file}`], { encoding: 'utf8' });
  const pinnedCoalition = dataURL(rebase(currentHistorical('coalition-rosters.mjs')));
  const pinnedManifest = 'data:application/json;base64,' + Buffer.from(currentHistorical('extended-escort-models.json')).toString('base64');
  const pinnedSource = currentHistorical('local-host-scenario.mjs');
  assert.equal(hash(pinnedSource), '1c685a950c7aea5a4e53d0c9e89ae60dcdc7454e57e907ed609004727e75492f');
  const currentFactory = await import(dataURL(rebase(pinnedSource.replace('./coalition-rosters.mjs', pinnedCoalition)
    .replace('./extended-escort-models.json', pinnedManifest))));
  assert.deepEqual(LOCAL_MODEL_ASSETS, currentFactory.LOCAL_MODEL_ASSETS);
  assert.deepEqual(COALITION_MODEL_ASSETS.filter(a => a.id !== 'type022' && !isCarrier(a.id)), currentFactory.COALITION_MODEL_ASSETS);
  for (const own of COALITIONS) {
    const fresh = createLocalFleetConfig(own.id);
    assert.deepEqual(fresh.arena, namedArena); fresh.arena = structuredClone(oldArena);
    fresh.units = fresh.units.filter(u => u.modelId !== 'type022' && !isCarrier(u.modelId));
    fresh.geometry = fresh.geometry.filter(g => g.id !== 'type022' && !isCarrier(g.id));
    const previous = currentFactory.createLocalFleetConfig(own.id);
    for (const team of [0, 1]) assert.deepEqual(fresh.aircraft[team].slice(0, previous.aircraft[team].length), previous.aircraft[team],
      'all twelve historical aircraft entries remain an exact prefix');
    fresh.aircraft = previous.aircraft;
    assert.deepEqual(fresh, previous, 'all five historical vessels and prior aircraft exact full-field parity');
  }
  // Pin the immediately preceding six-vessel config, including every old field.
  const sixHistorical = file => execFileSync('git', ['show', `87136b41:Games/Wings/authoring/${file}`], { encoding: 'utf8' });
  const sixCoalition = dataURL(rebase(sixHistorical('coalition-rosters.mjs')));
  const sixManifest = 'data:application/json;base64,' + Buffer.from(sixHistorical('extended-escort-models.json')).toString('base64');
  const sixFactory = await import(dataURL(rebase(sixHistorical('local-host-scenario.mjs')
    .replace('./coalition-rosters.mjs', sixCoalition).replace('./extended-escort-models.json', sixManifest))));
  for (const own of COALITIONS) {
    const fresh = createLocalFleetConfig(own.id), previous = sixFactory.createLocalFleetConfig(own.id);
    assert.deepEqual(previous.arena, oldArena); assert.deepEqual(fresh.arena, namedArena);
    assert.deepEqual(fresh.units.slice(0, 6), previous.units, 'six old units exact full-field ordered prefix');
    assert.deepEqual(fresh.geometry.slice(0, 6), previous.geometry, 'six old descriptors exact prefix');
    assert.equal(fresh.units.length, 10); assert(fresh.units.slice(6).every(u => isCarrier(u.modelId)));
    for (const team of [0, 1]) {
      assert.deepEqual(fresh.aircraft[team].slice(0, previous.aircraft[team].length), previous.aircraft[team]);
      const appended = fresh.aircraft[team].slice(previous.aircraft[team].length);
      assert.deepEqual(appended, coalitionPair(own.id)[team].id === 'eastern' ?
        [{ id: 'j20', weapons: [] }, { id: 'tu160', weapons: [] }, { id: 'mi28n', weapons: [] }] : [{ id: 'ah64d', weapons: [] }]);
    }
    const j20 = JSON.parse(read('authoring/native-fighter-pair.json')).models.j20;
    assert.equal(j20.source_model_id, 'wings.original.j-20.v1');
    assert.equal(JSON.parse(read('authoring/native-tu160.json')).models.tu160.source_model_id, 'wings.original.tu-160.v1');
    fresh.units = fresh.units.slice(0, 6); fresh.geometry = fresh.geometry.slice(0, 6);
    fresh.arena = previous.arena; fresh.aircraft = previous.aircraft;
    assert.deepEqual(fresh, previous, 'only explicit arena expansion, four appended hulls and validated J20/Tu160 differ');
  }
  const priorCoalition = dataURL(rebase(execFileSync('git', ['show', '3ea48c9e:Games/Wings/authoring/coalition-rosters.mjs'], { encoding: 'utf8' })));
  const priorFactory = await import(dataURL(rebase(execFileSync('git', ['show', '3ea48c9e:Games/Wings/authoring/local-host-scenario.mjs'], { encoding: 'utf8' })
    .replace('./coalition-rosters.mjs', priorCoalition))));
  assert.equal(VEHICLE_KINDS.length, 27);
  assert.deepEqual(VEHICLE_KINDS.slice(25), ['ah64d', 'mi28n']);
  const helicopterModels = JSON.parse(read('authoring/native-helicopter-pair.json')).models;
  const lookup = JSON.parse(read('authoring/supplied-fighters/roster_lookup.json'));
  for (const own of COALITIONS) {
    const fresh = createLocalFleetConfig(own.id), previous = priorFactory.createLocalFleetConfig(own.id);
    for (const [team, profile] of coalitionPair(own.id).entries()) {
      const kind = profile.id === 'nato' ? 'ah64d' : 'mi28n';
      const source = profile.id === 'nato' ? 'wings.original.ah-64d-apache.v1' : 'wings.original.mi-28n.v1';
      assert.equal(previous.aircraft[team].length, 9);
      assert.deepEqual(fresh.aircraft[team].slice(0, 9), previous.aircraft[team], 'all prior eighteen entries exact');
      assert.deepEqual(fresh.aircraft[team].slice(9), [{ id: kind, weapons: [] }]);
      assert.equal(helicopterModels[kind].source_model_id, source);
      assert.deepEqual(NATIVE_HELICOPTER_MODELS[kind], helicopterModels[kind]);
      assert.equal(VEHICLES[kind].flight, 'heli');
      assert.equal(VEHICLES[kind].model, helicopterModels[kind].file);
      assert(lookup.factions.some(row => row.faction === profile.side && row.model_id === source));
      assert(profile.aircraftModels.includes(source));
      assert.equal(hash(read(helicopterModels[kind].file)), helicopterModels[kind].sha256);
    }
    fresh.aircraft = previous.aircraft;
    assert.deepEqual(fresh, previous, 'every non-aircraft fleet field exact against pre-helicopter source');
  }
  const factorySource = readFileSync(new URL('./local-host-scenario.mjs', import.meta.url), 'utf8');
  const manifest = JSON.parse(read('authoring/extended-escort-models.json'));
  for (const mutate of [m => { m.models.pop(); }, ...[2, 3, 4, 5, 6, 7].flatMap(i => [
    m => { m.models[i].source_model_id = 'unknown'; }, m => { m.models[i] = structuredClone(m.models[0]); }])]) {
    const invalid = structuredClone(manifest); mutate(invalid);
    const url = 'data:application/json;base64,' + Buffer.from(JSON.stringify(invalid)).toString('base64');
    await assert.rejects(import(dataURL(rebase(factorySource.replace('./extended-escort-models.json', url)))), /descriptors required|model binding/);
  }
  const wrongCoalition = dataURL(rebase(historical('coalition-rosters.mjs').replace("id: 'type45', source: 'wings.original.wings_type45_daring_class.v1'",
    "id: 'aquitaine', source: 'wings.original.wings_type45_daring_class.v1'")));
  const wrongFactory = await import(dataURL(rebase(factorySource.replace('./coalition-rosters.mjs', wrongCoalition))));
  assert.throws(() => wrongFactory.createLocalFleetConfig('nato'), /source mismatch/);
  pass('executable old four/five/six full-field ordered parity, separate explicit arena bounds/aircraft prefix/J20; wrong/unknown/duplicate bindings fail closed');

  function actualMeshFraction(object, from, to) {
    object.updateMatrixWorld(true);
    const start = new T.Vector3(...from), delta = new T.Vector3(...to).sub(start), length = delta.length();
    const ray = new T.Ray(start, delta.normalize()), point = new T.Vector3();
    let fraction = null;
    object.traverse(node => {
      if (!node.isMesh) return;
      const position = node.geometry.attributes.position, index = node.geometry.index;
      for (let i = 0; i < (index?.count ?? position.count); i += 3) {
        const vertices = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(node.matrixWorld));
        if (!ray.intersectTriangle(...vertices, false, point)) continue;
        const t = point.distanceTo(start) / length;
        if (t <= 1 && (fraction === null || t < fraction)) fraction = t;
      }
    });
    return fraction;
  }
  for (const asset of COALITION_MODEL_ASSETS) {
    const bytes = read(asset.url); assert.equal(hash(bytes), asset.descriptor.sha256);
    assert.equal(bytes.length, asset.descriptor.bytes);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert(doc.buffers.every(b => !b.uri)); assert((doc.images ?? []).every(i => !i.uri));
    const fixture = modelGeometryFixture(T, bytes); assert(fixture.triangleCount > 0);
    models.set(asset.id, fixture.object);
    if (asset.id === 'cb90') {
      assert.equal(fixture.triangleCount, 2630); assert.equal(doc.images.length, 3);
      assert.equal(doc.textures.length, 3);
      assert(doc.materials.some(m => m.pbrMetallicRoughness?.baseColorTexture));
      assert(doc.materials.some(m => m.pbrMetallicRoughness?.metallicRoughnessTexture));
      assert(doc.materials.some(m => m.normalTexture));
      const g = geometries.get('cb90'); assert.equal(g.gun, null); assert.deepEqual(g.launches, []);
      assert.equal(g.controls.length, 1); assert(g.controls[0].limits_rad);
      assert.match(g.controls[0].node, /ramp/i);
      assert.equal(mountPose(g, [0, 0, 0], 0, 'main_gun'), null);
      assert.equal(solveMount(g, [0, 0, 0], 0, 'main_gun', [0, 0, 100]), null);
    }
    if (asset.id === 'type022') {
      assert.equal(fixture.triangleCount, 2988); assert.equal(doc.images.length, 3); assert.equal(doc.textures.length, 3);
      for (const slot of ['baseColorTexture', 'metallicRoughnessTexture']) assert(doc.materials.some(m => m.pbrMetallicRoughness?.[slot]));
      assert(doc.materials.some(m => m.normalTexture));
      const g = geometries.get('type022');
      assert.equal(g.gun, null); assert.deepEqual(g.controls, []); assert.deepEqual(g.launches, []);
      assert.equal(mountPose(g, [0, 0, 0], 0, 'main_gun'), null);
      assert.equal(solveMount(g, [0, 0, 0], 0, 'main_gun', [0, 0, 100]), null);
      const actualBounds = new T.Box3().setFromObject(fixture.object);
      near(actualBounds.min.toArray(), asset.descriptor.bounds.min);
      near(actualBounds.max.toArray(), asset.descriptor.bounds.max);
      const pontoons = g.boxes.filter(b => b.min[1] < 0 && b.max[1] > 0);
      assert.equal(pontoons.length, 2, 'exactly two actual waterline pontoons');
      assert(pontoons.some(b => b.max[0] < 0) && pontoons.some(b => b.min[0] > 0), 'central waterline tunnel stays empty');
      const bridge = g.boxes.find(b => b.min[0] < 0 && b.max[0] > 0 && b.min[1] > 0);
      assert(bridge, 'actual elevated bridge component required');
      for (const heading of [0, Math.PI / 2, -Math.PI / 2, .37, Math.PI]) for (const position of [[0, 0, 0], [721, 0, 2630]]) {
        fixture.object.position.fromArray(position); fixture.object.rotation.y = heading;
        const world = p => yawRotate(p, heading).map((n, i) => n + position[i]);
        const checks = [
          { from: [0, 0, g.clearance.min[2] - 5], to: [0, 0, g.clearance.max[2] + 5], hit: false },
          ...[...pontoons, bridge].map(b => {
            const center = b.min.map((n, i) => (n + b.max[i]) / 2);
            return { from: [center[0], center[1], g.clearance.min[2] - 5], to: [center[0], center[1], g.clearance.max[2] + 5], hit: true };
          }),
        ];
        for (const check of checks) {
          const from = world(check.from), to = world(check.to);
          const actual = actualMeshFraction(fixture.object, from, to), fitted = fittedHit(g, from, to, position, heading);
          assert.equal(actual !== null, check.hit, 'actual source mesh tunnel/component ray');
          assert.equal(fitted !== null, check.hit, 'fitted tunnel/component ray');
          if (check.hit) assert(Math.abs(actual - fitted) < 1e-5, `actual source/fitted fraction ${actual}/${fitted}`);
          tunnelProbes++;
        }
      }
      fixture.object.position.set(0, 0, 0); fixture.object.rotation.set(0, 0, 0);
      console.log(`  Type022 actual mesh/fitted tunnel misses and two pontoon/elevated bridge hits: ${tunnelProbes} rotated/translated rays`);
    }
    if (isCarrier(asset.id)) {
      const g = geometries.get(asset.id);
      assert.equal(g.gun, null); assert.deepEqual(g.launches, []);
      assert.equal(g.controls.length, asset.id === 'cdg' ? 2 : 4);
      assert(g.controls.every(c => c.limits_rad == null && /propeller/.test(c.node)));
      assert.equal(mountPose(g, [0, 0, 0], 0, 'main_gun'), null);
      assert.equal(solveMount(g, [0, 0, 0], 0, 'main_gun', [0, 0, -100]), null);
      // Exact component top, not a whole-footprint mast-height proxy.
      for (const heading of [0, .37, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const position = [411, 0, 2811];
        for (const box of g.boxes) {
          const local = box.min.map((n, i) => (n + box.max[i]) / 2);
          const world = yawRotate(local, heading).map((n, i) => n + position[i]);
          const expected = Math.max(...g.boxes.filter(b => local[0] >= b.min[0] && local[0] <= b.max[0] &&
            local[2] >= b.min[2] && local[2] <= b.max[2]).map(b => b.max[1]));
          assert(Math.abs(fittedHeightAt(g, world[0], world[2], position, heading) - expected) < 1e-8);
          const ray = fittedHit(g, [world[0], 100, world[2]], [world[0], -30, world[2]], position, heading);
          assert(Math.abs(ray - (100 - expected) / 130) < 1e-8); heightProbes++;
        }
        const deck = g.descriptor.collision.deck;
        const p = yawRotate([0, 0, 0], heading).map((n, i) => n + position[i]);
        assert.equal(fittedHeightAt(g, p[0], p[2], position, heading), deck.max[1]);
        const outside = yawRotate([g.clearance.max[0] + 1, 0, g.clearance.max[2] + 1], heading).map((n, i) => n + position[i]);
        assert.equal(fittedHeightAt(g, outside[0], outside[2], position, heading), null);
      }
      console.log(`  carrier ${asset.id}: deck=${asset.descriptor.collision.deck.max[1]}, props=${g.controls.length}, guns=0, launches=0`);
    }
    fixture.object.traverse(node => {
      if (!node.isMesh) return;
      const material = doc.materials.find((m, i) => `CPU-factor-only:${m.name ?? i}` === node.material.name);
      assert(material); const pbr = material.pbrMetallicRoughness ?? {};
      near(node.material.color.toArray(), (pbr.baseColorFactor ?? [1, 1, 1]).slice(0, 3));
      assert.equal(node.material.metalness, pbr.metallicFactor ?? 1);
      assert.equal(node.material.roughness, pbr.roughnessFactor ?? 1);
    });
    console.log(`  actual asset ${asset.id}: ${bytes.length}B/${fixture.triangleCount} triangles SHA256 ${hash(bytes)}`);
  }
  pass('all ten actual embedded GLBs, SHA256, mesh geometry and factor-only PBR');

  for (const own of COALITIONS) {
    const config = namedConfig(own.id), profiles = coalitionPair(own.id);
    assert.equal(config.geometry.length, 10); assert.equal(config.units.length, 10);
    assert.deepEqual(config.units.map(u => u.id), own.id === 'nato' ?
      ['home', 'home-escort', 'home-cb90', 'enemy', 'enemy-escort', 'enemy-type022', 'home-cdg', 'home-qe', 'enemy-liaoning', 'enemy-kuz'] :
      ['home', 'home-escort', 'home-type022', 'enemy', 'enemy-escort', 'enemy-cb90', 'home-liaoning', 'home-kuz', 'enemy-cdg', 'enemy-qe']);
    assert.deepEqual(config.arena, namedArena);
    for (const team of [0, 1]) {
      const units = config.units.filter(u => u.team === team);
      assert.equal(units.filter(u => u.capital).length, 1);
      assert.deepEqual(units.map(u => u.modelId), profiles[team].vessels.map(v => v.id));
      assert.deepEqual(config.aircraft[team], profiles[team].aircraft.map(id => ({ id, weapons: [] })));
      assert.equal(config.aircraft[team].length, 10);
      for (const [i, u] of units.entries()) {
        const asset = COALITION_MODEL_ASSETS.find(a => a.id === u.modelId), g = geometries.get(u.modelId);
        assert.equal(asset.descriptor.source_model_id, profiles[team].vessels[i].source);
        assert.equal(u.capital, profiles[team].vessels[i].capital);
        assert.equal(u.hp, 1000); assert.equal(u.speed, 12); assert.equal(u.sensor, null);
        const boat = ['cb90', 'type022'].includes(u.modelId), boatZ = u.modelId === 'type022' ? 2630 : 2610;
        assert.equal(u.kind, 'surface');
        if (boat) assert.equal(u.capital, false);
        assert.deepEqual(u.weapons, unarmed(u.modelId) ? [] : baseline.createLocalFleetConfig().units[0].weapons);
        if (isCarrier(u.modelId)) {
          const x = team ? 2500 : -2100, z = ['cdg', 'liaoning'].includes(u.modelId) ? 2720 : 3080;
          assert.equal(u.capital, false); assert.deepEqual(u.position, [x, 0, z]);
          assert.deepEqual(u.route, [[x + (team ? -200 : 200), 0, z]]);
        } else {
        assert.deepEqual(u.position, [u.modelId === 'type022' ? (team ? 1740 : -1340) : team ? 1600 : -1200, 0, u.capital ? 2926 : boat ? boatZ : 2696]);
        const routeX = u.modelId === 'type022' ? 400 : boat ? 300 : placementDiagnostic || !u.capital ? 260 : 180;
        assert.deepEqual(u.route, [[(team ? 1 : -1) * routeX, 0, u.capital ? 3100 : boat ? boatZ : 2696]]);
        }
        const r = radius(g), end = u.route[0], a = config.arena;
        // Circle contains every yaw of the full continuous-swept descriptor, not only fitted boxes.
        assert(Math.min(u.position[0], end[0]) - r >= a.minX && Math.max(u.position[0], end[0]) + r <= a.maxX &&
          Math.min(u.position[2], end[2]) - r >= a.minZ && Math.max(u.position[2], end[2]) + r <= a.maxZ,
          `all-yaw route arena ${own.id}/${u.id}, radius=${r}`);
        assert(g.clearance.min[1] > a.bottomY);
        setFleetState(0, 2, true);
        seaRect(Math.min(u.position[0], end[0]) - r, Math.max(u.position[0], end[0]) + r,
          Math.min(u.position[2], end[2]) - r, Math.max(u.position[2], end[2]) + r, (x, z) => {
            const dx = end[0] - u.position[0], dz = end[2] - u.position[2];
            const t = Math.max(0, Math.min(1, ((x - u.position[0]) * dx + (z - u.position[2]) * dz) / (dx * dx + dz * dz)));
            return Math.hypot(x - u.position[0] - t * dx, z - u.position[2] - t * dz) <= r;
          }, g.clearance.min[1]);
        console.log(`  placement ${own.id}/${u.id}: all-yaw radius=${r.toFixed(6)}, Z=${u.position[2]}->${end[2]}`);
      }
    }
    // Every CB90 path point stays at least 86m from Aquitaine and 316m from Type45,
    // independent of relative travel speed, route phase and yaw.
    const boat = config.units.find(u => u.modelId === 'cb90');
    for (const companion of config.units.filter(u => u.team === boat.team && u !== boat && !isCarrier(u.modelId))) {
      const gap = Math.min(companion.position[2], companion.route[0][2]) - boat.position[2];
      const required = radius(geometries.get(boat.modelId)) + radius(geometries.get(companion.modelId));
      assert(gap > required, `complete-path all-yaw CB90 separation ${own.id}/${companion.id}: ${gap} <= ${required}`);
      console.log(`  complete-path separation ${own.id}/${companion.id}: gap=${gap}, required=${required}`);
    }
    // Retain the exact first failure: same-X Type022 at Z2630 overlaps the unchanged
    // core's conservative initial hull guard, despite disjoint actual oriented boxes.
    const proposed = structuredClone(config);
    const proposedBoat = proposed.units.find(u => u.modelId === 'type022');
    proposedBoat.position[0] = proposedBoat.team ? 1600 : -1200;
    proposedBoat.route[0][0] = proposedBoat.team ? 360 : -360;
    assert.throws(() => createFleet(proposed), /Overlapping initial hulls/);
    const catamaran = config.units.find(u => u.modelId === 'type022');
    for (const companion of config.units.filter(u => u.team === catamaran.team && u !== catamaran && !isCarrier(u.modelId))) {
      const g = geometries.get(catamaran.modelId), cg = geometries.get(companion.modelId);
      // The close escort lane has fixed yaw throughout both complete horizontal paths.
      // Keep the stronger old all-yaw guarantee for the distant capital.
      let required;
      if (companion.capital) required = radius(g) + radius(cg);
      else {
        for (const u of [catamaran, companion]) {
          assert.equal(u.position[2], u.route[0][2]);
          assert(Math.abs(u.heading - Math.atan2(-(u.route[0][0] - u.position[0]), 0)) < 1e-12);
        }
        required = clearanceBounds(g, catamaran.heading).max[2] - clearanceBounds(cg, companion.heading).min[2];
      }
      const gap = Math.min(companion.position[2], companion.route[0][2]) - catamaran.position[2];
      assert(gap > required, `complete-path Type022 full/swept separation ${own.id}/${companion.id}: ${gap} <= ${required}`);
      console.log(`  complete-path Type022 separation ${own.id}/${companion.id}: gap=${gap}, required=${required}, positive=${gap - required}`);
      if (!companion.capital) {
        const initialGap = Math.abs(catamaran.position[0] - companion.position[0]);
        const finalGap = Math.abs(catamaran.route[0][0] - companion.route[0][0]);
        assert.equal(initialGap, 140); assert.equal(finalGap, initialGap);
        assert.equal(catamaran.speed, companion.speed);
        assert.equal(Math.abs(catamaran.route[0][0] - catamaran.position[0]), Math.abs(companion.route[0][0] - companion.position[0]));
        assert(initialGap > radius(g) + radius(cg), 'complete-path unchanged conservative core movement guard stays clear');
      }
    }
    for (const a of config.units.filter(u => isCarrier(u.modelId))) for (const b of config.units.filter(u => u !== a)) {
      const gap = [0, 2].map(i => Math.max(0,
        Math.min(a.position[i], a.route[0][i]) - Math.max(b.position[i], b.route[0][i]),
        Math.min(b.position[i], b.route[0][i]) - Math.max(a.position[i], a.route[0][i])));
      const required = radius(geometries.get(a.modelId)) + radius(geometries.get(b.modelId));
      assert(Math.hypot(...gap) > required, `continuous full-route all-yaw separation ${a.id}/${b.id}: ${gap}/${required}`);
      separationProbes++;
    }
    createFleet(config);
  }
  pass('both named choices: actual source membership, fixed formation, NATO10/Eastern10 aircraft and all-yaw full/swept route/native sea/separation');

  for (const own of COALITIONS) {
    const config = namedConfig(own.id), f = setup(config), binding = bindModels(config), seen = new Map();
    let shotChecks = 0, stoppedAt;
    try {
      const staleCombat = f.room.engine.combat;
      f.room.engine.addPlayer('Other human');
      for (let i = 0; i < 10802 && f.room.engine.matchEndedAt === null; i++) {
        f.room.step(TICK_DT); const s = f.snapshot();
        if (i % 3 === 0) {
          binding.rig.update(s); validateFrame(s, config, binding);
          frames.update(JSON.stringify(s));
        }
        for (const e of s.events) if (!seen.has(e.id)) {
          seen.set(e.id, e);
          if (e.type === 'fire') {
            const u = s.units.find(u => u.id === e.source), heading = 2 * Math.atan2(u.view.orientation[1], u.view.orientation[3]);
            const pose = mountPose(geometries.get(u.modelId), u.position, heading, 'main_gun', u.view.angles);
            near(e.position, pose.position);
            const shell = s.projectiles.find(p => p.id === e.projectile);
            if (shell) near(shell.velocity.map(n => n / 240), pose.direction);
            shotChecks++;
          }
        }
      }
      const s = f.snapshot(), events = [...seen.values()]; stoppedAt = f.room.engine.tick;
      assert(s.outcome); assert.equal(f.room.engine.winner, s.outcome.winner);
      assert.notEqual(f.room.engine.matchEndedAt, null);
      console.log(`  battle probe ${own.id}: ${JSON.stringify({ outcome: s.outcome, seconds: s.tick * .05,
        units: s.units.map(u => ({ id: u.id, hp: u.hp, position: u.position,
          fire: events.filter(e => e.type === 'fire' && e.source === u.id).length,
          receivedDamage: events.filter(e => e.type === 'damage' && e.unit === u.id).length })),
        expired: events.filter(e => e.type === 'expired').length })}`);
      for (const u of config.units) {
        const fires = events.filter(e => e.type === 'fire' && e.source === u.id).length;
        if (unarmed(u.modelId)) assert.equal(fires, 0);
        else requireEvidence(fires > 0, `blocked actual gun arc ${own.id}/${u.id}`);
      }
      assert.equal(s.outcome.reason, 'capitals');
      for (const team of [0, 1]) assert(events.some(e => e.type === 'damage' && s.units.find(u => u.id === e.unit)?.team === team &&
        config.units.some(u => u.id === e.source && u.team !== team) && e.damage > 0), `no real reciprocal fitted damage team ${team}`);
      assert.equal(f.room.engine.vehicles.length, 0);
      for (const boat of s.units.filter(u => unarmed(u.modelId))) {
        near(boat.position, config.units.find(u => u.id === boat.id).route[0]);
        assert.deepEqual(boat.view.angles, {});
        if (isCarrier(boat.modelId)) {
          assert.equal(Object.keys(boat.view.spinners).length, boat.modelId === 'cdg' ? 2 : 4);
          assert(Object.values(boat.view.spinners).every(spin => spin.rateRadS === 0), 'props stop at short-route endpoint');
        } else assert.deepEqual(boat.view.spinners, {});
      }
      const receipt = { coalition: own.id, productionFormation: !placementDiagnostic, tick: s.tick, nativeTick: f.room.engine.tick,
        seconds: s.tick * .05, outcome: s.outcome, hp: s.units.map(u => [u.id, u.hp]),
        units: s.units.map(u => ({ id: u.id, modelId: u.modelId, hp: u.hp,
          fires: events.filter(e => e.type === 'fire' && e.source === u.id).length,
          receivedDamage: events.filter(e => e.type === 'damage' && e.unit === u.id).length })),
        fires: events.filter(e => e.type === 'fire').length, damage: events.filter(e => e.type === 'damage').length,
        sunk: events.filter(e => e.type === 'sunk').length, expired: events.filter(e => e.type === 'expired').length, shotChecks };
      receipts.push(receipt); console.log(`  NATURAL ${JSON.stringify(receipt)}`);
      const fleetTick = s.tick;
      for (let i = 0; i < 899; i++) f.room.step(TICK_DT);
      assert.notEqual(f.room.engine.matchEndedAt, null); assert.equal(f.snapshot().tick, fleetTick);
      f.room.step(TICK_DT);
      assert.equal(f.room.engine.tick - stoppedAt, 900); assert.equal(f.room.engine.matchEndedAt, null);
      assert.equal(f.bridge.stats().generations, 2); assert.equal(staleCombat.hostFleet, undefined);
      const fresh = f.snapshot(); assert(fresh.units.every(u => u.hp === 1000)); assert.equal(fresh.tick, 0);
      binding.rig.reset(); binding.rig.update(fresh); validateFrame(fresh, config, binding);
      f.bridge.setPaused(true); const paused = f.room.engine.tick; f.room.step(TICK_DT);
      assert.equal(f.room.engine.tick, paused); f.bridge.setPaused(false);
      const callback = f.room.engine.combat.hostFleet;
      assert.equal(callback.resolveProjectile({ weapon: 'unsupported' }, [0, 0, 0], [0, 0, 1], 1, 10), false);
      assert.equal(callback.resolveProjectile({ weapon: 'cannon20' }, [0, 0, 0], [0, 0, 1], 1, 10), false);
    } finally { binding.rig.dispose(); f.room.close(); assert(f.bridge.stats().disposed); }
  }
  pass('1000HP battle traces, fired signed muzzles/mesh poses, native 60Hz clock, 15s reset and disposal (all-gun failures retained separately)');

  // Declared trusted accepted-attack fixtures against actual fitted CB90 geometry,
  // not native cannon input or natural-flight evidence (covered by the parent).
  for (const own of COALITIONS) for (const boatId of ['cb90', 'type022', ...carrierIds]) {
    const fixture = namedConfig(own.id);
    fixture.units.forEach(u => { u.weapons = []; u.speed = 0; u.route = []; });
    const boat = fixture.units.find(u => u.modelId === boatId), g = geometries.get(boatId);
    const target = fittedTargets(g, boat.position, boat.heading)[0];
    const from = [target[0], target[1] + 50, target[2]], to = [target[0], target[1] - 50, target[2]];
    const expected = fittedHit(g, from, to, boat.position, boat.heading);
    assert(expected !== null);
    const core = createFleet(fixture), binding = bindModels(fixture);
    try {
      core.addPlayer('fixture_owner', boat.team);
      assert.equal(core.request('fixture_owner', { type: 'spawn', kind: boatId }).ok, false);
      assert.equal(core.request('fixture_owner', { type: 'board', aircraft: boat.id, seat: 0 }).ok, false);
      assert.equal(core.request('fixture_owner', { type: 'control-vessel', unit: boat.id }).ok, false);
      assert.deepEqual(core.snapshot(boat.team).aircraft, []);
      const attack = { source: 'accepted_attack_fixture', team: 1 - boat.team, weapon: 'cannon20', from, to, damage: 10, maxFraction: 1 };
      const hit = core.resolveHostSegment(attack);
      assert.equal(hit.unit, boat.id); assert.equal(hit.damage, 10); assert.equal(hit.hp, 990);
      assert.equal(hit.fraction, expected); assert.equal(core.snapshot(boat.team).outcome, null);
      assert.equal(core.surfaceSegment(from, to), expected);
      assert(core.surfaceHeightAt(target[0], target[2]) !== null);
      const hostile = fixture.units.find(u => u.team !== boat.team);
      const aim = fittedTargets(geometries.get(hostile.modelId), hostile.position, hostile.heading)[0];
      const before = target.map((n, i) => n - (aim[i] - n) * .05);
      const block = core.resolveHostSegment({ ...attack, team: boat.team, from: before, to: aim });
      assert.equal(block.unit, boat.id); assert.equal(block.damage, 0); assert.equal(block.hp, 990);
      assert.equal(core.snapshot(boat.team).units.find(u => u.id === hostile.id).hp, 1000);
      binding.rig.update(core.snapshot(boat.team));
      assert.equal(binding.rig.muzzleWorld(boat.id), null);
      assert.equal(binding.rig.muzzleWorld(boat.id, 'invented_machinegun'), null);
      const hidden = core.snapshot(boat.team); hidden.units = hidden.units.filter(u => u.id !== boat.id);
      binding.rig.update(hidden); assert.equal(binding.objects.get(boat.id).parent.visible, false);
      assert.equal(binding.rig.wakeEligible(boat.id), false);
      const sunk = core.resolveHostSegment({ ...attack, damage: 1000 });
      assert.equal(sunk.hp, 0); assert.equal(core.snapshot(boat.team).outcome, null);
      assert(core.snapshot(boat.team).units.filter(u => u.capital).every(u => u.alive));
      assert(!core.snapshot(boat.team).events.some(e => e.type === 'fire' && e.source === boat.id));
      binding.rig.update(core.snapshot(boat.team)); binding.rig.reset();
      binding.rig.update(createFleet(fixture).snapshot(boat.team));
      if (boatId === 'cb90') near(binding.objects.get(boat.id).getObjectByName(g.controls[0].node).quaternion.toArray(),
        models.get('cb90').getObjectByName(g.controls[0].node).quaternion.toArray());
      else if (boatId === 'type022') { assert.deepEqual(g.controls, []); assert.equal(g.gun, null); }
      else { assert.equal(g.controls.length, boatId === 'cdg' ? 2 : 4); assert.equal(g.gun, null); }
      const fog = structuredClone(fixture);
      fog.weather = { config: createWeather({ seed: 42, allowedPresets: ['fog'], initialPreset: 'fog',
        tuning: { fog: { fogBase: .003, fogSea: .004 } } }).config, minimumTransmittance: .1 };
      const privateCore = createFleet(fog), viewer = 1 - boat.team;
      assert(!privateCore.snapshot(viewer).units.some(u => u.id === boat.id));
      privateCore.resolveHostSegment(attack);
      const safe = privateCore.snapshot(viewer);
      assert(!safe.units.some(u => u.id === boat.id)); assert(!safe.events.some(e => e.unit === boat.id));
      console.log(`  ${boatId} ${own.id}/${boat.id}: fitted fraction=${hit.fraction}, HP1000->${hit.hp}->0, friendly damage=0, noncapital outcome=null, hidden events=0`);
    } finally {
      binding.rig.dispose(); assert.equal(binding.rig.stats().bindings, 0);
      assert.equal(binding.rig.root.parent, null); assert.throws(() => binding.rig.update(core.snapshot(boat.team)), /disposed/);
    }
    const invalid = structuredClone(fixture);
    invalid.units.find(u => u.modelId === boatId).weapons = structuredClone(baseline.createLocalFleetConfig().units[0].weapons);
    assert.throws(() => createFleet(invalid), /compatible mount/);
  }
  pass('six unarmed objectives: fitted attacks, friendly obstruction/noFF, noncapital sink, closed CB90 ramp, carrier props, no invented gun, privacy/lifecycle');

  const config = namedConfig('nato');
  const empty = structuredClone(config); empty.units.forEach(u => u.weapons.forEach(w => { w.ammo = 0; }));
  const noAmmo = createFleet(empty);
  for (let i = 0; i < 18; i++) noAmmo.advance(10000);
  assert(noAmmo.snapshot(0).units.every(u => u.hp === 1000));
  assert(!noAmmo.snapshot(0).events.some(e => e.type === 'fire'));
  const tooMany = structuredClone(config);
  while (tooMany.units.length < 11) tooMany.units.push({ ...structuredClone(config.units.find(u => u.modelId === 'type022')), id: `overflow${tooMany.units.length}` });
  assert.throws(() => createFleet(tooMany), /Fleet\/capital\/sensor cap/);
  const cappedRig = bindModels(config);
  try {
    const safe = createFleet(config).snapshot(0);
    for (const [field, size] of [['units', 13], ['events', 257], ['projectiles', 73]]) {
      const oversized = structuredClone(safe);
      oversized[field] = Array(size).fill(safe[field][0] ?? {});
      assert.throws(() => cappedRig.rig.update(oversized), /Bounded faction snapshot/);
    }
  } finally { cappedRig.rig.dispose(); }
  const unsupported = structuredClone(config); unsupported.units[0].weapons[0].mount = 'invented_aa';
  assert.throws(() => createFleet(unsupported), /compatible mount/);
  const invalidTTL = structuredClone(config); invalidTTL.units[0].weapons[0].ttlMs = 0;
  assert.throws(() => createFleet(invalidTTL), /Invalid weapon/);
  // Negative-only expiry fixture: a deliberately slower test shell cannot chase the receding fitted edge. Never production balance.
  const retreat = structuredClone(config);
  retreat.units = retreat.units.filter(u => !isCarrier(u.modelId));
  for (const u of retreat.units) {
    u.position = [u.modelId === 'type022' ? u.position[0] : u.id === 'home' ? -1400 : u.id === 'enemy' ? 1700 : u.team ? -280 : -800, 0, u.capital ? 3100 : u.modelId === 'cb90' ? 2610 : u.modelId === 'type022' ? 2630 : 2696];
    u.speed = 0; u.route = []; u.weapons = u.id === 'home-escort' ? u.weapons : [];
  }
  Object.assign(retreat.units.find(u => u.id === 'home-escort').weapons[0], { ammo: 1, range: 600, speed: 60 });
  const receding = retreat.units.find(u => u.id === 'enemy-escort');
  receding.speed = 30; receding.heading = -Math.PI / 2; receding.route = [[1700, 0, 2696]];
  const expired = createFleet(retreat); expired.advance(10000); expired.advance(3000);
  const expiredState = expired.snapshot(0);
  assert(expiredState.events.some(e => e.type === 'fire'));
  assert(expiredState.events.some(e => e.type === 'expired'));
  assert(expiredState.units.every(u => u.hp === 1000));
  assert.equal(expiredState.projectiles.length, 0);
  console.log('  NEGATIVE ONLY: one deliberately slower test shell expired against receding fitted hull; all HP remains 1000');
  // Explicit negative-only trusted-impact fixture. Not natural battle or aircraft-fire evidence.
  const negative = structuredClone(config); negative.units.forEach(u => { u.speed = 0; u.route = []; u.weapons = []; });
  negative.units.find(u => u.id === 'enemy-escort').hp = 1;
  const fleet = createFleet(negative);
  function negativeImpact(id, damage) {
    const u = negative.units.find(u => u.id === id), g = geometries.get(u.modelId), p = fittedTargets(g, u.position, u.heading)[0];
    return fleet.resolveHostSegment({ source: 'negative_fixture', team: 0, weapon: 'cannon20',
      from: [p[0] - 200, p[1], p[2]], to: [p[0] + 200, p[1], p[2]], damage, maxFraction: 1 });
  }
  assert.equal(negativeImpact('enemy-escort', 10).unit, 'enemy-escort');
  assert.equal(fleet.snapshot(0).outcome, null); assert(fleet.snapshot(0).units.find(u => u.id === 'enemy').alive);
  assert.equal(negativeImpact('enemy', 1000).unit, 'enemy');
  assert.deepEqual(fleet.snapshot(0).outcome, { winner: 0, reason: 'capitals' });
  pass('zero ammunition, fleet/rig caps, unsupported/unregistered host rounds, invalid TTL, real expiry and scoped escort-sink nonvictory negatives');
} finally {
  loader.dispose();
  for (const object of models.values()) object.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
}
const files = ['authoring/local-host-scenario.mjs', 'authoring/fleet-roster-extension-check.mjs', 'authoring/coalition-rosters.mjs',
  'authoring/extended-escort-models.json', 'authoring/model-repairs.json', 'authoring/fleet-sim.mjs', 'authoring/fleet-geometry.mjs',
  'authoring/fleet-rig.mjs', 'authoring/retained-host-bridge.mjs', ...[...loader.loaded].map(f => 'source/games/wings/' + f)];
console.log(JSON.stringify({ groups, waterProbes, heightProbes, separationProbes, poseProbes, tunnelProbes, frameSHA256: frames.digest('hex'),
  sources: Object.fromEntries(files.map(file => [file, hash(read(file))])), natural: receipts,
  limits: 'CPU actual geometry/factor materials only; no image texels, GPU/native pixels, aircraft input, performance or release acceptance.' }, null, 2));
const escortManifest = JSON.parse(read('authoring/extended-escort-models.json'));
requireEvidence(escortManifest.schema === 'wings_derived_escort_assets_v1' &&
  escortManifest.archive_sha256 === '4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8' &&
  Array.isArray(escortManifest.models) && escortManifest.models.length === 8,
  'Authenticated schema object with eight measured extension descriptors required');
assert.deepEqual(failures, [], 'Ten-vessel acceptance failures retained');
console.log(`${groups} ten-vessel extension groups passed${placementDiagnostic ? ' (PROPOSED PLACEMENT DIAGNOSTIC ONLY)' : ''}`);
