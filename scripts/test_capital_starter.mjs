import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
const map={spawn:{x:0,z:0}},ctx={pose:{x:0,z:0},onFoot:false,vehicle:{modelId:'lantern',stolen:false},wanted:0,vehicleHealth:0,respawnSerial:0};
const saved={version:1,cash:25,ownedVehicles:[{id:'lantern',color:'#123456',health:0,stored:true},{id:'orchard',color:'#abcdef',health:0,stored:true}],completedJobs:[]};
const p=createProgression(map,saved),r=p.prepareStarterVehicle(ctx);
assert(r.ok&&r.assisted);assert.equal(r.vehicle.health,35);assert.equal(r.vehicle.color,'#123456');assert.equal(r.vehicle.stored,false);
assert.equal(p.state.cash,25);assert.equal(p.state.ownedVehicles[1].health,0,'other wrecks still require repair');
assert.equal(p.state.ownedVehicles[1].stored,true);assert.deepEqual(p.state.completedJobs,[]);
assert.equal(p.prepareStarterVehicle(ctx).assisted,false,'assistance is not repeatedly applied to a working car');
assert.equal(p.drainEvents().filter(e=>e.type==='roadside-repair').length,1);
const restored=createProgression(map,p.serialize());assert.equal(restored.state.ownedVehicles[0].health,35);
for(const health of [1,35,80,100]){
  const career=createProgression(map,{...saved,ownedVehicles:[{...saved.ownedVehicles[0],health}]});
  const before=career.serialize();assert.equal(career.prepareStarterVehicle(ctx).assisted,false);assert.deepEqual(career.serialize(),before,'working condition is retained');
}
for(const extra of [{sandbox:true},{recovering:true},{pose:{x:NaN,z:0}}]){
  const career=createProgression(map,saved),before=career.serialize();assert.equal(career.prepareStarterVehicle({...ctx,...extra}).ok,false);assert.deepEqual(career.serialize(),before);
}
assert.throws(()=>createProgression(map,{...saved,ownedVehicles:[{...saved.ownedVehicles[0],health:NaN}]}));
console.log('PASS starter roadside repair: saved wreck becomes driveable once, healthy condition/paint/cash/jobs/other stored wrecks retained, strict reload and sandbox/recovery denial');
