// Reviewed fixed field: four ward samples and sixteen concurrent speed samples.
export const RECORDED_ASSEMBLY=Object.freeze({id:'recordedassembly',name:'Recorded Assembly',slot:4,cooldown:24,cooldownBand:'ultimate',range:10,radius:7,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:true,duration:4,invulnerabilityDuration:.2,windup:.7,speedMultiplier:1.2,speedDuration:1,interval:.25,wardInterval:1,wardMaxApplicationsPerTarget:4,speedMaxApplicationsPerTarget:16,speedMaxStacks:1,zoneTickInterval:1,zoneMaxTicksPerTarget:4,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:false});
export const isRecordedAssembly=a=>!!a&&Object.entries(RECORDED_ASSEMBLY).every(([key,value])=>a[key]===value);
export function recordedAssemblyClock(age) {
  const expired=age>=4-1e-9,wardIndex=Math.min(3,Math.floor((age+1e-9)/1)),applicationIndex=Math.min(15,Math.floor((age+1e-9)/.25));
  return {expired,wardIndex,applicationIndex,bright:!expired&&age-wardIndex<.2-1e-9};
}
export function recordedAssemblyEligible(target,center,team) {
  const p=target?.position;
  return !!p&&(target.living??target.alive)!==false&&['hero','trooper'].includes(target.kind)&&target.team===team&&
    Math.hypot(p.x-center.x,p.y-center.y,p.z-center.z)<=RECORDED_ASSEMBLY.radius;
}
