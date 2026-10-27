// Reviewed non-damaging link. Owned link and accepted slow tails have separate clocks.
export const TAPE_SNAG=Object.freeze({id:'tapesnag',name:'Tape Snag',slot:3,cooldown:10,cooldownBand:'mid',range:13,breakDistance:15,duration:3,windup:.25,slow:.35,slowDuration:.5,interval:.25,linkMaxApplicationsPerTarget:12,maxLinks:1,linkRequiresLineOfSight:true,slowMaxStacks:1,baseDamage:0,baseHeal:0,spiritScale:0,radius:0,damageType:'none',invulnerable:false,speedMultiplier:1});
export const isTapeSnag=a=>!!a&&Object.entries(TAPE_SNAG).every(([key,value])=>a[key]===value);
export function tapeSnagEligible(target,source,team,range=TAPE_SNAG.breakDistance) {
  const p=target?.position;
  return !!p&&typeof target.id==='string'&&target.id.length>0&&target.alive!==false&&target.living!==false&&target.hidden!==true&&
    ['hero','trooper'].includes(target.kind)&&['carbon','ivory'].includes(target.team)&&target.team!==team&&
    Math.hypot(p.x-source.x,p.y-source.y,p.z-source.z)<=range+1e-9;
}
export const tapeSnagClock=age=>({expired:age>=TAPE_SNAG.duration-1e-9,pulseIndex:Math.min(11,Math.floor((age+1e-9)/TAPE_SNAG.interval))});
