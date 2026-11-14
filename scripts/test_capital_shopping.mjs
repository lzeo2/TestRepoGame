import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE=await import(threeURL);
const precinctURL=url(await read('../Games/Capital Drive/shopping-precincts.js'));
const storeURL=url(await read('../Games/Capital Drive/stores.js'));
const {SHOPPING_PRECINCTS,SHOPPING_BUILDING_IDS}=await import(precinctURL);
const source=await read('../Games/Capital Drive/shopping-view.js');
const {createShoppingView,SHOPPING_CLEARINGS}=await import(url(source
 .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'./shopping-precincts.js'",JSON.stringify(precinctURL))
 .replace("'./stores.js'",JSON.stringify(storeURL))));
const map=JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const original=JSON.stringify(map),scene=new THREE.Scene(),heightAt=(x,z)=>35+x*.001+z*.002;
const view=createShoppingView(scene,map,heightAt),root=scene.children[0];
assert.equal(view.stats.precincts,5,'distinct source complexes retained');
assert.equal(view.stats.buildings,1,'only the explicitly replaced ACT centre');
assert.deepEqual(SHOPPING_BUILDING_IDS,['act-87705-0']);
assert.equal(view.stats.drawCalls,0);assert.equal(root.children.length,2);
assert(view.stats.triangles<=12000,'merged geometry budget');
assert(view.stats.paths>0&&view.stats.pathSections>0&&view.stats.apronSections>0,'clear source pedestrian ribbons and exterior apron');
assert(view.stats.furniture<=3,'restrained approach furniture');
assert(Object.isFrozen(SHOPPING_CLEARINGS)&&SHOPPING_CLEARINGS.every(p=>Object.isFrozen(p)&&p.every(Object.isFrozen)),'immutable prop exclusions');
assert(!source.includes('requestAnimationFrame'),'root owns clock');
const centre=SHOPPING_PRECINCTS.flatMap(p=>p.buildings).find(b=>b.id==='act-87705-0');
const base=Math.max(...centre.points.map(p=>heightAt(...p)))+.12,top=base+centre.height;
const solid=root.children[0].geometry.attributes.position,glazing=root.children[1].geometry.attributes.position;
let highest=-Infinity;
for(let i=0;i<solid.count;i++)highest=Math.max(highest,solid.getY(i));
assert(Math.abs(highest-top)<1e-4,'source height is preserved');
for(const [x,z] of centre.points) {
 let match=false;
 for(let i=0;i<solid.count;i++)if(Math.abs(solid.getX(i)-x)<.0001&&Math.abs(solid.getZ(i)-z)<.0001&&Math.abs(solid.getY(i)-top)<.0001){match=true;break;}
 assert(match,'every exact source outline vertex survives at the roof');
}
for(let i=0;i<glazing.count;i++)assert(glazing.getY(i)>=base+.54&&glazing.getY(i)<=base+7.66,'two visible glazing levels below parapet');
for(const mesh of root.children) {
 assert(mesh.geometry.attributes.position.array.every(Number.isFinite));
 assert(mesh.geometry.attributes.normal.array.every(Number.isFinite));
}
// On a flat fixture, all accepted paving triangles can be identified by their height.
const fixtureScene=new THREE.Scene(),fixture=createShoppingView(fixtureScene,map,()=>0);
const p=fixtureScene.children[0].children[0].geometry.attributes.position;
const contains=(x,z,points)=>{
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
};
const localBuildings=map.buildings.filter(b=>b.points.some(v=>v[0]>-550&&v[0]<-180&&v[1]>150&&v[1]<450));
let pavedTriangles=0;
for(let i=0;i<p.count;i+=3)if([i,i+1,i+2].every(v=>Math.abs(p.getY(v)-.14)<1e-5)) {
 const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
 assert(!localBuildings.some(b=>contains(x,z,b.points)),'no paving drawn through opaque source bodies');pavedTriangles++;
}
assert(pavedTriangles>100);fixture.dispose();
view.update({x:-290,z:310});assert.equal(view.stats.drawCalls,2);assert.equal(root.visible,true);
const version=solid.version;view.update({x:-290,z:310});assert.equal(solid.version,version,'cached geometry never rewritten for culling');
view.update({x:10000,z:10000});assert.equal(view.stats.drawCalls,0);assert.equal(root.visible,false);
view.update({x:NaN,z:Infinity});assert.equal(root.visible,false);
assert.equal(JSON.stringify(map),original,'source map is unchanged');
let geometries=0,materials=0;
for(const mesh of root.children){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}
view.dispose();view.dispose();view.update({x:-290,z:310});
assert.equal(geometries,2);assert.equal(materials,2);assert.equal(scene.children.length,0);assert.equal(view.stats.disposed,true);
console.log(`Capital shopping PASS: five distinct precincts, one exact-footprint centre, ${view.stats.triangles} triangles / two draws, ${view.stats.pathSections} clear path sections, ${view.stats.apronSections} apron sections, immutable clearings and owned disposal`);
