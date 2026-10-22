import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { SERVICE_MODELS } from './model-services.mjs';

// Run: node Games/Citisten3D/model-services-check.mjs
// Geometry gate only. No renderer, visual-grade, LOD or performance acceptance.
const expected = { power: 16504, water: 10160, police: 14388, fire: 17788,
  park: 13544, wall: 5556, watchtower: 10560 };
const heightRange = { power: [12.5, 13.5], water: [9.5, 10.5], police: [4.5, 5.4],
  fire: [7, 8], park: [4.4, 5.3], wall: [4, 4.4], watchtower: [9.8, 10.6] };
assert.deepEqual(Object.keys(SERVICE_MODELS).sort(), Object.keys(expected).sort());
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const fmt = v => v.toArray().map(n => Math.abs(n) < 1e-6 ? '0.000' : n.toFixed(3)).join(',');
let total = 0, trees = 0;
for (const [key, count] of Object.entries(expected)) {
  const factory = SERVICE_MODELS[key];
  assert.equal(factory.length, 0, `${key}: zero-argument factory`);
  const g = factory(), second = factory();
  assert(g instanceof THREE.BufferGeometry, `${key}: BufferGeometry`);
  assert(g.index, `${key}: indexed`);
  assert.equal(g.index.count, count * 3, `${key}: exact actual triangle count`);
  assert(count >= 5000 && count <= (key === 'park' ? 30000 : 40000));
  assert.equal(g.index.count % 3, 0);
  for (const [name, itemSize] of Object.entries({ position: 3, normal: 3, color: 3, uv: 2 })) {
    const attr = g.getAttribute(name);
    assert(attr, `${key}: ${name}`);
    assert.equal(attr.itemSize, itemSize);
    assert.equal(attr.count, g.attributes.position.count);
    assert.notEqual(attr.array, second.getAttribute(name).array, `${key}: individually owned output`);
    assert.deepEqual(attr.array, second.getAttribute(name).array, `${key}: deterministic ${name}`);
    for (const n of attr.array) {
      assert(Number.isFinite(n), `${key}: finite ${name}`);
      if (name === 'color' || name === 'uv') assert(n >= 0 && n <= 1, `${key}: bounded ${name}`);
    }
  }
  assert.notEqual(g.index.array, second.index.array);
  assert.deepEqual(g.index.array, second.index.array);
  for (const index of g.index.array) assert(Number.isInteger(index) && index >= 0 && index < g.attributes.position.count);
  for (let i = 0; i < g.attributes.normal.count; i++) {
    a.fromBufferAttribute(g.attributes.normal, i);
    assert(Math.abs(a.length() - 1) < .001, `${key}: unit normal ${i}`);
  }
  // Counting the index buffer alone can mask pole/zero-area padding.
  for (let i = 0; i < g.index.count; i += 3) {
    a.fromBufferAttribute(g.attributes.position, g.index.getX(i));
    b.fromBufferAttribute(g.attributes.position, g.index.getX(i + 1));
    c.fromBufferAttribute(g.attributes.position, g.index.getX(i + 2));
    assert(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-16, `${key}: nondegenerate triangle ${i / 3}`);
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  const bounds = g.boundingBox, size = bounds.getSize(new THREE.Vector3());
  for (const v of [bounds.min, bounds.max, size, g.boundingSphere.center]) assert(v.toArray().every(Number.isFinite));
  assert(Number.isFinite(g.boundingSphere.radius) && g.boundingSphere.radius > 0);
  assert(Math.abs(bounds.min.y) < 1e-6, `${key}: base Y=0 (Float32 tolerance)`);
  assert(size.x > 0 && size.x <= 10.000001 && size.z > 0 && size.z <= 10.000001, `${key}: <=10m lot`);
  assert(bounds.min.x >= -5.000001 && bounds.max.x <= 5.000001 && bounds.min.z >= -5.000001 && bounds.max.z <= 5.000001);
  assert(size.y >= heightRange[key][0] && size.y <= heightRange[key][1], `${key}: KIT approximate height`);
  if (key === 'wall') {
    assert(Math.abs(size.x - 10) < 1e-6, 'wall: local X exactly 10m');
    assert(size.z < 1.6, 'wall: narrow defense segment');
  }
  console.log(`${key}: ${count} triangles; bounds [${fmt(bounds.min)}]..[${fmt(bounds.max)}]; dimensions ${fmt(size)} m`);
  if (key === 'park') {
    assert.equal(g.userData.trees.length, 2);
    let lastEnd = 0;
    for (const [i, range] of g.userData.trees.entries()) {
      const { firstIndex, indexCount } = range;
      assert(Number.isInteger(firstIndex) && firstIndex % 3 === 0 && firstIndex >= lastEnd);
      assert.equal(indexCount, 6076 * 3, `tree ${i + 1}: exact triangles`);
      assert(indexCount / 3 >= 2000 && indexCount / 3 <= 15000);
      assert(firstIndex + indexCount <= g.index.count);
      const treeBounds = new THREE.Box3();
      for (let j = firstIndex; j < firstIndex + indexCount; j++) {
        a.fromBufferAttribute(g.attributes.position, g.index.getX(j)); treeBounds.expandByPoint(a);
      }
      const treeSize = treeBounds.getSize(new THREE.Vector3());
      assert(treeSize.y > 4 && treeSize.y < 5 && treeSize.x > 2 && treeSize.z > 2);
      assert(treeBounds.min.y >= 0, `tree ${i + 1}: no underground padding`);
      console.log(`  tree ${i + 1}: ${indexCount / 3} triangles; bounds [${fmt(treeBounds.min)}]..[${fmt(treeBounds.max)}]`);
      lastEnd = firstIndex + indexCount; trees++;
    }
    assert.equal(count - 2 * 6076, 1392, 'park: path/base/bench accounting');
  } else assert.equal(g.userData.trees, undefined);
  second.dispose(); g.dispose(); total += count;
}
console.log(`SERVICE MODEL CHECK PASS: 7 models, ${total} actual nondegenerate triangles, ${trees} trees; finite attributes/bounds, independent deterministic factories, atlas UVs, KIT scale.`);
