// Widths are conservative presentation defaults, not surveyed carriageway measurements.
export function roadProfile(road = {}) {
  const tags = road.sourceTags || {}, service = tags.service || road.service || '';
  const access = tags.motor_vehicle || tags.vehicle || tags.access || road.access || '';
  const minor = ['driveway', 'parking_aisle', 'drive-through', 'emergency_access'].includes(service);
  const privateRoad = ['private', 'no'].includes(access);
  const taggedWidth = Number.parseFloat(tags.width);
  const base = Number.isFinite(taggedWidth) && taggedWidth > 0 ? taggedWidth : Number(road.width) || 8;
  const driveWidth = Math.max(2.5, Math.min(minor ? (service === 'parking_aisle' ? 4.2 : 3.2) : 24, base));
  const trafficAllowed = !minor && !privateRoad;
  const taggedLanes = /^\d+$/.test(String(tags.lanes || '')) ? Number(tags.lanes) : null;
  const lanes = taggedLanes > 0 ? Math.min(8, taggedLanes) : road.oneway && driveWidth >= 7 ? Math.max(2, Math.min(4, Math.round(driveWidth / 3.6))) : driveWidth >= 5 ? 2 : 1;
  const motorway = /^(motorway|motorway_link)$/.test(road.type || '');
  const pavementWidth = minor || motorway || tags.sidewalk === 'no' || tags.sidewalk === 'none' ? 0 : road.type === 'service' ? .75 : 1.65;
  return { driveWidth, pavementWidth, lanes, lanesFromSource: taggedLanes > 0,
    sidewalkLeft: pavementWidth > 0 && tags.sidewalk !== 'right' && tags['sidewalk:left'] !== 'no',
    sidewalkRight: pavementWidth > 0 && tags.sidewalk !== 'left' && tags['sidewalk:right'] !== 'no',
    major: /^(primary|trunk|motorway)(?:_link)?$/.test(road.type || ''),
    hasKerb: !minor && !motorway, markings: !minor && road.type !== 'service' && driveWidth >= 5,
    trafficAllowed, busAllowed: trafficAllowed && !['no', 'private'].includes(tags.bus) && road.type !== 'service' && driveWidth >= 4.5 };
}

export function roadMarkingOffsets(road, profile = roadProfile(road)) {
  if (!profile.markings) return [];
  return road.oneway ? Array.from({ length: profile.lanes - 1 }, (_, i) => -profile.driveWidth / 2 + profile.driveWidth * (i + 1) / profile.lanes) : [0];
}

export function applyRoadProfiles(map, sidecar = {}) {
  const profiles = sidecar.roads || {};
  return { ...map, roads: (map.roads || []).map(road => {
    const annotated = { ...road, sourceTags: { ...(road.sourceTags || {}), ...(profiles[road.id] || {}) } };
    return { ...annotated, profile: roadProfile(annotated) };
  }) };
}

// Search is called when assigning a route, never from the frame loop.
export function createRoutePlanner(graph) {
  const nodes = [...graph.nodes.values()];
  const profiles = new Map();
  const networks = {
    car: { outgoing: new Map(), eligible: new Set(), candidates: [] },
    bus: { outgoing: new Map(), eligible: new Set(), candidates: [] }
  };
  // The graph and its access profiles are immutable for the planner lifetime.
  // Build eligibility and legal adjacency once, rather than rescanning the city per route.
  for (const edge of graph.edges) {
    if (!profiles.has(edge.road)) profiles.set(edge.road, roadProfile(edge.road));
    const profile = profiles.get(edge.road);
    for (const kind of ['car', 'bus']) {
      if (!profile[kind === 'bus' ? 'busAllowed' : 'trafficAllowed']) continue;
      const network = networks[kind];
      network.eligible.add(edge.from); network.eligible.add(edge.to);
      if (!network.outgoing.has(edge.from)) network.outgoing.set(edge.from, []);
      network.outgoing.get(edge.from).push(edge);
    }
  }
  for (const network of Object.values(networks)) {
    network.candidates = nodes.filter(node => network.eligible.has(node));
    network.eligible.clear();
  }
  profiles.clear();
  const limit = Math.min(100000, Math.max(1, graph.edges.length * 2 + nodes.length));
  function findEdges(start, goal, { kind = 'car' } = {}) {
    const network = networks[kind === 'bus' ? 'bus' : 'car'];
    function resolve(point) {
      if (point == null) return null;
      const id = typeof point === 'object' ? point.id : point;
      if (id !== undefined && graph.nodes.has(String(id))) return graph.nodes.get(String(id));
      if (![point.x, point.z].every(Number.isFinite)) return null;
      let best = null, distance = Infinity;
      for (const node of network.candidates) {
        const d = Math.hypot(point.x - node.x, point.z - node.z);
        if (d < distance) { distance = d; best = node; }
      }
      return best;
    }
    const from = resolve(start), target = resolve(goal);
    if (!from || !target || from === target) return [];
    const costs = new Map([[from, 0]]), previous = new Map(), heap = [{ node: from, cost: 0 }];
    function push(entry) {
      let i = heap.length; heap.push(entry);
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p].cost <= entry.cost) break; heap[i] = heap[p]; i = p; }
      heap[i] = entry;
    }
    function pop() {
      const first = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let c = i * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1].cost < heap[c].cost) c++;
          if (last.cost <= heap[c].cost) break;
          heap[i] = heap[c]; i = c;
        }
        heap[i] = last;
      }
      return first;
    }
    for (let visits = 0; heap.length && visits < limit; visits++) {
      const { node, cost } = pop();
      if (cost !== costs.get(node)) continue;
      if (node === target) {
        const route = [];
        for (let at = target; at !== from;) { const edge = previous.get(at); if (!edge) return []; route.push(edge); at = edge.from; }
        return route.reverse();
      }
      for (const edge of network.outgoing.get(node) || []) {
        const next = cost + edge.length;
        if (next < (costs.get(edge.to) ?? Infinity)) { costs.set(edge.to, next); previous.set(edge.to, edge); push({ node: edge.to, cost: next }); }
      }
    }
    return [];
  }
  return { findEdges };
}
