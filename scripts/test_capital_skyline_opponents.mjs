import assert from 'node:assert/strict';
import { createSkylineOpponents } from '../Games/Capital Drive/skyline-opponents.js';
import { createSkylineJob } from '../Games/Capital Drive/skyline-job.js';

let visible=true,playerHits=0,blocked=false;
const opponents=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>visible,
 clipMovement:(_body,dx,dz)=>blocked?{dx:0,dz:0}:{dx,dz},onPlayerHit:(amount,point)=>{assert.equal(amount,8);assert(Number.isFinite(point.y));playerHits++;}});
const missionId='skyline-retrieval:1',encounterId=`${missionId}:wave-1`;
const wave={active:true,stage:'encounter',missionId,encounterId,enemies:Array.from({length:4},(_,i)=>({id:`enemy${i}`,targetId:`enemy${i}`,missionId,encounterId,x:i*3,z:0,yaw:0,health:100,label:'Fictional crew',appearanceId:'contract:skyline-crew'}))};
const ctx={active:true,onFoot:true,health:100,player:{x:0,y:12,z:6}};
const ray=body=>({x:body.x,y:body.y+1,z:body.z+3,dx:0,dy:0,dz:-1,range:6,interiorId:null});
opponents.step(0,wave,ctx);
const bodies=opponents.bodies,body=bodies[0],shot=opponents.shotTargets()[0];
assert.equal(bodies.length,4);assert(Object.isFrozen(bodies)&&Object.isFrozen(body));
assert(body.adult&&body.fictional&&body.appearance&&body.role==='contract-target');
assert.equal(body.standingHeight,shot.height);assert.equal(shot.feetY,12);
assert.throws(()=>{body.health=0;},TypeError);
opponents.step(.1,{...wave,enemies:wave.enemies.map(e=>({...e}))},ctx);
assert.equal(opponents.bodies,bodies,'repeated host snapshots never rebuild the active wave');
assert.equal(opponents.shotTargets()[0],shot);
assert.equal(opponents.hitByShot(body.id,25,ray(body)).hits,1);assert.equal(body.health,75);
assert.equal(opponents.hitByShot(body.id,25,ray(body)).hits,0,'same-frame pellet/repeat guard');
for(let i=0;i<3;i++)opponents.step(.1,wave,ctx);
visible=false;assert.equal(opponents.hitByShot(body.id,25,ray(body)).hits,0);visible=true;
assert.equal(opponents.hitByShot(body.id,25,{...ray(body),dx:1,dz:0}).hits,0,'missed capsule cannot damage');
assert.equal(opponents.hitByShot(body.id,25,{...ray(body),interiorId:'indoors'}).hits,0);
assert.equal(opponents.strike({x:body.x,z:body.z+15,yaw:0,range:100,damage:100}).hits,0,'inflated melee range is capped');
assert.equal(opponents.strike({x:body.x,z:body.z+1,yaw:Math.PI,damage:100}).hits,0);
assert.equal(opponents.strike({x:body.x,z:body.z+1,yaw:0,damage:100}).hits,1);
assert(body.dead&&body.active);assert(!opponents.shotTargets().some(t=>t.id===body.id));
const receipt=opponents.drainEvents();assert.deepEqual(receipt,[{type:'defeated',missionId,targetId:body.id,encounterId,serial:1,outcome:'killed'}]);
assert.equal(opponents.hitByShot(body.id,100,ray(body)).hits,0);assert.deepEqual(opponents.drainEvents(),[]);
const paused=opponents.bodies.map(b=>[b.x,b.z,b.health]);
opponents.step(30,wave,{...ctx,paused:true});assert.equal(opponents.shotTargets().length,0);
assert.equal(opponents.hitByShot(bodies[1].id,100,ray(bodies[1])).hits,0);assert.deepEqual(opponents.bodies.map(b=>[b.x,b.z,b.health]),paused);
for(const denied of [{onFoot:false},{active:false},{health:0},{recovering:true},{player:{...ctx.player,interiorId:'room'}},{missionId:'other'},{encounterId:'other'}]){
 opponents.step(.1,wave,{...ctx,...denied});assert.equal(opponents.shotTargets().length,0);
}
const beforeAttacks=playerHits;visible=false;
for(let i=0;i<50;i++)opponents.step(.1,wave,ctx);assert.equal(playerHits,beforeAttacks,'physical obstruction prevents enemy attacks');
visible=true;for(let i=0;i<30;i++)opponents.step(.1,wave,{...ctx,onFoot:false});assert.equal(playerHits,beforeAttacks,'no airborne/parachute attacks');
for(let i=0;i<50;i++)opponents.step(.1,wave,ctx);
assert(playerHits>beforeAttacks&&playerHits-beforeAttacks<=9,'bounded ordinary cooldown attacks only while on foot');
const corpse=bodies[0];opponents.step(.1,{...wave,stage:'search'},ctx);
assert.equal(opponents.bodies,bodies);assert.equal(opponents.shotTargets().length,0,'cleared waves retain render bodies without combat');
assert(corpse.deathTime>0);
const boss={active:true,stage:'boss',missionId,encounterId:`${missionId}:boss`,enemies:[{...wave.enemies[0],targetId:'foreman',encounterId:`${missionId}:boss`,health:220}]};
opponents.step(0,boss,ctx);assert.equal(opponents.bodies.length,1);assert(!body.active,'old wave bodies become inactive');
const foreman=opponents.bodies[0];assert.equal(foreman.health,220);
for(const health of [120,20,0]){
 assert.equal(opponents.hitByShot(foreman.id,100,ray(foreman)).hits,1);assert.equal(foreman.health,health);
 for(let i=0;i<3;i++)opponents.step(.1,boss,ctx);
}
assert.equal(opponents.drainEvents()[0].serial,2,'receipt serial spans waves and boss');
opponents.step(.1,{active:false},ctx);assert.equal(opponents.bodies.length,0);
opponents.step(0,wave,ctx);assert.equal(opponents.hitByShot('enemy0',100,ray(opponents.bodies[0])).hits,1);
assert.equal(opponents.drainEvents()[0].serial,3,'receipt freshness survives clear and repeat');
opponents.dispose();opponents.dispose();opponents.step(.1,wave,ctx);assert.equal(opponents.bodies.length,0);

// The actual repeatable job accepts real HP-zero receipts from this owner.
const job=createSkylineJob({groundHeightAt:()=>12});job.start();
for(let i=0;i<300&&['freefall','flare'].includes(job.snapshot().stage);i++){
 const p=job.snapshot().pose,target=job.layout.landing,dx=target.x-p.x,dz=target.z-p.z,d=Math.max(2.4,Math.hypot(dx,dz));
 job.step(.1,{}, {steerX:dx/d,steerZ:dz/d});
}
job.step(.1,{onFoot:true,player:job.layout.landing});job.step(.1,{onFoot:true,player:job.layout.searches[0]});
assert.equal(job.snapshot().stage,'encounter');
const real=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>true});
const realCtx={...ctx,player:job.layout.searches[0]};real.step(0,job.snapshot(),realCtx);
for(const enemy of real.bodies)assert.equal(real.hitByShot(enemy.id,100,ray(enemy)).hits,1);
const realReceipts=real.drainEvents();assert.equal(realReceipts.length,4);
job.step(.1,{onFoot:true,player:job.layout.searches[0],enemyOutcomes:realReceipts});
assert.equal(job.snapshot().stage,'search','actual combat completion unlocks the actual job cache');
assert(job.interact({onFoot:true,player:job.layout.searches[0]}).ok);
real.step(0,job.snapshot(),realCtx);assert.equal(real.shotTargets().length,0,'counted response cannot attack early');
for(let i=0;i<16;i++)job.step(.25,realCtx);
assert.equal(job.snapshot().encounterKind,'reinforcement');real.step(0,job.snapshot(),realCtx);
assert.equal(real.bodies.length,2);assert(real.bodies.every(body=>body.health===90),'followup wave has fresh real health');
for(const enemy of real.bodies)assert.equal(real.hitByShot(enemy.id,100,ray(enemy)).hits,1);
const followup=real.drainEvents();assert(followup.every(e=>e.serial>4&&e.encounterId!==realReceipts[0].encounterId));
job.step(.1,{onFoot:true,player:job.layout.searches[0],enemyOutcomes:followup});assert.equal(job.snapshot().stage,'capture');
assert(job.interact({onFoot:true,player:job.layout.searches[0]}).ok);assert.equal(job.snapshot().stage,'approach');
real.dispose();
const unsafe=createSkylineOpponents({heightAt:()=>12,hasLineOfSight:()=>true,clipMovement:()=>({dx:900,dz:0})});
unsafe.step(.1,wave,ctx);assert.equal(unsafe.bodies[0].x,wave.enemies[0].x,'unbounded movement callback cannot teleport an opponent');unsafe.dispose();
console.log('PASS Skyline opponents: four bounded original adults, stable bodies/capsules, real shot/melee HP,220HP boss, matching encounter/space/LOS/airborne/pause guards, cooldown attacks, corpse/replay/disposal and actual job receipt progression');
