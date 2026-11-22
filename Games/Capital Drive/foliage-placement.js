import { roadProfile } from './road-network.js';

const STREET_TYPES = new Set(['living_street','residential','unclassified','tertiary','secondary','primary','trunk']);
const GROVE_TYPES = new Set(['wood','forest','scrub','nature_reserve']);
const PARK_TYPES = new Set(['park','grass','grassland','meadow']);
const OPEN_TYPES = new Set(['pitch','golf_course','recreation_ground']);
const AREA_PROBE_LIMIT = 24000;
const CHUNK_LIMITS = {
  tree: { total:126, street:90, park:75, wood:108 },
  shrub: { total:58, street:33, park:35, wood:45 },
};
const WORLD_LIMITS = { tree:28000, shrub:16000 };
const MIN_GAP = { tree:8.5, shrub:4.5 };
const UNDERSTOREY_GAP = 2.6;
const GRID = 10;
const integer = value => value >>> 0;
const key = (x,z,size) => `${Math.floor(x/size)},${Math.floor(z/size)}`;

function seedFor(value) {
  let state = 2166136261;
  for (const char of String(value)) state = Math.imul(state ^ char.charCodeAt(0),16777619);
  return integer(state);
}
function mix(value) {
  value = Math.imul(value ^ (value >>> 16),0x7feb352d);
  value = Math.imul(value ^ (value >>> 15),0x846ca68b);
  return integer(value ^ (value >>> 16));
}
const fraction = seed => mix(seed) / 4294967296;

function areaBounds(points, bounds) {
  if (!Array.isArray(points) || points.length < 3) return null;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for (const [x,z] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  minX=Math.max(minX,bounds.minX);maxX=Math.min(maxX,bounds.maxX);
  minZ=Math.max(minZ,bounds.minZ);maxZ=Math.min(maxZ,bounds.maxZ);
  return minX<maxX && minZ<maxZ ? {minX,maxX,minZ,maxZ} : null;
}

function inside(x,z,points) {
  let contained=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,az]=points[i], [bx,bz]=points[j];
    if((az>z)!==(bz>z) && x < ax+(z-az)*(bx-ax)/(bz-az)) contained=!contained;
  }
  return contained;
}
const insideArea = (x,z,area) => inside(x,z,area.points) && !area.holes.some(ring=>inside(x,z,ring));

function takeFromChunks(buckets, kind) {
  const groups=[...buckets.values()].map(bucket=>bucket[kind]).filter(group=>group.length);
  const total=groups.reduce((sum,group)=>sum+group.length,0);
  if(total<=WORLD_LIMITS[kind])return groups.flat();
  // Preserve every populated neighbourhood if a future, larger map hits the cap.
  const result=[];
  for(let i=0; i<CHUNK_LIMITS[kind].total && result.length<WORLD_LIMITS[kind]; i++){
    for(const group of groups){
      if(i<group.length)result.push(group[i]);
      if(result.length===WORLD_LIMITS[kind])break;
    }
  }
  return result;
}

export function placeFoliage(map, { isClear=()=>true, chunkSize=350 } = {}) {
  const bounds=map?.bounds;
  if (!bounds || ![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ,chunkSize].every(Number.isFinite) ||
      bounds.minX>=bounds.maxX || bounds.minZ>=bounds.maxZ || chunkSize<=0) return [];

  const buckets=new Map(), occupied={tree:new Map(),shrub:new Map()}, openFields=new Map();
  const habitats={park:[],wood:[]};
  // The padding lets neighbouring cells use arithmetic keys at the map edges.
  const gridStartX=Math.floor(bounds.minX/GRID)-1, gridStartZ=Math.floor(bounds.minZ/GRID)-1;
  const gridStride=Math.ceil((bounds.maxX-bounds.minX)/GRID)+5;
  const gridKey=(cx,cz)=>cx-gridStartX+(cz-gridStartZ)*gridStride;
  for(const area of map.areas||[]){
    const habitat=GROVE_TYPES.has(area.type)?'wood':PARK_TYPES.has(area.type)?'park':null;
    if(!habitat&&!OPEN_TYPES.has(area.type))continue;
    const box=areaBounds(area.points,bounds);
    if(!box)continue;
    const holes=(area.innerRings||[]).map(ring=>ring.points||ring)
      .filter(ring=>Array.isArray(ring)&&ring.length>=3&&Array.isArray(ring[0]));
    const patch={...box,points:area.points,holes,seed:seedFor(area.id??area.points[0]),habitat,type:area.type};
    if(habitat){habitats[habitat].push(patch);continue;}
    // Keep mapped sports grounds open even if an overlapping polygon is tagged grass.
    for(let cx=Math.floor(box.minX/chunkSize);cx<=Math.floor(box.maxX/chunkSize);cx++)
      for(let cz=Math.floor(box.minZ/chunkSize);cz<=Math.floor(box.maxZ/chunkSize);cz++){
        const chunk=`${cx},${cz}`;
        if(!openFields.has(chunk))openFields.set(chunk,[]);
        openFields.get(chunk).push(patch);
      }
  }

  function overlaps(group,x,z,squared) {
    if(!group)return false;
    for(const other of group){
      const dx=x-other.x,dz=z-other.z;
      if(dx*dx+dz*dz<squared)return true;
    }
    return false;
  }
  function crowded(x,z,cell,kind) {
    const same=occupied[kind], different=occupied[kind==='tree'?'shrub':'tree'];
    const canopy=MIN_GAP[kind]**2, understorey=UNDERSTOREY_GAP**2;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const neighbour=cell+dz*gridStride+dx;
      if(overlaps(same.get(neighbour),x,z,canopy)||overlaps(different.get(neighbour),x,z,understorey))return true;
    }
    return false;
  }
  function add(x,z,seed,kind,habitat) {
    if(x<=bounds.minX||x>=bounds.maxX||z<=bounds.minZ||z>=bounds.maxZ)return;
    const chunk=key(x,z,chunkSize), existing=buckets.get(chunk), limits=CHUNK_LIMITS[kind];
    if(existing&&(existing[kind].length>=limits.total||existing.count[kind+habitat]>=limits[habitat]))return;
    const grid=gridKey(Math.floor(x/GRID),Math.floor(z/GRID));
    if(crowded(x,z,grid,kind))return;
    if(openFields.get(chunk)?.some(area=>x>=area.minX&&x<=area.maxX&&z>=area.minZ&&z<=area.maxZ&&insideArea(x,z,area)))return;
    if(!isClear(x,z,kind))return;
    const point={x,z,seed:mix(seed),kind,habitat};
    const bucket=existing||{tree:[],shrub:[],count:{}};
    if(!existing)buckets.set(chunk,bucket);
    bucket[kind].push(point);
    const counter=kind+habitat;
    bucket.count[counter]=(bucket.count[counter]||0)+1;
    if(!occupied[kind].has(grid))occupied[kind].set(grid,[]);
    occupied[kind].get(grid).push(point);
  }

  // Long roads carry a sample cursor across their polyline. A lane gap or a
  // narrow verge can reject one specimen without shifting the rest of the avenue.
  for(const road of map.roads||[]){
    if(!STREET_TYPES.has(road.type) || road.bridge || road.tunnel || !road.points?.length)continue;
    const tags=road.sourceTags||{};
    if((tags.bridge&&tags.bridge!=='no')||(tags.tunnel&&tags.tunnel!=='no'))continue;
    const profile=roadProfile(road);
    if(!profile.trafficAllowed)continue;
    const start=seedFor(road.id??road.points[0]);
    let along=4+fraction(start)*13, ordinal=0;
    const averageGap=profile.major?29:22;
    for(let i=1;i<road.points.length;i++){
      const [ax,az]=road.points[i-1],[bx,bz]=road.points[i], length=Math.hypot(bx-ax,bz-az);
      if(!Number.isFinite(length)||length<.01)continue;
      const dx=(bx-ax)/length,dz=(bz-az)/length;
      while(along<length){
        const seed=mix(start+Math.imul(++ordinal,3907));
        for(const side of [-1,1]){
          const pattern=seed+side*377;
          const paved = side<0?profile.sidewalkLeft:profile.sidewalkRight;
          const verge=profile.driveWidth/2+(paved?profile.pavementWidth+.3:0);
          const across=side*(verge+2.8+fraction(pattern+1)*2.5);
          const x=ax+dx*along-dz*across,z=az+dz*along+dx*across;
          if(fraction(pattern+3)>.11)add(x,z,pattern,'tree','street');
          if(fraction(pattern+5)<.45){
            const offset=side*(verge+1.55+fraction(pattern+6)*1.4);
            const at=Math.min(length-.2,along+4+fraction(pattern+8)*5);
            add(ax+dx*at-dz*offset,az+dz*at+dx*offset,pattern+11,'shrub','street');
          }
        }
        along+=averageGap+fraction(seed+71)*10;
      }
      along-=length;
    }
  }

  function plantArea(area, kind) {
    const woodland=area.habitat==='wood', grass=area.type==='grass'||area.type==='grassland'||area.type==='meadow';
    const openWidth=area.maxX-area.minX,openLength=area.maxZ-area.minZ;
    const step=Math.max(kind==='tree'?(woodland?14.5:21):(woodland?12:17),
      Math.sqrt(openWidth*openLength/AREA_PROBE_LIMIT));
    for(let ix=Math.floor(area.minX/step);ix<=Math.floor(area.maxX/step);ix++){
      for(let iz=Math.floor(area.minZ/step);iz<=Math.floor(area.maxZ/step);iz++){
        const seed=mix(area.seed+Math.imul(ix,11317)+Math.imul(iz,6173)+(kind==='tree'?37:113));
        const x=(ix+.17+fraction(seed+3)*.66)*step,z=(iz+.17+fraction(seed+11)*.66)*step;
        if(x<area.minX||x>area.maxX||z<area.minZ||z>area.maxZ)continue;
        // Keep meadows and park clearings between patches of denser plants.
        const patch=fraction(area.seed+Math.imul(Math.floor(x/66),1171)+Math.imul(Math.floor(z/66),8317));
        const density=woodland?(patch>.2?.82:.34):grass?(patch>.48?.5:.19):(patch>.27?.7:.31);
        if(fraction(seed+17)<(kind==='tree'?density:density*.73) && insideArea(x,z,area))
          add(x,z,seed,kind,area.habitat);
      }
    }
  }
  for(const habitat of ['wood','park']){
    for(const area of habitats[habitat])plantArea(area,'tree');
    for(const area of habitats[habitat])plantArea(area,'shrub');
  }
  return [...takeFromChunks(buckets,'tree'),...takeFromChunks(buckets,'shrub')];
}
