import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import {createBurglary} from '../Games/Capital Drive/burglary.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createInteriors, createGymEntry } from '../Games/Capital Drive/interiors.js';
import { createInteriorActivities, WORKOUT_KINDS, isWorkoutKind } from '../Games/Capital Drive/interior-activities.js';
import { SERVICES, SOURCE_GYM_SERVICES } from '../Games/Capital Drive/services.js';
import { GYM_SITES } from '../Games/Capital Drive/street-assets.js';
const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
// Exercise the controller's actual handoff rather than a copied eligibility gate.
const controller = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const miniStart = controller.indexOf('function updateMini(){');
const handoffStart = controller.indexOf('for(const event of activities.drainEvents()){', miniStart);
const handoffEnd = controller.indexOf("    if(event.kind==='presentation'", handoffStart);
assert(miniStart >= 0 && handoffStart > miniStart && handoffEnd > handoffStart, 'controller workout handoff remains discoverable');
const workoutHandoff = controller.slice(controller.indexOf('{', handoffStart) + 1, handoffEnd);
function controllerHandoff(f) {
  let saves = 0;
  const consume = runInNewContext(`event => {${workoutHandoff}}`, {
    burglary:createBurglary({canApproach:()=>false}),burglaryContext:()=>f.ctx,activities:f.activities,recordEvidence: () => false, progression: f.progression, isWorkoutKind, careerContext: () => f.ctx, saveCareer: () => saves++,
  });
  return { consume, get saves() { return saves; } };
}
function fixture(kind = 'bench', { serviceId = 'kingston-gym', saved = null } = {}) {
  const site = SERVICES.find(item => item.id === serviceId);
  const entry = createGymEntry(map, site);
  assert(entry, `${serviceId} has a clear generated public-facing gym entry`);
  const interiors = createInteriors(map, { heightAt: () => 0, publicEntries: [entry] });
  const actor = { x: entry.x, z: entry.z, yaw: entry.yaw };
  const plan = interiors.enter(interiors.entries.find(item => item.serviceId === serviceId), actor);
  assert(plan && Object.isFrozen(plan));
  const activities = createInteriorActivities(); activities.load(plan);
  const station = plan.activities.find(item => item.kind === kind);
  const ctx = { pose: { ...station }, onFoot: true, wanted: 0, recovering: false, sandbox: false, vehicleHealth: 100, respawnSerial: 0 };
  let override, visible = true, permitted = true;
  const progression = createProgression(map, saved, { interactiveWorkouts: true,
    workSession: () => override || { plan: interiors.active, session: activities.snapshot() },
    hasLineOfSight: (from, to) => visible && interiors.hasLineOfSight(from, to),
    canUseService: source => permitted && interiors.active?.serviceId === source.id });
  function start() { assert(activities.start(station.id, ctx)); return progression.startActivity(serviceId, 'workout', ctx); }
  function tick(input = {}, next = ctx) { activities.step(.05, input, next); progression.update(.05, next); }
  function complete() {
    let count = 0;
    while (activities.snapshot().active && count++ < 2000) {
      const s = activities.snapshot();
      let input = {};
      if (kind === 'bench') input = { x: true, y: true, ...(s.phase === 'cue' ? { up: true } : {}) };
      else if (kind === 'rower' && ['cue', 'drive'].includes(s.phase)) input = { x: true, y: true };
      else if (s.phase === 'cue' || kind === 'curls' && s.phase === 'lift') input = { [s.expectedKey]: true };
      tick(input);
    }
    assert.equal(activities.snapshot().phase, 'complete', `${kind} completes through real timed inputs`);
  }
  return { site, entry, interiors, plan, station, activities, ctx, progression, start, tick, complete,
    override: value => { override = value; }, visibility: value => { visible = value; }, permission: value => { permitted = value; } };
}
for (const kind of WORKOUT_KINDS) {
  const f = fixture(kind), p = f.progression;
  assert.equal(p.workoutEligibility(f.site.id, f.ctx), 'Start an exercise at its equipment first.');
  assert.equal(p.startActivity(f.site.id, 'workout', f.ctx).ok, false);
  assert(f.start().ok); assert(Object.isFrozen(p.state.activity.station));
  assert.equal(p.state.activity.station.kind, kind);
  assert.equal(p.state.activity.sessionId, f.activities.snapshot().sessionId);
  assert.equal(p.state.cash, 1000, 'admission never charges');
  assert.equal(p.startActivity(f.site.id, 'workout', f.ctx).ok, false, 'no overlapping paid exercise');
  assert.equal(p.startJob('crescent-parcel', f.ctx).ok, false);
  assert.equal(createProgression(map, p.serialize()).state.activity, null, 'exercise is transient');
  f.complete(); assert.equal(p.state.cash, 1000, 'input completion waits for the authoritative handoff');
  assert(p.finishWorkout(f.ctx, true).ok);
  assert.equal(p.state.cash, 880); assert.equal(p.state.fitnessLevel, 1);
  assert.equal(p.finishWorkout(f.ctx, true).ok, false); assert.equal(p.state.cash, 880);
  const events = p.drainEvents().filter(event => event.type === 'workout-complete');
  assert.equal(events.length, 1); assert.equal(events[0].kind, kind);
  const save = p.serialize(); assert.equal(save.version, 1);
  assert.deepEqual(createProgression(map, save).serialize(), save, 'existing career save round trips unchanged');
}
// E cancellation/restart can occur before the next RAF drains the previous event.
// Old cancellation AND old completion must leave the replacement paid session intact.
for (const kind of WORKOUT_KINDS) for (const terminal of ['cancel', 'complete']) {
  const f = fixture(kind), p = f.progression, handoff = controllerHandoff(f);
  assert(f.start().ok);
  const oldSession = f.activities.snapshot().sessionId;
  if (terminal === 'complete') f.complete(); else f.activities.cancel();
  p.cancelActivity();
  assert(f.start().ok);
  const replacement = p.state.activity;
  assert(replacement.sessionId > oldSession);
  const stale = f.activities.drainEvents();
  assert.equal(stale.length, 1); assert.equal(stale[0].type, terminal);
  handoff.consume(stale[0]);
  assert.equal(p.state.activity, replacement, `${kind}: stale ${terminal} cannot end replacement session`);
  assert.equal(p.state.cash, 1000); assert.equal(p.state.fitnessLevel, 0); assert.equal(handoff.saves, 0);
  f.complete();
  const [current] = f.activities.drainEvents();
  assert.equal(current.sessionId, replacement.sessionId);
  // A mismatched room/station event cannot spend or clear a valid completed set.
  handoff.consume({ ...current, planId: `${current.planId}-other` });
  handoff.consume({ ...current, id: 'other-station', stationId: 'other-station', station: { ...current.station, id: 'other-station' } });
  assert.equal(p.state.activity, replacement); assert.equal(handoff.saves, 0);
  handoff.consume(current); handoff.consume(current);
  assert.equal(p.state.activity, null);
  assert.equal(p.state.cash, 880); assert.equal(p.state.fitnessLevel, 1);
  assert.equal(handoff.saves, 1, 'only the actual current completion charges and saves once');
}
{
  const f = fixture('treadmill'), p = f.progression;
  for (let level = 1; level <= 3; level++) { assert(f.start().ok); f.complete(); assert(p.finishWorkout(f.ctx, true).ok); assert.equal(p.state.fitnessLevel, level); }
  assert.equal(p.state.cash, 1000 - 120 - 240 - 360);
  assert(f.activities.start(f.station.id, f.ctx));
  assert.equal(p.workoutEligibility(f.site.id, f.ctx), 'Training complete.');
  assert.equal(p.startActivity(f.site.id, 'workout', f.ctx).ok, false);
}
for (const extra of [{ sandbox: true }, { recovering: true }, { onFoot: false }, { wanted: 1 }, { respawnSerial: 1 }, { pose: { x: 99999, z: 99999 } }, { pose: null }]) {
  const f = fixture(); assert(f.start().ok);
  f.progression.update(0, { ...f.ctx, ...extra });
  assert.equal(f.progression.state.activity, null, 'invalid player cancels even at dt0');
  assert.equal(f.progression.finishWorkout(f.ctx, true).ok, false);
  assert.equal(f.progression.state.cash, 1000); assert.equal(f.progression.state.fitnessLevel, 0);
}
for (const extra of [{ sandbox: true }, { recovering: true }, { onFoot: false }, { wanted: 1 }, { respawnSerial: 1 }, { pose: { x: 99999, z: 99999 } }]) {
  const f = fixture('curls'); assert(f.start().ok); f.complete();
  assert.equal(f.progression.finishWorkout({ ...f.ctx, ...extra }, true).ok, false, 'handoff validates current player without relying on update');
  assert.equal(f.progression.state.cash, 1000); assert.equal(f.progression.state.fitnessLevel, 0);
}
for (const reason of ['caller-boolean', 'cancel', 'leave', 'failure', 'wrong-session', 'wrong-station', 'wrong-kind', 'wrong-plan', 'replaced-plan', 'mutable-plan', 'sandbox-session', 'wrong-phase', 'idle-phase', 'no-los', 'permission']) {
  const f = fixture('rower'), p = f.progression; assert(f.start().ok);
  if (reason !== 'caller-boolean') f.complete();
  if (reason === 'cancel') p.cancelActivity();
  else if (reason === 'leave') f.interiors.leave({ ...f.ctx.pose });
  else if (reason === 'failure') f.override({ plan: f.plan, session: { ...f.activities.snapshot(), phase: 'failed', active: false } });
  else if (reason === 'no-los') f.visibility(false);
  else if (reason === 'permission') f.permission(false);
  else if (reason !== 'caller-boolean') {
    const session = f.activities.snapshot(); let plan = f.plan;
    if (reason === 'wrong-session') session.sessionId++;
    if (reason === 'wrong-station') session.station.x++;
    if (reason === 'wrong-kind') session.kind = 'stock';
    if (reason === 'wrong-plan') session.planId += '-wrong';
    if (reason === 'replaced-plan') plan = Object.freeze({ ...plan });
    if (reason === 'mutable-plan') plan = { ...plan };
    if (reason === 'sandbox-session') session.sandbox = true;
    if (reason === 'wrong-phase') session.active = true;
    if (reason === 'idle-phase') { session.active = true; session.phase = 'idle'; }
    f.override({ plan, session });
  }
  assert.equal(p.finishWorkout(f.ctx, true).ok, false, `${reason} cannot train or charge`);
  assert.equal(p.state.cash, 1000); assert.equal(p.state.fitnessLevel, 0);
}
{
  const f = fixture(); assert(f.activities.start(f.station.id, { ...f.ctx, sandbox: true }));
  assert.equal(f.progression.startActivity(f.site.id, 'workout', f.ctx).ok, false, 'free session cannot become paid training');
}
{
  const f = fixture(); assert(f.activities.start(f.station.id, f.ctx)); f.visibility(false);
  assert.equal(f.progression.workoutEligibility(f.site.id, f.ctx), 'Stay close to the exercise equipment with a clear view.');
  assert.equal(f.progression.startActivity(f.site.id, 'workout', f.ctx).ok, false);
}
{
  const save = createProgression(map).serialize(); save.cash = 119;
  const f = fixture('bench', { saved: save }); assert(f.activities.start(f.station.id, f.ctx));
  assert.equal(f.progression.workoutEligibility(f.site.id, f.ctx), 'Not enough cash.');
  assert.equal(f.progression.startActivity(f.site.id, 'workout', f.ctx).ok, false);
}
assert.equal(SOURCE_GYM_SERVICES.length, 3);
for (const site of SOURCE_GYM_SERVICES) {
  const source = GYM_SITES.find(item => item.id === site.id);
  assert(source && source.sourceTags.leisure === 'fitness_centre');
  assert(!source.sourceTags.sport && !['private', 'no'].includes(source.sourceTags.access));
  assert.equal(site.x, source.x); assert.equal(site.z, source.z);
  assert(source.buildingMatches.some(building => building.id === site.buildingId));
  assert.notEqual(site.name, source.sourceName, 'original parody name retains separate source identity');
  const f = fixture('bench', { serviceId: site.id });
  assert(site.sourceBuildingIds.includes(f.entry.buildingId), 'generated entry retains the actual source fitness building');
  assert(f.start().ok); f.complete(); assert(f.progression.finishWorkout(f.ctx, true).ok);
}
console.log('PASS gym equipment: four real playable workouts; actual controller ignores stale cancel/complete and mismatched room/station without clearing replacement sessions; once-only current completion charge/save; frozen identities, reach/LOS/player/mode guards; escalating cost and fitness cap; unchanged career v1; three sourced parody gyms.');
