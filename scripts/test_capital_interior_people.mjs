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
    const pass=plan.furniture.find(f=>f.kind==='kitchen-pass');
    for(const p of before) {
      const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),localX=c*(p.x-plan.origin.x)-s*(p.z-plan.origin.z);
      if(p.role==='diner') assert(localX>.96,'all dining is right of the central aisle');
      else {
        const passX=c*(pass.x-plan.origin.x)-s*(pass.z-plan.origin.z);
        assert(localX<passX-pass.width/2-p.radius,'staff stay behind the left service pass');
        assert(Math.abs(p.yaw-plan.origin.yaw-Math.PI/2)<1e-6,'staff face the public aisle');
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
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace('./three.module.js',threeURL));
const {createInteriorPeopleView}=await import(url((await read('../Games/Capital Drive/interior-people-view.js'))
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
  if(plan.exercise) {
    const original=pool.snapshot();view.update(original,0,{activity:{kind:'bench',lift:1,reps:3}});matrices();
    assert.equal(root.children[0].count,original.length+1,'temporary lying player');assert(view.stats.drawCalls<=6);
    assert.deepEqual(pool.snapshot(),original,'visual exercise never changes simulation');
    view.update(original,0);assert.equal(root.children[0].count,original.length,'regular view resumes');
    assert(root.children[5].count>=3,'resting racked bar remains visible');
  }
  view.clear();assert.equal(scene.children.length,0);assert.equal(view.stats.geometryCount,0);
}
assert.equal(disposedGeometry,plans.length*6);assert.equal(disposedMaterial,plans.length);assert.equal(disposedMesh,plans.length*6);
view.dispose();view.dispose();view.load(plans[0]);view.update([],1);assert(view.stats.disposed);assert.equal(scene.children.length,0);
console.log('PASS active-only adult roles, seated dining, protected doors/counters/aisles, short walking paths, swept contacts, dt0 pause, six lazy draws, bench poses/bar, finite transforms and exact disposal');
