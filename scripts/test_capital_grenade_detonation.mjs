import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {blastLimits, createOrdnance, ORDNANCE_LIMITS} from '../Games/Capital Drive/ordnance.js';
import {createOrdnanceView} from '../Games/Capital Drive/ordnance-view.js';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';

// Controller-shaped handoff: actual fuse events feed Gameplay while rendering
// consumes a detached snapshot after drainEvents, never the damage queue.
const map = {bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[],buildings:[],spawn:{x:0,z:0,yaw:0},landmarks:[]};
const simulation = createSimulation(map,{trafficCount:0});
let debits=0, blasts=0, adultHealth=100;
const game=createGameplay(map,simulation,{hasBlastLineOfSight:()=>true,pedestrians:{strike(attack){blasts++;adultHealth-=attack.damage;return {hits:1};}}});
const system=createOrdnance({consumeThrow:()=>{debits++;return true;},heightAt:()=>0,
  moveProjectile:(body,dx,dz)=>{body.x+=dx;body.z+=dz;return {blocked:false};}});
assert(system.throw('grenade',{pose:{x:0,z:0,yaw:0},onFoot:true}).ok);
const scene=new THREE.Scene(),view=createOrdnanceView(scene,{quality:'low'});
const tick=()=>{system.step(1/60);for(const event of system.drainEvents())game.applyExplosion(event);};
for(let i=0;i<119;i++)tick();
assert.equal(blasts,0,'fuse remains live until two supplied seconds');
const landing=system.snapshot().projectiles[0];
game.state.mode='foot';Object.assign(game.state.actor,{x:landing.x+3,z:landing.z});
Object.assign(simulation.player,{x:landing.x+4,z:landing.z});
game.state.police.push({id:'near',x:landing.x+2,z:landing.z,health:100},
  {id:'other-space',x:landing.x,z:landing.z,health:100,interiorId:'another-room'});
tick();
assert.equal(debits,1);assert.equal(blasts,1);assert.equal(adultHealth,0);
assert(game.state.health<100,'actual Gameplay applies self risk');
assert(game.state.vehicleHealth<100,'actual Gameplay damages the nearby car');
assert(game.state.police[0].health<100,'actual Gameplay damages the nearby officer');
assert.equal(game.state.police[1].health,100,'overlapping other-room officer is protected');
assert.equal(system.snapshot().projectiles.length,0);
assert.equal(system.snapshot().bursts.length,1,'detonation must remain visible after controller drains damage event');
view.update(system.snapshot(),{x:0,z:-20});
assert.equal(view.stats.bursts,1,'detonated grenade renders a pooled explosion');
assert.equal(view.stats.drawCalls,2,'one flash batch and one spark batch');
const geometry=scene.children[0].children[0].geometry;
for(let i=0;i<100;i++)view.update(system.snapshot(),{x:0,z:-20});
assert.equal(scene.children[0].children[0].geometry,geometry,'repeated frames retain the shared geometry');
const paused=system.snapshot();system.step(0);assert.deepEqual(system.snapshot(),paused,'pause freezes burst lifetime');
view.update(system.snapshot(),{x:0,z:-20},{interiorId:'another-room'});assert.equal(view.stats.bursts,0);
for(let i=0;i<Math.ceil(ORDNANCE_LIMITS.burstLifetime*60)+1;i++)tick();
assert.equal(blasts,1,'visual lifetime cannot repeat damage');assert.equal(system.snapshot().bursts.length,0);
view.update(system.snapshot(),{x:0,z:-20});assert.equal(view.stats.drawCalls,0);
assert(system.throw('smoke',{pose:{x:0,z:0,yaw:0},onFoot:true,sandbox:true}).ok);
for(let i=0;i<120;i++)tick();assert.equal(blasts,1,'smoke cannot explode');assert.equal(system.snapshot().clouds.length,1);
system.reset();assert.equal(system.snapshot().bursts.length,0);
view.dispose();assert.equal(view.stats.geometryCount,0);assert.equal(view.stats.materialCount,0);assert.equal(scene.children.length,0);

const rocketMap={...map,buildings:[{points:[[-3,-7],[3,-7],[3,-6],[-3,-6]],height:3}]};
const rocketWalls=createShotObstacles(rocketMap), rocketSim=createSimulation(rocketMap,{trafficCount:0});
let directHits=0, rocketDetonations=0;
const rocketOwner=createOrdnance({traceRocket:ray=>rocketWalls.trace(ray)});
const launcher=createGameplay(rocketMap,rocketSim,{hasWeapon:id=>id==='rpg',heightAt:()=>0,
  launchRocket:ray=>rocketOwner.launchRocket(ray),onVehicleShot:()=>{directHits++;return true;},
  onVehicleExplosion:()=>{rocketDetonations++;}});
assert(launcher.interact());
Object.assign(launcher.state.actor,{x:0,z:0,yaw:0});
assert(launcher.addAmmo(3,'rpg'));assert(launcher.setWeapon('rpg'));
const trialRay={x:12,y:1.35,z:0,dx:0,dy:0,dz:-1,range:60,interiorId:null};
for(let i=0;i<ORDNANCE_LIMITS.projectiles;i++)assert(rocketOwner.launchRocket(trialRay));
assert.equal(rocketOwner.launchRocket(trialRay),false,'active rockets stay within the shared projectile budget');
launcher.step(.01,{fire:true,aim:true,aimYaw:0});
assert.deepEqual(launcher.getAmmo('rpg'),{ammo:1,reserveAmmo:2},'a rejected launch cannot debit ammunition');
rocketOwner.reset();launcher.step(.01,{fire:true,aim:true,aimYaw:0});
assert.deepEqual(launcher.getAmmo('rpg'),{ammo:0,reserveAmmo:2});
assert.equal(directHits,0,'launching cannot deal an additional hitscan hit');
rocketOwner.step(1/60);
assert.equal(rocketOwner.snapshot().projectiles[0].kind,'rocket');
assert.equal(rocketOwner.drainEvents().length,0,'the rocket must first travel');
const rocketEvents=[];
for(let i=0;i<14;i++){
  rocketOwner.step(1/60);
  for(const event of rocketOwner.drainEvents()){rocketEvents.push(event);launcher.applyExplosion(event);}
}
assert.equal(rocketEvents.length,1);assert.equal(rocketDetonations,1);
const [rocketBlast]=rocketEvents;
assert.equal(rocketBlast.kind,'rocket');assert.equal(rocketBlast.radius,10);assert.equal(rocketBlast.maxDamage,130);
assert(rocketBlast.z>-6&&rocketBlast.z<-5.9,'an intervening building stops the blast on its launch side');
assert.equal(rocketOwner.snapshot().projectiles.length,0);
assert.equal(rocketOwner.snapshot().bursts[0].radius,10,'the same explosion drives pooled presentation');
console.log('Capital grenade and rocket detonation PASS: fuse/controller damage once, visible pooled burst after event drain, room isolation, pause, expiry, smoke and disposal');

const kind='skylark-airstrike',airstrike={type:'explosion',kind,id:'skylark-test',x:0,y:.2,z:0,interiorId:null,...blastLimits(kind)};
assert.deepEqual(blastLimits(kind),{radius:7,maxDamage:45});
for(const invalid of [{interiorId:'room'},{radius:8},{maxDamage:46}])assert(!game.applyExplosion({...airstrike,...invalid}));
game.state.health=100;
Object.assign(game.state.actor,{x:7.1,z:0});
assert(game.applyExplosion(airstrike));assert.equal(game.state.health,100,'escaping the marked radius protects the player');
Object.assign(game.state.actor,{x:0,z:0});
assert(game.applyExplosion(airstrike));assert.equal(game.state.health,55,'remaining in the mark applies the configured damage');
assert(system.showExplosion(airstrike));assert.equal(system.snapshot().bursts[0].kind,kind);
assert.deepEqual(system.drainEvents(),[],'the strike visuals cannot apply damage again');
console.log('PASS Skylark airstrike world handoff: outdoor validation, radius/HP, escape and pooled blast');
