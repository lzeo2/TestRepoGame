import assert from 'node:assert/strict';
import { createMapProjection, mapPointFromClient } from '../Games/Capital Drive/map-projection.js';

const bounds = { minX: -2300, maxX: 3500, minZ: -2000, maxZ: 3900 };
for (const [width, height, zoom] of [[1000, 900, 1], [1000, 900, 4], [390, 600, 2]]) {
  const projection = createMapProjection(bounds, width, height, { x: 300, z: 700, zoom });
  const rect = { left: 45, top: 130, width: width * .63, height: height * .44 };
  for (const point of [{ x: 300, z: 700 }, { x: -375, z: 921 }, { x: 800, z: 500 }]) {
    const pixel = projection.toCanvas(point.x, point.z);
    const actual = mapPointFromClient(projection, rect, rect.left + pixel.x * rect.width / width, rect.top + pixel.y * rect.height / height, bounds);
    assert.ok(actual);
    assert.ok(Math.hypot(actual.x - point.x, actual.z - point.z) < 1e-8, 'CSS-scaled pointer must land at the actual mapped position');
  }
}
const projection = createMapProjection(bounds, 1000, 900);
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 1000, height: 900 }, 0, 0, bounds), null, 'map padding is not a teleport destination');
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 0, height: 0 }, 0, 0, bounds), null);
const boundary = projection.toCanvas(bounds.maxX, bounds.minZ);
const world = projection.toWorld(boundary.x, boundary.y);
assert.ok(Math.hypot(world.x - bounds.maxX, world.z - bounds.minZ) < 1e-8);
const fractionalBounds = { minX: -3088.3, maxX: 3360.79, minZ: -2226.4, maxZ: 3784.88 };
for (const [width, height] of [[1000, 500], [390, 338]]) {
  const fractional = createMapProjection(fractionalBounds, width, height);
  const rect = { left: 23.7, top: 112.6, width: width * .633, height: height * .824 };
  for (const x of [fractionalBounds.minX, fractionalBounds.maxX]) for (const z of [fractionalBounds.minZ, fractionalBounds.maxZ]) {
    const pixel = fractional.toCanvas(x, z);
    const selected = mapPointFromClient(fractional, rect, rect.left + pixel.x * rect.width / width, rect.top + pixel.y * rect.height / height, fractionalBounds);
    assert.ok(selected, 'rounding at a mapped corner must not reject a valid destination');
    assert.ok(Math.hypot(selected.x - x, selected.z - z) < 1e-8);
  }
}
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 1000, height: 900 }, NaN, 25, bounds), null);
console.log('PASS map pointer projection, CSS scaling, zoom, boundary and unmapped padding');

// High-zoom detail uses visible source vectors, never a stretched raster.
const {drawMapDetail}=await import('../Games/Capital Drive/map-projection.js');
const calls=[];
const ctx={save(){calls.push(['save']);},restore(){calls.push(['restore']);},beginPath(){calls.push(['begin']);},
  rect(...p){calls.push(['rect',...p]);},clip(){calls.push(['clip']);},fillRect(...p){calls.push(['background',...p]);},
  moveTo(...p){calls.push(['move',...p]);},lineTo(...p){calls.push(['line',...p]);},closePath(){calls.push(['close']);},
  fill(rule){calls.push(['fill',rule,this.fillStyle]);},stroke(){calls.push(['stroke',this.strokeStyle,this.lineWidth]);}};
const square=(x,z,size)=>[[x,z],[x+size,z],[x+size,z+size],[x,z+size],[x,z]];
let roadReads=0;
const nearby={points:[[-100,0],[100,0]],type:'residential',width:8};
Object.defineProperty(nearby,'sourceTags',{get(){roadReads++;return {};}});
const map={roads:[nearby,...Array.from({length:3000},(_,i)=>({points:[[10000+i*10,10000],[10005+i*10,10000]],width:8}))],
  buildings:[{points:square(-20,20,8)},{points:square(15000,15000,20)}],
  areas:[{type:'water',points:square(-80,-80,120),innerRings:[{points:square(-50,-50,20)}]}],
  anuCampus:{pedestrianPaths:[{points:[[-30,50],[30,50]],width:10}]}};
const mapBefore=JSON.stringify(map);
const detailProjection=createMapProjection({minX:-1000,maxX:1000,minZ:-1000,maxZ:1000},800,600,{x:0,z:0,zoom:24});
const rail=[{direction:1,points:[[-100,-30],[100,-30]]},{direction:0,points:[[-100,-40],[100,-40]]}];
const stats=drawMapDetail(ctx,map,detailProjection,rail);
assert(stats.candidates<15,'far roads are not revisited by a detail redraw');
assert.equal(stats.drawn,5);assert.equal(stats.segments,3);
assert(calls.some(c=>c[0]==='fill'&&c[1]==='evenodd'&&c[2]==='#9ab7ba'),'water preserves island holes');
assert(calls.filter(c=>c[0]==='close').length>=3,'outer water, island and building outlines are closed');
assert(calls.some(c=>c[0]==='stroke'&&c[1]==='#939b8b'),'building outline stays crisp');
assert(calls.some(c=>c[0]==='stroke'&&c[1]==='#a24342'),'directional rail is retained');
assert(calls.some(c=>c[0]==='stroke'&&c[1]==='#c7c0ad'),'ANU mapped walking avenue is retained');
const readsAfterPlan=roadReads;
drawMapDetail(ctx,map,detailProjection,rail);assert.equal(roadReads,readsAfterPlan,'stable map reuses its lazy plan');
map.roads=[...map.roads,{points:[[-10,-10],[10,-10]],width:5}];
assert.equal(drawMapDetail(ctx,map,detailProjection,rail).segments,4,'replaced source arrays invalidate the plan');
assert.equal(JSON.stringify({...map,roads:map.roads.slice(0,-1)}),mapBefore,'drawing does not mutate source records');
const far=createMapProjection({minX:-1000,maxX:1000,minZ:-1000,maxZ:1000},800,600,{x:-10000,z:-10000,zoom:48});
assert.equal(drawMapDetail(ctx,map,far,rail).drawn,0);
const count=calls.length;
assert.deepEqual(drawMapDetail(ctx,map,{...detailProjection,scale:NaN},rail),{candidates:0,drawn:0,segments:0});
assert.equal(calls.length,count,'invalid projection does not write canvas state');
assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
console.log('PASS detailed map: lazy spatial culling, array invalidation, water islands, crisp buildings, profiled roads, walking paths and directional rail at 24–48×.');
