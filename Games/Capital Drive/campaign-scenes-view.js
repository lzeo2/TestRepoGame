import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { PERSON_MODEL, appearanceForPerson, createPersonGeometries, emitPersonParts } from './person-model.js';

// Meeting gestures, two armed companions and brief tracers reuse seven batches.
export function createCampaignScenesView(scene,heightAt) {
  const root=new THREE.Group();root.name='Campaign meeting cast';scene.add(root);
  const shapes=createPersonGeometries(), material=new THREE.MeshLambertMaterial({color:0xffffff});
  const batches={}, color=new THREE.Color(), local=new THREE.Object3D(), world=new THREE.Object3D(), matrix=new THREE.Matrix4();
  const appearances=new Map(['student','corporate','basement'].map(id=>[`player:${id}`,appearanceForPerson(`player:${id}`)]));
  for(const [name,capacity] of [['torso',2],['head',2],['hair',2],['arms',4],['legs',4],['shoes',24],['hands',4]]) {
    const mesh=new THREE.InstancedMesh(shapes[PERSON_MODEL.shapes[name]],material,capacity);
    mesh.name=`Meeting ${name}`;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for(let i=0;i<capacity;i++)mesh.setColorAt(i,color.setHex(0xffffff));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches[name]=mesh;
  }
  let disposed=false;
  const stats={people:0,drawCalls:0,maxDrawCalls:7,geometries:3,materials:1,triangles:0,disposed:false};
  function part(name,x,y,z,sx,sy,sz,tint,rx=0) {
    const mesh=batches[name];if(mesh.count>=mesh.instanceMatrix.count)return;
    local.position.set(x,y,z);local.rotation.set(rx,0,0);local.scale.set(sx,sy,sz);local.updateMatrix();
    matrix.multiplyMatrices(world.matrix,local.matrix);mesh.setMatrixAt(mesh.count,matrix);mesh.setColorAt(mesh.count,color.setHex(tint));mesh.count++;
  }
  function update(people=[],focus=null) {
    if(disposed)return;
    stats.people=stats.drawCalls=stats.triangles=0;
    for(const mesh of Object.values(batches))mesh.count=0;
    for(const person of Array.isArray(people)?people:[]) {
      if(stats.people>=2)break;
      const appearance=appearances.get(person?.appearanceId);
      if(!appearance||person.active===false||![person.x,person.z,person.yaw,person.gesturePhase].every(Number.isFinite))continue;
      if(focus&&(!Number.isFinite(focus.x)||!Number.isFinite(focus.z)||Math.hypot(person.x-focus.x,person.z-focus.z)>140))continue;
      const y=heightAt(person.x,person.z);if(!Number.isFinite(y))continue;
      world.position.set(person.x,y+.035,person.z);world.rotation.set(person.hitPhase>0?-.10:0,person.yaw,0);world.scale.setScalar(appearance.height);world.updateMatrix();
      const combat=person.mode==='combat',armed=person.armed===true;
      let arm=0,hand=0;const gesture=Math.sin(person.gesturePhase*2.7+stats.people)*.12;
      emitPersonParts(appearance,{kind:'standing',stride:person.mode==='following'?Math.sin(person.gesturePhase*9)*Math.min(.6,(person.speed||0)*.16):0},(name,x,py,z,sx,sy,sz,tint,rx=0)=>{
        if(name==='arms'&&arm++===1){rx=combat?-1.45:armed?-.35:-.85+gesture;z=combat?-.23:-.10;}
        if(name==='hands'&&hand++===1){py=combat?1.19:armed?.84:1.12+gesture*.1;z=combat?-.48:armed?-.22:-.32;}
        part(name,x,py,z,sx,sy,sz,tint,rx);
      });
      if(armed) {
        const gunY=combat?1.23:.88,gunZ=combat?-.56:-.30;
        part('shoes',.30,gunY,gunZ,.09,.10,.26,0x292d32);
        part('shoes',.30,gunY-.09,gunZ+.07,.07,.17,.08,0x43454a,-.2);
        part('shoes',.30,gunY+.015,gunZ-.18,.045,.045,.14,0x14181c);
      } else part('shoes',.30,1.10+gesture*.1,-.37,.18,.12,.018,0xe7dfc9,-.2);
      const shot=person.shot;
      if(shot?.remaining>0&&[shot.from?.x,shot.from?.z,shot.to?.x,shot.to?.z].every(Number.isFinite)) {
        const dx=shot.to.x-shot.from.x,dz=shot.to.z-shot.from.z,length=Math.hypot(dx,dz),mesh=batches.shoes;
        if(length>0&&length<=28&&mesh.count<mesh.instanceMatrix.count) {
          const endY=heightAt(shot.to.x,shot.to.z);
          if(Number.isFinite(endY)) {
            local.position.set((shot.from.x+shot.to.x)/2,(y+endY)/2+1.22,(shot.from.z+shot.to.z)/2);
            local.rotation.set(0,Math.atan2(dx,dz),0);local.scale.set(.025,.025,length);local.updateMatrix();
            mesh.setMatrixAt(mesh.count,local.matrix);mesh.setColorAt(mesh.count,color.setHex(0xffd879));mesh.count++;
          }
        }
      }
      stats.people++;
    }
    for(const mesh of Object.values(batches)) {
      mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
      if(mesh.visible){stats.drawCalls++;stats.triangles+=mesh.count*mesh.geometry.index.count/3;}
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;root.removeFromParent();
    for(const mesh of Object.values(batches))mesh.dispose();
    Object.values(shapes).forEach(shape=>shape.dispose());material.dispose();
    stats.people=stats.drawCalls=stats.triangles=0;stats.disposed=true;
  }
  return {update,stats,dispose};
}
