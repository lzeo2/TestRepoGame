import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createNorthPlacesView} from '../Games/Capital Drive/north-places-view.js';
const tower={id:'black-mountain-tower',x:500,z:0,sourceId:'way/37693613'},waterpark={x:-6000,z:-7400,yaw:.7,
  points:[[-6020,-7420],[-5980,-7420],[-5980,-7380],[-6020,-7380]],
  pools:[{points:[[-6010,-7410],[-5990,-7410],[-5990,-7390],[-6010,-7390]]}],
  slides:[{points:[[-6000,-7418],[-6003,-7410],[-6000,-7400],[-5996,-7398]]}]};
const original=JSON.stringify({tower,waterpark}),scene=new THREE.Scene();
const view=createNorthPlacesView(scene,{tower,waterpark,heightAt:(x,z)=>20+x*.001-z*.0001});
assert.equal(scene.children.length,2);
const towerRoot=scene.children[0],parkRoot=scene.children[1];
assert.equal(towerRoot.userData.height,195.2);
assert.equal(towerRoot.position.y,20+500*.001);
assert.equal(parkRoot.rotation.y,.7);
towerRoot.updateMatrixWorld(true);
const towerBounds=new THREE.Box3().setFromObject(towerRoot);
assert(Math.abs(towerBounds.max.y-towerRoot.position.y-195.2)<.001,'mast height includes sampled summit');
assert(towerRoot.children.every(o=>o.material.fog===false),'pooled landmark silhouette remains far-visible');
parkRoot.updateMatrixWorld(true);
const pool=parkRoot.getObjectByName('Dry faded concrete pool outlines');
assert(pool,'source pool polygon is triangulated');
const position=pool.geometry.attributes.position;
for(let i=0;i<position.count;i++){
  const p=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(parkRoot.matrixWorld);
  assert(waterpark.pools[0].points.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<.001),'rotated local geometry retains exact global source outline');
  assert(Math.abs(p.y-(20+p.x*.001-p.z*.0001+.045))<.001,'pool surface follows sampled ground');
}
view.update({x:0,z:0});assert.equal(view.stats().visibleSites,1,'waterpark has a local visibility range');
view.update(waterpark);const stats=view.stats();
assert.equal(stats.visibleSites,2);assert.equal(stats.pools,1);assert.equal(stats.slides,1);
assert(stats.draws<=7&&stats.triangles<10000,'pooled geometry has bounded draw and triangle costs');
assert.deepEqual(view.physicalProps,[],'view introduces no tower footprint or inaccessible-source collision override');
view.update({x:30000,z:30000});assert.equal(view.stats().draws,0);
view.update(waterpark);const previous=view.stats();previous.draws=999;
assert.notEqual(view.stats().draws,999,'stats are detached');
let geometryDisposals=0,materialDisposals=0;const geometries=new Set(),materials=new Set();
scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
for(const g of geometries)g.addEventListener('dispose',()=>geometryDisposals++);
for(const m of materials)m.addEventListener('dispose',()=>materialDisposals++);
view.dispose();view.dispose();view.update(waterpark);
assert.equal(scene.children.length,0);assert.equal(view.stats().draws,0);
assert.equal(geometryDisposals,geometries.size);assert.equal(materialDisposals,materials.size);
assert.equal(JSON.stringify({tower,waterpark}),original,'rendering never modifies source specs');
console.log(`PASS north places view: sampled 195.2m tower, rotated source pool/slide outlines, distance LOD, ${stats.draws} draws/${stats.triangles} triangles, read-only stats/specs and idempotent disposal`);

// Frozen source polygons are also exercised without a browser or WebGL renderer.
const {readFile}=await import('node:fs/promises');
const source=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/giant-spray.json',import.meta.url),'utf8'));
const sourceBefore=JSON.stringify(source),liveScene=new THREE.Scene();
const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const actual=createNorthPlacesView(liveScene,{tower:{x:source.site.x+800,z:source.site.z},waterpark:source.site,heightAt:()=>12});
if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
actual.update(source.site);const measured=actual.stats();
assert.equal(measured.pools,4);assert.equal(measured.slides,6);assert(measured.draws<=7);assert(measured.triangles<12000);
const siteRoot=liveScene.children[1],signPoint=siteRoot.userData.signPoint;
const inSource=p=>{let inside=false;const ring=source.site.points;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
assert(inSource(signPoint),'sign center lies inside sourced property boundary');
assert(Math.hypot(signPoint[0]-source.site.approach.x,signPoint[1]-source.site.approach.z)>6,'sign stays off the actual road-node approach');
let textureDisposals=0;liveScene.traverse(o=>{if(o.material?.map)o.material.map.addEventListener('dispose',()=>textureDisposals++);});
actual.dispose();actual.dispose();assert.equal(textureDisposals,1);assert.equal(liveScene.children.length,0);
assert.equal(JSON.stringify(source),sourceBefore);
console.log(`PASS frozen Giant Spray geometry: 4 source pool polygons, 6 source slide routes, property-inset sign; ${measured.draws} draws/${measured.triangles} triangles including tower and sign; texture disposed once`);
