import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {CAPITAL_BY_ID} from '../assets/car-arcade/fleet.js';
import {createParkedCarsView} from '../Games/Capital Drive/parked-cars-view.js';
const cars=['lantern','orchard','gravel'].map((modelId,i)=>({id:`owner:${i}`,modelId,color:0xa13219,x:i*10,z:0,yaw:0}));
const original=JSON.stringify(cars),scene=new THREE.Scene();
const view=createParkedCarsView(scene,cars,()=>7);
assert.equal(view.chunks.length,1);assert.equal(scene.children[0].children.length,3,'three draws for mixed-model cell');
let vertices=0,bytes=0,triangles=0;
for(const mesh of scene.children[0].children){triangles+=mesh.geometry.index.count/3;bytes+=mesh.geometry.index.array.byteLength;for(const a of Object.values(mesh.geometry.attributes)){bytes+=a.array.byteLength;if(a===mesh.geometry.attributes.position)vertices+=a.count;}}
assert(triangles/cars.length<=210,'bounded low-poly geometry');
for(const car of cars){const record=view.records.get(car.id),box=new THREE.Box3();for(let b=0;b<3;b++){const a=record.meshes[b].geometry.attributes.position,r=record.ranges[b];for(let i=r.start;i<r.start+r.count;i++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(a,i));}const size=box.getSize(new THREE.Vector3()),spec=CAPITAL_BY_ID[car.modelId];assert(Math.abs(size.x-spec.width)<.001);assert(Math.abs(size.y-spec.height)<.001);assert(size.z<spec.length+.04&&size.z>=spec.length);}
const before=scene.children[0].children.map(m=>m.geometry.attributes.position.array.slice());
assert(view.hide('owner:1'));assert(!view.hide('owner:1'));assert(!view.hide('missing'));
for(let b=0;b<3;b++){const r=view.records.get('owner:1').ranges[b],a=scene.children[0].children[b].geometry.attributes.position.array;assert(a.slice(r.start*3,(r.start+r.count)*3).every(v=>v===0));}
view.restore();for(let b=0;b<3;b++)assert.deepEqual(scene.children[0].children[b].geometry.attributes.position.array,before[b]);
assert.equal(JSON.stringify(cars),original,'owner poses and paint unchanged');
view.cull({x:0,z:0});assert(view.chunks[0].group.visible);view.cull({x:2000,z:2000});assert(!view.chunks[0].group.visible);
view.dispose();assert.equal(scene.children.length,0);assert.equal(view.records.size,0);
console.log(`PASS parked view: 3 draws/cell, ${triangles/cars.length} triangles/car, ${bytes/cars.length} geometry bytes/car, exact fleet bounds, owner hide/restore, culling/disposal`);
