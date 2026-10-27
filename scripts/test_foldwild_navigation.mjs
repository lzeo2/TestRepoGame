import assert from 'node:assert/strict';
import { navigationObjective } from '../Games/Foldwild/navigation.js';
import { freshGame, validateSave, worldPoints, REGION_LAYOUTS, routeTo } from '../Games/Foldwild/world.js';
import { FINALE_STAGES } from '../Games/Foldwild/campaign.js';

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
let checks = 0;
function check(state) {
  const before = structuredClone(state);
  const input = freeze(structuredClone(state));
  const goal = navigationObjective(input);
  assert.deepEqual(input, before, 'Advice must not mutate saves, resources or discovery');
  if (goal.target) {
    const point = worldPoints(state, { exploration: true }).find(p => p.id === goal.target.id);
    assert(point);
    assert.deepEqual([goal.target.x, goal.target.z, goal.target.label], [point.x, point.z, point.label]);
    assert.equal(goal.target.locationName, point.locationName ?? point.label);
    assert(!Object.hasOwn(goal.target, 'speciesId'));
    const nav = goal.navigation;
    assert.equal(nav.distance, Math.hypot(point.x - state.position.x, point.z - state.position.z));
    assert.equal(nav.arrived, nav.distance <= 1.8);
    assert.equal(nav.reachable, true);
    if (nav.arrived) {
      assert.equal(nav.direction, 'here'); assert.equal(nav.bearing, null);
      assert.equal(nav.routeDistance, 0); assert.deepEqual(nav.route, []);
      assert.match(nav.arrivalText, /^At /);
    } else {
      assert.deepEqual(nav.route, routeTo(state.region, state.position, point));
      assert(nav.routeDistance >= nav.distance - 1e-8);
      assert.equal(nav.arrivalText, null);
      const next = nav.route.find(p => Math.hypot(p.x - state.position.x, p.z - state.position.z) > 0.3);
      assert.equal(nav.bearing, Math.atan2(next.x - state.position.x, state.position.z - next.z));
    }
  } else assert.equal(goal.navigation, null);
  checks++;
  return goal;
}
function fixture(trials, region = Math.min(trials, 4), finaleStage = 0) {
  const state = freshGame('cindupp', 19);
  state.defeatedRivals = Array.from({ length: trials }, (_, i) => i);
  state.region = region; state.finaleStage = finaleStage;
  state.position = { ...REGION_LAYOUTS[region].spawn };
  return validateSave(state);
}

const first = check(freshGame());
assert.equal(first.kind, 'trial'); assert.equal(first.target.label, 'Maren');
assert.deepEqual([first.target.x, first.target.z], [22, -26], 'Northern clearing is Maren, not the decorative stone');
assert.equal(first.action.pointId, 'rival');
assert.equal(first.navigation.direction, 'north', 'First waypoint skirts the cottage instead of pointing through it');
for (let trials = 0; trials < 5; trials++) {
  const state = fixture(trials), goal = check(state);
  assert.equal(goal.kind, 'trial'); assert.equal(goal.target.id, 'rival');
  assert.equal(goal.targetRegion, trials);
  for (let region = 0; region < trials; region++) {
    const travel = check(fixture(trials, region));
    assert.equal(travel.kind, 'travel'); assert.equal(travel.target.id, 'exit');
    assert.equal(travel.targetRegion, region + 1, 'Route gate leads only to its adjacent unlocked region');
  }
}
for (const stage of FINALE_STAGES) {
  for (let region = 0; region < 5; region++) {
    const goal = check(fixture(5, region, stage.id));
    assert.equal(goal.targetRegion, stage.region);
    if (region === stage.region) {
      assert.equal(goal.kind, 'lesson'); assert.equal(goal.target.id, stage.pointId);
      assert.deepEqual(worldPoints(fixture(5, region, stage.id)).find(p => p.id === goal.target.id).challenge,
        { kind: 'finale', id: stage.id });
    } else {
      assert.equal(goal.kind, 'travel'); assert.equal(goal.target, null);
      assert.deepEqual(goal.action, { type: 'travel', label: `Travel to ${['Rootfold Meadow','Stillwater Reach','','','Quietfold Hollow'][stage.region]}`, region: stage.region });
    }
  }
}
for (let region = 0; region < 5; region++) {
  const goal = check(fixture(5, region, 3));
  assert.equal(goal.kind, 'complete'); assert.equal(goal.target.id, 'rival');
  assert.deepEqual(worldPoints(fixture(5, region, 3)).find(p => p.id === goal.target.id).challenge,
    { kind: 'rematch', id: region });
}
const injured = freshGame(); injured.roster[0].hp = 0;
const recovery = check(injured);
assert.equal(recovery.kind, 'recover'); assert.equal(recovery.target.id, 'camp');
const arrived = fixture(0), rival = worldPoints(arrived).find(p => p.id === 'rival');
arrived.position = { x: rival.x, z: rival.z, yaw: 0 };
assert.equal(check(arrived).navigation.arrived, true);
arrived.position.x += 1.8 - 1e-9;
assert.equal(check(arrived).navigation.arrived, true);
arrived.position.x += 2e-9;
assert.equal(check(arrived).navigation.arrived, false);
for (const [dx, dz, direction] of [[0,-5,'north'],[5,-5,'northeast'],[5,0,'east'],[5,5,'southeast'],
  [0,5,'south'],[-5,5,'southwest'],[-5,0,'west'],[-5,-5,'northwest']]) {
  const state = fixture(0); state.position = { x: rival.x - dx, z: rival.z - dz, yaw: 0 };
  assert.equal(check(state).navigation.direction, direction);
}
const westBank = fixture(0); westBank.position = { x: -40, z: 12, yaw: 0 };
const bridgeRoute = check(westBank);
assert(bridgeRoute.navigation.route.length > 1);
assert(bridgeRoute.navigation.routeDistance > bridgeRoute.navigation.distance);
// No optional/unknown creature name, ID or coordinate enters advice, even when enabled and eligible.
const optionalOff = fixture(5, 4, 3), optionalOn = structuredClone(optionalOff);
optionalOn.optionalEncounters = true;
assert.deepEqual(check(optionalOn), check(optionalOff));
for (const version of [1, 2]) {
  const old = freshGame(); old.version = version;
  delete old.finaleStage; delete old.pendingChallenge;
  assert.equal(check(validateSave(old)).kind, 'trial');
}
// This synthetic phase marker only exercises priority; pending-battle validity belongs to world/save suites.
const pending = freshGame(); pending.pendingBattle = { round: 1 };
const resume = check(pending);
assert.equal(resume.kind, 'battle'); assert.equal(resume.target, null);
assert.equal(resume.action.type, 'resume-battle');
console.log(`PASS: ${checks} navigation fixtures; live points, trial/lesson gates, routes, compass, arrival, recovery, secret exclusion and immutable state`);
