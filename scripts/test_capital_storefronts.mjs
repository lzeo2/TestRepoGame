import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const storesURL=url(await read('../Games/Capital Drive/stores.js'));
const {MAPPED_STORES}=await import(storesURL);
const facadeURL=url(await read('../Games/Capital Drive/storefront-materials.js'));
const {frontageProfile}=await import(facadeURL);
const source=await read('../Games/Capital Drive/storefronts-view.js');
const {createStorefrontsView}=await import(url(source
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'./storefront-materials.js'",JSON.stringify(facadeURL))
  .replace("'./stores.js'",JSON.stringify(storesURL))));
const scene=new THREE.Scene(),heightAt=(x,z)=>25+x*.002+z*.001;
const before=structuredClone(MAPPED_STORES),view=createStorefrontsView(scene,heightAt),root=scene.children[0];
assert.equal(root.children.length,2,'one merged solid batch and one text batch');
assert.equal(view.stats.sites,MAPPED_STORES.length);
assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.cullDistance,180);
assert(view.stats.triangles<=MAPPED_STORES.length*340,'bounded shallow facade geometry');
assert(!source.includes('requestAnimationFrame'),'controller owns clock');
const [solidMesh,textMesh]=root.children;
assert.equal(solidMesh.material.transparent,false,'glass remains in the opaque solid batch');
const glassColors=solidMesh.geometry.attributes.color;
for(const tint of [0x526f79,0x94acb2,0x3a505c,0x303e45,0xc4d0c9]){
  const expected=new THREE.Color(tint);let found=false;
  for(let i=0;i<glassColors.count;i++)if(Math.abs(glassColors.getX(i)-expected.r)<1e-6&&Math.abs(glassColors.getY(i)-expected.g)<1e-6&&Math.abs(glassColors.getZ(i)-expected.b)<1e-6){found=true;break;}
  assert(found,'authored pane, sky, interior, frame and reflection colors are present');
}
const tenancies=solidMesh.geometry.userData.tenancies;
assert.deepEqual(tenancies.map(t=>t.id),MAPPED_STORES.map(s=>s.id));
function verticesByColour(store,colour) {
  const {vertexStart,vertexCount}=tenancies.find(t=>t.id===store.id);
  const expected=new THREE.Color(colour),vertices=[];
  const positions=solidMesh.geometry.attributes.position;
  for(let i=vertexStart;i<vertexStart+vertexCount;i++){
    if(Math.abs(glassColors.getX(i)-expected.r)<1e-6&&Math.abs(glassColors.getY(i)-expected.g)<1e-6&&Math.abs(glassColors.getZ(i)-expected.b)<1e-6){
      vertices.push(new THREE.Vector3().fromBufferAttribute(positions,i));
    }
  }
  return vertices;
}
const receipt=MAPPED_STORES.find(s=>s.name==='Receipt Cafe'),receiptGround=heightAt(receipt.frontage.x,receipt.frontage.z);
assert(frontageProfile(receipt).layout.door>1.1,'the restaurant uses paired glass leaves');
for(const tint of [0x38734f,0xe9e6dc,0xaf4b4c]){
  const band=verticesByColour(receipt,tint);
  assert.equal(band.length,8,'each transom colour repeats twice');
  assert(band.every(p=>p.y-receiptGround>2.5),'tricolour glazing is above the doorway');
}
assert.equal(verticesByColour(receipt,0xe1dac6).length,4,'the easel has a visible menu face');
const sushi=MAPPED_STORES.find(s=>s.name==='You Sushi');
assert.equal(verticesByColour(sushi,0xe3ded0).length,24,'the sheltered walkway has a pale hanging blade');
assert.equal(solidMesh.material.map,textMesh.material.map,'the shop displays reuse the lettering atlas');
const displayTypes=new Set(MAPPED_STORES.map(s=>frontageProfile(s).display));
assert(displayTypes.size>=7,'the displays distinguish the shop trades');
const profiles=MAPPED_STORES.map(frontageProfile);
assert(new Set(profiles.map(p=>p.form)).size>=9,'the facade geometry covers multiple observed forms');
assert(new Set(profiles.map(p=>p.layout.depth)).size>=6,'shelters have different projections');
assert(profiles.some(p=>p.layout.bias<0)&&profiles.some(p=>p.layout.bias>0),'entries shift within their mapped bays');
for(let i=0;i<MAPPED_STORES.length;i++) {
  const store=MAPPED_STORES[i],f=store.frontage;
  view.update(store);assert(view.stats.visible>=1);assert.equal(view.stats.drawCalls,2);
  const normal=textMesh.geometry.attributes.normal;
  const nx=normal.getX(i*8),nz=normal.getZ(i*8);
  assert(Math.abs(nx+Math.sin(f.yaw))<1e-6 && Math.abs(nz+Math.cos(f.yaw))<1e-6,'sign front matches yaw forward');
  assert(nx*(store.x-f.x)+nz*(store.z-f.z)>0,'parody name faces mapped street approach');
  const positions=solidMesh.geometry.attributes.position,ground=heightAt(f.x,f.z),angle=f.yaw+Math.PI;
  let minY=Infinity,maxY=-Infinity;
  const {vertexStart,vertexCount}=tenancies[i];
  for(let v=vertexStart;v<vertexStart+vertexCount;v++) {
    const dx=positions.getX(v)-f.x,dz=positions.getZ(v)-f.z;
    const localX=Math.cos(angle)*dx-Math.sin(angle)*dz;
    const out=Math.sin(angle)*dx+Math.cos(angle)*dz;
    assert(Math.abs(localX)<=Math.min(5.1,f.width/2),'facades and awnings stay within allocated neighbouring units');
    assert(out>=.019 && out<=.926,'all details lie just outside source-facing facade');
    minY=Math.min(minY,positions.getY(v));maxY=Math.max(maxY,positions.getY(v));
  }
  assert(Math.abs(minY-ground)<.025,'facade rests on supplied terrain');
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
  assert(ink>200,'each parody name and door plate has actual glyph pixels');
}
view.update(MAPPED_STORES[0]);
const solidVersion=solidMesh.geometry.attributes.position.version,textVersion=textMesh.geometry.attributes.position.version;
const solidIndexVersion=solidMesh.geometry.index.version,uvVersion=solidMesh.geometry.attributes.uv.version;
view.update(MAPPED_STORES[0]);
assert.equal(solidMesh.geometry.index.version,solidIndexVersion,'stationary focus avoids index uploads');
view.update({x:10000,z:10000});assert.equal(view.stats.visible,0);assert.equal(view.stats.drawCalls,0);
for(const mesh of root.children)assert.equal(mesh.geometry.drawRange.count,0,'distant shops submit no triangles');
for(const store of MAPPED_STORES) {
  view.update(store);
  const text=textMesh.geometry;
  const drawn=new Set(Array.from(text.index.array.subarray(0,text.drawRange.count),v=>Math.floor(v/8)));
  const solid=solidMesh.geometry;
  const solidsDrawn=new Set(solid.index.array.subarray(0,solid.drawRange.count));
  for(let j=0;j<MAPPED_STORES.length;j++) {
    const f=MAPPED_STORES[j].frontage,dx=f.x-store.x,dz=f.z-store.z;
    const shown=dx*dx+dz*dz<180*180;
    assert.equal(drawn.has(j),shown,'only nearby signs are submitted');
    assert.equal(solidsDrawn.has(tenancies[j].vertexStart),shown,'only nearby facades are submitted');
  }
  assert.equal(view.stats.drawnTriangles,(solid.drawRange.count+text.drawRange.count)/3);
}
assert.equal(solidMesh.geometry.attributes.position.version,solidVersion,'solid vertex positions remain static across districts');
assert.equal(textMesh.geometry.attributes.position.version,textVersion,'sign vertices remain static across districts');
assert.equal(solidMesh.geometry.attributes.uv.version,uvVersion,'window UVs remain static');
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

const empty=createStorefrontsView(scene,heightAt,{excludeIds:MAPPED_STORES.map(s=>s.id)});empty.update(MAPPED_STORES[0]);assert.equal(empty.stats.drawCalls,0);empty.dispose();
