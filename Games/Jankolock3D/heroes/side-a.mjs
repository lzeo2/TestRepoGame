// Reviewed Side A gameplay baseline. Cue ownership and accepted speed tails differ.
export const SIDE_A=Object.freeze({id:'sidea',name:'Side A',slot:1,cooldown:6,cooldownBand:'short',range:8,radius:4,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,speedMultiplier:1.3,duration:.25,windup:.25,speedDuration:2,speedMaxStacks:1,speedMaxApplicationsPerTarget:1,interval:.25,zoneTickInterval:.25,zoneMaxTicksPerTarget:1,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:false});
export const isSideA=a=>!!a&&Object.entries(SIDE_A).every(([key,value])=>a[key]===value);
export function sideAEligible(target,center,team) {
  const p=target?.position;
  return !!p&&(target.living??target.alive)!==false&&['hero','trooper'].includes(target.kind)&&target.team===team&&
    Math.hypot(p.x-center.x,p.y-center.y,p.z-center.z)<=SIDE_A.radius;
}
