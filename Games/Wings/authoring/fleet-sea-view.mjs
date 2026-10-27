// Original injected-Three presentation only. Safe FC snapshots in; no combat, assets or clock out.
import {compileGeometry} from './fleet-geometry.mjs';
const TIERS=Object.freeze({low:{foam:3,smoke:1,splashes:8},balanced:{foam:5,smoke:2,splashes:16},high:{foam:7,smoke:3,splashes:24}});
const number=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>number(x,-100000,100000));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function createSeaView(T,{parent,models,quality='low',reducedFlashes=true,waterSize=10000}={}) {
  if(T?.REVISION!=='186'||!parent?.isObject3D||!Object.hasOwn(TIERS,quality)||typeof reducedFlashes!=='boolean'||
    !number(waterSize,100,20000)||!Array.isArray(models)||!models.length||models.length>12)throw new TypeError('Bounded Three186 sea view options required');
  const descriptors=new Map();
  for(const model of models) {
    if(!model||typeof model.id!=='string'||!model.id||descriptors.has(model.id))throw new TypeError('Unique model descriptor IDs required');
    const g=compileGeometry(model.descriptor),b=g.clearance,deck=g.descriptor.collision.deck??b;
    descriptors.set(model.id,{min:b.min,max:b.max,width:b.max[0]-b.min[0],length:b.max[2]-b.min[2],
      smoke:[(deck.min[0]+deck.max[0])/2,deck.max[1],(deck.min[2]+deck.max[2])/2]});
  }
  const tier=TIERS[quality],root=new T.Group();root.name='fleet-sea-view';
  const geometries=[],materials=[],meshes=[],resources=new Set();
  const geometry=g=>(geometries.push(g),resources.add(g),g);
  const material=m=>(materials.push(m),resources.add(m),m);
  function texture(size,normal) {
    const data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const u=x/(size-1),v=y/(size-1),a=u*Math.PI*2,b=v*Math.PI*2,k=(y*size+x)*4;
      if(normal) {
        const sx=.2*Math.cos(3*a+2*b)+.13*Math.cos(7*a-b)+.07*Math.cos(a+5*b);
        const sy=.14*Math.cos(3*a+2*b)-.06*Math.cos(7*a-b)+.18*Math.cos(a+5*b),n=Math.hypot(sx,sy,1);
        data[k]=Math.round((-.5*sx/n+.5)*255);data[k+1]=Math.round((-.5*sy/n+.5)*255);data[k+2]=Math.round((.5/n+.5)*255);
      } else {
        const edge=clamp((1-Math.abs(u*2-1))*3,0,1),fade=Math.min(1,v*10)*(1-v)**1.5;
        data[k]=data[k+1]=data[k+2]=Math.round(255*edge*fade*(.85+.15*Math.sin(a+3*b)));
      }
      data[k+3]=255;
    }
    const map=new T.DataTexture(data,size,size,T.RGBAFormat,T.UnsignedByteType);
    map.colorSpace=T.NoColorSpace;map.wrapS=map.wrapT=normal?T.RepeatWrapping:T.ClampToEdgeWrapping;
    map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
    resources.add(map);return map;
  }
  const ripples=quality==='low'?null:texture(64,true),foamAlpha=texture(32,false);
  if(ripples)ripples.repeat.set(waterSize/48,waterSize/48);
  const seaGeometry=geometry(new T.PlaneGeometry(1,1));seaGeometry.rotateX(-Math.PI/2);
  const seaMaterial=material(new T.MeshStandardMaterial({color:0x294956,metalness:.12,roughness:quality==='low'?.36:quality==='balanced'?.28:.22,
    normalMap:ripples,normalScale:new T.Vector2(.5,.5)}));
  const sea=new T.Mesh(seaGeometry,seaMaterial);sea.name='fleet-sea-water';sea.scale.set(waterSize,1,waterSize);sea.position.y=-.04;
  root.add(sea);meshes.push(sea);
  // Tapered strips use a feathered original alpha mask, not opaque white plates.
  const strip=geometry(new T.BufferGeometry());
  strip.setAttribute('position',new T.Float32BufferAttribute([-.18,0,0,.18,0,0,-.5,0,1,.5,0,1],3));
  strip.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
  strip.setIndex([0,2,1,1,2,3]);strip.computeVertexNormals();
  const foamMaterial=material(new T.MeshStandardMaterial({color:0xc5d2cf,roughness:.9,metalness:0,side:T.DoubleSide,
    alphaMap:foamAlpha,transparent:true,opacity:.65,alphaTest:.012,depthWrite:false}));
  const splashGeometry=geometry(new T.CylinderGeometry(.12,1,1,8,1,true));
  const splashMaterial=material(new T.MeshStandardMaterial({color:0xc2d3d5,roughness:.85,transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide}));
  const smokeGeometry=geometry(new T.IcosahedronGeometry(1,1));
  const smokeMaterial=material(new T.MeshStandardMaterial({color:0x3b3c3a,roughness:1,transparent:true,opacity:.38,depthWrite:false}));
  const fireGeometry=geometry(new T.ConeGeometry(.5,1,6));
  const fireMaterial=material(new T.MeshStandardMaterial({color:0xb65824,emissive:0xa43b12,emissiveIntensity:reducedFlashes?.25:.55,
    roughness:1,transparent:true,opacity:.7,depthWrite:false}));
  function pool(name,g,m,cap) {
    const mesh=new T.InstancedMesh(g,m,cap);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);meshes.push(mesh);resources.add(mesh);return mesh;
  }
  const foam=pool('fleet-sea-foam',strip,foamMaterial,12*tier.foam),splash=pool('fleet-sea-splashes',splashGeometry,splashMaterial,tier.splashes);
  const smoke=pool('fleet-sea-smoke',smokeGeometry,smokeMaterial,12*tier.smoke),fire=pool('fleet-sea-fire',fireGeometry,fireMaterial,12);
  const dummy=new T.Object3D(),q=new T.Quaternion(),p=new T.Vector3(),fwd=new T.Vector3();
  let disposed=false,busy=false,round=null,lastTick=-1,clock=0,lastEvent=0,states=new Map(),splashes=[],anchors=[];
  const active=()=>{if(disposed)throw new Error('Sea view disposed');};
  function put(mesh,position,scale,yaw=0) {
    if(mesh.count>=mesh.instanceMatrix.count)return;
    dummy.position.fromArray(position);dummy.rotation.set(0,yaw,0);dummy.scale.fromArray(scale);dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count++,dummy.matrix);
  }
  function world(local,state) {
    return p.fromArray(local).applyQuaternion(q.fromArray(state.orientation)).add(new T.Vector3(...state.position)).toArray();
  }
  function render() {
    if(ripples)ripples.offset.set((clock*.006)%1,(clock*.0035)%1);
    for(const mesh of [foam,splash,smoke,fire])mesh.count=0;
    anchors=[];
    for(const state of states.values()) {
      const d=descriptors.get(state.modelId),atSurface=state.depth==='surfaced'&&state.position[1]+d.min[1]<0&&state.position[1]+d.max[1]>=0;
      if(!state.alive||!atSurface)continue;
      const bow=world([0,0,d.min[2]],state),stern=world([0,0,d.max[2]],state),burn=world(d.smoke,state);
      const damage=state.maxHp===null?0:clamp(1-state.hp/state.maxHp,0,1);
      anchors.push({id:state.id,speed:state.speed,bow:[...bow],stern:[...stern],smoke:[...burn],damageFraction:damage});
      fwd.set(0,0,-1).applyQuaternion(q.fromArray(state.orientation));
      const yaw=Math.atan2(-fwd.x,-fwd.z),strength=clamp(state.speed/20,0,1),width=d.width;
      if(state.speed>.7) {
        const front=state.reverse?stern:bow,heading=yaw+(state.reverse?Math.PI:0);
        for(const side of [-1,1])put(foam,[front[0],.035,front[2]],[width*.32*strength,1,width*.8*strength],heading+side*.5);
        for(let i=0;i<tier.foam-2;i++) {
          const spread=(i-(tier.foam-3)/2)*width*.26,trail=world([spread,0,state.reverse?d.min[2]:d.max[2]],state);
          put(foam,[trail[0],.045+i*.002,trail[2]],[width*(.8-i*.05)*strength,1,Math.min(d.length*1.8,state.speed*4)*(1-i*.06)],heading);
        }
      }
      if(damage>=.35)for(let i=0;i<tier.smoke;i++) {
        const radius=width*(.12+.15*damage)*(1+i*.25);
        put(smoke,[burn[0],Math.max(.5,burn[1])+radius*(1+i*1.4),burn[2]],[radius,radius*(1.4+i*.2),radius]);
      }
      if(damage>=.75&&burn[1]>=0) {
        const height=width*.4*damage*(reducedFlashes?1:.95+.05*Math.sin(clock*5));
        put(fire,[burn[0],burn[1]+height*.5,burn[2]],[width*.28,height,width*.28]);
      }
    }
    for(const effect of splashes) {
      const age=clock-effect.born,life=clamp(1-age/1.6,0,1);
      put(splash,[effect.position[0],.04+life*.9,effect.position[2]],[1+age*4,.25+life*2.5,1+age*4]);
    }
    for(const mesh of [foam,splash,smoke,fire])mesh.instanceMatrix.needsUpdate=true;
  }
  function reset() {
    active();if(busy)throw new Error('Reentrant sea view operation');
    states.clear();splashes=[];anchors=[];round=null;lastTick=-1;clock=0;lastEvent=0;
    if(ripples)ripples.offset.set(0,0);
    for(const mesh of [foam,splash,smoke,fire])mesh.count=0;
  }
  function update(snapshot) {
    active();if(busy)throw new Error('Reentrant sea view operation');
    if(snapshot?.mode!=='factions'||!Number.isSafeInteger(snapshot.tick)||snapshot.tick<0||!Number.isSafeInteger(snapshot.round)||snapshot.round<0||
      !Array.isArray(snapshot.units)||snapshot.units.length>12||!Array.isArray(snapshot.events)||snapshot.events.length>256||
      (snapshot.paused!==undefined&&typeof snapshot.paused!=='boolean'))throw new TypeError('Bounded safe FC snapshot required');
    const visible=new Map();
    for(const u of snapshot.units) {
      if(!descriptors.has(u.modelId))continue;
      if(typeof u.id!=='string'||!u.id||visible.has(u.id)||!vector(u.position,3)||!vector(u.view?.orientation,4)||
        Math.abs(Math.hypot(...u.view.orientation)-1)>1e-5||typeof u.alive!=='boolean'||!number(u.hp,0,100000)||
        !['surfaced','shallow','deep'].includes(u.depth))throw new TypeError('Invalid safe visible unit');
      if(u.maxHp!==undefined&&(!number(u.maxHp,1,100000)||u.hp>u.maxHp))throw new TypeError('Invalid authoritative max HP');
      visible.set(u.id,{id:u.id,modelId:u.modelId,position:[...u.position],orientation:[...u.view.orientation],alive:u.alive&&u.hp>0,
        depth:u.depth,hp:u.hp,maxHp:u.maxHp??null,speed:0,reverse:false});
    }
    for(const e of snapshot.events)if(!Number.isSafeInteger(e.id)||e.id<1||!Number.isSafeInteger(e.tick)||e.tick<0||
      !Number.isSafeInteger(e.round)||e.round<0)throw new TypeError('Invalid safe event clock');
    if(round!==snapshot.round||snapshot.tick<lastTick)reset();
    busy=true;
    try {
      // Privacy removals apply even when paused or receiving a repeated simulation tick.
      for(const [id,old] of states) {
        const current=visible.get(id);
        if(!current||current.modelId!==old.modelId||current.depth!==old.depth||!current.alive)states.delete(id);
      }
      splashes=splashes.filter(e=>visible.has(e.owner)&&visible.get(e.owner).depth==='surfaced');
      if(lastTick>=0&&snapshot.tick===lastTick){render();return;}
      const dt=lastTick<0?0:(snapshot.tick-lastTick)*.05;
      for(const state of visible.values()) {
        const previous=states.get(state.id);
        if(previous&&dt>0) {
          const dx=state.position[0]-previous.position[0],dz=state.position[2]-previous.position[2];
          state.speed=Math.hypot(dx,dz)/dt;
          fwd.set(0,0,-1).applyQuaternion(q.fromArray(state.orientation));state.reverse=dx*fwd.x+dz*fwd.z<0;
        }
      }
      states=visible;round=snapshot.round;lastTick=snapshot.tick;clock=snapshot.tick*.05;
      splashes=splashes.filter(e=>clock-e.born<1.6);
      for(const e of snapshot.events) {
        if(e.id<=lastEvent)continue;lastEvent=e.id;
        if(e.round!==snapshot.round||e.type!=='impact'||e.medium==='underwater'||e.tick>snapshot.tick||clock-e.tick*.05>=1.6||!vector(e.position,3)||Math.abs(e.position[1])>2)continue;
        const owner=e.unit!=null?states.get(e.unit):states.get(e.source);
        if(!owner||owner.depth!=='surfaced')continue;
        if(splashes.length===tier.splashes)splashes.shift();
        splashes.push({owner:owner.id,born:e.tick*.05,position:[...e.position]});
      }
      render();
    } finally {busy=false;}
  }
  function dispose() {
    if(disposed)return;if(busy)throw new Error('Reentrant sea view operation');disposed=true;
    const errors=[],attempt=fn=>{try{fn();}catch(e){errors.push(e);}};
    states.clear();splashes=[];anchors=[];
    attempt(()=>root.removeFromParent());
    for(const mesh of meshes)attempt(()=>mesh.removeFromParent());
    for(const resource of resources)attempt(()=>resource.dispose());
    resources.clear();geometries.length=0;materials.length=0;meshes.length=0;
    if(errors.length)throw new AggregateError(errors,'Sea view cleanup failed',{cause:errors[0]});
  }
  function stats() {
    return {quality,reducedFlashes,disposed,tick:lastTick,round,seconds:clock,units:states.size,
      counts:{foam:disposed?0:foam.count,splashes:disposed?0:splash.count,smoke:disposed?0:smoke.count,fire:disposed?0:fire.count},
      caps:{foam:12*tier.foam,splashes:tier.splashes,smoke:12*tier.smoke,fire:12},ownedResources:resources.size,
      anchors:anchors.map(a=>({...a,bow:[...a.bow],stern:[...a.stern],smoke:[...a.smoke]}))};
  }
  parent.add(root);
  return Object.freeze({root,update,reset,dispose,stats});
}
