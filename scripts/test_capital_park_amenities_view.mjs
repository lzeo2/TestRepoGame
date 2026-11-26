import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { PARK_AMENITIES } from '../Games/Capital Drive/park-amenities.js';
import { PARK_AMENITY_BODIES, parkAmenityVariant } from '../Games/Capital Drive/park-amenity-models.js';
import { createParkAmenitiesView, PARK_AMENITY_LIMITS as limits } from '../Games/Capital Drive/park-amenities-view.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const scene = new THREE.Scene();
const ground = (x,z) => 24 + x*.015 + z*.008;
const bbq = {id:'bbq', kind:'bbq', x:32, z:32, plates:2, yaw:Math.PI/2};
const fountain = {id:'fountain', kind:'fountain', x:63, z:31, dogBowl:true, refill:true};
const remote = {id:'remote', kind:'fountain', x:2800, z:1200};
const bad = [
  {id:'no-ground', kind:'bbq', x:-100, z:-100},
  {...bbq, x:200}, {id:'invalid', kind:'fountain', x:NaN, z:5},
  {id:'unrelated', kind:'bench', x:0, z:0},
];
let sampled = 0;
const view = createParkAmenitiesView(scene, {
  entries:[bbq,fountain,remote,...bad], heightAt(x,z){ sampled++; return x===-100 ? NaN : ground(x,z); },
  masonryMap:null, masonryNormalMap:null,
});
const root=scene.children[0];
assert.equal(view.stats.indexed,3);
assert.equal(root.children.length,0,'distant models have no mesh allocation at boot');
assert.equal(sampled,4,'only valid unique sources sample terrain');
assert.equal(view.obstacles.length,3);
assert.equal(new Set(view.obstacles.map(body=>body.id)).size,3);
const core=view.obstacles[0], dims=PARK_AMENITY_BODIES[parkAmenityVariant(bbq)];
const xs=core.points.map(point=>point[0]), zs=core.points.map(point=>point[1]);
assert.equal(core.y,ground(bbq.x,bbq.z));
assert.equal(core.height,dims.height);
assert(Math.abs(Math.max(...xs)-Math.min(...xs)-dims.depth)<1e-8);
assert(Math.abs(Math.max(...zs)-Math.min(...zs)-dims.width)<1e-8);

view.update({x:-900,z:-400});
assert.equal(root.children.length,0);
view.update(bbq);
assert.equal(view.stats.nearestId,bbq.id);
assert.deepEqual(view.visibleEntries(),[bbq,fountain]);
assert.equal(view.stats.bbqs,1);assert.equal(view.stats.fountains,1);
assert(view.stats.drawCalls>=2 && view.stats.triangles>0);
const meshes=root.children.filter(mesh=>mesh.visible);
assert.equal(view.stats.drawCalls,meshes.length);
const matrix=new THREE.Matrix4();
for(const mesh of meshes){
  assert(mesh.isInstancedMesh);assert.equal(mesh.count,1);
  mesh.getMatrixAt(0,matrix);
  const entry=mesh.name==='Park amenity '+parkAmenityVariant(bbq)?bbq:fountain;
  const expected=new THREE.Matrix4().makeRotationY(entry.yaw||0).setPosition(entry.x,ground(entry.x,entry.z),entry.z);
  matrix.elements.forEach((v,i)=>assert(Math.abs(v-expected.elements[i])<1e-5));
}
const writes=view.stats.matrixWrites, queries=view.stats.queries;
for(let i=0;i<600;i++)view.update(bbq);
assert.equal(view.stats.queries,queries);
view.update({x:19,z:32}); // Reconsider a new streaming tile, retaining the same two sites.
assert.equal(view.stats.queries,queries+1);
assert.equal(view.stats.matrixWrites,writes,'unchanged membership leaves GPU buffers untouched');
assert.equal(sampled,4);

const map={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[{id:'main',points:[[-400,0],[400,0]],nodes:[1,2],width:12,speed:40}],buildings:[],spawn:{x:-100,z:0,yaw:0},landmarks:[]};
const sim=createSimulation(map,{trafficCount:0});
sim.registerStaticBarriers(view.obstacles);
const actor={x:bbq.x-2,z:bbq.z};
assert(sim.moveActor(actor,4,0,.25).blocked);
assert(actor.x<bbq.x-dims.depth/2);
const walkingAround={x:bbq.x-2,z:bbq.z+dims.width/2+.6};
assert.equal(sim.moveActor(walkingAround,4,0,.25).blocked,false,'a person can walk around the fixture');
view.update(remote);
assert.equal(view.stats.nearestId,remote.id);
assert.deepEqual(view.visibleEntries(),[remote]);
view.update(null);
assert.equal(view.stats.visible,0);assert.equal(view.stats.drawCalls,0);assert.equal(view.stats.nearestId,null);
assert(root.children.every(mesh=>mesh.count===0&&!mesh.visible));
view.update(bbq);
assert.deepEqual(view.visibleEntries(),[bbq,fountain]);
const disposals = new Map();
for (const resource of new Set(root.children.flatMap(mesh=>[mesh,mesh.geometry,mesh.material]))) {
  disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));
}
view.dispose();view.dispose();view.update(bbq);
assert.equal(scene.children.length,0);
assert.equal(view.stats.visible,0);
assert([...disposals.values()].every(count=>count===1),'every owned GPU resource disposed once');
assert.equal(view.stats.disposed,true);

const dense=Array.from({length:80},(_,i)=>({id:'s'+i,kind:'bbq',x:i+6,z:6}));
const denseView=createParkAmenitiesView(scene,{entries:dense,heightAt:()=>0,masonryMap:null,masonryNormalMap:null});
denseView.update({x:6,z:6});
assert.deepEqual(denseView.visibleEntries().map(s=>s.id),dense.slice(0,limits.capacity).map(s=>s.id));
denseView.update({x:6,z:6},{lowGraphics:true});
assert.equal(denseView.stats.visible,limits.lowCapacity);
assert.equal(denseView.visibleEntries().at(-1).id,dense[limits.lowCapacity-1].id);
denseView.dispose();

const realView=createParkAmenitiesView(scene,{entries:PARK_AMENITIES,heightAt:()=>0,masonryMap:null,masonryNormalMap:null});
assert.equal(realView.stats.indexed,PARK_AMENITIES.length);
let maxVisible=0,maxDraws=0,maxTriangles=0,maxCandidates=0;
for(const site of PARK_AMENITIES) {
  realView.update(site);
  assert(realView.visibleEntries().includes(site),'every retained source renders at its stand position: '+site.id);
  maxVisible=Math.max(maxVisible,realView.stats.visible);maxDraws=Math.max(maxDraws,realView.stats.drawCalls);
  maxTriangles=Math.max(maxTriangles,realView.stats.triangles);maxCandidates=Math.max(maxCandidates,realView.stats.lastCandidates);
}
assert(maxCandidates<PARK_AMENITIES.length);
realView.dispose();
console.log(JSON.stringify({pass:true,sourceSites:PARK_AMENITIES.length,maxVisible,maxDraws,maxTriangles,maxCandidates,
  stationaryFrames:600,stationaryQueries:0,stationaryUploads:0}));
