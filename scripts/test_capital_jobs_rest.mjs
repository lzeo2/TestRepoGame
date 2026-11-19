import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
const map={spawn:{x:0,z:0},buildings:[]};
const ctx=(pose,extra={})=>({pose:{...pose,speed:0},onFoot:false,health:70,vehicleHealth:100,vehicle:{modelId:'lantern',stolen:false},wanted:5,respawnSerial:0,...extra});
const p=createProgression(map);
for(const id of ['food-round','urgent-medical']){
 const job=p.jobs.find(item=>item.id===id),cash=p.state.cash;
 assert(p.startJob(id,ctx(job.stages[0])).ok);
 p.update(10,ctx(job.stages[0],{pose:{...job.stages[0],speed:12}}));assert.equal(p.state.activeJob.stage,0);
 p.update(10,ctx(job.stages[0]));assert.equal(p.state.activeJob.stage,0,'long frame cannot grant a stop');
 p.update(.1,ctx(job.stages[0],{vehicleHealth:0}));assert.equal(p.state.activeJob.stopTime,0);
 for(let index=0;index<job.stages.length;index++){
  const target=job.stages[index];
  for(let step=0;step<15;step++)p.update(.1,ctx(target));
  if(index<job.stages.length-1)assert.equal(p.state.activeJob.stage,index+1);
 }
 assert.equal(p.state.activeJob,null);assert.equal(p.state.cash,cash+job.reward);
 p.update(20,ctx(job.stages.at(-1)));assert.equal(p.state.cash,cash+job.reward);
}
const home={id:'house-test',type:'house',name:'House',x:0,z:0,yaw:0};let serial=1;
const rest=createProgression(map,null,{homes:[home],takeSafehouseRest:roomId=>Object.freeze({roomId,outcome:'rested',serial})});
rest.state.cash=20000;assert(rest.buyProperty(home.id,ctx(home,{onFoot:true})).ok);
const inside=ctx(home,{onFoot:true,interior:{roomId:home.id}}),cash=rest.state.cash;
assert.equal(rest.restSafehouse(home.id,{...inside,sandbox:true}).ok,false);
assert.equal(rest.restSafehouse(home.id,{...inside,interior:{roomId:'house-other'}}).ok,false);
assert.equal(rest.restSafehouse(home.id,{...inside,health:100}).ok,false);
const result=rest.restSafehouse(home.id,inside);assert(result.ok);assert.equal(result.heal,100);assert.equal(rest.state.cash,cash-80);
assert.equal(rest.restSafehouse(home.id,inside).ok,false);assert.equal(rest.state.cash,cash-80);
assert.deepEqual(createProgression(map,rest.serialize(),{homes:[home]}).serialize(),rest.serialize());
console.log('Capital delivery jobs/rest: stopped ordered multi-stop work, healthy vehicles, wanted admission, once-only rewards, matching rest receipts and v1 saves passed.');
