import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(join(root,path),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const moduleSource=await read('Games/Capital Drive/street-assets.js'),moduleURL=url(moduleSource);
const {STREET_ASSETS:payload,BUS_STOPS,FUEL_STATIONS,STREET_ASSET_STATS,selectStreetAssets}=await import(moduleURL);
assert.deepEqual(payload,JSON.parse(await read('Games/Capital Drive/data/street-assets.json')));
assert.equal(payload.meta.rawBusStopPlatforms,389);assert.equal(payload.meta.rawFuelElements,15);
assert.equal(BUS_STOPS.length,388);assert.equal(FUEL_STATIONS.length,13);assert.equal(STREET_ASSET_STATS.sourceFiles,35);
assert.equal(FUEL_STATIONS.filter(f=>f.category==='petrol').length,12);
assert.equal(FUEL_STATIONS.filter(f=>f.category==='hydrogen').length,1);
assert.equal(payload.meta.license,'ODbL-1.0');
assert(Object.isFrozen(payload.meta.sourceFiles[0]) && Object.isFrozen(BUS_STOPS[0].sourceTags));
const base=JSON.parse(await read('Games/Capital Drive/data/canberra.json')),north=JSON.parse(await read('Games/Capital Drive/data/canberra-north.json'));
for(const [path,key] of [['canberra.json','mapSha256'],['canberra-north.json','northMapSha256'],['road-profiles.json','roadProfilesSha256']]) assert.equal(sha(await read(`Games/Capital Drive/data/${path}`)),payload.meta[key]);
const [lon0,lat0]=payload.meta.origin;
const project=(lat,lon)=>[(lon-lon0)*111320*Math.cos(lat0*Math.PI/180),(lat0-lat)*111320];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const inside=(p,pp)=>{let hit=false;for(let i=0,j=pp.length-1;i<pp.length;j=i++){const a=pp[i],b=pp[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const nearest=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)||0));return dist(p,[a[0]+dx*t,a[1]+dz*t]);};
const buildings=[...base.buildings,...north.buildings],roads=[...base.roads,...north.roads];
const profiles=JSON.parse(await read('Games/Capital Drive/data/road-profiles.json')).roads;
assert.equal(new Set([...BUS_STOPS,...FUEL_STATIONS].map(s=>s.id)).size,BUS_STOPS.length+FUEL_STATIONS.length);
for(const item of [...BUS_STOPS,...FUEL_STATIONS]) {
  assert(payload.meta.bounds.some(b=>item.x>=b.minX&&item.x<=b.maxX&&item.z>=b.minZ&&item.z<=b.maxZ));
  assert(item.source.version>0 && /^\d{4}-/.test(item.source.timestamp));
  if(item.source.type==='node') assert(dist(project(item.source.lat,item.source.lon),[item.x,item.z])<1e-8,'source coordinates remain exact');
  assert(!JSON.stringify(item.source).match(/"(?:user|uid|changeset)"/));
  for(const part of item.furniture) {
    assert(['pole','bench','shelter','pump','fuel-sign'].includes(part.role));
    assert([part.x,part.z,part.yaw].every(Number.isFinite));
    const p=[part.x,part.z];
    assert(!buildings.some(b=>!(part.role==='pump'&&b.type==='roof')&&inside(p,b.points)),'furniture outside solid source buildings');
    for(const road of roads) {
      if(['footway','path','cycleway','steps','pedestrian','track'].includes(road.type))continue;
      const tag=profiles[road.id]||road.sourceTags||{};
      let width=road.width;const tagged=Number(tag.width);if(tag.width && Number.isFinite(tagged))width=Math.min(24,Math.max(2.5,tagged));
      // Check the actual footprint corners against all nearby road strips,
      // independently of the builder's conservative circumscribed disc.
      const dims={pole:[.12,.12],bench:[1.5,.5],shelter:[2.8,1.4],pump:[.9,.6],'fuel-sign':[.6,.2]}[part.role];
      if(Math.abs(road.points[0][0]-p[0])>1200&&Math.abs(road.points[0][1]-p[1])>1200)continue;
      for(let i=1;i<road.points.length;i++) {
        const a=road.points[i-1],b=road.points[i];
        if(Math.max(a[0],b[0])+20<p[0]||Math.min(a[0],b[0])-20>p[0]||Math.max(a[1],b[1])+20<p[1]||Math.min(a[1],b[1])-20>p[1])continue;
        for(const dx of [-dims[0]/2,dims[0]/2])for(const dz of [-dims[1]/2,dims[1]/2]) {
          const q=[p[0]+dx*Math.cos(part.yaw)-dz*Math.sin(part.yaw),p[1]+dx*Math.sin(part.yaw)+dz*Math.cos(part.yaw)];
          assert(nearest(q,a,b)>width/2+.149,'entire furniture stays beside the carriageway');
        }
      }
    }
  }
}
for(let i=0;i<BUS_STOPS.length;i++) {
 const a=BUS_STOPS[i];
 assert(!a.furniture.some(p=>p.role==='shelter')||a.shelter==='yes');
 assert(!a.furniture.some(p=>p.role==='bench')||a.bench==='yes');
 for(let j=0;j<i;j++){const b=BUS_STOPS[j];assert(!(a.ref&&a.ref===b.ref&&dist([a.x,a.z],[b.x,b.z])<25));}
}
assert.equal(BUS_STOPS.reduce((n,s)=>n+s.duplicateSources.length,0),1);
assert.equal(FUEL_STATIONS.reduce((n,s)=>n+s.duplicateSources.length,0),2);
for(const f of FUEL_STATIONS) {
 assert.notEqual(f.name.toLowerCase(),f.sourceName.toLowerCase());
 if(f.category==='hydrogen')assert.equal(f.furniture.length,0);
 for(const pump of f.furniture.filter(p=>p.role==='pump')) assert(f.canopy && inside([pump.x,pump.z],f.canopy.points));
}
assert.deepEqual(selectStreetAssets(null),{stops:[],fuelStations:[]});
for(const focus of BUS_STOPS.filter((_,i)=>i%25===0)) {
 const selection=selectStreetAssets(focus,{range:100000,stopLimit:999,fuelLimit:999});
 assert(selection.stops.length<=80&&selection.fuelStations.length<=12);
 assert(selection.fuelStations.every(f=>f.category==='petrol'));
 assert(selection.stops.every(s=>dist([s.x,s.z],[focus.x,focus.z])<600));
}
const THREE=await import(url(await read('assets/car-arcade/vendor/three.module.js')));
const threeURL=url(await read('assets/car-arcade/vendor/three.module.js'));
const viewSource=await read('Games/Capital Drive/street-assets-view.js');
const {createStreetAssetsView,STREET_ASSET_VIEW_LIMITS}=await import(url(viewSource.replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)).replace("'./street-assets.js'",JSON.stringify(moduleURL))));
const scene=new THREE.Scene(),terrain=(x,z)=>x*.012+z*.007,view=createStreetAssetsView(scene,terrain),mesh=scene.children[0];
let geometryDisposed=0,materialDisposed=0,instanceDisposed=0;
mesh.geometry.addEventListener('dispose',()=>geometryDisposed++);mesh.material.addEventListener('dispose',()=>materialDisposed++);mesh.addEventListener('dispose',()=>instanceDisposed++);
assert.equal(scene.children.length,1);
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3();
for(const focus of [...BUS_STOPS.filter((_,i)=>i%20===0),...FUEL_STATIONS]) {
 view.update(focus);assert(view.stats.stops<=80&&view.stats.fuelStations<=12&&view.stats.drawCalls<=1);assert.equal(mesh.count,view.stats.instances);
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));position.setFromMatrixPosition(matrix);scale.setFromMatrixScale(matrix);assert(position.y-scale.y/2>=terrain(position.x,position.z)-.025,'no floating terrain below feet or buried furniture');}
}
assert(STREET_ASSET_VIEW_LIMITS.maxInstances>=mesh.count);
view.update(null);assert.equal(mesh.count,0);assert.equal(view.stats.drawCalls,0);
view.dispose();view.dispose();view.update(BUS_STOPS[0]);assert.equal(scene.children.length,0);assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);assert.equal(instanceDisposed,1);assert(view.stats.disposed);assert.equal(view.stats.instances,0);
assert(!/fetch\(|TextureLoader|CanvasTexture|requestAnimationFrame|setInterval|new THREE\..*Light/.test(viewSource));
const index=process.argv.indexOf('--cache'),northIndex=process.argv.indexOf('--north-cache');
if(index>=0) {
 assert(northIndex>=0,'full reproducibility needs both caches');
 const cache=process.argv[index+1],northCache=process.argv[northIndex+1];
 for(const source of payload.meta.sourceFiles)assert.equal(sha(await readFile(join(source.region==='base'?cache:northCache,source.file))),source.sha256);
 const directory=await mkdtemp(join(tmpdir(),'capital-street-rebuild-'));
 try {
  for(const run of [1,2]) {
   const result=spawnSync('python3',['-B',join(root,'scripts/build_capital_street_assets.py'),'--cache',cache,'--north-cache',northCache,'--output',join(directory,`assets${run}.json`),'--module-output',join(directory,`assets${run}.js`)],{encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
   assert.equal(await readFile(join(directory,`assets${run}.json`),'utf8'),await read('Games/Capital Drive/data/street-assets.json'));
   assert.equal(await readFile(join(directory,`assets${run}.js`),'utf8'),moduleSource);
  }
 } finally {await rm(directory,{recursive:true,force:true});}
}
console.log(`PASS sourced street assets: ${BUS_STOPS.length} stops, ${FUEL_STATIONS.length} fuel sites, 35 pinned inputs; safety, source positions, tags, renderer caps and disposal${index>=0?', twice byte-identical cache rebuilds':''}`);
