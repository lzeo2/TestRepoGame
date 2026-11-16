import { coveredCentrePassage } from './covered-passage.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';
// One immutable broad phase for world solids. Rooms remain lazy, owned by interiors.
const EPS = 1e-8;
function inside(x,z,points) {
  let result=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
export function rayBoxDistance(ray,box) {
  const c=Math.cos(box.yaw||0),s=Math.sin(box.yaw||0),x=ray.x-box.x,z=ray.z-box.z;
  const origin=[c*x-s*z,ray.y-(box.y||0),s*x+c*z];
  const direction=[c*ray.dx-s*ray.dz,ray.dy,s*ray.dx+c*ray.dz];
  const low=[-box.width/2,0,-box.depth/2],high=[box.width/2,box.height,box.depth/2];
  let lo=0,hi=ray.range;
  for(let axis=0;axis<3;axis++) {
    if(Math.abs(direction[axis])<EPS){if(origin[axis]<low[axis]||origin[axis]>high[axis])return Infinity;}
    else {
      const a=(low[axis]-origin[axis])/direction[axis],b=(high[axis]-origin[axis])/direction[axis];
      lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
      if(lo>hi)return Infinity;
    }
  }
  return lo;
}
function rayPrismDistance(ray,solid) {
  const contains=(x,z)=>inside(x,z,solid.points)&&!solid.holes.some(points=>inside(x,z,points));
  const candidates=[0,ray.range];
  if(Math.abs(ray.dy)>EPS)for(const y of [solid.bottom,solid.top])candidates.push((y-ray.y)/ray.dy);
  for(const ring of [solid.points,...solid.holes])for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[j],b=ring[i],sx=b[0]-a[0],sz=b[1]-a[1],cross=ray.dx*sz-ray.dz*sx;
    if(Math.abs(cross)<EPS)continue;
    const tx=a[0]-ray.x,tz=a[1]-ray.z,t=(tx*sz-tz*sx)/cross,u=(tx*ray.dz-tz*ray.dx)/cross;
    if(u>=0&&u<=1)candidates.push(t);
  }
  candidates.sort((a,b)=>a-b);
  // Test immediately after every surface: a grazing edge does not become a wall.
  for(const t of candidates)if(t>=0&&t<=ray.range) {
    const test=Math.min(ray.range,t+.00001),y=ray.y+ray.dy*test;
    if(y>=solid.bottom-EPS&&y<=solid.top+EPS&&contains(ray.x+ray.dx*test,ray.z+ray.dz*test))return t;
  }
  return Infinity;
}
export function createShotObstacles(map,{heightAt=()=>0,groundHeightAt=heightAt,vehicleHeightAt=null,bridgeSegments=[]}={}) {
  const cellSize=64,cells=new Map(),replaced=new Set(map.collisionReplacedBuildingIds||[]);
  function insertSolid(solid) {
    const xs=solid.points.map(p=>p[0]),zs=solid.points.map(p=>p[1]);
    for(let x=Math.floor(Math.min(...xs)/cellSize);x<=Math.floor(Math.max(...xs)/cellSize);x++)
      for(let z=Math.floor(Math.min(...zs)/cellSize);z<=Math.floor(Math.max(...zs)/cellSize);z++) {
        const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(solid);
      }
  }
  const passage=coveredCentrePassage(map);
  const polygons=[...(map.buildings||[]),...(map.barriers||[])].flatMap(polygon=>{
    if(polygon!==passage?.building)return [polygon];
    const heights=polygon.points.map(p=>heightAt(...p)),base=Math.max(...heights)+.12;
    const bottom=Math.min(...heights)-.3,clearance=base+passage.clearance;
    return [...passage.groundParts.map(part=>({...part,y:bottom,height:clearance-bottom})),
      {...polygon,y:clearance,height:base+polygon.height-clearance}];
  });
  for(const polygon of polygons) {
    const points=polygon.points;
    if(!points||points.length<3||replaced.has(polygon.id))continue;
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const bottom=Number.isFinite(polygon.y)?polygon.y:heightAt((minX+maxX)/2,(minZ+maxZ)/2);
    const top=bottom+(polygon.height||3);
    const solid={points,holes:(polygon.innerRings||[]).map(ring=>ring.points||ring),bottom:polygon.type==='roof'?top-.2:bottom,top};
    insertSolid(solid);
  }
  // The same prepared source deck profiles used for road rendering provide
  // overhead cover. A sloped local Y transform avoids flat stair-step hitboxes.
  for(const segment of bridgeSegments) {
    if(!segment?.a||!segment.b||![segment.y0,segment.y1,segment.radius].every(Number.isFinite))continue;
    const dx=segment.b[0]-segment.a[0],dz=segment.b[1]-segment.a[1],length=Math.hypot(dx,dz);
    if(length<=EPS)continue;
    const nx=-dz/length*segment.radius,nz=dx/length*segment.radius,slope=(segment.y1-segment.y0)/(length*length);
    insertSolid({points:[[segment.a[0]+nx,segment.a[1]+nz],[segment.b[0]+nx,segment.b[1]+nz],
      [segment.b[0]-nx,segment.b[1]-nz],[segment.a[0]-nx,segment.a[1]-nz]],holes:[],bottom:-.35,top:.083,
      plane:{x:segment.a[0],z:segment.a[1],y:segment.y0,gx:dx*slope,gz:dz*slope}});
  }
  function traceHit(ray,room=null,vehicles=[]) {
    if(![ray.x,ray.y,ray.z,ray.dx,ray.dy,ray.dz,ray.range].every(Number.isFinite)||ray.range<=0)return {distance:0,vehicleId:null};
    let nearest=ray.range,vehicleId=null;
    if(room) {
      if((ray.interiorId||null)!==room.id)return {distance:0,vehicleId:null};
      for(const box of [...room.walls,...room.furniture])nearest=Math.min(nearest,rayBoxDistance(ray,box));
      // Room floors and ceilings are solid even when the ray passes above low furniture.
      if(ray.dy<-EPS)nearest=Math.min(nearest,Math.max(0,(room.floorY-ray.y)/ray.dy));
      if(ray.dy>EPS)nearest=Math.min(nearest,Math.max(0,(room.floorY+2.65-ray.y)/ray.dy));
      // The exterior behind an open doorway is a separate space, never a second room target.
      const c=Math.cos(room.origin.yaw),s=Math.sin(room.origin.yaw),x=ray.x-room.origin.x,z=ray.z-room.origin.z;
      const local=[c*x-s*z,s*x+c*z],direction=[c*ray.dx-s*ray.dz,s*ray.dx+c*ray.dz];
      for(const [axis,lo,hi] of [[0,-room.width/2,room.width/2],[1,0,room.depth]]) {
        if(direction[axis]>EPS)nearest=Math.min(nearest,Math.max(0,(hi-local[axis])/direction[axis]));
        if(direction[axis]<-EPS)nearest=Math.min(nearest,Math.max(0,(lo-local[axis])/direction[axis]));
      }
    } else {
      const endX=ray.x+ray.dx*ray.range,endZ=ray.z+ray.dz*ray.range,found=new Set();
      for(let x=Math.floor(Math.min(ray.x,endX)/cellSize);x<=Math.floor(Math.max(ray.x,endX)/cellSize);x++)for(let z=Math.floor(Math.min(ray.z,endZ)/cellSize);z<=Math.floor(Math.max(ray.z,endZ)/cellSize);z++)for(const solid of cells.get(`${x},${z}`)||[])found.add(solid);
      for(const solid of found) {
        const p=solid.plane;
        const local=p?{...ray,y:ray.y-p.y-(ray.x-p.x)*p.gx-(ray.z-p.z)*p.gz,dy:ray.dy-ray.dx*p.gx-ray.dz*p.gz}:ray;
        nearest=Math.min(nearest,rayPrismDistance(local,solid));
      }
      const above=t=>ray.y+ray.dy*t-groundHeightAt(ray.x+ray.dx*t,ray.z+ray.dz*t);
      let previous=0;
      for(let t=.5;t<nearest+.5;t+=.5) {
        const current=Math.min(t,nearest);
        if(above(current)<=0) {
          let lo=previous,hi=current;
          for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(above(mid)>0)lo=mid;else hi=mid;}
          nearest=hi;break;
        }
        previous=current;
      }
    }
    // Vehicle descriptors are live inputs to the firing attempt, never cached poses.
    const ignored=new Set(ray.ignoreVehicleIds||[]),seen=new Set();
    for(const vehicle of vehicles) {
      if(!vehicle || vehicle.active===false || ignored.has(vehicle.id) || seen.has(vehicle.id) ||
        (vehicle.interiorId||null)!==(ray.interiorId||null) || ![vehicle.x,vehicle.z].every(Number.isFinite))continue;
      if(vehicle.id!==undefined)seen.add(vehicle.id);
      const model=BY_ID[vehicle.modelId];
      const dimension=(name,fallback)=>Number.isFinite(vehicle[name])&&vehicle[name]>0?vehicle[name]:model?.[name]||fallback;
      const id=String(vehicle.id||'');
      const height=dimension('height',vehicle.kind==='aircraft'||id.startsWith('jet:')?2.8:vehicle.kind==='bus'||id.startsWith('bus:')?3:1.6);
      const distance=rayBoxDistance(ray,{x:vehicle.x,z:vehicle.z,yaw:Number.isFinite(vehicle.yaw)?vehicle.yaw:0,
        y:Number.isFinite(vehicle.y)?vehicle.y:(vehicleHeightAt?vehicleHeightAt(vehicle,vehicle.edge?.road):heightAt(vehicle.x,vehicle.z))+.18,
        width:dimension('width',1.9),depth:dimension('length',4.8),height});
      if(distance<nearest){nearest=distance;vehicleId=vehicle.id??null;}
    }
    return {distance:nearest===ray.range?nearest:Math.max(0,nearest-.005),vehicleId};
  }
  const trace=(ray,room=null,vehicles=[])=>traceHit(ray,room,vehicles).distance;
  return {trace,traceHit};
}
