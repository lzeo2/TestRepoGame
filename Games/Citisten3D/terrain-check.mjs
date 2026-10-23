import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { createLandscape } from './terrain.mjs';
import { createFreeCamera } from './camera.mjs';

const scene = new THREE.Scene(), land = createLandscape(scene, 1000);
const again = createLandscape(new THREE.Scene(), 1000);
assert.deepEqual(land.boxes, again.boxes, 'deterministic landscape'); again.dispose();
assert.equal(land.floorHeight(0, 0), 0);
assert.equal(land.floorHeight(995, 995, 1), 0, 'all playable foundations flat');
assert(land.boxes.some(b => b.kind === 'slab' && b.y + b.h / 2 > 100), 'taller distant hills');
const bank = land.boxes.filter(b => b.kind === 'slab' && b.x > 1000 && Math.abs(b.z) < 800);
assert(bank.some(b => b.y + b.h / 2 < -.4), 'existing water exposed by basin');
assert(bank.some(b => b.y + b.h / 2 >= -.5), 'shallow shoreline shelf');
assert(land.features.some(b => b.kind === 'boulder'));
assert(land.features.some(b => b.kind === 'trunk'));
assert(land.diagnostics.triangles + 2 <= 8192, 'terrain triangle budget no higher than old 64x64 plane');
for (const b of land.features) {
  assert(Math.abs(b.x) - b.w / 2 > 1000 || Math.abs(b.z) - b.d / 2 > 1000, 'features outside build lots');
  assert(land.floorHeight(b.x, b.z) >= b.y + b.h / 2, `${b.kind} uses rendered top`);
  assert(land.floorHeight(b.x + b.w / 2 + .5, b.z, 1) >= b.y + b.h / 2, 'radius covers box edges');
}

// Actual controller with lightweight event targets, no browser/GPU dependencies.
const oldWindow = globalThis.window, oldHTMLElement = globalThis.HTMLElement;
globalThis.window = new EventTarget(); globalThis.HTMLElement = class {};
const canvas = new EventTarget(); canvas.clientHeight = 800;
const camera = new THREE.PerspectiveCamera();
const controls = createFreeCamera(camera, canvas, land.edge, land.floorHeight);
for (const b of land.features) {
  controls.setPose({ x: b.x, z: b.z, y: 2 }, true);
  assert(camera.position.y >= land.floorHeight(b.x, b.z, 1) + 2, 'snap cannot fall through tree/boulder');
  for (let i = 0; i < 5; i++) { controls.update(.1); assert(camera.position.y >= land.floorHeight(camera.position.x, camera.position.z, 1) + 2); }
}
// Smoothing from a hill down to a low destination must not interpolate underground.
controls.setPose({ x: -1450, z: -1450, y: 2 }, true);
controls.setPose({ x: 0, z: 0, y: 2 });
for (let i = 0; i < 100; i++) {
  controls.update(.1);
  assert(camera.position.y >= land.floorHeight(camera.position.x, camera.position.z, 1) + 2);
}
// A thin collider between two endpoints is still hit by swept probes.
const narrow = createFreeCamera(camera, canvas, 100, (x, z, r) => Math.abs(x - 5) <= .4 + r && Math.abs(z) < 2 ? 30 : 0);
narrow.setPose({ x: 0, z: 0, y: 2 }, true);
narrow.setPose({ x: 10, z: 0, y: 2 }, true);
assert(camera.position.y >= 32, 'no tunneling through narrow box');
narrow.dispose(); controls.dispose(); globalThis.window = oldWindow; globalThis.HTMLElement = oldHTMLElement;
console.log(`TERRAIN CHECK PASS: ${land.diagnostics.slabs} slabs, ${land.features.length} natural boxes, ${land.diagnostics.triangles + 2}/8192 triangles, single landscape draw; solid probes/snap/smoothing/sweep`);
land.dispose(); assert.equal(scene.children.length, 0);
