import assert from 'node:assert/strict';
import {createSkylineJob} from '../Games/Capital Drive/skyline-job.js';
import {createSkylinePressure} from '../Games/Capital Drive/skyline-pressure.js';

const tick=(pressure,seconds,snapshot,ctx)=>{for(let time=0;time<seconds-1e-8;time+=.1)pressure.step(Math.min(.1,seconds-time),snapshot,ctx);};
function wave(){
  const job=createSkylineJob({site:{x:700,z:-900,groundY:12},groundHeightAt:()=>12});job.start();
  for(let i=0;i<300&&['freefall','flare'].includes(job.snapshot().stage);i++){
    const p=job.snapshot().pose,t=job.layout.landing,dx=t.x-p.x,dz=t.z-p.z,d=Math.max(2.4,Math.hypot(dx,dz));job.step(.1,{}, {steerX:dx/d,steerZ:dz/d});
  }
  job.step(.1,{onFoot:true,player:job.layout.landing});
  const player={...job.layout.searches[0]},ctx={active:true,onFoot:true,player,health:100};job.step(.1,ctx);
  const first=job.snapshot();job.step(.1,{...ctx,enemyOutcomes:first.enemies.map((e,i)=>({type:'defeated',missionId:first.missionId,encounterId:first.encounterId,targetId:e.targetId,serial:i+1,outcome:'killed'}))});
  assert.equal(job.snapshot().stage,'search');assert(job.interact(ctx).ok);
  for(let i=0;i<40;i++)job.step(.1,ctx);
  const snapshot=job.snapshot();assert.equal(snapshot.encounterKind,'reinforcement');assert.equal(snapshot.stage,'encounter');
  return {job,snapshot,ctx};
}
const ray=drone=>({x:drone.x-10,y:drone.y,z:drone.z,dx:1,dy:0,dz:0,range:30,interiorId:null});
const f=wave(),p=createSkylinePressure();
for(const bad of [{...f.snapshot,active:false},{...f.snapshot,encounterKind:'initial'},{...f.snapshot,enemies:[]},{...f.snapshot,jobId:'other'}]){
  p.step(.1,bad,f.ctx);assert.equal(p.snapshot().active,false);assert.deepEqual(p.shotTargets(),[]);
}
tick(p,2,f.snapshot,f.ctx);let s=p.snapshot();assert(s.active&&s.drone.active&&s.strike.active);assert.equal(s.strike.remaining,5);
assert(Object.isFrozen(s)&&Object.isFrozen(s.drone)&&Object.isFrozen(s.strike));assert.equal(s,p.snapshot(),'immutable snapshots reuse their identity');
const target={x:s.strike.x,y:s.strike.y,z:s.strike.z};
tick(p,2,f.snapshot,{...f.ctx,player:{x:target.x+30,y:target.y,z:target.z+30}});
assert.deepEqual({x:p.snapshot().strike.x,y:p.snapshot().strike.y,z:p.snapshot().strike.z},target,'strike mark never follows the escaping player');
const paused=p.snapshot();p.step(30,f.snapshot,{...f.ctx,paused:true});assert.equal(p.snapshot(),paused);assert.deepEqual(p.shotTargets(),[]);
for(const dt of [0,-1,NaN,Infinity])p.step(dt,f.snapshot,f.ctx);assert.equal(p.snapshot(),paused,'invalid time cannot advance the warning');
tick(p,3,f.snapshot,f.ctx);assert(!p.snapshot().strike.active);
let impacts=p.drainEvents().filter(e=>e.type==='airstrike-impact');assert.equal(impacts.length,1);assert(Object.isFrozen(impacts[0]));assert.equal(impacts[0].damage,45);
tick(p,30,f.snapshot,f.ctx);assert.deepEqual(p.drainEvents(),[],'a wave never repeats its blast');
p.reset();assert.deepEqual(p.drainEvents(),[]);tick(p,10,f.snapshot,f.ctx);assert(!p.snapshot().active,'reset cannot rearm an already admitted wave');

for(const when of ['before-lock','after-lock']){
  const pressure=createSkylinePressure();tick(pressure,when==='before-lock'?.1:2,f.snapshot,f.ctx);
  const body=pressure.shotTargets()[0];assert(Object.isFrozen(body));assert(!Object.values(body).some(v=>typeof v==='function'));
  for(const bad of [null,{}, {...ray(pressure.snapshot().drone),y:50},{...ray(pressure.snapshot().drone),range:201},{...ray(pressure.snapshot().drone),interiorId:'other-room'},{...ray(pressure.snapshot().drone),dx:2}])assert.equal(pressure.hitByShot(body.id,20,bad).hits,0);
  assert.equal(pressure.hitByShot('old-id',20,ray(pressure.snapshot().drone)).hits,0);
  assert.equal(pressure.hitByShot(body.id,NaN,ray(pressure.snapshot().drone)).hits,0);
  assert.equal(pressure.hitByShot(body.id,10,ray(pressure.snapshot().drone)).hits,1);
  assert.equal(pressure.hitByShot(body.id,10,ray(pressure.snapshot().drone)).hits,0,'per-body pellet cooldown');
  tick(pressure,.2,f.snapshot,f.ctx);
  assert.equal(pressure.hitByShot(body.id,10000,ray(pressure.snapshot().drone)).hits,1);assert.equal(pressure.snapshot().drone.health,0);
  assert.deepEqual(pressure.shotTargets(),[]);tick(pressure,10,f.snapshot,f.ctx);
  const events=pressure.drainEvents();assert.equal(events.filter(e=>e.type==='drone-destroyed').length,1);assert(!events.some(e=>e.type==='airstrike-impact'),'shooting the live drone cancels its call');
}
{
  const pressure=createSkylinePressure();tick(pressure,2,f.snapshot,f.ctx);pressure.step(.1,f.snapshot,{...f.ctx,jammed:true});
  assert.equal(pressure.snapshot().jammed,true);assert(!pressure.snapshot().strike.active);
  tick(pressure,20,f.snapshot,f.ctx);assert(!pressure.drainEvents().some(e=>e.type==='airstrike-impact'),'one timed jammer cancels this wave call');
}
{
  const pressure=createSkylinePressure({hasLineOfSight:()=>false});pressure.step(.1,f.snapshot,f.ctx);
  assert.equal(pressure.hitByShot(pressure.shotTargets()[0].id,90,ray(pressure.snapshot().drone)).hits,0,'occluded drone remains protected by supplied shot authority');
}
for(const extra of [{active:false},{recovering:true},{dead:true},{health:0},{player:{...f.ctx.player,interiorId:'room'}}]){
  const pressure=createSkylinePressure();tick(pressure,2,f.snapshot,f.ctx);pressure.step(.1,f.snapshot,{...f.ctx,...extra});
  assert(!pressure.snapshot().active);assert.deepEqual(pressure.shotTargets(),[]);assert.deepEqual(pressure.drainEvents(),[],'lease loss/recovery/room transition drops the old warning and queued events');
}
{
  const pressure=createSkylinePressure();tick(pressure,2,f.snapshot,f.ctx);
  const capture={...f.snapshot,stage:'capture',enemies:[]};tick(pressure,5,capture,f.ctx);
  assert.equal(pressure.drainEvents().filter(e=>e.type==='airstrike-impact').length,1,'existing clear warning can finish after the crew clears');
  pressure.step(.1,{...capture,stage:'approach'},f.ctx);assert(!pressure.snapshot().active);
}
{
  const pressure=createSkylinePressure();tick(pressure,2,f.snapshot,f.ctx);
  pressure.step(.1,{...f.snapshot,active:false,stage:'failed'},f.ctx);assert.deepEqual(pressure.drainEvents(),[]);assert(!pressure.snapshot().active);
  pressure.step(.1,{...f.snapshot,attempt:2,missionId:'skyline-retrieval:2',encounterId:'new-wave',enemies:f.snapshot.enemies.map(e=>({...e,missionId:'skyline-retrieval:2',encounterId:'new-wave'}))},f.ctx);
  assert(pressure.snapshot().active);pressure.step(.1,f.snapshot,f.ctx);assert(!pressure.snapshot().active,'stale attempt cannot resurrect an old threat');
  pressure.dispose();tick(pressure,20,f.snapshot,f.ctx);assert.deepEqual(pressure.shotTargets(),[]);assert.deepEqual(pressure.drainEvents(),[]);
}
console.log('PASS Skylark pressure: actual reinforcement admission; one bounded live drone, strict 3D shots and pause/LOS/cooldown, frozen five-second mark, escape/shoot/jammer counterplay, once-only impact, held warning and transition/reset/stale-attempt disposal');
