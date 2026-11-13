// Directed road pursuit; only dismounted officers use pedestrian collision.
import { createRoutePlanner } from './road-network.js';
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const angle = a => Math.atan2(Math.sin(a),Math.cos(a));
export function createPolice(simulation, options = {}) {
  const planner = createRoutePlanner(simulation.graph);
  const routes = new Map();
  let serial = 0, arrest = 0, lastSeen = { ...simulation.player };
  function report(point) { lastSeen = { x: point.x, z: point.z }; }
  function reset() { routes.clear(); arrest = 0; report(simulation.player); }
  function spawn(state,target) {
    const i = state.police.length, a = i*2.1+0.7;
    const road = simulation.nearestRoad(target.x+Math.cos(a)*110,target.z+Math.sin(a)*110);
    if (!road) return false;
    const id = `police:${serial++}`;
    const car = { id, x:road.x,z:road.z,yaw:road.yaw||0,speed:0,active:true,length:4.8,width:1.9 };
    if (!simulation.canOccupy(car,{length:car.length,width:car.width}) || state.police.some(p => gap(p.car || p,car)<7)) return false;
    state.police.push({ id,x:car.x,z:car.z,yaw:car.yaw,speed:0,health:100,mode:'vehicle',car,
      seesPlayer:false,searchTime:0,modelId:'relay',color:0xe7e7df });
    return true;
  }
  function drive(unit,destination,dt,stop,wanted) {
    const car = unit.car;
    let route = routes.get(unit.id);
    if (!route || (route.age > 2 && gap(route.goal,destination)>18)) {
      const edges = planner.findEdges(car,destination,{kind:'car'});
      route = { edges,index:0,age:0,goal:{...destination} }; routes.set(unit.id,route);
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
    car.speed += clamp(desired-car.speed,-7*dt,3.5*dt);
    if (car.speed>0.05) car.yaw += clamp(turn,-1.1*dt,1.1*dt)*Math.min(1,car.speed/2);
    const before={x:car.x,z:car.z};
    simulation.moveVehicle(car,-Math.sin(car.yaw)*car.speed*dt,-Math.cos(car.yaw)*car.speed*dt,{length:car.length,width:car.width});
    if (gap(before,car)<car.speed*dt*0.3) car.speed=Math.max(0,car.speed-10*dt);
    Object.assign(unit,{x:car.x,z:car.z,yaw:car.yaw,speed:car.speed});
  }
  function step(dt,state,target) {
    if (state.sandbox || state.wanted<=0) { state.police.length=0; routes.clear(); state.pursuit='clear'; return; }
    while(state.police.length<Math.min(4,state.wanted+1)) if(!spawn(state,target)) break;
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
        const goal=reboard?unit.car:destination, d=gap(unit,goal);
        const speed=reboard?4.2:5.2;
        if(d>1.5) {
          const dx=(goal.x-unit.x)/d,dz=(goal.z-unit.z)/d,before={x:unit.x,z:unit.z};
          unit.yaw=Math.atan2(-dx,-dz);simulation.moveActor(unit,dx*Math.min(d-1.5,speed*dt),dz*Math.min(d-1.5,speed*dt),0.45);
          unit.speed=gap(before,unit)/dt;
        } else unit.speed=0;
        if(reboard && d<3) { unit.mode='vehicle';Object.assign(unit,{x:unit.car.x,z:unit.car.z,yaw:unit.car.yaw,speed:0});routes.delete(unit.id); }
      }
      if(unit.mode==='foot' && unit.seesPlayer && gap(unit,target)<3.4 && Math.abs(target.speed)<2) arresting=true;
    }
    if(seen) { state.pursuit='pursuit';state.heat=28+state.wanted*9; }
    else { state.pursuit='search';state.heat=Math.max(0,state.heat-dt);if(state.heat<=0) { state.wanted=0;state.pursuit='clear';state.police.length=0;routes.clear();options.onEscape?.(); } }
    arrest=arresting?arrest+dt:Math.max(0,arrest-dt*2);state.arrestProgress=clamp(arrest/3.5,0,1);
    if(arrest>=3.5) { arrest=0;options.onArrest?.(); }
  }
  return {step,reset,report};
}
