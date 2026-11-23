import assert from 'node:assert/strict';
import { createSkylineJob } from '../Games/Capital Drive/skyline-job.js';
import { createSkylineSupport, SKYLINE_SUPPORT_OFFERS } from '../Games/Capital Drive/skyline-support.js';

const job=createSkylineJob({groundHeightAt:()=>12});job.start();
for(let i=0;i<300&&['freefall','flare'].includes(job.snapshot().stage);i++){
 const p=job.snapshot().pose,t=job.layout.landing,dx=t.x-p.x,dz=t.z-p.z,d=Math.max(2.4,Math.hypot(dx,dz));job.step(.1,{}, {steerX:dx/d,steerZ:dz/d});
}
const foot=p=>({onFoot:true,player:p});job.step(.1,foot(job.layout.landing));
const ctx=()=>({missionId:job.snapshot().missionId,active:job.snapshot().active,onFoot:true});
let allowed=true,effectOk=true,effects=0,checks=0;
const support=createSkylineSupport({canUse:()=>{checks++;return {ok:allowed,message:'No usable target.'};},apply:()=>{effects++;return {ok:effectOk,message:'Effect rejected.'};}});
assert.deepEqual(Object.values(SKYLINE_SUPPORT_OFFERS).map(o=>[o.id,o.cost]),[['backup',600],['resupply',350],['jammer',500]]);
support.step(.1,job.snapshot(),ctx());assert.equal(support.snapshot().balance,0);assert(!support.buy('backup',ctx()).ok);
assert.equal(effects,0);
let serial=0;
const clearEnemies=()=>{const s=job.snapshot();job.step(.1,{...foot(s.marker),enemyOutcomes:s.enemies.map(e=>({type:'defeated',missionId:e.missionId,encounterId:e.encounterId,targetId:e.targetId,serial:++serial,outcome:'killed'}))});};
const capture=leg=>{
 const p=job.layout.searches[leg];job.step(.1,foot(p));clearEnemies();assert(job.interact(foot(p)).ok);
 for(let i=0;i<16;i++)job.step(.25,foot(p));clearEnemies();assert(job.interact(foot(p)).ok);
 support.step(.1,job.snapshot(),ctx());
};
capture(0);const first=job.snapshot();assert.equal(support.snapshot().earned,750);
for(let i=0;i<20;i++)support.step(.1,first,ctx());assert.equal(support.snapshot().earned,750,'same capture cannot grant twice');
assert(Object.isFrozen(support.snapshot())&&Object.isFrozen(support.snapshot().offers));
const before=support.snapshot();support.offers(ctx());support.snapshot();assert.deepEqual(support.snapshot(),before,'UI inspection never grants or spends');
for(const denial of [{paused:true},{preview:true},{uiOnly:true},{active:false},{onFoot:false},{missionId:'other'}])assert(!support.buy('backup',{...ctx(),...denial}).ok);
assert(!support.buy('__proto__',ctx()).ok);
allowed=false;assert(!support.buy('backup',ctx()).ok);assert.equal(support.snapshot().spent,0);assert.equal(effects,0);
allowed=true;effectOk=false;assert(!support.buy('backup',ctx()).ok);assert.equal(support.snapshot().spent,0,'rejected effects never spend');
effectOk=true;assert(support.buy('backup',ctx()).ok);assert.equal(support.snapshot().balance,150);assert(!support.buy('backup',ctx()).ok);assert(!support.buy('resupply',ctx()).ok);
capture(1);assert.equal(support.snapshot().earned,1500);assert(support.buy('resupply',ctx()).ok);assert(support.buy('jammer',ctx()).ok);
assert.equal(support.snapshot().spent,1450);assert(support.jammerActive);assert.equal(support.snapshot().jammerRemaining,20);
assert(support.drainEvents().some(e=>e.offerId==='jammer'&&e.cancelWarning&&e.duration===20));
support.step(100,job.snapshot(),{...ctx(),paused:true});assert.equal(support.snapshot().jammerRemaining,20);
for(let i=0;i<19;i++)support.step(1,job.snapshot(),ctx());assert.equal(support.snapshot().jammerRemaining,1);support.step(1,job.snapshot(),ctx());assert(!support.jammerActive);
capture(2);assert.equal(support.snapshot().earned,2250);assert.equal(support.snapshot().balance,800);
support.step(.1,first,ctx());assert.equal(support.snapshot().earned,2250,'stale capture regression cannot revoke or remint funds');
assert.equal(support.complete(job.snapshot(),ctx()),null,'active safe approach cannot issue career reward');
// Complete the actual job through its normal symbol, pickup and extraction API.
assert(job.interact(foot(job.layout.safe)).ok);
while(job.snapshot().stage==='safe'){const s=job.snapshot();assert(job.symbol(s.safe.sequence[s.safe.index],foot(job.layout.safe)).ok);}
assert(job.interact(foot(job.layout.loot)).ok);clearEnemies();
const extraction={...job.layout.helipad,vehicleId:job.snapshot().extraction.vehicleId,active:true,boarded:false,pilotControlled:true,speed:0};
const flightCtx={...foot(job.layout.helipad),extraction};assert(job.interact(flightCtx).ok);extraction.boarded=true;job.step(.1,flightCtx);extraction.y+=80;extraction.speed=50;
for(const target of job.layout.airRoute)for(let guard=0;Math.hypot(target.x-extraction.x,target.z-extraction.z)>1&&guard<1000;guard++){
 const dx=target.x-extraction.x,dz=target.z-extraction.z,d=Math.hypot(dx,dz),step=Math.min(5,d);extraction.x+=dx/d*step;extraction.z+=dz/d*step;job.step(.1,flightCtx);
}
assert.equal(job.snapshot().stage,'complete');
const receipt=support.complete(job.snapshot(),ctx());assert.deepEqual(receipt,{missionId:job.snapshot().missionId,baseReward:8500,spent:1450,reward:7050});
assert(Object.isFrozen(receipt));assert.equal(support.complete(job.snapshot(),ctx()),null,'career adjustment returns once');
support.clear();support.step(.1,first,{...ctx(),active:true});assert.equal(support.snapshot().missionId,null,'old attempt cannot rebind after restoration');

const mock={...first,attempt:2,missionId:'skyline-retrieval:2',stage:'approach',caches:first.caches.map(c=>({...c,captured:true,alerted:true,reinforcementsCleared:true}))};
const live={missionId:mock.missionId,active:true,onFoot:true};
for(const changed of [{stage:'encounter'},{stage:'unknown'},{jobId:'other'}]){support.step(.1,{...mock,...changed},live);assert.equal(support.snapshot().earned,0,'hostile/noncapture stage cannot mint support');}
support.clear();const third={...mock,attempt:3,missionId:'skyline-retrieval:3'},thirdCtx={...live,missionId:third.missionId};
for(const denied of [{paused:true},{uiOnly:true},{preview:true}]){support.step(.1,third,{...thirdCtx,...denied});assert.equal(support.snapshot().missionId,null);}
for(const dt of [0,-1,NaN,Infinity])support.step(dt,third,thirdCtx);assert.equal(support.snapshot().missionId,null);
support.step(.1,third,thirdCtx);assert.equal(support.snapshot().earned,2250);support.dispose();support.dispose();assert.equal(support.snapshot().balance,0);
assert(checks>0);
console.log('PASS Skyline support: actual three reinforced captures/full extraction,750 per roster cache, bounded once-only offers, no grant from UI/pause/hostile/stale inputs, rejected-effect atomic spend,20s jammer and7050 once-only adjusted reward');
