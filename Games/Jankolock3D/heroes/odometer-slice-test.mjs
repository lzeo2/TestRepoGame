// Actual supplied Odometer model + Host/controller APIs, CPU scene only.
// Not browser/native, geometry, balance, complete-kit or fresh archive-byte proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { createSystems } from '../systems.mjs';
import { loadCharacter } from '../character-assets.mjs';
import { PlayerController } from './player-controller.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { odometerSlice } from './odometer-slice.mjs';

await loadCharacter('odometer');
const review=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url)));
const raw=review.heroes.find(h=>h.id==='odometer').proposedKit;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const clone=()=>structuredClone(odometerSlice);
assert.equal(odometerSlice.health,560);assert.equal(odometerSlice.accent,'#73834e');assert.deepEqual(odometerSlice.weapon,raw.weapon);
assert.deepEqual(odometerSlice.melee,raw.melee);assert.deepEqual(Object.keys(odometerSlice.unsupportedSlots),[]);
assert.equal(odometerSlice.abilities.length,4);
const a=odometerSlice.abilities[0];
for(const [key,value] of Object.entries({id:'fastlane',slot:1,cooldown:6,range:0,damageType:'none',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:2,speedMultiplier:1.7,invulnerable:false,windup:.1}))assert.equal(a[key],value,key);
assert.equal(a.name,raw.abilities[0].name);assert.equal(a.windup,raw.abilities[0].cast.windup);
assert.equal(a.speedMultiplier,raw.abilities[0].effects[0].parameters.multiplier);assert.equal(a.duration,raw.abilities[0].effects[0].parameters.duration);

// Default admission remains strict, including every unadapted supplied proposal.
for(const kit of [odometerSlice,...review.heroes.map(h=>h.proposedKit)]) {
  const s=createSystems(),h=s.addHero({id:'source',team:'carbon'}),before=structuredClone(h);
  assert.equal(s.configureHeroKit(h.id,kit).ok,false);assert.deepEqual(h,before);
}
let rejected=0;
for(const change of [k=>k.id='stampead',k=>k.partialSlice=false,k=>k.melee=null,k=>k.melee=undefined,k=>k.abilities=[],k=>k.abilities.push({...k.abilities[0],slot:2}),k=>k.abilities.splice(k.abilities.findIndex(a=>a.slot===3),1),k=>k.abilities.splice(0,1),k=>k.abilities.find(a=>a.id==='flyingdigits').slot=1,
  ...[{id:'other'},{slot:1},{cooldown:10},{windup:.2},{duration:5},{range:17},{radius:4},{slow:.5},{slowDuration:.75},{slowMaxStacks:2},{slowMaxApplicationsPerTarget:17},{revealDuration:2},{revealMode:'all'},{revealMaxApplicationsPerTarget:17},{interval:.5},{zoneTickInterval:.25},{zoneMaxTicksPerTarget:9},{fieldCount:2},{fieldLayout:'multiple'},{placementRadius:1},{spacing:1},{followsCaster:true},{invulnerable:true},{speedMultiplier:1.1},{baseDamage:1},{baseHeal:1},{spiritScale:1},{damageType:'weapon'},{anchoredSlow:true},{maxApplicationsPerTarget:16}].map(extra=>k=>Object.assign(k.abilities.find(a=>a.id==='speedtrap'),extra)),
  ...[{id:'other'},{slot:2},{cooldown:22},{windup:.4},{duration:5},{radius:6},{range:6},{speedMultiplier:1.5},{speedDuration:1},{interval:.5},{speedMaxApplicationsPerTarget:17},{speedMaxStacks:2},{zoneTickInterval:.25},{zoneMaxTicksPerTarget:9},{fieldCount:2},{fieldLayout:'multiple'},{placementRadius:1},{spacing:1},{followsCaster:false},{openingInvulnerabilityDuration:.5},{baseDamage:1},{baseHeal:1},{spiritScale:1},{slow:.1},{invulnerable:true},{damageType:'weapon'},{maxApplicationsPerTarget:16}].map(extra=>k=>Object.assign(k.abilities.find(a=>a.id==='endshiftsprint'),extra)),
  ...[{id:'other'},{slot:4},{windup:.2},{cooldown:7},{duration:1},{projectileCount:3},{projectileSpeed:39},{projectileRadius:.3},{spreadDegrees:27},{maxHitsPerTarget:3},{fireInterval:.1},{pattern:'circle'},{baseDamage:19},{baseHeal:1},{spiritScale:1},{slow:.1},{invulnerable:true},{range:26},{damageType:'spirit'}].map(extra=>k=>Object.assign(k.abilities.find(a=>a.id==='flyingdigits'),extra)),
  ...[{name:'Not Mileage Tap'},{damageType:'melee'},{baseDamage:63},{range:3},{cooldown:0},{baseHeal:1},{spiritScale:1},{slow:.1},{invulnerable:true},{duration:1},{radius:1},{speedMultiplier:2},{headshotMultiplier:1.4}].map(extra=>k=>Object.assign(k.melee,extra)),
  ...[{id:'overtime'},{slot:2},{windup:0},{windup:.2},{cooldown:5},{duration:3},{speedMultiplier:1.5},{invulnerable:true},{baseDamage:1},{baseHeal:1},{spiritScale:1},{slow:.1},{range:1},{damageType:'weapon'}].map(extra=>k=>Object.assign(k.abilities[0],extra))]) {
  const s=createSystems(),h=s.addHero({id:'source',team:'carbon'}),kit=clone(),before=structuredClone({hero:h,stats:s.stats(h.id),events:s.events});change(kit);
  assert.equal(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok,false);assert.deepEqual({hero:h,stats:s.stats(h.id),events:s.events},before);
  assert.ok(s.configureHeroKit(h.id,clone(),{partialSlice:true}).ok);rejected++;
}
{
  const s=createSystems(),h=s.addHero({id:'reverse',team:'carbon'}),kit=clone();kit.abilities.reverse();
  assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok,'explicit slot1/slot3 admission is independent of array order');
}
{
  for(const slots of [[1,3],[1,3,4],[1,2,3]]){const s=createSystems(),h=s.addHero({id:'legacy-subset',team:'carbon'}),kit=clone();kit.abilities=kit.abilities.filter(a=>slots.includes(a.slot));assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok,'older known subsets retain mandatory 1/3');}
}
function fixture() {
  const s=createSystems();s.step(30);
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),enemy=s.addHero({id:'enemy',team:'ivory',position:{x:.55,y:0,z:0}}),kit=clone();
  assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);assert.equal(h.maxHp,560);
  const scene=new THREE.Scene(),c=new PlayerController({position:h.position,boxes:[],floorHeight:()=>0}),events=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);assert.ok(result.ok,`${event.kind}: ${result.reason}`);return result;}});
  r.targets=[enemy];assert.ok(scene.children.length>0);
  const step=(moving=false)=>{assert.ok(s.step(.05).ok);if(moving&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,{forward:1});assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);};
  const state=()=>JSON.stringify({runtime:r.snapshot(),modifiers:r.modifiers,time:r.time,recoil:r.recoil,heroes:s.heroes,events,host:s.events,position:c.position,velocity:c.velocity,handles:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  return {s,h,enemy,scene,c,r,events,step,state};
}
{
  const f=fixture(),{r,s,h,enemy,events,step,c}=f,hp=[h.hp,enemy.hp],ammo=r.ammo;
  const baseline={kind:'buff',source:h.id,target:h.id,ability:'fastlane',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:2,invulnerable:false,speedMultiplier:1.7};
  for(const extra of [{invulnerable:true},{speedMultiplier:2},{baseDamage:1},{baseHeal:1},{spiritScale:1},{target:enemy.id},{duration:3}]) {
    const before=f.state();assert.equal(s.applyHeroEffect({...baseline,...extra}).ok,false);assert.equal(f.state(),before);
  }
  const aim=r.aimHit;r.aimHit=()=>assert.fail('unavailable input reached aim');
  for(const invoke of [()=>r.cast(0),()=>r.cast(5)]){const before=f.state();assert.equal(invoke(),false);assert.equal(f.state(),before);}
  assert.ok(r.cast(1),'self cast does not need a damaging aim ray');r.aimHit=aim;
  const pendingState=f.state();assert.equal(r.cast(2),false,'Speed Trap blocked before cost while Fast Lane winds up');assert.equal(f.state(),pendingState);assert.equal(r.cast(3),false,'one pending ability, no hidden queue');assert.equal(f.state(),pendingState);assert.equal(r.cast(4),false,'rally also blocked by pending Fast Lane');assert.equal(f.state(),pendingState);
  assert.equal(r.cooldowns[1],6);assert.equal(r.castCount.fastlane,1);near(r.snapshot().windup,.1);assert.equal(r.buffs.fastlane,undefined);
  assert.equal(events.length,0);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);
  const before=f.state();assert.equal(r.cast(1),false);assert.equal(f.state(),before);
  step();near(r.snapshot().windup,.05);assert.equal(events.length,0);near(s.stats(h.id).moveSpeed,8);
  step();assert.equal(r.pendingCast,null);near(r.buffs.fastlane.left,2);near(s.stats(h.id).moveSpeed,13.6);near(c.speedMultiplier,1.7);assert.equal(s.stats(h.id).invulnerable,false);
  const activation=s.time;
  for(let i=0;i<39;i++){step(true);assert.equal(s.stats(h.id).invulnerable,false);}
  near(s.stats(h.id).moveSpeed,13.6);assert.ok(Math.hypot(c.velocity.x,c.velocity.z)>8,'real player-controlled movement accelerates above baseline, without a forced dash');
  step();near(s.time,activation+2);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);assert.equal(r.buffs.fastlane,undefined);
  assert.deepEqual([h.hp,enemy.hp],hp);assert.equal(r.ammo,ammo);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);
  assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);near(r.cooldowns[1],3.9);
  for(let i=0;i<80&&r.cooldowns[1]>0;i++)step();assert.ok(r.cast(1));r.reset();assert.equal(r.pendingCast,null);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=fixture(),{r,enemy,events,step}=f,hp=enemy.hp;
  assert.ok(r.fire());assert.equal(r.ammo,19);assert.ok(enemy.hp<hp);assert.equal(events[0].baseDamage,17);assert.equal(events[0].damageType,'weapon');
  assert.equal(r.fire(),false);for(let i=0;i<6;i++)step();assert.ok(r.fire());assert.equal(r.ammo,18);
  assert.equal(r.startReload(),undefined);near(r.reload,1.6);for(let i=0;i<33;i++)step();assert.equal(r.ammo,20);assert.equal(r.reload,0);
  assert.ok(r.parry(),'existing guard remains usable alongside Mileage Tap');r.dispose();
}
for(const mode of ['reset','death-caller-reset','dispose']) {
  const f=fixture(),{r,s,h,enemy,step,events}=f;assert.ok(r.cast(1));step();
  if(mode==='death-caller-reset')assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);
  if(mode==='dispose')r.dispose();else r.reset();
  for(let i=0;i<4;i++)step();assert.equal(r.pendingCast,null);assert.equal(r.buffs.fastlane,undefined);assert.equal(events.filter(e=>e.kind==='buff').length,0);near(s.stats(h.id).moveSpeed,8);
  if(mode==='reset')assert.ok(r.cast(1));r.dispose();
}
for(const mode of ['reset','dispose','reentrant-reset','reentrant-dispose']) {
  const f=fixture(),{r,s,h,events,step}=f;
  if(mode.startsWith('reentrant')){const effect=r.onEffect;r.onEffect=event=>{const result=effect(event);if(event.kind==='buff')mode.endsWith('dispose')?r.dispose():r.reset();return result;};}
  assert.ok(r.cast(1));step();step();
  if(mode==='reset')r.reset();if(mode==='dispose')r.dispose();
  assert.equal(r.buffs.fastlane,undefined);assert.equal(r.pendingCast,null);near(s.stats(h.id).moveSpeed,8);assert.equal(s.stats(h.id).invulnerable,false);
  assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);r.dispose();r.dispose();assert.equal(f.scene.children.length,0);
}
console.log(`odometer-slice: real model/Host/controller PASS; 41 default raw/partial rejections, ${rejected} transactional explicit-opt-in rejections+retries; exact weapon/Mileage Tap/profile, all four slots supported, invalid slots/pending lock no-cost; Speed Trap/Flying Digits/End Shift covered by dedicated tests (dedicated odometer-melee-test covers positive/negative melee), .1 windup/6 cooldown/2s speed-only 8->13.6->8, real motion/fire/reload/guard, cancellation and reentrant cleanup; CPU only`);
