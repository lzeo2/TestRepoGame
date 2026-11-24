import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { CAPITAL_BY_ID as BY_ID } from '../../assets/car-arcade/fleet.js';
import { PERSON_MODEL, appearanceForPerson, createPersonGeometries, emitPersonParts } from './person-model.js';

// Meeting gestures, two armed companions and brief tracers reuse seven batches.
export function createCampaignScenesView(scene,heightAt,{capacity=4}={}) {
  const root=new THREE.Group();root.name='Campaign meeting cast';scene.add(root);
  const shapes=createPersonGeometries(), material=new THREE.MeshLambertMaterial({color:0xffffff});
  const batches={}, color=new THREE.Color(), local=new THREE.Object3D(), world=new THREE.Object3D(), matrix=new THREE.Matrix4();
  const appearances=new Map(['student','corporate','basement'].map(id=>[`player:${id}`,appearanceForPerson(`player:${id}`)]));
  // Borrow the original cockpit anchors once; factory resources remain shared.
  const cabins=new Map(Object.keys(BY_ID).map(id=>{
    const factory=createCar(id),eye=factory.userData.cockpit.eye;
    return [id,{eye,scale:Math.min(1,(BY_ID[id].height-eye[1]-.025)/PERSON_MODEL.seatedHeadTop),rear:Math.min(.78,BY_ID[id].length*.18),bed:factory.userData.bed}];
  }));
  const carPose=new THREE.Object3D(),seat=new THREE.Object3D(),seated={kind:'driver'};
  for(const [name,parts] of [['torso',1],['head',1],['hair',1],['arms',2],['legs',2],['shoes',12],['hands',2]]) {
    const instances=capacity*parts;
    const mesh=new THREE.InstancedMesh(shapes[PERSON_MODEL.shapes[name]],material,instances);
    mesh.name=`Meeting ${name}`;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for(let i=0;i<instances;i++)mesh.setColorAt(i,color.setHex(0xffffff));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches[name]=mesh;
  }
  let disposed=false;
  const poses=new Map();
  let jointPose=null,jointIndex=0,blend=1;
  const targetJoint=new Float64Array(7);
  const stats={people:0,drawCalls:0,maxDrawCalls:7,geometries:3,materials:1,triangles:0,disposed:false};
  function part(name,x,y,z,sx,sy,sz,tint,rx=0) {
    const mesh=batches[name];if(mesh.count>=mesh.instanceMatrix.count)return;
    if(jointPose && (name==='arms'||name==='hands'||name==='legs'||name==='shoes')) {
      const target=targetJoint,index=jointIndex++;
      target[0]=x;target[1]=y;target[2]=z;target[3]=sx;target[4]=sy;target[5]=sz;target[6]=rx;
      let values=jointPose[index];
      if(!values)values=jointPose[index]=Array.from(target);
      else for(let i=0;i<7;i++)values[i]+=(target[i]-values[i])*blend;
      [x,y,z,sx,sy,sz,rx]=values;
    }
    local.position.set(x,y,z);local.rotation.set(rx,0,0);local.scale.set(sx,sy,sz);local.updateMatrix();
    matrix.multiplyMatrices(world.matrix,local.matrix);mesh.setMatrixAt(mesh.count,matrix);mesh.setColorAt(mesh.count,color.setHex(tint));mesh.count++;
  }
  function shotTrace(shot,startY,floorY=null) {
    if(!(shot?.remaining>0)||![shot.from?.x,shot.from?.z,shot.to?.x,shot.to?.z].every(Number.isFinite))return;
    const dx=shot.to.x-shot.from.x,dz=shot.to.z-shot.from.z,length=Math.hypot(dx,dz),mesh=batches.shoes;
    if(!(length>0&&length<=28)||mesh.count>=mesh.instanceMatrix.count)return;
    const endY=floorY??heightAt(shot.to.x,shot.to.z);if(!Number.isFinite(endY))return;
    local.position.set((shot.from.x+shot.to.x)/2,(startY+endY+1.22)/2,(shot.from.z+shot.to.z)/2);
    local.rotation.set(0,Math.atan2(dx,dz),0);local.scale.set(.025,.025,length);local.updateMatrix();
    mesh.setMatrixAt(mesh.count,local.matrix);mesh.setColorAt(mesh.count,color.setHex(0xffd879));mesh.count++;
  }
  function update(people=[],focus=null,{interiorId=null,dt=0}={}) {
    if(disposed)return;
    jointPose=null;blend=1-Math.exp(-14*Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0)));
    stats.people=stats.drawCalls=stats.triangles=0;
    for(const mesh of Object.values(batches))mesh.count=0;
    const seen=new Set();
    for(const person of Array.isArray(people)?people:[]) {
      if(stats.people>=capacity)break;
      if(typeof person?.id==='string'&&seen.has(person.id))continue;
      const contract=person?.role==='contract-target'||person?.role==='contract-guard';
      const appearance=contract?person.appearance:appearances.get(person?.appearanceId);
      if(!appearance||(person.interiorId||null)!==interiorId||person.active===false||![person.x,person.z,person.yaw].every(Number.isFinite))continue;
      if(focus&&(!Number.isFinite(focus.x)||!Number.isFinite(focus.z)||Math.hypot(person.x-focus.x,person.z-focus.z)>140))continue;
      const y=person.interiorId?person.floorY:heightAt(person.x,person.z);if(!Number.isFinite(y))continue;
      if(person.bedRider===true&&person.bedPose) {
        poses.delete(person.id);
        const bed=cabins.get(person.carModelId)?.bed,side=person.bedPose.side;
        if(!bed||(side!==1&&side!==-1))continue;
        if(typeof person.id==='string')seen.add(person.id);
        const s=Math.sin(person.yaw),c=Math.cos(person.yaw);
        const frontY=heightAt(person.x-s*2,person.z-c*2),rearY=heightAt(person.x+s*2,person.z+c*2);
        if(![frontY,rearY].every(Number.isFinite))continue;
        carPose.position.set(person.x,y+.18,person.z);carPose.rotation.set(Math.atan2(frontY-rearY,4),person.yaw,0,'YXZ');carPose.updateMatrix();
        // Reuse the standing rig rotated flat at the tray anchor: supine, feet
        // toward the cab and head toward the tail. The pose is view-only.
        seat.position.set(bed.slots[side<0?0:1],bed.floorY+.16,bed.z);
        seat.rotation.set(Math.PI/2,0,0);seat.scale.setScalar(appearance.height);seat.updateMatrix();
        world.matrix.multiplyMatrices(carPose.matrix,seat.matrix);emitPersonParts(appearance,{kind:'standing',stride:0},part);
        stats.people++;continue;
      }
      if(person.seated===true) {
        poses.delete(person.id);
        const cabin=cabins.get(person.carModelId);if(!cabin||![0,1].includes(person.seatIndex))continue;
        const {eye,scale,rear}=cabin,s=Math.sin(person.yaw),c=Math.cos(person.yaw);
        const frontY=heightAt(person.x-s*2,person.z-c*2),rearY=heightAt(person.x+s*2,person.z+c*2);
        if(![frontY,rearY].every(Number.isFinite))continue;
        carPose.position.set(person.x,y+.18,person.z);carPose.rotation.set(Math.atan2(frontY-rearY,4),person.yaw,0,'YXZ');carPose.updateMatrix();
        seat.position.set(-eye[0],eye[1],eye[2]+(person.seatIndex?rear:0));seat.scale.setScalar(scale);seat.updateMatrix();
        world.matrix.multiplyMatrices(carPose.matrix,seat.matrix);emitPersonParts(appearance,seated,part);
        const shot=person.shot;
        if(shot?.remaining>0&&[shot.from?.x,shot.from?.z,shot.to?.x,shot.to?.z].every(Number.isFinite)) {
          const dx=shot.to.x-shot.from.x,dz=shot.to.z-shot.from.z,length=Math.hypot(dx,dz);
          if(length>0&&length<=28) {
            const muzzleY=y+.18+eye[1]-.32*scale;
            world.position.set(shot.from.x,muzzleY,shot.from.z);world.rotation.set(0,Math.atan2(-dx,-dz),0);world.scale.setScalar(1);world.updateMatrix();
            part('shoes',0,0,-.06,.09,.10,.26,0x292d32);
            part('shoes',0,-.09,.01,.07,.17,.08,0x43454a,-.2);
            part('shoes',0,.015,-.24,.045,.045,.14,0x14181c);
            shotTrace(shot,muzzleY);
          }
        }
        if(typeof person.id==='string')seen.add(person.id);
        stats.people++;continue;
      }
      const phase=contract?person.phase:person.gesturePhase;
      if(!Number.isFinite(phase))continue;
      if(typeof person.id==='string')seen.add(person.id);
      const fall=contract&&person.health<=0?Math.min(1,person.deathTime*4):0;
      world.position.set(person.x,y+.035+fall*.23,person.z);
      world.rotation.set(fall?-Math.PI/2*fall:person.hitPhase>0?-.10:0,person.yaw,0,contract?'YXZ':'XYZ');
      world.scale.setScalar(appearance.height);world.updateMatrix();
      const combat=person.mode==='combat',armed=person.armed===true;
      // Only local limb transforms ease; checked world and vehicle poses stay immediate.
      jointIndex=0;
      jointPose=poses.get(person.id);
      if(!jointPose){jointPose=[];if(typeof person.id==='string')poses.set(person.id,jointPose);}
      let arm=0,hand=0;const gesture=Math.sin(phase*2.7+stats.people)*.12;
      const stride=(contract&&!fall||person.mode==='following')
        ? Math.sin(phase*(contract?3:9))*Math.min(.6,(person.speed||0)*(contract ? .19 : .16)) : 0;
      emitPersonParts(appearance,{kind:'standing',stride},(name,x,py,z,sx,sy,sz,tint,rx=0)=>{
        if(!contract&&name==='arms'&&arm++===1){rx=combat?-1.45:armed?-.35:-.85+gesture;z=combat?-.23:-.10;}
        if(!contract&&name==='hands'&&hand++===1){py=combat?1.19:armed?.84:1.12+gesture*.1;z=combat?-.48:armed?-.22:-.32;}
        part(name,x,py,z,sx,sy,sz,tint,rx);
      });
      if(armed) {
        const gunY=combat?1.23:.88,gunZ=combat?-.56:-.30;
        part('shoes',.30,gunY,gunZ,.09,.10,.26,0x292d32);
        part('shoes',.30,gunY-.09,gunZ+.07,.07,.17,.08,0x43454a,-.2);
        part('shoes',.30,gunY+.015,gunZ-.18,.045,.045,.14,0x14181c);
      } else if(!contract)part('shoes',.30,1.10+gesture*.1,-.37,.18,.12,.018,0xe7dfc9,-.2);
      jointPose=null;
      shotTrace(person.shot,y+1.22,person.interiorId?y:null);
      stats.people++;
    }
    for(const id of poses.keys())if(!seen.has(id))poses.delete(id);
    for(const mesh of Object.values(batches)) {
      mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
      if(mesh.visible){stats.drawCalls++;stats.triangles+=mesh.count*mesh.geometry.index.count/3;}
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;root.removeFromParent();
    for(const mesh of Object.values(batches))mesh.dispose();
    Object.values(shapes).forEach(shape=>shape.dispose());material.dispose();
    cabins.clear();appearances.clear();poses.clear();jointPose=null;
    stats.people=stats.drawCalls=stats.triangles=0;stats.disposed=true;
  }
  return {update,stats,dispose};
}
