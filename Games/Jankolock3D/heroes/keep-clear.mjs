// Cardinal corridor convention: spacing is the clear inner gap, not center spacing.
export const KEEP_CLEAR=Object.freeze({id:'keepclear',name:'Keep Clear',slot:2,cooldown:11,cooldownBand:'mid',range:13,windup:.25,duration:4,count:2,maxActive:2,width:5,height:2.6,depth:.3,health:280,layout:'parallel',placementRadius:0,spacing:5,blocks:'all_units_and_projectiles',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,radius:0,damageType:'none',invulnerable:false,speedMultiplier:1});
export const isKeepClear=a=>!!a&&Object.entries(KEEP_CLEAR).every(([key,value])=>a[key]===value);
export const keepClearAxis=yaw=>Math.abs(Math.sin(yaw))>Math.abs(Math.cos(yaw))?'x':'z';
export function keepClearBounds(origin,axis) {
  if(!origin||!['x','y','z'].every(k=>Number.isFinite(origin[k]))||!['x','z'].includes(axis))throw new TypeError('Invalid Keep Clear geometry');
  return Object.freeze([-1,1].map(sign=>{
    const x=origin.x+(axis==='z'?sign*(KEEP_CLEAR.spacing+KEEP_CLEAR.depth)/2:0),z=origin.z+(axis==='x'?sign*(KEEP_CLEAR.spacing+KEEP_CLEAR.depth)/2:0);
    const hx=(axis==='x'?KEEP_CLEAR.width:KEEP_CLEAR.depth)/2,hz=(axis==='z'?KEEP_CLEAR.width:KEEP_CLEAR.depth)/2;
    return Object.freeze({minX:x-hx,maxX:x+hx,minY:origin.y,maxY:origin.y+KEEP_CLEAR.height,minZ:z-hz,maxZ:z+hz});
  }));
}
// Swept feet AABB: expand horizontally by radius and downward by body height.
export function panelSegment(from,to,bounds,radius=0,height=0) {
  if(!from||!to||!bounds||!Number.isFinite(radius)||radius<0||!Number.isFinite(height)||height<0)return null;
  let entry=0,exit=1;
  for(const [axis,lo,hi] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]) {
    const start=from[axis],delta=to[axis]-start,min=bounds[lo]-(axis==='y'?height:radius),max=bounds[hi]+(axis==='y'?0:radius);
    if(![start,delta,min,max].every(Number.isFinite)||min>max)return null;
    if(delta===0){if(start<min||start>max)return null;continue;}
    const a=(min-start)/delta,b=(max-start)/delta;entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(entry>exit)return null;
  }
  return entry;
}
