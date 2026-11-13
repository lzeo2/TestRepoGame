import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Metres, with east = +x and south = +z. All art is generated locally.
const CHUNK_SIZE = 350;
const VISIBILITY = 650;
const CELL_SIZE = 80;
const COLORS = {
  grass: 0x849565, park: 0x78905e, asphalt: 0x555654, path: 0xc3bcb0,
  kerb: 0xd5d0c2, paint: 0xe6e4d5, brick: 0x9c7560, cream: 0xd6c9ae,
  roof: 0x8e5643, metal: 0x737975, trunk: 0x796b57, green: 0x537158,
};

export function createWorldView(scene, map) {
  const root = new THREE.Group();
  root.name = 'Canberra streets';
  scene.add(root);
  const bounds = map.bounds;
  const terrain = map.terrain;
  const chunks = new Map();
  const temporaryGeometry = [];
  const textures = [];
  const materials = [];
  const counters = { buildings: 0, trees: 0, treesNearSpawn: 0, windows: 0, roofFacets: 0, texturedBuildings: 0, signs: 0, roadSegments: 0, triangles: 0, chunks: 0, meshes: 0 };
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const opaque = new THREE.MeshLambertMaterial({ vertexColors: true });
  materials.push(opaque);
  let roadMaterial = opaque;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(64, 64);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const tone = 237 + Math.floor(hash(i) * 18);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = tone;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    roadMaterial = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true });
    materials.push(roadMaterial);
  }

  let surfaceMaterial = opaque;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const kind = (x >= 256 ? 1 : 0) + (y < 256 ? 2 : 0);
      const px = x % 256, py = y % 256, noise = hash(x + y * 513);
      let tone = 238 + noise * 15;
      if (kind === 0) {
        const row = Math.floor(py / 16), joint = py % 16 < 2 || (px + row % 2 * 32) % 64 < 2;
        tone = joint ? 194 : 220 + hash(Math.floor((px + row % 2 * 32) / 64) + row * 19) * 26 + noise * 8;
      } else if (kind === 2) {
        const tile = (px + Math.floor(py / 32) % 2 * 16) % 32;
        tone = py % 32 < 3 ? 165 : 205 + Math.cos(tile / 32 * Math.PI * 2) * 15 + noise * 13;
      } else if (kind === 3) tone = 224 + noise * 29 - (px % 7 === 0 && py % 11 < 4 ? 16 : 0);
      const i = (y * 512 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = tone; pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    textures.push(texture);
    surfaceMaterial = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true });
    surfaceMaterial.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float surfaceKind; varying float vSurfaceKind;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfaceKind = surfaceKind;');
      shader.fragmentShader = 'varying float vSurfaceKind;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        float surfaceIndex = floor(vSurfaceKind + 0.5);
        vec2 atlasOffset = vec2(mod(surfaceIndex, 2.0), floor(surfaceIndex / 2.0)) * 0.5;
        vec2 atlasUv = fract(vMapUv) * 0.48 + atlasOffset + 0.01;
        diffuseColor *= texture2D(map, atlasUv);
      `);
    };
    surfaceMaterial.customProgramCacheKey = () => 'capital-surface-atlas-v1';
    materials.push(surfaceMaterial);
  }
  const shadowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  materials.push(shadowMaterial);

  function heightAt(x, z) {
    if (!terrain || terrain.cols < 2 || terrain.rows < 2 || !terrain.heights?.length) return 0;
    const tx = THREE.MathUtils.clamp((x - terrain.minX) / (terrain.maxX - terrain.minX), 0, 1) * (terrain.cols - 1);
    const tz = THREE.MathUtils.clamp((z - terrain.minZ) / (terrain.maxZ - terrain.minZ), 0, 1) * (terrain.rows - 1);
    const ix = Math.min(terrain.cols - 2, Math.floor(tx));
    const iz = Math.min(terrain.rows - 2, Math.floor(tz));
    const fx = tx - ix, fz = tz - iz;
    const at = (a, b) => Number(terrain.heights[b * terrain.cols + a]) || 0;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix, iz), at(ix + 1, iz), fx),
      THREE.MathUtils.lerp(at(ix, iz + 1), at(ix + 1, iz + 1), fx), fz);
  }

  function chunkAt(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
    const key = `${cx},${cz}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      group.name = `District ${key}`;
      root.add(group);
      chunks.set(key, { group, x: (cx + 0.5) * CHUNK_SIZE, z: (cz + 0.5) * CHUNK_SIZE, batches: new Map() });
    }
    return chunks.get(key);
  }

  function batchAt(x, z, kind = 'solid') {
    const chunk = chunkAt(x, z);
    if (!chunk.batches.has(kind)) chunk.batches.set(kind, { positions: [], normals: [], colors: [], uvs: [], kinds: [] });
    return chunk.batches.get(kind);
  }

  function triangle(batch, a, b, c, tint, uv) {
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    normal.crossVectors(ab, ac).normalize();
    color.set(tint);
    for (const p of [a, b, c]) {
      batch.positions.push(...p);
      batch.normals.push(normal.x, normal.y, normal.z);
      batch.colors.push(color.r, color.g, color.b);
    }
    if (uv) batch.uvs.push(...uv);
    counters.triangles++;
  }

  function quad(batch, a, b, c, d, tint, uv) {
    triangle(batch, a, b, c, tint, uv ? [...uv[0], ...uv[1], ...uv[2]] : null);
    triangle(batch, a, c, d, tint, uv ? [...uv[0], ...uv[2], ...uv[3]] : null);
  }

  function surfaceTriangle(x, z, a, b, c, tint, kind, uv) {
    const batch = batchAt(x, z, 'surface');
    triangle(batch, a, b, c, tint, uv || [a[0] / 3, a[2] / 3, b[0] / 3, b[2] / 3, c[0] / 3, c[2] / 3]);
    batch.kinds.push(kind, kind, kind);
  }
  function softShadow(x, z, rx, rz, strength = 0.12) {
    const batch = batchAt(x, z, 'shadow');
    for (let i = 0; i < 10; i++) {
      const points = [[x, z], [x + Math.cos(i / 10 * Math.PI * 2) * rx, z + Math.sin(i / 10 * Math.PI * 2) * rz],
        [x + Math.cos((i + 1) / 10 * Math.PI * 2) * rx, z + Math.sin((i + 1) / 10 * Math.PI * 2) * rz]];
      for (let j = 2; j >= 0; j--) {
        const p = points[j]; batch.positions.push(p[0], heightAt(...p) + 0.028, p[1]); batch.normals.push(0, 1, 0);
        batch.colors.push(0.12, 0.14, 0.1, j === 0 ? strength : 0);
      }
      counters.triangles++;
    }
  }

  function primitive(geometry, x, y, z, sx, sy, sz, tint, yaw = 0) {
    const batch = batchAt(x, z);
    position.set(x, y, z);
    scale.set(sx, sy, sz);
    quaternion.setFromAxisAngle(up, yaw);
    matrix.compose(position, quaternion, scale);
    normalMatrix.getNormalMatrix(matrix);
    const p = geometry.attributes.position;
    const n = geometry.attributes.normal;
    color.set(tint);
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(vertex.x, vertex.y, vertex.z);
      batch.normals.push(normal.x, normal.y, normal.z);
      batch.colors.push(color.r, color.g, color.b);
    }
    counters.triangles += p.count / 3;
  }

  function geometry(source) {
    const result = source.index ? source.toNonIndexed() : source;
    if (source !== result) source.dispose();
    temporaryGeometry.push(result);
    return result;
  }
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const trunk = geometry(new THREE.CylinderGeometry(0.65, 1, 1, 5));
  const crown = geometry(new THREE.IcosahedronGeometry(1, 0));
  const leafCrown = geometry(new THREE.IcosahedronGeometry(1, 1));

  function hash(n) {
    const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return a - Math.floor(a);
  }

  function groundPolygon(points, tint, lift = 0.018) {
    if (!points || points.length < 3) return;
    const level = Math.min(...points.map(p => heightAt(...p))) + lift;
    const shape = points.map(p => new THREE.Vector2(p[0], p[1]));
    const faces = THREE.ShapeUtils.triangulateShape(shape, []);
    const batch = batchAt(points[0][0], points[0][1]);
    for (const face of faces) {
      const p = face.map(i => [points[i][0], level, points[i][1]]);
      if ((p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) > 0) p.reverse();
      triangle(batch, ...p, tint);
    }
  }

  // Match bilinear terrain cells. Adaptive subdivision bounds the difference
  // between the rendered triangles and heightAt to under eight centimetres.
  function terrainTile(x, z, dx, dz) {
    const shade = new THREE.Color(COLORS.grass).multiplyScalar(0.98 + hash(x + z * 0.3) * 0.04);
    const point = (px, pz) => [px, heightAt(px, pz) - 0.18, pz];
    const a = point(x, z), b = point(x, z + dz), c = point(x + dx, z + dz), d = point(x + dx, z);
    surfaceTriangle(x, z, a, b, c, shade, 3); surfaceTriangle(x, z, a, c, d, shade, 3);
  }
  if (terrain?.cols > 1 && terrain?.rows > 1) {
    const dx = (terrain.maxX - terrain.minX) / (terrain.cols - 1);
    const dz = (terrain.maxZ - terrain.minZ) / (terrain.rows - 1);
    for (let iz = 0; iz < terrain.rows - 1; iz++) for (let ix = 0; ix < terrain.cols - 1; ix++) {
      const x = terrain.minX + ix * dx, z = terrain.minZ + iz * dz;
      const mixed = Math.abs(heightAt(x, z) + heightAt(x + dx, z + dz) - heightAt(x + dx, z) - heightAt(x, z + dz));
      const divisions = Math.max(Math.max(dx, dz) > 28 ? 2 : 1, Math.ceil(Math.sqrt(mixed / 0.28)));
      for (let j = 0; j < divisions; j++) for (let i = 0; i < divisions; i++) terrainTile(x + i * dx / divisions, z + j * dz / divisions, dx / divisions, dz / divisions);
    }
  } else {
    for (let z = bounds.minZ; z < bounds.maxZ; z += 35) for (let x = bounds.minX; x < bounds.maxX; x += 35) terrainTile(x, z, 35, 35);
  }
  for (let z = bounds.minZ - 245; z < bounds.maxZ + 245; z += 35) for (let x = bounds.minX - 245; x < bounds.maxX + 245; x += 35) {
    if (x < bounds.minX || z < bounds.minZ || x >= bounds.maxX || z >= bounds.maxZ) terrainTile(x, z, 35, 35);
  }
  // Grass polygons cannot be draped with boundary-only triangles on a hill.
  // Terrain already supplies grass; reserve overlays for the water itself.
  for (const area of map.areas || []) if (/water|lake|basin/.test(area.type)) groundPolygon(area.points, 0x658b8f, -0.12);

  // Spatial indices keep avenue placement linear in the size of the map.
  const roadCells = new Map(), buildingCells = new Map();
  const roadSegments = [];
  function indexBounds(index, item, minX, minZ, maxX, maxZ) {
    for (let x = Math.floor(minX / CELL_SIZE); x <= Math.floor(maxX / CELL_SIZE); x++) {
      for (let z = Math.floor(minZ / CELL_SIZE); z <= Math.floor(maxZ / CELL_SIZE); z++) {
        const key = `${x},${z}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(item);
      }
    }
  }
  const nearby = (index, x, z) => index.get(`${Math.floor(x / CELL_SIZE)},${Math.floor(z / CELL_SIZE)}`) || [];
  function segmentDistance(x, z, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function inside(x, z, points) {
    let contained = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if (((a[1] > z) !== (b[1] > z)) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) contained = !contained;
    }
    return contained;
  }
  for (const building of map.buildings || []) {
    const points = building.points;
    if (!points?.length) continue;
    indexBounds(buildingCells, building, Math.min(...points.map(p => p[0])) - 3, Math.min(...points.map(p => p[1])) - 3,
      Math.max(...points.map(p => p[0])) + 3, Math.max(...points.map(p => p[1])) + 3);
  }

  const nodes = new Map();
  for (const road of map.roads || []) {
    const width = Math.max(3.2, Number(road.width) || 7);
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.2) continue;
      const segment = { a, b, road, width, length };
      roadSegments.push(segment);
      indexBounds(roadCells, segment, Math.min(a[0], b[0]) - width - 5, Math.min(a[1], b[1]) - width - 5,
        Math.max(a[0], b[0]) + width + 5, Math.max(a[1], b[1]) + width + 5);
    }
    for (const p of road.points) {
      const key = `${Math.round(p[0] / 3)},${Math.round(p[1] / 3)}`;
      if (!nodes.has(key)) nodes.set(key, { x: p[0], z: p[1], roads: new Map(), width });
      nodes.get(key).roads.set(road.name || road.id, road);
      nodes.get(key).width = Math.max(nodes.get(key).width, width);
    }
  }

  // Subdivide only where a road triangle would cut through a bilinear hill.
  function drapedTriangle(batch, a, b, c, tint, lift, depth = 0) {
    const middle = (p, q) => {
      const x = (p[0] + q[0]) / 2, z = (p[2] + q[2]) / 2;
      return [x, heightAt(x, z) + lift, z];
    };
    const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
    const x = (a[0] + b[0] + c[0]) / 3, z = (a[2] + b[2] + c[2]) / 3;
    const error = Math.max(Math.abs(ab[1] - (a[1] + b[1]) / 2), Math.abs(bc[1] - (b[1] + c[1]) / 2),
      Math.abs(ca[1] - (c[1] + a[1]) / 2), Math.abs(heightAt(x, z) + lift - (a[1] + b[1] + c[1]) / 3));
    if (depth < 4 && error > 0.045) {
      drapedTriangle(batch, a, ab, ca, tint, lift, depth + 1);
      drapedTriangle(batch, ab, b, bc, tint, lift, depth + 1);
      drapedTriangle(batch, ca, bc, c, tint, lift, depth + 1);
      drapedTriangle(batch, ab, bc, ca, tint, lift, depth + 1);
    } else triangle(batch, a, b, c, tint);
  }

  function ribbon(a, b, left, right, tint, lift) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.1) return;
    const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
    const pieces = Math.max(1, Math.ceil(length / 12));
    for (let i = 0; i < pieces; i++) {
      const t0 = i / pieces, t1 = (i + 1) / pieces;
      const x0 = THREE.MathUtils.lerp(a[0], b[0], t0), z0 = THREE.MathUtils.lerp(a[1], b[1], t0);
      const x1 = THREE.MathUtils.lerp(a[0], b[0], t1), z1 = THREE.MathUtils.lerp(a[1], b[1], t1);
      const p = (x, z, d) => [x + nx * d, heightAt(x + nx * d, z + nz * d) + lift, z + nz * d];
      const batch = batchAt(x0, z0, tint === COLORS.asphalt ? 'road' : 'pavement');
      const pa = p(x0, z0, right), pb = p(x1, z1, right), pc = p(x1, z1, left), pd = p(x0, z0, left);
      drapedTriangle(batch, pa, pb, pc, tint, lift);
      drapedTriangle(batch, pa, pc, pd, tint, lift);
    }
  }
  for (const s of roadSegments) {
    const half = s.width / 2;
    // Side strips avoid hidden duplicate pavement under the entire carriageway.
    const residentialPath = s.road.type === 'residential';
    const pathWidth = residentialPath ? 1.45 : 2;
    ribbon(s.a, s.b, -half - pathWidth, -half - 0.18, residentialPath ? 0xb7b59c : COLORS.path, 0.045);
    ribbon(s.a, s.b, half + 0.18, half + pathWidth, COLORS.path, 0.045);
    ribbon(s.a, s.b, -half - 0.18, -half, COLORS.kerb, 0.065);
    ribbon(s.a, s.b, half, half + 0.18, COLORS.kerb, 0.065);
    ribbon(s.a, s.b, -half, half, COLORS.asphalt, 0.083);
    const marked = s.width >= 7 && !/service|living_street|footway|path|track/.test(s.road.type);
    const schoolAnchor = (map.landmarks || []).find(l => l.id === 'telopea');
    const schoolApproach = schoolAnchor && /New South Wales Crescent/i.test(s.road.name || '') && Math.hypot((s.a[0] + s.b[0]) / 2 - schoolAnchor.x, (s.a[1] + s.b[1]) / 2 - schoolAnchor.z) < 350;
    if (marked && schoolApproach) {
      ribbon(s.a, s.b, -0.2, -0.09, COLORS.paint, 0.105);
      ribbon(s.a, s.b, 0.09, 0.2, COLORS.paint, 0.105);
    } else if (marked) {
      const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
      for (let d = 8; d < s.length - 6; d += 12) {
        ribbon([s.a[0] + dx * d, s.a[1] + dz * d], [s.a[0] + dx * Math.min(d + 3, s.length - 6), s.a[1] + dz * Math.min(d + 3, s.length - 6)], -0.065, 0.065, COLORS.paint, 0.105);
      }
    }
    counters.roadSegments++;
  }

  // A small apron joins consecutive road segments at every bend, including
  // nodes on a single named way, rather than only named intersections.
  for (const node of nodes.values()) {
    const radius = node.width / 2;
    const batch = batchAt(node.x, node.z, 'road');
    for (let i = 0; i < 10; i++) {
      const p = a => [node.x + Math.cos(a) * radius, heightAt(node.x + Math.cos(a) * radius, node.z + Math.sin(a) * radius) + 0.09, node.z + Math.sin(a) * radius];
      drapedTriangle(batch, [node.x, heightAt(node.x, node.z) + 0.09, node.z], p((i + 1) / 10 * Math.PI * 2), p(i / 10 * Math.PI * 2), COLORS.asphalt, 0.09);
    }
  }
  const intersections = [...nodes.values()].filter(n => n.roads.size > 1);
  // Asphalt aprons cover the crossing footpaths where named streets meet.
  for (const node of intersections) {
    const radius = node.width / 2 + 2.1;
    const batch = batchAt(node.x, node.z, 'road');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2;
      const p = angle => [node.x + Math.cos(angle) * radius, heightAt(node.x + Math.cos(angle) * radius, node.z + Math.sin(angle) * radius) + 0.115, node.z + Math.sin(angle) * radius];
      drapedTriangle(batch, [node.x, heightAt(node.x, node.z) + 0.115, node.z], p(b), p(a), COLORS.asphalt, 0.115);
    }
  }

  for (const anchor of (map.landmarks || []).filter(l => /^(manuka|kingston)$/.test(l.id))) {
    const node = intersections.filter(n => n.width >= 7 && Math.hypot(n.x - anchor.x, n.z - anchor.z) < 140).sort((a, b) => Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z))[0];
    if (!node) continue;
    const segment = roadSegments.find(s => Math.hypot(s.a[0] - node.x, s.a[1] - node.z) < 3 && s.length > 28);
    if (!segment) continue;
    const dx = (segment.b[0] - segment.a[0]) / segment.length, dz = (segment.b[1] - segment.a[1]) / segment.length;
    const cx = node.x + dx * 15, cz = node.z + dz * 15, half = segment.width / 2 - 0.5;
    ribbon([cx - dx * 1.9, cz - dz * 1.9], [cx + dx * 1.9, cz + dz * 1.9], -half, half, 0x986f58, 0.135);
    for (let side = -half + 0.3; side < half; side += 0.8) {
      ribbon([cx - dx * 1.5, cz - dz * 1.5], [cx + dx * 1.5, cz + dz * 1.5], side - 0.23, side + 0.23, COLORS.paint, 0.15);
    }
    const ix = node.x + dx * 7, iz = node.z + dz * 7, iy = heightAt(ix, iz);
    primitive(box, ix, iy + 0.15, iz, 0.85, 0.3, 3.2, COLORS.kerb, Math.atan2(dx, dz));
    primitive(box, ix, iy + 0.8, iz, 0.16, 1.2, 0.16, 0xe5e4d5);
    primitive(box, ix, iy + 1.28, iz, 0.45, 0.45, 0.1, 0x527d94, Math.atan2(dx, dz));
  }

  const school = (map.landmarks || []).find(l => l.id === 'telopea');
  const polygonArea = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const schoolMain = school && (map.buildings || []).filter(b => /school|education/.test(b.type || '') && b.points?.length && Math.hypot(b.points[0][0] - school.x, b.points[0][1] - school.z) < 220).sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0];
  let schoolDetailed = false;
  function buildingView(building, index) {
    let points = building.points;
    if (!points || points.length < 3) return;
    if (points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points = points.slice(0, -1);
    const x = points.reduce((sum, p) => sum + p[0], 0) / points.length, z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    if (String(building.id).startsWith('osm-') && nearby(buildingCells, x, z).some(b => String(b.id).startsWith('act-') && inside(x, z, b.points))) return;
    const isSchool = school && Math.hypot(x - school.x, z - school.z) < (school.radius || 140) && !/residential|house|apartment|diplomatic/.test(building.type || '');
    const shopping = (map.landmarks || []).some(l => /^(manuka|kingston|griffith|narrabundah)$/.test(l.id) && Math.hypot(x - l.x, z - l.z) < l.radius);
    const utility = /shed|garage|carport|roof/.test(building.type || '');
    const residential = !isSchool && !shopping && !/apartments|commercial|retail|industrial|school|public|office/.test(building.type || '');
    const lowShop = shopping && /commercial|retail/.test(building.type || '') && String(building.id).startsWith('act-') && Number(building.height) <= 10;
    const height = Math.max(2.5, Math.min(50, building === schoolMain ? 7.8 : lowShop ? 3.9 : isSchool ? Math.min(7.8, Number(building.height) || 4.2) : Number(building.height) || (residential ? 3.8 : 7)));
    const floorHeights = points.map(p => heightAt(...p));
    const base = (isSchool ? floorHeights.reduce((a, b) => a + b, 0) / points.length : Math.max(...floorHeights)) + 0.12;
    const footing = Math.min(...floorHeights) - 0.3;
    const signedArea = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    const reverse = signedArea > 0;
    const walls = isSchool ? 0xe0d2b4 : building.color || (residential ? [0xa97860, 0xc8b598, 0xddd4bd, 0x996e59, 0xbca68a][index % 5] : 0xc4bca9);
    const roofColor = isSchool ? 0x9f5943 : residential ? [0x92604b, 0x686964, 0xa26e53, 0x726558][index % 4] : 0x777d79;
    const wallKind = isSchool || index % 3 === 0 || !residential ? 1 : 0;
    const pitched = !utility && (isSchool || residential && height < 10) && building.roof !== 'flat';
    const batch = batchAt(x, z);
    const floors = Math.min(8, Math.max(1, Math.floor((height + 0.2) / 3.1)));
    const windowColumns = points.map((a, i) => {
      const b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return utility || length < 3 ? 0 : Math.min(residential ? 7 : 16, Math.floor(length / (isSchool ? 3 : residential ? 3.8 : 3.2)));
    });
    const eligibleSides = windowColumns.filter(Boolean).length;
    const columnBudget = Math.max(eligibleSides, Math.floor((residential ? 40 : 120) / floors));
    const requestedColumns = windowColumns.reduce((sum, n) => sum + n, 0);
    if (requestedColumns > columnBudget) {
      // Reserve one bay on every eligible side before dividing the rest by size.
      // Footprint order must not leave the last street-facing wings windowless.
      const remaining = columnBudget - eligibleSides, weights = requestedColumns - eligibleSides;
      const shares = windowColumns.map((count, index) => ({ index, share: count ? remaining * (count - 1) / weights : 0 }));
      for (const { index, share } of shares) if (windowColumns[index]) windowColumns[index] = 1 + Math.floor(share);
      let unassigned = columnBudget - windowColumns.reduce((sum, n) => sum + n, 0);
      shares.sort((a, b) => (b.share % 1) - (a.share % 1));
      for (const { index } of shares) if (unassigned && windowColumns[index]) { windowColumns[index]++; unassigned--; }
    }
    function faceQuad(vertices, tint, detail = false) { quad(detail ? batchAt(x, z, 'detail') : batch, ...(reverse ? vertices.slice().reverse() : vertices), tint); }
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.1) continue;
      const ex = (b[0] - a[0]) / length, ez = (b[1] - a[1]) / length;
      const nx = (reverse ? ez : -ez), nz = (reverse ? -ex : ex);
      let wall = [[a[0], footing, a[1]], [b[0], footing, b[1]], [b[0], base + height, b[1]], [a[0], base + height, a[1]]];
      let uv = [[0, 0], [length, 0], [length, base + height - footing], [0, base + height - footing]];
      if (reverse) { wall.reverse(); uv.reverse(); }
      surfaceTriangle(x, z, wall[0], wall[1], wall[2], walls, wallKind, [...uv[0], ...uv[1], ...uv[2]]);
      surfaceTriangle(x, z, wall[0], wall[2], wall[3], walls, wallKind, [...uv[0], ...uv[2], ...uv[3]]);
      if (isSchool) {
        let lower = [[a[0] + nx * 0.018, footing, a[1] + nz * 0.018], [b[0] + nx * 0.018, footing, b[1] + nz * 0.018],
          [b[0] + nx * 0.018, base + Math.min(3.25, height * 0.43), b[1] + nz * 0.018], [a[0] + nx * 0.018, base + Math.min(3.25, height * 0.43), a[1] + nz * 0.018]];
        let lowerUv = [[0, 0], [length, 0], [length, 3.25], [0, 3.25]];
        if (reverse) { lower.reverse(); lowerUv.reverse(); }
        surfaceTriangle(x, z, lower[0], lower[1], lower[2], 0xa16b55, 0, [...lowerUv[0], ...lowerUv[1], ...lowerUv[2]]);
        surfaceTriangle(x, z, lower[0], lower[2], lower[3], 0xa16b55, 0, [...lowerUv[0], ...lowerUv[2], ...lowerUv[3]]);
      }
      // Plinth, fascia and eaves are narrow planes rather than hundreds of boxes.
      function stripe(y0, y1, offset, tint) {
        faceQuad([[a[0] + nx * offset, y0, a[1] + nz * offset], [b[0] + nx * offset, y0, b[1] + nz * offset],
          [b[0] + nx * offset, y1, b[1] + nz * offset], [a[0] + nx * offset, y1, a[1] + nz * offset]], tint);
      }
      stripe(base, base + 0.26, 0.025, isSchool ? 0xb2a58a : 0x8a8172);
      stripe(base + height - 0.18, base + height + 0.05, 0.1, isSchool ? 0xded4bc : 0xc1b9a6);
      const eave = [[a[0], base + height - 0.05, a[1]], [b[0], base + height - 0.05, b[1]],
        [b[0] + nx * 0.28, base + height - 0.05, b[1] + nz * 0.28], [a[0] + nx * 0.28, base + height - 0.05, a[1] + nz * 0.28]];
      quad(batch, ...eave, 0x807c6d); quad(batch, ...eave.slice().reverse(), 0x807c6d);
      if (utility || length < 3) continue;
      const columns = windowColumns[i];
      const bay = (u, v, halfWidth, halfHeight, offset, tint) => {
        const cx = a[0] + ex * u + nx * offset, cz = a[1] + ez * u + nz * offset;
        faceQuad([[cx - ex * halfWidth, v - halfHeight, cz - ez * halfWidth], [cx + ex * halfWidth, v - halfHeight, cz + ez * halfWidth],
          [cx + ex * halfWidth, v + halfHeight, cz + ez * halfWidth], [cx - ex * halfWidth, v + halfHeight, cz - ez * halfWidth]], tint, true);
      };
      for (let row = 0; row < floors; row++) for (let col = 0; col < columns; col++) {
        const u = (col + 0.5) / columns * length, y = base + (isSchool ? 1.7 : 1.9) + row * (isSchool ? 3.55 : 3.0);
        const hw = Math.min(isSchool ? 1.0 : shopping && row === 0 ? 1.25 : 0.82, length / columns * 0.34);
        const hh = isSchool ? 0.95 : shopping && row === 0 ? 1.2 : 0.72;
        bay(u, y, hw + 0.09, hh + 0.1, 0.042, isSchool ? 0xe8dfc6 : 0xd4cec0);
        bay(u, y, hw, hh, 0.055, [0x566d70, 0x627b7b, 0x4c656c][(row + col + index) % 3]);
        bay(u, y + hh * 0.57, hw, hh * 0.18, 0.058, 0x8ba0a0);
        bay(u, y, 0.035, hh, 0.065, 0xc6c6b9);
        if (isSchool) bay(u, y - 0.08, hw, 0.035, 0.068, 0xc9cbbb);
        counters.windows++;
      }
      if (shopping && length > 7 && length < 70) {
        primitive(box, (a[0] + b[0]) / 2 + nx * 0.45, base + 3, (a[1] + b[1]) / 2 + nz * 0.45, 1.05, 0.18, length,
          0x414b48, Math.atan2(ex, ez));
      }
    }
    if (building === schoolMain) {
      let front = null;
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length < 12) continue;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        for (const road of roadSegments) {
          if (!/New South Wales Crescent/i.test(road.road.name || '')) continue;
          const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1];
          const t = THREE.MathUtils.clamp(((mx - road.a[0]) * dx + (mz - road.a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
          const qx = road.a[0] + t * dx, qz = road.a[1] + t * dz;
          const distance = Math.hypot(qx - mx, qz - mz);
          const nx = (reverse ? b[1] - a[1] : a[1] - b[1]) / length;
          const nz = (reverse ? a[0] - b[0] : b[0] - a[0]) / length;
          if ((qx - mx) * nx + (qz - mz) * nz < distance * 0.35) continue;
          if ([0.1, 0.3, 0.6].some(f => inside(mx + (qx - mx) * f, mz + (qz - mz) * f, points))) continue;
          if (!front || distance < front.distance) front = { a, b, length, mx, mz, distance, road };
        }
      }
      if (front) {
        const ex = (front.b[0] - front.a[0]) / front.length, ez = (front.b[1] - front.a[1]) / front.length;
        const nx = reverse ? ez : -ez, nz = reverse ? -ex : ex;
        function arch(u, bottom, width, tall, offset, tint) {
          const radius = width / 2, shoulder = bottom + tall - radius;
          const p = (du, y) => [front.mx + ex * (u + du) + nx * offset, y, front.mz + ez * (u + du) + nz * offset];
          faceQuad([p(-radius, bottom), p(radius, bottom), p(radius, shoulder), p(-radius, shoulder)], tint);
          for (let k = 0; k < 10; k++) {
            const a = k / 10 * Math.PI, b = (k + 1) / 10 * Math.PI;
            const fan = [p(0, shoulder), p(Math.cos(a) * radius, shoulder + Math.sin(a) * radius), p(Math.cos(b) * radius, shoulder + Math.sin(b) * radius)];
            triangle(batch, ...(reverse ? fan.reverse() : fan), tint);
          }
        }
        for (let i = -2; i <= 2; i++) {
          arch(i * 1.6, base + 3.7, 1.3, 3.25, 0.11, 0xeee9d8);
          arch(i * 1.6, base + 3.83, 1.02, 2.95, 0.125, 0x607c80);
        }
        const yaw = Math.atan2(ex, ez);
        primitive(box, front.mx + nx * 0.18, base + 1.45, front.mz + nz * 0.18, 0.24, 2.9, 3.3, 0xe0d4ba, yaw);
        primitive(box, front.mx + nx * 0.34, base + 1.32, front.mz + nz * 0.34, 0.12, 2.55, 2.7, 0x526d70, yaw);
      }
    }
    const faces = THREE.ShapeUtils.triangulateShape(points.map(p => new THREE.Vector2(...p)), []);
    const roofHeight = p => {
      if (!pitched) return base + height;
      let distance = Infinity;
      for (let i = 0; i < points.length; i++) distance = Math.min(distance, segmentDistance(p[0], p[1], points[i], points[(i + 1) % points.length]));
      return base + height + Math.min(isSchool ? 2.2 : 1.9, distance * (isSchool ? 0.48 : 0.42));
    };
    function roofTriangle(a, b, c, depth) {
      if (depth) {
        const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
        roofTriangle(a, ab, ca, depth - 1); roofTriangle(ab, b, bc, depth - 1); roofTriangle(ca, bc, c, depth - 1); roofTriangle(ab, bc, ca, depth - 1); return;
      }
      const vertices = [a, b, c].map(p => [p[0], roofHeight(p), p[1]]);
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross > 0) vertices.reverse();
      surfaceTriangle(x, z, ...vertices, roofColor, 2); counters.roofFacets++;
    }
    for (const f of faces) roofTriangle(points[f[0]], points[f[1]], points[f[2]], pitched ? points.length <= 10 ? 2 : 1 : 0);
    if (residential && !utility && index % 3 === 0) {
      const top = roofHeight([x, z]);
      primitive(box, x, top + 0.4, z, 0.55, 1.0, 0.65, 0x9c7b61);
      primitive(box, x, top + 0.94, z, 0.7, 0.12, 0.8, 0x747366);
    }
    const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
    const minZ = Math.min(...points.map(p => p[1])), maxZ = Math.max(...points.map(p => p[1]));
    softShadow(x, z, (maxX - minX) * 0.6 + 1.5, (maxZ - minZ) * 0.6 + 1.5, 0.15);
    if (isSchool) schoolDetailed = true;
    counters.buildings++; counters.texturedBuildings++;
  }
  const landmarkBuildingIds = new Set(map.landmarkBuildingIds || []);
  (map.buildings || []).forEach((building, index) => {
    if (!landmarkBuildingIds.has(building.id)) buildingView(building, index);
  });

  // Each canopy is a small faceted crown, avoiding thousands of transparent leaves.
  const treeChunks = new Map(), treeCells = new Map();
  function tree(x, z, seed, park = false) {
    if ((map.landmarkTreeExclusions || []).some(points => inside(x, z, points))) return;
    const chunkKey = `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
    if (counters.trees >= 9000 || (treeChunks.get(chunkKey) || 0) >= 90) return;
    const treeKey = `${Math.floor(x / 12)},${Math.floor(z / 12)}`;
    if (treeCells.has(treeKey)) return;
    const roadCollision = nearby(roadCells, x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.width / 2 + 2.6);
    if (roadCollision || nearby(buildingCells, x, z).some(b => inside(x, z, b.points))) return;
    const avenue = school && Math.hypot(x - school.x, z - school.z) < 250;
    const y = heightAt(x, z), h = (avenue ? 12.5 : 7) + hash(seed) * (avenue ? 5 : 5);
    const eucalyptus = !avenue && seed % 3 !== 0, angle = hash(seed + 3) * Math.PI * 2;
    const leanX = Math.cos(angle) * h * 0.1, leanZ = Math.sin(angle) * h * 0.1;
    primitive(trunk, x, y + h * 0.31, z, 0.24 + h * 0.008, h * 0.62, 0.25, eucalyptus ? 0x8b8672 : 0x756b59);
    primitive(trunk, x + leanX * 0.4, y + h * 0.58, z + leanZ * 0.4, 0.15, h * 0.3, 0.15, 0x8b8370, angle);
    const foliage = eucalyptus ? [0x657d61, 0x71876b, 0x6a805f][seed % 3] : [0x647d48, 0x7c8b51, 0x70834c][seed % 3];
    primitive(avenue ? leafCrown : crown, x + leanX, y + h * 0.8, z + leanZ, h * (park ? 0.38 : 0.32), h * (eucalyptus ? 0.29 : 0.32), h * 0.3, foliage, angle);
    for (let i = 0; i < 2; i++) {
      const a = angle + i * 2.6, r = h * 0.19;
      primitive(crown, x + leanX + Math.cos(a) * r, y + h * (0.67 + i * 0.15), z + leanZ + Math.sin(a) * r,
        h * 0.23, h * 0.22, h * 0.24, new THREE.Color(foliage).multiplyScalar(0.94 + i * 0.07), a);
    }
    softShadow(x + leanX * 0.5, z + leanZ * 0.5, h * 0.4, h * 0.34, 0.13);
    counters.trees++;
    if (map.spawn && Math.hypot(x - map.spawn.x, z - map.spawn.z) < 250) counters.treesNearSpawn++;
    treeCells.set(treeKey, true);
    treeChunks.set(chunkKey, (treeChunks.get(chunkKey) || 0) + 1);
  }
  let seed = 0;
  const streetRoads = [...(map.roads || [])].filter(r => !/service|footway|path|track|motorway|trunk/.test(r.type));
  const anchorDistance = road => Math.min(...(map.landmarks || [map.spawn]).filter(Boolean).map(l => Math.hypot(road.points[0][0] - l.x, road.points[0][1] - l.z)));
  streetRoads.sort((a, b) => anchorDistance(a) - anchorDistance(b));
  for (const road of streetRoads) {
    let untilNext = 8 + hash(seed++) * 18;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.1) continue;
      const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
      while (untilNext < length) {
        for (const side of [-1, 1]) {
          const offset = side * ((Number(road.width) || 7) / 2 + 5 + hash(seed) * 1.5);
          tree(a[0] + dx * untilNext - dz * offset, a[1] + dz * untilNext + dx * offset, seed++);
        }
        untilNext += 24 + hash(seed + 17) * 8;
      }
      untilNext -= length;
    }
  }
  // Reserve groves in the larger public parks as well as street avenues.
  for (const area of map.areas || []) {
    if (!/park|wood|forest|grass/.test(area.type)) continue;
    const p = area.points;
    if (!p?.length) continue;
    const minX = Math.min(...p.map(v => v[0])), maxX = Math.max(...p.map(v => v[0]));
    const minZ = Math.min(...p.map(v => v[1])), maxZ = Math.max(...p.map(v => v[1]));
    for (let x = minX + 13; x < maxX; x += 37) for (let z = minZ + 11; z < maxZ; z += 39) {
      if (inside(x, z, p) && hash(seed++) > 0.45) tree(x + hash(seed) * 10, z, seed, true);
    }
  }

  // One atlas and one sign mesh per neighbourhood keep readable names inexpensive.
  const labels = [];
  const labelIds = new Map();
  function labelId(text) {
    if (!labelIds.has(text) && labels.length < 128) {
      labelIds.set(text, labels.length);
      labels.push(text);
    }
    return labelIds.get(text);
  }
  const signPlacements = [];
  const signSpacing = [];
  for (const node of intersections) {
    if (signPlacements.length >= 84 || signSpacing.some(p => Math.hypot(p.x - node.x, p.z - node.z) < 95)) continue;
    const roads = [...node.roads.values()].filter(r => r.name);
    if (roads.length < 2) continue;
    signSpacing.push(node);
    const x = node.x + node.width / 2 + 2, z = node.z + node.width / 2 + 2;
    const y = heightAt(x, z);
    primitive(trunk, x, y + 1.7, z, 0.075, 3.4, 0.075, COLORS.metal);
    roads.slice(0, 2).forEach((r, i) => signPlacements.push({ x, z, y: y + 2.8 + i * 0.36, label: labelId(r.name), width: Math.max(2.2, Math.min(4.8, r.name.length * 0.15)), yaw: i * Math.PI / 2, height: 0.3 }));
    const major = roads.filter(r => /primary|secondary|tertiary/.test(r.type));
    if (major.length >= 2) {
      for (const side of [-1, 1]) {
        const lx = node.x + side * (node.width / 2 + 1), lz = node.z - side * (node.width / 2 + 1);
        const ly = heightAt(lx, lz);
        primitive(trunk, lx, ly + 2.2, lz, 0.11, 4.4, 0.11, COLORS.metal);
        primitive(box, lx, ly + 3.7, lz, 0.32, 0.95, 0.3, 0x303532);
        primitive(crown, lx, ly + 3.97, lz + 0.17, 0.09, 0.09, 0.04, 0xb94636);
        primitive(crown, lx, ly + 3.43, lz - 0.17, 0.09, 0.09, 0.04, 0x70a66b);
      }
    }
  }
  if (school) {
    const label = labelId('Telopea Park School');
    // Enrich an existing footprint rather than inventing a second school campus.
    let placement = null;
    for (const s of roadSegments) {
      const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
      const along = THREE.MathUtils.clamp((school.x - s.a[0]) * dx + (school.z - s.a[1]) * dz, 3, Math.max(3, s.length - 3));
      const px = s.a[0] + along * dx, pz = s.a[1] + along * dz;
      const side = Math.sign((school.x - px) * -dz + (school.z - pz) * dx) || 1;
      const x = px - dz * side * (s.width / 2 + 6), z = pz + dx * side * (s.width / 2 + 6);
      const distance = Math.hypot(x - school.x, z - school.z);
      if (distance > (school.radius || 125) + 40 || (placement && distance >= placement.distance)) continue;
      if (nearby(roadCells, x, z).some(r => segmentDistance(x, z, r.a, r.b) < r.width / 2 + 3)) continue;
      if (nearby(buildingCells, x, z).some(b => inside(x, z, b.points))) continue;
      placement = { x, z, yaw: Math.atan2(dz, dx), distance };
    }
    const { x, z, yaw } = placement || { x: school.x, z: school.z, yaw: 0 };
    const y = heightAt(x, z);
    primitive(box, x, y + 0.8, z, 5.5, 1.6, 0.4, COLORS.cream, -yaw);
    signPlacements.push({ x: x - Math.sin(yaw) * 0.22, z: z + Math.cos(yaw) * 0.22, y: y + 1.0, label, width: 4.9, height: 0.65, yaw });
    if (!schoolDetailed) {
      // A sign remains useful when the source has no campus building footprints.
      primitive(box, x - 2.5, y + 1.1, z, 0.25, 2.2, 0.5, 0x8b664c);
      primitive(box, x + 2.5, y + 1.1, z, 0.25, 2.2, 0.5, 0x8b664c);
    }
  }
  let signMaterial = null;
  if (labels.length && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 2048;
    const context = canvas.getContext('2d');
    context.fillStyle = '#24503c'; context.fillRect(0, 0, 2048, 2048);
    context.textAlign = 'center'; context.textBaseline = 'middle';
    labels.forEach((label, i) => {
      const x = (i % 4) * 512, y = Math.floor(i / 4) * 64;
      context.strokeStyle = '#e9eee4'; context.lineWidth = 2; context.strokeRect(x + 5, y + 4, 502, 56);
      context.fillStyle = '#ffffff'; context.font = 'bold 32px sans-serif';
      context.fillText(label, x + 256, y + 32, 475);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    textures.push(texture);
    signMaterial = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
    materials.push(signMaterial);
    for (const p of signPlacements) {
      if (p.label === undefined) continue;
      const dx = Math.cos(p.yaw) * p.width / 2, dz = Math.sin(p.yaw) * p.width / 2;
      const a = [p.x - dx, p.y - p.height / 2, p.z - dz], b = [p.x + dx, p.y - p.height / 2, p.z + dz];
      const c = [b[0], p.y + p.height / 2, b[2]], d = [a[0], p.y + p.height / 2, a[2]];
      const u0 = (p.label % 4) / 4, u1 = u0 + 0.25;
      const v1 = 1 - Math.floor(p.label / 4) / 32, v0 = v1 - 1 / 32;
      quad(batchAt(p.x, p.z, 'sign'), a, b, c, d, 0xffffff, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
      counters.signs++;
    }
  }

  for (const chunk of chunks.values()) {
    for (const [kind, batch] of chunk.batches) {
      if (!batch.positions.length) continue;
      const meshGeometry = new THREE.BufferGeometry();
      meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      meshGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      if (kind === 'sign') meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
      else {
        meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, kind === 'shadow' ? 4 : 3));
        if (kind === 'surface') {
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
          meshGeometry.setAttribute('surfaceKind', new THREE.Float32BufferAttribute(batch.kinds, 1));
        }
        if (kind === 'road') {
          const uv = [];
          for (let i = 0; i < batch.positions.length; i += 3) uv.push(batch.positions[i] / 6, batch.positions[i + 2] / 6);
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        }
      }
      meshGeometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(meshGeometry, kind === 'sign' ? signMaterial : kind === 'road' ? roadMaterial : kind === 'surface' ? surfaceMaterial : kind === 'shadow' ? shadowMaterial : opaque);
      mesh.name = `Canberra ${kind}`;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      chunk.group.add(mesh);
      counters.meshes++;
    }
    // Release the temporary JavaScript arrays after uploading typed buffers.
    chunk.batches.clear();
  }
  for (const g of temporaryGeometry) g.dispose();
  counters.chunks = chunks.size;
  const stats = Object.freeze(counters);
  let disposed = false;
  function update(player) {
    const x = player.x ?? player.position?.x ?? 0;
    const z = player.z ?? player.position?.z ?? 0;
    for (const chunk of chunks.values()) {
      const distance = Math.hypot(chunk.x - x, chunk.z - z);
      chunk.group.visible = distance < VISIBILITY + CHUNK_SIZE * 0.71;
      for (const mesh of chunk.group.children) {
        const range = mesh.name === 'Canberra detail' ? 280 : mesh.name === 'Canberra shadow' ? 350 : mesh.name === 'Canberra pavement' ? 450 : mesh.name === 'Canberra solid' ? 475 : VISIBILITY;
        mesh.visible = distance < range + CHUNK_SIZE * 0.71;
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    root.removeFromParent();
    chunks.clear();
  }
  update(map.spawn || { x: 0, z: 0 });
  return { heightAt, update, dispose, stats };
}
