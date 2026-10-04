import * as THREE from '../vendor/three.module.js';
import { PASSENGER_STUDIES, createDetailedCar } from './detailed.js';
import { SPORT_STUDIES } from './detail-profiles.js';

// Fictional parked variants only. Each call owns an untouched fresh base first.
export const POLICE_STUDIES = Object.freeze({
  wardline: Object.freeze({...PASSENGER_STUDIES.lantern, id:'wardline', name:'Wardline Patrol', color:'#171b22', roofColor:'#e7e8e5', plate:'WRD 12'}),
  strake: Object.freeze({...SPORT_STUDIES.serein, id:'strake', name:'Strake Interceptor', color:'#171b22', roofColor:'#e7e8e5', plate:'STK 09'}),
});

export function createPoliceCar(id) {
  if (typeof id !== 'string' || !Object.hasOwn(POLICE_STUDIES,id)) throw new RangeError('Unknown police study');
  const p=POLICE_STUDIES[id], patrol=id==='wardline';
  const car=createDetailedCar(patrol?'lantern':'serein');
  car.name=`${id}-detailed-study`;
  Object.assign(car.userData,{id,name:p.name});
  const body=car.getObjectByName('body-paint'), roof=car.getObjectByName('roof-paint');
  body.material.color.set(p.color); roof.material.color.set(p.roofColor);
  car.getObjectByName('registration-plate').material.userData.label=p.plate;
  const white=body.material.clone(); white.color.set('#e7e8e5');
  // Repartition existing stamping quads, retaining positions, joins and normals.
  // The white doors are actual hull faces, never panels hiding another body.
  const g=body.geometry, pos=g.attributes.position, blackFaces=[],whiteFaces=[];
  const radius=car.userData.wheels[0].position.y;
  for(let i=0;i<g.index.count;i+=6){
    const face=Array.from(g.index.array.slice(i,i+6));
    const center=new THREE.Vector3();
    for(const j of face)center.add(new THREE.Vector3().fromBufferAttribute(pos,j));
    center.multiplyScalar(1/face.length);
    const door=Math.abs(center.x)>p.width*.32 && Math.abs(center.z)<p.wheelbase/2-radius-.06 && center.y<p.bodyHeight*.99;
    (door?whiteFaces:blackFaces).push(...face);
  }
  g.setIndex([...blackFaces,...whiteFaces]);g.clearGroups();
  g.addGroup(0,blackFaces.length,0);g.addGroup(blackFaces.length,whiteFaces.length,1);
  body.material=[body.material,white];
  car.updateMatrixWorld(true);
  const add=(geometry,material,name=material.name)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
    mesh.castShadow=true;mesh.receiveShadow=true;car.add(mesh);return mesh;
  };
  const solid=(name,color)=>new THREE.MeshStandardMaterial({name,color,roughness:.42,metalness:.18});
  const box=(mat,x,y,z,w,h,d)=>{
    const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y,z);return add(geometry,mat);
  };
  const mount=solid('police-mount','#25282d');
  const roofZ=(p.roofFront+p.roofRear)*p.length/2;
  const roofAt=(x,z)=>{
    const hit=new THREE.Raycaster(new THREE.Vector3(x,p.height+1,z),new THREE.Vector3(0,-1,0)).intersectObject(roof)[0];
    if(!hit)throw new Error('Police mount outside roof');
    return hit.point.y;
  };
  const span=patrol?1.10:.86, depth=patrol?.20:.16;
  const baseY=roofAt(0,roofZ)+.065, baseHeight=.035;
  for(const side of [-1,1]){
    // Each foot's lower vertices touch the actual triangulated roof, not H.
    const foot=new THREE.BoxGeometry(.10,.1,depth*.72), a=foot.attributes.position;
    for(let i=0;i<a.count;i++){
      const x=a.getX(i)+side*span*.34,z=a.getZ(i)+roofZ;
      a.setXYZ(i,x,a.getY(i)<0?roofAt(x,z):baseY-baseHeight/2,z);
    }
    foot.computeVertexNormals();add(foot,mount);
  }
  box(mount,0,baseY,roofZ,span,baseHeight,depth);
  for(const [side,name,color] of [[-1,'police-light-red','#d32632'],[1,'police-light-blue','#245fe0']]){
    const lens=new THREE.MeshPhysicalMaterial({name,color,roughness:.18,clearcoat:.8,metalness:0});
    box(lens,side*span*.255,baseY+baseHeight/2+.035,roofZ,span*.45,.07,depth*.88);
  }
  // Small text-only skins sampled on the real door. Transparent canvas leaves
  // the underlying two-tone hull visible; no white rectangular overlay livery.
  const lettering=new THREE.MeshStandardMaterial({name:'police-lettering',color:'#ffffff',roughness:.65,transparent:true,alphaTest:.5,side:THREE.FrontSide});
  for(const side of [-1,1]){
    const positions=[],uv=[],index=[],nu=32,nv=4;
    const zCenter=patrol?-.28:-.56, width=patrol?.90:.78;
    const low=patrol?.60:.43, height=patrol?.20:.16;
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
      const u=i/nu,v=j/nv,z=zCenter-side*(u-.5)*width,y=low+v*height;
      const hit=new THREE.Raycaster(new THREE.Vector3(side*(p.width+1),y,z),new THREE.Vector3(-side,0,0)).intersectObject(body)[0];
      if(!hit)throw new Error('Police lettering outside door');
      positions.push(hit.point.x+side*.0015,y,z);uv.push(u,v);
    }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
      const a=j*(nu+1)+i;index.push(a,a+1,a+nu+1,a+1,a+nu+2,a+nu+1);
    }
    const text=new THREE.BufferGeometry();
    text.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    text.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));text.setIndex(index);text.computeVertexNormals();
    add(text,lettering);
  }
  if(patrol){
    const pushbar=solid('police-pushbar','#25282d'),z=-p.length/2-.065;
    // Compact center guard below the headlights; feet return to the bumper.
    for(const x of [-.27,.27]){
      box(pushbar,x,.51,z,.045,.35,.055);
      box(pushbar,x,.365,z+.065,.045,.045,.16);
    }
    box(pushbar,0,.675,z,.585,.045,.055);
  }
  return car;
}
