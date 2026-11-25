#!/usr/bin/env node
// Actual-source geometry/streaming workload, not WebGL rendering or native driving.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const options={root:resolve(new URL('..',import.meta.url).pathname),quality:'low',samples:160,idle:600};
for(let i=2;i<process.argv.length;i+=2){
  const key=process.argv[i].replace(/^--/,'');
  if(!['root','output','quality','samples','idle'].includes(key)||process.argv[i+1]===undefined)throw new Error('Usage: --root <exact-export> --output <fresh-json> [--quality low|standard] [--samples 160] [--idle 600]');
  options[key]=['samples','idle'].includes(key)?Number(process.argv[i+1]):process.argv[i+1];
}
assert(options.output&&['low','standard'].includes(options.quality));
assert(Number.isInteger(options.samples)&&options.samples>=30&&options.samples<=1000);
assert(Number.isInteger(options.idle)&&options.idle>=30&&options.idle<=2000);
options.root=resolve(options.root);options.output=resolve(options.output);
const hashes={},urls=new Map();
async function moduleURL(path){
  path=resolve(path);if(urls.has(path))return urls.get(path);
  let source=await readFile(path,'utf8');hashes[relative(options.root,path)]=createHash('sha256').update(source).digest('hex');
  for(const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)])source=source.replace(match[1],await moduleURL(resolve(dirname(path),match[1])));
  const result=`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;urls.set(path,result);return result;
}
const load=async path=>import(await moduleURL(resolve(options.root,path)));
const json=async name=>{const path=`Games/Capital Drive/data/${name}.json`,bytes=await readFile(resolve(options.root,path));hashes[path]=createHash('sha256').update(bytes).digest('hex');return JSON.parse(bytes);};
const THREE=await load('assets/car-arcade/vendor/three.module.js');
const {createWorldView}=await load('Games/Capital Drive/world-view.js');
const {applyMapExpansion}=await load('Games/Capital Drive/map-expansion.js');
const {applyRoadProfiles}=await load('Games/Capital Drive/road-network.js');
const {applyAirport}=await load('Games/Capital Drive/airport.js');
const {applyDefenceDepot}=await load('Games/Capital Drive/defence-depot.js');
const {applyNorthWest}=await load('Games/Capital Drive/north-west.js');
const {applyStreetAssetRoofs}=await load('Games/Capital Drive/street-assets.js');
let canvases=0;
globalThis.document={createElement(){canvases++;return {getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},strokeRect(){},fillText(){}})};}};
const [base,north,profiles,terrain,airport,airportTerrain,northWest,northWestTerrain]=await Promise.all(['canberra','canberra-north','road-profiles','north-terrain','airport','airport-terrain','north-west','north-west-terrain'].map(json));
let map=applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(base,profiles),north));
map.terrainTiles=[terrain.terrain];map=applyDefenceDepot(applyAirport(map,airport,airportTerrain));map=applyNorthWest(map,northWest,northWestTerrain);map.lakeWaterLevel=5.93;
const mapHash=createHash('sha256').update(JSON.stringify(map)).digest('hex');
const roadLength=road=>road.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-road.points[i][0],p[1]-road.points[i][1]),0);
const schoolRoad=map.roads.filter(road=>road.name==='New South Wales Crescent').sort((a,b)=>roadLength(b)-roadLength(a))[0];
const bridge=map.roads.filter(road=>road.name==='Commonwealth Avenue'&&road.sourceTags?.bridge==='yes').sort((a,b)=>roadLength(b)-roadLength(a))[0];
assert(schoolRoad&&bridge,'actual sourced school avenue and bridge must exist');
function pathPoints(road){
  const lengths=road.points.slice(1).map((p,i)=>Math.hypot(p[0]-road.points[i][0],p[1]-road.points[i][1]));
  const length=lengths.reduce((a,b)=>a+b,0);
  return Array.from({length:options.samples},(_,index)=>{
    let left=length*index/(options.samples-1),segment=0;
    while(segment<lengths.length-1&&left>lengths[segment])left-=lengths[segment++];
    const a=road.points[segment],b=road.points[segment+1],fraction=left/(lengths[segment]||1);
    return {x:a[0]+(b[0]-a[0])*fraction,z:a[1]+(b[1]-a[1])*fraction,yaw:Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]))};
  });
}
const allocation={geometries:0,attributeArrays:0,attributeBytes:0,disposedGeometries:0};
const seenGeometry=new WeakSet(),seenArrays=new WeakSet(),disposed=new WeakSet();
const setAttribute=THREE.BufferGeometry.prototype.setAttribute,setIndex=THREE.BufferGeometry.prototype.setIndex,dispose=THREE.BufferGeometry.prototype.dispose;
function measureAllocation(geometry,attribute){
  if(!seenGeometry.has(geometry)){seenGeometry.add(geometry);allocation.geometries++;}
  if(!seenArrays.has(attribute.array)){seenArrays.add(attribute.array);allocation.attributeArrays++;allocation.attributeBytes+=attribute.array.byteLength;}
}
THREE.BufferGeometry.prototype.setAttribute=function(name,attribute){measureAllocation(this,attribute);return setAttribute.call(this,name,attribute);};
THREE.BufferGeometry.prototype.setIndex=function(index){const result=setIndex.call(this,index);if(this.index)measureAllocation(this,this.index);return result;};
THREE.BufferGeometry.prototype.dispose=function(){if(seenGeometry.has(this)&&!disposed.has(this)){disposed.add(this);allocation.disposedGeometries++;}return dispose.call(this);};
const scene=new THREE.Scene(),started=performance.now();
const view=createWorldView(scene,map,{lowGraphics:options.quality==='low',streaming:true});
const constructionMs=performance.now()-started;
const camera=new THREE.PerspectiveCamera(58,1280/800,.1,1800),frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
function measure(pose){
  const forward={x:-Math.sin(pose.yaw||0),z:-Math.cos(pose.yaw||0)},y=view.heightAt(pose.x,pose.z);
  camera.position.set(pose.x-forward.x*12,y+7,pose.z-forward.z*12);camera.lookAt(pose.x+forward.x*35,y+2,pose.z+forward.z*35);camera.updateMatrixWorld();
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);scene.updateMatrixWorld();
  let residentBytes=0,residentMeshes=0,visibleBatches=0,visibleTriangles=0;const batches={};
  scene.traverse(object=>{if(!object.isMesh)return;residentMeshes++;residentBytes+=object.geometry.index?.array.byteLength??0;for(const attribute of Object.values(object.geometry.attributes))residentBytes+=attribute.array.byteLength;});
  scene.traverseVisible(object=>{
    if(!object.isMesh||(object.frustumCulled&&!frustum.intersectsObject(object)))return;
    visibleBatches++;const triangles=object.geometry.index?object.geometry.index.count/3:object.geometry.attributes.position.count/3;visibleTriangles+=triangles;
    const batch=batches[object.name]||(batches[object.name]={meshes:0,triangles:0});batch.meshes++;batch.triangles+=triangles;
  });
  assert.equal(residentBytes,view.stats.bufferBytes,'reported world bytes match actual resident geometry attributes');
  return {residentBytes,residentMeshes,cameraFrustumBatches:visibleBatches,cameraFrustumTriangles:visibleTriangles,batches,stats:view.stats};
}
function settle(pose){
  for(let i=0;i<100;i++){view.update(pose);if(!view.stats.queuedChunks)return i+1;}
  throw new Error('Streaming queue did not settle in 100 supplied updates');
}
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];};
const summarize=values=>({count:values.length,total:values.reduce((a,b)=>a+b,0),p50:percentile(values,.5),p95:percentile(values,.95),max:Math.max(...values)});
const cases=[];
for(const [name,road] of [['telopea-avenue',schoolRoad],['commonwealth-bridge',bridge]]){
  const poses=pathPoints(road),settleUpdates=settle(poses[0]);
  const before=measure(poses[0]),allocBefore={...allocation},times=[],growth=[],samples=[];
  for(const [index,pose] of poses.entries()){
    const loads=view.stats.loads,start=performance.now();view.update(pose);const elapsed=performance.now()-start;
    (view.stats.loads>loads?growth:times).push(elapsed);
    if(index%20===0||index===poses.length-1)samples.push({index,pose,...measure(pose)});
  }
  settle(poses.at(-1));const after=measure(poses.at(-1)),idleBefore={...allocation},idleStats=view.stats,idleTimes=[];
  for(let i=0;i<options.idle;i++){const start=performance.now();view.update(poses.at(-1));idleTimes.push(performance.now()-start);}
  assert.deepEqual(allocation,idleBefore,'settled repeated updates allocate no new geometry attributes or geometries');
  assert.deepEqual(view.stats,idleStats,'idle geometry/queue state stays unchanged');
  assert(view.stats.residentChunks<=36,'world resident chunk cap is unchanged');
  cases.push({name,sourceRoadId:road.id,sourceId:road.sourceId,sourcePoints:road.points,roadLength:roadLength(road),settleUpdates,before,after,samples,
    ordinaryUpdateMs:times.length?summarize(times):null,constructingUpdateMs:growth.length?summarize(growth):null,idleUpdateMs:summarize(idleTimes),
    allocationDelta:Object.fromEntries(Object.keys(allocation).map(key=>[key,allocation[key]-allocBefore[key]])),idleAllocationDelta:Object.fromEntries(Object.keys(allocation).map(key=>[key,allocation[key]-idleBefore[key]]))});
}
const finalStats=view.stats;view.dispose();assert.equal(scene.children.length,0);assert.equal(view.stats.bufferBytes,0);
assert.equal(createHash('sha256').update(JSON.stringify(map)).digest('hex'),mapHash,'benchmark never mutates source map');
assert.equal(allocation.geometries,allocation.disposedGeometries,'every observed geometry is disposed');
const harnessSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
const report={schemaVersion:1,harnessSha256,quality:options.quality,samples:options.samples,idleUpdates:options.idle,viewport:[1280,800],sourceMapSha256:mapHash,sourceHashes:hashes,
  constructionMs,canvases,allocation,finalStats,cases,heap:process.memoryUsage(),
  limitations:'Node Three.js world-view-only geometry/streaming exercise on exact source-road poses. Shared geographic sidecars are composed, without other scene adapters or runtime-specific clearing/exclusion lists. No WebGL context, actual GPU draw submissions, native driving, browser frame pacing, total RAM or N100 FPS measurement. Camera-frustum mesh batches bound single-pass visible submissions; browser renderer calls are measured separately. Legacy solid batches mix trees with other objects, so total bytes are not isolated foliage bytes. CPU timings are environment-dependent; pair identical harness/options and distinguish geometry construction from steady updates.'};
await mkdir(dirname(options.output),{recursive:true});await writeFile(options.output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({quality:report.quality,constructionMs,allocation,cases:cases.map(row=>({name:row.name,trees:row.after.stats.trees,shrubs:row.after.stats.shrubs??null,foliageTriangles:row.after.stats.foliageTriangles??null,residentBytes:row.after.residentBytes,batches:row.after.cameraFrustumBatches,ordinaryP95Ms:row.ordinaryUpdateMs?.p95,constructionP95Ms:row.constructingUpdateMs?.p95,idleGeometryAllocations:row.idleAllocationDelta.geometries})),output:options.output}));
