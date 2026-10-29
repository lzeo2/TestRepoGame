// Actual native source + actual GLTFLoader/GLB geometry. CPU state, not pixels.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use existing approved tools');
const three = resolve(process.env.THREE_ROOT), esbuild = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(esbuild, 'package.json'))).version, '0.28.2');
const T = await import(pathToFileURL(resolve(three, 'build/three.module.js')));
const { build } = await import(pathToFileURL(resolve(esbuild, 'lib/main.js')));
const base = fileURLToPath(new URL('../', import.meta.url));
const src = resolve(base, 'source/games/wings/src');
const result = await build({ stdin: { contents: [
  ['render/world/ships.ts', 'createFleet'],
  ['sim/fleet.ts', 'SHIP_SPECS, FLEET, FLEET_LAP_TIME, nativeShipSpec, shipCollisionBoxes, shipHasAAMounts, shipToWorld, shipPose, activeFleet'],
  ['sim/geography.ts', 'setFleetState, setShipStates, posedShip, segmentHitsShip, shipHeight, terrainHeight, inSafeZone'],
  ['sim/bots.ts', 'hostileFleetDistance'],
  ['sim/combat.ts', 'createCombatState, shipRuntime, damageShip, shipSegmentT, AA_TURRETS'],
  ['sim/loopback.ts', 'createLoopbackRoom'],
].map(([file, names]) => `export {${names}} from ${JSON.stringify(resolve(src, file))};`).join('\n'), resolveDir: src },
  bundle: true, platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none',
  define: { 'import.meta.env.BASE_URL': '"./"' }, plugins: [{ name: 'approved-three', setup(api) {
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
      const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      if (target && typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string', key);
      return { path: pathToFileURL(resolve(three, target)).href, external: true };
    });
  } }] });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const legacySource = execFileSync('git', ['show', '885cbb2:Games/Wings/source/games/wings/src/sim/fleet.ts'], { cwd: base, encoding: 'utf8' });
const legacyBuild = await build({ stdin: { contents: legacySource, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false });
const legacy = await import(`data:text/javascript;base64,${Buffer.from(legacyBuild.outputFiles[0].contents).toString('base64')}`);
for (const kind of ['carrier', 'destroyer']) {
  const { draft, ...original } = api.SHIP_SPECS[kind];
  assert.equal(JSON.stringify(original), JSON.stringify(legacy.SHIP_SPECS[kind]), 'legacy model/HP/hull/island/turret slots and mannability byte-equivalent');
  assert.equal(draft, 15);
  assert.equal(api.nativeShipSpec(kind), null, 'legacy converted rig path retained');
}
assert.deepEqual(api.FLEET.filter(s => s.kind !== 'escort'), legacy.FLEET, 'original formation retained');
const expectedAA = legacy.FLEET.flatMap(ship => legacy.SHIP_SPECS[ship.kind].turrets.map(t =>
  ({ ship, turret: t.id, kind: t.kind, team: ship.team, position: legacy.shipToWorld(ship, t.offset), offset: t.offset })));
assert.equal(JSON.stringify(api.AA_TURRETS), JSON.stringify(expectedAA), 'legacy AA slots byte-equivalent');
assert.equal(api.FLEET.filter(s => s.kind === 'destroyer').length, 12);
assert.equal(api.FLEET.filter(s => s.kind === 'escort').length, 4);
assert.equal(api.activeFleet(2).filter(s => s.kind === 'escort').length, 2);
// Component-enclosing horizontal discs stay disjoint under the shared rigid rotation.
const envelope = ship => Math.max(...api.shipCollisionBoxes(api.SHIP_SPECS[ship.kind]).map(b =>
  Math.hypot(Math.abs(b.center[0]) + b.half[0], Math.abs(b.center[2]) + b.half[2])));
for (let i = 0; i < api.FLEET.length; i++) for (let j = 0; j < i; j++) {
  const a = api.FLEET[i], b = api.FLEET[j];
  const distance = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
  assert(distance > envelope(a) + envelope(b), `all-time separation ${a.id}/${b.id}`);
  for (const time of [0, 375, 750, 1125, 1500]) {
    const p = api.shipPose(a, time), q = api.shipPose(b, time);
    assert(Math.abs(Math.hypot(p.position[0] - q.position[0], p.position[2] - q.position[2]) - distance) < 1e-8);
  }
}
console.log('PASS exact 885cbb2 legacy specs/formation/AA; 12 armed destroyers + 4 escorts (2 active); all-time separation');
const descriptor = api.nativeShipSpec('escort'), spec = api.SHIP_SPECS.escort;
assert.equal(descriptor.source_model_id, 'wings.original.wings_type45_daring_class.v1');
assert.equal(spec.model, descriptor.file);
assert.deepEqual(spec.turrets, [], 'no inferred AA/CIWS or player mounts');
assert(api.AA_TURRETS.every(t => t.ship.kind !== 'escort'), 'no inferred escort AA');
assert(api.FLEET.filter(api.shipHasAAMounts).every(s => s.kind !== 'escort'));
assert.equal(api.FLEET.filter(api.shipHasAAMounts).length, legacy.FLEET.length);
api.setFleetState(0, 2); api.setShipStates(Object.values(api.createCombatState().ships));
const escort = api.FLEET.find(s => s.kind === 'escort' && s.team === 0);
const armed = api.FLEET.filter(s => s.team === 0 && api.shipHasAAMounts(s));
let gapChecks = 0;
for (let x = -1100; x <= 1100; x += 100) for (let z = -1100; z <= 1100; z += 100) {
  if (Math.hypot(x, z) >= 1200) continue;
  const point = [escort.position[0] + x, 200, escort.position[2] + z];
  const distance = Math.min(...armed.map(s => Math.hypot(point[0] - s.position[0], point[2] - s.position[2])));
  assert(Math.abs(api.hostileFleetDistance(1, point[0], point[2]) - distance) < 1e-8, 'bot AA range ignores unarmed hulls');
  if (distance <= 1200) continue;
  assert.equal(api.inSafeZone(0, point), false, 'unarmed hull cannot extend the actual AA safe zone'); gapChecks++;
}
assert(gapChecks > 0, 'fixture exercises phantom escort AA outside armed fleet coverage');
console.log(`PASS shared AA capability: native mounts retained, ${gapChecks} unarmed escort safe-zone negatives and bot ranges`);
assert.equal(api.SHIP_SPECS.carrier.model, 'models/carrier.glb');
assert.equal(api.SHIP_SPECS.carrier.deckHeight, 20);
assert.equal(spec.draft, -descriptor.collision.hull.min[1]);
const boxes = api.shipCollisionBoxes(spec);
assert.equal(boxes.length, 11, 'hull, deck, seven islands and both static gun parts');
const inside = (p, b) => p.every((n, i) => Math.abs(n - b.center[i]) <= b.half[i] + 1e-4);
console.log('PASS measured native spec, draft, 11 component boxes; original carrier deck/AA; no invented escort weapons');

// Decode GLB structure with the real loader. Bitmap metadata is instrumented because
// Node has no image decoder; texture identity/UV preservation is tested, not texel colour.
const old = { fetch: globalThis.fetch, self: globalThis.self, bitmap: globalThis.createImageBitmap };
let view;
try {
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async blob => {
    const bytes = new DataView(await blob.arrayBuffer());
    return { width: bytes.getUint32(16), height: bytes.getUint32(20), close() {} };
  };
  globalThis.fetch = async url => {
    if (String(url).startsWith('blob:')) return old.fetch(url);
    assert.match(String(url), /^\.\/models\/(?:derived\/)?[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(base, String(url))));
  };
  const { GLTFLoader } = await import(pathToFileURL(resolve(three, 'examples/jsm/loaders/GLTFLoader.js')));
  const bytes = readFileSync(resolve(base, descriptor.file));
  const raw = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  raw.scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(raw.scene);
  for (const [key, actual] of [['min', bounds.min.toArray()], ['max', bounds.max.toArray()]])
    actual.forEach((n, i) => assert(Math.abs(n - descriptor.bounds[key][i]) < 1e-4));
  const muzzle = raw.scene.getObjectByName(descriptor.main_gun_geometry.muzzle_node);
  assert(muzzle, 'actual source gun marker exists');
  const point = muzzle.getWorldPosition(new T.Vector3());
  point.toArray().forEach((n, i) => assert(Math.abs(n - descriptor.main_gun_geometry.muzzle_rest_root[i]) < 1e-4));
  assert(boxes.some(b => inside(point.toArray(), b)), 'static gun collision covers actual muzzle');
  for (const control of descriptor.articulation.slice(0, 2)) {
    const node = raw.scene.getObjectByName(control.node);
    node.position.toArray().forEach((n, i) => assert(Math.abs(n - control.rest_translation[i]) < 1e-5));
    assert.deepEqual(node.quaternion.toArray(), [0, 0, 0, 1], 'rest gun frame has no hidden rotation');
  }
  const bore = new T.Vector3(...descriptor.main_gun_geometry.bore_direction_pitch_local);
  for (let distance = .1; distance < 100; distance += .5) {
    const p = point.clone().addScaledVector(bore, distance).toArray();
    assert(!boxes.slice(0, -2).some(b => inside(p, b)), 'actual rest bore clears measured static hull/islands');
  }
  let triangles = 0;
  raw.scene.traverse(mesh => { if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
  api.setFleetState(13, 2);
  view = api.createFleet();
  const deadline = Date.now() + 5000;
  while (view.loadedModels.length !== 3 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(view.loadedModels.slice().sort(), ['carrier', 'destroyer', 'escort']);
  assert(view.getShipTurret('t0-dd1', 'gun_fwd'), 'legacy mannable gun retained');
  assert.equal(view.getShipTurret('t0-type45-escort', 'gun_fwd'), null, 'supplied gun remains static');
  const meshes = view.root.getObjectByName('escort hull')?.parent.children.filter(m => m.name === 'escort hull');
  assert.equal(meshes?.length, 5);
  const legacyMeshes = view.root.getObjectByName('destroyer hull')?.parent.children.filter(m => m.name === 'destroyer hull');
  assert(legacyMeshes.every(m => m.count === 12 && !m.geometry.attributes.uv), 'original converted batches');
  assert.equal(meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0), triangles);
  assert(meshes.every(m => m.count === 4 && m.geometry.attributes.uv), 'one template shared by four measured escorts');
  const materials = new Set(meshes.flatMap(m => [].concat(m.material)));
  assert([...materials].some(m => m.map && m.normalMap && m.roughnessMap && m.metalnessMap), 'embedded PBR maps survive native conversion');
  const id = 't1-type45-escort', posed = api.posedShip(id);
  view.update(new T.Vector3(), .1);
  const matrix = new T.Matrix4(); meshes[0].getMatrixAt(1, matrix);
  assert(Math.abs(matrix.elements[12] - posed.position[0]) < .001);
  assert(Math.abs(matrix.elements[14] - posed.position[2]) < .001);
  const cs = api.createCombatState(), events = [];
  api.damageShip(cs, id, 600, 'fixture-aircraft', 0, api.shipToWorld(posed, [0, 5, 0]), 13, events);
  const rt = api.shipRuntime(cs, id);
  assert.equal(rt.hp, 2400); assert.equal(rt.sunk, false);
  const state = () => ({ ...rt, damage: rt.damage, turrets: rt.turrets });
  view.applyStates([state()], 13); view.update(undefined, .1);
  meshes[0].getMatrixAt(1, matrix); assert(matrix.elements[13] < 0, 'same native HP settles model');
  meshes[0].getMatrixAt(0, matrix); assert.equal(matrix.elements[13], 0, 'damage isolated from other measured instance');
  assert.equal(view.root.getObjectByName('t1-dd1').position.y, 0, 'damage isolated from legacy destroyers');
  assert.equal(api.shipRuntime(cs, 't0-type45-escort').hp, 3000, 'native combat HP isolated');
  assert.deepEqual(rt.turrets, {}, 'new target has no player seats or weapon runtime');
  api.damageShip(cs, id, 3000, 'fixture-aircraft', 0, api.shipToWorld(posed, [0, 5, 0]), 14, events);
  assert(rt.sunk); assert(events.some(e => e.type === 'ship-sunk' && e.ship === id));
  api.setShipStates([state()], 14); view.applyStates([state()], 14); view.update(undefined, 24);
  meshes[0].getMatrixAt(1, matrix); assert.equal(matrix.elements[0], 0, 'same sunk state hides model');
  assert.equal(view.root.getObjectByName(id).visible, false);
  api.setShipStates([{ ...state(), hp: 3000, sunk: false, sunkAt: 0 }], 0);
  view.applyStates([{ ...state(), hp: 3000, sunk: false, sunkAt: 0, damage: [] }], 0);
  api.setFleetState(0, 2); view.update(undefined, 0);
  assert.equal(view.root.getObjectByName(id).visible, true, 'round reset restores native ship');
  api.setFleetState(0, 2, true); view.update(undefined, 0);
  assert.equal(view.root.getObjectByName(id).visible, false, 'Factions suppression remains');
  assert.equal(view.root.getObjectByName('t1-dd1').visible, false, 'Factions hides legacy destroyers too');
  assert.equal(view.root.getObjectByName('t1-carrier').visible, true);
  api.setFleetState(0, 2); view.update(undefined, 0);
  let disposed = 0; const textures = new Set();
  const geometries = new Set(meshes.map(m => m.geometry));
  const disposalCounts = new Map([...geometries, ...materials].map(resource => [resource, 0]));
  for (const resource of disposalCounts.keys()) resource.addEventListener('dispose', () =>
    disposalCounts.set(resource, disposalCounts.get(resource) + 1));
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  assert.equal(textures.size, 3, 'shared three-texture pool');
  for (const texture of textures) texture.addEventListener('dispose', () => disposed++);
  view.dispose(); view.dispose(); view = null;
  assert.equal(disposed, textures.size, 'shared PBR textures disposed exactly once');
  assert([...disposalCounts.values()].every(count => count === 1), 'measured template geometries and materials disposed exactly once');
  console.log(`PASS actual loaded GLB/native geometry ${triangles} triangles, ${meshes.length} shared instanced batches, ${textures.size} textures, measured muzzle/rest-bore clearance, moving pose, native HP/sink/reset/Factions/disposal (CPU, not pixels)`);
} finally {
  view?.dispose(); globalThis.fetch = old.fetch; globalThis.self = old.self; globalThis.createImageBitmap = old.bitmap;
}

for (const [mode, bots] of [['Solo', 0], ['Bots', 2], ['Custom', 1]]) {
  const room = api.createLoopbackRoom({ teams: 2, bots }, `${mode} native reuse CPU`, { onMessage() {} }, { manual: true });
  try {
    room.send({ type: 'spawn', kind: 'fighter' });
    for (let i = 0; i < 60; i++) room.step(1 / 60);
    assert.equal(room.engine.botCount(), bots * 2);
    const snap = room.engine.snapshotFor(room.playerId);
    assert(snap.ships.some(s => s.id === 't0-type45-escort' && s.hp === 3000 && !s.sunk));
    assert(snap.ships.some(s => s.id === 't0-dd1' && Object.keys(s.turrets).length === 3));
    assert(snap.vehicles.every(v => !['carrier', 'destroyer', 'escort'].includes(v.kind)));
  } finally { room.close(); }
}
console.log('PASS actual ordinary Solo/Bots/Custom rooms: native escort states, AI counts and aircraft-only vehicles');

// Both native collision owners must consume the measured boxes, not a legacy draft.
api.setFleetState(0, 2);
const ship = api.posedShip('t0-type45-escort');
const segment = y => [api.shipToWorld(ship, [-20, y, 0]), api.shipToWorld(ship, [20, y, 0])];
for (const test of [api.segmentHitsShip, (a, b) => api.shipSegmentT(ship.id, a, b)]) {
  assert.notEqual(test(...segment(-spec.draft + .1)), null, 'inside measured hull collides');
  assert.equal(test(...segment(-spec.draft - .1)), null, 'parent must consume shipCollisionBoxes: segment below measured keel must miss');
}
console.log('PASS native geography/combat measured-draft collision parity');
let heights = 0, islandGaps = 0;
for (let x = -8; x <= 8; x += 4) for (let z = -70; z <= 70; z += 5) {
  const footprint = boxes.filter(b => Math.abs(x - b.center[0]) <= b.half[0] && Math.abs(z - b.center[2]) <= b.half[2]);
  if (!footprint.length) continue;
  const expected = Math.max(...footprint.map(b => b.center[1] + b.half[1]));
  const world = api.shipToWorld(ship, [x, 0, z]);
  assert(Math.abs(api.shipHeight(world[0], world[2]) - expected) < 1e-5, 'surface height follows actual component footprints');
  heights++;
  const i = spec.island;
  if (Math.abs(x - i.center[0]) <= i.half[0] && Math.abs(z - i.center[2]) <= i.half[2] && expected < i.center[1] + i.half[1] - .01) islandGaps++;
}
assert(heights > 100 && islandGaps > 0, 'exercise actual gaps that the aggregate island used to fill');
for (const kind of ['carrier', 'destroyer']) {
  const legacy = api.posedShip(api.FLEET.find(s => s.kind === kind && s.team === 0).id);
  for (const hit of [api.segmentHitsShip, (a, b) => api.shipSegmentT(legacy.id, a, b)]) {
    assert.notEqual(hit(api.shipToWorld(legacy, [-50, -14.9, 0]), api.shipToWorld(legacy, [50, -14.9, 0])), null);
    assert.equal(hit(api.shipToWorld(legacy, [-50, -15.1, 0]), api.shipToWorld(legacy, [50, -15.1, 0])), null);
  }
}
console.log(`PASS ${heights} measured component surface heights, ${islandGaps} aggregate-island gap negatives; legacy 15m draft unchanged`);
let waterSamples = 0;
for (const escort of api.FLEET.filter(s => s.kind === 'escort')) for (let i = 0; i < 16; i++) {
  const posed = { ...escort, ...api.shipPose(escort, api.FLEET_LAP_TIME * i / 16) };
  for (const x of [descriptor.bounds.min[0], 0, descriptor.bounds.max[0]])
    for (const z of [descriptor.bounds.min[2], 0, descriptor.bounds.max[2]]) {
      const w = api.shipToWorld(posed, [x, 0, z]);
      assert(api.terrainHeight(w[0], w[2]) < descriptor.bounds.min[1] - .25, 'full measured keel clears actual native seabed through orbit');
      waterSamples++;
    }
}
console.log(`PASS ${waterSamples} actual native-terrain orbit clearance samples for measured escorts`);
