// Real Host protocol tests, CPU API placement/clock only. No native casting,
// geometry/network/cadence authority or fresh raw ZIP verification is claimed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSystems } from '../systems.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { END_SHIFT_SPRINT as rally } from './end-shift-sprint.mjs';
const raw=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url))),proposed=raw.heroes.find(h=>h.id==='odometer').proposedKit.abilities.find(a=>a.slot===4);
assert.equal(rally.name,proposed.name);assert.equal(rally.cooldown,proposed.cooldown);assert.equal(rally.windup,proposed.cast.windup);
assert.equal(rally.duration,proposed.effects[0].parameters.duration);assert.equal(rally.radius,proposed.effects[0].parameters.radius);assert.equal(rally.speedMultiplier,proposed.effects[1].parameters.multiplier);assert.equal(rally.speedDuration,proposed.effects[1].parameters.duration);assert.equal(rally.openingInvulnerabilityDuration,proposed.effects[2].parameters.duration);
const actual=odometerSlice.abilities.find(a=>a.id===rally.id);if(actual)for(const[key,value]of Object.entries(rally))assert.equal(actual[key],value);
const kit={...structuredClone(odometerSlice),abilities:[...structuredClone(odometerSlice.abilities.filter(a=>a.slot===1||a.slot===3)),structuredClone(actual??rally)]};
const native=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../../docs/${name}`,import.meta.url))).heroes);
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture(cloak=false){
 const s=createSystems(),h=s.addHero({id:'odo',team:'carbon',position:p()}),e=s.addHero({id:'enemy',team:'ivory',position:p(1)});
 // Optional imported starting currency funds one real item, not earned progress.
 const ally=s.addHero({id:'ally',team:'carbon',...(cloak?{souls:3200}:{position:p(4)})});
 if(cloak){assert.ok(s.buyItem(ally.id,'shadow-cloak').ok);assert.ok(s.moveHero(ally.id,p(4)).ok);}
 const input=structuredClone(kit);assert.ok(s.configureHeroKit(h.id,input,{partialSlice:true}).ok);s.step(30);
 if(cloak)assert.ok(s.activateItem(ally.id,'shadow-cloak').ok);
 const origin=p(),event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:rally.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:4,damageType:'none',...extra});
 const start=id=>event('deployment-start',null,{deploymentId:id,origin:{...origin}}),end=id=>event('deployment-end',null,{deploymentId:id}),speed=(id,target=ally)=>event('speed',target,{deploymentId:id,origin:{...h.position},speedMultiplier:1.35,speedDuration:.75});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});
 const reject=(event,reason)=>{const before=state(),result=s.applyHeroEffect(event);assert.equal(result.ok,false);if(reason)assert.equal(result.reason,reason);assert.deepEqual(state(),before);rejected++;};
 const apply=event=>{const resources=()=>JSON.stringify([...s.heroes,...s.troopers,...s.structures].map(x=>[x.id,x.hp,x.ammo,x.souls,x.earnedSouls,x.cooldowns,x.recall,x.cloakUntil]));const before=resources(),result=s.applyHeroEffect(event);assert.ok(result.ok,result.reason);assert.equal(resources(),before);return result;};
 const ticks=n=>{for(let i=0;i<n;i++)assert.ok(s.step(.05).ok);};
 return{s,h,e,ally,input,origin,event,start,end,speed,state,reject,apply,ticks};
}
for(const k of native){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,k).ok);}
for(const k of [kit,...raw.heroes.map(h=>h.proposedKit)]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.equal(s.configureHeroKit(h.id,k).ok,false);}
for(const abilities of [kit.abilities.filter(a=>a.slot!==4),[...kit.abilities].reverse()]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,{...kit,abilities},{partialSlice:true}).ok);}
const malformed=[{slot:2},{baseDamage:1},{baseHeal:1},{spiritScale:1},{slow:.1},{invulnerable:true},{duration:5},{windup:0},{range:6},{radius:6},{speedMultiplier:2},{speedDuration:1},{interval:.5},{speedMaxApplicationsPerTarget:17},{speedMaxStacks:2},{zoneTickInterval:.25},{zoneMaxTicksPerTarget:9},{fieldCount:2},{fieldLayout:'radial'},{placementRadius:1},{spacing:1},{followsCaster:false},{openingInvulnerabilityDuration:1}];
for(const change of malformed){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'}),input=structuredClone(kit);Object.assign(input.abilities.find(a=>a.id===rally.id),change);const before=structuredClone(h);assert.equal(s.configureHeroKit(h.id,input,{partialSlice:true}).ok,false);assert.deepEqual(h,before);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);}
for(const abilities of [kit.abilities.filter(a=>a.slot!==1),kit.abilities.filter(a=>a.slot!==3),[...kit.abilities,{...rally,id:'unknown'}],[kit.abilities[0],kit.abilities[1],{...kit.abilities[0],slot:4}]]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.equal(s.configureHeroKit(h.id,{...kit,abilities},{partialSlice:true}).ok,false);}
{
 const f=fixture(true),{s,h,e,ally,start,end,speed,apply,ticks,reject}=f,cloak=ally.cloakUntil;
 apply(start(1));assert.equal(s.stats(h.id).invulnerable,true);assert.equal(s.stats(ally.id).invulnerable,false);assert.equal(s.stats(e.id).invulnerable,false);
 apply(speed(1));apply(speed(1,h));near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(h.id).moveSpeed,10.8);assert.equal(ally.cloakUntil,cloak);
 const hp=h.hp;assert.equal(s.damage(h.id,10,e.id,{kind:'ability'}).reason,'invulnerable');assert.equal(h.hp,hp);
 ticks(5);apply(speed(1,h));ticks(3);assert.equal(s.stats(h.id).invulnerable,true);ticks(1);assert.equal(s.stats(h.id).invulnerable,false,'opening expires at .45 despite speed refresh');
 assert.ok(s.damage(h.id,10,e.id,{kind:'ability'}).ok);assert.ok(h.hp<hp,'real damage can resume after the opening window');
 apply(end(1));near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(h.id).moveSpeed,10.8);reject(speed(1));ticks(6);near(s.stats(ally.id).moveSpeed,8);near(s.stats(h.id).moveSpeed,10.8);ticks(5);near(s.stats(h.id).moveSpeed,8);
}
{
 const f=fixture(),{s,h,ally,start,end,speed,apply,reject,ticks}=f;reject(speed(1));
 for(const extra of [{target:ally.id},{origin:undefined},{origin:p(.000001)},{origin:p(NaN)},{team:'ivory'},{invulnerable:true},{duration:5},...[undefined,0,-1,1.5,Infinity,'1'].map(deploymentId=>({deploymentId}))])reject({...start(1),...extra});
 apply(start(1));
 for(const extra of [{source:'missing'},{source:ally.id},{target:ally.id},{speedDuration:99},{openingInvulnerabilityDuration:2},{deploymentId:'1'}])reject({...end(1),...extra});
 assert.equal(s.stats(h.id).invulnerable,true,'invalid cleanup cannot clear opening ownership');
 for(const extra of [{source:'missing'},{source:ally.id},{deploymentId:undefined},{deploymentId:2},{origin:undefined},{origin:p(.000001)},{speedMultiplier:2},{speedDuration:1},{baseDamage:1},{baseHeal:1},{spiritScale:1},{target:f.e.id},{target:'missing'},{target:s.structures[0].id},{speedMaxApplicationsPerTarget:99},{openingInvulnerabilityDuration:2}])reject({...speed(1),...extra});
 reject({...speed(1),ability:'fastlane'});reject({...speed(1),ability:'fastlane',duration:2,speedMultiplier:1.7});reject({...speed(1),kind:'buff'});reject({...speed(1),kind:'damage'});
 const d=f.input.abilities.find(a=>a.id===rally.id);Object.assign(d,{radius:999,duration:999,speedDuration:99,speedMultiplier:99,speedMaxApplicationsPerTarget:999,openingInvulnerabilityDuration:99});
 assert.ok(s.moveHero(h.id,p(100)).ok);assert.ok(s.moveHero(ally.id,p(105.000001)).ok);reject(speed(1));assert.ok(s.moveHero(ally.id,p(105)).ok);reject({...speed(1),origin:p()});
 for(let i=0;i<16;i++)apply(speed(1));near(s.stats(ally.id).moveSpeed,10.8);reject(speed(1),'speed application budget exhausted');ticks(15);near(s.stats(ally.id).moveSpeed,8);reject(speed(1),'speed application budget exhausted');
 assert.ok(s.moveHero(ally.id,p(200)).ok);assert.ok(s.moveHero(ally.id,p(104)).ok);reject(speed(1),'speed application budget exhausted');
 f.origin.x=100;apply(start(2));apply(speed(2));reject(speed(1));assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});assert.equal(s.stats(h.id).invulnerable,true);
 ticks(5);assert.equal(s.stats(h.id).invulnerable,true);apply(end(2));assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,10.8);ticks(10);near(s.stats(ally.id).moveSpeed,8);
}
{
 const f=fixture(),{s,h,ally,start,end,speed,apply,ticks,reject}=f;
 apply(start(1));for(let i=0;i<16;i++){if(i)ticks(5);apply(speed(1));}near(s.time,33.75);near(s.stats(ally.id).moveSpeed,10.8);ticks(5);reject(speed(1));near(s.stats(ally.id).moveSpeed,10.8);ticks(9);near(s.stats(ally.id).moveSpeed,10.8);ticks(1);near(s.stats(ally.id).moveSpeed,8);reject(start(1));
 apply(start(2));ticks(9);assert.ok(s.damage(h.id,1e6,f.e.id,{kind:'ability'}).killed);assert.deepEqual(s.applyHeroEffect(end(2)),{ok:true,ended:false});reject(speed(2));s.step(h.respawnRemaining);assert.ok(s.moveHero(h.id,p()).ok);reject(start(2));apply(start(3));
 s.phase='finished'; // Public inactive-phase fixture, not victory evidence.
 reject(start(4));reject(speed(3));apply(end(3));assert.equal(s.stats(h.id).invulnerable,false);assert.deepEqual(s.applyHeroEffect(end(3)),{ok:true,ended:false});
}
{
 const f=fixture(),{s,h,ally,start,end,speed,apply,ticks}=f,fast=kit.abilities.find(a=>a.id==='fastlane');
 const buff={kind:'buff',source:h.id,target:h.id,ability:fast.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:2,damageType:'none',speedMultiplier:1.7,invulnerable:false};
 apply(start(1));apply(speed(1,h));assert.ok(s.applyHeroEffect(buff).ok);near(s.stats(h.id).moveSpeed,13.6);ticks(4);apply(end(1));near(s.stats(h.id).moveSpeed,13.6);assert.equal(s.stats(h.id).invulnerable,false);
 assert.ok(s.applyHeroEffect({...buff,kind:'buff-end'}).ok);near(s.stats(h.id).moveSpeed,10.8);
 const other=s.addHero({id:'other',team:'carbon',position:p()});assert.ok(s.configureHeroKit(other.id,kit,{partialSlice:true}).ok);apply(start(2));apply({...start(1),source:other.id});
 for(let i=0;i<16;i++)apply(speed(2));apply({...speed(1),source:other.id});near(s.stats(ally.id).moveSpeed,10.8);apply(end(2));assert.equal(s.stats(other.id).invulnerable,true);assert.equal(s.stats(h.id).invulnerable,false);
 const troop=s.troopers.find(t=>t.alive&&t.team==='carbon');assert.ok(troop);assert.ok(s.moveHero(h.id,troop.position).ok);f.origin.x=h.position.x;f.origin.y=h.position.y;f.origin.z=h.position.z;apply(start(3));apply(speed(3,troop));
}
// Protocol fixture: API placement near the real spawned wave; no troop position/HP/status writes.
for(const withSlow of [false,true]) {
 const f=fixture(),{s,h,e,apply,start,speed,ticks}=f,troop=s.troopers.find(t=>t.alive&&t.team==='carbon');assert.ok(troop);
 let before=troop.distanceMarched;ticks(1);near(troop.distanceMarched-before,.4);
 assert.ok(s.moveHero(h.id,troop.position).ok);Object.assign(f.origin,h.position);apply(start(1));
 let slow=0;
 if(withSlow){
  const gooey=native.find(k=>k.id==='gooey'),a=gooey.abilities.find(a=>a.id==='puddle');assert.ok(a.slow>0);assert.ok(s.configureHeroKit(e.id,gooey).ok);assert.ok(s.moveHero(e.id,troop.position).ok);
  const event={source:e.id,ability:a.id,baseDamage:a.baseDamage,baseHeal:a.baseHeal??0,spiritScale:a.spiritScale??0,slow:a.slow,duration:a.duration,damageType:a.damageType,deploymentId:1,origin:{...e.position}};
  assert.ok(s.applyHeroEffect({...event,kind:'deployment-start',target:null}).ok);assert.ok(s.applyHeroEffect({...event,kind:'damage',target:troop.id}).ok);slow=a.slow;
  assert.ok(s.moveHero(e.id,p(1)).ok); // Remove the enemy from NPC combat range before measuring walking.
 }
 apply(speed(1,troop));before=troop.distanceMarched;ticks(1);near(troop.distanceMarched-before,.54*(1-slow));
 ticks(13);before=troop.distanceMarched;ticks(1);near(troop.distanceMarched-before,.4*(1-slow),'expired speed returns to the existing (possibly slowed) baseline');
}
console.log(`End Shift Host PASS: 8 native/40 raw controls, optional exact slot4 + retained 2-slot profiles, ${malformed.length} exact baseline rejection/retries, ${rejected} no-mutation protocol rejections; moving radius5/16-target budgets, .45 caster-only opening, .75 independent linger, 4s owner expiry, stale cleanup, source/target isolation, Fast Lane max aggregation, actual cloaked ally item API. CPU protocol only.`);
