import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { clearPath, chaseTarget, blocked } from '../Games/Slipstream Borough/world.js';
const idle={steer:0,throttle:0,brake:0}, gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const step=(r,input=idle)=>core.stepRun(r,input,.05);
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);}
function chased(player={x:0,z:0,heading:0},cop={x:0,z:-50,heading:0}) {
  let r=core.startRun(core.freshProfile(),'roam').run;Object.assign(r,{elapsed:20,distance:30,score:60});r=step(r);
  r.world={...player};r.police[0].world={...cop};r.police[0].speed=0;r.traffic=[];return r;
}
function physical(previous,next) {
  for(const [i,cop] of next.police.entries()){
    const before=previous.police[i];assert(clearPath(before.world,cop.world));assert(!blocked(cop.world.x,cop.world.z));
    const distance=gap(before.world,cop.world);assert(distance<=cop.speed*.05+1e-7);assert(Math.abs(cop.distance-before.distance-distance)<1e-7);
    for(const npc of next.traffic)assert(gap(cop.world,npc.world)>=4-1e-7);
    assert(gap(cop.world,next.world)>=4-1e-7);
  }
}
// Source-only copied fixtures. No debug interface, native play or earned progression claim.
check('deterministic block routes arrive by physical clear segments, no oscillating junction',()=>{
  const pairs=[[{x:0,z:-25},{x:50,z:-25}],[{x:-150,z:-150},{x:150,z:150}],[{x:0,z:-25},{x:50,z:25}],[{x:150,z:125},{x:-150,z:-125}]];
  for(const [from,to] of pairs){let p={...from},travel=0;for(let i=0;i<1100&&gap(p,to)>.05;i++){
    const target=chaseTarget(p,to);assert.deepEqual(chaseTarget(p,to),target);assert(clearPath(p,target));
    const length=gap(p,target);assert(length>.0001,'no stalled waypoint');const amount=Math.min(1,length),next={x:p.x+(target.x-p.x)*amount/length,z:p.z+(target.z-p.z)*amount/length};
    assert(clearPath(p,next));travel+=amount;p=next;
  }assert(gap(p,to)<=.05);assert(travel<=Math.abs(from.x-to.x)+Math.abs(from.z-to.z)+100);}
});
check('moving player pursuit routes around a block with bounded lead and no teleport',()=>{
  let r=chased({x:0,z:140,heading:0},{x:50,z:125,heading:0});r.speed=14;let closest=Infinity,moved=0;
  for(let i=0;i<320&&r.status==='running';i++){
    const previous=r,input={...idle,throttle:(.3+r.speed*.012)/r.stats.acceleration};r=step(r,input);physical(previous,r);
    moved+=gap(previous.world,r.world);closest=Math.min(closest,gap(r.police[0].world,r.world));
  }
  assert(moved>100);assert(closest<9,`closest moving gap ${closest}`);assert(r.police[0].distance>100);assert(r.hp>0);
});
check('braking containment holds stopped player outside body, not repeated ram damage',()=>{
  let r=chased(),braked=false;
  for(let i=0;i<300&&r.status==='running';i++){const previous=r;r=step(r);physical(previous,r);if(r.police[0].speed<previous.police[0].speed)braked=true;}
  assert(braked);assert.equal(r.status,'busted');assert.equal(r.arrest,3);assert.equal(r.hp,100);assert.equal(r.collisions,0);
  assert(gap(r.world,r.police[0].world)>=4);assert(gap(r.world,r.police[0].world)<9);
  const corner=chased({x:13,z:8,heading:0},{x:8,z:13,heading:0});assert(!clearPath(corner.world,corner.police[0].world));
  assert.equal(step(corner).arrest,0,'no arrest through building corner');
});
check('civilian bypass / no reciprocal cop traffic deadlock / no driving through cars',()=>{
  const city=core.startRun(core.freshProfile(),'roam').run;
  let r=chased({x:-46.5,z:-50,heading:0},{x:-46.5,z:60,heading:0});r.traffic=[city.traffic[0]];
  let closest=Infinity;for(let i=0;i<500&&r.status==='running';i++){const previous=r;r=step(r);physical(previous,r);closest=Math.min(closest,gap(r.world,r.police[0].world));}
  assert(closest<9,`civilian bypass stalled at ${closest}`);assert.equal(r.status,'busted');assert.equal(r.arrest,3);
});
check('six-second separation escape / meaningful score and cash / once-only settlement',()=>{
  let r=chased({x:150,z:150,heading:0},{x:-150,z:-150,heading:0});
  for(let i=0;i<119;i++)r=step(r);assert.equal(r.status,'running');assert(r.escapeClock<6);
  for(let i=0;i<2;i++)r=step(r);assert.equal(r.status,'escaped');assert.equal(r.escapeClock,6);
  assert.equal(r.score,Math.floor(r.distance*2)+300);assert.equal(r.earnings,Math.floor(r.distance*.32)+180);
  const p=core.startRun(core.freshProfile(),'roam').profile,banked=core.settleRun(p,r);assert.equal(banked.escapes,1);assert.equal(banked.cash,r.earnings);assert.throws(()=>core.settleRun(banked,r));
});
check('clean moving pass once per car / no repeat, hit, reverse or stationary farming',()=>{
  function attempt(hit=false,speed=20){const started=core.startRun(core.freshProfile(),'roam');let r=started.run;r.traffic[0].hit=hit;r.world={x:-42,z:40.5,heading:0};r.speed=speed;for(let i=0;i<12;i++)r=step(r,{...idle,throttle:speed>0?(.3+r.speed*.012)/r.stats.acceleration:0});return {r,profile:started.profile};}
  const {r:passed,profile}=attempt();assert.equal(passed.nearMisses,1);assert(passed.traffic[0].passed);assert.equal(passed.hp,100);
  assert.equal(passed.score,Math.floor(passed.distance*2)+100);assert.equal(passed.earnings,0);
  const parked=core.parkRun(passed);assert.equal(parked.earnings,Math.floor(passed.distance*.32)+30);assert.equal(core.settleRun(profile,parked).cash,parked.earnings);
  let repeat=structuredClone(passed);const npc=repeat.traffic[0];repeat.world={x:npc.world.x+4.5,z:npc.world.z+3,heading:0};
  for(let i=0;i<12;i++)repeat=step(repeat,{...idle,throttle:(.3+repeat.speed*.012)/repeat.stats.acceleration});assert.equal(repeat.nearMisses,1);
  assert.equal(attempt(true).r.nearMisses,0);assert.equal(attempt(false,0).r.nearMisses,0);assert.equal(attempt(false,-6).r.nearMisses,0);
  const zero=attempt(false,0).r;assert.equal(zero.score,0);assert.equal(core.parkRun(zero).earnings,0);
});
console.log(`PASS ${checks} Slipstream pursuit groups; synthetic source only, native acceptance held.`);
