import {roadProfile} from './road-network.js';
import {CAMPUS_BOUNDARY} from './campus.js';
import {MANUKA_POOL_SITE} from './landmarks.js';
import {MAPPED_STORES} from './stores.js';
import {EXTRA_STORES, SKATEPARK} from './civic-extras.js';

// Original adult characters. These estimates imply no real person or business trades arms.
const CONTACTS = [
  {id:'dealer-kingston',name:'Copper Finch',x:690,z:-430,weaponIds:['pistol','shotgun'],priceMultiplier:.95},
  {id:'dealer-barton',name:'Morrow Vale',x:-420,z:-1200,weaponIds:['pistol','smg'],priceMultiplier:1.05},
  {id:'dealer-civic',name:'Ember Rook',x:-245,z:-4257,weaponIds:['shotgun','smg','carbine'],priceMultiplier:1.1},
];
const CELL = 32, BODY_RADIUS = .34, MAX_PANIC = 30;
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
function index(items) {
  const cells=new Map();
  for(const item of items) for(let x=Math.floor(item.minX/CELL);x<=Math.floor(item.maxX/CELL);x++) for(let z=Math.floor(item.minZ/CELL);z<=Math.floor(item.maxZ/CELL);z++) {
    const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);
  }
  return (x,z)=>cells.get(`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`)||[];
}
function polygonIndex(items,margin) {
  return index(items.filter(p=>p.points?.length>=2).map(p=>({...p,
    minX:Math.min(...p.points.map(a=>a[0]))-margin,maxX:Math.max(...p.points.map(a=>a[0]))+margin,
    minZ:Math.min(...p.points.map(a=>a[1]))-margin,maxZ:Math.max(...p.points.map(a=>a[1]))+margin})));
}
function blocks(p,points,margin) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[j],b=points[i];
    if(segmentDistance(p.x,p.z,a,b)<margin)return true;
    if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function placements(map) {
  const segments=[];
  for(const road of map.roads||[]) for(let i=1;i<road.points.length;i++) {
    const a=road.points[i-1],b=road.points[i],margin=roadProfile(road).driveWidth/2+3;
    segments.push({road,a,b,minX:Math.min(a[0],b[0])-margin,maxX:Math.max(a[0],b[0])+margin,
      minZ:Math.min(a[1],b[1])-margin,maxZ:Math.max(a[1],b[1])+margin});
  }
  const roadsAt=index(segments),buildingsAt=polygonIndex(map.buildings||[],2.2);
  const areasAt=polygonIndex([...(map.areas||[]).filter(a=>/water|park|garden|pitch|playground|school|sports|private/.test(a.type||'')||['private','no'].includes(a.sourceTags?.access)),
    {points:CAMPUS_BOUNDARY},{points:MANUKA_POOL_SITE},SKATEPARK,...(map.barriers||[])],2);
  const doors=[...(map.interiorEntries||[]),...(map.publicEntries||[]),...MAPPED_STORES.map(s=>s.frontage),
    ...EXTRA_STORES.map(s=>s.frontage),{x:-248.655,z:-4172.87}].filter(valid);
  function safe(p) {
    const b=map.bounds;
    if(b&&(p.x<b.minX+1||p.x>b.maxX-1||p.z<b.minZ+1||p.z>b.maxZ-1))return false;
    if(roadsAt(p.x,p.z).some(s=>!['footway','path','pedestrian','cycleway'].includes(s.road.type)&&segmentDistance(p.x,p.z,s.a,s.b)<roadProfile(s.road).driveWidth/2+.85))return false;
    return !buildingsAt(p.x,p.z).some(b=>blocks(p,b.points,2.2))&&!areasAt(p.x,p.z).some(a=>blocks(p,a.points,2))&&!doors.some(d=>distance(p,d)<9);
  }
  const selected=[];
  for(const contact of CONTACTS) {
    const candidates=[];
    for(const s of segments) {
      const road=s.road,profile=roadProfile(road),tags=road.sourceTags||{};
      if(!road.name||!['residential','tertiary','living_street','unclassified','pedestrian'].includes(road.type)||
        !profile.trafficAllowed||tags.foot==='no'||['private','no'].includes(tags.access)||tags.bridge==='yes'||segmentDistance(contact.x,contact.z,s.a,s.b)>650)continue;
      const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz);
      if(length<12)continue;
      for(const t of [.25,.5,.75])for(const side of [-1,1]) {
        const offset=profile.driveWidth/2+1.65,nx=-dz/length*side,nz=dx/length*side;
        const p={x:s.a[0]+dx*t+nx*offset,z:s.a[1]+dz*t+nz*offset,yaw:Math.atan2(-nx,-nz),tx:dx/length,tz:dz/length};
        candidates.push({...p,road:road.name,roadId:road.id,sourceRoadId:road.sourceId||`way/${String(road.id).split('-')[0]}`,score:distance(p,contact)});
      }
    }
    candidates.sort((a,b)=>a.score-b.score||String(a.roadId).localeCompare(String(b.roadId))||a.x-b.x||a.z-b.z);
    const p=candidates.find(p=>!selected.some(s=>distance(s,p)<100)&&[-1,0,1].every(t=>safe({x:p.x+p.tx*t,z:p.z+p.tz*t})));
    if(p)selected.push(Object.freeze({id:contact.id,name:contact.name,type:'arms',dealer:true,fictional:true,
      x:p.x,z:p.z,yaw:p.yaw,radius:3,road:p.road,roadId:p.roadId,sourceRoadId:p.sourceRoadId,
      weaponIds:Object.freeze([...contact.weaponIds]),priceMultiplier:contact.priceMultiplier}));
  }
  return Object.freeze(selected);
}

export function createStreetDealers(map) {
  const services=placements(map||{});
  let people=[];
  function reset() {people=services.map((s,i)=>({...s,health:100,panic:0,hitCooldown:0,phase:i*2.1,palette:i,role:'dealer',reaction:'calm'}));}
  function canTrade(id) {const p=people.find(p=>p.id===id);return Boolean(p&&p.health===100&&p.panic===0);}
  function nearest(pose,radius=3) {
    if(!valid(pose)||!Number.isFinite(radius)||radius<0)return null;
    let found=null,reach=Math.min(3,radius);
    for(const s of services) {const d=distance(s,pose);if(d<=reach){found=s;reach=d;}}
    return found;
  }
  function alert({x,z,radius=28,hasLineOfSight}={}) {
    if(!valid({x,z}))return 0;
    let count=0;const reach=Number.isFinite(radius)?clamp(radius,0,100):28;
    for(const p of people)if(p.health>0&&distance(p,{x,z})<=reach&&(!hasLineOfSight||hasLineOfSight({x,z},p))) {
      p.panic=MAX_PANIC;p.reaction=p.health<100?'injured':'panic';count++;
    }
    return count;
  }
  function update(dt,{focus,wanted=0,shots=[]}={}) {
    if(!Number.isFinite(dt)||dt<=0)return;
    const time=Math.min(dt,.1);
    for(const p of people) {
      p.panic=Math.max(0,p.panic-time);p.hitCooldown=Math.max(0,p.hitCooldown-time);p.phase+=time;
      p.reaction=p.health<=0?'knockdown':p.health<100?'injured':p.panic>0?'panic':'calm';
    }
    if(wanted>0&&valid(focus))alert({...focus,radius:16});
    for(const shot of Array.isArray(shots)?shots.slice(0,32):[])if(valid(shot))alert({...shot,radius:40});
  }
  function strike({x,z,yaw=0,range=2,damage=20,kind='melee',hasLineOfSight}={}) {
    const hit=[];
    if(![x,z,yaw,range,damage].every(Number.isFinite))return {hits:0,people:hit};
    const gun=['pistol','shotgun','smg','carbine','gunshot','firearm','shot','fire'].includes(kind),reach=clamp(range,0,100),power=clamp(damage,0,100);
    const candidates=people.map(p=>({p,d:distance(p,{x,z})})).filter(({p,d})=> {
      const forward=(p.x-x)*-Math.sin(yaw)+(p.z-z)*-Math.cos(yaw),lateral=Math.abs((p.x-x)*Math.cos(yaw)-(p.z-z)*Math.sin(yaw));
      return power>0&&p.health>0&&p.hitCooldown===0&&d<=reach&&forward>=-.3&&(gun?lateral<=.55:forward>=d*.25)&&(!hasLineOfSight||hasLineOfSight({x,z},p));
    }).sort((a,b)=>a.d-b.d);
    for(const {p} of candidates.slice(0,gun?1:3)) {
      p.health=Math.max(0,p.health-power);p.hitCooldown=.4;p.panic=MAX_PANIC;p.reaction=p.health===0?'knockdown':'injured';
      hit.push(Object.freeze({id:p.id,x:p.x,z:p.z,health:p.health,reaction:p.reaction}));
    }
    if(hit.length)alert({x,z,radius:gun?40:16,hasLineOfSight});
    return {hits:hit.length,people:hit};
  }
  function clipMovement(actor,dx,dz,radius=.45) {
    if(![actor?.x,actor?.z,dx,dz,radius].every(Number.isFinite))return {dx:0,dz:0,blocked:false};
    const reach=clamp(radius,0,4)+BODY_RADIUS+.02;
    let x=actor.x,z=actor.z,rx=dx,rz=dz,blocked=false;
    for(let iteration=0;iteration<4;iteration++) {
      const length2=rx*rx+rz*rz;if(length2<1e-12)break;
      let first=1,hit=null;
      for(const p of people) {
        if(p.id===actor.id)continue;
        const ox=x-p.x,oz=z-p.z,dot=ox*rx+oz*rz,c=ox*ox+oz*oz-reach*reach;
        if(dot>=0)continue;
        const discriminant=dot*dot-length2*c;if(discriminant<0)continue;
        const t=c<=0?0:(-dot-Math.sqrt(discriminant))/length2;
        if(t>=0&&t<=first){first=t;hit=p;}
      }
      if(!hit){x+=rx;z+=rz;break;}
      blocked=true;const t=Math.max(0,first-.001/Math.sqrt(length2));
      x+=rx*t;z+=rz*t;rx*=1-t;rz*=1-t;
      const nx=x-hit.x,nz=z-hit.z,n=Math.hypot(nx,nz)||1,inward=(rx*nx+rz*nz)/n;
      if(inward<0){rx-=nx/n*inward;rz-=nz/n*inward;}
    }
    return {dx:x-actor.x,dz:z-actor.z,blocked};
  }
  reset();
  return {services,nearest,canTrade,update,clipMovement,strike,alert,reset,drainEvents(){return [];},
    snapshot(){return Object.freeze(people.map(p=>Object.freeze({...p,weaponIds:p.weaponIds})));}};
}
