import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { PERSON_MODEL, appearanceForPerson, createPersonGeometries, emitPersonParts } from './person-model.js';

// One factory van and one shared human-model driver. All resources are owned here.
export function createDeliveryView(scene,heightAt,{vehicleHeightAt = null} = {}) {
  const root = new THREE.Group(); root.name = 'Dispatch courier'; scene.add(root);
  const van = createCar('dockside',{color:'#b68b48'}); root.add(van);
  const geometries = new Set(), materials = new Set(), copies = new Map(), paints = new Map();
  van.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!copies.has(mesh.geometry)) {const shape=mesh.geometry.clone();copies.set(mesh.geometry,shape);geometries.add(shape);}
    if (!paints.has(mesh.material)) {const paint=mesh.material.clone();paints.set(mesh.material,paint);materials.add(paint);}
    mesh.geometry=copies.get(mesh.geometry);mesh.material=paints.get(mesh.material);
  });
  const shapes = createPersonGeometries(), parts = [], pose = new THREE.Object3D(), color = new THREE.Color();
  emitPersonParts(appearanceForPerson('delivery-driver'),{kind:'passenger',stride:0},(part,x,y,z,sx,sy,sz,tint,rx=0) => {
    const shape=shapes[PERSON_MODEL.shapes[part]].clone();
    pose.position.set(x,y,z);pose.rotation.set(rx,0,0);pose.scale.set(sx,sy,sz);pose.updateMatrix();shape.applyMatrix4(pose.matrix);
    const colors=new Float32Array(shape.attributes.position.count*3);color.set(tint);
    for(let i=0;i<colors.length;i+=3)color.toArray(colors,i);
    shape.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(shape);
  });
  const adultShape=mergeGeometries(parts,false);geometries.add(adultShape);
  parts.forEach(p=>p.dispose());Object.values(shapes).forEach(p=>p.dispose());
  const adultPaint=new THREE.MeshLambertMaterial({vertexColors:true});materials.add(adultPaint);
  const driver=new THREE.Mesh(adultShape,adultPaint);driver.name='Seated delivery driver';van.add(driver);
  const eye=van.userData.cockpit.eye;
  driver.position.set(eye[0],eye[1],eye[2]);
  driver.scale.setScalar(Math.min(1,(van.userData.dimensions.height-eye[1]+.005)/PERSON_MODEL.seatedHeadTop));
  let disposed=false,wheelAngle=0;
  const stats={cars:0,drivers:0,carLimit:1,driverLimit:1};
  function update(snapshot,{focus={x:0,z:0},dt=0}={}) {
    if(disposed)return;
    const car=snapshot?.car;
    van.visible=!!car?.active && Math.hypot(car.x-focus.x,car.z-focus.z)<260;
    stats.cars=stats.drivers=Number(van.visible);
    if(!van.visible)return;
    const ground=(x,z)=>vehicleHeightAt ? vehicleHeightAt({x,z,yaw:car.yaw},car.road) : heightAt(x,z);
    const fx=-Math.sin(car.yaw),fz=-Math.cos(car.yaw);
    van.position.set(car.x,ground(car.x,car.z)+.18,car.z);
    van.rotation.set(Math.atan2(ground(car.x+fx*2,car.z+fz*2)-ground(car.x-fx*2,car.z-fz*2),4),car.yaw,0,'YXZ');
    wheelAngle=(wheelAngle+Math.max(0,Math.min(.1,dt))*car.speed/van.userData.profile.wheelRadius)%(Math.PI*2);
    for(const wheel of van.userData.wheels)wheel.rotation.x=wheelAngle;
  }
  return {update,get stats(){return Object.freeze({...stats,disposed});},dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());stats.cars=stats.drivers=0;
  }};
}
