import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createInteriorView } from '../Games/Capital Drive/interior-view.js';
import { createInteriorPeople } from '../Games/Capital Drive/interior-people.js';
import { createInteriorCollider, createInteriorNavigation } from '../Games/Capital Drive/interior-navigation.js';

const fixture = (id, kind, x, z, yaw, width, depth) => {
  const inward = yaw + Math.PI, c = Math.cos(inward), s = Math.sin(inward);
  return { id, kind, name: kind === 'bank' ? 'Civic Mutual Bank' : kind === 'tower' ? 'Black Mountain Tower archive' : 'Manuka Facets',
    yaw, width, depth, floor: 14.3,
    point: (across, forward) => ({ x: x + c * across + s * forward, z: z - s * across + c * forward }) };
};
const sites = [fixture('civic-bank', 'bank', 30, 25, .73, 12.8, 7.6), fixture('manuka-jewels', 'jeweller', -30, -25, -1.2, 10.4, 6.4), fixture('black-mountain-archive', 'tower', 90, 90, .4, 10.4, 7.6)];
const rooms = createInteriors({ buildings: [] }, { heightAt: () => 13.8, heistSites: sites });
assert.equal(rooms.entries.length, 3);
assert.equal(rooms.stats.generatedPlans, 0, 'exterior descriptors allocate no room plans');
const scene = new THREE.Scene(), view = createInteriorView(scene), people = createInteriorPeople();
assert.equal(view.stats.meshes, 0);
let totalDisposed = 0;
for (const site of sites) {
  const door = site.point(0, 0), outside = { ...site.point(0, -2.05), y: 13.8, yaw: site.yaw };
  const entry = rooms.findEntry(outside);
  assert.equal(entry.heistSiteId, site.id); assert.equal(entry.storeId, site.id); assert.equal(entry.serviceId, site.id);
  assert.equal(entry.x, door.x); assert.equal(entry.z, door.z);
  assert.equal(entry.yaw, site.yaw + Math.PI, 'entry faces into the existing rendered frontage');
  assert.equal(rooms.findEntry(site.point(0, 1.1)), null, 'back of the solid facade cannot open the room');
  const actor = { ...outside }, plan = rooms.enter(entry, actor);
  assert.equal(plan.id, `interior-${site.id}`); assert.equal(plan.variant, site.kind);
  assert.equal(plan.floorY, site.floor + .14, 'room floor follows the existing exterior foundation');
  assert.equal(plan.width, site.width); assert.equal(plan.depth, site.depth);
  assert.equal(plan.heist.siteId, site.id); assert.equal(plan.heist.kind, site.kind);
  assert(Object.isFrozen(plan.heist.employee) && Object.isFrozen(plan.heist.loot));
  assert.equal(plan.activities.length, 0, 'only the heist controller can authorize taking loot');
  const collider = createInteriorCollider(plan), navigation = createInteriorNavigation(plan);
  assert(collider.canOccupy(plan.spawn)); assert(collider.canOccupy(plan.counter));
  assert(collider.canOccupy(plan.heist.employee, .36)); assert(collider.canOccupy(plan.heist.loot));
  const walk = (x, z) => {
    const target = site.point(x, z), dx = target.x - actor.x, dz = target.z - actor.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .25));
    for (let i = 0; i < steps; i++) assert(!rooms.moveActor(actor, dx / steps, dz / steps).blocked, 'door/lobby/loot route stays open');
  };
  const staff = people.load(plan);
  assert.equal(staff.length, 1);
  assert.equal(staff[0].apron, false);
  assert.equal(staff[0].id, plan.heist.employee.id); assert.equal(staff[0].character, 'heist-employee');
  assert.equal(staff[0].roomId, plan.id); assert.equal(staff[0].storeId, site.id); assert.equal(staff[0].serviceId, site.id);
  const target = people.getCrimeTarget(staff[0].id);
  assert.equal(target.kind, 'employee'); assert.equal(target.health, 100); assert.equal(target.serviceId, site.id);
  walk(0, site.kind === 'bank' ? 3.5 : 3.6); walk(site.kind === 'bank' ? -2.8 : -1.8, site.kind === 'bank' ? 3.5 : 3.6);
  assert(rooms.hasLineOfSight(actor, target)); assert(Math.hypot(actor.x - target.x, actor.z - target.z) <= 3.2);
  people.setCrime({ type: 'robbery', targetId: target.id, phase: 'handover' });
  people.update(.1, { actor, hasLineOfSight: rooms.hasLineOfSight });
  assert.equal(people.snapshot()[0].reaction, 'compliant', 'existing people view receives the surrender state');
  people.setCrime(null);
  walk(0, site.kind === 'bank' ? 3.5 : 3.6); walk(0, site.kind === 'bank' ? 5.65 : 5.05);
  walk(site.kind === 'bank' ? 3.45 : 2.05, site.kind === 'bank' ? 5.65 : 5.05);
  assert(Math.hypot(actor.x - plan.heist.loot.x, actor.z - plan.heist.loot.z) < 1e-7);
  assert(rooms.hasLineOfSight(actor, plan.heist.loot));
  assert(navigation.nextWaypoint(plan.spawn, plan.heist.loot), 'shared NPC navigation reaches loot without new geometry rules');
  const hitSource = { ...site.point(site.kind === 'bank' ? -1.7 : -.7, site.kind === 'bank' ? 5.65 : 5.6), interiorId: plan.id };
  assert(collider.canOccupy(hitSource), 'employee has a clear nearby confrontation approach');
  // Existing combat operates on the same authoritative employee body, without a heist-only duplicate.
  const hit = people.strike({ ...hitSource, yaw: plan.origin.yaw + Math.PI / 2, range: 1.2, damage: 20, kind: 'melee', hasLineOfSight: () => true });
  assert.equal(hit.hits, 1); assert.equal(people.getCrimeTarget(target.id).health, 80);
  view.load(plan); assert.equal(view.stats.draws, 1); assert(view.stats.triangles < 2500);
  scene.children[0].children[0].geometry.addEventListener('dispose', () => totalDisposed++);
  const marker = scene.children[0].children[1], markerGeometry = marker.geometry;
  assert.equal(marker.visible, false); assert(view.setHeistLootActive(true)); assert.equal(marker.visible, true); assert.equal(view.stats.draws, 2);
  assert(view.setHeistLootActive(false)); assert.equal(view.stats.draws, 1); assert.equal(marker.geometry, markerGeometry, 'loot state toggles reuse active geometry');
  scene.traverse(mesh => { if (mesh.isMesh) for (const a of Object.values(mesh.geometry.attributes)) assert(a.array.every(Number.isFinite)); });
  const triangles = view.stats.triangles;
  assert.equal(rooms.enter(rooms.entries.find(e => e !== entry), actor), false, 'only the active room is allocated');
  assert(rooms.leave(actor)); view.clear(); people.clear();
  assert.deepEqual({ x: actor.x, z: actor.z, y: actor.y, yaw: actor.yaw }, outside);
  assert.equal(rooms.stats.activePlans, 0); assert.equal(view.stats.meshes, 0); assert.equal(people.snapshot().length, 0);
  console.log(`PASS ${site.name}: distinct ${triangles}-triangle lazy room; exact exterior door, live employee, counter/loot reachability, surrender/combat and exit cleanup`);
}
assert.equal(totalDisposed, 3); view.dispose(); assert.equal(scene.children.length, 0);
assert.equal(createInteriors({ buildings: [] }, { heistSites: [{ ...sites[0], point: () => ({ x: NaN, z: 0 }) }] }).entries.length, 0);
