import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createAddressSearch} from '../Games/Capital Drive/address-search.js';
import {MAPPED_STORES} from '../Games/Capital Drive/stores.js';
import {POOL_BARRIERS,POOL_GATE_APPROACHES,MANUKA_POOL_BASIN} from '../Games/Capital Drive/landmarks.js';
const source=await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'),map=JSON.parse(source);
const before=JSON.stringify(map);
const north=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra-north.json',import.meta.url),'utf8'));
const northwest=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/north-west.json',import.meta.url),'utf8'));
const northwestTerrain=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/north-west-terrain.json',import.meta.url),'utf8'));
const expanded=applyNorthWest(applyMapExpansion(map,north),northwest,northwestTerrain);
const runtime={...expanded,barriers:POOL_BARRIERS,collisionReplacedBuildingIds:['act-75267-0'],areas:[...expanded.areas,{type:'water',points:MANUKA_POOL_BASIN}]};
const simulation=createSimulation(runtime,{trafficCount:0}),gate=POOL_GATE_APPROACHES[0];
const actor={x:gate.outside[0],z:gate.outside[1]};assert(!simulation.moveActor(actor,0,0,.45).blocked);
for(let i=0;i<40;i++)assert(!simulation.moveActor(actor,(gate.inside[0]-actor.x)/(40-i),(gate.inside[1]-actor.z)/(40-i),.45).blocked,'source enclosure gate remains physically passable');
assert(Math.hypot(actor.x-gate.inside[0],actor.z-gate.inside[1])<1e-6);
const water={x:MANUKA_POOL_BASIN.reduce((n,p)=>n+p[0],0)/4,z:MANUKA_POOL_BASIN.reduce((n,p)=>n+p[1],0)/4};
assert(simulation.moveActor(water,0,0,.45).blocked,'pool water is physical after exact ACT collision replacement');
const bare={bounds:{minX:-50,minZ:-50,maxX:5000,maxZ:5000},spawn:{x:0,z:0,yaw:0},roads:[],areas:[],buildings:[],barriers:[{points:[[10,-10],[10.2,-10],[10.2,10],[10,10]]}]};
const fence=createSimulation(bare,{trafficCount:0}),walker={x:9,z:0};assert(fence.moveActor(walker,3,0,.45).blocked);assert(walker.x<9.7);
const car={id:'test-car',x:7,z:0,yaw:-Math.PI/2};assert(fence.moveVehicle(car,6,0,{length:4.5,width:1.8}).blocked);assert(car.x<10);
const fast=createSimulation({...bare,barriers:[]},{trafficCount:0});
fast.setParkedCars(Array.from({length:2000},(_,i)=>({id:'far-'+i,x:1500+i%100*10,z:1500+Math.floor(i/100)*10,yaw:0})));
let coldReads=0;for(const c of fast.parkedCars)Object.defineProperty(c,'active',{get(){coldReads++;return true;},configurable:true});
assert(fast.canOccupy({x:20,z:20,yaw:0}));const foot={x:20,z:20};assert(!fast.moveActor(foot,1,0).blocked);
assert.equal(coldReads,0,'local vehicle/foot sweeps do not scan two thousand distant parked cars');
const ctx=(s,extra={})=>({pose:{x:s.x,z:s.z},onFoot:true,vehicle:{modelId:'lantern',stolen:false},vehicleHealth:100,health:50,wanted:0,respawnSerial:0,weapon:'pistol',reserveAmmo:12,...extra});
const interiors=createInteriors(runtime,{stores:MAPPED_STORES});
for(const store of MAPPED_STORES){
 assert(!simulation.moveActor({x:store.x,z:store.z},0,0,.45).blocked,store.name+' clear physical approach');
 const entry=interiors.entries.find(e=>e.storeId===store.id);assert(entry,store.name+' has its source-backed doorway');
 const actor={x:entry.x,z:entry.z,yaw:entry.yaw},plan=interiors.enter(entry,actor);assert(plan);
 const people=createInteriorPeople();people.load(plan);
 const employee=people.snapshot().find(person=>['cashier','shopkeeper','cook'].includes(person.role));assert(employee);
 let pose;
 for(let i=0;i<32;i++){
  const candidate={x:employee.x+Math.cos(i*Math.PI/16)*1.8,z:employee.z+Math.sin(i*Math.PI/16)*1.8};
  if(!interiors.moveActor({...candidate},0,0,.45).blocked&&interiors.hasLineOfSight(candidate,employee)&&Math.hypot(candidate.x-plan.counter.x,candidate.z-plan.counter.z)<=4)pose??=candidate;
 }
 assert(pose,store.name+' has a physical employee approach');
 const options={interactiveRobbery:true,crimeTarget:id=>people.getCrimeTarget(id),robberyTarget:()=>people.getCrimeTarget(employee.id),
  servicePosition:s=>s.id===store.id?plan.counter:null,canUseService:s=>interiors.active?.storeId===s.id,hasLineOfSight:interiors.hasLineOfSight};
 const p=createProgression(runtime,null,options);p.state.equipment.pistol=true;
 const outside=p.serialize();assert(!p.startActivity(store.id,'robbery',ctx(store)).ok,'exterior timer cannot bypass the live room');assert.deepEqual(p.serialize(),outside);
 const inside=ctx(pose,{interior:{storeId:store.id,roomId:plan.id}});
 assert(p.startActivity(store.id,'robbery',inside).ok,store.name+' live employee till starts');
 p.update(0,inside);assert.equal(p.state.activity.progress,0);
 for(let i=0;i<99;i++)p.update(.05,inside);assert.equal(p.state.cash,1000,'no pay before employee handover');
 p.update(.05,inside);assert.equal(p.state.cash,1000+store.robbery);
 p.update(.05,inside);assert.equal(p.state.cash,1000+store.robbery,'one handover pays once');
 assert(!p.startActivity(store.id,'robbery',inside).ok,'each actual mapped till has a saved cooldown');
 const loaded=createProgression(runtime,p.serialize(),options);assert(!loaded.startActivity(store.id,'robbery',inside).ok,'reload retains each till cooldown');
 const denied=createProgression(runtime,null,{...options,hasLineOfSight:()=>false});denied.state.equipment.pistol=true;
 const blocked=denied.serialize();assert(!denied.startActivity(store.id,'robbery',inside).ok,'occluded employee cannot start remotely');assert.deepEqual(denied.serialize(),blocked);
 interiors.reset();
}
const storeMap={...map,landmarks:MAPPED_STORES.map(s=>({...s,store:true,aliases:[...s.aliases,s.sourceName]}))},search=createAddressSearch(storeMap);
for(const query of ['Coals','Coles']){const hit=search.search(query)[0];assert.equal(hit.label,'Coals');assert.equal(hit.kind,'store');}
assert(JSON.stringify(map)===before,'runtime site additions leave source database unchanged');
console.log(`PASS sites: actual source pool gate/water, foot/car fences, local parked broad phase, ${MAPPED_STORES.length} physical mapped approaches and live employee tills/occlusion/payout/cooldown reloads, parody search aliases and source preservation.`);
