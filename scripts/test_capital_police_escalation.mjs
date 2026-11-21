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

let stationLoss=2;
const reduced=createPolice(simulation,{getResponseLoss:()=>stationLoss});
const reducedState={wanted:5,health:100,mode:'vehicle',heat:100,police:[]};
for(let i=0;i<120;i++) reduced.step(1/60,reducedState,target);
assert.equal(reducedState.police.length,0,'station loss delays initial road response');
for(let i=0;i<60;i++) reduced.step(1/60,reducedState,target);
assert.equal(reducedState.police.length,4,'two lost stations remove two future ground response slots');
assert.equal(reducedState.police.filter(unit=>unit.checkpointRemaining>0).length,1);
const remaining=reducedState.police.slice();
stationLoss=3;
for(let i=0;i<360;i++) reduced.step(1/60,reducedState,target);
assert.deepEqual(reducedState.police,remaining,'losing another station keeps active officers in play');

let approaches=[{id:'practice',x:12,z:8,yaw:0}];
let patrolDrone=null,patrolNotices=0;
const quietPatrol=createPolice(simulation,{getPatrolStations:()=>approaches,getDrone:()=>patrolDrone,
  droneLineOfSight:()=>true,onAwareness:()=>{patrolNotices++;}});
const quietState={wanted:0,health:100,mode:'foot',heat:0,police:[]};
quietPatrol.step(1/60,quietState,target);
const footPatrol=quietState.police[0];
assert(footPatrol && footPatrol.mode==='foot' && !footPatrol.car.active);
const patrolX=footPatrol.x;
for(let i=0;i<60;i++) quietPatrol.step(1/60,quietState,target);
assert(footPatrol.x>patrolX && quietState.pursuit==='clear' && quietState.wanted===0);
assert.equal(quietPatrol.drainEvents().length,0,'patrol does not fire at a peaceful player');
patrolDrone={x:12,y:10,z:9,active:true};
for(let i=0;i<60;i++) quietPatrol.step(1/60,quietState,target);
assert.equal(patrolNotices,1,'an ambient officer uses the same bounded drone perception');
assert.equal(quietState.wanted,0,'ambient inspection does not reveal the player');
approaches=[];
for(let i=0;i<60;i++) quietPatrol.step(1/60,quietState,target);
assert.equal(quietState.police.length,0,'station loss removes the local patrol');
console.log('Capital station response PASS: delayed and reduced future dispatch, existing officers retained and bounded peaceful foot patrols retire when their station closes.');

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

// A drone sighting is bounded, detached attention. It cannot reveal the
// player, move a patrol car, or persist when the drone leaves view.
const quietSimulation={...simulation,player:{x:0,z:0,yaw:0,speed:0},hasLineOfSight:()=>false,
  canOccupy:()=>false,moveActor:()=>({blocked:true})};
let watched={active:true,x:6,y:34,z:0}, rayClear=true, traced=0;
const noticed=[];
const watcher=createPolice(quietSimulation,{heightAt:()=>4,getDrone:()=>watched,
  droneLineOfSight(eye,drone,{unit}) {
    traced++;assert.equal(eye.y,unit.mode==='vehicle'?5.35:5.62);
    assert.deepEqual([drone.x,drone.y,drone.z],[watched.x,watched.y,watched.z]);
    return rayClear;
  },onAwareness:event=>noticed.push(event)});
const idle={id:'idle',x:0,z:0,yaw:0,speed:0,health:100,mode:'foot',searchTime:0};
const driver={...idle,id:'driver',x:1,z:0,yaw:1,mode:'vehicle',checkpointRemaining:14};
const sheltered={...idle,id:'inside',interiorId:'room'};
const down={...idle,id:'down',health:0};
const awarenessState={wanted:1,health:100,mode:'foot',heat:100,police:[idle,driver,sheltered,down]};
const hiddenBody={x:100,z:100,yaw:0,speed:0};
watcher.step(0,awarenessState,hiddenBody);assert.equal(traced,0);
watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(idle.awareness.kind,'drone');assert.equal(driver.awareness.kind,'drone');
assert(idle.yaw<0,'idle foot officer turns toward the actual drone direction');
assert.equal(driver.yaw,1);assert.equal(driver.car.yaw,1,'drone awareness never steers a driver');
assert(!sheltered.awareness&&!down.awareness,'wrong interiors and downed officers do not observe outdoors');
assert(Object.isFrozen(idle.awareness));assert(!idle.seesPlayer);
assert(awarenessState.heat<100&&awarenessState.wanted===1&&awarenessState.pursuit==='search');
assert.equal(awarenessState.arrestProgress,0);
assert.deepEqual(noticed,[{kind:'drone-spotted',officerId:'idle',x:6,y:34,z:0}]);
for(let i=0;i<60;i++)watcher.step(1/60,awarenessState,hiddenBody);
assert(traced<=12,'maximum five 3D polls per second, with at most the available officers');
assert.equal(noticed.length,1,'warning only fires for the visible encounter starting');
rayClear=false;for(let i=0;i<16;i++)watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(idle.awareness,null,'physical obstruction clears the drone sighting');
rayClear=true;watched={...watched,y:90};const tracesBeforeHeight=traced;
for(let i=0;i<16;i++)watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(traced,tracesBeforeHeight,'an overhead drone too far vertically is never raycast');
watched={...watched,y:30,interiorId:'elsewhere'};
for(let i=0;i<16;i++)watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(traced,tracesBeforeHeight);
watched=null;
assert(watcher.noteExplosion({type:'explosion',x:-7,y:4,z:0,radius:8}));
watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(idle.awareness.kind,'blast');assert(!sheltered.awareness);
assert.equal(awarenessState.wanted,1);assert.equal(noticed.length,1,'blast attention never creates a drone or crime warning');
for(let i=0;i<128;i++)watcher.step(1/60,awarenessState,hiddenBody);
assert.equal(idle.awareness,null,'blast cue expires on supplied active time');

// Crouched cover uses the ordinary physical shot geometry, with a short
// bounded cache for repeated sight checks around the two normal movement passes.
let targetHeight=.85, cover=true;
const aimY=[];
const coverSimulation={...quietSimulation,hasLineOfSight:()=>true};
const lowCover=createPolice(coverSimulation,{heightAt:()=>4,playerTargetHeight:()=>targetHeight,
  shotClear(_from,to){aimY.push(to.y);return !cover;}});
const coverOfficer={...idle,id:'cover-test',x:5,yaw:0,fireCooldown:0,awareness:null};
const coverState={wanted:3,health:100,mode:'foot',heat:100,police:[coverOfficer]};
const crouched={x:0,z:0,speed:0,yaw:0};
for(let i=0;i<6;i++)lowCover.step(1/60,coverState,crouched);
assert.deepEqual(aimY,[4.85]);assert(!coverOfficer.seesPlayer&&!coverOfficer.aiming);
assert.equal(lowCover.drainEvents().length,0);
cover=false;
for(let i=0;i<14;i++)lowCover.step(1/60,coverState,crouched);
assert(coverOfficer.seesPlayer&&coverOfficer.aiming);
assert(lowCover.drainEvents().some(event=>event.to.y===4.85&&event.targetId==='player'));
targetHeight=1.2;coverOfficer.fireCooldown=0;
lowCover.step(1/60,coverState,crouched);
assert.equal(lowCover.drainEvents().at(-1).to.y,5.2,'standing preserves the ordinary shot height');
console.log('Capital police awareness PASS: capped 3D drone observation, idle foot attention, ordinary vehicle steering, occlusion/room/height guards, timed blast cue, and lower physical crouched cover/aim.');

const scene=new THREE.Scene(),view=createPoliceSupportView(scene);
support.report(target);state.wanted=5;support.step(1/60,state,target);
const craft=support.snapshot();for(let frame=0;frame<120;frame++)view.update(craft,1/60);
assert.equal(view.stats.drawCalls,2);assert.equal(view.stats.geometryCount,2);assert.equal(view.stats.materialCount,2);assert.equal(view.stats.lightsCreated,0);
assert.equal(scene.children.length,2);view.update(craft,0,{interior:true});assert.equal(view.stats.drawCalls,0);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(view.stats.geometryCount,0);
console.log('Capital police escalation PASS: pressure thresholds/severity/reset, six-unit ground cap, finite SWAT, clear distant expiring checkpoints, two unarmed throttled spotters, cover/interior separation, same-room crew shots, authoritative parked-car damage and two-draw disposal.');
