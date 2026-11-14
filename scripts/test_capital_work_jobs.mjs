import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createInteriorActivities } from '../Games/Capital Drive/interior-activities.js';
import { SERVICES } from '../Games/Capital Drive/services.js';

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const context = (pose = map.spawn, extra = {}) => ({ pose: { ...pose }, onFoot: true, wanted: 0,
  recovering: false, sandbox: false, vehicleHealth: 100, respawnSerial: 0, ...extra });
const recipes = { noodle: ['x', 'y', 'up', 'x', 'up', 'y'], stock: ['x', 'up', 'y', 'x'] };
function fixture(kind = 'noodle', options = {}) {
  const store = SERVICES.find(site => site.source && site.frontage && (kind === 'noodle' ? site.interiorType === 'noodle-shop' : site.interiorType !== 'noodle-shop'));
  const interiors = createInteriors({ buildings: [{ id: store.buildingId, ...store.building }] }, { stores: [store], heightAt: () => 0 });
  const actor = { x: store.frontage.x, z: store.frontage.z, y: 0, yaw: 0 };
  const plan = interiors.enter(interiors.entries[0], actor);
  assert(plan, 'fixture enters a source-backed actual generated room');
  const activities = createInteriorActivities();
  activities.load(plan);
  const station = plan.activities.find(item => item.kind === kind);
  const ctx = context(station);
  let override;
  const progression = createProgression(map, null, { workSession: () => override || { plan: interiors.active, session: activities.snapshot() },
    servicePosition: site => site.id === store.id ? station : null,
    canUseService: site => interiors.active?.storeId === site.id, hasLineOfSight: interiors.hasLineOfSight, ...options });
  function start() {
    assert.equal(activities.start(station.id, ctx), true);
    return progression.startShift(store.id, ctx);
  }
  function tick(held = {}, dt = 0.05, next = ctx) { activities.step(dt, held, next); progression.update(dt, next); }
  function complete() {
    if (kind === 'stock') for (let i = 0; i < 71; i++) tick();
    for (const key of recipes[kind]) { tick(); tick({ [key]: true }); }
    assert.equal(activities.snapshot().phase, 'complete');
  }
  return { store, interiors, activities, plan, station, ctx, progression, start, tick, complete, override: value => { override = value; } };
}

const controllerSource=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const startFunction=controllerSource.match(/function beginMini\(id\)\{[\s\S]*?\n\}/)?.[0];
assert(startFunction,'production activity controller is present');
const {bind}=await import('data:text/javascript;base64,'+Buffer.from(`export function bind(env){
  const {interiors,activities,progression,paused,focus,careerContext,isSandbox,notify,clearInput}=env;
  ${startFunction}
 return beginMini;}`).toString('base64'));
for(const kind of ['noodle','stock']){
  const f=fixture(kind);
  const begin=bind({...f,paused:()=>false,focus:()=>f.ctx.pose,careerContext:()=>f.ctx,isSandbox:()=>false,notify(){},clearInput(){}});
  begin();assert.equal(f.progression.state.activity?.type,'work');
  const session=f.activities.snapshot().sessionId;
  begin();assert.equal(f.activities.snapshot().sessionId,session,'repeated Q retains the active playable session');
  assert.equal(f.progression.state.activity?.type,'work','repeated Q cannot silently cancel its paid shift');
  f.complete();assert(f.progression.finishShift(f.ctx,true).ok);
  assert.equal(f.progression.state.cash,1000+(kind==='noodle'?60:45));
}

for (const kind of ['noodle', 'stock']) {
  const f = fixture(kind), p = f.progression, reward = kind === 'noodle' ? 60 : 45;
  assert.equal(p.startShift(f.store.id, f.ctx).ok, false, 'a task must be active before starting paid work');
  assert(f.start().ok);
  assert.equal(p.state.activity.type, 'work');
  assert(Object.isFrozen(p.state.activity.station));
  assert.equal(p.startJob('crescent-parcel', f.ctx).ok, false, 'paid work excludes other jobs');
  assert.equal(p.startShift(f.store.id, f.ctx).ok, false, 'extra clicks cannot replace a paid session');
  for (let i = 0; i < 100; i++) p.update(10, f.ctx);
  assert.equal(p.state.cash, 1000, 'time alone never pays a shift');
  const runningSave = p.serialize();
  assert.equal(createProgression(map, runningSave).state.activity, null, 'active shifts are transient');
  f.complete();
  assert.equal(p.state.cash, 1000, 'terminal task waits for completion handoff');
  assert(p.finishShift(f.ctx, true).ok);
  assert.equal(p.state.cash, 1000 + reward);
  assert.equal(p.finishShift(f.ctx, true).ok, false, 'completion cannot pay twice');
  assert.equal(createProgression(map, p.serialize()).state.cash, 1000 + reward, 'shift cash uses the existing career save owner');
  assert(f.start().ok, 'a fresh playable session permits another paid shift');
  f.complete();
  assert(p.finishShift(f.ctx, true).ok);
  assert.equal(p.state.cash, 1000 + 2 * reward);
}
{
  const f = fixture(); assert(f.start().ok);
  assert.equal(f.progression.finishShift(f.ctx, true).ok, false, 'caller success cannot bypass the active task');
  f.complete();
  assert.equal(f.progression.finishShift(f.ctx, true).ok, false);
  assert.equal(f.progression.state.cash, 1000);
}
for (const extra of [{ sandbox: true }, { recovering: true }, { onFoot: false }, { wanted: 1 }, { respawnSerial: 1 }, { pose: { x: 9999, z: 9999 } }]) {
  const f = fixture(); assert(f.start().ok);
  f.progression.update(0, { ...f.ctx, ...extra });
  assert.equal(f.progression.state.activity, null, `invalid player context cancels: ${JSON.stringify(extra)}`);
  f.complete();
  assert.equal(f.progression.finishShift(f.ctx, true).ok, false);
  assert.equal(f.progression.state.cash, 1000);
}
for (const extra of [{ sandbox: true }, { recovering: true }, { onFoot: false }, { wanted: 1 }]) {
  const f = fixture(); assert(f.activities.start(f.station.id, f.ctx));
  assert.equal(f.progression.startShift(f.store.id, { ...f.ctx, ...extra }).ok, false, 'invalid player cannot join a shift');
}
for (const extra of [{ sandbox: true }, { recovering: true }, { wanted: 1 }, { respawnSerial: 1 }, { pose: { x: 9999, z: 9999 } }]) {
  const f = fixture(); assert(f.start().ok); f.complete();
  assert.equal(f.progression.finishShift({ ...f.ctx, ...extra }, true).ok, false, 'completion handoff rechecks the current player even without an update');
  assert.equal(f.progression.state.cash, 1000);
}
{
  const f = fixture(); assert(f.activities.start(f.station.id, { ...f.ctx, sandbox: true }));
  assert.equal(f.progression.startShift(f.store.id, f.ctx).ok, false, 'a sandbox session cannot become paid work after changing mode');
}
for (const reason of ['cancel', 'failure', 'leave', 'penalty', 'wrong-session', 'wrong-station', 'wrong-plan', 'failure-handoff']) {
  const f = fixture(), p = f.progression; assert(f.start().ok);
  if (reason === 'cancel') { f.activities.cancel(); p.cancelActivity(); }
  else if (reason === 'failure') { for (let i = 0; i < 3; i++) { f.tick(); f.tick({ up: true }); } }
  else if (reason === 'leave') f.interiors.leave({ ...f.ctx.pose });
  else if (reason === 'penalty') p.penalize();
  else if (reason === 'failure-handoff') f.complete();
  else {
    f.complete();
    const session = f.activities.snapshot();
    if (reason === 'wrong-session') session.sessionId++;
    if (reason === 'wrong-station') session.station.x++;
    if (reason === 'wrong-plan') session.planId += '-other';
    f.override({ plan: f.plan, session });
  }
  const before = p.state.cash;
  assert.equal(p.finishShift(f.ctx, reason !== 'failure-handoff').ok, false, `${reason} cannot pay`);
  assert.equal(p.state.cash, before);
}
{
  const f = fixture(); assert(f.activities.start(f.station.id, f.ctx));
  assert.equal(f.progression.startShift('kingston-gym', f.ctx).ok, false, 'fictional generic services cannot offer source-store work');
  const other = SERVICES.find(site => site.source && site.id !== f.store.id);
  assert.equal(f.progression.startShift(other.id, f.ctx).ok, false, 'shop identity must match active room');
  f.override({ plan: { ...f.plan }, session: f.activities.snapshot() });
  assert.equal(f.progression.startShift(f.store.id, f.ctx).ok, false, 'mutable caller plans cannot supply work stations');
}
{
  const f = fixture(); assert(f.start().ok); f.complete();
  f.override({ plan: Object.freeze({ ...f.plan }), session: f.activities.snapshot() });
  assert.equal(f.progression.finishShift(f.ctx, true).ok, false, 'a replacement room cannot claim the previous room session');
}
{
  const f = fixture();
  assert(f.progression.startJob('crescent-parcel', f.ctx).ok);
  assert(f.activities.start(f.station.id, f.ctx));
  assert.equal(f.progression.startShift(f.store.id, f.ctx).ok, false, 'existing jobs exclude paid shifts');
}

const drive = (pose, extra = {}) => context(pose, { onFoot: false, vehicle: { modelId: 'lantern', stolen: false }, ...extra });
for (const id of ['franklin-delivery', 'kennedy-delivery']) {
  const p = createProgression(map), job = p.jobs.find(item => item.id === id);
  assert.equal(job.type, 'delivery'); assert.equal(job.legitimate, true);
  for (const stage of job.stages.filter(item => item.roadId)) {
    const road = map.roads.find(item => item.id === stage.roadId);
    assert(road && road.points.some(([x, z]) => x === stage.x && z === stage.z), 'delivery marker is a pinned mapped street vertex');
  }
  for (const extra of [{ sandbox: true }, { recovering: true }, { wanted: 1 }, { vehicle: { modelId: 'lantern', stolen: true } }])
    assert.equal(p.startJob(id, drive(job.stages[0], extra)).ok, false);
  assert(p.startJob(id, drive(job.stages[0])).ok);
  p.update(1, drive(job.stages.at(-1))); assert.equal(p.state.activeJob.stage, 0, 'drop cannot bypass pickup');
  p.update(0, drive(job.stages[0])); assert.equal(p.state.activeJob.stage, 0, 'paused delivery cannot advance');
  p.update(1, drive(job.stages[0], { wanted: 1 })); assert.equal(p.state.activeJob.stage, 0);
  p.update(1, drive(job.stages[0], { vehicle: { modelId: 'lantern', stolen: true } })); assert.equal(p.state.activeJob.stage, 0);
  for (const stage of job.stages) p.update(1, drive(stage));
  assert.equal(p.state.cash, 1000 + job.reward);
  p.update(1, drive(job.stages.at(-1))); assert.equal(p.state.cash, 1000 + job.reward, 'delivery instance pays once');
  assert(p.startJob(id, drive(job.stages[0])).ok);
  p.update(job.time + 1, drive(job.stages[0])); assert.equal(p.state.activeJob, null);
  assert.equal(p.state.cash, 1000 + job.reward, 'expired delivery cannot pay');
  assert(p.startJob(id, drive(job.stages[0])).ok);
  p.update(1, drive(job.stages[0], { sandbox: true })); assert.equal(p.state.activeJob, null);
  const save = p.serialize();
  assert.deepEqual(createProgression(map, save).serialize(), save);
}
console.log('PASS paid work: sourced frozen shop stations; playable noodle/stock completion; no timed/fake/duplicate pay; session/room/mode/player guards; transient shifts and existing cash save; two ordered legal mapped-street deliveries.');
