// CPU swept-box checks and negative Runtime admission. No fake positive Host ACK.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { FLYING_DIGITS as a, isFlyingDigits, flyingDigitDirections, segmentBoxFraction, flyingDigitStep } from './flying-digits.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { PlayerController } from './player-controller.mjs';
import { loadCharacter } from '../character-assets.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { createSystems } from '../systems.mjs';

const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-9,`${x} != ${y}`);
const point=(x=0,y=1,z=0)=>({x,y,z});
const directions=flyingDigitDirections(point(0,0,-1));
for(const [i,d] of directions.entries()) {
  near(Math.hypot(d.x,d.y,d.z),1);near(Math.atan2(-d.x,-d.z)*180/Math.PI,-14+i*28/3);
}
for(const d of flyingDigitDirections(point(3,4,0))){near(Math.hypot(d.x,d.y,d.z),1);near(d.y,.8);}
assert.throws(()=>flyingDigitDirections(point(0,0,0)),RangeError);
assert.ok(isFlyingDigits(a));for(const key of Object.keys(a))assert.equal(isFlyingDigits({...a,[key]:null}),false,key);
const wall={minX:-1,maxX:1,minY:0,maxY:2,minZ:-1.01,maxZ:-1};
near(segmentBoxFraction(point(),point(0,1,-2),wall,.2),.4);
assert.equal(segmentBoxFraction(point(2),point(2,1,-2),wall,.2),null);
near(segmentBoxFraction(point(0,1,-1),point(0,1,-2),wall,.2),0);
near(segmentBoxFraction(point(1.2,2.2,0),point(1.2,2.2,-2),wall,.2),.4); // Conservative corner.
assert.equal(segmentBoxFraction(point(),point(),wall,.2),null);
const target={id:'enemy',team:'ivory',position:point(0,0,-1.5),alive:true};
const bullet=()=>({definition:a,position:point(),direction:point(0,0,-1),travelled:0});
let step=flyingDigitStep(bullet(),.05,[],[],'carbon');near(step.travelled,2);near(step.position.z,-2);assert.equal(step.done,false);
step=flyingDigitStep(bullet(),.05,[wall],[target],'carbon');assert.equal(step.contact.target,target);near(step.position.z,-.7);
step=flyingDigitStep(bullet(),.05,[wall],[{...target,position:point(0,0,-3)}],'carbon');assert.equal(step.contact.wall,wall);near(step.position.z,-.8);
for(const extra of [{alive:false},{team:'carbon'}])assert.equal(flyingDigitStep(bullet(),.05,[],[{...target,...extra}],'carbon').contact,null);
assert.equal(flyingDigitStep(bullet(),.05,[],[{...target,autoTargetable:false}],'carbon').contact.target.id,'enemy','manual projectiles do not acquire cloak immunity');
const tie={...target,position:point(0,0,-1.6)};
assert.equal(flyingDigitStep(bullet(),.05,[wall],[tie],'carbon').contact.wall,wall);
const structure={id:'structure',team:'ivory',radius:3,height:12,position:point(0,0,-5)};
assert.equal(flyingDigitStep({...bullet(),position:point(0,11,0)},.05,[],[structure],'carbon').contact.target,structure);
for(const direction of directions) {
  const p={...bullet(),direction};
  for(let i=0;i<13;i++){step=flyingDigitStep(p,.05,[],[],'carbon');Object.assign(p,step);assert.ok(p.travelled<=25);}
  near(p.travelled,25);near(Math.hypot(p.position.x,p.position.y-1,p.position.z),25);assert.ok(step.done);
}
console.log('PASS Flying Digits pure math: fan, normalized pitch, swept thin cover/targets, earliest contact/tie, conservative corners, manual eligibility, structure bounds, 2m step and 25m cap');

await loadCharacter('odometer');
function fixture(onEffect=()=>({ok:false})) {
  const kit=structuredClone(odometerSlice);
  kit.abilities=kit.abilities.filter(x=>x.id!=='flyingdigits');kit.abilities.push({...a,fx:{color:'#73834e'}});
  const scene=new THREE.Scene(),controller=new PlayerController({position:point(0,0,8),boxes:[],floorHeight:()=>0}),events=[];
  const r=new HeroRuntime({scene,controller,kit,onEffect:event=>{events.push(event);return onEffect(event,r);}});
  return {r,scene,events};
}
for(const nonACK of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true}),Object.assign(()=>{}, {ok:true})]) {
  const {r,scene,events}=fixture(()=>nonACK);assert.ok(r.cast(3));
  for(let i=0;i<4;i++){r.update(.05);assert.equal(events.length,0);assert.equal(r.projectiles.length,0);}
  r.update(.05);assert.deepEqual(events.map(e=>e.kind),['burst-start','burst-end']);assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.equal(r.fx.count,0);
  assert.equal(r.castCount.flyingdigits,1);near(r.cooldowns[3],7.75);const sequence=r.burstSequence;r.reset();assert.equal(r.burstSequence,sequence);
  r.dispose();assert.equal(scene.children.length,0);
}
for(const slot of [1,3]) {
  const {r,scene}=fixture();assert.ok(r.cast(slot));
  const before=JSON.stringify([r.snapshot(),r.time,r.ammo,r.fx.count,r.acceptedAction]);
  r.aimHit=()=>assert.fail('pending ability must reject before aim');
  for(const other of [1,2,3,4])assert.equal(r.cast(other),false);
  assert.equal(JSON.stringify([r.snapshot(),r.time,r.ammo,r.fx.count,r.acceptedAction]),before);
  r.reset();assert.equal(r.pendingCast,null);r.dispose();assert.equal(scene.children.length,0);
}
for(const mode of ['reset','dispose','throw']) {
  const error=new Error('start callback failed');let pending;
  const {r,scene,events}=fixture((event,r)=>{
    if(event.kind==='burst-start') {
      pending=r.bursts.get(event.burstId);assert.ok(pending,'pending owner published before callback');
      if(mode==='throw')throw error;
      r[mode]();
    }
    return {ok:false};
  });
  assert.ok(r.cast(3));for(let i=0;i<4;i++)r.update(.05);
  if(mode==='throw')assert.throws(()=>r.update(.05),e=>e===error);else r.update(.05);
  assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.equal(r.endBurst(pending),false);
  assert.deepEqual(events.map(e=>e.kind),['burst-start','burst-end']);
  r.dispose();assert.equal(scene.children.length,0);assert.equal(r.cast(3),false);
}
console.log('PASS Flying Digits negative Runtime: exact windup, single pending no-cost lock, no shots on NACK/non-ACK, pending owner visibility, reset/dispose/throw cleanup, stale end and persistent sequence');

// Actual Host/profile integration: no stub ACK, HP grant, or cooldown mutation.
function hostFixture() {
  const sim=createSystems();sim.step(30);
  const source=sim.addHero({id:'player',team:'carbon',position:point(0,0,8)});
  const enemy=sim.addHero({id:'enemy',team:'ivory',position:point(.55,0,6.6)});
  const f=fixture(event=>sim.applyHeroEffect(event));
  assert.ok(sim.configureHeroKit(source.id,f.r.kit,{partialSlice:true}).ok,'actual partial Host must admit both slots');
  f.r.targets=[enemy];
  return {...f,sim,source,enemy,step:()=>{assert.ok(sim.step(.05).ok);f.r.update(.05);}};
}
{
  const f=hostFixture(),{r,enemy,events}=f,hp=enemy.hp;
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();
  assert.equal(r.projectiles.length,4);assert.ok(r.projectiles.every(p=>p.travelled===0));
  f.step();near(hp-enemy.hp,32.4);assert.equal(events.filter(e=>e.kind==='damage').length,2);
  assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);r.dispose();
}
for(const mode of ['reset','dispose','reenter']) {
  const f=hostFixture(),{r,enemy}=f,hp=enemy.hp,real=r.onEffect;let entered=false,old;
  r.onEffect=event=>{
    const result=real(event);
    if(event.kind==='damage'&&!entered){entered=true;old=r.bursts.get(event.burstId);assert.ok(result.ok);if(mode==='reenter')r.update(.05);else r[mode]();}
    return result;
  };
  assert.ok(r.cast(3));for(let i=0;i<6;i++)f.step();
  near(hp-enemy.hp,mode==='reenter'?32.4:16.2);assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.equal(r.endBurst(old),false);
  r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=hostFixture(),{r,events}=f;r.targets=[];r.setModifiers({cooldown:.01});
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const old=[...r.bursts.values()][0];
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();assert.equal(r.bursts.size,2);assert.equal(r.projectiles.length,8);
  const fresh=[...r.bursts.values()][1];assert.ok(fresh.burstId>old.burstId);assert.notEqual(fresh.counts,old.counts);
  assert.ok(r.endBurst(old));assert.equal(r.endBurst(old),false);assert.equal(r.bursts.get(fresh.burstId),fresh);assert.equal(r.projectiles.length,4);
  r.reset();assert.equal(r.bursts.size,0);assert.equal(events.filter(e=>e.kind==='burst-end').length,2);assert.equal(r.burstSequence,fresh.burstId);r.dispose();
}
for(const mode of ['reset','dispose','replace','lost-ack']) {
  const f=hostFixture(),{r,events,sim}=f,real=r.onEffect;let entered=false,old;
  r.onEffect=event=>{
    const result=real(event);
    if(event.kind==='burst-start'&&!entered){
      entered=true;assert.ok(result.ok);old=r.bursts.get(event.burstId);
      if(mode==='lost-ack')return undefined;
      if(mode==='dispose')r.dispose();else r.reset();
      if(mode==='replace')assert.ok(r.cast(3));
    }
    return result;
  };
  assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();
  assert.equal(r.projectiles.length,0);assert.equal(r.endBurst(old),false);
  const start=events.find(e=>e.kind==='burst-start');
  assert.equal(sim.applyHeroEffect({...start,kind:'damage',target:f.enemy.id,projectileIndex:0,origin:point(.55,1,6.6)}).ok,false,'cancelled/lost ACK closes the real Host receipt');
  if(mode==='replace'){
    near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();assert.equal(r.projectiles.length,4);
    assert.ok(r.projectiles.every(p=>p.travelled===0&&p.burstId>old.burstId));
  }
  r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('PASS Flying Digits actual Host: four ACK-gated unadvanced births, two armored HP hits, damage callback reset/dispose/reentry, cancelled siblings, stale owner end, overlapping receipts, start callback reset/dispose/replacement/lost ACK and reset cleanup');
// Negative fault injection only: real Host first, then arbitrary thrown tokens.
// Pruning siblings below isolates last-contact teardown, not normal flight proof.
const faultFailures=[];
for(const phase of ['start','last-contact'])for(const primary of [Object.freeze(new Error('frozen primary')),undefined,null,0,-0,NaN,1n,'primary',Symbol('primary'),Object.freeze({token:true}),()=>{}]) {
  const f=hostFixture(),{r,enemy}=f,real=r.onEffect,hp=enemy.hp,secondary=Object.freeze(new Error('secondary cleanup'));
  r.onEffect=event=>{
    const result=real(event);assert.ok(result.ok,`${event.kind}: real Host acceptance before injected fault`);
    if(event.kind===(phase==='start'?'burst-start':'damage'))throw primary;
    if(event.kind==='burst-end')throw secondary;
    return result;
  };
  assert.ok(r.cast(3));for(let i=0;i<4;i++)f.step();
  if(phase==='last-contact'){
    f.step();assert.equal(r.projectiles.length,4);
    for(const p of r.projectiles.splice(0,3))p.handle.dispose();
  }
  let threw=false,caught;
  try{f.step();}catch(error){threw=true;caught=error;}
  if(!threw||!Object.is(caught,primary))faultFailures.push(`${phase}/${String(primary)}: primary replaced or swallowed`);
  if(r.lastBurstCleanupError?.error!==secondary||r.lastBurstCleanupError.burstId!==f.events[0].burstId)faultFailures.push(`${phase}/${String(primary)}: secondary missing`);
  assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);
  near(hp-enemy.hp,phase==='start'?0:16.2); // Committed HP is not rolled back.
  r.onEffect=real;r.dispose();assert.equal(f.scene.children.length,0);
}
assert.deepEqual(faultFailures,[]);
for(const phase of ['start','last-contact']) {
  const f=hostFixture(),{r}=f,real=r.onEffect,secondary=Object.freeze(new Error('cleanup alone'));
  r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='burst-end')throw secondary;return event.kind==='burst-start'&&phase==='start'?undefined:result;};
  assert.ok(r.cast(3));for(let i=0;i<4;i++)f.step();
  if(phase==='last-contact'){f.step();for(const p of r.projectiles.splice(0,3))p.handle.dispose();}
  let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.equal(caught,secondary);assert.equal(r.bursts.size,0);r.onEffect=real;r.dispose();
}
console.log('PASS negative burst faults: frozen Error/object, undefined/null, numbers including NaN/-0, bigint/string/symbol/function primary identity; bounded secondary record, cleanup-alone propagation and committed HP retained at start/last contact');
console.log('LIMIT: CPU standard expanded-AABB integration only; no native/rendering, exact rounded geometry or full Host trajectory/LOS security acceptance.');
