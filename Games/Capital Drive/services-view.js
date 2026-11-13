import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { GENERIC_SERVICES as SERVICES } from './services.js';

// Original five-by-seven lettering, generated locally without fonts or images.
const LETTERS = {
  A:['01110','10001','10001','11111','10001','10001','10001'], C:['01111','10000','10000','10000','10000','10000','01111'],
  D:['11110','10001','10001','10001','10001','10001','11110'], E:['11111','10000','10000','11110','10000','10000','11111'],
  F:['11111','10000','10000','11110','10000','10000','10000'], G:['01111','10000','10000','10111','10001','10001','01111'],
  I:['11111','00100','00100','00100','00100','00100','11111'], K:['10001','10010','10100','11000','10100','10010','10001'],
  L:['10000','10000','10000','10000','10000','10000','11111'], M:['10001','11011','10101','10101','10001','10001','10001'],
  N:['10001','11001','10101','10011','10001','10001','10001'], O:['01110','10001','10001','10001','10001','10001','01110'],
  P:['11110','10001','10001','11110','10000','10000','10000'], R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'], Y:['10001','10001','01010','00100','00100','00100','00100'],
};
const LABELS = {food:'FOOD',gym:'GYM',arms:'SUPPLIES'};
const COLORS = {food:0x756346,gym:0x465c69,arms:0x5b6053};
const RANGE = 250;
const valid = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);

export function createServicesView(scene,heightAt) {
  const root = new THREE.Group(); root.name = 'Fictional service signs'; scene.add(root);
  const pixels = new Uint8Array(256*256*4);
  function text(label,row,y,scale) {
    const start = Math.floor((256-(label.length*6-1)*scale)/2);
    for(let letter=0;letter<label.length;letter++) {
      const glyph = LETTERS[label[letter]];
      if(!glyph) throw new Error('Unsupported service sign letter');
      for(let gy=0;gy<7;gy++) for(let gx=0;gx<5;gx++) if(glyph[gy][gx]==='1') {
        for(let sy=0;sy<scale;sy++) for(let sx=0;sx<scale;sx++) {
          const x = start+letter*6*scale+gx*scale+sx, py = row*64+y+gy*scale+sy;
          const index = ((255-py)*256+x)*4;
          pixels[index]=246; pixels[index+1]=241; pixels[index+2]=223; pixels[index+3]=255;
        }
      }
    }
  }
  SERVICES.forEach((service,i) => {
    text(service.name.split(' ')[0].toUpperCase(),i,7,2); text(LABELS[service.type],i,29,3);
  });
  const texture = new THREE.DataTexture(pixels,256,256,THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
  const solidMaterial = new THREE.MeshLambertMaterial({vertexColors:true});
  const signMaterial = new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const solids=[], signs=[], ranges=[];
  let solidOffset=0,signOffset=0;
  function coloredBox(color,x,y,z,w,h,d) {
    const geometry = new THREE.BoxGeometry(w,h,d).translate(x,y,z);
    const rgb = new THREE.Color(color), colors = new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3) rgb.toArray(colors,i);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3)); return geometry;
  }
  SERVICES.forEach((service,index) => {
    const sampled = heightAt(service.x,service.z), y = Number.isFinite(sampled)?sampled:0;
    const pieces = [coloredBox(0x454846,service.x,y+1.1,service.z,.10,2.2,.10),coloredBox(COLORS[service.type],service.x,y+2,service.z,1.8,.78,.12)];
    const count = pieces.reduce((sum,item)=>sum+item.attributes.position.count,0);
    solids.push(...pieces);
    for(const side of [-1,1]) {
      const face = new THREE.PlaneGeometry(1.74,.74);
      if(side===-1) face.rotateY(Math.PI);
      face.translate(service.x,y+2,service.z+side*.062);
      const uv = face.attributes.uv;
      for(let vertex=0;vertex<uv.count;vertex++) uv.setY(vertex,(3-index+uv.getY(vertex))/4);
      signs.push(face);
    }
    ranges.push({solidStart:solidOffset,solidCount:count,signStart:signOffset,signCount:8,x:service.x,z:service.z});
    solidOffset+=count;signOffset+=8;
  });
  const solidGeometry = mergeGeometries(solids,false), signGeometry=mergeGeometries(signs,false);
  for(const geometry of [...solids,...signs]) geometry.dispose();
  const solidMesh = new THREE.Mesh(solidGeometry,solidMaterial), signMesh = new THREE.Mesh(signGeometry,signMaterial);
  solidMesh.name='Service posts and boards';signMesh.name='Service sign lettering';
  solidMesh.frustumCulled=signMesh.frustumCulled=false; root.add(solidMesh,signMesh);
  const shown=ranges.map(()=>null);
  const originalSolid=solidGeometry.attributes.position.array.slice(), originalSign=signGeometry.attributes.position.array.slice();
  let disposed=false,visible=0;
  function update(focus) {
    if(disposed) return;
    visible=0;
    let dirty=false;
    for(let i=0;i<ranges.length;i++) {
      const range=ranges[i];
      const show=valid(focus)&&Math.hypot(range.x-focus.x,range.z-focus.z)<RANGE;
      if(show) visible++;
      if(shown[i]===show)continue;shown[i]=show;dirty=true;
      for(const [geometry,original,start,count] of [[solidGeometry,originalSolid,range.solidStart,range.solidCount],[signGeometry,originalSign,range.signStart,range.signCount]]) {
        const array=geometry.attributes.position.array;
        for(let vertex=start;vertex<start+count;vertex++) for(let axis=0;axis<3;axis++) array[vertex*3+axis]=show?original[vertex*3+axis]:0;
      }
    }
    if(dirty)solidGeometry.attributes.position.needsUpdate=signGeometry.attributes.position.needsUpdate=true;
    solidMesh.visible=signMesh.visible=visible>0;
  }
  update(null);
  return {update,
    get stats(){return Object.freeze({sites:SERVICES.length,visible,drawCalls:visible?2:0,triangles:(solidGeometry.index.count+signGeometry.index.count)/3,geometryCount:2,materialCount:2,textureCount:1,disposed});},
    dispose(){if(disposed)return;disposed=true;scene.remove(root);solidGeometry.dispose();signGeometry.dispose();solidMaterial.dispose();signMaterial.dispose();texture.dispose();visible=0;},
  };
}
