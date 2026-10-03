// Original finite city. The renderer and simulation share these footprints.
const centers = [-125, -75, -25, 25, 75, 125];
export const WORLD = Object.freeze({
  limit: 165, grid: 50, streetHalfWidth: 11,
  blocks: Object.freeze(centers.flatMap((x, i) => centers.map((z, j) =>
    Object.freeze({ x, z, width: 28, depth: 28, height: 10 + ((i * 7 + j * 11) % 9) * 3 }))))
});
export function blocked(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Expected finite coordinates');
  const radius = 2;
  return Math.abs(x) > WORLD.limit - radius || Math.abs(z) > WORLD.limit - radius ||
    WORLD.blocks.some(b => Math.abs(x - b.x) <= b.width / 2 + radius && Math.abs(z - b.z) <= b.depth / 2 + radius);
}
// Sample shorter than the vehicle radius, so neither cars nor cops tunnel through blocks.
export function clearPath(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
  for (let i = 0; i <= steps; i++) if (blocked(a.x + (b.x-a.x)*i/steps, a.z + (b.z-a.z)*i/steps)) return false;
  return true;
}
const junctions = [-150,-100,-50,0,50,100,150].flatMap(x => [-150,-100,-50,0,50,100,150].map(z => ({x,z})));
export function chaseTarget(from, target) {
  if (clearPath(from,target)) return target;
  // ponytail: 49-junction Manhattan heuristic suits this fixed empty street grid; use routing for irregular maps.
  const goal = {x: Math.round(target.x/50)*50, z: Math.round(target.z/50)*50};
  let best = from, cost = Infinity;
  for (const node of junctions) {
    const distance = Math.hypot(node.x-from.x,node.z-from.z);
    if (distance < .1 || !clearPath(from,node)) continue;
    const score = distance + Math.abs(node.x-goal.x) + Math.abs(node.z-goal.z);
    if (score < cost) { best=node; cost=score; }
  }
  return best;
}
