import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { createLandscape } from './terrain.mjs';
import { createFreeCamera } from './camera.mjs';

const scene = new THREE.Scene(), land = createLandscape(scene, 1000);
const again = createLandscape(new THREE.Scene(), 1000);
assert.deepEqual(land.heightmap.samples, again.heightmap.samples, 'deterministic sampled heights');
assert.deepEqual(land.features, again.features, 'deterministic instance transforms/bounds');
assert.deepEqual(land.mesh.geometry.attributes.color.array, again.mesh.geometry.attributes.color.array);
again.dispose();
assert.throws(() => createLandscape(scene, 0), RangeError);
for (let z = -995; z <= 995; z += 10) for (let x = -995; x <= 995; x += 10) {
  assert.equal(land.surfaceHeight(x, z), 0, 'all playable foundations flat');
  assert.equal(land.floorHeight(x, z, 1), 0, 'no natural feature colliders on playable lots');
}
const { samples, outer, inner, stride, step } = land.heightmap;
assert(Math.max(...samples) > 150, 'visible distant elevation variation');
assert(Math.min(...samples) < -10, 'basin exposes the existing water');
assert(land.surfaceHeight(1033, 0) > 0, 'dry sandy bank');
assert(land.surfaceHeight(1200, 0) < -.4, 'shore slopes below existing water');
assert(land.surfaceHeight(1599, 0) < -15, 'deep basin');
assert.equal(land.diagnostics.surfaceTriangles, ((outer * 2) ** 2 - (inner * 2) ** 2) * 2);
// Replaces the obsolete 8,192 plane/slab budget, not a performance acceptance claim.
assert(land.diagnostics.triangles + 2 < 25000, 'all terrain, skirts and instanced features stay under 25k');
assert.equal(land.diagnostics.featureInstances, 256, 'bounded static natural features');
assert.equal(scene.children.length, 5, 'one surface and four instanced feature families, not per-feature meshes');
assert.equal(land.diagnostics.draws, scene.children.length);
assert(land.batches.every(b => b.isInstancedMesh && b.material === land.mesh.material));
const renderedTriangles = scene.children.reduce((sum, b) => sum + (b.geometry.index?.count ?? b.geometry.attributes.position.count) / 3 * (b.isInstancedMesh ? b.count : 1), 0);
assert.equal(renderedTriangles, land.diagnostics.triangles, 'counts include every feature instance and skirt');

// Check the actual rendered triangles, not just the formula that generated them.
const p = land.mesh.geometry.attributes.position, index = land.mesh.geometry.index;
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
let rockVertices = 0, grassVertices = 0;
for (let i = 0; i < stride * stride; i++) {
  const tint = land.mesh.geometry.attributes.color;
  if (p.getY(i) > 140 && tint.getX(i) > tint.getY(i)) rockVertices++;
  if (p.getY(i) > 2 && p.getY(i) < 25 && tint.getY(i) > tint.getX(i)) grassVertices++;
}
assert(rockVertices > 0 && grassVertices > 0, 'grass and exposed rock elevation bands are in the rendered colors');
for (let i = 0; i < land.diagnostics.surfaceTriangles * 3; i += 3) {
  a.fromBufferAttribute(p, index.getX(i)); b.fromBufferAttribute(p, index.getX(i + 1)); c.fromBufferAttribute(p, index.getX(i + 2));
  const x = (a.x + b.x + c.x) / 3, z = (a.z + b.z + c.z) / 3, y = (a.y + b.y + c.y) / 3;
  assert(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).y > 0, 'upward solid terrain winding');
  assert(Math.abs(land.surfaceHeight(x, z) - y) < .002, 'triangle interpolation matches rendered height');
  assert(land.floorHeight(x, z) >= y - .0001, 'point floor covers every terrain triangle');
  assert(land.floorHeight(a.x + .6, a.z + .6, 1) >= a.y - .0001, 'radius covers rendered grid vertices across cell boundaries');
}
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
land.mesh.updateMatrixWorld(true);
for (let i = 0; i < 120; i++) {
  const x = Math.sin(i * 7.1) * 1599, z = Math.cos(i * 3.7) * 1599;
  if (Math.abs(x) < 1000 && Math.abs(z) < 1000) continue;
  ray.set(new THREE.Vector3(x, 500, z), down);
  const hit = ray.intersectObject(land.mesh)[0];
  assert(hit, 'no holes in outskirts');
  assert(Math.abs(hit.point.y - land.surfaceHeight(x, z)) < .002, 'actual raycast matches height samples');
  for (const radius of [1, 12, step * .75]) {
    for (let j = 0; j < 12; j++) {
      const angle = j / 12 * Math.PI * 2;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      assert(land.floorHeight(x, z, radius) >= land.surfaceHeight(px, pz) - .002, 'radius footprint covers hillside and shoreline');
    }
  }
}
for (const x of [-1600, 1600]) for (const z of [-1600, -900, 0, 900, 1600]) {
  assert(land.floorHeight(x, z) >= land.surfaceHeight(x, z), 'outer edge floor is covered');
}
assert.equal(land.floorHeight(2000, 2000), 0, 'outside geometry has conservative base floor');

// Every closed source model has two oppositely oriented uses of each geometric edge.
for (const batch of land.batches) {
  const vertices = batch.geometry.attributes.position, edges = new Map();
  const vertexKey = i => [vertices.getX(i), vertices.getY(i), vertices.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
  for (let i = 0; i < vertices.count; i += 3) {
    const triangle = [vertexKey(i), vertexKey(i + 1), vertexKey(i + 2)];
    assert.equal(new Set(triangle).size, 3, 'no degenerate feature triangles');
    for (let j = 0; j < 3; j++) {
      const from = triangle[j], to = triangle[(j + 1) % 3], key = [from, to].sort().join('/');
      const e = edges.get(key) ?? { count: 0, winding: 0 };
      e.count++; e.winding += from < to ? 1 : -1; edges.set(key, e);
    }
  }
  assert([...edges.values()].every(e => e.count === 2 && e.winding === 0), 'tree/grass/rock geometry is closed with consistent winding');
  const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3();
  for (let instance = 0; instance < batch.count; instance++) {
    batch.getMatrixAt(instance, matrix);
    for (let i = 0; i < vertices.count; i++) {
      vertex.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
      assert(land.floorHeight(vertex.x, vertex.z) >= vertex.y, 'radius floor covers actual instanced feature vertices');
    }
  }
}
for (const feature of land.features) {
  assert(Math.abs(feature.x) - feature.w / 2 > 1000 || Math.abs(feature.z) - feature.d / 2 > 1000, 'features outside build lots');
  assert(land.floorHeight(feature.x, feature.z) >= feature.y + feature.h / 2, `${feature.kind} uses rendered top`);
  assert(land.floorHeight(feature.x + feature.w / 2 + .5, feature.z, 1) >= feature.y + feature.h / 2, 'radius covers feature edges');
}
const small = createLandscape(new THREE.Scene(), 640);
assert(small.features.every(f => Math.abs(f.x) - f.w / 2 > 640 || Math.abs(f.z) - f.d / 2 > 640), '128-lot specimen also keeps features off lots');
small.dispose();

// Actual controller with lightweight event targets, no browser/GPU dependencies.
const oldWindow = globalThis.window, oldHTMLElement = globalThis.HTMLElement;
globalThis.window = new EventTarget(); globalThis.HTMLElement = class {};
const canvas = new EventTarget(); canvas.clientHeight = 800;
const camera = new THREE.PerspectiveCamera();
const controls = createFreeCamera(camera, canvas, land.edge, land.floorHeight);
for (const f of land.features) {
  camera.position.set(f.x - f.w / 2 - 3, 2, f.z);
  controls.setPose({ x: f.x, z: f.z, y: 2 }, true);
  assert(camera.position.y >= land.floorHeight(f.x, f.z, 1) + 2, 'snap cannot fall through solid features');
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
let disposals = 0;
for (const object of scene.children) object.geometry.addEventListener('dispose', () => disposals++);
land.mesh.material.addEventListener('dispose', () => disposals++);
land.dispose(); assert.equal(scene.children.length, 0); assert.equal(disposals, 6, 'all five geometries/shared material released');
console.log(`TERRAIN CHECK PASS: ${samples.length} height samples, ${land.diagnostics.surfaceTriangles} surface + ${land.diagnostics.skirtTriangles} skirt + ${land.diagnostics.featureTriangles} instanced feature triangles; ${land.features.length} features, ${renderedTriangles + 2}/25000 triangles including city, ${land.diagnostics.draws} landscape draws; rendered surface/radius/closed models/snap/smoothing/sweep/disposal`);
