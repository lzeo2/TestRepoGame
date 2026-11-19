import assert from 'node:assert/strict';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
const building={id:'home',type:'house',height:4,points:[[-6,20],[6,20],[6,34],[-6,34]]};
const map={buildings:[building],interiorEntries:[{id:'home',buildingId:'home',x:0,z:20,nx:0,nz:1}]};
const interiors=createInteriors(map),actor={x:0,z:18.5,y:0,yaw:0};
const plan=interiors.enter(interiors.findEntry(actor),actor);
const searches=plan.activities.filter(s=>s.id.includes('-valuables'));
assert.equal(searches.length,3,'normal footprint has three distinct searches');
assert.equal(new Set(searches.map(s=>s.id)).size,3);
for(const station of searches){
  const pose={x:station.x,z:station.z};
  assert.equal(interiors.moveActor(pose,0,0).blocked,false,'search has standing clearance');
  assert(plan.furniture.some(f=>Math.hypot(f.x-station.x,f.z-station.z)<2.5),'search tied to visible fixture');
}
const rest=plan.activities.find(s=>s.id.endsWith('-rest'));
assert(rest && plan.furniture.some(f=>f.kind==='bed' && Math.hypot(f.x-rest.x,f.z-rest.z)<2.5));
console.log('Capital house fixture searches: three distinct physical stations and a bed rest station passed');
