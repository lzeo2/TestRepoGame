// Original finite city. The renderer and simulation share these footprints.
const centers = [-125, -75, -25, 25, 75, 125];
// Fixed service lanes: two east/west markets and two north/south warehouse cuts.
// Twelve-metre gaps leave eight metres of usable centerline clearance after radius inflation.
const shortcuts = Object.freeze([
  { x: -75, z: -25, width: 50, depth: 12 },
  { x: 75, z: 25, width: 12, depth: 50 },
  { x: -25, z: 75, width: 50, depth: 12 },
  { x: 125, z: -75, width: 12, depth: 50 }
].map(Object.freeze));
export const WORLD = Object.freeze({
  limit: 165, grid: 50, streetHalfWidth: 11, shortcuts,
  blocks: Object.freeze(centers.flatMap((x, i) => centers.flatMap((z, j) => {
    const lane = shortcuts.find(lane => lane.x === x && lane.z === z);
    if (!lane) return [Object.freeze({ x, z, width: 28, depth: 28, height: 10 + ((i * 7 + j * 11) % 9) * 3 })];
    const across = lane.width > lane.depth;
    return [-1, 1].map(side => Object.freeze({
      x: x + (across ? 0 : side * 10), z: z + (across ? side * 10 : 0),
      width: across ? 28 : 8, depth: across ? 8 : 28,
      height: side < 0 ? 7 : 19 + (i % 2) * 6
    }));
  })))
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
for (const lane of shortcuts) for (const offset of [-25, 0, 25]) {
  junctions.push(Object.freeze({ x: lane.x + (lane.width > lane.depth ? offset : 0), z: lane.z + (lane.depth > lane.width ? offset : 0) }));
}
const neighbors = junctions.map(a => junctions.flatMap((b, i) => {
  const distance = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  return distance > 0 && distance <= 50 && (a.x === b.x || a.z === b.z) && clearPath(a, b) ? [[i, distance]] : [];
}));
export function chaseTarget(from, target) {
  if (clearPath(from,target)) return target;
  // Exact costs on 49 street junctions plus 12 service-lane nodes and visible connectors.
  const costs=junctions.map(node=>clearPath(node,target)?Math.hypot(node.x-target.x,node.z-target.z):Infinity), done=new Set();
  for(let step=0;step<junctions.length;step++) {
    let next=-1;
    for(let i=0;i<costs.length;i++)if(!done.has(i)&&(next<0||costs[i]<costs[next]))next=i;
    if(next<0||!Number.isFinite(costs[next]))break;
    done.add(next);
    for(const [i,distance] of neighbors[next])costs[i]=Math.min(costs[i],costs[next]+distance);
  }
  let best=from,cost=Infinity;
  for(const [i,node] of junctions.entries()) {
    const distance=Math.hypot(node.x-from.x,node.z-from.z), total=distance+costs[i];
    if(distance>.001&&total<cost-1e-7&&clearPath(from,node)){best=node;cost=total;}
  }
  return best;
}
