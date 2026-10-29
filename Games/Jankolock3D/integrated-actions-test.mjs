// Run: TMPDIR=/dev/shm node Games/Jankolock3D/integrated-actions-test.mjs
// Real game source callbacks + systems/runtime/bots. DOM/bitmap upload mocked; no browser claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { HeroRuntime } from './heroes/hero-runtime.mjs';
import { PlayerController } from './heroes/player-controller.mjs';
import { createBots } from './bots.mjs';
import { mountFixtures } from './integration-fixtures.mjs';
import { createTraveler, moveCapsule, stepTraveler, interact, interaction } from './traversal.mjs';
import { loadCharacter, disposeCharacterAssets } from './character-assets.mjs';
const source=readFileSync(new URL('./game.mjs',import.meta.url),'utf8');
const kits=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../docs/${name}`,import.meta.url))).heroes);
globalThis.self=globalThis;
globalThis.ProgressEvent=class {constructor(type,values){Object.assign(this,{type},values);}};
globalThis.createImageBitmap=async blob=>{
  const bytes=Buffer.from(await blob.arrayBuffer());
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),close(){}};
};
await Promise.all([...kits.map(kit=>loadCharacter(kit.id)),loadCharacter('deployed_stapler')]);
function section(start,end) {
  const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,`${start} -> ${end}`);return source.slice(a,b);
}
function fixture(kit,team='carbon') {
  const sim=createSystems();sim.step(30);
  const hero=sim.addHero({id:'player',team,lane:'midway',position:{x:0,y:0,z:8}});
  assert.ok(sim.configureHeroKit(hero.id,kit).ok);
  const scene=new THREE.Scene(),boxes=[],world={boxes,ramps:[],start:hero.position,crates:[],stations:[],portals:[],vents:[],rope:{x:100,z:100,top:10},pit:{minX:100,maxX:110,minZ:100,maxZ:110}};
  const bots=createBots({sim,scene,world,kits,boxes,floorHeight:()=>0});
  const enemy=sim.heroes.find(h=>h.id==='bot-4');
  assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:0}).ok);
  const controller=new PlayerController({position:hero.position,boxes}),camera=new THREE.PerspectiveCamera(70,1,.1,200);
  controller.updateCamera(camera,0);
  const events=[],results=[],handlers=new Map(),shop={hidden:true};let dialog=null;
  const buttons=[...Array.from({length:4},(_,i)=>({dataset:{edge:`Digit${i+1}`}})),...['melee','parry','reload','interact'].map(action=>({dataset:{action}}))];
  const canvas={},document={hidden:false,pointerLockElement:canvas,
    querySelector:selector=>selector==='.sys-shop'?shop:dialog,
    querySelectorAll:selector=>buttons.filter(b=>selector.includes('data-edge')?b.dataset.edge:b.dataset.action)};
  const context=vm.createContext({THREE,playing:true,paused:false,qa:true,fixture:'chain',wasAlive:true,sim,hero,controller,boxes,world,bots,
    traveler:createTraveler(world),createTraveler,moveCapsule,stepTraveler,interact,interaction,history:[],
    distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),
    view:{scene,camera,sync(){},syncStructures(){}},actors:{sync(){}},document,canvas,held:new Set(),edges:new Set(),
    ui:{message(){},update(){}},listen(node,type,fn){handlers.set(node===document?type:node.dataset.edge??node.dataset.action,fn);}});
  vm.runInContext(section('const targets=()=>','function moveToSystem()'),context);
  // Observe the actual host callback, including orb routing and systems acceptance.
  const runtime=new HeroRuntime({scene,controller,kit,boxes,source:hero.id,team:hero.team,onEffect:event=>{
    events.push(event);const result=context.effect(event);results.push(result);return result;
  }});
  context.runtime=runtime;
  // Include any shared input gate immediately before action(), without copying its implementation.
  vm.runInContext(section('function moveToSystem()','function stop()'),context);
  vm.runInContext(section("  listen(document,'keydown'","  listen(document,'keyup'"),context);
  vm.runInContext(section("  for(const button of document.querySelectorAll('[data-edge]'))","  listen(window,'blur'"),context);
  const press=(name,input='touch')=>{
    if(input==='touch')handlers.get(name)();
    else handlers.get('keydown')({code:({melee:'KeyQ',parry:'KeyF',reload:'KeyR',interact:'KeyE'})[name]??name,
      target:{closest:()=>false,tagName:'CANVAS'},preventDefault(){},repeat:false});
  };
  const api=mountFixtures({sim,hero,controller,traveler:context.traveler,world,runtime,
    view:{...context.view,renderCamera(){camera.updateMatrixWorld();}},actors:context.actors,ui:context.ui,history:[]});
  return {api,context,sim,hero,enemy,bots,controller,camera,runtime,events,results,boxes,shop,document,press,
    dialog(value){dialog=value;},step(seconds){for(let t=0;t<seconds-1e-8;t+=.05)context.tick(Math.min(.05,seconds-t));},
    dispose(){runtime.dispose();bots.dispose();assert.equal(scene.children.length,0);}};
}
let groups=0;const failures=[];
function check(name,kit,run,team='carbon') {
  const f=fixture(kit,team);
  try {run(f);groups++;} catch(error) {failures.push(`${name}: ${error.message}`);console.error(`FAIL ${name}: ${error.message}`);}
  finally {f.dispose();}
}
const ribbon=kits.find(k=>k.id==='ribbon-seraph');
// Scripted initial-funds heroes buy/activate real cloak at the real shop.
// API placement is CPU setup, not native traversal/visibility or new AoE semantics.
for(const team of ['carbon','ivory'])for(const input of ['keyboard','touch']) {
  check(`team-aware cloaked ally aura/${team}/${input}`,kits.find(k=>k.id==='gooey'),f=>{
    const enemyTeam=team==='carbon'?'ivory':'carbon',ring=f.sim.retreatRings.find(r=>r.team===team&&r.lane==='graft');
    f.api.place({...ring.position,x:ring.position.x+2},0,0);
    const ally=f.sim.addHero({id:'cloak-ally',team,souls:4000});assert.ok(f.sim.buyItem(ally.id,'shadow-cloak').ok);
    assert.ok(f.sim.moveHero(ally.id,ring.position).ok);
    const dead=f.sim.addHero({id:'dead-ally',team});assert.ok(f.sim.moveHero(dead.id,{...ring.position,z:ring.position.z+3}).ok);
    assert.ok(f.sim.moveHero(f.enemy.id,{...ring.position,x:ring.position.x+1}).ok);
    assert.ok(f.sim.damage(dead.id,1e6,f.enemy.id,{kind:'ability'}).killed);
    assert.ok(f.sim.damage(ally.id,100,f.enemy.id,{kind:'ability'}).ok);
    assert.ok(f.sim.damage(f.hero.id,100,f.enemy.id,{kind:'ability'}).ok);
    assert.ok(f.sim.moveHero(f.enemy.id,f.sim.bases[enemyTeam]).ok);
    assert.ok(f.sim.activateItem(ally.id,'shadow-cloak').ok);assert.ok(f.sim.setRetreat(ally.id,true).ok);
    const foe=f.sim.addHero({id:'cloak-foe',team:enemyTeam,souls:4000});assert.ok(f.sim.buyItem(foe.id,'shadow-cloak').ok);
    assert.ok(f.sim.moveHero(foe.id,{x:f.hero.position.x+.55,y:0,z:f.hero.position.z-3}).ok);assert.ok(f.sim.activateItem(foe.id,'shadow-cloak').ok);
    assert.ok(f.sim.step(.05).ok);assert.ok(ally.recall);assert.ok(ally.cloakUntil>f.sim.time&&foe.cloakUntil>f.sim.time);
    const hp=ally.hp,ownHP=f.hero.hp,foeHP=foe.hp,cloak=ally.cloakUntil,foeCloak=foe.cloakUntil,recall=ally.recall;
    const aura=f.runtime.kit.abilities.find(a=>a.id==='aura');f.press(`Digit${aura.slot}`,input);f.runtime.update(.05);
    assert.equal(ally.hp,hp+aura.baseHeal,'actual native aura must heal the injured alive CLOAKED ALLY');
    assert.equal(f.hero.hp,ownHP+aura.baseHeal);assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target===f.hero.id).length,1);
    assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target===ally.id).length,1);assert.equal(f.runtime.castCount.aura,1);
    assert.equal(ally.cloakUntil,cloak);assert.equal(ally.recall,recall,'healing must not cancel target recall');assert.ok(ally.cloakUntil>f.sim.time);
    const descriptors=vm.runInContext('targets()',f.context),byID=id=>descriptors.find(t=>t.id===id);
    assert.equal(byID(ally.id).alive,true);assert.equal(byID(foe.id).alive,false);assert.equal(byID(dead.id).alive,false);
    for(const entity of [...f.sim.heroes,...f.sim.troopers,...f.sim.structures]) {
      const d=byID(entity.id);assert.equal(d.kind,entity.kind);assert.equal(d.team,entity.team);assert.equal(d.position,entity.position);
      assert.equal(d.radius,entity.kind==='structure'?3:.6);assert.equal(d.height,entity.kind==='structure'?12:1.8);
    }
    f.api.aimAt(foe.id);assert.equal(f.context.fire(),true);f.press('Digit2',input);
    assert.equal(foe.hp,foeHP,'native fire and cone cannot directly target the ineligible cloaked enemy');assert.equal(foe.cloakUntil,foeCloak);assert.ok(foe.cloakUntil>f.sim.time);
    assert.equal(f.events.filter(e=>['damage','status'].includes(e.kind)&&e.target===foe.id).length,0);
    assert.equal(f.events.filter(e=>e.kind==='heal'&&f.sim.structures.some(s=>s.id===e.target)).length,0);
    assert.equal(f.events.filter(e=>e.kind==='damage'&&e.baseDamage===0).length,0);assert.ok(f.results.every(r=>r.ok));
    assert.equal(ally.cloakUntil,cloak);assert.equal(ally.recall,recall);
  },team);
}
// Synthetic original-ID status fixture through the ACTUAL player descriptor/input callbacks.
const statusKit=structuredClone(kits.find(k=>k.id==='stampead'));
Object.assign(statusKit.abilities[1],{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
for(const input of ['keyboard','touch']) {
  check(`typed player status targets/${input}`,statusKit,f=>{
    const descriptors=vm.runInContext('targets()',f.context);
    for(const entity of [...f.sim.heroes,...f.sim.troopers,...f.sim.structures])
      assert.equal(descriptors.find(t=>t.id===entity.id)?.kind,entity.kind,'real player adapter preserves authoritative kind');
    const hp=f.enemy.hp,ammo=f.runtime.ammo,souls=f.hero.souls;
    f.press('Digit2',input);
    assert.equal(f.enemy.hp,hp);assert.equal(f.runtime.ammo,ammo);assert.equal(f.hero.souls,souls);
    assert.equal(f.sim.stats(f.enemy.id).moveSpeed,4.8);assert.equal(f.events.length,1);
    assert.equal(f.events[0].kind,'status');assert.ok(f.results.every(r=>r.ok));
    const enemy=descriptors.find(t=>t.id===f.enemy.id),a=f.runtime.kit.abilities[1],count=f.events.length;
    f.runtime.targets=[undefined,'orb','unknown','structure'].map(kind=>({...enemy,kind}));
    for(const target of f.runtime.targets)f.runtime.hit(a,target);
    f.runtime.area(a,f.controller.position,{cone:true});
    assert.equal(f.events.length,count,'untyped/orb/unknown/structure descriptors never emit status');
  });
  check(`near-building player status/${input}`,statusKit,f=>{
    const structure=f.sim.structures.find(t=>t.team==='ivory'&&t.lane==='midway'&&t.type==='guardian');
    f.api.place({...structure.position,x:structure.position.x-7},-Math.PI/2,0);f.api.aimAt(structure.id);
    const hp=structure.hp;f.press('Digit2',input);
    assert.equal(structure.hp,hp);assert.equal(f.runtime.castCount.volley,1);
    assert.equal(f.runtime.targets.find(t=>t.id===structure.id).kind,'structure');
    assert.equal(f.events.length,0,'actual near-building cast emits no rejected structure status intent');
  });
}
for(const input of ['keyboard','touch']) {
  check(`fresh targets/${input}`,ribbon,f=>{
    f.runtime.targets=[]; // Native press after start, before the first simulation frame.
    const hp=f.enemy.hp;f.press('Digit1',input);
    assert.ok(f.enemy.hp<hp,'first press must damage the live bot, not cast into an empty stale list');
    assert.equal(f.runtime.tether?.targetId,f.enemy.id);assert.ok(f.results.every(r=>r.ok));
  });
  check(`fresh aim/${input}`,ribbon,f=>{
    f.runtime.targets=vm.runInContext('targets()',f.context);f.runtime.aim(f.camera);
    f.camera.lookAt(30,1,8); // Previous camera orientation before the native look change.
    const hp=f.enemy.hp;f.press('Digit1',input);
    assert.ok(f.enemy.hp<hp,'press must resolve current controller aim, not the previous camera ray');
  });
  check(`fresh melee/${input}`,ribbon,f=>{
    f.runtime.targets=vm.runInContext('targets()',f.context);
    assert.ok(f.sim.moveHero(f.enemy.id,{x:0,y:0,z:6}).ok); // Authority replaces its position object.
    const hp=f.enemy.hp;f.press('melee',input);
    assert.ok(f.enemy.hp<hp,'melee must use current systems positions');
  });
}
for(const [name,set,restore] of [
  ['lobby',f=>{f.context.playing=false;},f=>{f.context.playing=true;}],
  ['pause',f=>{f.context.paused=true;},f=>{f.context.paused=false;}],
  ['hidden',f=>{f.document.hidden=true;},f=>{f.document.hidden=false;}],
  ['death',f=>{assert.ok(f.sim.damage(f.hero.id,100000,f.enemy.id,{kind:'ability'}).killed);},()=>{}],
  ['pregame',f=>{f.sim.phase='pregame';},f=>{f.sim.phase='laning';}],
  ['shop',f=>{f.shop.hidden=false;},f=>{f.shop.hidden=true;}],
  ['dialog',f=>f.dialog({}),f=>f.dialog(null)],
  ['finished',f=>{f.sim.phase='finished';},f=>{f.sim.phase='laning';}],
  ['winner',f=>{f.sim.winner='ivory';},f=>{f.sim.winner=null;}]
]) for(const input of ['keyboard','touch']) check(`guard ${name}/${input}`,ribbon,f=>{
  f.runtime.ammo--;const before=f.runtime.snapshot();set(f);
  for(const name of ['Digit1','melee','parry','reload'])f.press(name,input);
  assert.deepEqual(f.runtime.snapshot(),before,'blocked input must not spend cooldowns, reload, emit FX or queue actions');
  assert.equal(f.events.length,0);restore(f);
  assert.deepEqual(f.runtime.snapshot(),before,'unblocking does not replay inputs');
});
// Exercise the original four and supplied four through the same production host.
for(const kit of kits) {
  check(`${kit.id} weapon/reload/melee/parry`,kit,f=>{
    const hp=f.enemy.hp;assert.equal(f.context.fire(),true);assert.ok(f.enemy.hp<hp);
    assert.equal(f.context.fire(),false);assert.equal(f.runtime.ammo,kit.weapon.magazine-1);
    f.press('reload');assert.ok(f.runtime.reload>0);assert.equal(f.context.fire(),false);
    f.step(kit.weapon.reload+.1);assert.equal(f.runtime.ammo,kit.weapon.magazine);
    assert.ok(f.sim.moveHero(f.enemy.id,{x:0,y:0,z:6}).ok);
    const before=f.enemy.hp;f.press('melee','keyboard');assert.ok(f.enemy.hp<before);
    f.press('parry');assert.equal(f.sim.stats(f.hero.id).parry,true);
    assert.ok(f.results.length>=3&&f.results.every(r=>r.ok));
  });
  for(const ability of kit.abilities) for(const input of ['keyboard','touch']) check(`${kit.id}/${ability.id}/${input}`,kit,f=>{
    if(ability.id==='slam')f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:5});
    if(['grenade','missionbomb'].includes(ability.id))f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:8-12*ability.duration});
    if(ability.id==='aura')assert.ok(f.sim.damage(f.hero.id,50,f.enemy.id,{kind:'ability'}).ok);
    const hp=f.enemy.hp,ownHP=f.hero.hp;f.press(`Digit${ability.slot}`,input);
    assert.equal(f.runtime.castCount[ability.id],1);assert.ok(f.runtime.cooldowns[ability.slot]>0);
    assert.ok(f.runtime.fx.count>0);f.press(`Digit${ability.slot}`,input);
    assert.equal(f.runtime.castCount[ability.id],1,'held/repeated action cannot bypass cooldown');
    if(['hook','volley','glue','slam','longshot','tether'].includes(ability.id))assert.ok(f.enemy.hp<hp,'host accepted actual damage against a bot');
    if(ability.id==='tether')assert.ok(f.runtime.tether&&f.sim.stats(f.enemy.id).moveSpeed<8);
    if(ability.id==='hook'){f.step(.4);assert.ok(f.controller.position.z<7);}
    if(ability.id==='barricade'){assert.equal(f.boxes.length,1);assert.equal(f.runtime.deployments.length,1);}
    if(ability.id==='overtime') {
      assert.equal(f.sim.stats(f.hero.id).moveSpeed,8*ability.speedMultiplier);
      assert.equal(f.sim.stats(f.hero.id).invulnerable,ability.invulnerable);
    }
    if(['xray','headshot','chaingun','aura'].includes(ability.id))assert.ok(f.runtime.buffs[ability.id]);
    if(ability.id==='headshot') {
      f.controller.pitch=Math.atan2(.4,8);assert.equal(f.context.fire(),true);
      const event=f.events.at(-1);assert.equal(event.headshot,true);assert.equal(event.headshotMultiplier,ability.headshotMultiplier);
    }
    if(['turret','puddle','chaingun','aura'].includes(ability.id)) {
      f.step(.05);
      if(ability.id==='aura') {
        assert.equal(f.hero.hp,ownHP+ability.baseHeal,'integrated target list must not double-heal the caster');
        assert.equal(f.events.filter(e=>e.kind==='heal'&&e.target===f.hero.id).length,1);
        assert.equal(f.events.filter(e=>e.kind==='damage').length,0,'healing-only aura emits no zero-damage intents');
      } else assert.ok(f.enemy.hp<hp,'autonomous effect reaches systems');
    }
    if(['grenade','missionbomb'].includes(ability.id)) {
      assert.equal(f.runtime.projectiles.length,1);f.step(ability.duration+.1);
      assert.equal(f.runtime.projectiles.length,0);assert.ok(f.enemy.hp<hp,'natural fused trajectory damages bot through host');
    }
    assert.ok(f.results.every(r=>r.ok),`${kit.id}/${ability.id} host rejected an intent`);
  });
}
check('pregame world interaction remains available',ribbon,f=>{
  f.sim.phase='pregame';f.context.world.crates.push({id:'input-crate',kind:'supply',x:0,y:0,z:8});
  const before=f.runtime.snapshot();f.press('interact','keyboard');
  assert.ok(f.context.traveler.broken.has('input-crate'));assert.deepEqual(f.runtime.snapshot(),before);
});
for(const kind of ['hero','trooper','structure','orb']) check(`real fixture aim/${kind}`,ribbon,f=>{
  f.sim.step(45);
  let target;
  if(kind==='orb') {
    const trooper=f.sim.troopers.find(t=>t.team==='ivory'&&t.alive);
    f.sim.moveHero(f.hero.id,{...trooper.position,x:trooper.position.x-1});
    assert.ok(f.sim.damage(trooper.id,1000,f.hero.id,{kind:'ability'}).ok);
    target=f.sim.orbs.find(o=>o.type==='floating'&&!o.claimed);assert.ok(target);
  } else target=kind==='hero'?f.enemy:(kind==='trooper'?f.sim.troopers:f.sim.structures).find(t=>t.team==='ivory'&&t.alive);
  f.api.place({...target.position,x:target.position.x-7},-Math.PI/2+.4,.2);
  const state=JSON.stringify([f.sim.heroes,f.sim.troopers,f.sim.structures,f.sim.orbs,f.sim.time]);
  const project=THREE.Vector3.prototype.project,errors=[];
  THREE.Vector3.prototype.project=function(camera){
    const expected=this.clone().applyMatrix4(new THREE.Matrix4().compose(camera.position,camera.quaternion,camera.scale).invert()).applyMatrix4(camera.projectionMatrix);
    const result=project.call(this,camera);errors.push(result.distanceTo(expected));return result;
  };
  try {f.api.aimAt(target.id);} finally {THREE.Vector3.prototype.project=project;}
  assert.ok(errors.length===40&&Math.max(...errors)<1e-10,`${kind} stale projection error: ${Math.max(...errors)}`);
  const center=kind==='orb'?0:kind==='structure'?6:.9;
  const projected=new THREE.Vector3(target.position.x,target.position.y+center,target.position.z).project(f.camera);
  assert.ok(Math.hypot(projected.x,projected.y)<.01,`${kind} off-center: ${projected.toArray()}`);
  assert.equal(JSON.stringify([f.sim.heroes,f.sim.troopers,f.sim.structures,f.sim.orbs,f.sim.time]),state,'aim must not write simulation state');
  const angles=[f.controller.yaw,f.controller.pitch];assert.throws(()=>f.api.aimAt('missing'),/Unknown QA aim target/);
  assert.deepEqual([f.controller.yaw,f.controller.pitch],angles);
  if(kind==='orb') {assert.equal(f.context.fire(),true);assert.ok(target.claimed,'actual source weapon secures the aimed orb');}
});
for(const kit of kits.filter(k=>['ribbon-seraph','spoollash','checkmate-regent','prism-warden'].includes(k.id))) {
  check(`${kit.id} fixture aim/native source cast`,kit,f=>{
    f.api.place({...f.enemy.position,x:f.enemy.position.x-7},-Math.PI/2,0);f.api.aimAt(f.enemy.id);
    const hp=f.enemy.hp;f.press(kit.id==='checkmate-regent'?'Digit3':'Digit1','keyboard');assert.ok(f.enemy.hp<hp,'actual source cast hits live bot');
    assert.ok(f.results.every(r=>r.ok));
  });
  check(`${kit.id} fixture aim/covered source cast`,kit,f=>{
    f.api.place({...f.enemy.position,x:f.enemy.position.x-7},-Math.PI/2,0);f.api.aimAt(f.enemy.id);
    f.boxes.push({minX:f.enemy.position.x-4,maxX:f.enemy.position.x-3,minY:0,maxY:5,minZ:-3,maxZ:3});
    const hp=f.enemy.hp;f.press(kit.id==='checkmate-regent'?'Digit3':'Digit1','keyboard');assert.equal(f.enemy.hp,hp,'reticle cannot bypass muzzle cover');
    assert.equal(f.runtime.tether,null);
  });
}
for(const kit of kits.filter(k=>k.abilities.some(a=>a.id==='tether'))) {
  const ability=kit.abilities.find(a=>a.id==='tether');
  for(const mode of ['cover','range','target-death','caster-death','reset','recast-miss','dispose','expiry','movement']) check(`${kit.id} tether/${mode}`,kit,f=>{
    assert.equal(f.runtime.snapshot().tether,null);
    f.api.aimAt(f.enemy.id);
    f.press(`Digit${ability.slot}`);assert.equal(f.runtime.tether?.targetId,f.enemy.id);
    const state=JSON.stringify({hero:f.hero,enemy:f.enemy,events:f.events,systemEvents:f.sim.events});
    const snapshot=f.runtime.snapshot(),bot=f.bots.snapshot().find(b=>b.id===f.enemy.id);
    assert.deepEqual(snapshot.tether,{targetId:f.enemy.id,left:ability.duration});
    assert.notEqual(snapshot.tether,f.runtime.tether);
    assert.equal(bot.hp,f.enemy.hp);assert.equal(bot.moveSpeed,f.sim.stats(f.enemy.id).moveSpeed);assert.ok(bot.moveSpeed<8);
    snapshot.tether.targetId='detached';snapshot.tether.left=-1;bot.hp=-1;bot.moveSpeed=-1;
    assert.deepEqual(f.runtime.snapshot().tether,{targetId:f.enemy.id,left:ability.duration});
    assert.equal(JSON.stringify({hero:f.hero,enemy:f.enemy,events:f.events,systemEvents:f.sim.events}),state,'reading/mutating observations changes no live state');
    assert.ok(f.sim.stats(f.enemy.id).moveSpeed<8);const hp=f.enemy.hp;
    if(mode==='cover')f.boxes.push({minX:-3,maxX:3,minY:0,maxY:5,minZ:3,maxZ:4});
    if(mode==='range')f.sim.moveHero(f.enemy.id,{x:100,y:0,z:0});
    if(mode==='target-death')assert.ok(f.sim.damage(f.enemy.id,100000,f.hero.id,{kind:'ability'}).killed);
    if(mode==='caster-death')assert.ok(f.sim.damage(f.hero.id,100000,f.enemy.id,{kind:'ability'}).killed);
    if(mode==='reset')f.runtime.reset();
    if(mode==='recast-miss') {
      f.runtime.cooldowns[ability.slot]=0;f.controller.yaw=Math.PI;f.press(`Digit${ability.slot}`);
    }
    if(mode==='movement') {
      const old=f.runtime.targets.find(t=>t.id===f.enemy.id).position;
      f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:-2});f.step(.05);
      assert.notEqual(f.runtime.targets.find(t=>t.id===f.enemy.id).position,old);
      assert.equal(f.runtime.tether?.targetId,f.enemy.id,'in-range replacement position remains linked');
      assert.equal(f.runtime.snapshot().tether.left,ability.duration-.05,'snapshot reports current, not initial lifetime');
      assert.equal(snapshot.tether.left,-1,'detached observation never follows live updates');
      const delta=new THREE.Vector3(f.enemy.position.x,f.enemy.position.y+.9,f.enemy.position.z).sub(f.runtime.origin);
      assert.ok(Math.abs(f.runtime.tether.handle.group.scale.y-delta.length()/f.runtime.tether.length)<1e-8);
      f.runtime.reset();
    }
    if(mode==='dispose')f.runtime.dispose();else f.step(mode==='expiry'?ability.duration+.1:.05);
    assert.equal(f.runtime.tether,null);assert.equal(f.runtime.snapshot().tether,null);
    assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);
    const unlinked=f.bots.snapshot().find(b=>b.id===f.enemy.id);
    assert.equal(unlinked.moveSpeed,8);assert.equal(unlinked.hp,f.enemy.hp);
    assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);
    if(mode!=='target-death')assert.equal(f.enemy.hp,hp,'cleanup is not a second hit');
    f.runtime.reset();assert.equal(f.events.filter(e=>e.kind==='tether-end').length,1);
    assert.ok(f.results.every(r=>r.ok),'cleanup remains validated after caster death/disposal');
  });
}
// Combined REAL tick/fire/frame callbacks: the view must not consume camera time twice.
for(const hz of [30,60,120,10,4])for(const covered of [false,true]) {
  check(`shot/draw camera clock ${hz}Hz/cover=${covered}`,kits[0],f=>{
    const c=f.context,dt=1/hz;
    Object.assign(c,{stopped:false,previous:0,raf:0,window:{},requestAnimationFrame(){return 1;}});
    if(covered)f.boxes.push(
      {minX:-5,maxX:5,minY:0,maxY:4,minZ:10.5,maxZ:11},
      {minX:1.4,maxX:2,minY:0,maxY:4,minZ:6,maxZ:12});
    let elapsed=0,draws=0,shot=null,samples=0,earlierShots=0,maxShift=0,maxProjection=0;
    const updateCamera=f.controller.updateCamera.bind(f.controller),aimHit=f.runtime.aimHit.bind(f.runtime);
    f.controller.updateCamera=(camera,seconds)=>{elapsed+=seconds;return updateCamera(camera,seconds);};
    f.runtime.aimHit=range=>{
      const hit=aimHit(range);f.camera.updateMatrixWorld(true);
      shot={position:f.camera.position.clone(),quaternion:f.camera.quaternion.clone(),fov:f.camera.fov,
        point:hit.point.clone(),projection:hit.point.clone().project(f.camera),time:f.runtime.time};
      return hit;
    };
    c.view.renderCamera=()=>{draws++;f.camera.updateMatrixWorld(true);};
    vm.runInContext(section('  function frame(now) {','\n  raf=requestAnimationFrame(frame);'),c);
    for(const key of ['KeyW','ArrowLeft','fire','aim'])c.held.add(key);
    for(let i=1;i<=hz;i++) {
      elapsed=0;shot=null;c.frame(i*1000/hz);
      assert.ok(Math.abs(elapsed-dt)<1e-8,'camera time advances once per frame, not twice');
      if(shot&&Math.abs(shot.time-f.runtime.time)>=1e-8)earlierShots++;
      if(shot&&Math.abs(shot.time-f.runtime.time)<1e-8) {
        samples++;
        const shift=shot.position.distanceTo(f.camera.position),projected=shot.point.clone().project(f.camera);
        const projection=projected.distanceTo(shot.projection);
        maxShift=Math.max(maxShift,shift);maxProjection=Math.max(maxProjection,projection);
        assert.ok(shift<1e-8,'no temporal camera movement after latest shot');
        assert.ok(shot.quaternion.angleTo(f.camera.quaternion)<1e-7,'render keeps latest shot center ray');
        assert.equal(f.camera.fov,shot.fov,'render keeps latest shot ADS projection');
        assert.ok(projection<1e-8,'actual hit point retains its shot-time projection');
      }
      for(const box of f.boxes)assert.equal(
        ['X','Y','Z'].every(axis=>f.camera.position[axis.toLowerCase()]>box[`min${axis}`]-.3&&f.camera.position[axis.toLowerCase()]<box[`max${axis}`]+.3),
        false,'camera sphere stays outside corner walls');
    }
    assert.ok(f.runtime.shots>0,'real configured Stampead fired');
    if(hz>=30)assert.ok(samples>0,'latest-tick shot projection was actually sampled');
    else assert.ok(earlierShots>0,'earlier substep shots may legitimately precede the final camera pose');
    console.log(`camera-clock: ${hz}Hz cover=${covered} latest-samples=${samples} earlier-substep-shots=${earlierShots} shift=${maxShift} projection-drift=${maxProjection} (CPU)`);
    const zeroPosition=f.camera.position.clone(),zeroFov=f.camera.fov,zeroShots=f.runtime.shots;
    elapsed=0;c.frame(1000);assert.equal(elapsed,0);assert.equal(f.runtime.shots,zeroShots);
    assert.ok(f.camera.position.distanceTo(zeroPosition)<1e-8);assert.equal(f.camera.fov,zeroFov);
    const time=f.sim.time,position=f.camera.position.clone(),fov=f.camera.fov,count=draws;
    c.paused=true;c.frame(1100);assert.equal(draws,count);assert.equal(f.sim.time,time);
    c.paused=false;f.document.hidden=true;c.frame(1200);
    assert.equal(f.sim.time,time);assert.ok(f.camera.position.distanceTo(position)<1e-8);assert.equal(f.camera.fov,fov);
    // A late recall/respawn-style warp still needs the final zero-time refresh.
    f.boxes.length=0;f.controller.yaw=f.controller.pitch=0;f.controller.warp({x:20,y:0,z:20});
    c.frame(1300);assert.ok(f.camera.position.distanceTo(new THREE.Vector3(21.1,1.49,24))<1e-8);
  });
}
check('between-frame look/fire remains immediate',kits[0],f=>{
  const before=f.camera.getWorldDirection(new THREE.Vector3());
  f.controller.yaw+=.4;
  assert.equal(f.context.fire(),true);assert.equal(f.runtime.shots,1);
  const direction=f.camera.getWorldDirection(new THREE.Vector3());
  const target=f.controller.position.clone().add(new THREE.Vector3(0,1.49,0)).addScaledVector(f.runtime.direction,30);
  assert.ok(direction.distanceTo(before)>.1,'current look is applied before any simulation frame');
  assert.ok(direction.distanceTo(target.sub(f.camera.position).normalize())<1e-10);
});
check('keyboard turn trajectory across frame partitions',kits[0],f=>{
  const c=f.context;
  Object.assign(c,{stopped:false,previous:0,raf:0,window:{},requestAnimationFrame(){return 1;}});
  c.view.renderCamera=()=>f.camera.updateMatrixWorld(true);
  vm.runInContext(section('  function frame(now) {','\n  raf=requestAnimationFrame(frame);'),c);
  for(const [key,sign] of [['ArrowLeft',1],['ArrowRight',-1]]) {
    const endpoints=[];
    for(const hz of [30,60,120]) {
      f.api.place({x:0,y:0,z:8},0,0);c.previous=0;c.held.clear();c.held.add('KeyW');c.held.add(key);
      for(let i=1;i<=hz*1.5;i++) {
        if(i===hz+1)c.held.clear();c.frame(i*1000/hz);
        assert.ok(Math.abs(f.controller.yaw-sign*1.7*Math.min(1,i/hz))<1e-10,'full current keyboard aim, no added smoothing');
      }
      endpoints.push(f.controller.position.clone());
    }
    const error=endpoints[0].distanceTo(endpoints[2]);
    assert.ok(error<.02,`${key}: 30/120Hz trajectory difference ${error}m exceeds 2cm`);
    console.log(`turn-partition: ${key} 30/120Hz endpoint difference=${error}m (CPU, not zero/native parity)`);
  }
});
// Actual notice methods + real Host receipts: a passive interaction must not erase a confirmed hit.
for(const protectedTarget of [false,true])check(`confirmed hit notice/Overtime=${protectedTarget}`,kits[0],f=>{
  const notice={textContent:''},systemsSource=readFileSync(new URL('./systems-ui.mjs',import.meta.url),'utf8');
  const uiSource=readFileSync(new URL('./integration-ui.mjs',import.meta.url),'utf8');
  const noticeContext=vm.createContext({AbortController,sim:f.sim,$:()=>notice,playing:true,disposed:false});
  const a=systemsSource.indexOf('  const listeners ='),b=systemsSource.indexOf('  const hero =',a);
  assert.ok(a>=0&&b>a);vm.runInContext(systemsSource.slice(a,b)+'\nglobalThis.noticeMessage=message;',noticeContext);
  noticeContext.systems={message:noticeContext.noticeMessage};
  const start=uiSource.indexOf('    message(text'),end=uiSource.indexOf('    setPlaying,',start);
  assert.ok(start>=0&&end>start);
  f.context.ui.message=vm.runInContext('({'+uiSource.slice(start,end)+'})',noticeContext).message;
  const target=f.sim.heroes.find(h=>h.id==='bot-5'),enemy=f.bots.runtimes.find(r=>r.source===target.id);
  assert.equal(enemy.kit.id,'stampead');
  assert.ok(f.sim.moveHero(f.enemy.id,{x:100,y:0,z:100}).ok);
  assert.ok(f.sim.moveHero(target.id,{x:.55,y:0,z:0}).ok);enemy.controller.warp(target.position);
  if(protectedTarget)assert.equal(enemy.cast(4),true,'real native Overtime, no private immunity grant');
  f.api.aimAt(target.id);
  f.context.world.crates.push({id:'notice-crate',kind:'soul',...f.hero.position});
  const hp=target.hp,hitAt=f.sim.time;f.context.held.add('fire');f.context.tick(.05);f.context.held.delete('fire');
  const prompt='E to collect soul-crate';
  if(protectedTarget) {
    assert.equal(target.hp,hp);assert.equal(notice.textContent,prompt,'Host rejection produces no confirmed-hit notice');
    assert.ok(f.results.some(r=>!r.ok&&r.reason==='invulnerable'));
    console.log('impact-notice: real Overtime rejection, zero HP loss, no confirmed-hit text (CPU)');
  } else {
    assert.ok(target.hp<hp);assert.match(notice.textContent,/^Hit: \d+ damage\.$/,'confirmed hit survives the same-frame prompt');
    const hit=notice.textContent;f.step(.5);assert.equal(notice.textContent,hit,'confirmation remains within its 0.6-second hold');
    const retainedAt=f.sim.time-hitAt;
    f.step(.1);assert.equal(notice.textContent,prompt,'passive hint returns after the hold');
    console.log(`impact-notice: ${hit} retained at +${retainedAt.toFixed(2)}s; passive hint restored at +${(f.sim.time-hitAt).toFixed(2)}s (CPU)`);
    f.context.ui.message('Panels block the landing.');f.context.ui.message(prompt,true);
    assert.equal(notice.textContent,'Panels block the landing.','urgent feedback remains immediate and protected');
  }
});
check('real game rail reboarding, detach handoff and reset',kits[0],f=>{
  // Match the fixture's flat controller floor; x=0,z=8 lies over the real sewer terrain.
  const c=f.context,s=c.traveler,line={id:'test-rail',lane:'midway',a:{x:80,y:0,z:100},b:{x:80,y:0,z:112}};
  c.world.stations.push(line);f.api.place(line.a,0,0);
  f.press('KeyW','keyboard');f.press('ShiftLeft','keyboard');c.tick(.01);c.held.clear();
  const stamina=f.controller.stamina;
  for(let trip=0;trip<4;trip++) {
    f.press('interact');assert.equal(s.mode,'zip');assert.equal(s.ride.direction,trip%2?-1:1);
    if(trip===0)assert.equal(f.controller.stamina,stamina,'boarding does not grant warp resources');
    for(let i=0;s.mode==='zip'&&i<30;i++)c.tick(.05);
    assert.equal(s.mode,'free');assert.equal(s.ride,null);assert.equal(f.controller.grounded,true);
    assert.equal(f.controller.position.z,trip%2?100:112);assert.equal(f.controller.velocity.y,0);
    f.press('interact');assert.equal(s.mode,'free','arrival lock applies');
    f.step(.85);assert.equal(s.cooldown,0,'free-mode game ticks expire the lock');
  }
  f.press('interact');f.step(.35);f.press('interact');
  assert.equal(s.mode,'free');assert.equal(f.controller.grounded,false);assert.equal(f.controller.velocity.y,4);
  const y=f.controller.position.y;c.tick(.05);assert.ok(f.controller.position.y>y,'detach retains upward motion');
  const collected=s.collected,broken=s.broken;s.safe={x:150,y:0,z:150};
  f.controller.warp(line.a);c.resetTraversal(f.controller.position);
  assert.equal(s.cooldown,0);assert.equal(s.ride,null);assert.equal(s.vy,0);assert.equal(s.safe.z,100);
  assert.equal(s.collected,collected);assert.equal(s.broken,broken,'in-match reset does not respawn looted crates');
  f.press('interact');assert.equal(s.mode,'zip','reset permits another boarding');
});
// Startup markers bracket real awaits/construction; ready follows the draw and snapshot installation.
{
  const order=["startupStage('hero-preload'",'  await Promise.all([preloadHeroes()',"startupStage('kit-load'",'  const definitions=await Promise.all(',
    "startupStage('world-construction'",'  view=createWorldScene(',"startupStage('portrait-load'",'  portrait=await mountPortrait(lobby)',
    "startupStage('lobby-setup'",'  ui=mountIntegrationUI(',"startupStage('first-lobby-render'",'view.camera.lookAt(-1001,4,-2);view.renderCamera();',
    "startupStage('snapshot-install'",'  window.jank3dSnapshot=',"startupStage('qa-fixtures'","await import('./integration-fixtures.mjs')",
    '  raf=requestAnimationFrame(frame);',"startupStage('ready'"];
  let previous=-1;
  for(const marker of order){const index=source.indexOf(marker);assert.ok(index>previous,`startup marker order: ${marker}`);previous=index;}
}
// Real lobby/frame/selection/resize callbacks; renderer/RAF delivery are mocked.
{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),boxes=[],canvas={};
  const controller=new PlayerController({boxes}),queue=new Map(),draws=[];
  let id=0,now=0,resizes=0,ticks=0,starts=0;
  const cleanup=[],loadingStatus={dataset:{},hidden:true,textContent:''};
  const runtime=new HeroRuntime({scene,controller,kit:kits[0],boxes});
  const context=vm.createContext({THREE,kits,selected:kits[0].id,runtime,controller,boxes,canvas,loadingStatus,
    playing:false,paused:false,stopped:false,previous:0,raf:0,hero:{id:'player',alive:true},
    sim:{winner:null,configureHeroKit(){return {ok:true};}},lobby:{visible:true},world:{},qa:false,
    view:{scene,camera,resize(){if(!context.playing)assert.deepEqual(camera.position.toArray(),[-1001,4.3,13],'camera ready before observer resize');resizes++;},renderCamera(){
      if(!context.playing) {
        assert.deepEqual(camera.position.toArray(),[-1001,4.3,13]);
        const direction=new THREE.Vector3(-1001,4,-2).sub(camera.position).normalize();
        assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction)<1e-10,'lobby draw uses initialized camera orientation');
        assert.deepEqual(context.runtime.visual.group.position.toArray(),[-1007,0,4]);
      }
      if(draws.length===0) {
        assert.equal(loadingStatus.dataset.stage,'first-lobby-render');
        assert.equal(loadingStatus.hidden,false);assert.ok(loadingStatus.textContent);
      }
      draws.push(context.runtime.kit.id);
    }},
    ui:{update(){},setPlaying(){},message(){},dispose(){cleanup.push('ui');}},HeroRuntime,effect(){},clear(){},surfaceHeight(){return 0;},
    createBots(){starts++;return {dispose(){cleanup.push('bots');}};},tick(){ticks++;},window:{},listen(){},
    actors:{dispose(){cleanup.push('actors');}},portrait:{dispose(){cleanup.push('portrait');}},
    disposeCharacterAssets(){cleanup.push('assets');},abort:{abort(){cleanup.push('listeners');}},
    ResizeObserver:class {constructor(callback){this.callback=callback;}observe(node){assert.equal(node,canvas);}disconnect(){cleanup.push('observer');}},
    requestAnimationFrame(callback){assert.equal(queue.size,0,'one RAF chain only');queue.set(++id,callback);return id;},
    cancelAnimationFrame(key){queue.delete(key);}
  });
  vm.runInContext(section('function startupStage(', 'const listen='),context);
  for(const stage of ['hero-preload','kit-load','world-construction','portrait-load','lobby-setup']) {
    loadingStatus.hidden=true;context.startupStage(stage,`Loading ${stage}`);
    assert.equal(loadingStatus.dataset.stage,stage);assert.equal(loadingStatus.hidden,false);assert.equal(loadingStatus.textContent,`Loading ${stage}`);
  }
  vm.runInContext(section('  runtime.visual.group.position.set(-1007','  let selected='),context);
  vm.runInContext(section('  function select(id) {','  ui=mountIntegrationUI('),context);
  vm.runInContext(section("  listen(canvas,'webglcontextlost'",'  window.jank3dSnapshot='),context);
  assert.deepEqual(camera.position.toArray(),[-1001,4.3,13],'lobby camera set before first observer callback');
  vm.runInContext(section('  function frame(now) {','} catch(error)'),context);
  assert.equal(loadingStatus.hidden,true);assert.equal(loadingStatus.dataset.stage,'ready','ready marker survives hidden loading output');
  const frame=()=>{assert.equal(queue.size,1);const [key,callback]=queue.entries().next().value;queue.delete(key);callback(now+=16);};
  assert.deepEqual(draws,[kits[0].id],'initial lobby draws with RAF withheld');
  frame();assert.deepEqual(draws,[kits[0].id],'initial lobby draw once');
  for(let i=0;i<10;i++)frame();assert.equal(draws.length,1,'settled static lobby does not redraw');
  context.select(ribbon.id);assert.deepEqual(draws,[kits[0].id,ribbon.id],'selection draws immediately with RAF withheld');
  frame();assert.deepEqual(draws,[kits[0].id,ribbon.id],'selection draws the actual selected runtime');
  for(let i=0;i<10;i++)frame();assert.equal(draws.length,2);
  context.select(ribbon.id);frame();assert.equal(draws.length,2,'unchanged selection is not a redraw');
  context.observer.callback();assert.equal(resizes,1);assert.equal(draws.length,3,'resize draws immediately with RAF withheld');
  frame();assert.equal(draws.length,3,'resize redraws once');
  for(let i=0;i<10;i++)frame();assert.equal(draws.length,3);
  context.start(ribbon.id);assert.equal(starts,1);assert.equal(context.playing,true);
  for(let i=0;i<10;i++)frame();assert.equal(draws.length,13,'every active gameplay frame draws');assert.ok(ticks>=10);
  context.paused=true;for(let i=0;i<10;i++)frame();assert.equal(draws.length,13);
  context.paused=false;frame();assert.equal(draws.length,14,'resuming gameplay always draws');
  context.sim.winner='carbon';for(let i=0;i<10;i++)frame();assert.equal(draws.length,14,'finished match remains static');
  context.sim.winner=null;context.playing=false;
  camera.position.set(-1001,4.3,13);camera.lookAt(-1001,4,-2);
  for(const kit of kits.slice(4).reverse()) {
    const before=draws.length;context.select(kit.id);
    assert.equal(draws.at(-1),kit.id,'latest supplied model draws before any RAF callback');
    assert.equal(draws.length,before+1);assert.equal(queue.size,1);
  }
  const beforeStop=draws.length,lateFrame=queue.values().next().value;
  context.view.dispose=()=>cleanup.push('view');
  vm.runInContext(section('function stop() {',"try {\n  startupStage('hero-preload'"),context);
  context.stop();context.stop();context.observer.callback();lateFrame(now+16);
  assert.equal(queue.size,0,'cleanup cancels the only RAF; delayed callbacks never restart it');assert.equal(draws.length,beforeStop);
  assert.deepEqual(cleanup,['observer','ui','bots','actors','portrait','assets','view','listeners']);
  assert.equal(scene.children.length,0);groups++;
  console.log('lobby-idle: source callbacks draw initial/selection/resize with RAF withheld, all four supplied models, correct camera, zero idle GPU redraws, one RAF chain, full-rate playing, pause/finish/resume and idempotent context cleanup passed (mock renderer)');
}
disposeCharacterAssets();
assert.deepEqual(failures,[],'integrated production action regressions');
console.log(`integrated-actions: ${groups} source-callback groups passed; real systems/runtime/bots, mocked DOM/bitmap upload, no browser/native hardware verification`);
