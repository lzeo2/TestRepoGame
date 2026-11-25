export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const direction = (yaw, pitch = 0) => ({x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch)});
export const isWater = (x, z) => x > 220;
export function terrainHeight(x, z) {
  if (x > 220) return -12;
  if (x > 190) return 2 - (x - 190) * .1;
  const inland = clamp((-x - 450) / 500, 0, 1);
  return 2 + inland * (15 + 12 * Math.sin(z / 170) * Math.sin(x / 210));
}
export function makeWorld({tickets=180}={}) {
  if(![45,180].includes(tickets))throw new RangeError('tickets must be 45 or 180');
  return {time: 0, entities: [], projectiles: [], obstacles: [], surfaces: [], objectives: [], tickets: [tickets, tickets], winner: null, events: [], nextId: 1, playerId: null, spawns: [{x:-110,z:160},{x:-220,z:-430}], stats: {shots:0,hits:0,kills:0,captures:0}, bounds:{minX:-1100,maxX:1000,minZ:-1200,maxZ:1200}};
}
export function addEntity(w, props) {
  const e = {id:w.nextId++,kind:'soldier',team:0,x:0,y:2,z:0,yaw:0,pitch:0,hp:100,maxHp:100,radius:.45,height:1.8,alive:true,cooldown:0,ammo:120,respawnAt:0,...props};
  w.entities.push(e); return e;
}
export const getEntity = (w, id) => w.entities.find(e => e.id === id);
const inRect = (x,z,b,pad=0) => Math.abs(x-b.x)<b.w/2+pad && Math.abs(z-b.z)<b.d/2+pad;
export function floorAt(w,x,z) {
  let y = terrainHeight(x,z);
  for (const s of w.surfaces) if (inRect(x,z,s)) y = Math.max(y,s.y);
  for (const e of w.entities) if(e.kind==='ship' && e.alive && Math.abs(x-e.x)<6 && Math.abs(z-e.z)<15) y=Math.max(y,e.y+3);
  return y;
}
function validGround(w,e,x,z,water) {
  const b = w.bounds, r = e.radius;
  if(x<b.minX+r || x>b.maxX-r || z<b.minZ+r || z>b.maxZ-r) return false;
  if(water ? x<235 : (x>205 && floorAt(w,x,z)<1)) return false;
  const y = water ? 0 : floorAt(w,x,z);
  for(const o of w.obstacles) if(y+e.height>o.y+.1 && y<o.y+o.h-.1 && inRect(x,z,o,r)) return false;
  for(const v of w.entities) if(v!==e && v.alive && v.kind!=='soldier' && v.id!==e.seatId && !(v.kind==='jet' && v.airborne) && Math.abs(v.y-y)<4 && Math.hypot(x-v.x,z-v.z)<r+v.radius) return false;
  return true;
}
export function moveGround(w,e,dx,dz,{water=false}={}) {
  let moved = false;
  // Small movement subdivisions keep high-speed vehicles from crossing thin cover.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dz) / Math.max(.4,e.radius*.5)));
  for(let i=0;i<steps;i++) {
    if(validGround(w,e,e.x+dx/steps,e.z,water)){e.x+=dx/steps;moved=true;}
    if(validGround(w,e,e.x,e.z+dz/steps,water)){e.z+=dz/steps;moved=true;}
  }
  e.y = water ? 0 : floorAt(w,e.x,e.z); return moved;
}
// Segment vs AABB, t in [0,1]. Same proxies back visible geometry and ballistics.
function boxHit(a,b,box) {
  let lo=0,hi=1;
  for(const k of ['x','y','z']) {
    const d=b[k]-a[k], min=box.min[k],max=box.max[k];
    if(Math.abs(d)<1e-9){if(a[k]<min || a[k]>max)return null;continue;}
    let t1=(min-a[k])/d,t2=(max-a[k])/d;
    if(t1>t2)[t1,t2]=[t2,t1]; lo=Math.max(lo,t1);hi=Math.min(hi,t2);
    if(lo>hi)return null;
  }
  return lo;
}
const obstacleBox = o => ({min:{x:o.x-o.w/2,y:o.y,z:o.z-o.d/2},max:{x:o.x+o.w/2,y:o.y+o.h,z:o.z+o.d/2}});
function terrainHit(a,b) {
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/2));
  for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;if(y<=Math.max(terrainHeight(x,z),0))return t;}
  return null;
}
export function clearLine(w,a,b) {
  if(terrainHit(a,b)!==null)return false;
  return !w.obstacles.some(o=>boxHit(a,b,obstacleBox(o))!==null);
}
function event(w, data){w.events.push({...data,time:w.time}); if(w.events.length>160)w.events.shift();}
export {event as emitEvent};
export function damage(w,e,amount,team,ownerId=null,controllerId=null) {
  if(!e?.alive || e.team===team || (e.protectedUntil??0)>w.time) return false;
  const before=e.hp;
  e.hp=Math.max(0,e.hp-amount); w.stats.hits++; event(w,{type:'hit',targetId:e.id,targetKind:e.kind,ownerId,controllerId,team:e.team,sourceTeam:team,damage:amount,appliedDamage:before-e.hp,remainingHp:e.hp,x:e.x,y:e.y+1,z:e.z});
  if(e.hp===0){
    e.alive=false;e.respawnAt=w.time+6;w.stats.kills++;event(w,{type:'destroyed',targetId:e.id,targetKind:e.kind,team:e.team,sourceTeam:team,ownerId,controllerId,x:e.x,y:e.y,z:e.z});
    if(e.occupantId){const p=getEntity(w,e.occupantId);e.occupantId=null;if(p){p.seatId=null;p.protectedUntil=0;damage(w,p,p.hp,1-p.team,ownerId,controllerId);}}
    if(e.seatId){const v=getEntity(w,e.seatId);if(v)v.occupantId=null;e.seatId=null;}
  }
  return true;
}
export function fire(w,e,opts={}) {
  if(!e?.alive || e.cooldown>0 || e.ammo<=0 || w.winner!==null) return false;
  const yaw=opts.yaw??e.aimYaw??e.yaw,pitch=opts.pitch??e.aimPitch??e.pitch??0;
  const d=direction(yaw,pitch),off=opts.offset??e.height*.75, muzzle=e.radius+.6;
  const controllerId=e.isPlayer?e.id:getEntity(w,e.occupantId)?.isPlayer?e.occupantId:null;
  const p={id:w.nextId++,team:e.team,ownerId:e.id,controllerId,x:e.x+d.x*muzzle,y:e.y+off+d.y*muzzle,z:e.z+d.z*muzzle,vx:d.x*(opts.speed??180),vy:d.y*(opts.speed??180),vz:d.z*(opts.speed??180),damage:opts.damage??24,ttl:opts.ttl??2,radius:opts.radius??.12};
  const root={x:e.x,y:e.y+off,z:e.z};
  // A muzzle cannot teleport a projectile through a wall.
  if(!clearLine(w,root,p))return false;
  w.projectiles.push(p);e.cooldown=opts.cooldown??.18;e.ammo--;w.stats.shots++;event(w,{type:'shot',x:p.x,y:p.y,z:p.z,ownerId:e.id,controllerId,team:e.team,kind:e.kind});return true;
}
export function stepCore(w,dt) {
  if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('dt must be in (0,.1]');
  w.time+=dt;
  for(const e of w.entities)e.cooldown=Math.max(0,e.cooldown-dt);
  for(const p of w.projectiles){
    const a={x:p.x,y:p.y,z:p.z},b={x:p.x+p.vx*dt,y:p.y+p.vy*dt,z:p.z+p.vz*dt};
    let t=terrainHit(a,b)??2,target=null;
    for(const o of w.obstacles){const hit=boxHit(a,b,obstacleBox(o));if(hit!==null&&hit<t)t=hit;}
    // ponytail: linear entity sweep, bounded to prototype population; spatial bins if counts grow.
    for(const e of w.entities){
      if(!e.alive||e.seatId||e.team===p.team||e.id===p.ownerId)continue;
      const r=e.radius+p.radius,hit=boxHit(a,b,{min:{x:e.x-r,y:e.y,z:e.z-r},max:{x:e.x+r,y:e.y+e.height,z:e.z+r}});
      if(hit!==null && hit<t){t=hit;target=e;}
    }
    if(t<=1){p.x=a.x+(b.x-a.x)*t;p.y=a.y+(b.y-a.y)*t;p.z=a.z+(b.z-a.z)*t;if(target)damage(w,target,p.damage,p.team,p.ownerId,p.controllerId);else event(w,{type:'impact',x:p.x,y:p.y,z:p.z});p.ttl=0;}
    else Object.assign(p,b,{ttl:p.ttl-dt});
  }
  w.projectiles=w.projectiles.filter(p=>p.ttl>0);
  w.events=w.events.filter(e=>w.time-e.time<8);
}
