import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createActorView } from '../Games/Capital Drive/actor-view.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const box=(minX,minZ,maxX,maxZ)=>[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]];
const lakeId='osm-relation-3400115-0';
const lake={id:lakeId,type:'water',points:box(0,-26,24,26),innerRings:[{points:box(9,-4,14,4)}]};
const pool={id:'manuka-pool-water',type:'water',points:box(-35,-8,-28,8)};
const map={bounds:{minX:-70,maxX:70,minZ:-65,maxZ:65},spawn:{x:-40,z:-30,yaw:0},roads:[],buildings:[],
  barriers:[{id:'test-fence',points:box(-.55,13,-.35,20)}],areas:[lake,pool],lakeWaterLevel:5.93};
const isOnBridge=(x,z)=>Math.abs(z+13)<1 && x>-2 && x<26;
const groundHeightAt=(_x,z)=>z>=26?12:6.15;
const simulation=createSimulation(map,{trafficCount:0,isOnBridge,groundHeightAt,vehicleHeightAt:car=>isOnBridge(car.x,car.z)?11:6.15});
const dry=(x,z)=>({x,z,yaw:0});
assert.equal(simulation.waterAt(-1,0),null);
assert.equal(simulation.waterAt(-32,0),null,'other water areas remain ordinary collision surfaces');
assert.equal(simulation.waterAt(12,0),null,'mapped island holes are land');
assert.deepEqual(simulation.waterAt(2,0),{id:lakeId,y:5.93});
assert.equal(simulation.waterAt(2,0),simulation.waterAt(6,-10),'queries share the immutable lake surface descriptor');
assert.equal(simulation.waterAt(4,-13),null,'a dry actor on the top of a bridge remains on land');
assert.equal(simulation.waterAt(4,-13,{underBridge:true}).y,5.93);

const walker=dry(-2,0);
assert(simulation.moveActor(walker,4,0).blocked && walker.x<0,'ordinary foot and NPC collision still includes the lake');
assert(!simulation.canOccupy({id:'car',x:3,z:9,yaw:0}, {length:4.8,width:1.9}),'road cars stay blocked by water');
const poolWalker=dry(-36,0);
assert(simulation.moveSwimmingActor(poolWalker,2,0).blocked && poolWalker.x<-35);
const fenced=dry(-1.3,16);
assert(simulation.moveSwimmingActor(fenced,4,0).blocked && fenced.x<-.55,'swim-aware foot sweep retains physical shore fencing');
const cliff={...dry(5,25.5),swimming:true};
const highBank=simulation.moveSwimmingActor(cliff,0,2);
assert(highBank.blocked && highBank.water && cliff.z<26,'a swimmer cannot step vertically up a high bank');
const top=dry(4,-13);
assert.equal(simulation.moveSwimmingActor(top,1,0).water,null,'bridge deck remains an ordinary walking surface');
const beneath={...dry(2,-10),swimming:true};
simulation.setExternalVehicles([{id:'bridge-traffic',x:2,z:-13,y:11,yaw:0,length:4.8,width:2,active:true}]);
assert.equal(simulation.moveSwimmingActor(beneath,0,-3).water?.y,5.93);
assert(Math.abs(beneath.z+13)<.001,'swimmers pass under elevated bridge traffic without changing height');
const berth={...dry(3,9),swimming:true};
simulation.setExternalVehicles([{id:'boat',x:5,z:9,y:5.93,yaw:0,length:4.8,width:2.1,active:true}]);
assert(simulation.moveSwimmingActor(berth,3,0).blocked && berth.x<4,'swimmers collide with a moored hull at their level');
simulation.setExternalVehicles([]);

const game=createGameplay(map,simulation,{sandbox:true,getInterior:()=>null});
game.reset({sandbox:true,onFoot:true,startPose:dry(-1.2,7)});
assert.equal(game.state.mode,'foot');
let entered=false, speedBefore=0;
for(let i=0;i<45;i++) {
  game.step(1/60,{moveX:1});
  if(game.state.actor.swimming){entered=true;break;}
  speedBefore=game.state.actor.speed;
}
assert(entered && game.state.actor.x>=0);
assert(Math.abs(speedBefore-3.6)<.001,'ordinary land speed is preserved right up to the actual shoreline');
assert.equal(game.state.actor.swimSurfaceY,5.93);
game.setWeapon('pistol');
const ammunition=game.state.ammo, start=game.state.actor.x;
for(let i=0;i<60;i++) game.step(1/60,{moveX:1,jump:true,crouch:true,aim:true,fire:true});
assert(Math.abs(game.state.actor.x-start-1.65)<.001);
assert.equal(game.state.actor.jumpHeight,0);
assert.equal(game.state.actor.crouching,false);
assert.equal(game.state.aiming,false);
assert.equal(game.state.ammo,ammunition,'swimming does not fire or consume ammunition');
assert.equal(game.interact(),false,'swimming never triggers ordinary road car access');
const fastStart=game.state.actor.x;
for(let i=0;i<60;i++) game.step(1/60,{moveX:1,sprint:true});
assert(Math.abs(game.state.actor.x-fastStart-2.45)<.001);
const hold=game.state.actor.x;
game.step(0,{moveX:-1});
assert.equal(game.state.actor.x,hold,'paused swimming is stationary');

const scene=new THREE.Scene(),view=createActorView(scene,()=>-7);
const head=scene.getObjectByName('Head');
view.update(game.state,{dt:.05});
const startHead=head.getWorldPosition(new THREE.Vector3());
assert(startHead.y>5.97 && startHead.y<6.23,'the animated swimmer is at the actual surface, not the terrain bed');
assert.equal(view.stats.activeWeapon,null);
for(let i=0;i<7;i++) view.update(game.state,{dt:1/30});
const nextHead=head.getWorldPosition(new THREE.Vector3());
assert.notEqual(startHead.y,nextHead.y,'the bounded stroke animation bobs at the surface');
view.dispose();

for(let i=0;i<240 && game.state.actor.swimming;i++) game.step(1/60,{moveX:-1,sprint:true});
assert(game.state.actor.x<0 && !game.state.actor.swimming && game.state.actor.swimSurfaceY===null);
game.step(1/60,{moveX:-1});
assert(Math.abs(game.state.actor.speed-3.6)<.001,'walking resumes after taking a clear shore exit');
Object.assign(game.state.actor,dry(4,-13));
assert(!game.syncSwimming());
assert(game.syncSwimming({underBridge:true}),'validated open-water disembarkations can adopt surface height beneath a deck');
game.reset({sandbox:true});
assert(!game.state.actor.swimming && game.state.actor.swimSurfaceY===null);

const actual=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra-north.json',import.meta.url),'utf8'));
const official=actual.areas.find(area=>area.id===lakeId);
assert(official?.points.length>2000 && official.innerRings?.length>0);
const source=createSimulation({ ...map,bounds:{...actual.bounds,minX:-6050},areas:[official] },{trafficCount:0});
const shoreline=official.points.find(([x,z])=>x<-3000 && z<-1800);
let crossing=null;
for(let i=0;i<16&&!crossing;i++){
  const angle=i*Math.PI/8,dx=Math.cos(angle)*2,dz=Math.sin(angle)*2;
  const start=dry(shoreline[0]-dx,shoreline[1]-dz), end=dry(shoreline[0]+dx,shoreline[1]+dz);
  if(!source.waterAt(start.x,start.z) && source.waterAt(end.x,end.z)) crossing={start,end};
}
assert(crossing,'the indexed official lake shoreline exposes dry and wet sides');
const {start:shore,end:water}=crossing;
assert(source.moveSwimmingActor(shore,water.x-shore.x,water.z-shore.z).water?.id===lakeId);
console.log('Capital swimming PASS: real lake membership and shoreline, bridge/deck split, pools remain solid, fences, road cars, moored hulls, banks, walk/swim/control transitions, stroke pose, and reset.');
