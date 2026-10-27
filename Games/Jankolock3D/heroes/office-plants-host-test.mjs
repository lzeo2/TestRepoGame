// Real Host receipts, movement and damage. No native/floor/LOS/network cadence or art acceptance claim.
import assert from 'node:assert/strict';
import {createSystems} from '../systems.mjs';
import {officePlantsSlice} from './office-plants-slice.mjs';
import {WINDOW_PATCH,PATIENT_GROWTH} from './office-plants.mjs';
import {laminateSlice} from './laminate-slice.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture(patient=false){const s=createSystems();s.step(30);const h=s.addHero({id:'fern',team:'carbon',position:p()}),ally=s.addHero({id:'ally',team:'carbon',position:p(7)}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(7)}),kit=structuredClone(officePlantsSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);const d=patient?PATIENT_GROWTH:WINDOW_PATCH;
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:d.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:d.duration,damageType:'none',...extra}),start=(id=1,origin=p(7))=>event('deployment-start',null,{deploymentId:id,origin}),end=id=>event('deployment-end',null,{deploymentId:id}),receipt=(index=0,target=ally,id=1,origin=p(7))=>event(patient?'ward':'speed',target,{deploymentId:id,origin,...(patient?{pulseIndex:index,invulnerabilityDuration:.35}:{applicationIndex:index,speedMultiplier:1.2,speedDuration:.75})});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,orbs:s.orbs,events:s.events,stats:s.heroes.map(x=>s.stats(x.id)),panels:s.wallPanels()});const reject=e=>{const before=state(),result=s.applyHeroEffect(e);assert.equal(result.ok,false,JSON.stringify(e));assert.deepEqual(state(),before);rejected++;};const apply=e=>{const resources=()=>s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before=resources(),result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);assert.deepEqual(resources(),before);return result;},ticks=n=>{for(let i=0;i<n;i++)s.step(.05);};return{s,h,ally,enemy,kit,d,event,start,end,receipt,state,reject,apply,ticks};}
for(const patient of [false,true]){
 for(const change of [e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.deploymentId=Infinity,e=>e.target='ally',e=>e.team='ivory',e=>e.origin=undefined,e=>e.origin=p(patient?7.000001:10.000001),e=>e.origin.y=NaN,e=>e.origin=Object.assign(Object.create(null),p(7)),e=>e.duration=10,e=>e.radius=99,e=>e.fieldCount=2,e=>e.followsCaster=true,e=>e.baseHeal=1,e=>e.baseDamage=1,e=>e.invulnerabilityDuration=2.25,e=>e.speedDuration=3,e=>e.wardMaxApplicationsPerTarget=12,e=>e.zoneMaxTicksPerTarget=99,e=>e.axis='x']){const f=fixture(patient),e=f.start();change(e);f.reject(e);f.apply(f.start());near(f.s.stats(f.ally.id).moveSpeed,8);assert.equal(f.s.stats(f.ally.id).invulnerable,false);}
 // Coordinate getters read once, prototypes checked before coordinate access, payload mutation cannot move anchor.
 {
  const f=fixture(patient);let reads=0;const sent=f.start(1,{get x(){reads++;return reads===1?7:999;},y:0,z:0});f.apply(sent);assert.equal(reads,1);sent.origin=p(999);Object.assign(f.kit.abilities.find(a=>a.id===f.d.id),{duration:999,radius:999,interval:999,speedDuration:999,invulnerabilityDuration:999});f.apply(f.receipt());let evilReads=0;const origin=Object.create({get x(){evilReads++;return 7;}});f.reject({...f.receipt(),origin});assert.equal(evilReads,0);
 }
 {
  const f=fixture(patient);let reads=0;const e=f.start();Object.defineProperty(e,'origin',{enumerable:true,get(){reads++;return reads===1?p(7):p(999);}});f.apply(e);assert.equal(reads,1);f.apply(f.receipt());
 }
 for(const extra of [{deploymentId:0},{deploymentId:2},{target:'missing'},{target:'enemy'},{source:'missing'},{team:'ivory'},{origin:undefined},{origin:p(6)},{origin:p(7,0,.000001)},{baseHeal:1},{baseDamage:1},{spiritScale:1},{slow:.1},{duration:99},{radius:99},{damageType:'weapon'},{headshot:true},{maxApplicationsPerTarget:2},{speedMultiplier:2},{invulnerable:!patient},{invulnerabilityDuration:1},{speedDuration:1},{pulseIndex:1,applicationIndex:1},...(patient?[{pulseIndex:undefined},{pulseIndex:-1},{pulseIndex:2},{pulseIndex:.5},{pulseIndex:1},{applicationIndex:0},{speedDuration:.75}]:[{applicationIndex:undefined},{applicationIndex:-1},{applicationIndex:12},{applicationIndex:.5},{applicationIndex:1},{pulseIndex:0},{invulnerabilityDuration:.35}])]){const f=fixture(patient);f.apply(f.start());f.reject({...f.receipt(),...extra});f.apply(f.receipt());}
 for(const kind of ['buff','status','damage','heal','reveal',patient?'speed':'ward','burst-start']){const f=fixture(patient);f.apply(f.start());f.reject({...f.receipt(),kind});f.apply(f.receipt());}
 {
  const f=fixture(patient);f.reject(f.receipt());f.apply(f.start());f.reject(f.receipt(0,f.h));assert.ok(f.s.moveHero(f.h.id,p(7)).ok);f.apply(f.receipt(0,f.h));f.reject(f.receipt(0,f.h));assert.ok(f.s.moveHero(f.h.id,p(100)).ok);f.apply(f.receipt());f.reject(f.receipt());
 }
 {
  const f=fixture(patient);f.apply(f.start());assert.ok(f.s.moveHero(f.ally.id,p(7+f.d.radius+.000001)).ok);f.reject(f.receipt());assert.ok(f.s.moveHero(f.ally.id,p(7+f.d.radius)).ok);f.apply(f.receipt());
 }
 // Phase +/- one host step only, no late-entry bonus or future/endpoint pulse.
 {
  const f=fixture(patient);f.apply(f.start());f.ticks(1);f.apply(f.receipt());const late=f.s.addHero({id:'late',team:'carbon',position:p(7)});f.ticks(1);f.reject(f.receipt(0,late));f.reject(f.receipt(1,late));f.ticks(patient?37:2);f.apply(f.receipt(1,late));
 }
 {
  const f=fixture(patient);f.apply(f.start());f.apply(f.receipt());f.apply(f.start(2));assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});f.reject(f.receipt(0,f.ally,1));f.apply(f.receipt(0,f.ally,2));f.apply(f.end(2));f.reject(f.receipt(0,f.ally,2));assert.equal(f.s.stats(f.ally.id).invulnerable,patient);near(f.s.stats(f.ally.id).moveSpeed,patient?8:9.6);f.ticks(patient?7:15);assert.equal(f.s.stats(f.ally.id).invulnerable,false);near(f.s.stats(f.ally.id).moveSpeed,8);f.reject(f.start(2));f.apply(f.start(3));
 }
 {
  const f=fixture(patient);f.apply(f.start());f.apply(f.receipt());assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);f.reject(f.receipt());assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.equal(f.s.stats(f.ally.id).invulnerable,patient);near(f.s.stats(f.ally.id).moveSpeed,patient?8:9.6);f.ticks(patient?7:15);assert.equal(f.s.stats(f.ally.id).invulnerable,false);near(f.s.stats(f.ally.id).moveSpeed,8);
 }
 {
  const f=fixture(patient),structure=f.s.structures.find(x=>x.team==='carbon');assert.ok(f.s.moveHero(f.h.id,structure.position).ok);const origin={...structure.position};f.apply(f.start(1,origin));f.reject(f.receipt(0,structure,1,origin));
 }
}
// Every literal Window index, no zero-damage-zone extra speed clock; accepted last tail reaches 3.5.
{
 const f=fixture();f.apply(f.start());assert.ok(f.s.moveHero(f.h.id,p(100)).ok);for(let i=0;i<12;i++){if(i)f.ticks(5);f.apply(f.receipt(i));f.reject(f.receipt(i));near(f.s.stats(f.ally.id).moveSpeed,9.6);assert.equal(f.s.stats(f.ally.id).invulnerable,false);}f.ticks(5);f.reject(f.receipt(12));f.reject(f.receipt(11));near(f.s.time,33);near(f.s.stats(f.ally.id).moveSpeed,9.6);f.ticks(9);near(f.s.stats(f.ally.id).moveSpeed,9.6);f.ticks(1);near(f.s.time,33.5);near(f.s.stats(f.ally.id).moveSpeed,8);
}
// Patient only two short shields, with ordinary full damage throughout the gap and after 2.35.
for(const birth of [30,30.7,31.7,32.7]){
 const f=fixture(true);f.s.step(birth-30);assert.ok(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).ok);f.apply(f.start());f.apply(f.receipt());assert.equal(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).reason,'invulnerable');f.ticks(6);assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.ticks(1);assert.equal(f.s.stats(f.ally.id).invulnerable,false);let hp=f.ally.hp;assert.ok(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).ok);near(hp-f.ally.hp,9);near(f.s.stats(f.ally.id).moveSpeed,8);f.ticks(13);f.reject(f.receipt(1));hp=f.ally.hp;assert.ok(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).ok);near(hp-f.ally.hp,9);f.ticks(20);f.apply(f.receipt(1));f.reject(f.receipt(1));assert.equal(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).reason,'invulnerable');f.ticks(5);f.reject(f.receipt(2));f.reject(f.receipt(1));assert.equal(f.s.stats(f.ally.id).invulnerable,true,'last accepted shield outlasts owner2.25');f.ticks(1);assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.ticks(1);assert.equal(f.s.stats(f.ally.id).invulnerable,false,'exact2.35 expiry');hp=f.ally.hp;assert.ok(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).ok);near(hp-f.ally.hp,9);
}
// Two independent known roles and independent sources never multiply speed or remove accepted tails.
{
 const f=fixture(),g=fixture(true);f.apply(f.start());f.apply(f.receipt());const start={...g.start(),source:f.h.id},receipt={...g.receipt(),source:f.h.id,target:f.ally.id};f.apply({...start,deploymentId:2});f.apply({...receipt,deploymentId:2});near(f.s.stats(f.ally.id).moveSpeed,9.6);assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.apply(f.end(1));f.apply({...g.end(2),source:f.h.id});assert.equal(f.s.stats(f.ally.id).invulnerable,true);near(f.s.stats(f.ally.id).moveSpeed,9.6);
 const other=f.s.addHero({id:'other-fern',team:'carbon',position:p()});assert.ok(f.s.configureHeroKit(other.id,officePlantsSlice,{partialSlice:true}).ok);f.apply({...f.start(),source:other.id});f.apply({...f.receipt(),source:other.id});near(f.s.stats(f.ally.id).moveSpeed,9.6);
}
// Actual public NPC movement consumer and actual NPC damage source, no private positive grants.
{
 const f=fixture(),t=f.s.troopers.find(x=>x.alive&&x.team==='carbon');let before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);assert.ok(f.s.moveHero(f.h.id,t.position).ok);const origin={...t.position};f.apply(f.start(1,origin));f.apply(f.receipt(0,t,1,origin));assert.ok(f.s.moveHero(f.h.id,p()).ok);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.48);f.ticks(14);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);
}
{
 const f=fixture(true),npc=f.s.troopers.find(x=>x.alive&&x.team==='ivory');assert.ok(f.s.moveHero(f.h.id,npc.position).ok);assert.ok(f.s.moveHero(f.ally.id,{...npc.position,x:npc.position.x+1}).ok);const origin={...npc.position};f.apply(f.start(1,origin));f.apply(f.receipt(0,f.ally,1,origin));assert.equal(f.s.damage(f.ally.id,12,npc.id).reason,'invulnerable');f.ticks(7);const hp=f.ally.hp;assert.ok(f.s.damage(f.ally.id,12,npc.id).ok);near(hp-f.ally.hp,10.8);
}
{
 const f=fixture(true),t=f.s.troopers.find(x=>x.alive&&x.team==='carbon');assert.ok(f.s.moveHero(f.h.id,t.position).ok);assert.ok(f.s.moveHero(f.enemy.id,{...t.position,x:t.position.x+1}).ok);const origin={...t.position};f.apply(f.start(1,origin));f.apply(f.receipt(0,t,1,origin));assert.equal(f.s.damage(t.id,12,f.enemy.id,{kind:'ability'}).reason,'invulnerable');f.ticks(7);const hp=t.hp;assert.ok(f.s.damage(t.id,12,f.enemy.id,{kind:'ability'}).ok);near(hp-t.hp,12);
}
for(const patient of [false,true]){const f=fixture(patient);f.apply(f.start());assert.ok(f.s.damage(f.ally.id,1e6,f.enemy.id,{kind:'ability'}).killed);f.reject(f.receipt());const live=f.s.addHero({id:'live-retry',team:'carbon',position:p(7)});f.apply(f.receipt(0,live));}
// Actual panels cannot receive either effect, even inside the fixed field.
for(const patient of [false,true]){const f=fixture(patient);for(const h of [f.ally,f.enemy])assert.ok(f.s.moveHero(h.id,p(20)).ok);const owner=f.s.addHero({id:'lam-owner',team:'carbon',position:p(14)});assert.ok(f.s.configureHeroKit(owner.id,laminateSlice,{partialSlice:true}).ok);assert.ok(f.s.applyHeroEffect({kind:'deployment-start',source:owner.id,target:null,ability:'sheenwall',baseDamage:12,baseHeal:0,spiritScale:0,slow:0,duration:4,damageType:'weapon',deploymentId:1,origin:p(7),axis:'z'}).ok);const panel=f.s.wallPanels()[0];f.apply(f.start());f.reject(f.receipt(0,panel));assert.equal(panel.hp,650);}
console.log(`PASS Fern Host: immutable copied fixed anchors/known roles/current source instance/typed friendly hero+troop/self only inside/range10 or7; Window12 indexed .25 speeds and independent3.5 tail; Patient two global .35 wards with exact .35/2.35 full-damage expiry at four births; stale/end/death/source100m/duplicates/phase +/- .05/caps/role guards and ${rejected} transactional rejections+valid retries; real NPC .4->.48->.4 and full damage between shields, no HP/ammo/cloak/heal/buff bypass. CPU receipts only.`);
