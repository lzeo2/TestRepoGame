import assert from 'node:assert/strict';
import { createJetpack } from '../Games/Capital Drive/jetpack.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  roads: [], buildings: [{ id: 'wall', points: [[5,-20],[7,-20],[7,20],[5,20]], height: 8 }],
  spawn: { x: -20, z: -20, yaw: 0 }, landmarks: [] };
const simulation = createSimulation(map, { trafficCount: 0 });
const game = createGameplay(map, simulation);
Object.assign(game.state, { mode: 'foot' });
Object.assign(game.state.actor, { x: 0, z: 0, jumpHeight: 0 });
const pack = createJetpack({ moveActor: (...args) => simulation.moveActor(...args), heightAt: () => 0 });
for (const context of [{ mission: true }, { job: true }, { activity: true }, { interiorId: 'room' },
  { drone: true }, { aircraft: true }, { micromobility: true }, { paused: true }, { launchAllowed: false }]) {
  assert.equal(pack.toggle(game.state, context), false, JSON.stringify(context));
}
// Passenger is a controller-derived property; use a separate body for denial.
assert.equal(pack.toggle({ ...game.state, passenger: true }), false);
assert.equal(pack.toggle(game.state), true);
const tick = (n, input = {}, ctx = {}) => {
  for (let i = 0; i < n; i++) {
    game.step(1/60, { externalFlight: pack.active, moveX: pack.active ? input.moveX : 0, jump: pack.active });
    pack.step(1/60, input, game.state, ctx);
  }
};
tick(90, { lift: 1, moveX: 1 });
assert(game.state.actor.jumpHeight > 5, 'personal flight rises above ordinary jump');
assert(game.state.actor.x <= 4.56, 'existing swept body movement retains building clearance while flying');
const hover = game.state.actor.jumpHeight;
tick(100);
assert(Math.abs(game.state.actor.jumpHeight-hover) < .6, 'external flight owns altitude without ordinary jump gravity');
const frozen = JSON.stringify({ body: game.state.actor, pack: pack.snapshot() });
pack.step(10, { lift: 1 }, game.state, { paused: true });
assert.equal(JSON.stringify({ body: game.state.actor, pack: pack.snapshot() }), frozen, 'paused supplied time is inert');
pack.step(NaN, {}, game.state);
assert.equal(pack.active, true);
assert.equal(pack.toggle(game.state), true);
assert.equal(pack.landing, true);
for (let i = 0; i < 300 && pack.active; i++) tick(1);
assert.equal(pack.active, false, 'manual toggle lands before relinquishing altitude');
assert.equal(game.state.actor.jumpHeight, 0);
assert(pack.charge < 100, 'landing does not refill charge');
tick(400);
assert.equal(pack.charge, 100, 'grounded rest recharges');
assert(pack.toggle(game.state)); tick(70, { lift: 1 });
const beforeX = game.state.actor.x;
tick(5, { moveX: -1, lift: 1 }, { mission: true });
assert(pack.landing, 'new restricted activity requests landing');
assert.equal(game.state.actor.x, beforeX, 'restricted descent cannot travel');
tick(250);
assert(!pack.active);
assert(pack.toggle(game.state)); tick(60, { lift: 1 });
pack.reset(game.state);
assert.equal(game.state.actor.jumpHeight, 0);
assert(!pack.active);
assert.equal(pack.charge, 100);
assert(pack.toggle(game.state)); tick(1000, { lift: 1 });
assert(!pack.active, 'empty charge triggers bounded safe landing');
assert.equal(game.state.actor.jumpHeight, 0);
const body = { mode: 'foot', health: 100, actor: { x: 0, z: 0, jumpHeight: 0 } };
let occupied = false;
const clearance = createJetpack({ heightAt: () => 0,
  moveActor: (actor, dx, dz) => { actor.x += dx; actor.z += dz; return { blocked: occupied }; },
  canOccupy: next => next.y <= 1.5 });
assert(clearance.toggle(body));
for (let i = 0; i < 120; i++) clearance.step(1/60, { lift: 1 }, body);
assert(body.actor.jumpHeight <= 1.5, 'optional vertical clearance prevents ceiling penetration');
occupied = true;
clearance.toggle(body);
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body);
assert(clearance.active && body.actor.jumpHeight > 0, 'occupied landing waits above the checked footprint');
occupied = false;
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body);
assert(!clearance.active && body.actor.jumpHeight === 0, 'landing finishes once shared clearance permits it');
console.log('PASS Capital Drive jetpack: launch guards, supplied time, shared collision, gravity ownership, safe descent, depletion and reset');
