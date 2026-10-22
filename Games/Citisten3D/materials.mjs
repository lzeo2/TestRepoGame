import * as THREE from './vendor/three.module.js';
export { applyExternalTerrain } from './external-materials.mjs';

// Inert surfaces during async loading. createWorld does not render until the
// supplied GLB channels replace these materials; there is no procedural fallback.
export function createGroundMaterial() {
  const material = new THREE.MeshStandardMaterial();
  return { material, dispose() { material.dispose(); } };
}

export function createAsphaltMaterial() {
  const material = new THREE.MeshStandardMaterial();
  return { material, dispose() { material.dispose(); } };
}

export function createWater(scene, extent) {
  const geometry = new THREE.PlaneGeometry(extent * 6, extent * 6);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshPhysicalMaterial({ clearcoat: .8, clearcoatRoughness: .17,
    clearcoatNormalScale: new THREE.Vector2(.35, .35) });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = -.4; mesh.receiveShadow = true;
  scene.add(mesh);
  return { mesh, dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); } };
}

// Analytic contact/density bake from actual static model poses, not screen-space AO or a GI claim.
export function createBlockAO(ground, buildings, extent, lotSize) {
  const size = 256, data = new Uint8Array(size * size * 4);
  const map = new THREE.DataTexture(data, size, size);
  map.channel = 1; map.magFilter = map.minFilter = THREE.LinearFilter;
  ground.geometry.setAttribute('uv1', ground.geometry.attributes.uv.clone());
  for (const material of [].concat(ground.material)) { material.aoMap = map; material.aoMapIntensity = .8; }
  let version = -1;
  return { map, update() {
    if (version === buildings.version) return;
    data.fill(255);
    const density = new Map(), poses = [];
    for (const [type, pool] of buildings.pools) if (!['car', 'patrol_car', 'utility_car', 'citizen', 'zombie', 'wall'].includes(type)) {
      for (const h of pool.handles) {
        poses.push(h.pose);
        const key = `${Math.floor(h.pose.x / (lotSize * 8))},${Math.floor(h.pose.z / (lotSize * 8))}`;
        density.set(key, (density.get(key) || 0) + 1);
      }
    }
    for (const pose of poses) {
      const cx = (pose.x / (extent * 2) + .5) * size, cy = (.5 - pose.z / (extent * 2)) * size;
      const radius = Math.max(2, lotSize * size / (extent * 2));
      const key = `${Math.floor(pose.x / (lotSize * 8))},${Math.floor(pose.z / (lotSize * 8))}`;
      for (let y = Math.max(0, Math.floor(cy - radius * 2)); y < Math.min(size, cy + radius * 2); y++) {
        for (let x = Math.max(0, Math.floor(cx - radius * 2)); x < Math.min(size, cx + radius * 2); x++) {
          const d = ((x - cx) ** 2 + (y - cy) ** 2) / (radius ** 2);
          const value = Math.max(75, 255 - Math.exp(-d) * (105 + Math.min(25, density.get(key))));
          const i = (y * size + x) * 4; data[i] = Math.min(data[i], value); data[i + 1] = data[i + 2] = data[i];
        }
      }
    }
    map.needsUpdate = true; version = buildings.version;
  }, dispose() { map.dispose(); } };
}
