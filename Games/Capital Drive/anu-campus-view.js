import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {ANU_CAMPUS} from './anu-campus-data.js';

// Original paving and lawn colour on exact source outlines. No new colliders.
export function createAnuCampusView(scene,heightAt) {
  const root=new THREE.Group();root.name='ANU source lawn and pedestrian avenue';scene.add(root);
  const geometries=[],materials=[];let disposed=false;
  function mesh(vertices,tint,name) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();geometries.push(g);
    const m=new THREE.MeshLambertMaterial({color:tint,side:THREE.DoubleSide});materials.push(m);
    const body=new THREE.Mesh(g,m);body.name=name;root.add(body);
  }
  const ring=ANU_CAMPUS.lawn.points.slice(0,-1),vertices=[];
  const faces=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]);
  for(const face of faces)for(const i of face){const [x,z]=ring[i];vertices.push(x,heightAt(x,z)+.035,z);}
  mesh(vertices,0x65784c,'Kambri Lawn source outline');
  const paving=[];
  for(const path of ANU_CAMPUS.pedestrianPaths)for(let i=0;i<path.points.length-1;i++){
    const a=path.points[i],b=path.points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.01)continue;
    const ox=-dz/length*path.width/2,oz=dx/length*path.width/2;
    const ground=(x,z)=>{
      if(path.layer!==1)return heightAt(x,z)+.045;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length)));
      return heightAt(...a)*(1-t)+heightAt(...b)*t+.06;
    };
    const corners=[[a[0]+ox,a[1]+oz],[a[0]-ox,a[1]-oz],[b[0]-ox,b[1]-oz],[b[0]+ox,b[1]+oz]];
    for(const index of [0,1,2,0,2,3]){const [x,z]=corners[index];paving.push(x,ground(x,z),z);}
  }
  mesh(paving,0xbab5a5,'University Avenue pedestrian source spans');
  return {update(position){root.visible=Math.hypot(position.x+1480,position.z+4500)<850;},
    stats(){return {draws:disposed||!root.visible?0:2,triangles:geometries.reduce((n,g)=>n+g.attributes.position.count/3,0)};},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
