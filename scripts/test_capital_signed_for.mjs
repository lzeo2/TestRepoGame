import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';
import { generateParkedCars } from '../Games/Capital Drive/parking-layout.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { HIGHWAY_BARRIERS } from '../Games/Capital Drive/highway-barriers.js';
const read = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const [base, north, profiles] = await Promise.all(['canberra', 'canberra-north', 'road-profiles'].map(read));
const map = applyRoadProfiles(applyMapExpansion(base, north), profiles);
map.landmarks = [...map.landmarks, ...MAPPED_STORES.map(store => ({ ...store, store: true }))];
map.barriers = [...(map.barriers || []), ...HIGHWAY_BARRIERS];
const sim = createSimulation(map, { trafficCount: 0 });
sim.setParkedCars(generateParkedCars(map, { isClear: (x, z, radius, pose) => sim.canOccupy(pose, { length: 4.8, width: 2 }) }));
const saved = { version: 2, character: 'basement', intros: { student: [], corporate: [], basement: ['basement-touch-grass'] }, meeting: false, legacy: false, completed: [] };
const fixture = { spawn: { x: 300, z: 0 }, landmarks: [{ id: 'coals', name: 'Coals', store: true, x: 300, z: 0 }, { id: 'kingston', x: 0, z: 0 }], roads: [
  { name: 'Foot path', type: 'footway', points: [[1, 0], [1, 1]] },
  { name: 'Private drive', type: 'residential', sourceTags: { access: 'private' }, points: [[2, 0], [2, 1]] },
  { name: 'Public Street', type: 'residential', points: [[10, 0], [10, 20]] },
] };
const fixtureGoal = createCampaign(fixture, saved).current().stages[1];
assert.deepEqual([fixtureGoal.x, fixtureGoal.z], [10, 0], 'delivery excludes footways and private roads');
const campaign = createCampaign(map, saved), chapter = campaign.current();
assert.equal(chapter.id, 'basement-first-delivery');
assert.deepEqual(chapter.stages.map(goal => goal.kind), ['work', 'drive', 'foot']);
const [pickup, drive, handover] = chapter.stages;
const route = findRoute(sim.graph, pickup, drive), endpoint = route.at(-1);
assert.ok(endpoint, 'actual Coals-to-Kingston road route exists');
const routeDistance = Math.hypot(endpoint[0] - drive.x, endpoint[1] - drive.z);
assert.ok(routeDistance <= drive.radius, `GPS arrival must reach Signed for stage 2; route ends ${routeDistance.toFixed(3)}m from the objective`);
const node = [...sim.graph.nodes.values()].find(node => node.x === endpoint[0] && node.z === endpoint[1]);
const edge = node.outgoing.find(edge => edge.road.name && edge.road.type !== 'service');
assert.ok(edge, 'arrival belongs to a retained named public road');
const car = { ...pointOnLane(edge, 0), speed: 0 };
assert.ok(sim.canOccupy(car, { length: 4.8, width: 2 }), 'actual stopped saloon body fits at GPS arrival');
const foot = [-1, 1].map(side => ({ x: node.x + edge.dz * (edge.road.width / 2 + 1.2) * side,
  z: node.z - edge.dx * (edge.road.width / 2 + 1.2) * side, yaw: edge.yaw }))
  .find(pose => Math.hypot(pose.x - handover.x, pose.z - handover.z) <= handover.radius && sim.canOccupy(pose, { length: 1, width: .8 }));
assert.ok(foot, 'the same arrival has a clear foot handover beside the road');
const ctx = { pose: { ...pickup, speed: 0 }, onFoot: true, vehicle: { stolen: false }, vehicleHealth: 100,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false, workCompletion: { serial: 7, storeId: pickup.storeId } };
const tick = (context, count = 22) => { for (let i = 0; i < count; i++) campaign.update(.1, context); };
assert.equal(campaign.start(ctx).ok, true);
assert.equal(chapter.combat, false, 'parcel preparation is a paid nonviolent shift');
tick(ctx); assert.equal(campaign.state.active.stage, 0, 'waiting outside cannot prepare the parcel');
for (const invalid of [
  { interior: { storeId: pickup.storeId } },
  { interior: { storeId: pickup.storeId }, workCompletion: null },
  { interior: { storeId: 'wrong-store' }, workCompletion: { serial: 8, storeId: pickup.storeId } },
  { interior: { storeId: pickup.storeId }, workCompletion: { serial: 8, storeId: 'wrong-store' } },
  { interior: { storeId: pickup.storeId }, workCompletion: { serial: 8, storeId: pickup.storeId }, onFoot: false },
]) {
  tick({ ...ctx, ...invalid });
  assert.equal(campaign.state.active.stage, 0, 'parcel requires fresh shift completion in the matching live store');
}
// Matching work-owner receipt is a domain fixture; the campaign playability suite
// separately earns it through the actual activity/progression/controller owners.
tick({ ...ctx, interior: { storeId: pickup.storeId }, workCompletion: { serial: 8, storeId: pickup.storeId } });
assert.equal(campaign.state.active.stage, 1);
for (const invalid of [{ onFoot: true }, { vehicleHealth: 0 }, { sandbox: true }, { campaign: false }, { pose: { ...car, speed: 4 } }, { pose: { ...pickup, speed: 0 } }]) {
  tick({ ...ctx, pose: car, onFoot: false, ...invalid });
  assert.equal(campaign.state.active.stage, 1, 'stage 2 still requires actual stopped driving at the arrival');
}
tick({ ...ctx, pose: car, onFoot: false });
assert.equal(campaign.state.active.stage, 2);
assert.deepEqual(campaign.serialize(), saved, 'GPS arrival alone cannot bank mission credit');
for (const invalid of [{ onFoot: false }, { interior: { roomId: 'unrelated' } }, { sandbox: true }, { pose: { ...pickup, speed: 0 } }]) {
  tick({ ...ctx, pose: foot, ...invalid });
  assert.equal(campaign.state.active.stage, 2, 'handover still requires an actual exterior foot arrival');
}
tick({ ...ctx, pose: foot });
assert.equal(campaign.state.active, null);
assert.deepEqual(campaign.state.intros.basement, ['basement-touch-grass', 'basement-first-delivery']);
assert.deepEqual(campaign.drainEvents().filter(event => event.type === 'complete').map(event => [event.id, event.reward]), [['basement-first-delivery', 150]]);
tick(ctx); assert.equal(campaign.drainEvents().length, 0, 'completion cannot replay a reward');
assert.deepEqual(createCampaign(map, campaign.serialize()).serialize(), campaign.serialize(), 'existing v2 save format retains completed delivery');
console.log(`PASS Signed for: fresh stock-shift guards, actual-map GPS arrival ${edge.road.name}, saloon/foot clearance, ordered stopped drive and exterior handover, single reward and reload`);
