import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createInteriors,memorialGalleryActions} from '../Games/Capital Drive/interiors.js';
import {createInteriorView} from '../Games/Capital Drive/interior-view.js';
import {createInteriorCollider,createInteriorNavigation} from '../Games/Capital Drive/interior-navigation.js';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';

function walk(plan,to,from=plan.spawn,bodies=[]) {
  const collider=createInteriorCollider(plan),navigation=createInteriorNavigation(plan),actor={...from};
  assert(collider.canOccupy(to));
  for(let i=0;i<300&&Math.hypot(to.x-actor.x,to.z-actor.z)>.025;i++) {
    const next=navigation.nextWaypoint(actor,to);assert(next,'existing path owner reaches the interaction');
    const dx=next.x-actor.x,dz=next.z-actor.z,length=Math.hypot(dx,dz),scale=Math.min(1,.2/(length||1));
    assert(!collider.moveActor(actor,dx*scale,dz*scale).blocked);
    for(const body of bodies)assert(Math.hypot(body.x-actor.x,body.z-actor.z)>=.81,'interaction route stays clear of the live registrar body');
  }
  assert(Math.hypot(to.x-actor.x,to.z-actor.z)<.025,`route ended short of ${to.id||'counter'}: ${JSON.stringify({actor,to})}`);
  return actor;
}
const budgets=[];
for(const yaw of [0,.7,-1.3])for(const [id,variant,stock,counter]of [
  ['store-4069716453','cafe',[-1.04,3.7],[-1.04,5.8]],
  ['store-358293199','grocery',[-1.09,3.6],[1.04,7.8]],
  ['fixture-bookshop','retail',[1.24,3.8],[1.64,6.7]],
]) {
  const c=Math.cos(yaw),s=Math.sin(yaw),point=(x,z)=>({x:40+c*x+s*z,z:20-s*x+c*z});
  const source={id:'source',type:'retail',height:5,points:[[-10,-1],[10,-1],[10,16],[-10,16]]};
  const rooms=createInteriors({buildings:[source]},{heightAt:()=>3,stores:[{id,buildingId:'source',name:'Original shop',frontage:{x:40,z:20,yaw,width:6.2}}]});
  const entry=rooms.entries[0],actor={...point(0,-1.5),y:3,yaw},before={...actor};
  assert.equal(rooms.stats.generatedPlans,0);const plan=rooms.enter(entry,actor);assert(plan&&plan.variant===variant);
  assert.equal(plan.width,5.58);assert.equal(plan.depth,10);assert.equal(plan.origin.x,entry.x);assert.equal(plan.origin.z,entry.z);
  const station=plan.activities.find(a=>a.kind==='stock');
  assert(Math.hypot(station.x-point(...stock).x,station.z-point(...stock).z)<1e-8,'existing stock pose is preserved');
  assert(Math.hypot(plan.counter.x-point(...counter).x,plan.counter.z-point(...counter).z)<1e-8,'existing counter pose is preserved');
  for(const goal of [plan.counter,...plan.activities])walk(plan,goal);
  assert.equal(plan.details.filter(d=>d.kind==='shop-window').length,2);
  assert.equal(plan.details.filter(d=>d.kind==='shop-light').length,3);
  assert(plan.details.find(d=>d.kind==='shop-sign').label);
  const aisle=plan.details.find(d=>d.kind==='shop-aisle');assert(aisle);
  assert(Object.isFrozen(plan.details)&&plan.details.every(Object.isFrozen));
  const scene=new THREE.Scene(),view=createInteriorView(scene);view.load(plan);
  assert.equal(view.stats.draws,1);assert.equal(view.stats.meshes,1);assert(view.stats.triangles<3000);
  for(const mesh of scene.children[0].children)for(const attribute of Object.values(mesh.geometry.attributes))assert(attribute.array.every(Number.isFinite));
  const geometry=scene.children[0].children[0].geometry;let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  const version=geometry.attributes.position.version;view.load(plan);assert.equal(disposed,0);assert.equal(geometry.attributes.position.version,version);
  if(yaw===0)budgets.push(`${variant}:${view.stats.triangles}`);
  assert(rooms.leave(actor));assert.deepEqual({x:actor.x,z:actor.z,y:actor.y,yaw:actor.yaw},before);
  view.clear();assert.equal(disposed,1);assert.equal(view.stats.draws,0);view.dispose();assert.equal(scene.children.length,0);
}
for(const yaw of [0,.6,-1.4]) {
  const inward=yaw+Math.PI,c=Math.cos(inward),s=Math.sin(inward),point=(x,z)=>({x:100+c*x+s*z,z:-30-s*x+c*z});
  const site={id:'memorial-workshop',kind:'memorial',name:'Memorial gallery',yaw,width:11,depth:8.4,floor:4,point};
  const rooms=createInteriors({buildings:[]},{heightAt:()=>4,heistSites:[site]}),entry=rooms.entries[0],actor={...point(0,-2),yaw,y:4};
  const bootActions=memorialGalleryActions({...site.point(0,0),yaw:site.yaw+Math.PI},site.floor+.14);
  assert.equal(rooms.stats.generatedPlans,0,'boot action coordinates do not generate a room');
  const plan=rooms.enter(entry,actor);assert(plan&&plan.heist.kind==='memorial');
  assert.equal(plan.heist.loot.label,'Exhibition case');assert.equal(plan.heist.loot.variant,'exhibit');
  assert.equal(plan.heist.employee.label,'Fictional gallery registrar');assert.equal(plan.activities.length,0);
  assert(plan.rooms.some(r=>r.kind==='memorial-gallery'));assert.equal(plan.furniture.filter(f=>f.kind==='exhibition-case').length,2);
  assert(plan.furniture.some(f=>f.kind==='gallery-ledger-desk'));assert(plan.furniture.some(f=>f.kind==='dispatch-table'));
  assert.deepEqual(plan.heist.anchors,bootActions,'boot and entered-room action points share the authored transform');
  assert.equal(new Set(bootActions.map(a=>a.id)).size,6);
  assert(Object.isFrozen(bootActions)&&bootActions.every(Object.isFrozen));
  assert.deepEqual(bootActions.map(a=>a.role),['scout','pass','evidence','evidence','handoff','handoff']);
  for(const route of [[0,2,4],[1,3,5]]) {
    let previous=plan.spawn;
    for(const index of route)previous=walk(plan,plan.heist.anchors[index],previous,[plan.heist.employee]);
    walk(plan,plan.exit,previous,[plan.heist.employee]);
  }
  for(const goal of [plan.heist.loot,plan.heist.employee,plan.counter])walk(plan,goal);
  const people=createInteriorPeople(),staff=people.load(plan);assert.equal(staff.length,1);
  assert.equal(staff[0].id,plan.heist.employee.id);assert.equal(staff[0].character,'heist-employee');
  assert(rooms.hasLineOfSight(plan.spawn,plan.heist.loot));
  const scene=new THREE.Scene(),view=createInteriorView(scene);view.load(plan);assert.equal(view.stats.draws,1);assert(view.stats.triangles<3000);
  assert(view.setHeistLootActive(true));assert.equal(view.stats.draws,2);assert(view.setHeistLootActive(false));assert.equal(view.stats.draws,1);
  if(yaw===0)budgets.push(`memorial:${view.stats.triangles}`);
  view.dispose();people.clear();rooms.leave(actor);
}
assert.deepEqual(memorialGalleryActions(null),[]);assert.deepEqual(memorialGalleryActions({x:0,z:0,yaw:NaN}),[]);
console.log(`PASS recognizable cafe/grocery/retail windows/signs/furnishing, exact station/door poses, swept interaction paths, one active batch/disposal; original Memorial gallery with shared six boot anchors and both route lanes reachable (${budgets.join(', ')} triangles)`);
