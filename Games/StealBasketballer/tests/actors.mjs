import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {ActorFactory} from '../js/actors.js';

// Detached original geometry checks, including the optional browser number badge.
const text=[];
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeText(){},fillText(value){text.push(value);}})})};
const factory=new ActorFactory();
const source={id:'generic-17',name:'Presentation only',appearance:{skinColor:'#000001',heightScale:10,hairStyle:'likeness'}};
const before=JSON.stringify(source);
const a=factory.create(source,{}, {number:17});
const b=factory.create({...source,name:'Another presentation',appearance:{skinColor:'#000002'}});
assert.deepEqual(a.profile,b.profile,'Only the stable generic seed controls body profile');
assert(text.includes('17'),'Number is rendered on the generic jersey');
assert.equal(a.merged.length,6);assert.equal(a.owned.length,1);assert.equal(factory.textures.length,2);
let meshes=0,triangles=0;
a.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
assert.equal(meshes,7);assert(triangles<1600);
const geometry=a.rightArm.userData.bend.geometry;
const position=geometry.attributes.position;
const buffer=position.array;
const rest=Array.from(buffer);
for(const kind of ['idle','run','dribble','pass','shoot','freeThrow','block','rebound','defend','celebrate']) {
  for(const t of [0,.3,.8,1.6]) {
    factory.pose(a,kind,t);a.root.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(a.root);
    assert(bounds.min.y>=-1e-5,`${kind}: conservative support bounds remain above floor`);
    assert(bounds.min.y<.08,`${kind}: no unintentional hovering`);
    a.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
    for(const limb of [a.leftArm,a.rightArm,a.leftLeg,a.rightLeg]) {
      const bend=limb.userData.bend;
      assert(bend.geometry.attributes.position.array.every(Number.isFinite));
      // Vertices above the joint keep their original shoulder/thigh attachment.
      for(let i=0;i<bend.lower.length;i++)if(!bend.lower[i]) {
        assert.equal(bend.geometry.attributes.position.getY(i),Math.fround(bend.positions[i*3+1]));
      }
    }
  }
}
assert.equal(position.array,buffer,'Animation reuses the allocated vertex buffer');
assert.notDeepEqual(Array.from(buffer),rest,'Forearms bend in the merged mesh');
factory.pose(a,'shoot',.8);assert(a.rightArm.rotation.x<-2);assert(a.rightArm.userData.hinge.rotation.x<-.5);
factory.pose(a,'defend',.8);assert(a.leftLeg.userData.hinge.rotation.x>.3);
factory.pose(a,{type:'run'},NaN,Infinity);assert(a.body.position.toArray().every(Number.isFinite));
assert.equal(JSON.stringify(source),before,'Presentation never mutates catalog data');
let geometryDisposals=0,textureDisposals=0,materialDisposals=0;
a.merged.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));
a.owned[0].texture.addEventListener('dispose',()=>textureDisposals++);
a.owned[0].material.addEventListener('dispose',()=>materialDisposals++);
factory.release(a);factory.release(a);
assert.equal(geometryDisposals,6);assert.equal(textureDisposals,1);assert.equal(materialDisposals,1);
assert.equal(factory.textures.length,1);
factory.release(b);assert.equal(factory.textures.length,0);
factory.dispose();delete globalThis.document;
console.log(`PASS actors: generic seeded profiles, numbered jersey, seven meshes/${triangles} triangles, ten grounded basketball poses, in-place elbows/knees, finite input and idempotent geometry/badge disposal.`);
