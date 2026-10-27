// Independent CPU production-adapter regression. No browser or supplied script execution.
// Run: node Games/Jankolock3D/heroes/expansion-rigs-test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { Box3, Euler, Quaternion, Vector3 } from '../vendor/three.module.js';
import { bindHeroRig, createHeroVisual } from './hero-model.mjs';
import { EXPANSION_RIG_RECIPES, EXPANSION_MUZZLES } from './expansion-rigs.mjs';
import * as assets from '../character-assets.mjs';
const base=new URL('../models/expansion40/',import.meta.url),json=async p=>JSON.parse(await readFile(new URL(p,base),'utf8'));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const transform=n=>[...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()];
const allTransforms=g=>{const values=[];g.traverse(n=>values.push(transform(n)));return values;};
const mats=n=>Array.isArray(n.material)?n.material:[n.material];
const dispose=g=>{const geometries=new Set(),materials=new Set();g.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);mats(n).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
const oracleText=await readFile(new URL('../../../docs/jank40/animation-plan-test.mjs',import.meta.url),'utf8');
// Read the historical independent recipe DATA without importing/executing its test or changing it.
const oracleRows=oracleText.split('const rows = `')[1].split('`.trim()')[0].trim().split('\n');
const oracle=Object.fromEntries(oracleRows.map(row=>{
  const [id,kind,contacts,idle,weapon,...abilities]=row.trim().split('|');
  const decode=s=>s.split(',').map(t=>{const [name,axis,value]=t.split(':');return {name,axis,value:Number(value)};});
  return [id,{id,kind,contacts:contacts.split(' ').map(c=>c.split('/')),idle:decode(idle),weapon:decode(weapon),abilities:abilities.map(decode)}];
}));
assert.deepEqual(EXPANSION_RIG_RECIPES,oracle,'all40 recipes promoted without modifying independent plan');
assert.equal(Object.keys(oracle).length,40);
const receipt=await json('intake-receipt.json');let controls=0,frames=0,rawCount=0;
for(const [id,recipe] of Object.entries(oracle)){
  const [bytes,rig]=await Promise.all([readFile(new URL(`${id}/model.glb`,base)),json(`${id}/rig.json`)]);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.heroes[id].variants.clean.sha256);
  const {scene:group}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const rests=new Map();group.traverse(n=>rests.set(n,{p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone(),t:transform(n),parent:n.parent}));
  const byName=new Map(rig.movable_nodes.map(s=>[s.name,s]));
  const pose=bindHeroRig(group,rig),root=group.getObjectByName('root'),outer=transform(group),rootRest=transform(root);
  controls+=byName.size;rawCount++;
  let triangles=0;group.traverse(n=>{if(n.isMesh)triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;});
  assert.equal(triangles,receipt.heroes[id].variants.clean.triangles);
  for(const spec of rig.movable_nodes){const n=group.getObjectByName(spec.name);let vertices=0;n.traverse(c=>{if(c.isMesh)vertices+=c.geometry.attributes.position.count;});assert.ok(vertices>0,`${id}/${spec.name}: independently counted descendant geometry`);}
  assert.equal(pose.muzzle.name,EXPANSION_MUZZLES[id]);
  let weaponAncestor=pose.muzzle;const ancestors=new Set();while(weaponAncestor){ancestors.add(weaponAncestor.name);weaponAncestor=weaponAncestor.parent;}
  assert.ok(recipe.weapon.some(t=>ancestors.has(t.name)),`${id}: weapon gesture moves the actual cosmetic anchor's assembly`);
  assert.equal(pose.limitations.footPlanting,false);assert.equal(pose.limitations.floating,false);
  assert.equal(pose.limitations.forwardVerified,!['meter','phrase-marker'].includes(id));
  group.updateMatrixWorld(true);const box=new Box3().setFromObject(group,true),pin=receipt.heroes[id].variants.clean.body_bounds;
  for(const [i,k] of ['x','y','z'].entries()){near(box.min[k],pin.min[i],'actual min');near(box.max[k],pin.max[i],'actual max');}
  near(box.min.y,0,'Y-up ground');const scale=1.8/(box.max.y-box.min.y);
  function check(){
    group.updateMatrixWorld(true);assert.deepEqual(transform(group),outer);assert.deepEqual(transform(root),rootRest,'root never animated');
    group.traverse(n=>{
      const rest=rests.get(n);assert.equal(n.parent,rest.parent);
      assert.ok([...transform(n),...n.matrixWorld.elements].every(Number.isFinite),`${id}/${n.name}: finite`);
      near(n.quaternion.length(),1,'unit quaternion');assert.deepEqual(n.scale.toArray(),rest.s.toArray());
      if(n===group||n===root)return;
      const spec=byName.get(n.name);if(!spec){assert.deepEqual(transform(n),rest.t,'static local transform');return;}
      const e=new Euler().setFromQuaternion(rest.q.clone().invert().multiply(n.quaternion));
      for(const k of ['x','y','z'])for(const [v,r] of [[e[k]*180/Math.PI,spec.rotation_deg[k]],[n.position[k]-rest.p[k],spec.translation_m[k]]])if(r!=='free')assert.ok(v>=r[0]-1e-6&&v<=r[1]+1e-6,`${id}/${n.name}: guide respected`);
    });frames++;
  }
  for(const state of ['idle','walk','weapon',1,2,3,4]){
    pose.reset();let moved=false;
    for(let i=0;i<=16;i++){
      const phase=i/16;
      if(state==='weapon'||Number.isInteger(state))pose.setAcceptedAction({accepted:true,kind:state==='weapon'?'weapon':'slot',slot:Number.isInteger(state)?state:undefined,phase});
      pose.update(state==='idle'||state==='walk'?.05:0,{state:state==='walk'?'walk':'idle',speed:state==='walk'?8:0});
      check();
      for(const [n,r] of rests)if(n!==root&&n!==group&&(n.quaternion.angleTo(r.q)>1e-5||n.position.distanceTo(r.p)>1e-6))moved=true;
      const before=allTransforms(group);pose.update(0,{state:state==='walk'?'walk':'idle',speed:state==='walk'?8:0});assert.deepEqual(allTransforms(group),before,'no zero-dt accumulation');
      const body=new Box3().setFromObject(group,true);assert.ok(body.min.y*scale>-.06&&body.min.y*scale<.03&&body.max.y*scale<2.2,'conservative isolated envelope, not contact acceptance');
      if(state==='weapon'||Number.isInteger(state)){
        const targets=state==='weapon'?recipe.weapon:recipe.abilities[state-1];
        for(const t of targets){
          const n=group.getObjectByName(t.name),rest=rests.get(n),amount=t.value*Math.sin(phase*Math.PI);
          if(t.axis.startsWith('t'))near(n.position[t.axis.at(-1)],rest.p[t.axis.at(-1)]+amount,'independent plan translation');
          else{const axis=new Vector3();axis[t.axis]=1;assert.ok(n.quaternion.angleTo(rest.q.clone().multiply(new Quaternion().setFromAxisAngle(axis,amount*Math.PI/180)))<1e-6,'independent plan gesture');}
        }
      }
    }
    assert.ok(moved,`${id}/${state}: genuine non-root articulation`);
  }
  // No inferred action from recoil, slot flags or rejected casts. Caller must opt in.
  pose.reset();pose.update(0,{recoil:1,lastAbility:'anything'});assert.deepEqual(allTransforms(group),[...rests.values()].map(r=>r.t));
  assert.equal(pose.setAcceptedAction({accepted:false,kind:'slot',slot:1,phase:.5}),false);pose.update(0);assert.deepEqual(allTransforms(group),[...rests.values()].map(r=>r.t));
  assert.throws(()=>pose.setAcceptedAction({accepted:true,kind:'slot',slot:0,phase:.5}),RangeError);
  assert.throws(()=>pose.setAcceptedAction({accepted:true,kind:'weapon',phase:NaN}),RangeError);
  const event=Object.freeze({accepted:true,kind:'weapon',phase:.5});pose.setAcceptedAction(event);pose.update(0);const accepted=allTransforms(group);
  pose.setAcceptedAction({accepted:false});pose.update(0);assert.deepEqual(allTransforms(group),accepted,'rejection does not cancel prior accepted action');pose.clearAction();pose.update(0);assert.deepEqual(allTransforms(group),[...rests.values()].map(r=>r.t));
  // Signed forward movement, pure strafe and no mutation of supplied velocity.
  pose.reset();pose.update(.05,{state:'walk',worldVelocity:Object.freeze({x:0,y:0,z:-8})});
  const forward=recipe.contacts.map(c=>group.getObjectByName(c[0]).quaternion.clone());
  pose.reset();pose.update(.05,{state:'walk',worldVelocity:Object.freeze({x:0,y:0,z:8})});
  recipe.contacts.forEach((c,i)=>{const q=group.getObjectByName(c[0]).quaternion;assert.ok(q.angleTo(forward[i])>1e-5,`${id}: reverse changes actual support/wheel direction`);});
  pose.reset();pose.update(.05,{state:'walk',worldVelocity:Object.freeze({x:8,y:0,z:0})});check();
  if(recipe.kind==='wheel')assert.equal(pose.motion.lateralSlip,id==='ink-station'?0:8,'fixed wheels report unsupported lateral scrub, not fake rolling');
  else assert.ok(recipe.contacts.some(c=>group.getObjectByName(c[1]).quaternion.angleTo(rests.get(group.getObjectByName(c[1])).q)>1e-5),'strafe articulates real support joints');
  pose.update(0,{speed:0});const stopped=recipe.contacts.flat().map(n=>transform(group.getObjectByName(n)));pose.update(.1,{speed:0});assert.deepEqual(recipe.contacts.flat().map(n=>transform(group.getObjectByName(n))),stopped,'zero speed stops gait/roll');
  // World metres must be converted through the visual group's actual scale.
  if(recipe.kind==='wheel'){
    pose.reset();group.scale.setScalar(scale);pose.update(.05,{speed:2});
    for(const [name] of recipe.contacts){const q=group.getObjectByName(name).quaternion,angle=-.1/(scale*pose.wheelRadii[name]);const expected=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),angle);assert.ok(q.angleTo(expected)<1e-6,'world distance / scaled measured radius');}
    // Physical no-slip check, independent of a signed-angle expectation:
    // velocity at ground contact = translation + omega cross (0,-R,0).
    // Read omega from the actual produced quaternion, including steered axes.
    for(const yaw of [0,.7])for(const speed of [2,-2]){
      pose.reset();group.rotation.y=yaw;
      const translation=new Vector3(0,0,-speed).applyQuaternion(group.quaternion);
      pose.update(.05,{state:'walk',worldVelocity:Object.freeze({x:translation.x,y:0,z:translation.z})});
      group.updateMatrixWorld(true);
      for(const [name] of recipe.contacts){
        const wheel=group.getObjectByName(name),rest=rests.get(wheel);
        const relative=rest.q.clone().invert().multiply(wheel.quaternion);
        const angle=2*Math.atan2(relative.x,relative.w);
        const omega=new Vector3(1,0,0).applyQuaternion(wheel.getWorldQuaternion(new Quaternion())).multiplyScalar(angle/.05);
        const contact=new Vector3(0,-pose.wheelRadii[name]*scale,0);
        assert.ok(omega.cross(contact).add(translation).length()<1e-6,`${id}/${name}: physical contact velocity cancels translation, forward/reverse yaw=${yaw}`);
      }
    }
    group.rotation.y=0;group.scale.set(1,1,1);
  }
  pose.reset();group.position.set(12,3,-7);group.rotation.y=.7;root.position.set(.1,.2,.3);root.rotation.y=-.2;
  const placed=transform(group),rootPlaced=transform(root),velocity=new Vector3(0,0,-8).applyQuaternion(root.getWorldQuaternion(new Quaternion()));
  const velocityCopy=velocity.clone();pose.update(.05,{state:'walk',worldVelocity:velocity});assert.ok(velocity.equals(velocityCopy));assert.deepEqual(transform(group),placed);assert.deepEqual(transform(root),rootPlaced);near(pose.motion.forward,8,'world to caller-local direction');near(pose.motion.lateral,0,'world to caller-local strafe');
  pose.reset();assert.deepEqual(transform(group),placed);assert.deepEqual(transform(root),rootPlaced);
  for(const dt of [NaN,Infinity,-1,Number.MAX_VALUE]){pose.update(dt,{speed:Number.MAX_VALUE,worldVelocity:Object.freeze({x:Number.MAX_VALUE,y:Number.MAX_VALUE,z:-Number.MAX_VALUE})});group.traverse(n=>assert.ok(transform(n).every(Number.isFinite),'adversarial finite input stays bounded'));}
  assert.throws(()=>pose.update(.05,{worldVelocity:{x:NaN,y:0,z:0}}),RangeError);
  pose.dispose();pose.dispose();const ended=allTransforms(group);assert.equal(pose.setAcceptedAction(event),false);pose.update(.05,{speed:8});assert.deepEqual(allTransforms(group),ended,'disposed adapter is inert');
  // Fresh raw scene for clamps/missing joints/nonidentity authored rest.
  group.position.set(0,0,0);group.quaternion.identity();root.position.set(0,0,0);root.quaternion.identity();
  const locked=structuredClone(rig),target=recipe.weapon[0],spec=locked.movable_nodes.find(s=>s.name===target.name);
  (target.axis.startsWith('t')?spec.translation_m:spec.rotation_deg)[target.axis.at(-1)]=[0,0];
  const clamped=bindHeroRig(group,locked);clamped.setAcceptedAction(event);clamped.update(0);
  const n=group.getObjectByName(target.name),r=rests.get(n);if(target.axis.startsWith('t'))assert.deepEqual(n.position.toArray(),r.p.toArray());else assert.ok(n.quaternion.angleTo(r.q)<1e-6);clamped.reset();
  const absent=structuredClone(rig);absent.movable_nodes[1].name='missing_actual_joint';assert.throws(()=>bindHeroRig(group,absent),/Missing/);
  const badParent=structuredClone(rig);badParent.movable_nodes[1].parent='nonexistent_parent';assert.throws(()=>bindHeroRig(group,badParent),/hierarchy/);
  const badPivot=structuredClone(rig);badPivot.movable_nodes[1].pivot_position[0]+=.1;assert.throws(()=>bindHeroRig(group,badPivot),/pivot/);
  const duplicate=group.getObjectByName(recipe.weapon[0].name).clone(false);duplicate.name=rig.movable_nodes[1].name;group.add(duplicate);assert.throws(()=>bindHeroRig(group,rig),/Ambiguous/);group.remove(duplicate);
  // Synthetic rest fixture: update model pivots honestly after a nonidentity local rest.
  n.quaternion.setFromAxisAngle(new Vector3(0,1,0),.17);group.updateMatrixWorld(true);const authored=n.quaternion.clone(),fixture=structuredClone(rig);
  for(const s of fixture.movable_nodes)s.pivot_model_position=group.getObjectByName(s.name).getWorldPosition(new Vector3()).toArray();
  const nonidentity=bindHeroRig(group,fixture);nonidentity.setAcceptedAction(event);nonidentity.update(0);
  if(!target.axis.startsWith('t')){const axis=new Vector3();axis[target.axis]=1;assert.ok(n.quaternion.angleTo(authored.clone().multiply(new Quaternion().setFromAxisAngle(axis,target.value*Math.PI/180)))<1e-6,'nonidentity rest * local delta');}
  nonidentity.reset();assert.ok(n.quaternion.angleTo(authored)<1e-6);dispose(group);
}
assert.equal(controls,750);
console.log(`PASS expansion raw production rigs: ${rawCount} actual GLBs, ${controls} named controls, ${frames} poses; oracle gestures/clamps/rest/root/reverse/strafe/zero-speed/rejected-action/reset/disposal`);

// Actual cache/clone/createHeroVisual acceptance is conditional on lane L1, never mocked green.
if(!assets.EXPANSION_HERO_IDS){console.log('HOLD createHeroVisual/cache/material integration: lane L1 export not available');process.exitCode=2;}
else {
  assert.deepEqual([...assets.EXPANSION_HERO_IDS].sort(),Object.keys(oracle).sort());
  let accepted=0;
  for(const id of assets.EXPANSION_HERO_IDS){
    await assets.loadCharacter(id);const a=createHeroVisual(id),b=createHeroVisual(id),cache=await assets.loadCharacter(id);
    const meshes=g=>{const a=[];g.traverse(n=>{if(n.isMesh)a.push(n);});return a;};
    const am=meshes(a.group),bm=meshes(b.group),cm=meshes(cache.root),mapping=new Map();
    assert.equal(a.metadata.unlit,true);const bounds=a.metadata.bodyBounds;near((bounds.max[1]-bounds.min[1])*a.group.scale.y,1.8,'clean-only scale');
    for(let i=0;i<cm.length;i++)for(let j=0;j<mats(cm[i]).length;j++){
      const original=mats(cm[i])[j],left=mats(am[i])[j],right=mats(bm[i])[j];assert.notEqual(left,right);assert.notEqual(left,original);assert.notEqual(right,original);
      if(mapping.has(original))assert.equal(left,mapping.get(original),'intra-instance sharing');else mapping.set(original,left);
      assert.ok(left.isMeshBasicMaterial&&left.map===null&&left.normalMap===undefined,'unlit palette not overwritten by procedural PBR');
    }
    assert.equal(mapping.size,4);
    let disposedA=0,disposedB=0,disposedCache=0;
    new Set(am.flatMap(mats)).forEach(m=>m.addEventListener('dispose',()=>disposedA++));
    new Set(bm.flatMap(mats)).forEach(m=>m.addEventListener('dispose',()=>disposedB++));
    new Set(cm.flatMap(mats)).forEach(m=>m.addEventListener('dispose',()=>disposedCache++));
    for(const [original,copy] of mapping){const before=original.color.clone(),sibling=bm.flatMap(mats).find(m=>m.name===copy.name),siblingColor=sibling.color.clone();copy.color.setRGB(.123,.234,.345);copy.opacity=.42;assert.ok(original.color.equals(before)&&sibling.color.equals(siblingColor));assert.notEqual(sibling.opacity,.42);}
    const root=a.group.getObjectByName('root'),rootBefore=transform(root),placement=a.group.position.toArray(),capsuleBefore=JSON.stringify(a.metadata.bodyBounds);
    a.setAcceptedAction({accepted:true,kind:'slot',slot:4,phase:.5});a.update(.05,{state:'walk',worldVelocity:Object.freeze({x:0,y:0,z:-8}),yaw:.3});assert.deepEqual(transform(root),rootBefore);assert.deepEqual(a.group.position.toArray(),placement);assert.equal(JSON.stringify(a.metadata.bodyBounds),capsuleBefore);assert.ok(a.muzzle.getWorldPosition(new Vector3()).toArray().every(Number.isFinite));
    a.reset();a.dispose();a.dispose();assert.equal(disposedA,4,'own copied materials disposed exactly once');assert.equal(disposedB,0);assert.equal(disposedCache,0,'no sibling/cache material disposal');assert.equal(a.setAcceptedAction({accepted:true,kind:'weapon',phase:.5}),false);assert.equal(a.group.children.length,0);assert.ok(b.group.children.length>0);b.update(.05,{speed:8});b.dispose();assert.equal(disposedB,4);assert.equal(disposedCache,0);accepted++;
  }
  assets.disposeCharacterAssets();console.log(`PASS actual expansion loader/createHeroVisual: ${accepted}/40, measured scale, real anchors, unlit material independence/sharing, reset and isolated disposal`);
}
console.log('LIMITS: CPU only; Meter/Phrase forward and contacts/foot planting remain held; fixed wheels report lateral scrub. Parent still owns accepted-event/velocity/runtime/registry wiring.');
