import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { blocked, clearPath, nearPath } from '../Games/Slipstream Borough/world.js';
// Neutral stays stationary; held Brake now deliberately reverses city cars.
const stop={steer:0,throttle:0,brake:0}, drive={steer:0,throttle:1,brake:0};
const fresh=()=>core.startRun(core.freshProfile(),'roam');
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const step=(r,input=stop,dt=.05)=>core.stepRun(r,input,dt);
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
// Synthetic source fixtures only: no browser, earned upgrade, or native traffic acceptance claim.
check('four independent spawn poses / frozen transactions / park once',()=>{
  const p=freeze(core.freshProfile()),a=core.startRun(p,'roam'),b=core.startRun(p,'roam');
  assert.deepEqual(a,b);assert.equal(a.run.traffic.length,4);
  const worlds=[a.run.world,...a.run.traffic.map(e=>e.world)];assert.equal(new Set(worlds).size,5);
  for(const e of a.run.traffic){
    assert(gap(e.world,a.run.world)>=12);assert(!blocked(e.world.x,e.world.z));assert(e.speed>0);
    assert.deepEqual(Object.keys(e).sort(),['id','carId','x','distance','speed','passed','hit','finishTime','world'].sort());
  }
  const saved=structuredClone(a.run),next=step(freeze(a.run));assert.deepEqual(a.run,saved);
  assert.notEqual(next.world,a.run.world);
  next.traffic.forEach((e,i)=>assert.notEqual(e.world,a.run.traffic[i].world));
  const zero=step(next,stop,0);zero.traffic[0].world.x++;assert.notEqual(zero.traffic[0].world.x,next.traffic[0].world.x);
  const parked=core.parkRun(next),banked=core.settleRun(a.profile,parked);
  assert.equal(parked.earnings,0);assert.equal(banked.cash,0);assert.equal(banked.careerDistance,0);
  assert.throws(()=>core.parkRun(parked));assert.throws(()=>core.settleRun(banked,parked));
  assert.deepEqual(step(parked),parked);assert.notEqual(parked.traffic[0].world,next.traffic[0].world);
});
check('230 seconds copied deterministic loops / sweep clearance / heading / spacing',()=>{
  let a=fresh().run,b=structuredClone(a),yielded=false;const initial=structuredClone(a);
  for(let tick=0;tick<4600;tick++){
    const previous=a;a=step(a);b=step(b);assert.deepEqual(a,b);assert.equal(a.traffic.length,4);
    for(const [i,e] of a.traffic.entries()){
      const old=previous.traffic[i],travel=gap(e.world,old.world);
      assert(clearPath(old.world,e.world));assert(!blocked(e.world.x,e.world.z));
      assert(travel<=11*.05+1e-8);assert(Math.abs(e.distance-old.distance-travel)<1e-8);
      assert(Number.isFinite(e.speed)&&e.speed>=0&&e.speed<=11);assert(e.distance>=old.distance);
      if(travel>1e-8){assert(Math.abs((e.world.x-old.world.x)/travel+Math.sin(e.world.heading))<1e-7);assert(Math.abs((e.world.z-old.world.z)/travel+Math.cos(e.world.heading))<1e-7);}
      else yielded=true;
      for(const other of a.traffic)if(other!==e)assert(gap(e.world,other.world)>=6-1e-8);
    }
    assert.equal(a.nearMisses,0);assert.equal(a.earnings,0);assert.equal(a.hp,100);
  }
  assert(yielded);assert(a.traffic.every(e=>e.distance>1200));assert.equal(a.distance,0);
  assert.deepEqual(initial,fresh().run);assert.equal(a.status,'running');
});
check('stopped obstruction yields / resumes / no building shortcut or border wrap',()=>{
  let r=fresh().run;r.world={x:-50,z:44,heading:0};
  const before=structuredClone(r.traffic[0].world);r=step(r);assert.deepEqual(r.traffic[0].world,before);assert.equal(r.traffic[0].speed,0);
  r.world={x:0,z:0,heading:0};const resumed=step(r);assert(resumed.traffic[0].speed>0);assert(gap(resumed.traffic[0].world,before)>0);
  const blockedRoute=fresh().run;blockedRoute.traffic[0].world={x:50,z:0,heading:0};
  assert(!clearPath(blockedRoute.traffic[0].world,{x:-50,z:-50}));
  const safe=step(blockedRoute);assert(gap(safe.traffic[0].world,blockedRoute.traffic[0].world)<=.4+1e-8);assert(!blocked(safe.traffic[0].world.x,safe.traffic[0].world.z));
  assert(nearPath({x:0,z:0},{x:0,z:-20},{x:0,z:-10},4));
  assert(!nearPath({x:0,z:0},{x:0,z:-20},{x:5,z:-10},4));
});
check('ordinary step player contact / cooldown / armor / passing pays nothing',()=>{
  function contact(profile){const r=core.startRun(profile,'roam').run;r.world={x:-50,z:55,heading:0};r.speed=25;return step(r,drive);}
  const hit=contact(core.freshProfile());assert(hit.hp<100);assert.equal(hit.collisions,1);assert(hit.traffic[0].hit);
  assert.equal(hit.distance,0);assert.equal(hit.earnings,0);assert.equal(hit.nearMisses,0);
  assert.equal(step(hit,drive).hp,hit.hp);
  const armored=core.upgradeCar({...core.freshProfile(),cash:250},'bricklet','armor');assert(contact(armored).hp>hit.hp);
  let held=hit;held.world={...held.traffic[0].world};held.speed=0;
  for(let i=0;i<25;i++)held=step(held);assert.equal(held.collisions,2);assert.equal(held.earnings,0);assert.equal(held.nearMisses,0);
  let pass=fresh().run;pass.world={x:-45,z:55,heading:0};pass.speed=20;
  for(let i=0;i<30;i++)pass=step(pass,drive);assert.equal(pass.hp,100);assert.equal(pass.nearMisses,0);assert.equal(pass.earnings,0);
});
check('city traffic validation / descriptors never invoked / copied cop poses',()=>{
  let calls=0;
  for(const target of ['entity','world','coordinate','array']){
    const r=fresh().run,get=()=>{calls++;return 0;};
    if(target==='entity')Object.defineProperty(r.traffic[0],'speed',{get});
    if(target==='world')Object.defineProperty(r.traffic[0],'world',{get});
    if(target==='coordinate')Object.defineProperty(r.traffic[0].world,'heading',{get});
    if(target==='array')Object.defineProperty(r.traffic,0,{get});
    assert.throws(()=>step(r));
  }
  assert.equal(calls,0);
  for(const mutate of [
    r=>r.traffic.push({...structuredClone(r.traffic[0]),id:r.nextEntity++}),
    r=>r.traffic[1].id=r.traffic[0].id,
    r=>r.rivals.push(structuredClone(r.traffic[0])),
    r=>delete r.traffic[0].hit,
    r=>r.traffic[0].world.extra=1,
    r=>r.traffic[0].world.heading=Infinity,
    r=>r.traffic[0].world.x=164,
    r=>r.traffic[0].world={x:25,z:25,heading:0},
    r=>r.traffic[0].speed=12,
    r=>r.traffic[0].distance=-1,
    r=>{r.nearMisses=1;r.score=100;}
  ]){const r=fresh().run;mutate(r);assert.throws(()=>step(r));}
  let chased=fresh().run;Object.assign(chased,{elapsed:20,distance:30,score:60});chased=step(chased);
  const saved=structuredClone(chased),copy=step(freeze(chased));assert.deepEqual(chased,saved);
  assert.notEqual(copy.police[0].world,chased.police[0].world);
  assert.equal(new Set([copy.world,...copy.traffic.map(e=>e.world),...copy.police.map(e=>e.world)]).size,6);
});
console.log(`PASS ${checks} Slipstream traffic groups; synthetic source only, native acceptance held.`);
