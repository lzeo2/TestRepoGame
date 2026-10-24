import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createCollectible,animateCollectible,createAvatar,animateAvatar,disposeCharacter} from '../src/characters.js';

test('all eight original creatures have finite geometry and consistent model height',()=>{
  for(let kind=0;kind<8;kind++){
    const model=createCollectible(kind);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.y-2.3)<0.02,`kind ${kind} height ${size.y}`);
    assert.ok(Math.abs(bounds.min.y)<0.02,`kind ${kind} feet ${bounds.min.y}`);
    let meshCount=0;
    model.traverse(o=>{if(o.isMesh){meshCount++;assert.ok(o.geometry.attributes.position.count>0);for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
    assert.ok(meshCount>5&&meshCount<50);
    disposeCharacter(model);
  }
});
test('animations preserve root transforms and cloned rigs remain independent',()=>{
  const a=createCollectible(1,.8),b=createCollectible(1,.8);
  a.position.set(3,4,5);a.rotation.set(.2,.4,.6);
  const position=a.position.clone(),rotation=a.rotation.clone(),bBounds=new THREE.Box3().setFromObject(b);
  for(let time=0;time<6;time+=.1)animateCollectible(a,time,.1);
  assert.deepEqual(a.position.toArray(),position.toArray());assert.deepEqual(a.rotation.toArray(),rotation.toArray());
  assert.deepEqual(new THREE.Box3().setFromObject(b).min.toArray(),bBounds.min.toArray());
  let disposed=0;b.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));
  const parent=new THREE.Group();parent.add(a,b);disposeCharacter(a);
  assert.equal(parent.children.length,1);assert.equal(disposed,0,'disposing one instance must not dispose shared geometry');
  animateCollectible(b,2,.1);assert.ok(!new THREE.Box3().setFromObject(b).isEmpty());
  disposeCharacter(b);
});
test('avatar walking and carrying never override world transforms',()=>{
  const avatar=createAvatar(0x55eacc);avatar.position.set(9,2,-6);avatar.rotation.y=1.2;
  for(const moving of [false,true])for(const carrying of [false,true])for(let t=0;t<3;t+=.1)animateAvatar(avatar,t,moving,carrying);
  assert.deepEqual(avatar.position.toArray(),[9,2,-6]);assert.equal(avatar.rotation.y,1.2);
  disposeCharacter(avatar);assert.equal(avatar.children.length,0);
});
