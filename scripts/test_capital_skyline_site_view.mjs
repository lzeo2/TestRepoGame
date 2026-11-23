import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createSkylineJob} from '../Games/Capital Drive/skyline-job.js';
import {createSkylineSiteView} from '../Games/Capital Drive/skyline-site-view.js';
const job=createSkylineJob({site:{x:500,z:-300,yaw:.4},groundHeightAt:()=>20});
const scene=new THREE.Scene(),view=createSkylineSiteView(scene,()=>20);
view.update(job.snapshot());assert.equal(view.stats().draws,0);
job.start();const freefall=job.snapshot(),before=JSON.stringify(freefall);
view.update(freefall,freefall.pose);assert(!view.stats().parachute);
const deployed={...freefall,stage:'flare',pose:{...freefall.pose,y:40}};
view.update(deployed,deployed.pose);assert(!view.stats().parachute);
assert.equal(scene.children[0].children.length,1,'no canopy or rope mesh remains');
assert(!scene.getObjectByName('Player deployed ram-air parachute'));
const instances=view.stats().instances,propMesh=scene.getObjectByName('Skylark mission props');
const version=propMesh.instanceMatrix.version;
for(let i=0;i<20;i++)view.update(deployed,deployed.pose);
assert.equal(view.stats().instances,instances,'repeated updates keep a stable prop pool');
assert.equal(propMesh.instanceMatrix.version,version,'unchanged mission props do not reupload matrices');
assert(instances<=112);assert.equal(view.stats().draws,1);
const landingMatrix=new THREE.Matrix4(),landingPoint=new THREE.Vector3();
propMesh.getMatrixAt(instances-34,landingMatrix);landingPoint.setFromMatrixPosition(landingMatrix);
assert(Math.abs(Math.hypot(landingPoint.x-deployed.layout.landing.x,landingPoint.z-deployed.layout.landing.z)-deployed.layout.landing.radius)<1e-3,'high-contrast landing stripe follows the actual landing radius');
const loot={...deployed,stage:'loot',pose:null,lootCollected:false,marker:deployed.layout.loot};
view.update(loot,loot.layout.origin);assert(!view.stats().parachute);assert(view.stats().instances>0);
const count=view.stats().instances;
view.update({...loot,lootCollected:true},loot.layout.origin);assert(view.stats().instances<count,'collected case disappears');
view.update(loot,{x:5000,z:5000});assert.equal(view.stats().draws,0);
const marker=deployed.layout.airRoute[1],flight={...deployed,stage:'flight',marker,pose:null};
view.update(flight,marker);assert.equal(view.stats().draws,1);assert.equal(view.stats().instances,20,'distant air gate shares the existing prop pool');
const gateMesh=scene.children[0].children.find(child=>child.isInstancedMesh),matrix=new THREE.Matrix4(),translation=new THREE.Vector3();
gateMesh.getMatrixAt(5,matrix);translation.setFromMatrixPosition(matrix);
assert(translation.y>marker.y+marker.radius*.9,'upright gate uses the supplied airborne height');
view.update(flight,{x:5000,z:5000});assert.equal(view.stats().draws,0,'distant gates cull independently of the yard');
view.update({...deployed,active:false},deployed.pose);assert.equal(view.stats().draws,0);
assert.equal(JSON.stringify(freefall),before);assert.deepEqual(view.physicalProps,[]);
let disposals=0;scene.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposals++);});
view.dispose();view.dispose();assert.equal(disposals,1);assert.equal(scene.children.length,0);

// The two visible pieces exactly partition each shared collider's box, even
// after rotation. No drawn cap or crate lid adds a hidden physical protrusion.
const cover=[
 {id:'cover-barrier',kind:'barrier',x:530,z:-320,y:20,yaw:.7,width:.9,length:4,height:1.05},
 {id:'cover-crate',kind:'crate',x:475,z:-280,y:20,yaw:-1.1,width:1.4,length:1.5,height:1.3},
];
const coverBefore=JSON.stringify(cover),coverScene=new THREE.Scene(),coverView=createSkylineSiteView(coverScene,()=>999,{cover});
coverView.update(freefall,freefall.layout.origin);
const coverMesh=coverScene.getObjectByName('Skylark mission props');
assert.equal(coverView.stats().draws,1);assert.equal(coverView.stats().cover,2);
assert(coverView.stats().instances<=112);
for(const [index,p]of cover.entries()){
 const origin=new THREE.Object3D();origin.position.set(p.x,p.y,p.z);origin.rotation.y=p.yaw;origin.updateMatrix();
 const inverse=origin.matrix.clone().invert(),point=new THREE.Vector3(),bounds=new THREE.Box3();
 for(let part=0;part<2;part++){
  coverMesh.getMatrixAt(index*2+part,matrix);
  for(let corner=0;corner<8;corner++){
   point.set(corner&1?.5:-.5,corner&2?.5:-.5,corner&4?.5:-.5).applyMatrix4(matrix).applyMatrix4(inverse);
   bounds.expandByPoint(point);
  }
 }
 for(const [actual,expected]of [[bounds.min.x,-p.width/2],[bounds.max.x,p.width/2],[bounds.min.z,-p.length/2],[bounds.max.z,p.length/2],[bounds.min.y,0],[bounds.max.y,p.height]])assert(Math.abs(actual-expected)<1e-4,'shared physical and drawn cover extents agree');
}
const barrierColor=new THREE.Color(),crateColor=new THREE.Color();coverMesh.getColorAt(0,barrierColor);coverMesh.getColorAt(2,crateColor);
assert(!barrierColor.equals(crateColor),'concrete and timber have distinct visible finishes');
const coverVersion=coverMesh.instanceMatrix.version;
for(let i=0;i<50;i++)coverView.update(freefall,freefall.layout.origin);
assert.equal(coverMesh.instanceMatrix.version,coverVersion,'static cover does not rebuild or reupload while active');
coverView.update(freefall,{x:5000,z:5000});assert.equal(coverView.stats().cover,0);assert.equal(coverView.stats().draws,0);
coverView.update({...freefall,active:false},freefall.layout.origin);assert.equal(coverView.stats().cover,0);
assert.equal(JSON.stringify(cover),coverBefore,'renderer never modifies shared collider descriptors');
coverView.dispose();coverView.dispose();assert.equal(coverScene.children.length,0);
const cappedScene=new THREE.Scene(),capped=createSkylineSiteView(cappedScene,()=>20,{cover:[{...cover[0],height:NaN},{...cover[0],width:-1},...Array.from({length:25},(_,i)=>({...cover[i%2],id:`bounded-${i}`}))]});
capped.update(freefall,freefall.layout.origin);assert.equal(capped.stats().cover,18,'invalid boxes are ignored and authored cover count has a stable cap');
assert(capped.stats().instances<=112);assert.equal(capped.stats().draws,1);capped.dispose();
console.log('PASS Skylark site view: stage/pose authority, safe/case state, bounded pooled instances, canopy-free dive/landing ring, exact shared cover extents/finishes, active culling/static reuse and idempotent disposal.');
