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
factory.pose(a,'shoot',.8);
assert.notDeepEqual(Array.from(buffer),rest,'Forearms bend in the merged mesh');
assert(a.rightArm.rotation.x<-2);assert(a.rightArm.userData.hinge.rotation.x<-.5);
factory.pose(a,'defend',.8);assert(a.leftLeg.userData.hinge.rotation.x>.3);
factory.pose(a,{type:'run'},NaN,Infinity);assert(a.body.position.toArray().every(Number.isFinite));
assert.equal(JSON.stringify(source),before,'Presentation never mutates catalog data');
// Fixed representatives exercise trait combinations, not a probabilistic population sweep.
const representatives = Array.from({length: 18}, (_, i) => factory.create({id: `variety-${i}`}));
const profiles = representatives.map(actor => actor.profile);
assert(new Set(profiles.map(p => p.skinColor)).size >= 5);
assert.equal(new Set(profiles.map(p => p.hairStyle)).size, 6);
assert.equal(new Set(profiles.map(p => p.accessory)).size, 4);
assert(new Set(profiles.map(p => p.hairColor)).size >= 3);
assert(Math.max(...profiles.map(p => p.buildScale)) - Math.min(...profiles.map(p => p.buildScale)) > .18);
assert(Math.max(...profiles.map(p => p.heightFeet)) - Math.min(...profiles.map(p => p.heightFeet)) > 1);
for (const trait of ['hairStyle', 'hairColor', 'accessory']) {
  assert(profiles.some((p, i) => profiles.some((q, j) => i !== j && p.skinColor === q.skinColor && p[trait] !== q[trait])), `${trait} varies within a skin tone`);
}
let maxTriangles = triangles;
for (const actor of representatives) {
  actor.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(actor.root);
  assert(Math.abs(bounds.max.y - bounds.min.y - actor.profile.heightFeet) < 1e-5);
  assert(bounds.min.y >= -1e-5 && bounds.min.y < .08);
  assert(actor.profile.heightFeet >= 5.7 && actor.profile.heightFeet <= 7.1);
  let draws = 0, count = 0;
  actor.root.traverse(o => {if (o.isMesh) {draws++; count += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;}});
  assert.equal(draws, 7); assert(count < 1600); maxTriangles = Math.max(maxTriangles, count);
  for (const kind of ['run', 'defend', 'shoot']) {
    factory.pose(actor, kind, .7); actor.root.updateMatrixWorld(true);
    const posed = new THREE.Box3().setFromObject(actor.root);
    assert(posed.min.y >= -1e-5 && posed.min.y < .08, `${actor.profile.hairStyle}/${kind} grounded`);
  }
}
const roleRanges = {PG:[5.7,6.4], SG:[6.1,6.7], SF:[6.3,6.9], PF:[6.5,7], C:[6.7,7.1]};
for (const [role, [min, max]] of Object.entries(roleRanges)) {
  const actor = factory.create(source, {}, {role, simple: true});
  assert(actor.profile.heightFeet >= min && actor.profile.heightFeet <= max);
  for (const trait of ['skinColor', 'hairStyle', 'hairColor', 'buildScale', 'accessory']) assert.equal(actor.profile[trait], a.profile[trait], `${role} changes height only`);
  factory.release(actor);
}
const scaled = factory.create(source, {}, {scale: .5, simple: true});
scaled.root.updateMatrixWorld(true);
const scaledBounds = new THREE.Box3().setFromObject(scaled.root);
assert(Math.abs(scaledBounds.max.y - scaledBounds.min.y - scaled.profile.heightFeet * .5) < 1e-5);
factory.release(scaled);
representatives.forEach(actor => factory.release(actor));
let geometryDisposals=0,textureDisposals=0,materialDisposals=0;
a.merged.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));
a.owned[0].texture.addEventListener('dispose',()=>textureDisposals++);
a.owned[0].material.addEventListener('dispose',()=>materialDisposals++);
factory.release(a);factory.release(a);
assert.equal(geometryDisposals,6);assert.equal(textureDisposals,1);assert.equal(materialDisposals,1);
assert.equal(factory.textures.length,1);
factory.release(b);assert.equal(factory.textures.length,0);
let sharedDisposals = 0;
const sharedResources = [...Object.values(factory.geometries), ...factory.materials.values(), factory.mergedMaterial];
sharedResources.forEach(resource => resource.addEventListener('dispose', () => sharedDisposals++));
factory.dispose();
assert.equal(sharedDisposals, sharedResources.length, 'Factory releases its shared geometry and materials');
assert.equal(factory.materials.size, 0);
delete globalThis.document;
console.log(`PASS actors: independent generic traits, six hairstyles, adult role heights, numbered jersey, at most seven meshes/${maxTriangles} triangles, ten grounded basketball poses, in-place elbows/knees, finite input and idempotent geometry/badge disposal.`);
