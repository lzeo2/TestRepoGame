import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { MAPPED_STORES } from './stores.js';
import { frontageProfile, paintShopWindow } from './storefront-materials.js';

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
  // The bottom-left texel is a neutral material swatch for the untextured trim.
  pixels.fill(255,0,4);
  const swatch=[.5/atlasWidth,.5/atlasHeight];
  const solidMaterial=new THREE.MeshLambertMaterial({vertexColors:true,map:texture});
  const textMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const solids=[],texts=[],ranges=[];
  let solidOffset=0,solidIndices=0;
  stores.forEach((store,index)=>{
    const f=store.frontage,angle=f.yaw+Math.PI;
    const ground=heightAt(f.x,f.z);
    if(!Number.isFinite(ground)) throw new Error('Storefront requires finite terrain height');
    const width=Math.max(2.2,Math.min(10,f.width-.16));
    const pieces=[];
    function place(geometry) {return geometry.rotateY(angle).translate(f.x,ground,f.z);}
    function finish(g,tint,windowUV=null) {
      const colors=new Float32Array(g.attributes.position.count*3),rgb=new THREE.Color(tint),uv=g.attributes.uv;
      for(let v=0;v<uv.count;v++) {
        rgb.toArray(colors,v*3);
        if(windowUV)uv.setXY(v,windowUV.u0+uv.getX(v)*(windowUV.u1-windowUV.u0),windowUV.v0+uv.getY(v)*(windowUV.v1-windowUV.v0));
        else uv.setXY(v,...swatch);
      }
      g.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(place(g));
    }
    function box(color,x,y,z,w,h,d) {
      finish(new THREE.BoxGeometry(w,h,d).translate(x,y,z),color);
    }
    function panel(tint,x,y,z,w,h,windowUV=null) {
      finish(new THREE.PlaneGeometry(w,h).translate(x,y,z),tint,windowUV);
    }
    const profile=frontageProfile(store);
    const fixedSash=store.district==='Kingston' && store.road==='Kennedy Street';
    const timber=store.district==='Dickson';
    const canopyDepth=timber?.8:.9;
    box(profile.surround,0,1.38,.075,width,2.76,.10);
    box(profile.fascia,0,2.82,.16,width+.12,.64,.16);
    box(profile.soffit,0,2.43,canopyDepth/2+.02,width+.10,.11,canopyDepth);
    box(profile.edge,0,2.44,canopyDepth-.002,width+.10,.13,.04);
    // Thin edge cover and the two recessed soffit lights read from the footpath.
    panel(0xa8aaa1,0,2.45,canopyDepth+.02,width+.10,.018);
    for(const side of [-1,1])box(0xe0ceb0,side*width*.28,2.369,.54,.38,.014,.061);
    if(timber)for(let j=0;j<3;j++)box(0x827464,0,2.368,.28+j*.18,width-.1,.012,.016);
    if(fixedSash) {
      panel(0xe3d8c2,0,3.12,.245,width+.10,.026);
      for(const side of [-1,1])panel(0xd3bfa6,side*(width/2-.045),1.28,.252,.07,2.20);
    }
    // A recessed glazed leaf with an aluminium kickplate, transom and pull bar.
    box(0x363e40,0,1.14,.15,.98,2.24,.10);
    panel(0x526f79,0,1.23,.211,.78,1.89);
    panel(0x94acb2,0,1.98,.219,.76,.31);
    panel(0x3a505c,0,.53,.22,.76,.36);
    panel(0x303e45,0,1.76,.225,.8,.045);
    box(0xc5c4af,.29,1.07,.241,.042,.36,.038);
    const displayWidth=Math.max(.4,(width-1.55)/2);
    for(const side of [-1,1]) {
      const x=side*(width/4+.28);
      const print=paintShopWindow(pixels,atlasWidth,atlasHeight,store,index,side,profile.display);
      box(0x394849,x,1.28,.15,displayWidth,1.91,.10);
      panel(0xffffff,x,1.31,.211,displayWidth-.12,1.71,print);
      box(0xd1c6ad,x,.39,.23,displayWidth,.08,.08);
      panel(0x303e45,x,1.82,.235,displayWidth-.10,.048);
      panel(0xc4d0c9,x,1.849,.236,displayWidth-.11,.010);
      if(displayWidth>.70)box(0x3e4647,x+side*displayWidth*.15,1.30,.233,.042,1.74,.032);
      panel(0x535454,x,.46,.217,displayWidth-.10,.044);
    }
    box(0x45524d,.285,1.38,.232,.145,.080,.018);
    function lettering(label,row,y,w,h,z,x=0) {
      const inkFraction=writeText(label,row);
      const aspect=(inkFraction+.018)*atlasWidth/rowHeight;
      const width=Math.min(w,h*aspect);
      const geometry=new THREE.PlaneGeometry(width,width/aspect).translate(x,y,z),uv=geometry.attributes.uv;
      // Crop the empty atlas margins so short names remain legible at foot distance.
      for(let v=0;v<uv.count;v++) {
        uv.setX(v,.5+(uv.getX(v)-.5)*(inkFraction+.018));
        uv.setY(v,1-(row*rowHeight+(1-uv.getY(v))*rowHeight)/atlasHeight);
      }
      texts.push(place(geometry));
    }
    lettering(store.name,index*2,2.82,width-.22,.57,.245);
    lettering('PULL',index*2+1,1.38,.135,.072,.244,.285);
    const solidCount=pieces.reduce((sum,g)=>sum+g.attributes.position.count,0);
    const indexCount=pieces.reduce((sum,g)=>sum+g.index.count,0);
    ranges.push({id:store.id,x:f.x,z:f.z,start:solidIndices,count:indexCount,vertexStart:solidOffset,vertexCount:solidCount,shown:false});
    solidOffset+=solidCount;solidIndices+=indexCount;solids.push(...pieces);
  });
  function merged(geometries) {
    if(geometries.length)return mergeGeometries(geometries,false);
    const empty=new THREE.BufferGeometry();
    empty.setAttribute('position',new THREE.Float32BufferAttribute([],3));empty.setIndex([]);
    return empty;
  }
  const solidGeometry=merged(solids),textGeometry=merged(texts);
  for(const geometry of solids) geometry.dispose();for(const geometry of texts) geometry.dispose();
  const solidMesh=new THREE.Mesh(solidGeometry,solidMaterial),textMesh=new THREE.Mesh(textGeometry,textMaterial);
  solidMesh.name='Store facade details';textMesh.name='Parody names and door plates';
  solidMesh.frustumCulled=textMesh.frustumCulled=false;root.add(solidMesh,textMesh);
  solidGeometry.userData.tenancies=ranges.map(({id,vertexStart,vertexCount})=>({id,vertexStart,vertexCount}));
  // Switch only the indices when a tenancy enters/leaves range. Ground positions,
  // lighting normals, texture UVs and the lettering atlas remain static.
  const solidSource=solidGeometry.index.array.slice(),textSource=textGeometry.index.array.slice();
  for(const geometry of [solidGeometry,textGeometry]){
    geometry.index.setUsage(THREE.DynamicDrawUsage);
    geometry.setDrawRange(0,0);
  }
  let visible=0,disposed=false;
  function upload(geometry,used) {
    geometry.setDrawRange(0,used);
    geometry.index.clearUpdateRanges();
    if(used){geometry.index.addUpdateRange(0,used);geometry.index.needsUpdate=true;}
  }
  function update(focus) {
    if(disposed)return;
    const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z);
    let changed=false;visible=0;
    for(const range of ranges) {
      const dx=valid?range.x-focus.x:Infinity,dz=valid?range.z-focus.z:Infinity;
      const show=dx*dx+dz*dz<RANGE*RANGE;
      if(show)visible++;
      if(show!==range.shown){range.shown=show;changed=true;}
    }
    if(changed){
      let solidUsed=0,textUsed=0;
      for(let i=0;i<ranges.length;i++){
        const range=ranges[i];if(!range.shown)continue;
        solidGeometry.index.array.set(solidSource.subarray(range.start,range.start+range.count),solidUsed);
        textGeometry.index.array.set(textSource.subarray(i*12,i*12+12),textUsed);
        solidUsed+=range.count;textUsed+=12;
      }
      upload(solidGeometry,solidUsed);upload(textGeometry,textUsed);
    }
    solidMesh.visible=textMesh.visible=visible>0;
  }
  update(null);
  return {update,
    get stats(){return Object.freeze({sites:stores.length,visible,drawCalls:visible?2:0,triangles:(solidGeometry.index.count+textGeometry.index.count)/3,drawnTriangles:(solidGeometry.drawRange.count+textGeometry.drawRange.count)/3,geometryCount:2,materialCount:2,textureCount:1,cullDistance:RANGE,disposed});},
    dispose(){if(disposed)return;disposed=true;visible=0;scene.remove(root);solidGeometry.dispose();textGeometry.dispose();solidMaterial.dispose();textMaterial.dispose();texture.dispose();},
  };
}
