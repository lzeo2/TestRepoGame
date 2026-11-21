import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createWatercraftView } from '../Games/Capital Drive/watercraft-view.js';

const scene=new THREE.Scene(), view=createWatercraftView(scene), [mesh]=scene.children;
const lake=5.93, focus={x:0,z:0};
const boat={id:'watercraft:boat',kind:'boat',x:0,z:0,y:lake,yaw:0,length:5.1,width:2.15,speed:0};
const ski={id:'watercraft:jet-ski',kind:'jet-ski',x:4,z:0,y:lake,yaw:0,length:2.83,width:1.04,speed:0};
const sign={x:18,y:7,z:14,yaw:0};
const matrix=new THREE.Matrix4();
const bounds = () => {
  const shape=new THREE.Box3(), unit=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
  for (let i=0;i<mesh.count;i++) { mesh.getMatrixAt(i,matrix);shape.union(unit.clone().applyMatrix4(matrix)); }
  return shape;
};

view.update({crafts:[boat]},focus);
assert.equal(view.stats.drawCalls,1);
assert.equal(view.stats.bodies,1);
const boatCount=mesh.count, boatBounds=bounds().getSize(new THREE.Vector3());
assert(boatBounds.x>2&&boatBounds.z>4.8,'the open motorboat has full size layered hull and stern');
mesh.getMatrixAt(0,matrix);assert(Math.abs(matrix.elements[13]-(lake-.13))<1e-6,'the hull starts at actual water elevation');
const version=mesh.instanceMatrix.version;
view.update({crafts:[{...boat}]},focus);
assert.equal(mesh.instanceMatrix.version,version,'stationary repeated snapshots cause no upload');

view.update({crafts:[ski]},focus);
const skiCount=mesh.count, skiBounds=bounds().getSize(new THREE.Vector3());
assert(skiBounds.x<1.1&&skiBounds.z<2.6&&skiBounds.y>.9,'the narrow personal craft has a standing console and handlebar');
assert.notEqual(skiCount,boatCount);

view.update({crafts:[{...boat,speed:8,occupied:true},{...ski,speed:10,occupied:true}],dock:{sign}},focus);
assert.equal(view.stats.drawCalls,1);assert.equal(view.stats.bodies,2);assert.equal(view.stats.wakes,2);assert(view.stats.sign);
assert(mesh.count>boatCount+skiCount+18,'seated figures, wakes and a real lettered shed sign share the batch');
assert(mesh.count<=view.stats.capacity);
assert.equal(scene.children.length,1,'no per-craft meshes or lights');

view.update({crafts:[boat,ski],dock:{sign}}, {x:240,z:0});
assert.equal(view.stats.bodies,2);assert.equal(view.stats.sign,false,'dock sign culls before the larger moving hulls');
view.update({crafts:[boat,ski],dock:{sign}}, {x:1000,z:0});
assert.equal(view.stats.bodies,0);assert.equal(view.stats.drawCalls,0);
view.update({crafts:[{...boat,x:NaN},null,{...ski,kind:'invalid'}]},focus);
assert.equal(view.stats.drawCalls,0);

const disposed=[];
mesh.geometry.addEventListener('dispose',()=>disposed.push('geometry'));
mesh.material.addEventListener('dispose',()=>disposed.push('material'));
view.dispose();view.dispose();view.update({crafts:[boat]},focus);
assert.deepEqual(disposed,['geometry','material']);assert.equal(scene.children.length,0);assert(view.stats.disposed);
console.log('PASS watercraft view: distinct hull sizes, seated riders, wakes and Boat Shed sign in one draw; supplied waterline, no idle uploads, bounded culling and cleanup');
