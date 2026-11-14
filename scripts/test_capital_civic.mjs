import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const roadURL=url(await read('../Games/Capital Drive/road-network.js'));
const source=await read('../Games/Capital Drive/civic-view.js');
const {createCivicView,CIVIC_BUILDING_IDS,CIVIC_LANDMARKS,CIVIC_INTERIOR_ENTRIES}=await import(url(source
 .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'./road-network.js'",JSON.stringify(roadURL)).replace("'./civic-extras.js'",JSON.stringify(url(await read('../Games/Capital Drive/civic-extras.js'))))));
const north=JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json'));
const original=JSON.stringify(north),heightAt=(x,z)=>20+x*.0001+z*.0002;
const scene=new THREE.Scene(),view=createCivicView(scene,north,heightAt),root=scene.children[0];
assert.equal(view.stats.buildings,3);assert.equal(view.stats.signs,4);assert.equal(root.children.length,4);
assert.equal(view.stats.bridgeSourceWays,5);assert(view.stats.bridgeParapets>40);
assert(view.stats.centreTriangles<=16000);assert(view.stats.bridgeTriangles<2000);
assert(view.stats.drawCalls===0);assert(Object.isFrozen(CIVIC_BUILDING_IDS));
assert(Object.isFrozen(CIVIC_LANDMARKS)&&Object.isFrozen(CIVIC_LANDMARKS[0]));
assert(!source.includes('requestAnimationFrame'),'controller owns sole clock');
// Texture U must increase toward the outside observer's right, not the ring tangent.
const signGeometry=root.children.find(mesh=>mesh.name.includes('signs')).geometry;
const sp=signGeometry.attributes.position,su=signGeometry.attributes.uv;
const centreX=(sp.getX(0)+sp.getX(1))/2,centreZ=(sp.getZ(0)+sp.getZ(1))/2;
const outsideX=CIVIC_LANDMARKS[0].x-centreX,outsideZ=CIVIC_LANDMARKS[0].z-centreZ;
const rightX=outsideZ,rightZ=-outsideX;
assert(((sp.getX(1)-sp.getX(0))*rightX+(sp.getZ(1)-sp.getZ(0))*rightZ)*(su.getX(1)-su.getX(0))>0,'Centre sign reads left to right from the public approach');

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
assert(Object.isFrozen(CIVIC_INTERIOR_ENTRIES)&&Object.isFrozen(CIVIC_INTERIOR_ENTRIES[0]));
assert.equal(CIVIC_INTERIOR_ENTRIES.length,1);
const door=CIVIC_INTERIOR_ENTRIES[0],mainCentre=north.buildings.find(b=>b.id===door.buildingId);
assert.equal(door.type,'mall');assert.equal(door.buildingId,'osm-46081156');
assert.equal(door.width,24);assert.equal(door.depth,26);
assert(mainCentre.points.some((a,i,points)=>distance(door.x,door.z,a,points[(i+1)%points.length])<.0001),'mall entrance is on the exact retained source facade');
assert(Math.abs(Math.hypot(anchor.x-door.x,anchor.z-door.z)-4)<1e-9,'interior door and public exterior approach share one facade midpoint');
assert(Math.abs(anchor.x-door.x+Math.sin(door.yaw)*4)<1e-9);
assert(Math.abs(anchor.z-door.z+Math.cos(door.yaw)*4)<1e-9,'indoor yaw points away from the exterior approach');
assert(contains(door.x+Math.sin(door.yaw),door.z+Math.cos(door.yaw),mainCentre.points),'door inward normal enters its source body');
assert(!contains(door.x-Math.sin(door.yaw),door.z-Math.cos(door.yaw),mainCentre.points),'outward normal leaves the source body');
for(const x of [-door.width/2,0,door.width/2])for(const z of [.2,door.depth/2,door.depth]) {
 const wx=door.x+Math.cos(door.yaw)*x+Math.sin(door.yaw)*z,wz=door.z-Math.sin(door.yaw)*x+Math.cos(door.yaw)*z;
 assert(contains(wx,wz,mainCentre.points),'bounded original concourse remains in the source building vicinity');
}
assert(!('rooms' in door)&&!('furniture' in door),'public descriptor does not allocate interior rooms');
const entryPanels=root.children.find(m=>m.name==='Civic glazing and entry panels').geometry.attributes.position;
let panelVertices=0;
for(let i=0;i<entryPanels.count;i++) {
 const dx=entryPanels.getX(i)-door.x,dz=entryPanels.getZ(i)-door.z;
 const inward=Math.sin(door.yaw)*dx+Math.cos(door.yaw)*dz,along=Math.cos(door.yaw)*dx-Math.sin(door.yaw)*dz;
 if(Math.abs(inward+.09)<.001&&Math.abs(along)<1.25)panelVertices++;
}
assert(panelVertices>=12,'visible double-door panels coincide with the exported interior entrance');
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
