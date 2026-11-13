import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createAddressSearch} from '../Games/Capital Drive/address-search.js';
import {MAPPED_STORES} from '../Games/Capital Drive/stores.js';
import {POOL_BARRIERS,POOL_GATE_APPROACHES,MANUKA_POOL_BASIN} from '../Games/Capital Drive/landmarks.js';
const source=await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'),map=JSON.parse(source);
const before=JSON.stringify(map);
const runtime={...map,barriers:POOL_BARRIERS,collisionReplacedBuildingIds:['act-75267-0'],areas:[...map.areas,{type:'water',points:MANUKA_POOL_BASIN}]};
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
for(const store of MAPPED_STORES){
 assert(!simulation.moveActor({x:store.x,z:store.z},0,0,.45).blocked,store.name+' clear physical approach');
 const p=createProgression(runtime,null,{hasLineOfSight:simulation.hasLineOfSight});p.state.equipment.pistol=true;
 assert(p.startActivity(store.id,'robbery',ctx(store)).ok,store.name+' mapped till starts');
 for(let i=0;i<81;i++)p.update(.05,ctx(store));assert.equal(p.state.cash,1000+store.robbery);
 assert(!p.startActivity(store.id,'robbery',ctx(store)).ok,'each actual mapped till has a saved cooldown');
 const denied=createProgression(runtime,null,{hasLineOfSight:()=>false});denied.state.equipment.pistol=true;
 assert(!denied.startActivity(store.id,'robbery',ctx(store)).ok,'occluded till cannot start remotely');assert.equal(denied.state.cash,1000);
}
const storeMap={...map,landmarks:MAPPED_STORES.map(s=>({...s,store:true,aliases:[...s.aliases,s.sourceName]}))},search=createAddressSearch(storeMap);
for(const query of ['Coals','Coles']){const hit=search.search(query)[0];assert.equal(hit.label,'Coals');assert.equal(hit.kind,'store');}
assert(JSON.stringify(map)===before,'runtime site additions leave source database unchanged');
console.log('PASS sites: actual source pool gate/water, foot/car fences, local parked broad phase, seven physical mapped approaches/tills/occlusion/cooldowns, parody search aliases and source preservation.');
