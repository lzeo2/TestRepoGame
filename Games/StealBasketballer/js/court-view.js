import * as THREE from '../vendor/three.module.js';

// Only these non-colliding arena fragments are replaced. Plot courts stay intact.
export const replacedCourtVisual = part => part.venue === true && ['BasketRim','BasketNet','BasketNetHem'].includes(part.name);

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

export function createCourtDetails() {
  const root=new THREE.Group();root.name='Original arena details';
  const geometries=[],materials=[];
  const geometry=g=>(geometries.push(g),g);
  const material=(color)=>{const m=new THREE.MeshLambertMaterial({color});materials.push(m);return m;};
  const navy=material('#14263F'),cream=material('#F9EBCD'),coral=material('#E16B4F');
  const box=geometry(new THREE.BoxGeometry(1,1,1));
  const blocks=[];
  const block=(x,y,z,sx,sy,sz,color)=>blocks.push({x,y,z,sx,sy,sz,color});
  const rimGeometry=geometry(new THREE.TorusGeometry(2,.16,6,40));
  const netPoints=[];
  for(const side of [-1,1]) {
    const rim=new THREE.Mesh(rimGeometry,coral);rim.name=`Rim ${side}`;rim.rotation.x=Math.PI/2;rim.position.set(side*82,10.175,0);root.add(rim);
    // Cross-laced, tapering net, drawn together in one line-segment call.
    for(let i=0;i<16;i++)for(let row=0;row<4;row++)for(const direction of [-1,1]) {
      const angle=i/16*Math.PI*2+row*Math.PI/16*direction;
      const next=angle+direction*Math.PI/16,r=1.95-row*.22,r2=r-.22;
      netPoints.push(side*82+Math.cos(angle)*r,10.1-row*.58,Math.sin(angle)*r,side*82+Math.cos(next)*r2,10.1-(row+1)*.58,Math.sin(next)*r2);
    }
    block(side*94,2.6,0,2.5,5,3,navy);
    block(side*94,4.7,0,2.55,.5,3.05,coral);
    block(side*85,9.25,0,.65,.25,10.4,navy);
    block(side*85,15.15,0,.65,.25,10.4,navy);
    for(const z of [-5.1,5.1])block(side*85,12.2,z,.65,6,.25,navy);
    // Out-of-play apron accents and courtside scorer tables.
    block(side*98,.3,0,5,.2,126,navy);
    block(side*98,.42,0,1,.05,120,coral);
    block(side*32,2,-72,20,3,3,navy);
    block(side*32,3.6,-72,21,.3,3.6,cream);
    for(const z of [-69,69])block(side*48,.3,z,76,.2,4,navy);
  }
  for(const mat of [navy,cream,coral]) {
    const items=blocks.filter(b=>b.color===mat),mesh=new THREE.InstancedMesh(box,mat,items.length),dummy=new THREE.Object3D();
    items.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.sx,b.sy,b.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();root.add(mesh);
  }
  const netMaterial=new THREE.LineBasicMaterial({color:'#FFF5DA'});materials.push(netMaterial);
  const netGeometry=geometry(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(netPoints,3)));
  root.add(new THREE.LineSegments(netGeometry,netMaterial));
  return {root,geometries,materials};
}
