// Reviewed intake data, not fresh archive-byte proof or supplied-art/native acceptance.
import {UNPRINTED_PASSAGE} from './unprinted-passage.mjs';
import {KEEP_CLEAR} from './keep-clear.mjs';
export const WIDE_MARGIN=Object.freeze({id:'widemargin',name:'Wide Margin',slot:1,cooldown:6,cooldownBand:'short',range:0,radius:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,duration:2.5,windup:.1,speedMultiplier:1.55,speedMaxStacks:1});
export const isWideMargin=a=>!!a&&Object.entries(WIDE_MARGIN).every(([key,value])=>a[key]===value);
export const CLEAN_BREAK=Object.freeze({id:'cleanbreak',name:'Clean Break',slot:3,cooldown:12,cooldownBand:'mid',range:0,radius:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:true,duration:1,invulnerabilityDuration:.7,windup:.25,speedMultiplier:1.2,speedMaxStacks:1});
export const isCleanBreak=a=>!!a&&Object.entries(CLEAN_BREAK).every(([key,value])=>a[key]===value);
export const whitespaceSlice={
  id:'whitespace',name:'Whitespace',role:'Experimental partial QA profile',health:560,accent:'#6c8589',partialSlice:true,
  lore:'Five QA profiles: Odo, Whitespace, Laminate, Cassette and partial Fern. Whitespace supports Margin Flick, Blank Edge (weapon channel), all four CPU QA slots: Wide Margin, Keep Clear, Clean Break and Unprinted Passage. Clean Break grants 0.7s invulnerability and 1s speed, not invisibility, phasing or teleportation. The other 35 kits and Fern slots 2 and 4 are unavailable. Native input and supplied-art acceptance remain held.',
  source:{member:'Jankolock_40_Hero_Expansion/assets/whitespace/kit.proposed.json',sha256:'95844a6e65ed6d9df1ca1093acc8a2700d7b6921de60f6f12554505536997607'},
  weapon:{name:'Margin Flick',baseDamage:18,range:22,interval:.3,magazine:16,reload:1.4,headshotMultiplier:1.4,damageType:'weapon',fx:{color:'#6c8589',shape:'short ink rectangle'}},
  melee:{name:'Blank Edge',baseDamage:62,range:2.9,cooldown:1,damageType:'weapon',fx:{color:'#6c8589',shape:'flat impact chevron'}},
  abilities:[{...WIDE_MARGIN,description:'After 0.1s, gain 1.55-times speed for 2.5s. Self only, player-controlled movement. Existing aura cosmetics, not supplied-art acceptance.',fx:{color:'#6c8589',shape:'two clean parallel margin lines'},
    cast:{targeting:'self',windup:.1,requiresLineOfSight:true},summary:'Gain 1.55-times speed for 2.5 seconds to move along a player-chosen route.',
    effects:[{id:'e1',primitive:'speed',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{multiplier:1.55,duration:2.5,maxStacks:1}}]},
    {...CLEAN_BREAK,description:'After 0.25s, gain 0.7s invulnerability and 1.2-times speed for 1s. Self only, no invisibility, phasing or teleportation. Existing aura cosmetics, not supplied-art acceptance.',
      fx:{color:'#6c8589',shape:'empty square bordered by four short dashes'},cast:{targeting:'self',windup:.25,requiresLineOfSight:true},
      summary:'Gain 0.7 seconds of invulnerability and 1.2-times speed for one second; no location is skipped.',
      effects:[{id:'e1',primitive:'invulnerability',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{duration:.7}},
        {id:'e2',primitive:'speed',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{multiplier:1.2,duration:1,maxStacks:1}}]},
    {...UNPRINTED_PASSAGE,description:'After 0.65s, place six fixed radius-3 circles spaced 3m apart for 5s. Allies gain 1.35-times speed and enemies are slowed 25%, once per union sample. Last effects linger 0.5s. Full route must be clear; no portal, phasing or forced travel. Authored circle primitives, not supplied-art acceptance.',
      fx:{color:'#6c8589',shape:'six pale outlined circles between margins'},cast:{targeting:'direction',windup:.65,requiresLineOfSight:true},
      summary:'Six overlapping radius-three zones define a fifteen-unit route. Allies gain 1.35-times speed and enemies receive 25% slow while inside for five seconds.',
      effects:[
        {id:'e1',primitive:'radius_zone',target:'all_units',origin:'aim_line',timing:{trigger:'cast',delay:0},parameters:{radius:3,duration:5,count:6,layout:'line',placementRadius:0,spacing:3,tickInterval:.5,maxTicksPerTarget:10,baseDamage:0,damageType:'none',followsCaster:false}},
        {id:'e2',primitive:'speed',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:20},parameters:{multiplier:1.35,duration:.5,maxStacks:1},bindTo:'e1'},
        {id:'e3',primitive:'slow',target:'enemies',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:20},parameters:{fraction:.25,duration:.5,maxStacks:1},bindTo:'e1'}]},
    {...KEEP_CLEAR,description:'After 0.25s, place two parallel 5m panels, each 280 HP, for 4s within 13m. Cardinal corridor axis, 5m clear inner gap, flat support only. Blocks all units/projectiles; both ends remain open. Authored box primitives, not supplied-art or native acceptance.',fx:{color:'#6c8589',shape:'two thin offset blank panels'},cast:{targeting:'point',windup:.25,requiresLineOfSight:true},
      summary:'Place two short parallel panels with a five-unit gap for four seconds, channeling movement without closing a room.',counterplay:'The passage stays open at both ends and each panel is fragile.',designNotes:['Proposed composition of listed mechanics only; adapter timing and collision semantics remain unverified.'],
      effects:[{id:'e1',primitive:'walls',target:'enemies',origin:'aim_point',timing:{trigger:'cast',delay:0},parameters:{count:2,maxActive:2,width:5,height:2.6,depth:.3,duration:4,health:280,layout:'parallel',placementRadius:0,spacing:5,blocks:'all_units_and_projectiles'}}]}],
  unsupportedSlots:{}
};
