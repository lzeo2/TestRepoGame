import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const url=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const {createInteriorPeople}=await import(url(await read('../Games/Capital Drive/interior-people.js')));
const {createInteriors}=await import(url(await read('../Games/Capital Drive/interiors.js')));
function make(type,variant,yaw=.7,width=8) {
  const building={id:'b',type:type==='house'?'house':'retail',height:4,points:[[-12,0],[12,0],[12,30],[-12,30]]};
  const options={heightAt:()=>3};
  const map={buildings:[building],interiorEntries:[{buildingId:'b',x:0,z:0,nx:Math.sin(yaw),nz:Math.cos(yaw)}]};
  if(type==='shop') options.stores=[{id:'s',buildingId:'b',name:'Fictional shop',frontage:{x:0,z:0,yaw,width},...(variant?{interiorType:'noodle-shop'}:{})}];
  if(type==='mall'||type==='gym') options.publicEntries=[{id:'public',buildingId:'b',x:0,z:0,yaw,type}];
  const interiors=createInteriors(map,options),entry=interiors.entries[0];
  assert(entry,`${type} fixture entry`);
  const actor={x:entry.x-Math.sin(yaw),z:entry.z-Math.cos(yaw),y:3,yaw};
  return interiors.enter(entry,actor);
}
const plans=[make('house'),make('shop'),make('shop','noodles'),make('shop','noodles',-1.2,6.2),make('mall'),make('gym')];
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
  for(let tick=0;tick<200;tick++) {
    pool.update(.1,{actor:plan.spawn});
    for(const p of pool.snapshot()) {
      assert(p.adult);assert([p.x,p.z,p.y,p.yaw,p.phase].every(Number.isFinite));
      const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),x=c*(p.x-plan.origin.x)-s*(p.z-plan.origin.z);
      assert(Math.abs(x)>=.96,'central passage remains clear');
      for(const d of plan.doors) assert(Math.hypot(d.x-p.x,d.z-p.z)>=(d.width||1.5)/2+.45-1e-6,'doors remain clear');
      if(plan.counter) assert(Math.hypot(plan.counter.x-p.x,plan.counter.z-p.z)>=1.45-1e-6,'counter interaction remains clear');
      for(const station of plan.activities || []) assert(Math.hypot(station.x-p.x,station.z-p.z)>=Math.min(1.1,station.radius || 1)-1e-6,'activity approaches remain clear');
    }
  }
  const paused=pool.snapshot();pool.update(0,{actor:plan.spawn});assert.deepEqual(pool.snapshot(),paused);
  const person=paused[0],actor={x:person.x-3,z:person.z};
  const clipped=pool.clipMovement(actor,6,0,.45);assert(clipped.blocked&&clipped.dx<3,'swept collision cannot tunnel');
  assert.deepEqual(actor,{x:person.x-3,z:person.z},'clip leaves actor authority to controller');
  const escape=pool.clipMovement({x:person.x-.2,z:person.z},-1,0,.45);assert.equal(escape.dx,-1,'existing contact can move away');
  const changed=pool.snapshot();assert(Object.isFrozen(changed[0]));assert.deepEqual(plan,source,'plan is immutable input');
  pool.clear();assert.equal(pool.snapshot().length,0);assert.equal(pool.stats.active,null);
  pool.load(plan);assert.deepEqual(pool.snapshot(),before,'visits reset deterministic population');
}
assert.deepEqual(pool.clipMovement({x:0,z:0},NaN,0),{dx:0,dz:0,blocked:true});
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
assert.equal(pool.startDialogue(guest.id,context).ok,false,'once per visit');
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
for(let i=0;i<10;i++)pool.update(.1,context);assert.equal(pool.drainEvents().length,0,'retaliation cooldown');
for(let i=0;i<15;i++)pool.update(.1,{actor:{x:actor.x+100,z:actor.z},hasLineOfSight:seen});assert.equal(pool.drainEvents().length,0,'distance rechecked live');
const strikeOrigin={x:guest.x,z:guest.z-1,yaw:Math.PI};
assert(pool.strike({...strikeOrigin,damage:100,range:2,hasLineOfSight:seen}).hits>0);
for(let i=0;i<15;i++)pool.update(.1,context);assert.equal(pool.drainEvents().filter(e=>e.type==='retaliation').length,0,'dead guest cannot retaliate');
plans.push(encounterPlan);
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace('./three.module.js',threeURL));
const modelURL=url((await read('../Games/Capital Drive/person-model.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL));
const {createInteriorPeopleView}=await import(url((await read('../Games/Capital Drive/interior-people-view.js')).replace('./person-model.js',modelURL)
 .replace('../../assets/car-arcade/vendor/three.module.js',threeURL).replace('../../assets/car-arcade/vendor/BufferGeometryUtils.js',utilsURL)));
const scene=new THREE.Scene(),view=createInteriorPeopleView(scene,()=>3);
assert.equal(scene.children.length,0,'no inactive geometry');assert.equal(view.stats.geometryCount,0);
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
    const original=pool.snapshot();view.update(original,0,{activity:{active:true,kind:'bench',lift:1,reps:3}});matrices();
    assert.equal(root.children[0].count,original.length+1,'temporary lying player');assert(view.stats.drawCalls<=6);
    assert.deepEqual(pool.snapshot(),original,'visual exercise never changes simulation');
    view.update(original,0,{activity:{active:false,kind:'bench',lift:0,reps:6}});assert.equal(root.children[0].count,original.length,'completed bench removes the temporary lying player');
    assert(root.children[5].count>=3,'resting racked bar remains visible');
  }
  view.clear();assert.equal(scene.children.length,0);assert.equal(view.stats.geometryCount,0);
}
assert.equal(disposedGeometry,plans.length*6);assert.equal(disposedMaterial,plans.length);assert.equal(disposedMesh,plans.length*6);
view.dispose();view.dispose();view.load(plans[0]);view.update([],1);assert(view.stats.disposed);assert.equal(scene.children.length,0);
console.log('PASS active adult roles, real booth/window anchors, authoritative peaceful/hostile encounters, live LOS/health/radius/cooldown gates, swept contacts, pause, shared rounded parts, 36 moving noodle segments, six lazy draws, bench poses and exact disposal');
