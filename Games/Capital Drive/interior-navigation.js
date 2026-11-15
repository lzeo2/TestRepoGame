// Room-bound physical collision survives disposal of the room's rendered geometry.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function local(origin, p) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw), x = p.x - origin.x, z = p.z - origin.z;
  return { x: c * x - s * z, z: s * x + c * z };
}
function world(origin, x, z) {
  const c = Math.cos(origin.yaw), s = Math.sin(origin.yaw);
  return { x: origin.x + c * x + s * z, z: origin.z - s * x + c * z };
}
function contact(p, box, radius) {
  const q = local(box, p);
  return Math.hypot(Math.max(0, Math.abs(q.x) - box.width / 2), Math.max(0, Math.abs(q.z) - box.depth / 2)) < radius;
}

export function createInteriorCollider(plan) {
  const solids = [...plan.walls, ...plan.furniture];
  const sightSolids = [...plan.walls, ...plan.furniture.filter(f => f.height >= 1.5)];
  function canOccupy(p, radius = .45) {
    if (!point(p) || !Number.isFinite(radius) || radius <= 0) return false;
    radius = clamp(radius, .1, 2);
    const q = local(plan.origin, p);
    if (q.x < -plan.width / 2 + radius || q.x > plan.width / 2 - radius || q.z < radius || q.z > plan.depth - radius) return false;
    return !solids.some(box => contact(p, box, radius));
  }
  function moveActor(actor, dx, dz, radius = .45) {
    if (!point(actor) || ![dx, dz, radius].every(Number.isFinite) || radius <= 0) return { moved: false, blocked: true, distance: 0 };
    radius = clamp(radius, .1, 2);
    const before = { x: actor.x, z: actor.z }, length = Math.hypot(dx, dz), scale = length > 8 ? 8 / length : 1;
    dx *= scale; dz *= scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.min(.2, radius * .5)));
    let blocked = scale < 1;
    for (let i = 0; i < steps; i++) {
      const x = actor.x + dx / steps, z = actor.z + dz / steps;
      if (canOccupy({ x, z }, radius)) { actor.x = x; actor.z = z; }
      else {
        blocked = true;
        if (canOccupy({ x, z: actor.z }, radius)) actor.x = x;
        else if (canOccupy({ x: actor.x, z }, radius)) actor.z = z;
      }
    }
    actor.y = plan.floorY;
    const movedDistance = distance(before, actor);
    return { moved: movedDistance > .00001, blocked, distance: movedDistance, x: actor.x, z: actor.z };
  }
  function hasLineOfSight(a, b) {
    if (!point(a) || !point(b)) return false;
    const inBounds = p => {
      const q = local(plan.origin, p);
      return Math.abs(q.x) < plan.width / 2 && q.z > 0 && q.z < plan.depth;
    };
    if (!inBounds(a) || !inBounds(b)) return false;
    for (const box of sightSolids) {
      const p = local(box, a), q = local(box, b);
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
  // Unlike sight, every low table/chair is solid and no sliding is permitted.
  function canTraverse(a, b, radius = .45) {
    if (!canOccupy(a, radius) || !canOccupy(b, radius)) return false;
    radius = clamp(radius, .1, 2);
    for (const box of solids) {
      const p = local(box, a), q = local(box, b), hx = box.width / 2, hz = box.depth / 2;
      const dx = q.x - p.x, dz = q.z - p.z, length2 = dx * dx + dz * dz;
      let min = 0, max = 1;
      for (const [axis, half] of [['x', hx], ['z', hz]]) {
        const delta = q[axis] - p[axis];
        if (Math.abs(delta) < 1e-9) { if (Math.abs(p[axis]) > half) { min = 2; break; } }
        else {
          const t1 = (-half - p[axis]) / delta, t2 = (half - p[axis]) / delta;
          min = Math.max(min, Math.min(t1, t2)); max = Math.min(max, Math.max(t1, t2));
        }
      }
      if (min <= max) return false;
      // The closest pair is an endpoint against a face, or a corner against
      // the segment. Exact circle clearance avoids sampling past table corners.
      for (const x of [-hx, hx]) for (const z of [-hz, hz]) {
        const t = clamp(((x - p.x) * dx + (z - p.z) * dz) / (length2 || 1), 0, 1);
        if (Math.hypot(p.x + dx * t - x, p.z + dz * t - z) < radius) return false;
      }
    }
    return true;
  }
  return { moveActor, hasLineOfSight, canOccupy, canTraverse };
}

const STEP = .75, MAX_NODES = 2000, MAX_FIELDS = 4;
const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function createInteriorNavigation(plan) {
  const collider = createInteriorCollider(plan), fields = new Map();
  let nodes = null, cells = null, builds = 0, searches = 0, truncated = false, spacing = STEP, xs = [], zs = [];
  function buildGrid() {
    if (nodes) return;
    builds++; nodes = []; cells = new Map();
    const potential = Math.ceil(plan.width / STEP) * Math.ceil(plan.depth / STEP);
    spacing = STEP * Math.max(1, Math.ceil(Math.sqrt(potential / 1200)));
    const half = Math.floor((plan.width / 2 - .45) / spacing);
    for (let ix = -half; ix <= half; ix++) xs.push(ix * spacing);
    for (let z = .9; z <= plan.depth - .45; z += spacing) zs.push(z);
    // Wide open mall floors use fewer nodes, retaining fine doorway approaches.
    if (spacing > STEP) for (const door of plan.doors || []) {
      const p = local(plan.origin, door);
      xs.push(p.x - STEP, p.x, p.x + STEP); zs.push(p.z);
    }
    const unique = (values, min, max) => [...new Set(values.filter(v => v >= min && v <= max).map(v => Math.round(v * 10000) / 10000))].sort((a, b) => a - b);
    xs = unique(xs, -plan.width / 2 + .45, plan.width / 2 - .45);
    zs = unique(zs, .45, plan.depth - .45);
    if (xs.length * zs.length > 12000) { truncated = true; return; }
    for (let iz = 0; iz < zs.length; iz++) for (let ix = 0; ix < xs.length; ix++) {
      const p = world(plan.origin, xs[ix], zs[iz]);
      if (!collider.canOccupy(p)) continue;
      if (nodes.length === MAX_NODES) { truncated = true; continue; }
      const n = { ...p, ix, iz, index: nodes.length, edges: [] };
      nodes.push(n); cells.set(`${ix},${iz}`, n);
    }
    for (const n of nodes) for (const [dx, dz] of DIRECTIONS) {
      const q = cells.get(`${n.ix + dx},${n.iz + dz}`);
      if (q && collider.canTraverse(n, q)) n.edges.push(q.index);
    }
  }
  function anchors(p) {
    const q = local(plan.origin, p), found = [];
    const nearest = (values, value) => values.reduce((best, v, i) => Math.abs(v - value) < Math.abs(values[best] - value) ? i : best, 0);
    const ix = nearest(xs, q.x), iz = nearest(zs, q.z);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const n = cells.get(`${ix + dx},${iz + dz}`);
      if (n && collider.canTraverse(p, n)) found.push(n);
    }
    return found.sort((a, b) => distance(a, p) - distance(b, p) || a.index - b.index);
  }
  function nextWaypoint(from, to, ownerId = 'default') {
    if (!collider.canOccupy(from) || !collider.canOccupy(to)) return null;
    if (collider.canTraverse(from, to)) return { x: to.x, z: to.z };
    buildGrid();
    const starts = anchors(from), targets = anchors(to);
    if (!starts.length || !targets.length) return null;
    // Fields depend on reachable target cells, not small movement within a cell.
    const key = targets.map(n => n.index).sort((a, b) => a - b).join(',');
    const owner = String(ownerId);
    let cached = fields.get(owner);
    if (!cached || cached.key !== key) {
      searches++;
      const costs = new Int16Array(nodes.length).fill(-1), next = new Int16Array(nodes.length).fill(-1), queue = [];
      for (const n of targets) { costs[n.index] = 0; queue.push(n.index); }
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const index = queue[cursor];
        for (const neighbor of nodes[index].edges) if (costs[neighbor] < 0) {
          costs[neighbor] = costs[index] + 1; next[neighbor] = index; queue.push(neighbor);
        }
      }
      cached = { key, costs, next };
      fields.delete(owner); fields.set(owner, cached);
      if (fields.size > MAX_FIELDS) fields.delete(fields.keys().next().value);
    }
    const reachable = starts.filter(n => cached.costs[n.index] >= 0);
    reachable.sort((a, b) => distance(from, a) + cached.costs[a.index] * spacing - distance(from, b) - cached.costs[b.index] * spacing || a.index - b.index);
    let current = reachable[0];
    if (!current) return null;
    let waypoint = current;
    // Skip only physically clear segments of the cached path.
    for (let i = 0; i < nodes.length && cached.next[current.index] >= 0; i++) {
      current = nodes[cached.next[current.index]];
      if (!collider.canTraverse(from, current)) break;
      waypoint = current;
    }
    return { x: waypoint.x, z: waypoint.z };
  }
  return { ...collider, nextWaypoint,
    get stats() { return { gridBuilds: builds, nodes: nodes?.length || 0, searches, cachedPaths: fields.size, truncated, step: spacing }; } };
}

// Swept circles for caller-owned actors; static room navigation excludes crowds.
export function clipInteriorActors(actor, dx, dz, radius = .45, people = []) {
  if (!point(actor) || ![dx, dz, radius].every(Number.isFinite) || radius <= 0) return { dx: 0, dz: 0, blocked: true };
  const a = dx * dx + dz * dz;
  if (a < 1e-16) return { dx, dz, blocked: false };
  let fraction = 1;
  for (const p of people) {
    if (!point(p) || p === actor || actor.id != null && p.id === actor.id) continue;
    const x = actor.x - p.x, z = actor.z - p.z, r = clamp(radius, .1, 2) + (Number.isFinite(p.radius) ? clamp(p.radius, .1, 2) : .45);
    const c = x * x + z * z - r * r, b = x * dx + z * dz;
    if (c <= 0) { if (b < 0) fraction = 0; continue; }
    const discriminant = b * b - a * c;
    if (b >= 0 || discriminant < 0) continue;
    const t = (-b - Math.sqrt(discriminant)) / a;
    if (t >= 0 && t <= fraction) fraction = Math.max(0, t - .001 / Math.sqrt(a));
  }
  return { dx: dx * fraction, dz: dz * fraction, blocked: fraction < 1 };
}
