import {roadProfile} from './road-network.js';

const key=p=>`${p[0]},${p[1]}`;
const NAMES=new Set(['Terminal Avenue','Pialligo Avenue','Majura Road','Majura Parkway']);
// Original estimated reflector equipment along sourced public road geometry.
// These decorative posts are not source guardrails or collision barriers.
export function airportRoadPosts(map) {
  if(!map.airport||!map.airportTerrain)return [];
  const nodes=new Map(),roads=map.roads||[];
  for(const road of roads)for(let i=1;i<(road.points?.length||0);i++)for(const [a,b]of [[road.points[i-1],road.points[i]],[road.points[i],road.points[i-1]]]) {
    const k=key(a);if(!nodes.has(k))nodes.set(k,{point:a,neighbours:new Set()});nodes.get(k).neighbours.add(key(b));
  }
  const junctions=[...nodes.values()].filter(n=>n.neighbours.size>2).map(n=>n.point),posts=[];
  const bounds=map.airportTerrain;
  for(const road of roads) {
    const tags=road.sourceTags||{},profile=roadProfile(road);
    if(!NAMES.has(road.name)||!profile.trafficAllowed||!/^(motorway|trunk|primary|secondary|tertiary|unclassified|service)(?:_link)?$/.test(road.type||'')||tags.aeroway||tags.railway||
       (tags.bridge&&tags.bridge!=='no')||road.bridge||!road.points?.length||
       ['access','vehicle','motor_vehicle'].some(k=>['no','private'].includes(tags[k])))continue;
    const segments=road.points.slice(1).map((b,i)=>({a:road.points[i],b,length:Math.hypot(b[0]-road.points[i][0],b[1]-road.points[i][1])}));
    const total=segments.reduce((sum,s)=>sum+s.length,0);
    for(let along=30;along<total-30;along+=65) {
      let distance=along,segment=segments[0];
      for(const s of segments){segment=s;if(distance<=s.length)break;distance-=s.length;}
      if(segment.length<.01)continue;
      const {a,b,length}=segment,t=distance/length,dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
      const x=a[0]+t*(b[0]-a[0]),z=a[1]+t*(b[1]-a[1]);
      if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ||junctions.some(p=>Math.hypot(x-p[0],z-p[1])<30))continue;
      const offset=profile.driveWidth/2+profile.pavementWidth+1.2;
      for(const side of [-1,1]) {
        posts.push(Object.freeze({x:x-dz*offset*side,z:z+dx*offset*side,roadId:road.id,sourceId:road.sourceId||String(road.id),estimated:true,decorative:true}));
        if(posts.length===96)return posts;
      }
    }
  }
  return posts;
}
