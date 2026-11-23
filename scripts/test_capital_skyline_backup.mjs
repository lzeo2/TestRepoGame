import assert from 'node:assert/strict';
import {createSkylineBackup} from '../Games/Capital Drive/skyline-backup.js';
import {createSkylineOpponents} from '../Games/Capital Drive/skyline-opponents.js';
import {createSkylineJob} from '../Games/Capital Drive/skyline-job.js';
let cover=true,standing=true;
const opponents=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>cover});
const backup=createSkylineBackup({opponents,heightAt:()=>12,canStand:()=>standing,hasLineOfSight:()=>cover});
const missionId='skyline-retrieval:1',encounterId=missionId+':wave';
const wave={active:true,stage:'encounter',missionId,encounterId,enemies:Array.from({length:4},(_,i)=>({targetId:'crew-'+i,missionId,encounterId,x:i*2-3,z:-8,y:12,yaw:0,health:100}))};
const ctx={active:true,onFoot:true,health:100,missionId,encounterId,player:{x:0,y:12,z:0,yaw:0}};
opponents.step(0,wave,ctx);
for(const denied of [{onFoot:false},{missionId:'other'},{encounterId:'other'},{paused:true},{recovering:true},{health:0},{player:{...ctx.player,interiorId:'room'}},{player:{...ctx.player,jumpHeight:4}}])assert.equal(backup.canRequest(wave,{...ctx,...denied}).ok,false);
standing=false;assert.equal(backup.request(wave,ctx).ok,false);assert.equal(backup.bodies.length,0);standing=true;
assert(backup.canRequest(wave,ctx).ok);assert.equal(backup.bodies.length,0,'admission does not apply effects or charge anything');
assert(backup.request(wave,ctx).ok);const allies=backup.bodies;assert.equal(allies.length,2);assert(Object.isFrozen(allies)&&Object.isFrozen(allies[0]));
assert(allies.every(a=>a.role==='contract-guard'&&a.appearance&&a.adult&&a.fictional&&a.active));
assert.throws(()=>{allies[0].x=99;},TypeError);assert.equal(backup.request(wave,ctx).ok,false,'only one active team');
const frozen=backup.snapshot();backup.step(30,wave,{...ctx,paused:true});assert.equal(backup.snapshot().remaining,frozen.remaining);assert.equal(allies[0].phase,0);
cover=false;for(let i=0;i<40;i++){opponents.step(.1,wave,ctx);backup.step(.1,wave,ctx);}
assert(opponents.bodies.every(b=>b.health===100),'cover blocks all friendly fire');assert.deepEqual(backup.drainEvents(),[]);
cover=true;for(let i=0;i<40;i++){opponents.step(.1,wave,{...ctx,onFoot:false});backup.step(.1,wave,{...ctx,onFoot:false});}
assert(opponents.bodies.every(b=>b.health===100),'ATV standby never manufactures hits');assert(backup.snapshot().active);
for(let i=0;i<500&&opponents.bodies.some(b=>b.health>0);i++){opponents.step(.1,wave,ctx);backup.step(.1,wave,ctx);}
assert(opponents.bodies.every(b=>b.health===0),'ordinary checked shot HP reaches real zero');
const receipts=opponents.drainEvents();assert.equal(receipts.length,4);assert(receipts.every(e=>e.type==='defeated'&&e.missionId===missionId&&e.encounterId===encounterId));
const tracers=backup.drainEvents();assert(tracers.length>=20&&tracers.every(e=>e.type==='ally-shot'&&e.from&&e.to),'bounded shots expose visible/console effects');
assert(backup.bodies===allies,'the visible actor pool remains stable');
for(let i=0;i<610;i++)backup.step(.1,wave,ctx);assert(!backup.snapshot().active&&backup.bodies.length===0);assert(allies.every(a=>!a.active),'expiry retires live render bodies');
assert(backup.request(wave,ctx).ok,'support authority, not this effect, owns paid-call history');backup.step(.1,{...wave,missionId:'new-attempt'},{...ctx,missionId:'new-attempt'});assert.equal(backup.bodies.length,0,'attempt transition drops stale allies');
backup.reset();backup.reset();

// Actual job progress is earned only by the real opponent owner's receipts.
const job=createSkylineJob({groundHeightAt:()=>12});job.start();
for(let i=0;i<300&&['freefall','flare'].includes(job.snapshot().stage);i++){
 const p=job.snapshot().pose,target=job.layout.landing,dx=target.x-p.x,dz=target.z-p.z,d=Math.max(2.4,Math.hypot(dx,dz));job.step(.1,{}, {steerX:dx/d,steerZ:dz/d});
}
job.step(.1,{onFoot:true,player:job.layout.landing});job.step(.1,{onFoot:true,player:job.layout.searches[0]});assert.equal(job.snapshot().stage,'encounter');
const real=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>true}),friends=createSkylineBackup({opponents:real,heightAt:()=>12,canStand:()=>true,hasLineOfSight:()=>true});
const snap=job.snapshot(),realCtx={...ctx,missionId:snap.missionId,encounterId:snap.encounterId,player:job.layout.searches[0]};
real.step(0,snap,realCtx);assert(friends.request(snap,realCtx).ok);
for(let i=0;i<500&&real.bodies.some(b=>b.health>0);i++){real.step(.1,snap,realCtx);friends.step(.1,snap,realCtx);}
assert(real.bodies.every(b=>b.health===0));assert.equal(job.snapshot().stage,'encounter','elapsed backup fire alone cannot mutate the job');
const realReceipts=real.drainEvents();assert.equal(realReceipts.length,4);
job.step(.1,{onFoot:true,player:job.layout.searches[0],enemyOutcomes:realReceipts});assert.equal(job.snapshot().stage,'search','job accepts real HP-zero defeat receipts');
friends.reset();real.dispose();opponents.dispose();
console.log('PASS Skylark backup: two visible bounded allies, checked placement/mission token, no wallet authority, cover and ATV standby, pause/60s/reset, real HP hits/tracers/defeat receipts and actual job progression only through receipts');
const guarded=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>true});
const stale=createSkylineBackup({opponents:guarded,heightAt:()=>12,canStand:()=>true,hasLineOfSight:()=>true});
guarded.step(0,wave,ctx);assert(stale.request(wave,ctx).ok);
const changed={...wave,encounterId:missionId+':new-wave',enemies:wave.enemies.map(e=>({...e,encounterId:missionId+':new-wave'}))};
const changedCtx={...ctx,encounterId:changed.encounterId};
for(let i=0;i<50;i++){guarded.step(.1,changed,changedCtx);stale.step(.1,wave,ctx);}
assert(guarded.bodies.every(b=>b.health===100),'receiver rejects stale support encounter tokens even when target IDs are reused');
assert.deepEqual(stale.drainEvents(),[]);stale.reset();guarded.dispose();
console.log('PASS backup receipt token guard: stale encounter cannot damage new-wave targets with reused IDs');
