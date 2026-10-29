import * as THREE from './vendor/three.module.js';
import { LANES, TEAM_COLORS, terrainHeight } from './world-data.mjs';
import { createEnvironment } from './environment.mjs';
import { createObjectiveGuide } from './objective-guide.mjs';
import { mergeGeometries } from './vendor/addons/BufferGeometryUtils.js';
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
  // Tiny original aggregate maps, generated once. World-scaled UVs avoid stretched
  // road texture; each surface material is merged into one static draw.
  const surfaces=new Map();
  function surface(color,seed,grain) {
    const data=new Uint8Array(128*128*4);
    for(let i=0;i<data.length;i+=4) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const value=225+(seed>>>24)%31;
      data[i]=data[i+1]=data[i+2]=value-((seed&31)===0?grain:0);data[i+3]=255;
    }
    const map=new THREE.DataTexture(data,128,128);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;
    map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;textures.push(map);
    const m=new THREE.MeshStandardMaterial({color,map,roughness:1});materials.set(m.uuid,m);surfaces.set(m,[]);return m;
  }
  const asphalt=surface(0x565956,17,65),concrete=surface(0xb6b1a5,91,30),earth=surface(0x858477,42,45);
  function surfaceBox(m,x,y,z,w,h,d) {
    const g=new THREE.BoxGeometry(w,h,d),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++) {
      const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
      uv.setXY(i,(nx>.5?p.getZ(i)+z:p.getX(i)+x)/4,(ny>.5?p.getZ(i)+z:p.getY(i)+y)/4);
    }
    g.translate(x,y,z);surfaces.get(m).push(g);
  }
  function mesh(geometry,color,x,y,z,sx,sy,sz,parent=scene) {const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const box=(c,x,y,z,w,h,d,parent)=>mesh(cube,c,x,y,z,w,h,d,parent);
  const rod=(c,x,y,z,r,h,parent)=>mesh(cylinder,c,x,y,z,r,h,r,parent);
  function label(text,x,y,z,color='#17191b',width=20) {
    const c=document.createElement('canvas');c.width=512;c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#f4f0e5';ctx.fillRect(0,0,512,96);ctx.fillStyle=color;ctx.font='34px Atkinson, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,490);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);
    const m=new THREE.SpriteMaterial({map:t});const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(width,width*96/512,1);scene.add(s);return s;
  }
  scene.add(new THREE.HemisphereLight(0xe1e8ed,0x77715f,1.1));
  const sun=new THREE.DirectionalLight(0xffefd7,2.7);sun.position.set(-150,300,-100);scene.add(sun);
  const rim=new THREE.DirectionalLight(0xb8ccdc,.35);rim.position.set(90,120,200);scene.add(rim);
  const sky=new THREE.Mesh(new THREE.BoxGeometry(2200,2200,2200),new THREE.MeshBasicMaterial({color:0xb6c9d0,side:THREE.BackSide,fog:false}));scene.add(sky);
  const sunDisk=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:0xf6eddb,fog:false}));sunDisk.position.copy(sun.position).normalize().multiplyScalar(850);sunDisk.scale.setScalar(12);scene.add(sunDisk);
  // Upper ground has real openings for the sewer and sunken plaza.
  const xs=[-450,-65,40,65,90,170,205,450],zs=[-450,-28,-9,9,28,60,75,100,140,450];
  for(let i=0;i<xs.length-1;i++) for(let j=0;j<zs.length-1;j++) {
    const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
    let y=terrainHeight(x,z);
    if(x>=40&&x<=90&&Math.abs(z)<=9)y=-10;
    if(x>=170&&x<=205&&z>=75&&z<=100)y=-6;
    surfaceBox(earth,x,y-.5,z,xs[i+1]-xs[i],1,zs[j+1]-zs[j]);
  }
  for(const lane of LANES) {
    for(const [z,length] of lane.id==='midway'?[[-252,396],[252,396]]:[[0,900]]) {
      surfaceBox(asphalt,lane.x,.025,z,42,.05,length);
      surfaceBox(concrete,lane.x-24,.13,z,6,.26,length);surfaceBox(concrete,lane.x+24,.13,z,6,.26,length);
    }
    for(let z=-420;z<=420;z+=45) if(!(lane.id==='midway'&&Math.abs(z)<55)) {
      box(0xd5ccaa,lane.x-8,.08,z,.22,.03,12);box(0xd5ccaa,lane.x+8,.08,z,.22,.03,12);
      box(lane.color,lane.x,.08,z,.28,.03,4);
    }
    label(lane.name,lane.x,12,-350,'#17191b',25);
  }
  for(const z of [-280,-140,140,280]) surfaceBox(asphalt,0,.03,z,900,.04,18);
  // Retaining faces make the same lowered terrain used by collision legible.
  for(const z of [-28.175,28.175])surfaceBox(concrete,0,-5,z,130,10,.35);
  surfaceBox(concrete,-65.175,-5,0,.35,10,56);
  for(const z of [-18.5,18.5])surfaceBox(concrete,65.175,-5,z,.35,10,19);
  for(const z of [59.825,140.175])surfaceBox(concrete,130,-3,z,80,6,.35);
  surfaceBox(concrete,89.825,-3,100,.35,6,80);
  for(const [z,d] of [[67.5,15],[120,40]])surfaceBox(concrete,170.175,-3,z,.35,6,d);
  // Visible perimeter corresponds to the controller's 448m playable limit.
  for(const side of [-1,1]) {
    surfaceBox(concrete,side*449.5,.2,0,1,.4,900);
    surfaceBox(concrete,0,.2,side*449.5,900,.4,1);
  }
  for(const [m,parts] of surfaces) {
    const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());
    const terrain=new THREE.Mesh(g,m);terrain.name=m===asphalt?'asphalt':m===concrete?'concrete':'ground';scene.add(terrain);
  }
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
    // One current-goal label below replaces repeated structure-type billboards.
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
  for(let x=98;x<170;x+=18)for(let z=68;z<140;z+=18)box(0x9b9b8d,x,-5.94,z,13,.08,13);
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
  const goalLabel=label('',0,0,0,'#17191b',20);goalLabel.name='current-objective-label';goalLabel.visible=false;
  let goalText='';
  const guide=createObjectiveGuide(scene,{label(readout,anchor){
    goalLabel.visible=!!readout;
    if(!readout)return;
    goalLabel.position.copy(anchor).add(new THREE.Vector3(0,3,0));
    const text=`${readout.name} · ${Math.ceil(readout.distance)}m`;
    if(text===goalText)return;goalText=text;
    const image=goalLabel.material.map.image,ctx=image.getContext('2d');
    ctx.fillStyle='#f4f0e5';ctx.fillRect(0,0,image.width,image.height);ctx.fillStyle='#17191b';ctx.font='34px Atkinson, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,image.width/2,image.height/2,490);goalLabel.material.map.needsUpdate=true;
  }});
  let disposed=false;
  function resize() {const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  resize();
  return {
    scene,camera,
    syncObjectives(sim,hero,events,isOccluded){return guide.sync(sim,camera,{hero,events,isOccluded});},
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
    diagnostics:()=>Object.freeze({frames:renderer.info.render.frame,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,environment:environment.diagnostics()}),
    dispose() {if(disposed)return;disposed=true;guide.dispose();environment.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();scene.clear();}
  };
}
