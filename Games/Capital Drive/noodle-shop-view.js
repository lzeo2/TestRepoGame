import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { MAPPED_STORES } from './stores.js';

export const NOODLE_SHOP_ID='store-5656111023';
const RANGE=200;
// Original block alphabet; neither a supplied logo nor a bundled font/image.
const GLYPHS={
 A:'01110 10001 10001 11111 10001 10001 10001',B:'11110 10001 10001 11110 10001 10001 11110',C:'01111 10000 10000 10000 10000 10000 01111',D:'11110 10001 10001 10001 10001 10001 11110',E:'11111 10000 10000 11110 10000 10000 11111',F:'11111 10000 10000 11110 10000 10000 10000',G:'01111 10000 10000 10111 10001 10001 01111',H:'10001 10001 10001 11111 10001 10001 10001',I:'11111 00100 00100 00100 00100 00100 11111',J:'00111 00010 00010 00010 10010 10010 01100',K:'10001 10010 10100 11000 10100 10010 10001',L:'10000 10000 10000 10000 10000 10000 11111',M:'10001 11011 10101 10101 10001 10001 10001',N:'10001 11001 10101 10011 10001 10001 10001',O:'01110 10001 10001 10001 10001 10001 01110',P:'11110 10001 10001 11110 10000 10000 10000',Q:'01110 10001 10001 10001 10101 10010 01101',R:'11110 10001 10001 11110 10100 10010 10001',S:'01111 10000 10000 01110 00001 00001 11110',T:'11111 00100 00100 00100 00100 00100 00100',U:'10001 10001 10001 10001 10001 10001 01110',V:'10001 10001 10001 10001 10001 01010 00100',W:'10001 10001 10001 10101 10101 10101 01010',X:'10001 10001 01010 00100 01010 10001 10001',Y:'10001 10001 01010 00100 00100 00100 00100',Z:'11111 00001 00010 00100 01000 10000 11111','1':'00100 01100 00100 00100 00100 00100 01110','9':'01110 10001 10001 01111 00001 00001 01110',' ':'00000 00000 00000 00000 00000 00000 00000',
};
const LABELS=['LAMBZHOU 1919','HAND PULLED NOODLES','BEEF NOODLES','HOUSE SPECIALS','TILL'];

export function createNoodleShopView(scene,heightAt) {
  const store=MAPPED_STORES.find(s=>s.id===NOODLE_SHOP_ID);
  const root=new THREE.Group();root.name='Original Lambzhou 1919 frontage';scene.add(root);
  const geometry=[],materials=[],textures=[],solids=[],glowing=[],lettering=[],obstacles=[];
  let visible=false,disposed=false;
  if(!store)return {update(){},get stats(){return Object.freeze({sites:0,visible:false,drawCalls:0,triangles:0,geometryCount:0,materialCount:0,textureCount:0,cullDistance:RANGE,disposed});},obstacles:Object.freeze([]),dispose(){if(disposed)return;disposed=true;scene.remove(root);}};
  const f=store.frontage,ground=heightAt(f.x,f.z);
  if(!Number.isFinite(ground))throw new Error('Noodle frontage requires finite terrain');
  const width=Math.min(6.6,f.width-.16),angle=f.yaw+Math.PI,tx=Math.cos(angle),tz=-Math.sin(angle),nx=Math.sin(angle),nz=Math.cos(angle);
  const point=(x,y,out)=>new THREE.Vector3(f.x+tx*x+nx*out,ground+y,f.z+tz*x+nz*out);
  function finish(g,tint,batch=solids) {
    const rgb=new THREE.Color(tint),colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3)rgb.toArray(colors,i);
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));batch.push(g);
  }
  function box(tint,x,y,out,w,h,d,batch=solids) {
    finish(new THREE.BoxGeometry(w,h,d).translate(x,y,out).rotateY(angle).translate(f.x,ground,f.z),tint,batch);
  }
  function cylinder(tint,x,y,out,radius,height,sides=12) {
    finish(new THREE.CylinderGeometry(radius,radius,height,sides,1).translate(x,y,out).rotateY(angle).translate(f.x,ground,f.z),tint);
  }
  function obstacle(x,out,w,d) {
    const points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(p=>{const q=point(x+p[0],0,out+p[1]);return Object.freeze([q.x,q.z]);});
    obstacles.push(Object.freeze({id:`noodle-furniture-${obstacles.length}`,kind:'cafe-furniture',height:.8,points:Object.freeze(points)}));
  }
  // Canberra EG11C photo: charcoal surround, oxblood fascia, cream transom,
  // black glazing frames and a flush soffit. Door alignment remains source-derived.
  box(0x303236,0,1.46,.075,width,2.92,.10);
  box(0x551d25,0,3.13,.16,width,.48,.22);
  box(0x292b2e,0,2.87,.17,width,.09,.24);
  box(0xd3bb85,0,3.47,.15,width-.16,.20,.18);
  box(0x27292b,0,3.61,.15,width+.05,.06,.18);
  for(const side of [-1,1]) {
    const x=side*(width/2-.14);
    box(0x34373a,x,1.48,.18,.24,2.96,.22);
    for(let k=0;k<10;k++)box(0x262a2d,x, .17+k*.28,.301,.24,.012,.015);
  }
  // Full-height black-framed glazing reveals warm timber; the left bay contains
  // the pale preparation counter seen in the Canberra chef display window.
  const bayWidth=(width-1.65)/2;
  for(const side of [-1,1]) {
    const x=side*(.78+bayWidth/2);
    box(0x25292c,x,1.48,.19,bayWidth,2.60,.16);
    box(0xa58c61,x,1.49,.282,bayWidth-.12,2.45,.025);
    box(0xb9ac83,x,1.69,.30,bayWidth-.2,1.94,.018,glowing);
    box(0xe2c17b,x,2.58,.324,bayWidth-.16,.045,.035,glowing);
    box(side<0?0x9baba7:0xca743e,x,.69,.34,bayWidth-.20,.68,.06);
    box(side<0?0xc5cdca:0x9c784f,x,1.05,.34,bayWidth-.18,.065,.08);
    for(let k=0;k<7;k++)box(0xad915f,x-bayWidth/2+.18+k*(bayWidth-.36)/6,2.12,.329,.030,.83,.025);
    box(0x243a4a,x,.49,.37,.43,.11,.08);
    box(0x292d2f,x,1.46,.40,.045,2.55,.045);
    box(0xc3d0c5,x,1.73,.411,bayWidth-.18,.025,.012,glowing);
  }
  // Central glass double door stays visually clear; E performs the separate room transition.
  box(0x283639,0,1.39,.26,1.34,2.78,.16);
  for(const side of [-1,1]) {
    box(0x77918b,side*.305,1.40,.351,.57,2.55,.025);
    box(0xdac28c,side*.075,1.27,.385,.032,.39,.04);
  }
  box(0xa98b60,0,.07,.48,1.42,.14,.44);
  box(0xe0c98e,0,2.69,.38,1.24,.04,.08,glowing);
  // Framed menu boards use original words and simple bowl motifs, without copied imagery.
  for(const side of [-1,1]) {
    const x=side*(width/2-.55);
    box(0x3c342a,x,1.65,.42,.58,.90,.10);
    box(0x584733,x,1.65,.477,.49,.79,.018);
    box(0x94352c,x,1.50,.49,.32,.07,.012);
    box(0x38585e,x,1.44,.49,.23,.035,.012);
    box(0xead7a8,x,2.18,.31,.34,.06,.07,glowing);
  }
  box(0x303c35,.43,.66,.40,.31,.22,.035);
  // Keep a 1.8m-wide central entrance corridor and the public approach beyond the apron clear.
  box(0xb4a28a,0,-.025,.93,width,.05,1.8);
  for(let i=0;i<9;i++)box(0x9e8e78,(i-4)*width/9,.003,.93,.013,.009,1.78);
  for(const side of [-1,1]) {
    const x=side*(width/2-.70),out=1.08;
    cylinder(0xb99360,x,.77,out,.33,.075);
    cylinder(0x343c39,x,.39,out,.035,.72,8);
    cylinder(0x343c39,x,.045,out,.20,.04,10);
    obstacle(x,out,.70,.70);
    box(0x365569,x,.44,1.65,.43,.08,.42);
    box(0xae8b57,x,.68,1.84,.45,.38,.045);
    for(const dx of [-.16,.16])box(0x3b4140,x+dx,.23,1.65,.035,.38,.32);
    obstacle(x,1.65,.48,.44);
    cylinder(0xe9dfbd,x,.83,out,.115,.025,12);
    cylinder(0x9b6e3e,x,.85,out,.085,.012,12);
  }
  const atlasWidth=512,atlasHeight=256,rowHeight=32,pixels=new Uint8Array(atlasWidth*atlasHeight*4);
  LABELS.forEach((label,row)=>{
    const scale=row===0?4:3,left=Math.floor((atlasWidth-(label.length*6-1)*scale)/2),top=row*rowHeight+2;
    for(let c=0;c<label.length;c++)for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(GLYPHS[label[c]].split(' ')[y][x]==='1')
      for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
        const i=((atlasHeight-1-top-y*scale-dy)*atlasWidth+left+c*6*scale+x*scale+dx)*4;
        pixels[i]=251;pixels[i+1]=246;pixels[i+2]=224;pixels[i+3]=255;
      }
  });
  function text(row,x,y,out,w,h) {
    const g=new THREE.PlaneGeometry(w,h).translate(x,y,out).rotateY(angle).translate(f.x,ground,f.z),uv=g.attributes.uv;
    const fraction=((LABELS[row].length*6-1)*(row===0?4:3)+8)/atlasWidth;
    for(let i=0;i<uv.count;i++) {
      uv.setX(i,.5+(uv.getX(i)-.5)*fraction);
      uv.setY(i,1-(row*rowHeight+(1-uv.getY(i))*rowHeight)/atlasHeight);
    }
    lettering.push(g);
  }
  text(0,0,3.13,.279,width-.26,.40);
  text(1,0,2.87,.299,width-.45,.075);
  text(2,-width/2+.55,1.85,.491,.45,.19);
  text(3,width/2-.55,1.85,.491,.45,.19);
  text(4,.43,.66,.421,.26,.17);
  const atlas=new THREE.DataTexture(pixels,atlasWidth,atlasHeight,THREE.RGBAFormat);atlas.colorSpace=THREE.SRGBColorSpace;atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.LinearFilter;atlas.generateMipmaps=false;atlas.needsUpdate=true;textures.push(atlas);
  const meshes=[];
  for(const [batch,material,name] of [
    [solids,new THREE.MeshLambertMaterial({vertexColors:true}),'Noodle timber, fascia and cafe furniture'],
    [glowing,new THREE.MeshBasicMaterial({vertexColors:true}),'Noodle warm display surfaces'],
    [lettering,new THREE.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:false}),'Noodle original fascia and menu lettering'],
  ]) {
    const g=mergeGeometries(batch,false);batch.forEach(piece=>piece.dispose());g.computeBoundingSphere();geometry.push(g);materials.push(material);
    const mesh=new THREE.Mesh(g,material);mesh.name=name;root.add(mesh);meshes.push(mesh);
  }
  const triangles=geometry.reduce((sum,g)=>sum+g.index.count/3,0);
  function update(focus) {
    if(disposed)return;
    visible=!!focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)&&Math.hypot(focus.x-f.x,focus.z-f.z)<RANGE;
    root.visible=visible;
  }
  update(null);
  return {update,obstacles:Object.freeze(obstacles),get stats(){return Object.freeze({sites:1,storeId:store.id,visible,drawCalls:visible?3:0,triangles,geometryCount:3,materialCount:3,textureCount:1,atlasWidth,atlasHeight,cullDistance:RANGE,entranceClearWidth:1.8,disposed});},dispose(){if(disposed)return;disposed=true;visible=false;scene.remove(root);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
