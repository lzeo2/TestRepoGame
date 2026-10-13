import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {ActorFactory} from '../js/actors.js';
import {World,groundedMove,miniLineup,partMatrix} from '../js/world.js';

// Detached mathematical/geometry fixtures: no canvas, WebGL context, browser save,
// network access or Roblox APIs. These checks do not establish rendered appearance,
// shader/shadow correctness, text/jersey textures, frame rate or hardware acceptance.
const data=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const worldData=JSON.parse(await readFile(new URL('../data/world.json',import.meta.url),'utf8'));
const sourceBefore=JSON.stringify({data,worldData});
const epsilon=1e-6;
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<epsilon,`${message}: ${actual} != ${expected}`);
const vectorClose=(actual,expected,message)=>actual.toArray().forEach((n,i)=>close(n,expected[i],message));
const matrixAt=(mesh,index)=>{const m=new THREE.Matrix4();mesh.getMatrixAt(index,m);return m;};

function detachedWorld() {
  const world=Object.create(World.prototype);
  Object.assign(world,{data,worldData,scene:new THREE.Scene(),factory:new ActorFactory(),actors:new Map(),
    materials:[],chunks:[],colliders:[],venueColliders:[],labels:[],hotspots:[],time:1,pitchIndex:0,
    crowdGroup:new THREE.Group(),bounds:new THREE.Box3(),dynamicKey:'',lowGraphics:false,
    // Wedge triangles are not under test here; its unit bounds are enough to inspect
    // the actual builder's instance transforms. Browser verification owns silhouettes.
    staticGeometries:{box:new THREE.BoxGeometry(1,1,1),wedge:new THREE.BoxGeometry(1,1,1),
      cylinder:new THREE.CylinderGeometry(.5,.5,1,12),sphere:new THREE.SphereGeometry(.5,12,8)}});
  world.bases=world.normalizedBases();
  return world;
}

function releaseWorld(world) {
  world.actors.forEach(entry=>world.factory.release(entry.actor));
  world.factory.dispose();world.materials.forEach(m=>m.dispose());
  Object.values(world.staticGeometries).forEach(g=>g.dispose());
  world.scene.clear();world.crowdGroup.clear();
}

assert.equal(data.players.length,125,'Source catalog remains the full 125-player export');
assert.equal(worldData.bases.length,12);
assert(worldData.bases.every((b,i)=>b.index===i&&b.slots.length===18),'Every sorted source base has eighteen slots');
assert.equal(worldData.rivalBase.slots.length,18);

{
  for(const part of [...worldData.parts,...worldData.stadiumParts]) {
    const frame=partMatrix(part);
    assert.deepEqual(frame.elements,part.matrix,`${part.name} retains its source matrix`);
    vectorClose(new THREE.Vector3().applyMatrix4(frame),part.matrix.slice(12,15),'Column-major translation');
    assert(frame.elements.every(Number.isFinite));
    close(new THREE.Matrix3().setFromMatrix4(frame).determinant(),1,'Source orientation determinant');
  }
  const rotated=partMatrix({cframe:[10,20,30,0,0,1,0,1,0,-1,0,0]});
  vectorClose(new THREE.Vector3(1,0,0).applyMatrix4(rotated),[10,20,29],'Roblox CFrame rows convert to Three columns');
  const world=detachedWorld();world.buildStatic();
  const visibleParts=[...worldData.parts,...worldData.stadiumParts].filter(p=>p.opacity>.02).length;
  assert.equal(world.chunks.reduce((count,c)=>count+c.mesh.count,0),visibleParts,'Batching retains every visible primitive');
  assert.equal(world.colliders.length,[...worldData.parts,...worldData.stadiumParts].filter(p=>p.opacity>.02&&p.collision).length);
  vectorClose(world.venueOrigin,worldData.bases[0].pitch.position,'Template anchor uses the actual outboard venue');
  world.bases.forEach((base,index)=>vectorClose(new THREE.Vector3(...Object.values(world.pitchPosition(index))),
    [base.pitch.position[0],base.pitch.position[1]+base.pitch.size[1]/2,base.pitch.position[2]],'Pitch position preserves source scale/location'));
  const spawn=worldData.bases[0].spawn;
  const position={x:spawn[0],y:spawn[1],z:spawn[2],angle:0};
  const moved=groundedMove(position,{x:0,z:1},.05,world.colliders,world.bounds);
  assert(moved.z>position.z,'Source spawn can walk toward its deposit');
  assert(moved.y>2.8&&moved.y<3.1,'Avatar feet use exported floor support');
  const floor=new THREE.Box3(new THREE.Vector3(-10,-1,-10),new THREE.Vector3(10,0,10));
  const wall=new THREE.Box3(new THREE.Vector3(2,0,-5),new THREE.Vector3(3,8,5));
  const stopped=groundedMove({x:.9,y:.035,z:0},{x:1,z:0},.1,[floor,wall],floor);
  close(stopped.x,.9,'Avatar radius stops at a wall');
  const sliding=groundedMove({x:.9,y:.035,z:0},{x:1,z:1},.1,[floor,wall],floor);
  close(sliding.x,.9,'Blocked axis stays fixed');assert(sliding.z>0,'Unblocked axis can slide along a wall');
  const limited=groundedMove({x:0,y:.035,z:0},{x:1,z:0},999,[floor],floor);
  assert(limited.x<=2.4+epsilon,'Long frame deltas remain bounded');
  assert.deepEqual(groundedMove(position,{x:1,z:0},.1,[],world.bounds),position,'Unsupported movement cannot put actors below the map');
  releaseWorld(world);
}

const formations={'4-4-2':[1,4,4,2],'4-3-3':[1,4,3,3],'3-5-2':[1,3,5,2]};
{
  for(const [formation,counts]of Object.entries(formations))for(const front of [-1,1]) {
    const members=['GK','DF','MF','ST'].flatMap((role,row)=>Array.from({length:counts[row]},(_,i)=>({uid:`${role}-${i}`,role}))).reverse();
    const original=JSON.stringify(members);const plan=miniLineup(members,formation,front);
    assert.equal(plan.length,11);assert.equal(plan[0].member.role,'GK');
    assert(plan[0].z*front<0,'Goalkeeper occupies the own-goal end');
    assert(plan.filter(p=>p.role==='ST').every(p=>p.z*front>0),'Strikers occupy the attacking end');
    assert.deepEqual(['GK','DF','MF','ST'].map(role=>plan.filter(p=>p.role===role).length),counts);
    assert.equal(new Set(plan.map(p=>p.member.uid)).size,11,'Formation assigns every member exactly once');
    for(const player of plan) {
      assert(Math.abs(player.x)<=9&&Math.abs(player.z)<10,'Mini actors stay inside the 24x22 pitch');
      const facing=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),-player.angle-Math.PI/2);
      close(facing.z,front,'R6 front points toward the attacking Z goal');
    }
    assert.equal(JSON.stringify(members),original,'Formation does not mutate supplied team records');
  }
  const world=detachedWorld();world.buildHotspots();
  assert(world.hotspots.some(h=>h.id==='practice-base'&&h.rivalIndex===11));
  const lineup=data.players.slice(0,11).map((def,i)=>({uid:`fixture-${i}`,id:def.id,def,role:i===0?'GK':i<5?'DF':i<9?'MF':'ST'}));
  const state={roster:[],lineup,tactics:{formation:'4-4-2'},rivals:Array.from({length:12},(_,i)=>({roster:i===11?lineup.slice(0,3):[]}))};
  world.rebuildDisplays(state);
  assert.equal([...world.actors.keys()].filter(k=>k.startsWith('lineup-')).length,11,'Authoritative XI includes supplied loan players');
  assert.equal([...world.actors.keys()].filter(k=>k.startsWith('roster-12-')).length,3,'Practice roster uses the exported rival base');
  const first=world.actors.get('lineup-0').actor;
  const local=first.root.position.clone().applyMatrix4(new THREE.Matrix4().fromArray(world.bases[0].miniPitch.matrix).invert());
  assert(local.z<0,'Home mini goalkeeper stays behind midfield');
  const same=first;world.rebuildDisplays({...state,lineup:lineup.map(p=>({...p,stats:{power:100}}))});
  assert.equal(world.actors.get('lineup-0').actor,same,'Nonvisual stat updates do not rebuild display geometry');
  releaseWorld(world);
}

let maximumMeshes=0,maximumTriangles=0;
{
  const factory=new ActorFactory();
  const poses=['idle','run','kick','dribble','feint','tackle','dive','celebrate'];
  for(const def of data.players)for(const simple of [false,true]) {
    const actor=factory.create(def,{}, {simple});let meshes=0,triangles=0;
    actor.root.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});
    maximumMeshes=Math.max(maximumMeshes,meshes);maximumTriangles=Math.max(maximumTriangles,triangles);
    assert(meshes<=7,`${def.id}: articulated geometry stays within seven draws before browser jersey texture`);
    assert(triangles<4000,`${def.id}: appearance stays within four thousand triangles`);
    assert.equal(actor.profile.hairStyle,def.appearance.hairStyle);
    assert.equal(actor.profile.skinColor,def.appearance.skinColor);
    for(const pose of poses)for(const time of [.05,.8,1.7]) {
      factory.pose(actor,pose,time);actor.root.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(actor.root);
      assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),`${def.id} ${pose}: finite visible geometry`);
      for(let i=0;i<actor.feet.length;i++) {
        const foot=actor.feet[i],leg=i===0?actor.leftLeg:actor.rightLeg;
        const matrix=actor.root.matrix.clone().multiply(actor.body.matrix).multiply(leg.matrix).multiply(foot.matrix);
        const box=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix);
        assert(box.min.y>=-epsilon,`${def.id} ${pose}: support adjustment prevents buried boots`);
      }
    }
    factory.release(actor);
  }
  assert.equal(factory.textures.length,0,'Node fixtures create no browser jersey textures');factory.dispose();
}

{
  const world=detachedWorld();let released=0;
  const release=world.factory.release.bind(world.factory);world.factory.release=actor=>{released++;release(actor);};
  const offer={marketId:'fixture-slot',id:'saka',x:.5};world.updateMarket([offer]);
  assert.equal(world.actors.size,1);const initial=[...world.actors.values()][0].actor;
  close(initial.root.position.x,(worldData.market.start[0]+worldData.market.end[0])/2,'Normalized market travel uses source endpoints');
  close(initial.root.position.z,worldData.market.start[2],'Conveyor actor is above its source lane');
  assert(initial.root.position.y>worldData.market.start[1]);
  let disposed=0;const initialGeometryCount=initial.merged.length;
  initial.merged.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  world.updateMarket([{...offer,id:'palmer'}]);
  assert.equal([...world.actors.values()][0].actor.definition.id,'palmer');
  assert.equal(released,1);assert.equal(disposed,initialGeometryCount,'Replaced actor disposes every owned merged geometry');
  world.updateMarket([{...offer,id:null}]);assert.equal(world.actors.size,0);assert.equal(released,2);
  world.updateMarket([null,{...offer,id:'unknown-fixture'}]);assert.equal(world.actors.size,0);
  world.updateMarket([offer]);world.updateMarket([]);assert.equal(world.actors.size,0);assert.equal(released,3);
  for(let i=0;i<30;i++){world.updateMarket([offer]);world.updateMarket([{...offer,id:null}]);}
  assert.equal(world.actors.size,0);assert.equal(world.scene.children.length,0);assert.equal(world.factory.textures.length,0);
  releaseWorld(world);
}

{
  const world=detachedWorld();world.buildCrowd();assert.equal(world.crowdSeats.length,24);
  assert.equal(world.crowdParts.length,9,'Instanced humanoid crowd uses nine part batches');
  for(const [level,count]of [[0,8],[1,8],[2,16],[3,24]]) {
    world.updateCrowd(level,false);assert.equal(world.crowdCount,count);
    assert(world.crowdParts.every(p=>p.mesh.count===count));
  }
  const arm=world.crowdParts.find(p=>p.name.startsWith('arm'));
  const before=matrixAt(arm.mesh,0);world.time=10;world.updateCrowd(3,false);
  assert.deepEqual(matrixAt(arm.mesh,0).elements,before.elements,'Low-graphics crowd remains static over time');
  world.updateCrowd(3,true);
  assert.notDeepEqual(matrixAt(arm.mesh,0).elements,before.elements,'Normal crowd animation changes arm transforms');
  const head=world.crowdParts.find(p=>p.name==='head');
  assert(matrixAt(head.mesh,0).elements[13]>world.crowdSeats[0].matrix[13],'Humanoid head rests above its source seat');
  releaseWorld(world);
}

{
  const world=detachedWorld();Object.assign(world,{cameraConfig:{mode:'celebration',index:0,zoom:1,yaw:0},
    avatar:{x:0,y:0,z:0},camera:new THREE.PerspectiveCamera(),
    sun:{target:{position:new THREE.Vector3()},position:new THREE.Vector3()}});
  const players=[{name:'Duplicate',side:0,x:1,z:2},{name:'Duplicate',side:0,x:60,z:55}];
  world.updateCamera({players,celebration:{scorer:'Duplicate',side:0,scorerIndex:1},ball:{x:0,z:0}},.1);
  const pitch=world.pitchPosition(0);
  close(world.sun.target.position.x,pitch.x+60,'Global scorerIndex selects the second duplicate actor');
  close(world.sun.target.position.z,pitch.z+55,'Camera follows scorer rather than the ball');
  world.setCamera({mode:'avatar',index:4,zoom:1.2});world.setCamera({orbit:Math.PI/2});
  assert.equal(world.cameraConfig.mode,'avatar');assert.equal(world.cameraConfig.zoom,1.2);
  world.camera.position.set(0,0,0);world.updateCamera(null,.1);const rotated=world.camera.position.clone();
  world.camera.position.set(0,0,0);world.setCamera({yaw:0});world.updateCamera(null,.1);
  close(rotated.x,world.camera.position.z,'Quarter-turn orbit rotates the horizontal camera offset');
  close(rotated.z,-world.camera.position.x,'Orbit preserves target distance');
  releaseWorld(world);
}

assert.equal(JSON.stringify({data,worldData}),sourceBefore,'Renderer fixtures never mutate exported source data');
console.log(`PASS renderer-independent fixtures: ${worldData.parts.length}+${worldData.stadiumParts.length} source primitives; `+
  `12 bases x18 slots; 3 formations x2 directions; 125 appearances x2 detail modes x8 poses x3 times `+
  `(max ${maximumMeshes} meshes, ${maximumTriangles} triangles); market cleanup/disposal; crowd tiers/static mode; scorer/orbit camera.`);
console.log('LIMIT: No WebGL, browser visuals/textures/shadows, live gameplay, cloud saves or device performance verified.');
