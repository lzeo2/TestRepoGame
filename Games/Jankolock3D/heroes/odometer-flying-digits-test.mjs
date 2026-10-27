// CPU integration only: actual supplied Odo model/controller/Runtime and real Host ACK/HP.
// API placements are not traversal proof. Collisions use conservative expanded AABBs,
// not exact rounded corners, mesh/native geometry, supplied FX GLB or new animation.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {odometerSlice} from './odometer-slice.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),flying=p=>p.definition.id==='flyingdigits';
await loadCharacter('odometer');
function fixture() {
  const s=createSystems();s.step(30);
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),enemy=s.addHero({id:'enemy',team:'ivory',position:{x:.55,y:0,z:6}});
  const kit=structuredClone(odometerSlice),admission=s.configureHeroKit(h.id,kit,{partialSlice:true});assert.ok(admission.ok,`Flying Digits Host dependency: ${admission.reason}`);
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit,boxes,source:h.id,onEffect:e=>{events.push(e);const result=s.applyHeroEffect(e);results.push(result);return result;}});r.targets=[];
  const step=()=>{assert.ok(s.step(.05).ok);r.update(.05);},steps=n=>{for(let i=0;i<n;i++)step();};
  const shots=()=>r.projectiles.filter(flying),damage=()=>events.filter(e=>e.kind==='damage');
  const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,wait:r.meleeWait,host:s.events,heroes:s.heroes,stats:s.heroes.map(x=>s.stats(x.id)),events,results,modifiers:r.modifiers,position:c.position,velocity:c.velocity,shots:shots().map(p=>({id:p.burstId,index:p.projectileIndex,p:p.position,d:p.travelled})),handles:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position]),children:scene.children.map(x=>x.uuid)});
  const launch=()=>{assert.ok(r.cast(3),'Flying Digits Runtime admission');steps(5);assert.equal(r.pendingCast,null,'exact .25s windup at .05s steps');};
  const dispose=()=>{r.dispose();assert.equal(shots().length,0);assert.equal(scene.children.length,0);};
  return {s,h,enemy,r,c,boxes,events,results,step,steps,shots,damage,state,launch,dispose};
}
{
  const f=fixture(),{r,s,h,c,events,results,steps,shots}=f,ammo=r.ammo,hostAmmo=h.ammo;
  assert.ok(r.cast(3));assert.equal(r.cooldowns[3],8);assert.equal(r.castCount.flyingdigits,1);assert.equal(shots().length,0);
  const before=f.state();assert.equal(r.cast(1),false,'other supported slot locked, not queued');assert.equal(r.cast(3),false);assert.equal(f.state(),before);
  steps(4);near(r.pendingCast.left,.05);assert.equal(events.length,0);assert.equal(shots().length,0);
  // Binding convention: direction is captured at input, muzzle follows current caster at resolution.
  assert.ok(s.moveHero(h.id,{x:1,y:0,z:8}).ok);c.warp(h.position);c.yaw=Math.PI/2;const muzzle=r.origin.clone();f.step();
  assert.equal(r.pendingCast,null);assert.equal(shots().length,4);assert.deepEqual(events.map(e=>e.kind),['burst-start']);assert.ok(results[0].ok);assert.equal(f.damage().length,0);
  const birth=shots().slice().sort((a,b)=>a.projectileIndex-b.projectileIndex),start=events[0];near(new THREE.Vector3(start.origin.x,start.origin.y,start.origin.z).distanceTo(muzzle),0);
  assert.equal(new Set(birth.map(p=>p.burstId)).size,1);assert.deepEqual(birth.map(p=>p.projectileIndex),[0,1,2,3]);assert.ok(Number.isSafeInteger(start.burstId)&&start.burstId>0);
  for(let i=0;i<4;i++){const p=birth[i],direction=p.direction??p.velocity.clone().normalize(),expected=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),(-14+i*28/3)*Math.PI/180);near(direction.distanceTo(expected),0);near(p.position.distanceTo(muzzle),0);near(p.travelled,0);if(p.velocity)near(p.velocity.length(),40);}
  f.step();for(const p of birth){near(p.travelled,2);near(p.position.distanceTo(muzzle),2);near(p.handle.position.distanceTo(p.position),0);}
  steps(12);assert.equal(shots().length,0);for(const p of birth){near(p.travelled,25);near(p.position.distanceTo(muzzle),25);}assert.equal(events.filter(e=>e.kind==='burst-end').length,1);assert.equal(f.damage().length,0);assert.equal(r.ammo,ammo);assert.equal(h.ammo,hostAmmo);
  const cooldownState=f.state();assert.equal(r.cast(3),false);assert.equal(f.state(),cooldownState);for(let i=0;i<180&&r.cooldowns[3]>0;i++)f.step();assert.ok(r.cast(3),'normal cooldown expiry admits next cast');r.reset();f.dispose();
}
{
  const f=fixture();assert.ok(f.r.cast(3));assert.ok(f.r.fire(),'primary remains independent during windup');assert.ok(f.r.melee(),'Mileage Tap remains independent during windup');assert.equal(f.r.ammo,19);assert.equal(f.r.pendingCast.definition.id,'flyingdigits');f.dispose();
}
{
  const f=fixture(),hp=f.enemy.hp;f.r.targets=[f.enemy];f.launch();assert.equal(f.enemy.hp,hp);f.step();
  assert.equal(f.damage().length,2);assert.equal(new Set(f.damage().map(e=>e.projectileIndex)).size,2);assert.equal(f.shots().length,0);near(hp-f.enemy.hp,2*18*.9);assert.equal(f.r.ammo,20);assert.ok(f.results.every(x=>x.ok));f.dispose();
}
{
  const f=fixture();assert.ok(f.s.moveHero(f.enemy.id,{x:1.9,y:0,z:0}).ok);const second=f.s.addHero({id:'second',team:'ivory',position:{x:-.8,y:0,z:0}}),hp=[f.enemy.hp,second.hp];f.r.targets=[f.enemy,second];f.launch();f.steps(6);
  assert.equal(f.damage().length,4);for(const target of [f.enemy,second])assert.equal(f.damage().filter(e=>e.target===target.id).length,2);near(hp[0]-f.enemy.hp,32.4);near(hp[1]-second.hp,32.4);assert.ok(f.results.every(x=>x.ok));f.dispose();
}
for(const miss of ['cover','range','ally','dead']) {
  const f=fixture();f.r.targets=[f.enemy];
  if(miss==='cover')f.boxes.push({minX:-3,maxX:3,minY:0,maxY:3,minZ:7.2,maxZ:7.3});
  if(miss==='range')assert.ok(f.s.moveHero(f.enemy.id,{x:.55,y:0,z:-20}).ok);
  if(miss==='ally')f.r.targets=[f.s.addHero({id:'ally',team:'carbon',position:{x:.55,y:0,z:6}})];
  if(miss==='dead')assert.ok(f.s.damage(f.enemy.id,1e6,f.h.id,{kind:'ability'}).killed);
  const hp=f.s.heroes.map(x=>x.hp);f.launch();f.steps(14);assert.deepEqual(f.s.heroes.map(x=>x.hp),hp);assert.equal(f.damage().length,0);assert.equal(f.shots().length,0);assert.equal(f.r.ammo,20);assert.equal(f.events.filter(e=>e.kind==='burst-end').length,1);f.dispose();
}
{
  const f=fixture();
  // Imported currency/derived level are item setup, not played economy progression.
  const cloaked=f.s.addHero({id:'cloaked',team:'ivory',position:f.s.bases.ivory,souls:3200,earnedSouls:3200});assert.ok(f.s.buyItem(cloaked.id,'shadow-cloak').ok);assert.ok(f.s.moveHero(cloaked.id,{x:.55,y:0,z:6}).ok);assert.ok(f.s.activateItem(cloaked.id,'shadow-cloak').ok);assert.ok(cloaked.cloakUntil>f.s.time);
  const hp=cloaked.hp;f.r.targets=[cloaked];f.launch();f.step();near(hp-cloaked.hp,32.4,'manual projectiles are not automatic cloak targeting');f.dispose();
}
for(const phase of ['pending','live'])for(const mode of ['reset','death-caller-reset','dispose']) {
  const f=fixture(),hp=f.enemy.hp;assert.ok(f.r.cast(3));f.steps(phase==='pending'?2:5);const id=f.events.find(e=>e.kind==='burst-start')?.burstId;
  if(mode==='death-caller-reset')assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);
  if(mode==='dispose')f.r.dispose();else f.r.reset();assert.equal(f.r.pendingCast,null);assert.equal(f.shots().length,0);f.steps(14);assert.equal(f.enemy.hp,hp);assert.equal(f.damage().length,0);
  if(mode==='dispose'){const before=f.state();assert.equal(f.r.cast(3),false);assert.equal(f.state(),before);}
  if(mode==='reset'&&id){f.launch();assert.ok(f.events.filter(e=>e.kind==='burst-start').at(-1).burstId>id,'sequence never reset');}
  f.dispose();
}
for(const trigger of ['burst-start','damage'])for(const mode of ['reset','dispose']) {
  const f=fixture(),hp=f.enemy.hp,forward=f.r.onEffect;f.r.targets=[f.enemy];f.r.onEffect=e=>{const result=forward(e);if(e.kind===trigger)mode==='reset'?f.r.reset():f.r.dispose();return result;};
  f.launch();if(trigger==='damage')f.step();assert.equal(f.shots().length,0);f.steps(3);near(hp-f.enemy.hp,trigger==='damage'?16.2:0);assert.equal(f.damage().length,trigger==='damage'?1:0);assert.equal(f.events.filter(e=>e.kind==='burst-end').length,1);f.dispose();
}
{
  const f=fixture(),hp=f.enemy.hp,forward=f.r.onEffect;let entered=false;f.r.targets=[f.enemy];f.r.onEffect=e=>{const result=forward(e);if(e.kind==='damage'&&!entered){entered=true;f.r.update(.05);}return result;};f.launch();f.step();f.steps(2);assert.equal(f.damage().length,2);near(hp-f.enemy.hp,32.4);assert.equal(f.shots().length,0);f.dispose();
}
{
  const f=fixture();f.r.setModifiers({cooldown:.01});f.launch();const first=f.shots().slice(),firstId=first[0].burstId;
  f.launch();assert.equal(f.shots().length,8,'public cooldown modifier allows overlapping live bursts');const second=f.shots().filter(p=>p.burstId!==firstId),secondId=second[0].burstId;assert.equal(second.length,4);assert.ok(secondId>firstId);
  f.steps(8);assert.equal(f.shots().length,4);assert.ok(f.shots().every(p=>p.burstId===secondId),'old end cannot remove the newer owner');for(const p of first)near(p.travelled,25);for(const p of second)near(p.travelled,16);
  f.steps(5);assert.equal(f.shots().length,0);assert.deepEqual(f.events.filter(e=>e.kind==='burst-end').map(e=>e.burstId),[firstId,secondId]);assert.ok(f.results.every(x=>x.ok));f.dispose();
}
for(const ack of ['NACK','lost-ACK']) {
  const f=fixture(),hp=f.enemy.hp,forward=f.r.onEffect;
  f.r.onEffect=e=>{if(e.kind==='burst-start'&&ack==='NACK'){const result=f.s.applyHeroEffect({...e,target:f.enemy.id});assert.equal(result.ok,false);return result;}const result=forward(e);return e.kind==='burst-start'&&ack==='lost-ACK'?undefined:result;};
  f.launch();assert.equal(f.shots().length,0);f.steps(14);assert.equal(f.enemy.hp,hp);assert.equal(f.damage().length,0);assert.equal(f.r.ammo,20);f.dispose();
}
console.log('PASS Odo Flying Digits: actual model/controller/Runtime/Host, .25 windup, simultaneous four-way 28-degree fan, 40m/s swept expanded-AABB flight/25m TTL, 2-hit per-target real HP cap, independent targets, no ammo, cooldown/windup no-cost lock, cover/range/ally/dead/cloak semantics, cancellation/closed/reentry and real NACK/lost-ACK cleanup. CPU only; not native/mesh/art/full-kit acceptance.');
