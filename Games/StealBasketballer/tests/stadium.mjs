import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {COURT} from '../js/court-config.js';
import {createCourtDetails,replacedCourtVisual} from '../js/court-view.js';
import {createStadiumView} from '../js/stadium-view.js';

// Detached geometry/resource fixtures, not renderer or native play evidence.
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const court=createCourtDetails();
const floor=court.root.getObjectByName('Hardwood floor');
const floorBounds=new THREE.Box3().setFromObject(floor);
close(floorBounds.max.y,.175);close(floorBounds.min.x,-61);close(floorBounds.max.z,34);
const markings=court.root.getObjectByName('Regulation court markings');
assert(markings.geometry.attributes.normal.array.every((n,i)=>i%3!==1||n>.99),'Court markings face upward');
const bounds=new THREE.Box3().setFromObject(markings);
close(bounds.min.x,-47.08);close(bounds.max.x,47.08);close(bounds.min.z,-25.08);close(bounds.max.z,25.08);
const rims=court.root.getObjectByName('Regulation rims'),matrix=new THREE.Matrix4(),position=new THREE.Vector3();
assert.equal(rims.count,2);close(rims.geometry.parameters.radius,COURT.rimRadius);
for(let i=0;i<2;i++){rims.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);close(position.x,(i===0?-1:1)*41.75);close(position.y,10.175);close(position.z,0);}
assert(replacedCourtVisual({venue:true,name:'Hardwood'}));assert(!replacedCourtVisual({venue:true,name:'ArenaGround'}));assert(!replacedCourtVisual({venue:false,name:'BasketRim'}));
court.dispose();court.dispose();assert.equal(court.root.children.length,0);
const stadium=createStadiumView(),colliders=stadium.colliders;
const counters=[];
for(let level=0;level<=3;level++) {
  stadium.setLevel(level);const snapshot=stadium.snapshot();counters.push(snapshot);
  assert.equal(snapshot.level,level);assert(snapshot.drawCalls<=15);assert(snapshot.triangles<30000);
  assert.strictEqual(stadium.colliders,colliders,'Integration keeps a stable collider array');
  assert(stadium.colliders[0].containsPoint(stadium.entryOffset));
  assert(stadium.colliders[0].containsPoint(new THREE.Vector3(-47,.175,-25)));
  for(const collider of stadium.colliders.slice(1)) {
    assert(!collider.intersectsBox(new THREE.Box3(new THREE.Vector3(-47,.2,-25),new THREE.Vector3(47,25,25))),'Stands never obstruct playable court');
  }
  stadium.root.traverse(node=>{
    if(node.geometry)assert(node.geometry.attributes.position.array.every(Number.isFinite));
    if(node.isInstancedMesh)assert(node.instanceMatrix.array.every(Number.isFinite));
  });
}
for(let i=1;i<4;i++){assert(counters[i].triangles>counters[i-1].triangles);assert(counters[i].colliders.length>counters[i-1].colliders.length);}
stadium.update({match:{score:[18,27]},lowGraphics:true});assert.equal(stadium.snapshot().score,'18:27');
assert(!stadium.root.getObjectByName('Laced nets').visible);
stadium.update({lowGraphics:false});assert(stadium.root.getObjectByName('Laced nets').visible);
stadium.setLevel(-8);assert.equal(stadium.snapshot().level,0);stadium.setLevel(90);assert.equal(stadium.snapshot().level,3);
const resources=new Set();stadium.root.traverse(node=>{if(node.isInstancedMesh)resources.add(node);if(node.geometry)resources.add(node.geometry);if(node.material)resources.add(node.material);});
let disposed=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>disposed++));
stadium.dispose();assert.equal(disposed,resources.size);stadium.dispose();assert.equal(disposed,resources.size);
assert.equal(stadium.snapshot().drawCalls,0);assert.equal(stadium.colliders.length,0);
stadium.setLevel(3);stadium.update();assert.equal(stadium.root.children.length,0);
console.log(`stadium PASS: court feet, upward paint, tiers ${counters.map(c=>`${c.drawCalls} draws/${c.triangles} triangles`).join(', ')}, entry/collisions, score, low graphics, idempotent disposal`);
