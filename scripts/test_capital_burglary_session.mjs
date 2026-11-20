import assert from 'node:assert/strict';
import {createBurglary} from '../Games/Capital Drive/burglary.js';
const outside={pose:{x:0,z:1},onFoot:true,health:100,sandbox:false,attackSerial:0};
const owner=createBurglary({canApproach:()=>true});
const stations=[0,1,2].map(i=>({id:`home-valuables${i?`-${i}`:''}`,kind:'stock',x:i,z:2,radius:1.8}));
function enter(){
  assert(owner.start({id:'home',type:'house',x:0,z:0},outside));
  for(let i=0;i<6;i++){owner.step(.4,{},outside);owner.step(.01,{[owner.snapshot().expectedKey]:true},outside);}
  assert(owner.consumeEntry('home',outside));
  assert(owner.entered({id:'home',type:'house',activities:stations}));owner.drainEvents();
}
function search(index,serial){
  const station=stations[index],ctx={...outside,planId:'home',pose:station};
  const event={type:'complete',kind:'stock',planId:'home',id:station.id,station,sessionId:serial,sandbox:false};
  return owner.recordLoot(event,{...event,phase:'complete'},ctx);
}
enter();
assert.equal(owner.snapshot().totalStations,3);
assert(search(0,1));assert.equal(search(0,2),false,'station only searched once');
assert(search(1,3));assert.equal(owner.snapshot().carriedLoot,2);
assert.equal(owner.takeHouseLoot('home',{...outside,planId:'home'}),null,'indoor search never pays');
assert.equal(owner.takeHouseLoot('home',outside),null,'exterior caller cannot bypass actual exit');
assert.equal(owner.exited('home',{...outside,pose:{x:20,z:0}}),false);
const ctx={...outside,planId:'home',sprinting:true};
owner.stepSession(.25,{...ctx,paused:true});assert.equal(owner.snapshot().alarm,0);
for(let i=0;i<240;i++)owner.stepSession(.25,{...ctx,attackSerial:1});
assert.equal(owner.snapshot().alarmed,true);
assert.equal(owner.drainEvents().filter(e=>e.type==='alarm').length,1);
owner.stepSession(.25,{...ctx,attackSerial:1});assert.equal(owner.drainEvents().length,0,'alarm once');
assert(owner.exited('home',outside));owner.leave();
const receipt=owner.takeHouseLoot('home',outside);
assert(Object.isFrozen(receipt));assert.equal(receipt.count,2);assert.equal(receipt.exited,true);
assert.equal(owner.takeHouseLoot('home',outside),null);
enter();assert.equal(search(2,1),false,'old terminal rejected after room reload');
assert(search(2,4));owner.leave();assert.equal(owner.takeHouseLoot('home',outside),null,'unexited carry is discarded');
enter();assert(search(1,5));owner.stepSession(.1,{...ctx,health:0});assert.equal(owner.snapshot().carriedLoot,0,'recovery loses transient carry');
console.log('Capital burglary multiple stations, carry/exit authority, noise/alarm and stale terminals passed');
