import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';

const MODELS = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];
const CAPACITY = 56;

// Copies the authored fleet once. Factory geometry/materials remain owned by the
// fleet; this adapter owns only its clones, merged geometry and instance buffers.
export function createTrafficView(scene, heightAt, traffic) {
  const root = new THREE.Group(); root.name = 'Instanced road traffic'; scene.add(root);
  const geometries = new Set(), materials = new Set(), materialCopies = new Map(), batches = new Map();
  const pose = new THREE.Object3D(), color = new THREE.Color();
  let disposed = false;
  const stats = { visible: 0, drawCalls: 0, maxDrawCalls: 19, capacity: CAPACITY, models: MODELS.length,
    geometries: 0, materials: 0, templateTriangles: 0, triangles: 0, sourceDrawCalls: 0, disposed: false };
  function ownMaterial(source) {
    if (!materialCopies.has(source)) {
      const copy = source.clone(); materials.add(copy); materialCopies.set(source, copy);
    }
    return materialCopies.get(source);
  }
  function instance(geometry, material, name) {
    geometries.add(geometry);
    const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
    mesh.name = name; mesh.count = 0; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  }
  for (const id of MODELS) {
    const source = createCar(id, { color: '#ffffff' }); source.updateMatrixWorld(true);
    const parts = [], meshes = [];
    for (const child of source.children) {
      if (child.name === 'body' || child.name === 'glazing') {
        meshes.push(instance(child.geometry.clone().applyMatrix4(child.matrixWorld), ownMaterial(child.material), `${id} ${child.name}`));
      } else parts.push(child.geometry.clone().applyMatrix4(child.matrixWorld));
    }
    const detail = mergeGeometries(parts, false); parts.forEach(part => part.dispose());
    if (!detail) throw new Error('Traffic trim merge failed');
    meshes.push(instance(detail, ownMaterial(source.children[1].material), `${id} trim wheels and cockpit`));
    const paint = meshes.find(mesh => mesh.name === `${id} body`);
    // Allocate color storage before rendering; later updates only reuse it.
    for (let i = 0; i < CAPACITY; i++) paint.setColorAt(i, color.setHex(0xffffff));
    paint.instanceColor.setUsage(THREE.DynamicDrawUsage);
    batches.set(id, { meshes, paint, count: 0, triangles: source.userData.triangles });
    stats.templateTriangles += source.userData.triangles;
  }
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    pixels[(y * 64 + x) * 4 + 3] = Math.round(Math.max(0, 1 - Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5)) ** 1.5 * 110);
  }
  const shadowTexture = new THREE.DataTexture(pixels, 64, 64); shadowTexture.needsUpdate = true;
  shadowTexture.magFilter = THREE.LinearFilter; shadowTexture.minFilter = THREE.LinearFilter;
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  materials.add(shadowMaterial);
  const shadowGeometry = new THREE.PlaneGeometry(3.3, 6.2); shadowGeometry.rotateX(-Math.PI / 2); shadowGeometry.translate(0, -.01, 0);
  const shadows = instance(shadowGeometry, shadowMaterial, 'Traffic ground shadows');
  stats.geometries = geometries.size; stats.materials = materials.size;
  function update(focus, { lowGraphics = true } = {}) {
    if (disposed) return;
    stats.visible = 0; stats.drawCalls = 0; stats.triangles = 0; stats.sourceDrawCalls = 0;
    for (const batch of batches.values()) batch.count = 0;
    const radiusSquared = (lowGraphics ? 220 : 300) ** 2;
    if (focus && Number.isFinite(focus.x) && Number.isFinite(focus.z)) for (const car of traffic) {
      if (stats.visible >= CAPACITY) break;
      const batch = batches.get(car.modelId);
      if (!batch || car.active === false || !Number.isFinite(car.x) || !Number.isFinite(car.z) || !Number.isFinite(car.yaw)) continue;
      if ((car.x - focus.x) ** 2 + (car.z - focus.z) ** 2 >= radiusSquared) continue;
      const y = heightAt(car.x, car.z), fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
      const front = heightAt(car.x + fx * 2, car.z + fz * 2), rear = heightAt(car.x - fx * 2, car.z - fz * 2);
      if (!Number.isFinite(y) || !Number.isFinite(front) || !Number.isFinite(rear)) continue;
      pose.position.set(car.x, y + .18, car.z); pose.rotation.set(Math.atan2(front - rear, 4), car.yaw, 0, 'YXZ'); pose.updateMatrix();
      for (const mesh of batch.meshes) mesh.setMatrixAt(batch.count, pose.matrix);
      batch.paint.setColorAt(batch.count, color.set(car.color));
      shadows.setMatrixAt(stats.visible, pose.matrix);
      batch.count++; stats.visible++; stats.triangles += batch.triangles + 2;
    }
    for (const batch of batches.values()) {
      for (const mesh of batch.meshes) { mesh.count = batch.count; mesh.visible = batch.count > 0; mesh.instanceMatrix.needsUpdate = true; }
      batch.paint.instanceColor.needsUpdate = true;
      if (batch.count) stats.drawCalls += batch.meshes.length;
    }
    shadows.count = stats.visible; shadows.visible = stats.visible > 0; shadows.instanceMatrix.needsUpdate = true;
    if (stats.visible) stats.drawCalls++;
    stats.sourceDrawCalls = stats.visible * 8;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; root.removeFromParent();
    for (const mesh of root.children) mesh.dispose();
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); shadowTexture.dispose();
    stats.visible = 0; stats.drawCalls = 0; stats.triangles = 0; stats.sourceDrawCalls = 0; stats.disposed = true;
  }
  update(null);
  return { update, stats, dispose };
}
