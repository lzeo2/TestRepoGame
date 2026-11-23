import assert from 'node:assert/strict';
import {createSkylineJob,SKYLINE_JOB_ID} from '../Games/Capital Drive/skyline-job.js';

const make=()=>createSkylineJob({site:{x:700,z:-900,yaw:.31,groundY:12},groundHeightAt:()=>12});
const ctxAt=point=>({player:{...point},onFoot:true});
const tick=(job,seconds,ctx,input)=>{for(let t=0;t<seconds-1e-8;t+=.1)job.step(Math.min(.1,seconds-t),ctx,input);};
const job=make();
assert.equal(job.snapshot().stage,'idle');assert.equal(SKYLINE_JOB_ID,'skyline-retrieval');
assert(Object.isFrozen(job.layout));assert(Object.isFrozen(job.layout.searches));
assert.equal(job.snapshot(),job.snapshot(),'idle snapshots reuse immutable data');
assert(job.start().ok);assert(!job.start().ok,'cannot replace an active attempt');
const firstMission=job.snapshot().missionId;
const still=job.snapshot();job.step(20,{paused:true},{deploy:true});assert.equal(job.snapshot(),still,'pause suspends controls and timers');
for(const dt of [0,-1,NaN,Infinity])job.step(dt,{},{});
assert.equal(job.snapshot(),still,'invalid/zero dt cannot advance the job');
job.step(.1,{}, {steerX:1,steerZ:1});
assert(Math.abs(Math.hypot(job.snapshot().pose.x-still.pose.x,job.snapshot().pose.z-still.pose.z)-.9)<1e-8,'diagonal steering is normalized');
job.step(.1,{}, {deploy:true});assert.equal(job.snapshot().stage,'parachute');
assert(job.snapshot().pose.parachute);
for(let i=0;i<1300&&job.snapshot().stage==='parachute';i++)job.step(.1,{},{});
assert.equal(job.snapshot().stage,'landing');
assert.equal(job.snapshot().pose.y,12);
assert(job.drainEvents().some(e=>e.type==='landed'));
let ctx=ctxAt(job.layout.landing);
job.step(.1,ctx);assert.equal(job.snapshot().stage,'approach');
assert(!job.interact(ctxAt(job.layout.safe)).ok,'safe cannot skip search/encounters');
let stale=null;
for(let leg=0;leg<3;leg++){
  ctx=ctxAt(job.layout.searches[leg]);job.step(.1,ctx);
  let s=job.snapshot();assert.equal(s.stage,'encounter');assert.equal(s.enemies.length,4);
  assert(s.enemies.every(e=>e.missionId===firstMission&&e.encounterId===s.encounterId&&e.health>0));
  const receipts=s.enemies.map((e,i)=>({type:'defeated',missionId:s.missionId,targetId:e.targetId,encounterId:s.encounterId,serial:i+1,outcome:'killed'}));
  job.step(.1,{...ctx,enemyOutcomes:receipts.map(r=>({...r,missionId:'another-attempt'}))});
  assert.equal(job.snapshot().defeated.length,0,'wrong attempt receipts cannot clear a wave');
  job.step(.1,{...ctx,enemyOutcomes:receipts.map(r=>({...r,encounterId:'other-wave'}))});
  assert.equal(job.snapshot().defeated.length,0,'wrong encounter receipts are rejected');
  job.step(.1,{...ctx,enemyOutcomes:receipts.map(r=>({...r,outcome:'surrender'}))});
  assert.equal(job.snapshot().defeated.length,0,'non-defeat outcomes cannot clear a wave');
  if(stale){job.step(.1,{...ctx,enemyOutcomes:stale});assert.equal(job.snapshot().defeated.length,0,'previous-wave receipts do not transfer');}
  job.step(.1,{...ctx,enemyOutcomes:[receipts[0],receipts[0]]});
  assert.equal(job.snapshot().defeated.length,1,'duplicate events count once per actual actor');
  assert(!job.interact(ctx).ok,'alive wave blocks cache search');
  job.step(.1,{...ctx,enemyOutcomes:receipts});assert.equal(job.snapshot().stage,'search');
  assert(!job.interact(ctxAt(job.layout.safe)).ok,'cache search requires the physical station');
  assert(!job.interact({...ctx,onFoot:false}).ok,'cache search requires walking');
  assert(job.interact(ctx).ok);stale=receipts;
}
assert.equal(job.snapshot().stage,'safe-approach');
ctx=ctxAt(job.layout.safe);
assert(job.interact(ctx).ok);assert.equal(job.snapshot().stage,'safe');
assert(Object.isFrozen(job.snapshot().safe.sequence));
assert(!job.symbol('x',{...ctx,paused:true}).ok);
const sequence=job.snapshot().safe.sequence;
const wrong=['x','up','y'].find(x=>x!==sequence[0]);
assert(!job.symbol(wrong,ctx).ok);assert.equal(job.snapshot().safe.mistakes,1);
tick(job,11,ctx);assert(job.snapshot().safe.mistakes>=2,'visible safe row expires from supplied time');
assert.equal(job.snapshot().safe.index,0);
job.step(.1,ctxAt(job.layout.searches[0]));assert.equal(job.snapshot().stage,'safe-approach','leaving the panel suspends its challenge');
assert(job.interact(ctx).ok);
while(job.snapshot().stage==='safe'){
  const s=job.snapshot();assert(s.safe.remaining>0);assert(job.symbol(s.safe.sequence[s.safe.index],ctx).ok);
}
assert.equal(job.snapshot().stage,'loot');assert(!job.snapshot().lootCollected);
assert(!job.interact(ctxAt(job.layout.helipad)).ok,'opening the safe is not a remote loot pickup');
assert(job.interact(ctxAt(job.layout.loot)).ok);
assert(job.snapshot().lootCollected);assert.equal(job.snapshot().stage,'boss');
const boss=job.snapshot().enemies[0];assert(boss.boss&&boss.health>100);
assert(!job.interact(ctxAt(job.layout.helipad)).ok,'boss blocks extraction boarding');
job.step(.1,{...ctxAt(boss),enemyOutcomes:[{type:'defeated',missionId:firstMission,targetId:boss.id,serial:33,outcome:'killed'}]});
assert.equal(job.snapshot().stage,'helipad');
const e={...job.layout.helipad,vehicleId:job.snapshot().extraction.vehicleId,active:true,boarded:false,pilotControlled:true,speed:0};
ctx={...ctxAt(job.layout.helipad),extraction:e};
assert(!job.interact({...ctx,extraction:{...e,vehicleId:'other-helicopter'}}).ok,'wrong aircraft cannot board');
assert(!job.interact({...ctx,extraction:{...e,active:false}}).ok,'inactive aircraft cannot board');
assert(job.interact(ctx).ok);assert.equal(job.snapshot().stage,'boarding');
job.step(.1,ctx);assert.equal(job.snapshot().stage,'boarding','request alone is not confirmed boarding');
e.boarded=true;job.step(.1,ctx);assert.equal(job.snapshot().stage,'flight');
e.y+=80;e.speed=50;
tick(job,5,ctx);assert.equal(job.snapshot().extraction.controlledSeconds,0,'stationary fake speed cannot satisfy controlled flight');
// Real supplied positions advance continuously along the marked route. The
// aircraft controller remains responsible for producing these motion samples.
for(const target of job.layout.airRoute){
  let guard=0;
  while(Math.hypot(target.x-e.x,target.z-e.z)>1&&guard++<1000){
    const d=Math.hypot(target.x-e.x,target.z-e.z),step=Math.min(d,5);
    e.x+=(target.x-e.x)/d*step;e.z+=(target.z-e.z)/d*step;
    job.step(.1,ctx);
  }
  assert(guard<1000);
}
assert.equal(job.snapshot().stage,'complete');
assert(job.snapshot().extraction.controlledSeconds>=45);assert(job.snapshot().extraction.distance>=1500);
let events=job.drainEvents();assert.equal(events.filter(e=>e.type==='complete').length,1);
assert.equal(events.find(e=>e.type==='complete').reward,job.layout.reward);
job.step(.1,ctx);assert.equal(job.drainEvents().length,0,'completed reward receipt is emitted once');
assert(job.start().ok);assert.notEqual(job.snapshot().missionId,firstMission);assert(!job.snapshot().lootCollected);
assert(job.cancel());assert.equal(job.snapshot().stage,'cancelled');assert(!job.cancel());
assert(job.start().ok);
for(let i=0;i<300&&job.snapshot().active;i++)job.step(.1,{},{});
assert.equal(job.snapshot().stage,'failed','uncontrolled drop cannot bypass parachute landing');
assert(job.start().ok);job.step(.1,{dead:true});assert.equal(job.snapshot().stage,'failed');
assert(job.start().ok);const beforeLarge=job.snapshot().pose.y;job.step(100,{});assert(Math.abs(job.snapshot().pose.y-beforeLarge)<9,'suspension cannot skip the airborne stage');
assert.throws(()=>createSkylineJob({site:{x:NaN,z:0}}),TypeError);
console.log('PASS Skyline retrieval: controlled drop/parachute, three receipt-bound waves/searches, timed visible safe, physical loot, boss, actual matching boarding, continuous controlled extraction, one completion receipt, pause/fail/cancel/repeat isolation');
