import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAircraft } from '../Games/Capital Drive/aircraft.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createPolice } from '../Games/Capital Drive/police.js';
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`); assert(start >= 0);
  let at = source.indexOf('{', start), depth = 1, end = at + 1;
  while (depth) { depth += (source[end] === '{') - (source[end] === '}'); end++; }
  return source.slice(start, end);
}
const map = { bounds: { minX: -2000, minZ: -2000, maxX: 2000, maxZ: 2000 }, roads: [], buildings: [],
  spawn: { x: 800, z: 800, yaw: 0 }, landmarks: [{ id: 'canberra-airport', x: 0, z: 0 }],
  airport: { surfaces: [{ id: 'apron', kind: 'apron', closed: true, points: [[-600, -600], [600, -600], [600, 600], [-600, 600]] }] } };
const simulation = createSimulation(map, { trafficCount: 0 }), aircraft = createAircraft(map, simulation, { heightAt: () => 10 });
const gameplay = createGameplay(map, simulation, { passengerPose: () => aircraft.seatPose, isPiloting: () => !!aircraft.active,
  playerAltitude: () => aircraft.active ? aircraft.active.y - 10 : 0, hasWeapon: () => true });
gameplay.reset({ onFoot: true, startPose: { x: 700, z: 700, yaw: 0 } });
const notifications = [], crimes = [], originalReport = gameplay.reportOffence;
gameplay.reportOffence = (...args) => { crimes.push(args); return originalReport(...args); };
const env = { aircraft, simulation, gameplay, started: true, focus: () => gameplay.focus(), world: { heightAt: () => 10 },
  keys: new Set(), touch: new Set(), miniKeys: new Set(), moveStick: { snapshot: () => ({ x: 0, y: 0 }) },
  THREE: { MathUtils: { clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) } },
  isSandbox: () => false, interiors: { active: null }, campaign: { state: { active: null } }, progression: { state: { activeJob: null, activity: null } },
  activities: { snapshot: () => ({ active: false }) }, rentalHack: { snapshot: () => ({ active: false }) },
  micromobility: { snapshot: () => ({ active: false }) }, rideService: null, buses: null, cutscenes: { snapshot: () => ({ active: false }) },
  developerReturn: null, aircraftRescueHealth:null, cameraReady: true, footCameraYaw: 0, heroPowers: { cancelActive() {} },
  clearInput() { env.keys.clear(); env.miniKeys.clear(); env.touch.clear(); }, notify: text => notifications.push(text) };
const controls = new Map(); env.$ = id => { if (!controls.has(id)) controls.set(id, {}); return controls.get(id); };
env.closeDialogs = () => {};
const names = ['aircraftContext', 'aircraftInput', 'aircraftAltitude', 'aircraftObstacles', 'handleAircraftEvents', 'updateAircraft', 'interactAircraft', 'streetChallenge', 'input', 'miniInput', 'refreshAircraftRescue', 'recover'];
const api = Function('env', `with(env){${names.map(extract).join('\n')};return {${names.join(',')}};}`)(env);
const jet = aircraft.snapshot().planes[0]; assert(jet);
Object.assign(gameplay.state.actor, { x: jet.x + Math.cos(jet.yaw) * 2.1 - Math.sin(jet.yaw) * 1.3,
  z: jet.z - Math.sin(jet.yaw) * 2.1 - Math.cos(jet.yaw) * 1.3 });
for (const [owner, key, value] of [[env.campaign.state, 'active', {}], [env.progression.state, 'activeJob', {}], [env.interiors, 'active', {}], [gameplay.state, 'health', 0]]) {
  const previous = owner[key]; owner[key] = value;
  assert.equal(api.aircraftContext().valid, false); api.interactAircraft(); assert.equal(aircraft.challenge.active, false);
  owner[key] = previous;
}
assert(api.interactAircraft()); assert(aircraft.challenge.active); assert.equal(api.streetChallenge().sequence.length, 8);
assert(api.interactAircraft()); assert.equal(aircraft.challenge.active, false, 'E cancels the actual jet challenge first');
assert(api.interactAircraft());
for (let cue = 0; cue < 8; cue++) {
  for (let i = 0; i < 40 && aircraft.challenge.phase !== 'cue'; i++) api.updateAircraft(.02);
  assert.equal(aircraft.challenge.phase, 'cue');
  env.miniKeys.add(aircraft.challenge.expectedKey); api.updateAircraft(.02); env.miniKeys.clear();
  if (cue < 7) api.updateAircraft(.02);
}
assert(aircraft.active); assert(gameplay.state.passenger); assert.equal(gameplay.state.mode, 'foot');
assert.equal(crimes.length, 1); assert.equal(crimes[0][1], 3); assert.equal(gameplay.state.wanted, 3);
assert.equal(gameplay.focus().y, aircraft.active.y + 1.55, 'focus carries the absolute live pilot seat height');
const parkedCar = { ...simulation.player }, health = gameplay.state.health;
assert.equal(gameplay.setWeapon('pistol'), false); assert.equal(gameplay.reload(), false);
env.keys.add('KeyW'); env.keys.add('KeyA'); env.keys.add('Space');
assert.deepEqual(api.aircraftInput(), { throttle: 1, turn: -1, climb: true, descend: false, challenge: { x: false, y: false, up: false } });
env.keys.delete('KeyA');
for (let i = 0; i < 500; i++) { api.updateAircraft(1 / 60); gameplay.step(1 / 60); }
assert(aircraft.active.y > 11, 'ordinary controller keys fly the actual jet above its ground');
assert(api.aircraftAltitude() > 1); assert.deepEqual(simulation.player, parkedCar, 'the parked player car is not repossessed by flight');
assert.equal(gameplay.state.health, health); assert.equal(crimes.length, 1, 'normal flight cannot replay the theft event');
assert.equal(api.aircraftObstacles().some(plane => plane.id === aircraft.active.id), false, 'airborne jets leave the ground collision list');
assert(api.interactAircraft()); assert(aircraft.active, 'E refuses an airborne exit');
assert(notifications.some(text => /Land and stop/.test(text)));
api.refreshAircraftRescue(); assert.equal(env.$('recover-button').hidden, true, 'a healthy career jet does not offer rescue');
const flyingHealth = gameplay.state.health; api.recover(); assert.equal(gameplay.state.health, flyingHealth, 'ordinary flight cannot request an early recovery');
// Land through the same controller, then apply its actual checked exit pose.
env.keys.clear();
for (let i = 0; i < 1800 && aircraft.active.airborne; i++) {
  env.keys.clear(); env.keys.add('ShiftLeft');
  if (aircraft.active.speed > 38) env.keys.add('KeyS'); else if (aircraft.active.speed < 30) env.keys.add('KeyW');
  api.updateAircraft(1 / 60);
}
assert.equal(aircraft.active.airborne, false); assert.equal(aircraft.active.wrecked, false);
env.keys.clear(); env.keys.add('KeyS');
for (let i = 0; i < 600 && aircraft.active.speed > .5; i++) api.updateAircraft(1 / 60);
assert(api.interactAircraft()); assert.equal(aircraft.active, null); assert.equal(gameplay.state.passenger, false);
assert.equal(gameplay.state.mode, 'foot'); assert.equal(gameplay.state.wanted, 3); assert.equal(gameplay.state.health, flyingHealth);
const rescueBody = { ...gameplay.state.actor }, rescueCar = { ...simulation.player };
env.aircraft = { active: { wrecked: true } };
api.refreshAircraftRescue(); assert.equal(env.$('recover-button').hidden, false); assert.equal(env.$('recover-button').textContent, 'Request rescue');
api.recover(); assert.equal(env.aircraftRescueHealth,gameplay.state.vehicleHealth); assert.equal(gameplay.state.health, 0); assert.deepEqual(gameplay.state.actor, rescueBody); assert.deepEqual(simulation.player, rescueCar);
gameplay.step(1 / 60); assert(gameplay.state.recovery, 'career rescue enters the existing timed medical transition');
env.aircraft = null; api.refreshAircraftRescue(); assert.equal(env.$('recover-button').hidden, true);
env.isSandbox = () => true; api.refreshAircraftRescue(); assert.equal(env.$('recover-button').hidden, false); assert.equal(env.$('recover-button').textContent, 'Return to road');
env.isSandbox = () => false;
const progress = createProgression(map), context = { pose: { x: 0, z: 0 }, onFoot: false, vehicle: { stolen: false },
  vehicleHealth: 100, wanted: 3, respawnSerial: 0, sandbox: false, recovering: false, passenger: true };
assert.equal(progress.startJob(progress.jobs[0].id, context).ok, false, 'a passenger cannot start a paid job through another handler');
assert.equal(progress.startJob(progress.jobs[0].id, { ...context, passenger: false }).ok, true, 'ordinary wanted jobs remain permitted');
assert(source.includes("if(!aircraft?.active)campaign.update(1/60,careerContext())"));
assert(source.includes("if (!isSandbox()&&!aircraft?.active) progression.update(1 / 60, careerContext())"));
assert(source.includes('desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+7+orbitHeight'));
assert(source.includes("document.body.classList.toggle('piloting',!!aircraft?.active)"));

function policeAtAltitude(altitude) {
  const sim = createSimulation(map, { trafficCount: 0 });
  const unit = { id: 'cop', x: 0, z: 10, yaw: 0, speed: 0, health: 100, mode: 'foot', fireCooldown: 0 };
  const state = { police: [unit], wanted: 3, sandbox: false, mode: 'foot', health: 100, weapon: 'unarmed', heat: 100 };
  const police = createPolice(sim, { playerAltitude: () => altitude });
  police.report({ x: 0, z: 0 }); police.step(1 / 60, state, { x: 0, z: 0, speed: 40 });
  return { unit, state, events: police.drainEvents() };
}
const low = policeAtAltitude(20), high = policeAtAltitude(80), distant = policeAtAltitude(160);
assert(low.events.some(event => event.targetId === 'player'), 'a low aircraft remains in actual police firing range');
assert.equal(high.events.some(event => event.targetId === 'player'), false, 'ground shots cannot reach an aircraft beyond their 3D range');
assert.equal(high.unit.seesPlayer, true, 'higher flight can remain visible and wanted without receiving impossible shots');
assert.equal(high.state.wanted, 3); assert.equal(distant.unit.seesPlayer, false, 'sight has its own physical 3D distance');
console.log('Capital aircraft controller: actual eight-cue theft, cancellation/authority guards, native-key flight, live altitude/passenger camera, parked-car preservation, paid-job denial and real police 3D range PASS');
