import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Scene } from '../assets/car-arcade/vendor/three.module.js';
import { emitNationalArchitecture, NATIONAL_ARCHITECTURE_IDS } from '../Games/Capital Drive/national-architecture.js';
import { createWorldView } from '../Games/Capital Drive/world-view.js';

const mapped = [];
for (const pack of ['canberra-north', 'region-south']) {
  const data = JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${pack}.json`, import.meta.url), 'utf8'));
  mapped.push(...data.buildings.filter(b => NATIONAL_ARCHITECTURE_IDS.has(b.id)));
}
assert.equal(mapped.length, 4);
assert.equal(emitNationalArchitecture({id:'other',name:'National Library of Australia'},{}), false);

const base = 7.2, footing = 4.55;
function collect(building, lowGraphics) {
  const faces = [];
  const emitTriangle = (a,b,c,tint) => {
    assert([a,b,c].every(p => p.length === 3 && p.every(Number.isFinite)));
    const u=b.map((p,i)=>p-a[i]), v=c.map((p,i)=>p-a[i]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    assert(Math.hypot(...normal)>.000001,'positive triangle area');
    assert(Number.isInteger(tint) && tint>=0 && tint<=0xffffff);
    faces.push({a,b,c,tint,normal});
  };
  const points = building.points.slice(0,-1);
  assert(emitNationalArchitecture(building,{points,base,footing,lowGraphics,emitTriangle}));
  return faces;
}

function area(ring) {
  return Math.abs(ring.reduce((s,a,i)=>{
    const b=ring[(i+1)%ring.length];
    return s+a[0]*b[1]-a[1]*b[0];
  },0))/2;
}

for (const building of mapped) {
  assert.equal(building.sourceId,'way/'+building.id.substring(4));
  const saved=JSON.stringify(building);
  let lowFaces;
  for (const low of [true,false]) {
    const faces=collect(building,low);
    if (low) lowFaces=faces.length;
    else assert(faces.length>lowFaces);
    assert(faces.length <= (low?1000:1350),'triangle budget on real footprint');
    const points=building.points.slice(0,-1);
    const foot=faces.filter(f=>f.tint===0x858780);
    assert.equal(foot.length,2*points.length);
    assert.deepEqual(new Set(foot.flatMap(f=>[f.a,f.b,f.c]).filter(p=>Math.abs(p[1]-footing)<1e-7).map(p=>p[0]+','+p[2])),
      new Set(points.map(p=>p.join(','))),'terrain skirt follows the complete public footprint');
    const ofTint = tint => faces.filter(f=>f.tint===tint);
    if (building.id==='osm-5035476') {
      const roof=faces.filter(f=>[0x55595c,0x3f4147,0x494b50].includes(f.tint));
      assert(roof.every(f=>f.normal[1]>0));
      assert(Math.abs(roof.reduce((s,f)=>s+f.normal[1]/2,0)-area(points))<.01,'courtyard is open');
      const peaks=ofTint(0x576b67).flatMap(f=>[f.a,f.b,f.c]).filter(p=>Math.abs(p[1]-base-22.16)<.001);
      assert.equal(new Set(peaks.map(p=>p.join(','))).size,6,'six lakefront rooflights');
      const top=Math.max(...faces.flatMap(f=>[f.a[1],f.b[1],f.c[1]]))-base;
      assert(top>29.95 && top<30.15,'museum loop reaches the published 30 metres');
    } else if(building.id==='osm-5954392') {
      assert.equal(ofTint(0xdddcd4).length,10*(16*2+6*2),'sixteen by eight perimeter colonnade including shared corners');
      const soffit=ofTint(0xbbb9ae);
      assert.equal(soffit.length,2);
      assert(soffit.every(f=>f.normal[1]<0),'underside is visible from the steps');
    } else if(building.id==='osm-217376654') {
      assert.equal(ofTint(0xc8cac3).length,28,'fourteen roof monitors');
      assert.equal(ofTint(0x626f70).length,28);
      assert(ofTint(0x626f70).every(f=>f.normal[1]>0),'rooflights face the sky');
    } else {
      assert(ofTint(0x265587).length>=72 && ofTint(0x3a6ca1).length>100,'separate cobalt entrance frame and tilted screen');
      assert(ofTint(0x52616b).every(f=>f.normal[0]<0 && f.normal[2]>0),'foyer windows face Constitution Avenue');
      assert(ofTint(0xd9dad2).every(f=>f.normal[1]>0),'auditorium roof faces sky');
    }
    console.log('PASS',building.name,low?'low':'standard',faces.length,'triangles');
  }
  assert.equal(JSON.stringify(building),saved,'source geometry stays untouched');
}

// Enter and leave through the production streamer. Even the Museum and Library
// which each straddle chunk boundaries have only one owner and one opaque draw.
const bounds={minX:-4600,maxX:200,minZ:-4200,maxZ:800};
const terrain={...bounds,cols:8,rows:8,heights:Array(64).fill(5)};
const spawn={x:100,z:750};
const map={bounds,terrain,spawn,roads:[],landmarks:[],areas:[],buildings:mapped};
const scene=new Scene();
const view=createWorldView(scene,map,{lowGraphics:true,streaming:true,openingChunks:0,foliageTexture:null});
assert.equal(view.stats.buildings,0);
function visit(p) {
  view.update(p);
  while(view.pendingChunks) view.update(p);
}
for (const building of mapped) {
  const points=building.points.slice(0,-1);
  const x=points.reduce((n,p)=>n+p[0],0)/points.length;
  const z=points.reduce((n,p)=>n+p[1],0)/points.length;
  visit({x,z});
  const name='District '+Math.floor(x/350)+','+Math.floor(z/350);
  const chunk=scene.getObjectByName(name);
  assert(chunk,'owner chunk is loaded');
  const solids=chunk.children.filter(mesh=>mesh.name==='Canberra solid');
  assert.equal(solids.length,1,'one existing opaque chunk draw');
  assert(solids[0].geometry.attributes.position.count>=collect(building,true).length*3);
}
visit({x:100,z:750});
assert.equal(view.stats.buildings,0,'eviction drops every national exterior');
assert(view.stats.evictions>0);
visit({x:-4009,z:32});
assert.equal(view.stats.buildings,1,'returning reconstructs the single owned landmark');
view.dispose();
assert.equal(scene.children.length,0);
console.log('PASS streamed entry, owner batching, eviction and return');
