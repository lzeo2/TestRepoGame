import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createInteriors,createGymEntry} from '../Games/Capital Drive/interiors.js';
import {createInteriorActivities} from '../Games/Capital Drive/interior-activities.js';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';
const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
let gymRoom,activities,shopRoom,people,employee;
const p=createProgression(map,null,{interactiveWorkouts:true,interactiveRobbery:true,
 workSession:()=>({plan:gymRoom?.active,session:activities?.snapshot()}),
 crimeTarget:id=>people?.getCrimeTarget(id),robberyTarget:id=>shopRoom?.active?.storeId===id?people.getCrimeTarget(employee.id):null,
 servicePosition:s=>shopRoom?.active?.storeId===s.id?shopRoom.active.counter:null,
 hasLineOfSight:(a,b)=>(shopRoom?.active?shopRoom:gymRoom)?.hasLineOfSight(a,b)??true}),site=type=>p.services.find(s=>s.type===type);
const ctx=(s,extra={})=>({pose:{x:s.x,z:s.z},onFoot:true,vehicle:{modelId:'lantern',stolen:false},vehicleHealth:100,health:60,wanted:0,respawnSerial:0,weapon:'unarmed',reserveAmmo:0,...extra});
const food=site('food'),arms=site('arms'),gym=site('gym');
function enterShop(store){
 shopRoom=createInteriors(map,{stores:[store]});const entry=shopRoom.entries.find(e=>e.storeId===store.id);assert(entry);
 const actor={x:entry.x,z:entry.z,yaw:entry.yaw},plan=shopRoom.enter(entry,actor);assert(plan);
 people=createInteriorPeople();people.load(plan);employee=people.snapshot().find(a=>['cashier','shopkeeper','cook'].includes(a.role));assert(employee);
 let pose;
 for(let i=0;i<32;i++){
  const candidate={x:employee.x+Math.cos(i*Math.PI/16)*1.8,z:employee.z+Math.sin(i*Math.PI/16)*1.8};
  if(!shopRoom.moveActor({...candidate},0,0,.45).blocked&&shopRoom.hasLineOfSight(candidate,employee)&&Math.hypot(candidate.x-plan.counter.x,candidate.z-plan.counter.z)<=4)pose??=candidate;
 }
 assert(pose,'actual employee has a solid-clear customer position');
 return ctx(pose,{interior:{storeId:store.id,roomId:plan.id}});
}
const stable=()=>JSON.stringify(p.serialize());
for(const extra of [{pose:map.spawn},{onFoot:false},{sandbox:true},{recovering:true},{health:100}]){
 const before=stable();assert.equal(p.purchaseService(food.id,'food',ctx(food,extra)).ok,false);assert.equal(stable(),before,'failed purchase cannot alter wallet/save');
}
let r=p.purchaseService(food.id,'food',ctx(food));assert.equal(r.heal,35);assert.equal(r.cost,35);assert.equal(p.state.cash,965);
assert.equal(p.purchaseService(arms.id,'ammo',ctx(arms)).ok,false);
r=p.purchaseService(arms.id,'pistol',ctx(arms));assert.equal(r.ammo,24);assert.equal(p.state.equipment.pistol,true);assert.equal(p.state.cash,515);
const bought=stable();assert.equal(p.purchaseService(arms.id,'pistol',ctx(arms)).ok,false);assert.equal(stable(),bought,'duplicate gun cannot charge');
assert.equal(p.purchaseService(arms.id,'ammo',ctx(arms,{reserveAmmo:120})).ok,false);
r=p.purchaseService(arms.id,'ammo',ctx(arms,{reserveAmmo:20}));assert.equal(r.ammo,24);assert.equal(p.state.cash,455);
const gymEntry=createGymEntry(map,gym);assert(gymEntry);gymRoom=createInteriors(map,{publicEntries:[gymEntry]});
const gymPlan=gymRoom.enter(gymRoom.entries.find(e=>e.serviceId===gym.id),{x:gymEntry.x,z:gymEntry.z,yaw:gymEntry.yaw});
activities=createInteriorActivities();activities.load(gymPlan);const bench=gymPlan.activities.find(s=>s.kind==='bench'),gymCtx=ctx(bench);
assert(activities.start(bench.id,gymCtx));assert.equal(p.startActivity(gym.id,'workout',gymCtx).ok,true);
p.update(0,gymCtx);assert.equal(p.state.activity.progress,0,'pause freezes activity');
p.update(.05,{...gymCtx,pose:map.spawn});assert.equal(p.state.activity,null);assert.equal(p.state.cash,455,'leaving training pays nothing');
activities.cancel();assert(activities.start(bench.id,gymCtx));assert.equal(p.startActivity(gym.id,'workout',gymCtx).ok,true);
for(let i=0;i<2000&&activities.snapshot().active;i++){
 const session=activities.snapshot();activities.step(.05,{x:true,y:true,...(session.phase==='cue'?{up:true}:{})},gymCtx);p.update(.05,gymCtx);
}
assert.equal(activities.snapshot().phase,'complete');assert.equal(p.state.fitnessLevel,0);assert.equal(p.state.cash,455,'a completed set waits for the authenticated finish handoff');
assert(p.finishWorkout(gymCtx,true).ok);
assert.equal(p.state.fitnessLevel,1);assert.equal(p.state.cash,335);
p.update(.05,gymCtx);assert.equal(p.finishWorkout(gymCtx,true).ok,false);assert.equal(p.state.cash,335,'finished session charges once');
const foodCtx=enterShop(food);
assert.equal(p.startActivity(food.id,'robbery',foodCtx).ok,false,'must equip');
const armedFood={...foodCtx,weapon:'pistol'};assert.equal(p.startActivity(food.id,'robbery',armedFood).ok,true);
const cash=p.state.cash;p.update(0,armedFood);assert.equal(p.state.cash,cash);
for(let i=0;i<99;i++)p.update(.05,{...armedFood,wanted:2});assert.equal(p.state.cash,cash,'no early till handover');
p.update(.05,{...armedFood,wanted:2});
assert.equal(p.state.cash,cash+food.robbery);assert.equal(p.state.activity,null);assert(p.state.robberyCooldowns[food.id]>179);
p.update(.05,armedFood);assert.equal(p.state.cash,cash+food.robbery,'robbery pays exactly once');
assert.equal(p.startActivity(food.id,'robbery',armedFood).ok,false,'empty till blocked');
const saved=p.serialize(),loaded=createProgression(map,saved);assert.deepEqual(loaded.serialize(),saved);
assert.equal(loaded.startActivity(food.id,'robbery',ctx(food,{weapon:'pistol'})).ok,false,'reload cannot refill till');
const legacy={version:1,cash:1234,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:87,stored:false}],completedJobs:[]};
const legacyCooldown=createProgression(map,{...legacy,robberyCooldowns:{'crescent-kiosk':40,'manuka-store':80}});assert.equal(legacyCooldown.state.robberyCooldowns['manuka-store'],80);
const migrated=createProgression(map,legacy);assert.equal(migrated.state.cash,1234);assert.deepEqual(migrated.state.equipment,{pistol:false});assert.equal(migrated.state.fitnessLevel,0);
for(const bad of [{equipment:{pistol:1}},{equipment:{pistol:false,other:true}},{fitnessLevel:4},{fitnessLevel:.5},{robberyCooldowns:{bogus:20}},{robberyCooldowns:{[food.id]:181}},{robberyCooldowns:{[food.id]:NaN}}])assert.throws(()=>createProgression(map,{...saved,...bad}));
const poor=createProgression(map,{...saved,cash:0,robberyCooldowns:{}});
assert.equal(poor.purchaseService(food.id,'food',ctx(food)).ok,false);assert.equal(poor.state.cash,0);
assert.equal(poor.startActivity(gym.id,'workout',ctx(gym)).ok,false);
const retail=site('retail');assert.equal(p.startActivity(retail.id,'robbery',{...enterShop(retail),weapon:'pistol'}).ok,true);
p.penalize('Hospital');assert.equal(p.state.activity,null);assert.equal(p.state.completedJobs.length,0);
console.log('PASS services: location/on-foot/wanted/sandbox/cost gates; food/gun/ammo; real equipment fitness and live employee robbery; single payouts/cooldown reload; legacy v1 and strict new fields.');
// Controller-resolved counters must remain authoritative during a timed robbery.
let inside=false;
const counterContext=enterShop(food),counterPlan=shopRoom.active;
const counters=createProgression(map,legacy,{
 interactiveRobbery:true,crimeTarget:id=>people.getCrimeTarget(id),robberyTarget:()=>people.getCrimeTarget(employee.id),
 servicePosition:s=>s.id===food.id&&inside?counterPlan.counter:null,
 canUseService:s=>s.id!==food.id||inside,
 hasLineOfSight:()=>true,
});
const wallet=counters.state.cash;
assert.equal(counters.purchaseService(food.id,'food',ctx(food)).ok,false,'mapped outside facade is not an indoor counter');
assert.equal(counters.state.cash,wallet);
inside=true;
assert.equal(counters.purchaseService(food.id,'food',ctx(counterPlan.counter)).ok,true);
counters.state.equipment.pistol=true;
assert.equal(counters.startActivity(food.id,'robbery',{...counterContext,weapon:'pistol'}).ok,true);
inside=false;
counters.update(.05,{...counterContext,weapon:'pistol'});
assert.equal(counters.state.activity,null,'leaving the room interrupts the till action');
assert.equal(counters.state.cash,wallet-food.price);
console.log('PASS indoor service authority: resolved counter, exterior denial and leave-room interruption');
const interactive=createProgression(map,null,{interactiveWorkouts:true});
assert.equal(interactive.startActivity(gym.id,'workout',ctx(gym)).ok,false,'paid exercise requires an authentic live room session');
for(let i=0;i<300;i++)interactive.update(.05,ctx(gym));
assert.equal(interactive.state.fitnessLevel,0,'time alone cannot finish an interactive workout');
assert.equal(interactive.state.cash,1000);
assert.equal(interactive.finishWorkout(ctx(gym),false).ok,false);
assert.equal(interactive.finishWorkout(ctx(gym),true).ok,false,'caller success cannot invent a completed exercise');
assert.equal(interactive.state.fitnessLevel,0);assert.equal(interactive.state.cash,1000);
assert(!interactive.payRental(20,ctx(gym,{sandbox:true})).ok);assert.equal(interactive.state.cash,1000);
assert(interactive.payRental(20,ctx(gym)).ok);assert.equal(interactive.state.cash,980);
console.log('PASS interactive workout denies missing live session and caller-only completion; rental spend/sandbox guards');
