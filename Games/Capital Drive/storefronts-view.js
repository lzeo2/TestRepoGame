import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { MAPPED_STORES } from './stores.js';

// Original bitmap alphabet; no fonts, real logos or source-business labels.
const GLYPHS = {
 '0':'01110 10001 10011 10101 11001 10001 01110','1':'00100 01100 00100 00100 00100 00100 01110',
 '2':'01110 10001 00001 00010 00100 01000 11111','3':'11110 00001 00001 01110 00001 00001 11110',
 '4':'00010 00110 01010 10010 11111 00010 00010','5':'11111 10000 10000 11110 00001 00001 11110',
 '6':'01110 10000 10000 11110 10001 10001 01110','7':'11111 00001 00010 00100 01000 01000 01000',
 '8':'01110 10001 10001 01110 10001 10001 01110','9':'01110 10001 10001 01111 00001 00001 01110',
 A:'01110 10001 10001 11111 10001 10001 10001',B:'11110 10001 10001 11110 10001 10001 11110',
 C:'01111 10000 10000 10000 10000 10000 01111',D:'11110 10001 10001 10001 10001 10001 11110',
 E:'11111 10000 10000 11110 10000 10000 11111',F:'11111 10000 10000 11110 10000 10000 10000',
 G:'01111 10000 10000 10111 10001 10001 01111',H:'10001 10001 10001 11111 10001 10001 10001',
 I:'11111 00100 00100 00100 00100 00100 11111',J:'00111 00010 00010 00010 10010 10010 01100',
 K:'10001 10010 10100 11000 10100 10010 10001',L:'10000 10000 10000 10000 10000 10000 11111',
 M:'10001 11011 10101 10101 10001 10001 10001',N:'10001 11001 10101 10011 10001 10001 10001',
 O:'01110 10001 10001 10001 10001 10001 01110',P:'11110 10001 10001 11110 10000 10000 10000',
 Q:'01110 10001 10001 10001 10101 10010 01101',R:'11110 10001 10001 11110 10100 10010 10001',
 S:'01111 10000 10000 01110 00001 00001 11110',T:'11111 00100 00100 00100 00100 00100 00100',
 U:'10001 10001 10001 10001 10001 10001 01110',V:'10001 10001 10001 10001 10001 01010 00100',
 W:'10001 10001 10001 10101 10101 10101 01010',X:'10001 10001 01010 00100 01010 10001 10001',
 Y:'10001 10001 01010 00100 00100 00100 00100',Z:'11111 00001 00010 00100 01000 10000 11111',
 ' ':'00000 00000 00000 00000 00000 00000 00000',"'":'00100 00100 00000 00000 00000 00000 00000',
 '-':'00000 00000 00000 11111 00000 00000 00000','&':'01100 10010 10100 01000 10101 10010 01101',
};
const RANGE = 180;

export function createStorefrontsView(scene,heightAt,{excludeIds=[]}={}) {
  const stores=MAPPED_STORES.filter(store=>!excludeIds.includes(store.id));
  const root=new THREE.Group();root.name='Mapped parody storefronts';scene.add(root);
  const atlasWidth=1024,rowHeight=32;
  const atlasHeight=2**Math.ceil(Math.log2(Math.max(32,stores.length*2*rowHeight)));
  const pixels=new Uint8Array(atlasWidth*atlasHeight*4);
  function writeText(label,row) {
    const upper=label.toUpperCase(),scale=Math.min(3,Math.floor((atlasWidth-16)/(upper.length*6)));
    const left=Math.floor((atlasWidth-(upper.length*6-1)*scale)/2),top=row*rowHeight+5;
    for(let n=0;n<upper.length;n++) {
      const rows=GLYPHS[upper[n]]?.split(' ');
      if(!rows) throw new Error(`Unsupported parody sign character: ${upper[n]}`);
      for(let y=0;y<7;y++) for(let x=0;x<5;x++) if(rows[y][x]==='1') {
        for(let dy=0;dy<scale;dy++) for(let dx=0;dx<scale;dx++) {
          const offset=((atlasHeight-1-top-y*scale-dy)*atlasWidth+left+n*6*scale+x*scale+dx)*4;
          pixels[offset]=255;pixels[offset+1]=249;pixels[offset+2]=224;pixels[offset+3]=255;
        }
      }
    }
    return (upper.length*6-1)*scale/atlasWidth;
  }
  const texture=new THREE.DataTexture(pixels,atlasWidth,atlasHeight,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const solidMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  const textMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const solids=[],texts=[],ranges=[];
  let solidOffset=0,textOffset=0;
  stores.forEach((store,index)=>{
    const f=store.frontage,angle=f.yaw+Math.PI;
    const ground=heightAt(f.x,f.z);
    if(!Number.isFinite(ground)) throw new Error('Storefront requires finite terrain height');
    const width=Math.max(2.2,Math.min(10,f.width-.16));
    const pieces=[];
    function place(geometry) {return geometry.rotateY(angle).translate(f.x,ground,f.z);}
    function box(color,x,y,z,w,h,d) {
      const geometry=place(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
      const colors=new Float32Array(geometry.attributes.position.count*3),rgb=new THREE.Color(color);
      for(let i=0;i<colors.length;i+=3) rgb.toArray(colors,i);
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(geometry);
    }
    const accent=store.type==='food'?0x7d4334:0x354f65;
    // Shallow applied facade only: opaque source buildings remain intact.
    box(0xc8b99e,0,1.38,.075,width,2.76,.10);
    box(accent,0,2.82,.16,width+.12,.64,.16);
    box(accent,0,2.42,.47,width+.10,.12,.90);
    box(0x363e40,0,1.14,.15,.98,2.24,.10);
    box(0x6c8b91,0,1.44,.211,.77,1.32,.018);
    box(0xe3c990,.30,1.05,.23,.045,.25,.04);
    const displayWidth=Math.max(.4,(width-1.55)/2);
    for(const side of [-1,1]) {
      const x=side*(width/4+.28);
      box(0x394849,x,1.28,.15,displayWidth,1.91,.10);
      box(0x769396,x,1.31,.211,displayWidth-.12,1.71,.018);
      box(0xd1c6ad,x,.39,.23,displayWidth,.08,.08);
      box(0xa9c1be,x,1.55,.225,displayWidth-.17,.055,.012);
    }
    // Till plaque marks the exterior interaction, not an enterable interior.
    box(0x303c35,0,.57,.225,.70,.31,.035);
    function lettering(label,row,y,w,h,z) {
      const inkFraction=writeText(label,row);
      const geometry=new THREE.PlaneGeometry(w,h).translate(0,y,z),uv=geometry.attributes.uv;
      // Crop the empty atlas margins so short names remain legible at foot distance.
      for(let v=0;v<uv.count;v++) {
        uv.setX(v,.5+(uv.getX(v)-.5)*(inkFraction+.018));
        uv.setY(v,1-(row*rowHeight+(1-uv.getY(v))*rowHeight)/atlasHeight);
      }
      texts.push(place(geometry));
    }
    lettering(store.name,index*2,2.82,width-.22,.57,.245);
    lettering('TILL',index*2+1,.57,.61,.27,.247);
    const solidCount=pieces.reduce((sum,g)=>sum+g.attributes.position.count,0);
    ranges.push({id:store.id,x:f.x,z:f.z,solidStart:solidOffset,solidCount,textStart:textOffset,textCount:8,shown:true});
    solidOffset+=solidCount;textOffset+=8;solids.push(...pieces);
  });
  const solidGeometry=mergeGeometries(solids,false),textGeometry=mergeGeometries(texts,false);
  for(const geometry of solids) geometry.dispose();for(const geometry of texts) geometry.dispose();
  const solidMesh=new THREE.Mesh(solidGeometry,solidMaterial),textMesh=new THREE.Mesh(textGeometry,textMaterial);
  solidMesh.name='Store facade details';textMesh.name='Parody names and till plaques';
  solidMesh.frustumCulled=textMesh.frustumCulled=false;root.add(solidMesh,textMesh);
  const solidOriginal=solidGeometry.attributes.position.array.slice(),textOriginal=textGeometry.attributes.position.array.slice();
  let visible=0,disposed=false;
  function slice(geometry,original,start,count,show) {
    const array=geometry.attributes.position.array,end=(start+count)*3;
    for(let i=start*3;i<end;i++) array[i]=show?original[i]:0;
    geometry.attributes.position.needsUpdate=true;
  }
  function update(focus) {
    if(disposed) return;
    const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z);visible=0;
    for(const range of ranges) {
      const dx=valid?range.x-focus.x:Infinity,dz=valid?range.z-focus.z:Infinity;
      const show=dx*dx+dz*dz<RANGE*RANGE;
      if(show) visible++;
      if(show===range.shown) continue;
      range.shown=show;
      slice(solidGeometry,solidOriginal,range.solidStart,range.solidCount,show);
      slice(textGeometry,textOriginal,range.textStart,range.textCount,show);
    }
    solidMesh.visible=textMesh.visible=visible>0;
  }
  update(null);
  return {update,
    get stats(){return Object.freeze({sites:stores.length,visible,drawCalls:visible?2:0,triangles:(solidGeometry.index.count+textGeometry.index.count)/3,geometryCount:2,materialCount:2,textureCount:1,cullDistance:RANGE,disposed});},
    dispose(){if(disposed)return;disposed=true;visible=0;scene.remove(root);solidGeometry.dispose();textGeometry.dispose();solidMaterial.dispose();textMaterial.dispose();texture.dispose();},
  };
}
