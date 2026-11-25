import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createMissionGuide } from '../Games/Capital Drive/mission-locations.js';

const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function controllerFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} remains owned by the controller`);
  let end = source.indexOf('{', start) + 1, depth = 1;
  while (depth) { assert(end < source.length); depth += (source[end] === '{') - (source[end] === '}'); end++; }
  return source.slice(start, end);
}
const map = { spawn: { x: 0, z: 0 }, landmarks: [{ id: 'coals', name: 'Coals', store: true, x: 100, z: 10 }] };
const prefix = createCampaign(map).journal().shared.map(chapter => chapter.id);
const campaign = createCampaign(map, { version: 1, completed: prefix.slice(0, prefix.indexOf('quiet-streets')) });
const context = { pose: { x: 0, z: 0, speed: 0 }, onFoot: false, wanted: 2, health: 100, vehicleHealth: 100,
  respawnSerial: 0, campaign: true, sandbox: false };
assert(campaign.start(context).ok);
campaign.drainEvents();
const calls = [];
const env = { campaign, heists: null, reportCampaignIncident() {}, gameMode: 'campaign', missionLocations: createMissionGuide([]),
  focus: () => context.pose, interiors: { active: null }, roomPeople: { snapshot: () => [] },
  gameplay: { state: { wanted: 2 }, reportOffence() {} }, progression: { state: { activeJob: null, garage: { x: 7, z: 8 } }, drainEvents: () => [] },
  rideService: { drainEvents: () => [] }, notify() {}, finishDeveloperPreview() {}, restoreFailedMission() {}, acceptMissionCheckpoint() {}, missionCheckpoint: null,
  // This campaign fixture has no active Skylark job overriding its objective.
  skylineObjective: () => null,
  isSandbox: () => false, lastJobTarget: '', destination: null, route: [],
  routeTo(target) { calls.push(target); env.destination = target; env.route = [[0, 0], [target.x, target.z]]; } };
vm.createContext(env);
vm.runInContext(`${controllerFunction('campaignNavigationTarget')}\n${controllerFunction('updateCareer')}`, env);
const objective = source.match(/^  const objective = (.+);$/m)?.[1];
assert(objective, 'actual world marker expression is available');
const worldTarget = () => vm.runInContext(`(${objective})`, env);
env.updateCareer();
assert(env.destination && env.route.length > 0, 'controller routes before actual arrival');
assert(worldTarget(), 'world marker exists before arrival');
const target = campaign.state.active.target;
context.pose = { x: target.x + 1000, z: target.z + 1000, speed: 0 };
context.wanted = 0; env.gameplay.state.wanted = 0;
for (let i = 0; i < 80; i++) campaign.update(.1, context);
env.updateCareer();
assert.equal(campaign.snapshot().active.escapeReached, false, 'clearing remotely is not arrival');
assert(env.destination && worldTarget(), 'route and marker persist until legitimate arrival');
context.pose = { x: target.x, z: target.z, speed: 0 };
context.wanted = 2; env.gameplay.state.wanted = 2;
env.interiors.active = { id: 'fixture-room', name: 'the room', exit: { x: 1, z: 2 } };
campaign.update(.1, { ...context, interior: env.interiors.active });
assert.equal(campaign.snapshot().active.escapeReached, false, 'overlapping indoor coordinates cannot arrive outside');
const exitGuide = env.missionLocations.guide(campaign.state.active, { pose: context.pose, plan: env.interiors.active });
assert(exitGuide?.indoors, 'before leaving, actual guide still directs an exit');
assert.deepEqual(exitGuide.point, env.interiors.active.exit, 'indoor cue retains the actual exit position');
assert.equal(env.campaignNavigationTarget(), null, 'indoor exit cue does not restore an outdoor world route');
env.interiors.active = null;
campaign.update(.1, context);
assert.equal(campaign.snapshot().active.escapeReached, true);
assert.equal(env.campaignNavigationTarget(), null, 'real guide stops routing after arrival');
env.updateCareer();
assert.equal(env.destination, null, 'actual career integration clears GPS destination');
assert.equal(env.route.length, 0, 'actual career integration clears GPS polyline');
assert.equal(worldTarget(), null, 'actual world marker clears without garage fallback during escape');
assert.equal(env.missionLocations.guide(campaign.state.active, { wanted: 2 }).escaping, true);
const routed = calls.length;
context.pose = { x: target.x + 2000, z: target.z + 2000, speed: 12 };
for (let i = 0; i < 5; i++) { campaign.update(.1, context); env.updateCareer(); }
assert.equal(calls.length, routed, 'leaving the reached location does not restore its route');
assert.equal(worldTarget(), null);
assert(campaign.cancel());
assert(campaign.start(context).ok);
env.updateCareer();
assert.equal(campaign.snapshot().active.escapeReached, false, 'new attempt requires new actual arrival');
assert(env.destination && worldTarget(), 'fresh attempt restores navigation');
console.log('PASS actual escape navigation: genuine campaign arrival, exterior guard, guide target, controller GPS clearing, world marker clearing, no garage fallback, remote clearing denial and fresh-attempt route');
