import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { CARS } from '../assets/car-arcade/fleet.js';
import { blocked } from '../Games/Slipstream Borough/world.js';
// Synthetic source checks, not native driving or earned fleet evidence.
const idle={steer:0,throttle:0,brake:0}, reverse={...idle,brake:1}, gas={...idle,throttle:1};
const step=(r,input=idle,dt=.05)=>core.stepRun(r,input,dt);
const tick=(r,input,n)=>{for(let i=0;i<n;i++)r=step(r,input);return r;};
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const fresh=()=>core.startSandbox('bricklet');
const real=core.freshProfile(),bytes=JSON.stringify(real);
for(const {id} of CARS) {
  const r=core.startSandbox(id,23),copy=structuredClone(r);
  assert.equal(r.id,23);assert.equal(r.carId,id);assert.equal(r.mode,'sandbox');
  assert.deepEqual(Object.keys(r).sort(),Object.keys(core.startRun(real,'roam').run).sort());
  assert.deepEqual(r.upgrades,{engine:0,handling:0,armor:0});assert.equal(r.finishDistance,100000);
  assert.equal(r.stats.handling,CARS.find(c=>c.id===id).handling);
  assert.deepEqual(step(r,idle,0),r);assert.notEqual(step(r,idle,0).world,r.world);
  const rest=tick(r,{...idle,steer:1},50);assert.deepEqual(rest.world,r.world);assert.equal(rest.speed,0);
  const back=tick(r,reverse,20);assert.equal(back.speed,-6);assert(back.world.z>0);assert(back.distance>0);
  near(back.distance,back.world.z);assert.equal(back.earnings,0);assert.equal(back.score,Math.floor(back.distance*2));
  let forward=step(back,gas);assert(forward.speed<0&&forward.speed>back.speed);
  forward=tick(forward,gas,20);assert(forward.speed>0);
  let braking=step(forward,reverse);assert(braking.speed>=0&&braking.speed<forward.speed);
  braking=tick(braking,reverse,40);assert(braking.speed<0);
  for(const sign of [-1,1]) {
    const motion={...r,speed:sign*.1};const coast=tick(motion,idle,100);
    assert.equal(Math.abs(coast.speed),0);assert.equal(Math.sign(coast.world.z),-sign);
    assert.deepEqual(step(coast,idle).world,coast.world);
  }
  for(const speed of [-6,-1,1,5,20])for(const handling of [.25,1,2]) {
    const motion={...r,speed},before=structuredClone(motion);
    const right=step(motion,{...idle,steer:1,handling}),left=step(motion,{...idle,steer:-1,handling});
    near(right.world.heading,-left.world.heading);near(right.world.x,-left.world.x);near(right.world.z,left.world.z);
    assert.equal(Math.sign(right.world.heading),-Math.sign(speed));assert.deepEqual(motion,before);
    assert.deepEqual(right.stats,r.stats);assert.equal(right.hp,100);
    if(Math.abs(speed)<=5)near(Math.abs(right.world.heading),r.stats.handling*handling*Math.abs(right.speed)*.05*.05);
  }
  assert.deepEqual(step(r,idle),step(r,{...idle,handling:1}));assert.deepEqual(r,copy);
  const end=tick(r,idle,4801);assert.equal(end.elapsed,240);assert.equal(end.status,'busted');
  assert.equal(end.earnings,0);assert.equal(end.heat,0);assert.equal(end.arrest,0);
  assert.deepEqual([end.traffic,end.police,end.rivals],[[],[],[]]);assert.equal(end.gadget,'none');
  assert.throws(()=>core.settleRun(core.startRun(real,'roam').profile,end));assert.throws(()=>core.parkRun(r));
}
assert.equal(JSON.stringify(real),bytes);assert.deepEqual(core.freshProfile(),real);
for(const mode of ['roam','cutup','race']) {
  const r=core.startRun(real,mode).run;
  assert.throws(()=>step(r,{...idle,handling:1}));
  const back=tick(r,reverse,20);
  if(mode==='roam'){assert.equal(back.speed,-6);assert(back.world.z>0);}
  else {assert.equal(back.speed,0);assert.equal(back.distance,0);assert.throws(()=>step({...r,speed:-1}));}
}
assert.throws(()=>core.startRun(real,'sandbox'));
let calls=0;const hostile={get toString(){calls++;throw Error('getter');},get valueOf(){calls++;throw Error('getter');}};
for(const id of [null,undefined,0,{},hostile,'__proto__','constructor','unknown'])assert.throws(()=>core.startSandbox(id));
for(const id of [0,-1,.5,1e9,Infinity,NaN,'1',null,hostile])assert.throws(()=>core.startSandbox('bricklet',id));
for(const handling of [0,.249,2.001,Infinity,NaN,'1',null,undefined,hostile])assert.throws(()=>step(fresh(),{...idle,handling}));
for(const key of ['handling','steer','deploy']) {
  const input={...idle};Object.defineProperty(input,key,{get(){calls++;return 1;}});
  assert.throws(()=>step(fresh(),input));
}
for(const patch of [{heat:1},{arrest:1},{earnings:1},{level:1},{finishDistance:1200},{speed:-6.01},{hp:101},{elapsed:241},{pursuit:'chased'},{gadgetHeld:true},{status:'parked'},{status:'escaped'},{nextEntity:2},{spawnClock:1},{score:1},{world:{x:25,z:25,heading:0}},{upgrades:{engine:6,handling:0,armor:0}}])assert.throws(()=>step({...fresh(),...patch}));
assert.equal(calls,0);
const deploy=step(fresh(),{...idle,deploy:true});assert.equal(deploy.gadgetHeld,false);assert.equal(deploy.deployments,0);
// Reverse building/border contact retains cooldown and toughness, never pays.
for(const mode of ['roam','sandbox']) {
  const r=mode==='roam'?core.startRun(real,mode).run:fresh();r.world={x:0,z:162.9,heading:0};r.speed=-6;
  const hit=step(r,reverse);assert.equal(hit.collisions,1);assert(hit.hp<100);assert.equal(hit.distance,0);
  assert(!blocked(hit.world.x,hit.world.z));assert(hit.speed<0);assert.equal(step(hit,reverse).hp,hit.hp);
  assert.equal(hit.earnings,0);
}
const city=core.startRun(real,'roam').run;city.world={x:-50,z:46.1,heading:0};city.speed=-6;
const hit=step(city,reverse);assert(hit.traffic[0].hit);assert.equal(hit.collisions,1);assert.equal(hit.distance,0);
const chased=core.startRun(real,'roam').run;Object.assign(chased,{elapsed:20,distance:30,score:60});
const cops=step(chased);cops.speed=-6;cops.police[0].world={x:0,z:-8,heading:0};cops.police[0].speed=0;
assert.equal(step(cops,reverse).arrest,0);
const armored=core.upgradeCar({...real,cash:250},'bricklet','armor');
const tough=core.startRun(armored,'roam').run;tough.world={...city.world};tough.speed=-6;
assert(step(tough,reverse).hp>hit.hp);
// Expiring boost must cap signed city speed even while coasting or braking.
const boosted=core.fitGadget({...real,cash:1000,careerDistance:3500},'bricklet','boost');
for(const input of [idle,reverse,gas]) {
  const r=core.startRun(boosted,'roam').run;
  Object.assign(r,{speed:r.stats.speed*1.35,gadgetTime:.01,gadgetCooldown:1,charges:2,deployments:1});
  const expired=step(r,input);assert(expired.speed<=r.stats.speed);step(expired,input);
}
console.log('PASS reverse/sandbox: all16, signed motion/mirror/tune/copy/rest/coast/contact, strict hostile bounds, no grants/banking, timeout; highway forward-only. Source-only.');
