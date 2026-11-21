import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createDrone} from '../Games/Capital Drive/drone.js';
import {createOrdnance,ORDNANCE_LIMITS} from '../Games/Capital Drive/ordnance.js';

const dealer={id:'strike-dealer',name:'Equipment',road:'Test road',type:'arms',dealer:true,fictional:true,x:20,z:20,radius:4};
const map={spawn:{x:0,z:0}},options={extraServices:[dealer]},ctx={pose:{x:20,z:20},onFoot:true,health:100,wanted:0,vehicleHealth:100,respawnSerial:0};
const career=createProgression(map,null,options);career.state.cash=200900;
assert.equal(career.buyDroneStrike(ctx).ok,false,'base drone required');
assert(career.buyDrone(ctx).ok);assert.equal(career.state.cash,200000);
for(const patch of [{sandbox:true},{recovering:true},{onFoot:false},{mission:true},{preview:true},{pose:{x:200,z:200}}]){
  assert.equal(career.buyDroneStrike({...ctx,...patch}).ok,false);
  assert.equal(career.state.cash,200000);
}
career.state.cash=99999;assert.equal(career.buyDroneStrike(ctx).ok,false);
career.state.cash=200000;
assert(career.buyDroneStrike(ctx).ok);assert.equal(career.state.cash,100000);
assert.equal(career.state.gear.droneStrike,true);
assert.equal(career.buyDroneStrike(ctx).ok,false);assert.equal(career.state.cash,100000,'upgrade debited once');
const saved=career.serialize();assert.equal(createProgression(map,saved,options).state.gear.droneStrike,true);
for(const value of [1,'true',null]){
  const bad=structuredClone(saved);bad.gear.droneStrike=value;
  assert.throws(()=>createProgression(map,bad,options),/gear/);
}
const orphan=structuredClone(saved);delete orphan.gear.drone;
assert.throws(()=>createProgression(map,orphan,options),/gear/);
const legacy=structuredClone(saved);delete legacy.gear.droneStrike;
assert.equal(createProgression(map,legacy,options).state.gear.droneStrike,undefined,'v1 saves remain valid');

const body={mode:'foot',health:100,actor:{x:0,z:0,yaw:0}};
let clear=true;
const drone=createDrone({heightAt:()=>4,canOccupy:()=>clear}),permission={owned:true,upgraded:true};
assert.equal(drone.strike(body,permission).ok,false,'requires actual flight');
assert(drone.deploy(body,{owned:true}));
for(const patch of [{owned:false},{upgraded:false},{sandbox:true},{blocked:true},{paused:true},{interiorId:'room'}]){
  assert.equal(drone.strike(body,{...permission,...patch}).ok,false);
  assert.equal(drone.snapshot().strikeCooldown,0);
}
clear=false;assert.equal(drone.strike(body,permission).ok,false,'solid cover rejects ground strike');clear=true;
const first=drone.strike(body,permission);assert(first.ok);assert.equal(first.event.radius,8);assert.equal(first.event.maxDamage,100);
assert.equal(first.event.y,4.25);assert.equal(first.event.x,drone.snapshot().x);assert.equal(first.event.z,drone.snapshot().z);
assert(Object.isFrozen(first.event));assert.equal(drone.snapshot().strikeCooldown,30);
assert.equal(drone.strike(body,permission).ok,false,'repeated inputs cannot duplicate blast');
drone.recall();assert(drone.deploy(body,{owned:true}));assert.equal(drone.strike(body,permission).ok,false,'relaunch does not bypass cooldown');
drone.step(30,{body,paused:true});assert.equal(drone.snapshot().strikeCooldown,30);
drone.recall();drone.step(29,{body});assert.equal(drone.snapshot().strikeCooldown,1);
drone.step(1,{body});assert(drone.deploy(body,{owned:true}));
const second=drone.strike(body,permission);assert(second.ok);assert.notEqual(first.event.id,second.event.id);
assert.deepEqual(body,{mode:'foot',health:100,actor:{x:0,z:0,yaw:0}},'flight ability does not move or heal body');
const visual=createOrdnance();
for(let i=0;i<12;i++)assert(visual.showExplosion({...first.event,id:'visual:'+i}));
assert.equal(visual.snapshot().bursts.length,ORDNANCE_LIMITS.bursts);
assert.equal(visual.drainEvents().length,0,'visual adapter never emits a second damage event');
visual.step(.25);visual.step(.25);visual.step(.25);assert.equal(visual.snapshot().bursts.length,0);
assert.equal(visual.showExplosion({...first.event,x:NaN}),false);
drone.dispose();assert.equal(drone.strike(body,permission).ok,false);
console.log('PASS drone strike: exact $100,000 once, owned-drone/dealer/commerce gates, strict optional v1 gear, checked outdoor ground, body isolation, pause/recall-safe cooldown and reused four-burst visual pool without duplicate damage');
