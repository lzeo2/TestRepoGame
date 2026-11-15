import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Only the current full player car is deformed. Traffic keeps its instanced ABI.
export function createVehicleDamageView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Player vehicle fire and smoke'; scene.add(root);
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xf79324 });
  const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0x47443f, transparent: true, opacity: .48, depthWrite: false });
  const fire = new THREE.InstancedMesh(geometry, fireMaterial, 5), smoke = new THREE.InstancedMesh(geometry, smokeMaterial, 5);
  fire.name = 'Engine flames'; smoke.name = 'Engine smoke';
  for (const mesh of [fire, smoke]) {
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh);
  }
  const pose = new THREE.Object3D();
  let bound = null, records = [], severity = -1, disposed = false, phase = 0;
  function release() {
    for (const record of records) {
      if (record.mesh.geometry === record.copy) record.mesh.geometry = record.source;
      record.copy.dispose();
    }
    records = []; bound = null; severity = -1;
  }
  function deform(mesh, amount) {
    if (mesh !== bound) { release(); bound = mesh; }
    if (!bound || amount === severity) return;
    if (amount === 0 && records.length) { release(); bound = mesh; severity = 0; return; }
    if (!records.length && amount > 0) {
      for (const child of bound.children) if (child.isMesh && ['body', 'trim-interior'].includes(child.name)) {
        const source = child.geometry, copy = source.clone();
        records.push({ mesh: child, source, copy, original: source.attributes.position.array.slice() });
        child.geometry = copy;
      }
    }
    const length = bound.userData?.dimensions?.length || 4.7;
    for (const record of records) {
      const positions = record.copy.attributes.position.array, original = record.original;
      for (let i = 0; i < positions.length; i += 3) {
        const weight = Math.max(0, Math.min(1, (-original[i + 2] - length * .18) / (length * .32)));
        const dent = amount * weight;
        positions[i] = original[i] * (1 - dent * .08);
        positions[i + 1] = original[i + 1] - dent * .17 + Math.sin(original[i] * 9) * dent * .035;
        positions[i + 2] = original[i + 2] + dent * .42;
      }
      record.copy.attributes.position.needsUpdate = true;
      record.copy.computeVertexNormals(); record.copy.computeBoundingSphere(); record.copy.computeBoundingBox();
    }
    severity = amount;
  }
  function put(mesh, i, x, y, z, sx, sy, sz) {
    pose.position.set(x, y, z); pose.scale.set(sx, sy, sz); pose.updateMatrix(); mesh.setMatrixAt(i, pose.matrix);
  }
  function update(state, playerMesh, { interiorId = null } = {}) {
    if (disposed) return;
    const valid = state?.active && [state.severity, state.x, state.z, state.yaw, state.age, state.fire, state.smoke].every(Number.isFinite);
    deform(playerMesh || null, valid ? Math.round(Math.max(0, Math.min(1, state.severity)) * 20) / 20 : 0);
    fire.count = smoke.count = 0;
    if (valid && playerMesh && interiorId === null && (state.fire > 0 || state.smoke > 0)) {
      phase = state.age;
      const dimensions = playerMesh.userData?.dimensions;
      const length = dimensions?.length || 4.7, engine = length * .32;
      const x = state.x - Math.sin(state.yaw) * engine, z = state.z - Math.cos(state.yaw) * engine;
      const ground = heightAt(x, z);
      if (Number.isFinite(ground)) for (let i = 0; i < 5; i++) {
        const angle = i * 2.4 + phase * .3, offset = i ? .22 : 0;
        if (state.fire > 0) {
          const flicker = .8 + Math.sin(phase * 17 + i * 2) * .2, size = state.fire * flicker;
          put(fire, fire.count++, x + Math.cos(angle) * offset, ground + .8 + i % 2 * .16,
            z + Math.sin(angle) * offset, .18 * size, (.45 + i % 2 * .18) * size, .18 * size);
        }
        if (state.smoke > 0) {
          const rise = (phase * .65 + i * .21) % 1, size = (.25 + rise * .45) * state.smoke;
          put(smoke, smoke.count++, x + Math.sin(i * 2 + phase * .4) * rise * .45,
            ground + 1.2 + rise * 2.4, z + Math.cos(i * 2 + phase * .3) * rise * .35, size, size * 1.2, size);
        }
      }
    }
    for (const mesh of [fire, smoke]) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; release(); root.removeFromParent();
    fire.dispose(); smoke.dispose(); geometry.dispose(); fireMaterial.dispose(); smokeMaterial.dispose();
    fire.count = smoke.count = 0;
  }
  return { update, dispose, get stats() { return Object.freeze({ disposed, fireInstances: fire.count, smokeInstances: smoke.count,
    drawCalls: Number(fire.visible && !disposed) + Number(smoke.visible && !disposed), capacity: 10,
    clonedGeometries: records.length, effectGeometries: disposed ? 0 : 1, effectMaterials: disposed ? 0 : 2, phase }); } };
}
