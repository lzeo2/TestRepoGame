import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emitRegionalArchitecture, REGIONAL_ARCHITECTURE_IDS} from '../Games/Capital Drive/regional-architecture.js';

const cases = [
  ['canberra-north', 'osm-4970449'],
  ['region-molonglo', 'osm-663660535'],
  ['airport', 'osm-30160608']
];
const area = ring => Math.abs(ring.reduce((sum,a,i)=>{
  const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-a[1]*b[0];
},0))/2;
assert.deepEqual(new Set(cases.map(([,id])=>id)),REGIONAL_ARCHITECTURE_IDS);
for (const [source,id] of cases) {
  const data=JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${source}.json`,import.meta.url)));
  const building=data.buildings.find(b=>b.id===id), points=building.points.slice(0,-1);
  const base=37, footing=36;
  for (const lowGraphics of [true,false]) {
    const faces=[];
    const emitTriangle=(a,b,c,color)=>{
      const normalY=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
      assert([a,b,c].every(p=>p.length===3 && p.every(Number.isFinite)));
      assert(Number.isInteger(color));faces.push({a,b,c,color,normalY});
    };
    assert(emitRegionalArchitecture(building,{points,base,footing,lowGraphics,emitTriangle}));
    assert(faces.length>0 && faces.length<2500);
    if(id==='osm-4970449') {
      const copper=faces.filter(f=>[0x886747,0x947454,0x907052,0x9a7a58].includes(f.color));
      assert(copper.length && copper.every(f=>f.normalY>0),'copper shell visible from above');
      const rim=faces.filter(f=>f.color===0xc7b69c).filter((_,i)=>i%2===0).map(f=>f.a[1]);
      const legs=rim.filter((y,i)=>y<rim[(i+rim.length-1)%rim.length] && y<rim[(i+1)%rim.length]);
      assert.equal(legs.length,16);
      assert(Math.max(...rim)-Math.min(...rim)>1.8,'open arches between the feet');
      assert.equal(Math.max(...copper.flatMap(f=>[f.a[1],f.b[1],f.c[1]])),base+building.height);
    } else {
      const roofColors=id==='osm-30160608'?[0x9c9c93]:[0x748f94,0x929e9e,0x9ca6a6];
      const roof=faces.filter(f=>roofColors.includes(f.color));
      assert(roof.every(f=>f.normalY>=-1e-7));
      assert(Math.abs(roof.reduce((sum,f)=>sum+f.normalY/2,0)-area(points))<.015,'roof covers the exact concave footprint');
      if(id==='osm-663660535') assert(roof.some(f=>f.color===0x748f94),'zinc hall has visible rooflights');
      else assert(faces.some(f=>f.color===0x3f899b),'recessed outlet approach has coloured angled posts');
    }
    console.log('PASS',building.name,lowGraphics?'low':'standard',faces.length,'triangles');
  }
}
assert.equal(emitRegionalArchitecture({id:'another-building'},{}),false);
