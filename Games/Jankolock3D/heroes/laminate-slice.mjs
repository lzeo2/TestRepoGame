// Reviewed intake custody, not fresh ZIP bytes, independent rights or supplied-art/native acceptance.
import {PERMANENT_RECORD} from './permanent-record.mjs';
import {SHEEN_WALL} from './sheen-wall.mjs';
export const LAMINATED_SPRINT=Object.freeze({id:'laminatedsprint',name:'Laminated Sprint',slot:3,cooldown:8,cooldownBand:'short',range:0,radius:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:true,duration:4,invulnerabilityDuration:.25,windup:.1,speedMultiplier:1.4,speedMaxStacks:1});
export const isLaminatedSprint=a=>!!a&&Object.entries(LAMINATED_SPRINT).every(([key,value])=>a[key]===value);
export const APPROVED_ONLY=Object.freeze({id:'approvedonly',name:'Approved Only',slot:2,cooldown:13,cooldownBand:'mid',range:0,radius:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:1,invulnerable:true,duration:1.5,windup:.25,speedMultiplier:1,movementStopped:true});
export const isApprovedOnly=a=>!!a&&Object.entries(APPROVED_ONLY).every(([key,value])=>a[key]===value);
export const laminateSlice={id:'laminate',name:'Laminate',health:740,accent:'#3f7f6f',partialSlice:true,role:'Experimental partial QA profile',
  lore:'Five QA profiles: Odo, Whitespace, Laminate, Cassette and partial Fern. Laminate supports Gloss Push, Corner Clip (weapon channel), all four CPU QA slots: Sheen Wall, Approved Only, Laminated Sprint and Permanent Record. Sheen Wall is one 650HP panel with independently resolving cast-time splinters, not reflection. Approved Only grants full invulnerability and a 100% self-stop for 1.5s; this is not exact selective anti-sync immunity. Permanent Record grants four separate 0.25s shields, not percentage damage reduction. The other 35 kits and Fern slots 2 and 4 are unavailable. Native input and supplied-art acceptance remain held.',
  source:{member:'Jankolock_40_Hero_Expansion/assets/laminate/kit.proposed.json',sha256:'9b60138aae5b81f2771ab5503315237bca0a1aa897ceb49accde5520268086e3'},
  weapon:{name:'Gloss Push',baseDamage:18,range:18,interval:.35,magazine:14,reload:1.5,headshotMultiplier:1.3,damageType:'weapon',fx:{color:'#3f7f6f',shape:'short ink rectangle'}},
  melee:{name:'Corner Clip',baseDamage:62,range:3,cooldown:1.2,damageType:'weapon',fx:{color:'#3f7f6f',shape:'flat impact chevron'}},
  abilities:[{...LAMINATED_SPRINT,description:'After 0.1s, gain 1.4-times speed for 4s with only 0.25s opening invulnerability. Self only, no displacement/control-immunity promise, phasing or forced movement. Existing aura cosmetics, not supplied-art acceptance.',
    fx:{color:'#3f7f6f',shape:'parallel panels and trailing chevrons'},cast:{targeting:'self',windup:.1,requiresLineOfSight:true},
    summary:'Gain 1.4 times movement speed for four seconds, with a 0.25-second invulnerability window at the start.',
    effects:[{id:'e1',primitive:'speed',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{multiplier:1.4,duration:4,maxStacks:1}},
      {id:'e2',primitive:'invulnerability',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{duration:.25}}]},
    {...APPROVED_ONLY,description:'After 0.25s, gain 1.5s full invulnerability and a genuine 100% voluntary movement stop. Gravity/collision and combat remain; no phasing or exact selective anti-sync immunity. Existing aura cosmetics, not supplied-art acceptance.',
      fx:{color:'#3f7f6f',shape:'sealed square around caster'},cast:{targeting:'self',windup:.25,requiresLineOfSight:true},
      summary:'Laminate becomes invulnerable for 1.5 seconds while a 100% self-slow makes the defensive stance stationary.',
      effects:[{id:'e1',primitive:'invulnerability',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{duration:1.5}},
        {id:'e2',primitive:'slow',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{fraction:1,duration:1.5,maxStacks:1}}]},
    {...PERMANENT_RECORD,description:'After 0.6s, a radius-9 ward follows Laminate for 4s. Four global pulses at activation and 1/2/3s shield friendly combatants for 0.25s each. No 25% damage reduction or continuous 4s shield. Existing authored circle cosmetics, not supplied-art acceptance.',
      fx:{color:'#3f7f6f',shape:'four concentric glossy rings'},cast:{targeting:'self',windup:.6,requiresLineOfSight:true},
      summary:'A radius-nine ward emits four pulses over four seconds. Allies inside each pulse gain 0.25 seconds of invulnerability.',
      effects:[{id:'e1',primitive:'radius_zone',target:'allies_and_self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{radius:9,duration:4,count:1,layout:'single',placementRadius:0,spacing:0,tickInterval:1,maxTicksPerTarget:4,baseDamage:0,damageType:'none',followsCaster:true}},
        {id:'e2',primitive:'invulnerability',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:1,maxApplicationsPerTarget:4},parameters:{duration:.25},bindTo:'e1'}]},
    {...SHEEN_WALL,description:'After 0.25s, place one 7m-wide, 650HP panel for 4s within 8m. Three separate 12-base-damage splinters travel at 30m/s up to 14m in a 20-degree fan. Your wall can intercept your own shots. Splinters resolve independently; no reflection or incoming-damage scaling. Authored primitives, not supplied-art acceptance.',
      fx:{color:'#3f7f6f',shape:'flat glossy rectangle and three shards'},cast:{targeting:'point',windup:.25,requiresLineOfSight:true},
      summary:'Place a seven-unit panel for four seconds and throw three low-damage laminate splinters forward at cast time.',counterplay:'Flank or destroy the panel; splinters fire only once when it is placed.',designNotes:['No reflection primitive is proposed. Cast-time outgoing splinters are independent projectiles; they never copy an incoming attack or scale with damage received.'],
      effects:[{id:'e1',primitive:'walls',target:'enemies',origin:'aim_point',timing:{trigger:'cast',delay:0},parameters:{count:1,maxActive:1,width:7,height:3,depth:.3,duration:4,health:650,layout:'line',placementRadius:0,spacing:0,blocks:'all_units_and_projectiles'}},
        {id:'e2',primitive:'projectiles',target:'enemies',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{count:3,speed:30,projectileRadius:.2,spreadDegrees:20,baseDamage:12,damageType:'weapon',range:14,maxHitsPerTarget:1,fireInterval:0,pattern:'fan'}}]}],
  unsupportedSlots:{}
};
