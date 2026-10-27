// Actual supplied Odo model, Runtime, Host and controller in Game order. API placements
// and imported item currency are setup, not traversal/economy/native/art acceptance.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {odometerSlice} from './odometer-slice.mjs';
await loadCharacter('odometer');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture({cloak=false}={}) {
  const s=createSystems();s.step(30);
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),enemy=s.addHero({id:'enemy',team:'ivory',position:{x:0,y:0,z:10}});
  const ally=s.addHero({id:'ally',team:'carbon',position:cloak?s.bases.carbon:{x:1,y:0,z:8},souls:cloak?3200:0,earnedSouls:cloak?3200:0});
  // addHero requires earnedSouls >= souls; this import and derived level are NOT played progress.
  if(cloak){assert.ok(s.buyItem(ally.id,'shadow-cloak').ok);assert.ok(s.moveHero(ally.id,{x:1,y:0,z:8}).ok);assert.ok(s.activateItem(ally.id,'shadow-cloak').ok);assert.ok(ally.cloakUntil>s.time);}
  const kit=structuredClone(odometerSlice),admission=s.configureHeroKit(h.id,kit,{partialSlice:true});assert.ok(admission.ok,`rally Host dependency: ${admission.reason}`);
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),ac=new PlayerController({position:ally.position,boxes,floorHeight:()=>0}),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit,boxes,source:h.id,onEffect:e=>{events.push(e);const result=s.applyHeroEffect(e);results.push(result);return result;}});r.targets=[h,ally,enemy];
  let used={};
  const step=(moving=false)=>{assert.ok(s.step(.05).ok);used={};for(const [actor,controller] of [[h,c],[ally,ac]])if(actor.alive){controller.speedMultiplier=s.stats(actor.id).moveSpeed/8;used[actor.id]=controller.speedMultiplier;controller.update(.05,{forward:moving&&actor===h?1:0});assert.ok(s.moveHero(actor.id,controller.position).ok);}r.update(.05);return used;};
  const steps=n=>{for(let i=0;i<n;i++)step();},fields=()=>r.deployments.filter(d=>d.definition.id==='endshiftsprint');
  const speedEvents=target=>events.filter(e=>e.kind==='speed'&&(!target||e.target===target));
  const place=(actor,controller,position)=>{assert.ok(s.moveHero(actor.id,position).ok);controller.warp(actor.position);};
  const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,heroes:s.heroes,stats:s.heroes.map(x=>s.stats(x.id)),events,results,host:s.events,position:c.position,velocity:c.velocity,fields:fields().map(d=>({id:d.deploymentId,left:d.left,position:d.position,counts:[...d.speedCounts]})),handles:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const launch=()=>{assert.ok(r.cast(4),'rally Runtime admission');steps(10);assert.equal(r.pendingCast,null,'exact .5 windup at .05 steps');};
  const dispose=()=>{r.dispose();assert.equal(fields().length,0);assert.equal(scene.children.length,0);};
  return {s,h,enemy,ally,r,c,ac,boxes,events,results,step,steps,fields,speedEvents,place,state,launch,dispose};
}
{
  const f=fixture(),{s,h,ally,enemy,r}=f;assert.ok(s.damage(h.id,20,enemy.id,{kind:'ability'}).ok);assert.ok(s.damage(ally.id,20,enemy.id,{kind:'ability'}).ok);
  const hp=s.heroes.map(x=>x.hp),ammo=r.ammo,hostAmmo=h.ammo;assert.ok(r.cast(4));assert.equal(r.cooldowns[4],23);assert.equal(r.castCount.endshiftsprint,1);
  const before=f.state();assert.equal(r.cast(1),false);assert.equal(r.cast(3),false);assert.equal(r.cast(4),false);assert.equal(f.state(),before);
  f.steps(9);near(r.pendingCast.left,.05);assert.equal(f.fields().length,0);assert.equal(f.events.length,0);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  f.step();const field=f.fields()[0];assert.ok(field);near(field.left,4);assert.equal(f.speedEvents(h.id).length,1);assert.equal(f.speedEvents(ally.id).length,1);assert.equal(f.speedEvents(enemy.id).length,0);near(s.stats(h.id).moveSpeed,10.8);near(s.stats(ally.id).moveSpeed,10.8);assert.equal(s.stats(h.id).invulnerable,true);assert.equal(s.stats(ally.id).invulnerable,false);
  f.steps(4);assert.equal(f.speedEvents(h.id).length,1);f.step();assert.equal(f.speedEvents(h.id).length,2);f.steps(74);near(field.left,.05);assert.equal(f.fields().length,1);assert.equal(f.speedEvents(h.id).length,16);assert.equal(f.speedEvents(ally.id).length,16);assert.equal(field.speedCounts.get(h.id),16);assert.equal(field.zoneCounts.get(h.id),8);near(s.stats(h.id).moveSpeed,10.8);
  f.step();assert.equal(f.fields().length,0);assert.equal(f.events.filter(e=>e.kind==='deployment-end').length,1);near(s.stats(h.id).moveSpeed,10.8);f.steps(9);near(s.stats(h.id).moveSpeed,10.8);f.step();near(s.stats(h.id).moveSpeed,8);near(s.stats(ally.id).moveSpeed,8);assert.equal(f.speedEvents(h.id).length,16);
  assert.deepEqual(s.heroes.map(x=>x.hp),hp,'no HP heal or damage from rally');assert.equal(r.ammo,ammo);assert.equal(h.ammo,hostAmmo);for(const actor of s.heroes){assert.equal(actor.souls,0);assert.equal(actor.earnedSouls,0);}assert.ok(f.results.every(x=>x.ok));
  for(let i=0;i<400&&r.cooldowns[4]>0;i++)f.step();assert.ok(r.cast(4),'normal 23s cooldown expiry admits a new rally');f.dispose();
}
{
  const f=fixture(),{s,h,ally,enemy}=f;f.launch();
  assert.equal(s.damage(h.id,10,enemy.id,{kind:'ability'}).reason,'invulnerable');const allyHp=ally.hp;assert.ok(s.damage(ally.id,10,enemy.id,{kind:'ability'}).ok);near(allyHp-ally.hp,9);
  f.steps(8);assert.equal(s.stats(h.id).invulnerable,true);assert.equal(s.damage(h.id,10,enemy.id,{kind:'ability'}).ok,false);
  f.step();assert.equal(s.stats(h.id).invulnerable,false,'one .45 window, not refreshed at .25 pulse');const hp=h.hp;assert.ok(s.damage(h.id,10,enemy.id,{kind:'ability'}).ok);near(hp-h.hp,9);f.steps(5);assert.equal(s.stats(h.id).invulnerable,false);f.dispose();
}
{
  const f=fixture(),{s,h,ally,c,ac}=f;f.boxes.push({minX:.4,maxX:.6,minY:0,maxY:3,minZ:7,maxZ:9});f.launch();near(s.stats(ally.id).moveSpeed,10.8,'non-damaging rally does not invent LOS');
  f.place(ally,ac,{x:5.1,y:0,z:8});f.steps(15);near(s.stats(ally.id).moveSpeed,8,'last application expires outside radius');
  f.place(h,c,{x:20,y:0,z:8});f.place(ally,ac,{x:21,y:0,z:8});f.steps(5);near(s.stats(ally.id).moveSpeed,10.8);const latest=f.speedEvents(ally.id).at(-1);near(latest.origin.x,20);near(f.fields()[0].position.x,20);assert.ok(f.results.every(x=>x.ok));
  const used=f.step(true);near(used.source,1.35);near(used.ally,1.35);for(let i=0;i<6;i++)f.step(true);assert.ok(Math.hypot(c.velocity.x,c.velocity.z)>8,'actual controller movement uses Host speed before update');f.dispose();
}
{
  const f=fixture();f.launch();assert.ok(f.r.cast(1));f.steps(2);near(f.s.stats(f.h.id).moveSpeed,13.6);f.steps(20);near(f.s.stats(f.h.id).moveSpeed,13.6,'rally refresh cannot multiply or replace stronger Fast Lane');f.steps(20);near(f.s.stats(f.h.id).moveSpeed,10.8,'returns to valid 1.35 rally status');f.dispose();
}
{
  const f=fixture({cloak:true}),hp=f.ally.hp;f.launch();assert.ok(f.ally.cloakUntil>f.s.time);near(f.s.stats(f.ally.id).moveSpeed,10.8);assert.equal(f.s.stats(f.ally.id).invulnerable,false);assert.equal(f.ally.hp,hp);assert.equal(f.speedEvents(f.ally.id).length,1);f.dispose();
}
for(const phase of ['pending','live'])for(const mode of ['reset','death-caller-reset','dispose']) {
  const f=fixture();assert.ok(f.r.cast(4));f.steps(phase==='pending'?3:10);if(mode==='death-caller-reset'){f.steps(phase==='live'?9:0);assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);}
  if(mode==='dispose')f.r.dispose();else f.r.reset();assert.equal(f.fields().length,0);assert.equal(f.r.pendingCast,null);assert.equal(f.s.stats(f.h.id).invulnerable,false);
  if(phase==='live')near(f.s.stats(f.ally.id).moveSpeed,10.8,'accepted speed lingers after owner cleanup');
  if(mode==='dispose'){const before=f.state();assert.equal(f.r.cast(4),false);assert.equal(f.state(),before);}
  f.steps(16);near(f.s.stats(f.ally.id).moveSpeed,8);assert.equal(f.fields().length,0);assert.equal(f.r.pendingCast,null);f.dispose();
}
for(const trigger of ['deployment-start','speed'])for(const mode of ['reset','dispose']) {
  const f=fixture(),forward=f.r.onEffect;f.r.onEffect=e=>{const result=forward(e);if(e.kind===trigger)mode==='reset'?f.r.reset():f.r.dispose();return result;};f.launch();assert.equal(f.fields().length,0);assert.equal(f.s.stats(f.h.id).invulnerable,false);assert.equal(f.events.filter(e=>e.kind==='deployment-end').length,1);
  assert.equal(f.speedEvents().length,trigger==='speed'?1:0,'continuous pulse stops remaining targets after callback cancellation');if(trigger==='speed'){const first=f.speedEvents()[0].target;near(f.s.stats(first).moveSpeed,10.8,'first accepted target remains committed after reset');for(const actor of [f.h,f.ally])if(actor.id!==first)near(f.s.stats(actor.id).moveSpeed,8,'later pulse targets were cancelled');}f.steps(16);near(f.s.stats(f.h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture();assert.ok(f.r.cast(4));assert.ok(f.r.fire(),'primary remains independent of rally windup');assert.ok(f.r.melee(),'Mileage Tap remains independent of rally windup');assert.equal(f.r.ammo,19);assert.equal(f.r.pendingCast.definition.id,'endshiftsprint');f.dispose();
}
{
  const f=fixture(),forward=f.r.onEffect;let rejectedTarget;
  f.r.onEffect=e=>{if(e.kind==='speed'&&!rejectedTarget){rejectedTarget=e.target;const result=f.s.applyHeroEffect({...e,origin:{...e.origin,x:e.origin.x+1}});assert.equal(result.ok,false);return result;}return forward(e);};
  f.launch();assert.ok(rejectedTarget);assert.equal(f.fields()[0].speedCounts.get(rejectedTarget)??0,0,'real Host NACK rolls back only captured local reservation');near(f.s.stats(rejectedTarget).moveSpeed,8);f.steps(5);assert.equal(f.fields()[0].speedCounts.get(rejectedTarget),1);near(f.s.stats(rejectedTarget).moveSpeed,10.8);f.dispose();
}
for(const ack of ['NACK','lost-ACK']) {
  const f=fixture(),forward=f.r.onEffect;f.r.onEffect=e=>{if(e.kind==='deployment-start'&&ack==='NACK'){const result=f.s.applyHeroEffect({...e,origin:{...e.origin,x:e.origin.x+1}});assert.equal(result.ok,false);return result;}const result=forward(e);return e.kind==='deployment-start'&&ack==='lost-ACK'?undefined:result;};f.launch();assert.equal(f.fields().length,0);assert.equal(f.speedEvents().length,0);assert.equal(f.s.stats(f.h.id).invulnerable,false);near(f.s.stats(f.h.id).moveSpeed,8);f.dispose();
}
console.log('PASS Odo End of Shift Sprint: complete raw profile; actual model/Host/Runtime/controllers in Game order; .5 windup/23CD, following radius5 field for4s, 16 speed/8 zone ticks, .75 last-application linger, no HP/ammo grants, .45 caster-only opening tested by real enemy attacks, movement/exit/reentry/stronger Fast Lane/cloaked ally, lifecycle/closed/reentrant and real NACK/lost-ACK cleanup. CPU only, no native/art/full-kit claim.');
