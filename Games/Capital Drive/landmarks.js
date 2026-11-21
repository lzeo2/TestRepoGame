// Real anchors projected with the same local equirectangular origin as canberra.json.
const project = (lat, lon) => ({ x: (lon - 149.137) * 111320 * Math.cos(-35.318 * Math.PI / 180), z: -(lat + 35.318) * 111320 });
const place = (id, name, lat, lon, radius, description) => Object.freeze({ id, name, lat, lon, radius, description, ...project(lat, lon) });
export const LANDMARKS = Object.freeze([
  place('parliament-house', 'Parliament House', -35.3081, 149.1245, 220, 'Capital Hill, grass roof, curved pale walls and the central flag mast.'),
  place('old-parliament-house', 'Old Parliament House', -35.3021, 149.1297, 120, 'The white stripped classical home of the Museum of Australian Democracy.'),
  place('manuka-oval', 'Manuka Oval', -35.3183, 149.1348, 130, 'Oval ground, grandstands and six tall floodlight towers.'),
  place('manuka-pool', 'Manuka Pool', -35.3170181, 149.1355791, 40, 'Walled outdoor pool, tiled deck, lawns and a cream heritage entrance with terracotta roofs.'),
  place('kingston-powerhouse', 'Kingston Powerhouse', -35.3115975, 149.1436952, 65, 'Historic industrial halls, now Canberra Glassworks, beside the former chimney base.'),
]);

// Inspected ACT footprints only. Never use proximity to erase neighbouring buildings.
const REPLACED_IDS = Object.freeze([
  'act-130946-0', 'act-82956-0', 'act-104361-0', 'act-123850-0', 'act-85758-0',
  'act-86145-0', 'act-83409-0', 'act-133856-0', 'act-116798-0',
  'act-97135-0', 'act-133342-0', 'act-120773-0', 'act-75267-0',
]);
export function replacedBuildingIds(map) {
  const available = new Set((map.buildings || []).map(building => building.id));
  return new Set(REPLACED_IDS.filter(id => available.has(id)));
}

// OSM way58851110 v11,2024-04-18: basin corners projected from the cached source.
export const MANUKA_POOL_BASIN = Object.freeze([
  [-35.3168694,149.1356152],[-35.3169403,149.1357385],
  [-35.3171668,149.1355430],[-35.3170959,149.1354197],
].map(([lat,lon]) => { const p=project(lat,lon); return Object.freeze([p.x,p.z]); }));

// OSM sports-centre way51677758 v7,2025-04-12. Boundary vertices are exact;
// fence heights, fixed-open gate and heritage entrance are original approximations.
export const MANUKA_POOL_SITE = Object.freeze([[-35.3166609,149.1356305],[-35.3170099,149.1353228],[-35.3171373,149.1352135],[-35.3173467,149.1355478],[-35.3174665,149.1356669],[-35.317679,149.135831],[-35.3178023,149.1358947],[-35.3179205,149.1363221],[-35.3179254,149.1364654],[-35.3178868,149.1364655],[-35.3178461,149.1364657],[-35.3177869,149.1364667],[-35.31775,149.1364671],[-35.3177211,149.1364674],[-35.3176915,149.1364684],[-35.3176713,149.1364695],[-35.3176512,149.1364706],[-35.3176327,149.1364722],[-35.3175823,149.1364769],[-35.3175278,149.1364821],[-35.3174707,149.1364886],[-35.3174508,149.136491],[-35.3174351,149.1364931],[-35.3174153,149.1364965],[-35.3173944,149.1365003],[-35.3173657,149.1365059],[-35.3173213,149.1365156],[-35.3172596,149.1365299],[-35.3171636,149.136588],[-35.3171247,149.1365996],[-35.3171035,149.1366057],[-35.3170831,149.1366115],[-35.3170621,149.1366169],[-35.3170518,149.1366189],[-35.3170408,149.1366203],[-35.3170275,149.1366211],[-35.3170145,149.136621],[-35.317,149.13662],[-35.3169854,149.1366187],[-35.3169715,149.136617],[-35.3169581,149.1366149],[-35.3169448,149.1366117],[-35.3169302,149.1366074],[-35.3169168,149.1366026],[-35.3169027,149.1365965],[-35.3168877,149.1365888],[-35.3168752,149.1365819],[-35.3168629,149.1365744],[-35.3168519,149.1365666],[-35.3168396,149.1365578],[-35.3168247,149.1365457],[-35.3168132,149.1365347],[-35.3168045,149.1365261],[-35.3167943,149.1365136],[-35.3167857,149.1365013],[-35.3167757,149.136486],[-35.3167636,149.1364654],[-35.3166819,149.1363219],[-35.3166782,149.136314],[-35.3166769,149.1363064],[-35.3166767,149.1362986],[-35.3166774,149.1362912],[-35.3166795,149.1362839],[-35.3166829,149.1362778],[-35.3166866,149.1362732],[-35.316785,149.1361867],[-35.3169552,149.1360351],[-35.3169029,149.1359526],[-35.3168322,149.1360206],[-35.3167723,149.135922],[-35.3166452,149.1357112],[-35.316639,149.1356999],[-35.3166341,149.1356897],[-35.3166325,149.1356825],[-35.3166327,149.1356738],[-35.316634,149.1356653],[-35.3166364,149.1356572],[-35.3166397,149.1356517],[-35.316644,149.1356459],[-35.3166509,149.1356393]].map(([lat,lon]) => {
  const p=project(lat,lon); return Object.freeze([p.x,p.z]);
}));
const poolA=MANUKA_POOL_SITE[0],poolB=MANUKA_POOL_SITE[1];
const poolEdgeLength=Math.hypot(poolB[0]-poolA[0],poolB[1]-poolA[1]);
const poolAlong=[(poolB[0]-poolA[0])/poolEdgeLength,(poolB[1]-poolA[1])/poolEdgeLength];
const poolInward=[poolAlong[1],-poolAlong[0]];
const gateDistance=poolEdgeLength*0.35,gateWidth=2.6;
const edgePoint=d=>[poolA[0]+poolAlong[0]*d,poolA[1]+poolAlong[1]*d];
const gateCenter=edgePoint(gateDistance);
export const POOL_GATE_APPROACHES=Object.freeze([Object.freeze({
  id:'manuka-pool-main-gate',x:gateCenter[0],z:gateCenter[1],width:gateWidth,clearWidth:gateWidth-0.44,
  a:Object.freeze(edgePoint(gateDistance-gateWidth/2)),b:Object.freeze(edgePoint(gateDistance+gateWidth/2)),
  outside:Object.freeze([gateCenter[0]-poolInward[0]*3,gateCenter[1]-poolInward[1]*3]),
  inside:Object.freeze([gateCenter[0]+poolInward[0]*6,gateCenter[1]+poolInward[1]*6]),
})]);
function poolBarrier(a,b,kind='fence',depth=0.26,height=1.85) {
  const dx=b[0]-a[0],dz=b[1]-a[1],width=Math.hypot(dx,dz),nx=-dz/width*depth/2,nz=dx/width*depth/2;
  return Object.freeze({id:`pool-${kind}-${a[0].toFixed(4)}-${a[1].toFixed(4)}`,kind,
    x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,width,depth,height,yaw:-Math.atan2(dz,dx),
    a:Object.freeze([...a]),b:Object.freeze([...b]),
    points:Object.freeze([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]].map(Object.freeze))});
}
// Short terrain-following spans share their precise footprint with the renderer.
const poolBarriers=[];
for(let i=0;i<MANUKA_POOL_SITE.length;i++) {
  const a=MANUKA_POOL_SITE[i],b=MANUKA_POOL_SITE[(i+1)%MANUKA_POOL_SITE.length];
  const spans=i===0?[[a,edgePoint(gateDistance-gateWidth/2)],[edgePoint(gateDistance+gateWidth/2),b]]:[[a,b]];
  for(const [u,v] of spans) {
    const n=Math.ceil(Math.hypot(v[0]-u[0],v[1]-u[1])/3);
    for(let j=0;j<n;j++) {
      const at=t=>[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];
      poolBarriers.push(poolBarrier(at(j/n),at((j+1)/n),i<3?'wall':'fence',i<3?0.38:0.26,i<3?1.8:1.85));
    }
  }
}
// Paired change-room wings frame the open gate; their colliders use the same boxes.
for(const side of [-1,1]) {
  const center=edgePoint(gateDistance+side*(gateWidth/2+4));
  const a=[center[0]-poolAlong[0]*4+poolInward[0]*2.7,center[1]-poolAlong[1]*4+poolInward[1]*2.7];
  const b=[center[0]+poolAlong[0]*4+poolInward[0]*2.7,center[1]+poolAlong[1]*4+poolInward[1]*2.7];
  poolBarriers.push(poolBarrier(a,b,'building',5,3.6));
}
for(const p of [edgePoint(gateDistance-gateWidth/2),edgePoint(gateDistance+gateWidth/2)]) {
  poolBarriers.push(poolBarrier([p[0]-poolAlong[0]*0.22,p[1]-poolAlong[1]*0.22],[p[0]+poolAlong[0]*0.22,p[1]+poolAlong[1]*0.22],'pillar',0.44,3.4));
}
export const POOL_BARRIERS=Object.freeze(poolBarriers);

// Exact art clearings in world metres, independent of building suppression.
const parliament = LANDMARKS[0], oval = LANDMARKS[2];
const clearing = points => Object.freeze(points.map(point => Object.freeze(point)));
const parliamentPoint = ([x,z]) => [parliament.x + Math.cos(-0.615)*x + Math.sin(-0.615)*z, parliament.z - Math.sin(-0.615)*x + Math.cos(-0.615)*z];
export const LANDMARK_CLEARINGS = Object.freeze([
  clearing([[-80,-235],[80,-235],[80,-145],[-80,-145]].map(parliamentPoint)),
  clearing(Array.from({length:32},(_,i) => [oval.x + Math.cos(i/32*Math.PI*2)*80, oval.z + Math.sin(i/32*Math.PI*2)*94])),
  MANUKA_POOL_BASIN,
  MANUKA_POOL_SITE,
]);
