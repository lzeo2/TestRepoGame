// Reviewed Odo slot4 adapter. Existing aura cosmetics only; no forced movement.
export const END_SHIFT_SPRINT = Object.freeze({id:'endshiftsprint',name:'End of Shift Sprint',slot:4,
  cooldown:23,range:5,radius:5,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,
  invulnerable:false,duration:4,windup:.5,speedMultiplier:1.35,speedDuration:.75,interval:.25,
  speedMaxApplicationsPerTarget:16,speedMaxStacks:1,zoneTickInterval:.5,zoneMaxTicksPerTarget:8,
  fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:true,openingInvulnerabilityDuration:.45});

export function isEndShiftSprint(a) {
  return !!a&&Object.entries(END_SHIFT_SPRINT).every(([key,value])=>a[key]===value);
}

export function endShiftEligible(target,center,team) {
  return target.alive!==false&&target.team===team&&['hero','trooper'].includes(target.kind)&&
    Math.hypot(target.position.x-center.x,target.position.y-center.y,target.position.z-center.z)<=END_SHIFT_SPRINT.radius+1e-9;
}

// The two clocks are distinct: speed at 0..3.75, empty zone ticks at 0..3.5.
export function endShiftClock(age) {
  const expired=age>=END_SHIFT_SPRINT.duration-1e-12;
  return {expired,speedTick:Math.min(15,Math.floor((age+1e-12)/END_SHIFT_SPRINT.interval)),
    zoneTick:Math.min(7,Math.floor((age+1e-12)/END_SHIFT_SPRINT.zoneTickInterval))};
}
