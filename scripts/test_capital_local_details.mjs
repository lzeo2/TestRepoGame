import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSimulation,projectSegment} from '../Games/Capital Drive/simulation.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8'),url=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace('./three.module.js',threeURL));
const landmarksURL=url(await read('../Games/Capital Drive/landmarks.js'));
const {LANDMARKS,POOL_GATE_APPROACHES,POOL_BARRIERS}=await import(landmarksURL);
const {createLocalDetailsView}=await import(url((await read('../Games/Capital Drive/local-details-view.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL).replace('../../assets/car-arcade/vendor/BufferGeometryUtils.js',utilsURL).replace('./landmarks.js',landmarksURL)));
const map=JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));map.barriers=POOL_BARRIERS;map.collisionReplacedBuildingIds=['act-75267-0'];
const original=JSON.stringify(map),scene=new THREE.Scene(),height=(x,z)=>12+x*.001+z*.001;
const view=createLocalDetailsView(scene,map,height),root=scene.children[0];
assert.equal(view.details.length,3);assert.equal(view.stats.maxDrawCalls,3);assert.equal(view.stats.drawCalls,0);assert(view.stats.triangles<4000);assert.equal(view.stats.textureCount,0);
assert(Object.isFrozen(view.details)&&Object.isFrozen(view.obstacles));
for(const detail of view.details) {
  assert(detail.estimated&&Object.isFrozen(detail)&&Object.isFrozen(detail.anchor));
  const anchor=LANDMARKS.find(l=>l.id===detail.landmarkId);assert.deepEqual(detail.anchor,{x:anchor.x,z:anchor.z});
  assert(Math.hypot(detail.x-anchor.x,detail.z-anchor.z)<130);view.update(detail);assert(view.stats.drawCalls>0&&view.stats.drawCalls<=3);
}
assert.deepEqual(view.details.map(d=>d.label),['1931','BLANDFORDIA','WHISTLE']);
for(const obstacle of view.obstacles)for(const p of obstacle.points) {
  for(const road of map.roads)for(let i=1;i<road.points.length;i++)assert(projectSegment(...p,road.points[i-1],road.points[i]).distance>road.width/2+.45,'history notices avoid source road/path surfaces');
}
const gate=POOL_GATE_APPROACHES[0],sim=createSimulation({...map,barriers:[...map.barriers,...view.obstacles]},{trafficCount:0,parkedCount:0});
const actor={x:gate.outside[0],z:gate.outside[1]};let blocked=false;for(let i=0;i<30;i++){const move=sim.moveActor(actor,(gate.inside[0]-gate.outside[0])/30,(gate.inside[1]-gate.outside[1])/30,.45);blocked ||= move.blocked;}assert.equal(blocked,false,'pool history notice preserves actual source gate');
let geometries=0,materials=0;for(const mesh of root.children){for(const attr of Object.values(mesh.geometry.attributes))assert(attr.array.every(Number.isFinite));assert(mesh.geometry.boundingSphere.radius>0);mesh.geometry.addEventListener('dispose',()=>geometries++);}root.children[0].material.addEventListener('dispose',()=>materials++);
view.update({x:1e8,z:1e8});assert.equal(view.stats.drawCalls,0);view.update({x:NaN,z:0});assert.equal(view.stats.drawCalls,0);
assert.equal(JSON.stringify(map),original);view.dispose();view.dispose();view.update(view.details[0]);assert.equal(scene.children.length,0);assert.equal(geometries,3);assert.equal(materials,1);assert.equal(view.stats.drawCalls,0);
console.log(`PASS local history: three original source-anchor notices, ${view.stats.triangles} triangles, at most three near-only draws, no textures, source road/path and pool-gate clearance, shared-material exact disposal`);
