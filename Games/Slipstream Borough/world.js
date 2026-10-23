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
// Exact swept radius against the same inflated rectangles, including grazing corners.
export function clearPath(a, b) {
  if(blocked(a.x,a.z)||blocked(b.x,b.z))return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  return !WORLD.blocks.some(block=>{
    let enter=0,exit=1;
    for(const [start,delta,center,half] of [[a.x,dx,block.x,block.width/2+2],[a.z,dz,block.z,block.depth/2+2]]) {
      if(delta===0){if(Math.abs(start-center)>half)return false;}
      else {const lo=(center-half-start)/delta,hi=(center+half-start)/delta;enter=Math.max(enter,Math.min(lo,hi));exit=Math.min(exit,Math.max(lo,hi));}
    }
    return enter<=exit;
  });
}
// Swept radius test shared by city contact and civilian yielding, independent of render geometry.
export function nearPath(a, b, point, radius) {
  const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  const t=length2?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length2)):0;
  return Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz)<radius;
}
const junctions = [-150,-100,-50,0,50,100,150].flatMap(x => [-150,-100,-50,0,50,100,150].map(z => Object.freeze({x,z})));
const neighbors = junctions.map(a => junctions.flatMap((b,i) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===50?[i]:[]));
export function chaseTarget(from, target) {
  if (clearPath(from,target)) return target;
  // Exact costs on the existing 49-junction grid, including visible endpoint connectors.
  const costs=junctions.map(node=>clearPath(node,target)?Math.hypot(node.x-target.x,node.z-target.z):Infinity), done=new Set();
  for(let step=0;step<junctions.length;step++) {
    let next=-1;
    for(let i=0;i<costs.length;i++)if(!done.has(i)&&(next<0||costs[i]<costs[next]))next=i;
    if(next<0||!Number.isFinite(costs[next]))break;
    done.add(next);
    for(const i of neighbors[next])costs[i]=Math.min(costs[i],costs[next]+50);
  }
  let best=from,cost=Infinity;
  for(const [i,node] of junctions.entries()) {
    const distance=Math.hypot(node.x-from.x,node.z-from.z), total=distance+costs[i];
    if(distance>.001&&total<cost-1e-7&&clearPath(from,node)){best=node;cost=total;}
  }
  return best;
}
