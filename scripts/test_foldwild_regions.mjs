import assert from 'node:assert/strict';
import { REGION_LAYOUTS, REGION_DEFINITIONS, REGIONS, movePosition, routeTo } from '../Games/Foldwild/region-data.js';
import { ELEMENTS } from '../Games/Foldwild/data.js';

const radius = 0.35;
const npcTypes = new Set(['npc','merchant','mentor','contract','rival']);
const expectedShops = ['meadow-main','meadow-road','reach-main','reach-road','quarry-main','quarry-road','ridge-main','ridge-road','hollow-main'];
const shops = new Set(), contracts = new Set(), keyedIds = new Set();
let actors = 0, principals = 0, poiRoutes = 0, wildRoutes = 0, segments = 0;
function frozen(value) {
  if (!value || typeof value !== 'object') return;
  assert(Object.isFrozen(value));
  Object.values(value).forEach(frozen);
}
function safe(layout, p) {
  assert(Number.isFinite(p.x) && Number.isFinite(p.z));
  assert(p.x >= -80+radius && p.x <= 80-radius && p.z >= -80+radius && p.z <= 80-radius);
  for (const c of layout.colliders) {
    assert(!(p.x > c.minX-radius+1e-7 && p.x < c.maxX+radius-1e-7 &&
      p.z > c.minZ-radius+1e-7 && p.z < c.maxZ+radius-1e-7), `Blocked position ${JSON.stringify(p)}`);
  }
}
function testRoute(region, from, target) {
  const layout = REGION_LAYOUTS[region];
  const route = routeTo(region,from,target);
  assert(route.length > 0, `No route in ${region} to ${target.id ?? JSON.stringify(target)}`);
  assert.deepEqual(route.at(-1), { x: target.x, z: target.z });
  assert(route.length <= layout.waynodes.length+1);
  let start = from;
  for (const end of route) {
    safe(layout,end);
    // Independent 5 cm sampling checks the entire inflated player corridor.
    const steps = Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/0.05));
    for (let i = 0; i <= steps; i++) safe(layout,{ x: start.x+(end.x-start.x)*i/steps, z: start.z+(end.z-start.z)*i/steps });
    // Verify the axis-sliding mover can follow each route without drifting or tunneling.
    let p = { x: start.x, z: start.z, yaw: 0.7 };
    for (let i = 1; i <= steps; i++) p = movePosition(region,p,(end.x-start.x)/steps,(end.z-start.z)/steps);
    assert(Math.hypot(p.x-end.x,p.z-end.z) < 1e-6);
    assert.equal(p.yaw,0.7);
    segments++;
    start = end;
  }
  return route;
}

assert.equal(REGIONS,REGION_DEFINITIONS);
assert.equal(REGION_LAYOUTS.length,5);
assert.deepEqual(REGION_DEFINITIONS.map(r => [r.id,r.name]), [
  [0,'Rootfold Meadow'],[1,'Stillwater Reach'],[2,'Emberstep Quarry'],[3,'Stonefold Ridge'],[4,'Quietfold Hollow']
]);
frozen(REGION_LAYOUTS);
frozen(REGION_DEFINITIONS);
const fresh = await import('../Games/Foldwild/region-data.js?region-regression-fresh');
assert.deepEqual(fresh.REGION_LAYOUTS,REGION_LAYOUTS);
assert.notEqual(fresh.REGION_LAYOUTS,REGION_LAYOUTS);
assert.throws(() => { REGION_LAYOUTS[0].spawn.x = 2; },TypeError);
let area = 0;
for (const [region,layout] of REGION_LAYOUTS.entries()) {
  const { bounds } = layout;
  assert.deepEqual(bounds,{ minX: -80,maxX:80,minZ:-80,maxZ:80 });
  assert.equal((bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ),25600);
  area += 25600;
  assert.equal(REGION_DEFINITIONS[region].element,['Loamveil','Rillune','Cindrel','Gleamric','Hushmere'][region]);
  assert(REGION_DEFINITIONS[region].description.length > 30);
  assert.deepEqual(layout.spawn,{ x: 0,z:16,yaw:0 });
  safe(layout,layout.spawn);
  assert.equal(layout.pathWidth,3.5);
  for (const color of Object.values(layout.palette)) assert.match(color,/^#[0-9a-f]{6}$/i);
  assert(layout.paths.length >= 2);
  for (const path of layout.paths) {
    assert(path.length >= 2);
    for (const p of path) assert(Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) <= 80 && Math.abs(p.z) <= 80);
    for (let i = 1; i < path.length; i++) {
      const from = path[i-1], to = path[i];
      const steps = Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/0.05);
      for (let n = 0; n <= steps; n++) safe(layout,{ x: from.x+(to.x-from.x)*n/steps, z: from.z+(to.z-from.z)*n/steps });
    }
  }
  assert.equal(layout.props.filter(p => p.kind === 'tree').length,96);
  assert.equal(layout.props.filter(p => p.kind === 'bridge').length,2);
  for (const prop of layout.props) {
    assert(['tree','rock','house','bridge','water','landmark'].includes(prop.kind));
    for (const key of ['x','z','w','h','d']) assert(Number.isFinite(prop[key]));
    assert(prop.w > 0 && prop.h > 0 && prop.d > 0);
    assert(Math.abs(prop.x)+prop.w/2 <= 80 && Math.abs(prop.z)+prop.d/2 <= 80);
    assert.match(prop.color,/^#[0-9a-f]{6}$/i);
  }
  for (const c of layout.colliders) {
    for (const v of Object.values(c)) assert(Number.isFinite(v));
    assert(c.minX < c.maxX && c.minZ < c.maxZ);
    assert(c.minX >= -80 && c.maxX <= 80 && c.minZ >= -80 && c.maxZ <= 80);
  }
  const count = layout.points.filter(p => npcTypes.has(p.type)).length;
  assert.equal(count,[10,10,10,9,9][region]);
  actors += count;
  for (const point of layout.points) {
    const key = `${region}:${point.id}`;
    assert(!keyedIds.has(key));
    keyedIds.add(key);
    assert(point.id && point.type && point.label && point.role);
    if (npcTypes.has(point.type)) {
      assert.equal(point.dialogue.split('\n\n').length,3);
      if (point.principal) principals++;
    }
    if (point.shopId) shops.add(point.shopId);
    if (point.contractId) contracts.add(point.contractId);
    testRoute(region,Object.freeze({...layout.spawn}),Object.freeze({...point}));
    poiRoutes++;
  }
  for (const id of ['camp','rival','exit','supply-0','supply-1','supply-2']) assert(layout.points.some(p => p.id === id));
  assert.equal(layout.points.find(p => p.id === 'rival').label,['Maren','Sola','Neri','Iven','Oren'][region]);
  for (const p of layout.points.filter(p => p.type === 'supply')) {
    assert.equal(p.materialId,'fiber');
    assert.equal(p.quantity,3);
  }
  assert.equal(layout.wildSites.length,3);
  for (const site of layout.wildSites) {
    assert(ELEMENTS.includes(site.habitatElement));
    assert(['basic','evolved','boss'].includes(site.tier));
    testRoute(region,layout.spawn,site);
    wildRoutes++;
  }
  assert(layout.waynodes.length < 100);
  assert(layout.waynodes.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)));
  const water = layout.props.find(p => p.kind === 'water');
  const west = water.x-water.w/2-1, east = water.x+water.w/2+1;
  const blocked = Object.freeze({x:west,z:0,yaw:1.2});
  const stopped = movePosition(region,blocked,east-west,0);
  assert.equal(stopped.x,water.x-water.w/2-radius);
  assert.equal(stopped.z,0);
  assert.equal(stopped.yaw,1.2);
  assert.notEqual(stopped,blocked);
  assert.deepEqual(blocked,{x:west,z:0,yaw:1.2});
  const waterRoute = testRoute(region,blocked,{x:east,z:0});
  assert(waterRoute.length >= 3);
  for (const bridge of layout.props.filter(p => p.kind === 'bridge')) {
    const start = Object.freeze({x:west,z:bridge.z,yaw:-1});
    assert.deepEqual(movePosition(region,start,east-west,0),{x:east,z:bridge.z,yaw:-1});
    // Bridge openings remain wide enough for the full 0.7 m player body.
    for (const offset of [-2,0,2]) assert.equal(movePosition(region,{x:west,z:bridge.z+offset},east-west,0).x,east);
  }
  const house = layout.props.filter(p => p.kind === 'house')[1];
  const start = Object.freeze({x:house.x-house.w/2-2,z:house.z,yaw:0.3});
  const slid = movePosition(region,start,house.w+4,1);
  assert.equal(slid.x,house.x-house.w/2-radius);
  assert.equal(slid.z,house.z+1);
  safe(layout,slid);
  assert.deepEqual(routeTo(region,layout.spawn,{x:house.x,z:house.z}),[]);
  assert.deepEqual(routeTo(region,{x:house.x,z:house.z},layout.spawn),[]);
  assert.throws(() => movePosition(region,{x:house.x,z:house.z},1,0),/not walkable/);
  for (const cottage of layout.props.filter(p => p.kind === 'house')) {
    testRoute(region,layout.spawn,{x:cottage.x,z:cottage.z+cottage.d/2+1});
  }
  const acrossHouse = testRoute(region,{x:house.x-house.w/2-1,z:house.z-house.d/2-1},
    {x:house.x+house.w/2+1,z:house.z+house.d/2+1});
  assert(acrossHouse.length > 1);
  // A one-step diagonal must not cut an inflated building corner.
  const corner = {x:house.x-house.w/2-1,z:house.z-house.d/2-1};
  const diagonal = movePosition(region,corner,2,2);
  safe(layout,diagonal);
  assert(diagonal.x < house.x-house.w/2 || diagonal.z < house.z-house.d/2);
  const edge = movePosition(region,{x:70,z:70,yaw:2},1e100,1e100);
  assert.deepEqual(edge,{x:79.65,z:79.65,yaw:2});
  safe(layout,edge);
  assert.deepEqual(routeTo(region,layout.spawn,{x:80,z:0}),[]);
  assert.deepEqual(routeTo(region,layout.spawn,{x:water.x,z:0}),[]);
  const route = routeTo(region,layout.spawn,layout.points.find(p => p.id === 'exit'));
  route[0].x = 999;
  assert.notEqual(routeTo(region,layout.spawn,layout.points.find(p => p.id === 'exit'))[0].x,999);
}
assert.equal(area,128000);
assert.equal(actors,48);
assert.equal(principals,12);
assert.deepEqual([...shops].sort(),expectedShops.sort());
assert.deepEqual([...contracts].sort(),expectedShops.map(id => `${id}-supply`).sort());
assert.deepEqual(REGION_LAYOUTS[0].wildSites.map(p => [p.x,p.z]),[[-10,4],[10,-8],[-10,-16]]);
for (const region of [-1,5,0.1,'0',null,NaN]) {
  assert.throws(() => movePosition(region,{x:0,z:16},0,0),RangeError);
  assert.throws(() => routeTo(region,{x:0,z:16},{x:1,z:16}),RangeError);
}
for (const bad of [null,{}, {x:NaN,z:0},{x:0,z:Infinity},{x:'0',z:0}]) {
  assert.throws(() => movePosition(0,bad,0,0),TypeError);
  assert.throws(() => routeTo(0,bad,{x:0,z:16}),TypeError);
  assert.throws(() => routeTo(0,{x:0,z:16},bad),TypeError);
}
for (const value of [NaN,Infinity,-Infinity,'1',null]) {
  assert.throws(() => movePosition(0,{x:0,z:16},value,0),TypeError);
  assert.throws(() => movePosition(0,{x:0,z:16},0,value),TypeError);
  assert.throws(() => movePosition(0,{x:0,z:16,yaw:value},0,0),TypeError);
}
assert.throws(() => movePosition(0,{x:80,z:16},0,0),RangeError);
console.log(`PASS: 5 regions, ${area} m², 480 trees, ${actors} NPCs (${principals} principal), 9 shops/contracts; ${poiRoutes} POI + ${wildRoutes} wild routes, ${segments} collision-safe segments; water/bridge/house/sliding/bounds/invalid inputs/immutability`);
