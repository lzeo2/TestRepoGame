// Host protocol/API placement proof, not native .6s casting, scene/render or floor proof.
import assert from 'node:assert/strict';
import {createSystems} from '../systems.mjs';
import {laminateSlice} from './laminate-slice.mjs';
import {PERMANENT_RECORD as definition} from './permanent-record.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture(){const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:p()}),ally=s.addHero({id:'ally',team:'carbon',position:p(1)}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(2)}),kit=structuredClone(laminateSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:'permanentrecord',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:4,...extra});
 const start=(id=1)=>event('deployment-start',null,{deploymentId:id,origin:{...h.position}}),end=id=>event('deployment-end',null,{deploymentId:id}),ward=(index=0,target=ally,id=1)=>event('ward',target,{deploymentId:id,pulseIndex:index,origin:{...h.position},invulnerabilityDuration:.25});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});
 const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejected++;};
 const apply=e=>{const resources=()=>s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before=resources(),result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);assert.deepEqual(resources(),before);return result;};
 const ticks=n=>{for(let i=0;i<n;i++)assert.ok(s.step(.05).ok);};return{s,h,ally,enemy,kit,start,end,ward,event,state,reject,apply,ticks};}
for(const change of [e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.origin.x+=1,e=>e.origin.y=NaN,e=>e.origin=Object.assign(Object.create(null),e.origin),e=>e.target='ally',e=>e.duration=5,e=>e.radius=10,e=>e.invulnerabilityDuration=4,e=>e.wardMaxApplicationsPerTarget=5]){const f=fixture(),e=f.start();change(e);f.reject(e);f.apply(f.start());assert.equal(f.s.stats(f.h.id).invulnerable,false,'start never grants the 4s flat invulnerability');}
{
 const f=fixture(),{s,h,ally,enemy,reject,apply,start,ward,end}=f;reject(ward());apply(start());assert.equal(s.stats(h.id).invulnerable,false);reject({...ward(),kind:'buff',target:h.id});
 for(const extra of [{deploymentId:undefined},{deploymentId:0},{deploymentId:2},{pulseIndex:undefined},{pulseIndex:-1},{pulseIndex:4},{pulseIndex:.5},{pulseIndex:'0'},{pulseIndex:NaN},{pulseIndex:1},{origin:p(1)},{origin:p(0,1)},{origin:undefined},{origin:Object.assign(Object.create(null),p())},{target:enemy.id},{target:'missing'},{source:'missing'},{team:'ivory'},{invulnerabilityDuration:4},{invulnerabilityDuration:undefined},{duration:.25},{baseDamage:1},{baseHeal:1},{spiritScale:1},{slow:.1},{speedMultiplier:1.2},{damageType:'weapon'},{wardMaxApplicationsPerTarget:5}])reject({...ward(),...extra});
 const enemyHp=enemy.hp;assert.ok(s.damage(ally.id,10,enemy.id,{kind:'ability'}).ok);const hp=ally.hp;apply(ward());apply(ward(0,h));assert.equal(s.stats(ally.id).invulnerable,true);assert.equal(s.stats(enemy.id).invulnerable,false);assert.equal(s.damage(ally.id,10,enemy.id,{kind:'ability'}).reason,'invulnerable');reject(ward());
 f.ticks(5);assert.equal(s.stats(ally.id).invulnerable,false);assert.ok(s.damage(ally.id,10,enemy.id,{kind:'ability'}).ok);near(hp-ally.hp,9,'between-pulse damage is unchanged, NOT 25% reduction');assert.equal(enemy.hp,enemyHp);near(s.stats(ally.id).moveSpeed,8);
 assert.ok(s.moveHero(ally.id,p(10)).ok);f.ticks(15);reject(ward(1));assert.ok(s.moveHero(ally.id,p(9)).ok);apply(ward(1));reject(ward(1));assert.ok(s.moveHero(ally.id,p(20)).ok);assert.ok(s.moveHero(h.id,p(20)).ok);f.ticks(20);apply(ward(2));reject({...ward(2),origin:p()});f.ticks(20);apply(ward(3));reject(ward(3));apply(end(1));assert.equal(s.stats(ally.id).invulnerable,true,'matching end keeps accepted .25 shield');f.ticks(5);assert.equal(s.stats(ally.id).invulnerable,false);reject(ward(3));
}
// The only permitted phase bridge is one canonical .05 Host step, both early and late.
{
 const f=fixture();f.apply(f.start());f.ticks(18);f.reject(f.ward(1));f.ticks(1);f.apply(f.ward(1));f.ticks(2);f.apply(f.ward(1,f.h));f.ticks(1);const late=f.s.addHero({id:'late-friendly',team:'carbon',position:p(1)});f.reject(f.ward(1,late));f.reject(f.ward(0,f.h));f.ticks(17);f.apply(f.ward(2,late));
}
{
 const f=fixture();f.apply(f.start());Object.assign(f.kit.abilities.find(a=>a.id==='permanentrecord'),{duration:999,invulnerabilityDuration:999,radius:999,interval:.01,wardMaxApplicationsPerTarget:999});f.apply(f.ward());
 f.ticks(10);assert.ok(f.s.moveHero(f.ally.id,p(1)).ok);f.reject(f.ward(0));f.ticks(10);f.apply(f.ward(1));f.ticks(20);f.apply(f.ward(2));f.ticks(20);f.apply(f.ward(3));f.ticks(5);assert.equal(f.s.stats(f.ally.id).invulnerable,false);f.ticks(15);f.reject(f.ward(4));f.reject(f.ward(3));
}
{
 const f=fixture();f.apply(f.start());f.apply(f.ward());f.apply(f.start(2));assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});f.apply(f.ward(0,f.ally,2));f.reject(f.ward(0,f.ally,1));f.apply(f.end(2));f.reject(f.start(2));f.apply(f.start(3));
}
{
 const f=fixture(),{s,h,ally,enemy}=f;f.apply(f.start());f.apply(f.ward());assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);f.reject(f.ward());assert.deepEqual(s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.equal(s.stats(ally.id).invulnerable,true);f.ticks(5);assert.equal(s.stats(ally.id).invulnerable,false);
}
{
 const f=fixture(),objective=f.s.structures.find(x=>x.team==='carbon');assert.ok(f.s.moveHero(f.h.id,objective.position).ok);f.apply(f.start());f.reject(f.ward(0,objective));f.reject({...f.ward(),ability:'laminatedsprint',duration:4,speedMultiplier:1.4});
 const allyTrooper=f.s.troopers.find(x=>x.team==='carbon'&&x.alive);assert.ok(f.s.moveHero(f.h.id,allyTrooper.position).ok);f.apply(f.start(2));f.apply(f.ward(0,allyTrooper,2));
}
{
 const f=fixture();f.apply(f.start());f.apply(f.ward());f.s.phase='finished'; // Public inactive protocol fixture, not a status grant.
 f.reject(f.ward(1));f.reject(f.start(2));f.apply(f.end(1));assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.ticks(5);assert.equal(f.s.stats(f.ally.id).invulnerable,false);
}
// Actual NPC-source damage API: protected for .25, then full normal armored damage.
{
 const f=fixture(),{s,h,ally}=f,npc=s.troopers.find(x=>x.team==='ivory'&&x.alive);assert.ok(npc);assert.ok(s.moveHero(h.id,npc.position).ok);assert.ok(s.moveHero(ally.id,{x:npc.position.x+1,y:npc.position.y,z:npc.position.z}).ok);f.apply(f.start());f.apply(f.ward(0,h));f.apply(f.ward());assert.equal(s.damage(ally.id,12,npc.id).reason,'invulnerable');f.ticks(5);const hp=ally.hp;assert.ok(s.damage(ally.id,12,npc.id).ok);near(hp-ally.hp,10.8);
}
// Independent sources and instances own independent index sets/status expiry keys.
{
 const f=fixture(),{s,ally}=f,other=s.addHero({id:'other',team:'carbon',position:p()});assert.ok(s.configureHeroKit(other.id,laminateSlice,{partialSlice:true}).ok);f.apply(f.start());f.apply(f.ward());f.ticks(1);f.apply({...f.start(),source:other.id});f.apply({...f.ward(),source:other.id});f.apply(f.end(1));f.ticks(4);assert.equal(s.stats(ally.id).invulnerable,true);f.ticks(1);assert.equal(s.stats(ally.id).invulnerable,false);
}
console.log(`PASS Permanent Record Host: immutable moving radius9/4s receipt, four global indices with exact +/- .05 phase window and per-target/source/instance sets, no buff/start bypass, .25 real enemy/NPC protection then unchanged full damage, typed allies not objectives/enemies, current-feet movement/late-entry/expiry/tamper/death/stale cleanup/tails; ${rejected} transactional rejections and valid retries. CPU protocol only, not native .6 windup/art/geometry/cadence acceptance.`);
