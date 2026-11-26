import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {regionalExteriorParts} from '../Games/Capital Drive/regional-streetscapes.js';
import {createRegionalLandmarksView} from '../Games/Capital Drive/regional-landmarks-view.js';

const designs=['arena','mall','library','hospital','campus','exhibition'];
const rotate=(points,x,z,angle)=>points.map(([u,v])=>[x+Math.cos(angle)*u+Math.sin(angle)*v,z-Math.sin(angle)*u+Math.cos(angle)*v]);
const outline=[[-40,-30],[40,-30],[40,30],[12,30],[12,20],[-12,20],[-12,30],[-40,30],[-40,-30]];
const map={buildings:designs.map((design,i)=>({id:'source-'+i,sourceId:'way/'+(100+i),height:15,
 points:rotate(outline,i*1800,200,.31+i*.10),innerRings:i===3?[{points:rotate([[-5,-5],[5,-5],[5,5],[-5,5]],i*1800,200,.31+i*.10)}]:[]})),
 regionalPlaces:designs.map((design,i)=>({id:'place-'+i,name:['AIS ARENA','WESTFIELD BELCONNEN','PUBLIC LIBRARY','PUBLIC HOSPITAL','UNIVERSITY CAMPUS','EXHIBITION PARK'][i],design,buildingId:'source-'+i,sourceId:'way/'+(100+i),x:i*1800,z:150}))};
const original=structuredClone(map),scene=new THREE.Scene();let heightCalls=0;
const ground=(x,z)=>{heightCalls++;return 200+x*.001+z*.002;};
const labels=Array.from({length:30},(_,i)=>({id:`suburb-${i}`,x:0,z:0}));
const view=createRegionalLandmarksView(scene,{...map,regionalPlaces:[...labels,...map.regionalPlaces]},ground),root=scene.children[0];
assert.equal(root.children.length,2);assert.equal(view.stats.sites,6);assert.equal(view.stats.drawCalls,0);
assert.deepEqual(view.managedBuildingIds,map.buildings.map(b=>b.id));assert(Object.isFrozen(view.managedBuildingIds));
assert.throws(()=>view.managedBuildingIds.push('wrong'),TypeError);
const body=root.getObjectByName('Exact sourced landmark shells'),detail=root.getObjectByName('Original regional landmark facade accents');
assert.equal(body.material.transparent,false);assert.equal(detail.material.transparent,false);assert.equal(view.stats.textureCount,0);
const area=points=>Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-q[0]*p[1];},0))/2;
const inside=(p,points)=>{let found=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const a=points[i],b=points[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])found=!found;}return found;};
const signatures=new Set();
const constructionCalls=heightCalls;
for(let i=0;i<map.regionalPlaces.length;i++){
 const place=map.regionalPlaces[i],source=map.buildings[i];view.update(place);
 assert.equal(view.stats.visible,1);assert.equal(view.stats.detailed,1);assert.equal(view.stats.drawCalls,2);
 assert.equal(view.stats.triangles,view.stats.visibleTriangles,'only visible index ranges reach the GPU');
 const positions=body.geometry.attributes.position,xs=source.points.map(p=>p[0]),zs=source.points.map(p=>p[1]);
 const center=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2],roof=200+center[0]*.001+center[1]*.002+15;
 let roofArea=0,wallVertices=0;
 for(let v=0;v<body.geometry.drawRange.count;v+=3){
  const triangle=[0,1,2].map(j=>body.geometry.index.getX(v+j)).map(j=>[positions.getX(j),positions.getY(j),positions.getZ(j)]);
  for(const p of triangle){
   const known=[...source.points,...source.innerRings.flatMap(h=>h.points)].some(([x,z])=>Math.hypot(x-p[0],z-p[2])<.001);
   assert(known,'shell vertices belong to the exact source footprint or courtyard');
   assert(p[1]<=roof+.0001,'interpretive architecture does not raise the source roof');wallVertices++;
  }
  if(triangle.every(p=>Math.abs(p[1]-roof)<.0001)){
   roofArea+=area(triangle.map(p=>[p[0],p[2]]));
   const centroid=[triangle.reduce((n,p)=>n+p[0]/3,0),triangle.reduce((n,p)=>n+p[2]/3,0)];
   for(const hole of source.innerRings)assert(!inside(centroid,hole.points),'courtyard stays open in the roof');
  }
 }
 assert(wallVertices>0);const expected=area(source.points)-source.innerRings.reduce((n,h)=>n+area(h.points),0);
 assert(Math.abs(roofArea-expected)<.1,'concave source roof and holes retain their exact plan area');
 const hash=createHash('sha256');
 for(const mesh of [body,detail]){
  const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
  for(let i=0;i<mesh.geometry.drawRange.count;i++){const j=mesh.geometry.index.getX(i);hash.update(JSON.stringify([Math.round((p.getX(j)-center[0])*1000),Math.round((p.getY(j)-roof+15)*1000),Math.round((p.getZ(j)-center[1])*1000),c.getX(j),c.getY(j),c.getZ(j)]));}
 }
 signatures.add(hash.digest('hex'));
 const versions=root.children.map(m=>m.geometry.index.version);view.update(place);
 root.children.forEach((m,j)=>assert.equal(m.geometry.index.version,versions[j],'stationary focus does not upload geometry'));
}
const submittedTriangles=view.stats.triangles;
assert.equal(signatures.size,6,'six facade families have distinct original detail/color geometry');assert.equal(heightCalls,constructionCalls,'distance updates never resample terrain');
view.update({x:400,z:200});assert.equal(view.stats.visible,1);assert.equal(view.stats.detailed,0);assert.equal(view.stats.drawCalls,1,'far view keeps only the sourced shell');
view.update({x:100000,z:100000});assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.triangles,0);
for(const mesh of root.children)assert.equal(mesh.geometry.drawRange.count,0);
view.update({x:NaN,z:Infinity});assert.equal(view.stats.visible,0);
const detached=view.stats;detached.visible=99;assert.equal(view.stats.visible,0);
assert.deepEqual(map,original,'view never edits source/collider metadata');
let geometries=0,materials=0;root.children.forEach(m=>{m.geometry.addEventListener('dispose',()=>geometries++);m.material.addEventListener('dispose',()=>materials++);});
view.dispose();view.dispose();view.update(map.regionalPlaces[0]);
assert.equal(scene.children.length,0);assert.equal(geometries,2);assert.equal(materials,2);assert.equal(view.stats.disposed,true);

// The asymmetrical F reads identically looking from the street, regardless of
// which direction the OSM mapper traced the polygon.
function streetLetter(points){
 const scene=new THREE.Scene();
 const v=createRegionalLandmarksView(scene,{buildings:[{id:'sign',height:8,points}],
   regionalPlaces:[{id:'test-sign',buildingId:'sign',design:'mall',name:'F',x:0,z:-15}]},()=>0);
 const mesh=scene.children[0].getObjectByName('Original regional landmark facade accents');
 const {position,color}=mesh.geometry.attributes,ink=new THREE.Color(0xf0e8d4),pixels=new Set();
 for(let i=0;i<position.count;i++)if(Math.abs(color.getX(i)-ink.r)<1e-6&&Math.abs(color.getY(i)-ink.g)<1e-6){
   pixels.add([position.getX(i),position.getY(i),position.getZ(i)].map(n=>n.toFixed(3)).join(','));
 }
 v.dispose();return [...pixels].sort();
}
const signOutline=[[-12,-7],[12,-7],[12,7],[-12,7]];
const letter=streetLetter(signOutline);
assert(letter.length>12);assert.deepEqual(letter,streetLetter([...signOutline].reverse()),'exterior lettering keeps its orientation on both source windings');
const inkPoints=letter.map(line=>line.split(',').map(Number));
const lowestY=Math.min(...inkPoints.map(p=>p[1])), leftmostX=Math.max(...inkPoints.map(p=>p[0]));
assert.equal(Math.max(...inkPoints.filter(p=>p[1]===lowestY).map(p=>p[0])),leftmostX,'the lower stroke of F is on the viewer’s left');

const extraScene=new THREE.Scene(),longOutline=Array.from({length:24},(_,i)=>[Math.sin(i/24*Math.PI*2)*1000,Math.cos(i/24*Math.PI*2)*1000]);
const longView=createRegionalLandmarksView(extraScene,{buildings:[{id:'large',height:40,points:longOutline}],regionalPlaces:[{id:'large',buildingId:'large',design:'hospital',name:'PUBLIC HOSPITAL'}]},()=>100);
longView.update({x:0,z:0});assert(longView.stats.visibleTriangles<=24*3+longView.stats.maxDetailTrianglesPerSite,'long facades have a hard per-site detail budget');
const largeStats=longView.stats;longView.dispose();
const invalid=createRegionalLandmarksView(extraScene,{buildings:[{id:'oversize',height:20,points:Array.from({length:1025},(_,i)=>[Math.sin(i)*100,Math.cos(i)*100])}],regionalPlaces:[{id:'missing',buildingId:'missing',design:'arena'},{id:'oversize',buildingId:'oversize',design:'mall'}]},()=>100);
assert.equal(invalid.stats.sites,0);assert.equal(invalid.stats.rejected,2);assert.deepEqual(invalid.managedBuildingIds,[],'missing/oversize owners retain generic fallback instead of clipped footprints');invalid.dispose();
console.log(`PASS regional landmarks: six source-bound archetypes, concave roofs/courtyard, height/rotation, two opaque batches/${submittedTriangles} submitted triangles/no textures, cached near/far LOD, immutable metadata/managed IDs and exact disposal; stress ${largeStats.visibleTriangles} triangles capped at ${largeStats.maxDetailTrianglesPerSite} facade triangles/site`);

const actual=await loadCapitalMap(),regionalScene=new THREE.Scene();
const actualView=createRegionalLandmarksView(regionalScene,actual,()=>10);
assert.equal(actualView.stats.sites,41);assert.equal(actualView.stats.rejected,0);
assert.equal(actualView.stats.aisMasts,12);assert.equal(actualView.stats.aisStays,36);
assert(actualView.managedBuildingIds.includes('osm-5124277'),'Dickson Library uses its exact source building');
const parts=actual.regionalPlaces.flatMap(p=>regionalExteriorParts(p)||[]);
assert.equal(new Set(parts.map(p=>p.id)).size,9);
assert.equal(parts.length,16);
assert.equal(new Set(actualView.managedBuildingIds).size,41,'every regional source owner is rendered once');
assert.equal(regionalExteriorParts({id:'canberra-stadium',sourceId:'wrong'}),null);
const realPlaces=[...actual.regionalPlaces.filter(p=>p.design&&!regionalExteriorParts(p)),actual.landmarks.find(p=>p.id==='dickson-library'),...parts];
let peak=0;
for(const place of realPlaces){
  const build=actual.buildings.find(b=>b.id===place.buildingId);
  const [x,z]=build.points[0];
  assert(actualView.managedBuildingIds.includes(build.id));
  actualView.update({x,z});const stats=actualView.stats;
  assert(stats.visible>=1&&stats.detailed>=1&&stats.drawCalls<=2,place.id);
  assert.equal(stats.triangles,stats.visibleTriangles);
  peak=Math.max(peak,stats.triangles);
}
const realGeometry=regionalScene.children[0].children;
const vertexBudget=realGeometry.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
assert(peak<vertexBudget/2,'regional clusters submit less than half the city geometry even at peak');
console.log(`PASS mapped landmark exteriors: ${realPlaces.length} source buildings, AIS ${actualView.stats.aisMasts} masts/${actualView.stats.aisStays} stays, ${peak}/${vertexBudget} peak/total triangles, two opaque draws, static vertex buffers`);
actualView.dispose();

const stadium=parts.filter(p=>p.id==='canberra-stadium');
assert.equal(stadium.length,6,'four mapped lower bowls and the two named grandstands');
const stadiumScene=new THREE.Scene();
const stadiumMap={buildings:actual.buildings.filter(b=>stadium.some(p=>b.id===p.buildingId)),
 regionalPlaces:[actual.regionalPlaces.find(p=>p.id==='canberra-stadium')]};
const stadiumView=createRegionalLandmarksView(stadiumScene,stadiumMap,()=>30);
stadiumView.update(stadium[0]);
assert.equal(stadiumView.stats.sites,6);
const stadiumPeak=stadiumView.stats.triangles;
const distanceToSegment=(q,a,b)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dz*t);
};
const sourceContains=(q,ring)=>inside(q,ring)||ring.some((a,i)=>distanceToSegment(q,a,ring[(i+1)%ring.length])<.015);
for(const mesh of stadiumScene.children[0].children){
  const positions=mesh.geometry.attributes.position;
  assert(positions.count>0);
  for(let i=0;i<positions.count;i+=3){
    const [v0,v1,v2]=[i,i+1,i+2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,j));
    assert(v1.sub(v0).cross(v2.sub(v0)).lengthSq()>1e-12,'no collapsed triangles at the tapered ends of a bowl');
    const centroid=[0,0];
    for(let j=0;j<3;j++){centroid[0]+=positions.getX(i+j)/3;centroid[1]+=positions.getZ(i+j)/3;}
    assert(stadiumMap.buildings.some(b=>sourceContains(centroid,b.points)),'every seat and canopy triangle belongs to a stand, leaving the pitch open');
  }
}
assert(stadiumPeak<3600,'the entire stadium has a bounded two-draw budget');
stadiumView.update({x:20000,z:20000});assert.equal(stadiumView.stats.triangles,0);
stadiumView.dispose();
const missingMap={regionalPlaces:[stadiumMap.regionalPlaces[0]],buildings:stadiumMap.buildings.slice(1)};
const missingView=createRegionalLandmarksView(new THREE.Scene(),missingMap,()=>0);
assert.equal(missingView.stats.sites,5);assert.equal(missingView.stats.rejected,1);
assert(!missingView.managedBuildingIds.includes(stadiumMap.buildings[0].id));
missingView.dispose();
console.log(`PASS nine new named exteriors, 16 individually owned source buildings; six GIO rings keep the pitch open, ${stadiumPeak} stadium triangles near, zero distant`);
