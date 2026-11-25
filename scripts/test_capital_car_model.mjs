import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { CAPITAL_BY_ID } from '../assets/car-arcade/fleet.js';
import { createCar as base } from '../assets/car-arcade/models.js';
import { createCar, createCarBodywork, disposeCars } from '../Games/Capital Drive/car-model.js';
let total = 0;
const retained = new Set();
for (const id of Object.keys(CAPITAL_BY_ID)) {
  const before = base(id), after = createCar(id), again = createCar(id);
  const bounds = new THREE.Box3().setFromObject(before), actual = new THREE.Box3().setFromObject(after);
  assert(bounds.min.distanceTo(actual.min) < 1e-6 && bounds.max.distanceTo(actual.max) < 1e-6, `${id}: unchanged extents`);
  assert.equal(after.userData.cockpit, before.userData.cockpit);
  assert.deepEqual(after.userData.dimensions, before.userData.dimensions);
  assert.deepEqual(after.userData.profile, before.userData.profile);
  for (let i = 0; i < before.children.length; i++) if (before.children[i].name !== 'trim-interior') assert.equal(after.children[i].geometry, before.children[i].geometry);
  const detail = createCarBodywork(after);
  assert.equal(detail.geometry, createCarBodywork(again).geometry);
  assert.equal(detail.material, after.getObjectByName('trim-interior').material);
  const delta = after.userData.triangles - before.userData.triangles;
  assert(delta > 0 && delta <= 240); assert.equal(after.userData.drawCalls, before.userData.drawCalls);
  assert(detail.geometry.attributes.position.array.every(Number.isFinite));
  total += delta; retained.add(detail.geometry);
}
let disposals = 0;
for (const geometry of retained) geometry.addEventListener('dispose', () => disposals++);
disposeCars(); disposeCars(); assert.equal(disposals, retained.size);
console.log(`PASS Capital car bodywork: ${retained.size} models, ${total / retained.size} added triangles/model, unchanged car draws; unchanged shared geometry, extents/cockpit/profile; shared templates and exact disposal`);
