import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const LIMIT=3, DISTANCE=160;
const SHIRTS=[0x9c6245,0x46586e,0x626f4b],SKINS=[0xa77451,0xdfad88,0x77513d];
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);

export function createStreetDealersView(scene,heightAt=()=>0) {
  const root=new THREE.Group();root.name='Fictional street contacts';scene.add(root);
  const box=new THREE.BoxGeometry(1,1,1),head=new THREE.SphereGeometry(1,7,5);
  const material=new THREE.MeshLambertMaterial({color:0xffffff});
  const meshes=[];
  for(const [name,geometry,capacity] of [['Dealer clothing',box,21],['Dealer heads',head,3],['Dealer hair',box,3],
    ['Dealer hands',box,6],['Dealer backpacks and cases',box,9],['Dealer shoes',box,6]]) {
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.count=0;mesh.visible=false;
    mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);meshes.push(mesh);
  }
  const body=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4(),color=new THREE.Color();
  let disposed=false,visible=0,draws=0,triangles=0;
  function put(batch,position,scale,tint,rotation=0) {
    const mesh=meshes[batch],index=mesh.count++;
    part.position.set(...position);part.scale.set(...scale);part.rotation.set(rotation,0,0);part.updateMatrix();
    matrix.multiplyMatrices(body.matrix,part.matrix);mesh.setMatrixAt(index,matrix);mesh.setColorAt(index,color.setHex(tint));
  }
  function update(snapshot,focus,dt) {
    if(disposed)return;
    for(const mesh of meshes)mesh.count=0;
    visible=draws=triangles=0;
    const list=(Array.isArray(snapshot)?snapshot:[]).filter(valid).filter(p=>valid(focus)&&Math.hypot(p.x-focus.x,p.z-focus.z)<=DISTANCE)
      .sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z)).slice(0,LIMIT);
    for(const p of list) {
      const palette=Math.abs(Math.trunc(p.palette||0))%3,skin=SKINS[palette],panic=p.panic>0,bob=Math.sin((p.phase||0)*1.7)*.012;
      const ground=heightAt(p.x,p.z);body.position.set(p.x,Number.isFinite(ground)?ground+.05:0,p.z);
      body.rotation.set(0,Number.isFinite(p.yaw)?p.yaw:0,0);body.scale.set(1,1,1);
      if(p.health===0){body.rotation.x=Math.PI/2;body.position.y+=.18;body.position.z-=.6;}
      body.updateMatrix();
      put(0,[0,1.18+bob,0],[.46,.57,.27],SHIRTS[palette]);
      put(1,[0,1.65+bob,0],[.145,.19,.14],skin);
      put(2,[0,1.79+bob,-.015],[.29,.10+palette*.025,.27],[0x292c2d,0x55433a,0x202629][palette]);
      for(const side of [-1,1]) {
        put(0,[side*.12,.50,0],[.17,.84,.20],0x343d48);
        put(0,[side*.29,1.15+bob,panic?.10:0],[.13,.53,.14],SHIRTS[palette],panic?-.55:side*.10);
        put(3,[side*.29,.88+bob,panic?.22:.02],[.12,.14,.12],skin);
        put(5,[side*.12,.07,.045],[.19,.13,.30],0x242a2d);
      }
      // Compact orange bags distinguish these adults without large signs or shop branding.
      put(4,[0,1.19,-.235],[.35,.43,.22],0xa95f2e);
      put(4,[.39,.53,.05],[.13,.38,.48],0x555b5d);
      put(4,[.39,.755,.05],[.07,.07,.17],0xc58d4d);
      visible++;
    }
    for(const mesh of meshes) {
      mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      if(mesh.visible){draws++;triangles+=mesh.count*mesh.geometry.index.count/3;}
    }
  }
  return {update,get stats(){return Object.freeze({count:LIMIT,visible,drawCalls:draws,triangles,capacity:LIMIT,geometryCount:disposed?0:2,materialCount:disposed?0:1,disposed});},
    dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const mesh of meshes)mesh.dispose();box.dispose();head.dispose();material.dispose();visible=draws=triangles=0;}};
}
