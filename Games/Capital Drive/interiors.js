import { createInteriorCollider } from './interior-navigation.js';
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

// One small authored route source serves boot-time contracts and the lazy room.
// Coordinates describe this original game gallery, not a real interior.
const MEMORIAL_GALLERY_ACTIONS = freeze([
  { id: 'visitor-ledger', role: 'scout', label: 'Visitor ledger', x: -3, z: 1.6, yaw: 0 },
  { id: 'gallery-desk', role: 'pass', label: 'Gallery desk', x: 3, z: 1.8, yaw: Math.PI / 2 },
  { id: 'exhibit-register', role: 'evidence', label: 'Exhibit register', x: -2.3, z: 4.7, yaw: -Math.PI / 2 },
  { id: 'exhibition-case', role: 'evidence', label: 'Exhibition case', x: 0, z: 4.1, yaw: 0 },
  { id: 'registrar-handover', role: 'handoff', label: 'Ledger handover', x: -2, z: 6.6, yaw: -Math.PI / 2 },
  { id: 'dispatch-papers', role: 'handoff', label: 'Dispatch papers', x: 3.1, z: 6.55, yaw: Math.PI / 2 },
]);
export function memorialGalleryActions(origin, floorY = 0) {
  if (!origin || ![origin.x, origin.z, origin.yaw, floorY].every(Number.isFinite)) return Object.freeze([]);
  return freeze(MEMORIAL_GALLERY_ACTIONS.map(action => ({ ...action, ...worldPoint(origin, action.x, action.z),
    y: floorY, yaw: origin.yaw + action.yaw, radius: .8 })));
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

// ACT education body retained by CAMPUS_BUILDING_IDS in campus.js. The public
// approach uses its existing estimated gate 11; no real interior/door survey.
const SCHOOL_BUILDING_ID = 'act-101001-0';
const SCHOOL_GATE = Object.freeze({ id: 'telopea-gate-11', x: -337.1471913484226, z: -385.02882626688034 });
export function createSchoolEntry(map) {
  const building = (map?.buildings || []).find(b => b.id === SCHOOL_BUILDING_ID && b.type === 'education');
  if (!building?.points?.length) return null;
  const width = 12, depth = 16;
  let best = null, bestDistance = Infinity;
  const nearby = (map.buildings || []).filter(b => b.points?.some(([x, z]) => Math.hypot(x - SCHOOL_GATE.x, z - SCHOOL_GATE.z) < 150));
  const clear = p => !nearby.some(b => b.points?.length &&
    (insideOutline(p.x, p.z, b.points) || b.points.some((a, i) =>
      distance(p, projectSegment(p.x, p.z, a, b.points[(i + 1) % b.points.length])) < .55)));
  for (let i = 0; i < building.points.length - 1; i++) {
    const a = building.points[i], b = building.points[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < width + 2) continue;
    const p = projectSegment(SCHOOL_GATE.x, SCHOOL_GATE.z, a, b, .35, .65);
    let nx = -dz / length, nz = dx / length;
    if (!insideOutline(p.x + nx * .35, p.z + nz * .35, building.points)) { nx = -nx; nz = -nz; }
    const origin = { ...p, yaw: Math.atan2(nx, nz) };
    // Keep this original playable room within the retained body.
    if (![-width / 2, 0, width / 2].every(x => [.3, depth / 2, depth].every(z => {
      const q = worldPoint(origin, x, z); return insideOutline(q.x, q.z, building.points);
    }))) continue;
    const approach = worldPoint(origin, 0, -1.6);
    let accessible = true;
    const steps = Math.ceil(distance(SCHOOL_GATE, approach) / .35);
    for (let step = 1; step <= steps; step++) {
      const t = step / steps, q = { x: SCHOOL_GATE.x + (approach.x - SCHOOL_GATE.x) * t,
        z: SCHOOL_GATE.z + (approach.z - SCHOOL_GATE.z) * t };
      if (!clear(q)) { accessible = false; break; }
    }
    const d = distance(SCHOOL_GATE, approach);
    if (accessible && d < bestDistance) {
      bestDistance = d;
      best = { id: 'interior-telopea-school', schoolId: 'telopea-school', type: 'school',
        name: 'Telopea after-hours wing', buildingId: building.id, ...origin, width, depth,
        gateId: SCHOOL_GATE.id, approach, estimated: true };
    }
  }
  return best ? freeze(best) : null;
}

// IDs refer to retained source shops, never a name substring or doorway width.
const STORE_ARCHETYPES = Object.freeze({
  'store-358293199': 'grocery', 'store-6275666787': 'grocery',
  'store-318857045': 'fast-food', 'store-4069724219': 'fast-food', 'store-9470234894': 'fast-food',
  'store-318857112': 'cafe', 'store-318857132': 'cafe', 'store-330163582': 'cafe',
  'store-4069716453': 'cafe', 'store-4069716454': 'cafe', 'store-4069717184': 'cafe',
  'store-4069717215': 'cafe', 'store-4115262967': 'cafe', 'store-4926066423': 'cafe',
  'store-8196052995': 'cafe', 'store-2161998101': 'cafe', 'store-11906941518': 'grocery',
});
// A playable portion of the retained wing, tested inside its source outline.
// This is not a reconstruction of Canberra Centre's tenancy/corridor plan.
function mallDimensions(entry, building) {
  const points = building.points.map(([x, z]) => localPoint(entry, { x, z }));
  const extent = { width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
    depth: Math.max(...points.map(p => p.z)) - Math.min(...points.map(p => p.z)) };
  let width = 24, depth = 26;
  for (let candidate = 26; candidate <= 78; candidate += 2) {
    if ([-candidate / 2, candidate / 2].every(x => [0.3, 13, 26].every(z => {
      const p = worldPoint(entry, x, z); return insideOutline(p.x, p.z, building.points);
    }))) width = candidate; else break;
  }
  for (let candidate = 28; candidate <= 58; candidate += 2) {
    if ([-width / 2, 0, width / 2].every(x => [candidate - 1, candidate].every(z => {
      const p = worldPoint(entry, x, z); return insideOutline(p.x, p.z, building.points);
    }))) depth = candidate; else break;
  }
  return { width, depth, sourceExtent: extent };
}

export function createInteriors(map, { heightAt = () => 0, stores = [], publicEntries = [], heistSites = [] } = {}) {
  const buildings = new Map((map.buildings || []).map(b => [String(b.id), b]));
  const entries = [], index = new Map(), identities = new Set();
  const occupiedBuildings = new Set([...stores, ...publicEntries.filter(e => ['gym', 'mall', 'school'].includes(e.type))].map(s => String(s.buildingId)));
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
    if (!building || !building.points?.length || occupiedBuildings.has(String(building.id)) ||
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
      variant: noodles ? 'noodles' : STORE_ARCHETYPES[store.id] || 'retail',
      width: noodles ? clamp(f.width || 7.5, 7.2, 8.5) : clamp((f.width || 7) * 0.9, 5.4, 12), depth: noodles ? 16 : 10 });
  }
  for (const entry of publicEntries) {
    const building = buildings.get(String(entry.buildingId));
    if (!['mall', 'gym', 'school'].includes(entry.type) || !entry.id || !validPoint(entry) || !building?.points?.length) continue;
    // Public entries must be tied to a real exterior edge, never a map-only travel target.
    const onFacade = building.points.some((a, i, points) => {
      const b = points[(i + 1) % points.length], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = clamp(((entry.x - a[0]) * dx + (entry.z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      return Math.hypot(entry.x - a[0] - t * dx, entry.z - a[1] - t * dz) < 0.4;
    });
    if (!onFacade || entry.type === 'school' && (entry.id !== 'interior-telopea-school' || building.id !== SCHOOL_BUILDING_ID)) continue;
    add({ id: entry.id, buildingId: building.id, type: entry.type, name: entry.name || (entry.type === 'gym' ? 'Kingston gym' : 'Shopping concourse'),
      ...(entry.type === 'gym' ? { serviceId: entry.serviceId } : entry.type === 'school' ? { schoolId: 'telopea-school' } : {}),
      x: entry.x, z: entry.z, yaw: entry.yaw, ...(entry.type === 'mall' ? mallDimensions(entry, building) : { width: entry.type === 'school' ? 12 : 14, depth: 16 }) });
  }
  // These original heist exteriors own their geometry and collision; rooms are fictional.
  // Use that exact front door rather than treating the approach pin as a facade.
  for (const site of heistSites) {
    if (!site || !['bank', 'jeweller', 'tower', 'memorial'].includes(site.kind) || typeof site.id !== 'string' ||
        typeof site.point !== 'function' || ![site.yaw, site.width, site.depth, site.floor].every(Number.isFinite) ||
        site.width < 8 || site.depth < (site.kind === 'tower' ? 7 : 6)) continue;
    const front = site.point(0, 0);
    if (!validPoint(front)) continue;
    add({ id: `interior-${site.id}`, buildingId: site.sourceBuildingId || `${site.id}-walls`, storeId: site.id,
      serviceId: site.id, heistSiteId: site.id, type: 'shop', variant: site.kind, name: site.name,vaultPuzzle:site.vaultPuzzle===true,
      ...front, yaw: site.yaw + Math.PI, width: site.width, depth: site.depth, floorY: site.floor + .14 });
  }
  Object.freeze(entries);
  let active = null, collider = null, outside = null, generatedPlans = 0;
  function findEntry(pose, { exteriorPreview = false } = {}) {
    if ((active && !exteriorPreview) || !validPoint(pose)) return null;
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
    let { width, depth } = entry;
    const floorY = entry.floorY ?? entry.y + 0.14;
    // Story homes are bound after exterior descriptors exist. Read the binding
    // only on entry, so ordinary houses keep their original lazy room plans.
    const home = map.storyHomes?.basement;
    const storyHome = entry.type === 'house' && home?.roomId === entry.id &&
      String(home.buildingId) === String(entry.buildingId) ? home : null;
    const origin = { x: entry.x, z: entry.z, yaw: entry.yaw };
    const source = entry.type === 'house' ? buildings.get(String(entry.buildingId)) : null;
    const footprint = source?.points?.map(([x, z]) => localPoint(origin, { x, z }));
    if (footprint?.length > 3 && distance(footprint[0], footprint.at(-1)) < 1e-7) footprint.pop();
    const bounds = footprint ? { minX: Math.min(...footprint.map(p => p.x)), maxX: Math.max(...footprint.map(p => p.x)),
      minZ: Math.min(...footprint.map(p => p.z)), maxZ: Math.max(...footprint.map(p => p.z)) } : null;
    const outline = footprint?.map(p => [p.x, p.z]);
    function fits(x, z, w = 0, d = 0, margin = .12) {
      if (!outline) return true;
      // Sample complete rectangle edges as well as corners across concave notches.
      for (let side = 0; side < 4; side++) for (let i = 0; i <= Math.ceil(Math.max(w, d) / .2); i++) {
        const t = i / Math.max(1, Math.ceil(Math.max(w, d) / .2));
        const px = x + (side < 2 ? (side ? 1 : -1) * (w / 2 + margin) : (t * 2 - 1) * (w / 2 + margin));
        const pz = z + (side >= 2 ? (side === 3 ? 1 : -1) * (d / 2 + margin) : (t * 2 - 1) * (d / 2 + margin));
        if (!insideOutline(px, pz, outline)) return false;
      }
      return true;
    }
    const templateFits = !footprint || fits(0, 6.2, 10.8, 12.4, -.01);
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
    const gap = entry.heistSiteId ? (entry.variant === 'bank' ? 2.34 : 1.74) : entry.variant === 'noodles' ? 2 : 1.5, sideWidth = (width - gap) / 2;
    const commonShop=entry.type==='shop'&&!entry.heistSiteId&&['cafe','grocery','retail'].includes(entry.variant);
    const frontWindow=centre=>{
      box(walls,'window-sill',centre,0,sideWidth,.16,.85,0xd6ccba);
      box(walls,'window-lintel',centre,0,sideWidth,.16,.4,0xd6ccba,2.25);
      for(const side of [-1,1])box(walls,'window-post',centre+side*(sideWidth/2-.06),0,.12,.16,1.4,0xd6ccba,.85);
      box(details,'shop-window',centre,.06,sideWidth-.16,.08,1.32,0x9bb5b0,.89);
    };
    if (footprint) {
      // The imported outline is the physical shell; the interior layout remains original.
      let nearest = 0, best = Infinity, projection = null;
      for (let i = 0; i < outline.length; i++) {
        const p = projectSegment(0, 0, outline[i], outline[(i + 1) % outline.length]);
        const d = Math.hypot(p.x, p.z);
        if (d < best) { best = d; nearest = i; projection = p; }
      }
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i], b = outline[(i + 1) % outline.length], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
        if (length < .001) continue;
        const parts = i === nearest ? [[0, Math.max(0, Math.hypot(projection.x - a[0], projection.z - a[1]) - gap / 2)],
          [Math.min(length, Math.hypot(projection.x - a[0], projection.z - a[1]) + gap / 2), length]] : [[0, length]];
        for (const [from, to] of parts) if (to - from > .001) box(walls, 'wall', a[0] + dx * (from + to) / (2 * length),
          a[1] + dz * (from + to) / (2 * length), to - from, .16, 2.65, 0xd6ccba, 0, Math.atan2(-dz, dx));
      }
    } else if (entry.variant === 'noodles') {
      const centre = -(width + gap) / 4;
      box(walls, 'window-sill', centre, 0, sideWidth, 0.16, 0.85, 0xd6ccba);
      box(walls, 'window-lintel', centre, 0, sideWidth, 0.16, 0.4, 0xd6ccba, 2.25);
      for (const side of [-1, 1]) box(walls, 'window-post', centre + side * (sideWidth / 2 - 0.07), 0,
        0.14, 0.16, 1.4, 0xd6ccba, 0.85);
    } else if(commonShop)frontWindow(-(width+gap)/4);
    else wall(-(width + gap) / 4, 0, sideWidth, 0.16);
    if (!footprint) {
      if(commonShop)frontWindow((width+gap)/4);else wall((width + gap) / 4, 0, sideWidth, 0.16);
      wall(-width / 2, depth / 2, 0.16, depth);
      wall(width / 2, depth / 2, 0.16, depth);
      wall(0, depth, width, 0.16);
    }
    const exit = door('exit', 0, 0.9, gap);
    const spawn = { ...worldPoint(origin, 0, 1.65), y: floorY, yaw: origin.yaw + Math.PI };
    let counter = null, exercise = null, noodleCook = null, boothGuest = null, heist = null;
    if (entry.type === 'house' && !templateFits) {
      buildFittedHouse();
    } else if (entry.type === 'house') {
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
      if (storyHome) {
        // Fictional mission furniture at the hall end, clear of all four doors.
        furnish('ledger-case', 0, depth - .7, .65, .5, .68, 0x5c7067);
        station('stash', 'stock', 'Pack the ledger case', 0, depth - 1.75, 0, 1.2);
      }
    } else if (entry.heistSiteId) {
      const bank = entry.variant === 'bank', tower = entry.variant === 'tower',memorial=entry.variant==='memorial';
      rooms.push({ kind: bank ? 'bank-lobby' : tower ? 'tower-archive' : memorial?'memorial-gallery':'jeweller-showroom', ...worldPoint(origin, 0, depth / 2), width, depth });
      const employeeX = bank ? -2.8 : memorial?-3.7:-1.8, employeeZ = bank ? 5.65 : memorial?depth-.75:5.6;
      if (bank) {
        box(furniture, 'teller-counter', -2.8, 4.6, 4.2, .8, 1.05, 0x8d7860);
        for (const side of [-1, 1]) box(furniture, 'bench', side * 5.15, 2.6, .8, 1.9, .65, 0x52667a);
        box(furniture, 'writing-table', 2.4, 2.7, 1.6, .8, 1.02, 0xa38d6e);
        box(details,'release-console',2.4,2.7,.62,.34,.42,0x536b72,1.08);
        box(furniture, 'cash-safe', 4.8, 5.65, 1.2, 1.4, 1.9, 0x67727a);
        const vaultLabel=box(details,'shop-sign',4.8,4.92,.88,.025,.25,0x35454c,1.4);vaultLabel.label='VAULT';
        box(furniture, 'document-cabinet', -5.5, 6.25, .65, 1.5, 1.75, 0xa4a597);
        counter = { ...worldPoint(origin, -2.8, 3.5), y: floorY, yaw: origin.yaw, radius: 1.4 };
      } else if (tower) {
        // Original archive props, not a real tower floorplan or security layout.
        box(furniture, 'archive-desk', -2.3, 4.65, 3.1, .7, 1.03, 0x687469);
        box(furniture, 'document-cabinet', -width / 2 + .55, depth - 1, .65, 1.1, 1.75, 0x929b8d);
        box(furniture, 'ledger-case', 2.05, depth - .7, .7, .45, .68, 0x66523e);
        box(furniture,'observation-console',width/2-.7,2.6,.65,2,.95,0x7d8d85);
        const title=box(details,'shop-sign',0,depth-.11,5.9,.05,.55,0x354b4b,1.95);title.label='BLACK MOUNTAIN TOWER';
        box(details,'observation-window',width/2-.11,3.8,.055,4.8,1.2,0x92a5a1,.98);
        for(const z of [2,5.5])box(details,'shop-light',0,z,1.3,.55,.08,0xf0e4b9,2.5);
        counter = { ...worldPoint(origin, -1.8, 3.6), y: floorY, yaw: origin.yaw, radius: 1.4 };
      } else if(memorial) {
        // Original exhibition gallery with two clear aisles and a rear records desk.
        box(furniture,'gallery-ledger-desk',-3.3,2.7,1.7,.65,.9,0x82765c);
        box(furniture,'gallery-info-desk',4.3,2.5,1.1,.8,.95,0x65796f);
        box(furniture,'exhibition-case',-4.55,4.6,.8,2.6,1.2,0x6e7f78);
        box(furniture,'exhibition-case',0,5.3,2.2,1,1.2,0x687d75);
        box(furniture,'gallery-display',4.5,4.5,.8,1.1,1.55,0x8e9382);
        box(furniture,'registrar-desk',-3.7,6.6,1.6,.65,.9,0x82765c);
        box(furniture,'dispatch-table',4.35,6.55,1,1.5,.88,0x9c896a);
        box(furniture,'document-cabinet',1.1,depth-.65,1.8,.5,1.7,0x89938a);
        counter={...worldPoint(origin,-3.25,5.45),y:floorY,yaw:origin.yaw,radius:1.3};
        const sign=box(details,'shop-sign',0,depth-.11,3.9,.05,.55,0x354b4b,1.95);sign.label='GALLERY';
        for(const side of [-1,1]){
          const panel=box(details,'gallery-panel',side*(width/2-.12),4.6,.06,2.7,1.1,0x536a68,1.1);panel.face=-side;
        }
        for(const [x,z] of [[-3,1.2],[2.4,2.6],[0,5.3]])box(details,'shop-light',x,z,1.3,.55,.08,0xf0e4b9,2.5);
        for(const x of [-1.65,1.65])box(details,'shop-aisle',x,depth/2,.035,depth-1,.008,0x9b8b6d,.018);
      } else {
        box(furniture, 'jeweller-counter', -2.3, 4.65, 3.1, .7, 1.03, 0x65505e);
        for (const side of [-1, 1]) box(furniture, 'jewellery-case', side * 3.65, 3.1, 1.25, 2.5, 1.12, 0x79636c);
        box(furniture, 'jewellery-case', 3.65, 5.05, 1.25, .9, 1.12, 0x79636c);
        box(furniture, 'jewel-safe', -4.55, 5.3, .75, .85, 1.45, 0x665861);
        counter = { ...worldPoint(origin, -1.8, 3.6), y: floorY, yaw: origin.yaw, radius: 1.4 };
      }
      const anchors=memorial?memorialGalleryActions(origin,floorY):null;
      const loot = { id: `${entry.id}-loot`, ...worldPoint(origin, bank ? 3.45 : memorial?0:2.05, bank ? 5.65 : memorial?4.1:5.05), y: floorY,
        yaw: origin.yaw + Math.PI / 2, radius: bank ? .75 : 1.4 };
      if(memorial)Object.assign(loot,anchors[3],{id:`${entry.id}-loot`,radius:1.4,label:'Exhibition case',variant:'exhibit'});
      heist = { siteId: entry.heistSiteId, kind: entry.variant,
        employee: { id: `${entry.id}-employee`, character: 'heist-employee', ...worldPoint(origin, employeeX, employeeZ),
          y: floorY, yaw: origin.yaw + Math.PI,...(memorial?{label:'Fictional gallery registrar'}:{}) }, loot,
        ...(bank?{console:{id:`${entry.id}-console`,...worldPoint(origin,2.4,4),y:floorY,radius:.85,label:entry.vaultPuzzle?'Vault console':'Cash release console'}}:{}),
        ...(memorial?{anchors}:{}) };
    } else if (entry.type === 'mall') {
      const hall = 10, unitWidth = (width - hall) / 2, unitDepth = (depth - 6) / 2, unitGap = 5;
      const centres = [3 + unitDepth / 2, 3 + unitDepth * 1.5];
      rooms.push({ kind: 'concourse', ...worldPoint(origin, 0, depth / 2), width: hall, depth });
      for (const side of [-1, 1]) {
        const wallX = side * hall / 2, centreX = side * (hall / 2 + unitWidth / 2);
        for (const [i, centreZ] of centres.entries()) {
          const unitId = `unit-${side < 0 ? 'west' : 'east'}-${i}`;
          rooms.push({ id: unitId, kind: 'mall-unit', ...worldPoint(origin, centreX, centreZ), width: unitWidth, depth: unitDepth });
          const segmentLength = (unitDepth - unitGap) / 2;
          wall(wallX, centreZ - (unitDepth + unitGap) / 4, 0.16, segmentLength);
          wall(wallX, centreZ + (unitDepth + unitGap) / 4, 0.16, segmentLength);
          door('unit', wallX, centreZ, unitGap);
          box(furniture, 'shelves', side * (width / 2 - 0.8), centreZ, 0.7, Math.min(unitDepth - 3, 8), 1.75, 0x8e8d73);
          box(furniture, 'counter', centreX, centreZ + unitDepth / 2 - 2, 2.4, 0.9, 1.05, 0xa08a68);
          station(`${unitId}-stock`, 'stock', 'Sort the shop stock', centreX, centreZ + unitDepth / 2 - 3.2);
          if (side < 0 && i === 1) {
            // Fictional office corner for the campaign, not an actual centre tenant.
            box(furniture, 'office-desk', centreX - 3, centreZ, 2, 1, 0.76, 0xaa9473);
            box(furniture, 'chair', centreX - 3, centreZ + 1, 0.6, 0.6, 0.85, 0x65736f);
            station('powerpunt', 'presentation', 'PowerPunt workstation', centreX - 3, centreZ - 1.3, 0, 1.25);
          }
          if (side < 0 && i === 0) {
            box(furniture, 'arcade', centreX - 1.9, centreZ + 2, 0.85, 0.85, 1.65, 0x766a86);
            station('arcade', 'arcade', 'Play the arcade cabinet', centreX - 1.9, centreZ + 0.9);
          }
        }
        for (const z of [3, depth / 2, depth - 3]) wall(centreX, z, unitWidth, 0.16);
        box(furniture, 'bench', side * 3.8, depth / 2, 0.75, 2.6, 0.65, 0x938268);
      }
    } else if (entry.type === 'school') {
      // Original small after-hours wing, never a copy of a private school plan.
      rooms.push({ kind: 'school-corridor', ...worldPoint(origin, 0, 8), width: 3.2, depth },
        { kind: 'classroom', ...worldPoint(origin, -3.8, 8), width: 4.4, depth },
        { kind: 'staff-area', ...worldPoint(origin, 3.8, 8), width: 4.4, depth });
      for (const side of [-1, 1]) {
        wall(side * 1.6, 2.25, .14, 4.5);
        wall(side * 1.6, 11.25, .14, 9.5);
        door(side < 0 ? 'classroom' : 'staff-area', side * 1.6, 5.5, 2);
      }
      for (const z of [3.3, 9.5, 12.7]) {
        box(furniture, 'school-desk', -4.1, z, 2.1, .85, .76, 0xb5a17d);
        box(furniture, 'padded-chair', -4.1, z + .9, .5, .5, .84, 0x6b7d75);
      }
      box(furniture, 'classroom-board', -4, 15.6, 3, .14, 1.2, 0x4b625c, .95);
      box(furniture, 'office-desk', 4.2, 11, 2, 1, .76, 0xb5a17d);
      box(furniture, 'padded-chair', 4.2, 12, .55, .55, .84, 0x6b7d75);
      box(furniture, 'lockers', 5.5, 3.4, .65, 3.4, 1.95, 0xa3aba2);
      // Stylised fictional prop and simple game-key task, without device details.
      box(furniture, 'alarm-panel', 1.43, 9, .18, .48, .48, 0xb8493f, 1.05);
      station('alarm', 'alarm', 'School fire alarm', .5, 9, Math.PI / 2, 1.25);
    } else if (entry.type === 'gym') {
      rooms.push({ kind: 'gym-floor', ...worldPoint(origin, 0, depth / 2), width, depth });
      box(furniture, 'counter', 3.8, 3.1, 2.2, 0.8, 1.05, 0xaaa18a);
      counter = { ...worldPoint(origin, 3.8, 2.05), y: floorY, yaw: origin.yaw, radius: 1.4 };
      const bench = box(furniture, 'exercise-bench', -2.4, 7.1, 0.68, 2.2, 0.52, 0x496b7b);
      for (const side of [-1, 1]) box(furniture, 'bench-rack', -2.4 + side * 1.05, 7.85, 0.16, 0.6, 1.65, 0x606b6d);
      box(furniture, 'weight-rack', -4.9, 11.1, 0.8, 3.3, 1.25, 0x6b7472);
      box(furniture, 'treadmill', 4.8, 7.1, 1.2, 2.4, 1.35, 0x626c6e);
      box(furniture, 'exercise-mat', 4.8, 13.3, 1.2, 1.8, 0.04, 0x718477);
      box(furniture, 'lockers', 0, 15.3, 3.8, 0.7, 2, 0xa8b1a8);
      const approach = worldPoint(origin, -0.8, 7.1);
      exercise = { x: bench.x, z: bench.z, y: floorY + bench.height, yaw: bench.yaw,
        width: bench.width, depth: bench.depth, height: bench.height, approachX: approach.x, approachZ: approach.z };
      station('bench', 'bench', 'Bench press: six controlled reps', -0.8, 7.1, -Math.PI / 2, 1.25);
      station('treadmill', 'treadmill', 'Treadmill: alternate your steps', 3.1, 7.1, Math.PI / 2, 1.25);
      box(furniture, 'curl-rack', -3.1, 13.3, 1.5, 0.7, 1.1, 0x606b6d);
      station('curls', 'curls', 'Dumbbells: controlled alternating curls', -3.1, 12.1, Math.PI, 1.25);
      box(furniture, 'rower', 1.6, 11.5, 0.85, 2.8, 0.75, 0x626c6e);
      station('rower', 'rower', 'Rowing machine: drive and return', 0.1, 11.5, Math.PI / 2, 1.25);
    } else if (entry.variant === 'noodles') {
      // Official Canberra interior references establish relative sides, not a surveyed floorplan.
      const kitchenWidth = width / 2 - 1.125;
      rooms.push({ kind: 'noodle-dining', ...worldPoint(origin, (width / 2 - 1.125) / 2, 6), width: width - kitchenWidth, depth },
        { kind: 'noodle-kitchen', ...worldPoint(origin, -(width / 2 + 1.125) / 2, 6), width: kitchenWidth, depth });
      // A long left-hand service pass opens onto stainless preparation stations.
      // Furniture leaves the central 2.1m aisle and first 2m by the public door clear.
      box(furniture, 'kitchen-pass', -1.45, depth / 2 + .1, 0.65, depth - 4.4, 1.02, 0xb5996d);
      const kitchenX = -width / 2 + 0.25;
      box(furniture, 'noodle-station', kitchenX, 3.9, 0.34, 2.4, 0.94, 0xa6afaa);
      box(furniture, 'prep-bench', kitchenX, 7.8, 0.34, 3.8, 0.94, 0xb4b8aa);
      counter = { ...worldPoint(origin, -0.55, 4.2), y: floorY, yaw: origin.yaw - Math.PI / 2, radius: 1.25 };
      station('noodle-order', 'noodle', 'Prepare the noodle order', -0.55, 4.2, -Math.PI / 2, 1.25);
      // Dining and blue seats sit to the right, with the orange booth toward the back.
      box(furniture, 'banquette', width / 2 - 0.42, depth - 1.7, 0.7, 2.9, 0.92, 0xda713b, 0, Math.PI);
      const boothRow = depth - 1.4, rows = [];
      for (let z = 3.4; z <= boothRow - 2.4; z += 2.4) rows.push(z);
      for (const z of [...rows, boothRow]) {
        const communal = rows.length >= 3 && z === rows[2];
        const tableX = z === boothRow ? 1.8 : 2.05;
        const table = box(furniture, communal ? 'communal-table' : 'noodle-table', tableX, z, 0.95, communal ? 1.8 : 1.1, communal ? 1.02 : 0.76, 0xc8ab78);
        box(furniture, communal ? 'stool' : 'padded-chair', 1.3, z, 0.46, 0.5, communal ? 0.76 : 0.84, 0x3d5674, 0, Math.PI / 2);
        if (communal) box(furniture, 'stool', 1.3, z + 0.65, 0.46, 0.5, 0.76, 0x3d5674, 0, Math.PI / 2);
        box(details, 'noodle-bowl', tableX, z - 0.2, 0.29, 0.29, 0.14, 0xe9e1ca, table.height);
        box(details, 'chopsticks', tableX - 0.15, z + 0.04, 0.17, 0.025, 0.015, 0xb1814a, table.height + 0.02);
        box(details, 'condiments', tableX, z + 0.33, 0.25, 0.15, 0.2, 0x815239, table.height);
      }
      noodleCook = { ...worldPoint(origin, -2.15, 2.8), yaw: origin.yaw + Math.PI };
      boothGuest = { ...worldPoint(origin, width / 2 - 0.48, depth - 1.4), yaw: origin.yaw - Math.PI / 2, seatHeight: 0.55 };
    } else if (entry.variant === 'fast-food' || entry.variant === 'cafe') {
      const fast = entry.variant === 'fast-food';
      rooms.push({ kind: fast ? 'fast-food-dining' : 'cafe-dining', ...worldPoint(origin, 0, depth / 2), width, depth });
      box(furniture, 'counter', -width / 2 + 0.7, 6.6, 0.8, 3.6, 1.05, fast ? 0x977045 : 0x927b5e);
      box(furniture, fast ? 'grill' : 'coffee-machine', -width / 2 + 0.65, 9, 0.8, 1.1, 1.45, 0x8a9290);
      box(furniture, 'pickup-counter', -width / 2 + 0.7, 3.7, 0.8, 1.1, 1.05, 0xb49c78);
      counter = { ...worldPoint(origin, -width / 2 + 1.75, 5.8), y: floorY, yaw: origin.yaw - Math.PI / 2, radius: 1.6 };
      station('stock', 'stock', fast ? 'Prepare the pickup orders' : 'Prepare the cafe orders', -width / 2 + 1.75, 3.7, -Math.PI / 2);
      for (const z of [3.4, 7.4]) {
        const x = width / 2 - 0.75;
        box(furniture, fast ? 'booth' : 'padded-chair', x, z, 0.8, 1.4, 0.85, fast ? 0x9b503e : 0x677360);
        const table=box(furniture, 'dining-table', x - 1.05, z, 0.7, 0.9, 0.76, 0xb49c78);
        if(!fast)box(details,'cafe-setting',x-1.05,z,.45,.65,.2,0xe8ddc7,table.height);
      }
    } else if (entry.variant === 'grocery') {
      rooms.push({ kind: 'grocery', ...worldPoint(origin, 0, depth / 2), width, depth });
      box(furniture, 'counter', width / 2 - 0.65, 7.8, 0.8, 2.1, 1.05, 0x8b8069);
      counter = { ...worldPoint(origin, width / 2 - 1.75, 7.8), y: floorY, yaw: origin.yaw + Math.PI / 2, radius: 1.6 };
      for (const side of [-1, 1]) box(furniture, 'shelves', side * (width / 2 - 0.55), 3.6, 0.65, 3.2, 1.75, 0x8e8d73);
      box(furniture, 'fridge', -width / 2 + 0.55, 8, 0.7, 2.6, 1.9, 0xb8c4bd);
      if (width > 8) box(furniture, 'shelves', 0, 4.8, 0.75, 3.2, 1.4, 0x8e8d73);
      station('stock', 'stock', 'Restock the grocery aisle', -width / 2 + 1.7, 3.6, -Math.PI / 2);
    } else {
      box(furniture, 'counter', width / 2 - 1.15, depth - 2.2, 1.7, 1, 1.05, 0x9a7e59);
      counter = { ...worldPoint(origin, width / 2 - 1.15, depth - 3.3), y: floorY, yaw: origin.yaw, radius: 1.6 };
      for (const side of [-1, 1]) box(furniture, 'shelves', side * (width / 2 - 0.55), depth / 2 - 0.7, 0.65, 3.2, 1.75, 0x8e8d73);
      if (width > 7) box(furniture, 'shelves', -0.7, depth / 2, 0.85, 2.8, 1.4, 0x8e8d73);
      rooms.push({ kind: 'shop', ...worldPoint(origin, 0, depth / 2), width, depth });
      station('stock', 'stock', 'Sort the shelf stock', width / 2 - 1.55, 3.8, Math.PI / 2);
    }
    if(commonShop) {
      const label={cafe:'CAFE',grocery:'GROCER',retail:'GOODS'}[entry.variant];
      const sign=box(details,'shop-sign',0,depth-.11,Math.min(3,width-1),.05,.5,0x354b4b,2.02);sign.label=label;
      for(const z of [2.2,5.3,8.4])box(details,'shop-light',0,z,1.25,.65,.08,0xf0e4b9,2.5);
      for(const side of [-1,1])box(details,'window-daylight',side*(width+gap)/4,1.15,sideWidth-.25,1.45,.006,0xd2c8ab,.013);
      const shopCollider=createInteriorCollider({origin,width,depth,floorY,walls,furniture});
      const aisleX=[0,.6,-.6,1.2,-1.2].find(x=>shopCollider.canTraverse(worldPoint(origin,x,1.1),worldPoint(origin,x,depth-1.1)));
      if(aisleX!==undefined)box(details,'shop-aisle',aisleX,depth/2,.075,depth-2.2,.006,entry.variant==='cafe'?0xa38f70:0x8c9b89,.014);
    }
    if (entry.storeId === 'store-358293199') {
      // Original fictional ledger case, with a clear rear-aisle standing pose.
      box(furniture, 'ledger-case', -.9, depth - .65, .8, .5, .65, 0x536c61);
      station('evidence', 'evidence', 'Secure the ledger case', -.9, depth - 1.6, 0, 1.25);
    }
    function buildFittedHouse() {
      const candidates = [];
      for (let z = bounds.minZ + 1; z < bounds.maxZ - .7; z += .8)
        for (let x = bounds.minX + .8; x < bounds.maxX - .7; x += .8) if (fits(x, z, 1, 1, .2)) candidates.push({ x, z });
      const plan = () => ({ origin, width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ,
        footprint, bounds, floorY, walls, furniture });
      const collider = () => createInteriorCollider(plan());
      // Prefer normal entry depth; rare narrow notches need a checked adjacent landing.
      if (!collider().canOccupy(spawn)) {
        const landings = [.75, .9, 1.2, 2, 2.4].map(z => ({ x: 0, z }));
        const p = [...landings, ...candidates.slice().sort((a, b) => Math.hypot(a.x, a.z - 1.65) - Math.hypot(b.x, b.z - 1.65))]
          .find(p => collider().canOccupy(worldPoint(origin, p.x, p.z)));
        if (p) Object.assign(spawn, worldPoint(origin, p.x, p.z));
      }
      const landing = localPoint(origin, spawn);
      // Furnish the entrance's usable space first, including wide or offset source bodies.
      candidates.sort((a, b) => Math.hypot(a.x - landing.x, a.z - landing.z) - Math.hypot(b.x - landing.x, b.z - landing.z) || a.z - b.z || a.x - b.x);
      const standing = [];
      function place(kind, w, d, h, color, activity, roomKind) {
        // Every fixture has a directly reachable approach, preserving an open walking spine.
        for (const p of candidates) {
          if (!fits(p.x, p.z, w, d, .2)) continue;
          for (const side of [-1, 1]) {
            const approach = worldPoint(origin, p.x + side * (w / 2 + .75), p.z);
            const before = collider();
            if (!before.canOccupy(worldPoint(origin, p.x, p.z), Math.hypot(w, d) / 2 + .25) || !before.canTraverse(spawn, approach)) continue;
            const item = box(furniture, kind, p.x, p.z, w, d, h, color);
            const after = collider();
            if (!after.canTraverse(spawn, approach) || standing.some(q => !after.canTraverse(spawn, q))) { furniture.pop(); continue; }
            standing.push(approach);
            if (activity) activities.push({ id: `${entry.id}-${activity[0]}`, kind: activity[1], label: activity[2], ...approach,
              yaw: origin.yaw + side * Math.PI / 2, radius: 1.35 });
            if (roomKind) rooms.push({ kind: roomKind, ...worldPoint(origin, p.x, p.z), width: w + .3, depth: d + .3 });
            return item;
          }
        }
        return null;
      }
      // Mission/search furniture is placed first, so decoration can never displace its approach.
      if (storyHome) place('ledger-case', .65, .5, .68, 0x5c7067, ['stash', 'stock', 'Pack the ledger case']);
      else place('wardrobe', .7, .8, 1.8, 0x977e60, ['valuables', 'stock', 'Search for valuables']);
      const sofa = place('sofa', 1.05, 1.8, .85, 0x7d8a76, ['television', 'tv', 'Watch the television'], 'living');
      if (sofa) {
        const p = localPoint(origin, sofa), task = activities.find(s => s.kind === 'tv');
        const side = localPoint(origin, task).x > p.x ? 1 : -1;
        // A supported screen over the sofa's rear edge uses its existing floor footprint.
        box(details, 'television', p.x - side * .35, p.z, .75, .09, .5, 0x343a39, 1.2, side * Math.PI / 2);
      }
      place('kitchen-bench', .85, 1.8, .92, 0xb8ad92, ['cooking', 'cooking', 'Cook at the kitchen bench'], 'kitchen');
      place('bed', 1.5, 2, .6, 0xb3c1c2, ['rest', 'rest', 'Rest beside the bed'], 'bedroom');
      const bath = place('bath', 1, 1.7, .6, 0xd8dfd8, null, 'bathroom');
      const basin = place('basin', .6, .4, .9, 0xd8dfd8);
      if (bath && !basin) {
        const p = localPoint(origin, bath);
        // Compact washbasin on the bath's head-end ledge, wholly over its solid footprint.
        box(details, 'basin', p.x, p.z - .55, .6, .4, .18, 0xd8dfd8, .67);
      }
      Object.assign(exit, { x: spawn.x, z: spawn.z });
    }
    if (footprint) {
      if (templateFits && !storyHome) station('valuables', 'stock', 'Search for valuables', -width / 2 + 1.5, depth / 2 + 1.2, -Math.PI / 2, 1.35);
      width = bounds.maxX - bounds.minX; depth = bounds.maxZ - bounds.minZ;
    }
    if (entry.type === 'house' && !storyHome) {
      const collider=createInteriorCollider({origin,width,depth,footprint,bounds,floorY,walls,furniture});
      // Search poses use real furniture edges and the same collision/path owner.
      const attachSearch=(suffix,label,fixtureKind,approachKind)=>{
        const fixture=furniture.find(f=>f.kind===fixtureKind) || (fixtureKind==='television'?furniture.find(f=>f.kind==='sofa'):null);
        if(!fixture)return;
        const anchor=activities.find(s=>s.kind===approachKind);
        const p=localPoint(origin,fixture);
        const candidates=[[-fixture.width/2-.7,0],[fixture.width/2+.7,0],[0,-fixture.depth/2-.7],[0,fixture.depth/2+.7]];
        for(const [dx,dz] of candidates){
          const pose=worldPoint(origin,p.x+dx,p.z+dz);
          if(activities.some(s=>s.kind==='stock' && Math.hypot(s.x-pose.x,s.z-pose.z)<1.2) || !collider.canOccupy(pose) || !collider.canTraverse(anchor||spawn,pose))continue;
          activities.push({id:`${entry.id}-valuables${suffix}`,kind:'stock',label,...pose,yaw:origin.yaw+Math.atan2(-dx,-dz),radius:1.05});return;
        }
      };
      if(!activities.some(s=>s.id===`${entry.id}-valuables`))attachSearch('','Search the wardrobe','wardrobe');
      attachSearch('-kitchen','Search the kitchen cupboards','kitchen-bench','cooking');
      attachSearch('-lounge','Search beside the television','television','tv');
    }
    return freeze({ id: entry.id, buildingId: entry.buildingId, ...(['mall', 'gym', 'school'].includes(entry.type) ? {} : { storeId: entry.storeId || null }),
      ...(entry.serviceId ? { serviceId: entry.serviceId } : {}), ...(entry.heistSiteId ? { heistSiteId: entry.heistSiteId, heist } : {}), ...(entry.schoolId ? { schoolId: entry.schoolId } : {}),
      type: entry.type, ...(entry.variant ? { variant: entry.variant } : {}), ...(footprint ? { footprint, bounds } : {}), name: typeof storyHome?.name === 'string' && storyHome.name.trim() ? storyHome.name : entry.name, origin, width, depth, floorY, spawn, exit, counter,
      walls, doors, furniture, rooms, activities, ...(noodleCook ? { noodleCook, boothGuest } : {}),
      ...(entry.type === 'mall' ? { levels: [{ y: floorY, label: 'Ground floor' }], sourceExtent: entry.sourceExtent, reference: 'Monaro Mall 1963 materials; original partial ground-floor wing. Tenancies and corridors are interpreted.' } : {}), ...(exercise ? { exercise } : {}), ...(details.length ? { details } : {}), layoutNote: footprint ? 'Source exterior footprint at original scale; original procedural rooms, not a surveyed interior.' : 'Original plausible layout; not a surveyed interior.' });
  }
  function enter(entry, actor) {
    if (active || !actor || !entries.includes(entry) || findEntry(actor) !== entry) return false;
    outside = { x: actor.x, z: actor.z, yaw: actor.yaw, y: actor.y };
    active = build(entry); collider = createInteriorCollider(active); generatedPlans++;
    Object.assign(actor, active.spawn, { speed: 0 });
    return active;
  }
  function leave(actor) {
    if (!active || !actor) return false;
    Object.assign(actor, outside, { speed: 0 });
    active = null; collider = null; outside = null;
    return true;
  }
  function nearExit(pose, radius = 1.8) {
    return Boolean(active && validPoint(pose) && Number.isFinite(radius) && radius > 0 && distance(active.exit, pose) <= radius);
  }
  function moveActor(actor, dx, dz, radius = 0.45) {
    return collider ? collider.moveActor(actor, dx, dz, radius) : { moved: false, blocked: true, distance: 0 };
  }
  function hasLineOfSight(a, b) {
    return collider ? collider.hasLineOfSight(a, b) : false;
  }
  return { entries, findEntry, enter, leave, nearExit, moveActor, hasLineOfSight,
    snapshot: () => ({ active: active?.id || null, buildingId: active?.buildingId || null, type: active?.type || null,
      descriptors: entries.length, generatedPlans, activePlans: active ? 1 : 0 }),
    reset(actor) { if (active && actor) return leave(actor); active = null; collider = null; outside = null; return true; },
    get exteriorPose() { return outside ? Object.freeze({ ...outside }) : null; },
    get active() { return active; },
    get stats() { return { descriptors: entries.length, generatedPlans, activePlans: active ? 1 : 0 }; } };
}
