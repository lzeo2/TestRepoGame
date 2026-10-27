// CPU acceptance: existing Odo art, native Runtime cone and real Host damage/items.
// No browser/native geometry, new animation, cadence security or fresh ZIP-byte claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {odometerSlice} from './odometer-slice.mjs';
const ordinary=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../../docs/${name}`,import.meta.url))).heroes);
const native=ordinary[0],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
await Promise.all([loadCharacter('odometer'),loadCharacter(native.id)]);
function fixture({kit=odometerSlice,items=[]}={}) {
  const s=createSystems();s.step(30);
  // Public addHero import-state seed, NOT gameplay economy progress. Its API requires
  // earnedSouls >= souls, so the seeded level is also setup and included in damage receipts.
  const importedCurrency=items.length?12800:0;
  const h=s.addHero({id:'source',team:'carbon',position:items.length?s.bases.carbon:{x:0,y:0,z:8},souls:importedCurrency,earnedSouls:importedCurrency});
  assert.ok(s.configureHeroKit(h.id,structuredClone(kit),kit.partialSlice?{partialSlice:true}:undefined).ok);
  for(const item of items)assert.ok(s.buyItem(h.id,item).ok);assert.equal(h.earnedSouls,importedCurrency);assert.ok(s.moveHero(h.id,{x:0,y:0,z:8}).ok);
  const enemy=s.addHero({id:'enemy',team:'ivory',position:{x:0,y:0,z:6}}),ally=s.addHero({id:'ally',team:'carbon',position:{x:0,y:0,z:6}});
  assert.ok(s.configureHeroKit(enemy.id,native).ok);
  const scene=new THREE.Scene(),boxes=[],events=[],results=[];
  const c=new PlayerController({position:h.position,boxes,floorHeight:()=>0});
  const r=new HeroRuntime({scene,controller:c,kit:structuredClone(kit),source:h.id,boxes,onEffect:e=>{events.push(e);const result=s.applyHeroEffect(e);results.push(result);return result;}});r.targets=[enemy];
  const enemyController=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0});
  const guard=new HeroRuntime({scene,controller:enemyController,kit:native,source:enemy.id,team:'ivory',boxes,onEffect:e=>s.applyHeroEffect(e)});
  const step=()=>{assert.ok(s.step(.05).ok);r.update(.05);guard.update(.05);};
  const state=()=>JSON.stringify({heroes:s.heroes,stats:s.heroes.map(x=>s.stats(x.id)),host:s.events,time:s.time,events,results,snapshot:r.snapshot(),wait:r.meleeWait,ammo:r.ammo,recoil:r.recoil,modifiers:r.modifiers,position:c.position,velocity:c.velocity,boxes,handles:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position]),children:scene.children.map(x=>x.uuid)});
  const dispose=()=>{r.dispose();guard.dispose();assert.equal(scene.children.length,0);};
  return {s,h,enemy,ally,r,c,guard,boxes,events,results,step,state,dispose};
}
{
  const f=fixture(),{r,s,h,enemy,events,results,step}=f,hp=enemy.hp,ammo=r.ammo,hostAmmo=h.ammo;
  assert.ok(r.melee());assert.equal(r.meleeWait,1);assert.equal(events.length,1);assert.equal(events[0].ability,'Mileage Tap');assert.equal(events[0].damageType,'weapon');assert.equal(events[0].baseDamage,62);assert.ok(results[0].ok);
  near(hp-enemy.hp,62*(1-s.stats(enemy.id).armor));assert.equal(s.events.filter(e=>e.type==='damage').at(-1).kind,'projectile');assert.equal(r.ammo,ammo);assert.equal(h.ammo,hostAmmo);
  let before=f.state();assert.equal(r.melee(),false);assert.equal(f.state(),before,'cooldown rejection changes no HP, FX, ammo or other state');
  for(let i=0;i<19;i++)step();near(r.meleeWait,.05);before=f.state();assert.equal(r.melee(),false);assert.equal(f.state(),before);
  step();near(r.meleeWait,0);const nextHp=enemy.hp;assert.ok(r.melee());near(nextHp-enemy.hp,55.8);assert.equal(events.length,2);assert.equal(r.ammo,ammo);assert.equal(h.ammo,hostAmmo);
  const event=events[0];
  for(const extra of [{damageType:'melee'},{damageType:'spirit'},{baseDamage:63},{baseDamage:1e6},{headshot:true,headshotMultiplier:1.4},{headshot:true,headshotMultiplier:2},{headshotMultiplier:NaN},{baseHeal:1},{spiritScale:1},{slow:.1},{duration:1},{invulnerable:true},{speedMultiplier:1.7}]) {
    before=f.state();assert.equal(s.applyHeroEffect({...event,...extra}).ok,false);assert.equal(f.state(),before,'forged intent is transactional');
  }
  f.dispose();
}
for(const miss of ['range','cover','cone','ally','dead']) {
  const f=fixture(),{s,h,enemy,ally,r,boxes,events}=f;
  if(miss==='range')assert.ok(s.moveHero(enemy.id,{x:0,y:0,z:5.19}).ok);
  if(miss==='cover')boxes.push({minX:-1,maxX:1,minY:0,maxY:3,minZ:6.8,maxZ:7.2});
  if(miss==='cone')assert.ok(s.moveHero(enemy.id,{x:0,y:0,z:10}).ok);
  if(miss==='ally')r.targets=[ally];
  if(miss==='dead')assert.ok(s.damage(enemy.id,1e6,h.id,{kind:'ability'}).killed);
  const hp=s.heroes.map(x=>x.hp),ammo=r.ammo;assert.ok(r.melee(),'a legitimate miss still spends the native melee cooldown');assert.equal(r.meleeWait,1);assert.deepEqual(s.heroes.map(x=>x.hp),hp);assert.equal(events.length,0);assert.equal(r.ammo,ammo);f.dispose();
}
{
  const f=fixture();assert.ok(f.s.moveHero(f.enemy.id,{x:0,y:0,z:5.2}).ok);const hp=f.enemy.hp;assert.ok(f.r.melee());near(hp-f.enemy.hp,55.8);f.dispose();
}
{
  const f=fixture({items:['glass-cannon','armor-pierce']}),{s,h,enemy,r}=f,hp=enemy.hp,stats=s.stats(h.id),armor=s.stats(enemy.id).armor;
  assert.equal(h.level,20,'derived imported level, not played progression');near(stats.damageMultiplier,3.12);near(stats.armorPierce,.8);assert.ok(r.melee());near(hp-enemy.hp,62*stats.damageMultiplier*(1-armor*(1-.8)));near(hp-enemy.hp,189.5712);assert.equal(h.earnedSouls,12800);assert.deepEqual(h.items,['glass-cannon','armor-pierce']);assert.equal(r.ammo,20);f.dispose();
}
for(const kit of [odometerSlice,native]) {
  const f=fixture({kit}),{s,enemy,guard,r,results}=f;assert.ok(guard.parry(),'real enemy native Runtime requests actual Host guard');assert.equal(s.stats(enemy.id).parry,true);
  const hp=enemy.hp;assert.ok(r.melee());
  if(kit===odometerSlice){assert.ok(results[0].ok);near(hp-enemy.hp,55.8);}else{assert.equal(results[0].ok,false);assert.equal(results[0].reason,'parried');assert.equal(enemy.hp,hp);}
  f.dispose();
}
for(const kit of ordinary){const s=createSystems(),h=s.addHero({id:'ordinary',team:'carbon'});assert.ok(s.configureHeroKit(h.id,kit).ok);}
{
  const s=createSystems(),h=s.addHero({id:'ordinary',team:'carbon'}),bad=structuredClone(native),before=structuredClone({hero:h,stats:s.stats(h.id),events:s.events});bad.melee.damageType='weapon';
  assert.equal(s.configureHeroKit(h.id,bad).ok,false);assert.deepEqual({hero:h,stats:s.stats(h.id),events:s.events},before);assert.ok(s.configureHeroKit(h.id,native).ok);
}
console.log('PASS Odo Mileage Tap: actual model/controller/Runtime and Host; raw 62 weapon-channel cone, 2.8 boundary, 1s cooldown via .05 steps, no ammo, 55.8 armored / 189.5712 purchased-item damage at explicitly imported level 20, range/cover/cone/ally/dead misses, real enemy parry bypass vs ordinary melee parried, 13 forged intents transactional, all eight default kits unchanged. CPU only.');
