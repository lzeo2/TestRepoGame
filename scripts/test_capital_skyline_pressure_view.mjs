import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createSkylinePressureView} from '../Games/Capital Drive/skyline-pressure-view.js';

const scene=new THREE.Scene(),terrain=(x,z)=>x*.1+z*.05,view=createSkylinePressureView(scene,terrain);
assert.equal(view.stats.draws,0);
const source={active:true,missionId:'skyline:2',encounterId:'wave:1',jammed:false,
 drone:{active:true,id:'hostile:2',x:30,y:40,z:50,yaw:.7,health:45,maxHealth:90,hostile:true},
 strike:{active:true,id:'warning:2',x:35,y:999,z:55,radius:7,remaining:5,total:5}};
const before=structuredClone(source),focus={x:35,z:55};
view.update(source,focus);
assert(view.stats.droneVisible&&view.stats.strikeVisible);assert.equal(view.stats.draws,2);
assert.equal(view.stats.geometryCount,1);assert.equal(view.stats.materialCount,2);
assert.equal(view.stats.instances,58);assert.equal(view.stats.triangles,696);
const drone=scene.getObjectByName('Hostile Skylark quadrotor'),ring=scene.getObjectByName('Skylark red strike telegraph');
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
drone.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
for(const [value,want]of [[position.x,30],[position.y,40],[position.z,50],[scale.x,.9],[scale.y,.3],[scale.z,.65]])assert(Math.abs(value-want)<1e-5);
const red=new THREE.Color();drone.getColorAt(3,red);assert(red.r>red.g&&red.r>red.b,'hostile sensor has an unmistakable red face');
ring.getColorAt(0,red);assert(red.r>red.g&&red.r>red.b,'strike outline is red');
for(let i=0;i<32;i++){
 ring.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
 assert(Math.abs(position.y-terrain(position.x,position.z)-.13)<1e-5,'ring follows the supplied terrain rather than a stale lock height');
 assert(Math.abs(Math.hypot(position.x-source.strike.x,position.z-source.strike.z)-7*Math.cos(Math.PI/32))<1e-5,'actual warning radius matches source');
}
const resources=[drone.geometry,drone.material,ring.geometry,ring.material,drone.instanceMatrix.array,ring.instanceMatrix.array];
const versions=[drone.instanceMatrix.version,ring.instanceMatrix.version],initialOpacity=ring.material.opacity;
for(let i=0;i<100;i++)view.update({...source,strike:{...source.strike,remaining:4-i*.02}},focus);
assert.deepEqual([drone.instanceMatrix.version,ring.instanceMatrix.version],versions,'countdown changes do not regenerate fixed warning geometry');
assert(ring.material.opacity>initialOpacity,'warning becomes stronger as its source countdown advances');
assert.deepEqual([drone.geometry,drone.material,ring.geometry,ring.material,drone.instanceMatrix.array,ring.instanceMatrix.array],resources,'updates reuse all geometry/material/instance resources');
assert.deepEqual(source,before,'view cannot mutate pressure or flight authority');
view.update({...source,drone:{...source.drone,health:0}},focus);assert(!view.stats.droneVisible&&view.stats.strikeVisible,'dead body does not leave a live hostile drone');
view.update({...source,jammed:true,strike:null},focus);assert(view.stats.droneVisible&&!view.stats.strikeVisible,'source cancellation removes warning while jammed drone may remain');
view.update({...source,drone:{...source.drone,hostile:false},strike:null},focus);assert.equal(view.stats.draws,0,'ordinary recon drones are not duplicated by hostile art');
for(const malformed of [{...source.drone,y:NaN},{...source.drone,x:Infinity},{...source.drone,maxHealth:0}]){
 view.update({...source,drone:malformed,strike:null},focus);assert.equal(view.stats.draws,0);
}
for(const malformed of [{...source.strike,remaining:0},{...source.strike,radius:NaN},{...source.strike,radius:-2},{...source.strike,total:0}]){
 view.update({...source,drone:null,strike:malformed},focus);assert.equal(view.stats.draws,0);
}
view.update(source,{x:5000,z:5000});assert.equal(view.stats.draws,0,'far pressure art is culled');
view.update(source,{...focus,interiorId:'unrelated-room'});assert.equal(view.stats.draws,0,'outdoor pressure cannot leak into an indoor scene');
view.update({...source,active:false},focus);assert.equal(view.stats.draws,0);assert.equal(view.stats.instances,0);
view.update(null,focus);assert.equal(view.stats.draws,0);
view.update(source,focus);assert.equal(view.stats.draws,2,'same immutable source can return after hiding');
let geometryDisposals=0,materialDisposals=0,instanceDisposals=0;
drone.geometry.addEventListener('dispose',()=>geometryDisposals++);
for(const m of [drone.material,ring.material])m.addEventListener('dispose',()=>materialDisposals++);
for(const m of [drone,ring])m.addEventListener('dispose',()=>instanceDisposals++);
view.dispose();view.dispose();view.update(source,focus);
assert.equal(scene.children.length,0);assert.equal(view.stats.draws,0);assert.equal(view.stats.instances,0);
assert.equal(geometryDisposals,1);assert.equal(materialDisposals,2);assert.equal(instanceDisposals,2);
console.log('PASS Skylark pressure view: hostile identity and source pose, exact terrain/radius warning, <=2 draws/696tri, stable resources/countdown, authority isolation, active/indoor/distance guards, cancellation and disposal.');
