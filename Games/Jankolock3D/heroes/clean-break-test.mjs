// CPU actual model/Host/controller and native enemy attacks, not native/art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {whitespaceSlice,CLEAN_BREAK} from './whitespace-slice.mjs';
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
await loadCharacter('whitespace');await loadCharacter(native.id);
function fixture() {
  const s=createSystems();s.step(30);
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),ally=s.addHero({id:'ally',team:'carbon',position:{x:2,y:0,z:8}}),kit=structuredClone(whitespaceSlice);
  assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
  const scene=new THREE.Scene(),boxes=[],events=[],results=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0});
  const r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});r.targets=[ally];
  const guards=[0,1].map(index=>{
    const hero=s.addHero({id:`enemy${index}`,team:'ivory',position:{x:.55,y:0,z:0}});assert.ok(s.configureHeroKit(hero.id,native).ok);
    const controller=new PlayerController({position:hero.position,boxes,floorHeight:()=>0});controller.yaw=Math.PI;
    const outcomes=[],runtime=new HeroRuntime({scene,controller,kit:native,source:hero.id,team:'ivory',onEffect:event=>{const result=s.applyHeroEffect(event);outcomes.push(result);return result;}});runtime.targets=[h];
    return {hero,controller,runtime,outcomes};
  });
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,input);assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);for(const g of guards)g.runtime.update(.05);};
  const state=()=>JSON.stringify({snapshot:r.snapshot(),position:c.position,velocity:c.velocity,heroes:s.heroes,events,results,host:s.events,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();for(const g of guards)g.runtime.dispose();assert.equal(scene.children.length,0);};
  return {s,h,ally,kit,scene,boxes,c,r,events,results,guards,step,state,dispose};
}
// Keep Clear gets its own actual Host positive, without altering Clean's clock.
{
  const f=fixture(),{r,s}=f;assert.ok(r.cast(2));near(r.pendingCast.left,.25);near(r.cooldowns[2],11);
  for(let i=0;i<4;i++){f.step();assert.equal(s.wallPanels().length,0);}f.step();assert.equal(s.wallPanels().length,2);assert.ok(s.wallPanels().every(p=>p.hp===280));near(r.deployments[0].left,4);
  for(let i=0;i<80;i++)f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);f.dispose();
}
// Slot4 is now supported: exercise it in isolation, without altering Clean's clock.
{
  const f=fixture(),{r,s,h,ally,events,results}=f;
  assert.equal(r.kit.abilities.find(a=>a.slot===4)?.id,'unprintedpassage');
  const hp=s.heroes.map(hero=>hero.hp),ammo=r.ammo;
  assert.ok(r.cast(4));assert.equal(r.pendingCast.definition.id,'unprintedpassage');near(r.pendingCast.left,.65);near(r.cooldowns[4],24);
  for(let i=0;i<12;i++){f.step();assert.equal(r.deployments.length,0);assert.equal(events.length,0);}
  f.step();assert.equal(r.pendingCast,null);assert.equal(r.deployments.length,1);
  const field=r.deployments[0];assert.equal(field.definition.id,'unprintedpassage');assert.equal(field.centers.length,6);near(field.age,0);near(field.left,5);
  field.centers.forEach((center,i)=>{near(center.x,0);near(center.y,0);near(center.z,8-i*3);});
  const startIndex=events.findIndex(event=>event.kind==='deployment-start'&&event.ability==='unprintedpassage');
  assert.ok(startIndex>=0);assert.ok(results[startIndex].ok,'actual Host acknowledges the six-center deployment');
  near(s.stats(h.id).moveSpeed,10.8);near(s.stats(ally.id).moveSpeed,10.8);assert.equal(r.ammo,ammo);assert.deepEqual(s.heroes.map(hero=>hero.hp),hp);
  f.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=fixture(),{r,s,h,ally,c,events,guards}=f,[first,second]=guards,ammo=r.ammo,position=c.position.clone(),cloak=h.cloakUntil;
  const aim=r.aimHit;r.aimHit=()=>assert.fail('self cast/unavailable/pending inputs must not aim');
  for(const slot of [0]){const before=f.state();assert.equal(r.cast(slot),false);assert.equal(f.state(),before);}
  assert.ok(r.cast(3));near(r.cooldowns[3],12);assert.equal(r.castCount.cleanbreak,1);near(r.pendingCast.left,.25);
  const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);r.aimHit=aim;
  let hp=h.hp;assert.ok(first.runtime.fire());assert.ok(first.outcomes.at(-1).ok);assert.ok(h.hp<hp,'real native shot damages during windup');
  for(let i=0;i<4;i++){f.step();assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);}
  f.step();near(r.buffs.cleanbreak.left,1);near(s.stats(h.id).moveSpeed,9.6);near(c.speedMultiplier,1.2);assert.ok(s.stats(h.id).invulnerable);assert.ok(c.position.equals(position),'no forced displacement');
  const start=events.find(e=>e.kind==='buff');assert.equal(start.invulnerable,true);assert.equal(start.invulnerabilityDuration,.7);assert.equal(start.duration,1);
  hp=h.hp;assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).ok,false);assert.equal(first.outcomes.at(-1).reason,'invulnerable');assert.equal(h.hp,hp);
  const allyHP=ally.hp;assert.ok(s.damage(ally.id,20,first.hero.id,{kind:'projectile'}).ok);assert.ok(ally.hp<allyHP);assert.equal(s.stats(ally.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,8);
  for(let i=0;i<13;i++)f.step();assert.ok(s.stats(h.id).invulnerable);hp=h.hp;assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).ok,false);assert.equal(h.hp,hp);
  f.step();assert.equal(s.stats(h.id).invulnerable,false);near(r.buffs.cleanbreak.left,.3);near(s.stats(h.id).moveSpeed,9.6);
  hp=h.hp;assert.ok(second.runtime.fire());assert.ok(second.outcomes.at(-1).ok);assert.ok(h.hp<hp,'native shot damages in final .3s speed-only interval');
  for(let i=0;i<6;i++)f.step();assert.equal(r.buffs.cleanbreak,undefined);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);hp=h.hp;assert.ok(first.runtime.fire());assert.ok(h.hp<hp);
  const injured=h.hp;for(let i=0;i<5;i++)f.step();assert.equal(h.hp,injured);assert.equal(r.ammo,ammo);assert.equal(h.cloakUntil,cloak);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);f.dispose();
}
{
  const f=fixture(),{r,s,guards}=f,enemy=guards[0];assert.ok(s.moveHero(enemy.hero.id,{x:0,y:0,z:6}).ok);enemy.controller.warp(enemy.hero.position);r.targets=[enemy.hero];
  assert.ok(r.cast(3));const pending=r.pendingCast,hp=enemy.hero.hp;assert.ok(r.fire());assert.ok(r.melee());assert.equal(r.pendingCast,pending);assert.ok(enemy.hero.hp<hp);assert.ok(f.results.every(result=>result.ok));assert.equal(r.ammo,15);
  for(let i=0;i<5;i++)f.step();assert.ok(r.buffs.cleanbreak);f.dispose();
}
for(const wall of [false,true]) {
  const f=fixture(),{r,s,h,c,boxes}=f;if(wall)boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const position=c.position.clone();
  for(let i=0;i<18;i++)f.step({forward:1});near(s.stats(h.id).moveSpeed,9.6);assert.ok(c.position.z<position.z);
  if(wall){assert.ok(c.position.z>=5.45-1e-6,'normal capsule remains outside wall');near(c.position.y,0);assert.ok(c.position.z>4);}
  else assert.ok(c.velocity.length()>8&&c.velocity.length()<=9.6+1e-8,'controlled movement is 1.2x, not double Host scaling');
  f.dispose();
}
// Staggered owners: max, not multiplication; each surviving speed resumes normally.
for(const order of ['wide-first','clean-late']) {
  const f=fixture(),{r,s,h}=f;assert.ok(r.cast(1));f.step();f.step();
  if(order==='clean-late')for(let i=0;i<40;i++)f.step();
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();near(s.stats(h.id).moveSpeed,12.4);near(f.c.speedMultiplier,1.55);
  if(order==='clean-late'){
    for(let i=0;i<5;i++)f.step();assert.equal(r.buffs.widemargin,undefined);assert.ok(r.buffs.cleanbreak);near(s.stats(h.id).moveSpeed,9.6);
    for(let i=0;i<15;i++)f.step();near(s.stats(h.id).moveSpeed,8);
  }else{
    for(let i=0;i<20;i++)f.step();assert.equal(r.buffs.cleanbreak,undefined);assert.ok(r.buffs.widemargin);near(s.stats(h.id).moveSpeed,12.4);assert.equal(s.stats(h.id).invulnerable,false);
  }
  f.dispose();
}
for(const when of ['pending','active'])for(const mode of ['reset','death','dispose']) {
  const f=fixture(),{r,s,h,guards}=f;assert.ok(r.cast(3));f.step();if(when==='active')for(let i=0;i<4;i++)f.step();
  if(mode==='death'){
    // An active protected source can die only after the .7 window, before speed ends.
    if(when==='active')for(let i=0;i<15;i++)f.step();
    assert.ok(s.damage(h.id,1e6,guards[0].hero.id,{kind:'ability'}).killed);r.reset();
  }else r[mode]();
  assert.equal(r.pendingCast,null);assert.equal(r.buffs.cleanbreak,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);f.dispose();
}
for(const mode of ['reset','dispose','recast']) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;let entered=false;
  r.onEffect=event=>{const result=real(event);if(event.kind==='buff'&&event.ability==='cleanbreak'&&!entered){entered=true;assert.ok(result.ok);assert.ok(r.buffs.cleanbreak);if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(3));}return result;};
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();assert.ok(entered);assert.equal(r.buffs.cleanbreak,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();assert.ok(r.buffs.cleanbreak);assert.ok(s.stats(h.id).invulnerable);}
  f.dispose();
}
{
  const f=fixture(),{r,s,h}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const old=r.buffs.cleanbreak;
  for(let i=0;i<10;i++)f.step();assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const fresh=r.buffs.cleanbreak;assert.notEqual(fresh,old);assert.equal(old.handle.remaining,0);assert.equal(r.removeBuff('cleanbreak',old),false);
  for(let i=0;i<6;i++)f.step();assert.equal(r.buffs.cleanbreak,fresh);assert.ok(s.stats(h.id).invulnerable,'old owner deadline cannot revoke refreshed opening');f.dispose();
}
for(const primary of [Object.freeze(new Error('Host-first Clean callback')),undefined]) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'&&event.ability==='cleanbreak'){assert.ok(result.ok);throw primary;}return result;};
  assert.ok(r.cast(3));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.ok(r.buffs.cleanbreak);assert.ok(s.stats(h.id).invulnerable);near(s.stats(h.id).moveSpeed,9.6);r.onEffect=real;r.reset();assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r}=f,a=r.kit.abilities.find(a=>a.id==='cleanbreak');r.aimHit=()=>assert.fail('malformed Clean Break cannot aim');
  for(const key of Object.keys(CLEAN_BREAK)){const value=a[key];a[key]=null;const before=f.state();assert.equal(r.cast(3),false,key);assert.equal(f.state(),before);a[key]=value;}
  r.dispose();const before=f.state();for(const run of [()=>r.cast(3),()=>r.cast(1),()=>r.fire(),()=>r.melee()])assert.equal(run(),false);r.update(.05);assert.equal(f.state(),before);r.reset();assert.equal(r.cast(3),false);f.dispose();
}
{
  const f=fixture(),{r,s,h}=f,real=r.onEffect,primary=Object.freeze(new Error('Host-first cleanup callback'));
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();
  r.onEffect=event=>{const result=real(event);if(event.kind==='buff-end'&&event.ability==='cleanbreak'){assert.ok(result.ok);throw primary;}return result;};
  assert.throws(()=>r.dispose(),error=>error===primary);assert.equal(r.buffs.cleanbreak,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  const before=f.state();assert.equal(r.cast(3),false);assert.equal(r.fire(),false);r.update(.05);assert.equal(f.state(),before,'failed teardown remains terminally closed');
  r.onEffect=real;r.dispose();f.dispose();
}
console.log('PASS Clean Break actual model/Host/native enemy: vulnerable windup, .7 protection independent of 1s speed, last .3 vulnerable, allies unprotected, no healing/cloak/ammo gain, normal wall collision/9.6 movement, Wide max12.4/staggered clocks, lifecycle/reentry/refresh/stale owner/frozen errors/closed and malformed guards');
console.log('LIMIT: CPU/API placement and normal .05 clocks, not native input, rendered art, exact mesh collision or balance acceptance.');
