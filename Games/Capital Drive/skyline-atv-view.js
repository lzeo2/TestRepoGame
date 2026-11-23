import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {mergeGeometries} from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

// One merged original four-wheeler and optional seated rider; no remote art.
export function createSkylineAtvView(scene){
  const body=[],rider=[];
  function add(parts,g,tint){g.deleteAttribute('uv');const color=new THREE.Color(tint),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)color.toArray(values,i);g.setAttribute('color',new THREE.BufferAttribute(values,3));parts.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();}
  const box=(parts,tint,x,y,z,w,h,d,rx=0)=>add(parts,new THREE.BoxGeometry(w,h,d).rotateX(rx).translate(x,y,z),tint);
  box(body,0x363f3f,0,.43,0,.65,.25,1.46);box(body,0x8c985d,0,.65,-.46,.85,.27,.67);
  box(body,0x849254,0,.60,.56,.85,.22,.62);box(body,0x272f30,0,.83,.12,.43,.16,.83);
  for(const side of [-1,1]){
    box(body,0x64754b,side*.45,.60,-.57,.26,.10,.63);box(body,0x64754b,side*.45,.60,.57,.26,.10,.63);
    box(body,0x393f40,side*.44,.24,.10,.28,.09,.65);
    for(const z of [-.58,.58]){
      add(body,new THREE.CylinderGeometry(.28,.28,.22,12).rotateZ(Math.PI/2).translate(side*.52,.28,z),0x20282b);
      add(body,new THREE.CylinderGeometry(.12,.12,.235,8).rotateZ(Math.PI/2).translate(side*.52,.28,z),0x969b91);
    }
    box(body,0x293434,side*.35,.82,-.73,.045,.045,.38);box(body,0x293434,side*.35,.80,.70,.045,.045,.40);
    box(body,0x333b3e,side*.27,1.02,-.32,.35,.045,.045);
    box(body,0xe7dec1,side*.26,.70,-.805,.20,.11,.035);
    box(rider,0x344450,side*.16,.79,-.06,.18,.20,.47,-.25);
    box(rider,0x35454f,side*.25,.54,-.23,.16,.44,.16,.12);
    box(rider,0x293233,side*.25,.34,-.29,.19,.10,.29);
    box(rider,0xb89976,side*.28,1.12,-.16,.12,.36,.13,-.7);
  }
  for(const z of [-.82,.82])box(body,0x293434,0,.81,z,.73,.045,.045);
  box(body,0x424b48,0,.91,-.25,.055,.25,.055);box(body,0xa4b2a5,0,1.035,-.28,.13,.06,.10);
  box(rider,0x63765d,0,1.13,.07,.45,.46,.25,.10);
  add(rider,new THREE.SphereGeometry(.145,8,6).translate(0,1.52,.02),0xb89976);
  add(rider,new THREE.SphereGeometry(.15,8,4,0,Math.PI*2,0,Math.PI/2).translate(0,1.55,.02),0x35434b);
  const bodyCount=body.reduce((n,g)=>n+g.attributes.position.count,0),geometry=mergeGeometries([...body,...rider],false);
  for(const g of [...body,...rider])g.dispose();body.length=rider.length=0;geometry.computeBoundingSphere();
  const material=new THREE.MeshLambertMaterial({vertexColors:true}),mesh=new THREE.Mesh(geometry,material);mesh.name='Skylark four-wheel ATV and seated rider';mesh.visible=false;scene.add(mesh);
  const original=geometry.attributes.position.array.slice();let occupied=null,disposed=false;
  const triangles=geometry.attributes.position.count/3;
  return {update(state,focus){
    if(disposed)return;const vehicle=state?.vehicle;
    mesh.visible=!!vehicle&&vehicle.active!==false&&focus&&[vehicle.x,vehicle.y,vehicle.z,vehicle.yaw,focus.x,focus.z].every(Number.isFinite)&&Math.hypot(vehicle.x-focus.x,vehicle.z-focus.z)<180;
    if(!mesh.visible)return;
    const seated=state.occupied===true;
    if(seated!==occupied){occupied=seated;const p=geometry.attributes.position;for(let i=bodyCount*3;i<p.array.length;i++)p.array[i]=seated?original[i]:0;p.needsUpdate=true;}
    mesh.position.set(vehicle.x,vehicle.y+.04,vehicle.z);mesh.rotation.y=vehicle.yaw;
  },get stats(){return {drawCalls:disposed||!mesh.visible?0:1,triangles:disposed||!mesh.visible?0:triangles,wheels:4,geometries:disposed?0:1,materials:disposed?0:1,textures:0,occupied:!!occupied,disposed};},
  dispose(){if(disposed)return;disposed=true;scene.remove(mesh);geometry.dispose();material.dispose();}};
}
