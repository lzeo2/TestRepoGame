// Run: node Games/Jankolock3D/heroes/external-rig-test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';
import { Euler, Vector3 } from '../vendor/three.module.js';
import { bindHeroRig } from './hero-model.mjs';

const base=new URL('../models/',import.meta.url);
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const transform=node=>[...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()];
let frames=0;
for(const [id,count] of [['stampead',17],['turretina',23],['snipeoff',20],['gooey_sticky',10]]) {
  const folder=id==='gooey_sticky'?'gooey':id;
  const rig=JSON.parse(await readFile(new URL(`${folder}/rig.json`,base),'utf8'));
  const originalJSON=JSON.stringify(rig),bytes=await readFile(new URL(`${folder}/model.glb`,base));
  const {scene:group}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assert.equal(rig.movable_nodes.length,count);
  const rests=new Map();group.traverse(node=>rests.set(node,{position:node.position.clone(),quaternion:node.quaternion.clone(),transform:transform(node),parent:node.parent}));
  const pose=bindHeroRig(group,rig),root=group.getObjectByName('root');
  const specs=new Map(rig.movable_nodes.map(spec=>[group.getObjectByName(spec.name),spec]));
  assert.equal(specs.size,count);assert.ok(!specs.has(undefined));
  for(const side of ['l','r']) {
    for(const name of ['foot','upper_arm','hand'])assert.ok(group.getObjectByName(`${name}_${side}`));
    assert.equal(!!group.getObjectByName(`thigh_${side}`),id!=='gooey_sticky');
    assert.equal(!!group.getObjectByName(`shin_${side}`),id!=='gooey_sticky');
  }
  assert.equal(!!group.getObjectByName('pelvis'),id!=='gooey_sticky');
  assert.equal(group.getObjectByName('arm-left'),undefined);
  group.position.set(12,3,-7);group.rotation.y=.7;
  root.position.set(.1,.2,.3);root.rotation.y=-.2;
  const placement=transform(group),rootPlacement=transform(root);
  const weapon=group.getObjectByName('ruler_rifle')??group.getObjectByName('stapler_carbine');
  const gripVector=()=>group.getObjectByName('hand_l').getWorldPosition(new Vector3()).applyMatrix4(weapon.matrixWorld.clone().invert());
  group.updateMatrixWorld(true);const grip=weapon?gripVector():null;
  function check() {
    group.updateMatrixWorld(true);
    assert.deepEqual(transform(group),placement,'caller group placement');
    assert.deepEqual(transform(root),rootPlacement,'rig root placement');
    group.traverse(node=>{
      assert.ok([...transform(node),...node.matrixWorld.elements].every(Number.isFinite),`${id}/${node.name} finite`);
      const rest=rests.get(node);assert.equal(node.parent,rest.parent,'hierarchy preserved');
      if(node===group||node===root)return;
      const spec=specs.get(node);
      if(!spec){assert.deepEqual(transform(node),rest.transform,`${node.name}: static local transform`);return;}
      const rotation=new Euler().setFromQuaternion(rest.quaternion.clone().invert().multiply(node.quaternion));
      for(const axis of ['x','y','z']) {
        for(const [value,range] of [[rotation[axis]*180/Math.PI,spec.rotation_deg[axis]],[node.position[axis]-rest.position[axis],spec.translation_m[axis]]]) {
          if(range!=='free')assert.ok(value>=range[0]-1e-7&&value<=range[1]+1e-7,`${id}/${node.name}/${axis}: ${value} outside ${range}`);
        }
        near(node.scale[axis],1,'no scaling');
      }
    });
    if(weapon)assert.ok(gripVector().distanceTo(grip)<1e-7,'support grip does not separate');
    frames++;
  }
  for(const state of ['idle','walk','aim','dash','slide','jump','fall']) {
    for(let frame=0;frame<90;frame++) {
      const options={state,speed:state==='idle'||state==='aim'?0:8,aiming:state==='aim'};
      pose.update(1/60,options);check();
      if(state!=='idle') {
        const animated=group.getObjectByName(state==='walk'?'foot_l':'torso');
        assert.ok(animated.quaternion.angleTo(rests.get(animated).quaternion)>1e-5,`${state}: actual joint motion`);
      }
      const before=[...specs.keys()].map(transform);
      for(let repeat=0;repeat<3;repeat++)pose.update(0,options);
      assert.deepEqual([...specs.keys()].map(transform),before,'zero-dt pose does not accumulate');
    }
  }
  for(const dt of [NaN,Infinity,-1,Number.MAX_VALUE]){pose.update(dt,{speed:Infinity,state:'dash'});check();}
  pose.update(0);check();
  for(const node of specs.keys())if(node!==root)assert.deepEqual(transform(node),rests.get(node).transform,'idle restores authored rest');
  assert.equal(JSON.stringify(rig),originalJSON,'raw rig is unchanged');

  // A real movable node with a tighter artistic lock must still be respected.
  group.position.set(0,0,0);group.quaternion.identity();root.position.set(0,0,0);root.quaternion.identity();
  const locked=structuredClone(rig);locked.movable_nodes.find(spec=>spec.name==='foot_l').rotation_deg.x=[0,0];
  const lockedPose=bindHeroRig(group,locked);lockedPose.update(.1,{state:'walk',speed:8});
  assert.deepEqual(group.getObjectByName('foot_l').quaternion.toArray(),rests.get(group.getObjectByName('foot_l')).quaternion.toArray());
  lockedPose.update(0);
  // Preserve a nonidentity author quaternion, not merely the supplied identity rests.
  const hand=group.getObjectByName('hand_l');hand.quaternion.setFromAxisAngle(new Vector3(0,1,0),.17);
  const authored=hand.quaternion.clone(),authoredPose=bindHeroRig(group,rig);
  authoredPose.update(.1,{state:'walk',speed:8,aiming:true});
  const relative=authored.clone().invert().multiply(hand.quaternion);
  near(relative.y,0,'local-X hinge with nonidentity rest');near(relative.z,0,'local-X hinge with nonidentity rest');
  authoredPose.update(0);assert.ok(hand.quaternion.angleTo(authored)<1e-7);
  hand.quaternion.copy(rests.get(hand).quaternion);
  const bad=structuredClone(rig);bad.movable_nodes[1].pivot_position[1]+=.1;
  assert.throws(()=>bindHeroRig(group,bad),/pivot mismatch/);
  const badParent=structuredClone(rig);badParent.movable_nodes[1].parent='head';
  assert.throws(()=>bindHeroRig(group,badParent),/hierarchy mismatch/);
  const missing=structuredClone(rig);missing.movable_nodes[1].name='not_an_authored_node';
  assert.throws(()=>bindHeroRig(group,missing),/missing rig node/);
  group.traverse(node=>{if(node.geometry)node.geometry.dispose();if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();});
  console.log(`PASS ${id}: ${count} authored nodes, 7 states, limits/locks/rest/root/grips`);
}
console.log(`PASS external rigs: ${frames} checked poses; raw GLBs, no browser or asset-cache dependency`);
