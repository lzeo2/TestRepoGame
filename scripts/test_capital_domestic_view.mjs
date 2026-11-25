import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createInteriorView} from '../Games/Capital Drive/interior-view.js';
import {createNeighbourhoodDetails} from '../Games/Capital Drive/neighbourhood.js';
import {createInteriorCollider,createInteriorNavigation} from '../Games/Capital Drive/interior-navigation.js';
const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url)));
const exterior=createNeighbourhoodDetails(new THREE.Scene(),map,()=>0,{lowGraphics:true,streaming:true});
map.interiorEntries=exterior.entries;
const rooms=createInteriors(map),entries=rooms.entries.filter(e=>e.type==='house').slice(0,12);
assert.equal(rooms.stats.generatedPlans,0);
const scene=new THREE.Scene(),view=createInteriorView(scene),styles=new Set(),budgets=[];
for(const [index,entry] of entries.entries()) {
  if(index===11)map.storyHomes={basement:{roomId:entry.id,buildingId:entry.buildingId,name:'Safehouse'}};
  const actor={x:entry.x-Math.sin(entry.yaw)*1.4,z:entry.z-Math.cos(entry.yaw)*1.4,y:0,yaw:entry.yaw};
  const plan=rooms.enter(entry,actor);assert(plan);styles.add(plan.homeStyle);
  if(index===11)assert.equal(plan.homeStyle,'safehouse');
  const collider=createInteriorCollider(plan),navigation=createInteriorNavigation(plan);
  for(const goal of [plan.exit,...plan.activities]) {
    assert(collider.canOccupy(goal));assert(navigation.nextWaypoint(plan.spawn,goal));
  }
  view.load(plan);assert.equal(view.stats.meshes,1);assert.equal(view.stats.draws,1);assert(view.stats.triangles<3000);
  const geometry=scene.children[0].children[0].geometry;
  const bytes=Object.values(geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+geometry.index.array.byteLength;
  budgets.push({id:plan.id,triangles:view.stats.triangles,bytes});
  for(const attribute of Object.values(geometry.attributes))assert(attribute.array.every(Number.isFinite));
  const originalColors=geometry.attributes.color.array.slice();
  assert(view.setHomeStatus({comfort:true,pantry:true}));
  assert.notDeepEqual(geometry.attributes.color.array,originalColors);
  const colorVersion=geometry.attributes.color.version;
  view.setHomeStatus({comfort:true,pantry:true});assert.equal(geometry.attributes.color.version,colorVersion);
  view.setHomeStatus(null);assert.deepEqual(geometry.attributes.color.array,originalColors);
  assert.equal(scene.children[0].children[0].geometry,geometry);
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  view.load(plan);assert.equal(scene.children[0].children[0].geometry,geometry);
  rooms.leave(actor);view.clear();assert.equal(disposed,1);assert.equal(view.stats.active,0);
  const again=rooms.enter(entry,actor);assert.deepEqual(again,plan);view.load(again);
  assert.deepEqual(scene.children[0].children[0].geometry.attributes.position.array,geometry.attributes.position.array);
  rooms.leave(actor);view.clear();
}
assert.equal(styles.size,4);view.dispose();exterior.dispose();assert.equal(scene.children.length,0);
console.log(`PASS 12 actual lazy domestic rooms, all four characters, finite deterministic geometry, unchanged reachable stations, one batch/reuse/disposal; triangles ${Math.min(...budgets.map(b=>b.triangles))}-${Math.max(...budgets.map(b=>b.triangles))}, retained geometry bytes ${Math.min(...budgets.map(b=>b.bytes))}-${Math.max(...budgets.map(b=>b.bytes))}`);
