import * as THREE from './vendor/three.module.js';

const names = ['grass', 'soil', 'shoreline', 'asphalt', 'water'];

// GLTFLoader has already decoded glTF factors, packed G roughness/B metalness,
// normal scale and texture texCoord. Never reinterpret the packed image as AO.
export function applyExternalTerrain({ ground, road, water, extent, lotSize }, gltf) {
  if (![ground, road, water].every(mesh => mesh?.isMesh) ||
      !Number.isFinite(extent) || extent <= 0 || !Number.isFinite(lotSize) || lotSize <= 0) {
    throw new TypeError('External terrain requires three meshes and positive extent/lotSize');
  }
  const sources = new Map();
  gltf.scene.traverse(node => {
    for (const material of [].concat(node.material || [])) sources.set(material.name, material);
  });
  for (const name of names) {
    if (!sources.get(`terrain_water_materials__${name}`)?.isMeshStandardMaterial) {
      throw new Error(`Missing Standard terrain material: ${name}`);
    }
  }
  const geometry = ground.geometry, positions = geometry.getAttribute('position');
  if (!positions || !geometry.getAttribute('uv') || !geometry.getAttribute('uv1')) {
    throw new Error('Ground requires position, uv and analytic AO uv1');
  }
  const original = { ground: ground.material, road: road.material, water: water.material,
    groups: geometry.groups.map(group => ({ ...group })), roadShadow: road.receiveShadow,
    indices: geometry.index?.array.slice() };
  const analytic = [].concat(original.ground).find(material => material.aoMap);
  const ownedMaterials = [], ownedTextures = new Set();
  const diagnostics = { groundTriangles: { grass: 0, soil: 0, shoreline: 0 },
    importedAO: [], analyticAO: [], unused: [], groundGroups: 0, notes: [] };

  function cloneMaterial(name, repeat) {
    const source = sources.get(`terrain_water_materials__${name}`);
    let material = source.clone();
    // Keep the existing water clearcoat, but take the Standard surface factors
    // from the delivery, not the old procedural water's tint/roughness.
    if (name === 'water' && original.water.isMeshPhysicalMaterial && !source.isMeshPhysicalMaterial) {
      material.dispose();
      material = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material, source);
      for (const key of ['clearcoat', 'clearcoatRoughness']) material[key] = original.water[key];
      material.clearcoatNormalScale.copy(original.water.clearcoatNormalScale);
    }
    const textures = new Map();
    for (const key of Object.keys(material)) {
      const sourceMap = material[key];
      if (!sourceMap?.isTexture) continue;
      // Share immutable image/source bytes, not mutable sampler/UV state.
      const colorSpace = ['map', 'emissiveMap'].includes(key) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      const cacheKey = `${sourceMap.uuid}:${colorSpace}`;
      if (!textures.has(cacheKey)) {
        const map = sourceMap.clone();
        map.colorSpace = colorSpace;
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.multiplyScalar(repeat);
        map.needsUpdate = true;
        textures.set(cacheKey, map); ownedTextures.add(map);
      }
      material[key] = textures.get(cacheKey);
    }
    if (source.aoMap) diagnostics.importedAO.push(name);
    if (['grass', 'soil', 'shoreline'].includes(name)) {
      if (!source.aoMap && analytic) {
        material.aoMap = analytic.aoMap;
        material.aoMapIntensity = analytic.aoMapIntensity;
        diagnostics.analyticAO.push(name);
      }
      material.polygonOffset = true; material.polygonOffsetFactor = 1; material.polygonOffsetUnits = 4;
    }
    if (name === 'water' && material.isMeshPhysicalMaterial && !material.clearcoatNormalMap) {
      material.clearcoatNormalMap = material.normalMap;
    }
    ownedMaterials.push(material);
    return material;
  }
  const groundMaterials = names.slice(0, 3).map(name => cloneMaterial(name, extent * 2 / 12));
  const asphalt = cloneMaterial('asphalt', lotSize / 10);
  asphalt.polygonOffset = true; asphalt.polygonOffsetFactor = -1; asphalt.polygonOffsetUnits = -2;
  const waterMaterial = cloneMaterial('water', extent / 10);

  // Bucket indexed triangles into three draws without moving any vertex or
  // changing winding/topology. World pickLot intersects its own flat plane;
  // triangle ordinal is not a gameplay identifier. Restore indices on disposal.
  // Existing coarse tessellation bounds the precision of this four-lot fringe.
  geometry.clearGroups();
  const index = geometry.index, count = index ? index.count : positions.count;
  const band = Math.min(extent, lotSize * 4), buckets = [[], [], []];
  for (let start = 0; start < count; start += 3) {
    let x = 0, z = 0, depressed = false;
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index ? index.getX(start + corner) : start + corner;
      x += positions.getX(vertex); z += positions.getZ(vertex);
      depressed ||= positions.getY(vertex) < -.001;
    }
    const distance = extent - Math.max(Math.abs(x / 3), Math.abs(z / 3));
    const slot = depressed && distance < band ? (distance < band / 2 ? 2 : 1) : 0;
    diagnostics.groundTriangles[names[slot]]++;
    if (index) {
      buckets[slot].push(index.getX(start), index.getX(start + 1), index.getX(start + 2));
    } else {
      const previous = geometry.groups.at(-1);
      if (previous?.materialIndex === slot) previous.count += 3;
      else geometry.addGroup(start, 3, slot);
    }
  }
  if (index) {
    let start = 0;
    buckets.forEach((vertices, slot) => {
      if (vertices.length) {
        index.array.set(vertices, start);
        geometry.addGroup(start, vertices.length, slot);
        start += vertices.length;
      }
    });
    index.needsUpdate = true;
  }
  ground.material = groundMaterials; road.material = asphalt; water.material = waterMaterial;
  road.receiveShadow = true;
  diagnostics.groundGroups = geometry.groups.length;
  diagnostics.unused = names.slice(0, 3).filter(name => !diagnostics.groundTriangles[name]);
  if (!diagnostics.importedAO.length) diagnostics.notes.push('Delivery has no occlusionTexture; no imported AO map invented.');
  if (!analytic) diagnostics.notes.push('No existing analytic ground AO was supplied.');
  diagnostics.notes.push('Perimeter follows triangle centroids; positions, winding and water height unchanged. Indexed triangle order is grouped, not a stable face ID.');
  if (!index) diagnostics.notes.push('Nonindexed fallback retains contiguous groups; inspect groundGroups for draw cost.');
  const flowing = new Set([waterMaterial.normalMap, waterMaterial.clearcoatNormalMap].filter(Boolean));
  let disposed = false;
  return {
    diagnostics,
    update(dt) {
      if (disposed || !Number.isFinite(dt) || dt <= 0) return;
      for (const map of flowing) {
        map.offset.x = THREE.MathUtils.euclideanModulo(map.offset.x + dt * .012, 1);
        map.offset.y = THREE.MathUtils.euclideanModulo(map.offset.y + dt * .007, 1);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ground.material = original.ground; road.material = original.road; water.material = original.water;
      road.receiveShadow = original.roadShadow;
      if (original.indices) {
        index.array.set(original.indices); index.needsUpdate = true;
      }
      geometry.clearGroups();
      for (const group of original.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
      for (const material of ownedMaterials) material.dispose();
      for (const map of ownedTextures) map.dispose();
    },
  };
}
