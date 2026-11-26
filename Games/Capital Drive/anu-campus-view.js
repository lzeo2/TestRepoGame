import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {ANU_CAMPUS} from './anu-campus-data.js';

// Original paving and lawn colour on exact source outlines. No new colliders.
export function createAnuCampusView(scene,heightAt) {
  const root=new THREE.Group();root.name='ANU source lawn and pedestrian avenue';scene.add(root);
  const geometries=[],materials=[];let disposed=false;
  function mesh(vertices,tint,name,map=null,uv=null) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();geometries.push(g);
    if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    const m=new THREE.MeshLambertMaterial({color:tint,map,side:THREE.DoubleSide});materials.push(m);
    const body=new THREE.Mesh(g,m);body.name=name;root.add(body);
  }
  const ring=ANU_CAMPUS.lawn.points.slice(0,-1),vertices=[];
  const faces=THREE.ShapeUtils.triangulateShape(ring.map(p=>new THREE.Vector2(...p)),[]);
  for(const face of faces)for(const i of face){const [x,z]=ring[i];vertices.push(x,heightAt(x,z)+.035,z);}
  mesh(vertices,0x65784c,'Kambri Lawn source outline');
  // A single mipmapped tile gives University Avenue its photographed pale
  // rectangular pavers without adding one polygon or request per stone.
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const row=Math.floor(y/16),u=(x+(row%2)*16)%size,col=Math.floor(u/32);
    const edge=y%16===0||u%32===0;
    const grain=((x*17+y*37+x*y*5)%11)-5;
    const shade=(edge?148:193+(row*3+col*5)%9)+grain;
    const i=(y*size+x)*4;pixels[i]=shade;pixels[i+1]=shade-1;pixels[i+2]=shade-5;pixels[i+3]=255;
  }
  const stone=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  stone.colorSpace=THREE.SRGBColorSpace;stone.wrapS=stone.wrapT=THREE.RepeatWrapping;
  stone.magFilter=THREE.LinearFilter;stone.minFilter=THREE.LinearMipmapLinearFilter;stone.generateMipmaps=true;stone.needsUpdate=true;
  const paving=[],uv=[];
  for(const path of ANU_CAMPUS.pedestrianPaths){
    let along=0;
    for(let i=0;i<path.points.length-1;i++){
    const a=path.points[i],b=path.points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.01)continue;
    const ox=-dz/length*path.width/2,oz=dx/length*path.width/2;
    const ground=(x,z)=>{
      if(path.layer!==1)return heightAt(x,z)+.045;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length)));
      return heightAt(...a)*(1-t)+heightAt(...b)*t+.06;
    };
    const corners=[[a[0]+ox,a[1]+oz],[a[0]-ox,a[1]-oz],[b[0]-ox,b[1]-oz],[b[0]+ox,b[1]+oz]];
    for(const index of [0,1,2,0,2,3]){
      const [x,z]=corners[index];paving.push(x,ground(x,z),z);
      uv.push((along+(index>=2?length:0))/1.6,(index===0||index===3?0:path.width)/1.6);
    }
    along+=length;
    }
  }
  mesh(paving,0xffffff,'University Avenue pedestrian source spans',stone,uv);
  return {update(position){root.visible=Math.hypot(position.x+1480,position.z+4500)<850;},
    stats(){return {draws:disposed||!root.visible?0:2,triangles:geometries.reduce((n,g)=>n+g.attributes.position.count/3,0)};},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());stone.dispose();}};
}
