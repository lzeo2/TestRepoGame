import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const POPULATION = 80;
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
  const { minX, maxX, minZ, maxZ } = map.bounds;
  function safe(x, z) {
    return x > minX + 1 && x < maxX - 1 && z > minZ + 1 && z < maxZ - 1 &&
      !roadsAt(x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.clearance) &&
      !buildingsAt(x, z).some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && inFootprint(x, z, b.points));
  }
  const paths = [];
  for (const road of map.roads || []) {
    if (!road.name || !['residential', 'tertiary'].includes(road.type)) continue;
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
  return paths;
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

export function createPedestrians(scene, map, heightAt) {
  const paths = sidewalkPaths(map);
  let seed = 0x4ca7b23, disposed = false;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const group = new THREE.Group();
  group.name = 'Capital Drive sidewalk pedestrians';
  scene.add(group);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const capsule = new THREE.CapsuleGeometry(1, 1, 2, 5);
  const sphere = new THREE.SphereGeometry(1, 6, 4);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const batches = {};
  for (const [name, geometry, capacity] of [['torso', capsule, POPULATION], ['head', sphere, POPULATION],
    ['hair', sphere, POPULATION], ['arms', capsule, POPULATION * 2], ['legs', capsule, POPULATION * 2],
    ['shoes', box, POPULATION * 2], ['hands', sphere, DETAIL_COUNT * 2], ['bags', box, DETAIL_COUNT]]) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.name = `Pedestrian ${name}`;
    group.add(mesh); batches[name] = mesh;
  }
  const stats = { count: paths.length ? POPULATION : 0, visible: 0, detailed: 0, paths: paths.length,
    drawCalls: 0, triangles: 0, recycled: 0 };
  const spawn = map.spawn || { x: 0, z: 0, yaw: 0 };
  const anchors = (map.landmarks || []).filter(p => ['manuka', 'kingston', 'telopea'].includes(p.id));
  const pool = [], events = [];
  const emit = event => { if (events.length < 160) events.push(Object.freeze(event)); };
  function choosePath(target, minimum = 0, maximum = 300) {
    const candidates = [];
    for (const path of paths) {
      const p = pointAlong(path, path.length / 2), distance = Math.hypot(p.x - target.x, p.z - target.z);
      if (distance >= minimum && distance < maximum) candidates.push(path);
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(random() * candidates.length)];
  }
  function place(person, path, distance = random() * path.length) {
    person.direction = person.initialDirection;
    person.path = path; person.distance = distance; person.escape = 0; person.stopped = false;
    person.health = 100; person.reaction = 'calm'; person.fear = 0; person.anger = 0;
    person.reactionTimer = 0; person.stun = 0; person.knockdown = 0;
    person.hitCooldown = 0; person.witnessCooldown = 0; person.retaliationCooldown = 0;
    Object.assign(person, pointAlong(path, distance));
    person.y = heightAt(person.x, person.z) + PAVEMENT_LIFT;
  }
  for (let i = 0; i < stats.count; i++) {
    pool.push({ id: i, direction: random() < 0.5 ? -1 : 1, speed: 0.85 + random() * 0.6,
      phase: random() * Math.PI * 2, height: 0.94 + random() * 0.15,
      shirt: SHIRTS[Math.floor(random() * SHIRTS.length)], trousers: TROUSERS[Math.floor(random() * TROUSERS.length)],
      skin: SKIN[Math.floor(random() * SKIN.length)], hair: HAIR[Math.floor(random() * HAIR.length)], bag: random() < 0.45 });
  }
  for (const p of pool) p.initialDirection = p.direction;
  function resetPopulation(player) {
    if (disposed) return;
    // Explicit teleports need a fresh local street population immediately.
    // Position-derived seed makes repeating the same arrival reproducible.
    seed = (0x4ca7b23 ^ Math.imul(Math.round(player.x * 10), 73856093) ^ Math.imul(Math.round(player.z * 10), 19349663)) >>> 0;
    const fx = -Math.sin(player.yaw || 0), fz = -Math.cos(player.yaw || 0);
    const slots = [], ahead = [], occupied = [];
    for (const path of paths) {
      for (let j = 0; j < path.points.length; j += 2) {
        const p = path.points[j], dx = p.x - player.x, dz = p.z - player.z;
        const gap = Math.hypot(dx, dz);
        if (gap < 7 || gap > 175) continue;
        const forward = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
        const slot = { path, distance: path.lengths[j], x: p.x, z: p.z, forward, lateral };
        slots.push(slot);
        if (forward >= 10 && forward <= 58 && lateral < forward * 0.5 + 3) ahead.push(slot);
      }
    }
    function separated(slot) { return occupied.every(p => Math.hypot(p.x - slot.x, p.z - slot.z) > 3.5); }
    for (let i = 0; i < pool.length; i++) {
      let slot;
      if (i < 8 && ahead.length) {
        const desired = 14 + i * 5;
        ahead.sort((a, b) => Math.abs(a.forward - desired) + a.lateral * 0.25 - Math.abs(b.forward - desired) - b.lateral * 0.25);
        slot = ahead.find(separated);
      }
      if (!slot && i < 56 && slots.length) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const candidate = slots[Math.floor(random() * slots.length)];
          if (separated(candidate)) { slot = candidate; break; }
        }
      }
      const target = i < 56 || !anchors.length ? player : anchors[(i - 56) % anchors.length];
      const path = slot?.path || choosePath(target, 0, 250) || choosePath(target, 0, 1000) || paths[i % paths.length];
      const distance = slot?.distance ?? random() * path.length;
      place(pool[i], path, distance);
      pool[i].phase = random() * Math.PI * 2;
      occupied.push(pool[i]);
    }
    recycleTimer = 0; events.length = 0;
    render(player);
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
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i], detailed = i < DETAIL_COUNT;
      const swing = p.stopped ? 0 : Math.sin(p.phase) * (p.reaction === 'flee' ? 0.85 : 0.5);
      const yaw = p.yaw + (p.direction < 0 ? Math.PI : 0);
      rootRotation.setFromAxisAngle(axis, yaw);
      part('torso', p, 0, 1.12, 0, 0.23, 0.21, 0.15, p.shirt);
      part('head', p, 0, 1.62, 0, 0.135, 0.17, 0.13, p.skin);
      part('hair', p, 0, 1.72, 0.015, 0.139, 0.09, 0.13, p.hair);
      for (const side of [-1, 1]) {
        part('arms', p, side * 0.29, 1.06, -Math.sin(swing * side) * 0.12, 0.075, 0.19, 0.075, p.shirt, p.reaction === 'angry' ? -1.1 : p.reaction === 'panic' ? -2.1 : -swing * side);
        const footLocalZ = Math.sin(swing * side) * 0.22 - 0.045;
        const footX = p.x + (Math.cos(yaw) * side * 0.105 + Math.sin(yaw) * footLocalZ) * p.height;
        const footZ = p.z + (-Math.sin(yaw) * side * 0.105 + Math.cos(yaw) * footLocalZ) * p.height;
        const ground = (heightAt(footX, footZ) + PAVEMENT_LIFT - p.y) / p.height;
        part('legs', p, side * 0.105, 0.43 + ground, Math.sin(swing * side) * 0.13, 0.085, 0.235, 0.085, p.trousers, swing * side);
        part('shoes', p, side * 0.105, 0.055 + ground, footLocalZ, 0.17, 0.11, 0.28, 0x303030);
        if (detailed) part('hands', p, side * 0.3, 0.76, -Math.sin(swing * side) * 0.22, 0.062, 0.075, 0.065, p.skin);
      }
      if (detailed && p.bag) part('bags', p, 0, 1.13, 0.19, 0.31, 0.39, 0.15, 0x544b3e);
    }
    stats.visible = visible.length; stats.detailed = Math.min(DETAIL_COUNT, visible.length);
    stats.drawCalls = 0; stats.triangles = 0;
    for (const mesh of Object.values(batches)) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (mesh.count) { stats.drawCalls++; stats.triangles += mesh.count * (mesh.geometry.index.count / 3); }
    }
  }
  function descriptor(p) { return Object.freeze({ id: p.id, x: p.x, z: p.z, health: p.health, reaction: p.reaction }); }
  function react(p, source, kind, hit = false) {
    const gun = ['pistol', 'gunshot', 'firearm', 'shot', 'fire'].includes(kind);
    p.fear = Math.max(p.fear, gun ? 1 : 0.65);
    p.anger = gun ? 0 : hit ? (p.id % 5 === 0 ? 1 : 0) : p.anger;
    p.reaction = p.knockdown > 0 ? 'knockdown' : p.stun > 0 ? 'stunned' : p.anger ? 'angry' : 'panic';
    p.reactionTimer = gun ? 8 : 5;
    const before = pointAlong(p.path, Math.max(0, p.distance - 0.5));
    const after = pointAlong(p.path, Math.min(p.path.length, p.distance + 0.5));
    const dot = (after.x - before.x) * (p.x - source.x) + (after.z - before.z) * (p.z - source.z);
    if (Math.abs(dot) > 0.001) p.direction = dot > 0 ? 1 : -1;
    if (p.witnessCooldown <= 0) {
      emit({ type: 'witness', kind, x: source.x, z: source.z, witnessId: p.id });
      p.witnessCooldown = 0.8;
    }
  }
  function alert({ x, z, radius = 28, kind = 'gunshot', hasLineOfSight } = {}) {
    if (disposed || !Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const reach = Number.isFinite(radius) ? Math.max(0, Math.min(100, radius)) : 28;
    let count = 0;
    for (const p of pool) {
      if (p.knockdown > 0 || Math.hypot(p.x - x, p.z - z) > reach ||
        (hasLineOfSight && !hasLineOfSight({ x, z }, p))) continue;
      react(p, { x, z }, kind); count++;
    }
    return count;
  }
  function strike({ x, z, yaw = 0, range = 2, damage = 20, kind = 'melee', hasLineOfSight } = {}) {
    const people = [];
    if (disposed || ![x, z, yaw, range, damage].every(Number.isFinite)) return { hits: 0, people };
    const reach = Math.max(0, Math.min(100, range)), power = Math.max(0, Math.min(100, damage));
    const gun = ['pistol', 'gunshot', 'firearm', 'shot', 'fire'].includes(kind);
    const candidates = pool.map(p => ({ p, distance: Math.hypot(p.x - x, p.z - z) }))
      .filter(({ p, distance }) => {
        const forward = (p.x - x) * -Math.sin(yaw) + (p.z - z) * -Math.cos(yaw);
        const lateral = Math.abs((p.x - x) * Math.cos(yaw) - (p.z - z) * Math.sin(yaw));
        return power > 0 && p.health > 0 && p.hitCooldown <= 0 && distance <= reach &&
          forward >= -0.3 && (gun ? lateral <= 0.55 : forward >= distance * 0.25) &&
          (!hasLineOfSight || hasLineOfSight({ x, z }, p));
      }).sort((a, b) => a.distance - b.distance);
    for (const { p } of candidates.slice(0, gun ? 1 : 3)) {
      p.health = Math.max(0, p.health - power); p.hitCooldown = 0.4;
      react(p, { x, z }, kind, true);
      p.stun = 0.65;
      if (p.health === 0 || power >= 35) { p.knockdown = 2.8; p.reaction = 'knockdown'; }
      else p.reaction = 'stunned';
      people.push(descriptor(p));
    }
    if (people.length) alert({ x, z, radius: gun ? 40 : 16, kind, hasLineOfSight });
    return { hits: people.length, people };
  }
  let recycleTimer = 0;
  function update(player, dt, traffic = []) {
    if (disposed || !(dt > 0)) return;
    dt = Math.min(dt, 0.1); recycleTimer += dt;
    for (const p of pool) {
      const gap = Math.hypot(p.x - player.x, p.z - player.z);
      for (const key of ['hitCooldown', 'witnessCooldown', 'retaliationCooldown', 'stun', 'knockdown', 'reactionTimer']) p[key] = Math.max(0, p[key] - dt);
      if (p.reactionTimer <= 0 && p.knockdown <= 0 && p.stun <= 0) {
        p.reaction = 'calm'; p.fear = 0; p.anger = 0; p.health = Math.min(100, p.health + dt * 20);
      } else if (p.knockdown > 0) p.reaction = 'knockdown';
      else if (p.stun > 0) p.reaction = 'stunned';
      else p.reaction = p.anger ? 'angry' : 'flee';
      const reckless = Math.abs(player.speed || 0) > 9 && gap < 11;
      const dangerousCar = traffic.find(car => Math.abs(car.speed || 0) > 9 && Math.hypot(car.x - p.x, car.z - p.z) < 9);
      if ((reckless || dangerousCar) && p.reactionTimer <= 0) react(p, dangerousCar || player, 'reckless');
      if (p.reaction === 'angry' && gap < 2.1 && p.retaliationCooldown <= 0) {
        emit({ type: 'retaliation', kind: 'melee', x: p.x, z: p.z, personId: p.id, damage: 5 });
        p.retaliationCooldown = 2.2;
      }
      const caution = Math.min(11, 5 + Math.abs(player.speed || 0) * 0.12);
      p.stopped = p.knockdown > 0 || p.stun > 0 || p.reaction === 'angry' || (p.reaction === 'calm' && gap < caution) || traffic.some(car => Math.hypot(car.x - p.x, car.z - p.z) < 4.5);
      const escape = gap < 7 ? 0.45 : 0;
      p.escape += Math.max(-dt * 0.6, Math.min(dt * 0.9, escape - p.escape));
      if (!p.stopped) {
        p.distance += p.direction * p.speed * (p.reaction === 'flee' ? 2.7 : 1) * dt;
        if (p.distance > p.path.length) { p.distance = p.path.length; p.direction = -1; }
        if (p.distance < 0) { p.distance = 0; p.direction = 1; }
        p.phase += dt * p.speed * (p.reaction === 'flee' ? 9 : 5.2);
      }
      Object.assign(p, pointAlong(p.path, p.distance));
      p.x += p.nx * p.escape; p.z += p.nz * p.escape;
      p.y = heightAt(p.x, p.z) + PAVEMENT_LIFT;
    }
    if (recycleTimer >= 1) {
      recycleTimer = 0;
      for (const p of pool) {
        if (Math.hypot(p.x - player.x, p.z - player.z) <= 550) continue;
        const path = choosePath(player, 210, 410);
        if (!path) continue;
        const distance = random() * path.length, candidate = pointAlong(path, distance);
        const gap = Math.hypot(candidate.x - player.x, candidate.z - player.z);
        if (gap > 200 && gap < 460) { place(p, path, distance); stats.recycled++; }
      }
    }
    render(player);
  }
  resetPopulation(spawn);
  return { update, resetPopulation, stats, alert, strike,
    drainEvents() { return events.splice(0); },
    snapshot() { return Object.freeze(pool.map(p => Object.freeze({ id: p.id, x: p.x, y: p.y, z: p.z,
      yaw: p.yaw + (p.direction < 0 ? Math.PI : 0), roadId: p.path.roadId, roadName: p.path.name,
      sidewalkOffset: p.path.offset, escape: p.escape, stopped: p.stopped, phase: p.phase,
      health: p.health, reaction: p.reaction, fear: p.fear, anger: p.anger,
      stun: p.stun, knockdown: p.knockdown, reactionTimer: p.reactionTimer }))); },
    dispose() {
      if (disposed) return;
      disposed = true; events.length = 0; scene.remove(group); capsule.dispose(); sphere.dispose(); box.dispose(); material.dispose();
      for (const mesh of Object.values(batches)) mesh.dispose();
    } };
}
