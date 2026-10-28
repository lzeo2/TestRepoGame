// Deterministic simulation checks, not native/device or earned-progression evidence.
import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { CARS } from '../assets/car-arcade/fleet.js';
import { blocked, chaseTarget } from '../Games/Slipstream Borough/world.js';
const idle={steer:0,throttle:0,brake:0},gas={...idle,throttle:1};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function simulate(hz,seconds,initial,input) {
  let r=initial;for(let i=0;i<Math.round(hz*seconds);i++)r=core.stepRun(r,typeof input==='function'?input(r):input,1/hz);return r;
}
const speeds=[],distances=[];
for(const hz of [30,60,120]) {
  const r=simulate(hz,4,core.startSandbox('bricklet'),gas);
  assert.equal(r.hp,100);assert.equal(r.collisions,0);assert.equal(r.earnings,0);
  speeds.push(r.speed);distances.push(r.distance);
  console.log(`4s stock Bricklet ${hz}Hz: ${(r.speed*3.6).toFixed(3)} km/h, ${r.distance.toFixed(4)} m`);
}
assert(Math.max(...speeds)-Math.min(...speeds)<.01);
assert(Math.max(...distances)-Math.min(...distances)<.02);
assert(speeds[1]>19.138905330213166*1.5,'four-second acceleration improves >=50% on frozen baseline');
for(const car of CARS) {
  const r=core.startSandbox(car.id);
  assert.equal(r.stats.speed,car.speed*1.25);assert.equal(r.stats.acceleration,car.acceleration*1.5);
  const turns=[];
  for(const hz of [30,60,120]) {
    const base=structuredClone(r);base.speed=5;
    const turned=simulate(hz,1.5,base,{...idle,steer:1});
    assert.equal(turned.hp,100);assert(!blocked(turned.world.x,turned.world.z));turns.push(turned);
  }
  assert(Math.abs(turns[0].world.heading-turns[2].world.heading)<.001);
  assert(gap(turns[0].world,turns[2].world)<.01);
}
// Full lock, release, countersteer and braking recover immediately, without a cooldown.
let r=core.startSandbox('bricklet');r.speed=20;
const balance=r=>(.3+Math.abs(r.speed)*.012)/r.stats.acceleration;
r=core.stepRun(r,{...idle,steer:1,throttle:balance(r)},.05);
const heading=r.world.heading,straight=core.stepRun(r,{...idle,throttle:balance(r)},.05);
assert.equal(straight.world.heading,heading);
assert(core.stepRun(r,{...idle,steer:-1,throttle:balance(r)},.05).world.heading>heading);
let braking=core.startSandbox('bricklet');braking.speed=20;
braking=simulate(120,.85,braking,{...idle,brake:1});assert(braking.speed<=0);assert(braking.distance<8.5);
// Sample headings, reverse travel, streets and finite corners. Impossible rear poses defer.
let spawned=0,deferred=0;
for(const point of [{x:0,z:0},{x:0,z:145},{x:150,z:150},{x:-163,z:-163}]) {
  for(let angle=0;angle<16;angle++)for(const speed of [0,20,-6,-.5]) {
    const initial=core.startRun(core.freshProfile(),'roam').run;
    Object.assign(initial,{elapsed:20,distance:30,score:60,speed,traffic:[]});
    initial.world={...point,heading:-Math.PI+angle*Math.PI/8};
    const copy=structuredClone(initial),r=core.stepRun(initial,idle,1/60);
    const unchased=core.startSandbox('bricklet');
    Object.assign(unchased,{elapsed:20,distance:30,score:60,speed,world:{...initial.world}});
    const reference=core.stepRun(unchased,idle,1/60);
    assert.deepEqual(initial,copy);assert.equal(r.hp,reference.hp);assert.equal(r.collisions,reference.collisions);assert.equal(r.arrest,0);
    if(!r.police.length){assert.equal(r.pursuit,'roaming');deferred++;continue;}
    spawned++;const cop=r.police[0],dx=cop.world.x-r.world.x,dz=cop.world.z-r.world.z;
    const sign=speed<0?-1:1,forward={x:-Math.sin(initial.world.heading)*sign,z:-Math.cos(initial.world.heading)*sign};
    assert(dx*forward.x+dz*forward.z<=-39,'cop must be safely rearward');
    assert(gap(cop.world,r.world)>59);assert(!blocked(cop.world.x,cop.world.z));
    assert.notDeepEqual(chaseTarget(cop.world,r.world),cop.world,'spawn has a navigable route');
    assert.equal(r.earnings,0);
  }
}
assert(spawned>100);assert(deferred>0);
// An occupied preferred rear junction is excluded, not overlapped.
let city=core.startRun(core.freshProfile(),'roam').run;
Object.assign(city,{elapsed:20,distance:30,score:60});city.traffic=city.traffic.slice(0,1);
city.traffic[0].world={x:0,z:75,heading:0};city.traffic[0].speed=0;
city=core.stepRun(city,idle,1/60);assert.equal(city.police.length,1);
assert(gap(city.police[0].world,city.traffic[0].world)>=12);
// Real collision and reverse-out retain cooldown, never tunnel or pay unfinished rewards.
let wall=core.startSandbox('bricklet');wall.world={x:0,z:-162.9,heading:0};wall.speed=20;
const hit=core.stepRun(wall,gas,.05);assert.equal(hit.collisions,1);assert(hit.hp<100);assert.equal(hit.distance,0);
let recovered=simulate(60,1,hit,{...idle,brake:1});assert(recovered.speed<0);assert(recovered.world.z>hit.world.z);
assert(!blocked(recovered.world.x,recovered.world.z));assert.equal(recovered.earnings,0);
// Highway police may brake, but cannot be position-clamped forward/backward.
let highway=core.startRun(core.freshProfile(),'cutup').run;
Object.assign(highway,{elapsed:20,distance:400,score:800});highway=core.stepRun(highway,idle,.05);
for(let i=0;i<180&&highway.status==='running';i++) {
  const before=highway;highway=core.stepRun(highway,idle,.05);
  for(let n=0;n<before.police.length;n++) {
    const cop=highway.police[n],prior=before.police[n];
    assert(Math.abs(cop.distance-prior.distance-cop.speed*.05)<1e-8,'no positional rubber-banding');
  }
}
assert.equal(highway.status,'busted');assert(highway.arrest===3||highway.hp===0);
console.log(`PASS 30/60/120Hz stock acceleration/turn consistency, all16 +25% speed/+50% acceleration, progressive corner/release/brake/reverse recovery; ${spawned} safe rear spawns/${deferred} safe deferrals, occupied-spawn clearance, physical highway police. Synthetic only.`);
