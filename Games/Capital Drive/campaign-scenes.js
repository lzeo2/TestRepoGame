import {roadProfile} from './road-network.js';
// Transient original cast. Campaign remains the sole owner of stages and rewards.
const HEROES = Object.freeze(['student','corporate','basement']);
const EMPTY = Object.freeze([]), RADIUS = .32;
const ALLY_RANGE = 28, ALLY_DAMAGE = 12, ALLY_COOLDOWN = 1.1, SHOT_LIMIT = 4;
const CATCHUP_DISTANCE = 35, STUCK_DISTANCE = 10, STUCK_SECONDS = 3, CATCHUP_RETRY = 1.25;
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const frozenPoint = p => Object.freeze({x:p.x,z:p.z});
const LINES = Object.freeze({
  student: 'Kit: These delivery stickers all carry the same depot code.',
  corporate: 'Rowan: My missing presentation has finally produced useful paperwork.',
  basement: 'Milo: Three receipts. Going outside was suspiciously productive.'
});
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
function projection(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length||1)));
  return {x:a[0]+dx*t,z:a[1]+dz*t,dx:dx/(length||1),dz:dz/(length||1),length,t};
}
export function createCampaignScenes(map, simulation, {entrances=map.interiorEntries||[]}={}) {
  const kingston=map.landmarks?.find(place=>place.id==='kingston');
  const segments=[];
  for(const road of map.roads||[]) {
    if(['private','no'].includes(road.sourceTags?.access)||road.sourceTags?.foot==='no'||!['residential','tertiary','secondary','living_street','service','footway','path','pedestrian'].includes(road.type))continue;
    for(let i=1;i<road.points.length;i++)segments.push({road,a:road.points[i-1],b:road.points[i]});
  }
  // Retain only door metadata here; local retries never scan city roads or doors.
  const doors=new Map(), doorCell=(x,z)=>`${Math.floor(x/8)},${Math.floor(z/8)}`;
  for(const door of entrances)if(point(door)) {
    const key=doorCell(door.x,door.z);
    if(!doors.has(key))doors.set(key,[]);
    doors.get(key).push(door);
  }
  let people=EMPTY, dialogueLines=EMPTY, signature='', elapsed=0, allies=[], events=[], disposed=false, active=false, catchupRetry=0;
  function clear(){people=EMPTY;dialogueLines=EMPTY;signature='';elapsed=0;allies=[];events=[];active=false;catchupRetry=0;}
  function nearDoor(p) {
    const cx=Math.floor(p.x/8),cz=Math.floor(p.z/8);
    for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)
      if((doors.get(`${x},${z}`)||EMPTY).some(door=>gap(p,door)<1.4))return true;
    return false;
  }
  function nearbyLanding(pose,id,index) {
    const yaw=Number.isFinite(pose.yaw)?pose.yaw:0;
    // Three rings, eight directions: a fixed local budget shared by recruitment
    // and catch-up, with enough spacing for cars, the player and both adults.
    const road=simulation.nearestRoad?.(pose.x,pose.z), outer=road?Math.max(6,roadProfile(road.road).driveWidth/2+2):6;
    for(const radius of [2.5,4,outer])for(let i=0;i<8;i++) {
      const angle=yaw+(i+(index===0?0:4))*Math.PI/4;
      const p={x:pose.x+Math.sin(angle)*radius,z:pose.z+Math.cos(angle)*radius,yaw};
      const nearest=simulation.nearestRoad?.(p.x,p.z);
      if(nearest&&!['footway','path','pedestrian','cycleway','steps'].includes(nearest.road.type)&&nearest.distance<roadProfile(nearest.road).driveWidth/2+RADIUS+.15)continue;
      if(nearest)p.sourceRoadId=String(nearest.road.id);
      if(nearDoor(p)||allies.some(other=>other.id!==id&&other.active!==false&&gap(p,other)<1.2)||!clearPosition(p,id))continue;
      let clear=true;
      for(const [dx,dz] of [[.12,0],[-.12,0],[0,.12],[0,-.12]]) {
        const actor={...p,id}, result=simulation.moveActor(actor,dx,dz,RADIUS);
        if(result.blocked||Math.hypot(actor.x-p.x-dx,actor.z-p.z-dz)>1e-6||
          !simulation.canOccupy(actor,{length:1,width:.8,ignorePersonId:id,fromPose:p})){clear=false;break;}
      }
      if(clear)return p;
    }
    return null;
  }
  function relocate(ally,pose,index) {
    const landing=nearbyLanding(pose,ally.id,index);
    if(!landing)return false;
    Object.assign(ally,landing,{speed:0,mode:'following',shot:null,followTime:0,followStartDistance:0,stuck:false});
    events=events.filter(event=>event.actorId!==ally.id);
    return true;
  }
  function publishAllies(hidden=false) {
    people=hidden?EMPTY:Object.freeze(allies.map(person=>Object.freeze({...person,shot:person.shot?Object.freeze({...person.shot}):null})));
  }
  function sight(a,b,ctx={}) {
    const test=typeof ctx.hasLOS==='function'?ctx.hasLOS:simulation.hasLineOfSight;
    return point(a)&&point(b)&&typeof test==='function'&&test(a,b)===true;
  }
  function moveAlly(ally,goal,step) {
    const distance=gap(ally,goal), amount=Math.min(Math.max(0,distance-1.6),3.8*step);
    ally.speed=0;
    if(amount<=0)return;
    const heading=Math.atan2(goal.z-ally.z,goal.x-ally.x), before={...ally};
    let best=null,bestScore=-Infinity;
    // Each local attempt uses the real world sweep, then the indexed swept adult
    // body test. The fixed fan cannot seek or teleport to a distant clear point.
    for(const offset of [0,.65,-.65,1.2,-1.2,1.57,-1.57]) {
      const direction=heading+offset, candidate={...before,yaw:Math.atan2(-Math.cos(direction),-Math.sin(direction))};
      const clipped=clipMovement(candidate,Math.cos(direction)*amount,Math.sin(direction)*amount,.65,allies);
      simulation.moveActor(candidate,clipped.dx,clipped.dz,RADIUS);
      if(!simulation.canOccupy(candidate,{length:1,width:.8,ignorePersonId:ally.id,fromPose:before}))continue;
      const travelled=gap(before,candidate),score=travelled-.2*gap(candidate,goal);
      if(travelled>1e-5&&score>bestScore){best=candidate;bestScore=score;}
      if(offset===0&&travelled>=amount*.95)break;
    }
    if(best){ally.x=best.x;ally.z=best.z;ally.yaw=best.yaw;ally.speed=gap(before,best)/step;}
  }
  function updateAllies(ctx,dt) {
    const mission=ctx.mission, heroes=HEROES.filter(id=>id!==ctx.character&&mission.companions.includes(id)).slice(0,2);
    if(!heroes.length){clear();return;}
    active=!ctx.interior&&!ctx.paused&&Number.isFinite(dt)&&dt>0;
    if(ctx.interior){events=[];publishAllies(true);return;}
    if(!active)return;
    const key=`allies:${mission.id}:${ctx.character}:${heroes.join(':')}`;
    if(signature!==key){clear();signature=key;}
    active=true;
    const step=Math.min(.1,dt);elapsed+=step;catchupRetry=Math.max(0,catchupRetry-step);
    const canRetry=catchupRetry===0;let attemptedCatchup=false;
    if(canRetry&&allies.length<heroes.length) {
      const goal=point(ctx.pose)?ctx.pose:mission.target;
      if(point(goal))for(const hero of heroes) {
        const id=`campaign-ally:${hero}`;
        // A retained downed identity counts as recruited and cannot respawn.
        if(allies.some(ally=>ally.id===id))continue;
        const candidate=nearbyLanding(goal,id,heroes.indexOf(hero));
        if(candidate)allies.push({...candidate,id,appearanceId:`player:${hero}`,radius:RADIUS,active:true,armed:true,health:100,mode:'following',speed:0,gesturePhase:0,cooldown:.3+allies.length*.25,hitPhase:0,shot:null,followTime:0,followStartDistance:0,stuck:false});
        else attemptedCatchup=true;
      }
    }
    const hostiles=(Array.isArray(ctx.hostiles)?ctx.hostiles:[]).slice(0,4);
    for(let index=0;index<allies.length;index++) {
      const ally=allies[index];if(ally.health<=0)continue;
      ally.cooldown=Math.max(0,ally.cooldown-step);ally.hitPhase=Math.max(0,ally.hitPhase-step);ally.gesturePhase=elapsed;
      if(ally.shot){ally.shot.remaining-=step;if(ally.shot.remaining<=0)ally.shot=null;}
      let target=null,distance=ALLY_RANGE;
      for(const hostile of hostiles) {
        if(typeof hostile?.id!=='string'||!hostile.id.startsWith('police:')||hostile.mode!=='foot'||hostile.interiorId||hostile.active===false||!Number.isFinite(hostile.health)||hostile.health<=0||!point(hostile))continue;
        const d=gap(ally,hostile);
        if(d<distance&&sight(ally,hostile,ctx)){target=hostile;distance=d;}
      }
      const playerDistance=point(ctx.pose)?gap(ally,ctx.pose):0;
      if(canRetry&&point(ctx.pose)&&(playerDistance>CATCHUP_DISTANCE||(!target&&ctx.playerMode!=='passenger'&&ctx.playerMode!=='vehicle'&&ally.stuck&&playerDistance>STUCK_DISTANCE))) {
        attemptedCatchup=true;
        if(relocate(ally,ctx.pose,index))continue;
      }
      if(target) {
        ally.followTime=0;ally.stuck=false;
        ally.mode='combat';ally.speed=0;ally.yaw=Math.atan2(-(target.x-ally.x),-(target.z-ally.z));
        if(ally.cooldown===0&&events.length<SHOT_LIMIT) {
          const from=frozenPoint(ally),to=frozenPoint(target);
          events.push(Object.freeze({kind:'ally-shot',type:'ally-shot',actorId:ally.id,targetId:target.id,from,to,damage:ALLY_DAMAGE,range:ALLY_RANGE}));
          ally.shot={from,to,remaining:.12};ally.cooldown=ALLY_COOLDOWN;
        }
      } else {
        ally.mode='following';
        if(point(ctx.pose)&&ctx.playerMode!=='passenger') {
          const yaw=Number.isFinite(ctx.pose.yaw)?ctx.pose.yaw:0,side=index===0?-1:1;
          if(ctx.playerMode!=='vehicle'&&playerDistance>STUCK_DISTANCE) {
            if(ally.followTime===0)ally.followStartDistance=playerDistance;
            ally.followTime=Math.min(STUCK_SECONDS,ally.followTime+step);
            if(ally.followTime>=STUCK_SECONDS) {
              ally.stuck=ally.followStartDistance-playerDistance<1;
              if(!ally.stuck)ally.followTime=0;
            }
          } else {ally.followTime=0;ally.stuck=false;}
          moveAlly(ally,{x:ctx.pose.x+Math.sin(yaw)*2+Math.cos(yaw)*side*1.2,z:ctx.pose.z+Math.cos(yaw)*2-Math.sin(yaw)*side*1.2},step);
        } else {ally.speed=0;ally.followTime=0;ally.stuck=false;}
      }
    }
    if(attemptedCatchup)catchupRetry=CATCHUP_RETRY;
    publishAllies();
  }
  function receiveHit(event) {
    const ally=allies.find(person=>person.id===event?.targetId);
    if(disposed||!active||!ally||ally.health<=0||event?.kind!=='shot'||!point(event.from)||!point(event.to)||!Number.isFinite(event.damage)||event.damage<=0||event.damage>30||gap(event.to,ally)>1||gap(event.from,ally)>60||!sight(event.from,ally))return false;
    ally.health=Math.max(0,ally.health-event.damage);ally.hitPhase=.25;
    if(ally.health===0){ally.mode='down';ally.active=false;ally.armed=false;ally.speed=0;ally.shot=null;}
    publishAllies();return true;
  }
  function candidates(goal) {
    const found=[];
    for(const {road,a,b} of segments) {
      const q=projection(goal.x,goal.z,a,b), pedestrian=['footway','path','pedestrian'].includes(road.type);
      if(q.length<2||Math.hypot(goal.x-q.x,goal.z-q.z)>20)continue;
      for(const along of [0,-2,2,-4,4])for(const side of [-1,1])for(const extra of [1,1.7,2.4]) {
        const offset=pedestrian?0:(road.width||5)/2+extra;
        const x=q.x+q.dx*along-q.dz*offset*side,z=q.z+q.dz*along+q.dx*offset*side;
        if(Math.hypot(x-goal.x,z-goal.z)>Math.min(12,(goal.radius||16)-RADIUS))continue;
        const on=projection(x,z,a,b);
        if(on.t<=.01||on.t>=.99)continue;
        // A source roadside must also avoid the carriageway of crossing roads.
        if(segments.some(segment=>!['footway','path','pedestrian'].includes(segment.road.type)&&Math.hypot(x-projection(x,z,segment.a,segment.b).x,z-projection(x,z,segment.a,segment.b).z)<(segment.road.width||5)/2+RADIUS+.15))continue;
        found.push({x,z,yaw:Math.atan2(goal.x-x,goal.z-z)+Math.PI,sourceRoadId:String(road.id)});
      }
    }
    return found.sort((a,b)=>Math.hypot(a.x-goal.x,a.z-goal.z)-Math.hypot(b.x-goal.x,b.z-goal.z));
  }
  function clearPosition(candidate,id) {
    if(!simulation.canOccupy({...candidate,id},{length:1,width:.8,ignorePersonId:id}))return false;
    // Verify an actual short foot sweep in both directions, using temporary actors only.
    for(const sign of [-1,1]) {
      const actor={...candidate,id}, result=simulation.moveActor(actor,sign*.08,0,RADIUS);
      if(result.blocked||Math.abs(actor.x-candidate.x-sign*.08)>1e-6||Math.abs(actor.z-candidate.z)>1e-6)return false;
    }
    return true;
  }
  // Choose an authored public approach from a source road, never the landmark's
  // schematic centre, which can fall inside an opaque source building.
  let meetingPoint=null;
  if(point(kingston)) {
    const nearby=segments.map(segment=>({...segment,q:projection(kingston.x,kingston.z,segment.a,segment.b)}))
      .filter(({q})=>Math.hypot(q.x-kingston.x,q.z-kingston.z)<60)
      .sort((a,b)=>Math.hypot(a.q.x-kingston.x,a.q.z-kingston.z)-Math.hypot(b.q.x-kingston.x,b.q.z-kingston.z));
    for(const {road,q} of nearby) {
      for(const side of [-1,1]) {
        const offset=(road.width||5)/2+1.2;
        const goal={x:q.x-q.dz*offset*side,z:q.z+q.dx*offset*side,radius:16};
        if(!clearPosition({...goal,yaw:0},'campaign-meeting-approach'))continue;
        const options=candidates(goal), selected=[];
        for(const candidate of options) {
          if(selected.every(other=>Math.hypot(candidate.x-other.x,candidate.z-other.z)>=1.2)&&clearPosition(candidate,'campaign-placement'))selected.push(candidate);
          if(selected.length===2)break;
        }
        if(selected.length>=2){meetingPoint=Object.freeze({x:goal.x,z:goal.z,name:'Kingston public approach'});break;}
      }
      if(meetingPoint)break;
    }
  }
  function update(ctx={},dt=0) {
    const mission=ctx.mission, goal=mission?.target;
    if(disposed)return;
    if(ctx.mode!=='campaign'||ctx.recovery||ctx.recovering||ctx.health<=0||!mission||!HEROES.includes(ctx.character)){clear();return;}
    if(Array.isArray(mission.companions)&&mission.companions.length){updateAllies(ctx,dt);return;}
    if(allies.length)clear();
    if(ctx.mode!=='campaign'||ctx.recovery||ctx.recovering||ctx.interior||mission?.id!=='three-receipts'||mission.stage!==0||!HEROES.includes(ctx.character)||!point(goal)||!point(kingston)||Math.hypot(goal.x-kingston.x,goal.z-kingston.z)>80){clear();return;}
    if(ctx.paused)return;
    const key=`${ctx.character}:${goal.x}:${goal.z}`;
    if(signature!==key) {
      signature=key;elapsed=0;const selected=[];
      for(const hero of HEROES.filter(id=>id!==ctx.character)) {
        const id=`campaign-meeting:${hero}`;
        const candidate=candidates(goal).find(p=>selected.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>=1.2)&&(!point(ctx.pose)||Math.hypot(p.x-ctx.pose.x,p.z-ctx.pose.z)>=1)&&clearPosition(p,id));
        if(candidate)selected.push(Object.freeze({...candidate,id,appearanceId:`player:${hero}`,radius:RADIUS,active:true,gesturePhase:0}));
      }
      people=Object.freeze(selected);dialogueLines=Object.freeze(selected.map(person=>LINES[person.appearanceId.slice(7)]));
    }
    if(!Number.isFinite(dt)||dt<=0)return;
    elapsed+=Math.min(.1,dt);
    people=Object.freeze(people.map(person=>Object.freeze({...person,gesturePhase:elapsed})));
  }
  function clipMovement(actor,dx,dz,radius=.45,contacts=people) {
    if(![actor?.x,actor?.z,dx,dz,radius].every(Number.isFinite))return {dx:0,dz:0,blocked:false};
    const reach=Math.max(0,Math.min(4,radius))+RADIUS+.02;
    let x=actor.x,z=actor.z,rx=dx,rz=dz,blocked=false;
    for(let iteration=0;iteration<4;iteration++) {
      const length2=rx*rx+rz*rz;if(length2<1e-12)break;
      let first=1,hit=null;
      for(const person of contacts) {
        if(person.id===actor.id||person.active===false)continue;
        const ox=x-person.x,oz=z-person.z,dot=ox*rx+oz*rz,c=ox*ox+oz*oz-reach*reach;
        if(dot>=0)continue;
        const discriminant=dot*dot-length2*c;if(discriminant<0)continue;
        const t=c<=0?0:(-dot-Math.sqrt(discriminant))/length2;
        if(t>=0&&t<=first){first=t;hit=person;}
      }
      if(!hit){x+=rx;z+=rz;break;}
      blocked=true;const t=Math.max(0,first-.001/Math.sqrt(length2));
      x+=rx*t;z+=rz*t;rx*=1-t;rz*=1-t;
      const nx=x-hit.x,nz=z-hit.z,length=Math.hypot(nx,nz)||1,inward=(rx*nx+rz*nz)/length;
      if(inward<0){rx-=nx/length*inward;rz-=nz/length*inward;}
    }
    return {dx:x-actor.x,dz:z-actor.z,blocked};
  }
  return {update,clear,clipMovement,meetingPoint,receiveHit,getPeople:()=>people,drainEvents:()=>events.splice(0),dispose(){if(disposed)return;clear();disposed=true;},get people(){return people;},get dialogueLines(){return dialogueLines;}};
}
