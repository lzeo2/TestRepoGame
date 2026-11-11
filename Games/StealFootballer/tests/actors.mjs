import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {ActorFactory} from '../js/actors.js';

// Detached geometry checks; visual identity and rendering need human review.
const data=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const factory=new ActorFactory();
const plain=factory.create({appearance:{hairStyle:'bald'}},{},{simple:true});
plain.root.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(plain.root);
const headBounds=new THREE.Box3().setFromObject(plain.head);
const headSize=headBounds.getSize(new THREE.Vector3());
const height=bounds.max.y-bounds.min.y;
assert(height>6&&height<6.2,'Unscaled adult silhouette stays about 6.1 units tall');
assert(headSize.x<1&&headSize.y<1.1,'Head stays human sized rather than a wide cube');
assert(height/headSize.y>5.5,'Head is less than one fifth of the athletic silhouette');
assert(plain.leftLeg.position.y>height*.46,'Hip articulation preserves long legs');
assert(Math.abs(plain.leftArm.position.x)<1,'Shoulders fit the narrower torso');
assert.equal(plain.feet.length,2,'Merged geometry retains both support transforms');
factory.release(plain);

{
  const hairFactory=new ActorFactory();
  const styles=[...new Set(data.players.map(def=>def.appearance.hairStyle))];
  for(const style of styles) {
    const head=new THREE.Group();hairFactory.hair(head,style,'#33271F',false);
    assert.equal(head.children.length===0,style==='bald',`${style}: only bald has no hair`);
    for(const part of head.children) {
      assert.notEqual(part.geometry,hairFactory.geometries.box,`${style}: no flat box cap or nape`);
      const positions=part.geometry.attributes.position;
      assert([...positions.array].every(Number.isFinite),`${style}: finite hair surface`);
    }
    if(style==='bald'||style==='r9fringe')continue;
    const scalp=head.children[0].geometry;
    const again=new THREE.Group();hairFactory.hair(again,style,'#CCA040',true);
    assert.equal(again.children[0].geometry,scalp,`${style}: shared scalp geometry across colors/detail`);
    const p=scalp.attributes.position,n=scalp.attributes.normal;
    let top=-Infinity;
    for(let i=0;i<p.count;i++) {
      top=Math.max(top,p.getY(i));
      const radius=Math.hypot(p.getX(i)/.91,(p.getY(i)-.02)/.66,p.getZ(i)/.57);
      assert(radius>=.98&&radius<1.35,`${style}: hair follows the head rather than a floating cap`);
      if(['fade','cropped'].includes(style))assert(radius<1.04,`${style}: close cut hugs scalp`);
      if(i%21===10)assert(p.getY(i)>.29,`${style}: front hairline clears brows`);
      if(i>=21&&i%21!==20)assert(p.getX(i)*n.getX(i)+(p.getY(i)-.02)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,
        `${style}: surface faces outward`);
    }
    assert(top<.81,`${style}: no oversized crown bump`);
  }
  const cached=Object.values(hairFactory.geometries);let disposed=0;
  cached.forEach(geometry=>geometry.addEventListener('dispose',()=>disposed++));
  hairFactory.dispose();assert.equal(disposed,cached.length,'Factory disposes every shared hair geometry');
}

let maximumTriangles=0;
for(const def of data.players)for(const pattern of ['solid','stripes','hoops']) {
  const actor=factory.create(def,{pattern});
  assert.equal(actor.definition,def);
  assert.equal(actor.profile,def.appearance,'Exported identity remains the appearance owner');
  assert.equal(actor.head.scale.x,.46,'Every profile uses the same adult anatomy');
  let meshes=0,triangles=0;
  actor.root.traverse(part=>{
    if(!part.isMesh)return;
    meshes++;triangles+=(part.geometry.index?.count||part.geometry.attributes.position.count)/3;
  });
  maximumTriangles=Math.max(maximumTriangles,triangles);
  assert(meshes<=7,`${def.id}/${pattern}: at most seven meshes`);
  assert(triangles<4000,`${def.id}/${pattern}: fewer than four thousand triangles`);
  let disposed=0;
  const count=actor.merged.length;
  actor.merged.forEach(geometry=>geometry.addEventListener('dispose',()=>disposed++));
  factory.release(actor);
  assert.equal(disposed,count,'Release disposes all actor-owned geometry');
  assert.equal(actor.merged.length,0);
}
factory.dispose();
console.log(`PASS actors: adult proportions; 11 fitted hair styles/cache disposal; 125 source profiles x3 kit patterns; max ${maximumTriangles} triangles; geometry release.`);
console.log('LIMIT: Detached checks do not establish likeness, WebGL appearance or hardware performance.');
