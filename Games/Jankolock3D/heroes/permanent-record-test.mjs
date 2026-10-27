// CPU actual model/Host/normal-clock evidence, not native/render/control-immunity proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {PERMANENT_RECORD as a,isPermanentRecord,permanentRecordClock,permanentRecordEligible} from './permanent-record.mjs';
import {laminateSlice} from './laminate-slice.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {createSystems} from '../systems.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.ok(isPermanentRecord(a));for(const key of Object.keys(a))assert.equal(isPermanentRecord({...a,[key]:null}),false,key);
const friend={id:'friend',kind:'hero',team:'carbon',position:point(9),alive:true};assert.ok(permanentRecordEligible(friend,point(),'carbon'));assert.ok(permanentRecordEligible({...friend,alive:false,living:true},point(),'carbon'));
for(const extra of [{kind:'structure'},{kind:'orb'},{kind:undefined},{team:'ivory'},{alive:false},{position:point(9,.1)}])assert.equal(permanentRecordEligible({...friend,...extra},point(),'carbon'),false);
const pulses=new Set();for(let i=0;i<80;i++){const clock=permanentRecordClock(i*.05);assert.equal(clock.expired,false);pulses.add(clock.pulseIndex);assert.equal(clock.bright,i%20<5);}assert.deepEqual([...pulses],[0,1,2,3]);assert.ok(permanentRecordClock(4).expired);
console.log('PASS Permanent Record pure baseline/typed friendly radius9, four global pulse indices and four separate .25 feedback windows');
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];
await loadCharacter('laminate');await loadCharacter(native.id);
function fixture(effect=()=>({ok:false})) {
  const kit=structuredClone(laminateSlice);kit.abilities=kit.abilities.filter(x=>x.id!==a.id);kit.abilities.push({...a,fx:{color:'#3f7f6f'}});
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:point(0,0,8),boxes,floorHeight:()=>0}),events=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:'source',onEffect:event=>{events.push(event);return effect(event,r);}});return {kit,scene,boxes,c,r,events};
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(()=>ack),{r,events}=f;r.aimHit=()=>assert.fail('self ward must not aim');assert.ok(r.cast(4));for(let i=0;i<11;i++){r.update(.05);assert.equal(events.length,0);}r.update(.05);
  assert.deepEqual(events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);near(r.cooldowns[4],24.4);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=fixture((event,r)=>{if(event.kind==='deployment-start')r.update(.05);return {ok:false};});f.r.targets=[friend];assert.ok(f.r.cast(4));for(let i=0;i<12;i++)f.r.update(.05);assert.equal(f.events.filter(e=>e.kind==='ward').length,0);f.r.dispose();
}
for(const primary of [Object.freeze(new Error('start failure')),undefined]) {
  const secondary=Symbol('cleanup'),f=fixture(event=>{if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;});assert.ok(f.r.cast(4));for(let i=0;i<11;i++)f.r.update(.05);let threw=false,caught;try{f.r.update(.05);}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(f.r.lastFieldCleanupError.error,secondary);assert.equal(f.r.deployments.length,0);f.r.dispose();
}
console.log('PASS Permanent Record negative start ACK/reentry gate, .6 windup/25 CD and frozen/primitive primary plus bounded secondary failure');
if(!process.argv.includes('--pure')) {
  function hostFixture() {
    const s=createSystems();s.step(30);const source=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(.55,0,0)});
    const f=fixture(event=>s.applyHeroEffect(event));assert.ok(s.configureHeroKit(source.id,f.kit,{partialSlice:true}).ok);assert.ok(s.configureHeroKit(enemy.id,native).ok);
    f.r.targets=[ally,ally,enemy,{...source,position:{...source.position}}];
    const ec=new PlayerController({position:enemy.position,boxes:f.boxes,floorHeight:()=>0});ec.yaw=Math.PI;const shots=[];
    const guard=new HeroRuntime({scene:f.scene,controller:ec,kit:native,source:enemy.id,team:'ivory',onEffect:event=>{const result=s.applyHeroEffect(event);shots.push(result);return result;}});guard.targets=[source];
    const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input){f.c.speedMultiplier=s.stats(source.id).moveSpeed/8;f.c.update(.05,input);assert.ok(s.moveHero(source.id,f.c.position).ok);}f.r.update(.05);guard.update(.05);};
    const dispose=()=>{f.r.dispose();guard.dispose();assert.equal(f.scene.children.length,0);};return {...f,s,source,ally,enemy,guard,shots,step,dispose};
  }
  {
    const f=hostFixture(),{r,s,source,ally,enemy,guard,shots,events}=f,ammo=r.ammo,cloak=source.cloakUntil;let hp=source.hp;
    assert.ok(r.cast(4));assert.equal(r.pendingCast.definition.id,'permanentrecord');assert.ok(guard.fire());assert.ok(source.hp<hp,'native shot hurts during vulnerable windup');
    for(let i=0;i<11;i++){f.step();assert.equal(r.deployments.length,0);assert.equal(s.stats(source.id).invulnerable,false);}f.step();const field=r.deployments[0];near(field.age,0);near(field.left,4);assert.equal(field.handle.group.children.length,1);
    const marker=field.handle.group.children[0];marker.geometry.computeBoundingBox();near(marker.geometry.boundingBox.max.x*marker.scale.x,9);assert.deepEqual(marker.scale.toArray(),[9,9,1]);
    for(let pulse=0;pulse<4;pulse++) {
      assert.equal(field.pulseIndex,pulse);assert.equal(marker.material.opacity,1);assert.ok(s.stats(source.id).invulnerable);assert.ok(s.stats(ally.id).invulnerable);assert.equal(s.stats(enemy.id).invulnerable,false);near(s.stats(source.id).moveSpeed,8);
      hp=source.hp;assert.ok(guard.fire());assert.equal(shots.at(-1).reason,'invulnerable');assert.equal(source.hp,hp);
      for(let i=0;i<5;i++)f.step();assert.equal(s.stats(source.id).invulnerable,false);assert.equal(s.stats(ally.id).invulnerable,false);assert.equal(marker.material.opacity,.2);assert.ok(guard.fire());assert.ok(shots.at(-1).ok);near(hp-source.hp,20*(1-s.stats(source.id).armor));
      for(let i=0;i<15;i++)f.step();
    }
    assert.equal(r.deployments.length,0);assert.equal(s.stats(source.id).invulnerable,false);assert.deepEqual([...field.wardApplications.get(source.id)],[0,1,2,3]);assert.deepEqual([...field.wardApplications.get(ally.id)],[0,1,2,3]);
    assert.equal(events.filter(e=>e.kind==='ward').length,8,'duplicate views cannot grant extra shields');assert.equal(events.filter(e=>e.kind==='ward'&&e.pulseIndex===4).length,0);assert.equal(r.ammo,ammo);assert.equal(source.cloakUntil,cloak);assert.equal(source.souls,0);assert.equal(source.earnedSouls,0);f.dispose();
  }
  {
    const f=hostFixture(),{r,s,ally}=f;assert.ok(s.moveHero(ally.id,point(20,0,8)).ok);assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();
    for(let i=0;i<10;i++)f.step();assert.ok(s.moveHero(ally.id,point(2,0,8)).ok);f.step();assert.equal(s.stats(ally.id).invulnerable,false);assert.equal(r.deployments[0].wardApplications.get(ally.id),undefined);
    for(let i=0;i<9;i++)f.step();assert.ok(s.stats(ally.id).invulnerable);assert.deepEqual([...r.deployments[0].wardApplications.get(ally.id)],[1]);
    assert.ok(s.moveHero(ally.id,point(20,0,8)).ok);for(let i=0;i<6;i++)f.step();assert.ok(s.moveHero(ally.id,point(2,0,8)).ok);f.step();assert.equal(s.stats(ally.id).invulnerable,false,'entry does not add a pulse');f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,ally,c}=f,real=r.onEffect;let moved=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='ward'&&!moved){moved=true;assert.ok(result.ok);c.warp(point(100,0,8));assert.ok(s.moveHero(source.id,c.position).ok);}return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();const field=r.deployments[0];assert.ok(s.stats(source.id).invulnerable);assert.deepEqual(field.position.toArray(),[100,0,8]);assert.deepEqual(field.handle.position.toArray(),[100,0,8]);assert.equal(f.events.filter(e=>e.kind==='ward'&&e.target===source.id).length,1);
    for(let i=0;i<20;i++)f.step();assert.ok(s.stats(source.id).invulnerable);assert.equal(s.stats(ally.id).invulnerable,false);assert.deepEqual([...field.wardApplications.get(ally.id)],[0]);f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,c,boxes}=f,wall={minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5};boxes.push(wall);assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();
    for(let i=0;i<30;i++)f.step({forward:1});assert.ok(c.position.z<8&&c.position.z>=5.45-1e-6);near(s.stats(source.id).moveSpeed,8);assert.equal(boxes[0],wall);f.dispose();
  }
  for(const mode of ['reset','dispose']) {
    const f=hostFixture(),{r,s,source,ally}=f,real=r.onEffect;let entered=false;r.onEffect=event=>{const result=real(event);if(event.kind==='ward'&&!entered){entered=true;assert.ok(result.ok);r[mode]();}return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();assert.ok(entered);assert.equal(r.deployments.length,0);assert.ok(s.stats(ally.id).invulnerable);assert.equal(s.stats(source.id).invulnerable,false);assert.equal(f.events.filter(e=>e.kind==='ward').length,1);
    for(let i=0;i<6;i++)f.step();assert.equal(s.stats(ally.id).invulnerable,false);f.dispose();
  }
  for(const mode of ['nack','lost-ack']) {
    const f=hostFixture(),{r}=f,real=r.onEffect;let accepted=0,attempts=0;r.onEffect=event=>{if(event.kind==='ward')attempts++;if(event.kind==='ward'&&mode==='nack')return {ok:false};const result=real(event);if(event.kind==='ward'){if(result.ok)accepted++;return undefined;}return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();const field=r.deployments[0];for(let i=0;i<80;i++)f.step();assert.equal(field.wardApplications.size,0);assert.equal(accepted,mode==='nack'?0:8);assert.equal(attempts,8,'NACK cannot retry between global pulses');assert.equal(f.events.filter(e=>e.kind==='ward').length,mode==='nack'?0:8,'only forwarded attempts reach actual Host');f.dispose();
  }
  for(const mode of ['reset','dispose','replace','lost-ack']) {
    const f=hostFixture(),{r}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];if(mode==='lost-ack')return undefined;if(mode==='dispose')r.dispose();else r.reset();if(mode==='replace')assert.ok(r.cast(4));}return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();assert.equal(r.deployments.length,0);assert.equal(f.events.filter(e=>e.kind==='ward').length,0);
    if(mode==='replace'){near(r.pendingCast.left,.6);for(let i=0;i<12;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);}
    f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();const old=r.deployments[0];
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();const fresh=r.deployments[0];assert.notEqual(fresh,old);assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(old.handle.remaining,0);near(fresh.age,0);assert.deepEqual([...fresh.wardApplications.get(source.id)],[0]);assert.equal(r.removeDeployment(old),false);assert.equal(r.deployments[0],fresh);assert.ok(s.stats(source.id).invulnerable);f.dispose();
  }
  {
    const f=hostFixture(),{r}=f,real=r.onEffect;let nested=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='ward'&&!nested){nested=true;r.update(0);}return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();assert.ok(nested);assert.equal(f.events.filter(e=>e.kind==='ward').length,2,'reserved global pulse prevents zero-time callback replay');f.dispose();
  }
  for(const primary of [Object.freeze(new Error('committed ward')),undefined]) {
    const f=hostFixture(),{r,s,ally}=f,real=r.onEffect,secondary=Symbol('cleanup');let owner;
    r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='ward'){owner=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};
    assert.ok(r.cast(4));for(let i=0;i<11;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
    assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(owner.wardApplications.size,0);assert.equal(r.deployments.length,0);assert.ok(s.stats(ally.id).invulnerable);r.onEffect=real;f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,enemy}=f;assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();for(let i=0;i<6;i++)f.step();assert.ok(s.damage(source.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();assert.equal(r.deployments.length,0);f.dispose();const before=JSON.stringify(r.snapshot());assert.equal(r.cast(4),false);r.update(.05);assert.equal(JSON.stringify(r.snapshot()),before);
  }
  {
    const f=hostFixture(),{r,s,source}=f;assert.ok(r.cast(3));f.step();f.step();assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();near(s.stats(source.id).moveSpeed,11.2);assert.ok(s.stats(source.id).invulnerable);r.removeDeployment(r.deployments[0]);assert.ok(s.stats(source.id).invulnerable,'accepted ward remains after owner end');for(let i=0;i<6;i++)f.step();assert.equal(s.stats(source.id).invulnerable,false);near(s.stats(source.id).moveSpeed,11.2);f.dispose();
  }
  console.log('PASS Permanent Record actual Host/native shots: four global .25 shields, full damage between/no percentage DR, no t4 pulse, late entry/no reentry grant, dedup/current-self/moving center, fixed radius feedback/collision, committed tails, Sprint coexistence, NACK/lost-ACK, replacement/stale cleanup, frozen errors/death/closed');
}
console.log('LIMIT: CPU normal-clock/API fixtures, not native frames, supplied art, percentage mitigation, control immunity or full network/cadence security acceptance.');
