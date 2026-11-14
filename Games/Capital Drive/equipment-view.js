import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const LIMIT = 3;
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.age) && p.remaining > 0;

export function createEquipmentView(scene, heightAt = () => 0) {
  const root = new THREE.Group(); root.name = 'Flare beacons'; scene.add(root);
  const casing = new THREE.BoxGeometry(1, 1, 1), puff = new THREE.SphereGeometry(1, 6, 4);
  const materials = [new THREE.MeshLambertMaterial({ color: 0x6a2221 }),
    new THREE.MeshBasicMaterial({ color: 0xff432e }),
    new THREE.MeshBasicMaterial({ color: 0xff291d, transparent: true, opacity: .18, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0x8e7773, transparent: true, opacity: .20, depthWrite: false })];
  const meshes = materials.map((material, i) => {
    const mesh = new THREE.InstancedMesh(i === 0 ? casing : puff, material, i === 3 ? LIMIT * 4 : LIMIT);
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  });
  const part = new THREE.Object3D();
  let disposed = false, visible = 0, draws = 0, triangles = 0;
  function put(batch, x, y, z, sx, sy, sz) {
    const mesh = meshes[batch]; part.position.set(x, y, z); part.scale.set(sx, sy, sz); part.updateMatrix();
    mesh.setMatrixAt(mesh.count++, part.matrix);
  }
  function update(snapshot, focus) {
    if (disposed) return;
    for (const mesh of meshes) mesh.count = 0;
    visible = draws = triangles = 0;
    for (const flare of (Array.isArray(snapshot) ? snapshot : []).filter(valid).slice(0, LIMIT)) {
      if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z) || Math.hypot(flare.x - focus.x, flare.z - focus.z) > 200) continue;
      const ground = Number.isFinite(flare.y) ? flare.y : heightAt(flare.x, flare.z);
      if (!Number.isFinite(ground)) continue;
      const y = ground + .09, pulse = 1 + Math.sin(flare.age * 14) * .12;
      put(0, flare.x, y, flare.z, .09, .09, .34);
      put(1, flare.x, y + .11, flare.z - .13, .11 * pulse, .16 * pulse, .11 * pulse);
      put(2, flare.x, y + .12, flare.z - .13, .52 * pulse, .35 * pulse, .52 * pulse);
      for (let i = 0; i < 4; i++) {
        const phase = (flare.age * .48 + i / 4) % 1, size = .10 + phase * .28;
        put(3, flare.x + phase * .45, y + .25 + phase * 1.7, flare.z + Math.sin(i * 2 + flare.age * .4) * phase * .18, size, size * .8, size);
      }
      visible++;
    }
    for (const mesh of meshes) {
      mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.visible) { draws++; triangles += mesh.count * mesh.geometry.index.count / 3; }
    }
  }
  return { update, get stats() { return Object.freeze({ capacity: LIMIT, visible, drawCalls: draws, triangles, geometryCount: disposed ? 0 : 2, materialCount: disposed ? 0 : 4, disposed }); },
    dispose() { if (disposed) return; disposed = true; scene.remove(root); meshes.forEach(mesh => mesh.dispose()); casing.dispose(); puff.dispose(); materials.forEach(material => material.dispose()); visible = draws = triangles = 0; } };
}
