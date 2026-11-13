import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const threeURL = dataURL(await read('../assets/car-arcade/vendor/three.module.js'));
const dataSource = await read('../Games/Capital Drive/landmarks.js'), landmarksURL = dataURL(dataSource);
const { LANDMARKS, LANDMARK_CLEARINGS, MANUKA_POOL_BASIN, MANUKA_POOL_SITE, POOL_BARRIERS, POOL_GATE_APPROACHES, replacedBuildingIds } = await import(landmarksURL);
const THREE = await import(threeURL);
const source = (await read('../Games/Capital Drive/landmarks-view.js')).replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./landmarks.js', landmarksURL);
const { createLandmarksView } = await import(dataURL(source));
const map = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const original = JSON.stringify(map), ids = replacedBuildingIds(map);
assert.equal(ids.size, 13);
assert.ok(ids.has('act-75267-0'),'only inspected pool block is replaced');
for(const id of ['act-92000-0','act-95964-0','act-125329-0'])assert.ok(!ids.has(id),'neighbouring community outline retained');
assert.equal(replacedBuildingIds({buildings:[{id:'nearby-house'}]}).size,0);
assert.equal(JSON.stringify(map),original,'pure replacement lookup does not mutate source map');
for(const site of LANDMARKS) {
  assert.ok(Object.isFrozen(site));
  assert.ok(site.x>map.bounds.minX&&site.x<map.bounds.maxX&&site.z>map.bounds.minZ&&site.z<map.bounds.maxZ);
  assert.ok(Math.abs(site.x-(site.lon-149.137)*111320*Math.cos(-35.318*Math.PI/180))<1e-8);
}
const scene = new THREE.Scene(), ground = (x,z) => 20+x*0.002+z*0.001;
const view = createLandmarksView(scene,map,ground), root = scene.children[0];
assert.equal(view.stats.landmarks,5);assert.equal(view.stats.meshes,10);
assert.ok(view.stats.triangles<16000,'bounded N100 geometry budget');
let geometries=0,materials=0;const materialSet=new Set();
root.traverse(object=>{
  if(!object.isMesh)return;
  for(const attribute of Object.values(object.geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value),'finite vertex/color/normal');
  object.geometry.addEventListener('dispose',()=>geometries++);materialSet.add(object.material);
  assert.ok(object.geometry.boundingSphere.radius>0);
});
for(const material of materialSet)material.addEventListener('dispose',()=>materials++);
for(const site of LANDMARKS){const group=root.children.find(g=>g.name===site.name);assert.equal(group.position.y,ground(site.x,site.z));}
const pool=root.children.find(g=>g.name==='Manuka Pool');
assert.ok(Object.isFrozen(MANUKA_POOL_BASIN)&&MANUKA_POOL_BASIN.every(Object.isFrozen));
assert.ok(LANDMARK_CLEARINGS.includes(MANUKA_POOL_BASIN),'pool water excludes generated trees');
const poolSurface=pool.children[1].geometry.attributes.position;
const poolTint=pool.children[1].geometry.attributes.color, water=new THREE.Color(0x57949e);
const waterVertices=[];
for(let i=0;i<poolSurface.count;i++)if(Math.abs(poolTint.getX(i)-water.r)<1e-6&&Math.abs(poolTint.getY(i)-water.g)<1e-6)waterVertices.push([poolSurface.getX(i)+pool.position.x,poolSurface.getY(i)+pool.position.y,poolSurface.getZ(i)+pool.position.z]);
assert.equal(waterVertices.length,6,'basin remains two bounded water triangles');
for(const [x,z] of MANUKA_POOL_BASIN)assert.ok(waterVertices.some(p=>Math.abs(p[0]-x)<1e-5&&Math.abs(p[2]-z)<1e-5),'exact projected water corner retained');
assert.ok(waterVertices.every(p=>Math.abs(p[1]-waterVertices[0][1])<1e-6),'water is level across terrain');
assert.ok(waterVertices.every(p=>p[1]>ground(p[0],p[2])),'basin clears sampled terrain');
// Source-way geometry is independently checked against the cached 80-node ring.
const sourceRing=MANUKA_POOL_SITE.map(([x,z])=>[
  Number((-z/111320-35.318).toFixed(7)),
  Number((x/(111320*Math.cos(-35.318*Math.PI/180))+149.137).toFixed(7)),
]);
assert.equal(sourceRing.length,80);
assert.equal(createHash('sha256').update(JSON.stringify(sourceRing)).digest('hex'),'df0b8c2f164b3ad24f1efe5af7b4b2f9d71a6a0e1e395838f6a47fc988acdf2d','exact OSM way51677758 v7 vertices, independent of art');
assert.ok(Object.isFrozen(MANUKA_POOL_SITE)&&MANUKA_POOL_SITE.every(Object.isFrozen));
assert.ok(LANDMARK_CLEARINGS.includes(MANUKA_POOL_SITE),'authored pool landscape clears generated trees throughout site');
assert.ok(Object.isFrozen(POOL_BARRIERS)&&POOL_BARRIERS.every(b=>Object.isFrozen(b)&&Object.isFrozen(b.points)&&b.points.every(Object.isFrozen)));
assert.equal(new Set(POOL_BARRIERS.map(b=>b.id)).size,POOL_BARRIERS.length);
assert.equal(POOL_BARRIERS.filter(b=>b.kind==='building').length,2);
assert.equal(POOL_BARRIERS.filter(b=>b.kind==='pillar').length,2);
const poolVertices=pool.children.flatMap(mesh=>{
  const a=mesh.geometry.attributes.position,out=[];
  for(let i=0;i<a.count;i++)out.push([a.getX(i)+pool.position.x,a.getY(i)+pool.position.y,a.getZ(i)+pool.position.z]);
  return out;
});
function inside([x,z],polygon) {
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function distanceToSegment(p,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);
}
for(const barrier of POOL_BARRIERS) {
  assert.ok(barrier.width>0&&barrier.depth>0&&Number.isFinite(barrier.yaw));
  for(const [x,z] of barrier.points) {
    assert.ok(poolVertices.some(p=>Math.abs(p[0]-x)<2e-5&&Math.abs(p[2]-z)<2e-5),'render footprint matches exported collision corner');
    assert.ok(!inside([x,z],MANUKA_POOL_BASIN),'no enclosure or entrance collider across source water');
  }
  assert.ok(!MANUKA_POOL_BASIN.some(p=>inside(p,barrier.points)),'basin corners remain outside every barrier');
  if(barrier.kind==='wall'||barrier.kind==='fence') {
    for(const [x,z] of [barrier.a,barrier.b]) {
      const expected=ground(x,z)+barrier.height;
      assert.ok(poolVertices.some(p=>Math.hypot(p[0]-x,p[2]-z)<0.3&&Math.abs(p[1]-expected)<0.01),'fence/wall tops follow segment terrain');
    }
  }
}
assert.ok(Object.isFrozen(POOL_GATE_APPROACHES)&&POOL_GATE_APPROACHES.every(Object.isFrozen));
const gate=POOL_GATE_APPROACHES[0];
assert.ok(gate.clearWidth>=2&&gate.width>gate.clearWidth,'open entrance has at least two metres usable width');
assert.ok(inside(gate.inside,MANUKA_POOL_SITE)&&!inside(gate.outside,MANUKA_POOL_SITE));
// A pedestrian-radius sweep from road side through the fixed-open portal is clear.
for(let step=0;step<=30;step++) {
  const t=step/30,p=[gate.outside[0]+(gate.inside[0]-gate.outside[0])*t,gate.outside[1]+(gate.inside[1]-gate.outside[1])*t];
  for(const barrier of POOL_BARRIERS) {
    assert.ok(!inside(p,barrier.points));
    for(let i=0;i<4;i++)assert.ok(distanceToSegment(p,barrier.points[i],barrier.points[(i+1)%4])>0.4,'pedestrian sweep clears every fence, gate pillar and entrance wing');
  }
}
const localPoolMeshes=pool.children.map(mesh=>new THREE.Mesh(mesh.geometry,mesh.material));
const start=new THREE.Vector3(gate.outside[0]-pool.position.x,ground(gate.x,gate.z)+1-pool.position.y,gate.outside[1]-pool.position.z);
const finish=new THREE.Vector3(gate.inside[0]-pool.position.x,start.y,gate.inside[1]-pool.position.z);
const gateRay=new THREE.Raycaster(start,finish.clone().sub(start).normalize(),0,start.distanceTo(finish));
assert.equal(gateRay.intersectObjects(localPoolMeshes).length,0,'rendered portal also stays clear at pedestrian height');
const nearShader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
pool.children[0].material.onBeforeCompile(nearShader);
assert.ok(nearShader.fragmentShader.includes('grain * 0.055'),'original bounded near material grain');
assert.equal(pool.children[0].material.customProgramCacheKey(),'capital-landmark-grain-v1');
const parliament=root.children.find(g=>g.name==='Parliament House');
assert.ok(Math.abs(parliament.rotation.y+0.615)<1e-8,'land axis faces northeast');
const localMeshes=parliament.children.map(mesh=>new THREE.Mesh(mesh.geometry,mesh.material));
const ray=new THREE.Raycaster(new THREE.Vector3(2.5,3.2,-225),new THREE.Vector3(0,0,1));
const entranceHits=ray.intersectObjects(localMeshes);
assert.ok(entranceHits.length>0);
assert.ok(Math.abs(entranceHits[0].point.z+152.14)<0.02,'forecourt sightline reaches exposed glazing before walls/columns');
const hitColor=localMeshes[0].geometry.attributes.color;
const glassColor=new THREE.Color(0x526c72);
assert.ok(Math.abs(hitColor.getX(entranceHits[0].face.a)-glassColor.r)<1e-6,'first visible entrance surface is glass');
assert.ok(Object.isFrozen(LANDMARK_CLEARINGS)&&LANDMARK_CLEARINGS.every(Object.isFrozen));
const inverse = ([x,z]) => [(x-LANDMARKS[0].x)*Math.cos(-0.615)-(z-LANDMARKS[0].z)*Math.sin(-0.615),(x-LANDMARKS[0].x)*Math.sin(-0.615)+(z-LANDMARKS[0].z)*Math.cos(-0.615)];
assert.ok(Math.abs(inverse(LANDMARK_CLEARINGS[0][0])[0]+80)<1e-8);
assert.ok(Math.abs(inverse(LANDMARK_CLEARINGS[0][2])[1]+145)<1e-8);

const silhouette=parliament.children[1].geometry.attributes.position.array;
let highest=-Infinity;for(let i=1;i<silhouette.length;i+=3)highest=Math.max(highest,silhouette[i]);
assert.equal(highest,99,'81m flag mast above18m roof deck');
const roofColor=new THREE.Color(0x7e915d),roofPoints=[],silhouetteColor=parliament.children[1].geometry.attributes.color;
for(let i=0;i<silhouette.length/3;i++) if(Math.abs(silhouetteColor.getX(i)-roofColor.r)<1e-6&&Math.abs(silhouetteColor.getY(i)-roofColor.g)<1e-6)roofPoints.push([silhouette[i*3],silhouette[i*3+1],silhouette[i*3+2]]);
assert.ok(roofPoints.length>0);
assert.equal(Math.max(...roofPoints.map(p=>p[1])),18,'central lawn roof retains18m crest');
assert.ok(roofPoints.filter(p=>Math.abs(p[2])===132).every(p=>p[1]<=2.161),'front/back grass edge stays low');
assert.ok(roofPoints.filter(p=>Math.abs(p[0])===150).every(p=>p[1]===0),'outer lawn edge remains grounded');
let whiteFlag=0,redFlag=0;
const white=new THREE.Color(0xffffff),red=new THREE.Color(0xc53c40);
for(let i=0;i<silhouette.length/3;i++)if(silhouette[i*3+1]>88){if(Math.abs(silhouetteColor.getX(i)-white.r)<1e-6)whiteFlag++;if(Math.abs(silhouetteColor.getX(i)-red.r)<1e-6&&Math.abs(silhouetteColor.getY(i)-red.g)<1e-6)redFlag++;}
assert.ok(whiteFlag>100&&redFlag>12,'flag has white stars/canton and red cross geometry');

view.update(LANDMARKS[0]);assert.equal(view.stats.visibleNear,2);assert.ok(view.stats.visibleDistant>=1);
view.update({x:LANDMARKS[0].x-2500,z:LANDMARKS[0].z});assert.ok(parliament.visible);assert.equal(parliament.children[0].visible,false);
assert.equal(parliament.children[1].material.fog,false,'distant skyline survives world fog');
view.update({x:1e6,z:1e6});assert.equal(view.stats.visibleNear+view.stats.visibleDistant,0);assert.ok(root.children.every(group=>!group.visible));
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(geometries,10);assert.equal(materials,2);
const empty = createLandmarksView(scene,{bounds:{minX:0,maxX:1,minZ:0,maxZ:1}},ground);assert.equal(empty.stats.landmarks,0);empty.dispose();
// Exercise the actual world candidate filter: one exact clearing removes its
// candidates while a distant polygon preserves identical generation/budgets.
const worldSource=(await read('../Games/Capital Drive/world-view.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL).replace('./road-network.js',dataURL(await read('../Games/Capital Drive/road-network.js'))).replace('./districts.js',dataURL(await read('../Games/Capital Drive/districts.js')));
const {createWorldView}=await import(dataURL(worldSource));
const treeMap={bounds:{minX:0,maxX:200,minZ:0,maxZ:200},roads:[],buildings:[],areas:[{type:'park',points:[[0,0],[200,0],[200,200],[0,200]]}],landmarks:[]};
const trees=createWorldView(scene,treeMap), baseline=trees.stats.trees;assert.ok(baseline>0);trees.dispose();
const cleared=createWorldView(scene,{...treeMap,landmarkTreeExclusions:[[[-10,-10],[210,-10],[210,210],[-10,210]]]});assert.equal(cleared.stats.trees,0);cleared.dispose();
const outside=createWorldView(scene,{...treeMap,landmarkTreeExclusions:[[[300,300],[400,300],[400,400],[300,400]]]});assert.equal(outside.stats.trees,baseline);outside.dispose();
console.log(`PASS landmarks:5 sites,${view.stats.triangles} triangles, exact13 replacement IDs, exact site/basin, aligned barriers, passable gate, projection, grounding,81m mast, LOD, fog, finite buffers and idempotent disposal`);
