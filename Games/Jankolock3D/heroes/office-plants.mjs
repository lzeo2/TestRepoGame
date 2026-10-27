// Fern's two reviewed fixed-point fields. Accepted target tails outlive field ownership.
export const WINDOW_PATCH=Object.freeze({id:'windowpatch',name:'Window Patch',slot:1,cooldown:8,cooldownBand:'short',range:10,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,duration:3,windup:.25,radius:4,fieldCount:1,layout:'single',placementRadius:0,spacing:0,followsCaster:false,zoneTickInterval:.5,zoneMaxTicksPerTarget:6,interval:.25,speedMultiplier:1.2,speedDuration:.75,speedMaxStacks:1,speedMaxApplicationsPerTarget:12});
export const PATIENT_GROWTH=Object.freeze({id:'patientgrowth',name:'Patient Growth',slot:3,cooldown:11,cooldownBand:'mid',range:7,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:true,invulnerabilityDuration:.35,duration:2.25,windup:.25,radius:3,fieldCount:1,layout:'single',placementRadius:0,spacing:0,followsCaster:false,speedMultiplier:1,interval:2,wardInterval:2,wardMaxApplicationsPerTarget:2,zoneTickInterval:2,zoneMaxTicksPerTarget:2});
export function isOfficePlantsSupport(a) {
  const d=a?.id==='windowpatch'?WINDOW_PATCH:a?.id==='patientgrowth'?PATIENT_GROWTH:null;
  return !!d&&Object.entries(d).every(([key,value])=>a[key]===value);
}
export function officePlantsClock(age,definition=WINDOW_PATCH) {
  const d=definition.id==='patientgrowth'?PATIENT_GROWTH:WINDOW_PATCH,expired=age>=d.duration-1e-9;
  const effectIndex=Math.min((d.wardMaxApplicationsPerTarget??d.speedMaxApplicationsPerTarget)-1,Math.floor((age+1e-9)/d.interval));
  return {expired,effectIndex,zoneIndex:Math.min(d.zoneMaxTicksPerTarget-1,Math.floor((age+1e-9)/d.zoneTickInterval)),
    bright:!expired&&(d.id==='windowpatch'||age-effectIndex*d.interval<d.invulnerabilityDuration-1e-9)};
}
export function officePlantsEligible(target,center,team,definition=WINDOW_PATCH) {
  const p=target?.position;
  return !!p&&(target.living??target.alive)!==false&&['hero','trooper'].includes(target.kind)&&target.team===team&&
    Math.hypot(p.x-center.x,p.y-center.y,p.z-center.z)<=definition.radius;
}
