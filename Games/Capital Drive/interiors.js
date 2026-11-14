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

export function createInteriors(map, { heightAt = () => 0, stores = [], publicEntries = [] } = {}) {
  const buildings = new Map((map.buildings || []).map(b => [String(b.id), b]));
  const entries = [], index = new Map(), identities = new Set();
  const storeBuildings = new Set(stores.map(s => String(s.buildingId)));
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
    if (!building || storeBuildings.has(String(building.id)) ||
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
    if (entry.type !== 'mall' || !entry.id || !validPoint(entry) || !building?.points?.length) continue;
    // Public entries must be tied to a real exterior edge, never a map-only travel target.
    const onFacade = building.points.some((a, i, points) => {
      const b = points[(i + 1) % points.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = clamp(((entry.x - a[0]) * dx + (entry.z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      return Math.hypot(entry.x - a[0] - t * dx, entry.z - a[1] - t * dz) < 0.4;
    });
    if (!onFacade) continue;
    add({ id: entry.id, buildingId: building.id, type: 'mall', name: entry.name || 'Shopping concourse',
      x: entry.x, z: entry.z, yaw: entry.yaw, width: 24, depth: 26 });
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
    const walls = [], furniture = [], doors = [], rooms = [], details = [];
    function box(list, kind, x, z, w, d, h, color, y = 0, yaw = 0) {
      const p = worldPoint(origin, x, z);
      const item = { ...p, yaw: origin.yaw + yaw, width: w, depth: d, height: h, y: floorY + y, kind, color };
      list.push(item); return item;
    }
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
    let counter = null;
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
        }
        for (const z of [2, 13, 24]) wall(centreX, z, unitWidth, 0.16);
        box(furniture, 'bench', side * 1.85, 13, 0.75, 2.6, 0.65, 0x938268);
      }
    } else if (entry.variant === 'noodles') {
      rooms.push({ kind: 'noodle-dining', ...worldPoint(origin, 0, 4.35), width, depth: 8.7 },
        { kind: 'noodle-kitchen', ...worldPoint(origin, 0, 10.5), width, depth: 3 });
      // Reference material cues only: original seating, room arrangement and abstract bowl motifs.
      // The central 2.1m aisle and first 2m by the public door stay free of furniture.
      for (const side of [-1, 1]) {
        box(furniture, 'banquette', side * (width / 2 - 0.42), side < 0 ? 4.9 : 3.5, 0.7, side < 0 ? 5.4 : 2.4, 0.92, 0xda713b, 0, side < 0 ? 0 : Math.PI);
        for (const z of [3.4, 6.2]) {
          const communal = side > 0 && z > 5;
          const table = box(furniture, communal ? 'communal-table' : 'noodle-table', side * 2.05, z, 0.95, communal ? 1.8 : 1.1, communal ? 1.02 : 0.76, 0xc8ab78);
          box(furniture, communal ? 'stool' : 'padded-chair', side * 1.3, z, 0.46, 0.5, communal ? 0.76 : 0.84, 0x3d5674, 0, side < 0 ? -Math.PI / 2 : Math.PI / 2);
          if (communal) box(furniture, 'stool', side * 1.3, z + 0.65, 0.46, 0.5, 0.76, 0x3d5674);
          box(details, 'noodle-bowl', side * 2.05, z - 0.2, 0.29, 0.29, 0.14, 0xe9e1ca, table.height);
          box(details, 'chopsticks', side * 1.9, z + 0.04, 0.17, 0.025, 0.015, 0xb1814a, table.height + 0.02);
          box(details, 'condiments', side * 2.05, z + 0.33, 0.25, 0.15, 0.2, 0x815239, table.height);
        }
      }
      box(furniture, 'kitchen-pass', 0.6, 9.2, width - 2, 0.7, 1.02, 0xb5996d);
      counter = { ...worldPoint(origin, 0, 8.1), y: floorY, yaw: origin.yaw, radius: 1.6 };
      box(furniture, 'noodle-station', -0.85, 10.9, 2.2, 0.85, 0.94, 0xa6afaa);
      box(furniture, 'prep-bench', width / 2 - 1.05, 10.9, 1.4, 0.85, 0.94, 0xb4b8aa);
    } else {
      box(furniture, 'counter', width / 2 - 1.15, depth - 2.2, 1.7, 1, 1.05, 0x9a7e59);
      counter = { ...worldPoint(origin, width / 2 - 1.15, depth - 3.15), y: floorY, yaw: origin.yaw, radius: 1.6 };
      for (const side of [-1, 1]) box(furniture, 'shelves', side * (width / 2 - 0.55), depth / 2 - 0.7, 0.65, 4, 1.75, 0x8e8d73);
      if (width > 7) box(furniture, 'shelves', -0.7, depth / 2, 0.85, 2.8, 1.4, 0x8e8d73);
      rooms.push({ kind: 'shop', ...worldPoint(origin, 0, depth / 2), width, depth });
    }
    return freeze({ id: entry.id, buildingId: entry.buildingId, ...(entry.type === 'mall' ? {} : { storeId: entry.storeId || null }),
      type: entry.type, ...(entry.variant ? { variant: entry.variant } : {}), name: entry.name, origin, width, depth, floorY, spawn, exit, counter,
      walls, doors, furniture, rooms, ...(details.length ? { details } : {}), layoutNote: 'Original plausible layout; not a surveyed interior.' });
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
