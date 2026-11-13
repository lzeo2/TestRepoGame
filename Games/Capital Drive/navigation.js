// Routes use the same directed OSM graph as ambient traffic.
export function findRoute(graph, start, destination) {
  const roadNodes = [...graph.nodes.values()].filter(node => node.outgoing.some(edge => edge.road.name && edge.road.type !== 'service'));
  if (!roadNodes.length) return [];
  const closest = point => roadNodes.reduce((best, node) =>
    Math.hypot(node.x - point.x, node.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? node : best);
  const from = closest(start), goal = closest(destination);
  const heap = [], costs = new Map([[from.id, 0]]), previous = new Map();
  function push(node, cost) {
    const entry = { node, cost };
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].cost <= cost) break;
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
        if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++;
        if (last.cost <= heap[child].cost) break;
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
