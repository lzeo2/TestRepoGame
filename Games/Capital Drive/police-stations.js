import { roadProfile } from './road-network.js';
import { projectSegment } from './simulation.js';

const BLUEPRINTS = [
  { area: 'kingston', id: 'south-district-police-post', name: 'South District Police Post' },
  { area: 'canberra-centre', id: 'civic-district-police-post', name: 'Civic District Police Post' },
  { area: 'canberra-airport', id: 'east-district-police-post', name: 'East District Police Post' },
];
const WIDTH = 11.4, DEPTH = 8.2, HEIGHT = 4.8, HEALTH = 120;
const along = (a,b,x,z) => projectSegment(x,z,a,b).distance;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function planStation(blueprint, anchor, segments, simulation, heightAt) {
  const nearby = segments.filter(s => Math.min(s.a[0],s.b[0]) <= anchor.x+255 && Math.max(s.a[0],s.b[0]) >= anchor.x-255 &&
    Math.min(s.a[1],s.b[1]) <= anchor.z+255 && Math.max(s.a[1],s.b[1]) >= anchor.z-255)
    .map(s => ({...s,half:roadProfile(s.road).driveWidth/2,distance:along(s.a,s.b,anchor.x,anchor.z)}));
  const approaches = nearby.filter(s => s.distance<220 && /^(residential|tertiary|secondary|unclassified)$/.test(s.road.type) &&
    (s.road.sourceTags?.access !== 'private' && s.road.sourceTags?.access !== 'no')).sort((a,b)=>a.distance-b.distance);
  const clearRoad = ([x,z]) => nearby.every(r=>along(r.a,r.b,x,z) > r.half + .8);
  for (const road of approaches) {
    const length=Math.hypot(road.b[0]-road.a[0],road.b[1]-road.a[1]);
    if(length<12)continue;
    const tx=(road.b[0]-road.a[0])/length,tz=(road.b[1]-road.a[1])/length;
    for(const fraction of [.5,.27,.73])for(const side of [-1,1])for(const extra of [3.4,6.4,9.4,13.4]){
      const nx=-tz*side,nz=tx*side,yaw=Math.atan2(-nx,-nz);
      const roadX=road.a[0]+tx*length*fraction,roadZ=road.a[1]+tz*length*fraction;
      const offset=road.half+DEPTH/2+extra,x=roadX+nx*offset,z=roadZ+nz*offset;
      const point=(u,v)=>[x+tx*u+nx*v,z+tz*u+nz*v];
      const points=[point(-WIDTH/2,-DEPTH/2),point(WIDTH/2,-DEPTH/2),point(WIDTH/2,DEPTH/2),point(-WIDTH/2,DEPTH/2)];
      if(!points.every(clearRoad)||!clearRoad([x,z]))continue;
      const corners=points.map(([px,pz])=>({x:px,z:pz}));
      const heights=corners.map(p=>heightAt(p.x,p.z));
      if(!heights.every(Number.isFinite)||Math.max(...heights)-Math.min(...heights)>1.5)continue;
      // Three parallel full-length body probes span the real wall footprint.
      const probes=[-3.7,0,3.7].map(u=>{const [px,pz]=point(u,0);return {x:px,z:pz,yaw};});
      if(!probes.every(p=>simulation.canOccupy(p,{length:DEPTH+1.8,width:4,ignoreId:'player'})))continue;
      if(!corners.every((p,i)=>simulation.hasLineOfSight(p,corners[(i+1)%corners.length])))continue;
      const [ax,az]=point(0,-DEPTH/2-2),approach={id:blueprint.id,x:ax,z:az,yaw};
      if(!simulation.canOccupy(approach,{length:1,width:1,ignoreId:'player'})||
        !simulation.hasLineOfSight(approach,{x:roadX,z:roadZ}))continue;
      const y=Math.max(...heights)+.08, foundation=Math.min(...heights)-.06;
      const barrier={id:blueprint.id,type:'police-station',destructible:true,points,y:foundation,height:HEIGHT+y-foundation};
      const place={id:blueprint.id,name:blueprint.name,aliases:['police station','police post',`${anchor.name} police`],
        x:ax,z:az,radius:15,description:`Fictional police post near ${road.road.name||anchor.name}`};
      return {id:blueprint.id,place,approach,barrier,x,y,z,foundation,tx,tz,nx,nz,point,ground:(u,v)=>heightAt(...point(u,v)),
        width:WIDTH,depth:DEPTH,height:HEIGHT,health:HEALTH,destroyed:false};
    }
  }
  return null;
}

export function createPoliceStations(map, simulation, heightAt) {
  const sites=[];
  for(const blueprint of BLUEPRINTS){
    const anchor=map.landmarks?.find(p=>p.id===blueprint.area);
    if(!anchor)continue;
    const site=planStation(blueprint,anchor,simulation.graph.segments,simulation,heightAt);
    if(site)sites.push(site);
  }
  const handled=new WeakSet();
  let destroyedCount=0;
  function damageExplosion(event, trace = ray=>ray.range) {
    if(event?.type!=='explosion'||event.interiorId||handled.has(event)||![event.x,event.y,event.z,event.radius,event.maxDamage].every(Number.isFinite)||
      event.radius<=0||event.radius>40||event.maxDamage<=0||event.maxDamage>1000)return [];
    handled.add(event);
    const destroyed=[];
    for(const site of sites){
      if(site.destroyed||Math.hypot(event.x-site.x,event.z-site.z)>event.radius+8)continue;
      const dx=event.x-site.x,dz=event.z-site.z;
      const u=clamp(dx*site.tx+dz*site.tz,-site.width/2,site.width/2);
      const v=clamp(dx*site.nx+dz*site.nz,-site.depth/2,site.depth/2);
      const [x,z]=site.point(u,v),y=clamp(event.y,site.foundation,site.y+site.height);
      const vx=x-event.x,vy=y-event.y,vz=z-event.z,distance=Math.hypot(vx,vy,vz);
      if(distance>=event.radius)continue;
      if(distance>.06 && trace({x:event.x,y:event.y,z:event.z,dx:vx/distance,dy:vy/distance,dz:vz/distance,range:distance,interiorId:null})<distance-.06)continue;
      site.health=Math.max(0,site.health-event.maxDamage*(1-distance/event.radius));
      if(site.health>0)continue;
      site.destroyed=true;destroyedCount++;
      simulation.unregisterStaticBarriers([site.barrier]);
      destroyed.push(site);
    }
    return destroyed;
  }
  return {sites,barriers:sites.map(s=>s.barrier),damageExplosion,responseLoss:()=>destroyedCount,
    patrolStations:()=>sites.filter(s=>!s.destroyed).map(s=>s.approach),
    snapshot:()=>sites.map(s=>({id:s.id,name:s.place.name,x:s.x,z:s.z,health:s.health,destroyed:s.destroyed}))};
}
