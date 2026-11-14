// Original Lemon hire simulation. The controller owns payment, actor collision and saves.
const KINDS = Object.freeze({scooter:{price:20,maxSpeed:6.9,acceleration:2.5},bike:{price:30,maxSpeed:8.3,acceleration:2.1}});
const valid = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const RADIUS = .45, PICKUP_RANGE = 2.8, CELL = 32;
function project(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
function grid(items) {
  const cells=new Map();
  for(const item of items) for(let x=Math.floor(item.minX/CELL);x<=Math.floor(item.maxX/CELL);x++) for(let z=Math.floor(item.minZ/CELL);z<=Math.floor(item.maxZ/CELL);z++) {
    const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);
  }
  return (x,z)=>cells.get(`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`)||[];
}
function inside(x,z,points) {
  let hit=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function rentalSites(map) {
  const segments=[];
  for(const road of map.roads||[]) for(let i=1;i<road.points.length;i++) {
    const a=road.points[i-1],b=road.points[i],margin=(road.width||4)/2+.9;
    segments.push({road,a,b,minX:Math.min(a[0],b[0])-margin,maxX:Math.max(a[0],b[0])+margin,minZ:Math.min(a[1],b[1])-margin,maxZ:Math.max(a[1],b[1])+margin});
  }
  const roadsAt=grid(segments),buildingsAt=grid((map.buildings||[]).filter(b=>b.points?.length).map(b=>({points:b.points,
    minX:Math.min(...b.points.map(p=>p[0]))-2.2,maxX:Math.max(...b.points.map(p=>p[0]))+2.2,
    minZ:Math.min(...b.points.map(p=>p[1]))-2.2,maxZ:Math.max(...b.points.map(p=>p[1]))+2.2})));
  function safe(p) {
    if(!valid(p))return false;
    const b=map.bounds;
    if(b&&(p.x<b.minX+1||p.x>b.maxX-1||p.z<b.minZ+1||p.z>b.maxZ-1))return false;
    if(roadsAt(p.x,p.z).some(s=>!['footway','path','pedestrian','cycleway'].includes(s.road.type)&&project(p.x,p.z,s.a,s.b)<(s.road.width||4)/2+.8))return false;
    return !buildingsAt(p.x,p.z).some(b=>inside(p.x,p.z,b.points)||b.points.some((a,i)=>project(p.x,p.z,a,b.points[(i+1)%b.points.length])<2.2));
  }
  const anchors=[['civic','Civic',-245,-4257,'canberra-centre'],['kingston','Kingston',386,-234,'kingston'],['manuka','Manuka',-309,250,'manuka']];
  const stands=[];
  for(const [id,label,x,z,landmarkId] of anchors) {
    const landmark=(map.landmarks||[]).find(l=>l.id===landmarkId),anchor=landmark||{x,z},candidates=[];
    for(const s of segments) {
      const road=s.road;
      if(!road.name||!['residential','tertiary','living_street','unclassified','pedestrian'].includes(road.type)||road.sourceTags?.foot==='no'||['private','no'].includes(road.sourceTags?.access))continue;
      if(project(anchor.x,anchor.z,s.a,s.b)>550)continue;
      const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz);
      if(length<5)continue;
      for(const t of [.25,.5,.75]) for(const side of [-1,1]) {
        const nx=-dz/length*side,nz=dx/length*side,offset=(road.width||4)/2+1.7;
        const p={x:s.a[0]+dx*t+nx*offset,z:s.a[1]+dz*t+nz*offset,yaw:Math.atan2(-dx,-dz),tx:dx/length,tz:dz/length};
        candidates.push({...p,road:road.name,sourceRoadId:road.sourceId||`way/${String(road.id).split('-')[0]}`,score:distance(p,anchor)});
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    // Test both assets and a walk-up strip, keeping the stand away from corners/doors.
    const p=candidates.find(p=>[-1.2,-.6,0,.6,1.2].every(t=>safe({x:p.x+p.tx*t,z:p.z+p.tz*t}))&&safe({x:p.x-Math.sin(p.yaw)*1.1,z:p.z-Math.cos(p.yaw)*1.1}));
    if(p)stands.push({id:`lemon-${id}`,label:`Lemon ${label}`,x:p.x,z:p.z,yaw:p.yaw,road:p.road,sourceRoadId:p.sourceRoadId,tx:p.tx,tz:p.tz});
  }
  return {stands,safe};
}
export function createMicromobility(map) {
  const {stands,safe}=rentalSites(map),events=[];
  let assets=[],active=null,starting=false;
  function reset() {
    active=null;starting=false;events.length=0;
    assets=stands.flatMap(s=>['scooter','bike'].map((kind,i)=>({id:`${s.id}-${kind}`,standId:s.id,kind,x:s.x+s.tx*(i? .6:-.6),z:s.z+s.tz*(i? .6:-.6),yaw:s.yaw,available:true})));
  }
  function offers(pose) {
    return assets.map(a=>({...a,label:`Lemon ${a.kind==='bike'?'e-bike':'scooter'}`,price:KINDS[a.kind].price,distance:valid(pose)?distance(a,pose):Infinity,available:a.available&&!active,sourceRoadId:stands.find(s=>s.id===a.standId)?.sourceRoadId})).sort((a,b)=>a.distance-b.distance);
  }
  function validateStart(kind,context={}) {
    if(!KINDS[kind])return {ok:false,reason:'Unknown rental.'};
    if(active||starting)return {ok:false,reason:'End your current Lemon hire first.'};
    if(context.onFoot!==true||!valid(context.pose))return {ok:false,reason:'Walk to a Lemon vehicle to hire it.'};
    if(typeof context.moveActor!=='function')return {ok:false,reason:'Ride movement is unavailable.'};
    const offer=offers(context.pose).find(a=>a.kind===kind&&a.available&&(!context.standId||a.standId===context.standId)&&(!context.assetId||a.id===context.assetId));
    if(!offer||offer.distance>PICKUP_RANGE)return {ok:false,reason:'Move closer to an available Lemon vehicle.'};
    if(!safe(context.pose)||!safe(offer))return {ok:false,reason:'Move onto the clear footpath before hiring.'};
    return {ok:true,offer};
  }
  function start(kind,context={}) {
    const checked=validateStart(kind,context);if(!checked.ok)return checked;
    if(typeof context.pay!=='function')return {ok:false,reason:'Payment approval is required.'};
    starting=true;
    let paid=false;
    try {paid=context.pay(checked.offer.price,{...checked.offer})===true;} finally {starting=false;}
    if(!paid)return {ok:false,reason:'Not enough cash for this hire.'};
    const asset=assets.find(a=>a.id===checked.offer.id);asset.available=false;
    active={assetId:asset.id,kind,speed:0,x:context.pose.x,z:context.pose.z,yaw:Number.isFinite(context.pose.yaw)?context.pose.yaw:asset.yaw,distance:0};
    events.push({type:'started',kind,assetId:asset.id,price:checked.offer.price});
    return {ok:true,price:checked.offer.price,assetId:asset.id};
  }
  function step(dt,input={},context={}) {
    if(!active||!valid(context.pose)||context.paused||!Number.isFinite(dt)||dt<=0)return;
    if(typeof context.moveActor!=='function')return;
    const time=Math.min(dt,.1),spec=KINDS[active.kind],throttle=clamp(Number(input.throttle)||0,0,1),brake=clamp(Number(input.brake)||0,0,1),steer=clamp(Number(input.steer)||0,-1,1);
    active.speed=clamp(active.speed+(throttle*spec.acceleration-(brake?6*brake:.55))*time,0,spec.maxSpeed);
    active.yaw+=steer*(1.65/(1+active.speed*.13))*Math.min(1,active.speed/.6)*time;
    context.pose.yaw=active.yaw;
    const dx=-Math.sin(active.yaw)*active.speed*time,dz=-Math.cos(active.yaw)*active.speed*time,before={x:context.pose.x,z:context.pose.z};
    const result=context.moveActor(context.pose,dx,dz,RADIUS);
    const moved=distance(before,context.pose),requested=Math.hypot(dx,dz);
    if(result?.blocked||moved+1e-4<requested*.7)active.speed=0;
    active.x=context.pose.x;active.z=context.pose.z;active.distance+=moved;
    context.pose.speed=active.speed;
  }
  function end(context={}) {
    if(!active)return {ok:false,reason:'No active Lemon hire.'};
    if(active.speed>.3)return {ok:false,reason:'Brake to a stop before ending your hire.'};
    if(!valid(context.pose)||!safe(context.pose))return {ok:false,reason:'Stop on a clear footpath to end your hire.'};
    const asset=assets.find(a=>a.id===active.assetId);
    Object.assign(asset,{x:context.pose.x,z:context.pose.z,yaw:active.yaw,available:true});
    events.push({type:'ended',kind:active.kind,assetId:asset.id,distance:active.distance});
    context.pose.speed=0;active=null;return {ok:true};
  }
  function snapshot() {return {stands:stands.map(s=>({...s})),assets:assets.map(a=>({...a})),active:active?{...active}:null};}
  reset();
  return {offers,validateStart,start,step,end,snapshot,drainEvents(){return events.splice(0);},reset};
}
