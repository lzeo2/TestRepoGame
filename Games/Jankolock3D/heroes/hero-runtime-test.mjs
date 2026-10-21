import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {createSystems} from '../systems.mjs';
const {heroes}=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url)));
function fixture(kit) {
  const scene=new THREE.Scene(),boxes=[],events=[];
  const controller=new PlayerController({position:{x:0,y:0,z:8},boxes});
  // Runtime may read targets, never write health or other systems-owned fields.
  const targets=[{id:'enemy',team:'ivory',position:new THREE.Vector3(0,0,0),alive:true},{id:'friend',team:'carbon',position:new THREE.Vector3(1,0,3),alive:true}].map(t=>Object.freeze({...t,hp:300,maxHp:400}));
  const runtime=new HeroRuntime({scene,controller,kit,boxes,targets,onEffect:event=>events.push(event)});
  return {runtime,controller,targets,boxes,scene,events};
}
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
  assert.throws(()=>r.setModifiers({unknown:1}),RangeError);
  assert.throws(()=>r.setModifiers({magazine:2.5}),RangeError);
  r.setModifiers({magazine:24,move:1.25});assert.equal(r.modifiers.magazine,24);
  r.dispose();assert.equal(f.scene.children.length,0);
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
let remoteChecks=0;
for(const kit of heroes) for(const ability of kit.abilities.filter(a=>['turret','puddle','grenade','missionbomb'].includes(a.id))) {
  const {runtime:r,controller:c,targets,events}=fixture(kit);
  assert.ok(r.cast(ability.slot));
  c.warp({x:100,y:0,z:100}); // The caster is not the remote effect's range origin.
  let expected;
  if(r.projectiles.length) {
    const projectile=r.projectiles[0];
    projectile.position.set(0,1,0);projectile.velocity.set(0,0,0);projectile.left=0;
    r.update(.01);expected={x:0,y:.9984,z:0};
  } else {
    const deploy=r.deployments[0];
    deploy.position.set(0,0,0);expected={x:0,y:ability.id==='turret'?.9:0,z:0};
    targets[1].position.set(1,0,0);r.update(.01);
    deploy.position.set(50,0,50); // Emitted origins must be snapshots, not live vectors.
  }
  const remote=events.filter(e=>e.ability===ability.id&&['damage','heal'].includes(e.kind));
  assert.ok(remote.some(e=>e.kind==='damage'),`${ability.id} remote damage emitted`);
  if(ability.id==='puddle')assert.ok(remote.some(e=>e.kind==='heal'),'puddle remote healing emitted');
  const sim=createSystems();sim.step(30);
  const source=sim.addHero({id:'player',team:'carbon',lane:'midway'});
  const enemy=sim.addHero({id:'enemy',team:'ivory',lane:'midway'});
  const friend=sim.addHero({id:'friend',team:'carbon',lane:'midway'});
  assert.ok(sim.configureHeroKit(source.id,kit).ok);
  assert.ok(sim.moveHero(source.id,c.position).ok);
  assert.ok(sim.moveHero(enemy.id,targets[0].position).ok);
  assert.ok(sim.moveHero(friend.id,targets[1].position).ok);
  assert.ok(sim.damage(friend.id,100,enemy.id,{kind:'ability'}).ok);
  for(const event of remote) {
    for(const key of ['x','y','z'])assert.ok(Math.abs(event.origin?.[key]-expected[key])<1e-6,`${ability.id} ${key} origin`);
    assert.equal(Object.getPrototypeOf(event.origin),Object.prototype,'origin is a plain snapshot');
    const result=sim.applyHeroEffect(event);
    assert.ok(result.ok&&result.amount>0,`${ability.id} accepted by systems from remote origin: ${result.reason}`);
    remoteChecks++;
  }
  assert.ok(targets.every(t=>t.hp===300),'runtime leaves health authority to systems');
  r.dispose();
}
console.log(`hero-runtime-test: ${remoteChecks} remote-origin events accepted by systems; ${casts} kit casts, cooldown/expiry/cleanup, cover, headshots, tether break, slide ammo, turret, grenade bounce and healing checked (not native acceptance)`);
