import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const roadURL=url(await read('../Games/Capital Drive/road-network.js'));
const source=await read('../Games/Capital Drive/civic-view.js');
const {createCivicView,CIVIC_BUILDING_IDS,CIVIC_LANDMARKS}=await import(url(source
 .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'./road-network.js'",JSON.stringify(roadURL))));
const north=JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json'));
const original=JSON.stringify(north),heightAt=(x,z)=>20+x*.0001+z*.0002;
const scene=new THREE.Scene(),view=createCivicView(scene,north,heightAt),root=scene.children[0];
assert.equal(view.stats.buildings,3);assert.equal(view.stats.signs,4);assert.equal(root.children.length,4);
assert.equal(view.stats.bridgeSourceWays,5);assert(view.stats.bridgeParapets>40);
assert(view.stats.centreTriangles<=16000);assert(view.stats.bridgeTriangles<2000);
assert(view.stats.drawCalls===0);assert(Object.isFrozen(CIVIC_BUILDING_IDS));
assert(Object.isFrozen(CIVIC_LANDMARKS)&&Object.isFrozen(CIVIC_LANDMARKS[0]));
assert(!source.includes('requestAnimationFrame'),'controller owns sole clock');
const contains=(x,z,points)=>{
 let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
};
const distance=(x,z,a,b)=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
};
const anchor=CIVIC_LANDMARKS[0];
assert(!north.buildings.some(b=>contains(anchor.x,anchor.z,b.points)),'destination is an exterior approach, never source centroid inside body');
assert(!north.roads.some(r=>r.points.slice(1).some((b,i)=>distance(anchor.x,anchor.z,r.points[i],b)<r.width/2+2)),'public approach leaves driving lanes clear');
for(const building of north.buildings.filter(b=>CIVIC_BUILDING_IDS.includes(b.id))) {
 const fixtureScene=new THREE.Scene(),fixture=createCivicView(fixtureScene,{buildings:[building],roads:[]},()=>0);
 const positions=fixtureScene.children[0].children[0].geometry.attributes.position,top=.12+building.height;
 for(const [x,z] of building.points) {
  let found=false;for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i)-x)<.0001&&Math.abs(positions.getZ(i)-z)<.001&&Math.abs(positions.getY(i)-top)<.0001){found=true;break;}
  assert(found,`${building.id}: exact outline and source-derived height`);
 }
 if(building.id==='osm-584970595')for(let i=0;i<positions.count;i++)assert(positions.getY(i)>=3.3199,'level-one connector is elevated, preserving ground passage');
 fixture.dispose();
}
const bridgeRoads=north.roads.filter(r=>view.barriers.some(b=>b.sourceId===r.sourceId));
for(const barrier of view.barriers) {
 assert(Object.isFrozen(barrier)&&Object.isFrozen(barrier.points));
 for(const p of barrier.points)assert(!bridgeRoads.some(r=>r.points.slice(1).some((b,i)=>distance(...p,r.points[i],b)<r.width/2+.29)),'parapet polygons never intersect drivable bridge lanes');
}
const bridgeMesh=root.children.find(m=>m.name==='Source lake bridge parapets'),bridgePositions=bridgeMesh.geometry.attributes.position;
assert(bridgePositions.array.every(Number.isFinite));
view.update(anchor);assert.equal(view.stats.visible,true);assert.equal(view.stats.near,true);assert(view.stats.drawCalls<=4);
const versions=root.children.map(m=>m.geometry.attributes.position.version);view.update(anchor);
assert.deepEqual(root.children.map(m=>m.geometry.attributes.position.version),versions,'culling never uploads static geometry');
view.update({x:anchor.x,z:anchor.z-800});assert.equal(view.stats.visible,true);assert.equal(view.stats.near,false);
for(const mesh of root.children.filter(m=>/glazing|signs/.test(m.name)))assert.equal(mesh.visible,false,'remote centre omits windows/signs');
view.update({x:350,z:-1800});assert.equal(view.stats.bridgeVisible,true,'bridge context remains visible from lake route');
view.update({x:20000,z:20000});assert.equal(view.stats.drawCalls,0);
view.update({x:NaN,z:Infinity});assert.equal(view.stats.drawCalls,0);
assert.equal(JSON.stringify(north),original,'overlay source immutable');
let geometries=0,materials=0,textures=0;
for(const mesh of root.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);if(mesh.material.map)mesh.material.map.addEventListener('dispose',()=>textures++);}
view.dispose();view.dispose();view.update(anchor);
assert.equal(scene.children.length,0);assert.equal(geometries,4);assert.equal(materials,4);assert.equal(textures,1);assert.equal(view.stats.disposed,true);
const emptyScene=new THREE.Scene(),empty=createCivicView(emptyScene,{buildings:[],roads:[]},()=>0);empty.update(anchor);assert.equal(empty.stats.drawCalls,0);empty.dispose();
console.log(`Capital Civic PASS: three exact source footprints, exterior Bunda approach, elevated connector, four original signs; centre ${view.stats.centreTriangles} triangles, lake bridge parapets ${view.stats.bridgeTriangles} triangles, <=4 draws, static LOD and owned disposal`);
