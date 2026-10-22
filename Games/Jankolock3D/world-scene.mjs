import * as THREE from './vendor/three.module.js';
import { LANES, TEAM_COLORS, terrainHeight } from './world-data.mjs';
import { createEnvironment } from './environment.mjs';
export function createWorldScene(canvas,world) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0xb6c9d0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xb6c9d0,180,950);
  const camera=new THREE.PerspectiveCamera(70,1,.1,1400);camera.rotation.order='YXZ';
  const materials=new Map(),textures=[],crateMeshes=new Map(),structureMeshes=new Map();
  const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8),sphere=new THREE.IcosahedronGeometry(1,1);
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);};
  function mesh(geometry,color,x,y,z,sx,sy,sz,parent=scene) {const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const box=(c,x,y,z,w,h,d,parent)=>mesh(cube,c,x,y,z,w,h,d,parent);
  const rod=(c,x,y,z,r,h,parent)=>mesh(cylinder,c,x,y,z,r,h,r,parent);
  function label(text,x,y,z,color='#17191b',width=20) {
    const c=document.createElement('canvas');c.width=512;c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#f4f0e5';ctx.fillRect(0,0,512,96);ctx.fillStyle=color;ctx.font='34px Atkinson, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,490);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);
    const m=new THREE.SpriteMaterial({map:t});const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(width,width*96/512,1);scene.add(s);return s;
  }
  scene.add(new THREE.HemisphereLight(0xe1e8ed,0x77715f,1.55));
  const sun=new THREE.DirectionalLight(0xffe6bc,2.1);sun.position.set(-150,300,-100);scene.add(sun);
  const sky=new THREE.Mesh(new THREE.BoxGeometry(2200,2200,2200),new THREE.MeshBasicMaterial({color:0xb6c9d0,side:THREE.BackSide,fog:false}));scene.add(sky);
  const sunDisk=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:0xf6e6bd,fog:false}));sunDisk.position.set(450,370,450);sunDisk.scale.setScalar(45);scene.add(sunDisk);
  for(const [x,z,w] of [[-150,220,80],[180,430,120],[-380,-180,100]]) mesh(sphere,0xdce2dc,x,100,z,w,8,25);
  // Upper ground has real openings for the sewer and sunken plaza.
  const xs=[-450,-65,40,65,90,170,205,450],zs=[-450,-28,-9,9,28,60,75,100,140,450];
  for(let i=0;i<xs.length-1;i++) for(let j=0;j<zs.length-1;j++) {
    const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
    let y=terrainHeight(x,z);
    if(x>=40&&x<=90&&Math.abs(z)<=9)y=-10;
    if(x>=170&&x<=205&&z>=75&&z<=100)y=-6;
    box(y<0?0x797a6d:0x999b88,x,y-.5,z,xs[i+1]-xs[i],1,zs[j+1]-zs[j]);
  }
  for(const lane of LANES) {
    for(const [z,length] of lane.id==='midway'?[[-252,396],[252,396]]:[[0,900]]) {
      box(0x626669,lane.x,.025,z,42,.05,length);
      box(lane.color,lane.x,.065,z,1.3,.04,length);
      box(0xc5bcaa,lane.x-24,.13,z,6,.26,length);box(0xc5bcaa,lane.x+24,.13,z,6,.26,length);
    }
    for(let z=-420;z<=420;z+=45) if(!(lane.id==='midway'&&Math.abs(z)<55)) {
      box(0xf0dfb4,lane.x-8,.08,z,.35,.03,12);box(0xf0dfb4,lane.x+8,.08,z,.35,.03,12);
    }
    label(lane.name,lane.x,12,-350,'#17191b',25);
  }
  for(const z of [-280,-140,140,280]) box(0x737676,0,.02,z,900,.04,18);
  const environment=createEnvironment(scene,world);
  for(const b of world.boxes.filter(b=>!['building','crate','tower'].includes(b.kind))) {
    box(b.kind==='bridge'?0x666e71:b.kind==='cover'?0x756e59:0xaaa28c,(b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2,b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ);
  }
  for(const r of world.ramps) {
    const x=(r.minX+r.maxX)/2,z=(r.minZ+r.maxZ)/2,dx=r.maxX-r.minX,dz=r.maxZ-r.minZ,dy=r.end-r.start;
    const m=box(r.id.includes('roof')?0x887e6a:0xaaa28c,x,(r.start+r.end)/2-.1,z,r.axis==='x'?Math.hypot(dx,dy):dx,.2,r.axis==='z'?Math.hypot(dz,dy):dz);
    if(r.axis==='z')m.rotation.x=-Math.atan2(dy,dz);else m.rotation.z=Math.atan2(dy,dx);
  }
  for(const s of world.spawns) {
    const {x,y,z}=s.position,c=TEAM_COLORS[s.team],g=new THREE.Group();g.name=s.id;g.position.set(x,y,z);scene.add(g);structureMeshes.set(s.id,g);
    if(s.type==='guardian'||s.type==='base-guardian') {
      rod(0x575752,0,1,0,3,2,g);box(c,0,5,0,4,7,4,g);box(0x303535,0,9,0,6,2,5,g);
      box(0xf5dda1,0,9,-2.6,3,.6,.2,g);rod(0x535652,0,12,0,.4,4,g);
    } else if(s.type==='walker') {
      for(const dx of [-3,3])for(const dz of [-3,3])box(0x4d5555,dx,3,dz,1.6,6,1.6,g);
      box(c,0,7,0,9,4,9,g);box(0x303535,0,10,0,6,2,4,g);box(0xe6d7a1,0,10,-2.1,4,.8,.2,g);
    } else if(s.type==='shrine') {
      rod(c,0,1,0,3,2,g);rod(0xd6c8a6,0,4,0,1.5,4,g);mesh(sphere,0xe5b647,0,7,0,2,2,2,g);
    } else {
      rod(c,0,2,0,7,4,g);box(0x414e50,-5,10,0,3,16,4,g);box(0x414e50,5,10,0,3,16,4,g);box(c,0,18,0,13,3,4,g);
      mesh(sphere,0xe4ba51,0,11,0,4,5,4,g);
    }
    if(s.type==='guardian'||s.type==='walker'||s.type==='patron')g.attach(label(s.type.replaceAll('-',' '),x,y+(s.type==='patron'?23:16),z,'#17191b',16));
  }
  for(const line of world.stations) {
    const lane=LANES.find(l=>l.id===line.lane);
    for(const p of [line.a,line.b]) {
      for(const dx of [-4,4])box(lane.color,p.x+dx,5,p.z,1,10,1);
      box(0x303535,p.x,10,p.z,9,1,1);rod(lane.color,p.x,1,p.z,2,2);
    }
    const points=[];for(let i=0;i<=64;i++) {const t=i/64;points.push(new THREE.Vector3(line.a.x,8+4*Math.sin(Math.PI*t),line.a.z+(line.b.z-line.a.z)*t));}
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x262d31})));
  }
  for(const p of world.portals) {
    rod(0x655b7a,p.x,.3,p.z,4,.6);box(0xd7ccb2,p.x-3,4,p.z,1,8,1);box(0xd7ccb2,p.x+3,4,p.z,1,8,1);box(0x655b7a,p.x,8,p.z,7,1,1);label('Stamp transfer',p.x,11,p.z,'#17191b',18);
  }
  for(const v of world.vents) {box(0x3a5059,v.x,.3,v.z,5,.6,5);for(let i=-2;i<=2;i++)box(0xbbd5d8,v.x+i,1,v.z,.25,.4,4);label('Roof vent',v.x,4,v.z,'#17191b',11);}
  // Staple Tower is an original giant desktop staple with an external rope.
  for(const b of world.boxes.filter(b=>b.kind==='tower')) box(0x6f797b,(b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2,b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ);
  rod(0xb69d70,world.rope.x,15,0,.14,30);label('Staple Tower',-95,36,0,'#17191b',32);
  for(const c of world.camps) {rod(0x89995f,c.x,.04,c.z,17,.08);label('Neutral supplies',c.x,7,c.z,'#17191b',22);}
  for(const c of world.crates) {
    const g=new THREE.Group();g.position.set(c.x,c.y,c.z);scene.add(g);crateMeshes.set(c.id,g);
    box(c.kind==='soul'?0xe3bd4d:0xa47c4d,0,1.5,0,3,3,3,g);box(0x49463d,0,1.5,-1.55,3,.3,.1,g);box(0x49463d,0,1.5,1.55,3,.3,.1,g);
  }
  const boss=world.midBoss;rod(0x484b50,boss.x,boss.y+2,boss.z,8,4);box(0xa0784f,boss.x,boss.y+6,boss.z,10,5,8);box(0xe4bc51,boss.x,boss.y+9,boss.z,12,1,10);label('Sewer / Mid-Boss',boss.x,boss.y+13,boss.z,'#17191b',23);
  for(let x=98;x<170;x+=18)for(let z=68;z<140;z+=18)box(0x9b9f91,x,-3,z,13,.3,13);
  label('Sunken Plaza / drain',130,3,110,'#17191b',28);
  // Static primitives share a few instance buffers. Crates stay separate so
  // collecting/breaking them can hide their geometry without rebuilding city data.
  scene.updateMatrixWorld(true);
  const batches=new Map(),dynamic=new Set([...crateMeshes.values(),...structureMeshes.values()].flatMap(g=>g.children));
  scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||dynamic.has(o)||o.material.type!=='MeshLambertMaterial')return;
    const key=o.geometry.uuid+o.material.uuid;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
  });
  for(const objects of batches.values()) {
    const first=objects[0],instances=new THREE.InstancedMesh(first.geometry,first.material,objects.length);
    objects.forEach((o,i)=>{instances.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});scene.add(instances);
  }
  let disposed=false;
  function resize() {const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  resize();
  return {
    scene,camera,
    renderCamera(view=camera) {if(!disposed){environment.update(view);renderer.render(scene,view);}},
    syncStructures(structures) {
      const live=new Map(structures.map(s=>[s.id,s]));
      for(const [id,group] of structureMeshes) {
        const s=live.get(id);group.visible=!!s?.alive;
        if(s) {group.position.set(s.position.x,s.position.y,s.position.z);group.scale.y=s.type==='patron'&&s.patronPhase===2?.7:1;}
      }
    },
    render(p,yaw,pitch) {if(disposed)return;camera.position.set(p.x,p.y+1.6,p.z);camera.rotation.set(pitch,yaw,0);environment.update(camera);renderer.render(scene,camera);},
    resize,
    sync(s) {for(const [id,m] of crateMeshes)m.visible=!s.collected.has(id)&&!s.broken.has(id);},
    diagnostics:()=>Object.freeze({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,environment:environment.diagnostics()}),
    dispose() {if(disposed)return;disposed=true;environment.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();scene.clear();}
  };
}
