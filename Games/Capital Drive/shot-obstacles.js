import { coveredCentrePassage } from './covered-passage.js';
import { CAPITAL_BY_ID as BY_ID } from '../../assets/car-arcade/fleet.js';
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
  const roomBoundaries=new WeakMap();
  const cellSize=64,cells=new Map(),removable=new Map(),replaced=new Set(map.collisionReplacedBuildingIds||[]);
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
    if(polygon.destructible===true)removable.set(polygon.id,solid);
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
      if(room.footprint?.length>=3) {
        let rings=roomBoundaries.get(room);
        if(!rings) {
          rings=[room.footprint,...(room.footprintHoles||[]).map(ring=>ring.points||ring)].map(ring=>ring.map(p=>[p.x,p.z]));
          roomBoundaries.set(room,rings);
        }
        if(!inside(...local,rings[0])||rings.slice(1).some(ring=>inside(...local,ring)))nearest=0;
        for(const ring of rings)for(let i=0;i<ring.length;i++) {
          const a=ring[i],b=ring[(i+1)%ring.length],ex=b[0]-a[0],ez=b[1]-a[1],cross=direction[0]*ez-direction[1]*ex;
          if(Math.abs(cross)<EPS)continue;
          const x=a[0]-local[0],z=a[1]-local[1],t=(x*ez-z*ex)/cross,u=(x*direction[1]-z*direction[0])/cross;
          if(t>=0&&u>=0&&u<=1)nearest=Math.min(nearest,t);
        }
      } else for(const [axis,lo,hi] of [[0,-room.width/2,room.width/2],[1,0,room.depth]]) {
        if(direction[axis]>EPS)nearest=Math.min(nearest,Math.max(0,(hi-local[axis])/direction[axis]));
        if(direction[axis]<-EPS)nearest=Math.min(nearest,Math.max(0,(lo-local[axis])/direction[axis]));
      }
    } else {
      const endX=ray.x+ray.dx*ray.range,endZ=ray.z+ray.dz*ray.range,found=new Set();
      for(let x=Math.floor(Math.min(ray.x,endX)/cellSize);x<=Math.floor(Math.max(ray.x,endX)/cellSize);x++)for(let z=Math.floor(Math.min(ray.z,endZ)/cellSize);z<=Math.floor(Math.max(ray.z,endZ)/cellSize);z++)for(const solid of cells.get(`${x},${z}`)||[])found.add(solid);
      for(const solid of found) {
        if(solid.removed)continue;
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
  function setBarrierDestroyed(id,destroyed) {
    const solid=removable.get(id);
    if(!solid||typeof destroyed!=='boolean'||Boolean(solid.removed)===destroyed)return false;
    solid.removed=destroyed;
    return true;
  }
  const segmentDistance=(x,z,a,b)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
  };
  function ringDistance(x,z,ring){
    let nearest=Infinity;
    for(let i=0;i<ring.length;i++)nearest=Math.min(nearest,segmentDistance(x,z,ring[i],ring[(i+1)%ring.length]));
    return nearest;
  }
  function overlapsBody(x,z,radius,solid){
    if(!inside(x,z,solid.points)&&ringDistance(x,z,solid.points)>=radius-EPS)return false;
    return !solid.holes.some(ring=>inside(x,z,ring)&&ringDistance(x,z,ring)>=radius-EPS);
  }
  function bodySolids(x,z,radius){
    const found=new Set();
    for(let cx=Math.floor((x-radius)/cellSize);cx<=Math.floor((x+radius)/cellSize);cx++)
      for(let cz=Math.floor((z-radius)/cellSize);cz<=Math.floor((z+radius)/cellSize);cz++)
        for(const solid of cells.get(`${cx},${cz}`)||[])if(!solid.removed)found.add(solid);
    return found;
  }
  function solidSurface(solid,x,z,radius=0){
    const p=solid.plane;
    const plane=p?p.y+(x-p.x)*p.gx+(z-p.z)*p.gz:0;
    const slope=p?Math.hypot(p.gx,p.gz)*radius:0;
    return {bottom:plane+solid.bottom-slope,top:plane+solid.top+slope};
  }
  function vehicleSolid(vehicle){
    if(!vehicle||vehicle.active===false||![vehicle.x,vehicle.z].every(Number.isFinite))return null;
    const model=BY_ID[vehicle.modelId],dimension=(key,fallback)=>Number.isFinite(vehicle[key])&&vehicle[key]>0?vehicle[key]:model?.[key]||fallback;
    const width=dimension('width',1.9),length=dimension('length',4.8),yaw=vehicle.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
    const bottom=Number.isFinite(vehicle.y)?vehicle.y:(vehicleHeightAt?vehicleHeightAt(vehicle,vehicle.edge?.road):heightAt(vehicle.x,vehicle.z))+.18;
    return {points:[[-width/2,-length/2],[width/2,-length/2],[width/2,length/2],[-width/2,length/2]].map(([x,z])=>[vehicle.x+c*x+s*z,vehicle.z-s*x+c*z]),holes:[],bottom,
      top:bottom+dimension('height',vehicle.kind==='bus'?3:1.6)};
  }
  function validBody(pose,radius,height){
    return pose&&[pose.x,pose.z,pose.y,radius,height].every(Number.isFinite)&&radius>0&&radius<=2&&height>0&&height<=5;
  }
  function canOccupyBody(pose,{fromY=pose?.y,radius=.45,height=1.8,vehicles=[],ignoreId=null}={}){
    if(!validBody(pose,radius,height)||!Number.isFinite(fromY))return false;
    const bounds=map.bounds;
    if(bounds&&(pose.x-radius<bounds.minX||pose.x+radius>bounds.maxX||pose.z-radius<bounds.minZ||pose.z+radius>bounds.maxZ))return false;
    const low=Math.min(fromY,pose.y),high=Math.max(fromY,pose.y)+height;
    if(low<groundHeightAt(pose.x,pose.z)-.001)return false;
    const blocked=solid=>{
      if(!overlapsBody(pose.x,pose.z,radius,solid))return false;
      const surface=solidSurface(solid,pose.x,pose.z,radius);
      return high>surface.bottom+EPS&&low<surface.top-EPS;
    };
    for(const solid of bodySolids(pose.x,pose.z,radius))if(blocked(solid))return false;
    for(const vehicle of vehicles){
      if(vehicle?.id===ignoreId||(vehicle?.interiorId||null))continue;
      const solid=vehicleSolid(vehicle);if(solid&&blocked(solid))return false;
    }
    return true;
  }
  function moveBody(actor,dx,dz,{y,fromY=y,radius=.45,height=1.8,vehicles=[],ignoreId=null}={}){
    if(!actor||![actor.x,actor.z,dx,dz,y,fromY].every(Number.isFinite)||!validBody({x:actor.x,z:actor.z,y},radius,height))return {blocked:true,moved:false,distance:0};
    const beforeX=actor.x,beforeZ=actor.z,length=Math.hypot(dx,dz),scale=length>8?8/length:1;
    dx*=scale;dz*=scale;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.min(.2,radius*.5)));
    let blocked=scale<1;
    const clear=(x,z)=>canOccupyBody({x,z,y},{fromY,radius,height,vehicles,ignoreId});
    for(let i=0;i<steps;i++){
      const x=actor.x+dx/steps,z=actor.z+dz/steps;
      if(clear(x,z)){actor.x=x;actor.z=z;}
      else{blocked=true;if(clear(x,actor.z))actor.x=x;else if(clear(actor.x,z))actor.z=z;}
    }
    const distance=Math.hypot(actor.x-beforeX,actor.z-beforeZ);
    return {blocked,moved:distance>.00001,distance,x:actor.x,z:actor.z};
  }
  function supportHeightAt(x,z,{y,fromY=y,radius=.45,vehicles=[]}={}){
    if(![x,z,y,fromY,radius].every(Number.isFinite)||radius<=0||radius>2)return NaN;
    let support=groundHeightAt(x,z);
    const ceiling=Math.max(y,fromY)+.001;
    const consider=solid=>{
      if(!inside(x,z,solid.points)||solid.holes.some(ring=>inside(x,z,ring)))return;
      const top=solidSurface(solid,x,z,radius).top;
      if(top<=ceiling&&top>support)support=top;
    };
    for(const solid of bodySolids(x,z,radius))consider(solid);
    for(const vehicle of vehicles){const solid=vehicleSolid(vehicle);if(solid)consider(solid);}
    return support;
  }
  return {trace,traceHit,canOccupyBody,moveBody,supportHeightAt,setBarrierDestroyed,removeBarrier:id=>setBarrierDestroyed(id,true)};
}
