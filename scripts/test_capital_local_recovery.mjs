import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { applyMapExpansion, expansionPlaces } from '../Games/Capital Drive/map-expansion.js';
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(await json('canberra'), await json('canberra-north'));
const simulation = createSimulation(map, { trafficCount: 0 });
const progression = createProgression(map);
progression.state.completedJobs.push(progression.jobs[0].id);
const completed = [...progression.state.completedJobs];
let room = null, seat = null, callbacks = 0;
const events = [];
const game = createGameplay(map, simulation, { getInterior: () => room, passengerPose: () => seat,
  hasPistol: () => true, onEvent: event => events.push(event), onRespawn: reason => {
    callbacks++; progression.penalize(reason); room = null; seat = null;
  } });
const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) game.step(1 / 60); };
function recover(origin, mode = 'vehicle') {
  game.reset(); room = null; seat = null;
  simulation.teleport(map.spawn);
  if (mode === 'foot') { game.state.mode = 'foot'; Object.assign(game.state.actor, origin); }
  else if (mode === 'interior') { game.state.mode = 'foot'; Object.assign(game.state.actor, { x: 10, z: 10 }); room = { id: 'test-room', outside: origin }; }
  else if (mode === 'seat') seat = { ...origin };
  else simulation.teleport(origin);
  const expected = mode === 'vehicle' ? { ...simulation.player } : origin;
  const cash = progression.state.cash, before = callbacks, serial = game.state.respawnSerial;
  game.addAmmo(24); game.state.health = 0; game.step(1 / 60);
  assert(game.state.recovery); assert.equal(game.state.recovery.duration, 3.4);
  const captured = { ...game.state.recovery.origin };
  assert(Math.hypot(captured.x - expected.x, captured.z - expected.z) < .01);
  game.step(0); assert.equal(game.state.recovery.elapsed, 0, 'pause freezes recovery');
  // Moving the live seat/room after capture cannot redirect the delayed transfer.
  if (seat) seat = { x: -4200, z: 2700 };
  if (room) room = { ...room, outside: { x: -4200, z: 2700 } };
  tick(1.7); assert.equal(callbacks, before); tick(.2);
  assert.equal(callbacks, before + 1); assert.equal(game.state.respawnSerial, serial + 1);
  assert(Math.hypot(simulation.player.x - expected.x, simulation.player.z - expected.z) < 180, `${mode}: recovery stays local`);
  assert(Math.hypot(simulation.player.x + 4200, simulation.player.z - 2700) > 1000, 'no Woden transfer');
  assert(simulation.player.x >= map.bounds.minX && simulation.player.x <= map.bounds.maxX);
  assert(simulation.player.z >= map.bounds.minZ && simulation.player.z <= map.bounds.maxZ);
  assert(simulation.nearestRoad(simulation.player.x, simulation.player.z).distance < 140);
  assert.equal(game.state.health, 100); assert.equal(game.state.vehicleHealth, 100);
  assert.equal(game.state.weapon, 'unarmed'); assert.equal(game.getAmmo('pistol').ammo, 0);
  assert.equal(progression.state.cash, Math.max(0, cash - 250));
  assert.deepEqual(progression.state.completedJobs, completed);
  tick(1.6); assert.equal(game.state.recovery, null); assert.equal(callbacks, before + 1);
}
recover(map.spawn);
const civicRoad = map.roads.find(road => /London Circuit/i.test(road.name || ''));
assert(civicRoad, 'real Civic road fixture exists');
const civic = { x: civicRoad.points[0][0], z: civicRoad.points[0][1] };
recover(civic, 'foot');
const bridge = expansionPlaces(map).find(place => place.id === 'commonwealth-bridge');
assert(bridge); recover(bridge, 'seat'); recover(civic, 'interior');
recover(civic, 'foot');
assert.equal(events.filter(event => event.kind === 'respawn').length, callbacks);
game.reset({ sandbox: true }); game.state.health = 0; tick(.2); assert.equal(game.state.recovery, null);
game.reset({ sandbox: false }); game.state.health = 0; tick(.05); assert(game.state.recovery);
const beforeReset = callbacks; game.reset(); tick(4); assert.equal(callbacks, beforeReset, 'reset cancels pending transfer');
// Rejected placements try another mapped road through the same checked boundary.
const calls = [];
const fallbackGame = createGameplay(map, { ...simulation, teleport: point => {
  calls.push(point); return calls.length < 3 ? { ok: false } : simulation.teleport(point);
} });
fallbackGame.state.health = 0; for (let i = 0; i < 120; i++) fallbackGame.step(1 / 60);
assert(calls.length >= 3); assert.equal(fallbackGame.state.health, 100);
console.log('Capital local medical recovery: PASS (inner south, Civic, bridge/aircraft/passenger seat, interior exterior, repeat, pause, costs, retained jobs, reset/sandbox, checked fallback)');
