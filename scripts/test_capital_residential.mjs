import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {applyResidentialExpansion} from '../Games/Capital Drive/residential-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
const load=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
const regions=await Promise.all(['belconnen','north','south'].map(r=>load(`region-${r}`)));
let base=applyMapExpansion(await load('canberra'),await load('canberra-north'));
base.terrainTiles=[(await load('north-terrain')).terrain];
base=applyAirport(base,await load('airport'),await load('airport-terrain'));
base=applyNorthWest(base,await load('north-west'),await load('north-west-terrain'),await load('giant-spray'));
base=applyRegionalExpansion(base,regions);
const raw=await readFile(new URL('../Games/Capital Drive/data/residential-supplement.json',import.meta.url)),supplement=JSON.parse(raw);
assert(raw.length<8_000_000,'supplement has a fixed source-data budget');
assert.equal(supplement.meta.license,'ODbL-1.0');
for(const p of supplement.meta.priorSnapshots){const bytes=await readFile(new URL(`../Games/Capital Drive/data/${p.file}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);}
assert.equal(supplement.buildings.length,16448);
assert.deepEqual(supplement.meta.reports.map(r=>r.added),[6626,4033,5789]);
assert.equal(new Set(supplement.buildings.map(b=>b.sourceId)).size,supplement.buildings.length);
for(const body of supplement.buildings){assert(Number.isInteger(body.sourceVersion));assert(body.sourceTimestamp);assert.equal(body.sourceTags.building,body.type);}
const t=performance.now(),map=applyResidentialExpansion(base,supplement),mergeMs=performance.now()-t;
assert.equal(map.buildings.length-base.buildings.length,16448);
for(const key of ['roads','terrain','terrainTiles','bounds','spawn','landmarks','areas'])assert.equal(map[key],base[key],`${key} retains ownership`);
for(let i=0;i<base.buildings.length;i++)assert.equal(map.buildings[i],base.buildings[i]);
assert.equal(applyResidentialExpansion(map,supplement),map);
assert.throws(()=>applyResidentialExpansion({...base,regionalExpansion:[]},supplement),/requires retained/);
assert.throws(()=>applyResidentialExpansion(base,{...supplement,meta:{...supplement.meta,origin:[0,0]}}),/projection/);
const first=supplement.buildings[0];
assert.throws(()=>applyResidentialExpansion(base,{...supplement,buildings:[{...first,points:[[1e8,0],[1e8+1,0],[1e8+1,1],[1e8,0]]}]}),/outside retained/);
assert.throws(()=>applyResidentialExpansion(base,{...supplement,buildings:[{...first,type:'fabricated'}]}),/Invalid source/);
const duplicate=applyResidentialExpansion(base,{...supplement,buildings:[first,first]});assert.equal(duplicate.residentialExpansion.addedBuildings,1);assert.equal(duplicate.residentialExpansion.duplicateSources,1);
const sampler=createTerrainSampler(map),start=performance.now();
const simulation=createSimulation(map,{terrainSampler:sampler,trafficCount:0});
const indexMs=performance.now()-start;
assert(simulation);assert(Number.isFinite(sampler.heightAt(first.points[0][0],first.points[0][1])));
console.log(`PASS residential supplement: ${supplement.buildings.length} actual source footprints (${raw.length} bytes), strict region/terrain guards, retained identities, duplicate rejection; merge ${mergeMs.toFixed(1)} ms, composed simulation index ${indexMs.toFixed(1)} ms (detached CPU only).`);
if(process.argv.includes('--render')||process.argv.includes('--render-baseline')){
  const THREE=await import('../assets/car-arcade/vendor/three.module.js');
  const {createWorldView}=await import('../Games/Capital Drive/world-view.js');
  globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},strokeRect(){},fillText(){}})})};
  const scene=new THREE.Scene(),begin=performance.now();
  const view=createWorldView(scene,process.argv.includes('--render-baseline')?base:map,{streaming:true,lowGraphics:true,terrainSampler:sampler});
  const initMs=performance.now()-begin,measurements=[];
  for(const region of ['belconnen','north','south']){
    const body=supplement.buildings.find(b=>b.residentialRegion===region),p=body.points[0],focus={x:p[0],z:p[1]};
    const started=performance.now();
    view.update(focus,{maxLoads:0});let calls=0;
    while(view.pendingChunks&&calls++<25){const before=view.stats.loads;view.update(focus);assert(view.stats.loads-before<=2);}
    const stats=view.stats;assert(stats.residentChunks<=36);assert.equal(view.pendingChunks,0);
    measurements.push({region,loads:calls,residentChunks:stats.residentChunks,bufferMB:Math.round(stats.residentBytes/1e5)/10,triangles:stats.triangles,ms:Math.round(performance.now()-started)});
  }
  view.dispose();assert.equal(view.stats.residentBytes,0);delete globalThis.document;
  console.log(JSON.stringify({scope:'detached low-graphics streamed CPU geometry, no GPU/device claim',baseline:process.argv.includes('--render-baseline'),initMs:Math.round(initMs),measurements}));
}
