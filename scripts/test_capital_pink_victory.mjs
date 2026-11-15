import assert from 'node:assert/strict';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';

const plan={id:'pink-room',storeId:'noodle-store',type:'shop',variant:'noodles',floorY:3,
  origin:{x:0,z:0,yaw:0},width:10,depth:14,walls:[],doors:[],activities:[],
  boothGuest:{x:3,z:8,yaw:-Math.PI/2},furniture:[{kind:'banquette',x:3,z:8,yaw:0,width:.6,depth:.6}]};
const seen=()=>true;
function fixture() {
  const pool=createInteriorPeople();pool.load(plan);
  const actor={x:3,z:6.8,health:87,interiorId:plan.id};
  const context={actor,hasLineOfSight:seen};
  const id=pool.snapshot().find(p=>p.character==='booth-guest').id;
  const person=()=>pool.snapshot().find(p=>p.id===id);
  const tick=(count,ctx=context)=>{for(let n=0;n<count;n++)pool.update(.1,ctx);};
  const start=()=>{
    assert(pool.startDialogue(id,{...context,scriptedFight:true,victoryRequired:true,missionId:'earmuffs-rematch'}).ok);
    assert(pool.respondDialogue(id,'fight',context).ok);
  };
  const strike=(damage=25,extra={})=>{
    const p=person();return pool.strike({...actor,yaw:Math.atan2(actor.x-p.x,actor.z-p.z),range:2.3,
      damage,kind:'melee',hasLineOfSight:seen,...extra});
  };
  return {pool,actor,context,id,person,tick,start,strike};
}

{
  const f=fixture();f.start();const initial=f.pool.encounter;
  assert.equal(initial.serial,0);assert.equal(initial.missionId,'earmuffs-rematch');
  f.tick(14);assert(f.pool.drainEvents().some(e=>e.type==='noodles-throw'));
  const phase=f.pool.snapshot();f.pool.update(0,f.context);assert.deepEqual(f.pool.snapshot(),phase);
  f.tick(60);const attacks=f.pool.drainEvents();
  assert(attacks.some(e=>e.type==='retaliation'),'readable windups resolve actual melee');
  assert.equal(f.pool.encounter.serial,0,'waiting and Dot punches never grant victory');
  assert.equal(f.pool.encounter.playerHits,0);assert.equal(f.pool.encounter.victory,false);
  assert.equal(f.strike().hits,1);f.tick(7);assert.equal(f.pool.encounter.playerHits,1);
  assert.equal(f.strike().hits,1);f.tick(7);assert.equal(f.pool.encounter.playerHits,2);
  assert.equal(f.pool.encounter.serial,0,'two hits without actual knockdown do not win');
  assert.equal(f.strike().hits,1);f.tick(7);assert.equal(f.strike().hits,1);
  const won=f.pool.encounter;
  assert.equal(won.outcome,'noodle-victory');assert.equal(won.victory,true);assert.equal(won.won,true);
  assert.equal(won.playerHits,4);assert.equal(won.dotHealth,0);assert(f.person().knockdown>0);
  assert.equal(won.serial,1);assert.equal(won.session,1);
  assert.equal(f.pool.drainEvents().filter(e=>e.type==='encounter-complete').length,1);
  f.tick(100);assert.equal(f.pool.encounter.serial,1,'KO cannot repeatedly emit victory');
  assert.equal(f.person().health,0,'modern fight KO cannot auto-heal into an old fight');
  f.pool.load(plan);assert.equal(f.pool.encounter.serial,1);assert.equal(f.pool.encounter.victory,false);
  assert.equal(f.pool.encounter.playerHits,0,'reloading never inherits actual hits or a victory receipt');
}

for(const failure of ['early-ko','single-hit','gun','explosion','other-offender','other-room','no-los']) {
  const f=fixture();f.start();if(failure!=='early-ko')f.tick(14);
  if(failure==='early-ko'||failure==='single-hit')f.strike(100);
  else if(failure==='gun'||failure==='explosion')f.strike(100,{kind:failure==='gun'?'firearm':'explosion'});
  else if(failure==='other-offender')f.strike(100,{offenderId:'ally'});
  else if(failure==='other-room')f.strike(100,{interiorId:'another-room'});
  else f.strike(100,{hasLineOfSight:undefined});
  assert.equal(f.pool.encounter.victory,false,failure);assert.equal(f.pool.encounter.serial,0,failure);
  assert.equal(f.pool.encounter.phase,'retry',failure);
  f.tick(35);
  assert.equal(f.pool.encounter.phase,'retry','retry remains available after interrupted bowl cleanup and knockdown recovery');
  const playerBefore={...f.actor},dotBefore=f.person().health;
  assert(f.pool.startDialogue(f.id,{...f.context,scriptedFight:true,victoryRequired:true,missionId:'earmuffs-rematch'}).ok);
  assert.equal(f.person().health,dotBefore,'opening retry dialogue alone cannot reset Dot');
  assert.equal(f.pool.respondDialogue(f.id,'apologise',f.context).ok,false);
  assert(f.pool.respondDialogue(f.id,'fight',f.context).ok);
  assert.equal(f.person().health,100,'only explicit fresh rematch resets Dot health');
  assert.equal(f.pool.encounter.playerHits,0);assert.equal(f.pool.encounter.session,2);
  assert.deepEqual(f.actor,playerBefore,'rematch cannot heal or reposition the player');
  assert.equal(f.pool.encounter.serial,0);
}

{
  const f=fixture();f.start();f.tick(14);
  const position={x:f.person().x,z:f.person().z};
  f.tick(10,{...f.context,actor:{...f.actor,interiorId:'other-room'}});
  assert.equal(f.pool.encounter.phase,'retry');assert.equal(f.pool.encounter.serial,0);
  assert.deepEqual({x:f.person().x,z:f.person().z},position,'Dot never pursues another room');
}

{
  const f=fixture();const targets=f.pool.shotTargets(),body=targets.find(p=>p.id===f.id);
  assert(Object.isFrozen(targets)&&Object.isFrozen(body));assert(targets.length<=16);
  assert.equal(body.feetY,3);assert.equal(body.height,1.8);assert.equal(body.radius,.36);
  const ray={x:body.x,y:3.9,z:body.z-2,dx:0,dy:0,dz:1,range:4,interiorId:plan.id,targetId:f.id};
  for(const bad of [{...ray,y:8},{...ray,interiorId:null},{...ray,dx:2},{...ray,range:NaN},{...ray,targetId:'missing'}]) {
    assert.equal(f.pool.hitByShot(f.id,25,bad),false);assert.equal(body.health,100);
  }
  for(const damage of [0,-1,Infinity,101])assert.equal(f.pool.hitByShot(f.id,damage,ray),false);
  assert.equal(f.pool.hitByShot('missing',25,ray),false);
  assert(f.pool.hitByShot(f.id,25,ray));assert.equal(body.health,75);
  assert.equal(f.pool.hitByShot(f.id,25,ray),false,'duplicate same-frame impact cannot apply twice');
  assert.equal(f.pool.drainEvents().filter(e=>e.type==='witness').length,1);
  assert.equal(f.pool.encounter.playerHits,0,'actual firearm damage never counts as a fist hit');
  f.pool.clear();assert.equal(f.pool.shotTargets().length,0);assert.equal(f.pool.hitByShot(f.id,25,ray),false);
}

// Use the actual generated booth furniture as well as the open-floor authority fixture.
{
  const yaw=.7,building={id:'b',type:'retail',height:4,points:[[-12,0],[12,0],[12,30],[-12,30]]};
  const interiors=createInteriors({buildings:[building],interiorEntries:[{buildingId:'b',x:0,z:0,nx:Math.sin(yaw),nz:Math.cos(yaw)}]},
    {heightAt:()=>3,stores:[{id:'s',buildingId:'b',name:'Noodle',frontage:{x:0,z:0,yaw,width:6.2},interiorType:'noodle-shop'}]});
  const entry=interiors.entries[0],actor={x:entry.x-Math.sin(yaw),z:entry.z-Math.cos(yaw),y:3,yaw,health:100};
  const actualPlan=interiors.enter(entry,actor),pool=createInteriorPeople();pool.load(actualPlan);
  const guest=pool.snapshot().find(p=>p.character==='booth-guest');
  Object.assign(actor,{x:guest.x-Math.sin(yaw)*1.2,z:guest.z-Math.cos(yaw)*1.2,interiorId:actualPlan.id});
  const context={actor,hasLineOfSight:interiors.hasLineOfSight};
  assert(pool.startDialogue(guest.id,{...context,victoryRequired:true,scriptedFight:true,missionId:'actual-room'}).ok);
  assert(pool.respondDialogue(guest.id,'fight',context).ok);
  assert.equal(pool.snapshot().find(p=>p.id===guest.id).seated,false,'Dot stands on clear floor beside the real long booth');
  for(let n=0;n<14;n++)pool.update(.1,context);
  for(let hit=0;hit<4;hit++) {
    const p=pool.snapshot().find(p=>p.id===guest.id);
    const strike=pool.strike({...actor,yaw:Math.atan2(actor.x-p.x,actor.z-p.z),range:2.3,damage:25,kind:'melee',hasLineOfSight:interiors.hasLineOfSight});
    assert(strike.people.some(person=>person.id===guest.id&&person.health===100-(hit+1)*25));
    for(let n=0;n<7;n++)pool.update(.1,context);
  }
  assert.equal(pool.encounter.victory,true,'the real rotated room supports the complete fight with actual furniture sight');
}

console.log('PASS Pink Earmuffs actual melee victory, authoritative KO, windup/recovery, fresh rematches, room/LOS/offender gates, serial/reload safety and live indoor ballistic bodies');
