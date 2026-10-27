// Real Host protocol/API placement tests, not native casting, floor/LOS/cadence,
// network identity, render acceptance or fresh raw archive-byte verification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { createSystems } from '../systems.mjs';
import { loadCharacter } from '../character-assets.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { PlayerController } from './player-controller.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { SPEED_TRAP as trap } from './speed-trap.mjs';
const review=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url))),raw=review.heroes.find(h=>h.id==='odometer').proposedKit.abilities.find(a=>a.slot===2);
assert.equal(trap.radius,raw.effects[0].parameters.radius);assert.equal(trap.duration,raw.effects[0].parameters.duration);assert.equal(trap.slow,raw.effects[1].parameters.fraction);assert.equal(trap.slowDuration,raw.effects[1].parameters.duration);assert.equal(trap.revealDuration,raw.effects[2].parameters.duration);assert.equal(trap.revealMode,raw.effects[2].parameters.mode);assert.equal(trap.windup,raw.cast.windup);
const actual=odometerSlice.abilities.find(a=>a.id===trap.id);if(actual)for(const[key,value]of Object.entries(trap))assert.equal(actual[key],value);
const kit={...structuredClone(odometerSlice),abilities:[...structuredClone(odometerSlice.abilities.filter(a=>a.slot!==2)),structuredClone(actual??trap)]};
const natives=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../../docs/${name}`,import.meta.url))).heroes);
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejections=0;
{
 const s=createSystems();for(const [i,k]of natives.entries()){const h=s.addHero({id:`native-${i}`,team:i%2?'ivory':'carbon'});assert.ok(s.configureHeroKit(h.id,k).ok);}s.step(30);
 const arrays=[s.heroes,s.troopers,s.structures],actors=arrays.flat();let reads=0;
 // Instrument array searches, not gameplay/status grants. Restore even on RED.
 for(const array of arrays){const find=array.find;array.find=function(...args){reads++;return find.apply(this,args);};}
 try{for(const actor of actors)for(const team of ['carbon','ivory'])assert.equal(s.isRevealedTo(actor.id,team),false);}finally{for(const array of arrays)delete array.find;}
 console.log(`No-reveal query read check: ${actors.length*2} queries, ${reads} entity-array find calls`);
 assert.equal(reads,0,'default/no-reveal actor queries must not search entity arrays');
}
function fixture(cloak=false){
 const s=createSystems(),h=s.addHero({id:'odo',team:'carbon',position:p()}),ally=s.addHero({id:'ally',team:'carbon',position:p(1)});
 // Imported starting currency funds the real cloak purchase, not economy progress.
 const e=s.addHero({id:'enemy',team:'ivory',...(cloak?{souls:3200}:{position:p(4)})});
 if(cloak){assert.ok(s.buyItem(e.id,'shadow-cloak').ok);assert.ok(s.moveHero(e.id,p(4)).ok);}
 const input=structuredClone(kit);assert.ok(s.configureHeroKit(h.id,input,{partialSlice:true}).ok);s.step(30);if(cloak)assert.ok(s.activateItem(e.id,'shadow-cloak').ok);
 const origin=p(4),event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:trap.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:.4,duration:4,damageType:'none',...extra});
 const start=id=>event('deployment-start',null,{deploymentId:id,origin:{...origin}}),end=id=>event('deployment-end',null,{deploymentId:id}),slow=(id,target=e)=>event('status',target,{deploymentId:id,origin:{...origin},slowDuration:.5}),reveal=(id,target=e)=>event('reveal',target,{deploymentId:id,origin:{...origin},revealDuration:1.5,revealMode:'enemy_outline'});
 const actors=()=>[...s.heroes,...s.troopers,...s.structures],state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id)),reveals:actors().map(x=>[x.id,s.isRevealedTo(x.id,'carbon'),s.isRevealedTo(x.id,'ivory')])});
 const reject=value=>{const before=state();assert.equal(s.applyHeroEffect(value).ok,false);assert.deepEqual(state(),before);rejections++;};
 const apply=value=>{const resources=()=>JSON.stringify(actors().map(x=>[x.id,x.hp,x.ammo,x.souls,x.earnedSouls,x.cooldowns,x.recall,x.cloakUntil])),before=resources(),result=s.applyHeroEffect(value);assert.ok(result.ok,result.reason);assert.equal(resources(),before);return result;};
 const ticks=n=>{for(let i=0;i<n;i++)assert.ok(s.step(.05).ok);};
 return{s,h,e,ally,input,origin,event,start,end,slow,reveal,state,reject,apply,ticks};
}
for(const k of natives){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,k).ok);}
for(const k of [kit,...review.heroes.map(h=>h.proposedKit)]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.equal(s.configureHeroKit(h.id,k).ok,false);}
for(const abilities of [kit.abilities.filter(a=>a.slot===1||a.slot===3),kit.abilities.filter(a=>a.slot!==2),kit.abilities.filter(a=>a.slot!==4),[...kit.abilities].reverse()]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,{...kit,abilities},{partialSlice:true}).ok);}
const bad=[{slot:4},{baseDamage:1},{baseHeal:1},{spiritScale:1},{damageType:'spirit'},{invulnerable:true},{slow:.5},{slowDuration:1},{duration:5},{windup:0},{radius:4},{range:17},{slowMaxApplicationsPerTarget:17},{revealMaxApplicationsPerTarget:17},{revealDuration:2},{revealMode:'all'},{interval:.5},{zoneTickInterval:.25},{zoneMaxTicksPerTarget:9},{fieldCount:2},{fieldLayout:'radial'},{placementRadius:1},{spacing:1},{followsCaster:true},{anchoredSlow:false},{maxApplicationsPerTarget:16}];
for(const extra of bad){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'}),input=structuredClone(kit);Object.assign(input.abilities.find(a=>a.id===trap.id),extra);const before=structuredClone(h);assert.equal(s.configureHeroKit(h.id,input,{partialSlice:true}).ok,false);assert.deepEqual(h,before);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);}
{
 const f=fixture(true),{s,h,e,ally,start,end,slow,reveal,apply,reject,ticks}=f,cloak=e.cloakUntil;
 assert.equal(s.isRevealedTo(e.id,'carbon'),false);reject(slow(1));reject(reveal(1));
 const sent=start(1);apply(sent);sent.origin.x=9000;
 apply(slow(1));apply(reveal(1));near(s.stats(e.id).moveSpeed,4.8);assert.equal(e.cloakUntil,cloak);assert.equal(s.isRevealedTo(e.id,'carbon'),true);
 for(const [id,team]of [[e.id,'ivory'],[h.id,'carbon'],[ally.id,'carbon'],['missing','carbon'],[e.id,'invalid'],[e.id,null]])assert.equal(s.isRevealedTo(id,team),false);
 for(let i=1;i<16;i++)apply(slow(1));reject(slow(1)); // Slow budget does not exhaust reveal budget.
 for(let i=1;i<16;i++)apply(reveal(1));reject(reveal(1));
 ticks(10);near(s.stats(e.id).moveSpeed,8);assert.equal(s.isRevealedTo(e.id,'carbon'),true);reject(reveal(1));reject(slow(1));
 apply(end(1));assert.equal(s.isRevealedTo(e.id,'carbon'),true);assert.equal(e.cloakUntil,cloak);ticks(20);assert.equal(s.isRevealedTo(e.id,'carbon'),false,'exhausted attempts cannot extend reveal tail');
}
{
 const f=fixture(),{s,h,e,start,end,slow,reveal,reject,apply}=f;
 for(const extra of [{source:'missing'},{source:e.id},{target:e.id},{origin:undefined},{origin:p(16.000001)},{origin:p(NaN)},{team:'ivory'},{slow:.5},...[undefined,0,-1,1.5,Infinity,'1'].map(deploymentId=>({deploymentId}))])reject({...start(1),...extra});
 apply(start(1));
 for(const extra of [{deploymentId:undefined},{deploymentId:2},{origin:undefined},{origin:p(5)},{source:'missing'},{target:f.ally.id},{target:h.id},{target:'missing'},{baseDamage:1},{baseHeal:1},{spiritScale:1},{slow:.5},{slowDuration:1},{slowMaxApplicationsPerTarget:99}])reject({...slow(1),...extra});
 for(const extra of [{revealDuration:2},{revealMode:'all'},{revealMaxApplicationsPerTarget:99},{target:f.ally.id},{deploymentId:undefined},{target:'missing'}])reject({...reveal(1),...extra});
 reject({...reveal(1),ability:'fastlane',slow:0,duration:2});
 const d=f.input.abilities.find(a=>a.id===trap.id);Object.assign(d,{duration:999,radius:999,slow:.9,slowDuration:99,revealDuration:99,slowMaxApplicationsPerTarget:99,revealMaxApplicationsPerTarget:99});
 assert.ok(s.moveHero(h.id,p(100)).ok);apply(slow(1));apply(reveal(1));reject({...slow(1),origin:{...h.position}});
 assert.ok(s.moveHero(e.id,p(7.000001)).ok);reject(slow(1));reject(reveal(1));assert.ok(s.moveHero(e.id,p(7)).ok);apply(slow(1));apply(reveal(1));
 f.origin.x=100;apply(start(2));assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});assert.ok(s.moveHero(e.id,p(101)).ok);apply(reveal(2));reject(reveal(1));
 s.phase='finished'; // Public inactive fixture only.
 reject(start(3));reject(slow(2));reject(reveal(2));apply(end(2));assert.equal(s.isRevealedTo(e.id,'carbon'),true);assert.deepEqual(s.applyHeroEffect(end(2)),{ok:true,ended:false});
}
await loadCharacter('stampead');
{
 const f=fixture(),{s,e,h,apply,reject,start,end,slow,reveal}=f;assert.ok(s.configureHeroKit(e.id,natives[0]).ok);
 const scene=new THREE.Scene(),c=new PlayerController({position:e.position,boxes:[],floorHeight:()=>0}),r=new HeroRuntime({scene,controller:c,kit:natives[0],source:e.id,team:e.team,onEffect:event=>{const result=s.applyHeroEffect(event);assert.ok(result.ok,result.reason);return result;}});
 assert.ok(r.cast(4));assert.equal(s.stats(e.id).invulnerable,true);apply(start(1));reject(slow(1));apply(reveal(1));assert.equal(s.isRevealedTo(e.id,'carbon'),true);
 r.reset();apply(slow(1)); // Actual OverTime cleanup makes the previously rejected first slow retry valid.
 const objective=s.structures.find(x=>x.team==='ivory'&&!x.vulnerable);assert.ok(s.moveHero(h.id,objective.position).ok);Object.assign(f.origin,objective.position);apply(start(2));reject(slow(2,objective));apply(reveal(2,objective));assert.equal(s.isRevealedTo(objective.id,'carbon'),true);
 apply(end(2));assert.equal(s.isRevealedTo(objective.id,'carbon'),true);r.dispose();assert.equal(scene.children.length,0);
}
{
 const f=fixture(),{s,h,e,start,end,slow,reveal,apply,reject,ticks}=f;
 apply(start(1));for(let i=0;i<16;i++){if(i)ticks(5);apply(slow(1));apply(reveal(1));}near(s.time,33.75);
 ticks(5);reject(slow(1));reject(reveal(1));near(s.stats(e.id).moveSpeed,4.8);assert.equal(s.isRevealedTo(e.id,'carbon'),true);
 ticks(4);near(s.stats(e.id).moveSpeed,4.8);ticks(1);near(s.stats(e.id).moveSpeed,8);ticks(19);assert.equal(s.isRevealedTo(e.id,'carbon'),true);ticks(1);assert.equal(s.isRevealedTo(e.id,'carbon'),false);reject(start(1));
 apply(start(2));apply(reveal(2));assert.ok(s.damage(h.id,1e6,e.id,{kind:'ability'}).killed);reject(reveal(2));assert.deepEqual(s.applyHeroEffect(end(2)),{ok:true,ended:false});assert.equal(s.isRevealedTo(e.id,'carbon'),true,'source death retains other-target info tail');
 ticks(30);assert.equal(s.isRevealedTo(e.id,'carbon'),false);s.step(h.respawnRemaining);assert.ok(s.moveHero(h.id,p()).ok);reject(start(2));apply(start(3));apply(reveal(3));assert.ok(s.damage(e.id,1e6,h.id,{kind:'ability'}).killed);assert.equal(s.isRevealedTo(e.id,'carbon'),false,'dead targets are never revealed');
}
{
 const f=fixture(),{s,h,e,apply,start,end,reveal,ticks}=f,other=s.addHero({id:'other-carbon',team:'carbon',position:p()});assert.ok(s.configureHeroKit(other.id,kit,{partialSlice:true}).ok);assert.ok(s.configureHeroKit(e.id,kit,{partialSlice:true}).ok);
 apply(start(1));apply(reveal(1));ticks(10);apply({...start(1),source:other.id});apply({...reveal(1),source:other.id});apply(end(1));ticks(20);assert.equal(s.isRevealedTo(e.id,'carbon'),true,'second caster owns its independent later tail');ticks(10);assert.equal(s.isRevealedTo(e.id,'carbon'),false);
 apply({...start(1),source:e.id,origin:p()});apply({...reveal(1,h),source:e.id,origin:p()});assert.equal(s.isRevealedTo(h.id,'ivory'),true);assert.equal(s.isRevealedTo(h.id,'carbon'),false);
}
{
 const f=fixture(),{s,h,apply,start,slow,ticks}=f,t=s.troopers.find(t=>t.alive&&t.team==='ivory');assert.ok(t);let before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,.4);
 assert.ok(s.moveHero(h.id,t.position).ok);Object.assign(f.origin,t.position);apply(start(1));apply(slow(1,t));assert.ok(s.moveHero(h.id,p()).ok);before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,.24);
 ticks(8);before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,.4);
}
console.log(`Speed Trap Host PASS: 8 native/40 raw controls; older known subsets retained; ${bad.length} exact baseline rejection/retries; ${rejections} no-mutation protocol rejections; independent16 caps/.5 slow/1.5 reveal tails, fixed radius3/4s anchors, team query, actual cloak purchase/OverTime cast, immune-objective info, death/stale cleanup/source isolation and real NPC .4->.24->.4 walking. CPU protocol only.`);
