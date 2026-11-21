import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAircraft } from '../Games/Capital Drive/aircraft.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createPolice } from '../Games/Capital Drive/police.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyDefenceDepot } from '../Games/Capital Drive/defence-depot.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { BY_ID } from '../assets/car-arcade/fleet.js';
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
const env = { burglary:{snapshot:()=>({active:false})},droneActive: false, aircraft, simulation, gameplay, started: true, focus: () => gameplay.focus(), world: { heightAt: () => 10 },
  keys: new Set(), touch: new Set(), miniKeys: new Set(), moveStick: { snapshot: () => ({ x: 0, y: 0 }) },
  THREE: { MathUtils: { clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) } },
  isSandbox: () => false, interiors: { active: null }, campaign: { state: { active: null } }, progression: { state: { activeJob: null, activity: null } },
  activities: { snapshot: () => ({ active: false }) }, rentalHack: { snapshot: () => ({ active: false }) },
  micromobility: { snapshot: () => ({ active: false }) }, rideService: null, buses: null, cutscenes: { snapshot: () => ({ active: false }) },
  developerReturn: null, jetpack:null, watercraft:null, aircraftRescueHealth:null, cameraReady: true, footCameraYaw: 0, heroPowers: { cancelActive() {} },
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
env.campaign.state.active={aviation:true};
assert(api.aircraftContext().valid,'the designated aviation chapter permits boarding');
env.campaign.state.active=null;
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
assert(source.includes("if(!aircraft?.active||campaign.state.active?.aviation===true)campaign.update(1/60,careerContext())"));
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

// Reproduce the native failure: map search retains arbitrary car yaw. A marker
// at the jet door parked that car under the wing and prevented every taxi step.
const data = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url)));
const airportMap = applyDefenceDepot(applyAirport(applyMapExpansion(await data('canberra'), await data('canberra-north')), await data('airport')));
airportMap.barriers=[...airportMap.defenceDepot.fences,...airportMap.defenceDepot.vehicleBarriers];
const terrain = createTerrainSampler(airportMap), airportSim = createSimulation(airportMap, { trafficCount: 0, isOnBridge: terrain.isOnBridge });
const airportJets = createAircraft(airportMap, airportSim, { heightAt: terrain.heightAt });
const parkingFor = Function('env', `with(env){${extract('aircraftStandParking')};return aircraftStandParking;}`)({ aircraft: airportJets, simulation: airportSim });
const depotRotor=airportJets.snapshot().planes.find(plane=>plane.kind==='helicopter');
assert(depotRotor?.depot && parkingFor(depotRotor),'the marked depot pad admits its own helicopter and checked arrival parking');
const airportGame = createGameplay(airportMap, airportSim);
let parkingCases = 0;
for (const id of ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch']) for (const standIndex of [0, 1]) {
  airportJets.reset(); airportSim.setPlayerVehicle({ modelId: id });
  const planes = airportJets.snapshot().planes, plane = planes[standIndex];
  airportSim.setExternalVehicles(planes.map(p => ({ ...p, width: 4 })));
  const parking = parkingFor(plane); assert(parking, `${id}: stand ${standIndex} has checked parking`);
  for (const yaw of [-3.00713, 0, .7, Math.PI / 2]) {
    airportSim.player.yaw = yaw;
    assert(airportSim.teleport(parking).ok);
    assert(airportSim.canOccupy(airportSim.player, { ignoreId: 'player' }));
    for (const other of planes) assert(Math.hypot(airportSim.player.x - other.x, airportSim.player.z - other.z) >
      Math.hypot(10, 9) / 2 + Math.hypot(BY_ID[id].length + .08, BY_ID[id].width + .024) / 2, 'the complete car clears the jet fuselage and nine-metre wings at every arrival yaw');
  }
  airportSim.player.yaw = -3.00713; airportSim.teleport(parking); airportGame.reset({ sandbox: true });
  assert(airportGame.interact(), 'normal E can leave the actually parked car');
  const foot = { ...airportGame.state.actor }, target = { x: plane.x + Math.cos(plane.yaw) * 3.2 - Math.sin(plane.yaw) * 1.3,
    z: plane.z - Math.sin(plane.yaw) * 3.2 - Math.cos(plane.yaw) * 1.3, yaw: plane.yaw };
  let approach = null;
  for (const detour of [0, 6, -6, 10, -10]) {
    const walker = { ...foot }, waypoint = { x: foot.x - Math.sin(plane.yaw) * detour, z: foot.z - Math.cos(plane.yaw) * detour };
    const lateral = { x: target.x - Math.sin(plane.yaw) * detour, z: target.z - Math.cos(plane.yaw) * detour };
    const path = detour ? [waypoint, lateral, target] : [target];
    let clear = true;
    for (const point of path) {
      for(let step=0;step<120&&Math.hypot(walker.x-point.x,walker.z-point.z)>.01;step++){
        const dx=point.x-walker.x,dz=point.z-walker.z,scale=Math.min(1,.35/Math.hypot(dx,dz));
        if(airportSim.moveActor(walker,dx*scale,dz*scale,.45).blocked){clear=false;break;}
      }
      if(!clear||Math.hypot(walker.x-point.x,walker.z-point.z)>.01){clear=false;break;}
    }
    if (clear) { approach = walker; break; }
  }
  assert(approach && airportJets.nearest(approach)?.id === plane.id, `${id}: short real swept foot approach reaches the unchanged jet door`);
  const context = { pose: approach, onFoot: true, valid: true, sandbox: true };
  assert(airportJets.interact(context).challenge);
  for (let cue = 0; cue < 8; cue++) {
    for (let i = 0; i < 40 && airportJets.challenge.phase !== 'cue'; i++) airportJets.step(.02, {}, context);
    airportJets.step(.02, { challenge: { [airportJets.challenge.expectedKey]: true } }, context);
    if (cue < 7) airportJets.step(.02, {}, context);
  }
  const parked = { ...airportSim.player }, start = { ...airportJets.active };
  assert(start && start.id === plane.id);
  for (let i = 0; i < 1000 && airportJets.active.altitude < 2; i++) airportJets.step(1 / 60, { throttle: 1, climb: true }, { ...context, onFoot: false });
  assert(airportJets.active.altitude >= 2 && !airportJets.active.wrecked, `${id}: the car parked by the map marker cannot block takeoff`);
  assert(Math.hypot(airportJets.active.x - start.x, airportJets.active.z - start.z) > 20);
  assert.deepEqual(airportSim.player, parked, 'fixing the stand never moves the parked player car during flight');
  parkingCases++;
}
assert.equal(parkingCases, 12);
const canOccupy = airportSim.canOccupy; airportSim.canOccupy = () => false;
assert.equal(parkingFor(airportJets.snapshot().planes[0]), null, 'no unsafe marker is published when every bounded parking candidate is blocked');
airportSim.canOccupy = canOccupy;
console.log('Capital jet stand parking: both actual airport stands × six fleet bodies × four arrival yaws, checked short foot entry and twelve real takeoffs PASS');
