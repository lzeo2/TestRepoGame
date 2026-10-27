// Original map data and CPU geography. No upstream implementation or runtime imports.
import {compileGeometry,clearanceBounds} from '../fleet-geometry.mjs';
export const WORLD_SIZE = 10000, WORLD_HALF = 5000, MESH_CELL = 25, CEILING = 3500;
export const SEA_FLOOR = -240, WATER_LEVEL = 0;
const clone = x => structuredClone(x);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const point = p => Array.isArray(p) && p.length === 3 && p.every(finite);
const land = (x,z,rx,rz,height,shape='ellipse') => ({x,z,rx,rz,height,shape});
const runway = (team,x,z,y) => ({team,center:[x,y,z],heading:0,runwayLength:1400,runwayWidth:80,safeRadius:0,
  helipads:Array.from({length:6},(_,i)=>[x+100,y,z+500-i*160])});
const definitions = [
  {id:'island-archipelago',name:'Lantern Archipelago',
    terrain:[land(-3500,-2400,1250,1700,120),land(3500,2400,1250,1700,120),
      land(-2350,550,900,1050,410),land(2350,-550,900,1050,360),
      land(-200,3300,750,650,180),land(200,-3300,750,650,220)],
    shelves:[land(-3500,1300,900,500,-45),land(3500,-1300,900,500,-45)],
    runways:[runway(0,-3500,-2400,120),runway(1,3500,2400,120)],
    airRoutes:[{id:'channel-sweep',points:[[-3500,500,-3600],[-600,240,-2000],[0,240,0],[600,240,2000],[3500,500,3600]]},
      {id:'outer-flank',points:[[-3500,600,-3600],[-4400,650,0],[-3000,650,3000],[3500,650,3600]]}],
    patrolX:900, capitalX:550, escortX:0},
  {id:'fjord-coast',name:'Ridgewater Fjords',
    terrain:[land(-4300,0,700,5000,220,'box'),land(-3300,-2450,1750,650,780,'box'),
      land(-3300,0,1750,650,1050,'box'),land(-3300,2450,1750,650,880,'box'),
      land(3500,2600,1200,1600,160)],
    shelves:[land(-2600,1250,1000,450,-45),land(-2600,-1250,1000,450,-45)],
    runways:[runway(0,-4300,0,220),runway(1,3500,2600,160)],
    airRoutes:[{id:'fjord-ingress',points:[[-4300,400,-900],[-2800,300,-1250],[-1000,300,-1250],[1000,400,0],[3500,500,3600]]},
      {id:'ridge-crossing',points:[[-4300,1400,900],[-2500,1400,0],[0,1400,0],[3500,1400,1800]]}],
    patrolX:1050, capitalX:650, escortX:0},
  {id:'coastal-strait',name:'Longwatch Strait',
    terrain:[land(-3800,0,1900,5500,240),land(3800,0,1900,5500,240),
      land(0,3100,600,600,180)],
    shelves:[land(-1600,-2400,250,700,-45),land(1600,2400,250,700,-45)],
    runways:[runway(0,-3800,-1800,240),runway(1,3800,1800,240)],
    airRoutes:[{id:'strait-intercept',points:[[-3800,500,-2800],[-1000,260,-1800],[1000,260,1800],[3800,500,2800]]},
      {id:'north-island-flank',points:[[-3800,700,-2800],[-1300,700,3300],[1300,700,3300],[3800,700,2800]]}],
    patrolX:1200, capitalX:700, escortX:0},
];
export const MAP_IDS = Object.freeze(definitions.map(d=>d.id));

function checkedPoint(p) {
  if(!point(p)||Math.abs(p[0])>WORLD_HALF||Math.abs(p[2])>WORLD_HALF||Math.abs(p[1])>10000)
    throw new TypeError('Finite in-map [x,y,z] required');
}
// Slab clipping is exact for the deliberately conservative FC obstruction boxes.
function intersects(a,b,min,max) {
  let lo=0,hi=1;
  for(let i=0;i<3;i++) {
    const d=b[i]-a[i];
    if(Math.abs(d)<1e-12) { if(a[i]<min[i]||a[i]>max[i])return false; }
    else { const u=(min[i]-a[i])/d,v=(max[i]-a[i])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v)); }
  }
  return lo<=hi;
}

export function createMap(id,seed=0) {
  const source=definitions.find(d=>d.id===id);
  if(!source||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new TypeError('Known map and uint32 seed required');
  const d=clone(source),n=WORLD_SIZE/MESH_CELL,stride=n+1,features=[...d.terrain,...d.shelves];
  let mesh;
  const obstacles=features.map(r=>({
    min:[Math.max(-WORLD_HALF,r.x-r.rx-MESH_CELL),SEA_FLOOR-1,Math.max(-WORLD_HALF,r.z-r.rz-MESH_CELL)],
    max:[Math.min(WORLD_HALF,r.x+r.rx+MESH_CELL),r.height+(r.height>0?64:0),Math.min(WORLD_HALF,r.z+r.rz+MESH_CELL)]}));
  const arena={minX:-WORLD_HALF,maxX:WORLD_HALF,minZ:-WORLD_HALF,maxZ:WORLD_HALF,bottomY:SEA_FLOOR,cell:100,obstacles};
  function rawHeight(x,z) {
    let h=SEA_FLOOR;
    for(const r of features) {
      const a=Math.abs(x-r.x)/r.rx,b=Math.abs(z-r.z)/r.rz;
      const edge=1-(r.shape==='box'?Math.max(a,b):Math.hypot(a,b));
      if(edge<=0)continue;
      const ramp=Math.min(1,edge/.25);
      // Seed changes inland relief only; coast envelopes, staging and runways remain safe.
      const phase=(seed%65521)*.001;
      const relief=r.height>0?Math.min(64,r.height*.08)*Math.sin(x*.003+phase)*Math.sin(z*.002-phase):0;
      h=Math.max(h,SEA_FLOOR+(r.height+relief-SEA_FLOOR)*ramp);
    }
    for(const r of d.runways)if(Math.abs(x-r.center[0])<=175&&Math.abs(z-r.center[2])<=850)h=r.center[1];
    return h;
  }
  function worldMesh() {
    if(!mesh) {
      const h=new Float32Array(stride*stride),vx=new Float32Array(h.length),vz=new Float32Array(h.length);
      const diag=new Uint8Array(n*n); // 0: a,c,b / b,c,d, matching the inspected tile-gen ABI.
      for(let j=0;j<=n;j++)for(let i=0;i<=n;i++) {
        const k=j*stride+i,x=-WORLD_HALF+i*MESH_CELL,z=-WORLD_HALF+j*MESH_CELL;
        vx[k]=x;vz[k]=z;h[k]=rawHeight(x,z);
      }
      mesh={n,stride,cell:MESH_CELL,h,vx,vz,diag,bakeMs:0};
    }
    return mesh; // Shared read-only buffers, like the existing geography API.
  }
  function terrainMeshHeight(x,z) {
    if(!finite(x)||!finite(z))throw new TypeError('Finite terrain coordinates required');
    if(Math.abs(x)>WORLD_HALF||Math.abs(z)>WORLD_HALF)return SEA_FLOOR;
    const m=worldMesh(),gx=(x+WORLD_HALF)/MESH_CELL,gz=(z+WORLD_HALF)/MESH_CELL;
    const i=Math.min(n-1,Math.floor(gx)),j=Math.min(n-1,Math.floor(gz)),u=gx-i,v=gz-j,k=j*stride+i;
    return u+v<=1?m.h[k]+u*(m.h[k+1]-m.h[k])+v*(m.h[k+stride]-m.h[k]):
      m.h[k+stride+1]+(1-u)*(m.h[k+stride]-m.h[k+stride+1])+(1-v)*(m.h[k+1]-m.h[k+stride+1]);
  }
  function onRunway(x,z) {
    if(!finite(x)||!finite(z))throw new TypeError('Finite runway coordinates required');
    return d.runways.some(r=>Math.abs(x-r.center[0])<=r.runwayWidth/2&&Math.abs(z-r.center[2])<=r.runwayLength/2);
  }
  function heightBound(x,z) {
    if(!finite(x)||!finite(z))throw new TypeError('Finite bound coordinates required');
    if(Math.abs(x)>WORLD_HALF||Math.abs(z)>WORLD_HALF)return 0;
    // ponytail: whole-map conservative bound; use per-tile maxima if terrain marching cost matters.
    return Math.max(...d.terrain.map(r=>r.height+64));
  }
  function surfaceType(x,z) {
    if(onRunway(x,z))return 'paved';
    const h=terrainMeshHeight(x,z);
    return h<=0?'water':h<4?'sand':h>600?'rock':h>120?'forest':'grass';
  }
  function spawnPoint(team,kind,index=0) {
    if(![0,1].includes(team)||!['fighter','apache','warthog','blackbird','bomber','f15','f35'].includes(kind)||
      !Number.isInteger(index)||index<0||index>=6)throw new TypeError('Aircraft/team and free land slot 0..5 required');
    const r=d.runways[team],heli=kind==='apache',p=heli?r.helipads[index]:[r.center[0],r.center[1],r.center[2]+500-index*160];
    return {position:[p[0],p[1]+(heli?1.9:2.2),p[2]],yaw:0,onGround:true};
  }
  function navigable(from,to,half=[0,0,0],kind='surface') {
    checkedPoint(from);checkedPoint(to);
    if(!point(half)||half.some(n=>n<0||n>500)||!['surface','sub'].includes(kind))throw new TypeError('Bounded hull half extents and medium required');
    return clears(from,to,{min:half.map(v=>-v),max:half},kind);
  }
  function clears(from,to,b,kind) {
    return [from,to].every(p=>p[0]+b.min[0]>=-WORLD_HALF&&p[0]+b.max[0]<=WORLD_HALF&&
      p[2]+b.min[2]>=-WORLD_HALF&&p[2]+b.max[2]<=WORLD_HALF&&p[1]+b.min[1]>SEA_FLOOR&&
      (kind==='surface'?p[1]===0:p[1]<=0))&&
      !obstacles.some(o=>intersects(from,to,o.min.map((v,i)=>v-b.max[i]),o.max.map((v,i)=>v-b.min[i])));
  }
  const staging=[];
  for(const team of [0,1]) {
    const side=team?1:-1;
    for(const [role,x,z] of [['capital',d.capitalX,-1400],['escort',d.escortX,-700],['sub',d.patrolX,1400]]) {
      const y=role==='sub'?SEA_FLOOR*.65:0;
      staging.push({id:`${role}${team}`,team,kind:role==='sub'?'sub':'surface',capital:role==='capital',
        position:[side*x,y,side*z],route:[[side*x,y,side*-z],[side*x,y,side*z]],
        depth:role==='sub'?'deep':'surfaced'});
    }
  }
  let deployment=null;
  function navigation() {
    const active=deployment??staging;
    return {surfaceRoutes:clone(active.filter(s=>s.kind==='surface')),
      submarineCorridors:active.filter(s=>s.kind==='sub').map(s=>({team:s.team,centerline:clone(s.route),halfWidth:75,
        depthCenters:{surfaced:0,shallow:SEA_FLOOR*.25,deep:SEA_FLOOR*.65},maxHullHalf:[20,15,80]}))};
  }
  function placeFleet(mode,units,geometry=[]) {
    if(mode!=='factions')return null; // Do not inspect ordinary-mode profiles or geometry.
    if(!Array.isArray(geometry)||geometry.length>12)throw new TypeError('Bounded measured geometry array required');
    const models=new Map();
    for(const entry of geometry) {
      if(!entry||Object.keys(entry).some(k=>!['id','descriptor'].includes(k))||typeof entry.id!=='string'||
        !/^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/.test(entry.id)||models.has(entry.id))throw new TypeError('Unique measured geometry identity required');
      const descriptor=entry.descriptor;
      if(descriptor?.static_bounds_root&&!descriptor.continuous_swept_bounds_root)throw new TypeError('Continuous swept bounds required with static bounds');
      models.set(entry.id,compileGeometry(descriptor));
    }
    if(!Array.isArray(units)||![2,4,6].includes(units.length))throw new TypeError('Six roles or symmetric measured surface pairs required');
    const surfaceSlice=units.length!==6;
    if(surfaceSlice&&units.some(u=>!u||u.kind!=='surface'||u.modelId===undefined))throw new TypeError('Surface slice needs explicit measured profiles');
    const used=new Set(),envelopes=[];
    const fitted=units.map(unit=>{
      const slot=staging.find(s=>unit&&s.team===unit.team&&s.kind===unit.kind&&s.capital===unit.capital);
      if(!slot||used.has(slot.id))throw new TypeError('Unique matching fleet roles required');
      used.add(slot.id);
      if(!point(unit.half))throw new TypeError('Hull half extents required');
      if(!finite(unit.speed)||unit.speed<0||unit.speed>30||!Array.isArray(unit.weapons)||
        unit.weapons.some(w=>!w||!finite(w.range)||w.range<1))throw new TypeError('Valid fleet speed/weapon reach required');
      const half=unit.half,g=models.get(unit.modelId);
      if(unit.modelId!==undefined&&!g)throw new TypeError('Missing measured model geometry');
      let bounds,interunitHalf,radius;
      if(g) {
        const full=clearanceBounds(g,0);radius=Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]);
        bounds={min:[-radius,full.min[1],-radius],max:[radius,full.max[1],radius]};
        interunitHalf=[radius,g.clearanceHalf[1],radius];
      } else {
        if(half.some(v=>v<0||v>500))throw new TypeError('Bounded hull half extents required');
        bounds={min:half.map(v=>-v),max:half};interunitHalf=half;radius=Math.hypot(half[0],half[2]);
      }
      return {unit,slot,g,bounds,interunitHalf,radius};
    });
    const radius=Math.max(...fitted.map(f=>f.radius));
    const reach=Math.max(0,...units.flatMap(u=>u.weapons.filter(w=>['surface','underwater'].includes(w.medium)).map(w=>w.range)));
    const closing=[0,1].reduce((sum,team)=>sum+Math.max(0,...units.filter(u=>u.team===team).map(u=>u.speed)),0);
    // Ten seconds of visible approach outside reach, including both full hull/origin envelopes.
    // Distances scale with the actual roster, not one universal spawn offset or a ceasefire timer.
    const front=Math.ceil((reach+2*radius+closing*10+2*MESH_CELL)/(2*MESH_CELL))*MESH_CELL;
    const formation=Math.ceil((2*radius+2*MESH_CELL)/MESH_CELL)*MESH_CELL;
    const hasEscort=units.some(u=>u.kind==='surface'&&!u.capital);
    const slots=staging.map(s=>{
      const z=(s.team===0?1:-1)*(front+(hasEscort&&(s.capital||s.kind==='sub')?formation:0));
      const y=s.kind==='sub'?SEA_FLOOR*.65:0,x=s.position[0];
      const route=units.length===2&&s.capital?[[0,0,0]]:[[x,y,-z],[x,y,z]];
      return {...clone(s),position:[x,y,z],route};
    });
    const placed=fitted.map(({unit,slot:base,g,bounds,interunitHalf})=>{
      const slot=slots.find(s=>s.id===base.id);
      if(!Array.isArray(unit.route)||unit.route.length>4||unit.route.some(p=>!point(p)||
        (unit.kind==='surface'?p[1]!==0:p[1]<SEA_FLOOR*.65||p[1]>0)))throw new TypeError('Valid in-water fleet route required');
      // Explicit objective courses are retained, but pass the same whole-hull/depth sweep as patrols.
      const route=unit.route.length?clone(unit.route):clone(slot.route);
      const destination=route.find(p=>p[0]!==slot.position[0]||p[2]!==slot.position[2])??slot.route[0];
      const heading=Math.atan2(-(destination[0]-slot.position[0]),-(destination[2]-slot.position[2]));
      const low=unit.kind==='sub'?SEA_FLOOR*.65:0;
      const swept={min:[bounds.min[0],bounds.min[1]+low,bounds.min[2]],max:bounds.max};
      const start=[slot.position[0],0,slot.position[2]];
      const points=[start,...route.map(p=>[p[0],0,p[2]]),start];
      for(let i=1;i<points.length;i++)if(!clears(points[i-1],points[i],swept,unit.kind))throw new TypeError('Hull/route/depth sweep exceeds map water envelope');
      envelopes.push({position:slot.position,half:interunitHalf});
      slot.route=clone(route);
      return {...clone(unit),position:clone(slot.position),route,depth:slot.depth,...(g?{heading}:{})};
    });
    const required=surfaceSlice?['capital0','capital1',...(units.length===4?['escort0','escort1']:[])]:staging.map(s=>s.id);
    if(required.some(id=>!used.has(id)))throw new TypeError('Symmetric capital/escort/sub roles required');
    for(let i=0;i<envelopes.length;i++)for(let j=0;j<i;j++) {
      const a=envelopes[i],b=envelopes[j];
      if(a.position.every((v,k)=>Math.abs(v-b.position[k])<=a.half[k]+b.half[k]))throw new TypeError('Overlapping initial conservative hulls');
    }
    deployment=slots; // Publish only a complete valid plan; failed placements retain the prior navigation.
    return placed;
  }
  function shoreline() {
    const m=worldMesh(),segments=[];
    for(let j=0;j<n;j++)for(let i=0;i<n;i++) {
      const a=j*stride+i,b=a+1,c=a+stride,e=c+1;
      for(const tri of [[a,c,b],[b,c,e]]) {
        const cut=[];
        for(let k=0;k<3;k++) {
          const p=tri[k],q=tri[(k+1)%3],hp=m.h[p],hq=m.h[q];
          if((hp>0)===(hq>0))continue;
          const t=hp/(hp-hq);cut.push([m.vx[p]+(m.vx[q]-m.vx[p])*t,0,m.vz[p]+(m.vz[q]-m.vz[p])*t]);
        }
        if(cut.length===2)segments.push(cut);
      }
    }
    return segments;
  }
  function objectives(units=deployment??staging) {
    if(!Array.isArray(units)||[0,1].some(team=>units.filter(u=>u.team===team&&u.capital).length!==1))
      throw new TypeError('Exactly one authority capital per team required');
    return [0,1].map(team=>({team,defend:units.find(s=>s.team===team&&s.capital).id,
      attack:units.find(s=>s.team!==team&&s.capital).id}));
  }
  const groundHeight=(x,z)=>Math.max(0,terrainMeshHeight(x,z)),isWater=(x,z)=>terrainMeshHeight(x,z)<=0;
  const worldQuery=Object.freeze({groundHeight,onRunway,isWater,seabedHeight:terrainMeshHeight,half:WORLD_HALF,ceiling:CEILING});
  return Object.freeze({id,seed,version:2,worldMesh,terrainMeshHeight,terrainHeight:terrainMeshHeight,
    seaFloorHeight:terrainMeshHeight,groundHeight,heightBound,worldQuery,
    isWater,onRunway,surfaceType,spawnPoint,navigable,shoreline,
    arena:()=>clone(arena),staging:()=>clone(deployment??staging),objectives,navigation,
    runways:()=>clone(d.runways),airRoutes:()=>clone(d.airRoutes),placeFleet,
    allowedWeatherPresets:()=>['clear','overcast','rain','fog','storm'],
    replayKey:()=>({mapPackVersion:2,mapId:id,seed})});
}
