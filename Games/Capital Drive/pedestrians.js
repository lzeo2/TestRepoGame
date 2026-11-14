import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const POPULATION = 36;
const MAX_POPULATION = 64;
const SEATED_CAP = 6;
const WORKER_CAP = 6;
const PERSON_RADIUS = 0.32;
const PEOPLE_CELL = 8;
const VIEW_DISTANCE = 180;
const DETAIL_COUNT = 20;
const PAVEMENT_LIFT = 0.05;
const CELL = 32;
const SHIRTS = [0x425d79, 0xa44d3c, 0xd5ba76, 0x789477, 0xddd6c3, 0x655574, 0x393d48];
const TROUSERS = [0x343d4a, 0x656452, 0x293548, 0x807566];
const SKIN = [0xe0b490, 0xad7958, 0x79513c, 0xc99673, 0x593e32];
const HAIR = [0x302923, 0x655040, 0xa38c67, 0xaaa6a0];

function indexBoxes(items) {
  const cells = new Map();
  for (const item of items) {
    for (let x = Math.floor(item.minX / CELL); x <= Math.floor(item.maxX / CELL); x++) {
      for (let z = Math.floor(item.minZ / CELL); z <= Math.floor(item.maxZ / CELL); z++) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(item);
      }
    }
  }
  return (x, z) => cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) || [];
}

function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

function inFootprint(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (segmentDistance(x, z, a, b) < 0.3) return true;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Split at junctions, obstructions and sharp bends rather than walking across them.
function sidewalkPaths(map) {
  const roadSegments = [];
  for (const road of map.roads || []) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], clearance = road.width / 2 + 0.55;
      roadSegments.push({ a, b, clearance, minX: Math.min(a[0], b[0]) - clearance,
        maxX: Math.max(a[0], b[0]) + clearance, minZ: Math.min(a[1], b[1]) - clearance,
        maxZ: Math.max(a[1], b[1]) + clearance });
    }
  }
  const roadsAt = indexBoxes(roadSegments);
  const buildingsAt = indexBoxes((map.buildings || []).map(building => ({ points: building.points,
    minX: Math.min(...building.points.map(p => p[0])) - 0.3,
    maxX: Math.max(...building.points.map(p => p[0])) + 0.3,
    minZ: Math.min(...building.points.map(p => p[1])) - 0.3,
    maxZ: Math.max(...building.points.map(p => p[1])) + 0.3 })));
  const waterAt = indexBoxes((map.areas || []).filter(area => area.type === 'water').map(area => ({ points: area.points,
    minX: Math.min(...area.points.map(p => p[0])) - 1, maxX: Math.max(...area.points.map(p => p[0])) + 1,
    minZ: Math.min(...area.points.map(p => p[1])) - 1, maxZ: Math.max(...area.points.map(p => p[1])) + 1 })));
  const { minX, maxX, minZ, maxZ } = map.bounds;
  function safe(x, z) {
    return x > minX + 1 && x < maxX - 1 && z > minZ + 1 && z < maxZ - 1 &&
      !waterAt(x, z).some(area => inFootprint(x, z, area.points)) &&
      !roadsAt(x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.clearance) &&
      !buildingsAt(x, z).some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && inFootprint(x, z, b.points));
  }
  const paths = [];
  for (const road of map.roads || []) {
    if (!road.name || !['residential', 'tertiary', 'living_street', 'unclassified'].includes(road.type) ||
      road.sourceTags?.foot === 'no' || road.sourceTags?.access === 'private') continue;
    for (const side of [-1, 1]) {
      let points = [], lengths = [0];
      function finish() {
        const length = lengths[lengths.length - 1];
        if (length >= 12) paths.push({ roadId: road.id, name: road.name, offset: road.width / 2 + 1.2,
          side, points, lengths, length });
        points = []; lengths = [0];
      }
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1], b = road.points[i];
        const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
        if (length < 0.01) continue;
        const nx = -dz / length * side, nz = dx / length * side, offset = road.width / 2 + 1.2;
        // Each straight offset segment stays on the actual pavement. At gentle
        // joins connect only when the entire short connector is still safe.
        const steps = Math.max(1, Math.ceil(length / 2));
        for (let j = 0; j <= steps; j++) {
          const t = j / steps, x = a[0] + dx * t + nx * offset, z = a[1] + dz * t + nz * offset;
          const last = points[points.length - 1];
          const gap = last ? Math.hypot(x - last.x, z - last.z) : 0;
          if (!safe(x, z) || !safe(x + nx * 0.45, z + nz * 0.45)) { finish(); continue; }
          if (last && (gap > 3 || !safe((x + last.x) / 2, (z + last.z) / 2))) finish();
          if (points.length) lengths.push(lengths[lengths.length - 1] + Math.hypot(x - points[points.length - 1].x, z - points[points.length - 1].z));
          points.push({ x, z, nx, nz });
        }
      }
      finish();
    }
  }
  return { paths, safe };
}

function pointAlong(path, distance) {
  let lo = 0, hi = path.points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (path.lengths[mid] <= distance) lo = mid; else hi = mid;
  }
  const a = path.points[lo], b = path.points[hi];
  const t = (distance - path.lengths[lo]) / (path.lengths[hi] - path.lengths[lo] || 1);
  const nx = a.nx + (b.nx - a.nx) * t, nz = a.nz + (b.nz - a.nz) * t;
  const n = Math.hypot(nx, nz) || 1;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    nx: nx / n, nz: nz / n, yaw: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
}

export function createPedestrians(scene, map, heightAt, { entrances = [] } = {}) {
  const { paths, safe } = sidewalkPaths(map);
  const doors = [...(map.entrances || []), ...(map.doors || []), ...entrances].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
  function safeSite(path, distance) {
    if (distance < 3 || distance > path.length - 3) return false;
    const p = pointAlong(path, distance);
    if (doors.some(door => Math.hypot(p.x - door.x, p.z - door.z) < 3)) return false;
    // The chair/body occupy a 0.4m-radius footprint. Sample a slightly larger
    // circle: an axis-aligned square rejects diagonal pavements unnecessarily.
    if (!safe(p.x, p.z)) return false;
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      if (!safe(p.x + Math.cos(angle) * 0.45, p.z + Math.sin(angle) * 0.45)) return false;
    }
    return true;
  }
  const pathCells = new Map();
  for (const path of paths) {
    const center = pointAlong(path, path.length / 2);
    path.center = center;
    const key = `${Math.floor(center.x / CELL)},${Math.floor(center.z / CELL)}`;
    if (!pathCells.has(key)) pathCells.set(key, []);
    pathCells.get(key).push(path);
  }
  function nearbyPaths(target, maximum) {
    const found = [];
    for (let x = Math.floor((target.x - maximum) / CELL); x <= Math.floor((target.x + maximum) / CELL); x++) {
      for (let z = Math.floor((target.z - maximum) / CELL); z <= Math.floor((target.z + maximum) / CELL); z++) {
        found.push(...(pathCells.get(`${x},${z}`) || []));
      }
    }
    return found;
  }
  let seed = 0x4ca7b23, disposed = false;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const group = new THREE.Group();
  group.name = 'Capital Drive sidewalk pedestrians';
  scene.add(group);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const capsule = new THREE.CapsuleGeometry(1, 1, 2, 5);
  const sphere = new THREE.SphereGeometry(1, 6, 4);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cup = new THREE.CylinderGeometry(1, 0.8, 1, 7);
  const batches = {};
  for (const [name, geometry, capacity] of [['torso', capsule, MAX_POPULATION], ['head', sphere, MAX_POPULATION],
    ['hair', sphere, MAX_POPULATION], ['arms', capsule, MAX_POPULATION * 2], ['legs', capsule, MAX_POPULATION * 2],
    ['shoes', box, MAX_POPULATION * 2], ['hands', sphere, DETAIL_COUNT * 2], ['bags', box, DETAIL_COUNT], ['chairs', box, SEATED_CAP * 6],
    ['cups', cup, SEATED_CAP * 2], ['tools', box, MAX_POPULATION]]) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.name = `Pedestrian ${name}`;
    group.add(mesh); batches[name] = mesh;
  }
  const stats = { count: paths.length ? POPULATION : 0, visible: 0, detailed: 0, paths: paths.length,
    drawCalls: 0, triangles: 0, recycled: 0, capacity: MAX_POPULATION, collisionCandidates: 0, collisionQueries: 0, localPathCandidates: 0, seated: 0, working: 0, routineSites: 0,
    seatedCapacity: SEATED_CAP, workerCapacity: WORKER_CAP };
  const spawn = map.spawn || { x: 0, z: 0, yaw: 0 };
  const anchors = (map.landmarks || []).filter(p => ['manuka', 'kingston', 'telopea'].includes(p.id));
  const civic = (map.landmarks || []).find(p => p.id === 'canberra-centre');
  const populationAt = target => paths.length ? (civic && Math.hypot(target.x - civic.x, target.z - civic.z) < 650 ? MAX_POPULATION : POPULATION) : 0;
  const pool = [], residents = [], events = [];
  const peopleCells = new Map();
  function rebuildPeopleGrid() {
    peopleCells.clear();
    for (const p of pool) {
      const key = `${Math.floor(p.x / PEOPLE_CELL)},${Math.floor(p.z / PEOPLE_CELL)}`;
      if (!peopleCells.has(key)) peopleCells.set(key, []);
      peopleCells.get(key).push(p);
    }
  }
  function peopleIn(minX, maxX, minZ, maxZ) {
    const found = [];
    for (let x = Math.floor(minX / PEOPLE_CELL); x <= Math.floor(maxX / PEOPLE_CELL); x++) {
      for (let z = Math.floor(minZ / PEOPLE_CELL); z <= Math.floor(maxZ / PEOPLE_CELL); z++) {
        found.push(...(peopleCells.get(`${x},${z}`) || []));
      }
    }
    return found;
  }
  const emit = event => { if (events.length < 160) events.push(Object.freeze(event)); };
  function choosePath(target, minimum = 0, maximum = 300) {
    const candidates = [];
    const local = nearbyPaths(target, maximum);
    stats.localPathCandidates = local.length;
    for (const path of local) {
      const p = path.center, distance = Math.hypot(p.x - target.x, p.z - target.z);
      if (distance >= minimum && distance < maximum) candidates.push(path);
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(random() * candidates.length)];
  }
  function place(person, path, distance = random() * path.length) {
    person.direction = person.initialDirection;
    person.path = path; person.distance = distance; person.escape = 0; person.stopped = false; person.yieldTimer = 0;
    person.health = 100; person.reaction = 'calm'; person.fear = 0; person.anger = 0;
    person.angerOffender = null;
    person.reactionTimer = 0; person.stun = 0; person.knockdown = 0;
    person.recklessExposure = 0; person.drivingReportCooldown = 0;
    person.hitCooldown = 0; person.witnessCooldown = 0; person.retaliationCooldown = 0;
    Object.assign(person, pointAlong(path, distance));
    person.y = heightAt(person.x, person.z) + PAVEMENT_LIFT;
    person.site = safeSite(path, distance) && person.ambient !== 'walk' ? { ...pointAlong(path, distance), distance, yaw: person.yaw + (person.direction < 0 ? Math.PI : 0) } : null;
    person.routine = person.site ? person.ambient : 'walk';
    person.stopped = Boolean(person.site);
    person.routineClock = 7 + (person.id * 7) % 11;
    person.returning = false;
  }
  for (let i = 0; i < (paths.length ? MAX_POPULATION : 0); i++) {
    residents.push({ id: i, direction: random() < 0.5 ? -1 : 1, speed: 0.85 + random() * 0.6,
      phase: random() * Math.PI * 2, height: 0.92 + random() * 0.2,
      personality: i % 5 === 0 ? 'assertive' : i % 3 === 0 ? 'wary' : 'reserved',
      ambient: i % 12 === 0 ? 'coffee' : i % 12 === 1 ? 'work' : i % 12 === 2 ? 'phone' : i % 12 === 3 ? 'wait' : 'walk',
      shirt: SHIRTS[Math.floor(random() * SHIRTS.length)], trousers: TROUSERS[Math.floor(random() * TROUSERS.length)],
      skin: SKIN[Math.floor(random() * SKIN.length)], hair: HAIR[Math.floor(random() * HAIR.length)], bag: random() < 0.45 });
  }
  for (const p of residents) p.initialDirection = p.direction;
  function resetPopulation(player) {
    if (disposed) return;
    pool.length = 0;
    pool.push(...residents.slice(0, populationAt(player)));
    stats.count = pool.length;
    // Explicit teleports need a fresh local street population immediately.
    // Position-derived seed makes repeating the same arrival reproducible.
    seed = (0x4ca7b23 ^ Math.imul(Math.round(player.x * 10), 73856093) ^ Math.imul(Math.round(player.z * 10), 19349663)) >>> 0;
    const fx = -Math.sin(player.yaw || 0), fz = -Math.cos(player.yaw || 0);
    const slots = [], ahead = [], occupied = [];
    for (const path of nearbyPaths(player, 400)) {
      for (let j = 0; j < path.points.length; j += 2) {
        const p = path.points[j], dx = p.x - player.x, dz = p.z - player.z;
        const gap = Math.hypot(dx, dz);
        if (gap < 9 || gap > 175) continue;
        const forward = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
        const slot = { path, distance: path.lengths[j], x: p.x, z: p.z, forward, lateral };
        slots.push(slot);
        if (forward >= 10 && forward <= 58 && lateral < forward * 0.5 + 3) ahead.push(slot);
      }
    }
    function separated(slot) { return occupied.every(p => Math.hypot(p.x - slot.x, p.z - slot.z) > 6); }
    const routineSlots = slots.filter(slot => safeSite(slot.path, slot.distance));
    for (let i = 0; i < pool.length; i++) {
      let slot;
      if (pool[i].ambient !== 'walk' && routineSlots.length) {
        const preferred = routineSlots.filter(candidate => separated(candidate));
        if (i < 2) preferred.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
        if (preferred.length) slot = preferred[Math.floor(random() * (i < 2 ? Math.min(5, preferred.length) : preferred.length))];
      }
      if (!slot && i < 8 && ahead.length) {
        const desired = 16 + (i % 4) * 10;
        ahead.sort((a, b) => Math.abs(a.forward - desired) + a.lateral * 0.25 - Math.abs(b.forward - desired) - b.lateral * 0.25);
        slot = ahead.find(separated);
      }
      if (!slot && i < Math.ceil(pool.length * 0.85) && slots.length) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const candidate = slots[Math.floor(random() * slots.length)];
          if (separated(candidate)) { slot = candidate; break; }
        }
      }
      const target = i < Math.ceil(pool.length * 0.85) || !anchors.length ? player : anchors[i % anchors.length];
      const path = slot?.path || choosePath(target, 0, 250) || choosePath(target, 0, 1000) || paths[i % paths.length];
      let distance = slot?.distance ?? random() * path.length;
      if (!slot) {
        for (let attempt = 0; attempt < 80; attempt++) {
          const candidate = pointAlong(path, distance);
          if (occupied.every(p => Math.hypot(candidate.x - p.x, candidate.z - p.z) > 2)) break;
          distance = random() * path.length;
        }
      }
      place(pool[i], path, distance);
      pool[i].phase = random() * Math.PI * 2;
      occupied.push(pool[i]);
    }
    recycleTimer = 0; events.length = 0;
    rebuildPeopleGrid(); render(player);
  }
  const transform = new THREE.Object3D(), color = new THREE.Color(), rootRotation = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0), limbRotation = new THREE.Quaternion(), limbAxis = new THREE.Vector3(1, 0, 0);
  function part(name, person, x, y, z, sx, sy, sz, tint, swing = 0) {
    const mesh = batches[name], index = mesh.count++;
    transform.position.set(x, y, z).applyQuaternion(rootRotation).multiplyScalar(person.height);
    if (person.knockdown > 0) {
      transform.position.z += transform.position.y * 0.65;
      transform.position.y *= 0.22;
    } else if (person.stun > 0) transform.position.y *= 0.82;
    transform.position.x += person.x; transform.position.y += person.y; transform.position.z += person.z;
    limbRotation.setFromAxisAngle(limbAxis, swing);
    transform.quaternion.copy(rootRotation).multiply(limbRotation);
    transform.scale.set(sx * person.height, sy * person.height, sz * person.height);
    transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix); mesh.setColorAt(index, color.setHex(tint));
  }
  function render(player) {
    for (const mesh of Object.values(batches)) mesh.count = 0;
    const visible = pool.filter(p => Math.hypot(p.x - player.x, p.z - player.z) < VIEW_DISTANCE)
      .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
    stats.seated = 0; stats.working = 0;
    stats.routineSites = pool.filter(p => p.site).length;
    for (const p of pool) {
      if (p.ambient !== 'coffee' || !p.site || Math.hypot(p.site.x - player.x, p.site.z - player.z) >= VIEW_DISTANCE) continue;
      const sitePerson = { ...p, ...p.site, y: heightAt(p.site.x, p.site.z) + PAVEMENT_LIFT, height: 1, knockdown: 0, stun: 0 };
      rootRotation.setFromAxisAngle(axis, sitePerson.yaw);
      part('chairs', sitePerson, 0, 0.47, 0, 0.56, 0.09, 0.52, 0x75624b);
      part('chairs', sitePerson, 0, 0.78, 0.24, 0.56, 0.55, 0.07, 0x75624b);
      for (const side of [-1, 1]) for (const end of [-1, 1]) {
        part('chairs', sitePerson, side * 0.22, 0.23, end * 0.2, 0.055, 0.46, 0.055, 0x494a46);
      }
    }
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i], detailed = i < DETAIL_COUNT;
      const sitting = p.routine === 'coffee' && p.reaction === 'calm';
      const working = p.routine === 'work' && p.reaction === 'calm';
      const phone = p.routine === 'phone' && p.reaction === 'calm';
      const lower = sitting ? 1.12 - 0.83 / p.height : 0;
      stats.seated += Number(sitting); stats.working += Number(working);
      const swing = p.stopped ? 0 : Math.sin(p.phase) * (p.reaction === 'flee' ? 0.85 : 0.5);
      const yaw = sitting ? p.site.yaw : p.yaw + (p.direction < 0 ? Math.PI : 0);
      rootRotation.setFromAxisAngle(axis, yaw);
      part('torso', p, 0, 1.12 - lower, 0, 0.23, 0.21, 0.15, p.shirt);
      part('head', p, 0, 1.62 - lower, 0, 0.135, 0.17, 0.13, p.skin);
      part('hair', p, 0, 1.72 - lower, 0.015, 0.139, 0.09, 0.13, p.hair);
      for (const side of [-1, 1]) {
        const armAction = sitting || phone ? -1.1 : working ? -0.8 + Math.sin(p.phase) * 0.25 : null;
        part('arms', p, side * 0.29, 1.06 - lower, armAction !== null ? -0.13 : -Math.sin(swing * side) * 0.12, 0.075, 0.19, 0.075, p.shirt, p.reaction === 'angry' ? -1.1 : p.reaction === 'panic' ? -2.1 : armAction ?? -swing * side);
        const footLocalZ = sitting ? -0.39 : Math.sin(swing * side) * 0.22 - 0.045;
        const footX = p.x + (Math.cos(yaw) * side * 0.105 + Math.sin(yaw) * footLocalZ) * p.height;
        const footZ = p.z + (-Math.sin(yaw) * side * 0.105 + Math.cos(yaw) * footLocalZ) * p.height;
        const ground = (heightAt(footX, footZ) + PAVEMENT_LIFT - p.y) / p.height;
        part('legs', p, side * 0.105, sitting ? 0.48 : 0.43 + ground, sitting ? -0.17 : Math.sin(swing * side) * 0.13, 0.085, 0.235, 0.085, p.trousers, sitting ? -1.4 : swing * side);
        part('shoes', p, side * 0.105, 0.055 + ground, sitting ? -0.39 : footLocalZ, 0.17, 0.11, 0.28, 0x303030);
        if (detailed) part('hands', p, side * 0.3, 0.76 - lower, armAction !== null ? -0.32 : -Math.sin(swing * side) * 0.22, 0.062, 0.075, 0.065, p.skin);
      }
      if (sitting) {
        part('cups', p, 0.28, 0.9 - lower, -0.32, 0.065, 0.085, 0.065, 0xf1e7d1);
        part('cups', p, 0.28, 0.98 - lower, -0.32, 0.05, 0.008, 0.05, 0x65412d);
      }
      if (phone || working) part('tools', p, 0.28, working ? 0.96 : 1.23, -0.28, working ? 0.2 : 0.075, working ? 0.28 : 0.14, 0.025, working ? 0xc9b796 : 0x242a32);
      if (detailed && (p.bag || p.ambient === 'work')) part('bags', p, 0, 1.13 - lower, 0.19, 0.31, 0.39, 0.15, 0x544b3e);
    }
    stats.visible = visible.length; stats.detailed = Math.min(DETAIL_COUNT, visible.length);
    stats.drawCalls = 0; stats.triangles = 0;
    for (const mesh of Object.values(batches)) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (mesh.count) { stats.drawCalls++; stats.triangles += mesh.count * (mesh.geometry.index.count / 3); }
    }
  }
  function clipMovement(actor, dx, dz, radius = 0.35) {
    if (disposed || ![actor?.x, actor?.z, dx, dz, radius].every(Number.isFinite)) return { dx: 0, dz: 0, blocked: false };
    radius = Math.max(0, Math.min(4, radius));
    const reach = radius + PERSON_RADIUS + 0.02;
    // A slide can leave the original segment bounds but never travel farther
    // than the requested step. Include that envelope in the local broad phase.
    const envelope = reach + Math.hypot(dx, dz);
    const candidates = peopleIn(actor.x - envelope, actor.x + envelope, actor.z - envelope, actor.z + envelope);
    stats.collisionQueries++; stats.collisionCandidates = candidates.length;
    let x = actor.x, z = actor.z, remainingX = dx, remainingZ = dz, blocked = false;
    // Swept circles prevent tunnelling; remove only the inward component to slide.
    for (let iteration = 0; iteration < 3; iteration++) {
      let first = 1, hit = null;
      const length2 = remainingX * remainingX + remainingZ * remainingZ;
      if (length2 < 1e-12) break;
      for (const p of candidates) {
        if (p.id === actor.id && actor.isPedestrian) continue;
        const ox = x - p.x, oz = z - p.z, dot = ox * remainingX + oz * remainingZ;
        const c = ox * ox + oz * oz - reach * reach;
        if (dot >= 0) continue; // An existing overlap can always move apart.
        const discriminant = dot * dot - length2 * c;
        if (discriminant < 0) continue;
        const t = c <= 0 ? 0 : (-dot - Math.sqrt(discriminant)) / length2;
        if (t >= 0 && t <= first) { first = t; hit = p; }
      }
      if (!hit) { x += remainingX; z += remainingZ; break; }
      blocked = true;
      const t = Math.max(0, first - 0.001 / Math.sqrt(length2));
      x += remainingX * t; z += remainingZ * t;
      remainingX *= 1 - t; remainingZ *= 1 - t;
      const nx = x - hit.x, nz = z - hit.z, n = Math.hypot(nx, nz) || 1;
      const inward = (remainingX * nx + remainingZ * nz) / n;
      if (inward < 0) { remainingX -= nx / n * inward; remainingZ -= nz / n * inward; }
      hit.yieldTimer = 1.4;
      const before = pointAlong(hit.path, Math.max(0, hit.distance - 0.5));
      const after = pointAlong(hit.path, Math.min(hit.path.length, hit.distance + 0.5));
      const away = (after.x - before.x) * (hit.x - actor.x) + (after.z - before.z) * (hit.z - actor.z);
      hit.direction = away === 0 ? hit.initialDirection : away > 0 ? 1 : -1;
    }
    return { dx: x - actor.x, dz: z - actor.z, blocked };
  }
  function descriptor(p) { return Object.freeze({ id: p.id, x: p.x, z: p.z, health: p.health, reaction: p.reaction }); }
  function react(p, source, kind, hit = false, report = true) {
    const gun = ['pistol', 'gunshot', 'firearm', 'shot', 'fire'].includes(kind);
    p.fear = Math.max(p.fear, gun ? 1 : 0.65);
    p.anger = gun ? 0 : hit ? (p.personality === 'assertive' && Math.hypot(p.x - source.x, p.z - source.z) <= 2.6 ? 1 : 0) : p.anger;
    if (gun || hit) p.angerOffender = p.anger ? source.offenderId : null;
    p.reaction = p.knockdown > 0 ? 'knockdown' : p.stun > 0 ? 'stunned' : p.anger ? 'angry' : 'panic';
    p.reactionTimer = gun ? 8 : 5;
    p.routine = 'interrupted';
    p.returning = Boolean(p.site);
    const before = pointAlong(p.path, Math.max(0, p.distance - 0.5));
    const after = pointAlong(p.path, Math.min(p.path.length, p.distance + 0.5));
    const dot = (after.x - before.x) * (p.x - source.x) + (after.z - before.z) * (p.z - source.z);
    if (Math.abs(dot) > 0.001) p.direction = dot > 0 ? 1 : -1;
    if (report && p.witnessCooldown <= 0) {
      emit({ type: 'witness', kind, x: source.x, z: source.z, witnessId: p.id, offenderId: source.offenderId });
      p.witnessCooldown = 0.8;
    }
  }
  function alert({ x, z, radius = 28, kind = 'gunshot', hasLineOfSight, offenderId = 'player' } = {}) {
    if (disposed || !Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const reach = Number.isFinite(radius) ? Math.max(0, Math.min(100, radius)) : 28;
    let count = 0;
    for (const p of peopleIn(x - reach, x + reach, z - reach, z + reach)) {
      if (p.knockdown > 0 || Math.hypot(p.x - x, p.z - z) > reach ||
        (hasLineOfSight && !hasLineOfSight({ x, z }, p))) continue;
      react(p, { x, z, offenderId }, kind); count++;
    }
    return count;
  }
  function strike({ x, z, yaw = 0, range = 2, damage = 20, kind = 'melee', hasLineOfSight, offenderId = 'player' } = {}) {
    const people = [];
    if (disposed || ![x, z, yaw, range, damage].every(Number.isFinite)) return { hits: 0, people };
    const reach = Math.max(0, Math.min(100, range)), power = Math.max(0, Math.min(100, damage));
    const gun = ['pistol', 'gunshot', 'firearm', 'shot', 'fire'].includes(kind);
    const candidates = peopleIn(x - reach, x + reach, z - reach, z + reach).map(p => ({ p, distance: Math.hypot(p.x - x, p.z - z) }))
      .filter(({ p, distance }) => {
        const forward = (p.x - x) * -Math.sin(yaw) + (p.z - z) * -Math.cos(yaw);
        const lateral = Math.abs((p.x - x) * Math.cos(yaw) - (p.z - z) * Math.sin(yaw));
        return power > 0 && p.health > 0 && p.hitCooldown <= 0 && distance <= reach &&
          forward >= -0.3 && (gun ? lateral <= 0.55 : forward >= distance * 0.25) &&
          (!hasLineOfSight || hasLineOfSight({ x, z }, p));
      }).sort((a, b) => a.distance - b.distance);
    for (const { p } of candidates.slice(0, gun ? 1 : 3)) {
      p.health = Math.max(0, p.health - power); p.hitCooldown = 0.4;
      react(p, { x, z, offenderId }, kind, true);
      p.stun = 0.65;
      if (p.health === 0 || power >= 35) { p.knockdown = 2.8; p.reaction = 'knockdown'; }
      else p.reaction = 'stunned';
      people.push(descriptor(p));
    }
    if (people.length) alert({ x, z, radius: gun ? 40 : 16, kind, hasLineOfSight, offenderId });
    return { hits: people.length, people };
  }
  let recycleTimer = 0;
  function update(player, dt, traffic = [], hasLineOfSight) {
    if (disposed || !(dt > 0)) return;
    dt = Math.min(dt, 0.1); recycleTimer += dt;
    for (const p of pool) {
      const gap = Math.hypot(p.x - player.x, p.z - player.z);
      for (const key of ['drivingReportCooldown', 'hitCooldown', 'witnessCooldown', 'retaliationCooldown', 'stun', 'knockdown', 'reactionTimer', 'yieldTimer']) p[key] = Math.max(0, p[key] - dt);
      if (p.reactionTimer <= 0 && p.knockdown <= 0 && p.stun <= 0) {
        p.reaction = 'calm'; p.fear = 0; p.anger = 0; p.angerOffender = null; p.health = Math.min(100, p.health + dt * 20);
      } else if (p.knockdown > 0) p.reaction = 'knockdown';
      else if (p.stun > 0) p.reaction = 'stunned';
      else p.reaction = p.anger ? 'angry' : 'flee';
      const speed = Math.abs(player.speed || 0);
      const dx = p.x - player.x, dz = p.z - player.z;
      const forward = (player.speed < 0 ? -1 : 1);
      const fx = -Math.sin(player.yaw || 0) * forward, fz = -Math.cos(player.yaw || 0) * forward;
      const along = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
      const seen = gap < 9 && (!hasLineOfSight || hasLineOfSight(player, p));
      const impact = speed > 4 && gap < 1.4 && seen;
      const dangerous = speed > 16 && gap < 3.6 && along > -1.5 && lateral < 2.5 && seen;
      p.recklessExposure = dangerous ? Math.min(0.6, p.recklessExposure + dt) : 0;
      if ((impact || p.recklessExposure >= 0.5 || (dangerous && speed > 25 && gap < 2.5)) && p.drivingReportCooldown <= 0) {
        emit({ type: 'witness', kind: impact ? 'vehicle assault' : 'reckless', x: player.x, z: player.z,
          witnessId: p.id, offenderId: 'player' });
        p.drivingReportCooldown = 8;
      }
      const frightening = speed > 9 && gap < 9 && seen;
      const dangerousCar = traffic.find(car => Math.abs(car.speed || 0) > 9 && Math.hypot(car.x - p.x, car.z - p.z) < 9 &&
        (!hasLineOfSight || hasLineOfSight(car, p)));
      if ((frightening || dangerousCar) && p.reactionTimer <= 0) {
        const source = frightening ? player : dangerousCar;
        // Alarm is visible feedback; it does not itself establish an offence.
        react(p, { x: source.x, z: source.z, offenderId: frightening ? 'player' : String(source.id || 'npc:traffic') }, 'traffic alarm', false, false);
      }
      if (p.reaction === 'angry' && p.angerOffender === 'player' && gap < 2.1 && p.retaliationCooldown <= 0 &&
        (!hasLineOfSight || hasLineOfSight(p, player))) {
        emit({ type: 'retaliation', kind: 'melee', x: p.x, z: p.z, personId: p.id, targetId: 'player', damage: 5 });
        p.retaliationCooldown = 2.2;
      }
      if (p.reaction === 'calm') {
        if (p.routine === 'interrupted') { p.routine = 'walk'; p.returning = Boolean(p.site); }
        if (p.site) {
          if (p.returning) {
            const toSite = p.site.distance - p.distance;
            if (Math.abs(toSite) < 0.16 && p.yieldTimer <= 0) {
              p.distance = p.site.distance; p.escape = 0; p.routine = p.ambient;
              p.returning = false; p.routineClock = 8 + p.id % 8;
            } else p.direction = toSite >= 0 ? 1 : -1;
          } else {
            p.routineClock = Math.max(0, p.routineClock - dt);
            if (p.routineClock <= 0) {
              if (p.routine === 'walk') p.returning = true;
              else { p.routine = 'walk'; p.routineClock = 5 + p.id % 4; }
            }
          }
        }
        if (p.yieldTimer > 0) { p.routine = 'walk'; p.returning = false; p.routineClock = 3; }
      }
      const ambientStop = p.reaction === 'calm' && ['coffee', 'work', 'phone', 'wait'].includes(p.routine);
      const caution = Math.min(11, 5 + Math.abs(player.speed || 0) * 0.12);
      p.stopped = ambientStop || p.knockdown > 0 || p.stun > 0 || p.reaction === 'angry' || (p.reaction === 'calm' && p.yieldTimer <= 0 && gap < caution) || traffic.some(car => Math.hypot(car.x - p.x, car.z - p.z) < 4.5);
      const escape = ambientStop ? 0 : gap < 7 ? 0.45 : 0;
      p.escape += Math.max(-dt * 0.6, Math.min(dt * 0.9, escape - p.escape));
      if (!p.stopped) {
        const previousDistance = p.distance;
        p.distance += p.direction * p.speed * (p.reaction === 'flee' ? 2.7 : p.yieldTimer > 0 ? 2.2 : 1) * dt;
        if (p.distance > p.path.length) { p.distance = p.path.length; p.direction = -1; }
        if (p.distance < 0) { p.distance = 0; p.direction = 1; }
        const candidate = pointAlong(p.path, p.distance);
        const blocked = peopleIn(candidate.x - 1, candidate.x + 1, candidate.z - 1, candidate.z + 1)
          .some(other => other !== p && Math.hypot(candidate.x - other.x, candidate.z - other.z) < 0.82);
        if (blocked) { p.distance = previousDistance; p.direction *= -1; }
        p.phase += dt * p.speed * (p.reaction === 'flee' ? 9 : 5.2);
      }
      if (ambientStop) p.phase += dt * (p.routine === 'work' ? 2 : 0.6);
      Object.assign(p, pointAlong(p.path, p.distance));
      p.x += p.nx * p.escape; p.z += p.nz * p.escape;
      p.y = heightAt(p.x, p.z) + PAVEMENT_LIFT;
    }
    if (recycleTimer >= 1) {
      recycleTimer = 0;
      const desired = populationAt(player);
      if (pool.length < desired) {
        const activeIds = new Set(pool.map(p => p.id));
        for (const person of residents) {
          if (pool.length >= desired) break;
          if (activeIds.has(person.id)) continue;
          const path = choosePath(player, 210, 410);
          if (!path) break;
          const distance = random() * path.length, candidate = pointAlong(path, distance);
          if (Math.hypot(candidate.x - player.x, candidate.z - player.z) <= 200 ||
            pool.some(other => Math.hypot(other.x - candidate.x, other.z - candidate.z) < 2)) continue;
          place(person, path, distance); pool.push(person);
        }
      } else if (pool.length > desired) {
        for (let i = pool.length - 1; i >= desired; i--) {
          if (Math.hypot(pool[i].x - player.x, pool[i].z - player.z) > VIEW_DISTANCE) pool.splice(i, 1);
        }
      }
      stats.count = pool.length;
      for (const p of pool) {
        if (Math.hypot(p.x - player.x, p.z - player.z) <= 550) continue;
        const path = choosePath(player, 210, 410);
        if (!path) continue;
        const distance = random() * path.length, candidate = pointAlong(path, distance);
        const gap = Math.hypot(candidate.x - player.x, candidate.z - player.z);
        if (gap > 200 && gap < 460 && pool.every(other => other === p || Math.hypot(other.x - candidate.x, other.z - candidate.z) >= 2)) {
          place(p, path, distance); stats.recycled++;
        }
      }
    }
    rebuildPeopleGrid(); render(player);
  }
  resetPopulation(spawn);
  return { update, resetPopulation, clipMovement, stats, alert, strike,
    drainEvents() { return events.splice(0); },
    snapshot() { return Object.freeze(pool.map(p => Object.freeze({ id: p.id, x: p.x, y: p.y, z: p.z,
      yaw: p.routine === 'coffee' && p.reaction === 'calm' ? p.site.yaw : p.yaw + (p.direction < 0 ? Math.PI : 0), roadId: p.path.roadId, roadName: p.path.name,
      sidewalkOffset: p.path.offset, yieldTimer: p.yieldTimer, escape: p.escape, stopped: p.stopped, phase: p.phase,
      routine: p.routine, ambient: p.ambient, routineClock: p.routineClock, returning: p.returning, personality: p.personality,
      seat: p.ambient === 'coffee' && p.site ? Object.freeze({ x: p.site.x, z: p.site.z, yaw: p.site.yaw }) : null,
      routineSite: p.site ? Object.freeze({ x: p.site.x, z: p.site.z, roadId: p.path.roadId }) : null,
      health: p.health, reaction: p.reaction, fear: p.fear, anger: p.anger,
      stun: p.stun, knockdown: p.knockdown, reactionTimer: p.reactionTimer }))); },
    dispose() {
      if (disposed) return;
      disposed = true; events.length = 0; peopleCells.clear(); pathCells.clear(); scene.remove(group); capsule.dispose(); sphere.dispose(); box.dispose(); cup.dispose(); material.dispose();
      for (const mesh of Object.values(batches)) mesh.dispose();
    } };
}
