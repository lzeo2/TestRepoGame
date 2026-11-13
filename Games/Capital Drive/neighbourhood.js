import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Original procedural streetscape details, anchored to the supplied footprints.
const CHUNK = 350;
const CELL = 100;
const MAX_FRONTAGES = 2800;
const PALETTE = { concrete: 0xaaa899, timber: 0x8a8068, hedge: 0x536d42, frame: 0xc9c6ac, pole: 0x747c75 };

export function createNeighbourhoodDetails(scene, map, heightAt) {
  const root = new THREE.Group();
  root.name = 'Neighbourhood details';
  scene.add(root);
  const chunks = new Map(), roadIndex = new Map(), buildingIndex = new Map(), parkIndex = new Map();
  const materials = [], textures = [];
  const stats = { frontages: 0, driveways: 0, hedges: 0, fences: 0, letterboxes: 0, doors: 0, verandahs: 0, lamps: 0, benches: 0, bins: 0, stopPoles: 0, shopSigns: 0, chunks: 0, meshes: 0, triangles: 0 };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  materials.push(material);
  const box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const bush = new THREE.IcosahedronGeometry(1, 0);
  const geometrySources = [box, bush];
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const rotation = new THREE.Quaternion(), axis = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3(), size = new THREE.Vector3(), vertex = new THREE.Vector3(), normal = new THREE.Vector3(), color = new THREE.Color();
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const clamp = THREE.MathUtils.clamp;
  const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const nearby = (index, x, z) => index.get(cellKey(x, z)) || [];

  function indexItem(index, item, points, margin = 0) {
    const minX = Math.min(...points.map(p => p[0])) - margin, maxX = Math.max(...points.map(p => p[0])) + margin;
    const minZ = Math.min(...points.map(p => p[1])) - margin, maxZ = Math.max(...points.map(p => p[1])) + margin;
    for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++) for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
      const key = `${x},${z}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(item);
    }
  }
  function inside(x, z, points) {
    let result = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  }
  function project(x, z, a, b, min = 0, max = 1) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), min, max);
    const px = a[0] + t * dx, pz = a[1] + t * dz;
    return { x: px, z: pz, distance: Math.hypot(x - px, z - pz), t };
  }
  const inPark = (x, z) => nearby(parkIndex, x, z).some(a => inside(x, z, a.points));
  const inBuilding = (x, z, except) => nearby(buildingIndex, x, z).some(b => b !== except && inside(x, z, b.points));
  const inRoad = (x, z, margin = 0) => nearby(roadIndex, x, z).some(s => project(x, z, s.a, s.b).distance < s.width / 2 + margin);
  function batchAt(x, z, kind = 'solid') {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), key = `${cx},${cz}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      group.name = `Frontages ${key}`;
      root.add(group);
      chunks.set(key, { x: (cx + 0.5) * CHUNK, z: (cz + 0.5) * CHUNK, group, batches: new Map() });
    }
    const chunk = chunks.get(key);
    if (!chunk.batches.has(kind)) chunk.batches.set(kind, { positions: [], normals: [], colors: [], uvs: [] });
    return chunk.batches.get(kind);
  }
  function triangle(batch, a, b, c, tint) {
    const ab = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a));
    const ac = new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a));
    normal.crossVectors(ab, ac).normalize(); color.set(tint);
    for (const p of [a, b, c]) { batch.positions.push(...p); batch.normals.push(normal.x, normal.y, normal.z); batch.colors.push(color.r, color.g, color.b); }
    stats.triangles++;
  }
  function solid(source, x, y, z, sx, sy, sz, tint, yaw = 0) {
    const batch = batchAt(x, z);
    matrix.compose(position.set(x, y, z), rotation.setFromAxisAngle(axis, yaw), size.set(sx, sy, sz));
    normalMatrix.getNormalMatrix(matrix); color.set(tint);
    const p = source.attributes.position, n = source.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(vertex.x, vertex.y, vertex.z); batch.normals.push(normal.x, normal.y, normal.z); batch.colors.push(color.r, color.g, color.b);
    }
    stats.triangles += p.count / 3;
  }
  function groundBox(x, z, sx, sy, sz, tint, yaw = 0) { solid(box, x, heightAt(x, z) + sy / 2, z, sx, sy, sz, tint, yaw); }
  function groundStrip(a, b, width, tint) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.2) return;
    const nx = -(b[1] - a[1]) / length * width / 2, nz = (b[0] - a[0]) / length * width / 2;
    const steps = Math.ceil(length / 2);
    for (let i = 0; i < steps; i++) {
      const x0 = THREE.MathUtils.lerp(a[0], b[0], i / steps), z0 = THREE.MathUtils.lerp(a[1], b[1], i / steps);
      const x1 = THREE.MathUtils.lerp(a[0], b[0], (i + 1) / steps), z1 = THREE.MathUtils.lerp(a[1], b[1], (i + 1) / steps);
      const p = (x, z) => [x, heightAt(x, z) + 0.12, z];
      const q = [p(x0 - nx, z0 - nz), p(x1 - nx, z1 - nz), p(x1 + nx, z1 + nz), p(x0 + nx, z0 + nz)];
      const batch = batchAt(x0, z0); triangle(batch, q[0], q[2], q[1], tint); triangle(batch, q[0], q[3], q[2], tint);
    }
  }
  const segments = [];
  for (const road of map.roads || []) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.2) continue;
      const item = { a, b, road, width: Number(road.width) || 7 };
      segments.push(item); indexItem(roadIndex, item, [a, b], 15);
    }
  }
  for (const b of map.buildings || []) if (b.points?.length >= 3) indexItem(buildingIndex, b, b.points, 3);
  for (const a of map.areas || []) if (a.points?.length >= 3 && /park|pitch|golf|nature_reserve|water|wood|forest/.test(a.type)) indexItem(parkIndex, a, a.points);

  function nearestStreet(x, z) {
    let best = null;
    const visited = new Set();
    for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) for (const s of nearby(roadIndex, x + cx * CELL, z + cz * CELL)) {
      if (visited.has(s)) continue; visited.add(s);
      if (/motorway|trunk|service|link/.test(s.road.type)) continue;
      const p = project(x, z, s.a, s.b);
      if (!best || p.distance < best.distance) best = { ...p, segment: s };
    }
    return best;
  }
  function frontage(building) {
    let points = building.points;
    if (!points?.length) return null;
    const x = points.reduce((sum, p) => sum + p[0], 0) / points.length, z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const street = nearestStreet(x, z);
    if (!street || street.distance > 85) return null;
    let face = null;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) continue;
      const p = project(street.x, street.z, a, b, 0.2, 0.8);
      if (!face || p.distance < face.distance) face = { ...p, a, b };
    }
    if (!face || face.distance < street.segment.width / 2 + 3 || face.distance > 60) return null;
    const kerbPoint = project(face.x, face.z, street.segment.a, street.segment.b);
    street.x = kerbPoint.x; street.z = kerbPoint.z;
    const distance = Math.hypot(face.x - street.x, face.z - street.z), nx = (face.x - street.x) / distance, nz = (face.z - street.z) / distance;
    const start = { x: street.x + nx * (street.segment.width / 2 + 0.3), z: street.z + nz * (street.segment.width / 2 + 0.3) };
    for (let d = 1; d < distance - street.segment.width / 2 - 1; d += 2) {
      for (const side of [-1.4, 0, 1.4]) {
        const px = start.x + nx * d + nz * side, pz = start.z + nz * d - nx * side;
        if (inRoad(px, pz) || inPark(px, pz) || inBuilding(px, pz, building)) return null;
      }
    }
    return { face, street, nx, nz, start, distance, x, z };
  }
  const shopping = (x, z) => (map.landmarks || []).some(l => /^(manuka|kingston|griffith|narrabundah)$/.test(l.id) && Math.hypot(x - l.x, z - l.z) < (l.radius || 120));
  const shopLabels = ['CAFE', 'GROCER', 'BAKERY', 'BOOKS'];
  const shopSigns = [];
  const candidates = (map.buildings || []).filter(b => !/shed|garage|carport|roof|industrial|school|education|community|diplomatic|defence/.test(b.type || '')).map((b, i) => ({ b, seed: i })).sort((a, b) => hash(a.seed + 19) - hash(b.seed + 19));
  for (const { b: building, seed } of candidates) {
    if (stats.frontages >= MAX_FRONTAGES) break;
    const f = frontage(building);
    if (!f) continue;
    if (String(building.id).startsWith('osm-') && nearby(buildingIndex, f.x, f.z).some(b => String(b.id).startsWith('act-') && inside(f.x, f.z, b.points))) continue;
    const isShop = shopping(f.x, f.z) && /commercial|retail|yes|apartments/.test(building.type || '');
    const yaw = Math.atan2(f.nx, f.nz), tangentX = f.nz, tangentZ = -f.nx;
    const roadEdge = f.street.segment.width / 2;
    const gardenDistance = Math.min(f.distance - 2, roadEdge + 6.5);
    const gx = f.street.x + f.nx * gardenDistance, gz = f.street.z + f.nz * gardenDistance;
    const floor = Math.max(...building.points.map(p => heightAt(...p))) + 0.12;
    // A narrow pavement connects a real kerb to a real building face.
    groundStrip([f.start.x, f.start.z], [f.face.x, f.face.z], isShop ? 1.8 : 2.8, seed % 3 ? PALETTE.concrete : 0xa39481);
    stats.driveways++;
    // Doors sit just outside the imported facade, with a light frame behind.
    const dx = f.face.x - f.nx * 0.08, dz = f.face.z - f.nz * 0.08;
    solid(box, dx, floor + 1.06, dz, 1.13, 2.16, 0.12, PALETTE.frame, yaw);
    solid(box, dx - f.nx * 0.08, floor + 1.02, dz - f.nz * 0.08, 0.88, 1.98, 0.13, [0x667465, 0x876651, 0x596f76][seed % 3], yaw);
    stats.doors++;
    if (isShop) {
      solid(box, dx - f.nx * 0.6, floor + 2.65, dz - f.nz * 0.6, 3.6, 0.18, 1.3, [0x8e654f, 0x617663, 0xb29d77][seed % 3], yaw);
      shopSigns.push({ x: dx - f.nx * 0.24, z: dz - f.nz * 0.24, y: floor + 3.1, yaw, label: seed % shopLabels.length });
      stats.verandahs++;
    } else if (seed % 4 === 0) {
      solid(box, dx - f.nx * 0.9, floor + 2.5, dz - f.nz * 0.9, 3.2, 0.18, 2, 0x998b75, yaw);
      for (const side of [-1, 1]) {
        const px = dx - f.nx * 1.6 + tangentX * side * 1.35, pz = dz - f.nz * 1.6 + tangentZ * side * 1.35;
        solid(box, px, floor + 1.2, pz, 0.1, 2.4, 0.1, PALETTE.frame);
      }
      stats.verandahs++;
    }
    if (!isShop && f.distance - roadEdge > 7) {
      for (const side of [-1, 1]) {
        const px = gx + tangentX * side * 4.1, pz = gz + tangentZ * side * 4.1;
        if (inPark(px, pz) || inRoad(px, pz, 2.5) || inBuilding(px, pz, building)) continue;
        if (seed % 3) {
          groundBox(px, pz, 4.6, 0.7 + hash(seed) * 0.35, 0.75, PALETTE.hedge, yaw); stats.hedges++;
        } else {
          groundBox(px, pz, 4.5, 0.55, 0.18, seed % 2 ? 0x9b8e73 : 0xa29279, yaw);
          for (const end of [-1, 1]) groundBox(px + tangentX * end * 2.2, pz + tangentZ * end * 2.2, 0.25, 0.8, 0.25, PALETTE.timber);
          stats.fences++;
        }
        if (seed % 5 === 0) {
          const bx = px + f.nx * 2.2, bz = pz + f.nz * 2.2;
          if (!inBuilding(bx, bz, building)) {
            groundBox(bx, bz, 2, 0.2, 0.7, 0x9a725a, yaw);
            for (let k = -1; k <= 1; k++) solid(bush, bx + tangentX * k * 0.6, heightAt(bx, bz) + 0.4, bz + tangentZ * k * 0.6, 0.3, 0.24, 0.3, [0x9d8b58, 0xb08b7e, 0x677d4e][k + 1]);
          }
        }
      }
      const mx = gx + tangentX * 2.1, mz = gz + tangentZ * 2.1;
      if (!inPark(mx, mz) && !inBuilding(mx, mz, building)) {
        groundBox(mx, mz, 0.11, 0.85, 0.11, PALETTE.timber);
        solid(box, mx, heightAt(mx, mz) + 0.9, mz, 0.42, 0.3, 0.28, [0x8d6654, 0x647362, 0x999c8d][seed % 3], yaw); stats.letterboxes++;
      }
    }
    stats.frontages++;
  }

  // Furniture uses widely spaced verges, with benches restricted to park/shop edges.
  const furnitureCells = new Set();
  const furnitureSegments = segments.filter(s => !/service|motorway|trunk|link/.test(s.road.type) && s.road.name).sort((a, b) => hash(Number(a.road.id) || a.a[0]) - hash(Number(b.road.id) || b.a[0]));
  for (let i = 0; i < furnitureSegments.length && stats.lamps < 750; i++) {
    const s = furnitureSegments[i], length = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    if (length < 12) continue;
    const nx = -(s.b[1] - s.a[1]) / length, nz = (s.b[0] - s.a[0]) / length;
    const x = (s.a[0] + s.b[0]) / 2 + nx * (s.width / 2 + 3), z = (s.a[1] + s.b[1]) / 2 + nz * (s.width / 2 + 3);
    const key = `${Math.floor(x / 70)},${Math.floor(z / 70)}`;
    if (furnitureCells.has(key) || inRoad(x, z, 1) || inBuilding(x, z)) continue;
    furnitureCells.add(key);
    const y = heightAt(x, z), yaw = Math.atan2(nx, nz);
    solid(box, x, y + 2.6, z, 0.09, 5.2, 0.09, PALETTE.pole);
    solid(box, x - nx * 0.4, y + 5.2, z - nz * 0.4, 0.09, 0.1, 0.9, PALETTE.pole, yaw);
    solid(box, x - nx * 0.8, y + 5.15, z - nz * 0.8, 0.3, 0.12, 0.55, 0xb8bdaf, yaw); stats.lamps++;
    if (i % 4 === 0) { groundBox(x + nx, z + nz, 0.5, 0.8, 0.5, 0x627159); stats.bins++; }
    if (i % 5 === 0 && (inPark(x + nx * 2, z + nz * 2) || shopping(x, z))) {
      const bx = x + nx * 2, bz = z + nz * 2, by = heightAt(bx, bz);
      solid(box, bx, by + 0.5, bz, 1.9, 0.12, 0.5, PALETTE.timber, yaw);
      solid(box, bx + nx * 0.23, by + 0.85, bz + nz * 0.23, 1.9, 0.55, 0.08, PALETTE.timber, yaw);
      for (const side of [-1, 1]) groundBox(bx + nz * side * 0.7, bz - nx * side * 0.7, 0.12, 0.5, 0.4, PALETTE.pole, yaw);
      stats.benches++;
    }
    if (i % 37 === 0 && /secondary|tertiary/.test(s.road.type)) {
      const bx = x + nz * 2, bz = z - nx * 2;
      if (!inRoad(bx, bz, 1) && !inBuilding(bx, bz)) {
        groundBox(bx, bz, 0.06, 2.6, 0.06, PALETTE.pole);
        solid(box, bx, heightAt(bx, bz) + 2.3, bz, 0.42, 0.55, 0.08, 0x477589, yaw); stats.stopPoles++;
      }
    }
  }
  if (shopSigns.length && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d0c6ab'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#33483d';
    ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    shopLabels.forEach((text, i) => ctx.fillText(text, 256, i * 64 + 32));
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const signs = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }); materials.push(signs);
    for (const p of shopSigns) {
      const batch = batchAt(p.x, p.z, 'sign'), tx = Math.cos(p.yaw) * 1.5, tz = -Math.sin(p.yaw) * 1.5;
      const a = [p.x - tx, p.y - 0.25, p.z - tz], b = [p.x + tx, p.y - 0.25, p.z + tz], c = [b[0], p.y + 0.25, b[2]], d = [a[0], p.y + 0.25, a[2]];
      triangle(batch, a, b, c, 0xffffff); triangle(batch, a, c, d, 0xffffff);
      const v1 = 1 - p.label / 4, v0 = v1 - 0.25;
      batch.uvs.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1); stats.shopSigns++;
    }
  }
  for (const chunk of chunks.values()) {
    for (const [kind, batch] of chunk.batches) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      if (kind === 'sign') geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
      else geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, kind === 'sign' ? materials.at(-1) : material);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); chunk.group.add(mesh); stats.meshes++;
    }
    chunk.batches.clear();
  }
  for (const source of geometrySources) source.dispose();
  stats.chunks = chunks.size;
  Object.freeze(stats);
  function update(player) {
    const x = player.x ?? player.position?.x ?? 0, z = player.z ?? player.position?.z ?? 0;
    for (const chunk of chunks.values()) chunk.group.visible = Math.abs(chunk.x - x) < 650 + CHUNK / 2 && Math.abs(chunk.z - z) < 650 + CHUNK / 2;
  }
  let disposed = false;
  function dispose() {
    if (disposed) return; disposed = true;
    root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
    root.removeFromParent(); chunks.clear();
  }
  update(map.spawn || { x: 0, z: 0 });
  return { update, stats, dispose };
}
