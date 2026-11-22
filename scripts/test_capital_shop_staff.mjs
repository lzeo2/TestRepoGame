import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createInteriorPeople } from '../Games/Capital Drive/interior-people.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { EXTRA_STORES } from '../Games/Capital Drive/civic-extras.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyNorthWest } from '../Games/Capital Drive/north-west.js';
import { executeCampaignCrime } from './capital-crime-playability.mjs';
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyNorthWest(applyMapExpansion(await json('canberra'), await json('canberra-north')),
  await json('north-west'),await json('north-west-terrain'));
const stores = [...MAPPED_STORES, ...EXTRA_STORES];
const mappedSource=await json('stores');
assert.deepEqual(MAPPED_STORES,mappedSource.stores,'runtime mapped shops retain the complete sourced premises list');
const expectedStoreIds=new Set([...mappedSource.stores,...EXTRA_STORES].map(store=>store.id));
assert.equal(stores.length,expectedStoreIds.size,'every sourced or original shop has one unique service ID');
const interiors = createInteriors(map, { stores }), simulation = createSimulation(map, { trafficCount: 0 });
assert.deepEqual(new Set(interiors.entries.map(entry=>entry.storeId)),expectedStoreIds,
  'every registered shop, including the northern source carriers, creates its own real doorway and staff room');
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const local = (origin, p) => { const x = p.x-origin.x, z = p.z-origin.z, c = Math.cos(origin.yaw), s = Math.sin(origin.yaw); return { x:c*x-s*z, z:s*x+c*z }; };
const touches = (p, box, radius) => { const q = local(box,p); return Math.hypot(Math.max(0,Math.abs(q.x)-box.width/2),Math.max(0,Math.abs(q.z)-box.depth/2)) < radius-1e-6; };
let rooms = 0, robberies = 0;
for (const entry of interiors.entries) {
  const actor = { x: entry.x-Math.sin(entry.yaw), z: entry.z-Math.cos(entry.yaw), yaw:entry.yaw, health:100 };
  const plan = interiors.enter(entry,actor); assert(plan, entry.name);
  const people = createInteriorPeople(); people.load(plan);
  const all = people.snapshot(), staff = all.filter(p => ['shopkeeper','cashier','cook'].includes(p.role));
  assert.equal(staff.length, plan.variant === 'noodles' ? 2 : 1, `${entry.name}: intended staff count`);
  assert(all.length <= 16);
  for (const p of staff) {
    assert(people.getCrimeTarget(p.id)?.health > 0, `${entry.name}: living crime/trade target`);
    for (const box of [...plan.walls,...plan.furniture]) assert(!touches(p,box,p.radius), `${entry.name}: staff avoids ${box.kind}`);
    for (const other of all) if (p.id !== other.id) assert(Math.hypot(p.x-other.x,p.z-other.z) >= .8-1e-6);
    for (const door of plan.doors) assert(Math.hypot(p.x-door.x,p.z-door.z) >= (door.width||1.5)/2+.45);
    for (const station of plan.activities) assert(Math.hypot(p.x-station.x,p.z-station.z) >= Math.min(1.1,station.radius||1));
    assert(Math.abs(local(plan.origin,p).x) >= .96, `${entry.name}: central aisle retained`);
  }
  // A customer can stand within the actual service radius, outside every body,
  // with physical sight to an employee. The room collider supplies solids.
  let servicePose = null;
  for (let radius = .4; radius <= plan.counter.radius; radius += .2) for (let i=0;i<32;i++) {
    const p = {x:plan.counter.x+Math.cos(i*Math.PI/16)*radius,z:plan.counter.z+Math.sin(i*Math.PI/16)*radius};
    if (!interiors.moveActor({...p},0,0,.45).blocked && all.every(a=>Math.hypot(a.x-p.x,a.z-p.z)>=.73) && staff.some(a=>interiors.hasLineOfSight(p,a))) servicePose ||= p;
  }
  assert(servicePose, `${entry.name}: usable public service position and staff LOS`);
  const queue = [{...actor}], seen = new Set(['0,0']);
  let reached = false;
  for (let index=0; index<queue.length && index<4000; index++) {
    const p = queue[index];
    if (Math.hypot(p.x-plan.counter.x,p.z-plan.counter.z)<=plan.counter.radius &&
      all.every(a=>Math.hypot(a.x-p.x,a.z-p.z)>=.73) && staff.some(a=>interiors.hasLineOfSight(p,a))) { reached=true; break; }
    for (const [dx,dz] of [[.4,0],[-.4,0],[0,.4],[0,-.4]]) {
      const next={...p}; interiors.moveActor(next,dx,dz,.45);
      if (Math.hypot(next.x-p.x-dx,next.z-p.z-dz)>.001 || all.some(a=>Math.hypot(a.x-next.x,a.z-next.z)<.73)) continue;
      const key=`${Math.round((next.x-actor.x)/.4)},${Math.round((next.z-actor.z)/.4)}`;
      if (!seen.has(key)) {seen.add(key);queue.push(next);}
    }
  }
  assert(reached, `${entry.name}: body-clear entry-to-service path`);
  const ctx = { pose:actor,onFoot:true,health:100,vehicleHealth:100,wanted:0,respawnSerial:0,campaign:true,sandbox:false };
  if (['store-358293199','store-6275666787'].includes(entry.storeId)) {
    const result = await executeCampaignCrime({ kind:'robbery',target:{storeId:entry.storeId},fixture:{map,simulation,interiors},ctx,
      active:{id:'staff-regression',stage:0},tick() {},source,people,actor,plan,gameplay:createGameplay(map,simulation) });
    assert.equal(result.domainReceipt.storeId,entry.storeId); assert.equal(result.domainReceipt.serial,1); robberies++;
  }
  rooms++; interiors.reset();
}
assert.equal(rooms,expectedStoreIds.size); assert.equal(robberies,2);
console.log(`Capital shop staff: PASS (${rooms} actual shops, complete source-backed doorways, intended live staff counts, solids/people/doors/activities/aisles, customer service and LOS; real Coals/Scoot till handovers)`);
