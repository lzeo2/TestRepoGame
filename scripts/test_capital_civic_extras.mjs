import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url)),game=join(root,'Games/Capital Drive');
const moduleBytes=await readFile(join(game,'civic-extras.js'));
const asModule=bytes=>'data:text/javascript;base64,'+Buffer.from(bytes).toString('base64');
const m=await import(asModule(moduleBytes));
const data=JSON.parse(await readFile(join(game,'data/civic-extras.json')));
const north=JSON.parse(await readFile(join(game,'data/canberra-north.json')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(await readFile(join(game,'data/canberra-north.json'))),data.meta.northMapSha256);
assert.deepEqual(m.EXTRA_STORES,data.stores);
assert.deepEqual(m.CIVIC_PEDESTRIAN_PATHS,data.pedestrianPaths);
assert.deepEqual(m.SKATE_BUILDING_OPENING.polygon,data.skatepark.polygon);
assert(Object.isFrozen(m.EXTRA_STORES[0].building.points[0]));
assert.equal(m.EXTRA_STORES.length,5);
assert.deepEqual(m.EXTRA_STORES.map(s=>s.name),['Wham Comics','Landspin Records','Via Doughce','Decent Games',"Chappy's"]);
assert.equal(data.skatepark.sourceAttributes.ASSET_ID,'SKPK6');
assert.equal(data.skatepark.sourceAttributes.LOCATION,'COOYONG STREET');
assert.equal(data.meta.act.license,'CC-BY-4.0');assert.equal(data.meta.osm.license,'ODbL-1.0');
assert.equal(data.meta.sourceFiles.length,16);
function inside(p,points) {
  let hit=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
for(const s of m.EXTRA_STORES) {
  const building=north.buildings.find(b=>b.id===s.buildingId);
  assert.deepEqual(s.building.points,building.points);
  assert(inside([s.sourcePosition.x,s.sourcePosition.z],building.points));
  for(const b of north.buildings)assert(!inside([s.x,s.z],b.points),'approach outside all source footprints');
  assert(s.aliases.includes(s.sourceName));assert.equal(s.frontage.confidence,'estimated');
  assert(s.frontage.width>=2.5&&s.frontage.width<=6.2);
  assert(m.CIVIC_PEDESTRIAN_PATHS.some(p=>p.id===s.roadId));
  assert(Math.hypot(s.publicApproach.x-s.x,s.publicApproach.z-s.z)<10);
}
for(let i=0;i<m.EXTRA_STORES.length;i++)for(let j=0;j<i;j++) {
  const a=m.EXTRA_STORES[i].frontage,b=m.EXTRA_STORES[j].frontage;
  assert(Math.hypot(a.x-b.x,a.z-b.z)>(a.width+b.width)/2+.5,'independent facade allocations');
}
const [lon0,lat0]=data.meta.origin;
data.skatepark.geographicPolygon.forEach(([lon,lat],i)=>{
  const [x,z]=m.SKATEPARK.polygon[i];
  assert(Math.abs(x-(lon-lon0)*111320*Math.cos(lat0*Math.PI/180))<.000001);
  assert(Math.abs(z-(lat0-lat)*111320)<.000001);
});
const c=m.SKATEPARK_LANDMARK;
assert(m.pointInSkateOpening(c.x,c.z));assert(!m.pointInSkateOpening(0,0));
for(const surface of m.RAMP_SURFACES)for(const t of surface.triangles) {
  for(const [x,y,z] of t)assert(m.pointInSkateOpening(x,z),'ramp stays within exact park');
  const x=t.reduce((s,p)=>s+p[0]/3,0),z=t.reduce((s,p)=>s+p[2]/3,0),y=t.reduce((s,p)=>s+p[1]/3,0);
  assert(Math.abs(m.skateHeightOffset(x,z)-y)<1e-7,'rendered triangle and collision height agree');
}
assert.equal(m.skateHeightOffset(0,0),0);
assert.equal(m.skateHeightOffset(NaN,Infinity),0);
for(const b of m.BARRIERS)assert(m.pointInSkateOpening(...b.a)&&m.pointInSkateOpening(...b.b)&&b.height>0);
function area(points) {
  const origin=points[0];let s=0;
  for(let i=1;i<points.length-1;i++)s+=(points[i][0]-origin[0])*(points[i+1][1]-origin[1])-(points[i+1][0]-origin[0])*(points[i][1]-origin[1]);
  return Math.abs(s/2);
}
const enclosing=[[-250,-4480],[-180,-4480],[-180,-4400],[-250,-4400]];
const outside=m.carveSkatePolygon(enclosing);
assert(Math.abs(outside.reduce((s,p)=>s+area(p),0)+area(m.SKATEPARK.polygon)-area(enclosing))<.00001,'exact opening preserves all other roof area');
for(const p of outside)if(area(p)>.00001)assert(!m.pointInSkateOpening(...p.reduce((s,q)=>[s[0]+q[0]/p.length,s[1]+q[1]/p.length],[0,0])));
const crossing=m.splitSkateSegment([-250,-4440],[-180,-4440]);
assert.equal(crossing.length,2);
assert.equal(m.splitSkateSegment([c.x-.1,c.z],[c.x+.1,c.z]).length,0);
assert.deepEqual(m.splitSkateSegment([0,0],[1,1]),[[[0,0],[1,1]]]);

// Actual Three geometry is constructed without a browser or WebGL context.
const threeURL=asModule(await readFile(join(root,'assets/car-arcade/vendor/three.module.js')));
const THREE=await import(threeURL);
const viewCode=(await readFile(join(game,'civic-extras-view.js'),'utf8'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'./civic-extras.js'",JSON.stringify(asModule(moduleBytes)));
const {createCivicExtrasView}=await import(asModule(viewCode)),scene=new THREE.Scene();
const view=createCivicExtrasView(scene,north,()=>550);
assert.equal(view.stats.drawCalls,0);view.update(c);
assert(view.stats.drawCalls<=5&&view.stats.triangles<=8000);
assert(view.stats.triangles>500&&view.stats.visible>0);
view.update({x:10000,z:10000});assert.equal(view.stats.drawCalls,0);
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert(view.stats.disposed);

const args=process.argv.slice(2),cacheIndex=args.indexOf('--cache'),actIndex=args.indexOf('--act-cache');
if(cacheIndex>=0&&actIndex>=0) {
  const temp=await mkdtemp(join(tmpdir(),'capital-civic-extras-'));
  try {
    for(let i=0;i<2;i++) {
      const output=join(temp,'data-'+i+'.json'),moduleOutput=join(temp,'module-'+i+'.js');
      const result=spawnSync('python3',['-B',join(root,'scripts/build_capital_civic_extras.py'),'--cache',args[cacheIndex+1],'--act-cache',args[actIndex+1],'--output',output,'--module-output',moduleOutput],{encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);
      assert.equal(hash(await readFile(output)),hash(await readFile(join(game,'data/civic-extras.json'))));
      assert.equal(hash(await readFile(moduleOutput)),hash(moduleBytes));
    }
  } finally {await rm(temp,{recursive:true,force:true});}
}
console.log(`PASS Civic extras: 5 exact POIs, 9 paths, ACT boundary/roof carve, ramp height agreement, ${view.stats.triangles} triangles / one draw, cull/disposal`+(cacheIndex>=0?' and two identical source rebuilds':''));
