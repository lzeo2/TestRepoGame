import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createStreetUI } from '../Games/Capital Drive/street-ui.js';

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const legacy = { version: 1, cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [], equipment: { pistol: true }, gear: { scanner: true, flares: 3 } };
const actor = (pose, extra = {}) => ({ pose: { ...pose }, onFoot: true, wanted: 0, vehicleHealth: 100, respawnSerial: 0,
  health: 100, weapon: 'pistol', aiming: false, sandbox: false, recovering: false, ...extra });
function fixture(save = legacy, extra = {}) {
  let employee, pedestrian;
  const p = createProgression(map, save, { interactiveRobbery: true,
    crimeTarget: id => id === employee?.id ? employee : id === pedestrian?.id ? pedestrian : null,
    robberyTarget: id => id === employee?.storeId ? employee : null, hasLineOfSight: () => true, ...extra });
  const site = p.services.find(site => site.robbery && site.source);
  employee = { id: 'employee:room:0', kind: 'employee', x: site.x + 1, z: site.z, storeId: site.id, roomId: 'room:0', health: 100, threatened: false };
  pedestrian = { id: 'ped:7', kind: 'pedestrian', x: site.x + 2, z: site.z, health: 100, threatened: false };
  const inside = actor(site, { interior: { storeId: site.id, roomId: 'room:0', atCounter: true } });
  const outside = actor(site);
  return { p, site, inside, outside, employee, pedestrian, removeEmployee() { employee = null; }, removePedestrian() { pedestrian = null; } };
}
const ticks = (p, ctx, count) => { for (let i = 0; i < count; i++) p.update(.05, ctx); };
const denied = (p, action) => { const before = p.serialize(); assert.equal(action().ok, false); assert.deepEqual(p.serialize(), before); };
{
  const f = fixture(), p = f.p;
  assert.deepEqual(p.state.muggingCooldowns, {}); assert.deepEqual(p.state.gear, legacy.gear); assert.deepEqual(p.state.equipment, legacy.equipment);
  assert.deepEqual(createProgression(map, p.serialize()).serialize(), p.serialize());
  const cooldowns = Object.fromEntries(Array.from({ length: 160 }, (_, id) => [`ped:${id}`, id % 181]));
  assert.deepEqual(createProgression(map, { ...legacy, muggingCooldowns: cooldowns }).state.muggingCooldowns, cooldowns);
  for (const value of [null, [], { 'ped:160': 1 }, { 'ped:-1': 1 }, { 'ped:01': 1 }, { 'ped:7': -1 }, { 'ped:7': 181 }, { 'ped:7': NaN }, { 'employee:0': 0 }])
    assert.throws(() => createProgression(map, { ...legacy, muggingCooldowns: value }), /mugging/);
  assert.throws(() => createProgression(map, { ...legacy, unknown: true }));
}
for (const punched of [false, true]) {
  const f = fixture(), { p, site } = f, ctx = { ...f.inside, weapon: punched ? 'unarmed' : 'pistol', wanted: 5 };
  f.employee.threatened = punched;
  assert.equal(p.robberyEligibility(site.id, ctx), ''); assert(p.startActivity(site.id, 'robbery', ctx).ok);
  assert.equal(p.state.activity.targetId, f.employee.id); assert.equal(p.state.activity.roomId, f.employee.roomId);
  assert.equal(p.state.activity.phase, 'intimidation'); p.update(0, ctx); assert.equal(p.state.activity.progress, 0);
  denied(p, () => p.startActivity(site.id, 'robbery', ctx)); denied(p, () => p.startMugging(f.pedestrian.id, f.outside));
  ticks(p, ctx, 21); assert.equal(p.state.activity.phase, 'emptying'); assert.equal(p.state.cash, 1000);
  ticks(p, ctx, 60); assert.equal(p.state.activity.phase, 'handover'); assert.equal(p.state.cash, 1000);
  ticks(p, ctx, 18); assert(p.state.activity); assert.equal(p.state.cash, 1000, 'no payout before final handover');
  ticks(p, ctx, 1); assert.equal(p.state.activity, null); assert.equal(p.state.cash, 1000 + site.robbery);
  assert.equal(p.state.robberyCooldowns[site.id], 180); ticks(p, ctx, 50); assert.equal(p.state.cash, 1000 + site.robbery);
  denied(p, () => p.startActivity(site.id, 'robbery', ctx));
  const loaded = createProgression(map, p.serialize(), { interactiveRobbery: true }); assert.equal(loaded.state.activity, null);
  assert.equal(p.drainEvents().filter(event => event.type === 'robbery-complete').length, 1);
}
for (const change of ['leave-room', 'wrong-room', 'wrong-store', 'dead-target', 'lost-target', 'lost-threat', 'far', 'respawn', 'recover', 'sandbox', 'car', 'invalid']) {
  const f = fixture(), { p } = f; f.employee.threatened = true;
  const ctx = { ...f.inside, weapon: 'unarmed' }; assert(p.startActivity(f.site.id, 'robbery', ctx).ok); ticks(p, ctx, 80);
  let next = { ...ctx };
  if (change === 'leave-room') next.interior = null;
  if (change === 'wrong-room') next.interior = { ...ctx.interior, roomId: 'other-room' };
  if (change === 'wrong-store') f.employee.storeId = 'other-store';
  if (change === 'dead-target') f.employee.health = 0;
  if (change === 'lost-target') f.removeEmployee();
  if (change === 'lost-threat') f.employee.threatened = false;
  if (change === 'far') next.pose = map.spawn;
  if (change === 'respawn') next.respawnSerial = 1;
  if (change === 'recover') next.recovering = true;
  if (change === 'sandbox') next.sandbox = true;
  if (change === 'car') next.onFoot = false;
  if (change === 'invalid') next.pose = null;
  p.update(0, next); assert.equal(p.state.activity, null, `${change} cancels before any terminal payout`);
  ticks(p, ctx, 120); assert.equal(p.state.cash, 1000); assert.equal(p.state.robberyCooldowns[f.site.id], undefined);
}
{
  const f=fixture(legacy,{servicePosition:site=>({x:site.x,z:site.z,radius:1.7})});
  f.employee.x=f.site.x-1.5;f.employee.threatened=true;
  const behind={...f.inside,pose:{x:f.site.x-2.5,z:f.site.z},weapon:'unarmed'};
  assert.equal(f.p.robberyEligibility(f.site.id,behind),'','employee demand uses its own bounded range behind the purchase bubble');
  assert(f.p.startActivity(f.site.id,'robbery',behind).ok);ticks(f.p,behind,100);
  assert.equal(f.p.state.cash,1000+f.site.robbery);
  const remote=fixture();remote.employee.x=remote.site.x-3;
  denied(remote.p,()=>remote.p.startActivity(remote.site.id,'robbery',{...remote.inside,pose:{x:remote.site.x-5,z:remote.site.z}}));
}
for (const change of ['fists', 'unowned-gun', 'missing-employee', 'wrong-kind', 'wrong-identity', 'wrong-room', 'wall', 'admission']) {
  const options = change === 'wall' ? { hasLineOfSight: () => false } : change === 'admission' ? { canUseService: () => false } : {};
  const f = fixture(change === 'unowned-gun' ? { ...legacy, equipment: { pistol: false } } : legacy, options);
  let ctx = f.inside;
  if (change === 'fists') ctx = { ...ctx, weapon: 'unarmed' };
  if (change === 'missing-employee') f.removeEmployee();
  if (change === 'wrong-kind') f.employee.kind = 'pedestrian';
  if (change === 'wrong-identity') f.employee.id = 'employee:other';
  if (change === 'wrong-room') f.employee.roomId = 'room:other';
  if (change !== 'wrong-identity') denied(f.p, () => f.p.startActivity(f.site.id, 'robbery', ctx));
  else {
    const p = createProgression(map, legacy, { interactiveRobbery: true, robberyTarget: () => ({ ...f.employee, id: 'employee:forged' }), crimeTarget: () => f.employee });
    denied(p, () => p.startActivity(f.site.id, 'robbery', ctx));
  }
}
for (const punched of [false, true]) {
  const f = fixture(), ctx = { ...f.outside, weapon: punched ? 'unarmed' : 'pistol', wanted: 5 };
  f.pedestrian.threatened = punched;
  assert(f.p.startMugging('ped:7', ctx).ok); assert.equal(f.p.state.activity.phase, 'intimidation');
  ticks(f.p, ctx, 21); assert.equal(f.p.state.activity.phase, 'emptying'); ticks(f.p, ctx, 40); assert.equal(f.p.state.activity.phase, 'handover');
  ticks(f.p, ctx, 18); assert.equal(f.p.state.cash, 1000); ticks(f.p, ctx, 1);
  const reward = f.p.state.cash - 1000; assert(reward >= 30 && reward <= 100); assert(Number.isInteger(reward));
  assert.equal(f.p.state.muggingCooldowns['ped:7'], 180); ticks(f.p, ctx, 100); assert.equal(f.p.state.cash, 1000 + reward);
  denied(f.p, () => f.p.startMugging('ped:7', ctx));
  assert.equal(f.p.drainEvents().filter(event => event.type === 'mugging-complete').length, 1);
  const loaded = createProgression(map, f.p.serialize(), { crimeTarget: () => f.pedestrian });
  denied(loaded, () => loaded.startMugging('ped:7', ctx));
  const repeat = fixture(); assert(repeat.p.startMugging('ped:7', repeat.outside).ok); ticks(repeat.p, repeat.outside, 80);
  assert.equal(repeat.p.state.cash - 1000, reward, 'target reward is deterministic and ignores caller amounts');
}
for (const change of ['interior', 'dead', 'lost', 'far', 'lost-threat', 'wall', 'sandbox', 'recover', 'respawn', 'cancel']) {
  let clear = true; const f = fixture(legacy, { hasLineOfSight: () => clear });
  f.pedestrian.threatened = true; const ctx = { ...f.outside, weapon: 'unarmed' };
  assert(f.p.startMugging('ped:7', ctx).ok); ticks(f.p, ctx, 60); let next = { ...ctx };
  if (change === 'interior') next.interior = f.inside.interior;
  if (change === 'dead') f.pedestrian.health = 0;
  if (change === 'lost') f.removePedestrian();
  if (change === 'far') next.pose = { x: 99999, z: 99999 };
  if (change === 'lost-threat') f.pedestrian.threatened = false;
  if (change === 'wall') clear = false;
  if (change === 'sandbox') next.sandbox = true;
  if (change === 'recover') next.recovering = true;
  if (change === 'respawn') next.respawnSerial = 1;
  if (change === 'cancel') f.p.cancelActivity(); else f.p.update(.05, next);
  assert.equal(f.p.state.activity, null); ticks(f.p, ctx, 100); assert.equal(f.p.state.cash, 1000); assert.deepEqual(f.p.state.muggingCooldowns, {});
}
{
  const f = fixture({ ...legacy, cash: 999999990 }); assert(f.p.startMugging('ped:7', f.outside).ok); ticks(f.p, f.outside, 80); assert.equal(f.p.state.cash, 1000000000);
  const saved = f.p.serialize(); saved.muggingCooldowns['ped:7'] = 0;
  const next = fixture(saved); assert(next.p.startMugging('ped:7', next.outside).ok);
  next.p.penalize(); assert.equal(next.p.state.activity, null); assert.equal(next.p.state.muggingCooldowns['ped:7'], 0);
}
{
  const f = fixture(); denied(f.p, () => f.p.startMugging('ped:7', f.inside)); denied(f.p, () => f.p.startMugging('ped:159', f.outside));
  assert(f.p.startJob('crescent-parcel', f.outside).ok); denied(f.p, () => f.p.startMugging('ped:7', f.outside));
}
{
  class Element {
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.textContent='';this.classList={add(){}};}
    append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;}
    setAttribute(){} addEventListener(type,handler){this.listeners[type]=handler;} removeEventListener(type){delete this.listeners[type];}
  }
  const list=new Element('div'),filter=new Element('select');filter.value='food';
  globalThis.document={getElementById:id=>id==='services-list'?list:id==='services-filter'?filter:null,createElement:tag=>new Element(tag)};
  const f=fixture(legacy,{servicePosition:site=>({x:site.x,z:site.z,radius:1.7})}),ctx={...f.inside,pose:{x:f.site.x-2.5,z:f.site.z},weapon:'unarmed'},state={mode:'foot',vehicle:{modelId:'lantern',color:'#e7e6df'},wanted:0,health:100,vehicleHealth:100,weapon:'unarmed',pursuit:'clear'};
  f.employee.x=f.site.x-1.5;
  const ui=createStreetUI({gameplay:{state,focus:()=>ctx.pose,getAmmo:()=>({reserveAmmo:0})},progression:f.p,simulation:{nearbyVehicles:()=>[]},
    vehicles:[],notify(){},openDialog(){},closeDialogs(){},saveCareer(){},isSandbox:()=>false,getContext:()=>ctx});
  const all=node=>[node,...node.children.flatMap(all)];
  const button=()=>all(list.children.find(entry=>entry.dataset.serviceId===f.site.id)).find(node=>node.dataset.serviceActivity==='robbery');
  ui.renderServices();assert.equal(button().disabled,true,'fists alone cannot enable a robbery');assert.match(button().dataset.reason,/owned firearm|confront/);
  f.employee.threatened=true;ui.renderServices();assert.equal(button().disabled,false,'only the actual recently punched employee enables a fist demand');
  button().listeners.click();assert.equal(f.p.state.activity.targetId,f.employee.id);assert.equal(f.p.state.activity.phase,'intimidation');
  ui.dispose();delete globalThis.document;
}
console.log('PASS hold-ups: strict legacy cooldowns; canonical live NPC/room/health/threat authority; gun and real-punch robbery/mugging phases; no early/duplicate/cancel/dead/leave/mode/recovery/respawn pay; deterministic bounded mugging reward; capped existing wallet and reload cooldowns.');
