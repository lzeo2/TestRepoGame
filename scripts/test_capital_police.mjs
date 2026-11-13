import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load = async path => import(await moduleURL(new URL(path, import.meta.url)));
const {createGameplay}=await load('../Games/Capital Drive/gameplay.js');
const {createPolice}=await load('../Games/Capital Drive/police.js');
const {createSimulation,pointOnLane}=await load('../Games/Capital Drive/simulation.js');
const map={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},spawn:{x:0,z:0,yaw:-Math.PI/2},buildings:[],roads:[
  {id:'bend',name:'Bend',type:'residential',points:[[-100,0],[0,0],[0,100],[100,100]],nodes:[1,2,3,4],width:12,speed:40,oneway:1}
]};
const simulation=createSimulation(map,{trafficCount:0});
Object.assign(simulation.player,{x:-150,z:-150});
const edge=simulation.graph.edges[0],start=pointOnLane(edge,10);
const unit={id:'police:fixture',...start,speed:0,health:100,mode:'vehicle',car:{id:'police:fixture',...start,speed:0,active:true,length:4.8,width:1.9}};
const state={police:[unit],wanted:1,sandbox:false,mode:'vehicle',heat:100};
// Suppress extra spawns for this isolated road-following test.
const near=simulation.nearestRoad;simulation.nearestRoad=()=>null;
const target={x:90,z:102,speed:12};
const controller=createPolice(simulation);controller.report(target);
let maximumStep=0,maximumTurn=0,turned=false,moved=0;
for(let i=0;i<1200;i++) {
  const before={...unit.car};controller.step(1/60,state,target);
  const step=Math.hypot(unit.car.x-before.x,unit.car.z-before.z);
  maximumStep=Math.max(maximumStep,step);maximumTurn=Math.max(maximumTurn,Math.abs(Math.atan2(Math.sin(unit.car.yaw-before.yaw),Math.cos(unit.car.yaw-before.yaw))));moved+=step;
  if(unit.car.z>8 && unit.car.z<80) { turned=true; assert(unit.car.x>-20 && unit.car.x<20,'turn stays beside the routed vertical road'); }
  if(unit.car.z<70) assert(unit.car.x<20,'does not cut diagonally toward the target');
}
assert(moved>50);assert(turned);assert(maximumStep<0.4);assert(maximumTurn<=1.1/60+1e-8);
simulation.nearestRoad=near;
// A stopped patrol leaves a persistent car, pursues on foot and returns to it.
Object.assign(unit,{x:0,z:0,mode:'vehicle'});Object.assign(unit.car,{x:0,z:0,speed:0,yaw:0});
state.mode='foot';state.wanted=1;target.x=3;target.z=0;target.speed=0;
controller.step(1/60,state,target);assert.equal(unit.mode,'foot');assert.equal(unit.car.active,true);
const carPose={x:unit.car.x,z:unit.car.z};
controller.step(1/60,state,target);assert.deepEqual({x:unit.car.x,z:unit.car.z},carPose);
state.mode='vehicle';target.x=100;target.z=100;target.speed=15;
for(let i=0;i<300 && unit.mode==='foot';i++) controller.step(1/60,state,target);
assert.equal(unit.mode,'vehicle','officer reboards for a fleeing car');
// Real polygon LOS, lost sight and finite cooling are independent of road targeting.
const wallMap={...map,buildings:[{id:'wall',points:[[10,-30],[13,-30],[13,30],[10,30]],height:8}]};
const wallSim=createSimulation(wallMap,{trafficCount:0});wallSim.nearestRoad=()=>null;
const hidden={police:[{id:'hidden',x:20,z:0,yaw:0,speed:0,health:100,mode:'foot'}],wanted:3,sandbox:false,mode:'foot',heat:0.2};
const search=createPolice(wallSim);search.report({x:0,z:0});search.step(0.05,hidden,{x:0,z:0,speed:0});
assert.equal(hidden.police[0].seesPlayer,false);assert.equal(hidden.pursuit,'search');
for(let i=0;i<10;i++)search.step(0.05,hidden,{x:0,z:0,speed:0});assert.equal(hidden.wanted,0);
// Equipment, recovery actions and occupied taking use public gameplay interfaces.
const game=createGameplay(map,simulation);assert.equal(game.setWeapon('pistol'),false);assert.equal(game.state.ammo,0);
let owns=false, exits=[],penalties=[];
const armed=createGameplay(map,simulation,{hasPistol:()=>owns,onCarjacked:p=>exits.push(p),onRespawn:r=>penalties.push(r)});
assert(armed.addAmmo(24));assert.equal(armed.setWeapon('pistol'),false);owns=true;assert(armed.setWeapon('pistol'));assert.equal(armed.state.ammo,12);assert.equal(armed.state.reserveAmmo,12);
armed.setWeapon('unarmed');armed.setWeapon('pistol');assert.equal(armed.state.reserveAmmo,12,'switching never grants ammunition');
armed.interact();Object.assign(armed.state.actor,{x:0,z:0});
let moving=4,claimed=0,stops=0;
const originalNear=simulation.nearbyVehicles,originalClaim=simulation.claimVehicle;
simulation.nearbyVehicles=()=>[{id:'traffic:fixture',x:3,z:0,yaw:0,speed:moving,occupied:true}];
simulation.requestVehicleStop=()=>{stops++;};
simulation.claimVehicle=()=>{claimed++;return {ok:true,vehicle:{modelId:'relay'},stolen:true};};
assert.equal(armed.interact(),false);for(let i=0;i<150;i++)armed.step(1/60);assert.equal(claimed,0);assert(stops>100);
moving=0;for(let i=0;i<60;i++)armed.step(1/60);assert.equal(claimed,0);assert(armed.state.carjacking.progress>0);
for(let i=0;i<60;i++)armed.step(1/60);assert.equal(claimed,1);assert.equal(exits.length,1);assert.equal(exits[0].x,5);
simulation.nearbyVehicles=originalNear;simulation.claimVehicle=originalClaim;
armed.state.health=0;const before={x:simulation.player.x,z:simulation.player.z};armed.step(1/60);
assert.equal(armed.state.recovery.phase,'out');assert.deepEqual({x:simulation.player.x,z:simulation.player.z},before);assert.equal(penalties.length,0);
assert.equal(armed.interact(),false);assert.equal(armed.setWeapon('unarmed'),false);assert.equal(armed.heal(50),false);assert.equal(armed.addAmmo(50),false);assert.equal(armed.reload(),false);
for(let i=0;i<100;i++)armed.step(1/60,{fire:true});assert.equal(penalties.length,0);
for(let i=0;i<20;i++)armed.step(1/60);assert.equal(penalties.length,1);assert.equal(armed.state.recovery.phase,'in');
for(let i=0;i<100;i++)armed.step(1/60);assert.equal(armed.state.recovery,null);assert.equal(penalties.length,1);
console.log('Capital police: directed turn/brake inertia, persistent patrol/dismount/reboard, polygon LOS/cooling, gated ammo, timed occupied carjacking and single delayed recovery PASS');
