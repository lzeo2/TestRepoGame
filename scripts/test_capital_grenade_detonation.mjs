import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createOrdnance, ORDNANCE_LIMITS} from '../Games/Capital Drive/ordnance.js';
import {createOrdnanceView} from '../Games/Capital Drive/ordnance-view.js';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';

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
console.log('Capital grenade detonation PASS: fuse/controller damage once, visible pooled burst after event drain, room isolation, pause, expiry, smoke and disposal');
