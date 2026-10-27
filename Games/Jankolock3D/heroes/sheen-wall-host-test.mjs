// Host receipt/arena AABB proof, not native casting, full trajectory/LOS/floor or art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {laminateSlice} from './laminate-slice.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {odometerSlice} from './odometer-slice.mjs';
import {sheenWallBounds,SHEEN_WALL} from './sheen-wall.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture(){const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:p()}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(0,0,-12)}),other=s.addHero({id:'other',team:'ivory',position:p(2,0,-10)}),kit=structuredClone(laminateSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:'sheenwall',baseDamage:12,baseHeal:0,spiritScale:0,slow:0,damageType:'weapon',duration:4,...extra}),wall=(id=1,origin=p(0,0,-5),axis='z')=>event('deployment-start',null,{deploymentId:id,origin,axis}),end=id=>event('deployment-end',null,{deploymentId:id}),burst=(id=1)=>event('burst-start',null,{burstId:id,origin:p(0,1)}),burstEnd=id=>event('burst-end',null,{burstId:id}),impact=(index=0,target=enemy,id=1,origin={...target.position,y:1})=>event('damage',target,{burstId:id,projectileIndex:index,origin});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id)),panels:s.wallPanels()});const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejected++;};const apply=e=>{const result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);return result;};return{s,h,enemy,other,kit,event,wall,end,burst,burstEnd,impact,state,reject,apply};}
for(const axis of ['x','z']){
 const f=fixture();let reads=0;const origin={get x(){reads++;return reads===1?0:999;},y:0,z:-5};f.apply(f.wall(1,origin,axis));assert.equal(reads,1);const [panel]=f.s.wallPanels();assert.equal(f.s.wallPanels().length,1);assert.deepEqual(panel.bounds,sheenWallBounds(p(0,0,-5),axis));assert.equal(panel.hp,650);assert.equal(panel.maxHp,650);assert.equal(panel.color,'#3f7f6f');assert.equal(panel.abilityKey,'sheenwall');assert.equal(Object.isFrozen(panel),true);assert.equal(Object.isFrozen(panel.bounds),true);assert.throws(()=>{panel.color='#ffffff';},TypeError);assert.throws(()=>{panel.hp=999;},TypeError);Object.assign(f.kit.abilities.find(a=>a.id==='sheenwall'),{health:999,duration:999,width:999});f.s.step(3.95);assert.equal(panel.alive,true);f.s.step(.05);assert.equal(panel.alive,false);assert.equal(f.s.wallPanels().length,0);
}
for(const change of [e=>e.origin=p(0,0,-8.000001),e=>e.origin=p(),e=>e.origin=undefined,e=>e.origin=Object.assign(Object.create(null),p(0,0,-5)),e=>e.axis='diagonal',e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.target='enemy',e=>e.health=280,e=>e.count=2,e=>e.width=5,e=>e.height=2.6,e=>e.duration=14/30,e=>e.range=14,e=>e.projectileCount=4,e=>e.color='#ffffff',e=>e.bounds=[],e=>e.reflect=true]){const f=fixture(),e=f.wall();change(e);f.reject(e);f.apply(f.wall());}
{
 const f=fixture();f.apply(f.wall());const old=f.s.wallPanels()[0];f.reject(f.wall(2,p()));assert.equal(old.alive,true);f.apply(f.wall(2,p(6,0,-3)));assert.equal(old.alive,false);const fresh=f.s.wallPanels()[0];assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.equal(fresh.alive,true);f.apply(f.end(2));assert.equal(fresh.alive,false);f.reject(f.wall(2));f.apply(f.wall(3));
}
for(const change of [e=>e.burstId=0,e=>e.burstId=1.5,e=>e.target='enemy',e=>e.origin=p(2),e=>e.origin=undefined,e=>e.origin=Object.assign(Object.create(null),p(0,1)),e=>e.duration=14/30,e=>e.baseDamage=18,e=>e.projectileRange=25,e=>e.projectileDuration=.625,e=>e.maxHitsPerTarget=2,e=>e.projectileCount=4,e=>e.damageReceived=100,e=>e.reflect=true]){const f=fixture(),e=f.burst();change(e);f.reject(e);f.apply(f.burst());assert.equal(f.s.wallPanels().length,0);}
{
 const f=fixture();f.reject(f.impact());f.apply(f.burst());const hp=f.enemy.hp;f.reject({...f.impact(),duration:14/30});f.reject({...f.impact(),baseDamage:18});f.reject({...f.impact(),projectileIndex:3});f.reject({...f.impact(),origin:p(0,3,-12)});f.reject({...f.impact(),incomingDamage:100});f.reject({...f.impact(),ability:'flyingdigits',duration:.625,baseDamage:18});f.apply(f.impact());near(hp-f.enemy.hp,10.8);f.reject(f.impact(1));const otherHp=f.other.hp;f.apply(f.impact(1,f.other));near(otherHp-f.other.hp,10.8);const third=f.s.addHero({id:'third',team:'ivory',position:p(-2,0,-10)}),thirdHp=third.hp;f.apply(f.impact(2,third));near(thirdHp-third.hp,10.8);f.reject(f.impact(3,third));f.reject({...f.burstEnd(1),ability:'flyingdigits',duration:.625,baseDamage:18});f.apply(f.burstEnd(1));f.reject(f.impact());f.reject(f.burst(1));f.apply(f.burst(2));
}
{
 const f=fixture();f.apply(f.burst());assert.ok(f.s.moveHero(f.enemy.id,p(0,0,-14.000001)).ok);f.reject(f.impact());assert.ok(f.s.moveHero(f.enemy.id,p(0,0,-14)).ok);f.apply(f.impact());assert.ok(f.s.moveHero(f.other.id,p(0,0,-12)).ok);f.s.step(.5);f.apply(f.impact(1,f.other));f.s.step(.05);const third=f.s.addHero({id:'expired-victim',team:'ivory',position:p(0,0,-10)});f.reject(f.impact(2,third));
}
// Wall lifecycle and flight lifecycle are independent, including owner-component cleanup.
{
 const f=fixture();f.apply(f.wall(1,p(6,0,-3)));f.apply(f.burst());f.apply(f.burstEnd(1));assert.equal(f.s.wallPanels().length,1);f.apply(f.burst(2));f.apply(f.end(1));assert.equal(f.s.wallPanels().length,0);f.apply(f.impact(0,f.enemy,2));f.apply(f.wall(2,p(6,0,-3)));f.s.step(.55);f.reject(f.impact(1,f.other,2));assert.equal(f.s.wallPanels().length,1,'4s wall survives flight TTL');f.s.step(3.45);assert.equal(f.s.wallPanels().length,0);
}
{
 const f=fixture();f.apply(f.wall(1,p(6,0,-3)));f.apply(f.burst());const panel=f.s.wallPanels()[0],resources=f.s.heroes.map(h=>[h.hp,h.souls,h.earnedSouls]);assert.ok(f.s.damage(panel.id,1000,f.enemy.id,{kind:'ability'}).killed);assert.deepEqual(f.s.heroes.map(h=>[h.hp,h.souls,h.earnedSouls]),resources);assert.equal(f.s.orbs.length,0);f.apply(f.impact());
}
// A friendly own wall never takes HP from the outgoing ability; the Host budget is unspent.
{
 const f=fixture();f.apply(f.wall());f.apply(f.burst());const panel=f.s.wallPanels()[0];f.reject(f.impact(0,panel,1,p(0,1,-4.85)));assert.equal(panel.hp,650);f.apply(f.end(1));f.apply(f.impact());
}
// Actual enemy panel AABB, not a hero cube; per-target cap remains one.
{
 const f=fixture(),owner=f.s.addHero({id:'enemy-wall-owner',team:'ivory',position:p(0,0,-10)});assert.ok(f.s.configureHeroKit(owner.id,whitespaceSlice,{partialSlice:true}).ok);assert.ok(f.s.moveHero(f.enemy.id,p(0,0,-16)).ok);assert.ok(f.s.moveHero(f.other.id,p(10,0,-10)).ok);assert.ok(f.s.applyHeroEffect({kind:'deployment-start',source:owner.id,target:null,ability:'keepclear',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:4,deploymentId:1,origin:p(0,0,-10),axis:'x'}).ok);const panel=f.s.wallPanels().find(p=>p.position.z>-10);f.apply(f.burst());f.apply(f.impact(0,panel,1,{x:2.4,y:1,z:panel.position.z}));assert.equal(panel.hp,268);f.reject(f.impact(1,panel,1,{x:2.4,y:1,z:panel.position.z}));
}
{
 const f=fixture();f.apply(f.wall(1,p(6,0,-3)));f.apply(f.burst());assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);assert.equal(f.s.wallPanels().length,0);f.reject(f.impact());assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.deepEqual(f.s.applyHeroEffect(f.burstEnd(1)),{ok:true,ended:false});
}
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];await loadCharacter(native.id);
{
 const f=fixture();assert.ok(f.s.configureHeroKit(f.enemy.id,native).ok);const scene=new THREE.Scene(),controller=new PlayerController({position:f.enemy.position,boxes:[]}),r=new HeroRuntime({scene,controller,kit:native,source:f.enemy.id,team:'ivory',onEffect:e=>f.s.applyHeroEffect(e)});assert.ok(r.cast(4));f.apply(f.burst());f.reject(f.impact());r.reset();f.apply(f.impact());r.dispose();assert.equal(scene.children.length,0);
}
// Original Flying Digits stays four projectiles / two hits / 25m / .625+.05 receipt TTL.
{
 const s=createSystems();s.step(30);const h=s.addHero({id:'odo',team:'carbon',position:p()}),enemy=s.addHero({id:'victim',team:'ivory',position:p(0,0,-24)});assert.ok(s.configureHeroKit(h.id,odometerSlice,{partialSlice:true}).ok);const base={source:h.id,ability:'flyingdigits',baseDamage:18,baseHeal:0,spiritScale:0,slow:0,duration:.625,damageType:'weapon'};assert.ok(s.applyHeroEffect({...base,kind:'burst-start',target:null,burstId:1,origin:p(0,1)}).ok);const hp=enemy.hp;assert.ok(s.applyHeroEffect({...base,kind:'damage',target:enemy.id,burstId:1,projectileIndex:0,origin:p(0,1,-24)}).ok);assert.ok(s.applyHeroEffect({...base,kind:'damage',target:enemy.id,burstId:1,projectileIndex:3,origin:p(0,1,-24)}).ok);near(hp-enemy.hp,32.4);assert.equal(s.applyHeroEffect({...base,kind:'damage',target:enemy.id,burstId:1,projectileIndex:2,origin:p(0,1,-24)}).ok,false);const other=s.addHero({id:'odo-late-victim',team:'ivory',position:p(0,0,-24)});s.step(.65);assert.ok(s.applyHeroEffect({...base,kind:'damage',target:other.id,burstId:1,projectileIndex:1,origin:p(0,1,-24)}).ok);s.step(.05);assert.equal(s.applyHeroEffect({...base,kind:'damage',target:other.id,burstId:1,projectileIndex:2,origin:p(0,1,-24)}).ok,false);
}
console.log(`PASS Sheen Wall Host: one frozen-color 650HP 7x3x.3 panel/4s, placement geometry/range/occupancy/source sequence and independent 3-shot12-damage burst/14m/14/30+.05 TTL/max1 target; immutable role/ability/index/cap/payload/copy/expiry/cleanup controls, enemy/own panels, real Overtime rejection+retry, original Flying4/25/.625/max2 control; ${rejected} transactional rejections. CPU receipts/AABB only, no full trajectory/LoS/native/art/reflection claim.`);
