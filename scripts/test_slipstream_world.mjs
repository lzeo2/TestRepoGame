import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { WORLD, blocked, clearPath, chaseTarget } from '../Games/Slipstream Borough/world.js';
import { CARS } from '../assets/car-arcade/fleet.js';
// Neutral stays stationary; held Brake now deliberately reverses city cars.
const drive={steer:0,throttle:1,brake:0}, stop={steer:0,throttle:0,brake:0};
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);}
const fresh=()=>core.startRun(core.freshProfile(),'roam');
function tick(run,input,n){for(let i=0;i<n;i++)run=core.stepRun(run,input,.05);return run;}
// All manipulated mileage/poses/funding below are synthetic ABI regressions, not natural-play evidence.
check('immutable original city / radius / finite boundaries / routes',()=>{
  assert.equal(WORLD.blocks.length,36);assert(Object.isFrozen(WORLD));assert(Object.isFrozen(WORLD.blocks));
  for(const b of WORLD.blocks){assert(Object.isFrozen(b));assert(blocked(b.x,b.z));assert(blocked(b.x+15,b.z));}
  for(const x of [-150,-100,-50,0,50,100,150])assert(!blocked(x,0));
  assert(blocked(164,0));assert(blocked(0,-164));assert(!blocked(163,0));
  for(const x of [NaN,Infinity,'0',{},null])assert.throws(()=>blocked(x,0));
  assert(!clearPath({x:0,z:0},{x:50,z:50}));assert(clearPath({x:0,z:0},{x:0,z:150}));
  const from={x:0,z:-25},target={x:50,z:-25};const waypoint=chaseTarget(from,target);
  assert(clearPath(from,waypoint));assert.notDeepEqual(waypoint,target);
});
check('profile3 v2 migration preserves purchased kits / cosmetic copies / mileage gates',()=>{
  const p=core.freshProfile();assert.equal(p.version,3);assert.equal(p.careerDistance,0);assert.equal(p.escapes,0);
  assert.deepEqual(Object.keys(core.CAR_UNLOCKS).sort(),CARS.map(c=>c.id).sort());assert(Object.isFrozen(core.CAR_UNLOCKS));
  let legacy={...p,version:2,cash:800};delete legacy.careerDistance;delete legacy.escapes;
  legacy.customizations={bricklet:{paint:'#112233',wheels:'#abcdef',gadget:'emp',gadgets:['emp']}};
  const migrated=core.validateProfile(legacy);assert.equal(migrated.careerDistance,0);assert.equal(migrated.customizations.bricklet.stripe,null);
  assert.equal(core.fitGadget(migrated,'bricklet','emp').cash,800);
  const badLegacy=structuredClone(legacy);badLegacy.customizations.bricklet.stripe='#123456';assert.throws(()=>core.validateProfile(badLegacy));
  assert.throws(()=>core.fitGadget({...p,cash:1000},'bricklet','smoke'));
  assert.throws(()=>core.buyCar({...p,cash:100000},'pip'));
  const claimed=core.buyCar({...p,careerDistance:1200},'pip');assert.equal(claimed.cash,0);assert(claimed.owned.includes('pip'));
  const edited=core.customizeCar(p,'bricklet',{paint:'#aabbcc',wheels:'#123456',stripe:'#ABCDEF',spoiler:true});
  assert.equal(edited.customizations.bricklet.stripe,'#abcdef');assert.equal(p.customizations.bricklet.stripe,null);
  assert.deepEqual(core.validateProfile(JSON.parse(JSON.stringify(edited))),edited);
  for(const patch of [{careerDistance:Infinity},{escapes:-1},{careerDistance:.5}])assert.throws(()=>core.validateProfile({...p,...patch}));
});
check('real movement / copied poses / collision / boundary / bounded deadline',()=>{
  const {run}=fresh(),snapshot=structuredClone(run);let r=tick(run,drive,80);
  assert(r.world.z<0);assert(r.distance>0);assert.equal(r.world.x,0);assert.deepEqual(run,snapshot);assert.equal(r.pursuit,'roaming');
  const turned=tick(r,{...drive,steer:1},20);assert.notEqual(turned.world.heading,0);assert.notEqual(turned.world.x,0);
  r=tick(r,drive,200);assert(r.hp<100);assert(!blocked(r.world.x,r.world.z));assert(Math.abs(r.world.z)<=163);
  const wall=fresh().run;wall.world={x:0,z:-25,heading:-Math.PI/2};wall.speed=20;
  const hit=tick(wall,drive,20);assert(hit.hp<100);assert(!blocked(hit.world.x,hit.world.z));
  const timeout=tick(fresh().run,stop,4801);assert.equal(timeout.status,'busted');assert.equal(timeout.elapsed,240);
});
check('starter can turn ninety degrees inside an intersection without damage',()=>{
  let r=fresh().run;r.speed=5;
  for(let i=0;i<200&&Math.abs(r.world.heading)<Math.PI/2;i++)r=core.stepRun(r,{steer:1,throttle:0,brake:0},.05);
  assert(Math.abs(r.world.heading)>=Math.PI/2);assert.equal(r.hp,100);
  assert(Math.abs(r.world.x)<WORLD.streetHalfWidth-2);assert(Math.abs(r.world.z)<WORLD.streetHalfWidth-2);
});
check('city smoke affects trailing wake only / EMP radius / no containment override',()=>{
  for(const kind of ['smoke','emp'])for(const z of [50,-50,70]){
    const p=core.fitGadget({...core.freshProfile(),cash:1000,careerDistance:3500},'bricklet',kind);
    let r=core.startRun(p,'roam').run;Object.assign(r,{elapsed:20,distance:30,score:60});r=core.stepRun(r,stop,.05);
    Object.assign(r.police[0],{world:{x:0,z,heading:0},speed:20});
    const normal=core.stepRun(r,stop,.05),fired=core.stepRun(r,{...stop,deploy:true},.05);
    const affected=kind==='smoke'?z>0:z<65;
    assert.equal(fired.police[0].speed<normal.police[0].speed,affected);
  }
});
check('patrol timing / actual navigated cops / arrest / synthetic escape hold',()=>{
  let r=fresh().run;r.elapsed=19.95;r.distance=30;r.score=60;
  r=core.stepRun(r,stop,.05);assert.equal(r.pursuit,'chased');assert.equal(r.police.length,1);
  const before=structuredClone(r),saved=structuredClone(r.police[0].world);r=tick(r,stop,20);assert.notDeepEqual(r.police[0].world,before.police[0].world);assert.deepEqual(before.police[0].world,saved);
  r=tick(r,stop,400);assert.equal(r.status,'busted');assert(r.arrest===3||r.hp===0);
  let escape=structuredClone(before);escape.world={x:150,z:150,heading:0};escape.police[0].world={x:-150,z:-150,heading:0};
  escape=tick(escape,stop,121);assert.equal(escape.status,'escaped');assert.equal(escape.escapeClock,6);
  assert.equal(core.settleRun(fresh().profile,escape).escapes,1);
  for(const cop of escape.police)assert(!blocked(cop.world.x,cop.world.z));
});
check('parking actual traveled distance / automatic free unlock / once-only settlement',()=>{
  const started=core.startRun({...core.freshProfile(),careerDistance:1199},'roam');
  const moved=tick(started.run,drive,40),parked=core.parkRun(moved);
  assert.equal(moved.status,'running');assert.equal(parked.status,'parked');assert.equal(parked.earnings,Math.floor(moved.distance*.32));
  const banked=core.settleRun(started.profile,parked);assert(banked.owned.includes('pip'));assert.equal(banked.careerDistance,1199+Math.floor(moved.distance));
  assert.equal(banked.cash,parked.earnings);assert.throws(()=>core.settleRun(banked,parked));assert.throws(()=>core.parkRun(parked));
  assert.throws(()=>core.parkRun(core.startRun(core.freshProfile(),'race').run));
});
check('five finite kits / categories / real effects / loud pursuit / boost expiry',()=>{
  let p={...core.freshProfile(),cash:5000,careerDistance:3500};
  for(const [kind,spec] of Object.entries(core.GADGETS)){
    if(kind==='none')continue;
    const cash=p.cash;p=core.fitGadget(p,'bricklet',kind);assert.equal(p.cash,cash-spec.price);
    let r=core.startRun(p,'roam').run;r.hp=60;
    const normal=core.stepRun(r,drive,.05);r=core.stepRun(r,{...drive,deploy:true},.05);
    assert.equal(r.charges,spec.charges-1);assert.equal(r.deployments,1);assert.equal(r.earnings,0);
    assert.equal(r.pursuit,spec.category==='loud'?'chased':'roaming');
    if(kind==='repair')assert.equal(r.hp,80);
    if(kind==='boost'){assert(r.speed>normal.speed);r=tick(r,stop,81);assert(r.speed<=r.stats.speed);assert.equal(r.gadgetTime,0);}
    if(kind==='decoy'){assert.deepEqual(r.gadgetTarget,{x:0,z:0});const held=tick(r,{...drive,deploy:true},10);assert.equal(held.deployments,1);}
  }
  assert.equal(p.customizations.bricklet.gadgets.length,5);
});
check('new nested descriptors reject without invocation / settlement appearance invariant',()=>{
  let calls=0;const {profile,run}=fresh();Object.defineProperty(run.world,'x',{get(){calls++;return 0;}});
  assert.throws(()=>core.stepRun(run,drive,.05));assert.equal(calls,0);
  const parked=core.parkRun(fresh().run);parked.appearance.spoiler=true;assert.throws(()=>core.settleRun(profile,parked));
  const bad=fresh().run;bad.world.heading=Infinity;assert.throws(()=>core.stepRun(bad,drive,.05));
  const p=core.freshProfile();Object.defineProperty(p.customizations.bricklet,'stripe',{get(){calls++;return null;}});
  assert.throws(()=>core.validateProfile(p));assert.equal(calls,0);
});
console.log(`PASS ${checks} Slipstream world groups; synthetic pure checks only, not native acceptance.`);
