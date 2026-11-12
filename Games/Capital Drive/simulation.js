// Coordinates are metres east/south; yaw matches THREE.Object3D.rotation.y.
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDelta = (a, b) => ((b - a + Math.PI * 3) % TAU) - Math.PI;
const yawFor = (dx, dz) => Math.atan2(-dx, -dz);

export function projectSegment(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  const px = a[0] + dx * t, pz = a[1] + dz * t;
  return { x: px, z: pz, t, distance: Math.hypot(x - px, z - pz) };
}

class SpatialGrid {
  constructor(size = 64) { this.size = size; this.cells = new Map(); }
  insert(item, minX, minZ, maxX, maxZ) {
    for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
      for (let z = Math.floor(minZ / this.size); z <= Math.floor(maxZ / this.size); z++) {
        const key = `${x},${z}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(item);
      }
    }
  }
  query(x, z, radius) {
    const found = new Set();
    for (let ix = Math.floor((x - radius) / this.size); ix <= Math.floor((x + radius) / this.size); ix++) {
      for (let iz = Math.floor((z - radius) / this.size); iz <= Math.floor((z + radius) / this.size); iz++) {
        for (const item of this.cells.get(`${ix},${iz}`) || []) found.add(item);
      }
    }
    return found;
  }
}

// Shared OSM node IDs connect ways. Coordinate keys also join clipped/fallback data.
export function buildRoadGraph(roads) {
  const nodes = new Map(), edges = [], segments = [];
  const coordinates = new Map();
  function nodeFor(road, i) {
    const p = road.points[i], coordinate = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    const key = coordinates.get(coordinate) ?? String(road.nodes?.[i] ?? coordinate);
    coordinates.set(coordinate, key);
    if (!nodes.has(key)) nodes.set(key, { id: key, x: p[0], z: p[1], outgoing: [] });
    return nodes.get(key);
  }
  function addEdge(from, to, road, segment, direction) {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (length < 0.1) return;
    const dx = (to.x - from.x) / length, dz = (to.z - from.z) / length;
    const edge = { id: edges.length, from, to, road, segment, direction, length, dx, dz,
      yaw: yawFor(dx, dz), laneOffset: Math.min((road.width || 8) * 0.23, 3.2) };
    from.outgoing.push(edge); segment.edges.push(edge); edges.push(edge);
  }
  for (const road of roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const from = nodeFor(road, i), to = nodeFor(road, i + 1);
      if (from === to) continue;
      const segment = { road, a: road.points[i], b: road.points[i + 1], index: i, edges: [] };
      segments.push(segment);
      if (road.oneway !== -1) addEdge(from, to, road, segment, 1);
      if (road.oneway !== 1) addEdge(to, from, road, segment, -1);
    }
  }
  return { nodes, edges, segments };
}

export function pointOnLane(edge, position) {
  return { x: edge.from.x + edge.dx * position + edge.dz * edge.laneOffset,
    z: edge.from.z + edge.dz * position - edge.dx * edge.laneOffset, yaw: edge.yaw };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

function polygonContact(x, z, points, radius) {
  let inside = false, closest = null, area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    area += a[0] * b[1] - b[0] * a[1];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const candidate = projectSegment(x, z, a, b);
    if (!closest || candidate.distance < closest.distance) closest = { ...candidate, dx: b[0] - a[0], dz: b[1] - a[1] };
  }
  if (!closest || (!inside && closest.distance >= radius)) return null;
  let nx = x - closest.x, nz = z - closest.z;
  const length = Math.hypot(nx, nz);
  if (length > 0.0001) { nx /= length; nz /= length; }
  else {
    const edgeLength = Math.hypot(closest.dx, closest.dz) || 1;
    const winding = area < 0 ? -1 : 1;
    nx = closest.dz / edgeLength * winding; nz = -closest.dx / edgeLength * winding;
  }
  if (inside && length > 0.0001) { nx = -nx; nz = -nz; }
  return { nx, nz, depth: inside ? radius + closest.distance : radius - closest.distance };
}

export function createSimulation(map, options = {}) {
  const graph = buildRoadGraph(map.roads || []);
  const roadIndex = new SpatialGrid(80), buildingIndex = new SpatialGrid(48);
  for (const segment of graph.segments) roadIndex.insert(segment,
    Math.min(segment.a[0], segment.b[0]), Math.min(segment.a[1], segment.b[1]),
    Math.max(segment.a[0], segment.b[0]), Math.max(segment.a[1], segment.b[1]));
  for (const building of map.buildings || []) {
    if (!building.points?.length) continue;
    buildingIndex.insert(building, Math.min(...building.points.map(p => p[0])), Math.min(...building.points.map(p => p[1])),
      Math.max(...building.points.map(p => p[0])), Math.max(...building.points.map(p => p[1])));
  }
  const bounds = map.bounds;
  const searchLimit = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 160);
  function nearestRoad(x, z) {
    let best = null;
    for (let radius = 40; radius <= searchLimit * 2; radius *= 2) {
      for (const segment of roadIndex.query(x, z, radius)) {
        const projection = projectSegment(x, z, segment.a, segment.b);
        if (!best || projection.distance < best.distance) best = { ...projection, road: segment.road,
          segment: segment.index, yaw: yawFor(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]) };
      }
      if (best && best.distance <= radius) return best;
    }
    return best;
  }
  const player = { x: 0, z: 0, yaw: 0, speed: 0, vx: 0, vz: 0, steer: 0, odometer: 0, crashes: 0, offroad: false };
  const random = seededRandom(options.seed ?? 20261112);
  const traffic = [], models = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];
  const colors = [0xd4d7d3, 0x777e84, 0x274d79, 0xa4463b, 0xd1c8b4, 0x555952, 0xc5b86e];
  let elapsed = 0, crashCooldown = 0;
  function placeTraffic(car, edge, position) {
    car.edge = edge; car.position = position;
    Object.assign(car, pointOnLane(edge, position));
  }
  function reset(spawn = map.spawn) {
    const fallback = graph.edges[0] ? pointOnLane(graph.edges[0], Math.min(8, graph.edges[0].length / 2)) : { x: 0, z: 0, yaw: 0 };
    const target = spawn || fallback;
    Object.assign(player, { x: target.x, z: target.z, yaw: target.yaw || 0, speed: 0, vx: 0, vz: 0, steer: 0,
      odometer: 0, crashes: 0, offroad: false });
    crashCooldown = 0;
  }
  reset();
  const candidates = graph.edges.filter(edge => edge.length > 8);
  function nearbyEdges(radius) {
    const nearby = [];
    for (const segment of roadIndex.query(player.x, player.z, radius)) {
      if (projectSegment(player.x, player.z, segment.a, segment.b).distance > radius) continue;
      for (const edge of segment.edges) if (edge.length > 8) nearby.push(edge);
    }
    return nearby;
  }
  const initialEdges = nearbyEdges(350);
  const trafficCount = Math.max(0, Math.min(options.trafficCount ?? 26, 48));
  for (let i = 0; i < trafficCount && candidates.length; i++) {
    const car = { id: i, x: 0, z: 0, yaw: 0, speed: 0, modelId: models[i % models.length], color: colors[i % colors.length],
      cruiseFactor: 0.78 + random() * 0.2 };
    let valid = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const pool = initialEdges.length && attempt < 60 ? initialEdges : candidates;
      const edge = pool[Math.floor(random() * pool.length)];
      placeTraffic(car, edge, random() * edge.length);
      const spawnDistance = Math.hypot(car.x - player.x, car.z - player.z);
      if (spawnDistance > 45 && (attempt >= 60 || spawnDistance < 350) &&
        traffic.every(other => Math.hypot(car.x - other.x, car.z - other.z) > 12)) { valid = true; break; }
    }
    if (valid) traffic.push(car);
  }
  let nextTrafficRefresh = 0;
  function refreshTrafficArea() {
    if (elapsed < nextTrafficRefresh) return;
    nextTrafficRefresh = elapsed + 2;
    const localEdges = nearbyEdges(650);
    if (!localEdges.length) return;
    for (const car of traffic) {
      if (Math.hypot(car.x - player.x, car.z - player.z) <= 850) continue;
      for (let attempt = 0; attempt < 40; attempt++) {
        const edge = localEdges[Math.floor(random() * localEdges.length)];
        const position = random() * edge.length, pose = pointOnLane(edge, position);
        const gap = Math.hypot(pose.x - player.x, pose.z - player.z);
        // The renderer culls traffic at 300m; replacements enter beyond that view.
        if (gap < 330 || gap > 650 || traffic.some(other => other !== car && Math.hypot(pose.x - other.x, pose.z - other.z) < 15)) continue;
        placeTraffic(car, edge, position); car.speed = Math.min(10, (edge.road.speed || 50) / 3.6); break;
      }
    }
  }
  function nextEdge(car) {
    const choices = car.edge.to.outgoing;
    const onward = choices.filter(edge => edge.to !== car.edge.from);
    const pool = onward.length ? onward : choices;
    return pool.length ? pool[Math.floor(random() * pool.length)] : null;
  }
  function updateTraffic(dt) {
    refreshTrafficArea();
    for (const car of traffic) {
      const edge = car.edge, remaining = edge.length - car.position;
      // OSM maxspeed is km/h. Junction courtesy and spacing are intentionally simple.
      let target = clamp((edge.road.speed || 50) / 3.6, 5, 24) * car.cruiseFactor;
      if (edge.to.outgoing.length > 2 && remaining < 20) target = Math.min(target, 7.5);
      for (const other of traffic) {
        if (car === other) continue;
        if (other.edge === edge && other.position > car.position) {
          const gap = other.position - car.position;
          if (gap < 24) target = Math.min(target, Math.max(0, (gap - 7) * 0.8));
        } else if (remaining < 12 && other.id < car.id && other.edge.to === edge.to &&
          other.edge !== edge && other.edge.length - other.position < 10) target = Math.min(target, 1.5);
      }
      const px = player.x - car.x, pz = player.z - car.z;
      const ahead = px * edge.dx + pz * edge.dz;
      if (ahead > 0 && ahead < 22 && Math.abs(px * edge.dz - pz * edge.dx) < 2.8) target = Math.min(target, Math.max(0, (ahead - 7) * 0.75));
      car.speed += clamp(target - car.speed, -7 * dt, 2.8 * dt);
      car.position += car.speed * dt;
      // Small segments can cross more than one node per tick.
      let transitions = 0;
      while (car.position > car.edge.length && transitions++ < 12) {
        const overflow = car.position - car.edge.length, next = nextEdge(car);
        if (next) { car.edge = next; car.position = overflow; }
        else {
          const destination = candidates[Math.floor(random() * candidates.length)];
          placeTraffic(car, destination, 0); car.speed = 0; break;
        }
      }
      const pose = pointOnLane(car.edge, Math.min(car.position, car.edge.length));
      car.x = pose.x; car.z = pose.z;
      car.yaw += angleDelta(car.yaw, pose.yaw) * Math.min(1, dt * 9);
    }
  }
  function resolveImpact(nx, nz, depth) {
    player.x += nx * depth; player.z += nz * depth;
    const impact = player.vx * nx + player.vz * nz;
    if (impact < 0) {
      player.vx -= impact * nx * 1.15; player.vz -= impact * nz * 1.15;
      player.vx *= 0.85; player.vz *= 0.85;
      if (-impact > 3 && crashCooldown <= 0) { player.crashes++; crashCooldown = 0.85; }
    }
  }
  function step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); elapsed += dt; crashCooldown -= dt;
    const throttle = clamp(Number(input.throttle) || 0, -1, 1);
    player.steer += (clamp(Number(input.steer) || 0, -1, 1) - player.steer) * Math.min(1, dt * 10);
    const road = nearestRoad(player.x, player.z);
    player.offroad = !road || road.distance > (road.road.width || 8) * 0.5 + 1;
    let fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    let forward = player.vx * fx + player.vz * fz;
    let lateral = player.vx * -fz + player.vz * fx;
    const braking = Boolean(input.brake);
    const acceleration = throttle * (forward * throttle < -0.5 ? 20 : input.boost ? 17 : 11.5);
    forward += acceleration * dt;
    if (braking) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 24 * dt);
    const drag = (player.offroad ? 0.9 : 0.14) + (input.handbrake ? 0.65 : 0);
    forward *= Math.exp(-drag * dt);
    if (!throttle) forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - 0.6 * dt);
    forward = clamp(forward, -12, player.offroad ? 27 : input.boost ? 54 : 46);
    const turnRate = -player.steer * forward * 0.075 / (1 + Math.abs(forward) * 0.035);
    player.yaw += turnRate * dt * (input.handbrake ? 1.42 : 1);
    player.yaw = Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw));
    // Preserve world momentum as the body turns; handbrake reduces lateral tyre grip.
    const oldVx = fx * forward - fz * lateral, oldVz = fz * forward + fx * lateral;
    fx = -Math.sin(player.yaw); fz = -Math.cos(player.yaw);
    forward = oldVx * fx + oldVz * fz;
    lateral = (oldVx * -fz + oldVz * fx) * Math.exp(-(input.handbrake ? 1.1 : player.offroad ? 3.3 : 7.5) * dt);
    player.vx = fx * forward - fz * lateral; player.vz = fz * forward + fx * lateral;
    player.x += player.vx * dt; player.z += player.vz * dt;
    for (const building of buildingIndex.query(player.x, player.z, 2)) {
      const contact = polygonContact(player.x, player.z, building.points, 1.55);
      if (contact) resolveImpact(contact.nx, contact.nz, contact.depth + 0.02);
    }
    updateTraffic(dt);
    for (const car of traffic) {
      const dx = player.x - car.x, dz = player.z - car.z, gap = Math.hypot(dx, dz);
      if (gap < 3.2) resolveImpact(gap > 0.001 ? dx / gap : 1, gap > 0.001 ? dz / gap : 0, (3.2 - gap) * 0.65);
    }
    player.speed = player.vx * fx + player.vz * fz;
    player.odometer += Math.hypot(player.vx, player.vz) * dt;
    if (![player.x, player.z, player.yaw, player.speed, player.vx, player.vz].every(Number.isFinite) ||
      player.x < bounds.minX - 15 || player.x > bounds.maxX + 15 || player.z < bounds.minZ - 15 || player.z > bounds.maxZ + 15) {
      const trip = player.odometer, crashes = player.crashes;
      reset(); player.odometer = trip; player.crashes = crashes;
    }
  }
  return { player, traffic, graph, step, reset, nearestRoad, get elapsed() { return elapsed; } };
}
