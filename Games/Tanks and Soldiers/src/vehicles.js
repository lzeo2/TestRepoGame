import {addEntity, getEntity, clamp, distance, direction, terrainHeight, floorAt, moveGround, clearLine, fire, damage} from './core.js';

const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (a,b,d) => a + clamp(b-a,-d,d);
const ground = v => v.kind !== 'jet' || !v.airborne;
const weapons = {
  tank:{speed:240,damage:70,cooldown:1.1,ttl:3,offset:2.1},
  jet:{speed:360,damage:32,cooldown:.12,ttl:2.5,offset:1},
  ship:{speed:260,damage:45,cooldown:.45,ttl:3,offset:5}
};

// State precedence: DESTROYED > EMPTY > CYCLING > LIMIT > READY.
// LIMIT means requested aim is clamped/traversing, or the actual muzzle is blocked.
function weaponStatus(w,v) {
  const yaw=v.kind==='jet'?v.yaw:v.aimYaw, pitch=v.kind==='jet'?v.pitch:v.aimPitch;
  const d=direction(yaw,pitch), root={x:v.x,y:v.y+weapons[v.kind].offset,z:v.z};
  const muzzle={x:root.x+d.x*(v.radius+.6),y:root.y+d.y*(v.radius+.6),z:root.z+d.z*(v.radius+.6)};
  v.muzzle=muzzle;
  v.weaponState=!v.alive?'DESTROYED':v.ammo<=0?'EMPTY':v.cooldown>0?'CYCLING':
    v.aimLimited || !clearLine(w,root,muzzle)?'LIMIT':'READY';
  if(!v.alive){v.roleAction='WRECK';v.aimLimited=false;}
}

function clearIntent(p,grounded) {
  Object.assign(p,{vy:0,jumpHeld:false,grounded,reloadUntil:0,aiming:false});
}

export function spawnVehicles(w) {
  for (const team of [0,1]) for (const [kind,x,z] of team===0
    ? [['tank',-95,142],['jet',-165,150],['ship',270,140]]
    : [['tank',-200,-360],['jet',-340,-620],['ship',400,-380]]) {
    const ship=kind==='ship', jet=kind==='jet';
    addEntity(w,{kind,team,x,z,y:ship?0:terrainHeight(x,z)+(jet?.5:0),yaw:0,pitch:0,
      radius:ship?10:jet?5:3,height:ship?6:jet?2:3,hp:ship?500:jet?180:300,
      maxHp:ship?500:jet?180:300,ammo:ship?160:jet?300:60,occupantId:null,ai:true,
      speed:0,airborne:false,roll:0,aimYaw:0,aimPitch:0,throttle:0,reserved:team===0,
      weaponState:'READY',aimLimited:false,roleAction:'HOLD'});
  }
}

export function enterNearest(w,p) {
  if (!p?.alive || p.seatId || w.winner!==null || w.entities.some(e=>e.occupantId===p.id)) return false;
  const v=w.entities.filter(v=>v.kind!=='soldier' && v.alive && v.team===p.team && !v.occupantId && ground(v)
    && !w.entities.some(e=>e.alive && e.seatId===v.id)
    && distance(v,p)<=(v.kind==='ship'?18:9) && Math.abs(p.y-(v.kind==='ship'?v.y+3:v.y))<4
    && clearLine(w,{x:p.x,y:p.y+1.4,z:p.z},{x:v.x,y:v.y+(v.kind==='ship'?4:1.5),z:v.z}))
    .sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if (!v) return false;
  v.occupantId=p.id;v.ai=false;v.reserved=false;v.roleAction='PLAYER';p.seatId=v.id;
  clearIntent(p,false);follow(p,v);weaponStatus(w,v);
  if(v.kind==='ship')w.notice='Ship station: mouse gun / WASD slow helm. Turn east around the harbor breakwater to reach open sea.';
  return true;
}

export function exitVehicle(w,p) {
  const v=getEntity(w,p?.seatId);
  if (!p?.alive || !v?.alive || v.occupantId!==p.id) return false;
  if(v.kind==='jet' && v.airborne){w.notice='Cannot exit an airborne aircraft. Land first.';return false;}
  const limit=v.kind==='ship'?1.5:v.kind==='jet'?1:4;
  if(Math.abs(v.speed)>limit){w.notice=`Stop before exiting ${v.kind} (at most ${limit}m/s).`;return false;}
  // Probe through the authoritative ground rules before changing ownership.
  const r=v.kind==='ship'?16:v.radius+2;
  for(const [dx,dz] of [[-r,0],[r,0],[0,r],[0,-r],[-r,r],[r,r]]) {
    const q={...p,x:v.x+dx,z:v.z+dz,y:0,seatId:v.id};
    const y=floorAt(w,q.x,q.z);
    if(Math.abs(y-(v.kind==='ship'?3:v.y))>4)continue;
    if(w.entities.some(e=>e!==p && e!==v && e.alive && !e.seatId && distance(e,q)<e.radius+(e.team!==p.team?3:p.radius)))continue;
    if(!moveGround(w,q,0,0))continue;
    follow(p,v);
    Object.assign(p,{x:q.x,y:q.y,z:q.z,seatId:null});clearIntent(p,true);
    v.occupantId=null;v.ai=true;v.roleAction=Math.abs(v.speed)>.1?'CRUISE':'HOLD';
    v.aimLimited=false;weaponStatus(w,v);return true;
  }
  w.notice='No safe exit. Move to clear ground or a pier.';return false;
}

function follow(p,v) {
  p.x=v.x;p.z=v.z;p.y=v.y+(v.kind==='ship'?3:1);
  p.yaw=v.kind==='jet'?v.yaw:(v.aimYaw??v.yaw);p.pitch=v.kind==='jet'?v.pitch:(v.aimPitch??0);
}

function aim(v,yaw,pitch,dt) {
  const limit=v.kind==='ship'?Math.PI*.8:Math.PI;
  const relative=clamp(angle(yaw-v.yaw),-limit,limit);
  v.aimYaw=(v.aimYaw??v.yaw)+clamp(angle(v.yaw+relative-(v.aimYaw??v.yaw)),-dt*1.8,dt*1.8);
  v.aimPitch=approach(v.aimPitch??0,clamp(pitch,-.18,v.kind==='ship'?.65:.45),dt*.8);
  v.aimLimited=Math.abs(angle(yaw-v.aimYaw))>.01 || Math.abs(pitch-v.aimPitch)>.01;
}

function bot(w,v,dt) {
  const enemies=w.entities.filter(e=>e.alive && !e.seatId && e.team!==v.team);
  const muzzle={x:v.x,y:v.y+weapons[v.kind].offset,z:v.z};
  const target=enemies.filter(e=>distance(v,e)<(v.kind==='jet'?650:500)
    && clearLine(w,muzzle,{x:e.x,y:e.y+e.height*.5,z:e.z}))
    .sort((a,b)=>distance(v,a)-distance(v,b))[0];
  const objective=w.objectives.filter(o=>o.owner!==v.team).sort((a,b)=>distance(v,a)-distance(v,b))[0];
  let goal=target??objective;
  if(v.kind==='jet' && !v.airborne)goal={x:v.x,z:v.z-500};
  if(v.kind==='ship' && goal)goal={x:Math.max(250,goal.x),z:goal.z};
  const desired=goal?Math.atan2(v.x-goal.x,v.z-goal.z):v.yaw;
  let turn=clamp(angle(desired-v.yaw)*1.6,-1,1);
  if(v.blocked>0)turn=Math.sin(v.id*2)>0?1:-1;
  const stop=goal && distance(v,goal)<(target?75:12);
  const input={forward:goal && !stop?1:0,right:-turn,sprint:false,fire:false};
  if(v.kind==='jet') {
    input.forward=1;
    input.pitch=v.airborne?clamp((70-v.y)/120,-.22,.3):.18;
    if(target && v.airborne)input.pitch=clamp(Math.atan2(target.y+target.height*.5-muzzle.y,distance(v,target)),-.45,.45);
    input.pitch-=.25;
  }
  if(target) {
    const yaw=Math.atan2(v.x-target.x,v.z-target.z);
    const pitch=Math.atan2(target.y+target.height*.5-muzzle.y,distance(v,target));
    if(v.kind!=='jet')aim(v,yaw,pitch,dt);
    input.fire=Math.abs(angle(yaw-(v.kind==='jet'?v.yaw:v.aimYaw)))<.08
      && Math.abs(pitch-(v.kind==='jet'?v.pitch:v.aimPitch))<.08;
  }
  // Ready vehicles stay boardable at base; after first use their AI takes over normally.
  if(v.reserved){input.forward=0;input.right=0;input.pitch=0;}
  // PLAYER owns the station; bots ENGAGE only when aligned, otherwise PURSUE.
  // CRUISE is untargeted movement; HOLD is idle/reserved; WRECK is dead.
  v.roleAction=target && input.fire?'ENGAGE':v.reserved?'HOLD':target?'PURSUE':goal?'CRUISE':'HOLD';
  return input;
}

function surface(w,v,dt,i) {
  const ship=v.kind==='ship', max=ship?12:22, accel=ship?2.5:8;
  const throttle=clamp(i.forward??0,-1,1), steer=clamp(i.right??0,-1,1);
  v.speed=approach(v.speed,throttle*(throttle<0?max*.4:max),accel*dt);
  v.yaw-=steer*(ship?.3:1.1)*clamp(v.speed/(ship?3:5),-1,1)*dt;
  const d=direction(v.yaw), before={x:v.x,z:v.z};
  moveGround(w,v,d.x*v.speed*dt,d.z*v.speed*dt,{water:ship});
  const travelled=distance(v,before);
  if(Math.abs(v.speed)>1 && travelled<Math.abs(v.speed)*dt*.25){v.speed*=Math.exp(-8*dt);v.blocked=.9;}
  else v.blocked=Math.max(0,(v.blocked??0)-dt);
}

function aircraft(w,v,dt,i) {
  const throttle=clamp(i.forward??0,-1,1);
  v.throttle=clamp((v.throttle??0)+throttle*dt*.5,0,1);
  v.speed=approach(v.speed,v.throttle*(i.sprint?125:95), (throttle<0?25:18)*dt);
  v.yaw-=clamp(i.right??0,-1,1)*(v.airborne?.7:.45)*dt*clamp(v.speed/15,0,1);
  v.roll=approach(v.roll,-(i.right??0)*.65,dt*1.5);
  // W assists rotation; S brakes without forcing the nose down on approach.
  const targetPitch=clamp((Number.isFinite(i.pitch)?i.pitch:0)+Math.max(0,throttle)*.25,-.65,.65);
  v.pitch=approach(v.pitch,targetPitch,dt*.65);
  if(!v.airborne) {
    const d=direction(v.yaw), old={x:v.x,z:v.z};
    moveGround(w,v,d.x*v.speed*dt,d.z*v.speed*dt);v.y+=.5;
    if(distance(old,v)<v.speed*dt*.3 && v.speed>15){damage(w,v,v.maxHp,1-v.team);return;}
    if(v.speed>=42 && v.pitch>.1){v.airborne=true;v.y+=.1;}
    return;
  }
  const d=direction(v.yaw,v.pitch), old={x:v.x,y:v.y+1,z:v.z};
  v.vy=d.y*v.speed-Math.max(0,38-v.speed)*1.2;
  const next={x:v.x+d.x*v.speed*dt,y:v.y+v.vy*dt,z:v.z+d.z*v.speed*dt};
  const b=w.bounds, floor=Math.max(0,terrainHeight(next.x,next.z))+.5;
  const contact=next.y<=floor;
  if(next.x<b.minX || next.x>b.maxX || next.z<b.minZ || next.z>b.maxZ
    || !clearLine(w,old,{x:next.x,y:Math.max(next.y,floor)+1,z:next.z})) {
    damage(w,v,v.maxHp,1-v.team);return;
  }
  Object.assign(v,next);
  if(contact) {
    if(next.x>205 || v.vy < -7 || Math.abs(v.pitch)>.3 || v.speed>65)damage(w,v,v.maxHp,1-v.team);
    else {v.y=floor;v.airborne=false;v.pitch=0;v.vy=0;v.throttle=0;}
  }
}

export function updateVehicles(w,dt,input={}) {
  if(!Number.isFinite(dt) || dt<=0 || dt>.1)throw Error('dt must be in (0,.1]');
  if(w.winner!==null)return;
  for(const v of w.entities) {
    if(v.kind==='soldier')continue;
    if(!v.alive){v.ai=true;weaponStatus(w,v);continue;}
    let p=getEntity(w,v.occupantId);
    if(p && (!p.alive || p.seatId!==v.id)){v.occupantId=null;p=null;}
    v.ai=!p;
    const human=p?.isPlayer;
    v.aimLimited=false;
    const i=human?input:bot(w,v,dt);
    if(human)v.roleAction='PLAYER';
    if(v.kind==='jet') {
      aircraft(w,v,dt,i);
      const requested=(Number.isFinite(i.pitch)?i.pitch:0)+Math.max(0,clamp(i.forward??0,-1,1))*.25;
      v.aimLimited=Math.abs(requested-v.pitch)>.01;
    } else surface(w,v,dt,i);
    if(!v.alive){weaponStatus(w,v);continue;}
    if(v.roleAction==='HOLD' && Math.abs(v.speed)>.1)v.roleAction='CRUISE';
    if(human && v.kind!=='jet')aim(v,Number.isFinite(i.yaw)?i.yaw:v.aimYaw,Number.isFinite(i.pitch)?i.pitch:0,dt);
    if(i.fire)fire(w,v,{...weapons[v.kind],yaw:v.kind==='jet'?v.yaw:v.aimYaw,pitch:v.kind==='jet'?v.pitch:v.aimPitch});
    if(p)follow(p,v);
    weaponStatus(w,v);
  }
}
