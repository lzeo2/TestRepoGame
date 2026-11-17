// Directed road pursuit; only dismounted officers use pedestrian collision.
import { createRoutePlanner, roadProfile } from './road-network.js';
import { createPoliceSupport } from './police-support.js';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const angle = a => Math.atan2(Math.sin(a),Math.cos(a));
export function createPolice(simulation, options = {}) {
  const planner = createRoutePlanner(simulation.graph);
  const support=createPoliceSupport(simulation,options);
  const routes = new Map(), tactics = new Map(), approaches = new Map(), events = [];
  let serial = 0, arrest = 0, spawnDelay = 0, lastSeen = { ...simulation.player };
  const knownRooms = new Set(), wrecks = [];
  const currentInterior = () => options.getInterior?.() || null;
  const resolveInterior = id => id ? (options.resolveInterior?.(id) || (currentInterior()?.id === id ? currentInterior() : null)) : null;
  function remember(point) { lastSeen = { x: point.x, z: point.z }; }
  function report(point) {
    const room = currentInterior();
    support.report(room?.outside||point);
    if (room) {
      knownRooms.add(room.id);
      if(knownRooms.size>5) knownRooms.delete(knownRooms.values().next().value);
      remember(room.outside);
    }
    else remember(point);
  }
  function playerGap(unit,target){const altitude=options.playerAltitude?.();const horizontal=gap(unit,target);return Number.isFinite(altitude)&&altitude>0?Math.hypot(horizontal,altitude):horizontal;}
  function sees(unit,target,room) {
    if (unit.health<=0 || playerGap(unit,target)>=145 || (unit.interiorId || null)!==(room?.id || null)) return false;
    if (unit.interiorId) return !room.safehouse && room.hasLineOfSight(unit,target);
    return simulation.hasLineOfSight(unit,target);
  }
  function separated(pose,unit,state,target,roomId) {
    return !state.police.some(other=>other!==unit && other.health>0 && other.mode==='foot' &&
      (other.interiorId || null)===(roomId || null) && gap(other,pose)<.9) &&
      ((currentInterior()?.id || null)!==(roomId || null) || gap(pose,target)>=.9);
  }
  function transition(unit,room,state,target,entering) {
    const from=entering?room.outside:room.exit, to=entering?room.inside:room.outside;
    if (!from || !to || gap(unit,from)>1.4 || (entering && room.safehouse)) return false;
    const sight=entering?simulation:room, mover=entering?room:simulation;
    if (!sight.hasLineOfSight(unit,from)) return false;
    const pose={...to};
    if (mover.moveActor(pose,0,0,.45)?.blocked || gap(pose,to)>.1 ||
      !separated(pose,unit,state,target,entering?room.id:null)) return false;
    Object.assign(unit,{x:pose.x,z:pose.z,yaw:pose.yaw??unit.yaw,speed:0,interiorId:entering?room.id:null});
    tactics.delete(unit.id); return true;
  }
  function walk(unit,goal,dt,room,state,target,speed=5.2) {
    if(!room) {
      const d=gap(unit,goal);
      if(d<=.7){unit.speed=0;return;}
      const before={x:unit.x,z:unit.z},heading=Math.atan2(goal.z-unit.z,goal.x-unit.x);
      let headingUsed=heading;
      const amount=Math.min(d-.7,speed*dt);
      simulation.moveActor(unit,Math.cos(heading)*amount,Math.sin(heading)*amount,.45);
      if(gap(before,unit)<amount*.3) {
        let best=null,bestScore=-Infinity;
        for(const offset of [.65,-.65,1.2,-1.2,1.57,-1.57]) {
          const candidate={...before},direction=heading+offset;
          simulation.moveActor(candidate,Math.cos(direction)*amount,Math.sin(direction)*amount,.45);
          const travelled=gap(before,candidate),score=travelled-.15*gap(candidate,goal);
          if(travelled>amount*.5 && score>bestScore){best={candidate,direction};bestScore=score;}
        }
        if(best){unit.x=best.candidate.x;unit.z=best.candidate.z;headingUsed=best.direction;}
      }
      unit.yaw=Math.atan2(-Math.cos(headingUsed),-Math.sin(headingUsed));unit.speed=gap(before,unit)/dt;
      return;
    }
    const waypoint=room.nextWaypoint(unit,goal,unit.id);
    if (!waypoint) {unit.speed=0;return;}
    const d=gap(unit,waypoint), before={x:unit.x,z:unit.z};
    const stopping=.08;
    if(d<=stopping){unit.speed=0;return;}
    const heading=Math.atan2(waypoint.z-unit.z,waypoint.x-unit.x),amount=Math.min(d-stopping,speed*dt);
    const mover=room;
    let best=null,bestScore=-Infinity;
    for(const offset of [0,.65,-.65,1.2,-1.2,1.57,-1.57]) {
      const candidate={...before},direction=heading+offset;
      mover.moveActor(candidate,Math.cos(direction)*amount,Math.sin(direction)*amount,.45);
      if(!separated(candidate,unit,state,target,room.id)) continue;
      const travelled=gap(before,candidate),score=travelled-.15*gap(candidate,waypoint);
      if(travelled>amount*.3 && score>bestScore) {best={candidate,direction};bestScore=score;}
      if(offset===0 && travelled>=amount*.9) break;
    }
    if(best) {unit.x=best.candidate.x;unit.z=best.candidate.z;unit.yaw=Math.atan2(-Math.cos(best.direction),-Math.sin(best.direction));}
    unit.speed=gap(before,unit)/dt;
  }
  function approachWaypoint(unit,room) {
    const points=Array.isArray(room.approach)?room.approach:[];
    if(!points.length) return room.outside;
    let path=approaches.get(unit.id);
    if(!path || path.roomId!==room.id) {
      path={roomId:room.id,index:0};approaches.set(unit.id,path);
      // A clear swept shortcut may join a later corridor segment. LOS alone
      // cannot authorize skipping the source gate or a narrow body obstruction.
      for(let i=Math.min(points.length,12)-1;i>0;i--) {
        const point=points[i],probe={x:unit.x,z:unit.z};
        if(!simulation.hasLineOfSight(unit,point)) continue;
        const result=simulation.moveActor(probe,point.x-unit.x,point.z-unit.z,.45);
        if(!result.blocked && gap(probe,point)<.1){path.index=i;break;}
      }
    }
    while(path.index<points.length && gap(unit,points[path.index])<1.05) path.index++;
    return points[path.index] || room.outside;
  }
  function roomRoadArrival(unit,room) {
    if(!room || room.safehouse || gap(unit.car,room.outside)>90) return false;
    const route=routes.get(unit.id);
    if(!route) return false;
    const edge=route.edges[route.index];
    const atEnd=edge && route.index===route.edges.length-1 &&
      edge.length-((unit.car.x-edge.from.x)*edge.dx+(unit.car.z-edge.from.z)*edge.dz)<=8;
    return atEnd || route.stuck>.75 || (!edge && route.age>.75);
  }
  let checkpointDelay=0;
  function reset({ clearWrecks = false } = {}) {
    if (clearWrecks) wrecks.length = 0; support.reset(); checkpointDelay=0; approaches.clear(); routes.clear(); tactics.clear(); events.length=0; knownRooms.clear(); arrest = 0; spawnDelay = 0; remember(simulation.player); }
  const lanePoint = (edge,t) => ({ x:edge.from.x+edge.dx*t+edge.dz*edge.laneOffset,
    z:edge.from.z+edge.dz*t-edge.dx*edge.laneOffset,yaw:edge.yaw });
  const publicEdges = simulation.graph.edges.filter(edge => roadProfile(edge.road).trafficAllowed);
  const majorEdges = new Set(publicEdges.filter(edge => roadProfile(edge.road).major));
  function damageVehicle(state, id, amount) {
    const unit = state.police.find(item => item.car?.id === id);
    const car = unit?.car;
    if (!car || car.active === false || car.health === 0 || !Number.isFinite(amount) || amount <= 0) return false;
    car.health = Math.max(0, (car.health ?? 100) - amount);
    if (car.health === 0) { car.modelId ||= 'relay'; car.color ??= 0x416c97; car.speed = unit.speed = 0; if (!wrecks.includes(car)) wrecks.push(car); routes.delete(unit.id); tactics.delete(unit.id); }
    return true;
  }
  function plan(car,destination) {
    let best=null,score=Infinity;
    for(const edge of publicEdges) {
      const t=clamp((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz,0,edge.length);
      const point=lanePoint(edge,t),cost=gap(car,point)+Math.abs(angle(edge.yaw-car.yaw))*8;
      if(cost<score) { best=edge;score=cost; }
    }
    if(!best || score>30) return [];
    const tail=planner.findEdges(best.to,destination,{kind:'car'});
    return [best,...tail];
  }
  function spawn(state,target,checkpoint=false) {
    const candidates=[];
    for(const edge of publicEdges) {
      if(edge.length<8) continue;
      const t=clamp((target.x-edge.from.x)*edge.dx+(target.z-edge.from.z)*edge.dz,4,edge.length-4);
      for(const position of [t,4,edge.length-4]) {
        const pose=lanePoint(edge,position),d=gap(pose,target);
        const ahead=(pose.x-target.x)*-Math.sin(target.yaw||0)+(pose.z-target.z)*-Math.cos(target.yaw||0);
        if(checkpoint ? d>=150&&d<=260&&ahead>=150 : d>=70&&d<=200) candidates.push({pose,edge,score:Math.abs(d-(checkpoint?180:110))});
      }
    }
    candidates.sort((a,b)=>a.score-b.score || a.edge.id-b.edge.id);
    const id=`police:${serial++}`;
    for(const {pose,edge} of candidates.slice(0,64)) {
      const car={id,...pose,yaw:pose.yaw+(checkpoint?Math.PI/2:0),speed:0,active:true,length:4.8,width:1.9};
      if(!simulation.canOccupy(car,{length:car.length,width:car.width}) || state.police.some(p=>gap(p.car||p,car)<12)) continue;
      const tail=planner.findEdges(edge.to,target,{kind:'car'});
      if(!tail.length && gap(edge.to,target)>24) continue;
      routes.set(id,{edges:[edge,...tail],index:0,age:0,goal:{...target},stuck:0,reversing:0,retries:0});
      const swat=state.wanted>=5;
      state.police.push({id,x:car.x,z:car.z,yaw:car.yaw,speed:0,health:swat?150:100,armour:swat,role:swat?'swat':'patrol',checkpointRemaining:checkpoint?20:0,mode:'vehicle',car,
        interiorId:null,seesPlayer:false,searchTime:0,modelId:'relay',color:0xe7e7df});
      return true;
    }
    return false;
  }
  function drive(unit,destination,dt,stop,wanted,intercept=false) {
    const car = unit.car;
    let route = routes.get(unit.id);
    if (!route || (route.age > 2 && (gap(route.goal,destination)>18 || route.stuck>2 || (!route.edges.length && route.age>5)))) {
      const edges = plan(car,destination);
      const retries=(route?.retries || 0)+(route?.stuck>2?1:0);
      route = { edges,index:0,age:0,goal:{...destination},stuck:0,reversing: retries>0?0.65:0,retries }; routes.set(unit.id,route);
    }
    route.age += dt;
    unit.drivingRole=intercept?'interceptor':'patrol';
    let edge = route.edges[route.index];
    let waypoint;
    if (edge) {
      const along = (car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz;
      if (along > edge.length-3 && route.index<route.edges.length-1) edge=route.edges[++route.index];
      const t = clamp((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz+(intercept?clamp(car.speed*.35,7,16):7),0,edge.length);
      waypoint={x:edge.from.x+edge.dx*t+edge.dz*edge.laneOffset,z:edge.from.z+edge.dz*t-edge.dx*edge.laneOffset};
    }
    // An absent directed route is a stop, never permission to cut across buildings.
    const turn = waypoint ? angle(Math.atan2(-(waypoint.x-car.x),-(waypoint.z-car.z))-car.yaw) : 0;
    let desired = !stop && waypoint ? (12+wanted*2)*Math.max(0.15,1-Math.abs(turn)/1.5) : 0;
    if(intercept && !stop && waypoint) {
      // Only a visible moving driver supplies speed. Search memory has no velocity.
      const major=majorEdges.has(edge);
      const ceiling=major?22+wanted*4:Math.min(30,20+wanted*2);
      const cruise=clamp(Math.abs(destination.speed||0)+8,26,ceiling);
      desired=cruise*Math.max(.15,1-Math.abs(turn)/1.2);
      // Brake before connected bends, rather than discovering them at the junction.
      // Eight cached edges bound this work independently of route/city size.
      let distance=0;
      for(let i=route.index;i<Math.min(route.edges.length-1,route.index+8);i++) {
        const current=route.edges[i],next=route.edges[i+1];
        distance+=i===route.index?Math.max(0,current.length-((car.x-current.from.x)*current.dx+(car.z-current.from.z)*current.dz)):current.length;
        if(distance>180) break;
        const bend=Math.abs(angle(next.yaw-current.yaw));
        if(bend>.15) {
          const corner=clamp(3.5/Math.max(.15,bend),3.5,18);
          desired=Math.min(desired,Math.sqrt(corner*corner+2*10*Math.max(0,distance-7)));
        }
      }
    }
    if (gap(car,destination)<18) desired=Math.min(desired,Math.max(0,(gap(car,destination)-7)*0.8));
    if (edge && route.index===route.edges.length-1) {
      const remaining=edge.length-((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz);
      desired=Math.min(desired,Math.sqrt(Math.max(0,remaining-2)*9));
    }
    if(route.reversing>0) {
      route.reversing=Math.max(0,route.reversing-dt);desired=-1.8;
    }
    car.speed += clamp(desired-car.speed,-(intercept?12:7)*dt,(intercept?8.5:3.5)*dt);
    if (car.speed>0.05) {
      const next={...car,yaw:car.yaw+clamp(turn,-1.1*dt,1.1*dt)*Math.min(1,car.speed/2)};
      if(simulation.canOccupy(next,{length:car.length,width:car.width,ignoreId:car.id,fromPose:car})) car.yaw=next.yaw;
    }
    const before={x:car.x,z:car.z};
    simulation.moveVehicle(car,-Math.sin(car.yaw)*car.speed*dt,-Math.cos(car.yaw)*car.speed*dt,{length:car.length,width:car.width});
    const travelled=gap(before,car);
    route.stuck = desired>1 && travelled<0.1*dt ? (route.stuck||0)+dt : Math.max(0,(route.stuck||0)-dt);
    if (travelled<Math.abs(car.speed)*dt*0.3) car.speed*=Math.max(0,1-10*dt);
    Object.assign(unit,{x:car.x,z:car.z,yaw:car.yaw,speed:car.speed});
  }
  function boardingDoor(unit) {
    if(unit.car.active===false || unit.car.health===0 || gap(unit,unit.car)>65 || !simulation.canOccupy(unit.car,
      {length:unit.car.length,width:unit.car.width,ignoreId:unit.car.id})) return null;
    const doors=[-1,1].map(side=>({x:unit.car.x+Math.cos(unit.car.yaw)*2*side,
      z:unit.car.z-Math.sin(unit.car.yaw)*2*side}));
    return doors.filter(pose=>!simulation.moveActor({...pose},0,0,0.45).blocked &&
      simulation.hasLineOfSight(unit.car,pose) && simulation.hasLineOfSight(unit,pose))
      .sort((a,b)=>gap(unit,a)-gap(unit,b))[0] || null;
  }
  function returnDecision(unit,destination,state,dt) {
    let decision=tactics.get(unit.id);
    if(decision) decision.age+=dt;
    // Route searches are bounded to once a second per officer, including refusals.
    if(decision && decision.age<1) return decision;
    const previous=decision;
    decision={age:0,door:null,edges:[],footETA:Infinity,carETA:Infinity};tactics.set(unit.id,decision);
    const chaseDistance=gap(unit,destination);
    // Visible motion matters: a sprinting fugitive may never be caught on foot.
    // Search memory has no velocity; missing headings never invent motion.
    const movingFoot=state.mode==='foot' && Number.isFinite(destination.yaw) && Number.isFinite(destination.speed);
    const away=movingFoot && chaseDistance>.01 ?
      (-Math.sin(destination.yaw)*(destination.x-unit.x)-Math.cos(destination.yaw)*(destination.z-unit.z))*
        Math.max(0,destination.speed)/chaseDistance : 0;
    const closingSpeed=5.2-away;
    decision.footETA=closingSpeed>.3?chaseDistance/closingSpeed:Infinity;
    if(chaseDistance<(closingSpeed>.3?35:8) || (state.mode==='foot' && Math.abs(destination.speed||0)<3) ||
      (routes.get(unit.id)?.stuck||0)>1) return decision;
    const door=boardingDoor(unit);
    if(!door) return decision;
    const car=unit.car, probe={...car,x:car.x-Math.sin(car.yaw)*2,z:car.z-Math.cos(car.yaw)*2};
    if(!simulation.canOccupy(probe,{length:car.length,width:car.width,ignoreId:car.id,fromPose:car})) return decision;
    const edges=plan(car,destination);
    if(!edges.length) return decision;
    let travelled=0, bestDistance=Infinity, driveDistance=Infinity, arrival=null;
    for(let index=0;index<edges.length;index++) {
      const edge=edges[index];
      const start=index===0?clamp((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz,0,edge.length):0;
      const along=clamp((destination.x-edge.from.x)*edge.dx+(destination.z-edge.from.z)*edge.dz,start,edge.length);
      const point=lanePoint(edge,along), d=gap(point,destination);
      if(d<bestDistance) {bestDistance=d;driveDistance=travelled+along-start;arrival=point;}
      travelled+=edge.length-start;
    }
    if(bestDistance>26 || !simulation.hasLineOfSight(arrival,destination)) return decision;
    // Walk to the real door, accelerate/drive, then stop and step out again.
    const driveSpeed=Math.min(16,12+state.wanted*2), driveClosing=driveSpeed-Math.max(0,away);
    if(driveClosing<=.3) return decision;
    const returnDelay=gap(unit,door)/4.2+bestDistance/5.2+4;
    decision.carETA=returnDelay+(driveDistance+Math.max(0,away)*returnDelay)/driveClosing;
    const margin=previous?.door?2:Math.max(3,Number.isFinite(decision.footETA)?decision.footETA*.18:3);
    if(decision.carETA+margin<decision.footETA) {decision.door=door;decision.edges=edges;}
    return decision;
  }
  function fire(unit,state,target,dt,returning,room) {
    unit.shotTimer=Math.max(0,(unit.shotTimer||0)-dt);
    unit.fireCooldown=Math.max(0,(unit.fireCooldown??0.6)-dt);
    unit.aiming=false;unit.aimTarget=null;
    if(unit.mode!=='foot' || returning || unit.health<=0) return;
    const playerRoomId=room?.id||null;
    room=unit.interiorId?resolveInterior(unit.interiorId):null;
    if(unit.interiorId&&(!room||room.safehouse))return;
    const playerThreat=state.wanted>=3 || (state.weapon && state.weapon!=='unarmed' && (state.aiming || state.attackTimer>0));
    const candidates=[];
    if(playerThreat && state.health!==0 && (unit.interiorId || null)===playerRoomId && !room?.safehouse) candidates.push({...target,id:'player'});
    for(const ally of options.getAllies?.() || []) if((unit.interiorId||null)===(ally.interiorId||null) && !room?.safehouse && (state.wanted>=3 || ally.mode==='combat' || ally.shot?.remaining>0) && ally.active!==false && ally.health>0 && ally.armed &&
      Number.isFinite(ally.x) && Number.isFinite(ally.z)) candidates.push(ally);
    const victim=candidates.filter(person=>(person.id==='player'?playerGap(unit,person):gap(unit,person))<=52 && (unit.interiorId ? room?.hasLineOfSight(unit,person) : simulation.hasLineOfSight(unit,person)))
      .sort((a,b)=>gap(unit,a)-gap(unit,b))[0];
    if(!victim) return;
    unit.aiming=true;unit.aimTarget={x:victim.x,z:victim.z};
    unit.yaw=Math.atan2(-(victim.x-unit.x),-(victim.z-unit.z));
    if(unit.fireCooldown>0) return;
    unit.fireCooldown=unit.armour?.75:1.1;
    const base=point=>Number.isFinite(point.feetY)?point.feetY:Number.isFinite(point.y)?point.y:
      unit.interiorId&&Number.isFinite(room?.floorY)?room.floorY:options.heightAt?.(point.x,point.z)||0;
    const ground=unit.interiorId&&Number.isFinite(room?.floorY)?room.floorY:options.heightAt?.(unit.x,unit.z)||0;
    const from={x:unit.x,y:ground+1.35,z:unit.z,interiorId:unit.interiorId||null};
    const altitude=victim.id==='player'&&!Number.isFinite(victim.y)&&!Number.isFinite(victim.feetY)?Math.max(0,options.playerAltitude?.()||0):0;
    const to={...victim,y:base(victim)+1.2+altitude,interiorId:unit.interiorId||null};
    if(options.shotClear?.(from,to,{unit,state,room,interiorId:unit.interiorId||null,playerAltitude:altitude})===false)return;
    unit.shotTimer=.13;
    events.push({kind:'shot',interiorId:unit.interiorId || null,officerId:unit.id,targetId:victim.id,from,to,damage:unit.armour?12:9});
    if(events.length>16) events.splice(0,events.length-16);
  }
  function step(dt,state,target) {
    if(!Number.isFinite(dt) || dt<=0) return;
    dt=Math.min(dt,.05);
    if (state.sandbox || state.wanted<=0) { reset();state.police.length=0;state.offencePressure=0; state.pursuit='clear'; return; }
    const room=currentInterior();
    const entry=room && (room.known || knownRooms.has(room.id)) ? room : null;
    const outsideTarget=entry?.outside || lastSeen;
    spawnDelay=Math.max(0,spawnDelay-dt);
    checkpointDelay=Math.max(0,checkpointDelay-dt);
    if(spawnDelay===0) {
      for (let i = wrecks.length - 1; i >= 0; i--) if (gap(wrecks[i],target) > 850 && !state.police.some(unit=>unit.car===wrecks[i])) wrecks.splice(i,1);
      const cap=Math.max(0,Math.min(6,state.wanted+1)-wrecks.filter(car=>!state.police.some(unit=>unit.car===car)).length);
      if(state.wanted>=4&&!room&&checkpointDelay===0){
        for(let i=state.police.filter(unit=>unit.checkpointRemaining>0).length;i<2&&state.police.length<cap;i++)if(!spawn(state,target,true))break;
        checkpointDelay=30;
      }
      while(state.police.length<cap) if(!spawn(state,room?outsideTarget:target)) break;
      spawnDelay=1;
    }
    let seen=support.step(dt,state,target,room),arresting=false;
    if(seen)remember(target);
    for(const unit of state.police) {
      // Accept restored descriptors while keeping one stable car object for rendering/blockers.
      if(!unit.car) unit.car={id:unit.id,x:unit.x,z:unit.z,yaw:unit.yaw,speed:unit.speed||0,active:true,length:4.8,width:1.9};
      unit.mode ||= 'vehicle';
      unit.interiorId ||= null;
      unit.seesPlayer=sees(unit,target,room);
      if(unit.health<=0) { unit.speed=0;unit.car.speed=0;continue; }
      if(state.wanted>=5&&unit.role!=='swat'){unit.role='swat';unit.armour=true;unit.health=Math.min(150,unit.health+50);}
      if(unit.seesPlayer) { seen=true;remember(room?room.outside:target);unit.searchTime=0; } else unit.searchTime+=dt;
      if(unit.checkpointRemaining>0 && unit.car.health!==0){unit.checkpointRemaining=Math.max(0,unit.checkpointRemaining-dt);unit.car.speed=unit.speed=0;continue;}
      const destination=room?outsideTarget:(unit.seesPlayer?target:lastSeen);
      let returning=false;
      if(unit.mode==='vehicle') {
        let dismount=unit.car.health===0 || (gap(unit.car,destination)<24 && (state.mode==='foot' || Math.abs(target.speed)<2)) || roomRoadArrival(unit,entry);
        if (unit.car.health !== 0) drive(unit,destination,dt,dismount,state.wanted,state.wanted>=3 && state.mode==='vehicle' && !room && (!unit.seesPlayer || Math.abs(target.speed)>=12));
        else unit.car.speed = unit.speed = 0;
        dismount ||= roomRoadArrival(unit,entry);
        if(dismount && Math.abs(unit.car.speed)<0.5) {
          for(const side of [-1,1]) {
            const pose={x:unit.car.x+Math.cos(unit.car.yaw)*2*side,z:unit.car.z-Math.sin(unit.car.yaw)*2*side};
            const result=simulation.moveActor(pose,0,0,0.45);
            if(!result.blocked && simulation.hasLineOfSight(unit.car,pose) && separated(pose,unit,state,target,null)) { Object.assign(unit,pose);unit.mode='foot';unit.speed=0;break; }
          }
        }
      } else if(unit.interiorId) {
        const occupied=resolveInterior(unit.interiorId);
        if(occupied && !occupied.safehouse) {
          const pursuing=room?.id===occupied.id && occupied.playerInside!==false;
          walk(unit,pursuing?target:occupied.exit,dt,occupied,state,target);
          if(!pursuing) transition(unit,occupied,state,target,false);
        } else unit.speed=0;
      } else {
        const decision=room?{door:null}:returnDecision(unit,unit.seesPlayer?destination:{...destination,speed:0},state,dt);
        const door=decision.door && boardingDoor(unit);
        const reboard=!!door;returning=reboard;
        const goal=door || (entry && !entry.safehouse ? approachWaypoint(unit,entry) : destination);
        walk(unit,goal,dt,null,state,target,reboard?4.2:5.2);
        if(entry && !entry.safehouse) transition(unit,entry,state,target,true);
        if(reboard && gap(unit,goal)<1.2 && simulation.hasLineOfSight(unit,goal)) {
          unit.mode='vehicle';Object.assign(unit,{x:unit.car.x,z:unit.car.z,yaw:unit.car.yaw,speed:0});routes.set(unit.id,{edges:decision.edges,index:0,age:0,goal:{...destination},stuck:0,reversing:0,retries:0});tactics.delete(unit.id);
        }
      }
      fire(unit,state,target,dt,returning,room);
      unit.seesPlayer=sees(unit,target,room);
      if(unit.mode==='foot' && unit.seesPlayer && playerGap(unit,target)<3.4 && Math.abs(target.speed)<2) arresting=true;
    }
    if(seen) { state.pursuit='pursuit';state.heat=28+state.wanted*9; }
    else { state.pursuit='search';state.heat=Math.max(0,state.heat-dt);if(state.heat<=0) { state.wanted=0;state.offencePressure=0;state.pursuit='clear';state.police.length=0;reset();options.onEscape?.(); } }
    arrest=arresting?arrest+dt:Math.max(0,arrest-dt*2);state.arrestProgress=clamp(arrest/3.5,0,1);
    if(arrest>=3.5) { arrest=0;options.onArrest?.(); }
  }
  return {step,reset,report,damageVehicle,get wrecks(){return [...wrecks];},support:()=>support.snapshot(),drainEvents:()=>events.splice(0)};
}
