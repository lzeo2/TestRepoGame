import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { ORDNANCE_LIMITS } from './ordnance.js';

const valid = item => item && [item.x, item.y, item.z].every(Number.isFinite);
const sameRoom = (item, room) => (item.interiorId ?? null) === room;

// Original fixed geometry. Simulation snapshots own all positions and lifetimes.
export function createOrdnanceView(scene, { quality = 'high' } = {}) {
  const root = new THREE.Group(); root.name = 'Thrown equipment'; scene.add(root);
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  const materials = [new THREE.MeshLambertMaterial({ color: 0x464b35 }),
    new THREE.MeshLambertMaterial({ color: 0x787d83 }),
    new THREE.MeshBasicMaterial({ color: 0xa5a8ab, transparent: true, opacity: .26, depthWrite: false })];
  const capacities = [ORDNANCE_LIMITS.projectiles, ORDNANCE_LIMITS.projectiles, ORDNANCE_LIMITS.clouds * 5];
  const meshes = materials.map((material, index) => {
    const mesh = new THREE.InstancedMesh(geometry, material, capacities[index]);
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  });
  const part = new THREE.Object3D();
  let disposed = false, visibleProjectiles = 0, visibleClouds = 0, draws = 0, triangles = 0;
  function put(index, x, y, z, sx, sy, sz) {
    const mesh = meshes[index]; if (mesh.count >= capacities[index]) return;
    part.position.set(x, y, z); part.scale.set(sx, sy, sz); part.updateMatrix(); mesh.setMatrixAt(mesh.count++, part.matrix);
  }
  function update(snapshot, focus, { interiorId = null } = {}) {
    if (disposed) return;
    meshes.forEach(mesh => { mesh.count = 0; }); visibleProjectiles = visibleClouds = draws = triangles = 0;
    const near = item => valid(item) && sameRoom(item, interiorId) && focus && Number.isFinite(focus.x) && Number.isFinite(focus.z) && Math.hypot(item.x - focus.x, item.z - focus.z) < (quality === 'low' ? 90 : 160);
    for (const item of (snapshot?.projectiles || []).slice(0, ORDNANCE_LIMITS.projectiles)) {
      if (!near(item)) continue;
      put(item.kind === 'smoke' ? 1 : 0, item.x, item.y, item.z, .12, .16, .12); visibleProjectiles++;
    }
    for (const cloud of (snapshot?.clouds || []).slice(0, ORDNANCE_LIMITS.clouds)) {
      if (!near(cloud) || !Number.isFinite(cloud.age) || !Number.isFinite(cloud.remaining) || cloud.remaining <= 0) continue;
      const growth = Math.min(1, .35 + cloud.age * 1.3), fade = Math.min(1, cloud.remaining / 1.5);
      const count = quality === 'low' ? 3 : 5;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count + cloud.age * .06, spread = i === 0 ? 0 : 2.1 * growth;
        const size = 3 * growth * (.8 + fade * .2);
        put(2, cloud.x + Math.cos(angle) * spread, cloud.y + 1.6 + Math.sin(i * 2) * .45, cloud.z + Math.sin(angle) * spread, size, 1.8 * growth, size);
      }
      visibleClouds++;
    }
    for (const mesh of meshes) {
      mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.visible) { draws++; triangles += mesh.count * geometry.index.count / 3; }
    }
  }
  return { update, get stats() { return Object.freeze({ projectiles: visibleProjectiles, clouds: visibleClouds, drawCalls: draws, triangles,
    projectileCapacity: ORDNANCE_LIMITS.projectiles, cloudCapacity: ORDNANCE_LIMITS.clouds, geometryCount: disposed ? 0 : 1, materialCount: disposed ? 0 : 3, disposed }); },
  dispose() { if (disposed) return; disposed = true; scene.remove(root); meshes.forEach(mesh => mesh.dispose()); geometry.dispose(); materials.forEach(material => material.dispose()); visibleProjectiles = visibleClouds = draws = triangles = 0; } };
}
