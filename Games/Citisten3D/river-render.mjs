import * as THREE from './vendor/three.module.js';

// Seven strips per four-lot row: flat city, banks, sloped bed, bank, flat city.
// All heights and bends come from the authoritative data, not another river formula.
export function createRiverGroundGeometry(data, lotSize) {
  if (!Number.isFinite(lotSize) || lotSize <= 0) throw new RangeError('Invalid lot size');
  const positions = [], uv = [], indices = [];
  const { size, rows, halfWidth: w, bankWidth: b } = data;
  for (const z of rows) {
    const c = data.centerAt(z);
    for (const x of [-.5, c - w - b, c - w, c - w + .35, c + w - .35, c + w, c + w + b, size - .5]) {
      positions.push((x + .5 - size / 2) * lotSize, data.heightAt(x, z), (z + .5 - size / 2) * lotSize);
      uv.push((x + .5) / size, 1 - (z + .5) / size);
    }
  }
  for (let row = 0; row < rows.length - 1; row++) for (let col = 0; col < 7; col++) {
    const a = row * 8 + col, b = a + 8;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('uv1', geometry.attributes.uv.clone());
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

// The supplied adapter classifies only perimeter depressions. Rebucket its
// unchanged materials for the actual interior river, retaining analytic AO.
export function groupRiverMaterials(geometry, diagnostics) {
  const p = geometry.attributes.position, index = geometry.index, buckets = [[], [], []];
  for (let i = 0; i < index.count; i += 3) {
    const vertices = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const low = Math.min(...vertices.map(v => p.getY(v)));
    buckets[low < -.401 ? 2 : low < -.001 ? 1 : 0].push(...vertices);
  }
  geometry.clearGroups();
  let cursor = 0;
  buckets.forEach((bucket, slot) => {
    if (bucket.length) { index.array.set(bucket, cursor); geometry.addGroup(cursor, bucket.length, slot); cursor += bucket.length; }
  });
  index.needsUpdate = true;
  if (diagnostics) {
    diagnostics.groundTriangles = Object.fromEntries(['grass', 'soil', 'shoreline'].map((name, i) => [name, buckets[i].length / 3]));
    diagnostics.groundGroups = geometry.groups.length;
    diagnostics.unused = Object.keys(diagnostics.groundTriangles).filter(name => !diagnostics.groundTriangles[name]);
    diagnostics.notes.push('River layout overrides perimeter buckets: grass terraces, soil banks, shoreline bed; supplied channels unchanged.');
  }
}

export function createBridgePool(scene, grid, terrain) {
  // Cache candidates once per layout; road edits only scan the narrow corridor.
  const candidates = [];
  if (terrain.layout !== 'legacy-flat') for (let z = 0; z < grid.size; z++) for (let x = 0; x < grid.size; x++) {
    if (terrain.isWater(x, z) || terrain.isBank(x, z)) candidates.push({ x, z });
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x777b80, roughness: .85 });
  const mesh = new THREE.InstancedMesh(geometry, material, candidates.length * 5);
  mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), position = new THREE.Vector3(), rotation = new THREE.Quaternion();
  let version = -1;
  return {
    mesh, candidateCount: candidates.length,
    sync(force = false) {
      if (!force && version === grid.version) return false;
      let count = 0;
      function box(x, y, z, w, h, d) {
        matrix.compose(position.set(x, y, z), rotation, scale.set(w, h, d)); mesh.setMatrixAt(count++, matrix);
      }
      const s = grid.lotSize;
      for (const { x, z } of candidates) {
        if (!grid.has(x, z)) continue;
        const p = grid.center(x, z);
        box(p.x, -.39, p.z, s, .8, s); // Top .01, below existing .035 asphalt; vehicles stay at y=.08.
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (grid.has(x + dx, z + dz)) continue;
          box(p.x + dx * (s / 2 - .15), .5, p.z + dz * (s / 2 - .15), dx ? .2 : s, 1, dz ? .2 : s);
        }
      }
      mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true; version = grid.version;
      return true;
    },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); mesh.dispose(); },
  };
}
