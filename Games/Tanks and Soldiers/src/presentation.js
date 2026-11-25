import {terrainHeight} from './core.js';
import {createDeliveredModels} from './models.js';

export function createPresentation(T,scene,world) {
  const root=new T.Group(); scene.add(root);
  const geometries=[], materials=[], textures=[], models=new Map(), labels=new Map();
  const delivered=typeof document==='undefined'?null:createDeliveredModels();
  const ownGeo=g=>(geometries.push(g),g);
  const material=(color,extra={})=>{const m=new T.MeshLambertMaterial({color,...extra});materials.push(m);return m;};
  const colors={ground:0x697452,water:0x28586a,road:0x5a5b54,runway:0x363d40,pier:0x96917d,wall:0x85816b,cover:0x71664e,blue:0x509ade,red:0xd26d54,dark:0x303b3d,neutral:0xd8c993,flash:0xffcf65};
  const mats=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,material(c)]));
  const box=ownGeo(new T.BoxGeometry(1,1,1));
  const cylinder=ownGeo(new T.CylinderGeometry(1,1,1,12));
  const ring=ownGeo(new T.RingGeometry(.94,1,48));
  const oldFog=scene.fog;
  if(!scene.fog)scene.fog=new T.Fog(0x9caeaf,650,1300);
  root.add(new T.HemisphereLight(0xd9e4ee,0x5f6043,2));
  const sun=new T.DirectionalLight(0xffefd5,2);sun.position.set(-300,600,200);root.add(sun);
  function part(parent,mat,x,y,z,sx,sy,sz,geo=box) {
    const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  function meshData(vertices,indices,mat) {
    const g=ownGeo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new T.Mesh(g,mat);root.add(m);return m;
  }
  const xs=[];for(let x=-1100;x<=1000;x+=25)xs.push(x);
  xs.push(190,220,220.01);xs.sort((a,b)=>a-b);
  const vertices=[],indices=[],nz=97;
  for(const x of xs)for(let j=0;j<nz;j++){const z=-1200+j*25;vertices.push(x,terrainHeight(x,z),z);}
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<nz-1;j++){
    const a=i*nz+j,b=(i+1)*nz+j;indices.push(a,a+1,b,b,a+1,b+1);
  }
  meshData(vertices,indices,mats.ground);
  part(root,mats.water,610,-.1,0,780,.2,2400);
  for(const road of world.roads??[]) {
    const v=[],ix=[];
    for(let s=1;s<road.points.length;s++) {
      const [ax,az]=road.points[s-1],[bx,bz]=road.points[s],length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length/12);
      const nx=-(bz-az)/length*road.width/2,nz=(bx-ax)/length*road.width/2;
      const base=v.length/3;
      for(let j=0;j<=n;j++)for(const sign of [-1,1]) {
        const x=ax+(bx-ax)*j/n+nx*sign,z=az+(bz-az)*j/n+nz*sign;v.push(x,terrainHeight(x,z)+.045,z);
      }
      for(let j=0;j<n;j++){const a=base+j*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const roadMesh=meshData(v,ix,mats[road.kind]);roadMesh.material.side=T.DoubleSide;
    if(road.kind==='runway') {
      const [x,z]=road.points[0],end=road.points.at(-1)[1],sign=Math.sign(end-z);
      for(let k=20;k<Math.abs(end-z);k+=30)part(root,mats.neutral,x,terrainHeight(x,z+sign*k)+.07,z+sign*k,1.5,.035,12);
    }
  }
  // Static collision proxies are rendered at exactly the same dimensions.
  const obstacles=new T.InstancedMesh(box,mats.wall,world.obstacles.length);
  const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),quat=new T.Quaternion();
  world.obstacles.forEach((o,i)=>{position.set(o.x,o.y+o.h/2,o.z);scale.set(o.w,o.h,o.d);matrix.compose(position,quat,scale);obstacles.setMatrixAt(i,matrix);obstacles.setColorAt(i,new T.Color(o.kind==='cover'||o.kind==='crate'?colors.cover:colors.wall));});
  obstacles.instanceMatrix.needsUpdate=true;root.add(obstacles);
  for(const s of world.surfaces)part(root,mats.pier,s.x,s.y-.4,s.z,s.w,.8,s.d);
  function paintLabel(canvas,text){const ctx=canvas.getContext('2d');if(!ctx)return false;ctx.clearRect(0,0,512,64);ctx.fillStyle='#182229dd';ctx.fillRect(0,0,512,64);ctx.fillStyle='#f4edcf';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.fillText(text,256,43);return true;}
  function label(text,key=text) {
    if(typeof document==='undefined')return null;
    if(labels.has(key))return labels.get(key);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
    if(!paintLabel(canvas,text))return null;
    const texture=new T.CanvasTexture(canvas);textures.push(texture);
    const mat=new T.SpriteMaterial({map:texture,depthWrite:false});materials.push(mat);mat.userData.canvas=canvas;labels.set(key,mat);return mat;
  }
  function addLabel(parent,text,y,width=13,key=text) {
    const mat=label(text,key);if(!mat)return null;
    const sprite=new T.Sprite(mat);sprite.position.y=y;sprite.scale.set(width,width/8,1);sprite.userData.text=text;parent.add(sprite);return sprite;
  }
  function unitText(e,loaded=false){const team=e.team===0?'A':'B';const goal=world.objectives.find(o=>o.id===e.goalId);return `${team}${e.id} ${e.kind==='soldier'?(e.alive?e.action??'MOVE':'DOWN'):(e.roleAction??e.kind.toUpperCase())}${goal?' '+goal.name:''} ${loaded?'GLB':'BLOCKOUT'}`;}
  const objectives=world.objectives.map(o=>{
    const group=new T.Group();group.position.set(o.x,terrainHeight(o.x,o.z),o.z);root.add(group);
    const circle=part(group,mats.neutral,0,.12,0,o.radius,o.radius,1,ring);circle.rotation.x=-Math.PI/2;
    part(group,mats.dark,0,8,0,.4,16,.4);
    const flag=part(group,mats.neutral,3,14,0,6,3,.3);
    const progress=part(group,mats.blue,0,18,0,0.01,.6,.6);
    addLabel(group,o.name+' BLOCKOUT',22,32);
    return {id:o.id,circle,flag,progress};
  });
  for(const [text,x,z,y] of [['BASE',-110,230,24],['AIRSTRIP',-165,300,10],['HARBOR',200,0,32],['INLAND FORT',-710,-400,30]]){
    const group=new T.Group();group.position.set(x,terrainHeight(x,z)+y,z);root.add(group);addLabel(group,text+' BLOCKOUT',0,34);
  }
  function makeModel(e) {
    const g=new T.Group(),body=new T.Group(),detail=new T.Group();body.add(detail);g.add(body);root.add(g);
    const team=mats[e.team===0?'blue':'red'];let turret=null;const legs=[];
    if(e.kind==='soldier') {
      part(body,team,0,1.05,0,.65,.85,.4);part(body,team,0,1.65,0,.43,.4,.43);
      for(const x of [-.2,.2])legs.push(part(detail,mats.dark,x,.35,0,.24,.7,.28));
      part(detail,mats.dark,.4,1.25,-.6,.15,.16,1.1);
    } else if(e.kind==='tank') {
      part(body,team,0,1.2,0,4.3,1.5,6);
      for(const x of [-2.3,2.3])part(body,mats.dark,x,.7,0,.9,1.4,6.5);
      turret=new T.Group();turret.position.y=2.3;body.add(turret);
      part(turret,team,0,0,0,2.6,1.2,2.7);part(turret,mats.dark,0,.1,-3,.28,.28,4.2);
      part(detail,mats.dark,0,3,0,1,.2,1);
    } else if(e.kind==='jet') {
      part(body,team,0,1,0,1.7,1.3,10);
      const wing=part(body,team,0,.9,.4,12,.22,2.5);wing.rotation.y=-.12;
      part(body,mats.dark,0,1.65,-1.4,1.1,.6,2.2);
      part(detail,team,0,2.4,4,.25,2.8,2);
      for(const x of [-1,1])part(detail,mats.dark,x,.3,3,.7,.7,2);
    } else if(e.kind==='ship') {
      part(body,mats.dark,0,1,0,12,2,30);part(body,team,0,2.6,0,10,1.2,27);
      part(body,team,0,5,3,5,4,7);part(detail,mats.dark,0,7.3,2,4.4,.8,3);
      part(detail,mats.dark,0,11,4,.4,8,.4);
      turret=new T.Group();turret.position.set(0,3.5,-8);body.add(turret);
      part(turret,team,0,.4,0,3,1.6,3);part(turret,mats.dark,0,1,-2.5,.35,.35,5);
    }
    const caption=addLabel(g,unitText(e),e.kind==='ship'?17:e.kind==='jet'?6:e.kind==='soldier'?3.4:5,e.kind==='soldier'?8:13,'unit-'+e.id);
    const model={g,body,detail,turret,caption,legs,delivered:null,lastX:e.x,lastZ:e.z,lastTime:world.time};models.set(e.id,model);return model;
  }
  const tracer=new T.InstancedMesh(box,mats.flash,128),flashes=new T.InstancedMesh(box,mats.flash,32);
  tracer.frustumCulled=flashes.frustumCulled=false;root.add(tracer,flashes);
  const forward=new T.Vector3(0,0,1),velocity=new T.Vector3();
  function update(w,dt,player) {
    const ids=new Set();
    for(const e of w.entities) {
      ids.add(e.id);const m=models.get(e.id)??makeModel(e);
      m.g.visible=!(e.kind==='soldier'&&(e.seatId!=null || (e.isPlayer&&!e.seatId)));
      m.g.position.set(e.x,e.y,e.z);m.g.rotation.set(e.kind==='jet'?e.pitch??0:0,e.yaw,e.kind==='jet'?e.roll??0:0,'YXZ');
      m.g.scale.setScalar(e.alive?1:.7);
      const near=!player||Math.hypot(e.x-player.x,e.z-player.z)<500;
      if(!m.delivered && near){m.delivered=delivered?.instantiate(e.kind,e.team);if(m.delivered)m.g.add(m.delivered.object);}
      // ponytail: keep cheap blockout silhouettes past 500m; add authored LODs only if needed.
      m.body.visible=!m.delivered||!near;
      if(m.delivered)m.delivered.object.visible=near;
      m.detail.visible=e.alive&&near;
      if(m.caption){const text=unitText(e,!!m.delivered&&near);if(text!==m.caption.userData.text){paintLabel(m.caption.material.userData.canvas,text);m.caption.material.map.needsUpdate=true;m.caption.userData.text=text;}m.caption.visible=e.alive&&e.id!==player?.seatId&&(!player||Math.hypot(e.x-player.x,e.z-player.z)<180);}
      const walking=e.alive&&Math.hypot(e.x-m.lastX,e.z-m.lastZ)>.005;
      if(near&&m.g.visible)m.delivered?.update(e,Math.max(0,Math.min(.1,w.time-m.lastTime)),walking);
      m.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(w.time*10+i*Math.PI)*.35:0);m.lastX=e.x;m.lastZ=e.z;m.lastTime=w.time;
      if(m.turret){m.turret.rotation.y=(e.aimYaw??e.yaw)-e.yaw;const barrel=m.turret.children[1];barrel.rotation.x=e.aimPitch??0;}
    }
    for(const [id,m] of models)if(!ids.has(id)){m.delivered?.dispose();root.remove(m.g);models.delete(id);}
    for(const marker of objectives) {
      const o=w.objectives.find(o=>o.id===marker.id);if(!o)continue;
      marker.circle.material=marker.flag.material=mats[o.contested?'flash':o.owner===0?'blue':o.owner===1?'red':'neutral'];
      marker.progress.material=mats[o.progress>=0?'blue':'red'];marker.progress.scale.x=Math.max(.01,Math.abs(o.progress)*12);
    }
    tracer.count=Math.min(128,w.projectiles.length);
    for(let i=0;i<tracer.count;i++) {
      const p=w.projectiles[i];position.set(p.x,p.y,p.z);velocity.set(p.vx,p.vy,p.vz);const length=velocity.length();
      quat.setFromUnitVectors(forward,velocity.normalize());scale.set(.12,.12,Math.min(7,length*.025));matrix.compose(position,quat,scale);tracer.setMatrixAt(i,matrix);
    }
    tracer.instanceMatrix.needsUpdate=true;
    const impacts=w.events.filter(e=>(e.type==='shot'||e.type==='impact'||e.type==='hit'||e.type==='destroyed')&&w.time-e.time<.18).slice(-32);
    flashes.count=impacts.length;
    impacts.forEach((e,i)=>{position.set(e.x,e.y,e.z);quat.identity();scale.setScalar(e.type==='destroyed'?3:e.type==='shot'?.25:.6);matrix.compose(position,quat,scale);flashes.setMatrixAt(i,matrix);});flashes.instanceMatrix.needsUpdate=true;
  }
  update(world,0,world.entities.find(e=>e.isPlayer));
  return {update,dispose(){scene.remove(root);scene.fog=oldFog;for(const model of models.values())model.delivered?.dispose();delivered?.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();obstacles.dispose();tracer.dispose();flashes.dispose();models.clear();}};
}
