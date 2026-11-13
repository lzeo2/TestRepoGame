import * as THREE from '../vendor/three.module.js';
import {COURT} from './court-config.js';
import {createCourtDetails} from './court-view.js';

const boundedLevel=value=>Math.max(0,Math.min(3,Math.floor(Number(value)||0)));
const boxAt=(x,y,z,sx,sy,sz)=>new THREE.Box3(new THREE.Vector3(x-sx/2,y-sy/2,z-sz/2),new THREE.Vector3(x+sx/2,y+sy/2,z+sz/2));

// Original, instanced tier additions. No saved state or economy is mutated here.
export function createStadiumView({level=0,lowGraphics=false}={}) {
  const root=new THREE.Group();root.name='Upgradeable basketball venue';
  const court=createCourtDetails();root.add(court.root);
  const box=new THREE.BoxGeometry(1,1,1);
  const dark=new THREE.MeshLambertMaterial({color:'#20364A'});
  const seat=new THREE.MeshLambertMaterial({color:'#D86745'});
  const glow=new THREE.MeshBasicMaterial({color:'#FFF0C6'});
  const tiers=[],tierColliders=[[],[],[]],colliders=[];
  const dummy=new THREE.Object3D();
  const geometryByTier=[[],[],[]];
  const add=(tier,style,x,y,z,sx,sy,sz,solid=false)=>{
    geometryByTier[tier-1].push({style,x,y,z,sx,sy,sz});
    if(solid)tierColliders[tier-1].push(boxAt(x,y,z,sx,sy,sz));
  };
  // The baseline apron is open: entry is outside play and never under a stand.
  for(const z of [-38,38]) {
    for(let row=0;row<3;row++) {
      add(1,0,0,.8+row*.8,z+Math.sign(z)*row*2,70,.8,2,true);
      add(1,1,0,1.3+row*.8,z+Math.sign(z)*row*2,68,.18,1.3);
    }
    for(const x of [-24,24]) {add(1,0,x,1.1,Math.sign(z)*30,17,.25,1.8);for(const dx of [-7,7])add(1,0,x+dx,.55,Math.sign(z)*30,.3,1.1,1.4);}
    for(let row=0;row<5;row++) {
      add(2,0,0,3.2+row*.95,Math.sign(z)*(44+row*2.2),88,.95,2.2,true);
      for(const x of [-28,0,28])add(2,1,x,3.8+row*.95,Math.sign(z)*(44+row*2.2),25,.22,1.4);
    }
    // Short canopies only cover seats, keeping the overhead view of play open.
    add(3,0,0,15,Math.sign(z)*49,94,.45,15);
    for(const x of [-42,42])add(3,0,x,7.5,Math.sign(z)*54,.7,15,.7,true);
    for(const x of [-45,45]) {add(3,0,x,10,Math.sign(z)*34,.55,20,.55,true);add(3,1,x,20,Math.sign(z)*34,4,.5,2);}
  }
  add(2,0,0,14,-55,18,8,.7);
  for(const x of [-7,7])add(2,0,x,6,-55,.6,12,.6,true);
  // Entrance portal sits beyond the supported west apron without blocking it.
  for(const z of [12,24])add(3,0,-59,5,z,.6,10,.6,true);
  add(3,1,-59,10.2,18,.8,1.5,13);
  for(let i=0;i<3;i++) {
    const group=new THREE.Group();group.name=`Venue tier ${i+1}`;
    for(const style of [0,1]) {
      const items=geometryByTier[i].filter(b=>b.style===style),mesh=new THREE.InstancedMesh(box,style?seat:dark,items.length);
      items.forEach((b,index)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.sx,b.sy,b.sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});mesh.computeBoundingSphere();group.add(mesh);
    }
    root.add(group);tiers.push(group);
  }
  const digitSegments=[[0,1.2,1.1,.15],[.6,.6,.15,1],[.6,-.6,.15,1],[0,-1.2,1.1,.15],[-.6,-.6,.15,1],[-.6,.6,.15,1],[0,0,1.1,.15]];
  const digitMasks=[63,6,91,79,102,109,125,7,127,111];
  const digits=new THREE.InstancedMesh(box,glow,28);digits.name='Live score digits';root.add(digits);
  let currentLevel=0,disposed=false,scoreKey='',graphicsLow=Boolean(lowGraphics);
  const floorBox=boxAt(0,0,0,122,.35,68);
  function setLevel(value) {
    if(disposed)return;
    currentLevel=boundedLevel(value);tiers.forEach((group,i)=>{group.visible=currentLevel>i;});digits.visible=currentLevel>=2;
    colliders.length=0;colliders.push(floorBox.clone());
    tierColliders.forEach((boxes,i)=>{if(currentLevel>i)boxes.forEach(b=>colliders.push(b.clone()));});
  }
  function update({match,lowGraphics:low=graphicsLow}={}) {
    if(disposed)return;
    graphicsLow=Boolean(low);court.root.getObjectByName('Laced nets').visible=!graphicsLow;
    const score=match?.score||[0,0];
    const values=[Number(score[0])||0,Number(score[1])||0].map(n=>Math.min(99,Math.max(0,Math.floor(n))));
    const key=values.join(':');if(key===scoreKey)return;scoreKey=key;
    const numbers=[Math.floor(values[0]/10),values[0]%10,Math.floor(values[1]/10),values[1]%10];
    numbers.forEach((n,d)=>digitSegments.forEach(([x,y,sx,sy],s)=>{
      dummy.position.set((d-1.5)*2.3+x,14+y,-54.6);const on=Boolean(digitMasks[n]&(1<<s));
      dummy.scale.set(on?sx:0,on?sy:0,.08);dummy.updateMatrix();digits.setMatrixAt(d*7+s,dummy.matrix);
    }));digits.instanceMatrix.needsUpdate=true;digits.computeBoundingSphere();
  }
  function snapshot() {
    let drawCalls=0,triangles=0;
    root.traverseVisible(node=>{if(!node.isMesh&&!node.isLineSegments)return;drawCalls++;
      if(node.isMesh)triangles+=(node.geometry.index?node.geometry.index.count:node.geometry.attributes.position.count)/3*(node.isInstancedMesh?node.count:1);
    });
    return {level:currentLevel,lowGraphics:graphicsLow,disposed,drawCalls,triangles,score:scoreKey,
      court:{length:COURT.length,width:COURT.width,rims:[[-COURT.rimX,10.175,0],[COURT.rimX,10.175,0]],floorTop:.175},
      entryOffset:[-57,.175,18],colliders:colliders.map(b=>({min:b.min.toArray(),max:b.max.toArray()}))};
  }
  setLevel(level);update();
  return {root,colliders,entryOffset:new THREE.Vector3(-57,.175,18),setLevel,update,snapshot,
    dispose(){if(disposed)return;disposed=true;tiers.forEach(group=>group.children.forEach(mesh=>mesh.dispose()));digits.dispose();court.dispose();box.dispose();dark.dispose();seat.dispose();glow.dispose();root.clear();colliders.length=0;}};
}
