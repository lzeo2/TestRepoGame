import * as THREE from '../vendor/three.module.js';
import {COURT} from './court-config.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const SIGNALS={foul:'foul',basket:'basket',violation:'out',out:'out',outOfBounds:'out',period:'period',fullTime:'period'};

// Original generic official. All dimensions and apron movement are court-local feet.
export function createOfficiatingView() {
  const root=new THREE.Group();root.name='match-official';root.visible=false;
  const geometry=new THREE.BoxGeometry(1,1,1),headGeometry=new THREE.SphereGeometry(.5,10,8);
  const material=new THREE.MeshLambertMaterial({vertexColors:true});
  const owned=[];
  function assemble(parts,parent=root) {
    const positions=[],normals=[],colors=[];
    for(const [shape,size,pos,tint] of parts) {
      const source=(shape==='head'?headGeometry:geometry).toNonIndexed();
      source.scale(...size);source.translate(...pos);
      const p=source.attributes.position,n=source.attributes.normal,c=new THREE.Color(tint);
      positions.push(...p.array);normals.push(...n.array);
      for(let i=0;i<p.count;i++)colors.push(c.r,c.g,c.b);
      source.dispose();
    }
    const merged=new THREE.BufferGeometry();
    merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    owned.push(merged);const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  assemble([
    ['box',[1.55,1.65,.8],[0,3.95,0],0x96999a],
    ['box',[1.56,.25,.82],[0,3.18,0],0x202125],
    ['head',[.9,1.08,.85],[0,5.46,0],0xb68261],
    ['box',[.73,.17,.68],[0,5.93,-.03],0x28231f],
    ['box',[.22,.24,.1],[.2,4.55,.44],0x28292c],
    ['box',[.09,.9,.05],[0,4.1,.43],0x303235]
  ]);
  function limb(x,y,length,width) {
    const pivot=new THREE.Group();pivot.position.set(x,y,0);root.add(pivot);
    assemble([['box',[width,length,.56],[0,-length/2,0],0x292b2f],
      ['box',[width+.03,.23,.82],[0,-length+.12,.12],0x17191b]],pivot);return pivot;
  }
  const leftLeg=limb(-.43,3.15,3.15,.57),rightLeg=limb(.43,3.15,3.15,.57);
  function arm(x) {
    const pivot=new THREE.Group();pivot.position.set(x,4.6,0);root.add(pivot);
    assemble([['box',[.43,.65,.56],[0,-.32,0],0x96999a],
      ['box',[.34,1.25,.4],[0,-1.19,0],0xb68261]],pivot);return pivot;
  }
  const leftArm=arm(-1),rightArm=arm(1);
  geometry.dispose();headGeometry.dispose();
  const apron=3,edgeX=COURT.halfLength+apron,edgeZ=COURT.halfWidth+apron;
  const pathLength=2*edgeZ+2*edgeX;
  let path=edgeZ+edgeX,serial=-1,signal='idle',remaining=0,walk=0,disposed=false,active=false;
  function pathPosition(p) {
    if(p<edgeZ)return [-edgeX,-p];
    if(p<edgeZ+2*edgeX)return [-edgeX+p-edgeZ,-edgeZ];
    return [edgeX,-edgeZ+p-edgeZ-2*edgeX];
  }
  function update(dt,{match,time=0,lowGraphics=false}={}) {
    if(disposed)return;
    root.visible=!!match&&!match.finished;
    if(!root.visible){active=false;serial=-1;remaining=0;signal='idle';return;}
    const step=clamp(finite(dt),0,.1);
    if(active&&step===0)return;
    const ball=match.ball||{},bx=clamp(finite(ball.x),-COURT.halfLength,COURT.halfLength);
    const bz=clamp(finite(ball.z),-COURT.halfWidth,COURT.halfWidth);
    // Routing through the outside corners prevents interpolation across player space.
    const end=clamp((Math.abs(bx)-COURT.halfLength*.77)/(COURT.halfLength*.23),0,1);
    const target=end>0?(bx<0?edgeZ-(bz+edgeZ)*end:edgeZ+2*edgeX+(bz+edgeZ)*end):edgeZ+bx+edgeX;
    if(!active){path=clamp(target,0,pathLength);active=true;}
    const before=path;path+=clamp(target-path,-16*step,16*step);
    const [x,z]=pathPosition(path);root.position.set(x,0,z);
    root.rotation.y=Math.atan2(bx-x,bz-z);
    for(const event of match.events||[]) {
      if(Number.isFinite(event.serial)&&event.serial>serial){serial=event.serial;if(SIGNALS[event.kind]){signal=SIGNALS[event.kind];remaining=1.3;}}
    }
    if(step>0){remaining=Math.max(0,remaining-step);if(!remaining)signal='idle';walk+=Math.abs(path-before)*.9;}
    const stride=step>0&&Math.abs(path-before)>.001?Math.sin(walk)*.35:0;
    leftLeg.rotation.x=stride;rightLeg.rotation.x=-stride;
    leftArm.rotation.set(-stride*.7,0,0);rightArm.rotation.set(stride*.7,0,0);
    if(signal==='foul')rightArm.rotation.z=-2.8;
    if(signal==='basket'||signal==='period'){leftArm.rotation.z=2.9;rightArm.rotation.z=-2.9;}
    if(signal==='out')rightArm.rotation.z=-Math.PI/2;
    root.traverse(o=>{if(o.isMesh)o.castShadow=!lowGraphics;});
  }
  function diagnostics(){return {visible:root.visible,signal,serial,path,position:root.position.toArray(),height:6.015,draws:5};}
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();for(const g of owned)g.dispose();material.dispose();}
  return {root,update,diagnostics,dispose};
}
