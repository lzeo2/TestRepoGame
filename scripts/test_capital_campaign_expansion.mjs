import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createMissionGuide } from '../Games/Capital Drive/mission-locations.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';

const read = name => readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8').then(JSON.parse);
const [base, north, profiles] = await Promise.all(['canberra', 'canberra-north', 'road-profiles'].map(read));
const map = applyRoadProfiles(applyMapExpansion(base, north), profiles);
map.landmarks = [...map.landmarks, ...MAPPED_STORES.map(store => ({ ...store, store: true }))];
const original = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake'];
const additions = ['shelf-life', 'two-till-problem', 'carbon-copy'];
const owners = ['corporate', 'student', 'basement'];
const intros = { student: ['student-paper-chase', 'student-extra-credit'], corporate: ['corporate-present-tense', 'corporate-lunch-breakpoint'], basement: ['basement-touch-grass', 'basement-first-delivery'] };
const save = { version: 2, character: 'corporate', intros, meeting: true, legacy: false, completed: original };
const ctx = { pose: { x: 0, z: 0, speed: 0 }, onFoot: false, vehicle: { stolen: false }, vehicleHealth: 100,
  wanted: 0, health: 100, respawnSerial: 0, campaign: true, sandbox: false,
  workCompletion: { serial: 10 }, heist: { serial: 20 }, homeAction: { serial: 30 } };
let campaign = createCampaign(map, save);
assert.equal(campaign.current().id, additions[0], 'completed six-chapter saves continue directly without replay');
assert.deepEqual(campaign.serialize(), save, 'loading the continuation earns and rewrites nothing');
assert.equal(campaign.developerChapters().length, 22);
assert.deepEqual(campaign.journal().shared.slice(0, 6).map(chapter => chapter.id), original);
assert.deepEqual(campaign.journal().shared.slice(6, 9).map(chapter => chapter.id), additions);
const legacy = createCampaign(map, { version: 1, completed: original });
assert.equal(legacy.current().id, additions[0], 'completed v1 careers retain their owner-free continuation');
assert.deepEqual(legacy.state.completed, original);
assert.deepEqual(legacy.drainEvents(), []);
const interiors = createInteriors(map, { stores: MAPPED_STORES });
const guide = createMissionGuide(interiors.entries);
const simulation = createSimulation(map, { trafficCount: 0 });
const definitions = owners.map((hero, index) => {
  const entry = createCampaign(map, { ...save, character: hero, completed: [...original, ...additions.slice(0, index)] });
  return entry.current();
});
assert.deepEqual(definitions.map(chapter => chapter.stages.map(goal => goal.kind)), [
  ['drive', 'work', 'drive', 'work', 'foot'],
  ['drive', 'robbery', 'drive', 'robbery', 'escape'],
  ['home-action', 'stolen', 'drive', 'work', 'drive', 'foot'],
], 'the continuation combines distinct multi-stage preparation, work, theft, robbery and escape chains');
for (const chapter of definitions) {
  assert.equal(chapter.companions.length, 2);
  assert(!chapter.companions.includes(chapter.character));
  assert(Object.isFrozen(chapter.stages));
  assert(chapter.cutscene.lines.length === 2 && chapter.cutscene.lines.reduce((total, line) => total + line.duration, 0) <= 10);
  let previous = map.spawn;
  for (const goal of chapter.stages) {
    if (goal.kind === 'drive') {
      const endpoint = findRoute(simulation.graph, previous, goal).at(-1);
      assert(endpoint && Math.hypot(endpoint[0] - goal.x, endpoint[1] - goal.z) <= goal.radius, `${chapter.id}: GPS reaches the ${goal.label} objective radius`);
    }
    previous = goal;
  }
  for (const goal of chapter.stages.filter(goal => ['work', 'robbery'].includes(goal.kind))) {
    const store = MAPPED_STORES.find(store => store.id === goal.storeId);
    assert(store, `${goal.label} binds an existing mapped store identity`);
    assert.deepEqual([goal.x, goal.z], [store.x, store.z]);
    const entry = interiors.entries.find(entry => entry.storeId === store.id);
    assert(entry, `${store.name} has a real entry descriptor`);
    const actor = { x: entry.x - Math.sin(entry.yaw) * 1.5, z: entry.z - Math.cos(entry.yaw) * 1.5, yaw: entry.yaw };
    const plan = interiors.enter(entry, actor);
    assert(plan && plan.storeId === store.id);
    if (goal.kind === 'work') {
      const station = plan.activities.find(station => station.kind === (goal.stationKind || 'stock'));
      assert(station, `${store.name} has its actual work mini-game`);
      const directions = guide.guide({ target: goal }, { plan, pose: actor });
      assert.equal(directions.stationId, station.id, 'the real mission marker identifies the matching stock or noodle station');
      assert.deepEqual(directions.point, { x: station.x, z: station.z });
    } else assert(plan.counter, `${store.name} has an actual till`);
    interiors.reset(actor);
  }
}
const collectionStores = definitions[1].stages.filter(goal => goal.kind === 'robbery').map(goal => goal.storeId);
assert.equal(new Set(collectionStores).size, 2, 'the two till receipts come from separate stores');

function updateStage(value, context) {
  const stage = value.state.active.stage;
  for (let i = 0; i < 100 && value.state.active?.stage === stage; i++) value.update(.1, context);
}
let receipts = { workCompletion: { serial: 10 }, heist: { serial: 20 }, homeAction: { serial: 30 } };
for (let index = 0; index < additions.length; index++) {
  const hero = owners[index];
  assert.equal(campaign.selectCharacter(hero, ctx).ok, true);
  const chapter = campaign.current();
  assert.equal(chapter.id, additions[index]);
  assert.equal(campaign.start({ ...ctx, ...receipts }).ok, true);
  campaign.drainEvents();
  while (campaign.state.active) {
    const active = campaign.state.active, goal = active.target, stage = active.stage;
    let live = { ...ctx, ...receipts, pose: { ...goal, speed: 0 }, onFoot: ['work', 'robbery', 'home-action', 'foot'].includes(goal.kind) };
    if (goal.kind === 'work' || goal.kind === 'robbery' || goal.kind === 'home-action') {
      const key = goal.kind === 'work' ? 'workCompletion' : goal.kind === 'robbery' ? 'heist' : 'homeAction';
      const outcome = goal.kind === 'home-action' ? { roomId: goal.roomId, outcome: 'packed' } : { storeId: goal.storeId, ...(goal.kind === 'robbery' ? { kind: 'robbery' } : {}) };
      live.interior = goal.kind === 'home-action' ? { roomId: goal.roomId } : { storeId: goal.storeId };
      const fresh = { ...outcome, serial: receipts[key].serial + 1 };
      for (const invalid of [
        { ...live, [key]: { ...outcome, serial: receipts[key].serial } },
        { ...live, [key]: { ...fresh, storeId: 'wrong-store', roomId: 'wrong-room' } },
        { ...live, [key]: fresh, interior: null },
        { ...live, [key]: fresh, onFoot: false },
        { ...live, [key]: fresh, sandbox: true },
      ]) {
        for (let i = 0; i < 8; i++) campaign.update(.1, invalid);
        assert.equal(campaign.state.active.stage, stage, 'stale, remote, wrong-room or sandbox outcomes cannot advance a new receipt stage');
        assert.deepEqual(campaign.state.completed, [...original, ...additions.slice(0, index)]);
      }
      receipts[key] = fresh;
      live[key] = fresh;
    }
    if (goal.kind === 'stolen' || goal.stolen) live.vehicle = { stolen: true };
    if (goal.kind === 'escape') {
      campaign.update(.1, { ...live, wanted: 2 });
      assert.equal(campaign.state.active.stage, stage, 'the getaway still requires the search to clear');
    }
    updateStage(campaign, live);
    assert(campaign.state.active === null || campaign.state.active.stage > stage, `${chapter.id} stage ${stage} advances through its actual predicate`);
  }
  const events = campaign.drainEvents(), paid = events.filter(event => event.type === 'complete');
  assert.equal(paid.length, 1);
  assert.equal(paid[0].id, chapter.id);
  assert.equal(paid[0].reward, [1350, 1600, 1900][index]);
  campaign.update(.1, ctx);
  assert.deepEqual(campaign.drainEvents(), []);
  campaign = createCampaign(map, campaign.serialize());
  assert.deepEqual(campaign.state.completed, [...original, ...additions.slice(0, index + 1)]);
}
assert.equal(campaign.nextRequiredCharacter().id, 'corporate');
assert.equal(campaign.selectCharacter('corporate', ctx).ok, true);
assert.equal(campaign.current().id, 'paper-trail-survey', 'the original continuation leads directly to the reconnaissance arc');
assert.deepEqual(campaign.state.intros, intros);
for (const id of additions) {
  const preview = createCampaign(map, save);
  assert.equal(preview.startDeveloper(id, { ...ctx, developer: true }).ok, true);
  assert.equal(preview.state.active.reward, 0, 'new previews cannot pay career money');
  preview.cancel();
  assert.deepEqual(preview.serialize(), save);
}
console.log('Capital campaign continuation: three mapped multi-stage crew chapters, fresh matching receipts, old v1/v2 prefixes, real stock/kitchen rooms, ordered once-only rewards and preview isolation PASS');
