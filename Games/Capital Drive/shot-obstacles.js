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
export function createShotObstacles(map,{heightAt=()=>0}={}) {
  const cellSize=64,cells=new Map(),replaced=new Set(map.collisionReplacedBuildingIds||[]);
  for(const polygon of [...(map.buildings||[]),...(map.barriers||[])]) {
    const points=polygon.points;
    if(!points||points.length<3||replaced.has(polygon.id))continue;
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const bottom=Number.isFinite(polygon.y)?polygon.y:heightAt((minX+maxX)/2,(minZ+maxZ)/2);
    const top=bottom+(polygon.height||3);
    const solid={points,holes:(polygon.innerRings||[]).map(ring=>ring.points||ring),bottom:polygon.type==='roof'?top-.2:bottom,top};
    for(let x=Math.floor(minX/cellSize);x<=Math.floor(maxX/cellSize);x++)for(let z=Math.floor(minZ/cellSize);z<=Math.floor(maxZ/cellSize);z++) {
      const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(solid);
    }
  }
  function trace(ray,room=null) {
    if(![ray.x,ray.y,ray.z,ray.dx,ray.dy,ray.dz,ray.range].every(Number.isFinite)||ray.range<=0)return 0;
    let nearest=ray.range;
    if(room) {
      if((ray.interiorId||null)!==room.id)return 0;
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
      for(const solid of found)nearest=Math.min(nearest,rayPrismDistance(ray,solid));
      const above=t=>ray.y+ray.dy*t-heightAt(ray.x+ray.dx*t,ray.z+ray.dz*t);
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
    return nearest===ray.range?nearest:Math.max(0,nearest-.005);
  }
  return {trace};
}
