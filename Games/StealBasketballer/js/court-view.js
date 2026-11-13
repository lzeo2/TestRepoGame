import * as THREE from '../vendor/three.module.js';
import {COURT} from './court-config.js';

const retainedVenueParts=new Set(['ArenaGround','OriginalArenaGround','SpectatorWalk','PitchAccess','StadiumEntranceWalk','NorthWalk']);
export const replacedCourtVisual=part=>part.venue===true&&!retainedVenueParts.has(part.name);

// Original deterministic maple boards; one shared 512px texture, no image loads.
export function hardwoodTexture() {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  let seed=713;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let row=0;row<32;row++) {
    const warmth=Math.floor(random()*16);ctx.fillStyle=`rgb(${208+warmth},${166+warmth},${108+warmth})`;ctx.fillRect(0,row*16,512,16);
    ctx.fillStyle='rgba(73,44,23,.23)';ctx.fillRect(0,row*16,512,1);
    for(let x=(row%3)*57;x<512;x+=170){ctx.fillRect(x,row*16,1,16);}
    for(let grain=0;grain<9;grain++) {
      const y=row*16+2+random()*12;ctx.strokeStyle=`rgba(98,58,27,${.025+random()*.045})`;ctx.beginPath();ctx.moveTo(0,y);
      ctx.bezierCurveTo(150,y+random()*2,330,y-random()*2,512,y);ctx.stroke();
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

// Coordinates are feet from the venue anchor; the playable surface is Y .175.
export function createCourtDetails() {
  const root=new THREE.Group();root.name='Original regulation court';
  const geometries=[],materials=[],textures=[];
  const geometry=g=>(geometries.push(g),g);
  const material=(color,extra={})=>{const m=new THREE.MeshLambertMaterial({color,...extra});materials.push(m);return m;};
  const wood=hardwoodTexture();if(wood)textures.push(wood);
  const maple=material(wood?'#FFFFFF':'#D9AC70',{map:wood}),cream=material('#FFF1D3'),navy=material('#183149'),orange=material('#E96937');
  const box=geometry(new THREE.BoxGeometry(1,1,1));
  const floor=new THREE.Mesh(box,maple);floor.name='Hardwood floor';floor.scale.set(122,.35,68);root.add(floor);
  const paint=[];
  const strip=(x1,z1,x2,z2,width=.16)=>{
    const length=Math.hypot(x2-x1,z2-z1);if(length===0)return;
    const dx=-(z2-z1)/length*width/2,dz=(x2-x1)/length*width/2,y=.183;
    // Clockwise in XZ gives the visible, upward normal.
    paint.push(x1+dx,y,z1+dz,x2-dx,y,z2-dz,x1-dx,y,z1-dz,
      x1+dx,y,z1+dz,x2+dx,y,z2+dz,x2-dx,y,z2-dz);
  };
  const arc=(cx,cz,r,start=0,end=Math.PI*2)=>{const steps=Math.ceil((end-start)*20);for(let i=0;i<steps;i++){
    const a=start+(end-start)*i/steps,b=start+(end-start)*(i+1)/steps;
    strip(cx+Math.cos(a)*r,cz+Math.sin(a)*r,cx+Math.cos(b)*r,cz+Math.sin(b)*r);
  }};
  for(const z of [-COURT.halfWidth,COURT.halfWidth])strip(-47,z,47,z);
  for(const x of [-COURT.halfLength,COURT.halfLength])strip(x,-25,x,25);
  strip(0,-25,0,25);arc(0,0,COURT.centerCircleRadius);
  const blocks=[];const block=(x,y,z,sx,sy,sz,mat)=>blocks.push({x,y,z,sx,sy,sz,mat});
  const net=[];
  for(const side of [-1,1]) {
    const rimX=side*COURT.rimX,freeX=side*COURT.freeThrowX;
    block(side*(COURT.halfLength+COURT.freeThrowX)/2,.178,0,COURT.halfLength-COURT.freeThrowX,.004,16,navy);
    for(const z of [-8,8])strip(side*47,z,freeX,z);
    strip(freeX,-8,freeX,8);arc(freeX,0,6);
    const angle=Math.asin(22/COURT.arc),join=COURT.rimX-Math.sqrt(COURT.arc**2-22**2);
    if(side===1)arc(rimX,0,COURT.arc,Math.PI-angle,Math.PI+angle);
    else arc(rimX,0,COURT.arc,-angle,angle);
    for(const z of [-22,22])strip(side*join,z,side*47,z);
    if(side===1)arc(rimX,0,4,Math.PI/2,Math.PI*1.5);
    else arc(rimX,0,4,-Math.PI/2,Math.PI/2);
    block(side*52,4.1,0,1,8,1.6,navy);
    block(side*48.5,9.55,0,7,.5,.5,navy);
    block(side*43,10.675,0,.15,3.5,6,cream);
    // Backboard target rectangle faces the court and remains separate from the rim.
    block(side*42.9,10.55,-1,.04,1.5,.08,orange);block(side*42.9,10.55,1,.04,1.5,.08,orange);
    for(const y of [9.8,11.3])block(side*42.9,y,0,.04,.08,2,orange);
    for(let i=0;i<12;i++)for(let row=0;row<4;row++)for(const direction of [-1,1]) {
      const a=i/12*Math.PI*2+row*Math.PI/12*direction,b=a+direction*Math.PI/12;
      const r=.73-row*.065,r2=r-.065;
      net.push(rimX+Math.cos(a)*r,10.1-row*.38,Math.sin(a)*r,rimX+Math.cos(b)*r2,10.1-(row+1)*.38,Math.sin(b)*r2);
    }
  }
  const paintGeometry=geometry(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(paint,3)));paintGeometry.computeVertexNormals();
  const lines=new THREE.Mesh(paintGeometry,cream);lines.name='Regulation court markings';root.add(lines);
  const dummy=new THREE.Object3D();
  for(const mat of [navy,cream,orange]) {
    const items=blocks.filter(b=>b.mat===mat),mesh=new THREE.InstancedMesh(box,mat,items.length);
    items.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,0,0);dummy.scale.set(b.sx,b.sy,b.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();root.add(mesh);
  }
  const rimGeometry=geometry(new THREE.TorusGeometry(COURT.rimRadius,.045,8,48));
  const rims=new THREE.InstancedMesh(rimGeometry,orange,2);rims.name='Regulation rims';
  [-1,1].forEach((side,i)=>{dummy.position.set(side*COURT.rimX,COURT.rimY+.175,0);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();rims.setMatrixAt(i,dummy.matrix);});rims.computeBoundingSphere();root.add(rims);
  const netMaterial=new THREE.LineBasicMaterial({color:'#FFF1D3'});materials.push(netMaterial);
  const netGeometry=geometry(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(net,3)));
  const nets=new THREE.LineSegments(netGeometry,netMaterial);nets.name='Laced nets';root.add(nets);
  let disposed=false;
  return {root,geometries,materials,textures,dispose(){if(disposed)return;disposed=true;root.traverse(node=>{if(node.isInstancedMesh)node.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}};
}
