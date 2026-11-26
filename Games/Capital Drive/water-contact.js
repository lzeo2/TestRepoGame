// Water rings share the immutable map lifetime of the shoreline spatial index.
// The tree selects candidates only; parity, projection and contact arithmetic
// retain the original polygon narrow phase, including source-order distance ties.
export function prepareWaterRing(points, metrics = null) {
  const paritySlack = 1e-7;
  let area = 0;
  const edges = [];
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    area += a[0] * b[1] - b[0] * a[1];
    edges.push({ a, b, order: i, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minZ: Math.min(a[1], b[1]), maxZ: Math.max(a[1], b[1]) });
  }
  function build(items) {
    if (!items.length) return null;
    const node = { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity };
    for (const edge of items) {
      node.minX = Math.min(node.minX, edge.minX); node.maxX = Math.max(node.maxX, edge.maxX);
      node.minZ = Math.min(node.minZ, edge.minZ); node.maxZ = Math.max(node.maxZ, edge.maxZ);
    }
    if (items.length <= 8) { node.edges = items; return node; }
    const axis = node.maxX - node.minX >= node.maxZ - node.minZ ? 0 : 1;
    items.sort((a, b) => a.a[axis] + a.b[axis] - b.a[axis] - b.b[axis] || a.order - b.order);
    const middle = items.length >>> 1;
    node.left = build(items.slice(0, middle)); node.right = build(items.slice(middle));
    return node;
  }
  const root = build(edges);
  function contains(x, z) {
    let inside = false;
    function visit(node) {
      // Preserve the original ray arithmetic at vertices despite rounding.
      if (!node || z < node.minZ || z >= node.maxZ || x > node.maxX + paritySlack) return;
      if (node.edges) {
        for (const edge of node.edges) {
          if (z < edge.minZ || z >= edge.maxZ || x > edge.maxX + paritySlack) continue;
          const { a, b } = edge;
          if (metrics) metrics.parityEdges = (metrics.parityEdges || 0) + 1;
          if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
      } else { visit(node.left); visit(node.right); }
    }
    visit(root);
    return inside;
  }
  function contact(x, z, radius) {
    const inside = contains(x, z);
    let closestDistance = Infinity, closestX = 0, closestZ = 0, closestDX = 0, closestDZ = 0, order = Infinity;
    function lowerBound(node) {
      const dx = Math.max(node.minX - x, 0, x - node.maxX), dz = Math.max(node.minZ - z, 0, z - node.maxZ);
      return dx * dx + dz * dz;
    }
    function visit(node, lower) {
      // Conservative slack affects pruning only, never a returned contact.
      if (!node || lower > (closestDistance + 1e-7) ** 2) return;
      if (node.edges) {
        for (const edge of node.edges) {
          if (metrics) metrics.contactEdges = (metrics.contactEdges || 0) + 1;
          const { a, b } = edge, dx = b[0] - a[0], dz = b[1] - a[1];
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
          const px = a[0] + dx * t, pz = a[1] + dz * t, distance = Math.hypot(x - px, z - pz);
          if (distance < closestDistance || (distance === closestDistance && edge.order < order)) {
            closestDistance = distance; closestX = px; closestZ = pz; closestDX = dx; closestDZ = dz; order = edge.order;
          }
        }
      } else {
        const left = lowerBound(node.left), right = lowerBound(node.right);
        if (left <= right) { visit(node.left, left); visit(node.right, right); }
        else { visit(node.right, right); visit(node.left, left); }
      }
    }
    if (root) visit(root, lowerBound(root));
    if (order === Infinity || (!inside && closestDistance >= radius)) return null;
    let nx = x - closestX, nz = z - closestZ;
    const length = Math.hypot(nx, nz);
    if (length > 0.0001) { nx /= length; nz /= length; }
    else {
      const edgeLength = Math.hypot(closestDX, closestDZ) || 1, winding = area < 0 ? -1 : 1;
      nx = closestDZ / edgeLength * winding; nz = -closestDX / edgeLength * winding;
    }
    if (inside && length > 0.0001) { nx = -nx; nz = -nz; }
    return { nx, nz, depth: inside ? radius + closestDistance : radius - closestDistance };
  }
  return { contains, contact };
}
