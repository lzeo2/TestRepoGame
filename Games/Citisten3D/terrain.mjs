import * as THREE from './vendor/three.module.js';

// One fixed slab field outside the buildable square: roads/foundations stay level.
export function createLandscape(scene, extent) {
  const step = extent / 10, edge = extent * 1.6, slabs = [], features = [];
  const heights = new Map();
  const hash = n => { n = Math.imul(n ^ 0x45d9f3b, 0x45d9f3b); return (n >>> 0) / 4294967296; };
  const box = (x, y, z, w, h, d, color, kind) => ({ x, y, z, w, h, d, color, kind });
  for (let iz = -16; iz < 16; iz++) for (let ix = -16; ix < 16; ix++) {
    if (ix >= -10 && ix < 10 && iz >= -10 && iz < 10) continue;
    const x = (ix + .5) * step, z = (iz + .5) * step;
    const distance = Math.max(Math.abs(x), Math.abs(z)) / extent - 1;
    const ramp = Math.min(1, distance / .55);
    const hills = (Math.sin(x / extent * 5) * Math.cos(z / extent * 4) + 1) / 2;
    // Eastern waterfront: broad shallow shelves before the deep basin.
    const shore = x > extent && Math.abs(z) < extent * .8;
    const top = shore ? -Math.round(ramp * ramp * 12 * 2) / 2 : Math.round((ramp * ramp * (40 + 150 * hills)) / 2) * 2;
    const color = shore ? 0xb5ad88 : top > 90 ? 0x89877d : top > 45 ? 0x858b68 : 0x7c965b;
    const slab = box(x, (top - 24) / 2, z, step, top + 24, step, color, 'slab');
    slabs.push(slab); heights.set(`${ix},${iz}`, top);
  }
  // Fixed clusters, no per-frame generation and no features on playable lots.
  for (let i = 0; i < 42; i++) {
    const cluster = Math.floor(i / 7), angle = 1.6 + cluster * .72;
    const x = Math.cos(angle) * extent * (1.23 + hash(i * 7) * .15) + (hash(i * 13) - .5) * step;
    const z = Math.sin(angle) * extent * (1.23 + hash(i * 17) * .15) + (hash(i * 19) - .5) * step;
    const y = heights.get(`${Math.floor(x / step)},${Math.floor(z / step)}`);
    if (y === undefined || y < 0) continue;
    const h = 10 + hash(i * 23) * 8, w = 9 + hash(i * 29) * 5;
    features.push(box(x, y + h / 2, z, 2.5, h, 2.5, 0x776044, 'trunk'));
    features.push(box(x, y + h + h * .4, z, w, h * .8, w, i % 2 ? 0x51643e : 0x617548, 'canopy'));
  }
  for (let i = 0; i < 36; i++) {
    const candidates = slabs.filter(b => b.y * 2 + 24 > 40), base = candidates[Math.floor(hash(i * 31) * candidates.length)];
    if (!base) continue;
    const w = 6 + hash(i * 37) * 12, h = 5 + hash(i * 41) * 12;
    features.push(box(base.x + (hash(i * 43) - .5) * step * .6, base.y * 2 + 24 + h / 2, base.z + (hash(i * 47) - .5) * step * .6, w, h, w * .8, i % 2 ? 0x8a867b : 0x74776e, 'boulder'));
  }
  const boxes = [...slabs, ...features], positions = [], colors = [];
  const cube = new THREE.BoxGeometry(1, 1, 1), p = cube.attributes.position, index = cube.index;
  const color = new THREE.Color();
  for (const b of boxes) {
    color.setHex(b.color);
    for (const group of cube.groups) {
      if (group.materialIndex === 3 && b.kind === 'slab') continue; // Only buried slab undersides are omitted; canopy/rock boxes stay closed.
      for (let j = group.start; j < group.start + group.count; j++) {
        const k = index.getX(j);
        positions.push(b.x + p.getX(k) * b.w, b.y + p.getY(k) * b.h, b.z + p.getZ(k) * b.d);
        colors.push(color.r, color.g, color.b);
      }
    }
  }
  cube.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; scene.add(mesh);
  function floorHeight(x, z, radius = 0) {
    let top = 0; // Water surface and the city's level foundation are conservative floors.
    const x0 = Math.max(-16, Math.floor((x - radius) / step)), x1 = Math.min(15, Math.floor((x + radius) / step));
    const z0 = Math.max(-16, Math.floor((z - radius) / step)), z1 = Math.min(15, Math.floor((z + radius) / step));
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) top = Math.max(top, heights.get(`${ix},${iz}`) ?? 0);
    // ponytail: 120 fixed natural boxes; spatial buckets only if the feature budget grows.
    for (const b of features) if (Math.abs(x - b.x) <= b.w / 2 + radius && Math.abs(z - b.z) <= b.d / 2 + radius) top = Math.max(top, b.y + b.h / 2);
    return top;
  }
  return { mesh, boxes, features, floorHeight, edge,
    diagnostics: { slabs: slabs.length, featureBoxes: features.length, triangles: positions.length / 9, draws: 1 },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); }
  };
}
