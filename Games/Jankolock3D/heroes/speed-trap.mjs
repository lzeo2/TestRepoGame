// Reviewed Speed Trap adapter; no renderer dependency (also imported by Host).
export const SPEED_TRAP=Object.freeze({id:'speedtrap',name:'Speed Trap',slot:2,cooldown:11,cooldownBand:'mid',
  range:16,radius:3,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:.4,invulnerable:false,
  speedMultiplier:1,duration:4,windup:.25,slowDuration:.5,slowMaxStacks:1,slowMaxApplicationsPerTarget:16,
  revealDuration:1.5,revealMode:'enemy_outline',revealMaxApplicationsPerTarget:16,interval:.25,
  zoneTickInterval:.5,zoneMaxTicksPerTarget:8,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:false});
export function isSpeedTrap(a) {
  return a!==null&&typeof a==='object'&&!('anchoredSlow' in a)&&!('maxApplicationsPerTarget' in a)&&Object.entries(SPEED_TRAP).every(([key,value])=>a[key]===value);
}
export function speedTrapEligible(target,center,team,kind='reveal') {
  return (target.living??target.alive)!==false&&target.team!==team&&
    (kind==='status'?['hero','trooper']:['hero','trooper','structure']).includes(target.kind)&&
    Math.hypot(target.position.x-center.x,target.position.y-center.y,target.position.z-center.z)<=SPEED_TRAP.radius+1e-9;
}
export function speedTrapClock(age) {
  return {expired:age>=SPEED_TRAP.duration-1e-12,effectTick:Math.min(15,Math.floor((age+1e-12)/SPEED_TRAP.interval)),
    zoneTick:Math.min(7,Math.floor((age+1e-12)/SPEED_TRAP.zoneTickInterval))};
}
