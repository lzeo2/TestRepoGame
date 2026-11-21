import assert from 'node:assert/strict';
import {createProgression,GARAGE_MODS} from '../Games/Capital Drive/progression.js';
import {createStreetUI} from '../Games/Capital Drive/street-ui.js';
const map={spawn:{x:0,z:0}};
const legacy={version:1,cash:20000,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:100,stored:false}],completedJobs:[]};
const fresh=(saved=legacy)=>createProgression(map,structuredClone(saved));
const context=(p,extra={})=>({pose:{x:p.garage.x,z:p.garage.z,yaw:0,speed:0},onFoot:false,wanted:0,vehicleHealth:100,respawnSerial:0,vehicle:{modelId:'lantern',stolen:false},sandbox:false,recovering:false,...extra});
const unchanged=(p,action)=>{const before=p.serialize();assert.equal(action().ok,false);assert.deepEqual(p.serialize(),before);};
{
  const p=fresh();assert.deepEqual(p.state.ownedVehicles[0].mods,{engine:0,brakes:0,handling:0});
  for(const mod of GARAGE_MODS){
    for(let tier=1;tier<=2;tier++){
      const before=p.state.cash,result=p.upgradeVehicle('lantern',mod.id,context(p));
      assert(result.ok);assert.equal(result.cost,mod.costs[tier-1]);assert.equal(result.tier,tier);assert.equal(p.state.cash,before-result.cost);
      assert.equal(p.vehicleMods({modelId:'lantern',stolen:false})[mod.id],tier);
      result.vehicle.mods[mod.id]=0;assert.equal(p.state.ownedVehicles[0].mods[mod.id],tier,'receipt detached');
    }
    unchanged(p,()=>p.upgradeVehicle('lantern',mod.id,context(p)));
  }
  const saved=p.serialize();assert.deepEqual(fresh(saved).serialize(),saved,'tiers/cash survive reload');
  const detached=p.vehicleMods({modelId:'lantern',stolen:false});detached.engine=0;assert.equal(p.vehicleMods({modelId:'lantern',stolen:false}).engine,2);
  for(const vehicle of [{modelId:'lantern',stolen:true},{modelId:'orchard',stolen:false},{modelId:'lantern'},null])assert.deepEqual(p.vehicleMods(vehicle),{engine:0,brakes:0,handling:0});
  p.update(0,context(p));assert(p.storeVehicle({modelId:'lantern',stolen:false}).ok);assert.deepEqual(p.vehicleMods({modelId:'lantern',stolen:false}),{engine:0,brakes:0,handling:0});
  assert(p.retrieveVehicle('lantern').ok);assert.equal(p.vehicleMods({modelId:'lantern',stolen:false}).engine,2);
}
{
  const p=fresh();assert(p.upgradeVehicle('lantern','engine',context(p,{vehicleHealth:53})).ok);
  assert.equal(fresh(p.serialize()).state.ownedVehicles[0].health,53,'fitting mods preserves current damage through reload');
  p.update(0,context(p));assert(p.buyVehicle('orchard').ok);
  assert.deepEqual(p.state.ownedVehicles.find(car=>car.id==='orchard').mods,{engine:0,brakes:0,handling:0},'another vehicle starts stock');
}
for(const mods of [null,[],{}, {engine:0,brakes:0},{engine:0,brakes:0,handling:0,unknown:0}, {engine:-1,brakes:0,handling:0},{engine:3,brakes:0,handling:0},{engine:1.5,brakes:0,handling:0},{engine:'1',brakes:0,handling:0},{engine:NaN,brakes:0,handling:0},{engine:0,brakes:false,handling:0}]){
  const save=structuredClone(legacy);save.ownedVehicles[0].mods=mods;assert.throws(()=>fresh(save),/garage/);
}
for(const extra of [{sandbox:true},{recovering:true},{passenger:true},{interior:{id:'room'}},{onFoot:true},{wanted:1},{wanted:6},{vehicleHealth:0},{vehicleHealth:101},{pose:{x:0,z:0,speed:0}},{pose:{x:-349.73,z:-422.16,speed:.81}},{pose:{x:-349.73,z:-422.16}},{vehicle:{modelId:'orchard',stolen:false}},{vehicle:{modelId:'lantern',stolen:true}},{vehicle:{modelId:'lantern'}},{respawnSerial:-1}]){
  const p=fresh();unchanged(p,()=>p.upgradeVehicle('lantern','engine',context(p,extra)));
}
{
  const p=fresh();unchanged(p,()=>p.upgradeVehicle('orchard','engine',context(p)));unchanged(p,()=>p.upgradeVehicle('lantern','unknown',context(p)));
  p.state.cash=0;unchanged(p,()=>p.upgradeVehicle('lantern','engine',context(p)));
  p.state.cash=20000;p.state.activity={type:'fixture'};unchanged(p,()=>p.upgradeVehicle('lantern','engine',context(p)));p.state.activity=null;
  p.state.activeJob={id:'fixture'};unchanged(p,()=>p.upgradeVehicle('lantern','engine',context(p)));p.state.activeJob=null;
  p.state.ownedVehicles[0].stored=true;unchanged(p,()=>p.upgradeVehicle('lantern','engine',context(p)));
}
{
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.textContent='';}
    append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}
    addEventListener(type,fn){this.listeners[type]=fn;}removeEventListener(type){delete this.listeners[type];}
  }
  const list=new Element('div');globalThis.document={getElementById:id=>id==='car-options'?list:null,createElement:tag=>new Element(tag)};
  const p=fresh();let actor=context(p),saves=0;
  const state={mode:'vehicle',vehicle:{modelId:'lantern',stolen:false,color:'#e7e6df'},wanted:0,health:100,vehicleHealth:100,respawnSerial:0,weapon:'unarmed',pursuit:'clear'};
  const ui=createStreetUI({gameplay:{state,focus:()=>actor.pose,getAmmo:()=>({})},progression:p,simulation:{player:{speed:0}},vehicles:[{id:'lantern',name:'Saloon'}],notify(){},openDialog(){},closeDialogs(){},onVehicleSelected(){throw Error('Upgrade cannot retrieve/teleport the vehicle');},saveCareer(){saves++;},isSandbox:()=>actor.sandbox,getContext:()=>actor});
  const all=node=>[node,...node.children.flatMap(all)];
  ui.renderGarage();let upgrade=all(list).find(n=>n.textContent==='Fit engine 1 · $350');assert(upgrade);assert.equal(upgrade.disabled,false);upgrade.listeners.click();assert.equal(saves,1);assert.equal(p.state.cash,19650);
  assert(all(list).some(n=>n.textContent==='Fit engine 2 · $700'));
  actor=context(p,{wanted:2});ui.renderGarage();upgrade=all(list).find(n=>n.textContent==='Fit engine 2 · $700');assert.equal(upgrade.disabled,true);assert.match(upgrade.title,/police/);
  const before=p.serialize();upgrade.listeners.click();assert.equal(saves,1);assert.deepEqual(p.serialize(),before,'stale UI click rechecks authority');
  actor=context(p,{sandbox:true});ui.renderGarage();assert(!all(list).some(n=>n.textContent==='Vehicle upgrades'));assert.equal(saves,1);
  ui.dispose();delete globalThis.document;
}
console.log('PASS garage mods: strict legacy defaults/tiers; two paid tiers per vehicle; exact costs/caps; detached reload; legal current-car/stopped/health/mode/range/wanted guards; UI cost, denied reason, stale-click recheck and exactly-once writer.');
