// Pure reviewed baseline; Host imports this without renderer dependencies.
export const PERMANENT_RECORD=Object.freeze({id:'permanentrecord',name:'Permanent Record',slot:4,cooldown:25,cooldownBand:'ultimate',
  range:9,radius:9,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,speedMultiplier:1,invulnerable:true,
  duration:4,windup:.6,invulnerabilityDuration:.25,interval:1,wardMaxApplicationsPerTarget:4,
  zoneTickInterval:1,zoneMaxTicksPerTarget:4,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:true});
export const WARD_MAX_STEP=.05;
export function isPermanentRecord(a) {
  return a!==null&&typeof a==='object'&&Object.entries(PERMANENT_RECORD).every(([key,value])=>a[key]===value);
}
export function permanentRecordClock(age) {
  const expired=age>=4-1e-12,pulseIndex=Math.min(3,Math.floor((age+1e-12)/1));
  return {expired,pulseIndex,bright:!expired&&age-pulseIndex<.25-1e-12};
}
export function permanentRecordEligible(target,center,team) {
  return (target.living??target.alive)!==false&&target.team===team&&['hero','trooper'].includes(target.kind)&&
    Math.hypot(target.position.x-center.x,target.position.y-center.y,target.position.z-center.z)<=9+1e-9;
}
