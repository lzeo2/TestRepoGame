// Run: node Games/Jankolock3D/heroes/stampead-pose-test.mjs
// CPU checks of supplied rigid geometry, not IK, native skating or visual acceptance.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/addons/GLTFLoader.js';
import {Euler,Vector3,Box3} from '../vendor/three.module.js';
import {bindHeroRig,createHeroVisual} from './hero-model.mjs';
import {preloadHeroes,disposeCharacterAssets} from '../character-assets.mjs';
const rig=JSON.parse(await readFile(new URL('../models/stampead/rig.json',import.meta.url)));
const bytes=await readFile(new URL('../models/stampead/model.glb',import.meta.url));
const {scene:source}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const transform=n=>[...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()];
const walk={state:'walk',speed:8,worldVelocity:{x:0,y:0,z:-8}};
function fixture(spec=rig,group=source.clone(true)) {
  const rest=new Map();group.traverse(n=>rest.set(n,{q:n.quaternion.clone(),t:transform(n)}));
  const pose=bindHeroRig(group,spec),node=name=>group.getObjectByName(name);
  const snapshot=()=>spec.movable_nodes.map(s=>transform(node(s.name)));
  return {group,pose,node,rest,snapshot};
}
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9,`${label}: ${a} != ${b}`);
const samePose=(a,b)=>a.forEach((row,i)=>row.forEach((v,j)=>close(v,b[i][j],`${i}/${j}`)));
const f=fixture(),resources=[];f.group.traverse(n=>resources.push([n,n.geometry,n.material]));
let low=Infinity,high=-Infinity,maxThigh=0,maxCounter=0;
function checkLimits(test,spec=rig) {
  for(const s of spec.movable_nodes) {
    const n=test.node(s.name),r=test.rest.get(n);
    assert.ok(transform(n).every(Number.isFinite));
    if(s.name==='root')continue;
    const e=new Euler().setFromQuaternion(r.q.clone().invert().multiply(n.quaternion));
    for(const [i,k] of ['x','y','z'].entries()) {
      const range=s.rotation_deg[k],angle=e[k]*180/Math.PI;
      if(range!=='free')assert.ok(angle>=range[0]-1e-7&&angle<=range[1]+1e-7,`${s.name}/${k}: ${angle}`);
      close(n.position[k],r.t[i],`${s.name}: no translation`);
      close(n.scale[k],r.t[i+7],`${s.name}: no scale`);
    }
  }
}
for(let i=0;i<240;i++) {
  f.pose.update(1/120,walk);checkLimits(f);f.group.updateMatrixWorld(true);
  for(const side of ['l','r']) {
    const box=new Box3().setFromObject(f.node(`foot_${side}_sole`),true);
    low=Math.min(low,box.min.y);high=Math.max(high,box.min.y);
  }
  close(f.node('thigh_l').rotation.x,-f.node('thigh_r').rotation.x,'opposed thighs');
  close(f.node('pelvis').rotation.y,-f.node('torso').rotation.y,'counter yaw');
  assert.ok(f.node('shin_l').rotation.x===0||f.node('shin_r').rotation.x===0,'one clearance knee');
  assert.ok(Math.abs(f.node('upper_arm_r').rotation.x)<=Math.abs(f.node('upper_arm_l').rotation.x)+1e-9,'steady stamp arm');
  maxThigh=Math.max(maxThigh,Math.abs(f.node('thigh_l').rotation.x)*180/Math.PI);
  maxCounter=Math.max(maxCounter,Math.abs(f.node('pelvis').rotation.y)*180/Math.PI);
}
assert.ok(low>=-1e-6&&high<.08,`bounded flat-ground sole clearance ${low}..${high}`);
assert.ok(maxThigh>17&&maxCounter<=2.5+1e-7);
const poses=[];
for(const hz of [30,60,120]) {
  const t=fixture();for(let i=0;i<hz;i++)t.pose.update(1/hz,walk);poses.push(t.snapshot());
}
samePose(poses[0],poses[1]);samePose(poses[1],poses[2]);
// Equal displacement over unequal durations yields the same phase at the same speed sample.
const a=fixture(),b=fixture();a.pose.update(.1,walk);
b.pose.update(.1,{...walk,worldVelocity:{x:4,y:0,z:0}});b.pose.update(.1,{...walk,worldVelocity:{x:4,y:0,z:0}});b.pose.update(0,walk);
samePose(a.snapshot(),b.snapshot());
// State labels must not alter displacement-driven phase or caller-owned placement.
const sprint=fixture(),walking=fixture();
for(const t of [sprint,walking]) {
  t.group.position.set(12,3,-7);t.group.rotation.y=.7;t.group.scale.setScalar(.9);
  t.node('root').position.set(.1,.2,.3);t.node('root').rotation.y=-.2;
}
const sprintRoots=[transform(sprint.group),transform(sprint.node('root'))];
for(let i=0;i<30;i++) {
  walking.pose.update(1/60,walk);sprint.pose.update(1/60,{...walk,state:'sprint'});
  samePose(sprint.snapshot(),walking.snapshot());checkLimits(sprint);
  assert.deepEqual([transform(sprint.group),transform(sprint.node('root'))],sprintRoots);
}
for(const name of ['thigh_l','thigh_r','shin_l','foot_l','pelvis','torso'])
  assert.ok(sprint.node(name).quaternion.angleTo(sprint.rest.get(sprint.node(name)).q)>.001,`${name}: articulated sprint`);
console.log('PASS sprint: nonzero articulated gait; walk/sprint displacement phase equal; caller roots unchanged.');
for(const options of [
  {state:'idle',speed:8,worldVelocity:{x:0,y:0,z:0}},
  {state:'walk',speed:8,worldVelocity:{x:0,y:0,z:0}},
  ...['jump','fall','dash','slide'].map(state=>({...walk,state})),
  {...walk,worldVelocity:{x:NaN,y:0,z:Infinity}}
]) {
  const t=fixture(),control=fixture();t.pose.update(.07,walk);control.pose.update(.07,walk);
  t.pose.update(.1,options);const held=t.snapshot();
  for(let i=0;i<60;i++)t.pose.update(.1,options);
  samePose(t.snapshot(),held);t.pose.update(0,walk);samePose(t.snapshot(),control.snapshot());
}
f.pose.reset();const idle=f.snapshot();
for(let i=0;i<100;i++)f.pose.update(.1,{worldVelocity:{x:0,y:0,z:0}});
samePose(f.snapshot(),idle);
const upper=['pelvis','torso','head','upper_arm_l','upper_arm_r','forearm_l','forearm_r'];
f.pose.update(.1,{...walk,aiming:true});const aimed=upper.map(n=>transform(f.node(n)));
for(let i=0;i<50;i++){f.pose.update(.03,{...walk,aiming:true});samePose(upper.map(n=>transform(f.node(n))),aimed);}
f.pose.update(0,walk);const zero=f.snapshot();for(let i=0;i<100;i++)f.pose.update(0,walk);samePose(f.snapshot(),zero);
for(const dt of [NaN,Infinity,-1,Number.MAX_VALUE])for(const x of [NaN,Infinity,-Infinity,Number.MAX_VALUE]) {
  f.pose.update(dt,{...walk,worldVelocity:{x,y:NaN,z:x}});checkLimits(f);
}
// Root placement is caller-owned even through long updates and reset.
f.group.position.set(12,3,-7);f.group.rotation.y=.7;f.group.scale.setScalar(.9);
f.node('root').position.set(.1,.2,.3);f.node('root').rotation.y=-.2;
const roots=[transform(f.group),transform(f.node('root'))];
for(let i=0;i<200;i++)f.pose.update(.1,walk);
f.pose.reset();assert.deepEqual([transform(f.group),transform(f.node('root'))],roots);
const currentResources=[];f.group.traverse(n=>currentResources.push([n,n.geometry,n.material]));
assert.deepEqual(currentResources,resources,'zero new nodes/geometry/materials');
// Authored multi-axis rest and tighter locks, with model-space pivots recomputed for this fixture.
const group=source.clone(true),locked=structuredClone(rig);
group.getObjectByName('torso').quaternion.setFromEuler(new Euler(.11,.07,-.03));group.updateMatrixWorld(true);
for(const s of locked.movable_nodes)s.pivot_model_position=group.getObjectByName(s.name).getWorldPosition(new Vector3()).toArray();
locked.movable_nodes.find(s=>s.name==='torso').rotation_deg.y=[-.5,.5];
locked.movable_nodes.find(s=>s.name==='pelvis').rotation_deg.y=[0,0];
locked.movable_nodes.find(s=>s.name==='foot_l').rotation_deg.x=[0,0];
const authored=fixture(locked,group);authored.pose.update(.05,{...walk,recoil:1});checkLimits(authored,locked);
const torso=authored.node('torso'),relative=new Euler().setFromQuaternion(authored.rest.get(torso).q.clone().invert().multiply(torso.quaternion));
close(relative.x,-6*Math.PI/180,'immediate recoil survives yaw composition');close(relative.y,-.5*Math.PI/180,'counter respects tighter yaw');
assert.ok(authored.node('pelvis').quaternion.angleTo(authored.rest.get(authored.node('pelvis')).q)<1e-7);
assert.ok(authored.node('foot_l').quaternion.angleTo(authored.rest.get(authored.node('foot_l')).q)<1e-7);
authored.pose.reset();for(const s of locked.movable_nodes)assert.deepEqual(transform(authored.node(s.name)),authored.rest.get(authored.node(s.name)).t);
await preloadHeroes();
const hero=createHeroVisual('stampead'),arm=hero.group.getObjectByName('forearm_r'),rest=arm.quaternion.clone();
hero.group.position.set(2,4,6);hero.group.scale.setScalar(.8);
assert.equal(hero.setAcceptedAction({accepted:true,kind:'weapon',phase:0}),true);hero.update(0,{yaw:1.2});
const press=arm.quaternion.angleTo(rest);assert.ok(press>.001);close(hero.group.rotation.y,1.2,'absolute yaw');
const pressed=arm.quaternion.clone();
for(const event of [null,{}, {accepted:false,kind:'weapon',phase:0}, ...[NaN,Infinity,-.1,1.1].map(phase=>({accepted:true,kind:'weapon',phase})),
  {accepted:true,kind:'hit',phase:0},{accepted:true,kind:'slot',slot:0,phase:0},{accepted:true,kind:'slot',slot:1.5,phase:0}]) {
  assert.equal(hero.setAcceptedAction(event),false);hero.update(0);assert.ok(arm.quaternion.angleTo(pressed)<1e-7,'invalid cannot erase press');
}
hero.update(100);assert.ok(arm.quaternion.angleTo(pressed)<1e-7,'no independent action timer');
for(const phase of [.25,.5,.75,1]){assert.equal(hero.setAcceptedAction({accepted:true,kind:'weapon',phase}),true);hero.update(0);}
assert.ok(arm.quaternion.angleTo(rest)<1e-7,'phase 1 expires');
for(const clear of [()=>hero.clearAction(),()=>hero.reset(),()=>assert.equal(hero.setAcceptedAction({accepted:true,kind:'slot',slot:2,phase:0}),true)]) {
  hero.setAcceptedAction({accepted:true,kind:'weapon',phase:0});hero.update(0);clear();hero.update(0);assert.ok(arm.quaternion.angleTo(rest)<1e-7);
}
assert.deepEqual(hero.group.position.toArray(),[2,4,6]);assert.deepEqual(hero.group.scale.toArray(),[.8,.8,.8]);close(hero.group.rotation.y,1.2,'reset preserves yaw');
hero.dispose();assert.equal(hero.setAcceptedAction({accepted:true,kind:'weapon',phase:0}),false);
for(const id of ['turretina','snipeoff','gooey']) {const other=createHeroVisual(id);for(const method of ['setAcceptedAction','clearAction','reset'])assert.equal(method in other,false);other.dispose();}
disposeCharacterAssets();
source.traverse(n=>{n.geometry?.dispose();for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])m.dispose();});
console.log(`PASS Stampead: displacement phase 30/60/120Hz; suppression/rest/aim/dt0/root/resources; authored limits/locks/nonidentity rest; action admission/expiry/reset. Thigh peak ${maxThigh.toFixed(3)}deg, counter ${maxCounter.toFixed(3)}deg, sole minY ${low.toFixed(6)}..${high.toFixed(6)}m, immediate press ${press.toFixed(6)}rad. Native/visual acceptance unverified.`);
