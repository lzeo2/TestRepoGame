import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const servicesURL=url(await read('../Games/Capital Drive/services.js'));
const {SERVICES}=await import(servicesURL);
const {createServicesView}=await import(url((await read('../Games/Capital Drive/services-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'./services.js'",JSON.stringify(servicesURL))));
const scene=new THREE.Scene(), heightAt=(x,z)=>x*.002+z*.001;
const before=structuredClone(SERVICES),view=createServicesView(scene,heightAt),root=scene.children[0];
assert.equal(root.children.length,2);assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.triangles,112);
for(const service of SERVICES) {
  view.update(service);assert(view.stats.visible>=1);assert.equal(view.stats.drawCalls,2);
  const positions=root.children[0].geometry.attributes.position;
  const i=SERVICES.indexOf(service), vertices=[];
  for(let vertex=i*48;vertex<(i+1)*48;vertex++) vertices.push([positions.getX(vertex),positions.getY(vertex),positions.getZ(vertex)]);
  const minY=Math.min(...vertices.map(v=>v[1])),maxY=Math.max(...vertices.map(v=>v[1]));
  assert(Math.abs(minY-heightAt(service.x,service.z))<.0001,'post rests on supplied terrain');
  assert(maxY-minY<2.5,'small freestanding sign only');
  assert(vertices.every(v=>Math.abs(v[0]-service.x)<1 && Math.abs(v[2]-service.z)<.07),'bounded narrow roadside footprint');
  const lettering=root.children[1].geometry,normal=lettering.attributes.normal;
  assert.equal(normal.getZ(i*8),-1,'negative-Z lettering faces outside board');
  assert.equal(normal.getZ(i*8+4),1,'positive-Z lettering faces outside board');
}
assert.deepEqual(SERVICES,before,'source descriptors unchanged');
const atlas=root.children[1].material.map;
assert(atlas.isDataTexture && atlas.image.width===256 && atlas.image.height===256);
for(let row=0;row<4;row++) {
  let ink=0;
  for(let y=row*64;y<(row+1)*64;y++) for(let x=0;x<256;x++) if(atlas.image.data[(y*256+x)*4+3]) ink++;
  assert(ink>300,'each generated service row includes readable place and type lettering');
}
view.update({x:10000,z:10000});assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.visible,0);
for(const mesh of root.children) assert(mesh.geometry.attributes.position.array.every(v=>v===0),'distant merged slices collapse');
view.update({x:NaN,z:Infinity});assert.equal(view.stats.drawCalls,0);
view.update(SERVICES[0]);for(const mesh of root.children) assert(mesh.geometry.attributes.position.array.every(Number.isFinite));
let geometries=0,materials=0,textures=0;
for(const mesh of root.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}
atlas.addEventListener('dispose',()=>textures++);
view.dispose();view.dispose();view.update(SERVICES[0]);
assert.equal(scene.children.length,0);assert.equal(geometries,2);assert.equal(materials,2);assert.equal(textures,1);assert(view.stats.disposed);assert.equal(view.stats.drawCalls,0);
console.log('PASS four grounded fictional service signs, local text atlas and outward readable faces, two merged draws/112 triangles, 250m culling, finite buffers and exact disposal');
