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
const owned = { owned: true };
const pack = createJetpack({ moveActor: (...args) => simulation.moveActor(...args), heightAt: () => 0 });
for (const context of [{ mission: true }, { job: true }, { activity: true }, { interiorId: 'room' },
  { drone: true }, { aircraft: true }, { micromobility: true }, { paused: true }, { launchAllowed: false }]) {
  assert.equal(pack.toggle(game.state, { ...owned, ...context }), false, JSON.stringify(context));
}
// Passenger is a controller-derived property; use a separate body for denial.
assert.equal(pack.toggle({ ...game.state, passenger: true }), false);
assert.equal(pack.toggle(game.state), false, 'ownership is required');
assert.equal(pack.toggle(game.state, owned), true);
const tick = (n, input = {}, ctx = {}) => {
  for (let i = 0; i < n; i++) {
    game.step(1/60, { externalFlight: pack.active, moveX: pack.active ? input.moveX : 0, jump: pack.active });
    pack.step(1/60, input, game.state, { ...owned, ...ctx });
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
pack.step(NaN, {}, game.state, owned);
assert.equal(pack.active, true);
assert.equal(pack.toggle(game.state, owned), true);
assert.equal(pack.landing, true);
for (let i = 0; i < 300 && pack.active; i++) tick(1);
assert.equal(pack.active, false, 'manual toggle lands before relinquishing altitude');
assert.equal(game.state.actor.jumpHeight, 0);
assert(pack.charge < 100, 'landing does not refill charge');
tick(1200);
assert.equal(pack.charge, 100, 'grounded rest recharges');
assert(pack.toggle(game.state, owned)); tick(70, { lift: 1 });
const beforeX = game.state.actor.x;
tick(5, { moveX: -1, lift: 1 }, { mission: true });
assert(pack.landing, 'new restricted activity requests landing');
assert.equal(game.state.actor.x, beforeX, 'restricted descent cannot travel');
tick(250);
assert(!pack.active);
assert(pack.toggle(game.state, owned)); tick(60, { lift: 1 });
pack.reset(game.state);
assert.equal(game.state.actor.jumpHeight, 0);
assert(!pack.active);
assert.equal(pack.charge, 100);
assert(pack.toggle(game.state, owned)); tick(5000, { lift: 1 });
assert(!pack.active, 'empty charge triggers bounded safe landing');
assert.equal(game.state.actor.jumpHeight, 0);
const body = { mode: 'foot', health: 100, actor: { x: 0, z: 0, jumpHeight: 0 } };
let occupied = false;
const clearance = createJetpack({ heightAt: () => 0,
  moveActor: (actor, dx, dz) => { actor.x += dx; actor.z += dz; return { blocked: occupied }; },
  canOccupy: next => next.y <= 1.5 });
assert(clearance.toggle(body, owned));
for (let i = 0; i < 120; i++) clearance.step(1/60, { lift: 1 }, body, owned);
assert(body.actor.jumpHeight <= 1.5, 'optional vertical clearance prevents ceiling penetration');
occupied = true;
clearance.toggle(body, owned);
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body, owned);
assert(clearance.active && body.actor.jumpHeight > 0, 'occupied landing waits above the checked footprint');
occupied = false;
for (let i = 0; i < 120; i++) clearance.step(1/60, {}, body, owned);
assert(!clearance.active && body.actor.jumpHeight === 0, 'landing finishes once shared clearance permits it');
// Long-flight tuning must retain inertia, fuel cost and ownership authority.
const traveller = { mode: 'foot', health: 100, actor: { x: 0, z: 0, jumpHeight: 0 } };
const rangePack = createJetpack({ heightAt: () => 0,
  moveActor: (actor, dx, dz) => { actor.x += dx; actor.z += dz; return { blocked: false }; } });
assert(rangePack.toggle(traveller, owned));
rangePack.step(1/60, { moveX: 1, lift: 1 }, traveller, owned);
assert(rangePack.snapshot().horizontalSpeed > 0 && rangePack.snapshot().horizontalSpeed < 1, 'horizontal thrust accelerates rather than instantly reaching cruise');
for (let i = 0; i < 120; i++) rangePack.step(1/60, { moveX: 1, lift: 1 }, traveller, owned);
const cruise = rangePack.snapshot().horizontalSpeed;
assert(cruise > 10 && cruise <= 11);
const beforeBrake = traveller.actor.x;
rangePack.step(1/60, {}, traveller, owned);
assert(traveller.actor.x > beforeBrake && rangePack.snapshot().horizontalSpeed < cruise, 'released controls brake residual horizontal momentum');
for (let i = 0; i < 60*45; i++) rangePack.step(1/60, { moveX: 1 }, traveller, owned);
assert(rangePack.active && rangePack.charge > 35 && traveller.actor.x > 480, 'sustained forty-five-second cruise has useful range and remaining fuel');
assert.equal(rangePack.chargeFraction, rangePack.charge / rangePack.capacity);
assert.equal(rangePack.leanX, rangePack.snapshot().leanX, 'view getters share the actual flight owner');
const revokedX = traveller.actor.x;
rangePack.step(1/60, { moveX: 1 }, traveller, { owned: false });
assert(rangePack.landing && rangePack.snapshot().reason === 'restricted');
assert.equal(traveller.actor.x, revokedX, 'revoked ownership cannot keep travelling');
rangePack.reset(traveller);
assert.equal(rangePack.leanX, 0); assert.equal(rangePack.verticalSpeed, 0);
console.log('PASS Capital Drive jetpack: launch guards, supplied time, shared collision, gravity ownership, safe descent, depletion and reset');
