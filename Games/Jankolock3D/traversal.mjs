import { WALK_SPEED, ZIP_SPEED, LIMIT, rampHeight, terrainHeight } from './world-data.mjs';
export const BODY = Object.freeze({ radius:0.45, height:1.8, eye:1.6 });
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const near = (p,q,r=5) => Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<=r+1e-8;
export function createTraveler(world) {
  return { ...world.start, vy:0, grounded:true, walk:true, stamina:100, mode:'free', ride:null, cooldown:0, collected:new Set(), broken:new Set(), event:'' };
}
// Upright capsule against an AABB or rotated ramp slab, shared by integrations.
export function capsuleIntersects(p,b) {
  if(b.axis) {
    // Match the scene's rotated 0.2 m slab. Transform the capsule segment
    // into slab space, then minimize its squared distance to the local box.
    if(p.x<b.minX-BODY.radius-.2 || p.x>b.maxX+BODY.radius+.2 || p.z<b.minZ-BODY.radius-.2 || p.z>b.maxZ+BODY.radius+.2) return false;
    const span=b.axis==='x'?b.maxX-b.minX:b.maxZ-b.minZ, rise=b.end-b.start;
    const length=Math.hypot(span,rise), c=span/length, s=rise/length;
    const along=b.axis==='x'?p.x-(b.minX+b.maxX)/2:p.z-(b.minZ+b.maxZ)/2;
    const across=b.axis==='x'?p.z-(b.minZ+b.maxZ)/2:p.x-(b.minX+b.maxX)/2;
    const y=p.y+BODY.radius-(b.start+b.end)/2+.1, segment=BODY.height-2*BODY.radius;
    const a=[c*along+s*y,-s*along+c*y,across], d=[s*segment,c*segment,0];
    const half=[length/2,.1,(b.axis==='x'?b.maxZ-b.minZ:b.maxX-b.minX)/2], cuts=[0,1];
    for(let i=0;i<3;i++) if(d[i]) for(const edge of [-half[i],half[i]]) {
      const t=(edge-a[i])/d[i];if(t>0&&t<1)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);
    const distance=t=>a.reduce((sum,v,i)=>sum+(v+d[i]*t-clamp(v+d[i]*t,-half[i],half[i]))**2,0);
    let best=Infinity;
    for(let j=1;j<cuts.length;j++) {
      const lo=cuts[j-1],hi=cuts[j],mid=(lo+hi)/2;let aa=0,ab=0;
      for(let i=0;i<3;i++) {
        const v=a[i]+d[i]*mid;
        if(Math.abs(v)>half[i]) {aa+=d[i]*d[i];ab+=d[i]*(a[i]-Math.sign(v)*half[i]);}
      }
      best=Math.min(best,distance(lo),distance(hi),distance(aa?clamp(-ab/aa,lo,hi):mid));
    }
    return best<BODY.radius*BODY.radius-1e-8;
  }
  const dx=p.x-clamp(p.x,b.minX,b.maxX), dz=p.z-clamp(p.z,b.minZ,b.maxZ);
  const lo=p.y+BODY.radius, hi=p.y+BODY.height-BODY.radius;
  const dy=hi<b.minY ? b.minY-hi : lo>b.maxY ? lo-b.maxY : 0;
  return dx*dx+dy*dy+dz*dz < BODY.radius*BODY.radius-1e-8;
}
export function moveCapsule(p,dx,dz,world,broken=new Set()) {
  // Substeps keep fast integration callers from tunnelling through narrow cover.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.25));
  const result={...p};
  for(let n=0;n<count;n++) for(const [axis,delta] of [['x',dx/count],['z',dz/count]]) {
    const previous=result[axis];
    result[axis]=clamp(previous+delta,-LIMIT,LIMIT);
    for(const b of world.boxes) {
      if(broken.has(b.id) || result.y>=b.maxY-0.02 || result.y+BODY.height<=b.minY) continue;
      if(capsuleIntersects(result,b)) {
        const raised={...result,y:b.maxY};
        const canStep=result.grounded && b.maxY>result.y && b.maxY-result.y<=.55 &&
          !world.boxes.some(other=>other!==b && !broken.has(other.id) && capsuleIntersects(raised,other));
        if(canStep) result.y=raised.y;
        else {result[axis]=previous;break;}
      }
    }
    for(const r of world.ramps) {
      const h=rampHeight(r,result.x,result.z);
      const onRamp=result.x>=r.minX&&result.x<=r.maxX&&result.z>=r.minZ&&result.z<=r.maxZ;
      if(result.y>=h-.02) continue;
      if(!capsuleIntersects(result,r)) continue;
      const raised={...result,y:h};
      if(onRamp && result.grounded && h>result.y && h-result.y<=.55 &&
        !world.boxes.some(b=>!broken.has(b.id)&&capsuleIntersects(raised,b))) result.y=h;
      else {result[axis]=previous;break;}
    }
  }
  return result;
}
export function surfaceHeight(world,x,z,maxY=Infinity,broken=new Set()) {
  let y=terrainHeight(x,z);
  for(const r of world.ramps) if(x>=r.minX && x<=r.maxX && z>=r.minZ && z<=r.maxZ) {
    const h=rampHeight(r,x,z); if(h<=maxY) y=Math.max(y,h);
  }
  for(const b of world.boxes) if(!broken.has(b.id) && x>=b.minX && x<=b.maxX && z>=b.minZ && z<=b.maxZ && b.maxY<=maxY) y=Math.max(y,b.maxY);
  return y;
}
export function interaction(world,s) {
  if(s.mode!=='free') return {kind:'detach',label:'E to hop off'};
  for(const c of world.crates) if(!s.collected.has(c.id) && !s.broken.has(c.id) && near(s,c,5)) return {kind:'crate',item:c,label:c.kind==='soul'?'E to collect soul-crate':'E to break supply crate'};
  for(const line of world.stations) for(const end of ['a','b']) if(near(s,line[end],6)) return {kind:'zip',line,end,label:`${line.id} station · E to ride zipline`};
  for(const p of world.portals) if(near(s,p)) return {kind:'portal',item:p,label:'E to use paired stamp teleporter'};
  for(const v of world.vents) if(near(s,v)) return {kind:'vent',item:v,label:'E to ride air vent to roof'};
  if(Math.hypot(s.x-world.rope.x,s.z-world.rope.z)<5 && s.y<=world.rope.top+1) return {kind:'rope',label:'E to climb Staple Tower rope'};
  return null;
}
export function interact(world,s) {
  if(s.cooldown>0) return;
  const hit=interaction(world,s); if(!hit) return;
  s.event='';
  if(hit.kind==='detach') { s.mode='free';s.ride=null;s.vy=4;s.cooldown=.4;return; }
  if(hit.kind==='crate') {
    (hit.item.kind==='soul'?s.collected:s.broken).add(hit.item.id);
    s.event=hit.item.kind==='soul'?'bell':'crate';s.cooldown=.25;
  } else if(hit.kind==='zip') {
    s.mode='zip';s.ride={id:hit.line.id,t:hit.end==='a'?0:1,direction:hit.end==='a'?1:-1};s.cooldown=.3;
  } else if(hit.kind==='portal') {
    const target=world.portals.find(p=>p.id!==hit.item.id);
    s.x=target.x;s.y=target.y;s.z=target.z;s.vy=0;s.cooldown=2;s.event='teleport';
  } else if(hit.kind==='vent') {
    s.mode='vent';s.ride={id:hit.item.id,t:0,start:{x:s.x,y:s.y,z:s.z}};s.cooldown=.3;
  } else { s.mode='rope';s.ride=null;s.cooldown=.3; }
}
export function stepTraveler(world,s,input,dt) {
  dt=clamp(Number.isFinite(dt)?dt:0,0,.05);s.cooldown=Math.max(0,s.cooldown-dt);s.event='';
  if(input.interact) interact(world,s);
  if(input.jump && s.mode!=='free') {s.mode='free';s.ride=null;s.vy=7;s.grounded=false;s.cooldown=.4;}
  if(s.mode==='zip') {
    const line=world.stations.find(l=>l.id===s.ride.id), r=s.ride;
    const length=Math.hypot(line.b.x-line.a.x,line.b.z-line.a.z);
    r.t=clamp(r.t+r.direction*ZIP_SPEED*dt/length,0,1);
    s.x=line.a.x+(line.b.x-line.a.x)*r.t;s.z=line.a.z+(line.b.z-line.a.z)*r.t;s.y=6+Math.sin(r.t*Math.PI)*4;
    if((r.direction===1 && r.t===1)||(r.direction===-1 && r.t===0)) {s.mode='free';s.ride=null;s.y=0;s.vy=0;s.cooldown=.8;}
    return;
  }
  if(s.mode==='rope') {
    s.x=world.rope.x;s.z=world.rope.z;s.y=Math.min(world.rope.top,s.y+7*dt);
    if(s.y>=world.rope.top) {Object.assign(s,world.rope.landing);s.mode='free';s.grounded=true;s.cooldown=.5;}
    return;
  }
  if(s.mode==='vent') {
    const v=world.vents.find(v=>v.id===s.ride.id),r=s.ride;r.t=Math.min(1,r.t+dt/2);
    s.x=r.start.x+(v.target.x-r.start.x)*r.t;s.z=r.start.z+(v.target.z-r.start.z)*r.t;
    s.y=r.start.y+(v.target.y-r.start.y)*r.t+Math.sin(r.t*Math.PI)*10;
    if(r.t===1) {s.mode='free';s.ride=null;s.vy=0;s.grounded=true;}
    return;
  }
  const yaw=input.yaw||0, f=input.forward||0, side=input.side||0, norm=Math.max(1,Math.hypot(f,side));
  const dx=(Math.cos(yaw)*side-Math.sin(yaw)*f)/norm*WALK_SPEED*dt;
  const dz=(-Math.sin(yaw)*side-Math.cos(yaw)*f)/norm*WALK_SPEED*dt;
  if(!s.walk) {
    s.x=clamp(s.x+dx,-LIMIT,LIMIT);s.z=clamp(s.z+dz,-LIMIT,LIMIT);
    s.y=clamp(s.y+((input.up||0)+Math.sin(input.pitch||0)*f)*WALK_SPEED*dt,0,100);s.vy=0;return;
  }
  const oldY=s.y;
  // Rise along an accessible ramp before checking its adjoining platform wall.
  const support=surfaceHeight(world,s.x+dx,s.z+dz,s.y+.55,s.broken);
  if(s.grounded && support>s.y && support-s.y<=.55) s.y=support;
  const p=moveCapsule(s,dx,dz,world,s.broken);s.x=p.x;s.y=p.y;s.z=p.z;
  if(input.jump && s.grounded && s.stamina>=8) {s.vy=8;s.grounded=false;s.stamina-=8;}
  s.vy-=20*dt;s.y+=s.vy*dt;
  // Resolve undersides as well as landings. Horizontal capsule checks alone
  // would let a jumping traveler enter the bridge slab from below.
  for(const b of world.boxes) if(!s.broken.has(b.id) && s.x>b.minX-BODY.radius && s.x<b.maxX+BODY.radius && s.z>b.minZ-BODY.radius && s.z<b.maxZ+BODY.radius) {
    if(s.vy>0 && oldY+BODY.height<=b.minY && s.y+BODY.height>b.minY) {s.y=b.minY-BODY.height;s.vy=0;}
  }
  for(const r of world.ramps) if(s.vy>0 && capsuleIntersects(s,r) && !capsuleIntersects({...s,y:oldY},r)) {
    let lo=oldY,hi=s.y;
    for(let n=0;n<24;n++) {const mid=(lo+hi)/2;if(capsuleIntersects({...s,y:mid},r))hi=mid;else lo=mid;}
    s.y=lo;s.vy=0;
  }
  const floor=surfaceHeight(world,s.x,s.z,Math.max(oldY,s.y)+.55,s.broken);
  if(s.y<=floor && s.vy<=0) {s.y=floor;s.vy=0;s.grounded=true;} else s.grounded=false;
  const pit=world.pit,inside=s.x>pit.minX&&s.x<pit.maxX&&s.z>pit.minZ&&s.z<pit.maxZ&&s.y<0;
  s.stamina=clamp(s.stamina+(inside?-18:12)*dt,0,100);
}
export function travelerSnapshot(s) {
  return Object.freeze({x:s.x,y:s.y,z:s.z,mode:s.mode,walk:s.walk,grounded:s.grounded,stamina:s.stamina,collected:s.collected.size,broken:s.broken.size,zipT:s.ride?.t??null});
}
