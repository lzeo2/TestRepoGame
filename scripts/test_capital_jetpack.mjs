import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createJetpackView} from '../Games/Capital Drive/jetpack-view.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import { createJetpack } from '../Games/Capital Drive/jetpack.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  roads: [], buildings: [{ id: 'wall', points: [[5,-20],[7,-20],[7,20],[5,20]], height: 8 }],
  spawn: { x: -20, z: -20, yaw: 0 }, landmarks: [] };
const simulation = createSimulation(map, { trafficCount: 0 });
const game = createGameplay(map, simulation);
Object.assign(game.state, { mode: 'foot' });
Object.assign(game.state.actor, { x: 0, z: 0, jumpHeight: 0 });
const owned = { owned: true };
const pack = createJetpack({ moveActor: (...args) => simulation.moveActor(...args), heightAt: () => 0 });
for (const context of [{ mission: true }, { job: true }, { activity: true }, { interiorId: 'room' },
  { drone: true }, { aircraft: true }, { micromobility: true }, { paused: true }, { launchAllowed: false }]) {
  assert.equal(pack.toggle(game.state, { ...owned, ...context }), false, JSON.stringify(context));
}
// Passenger is a controller-derived property; use a separate body for denial.
assert.equal(pack.toggle({ ...game.state, passenger: true }), false);
assert.equal(pack.toggle(game.state), false, 'ownership is required');
assert.equal(pack.toggle(game.state, owned), true);
const tick = (n, input = {}, ctx = {}) => {
  for (let i = 0; i < n; i++) {
    game.step(1/60, { externalFlight: pack.active, moveX: pack.active ? input.moveX : 0, jump: pack.active });
    pack.step(1/60, input, game.state, { ...owned, ...ctx });
  }
};
tick(90, { lift: 1, moveX: 1 });
assert(game.state.actor.jumpHeight > 5, 'personal flight rises above ordinary jump');
assert(game.state.actor.x <= 4.56, 'existing swept body movement retains building clearance while flying');
const hover = game.state.actor.jumpHeight;
tick(100);
assert(Math.abs(game.state.actor.jumpHeight-hover) < .6, 'external flight owns altitude without ordinary jump gravity');
const frozen = JSON.stringify({ body: game.state.actor, pack: pack.snapshot() });
pack.step(10, { lift: 1 }, game.state, { paused: true });
assert.equal(JSON.stringify({ body: game.state.actor, pack: pack.snapshot() }), frozen, 'paused supplied time is inert');
pack.step(NaN, {}, game.state, owned);
assert.equal(pack.active, true);
assert.equal(pack.toggle(game.state, owned), true);
assert.equal(pack.landing, true);
for (let i = 0; i < 300 && pack.active; i++) tick(1);
assert.equal(pack.active, false, 'manual toggle lands before relinquishing altitude');
assert.equal(game.state.actor.jumpHeight, 0);
assert(pack.charge < 100, 'landing does not refill charge');
tick(1200);
assert.equal(pack.charge, 100, 'grounded rest recharges');
assert(pack.toggle(game.state, owned)); tick(70, { lift: 1 });
const beforeX = game.state.actor.x;
tick(5, { moveX: -1, lift: 1 }, { mission: true });
assert(pack.landing, 'new restricted activity requests landing');
assert.equal(game.state.actor.x, beforeX, 'restricted descent cannot travel');
tick(250);
assert(!pack.active);
assert(pack.toggle(game.state, owned)); tick(60, { lift: 1 });
pack.reset(game.state);
assert.equal(game.state.actor.jumpHeight, 0);
assert(!pack.active);
assert.equal(pack.charge, 100);
assert(pack.toggle(game.state, owned)); tick(5000, { lift: 1 });
assert(!pack.active, 'empty charge triggers bounded safe landing');
assert.equal(game.state.actor.jumpHeight, 0);
const body = { mode: 'foot', health: 100, actor: { x: 0, z: 0, jumpHeight: 0 } };
let occupied = false;
const clearance = createJetpack({ heightAt: () => 0,
  moveActor: (actor, dx, dz) => { actor.x += dx; actor.z += dz; return { blocked: occupied }; },
  canOccupy: next => next.y <= 1.5 });
assert(clearance.toggle(body, owned));
for (let i = 0; i < 120; i++) clearance.step(1/60, { lift: 1 }, body, owned);
assert(body.actor.jumpHeight <= 1.5, 'optional vertical clearance prevents ceiling penetration');
occupied = true;
clearance.toggle(body, owned);
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body, owned);
assert(clearance.active && body.actor.jumpHeight > 0, 'occupied landing waits above the checked footprint');
occupied = false;
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body, owned);
assert(!clearance.active && body.actor.jumpHeight === 0, 'landing finishes once shared clearance permits it');
// Long-flight tuning must retain inertia, fuel cost and ownership authority.
const traveller = { mode: 'foot', health: 100, actor: { x: 0, z: 0, jumpHeight: 0 } };
const rangePack = createJetpack({ heightAt: () => 0,
  moveActor: (actor, dx, dz) => { actor.x += dx; actor.z += dz; return { blocked: false }; } });
assert(rangePack.toggle(traveller, owned));
rangePack.step(1/60, { moveX: 1, lift: 1 }, traveller, owned);
assert(rangePack.snapshot().horizontalSpeed > 0 && rangePack.snapshot().horizontalSpeed < 1, 'horizontal thrust accelerates rather than instantly reaching cruise');
for (let i = 0; i < 120; i++) rangePack.step(1/60, { moveX: 1, lift: 1 }, traveller, owned);
const cruise = rangePack.snapshot().horizontalSpeed;
assert(cruise > 10 && cruise <= 11);
const beforeBrake = traveller.actor.x;
rangePack.step(1/60, {}, traveller, owned);
assert(traveller.actor.x > beforeBrake && rangePack.snapshot().horizontalSpeed < cruise, 'released controls brake residual horizontal momentum');
for (let i = 0; i < 60*45; i++) rangePack.step(1/60, { moveX: 1 }, traveller, owned);
assert(rangePack.active && rangePack.charge > 35 && traveller.actor.x > 480, 'sustained forty-five-second cruise has useful range and remaining fuel');
assert.equal(rangePack.chargeFraction, rangePack.charge / rangePack.capacity);
assert.equal(rangePack.leanX, rangePack.snapshot().leanX, 'view getters share the actual flight owner');
const revokedX = traveller.actor.x;
rangePack.step(1/60, { moveX: 1 }, traveller, { owned: false });
assert(rangePack.landing && rangePack.snapshot().reason === 'restricted');
assert.equal(traveller.actor.x, revokedX, 'revoked ownership cannot keep travelling');
rangePack.reset(traveller);
assert.equal(rangePack.leanX, 0); assert.equal(rangePack.verticalSpeed, 0);
console.log('PASS Capital Drive jetpack: launch guards, supplied time, shared collision, gravity ownership, safe descent, depletion and reset');

// Absolute-height adapter: ground-level walls still stop a body, roof clearance
// permits overflight, and an overhead bridge must never become the terrain floor.
function flightFixture({ceiling=false}={}){
  const body={mode:'foot',health:100,actor:{x:0,z:0,yaw:1.3,jumpHeight:0}};
  let groundMoves=0,sweeps=0;
  const clear=next=>ceiling?next.y+1.8<=5||next.y>=6:!(next.x+.45>5&&next.x-.45<15&&next.y<8);
  const pack=createJetpack({heightAt:()=>0,
    moveActor(){groundMoves++;return {blocked:true};},
    moveFlight(actor,dx,dz,options){
      sweeps++;assert(Number.isFinite(options.y));assert.equal(options.radius,.45);assert.equal(options.height,1.8);
      const next={x:actor.x+dx,z:actor.z+dz,y:options.y};
      if(!clear(next))return {blocked:true};actor.x=next.x;actor.z=next.z;return {blocked:false};
    },canOccupy:clear,
    supportHeightAt(x,z,{y}){return ceiling?(y>=6?6:0):x>=5&&x<=15&&y>=8?8:0;}});
  assert(pack.toggle(body,owned));
  const step=(n,input={})=>{for(let i=0;i<n;i++)pack.step(1/60,input,body,owned);};
  return {body,pack,step,counts:()=>({groundMoves,sweeps})};
}
const over=flightFixture();over.step(90,{moveX:1});assert(over.body.actor.x<=4.56,'low body cannot pass through a wall');
over.step(150,{lift:1});assert(over.pack.feetY>8);
over.step(150,{moveX:1});assert(over.body.actor.x>16,'safe altitude flies above the actual solid top');
assert.equal(over.counts().groundMoves,0,'configured flight does not fall back to 2D ground blocking');
assert.equal(over.pack.feetY,over.body.actor.jumpHeight);assert.equal(over.pack.snapshot().feetY,over.pack.feetY);
const roof=flightFixture();roof.step(120,{lift:1});
while(roof.body.actor.x<7)roof.step(1,{moveX:1});roof.step(80);assert(roof.body.actor.x<15);
roof.pack.toggle(roof.body,owned);roof.step(200);
assert(roof.pack.active&&roof.pack.snapshot().reason==='surface-supported');
assert.equal(roof.pack.feetY,8,'roof landing retains absolute support without falling through to terrain');
assert.equal(roof.body.actor.jumpHeight,8);
roof.pack.toggle(roof.body,owned);assert(!roof.pack.landing,'manual landing can be cancelled');
roof.body.aiming=true;const aimYaw=roof.body.actor.yaw;roof.step(120,{moveX:1,lift:1});assert.equal(roof.body.actor.yaw,aimYaw,'flight steering preserves active aiming yaw');
assert(roof.body.actor.x>16);roof.pack.toggle(roof.body,owned);roof.step(500);assert(!roof.pack.active,'leaving a rooftop allows normal ground landing');
const under=flightFixture({ceiling:true});under.step(150,{lift:1});
assert(under.pack.feetY>2&&under.pack.feetY<=3.2,'bridge underside blocks headroom without snapping feet onto deck');
under.step(120,{lift:1,moveX:1});assert(under.body.actor.x>10,'blocked ascent still permits separately cleared horizontal travel');
assert(under.pack.feetY<=3.2);
const deck={mode:'foot',health:100,actor:{x:0,z:0,jumpHeight:0}};
const deckPack=createJetpack({heightAt:()=>0,moveActor:()=>({blocked:false}),canOccupy:()=>true});
assert(deckPack.toggle(deck,{...owned,feetY:12}));assert.equal(deckPack.feetY,12);assert.equal(deck.actor.jumpHeight,12,'launch retains controller-supplied standing support');
console.log('PASS jetpack altitude adapters: solid overflight/low blocking, roof support/cancel/ground descent, bridge underside slide, preserved aim yaw and explicit deck launch feet');

const prepared=createShotObstacles(map,{heightAt:()=>0,groundHeightAt:()=>0});
const actualBody={mode:'foot',health:100,actor:{x:0,z:0,jumpHeight:0}};
const actualPack=createJetpack({heightAt:()=>0,moveActor:()=>({blocked:true}),moveFlight:prepared.moveBody,
  canOccupy:prepared.canOccupyBody,supportHeightAt:prepared.supportHeightAt});
assert(actualPack.toggle(actualBody,owned));
for(let i=0;i<150;i++)actualPack.step(1/60,{lift:1},actualBody,owned);
for(let i=0;i<100;i++)actualPack.step(1/60,{moveX:1},actualBody,owned);
assert(actualBody.actor.x>8&&actualPack.feetY>8,'real prepared solids adapter permits cleared wall overflight');
const packScene=new THREE.Scene(),packView=createJetpackView(packScene,()=>10);
packView.update({x:0,z:0,jumpHeight:2.8},{active:true,feetY:2.8,thrust:true,charge:100});
assert.equal(packScene.children[0].position.y,2.8,'pack presentation uses authoritative absolute feet below an overhead deck');
packView.dispose();packView.dispose();assert.equal(packScene.children.length,0);
console.log('PASS jetpack prepared-solids integration and absolute-foot pack presentation/disposal');
