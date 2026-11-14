import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { roadProfile } from './road-network.js';
import { retailDistrict } from './districts.js';
import { suburbCharacter, rearGarden } from './suburb-character.js';

// Original procedural streetscape details, anchored to the supplied footprints.
const CHUNK = 350;
const CELL = 100;
const MAX_FRONTAGES = 4200;
const PALETTE = { concrete: 0xaaa899, timber: 0x8a8068, hedge: 0x536d42, frame: 0xc9c6ac, pole: 0x747c75 };

export function createNeighbourhoodDetails(scene, map, heightAt) {
  const root = new THREE.Group();
  root.name = 'Neighbourhood details';
  scene.add(root);
  const chunks = new Map(), roadIndex = new Map(), buildingIndex = new Map(), parkIndex = new Map();
  const materials = [], textures = [], entries = [];
  const managedShops = new Set(map.shoppingManagedBuildingIds || []);
  const managedCampus = new Set(map.campusBuildingIds || []);
  const gardenIndex = new Map();
  const BACKYARD_TRIANGLE_LIMIT = 60000;
  const stats = { backyards: 0, backyardTriangles: 0, gardenBeds: 0, gardenSeats: 0, sheds: 0, apartmentEntries: 0, frontages: 0, driveways: 0, hedges: 0, fences: 0, letterboxes: 0, doors: 0, verandahs: 0, lamps: 0, benches: 0, bins: 0, stopPoles: 0, shopSigns: 0, retailAprons: 0, apronTriangles: 0, pavedArea: 0, chunks: 0, meshes: 0, triangles: 0 };
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
    if (kind === 'garden' && !chunk.detail) {
      chunk.detail = new THREE.Group(); chunk.detail.name = 'Nearby gardens'; chunk.group.add(chunk.detail);
    }
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
  function solid(source, x, y, z, sx, sy, sz, tint, yaw = 0, kind = 'solid') {
    const batch = batchAt(x, z, kind);
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
      const profile = roadProfile(road);
      const item = { a, b, road, width: profile.driveWidth, profile };
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
  // Broad paved forecourts are a district treatment for mapped commercial
  // footprints, not a claim about a particular shop or its surveyed paving.
  function overlapsOutline(quad, samples, index) {
    const outlines = new Set(samples.flatMap(p => nearby(index, ...p)));
    const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (const outline of outlines) {
      if (outline.points.some(p => inside(...p, quad))) return true;
      for (let i = 0; i < quad.length; i++) for (let j = 0; j < outline.points.length; j++) {
        const a = quad[i], b = quad[(i + 1) % quad.length];
        const c = outline.points[j], d = outline.points[(j + 1) % outline.points.length];
        if (turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0) return true;
      }
    }
    return false;
  }
  const retailCentres = (map.landmarks || []).filter(l => /^(manuka|kingston)$/.test(l.id));
  const APRON_LIMIT = 18000;
  const apronColors = [0x9b7965, 0xa17e68, 0x95745f, 0xa48370];
  const retailBuildings = (map.buildings || []).filter(b => !managedShops.has(b.id) && /^(commercial|retail)$/.test(b.type || '') && b.points?.length);
  const centreDistance = building => {
    const x = building.points.reduce((sum, p) => sum + p[0], 0) / building.points.length;
    const z = building.points.reduce((sum, p) => sum + p[1], 0) / building.points.length;
    return Math.min(...retailCentres.map(l => Math.hypot(x - l.x, z - l.z)));
  };
  retailBuildings.sort((a, b) => centreDistance(a) - centreDistance(b));
  for (const building of retailBuildings) {
    const points = building.points;
    const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const cz = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    if (!retailDistrict(map, cx, cz, { aprons: true })) continue;
    if (String(building.id).startsWith('osm-') && nearby(buildingIndex, cx, cz).some(b => String(b.id).startsWith('act-') && inside(cx, cz, b.points))) continue;
    let added = false;
    for (let edge = 0; edge < points.length && stats.apronTriangles < APRON_LIMIT; edge++) {
      const a = points[edge], b = points[(edge + 1) % points.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 3 || length > 90) continue;
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      const street = nearestStreet(mx, mz);
      if (!street || street.distance < street.segment.width / 2 + 1.7 || street.distance > 26) continue;
      let nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
      if (nx * (street.x - mx) + nz * (street.z - mz) < 0) { nx = -nx; nz = -nz; }
      if (inside(mx + nx * 0.2, mz + nz * 0.2, points)) continue;
      if ((nx * (street.x - mx) + nz * (street.z - mz)) / street.distance < 0.8) continue;
      const clear = (x, z) => !inRoad(x, z, 0.35) && !inPark(x, z) && !inBuilding(x, z) &&
        (!map.bounds || (x >= map.bounds.minX && x <= map.bounds.maxX && z >= map.bounds.minZ && z <= map.bounds.maxZ));
      const columns = Math.ceil(length / 1.6);
      for (let column = 0; column < columns && stats.apronTriangles < APRON_LIMIT; column++) {
        const u0 = column / columns, u1 = (column + 1) / columns;
        const endpoints = [u0, u1].map(u => {
          const x = THREE.MathUtils.lerp(a[0], b[0], u), z = THREE.MathUtils.lerp(a[1], b[1], u);
          const kerb = project(x, z, street.segment.a, street.segment.b);
          const d = kerb.distance;
          if (d < street.segment.width / 2 + 1.7 || d > 26) return null;
          // Meet the outer portion of the shared profile sidewalk.
          const stop = street.segment.width / 2 + (street.segment.profile.hasKerb ? 0.18 : 0) + street.segment.profile.pavementWidth * 0.8;
          const endX = kerb.x + (x - kerb.x) / d * stop;
          const endZ = kerb.z + (z - kerb.z) / d * stop;
          if (Math.hypot(endX - x, endZ - z) > 20) return null;
          return { x: x + nx * 0.08, z: z + nz * 0.08, endX, endZ };
        });
        if (endpoints.some(p => !p)) continue;
        const [left, right] = endpoints;
        const rows = Math.ceil(Math.max(Math.hypot(left.endX - left.x, left.endZ - left.z), Math.hypot(right.endX - right.x, right.endZ - right.z)) / 1.0);
        for (let row = 0; row < rows && stats.apronTriangles < APRON_LIMIT; row++) {
          const point = (p, t) => [THREE.MathUtils.lerp(p.x, p.endX, t), THREE.MathUtils.lerp(p.z, p.endZ, t)];
          const q = [point(left, row / rows), point(right, row / rows), point(right, (row + 1) / rows), point(left, (row + 1) / rows)];
          const samples = [...q, ...q.map((p, i) => [(p[0] + q[(i + 1) % 4][0]) / 2, (p[1] + q[(i + 1) % 4][1]) / 2]),
            [q.reduce((sum, p) => sum + p[0], 0) / 4, q.reduce((sum, p) => sum + p[1], 0) / 4]];
          if (samples.some(p => !clear(...p)) || overlapsOutline(q, samples, buildingIndex) || overlapsOutline(q, samples, parkIndex)) continue;
          const vertices = q.map(p => [p[0], heightAt(...p) + 0.14, p[1]]);
          const tint = apronColors[(column + row * 3 + edge) % apronColors.length];
          const batch = batchAt(q[0][0], q[0][1], 'retail-apron');
          // Keep both terrain-draped triangles front-facing on either winding.
          for (const ids of [[0, 1, 2], [0, 2, 3]]) {
            const [p, r, t] = ids.map(i => vertices[i]);
            const up = (r[2] - p[2]) * (t[0] - p[0]) - (r[0] - p[0]) * (t[2] - p[2]);
            triangle(batch, p, up > 0 ? r : t, up > 0 ? t : r, tint);
            stats.apronTriangles++;
            stats.pavedArea += Math.abs(up) / 2;
          }
          added = true;
        }
      }
    }
    if (added) stats.retailAprons++;
  }
  const shopping = (x, z) => Boolean(retailDistrict(map, x, z));
  const shopLabels = ['CAFE', 'GROCER', 'BAKERY', 'BOOKS'];
  const shopSigns = [];
  const candidates = (map.buildings || []).filter(b => !managedShops.has(b.id) && !managedCampus.has(b.id) && !/shed|garage|carport|roof|industrial|school|education|community|diplomatic|defence/.test(b.type || '')).map((b, i) => ({ b, seed: i })).sort((a, b) => hash(a.seed + 19) - hash(b.seed + 19));
  for (const { b: building, seed } of candidates) {
    if (stats.frontages >= MAX_FRONTAGES) break;
    const f = frontage(building);
    if (!f) continue;
    if (String(building.id).startsWith('osm-') && nearby(buildingIndex, f.x, f.z).some(b => String(b.id).startsWith('act-') && inside(f.x, f.z, b.points))) continue;
    const isShop = shopping(f.x, f.z) && /commercial|retail|yes|apartments/.test(building.type || '');
    const character = suburbCharacter(map, f.x, f.z);
    const apartment = /apartments/.test(building.type || '');
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
    entries.push(Object.freeze({ id: building.id, buildingId: building.id, x: dx - f.nx * 0.08, z: dz - f.nz * 0.08, nx: f.nx, nz: f.nz, width: 0.88 }));
    if (apartment && !isShop) {
      solid(box, dx - f.nx * 0.65, floor + 2.7, dz - f.nz * 0.65, 2.5, 0.16, 1.4, 0x72776f, yaw);
      stats.apartmentEntries++;
    }
    if (isShop) {
      solid(box, dx - f.nx * 0.6, floor + 2.65, dz - f.nz * 0.6, 3.6, 0.18, 1.3, 0x414b48, yaw);
      shopSigns.push({ x: dx - f.nx * 0.24, z: dz - f.nz * 0.24, y: floor + 3.1, yaw, label: seed % shopLabels.length });
      if (seed % 2 === 0) {
        const px = dx - f.nx * 2 + tangentX * 2.1, pz = dz - f.nz * 2 + tangentZ * 2.1;
        if (!inRoad(px, pz, 2.3) && !inBuilding(px, pz)) {
          groundBox(px, pz, 0.8, 0.65, 0.8, 0x797c6f);
          solid(bush, px, heightAt(px, pz) + 0.95, pz, 0.65, 0.5, 0.65, 0x59754c);
        }
      }
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
          groundBox(px, pz, 4.6, character.id === 'redhill' ? 1.3 : 0.85 + hash(seed) * 0.25, 0.95, PALETTE.hedge, yaw); stats.hedges++;
        } else {
          groundBox(px, pz, 4.5, character.fenceHeight, 0.2, seed % 2 ? 0xc7c1ab : 0xa29279, yaw);
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
    if (!isShop && !apartment && /^(house|residential|detached|yes)$/.test(building.type || '') && stats.backyards < 650 && stats.backyardTriangles < BACKYARD_TRIANGLE_LIMIT - 140) {
      const clear = (x, z) => !inRoad(x, z, 2.5) && !inPark(x, z) && !inBuilding(x, z) &&
        !nearby(gardenIndex, x, z).some(a => inside(x, z, a.points)) &&
        !(map.landmarkTreeExclusions || []).some(points => inside(x, z, points)) &&
        (!map.bounds || (x > map.bounds.minX && x < map.bounds.maxX && z > map.bounds.minZ && z < map.bounds.maxZ));
      const garden = rearGarden(building, f, character, clear);
      if (garden && !overlapsOutline(garden.corners, garden.corners, buildingIndex) && !overlapsOutline(garden.corners, garden.corners, parkIndex)) {
        const before = stats.triangles;
        const gardenBox = (u, v, sx, sy, sz, tint, lift = 0) => {
          const [x, z] = garden.point(u, v);
          solid(box, x, heightAt(x, z) + lift + sy / 2, z, sx, sy, sz, tint, yaw, 'garden');
        };
        // Three low rear/side spans leave the house side and its return route open.
        gardenBox(0, garden.depth, garden.width, character.fenceHeight, 0.16, PALETTE.timber);
        for (const side of [-1, 1]) gardenBox(side * garden.width / 2, garden.depth / 2, 0.16, character.fenceHeight, garden.depth, PALETTE.timber);
        gardenBox(-garden.width * 0.25, garden.depth - 1, garden.width * 0.4, 0.25, 0.8, 0x92775d); stats.gardenBeds++;
        gardenBox(garden.width * 0.2, 1.5, 1.6, 0.48, 0.5, PALETTE.timber);
        gardenBox(garden.width * 0.2, 1.7, 1.6, 0.8, 0.1, PALETTE.timber); stats.gardenSeats++;
        if (seed % 4 === 0 && garden.width > 7) {
          gardenBox(garden.width * 0.3, garden.depth - 1.2, 1.3, 1.7, 1.3, 0x8b9182);
          gardenBox(garden.width * 0.3, garden.depth - 1.2, 1.5, 0.12, 1.5, 0x646e65, 1.7); stats.sheds++;
        }
        indexItem(gardenIndex, { points: garden.corners }, garden.corners, 1);
        stats.backyards++; stats.backyardTriangles += stats.triangles - before;
      }
    }
    stats.frontages++;
  }

  // Public reference observations place a fenced setback and parking apron
  // in front of the heritage school. This is bounded by its real frontage.
  const school = (map.landmarks || []).find(l => l.id === 'telopea');
  const campus = school && (map.buildings || []).filter(b => /education|school/.test(b.type || '') && b.points?.length && Math.hypot(b.points[0][0] - school.x, b.points[0][1] - school.z) < 220).sort((a, b) => b.points.length - a.points.length)[0];
  const schoolFront = campus && !managedCampus.has(campus.id) && frontage(campus);
  if (schoolFront) {
    const f = schoolFront, tx = f.nz, tz = -f.nx, setback = f.street.segment.width / 2 + 5.5;
    const cx = f.street.x + f.nx * setback, cz = f.street.z + f.nz * setback, yaw = Math.atan2(f.nx, f.nz);
    for (let u = -17; u <= 17; u += 0.6) {
      if (Math.abs(u) < 2) continue;
      const x = cx + tx * u, z = cz + tz * u;
      if (inRoad(x, z, 2) || inBuilding(x, z) || inPark(x, z)) continue;
      groundBox(x, z, 0.045, 1.15, 0.045, 0x363d36);
      solid(box, x, heightAt(x, z) + 0.3, z, 0.64, 0.04, 0.04, 0x363d36, yaw);
      solid(box, x, heightAt(x, z) + 0.9, z, 0.64, 0.04, 0.04, 0x363d36, yaw);
    }
    if (f.distance - setback > 10) {
      const depth = Math.min(13, f.distance - setback - 3);
      for (let u = -10; u <= 10; u += 2) {
        const ax = cx + tx * u + f.nx * 1.8, az = cz + tz * u + f.nz * 1.8;
        const bx = ax + f.nx * depth, bz = az + f.nz * depth;
        if (!inBuilding(ax, az) && !inBuilding(bx, bz) && !inPark(ax, az) && !inPark(bx, bz)) groundStrip([ax, az], [bx, bz], 2.02, 0x848983);
      }
    }
  }

  // Furniture uses widely spaced verges, with benches restricted to park/shop edges.
  const furnitureCells = new Set();
  const furnitureSegments = segments.filter(s => !/service|motorway|trunk|link/.test(s.road.type) && s.profile.hasKerb && s.profile.trafficAllowed && s.road.name).sort((a, b) => hash(Number(a.road.id) || a.a[0]) - hash(Number(b.road.id) || b.a[0]));
  for (let i = 0; i < furnitureSegments.length && stats.lamps < 500; i++) {
    const s = furnitureSegments[i], length = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    if (length < 12) continue;
    const nx = -(s.b[1] - s.a[1]) / length, nz = (s.b[0] - s.a[0]) / length;
    const x = (s.a[0] + s.b[0]) / 2 + nx * (s.width / 2 + s.profile.pavementWidth + 1.5), z = (s.a[1] + s.b[1]) / 2 + nz * (s.width / 2 + s.profile.pavementWidth + 1.5);
    const key = `${Math.floor(x / 100)},${Math.floor(z / 100)}`;
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
      mesh.name = `Neighbourhood ${kind}`;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); (kind === 'garden' ? chunk.detail : chunk.group).add(mesh); stats.meshes++;
    }
    chunk.batches.clear();
  }
  for (const source of geometrySources) source.dispose();
  stats.chunks = chunks.size;
  Object.freeze(stats);
  function update(player) {
    const x = player.x ?? player.position?.x ?? 0, z = player.z ?? player.position?.z ?? 0;
    for (const chunk of chunks.values()) {
      chunk.group.visible = Math.abs(chunk.x - x) < 650 + CHUNK / 2 && Math.abs(chunk.z - z) < 650 + CHUNK / 2;
      if (chunk.detail) chunk.detail.visible = Math.abs(chunk.x - x) < 260 + CHUNK / 2 && Math.abs(chunk.z - z) < 260 + CHUNK / 2;
    }
  }
  let disposed = false;
  function dispose() {
    if (disposed) return; disposed = true;
    root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
    root.removeFromParent(); chunks.clear();
  }
  update(map.spawn || { x: 0, z: 0 });
  return { update, stats, entries: Object.freeze(entries), dispose };
}
