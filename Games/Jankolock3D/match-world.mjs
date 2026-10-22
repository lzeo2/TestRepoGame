import { surfaceHeight } from './traversal.mjs';

// Systems needs feet-height waypoints, not the world's default flat fallback.
// Sample real lane ramp edges so Midway squads walk OVER its bridge, not under it.
export function matchWorld(world) {
  return {...world,lanes:world.lanes.map(lane=>{
    const edges=world.ramps.filter(r=>r.axis==='z'&&lane.x>=r.minX&&lane.x<=r.maxX)
      .flatMap(r=>[r.minZ,r.maxZ]);
    const waypoints=[...new Set([-390,...edges,390])].sort((a,b)=>a-b)
      .map(z=>({x:lane.x,y:surfaceHeight(world,lane.x,z,4),z}));
    return {...lane,waypoints};
  })};
}
