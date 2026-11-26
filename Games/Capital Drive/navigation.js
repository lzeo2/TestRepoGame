// Direct manual-flight guidance in world metres/radians. No road graph,
// altitude target, collision query or autopilot authority is involved.
// turnAngle is positive to the pilot's RIGHT, suitable for a HUD arrow.
export function aerialGuidance(pose,destination,{arrivalRadius=35,straightAngle=.12}={}) {
  if(!pose||!destination||![pose.x,pose.z,pose.yaw,destination.x,destination.z].every(Number.isFinite))return null;
  const dx=destination.x-pose.x,dz=destination.z-pose.z,distance=Math.hypot(dx,dz);
  if(!Number.isFinite(distance))return null;
  const radius=Number.isFinite(arrivalRadius)&&arrivalRadius>=0?arrivalRadius:35;
  const tolerance=Number.isFinite(straightAngle)?Math.max(0,Math.min(Math.PI/2,straightAngle)):.12;
  const arrived=distance<=radius,bearing=distance>0?Math.atan2(-dx,-dz):Math.atan2(Math.sin(pose.yaw),Math.cos(pose.yaw));
  const turnAngle=arrived?0:Math.atan2(Math.sin(pose.yaw-bearing),Math.cos(pose.yaw-bearing));
  return {distance,bearing,turnAngle,turn:arrived?'arrived':Math.abs(turnAngle)<=tolerance?'straight':turnAngle>0?'right':'left',arrived};
}

// Routes use the same directed OSM graph as ambient traffic.
export function findRoute(graph, start, destination) {
  const roadNodes = [...graph.nodes.values()].filter(node => node.outgoing.some(edge => edge.road.name && edge.road.type !== 'service' && !edge.road.standalonePath));
  if (!roadNodes.length) return [];
  const closest = point => roadNodes.reduce((best, node) =>
    Math.hypot(node.x - point.x, node.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? node : best);
  const from = closest(start), goal = closest(destination);
  const heap = [], costs = new Map([[from.id, 0]]), previous = new Map();
  function push(node, cost) {
    // buildRoadGraph uses Euclidean edge lengths. Straight-line distance is
    // therefore an admissible, consistent lower bound on this directed graph.
    const priority = cost + Math.hypot(node.x - goal.x, node.z - goal.z);
    const entry = { node, cost, priority };
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].priority <= priority) break;
      heap[i] = heap[parent]; i = parent;
    }
    heap[i] = entry;
  }
  function pop() {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].priority < heap[child].priority) child++;
        if (last.priority <= heap[child].priority) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  }
  push(from, 0);
  while (heap.length) {
    const { node, cost } = pop();
    if (cost !== costs.get(node.id)) continue;
    if (node === goal) break;
    for (const edge of node.outgoing) {
      if (edge.road.standalonePath) continue;
      const nextCost = cost + edge.length;
      if (nextCost < (costs.get(edge.to.id) ?? Infinity)) {
        costs.set(edge.to.id, nextCost);
        previous.set(edge.to.id, edge);
        push(edge.to, nextCost);
      }
    }
  }
  if (!costs.has(goal.id)) return [];
  const route = [[goal.x, goal.z]];
  let node = goal;
  while (node !== from) {
    const edge = previous.get(node.id);
    if (!edge) return [];
    node = edge.from; route.push([node.x, node.z]);
  }
  return route.reverse();
}
