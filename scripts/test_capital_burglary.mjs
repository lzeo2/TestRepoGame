import assert from 'node:assert/strict';
import { createBurglary } from '../Games/Capital Drive/burglary.js';
import { createVehicleChallenge } from '../Games/Capital Drive/vehicle-challenges.js';
const house={id:'house-1',type:'house',x:0,z:0};
const outside={pose:{x:0,z:1},onFoot:true,health:100,sandbox:false};
const burglary=createBurglary({canApproach:()=>true});
assert.equal(createBurglary().start(house,outside),false,'physical approach callback required');
for(const entry of [{...house,type:'shop'},{...house,owned:true},{...house,safehouse:true}])assert.equal(burglary.start(entry,outside),false);
for(const change of [{sandbox:true},{onFoot:false},{health:0},{recovering:true},{interiorId:'room'},{mission:{}},{pose:{x:10,z:0}},{paused:true}])assert.equal(burglary.start(house,{...outside,...change}),false);
assert(burglary.start(house,outside));
assert.equal(burglary.snapshot().sequence.length,6);
assert.equal(burglary.snapshot().style,'rhythm');
assert(Math.abs(burglary.snapshot().cueWindow-1.16)<1e-8);
assert.equal(burglary.snapshot().remaining,24);
assert.equal(burglary.snapshot().maxMistakes,2);
assert.match(burglary.snapshot().prompt,/HOUSE LOCK/);
burglary.step(5,{}, {...outside,paused:true});assert.equal(burglary.snapshot().remaining,24);
assert.equal(burglary.consumeEntry(house.id,outside),null,'no click permit');
function solve(owner) {
  for(let i=0;i<6;i++) {
    owner.step(.4,{},outside);
    assert.equal(owner.snapshot().phase,'cue');
    owner.step(.01,{[owner.snapshot().expectedKey]:true},outside);
  }
}
solve(burglary);
assert.match(burglary.snapshot().prompt,/House lock bypassed/);
assert.equal(burglary.consumeEntry(house.id,{...outside,pose:{x:20,z:0}}),null);
const permit=burglary.consumeEntry(house.id,outside);assert(Object.isFrozen(permit));
assert.equal(burglary.consumeEntry(house.id,outside),null,'entry permit once');
assert.equal(burglary.entered({id:'other',type:'house'}),false);
const station={id:'house-1-valuables',kind:'stock',x:2,z:3,radius:1.8};
const plan={id:house.id,type:'house',activities:[station]};
assert(burglary.entered(plan));
const inside={...outside,pose:{x:2,z:3},planId:house.id};
const event={type:'complete',kind:'stock',planId:house.id,sessionId:7,id:station.id,station,sandbox:false};
const terminal={phase:'complete',kind:'stock',planId:house.id,sessionId:7,station,sandbox:false};
for(const bad of [{...event,type:'cancel'},{...event,planId:'other'},{...event,sessionId:8},{...event,id:'ledger'}])assert.equal(burglary.recordLoot(bad,terminal,inside),false);
assert.equal(burglary.recordLoot(event,{...terminal,phase:'recipe'},inside),false);
assert.equal(burglary.recordLoot(event,terminal,{...inside,pose:{x:20,z:0}}),false);
assert.equal(burglary.recordLoot(event,terminal,{...inside,sandbox:true}),false);
assert(burglary.recordLoot(event,terminal,inside));
assert.equal(burglary.recordLoot(event,terminal,inside),false,'event replay rejected');
assert.equal(burglary.takeHouseLoot(house.id,inside),null,'carried loot cannot pay indoors');
assert.equal(burglary.takeHouseLoot(house.id,outside),null,'exit must be verified');
assert(burglary.exited(house.id,outside));
const receipt=burglary.takeHouseLoot(house.id,outside);assert.deepEqual(receipt,{roomId:house.id,serial:1,outcome:'looted',count:1,exited:true});assert(Object.isFrozen(receipt));
assert.equal(burglary.takeHouseLoot(house.id,inside),null);
assert.equal(burglary.recordLoot(event,terminal,inside),false,'consumption does not permit replay');
burglary.leave();assert.equal(burglary.recordLoot({...event,sessionId:9},{...terminal,sessionId:9},inside),false);
assert(burglary.start(house,outside));burglary.step(.1,{}, {...outside,onFoot:false});assert.equal(burglary.snapshot().phase,'cancelled');
const challenge=createVehicleChallenge();
for(const [kind,count,cue] of [['car',8,1],['scooter',4,1.4]]) {challenge.clear();assert(challenge.start(kind,{targetId:'v',anchor:{x:0,z:0},sandbox:false}));assert.equal(challenge.snapshot().sequence.length,count);assert.equal(challenge.snapshot().cueWindow,cue);}
console.log('Capital burglary physical admission, lock timing, one-entry permit and stock receipt validation passed');

// The production activities owner retains increasing IDs across room loads.
// Explore 100 houses, leave most receipts unclaimed, and replay an old terminal.
const exploration=createBurglary({canApproach:()=>true});
function enterFixture(id) {
  assert(exploration.start({...house,id},outside));solve(exploration);
  assert(exploration.consumeEntry(id,outside));
  const station={id:`${id}-valuables`,kind:'stock',x:2,z:3,radius:1.8};
  assert(exploration.entered({id,type:'house',activities:[station]}));
  return {station,ctx:{...inside,planId:id}};
}
let firstCompletion;
for(let i=0;i<100;i++) {
  const id=`house-exploration-${i}`,{station,ctx}=enterFixture(id);
  const event={type:'complete',kind:'stock',planId:id,sessionId:i+1,id:station.id,station,sandbox:false};
  const terminal={...event,phase:'complete'};
  assert(exploration.recordLoot(event,terminal,ctx));
  assert.equal(exploration.snapshot().pendingLootRoomId,id);
  if(!i)firstCompletion={event,terminal};
  if(i===99){assert(exploration.exited(id,outside));assert.equal(exploration.takeHouseLoot(id,outside).serial,100,'receipt numbering survives room cleanup');}
  exploration.leave();assert.equal(exploration.snapshot().pendingLootRoomId,null,'leaving discards unclaimed transient loot');
  assert.equal(exploration.takeHouseLoot(id,ctx),null);
}
const again=enterFixture('house-exploration-0');
assert.equal(exploration.recordLoot(firstCompletion.event,firstCompletion.terminal,again.ctx),false,'old terminal stays rejected after 100 other rooms');
assert(exploration.drainEvents().length<=32,'undrained diagnostics remain bounded');
console.log('Capital burglary 100-house transient cleanup and cross-room old-session replay checks passed');
