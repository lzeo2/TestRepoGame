import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const storesURL=url(await read('../Games/Capital Drive/stores.js'));
const {MAPPED_STORES}=await import(storesURL);
const source=await read('../Games/Capital Drive/storefronts-view.js');
const {createStorefrontsView}=await import(url(source
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'./stores.js'",JSON.stringify(storesURL))));
const scene=new THREE.Scene(),heightAt=(x,z)=>25+x*.002+z*.001;
const before=structuredClone(MAPPED_STORES),view=createStorefrontsView(scene,heightAt),root=scene.children[0];
assert.equal(root.children.length,2,'one merged solid batch and one text batch');
assert.equal(view.stats.sites,MAPPED_STORES.length);
assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.cullDistance,180);
assert(view.stats.triangles<=MAPPED_STORES.length*190,'bounded shallow facade geometry');
assert(!source.includes('requestAnimationFrame'),'controller owns clock');
const [solidMesh,textMesh]=root.children;
const verticesPerStore=solidMesh.geometry.attributes.position.count/MAPPED_STORES.length;
assert.equal(verticesPerStore,360,'fifteen small boxes per store');
for(let i=0;i<MAPPED_STORES.length;i++) {
  const store=MAPPED_STORES[i],f=store.frontage;
  view.update(store);assert(view.stats.visible>=1);assert.equal(view.stats.drawCalls,2);
  const normal=textMesh.geometry.attributes.normal;
  const nx=normal.getX(i*8),nz=normal.getZ(i*8);
  assert(Math.abs(nx+Math.sin(f.yaw))<1e-6 && Math.abs(nz+Math.cos(f.yaw))<1e-6,'sign front matches yaw forward');
  assert(nx*(store.x-f.x)+nz*(store.z-f.z)>0,'parody name faces mapped street approach');
  const positions=solidMesh.geometry.attributes.position,ground=heightAt(f.x,f.z),angle=f.yaw+Math.PI;
  let minY=Infinity,maxY=-Infinity;
  for(let v=i*verticesPerStore;v<(i+1)*verticesPerStore;v++) {
    const dx=positions.getX(v)-f.x,dz=positions.getZ(v)-f.z;
    const localX=Math.cos(angle)*dx-Math.sin(angle)*dz;
    const out=Math.sin(angle)*dx+Math.cos(angle)*dz;
    assert(Math.abs(localX)<=Math.min(5.1,f.width/2),'facades and awnings stay within allocated neighbouring units');
    assert(out>=.019 && out<=.921,'all details lie just outside source-facing facade');
    minY=Math.min(minY,positions.getY(v));maxY=Math.max(maxY,positions.getY(v));
  }
  assert(Math.abs(minY-ground)<.0002,'facade rests on supplied terrain');
  assert(maxY-ground<3.2,'small ground-floor overlay preserves source building');
  const uv=textMesh.geometry.attributes.uv;
  for(let v=i*8;v<i*8+8;v++) assert(uv.getX(v)>=0&&uv.getX(v)<=1&&uv.getY(v)>=0&&uv.getY(v)<=1);
}
const texture=textMesh.material.map;
assert(texture.isDataTexture,'local generated original lettering');
for(let row=0;row<MAPPED_STORES.length*2;row++) {
  let ink=0;
  for(let y=0;y<32;y++) for(let x=0;x<1024;x++) {
    const py=texture.image.height-1-(row*32+y);
    if(texture.image.data[(py*1024+x)*4+3]) ink++;
  }
  assert(ink>200,'each parody name and till cue has actual glyph pixels');
}
view.update(MAPPED_STORES[0]);
const solidVersion=solidMesh.geometry.attributes.position.version,textVersion=textMesh.geometry.attributes.position.version;
view.update(MAPPED_STORES[0]);
assert.equal(solidMesh.geometry.attributes.position.version,solidVersion,'stationary focus avoids solid buffer upload');
assert.equal(textMesh.geometry.attributes.position.version,textVersion,'stationary focus avoids text buffer upload');
view.update({x:10000,z:10000});assert.equal(view.stats.visible,0);assert.equal(view.stats.drawCalls,0);
for(const mesh of root.children) assert(mesh.geometry.attributes.position.array.every(v=>v===0),'individual distant slices collapsed');
for(let i=0;i<MAPPED_STORES.length;i++) {
  view.update(MAPPED_STORES[i]);
  for(let j=0;j<MAPPED_STORES.length;j++) {
    const f=MAPPED_STORES[j].frontage,dx=f.x-MAPPED_STORES[i].x,dz=f.z-MAPPED_STORES[i].z;
    const shown=dx*dx+dz*dz<180*180;
    const array=textMesh.geometry.attributes.position.array.subarray(j*24,(j+1)*24);
    assert.equal(array.some(v=>v!==0),shown,'per-store range visibility within merged batch');
  }
}
view.update({x:NaN,z:Infinity});assert.equal(view.stats.drawCalls,0);
assert.deepEqual(MAPPED_STORES,before,'registry and footprint geometry remain unchanged');
let geometries=0,materials=0,textures=0;
for(const mesh of root.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}
texture.addEventListener('dispose',()=>textures++);
view.dispose();view.dispose();view.update(MAPPED_STORES[0]);
assert.equal(scene.children.length,0);assert.equal(geometries,2);assert.equal(materials,2);assert.equal(textures,1);
assert.equal(view.stats.disposed,true);assert.equal(view.stats.visible,0);
console.log(`Capital storefronts PASS: ${MAPPED_STORES.length} registry-matched facades, ${view.stats.triangles} triangles, two batches, oriented atlas, 180m culling and idempotent disposal`);

const managed=createStorefrontsView(scene,heightAt,{excludeIds:['store-5656111023']});
assert.equal(managed.stats.sites,MAPPED_STORES.length-1);managed.update(MAPPED_STORES.find(s=>s.id==='store-5656111023'));assert.equal(managed.stats.visible,0,'dedicated northern restaurant has no duplicate generic frontage');managed.dispose();
