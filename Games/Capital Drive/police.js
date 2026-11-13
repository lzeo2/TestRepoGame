// Directed road pursuit; only dismounted officers use pedestrian collision.
import { createRoutePlanner, roadProfile } from './road-network.js';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const angle = a => Math.atan2(Math.sin(a),Math.cos(a));
export function createPolice(simulation, options = {}) {
  const planner = createRoutePlanner(simulation.graph);
  const routes = new Map();
  let serial = 0, arrest = 0, spawnDelay = 0, lastSeen = { ...simulation.player };
  function report(point) { lastSeen = { x: point.x, z: point.z }; }
  function reset() { routes.clear(); arrest = 0; spawnDelay = 0; report(simulation.player); }
  const lanePoint = (edge,t) => ({ x:edge.from.x+edge.dx*t+edge.dz*edge.laneOffset,
    z:edge.from.z+edge.dz*t-edge.dx*edge.laneOffset,yaw:edge.yaw });
  const publicEdges = simulation.graph.edges.filter(edge => roadProfile(edge.road).trafficAllowed);
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
  function spawn(state,target) {
    const candidates=[];
    for(const edge of publicEdges) {
      if(edge.length<8) continue;
      const t=clamp((target.x-edge.from.x)*edge.dx+(target.z-edge.from.z)*edge.dz,4,edge.length-4);
      for(const position of [t,4,edge.length-4]) {
        const pose=lanePoint(edge,position),d=gap(pose,target);
        if(d>=70 && d<=200) candidates.push({pose,edge,score:Math.abs(d-110)});
      }
    }
    candidates.sort((a,b)=>a.score-b.score || a.edge.id-b.edge.id);
    const id=`police:${serial++}`;
    for(const {pose,edge} of candidates.slice(0,64)) {
      const car={id,...pose,speed:0,active:true,length:4.8,width:1.9};
      if(!simulation.canOccupy(car,{length:car.length,width:car.width}) || state.police.some(p=>gap(p.car||p,car)<12)) continue;
      const tail=planner.findEdges(edge.to,target,{kind:'car'});
      if(!tail.length && gap(edge.to,target)>24) continue;
      routes.set(id,{edges:[edge,...tail],index:0,age:0,goal:{...target},stuck:0,reversing:0,retries:0});
      state.police.push({id,x:car.x,z:car.z,yaw:car.yaw,speed:0,health:100,mode:'vehicle',car,
        seesPlayer:false,searchTime:0,modelId:'relay',color:0xe7e7df});
      return true;
    }
    return false;
  }
  function drive(unit,destination,dt,stop,wanted) {
    const car = unit.car;
    let route = routes.get(unit.id);
    if (!route || (route.age > 2 && (gap(route.goal,destination)>18 || route.stuck>2 || (!route.edges.length && route.age>5)))) {
      const edges = plan(car,destination);
      const retries=(route?.retries || 0)+(route?.stuck>2?1:0);
      route = { edges,index:0,age:0,goal:{...destination},stuck:0,reversing: retries>0?0.65:0,retries }; routes.set(unit.id,route);
    }
    route.age += dt;
    let edge = route.edges[route.index];
    let waypoint;
    if (edge) {
      const along = (car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz;
      if (along > edge.length-3 && route.index<route.edges.length-1) edge=route.edges[++route.index];
      const t = clamp((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz+7,0,edge.length);
      waypoint={x:edge.from.x+edge.dx*t+edge.dz*edge.laneOffset,z:edge.from.z+edge.dz*t-edge.dx*edge.laneOffset};
    }
    // An absent directed route is a stop, never permission to cut across buildings.
    const turn = waypoint ? angle(Math.atan2(-(waypoint.x-car.x),-(waypoint.z-car.z))-car.yaw) : 0;
    let desired = !stop && waypoint ? (12+wanted*2)*Math.max(0.15,1-Math.abs(turn)/1.5) : 0;
    if (gap(car,destination)<18) desired=Math.min(desired,Math.max(0,(gap(car,destination)-7)*0.8));
    if (edge && route.index===route.edges.length-1) {
      const remaining=edge.length-((car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz);
      desired=Math.min(desired,Math.sqrt(Math.max(0,remaining-2)*9));
    }
    if(route.reversing>0) {
      route.reversing=Math.max(0,route.reversing-dt);desired=-1.8;
    }
    car.speed += clamp(desired-car.speed,-7*dt,3.5*dt);
    if (car.speed>0.05) car.yaw += clamp(turn,-1.1*dt,1.1*dt)*Math.min(1,car.speed/2);
    const before={x:car.x,z:car.z};
    simulation.moveVehicle(car,-Math.sin(car.yaw)*car.speed*dt,-Math.cos(car.yaw)*car.speed*dt,{length:car.length,width:car.width});
    const travelled=gap(before,car);
    route.stuck = desired>1 && travelled<0.1*dt ? (route.stuck||0)+dt : Math.max(0,(route.stuck||0)-dt);
    if (travelled<Math.abs(car.speed)*dt*0.3) car.speed*=Math.max(0,1-10*dt);
    Object.assign(unit,{x:car.x,z:car.z,yaw:car.yaw,speed:car.speed});
  }
  function step(dt,state,target) {
    if (state.sandbox || state.wanted<=0) { state.police.length=0; routes.clear(); state.pursuit='clear'; return; }
    spawnDelay=Math.max(0,spawnDelay-dt);
    if(spawnDelay===0) {
      while(state.police.length<Math.min(4,state.wanted+1)) if(!spawn(state,target)) break;
      spawnDelay=1;
    }
    let seen=false,arresting=false;
    for(const unit of state.police) {
      // Accept restored descriptors while keeping one stable car object for rendering/blockers.
      if(!unit.car) unit.car={id:unit.id,x:unit.x,z:unit.z,yaw:unit.yaw,speed:unit.speed||0,active:true,length:4.8,width:1.9};
      unit.mode ||= 'vehicle';
      unit.seesPlayer=unit.health>0 && gap(unit,target)<145 && simulation.hasLineOfSight(unit,target);
      if(unit.health<=0) { unit.speed=0;unit.car.speed=0;continue; }
      if(unit.seesPlayer) { seen=true;report(target);unit.searchTime=0; } else unit.searchTime+=dt;
      const destination=unit.seesPlayer?target:lastSeen;
      if(unit.mode==='vehicle') {
        const dismount=gap(unit.car,destination)<24 && (state.mode==='foot' || Math.abs(target.speed)<2);
        drive(unit,destination,dt,dismount,state.wanted);
        if(dismount && unit.car.speed<0.5) {
          for(const side of [-1,1]) {
            const pose={x:unit.car.x+Math.cos(unit.car.yaw)*2*side,z:unit.car.z-Math.sin(unit.car.yaw)*2*side};
            const result=simulation.moveActor(pose,0,0,0.45);
            if(!result.blocked && simulation.hasLineOfSight(unit.car,pose)) { Object.assign(unit,pose);unit.mode='foot';unit.speed=0;break; }
          }
        }
      } else {
        const reboard=state.mode==='vehicle' && (gap(unit,target)>30 || !unit.seesPlayer);
        let goal=destination;
        if(reboard) {
          const doors=[-1,1].map(side=>({x:unit.car.x+Math.cos(unit.car.yaw)*2*side,
            z:unit.car.z-Math.sin(unit.car.yaw)*2*side}));
          const clear=doors.filter(pose=>!simulation.moveActor({...pose},0,0,0.45).blocked);
          clear.sort((a,b)=>gap(unit,a)-gap(unit,b));goal=clear[0] || doors[0];
        }
        const d=gap(unit,goal),speed=reboard?4.2:5.2;
        if(d>0.7) {
          const before={x:unit.x,z:unit.z},heading=Math.atan2(goal.z-unit.z,goal.x-unit.x);
          let headingUsed=heading;
          const amount=Math.min(d-0.7,speed*dt);
          simulation.moveActor(unit,Math.cos(heading)*amount,Math.sin(heading)*amount,0.45);
          if(gap(before,unit)<amount*0.3) {
            // Try a bounded fan with the same swept pedestrian collider. No wall phasing.
            let best=null,bestScore=-Infinity;
            for(const offset of [0.65,-0.65,1.2,-1.2,1.57,-1.57]) {
              const candidate={...before},direction=heading+offset;
              simulation.moveActor(candidate,Math.cos(direction)*amount,Math.sin(direction)*amount,0.45);
              const travelled=gap(before,candidate),score=travelled-0.15*gap(candidate,goal);
              if(travelled>amount*0.5 && score>bestScore) {best={candidate,direction};bestScore=score;}
            }
            if(best) {unit.x=best.candidate.x;unit.z=best.candidate.z;headingUsed=best.direction;}
          }
          unit.yaw=Math.atan2(-Math.cos(headingUsed),-Math.sin(headingUsed));unit.speed=gap(before,unit)/dt;
        } else unit.speed=0;
        if(reboard && gap(unit,goal)<1.2 && simulation.hasLineOfSight(unit,goal)) {
          unit.mode='vehicle';Object.assign(unit,{x:unit.car.x,z:unit.car.z,yaw:unit.car.yaw,speed:0});routes.delete(unit.id);
        }
      }
      unit.seesPlayer=unit.health>0 && gap(unit,target)<145 && simulation.hasLineOfSight(unit,target);
      if(unit.mode==='foot' && unit.seesPlayer && gap(unit,target)<3.4 && Math.abs(target.speed)<2) arresting=true;
    }
    if(seen) { state.pursuit='pursuit';state.heat=28+state.wanted*9; }
    else { state.pursuit='search';state.heat=Math.max(0,state.heat-dt);if(state.heat<=0) { state.wanted=0;state.pursuit='clear';state.police.length=0;routes.clear();options.onEscape?.(); } }
    arrest=arresting?arrest+dt:Math.max(0,arrest-dt*2);state.arrestProgress=clamp(arrest/3.5,0,1);
    if(arrest>=3.5) { arrest=0;options.onArrest?.(); }
  }
  return {step,reset,report};
}
