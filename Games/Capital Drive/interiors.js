// Original plausible rooms, anchored to rendered doors; these are not surveyed floorplans.
const ENTRY_RANGE = 2.8;
const CELL = 32;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function localPoint(origin, p) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw), x = p.x - origin.x, z = p.z - origin.z;
  return { x: c * x - s * z, z: s * x + c * z };
}
function worldPoint(origin, x, z) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw);
  return { x: origin.x + c * x + s * z, z: origin.z - s * x + c * z };
}
function contact(p, box, radius) {
  const q = localPoint(box, p);
  return Math.hypot(Math.max(0, Math.abs(q.x) - box.width / 2), Math.max(0, Math.abs(q.z) - box.depth / 2)) < radius;
}

function insideOutline(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function projectSegment(x, z, a, b, min = 0, max = 1) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), min, max);
  return { x: a[0] + t * dx, z: a[1] + t * dz };
}

// Fictional gym tenancy; only the source outline and clear public approach are inferred.
export function createGymEntry(map, service) {
  if (!validPoint(service) || service.type !== 'gym' || !service.id) return null;
  const buildings = (map.buildings || []).filter(b => b.points?.length >= 3);
  const nearby = buildings.filter(b => b.points.some(p => Math.hypot(p[0] - service.x, p[1] - service.z) < 140));
  const roadSegments = [];
  for (const road of map.roads || []) for (let i = 1; i < (road.points?.length || 0); i++) {
    const a = road.points[i - 1], b = road.points[i];
    const p = projectSegment(service.x, service.z, a, b);
    if (distance(p, service) < 140 && !/^(footway|path|pedestrian|steps|cycleway)$/.test(road.type || ''))
      roadSegments.push({ a, b, radius: (road.width || 6) / 2 + 0.4 });
  }
  let best = null, bestDistance = 120;
  for (const building of nearby) for (let i = 0; i < building.points.length; i++) {
    const a = building.points[i], b = building.points[(i + 1) % building.points.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 4) continue;
    const p = projectSegment(service.x, service.z, a, b, 0.2, 0.8), d = distance(p, service);
    if (d >= bestDistance) continue;
    let nx = -dz / length, nz = dx / length;
    if (!insideOutline(p.x + nx * 0.35, p.z + nz * 0.35, building.points)) { nx = -nx; nz = -nz; }
    if (!insideOutline(p.x + nx * 0.35, p.z + nz * 0.35, building.points)) continue;
    let clear = true;
    for (const step of [0.55, 1.4, 2.8, 4]) for (const side of [-0.65, 0, 0.65]) {
      const x = p.x - nx * step + nz * side, z = p.z - nz * step - nx * side;
      if (nearby.some(other => insideOutline(x, z, other.points)) ||
          roadSegments.some(road => distance({ x, z }, projectSegment(x, z, road.a, road.b)) < road.radius)) clear = false;
    }
    if (!clear) continue;
    bestDistance = d;
    best = { id: `interior-${service.id}`, buildingId: building.id, serviceId: service.id,
      type: 'gym', name: service.name || 'Kingston gym', x: p.x, z: p.z, yaw: Math.atan2(nx, nz) };
  }
  return best ? freeze(best) : null;
}

export function createInteriors(map, { heightAt = () => 0, stores = [], publicEntries = [] } = {}) {
  const buildings = new Map((map.buildings || []).map(b => [String(b.id), b]));
  const entries = [], index = new Map(), identities = new Set();
  const occupiedBuildings = new Set([...stores, ...publicEntries.filter(e => ['gym', 'mall'].includes(e.type))].map(s => String(s.buildingId)));
  function add(entry) {
    if (!validPoint(entry) || !Number.isFinite(entry.yaw) || identities.has(entry.id)) return;
    const y = heightAt(entry.x, entry.z);
    if (!Number.isFinite(y)) return;
    const descriptor = freeze({ ...entry, y, estimated: true });
    entries.push(descriptor); identities.add(entry.id);
    const key = cellKey(entry.x, entry.z);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(descriptor);
  }
  // These descriptors are collected when neighbourhood.js actually renders a door.
  for (const door of map.interiorEntries || []) {
    const building = buildings.get(String(door.buildingId));
    if (!building || occupiedBuildings.has(String(building.id)) ||
        !/^(house|residential|detached|semidetached_house|terrace|bungalow|yes)$/.test(building.type || '') ||
        (building.height || 0) > 9 || !Number.isFinite(door.nx) || !Number.isFinite(door.nz) ||
        Math.hypot(door.nx, door.nz) < 0.5) continue;
    add({ id: `house-${building.id}`, buildingId: building.id, type: 'house', name: 'House',
      x: door.x, z: door.z, yaw: Math.atan2(door.nx, door.nz), width: 10.8, depth: 12.4 });
  }
  for (const store of stores) {
    const f = store.frontage;
    if (!f || !buildings.has(String(store.buildingId)) || !validPoint(f)) continue;
    // frontage.yaw faces inward; the visible shop door is centred on this facade unit.
    const noodles = store.interiorType === 'noodle-shop';
    add({ id: `interior-${store.id}`, buildingId: store.buildingId, storeId: store.id,
      type: 'shop', name: store.name, x: f.x, z: f.z, yaw: f.yaw,
      ...(noodles ? { variant: 'noodles' } : {}),
      width: noodles ? clamp(f.width || 6.5, 6.2, 7) : clamp((f.width || 7) * 0.9, 5.4, 12), depth: noodles ? 12 : 10 });
  }
  for (const entry of publicEntries) {
    const building = buildings.get(String(entry.buildingId));
    if (!['mall', 'gym'].includes(entry.type) || !entry.id || !validPoint(entry) || !building?.points?.length) continue;
    // Public entries must be tied to a real exterior edge, never a map-only travel target.
    const onFacade = building.points.some((a, i, points) => {
      const b = points[(i + 1) % points.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = clamp(((entry.x - a[0]) * dx + (entry.z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      return Math.hypot(entry.x - a[0] - t * dx, entry.z - a[1] - t * dz) < 0.4;
    });
    if (!onFacade) continue;
    add({ id: entry.id, buildingId: building.id, type: entry.type, name: entry.name || (entry.type === 'gym' ? 'Kingston gym' : 'Shopping concourse'),
      ...(entry.type === 'gym' ? { serviceId: entry.serviceId } : {}),
      x: entry.x, z: entry.z, yaw: entry.yaw, width: entry.type === 'gym' ? 12 : 24, depth: entry.type === 'gym' ? 14 : 26 });
  }
  Object.freeze(entries);
  let active = null, outside = null, generatedPlans = 0;
  function findEntry(pose) {
    if (active || !validPoint(pose)) return null;
    let best = null, bestDistance = ENTRY_RANGE;
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      for (const entry of index.get(cellKey(pose.x + x * CELL, pose.z + z * CELL)) || []) {
        const d = distance(pose, entry);
        const forward = localPoint(entry, pose).z;
        if (d <= bestDistance && forward < 0.8 && (!Number.isFinite(pose.y) || Math.abs(pose.y - entry.y) < 3)) {
          best = entry; bestDistance = d;
        }
      }
    }
    return best;
  }
  function build(entry) {
    const { width, depth } = entry, floorY = entry.y + 0.14;
    const origin = { x: entry.x, z: entry.z, yaw: entry.yaw };
    const walls = [], furniture = [], doors = [], rooms = [], details = [], activities = [];
    function box(list, kind, x, z, w, d, h, color, y = 0, yaw = 0) {
      const p = worldPoint(origin, x, z);
      const item = { ...p, yaw: origin.yaw + yaw, width: w, depth: d, height: h, y: floorY + y, kind, color };
      list.push(item); return item;
    }
    const station = (id, kind, label, x, z, yaw = 0, radius = 1.35) => activities.push({
      id: `${entry.id}-${id}`, kind, label, ...worldPoint(origin, x, z), yaw: origin.yaw + yaw, radius });
    const wall = (x, z, w, d) => box(walls, 'wall', x, z, w, d, 2.65, 0xd6ccba);
    const door = (kind, x, z, width = 1.5) => {
      const point = { ...worldPoint(origin, x, z), yaw: origin.yaw, y: floorY, kind, width };
      doors.push(point); return point;
    };
    const gap = entry.variant === 'noodles' ? 2 : 1.5, sideWidth = (width - gap) / 2;
    wall(-(width + gap) / 4, 0, sideWidth, 0.16);
    wall((width + gap) / 4, 0, sideWidth, 0.16);
    wall(-width / 2, depth / 2, 0.16, depth);
    wall(width / 2, depth / 2, 0.16, depth);
    wall(0, depth, width, 0.16);
    const exit = door('exit', 0, 0.9, gap);
    const spawn = { ...worldPoint(origin, 0, 1.65), y: floorY, yaw: origin.yaw + Math.PI };
    let counter = null, exercise = null;
    if (entry.type === 'house') {
      const hall = 1.9, split = depth / 2, roomWidth = (width - hall) / 2;
      // The central hall reaches every room through a 1.5m wall opening.
      for (const side of [-1, 1]) {
        const x = side * hall / 2;
        for (const centre of [split / 2, split * 1.5]) {
          const length = (split - gap) / 2;
          wall(x, centre - (split + gap) / 4, 0.14, length);
          wall(x, centre + (split + gap) / 4, 0.14, length);
          door('room', x, centre);
        }
        wall(side * (hall / 2 + roomWidth / 2), split, roomWidth, 0.14);
      }
      const left = -(width + hall) / 4, right = -left;
      rooms.push({ kind: 'living', ...worldPoint(origin, left, split / 2), width: roomWidth, depth: split },
        { kind: 'kitchen', ...worldPoint(origin, right, split / 2), width: roomWidth, depth: split },
        { kind: 'bedroom', ...worldPoint(origin, left, split * 1.5), width: roomWidth, depth: split },
        { kind: 'bathroom', ...worldPoint(origin, right, split * 1.5), width: roomWidth, depth: split });
      const furnish = (kind, x, z, w, d, h, color) => box(furniture, kind, x, z, w, d, h, color);
      furnish('sofa', left - 0.65, 2.5, 1.05, 2.3, 0.85, 0x7d8a76);
      furnish('coffee-table', left + 0.65, 2.5, 0.65, 1.15, 0.42, 0x927154);
      furnish('television', left, 0.55, 1.6, 0.38, 1.15, 0x343a39);
      furnish('kitchen-bench', width / 2 - 0.65, 2.8, 0.85, 4.2, 0.92, 0xb8ad92);
      furnish('fridge', right - 0.65, 0.65, 0.85, 0.8, 1.85, 0xc5ccc6);
      furnish('dining-table', right - 0.2, 4.65, 1.1, 0.9, 0.76, 0x927154);
      furnish('chair', right - 0.2, 5.5, 0.5, 0.48, 0.8, 0x8c745c);
      furnish('bed', left - 0.15, depth - 1.8, 1.7, 2.3, 0.6, 0xb3c1c2);
      furnish('wardrobe', -width / 2 + 0.55, split + 1.2, 0.7, 1.5, 2, 0x977e60);
      furnish('bedside-table', left + 1.2, depth - 1.5, 0.5, 0.55, 0.55, 0x927154);
      furnish('bath', width / 2 - 0.85, depth - 1.5, 1.15, 2.1, 0.6, 0xd8dfd8);
      furnish('basin', right - 0.4, split + 0.65, 0.85, 0.6, 0.9, 0xd8dfd8);
      furnish('toilet', right - 0.65, depth - 1.2, 0.6, 0.8, 0.7, 0xd8dfd8);
      station('television', 'tv', 'Watch the television', -1.65, 1.4, Math.PI);
      station('cooking', 'cooking', 'Cook at the kitchen bench', 3.6, 3.1, Math.PI / 2);
      station('rest', 'rest', 'Rest beside the bed', -1.65, 9.3, -Math.PI / 2);
    } else if (entry.type === 'mall') {
      const hall = 6, unitWidth = (width - hall) / 2, unitDepth = 11, unitGap = 3;
      rooms.push({ kind: 'concourse', ...worldPoint(origin, 0, depth / 2), width: hall, depth });
      for (const side of [-1, 1]) {
        const wallX = side * hall / 2, centreX = side * (hall / 2 + unitWidth / 2);
        for (const centreZ of [7.5, 18.5]) {
          const unitId = `unit-${side < 0 ? 'west' : 'east'}-${centreZ < 13 ? 'front' : 'rear'}`;
          rooms.push({ id: unitId, kind: 'mall-unit', ...worldPoint(origin, centreX, centreZ), width: unitWidth, depth: unitDepth });
          const segmentLength = (unitDepth - unitGap) / 2;
          wall(wallX, centreZ - (unitDepth + unitGap) / 4, 0.16, segmentLength);
          wall(wallX, centreZ + (unitDepth + unitGap) / 4, 0.16, segmentLength);
          door('unit', wallX, centreZ, unitGap);
          // Every unit has a clear entrance and turning space between its shelves and till.
          box(furniture, 'shelves', side * (width / 2 - 0.6), centreZ - 0.5, 0.7, 6.5, 1.75, 0x8e8d73);
          box(furniture, 'counter', centreX, centreZ + 3.8, 2.4, 0.9, 1.05, 0xa08a68);
          station(`${unitId}-stock`, 'stock', 'Sort the shop stock', centreX, centreZ + 2.6);
          if (side < 0 && centreZ < 13) {
            box(furniture, 'arcade', centreX - 1.9, centreZ + 2, 0.85, 0.85, 1.65, 0x766a86);
            station('arcade', 'arcade', 'Play the arcade cabinet', centreX - 1.9, centreZ + 0.9);
          }
        }
        for (const z of [2, 13, 24]) wall(centreX, z, unitWidth, 0.16);
        box(furniture, 'bench', side * 1.85, 13, 0.75, 2.6, 0.65, 0x938268);
      }
    } else if (entry.type === 'gym') {
      rooms.push({ kind: 'gym-floor', ...worldPoint(origin, 0, 7), width, depth });
      box(furniture, 'counter', 3.8, 3.1, 2.2, 0.8, 1.05, 0xaaa18a);
      counter = { ...worldPoint(origin, 3.8, 2.05), y: floorY, yaw: origin.yaw, radius: 1.4 };
      const bench = box(furniture, 'exercise-bench', -2.4, 7.1, 0.68, 2.2, 0.52, 0x496b7b);
      for (const side of [-1, 1]) box(furniture, 'bench-rack', -2.4 + side * 1.05, 7.85, 0.16, 0.6, 1.65, 0x606b6d);
      box(furniture, 'weight-rack', -4.9, 11.1, 0.8, 3.3, 1.25, 0x6b7472);
      box(furniture, 'treadmill', 3.5, 8.4, 1.2, 2.4, 1.35, 0x626c6e);
      box(furniture, 'exercise-mat', 3.5, 11.6, 1.2, 1.8, 0.04, 0x718477);
      box(furniture, 'lockers', 0, 13.3, 3.8, 0.7, 2, 0xa8b1a8);
      const approach = worldPoint(origin, -0.8, 7.1);
      exercise = { x: bench.x, z: bench.z, y: floorY + bench.height, yaw: bench.yaw,
        width: bench.width, depth: bench.depth, height: bench.height, approachX: approach.x, approachZ: approach.z };
      station('bench', 'bench', 'Bench press: six controlled reps', -0.8, 7.1, -Math.PI / 2, 1.25);
    } else if (entry.variant === 'noodles') {
      // Official Canberra interior references establish relative sides, not a surveyed floorplan.
      const kitchenWidth = width / 2 - 1.125;
      rooms.push({ kind: 'noodle-dining', ...worldPoint(origin, (width / 2 - 1.125) / 2, 6), width: width - kitchenWidth, depth },
        { kind: 'noodle-kitchen', ...worldPoint(origin, -(width / 2 + 1.125) / 2, 6), width: kitchenWidth, depth });
      // A long left-hand service pass opens onto stainless preparation stations.
      // Furniture leaves the central 2.1m aisle and first 2m by the public door clear.
      box(furniture, 'kitchen-pass', -1.45, 6.1, 0.65, 7.6, 1.02, 0xb5996d);
      const kitchenX = -width / 2 + 0.25;
      box(furniture, 'noodle-station', kitchenX, 3.9, 0.34, 2.4, 0.94, 0xa6afaa);
      box(furniture, 'prep-bench', kitchenX, 7.8, 0.34, 3.8, 0.94, 0xb4b8aa);
      counter = { ...worldPoint(origin, -0.55, 4.2), y: floorY, yaw: origin.yaw - Math.PI / 2, radius: 1.25 };
      station('noodle-order', 'noodle', 'Prepare the noodle order', -0.55, 4.2, -Math.PI / 2, 1.25);
      // Dining and blue seats sit to the right, with the orange booth toward the back.
      box(furniture, 'banquette', width / 2 - 0.42, 10.3, 0.7, 2.9, 0.92, 0xda713b, 0, Math.PI);
      for (const z of [3.4, 5.9, 8.3, 10.6]) {
        const communal = z === 8.3;
        const table = box(furniture, communal ? 'communal-table' : 'noodle-table', 2.05, z, 0.95, communal ? 1.8 : 1.1, communal ? 1.02 : 0.76, 0xc8ab78);
        box(furniture, communal ? 'stool' : 'padded-chair', 1.3, z, 0.46, 0.5, communal ? 0.76 : 0.84, 0x3d5674, 0, Math.PI / 2);
        if (communal) box(furniture, 'stool', 1.3, z + 0.65, 0.46, 0.5, 0.76, 0x3d5674, 0, Math.PI / 2);
        box(details, 'noodle-bowl', 2.05, z - 0.2, 0.29, 0.29, 0.14, 0xe9e1ca, table.height);
        box(details, 'chopsticks', 1.9, z + 0.04, 0.17, 0.025, 0.015, 0xb1814a, table.height + 0.02);
        box(details, 'condiments', 2.05, z + 0.33, 0.25, 0.15, 0.2, 0x815239, table.height);
      }
    } else {
      box(furniture, 'counter', width / 2 - 1.15, depth - 2.2, 1.7, 1, 1.05, 0x9a7e59);
      counter = { ...worldPoint(origin, width / 2 - 1.15, depth - 3.15), y: floorY, yaw: origin.yaw, radius: 1.6 };
      for (const side of [-1, 1]) box(furniture, 'shelves', side * (width / 2 - 0.55), depth / 2 - 0.7, 0.65, 4, 1.75, 0x8e8d73);
      if (width > 7) box(furniture, 'shelves', -0.7, depth / 2, 0.85, 2.8, 1.4, 0x8e8d73);
      rooms.push({ kind: 'shop', ...worldPoint(origin, 0, depth / 2), width, depth });
      station('stock', 'stock', 'Sort the shelf stock', width / 2 - 1.55, 3.8, Math.PI / 2);
    }
    return freeze({ id: entry.id, buildingId: entry.buildingId, ...(['mall', 'gym'].includes(entry.type) ? {} : { storeId: entry.storeId || null }),
      ...(entry.serviceId ? { serviceId: entry.serviceId } : {}),
      type: entry.type, ...(entry.variant ? { variant: entry.variant } : {}), name: entry.name, origin, width, depth, floorY, spawn, exit, counter,
      walls, doors, furniture, rooms, activities, ...(exercise ? { exercise } : {}), ...(details.length ? { details } : {}), layoutNote: 'Original plausible layout; not a surveyed interior.' });
  }
  function enter(entry, actor) {
    if (active || !actor || !entries.includes(entry) || findEntry(actor) !== entry) return false;
    outside = { x: actor.x, z: actor.z, yaw: actor.yaw, y: actor.y };
    active = build(entry); generatedPlans++;
    Object.assign(actor, active.spawn, { speed: 0 });
    return active;
  }
  function leave(actor) {
    if (!active || !actor) return false;
    Object.assign(actor, outside, { speed: 0 });
    active = null; outside = null;
    return true;
  }
  function nearExit(pose, radius = 1.8) {
    return Boolean(active && validPoint(pose) && Number.isFinite(radius) && radius > 0 && distance(active.exit, pose) <= radius);
  }
  function clear(p, radius) {
    const q = localPoint(active.origin, p);
    if (q.x < -active.width / 2 + radius || q.x > active.width / 2 - radius || q.z < radius || q.z > active.depth - radius) return false;
    return ![...active.walls, ...active.furniture].some(box => contact(p, box, radius));
  }
  function moveActor(actor, dx, dz, radius = 0.45) {
    if (!active || !validPoint(actor) || ![dx, dz, radius].every(Number.isFinite) || radius <= 0) return { moved: false, blocked: true, distance: 0 };
    radius = clamp(radius, 0.1, 2);
    const before = { x: actor.x, z: actor.z }, length = Math.hypot(dx, dz), scale = length > 8 ? 8 / length : 1;
    dx *= scale; dz *= scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.min(0.2, radius * 0.5)));
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const x = actor.x + dx / steps, z = actor.z + dz / steps;
      if (clear({ x, z }, radius)) { actor.x = x; actor.z = z; }
      else {
        blocked = true;
        if (clear({ x, z: actor.z }, radius)) actor.x = x;
        else if (clear({ x: actor.x, z }, radius)) actor.z = z;
      }
    }
    actor.y = active.floorY;
    const movedDistance = distance(before, actor);
    return { moved: movedDistance > 0.00001, blocked, distance: movedDistance, x: actor.x, z: actor.z };
  }
  function hasLineOfSight(a, b) {
    if (!active || !validPoint(a) || !validPoint(b)) return false;
    const inBounds = p => {
      const q = localPoint(active.origin, p);
      return Math.abs(q.x) < active.width / 2 && q.z > 0 && q.z < active.depth;
    };
    if (!inBounds(a) || !inBounds(b)) return false;
    // Slab clipping tests the segment against each oriented solid, including thin walls.
    for (const box of [...active.walls, ...active.furniture.filter(f => f.height >= 1.5)]) {
      const p = localPoint(box, a), q = localPoint(box, b);
      let min = 0, max = 1;
      for (const [axis, half] of [['x', box.width / 2], ['z', box.depth / 2]]) {
        const delta = q[axis] - p[axis];
        if (Math.abs(delta) < 1e-9) { if (Math.abs(p[axis]) > half) { min = 2; break; } }
        else {
          const t1 = (-half - p[axis]) / delta, t2 = (half - p[axis]) / delta;
          min = Math.max(min, Math.min(t1, t2)); max = Math.min(max, Math.max(t1, t2));
        }
      }
      if (min <= max) return false;
    }
    return true;
  }
  return { entries, findEntry, enter, leave, nearExit, moveActor, hasLineOfSight,
    snapshot: () => ({ active: active?.id || null, buildingId: active?.buildingId || null, type: active?.type || null,
      descriptors: entries.length, generatedPlans, activePlans: active ? 1 : 0 }),
    reset(actor) { if (active && actor) return leave(actor); active = null; outside = null; return true; },
    get active() { return active; },
    get stats() { return { descriptors: entries.length, generatedPlans, activePlans: active ? 1 : 0 }; } };
}
