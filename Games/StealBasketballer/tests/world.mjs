import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {ActorFactory} from '../js/actors.js';
import {COURT} from '../js/court-config.js';
import {createCourtDetails,replacedCourtVisual,hardwoodTexture} from '../js/court-view.js';
import {World,groundedMove,miniLineup,partMatrix,createBasketball} from '../js/world.js';

// Detached geometry and renderer boundaries only. No WebGL/browser/device claim.
const data=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const worldData=JSON.parse(await readFile(new URL('../data/world.json',import.meta.url),'utf8'));
const before=JSON.stringify({data,worldData});
const epsilon=1e-5;
const close=(a,b,message)=>assert(Math.abs(a-b)<epsilon,`${message}: ${a} != ${b}`);
const vecClose=(v,p,message)=>v.toArray().forEach((n,i)=>close(n,p[i],message));
function detachedWorld() {
  const world=Object.create(World.prototype);
  Object.assign(world,{data,worldData,scene:new THREE.Scene(),factory:new ActorFactory(),actors:new Map(),
    materials:[],chunks:[],colliders:[],venueColliders:[],labels:[],hotspots:[],time:1,pitchIndex:0,
    crowdGroup:new THREE.Group(),matchGroup:new THREE.Group(),matchActors:[],bounds:new THREE.Box3(),dynamicKey:'',lowGraphics:false,
    staticGeometries:{box:new THREE.BoxGeometry(1,1,1),wedge:new THREE.BoxGeometry(1,1,1),
      cylinder:new THREE.CylinderGeometry(.5,.5,1,12),sphere:new THREE.SphereGeometry(.5,12,8)}});
  world.bases=world.normalizedBases();
  return world;
}
function releaseWorld(world) {
  world.actors.forEach(entry=>world.factory.release(entry.actor));
  world.matchActors.forEach(actor=>world.factory.release(actor));
  world.stadiumView?.dispose();world.official?.dispose();world.woodTexture?.dispose();
  world.factory.dispose();world.materials.forEach(m=>m.dispose());
  Object.values(world.staticGeometries).forEach(g=>g.dispose());world.scene.clear();world.crowdGroup.clear();
}
assert.equal(worldData.bases.length,12);
assert(worldData.bases.every((b,i)=>b.index===i&&b.slots.length===12));
assert.equal(worldData.rivalBase.slots.length,12);
assert.deepEqual(worldData.basketballCourt.bounds,{x:[-COURT.halfLength,COURT.halfLength],z:[-COURT.halfWidth,COURT.halfWidth]});
assert.deepEqual(worldData.basketballCourt.rims,[[-COURT.rimX,COURT.rimY,0],[COURT.rimX,COURT.rimY,0]]);
assert.equal(worldData.basketballCourt.threePointRadius,COURT.arc);
const parts=[...worldData.parts,...worldData.stadiumParts];
assert(parts.length<3356,'Compact court geometry stays below the original primitive count');
assert(!parts.some(p=>/goal|penalty|kickoff|grassstripe|pitchstripe|ballpatch/i.test(p.name)),'No football-only court primitives remain');
assert.equal(parts.filter(p=>p.name==='Hardwood').length,16,'13 mini courts and three full courts have hardwood');
for(const p of parts) {
  assert(partMatrix(p).elements.every(Number.isFinite));
  assert(p.size.every(n=>Number.isFinite(n)&&n>0));
  close(new THREE.Matrix3().setFromMatrix4(partMatrix(p)).determinant(),1,'Primitive orientation is rigid');
}
{
  const world=detachedWorld();world.buildStatic();world.buildHotspots();
  const replaced=worldData.stadiumParts.filter(p=>replacedCourtVisual({...p,venue:true}));
  assert(replaced.length>200,'The obsolete venue is replaced by a coherent regulation court and upgrade tiers');
  assert(replaced.some(p=>p.collision),'Legacy court floor/posts have explicit new geometry and collision replacements');
  assert.equal(world.replacedVisualCount,replaced.length);
  assert.equal(world.chunks.reduce((n,c)=>n+c.mesh.count,0),parts.filter(p=>p.opacity>.02).length-replaced.length);
  assert.equal(world.colliders.length,parts.filter(p=>p.opacity>.02&&p.collision&&!worldData.stadiumParts.includes(p)).length+worldData.stadiumParts.filter(p=>p.opacity>.02&&p.collision&&!replacedCourtVisual({...p,venue:true})).length+world.stadiumColliderEntries.length);
  vecClose(world.venueOrigin,worldData.bases[0].pitch.position,'Venue anchor preserved');
  for(let i=0;i<12;i++) {
    const base=worldData.bases[i],pos=world.pitchPosition(i);
    vecClose(new THREE.Vector3(pos.x,pos.y,pos.z),[base.pitch.position[0],base.pitch.position[1]+base.pitch.size[1]/2,base.pitch.position[2]],'Court origin');
    const spawn=base.spawn,start={x:spawn[0],y:spawn[1],z:spawn[2]};
    const front=Math.sign(base.deposit[2]-base.position[2]);
    const moved=groundedMove(start,{x:0,z:front},.05,world.colliders,world.bounds);
    assert((moved.z-start.z)*front>0,`Plot ${i}: deposit route still walkable`);
    assert(moved.y>2.8&&moved.y<3.1);
  }
  assert(world.hotspots.some(h=>h.id==='practice-base'&&h.rivalIndex===11&&h.name==='Practice five'));
  assert.equal(world.hotspots.filter(h=>h.kind==='pitch').length,12);
  // The actual court floor supports both edges of the simulation's playable area.
  const origin=world.pitchPosition(0);
  for(const [x,z]of [[-46,0],[46,0],[0,-24],[0,24]]) {
    const p={x:origin.x+x,y:origin.y+.035,z:origin.z+z};
    const next=groundedMove(p,{x:-Math.sign(x),z:-Math.sign(z)},.05,world.colliders,world.bounds);
    close(next.y,origin.y+.035,'Court floor support aligns with match coordinates');
    assert(Math.hypot(next.x-p.x,next.z-p.z)>0,'No old goal collision inside playable court');
  }
  const stadiumCourt=world.stadiumView.snapshot().court;
  assert.deepEqual(stadiumCourt.rims,[[-COURT.rimX,COURT.rimY+.175,0],[COURT.rimX,COURT.rimY+.175,0]]);
  assert.equal(stadiumCourt.length,COURT.length);assert.equal(stadiumCourt.width,COURT.width);
  const entry=world.courtEntryPoint(0);const walked=groundedMove({...entry,y:entry.y+.035},{x:1,z:0},.05,world.colliders,world.bounds);
  assert(walked.x>entry.x);close(walked.y,origin.y+.035,'Venue entry apron supports the avatar');
  const baseColliderCount=world.colliders.length;world.syncStadium(3,world.venueOrigin);
  assert(world.colliders.length>baseColliderCount,'Upgrade stand colliders become active');
  world.syncStadium(0,world.venueOrigin);assert.equal(world.colliders.length,baseColliderCount,'Downgrade fixture removes all higher-tier collider entries');
  releaseWorld(world);
}
{
  const floor=new THREE.Box3(new THREE.Vector3(-10,-1,-10),new THREE.Vector3(10,0,10));
  const wall=new THREE.Box3(new THREE.Vector3(2,0,-5),new THREE.Vector3(3,8,5));
  const start={x:.9,y:.035,z:0};
  const move=groundedMove(start,{x:1,z:1},.1,[floor,wall],floor);
  close(move.x,start.x,'Wall stops avatar radius');assert(move.z>0,'Free axis slides');
  assert(groundedMove({x:0,y:.035,z:0},{x:1,z:0},999,[floor],floor).x<=2.4+epsilon);
  assert.deepEqual(groundedMove(start,{x:1,z:0},.1,[],floor),start,'Unsupported movement is rejected');
}
const roles=['PG','SG','SF','PF','C'];
for(const formation of ['balanced','spread','inside'])for(const front of [-1,1]) {
  const members=roles.map((role,i)=>({uid:`p${i}`,role})).reverse();const original=JSON.stringify(members);
  const lineup=miniLineup(members,formation,front);
  assert.equal(lineup.length,5);assert.deepEqual(lineup.map(p=>p.member.role),roles);
  assert.equal(new Set(lineup.map(p=>p.member.uid)).size,5);
  assert(lineup.every(p=>Math.abs(p.x)<=9&&Math.abs(p.z)<=7));
  assert(lineup[0].z*front<0&&lineup[4].z*front>0);
  assert.equal(JSON.stringify(members),original);
}
assert.equal(miniLineup([]).length,0);assert.equal(miniLineup([{role:'C'}],'unknown').length,1);
{
  const world=detachedWorld();
  const lineup=data.players.slice(0,5).map((def,i)=>({uid:`fixture-${i}`,id:def.id,def,role:roles[i]}));
  const state={roster:[],lineup,tactics:{formation:'spread'},rivals:Array.from({length:12},(_,i)=>({roster:i===11?lineup.slice(0,3):[]}))};
  world.rebuildDisplays(state);
  assert.equal([...world.actors.keys()].filter(k=>k.startsWith('lineup-')).length,5);
  assert.equal([...world.actors.keys()].filter(k=>k.startsWith('roster-12-')).length,3);
  const first=world.actors.get('lineup-0').actor;world.rebuildDisplays(state);
  assert.equal(world.actors.get('lineup-0').actor,first,'Stable lineups reuse geometry');
  releaseWorld(world);
}
{
  assert.equal(hardwoodTexture(),null,'Detached fixtures require no browser canvas');
  const detail=createCourtDetails();let triangles=0;
  detail.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
  assert(triangles<5000,'Regulation court remains bounded');
  assert.equal(detail.root.children.length,7);
  const rims=detail.root.getObjectByName('Regulation rims'),m=new THREE.Matrix4();
  assert.equal(rims.count,2);assert.equal(rims.geometry.parameters.radius,COURT.rimRadius);
  for(const [index,side] of [-1,1].entries()){rims.getMatrixAt(index,m);vecClose(new THREE.Vector3().setFromMatrixPosition(m),[side*COURT.rimX,COURT.rimY+.175,0],'Rendered rim follows authoritative feet');}
  detail.dispose();
}
let maximumMeshes=0,maximumTriangles=0;
{
  const factory=new ActorFactory();
  // Appearance data cannot turn a catalog identity into a real likeness.
  const generic=factory.create({id:'generic-test',appearance:{hairStyle:'r9fringe',skinColor:'#010203',heightScale:4}});
  assert.notEqual(generic.profile.hairStyle,'r9fringe');assert.notEqual(generic.profile.skinColor,'#010203');
  assert(Number.isFinite(generic.profile.heightScale)&&generic.profile.heightScale>0);assert(generic.profile.heightFeet>=5.7&&generic.profile.heightFeet<=7.1);factory.release(generic);
  for(const def of data.players.slice(0,8))for(const simple of [true,false]) {
    const actor=factory.create(def,{}, {simple});let meshes=0,triangles=0;
    actor.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
    maximumMeshes=Math.max(maximumMeshes,meshes);maximumTriangles=Math.max(maximumTriangles,triangles);
    assert(meshes<=7);assert(triangles<1600,'Generic block athletes use fewer triangles than detailed source profiles');
    for(const pose of ['idle','run','dribble','pass','shoot','block','rebound','steal','celebrate']) {
      factory.pose(actor,pose,.8);actor.root.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(actor.root);assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));
      assert(bounds.min.y>=-epsilon,'Athlete feet remain grounded');
    }
    factory.pose(actor,'shoot',.8);assert(actor.rightArm.rotation.x<-2,'Basketball shot raises arms rather than kicking');
    factory.release(actor);
  }
  assert.equal(factory.textures.length,0);factory.dispose();
}
{
  const world=detachedWorld();const first=data.players[0],second=data.players[1];
  const offer={marketId:'fixture',id:first.id,x:.5};world.updateMarket([offer]);
  const actor=[...world.actors.values()][0].actor;let disposed=0;const owned=actor.merged.length;
  actor.merged.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  close(actor.root.position.x,(worldData.market.start[0]+worldData.market.end[0])/2,'Market endpoints');
  world.updateMarket([{...offer,id:second.id}]);assert.equal(disposed,owned);
  world.updateMarket([]);assert.equal(world.actors.size,0);releaseWorld(world);
}
{
  const world=detachedWorld();world.buildCrowd();
  assert.equal(world.crowdSeats.length,24);world.updateCrowd(0,false);assert.equal(world.crowdCount,0);world.updateCrowd(1,false);assert.equal(world.crowdCount,12);world.updateCrowd(3,false);assert.equal(world.crowdCount,24);
  world.ball=createBasketball();world.ballRing=new THREE.Object3D();
  const players=Array.from({length:10},(_,i)=>({id:data.players[i%data.players.length].id,key:`match-${i}`,side:i<5?0:1,index:i%5,x:i*3,z:i-5,pose:'shoot'}));
  const match={players,ball:{x:COURT.rimX,y:COURT.rimY,z:0}};world.updateMatch(match,{});
  assert.equal(world.matchActors.length,10);close(world.ball.position.y,10,'Shot height retained');
  world.matchActors.forEach((a,i)=>close(a.root.position.x,players[i].x,'Simulation positions retained'));
  world.updateMatch({...match,players:[...players,{id:'bench'}]},{});assert.equal(world.matchActors.length,10,'Bench never renders as an eleventh match player');
  const oldKitActor=world.matchActors[0];
  world.updateMatch(match,{kit:{enabled:true,primary:'#6946A8',secondary:'#FFEECC',shorts:'#232F44'}});
  assert.notEqual(world.matchActors[0],oldKitActor,'The same lineup wears a newly saved kit in its next match');
  assert(world.factory.materials.has('#6946A8'),'The chosen jersey color reaches original athlete geometry');
  const seams=world.ball.children[0];assert.equal(seams.geometry.attributes.position.count,192);
  assert.equal(world.ball.material.color.getHexString(),'d77a2c');
  world.ball.geometry.dispose();world.ball.material.dispose();seams.geometry.dispose();seams.material.dispose();
  Object.assign(world,{cameraConfig:{mode:'player',index:99,zoom:1,yaw:0},avatar:{x:0,y:0,z:0},camera:new THREE.PerspectiveCamera(),sun:{target:{position:new THREE.Vector3()},position:new THREE.Vector3()}});
  for(let i=0;i<180;i++)world.updateCamera(match,.1);const origin=world.pitchPosition(0);
  close(world.sun.target.position.x,origin.x+players[9].x,'Camera index clamps to ten actors');
  world.setCamera({mode:'hoop',index:0});for(let i=0;i<180;i++)world.updateCamera(match,.1);close(world.sun.target.position.x,origin.x+COURT.rimX,'Hoop camera uses rim coordinates');
  world.setCamera({mode:'full',zoom:1,yaw:0});world.camera.aspect=.5;world.camera.fov=52;for(let i=0;i<180;i++)world.updateCamera(match,.1);
  close(world.cameraTarget.x,origin.x,'Broadcast remains centered on court');
  assert(world.sun.position.y-world.cameraTarget.y===220);
  const phoneHeight=world.camera.position.y;world.camera.aspect=1.8;for(let i=0;i<180;i++)world.updateCamera(match,.1);
  assert(world.camera.position.y<phoneHeight,'Portrait full-court framing pulls back to preserve sidelines');
  world.setCamera({mode:'avatar',orbit:Math.PI/2,zoom:1.2});assert.equal(world.cameraConfig.yaw,Math.PI/2);assert.equal(world.cameraConfig.zoom,1.2);
  releaseWorld(world);
}
assert.equal(JSON.stringify({data,worldData}),before,'Renderer never mutates game or geometry data');
console.log(`PASS world fixtures: 12 plots/routes, 12 slots, 3 basketball formations, aligned court/hoops/collisions, ten match actors, seamed ball, generic poses (max ${maximumMeshes} meshes/${maximumTriangles} triangles), market disposal and camera APIs; ${parts.length} static primitives.`);
console.log('LIMIT: no browser/WebGL, screenshots, live gameplay or device performance verified.');
