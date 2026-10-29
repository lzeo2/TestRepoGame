import { surfaceHeight } from './traversal.mjs';

// Systems needs feet-height waypoints, not the world's default flat fallback.
// Sample real lane ramp edges so Midway squads walk OVER its bridge, not under it.
export function matchWorld(world) {
  return {...world,lanes:world.lanes.map(lane=>{
    const edges=world.ramps.filter(r=>r.axis==='z'&&lane.x>=r.minX&&lane.x<=r.maxX)
      .flatMap(r=>[r.minZ,r.maxZ]);
    const bends=lane.id===world.arena?.id?world.arena.routeBends:[];
    const approaches=(world.spawns??[]).filter(s=>s.lane===lane.id&&s.type==='guardian');
    const clearance=approaches.flatMap(s=>[s.position.z-32,s.position.z+32]);
    const waypoints=[...new Set([-390,...edges,...clearance,...bends.map(p=>p.z),390])].sort((a,b)=>a-b)
      .map(z=>{
        // Keep the outer formation capsule off the raised guardian's x+3 edge.
        const approach=approaches.some(s=>Math.abs(z-s.position.z)<=32);
        const x=bends.find(p=>p.z===z)?.x??(lane.x-(approach?2:0));
        return {x,y:surfaceHeight(world,x,z,4),z};
      });
    return {...lane,waypoints};
  })};
}
