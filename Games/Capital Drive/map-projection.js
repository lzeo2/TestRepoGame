import {roadProfile} from './road-network.js';

export function createMapProjection(bounds, width, height, view = {}) {
  const scale = Math.min((width - 50) / (bounds.maxX - bounds.minX), (height - 50) / (bounds.maxZ - bounds.minZ)) * (view.zoom || 1);
  const cx = view.x ?? (bounds.minX + bounds.maxX) / 2;
  const cz = view.z ?? (bounds.minZ + bounds.maxZ) / 2;
  return {
    scale, cx, cz, width, height,
    toCanvas(x, z) { return { x: (x - cx) * scale + width / 2, y: (z - cz) * scale + height / 2 }; },
    toWorld(x, y) { return { x: (x - width / 2) / scale + cx, z: (y - height / 2) / scale + cz }; },
  };
}

export function mapPointFromClient(projection, rect, clientX, clientY, bounds) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const point = projection.toWorld((clientX - rect.left) * projection.width / rect.width, (clientY - rect.top) * projection.height / rect.height);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return null;
  const tolerance = 1e-6;
  if (point.x < bounds.minX - tolerance || point.x > bounds.maxX + tolerance || point.z < bounds.minZ - tolerance || point.z > bounds.maxZ + tolerance) return null;
  return { x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)), z: Math.max(bounds.minZ, Math.min(bounds.maxZ, point.z)) };
}

// Detail plans are built only on first high-zoom use, and released with the map.
// Composed maps are immutable at this boundary; replacing source arrays replans.
const detailPlans = new WeakMap();
const DETAIL_CELL = 256;
const pointValid=p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
function detailPlan(map, railRoutes) {
  const inputs=[map.roads,map.buildings,map.areas,map.anuCampus?.pedestrianPaths,railRoutes];
  const cached=detailPlans.get(map);
  if(cached&&inputs.every((value,i)=>cached.inputs[i]===value))return cached;
  const grid=new Map(),large=[];
  function add(item) {
    const points=item.points;if(points.length<2||!points.every(pointValid))return;
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const [x,z]of points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
    const pad=item.width?item.width/2+3:0;
    Object.assign(item,{minX:minX-pad,maxX:maxX+pad,minZ:minZ-pad,maxZ:maxZ+pad});
    const x0=Math.floor(item.minX/DETAIL_CELL),x1=Math.floor(item.maxX/DETAIL_CELL),z0=Math.floor(item.minZ/DETAIL_CELL),z1=Math.floor(item.maxZ/DETAIL_CELL);
    if((x1-x0+1)*(z1-z0+1)>256){large.push(item);return;}
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      const key=`${x}:${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);
    }
  }
  for(const area of map.areas||[])add({kind:'area',points:area.points||[],source:area});
  for(const building of map.buildings||[])add({kind:'building',points:building.points||[],source:building});
  function segments(items,kind) {
    for(const source of items||[]){
      if(kind==='rail'&&!source.direction)continue;
      const points=source.points||[],width=kind==='road'?roadProfile(source).driveWidth:kind==='path'?(source.width||6):2;
      for(let i=1;i<points.length;i++)if(pointValid(points[i-1])&&pointValid(points[i]))add({kind,source,width,points:[points[i-1],points[i]]});
    }
  }
  segments(map.roads,'road');segments(map.anuCampus?.pedestrianPaths,'path');segments(railRoutes,'rail');
  const plan={inputs,grid,large};detailPlans.set(map,plan);return plan;
}

const EMPTY_RAIL_ROUTES=Object.freeze([]);
// Canvas-only source geometry. Navigation, labels, selection and pins stay caller-owned.
export function drawMapDetail(ctx,map,projection,railRoutes=EMPTY_RAIL_ROUTES) {
  const {width,height,scale}=projection;
  if(!(width>0&&height>0&&Number.isFinite(scale)&&scale>0))return {candidates:0,drawn:0,segments:0};
  const a=projection.toWorld(-32,-32),b=projection.toWorld(width+32,height+32);
  const view={minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};
  if(!Object.values(view).every(Number.isFinite))return {candidates:0,drawn:0,segments:0};
  const plan=detailPlan(map,railRoutes),candidates=new Set(plan.large);
  for(let x=Math.floor(view.minX/DETAIL_CELL);x<=Math.floor(view.maxX/DETAIL_CELL);x++)for(let z=Math.floor(view.minZ/DETAIL_CELL);z<=Math.floor(view.maxZ/DETAIL_CELL);z++){
    for(const item of plan.grid.get(`${x}:${z}`)||[])candidates.add(item);
  }
  const visible=[...candidates].filter(o=>o.maxX>=view.minX&&o.minX<=view.maxX&&o.maxZ>=view.minZ&&o.minZ<=view.maxZ);
  const stats={candidates:candidates.size,drawn:visible.length,segments:0};
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  ctx.fillStyle='#dfdfcc';ctx.fillRect(0,0,width,height);
  ctx.lineJoin='round';ctx.lineCap='round';
  function path(points,begin=true,closed=false) {
    if(begin)ctx.beginPath();
    points.forEach(([x,z],i)=>{const p=projection.toCanvas(x,z);ctx[i?'lineTo':'moveTo'](p.x,p.y);});
    if(closed)ctx.closePath();
  }
  for(const kind of ['area','building'])for(const item of visible)if(item.kind===kind){
    path(item.points,true,true);
    for(const hole of item.source.innerRings||[]){const points=hole.points||hole;if(points.length>=3&&points.every(pointValid))path(points,false,true);}
    ctx.fillStyle=kind==='building'?'#bfc1b3':item.source.type==='water'?'#9ab7ba':'#bbca9b';ctx.fill('evenodd');
    if(kind==='building'){ctx.strokeStyle='#939b8b';ctx.lineWidth=.75;ctx.stroke();}
  }
  function lines(kind,tint,extra,minWidth) {
    ctx.strokeStyle=tint;
    for(const item of visible)if(item.kind===kind){path(item.points);ctx.lineWidth=Math.max(minWidth,item.width*scale+extra);ctx.stroke();}
  }
  lines('path','#c7c0ad',0,1);
  lines('road','#c1c4b9',1.2,1.2);lines('road','#fffef3',0,.65);
  // Rail is an overlay, as on the retained raster, rather than a navigation route.
  ctx.strokeStyle='#a24342';ctx.lineWidth=2;
  for(const item of visible)if(item.kind==='rail'){path(item.points);ctx.stroke();}
  stats.segments=visible.filter(o=>o.kind==='road'||o.kind==='path'||o.kind==='rail').length;
  ctx.restore();return stats;
}
