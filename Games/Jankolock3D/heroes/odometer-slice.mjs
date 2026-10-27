// Operator-authorized partial player slice. Source is reviewed data, not executable code.
// Custody matches the recorded intake; no fresh raw archive-byte verification is claimed.
export const odometerSlice = {
  id:'odometer',name:'Odo',role:'Experimental partial slice',health:560,accent:'#73834e',
  lore:'Five QA profiles: Odo, Whitespace, Laminate, Cassette and partial Fern. Odo supports Dash Counter, Mileage Tap (weapon channel), Fast Lane, Speed Trap, Flying Digits and End of Shift Sprint. Other 35 kits and Fern slots 2 and 4 are unavailable. Native input and supplied-art acceptance remain held.',
  partialSlice:true,
  source:{member:'Jankolock_40_Hero_Expansion/assets/odometer/kit.proposed.json',sha256:'78c8e79e0dd8861b48764d3626d027dee097247bff07a72854668031cac6cdf2'},
  weapon:{name:'Dash Counter',baseDamage:17,range:22,interval:.25,magazine:20,reload:1.6,headshotMultiplier:1.4,damageType:'weapon',fx:{color:'#73834e',shape:'short ink rectangle'}},
  melee:{name:'Mileage Tap',baseDamage:62,range:2.8,cooldown:1,damageType:'weapon',fx:{color:'#73834e',shape:'flat impact chevron'}},
  abilities:[{id:'fastlane',name:'Fast Lane',slot:1,cooldown:6,range:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:2,speedMultiplier:1.7,invulnerable:false,windup:.1,
    description:'After 0.1s, gain 1.7-times speed for 2s. Movement remains player-controlled. Existing aura cosmetics only.',
    fx:{color:'#73834e',shape:'long parallel dash marks'}},
    {id:'speedtrap',name:'Speed Trap',slot:2,cooldown:11,cooldownBand:'mid',range:16,radius:3,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:.4,invulnerable:false,speedMultiplier:1,duration:4,windup:.25,
      slowDuration:.5,slowMaxStacks:1,slowMaxApplicationsPerTarget:16,revealDuration:1.5,revealMode:'enemy_outline',revealMaxApplicationsPerTarget:16,interval:.25,zoneTickInterval:.5,zoneMaxTicksPerTarget:8,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:false,
      description:'After 0.25s, place a fixed radius-3 checkpoint at the current covered ground reticle within 16m for 4s. Enemies are slowed 40% and revealed to your team; last applications linger 0.5s/1.5s. Existing zone/cage cosmetics, not exact mesh outlines or supplied art.',
      fx:{color:'#73834e',shape:'two square gates around a disc'},cast:{targeting:'point',windup:.25,requiresLineOfSight:true},
      summary:'A radius-three checkpoint reveals enemies and slows them by 40% for a four-second field lifetime.',
      effects:[
        {id:'e1',primitive:'radius_zone',target:'enemies',origin:'aim_point',timing:{trigger:'cast',delay:0},parameters:{radius:3,duration:4,count:1,layout:'single',placementRadius:0,spacing:0,tickInterval:.5,maxTicksPerTarget:8,baseDamage:0,damageType:'none',followsCaster:false}},
        {id:'e2',primitive:'slow',target:'enemies',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:16},parameters:{fraction:.4,duration:.5,maxStacks:1},bindTo:'e1'},
        {id:'e3',primitive:'reveal',target:'enemies',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:16},parameters:{duration:1.5,mode:'enemy_outline'},bindTo:'e1'}
      ]},
    {id:'flyingdigits',name:'Flying Digits',slot:3,cooldown:8,range:25,damageType:'weapon',baseDamage:18,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,windup:.25,
      projectileCount:4,projectileSpeed:40,projectileRadius:.2,spreadDegrees:28,maxHitsPerTarget:2,fireInterval:0,pattern:'fan',duration:25/40,
      // TTL is derived from range/speed, not a proposed buff lifetime. The adapter uses
      // fixed input direction, resolution-time muzzle and conservative expanded AABBs,
      // not exact rounded corners, mesh geometry, new animation or supplied FX GLB art.
      description:'After 0.25s, launch four simultaneous 18-base-damage markers in a 28-degree fan, at 40m/s up to 25m. At most two hits per target. Conservative expanded-box collisions; existing dash cosmetics.',
      fx:{color:'#73834e',shape:'four narrow dash projectiles'}},
    {id:'endshiftsprint',name:'End of Shift Sprint',slot:4,cooldown:23,cooldownBand:'ultimate',range:5,radius:5,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,duration:4,windup:.5,
      speedMultiplier:1.35,speedDuration:.75,interval:.25,speedMaxApplicationsPerTarget:16,speedMaxStacks:1,zoneTickInterval:.5,zoneMaxTicksPerTarget:8,fieldCount:1,fieldLayout:'single',placementRadius:0,spacing:0,followsCaster:true,openingInvulnerabilityDuration:.45,
      description:'After 0.5s, a radius-5 field follows Odo for 4s. Friendly living heroes/troopers gain 1.35-times speed with 0.75s last-application linger; only Odo gains one opening 0.45s invulnerability window. Existing aura cosmetics only.',
      fx:{color:'#73834e',shape:'wide circular route with double chevrons'},
      cast:{targeting:'self',windup:.5,requiresLineOfSight:true},
      summary:'A moving radius-five rally field grants allies 1.35-times speed for four seconds; Odo additionally receives one 0.45-second opening invulnerability window.',
      effects:[
        {id:'e1',primitive:'radius_zone',target:'allies_and_self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{radius:5,duration:4,count:1,layout:'single',placementRadius:0,spacing:0,tickInterval:.5,maxTicksPerTarget:8,baseDamage:0,damageType:'none',followsCaster:true}},
        {id:'e2',primitive:'speed',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:16},parameters:{multiplier:1.35,duration:.75,maxStacks:1},bindTo:'e1'},
        {id:'e3',primitive:'invulnerability',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{duration:.45}}
      ]}],
  unsupportedSlots:{}
};
