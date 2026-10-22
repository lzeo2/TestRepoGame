import assert from 'node:assert/strict';
import { AGENT_MODELS } from './model-agents.mjs';

// Node-only geometry contract. Not a visual review, runtime integration or FPS gate.
const limits = { citizen: [15000, 30000, 1.9], zombie: [15000, 30000, 1.65], car: [5000, 10000, null] };
assert.deepEqual(Object.keys(AGENT_MODELS).sort(), Object.keys(limits).sort());
for (const [name, factory] of Object.entries(AGENT_MODELS)) {
  assert.equal(factory.length, 0, `${name}: zero-argument factory`);
  const g = factory(), p = g.getAttribute('position'), index = g.getIndex();
  assert(g.isBufferGeometry && index, `${name}: indexed BufferGeometry`);
  const triangles = index.count / 3, [min, max, height] = limits[name];
  assert(Number.isInteger(triangles) && triangles >= min && triangles <= max, `${name}: ${triangles} triangles outside ${min}..${max}`);
  for (const [key, size] of Object.entries({ position: 3, normal: 3, color: 3, uv: 2 })) {
    assert.equal(g.getAttribute(key)?.itemSize, size, `${name}: ${key} item size`);
  }
  for (const [key, attr] of Object.entries(g.attributes)) {
    assert.equal(attr.count, p.count, `${name}: ${key} vertex count`);
    assert(attr.array.every(Number.isFinite), `${name}: finite ${key}`);
  }
  for (let i = 0; i < index.count; i++) assert(index.getX(i) < p.count, `${name}: valid index`);
  // Reject zero-area triangles and exact duplicated surfaces, not just count indices.
  const seen = new Set();
  for (let i = 0; i < index.count; i += 3) {
    const v = [0, 1, 2].map(k => {
      const n = index.getX(i + k); return [p.getX(n), p.getY(n), p.getZ(n)];
    });
    const a = v[1].map((n, j) => n - v[0][j]), b = v[2].map((n, j) => n - v[0][j]);
    const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    assert(cross.reduce((sum, n) => sum + n * n, 0) > 1e-24, `${name}: nonzero triangle ${i / 3}`);
    const key = v.map(point => point.map(n => n.toFixed(7)).join(',')).sort().join(';');
    assert(!seen.has(key), `${name}: duplicate triangle ${i / 3}`); seen.add(key);
  }
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    assert(uv.getX(i) >= .5 && uv.getX(i) <= 1 && uv.getY(i) >= .5 && uv.getY(i) <= 1, `${name}: neutral surface tile 3`);
  }
  g.computeBoundingBox();
  const { min: low, max: high } = g.boundingBox;
  const size = [high.x - low.x, high.y - low.y, high.z - low.z];
  assert(Math.abs(low.y) < 1e-6, `${name}: base Y=0`);
  assert(size.every(n => n > 0 && n < 4), `${name}: bounded metre scale`);
  if (height) assert(Math.abs(size[1] - height) < 1e-5, `${name}: height`);
  else {
    assert(Math.abs(size[0] - 1.7) < .08, 'car: width ~1.7m');
    assert(Math.abs(size[2] - 3.5) < .12, 'car: length ~3.5m');
  }
  const other = factory();
  assert.notEqual(g, other, `${name}: independently owned factory result`);
  assert.notEqual(p.array, other.attributes.position.array, `${name}: no shared vertex storage`);
  assert.deepEqual(p.array, other.attributes.position.array, `${name}: deterministic geometry`);
  other.dispose(); g.dispose();
  console.log(`${name}: ${triangles} triangles; ${p.count} vertices; bounds ${size.map(n => n.toFixed(3)).join(' x ')} m; base Y=${low.y.toFixed(6)}; PASS`);
}
console.log('AGENT MODELS CHECK PASS: counts, finite attributes, indices, nonzero/unique triangles, paint UVs, bounds, ownership');
