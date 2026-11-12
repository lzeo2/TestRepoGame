import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Metres, with east = +x and south = +z. All art is generated locally.
const CHUNK_SIZE = 350;
const VISIBILITY = 720;
const CELL_SIZE = 80;
const COLORS = {
  grass: 0x9ba56e, park: 0x8e9f68, asphalt: 0x555654, path: 0xc3bcb0,
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
  const counters = { buildings: 0, trees: 0, signs: 0, roadSegments: 0, triangles: 0, chunks: 0, meshes: 0 };
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();
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
      const tone = 218 + ((i * 17 + Math.floor(i / 256) * 31) % 35);
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
    if (!chunk.batches.has(kind)) chunk.batches.set(kind, { positions: [], normals: [], colors: [], uvs: [] });
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

  function primitive(geometry, x, y, z, sx, sy, sz, tint, yaw = 0) {
    const batch = batchAt(x, z);
    position.set(x, y, z);
    scale.set(sx, sy, sz);
    quaternion.setFromAxisAngle(up, yaw);
    matrix.compose(position, quaternion, scale);
    const p = geometry.attributes.position;
    const n = geometry.attributes.normal;
    color.set(tint);
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyQuaternion(quaternion).normalize();
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
  const cone = geometry(new THREE.ConeGeometry(1, 1, 6));

  function hash(n) {
    const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return a - Math.floor(a);
  }

  function groundPolygon(points, tint, lift = 0.018) {
    if (!points || points.length < 3) return;
    const shape = points.map(p => new THREE.Vector2(p[0], p[1]));
    const faces = THREE.ShapeUtils.triangulateShape(shape, []);
    const batch = batchAt(points[0][0], points[0][1]);
    for (const face of faces) {
      const p = face.map(i => [points[i][0], heightAt(...points[i]) + lift, points[i][1]]);
      if ((p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) > 0) p.reverse();
      triangle(batch, ...p, tint);
    }
  }

  // Small terrain tiles allow the renderer to reject whole neighbourhoods.
  const terrainStep = 35;
  for (let z = bounds.minZ - 250; z < bounds.maxZ + 250; z += terrainStep) {
    for (let x = bounds.minX - 250; x < bounds.maxX + 250; x += terrainStep) {
      const shade = new THREE.Color(COLORS.grass).multiplyScalar(0.96 + hash(x + z * 0.3) * 0.07);
      const point = (px, pz) => [px, heightAt(px, pz), pz];
      quad(batchAt(x, z), point(x, z), point(x, z + terrainStep),
        point(x + terrainStep, z + terrainStep), point(x + terrainStep, z), shade);
    }
  }
  for (const area of map.areas || []) {
    const tint = /water|lake|basin/.test(area.type) ? 0x658b8f : /pitch|sport/.test(area.type) ? 0x84996a : COLORS.park;
    groundPolygon(area.points, tint);
  }

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

  function ribbon(a, b, left, right, tint, lift) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.1) return;
    const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
    const pieces = Math.max(1, Math.ceil(length / 14));
    for (let i = 0; i < pieces; i++) {
      const t0 = i / pieces, t1 = (i + 1) / pieces;
      const x0 = THREE.MathUtils.lerp(a[0], b[0], t0), z0 = THREE.MathUtils.lerp(a[1], b[1], t0);
      const x1 = THREE.MathUtils.lerp(a[0], b[0], t1), z1 = THREE.MathUtils.lerp(a[1], b[1], t1);
      const p = (x, z, d) => [x + nx * d, heightAt(x + nx * d, z + nz * d) + lift, z + nz * d];
      quad(batchAt(x0, z0, tint === COLORS.asphalt ? 'road' : 'solid'), p(x0, z0, right), p(x1, z1, right), p(x1, z1, left), p(x0, z0, left), tint);
    }
  }
  for (const s of roadSegments) {
    const half = s.width / 2;
    ribbon(s.a, s.b, -half - 3.7, half + 3.7, 0x9fa977, 0.023);
    ribbon(s.a, s.b, -half - 2, half + 2, COLORS.path, 0.045);
    ribbon(s.a, s.b, -half - 0.18, half + 0.18, COLORS.kerb, 0.065);
    ribbon(s.a, s.b, -half, half, COLORS.asphalt, 0.083);
    const marked = s.width >= 7 && !/service|living_street|footway|path|track/.test(s.road.type);
    if (marked) {
      const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
      for (let d = 8; d < s.length - 6; d += 12) {
        ribbon([s.a[0] + dx * d, s.a[1] + dz * d], [s.a[0] + dx * Math.min(d + 3, s.length - 6), s.a[1] + dz * Math.min(d + 3, s.length - 6)], -0.065, 0.065, COLORS.paint, 0.105);
      }
    }
    counters.roadSegments++;
  }

  const intersections = [...nodes.values()].filter(n => n.roads.size > 1);
  // Asphalt aprons cover the crossing footpaths where named streets meet.
  for (const node of intersections) {
    const radius = node.width / 2 + 2.1;
    const batch = batchAt(node.x, node.z, 'road');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2;
      const p = angle => [node.x + Math.cos(angle) * radius, heightAt(node.x + Math.cos(angle) * radius, node.z + Math.sin(angle) * radius) + 0.115, node.z + Math.sin(angle) * radius];
      triangle(batch, [node.x, heightAt(node.x, node.z) + 0.115, node.z], p(b), p(a), COLORS.asphalt);
    }
  }

  const school = (map.landmarks || []).find(l => l.id === 'telopea');
  let schoolDetailed = false;
  function buildingView(building, index) {
    let points = building.points;
    if (!points || points.length < 3) return;
    if (points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points = points.slice(0, -1);
    const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const isSchool = school && Math.hypot(x - school.x, z - school.z) < (school.radius || 140);
    const shopping = (map.landmarks || []).some(l => /^(manuka|kingston|griffith|narrabundah)$/.test(l.id) && Math.hypot(x - l.x, z - l.z) < l.radius);
    const residential = !isSchool && !shopping && !/apartments|commercial|retail|industrial|school|public|office/.test(building.type || '');
    const height = Math.max(2.7, Math.min(isSchool ? 6.2 : 50, Number(building.height) || (isSchool ? 5 : residential ? 3.5 : 7)));
    // A single level plinth avoids walls floating on Red Hill's sloping streets.
    const base = Math.max(...points.map(p => heightAt(...p))) + 0.12;
    const footing = Math.min(...points.map(p => heightAt(...p))) - 0.3;
    const batch = batchAt(x, z);
    const walls = isSchool ? COLORS.cream : building.color || (residential ? [0x9d7761, 0xb49a7e, 0xd0c5ae, 0xad8a70][index % 4] : 0xb4ada0);
    const roofColor = isSchool ? 0x985c40 : residential ? [0x95664f, 0x755f52, 0x9f7155, 0x747975][index % 4] : 0x8a8980;
    const pitched = isSchool || (residential && height < 10 && building.roof !== 'flat');
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // Both windings are accepted because imported footprint orientation varies.
      const wall = [[a[0], footing, a[1]], [b[0], footing, b[1]], [b[0], base + height, b[1]], [a[0], base + height, a[1]]];
      quad(batch, ...wall, walls);
      quad(batch, ...wall.slice().reverse(), walls);
      if (edgeLength > 3 && edgeLength < 180) {
        const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const windows = Math.min(16, Math.floor(edgeLength / (isSchool ? 3.2 : 4.5)));
        for (let k = 0; k < windows; k++) {
          const t = (k + 0.5) / windows;
          const wx = THREE.MathUtils.lerp(a[0], b[0], t), wz = THREE.MathUtils.lerp(a[1], b[1], t);
          const halfWidth = Math.min(shopping ? 2.5 : 0.8, edgeLength / windows * 0.25);
          const bottom = base + (shopping ? 0.5 : 1.35), top = bottom + (isSchool ? 1.65 : shopping ? 2.1 : 1.1);
          const ex = Math.sin(yaw) * halfWidth, ez = Math.cos(yaw) * halfWidth;
          for (const side of [-1, 1]) {
            const ox = Math.cos(yaw) * 0.035 * side, oz = -Math.sin(yaw) * 0.035 * side;
            const pane = [[wx - ex + ox, bottom, wz - ez + oz], [wx + ex + ox, bottom, wz + ez + oz],
              [wx + ex + ox, top, wz + ez + oz], [wx - ex + ox, top, wz - ez + oz]];
            quad(batch, ...(side > 0 ? pane.reverse() : pane), 0x607775);
          }
        }
      }
      if (shopping && edgeLength > 7 && edgeLength < 60) {
        primitive(box, (a[0] + b[0]) / 2, base + 3, (a[1] + b[1]) / 2, 1.2, 0.18, edgeLength,
          [0x6f7c69, 0x9c7761, 0xccc0a1][index % 3], Math.atan2(b[0] - a[0], b[1] - a[1]));
      }
    }
    if (pitched) {
      const top = [x, base + height + Math.min(2.3, height * 0.4), z];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const pa = [a[0], base + height, a[1]], pb = [b[0], base + height, b[1]];
        triangle(batch, pa, pb, top, roofColor);
        triangle(batch, pb, pa, top, roofColor);
      }
    } else groundRoof(points, base + height, roofColor, batch);
    if (residential && index % 3 === 0) primitive(box, x + 1, base + height + 0.5, z, 0.6, 1.3, 0.7, walls);
    if (isSchool) schoolDetailed = true;
    counters.buildings++;
  }
  function groundRoof(points, y, tint, batch) {
    const faces = THREE.ShapeUtils.triangulateShape(points.map(p => new THREE.Vector2(...p)), []);
    for (const face of faces) {
      const a = face.map(i => [points[i][0], y, points[i][1]]);
      triangle(batch, ...a, tint);
      triangle(batch, ...a.slice().reverse(), tint);
    }
  }
  (map.buildings || []).forEach(buildingView);

  // Each canopy is a small faceted crown, avoiding thousands of transparent leaves.
  function tree(x, z, seed, park = false) {
    if (counters.trees >= 1800) return;
    const roadCollision = nearby(roadCells, x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.width / 2 + 2.6);
    if (roadCollision || nearby(buildingCells, x, z).some(b => inside(x, z, b.points))) return;
    const y = heightAt(x, z), h = 6.5 + hash(seed) * 5;
    const eucalyptus = seed % 3 !== 0;
    primitive(trunk, x, y + h * 0.34, z, 0.22, h * 0.68, 0.22, COLORS.trunk);
    const foliage = eucalyptus ? [0x677c60, 0x728568, 0x7b8b6e][seed % 3] : [0x68804e, 0x82914f, 0x7f8650][seed % 3];
    primitive(eucalyptus ? crown : cone, x, y + h * 0.79, z, h * (park ? 0.42 : 0.35), h * 0.44, h * 0.32, foliage, hash(seed + 1) * 6);
    if (eucalyptus) primitive(crown, x + h * 0.18, y + h * 0.95, z + h * 0.1, h * 0.27, h * 0.3, h * 0.3, foliage);
    counters.trees++;
  }
  let seed = 0;
  for (const s of roadSegments) {
    if (/service|footway|path|track/.test(s.road.type)) continue;
    const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
    for (let d = 15; d < s.length - 8; d += 31 + hash(seed + 17) * 12) {
      for (const side of [-1, 1]) {
        const offset = side * (s.width / 2 + 5.5 + hash(seed) * 2);
        tree(s.a[0] + dx * d - dz * offset, s.a[1] + dz * d + dx * offset, seed++);
      }
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
        meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
        if (kind === 'road') {
          const uv = [];
          for (let i = 0; i < batch.positions.length; i += 3) uv.push(batch.positions[i] / 6, batch.positions[i + 2] / 6);
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        }
      }
      meshGeometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(meshGeometry, kind === 'sign' ? signMaterial : kind === 'road' ? roadMaterial : opaque);
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
    for (const chunk of chunks.values()) chunk.group.visible = Math.abs(chunk.x - x) < VISIBILITY + CHUNK_SIZE / 2 && Math.abs(chunk.z - z) < VISIBILITY + CHUNK_SIZE / 2;
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
