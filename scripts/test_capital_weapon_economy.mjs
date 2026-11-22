import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {WEAPONS,WEAPON_IDS} from '../Games/Capital Drive/weapons.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';

const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
const legacy={version:1,cash:20000,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:100,stored:false}],completedJobs:[]};
const ctx=(site,extra={})=>({pose:{x:site.x,z:site.z},onFoot:true,wanted:0,vehicleHealth:100,respawnSerial:0,
  health:100,weapon:'unarmed',reserveAmmo:0,...extra});
const fixture=(options={},saved=legacy)=>{
  const p=createProgression(map,saved,options);
  return {p,arms:p.services.find(site=>site.id==='canalside-supplies'),food:p.services.find(site=>site.robbery)};
};
const unchanged=(p,action)=>{
  const before=p.serialize(),result=action();
  assert.equal(result.ok,false);assert.deepEqual(p.serialize(),before,'denial cannot change wallet, ownership or save');
};
function holdUpFixture(saved=legacy){
 let interiors,people,plan,employee;
 const f=fixture({interactiveRobbery:true,crimeTarget:id=>people.getCrimeTarget(id),
  robberyTarget:()=>people.getCrimeTarget(employee.id),servicePosition:site=>site.id===plan?.storeId?plan.counter:null,
  canUseService:site=>site.type==='arms'||interiors.active?.storeId===site.id,
  hasLineOfSight:(a,b)=>b.id===plan.storeId||b.id===employee.id?interiors.hasLineOfSight(a,b):true},saved);
 interiors=createInteriors(map,{stores:[f.food]});const entry=interiors.entries.find(e=>e.storeId===f.food.id);assert(entry);
 plan=interiors.enter(entry,{x:entry.x,z:entry.z,yaw:entry.yaw});assert(plan);
 people=createInteriorPeople();people.load(plan);employee=people.snapshot().find(person=>['cashier','shopkeeper','cook'].includes(person.role));assert(employee);
 let pose;
 for(let i=0;i<32;i++){
  const candidate={x:employee.x+Math.cos(i*Math.PI/16)*1.8,z:employee.z+Math.sin(i*Math.PI/16)*1.8};
  if(!interiors.moveActor({...candidate},0,0,.45).blocked&&interiors.hasLineOfSight(candidate,employee)&&Math.hypot(candidate.x-plan.counter.x,candidate.z-plan.counter.z)<=4)pose??=candidate;
 }
 assert(pose,'weapon test uses a real living employee and clear customer position');
 return {...f,inside:ctx(pose,{interior:{storeId:f.food.id,roomId:plan.id}})};
}

const old=fixture().p;
assert.deepEqual(old.state.equipment,{pistol:false},'legacy shape remains unchanged');
assert.deepEqual(createProgression(map,old.serialize()).serialize(),old.serialize());
for(const equipment of [{},{pistol:1},{pistol:false,rocket:true},{pistol:false,shotgun:1},{pistol:false,smg:null},{pistol:false,carbine:'true'}]){
  assert.throws(()=>createProgression(map,{...legacy,equipment}),/equipment/);
}
for(const id of WEAPON_IDS){
  const equipment={pistol:false,[id]:true};
  assert.deepEqual(createProgression(map,{...legacy,equipment}).serialize().equipment,equipment);
}

for(const profile of WEAPONS){
  const {p,arms}=fixture(),before=p.state.cash;
  unchanged(p,()=>p.purchaseService(arms.id,`ammo:${profile.id}`,ctx(arms)));
  const buy=p.purchaseService(arms.id,profile.id,ctx(arms));
  assert.equal(buy.ok,true);assert.equal(buy.cost,profile.price);assert.equal(buy.weaponId,profile.id);
  assert.equal(buy.ammo,profile.starterAmmo);assert.equal(buy.pistol,profile.id==='pistol'?true:undefined);
  assert.equal(p.state.cash,before-profile.price);assert.equal(p.state.equipment[profile.id],true);
  assert.deepEqual(createProgression(map,p.serialize()).serialize(),p.serialize(),'new ownership persists through v1 save');
  unchanged(p,()=>p.purchaseService(arms.id,profile.id,ctx(arms)));
  const cap=profile.id==='pistol'?120:profile.reserveCap;
  for(const reserveAmmo of [-1,0.5,NaN,Infinity,cap-profile.ammoPack+1,cap]){
    unchanged(p,()=>p.purchaseService(arms.id,`ammo:${profile.id}`,ctx(arms,{ammunition:{[profile.id]:{reserveAmmo}}})));
  }
  const reserveAmmo=cap-profile.ammoPack;
  const ammo=p.purchaseService(arms.id,`ammo:${profile.id}`,ctx(arms,{ammunition:{[profile.id]:{reserveAmmo}}}));
  assert.equal(ammo.ok,true);assert.equal(ammo.cost,profile.ammoPrice);assert.equal(ammo.ammo,profile.ammoPack);assert.equal(ammo.weaponId,profile.id);
  assert.equal(ammo.pistol,undefined,'ammo does not grant a weapon');
  assert.equal(p.state.cash,before-profile.price-profile.ammoPrice);
  const other=WEAPONS.find(weapon=>weapon.id!==profile.id);
  unchanged(p,()=>p.purchaseService(arms.id,`ammo:${other.id}`,ctx(arms,{ammunition:{[other.id]:{reserveAmmo:0}}})));
  if(profile.id!=='pistol')unchanged(p,()=>p.purchaseService(arms.id,`ammo:${profile.id}`,ctx(arms,{reserveAmmo:0})));
}
{
  const {p,arms}=fixture();
  assert(p.purchaseService(arms.id,'pistol',ctx(arms)).ok);
  unchanged(p,()=>p.purchaseService(arms.id,'ammo',ctx(arms,{reserveAmmo:97})));
  const ammo=p.purchaseService(arms.id,'ammo',ctx(arms,{reserveAmmo:96}));
  assert.equal(ammo.ok,true);assert.equal(ammo.weaponId,'pistol');assert.equal(ammo.ammo,24);
  unchanged(p,()=>p.purchaseService(arms.id,'ammo',ctx(arms,{reserveAmmo:0,ammunition:{pistol:{reserveAmmo:120}}})));
  unchanged(p,()=>p.purchaseService(arms.id,'ammo:unarmed',ctx(arms)));
}

const dealer={id:'test-road-dealer',name:'Fictional road dealer',type:'arms',dealer:true,x:20,z:30,radius:3,
  road:'Fixture Road',weaponIds:['shotgun'],priceMultiplier:1.25};
{
  const {p,arms}=fixture({extraServices:[dealer],hasLineOfSight:(a,b)=>a.z===b.z,
    canUseService:(site,context)=>context.health>0&&!context.panic});
  const site=p.services.find(service=>service.id===dealer.id);
  assert(site);assert.equal(p.services.length,fixture().p.services.length+1);
  for(const extra of [{pose:map.spawn},{pose:{x:site.x,z:site.z+1}},{onFoot:false},{sandbox:true},{recovering:true},
    {health:0},{panic:true},{pose:{x:NaN,z:site.z}},{wanted:NaN},{respawnSerial:-1}]){
    unchanged(p,()=>p.purchaseService(site.id,'shotgun',ctx(site,extra)));
  }
  unchanged(p,()=>p.purchaseService(site.id,'pistol',ctx(site)));
  unchanged(p,()=>p.purchaseService(site.id,'ammo:shotgun',ctx(site,{ammunition:{shotgun:{reserveAmmo:0}}})));
  const buy=p.purchaseService(site.id,'shotgun',ctx(site));
  assert.equal(buy.ok,true);assert.equal(buy.cost,1125);assert.equal(buy.weaponId,'shotgun');
  const ammo=p.purchaseService(site.id,'ammo:shotgun',ctx(site,{ammunition:{shotgun:{reserveAmmo:0}}}));
  assert.equal(ammo.ok,true);assert.equal(ammo.cost,113,'fractional marked-up prices round up to whole dollars');
  unchanged(p,()=>p.purchaseService(site.id,'shotgun',ctx(site)));
  assert(p.purchaseService(arms.id,'carbine',ctx(arms)).ok,'mapped shop still stocks every catalogue weapon');
}
for(const extraServices of [{},[dealer,dealer],[{...dealer,id:'canalside-supplies'}],[{...dealer,id:'bad id'}],
  [{...dealer,x:NaN}],[{...dealer,z:Infinity}],[{...dealer,radius:0}],[{...dealer,type:'food'}],
  [{...dealer,dealer:false}],[{...dealer,name:''}],[{...dealer,road:''}],[{...dealer,weaponIds:['rocket']}],
  [{...dealer,weaponIds:['shotgun','shotgun']}],[{...dealer,weaponIds:'shotgun'}],
  ...[0,-1,NaN,Infinity].map(priceMultiplier=>[{...dealer,priceMultiplier}])]){
  assert.throws(()=>fixture({extraServices}),/extra service/);
}
{
  const {p,arms}=fixture({}, {...legacy,cash:0});
  unchanged(p,()=>p.purchaseService(arms.id,'shotgun',ctx(arms)));
  for(const id of ['bogus','ammo:','ammo:rocket',null,{}])unchanged(p,()=>p.purchaseService(arms.id,id,ctx(arms)));
}

for(const profile of WEAPONS){
  const {p,arms,food,inside}=holdUpFixture();
  unchanged(p,()=>p.startActivity(food.id,'robbery',{...inside,weapon:profile.id}));
  assert(p.purchaseService(arms.id,profile.id,ctx(arms)).ok);
  unchanged(p,()=>p.startActivity(food.id,'robbery',ctx(food,{weapon:profile.id})));
  const armed={...inside,weapon:profile.id};assert(p.startActivity(food.id,'robbery',armed).ok);
  const cash=p.state.cash;
  for(let i=0;i<99;i++)p.update(.05,{...armed,wanted:2});assert.equal(p.state.cash,cash,'equipping a weapon cannot bypass the employee handover');
  p.update(.05,{...armed,wanted:2});
  assert.equal(p.state.cash,cash+food.robbery,'every owned equipped firearm completes a live employee till action');
  p.update(.05,armed);assert.equal(p.state.cash,cash+food.robbery,'pays once');
}
for(const interrupt of ['unarmed','unowned','ownership','sandbox']){
  const {p,inside}=holdUpFixture({...legacy,equipment:{pistol:false,shotgun:true}});
  assert(p.startActivity(food.id,'robbery',{...inside,weapon:'shotgun'}).ok);
  const cash=p.state.cash;
  if(interrupt==='ownership')p.state.equipment.shotgun=false;
  p.update(.05,{...inside,weapon:interrupt==='unarmed'?'unarmed':interrupt==='unowned'?'carbine':'shotgun',sandbox:interrupt==='sandbox'});
  assert.equal(p.state.activity,null,'robbery continually verifies an owned equipped firearm and live mode');assert.equal(p.state.cash,cash);
}
console.log('PASS weapon economy: strict v1 ownership; catalogue purchases; matching ammo/caps; injected dealer stock/prices/location/visibility/admission; equipped ownership throughout robbery; single wallet effects.');
