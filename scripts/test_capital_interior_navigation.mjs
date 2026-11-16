import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL(p, import.meta.url), 'utf8');
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const navURL = moduleURL(await read('../Games/Capital Drive/interior-navigation.js'));
const { createInteriorNavigation, createInteriorCollider, clipInteriorActors } = await import(navURL);
const { createInteriors, createGymEntry, createSchoolEntry } = await import(moduleURL((await read('../Games/Capital Drive/interiors.js')).replace('./interior-navigation.js', navURL)));
const map = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const north = JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json'));
const stores = JSON.parse(await read('../Games/Capital Drive/data/stores.json')).stores;
const civic = await read('../Games/Capital Drive/civic-view.js');
const descriptorSource = civic.slice(civic.indexOf('const approachEdge='), civic.indexOf('export const CIVIC_LANDMARKS='));
const { CIVIC_INTERIOR_ENTRIES } = await import(moduleURL(descriptorSource));
const streetAssets = await import(moduleURL(await read('../Games/Capital Drive/street-assets.js')));
const SERVICES = [{ id: 'kingston-gym', type: 'gym', x: 607.24, z: 39.78 }, ...streetAssets.GYM_SITES.map(s => ({ ...s, type: 'gym' }))];
function world(plan, x, z) {
  const c = Math.cos(plan.origin.yaw), s = Math.sin(plan.origin.yaw);
  return { x: plan.origin.x + c * x + s * z, z: plan.origin.z - s * x + c * z };
}
let routes = 0, largestGrid = 0;
function walk(nav, start, target, name) {
  const actor = { ...start };
  for (let tick = 0; tick < 600 && Math.hypot(actor.x - target.x, actor.z - target.z) > .04; tick++) {
    const next = nav.nextWaypoint(actor, target, 'officer');
    assert(next, `${name}: route exists ${JSON.stringify({ start, target, stats: nav.stats })}`);
    const dx = next.x - actor.x, dz = next.z - actor.z, d = Math.hypot(dx, dz), scale = Math.min(1, .22 / d);
    assert(d > .00001, `${name}: route advances`);
    assert(nav.canTraverse(actor, { x: actor.x + dx * scale, z: actor.z + dz * scale }), `${name}: physical sweep clear`);
    assert.equal(nav.moveActor(actor, dx * scale, dz * scale).blocked, false, `${name}: no wall or furniture phasing`);
  }
  assert(Math.hypot(actor.x - target.x, actor.z - target.z) <= .04, `${name}: reaches destination ${JSON.stringify({ actor, target, stats: nav.stats })}`);

  routes++;
  return actor;
}
function exercise(interiors, entry) {
  const actor = { x: entry.x, z: entry.z, y: 0, yaw: entry.yaw };
  const plan = interiors.enter(entry, actor), nav = createInteriorNavigation(plan), collider = createInteriorCollider(plan);
  assert.equal(nav.stats.gridBuilds, 0, 'navigation is lazy, with no pursuit clock');
  for (const target of [plan.counter, ...plan.activities].filter(Boolean)) {
    walk(nav, plan.spawn, target, `${entry.id}/${target.id || 'counter'}`);
    walk(nav, target, plan.exit, `${entry.id}/exit`);
  }
  // Explicitly ask for a route round furniture/partitions, not just the central aisle.
  const candidates = [];
  for (let z = 1.65; z < plan.depth - .6; z += .75) for (let x = -plan.width / 2 + .8; x < plan.width / 2 - .6; x += .75) {
    const p = world(plan, x, z);
    if (collider.canOccupy(p) && !collider.canTraverse(plan.spawn, p)) candidates.push(p);
  }
  for (const target of candidates.filter((_, i) => i % Math.max(1, Math.floor(candidates.length / 5)) === 0).slice(0, 5)) {
    walk(nav, plan.spawn, target, `${entry.id}/furnished side room`);
  }
  const before = nav.stats.gridBuilds;
  for (let i = 0; i < 12; i++) nav.nextWaypoint(plan.spawn, candidates[0] || plan.exit, `unit-${i}`);
  assert.equal(nav.stats.gridBuilds, before, 'one grid per retained room');
  assert(nav.stats.nodes <= 2000); assert(nav.stats.cachedPaths <= 6);
  assert.equal(nav.stats.truncated, false, `${entry.id} real room fits bounded grid`);
  largestGrid = Math.max(largestGrid, nav.stats.nodes);
  const target = plan.activities.at(-1) || plan.counter || plan.spawn;
  interiors.leave(actor);
  assert.equal(interiors.active, null);
  walk(nav, target, plan.exit, `${entry.id}/retained room after leave`);
  assert.equal(nav.moveActor({ ...plan.spawn }, 0, 0).blocked, false, 'retained collider is plan-bound');
}
const actual = createInteriors({ ...map, buildings: [...map.buildings, ...north.buildings] }, { stores });
for (const entry of actual.entries) exercise(actual, entry);
for (const service of SERVICES.filter(s => s.type === 'gym')) {
  const entry = createGymEntry(map, service);
  if (!entry) continue;
  const rooms = createInteriors(map, { publicEntries: [entry] });
  exercise(rooms, rooms.entries[0]);
}
const school = createSchoolEntry(map);
assert(school);
const schoolRooms = createInteriors(map, { publicEntries: [school] });
exercise(schoolRooms, schoolRooms.entries[0]);
const mall = createInteriors(north, { publicEntries: CIVIC_INTERIOR_ENTRIES });
exercise(mall, mall.entries[0]);
const house = { id: 'test-house', type: 'house', height: 4, points: [[-6, 0], [6, 0], [6, 14], [-6, 14]] };
const houses = createInteriors({ buildings: [house], interiorEntries: [{ buildingId: house.id, x: 0, z: 0, nx: 0, nz: 1 }] });
exercise(houses, houses.entries[0]);

const base = { origin: { x: 0, z: 0, yaw: 0 }, width: 9, depth: 9, floorY: 4, walls: [], furniture: [] };
const lowTable = createInteriorNavigation({ ...base, furniture: [{ x: 0, z: 4.5, yaw: 0, width: 3, depth: 1, height: .7 }] });
assert(lowTable.hasLineOfSight({ x: 0, z: 2 }, { x: 0, z: 7 }), 'low tables do not obstruct sight');
assert(!lowTable.canTraverse({ x: 0, z: 2 }, { x: 0, z: 7 }), 'low tables still obstruct walking');
walk(lowTable, { x: 0, z: 2 }, { x: 0, z: 7 }, 'low table detour');
const sealed = createInteriorNavigation({ ...base, walls: [{ x: 0, z: 4.5, yaw: 0, width: 9, depth: .14, height: 2.65 }] });
assert.equal(sealed.nextWaypoint({ x: 0, z: 2 }, { x: 0, z: 7 }), null, 'no path stops at a sealed partition');
assert.equal(sealed.nextWaypoint({ x: NaN, z: 2 }, { x: 0, z: 7 }), null);
const crowd = [{ id: 'unit', x: 0, z: 2, radius: .45 }];
const clip = clipInteriorActors({ x: 0, z: 0 }, 0, 5, .45, crowd);
assert(clip.blocked && clip.dz < 1.11 && clip.dz > 1, 'sweep stops before officer');
assert.equal(clipInteriorActors({ id: 'unit', x: 0, z: 2 }, 0, 1, .45, crowd).blocked, false, 'self excluded');
assert.equal(clipInteriorActors({ x: 0, z: 1.3 }, 0, -1, .45, crowd).blocked, false, 'overlap can separate');
console.log(`Capital interior navigation PASS: ${routes} physical routes; largest grid ${largestGrid}/2000; lazy/reused bounded fields, retained rooms and swept actor contacts`);
