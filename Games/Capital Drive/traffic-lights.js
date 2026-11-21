// Source node positions are exact map inputs. All controller timings, stop bars,
// junction clusters and sidewalk head offsets below are explicit game estimates.
// Four seconds clears a typical 25m conflict box at the simulation's 7.5m/s
// junction speed. Longer/occupied boxes still use ordinary vehicle yielding.
const GREEN = 24, AMBER = 3, ALL_RED = 4, LOOK_BACK = 95;
const angleGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function createTrafficLights(map, graph, data = map.trafficSignals) {
  const approaches = [], heads = [], groups = [], incoming = new Map(), byEdge = new Map(), poseCells = new Map();
  const sourceSignals = data?.version === 1 && Array.isArray(data.signals) ? data.signals : [];
  for (const edge of graph.edges) {
    if (!incoming.has(edge.to.id)) incoming.set(edge.to.id, []);
    incoming.get(edge.to.id).push(edge);
  }
  // Complete-link distance prevents an arbitrary chain of nearby intersections
  // from becoming one enormous junction. The source node itself is never moved.
  const mapped = sourceSignals.filter(signal => {
    const node = graph.nodes.get(String(signal.id));
    return node && signal.tags?.highway === 'traffic_signals' &&
      Math.hypot(node.x - signal.x, node.z - signal.z) < .08;
  }).sort((a, b) => Number(a.id) - Number(b.id));
  for (const signal of mapped) {
    let group = groups.find(item => item.signals.every(other => Math.hypot(signal.x - other.x, signal.z - other.z) <= 85) &&
      item.signals.some(other => Math.hypot(signal.x - other.x, signal.z - other.z) <= 58));
    if (!group) { group = { id: `junction:${signal.id}`, signals: [], axes: [], approaches: [], phase: 0 }; groups.push(group); }
    group.signals.push(signal);
    for (const edge of incoming.get(String(signal.id)) || []) {
      const direction = signal.tags['traffic_signals:direction'];
      if (direction === 'forward' && edge.direction !== 1 || direction === 'backward' && edge.direction !== -1) continue;
      // One heading receives green at once, including at unprotected turns.
      // Opposing approaches get distinct phases, so their turning paths cannot
      // receive simultaneous permission to cross. Same-heading lanes may share.
      let axis = group.axes.findIndex(yaw => angleGap(yaw, edge.yaw) < .35);
      if (axis < 0) { axis = group.axes.length; group.axes.push(edge.yaw); }
      const stopPosition = Math.max(0, edge.length - 2);
      const lateral = Math.max(edge.laneOffset + 1.5, (edge.road.width || 7) / 2 + .8);
      const approach = { id: `approach:${signal.id}:${edge.id}`, sourceId: signal.sourceId,
        nodeId: String(signal.id), edgeId: edge.id, groupId: group.id, axis,
        stopPosition, x: signal.x - edge.dx * 2 + edge.dz * lateral,
        z: signal.z - edge.dz * 2 - edge.dx * lateral, yaw: edge.yaw, color: 'red' };
      approaches.push(approach); group.approaches.push(approach);
      heads.push({ ...approach, id: `head:${signal.id}:${edge.id}`, approachId: approach.id });
      // Register upstream segments once. Runtime queries only inspect this edge's
      // short candidate list, including when the mapped signal segment is tiny.
      const queue = [{ edge, distance: stopPosition }], visited = new Set();
      for (let cursor = 0; cursor < queue.length && cursor < 256; cursor++) {
        const item = queue[cursor];
        if (visited.has(item.edge.id)) continue;
        visited.add(item.edge.id);
        if (!byEdge.has(item.edge.id)) byEdge.set(item.edge.id, []);
        byEdge.get(item.edge.id).push({ approach, distance: item.distance });
        if (item.distance > LOOK_BACK) continue;
        for (const previous of incoming.get(item.edge.from.id) || []) {
          // No propagation through U-turns or sideways branching junctions.
          if (previous.from === item.edge.to || previous.dx * item.edge.dx + previous.dz * item.edge.dz < .75) continue;
          queue.push({ edge: previous, distance: previous.length + item.distance });
        }
      }
    }
  }
  // External road vehicles do not all expose graph edge/position. Index only
  // controlled approach segments for their pose queries, once at construction.
  for (const edge of graph.edges) {
    if (!byEdge.has(edge.id)) continue;
    for (let x = Math.floor((Math.min(edge.from.x, edge.to.x) - 6) / 64); x <= Math.floor((Math.max(edge.from.x, edge.to.x) + 6) / 64); x++) {
      for (let z = Math.floor((Math.min(edge.from.z, edge.to.z) - 6) / 64); z <= Math.floor((Math.max(edge.from.z, edge.to.z) + 6) / 64); z++) {
        const key = `${x},${z}`;
        if (!poseCells.has(key)) poseCells.set(key, []);
        poseCells.get(key).push(edge);
      }
    }
  }
  const byId = new Map(approaches.map(approach => [approach.id, approach]));
  let elapsed = 0;
  function updateColors() {
    for (const group of groups) {
      // A standalone pedestrian crossing still has a red hold period.
      const phases = Math.max(2, group.axes.length), span = GREEN + AMBER + ALL_RED;
      const local = elapsed % (phases * span), axis = Math.floor(local / span), age = local % span;
      group.phase = axis;
      for (const approach of group.approaches) approach.color = axis === approach.axis ? age < GREEN ? 'green' : age < GREEN + AMBER ? 'amber' : 'red' : 'red';
    }
    for (const head of heads) head.color = byId.get(head.approachId).color;
  }
  function stopDistance(car, { length = 4.5 } = {}) {
    if (!car) return Infinity;
    let edge = car.edge, position = car.position;
    if (!edge || !Number.isFinite(position)) {
      if (![car.x, car.z, car.yaw].every(Number.isFinite)) return Infinity;
      let closest = Infinity;
      for (const candidate of poseCells.get(`${Math.floor(car.x / 64)},${Math.floor(car.z / 64)}`) || []) {
        if (-Math.sin(car.yaw) * candidate.dx - Math.cos(car.yaw) * candidate.dz < .9) continue;
        const dx = car.x - candidate.from.x, dz = car.z - candidate.from.z;
        const along = dx * candidate.dx + dz * candidate.dz;
        const across = Math.abs(dx * candidate.dz - dz * candidate.dx - candidate.laneOffset);
        if (along < -.5 || along > candidate.length + .5 || across > 2.4 || across >= closest) continue;
        closest = across; edge = candidate; position = along;
      }
      if (!edge || !Number.isFinite(position)) return Infinity;
    }
    let distance = Infinity;
    for (const candidate of byEdge.get(edge.id) || []) {
      if (candidate.approach.color === 'green') continue;
      const centerToLine = candidate.distance - position;
      // The front has already crossed: clear the junction rather than stopping
      // in its conflict area on amber/red. No speed-dependent amber exemption.
      if (centerToLine < Math.max(0, length) / 2 - .05) continue;
      distance = Math.min(distance, Math.max(0, centerToLine - Math.max(0, length) / 2 - .35));
    }
    return distance;
  }
  updateColors();
  return { approaches, heads, groups,
    step(dt) { if (Number.isFinite(dt) && dt > 0) { elapsed += dt; updateColors(); } },
    reset() { elapsed = 0; updateColors(); },
    stateForApproach(id) { return byId.get(id)?.color ?? null; }, stopDistance,
    get elapsed() { return elapsed; },
    timing: Object.freeze({ green: GREEN, amber: AMBER, allRed: ALL_RED, estimated: true }) };
}
