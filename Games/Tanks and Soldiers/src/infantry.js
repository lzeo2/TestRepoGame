import {addEntity, clamp, distance, floorAt, moveGround, clearLine, fire, getEntity, emitEvent} from './core.js';

const MAGAZINE = 30;
const eye = e => ({x:e.x,y:e.y+1.35,z:e.z});

function safeSpot(world, soldier, origin) {
  for (let ring=0; ring<=10; ring++) {
    const count=ring ? 16 : 1;
    for (let i=0; i<count; i++) {
      const angle=i/count*Math.PI*2;
      const probe={...soldier,x:origin.x+Math.cos(angle)*ring*4,z:origin.z+Math.sin(angle)*ring*4};
      if (world.entities.some(e=>e.alive && e.team!==soldier.team && distance(e,probe)<25)) continue;
      if (moveGround(world,probe,0,0)) return probe;
    }
  }
  return null;
}

function resetSoldier(world, e, origin) {
  const spot=safeSpot(world,e,origin);
  if (!spot) return false;
  Object.assign(e,{x:spot.x,y:spot.y,z:spot.z,hp:e.maxHp,ammo:MAGAZINE,alive:true,
    seatId:null,cooldown:0,respawnAt:0,protectedUntil:world.time+3,vy:0,grounded:true,
    reloadUntil:0,jumpHeld:false,path:[],pathGoal:null,repathAt:0,yaw:0,pitch:0,
    action:'DEFEND',goalId:null,targetId:null});
  return true;
}

export function spawnInfantry(world, {perTeam=6}={}) {
  const player=addEntity(world,{kind:'soldier',team:0,isPlayer:true,seatId:null});
  if (!resetSoldier(world,player,world.spawns[0])) throw Error('No safe infantry spawn');
  world.playerId=player.id;
  for (let team=0; team<2; team++) for (let i=0; i<perTeam; i++) {
    const e=addEntity(world,{kind:'soldier',team,ai:true,isPlayer:false,seatId:null,slot:i});
    const spawn=world.spawns[team], objective=world.objectives[i%world.objectives.length];
    const origin=objective ? {x:spawn.x+(objective.x-spawn.x)*.5+(i%3-1)*5,
      z:spawn.z+(objective.z-spawn.z)*.5+Math.floor(i/3)*5} : {x:spawn.x+(i%3-1)*5,z:spawn.z-8-Math.floor(i/3)*5};
    if (!resetSoldier(world,e,origin) && !resetSoldier(world,e,spawn)) {
      e.alive=false; e.hp=0; e.respawnAt=world.time+1;
    }
  }
  return player;
}

export function orderSquad(world,player,objectiveId=null) {
  if (!world || !Array.isArray(world.entities) || !Array.isArray(world.objectives) ||
      !Number.isFinite(world.time) || !player || world.winner!==null || !player.alive || player.kind!=='soldier' ||
      !player.isPlayer || world.playerId!==player.id || !world.entities.includes(player) ||
      (player.team!==0 && player.team!==1)) return false;
  const objective=objectiveId===null
    ? world.objectives.filter(o=>o.owner!==player.team).sort((a,b)=>distance(player,a)-distance(player,b))[0]
    : world.objectives.find(o=>o.id===objectiveId);
  if (!objective) return false;
  const members=world.entities.filter(e=>e.kind==='soldier' && e.ai && !e.isPlayer && e.alive &&
    e.team===player.team && e.seatId==null).sort((a,b)=>distance(player,a)-distance(player,b)||a.id-b.id).slice(0,3);
  if (!members.length) return false;
  for (const e of world.entities) if (e.team===player.team && e.orderObjectiveId!=null) {
    e.orderObjectiveId=null;e.pathGoal=null;e.path=[];
  }
  for (const e of members) {e.orderObjectiveId=objective.id;e.goalId=objective.id;}
  world.squadOrder={team:player.team,objectiveId:objective.id,memberIds:members.map(e=>e.id),issuedAt:world.time};
  emitEvent(world,{type:'order',objectiveId:objective.id,team:player.team,participantIds:[...world.squadOrder.memberIds],
    x:objective.x,y:floorAt(world,objective.x,objective.z),z:objective.z});
  return true;
}

// ponytail: a visibility graph is enough for this static blockout; use a navmesh for large maps.
const navigation=new WeakMap();
function walkLine(world,a,b) {
  if (a.x>205 && floorAt(world,a.x,a.z)<1 || b.x>205 && floorAt(world,b.x,b.z)<1) return false;
  const length=distance(a,b), nx=length ? (b.z-a.z)/length*.65 : 0, nz=length ? (a.x-b.x)/length*.65 : 0;
  return [-1,0,1].every(side=>clearLine(world,
    {x:a.x+nx*side,y:floorAt(world,a.x,a.z)+.8,z:a.z+nz*side},
    {x:b.x+nx*side,y:floorAt(world,b.x,b.z)+.8,z:b.z+nz*side}));
}
function route(world,start,goal) {
  if (walkLine(world,start,goal)) return [{x:goal.x,z:goal.z}];
  let nav=navigation.get(world);
  if (!nav || nav.count!==world.obstacles.length) {
    const nodes=[];
    for (const o of world.obstacles) for (const sx of [-1,1]) for (const sz of [-1,1]) {
      const p={x:o.x+sx*(o.w/2+1.3),z:o.z+sz*(o.d/2+1.3)};
      const probe={...start,...p};
      if (moveGround(world,probe,0,0)) nodes.push(p);
    }
    const edges=nodes.map(()=>[]);
    for (let i=0;i<nodes.length;i++) for (let j=0;j<i;j++) if (walkLine(world,nodes[i],nodes[j])) {
      const cost=distance(nodes[i],nodes[j]); edges[i].push([j,cost]); edges[j].push([i,cost]);
    }
    nav={nodes,edges,count:world.obstacles.length}; navigation.set(world,nav);
  }
  const nodes=[...nav.nodes,{x:start.x,z:start.z},{x:goal.x,z:goal.z}], n=nodes.length;
  const edges=nav.edges.map(e=>[...e]); edges.push([],[]);
  for (const i of [n-2,n-1]) for (let j=0;j<n-2;j++) if (walkLine(world,nodes[i],nodes[j])) {
    const cost=distance(nodes[i],nodes[j]); edges[i].push([j,cost]); edges[j].push([i,cost]);
  }
  const costs=Array(n).fill(Infinity), previous=Array(n).fill(-1), visited=new Set(); costs[n-2]=0;
  for (let k=0;k<n;k++) {
    let u=-1;
    for (let i=0;i<n;i++) if (!visited.has(i) && (u<0 || costs[i]<costs[u])) u=i;
    if (u<0 || !Number.isFinite(costs[u])) break;
    if (u===n-1) {
      const path=[]; for (let v=u;v!==n-2;v=previous[v]) path.unshift(nodes[v]); return path;
    }
    visited.add(u);
    for (const [v,cost] of edges[u]) if (costs[u]+cost<costs[v]) {costs[v]=costs[u]+cost;previous[v]=u;}
  }
  return [];
}

function reload(world,e,requested) {
  if (e.reloadUntil) {
    if (world.time+1e-8>=e.reloadUntil) {e.ammo=MAGAZINE;e.reloadUntil=0;}
  } else if (requested && e.ammo<MAGAZINE) e.reloadUntil=world.time+1.8;
}
function moveSoldier(world,e,dx,dz,dt,jump=false) {
  e.vy??=0;
  e.grounded??=e.y<=floorAt(world,e.x,e.z)+.05;
  let y=e.y;
  if (jump && e.grounded && !e.jumpHeld) {e.vy=7;e.grounded=false;}
  e.jumpHeld=jump;
  moveGround(world,e,dx,dz);
  const floor=e.y;
  if (!e.grounded || y>floor+.05) {
    e.vy-=20*dt; y+=e.vy*dt;
    e.y=Math.max(floor,y);
    e.grounded=e.y<=floor;
    if (e.grounded) e.vy=0;
  }
}
function updatePlayer(world,e,dt,input) {
  e.yaw=Number.isFinite(input.yaw) ? input.yaw : e.yaw;
  e.pitch=Number.isFinite(input.pitch) ? clamp(input.pitch,-1.45,1.45) : e.pitch;
  e.aiming=!!input.aim;
  const f=clamp(input.forward||0,-1,1), r=clamp(input.right||0,-1,1), scale=Math.max(1,Math.hypot(f,r));
  const speed=e.aiming ? 2.7 : input.sprint ? 8.6 : 5.2;
  moveSoldier(world,e,(-Math.sin(e.yaw)*f+Math.cos(e.yaw)*r)/scale*speed*dt,
    (-Math.cos(e.yaw)*f-Math.sin(e.yaw)*r)/scale*speed*dt,dt,!!input.jump);
  reload(world,e,!!input.reload || e.ammo===0);
  if (input.fire && !e.reloadUntil) fire(world,e,{speed:240,damage:25,cooldown:e.aiming?.2:.18});
}
function updateAI(world,e,dt) {
  reload(world,e,e.ammo===0);
  const ordered=world.squadOrder?.team===e.team && world.squadOrder.memberIds.includes(e.id)
    ? world.objectives.find(o=>o.id===e.orderObjectiveId && o.id===world.squadOrder.objectiveId) : null;
  const goals=world.objectives.filter(o=>o.owner!==e.team);
  const choices=goals.length ? goals : world.objectives;
  const goal=ordered ?? (choices.length ? choices[(e.slot??0)%choices.length] : world.spawns[1-e.team]);
  e.goalId=goal.id??null;
  const inside=world.objectives.includes(goal) && distance(e,goal)<=goal.radius;
  e.action=e.reloadUntil ? 'RELOAD' : inside && goal.owner!==e.team && !goal.contested ? 'CAPTURE' : 'DEFEND';
  let target=null, best=160;
  for (const candidate of world.entities) {
    if (!candidate.alive || candidate.team===e.team || candidate.seatId || candidate.protectedUntil>world.time) continue;
    const d=distance(e,candidate);
    if (d<best && clearLine(world,eye(e),{x:candidate.x,y:candidate.y+candidate.height*.6,z:candidate.z})) {target=candidate;best=d;}
  }
  e.targetId=target?.id??null;
  if (target) {
    e.yaw=Math.atan2(e.x-target.x,e.z-target.z);
    e.pitch=Math.atan2(target.y+target.height*.6-(e.y+1.35),best);
    if (!e.reloadUntil) {
      e.action='ENGAGE';
      fire(world,e,{speed:240,damage:20,cooldown:.4});
    }
  }
  const stopping=world.objectives.includes(goal) ? Math.min(10,goal.radius*.4) : 4;
  if (distance(e,goal)>stopping && (!target || best>45 || ordered && !inside)) {
    if (e.pathGoal!==goal || world.time>=e.repathAt || !e.path?.length) {
      e.path=route(world,e,goal);e.pathGoal=goal;e.repathAt=world.time+2;
    }
    while (e.path.length && distance(e,e.path[0])<.7) e.path.shift();
    const waypoint=e.path[0];
    if (waypoint) {
      const d=distance(e,waypoint), step=Math.min(d,3.8*dt);
      const dx=(waypoint.x-e.x)/d, dz=(waypoint.z-e.z)/d;
      if (!target) {e.yaw=Math.atan2(-dx,-dz);e.pitch=0;}
      const x=e.x,z=e.z;
      moveSoldier(world,e,dx*step,dz*step,dt);
      if (Math.hypot(e.x-x,e.z-z)<step*.2) e.repathAt=0;
      else if (!e.reloadUntil && !target) e.action='MOVE';
      return;
    }
  }
  moveSoldier(world,e,0,0,dt);
}

export function updateInfantry(world,dt,input={}) {
  if (!Number.isFinite(dt) || dt<=0 || dt>.1) throw Error('dt must be in (0,.1]');
  if (world.winner!==null) return;
  for (const e of world.entities) {
    if (e.kind!=='soldier') continue;
    if (!e.alive) {
      e.action='DOWN';e.targetId=null;
      if (world.time>=e.respawnAt) {
        if (e.seatId) {const vehicle=getEntity(world,e.seatId);if(vehicle) vehicle.occupantId=null;}
        if (!resetSoldier(world,e,world.spawns[e.team])) e.respawnAt=world.time+.5;
      }
      continue;
    }
    if (e.seatId) {e.targetId=null;e.goalId=null;e.action=e.reloadUntil?'RELOAD':'DEFEND';continue;}
    if (e.id===world.playerId) updatePlayer(world,e,dt,input);
    else updateAI(world,e,dt);
  }
}
