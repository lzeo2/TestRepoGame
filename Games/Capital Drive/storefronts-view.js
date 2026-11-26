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
  function writeText(label,row,ink=0xfff9e0) {
    const upper=label.toUpperCase(),scale=Math.min(3,Math.floor((atlasWidth-16)/(upper.length*6)));
    const left=Math.floor((atlasWidth-(upper.length*6-1)*scale)/2),top=row*rowHeight+5;
    for(let n=0;n<upper.length;n++) {
      const rows=GLYPHS[upper[n]]?.split(' ');
      if(!rows) throw new Error(`Unsupported parody sign character: ${upper[n]}`);
      for(let y=0;y<7;y++) for(let x=0;x<5;x++) if(rows[y][x]==='1') {
        for(let dy=0;dy<scale;dy++) for(let dx=0;dx<scale;dx++) {
          const offset=((atlasHeight-1-top-y*scale-dy)*atlasWidth+left+n*6*scale+x*scale+dx)*4;
          pixels[offset]=ink>>16;pixels[offset+1]=(ink>>8)&255;pixels[offset+2]=ink&255;pixels[offset+3]=255;
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
    const {layout,form}=profile;
    const canopyDepth=layout.depth,fasciaY=form==='books'||form==='grille'?2.93:2.82;
    box(profile.surround,0,1.38,.075,width,2.76,.10);
    const badge=store.name==='Sombreroll'||store.name==='The Book Moo'||store.name==='Bake Pause';
    let headerWidth=badge?width*.58:width+.12,signX=badge?-width*.14:0;
    if(badge)box(store.name==='Sombreroll'?0xd9d7c8:profile.surround,0,2.82,.11,width+.12,.62,.09);
    if(form==='galleria'){
      // The upper band runs left of the restaurant plate in the signed arcade photo.
      headerWidth=width*.52;
      signX=(width-headerWidth)/2;
      const section=(width-headerWidth)/6;
      const glazed=[0x38734f,0xe9e6dc,0xaf4b4c];
      box(profile.surround,0,fasciaY,.12,width,.55,.14);
      for(let i=0;i<6;i++)panel(glazed[i%3],-width/2+(i+.5)*section,fasciaY,.2,section-.022,.46);
    }
    box(profile.fascia,signX,fasciaY,.16,headerWidth,layout.canopy==='band'?.40:.53,.16);
    if(store.name==='The Book Moo'||store.name==='Bake Pause'){
      const x=width*.38;
      box(0x4b504a,x,2.24,.52,.052,.21,.52);
      box(0xc0bbac,x,2.36,.52,.065,.018,.54);
      box(0x666c63,x,2.40,.64,.03,.12,.03);
    }
    if(store.name==='You Sushi'){
      // Suspended blade inside the sheltered Flinders Way parade.
      const x=width*.33;
      for(const z of [.35,.75])box(0x565754,x,2.33,z,.018,.18,.016);
      box(0x50544f,x,2.15,.55,.056,.24,.62);
      box(0xe3ded0,x,2.15,.55,.06,.20,.57);
      box(0x97705e,x,2.15,.48,.065,.045,.24);
    }
    const cloth=layout.canopy==='fabric',lean=cloth?.22:0;
    const lip=2.44-Math.sin(lean)*canopyDepth/2;
    const shelter=new THREE.BoxGeometry(width+.1,cloth?.045:.11,canopyDepth).rotateX(lean);
    finish(shelter.translate(0,2.44,canopyDepth/2+.02),profile.soffit);
    box(profile.edge,0,lip-.015,canopyDepth+.009,width+.10,cloth?.16:.10,.03);
    panel(cloth?0xd6ceba:0xa8aaa1,0,lip-.045,canopyDepth+.026,width+.10,.016);
    for(const side of [-1,1])box(0xe0ceb0,side*width*.28,2.375,.24,.38,.014,.055);
    if(timber||store.name==='Sombreroll')for(let j=0;j<3;j++)box(0x827464,0,2.37,.24+j*.15,width-.1,.014,.018);
    if(fixedSash){
      panel(0xe3d8c2,0,3.12,.245,width+.10,.026);
      for(const side of [-1,1])panel(0xd3bfa6,side*(width/2-.045),1.28,.252,.07,2.20);
    }
    if(store.name==='Bake Pause'){
      for(const side of [-1,1])box(0x92694d,side*(width/2-.072),1.4,.182,.13,2.78,.092);
    }
    if(form==='grille'){
      // Belluci's small dark tiles catch the light around the street opening.
      for(const side of [-1,1]){
        const x=side*(width*.5-.092);
        box(0x282e30,x,1.45,.22,.16,2.83,.16);
        for(let h=.20;h<2.65;h+=.19)panel(0x68706b,x,h,.305,.155,.009);
      }
    }
    const leafWidth=Math.min(layout.door,width*.43);
    const slack=Math.max(0,(width-leafWidth)/2-.54);
    const doorX=Math.sign(layout.bias)*Math.min(Math.abs(width*layout.bias),slack,.72);
    const dark=form==='grille'?0x333b3b:form==='timber'||store.name==='Your Cafe'?0x84684f:0x394647;
    box(dark,doorX,1.14,.155,leafWidth,2.24,.10);
    panel(0x526f79,doorX,1.23,.215,leafWidth-.13,1.89);
    panel(0x94acb2,doorX,1.99,.218,leafWidth-.15,.29);
    panel(0x3a505c,doorX,.49,.221,leafWidth-.15,.30);
    panel(0x303e45,doorX,1.77,.226,leafWidth-.13,.043);
    const paired=leafWidth>1.1;
    if(paired)panel(0xabb4ad,doorX,1.14,.231,.032,2.14);
    const handleX=doorX+(paired?.09:leafWidth*.29);
    if(form==='galleria'){
      box(0xc5c4af,doorX-.09,1.07,.247,.042,.36,.038);
      // Narrow folded menu easel sits beside the doorway, clear of its opening.
      const x=doorX-leafWidth/2-.40;
      for(const side of [-1,1]){
        const leg=new THREE.BoxGeometry(.027,.79,.035).rotateX(-.12);
        finish(leg.translate(x+side*.16,.41,.50),0xa48260);
      }
      finish(new THREE.BoxGeometry(.033,.72,.032).rotateX(.26).translate(x,.37,.36),0x977351);
      finish(new THREE.BoxGeometry(.38,.50,.040).rotateX(-.12).translate(x,.62,.48),0xb99468);
      finish(new THREE.PlaneGeometry(.33,.45).rotateX(-.12).translate(x,.62,.505),0xe1dac6);
      for(let line=0;line<4;line++)panel(0x837d6f,x,.73-line*.052,.50+line*.006,.23-line*.014,.010);
    }
    box(0xc5c4af,handleX,1.07,.247,.042,.36,.038);
    for(const side of [-1,1]){
      const outer=side*(width/2-.13),inner=doorX+side*(leafWidth/2+.06);
      const displayWidth=Math.abs(outer-inner),x=(outer+inner)/2,sill=layout.sill;
      if(displayWidth<=.15)continue;
      const top=2.29,h=top-sill,mid=(top+sill)/2;
      const image=paintShopWindow(pixels,atlasWidth,atlasHeight,store,index,side,profile.display);
      box(dark,x,mid,.15,displayWidth,h,.10);
      panel(0xffffff,x,mid,.212,displayWidth-.08,h-.12,image);
      box(form==='timber'?0x987758:0xb7b8aa,x,sill+.015,.232,displayWidth,.07,.08);
      const transom=form==='books'?1.97:1.80;
      panel(0x303e45,x,transom,.235,displayWidth-.07,.043);
      panel(0xc4d0c9,x,transom+.026,.236,displayWidth-.08,.009);
      const panes=Math.min(layout.piers,Math.max(1,Math.floor(displayWidth/.62)));
      for(let j=1;j<panes;j++)box(dark,Math.min(outer,inner)+j*displayWidth/panes,mid,.23,.045,h-.08,.028);
      if(form==='chamfer'){
        const pane=new THREE.PlaneGeometry(displayWidth*.24,h-.09).rotateY(side*.21);
        finish(pane.translate(inner+side*displayWidth*.16,mid,.31),0x7d9696);
      }
      if(form==='timber')for(let j=1;j<=3;j++)panel(0x846b54,x,j*sill/4,.135,displayWidth,.018);
    }
    box(0x45524d,handleX,1.38,.232,.145,.080,.018);
    function lettering(label,row,y,w,h,z,x=0,ink) {
      const inkFraction=writeText(label,row,ink);
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
    lettering(store.name,index*2,fasciaY,headerWidth-.19,layout.canopy==='band'?.37:.45,.245,signX,profile.signInk);
    lettering('PULL',index*2+1,1.38,.135,.072,.244,handleX);
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
