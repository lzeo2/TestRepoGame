import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { appearanceForPerson, createPersonGeometries, emitPersonParts, PERSON_MODEL } from '../Games/Capital Drive/person-model.js';
import { createPedestrians } from '../Games/Capital Drive/pedestrians.js';

const appearance = appearanceForPerson('ped:7');
assert.deepEqual(appearanceForPerson(7), appearance, 'numeric sidewalk IDs have the same identity as ped: IDs');
assert.deepEqual(appearanceForPerson('ped:7'), appearance, 'identity is deterministic across calls');
assert(Object.isFrozen(appearance));
assert.throws(() => { appearance.skin = 0; }, TypeError);
const people = Array.from({ length: 128 }, (_, i) => appearanceForPerson(`traffic:${i}`));
assert.equal(new Set(people.map(p => p.key)).size, 128);
assert(new Set(people.map(p => [p.shirt, p.trousers, p.skin, p.hair].join(','))).size > 60, 'crowd appearances remain visibly varied');
assert(people.every(p => p.height >= 0.92 && p.height < 1.12));
assert.equal(new Set(people.map(p => p.skin)).size, 5);
assert.equal(appearanceForPerson('player').shirt, 0xb47442);
assert.equal(appearanceForPerson('police').shirt, 0x25354d);
assert.equal(appearanceForPerson('player').shoes, 0x292a28);
assert(Object.isFrozen(PERSON_MODEL) && Object.values(PERSON_MODEL).filter(v => typeof v === 'object').every(Object.isFrozen));

const geometries = createPersonGeometries();
const expected = { capsule: new THREE.CapsuleGeometry(1, 1, 2, 5), sphere: new THREE.SphereGeometry(1, 6, 4), box: new THREE.BoxGeometry(1, 1, 1) };
for (const kind of Object.keys(expected)) {
  assert.deepEqual(geometries[kind].attributes.position.array, expected[kind].attributes.position.array, `${kind} preserves the established rounded geometry`);
  assert.deepEqual(geometries[kind].index.array, expected[kind].index.array);
  geometries[kind].dispose(); expected[kind].dispose();
}
const parts = kind => {
  const result = [];
  emitPersonParts(appearance, { kind, stride: 0.4 }, (name, x, y, z, sx, sy, sz, color, rotationX = 0) => result.push({ name, x, y, z, sx, sy, sz, color, rotationX }));
  return result;
};
const standing = parts('standing'), driver = parts('driver'), passenger = parts('passenger');
for (const pose of [standing, driver, passenger]) {
  assert.equal(pose.length, 11);
  assert.deepEqual(Object.fromEntries(Object.keys(PERSON_MODEL.shapes).map(name => [name, pose.filter(p => p.name === name).length])),
    { torso: 1, head: 1, hair: 1, arms: 2, legs: 2, shoes: 2, hands: 2 });
  assert(pose.every(p => Object.values(p).filter(v => typeof v === 'number').every(Number.isFinite)));
  assert(pose.every(p => p.sx > 0 && p.sy > 0 && p.sz > 0));
}
assert.equal(standing.find(p => p.name === 'head').y, 1.62);
assert.equal(standing.find(p => p.name === 'torso').y, 1.12);
assert.equal(standing.find(p => p.name === 'shoes').y - PERSON_MODEL.shoes.sy / 2, 0);
for (const seated of [driver, passenger]) {
  for (let i = 0; i < standing.length; i++) {
    assert.deepEqual([seated[i].sx, seated[i].sy, seated[i].sz, seated[i].color], [standing[i].sx, standing[i].sy, standing[i].sz, standing[i].color], 'seating changes pose while retaining the same body and palette');
  }
  assert(Math.abs(seated.find(p => p.name === 'head').y + 0.015) < 1e-12);
  assert(Math.abs(Math.max(...seated.map(p => p.y + (p.name === 'torso' || p.name === 'arms' || p.name === 'legs' ? 1.5 : 1) * p.sy)) - PERSON_MODEL.seatedHeadTop) < 1e-12);
  assert(seated.filter(p => ['torso', 'arms', 'legs', 'hands', 'shoes'].includes(p.name)).every(p => p.y < -0.3));
}
assert.notEqual(driver.find(p => p.name === 'arms').rotationX, passenger.find(p => p.name === 'arms').rotationX);
console.log('PASS shared deterministic immutable appearances, diversity, original rounded geometry and eleven-part standing/seated proportions');

const scene = new THREE.Scene();
const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, spawn: { x: 0, z: 0, yaw: 0 },
  roads: [{ id: 'street', name: 'Example Street', type: 'residential', width: 8, points: [[-350, 0], [0, 0], [350, 0]] }], landmarks: [] };
const pedestrians = createPedestrians(scene, map, () => 0);
assert.equal(pedestrians.stats.count, 36);
assert.equal(pedestrians.stats.capacity, 64);
assert.equal(scene.children[0].children.length, 11);
const before = pedestrians.snapshot();
assert(before.every(p => Object.isFrozen(p.appearance) && p.appearanceKey === appearanceForPerson(p.id).key));
const headMesh = scene.children[0].children.find(mesh => mesh.name === 'Pedestrian head');
const visible = before.filter(p => Math.hypot(p.x, p.z) < 180).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
for (let i = 0; i < visible.length; i++) {
  const matrix = new THREE.Matrix4(); headMesh.getMatrixAt(i, matrix);
  const scale = new THREE.Vector3(); matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  assert(Math.abs(scale.x - PERSON_MODEL.head.sx * visible[i].appearance.height) < 1e-6, 'sidewalk renderer uses shared head size and uniform identity height');
}
pedestrians.update(map.spawn, 0);
assert.deepEqual(pedestrians.snapshot(), before);
for (let i = 0; i < 20; i++) pedestrians.update({ x: 400, z: 400 }, 0.1);
assert(pedestrians.snapshot().some((p, i) => Math.hypot(p.x - before[i].x, p.z - before[i].z) > 0.2));
const appearanceKeys = before.map(p => p.appearanceKey);
pedestrians.resetPopulation(map.spawn);
assert.deepEqual(pedestrians.snapshot().map(p => p.appearanceKey), appearanceKeys);
assert(pedestrians.stats.drawCalls <= 11);
pedestrians.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS pedestrian shared descriptors/head proportions, 36/64 caps, pause, walking, reset identity, eleven batches and disposal');
