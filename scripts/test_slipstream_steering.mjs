import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { CARS } from '../assets/car-arcade/fleet.js';
import { WORLD } from '../Games/Slipstream Borough/world.js';
// Synthetic valid copied fixtures, not native play, earned acquisition or camera proof.
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
const finite=o=>{for(const v of Object.values(o))if(typeof v==='number')assert(Number.isFinite(v));else if(v&&typeof v==='object')finite(v);};
function fixture(id,level,mode='roam') {
  let p={...core.freshProfile(),careerDistance:200000};
  if(id!=='bricklet')p=core.buyCar(p,id);
  p=core.selectCar(p,id);
  p.upgrades[id]={engine:level,handling:level,armor:level};
  return core.startRun(p,mode).run;
}
function step(r,steer,dt=.05) {
  // Balance drag to measure steering at a constant valid speed.
  return core.stepRun(r,{steer,throttle:r.speed===0?0:(.3+r.speed*.012)/r.stats.acceleration,brake:0},dt);
}
let minYaw=Infinity,maxYaw=0,minLateral=Infinity,maxLateral=0;
for(const {id} of CARS) {
  let previous=0;
  for(let level=0;level<=5;level++) {
    const base=fixture(id,level);
    for(const speed of [0,1,5,10,20,base.stats.speed]) {
      for(const heading of [0,Math.PI-.001,-Math.PI+.001]) {
        const r=structuredClone(base);r.speed=speed;r.world.heading=heading;
        const saved=structuredClone(r),left=step(r,-1),right=step(r,1),straight=step(r,0);
        assert.deepEqual(r,saved);assert.notEqual(right.world,r.world);finite(right);
        const yaw=-wrap(right.world.heading-heading)/.05;
        near(wrap(left.world.heading-heading)/.05,yaw);
        near(straight.world.heading,heading);
        assert(right.world.heading>=-Math.PI&&right.world.heading<=Math.PI);
        near(wrap(step(r,.5).world.heading-heading),wrap(right.world.heading-heading)/2);
        if(speed<=5)near(yaw,r.stats.handling*speed*.05);
        if(speed>=20){assert(yaw>0&&yaw<=1.1);minYaw=Math.min(minYaw,yaw);maxYaw=Math.max(maxYaw,yaw);}
        if(speed===0){assert.deepEqual(right.world,r.world);assert.equal(right.distance,0);}
        const half=step(step(r,1,.025),1,.025);near(half.world.heading,right.world.heading);
        near(half.distance,right.distance);
        const zero=step(r,1,0);assert.deepEqual(zero,r);assert.notEqual(zero,r);
      }
    }
    const high=structuredClone(base);high.speed=20;
    const yaw=-step(high,1).world.heading/.05;
    assert(yaw>previous);previous=yaw;
    for(const mode of ['cutup','race']) {
      const r=fixture(id,level,mode);r.x=0;r.speed=r.stats.speed;r.spawnClock=10;
      const saved=structuredClone(r),right=step(r,1),left=step(r,-1);
      const rate=right.x/.05;
      near(rate,r.stats.handling*.7);near(left.x,-right.x);assert.deepEqual(r,saved);
      near(step(r,0).x,0);finite(right);
      minLateral=Math.min(minLateral,rate);maxLateral=Math.max(maxLateral,rate);
    }
  }
}
let turn=fixture('bricklet',0);turn.speed=5;
for(let i=0;i<200&&Math.abs(turn.world.heading)<Math.PI/2;i++)turn=core.stepRun(turn,{steer:1,throttle:0,brake:0},.05);
assert(Math.abs(turn.world.heading)>=Math.PI/2);assert.equal(turn.hp,100);
assert(Math.abs(turn.world.x)<WORLD.streetHalfWidth-2&&Math.abs(turn.world.z)<WORLD.streetHalfWidth-2);
const started=core.startRun(core.freshProfile(),'roam'),contact=structuredClone(started.run);
contact.world={x:-50,z:55,heading:0};contact.speed=25;
const saved=structuredClone(contact),hit=step(contact,1);
assert.deepEqual(contact,saved);assert.equal(hit.collisions,1);assert.equal(hit.distance,0);
assert.equal(hit.nearMisses,0);assert.equal(hit.earnings,0);assert.equal(step(hit,1).hp,hit.hp);
const parked=core.parkRun(hit),banked=core.settleRun(started.profile,parked);
assert.equal(banked.cash,0);assert.equal(banked.careerDistance,0);assert.throws(()=>core.settleRun(banked,parked));
for(const dt of [-1,.05001,NaN,Infinity])assert.throws(()=>step(saved,1,dt));
console.log(`PASS steering: all16, upgrades0..5, low/high speed, signed PI, mirror/copy/time/finite/no drift, intersection and collision payout; city >=20m/s yaw ${minYaw.toFixed(6)}..${maxYaw.toFixed(6)}rad/s; highway max-speed lateral ${minLateral.toFixed(3)}..${maxLateral.toFixed(3)}m/s (30% reduction). Synthetic source only.`);
