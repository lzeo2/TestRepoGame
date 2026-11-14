import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const dataURL=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const campusURL=dataURL(await read('../Games/Capital Drive/campus.js'));
const {CAMPUS_BOUNDARY:boundary,CAMPUS_BARRIERS:barriers,CAMPUS_GATES:gates,CAMPUS_BUILDING_IDS:ids}=await import(campusURL);
const threeURL=dataURL(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE=await import(threeURL);
const {createCampusView}=await import(dataURL((await read('../Games/Capital Drive/campus-view.js')).replace('../../assets/car-arcade/vendor/three.module.js',threeURL).replace('./campus.js',campusURL)));
const roadURL=dataURL(await read('../Games/Capital Drive/road-network.js'));
const {createSimulation,projectSegment}=await import(dataURL((await read('../Games/Capital Drive/simulation.js')).replace('./road-network.js',roadURL)));
const map=JSON.parse(await read('../Games/Capital Drive/data/canberra.json')),original=JSON.stringify(map);
assert.ok(Object.isFrozen(boundary)&&boundary.every(Object.isFrozen));
assert.equal(boundary.length,214);
assert.deepEqual(boundary[0],boundary.at(-1));
const sourceRing=boundary.map(([x,z])=>[Number((-35.318-z/111320).toFixed(7)),Number((149.137+x/(111320*Math.cos(-35.318*Math.PI/180))).toFixed(7))]);
assert.equal(createHash('sha256').update(JSON.stringify(sourceRing)).digest('hex'),'f83cc00ab37f20af1a598ad46b58219f666fcf728a52b9c63dfba5109e680031','exact OSM way233960420 v6 source ring');
assert.ok(Object.isFrozen(barriers)&&barriers.every(b=>Object.isFrozen(b)&&Object.isFrozen(b.points)&&b.points.every(Object.isFrozen)));
assert.ok(Object.isFrozen(gates)&&gates.every(Object.isFrozen));
assert.ok(Object.isFrozen(ids));
assert.equal(ids.length,6);for(const id of ids)assert.ok(map.buildings.some(b=>b.id===id),'all campus source buildings retained');
assert.equal(gates.length,11);assert.equal(new Set(barriers.map(b=>b.id)).size,barriers.length);
function inside(p,polygon) {
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
for(const barrier of barriers) {
  assert.ok(barrier.width>0&&barrier.width<=4.0001);
  const [a,b]=[boundary[barrier.edge],boundary[barrier.edge+1]];
  for(const p of [barrier.a,barrier.b])assert.ok(projectSegment(...p,a,b).distance<1e-8,'collision remains on exact source edge');
}
// The school amenity ring includes pieces of surrounding public road reserve.
// Check every retained carriageway globally; no campus fence may close a road.
for(const barrier of barriers)for(const point of barrier.points)for(const road of map.roads)for(let i=1;i<road.points.length;i++) {
  assert.ok(projectSegment(...point,road.points[i-1],road.points[i]).distance>=road.width/2+.5,'fence stays clear of mapped public carriageways');
}
const sim=createSimulation({...map,spawn:{x:map.bounds.minX+20,z:map.bounds.minZ+20,yaw:0},barriers},{trafficCount:0,parkedCount:0});
for(const gate of gates) {
  assert.equal(gate.estimated,true);assert.ok(gate.clearWidth>4);
  assert.ok(inside(gate.inside,boundary),'inside approach crosses source boundary');
  assert.ok(!inside(gate.outside,boundary),'outside approach crosses source boundary');
  const actor={id:'campus-qa',x:gate.outside[0],z:gate.outside[1]};
  const result=sim.moveActor(actor,gate.inside[0]-actor.x,gate.inside[1]-actor.z,.45);
  assert.equal(result.blocked,false,`actual map passage at ${gate.id}, source${gate.sourceWay}`);
  assert.ok(Math.hypot(actor.x-gate.inside[0],actor.z-gate.inside[1])<1e-6);
}
// Drive the actual swept pedestrian collider through a long closed span. Small
// source corner spans are covered by the shared segment/geometry checks above.
const closed=barriers.find(b=>b.width>3.5&&gates.every(g=>Math.hypot(g.x-b.x,g.z-b.z)>12));
assert.ok(closed);
const nx=(closed.b[1]-closed.a[1])/closed.width,nz=-(closed.b[0]-closed.a[0])/closed.width;
const actor={id:'campus-qa',x:closed.x+nx*2,z:closed.z+nz*2};
assert.equal(sim.moveActor(actor,-nx*4,-nz*4,.45).blocked,true,'closed span blocks actual swept movement');
assert.ok((actor.x-closed.x)*nx+(actor.z-closed.z)*nz>.4,'actor stays on original side');
const scene=new THREE.Scene(),height=(x,z)=>12+x*.003+z*.001;
const view=createCampusView(scene,map,height),root=scene.children[0];
assert.equal(view.stats.drawCalls,0);view.update(gates[0]);assert.equal(view.stats.drawCalls,2);
assert.ok(view.stats.triangles<16000);assert.ok(view.stats.lineSegments<15000);
let geometryDisposals=0,materialDisposals=0;
for(const mesh of root.children) {
  for(const attribute of Object.values(mesh.geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));
  assert.ok(mesh.geometry.boundingSphere.radius>0);
  mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);mesh.material.addEventListener('dispose',()=>materialDisposals++);
}
const vertices=root.children[0].geometry.attributes.position;
for(const barrier of barriers)for(const point of barrier.points) {
  let found=false;
  for(let i=0;i<vertices.count&&!found;i++)found=Math.hypot(vertices.getX(i)-point[0],vertices.getZ(i)-point[1])<.00005&&Math.abs(vertices.getY(i)-height(...point)-barrier.height)<.001;
  assert.ok(found,'top rail footprint shares exact collision corners');
}
view.update({x:1e8,z:1e8});assert.equal(view.stats.drawCalls,0);
view.update({x:NaN,z:0});assert.equal(view.stats.drawCalls,0);
view.dispose();view.dispose();view.update(gates[0]);assert.equal(scene.children.length,0);
assert.equal(geometryDisposals,2);assert.equal(materialDisposals,2);assert.equal(view.stats.disposed,true);assert.equal(view.stats.drawCalls,0);
assert.equal(JSON.stringify(map),original,'no geographic snapshot mutation');
console.log(`PASS campus: exact214 source vertices,${barriers.length} shared spans,11 passable mapped-path gaps, closed swept collision,${view.stats.triangles} triangles,2draws,finite buffers,culling,owned disposal`);
