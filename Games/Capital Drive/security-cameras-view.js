import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Bounded pooled game-camera art. No lights, shadows or independent frame loop.
export function createSecurityCamerasView(scene) {
  const root = new THREE.Group(); root.name = 'Fictional storefront security cameras'; scene.add(root);
  const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .3, .65), new THREE.MeshLambertMaterial({ color: 0xd8d5c7 }), 6);
  const lamp = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .06, .025), new THREE.MeshBasicMaterial({ color: 0x69dc72 }), 6);
  const frameGeometry = new THREE.BufferGeometry();
  const corners = [[-.65, -.4, -1.4], [.65, -.4, -1.4], [.65, .4, -1.4], [-.65, .4, -1.4]];
  const vertices = [];
  for (let i = 0; i < 4; i++) vertices.push(0, 0, -.35, ...corners[i], ...corners[i], ...corners[(i + 1) % 4]);
  frameGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  // Six fixed frames share one geometry/material; only the housing/lamp draw instances.
  const frameMaterial = new THREE.LineBasicMaterial({ color: 0x7b8886, transparent: true, opacity: .38 });
  const frames = Array.from({ length: 6 }, () => { const line = new THREE.LineSegments(frameGeometry, frameMaterial); root.add(line); return line; });
  const dummy = new THREE.Object3D(), meshes = [housing, lamp];
  for (const mesh of meshes) { mesh.count = 0; mesh.frustumCulled = false; root.add(mesh); }
  let disposed = false;
  function update(cameras = [], player, interiorId = null) {
    if (disposed) return;
    let count = 0, active = 0;
    for (const frame of frames) frame.visible = false;
    for (const c of cameras.slice(0, 6)) {
      if (!player || ![player.x, player.z, c.x, c.y, c.z, c.yaw].every(Number.isFinite) ||
        (c.interiorId ?? null) !== interiorId || Math.hypot(c.x - player.x, c.z - player.z) > 150) continue;
      dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(0, c.yaw, 0); dummy.updateMatrix(); housing.setMatrixAt(count++, dummy.matrix);
      if (c.enabled && c.health > 0) {
        const frame = frames[active]; frame.visible = true; frame.position.copy(dummy.position); frame.rotation.copy(dummy.rotation);
        dummy.translateZ(-.34); dummy.updateMatrix(); lamp.setMatrixAt(active++, dummy.matrix);
      }
    }
    housing.count = count; lamp.count = active;
    for (const mesh of meshes) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; }
  }
  function dispose() {
    if (disposed) return; disposed = true; scene.remove(root);
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); }
    frameGeometry.dispose(); frameMaterial.dispose(); root.clear();
  }
  return Object.freeze({ update, dispose });
}
