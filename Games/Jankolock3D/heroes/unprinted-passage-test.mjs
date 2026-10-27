// CPU exact route geometry/FX and real Host mechanics; not native/art acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {UNPRINTED_PASSAGE as a,isUnprintedPassage,passageDirection,passageCenters,passageZoneIndex,passageClock} from './unprinted-passage.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {AbilityFX} from './hero-visuals.mjs';
import {PlayerController} from './player-controller.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {createSystems} from '../systems.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
assert.ok(isUnprintedPassage(a));for(const key of Object.keys(a))assert.equal(isUnprintedPassage({...a,[key]:null}),false,key);
for(const yaw of [0,Math.PI/2,.7]) {
  const d=passageDirection(yaw),origin=point(5,2,8),centers=passageCenters(origin,d,()=>2);assert.equal(centers.length,6);near(Math.hypot(d.x,d.z),1);assert.equal(d.y,0);
  centers.forEach((c,i)=>{near(Math.hypot(c.x-origin.x,c.z-origin.z),i*3);assert.equal(c.y,2);});
  assert.equal(passageZoneIndex(centers[1],centers),0,'first covering zone, not six separate applications');
}
assert.equal(passageCenters(point(0,4),passageDirection(0),()=>NaN)[5].y,4);
const effects=new Set(),zones=new Set();for(let i=0;i<100;i++){const clock=passageClock(i*.05);assert.equal(clock.expired,false);effects.add(clock.effectTick);zones.add(clock.zoneTick);}assert.equal(effects.size,20);assert.equal(zones.size,10);assert.ok(passageClock(5).expired);
{
  const scene=new THREE.Scene(),fx=new AbilityFX(scene),origin=new THREE.Vector3(5,2,8),centers=passageCenters(origin,passageDirection(.7),()=>2);
  const h=fx.emit('passage',{origin,targets:centers,radius:3,duration:5.1});assert.equal(h.group.children.length,6);
  for(const [i,circle] of h.group.children.entries()) {
    const p=circle.getWorldPosition(new THREE.Vector3());near(p.x,centers[i].x);near(p.y,centers[i].y+.025);near(p.z,centers[i].z);
    const attribute=circle.geometry.attributes.position;let radius=0;for(let j=0;j<attribute.count;j++)radius=Math.max(radius,Math.hypot(attribute.getX(j)*circle.scale.x,attribute.getY(j)*circle.scale.y));near(radius,3);
    const bounds=new THREE.Box3().setFromObject(circle);near(bounds.max.x-bounds.min.x,6);near(bounds.max.z-bounds.min.z,6);
  }
  h.dispose();assert.equal(scene.children.length,0);fx.dispose();
}
console.log('PASS Passage pure: six 3m-spaced centers/15m route, unit yaw, first-cover union, 20/10 clocks and six authored local circle primitives with exact 3m outer radius');
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];
await loadCharacter('whitespace');await loadCharacter(native.id);
function fixture(effect=()=>({ok:false})) {
  const kit=structuredClone(whitespaceSlice);kit.abilities=kit.abilities.filter(x=>x.id!==a.id);kit.abilities.push({...a,fx:{color:'#6c8589'}});
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:point(0,0,8),boxes,floorHeight:()=>0}),events=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:'source',onEffect:event=>{events.push(event);return effect(event,r);}});
  return {kit,scene,boxes,c,r,events};
}
{
  const f=fixture(),{r,boxes}=f;boxes.push({minX:-3,maxX:3,minY:0,maxY:4,minZ:0,maxZ:1});
  r.aimHit=()=>assert.fail('route preflight must not use damaging aim');const before=JSON.stringify(r.snapshot());assert.equal(r.cast(4),false);assert.equal(JSON.stringify(r.snapshot()),before);assert.equal(r.lastPlacementFailure.reason,'Route blocked');assert.equal(f.events.length,0);
  boxes.length=0;assert.ok(r.cast(4));assert.equal(r.lastPlacementFailure,null);for(let i=0;i<12;i++)r.update(.05);assert.equal(f.events.length,0);
  boxes.push({minX:-3,maxX:3,minY:0,maxY:4,minZ:0,maxZ:1});r.update(.05);assert.equal(r.pendingCast,null);assert.equal(r.deployments.length,0);assert.equal(f.events.length,0);assert.equal(r.lastPlacementFailure.reason,'Route blocked');assert.equal(r.castCount[a.id],1);near(r.cooldowns[4],23.35);r.reset();assert.equal(r.lastPlacementFailure,null);r.dispose();
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(()=>ack),{r}=f;assert.ok(r.cast(4));for(let i=0;i<13;i++)r.update(.05);
  assert.deepEqual(f.events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const primary of [Object.freeze(new Error('primary')),undefined]) {
  const secondary=Symbol('cleanup'),f=fixture(event=>{if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;}),{r}=f;
  assert.ok(r.cast(4));for(let i=0;i<12;i++)r.update(.05);let threw=false,caught;try{r.update(.05);}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(r.deployments.length,0);r.dispose();
}
console.log('PASS Passage negative: full-route preflight no-cost rejection, resolution obstruction commits only cast cost/failure fact, synchronous ACK gate and frozen/primitive primary + secondary cleanup');
if(!process.argv.includes('--pure')) {
  function hostFixture() {
    const s=createSystems();s.step(30);const source=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),ally=s.addHero({id:'ally',team:'carbon',position:point(0,0,6.5)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(0,0,6.5)});
    const f=fixture(event=>s.applyHeroEffect(event));assert.ok(s.configureHeroKit(source.id,f.kit,{partialSlice:true}).ok);assert.ok(s.configureHeroKit(enemy.id,native).ok);
    f.r.targets=[ally,enemy,ally,{...source,position:{...source.position}}];
    const ec=new PlayerController({position:enemy.position,boxes:f.boxes,floorHeight:()=>0}),guard=new HeroRuntime({scene:f.scene,controller:ec,kit:native,source:enemy.id,team:'ivory',onEffect:event=>s.applyHeroEffect(event)});
    const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input){f.c.speedMultiplier=s.stats(source.id).moveSpeed/8;f.c.update(.05,input);assert.ok(s.moveHero(source.id,f.c.position).ok);}f.r.update(.05);guard.update(.05);};
    const dispose=()=>{f.r.dispose();guard.dispose();assert.equal(f.scene.children.length,0);};
    return {...f,s,source,ally,enemy,guard,step,dispose};
  }
  {
    const f=hostFixture(),{r,s,source,ally,enemy,events,boxes}=f,hp=s.heroes.map(x=>x.hp),ammo=r.ammo;
    assert.ok(r.cast(4));for(let i=0;i<12;i++){f.step();assert.equal(r.deployments.length,0);}f.step();const field=r.deployments[0];assert.ok(field);near(field.left,5);near(field.age,0);assert.equal(field.centers.length,6);assert.equal(field.handle.group.children.length,6);assert.equal(boxes.length,0);
    near(s.stats(source.id).moveSpeed,10.8);near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(enemy.id).moveSpeed,6);assert.equal(events.filter(e=>e.kind==='speed').length,2);assert.equal(events.filter(e=>e.kind==='status').length,1);
    for(let i=0;i<99;i++)f.step();assert.ok(r.deployments.includes(field));f.step();assert.equal(r.deployments.length,0);
    for(const id of [source.id,ally.id])assert.equal(field.speedCounts.get(id),20);assert.equal(field.slowCounts.get(enemy.id),20);assert.equal(field.zoneCounts.get(enemy.id),10);assert.equal(events.filter(e=>e.kind==='speed'&&e.target===ally.id).length,20);
    near(s.stats(ally.id).moveSpeed,10.8);for(let i=0;i<6;i++)f.step();near(s.stats(ally.id).moveSpeed,8);near(s.stats(enemy.id).moveSpeed,8);assert.deepEqual(s.heroes.map(x=>x.hp),hp);assert.equal(r.ammo,ammo);f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,ally,enemy,c}=f;assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();c.warp(point(10,0,8));assert.ok(s.moveHero(source.id,c.position).ok);c.yaw=Math.PI/2;
    assert.ok(s.moveHero(ally.id,point(10,0,6.5)).ok);assert.ok(s.moveHero(enemy.id,point(10,0,6.5)).ok);f.step();const field=r.deployments[0],centers=structuredClone(field.centers);
    near(centers[5].x,10);near(centers[5].z,-7);assert.equal(field.speedCounts.get(source.id),1,'self uses current feet despite stale Game descriptor');
    c.warp(point(100,0,8));assert.ok(s.moveHero(source.id,c.position).ok);for(let i=0;i<10;i++)f.step();assert.deepEqual(field.centers,centers);assert.equal(field.speedCounts.get(source.id),1);near(s.stats(source.id).moveSpeed,8);near(s.stats(ally.id).moveSpeed,10.8);f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,enemy,guard}=f;assert.ok(guard.cast(4));assert.ok(r.cast(1));f.step();f.step();assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();const field=r.deployments[0];near(s.stats(source.id).moveSpeed,12.4);assert.equal(field.slowCounts.get(enemy.id),undefined,'actual enemy Overtime rejects negative slow');
    for(let i=0;i<40;i++)f.step();near(s.stats(source.id).moveSpeed,10.8);f.dispose();
  }
  {
    const f=hostFixture(),{r,boxes,c}=f,wall={minX:4,maxX:5,minY:0,maxY:4,minZ:2,maxZ:10};boxes.push(wall);
    assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();for(let i=0;i<40;i++)f.step({side:1});
    assert.ok(c.position.x>0&&c.position.x<=3.55+1e-6,'ordinary capsule stops at the unchanged wall, no route phasing');assert.equal(boxes.length,1);assert.equal(boxes[0],wall);f.dispose();
  }
  for(const mode of ['reset','dispose']) {
    const f=hostFixture(),{r,s,ally}=f,real=r.onEffect;let entered=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!entered){entered=true;assert.ok(result.ok);r[mode]();}return result;};
    assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();assert.ok(entered);assert.equal(r.deployments.length,0);assert.equal(f.events.filter(e=>e.kind==='status').length,0);near(s.stats(ally.id).moveSpeed,10.8);f.dispose();
  }
  for(const mode of ['nack','lost-ack']) {
    const f=hostFixture(),{r}=f,real=r.onEffect;let accepted=0;
    r.onEffect=event=>{if(mode==='nack'&&['speed','status'].includes(event.kind))return {ok:false};const result=real(event);if(['speed','status'].includes(event.kind)){if(result.ok)accepted++;return undefined;}return result;};
    assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();const field=r.deployments[0];for(let i=0;i<100;i++)f.step();assert.equal(field.speedCounts.size,0);assert.equal(field.slowCounts.size,0);assert.equal(accepted,mode==='nack'?0:60);f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,c}=f,real=r.onEffect;let moved=false;
    r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!moved){moved=true;assert.ok(result.ok);c.warp(point(100,0,8));assert.ok(s.moveHero(source.id,c.position).ok);}return result;};
    assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();assert.ok(moved);assert.equal(r.deployments[0].speedCounts.get(source.id),undefined,'self left union during prior friend callback');near(s.stats(source.id).moveSpeed,8);f.dispose();
  }
  for(const mode of ['reset','dispose','replace','lost-ack']) {
    const f=hostFixture(),{r}=f,real=r.onEffect;let entered=false,old;
    r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];if(mode==='lost-ack')return undefined;if(mode==='dispose')r.dispose();else r.reset();if(mode==='replace')assert.ok(r.cast(4));}return result;};
    assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();assert.equal(r.deployments.length,0);assert.equal(f.events.filter(e=>['speed','status'].includes(e.kind)).length,0);
    if(mode==='replace'){near(r.pendingCast.left,.65);for(let i=0;i<13;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);assert.equal(r.deployments[0],fresh);near(fresh.age,0);}
    f.dispose();
  }
  for(const primary of [Object.freeze(new Error('Host-first pulse')),undefined]) {
    const f=hostFixture(),{r,s,ally}=f,real=r.onEffect,secondary=Symbol('cleanup');let owner;
    r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='speed'){owner=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};
    assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
    assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(owner.speedCounts.size,0);assert.equal(r.deployments.length,0);near(s.stats(ally.id).moveSpeed,10.8);r.onEffect=real;f.dispose();
  }
  {
    const f=hostFixture(),{r,s,source,enemy}=f;assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();assert.ok(s.damage(source.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();assert.equal(r.deployments.length,0);assert.equal(r.pendingCast,null);f.dispose();const before=JSON.stringify(r.snapshot());assert.equal(r.cast(4),false);r.update(.05);assert.equal(JSON.stringify(r.snapshot()),before);
  }
  console.log('PASS Passage actual Host: .65 windup/24 CD, six fixed centers with captured yaw/current feet, overlapping and duplicate target union20/10 caps, five-second owner/tails, current self including callback departure, enemy immunity/Wide max, NACK/lost-ACK, start replacement/stale cleanup, committed pulse faults, death and terminal closure');
}
console.log('LIMIT: CPU standard covered-placement/point-volume convention; no Host floor/LOS/network-facing proof, native input or supplied-art acceptance.');
