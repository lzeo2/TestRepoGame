import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const url=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const {createInteriorPeople}=await import(url(await read('../Games/Capital Drive/interior-people.js')));
const {createInteriors,createSchoolEntry}=await import(new URL('../Games/Capital Drive/interiors.js',import.meta.url));
function make(type,variant,yaw=.7,width=8,withRoom=false) {
  const building={id:'b',type:type==='house'?'house':'retail',height:4,points:[[-12,0],[12,0],[12,30],[-12,30]]};
  const options={heightAt:()=>3};
  const map={buildings:[building],interiorEntries:[{buildingId:'b',x:0,z:0,nx:Math.sin(yaw),nz:Math.cos(yaw)}]};
  if(type==='shop') options.stores=[{id:'s',buildingId:'b',name:'Fictional shop',frontage:{x:0,z:0,yaw,width},...(variant?{interiorType:'noodle-shop'}:{})}];
  if(type==='mall'||type==='gym') options.publicEntries=[{id:'public',buildingId:'b',x:0,z:0,yaw,type}];
  const interiors=createInteriors(map,options),entry=interiors.entries[0];
  assert(entry,`${type} fixture entry`);
  const actor={x:entry.x-Math.sin(yaw),z:entry.z-Math.cos(yaw),y:3,yaw};
  const plan=interiors.enter(entry,actor);
  return withRoom ? {plan,interiors} : plan;
}
const schoolMap=JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const schoolDoor=createSchoolEntry(schoolMap);assert(schoolDoor,'actual retained school building has an entry');
const schoolInteriors=createInteriors(schoolMap,{publicEntries:[schoolDoor],heightAt:()=>3});
assert.equal(schoolInteriors.stats.generatedPlans,0,'school room remains lazy before entry');
const schoolVisitor={...schoolDoor.approach,y:3,yaw:schoolDoor.yaw};
const schoolPlan=schoolInteriors.enter(schoolInteriors.findEntry(schoolVisitor),schoolVisitor);
assert(schoolPlan&&schoolPlan.type==='school');assert.equal(schoolInteriors.stats.activePlans,1);
const plans=[make('house'),make('shop'),make('shop','noodles'),make('shop','noodles',-1.2,6.2),make('mall'),make('gym'),schoolPlan];
const pool=createInteriorPeople();assert.equal(pool.stats.count,0);
for(const plan of plans) {
  const source=structuredClone(plan);pool.load(plan);const before=pool.snapshot();
  assert(before.length>0,`${plan.type} is populated`);assert(before.length<=16);
  if(plan.variant==='noodles') {
    for(const role of ['cook','cashier','diner']) assert(before.some(p=>p.role===role),`restaurant ${role}`);
    assert(before.filter(p=>p.seated).length>=3);
    if(plan.noodleCook) {
      const cook=before.find(p=>p.character==='noodle-puller'),guest=before.find(p=>p.character==='booth-guest');
      assert(cook&&guest,'authored markers populate kitchen window and actual corner booth');
      assert.equal(cook.gesture,'pull-noodles');assert(guest.earmuffs&&guest.seated);
      assert.equal(cook.x,plan.noodleCook.x);assert.equal(cook.z,plan.noodleCook.z);
      assert.equal(guest.x,plan.boothGuest.x);assert.equal(guest.z,plan.boothGuest.z);
    }
    const pass=plan.furniture.find(f=>f.kind==='kitchen-pass');
    for(const p of before) {
      const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),localX=c*(p.x-plan.origin.x)-s*(p.z-plan.origin.z);
      if(p.role==='diner') assert(localX>.96,'all dining is right of the central aisle');
      else {
        const passX=c*(pass.x-plan.origin.x)-s*(pass.z-plan.origin.z);
        assert(localX<passX-pass.width/2-p.radius,'staff stay behind the left service pass');
        assert(Math.abs(p.yaw-(p.gesture==='pull-noodles'?plan.noodleCook.yaw:plan.origin.yaw+Math.PI/2))<1e-6,'staff face their work station');
        for(const box of plan.furniture) {
          const bc=Math.cos(box.yaw),bs=Math.sin(box.yaw),x=bc*(p.x-box.x)-bs*(p.z-box.z),z=bs*(p.x-box.x)+bc*(p.z-box.z);
          assert(Math.hypot(Math.max(0,Math.abs(x)-box.width/2),Math.max(0,Math.abs(z)-box.depth/2))>=p.radius,'staff do not overlap kitchen solids');
        }
      }
    }
  }
  if(plan.type==='gym') assert(before.some(p=>p.role==='trainer')&&before.some(p=>p.role==='exerciser'));
  if(plan.type==='school') {
    assert(before.length>=1&&before.length<=2,'school uses only one or two bounded adult staff');
    assert(before.every(p=>p.adult&&['custodian','school-staff'].includes(p.role)&&!p.apron&&p.storeId===null));
    assert(before.some(p=>p.role==='custodian'));assert(before.some(p=>p.role==='school-staff'));
    assert.equal(plan.counter,null);assert(!('storeId' in plan));
    assert(before.every(p=>pool.getCrimeTarget(p.id)===null),'school staff have no cashier or till economy');
    assert.equal(pool.nearestDialogue(plan.spawn,{hasLineOfSight:()=>true}),null,'school staff do not inherit booth dialogue');
  }

  for(let tick=0;tick<200;tick++) {
    pool.update(.1,{actor:plan.spawn});
    for(const p of pool.snapshot()) {
      assert(p.adult);assert([p.x,p.z,p.y,p.yaw,p.phase].every(Number.isFinite));
      const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),x=c*(p.x-plan.origin.x)-s*(p.z-plan.origin.z);
      assert(Math.abs(x)>=.96,'central passage remains clear');
      for(const d of plan.doors) assert(Math.hypot(d.x-p.x,d.z-p.z)>=(d.width||1.5)/2+.45-1e-6,'doors remain clear');
      if(plan.counter) assert(Math.hypot(plan.counter.x-p.x,plan.counter.z-p.z)>=1.45-1e-6,'counter interaction remains clear');
      for(const station of plan.activities || []) assert(Math.hypot(station.x-p.x,station.z-p.z)>=Math.min(1.1,station.radius || 1)-1e-6,'activity approaches remain clear');
      if(plan.type==='school') for(const box of [...plan.walls,...plan.furniture]) {
        const bc=Math.cos(box.yaw),bs=Math.sin(box.yaw),bx=bc*(p.x-box.x)-bs*(p.z-box.z),bz=bs*(p.x-box.x)+bc*(p.z-box.z);
        assert(Math.hypot(Math.max(0,Math.abs(bx)-box.width/2),Math.max(0,Math.abs(bz)-box.depth/2))>=p.radius+.08-1e-6,'school staff routes avoid actual walls and furniture');
      }

    }
  }
  const paused=pool.snapshot();pool.update(0,{actor:plan.spawn});assert.deepEqual(pool.snapshot(),paused);
  if(plan.type==='school') {
    assert.equal(pool.drainEvents().length,0,'ordinary staff routines emit no alarm or offence');
    const source=before[0];
    assert.equal(pool.alert({...source,kind:'alarm',hasLineOfSight:()=>false}),0,'existing alarm reaction respects live sight');
    assert(pool.alert({...source,kind:'alarm',hasLineOfSight:()=>true})>0);
    assert(pool.snapshot().some(p=>p.reaction==='panic'),'actual controller alert can scare adult staff');
    assert(pool.drainEvents().every(e=>e.type==='witness'&&e.kind==='alarm'),'staff reaction stays within existing witness boundary');
  }

  const person=paused[0],actor={x:person.x-3,z:person.z};
  const clipped=pool.clipMovement(actor,6,0,.45);assert(clipped.blocked&&clipped.dx<3,'swept collision cannot tunnel');
  assert.deepEqual(actor,{x:person.x-3,z:person.z},'clip leaves actor authority to controller');
  const escape=pool.clipMovement({x:person.x-.2,z:person.z},-1,0,.45);assert.equal(escape.dx,-1,'existing contact can move away');
  const changed=pool.snapshot();assert(Object.isFrozen(changed[0]));assert.deepEqual(plan,source,'plan is immutable input');
  pool.clear();assert.equal(pool.snapshot().length,0);assert.equal(pool.stats.active,null);
  pool.load(plan);assert.deepEqual(pool.snapshot(),before,'visits reset deterministic population');
}
assert(schoolInteriors.leave(schoolVisitor));assert.equal(schoolInteriors.stats.activePlans,0,'school plan disposes on exit');
assert.deepEqual(pool.clipMovement({x:0,z:0},NaN,0),{dx:0,dz:0,blocked:true});
// The ordinary Fight choice is reachable from the real restaurant aisle without crossing a seat/table.
for(const yaw of [.7,-1.2]) {
  const {plan,interiors}=make('shop','noodles',yaw,6.2,true),ordinary=createInteriorPeople();
  ordinary.load(plan);
  const guest=ordinary.snapshot().find(p=>p.character==='booth-guest'),actor={...plan.spawn};
  const world=(x,z)=>({x:plan.origin.x+Math.cos(yaw)*x+Math.sin(yaw)*z,z:plan.origin.z-Math.sin(yaw)*x+Math.cos(yaw)*z});
  for(const target of [world(0,10.6),world(.55,10.6)]) {
    const dx=target.x-actor.x,dz=target.z-actor.z,steps=Math.ceil(Math.hypot(dx,dz)/.15);
    for(let i=0;i<steps;i++) {
      const move=ordinary.clipMovement(actor,dx/steps,dz/steps,.45);
      assert.equal(move.blocked,false,'approach does not cross another adult');
      assert.equal(interiors.moveActor(actor,move.dx,move.dz,.45).blocked,false,'approach uses actual clear floor');
    }
    assert(Math.hypot(actor.x-target.x,actor.z-target.z)<1e-6);
  }
  const context={actor,hasLineOfSight:interiors.hasLineOfSight},serial=ordinary.encounter.serial;
  assert.equal(ordinary.nearestDialogue(actor,context).id,guest.id);
  const dialogue=ordinary.startDialogue(guest.id,{...context,scriptedFight:false});
  assert(dialogue.dialogue.choices.some(c=>c.id==='fight'&&c.label==='Fight'));
  assert(ordinary.respondDialogue(guest.id,'fight',context).ok);
  assert.equal(ordinary.encounter.phase,'noodle-windup');assert.equal(ordinary.encounter.serial,serial);
  const paused=ordinary.snapshot();ordinary.update(0,context);assert.deepEqual(ordinary.snapshot(),paused);
  for(let i=0;i<10;i++)ordinary.update(.1,{actor,hasLineOfSight:()=>false});
  assert.equal(ordinary.drainEvents().length,0,'blocked ordinary windup cannot throw or complete');
  for(let i=0;i<8;i++)ordinary.update(.1,context);
  assert.deepEqual(ordinary.drainEvents().map(e=>e.type),['noodles-throw']);
  assert.equal(ordinary.encounter.serial,serial,'ordinary throw alone earns no encounter credit');
  for(let i=0;i<6;i++)ordinary.update(.1,context);
  assert.equal(ordinary.encounter.serial,serial,'flight alone earns no encounter credit');
  const strike={x:actor.x,z:actor.z,yaw:Math.atan2(actor.x-guest.x,actor.z-guest.z),range:2.3,damage:25,kind:'melee',hasLineOfSight:interiors.hasLineOfSight};
  const hit=ordinary.strike(strike);assert(hit.people.some(p=>p.id===guest.id&&p.health===75),'actual player punch reduces Dot health');
  ordinary.drainEvents();
  for(let i=0;i<6;i++)ordinary.update(.1,context);
  assert.equal(ordinary.drainEvents().length,0,'stun interrupts the current punch fairly');
  for(let i=0;i<5;i++)ordinary.update(.1,{actor:{...actor,health:0},hasLineOfSight:interiors.hasLineOfSight});
  assert.equal(ordinary.drainEvents().length,0,'dead target cannot receive retaliation or completion');
  ordinary.update(.1,context);
  assert.deepEqual(ordinary.drainEvents().map(e=>e.type),['retaliation','encounter-complete'],'Dot fights back after a real player strike and stun');
  assert.equal(ordinary.encounter.outcome,'confrontation','ordinary Fight cannot supply mission noodle-fight outcome');
  assert.equal(ordinary.encounter.serial,serial+1);
  for(let i=0;i<80;i++)ordinary.update(.1,{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:()=>true});
  assert.equal(ordinary.drainEvents().length,0,'remote player cannot be attacked');
  ordinary.update(.1,context);
  assert.deepEqual(ordinary.drainEvents().map(e=>e.type),['retaliation'],'ordinary fight remains active beyond the old six-second window');
  ordinary.strike({...strike,kind:'pistol',damage:10});ordinary.drainEvents();
  for(let i=0;i<30;i++)ordinary.update(.1,context);
  assert.equal(ordinary.drainEvents().filter(e=>e.type==='retaliation').length,0,'gun damage ends fist retaliation');
  ordinary.load(plan);ordinary.startDialogue(guest.id,context);ordinary.respondDialogue(guest.id,'fight',context);
  ordinary.clear();ordinary.update(.1,context);
  assert.equal(ordinary.drainEvents().length,0);assert.equal(ordinary.snapshot().length,0,'room exit clears the entire fight');
  assert.equal(ordinary.encounter.serial,serial+1,'room exit cannot complete a pending ordinary fight');
}
// Explicit anchor fixture also covers older room plans without the new optional markers.
const encounterPlan=structuredClone(make('shop','noodles',-.4,6.2));
const origin=encounterPlan.origin;
const world=(x,z)=>({x:origin.x+Math.cos(origin.yaw)*x+Math.sin(origin.yaw)*z,z:origin.z-Math.sin(origin.yaw)*x+Math.cos(origin.yaw)*z});
encounterPlan.noodleCook={...world(-2.15,2.1),yaw:origin.yaw+Math.PI};
encounterPlan.boothGuest={...world(encounterPlan.width/2-.48,10.6),yaw:origin.yaw-Math.PI/2};
const rear=encounterPlan.furniture.find(f=>f.kind==='noodle-table'&&Math.hypot(f.x-world(2.05,10.6).x,f.z-world(2.05,10.6).z)<.1);
if(rear)Object.assign(rear,world(1.8,10.6));
pool.load(encounterPlan);
const cook=pool.snapshot().find(p=>p.character==='noodle-puller'),guest=pool.snapshot().find(p=>p.character==='booth-guest');
assert(cook&&guest,'window cook and actual booth guest spawn');
assert.equal(cook.gesture,'pull-noodles');assert(guest.seated&&guest.earmuffs);assert.equal(guest.seatHeight,.55);
const actor={...world(encounterPlan.width/2-.48,9.4)},seen=()=>true,blocked=()=>false;
const context={actor,hasLineOfSight:seen};
assert.equal(pool.nearestDialogue(actor,{hasLineOfSight:blocked}),null);
assert.equal(pool.nearestDialogue({x:0,z:-100},{hasLineOfSight:seen}),null);
assert.equal(pool.nearestDialogue(actor),null,'dialogue requires a live visibility check');
assert.equal(pool.startDialogue('missing',context).ok,false);
assert.equal(pool.encounter.serial,0);
const dialogue=pool.startDialogue(guest.id,context);assert(dialogue.ok&&Object.isFrozen(dialogue.dialogue));
assert(pool.startDialogue(guest.id,context).ok,'reopening resumes the same pending dialogue');
assert.equal(pool.encounter.serial,0,'pending resume never completes an encounter');assert.equal(pool.drainEvents().length,0);
assert.equal(pool.nearestDialogue(actor,{hasLineOfSight:seen}).id,guest.id);
assert.equal(pool.nearestDialogue(actor,{hasLineOfSight:blocked}),null);
assert.equal(pool.startDialogue(guest.id,{actor,hasLineOfSight:blocked}).ok,false,'occluded pending dialogue cannot resume');
assert.equal(pool.startDialogue(guest.id,{actor:{x:0,z:-100},hasLineOfSight:seen}).ok,false,'remote pending dialogue cannot resume');
assert.equal(pool.encounter.phase,'dialogue');assert.equal(pool.encounter.serial,0);
assert.equal(pool.respondDialogue(guest.id,'invalid',context).ok,false);
assert.equal(pool.respondDialogue(guest.id,'apologise',{actor,hasLineOfSight:blocked}).ok,false);
assert(pool.respondDialogue(guest.id,'apologise',context).ok);
assert.equal(pool.encounter.serial,1);assert.equal(pool.encounter.outcome,'peaceful');
assert.equal(pool.respondDialogue(guest.id,'confront',context).ok,false);
assert.deepEqual(pool.drainEvents().map(e=>e.type),['encounter-complete'],'talking creates no offence or money');
pool.load(encounterPlan);assert.equal(pool.encounter.serial,1,'visit clear cannot rewind serial');
assert(pool.startDialogue(guest.id,context).ok);assert(pool.respondDialogue(guest.id,'confront',context).ok);
const frozen=pool.snapshot();pool.update(0,context);assert.deepEqual(pool.snapshot(),frozen);
for(let i=0;i<12;i++)pool.update(.1,{actor,hasLineOfSight:blocked});
assert.equal(pool.drainEvents().length,0,'walls prevent retaliation and completion');assert.equal(pool.encounter.serial,1);
pool.update(.1,context);const fight=pool.drainEvents();
assert.deepEqual(fight.map(e=>e.type),['retaliation','encounter-complete']);
assert.equal(fight[0].damage,5);assert.equal(pool.encounter.serial,2);assert.equal(pool.encounter.outcome,'confrontation');
const punch=pool.snapshot().find(p=>p.id===guest.id);assert.equal(punch.attackTimer,.65);assert.equal(punch.attackSerial,1);
pool.update(0,context);assert.equal(pool.snapshot().find(p=>p.id===guest.id).attackTimer,.65,'pause freezes the emitted punch');
pool.update(.1,context);assert.equal(pool.snapshot().find(p=>p.id===guest.id).attackTimer,.55);

for(let i=0;i<10;i++)pool.update(.1,context);assert.equal(pool.drainEvents().length,0,'retaliation cooldown');
for(let i=0;i<15;i++)pool.update(.1,{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen});assert.equal(pool.drainEvents().length,0,'distance rechecked live');
const strikeOrigin={x:guest.x,z:guest.z-1,yaw:Math.PI};
assert(pool.strike({...strikeOrigin,damage:100,range:2,hasLineOfSight:seen}).hits>0);
assert.equal(pool.snapshot().find(p=>p.id===guest.id).attackTimer,0,'a hit/death cancels the current punch pose');
for(let i=0;i<15;i++)pool.update(.1,context);assert.equal(pool.drainEvents().filter(e=>e.type==='retaliation').length,0,'dead guest cannot retaliate');
// Explicit controller context can downgrade a pending story conversation after cancel/switch.
for(const choice of ['apologise','confront']) {
  const pending=createInteriorPeople();pending.load(encounterPlan);
  assert(pending.startDialogue(guest.id,{...context,scriptedFight:false}).ok);
  assert(pending.startDialogue(guest.id,{...context,scriptedFight:true}).ok,'new mission upgrades pending ordinary dialogue');
  assert(pending.startDialogue(guest.id,context).ok,'omitted option resumes the selected context');
  assert(pending.startDialogue(guest.id,{...context,scriptedFight:false}).ok,'cancelled mission explicitly restores ordinary dialogue');
  assert(pending.startDialogue(guest.id,context).ok);
  assert(pending.respondDialogue(guest.id,choice,context).ok);
  if(choice==='confront')for(let i=0;i<8;i++)pending.update(.1,context);
  assert.equal(pending.encounter.outcome,choice==='apologise'?'peaceful':'confrontation');
  assert.equal(pending.encounter.serial,1);
  assert.equal(pending.snapshot().find(p=>p.id===guest.id).noodleThrow,null);
  assert.equal(pending.drainEvents().filter(e=>e.type==='noodles-throw').length,0,'ordinary choices never inherit scripted throw');
}
const retryContext=createInteriorPeople();retryContext.load(encounterPlan);
retryContext.startDialogue(guest.id,{...context,scriptedFight:true});retryContext.respondDialogue(guest.id,'confront',context);
retryContext.strike({...strikeOrigin,damage:20,range:2,hasLineOfSight:seen});retryContext.update(.1,context);
for(let i=0;i<130;i++)retryContext.update(.1,{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen});
assert.equal(retryContext.encounter.phase,'interrupted');
assert(retryContext.startDialogue(guest.id,{...context,scriptedFight:false}).ok,'explicit ordinary context also downgrades a calm retry');
retryContext.respondDialogue(guest.id,'apologise',context);assert.equal(retryContext.encounter.outcome,'peaceful');
const omittedContext=createInteriorPeople();omittedContext.load(encounterPlan);
omittedContext.startDialogue(guest.id,{...context,scriptedFight:true});
assert.equal(omittedContext.startDialogue(guest.id,{actor,hasLineOfSight:blocked,scriptedFight:false}).ok,false);
omittedContext.startDialogue(guest.id,context);omittedContext.respondDialogue(guest.id,'apologise',context);
assert.equal(omittedContext.encounter.phase,'noodle-windup','invalid explicit override cannot mutate a pending mission context');
// Rowan's story encounter must physically throw before the same guest emits melee.
let throwPose=null,flightPose=null;
for (const choice of ['apologise','confront','fight']) {
  pool.load(encounterPlan);const serial=pool.encounter.serial;
  assert(pool.startDialogue(guest.id,{...context,scriptedFight:true}).ok);
  assert(pool.startDialogue(guest.id,context).ok,'Esc/resume preserves the story encounter');
  assert(pool.respondDialogue(guest.id,choice,context).ok);
  assert.equal(pool.encounter.phase,'noodle-windup');assert.equal(pool.encounter.serial,serial);
  throwPose=pool.snapshot();const state=throwPose.find(p=>p.id===guest.id).noodleThrow;
  assert(Object.isFrozen(state));assert.equal(state.actorId,guest.id);assert.equal(state.phase,'windup');
  pool.update(0,context);assert.deepEqual(pool.snapshot(),throwPose,'pause freezes the throw windup');
  for(const invalid of [{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen},{actor,hasLineOfSight:blocked},{actor:{...actor,health:0},hasLineOfSight:seen}]) {
    for(let i=0;i<8;i++)pool.update(.1,invalid);
    assert.equal(pool.snapshot().find(p=>p.id===guest.id).noodleThrow.time,0,'live target gates the throw');
    assert.equal(pool.drainEvents().length,0);assert.equal(pool.encounter.serial,serial);
  }
  for(let i=0;i<8;i++)pool.update(.1,context);
  const thrown=pool.drainEvents();assert.deepEqual(thrown.map(e=>e.type),['noodles-throw']);
  assert.equal(thrown[0].personId,guest.id);assert.equal(thrown[0].targetId,'player');
  assert.equal(pool.encounter.phase,'noodle-flight');assert.equal(pool.encounter.serial,serial,'the actual throw alone never completes lunch');
  flightPose=pool.snapshot();const flight=flightPose.find(p=>p.id===guest.id).noodleThrow;
  assert(Object.isFrozen(flight.from)&&Object.isFrozen(flight.to));assert.equal(flight.to.x,actor.x);
  pool.update(0,context);assert.deepEqual(pool.snapshot(),flightPose,'pause freezes trajectory time');
  const departed={actor:{x:actor.x+100,z:actor.z},hasLineOfSight:blocked};
  pool.update(.1,departed);
  const released=pool.snapshot().find(p=>p.id===guest.id).noodleThrow;
  assert.equal(released.time,.1,'released flight advances after target walks out of sight and reach');
  assert.deepEqual(released.to,flight.to,'released trajectory retains its original destination');
  for(let i=0;i<5;i++)pool.update(.1,departed);
  assert.equal(pool.snapshot().find(p=>p.id===guest.id).noodleThrow,null,'released flight finishes while target is remote');
  assert.equal(pool.drainEvents().length,0,'remote target earns no melee or completion');
  assert.equal(pool.encounter.phase,'angry');assert.equal(pool.encounter.serial,serial);
  for(let i=0;i<6;i++)pool.update(.1,{actor,hasLineOfSight:blocked});
  assert.equal(pool.drainEvents().length,0,'occluded melee cannot finish the story');
  pool.update(.1,{actor:{...actor,health:0},hasLineOfSight:seen});assert.equal(pool.encounter.serial,serial);
  pool.update(.1,context);const fought=pool.drainEvents();
  assert.deepEqual(fought.map(e=>e.type),['retaliation','encounter-complete']);assert.equal(fought[0].kind,'melee');
  assert.equal(pool.encounter.outcome,'noodle-fight');assert.equal(pool.encounter.serial,serial+1);
  assert.equal(pool.respondDialogue(guest.id,choice,context).ok,false);
}
pool.load(encounterPlan);pool.startDialogue(guest.id,context);
assert(pool.startDialogue(guest.id,{...context,scriptedFight:true}).ok,'mission can bind an already pending nearby conversation');
pool.respondDialogue(guest.id,'apologise',context);assert.equal(pool.encounter.phase,'noodle-windup');
pool.strike({...strikeOrigin,damage:100,range:2,hasLineOfSight:seen});pool.drainEvents();
for(let i=0;i<20;i++)pool.update(.1,context);
assert.equal(pool.drainEvents().length,0,'dead guest cannot throw or complete lunch');
pool.load(encounterPlan);const interruptedSerial=pool.encounter.serial;
pool.startDialogue(guest.id,{...context,scriptedFight:true});pool.respondDialogue(guest.id,'confront',context);
assert(pool.strike({...strikeOrigin,damage:20,range:2,hasLineOfSight:seen}).hits>0);
pool.update(.1,context);assert.equal(pool.snapshot().find(p=>p.id===guest.id).noodleThrow,null,'stun cancels a pending throw');
for(let i=0;i<20;i++)pool.update(.1,context);
assert.equal(pool.encounter.serial,interruptedSerial,'interrupted windup cannot become a noodle-fight through ordinary retaliation');
assert.equal(pool.drainEvents().filter(e=>e.type==='noodles-throw').length,0);
assert.equal(pool.startDialogue(guest.id,context).ok,false,'an angry or stunned guest cannot resume prematurely');
for(let i=0;i<100;i++)pool.update(.1,{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen});
assert(pool.nearestDialogue(actor,{hasLineOfSight:seen}),'calm nonlethal interruption can be retried in the same room');
assert(pool.startDialogue(guest.id,context).ok);
assert(pool.respondDialogue(guest.id,'apologise',context).ok);
assert.equal(pool.encounter.phase,'noodle-windup','retry retains the scripted story flag');
assert.equal(pool.encounter.serial,interruptedSerial,'retry never reuses an old throw or attack');
for(let i=0;i<8;i++)pool.update(.1,context);
assert.deepEqual(pool.drainEvents().map(e=>e.type),['noodles-throw'],'retry requires a fresh physical throw');
for(let i=0;i<6;i++)pool.update(.1,context);
assert.equal(pool.encounter.serial,interruptedSerial,'fresh throw and flight alone still cannot complete');
pool.load(encounterPlan);pool.startDialogue(guest.id,{...context,scriptedFight:true});pool.respondDialogue(guest.id,'apologise',context);
pool.clear();pool.update(.1,context);assert.equal(pool.snapshot().length,0);assert.equal(pool.drainEvents().length,0);
assert.equal(pool.encounter.serial,interruptedSerial,'leave clears a pending sequence without earning progress');
// Walking away after the throw must leave a recoverable encounter with no stale credit.
pool.load(encounterPlan);const departedSerial=pool.encounter.serial;
pool.startDialogue(guest.id,{...context,scriptedFight:true});pool.respondDialogue(guest.id,'confront',context);
for(let i=0;i<8;i++)pool.update(.1,context);
assert.deepEqual(pool.drainEvents().map(e=>e.type),['noodles-throw']);
const outOfReach={actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen};
for(let i=0;i<130;i++)pool.update(.1,outOfReach);
assert.equal(pool.encounter.phase,'interrupted','calming after a completed flight safely resets the pending fight');
assert.equal(pool.encounter.serial,departedSerial);assert.equal(pool.drainEvents().length,0);
assert(pool.nearestDialogue(actor,{hasLineOfSight:seen}));assert(pool.startDialogue(guest.id,context).ok);
pool.respondDialogue(guest.id,'apologise',context);assert.equal(pool.encounter.phase,'noodle-windup');
assert.equal(pool.encounter.serial,departedSerial,'returning and talking cannot reuse the earlier throw');
for(let i=0;i<8;i++)pool.update(.1,context);
assert.deepEqual(pool.drainEvents().map(e=>e.type),['noodles-throw'],'retry after timeout emits a fresh throw');
for(let i=0;i<6;i++)pool.update(.1,context);
assert.equal(pool.encounter.serial,departedSerial,'retry still waits for the actual melee emission');
for(let i=0;i<4;i++)pool.update(.1,context);
assert.deepEqual(pool.drainEvents().map(e=>e.type),['retaliation','encounter-complete']);
assert.equal(pool.encounter.serial,departedSerial+1);assert.equal(pool.encounter.outcome,'noodle-fight');
plans.push(encounterPlan);
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace('./three.module.js',threeURL));
const modelURL=url((await read('../Games/Capital Drive/person-model.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL));
const {createInteriorPeopleView}=await import(url((await read('../Games/Capital Drive/interior-people-view.js')).replace('./person-model.js',modelURL)
 .replace('../../assets/car-arcade/vendor/three.module.js',threeURL).replace('../../assets/car-arcade/vendor/BufferGeometryUtils.js',utilsURL)));
const scene=new THREE.Scene(),view=createInteriorPeopleView(scene,()=>3);
assert.equal(scene.children.length,0,'no inactive geometry');assert.equal(view.stats.geometryCount,0);
view.load(encounterPlan);view.update(throwPose,0);
const throwRoot=scene.children[0],throwAccessories=throwRoot.children[5],throwGeometry=throwAccessories.geometry,throwBuffer=throwAccessories.instanceMatrix.array;
assert.equal(view.stats.throwSegmentLimit,12);assert.equal(throwAccessories.count,pool.load(encounterPlan).filter(p=>p.apron).length+6+36+17,'bowl and twelve strands use existing accessory batch');
const windupArms=Array.from(throwRoot.children[4].instanceMatrix.array);
view.update(flightPose,0);assert.notDeepEqual(Array.from(throwRoot.children[4].instanceMatrix.array),windupArms,'throw extension follows authoritative phase');
const flightMatrices=Array.from(throwBuffer);view.update(flightPose,100);
assert.deepEqual(Array.from(throwBuffer),flightMatrices,'renderer has no independent projectile clock');
const advancedFlight=flightPose.map(p=>p.noodleThrow?{...p,noodleThrow:{...p.noodleThrow,time:.3}}:p);
view.update(advancedFlight,0);assert.notDeepEqual(Array.from(throwBuffer),flightMatrices,'supplied trajectory time moves the bowl');
assert.equal(throwAccessories.geometry,throwGeometry);assert.equal(throwAccessories.instanceMatrix.array,throwBuffer);
assert(view.stats.drawCalls<=6);for(const mesh of throwRoot.children)assert(mesh.count<=mesh.instanceMatrix.count);
view.clear();
let disposedGeometry=0,disposedMaterial=0,disposedMesh=0;
for(const plan of plans) {
  pool.load(plan);view.load(plan);view.update(pool.snapshot(),.1);
  assert.equal(view.stats.people,pool.stats.count);assert(view.stats.drawCalls<=6);
  const root=scene.children[0];assert.equal(root.children.length,6);
  for(const mesh of root.children){
    mesh.geometry.addEventListener('dispose',()=>disposedGeometry++);
    mesh.addEventListener('dispose',()=>disposedMesh++);
  }
  root.children[0].material.addEventListener('dispose',()=>disposedMaterial++);
  function matrices(){for(const mesh of root.children)assert(mesh.instanceMatrix.array.every(Number.isFinite),'finite transforms');}
  matrices();
  for(const mesh of root.children)assert(mesh.count<=mesh.instanceMatrix.count,'bounded instance capacity');
  assert(view.stats.sharedModel);assert.equal(view.stats.noodleSegmentLimit,36);
  if(plan.noodleCook) {
    const people=pool.snapshot(),accessories=root.children[5],before=Array.from(accessories.instanceMatrix.array);
    view.update(people.map(p=>({...p,phase:p.phase+.7})),.1);matrices();
    assert.notDeepEqual(Array.from(accessories.instanceMatrix.array),before,'supplied phase animates hand-pulled strands');
    const calmCount=accessories.count;
    view.update(people.map(p=>p.character==='noodle-puller'?{...p,reaction:'stunned',stun:1}:p),.1);
    assert.equal(accessories.count,calmCount-36,'stun hides noodle strands');
  }
  if(plan.exercise) {
    const original=pool.snapshot();view.update(original,0,{activity:{active:true,kind:'bench',exercisePose:'bench',station:plan.activities.find(s=>s.kind==='bench'),lift:1,reps:3}});matrices();
    assert.equal(root.children[0].count,original.length+1,'temporary lying player');assert(view.stats.drawCalls<=6);
    assert.deepEqual(pool.snapshot(),original,'visual exercise never changes simulation');
    view.update(original,0,{activity:{active:false,kind:'bench',lift:0,reps:6}});assert.equal(root.children[0].count,original.length,'completed bench removes the temporary lying player');
    assert(root.children[5].count>=3,'resting racked bar remains visible');
  }
  if(plan.type==='gym') {
    const original=pool.snapshot();
    for(const kind of ['bench','treadmill','curls','rower']) {
      const station=plan.activities.find(s=>s.kind===kind);assert(station,`actual ${kind} station`);
      const activity={active:true,kind,exercisePose:kind,station,lift:0,reps:0};
      view.update(original,0,{activity});matrices();
      assert.equal(root.children[0].count,original.length+1,`${kind} shows one participating player`);
      assert(Object.isFrozen(view.exerciseFocus));
      const focus=view.exerciseFocus,equipment=plan.furniture.find(f=>f.kind===kind);
      if(equipment)assert(Math.hypot(focus.x-equipment.x,focus.z-equipment.z)<.35,`${kind} participant anchored on actual equipment`);
      if(kind==='curls')assert.equal(root.children[5].count,9,'two dumbbells share six prop slots plus racked bar');
      if(kind==='rower') {
        assert.equal(root.children[5].count,4,'one moving handle plus racked bar');
        const handle=new THREE.Matrix4();root.children[5].getMatrixAt(0,handle);
        const position=new THREE.Vector3().setFromMatrixPosition(handle),yaw=equipment.yaw;
        assert(Math.abs(position.x-(equipment.x+Math.sin(yaw)*.64))<1e-5);
        assert(Math.abs(position.z-(equipment.z+Math.cos(yaw)*.64))<1e-5);
        assert(Math.abs(position.y-(plan.floorY+.78))<1e-5,'resting grip matches actual machine handle');
      }
      const arms=Array.from(root.children[4].instanceMatrix.array),props=Array.from(root.children[5].instanceMatrix.array),legs=Array.from(root.children[3].instanceMatrix.array);
      view.update(original,0,{activity});assert.deepEqual(Array.from(root.children[4].instanceMatrix.array),arms,'renderer dt cannot invent workout motion');
      view.update(original,.1,{activity:{...activity,lift:1}});matrices();
      if(kind==='treadmill')assert.notDeepEqual(Array.from(root.children[3].instanceMatrix.array),legs,'supplied cadence moves belt strides');
      else assert.notDeepEqual(Array.from(root.children[4].instanceMatrix.array),arms,`${kind} supplied lift moves hands`);
      if(['bench','curls','rower'].includes(kind))assert.notDeepEqual(Array.from(root.children[5].instanceMatrix.array),props,`${kind} gear follows supplied hand movement`);
      for(const mesh of root.children)assert(mesh.count<=mesh.instanceMatrix.count,'participant stays inside fixed pools');
      assert(view.stats.drawCalls<=6);
      view.update(original,.1,{activity:{...activity,active:false}});assert.equal(root.children[0].count,original.length,'cancel/failure/grip loss removes participant');assert.equal(view.exerciseFocus,null);
      view.update(original,.1,{activity:{...activity,station:{...station,id:'foreign-station'}}});assert.equal(root.children[0].count,original.length,'foreign station cannot create participant');
    }
    const max=Array.from({length:16},(_,i)=>({...original[0],id:`bounded-${i}`,x:plan.origin.x+i*.01,earmuffs:i===0,apron:true,gesture:i===1?'pull-noodles':'idle',reaction:'calm'}));
    max[0]={...max[0],reaction:'angry',noodleThrow:throwPose.find(p=>p.id===guest.id).noodleThrow};
    const station=plan.activities.find(s=>s.kind==='curls');
    view.update(max,.1,{activity:{active:true,kind:'curls',exercisePose:'curls',station,lift:.5}});
    assert.equal(root.children[0].count,17,'16 NPCs plus one player remain bounded');
    for(const mesh of root.children)assert(mesh.count<=mesh.instanceMatrix.count);matrices();
  }
  if(plan.boothGuest) {
    const people=pool.snapshot(),guest=people.find(p=>p.character==='booth-guest');
    const pose=timer=>people.map(p=>p.id===guest.id?{...p,reaction:'angry',attackTimer:timer,attackSerial:1}:p);
    view.update(pose(.65),0);const windup=Array.from(root.children[4].instanceMatrix.array);
    view.update(pose(.30),0);assert.notDeepEqual(Array.from(root.children[4].instanceMatrix.array),windup,'emitted punch timer drives actual extension');
    view.update(pose(.30),1);const frozen=Array.from(root.children[4].instanceMatrix.array);view.update(pose(.30),1);assert.deepEqual(Array.from(root.children[4].instanceMatrix.array),frozen,'view has no independent attack clock');
  }
  view.clear();assert.equal(scene.children.length,0);assert.equal(view.stats.geometryCount,0);
}
assert.equal(disposedGeometry,plans.length*6);assert.equal(disposedMaterial,plans.length);assert.equal(disposedMesh,plans.length*6);
// Hero changes recolour only the temporary participant, including changes made before a load.
const {appearanceForPerson}=await import(modelURL),gym=plans.find(p=>p.type==='gym');
assert(view.setPlayerAppearance('player:student'));view.load(gym);pool.load(gym);
const live=pool.snapshot(),station=gym.activities.find(s=>s.kind==='curls'),activity={active:true,kind:'curls',exercisePose:'curls',station,lift:.5};
view.update(live,0,{activity});
const shirts=scene.children[0].children[0],geometry=shirts.geometry,buffer=shirts.instanceMatrix.array,colors=shirts.instanceColor.array;
const npcColors=Array.from(colors.slice(0,live.length*3));
function shirtMatches(id) {
  const actual=new THREE.Color();shirts.getColorAt(live.length,actual);const expected=new THREE.Color(appearanceForPerson(id).shirt);
  assert(Math.abs(actual.r-expected.r)+Math.abs(actual.g-expected.g)+Math.abs(actual.b-expected.b)<1e-6,`${id} workout shirt matches shared hero palette`);
}
shirtMatches('player:student');
for(const id of ['player:corporate','player:basement','player']) {
  assert(view.setPlayerAppearance(id));view.update(live,0,{activity});shirtMatches(id);
  assert.equal(shirts.geometry,geometry);assert.equal(shirts.instanceMatrix.array,buffer);assert.equal(shirts.instanceColor.array,colors);
  assert.deepEqual(Array.from(colors.slice(0,live.length*3)),npcColors,'NPC colours keep their identities');
}
assert.equal(view.setPlayerAppearance('unknown'),false);view.update(live,0,{activity});shirtMatches('player');
assert(view.setPlayerAppearance('player:basement'));view.clear();view.load(gym);view.update(live,0,{activity});
const retained=new THREE.Color();scene.children[0].children[0].getColorAt(live.length,retained);const wanted=new THREE.Color(appearanceForPerson('player:basement').shirt);
assert(Math.abs(retained.r-wanted.r)+Math.abs(retained.g-wanted.g)+Math.abs(retained.b-wanted.b)<1e-6,'hero preset survives room lifecycle');
view.clear();
view.dispose();view.dispose();view.load(plans[0]);view.update([],1);assert(view.stats.disposed);assert.equal(scene.children.length,0);
console.log('PASS active adult roles, real booth/window anchors, reachable ordinary Fight and player strikes with live retaliation, authoritative peaceful/hostile encounters, live LOS/health/radius/cooldown gates, swept contacts, pause, shared rounded parts, 36 moving noodle segments, six lazy draws, four equipment-linked workout poses, emitted NPC punch poses, mission noodle throws before actual melee, released flight after target departure, safe nonlethal and departed-target timeout retries, explicit mission context downgrade, actual lazy school adult staff and alarm reactions, immutable trajectories and exact disposal');
