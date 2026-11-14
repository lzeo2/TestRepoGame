import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8'),url=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const storesURL=url(await read('../Games/Capital Drive/stores.js')),{MAPPED_STORES}=await import(storesURL);
const source=await read('../Games/Capital Drive/noodle-shop-view.js');
const {createNoodleShopView,NOODLE_SHOP_ID}=await import(url(source
 .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
 .replace("'./stores.js'",JSON.stringify(storesURL))));
const store=MAPPED_STORES.find(s=>s.id===NOODLE_SHOP_ID);assert(store,'actual mapped source node5656111023 required');
assert.equal(store.source.id,5656111023);assert.equal(store.buildingId,'osm-584970594');
const north=JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json'));
const building=north.buildings.find(b=>b.id===store.buildingId);assert(building);
const contains=(x,z,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const distance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
const original=JSON.stringify(MAPPED_STORES),scene=new THREE.Scene(),heightAt=(x,z)=>25+x*.001+z*.0005;
const view=createNoodleShopView(scene,heightAt),root=scene.children[0],f=store.frontage,angle=f.yaw+Math.PI;
const tx=Math.cos(angle),tz=-Math.sin(angle),nx=Math.sin(angle),nz=Math.cos(angle),ground=heightAt(f.x,f.z);
assert.equal(root.children.length,3);assert.equal(view.stats.sites,1);assert.equal(view.stats.storeId,store.id);
assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.cullDistance,200);assert(view.stats.triangles<=5000);
assert(view.stats.atlasWidth<=512&&view.stats.atlasHeight<=512);assert.equal(view.stats.entranceClearWidth,1.8);
assert(!source.includes('requestAnimationFrame')&&!source.includes('PointLight'),'static colour lighting and root clock');
for(const mesh of root.children) {
 const p=mesh.geometry.attributes.position;
 assert(p.array.every(Number.isFinite));assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));
 for(let i=0;i<p.count;i++) {
  const dx=p.getX(i)-f.x,dz=p.getZ(i)-f.z,x=dx*tx+dz*tz,out=dx*nx+dz*nz;
  assert(Math.abs(x)<=f.width/2+.001,'all geometry stays inside allocated nonoverlapping unit');
  assert(out>=.018&&out<1.90,'small exterior overlay stays wholly outside source wall');
  if(p.getY(i)>ground+2.80)assert(out<.35,'inspected Canberra header stays flush rather than becoming a projecting awning');
  assert(!contains(p.getX(i),p.getZ(i),building.points),'actual source Civic footprint never buries the facade');
  assert(p.getY(i)>=ground-.051&&p.getY(i)<ground+3.65,'bounded facade and pavement height');
 }
}
const textMesh=root.children[2],positions=textMesh.geometry.attributes.position,uv=textMesh.geometry.attributes.uv,normals=textMesh.geometry.attributes.normal;
assert(normals.getX(0)*nx+normals.getZ(0)*nz>.999,'literal lettering faces exterior approach');
// Observed from the exterior with upright camera: the screen-right direction is t.
// Test the actual mesh UV direction rather than merely the atlas pixel data.
let minU=Infinity,maxU=-Infinity,left=null,right=null;
for(let i=0;i<4;i++) {
 const u=uv.getX(i),q=[positions.getX(i),positions.getZ(i)];
 if(u<minU){minU=u;left=q;}if(u>maxU){maxU=u;right=q;}
}
assert((right[0]-left[0])*tx+(right[1]-left[1])*tz>0,'LAMBZHOU 1919 reads left-to-right from outside');
assert(nx*(store.x-f.x)+nz*(store.z-f.z)>2,'door normal faces mapped public interaction approach');
for(let i=0;i<uv.count;i++)assert(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1,'bounded cropped atlas UV');
const atlas=textMesh.material.map;assert(atlas.isDataTexture);
for(let row=0;row<5;row++) {
 let ink=0;for(let y=0;y<32;y++)for(let x=0;x<512;x++)if(atlas.image.data[((255-row*32-y)*512+x)*4+3])ink++;
 assert(ink>100,'main fascia, menus and till have real original glyph ink');
}
assert.equal(view.obstacles.length,4);assert(Object.isFrozen(view.obstacles));
for(const obstacle of view.obstacles) {
 assert(Object.isFrozen(obstacle.points));
 for(const p of obstacle.points) {
  const dx=p[0]-f.x,dz=p[1]-f.z,x=dx*tx+dz*tz,out=dx*nx+dz*nz;
  assert(Math.abs(x)>.9,'tables/chairs leave central 1.8m door corridor clear');assert(out<1.90);
  assert(!north.roads.some(r=>r.points.slice(1).some((b,i)=>distance(...p,r.points[i],b)<r.width/2+.15)),'cafe furniture remains outside source driving lanes');
 }
}
view.update(store);assert.equal(view.stats.drawCalls,3);assert.equal(root.visible,true);
const versions=root.children.map(m=>m.geometry.attributes.position.version);view.update(store);
assert.deepEqual(root.children.map(m=>m.geometry.attributes.position.version),versions,'stationary focus never uploads geometry');
view.update({x:f.x+201,z:f.z});assert.equal(view.stats.drawCalls,0);assert.equal(root.visible,false);
view.update({x:NaN,z:Infinity});assert.equal(view.stats.drawCalls,0);
assert.equal(JSON.stringify(MAPPED_STORES),original,'source store registry unchanged');
let geometries=0,materials=0,textures=0;for(const mesh of root.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}atlas.addEventListener('dispose',()=>textures++);
view.dispose();view.dispose();view.update(store);assert.equal(scene.children.length,0);assert.equal(geometries,3);assert.equal(materials,3);assert.equal(textures,1);assert.equal(view.stats.disposed,true);
console.log(`Capital noodle shop PASS: source5656111023 facade, exterior-readable signs, 1.8m clear door, ${view.stats.triangles} triangles / three draws, ${view.stats.atlasWidth}x${view.stats.atlasHeight} original atlas, 200m culling and owned disposal`);
