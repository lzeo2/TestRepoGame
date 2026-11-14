import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProgression} from '../Games/Capital Drive/progression.js';
const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
const p=createProgression(map),site=type=>p.services.find(s=>s.type===type);
const ctx=(s,extra={})=>({pose:{x:s.x,z:s.z},onFoot:true,vehicle:{modelId:'lantern',stolen:false},vehicleHealth:100,health:60,wanted:0,respawnSerial:0,weapon:'unarmed',reserveAmmo:0,...extra});
const food=site('food'),arms=site('arms'),gym=site('gym');
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
assert.equal(p.startActivity(gym.id,'workout',ctx(gym)).ok,true);
p.update(0,ctx(gym));assert.equal(p.state.activity.progress,0,'pause freezes activity');
p.update(.05,ctx(gym,{pose:map.spawn}));assert.equal(p.state.activity,null);assert.equal(p.state.cash,455,'leaving training pays nothing');
assert.equal(p.startActivity(gym.id,'workout',ctx(gym)).ok,true);
for(let i=0;i<161;i++)p.update(.05,ctx(gym));
assert.equal(p.state.fitnessLevel,1);assert.equal(p.state.cash,335);
p.update(.05,ctx(gym));assert.equal(p.state.cash,335,'finished session charges once');
assert.equal(p.startActivity(food.id,'robbery',ctx(food)).ok,false,'must equip');
assert.equal(p.startActivity(food.id,'robbery',ctx(food,{weapon:'pistol'})).ok,true);
const cash=p.state.cash;p.update(0,ctx(food,{weapon:'pistol'}));assert.equal(p.state.cash,cash);
for(let i=0;i<81;i++)p.update(.05,ctx(food,{weapon:'pistol',wanted:2}));
assert.equal(p.state.cash,cash+food.robbery);assert.equal(p.state.activity,null);assert(p.state.robberyCooldowns[food.id]>179);
p.update(.05,ctx(food,{weapon:'pistol'}));assert.equal(p.state.cash,cash+food.robbery,'robbery pays exactly once');
assert.equal(p.startActivity(food.id,'robbery',ctx(food,{weapon:'pistol'})).ok,false,'empty till blocked');
const saved=p.serialize(),loaded=createProgression(map,saved);assert.deepEqual(loaded.serialize(),saved);
assert.equal(loaded.startActivity(food.id,'robbery',ctx(food,{weapon:'pistol'})).ok,false,'reload cannot refill till');
const legacy={version:1,cash:1234,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:87,stored:false}],completedJobs:[]};
const legacyCooldown=createProgression(map,{...legacy,robberyCooldowns:{'crescent-kiosk':40,'manuka-store':80}});assert.equal(legacyCooldown.state.robberyCooldowns['manuka-store'],80);
const migrated=createProgression(map,legacy);assert.equal(migrated.state.cash,1234);assert.deepEqual(migrated.state.equipment,{pistol:false});assert.equal(migrated.state.fitnessLevel,0);
for(const bad of [{equipment:{pistol:1}},{equipment:{pistol:false,other:true}},{fitnessLevel:4},{fitnessLevel:.5},{robberyCooldowns:{bogus:20}},{robberyCooldowns:{[food.id]:181}},{robberyCooldowns:{[food.id]:NaN}}])assert.throws(()=>createProgression(map,{...saved,...bad}));
const poor=createProgression(map,{...saved,cash:0,robberyCooldowns:{}});
assert.equal(poor.purchaseService(food.id,'food',ctx(food)).ok,false);assert.equal(poor.state.cash,0);
assert.equal(poor.startActivity(gym.id,'workout',ctx(gym)).ok,false);
assert.equal(p.startActivity(p.services.find(s=>s.type==='retail').id,'robbery',ctx(p.services.find(s=>s.type==='retail'),{weapon:'pistol'})).ok,true);
p.penalize('Hospital');assert.equal(p.state.activity,null);assert.equal(p.state.completedJobs.length,0);
console.log('PASS services: location/on-foot/wanted/sandbox/cost gates; food/gun/ammo; timed fitness/robbery; single payouts/cooldown reload; legacy v1 and strict new fields.');
// Controller-resolved counters must remain authoritative during a timed robbery.
let inside=false;
const counters=createProgression(map,legacy,{
 servicePosition:s=>s.id===food.id&&inside?{x:food.x+5,z:food.z+8,radius:1.6}:null,
 canUseService:s=>s.id!==food.id||inside,
 hasLineOfSight:()=>true,
});
const wallet=counters.state.cash;
assert.equal(counters.purchaseService(food.id,'food',ctx(food)).ok,false,'mapped outside facade is not an indoor counter');
assert.equal(counters.state.cash,wallet);
inside=true;
const counter=counters.services.find(s=>s.id===food.id);
assert.equal(counters.purchaseService(food.id,'food',ctx(counter)).ok,true);
counters.state.equipment.pistol=true;
assert.equal(counters.startActivity(food.id,'robbery',ctx(counter,{weapon:'pistol'})).ok,true);
inside=false;
counters.update(.05,ctx(counter,{weapon:'pistol'}));
assert.equal(counters.state.activity,null,'leaving the room interrupts the till action');
assert.equal(counters.state.cash,wallet-food.price);
console.log('PASS indoor service authority: resolved counter, exterior denial and leave-room interruption');
const interactive=createProgression(map,null,{interactiveWorkouts:true});
assert(interactive.startActivity(gym.id,'workout',ctx(gym)).ok);
for(let i=0;i<300;i++)interactive.update(.05,ctx(gym));
assert.equal(interactive.state.fitnessLevel,0,'time alone cannot finish a playable bench session');
assert.equal(interactive.state.cash,1000);
assert(!interactive.finishWorkout(ctx(gym),false).ok);assert.equal(interactive.state.cash,1000);
assert(interactive.startActivity(gym.id,'workout',ctx(gym)).ok);assert(interactive.finishWorkout(ctx(gym),true).ok);
assert.equal(interactive.state.fitnessLevel,1);assert.equal(interactive.state.cash,880);
assert(!interactive.finishWorkout(ctx(gym),true).ok);assert.equal(interactive.state.cash,880);
assert(!interactive.payRental(20,ctx(gym,{sandbox:true})).ok);assert.equal(interactive.state.cash,880);
assert(interactive.payRental(20,ctx(gym)).ok);assert.equal(interactive.state.cash,860);
console.log('PASS interactive workout completion authority and rental spend/sandbox guards');
