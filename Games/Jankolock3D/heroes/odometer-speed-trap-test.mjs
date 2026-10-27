// CPU integration only. Actual Odo models, Host, controllers, camera/covered ground helper
// and actual Game.targets adapter. API placements are not native traversal/mesh/floor proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {odometerSlice} from './odometer-slice.mjs';
const nativeKit=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes.find(h=>h.id==='stampead');
await Promise.all([loadCharacter('odometer'),loadCharacter(nativeKit.id)]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),game=readFileSync(new URL('../game.mjs',import.meta.url),'utf8');
const targetSource=game.slice(game.indexOf('const targets=()=>'),game.indexOf('function effect(event)'));
function fixture({cloak=false,overtime=false}={}) {
  const s=createSystems();s.step(30);assert.equal(typeof s.isRevealedTo,'function','Speed Trap Host dependency');
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),enemy=s.addHero({id:'enemy',team:'ivory',position:cloak?s.bases.ivory:{x:100,y:0,z:100},souls:cloak?3200:0,earnedSouls:cloak?3200:0}),ally=s.addHero({id:'ally',team:'carbon',position:{x:2,y:0,z:8}});
  // Public imported item currency/derived level are setup, not played economy progress.
  if(cloak)assert.ok(s.buyItem(enemy.id,'shadow-cloak').ok);
  const kit=structuredClone(odometerSlice);for(const actor of [h,enemy]){const selected=actor===enemy&&overtime?nativeKit:kit,result=s.configureHeroKit(actor.id,selected,selected===nativeKit?undefined:{partialSlice:true});assert.ok(result.ok,`Trap profile Host dependency: ${result.reason}`);}
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0}),camera=new THREE.PerspectiveCamera(70,1,.1,1000),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit,boxes,source:h.id,onEffect:e=>{events.push(e);const result=s.applyHeroEffect(e);results.push(result);return result;}});
  const enemyRuntime=new HeroRuntime({scene,controller:ec,kit:structuredClone(overtime?nativeKit:kit),boxes,source:enemy.id,team:'ivory',onEffect:e=>s.applyHeroEffect(e)});
  const targets=vm.runInNewContext(`${targetSource}\ntargets`,{sim:s,hero:h});
  const refresh=()=>{c.updateCamera(camera,0);r.aim(camera);r.targets=targets();};
  const place=(actor,controller,position)=>{assert.ok(s.moveHero(actor.id,position).ok);controller.warp(actor.position);refresh();};
  refresh();const point=r.groundPoint(16);place(enemy,ec,point);
  if(cloak){assert.ok(s.activateItem(enemy.id,'shadow-cloak').ok);refresh();}
  const step=(enemyMove=false)=>{assert.ok(s.step(.05).ok);let enemyMultiplier;for(const [actor,controller] of [[h,c],[enemy,ec]])if(actor.alive){controller.speedMultiplier=s.stats(actor.id).moveSpeed/8;if(actor===enemy)enemyMultiplier=controller.speedMultiplier;controller.update(.05,{forward:enemyMove&&actor===enemy?1:0});assert.ok(s.moveHero(actor.id,controller.position).ok);}refresh();enemyRuntime.update(.05);r.update(.05);return enemyMultiplier;};
  const steps=n=>{for(let i=0;i<n;i++)step();},fields=()=>r.deployments.filter(d=>d.definition.id==='speedtrap'),effects=kind=>events.filter(e=>e.kind===kind&&e.ability==='speedtrap');
  const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,heroes:s.heroes,stats:s.heroes.map(x=>s.stats(x.id)),host:s.events,events,results,revealed:s.heroes.map(x=>s.isRevealedTo(x.id,'carbon')),fields:fields().map(d=>({id:d.deploymentId,left:d.left,p:d.position,slow:[...d.slowCounts],reveal:[...d.revealCounts]})),handles:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const launch=()=>{assert.ok(r.cast(2),'Speed Trap Runtime admission');steps(5);assert.equal(r.pendingCast,null,'exact .25 windup');};
  const dispose=()=>{r.dispose();enemyRuntime.dispose();assert.equal(fields().length,0);assert.equal(scene.children.length,0);};
  return {s,h,enemy,ally,r,enemyRuntime,c,ec,camera,boxes,events,results,targets,refresh,place,step,steps,fields,effects,state,launch,dispose};
}
{
  const f=fixture(),{s,h,enemy,r}=f;assert.ok(s.damage(enemy.id,20,h.id,{kind:'ability'}).ok);const hp=s.heroes.map(x=>x.hp),ammo=r.ammo,hostAmmo=h.ammo;
  assert.ok(r.cast(2));assert.equal(r.cooldowns[2],11);assert.equal(r.castCount.speedtrap,1);const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);
  f.steps(4);near(r.pendingCast.left,.05);assert.equal(f.events.length,0);near(s.stats(enemy.id).moveSpeed,8);const expected=r.groundPoint(16);f.step();
  const field=f.fields()[0],origin=field.position.clone();near(origin.distanceTo(expected),0);near(field.left,4);assert.ok(Math.hypot(origin.x-h.position.x,origin.z-h.position.z)<=16+1e-9);near(s.stats(enemy.id).moveSpeed,4.8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),true);assert.equal(s.isRevealedTo(enemy.id,'ivory'),false);
  f.steps(4);assert.equal(f.effects('status').length,1);f.step();assert.equal(f.effects('status').length,2);f.steps(74);near(field.left,.05);assert.equal(f.effects('status').length,16);assert.equal(f.effects('reveal').length,16);assert.equal(field.zoneCounts.get(enemy.id),8);assert.equal(field.slowCounts.get(enemy.id),16);assert.equal(field.revealCounts.get(enemy.id),16);
  f.step();assert.equal(f.fields().length,0);f.steps(4);near(s.stats(enemy.id).moveSpeed,4.8);f.step();near(s.stats(enemy.id).moveSpeed,8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),true);f.steps(19);assert.equal(s.isRevealedTo(enemy.id,'carbon'),true);f.step();assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);
  assert.deepEqual(s.heroes.map(x=>x.hp),hp);assert.equal(r.ammo,ammo);assert.equal(h.ammo,hostAmmo);assert.ok(f.results.every(x=>x.ok));for(let i=0;i<250&&r.cooldowns[2]>0;i++)f.step();assert.ok(r.cast(2),'normal 11s cooldown expiry');f.dispose();
}
{
  const f=fixture();const old=f.r.groundPoint(16);assert.ok(f.r.cast(2));f.steps(4);f.c.yaw=Math.PI/2;f.place(f.h,f.c,{x:1,y:0,z:8});const current=f.r.groundPoint(16);assert.ok(current.distanceTo(old)>3);f.step();near(f.fields()[0].position.distanceTo(current),0,'point follows resolution reticle, not press-time point');f.dispose();
}
{
  const f=fixture();f.boxes.push({minX:-4,maxX:4,minY:0,maxY:4,minZ:3,maxZ:3.2});f.refresh();const expected=f.r.groundPoint(16);f.launch();near(f.fields()[0].position.distanceTo(expected),0);assert.ok(f.fields()[0].position.z>=3.2-1e-6,'actual camera/muzzle solid trace bounds ground placement before cover');f.dispose();
}
{
  const f=fixture();f.launch();const fixed=f.fields()[0].position.clone();f.place(f.h,f.c,{x:100,y:0,z:8});f.place(f.enemy,f.ec,{x:fixed.x+4,y:0,z:fixed.z});f.steps(10);near(f.s.stats(f.enemy.id).moveSpeed,8);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),true);
  f.place(f.enemy,f.ec,{x:fixed.x+2,y:0,z:fixed.z});f.boxes.push({minX:fixed.x+.8,maxX:fixed.x+1,minY:0,maxY:3,minZ:fixed.z-1,maxZ:fixed.z+1});f.steps(5);near(f.s.stats(f.enemy.id).moveSpeed,4.8,'volume does not invent per-target LOS');near(f.fields()[0].position.distanceTo(fixed),0);assert.ok(f.results.every(x=>x.ok));near(f.step(true),.6,'actual Host multiplier passed into enemy controller update');assert.ok(f.ec.velocity.length()>0&&f.ec.velocity.length()<=4.8+1e-6);f.dispose();
}
{
  const f=fixture({cloak:true}),until=f.enemy.cloakUntil,descriptor=f.targets().find(t=>t.id===f.enemy.id);assert.equal(descriptor.alive,false);assert.equal(descriptor.living,true);f.launch();near(f.s.stats(f.enemy.id).moveSpeed,4.8);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),true);assert.equal(f.s.isRevealedTo(f.enemy.id,'ivory'),false);assert.equal(f.s.isRevealedTo(f.ally.id,'carbon'),false);assert.equal(f.enemy.cloakUntil,until);assert.equal(f.targets().find(t=>t.id===f.enemy.id).alive,false,'reveal does not alter existing automatic/manual cloak predicate');f.dispose();
}
{
  const f=fixture({overtime:true});assert.ok(f.enemyRuntime.cast(4),'actual native Overtime, no synthetic invulnerability grant');assert.equal(f.s.stats(f.enemy.id).invulnerable,true);f.launch();assert.equal(f.effects('status').length,1);assert.ok(f.results.some(x=>!x.ok));assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),true,'information reveal remains valid against invulnerability');near(f.s.stats(f.enemy.id).moveSpeed,12);
  f.enemyRuntime.reset();assert.equal(f.s.stats(f.enemy.id).invulnerable,false);f.steps(5);near(f.s.stats(f.enemy.id).moveSpeed,4.8);assert.equal(f.fields()[0].slowCounts.get(f.enemy.id),1,'rejected immune slow did not spend local budget');f.dispose();
}
{
  const f=fixture();assert.ok(f.r.cast(2));assert.ok(f.r.fire(),'primary remains independent during trap windup');assert.ok(f.r.melee(),'Mileage Tap remains independent during trap windup');assert.equal(f.r.pendingCast.definition.id,'speedtrap');f.dispose();
}
for(const phase of ['pending','live'])for(const mode of ['reset','death-caller-reset','dispose']) {
  const f=fixture();assert.ok(f.r.cast(2));f.steps(phase==='pending'?2:5);if(mode==='death-caller-reset')assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);
  if(mode==='dispose')f.r.dispose();else f.r.reset();assert.equal(f.fields().length,0);assert.equal(f.r.pendingCast,null);
  if(phase==='live'){near(f.s.stats(f.enemy.id).moveSpeed,4.8);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),true,'Runtime FX disposal cannot revoke Host-owned reveal tail');}
  if(mode==='dispose'){const before=f.state();assert.equal(f.r.cast(2),false);assert.equal(f.state(),before);}f.steps(16);near(f.s.stats(f.enemy.id).moveSpeed,8);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),phase==='live');f.steps(15);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),false);f.dispose();
}
for(const trigger of ['deployment-start','status','reveal'])for(const mode of ['reset','dispose']) {
  const f=fixture(),forward=f.r.onEffect;f.r.onEffect=e=>{const result=forward(e);if(e.kind===trigger)mode==='reset'?f.r.reset():f.r.dispose();return result;};f.launch();assert.equal(f.fields().length,0);assert.equal(f.effects('status').length,trigger==='deployment-start'?0:1);assert.equal(f.effects('reveal').length,trigger==='reveal'?1:0,'cancellation between slow and reveal stops paired callback');assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),trigger==='reveal');f.steps(31);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),false);f.dispose();
}
for(const ack of ['NACK','lost-ACK']) {
  const f=fixture(),forward=f.r.onEffect;f.r.onEffect=e=>{if(e.kind==='deployment-start'&&ack==='NACK'){const result=f.s.applyHeroEffect({...e,origin:{x:e.origin.x+100,y:e.origin.y,z:e.origin.z}});assert.equal(result.ok,false);return result;}const result=forward(e);return e.kind==='deployment-start'&&ack==='lost-ACK'?undefined:result;};f.launch();assert.equal(f.fields().length,0);assert.equal(f.effects('status').length,0);assert.equal(f.effects('reveal').length,0);assert.equal(f.s.isRevealedTo(f.enemy.id,'carbon'),false);f.dispose();
}
console.log('PASS Odo Speed Trap: actual model/Host/Runtime/controllers/camera/Game targets; resolution-time covered ground reticle, .25 windup/11CD/range16/radius3/fixed4s, independent16 slow/reveal and8 zone ticks, 8->4.8->8/.5 slow+1.5 team reveal tails, no HP/ammo, moving caster/exit/reentry/volume/cloak facts, lifecycle/closed/reentry between callbacks and real NACK/lost-ACK cleanup. CPU only; native/art acceptance held.');
