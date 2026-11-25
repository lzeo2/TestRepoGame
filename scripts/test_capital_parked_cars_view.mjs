import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { CAPITAL_BY_ID } from '../assets/car-arcade/fleet.js';
import { createParkedCarsView } from '../Games/Capital Drive/parked-cars-view.js';

const cars = ['lantern', 'orchard', 'gravel', 'lantern'].map((modelId, i) => ({
  id: `owner:${i}`, modelId, color: 0xa13219, x: i * 10, z: 0, yaw: 0
}));
const original = JSON.stringify(cars);
const scene = new THREE.Scene();
const view = createParkedCarsView(scene, cars, () => 7);
const group = scene.children[0];
const matrix = new THREE.Matrix4();
assert.equal(scene.children.length, 1);
assert.equal(group.children.length, 3, 'three draws for mixed-model cell');

for (const [i, modelId] of ['lantern', 'orchard', 'gravel'].entries()) {
  const mesh = group.children[i], geometry = mesh.geometry;
  const spec = CAPITAL_BY_ID[modelId];
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  assert(Math.abs(size.x - spec.width) < .001);
  assert(Math.abs(size.y - spec.height) < .001);
  assert(size.z < spec.length + .04 && size.z >= spec.length);
  assert(geometry.index.count / 3 <= 400);
  mesh.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[13], 7);
  assert(geometry.attributes.paintMask.array.some(v => v === 0));
  assert(geometry.attributes.paintMask.array.some(v => v === 1));
  const positions = geometry.attributes.position;
  const longitudinalEdges = new Set(Array.from({ length: positions.count },
    (_, index) => positions.getZ(index).toFixed(3)));
  assert(longitudinalEdges.size > 8, 'sloped screens and shaped roof');
}
assert.equal(group.children[0].count, 2, 'same-model owners share prototype and draw');
const wagon = group.children[1];
wagon.getMatrixAt(0, matrix);
const preserved = matrix.clone();
assert(view.hide('owner:1'));
assert(!view.hide('owner:1'));
assert(!view.hide('missing'));
wagon.getMatrixAt(0, matrix);
assert.equal(matrix.elements[0], 0);
view.restore();
wagon.getMatrixAt(0, matrix);
assert.deepEqual(matrix.elements, preserved.elements);
assert.equal(JSON.stringify(cars), original);
view.cull({ x: 899, z: 150 });
assert(group.visible);
view.cull({ x: 900, z: 150 });
assert(!group.visible, '600m closest-point AABB boundary');
const shader = { vertexShader: '#include <common>\n#include <color_vertex>' };
wagon.material.onBeforeCompile(shader);
assert(shader.vertexShader.includes('mix(vec3(1.0), instanceColor, paintMask)'));
view.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS parked view: shared <=400-triangle templates, catalog bounds, slopes, paint mask, owner hide/restore, AABB culling/disposal');
