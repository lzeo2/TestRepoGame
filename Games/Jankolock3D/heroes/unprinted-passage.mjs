// Pure shared baseline/geometry. Floor sampling and covered placement belong to Runtime.
export const UNPRINTED_PASSAGE=Object.freeze({id:'unprintedpassage',name:'Unprinted Passage',slot:4,cooldown:24,cooldownBand:'ultimate',
  range:16,radius:3,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:.25,invulnerable:false,
  duration:5,windup:.65,speedMultiplier:1.35,speedDuration:.5,slowDuration:.5,speedMaxStacks:1,slowMaxStacks:1,
  speedMaxApplicationsPerTarget:20,slowMaxApplicationsPerTarget:20,interval:.25,zoneTickInterval:.5,zoneMaxTicksPerTarget:10,
  fieldCount:6,fieldLayout:'line',placementRadius:0,spacing:3,followsCaster:false});
export function isUnprintedPassage(a) {
  return a!==null&&typeof a==='object'&&!('anchoredSlow' in a)&&!('maxApplicationsPerTarget' in a)&&Object.entries(UNPRINTED_PASSAGE).every(([key,value])=>a[key]===value);
}
export const passageDirection=yaw=>({x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)});
export function passageCenters(origin,direction,floorHeight=()=>origin.y) {
  return Array.from({length:6},(_,i)=>{
    const x=origin.x+direction.x*i*3,z=origin.z+direction.z*i*3,y=floorHeight(x,z,origin.y+2);
    return {x,y:Number.isFinite(y)?y:origin.y,z};
  });
}
export function passageZoneIndex(position,centers) {
  return centers.findIndex(c=>Math.hypot(position.x-c.x,position.y-c.y,position.z-c.z)<=3+1e-9);
}
export function passageClock(age) {
  return {expired:age>=5-1e-12,effectTick:Math.min(19,Math.floor((age+1e-12)/.25)),zoneTick:Math.min(9,Math.floor((age+1e-12)/.5))};
}
