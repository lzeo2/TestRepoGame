import * as THREE from '../vendor/three.module.js';
import {ActorFactory} from './actors.js';

const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const xyz = (v, fallback = [0, 0, 0]) => Array.isArray(v) ? v : v ? [finite(v.x ?? v.X), finite(v.y ?? v.Y), finite(v.z ?? v.Z)] : fallback;
const tint = v => Array.isArray(v) ? new THREE.Color(v[0], v[1], v[2]) : new THREE.Color(typeof v === 'string' ? (v.startsWith('#') ? v : `#${v}`) : '#88968B');
const layout = [[-85,-58,1],[85,-58,1],[-85,58,-1],[85,58,-1],[-85,-120,1],[85,-120,1],[-85,120,-1],[85,120,-1],[-85,-182,1],[85,-182,1],[-85,182,-1],[85,182,-1]];
const PRACTICE_KIT={primary:'#14263F',secondary:'#E4BD58',shorts:'#14263F'};
const PRACTICE_KEEPER={primary:'#1D885A',secondary:'#F4F6F8',shorts:'#123C31'};

export function miniLineup(members,formation='4-4-2',front=1) {
  const counts={'4-4-2':[1,4,4,2],'4-3-3':[1,4,3,3],'3-5-2':[1,3,5,2]}[formation]||[1,4,4,2];
  const remaining=members.slice(0,11);const result=[];
  counts.forEach((count,row)=>{const role=['GK','DF','MF','ST'][row];for(let i=0;i<count&&remaining.length;i++){
    const at=remaining.findIndex(m=>(m.role||m.stats?.naturalRole)===role);const member=remaining.splice(at<0?0:at,1)[0];
    result.push({member,role,x:count===1?0:(i/(count-1)-.5)*18,z:[-8.7,-4.2,1.4,7.1][row]*front,angle:front>0?Math.PI/2:-Math.PI/2});
  }});return result;
}

export function partMatrix(part) {
  const m = new THREE.Matrix4();
  const cf = part.cframe || part.cf || part.transform;
  if (Array.isArray(part.matrix) && part.matrix.length === 16) m.fromArray(part.matrix);
  else if (Array.isArray(cf) && cf.length === 12) m.set(cf[3],cf[4],cf[5],cf[0],cf[6],cf[7],cf[8],cf[1],cf[9],cf[10],cf[11],cf[2],0,0,0,1);
  else {
    const p = xyz(part.position || part.pos);
    const r = xyz(part.rotation);
    m.compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(1,1,1));
  }
  return m;
}

function wedgeGeometry() {
  const g = new THREE.BufferGeometry();
  const vertices = [-.5,-.5,-.5, .5,-.5,-.5, -.5,-.5,.5, .5,-.5,.5, -.5,.5,.5, .5,.5,.5];
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,1,4,1,5,4,0,4,2,1,3,5]);g.computeVertexNormals();return g;
}

// Grounded movement uses exported collision boxes without touching game state.
export function groundedMove(position, vector, dt, colliders, bounds) {
  const step = Math.min(.1, Math.max(0, finite(dt))) * 24;
  let vx = finite(vector.x), vz = finite(vector.z);
  const length = Math.hypot(vx,vz); if (length > 1) {vx /= length; vz /= length;}
  const next = {x:position.x,y:position.y,z:position.z,angle:position.angle || 0};
  const blocked = (x,z) => colliders.some(b => x > b.min.x - 1 && x < b.max.x + 1 && z > b.min.z - 1 && z < b.max.z + 1 && b.max.y > position.y + .65 && b.min.y < position.y + 4.7);
  const x = clamp(position.x + vx * step,bounds.min.x + 1,bounds.max.x - 1);
  if (!blocked(x,next.z)) next.x = x;
  const z = clamp(position.z + vz * step,bounds.min.z + 1,bounds.max.z - 1);
  if (!blocked(next.x,z)) next.z = z;
  let ground = null;
  for (const b of colliders) if (next.x >= b.min.x && next.x <= b.max.x && next.z >= b.min.z && next.z <= b.max.z && b.max.y <= position.y + .65 && b.max.y >= position.y - 8) ground = Math.max(ground ?? -Infinity,b.max.y);
  if (ground === null) return {...position};
  next.y = ground + .035;
  if (length > .001) next.angle = Math.atan2(vz,vx);
  return next;
}

export class World {
  constructor(canvas, {data, worldData, onInteract, onTravel} = {}) {
    this.canvas=canvas;this.data=data || {};this.worldData=worldData || {};this.onInteract=onInteract;this.onTravel=onTravel;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#9AC2D1');this.scene.fog=new THREE.Fog('#9AC2D1',240,1000);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.camera=new THREE.PerspectiveCamera(52,1,.3,2400);this.cameraConfig={mode:'avatar',index:0,zoom:1,yaw:0};
    this.scene.add(new THREE.HemisphereLight('#F4F5DF','#546B53',2.25));
    this.sun=new THREE.DirectionalLight('#FFF2D6',2);this.sun.position.set(-100,220,100);this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-110,right:110,top:110,bottom:-110,near:1,far:500});this.sun.shadow.bias=-.001;
    this.factory=new ActorFactory();this.staticGeometries={box:new THREE.BoxGeometry(1,1,1),wedge:wedgeGeometry(),cylinder:new THREE.CylinderGeometry(.5,.5,1,12),sphere:new THREE.SphereGeometry(.5,12,8)};
    this.materials=[];this.labelTextures=[];this.chunks=[];this.colliders=[];this.labels=[];this.hotspots=[];this.actors=new Map();this.matchActors=[];this.time=0;this.lowGraphics=false;this.disposed=false;this.dynamicKey='';
    this.bases=this.normalizedBases();this.pitchIndex=0;this.venueColliders=[];
    this.bounds=new THREE.Box3(new THREE.Vector3(-900,-20,-900),new THREE.Vector3(1100,200,1100));
    this.buildStatic();this.buildHotspots();
    const spawn=xyz(this.worldData.spawn || this.bases[0]?.spawn,[this.basePosition(0).x,this.basePosition(0).y+.04,this.basePosition(0).z+10]);
    this.avatar={x:spawn[0],y:spawn[1],z:spawn[2],angle:Math.PI};this.avatarActor=this.factory.create({id:'avatar',name:'YOU',appearance:{hairStyle:'quiff',skinColor:'#D7AC84',hairColor:'#34251B',bootColor:'#171D26'}},{primary:'#F4DA62',shorts:'#263549'},{simple:true});this.scene.add(this.avatarActor.root);
    this.matchGroup=new THREE.Group();this.scene.add(this.matchGroup);
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(.82,14,10),new THREE.MeshLambertMaterial({color:'#FEFFF7'}));this.ball.castShadow=true;this.matchGroup.add(this.ball);
    this.materials.push(this.ball.material);this.ballGeometry=this.ball.geometry;
    const ringGeometry=new THREE.RingGeometry(1.3,1.7,28);this.ballRing=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#FFD447',side:THREE.DoubleSide,depthWrite:false}));this.ballRing.rotation.x=-Math.PI/2;this.matchGroup.add(this.ballRing);this.materials.push(this.ballRing.material);this.ringGeometry=ringGeometry;
    this.crowdGroup=new THREE.Group();this.scene.add(this.crowdGroup);this.buildCrowd();
    this.resize();this.camera.position.set(this.avatar.x+22,this.avatar.y+25,this.avatar.z+30);this.camera.lookAt(this.avatar.x,3,this.avatar.z);
  }

  normalizedBases() {
    const bases=this.worldData.bases || [];
    return layout.map((p,i)=>{
      const entry=bases.find(b=>b.index===i || b.name===`Base${i+1}`) || bases[i] || {};
      const pos=xyz(entry.position || entry.floor || entry.pos,[p[0],1.15,p[1]]);
      const deposit=xyz(entry.deposit,pos);const front=Math.sign(deposit[2]-pos[2])||p[2];
      return {...entry,index:i,position:pos,front:entry.front || entry.frontDirection || front};
    });
  }

  basePosition(index=0) {const b=this.bases[clamp(Math.trunc(finite(index)),0,11)];return {x:b.position[0],y:b.position[1],z:b.position[2],angle:b.front===1?Math.PI/2:-Math.PI/2};}

  pitchPosition(index=0) {
    const pitches=this.worldData.pitches || this.worldData.homeStadiums || [];
    const entry=this.bases[index]?.pitch || pitches[index];
    if(entry) {const p=xyz(entry.position || entry.floor || entry.pos);return {x:p[0],y:p[1]+finite(entry.size?.[1],.35)/2,z:p[2]};}
    const rows=[2,2,3,3,1,1,4,4,0,0,5,5];
    const ref=xyz(this.worldData.arena?.position || this.worldData.arenaPosition,[370, .975,0]);
    return {x:ref[0]+(index%2===0?-531:259),y:ref[1]+.175,z:ref[2]-600+rows[index]*240};
  }

  buildStatic() {
    const venueFrame=new THREE.Matrix4().fromArray(this.bases[0]?.pitch?.matrix || new THREE.Matrix4().elements);
    this.venueOrigin=new THREE.Vector3().setFromMatrixPosition(venueFrame);
    const parts=[...(this.worldData.parts || this.worldData.staticParts || []),...(this.worldData.stadiumParts || []).map(p=>({...p,venue:true}))];
    const batches=new Map();
    for(const p of parts) {
      const transparency=clamp(p.opacity===undefined?finite(p.transparency):1-p.opacity,0,1);if(transparency>=.98)continue;
      const shape=String(p.shape || p.className || 'box').toLowerCase();
      const kind=shape.includes('wedge')?'wedge':shape.includes('cylinder')?'cylinder':shape.includes('ball')||shape.includes('sphere')?'sphere':'box';
      const frame=partMatrix(p);if(p.venue)frame.premultiply(venueFrame);const size=xyz(p.size,[1,1,1]);const matrix=frame.clone().scale(new THREE.Vector3(...size));
      // Roblox cylinders run along local X; Three cylinders run along local Y.
      if(kind==='cylinder') matrix.copy(frame).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI/2)).scale(new THREE.Vector3(size[1],size[0],size[2]));
      const center=new THREE.Vector3().setFromMatrixPosition(frame);const path=p.path || `${p.group || ''}/${p.name || ''}`;
      const venue=p.venue===true;const level=finite(p.minLevel ?? p.level ?? p.stadiumLevel ?? p.attributes?.StadiumLevel);
      const district=venue?'venue':`${Math.floor(center.x/120)},${Math.floor(center.z/120)}`;
      const neon=String(p.material).includes('Neon');const key=`${district}|${kind}|${transparency.toFixed(2)}|${neon}|${level}`;
      if(!batches.has(key))batches.set(key,{kind,transparency,neon,level,venue,items:[]});
      batches.get(key).items.push({matrix,color:tint(p.color),center,path});
      if(p.collision===true || p.collide===true || p.canCollide===true) {
        const box=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix);this.colliders.push(box);
        if(venue)this.venueColliders.push({box,original:box.clone(),level});
      }
      if(p.text || p.label) this.addLabel(String(p.text || p.label),center.clone().add(new THREE.Vector3(0,size[1]/2+1.5,0)),Math.min(18,size[0]));
    }
    for(const batch of batches.values()) {
      const material=batch.neon?new THREE.MeshBasicMaterial({color:'#FFFFFF'}):new THREE.MeshLambertMaterial({color:'#FFFFFF'});
      material.transparent=batch.transparency>0;material.opacity=1-batch.transparency;this.materials.push(material);
      const mesh=new THREE.InstancedMesh(this.staticGeometries[batch.kind],material,batch.items.length);
      batch.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,item.color);});
      mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=false;this.scene.add(mesh);this.chunks.push({mesh,level:batch.level,venue:batch.venue,center:mesh.boundingSphere.center.clone()});
    }
    if(this.colliders.length) {const groundBounds=new THREE.Box3();for(const b of this.colliders)groundBounds.union(b);this.bounds.copy(groundBounds).expandByScalar(1);}
  }

  addLabel(text,position,width=12) {
    if(typeof document==='undefined' || this.labels.length>100)return;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#17232B';ctx.fillRect(0,0,512,128);ctx.fillStyle='#FFF7DD';ctx.font='bold 34px sans-serif';ctx.textAlign='center';
    const lines=text.split('\n').slice(0,2);lines.forEach((line,i)=>ctx.fillText(line.slice(0,34),256,lines.length===1?77:48+i*46));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.labelTextures.push(texture);
    const material=new THREE.SpriteMaterial({map:texture});this.materials.push(material);const sprite=new THREE.Sprite(material);sprite.position.copy(position);sprite.scale.set(width,width/4,1);this.scene.add(sprite);this.labels.push(sprite);
  }

  buildHotspots() {
    this.bases.forEach((b,i)=>{
      const pos=this.basePosition(i);const deposit=xyz(b.deposit,[pos.x,pos.y,pos.z+b.front*15]);this.hotspots.push({kind:'base',id:`base-${i}`,base:i,rivalIndex:i>0?i-1:undefined,name:i===0?'Your team':'Rival team',x:deposit[0],y:deposit[1],z:deposit[2],radius:14});
      this.hotspots.push({kind:'pitch',id:`pitch-${i}`,base:i,name:'Home stadium',x:pos.x,y:pos.y,z:pos.z+b.front*12.6,radius:5});
    });
    if(this.worldData.rivalBase){const b=this.worldData.rivalBase,p=xyz(b.deposit||b.position);this.hotspots.push({kind:'base',id:'practice-base',base:12,rivalIndex:11,name:'Practice XI',x:p[0],y:p[1],z:p[2],radius:14});}
    for(const entry of this.worldData.interactions || []) {const p=xyz(entry.position);this.hotspots.push({...entry,x:p[0],y:p[1],z:p[2],radius:entry.radius||10});}
    const npcs=this.worldData.npcs || [];
    for(const npc of npcs) {
      const p=xyz(npc.position);const actor=this.factory.create(npc.def || {name:npc.name,appearance:{hairStyle:npc.hairStyle||'quiff',skinColor:npc.skinColor||'#C99A73'}},npc.kit||{primary:'#F2D267'},{simple:true});actor.root.position.set(...p);actor.root.rotation.y=finite(npc.angle);this.scene.add(actor.root);
      this.actors.set(`npc-${npc.id || npc.name}`,{actor,static:true});this.addLabel(`${npc.name || ''}\n${npc.role || npc.kind || npc.panel || 'Shop'}`,new THREE.Vector3(p[0],p[1]+7,p[2]),9);
      this.hotspots.push({...npc,kind:npc.kind||'npc',x:p[0],y:p[1],z:p[2],radius:10});
    }
    const market=this.worldData.market || {};const start=xyz(market.start,[-57,1.35,0]);const end=xyz(market.end,[57,1.35,0]);
    this.hotspots.push({kind:'market',id:'conveyor',name:'Transfer conveyor',x:(start[0]+end[0])/2,y:start[1],z:start[2],radius:18});
  }

  interactions(position=this.avatar) {
    const items=this.hotspots.map(h=>({...h,type:h.kind,action:h.kind==='pitch'?'travel':h.kind==='base'?(h.base===0?'deposit':'rival'):h.kind==='market'?'market':'open',panel:h.panel||h.kind}));
    for(const entry of this.actors.values())if(entry.market){const p=entry.actor.root.position;items.push({kind:'buy',type:'market',action:'buy',name:entry.actor.definition.name,marketId:entry.marketId,x:p.x,y:p.y,z:p.z,radius:12});}
    return items.map(h=>({...h,distance:Math.hypot(position.x-h.x,position.z-h.z)})).filter(h=>h.distance<=h.radius).sort((a,b)=>a.distance-b.distance);
  }

  moveAvatar(vector,dt) {const old=this.avatar;this.avatar=groundedMove(old,vector,dt,this.colliders,this.bounds);this.avatar.moving=Math.hypot(this.avatar.x-old.x,this.avatar.z-old.z)>.001;return {...this.avatar};}
  teleport(point) {const p=xyz(point);if(!p.every(Number.isFinite))return false;this.avatar={x:p[0],y:p[1]+.035,z:p[2],angle:finite(point?.angle,this.avatar.angle)};this.jumpHeight=0;this.jumpVelocity=0;return {...this.avatar};}
  jump() {if(finite(this.jumpHeight)>.001)return false;this.jumpVelocity=20;this.jumpHeight=.01;return true;}
  setCamera(config={}) {this.cameraConfig={...this.cameraConfig,...config,yaw:finite(config.yaw,finite(config.orbit,this.cameraConfig.yaw)),zoom:clamp(finite(config.zoom,this.cameraConfig.zoom),.35,2.5)};if(Number.isInteger(config.pitchIndex))this.pitchIndex=clamp(config.pitchIndex,0,11);}

  rebuildDisplays(state) {
    const identities=members=>(members||[]).map(m=>[m.uid,m.id,m.role]);
    const key=JSON.stringify([identities(state.roster),state.rivals?.map(r=>identities(r.roster||r.players)),state.kit,state.tactics?.formation,state.tactics?.selectedUids,identities(state.lineup)]);if(key===this.dynamicKey)return;this.dynamicKey=key;
    for(const [id,entry]of this.actors)if(!entry.static&&!entry.market){this.scene.remove(entry.actor.root);this.factory.release(entry.actor);this.actors.delete(id);}
    const roster=state.roster || [];
    const makeRoster=(members,index)=>{
      const b=index===12?this.worldData.rivalBase:this.bases[index];if(!b)return;const front=b.front||Math.sign(xyz(b.deposit,b.position)[2]-b.position[2])||1;
      members.slice(0,18).forEach((member,i)=>{
        const def=member.def||this.data.players?.find(p=>p.id===member.id);if(!def)return;
        const slot=b.slots?.[i];const fallback=i<16?[b.position[0]+(i<8?-18:18),b.position[1]+.09,b.position[2]+(-17+(i%8)*3.4)*front]:[b.position[0]+(i===16?-6:6),b.position[1]+.09,b.position[2]-18.3*front];
        const p=xyz(slot?.position || slot?.pos || slot,fallback);const actor=this.factory.create(def,index===12?PRACTICE_KIT:index===0&&state.kit?.enabled?state.kit:{},{simple:index!==0});actor.root.position.set(...p);actor.root.rotation.y=-finite(slot?.angle,front===1?Math.PI/2:-Math.PI/2)-Math.PI/2;this.scene.add(actor.root);this.actors.set(`roster-${index}-${i}`,{actor});
      });
    };
    makeRoster(roster,0);(state.rivals||[]).slice(0,12).forEach((r,i)=>makeRoster(r.roster||r.players||[],i+1));
    const b=this.bases[0];const selected=state.tactics?.selectedUids || [];const starters=state.lineup||(selected.length?selected.map(uid=>roster.find(r=>r.uid===uid)).filter(Boolean):roster);
    miniLineup(starters,state.tactics?.formation,b.front).forEach(({member,x,z,angle},index)=>{
      const def=member.def||this.data.players?.find(p=>p.id===member.id);if(!def)return;const actor=this.factory.create(def,state.kit?.enabled?state.kit:{},{scale:.45,simple:true});const point=new THREE.Vector3(x,.09,z);if(b.miniPitch?.matrix)point.applyMatrix4(new THREE.Matrix4().fromArray(b.miniPitch.matrix));else point.add(new THREE.Vector3(...b.position));actor.root.rotation.y=-angle-Math.PI/2;actor.root.position.copy(point);this.scene.add(actor.root);this.actors.set(`lineup-${index}`,{actor});
    });
  }

  updateMarket(market=[]) {
    const current=new Set();
    market.slice(0,14).forEach((offer,i)=>{
      if(!offer || (Object.hasOwn(offer,'id')&&!offer.id&&!offer.playerId))return;
      const def=offer.def || this.data.players?.find(p=>p.id===(offer.playerId || offer.id));if(!def)return;
      const id=`market-${offer.marketId || offer.uid || offer.id}-${i}`;current.add(id);
      let entry=this.actors.get(id);
      if(entry&&entry.actor.definition.id!==def.id){this.scene.remove(entry.actor.root);this.factory.release(entry.actor);this.actors.delete(id);entry=null;}
      if(!entry){const actor=this.factory.create(def,{}, {simple:true});this.scene.add(actor.root);entry={actor,market:true,marketId:offer.marketId || offer.uid || offer.id};this.actors.set(id,entry);}
      const age=finite(offer.age,this.time+i*4);const start=xyz(this.worldData.market?.start,[-57,1.35,0]);const end=xyz(this.worldData.market?.end,[57,1.35,0]);const travel=(age*finite(this.data.config?.ConveyorSpeed,3))%Math.max(1,end[0]-start[0]);const x=Number.isFinite(offer.x)?start[0]+clamp(offer.x,0,1)*(end[0]-start[0]):start[0]+travel;
      entry.actor.root.position.set(x,start[1]+.04,start[2]);entry.actor.root.rotation.y=Math.PI;this.factory.pose(entry.actor,'idle',this.time+i);
    });
    for(const [id,entry]of this.actors)if(entry.market&&!current.has(id)){this.scene.remove(entry.actor.root);this.factory.release(entry.actor);this.actors.delete(id);}
  }

  buildCrowd() {
    const material=new THREE.MeshLambertMaterial({color:'#FFFFFF'});this.materials.push(material);
    this.crowdSeats=(this.worldData.stadiumParts||[]).filter(p=>p.name==='Seat').sort((a,b)=>a.minLevel-b.minLevel||a.matrix[12]-b.matrix[12]).slice(0,24);
    this.crowdParts=[{name:'torso',size:[1.55,1.45,.85],position:[0,1.05,0],color:'kit'},{name:'head',size:[1.05,1.05,.95],position:[0,2.32,0],color:'skin'}, {name:'hair',size:[1.1,.25,1],position:[0,2.88,.03],color:'hair'}];
    for(const side of [-1,1])this.crowdParts.push({name:`arm${side}`,size:[.5,1.3,.55],position:[side*.99,.95,0],color:'skin'}, {name:`thigh${side}`,size:[.6,.5,1.3],position:[side*.45,.02,-.5],color:'shorts'}, {name:`leg${side}`,size:[.55,1.1,.55],position:[side*.45,-.62,-1.05],color:'skin'});
    const ids=['saka','yamal','son','neymar','messi','ronaldo','haaland','pedri','palmer','doue','vinicius','bellingham'];const skins=['#795036','#BB8961','#E9C19E','#9F6C4C'];
    for(const part of this.crowdParts){part.mesh=new THREE.InstancedMesh(this.staticGeometries.box,material,24);part.mesh.frustumCulled=false;this.crowdSeats.forEach((seat,i)=>{const def=this.data.players?.find(d=>d.id===ids[i%12])||{};const colors={kit:def.color||'#286FC1',skin:skins[i%4],hair:def.appearance?.hairColor||'#282019',shorts:def.shorts||'#24334A'};part.mesh.setColorAt(i,tint(colors[part.color]));});this.crowdGroup.add(part.mesh);}
    this.updateCrowd(3,false);
  }

  updateCrowd(level,animate) {
    this.crowdCount=Math.min(this.crowdSeats.length,[8,8,16,24][clamp(Math.trunc(finite(level)),0,3)]);if(!animate&&this.crowdStaticCount===this.crowdCount)return;this.crowdStaticCount=animate?null:this.crowdCount;const dummy=new THREE.Object3D();
    for(const part of this.crowdParts){part.mesh.count=this.crowdCount;for(let i=0;i<this.crowdCount;i++){const seat=this.crowdSeats[i],p=seat.matrix;dummy.position.set(p[12]+part.position[0],p[13]+seat.size[1]/2+part.position[1],p[14]+part.position[2]);dummy.scale.set(...part.size);dummy.rotation.set(0,0,animate&&part.name.startsWith('arm')?Math.sin(this.time*2+i)*.3:0);dummy.updateMatrix();part.mesh.setMatrixAt(i,dummy.matrix);}part.mesh.instanceMatrix.needsUpdate=true;}
  }

  updateMatch(match,state) {
    this.matchGroup.visible=Boolean(match);this.crowdGroup.visible=Boolean(match);if(!match)return;
    this.updateCrowd(state.stadiumLevel,!this.lowGraphics);
    const p=this.pitchPosition(this.pitchIndex);this.matchGroup.position.set(p.x,p.y,p.z);this.crowdGroup.position.set(p.x,p.y-.175,p.z);
    const players=match.players||[];
    const practice=match.isPractice===true||match.practice===true||players.filter(p=>p.side===1).every(p=>p.stats?.traitId==='practice');const key=players.map(a=>`${a.key||a.id}:${a.side}:${a.index}`).join('|')+practice;
    if(key!==this.matchKey){this.matchActors.forEach(a=>{this.matchGroup.remove(a.root);this.factory.release(a);});this.matchActors=players.map(player=>{
      const def=player.def||this.data.players?.find(d=>d.id===player.id)||{name:player.name};const kit=player.side===0?(state.kit?.enabled?state.kit:{primary:'#246AC9',secondary:'#FAF4DD',shorts:'#172B52'}):practice?(player.role==='GK'?PRACTICE_KEEPER:PRACTICE_KIT):{primary:'#C93549',secondary:'#FFF2D1',shorts:'#272A32'};const actor=this.factory.create(def,kit,{number:player.index+1});this.matchGroup.add(actor.root);return actor;});this.matchKey=key;}
    players.forEach((player,i)=>{const actor=this.matchActors[i];if(!actor)return;actor.root.position.set(finite(player.x),.035,finite(player.z));actor.root.rotation.y=-finite(player.angle)-Math.PI/2;this.factory.pose(actor,player.pose,this.time,finite(player.speed,1));});
    const ball=match.ball||{};this.ball.position.set(finite(ball.x),Math.max(.84,finite(ball.y,.84)),finite(ball.z));this.ball.rotation.z+=.03;this.ballRing.position.set(finite(ball.x),.09,finite(ball.z));
  }

  updateCamera(match,dt) {
    const {mode,index,zoom}=this.cameraConfig;let target=new THREE.Vector3(this.avatar.x,this.avatar.y+3,this.avatar.z);let offset=new THREE.Vector3(20,23,30);
    if(mode!=='avatar'){
      const pitch=this.pitchPosition(this.pitchIndex);target.set(pitch.x,pitch.y,pitch.z);offset.set(0,155,135);
      if(match&&(mode==='ball'||mode==='player'||mode==='celebration'||mode==='icon')){
        const celebration=match.celebration;const indexedScorer=Number.isInteger(celebration?.scorerIndex)?match.players?.[celebration.scorerIndex]:null;
        const scorer=indexedScorer||(celebration&&match.players?.find(p=>(p.name===celebration.scorer||p.id===celebration.scorer||p.key===celebration.scorer)&&p.side===celebration.side));
        const subject=mode==='celebration'?scorer:mode==='player'||mode==='icon'?match.players?.[clamp(Math.trunc(finite(index)),0,21)]:match.ball;
        if(subject)target.add(new THREE.Vector3(finite(subject.x),2,finite(subject.z)));
        offset=mode==='icon'?new THREE.Vector3(0,12,13):mode==='celebration'?new THREE.Vector3(26,14,30):new THREE.Vector3(0,47,47);
      }
      if(mode==='goalcorner') {const side=index===1?-1:1;target.add(new THREE.Vector3(side*83,3,0));offset.set(side*24,23,40);}
    }
    offset.applyAxisAngle(new THREE.Vector3(0,1,0),finite(this.cameraConfig.yaw ?? this.cameraConfig.orbit));offset.multiplyScalar(1/zoom);const desired=target.clone().add(offset);this.camera.position.lerp(desired,1-Math.exp(-Math.min(dt,.1)*7));this.camera.lookAt(target);
    this.sun.target.position.copy(target);this.sun.position.set(target.x-100,target.y+220,target.z+100);
  }

  update(dt,{state={},avatar,match,camera,lowGraphics=false}={}) {
    if(this.disposed)return;dt=clamp(finite(dt),0,.1);this.time+=dt;
    if(avatar){this.avatar={...this.avatar,...avatar};}if(camera)this.setCamera(camera);
    if(this.lowGraphics!==Boolean(lowGraphics)){this.lowGraphics=Boolean(lowGraphics);this.resize();}
    this.renderer.shadowMap.enabled=!this.lowGraphics;this.sun.castShadow=!this.lowGraphics;
    this.jumpVelocity=finite(this.jumpVelocity)-56*dt;this.jumpHeight=Math.max(0,finite(this.jumpHeight)+this.jumpVelocity*dt);if(this.jumpHeight===0)this.jumpVelocity=0;
    this.avatarActor.root.position.set(this.avatar.x,this.avatar.y+this.jumpHeight,this.avatar.z);this.avatarActor.root.rotation.y=-finite(this.avatar.angle)-Math.PI/2;this.factory.pose(this.avatarActor,this.avatar.moving?'run':'idle',this.time);
    this.avatar.moving=false;
    this.rebuildDisplays(state);this.updateMarket(state.market);this.updateMatch(match,state);this.updateCamera(match,dt);
    const focus=this.camera.position;const far=this.lowGraphics?360:800;
    const venue=this.bases[this.pitchIndex]?.pitch;const venuePosition=venue?new THREE.Vector3(...xyz(venue.position)):this.venueOrigin;const venueDelta=venuePosition.clone().sub(this.venueOrigin);
    for(const chunk of this.chunks){if(chunk.venue)chunk.mesh.position.copy(venueDelta);const center=chunk.center.clone().add(chunk.mesh.position);chunk.mesh.visible=chunk.level<=finite(state.stadiumLevel)&&center.distanceTo(focus)<far+finite(chunk.mesh.boundingSphere?.radius);}
    for(const entry of this.venueColliders)entry.box.copy(entry.original).translate(venueDelta);
    for(const label of this.labels)label.visible=label.position.distanceTo(focus)<(this.lowGraphics?80:140);
    for(const entry of this.actors.values())entry.actor.root.visible=entry.actor.root.position.distanceTo(focus)<(this.lowGraphics?170:300);
    this.renderer.render(this.scene,this.camera);
  }

  resize() {const width=Math.max(1,this.canvas.clientWidth||this.canvas.width||800);const height=Math.max(1,this.canvas.clientHeight||this.canvas.height||600);this.renderer.setPixelRatio(Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,this.lowGraphics?1:1.5));this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  snapshot() {return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,staticParts:(this.worldData.parts||this.worldData.staticParts||[]).length,batches:this.chunks.length,actors:this.actors.size+this.matchActors.length+1,crowdCount:this.crowdCount,colliders:this.colliders.length,lowGraphics:this.lowGraphics,avatar:{...this.avatar},camera:{...this.cameraConfig}};}
  dispose() {if(this.disposed)return;this.disposed=true;this.actors.forEach(entry=>this.factory.release(entry.actor));this.matchActors.forEach(a=>this.factory.release(a));this.factory.release(this.avatarActor);this.factory.dispose();Object.values(this.staticGeometries).forEach(g=>g.dispose());this.ballGeometry.dispose();this.ringGeometry.dispose();this.materials.forEach(m=>m.dispose());this.labelTextures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.forceContextLoss();this.scene.clear();}
}
