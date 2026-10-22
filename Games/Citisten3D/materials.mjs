import * as THREE from './vendor/three.module.js';

// Original deterministic pixels, generated locally. No canvas, image fetch or asset cache.
const noise = (x, y) => { let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return (n >>> 0) / 4294967295; };
function texture(size, pixel, color = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = pixel(x, y);
    data.set([value[0], value[1], value[2], 255], (y * size + x) * 4);
  }
  const map = new THREE.DataTexture(data, size, size);
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true; map.anisotropy = 4; map.needsUpdate = true;
  return map;
}

export function createFacadeMaterial() {
  // Four 512px tiles: brick facade, glazed pane, roof, neutral painted surface.
  const mask = (x, y) => {
    const tile = Math.floor(x / 512) + Math.floor(y / 512) * 2, u = x % 512, v = y % 512;
    const window = tile === 1 && u > 22 && u < 490 && v > 24 && v < 488 && Math.abs(u - 256) > 4;
    return { tile, u, v, window };
  };
  const map = texture(1024, (x, y) => {
    const { tile, u, v, window } = mask(x, y), grain = noise(x, y);
    if (window) { const glass = 48 + grain * 10 + 18 * Math.sin(v * .012); return [glass * .78, glass, glass * 1.13]; }
    if (tile === 0) {
      const mortar = v % 16 < 2 || (u + (Math.floor(v / 16) % 2) * 16) % 32 < 2;
      const brick = mortar ? 152 : 205 + grain * 25 - noise(Math.floor(u / 32), Math.floor(v / 16)) * 24;
      return [brick, brick * .97, brick * .92];
    }
    if (tile === 1) return [135 + grain * 16, 139 + grain * 16, 142 + grain * 16];
    const value = (tile === 2 ? 169 : 222) + grain * 25 - (tile === 2 && v % 32 < 2 ? 22 : 0);
    return [value, value, value];
  }, true);
  const emissiveMap = texture(1024, (x, y) => {
    const { window } = mask(x, y);
    const brightness = window ? 125 + noise(x, y) * 40 : 0;
    return [brightness, brightness * .74, brightness * .39];
  }, true);
  const roughnessMap = texture(1024, (x, y) => {
    const value = mask(x, y).window ? 72 : 190 + noise(x, y) * 42;
    return [value, value, value];
  });
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .018,
    roughnessMap, roughness: 1, metalness: .04, emissiveMap, emissive: 0xfff1dc, emissiveIntensity: .04 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float lightLevel; varying float vInteriorLight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvInteriorLight = lightLevel;');
    shader.fragmentShader = 'varying float vInteriorLight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vInteriorLight;');
  };
  material.customProgramCacheKey = () => 'citisten-interior-mask-v1';
  return { material, dispose() { map.dispose(); emissiveMap.dispose(); roughnessMap.dispose(); material.dispose(); } };
}

export function createGroundMaterial(extent) {
  const clumps = (x, y) => {
    const ix = Math.floor(x / 64), iy = Math.floor(y / 64);
    const sx = THREE.MathUtils.smoothstep(x % 64, 0, 64), sy = THREE.MathUtils.smoothstep(y % 64, 0, 64);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(noise(ix % 8, iy % 8), noise((ix + 1) % 8, iy % 8), sx),
      THREE.MathUtils.lerp(noise(ix % 8, (iy + 1) % 8), noise((ix + 1) % 8, (iy + 1) % 8), sx), sy) * 2 - 1;
  };
  const map = texture(512, (x, y) => {
    const grain = noise(x, y), clump = clumps(x, y);
    return [86 + grain * 25 + clump * 7, 104 + grain * 30 + clump * 9, 53 + grain * 19];
  }, true);
  const bumpMap = texture(512, (x, y) => { const g = 90 + noise(x, y) * 110; return [g, g, g]; });
  for (const t of [map, bumpMap]) t.repeat.setScalar(extent * 2 / 12);
  const material = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: .045, roughness: .98,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 });
  return { material, dispose() { map.dispose(); bumpMap.dispose(); material.dispose(); } };
}

export function createAsphaltMaterial() {
  const map = texture(512, (x, y) => {
    const n = noise(x, y), aggregate = n > .975 ? 25 : n * 17;
    const crack = Math.abs((x + Math.sin(y * .04) * 14) % 173) < 1.2 ? -12 : 0;
    return [49 + aggregate + crack, 51 + aggregate + crack, 53 + aggregate + crack];
  }, true);
  const material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .025, roughness: .94,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  return { material, dispose() { map.dispose(); material.dispose(); } };
}

export function createWater(scene, extent) {
  const normalMap = texture(512, (x, y) => {
    const a = x * Math.PI * 2 / 512, b = y * Math.PI * 2 / 512;
    const nx = .28 * Math.cos(a * 7 + b * 4) + .13 * Math.cos(a * 13 - b * 9);
    const ny = .19 * Math.cos(b * 9 - a * 3) + .1 * Math.sin(a * 5 + b * 11);
    const n = new THREE.Vector3(nx, ny, 1).normalize();
    return [(n.x * .5 + .5) * 255, (n.y * .5 + .5) * 255, (n.z * .5 + .5) * 255];
  });
  normalMap.repeat.setScalar(extent / 10);
  const geometry = new THREE.PlaneGeometry(extent * 6, extent * 6);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshPhysicalMaterial({ color: 0x31516b, roughness: .2, metalness: .12,
    normalMap, normalScale: new THREE.Vector2(.55, .55), clearcoat: .8, clearcoatRoughness: .17,
    clearcoatNormalMap: normalMap, clearcoatNormalScale: new THREE.Vector2(.35, .35) });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = -.4; mesh.receiveShadow = true;
  scene.add(mesh);
  return { mesh, update(dt) { normalMap.offset.x = (normalMap.offset.x + dt * .012) % 1; normalMap.offset.y = (normalMap.offset.y + dt * .007) % 1; },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); normalMap.dispose(); } };
}

// Analytic contact/density bake from actual static model poses, not screen-space AO or a GI claim.
export function createBlockAO(ground, buildings, extent, lotSize) {
  const size = 256, data = new Uint8Array(size * size * 4);
  const map = new THREE.DataTexture(data, size, size);
  map.channel = 1; map.magFilter = map.minFilter = THREE.LinearFilter;
  ground.geometry.setAttribute('uv1', ground.geometry.attributes.uv.clone());
  ground.material.aoMap = map; ground.material.aoMapIntensity = .8;
  let version = -1;
  return { map, update() {
    if (version === buildings.version) return;
    data.fill(255);
    const density = new Map(), poses = [];
    for (const [type, pool] of buildings.pools) if (!['car', 'citizen', 'zombie', 'wall'].includes(type)) {
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
