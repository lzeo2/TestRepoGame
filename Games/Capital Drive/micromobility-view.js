import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {mergeGeometries} from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const RANGE=180, CAPACITY=6;
const COLORS={lemon:0xf0cf36,dark:0x303638,metal:0x9ca7aa,skin:0xbb8764,shirt:0x546d90,pants:0x303e54};
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
function color(geometry,value) {
  const rgb=new THREE.Color(value),colors=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3)rgb.toArray(colors,i);
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}
function model(kind) {
  const parts=[];
  const box=(c,x,y,z,w,h,d)=>parts.push(color(new THREE.BoxGeometry(w,h,d).translate(x,y,z),c));
  function rod(c,a,b,r=.035) {
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const g=new THREE.CylinderGeometry(r,r,delta.length(),6,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    g.translate(...from.add(to).multiplyScalar(.5).toArray());parts.push(color(g,c));
  }
  function wheel(y,z,r) {
    const g=new THREE.TorusGeometry(r,.035,4,10).rotateY(Math.PI/2).translate(0,y,z);parts.push(color(g,COLORS.dark));
    rod(COLORS.metal,[-.11,y,z],[.11,y,z],.045);
  }
  if(kind==='scooter') {
    wheel(.17,-.58,.135);wheel(.17,.48,.135);
    box(COLORS.lemon,0,.22,0,.23,.09,1.06);
    rod(COLORS.lemon,[0,.22,-.48],[0,1.17,-.57],.05);
    rod(COLORS.dark,[-.28,1.17,-.57],[.28,1.17,-.57],.035);
    box(COLORS.dark,0,.38,-.49,.10,.20,.08);
  } else if(kind==='bike') {
    wheel(.36,-.68,.32);wheel(.36,.68,.32);
    for(const [a,b] of [ [[0,.36,.68],[0,.42,.05]], [[0,.36,.68],[0,.91,.35]], [[0,.42,.05],[0,.91,.35]], [[0,.91,.35],[0,.92,-.42]], [[0,.92,-.42],[0,.42,.05]], [[0,.42,.05],[0,.36,-.68]], [[0,.92,-.42],[0,.36,-.68]] ])rod(COLORS.lemon,a,b,.04);
    box(COLORS.dark,0,.97,.30,.24,.09,.32);
    rod(COLORS.metal,[0,.91,-.42],[0,1.15,-.48]);
    rod(COLORS.dark,[-.29,1.15,-.48],[.29,1.15,-.48]);
    box(COLORS.dark,0,.64,.13,.10,.32,.15);
    rod(COLORS.metal,[-.19,.42,.05],[.19,.42,.05]);
  } else if(kind==='stand') {
    box(COLORS.dark,0,.035,0,2.5,.07,.9);
    box(COLORS.lemon,0,.95,.55,.10,1.9,.10);
    box(COLORS.lemon,0,1.6,.55,.65,.42,.09);
    // Original cutout-inspired lemon and leaf mark, with no imported brand assets.
    parts.push(color(new THREE.SphereGeometry(.16,8,5).scale(1,.65,.25).translate(0,1.6,.49),COLORS.dark));
    box(COLORS.dark,.16,1.73,.49,.15,.04,.02);
  } else {
    const seated=kind==='rider-bike',hip=seated?1.13:1.13,shoulder=seated?1.51:1.57;
    box(COLORS.shirt,0,(hip+shoulder)/2,seated?.10:0,.36,shoulder-hip,.23);
    const head=new THREE.SphereGeometry(.16,8,6).translate(0,shoulder+.19,seated?-.04:0);parts.push(color(head,COLORS.skin));
    const helmet=new THREE.SphereGeometry(.173,8,4,0,Math.PI*2,0,Math.PI/2).translate(0,shoulder+.23,seated?-.04:0);parts.push(color(helmet,COLORS.lemon));
    for(const side of [-1,1]) {
      const x=side*.12;
      if(seated) {
        rod(COLORS.pants,[x,hip,.18],[x,.76,-.12],.075);rod(COLORS.pants,[x,.76,-.12],[x,.46,.05],.065);
      } else rod(COLORS.pants,[x,hip,0],[x,.33,side*.14],.075);
      box(COLORS.dark,x,seated?.43:.30,seated?-.01:side*.14,.13,.09,.26);
      rod(COLORS.shirt,[side*.23,shoulder-.05,0],[side*.24,1.27,-.28],.055);
      rod(COLORS.skin,[side*.24,1.27,-.28],[side*.25,1.17,seated?-.48:-.57],.045);
    }
  }
  const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();return geometry;
}
export function createMicromobilityView(scene,heightAt) {
  const root=new THREE.Group();root.name='Original Lemon rental vehicles';scene.add(root);
  const material=new THREE.MeshLambertMaterial({vertexColors:true}),meshes=new Map(),dummy=new THREE.Object3D();
  for(const kind of ['scooter','bike','stand','rider-scooter','rider-bike']) {
    const mesh=new THREE.InstancedMesh(model(kind),material,kind==='stand'?3:kind.startsWith('rider')?1:CAPACITY);
    mesh.name=`Lemon ${kind}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;root.add(mesh);meshes.set(kind,mesh);
  }
  let disposed=false,visibleAssets=0,visibleStands=0,drawCalls=0,triangles=0;
  function update(snapshot,focus,dt=0) {
    if(disposed)return;
    for(const mesh of meshes.values()){mesh.count=0;mesh.visible=false;}
    visibleAssets=visibleStands=drawCalls=triangles=0;
    if(!snapshot||!valid(focus))return;
    function put(kind,pose) {
      if(!valid(pose)||Math.hypot(pose.x-focus.x,pose.z-focus.z)>RANGE)return false;
      const mesh=meshes.get(kind);if(mesh.count>=mesh.instanceMatrix.count)return false;
      const sampled=heightAt(pose.x,pose.z);
      dummy.position.set(pose.x,Number.isFinite(sampled)?sampled+.04:.04,pose.z);dummy.rotation.set(0,Number.isFinite(pose.yaw)?pose.yaw:0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++,dummy.matrix);return true;
    }
    for(const stand of (snapshot.stands||[]).slice(0,3))if(put('stand',stand))visibleStands++;
    for(const asset of (snapshot.assets||[]).slice(0,CAPACITY))if(asset.available&&['bike','scooter'].includes(asset.kind)&&put(asset.kind,asset))visibleAssets++;
    const active=snapshot.active;
    if(active&&['bike','scooter'].includes(active.kind)) {
      if(put(active.kind,active))visibleAssets++;
      put(`rider-${active.kind}`,active);
    }
    for(const mesh of meshes.values()) {
      mesh.visible=mesh.count>0;
      if(mesh.visible){mesh.instanceMatrix.needsUpdate=true;drawCalls++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*mesh.count;}
    }
  }
  return {update,
    get stats(){return Object.freeze({visibleAssets,visibleStands,drawCalls,triangles,geometryCount:5,materialCount:1,textureCount:0,capacity:CAPACITY,disposed});},
    dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const mesh of meshes.values())mesh.geometry.dispose();material.dispose();visibleAssets=visibleStands=drawCalls=triangles=0;},
  };
}
