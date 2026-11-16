import assert from 'node:assert/strict';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createBuses } from '../Games/Capital Drive/buses.js';
import { createRideService } from '../Games/Capital Drive/ride-service.js';
import { createShotObstacles } from '../Games/Capital Drive/shot-obstacles.js';
const road=(id,points,nodes)=>({id,points,nodes,oneway:1,width:11,type:'residential'});
const map={bounds:{minX:-1500,maxX:2000,minZ:-1500,maxZ:2000},spawn:{x:-100,z:-100,yaw:0},buildings:[],landmarks:[],roads:[
 road('a',[[0,0],[400,0]],[1,2]),road('b',[[400,0],[400,400]],[2,3]),road('c',[[400,400],[0,400]],[3,4]),road('d',[[0,400],[0,0]],[4,1])]};
const sim=createSimulation(map,{trafficCount:1}),buses=createBuses(map,sim),ride=createRideService(map,sim);
assert(buses.vehicles.length>0);
const bus=buses.vehicles[0],car=ride.vehicles[0];
for (const [i, vehicle] of buses.vehicles.entries()) Object.assign(vehicle,{x:200+i*20,z:200});
Object.assign(car,{x:0,z:-8,yaw:0,active:true});
const obstacles=createShotObstacles(map);let callbacks=0,bodyHits=0,blastCalls=0;
const game=createGameplay(map,sim,{sandbox:true,heightAt:()=>0,
 getShotTargets:()=>[{id:'covered-adult',x:0,z:-15,feetY:0,health:100,damage:()=>{bodyHits++;return true;}}],
 traceShot:ray=>obstacles.traceHit(ray,null,[...ride.vehicles,...buses.vehicles]),
 onVehicleShot:({vehicleId,damage})=>{callbacks++;return ride.damageVehicle(vehicleId,damage)||buses.damageVehicle(vehicleId,damage)||game.damagePoliceVehicle(vehicleId,damage);},
 onVehicleExplosion:event=>{blastCalls++;assert.equal(event.type,'explosion');}});
game.reset({sandbox:true,onFoot:true,startPose:{x:0,z:0,yaw:0}});Object.assign(game.state.actor,{x:0,z:0,yaw:0});
game.setWeapon('shotgun');game.step(.01,{fire:true});
assert.equal(callbacks,1,'all pellets share one actual owner hit');assert(car.health<100);assert.equal(bodyHits,0);
const snapshot=ride.snapshot();assert.equal(snapshot.car.health,car.health);
assert(ride.damageVehicle(car.id,1000));const pose={x:car.x,z:car.z};
ride.step(.1,{pose:{x:0,z:0},onFoot:true,sandbox:true});assert(car.active);assert.equal(car.speed,0);assert.deepEqual({x:car.x,z:car.z},pose);
assert.equal(ride.book('anything',{pose:{x:0,z:0}}).ok,false,'nearby wreck cannot be replaced by booking');
assert(buses.damageVehicle(bus.id,1000));const busPose={x:bus.x,z:bus.z};buses.step(.1);
assert.equal(bus.health,0);assert(bus.active);assert.equal(bus.speed,0);assert.deepEqual({x:bus.x,z:bus.z},busPose);
assert(!ride.damageVehicle(bus.id,10));assert(!buses.damageVehicle(car.id,10));
const policeCar={id:'police:test',x:20,z:0,yaw:0,speed:10,active:true,length:4.8,width:1.9};
const officer={id:'officer:test',x:20,z:0,yaw:0,speed:10,health:100,mode:'vehicle',car:policeCar};game.state.police.push(officer);
assert(game.damagePoliceVehicle(policeCar.id,100));assert.equal(policeCar.health,0);assert.equal(officer.health,100,'car damage does not hit officer');assert.equal(policeCar.speed,0);assert(game.policeWrecks.includes(policeCar));
game.step(.01,{});assert(game.policeWrecks.includes(policeCar),'clearing wanted state retains physical wreck identity');
game.state.sandbox=false;game.state.wanted=1;Object.assign(officer,{searchTime:0,fireCooldown:0});game.state.police.push(officer);
sim.setExternalVehicles([policeCar]);game.step(.01,{});
assert.equal(officer.mode,'foot','disabled patrol officer uses a clear physical door');
assert.equal(policeCar.health,0);assert.equal(policeCar.speed,0);
game.applyExplosion({type:'explosion',x:0,z:0,radius:5,maxDamage:50});assert.equal(blastCalls,1,'one explosion invokes external authority once');
const traffic=sim.traffic[0];Object.assign(traffic,{health:0,active:true,x:1900,z:1900,speed:0});
sim.step(.05,{},sim.player);assert.equal(traffic.health,100,'only successful far-offscreen slot relocation starts a fresh car');
const ray={x:0,y:1.35,z:0,dx:0,dy:0,dz:-1,range:30,interiorId:null};
const wall=createShotObstacles({...map,buildings:[{points:[[-3,-3],[3,-3],[3,-4],[-3,-4]],height:4}]});
assert.equal(wall.traceHit(ray,null,ride.vehicles).vehicleId,null);assert.equal(obstacles.traceHit({...ray,interiorId:'room'},null,ride.vehicles).vehicleId,null);
console.log('PASS external vehicle authority: nearest shotgun owner HP once, retained bus/ride/police wrecks, blocked room/wall rays, fresh offscreen traffic and one explosion bridge');
