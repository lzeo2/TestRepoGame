import * as THREE from './vendor/three.module.js';

// Render-only feedback. Simulation decides whether a shot happens and applies damage.
export function createWorldEffects(scene, roads) {
  const capacity = 64, ends = new Float32Array(capacity * 6), hits = new Float32Array(capacity * 3);
  const remaining = new Float32Array(capacity);
  const lineGeometry = new THREE.BufferGeometry(), hitGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(ends, 3).setUsage(THREE.DynamicDrawUsage));
  hitGeometry.setAttribute('position', new THREE.BufferAttribute(hits, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0xe8bb63 }));
  const impacts = new THREE.Points(hitGeometry, new THREE.PointsMaterial({ color: 0xeadbc0, size: .65 }));
  lines.frustumCulled = impacts.frustumCulled = false;
  scene.add(lines, impacts);
  let next = 0;
  function clear(i) { ends.fill(0, i * 6, i * 6 + 6); hits.set([0, -100, 0], i * 3); }
  function dirty() { lineGeometry.attributes.position.needsUpdate = hitGeometry.attributes.position.needsUpdate = true; }
  for (let i = 0; i < capacity; i++) clear(i);
  return {
    shot(from, to) {
      for (const p of [from, to]) {
        if (!p || ![p.x, p.z, p.y ?? 1.2].every(Number.isFinite) || p.x < 0 || p.z < 0 || p.x >= roads.size || p.z >= roads.size) throw new RangeError('Invalid shot pose');
      }
      const a = roads.center(from.x, from.z), b = roads.center(to.x, to.z), i = next++ % capacity;
      ends.set([a.x, from.y ?? 1.2, a.z, b.x, to.y ?? 1.2, b.z], i * 6);
      hits.set([b.x, to.y ?? 1.2, b.z], i * 3);
      remaining[i] = .14; dirty();
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid effect delta');
      let changed = false;
      for (let i = 0; i < capacity; i++) {
        if (remaining[i] <= 0) continue;
        remaining[i] -= dt;
        if (remaining[i] <= 0) { clear(i); changed = true; }
      }
      if (changed) dirty();
    },
    get active() { return remaining.reduce((n, time) => n + Number(time > 0), 0); },
    dispose() { scene.remove(lines, impacts); lineGeometry.dispose(); hitGeometry.dispose(); lines.material.dispose(); impacts.material.dispose(); },
  };
}
