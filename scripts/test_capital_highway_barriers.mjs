import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { HIGHWAY_BARRIER_DATA, HIGHWAY_BARRIERS, HIGHWAY_BARRIER_PANELS, HIGHWAY_BARRIER_VIEW_LIMITS, selectHighwayBarrierPanels } from '../Games/Capital Drive/highway-barriers.js';
import { createHighwayBarriersView } from '../Games/Capital Drive/highway-barriers-view.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
const raw = await readFile(new URL('../Games/Capital Drive/data/highway-barriers.json', import.meta.url));
const data = JSON.parse(raw), sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(HIGHWAY_BARRIER_DATA,data);
const mapRaw = await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url)), map=JSON.parse(mapRaw);
assert.equal(data.meta.mapSHA256,sha(mapRaw));assert.equal(data.meta.licence,'ODbL-1.0');
assert.equal(data.meta.sourceFiles.length,18);assert.equal(data.meta.sourceGuardRailWays,73);assert.equal(data.meta.exportedWays,73);
assert.equal(data.barriers.length,998);assert.equal(HIGHWAY_BARRIERS.length,data.meta.physicalSegments);assert.equal(data.barriers.length-HIGHWAY_BARRIERS.length,data.meta.omittedUnsupportedLevelSegments);assert(HIGHWAY_BARRIERS.every(b=>b.sourceLayer==='0'&&['no','false','0'].includes(b.sourceBridge)));assert(Object.isFrozen(HIGHWAY_BARRIERS));
for(const file of data.meta.sourceFiles)assert.equal(file.sha256,map.meta.sourceHashes[file.file]);
const paths = new Map(data.paths.map(path=>[String(path.source.id),path]));
let clipped=0;
for(const rail of data.barriers) {
  const path=paths.get(rail.sourceId),i=rail.sourceSegment,sourceA=path.sourcePoints[i],sourceB=path.sourcePoints[i+1];
  assert.equal(path.sourceTags.barrier,'guard_rail');assert.deepEqual(rail.sourceNodeIds,path.nodeIds.slice(i,i+2));
  for(const [point,fraction] of [[rail.a,rail.sourceFraction[0]],[rail.b,rail.sourceFraction[1]]])for(let axis=0;axis<2;axis++)assert(Math.abs(point[axis]-(sourceA[axis]+(sourceB[axis]-sourceA[axis])*fraction))<1e-8,'clipped endpoints remain on the exact projected source segment');
  if(rail.sourceFraction[0]>0||rail.sourceFraction[1]<1)clipped++;
  assert.equal(rail.width,.14);assert.equal(rail.height,.75);assert.equal(rail.points.length,4);
  assert(Math.abs(Math.hypot(rail.points[0][0]-rail.points[3][0],rail.points[0][1]-rail.points[3][1])-.14)<1e-8);
  for(const [x,z] of [rail.a,rail.b])assert(x>=map.bounds.minX-1e-8&&x<=map.bounds.maxX+1e-8&&z>=map.bounds.minZ-1e-8&&z<=map.bounds.maxZ+1e-8);
}
const hindmarsh=HIGHWAY_BARRIERS.filter(b=>b.roadContext?.name==='Hindmarsh Drive');
assert(hindmarsh.length>=40);assert(hindmarsh.every(b=>b.roadContext.distance<=30&&b.roadContext.type==='primary'));
const scene=new THREE.Scene(),terrain=(x,z)=>x*.02+z*.03,view=createHighwayBarriersView(scene,terrain);
const focus={x:(hindmarsh[0].a[0]+hindmarsh[0].b[0])/2,z:(hindmarsh[0].a[1]+hindmarsh[0].b[1])/2};
const selected=selectHighwayBarrierPanels(focus);assert(selected.length>0&&selected.length<=200);
assert(selectHighwayBarrierPanels(focus,1e9,1e9).length<=200);assert.equal(selectHighwayBarrierPanels(null).length,0);
view.update(focus);assert(view.stats.panels>0);assert(view.stats.instances<=600&&view.stats.posts<=400&&view.stats.drawCalls<=2);assert(view.stats.bufferBytes<60000);
const beams=scene.getObjectByName('Source highway guard rails'),posts=scene.getObjectByName('Source highway guard rail posts'),matrix=new THREE.Matrix4(),v=new THREE.Vector3();
for(let i=0;i<beams.count;i++) {
  const panel=selected[i];beams.getMatrixAt(i,matrix);
  for(const [u,point] of [[-.5,panel.a],[.5,panel.b]]) {
    v.set(u,0,0).applyMatrix4(matrix);
    assert(Math.hypot(v.x-point[0],v.z-point[1])<.001,'visible beam endpoints match the collision source centreline');
    assert(Math.abs(v.y-terrain(...point)-.61)<.001,'beam follows supplied terrain slope');
  }
}
for(const mesh of [beams,posts])for(const attribute of Object.values(mesh.geometry.attributes))assert(Array.from(attribute.array).every(Number.isFinite));
const matrixBuffer=beams.instanceMatrix.array,colorBuffer=posts.instanceColor.array;
for(const panel of HIGHWAY_BARRIER_PANELS.filter((_,i)=>i%100===0)) {
  view.update(panel);assert(view.stats.instances<=600&&view.stats.drawCalls<=2);
  assert.equal(beams.instanceMatrix.array,matrixBuffer);assert.equal(posts.instanceColor.array,colorBuffer);
}
view.update({x:1e8,z:1e8});assert.equal(view.stats.instances,0);assert.equal(beams.visible,false);assert.equal(posts.visible,false);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert(view.stats.disposed);
// A real source rail blocks an actual simulation sweep without a teleport or road snap.
const rail=hindmarsh.find(b=>Math.hypot(b.b[0]-b.a[0],b.b[1]-b.a[1])>15);assert(rail);
const dx=rail.b[0]-rail.a[0],dz=rail.b[1]-rail.a[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
const x=(rail.a[0]+rail.b[0])/2,z=(rail.a[1]+rail.b[1])/2;
const simulation=createSimulation({bounds:map.bounds,roads:[],buildings:[],areas:[],barriers:[rail],spawn:{x:x+nx*5,z:z+nz*5,yaw:Math.atan2(nx,nz)}},{trafficCount:0});
assert(simulation.canOccupy(simulation.player));
const hit=simulation.moveVehicle(simulation.player,-nx*8,-nz*8);assert(hit.blocked);
assert((simulation.player.x-x)*nx+(simulation.player.z-z)*nz>0,'swept car remains on its starting side of actual rail');
assert(!simulation.canOccupy({id:'player',x,z,yaw:0}), 'source rail footprint is physical');
const cacheArg=process.argv.indexOf('--cache'),cache=cacheArg>=0?process.argv[cacheArg+1]:process.env.CAPITAL_OSM_CACHE;
if(cache) {
  const wanted=new Set(hindmarsh.flatMap(rail=>rail.sourceNodeIds.map(String))),nodes=new Map();
  for(const file of data.meta.sourceFiles) {
    const bytes=await readFile(join(resolve(cache),file.file));assert.equal(sha(bytes),file.sha256);
    for(const e of JSON.parse(bytes).elements)if(e.type==='node'&&wanted.has(String(e.id))&&(!nodes.has(String(e.id))||(nodes.get(String(e.id)).version||0)<=(e.version||0)))nodes.set(String(e.id),e);
  }
  const [lon0,lat0]=map.meta.origin;
  for(const rail of hindmarsh)for(const [i,nodeId] of rail.sourceNodeIds.entries()) {
    const node=nodes.get(String(nodeId));assert(node);const expected=[(node.lon-lon0)*111320*Math.cos(lat0*Math.PI/180),(lat0-node.lat)*111320];
    const point=paths.get(rail.sourceId).sourcePoints[rail.sourceSegment+i];assert(Math.hypot(point[0]-expected[0],point[1]-expected[1])<1e-8,'actual Hindmarsh rail source nodes project without any street offset');
  }
  const temp=await mkdtemp(join(tmpdir(),'capital-guardrail-test-'));
  try {
    const script=new URL('./build_capital_highway_barriers.py',import.meta.url).pathname;
    const outputs=[];
    for(let run=0;run<2;run++) {
      const json=join(temp,`${run}.json`),js=join(temp,`${run}.js`);
      const result=spawnSync('python3',['-B',script,'--cache',resolve(cache),'--output',json,'--module-output',js],{encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);outputs.push([await readFile(json),await readFile(js)]);
    }
    assert.deepEqual(outputs[0],outputs[1]);assert.deepEqual(outputs[0][0],raw);
    assert.deepEqual(outputs[0][1],await readFile(new URL('../Games/Capital Drive/highway-barriers.js',import.meta.url)));
    const {mkdir}=await import('node:fs/promises');const bad=join(temp,'bad');await mkdir(bad);
    for(const file of data.meta.sourceFiles)await symlink(join(resolve(cache),file.file),join(bad,file.file));
    const first=data.meta.sourceFiles[0].file;await rm(join(bad,first));await writeFile(join(bad,first),'{}');
    const fail=spawnSync('python3',['-B',script,'--cache',bad,'--output',join(temp,'bad.json'),'--module-output',join(temp,'bad.js')],{encoding:'utf8'});
    assert.notEqual(fail.status,0);assert.match(fail.stderr,/Source hash mismatch/);
    console.log('PASS guard rail builder: two byte-identical builds match tracked data/module; tampered pinned source rejected');
  } finally {await rm(temp,{recursive:true,force:true});}
} else console.log('SKIP external cache rebuild: supply --cache or CAPITAL_OSM_CACHE for reproducibility/hash rejection checks');
console.log(`PASS source guard rails: ${data.paths.length} ways/${HIGHWAY_BARRIERS.length} segments, ${hindmarsh.length} Hindmarsh segments, ${clipped} clipped segments, finite sloped beam/source collision agreement, swept-car blocking, indexed500m selection, fixed600instance/two-draw budget, disposal`);
