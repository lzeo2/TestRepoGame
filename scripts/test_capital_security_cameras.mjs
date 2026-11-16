import assert from 'node:assert/strict';
import { createSecurityCameras } from '../Games/Capital Drive/security-cameras.js';
import { createSecurityCamerasView } from '../Games/Capital Drive/security-cameras-view.js';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
const location = { id: 'shop', x: 0, z: 0, yaw: 0, interiorId: null };
const player = { x: 0, z: -10 };
const context = { player, wanted: 0, interiorId: null };
const receipt = serial => ({ serial, ...player, interiorId: null, kind: 'shot', level: 1 });
let rays = 0, clear = true;
const make = (locations = [location]) => createSecurityCameras(locations, { heightAt: () => 2, hasLineOfSight: (a, b) => {
  rays++; assert.equal(a.y, 5); assert(Number.isFinite(b.y)); return clear;
} });
for (const change of [{}, { wanted: 2, player: { x: 0, z: 10 } }, { wanted: 2, player: { x: 0, z: -41 } },
  { wanted: 2, player: { x: 30, z: -10 } }, { wanted: 2, interiorId: 'room' }, { wanted: 2, paused: true }]) {
  const c = make(); rays = 0;
  for (let i = 0; i < 600; i++) c.step(1 / 60, { ...context, ...change });
  assert.equal(rays, 0); assert.deepEqual(c.drainEvents(), []);
}
const c = make(Array.from({ length: 20 }, (_, i) => ({ ...location, id: `shop${i}` })));
assert.equal(c.snapshot().length, 6); assert(Object.isFrozen(c.snapshot()[0]));
assert(c.reportCrime(receipt(1))); c.step(.1, context);
assert.equal(c.drainEvents().filter(e => e.type === 'crime-spotted').length, 1);
assert.equal(c.reportCrime(receipt(1)), false); c.step(.5, context); assert.deepEqual(c.drainEvents(), []);
const covered = make(); clear = false; rays = 0; covered.reportCrime(receipt(2));
for (let i = 0; i < 120; i++) covered.step(1 / 60, { ...context, wanted: 2 });
assert(rays <= 5); assert.deepEqual(covered.drainEvents(), []);
clear = true; covered.step(.4, context); assert.equal(covered.drainEvents()[0].type, 'crime-spotted');
const expired = make(); expired.reportCrime(receipt(1)); expired.step(12.01, context); assert.deepEqual(expired.drainEvents(), []);
const frozen = make(); frozen.reportCrime(receipt(1)); frozen.step(100, { ...context, paused: true }); frozen.step(.1, context);
assert.equal(frozen.drainEvents()[0].type, 'crime-spotted');
const wanted = make(Array.from({ length: 6 }, (_, i) => ({ ...location, id: `s${i}` })));
rays = 0;
for (let i = 0; i < 600; i++) wanted.step(1 / 60, { ...context, wanted: 2 });
const sightings = wanted.drainEvents(); assert(sightings.length <= 5); assert(sightings.every(e => e.type === 'sighting')); assert(rays <= 5);
const disabled = make(); disabled.setEnabled('shop', false); disabled.reportCrime(receipt(1)); disabled.step(.5, context); assert.deepEqual(disabled.drainEvents(), []);
assert.equal(disabled.hitByShot('shop', Infinity).hits, 0); assert.equal(disabled.hitByShot('shop', 100, { interiorId: 'room' }).hits, 0);
assert.equal(disabled.hitByShot('shop', 100, { interiorId: null }).destroyed, true); assert.equal(disabled.shotTargets().length, 0);
disabled.setEnabled('shop', true); disabled.step(.5, context); assert.deepEqual(disabled.drainEvents(), []);
const indoor = make([{ ...location, interiorId: 'room' }]); indoor.reportCrime(receipt(1)); indoor.step(.5, context); assert.deepEqual(indoor.drainEvents(), []);
indoor.reportCrime({ ...receipt(2), interiorId: 'room' }); indoor.step(.5, { ...context, interiorId: 'room' }); assert.equal(indoor.drainEvents()[0].type, 'crime-spotted');
indoor.remove('shop'); assert.equal(indoor.snapshot().length, 0); indoor.dispose(); indoor.dispose(); assert.equal(indoor.reportCrime(receipt(3)), false);
assert.throws(() => c.step(NaN, context));
const scene = new THREE.Scene(), view = createSecurityCamerasView(scene);
view.update(c.snapshot(), player); assert.equal(scene.children.length, 1); assert.equal(scene.children[0].children[0].isLight, undefined);
view.update(c.snapshot(), { x: 1000, z: 1000 });
assert(scene.children[0].children.every(mesh => mesh.visible === false));
view.dispose(); view.dispose(); assert.equal(scene.children.length, 0);
console.log('PASS security cameras: finite FOV/range/rooms, zero lawful/far/behind LOS, cover and supplied-time budgets, fresh crime dedup, wanted rate, damage/removal and pooled disposal');
