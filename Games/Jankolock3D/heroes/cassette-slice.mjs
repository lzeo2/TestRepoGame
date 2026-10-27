// Reviewed intake custody, not fresh ZIP bytes, independent rights or supplied-art/native acceptance.
import {SIDE_A} from './side-a.mjs';
import {RECORDED_ASSEMBLY} from './recorded-assembly.mjs';
import {TAPE_SNAG} from './tape-snag.mjs';
export const BAD_REWIND=Object.freeze({id:'badrewind',name:'Bad Rewind',slot:2,cooldown:12,cooldownBand:'mid',range:0,radius:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,invulnerable:true,duration:2,invulnerabilityDuration:.6,windup:.25,speedMultiplier:1.5,speedMaxStacks:1});
export const isBadRewind=a=>!!a&&Object.entries(BAD_REWIND).every(([key,value])=>a[key]===value);
export const cassetteSlice={id:'cassette',name:'Cassette',health:560,accent:'#89717e',partialSlice:true,role:'Experimental partial QA profile',
  lore:'Five QA profiles: Odo, Whitespace, Laminate, Cassette and partial Fern. Cassette supports Tape Spool, Cassette Corner (weapon channel), all four CPU QA slots: Side A, Bad Rewind, Tape Snag and Recorded Assembly. Bad Rewind is manual movement, not position, HP, ammo, cooldown or world-state restoration. The other 35 kits and Fern slots 2 and 4 are unavailable. Native input and supplied-art acceptance remain held.',
  source:{member:'Jankolock_40_Hero_Expansion/assets/cassette/kit.proposed.json',sha256:'7413411036d9175cfcb7e33c1eb764ebfc827289195ff8eb500336c0c850d4ec'},
  weapon:{name:'Tape Spool',baseDamage:18,range:23,interval:.32,magazine:15,reload:1.5,headshotMultiplier:1.4,damageType:'weapon',fx:{color:'#89717e',shape:'short ink rectangle'}},
  melee:{name:'Cassette Corner',baseDamage:58,range:2.9,cooldown:1,damageType:'weapon',fx:{color:'#89717e',shape:'flat impact chevron'}},
  abilities:[{...SIDE_A,description:'After 0.25s, place a fixed radius-4 cue within 8m for 0.25s. One initial pulse grants friendly combatants inside 1.3-times speed for 2s. No entry-trigger refresh or automatic caster boost outside the cue. Existing circle cosmetics, not supplied-art acceptance.',
    fx:{color:'#89717e',shape:'forward-pointing paired chevrons'},cast:{targeting:'point',windup:.25,requiresLineOfSight:true},
    summary:'A radius-four cue at the aimed point gives allies 1.3 times speed for two seconds when they touch its first pulse.',
    effects:[{id:'e1',primitive:'radius_zone',target:'allies_and_self',origin:'aim_point',timing:{trigger:'cast',delay:0},parameters:{radius:4,duration:.25,count:1,layout:'single',placementRadius:0,spacing:0,tickInterval:.25,maxTicksPerTarget:1,baseDamage:0,damageType:'none',followsCaster:false}},
      {id:'e2',primitive:'speed',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:1},parameters:{multiplier:1.3,duration:2,maxStacks:1},bindTo:'e1'}]},
    {...BAD_REWIND,description:'After 0.25s, gain 0.6s invulnerability and 1.5-times speed for 2s. Movement is manual; no position, HP, ammo, cooldown or world-state rewind. Existing aura cosmetics, not supplied-art acceptance.',
      fx:{color:'#89717e',shape:'reverse chevrons inside square'},cast:{targeting:'self',windup:.25,requiresLineOfSight:true},summary:'For 0.6 seconds become invulnerable, then keep a 1.5-times movement bonus for two seconds to retreat manually.',
      effects:[{id:'e1',primitive:'invulnerability',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{duration:.6}},
        {id:'e2',primitive:'speed',target:'self',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{multiplier:1.5,duration:2,maxStacks:1}}]},
    {...RECORDED_ASSEMBLY,description:'After 0.7s, place a fixed radius-7 zone within 10m for 4s. Four global beats grant 0.2s shields; sixteen quarter-second samples grant 1.2-times speed with 1s linger. No healing, restoration or continuous shield. Existing circle cosmetics, not supplied-art acceptance.',
      fx:{color:'#89717e',shape:'four alternating rectangular beats'},cast:{targeting:'point',windup:.7,requiresLineOfSight:true},summary:'A radius-seven assembly zone emits four one-second beats. Allies receive short 0.2-second invulnerability windows and 1.2-times speed between regrouping beats.',
      effects:[{id:'e1',primitive:'radius_zone',target:'allies_and_self',origin:'aim_point',timing:{trigger:'cast',delay:0},parameters:{radius:7,duration:4,count:1,layout:'single',placementRadius:0,spacing:0,tickInterval:1,maxTicksPerTarget:4,baseDamage:0,damageType:'none',followsCaster:false}},
        {id:'e2',primitive:'invulnerability',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:1,maxApplicationsPerTarget:4},parameters:{duration:.2},bindTo:'e1'},
        {id:'e3',primitive:'speed',target:'allies_and_self',origin:'caster',timing:{trigger:'while_inside',delay:0,repeatInterval:.25,maxApplicationsPerTarget:16},parameters:{multiplier:1.2,duration:1,maxStacks:1},bindTo:'e1'}]},
    {...TAPE_SNAG,description:'After 0.25s, link the same living hostile combatant within 13m. Twelve quarter-second samples slow 35% while the visible link remains within 15m and clear, for up to 3s. Last slow lingers 0.5s. No damage, healing, reveal or displacement; existing tether cosmetics, not supplied-art acceptance.',
      fx:{color:'#89717e',shape:'thin tape tether with square nodes'},cast:{targeting:'unit',windup:.25,requiresLineOfSight:true},summary:'Tether one enemy for three seconds and apply a 35% slow while the visible tape link remains intact.',
      counterplay:'Break the tape by moving beyond fifteen units or behind cover.',designNotes:['Proposed composition of listed mechanics only; adapter timing and collision semantics remain unverified.'],
      effects:[{id:'e1',primitive:'tether',target:'enemies',origin:'caster',timing:{trigger:'cast',delay:0},parameters:{range:13,breakDistance:15,duration:3,maxLinks:1,requiresLineOfSight:true}},
        {id:'e2',primitive:'slow',target:'enemies',origin:'caster',timing:{trigger:'while_linked',delay:0,repeatInterval:.25,maxApplicationsPerTarget:12},parameters:{fraction:.35,duration:.5,maxStacks:1},bindTo:'e1'}]}],
  unsupportedSlots:{}
};
