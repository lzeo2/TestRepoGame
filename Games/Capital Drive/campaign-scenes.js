import {roadProfile} from './road-network.js';
import {CAPITAL_BY_ID as BY_ID} from '../../assets/car-arcade/fleet.js';
import {pickupBedAnchor} from '../../assets/car-arcade/models.js';
import {createInteriorNavigation} from './interior-navigation.js';
// Transient original cast. Campaign remains the sole owner of stages and rewards.
const HEROES = Object.freeze(['student','corporate','basement']);
const HIRED = Object.freeze({'merc-river':'player:corporate','merc-stone':'player:basement'});
const renewalSerial = (ctx,id) => Number.isSafeInteger(ctx.rehireSerial?.[id])&&ctx.rehireSerial[id]>=0?ctx.rehireSerial[id]:0;
const suppliedHiredHealth = (ctx,id) => {
  const value=typeof ctx.hiredHealth==='function'?ctx.hiredHealth(id):ctx.hiredHealth?.[id];
  return Number.isFinite(value)&&value>=0&&value<=100?value:100;
};
const hiredRoster = ctx => [...new Set((Array.isArray(ctx.hiredMembers)?ctx.hiredMembers:[]).map(member=>member?.id).filter(id=>Object.hasOwn(HIRED,id)))].slice(0,2);
const EMPTY = Object.freeze([]), RADIUS = .32;
const ALLY_RANGE = 28, ALLY_DAMAGE = 12, ALLY_COOLDOWN = 1.1, SHOT_LIMIT = 4;
const CATCHUP_DISTANCE = 28, STUCK_DISTANCE = 6, STUCK_SECONDS = 3, CATCHUP_RETRY = 1.25;
const REAR_ANGLES = [Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,0,5*Math.PI/12,-5*Math.PI/12];
const ARRIVAL_ANGLES = [...REAR_ANGLES,Math.PI];
const SEAT_RETRY = .5, BOARD_RANGE = 8, SEAT_PATH_LIMIT = 9;
export function campaignPassengerCapacity(modelId) {
  const model=BY_ID[modelId];
  return !model?0:model.style==='sport'||['parcel','dockside','atlas'].includes(modelId)?1:2;
}
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const frozenPoint = p => Object.freeze({x:p.x,z:p.z,...(p.interiorId?{interiorId:p.interiorId}:{})});
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
  const attachments=new Map(), seatRetries=new Map(), leaders=new Map();
  const seatFailures=new Map();
  const decaySeatRetry=id=>{const failures=(seatFailures.get(id)||0)+1;seatFailures.set(id,failures);seatRetries.set(id,Math.max(.12,SEAT_RETRY/failures));};
  let crewRoom=null;
  const hiredHistory=new Map();
  function clear(){people=EMPTY;dialogueLines=EMPTY;signature='';elapsed=0;allies=[];events=[];active=false;catchupRetry=0;crewRoom=null;attachments.clear();seatRetries.clear();seatFailures.clear();leaders.clear();}
  function enterInterior(plan,entry,outside) {
    if(!plan?.id||entry?.id!==plan.id||!point(entry)||!point(outside)||!point(plan.spawn)||!point(plan.exit))return false;
    if(crewRoom&&crewRoom.plan.id!==plan.id&&allies.some(ally=>ally.interiorId===crewRoom.plan.id&&ally.health>0))return false;
    if(crewRoom?.plan.id===plan.id){crewRoom.entering=true;return true;}
    crewRoom={plan,entry:{...entry},outside:{...outside},nav:createInteriorNavigation(plan),entering:true};return true;
  }
  function leaveInterior(){if(crewRoom)crewRoom.entering=false;}
  function roomLanding(ally,goal,index,ctx) {
    if(!crewRoom)return null;
    for(const radius of [1.2,2,3])for(let i=0;i<8;i++) {
      const angle=(i+index*4)*Math.PI/4,p={x:goal.x+Math.cos(angle)*radius,z:goal.z+Math.sin(angle)*radius,yaw:goal.yaw||0};
      if(crewRoom.nav.canOccupy(p,RADIUS)&&(!point(ctx.pose)||gap(p,ctx.pose)>.9)&&
        !allies.some(other=>other!==ally&&other.interiorId===crewRoom.plan.id&&other.health>0&&gap(p,other)<1.1))return p;
    }
    return null;
  }
  function moveRoomAlly(ally,goal,step,stopping=1.6) {
    const distance=gap(ally,goal),amount=Math.min(Math.max(0,distance-stopping),3.8*step);ally.speed=0;
    if(amount<=0)return;
    const next=crewRoom.nav.nextWaypoint(ally,goal,ally.id);if(!next)return;
    const d=gap(ally,next);if(d<1e-8)return;
    const before={x:ally.x,z:ally.z},clipped=clipMovement(ally,(next.x-ally.x)/d*Math.min(amount,d),(next.z-ally.z)/d*Math.min(amount,d),RADIUS,allies);
    crewRoom.nav.moveActor(ally,clipped.dx,clipped.dz,RADIUS);ally.speed=gap(before,ally)/step;
    if(ally.speed>0)ally.yaw=Math.atan2(-(ally.x-before.x),-(ally.z-before.z));
  }
  function transitionRoom(ally,ctx,step,index,canRetry) {
    const room=crewRoom;if(!room)return false;
    if(ally.interiorId===room.plan.id) {
      if(room.entering)return false;
      moveRoomAlly(ally,room.plan.exit,step,.35);
      if(gap(ally,room.plan.exit)<=.7&&canRetry) {
        const landing=nearbyLanding(room.outside,ally.id,index);
        if(landing){Object.assign(ally,landing,{interiorId:null,floorY:null,followTime:0,stuck:false});clearShots(ally);}
      }
      return true;
    }
    if(!room.entering||ally.seated||ally.bedRider)return false;
    const distance=gap(ally,room.entry);
    if(distance>1.4&&!(canRetry&&(distance>CATCHUP_DISTANCE||ally.stuck))) {
      if(!ally.followTime)ally.followStartDistance=distance;
      ally.followTime=Math.min(STUCK_SECONDS,ally.followTime+step);
      if(ally.followTime>=STUCK_SECONDS)ally.stuck=ally.followStartDistance-distance<1;
      moveAlly(ally,room.entry,step,.7);return true;
    }
    if(canRetry&&(distance<=1.4&&sight(ally,room.outside)||distance>CATCHUP_DISTANCE||ally.stuck)) {
      const landing=roomLanding(ally,room.plan.spawn,index,ctx);
      if(landing){Object.assign(ally,landing,{interiorId:room.plan.id,floorY:room.plan.floorY,speed:0,followTime:0,stuck:false});clearShots(ally);}
    }
    return true;
  }
  function nearDoor(p) {
    const cx=Math.floor(p.x/8),cz=Math.floor(p.z/8);
    for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)
      if((doors.get(`${x},${z}`)||EMPTY).some(door=>gap(p,door)<1.4))return true;
    return false;
  }
  function nearbyLanding(pose,id,index,{behind=false}={}) {
    const yaw=Number.isFinite(pose.yaw)?pose.yaw:0;
    // Alternate shoulders so the crew have distinct landing positions. Catch-up
    // stays in the rear half-plane, even when the nearest position is blocked.
    const side=index%2===0?-1:1,angles=behind?REAR_ANGLES:ARRIVAL_ANGLES;
    const road=simulation.nearestRoad?.(pose.x,pose.z), outer=road?Math.max(6,roadProfile(road.road).driveWidth/2+2):6;
    for(const radius of [2.5,4,outer])for(const offset of angles) {
      const angle=yaw+side*offset;
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
    const landing=nearbyLanding(pose,ally.id,index,{behind:true});
    if(!landing)return false;
    Object.assign(ally,landing,{speed:0,mode:'following',shot:null,followTime:0,followStartDistance:0,stuck:false});
    events=events.filter(event=>event.actorId!==ally.id);
    return true;
  }
  function publishAllies(hidden=false) {
    people=hidden?EMPTY:Object.freeze(allies.map(person=>Object.freeze({...person,shot:person.shot?Object.freeze({...person.shot}):null})));
  }
  function sight(a,b,ctx={}) {
    if((a?.interiorId||null)!==(b?.interiorId||null))return false;
    if(a?.interiorId)return crewRoom?.plan.id===a.interiorId&&crewRoom.nav.hasLineOfSight(a,b);
    const test=typeof ctx.hasLOS==='function'?ctx.hasLOS:simulation.hasLineOfSight;
    return point(a)&&point(b)&&typeof test==='function'&&test(a,b)===true;
  }
  function moveAlly(ally,goal,step,stopping=1.6) {
    const distance=gap(ally,goal), amount=Math.min(Math.max(0,distance-stopping),3.8*step);
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
  function manualCar(ctx) {
    const car=ctx.car,model=BY_ID[car?.modelId];
    if(!model||car.id!=='player'||car.active===false||![car.x,car.z,car.yaw,car.speed].every(Number.isFinite))return null;
    return {...car,length:Number.isFinite(car.length)&&car.length>=1&&car.length<=16?car.length:model.length+.08,
      width:Number.isFinite(car.width)&&car.width>=.5&&car.width<=4?car.width:model.width+.024,key:ctx.carKey??car.modelId};
  }
  function carPoint(car,side,along) {
    return {x:car.x+Math.cos(car.yaw)*side+Math.sin(car.yaw)*along,
      z:car.z-Math.sin(car.yaw)*side+Math.cos(car.yaw)*along,yaw:car.yaw};
  }
  const windowPoint=(car,index)=>carPoint(car,car.width/2+.18,index===0?-.35:.65);
  const outward=(car,p)=>Math.cos(car.yaw)*(p.x-car.x)-Math.sin(car.yaw)*(p.z-car.z)>car.width/2+.28;
  function seatPath(from,to,ally,car) {
    const distance=gap(from,to);if(distance>SEAT_PATH_LIMIT||!sight(from,to))return false;
    const steps=Math.max(1,Math.ceil(distance/.2));
    for(let i=0;i<=steps;i++) {
      const p={x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps,yaw:car.yaw};
      if(!simulation.canOccupy(p,{length:1,width:.8,ignoreId:car.id,ignorePersonId:ally.id}))return false;
    }
    return true;
  }
  function clearShots(ally) {ally.shot=null;events=events.filter(event=>event.actorId!==ally.id);}
  function updateSeat(ally,ctx,car,step) {
    let attachment=attachments.get(ally.id);
    const retry=Math.max(0,(seatRetries.get(ally.id)||0)-step);seatRetries.set(ally.id,retry);
    if(attachment) {
      const same=car&&car.key===attachment.car.key&&car.modelId===attachment.car.modelId;
      if(same)attachment.car=car;
      const carrier=attachment.car;
      Object.assign(ally,{x:carrier.x,z:carrier.z,yaw:carrier.yaw,speed:0,mode:'passenger'});
      if(ctx.playerMode==='vehicle'&&same)return true;
      if(retry>0)return true;
      seatRetries.set(ally.id,SEAT_RETRY);
      if(Math.abs(carrier.speed)>1.2)return true;
      const along=ally.bedRider?carrier.length*.32:ally.seatIndex===0?-.35:.65;
      for(const side of [1,-1])for(const extra of [.8,1.2,1.6]) {
        const door=carPoint(carrier,side*(carrier.width/2+extra),along);
        if(nearDoor(door)||!seatPath(carrier,door,ally,carrier)||!clearPosition(door,ally.id)||
          allies.some(other=>other.id!==ally.id&&!other.seated&&other.active!==false&&gap(other,door)<1.2))continue;
        Object.assign(ally,door,{mode:'following',seated:false,bedRider:false,bedPose:null,vehicleId:null,vehicleKey:null,seatIndex:null,carModelId:null,followTime:0,stuck:false});
        attachments.delete(ally.id);clearShots(ally);return false;
      }
      return true;
    }
    if(ctx.playerMode!=='vehicle'||!car||Math.abs(car.speed)>1.2||retry>0||gap(ally,car)>BOARD_RANGE)return false;
    const occupied=new Set(allies.filter(person=>person.seated&&person.vehicleKey===car.key).map(person=>person.seatIndex));
    const seatIndex=Array.from({length:campaignPassengerCapacity(car.modelId)},(_,index)=>index).find(index=>!occupied.has(index));
    if(seatIndex===undefined) {
      // Full interior seats: pickup/runabout trays accept two prone bed riders.
      const bed=pickupBedAnchor(car.modelId);
      if(!bed)return false;
      const taken=allies.filter(person=>person.bedRider&&person.vehicleKey===car.key).map(person=>person.bedPose.side);
      const side=[1,-1].find(value=>!taken.includes(value));
      if(side===undefined)return false;
      seatRetries.set(ally.id,SEAT_RETRY);
      const door=carPoint(car,side*(car.width/2+.8),car.length*.32);
      if(!seatPath(ally,door,ally,car)||!seatPath(door,car,ally,car)){decaySeatRetry(ally.id);return false;}
      attachments.set(ally.id,{car});clearShots(ally);
      Object.assign(ally,{x:car.x,z:car.z,yaw:car.yaw,speed:0,mode:'passenger',seated:false,
        bedRider:true,bedPose:Object.freeze({side}),vehicleId:car.id,vehicleKey:car.key,
        seatIndex:null,carModelId:car.modelId,followTime:0,stuck:false});
      return true;
    }
    seatRetries.set(ally.id,SEAT_RETRY);
    // Boarding tries both sides of the stopped car before giving up, and a
    // failed attempt decays its retry instead of idling a fixed half second.
    for(const attempt of [1,-1])for(const extra of [.8,1.2,1.6]) {
      const door=carPoint(car,attempt*(car.width/2+extra),seatIndex===0?-.35:.65);
      if(!seatPath(ally,door,ally,car)||!seatPath(door,car,ally,car))continue;
      attachments.set(ally.id,{car});clearShots(ally);seatFailures.delete(ally.id);
      Object.assign(ally,{x:car.x,z:car.z,yaw:car.yaw,speed:0,mode:'passenger',seated:true,
        vehicleId:car.id,vehicleKey:car.key,seatIndex,carModelId:car.modelId,followTime:0,stuck:false});
      return true;
    }
    decaySeatRetry(ally.id);
    return false;
  }
  function windowCombat(ally,ctx,hostiles) {
    const car=attachments.get(ally.id)?.car;if(!car||!ally.armed||ctx.attacksAllowed===false)return;
    const muzzle=windowPoint(car,ally.seatIndex);
    let target=null,distance=ALLY_RANGE;
    for(const hostile of hostiles) {
      if(typeof hostile?.id!=='string'||!hostile.id.startsWith('police:')||hostile.mode!=='foot'||(hostile.interiorId||null)!==(ally.interiorId||null)||hostile.active===false||!Number.isFinite(hostile.health)||hostile.health<=0||!point(hostile)||!outward(car,hostile))continue;
      const d=gap(muzzle,hostile);
      if(d<distance&&sight(muzzle,hostile,ctx)){target=hostile;distance=d;}
    }
    if(target&&ally.cooldown===0&&events.length<SHOT_LIMIT) {
      const from=frozenPoint(muzzle),to=frozenPoint(target);
      events.push(Object.freeze({kind:'ally-shot',type:'ally-shot',actorId:ally.id,targetId:target.id,interiorId:ally.interiorId||null,from,to,damage:ALLY_DAMAGE,range:ALLY_RANGE}));
      ally.shot={from,to,remaining:.12};ally.cooldown=ALLY_COOLDOWN;
    }
  }
  function syncCarPose(value,carKey) {
    if(disposed)return false;
    const car=manualCar({car:value,carKey});if(!car)return false;
    let changed=false;
    for(const ally of allies) {
      const attachment=attachments.get(ally.id);
      if(!attachment||attachment.car.key!==car.key||attachment.car.modelId!==car.modelId)continue;
      attachment.car=car;
      if(ally.x===car.x&&ally.z===car.z&&ally.yaw===car.yaw)continue;
      Object.assign(ally,{x:car.x,z:car.z,yaw:car.yaw});changed=true;
    }
    if(changed&&people.length)publishAllies();
    return changed;
  }
  const heroId=id=>typeof id==='string'?id.replace(/^campaign-ally:/,''):null;
  function exchangeTarget(id,ctx) {
    const hero=heroId(id),mission=ctx?.mission;
    if(disposed||ctx?.mode!=='campaign'||ctx.recovery||ctx.recovering||ctx.interior||ctx.playerMode!=='foot'||
      !HEROES.includes(ctx.character)||!HEROES.includes(hero)||hero===ctx.character||!point(ctx.pose)||!Number.isFinite(ctx.pose.yaw)||
      !Number.isFinite(ctx.health)||ctx.health<=0||ctx.health>100||!mission||!Array.isArray(mission.companions)||!mission.companions.includes(hero))return null;
    const selected=allies.find(ally=>ally.id===`campaign-ally:${hero}`);
    if(!selected||selected.active===false||selected.health<=0||selected.seated||selected.bedRider||gap(selected,ctx.pose)>80)return null;
    const current=HEROES.filter(value=>value!==ctx.character&&mission.companions.includes(value)).slice(0,2);
    if(signature!==`allies:${mission.id}:${ctx.character}:${current.join(':')}`)return null;
    // Each body is checked in its current space. The player is about to leave
    // its own indexed circle, and the selected adult is about to become it.
    for(const [pose,ignorePersonId] of [[selected,selected.id],[ctx.pose,'player-body']]) {
      if(!simulation.canOccupy(pose,{length:1,width:.8,ignorePersonId}))return null;
      const actor={...pose};if(simulation.moveActor(actor,0,0,RADIUS).blocked)return null;
    }
    return selected;
  }
  function canExchangeLeader(id,ctx={}) {return !!exchangeTarget(id,ctx);}
  function exchangeLeader(id,ctx={}) {
    const selected=exchangeTarget(id,ctx);if(!selected)return null;
    const next=heroId(id),previous=ctx.character,retained=leaders.get(previous);
    const promoted=Object.freeze({...selected,shot:null});
    clearShots(selected);leaders.set(next,selected);leaders.delete(previous);
    const former=retained||{id:`campaign-ally:${previous}`,appearanceId:`player:${previous}`,radius:RADIUS,
      gesturePhase:elapsed,cooldown:ALLY_COOLDOWN,hitPhase:0,shot:null};
    Object.assign(former,{x:ctx.pose.x,z:ctx.pose.z,yaw:ctx.pose.yaw,health:ctx.health,active:true,
      armed:typeof ctx.armed==='boolean'?ctx.armed:former.armed??true,mode:'following',speed:0,
      seated:false,bedRider:false,bedPose:null,vehicleId:null,vehicleKey:null,seatIndex:null,carModelId:null,followTime:0,followStartDistance:0,stuck:false});
    allies[allies.indexOf(selected)]=former;
    const heroes=HEROES.filter(value=>value!==next&&(ctx.mission.companions.includes(value)||value===previous)).slice(0,2);
    signature=`allies:${ctx.mission.id}:${next}:${heroes.join(':')}`;
    publishAllies();return promoted;
  }
  function updateAllies(ctx,dt) {
    const mission=ctx.mission||{id:'hired-only',companions:[]};
    const heroes=ctx.mode==='campaign'&&Array.isArray(mission.companions)?HEROES.filter(id=>id!==ctx.character&&mission.companions.includes(id)).slice(0,2):[];
    const hired=hiredRoster(ctx),wanted=[...heroes.map(hero=>({id:`campaign-ally:${hero}`,appearanceId:`player:${hero}`})),...hired.map(id=>({id,appearanceId:HIRED[id],hired:true}))];
    if(!wanted.length){clear();return;}
    const key=`allies:${heroes.length?mission.id:'hired-only'}:${ctx.character}:${heroes.join(':')}`;
    if(signature!==key){
      const retained=allies.filter(ally=>ally.hired&&hired.includes(ally.id)),room=crewRoom;
      const attached=new Map(retained.filter(ally=>attachments.has(ally.id)).map(ally=>[ally.id,attachments.get(ally.id)]));
      clear();signature=key;allies=retained;crewRoom=room;
      for(const [id,value] of attached)attachments.set(id,value);
    }
    for(const ally of allies)if(ally.hired&&!hired.includes(ally.id)){
      attachments.delete(ally.id);seatRetries.delete(ally.id);clearShots(ally);
      Object.assign(ally,{seated:false,bedRider:false,bedPose:null,vehicleId:null,vehicleKey:null,seatIndex:null,carModelId:null,interiorId:null,floorY:null});
    }
    // A higher authoritative purchase serial is an explicit new admission for a
    // downed hire. Merely retaining or readding the same roster cannot heal it.
    allies=allies.filter(ally=>!ally.hired||hired.includes(ally.id)&&!(ally.health<=0&&renewalSerial(ctx,ally.id)>(ally.renewalSerial||0)));
    active=!ctx.paused&&Number.isFinite(dt)&&dt>0;
    if(ctx.interior&&!crewRoom){events=[];publishAllies(true);active=false;return;}
    if(!active)return;
    active=true;
    const step=Math.min(.1,dt);elapsed+=step;catchupRetry=Math.max(0,catchupRetry-step);
    const canRetry=catchupRetry===0;let attemptedCatchup=false;
    if(canRetry&&allies.length<wanted.length) {
      const goal=crewRoom?.entering?crewRoom.outside:point(ctx.pose)?ctx.pose:mission.target;
      if(point(goal))for(const descriptor of wanted) {
        const {id}=descriptor;
        if(allies.some(ally=>ally.id===id))continue;
        let retained=descriptor.hired?hiredHistory.get(id):null;
        const serial=renewalSerial(ctx,id);
        const renewed=retained&&serial>(retained.renewalSerial||0);
        if(renewed){
          attachments.delete(id);seatRetries.delete(id);clearShots(retained);retained=null;
        }
        if(retained){
          if(retained.health<=0){allies.push(retained);continue;}
          const landing=nearbyLanding(goal,id,wanted.indexOf(descriptor));
          if(landing){Object.assign(retained,landing,{interiorId:null,floorY:null,seated:false,bedRider:false,bedPose:null,vehicleId:null,vehicleKey:null,seatIndex:null,carModelId:null});allies.push(retained);}
          else attemptedCatchup=true;
          continue;
        }
        const candidate=nearbyLanding(goal,id,wanted.indexOf(descriptor));
        if(candidate){
          const health=descriptor.hired&&!renewed?suppliedHiredHealth(ctx,id):100;
          const ally={...candidate,...descriptor,...(descriptor.hired?{renewalSerial:serial}:{}),radius:RADIUS,active:health>0,armed:health>0,health,mode:health>0?'following':'down',speed:0,gesturePhase:0,cooldown:.3+allies.length*.25,hitPhase:0,shot:null,followTime:0,followStartDistance:0,stuck:false};
          allies.push(ally);if(descriptor.hired)hiredHistory.set(id,ally);
        } else attemptedCatchup=true;
      }
    }
    const hostiles=(Array.isArray(ctx.hostiles)?ctx.hostiles:[]).filter(hostile=>typeof hostile?.id==='string'&&hostile.id.startsWith('police:')&&hostile.mode==='foot'&&hostile.active!==false&&Number.isFinite(hostile.health)&&hostile.health>0&&point(hostile)),car=manualCar(ctx);
    for(let index=0;index<allies.length;index++) {
      const ally=allies[index];if(ally.health<=0)continue;
      const threats=hostiles.filter(hostile=>(hostile.interiorId||null)===(ally.interiorId||null)).slice(0,6);
      ally.cooldown=Math.max(0,ally.cooldown-step);ally.hitPhase=Math.max(0,ally.hitPhase-step);ally.gesturePhase=elapsed;
      if(ally.shot){ally.shot.remaining-=step;if(ally.shot.remaining<=0)ally.shot=null;}
      if(transitionRoom(ally,ctx,step,index,canRetry))continue;
      if(!ally.interiorId&&updateSeat(ally,ctx,car,step)){if(!ally.bedRider)windowCombat(ally,ctx,threats);continue;}
      let target=null,distance=ALLY_RANGE;
      for(const hostile of threats) {
        if(typeof hostile?.id!=='string'||!hostile.id.startsWith('police:')||hostile.mode!=='foot'||(hostile.interiorId||null)!==(ally.interiorId||null)||hostile.active===false||!Number.isFinite(hostile.health)||hostile.health<=0||!point(hostile))continue;
        const d=gap(ally,hostile);
        if(d<distance&&sight(ally,hostile,ctx)){target=hostile;distance=d;}
      }
      const playerDistance=point(ctx.pose)?gap(ally,ctx.pose):0;
      if(!ally.interiorId&&canRetry&&point(ctx.pose)&&(playerDistance>CATCHUP_DISTANCE||(!target&&ctx.playerMode!=='passenger'&&ctx.playerMode!=='vehicle'&&ally.stuck&&playerDistance>STUCK_DISTANCE))) {
        attemptedCatchup=true;
        if(relocate(ally,ctx.pose,index))continue;
      }
      if(target) {
        ally.followTime=0;ally.stuck=false;
        ally.mode='combat';ally.speed=0;ally.yaw=Math.atan2(-(target.x-ally.x),-(target.z-ally.z));
        if(ctx.attacksAllowed!==false&&ally.armed&&ally.cooldown===0&&events.length<SHOT_LIMIT) {
          const from=frozenPoint(ally),to=frozenPoint(target);
          events.push(Object.freeze({kind:'ally-shot',type:'ally-shot',actorId:ally.id,targetId:target.id,interiorId:ally.interiorId||null,from,to,damage:ALLY_DAMAGE,range:ALLY_RANGE}));
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
          const goal={x:ctx.pose.x+Math.sin(yaw)*2+Math.cos(yaw)*side*1.2,z:ctx.pose.z+Math.cos(yaw)*2-Math.sin(yaw)*side*1.2};
          if(ally.interiorId)moveRoomAlly(ally,crewRoom.nav.canOccupy(goal,RADIUS)?goal:ctx.pose,step);
          else moveAlly(ally,goal,step);
        } else {ally.speed=0;ally.followTime=0;ally.stuck=false;}
      }
    }
    if(crewRoom&&!crewRoom.entering&&!allies.some(ally=>ally.interiorId===crewRoom.plan.id&&ally.health>0))crewRoom=null;
    if(attemptedCatchup)catchupRetry=CATCHUP_RETRY;
    publishAllies();
  }
  function receiveHit(event) {
    const ally=allies.find(person=>person.id===event?.targetId);
    if(disposed||!active||!ally||ally.health<=0||event?.kind!=='shot'||(event.interiorId||event.from?.interiorId||null)!==(ally.interiorId||null)||!point(event.from)||!point(event.to)||!Number.isFinite(event.damage)||event.damage<=0||event.damage>30||gap(event.to,ally)>1||gap(event.from,ally)>60||!sight(event.from,ally))return false;
    if(ally.seated) {
      const car=attachments.get(ally.id)?.car;
      if(!car||!outward(car,event.from)||!sight(event.from,windowPoint(car,ally.seatIndex)))return false;
    }
    ally.health=Math.max(0,ally.health-event.damage);ally.hitPhase=.25;
    if(ally.health===0){ally.mode='down';ally.active=false;ally.armed=false;ally.speed=0;clearShots(ally);}
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
    if(!['campaign','street','free'].includes(ctx.mode)||ctx.recovery||ctx.recovering||ctx.health<=0||!HEROES.includes(ctx.character)){clear();return;}
    if(hiredRoster(ctx).length||(ctx.mode==='campaign'&&Array.isArray(mission?.companions)&&mission.companions.length)){updateAllies(ctx,dt);return;}
    if(!mission){clear();return;}
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
        if(person.id===actor.id||person.active===false||person.seated||person.bedRider||(person.interiorId||null)!==(actor.interiorId||null))continue;
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
  return {update,clear,enterInterior,leaveInterior,get roomStats(){return crewRoom?{id:crewRoom.plan.id,entering:crewRoom.entering,...crewRoom.nav.stats}:null;},clipMovement,meetingPoint,receiveHit,syncCarPose,canExchangeLeader,exchangeLeader,getPeople:()=>people,drainEvents:()=>events.splice(0),dispose(){if(disposed)return;clear();hiredHistory.clear();disposed=true;},get people(){return people;},get dialogueLines(){return dialogueLines;}};
}
