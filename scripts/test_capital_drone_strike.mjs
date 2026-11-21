import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createDrone} from '../Games/Capital Drive/drone.js';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createOrdnance,ORDNANCE_LIMITS,validExplosion} from '../Games/Capital Drive/ordnance.js';
import {createOrdnanceView} from '../Games/Capital Drive/ordnance-view.js';

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
for(const patch of [{owned:false},{upgraded:false},{paused:true},{interiorId:'room'}]){
  assert.equal(drone.strike(body,{...permission,...patch}).ok,false);
}
for(const invalid of [{...body,recovery:{}},{...body,health:0},{...body,passenger:true},{...body,mode:'vehicle'},{...body,actor:{...body.actor,impactTime:1}}])
  assert.equal(drone.strike(invalid,permission).ok,false);
clear=false;assert.equal(drone.strike(body,permission).ok,false,'solid cover rejects ground strike');clear=true;
const first=drone.strike(body,permission);assert(first.ok);assert.equal(first.event.radius,12);assert.equal(first.event.maxDamage,160);
assert.equal(first.event.y,4.25);assert.equal(first.event.x,drone.snapshot().x);assert.equal(first.event.z,drone.snapshot().z);
assert(Object.isFrozen(first.event));
assert(validExplosion(first.event));
for(const invalid of [{kind:'grenade'},{radius:13},{maxDamage:161},{interiorId:'room'}])assert.equal(validExplosion({...first.event,...invalid}),false);
let fanout=0;
const blastMap={...map,bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[],buildings:[],landmarks:[]};
const simulation=createSimulation(blastMap,{trafficCount:0});
const gameplay=createGameplay(blastMap,simulation,{sandbox:true,onVehicleExplosion:()=>fanout++});
gameplay.state.police.push({x:first.event.x+10,z:first.event.z,health:100},{x:first.event.x+12,z:first.event.z,health:100},
  {x:first.event.x+1,z:first.event.z,health:100});
assert(gameplay.applyExplosion(first.event));
assert.equal(fanout,1);
assert(Math.abs(gameplay.state.police[0].health-(100-160/6))<1e-9,'the outer band damages targets beyond grenade reach');
assert.equal(gameplay.state.police[1].health,100,'the radius edge takes no damage');
assert.equal(gameplay.state.police[2].health,0,'the peak damage destroys nearby full-health targets');
const second=drone.strike(body,permission);assert(second.ok,'a fresh strike needs no elapsed time');
assert.notEqual(first.event.id,second.event.id);
drone.recall();assert.equal(drone.strike(body,permission).ok,false);
assert(drone.deploy(body,{owned:true,sandbox:true}));
assert(drone.strike(body,{...permission,sandbox:true}).ok,'Free roam permits an owned strike');
assert.deepEqual(body,{mode:'foot',health:100,actor:{x:0,z:0,yaw:0}},'flight ability does not move or heal body');
const visual=createOrdnance();
for(let i=0;i<12;i++)assert(visual.showExplosion({...first.event,id:'visual:'+i}));
assert.equal(visual.snapshot().bursts.length,ORDNANCE_LIMITS.bursts);
assert.equal(visual.drainEvents().length,0,'visual adapter never emits a second damage event');
const scene=new THREE.Scene(),view=createOrdnanceView(scene),burst=visual.snapshot().bursts[0];
const matrix=new THREE.Matrix4(),size=new THREE.Vector3();
const readSize=effect=>{
  view.update({bursts:[effect]},first.event);scene.children[0].children[3].getMatrixAt(0,matrix);
  return size.setFromMatrixScale(matrix).x;
};
const grenadeSize=readSize({...burst,kind:'grenade',radius:8}),strikeSize=readSize(burst);
assert(Math.abs(strikeSize/grenadeSize-1.5)<1e-6,'drone explosion draws proportionately larger');
assert.equal(view.stats.drawCalls,2,'larger effects keep the same burst and spark batches');
view.dispose();
visual.step(.25);visual.step(.25);visual.step(.25);assert.equal(visual.snapshot().bursts.length,0);
assert.equal(visual.showExplosion({...first.event,x:NaN}),false);
drone.dispose();assert.equal(drone.strike(body,permission).ok,false);
console.log('PASS drone strike: exact $100,000 once, owned-drone/dealer/commerce gates, strict optional v1 gear, checked outdoor ground, immediate repeat strikes, 12m/160 damage and proportional pooled effects');
