import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { CITY_MODELS } from './model-city.mjs';

assert.deepEqual(Object.keys(CITY_MODELS), ['residential', 'commercial', 'industrial', 'townhall']);
const counts = [];
for (const [name, factory] of Object.entries(CITY_MODELS)) {
  assert.equal(factory.length, 0, `${name}: zero-argument factory`);
  const g = factory();
  assert.ok(g instanceof THREE.BufferGeometry && g.index, `${name}: indexed geometry`);
  const count = g.index.count / 3, civic = name === 'townhall';
  assert.ok(Number.isInteger(count) && count >= (civic ? 100000 : 8000) && count <= (civic ? 140000 : 60000), `${name}: ${count} triangles`);
  counts.push(count);
  const position = g.getAttribute('position');
  for (const [key, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
    const a = g.getAttribute(key);
    assert.equal(a?.itemSize, size, `${name}: ${key} size`);
    assert.equal(a.count, position.count, `${name}: ${key} count`);
    for (const value of a.array) {
      assert.ok(Number.isFinite(value), `${name}: finite ${key}`);
      if (key === 'uv' || key === 'color') assert.ok(value >= 0 && value <= 1, `${name}: ${key} range`);
    }
  }
  for (const index of g.index.array) assert.ok(index >= 0 && index < position.count, `${name}: valid index`);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let degenerate = 0;
  for (let i = 0; i < g.index.count; i += 3) {
    a.fromBufferAttribute(position, g.index.getX(i));
    b.fromBufferAttribute(position, g.index.getX(i + 1));
    c.fromBufferAttribute(position, g.index.getX(i + 2));
    if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-16) degenerate++;
  }
  assert.equal(degenerate, 0, `${name}: no collapsed triangles counted as detail`);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox, size = g.boundingBox.getSize(new THREE.Vector3());
  assert.ok(Math.abs(min.y) < 1e-5, `${name}: Y=0 base`);
  assert.ok(size.x <= (civic ? 18 : 9.2) && size.z <= (civic ? 18 : 9.2), `${name}: lot footprint`);
  assert.ok(max.y <= ({ residential: 5.1, commercial: 12.1, industrial: 6.5, townhall: 17.2 })[name], `${name}: KIT height envelope`);
  assert.ok(min.x >= (civic ? -9 : -4.6) && max.x <= (civic ? 9 : 4.6), `${name}: X centred`);
  assert.ok(min.z >= (civic ? -9 : -4.6) && max.z <= (civic ? 9 : 4.6), `${name}: Z centred`);
  const bytes = g.index.array.byteLength + Object.values(g.attributes).reduce((sum, a) => sum + a.array.byteLength, 0);
  console.log(`${name}: ${count} indexed triangles; bounds ${size.toArray().map(n => n.toFixed(3)).join(' x ')}m; base ${min.y.toFixed(3)}m; buffers ${bytes} bytes`);
  g.dispose();
}
assert.equal(new Set(counts.slice(0, 3)).size, 3, 'zone triangle counts differ');
console.log('CITY MODEL CHECK PASS: counts, indexed topology, finite attributes, UV/color ranges, nondegenerate triangles, lot bounds, Y=0 bases');
