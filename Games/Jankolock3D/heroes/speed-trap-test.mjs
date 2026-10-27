// CPU real-model/Host tests, not native input or supplied FX-art acceptance.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { SPEED_TRAP as a,isSpeedTrap,speedTrapEligible,speedTrapClock } from './speed-trap.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { PlayerController } from './player-controller.mjs';
import { loadCharacter } from '../character-assets.mjs';
import { createSystems } from '../systems.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.ok(isSpeedTrap(a));assert.equal(isSpeedTrap(null),false);
for(const key of Object.keys(a))assert.equal(isSpeedTrap({...a,[key]:null}),false,key);
for(const extra of [{anchoredSlow:false},{maxApplicationsPerTarget:16}])assert.equal(isSpeedTrap({...a,...extra}),false);
const enemy={id:'enemy',kind:'hero',team:'ivory',alive:true,position:point(0,0,3)};
assert.ok(speedTrapEligible(enemy,point(),'carbon','status'));
assert.ok(speedTrapEligible({...enemy,alive:false,living:true,autoTargetable:false},point(),'carbon'));
assert.ok(speedTrapEligible({...enemy,kind:'structure'},point(),'carbon'));
assert.equal(speedTrapEligible({...enemy,kind:'structure'},point(),'carbon','status'),false);
for(const extra of [{kind:'orb'},{kind:undefined},{team:'carbon'},{alive:false},{living:false},{position:point(0,.01,3)}])assert.equal(speedTrapEligible({...enemy,...extra},point(),'carbon'),false);
const ticks=new Set(),zones=new Set();for(let i=0;i<80;i++){const c=speedTrapClock(i*.05);assert.equal(c.expired,false);ticks.add(c.effectTick);zones.add(c.zoneTick);}assert.equal(ticks.size,16);assert.equal(zones.size,8);assert.ok(speedTrapClock(4).expired);
console.log('PASS Speed Trap pure definition, typed living/cloaked enemy eligibility, 3D radius and distinct 16 effect/8 zone clocks');
await loadCharacter('odometer');
function fixture(effect=()=>({ok:false})) {
  const kit=structuredClone(odometerSlice);kit.abilities=kit.abilities.filter(x=>x.id!==a.id);kit.abilities.push({...a,fx:{color:'#73834e'}});
  const scene=new THREE.Scene(),controller=new PlayerController({position:point(),boxes:[],floorHeight:()=>0});controller.pitch=-Math.PI/2;
  const events=[],r=new HeroRuntime({scene,controller,kit,source:'source',onEffect:event=>{events.push(event);return effect(event,r);}});
  return {r,controller,scene,events,kit};
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const {r,events,scene}=fixture(()=>ack);assert.ok(r.cast(2));const before=JSON.stringify(r.snapshot());
  for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(JSON.stringify(r.snapshot()),before);
  for(let i=0;i<4;i++){r.update(.05);assert.equal(events.length,0);}r.update(.05);
  assert.deepEqual(events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);near(r.cooldowns[2],10.75);assert.equal(r.castCount.speedtrap,1);r.dispose();assert.equal(scene.children.length,0);
}
for(const mode of ['reenter','reset','dispose']) {
  const {r,events}=fixture((event,r)=>{if(event.kind==='deployment-start'){if(mode==='reenter')r.update(.05);else r[mode]();}return {ok:false};});
  r.targets=[enemy];assert.ok(r.cast(2));for(let i=0;i<5;i++)r.update(.05);assert.equal(events.filter(e=>['status','reveal'].includes(e.kind)).length,0);r.dispose();
}
for(const primary of [Object.freeze(new Error('primary')),undefined,Symbol('primary')]) {
  const secondary=Symbol('cleanup'),{r}=fixture(event=>{if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;});
  assert.ok(r.cast(2));for(let i=0;i<4;i++)r.update(.05);let threw=false,caught;try{r.update(.05);}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(r.deployments.length,0);r.dispose();
}
console.log('PASS Speed Trap negative ACK/no-cost pending lock, birth reentry, reset/dispose and exact frozen/primitive primary plus secondary failure');
if(!process.argv.includes('--pure')) {
  function hostFixture() {
    const s=createSystems();s.step(30);
    const source=s.addHero({id:'source',team:'carbon',position:point()}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(1)});
    const f=fixture(event=>s.applyHeroEffect(event));assert.ok(s.configureHeroKit(source.id,f.kit,{partialSlice:true}).ok);f.r.targets=[enemy];
    return {...f,s,source,enemy,step:()=>{assert.ok(s.step(.05).ok);f.r.update(.05);}};
  }
  {
    const f=hostFixture(),{r,s,source,enemy,events}=f,hp=[source.hp,enemy.hp],ammo=r.ammo;
    assert.ok(r.cast(2));for(let i=0;i<4;i++){f.step();near(s.stats(enemy.id).moveSpeed,8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);}
    f.step();const field=r.deployments[0];near(field.age,0);near(field.left,4);near(s.stats(enemy.id).moveSpeed,4.8);assert.ok(s.isRevealedTo(enemy.id,'carbon'));
    const initial=events.length;r.hit(field.definition,enemy);assert.equal(events.length,initial,'unanchored generic hit cannot dispatch Speed Trap');
    for(let i=0;i<79;i++)f.step();assert.ok(r.deployments.includes(field));f.step();assert.equal(r.deployments.length,0);
    assert.equal(field.slowCounts.get(enemy.id),16);assert.equal(field.revealCounts.get(enemy.id),16);assert.equal(field.zoneCounts.get(enemy.id),8);
    assert.equal(events.filter(e=>e.kind==='status').length,16);assert.equal(events.filter(e=>e.kind==='reveal').length,16);
    for(let i=0;i<6;i++)f.step();near(s.stats(enemy.id).moveSpeed,8);assert.ok(s.isRevealedTo(enemy.id,'carbon'));
    for(let i=0;i<20;i++)f.step();assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);
    assert.deepEqual([source.hp,enemy.hp],hp);assert.equal(r.ammo,ammo);r.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,enemy,controller}=f;assert.ok(r.cast(2));for(let i=0;i<4;i++)f.step();
    controller.warp(point(10));assert.ok(s.moveHero(source.id,point(10)).ok);assert.ok(s.moveHero(enemy.id,point(11)).ok);f.step();
    const field=r.deployments[0];near(field.position.x,10);const center=field.position.clone();controller.warp(point(100));assert.ok(s.moveHero(source.id,point(100)).ok);
    for(let i=0;i<5;i++)f.step();assert.ok(field.position.equals(center));assert.equal(field.slowCounts.get(enemy.id),2);assert.ok(s.isRevealedTo(enemy.id,'carbon'));r.dispose();
  }
  for(const mode of ['reset','dispose']) {
    const f=hostFixture(),{r,s,enemy}=f,real=r.onEffect;let entered=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='status'&&!entered){entered=true;assert.ok(result.ok);r[mode]();}return result;};
    assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();assert.ok(entered);assert.equal(f.events.filter(e=>e.kind==='reveal').length,0);near(s.stats(enemy.id).moveSpeed,4.8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);assert.equal(r.deployments.length,0);r.dispose();
  }
  for(const rejectedKind of ['status','reveal']) {
    const f=hostFixture(),{r,s,enemy}=f,real=r.onEffect;
    r.onEffect=event=>event.kind===rejectedKind?{ok:false}:real(event);
    assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const field=r.deployments[0];
    assert.equal(field.slowCounts.get(enemy.id)??0,rejectedKind==='status'?0:1);assert.equal(field.revealCounts.get(enemy.id)??0,rejectedKind==='reveal'?0:1);
    near(s.stats(enemy.id).moveSpeed,rejectedKind==='status'?8:4.8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),rejectedKind!=='reveal');r.onEffect=real;r.dispose();
  }
  {
    const f=hostFixture(),{r,s,enemy}=f,real=r.onEffect;let accepted=0;
    r.onEffect=event=>{const result=real(event);if(['status','reveal'].includes(event.kind)){if(result.ok)accepted++;return undefined;}return result;};
    assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const field=r.deployments[0];for(let i=0;i<80;i++)f.step();
    assert.equal(accepted,32);assert.equal(field.slowCounts.size,0);assert.equal(field.revealCounts.size,0);assert.ok(s.isRevealedTo(enemy.id,'carbon'));r.dispose();
  }
  for(const primary of [Object.freeze(new Error('after accepted slow')),undefined]) {
    const f=hostFixture(),{r,s,enemy}=f,real=r.onEffect,secondary=Symbol('cleanup');let field;
    r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='status'){field=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};
    assert.ok(r.cast(2));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
    assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(field.slowCounts.size,0);assert.equal(field.revealCounts.size,0);assert.equal(r.deployments.length,0);
    near(s.stats(enemy.id).moveSpeed,4.8);assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);r.onEffect=real;r.dispose();
  }
  console.log('PASS Speed Trap actual Host: resolution-time current ground point, fixed field after caster departure, independent 16/16 budgets + tails, no HP/ammo, generic-hit rejection, stop reveal after slow callback cancellation, independent NACK/lost-ACK budgets and primary/secondary faults after committed slow');
}
console.log('LIMIT: CPU standard point-volume/covered-ground binding only, not exact geometry, native input or full network/LOS authority.');
