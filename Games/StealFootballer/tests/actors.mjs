import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {ActorFactory,dribbleMotion} from '../js/actors.js';

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
  const actor=factory.create(data.players[0]);
  const transforms=()=>[actor.body,actor.head,actor.leftArm,actor.rightArm,actor.leftLeg,actor.rightLeg]
    .flatMap(part=>[...part.position.toArray(),...part.rotation.toArray().slice(0,3)]);
  factory.pose(actor,'run',.31);const running=transforms();
  factory.pose(actor,'dribble',.31);assert.notDeepEqual(transforms(),running,'Dribbling has a short touch gait distinct from running');
  const poses=['dribble','slalom','roulette','elastico','stepover','finesse','bend','anticipation',
    'dribbleGlue','rocketShot','speedBurst','sambaStep','stepovers','wingWeave'];
  const distinct=new Set();
  for(const pose of poses)for(const time of [.05,.31,.8,1.7]) {
    factory.pose(actor,pose,time,1.1);
    assert(transforms().every(Number.isFinite),`${pose}: finite articulated pose`);
    actor.root.updateMatrixWorld(true);
    assert(actor.body.position.y<2,`${pose}: bounded support correction`);
    for(let i=0;i<actor.feet.length;i++) {
      const foot=actor.feet[i],leg=i===0?actor.leftLeg:actor.rightLeg;
      const matrix=actor.body.matrix.clone().multiply(leg.matrix).multiply(foot.matrix);
      const box=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix);
      assert(box.min.y>=-1e-6,`${pose}: boots stay above support`);
    }
    if(time===.31&&poses.indexOf(pose)<8)distinct.add(JSON.stringify(transforms()));
    const touch=dribbleMotion(pose,time,1.1);
    assert(Math.hypot(touch.forward,touch.lateral)<.5,`${pose}: bounded visual touch`);
  }
  assert.equal(distinct.size,8,'Dribble and seven signature poses read differently');
  factory.release(actor);
}

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
      assert(radius>=.98&&radius<1.65,`${style}: bounded attached hair silhouette`);
      if(i>=p.count-21)assert(radius<1.17,`${style}: fitted edge returns to the scalp`);
      if(['fade','cropped'].includes(style))assert(radius<1.04,`${style}: close cut hugs scalp`);
      if(i%21===10)assert(p.getY(i)>.29,`${style}: front hairline clears brows`);
      if(i>=21&&i%21!==20)assert(p.getX(i)*n.getX(i)+(p.getY(i)-.02)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,
        `${style}: surface faces outward`);
    }
    assert(top<.85,`${style}: scalp stays fitted below the styled locks`);
    if(['quiff','curls','afro'].includes(style)) {
      head.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(head);
      assert(bounds.max.y>(style==='afro'?1:.84)&&bounds.max.y<1.11,`${style}: visible bounded crown volume`);
      assert(head.children.length>1,`${style}: rooted locks add shape to the fitted foundation`);
      let highX=0,highCount=0;
      for(const part of head.children){const positions=part.geometry.attributes.position;for(let i=0;i<positions.count;i++){
        const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld);
        if(point.y>.77){highX+=point.x;highCount++;}
      }}
      if(style==='quiff')assert(highCount>0&&highX/highCount>.02,'Quiff upper locks sweep asymmetrically');
    }
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
