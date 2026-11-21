// Geometry-only guidance over the existing directed route. Coordinates are metres;
// yaw faces (-sin(yaw), -cos(yaw)), so positive heading changes turn left.
const TURN_ANGLE = 32 * Math.PI / 180;
const CURVE_SPAN = 28;
const OFF_ROUTE_DISTANCE = 45;
const ARRIVAL_DISTANCE = 14;
const SEARCH_SEGMENTS = 1024;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const valid = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const yawBetween = (a, b) => Math.atan2(a.x - b.x, a.z - b.z);

function project(pose, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((pose.x - a.x) * dx + (pose.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  const x = a.x + dx * t, z = a.z + dz * t;
  return { t, distance: Math.hypot(pose.x - x, pose.z - z) };
}

function compileTurns(points, distances, headings) {
  const turns = [];
  const add = changes => {
    let sum = 0, strongest = 0, start = 0, window = 0;
    for (let i = 0; i < changes.length; i++) {
      sum += changes[i].angle;
      window += Math.abs(changes[i].angle);
      while (distances[changes[i].index] - distances[changes[start].index] > CURVE_SPAN) {
        window -= Math.abs(changes[start++].angle);
      }
      strongest = Math.max(strongest, window);
    }
    // A broad road bend must not produce an intersection instruction merely
    // because many tiny OSM segments eventually add up to a large angle.
    if (strongest < TURN_ANGLE || Math.abs(sum) < TURN_ANGLE) return;
    const half = Math.abs(sum) / 2;
    let accumulated = 0, center = changes[0].index;
    for (const change of changes) {
      accumulated += Math.abs(change.angle);
      if (accumulated >= half) { center = change.index; break; }
    }
    const first = changes[0].index, last = changes[changes.length - 1].index;
    turns.push({ kind: Math.abs(sum) >= Math.PI * .8 ? 'uturn' : sum > 0 ? 'left' : 'right',
      at: distances[center], point: points[center], incomingYaw: headings[first - 1], outgoingYaw: headings[last] });
  };
  let gradual = [];
  const flush = () => { if (gradual.length) add(gradual); gradual = []; };
  for (let i = 1; i < points.length - 1; i++) {
    const angle = angleDelta(headings[i - 1], headings[i]);
    if (Math.abs(angle) < 1e-5) continue;
    const change = { index: i, angle };
    if (Math.abs(angle) >= TURN_ANGLE) { flush(); add([change]); continue; }
    const previous = gradual[gradual.length - 1];
    if (previous && (Math.sign(previous.angle) !== Math.sign(angle) || distances[i] - distances[previous.index] > 12)) flush();
    gradual.push(change);
  }
  flush();
  return turns;
}

export function createRouteGuidance() {
  let points = [], distances = [], headings = [], turns = [], destination = null;
  let total = 0, progress = 0, segment = 0, previousPose = null, state = null;
  const snapshot = () => state ? { ...state, point: { ...state.point }, destination: { ...state.destination } } : null;

  function reset() {
    points = []; distances = []; headings = []; turns = []; destination = null;
    total = 0; progress = 0; segment = 0; previousPose = null; state = null;
  }

  function setRoute(route, target) {
    const clean = [];
    if (Array.isArray(route)) for (const entry of route) {
      const point = Array.isArray(entry) ? { x: entry[0], z: entry[1] } : entry;
      if (!valid(point)) continue;
      const last = clean[clean.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.z - last.z) > 1e-6) clean.push({ x: point.x, z: point.z });
    }
    const nextDestination = valid(target) ? { x: target.x, z: target.z } : clean[clean.length - 1] || null;
    if (clean.length === points.length && clean.every((point, i) => point.x === points[i].x && point.z === points[i].z)
      && destination?.x === nextDestination?.x && destination?.z === nextDestination?.z) return snapshot();
    reset();
    if (!clean.length) return null;
    points = clean; destination = nextDestination; distances = [0];
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
      distances.push(total); headings.push(yawBetween(points[i - 1], points[i]));
    }
    turns = compileTurns(points, distances, headings);
    return null;
  }

  function update(pose) {
    if (!points.length || !valid(pose)) return snapshot();
    const movement = previousPose ? Math.hypot(pose.x - previousPose.x, pose.z - previousPose.z) : 0;
    // Bound both the physical search window and the segment count. Nearby loops
    // cannot steal progress from the current road at a geometric crossing.
    const reach = Math.min(400, Math.max(80, movement * 1.6 + 20));
    let best = null;
    const low = Math.max(0, segment - SEARCH_SEGMENTS), high = Math.min(points.length - 2, segment + SEARCH_SEGMENTS);
    for (let i = low; i <= high; i++) {
      if (distances[i + 1] < progress - reach || distances[i] > progress + reach) continue;
      const projection = project(pose, points[i], points[i + 1]);
      const at = distances[i] + projection.t * (distances[i + 1] - distances[i]);
      if (at < progress - reach || at > progress + reach) continue;
      if (!best || projection.distance < best.distance - .05
        || (Math.abs(projection.distance - best.distance) <= .05 && Math.abs(at - progress) < Math.abs(best.at - progress))) {
        best = { ...projection, at, segment: i };
      }
    }
    const endpoint = points[points.length - 1];
    let routeDistance = best?.distance ?? Math.hypot(pose.x - endpoint.x, pose.z - endpoint.z);
    const finalApproach = progress >= total - 12 && Math.hypot(endpoint.x - destination.x, endpoint.z - destination.z) > 1e-6;
    if (finalApproach) routeDistance = Math.min(routeDistance, project(pose, endpoint, destination).distance);
    const offRoute = routeDistance > OFF_ROUTE_DISTANCE;
    if (best && !offRoute) { progress = best.at; segment = best.segment; }
    previousPose = { x: pose.x, z: pose.z };
    const toDestination = Math.hypot(pose.x - destination.x, pose.z - destination.z);
    const routeRemaining = Math.max(0, total - progress);
    const finalLeg = Math.hypot(endpoint.x - destination.x, endpoint.z - destination.z);
    const remaining = routeRemaining <= 12 ? toDestination : routeRemaining + finalLeg;
    const arrived = routeRemaining <= ARRIVAL_DISTANCE && toDestination <= ARRIVAL_DISTANCE;
    // Keep the turn while the driver is at its vertex; advance after entering
    // the outgoing segment rather than requiring a frame at the exact corner.
    let turnLow = 0, turnHigh = turns.length;
    while (turnLow < turnHigh) {
      const middle = (turnLow + turnHigh) >> 1;
      if (turns[middle].at < progress - 3) turnLow = middle + 1;
      else turnHigh = middle;
    }
    const next = turns[turnLow];
    const point = !arrived && next ? next.point : destination;
    const incomingYaw = !arrived && next ? next.incomingYaw : headings[headings.length - 1] ?? 0;
    const outgoingYaw = !arrived && next ? next.outgoingYaw : incomingYaw;
    state = { kind: arrived ? 'arrive' : next ? next.kind : 'straight',
      distance: arrived ? toDestination : next ? Math.max(0, next.at - progress) : remaining,
      point: { x: point.x, z: point.z }, yaw: outgoingYaw, incomingYaw, outgoingYaw,
      remaining, offRoute, progress, total, destination: { ...destination } };
    return snapshot();
  }

  return { setRoute, update, snapshot, reset };
}
