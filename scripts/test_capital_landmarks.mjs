import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const threeURL = dataURL(await read('../assets/car-arcade/vendor/three.module.js'));
const dataSource = await read('../Games/Capital Drive/landmarks.js'), landmarksURL = dataURL(dataSource);
const { LANDMARKS, LANDMARK_CLEARINGS, replacedBuildingIds } = await import(landmarksURL);
const THREE = await import(threeURL);
const source = (await read('../Games/Capital Drive/landmarks-view.js')).replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./landmarks.js', landmarksURL);
const { createLandmarksView } = await import(dataURL(source));
const map = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const original = JSON.stringify(map), ids = replacedBuildingIds(map);
assert.equal(ids.size, 12);
assert.equal(replacedBuildingIds({buildings:[{id:'nearby-house'}]}).size,0);
assert.equal(JSON.stringify(map),original,'pure replacement lookup does not mutate source map');
for(const site of LANDMARKS) {
  assert.ok(Object.isFrozen(site));
  assert.ok(site.x>map.bounds.minX&&site.x<map.bounds.maxX&&site.z>map.bounds.minZ&&site.z<map.bounds.maxZ);
  assert.ok(Math.abs(site.x-(site.lon-149.137)*111320*Math.cos(-35.318*Math.PI/180))<1e-8);
}
const scene = new THREE.Scene(), ground = (x,z) => 20+x*0.002+z*0.001;
const view = createLandmarksView(scene,map,ground), root = scene.children[0];
assert.equal(view.stats.landmarks,4);assert.equal(view.stats.meshes,8);
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
view.update(LANDMARKS[0]);assert.equal(view.stats.visibleNear,2);assert.ok(view.stats.visibleDistant>=1);
view.update({x:LANDMARKS[0].x-2500,z:LANDMARKS[0].z});assert.ok(parliament.visible);assert.equal(parliament.children[0].visible,false);
assert.equal(parliament.children[1].material.fog,false,'distant skyline survives world fog');
view.update({x:1e6,z:1e6});assert.equal(view.stats.visibleNear+view.stats.visibleDistant,0);assert.ok(root.children.every(group=>!group.visible));
view.dispose();view.dispose();assert.equal(scene.children.length,0);assert.equal(geometries,8);assert.equal(materials,2);
const empty = createLandmarksView(scene,{bounds:{minX:0,maxX:1,minZ:0,maxZ:1}},ground);assert.equal(empty.stats.landmarks,0);empty.dispose();
// Exercise the actual world candidate filter: one exact clearing removes its
// candidates while a distant polygon preserves identical generation/budgets.
const worldSource=(await read('../Games/Capital Drive/world-view.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL);
const {createWorldView}=await import(dataURL(worldSource));
const treeMap={bounds:{minX:0,maxX:200,minZ:0,maxZ:200},roads:[],buildings:[],areas:[{type:'park',points:[[0,0],[200,0],[200,200],[0,200]]}],landmarks:[]};
const trees=createWorldView(scene,treeMap), baseline=trees.stats.trees;assert.ok(baseline>0);trees.dispose();
const cleared=createWorldView(scene,{...treeMap,landmarkTreeExclusions:[[[-10,-10],[210,-10],[210,210],[-10,210]]]});assert.equal(cleared.stats.trees,0);cleared.dispose();
const outside=createWorldView(scene,{...treeMap,landmarkTreeExclusions:[[[300,300],[400,300],[400,400],[300,400]]]});assert.equal(outside.stats.trees,baseline);outside.dispose();
console.log(`PASS landmarks:4 sites,${view.stats.triangles} triangles, exact12 replacement IDs, projection, grounding,81m mast, LOD, fog, finite buffers and idempotent disposal`);
