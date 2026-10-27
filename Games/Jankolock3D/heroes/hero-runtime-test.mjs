import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {createSystems} from '../systems.mjs';
import {preloadHeroes,loadCharacter} from '../character-assets.mjs';
await preloadHeroes();
const {heroes}=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url)));
function fixture(kit) {
  const scene=new THREE.Scene(),boxes=[],events=[];
  const controller=new PlayerController({position:{x:0,y:0,z:8},boxes});
  // Runtime may read targets, never write health or other systems-owned fields.
  const targets=[{id:'enemy',team:'ivory',position:new THREE.Vector3(0,0,0),alive:true},{id:'friend',team:'carbon',position:new THREE.Vector3(1,0,3),alive:true}].map(t=>Object.freeze({...t,hp:300,maxHp:400}));
  const runtime=new HeroRuntime({scene,controller,kit,boxes,targets,onEffect:event=>events.push(event)});
  return {runtime,controller,targets,boxes,scene,events};
}
// Synthetic ORIGINAL Turretina-kit fixture on real Odometer art, not a proposed
// expansion kit, registration, parity/playability claim or accepted-action wiring.
await loadCharacter('odometer');
for(const yaw of [0,.7])for(const [forward,lateral] of [[8,0],[-8,0],[0,8]]) {
  const kit=structuredClone(heroes[1]);kit.id='odometer';
  const {runtime:r,controller:c,scene}=fixture(kit);
  c.yaw=yaw;c.state='walk';
  c.velocity.set(lateral,0,-forward).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  const velocity=c.velocity,before=velocity.toArray();Object.freeze(velocity);
  const wheel=r.visual.group.getObjectByName('rear_L_wheel'),rest=wheel.quaternion.clone();
  const checkMotion=site=>{
    const motion=r.visual.motion;
    assert.ok(Math.abs(motion.forward-forward)<1e-6,`${site}: signed local forward`);
    assert.ok(Math.abs(motion.lateral-lateral)<1e-6,`${site}: local strafe`);
    assert.ok(Math.abs(motion.lateralSlip-Math.abs(lateral))<1e-6,`${site}: fixed-wheel lateral scrub`);
    assert.equal(c.velocity,velocity);assert.deepEqual(velocity.toArray(),before,`${site}: readonly velocity`);
  };
  assert.ok(r.fire());checkMotion('fire'); // Actual visual adapter/getter, not argument capture.
  assert.ok(wheel.quaternion.angleTo(rest)<1e-6,'zero-dt fire does not invent wheel travel');
  r.visual.reset();r.update(.05);checkMotion('update');
  const relative=rest.clone().invert().multiply(wheel.quaternion);
  const angle=2*Math.atan2(relative.x,relative.w);
  if(forward)assert.ok(angle*forward<0,'actual wheel rolls opposite signed forward travel');
  else assert.ok(wheel.quaternion.angleTo(rest)<1e-6,'pure strafe does not fake fixed-wheel rolling');
  r.dispose();assert.equal(scene.children.length,0);
}
console.log('hero-runtime-test: synthetic original-kit/real Odometer visual: fire/update signed forward/reverse/strafe, yaw, readonly velocity and actual wheel roll; no proposed-kit/playability acceptance');
// Real systems host: a schema-valid ID still need not have a runtime dispatcher.
function hostFixture(kit) {
  const f=fixture(kit),sim=createSystems();sim.step(30);
  const source=sim.addHero({id:'player',team:'carbon',position:f.controller.position});
  const enemy=sim.addHero({id:'enemy',team:'ivory',position:{x:.55,y:0,z:0}});
  const friend=sim.addHero({id:'friend',team:'carbon',position:{x:1,y:0,z:3}});
  assert.ok(sim.configureHeroKit(source.id,kit).ok);
  f.runtime.targets=[source,enemy,friend];
  f.runtime.onEffect=event=>{
    f.events.push(event);const result=sim.applyHeroEffect(event);
    assert.ok(result.ok,`${event.kind}/${event.ability}: ${result.reason}`);
  };
  const state=()=>JSON.stringify({runtime:f.runtime.snapshot(),events:f.events,systemEvents:sim.events,
    heroes:sim.heroes.map(h=>({id:h.id,hp:h.hp,position:h.position,stats:sim.stats(h.id)})),boxes:f.boxes,
    position:f.controller.position,velocity:f.controller.velocity,state:f.controller.state,stamina:f.controller.stamina,
    deployments:f.runtime.deployments.map(d=>({id:d.definition.id,position:d.position,left:d.left,next:d.next,wall:d.wall})),
    projectiles:f.runtime.projectiles.map(p=>({id:p.definition.id,position:p.position,velocity:p.velocity,left:p.left,bounces:p.bounces})),
    fx:[...f.runtime.fx.handles.keys()].map(h=>({remaining:h.remaining,position:h.position,name:h.group.name}))});
  const rejected=slot=>{
    const before=state(),handles=[...f.runtime.fx.handles.keys()],deployments=[...f.runtime.deployments],children=[...f.scene.children];
    assert.equal(f.runtime.cast(slot),false,'rejected cast returns false');
    assert.equal(state(),before,'rejection preserves HP/intents/FX/ammo/cooldowns/casts/lastAbility/boxes and active effects');
    assert.deepEqual([...f.runtime.fx.handles.keys()],handles,'existing FX handles survive rejection');
    assert.deepEqual(f.runtime.deployments,deployments,'existing deployments survive rejection');
    assert.deepEqual(f.scene.children,children,'rejection leaves scene objects untouched');
  };
  return {...f,sim,enemy,rejected};
}
// Real Odometer art with synthetic ORIGINAL Turretina kit, not a proposed kit or
// production slot-phase policy. Observe the actual named weapon joint, not a mock.
function weaponPoseFixture(input=heroes[1]) {
  const kit=structuredClone(input);kit.id='odometer';
  const f=hostFixture(kit),joint=f.runtime.visual.group.getObjectByName('dispatch_blaster'),rest=joint.quaternion.clone();
  const check=phase=>{
    const expected=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-6*Math.PI/180*Math.sin(phase*Math.PI)));
    assert.ok(joint.quaternion.angleTo(expected)<1e-6,`actual Odometer weapon phase ${phase}`);
  };
  return {...f,joint,rest,check};
}
{
  const {runtime:r,controller:c,check,joint,rest,events,scene}=weaponPoseFixture();
  c.yaw=.7;c.state='walk';c.velocity.set(0,0,-8).applyAxisAngle(new THREE.Vector3(0,1,0),c.yaw);
  const velocity=c.velocity.clone(),root=r.visual.group.getObjectByName('root'),rootPose=[...root.position.toArray(),...root.quaternion.toArray()];
  assert.ok(r.fire());check(0);assert.equal(r.weaponAction.acceptedAt,0);assert.equal(events.length,0,'accepted miss still owns weapon cue');
  r.update(.03);check(.25);r.update(.03);check(.5);r.recoil=0;
  const mid=joint.quaternion.toArray();for(let i=0;i<5;i++){r.update(0);check(.5);assert.deepEqual(joint.quaternion.toArray(),mid);}
  assert.ok(c.velocity.equals(velocity));assert.ok(Math.abs(r.visual.motion.forward-8)<1e-6);
  assert.deepEqual([...root.position.toArray(),...root.quaternion.toArray()],rootPose,'accepted gesture does not own root transform');
  r.update(.05);r.update(.02);assert.equal(r.weaponAction,null);check(0);
  r.fx.emit('shot',{origin:c.position.clone(),target:c.position.clone().add(new THREE.Vector3(0,0,-1)),duration:.12});
  r.update(.03);assert.equal(r.weaponAction,null);check(0); // Cosmetic FX alone cannot admit a gesture.
  r.dispose();assert.ok(joint.quaternion.angleTo(rest)<1e-6);assert.equal(scene.children.length,0);
}
{
  const {runtime:r,check}=weaponPoseFixture();r.setModifiers({fire:.1});
  assert.ok(r.fire());r.update(.03);r.update(.03);check(.5);const first=r.weaponAction;
  assert.ok(r.fire());assert.notEqual(r.weaponAction,first);assert.equal(r.weaponAction.acceptedAt,r.time);check(0);
  r.update(.03);check(.25);r.dispose();
}
for(const reason of ['cooldown','reload','no-ammo']) {
  const {runtime:r,check}=weaponPoseFixture();if(reason!=='cooldown')r.setModifiers({fire:.1});
  assert.ok(r.fire());r.update(.03);r.update(.03);const token=r.weaponAction;check(.5);
  if(reason==='reload')r.startReload();
  if(reason==='no-ammo')r.ammo=0; // Explicit negative-ammo fixture; no host HP/lock grant.
  assert.equal(r.fire(),false);assert.equal(r.weaponAction,token,`${reason}: rejected fire does not restart cue`);check(.5);
  r.update(0);check(.5);r.dispose();
}
for(const action of ['slot','melee','parry']) {
  const {runtime:r,check}=weaponPoseFixture();assert.ok(r.fire());r.update(.03);r.update(.03);check(.5);
  assert.ok(action==='slot'?r.cast(1):r[action]());assert.equal(r.weaponAction,null);check(0);r.update(.03);check(0);r.dispose();
}
for(const action of ['melee','parry']) {
  const {runtime:r,check}=weaponPoseFixture();assert.ok(r[action]());assert.ok(r.fire());r.update(.03);r.update(.03);
  const token=r.weaponAction;assert.equal(r[action](),false);assert.equal(r.weaponAction,token);check(.5);r.dispose();
}
{
  const {runtime:r,rejected,check,boxes}=weaponPoseFixture();assert.ok(r.fire());r.update(.03);r.update(.03);const token=r.weaponAction;
  const a=r.kit.abilities[0];a.id='unsupported-slot';rejected(1);a.id='turret';a.interval=0;rejected(1);
  boxes.push({minX:-1,maxX:1,minY:0,maxY:3,minZ:7.6,maxZ:7.8});rejected(2);
  assert.equal(r.weaponAction,token);check(.5);r.dispose();
}
for(const end of ['reset','death-reset','dispose']) {
  const {runtime:r,sim,enemy,joint,rest,check,scene}=weaponPoseFixture();assert.ok(r.fire());r.update(.03);r.update(.03);check(.5);
  if(end==='death-reset')assert.ok(sim.damage('player',1e6,enemy.id,{kind:'ability'}).killed);
  if(end==='dispose')r.dispose();else r.reset();
  assert.equal(r.weaponAction,null);assert.ok(joint.quaternion.angleTo(rest)<1e-6,'lifecycle restores actual weapon rest immediately');
  if(end!=='dispose'){r.update(0);check(0);r.dispose();}assert.equal(scene.children.length,0);
}
{
  const {runtime:r}=weaponPoseFixture(),fin=r.visual.group.getObjectByName('rear_airmail_fin');
  // A separate test owner supplies an already accepted slot sample; runtime does not own it.
  r.visual.setAcceptedAction({accepted:true,kind:'slot',slot:4,phase:.5});r.update(0);const pose=fin.quaternion.toArray();
  r.update(.03);assert.deepEqual(fin.quaternion.toArray(),pose);assert.equal(r.weaponAction,null);
  assert.ok(r.melee());r.update(0);assert.deepEqual(fin.quaternion.toArray(),pose,'no owned weapon means no foreign-action clearing');r.dispose();
}
{
  const {runtime:r,check}=weaponPoseFixture(),effect=r.onEffect;
  r.onEffect=event=>{
    if(event.ability===r.kit.weapon.name) {
      const token=r.weaponAction;assert.ok(token);assert.equal(token.acceptedAt,r.time);check(0);
      effect(event);assert.equal(r.cast(99),false);assert.equal(r.weaponAction,token);
      assert.ok(r.cast(1));assert.equal(r.weaponAction,null,'later accepted nonweapon wins inside shot callback');
    } else effect(event);
  };
  assert.ok(r.fire());assert.equal(r.weaponAction,null);r.update(.03);r.update(.03);check(0);r.dispose();
}
console.log('hero-runtime-test: accepted weapon timestamp drives actual Odometer joint phase/rest; misses/fresh shots/rejections/nonweapon ownership/reentry/zero-dt/world velocity/lifecycle checked; external slot ownership preserved');
// Fixed S6 instant-slot cosmetic contract, synthetic ORIGINAL kits on real art.
// Slot4 is a slot swap, not a fifth ability or a proposed expansion kit.
function instantSlotFixture(input) {
  const f=weaponPoseFixture(input),r=f.runtime;
  const recipes={1:[['rear_airmail_fin','x',6]],2:[['L_elbow','x',10]],3:[['dispatch_blaster','x',-10]],4:[['rear_airmail_fin','x',10],['L_wrist','z',8]]};
  const rests=new Map(Object.values(recipes).flat().map(([name])=>{const node=r.visual.group.getObjectByName(name);return [name,{node,q:node.quaternion.clone()}];}));
  const checkSlot=(slot,phase)=>{
    for(const [name,axis,degrees] of recipes[slot]) {
      const {node,q}=rests.get(name),direction=new THREE.Vector3();direction[axis]=1;
      const expected=q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(direction,degrees*Math.PI/180*Math.sin(phase*Math.PI)));
      assert.ok(node.quaternion.angleTo(expected)<1e-6,`actual Odometer slot${slot}/${name} phase ${phase}`);
    }
  };
  const advance=seconds=>{for(let left=seconds;left>1e-9;) {
    const dt=Math.min(.05,left);r.update(dt);assert.ok(f.sim.step(dt).ok);left-=dt;
  }};
  return {...f,checkSlot,advance,rests};
}
const instantCases=[['longshot',2,1,.65],['volley',0,2,.8],['glue',3,2,.8],['slam',0,3,1],['volley-slot4',0,4,.8]];
for(const [name,index,slot,duration] of instantCases) {
  const kit=structuredClone(heroes[index]);
  if(name==='volley-slot4'){kit.abilities.find(a=>a.slot===2).slot=4;kit.abilities.find(a=>a.id==='overtime').slot=2;}
  const {runtime:r,enemy,sim,events,checkSlot,advance,rejected,rests,scene}=instantSlotFixture(kit),a=r.kit.abilities.find(a=>a.slot===slot);
  if(a.id==='slam')assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:5}).ok);
  const effect=r.onEffect,hp=enemy.hp,time=r.time;
  r.onEffect=event=>{
    if(event.ability===a.id){assert.equal(r.acceptedAction.kind,'slot');assert.equal(r.acceptedAction.slot,slot);assert.equal(r.acceptedAction.acceptedAt,r.time);checkSlot(slot,0);}
    effect(event);
  };
  assert.ok(r.cast(slot));assert.ok(enemy.hp<hp,'instant damage happens at cast, before any phase advance');assert.equal(r.time,time);
  assert.equal(r.acceptedAction.duration,duration);assert.equal(r.weaponAction,null);checkSlot(slot,0);
  assert.throws(()=>{r.weaponAction=null;},TypeError,'weaponAction remains a read-only compatibility getter');
  const token=r.acceptedAction,damagedHP=enemy.hp,damageCount=events.filter(e=>e.kind==='damage').length;
  advance(duration/2);checkSlot(slot,.5);assert.equal(enemy.hp,damagedHP);assert.equal(events.filter(e=>e.kind==='damage').length,damageCount);
  const midpoint=[...rests.values()].map(({node})=>node.quaternion.toArray());
  for(let i=0;i<5;i++){r.update(0);checkSlot(slot,.5);assert.deepEqual([...rests.values()].map(({node})=>node.quaternion.toArray()),midpoint);}
  rejected(slot);assert.equal(r.acceptedAction,token);checkSlot(slot,.5);
  advance(duration/2+.05);assert.equal(r.acceptedAction,null);assert.equal(r.weaponAction,null);checkSlot(slot,0);
  advance(r.cooldowns[slot]+.05);const beforeRepeat=enemy.hp;assert.ok(r.cast(slot));assert.notEqual(r.acceptedAction,token);checkSlot(slot,0);assert.ok(enemy.hp<beforeRepeat);
  r.dispose();checkSlot(slot,0);assert.equal(scene.children.length,0);
  const miss=instantSlotFixture(kit);miss.runtime.targets=[];assert.ok(miss.runtime.cast(slot));assert.equal(miss.events.length,0);
  assert.equal(miss.runtime.acceptedAction.slot,slot);miss.advance(duration/2);miss.checkSlot(slot,.5);miss.runtime.dispose();
}
for(const action of ['melee','parry','noninstant']) {
  const {runtime:r,checkSlot,advance}=instantSlotFixture(heroes[0]);assert.ok(r.cast(2));advance(.4);checkSlot(2,.5);
  assert.ok(action==='noninstant'?r.cast(1):r[action]());assert.equal(r.acceptedAction,null);assert.equal(r.weaponAction,null);checkSlot(2,0);r.update(0);checkSlot(2,0);r.dispose();
}
for(const reason of ['cooldown','reload','no-ammo']) {
  const {runtime:r,checkSlot,advance}=instantSlotFixture(heroes[0]);assert.ok(r.fire());assert.ok(r.cast(2));
  advance(reason==='cooldown'?.03:.4);const phase=(r.time-r.acceptedAction.acceptedAt)/.8,token=r.acceptedAction;
  if(reason==='reload')r.startReload();if(reason==='no-ammo')r.ammo=0;
  assert.equal(r.fire(),false);assert.equal(r.acceptedAction,token);checkSlot(2,phase);r.dispose();
}
{
  const {runtime:r,checkSlot,advance,rejected}=instantSlotFixture(heroes[0]);assert.ok(r.cast(2));advance(.4);const token=r.acceptedAction;
  const a=r.kit.abilities[0],id=a.id;a.id='unsupported-slot';rejected(1);a.id=id;
  Object.assign(r.kit.abilities[2],{baseDamage:0,damageType:'none',slow:.95});rejected(3);
  assert.equal(r.acceptedAction,token);checkSlot(2,.5);r.dispose();
}
for(const end of ['reset','death-reset','dispose']) {
  const {runtime:r,sim,enemy,checkSlot,advance,scene}=instantSlotFixture(heroes[0]);assert.ok(r.cast(2));advance(.4);checkSlot(2,.5);
  if(end==='death-reset')assert.ok(sim.damage('player',1e6,enemy.id,{kind:'ability'}).killed);
  if(end==='dispose')r.dispose();else r.reset();
  assert.equal(r.acceptedAction,null);assert.equal(r.weaponAction,null);checkSlot(2,0);
  if(end!=='dispose'){r.update(0);checkSlot(2,0);r.dispose();}assert.equal(scene.children.length,0);
}
for(const order of ['slot-weapon','weapon-slot','slot-slot']) {
  const {runtime:r,sim,enemy,check,checkSlot,advance}=instantSlotFixture(heroes[0]),effect=r.onEffect;
  assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:5}).ok);
  const outer=order==='weapon-slot'?r.kit.weapon.name:'volley';let nested=false;
  r.onEffect=event=>{
    effect(event);
    if(!nested&&event.ability===outer) {
      nested=true;const token=r.acceptedAction;assert.ok(token);assert.equal(r.cast(99),false);assert.equal(r.acceptedAction,token);
      assert.ok(order==='slot-weapon'?r.fire():r.cast(order==='slot-slot'?3:2));
    }
  };
  assert.ok(order==='weapon-slot'?r.fire():r.cast(2));assert.ok(nested);
  if(order==='slot-weapon'){assert.equal(r.acceptedAction.kind,'weapon');assert.equal(r.weaponAction,r.acceptedAction);advance(.06);check(.5);}
  else {const slot=order==='slot-slot'?3:2,duration=slot===3?1:.8;assert.equal(r.acceptedAction.kind,'slot');assert.equal(r.acceptedAction.slot,slot);assert.equal(r.weaponAction,null);advance(duration/2);checkSlot(slot,.5);}
  r.dispose();
}
console.log('hero-runtime-test: four instant native IDs/five slot mappings use actual Odometer joints, cast-time damage, accepted misses, normal-dt phase/expiry/repeat, rejections, lifecycle and latest-acceptance reentry; no proposed-kit or looping-slot acceptance');
// Optional slow lifetime is definition admission, never mutable-client expiry authority.
const badSlowDurations=[undefined,null,0,-1,NaN,Infinity,-Infinity,'0.5',true,[],{},3600.01];
let slowDurationRejects=0;
for(const original of heroes)for(const originalAbility of original.abilities) {
  const kit=structuredClone(original),a=kit.abilities.find(b=>b.slot===originalAbility.slot);a.slowDuration=.5;
  const {runtime:r,rejected}=hostFixture(kit); // Host baseline is valid before client-only mutation.
  assert.ok(r.fire());assert.ok(r.cast(kit.abilities.find(b=>b!==a).slot));
  const aim=r.aimHit;r.aimHit=()=>assert.fail(`${a.id}: malformed slowDuration reached aim`);
  for(const value of badSlowDurations){a.slowDuration=value;rejected(a.slot);slowDurationRejects++;}
  r.aimHit=aim;r.dispose();
}
assert.equal(slowDurationRejects,heroes.reduce((n,k)=>n+k.abilities.length,0)*badSlowDurations.length);
for(const pure of [false,true]) {
  const kit=structuredClone(heroes[3]),a=kit.abilities[1];a.slowDuration=.5;
  if(pure)Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4});
  const {runtime:r,enemy,events}=hostFixture(kit);
  for(const value of badSlowDurations){a.slowDuration=value;r.hit(a,enemy);assert.equal(events.length,0,'direct hit cannot bypass optional lifetime admission');}
  r.dispose();
}
for(const slowDuration of [Number.MIN_VALUE,3600]) {
  const kit=structuredClone(heroes[3]);kit.abilities[1].slowDuration=slowDuration;
  const {runtime:r}=hostFixture(kit);assert.ok(r.cast(2));r.dispose();
}
// Synthetic ORIGINAL Gooey/native aura: caster-centered existing dispatcher,
// not a proposed zone/kit or a new remote-origin authority. No HP/lock grants.
for(const end of ['leave','expire','legacy-omission']) {
  const kit=structuredClone(heroes[3]),a=kit.abilities[3];
  Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:3,interval:.25,range:12,radius:9});
  if(end!=='legacy-omission')a.slowDuration=.5;
  const {runtime:r,sim,enemy,events}=hostFixture(kit),effect=r.onEffect,pulses=[];
  if(end==='leave')a.slowDuration=1000; // Valid client mutation cannot alter immutable host .5 baseline.
  const hp=sim.heroes.map(h=>h.hp),statusDuration=end==='legacy-omission'?3:.5;
  r.onEffect=event=>{effect(event);if(event.kind==='status'&&event.target===enemy.id)pulses.push(sim.time);};
  const step=()=>{r.update(.05);assert.ok(sim.step(.05).ok);};
  assert.ok(r.cast(4));const owner=r.buffs.aura,handle=owner.handle;
  for(let i=0;i<20;i++)step();
  assert.ok(pulses.length>=3,'normal .25 cadence refreshes while inside beyond first .5 lifetime');
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8);assert.ok(owner.left>0&&handle.remaining>0);assert.equal(r.acceptedAction,null);
  if(end==='expire')while(r.buffs.aura)step();
  else assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:-20}).ok);
  const count=pulses.length,until=pulses.at(-1)+statusDuration;
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'slow lingers after leaving or owner expiry');
  while(sim.time+.05<until-1e-8)step();
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'expiry is last accepted refresh plus host duration');
  step();step();assert.equal(sim.stats(enemy.id).moveSpeed,8);assert.equal(pulses.length,count);
  if(end==='leave')assert.ok(r.buffs.aura&&handle.remaining>0,'short slow expires while owner FX/buff remains');
  if(end!=='leave'){assert.equal(r.buffs.aura,undefined);assert.equal(handle.remaining,0);}
  assert.deepEqual(sim.heroes.map(h=>h.hp),hp);assert.ok(events.every(e=>!Object.hasOwn(e,'slowDuration')),'standard intent does not carry client slow lifetime');
  r.dispose();
}
for(const explicit of [true,false]) {
  const kit=structuredClone(heroes[3]),a=kit.abilities[1];Object.assign(a,{slow:.5,duration:3});if(explicit)a.slowDuration=.5;
  const {runtime:r,sim,enemy,events}=hostFixture(kit),hp=enemy.hp;
  if(explicit)a.slowDuration=1000;
  assert.ok(r.cast(2));assert.ok(enemy.hp<hp);const damagedHP=enemy.hp,handle=[...r.fx.handles.keys()].find(h=>h.group.name==='glue');
  assert.equal(events.filter(e=>e.kind==='damage').length,1);assert.equal(sim.stats(enemy.id).moveSpeed,4);
  for(let i=0;i<11;i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.equal(enemy.hp,damagedHP);assert.equal(events.filter(e=>e.kind==='damage').length,1);
  if(explicit){assert.equal(sim.stats(enemy.id).moveSpeed,8);assert.ok(handle.remaining>0,'fixed .8 glue FX outlives .5 slow');}
  else {assert.equal(sim.stats(enemy.id).moveSpeed,4);for(let i=0;i<51;i++){r.update(.05);assert.ok(sim.step(.05).ok);}assert.equal(sim.stats(enemy.id).moveSpeed,8);}
  assert.ok(events.every(e=>!Object.hasOwn(e,'slowDuration')));r.dispose();
}
console.log(`hero-runtime-test: ${slowDurationRejects} malformed client slow lifetimes rejected before aim in nonempty state; direct-hit guard, finite positive boundaries, native aura refresh/last-application linger, independent FX owner, damaging single hit and exact legacy omission lifetime checked against real host`);
// Existing ORIGINAL kits, real host/scene: fast public cooldown modifier makes
// native buff overlap reachable. No duration/rate/data changes or HP grants.
// S20 authoritative cancellation of existing native buffs, real Host/scene.
// Original kits, no HP grants; headshot probes use accepted native fire/API.
for(const id of ['overtime','headshot','xray','chaingun','aura'])for(const method of ['reset','dispose']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),f=hostFixture(kit),r=f.runtime,a=kit.abilities.find(a=>a.id===id);if(id!=='headshot')r.targets=[];
  assert.ok(r.cast(a.slot));const owner=r.buffs[id];let headshot;
  if(id==='overtime'){assert.equal(f.sim.stats('player').invulnerable,true);assert.equal(f.sim.stats('player').moveSpeed,12);}
  if(id==='headshot'){const hp=f.enemy.hp;f.controller.pitch=Math.atan2(.4,8);assert.ok(r.fire());headshot=f.events.at(-1);assert.equal(headshot.headshotMultiplier,3);assert.ok(f.enemy.hp<hp);}
  const effect=r.onEffect;let ends=0;r.onEffect=event=>{effect(event);if(event.kind==='buff-end'&&event.ability===id){ends++;assert.equal(r.buffs[id],undefined,'owner consumed before Host cleanup callback');assert.equal(owner.handle.remaining,0);assert.equal(r.fire(),false,'reset barrier covers new buff cleanup callbacks');assert.equal(r.reset(),undefined);}};
  r[method]();assert.equal(ends,1);assert.equal(r.buffs[id],undefined);assert.equal(owner.handle.remaining,0);assert.equal(owner.handle.group.parent,null);assert.equal(r.fx.count,0);assert.equal(r.removeBuff(id,owner),false);assert.equal(ends,1);
  if(id==='overtime'){assert.equal(f.sim.stats('player').invulnerable,false);assert.equal(f.sim.stats('player').moveSpeed,8);assert.equal(f.controller.speedMultiplier,1);}
  if(headshot){const before=JSON.stringify([f.sim.heroes,f.sim.events]);assert.equal(f.sim.applyHeroEffect(headshot).ok,false,'cancelled Host headshot no longer admits old higher factor');assert.equal(JSON.stringify([f.sim.heroes,f.sim.events]),before);}
  r.reset();r.dispose();assert.equal(ends,1,'repeated cleanup cannot re-end consumed owner');assert.equal(f.scene.children.length,0);
}
{
  const f=hostFixture(structuredClone(heroes[2])),r=f.runtime;r.setModifiers({cooldown:.01});assert.ok(r.cast(3));const old=r.buffs.headshot;for(let i=0;i<3;i++){r.update(.05);assert.ok(f.sim.step(.05).ok);}assert.ok(r.cast(3));const fresh=r.buffs.headshot;
  assert.equal(f.events.filter(e=>e.kind==='buff-end').length,0,'refresh remains end-free');assert.equal(r.removeBuff('headshot',old),false);assert.equal(r.buffs.headshot,fresh);assert.ok(r.fx.handles.has(fresh.handle));assert.equal(f.events.filter(e=>e.kind==='buff-end').length,0,'stale owner cannot revoke refreshed Host status');
  f.controller.pitch=Math.atan2(.4,8);assert.ok(r.fire());const headshot=f.events.at(-1);assert.equal(headshot.headshotMultiplier,3);assert.equal(r.removeBuff('headshot',fresh),true);assert.equal(r.removeBuff('headshot',fresh),false);assert.equal(f.events.filter(e=>e.kind==='buff-end').length,1);assert.equal(f.sim.applyHeroEffect(headshot).ok,false);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const method of ['reset','dispose']) {
  const f=hostFixture(structuredClone(heroes[2])),r=f.runtime;assert.ok(r.cast(3));assert.ok(r.cast(4));const first=r.buffs.headshot,later=r.buffs.xray;f.controller.pitch=Math.atan2(.4,8);assert.ok(r.fire());const headshot=f.events.at(-1),hp=f.enemy.hp,effect=r.onEffect,primary=new Error(`primary buff ${method} cancellation failure`);let thrown=false;
  r.onEffect=event=>{effect(event);if(!thrown&&event.kind==='buff-end'&&event.ability==='headshot'){thrown=true;throw primary;}};
  assert.throws(()=>r[method](),error=>error===primary);assert.equal(r.buffs.headshot,undefined);assert.equal(first.handle.remaining,0);assert.equal(r.buffs.xray,later);assert.ok(r.fx.handles.has(later.handle),'later owner remains pending after aborted teardown');assert.equal(f.enemy.hp,hp,'accepted HP is not rolled back');assert.equal(f.sim.applyHeroEffect(headshot).ok,false);assert.equal(r.removeBuff('headshot',first),false);
  r.onEffect=effect;r[method]();assert.deepEqual(r.buffs,{});assert.equal(r.fx.count,0);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length,1);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='xray').length,1);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=hostFixture(structuredClone(heroes[2])),r=f.runtime;assert.ok(r.cast(3));assert.ok(f.sim.damage('player',1e6,f.enemy.id,{kind:'ability'}).killed);r.reset();assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length,1,'dead-source native buff cleanup still reaches actual Host');r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: all 5 native buffs end exactly once on reset/dispose; Overtime Host stats and headshot authority revoke, stale removal cannot end fresh owner, callback failures consume one owner and explicit retry cleans remaining owners without HP rollback');
// S19 terminal native admission on real Host/scene fixtures, not a Host security
// filter or a promise of complete teardown when a cleanup callback throws.
function assertClosedNative(f,label) {
  const r=f.runtime,magazine=r.modifiers.magazine;r.setModifiers({magazine:magazine+1});assert.equal(r.modifiers.magazine,magazine+1);assert.ok(r.ammo>0&&r.ammo<r.modifiers.magazine,'public config makes reload otherwise ready without private ammo writes');
  const camera=new THREE.PerspectiveCamera(70,1,.1,200);f.controller.updateCamera(camera,0);r.aim(camera);assert.equal(r.camera,camera);assert.equal(r.snapshot().hero,r.kit.id);
  const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,recoil:r.recoil,heroes:f.sim.heroes,stats:f.sim.heroes.map(h=>f.sim.stats(h.id)),worldTime:f.sim.time,hostEvents:f.sim.events,intents:f.events,position:f.controller.position,velocity:f.controller.velocity,visual:r.visual.group.position,fx:[...r.fx.handles.keys()].map(h=>[h.remaining,h.position,h.group.name])});
  const aim=r.aimHit;let aims=0;r.aimHit=function(...args){aims++;return aim.apply(this,args);};
  try {for(const [name,run,expected] of [['fire',()=>r.fire(),false],['cast',()=>r.cast(2),false],['melee',()=>r.melee(),false],['parry',()=>r.parry(),false],['reload',()=>r.startReload(),undefined],['update',()=>r.update(.05),undefined]]) {
    const before=state(),handles=[...r.fx.handles.keys()],children=[...f.scene.children];assert.equal(run(),expected,`${label}/${name}: closed return type`);assert.equal(state(),before,`${label}/${name}: no native mutation`);assert.deepEqual([...r.fx.handles.keys()],handles);assert.deepEqual(f.scene.children,children);
  }assert.equal(aims,0);}finally{r.aimHit=aim;}
}
{
  const f=tetherAdoptionFixture(),r=f.runtime;assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);assert.ok(r.cast(2));const hp=f.enemy.hp;r.dispose();
  assert.equal(r.fire(),false,'stale disposed runtime must not admit a new native weapon hit');assert.equal(f.enemy.hp,hp);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(r.fx.count,0);assert.equal(f.scene.children.length,0);
  assertClosedNative(f,'after successful dispose');r.reset();assertClosedNative(f,'after public reset on closed instance');r.dispose();assert.equal(f.scene.children.length,0);
  const independent=tetherAdoptionFixture();assert.ok(independent.runtime.fire(),'new independent Runtime is not terminally closed');independent.runtime.dispose();assert.equal(independent.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime;assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);assert.ok(r.cast(2));const effect=r.onEffect,fxDispose=r.fx.dispose,visualDispose=r.visual.dispose;let nested=false,fxCalls=0,visualCalls=0;
  r.onEffect=event=>{effect(event);if(!nested&&event.kind==='tether-end'){nested=true;assert.equal(r.dispose(),undefined,'nested disposal during cleanup is a no-op');}};
  r.fx.dispose=function(){fxCalls++;assertClosedNative(f,'before FX disposal after reset');assert.equal(r.dispose(),undefined);return fxDispose.call(this);};
  r.visual.dispose=function(){visualCalls++;assertClosedNative(f,'before visual disposal after reset');assert.equal(r.dispose(),undefined);return visualDispose.call(this);};
  r.dispose();assert.ok(nested);assert.equal(fxCalls,1);assert.equal(visualCalls,1);assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(f.scene.children.length,0);
  const before=JSON.stringify([r.snapshot(),f.events,f.sim.events]);r.dispose();r.dispose();assert.equal(fxCalls,1);assert.equal(visualCalls,1);assert.equal(JSON.stringify([r.snapshot(),f.events,f.sim.events]),before,'successful repeated disposal does no cleanup work');
}
{
  const f=hostFixture(structuredClone(heroes[3])),r=f.runtime;assert.ok(r.cast(1));const start=f.events.find(e=>e.kind==='deployment-start');r.dispose();
  assert.equal(r.cast(1),false,'closed persistent native cast cannot register a new Host anchor');r.reset();assert.equal(r.cast(1),false);assert.equal(f.events.filter(e=>e.kind==='deployment-start').length,1);assert.equal(f.events.filter(e=>e.kind==='deployment-end').length,1);
  const before=JSON.stringify([f.sim.heroes,f.sim.events]);assert.equal(f.sim.applyHeroEffect({...start,kind:'damage',target:f.enemy.id}).ok,false,'closed admission must not suppress real old-anchor cleanup');assert.equal(JSON.stringify([f.sim.heroes,f.sim.events]),before);assert.equal(r.fx.count,0);assert.equal(f.scene.children.length,0);
}
for(const phase of ['Host cleanup','FX disposal']) {
  const f=tetherAdoptionFixture(),r=f.runtime,primary=new Error(`primary ${phase} disposal failure`);r.setModifiers({cooldown:.01});assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);assert.ok(r.cast(2));for(let i=0;i<3;i++)f.step();const hp=f.enemy.hp,fxDispose=r.fx.dispose,visualDispose=r.visual.dispose;let fail=true,fxAttempts=0,fxCalls=0,visualCalls=0;
  r.onEffect=event=>{f.effect(event);if(fail&&phase==='Host cleanup'&&event.kind==='tether-end'){fail=false;throw primary;}};
  r.fx.dispose=function(){fxAttempts++;if(fail&&phase==='FX disposal'){fail=false;throw primary;}fxCalls++;return fxDispose.call(this);};r.visual.dispose=function(){visualCalls++;return visualDispose.call(this);};
  assert.throws(()=>r.dispose(),error=>error===primary);assert.equal(f.enemy.hp,hp,'no already-applied Host HP rollback claim');assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(fxCalls,0);assert.equal(visualCalls,0,'later cleanup stages were not attempted after failure');assert.equal(fxAttempts,phase==='Host cleanup'?0:1);
  r.onEffect=f.effect;assertClosedNative(f,`${phase} failure still closed`);r.reset();assertClosedNative(f,'explicit cleanup reset cannot reopen admission');
  r.dispose();assert.equal(fxCalls,1);assert.equal(visualCalls,1);assert.equal(fxAttempts,phase==='Host cleanup'?1:2);assert.equal(r.fx.count,0);assert.equal(f.scene.children.length,0);
  const attempts=fxAttempts;r.dispose();assert.equal(fxAttempts,attempts);assert.equal(visualCalls,1);assertClosedNative(f,'successful explicit retry remains closed');
}
console.log('hero-runtime-test: terminal disposal blocks native actions at entry/stale reference/resource stages; nested/repeated success is idempotent, real Host cleanup survives closure, primary failures stay closed with explicit retry, reset cannot reopen, independent instance works');
// S18 public reset is synchronously quiescent, with real Host-first cleanup.
// CPU native-kit fixtures/API placement are not native gameplay acceptance.
{
  const f=tetherAdoptionFixture(),r=f.runtime;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));for(let i=0;i<3;i++)f.step();const hp=f.enemy.hp;let entered=false,admitted;
  r.onEffect=event=>{f.effect(event);if(!entered&&event.kind==='tether-end'){entered=true;admitted=r.cast(2);}};
  r.reset();assert.ok(entered);assert.equal(admitted,false,'public reset cleanup cannot admit a replacement tether hit');assert.equal(r.tether,null);assert.equal(f.enemy.hp,hp);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(f.events.filter(e=>e.kind==='damage').length,1);assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);
  assert.ok(r.cast(2),'actions after reset returns stay enabled');r.reset();assert.ok(r.fire());const time=r.time;r.update(.05);assert.ok(r.time>time);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime;assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);r.setModifiers({cooldown:.01});assert.ok(r.fire());assert.ok(r.cast(2));for(let i=0;i<19;i++)f.step();
  assert.equal(r.fireWait,0);assert.equal(r.reload,0);assert.ok(r.ammo>0&&r.ammo<r.modifiers.magazine);assert.equal(r.cooldowns[2],0);assert.equal(r.meleeWait,0);assert.equal(r.parryWait,0);assert.ok(r.tether&&r.tether.left>0);let entered=false;
  r.onEffect=event=>{f.effect(event);if(entered||event.kind!=='tether-end')return;entered=true;
    const aim=r.aimHit;let aims=0;r.aimHit=function(...args){aims++;return aim.apply(this,args);};
    const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,recoil:r.recoil,heroes:f.sim.heroes,stats:f.sim.heroes.map(h=>f.sim.stats(h.id)),worldTime:f.sim.time,hostEvents:f.sim.events,intents:f.events,position:f.controller.position,velocity:f.controller.velocity,state:f.controller.state,fx:[...r.fx.handles.keys()].map(h=>[h.remaining,h.position,h.group.name])});
    try {
      for(const [name,run,expected] of [['cast',()=>r.cast(2),false],['fire',()=>r.fire(),false],['melee',()=>r.melee(),false],['parry',()=>r.parry(),false],['reload',()=>r.startReload(),undefined],['update',()=>r.update(.05),undefined],['nested reset',()=>r.reset(),undefined]]) {
        const before=state(),handles=[...r.fx.handles.keys()],children=[...f.scene.children];assert.equal(run(),expected,`${name} keeps its documented reset-time return type`);assert.equal(state(),before,`${name} has no reset-time aim/cost/FX/HP/timer mutation`);assert.deepEqual([...r.fx.handles.keys()],handles);assert.deepEqual(f.scene.children,children);
      }
      assert.equal(aims,0);assert.doesNotThrow(()=>{r.setModifiers({cooldown:.01});r.aim(r.camera);r.snapshot();},'config/aim/read helpers are not new blocked features');
    } finally {r.aimHit=aim;}
  };
  r.reset();assert.ok(entered);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.ok(r.fire());assert.equal(r.startReload(),undefined);assert.ok(r.reload>0);assert.ok(r.melee());assert.ok(r.parry());const time=r.time;r.update(.05);assert.ok(r.time>time);r.reset();assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const id of ['turret','puddle']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id),f=hostFixture(kit),r=f.runtime;r.targets=[];r.setModifiers({cooldown:.01});assert.ok(r.cast(a.slot));const old=r.deployments[0],start=f.events.find(e=>e.kind==='deployment-start');
  while(r.cooldowns[a.slot]>0){r.update(.05);assert.ok(f.sim.step(.05).ok);}let entered=false,admitted;
  r.onEffect=event=>{f.events.push(event);const result=f.sim.applyHeroEffect(event);assert.ok(result.ok);if(!entered&&event.kind==='deployment-end'){entered=true;admitted=r.cast(a.slot);}return result;};
  r.reset();assert.ok(entered);assert.equal(admitted,false,'public reset cleanup cannot leave an orphan Host anchor');assert.equal(f.events.filter(e=>e.kind==='deployment-start').length,1);assert.equal(r.deploymentSequence,old.deploymentId);assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);
  const intent={...start,kind:'damage',target:f.enemy.id,origin:{...start.origin,y:start.origin.y+(id==='turret'?.9:0)}},before=JSON.stringify([f.sim.heroes,f.sim.events]);assert.equal(f.sim.applyHeroEffect(intent).ok,false,'real cleanup still revokes the old Host anchor');assert.equal(JSON.stringify([f.sim.heroes,f.sim.events]),before);
  assert.ok(r.cast(a.slot));assert.ok(r.deployments[0].deploymentId>old.deploymentId);r.reset();r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime,primary=new Error('primary reset cleanup exception');assert.ok(r.cast(2));const hp=f.enemy.hp;let entered=false;
  r.onEffect=event=>{f.effect(event);if(!entered&&event.kind==='tether-end'){entered=true;throw primary;}};
  assert.throws(()=>r.reset(),error=>error===primary);assert.equal(r.tether,null);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(f.enemy.hp,hp,'cleanup exception is not a Host HP rollback');
  r.onEffect=f.effect;assert.ok(r.fire(),'finally releases reset admission even when cleanup throws');r.reset();assert.ok(r.cast(2));r.update(.05);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4);r.reset();assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: public reset blocks ready native actions/reload/update/nested reset before mutation; actual tether/emitter cleanup still reaches Host, after-return actions resume, primary cleanup exception unlocks without rollback claim');
// S17 ORIGINAL Snipeoff/native tether, real Host-first callbacks and API
// placement. CPU ownership proof, not native geometry or a proposed kit.
function tetherAdoptionFixture() {
  const f=hostFixture(structuredClone(heroes[2])),other=f.sim.addHero({id:'tether-other',team:'ivory',position:{x:5,y:0,z:0}});f.runtime.targets=[...f.sim.heroes];
  return {...f,other,a:f.runtime.kit.abilities.find(a=>a.id==='tether'),effect:f.runtime.onEffect,step(){f.runtime.update(.05);assert.ok(f.sim.step(.05).ok);}};
}
for(const method of ['reset','dispose']) {
  const f=tetherAdoptionFixture(),r=f.runtime,hp=f.enemy.hp;let entered=false,pending;
  r.onEffect=event=>{f.effect(event);if(!entered&&event.kind==='damage'&&event.ability==='tether'){entered=true;pending=r.tether;r[method]();}};
  assert.ok(r.cast(2));assert.ok(entered);assert.ok(r.tether===null,'hit callback reset/dispose must not resurrect tether after callback');assert.ok(pending&&pending.targetId===f.enemy.id,'new pending owner is visible before hit callback');
  assert.ok(f.enemy.hp<hp,'already accepted Host HP is not rolled back');assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(pending.handle.remaining,0);assert.equal(r.fx.count,0);
  assert.equal(f.events.filter(e=>e.kind==='damage').length,1);assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const target of ['same','different']) {
  const f=tetherAdoptionFixture(),r=f.runtime;let entered=false,oldPending,fresh;
  r.onEffect=event=>{f.effect(event);if(!entered&&event.kind==='damage'&&event.ability==='tether'){
    entered=true;oldPending=r.tether;r.reset();if(target==='different'){assert.ok(f.sim.moveHero(f.enemy.id,{x:10,y:0,z:0}).ok);assert.ok(f.sim.moveHero(f.other.id,{x:.55,y:0,z:0}).ok);}assert.ok(r.cast(2));fresh=r.tether;
  }};
  assert.ok(r.cast(2));const current=target==='same'?f.enemy:f.other;assert.ok(fresh&&r.tether===fresh,'outer hit must not overwrite callback-created latest tether');assert.notEqual(fresh,oldPending);assert.equal(fresh.targetId,current.id);assert.equal(fresh.left,f.a.duration);assert.ok(r.fx.handles.has(fresh.handle));assert.equal(oldPending.handle.remaining,0);
  assert.deepEqual(f.events.filter(e=>['damage','tether-end'].includes(e.kind)).map(e=>[e.kind,e.target]),[['damage',f.enemy.id],['tether-end',f.enemy.id],['damage',current.id]],'old Host cleanup completes before new hit/status');
  assert.equal(f.sim.stats(current.id).moveSpeed,4);if(target==='different')assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);f.step();assert.equal(f.events.filter(e=>e.kind==='damage').length,2);
  r.reset();assert.equal(f.sim.stats(current.id).moveSpeed,8);assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));const old=r.tether;for(let i=0;i<3;i++)f.step();let entered=false,pending,fresh;
  r.onEffect=event=>{f.effect(event);if(!entered&&event.kind==='tether-end'){
    entered=true;pending=r.tether;r.reset();assert.ok(f.sim.moveHero(f.enemy.id,{x:10,y:0,z:0}).ok);assert.ok(f.sim.moveHero(f.other.id,{x:.55,y:0,z:0}).ok);assert.ok(r.cast(2));fresh=r.tether;
  }};
  assert.ok(r.cast(2));assert.ok(pending&&pending!==old&&pending!==fresh,'old cleanup callback sees cancellable pending owner');assert.ok(r.tether===fresh,'old-end reentry must not restore outer pending owner');assert.equal(fresh.targetId,f.other.id);assert.equal(pending.handle.remaining,0);assert.equal(old.handle.remaining,0);assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name==='tether').length,1);
  assert.deepEqual(f.events.filter(e=>['damage','tether-end'].includes(e.kind)).map(e=>[e.kind,e.target]),[['damage',f.enemy.id],['tether-end',f.enemy.id],['tether-end',f.enemy.id],['damage',f.other.id]],'old and cancelled-pending cleanup precede latest hit, never follow it');
  assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(f.sim.stats(f.other.id).moveSpeed,4);r.reset();assert.equal(f.sim.stats(f.other.id).moveSpeed,8);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const reenter of [false,true]) {
  const f=tetherAdoptionFixture(),r=f.runtime;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));for(let i=0;i<3;i++)f.step();r.targets=[];let entered=false,fresh;
  r.onEffect=event=>{f.effect(event);if(reenter&&!entered&&event.kind==='tether-end'){entered=true;r.reset();r.targets=[...f.sim.heroes];assert.ok(r.cast(2));fresh=r.tether;}};
  assert.ok(r.cast(2));
  if(reenter){assert.ok(fresh&&r.tether===fresh);assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name==='tether').length,1,'reset cancels outer miss FX; only latest owner survives');assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4);assert.equal(f.events.filter(e=>e.kind==='damage').length,2);}
  else {assert.equal(r.tether,null);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.equal(f.events.filter(e=>e.kind==='damage').length,1);assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);assert.equal(r.fx.count,1);for(let i=0;i<13;i++)f.step();assert.equal(r.fx.count,0,'legitimate miss visual expires without fabricated link');}
  r.reset();assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));for(let i=0;i<3;i++)f.step();const old=r.tether,handles=[...r.fx.handles.keys()],casts=r.castCount.tether,remaining=old.handle.remaining,emit=r.fx.emit,primary=new Error('primary tether factory failure');
  r.fx.emit=function(id,...args){if(id==='tether')throw primary;return emit.call(this,id,...args);};assert.throws(()=>r.cast(2),error=>error===primary);assert.equal(r.tether,old);assert.equal(old.handle.remaining,remaining);assert.deepEqual([...r.fx.handles.keys()],handles);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4);assert.equal(f.events.filter(e=>e.kind==='tether-end').length,0);
  assert.equal(r.castCount.tether,casts+1);assert.equal(r.cooldowns[2],f.a.cooldown*.01,'factory failure does not roll back committed cast costs');r.fx.emit=emit;r.reset();assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=tetherAdoptionFixture(),r=f.runtime,hp=f.enemy.hp,primary=new Error('primary tether hit callback failure');r.onEffect=event=>{f.effect(event);if(event.kind==='damage')throw primary;};
  assert.throws(()=>r.cast(2),error=>error===primary);assert.ok(r.tether,'accepted pending owner remains available for cleanup after callback throws');assert.ok(f.enemy.hp<hp);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4);r.reset();assert.equal(r.tether,null);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: tether pending adoption precedes Host-first callbacks; reset/dispose/recast/old-end reentry/miss/factory failure preserve latest ownership and ordered slow cleanup; primary callback exception and accepted HP boundaries checked');
// S16 native ORIGINAL Gooey continuous producers; real Host/API injury and
// placement are CPU fixtures, not native geometry/balance acceptance.
function continuousPulseFixture(id) {
  const f=hostFixture(structuredClone(heroes[3])),r=f.runtime,a=r.kit.abilities.find(a=>a.id===id);
  if(id==='puddle')assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);
  const source=f.sim.heroes.find(h=>h.id==='player'),friend=f.sim.heroes.find(h=>h.id==='friend'),other=f.sim.addHero({id:'pulse-other-ally',team:'carbon',position:{x:2,y:0,z:6}});
  for(const target of [source,friend,other])assert.ok(f.sim.damage(target.id,100,f.enemy.id,{kind:'ability'}).ok);
  r.targets=[...f.sim.heroes,...f.sim.structures];const hp={source:source.hp,friend:friend.hp,other:other.hp,enemy:f.enemy.hp};return {...f,a,source,friend,other,hp};
}
for(const mode of ['reset','recast']) {
  const f=continuousPulseFixture('aura'),r=f.runtime,effect=r.onEffect;assert.ok(r.cast(4));const old=r.buffs.aura;let cancelled=false,fresh;
  r.onEffect=event=>{effect(event);if(!cancelled&&event.kind==='heal'&&event.target===f.friend.id){cancelled=true;r.reset();if(mode==='recast'){assert.ok(r.cast(4));fresh=r.buffs.aura;}}};
  r.update(.05);assert.ok(f.sim.step(.05).ok);assert.ok(cancelled);assert.equal(f.friend.hp,f.hp.friend+f.a.baseHeal,'first accepted heal is not rolled back');
  assert.equal(f.other.hp,f.hp.other,'cancelled continuous aura cannot heal remaining ally');assert.equal(f.source.hp,f.hp.source,'cancelled aura cannot perform final self heal');assert.equal(f.events.filter(e=>e.kind==='heal').length,1);assert.equal(old.handle.remaining,0);
  if(fresh) {
    assert.equal(r.buffs.aura,fresh);assert.equal(fresh.left,f.a.duration);assert.equal(fresh.next,0);assert.ok(r.fx.handles.has(fresh.handle));r.update(.05);assert.ok(f.sim.step(.05).ok);
    assert.equal(f.friend.hp,f.hp.friend+2*f.a.baseHeal);assert.equal(f.other.hp,f.hp.other+f.a.baseHeal);assert.equal(f.source.hp,f.hp.source+f.a.baseHeal);assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target==='player').length,1);
  } else {assert.equal(r.buffs.aura,undefined);r.update(.05);assert.equal(f.events.filter(e=>e.kind==='heal').length,1);}
  r.reset();assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const mode of ['reset','recast','remove']) {
  const f=continuousPulseFixture('puddle'),r=f.runtime,effect=r.onEffect;assert.ok(r.cast(1));const old=r.deployments[0];let cancelled=false,fresh;
  r.onEffect=event=>{effect(event);if(!cancelled&&event.kind==='damage'&&event.ability==='puddle'){cancelled=true;if(mode==='remove')assert.equal(r.removeDeployment(old),true);else r.reset();if(mode==='recast'){assert.ok(r.cast(1));fresh=r.deployments[0];}}};
  assert.doesNotThrow(()=>r.update(.05),'cancelled puddle pulse must not emit later stale-ID heal intents');assert.ok(f.sim.step(.05).ok);assert.ok(cancelled);assert.ok(f.enemy.hp<f.hp.enemy);assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability==='puddle').length,1);
  assert.equal(f.friend.hp,f.hp.friend);assert.equal(f.other.hp,f.hp.other);assert.equal(f.source.hp,f.hp.source);assert.equal(f.events.filter(e=>e.kind==='heal').length,0);assert.equal(old.handle.remaining,0);
  if(fresh) {
    assert.deepEqual(r.deployments,[fresh]);assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(fresh.left,f.a.duration);assert.equal(fresh.next,0);assert.ok(r.fx.handles.has(fresh.handle));r.update(.05);assert.ok(f.sim.step(.05).ok);
    assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability==='puddle').length,2);for(const [target,key] of [[f.source,'source'],[f.friend,'friend'],[f.other,'other']]){assert.equal(target.hp,f.hp[key]+f.a.baseHeal);assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target===target.id).length,1);}
  } else {assert.equal(r.deployments.length,0);r.update(.05);assert.equal(f.events.filter(e=>e.kind==='heal').length,0);}
  assert.equal(f.events.filter(e=>e.kind==='damage'&&e.baseDamage===0).length,0);r.reset();assert.equal(r.fx.count,0);assert.equal(f.boxes.length,0);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const id of ['aura','puddle']) {
  const f=continuousPulseFixture(id),r=f.runtime;assert.ok(r.cast(f.a.slot));r.update(.05);assert.ok(f.sim.step(.05).ok);
  for(const [target,key] of [[f.source,'source'],[f.friend,'friend'],[f.other,'other']]){assert.equal(target.hp,f.hp[key]+f.a.baseHeal);assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target===target.id).length,1,'uncancelled continuous area still heals all eligible allies/self once');}
  assert.equal(f.events.filter(e=>e.kind==='damage').length,id==='puddle'?1:0);assert.equal(f.events.filter(e=>e.kind==='heal'&&f.sim.structures.some(s=>s.id===e.target)).length,0);r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: native continuous aura/puddle stop remaining targets/self on reset, same-ID replacement or removal; first application stays committed, fresh owners wait next tick, uncancelled all-target healing and retained one-shot S14 AoE remain checked');
// S15 synthetic ORIGINAL native four-slot CPU fixtures, not authored balance or
// native scene/clock acceptance. Only public casts/reset and real host injury.
{
  const kit=structuredClone(heroes[2]);for(const id of ['xray','headshot'])kit.abilities.find(a=>a.id===id).duration=.05;
  const f=hostFixture(kit),r=f.runtime,effect=r.onEffect;assert.ok(r.cast(4));assert.ok(r.cast(3));const stale=r.buffs.headshot;let fresh,cancelEnds;
  r.onEffect=event=>{effect(event);if(event.kind==='buff-end'&&event.ability==='xray'){r.reset();cancelEnds=f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length;assert.equal(cancelEnds,1,'reset legitimately ends the cancelled old headshot');assert.ok(r.cast(3));fresh=r.buffs.headshot;}};
  r.update(.05);assert.ok(fresh);assert.ok(r.buffs.headshot===fresh,'stale later expiry must not delete callback-created same-ID buff');assert.equal(fresh.left,.05);assert.equal(stale.left,.05);assert.equal(stale.handle.remaining,0);
  assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length,cancelEnds,'stale expiry emits no additional end after legitimate reset cancellation');assert.ok(f.sim.step(.05).ok);
  r.update(.05);assert.ok(f.sim.step(.05).ok);assert.equal(r.buffs.headshot,undefined);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length,cancelEnds+1,'fresh expiry emits exactly one additional end');r.dispose();assert.equal(f.scene.children.length,0);
}
for(const id of ['aura','chaingun']) {
  const kit=structuredClone(heroes[id==='aura'?3:1]),short=structuredClone(heroes[2].abilities.find(a=>a.id==='headshot'));short.slot=2;short.duration=.05;kit.abilities[1]=short;
  const f=hostFixture(kit),r=f.runtime,a=kit.abilities.find(a=>a.id===id),effect=r.onEffect,friend=f.sim.heroes.find(h=>h.id==='friend');
  if(id==='aura'){assert.ok(f.sim.damage('player',50,f.enemy.id,{kind:'ability'}).ok);assert.ok(f.sim.damage(friend.id,50,f.enemy.id,{kind:'ability'}).ok);}
  assert.ok(r.cast(2));assert.ok(r.cast(a.slot));const stale=r.buffs[id],before={left:stale.left,next:stale.next,position:stale.handle.position.toArray()},hp=f.enemy.hp,ownHP=f.sim.heroes.find(h=>h.id==='player').hp,allyHP=friend.hp;let fresh;
  r.onEffect=event=>{effect(event);if(event.kind==='buff-end'&&event.ability==='headshot'){r.reset();assert.ok(r.cast(a.slot));fresh=r.buffs[id];}};
  r.update(.05);assert.ok(f.sim.step(.05).ok);assert.equal(r.buffs[id],fresh);assert.equal(fresh.left,a.duration);assert.equal(fresh.next,0);
  assert.deepEqual({left:stale.left,next:stale.next,position:stale.handle.position.toArray()},before,'cancelled active buff is skipped before timer/position/pulse');
  assert.equal(f.enemy.hp,hp);assert.equal(friend.hp,allyHP);assert.equal(f.sim.heroes.find(h=>h.id==='player').hp,ownHP);assert.equal(f.events.filter(e=>['heal','damage'].includes(e.kind)).length,0);
  r.update(.05);assert.ok(f.sim.step(.05).ok);
  if(id==='aura'){assert.equal(friend.hp,allyHP+a.baseHeal);assert.equal(f.sim.heroes.find(h=>h.id==='player').hp,ownHP+a.baseHeal);assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target==='player').length,1);}
  else {assert.ok(f.enemy.hp<hp);assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability===id).length,1);}
  r.reset();assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const kit=structuredClone(heroes[3]),short=structuredClone(heroes[2].abilities.find(a=>a.id==='headshot'));short.slot=2;short.duration=.05;kit.abilities[1]=short;
  const f=hostFixture(kit),r=f.runtime;assert.ok(f.sim.damage('player',50,f.enemy.id,{kind:'ability'}).ok);const hp=f.sim.heroes.find(h=>h.id==='player').hp;
  assert.ok(r.cast(2));assert.ok(r.cast(4));const live=r.buffs.aura;r.update(.05);assert.ok(f.sim.step(.05).ok);
  assert.equal(r.buffs.aura,live);assert.ok(Math.abs(live.left-(kit.abilities[3].duration-.05))<1e-9);assert.equal(f.sim.heroes.find(h=>h.id==='player').hp,hp+kit.abilities[3].baseHeal,'uncancelled later owner still advances/pulses normally');r.dispose();
}
{
  const kit=structuredClone(heroes[1]),puddle=structuredClone(heroes[3].abilities[0]);puddle.slot=4;kit.abilities[3]=puddle;
  const f=hostFixture(kit),r=f.runtime,effect=r.onEffect;assert.ok(f.sim.damage('friend',50,f.enemy.id,{kind:'ability'}).ok);
  assert.ok(r.cast(1));assert.ok(r.cast(4));const stale=r.deployments[1],before={left:stale.left,next:stale.next,position:stale.position.toArray()},hp=f.enemy.hp,allyHP=f.sim.heroes.find(h=>h.id==='friend').hp;let fresh,initial;
  r.onEffect=event=>{effect(event);if(!fresh&&event.kind==='damage'&&event.ability==='turret'){r.reset();assert.ok(r.cast(1));fresh=r.deployments[0];initial={left:fresh.left,next:fresh.next,position:fresh.position.toArray()};}};
  assert.doesNotThrow(()=>r.update(.05),'cancelled puddle snapshot must not send rejected stale anchor intents');assert.ok(f.sim.step(.05).ok);
  assert.deepEqual(r.deployments,[fresh]);assert.deepEqual({left:fresh.left,next:fresh.next,position:fresh.position.toArray()},initial,'new same-loop turret stays unadvanced');assert.ok(r.fx.handles.has(fresh.handle));
  assert.deepEqual({left:stale.left,next:stale.next,position:stale.position.toArray()},before);assert.equal(stale.handle.remaining,0);assert.equal(f.events.filter(e=>e.ability==='puddle'&&['heal','damage'].includes(e.kind)).length,0);assert.equal(f.sim.heroes.find(h=>h.id==='friend').hp,allyHP);
  assert.ok(f.enemy.hp<hp);assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability==='turret').length,1);const after=f.enemy.hp;r.update(.05);assert.ok(f.sim.step(.05).ok);assert.ok(f.enemy.hp<after);assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability==='turret').length,2);
  r.reset();assert.equal(r.fx.count,0);assert.equal(f.boxes.length,0);r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: stale later buff expiry cannot delete/end fresh owner; cancelled aura/chaingun/deployment snapshots do not advance or pulse, replacements wait for their own next tick, unrelated live owners still tick, host callbacks/cleanup checked');
const replacingBuffIDs=['overtime','headshot','xray','chaingun','aura'];
function replacingBuffFixture(id) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
  const f=hostFixture(kit),r=f.runtime;r.targets=[];r.setModifiers({cooldown:.01});
  const step=()=>{r.update(.05);assert.ok(f.sim.step(.05).ok);};
  const buddy=kit.abilities.find(b=>b!==a&&replacingBuffIDs.includes(b.id))??kit.abilities.find(b=>b!==a);
  assert.ok(r.cast(buddy.slot));assert.ok(r.cast(a.slot));const old=r.buffs[id];
  while(r.cooldowns[a.slot]>0)step();
  return {...f,a,buddy,old,step};
}
for(const id of replacingBuffIDs) {
  const {runtime:r,sim,enemy,events,scene,a,buddy,old,step}=replacingBuffFixture(id),effect=r.onEffect;
  const others=[...r.fx.handles.keys()].filter(h=>h!==old.handle).map(h=>[h,h.remaining,h.group.parent]),otherBuff=r.buffs[buddy.id];
  let reentries=0;
  r.onEffect=event=>{effect(event);if(event.kind==='buff'&&event.ability===id){reentries++;assert.equal(r.cast(a.slot),false,'committed cooldown rejects same-slot callback reentry');}};
  assert.ok(r.cast(a.slot));const fresh=r.buffs[id];
  assert.notEqual(fresh,old);assert.notEqual(fresh.handle,old.handle);assert.equal(reentries,1);
  assert.equal(old.handle.remaining,0);assert.equal(r.fx.handles.has(old.handle),false);assert.equal(old.handle.group.parent,null);
  assert.ok(fresh.handle.remaining>0);assert.ok(r.fx.handles.has(fresh.handle));assert.equal(fresh.handle.group.parent,scene);
  assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name===id).length,1);
  assert.equal(r.buffs[buddy.id],otherBuff,'replacement leaves unrelated active buff record alone');
  for(const [handle,remaining,parent] of others){assert.ok(r.fx.handles.has(handle));assert.equal(handle.remaining,remaining);assert.equal(handle.group.parent,parent);}
  const ends=()=>events.filter(e=>e.kind==='buff-end'&&e.ability===id).length;
  assert.equal(events.filter(e=>e.kind==='buff'&&e.ability===id).length,2,'both starts accepted by actual host');assert.equal(ends(),0);
  old.handle.dispose();assert.equal(r.buffs[id],fresh);assert.ok(r.fx.handles.has(fresh.handle));assert.equal(ends(),0);
  while(r.time<=a.duration+.001)step(); // Cross OLD deadline using ordinary .05 updates.
  assert.equal(r.buffs[id],fresh);assert.ok(fresh.left>0&&fresh.handle.remaining>0);assert.equal(ends(),0);
  let headshotEvent;
  if(id==='overtime'){assert.equal(sim.stats('player').invulnerable,true);assert.equal(sim.stats('player').moveSpeed,12);}
  if(id==='headshot') {
    const hp=enemy.hp;r.hit(r.kit.weapon,enemy,{headshot:true,headshotMultiplier:a.headshotMultiplier});
    assert.ok(enemy.hp<hp,'refreshed host headshot buff still admits original multiplier past old deadline');headshotEvent=events.at(-1);
  }
  old.handle.dispose();assert.equal(r.buffs[id],fresh);assert.equal(ends(),0);
  for(let i=0;i<Math.ceil(a.duration/.05)+3&&r.buffs[id];i++)step();
  assert.equal(r.buffs[id],undefined);assert.equal(fresh.handle.remaining,0);assert.equal(fresh.handle.group.parent,null);
  assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name===id).length,0);assert.equal(ends(),1,'only NEW owner expiry emits one buff-end');
  if(id==='overtime'){assert.equal(sim.stats('player').invulnerable,false);assert.equal(sim.stats('player').moveSpeed,8);}
  if(headshotEvent){const hp=enemy.hp;assert.equal(sim.applyHeroEffect(headshotEvent).ok,false,'host multiplier expires with new owner');assert.equal(enemy.hp,hp);}
  // Reset/dispose while another native owner is alive must leave no orphan FX.
  assert.ok(r.cast(a.slot));r.reset();assert.equal(r.fx.count,0);assert.deepEqual(r.buffs,{});assert.deepEqual(scene.children,[r.visual.group]);
  assert.ok(r.cast(a.slot));r.dispose();assert.equal(r.fx.count,0);assert.equal(scene.children.length,0);
}
{
  const {runtime:r,events,scene,a,old}=replacingBuffFixture('overtime'),emit=r.fx.emit;
  const handles=[...r.fx.handles.keys()],remaining=old.handle.remaining,casts=r.castCount[a.id],starts=events.filter(e=>e.kind==='buff'&&e.ability===a.id).length;
  r.fx.emit=function(id,...args){if(id===a.id)throw new Error('injected new buff FX factory failure');return emit.call(this,id,...args);};
  assert.throws(()=>r.cast(a.slot),/injected new buff FX factory failure/);
  assert.equal(r.buffs[a.id],old);assert.equal(old.handle.remaining,remaining);assert.equal(old.handle.group.parent,scene);assert.deepEqual([...r.fx.handles.keys()],handles);
  assert.equal(r.castCount[a.id],casts+1);assert.equal(r.cooldowns[a.slot],a.cooldown*.01,'factory failure is NOT full cast rollback');
  assert.equal(events.filter(e=>e.kind==='buff'&&e.ability===a.id).length,starts);assert.equal(events.filter(e=>e.kind==='buff-end'&&e.ability===a.id).length,0);
  r.fx.emit=emit;r.dispose();assert.equal(scene.children.length,0);
}
console.log('hero-runtime-test: all 5 native buff replacements own one real FX handle; old handle disposal/deadline/repeated disposal cannot end refreshed owner; unrelated FX/buffs, host starts/observable status, callback reentry, new expiry/reset/dispose and factory failure without full rollback checked');
// Explicit timer-owner admission on synthetic ORIGINAL kits with real Odometer
// art/accepted weapon cue. Valid immutable host first, then client-only mutation.
const timedCastIDs=['overtime','headshot','xray','chaingun','aura','turret','barricade','grenade','missionbomb','tether','puddle'];
const badOwnerDurations=[['missing'],['undefined',undefined],['NaN',NaN],['infinite',Infinity],['negative-infinite',-Infinity],['null',null],['string','1'],['boolean',true],['array',[]],['object',{}],['negative',-1],['excess',3600.01]];
let ownerDurationRejects=0;
for(const id of timedCastIDs) {
  const kit=heroes.find(k=>k.abilities.some(a=>a.id===id));
  const {runtime:r,sim,rejected,joint}=weaponPoseFixture(kit),a=r.kit.abilities.find(a=>a.id===id);
  assert.ok(r.cast(r.kit.abilities.find(b=>b!==a).slot));assert.ok(r.fire());r.update(.03);assert.ok(sim.step(.03).ok);
  const cue=r.acceptedAction,pose=joint.quaternion.toArray();assert.equal(cue.kind,'weapon');
  const aim=r.aimHit;r.aimHit=()=>assert.fail(`${id}: invalid owner duration reached aim`);
  for(const [name,value] of badOwnerDurations) {
    if(name==='missing')delete a.duration;else a.duration=value;
    rejected(a.slot);assert.equal(r.acceptedAction,cue);assert.equal(r.weaponAction,cue);assert.deepEqual(joint.quaternion.toArray(),pose);ownerDurationRejects++;
  }
  r.aimHit=aim;r.dispose();
}
assert.equal(ownerDurationRejects,132);
for(const id of timedCastIDs)for(const duration of [0,Number.MIN_VALUE,3600]) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);a.duration=duration;
  const {runtime:r,sim,scene}=hostFixture(kit);assert.ok(r.cast(a.slot),`${id}: explicit finite ${duration} admits`);
  if(duration<3600) {
    r.update(.05);assert.ok(sim.step(.05).ok);
    assert.equal(Object.keys(r.buffs).length,0);assert.equal(r.deployments.length,0);assert.equal(r.projectiles.length,0);assert.equal(r.tether,null);
  }
  // Upper boundary admission is not a 3600-second simulation or expiry claim.
  r.reset();assert.equal(r.fx.count,0);assert.deepEqual(r.buffs,{});assert.equal(r.boxes.length,0);r.dispose();assert.equal(scene.children.length,0);
}
for(const id of ['grenade','missionbomb']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);a.duration=0;
  const {runtime:r,sim,enemy,events,scene}=hostFixture(kit);assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:6}).ok);
  const hp=enemy.hp;assert.ok(r.cast(a.slot));assert.equal(enemy.hp,hp);const projectile=r.projectiles[0];assert.equal(projectile.left,0);
  r.update(.05);assert.ok(sim.step(.05).ok);assert.equal(r.projectiles.length,0);assert.ok(enemy.hp<hp);
  assert.equal(projectile.handle.remaining,0);assert.equal(projectile.handle.group.parent,null);
  assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name==='explosion').length,1);
  const damagedHP=enemy.hp;for(let i=0;i<4;i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.equal(enemy.hp,damagedHP);assert.equal(events.filter(e=>e.kind==='damage'&&e.ability===id).length,1,'zero fuse detonates exactly once');
  r.dispose();assert.equal(scene.children.length,0);
}
{
  const kit=structuredClone(heroes[2]),a=kit.abilities.find(a=>a.id==='tether');a.duration=0;
  const {runtime:r,sim,enemy,events,scene}=hostFixture(kit),hp=enemy.hp;
  assert.ok(r.cast(a.slot));assert.ok(enemy.hp<hp,'zero tether preserves legitimate initial damage');assert.ok(r.tether);const handle=r.tether.handle;
  for(let i=0;i<4;i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.equal(r.tether,null);assert.equal(handle.remaining,0);assert.equal(handle.group.parent,null);
  assert.equal(events.filter(e=>e.kind==='damage'&&e.ability==='tether').length,1);assert.equal(events.filter(e=>e.kind==='tether-end').length,1);
  r.dispose();assert.equal(scene.children.length,0);
}
for(const id of ['hook','volley','glue','slam','longshot']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);delete a.duration;
  const {runtime:r,sim,enemy}=hostFixture(kit);if(id==='slam')assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:6}).ok);
  assert.ok(r.cast(a.slot),`${id}: instant duration omission retains legacy fallback`);r.dispose();
}
console.log(`hero-runtime-test: ${ownerDurationRejects} malformed owner/fuse durations across 11 IDs reject before aim without changing nonempty state/accepted cue; explicit 0/MIN_VALUE/3600 admission, normal small-duration cleanup, single zero-fuse detonations/zero-tether hit+cleanup and instant omission preserved`);
// S14 original native projectile definitions in a synthetic four-slot kit.
// Real host/API target placement, not native ballistics or remote-origin certification.
function projectileOwnershipFixture(zeroID) {
  const kit=structuredClone(heroes[1]),bomb=structuredClone(heroes[3].abilities.find(a=>a.id==='missionbomb'));bomb.slot=4;kit.abilities[3]=bomb;
  if(zeroID)kit.abilities.find(a=>a.id===zeroID).duration=0;
  const f=hostFixture(kit),other=f.sim.addHero({id:'projectile-other',team:'ivory',position:{x:1,y:0,z:6}});f.runtime.targets.push(other);assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:6}).ok);
  const emit=f.runtime.fx.emit;let explosions=0;
  f.runtime.fx.emit=function(id,...args){if(id==='explosion')explosions++;return emit.call(this,id,...args);};
  const follow=p=>{for(const [i,target] of [f.enemy,other].entries())assert.ok(f.sim.moveHero(target.id,{x:p.position.x+i*.5,y:p.position.y,z:p.position.z}).ok);};
  return {...f,other,explosions:()=>explosions,follow,step(){f.runtime.update(.05);assert.ok(f.sim.step(.05).ok);}};
}
for(const id of ['grenade','missionbomb']) {
  const f=projectileOwnershipFixture(id),r=f.runtime,a=r.kit.abilities.find(a=>a.id===id),effect=r.onEffect;let reentered=false;
  r.onEffect=event=>{effect(event);if(!reentered&&event.kind==='damage'&&event.ability===id){reentered=true;r.update(0);}};
  assert.ok(r.cast(a.slot));const old=r.projectiles[0];f.step();assert.ok(reentered);
  assert.equal(f.explosions(),1,'expired projectile is consumed before zero-dt callback reentry');
  for(const target of [f.enemy,f.other])assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability===id&&e.target===target.id).length,1,'committed AoE still visits each valid target exactly once');
  assert.equal(r.projectiles.length,0);assert.equal(old.handle.remaining,0);r.update(0);assert.equal(f.explosions(),1);r.dispose();assert.equal(f.scene.children.length,0);
}
for(const id of ['grenade','missionbomb'])for(const mode of ['same','other-with-sibling']) {
  const f=projectileOwnershipFixture(mode==='same'?null:id),r=f.runtime,a=r.kit.abilities.find(a=>a.id===id),other=r.kit.abilities.find(a=>a.id===(id==='grenade'?'missionbomb':'grenade')),effect=r.onEffect;
  assert.ok(r.cast(a.slot));let sibling,siblingState;
  if(mode!=='same'){assert.ok(r.cast(other.slot));sibling=r.projectiles[1];siblingState={left:sibling.left,position:sibling.position.toArray(),velocity:sibling.velocity.toArray(),bounces:sibling.bounces};}
  let fresh,initial;
  r.onEffect=event=>{effect(event);if(!fresh&&event.kind==='damage'&&event.ability===id){r.reset();assert.ok(r.cast(mode==='same'?a.slot:other.slot));fresh=r.projectiles[0];initial={left:fresh.left,position:fresh.position.toArray(),velocity:fresh.velocity.toArray(),bounces:fresh.bounces};}};
  for(let i=0;i<Math.ceil(a.duration/.05)+3&&!fresh;i++){if(mode==='same')f.follow(r.projectiles[0]);f.step();}
  assert.ok(fresh);assert.deepEqual(r.projectiles,[fresh],'outer detonation cannot splice a callback-created fresh owner');
  assert.deepEqual({left:fresh.left,position:fresh.position.toArray(),velocity:fresh.velocity.toArray(),bounces:fresh.bounces},initial,'fresh projectile does not advance in old copied tick');assert.ok(r.fx.handles.has(fresh.handle));assert.equal(fresh.handle.group.parent,f.scene);
  if(sibling){assert.deepEqual({left:sibling.left,position:sibling.position.toArray(),velocity:sibling.velocity.toArray(),bounces:sibling.bounces},siblingState,'reset-cancelled sibling is skipped before timer/motion');assert.equal(sibling.handle.remaining,0);}
  assert.equal(f.explosions(),1);for(const target of [f.enemy,f.other])assert.equal(f.events.filter(e=>e.kind==='damage'&&e.target===target.id).length,1,'reset does not cancel the rest of committed AoE');
  const freshID=fresh.definition.id;for(let i=0;i<Math.ceil(initial.left/.05)+3&&r.projectiles.includes(fresh);i++){f.follow(fresh);f.step();}
  assert.equal(r.projectiles.length,0);assert.equal(f.explosions(),2);assert.equal(fresh.handle.remaining,0);
  for(const target of [f.enemy,f.other])assert.equal(f.events.filter(e=>e.kind==='damage'&&e.target===target.id).length,2,`${freshID}: fresh native fuse detonates later once`);
  assert.equal(f.boxes.length,0);r.reset();assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
}
{
  const f=projectileOwnershipFixture('grenade'),r=f.runtime,effect=r.onEffect,primary=new Error('primary detonation callback failure');
  r.onEffect=event=>{effect(event);if(event.kind==='damage')throw primary;};assert.ok(r.cast(3));const old=r.projectiles[0],hp=f.enemy.hp;
  assert.throws(()=>r.update(.05),error=>error===primary);assert.ok(f.enemy.hp<hp,'already-applied host HP is not rolled back');assert.equal(r.projectiles.includes(old),false);assert.equal(old.handle.remaining,0);assert.equal(f.explosions(),1);
  r.onEffect=effect;r.update(0);assert.equal(f.explosions(),1);r.dispose();assert.equal(f.scene.children.length,0);
}
console.log('hero-runtime-test: zero-fuse detonation reentry commits one AoE; reset/recast same/other native projectiles survive unadvanced, cancelled siblings skip motion, fresh fuses detonate once, callback exception identity and cleanup checked');
// Periodic admission: valid host baseline, then explicit client-only definition mutation.
let intervalRejects=0;
for(const id of ['turret','puddle','aura','chaingun']) {
  for(const interval of [undefined,0,-1,NaN,Infinity,'1']) {
    const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
    const {runtime:r,rejected,scene}=hostFixture(kit);
    if(interval===undefined)delete a.interval;else a.interval=interval;
    assert.ok(r.fire());assert.ok(r.cast(kit.abilities.find(b=>b!==a).slot));
    const aim=r.aimHit;r.aimHit=()=>assert.fail(`${id}: invalid interval reached aim`);
    rejected(a.slot);intervalRejects++;r.aimHit=aim;r.dispose();assert.equal(scene.children.length,0);
  }
  // No arbitrary minimum/maximum: finite positive intervals are admitted.
  for(const interval of [Number.MIN_VALUE,Number.MAX_VALUE]) {
    const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
    const {runtime:r,scene}=hostFixture(kit);a.interval=interval;assert.ok(r.cast(a.slot));r.dispose();assert.equal(scene.children.length,0);
  }
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
  const {runtime:r,sim,enemy,events,scene}=hostFixture(kit),effect=r.onEffect,pulseTimes=[];
  const source=sim.heroes.find(h=>h.id==='player'),friend=sim.heroes.find(h=>h.id==='friend');
  if(a.baseHeal>0) {
    assert.ok(sim.damage(source.id,200,enemy.id,{kind:'ability'}).ok);assert.ok(sim.damage(friend.id,200,enemy.id,{kind:'ability'}).ok);
  }
  const target=id==='aura'?source:enemy,kind=id==='aura'?'heal':'damage',hp=target.hp;
  const resources=JSON.stringify(sim.heroes.map(h=>[h.ammo,h.souls,h.earnedSouls,h.items])),ammo=r.ammo;
  r.onEffect=event=>{effect(event);if(event.ability===id&&event.target===target.id&&event.kind===kind)pulseTimes.push(r.time);};
  const start=sim.time;assert.ok(r.cast(a.slot));
  for(let i=0;i<Math.ceil((a.duration+.1)/.05);i++){r.update(.05);sim.step(.05);}
  assert.ok(pulseTimes.length>1&&Math.abs(pulseTimes.length-a.duration/a.interval)<=1,'normal cadence count within one update-boundary pulse');
  assert.ok(Math.abs(pulseTimes[0]-.05)<1e-6,'first payload occurs on first normal update');
  for(let i=1;i<pulseTimes.length;i++) {
    const gap=pulseTimes[i]-pulseTimes[i-1];
    assert.ok(gap>=.05-1e-6&&Math.abs(gap-a.interval)<=.05+1e-6,'at most one pulse per update, normal interval within dt resolution');
  }
  assert.ok(id==='aura'?target.hp>hp:target.hp<hp,'real host applies periodic healing/damage');
  assert.equal(r.ammo,ammo);assert.equal(JSON.stringify(sim.heroes.map(h=>[h.ammo,h.souls,h.earnedSouls,h.items])),resources);
  assert.ok(sim.time>=start+a.duration);assert.equal(r.deployments.length,0);assert.equal(Object.keys(r.buffs).length,0);
  const count=events.length;r.update(.05);sim.step(.05);assert.equal(events.length,count,'expired periodic effect emits no payload');
  r.dispose();assert.equal(scene.children.length,0);
}
console.log(`hero-runtime-test: ${intervalRejects} mutable-client periodic interval rejections preserve full state; finite positive extremes admitted, original cadence/host feedback/expiry checked at dt .05 (one pulse/update ceiling, not subframe-rate parity)`);
// Definition admission across immediate/deferred native payload dispatches; no proposed kits.
let admissionRejects=0;
for(const id of ['volley','glue','slam','longshot','tether','turret','grenade','missionbomb','puddle']) {
  for(const [name,change] of [
    ['slow-.900001',a=>{a.slow=.900001;}],['slow-.95',a=>{a.slow=.95;}],['slow-1',a=>{a.slow=1;}],
    ['missing-slow',a=>{delete a.slow;}],['missing-duration',a=>{delete a.duration;}],['missing-range',a=>{delete a.range;}],
    ['missing-baseDamage',a=>{delete a.baseDamage;}],['zero-duration',a=>{a.duration=0;}],['zero-range',a=>{a.range=0;}],
    ['spirit-payload',a=>{a.spiritScale=1;}],['negative-baseDamage',a=>{a.baseDamage=-1;}]
  ]) {
    const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
    Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
    if(!['negative-baseDamage','missing-duration'].includes(name))change(a);
    const {runtime:r,rejected,scene}=hostFixture(kit); // Preserve all cases; host now also requires explicit timer-owner duration.
    if(['negative-baseDamage','missing-duration'].includes(name))change(a); // Valid host baseline, then unsupported client-only definition.
    assert.ok(r.fire());
    const prior=kit.abilities.find(b=>b!==a&&['overtime','headshot','xray','chaingun','aura'].includes(b.id));
    assert.ok(r.cast(prior.slot));assert.ok(r.fx.count>0);assert.ok(r.ammo<kit.weapon.magazine);
    const aim=r.aimHit;r.aimHit=()=>assert.fail(`${id}/${name}: inadmissible definition reached aim`);
    rejected(a.slot);admissionRejects++;r.aimHit=aim;
    r.dispose();assert.equal(scene.children.length,0);
  }
}
// Accepted misses cannot depend on emitted intents or current eligible targets.
for(const pure of [false,true]) {
  const kit=structuredClone(heroes[0]);
  if(pure)Object.assign(kit.abilities[1],{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
  const {runtime:r,sim,events,scene}=hostFixture(kit),hp=sim.heroes.map(h=>h.hp),ammo=r.ammo;
  r.targets=[];assert.ok(r.cast(2));assert.equal(events.length,0);assert.equal(r.cooldowns[2],kit.abilities[1].cooldown);
  assert.equal(r.castCount.volley,1);assert.equal(r.fx.count,1);assert.equal(r.ammo,ammo);assert.deepEqual(sim.heroes.map(h=>h.hp),hp);
  r.dispose();assert.equal(scene.children.length,0);
}
{
  const {runtime:r,sim,scene}=hostFixture(heroes[0]),hp=sim.heroes.find(h=>h.id==='player').hp;
  assert.ok(r.cast(4));assert.ok(r.buffs.overtime);assert.equal(sim.stats('player').moveSpeed,12);
  assert.equal(sim.stats('player').invulnerable,true);assert.equal(sim.heroes.find(h=>h.id==='player').hp,hp);
  for(let i=0;i<61;i++){r.update(.05);sim.step(.05);}
  assert.equal(sim.stats('player').moveSpeed,8);assert.equal(sim.stats('player').invulnerable,false);
  r.dispose();assert.equal(scene.children.length,0);
}
{
  const kit=structuredClone(heroes[0]);kit.abilities[0].baseDamage=0;delete kit.abilities[0].slow;
  const {runtime:r,sim,controller:c,boxes,events,scene}=hostFixture(kit);
  r.targets=[];boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:-1,maxZ:0});
  const start=c.position.clone();assert.ok(r.cast(1));assert.ok(c._hook,'zero-damage/no-slow hook requests real movement');
  for(let i=0;i<8;i++){c.update(.05);sim.moveHero('player',c.position);r.update(.05);sim.step(.05);}
  assert.ok(c.position.distanceTo(start)>1);assert.equal(events.length,0);
  r.dispose();assert.equal(scene.children.length,0);
}
{
  const kit=structuredClone(heroes[3]);kit.abilities[0].baseDamage=0; // Genuine healing-only native puddle remains admissible.
  const {runtime:r,sim,enemy,events,scene}=hostFixture(kit),source=sim.heroes.find(h=>h.id==='player'),friend=sim.heroes.find(h=>h.id==='friend');
  sim.moveHero(enemy.id,{x:.55,y:0,z:6});
  assert.ok(sim.damage(source.id,80,enemy.id,{kind:'ability'}).ok);assert.ok(sim.damage(friend.id,80,enemy.id,{kind:'ability'}).ok);
  const hp=[source.hp,friend.hp];assert.ok(r.cast(1));r.update(.05);
  assert.equal(source.hp,hp[0]+kit.abilities[0].baseHeal);assert.equal(friend.hp,hp[1]+kit.abilities[0].baseHeal);
  assert.equal(events.filter(e=>e.kind==='heal').length,2);assert.equal(events.filter(e=>e.kind==='damage').length,0);
  r.dispose();assert.equal(scene.children.length,0);
}
console.log(`hero-runtime-test: ${admissionRejects} payload admission rejections across 9 IDs preserve nonempty real-host state before aim; accepted damage/status misses, self buff, wall hook and healing-only puddle retained`);
// Original Gooey aura/puddle at a real friendly objective: public API injury/setup,
// not native gameplay evidence or HP grants. Collect both RED cases before asserting.
{
  const rejectedStructures=[];
  for(const id of ['aura','puddle']) {
    const kit=heroes.find(k=>k.id==='gooey'),a=kit.abilities.find(a=>a.id===id);
    const {runtime:r,sim,enemy,events,controller:c,boxes}=hostFixture(kit),results=[];
    r.onEffect=event=>{events.push(event);results.push(sim.applyHeroEffect(event));};
    const source=sim.heroes.find(h=>h.id==='player'),friend=sim.heroes.find(h=>h.id==='friend');
    const structure=sim.structures.find(s=>s.team===source.team&&s.lane==='midway'&&s.type==='guardian');
    sim.moveHero(source.id,{...structure.position,x:structure.position.x-2});c.warp(source.position);
    sim.moveHero(friend.id,{...source.position,x:source.position.x-1,z:source.position.z+1});
    sim.moveHero(enemy.id,{...source.position,x:source.position.x+.55,z:source.position.z-2.5});
    assert.ok(sim.damage(source.id,80,enemy.id,{kind:'ability'}).ok);
    assert.ok(sim.damage(friend.id,90,enemy.id,{kind:'ability'}).ok);
    // Puddle also keeps the legacy untyped training-range ally contract.
    const ally=id==='puddle'?{id:friend.id,team:friend.team,position:friend.position,alive:true}:friend;
    r.targets=[source,ally,structure,enemy];assert.ok(r.cast(a.slot));
    const center=id==='aura'?c.position:r.deployments[0].position;
    const covered=sim.addHero({id:`${id}-covered`,team:source.team,position:{x:center.x,y:0,z:center.z-3}});
    const outside=sim.addHero({id:`${id}-outside`,team:source.team,position:{x:center.x+a.radius+1,y:0,z:center.z}});
    const dead=sim.addHero({id:`${id}-dead`,team:source.team,position:{...source.position,x:source.position.x-1}});
    assert.ok(sim.damage(dead.id,1e6,enemy.id,{kind:'ability'}).killed);
    boxes.push({minX:center.x-1,maxX:center.x+1,minY:0,maxY:3,minZ:center.z-1.5,maxZ:center.z-1.4});
    r.targets.push(covered,outside,dead);
    const hp=[source.hp,friend.hp,structure.hp],enemyHP=enemy.hp;
    const resources=()=>JSON.stringify({ammo:r.ammo,heroes:sim.heroes.map(h=>[h.id,h.ammo,h.souls,h.earnedSouls,h.level,h.items,h.cooldowns]),
      structures:sim.structures.map(s=>[s.id,s.hp,s.maxHp])});
    const before=resources(),start=sim.time;r.update(.05);sim.step(.05);
    assert.equal(source.hp,hp[0]+a.baseHeal);assert.equal(friend.hp,hp[1]+a.baseHeal);
    for(const target of [source,friend])assert.equal(events.filter(e=>e.kind==='heal'&&e.target===target.id).length,1,'one heal per ally/self pulse');
    assert.ok(events.every(e=>![covered.id,outside.id,dead.id].includes(e.target)),'cover/dead/outside allies receive no intent');
    assert.equal(structure.hp,hp[2]);assert.equal(resources(),before);
    if(id==='puddle') {
      assert.ok(enemy.hp<enemyHP,'original mixed enemy damage still reaches systems');
      assert.ok(events.some(e=>e.kind==='damage'&&e.target===enemy.id&&e.baseDamage===a.baseDamage));
    } else assert.equal(events.filter(e=>e.kind==='damage').length,0);
    const structureIntents=events.filter(e=>e.kind==='heal'&&e.target===structure.id).length;
    const rejected=results.filter(result=>!result.ok);
    console.log(`healing structure boundary: ${id}: ${structureIntents} structure intents; ${rejected.length} host rejections`);
    if(structureIntents||rejected.length)rejectedStructures.push({id,structureIntents,reasons:rejected.map(result=>result.reason)});
    for(let i=1;i<Math.ceil((a.duration+.1)/.05);i++){r.update(.05);sim.step(.05);}
    assert.ok(sim.time>=start+a.duration);assert.equal(r.deployments.length,0);assert.equal(Object.keys(r.buffs).length,0);
    const count=events.length;r.update(.05);sim.step(.05);assert.equal(events.length,count,'expired healing emits nothing');
    assert.equal(structure.hp,hp[2]);assert.equal(resources(),before);
    if(!structureIntents&&!rejected.length)assert.ok(results.every(result=>result.ok),'all lifetime heal/damage intents accepted');
    r.dispose();
  }
  assert.deepEqual(rejectedStructures,[],'original aura/puddle must never emit structure healing rejected by the real host');
}
// Synthetic original-ID status component fixtures, not imported/proposed hero kits.
for(const slow of [.900001,.95,.99]) {
  const kit=structuredClone(heroes[0]),a=kit.abilities[1];
  Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow,duration:2,range:12});
  const {runtime:r,sim,enemy,events}=hostFixture(kit); // The configured baseline itself has this fraction.
  const before=JSON.stringify([r.snapshot(),sim.heroes,sim.events]);
  r.hit(a,enemy);r.area(a,r.controller.position,{cone:true});
  assert.equal(events.length,0,'above-floor-ceiling baseline never emits pure status');
  assert.equal(JSON.stringify([r.snapshot(),sim.heroes,sim.events]),before);assert.equal(sim.stats(enemy.id).moveSpeed,8);
  r.dispose();
}
{
  const kit=structuredClone(heroes[0]),a=kit.abilities[1];
  Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
  const {runtime:r,sim,enemy,events,boxes,controller:c}=hostFixture(kit);
  const trooper=sim.troopers.find(t=>t.team==='ivory');trooper.position={x:0,y:0,z:3};
  r.targets.push(trooper);
  const resources=()=>JSON.stringify({ammo:r.ammo,heroes:sim.heroes.map(h=>[h.hp,h.ammo,h.souls,h.earnedSouls,h.items]),troopHP:trooper.hp});
  const before=resources();assert.ok(r.cast(2));assert.equal(resources(),before);
  assert.equal(events.length,2);assert.ok(events.every(e=>e.kind==='status'&&e.baseDamage===0&&e.baseHeal===0&&e.spiritScale===0));
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8);assert.equal(sim.stats('player').moveSpeed,8);
  r.hit(a,enemy,{headshot:true,headshotMultiplier:3,baseDamage:999});
  assert.equal(events.at(-1).kind,'status');assert.equal(events.at(-1).baseDamage,0);
  assert.equal(events.at(-1).headshot,undefined,'pure status does not inherit damage/headshot extras');assert.equal(resources(),before);
  r.area(a,c.position,{cone:true,heal:true});
  assert.ok(events.every(e=>e.kind==='status'),'pure slow area never emits zero-heal intents to allies/self');assert.equal(resources(),before);
  const count=events.length;
  r.hit(a,r.targets.find(t=>t.id==='friend'));r.hit(a,{...enemy,alive:false});
  r.hit(a,{...sim.structures[0],position:{...enemy.position}}); // Near structure descriptor still emits nothing.
  for(const kind of [undefined,'orb','unknown'])r.hit(a,{...enemy,kind});
  r.hit(a,{...enemy,position:{x:0,y:0,z:-100}});assert.equal(events.length,count,'only typed hero/trooper status targets are eligible');
  boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});
  r.hit(a,enemy);r.area(a,c.position,{cone:true});assert.equal(events.length,count,'both shared paths respect cover');boxes.length=0;
  for(const change of [{slow:0},{slow:1},{slow:NaN},{duration:0},{range:0},{baseHeal:1},{spiritScale:1},{damageType:'spirit'},{invulnerable:true},{speedMultiplier:2}]) {
    const saved={...a};Object.assign(a,change);r.hit(a,enemy);Object.assign(a,saved);
    assert.equal(events.length,count,'malformed zero-damage slow does not emit a status intent');
  }
  r.reset();r.dispose();assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'ordinary hit status retains existing timed lifetime, not new reset/dispose cancellation');
  sim.step(2);assert.equal(sim.stats(enemy.id).moveSpeed,8);
}
for(const end of ['reset','dispose','cover','range','victim-death','caster-death','expiry']) {
  const kit=structuredClone(heroes[2]),a=kit.abilities[1];
  Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
  const {runtime:r,sim,enemy,events,boxes}=hostFixture(kit);
  const hp=enemy.hp,ammo=r.ammo,souls=sim.heroes.map(h=>h.souls);
  assert.ok(r.cast(2));assert.ok(r.tether);assert.equal(events[0].kind,'status');
  assert.equal(enemy.hp,hp);assert.equal(r.ammo,ammo);assert.deepEqual(sim.heroes.map(h=>h.souls),souls);
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8);
  if(end==='reset')r.reset();
  if(end==='dispose')r.dispose();
  if(end==='cover'){boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:3,maxZ:4});r.update(0);}
  if(end==='range'){sim.moveHero(enemy.id,{x:0,y:0,z:-100});r.update(0);}
  if(end==='victim-death'){assert.ok(sim.damage(enemy.id,1e6,'player',{kind:'ability'}).ok);r.update(0);}
  if(end==='caster-death'){assert.ok(sim.damage('player',1e6,enemy.id,{kind:'ability'}).ok);r.reset();}
  if(end==='expiry')for(let i=0;i<41;i++){r.update(.05);sim.step(.05);}
  assert.equal(r.tether,null);assert.equal(sim.stats(enemy.id).moveSpeed,8,`${end}: existing tether cleanup revokes pure slow`);
  assert.equal(events.filter(e=>e.kind==='tether-end').length,1);r.dispose();
}
console.log('hero-runtime-test: real-host status-only cone/hit/trooper, HP/ammo/economy, cover/eligibility/malformed guards and 7 existing tether cleanup paths; no expansion-kit parity');
for(const id of ['unsupported-jank40','toString','__proto__']) {
  const kit=structuredClone(heroes[1]);kit.abilities[0].id=id;
  const {runtime:r,rejected}=hostFixture(kit);
  assert.ok(r.fire());assert.ok(r.cast(3));assert.ok(r.cast(4)); // Preserve nonempty state, ammo spend and real host damage.
  rejected(1);
  for(const unknown of [undefined,'shot']) {kit.abilities[0].id=unknown;rejected(1);}
  r.dispose();
}
{
  const {runtime:r,boxes,rejected}=hostFixture(heroes[1]);
  const blocker={minX:-1,maxX:1,minY:0,maxY:3,minZ:7.6,maxZ:7.8};
  boxes.push(blocker);rejected(2); // No cooldown key, cast count or lastAbility existed before this rejection.
  boxes.pop();
  const groundPoint=r.groundPoint.bind(r),emit=r.fx.emit.bind(r.fx);let placements=0,validated;
  r.groundPoint=range=>{placements++;return validated=groundPoint(range);};
  r.fx.emit=(id,options)=>{
    if(id==='barricade') {
      assert.equal(r.cooldowns[2],heroes[1].abilities[1].cooldown);
      assert.equal(r.castCount.barricade,1);assert.equal(r.lastAbility,'barricade');
      assert.equal(r.cast(2),false,'successful wall commits cooldown before FX callbacks can reenter');
    }
    return emit(id,options);
  };
  assert.ok(r.cast(2));assert.equal(placements,1,'successful placement is computed once');
  assert.equal(r.deployments[0].position,validated,'dispatch uses cached validated placement');
  r.fx.emit=emit;
  assert.ok(r.cast(4)); // Keep a distinct successful lastAbility and active self buff.
  r.cooldowns[2]=0; // Explicit ready-cooldown fixture while the prior wall is still alive.
  boxes.push(blocker);rejected(2); // Must not replace/remove the existing wall or its FX.
  assert.equal(r.deployments.length,1);assert.equal(boxes.length,2);
  r.dispose();assert.deepEqual(boxes,[blocker],'normal disposal removes only the owned wall');
}
{
  const {runtime:r,enemy,sim,events}=hostFixture(heroes[0]),effect=r.onEffect;
  assert.ok(sim.moveHero(enemy.id,{x:0,y:0,z:6}).ok);
  const hp=enemy.hp;
  r.onEffect=event=>{
    assert.equal(r.cooldowns[3],heroes[0].abilities[2].cooldown);
    assert.equal(r.castCount.slam,1);assert.equal(r.lastAbility,'slam');
    assert.equal(r.cast(3),false,'successful cast commits before host effect callback reentry');
    effect(event);
  };
  assert.ok(r.cast(3));assert.equal(events.length,1);assert.ok(enemy.hp<hp,'one accepted systems-owned damage event');
  r.dispose();
}
console.log('hero-runtime-test: fail-closed unknown IDs and transactional wall rejection preserve real host/runtime state; cached placement and callback reentry checked');
let casts=0;
for(const kit of heroes) {
  const f=fixture(kit),{runtime:r}=f;
  for(const ability of kit.abilities) {
    r.reset();f.controller.warp({x:0,y:0,z:8});
    assert.equal(r.cast(ability.slot),true,`${kit.id}/${ability.id}`);casts++;
    assert.equal(r.cast(ability.slot),false,'cooldown prevents repeated casting');
    assert.ok(r.fx.count>0,'real scene geometry emitted');
    assert.equal(r.snapshot().casts[ability.id],1);
    for(let frame=0;frame<600;frame++) {f.controller.update(1/60);r.update(1/60);}
    assert.equal(r.projectiles.length,0);assert.equal(r.deployments.length,0);assert.equal(Object.keys(r.buffs).length,0);assert.equal(f.boxes.length,0,'temporary colliders expire');
  }
  r.reset();assert.equal(r.fx.count,0);assert.equal(r.ammo,kit.weapon.magazine);
  const torso=r.visual.group.getObjectByName('torso'),rest=torso.quaternion.clone();
  assert.equal(r.fire(),true);assert.equal(r.shots,1);assert.equal(r.recoil,1);
  assert.ok(torso.quaternion.angleTo(rest)>0,'accepted shot kicks model immediately');
  const shot=[...r.fx.handles.keys()].find(h=>h.group.name==='shot');
  assert.ok(shot.position.distanceTo(r.visual.muzzle.getWorldPosition(new THREE.Vector3()))<1e-6,'flash starts at supplied weapon/hand node');
  assert.equal(r.fire(),false);assert.equal(r.shots,1,'cooldown drops repeated input without queueing');
  for(let i=0;i<3;i++)r.update(.05);
  assert.equal(r.recoil,0);assert.equal(r.fx.count,0);
  assert.ok(torso.quaternion.angleTo(rest)<1e-7,'kick returns to author rest');
  while(r.fireWait>0)r.update(.05);
  assert.equal(r.fire(),true);assert.equal(r.shots,2,'cooldown permits next shot');
  r.reset();assert.equal(r.recoil,0);
  assert.throws(()=>r.setModifiers({unknown:1}),RangeError);
  assert.throws(()=>r.setModifiers({magazine:2.5}),RangeError);
  r.setModifiers({magazine:24,move:1.25});assert.equal(r.modifiers.magazine,24);
  r.dispose();assert.equal(f.scene.children.length,0);
}
// S22 terminal closure during an already-entered update. Public controller
// dash/API placement and synthetic native slots are CPU setup, not native proof.
function pendingDash(f) {f.controller.update(.01,{forward:1,dash:true});assert.equal(f.controller.state,'dash');assert.ok(f.sim.moveHero('player',f.controller.position).ok);}
function watchClosedFrame(f) {
  const r=f.runtime,calls={visual:0,fx:0,emit:0};let marked=false,saved,children;
  for(const [object,key,name] of [[r.visual,'update','visual'],[r.fx,'update','fx'],[r.fx,'emit','emit']]){const actual=object[key];object[key]=function(...args){if(marked)calls[name]++;return actual.apply(this,args);};}
  const state=()=>JSON.stringify({runtime:r.snapshot(),time:r.time,recoil:r.recoil,lastState:r.lastState,position:f.controller.position,velocity:f.controller.velocity,state:f.controller.state,speed:f.controller.speedMultiplier,visual:r.visual.group.position,rotation:r.visual.group.quaternion.toArray(),buffs:Object.entries(r.buffs).map(([id,b])=>[id,b.left,b.next,b.handle.remaining]),deployments:r.deployments.map(d=>[d.left,d.next,d.position]),projectiles:r.projectiles.map(p=>[p.left,p.position,p.velocity])});
  return {mark(){marked=true;saved=state();children=[...f.scene.children];},check(){assert.ok(marked);assert.equal(state(),saved,'outer automatic frame cannot mutate post-closure runtime/owners');assert.deepEqual(f.scene.children,children);assert.deepEqual(calls,{visual:0,fx:0,emit:0},'no automatic visual/FX work after close point');}};
}
for(const phase of ['buff','turret','grenade','missionbomb','tether']) {
  let f,slot;
  if(['grenade','missionbomb'].includes(phase)){f=projectileOwnershipFixture(phase);slot=f.runtime.kit.abilities.find(a=>a.id===phase).slot;}
  else {const kit=structuredClone(heroes[phase==='turret'?1:2]);if(phase==='buff')kit.abilities.find(a=>a.id==='headshot').duration=.05;f=hostFixture(kit);slot=phase==='buff'?3:phase==='turret'?1:2;}
  const r=f.runtime,effect=r.onEffect;assert.ok(r.cast(slot));pendingDash(f);if(phase==='tether')assert.ok(f.sim.moveHero(f.enemy.id,{x:100,y:0,z:100}).ok);
  const watch=watchClosedFrame(f);let disposed=false;
  r.onEffect=event=>{effect(event);if(!disposed&&((phase==='buff'&&event.kind==='buff-end'&&event.ability==='headshot')||(phase==='tether'&&event.kind==='tether-end')||(['turret','grenade','missionbomb'].includes(phase)&&event.kind==='damage'&&event.ability===phase))){disposed=true;r.dispose();watch.mark();}};
  for(let i=0;i<3&&!disposed;i++){assert.doesNotThrow(()=>r.update(.05),`${phase}: entered update cannot touch disposed automatic resources`);assert.ok(f.sim.step(.05).ok);}
  assert.ok(disposed,`${phase}: bounded normal clock reaches actual callback`);watch.check();assert.equal(r.fx.count,0);assert.equal(f.scene.children.length,0);
  if(['grenade','missionbomb'].includes(phase)){assert.equal(f.explosions(),1);for(const target of [f.enemy,f.other])assert.equal(f.events.filter(e=>e.kind==='damage'&&e.ability===phase&&e.target===target.id).length,1,'unowned one-shot AoE remains committed across successful disposal');}
  r.dispose();
}
{
  // Three native buffs in four original slots expose both the current owned
  // pulse and a later copied owner after explicitly caught partial teardown.
  const kit=structuredClone(heroes[3]);kit.abilities[0]={...structuredClone(heroes[2].abilities[3]),slot:1};kit.abilities[1]={...structuredClone(heroes[2].abilities[2]),slot:2};
  const f=hostFixture(kit),r=f.runtime,source=f.sim.heroes.find(h=>h.id==='player'),friend=f.sim.heroes.find(h=>h.id==='friend'),other=f.sim.addHero({id:'closed-pulse-other',team:'carbon',position:{x:2,y:0,z:6}});
  for(const target of [source,friend,other])assert.ok(f.sim.damage(target.id,100,f.enemy.id,{kind:'ability'}).ok);r.targets=[...f.sim.heroes];assert.ok(r.cast(2));assert.ok(r.cast(4));assert.ok(r.cast(1));const aura=r.buffs.aura,later=r.buffs.xray,laterLeft=later.left,ownHP=source.hp,friendHP=friend.hp,otherHP=other.hp;pendingDash(f);
  const effect=r.onEffect,primary=new Error('primary explicitly caught partial dispose'),watch=watchClosedFrame(f);let attempted=false,caught;
  r.onEffect=event=>{effect(event);if(event.kind==='buff-end'&&event.ability==='headshot')throw primary;if(!attempted&&event.kind==='heal'&&event.target===friend.id){attempted=true;try{r.dispose();}catch(error){caught=error;assert.equal(error,primary);}watch.mark();}};
  assert.doesNotThrow(()=>r.update(.05),'callback explicitly catches primary; runtime does not swallow or replace it');assert.ok(f.sim.step(.05).ok);assert.equal(caught,primary);watch.check();assert.equal(r.buffs.headshot,undefined);assert.equal(r.buffs.aura,aura);assert.equal(r.buffs.xray,later);assert.equal(later.left,laterLeft);
  assert.equal(friend.hp,friendHP+kit.abilities[3].baseHeal,'first accepted heal stays committed');assert.equal(other.hp,otherHP,'closed pending owner cannot finish continuous pulse');assert.equal(source.hp,ownHP,'closed current aura cannot self-heal');assert.equal(f.events.filter(e=>e.kind==='heal').length,1);assert.ok(r.fx.handles.has(aura.handle),'remaining teardown is explicitly incomplete');
  r.onEffect=effect;r.dispose();assert.equal(r.fx.count,0);assert.equal(f.scene.children.length,0);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='headshot').length,1);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='aura').length,1);assert.equal(f.events.filter(e=>e.kind==='buff-end'&&e.ability==='xray').length,1);
}
console.log('hero-runtime-test: closure in buff/deployment/projectile/tether callback freezes remaining automatic frame; disposed one-shot AoE stays committed; explicitly caught partial disposal stops current owned aura and later copied buff until explicit cleanup retry');
// S21 one real Host/native-kit fixture with active deployment, spent ammo and
// accepted weapon cue. Config tests are CPU admission, not gameplay balance.
{
  const f=weaponPoseFixture(heroes[1]),r=f.runtime;assert.ok(r.cast(1));assert.ok(r.fire());const modifiers=r.modifiers,cue=r.acceptedAction,keys=Object.keys(modifiers);let rejects=0;
  const state=()=>JSON.stringify({modifiers:r.modifiers,runtime:r.snapshot(),time:r.time,recoil:r.recoil,cue:r.acceptedAction,heroes:f.sim.heroes,stats:f.sim.heroes.map(h=>f.sim.stats(h.id)),hostEvents:f.sim.events,intents:f.events,fx:[...r.fx.handles.keys()].map(h=>[h.remaining,h.position,h.group.name])});
  const rejected=(values,expected)=>{const before=state(),handles=[...r.fx.handles.keys()],children=[...f.scene.children];assert.throws(()=>r.setModifiers(values),expected);assert.equal(r.modifiers,modifiers);assert.equal(r.acceptedAction,cue);assert.equal(state(),before,'failed modifier admission preserves every captured runtime/Host/FX field');assert.deepEqual([...r.fx.handles.keys()],handles);assert.deepEqual(f.scene.children,children);rejects++;};
  for(const key of keys)for(const value of [0,-1,NaN,Infinity,-Infinity,101,'1',null,true,undefined]) {
    const prefix=key==='fire'?'reload':'fire';rejected({[prefix]:.5,[key]:value},error=>error instanceof RangeError&&error.message==='Invalid hero modifier');
  }
  rejected({fire:.5,magazine:2.5},error=>error instanceof RangeError&&error.message==='Magazine must be an integer');rejected({fire:.5,unknownAtomic:1},error=>error instanceof RangeError&&error.message==='Invalid hero modifier');
  rejected(null,TypeError);rejected(undefined,TypeError);const primary=new Error('primary modifier getter failure');rejected({fire:.5,get magazine(){throw primary;}},error=>error===primary);
  let reads=0;r.setModifiers({get fire(){reads++;return reads===1?.5:NaN;}});assert.equal(reads,1,'captured getter entry is never reread during commit');assert.equal(r.modifiers.fire,.5);assert.equal(r.modifiers,modifiers);
  let before={...modifiers};r.setModifiers({magazine:3,move:1.25});assert.deepEqual(r.modifiers,{...before,magazine:3,move:1.25});assert.equal(r.ammo,3);r.setModifiers({magazine:24});assert.equal(r.ammo,3,'raising magazine never refills ammo');assert.equal(r.modifiers,modifiers);
  const inherited=Object.create({get fire(){throw new Error('inherited modifier must not be enumerated');},unknownAtomic:1});inherited.reload=.75;before={...modifiers};r.setModifiers(inherited);assert.deepEqual(r.modifiers,{...before,reload:.75});assert.equal(r.modifiers,modifiers);
  const emptyBefore=state(),ammo=r.ammo;r.setModifiers({});assert.equal(r.ammo,Math.min(ammo,r.modifiers.magazine));assert.equal(state(),emptyBefore);
  r.setModifiers(Object.fromEntries(keys.map(key=>[key,key==='magazine'?1:Number.MIN_VALUE])));assert.equal(r.ammo,1);for(const key of keys)assert.equal(r.modifiers[key],key==='magazine'?1:Number.MIN_VALUE);
  r.setModifiers(Object.fromEntries(keys.map(key=>[key,100])));for(const key of keys)assert.equal(r.modifiers[key],100);assert.equal(r.ammo,1);assert.equal(r.modifiers,modifiers);
  r.setModifiers({fire:.5,reload:1,cooldown:1,move:1,magazine:6});for(let i=0;i<Math.ceil(r.kit.weapon.interval/.05)+1;i++){r.update(.05);assert.ok(f.sim.step(.05).ok);}const hp=f.enemy.hp;assert.ok(r.fire());assert.ok(f.enemy.hp<hp);assert.equal(r.fireWait,r.kit.weapon.interval*.5);assert.equal(r.shots,2);r.dispose();assert.equal(f.scene.children.length,0);
  console.log(`hero-runtime-test: atomic modifiers: ${keys.length} actual known keys, ${rejects} rejected own-entry/whole-input/getter batches preserve identity/cue/nonempty Host state; one-read capture, partial/inherited/empty semantics, bounds/ammo clamp and normal-clock weapon checked`);
}
{
  const {runtime:r,boxes,events,controller}=fixture(heroes[2]);
  r.fire();assert.equal(events.at(-1).target,'enemy');assert.equal(events.at(-1).baseDamage,65);
  r.reset();boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:3,maxZ:4});
  events.length=0;r.fire();assert.equal(events.length,0,'solid cover blocks weapon damage');
  r.cast(1);assert.equal(events.length,0,'solid cover blocks longshot');
  r.cast(4);assert.ok(r.buffs.xray);assert.equal(events.at(-1).kind,'buff');
  r.reset();boxes.length=0;controller.pitch=Math.atan2(.4,8);
  r.cast(3);r.fire();assert.equal(events.at(-1).headshot,true);assert.equal(events.at(-1).headshotMultiplier,3);
  r.reset();controller.pitch=0;r.cast(2);assert.ok(r.tether);
  boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:3,maxZ:4});r.update(.05);
  assert.equal(r.tether,null);assert.equal(events.at(-1).kind,'tether-end');assert.equal(r.fx.count,0,'broken tether visual removed');
  r.dispose();
}
{
  const {runtime:r,controller:c}=fixture(heroes[0]);
  for(let i=0;i<40;i++)c.update(1/60,{forward:1});
  c.update(1/60,{forward:1,slide:true});assert.equal(c.infiniteAmmo,true);
  const ammo=r.ammo;assert.equal(r.fire(),true);assert.equal(r.ammo,ammo,'slide fire uses no ammo');
  c.update(.05,{});assert.equal(c.infiniteAmmo,false);r.update(.05);r.update(.25);r.update(.25);r.update(.25);r.update(.25);r.update(.25);r.update(.25);
  assert.equal(r.fire(),true);assert.equal(r.ammo,ammo-1);
  r.cast(4);r.update(.05);assert.equal(c.speedMultiplier,1.5);r.reset();assert.equal(c.speedMultiplier,1);
  r.dispose();
}
{
  const {runtime:r,events,boxes}=fixture(heroes[1]);
  r.cast(1);r.update(.05);assert.ok(events.some(e=>e.ability==='turret'&&e.kind==='damage'));
  r.reset();events.length=0;r.cast(2);assert.equal(boxes.length,1);r.reset();assert.equal(boxes.length,0);
  r.cast(3);let bounces=0;for(let i=0;i<100;i++){r.update(.02);bounces=Math.max(bounces,r.projectiles[0]?.bounces??0);}assert.ok(bounces>0,'grenade actually bounces');r.dispose();
}
{
  const {runtime:r,events}=fixture(heroes[3]);
  r.cast(1);r.update(.05);assert.ok(events.some(e=>e.kind==='heal'&&e.target==='friend'));
  r.cast(4);r.update(.05);assert.ok(events.some(e=>e.kind==='heal'&&e.target==='player'));
  assert.ok(events.every(e=>Number.isFinite(e.baseDamage)&&Number.isFinite(e.baseHeal)));r.dispose();
}
{
  const {runtime:r,controller:c,scene,events}=fixture(heroes.find(h=>h.id==='snipeoff'));
  const ability=r.kit.abilities.find(a=>a.id==='xray'),dt=1/32;
  const record=(id,x,extra={})=>({id,team:'ivory',alive:true,position:{x,y:0,z:8},hp:300,...extra});
  const keep=record('keep',1),removed=record('removed',2),dying=record('dying',3),convert=record('convert',4),leaving=record('leaving',5);
  const dead=record('dead',6,{alive:false}),ally=record('ally',7,{team:'carbon'}),far=record('far',ability.range+1);
  r.targets=[keep,removed,dying,convert,leaving,dead,ally,far];
  assert.ok(r.cast(ability.slot));
  const handle=r.buffs.xray.handle,group=handle.group;
  const cages=()=>group.children.filter(p=>p.isMesh&&p.material.wireframe&&p.geometry.type==='BoxGeometry');
  const points=()=>cages().filter(p=>p.visible).map(p=>p.position.clone().add(group.position).sub(new THREE.Vector3(0,.95,0)).toArray());
  const check=expected=>assert.deepEqual(points(),expected.map(t=>[t.position.x,t.position.y,t.position.z]),'reveal contains only current live enemies in range');
  check([keep,removed,dying,convert,leaving]);
  const parts=[...group.children],materials=new Set(parts.map(p=>p.material));let disposed=0;
  for(const material of materials)material.addEventListener('dispose',()=>disposed++);
  let elapsed=0;
  const step=()=>{r.update(dt);elapsed+=dt;};
  // Integrated records and positions are replaced; range dummies mutate in place.
  keep.position={x:9,y:2,z:7};dying.alive=false;convert.team='carbon';leaving.position={x:ability.range+1,y:0,z:8};
  dead.alive=true;ally.team='ivory';far.position={x:ability.range,y:0,z:8};
  const replacement={...keep,position:{x:10,y:3,z:6}},born=record('born',8);
  r.targets=[replacement,dying,convert,leaving,dead,ally,far,born];step();
  check([replacement,dead,ally,far,born]);
  c.position.x=-1;step();check([replacement,dead,ally,born]); // Caster movement changes range too.
  r.targets=[];step();check([]);
  for(let frame=0;frame<100;frame++) {
    r.targets=[record(`new-${frame}`,frame%8)];step();check(r.targets);
    assert.equal(r.buffs.xray.handle,handle);assert.deepEqual(group.children,parts,'cages are pooled, not accumulated per identity/frame');
    assert.equal(r.fx.count,1);assert.equal(disposed,0,'no per-frame material disposal');
    assert.equal(handle.remaining,ability.duration-elapsed,'membership changes do not refresh lifetime');
  }
  assert.ok(r.targets.every(t=>t.hp===300),'reveal does not own health');
  while(elapsed<ability.duration-dt)step();
  assert.equal(handle.remaining,dt);assert.equal(events.filter(e=>e.kind==='buff-end').length,0);
  step();assert.equal(r.buffs.xray,undefined);assert.equal(handle.remaining,0);assert.equal(r.fx.count,0);
  assert.equal(group.parent,null);assert.equal(group.children.length,0);assert.equal(disposed,materials.size);
  assert.equal(events.filter(e=>e.kind==='buff-end').length,1);
  assert.ok(r.cast(ability.slot)===false,'original cooldown remains in force');
  r.reset();r.cast(ability.slot);r.reset();assert.equal(r.fx.count,0,'reset clears active reveal');
  r.cast(ability.slot);r.dispose();assert.equal(scene.children.length,0,'dispose clears active reveal and hero');
}
// Real native emitter lifecycle, real host: CPU placement/clock, not floor/LOS
// certification, cast budgeting, proposed-kit parity, or remote pure-slow authority.
for(const id of ['turret','puddle']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id);
  const {runtime:r,sim,enemy,controller:c,events,scene}=hostFixture(kit),friend=sim.heroes.find(h=>h.id==='friend');
  assert.ok(sim.damage(friend.id,100,enemy.id,{kind:'ability'}).ok);r.setModifiers({cooldown:.01});
  assert.ok(r.cast(a.slot));const old=r.deployments[0],start=events.find(e=>e.kind==='deployment-start');
  assert.equal(start.deploymentId,old.deploymentId);assert.equal(start.target,null);assert.deepEqual(start.origin,{...old.position});
  c.warp({x:100,y:0,z:100});assert.ok(sim.moveHero('player',c.position).ok);
  const hp=enemy.hp;r.update(.05);assert.ok(sim.step(.05).ok);assert.ok(enemy.hp<hp,'live registered emitter remains authoritative after caster walks away');
  const impact=events.find(e=>e.kind==='damage'&&e.ability===id);assert.equal(impact.deploymentId,old.deploymentId);
  assert.deepEqual(impact.origin,{x:old.position.x,y:old.position.y+(id==='turret'?.9:0),z:old.position.z});assert.equal(Object.getPrototypeOf(impact.origin),Object.prototype);
  if(id==='puddle')assert.ok(events.some(e=>e.kind==='heal'&&e.deploymentId===old.deploymentId&&e.target===friend.id));
  while(r.cooldowns[a.slot]>0){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.ok(r.cast(a.slot));const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);
  assert.equal(old.handle.remaining,0);assert.equal(old.handle.group.parent,null);
  const lifecycle=events.filter(e=>['deployment-start','deployment-end'].includes(e.kind));
  assert.deepEqual(lifecycle.map(e=>[e.kind,e.deploymentId]),[['deployment-start',old.deploymentId],['deployment-end',old.deploymentId],['deployment-start',fresh.deploymentId]]);
  const before=JSON.stringify([sim.heroes,sim.events]);assert.equal(sim.applyHeroEffect(impact).ok,false);assert.equal(JSON.stringify([sim.heroes,sim.events]),before);
  const staleEnd=lifecycle[1],ended=sim.applyHeroEffect(staleEnd);assert.ok(ended.ok);assert.equal(ended.ended,false);
  assert.equal(r.removeDeployment(old),false);assert.equal(r.deployments[0],fresh);assert.ok(r.fx.handles.has(fresh.handle));
  assert.ok(sim.moveHero(enemy.id,{x:fresh.position.x,y:fresh.position.y,z:fresh.position.z-1}).ok);
  const freshHP=enemy.hp;r.update(.05);assert.ok(sim.step(.05).ok);assert.ok(enemy.hp<freshHP,'stale end cannot revoke fresh anchor');
  for(let i=0;i<Math.ceil(a.duration/.05)+2;i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.equal(r.deployments.length,0);assert.equal(fresh.handle.remaining,0);assert.equal(events.filter(e=>e.kind==='deployment-end'&&e.deploymentId===fresh.deploymentId).length,1);
  assert.ok(r.cast(a.slot));const resetOwner=r.deployments[0];assert.ok(resetOwner.deploymentId>fresh.deploymentId);r.reset();assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);
  assert.ok(r.cast(a.slot));assert.ok(r.deployments[0].deploymentId>resetOwner.deploymentId,'reset never reuses per-source sequence');r.dispose();assert.equal(scene.children.length,0);
}
{
  const {runtime:r,sim,boxes}=hostFixture(structuredClone(heroes[1]));r.setModifiers({cooldown:.01});assert.ok(r.cast(1));const old=r.deployments[0];
  assert.ok(r.cast(2));const wall=r.deployments.find(d=>d.wall);r.removeDeployment(old);
  for(let i=0;i<3;i++){r.update(.05);assert.ok(sim.step(.05).ok);}assert.ok(r.cast(1));const fresh=r.deployments.find(d=>d.definition.id==='turret');
  assert.equal(r.removeDeployment(old),false);assert.ok(r.deployments.includes(fresh)&&r.deployments.includes(wall));assert.ok(boxes.includes(wall.wall));
  assert.equal(r.removeDeployment(wall),true);assert.equal(r.removeDeployment(wall),false);assert.ok(r.deployments.includes(fresh));assert.equal(boxes.length,0);r.dispose();
}
for(const id of ['turret','puddle']) {
  const kit=structuredClone(heroes.find(k=>k.abilities.some(a=>a.id===id))),a=kit.abilities.find(a=>a.id===id),f=hostFixture(kit),r=f.runtime,effect=r.onEffect;
  let cancel=true;r.onEffect=event=>{effect(event);if(cancel&&event.kind==='deployment-start'){cancel=false;assert.ok(r.deployments.some(d=>d.deploymentId===event.deploymentId));r.reset();}};
  assert.ok(r.cast(a.slot));assert.equal(r.deployments.length,0);assert.equal(r.fx.count,0);const cancelled=r.deploymentSequence;
  assert.ok(r.cast(a.slot));assert.ok(r.deployments[0].deploymentId>cancelled);r.setModifiers({cooldown:.01});r.reset();
  assert.ok(r.cast(a.slot));const old=r.deployments[0];while(r.cooldowns[a.slot]>0){r.update(.05);assert.ok(f.sim.step(.05).ok);}
  let replace=true;r.onEffect=event=>{effect(event);if(replace&&event.kind==='deployment-end'&&event.deploymentId===old.deploymentId){replace=false;r.reset();assert.ok(r.cast(a.slot));}};
  assert.ok(r.cast(a.slot));assert.equal(replace,false);assert.equal(r.deployments.length,1);assert.equal(r.deployments[0].deploymentId,r.deploymentSequence);
  assert.equal(f.events.filter(e=>e.kind==='deployment-start').at(-1).deploymentId,r.deploymentSequence,'outer cleanup cannot restore cancelled pending owner after reentry');r.dispose();assert.equal(f.scene.children.length,0);
}
// S12 opt-in staged component on ORIGINAL Gooey/native puddle, not a new kit
// registration or native geometry proof. All placement/boxes are CPU fixtures.
function anchoredPuddleKit(flag=true) {
  const kit=structuredClone(heroes[3]);Object.assign(kit.abilities[0],{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:3,interval:.25,slowDuration:.5,radius:4,range:7,anchoredSlow:flag});return kit;
}
for(const end of ['leave','expire']) {
  const {runtime:r,sim,enemy,controller:c,events,boxes}=hostFixture(anchoredPuddleKit()),a=r.kit.abilities[0],effect=r.onEffect,pulses=[];
  r.onEffect=event=>{effect(event);if(event.kind==='status')pulses.push(sim.time);};
  assert.ok(r.cast(1));const field=r.deployments[0],center=field.position.clone(),hp=sim.heroes.map(h=>h.hp);
  c.warp({x:100,y:0,z:100});assert.ok(sim.moveHero('player',c.position).ok);
  boxes.push({minX:40,maxX:60,minY:0,maxY:4,minZ:40,maxZ:60});
  assert.equal(r.visible(r.origin,enemy),false);assert.equal(r.visible(center.clone().add(new THREE.Vector3(0,.7,0)),enemy),true);
  const step=()=>{r.update(.05);assert.ok(sim.step(.05).ok);};step();
  assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'OPT-IN field refresh uses registered center, not distant caster range/LOS');
  const status=events.find(e=>e.kind==='status');assert.equal(status.anchoredSlow,true);assert.equal(status.deploymentId,field.deploymentId);assert.deepEqual(status.origin,{...center});assert.equal(Object.getPrototypeOf(status.origin),Object.prototype);
  for(let i=0;i<19;i++)step();assert.ok(pulses.length>=3);assert.equal(sim.stats(enemy.id).moveSpeed,4.8);
  for(const extra of [{deploymentId:field.deploymentId+1},{origin:{...status.origin,x:status.origin.x+1}},{anchoredSlow:false}]) {
    const before=JSON.stringify([sim.heroes,sim.events]);assert.equal(sim.applyHeroEffect({...status,...extra}).ok,false);assert.equal(JSON.stringify([sim.heroes,sim.events]),before);
  }
  if(end==='leave') {
    const wall={minX:-.5,maxX:1.5,minY:0,maxY:3,minZ:center.z-.6,maxZ:center.z-.4};boxes.push(wall);assert.equal(r.visible(center.clone().add(new THREE.Vector3(0,.7,0)),enemy),false);
    const count=pulses.length;for(let i=0;i<12;i++)step();assert.equal(pulses.length,count);assert.equal(sim.stats(enemy.id).moveSpeed,8);assert.ok(r.deployments.includes(field)&&field.handle.remaining>0);
    boxes.splice(boxes.indexOf(wall),1);for(let i=0;i<Math.ceil(a.interval/.05)+1&&pulses.length===count;i++)step();assert.equal(sim.stats(enemy.id).moveSpeed,4.8);assert.ok(pulses.length>count);
    assert.ok(sim.moveHero(enemy.id,{x:center.x+10,y:0,z:center.z}).ok);
  } else while(r.deployments.includes(field))step();
  const count=pulses.length,until=pulses.at(-1)+.5;assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'end/leave retains last accepted application linger');
  while(sim.time+.05<until-1e-8)step();assert.equal(sim.stats(enemy.id).moveSpeed,4.8);step();step();assert.equal(sim.stats(enemy.id).moveSpeed,8);assert.equal(pulses.length,count);
  assert.deepEqual(sim.heroes.map(h=>h.hp),hp);assert.equal(events.filter(e=>['damage','heal'].includes(e.kind)).length,0);assert.equal(r.acceptedAction,null);
  if(end==='leave')assert.ok(field.handle.remaining>0);else assert.equal(field.handle.remaining,0);r.dispose();
}
// S13 staged native component, real synchronous host ACKs, no HP grants.
function budgetPuddleFixture() {
  const kit=anchoredPuddleKit();kit.abilities[0].maxApplicationsPerTarget=2;
  const f=hostFixture(kit),ack=event=>{f.events.push(event);const result=f.sim.applyHeroEffect(event);assert.ok(result.ok,`${event.kind}: ${result.reason}`);return result;};
  f.runtime.onEffect=ack;return {...f,ack,step(){f.runtime.update(.05);assert.ok(f.sim.step(.05).ok);}};
}
{
  const {runtime:r,sim,enemy,events,step}=budgetPuddleFixture(),hp=sim.heroes.map(h=>h.hp);r.setModifiers({cooldown:.01});assert.ok(r.cast(1));const field=r.deployments[0];
  for(let i=0;i<6;i++)step();assert.equal(sim.stats(enemy.id).moveSpeed,4.8,'last accepted slow still lingers after producer reaches cap');for(let i=0;i<14;i++)step();
  assert.equal(events.filter(e=>e.kind==='status'&&e.target===enemy.id).length,2,'budget2 producer suppresses later attempts instead of sending exhausted intents');
  assert.equal(field.applicationCounts.get(enemy.id),2);assert.equal(sim.stats(enemy.id).moveSpeed,8);assert.ok(field.handle.remaining>0&&r.deployments.includes(field));
  assert.ok(events.every(e=>!Object.hasOwn(e,'maxApplicationsPerTarget')));assert.deepEqual(sim.heroes.map(h=>h.hp),hp);
  const center=field.position.clone();assert.ok(sim.moveHero(enemy.id,{x:center.x+10,y:0,z:center.z}).ok);step();assert.ok(sim.moveHero(enemy.id,{x:center.x,y:0,z:center.z}).ok);
  for(let i=0;i<6;i++)step();assert.equal(events.filter(e=>e.kind==='status'&&e.target===enemy.id).length,2,'exit/reentry and expired slow do not reset instance budget');
  const other=sim.addHero({id:'budget-other',team:'ivory',position:{x:center.x+1,y:0,z:center.z}});r.targets.push(other);
  for(let i=0;i<11;i++)step();assert.equal(events.filter(e=>e.kind==='status'&&e.target===other.id).length,2,'separate target gets independent budget');
  assert.ok(r.cast(1));const fresh=r.deployments[0];assert.ok(fresh.deploymentId>field.deploymentId);step();assert.equal(fresh.applicationCounts.get(enemy.id),1,'ordinary cooldown recast gets a fresh budget');
  r.reset();assert.ok(r.cast(1));assert.ok(r.deployments[0].deploymentId>fresh.deploymentId);r.dispose();
}
for(const mode of ['reject-once','throw-before','throw-after']) {
  const f=budgetPuddleFixture(),r=f.runtime,failure=new Error(`primary ${mode}`);assert.ok(r.cast(1));const old=r.deployments[0];let first=true;
  r.onEffect=event=>{
    if(event.kind!=='status'||!first)return f.ack(event);first=false;
    if(mode==='reject-once')return {ok:false,reason:'synthetic callback rejection'};
    if(mode==='throw-after')f.ack(event);throw failure;
  };
  if(mode==='reject-once')f.step();else assert.throws(()=>f.step(),error=>error===failure,'reservation rollback preserves primary callback exception');
  assert.equal(old.applicationCounts.get(f.enemy.id),undefined);
  if(mode==='throw-after'){assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4.8,'host application is NOT rolled back by later callback throw');assert.equal(f.events.filter(e=>e.kind==='status').length,1);}
  else {for(let i=0;i<16;i++)f.step();assert.equal(old.applicationCounts.get(f.enemy.id),2);assert.equal(f.events.filter(e=>e.kind==='status').length,2);}
  r.onEffect=f.ack;r.dispose();
}
for(const nonACK of [undefined,null,true,{ok:'true'},Promise.resolve({ok:true}),Object.assign(()=>{}, {ok:true})]) {
  const f=budgetPuddleFixture(),r=f.runtime;assert.ok(r.cast(1));const field=r.deployments[0];let attempts=0;
  r.onEffect=event=>{if(event.kind!=='status')return f.ack(event);attempts++;return nonACK;};
  for(let i=0;i<7;i++)f.step();assert.ok(attempts>=2);assert.equal(field.applicationCounts.get(f.enemy.id),undefined,'non-structured/non-synchronous ACK cannot spend mirror');
  r.onEffect=f.ack;for(let i=0;i<6;i++)f.step();assert.ok(field.applicationCounts.get(f.enemy.id)>0);r.dispose();
}
{
  const f=budgetPuddleFixture(),r=f.runtime;assert.ok(r.cast(1));const field=r.deployments[0],a=field.definition;let nested=false,attempts=0;
  r.onEffect=event=>{
    if(event.kind==='status'){attempts++;if(!nested){nested=true;for(let i=0;i<2;i++)r.hit(a,f.enemy,{deploymentId:field.deploymentId,origin:{...field.position}});}}
    return f.ack(event);
  };
  f.step();assert.equal(attempts,2,'reservation before callback prevents reentrant oversend');assert.equal(field.applicationCounts.get(f.enemy.id),2);assert.equal(f.events.filter(e=>e.kind==='status').length,2);r.dispose();
}
{
  const f=budgetPuddleFixture(),r=f.runtime;assert.ok(r.cast(1));const old=r.deployments[0];let replace=true;
  r.onEffect=event=>{const result=f.ack(event);if(replace&&event.kind==='status'){replace=false;r.reset();assert.ok(r.cast(1));}return result;};
  f.step();const fresh=r.deployments[0];assert.notEqual(fresh,old);assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(old.applicationCounts.get(f.enemy.id),1);assert.equal(fresh.applicationCounts,undefined,'old ACK cannot charge replacement record');
  f.step();assert.equal(fresh.applicationCounts.get(f.enemy.id),1);r.dispose();
}
for(const missingACK of [true,false]) {
  const f=budgetPuddleFixture(),r=f.runtime;assert.ok(r.cast(1));const field=r.deployments[0],a=field.definition,results=[];
  if(!missingACK)a.maxApplicationsPerTarget=3; // Host baseline stays 2, regardless of mutable producer budget.
  r.onEffect=event=>{
    if(event.kind!=='status')return f.ack(event);
    f.events.push(event);const result=f.sim.applyHeroEffect(event);results.push(result);
    if(!result.ok)assert.equal(result.reason,'application budget exhausted');if(!missingACK)return result;
  };
  for(let i=0;i<20;i++)f.step();assert.equal(results.filter(v=>v.ok).length,2);assert.ok(results.some(v=>!v.ok));
  assert.equal(field.applicationCounts.get(f.enemy.id),missingACK?undefined:2);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);assert.ok(field.handle.remaining>0);
  const status=f.events.find(e=>e.kind==='status');for(const value of [undefined,null,0,3]) {
    const before=JSON.stringify([f.sim.heroes,f.sim.events]);assert.equal(f.sim.applyHeroEffect({...status,maxApplicationsPerTarget:value}).ok,false);assert.equal(JSON.stringify([f.sim.heroes,f.sim.events]),before);
  }
  r.onEffect=f.ack;r.dispose();
}
const badApplicationBudgets=[undefined,null,false,0,-1,1.5,NaN,Infinity,-Infinity,'2',{},[],Number.MAX_SAFE_INTEGER+1];let budgetRejects=0;
{
  const kit=anchoredPuddleKit();kit.abilities[0].maxApplicationsPerTarget=2;
  const {runtime:r,rejected,enemy,events}=weaponPoseFixture(kit),a=r.kit.abilities[0];assert.ok(r.cast(2));assert.ok(r.fire());const cue=r.acceptedAction,aim=r.aimHit;
  r.aimHit=()=>assert.fail('invalid application budget reached aim');
  for(const value of badApplicationBudgets){a.maxApplicationsPerTarget=value;const count=events.length;rejected(1);r.hit(a,enemy);assert.equal(events.length,count);assert.equal(r.acceptedAction,cue);budgetRejects++;}
  a.maxApplicationsPerTarget=2;r.aimHit=aim;r.dispose();
}
for(const original of heroes)for(const ability of original.abilities) {
  const {runtime:r,rejected,enemy,events}=weaponPoseFixture(original),a=r.kit.abilities.find(b=>b.slot===ability.slot);assert.ok(r.cast(r.kit.abilities.find(b=>b!==a).slot));assert.ok(r.fire());const cue=r.acceptedAction,aim=r.aimHit;
  a.maxApplicationsPerTarget=2;r.aimHit=()=>assert.fail('budget on non-anchored/mixed/native role reached aim');const count=events.length;rejected(a.slot);r.hit(a,enemy);assert.equal(events.length,count);assert.equal(r.acceptedAction,cue);budgetRejects++;delete a.maxApplicationsPerTarget;r.aimHit=aim;r.dispose();
}
{
  const kit=anchoredPuddleKit();kit.abilities[0].maxApplicationsPerTarget=Number.MAX_SAFE_INTEGER;
  const f=hostFixture(kit);f.runtime.onEffect=event=>{const result=f.sim.applyHeroEffect(event);assert.ok(result.ok);return result;};assert.ok(f.runtime.cast(1));f.runtime.update(.05);assert.equal(f.runtime.deployments[0].applicationCounts.get(f.enemy.id),1);f.runtime.dispose();
}
assert.equal(budgetRejects,29);
console.log(`hero-runtime-test: budget2 per-target/instance producer caps, ${budgetRejects} admission guards, real host ACK/host-cap authority, missing/non-ACK/error rollback, reentrant reservations and replacement ownership checked; uncapped prior cases retained`);
let anchoredRejects=0;
for(const original of heroes)for(const ability of original.abilities) {
  const kit=structuredClone(original);kit.abilities.find(a=>a.slot===ability.slot).anchoredSlow=false;
  const {runtime:r,sim,rejected,joint,enemy,events}=weaponPoseFixture(kit),a=r.kit.abilities.find(a=>a.slot===ability.slot);
  assert.ok(r.cast(r.kit.abilities.find(b=>b!==a).slot));assert.ok(r.fire());r.update(.03);assert.ok(sim.step(.03).ok);
  const cue=r.acceptedAction,pose=joint.quaternion.toArray(),aim=r.aimHit;r.aimHit=()=>assert.fail('invalid anchoredSlow reached aim');
  for(const value of [undefined,null,0,1,'true',[],{},true]) {
    a.anchoredSlow=value;const count=events.length;rejected(a.slot);r.hit(a,enemy);assert.equal(events.length,count);assert.equal(r.acceptedAction,cue);assert.deepEqual(joint.quaternion.toArray(),pose);anchoredRejects++;
  }
  a.anchoredSlow=false;r.aimHit=aim;r.dispose();
}
{
  const {runtime:r,rejected,enemy,events}=weaponPoseFixture(anchoredPuddleKit()),a=r.kit.abilities[0];assert.ok(r.cast(2));assert.ok(r.fire());
  const cue=r.acceptedAction,aim=r.aimHit;r.aimHit=()=>assert.fail('invalid anchored pure definition reached aim');
  for(const [key,value] of [['radius',0],['radius',undefined],['radius',NaN],['radius',Infinity],['radius',10000.01],['baseDamage',1],['baseHeal',1],['spiritScale',1],['damageType','spirit'],['slow',.95],['duration',0],['range',0],['invulnerable',true],['speedMultiplier',2],['headshotMultiplier',2],['id','aura']]) {
    const own=Object.hasOwn(a,key),saved=a[key];a[key]=value;const count=events.length;rejected(1);r.hit(a,enemy);assert.equal(events.length,count);assert.equal(r.acceptedAction,cue);anchoredRejects++;
    if(own)a[key]=saved;else delete a[key];
  }
  const count=events.length;for(const extra of [{},{deploymentId:1},{deploymentId:1,origin:{x:0,y:0,z:1}}])r.hit(a,enemy,extra);assert.equal(events.length,count,'direct status requires real live local producer and complete anchor fields');
  r.aimHit=aim;r.dispose();
}
for(const baseline of [false,true]) {
  const {runtime:r,sim,enemy,controller:c}=hostFixture(anchoredPuddleKit(baseline)),a=r.kit.abilities[0],effect=r.onEffect,attempts=[];
  assert.ok(r.cast(1));a.anchoredSlow=!baseline;
  if(!baseline){c.warp({x:100,y:0,z:100});assert.ok(sim.moveHero('player',c.position).ok);}else assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:2}).ok);
  r.onEffect=event=>{
    if(event.kind!=='status'){effect(event);return;}
    const before=JSON.stringify([sim.heroes,sim.events]);assert.equal(sim.applyHeroEffect(event).ok,false,'mutable client flag cannot override immutable host opt-in');assert.equal(JSON.stringify([sim.heroes,sim.events]),before);attempts.push(event);
  };
  r.update(.05);assert.ok(attempts.length>0);if(baseline)assert.ok(attempts.every(e=>!Object.hasOwn(e,'deploymentId')&&!Object.hasOwn(e,'anchoredSlow')));else assert.ok(attempts.every(e=>e.anchoredSlow===true));
  a.anchoredSlow=baseline;r.onEffect=effect;r.dispose();
}
assert.equal(anchoredRejects,144);
console.log(`hero-runtime-test: OPT-IN native pure puddle center-range/LOS refresh and .5 last-application linger; ${anchoredRejects} definition/flag rejections preserve nonempty cue/state, direct-hit fields fail closed, host ID/origin/flag tampering rejects; legacy checks unchanged`);
// Synthetic native Turretina plus ORIGINAL Gooey puddle in slot4; still exactly
// four native slots, not a proposed kit. Cross-ability end reentry, no reset.
for(const firstID of ['turret','puddle']) {
  const kit=structuredClone(heroes[1]),puddle=structuredClone(heroes[3].abilities.find(a=>a.id==='puddle'));puddle.slot=4;kit.abilities[3]=puddle;
  const {runtime:r,sim,enemy,events,scene}=hostFixture(kit),effect=r.onEffect,first=kit.abilities.find(a=>a.id===firstID),other=kit.abilities.find(a=>a.id===(firstID==='turret'?'puddle':'turret'));
  const friend=sim.heroes.find(h=>h.id==='friend');assert.ok(sim.damage(friend.id,100,enemy.id,{kind:'ability'}).ok);
  r.targets=[];r.setModifiers({cooldown:.01});assert.ok(r.cast(first.slot));const old=r.deployments[0];
  for(let i=0;i<3;i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  let nested=false;r.onEffect=event=>{effect(event);if(!nested&&event.kind==='deployment-end'&&event.ability===firstID){nested=true;assert.ok(r.cast(other.slot));}};
  assert.doesNotThrow(()=>assert.ok(r.cast(first.slot)),'cross-ability cleanup reentry must register starts in per-source ID order');assert.ok(nested);
  const starts=events.filter(e=>e.kind==='deployment-start');assert.deepEqual(starts.map(e=>e.deploymentId),[1,2,3]);
  assert.deepEqual(starts.map(e=>e.ability),[firstID,other.id,firstID]);assert.equal(r.deployments.length,2);
  const fresh=[...r.deployments];assert.ok(fresh.every(d=>r.fx.handles.has(d.handle)&&d.handle.remaining>0));
  const staleEnd=events.find(e=>e.kind==='deployment-end'&&e.deploymentId===old.deploymentId),result=sim.applyHeroEffect(staleEnd);assert.ok(result.ok);assert.equal(result.ended,false);
  assert.equal(r.removeDeployment(old),false);assert.deepEqual(r.deployments,fresh);
  r.targets=[...sim.heroes];const hp=enemy.hp,allyHP=friend.hp;r.update(.05);assert.ok(sim.step(.05).ok);assert.ok(enemy.hp<hp);assert.ok(friend.hp>allyHP);
  for(const id of ['turret','puddle']) {
    const deploy=fresh.find(d=>d.definition.id===id),hit=events.find(e=>e.kind==='damage'&&e.ability===id);
    assert.ok(hit,`${firstID} reentry: BOTH native live emitter origins reach host HP`);assert.equal(hit.deploymentId,deploy.deploymentId);
    assert.deepEqual(hit.origin,{x:deploy.position.x,y:deploy.position.y+(id==='turret'?.9:0),z:deploy.position.z});
  }
  r.dispose();assert.equal(scene.children.length,0);
}
console.log('hero-runtime-test: native turret/puddle live anchors survive caster movement; IDs/origins, stale impact/end/removal, replacement/expiry/reset sequence, shared wall idempotency, reset/same-ability and cross-ability reentrant registration ownership checked');
let remoteChecks=0;
for(const kit of heroes) for(const ability of kit.abilities.filter(a=>['turret','puddle','grenade','missionbomb'].includes(a.id))) {
  const {runtime:r,controller:c,targets,events}=fixture(kit);
  const tracked=['turret','puddle'].includes(ability.id);
  if(tracked) {
    targets[0].position.set(40,0,40); // CPU placement before cast, not an emitter-origin mutation.
    c.warp({x:ability.id==='turret'?-1.5:0,y:0,z:ability.id==='turret'?3:ability.range});
  }
  const placement={...c.position};assert.ok(r.cast(ability.slot));
  if(tracked)targets[0].position.set(0,0,0);
  c.warp({x:100,y:0,z:100}); // Moving AFTER registration does not relocate the emitter.
  let expected;
  if(r.projectiles.length) {
    const projectile=r.projectiles[0];
    projectile.position.set(0,1,0);projectile.velocity.set(0,0,0);projectile.left=0;
    r.update(.01);expected={x:0,y:.9984,z:0};
  } else {
    const deploy=r.deployments[0];
    assert.deepEqual(deploy.position.toArray(),[0,0,0]);expected={x:0,y:ability.id==='turret'?.9:0,z:0};
    targets[1].position.set(1,0,0);r.update(.01);
    deploy.position.set(50,0,50); // Emitted origins must be snapshots, not live vectors.
  }
  const remote=events.filter(e=>e.ability===ability.id&&['damage','heal'].includes(e.kind));
  assert.ok(remote.some(e=>e.kind==='damage'),`${ability.id} remote damage emitted`);
  if(ability.id==='puddle')assert.ok(remote.some(e=>e.kind==='heal'),'puddle remote healing emitted');
  const sim=createSystems();sim.step(30);
  const source=sim.addHero({id:'player',team:'carbon',lane:'midway',position:placement});
  const enemy=sim.addHero({id:'enemy',team:'ivory',lane:'midway'});
  const friend=sim.addHero({id:'friend',team:'carbon',lane:'midway'});
  assert.ok(sim.configureHeroKit(source.id,kit).ok);
  const start=events.find(e=>e.kind==='deployment-start');
  if(tracked){assert.ok(start);assert.ok(sim.applyHeroEffect(start).ok);assert.ok(Number.isSafeInteger(start.deploymentId)&&start.deploymentId>0);}
  assert.ok(sim.moveHero(source.id,c.position).ok);
  assert.ok(sim.moveHero(enemy.id,targets[0].position).ok);
  assert.ok(sim.moveHero(friend.id,targets[1].position).ok);
  assert.ok(sim.damage(friend.id,100,enemy.id,{kind:'ability'}).ok);
  for(const event of remote) {
    for(const key of ['x','y','z'])assert.ok(Math.abs(event.origin?.[key]-expected[key])<1e-6,`${ability.id} ${key} origin`);
    assert.equal(Object.getPrototypeOf(event.origin),Object.prototype,'origin is a plain snapshot');
    if(tracked) {
      assert.equal(event.deploymentId,start.deploymentId);
      const before=JSON.stringify([sim.heroes,sim.events]);
      assert.equal(sim.applyHeroEffect({...event,deploymentId:start.deploymentId+1}).ok,false);
      assert.equal(sim.applyHeroEffect({...event,origin:{...event.origin,x:event.origin.x+1}}).ok,false);
      assert.equal(JSON.stringify([sim.heroes,sim.events]),before,'forged emitter ID/origin cannot mutate HP or events');
    }
    const result=sim.applyHeroEffect(event);
    assert.ok(result.ok&&result.amount>0,`${ability.id} accepted by systems from remote origin: ${result.reason}`);
    remoteChecks++;
  }
  assert.ok(targets.every(t=>t.hp===300),'runtime leaves health authority to systems');
  r.dispose();
}
console.log(`hero-runtime-test: ${remoteChecks} remote-origin events accepted by systems; ${casts} kit casts, cooldown/expiry/cleanup, cover, headshots, tether break, slide ammo, turret, grenade bounce, healing and live xray membership/pooling/lifetime checked (not native acceptance)`);
