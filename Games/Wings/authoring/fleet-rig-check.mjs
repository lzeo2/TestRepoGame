// CPU-only: actual serialized model geometry/TRS, not rendered materials or native acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createFleetRig, VIEW_LIMITS } from './fleet-rig.mjs';
import { createFleet } from './fleet-sim.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
if (!process.env.THREE_ROOT) throw new Error('Set THREE_ROOT to the existing Three 0.186.0 package directory; install nothing.');
const T = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.module.js')).href);
assert.equal(T.REVISION, '186');
const wings = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, wings));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifests = JSON.parse(await read('authoring/model-repairs.json'));
const sub = JSON.parse(await read('authoring/submarine-model.json'));
const descriptors = [...manifests.models, sub];
const originalHashes = {};
for (const [file, expected] of Object.entries(manifests.existing_model_sha256)) {
  originalHashes[file] = sha(await read(`models/${file}`));
  assert.equal(originalHashes[file], expected);
}
const dataHashes = new Map();
let geometryTriangles = 0;
function close(a, b, epsilon = 1e-6) {
  assert.equal(a.length, b.length);
  a.forEach((value, i) => assert.ok(Math.abs(value-b[i]) < epsilon, `${a} != ${b}`));
}
function qclose(a, b) { assert.ok(1-Math.abs(a.dot(b)) < 1e-8, `${a.toArray()} != ${b.toArray()}`); }

// This fixture constructs REAL meshes from each GLB's accessors; textures are not decoded/rendered.
async function loadGeometry(descriptor) {
  const bytes = await read(descriptor.file);
  assert.equal(sha(bytes), descriptor.sha256);
  dataHashes.set(descriptor.file, sha(bytes));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const { object, triangleCount } = modelGeometryFixture(T, bytes);
  geometryTriangles += triangleCount;
  return object;
}
const objects = await Promise.all(descriptors.map(loadGeometry));
const rest = objects.map(object => {
  const states = new Map();
  object.traverse(node => states.set(node, { position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), visible: node.visible }));
  return states;
});
const meshBytes = () => objects.map(object => {
  const hash = createHash('sha256');
  object.traverse(node => { if (node.isMesh) {
    for (const attribute of Object.values(node.geometry.attributes)) hash.update(Buffer.from(attribute.array.buffer));
    if (node.geometry.index) hash.update(Buffer.from(node.geometry.index.array.buffer));
  } });
  return hash.digest('hex');
});
const initialMeshBytes = meshBytes();
let modelResourceDisposals = 0;
for (const object of objects) object.traverse(node => {
  if (node.isMesh) {
    node.geometry.addEventListener('dispose', () => modelResourceDisposals++);
    node.material.addEventListener('dispose', () => modelResourceDisposals++);
  }
});
const parent = new T.Group(), view = createFleetRig(T, { parent, team: 0 });
const [escortA, escortB, submarine] = objects;
const containers = [view.bindUnit('a', escortA, descriptors[0]), view.bindUnit('b', escortB, descriptors[1]), view.bindUnit('sub', submarine, sub)];
assert.throws(() => view.bindUnit('a', escortA, descriptors[0]));
assert.ok(containers.every(container => !container.visible));
const unit = (id, position = [0, 0, 0], extra = {}) => ({ id, position, hp: 100, alive: true, depth: 'surfaced', ...extra });
const snapshot = (tick, units, extra = {}) => ({ mode: 'factions', round: 0, tick, remainderMs: 0, units, events: [], projectiles: [], ...extra });
function motion(descriptor, { yaw = 0, pitch = 0, rate = 2 } = {}) {
  return { angles: Object.fromEntries(descriptor.articulation.filter(c => c.limits_rad).map(c => [c.node, c.node === 'main_turret_yaw' ? yaw : pitch])),
    spinners: Object.fromEntries(descriptor.articulation.filter(c => !c.limits_rad).map(c => [c.node, { phaseRad: .2, epochSeconds: 0, rateRadS: rate }])) };
}
const aMotion = motion(descriptors[0], { yaw: 9, pitch: -9 });
view.update(snapshot(20, [unit('a', [20, 0, 30], { view: aMotion })]));
const gun = descriptors[0].main_gun_geometry;
const yawNode = escortA.getObjectByName(gun.yaw_node), pitchNode = escortA.getObjectByName(gun.pitch_node);
const yawQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, -1, 0), .6);
const pitchQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(-1, 0, 0), -.45);
qclose(yawNode.quaternion, yawQ); qclose(pitchNode.quaternion, pitchQ);
qclose(escortA.getObjectByName(descriptors[0].root).quaternion, new T.Quaternion());
const pitchTranslation = new T.Vector3(...descriptors[0].articulation[1].rest_translation);
const yawTranslation = new T.Vector3(...descriptors[0].articulation[0].rest_translation);
const expected = new T.Vector3(...gun.muzzle_pitch_local).applyQuaternion(pitchQ).add(pitchTranslation).applyQuaternion(yawQ).add(yawTranslation);
close(view.muzzleWorld('a').position, expected.clone().add(new T.Vector3(20, 0, 30)).toArray());
// Verify the anchor uses the actual barrel terminal ring, not a generic radius/copy of another ship.
const barrelMesh = pitchNode.children.find(child => child.isMesh), ps = barrelMesh.geometry.attributes.position;
const terminal = new Map(); let front = Infinity;
for (let i = 0; i < ps.count; i++) front = Math.min(front, ps.getZ(i));
for (let i = 0; i < ps.count; i++) if (ps.getZ(i) < front+.03) {
  const p = [ps.getX(i), ps.getY(i), ps.getZ(i)]; terminal.set(p.join(','), p);
}
assert.equal(terminal.size, 8);
close(gun.muzzle_pitch_local, [0, 1, 2].map(j => [...terminal.values()].reduce((sum, p) => sum+p[j], 0)/8));
const bodyQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI/2);
view.update(snapshot(40, [unit('a', [20, 0, 30], { view: { ...aMotion, orientation: bodyQ.toArray() } })]));
close(view.muzzleWorld('a').position, expected.clone().applyQuaternion(bodyQ).add(new T.Vector3(20, 0, 30)).toArray());
close(view.muzzleWorld('a').direction, new T.Vector3(...gun.bore_direction_pitch_local).applyQuaternion(pitchQ).applyQuaternion(yawQ).applyQuaternion(bodyQ).toArray());
const prop = escortA.getObjectByName('port_propeller_1');
qclose(prop.quaternion, new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 4.2));
const pausedProp = prop.quaternion.clone();
view.update(snapshot(40, [unit('a', [20, 0, 30], { view: aMotion })], { paused: true }));
qclose(prop.quaternion, pausedProp);
view.update(snapshot(60, [unit('a', [20, 0, 30], { view: aMotion, alive: false, hp: 0 })]));
const deadProp = prop.quaternion.clone();
view.update(snapshot(80, [unit('a', [20, 0, 30], { view: aMotion, alive: false, hp: 0 })]));
qclose(prop.quaternion, deadProp); assert.equal(containers[0].position.y, -1.5);
assert.equal(view.muzzleWorld('a'), null); assert.equal(view.wakeEligible('a'), false);
view.reset();
for (let i = 0; i < objects.length; i++) for (const [node, initial] of rest[i]) {
  close(node.position.toArray(), initial.position.toArray()); qclose(node.quaternion, initial.quaternion);
  close(node.scale.toArray(), initial.scale.toArray()); assert.equal(node.visible, initial.visible);
}
// Submarine actual non-identity rest frames and continuous AUTHORITATIVE depth positions.
const subMotion = motion(sub, { pitch: .9, rate: 8 });
view.update(snapshot(20, [unit('sub', [0, 0, 0], { view: subMotion })]));
assert.equal(view.wakeEligible('sub'), true);
for (const control of sub.articulation.filter(c => c.limits_rad)) {
  const node = submarine.getObjectByName(control.node);
  qclose(node.quaternion, rest[2].get(node).quaternion.clone().multiply(
    new T.Quaternion().setFromAxisAngle(new T.Vector3(...control.axis_local), .3)));
}
for (const [tick, depth] of [[40, -10.25], [60, -24.75]]) {
  view.update(snapshot(tick, [unit('sub', [10, depth, 20], { depth: 'deep', view: subMotion })]));
  assert.equal(containers[2].position.y, depth); assert.equal(view.wakeEligible('sub'), false);
  for (const launch of sub.launch_origins) {
    const muzzle = view.muzzleWorld('sub', launch.node);
    close(muzzle.position, launch.origin_rest_root.map((n, i) => n+[10, depth, 20][i]));
  }
}
view.update(snapshot(61, [], { contacts: [{ unit: 'sub', cell: [3, 4], quality: 'confirmed' }],
  events: [{ id: 1, round: 0, tick: 61, type: 'fire', source: 'sub', position: [10, -24.75, 20] }],
  projectiles: [{ id: 1, source: 'sub', team: 0, medium: 'underwater', position: [10, -24, 19] }] }));
assert.equal(containers[2].visible, false); assert.equal(view.wakeEligible('sub'), false);
assert.equal(view.muzzleWorld('sub', sub.launch_origins[0].node), null);
assert.equal(view.stats().effects, 0); assert.equal(view.stats().projectiles, 0);
view.reset();
// Real FC snapshots/events: the view neither launches shots nor changes damage/sinking/objectives.
const weapon = { id: 'gun', medium: 'surface', range: 1000, speed: 500, ttlMs: 4000,
  cooldownMs: 500, damage: 20, depths: ['surfaced'], ammo: 8 };
const fleet = createFleet({ mode: 'factions', matchMs: 10000, intermissionMs: 3000,
  arena: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000, bottomY: -100, cell: 50, obstacles: [] },
  units: ['a', 'b'].map((id, team) => ({ id, team, kind: 'surface', capital: true, position: [0, 0, team ? 300 : -300],
    half: [10, 8, 70], hp: 40, speed: 0, route: [], weapons: [weapon], sensor: null, depth: 'surfaced', depthPlan: [] })),
  aircraft: [[{ id: 'planeA', weapons: [] }], [{ id: 'planeB', weapons: [] }]] });
fleet.advance(500);
const first = fleet.snapshot(0), frozen = JSON.stringify(first);
view.update(first);
assert.equal(JSON.stringify(first), frozen);
assert.equal(view.stats().effects, first.events.filter(e => e.type === 'fire').length);
const initialEffects = view.stats().effects;
view.update(first); assert.equal(view.stats().effects, initialEffects);
for (const p of first.projectiles) {
  const mesh = view.root.getObjectByName(`fleet-projectile:${p.id}`);
  close(mesh.position.toArray(), p.position);
}
let impacted = false, sunk = false;
for (let i = 0; i < 70; i++) {
  fleet.advance(50); const state = fleet.snapshot(0); view.update(state);
  if (state.events.some(e => e.type === 'impact' && e.tick === state.tick)) {
    impacted = true;
    for (const e of state.events.filter(e => e.type === 'impact' && e.tick === state.tick))
      close(view.root.getObjectByName(`fleet-impact:${e.id}`).position.toArray(), e.position);
  }
  if (state.units.some(u => !u.alive)) { sunk = true; break; }
}
assert.ok(impacted && sunk);
assert.equal(view.muzzleWorld('a'), null);
view.reset();
view.update(snapshot(20, [unit('a')], { events: Array.from({ length: 256 }, (_, i) => ({ id: i+1, round: 0, tick: 20,
  type: i % 2 ? 'fire' : 'impact', source: 'a', position: [0, 8, -50] })) }));
assert.equal(view.stats().effects, VIEW_LIMITS.effects);
view.update(snapshot(40, [unit('a')])); assert.equal(view.stats().effects, 0);
view.update(snapshot(41, [unit('a')], { events: [{ id: 257, round: 0, tick: 1, type: 'fire', source: 'a', position: [0, 0, 0] }] }));
assert.equal(view.stats().effects, 0); // Event history cannot replay old muzzle flashes.
view.update(snapshot(42, [unit('a')], { projectiles: [{ id: 9, source: 'unknown_enemy', medium: 'underwater', team: 1, position: [0, -20, 0] }] }));
assert.equal(view.stats().projectiles, 0);
view.update(snapshot(43, [unit('a')], { events: [{ id: 258, round: 0, tick: 43, type: 'fire', source: 'a', position: [0, 8, -50] }] }));
const ownedMesh = view.root.getObjectByName('fleet-fire:258');
let geometryDisposals = 0, materialDisposals = 0;
ownedMesh.geometry.addEventListener('dispose', () => geometryDisposals++);
ownedMesh.material.addEventListener('dispose', () => materialDisposals++);
view.update(snapshot(0, [unit('a')], { round: 1 }));
assert.equal(view.stats().effects, 0); assert.equal(view.stats().projectiles, 0);
assert.throws(() => view.update(snapshot(100, [unit('a')], { round: 0 })), /Stale round/);
assert.throws(() => view.update(snapshot(1, [unit('a', [NaN, 0, 0])], { round: 1 })));
assert.throws(() => view.update(snapshot(1, [unit('a', [100001, 0, 0])], { round: 1 })));
assert.throws(() => view.update(snapshot(Number.MAX_VALUE, [unit('a')], { round: 1 })));
view.dispose(); view.dispose();
assert.equal(modelResourceDisposals, 0);
assert.equal(geometryDisposals, 1); assert.equal(materialDisposals, 1);
assert.deepEqual(view.stats(), { bindings: 0, effects: 0, projectiles: 0, disposed: true });
assert.equal(parent.children.length, 0); assert.throws(() => view.update(first));
assert.deepEqual(meshBytes(), initialMeshBytes);
for (const [file, expected] of Object.entries(originalHashes)) assert.equal(sha(await read(`models/${file}`)), expected);
for (const [file, expected] of dataHashes) assert.equal(sha(await read(file)), expected);
// CPU fault injection: backend/listener failures must not interrupt remaining owned cleanup.
const cleanupFailures = [];
function cleanupCase(name, test) {
  try { test(); console.log(`PASS cleanup fault: ${name}`); }
  catch (error) { cleanupFailures.push({ name, error }); console.error(`FAIL cleanup fault: ${name}: ${error.message}`); }
}
function eventRig() {
  const parent = new T.Group(), rig = createFleetRig(T, { parent, team: 0 });
  rig.update(snapshot(1, [], { events: [
    { id: 1, round: 0, tick: 1, type: 'fire', source: 'fixture', position: [0, 0, 0] },
    { id: 2, round: 0, tick: 1, type: 'impact', source: 'fixture', position: [0, 0, 0] }],
    projectiles: [{ id: 1, source: 'fixture', team: 0, medium: 'surface', position: [0, 0, 0] }] }));
  const meshes = []; rig.root.traverse(node => { if (node.isMesh) meshes.push(node); });
  const geometries = [...new Set(meshes.map(mesh => mesh.geometry))], materials = [...new Set(meshes.map(mesh => mesh.material))];
  assert.equal(meshes.length, 3); assert.equal(geometries.length, 1); assert.equal(materials.length, 3);
  let geometryAttempts = 0; const materialAttempts = materials.map(() => 0);
  geometries[0].addEventListener('dispose', () => geometryAttempts++);
  materials.forEach((material, i) => material.addEventListener('dispose', () => materialAttempts[i]++));
  return { rig, parent, geometry: geometries[0], materials, materialAttempts, geometryAttempts: () => geometryAttempts };
}
function aggregateDispose(rig, causes) {
  let error; try { rig.dispose(); } catch (caught) { error = caught; }
  assert(error instanceof AggregateError, 'Cleanup failures must be AggregateError');
  assert.equal(error.errors.length, causes.length);
  for (const cause of causes) assert(error.errors.includes(cause), 'Original cleanup cause missing');
}
function cleaned(f) {
  assert.deepEqual(f.rig.stats(), { bindings: 0, effects: 0, projectiles: 0, disposed: true });
  assert.equal(f.rig.root.parent, null); assert.equal(f.parent.children.length, 0);
  assert.equal(f.geometryAttempts(), 1); assert.deepEqual(f.materialAttempts, [1, 1, 1]);
  assert.doesNotThrow(() => f.rig.dispose());
  assert.equal(f.geometryAttempts(), 1); assert.deepEqual(f.materialAttempts, [1, 1, 1]);
}
cleanupCase('throwing shared geometry still attempts every material once and closes ownership', () => {
  const f = eventRig(), cause = new Error('fixture geometry backend failure');
  f.geometry.addEventListener('dispose', () => { throw cause; });
  aggregateDispose(f.rig, [cause]); cleaned(f);
});
cleanupCase('one throwing material does not skip the other materials', () => {
  const f = eventRig(), cause = new Error('fixture material backend failure');
  f.materials[0].addEventListener('dispose', () => { throw cause; });
  aggregateDispose(f.rig, [cause]); cleaned(f);
});
cleanupCase('disposal-listener reentry cannot double-dispose owned resources', () => {
  const f = eventRig(); let reentries = 0;
  f.geometry.addEventListener('dispose', () => {
    if (reentries++ === 0) f.rig.dispose(); // Bounded injection even against an unguarded old implementation.
  });
  assert.doesNotThrow(() => f.rig.dispose()); assert.equal(reentries, 1); cleaned(f);
});
cleanupCase('actual GLB caller models restore and survive removal/reparent callback failures', () => {
  const f = eventRig(), caller = new T.Group(); caller.add(escortA, escortB);
  f.rig.bindUnit('a', escortA, descriptors[0]); f.rig.bindUnit('b', escortB, descriptors[1]);
  f.rig.update(snapshot(2, [unit('a', [30, 0, 10], { view: aMotion }), unit('b', [-20, 0, -10], { view: motion(descriptors[1], { yaw: .4, pitch: -.2 }) })]));
  const modelCause = new Error('fixture caller removal callback'), rootCause = new Error('fixture root removal callback'), reparentCause = new Error('fixture caller reparent callback');
  let modelRemovals = 0, rootRemovals = 0, reparents = 0;
  const modelFailure = () => { modelRemovals++; throw modelCause; };
  const rootFailure = () => { rootRemovals++; throw rootCause; };
  const reparentFailure = event => { if (event.child === escortA) { reparents++; throw reparentCause; } };
  escortA.addEventListener('removed', modelFailure); f.rig.root.addEventListener('removed', rootFailure); caller.addEventListener('childadded', reparentFailure);
  try {
    aggregateDispose(f.rig, [modelCause, reparentCause, rootCause]); cleaned(f);
    assert.equal(modelRemovals, 1); assert.equal(rootRemovals, 1); assert.equal(reparents, 1);
    assert.equal(escortA.parent, caller); assert.equal(escortB.parent, caller);
    for (let i = 0; i < 2; i++) for (const [node, initial] of rest[i]) {
      close(node.position.toArray(), initial.position.toArray()); qclose(node.quaternion, initial.quaternion);
      close(node.scale.toArray(), initial.scale.toArray()); assert.equal(node.visible, initial.visible);
    }
    assert.equal(modelResourceDisposals, 0); assert.deepEqual(meshBytes(), initialMeshBytes);
  } finally { escortA.removeEventListener('removed', modelFailure); f.rig.root.removeEventListener('removed', rootFailure); caller.removeEventListener('childadded', reparentFailure); }
});
// Dispose fixture-owned model resources separately: the view must NOT dispose loaded model assets.
for (const object of objects) object.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
assert.equal(cleanupFailures.length, 0, cleanupFailures.map(failure => `${failure.name}: ${failure.error.message}`).join('\n'));
console.log(`PASS: Three ${T.REVISION}; 3 actual GLBs/${geometryTriangles} triangles; escort signed clamps/posed muzzle/rotated root; submarine rest frames/depth/contact-safe hiding; absolute propeller clock/pause/death/reset; real FC events/projectiles/impacts/sinking; dedupe/caps/expiry/disposal; 11 original models and 3 inputs unchanged.`);
console.log('CPU ONLY: no rendered PBR/material, native scene, FC asset-muzzle/arcs adapter or gameplay acceptance.');
