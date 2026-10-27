// CPU/protocol evidence only. Existing real model; no positive Host ACK mock.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { END_SHIFT_SPRINT as a,isEndShiftSprint,endShiftEligible,endShiftClock } from './end-shift-sprint.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { PlayerController } from './player-controller.mjs';
import { loadCharacter } from '../character-assets.mjs';
import { createSystems } from '../systems.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.ok(isEndShiftSprint(a));assert.equal(isEndShiftSprint(null),false);
for(const key of Object.keys(a))assert.equal(isEndShiftSprint({...a,[key]:null}),false,key);
const friend={id:'friend',kind:'hero',team:'carbon',alive:true,position:point(3,4)};
assert.ok(endShiftEligible(friend,point(),'carbon'));assert.ok(endShiftEligible({...friend,kind:'trooper',autoTargetable:false},point(),'carbon'));
for(const extra of [{kind:'structure'},{kind:'orb'},{team:'ivory'},{alive:false},{position:point(3,4.01)}])assert.equal(endShiftEligible({...friend,...extra},point(),'carbon'),false);
assert.equal(endShiftEligible(friend,point(10),'carbon'),false);
const speed=new Set(),zone=new Set();for(let i=0;i<80;i++){const c=endShiftClock(i*.05);assert.equal(c.expired,false);speed.add(c.speedTick);zone.add(c.zoneTick);}
assert.equal(speed.size,16);assert.equal(zone.size,8);assert.ok(endShiftClock(4).expired);
console.log('PASS End Shift pure definition, 3D radius/friendly-role eligibility, separate 16 speed/8 zone clocks and exact four-second expiry');
await loadCharacter('odometer');
function fixture(effect=()=>({ok:false})) {
  const kit=structuredClone(odometerSlice);kit.abilities=kit.abilities.filter(x=>x.id!==a.id);kit.abilities.push({...a,fx:{color:'#73834e'}});
  const scene=new THREE.Scene(),controller=new PlayerController({position:point(),boxes:[],floorHeight:()=>0}),events=[];
  const r=new HeroRuntime({scene,controller,kit,source:'source',onEffect:event=>{events.push(event);return effect(event,r);}});
  return {r,controller,events,scene,kit};
}
for(const nonACK of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true}),Object.assign(()=>{}, {ok:true})]) {
  const {r,events,scene}=fixture(()=>nonACK);assert.ok(r.cast(4));
  r.aimHit=()=>assert.fail('locked inputs must not aim');const before=JSON.stringify(r.snapshot());
  for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(JSON.stringify(r.snapshot()),before);
  for(let i=0;i<9;i++){r.update(.05);assert.equal(events.length,0);}
  r.update(.05);assert.deepEqual(events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);assert.equal(r.castCount[a.id],1);near(r.cooldowns[4],22.5);
  const sequence=r.deploymentSequence;r.reset();assert.equal(r.deploymentSequence,sequence);r.dispose();assert.equal(scene.children.length,0);
}
{
  const {r,events}=fixture((event,r)=>{if(event.kind==='deployment-start'){assert.equal(r.deployments.length,1);r.update(.05);assert.equal(events.filter(e=>e.kind==='speed').length,0,'unacknowledged owner cannot pulse during start callback');}return {ok:false};});
  assert.ok(r.cast(4));for(let i=0;i<10;i++)r.update(.05);assert.equal(events.filter(e=>e.kind==='speed').length,0);r.dispose();
}
for(const mode of ['reset','dispose']) {
  const {r,events,scene}=fixture((event,r)=>{if(event.kind==='deployment-start')r[mode]();return {ok:false};});
  assert.ok(r.cast(4));for(let i=0;i<10;i++)r.update(.05);assert.deepEqual(events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);r.dispose();assert.equal(scene.children.length,0);
}
for(const primary of [Object.freeze(new Error('primary')),undefined,Symbol('primary')]) {
  const secondary=Object.freeze(new Error('cleanup'));
  const {r}=fixture(event=>{if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;return {ok:false};});
  assert.ok(r.cast(4));for(let i=0;i<9;i++)r.update(.05);let threw=false,caught;
  try{r.update(.05);}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(r.deployments.length,0);r.dispose();
}
console.log('PASS End Shift negative ACK: no grants, exact windup/no-cost lock, unpublished-ACK reentry blocked, identity cleanup and frozen/primitive primary + secondary preservation');

// Run --pure while the concurrent Host lane is incomplete; default requires it.
if(!process.argv.includes('--pure')) {
  function hostFixture() {
    const s=createSystems();s.step(30);
    const source=s.addHero({id:'source',team:'carbon',position:point()}),ally=s.addHero({id:'ally',team:'carbon',position:point(2)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(3)});
    const f=fixture(event=>s.applyHeroEffect(event));assert.ok(s.configureHeroKit(source.id,f.kit,{partialSlice:true}).ok);
    f.r.targets=[ally,enemy,source];
    const step=()=>{assert.ok(s.step(.05).ok);f.r.update(.05);};
    return {...f,s,source,ally,enemy,step};
  }
  for(const mode of ['before-activation','friendly-callback']) {
    const f=hostFixture(),{r,s,source,ally,enemy,controller,events}=f,real=r.onEffect;
    // Game builds detached position descriptors before controller movement.
    const selfView=Object.freeze({...source,position:Object.freeze({...source.position})});
    r.targets=[ally,enemy,selfView];const hp=[source.hp,ally.hp,enemy.hp];let moved=false;
    const move=()=>{controller.warp(point(10));assert.ok(s.moveHero(source.id,controller.position).ok);moved=true;};
    r.onEffect=event=>{const result=real(event);if(mode==='friendly-callback'&&event.kind==='speed'&&event.target===ally.id&&!moved){assert.ok(result.ok);move();}return result;};
    assert.ok(r.cast(4));for(let i=0;i<9;i++)f.step();if(mode==='before-activation')move();f.step();
    assert.ok(moved);near(s.stats(source.id).moveSpeed,10.8);
    const selfEvents=events.filter(e=>e.kind==='speed'&&e.target===source.id);
    assert.equal(selfEvents.length,1,'self is neither omitted nor duplicated by its stale descriptor');assert.deepEqual(selfEvents[0].origin,point(10));
    const field=r.deployments[0];assert.equal(field.speedCounts.get(source.id),1);assert.deepEqual(field.position.toArray(),[10,0,0]);assert.deepEqual(field.handle.position.toArray(),[10,0,0]);
    assert.deepEqual(selfView.position,point());assert.deepEqual([source.hp,ally.hp,enemy.hp],hp);
    r.dispose();assert.equal(f.scene.children.length,0);
  }
  console.log('PASS End Shift stale Game self-position copy: pre-activation and friendly-callback warps use current feet, real Host self speed once, no descriptor or HP mutation');
  {
    const f=hostFixture(),{r,s,source,ally,enemy,events}=f,hp=[source.hp,ally.hp,enemy.hp];
    assert.ok(r.cast(4));for(let i=0;i<9;i++){f.step();assert.equal(s.stats(source.id).invulnerable,false);}
    f.step();const field=r.deployments[0];assert.ok(field);near(field.left,4);near(field.age,0);
    near(s.stats(source.id).moveSpeed,10.8);near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(enemy.id).moveSpeed,8);
    assert.ok(s.stats(source.id).invulnerable);assert.equal(s.stats(ally.id).invulnerable,false);
    assert.equal(events.filter(e=>e.kind==='speed').length,2);
    for(let i=0;i<8;i++)f.step();assert.ok(s.stats(source.id).invulnerable);f.step();assert.equal(s.stats(source.id).invulnerable,false);f.step();
    for(let i=10;i<79;i++)f.step();assert.ok(r.deployments.includes(field));near(field.left,.05);f.step();assert.equal(r.deployments.length,0);assert.equal(field.speedCounts.get(source.id),16);assert.equal(field.speedCounts.get(ally.id),16);assert.equal(field.zoneCounts.get(source.id),8);assert.equal(events.filter(e=>e.kind==='speed').length,32);
    near(s.stats(ally.id).moveSpeed,10.8);for(let i=0;i<11;i++)f.step();near(s.stats(ally.id).moveSpeed,8);
    assert.deepEqual([source.hp,ally.hp,enemy.hp],hp);r.dispose();assert.equal(f.scene.children.length,0);
  }
  {
    const f=hostFixture(),{r,s,source,ally,controller}=f;assert.ok(r.cast(4));for(let i=0;i<10;i++)f.step();const field=r.deployments[0];
    assert.ok(s.moveHero(source.id,point(10)).ok);controller.warp(point(10));f.step();assert.deepEqual(field.position.toArray(),[10,0,0]);assert.deepEqual(field.handle.position.toArray(),[10,0,0]);
    for(let i=0;i<5;i++)f.step();assert.equal(field.speedCounts.get(ally.id),1);
    assert.ok(s.moveHero(ally.id,point(11)).ok);for(let i=0;i<5;i++)f.step();assert.equal(field.speedCounts.get(ally.id),2);
    r.reset();assert.equal(s.stats(source.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,10.8);for(let i=0;i<16;i++)f.step();near(s.stats(ally.id).moveSpeed,8);r.dispose();
  }
  for(const mode of ['reset','dispose']) {
    const f=hostFixture(),{r,s,source,ally}=f,real=r.onEffect;let entered=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!entered){entered=true;assert.ok(result.ok);r[mode]();}return result;};
    assert.ok(r.cast(4));for(let i=0;i<10;i++)f.step();assert.ok(entered);assert.equal(r.deployments.length,0);assert.equal(f.events.filter(e=>e.kind==='speed').length,1);near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(source.id).moveSpeed,8);assert.equal(s.stats(source.id).invulnerable,false);r.dispose();
  }
  for(const mode of ['lost-ack','nack','throw']) {
    const f=hostFixture(),{r,s,ally}=f,real=r.onEffect,error=Object.freeze(new Error('speed callback'));let field;
    r.onEffect=event=>{
      if(event.kind!=='speed')return real(event);
      field=r.deployments[0];
      if(mode==='nack')return {ok:false};
      const result=real(event);assert.ok(result.ok);
      if(mode==='throw')throw error;
      return undefined;
    };
    assert.ok(r.cast(4));for(let i=0;i<9;i++)f.step();
    if(mode==='throw')assert.throws(()=>f.step(),e=>e===error);else f.step();
    assert.equal(field.speedCounts.size,0);near(s.stats(ally.id).moveSpeed,mode==='nack'?8:10.8);r.onEffect=real;r.dispose();
  }
  for(const mode of ['reset','dispose','replace','lost-ack']) {
    const f=hostFixture(),{r,s,source}=f,real=r.onEffect;let entered=false,old;
    r.onEffect=event=>{
      const result=real(event);
      if(event.kind==='deployment-start'&&!entered){
        entered=true;assert.ok(result.ok);assert.ok(s.stats(source.id).invulnerable);old=r.deployments[0];
        if(mode==='lost-ack')return undefined;
        if(mode==='dispose')r.dispose();else r.reset();
        if(mode==='replace')assert.ok(r.cast(4));
      }
      return result;
    };
    assert.ok(r.cast(4));for(let i=0;i<10;i++)f.step();
    assert.equal(r.deployments.length,0);assert.equal(s.stats(source.id).invulnerable,false);assert.equal(f.events.filter(e=>e.kind==='speed').length,0);
    if(mode==='replace'){
      near(r.pendingCast.left,.5);for(let i=0;i<10;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);
      assert.equal(r.removeDeployment(old),false);assert.ok(s.stats(source.id).invulnerable);near(fresh.age,0);
    }
    r.dispose();assert.equal(f.scene.children.length,0);
  }
  for(const primary of [Object.freeze(new Error('primary')),undefined]) {
    const f=hostFixture(),{r,s,source}=f,real=r.onEffect,secondary=Symbol('cleanup');
    r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;return result;};
    assert.ok(r.cast(4));for(let i=0;i<9;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
    assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(s.stats(source.id).invulnerable,false);assert.equal(r.deployments.length,0);r.onEffect=real;r.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,ally}=f;assert.ok(r.cast(4));for(let i=0;i<10;i++)f.step();
    assert.ok(r.cast(1));f.step();f.step();near(s.stats(source.id).moveSpeed,13.6);near(s.stats(ally.id).moveSpeed,10.8);
    for(let i=0;i<41;i++)f.step();near(s.stats(source.id).moveSpeed,10.8);r.dispose();
  }
  console.log('PASS End Shift actual Host: initial pulse/birth isolation, caster-only opening, 16 independent friendly speed applications/8 zone ticks, no HP, moving center, linger/expiry, callback reset/disposal, start replacement/stale cleanup, primary+secondary faults, Fast Lane maximum and NACK/lost-ACK/throw reservation rollback');
}
console.log('LIMIT: CPU protocol/scene checks, not native input, supplied FX art, balance or full geometry/network authority.');
