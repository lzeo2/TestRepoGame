import assert from 'node:assert/strict';
import {createHouseController} from '../Games/Capital Drive/house-controller.js';
import {createBurglary} from '../Games/Capital Drive/burglary.js';
import {createInteriorActivities} from '../Games/Capital Drive/interior-activities.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
const home={id:'house-home',type:'house',name:'Fixture',x:0,z:0,yaw:0},target={...home,id:'house-target'};
const activities=createInteriorActivities(),burglary=createBurglary({canApproach:()=>true});
let controller,plan=null,saves=0,healed=0;
const progression=createProgression({spawn:{x:0,z:0},storyHomes:{basement:{roomId:'house-home'}}},null,{
  homes:[home,target],takeSafehouseRest:(...args)=>controller.takeRestReceipt(...args),takeHouseLoot:(...args)=>burglary.takeHouseLoot(...args)});
controller=createHouseController({burglary,activities,progression,getPlan:()=>plan,save:()=>saves++,heal:value=>healed+=value});
const exterior={pose:{x:0,z:0},onFoot:true,health:60,vehicleHealth:100,wanted:0,respawnSerial:0,sandbox:false};
const inside=id=>({...exterior,interior:{roomId:id},planId:id});
const station=(id,kind)=>({id,kind,x:0,z:0,radius:1.35});
function rest(id){
  plan={id,type:'house',activities:[station(`${id}-rest`,'rest')]};activities.load(plan);
  const ctx=inside(id);assert(activities.start(`${id}-rest`,ctx));activities.step(.1,{},ctx);activities.step(.1,{x:true},ctx);
  for(let i=0;i<31;i++)activities.step(.1,{x:true},ctx);
  return {event:activities.drainEvents().find(e=>e.type==='complete'),ctx};
}
let {event,ctx}=rest('house-home');assert(event);
const cash=progression.state.cash;
for(const bad of [{...event,sessionId:event.sessionId+1},{...event,outcome:'healed'},{...event,stationId:'other'}]){
  assert.equal(controller.recordActivity(bad,ctx).ok,undefined);assert.equal(progression.state.cash,cash);
}
assert.equal(controller.recordActivity(event,{...ctx,sandbox:true}).ok,undefined);
assert(controller.recordActivity(event,ctx).ok);assert.equal(progression.state.cash,cash-80);assert.equal(healed,100);assert.equal(saves,1);
controller.reset();assert.equal(controller.recordActivity(event,ctx).ok,undefined,'reset cannot replay old terminal');
assert.equal(controller.takeRestReceipt('house-home',ctx),null);
({event,ctx}=rest('house-target'));assert.equal(controller.recordActivity(event,ctx).ok,undefined,'unowned bed cannot heal');
assert.equal(healed,100);
({event,ctx}=rest('house-home'));progression.state.cash=0;
assert.equal(controller.recordActivity(event,ctx).ok,false);assert.equal(saves,1);assert.equal(healed,100);
progression.state.cash=500;
assert(burglary.start(target,exterior));
for(let i=0;i<6;i++){burglary.step(.4,{},exterior);burglary.step(.01,{[burglary.snapshot().expectedKey]:true},exterior);}
assert(burglary.consumeEntry('house-target',exterior));
plan={id:'house-target',type:'house',activities:[station('house-target-valuables','stock')]};assert(burglary.entered(plan));activities.load(plan);ctx=inside('house-target');
assert(activities.start('house-target-valuables',ctx));activities.step(3.6,{},ctx);
for(const key of ['x','up','y','x']){activities.step(.01,{[key]:true},ctx);activities.step(.01,{},ctx);}
event=activities.drainEvents().find(e=>e.type==='complete');assert(event);
assert(controller.recordActivity(event,ctx).handled);assert.equal(progression.state.cash,500,'search carries loot without payment');
assert.equal(controller.recordActivity(event,ctx).handled,false,'stock replay is not another search');
plan=null;
assert(controller.afterExit('house-target',exterior).ok);assert(progression.state.cash>500);assert.equal(saves,2);
assert.equal(controller.afterExit('house-target',exterior).handled,false);assert.equal(saves,2);
console.log('Capital house controller actual-owner rest receipts, no replay/failed heal, carried search and physical-exit bank passed');
