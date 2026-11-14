import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load = async path => import(await moduleURL(new URL(path, import.meta.url)));
const { createGameplay } = await load('../Games/Capital Drive/gameplay.js');
const { createSimulation } = await load('../Games/Capital Drive/simulation.js');
const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  roads: [{ id: 'road', points: [[-400, 0], [400, 0]], nodes: [1, 2], width: 12, speed: 40 }],
  buildings: [], landmarks: [], spawn: { x: 0, z: 0, yaw: 0 } };
const dt = 1 / 60;
function fixture({ occupied = false, sandbox = false } = {}) {
  const simulation = createSimulation(map, { trafficCount: occupied ? 1 : 0 });
  if (occupied) Object.assign(simulation.traffic[0], { x: 8, z: 0, yaw: 0, speed: 0, active: true, modelId: 'relay', color: 0x123456 });
  else simulation.setParkedCars([{ id: 'parked:fixture', x: 8, z: 0, yaw: 0, modelId: 'relay', color: 0x123456 }]);
  const source = occupied ? simulation.traffic[0] : simulation.parkedCars[0];
  const stats = { claims: 0, stops: 0, strikes: 0, exits: [], changes: [], events: [] };
  const claim = simulation.claimVehicle, stop = simulation.requestVehicleStop;
  simulation.claimVehicle = id => { stats.claims++; return claim(id); };
  simulation.requestVehicleStop = (...args) => { stats.stops++; return stop(...args); };
  const game = createGameplay(map, simulation, { sandbox, hasPistol: () => true,
    pedestrians: { snapshot: () => [{ x: 4, z: 0, health: 100 }], strike: () => { stats.strikes++; return { hits: 0 }; } },
    onCarjacked: adult => stats.exits.push(adult), onVehicleChanged: car => stats.changes.push(car), onEvent: event => stats.events.push(event) });
  assert(game.interact()); Object.assign(game.state.actor, { x: 6, z: 0 });
  return { simulation, game, source, stats };
}
const tick = (f, seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) f.game.step(dt, input); };
function begin(f) { assert.equal(f.game.interact(), false); assert(f.game.state.carjacking); f.game.step(dt); }
function cue(f) {
  for (let frame = 0; frame < 60 && f.game.state.carjacking?.challenge?.phase !== 'cue'; frame++) f.game.step(dt);
  assert.equal(f.game.state.carjacking?.challenge?.phase, 'cue');
  return f.game.state.carjacking.challenge.expectedKey;
}
function pressCorrect(f) { f.game.step(dt, { challenge: { [cue(f)]: true } }); }
function complete(f) {
  for (let i = 0; i < 8 && f.game.state.carjacking; i++) pressCorrect(f);
  assert.equal(f.game.state.carjacking, null); assert.equal(f.game.state.mode, 'vehicle');
}
// Actual parked/traffic claims require eight cue presses; each succeeds and reports only once.
for (const occupied of [false, true]) {
  const f = fixture({ occupied }); begin(f);
  assert.equal(f.game.state.carjacking.challenge.sequence.length, 8);
  const snapshot = f.game.snapshot(); assert(Object.isFrozen(snapshot.carjacking.challenge.sequence));
  assert.throws(() => { snapshot.carjacking.challenge.sequence[0] = 'up'; });
  const paused = f.game.snapshot(); f.game.step(0, { challenge: { x: true }, moveX: 1, fire: true });
  assert.deepEqual(f.game.snapshot(), paused);
  const actor = { ...f.game.state.actor };
  f.game.addAmmo(24); f.game.setWeapon('pistol');
  f.game.step(dt, { moveX: 1, moveZ: 1, sprint: true, jump: true, aim: true, fire: true, melee: true });
  assert.deepEqual(f.game.state.actor, actor); assert.equal(f.stats.strikes, 0); assert.equal(f.game.state.ammo, 12);
  pressCorrect(f); assert.equal(f.stats.claims, 0); assert.equal(f.game.state.carjacking.progress, 1 / 8);
  for (let i = 1; i < 8; i++) pressCorrect(f);
  assert.equal(f.game.state.mode, 'vehicle'); assert.equal(f.stats.claims, 1); assert.equal(f.source.active, false);
  assert.equal(f.game.state.vehicle.modelId, 'relay'); assert.equal(f.game.state.vehicle.color, 0x123456);
  assert.equal(f.game.state.vehicle.stolen, true); assert.equal(f.stats.changes.length, 1);
  assert.equal(f.stats.events.filter(event => event.offence === 'vehicle theft').length, 1);
  assert.equal(f.stats.exits.length, occupied ? 1 : 0);
  if (occupied) {
    assert(f.stats.stops > 20); assert.equal(f.stats.exits[0].x, 10);
    assert.equal(f.stats.exits[0].personId, f.source.id, 'driver identity survives claim and exit event ID');
  }
  tick(f, 3); assert.equal(f.stats.claims, 1); assert.equal(f.stats.exits.length, occupied ? 1 : 0);
  assert(f.game.interact()); assert(f.game.interact(), 'current player car re-entry stays instant');
  assert.equal(f.game.state.carjacking, null); assert.equal(f.stats.claims, 2);
}
// A driver's identity can differ from its vehicle and must be captured before claim.
{
  const f = fixture({ occupied: true });
  f.source.personId = 'fixture-driver';
  begin(f); complete(f);
  assert.equal(f.stats.exits[0].personId, 'fixture-driver');
  assert.notEqual(f.stats.exits[0].id, f.stats.exits[0].personId);
}
// Taking B leaves the previously controlled A unlocked for instant, lawful re-entry.
for (const occupied of [false, true]) {
  const f = fixture({ occupied });
  const original = { x: f.simulation.player.x, z: f.simulation.player.z,
    modelId: f.simulation.player.modelId, color: f.simulation.player.color };
  begin(f); complete(f);
  assert.equal(f.stats.claims, 1);
  const theftReports = f.stats.events.filter(event => event.offence === 'vehicle theft').length;
  const displaced = f.stats.exits.length;
  assert.equal(theftReports, 1);
  assert(f.game.interact(), 'leave the newly taken B through normal interaction');
  Object.assign(f.game.state.actor, { x: original.x + 2, z: original.z });
  const prior = f.simulation.nearbyVehicles(f.game.state.actor.x, f.game.state.actor.z, 7)
    .find(car => car.id.startsWith('abandoned:') && car.x === original.x && car.z === original.z);
  assert(prior, 'actual simulation retains the prior player car A');
  assert.equal(prior.unlocked, true, 'previously controlled cars expose their unlocked state');
  assert(f.game.interact(), 'normal interaction re-enters prior A without another challenge');
  assert.equal(f.game.state.mode, 'vehicle'); assert.equal(f.game.state.carjacking, null);
  assert.equal(f.stats.claims, 2);
  assert.equal(f.simulation.player.x, original.x); assert.equal(f.simulation.player.z, original.z);
  assert.equal(f.game.state.vehicle.modelId, original.modelId); assert.equal(f.game.state.vehicle.color, original.color);
  assert.equal(f.game.state.vehicle.stolen, false);
  assert.equal(f.stats.events.filter(event => event.offence === 'vehicle theft').length, theftReports,
    'reclaiming prior A never reports another theft');
  assert.equal(f.stats.exits.length, displaced, 'prior A has no driver to displace');
}
// Waiting has its own eight-second limit and never contributes unlock progress.
{
  const f = fixture({ occupied: true }); f.source.speed = 4; begin(f); tick(f, 7.4);
  assert.equal(f.stats.claims, 0); assert.equal(f.game.state.carjacking.challenge, null); assert(f.stats.stops > 400);
  f.source.speed = 0; f.game.step(dt); complete(f);
  assert.equal(f.stats.claims, 1, 'an almost-eight-second wait still permits a full key challenge');
}
{
  const f = fixture({ occupied: true }); f.source.speed = 4; begin(f); tick(f, 8.2);
  assert.equal(f.game.state.carjacking, null); assert.equal(f.stats.claims, 0);
}
// Neither elapsed time nor wrong-key presses can take either type of car.
for (const occupied of [false, true]) {
  const late = fixture({ occupied }); begin(late); tick(late, 5);
  assert.equal(late.game.state.carjacking, null); assert.equal(late.stats.claims, 0); assert.equal(late.game.state.wanted, 0);
  const wrong = fixture({ occupied }); begin(wrong);
  for (let i = 0; i < 2; i++) {
    const key = cue(wrong), bad = ['x', 'y', 'up'].find(value => value !== key);
    wrong.game.step(dt, { challenge: { [bad]: true } });
  }
  assert.equal(wrong.game.state.carjacking, null); assert.equal(wrong.stats.claims, 0);
}
// A final correct press cannot override lost visibility, distance, motion, death, cancellation or mode.
for (const reason of ['lost', 'far', 'moving', 'occluded', 'cancel', 'recovery', 'mode']) {
  const f = fixture(); begin(f);
  for (let i = 0; i < 7; i++) pressCorrect(f);
  const finalKey = cue(f);
  if (reason === 'lost') f.source.active = false;
  if (reason === 'far') f.source.x = 12;
  if (reason === 'moving') f.source.speed = 1;
  if (reason === 'occluded') f.simulation.hasLineOfSight = () => false;
  if (reason === 'cancel') { assert(f.game.cancelCarjacking('test cancel')); assert.equal(f.game.cancelCarjacking(), false); }
  if (reason === 'recovery') f.game.state.health = 0;
  if (reason === 'mode') f.game.state.sandbox = true;
  f.game.step(dt, { challenge: { [finalKey]: true } });
  assert.equal(f.game.state.carjacking, null, reason); assert.equal(f.stats.claims, 0, reason); assert.equal(f.stats.exits.length, 0);
  tick(f, 1); assert.equal(f.stats.claims, 0, `${reason} cannot complete later`);
}
// A refused simulation claim cannot displace an adult or report a theft.
{
  const f = fixture({ occupied: true });
  f.simulation.claimVehicle = () => { f.stats.claims++; return { ok: false, reason: 'vehicle-limit' }; };
  begin(f);
  for (let i = 0; i < 8; i++) pressCorrect(f);
  assert.equal(f.game.state.carjacking, null); assert.equal(f.game.state.mode, 'foot');
  assert.equal(f.stats.claims, 1); assert.equal(f.stats.exits.length, 0); assert.equal(f.game.state.wanted, 0);
  tick(f, 2); assert.equal(f.stats.claims, 1);
}
// Reset discards partial sessions/events; retry starts at zero and uses fresh actual input.
{
  const f = fixture(); begin(f); pressCorrect(f); const old = f.game.state.carjacking.challenge;
  f.game.reset(); assert.equal(f.game.state.carjacking, null); assert(f.game.interact());
  Object.assign(f.game.state.actor, { x: 6, z: 0 }); begin(f);
  assert.equal(f.game.state.carjacking.progress, 0); assert.notEqual(f.game.state.carjacking.challenge.sessionId, old.sessionId);
  complete(f); assert.equal(f.stats.claims, 1);
}
{
  const f = fixture({ sandbox: true }); begin(f); complete(f);
  assert.equal(f.game.state.wanted, 0); assert.equal(f.stats.events.filter(event => event.offence === 'vehicle theft').length, 0);
}
console.log('Capital car theft: actual parked/occupied claims, eight cue presses, independent stop wait, input lock, pause, mistakes/timeouts, final-target guards, cancel/reset/recovery, current/prior-car re-entry and sandbox PASS');
