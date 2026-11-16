import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createPolice } from '../Games/Capital Drive/police.js';
import { createPoliceSupport } from '../Games/Capital Drive/police-support.js';
import { createPoliceSupportView } from '../Games/Capital Drive/police-support-view.js';
const map={bounds:{minX:-600,maxX:600,minZ:-600,maxZ:600},spawn:{x:0,z:-2,yaw:-Math.PI/2},buildings:[],roads:[
  {id:'public',name:'Public test road',type:'residential',width:24,oneway:0,
    points:Array.from({length:21},(_,i)=>[-500+i*50,0])}
]};
const simulation=createSimulation(map,{trafficCount:0});
const game=createGameplay(map,simulation);
for(let count=1;count<=25;count++){
  assert(game.reportOffence('minor',1,{witnessed:true}));
  assert.equal(game.state.wanted,[1,4,9,16,25].filter(value=>count>=value).length,`pressure at ${count}`);
}
assert.equal(game.state.offencePressure,25);game.reportOffence('minor',1,{witnessed:true});assert.equal(game.state.offencePressure,25);
game.reset();game.reportOffence('mission',3,{witnessed:true});assert.equal(game.state.wanted,3);assert.equal(game.state.offencePressure,9);
game.reportOffence('unseen',5,{witnessed:false});assert.equal(game.state.wanted,3);
game.state.wanted=0;game.reportOffence('minor',1,{witnessed:true});assert.equal(game.state.wanted,1,'cleared wanted cannot retain old pressure');
game.reset({sandbox:true});assert(!game.reportOffence('minor',1,{witnessed:true}));assert.equal(game.state.offencePressure,0);
assert(game.damageVehicle(13),'sandbox parked car remains vulnerable');assert.equal(game.state.vehicleHealth,87);
for(const amount of [0,-1,NaN,Infinity])assert(!game.damageVehicle(amount));assert.equal(game.state.vehicleHealth,87);
game.reset({sandbox:false,onFoot:true});assert(game.damageVehicle(8));assert.equal(game.state.vehicleHealth,92,'on-foot parked car health belongs to Gameplay');
assert(!game.reportSighting({x:0,z:0}),'ordinary walking never creates wanted stars');
game.reportOffence('minor',1,{witnessed:true});assert(game.reportSighting({x:1,z:2}));assert.equal(game.state.wanted,1);
assert(!game.reportSighting({x:1,z:2,interiorId:'other'}));assert(!game.reportSighting({x:NaN,z:2}));
const item={kind:'ammo',weaponId:'pistol',amount:20};
assert(game.giveInventory(item));assert.equal(game.inventorySnapshot().pistol.reserveAmmo,20);
assert(Object.isFrozen(game.inventorySnapshot().pistol));
assert(game.takeInventory({...item,amount:13}));assert.equal(game.inventorySnapshot().pistol.reserveAmmo,7);
const inventory=game.inventorySnapshot();
for(const amount of [8,0,-1,1.5,NaN])assert(!game.takeInventory({...item,amount}));
assert(!game.giveInventory({...item,amount:246}));assert.deepEqual(game.inventorySnapshot(),inventory,'denied transfers are atomic');
assert(game.giveInventory({...item,amount:245}));assert.equal(game.inventorySnapshot().pistol.ammo,12);assert.equal(game.inventorySnapshot().pistol.reserveAmmo,240);
assert(game.takeInventory({...item,amount:245}));assert.equal(game.inventorySnapshot().pistol.reserveAmmo,0);assert.equal(game.inventorySnapshot().pistol.ammo,7,'reserve is removed before clip');
assert(game.giveInventory({kind:'weapon',weaponId:'pistol'}));assert(game.takeInventory({kind:'weapon',weaponId:'pistol'}));
assert.equal(game.inventorySnapshot().pistol.ammo,7,'storing weapon conserves ammunition');
assert(!game.giveInventory({kind:'weapon',weaponId:'invalid'}));
game.reportOffence('minor',1,{witnessed:true});game.state.health=0;game.step(1/60);assert.equal(game.state.offencePressure,0,'recovery clears pressure');

let sightCalls=0,clearSight=true;
const support=createPoliceSupport({...simulation,hasLineOfSight(){sightCalls++;return clearSight;}},{heightAt:()=>3});
const state={wanted:5,sandbox:false,health:100},target={x:0,z:0,yaw:-Math.PI/2};support.report(target);
assert(!support.step(0,state,target));assert.equal(support.snapshot().length,0);
for(let i=0;i<60;i++)support.step(1/60,state,target);
assert.equal(support.snapshot().length,2);assert(sightCalls<=6,'each of two craft checks sight at most three times per second');
assert(support.snapshot().every(craft=>craft.armed===false&&craft.y>3));
assert(Object.isFrozen(support.snapshot())&&Object.isFrozen(support.snapshot()[0]));
const paused=support.snapshot();support.step(0,state,target);assert.deepEqual(support.snapshot(),paused);
clearSight=false;for(let i=0;i<30;i++)support.step(1/60,state,target);assert(support.snapshot().every(craft=>!craft.seesPlayer),'cover ends spotting');
clearSight=true;support.step(1/60,state,target,{id:'room'});assert(support.snapshot().every(craft=>!craft.seesPlayer),'interiors cannot be spotted');
state.wanted=3;support.step(1/60,state,target);assert.equal(support.snapshot().length,1);assert.equal(support.snapshot()[0].kind,'drone');
state.wanted=0;support.step(1/60,state,target);assert.equal(support.snapshot().length,0);

const patrolState={wanted:5,sandbox:false,police:[],mode:'vehicle',health:100,heat:100};
const police=createPolice(simulation);police.report(target);police.step(1/60,patrolState,target);
assert(patrolState.police.length>0&&patrolState.police.length<=6);
const checkpoints=patrolState.police.filter(unit=>unit.checkpointRemaining>0);
assert(checkpoints.length>0&&checkpoints.length<=2);
for(const unit of checkpoints){
  assert(unit.car.x-target.x>=150,'checkpoint is ahead, outside the player bubble');
  assert(Math.hypot(unit.car.x-target.x,unit.car.z-target.z)>=150);
  assert(simulation.canOccupy(unit.car,{length:4.8,width:1.9}),'checkpoint uses clear body pose');
}
assert(patrolState.police.every(unit=>unit.role==='swat'&&unit.armour&&unit.health===150));
for(let i=0;i<1210;i++)police.step(1/60,patrolState,target);
assert(patrolState.police.length<=6);assert(checkpoints.every(unit=>unit.checkpointRemaining===0),'checkpoints expire into ordinary pursuit');
const blocked={...simulation,canOccupy:()=>false};
const blockedState={wanted:5,police:[],health:100,heat:100};createPolice(blocked).step(1/60,blockedState,target);assert.equal(blockedState.police.length,0,'blocked road cannot receive a checkpoint or patrol');
patrolState.wanted=0;police.step(1/60,patrolState,target);assert.equal(patrolState.police.length,0);assert.equal(police.support().length,0);

let roomClear=true;
const room={id:'interior',known:true,floorY:2,outside:{x:0,z:0},inside:{x:0,z:0},exit:{x:0,z:0},
  hasLineOfSight:()=>roomClear,nextWaypoint:()=>null};
const indoor=createGameplay(map,createSimulation(map,{trafficCount:0}),{getInterior:()=>room,resolveInterior:id=>id===room.id?room:null});
indoor.state.police.push({id:'officer',x:5,z:0,health:100,mode:'foot',interiorId:room.id});
const strike={from:{x:0,z:0,interiorId:room.id},targetId:'officer',damage:8,range:10,interiorId:room.id};
assert(indoor.strikePolice(strike));assert.equal(indoor.state.police[0].health,92);assert.equal(indoor.state.shots.at(-1).interiorId,room.id);
assert(!indoor.strikePolice({...strike,interiorId:null}));assert(!indoor.strikePolice({...strike,from:{x:0,z:0}}));
roomClear=false;assert(!indoor.strikePolice(strike));roomClear=true;room.safehouse=true;assert(!indoor.strikePolice(strike));room.safehouse=false;
assert(!indoor.damageVehicle(5),'indoor shots cannot damage the exterior player car through this API');
const officer={id:'indoor-officer',x:0,z:0,health:100,mode:'foot',interiorId:room.id,fireCooldown:0};
const ally={id:'ally',x:5,z:0,health:100,active:true,armed:true,interiorId:room.id};
const indoorPolice=createPolice(simulation,{getInterior:()=>room,getAllies:()=>[ally],resolveInterior:()=>room});
const indoorState={wanted:3,health:100,mode:'foot',police:[officer],heat:100};
indoorPolice.step(1/60,indoorState,{x:100,z:0});
const event=indoorPolice.drainEvents().find(event=>event.targetId==='ally');assert(event,'police target armed same-room ally');
assert.equal(event.from.interiorId,room.id);assert.equal(event.to.interiorId,room.id);assert.equal(event.interiorId,room.id);
ally.interiorId='other';officer.fireCooldown=0;indoorPolice.step(1/60,indoorState,{x:100,z:0});assert.equal(indoorPolice.drainEvents().length,0,'other-room ally is protected');

const scene=new THREE.Scene(),view=createPoliceSupportView(scene);
support.report(target);state.wanted=5;support.step(1/60,state,target);
const craft=support.snapshot();for(let frame=0;frame<120;frame++)view.update(craft,1/60);
assert.equal(view.stats.drawCalls,2);assert.equal(view.stats.geometryCount,2);assert.equal(view.stats.materialCount,2);assert.equal(view.stats.lightsCreated,0);
assert.equal(scene.children.length,2);view.update(craft,0,{interior:true});assert.equal(view.stats.drawCalls,0);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(view.stats.geometryCount,0);
console.log('Capital police escalation PASS: pressure thresholds/severity/reset, six-unit ground cap, finite SWAT, clear distant expiring checkpoints, two unarmed throttled spotters, cover/interior separation, same-room crew shots, authoritative parked-car damage and two-draw disposal.');
