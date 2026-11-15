import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createOrdnance, blastDamage, ORDNANCE_LIMITS } from '../Games/Capital Drive/ordnance.js';
import { createOrdnanceView } from '../Games/Capital Drive/ordnance-view.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const move = (item, dx, dz) => { item.x += dx; item.z += dz; return { blocked: false }; };
const actor = extra => ({ pose: { x: 0, y: 0, z: 0, yaw: 0 }, onFoot: true, ...extra });
const advance = (system, seconds) => { for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += .01) system.step(Math.min(.01, seconds - elapsed)); };
const fixture = options => {
  const debits = [];
  const system = createOrdnance({ moveProjectile: move, consumeThrow: (kind, ctx) => { debits.push({ kind, ctx }); return { ok: true }; }, ...options });
  return { system, debits };
};
{
  const { system, debits } = fixture();
  for (const context of [null, actor({ onFoot: false }), actor({ recovering: true }), actor({ activity: true }), actor({ passenger: true }),
    actor({ bus: true }), actor({ ride: true }), actor({ pose: { x: NaN, z: 0, yaw: 0 } }), actor({ aimYaw: Infinity }), actor({ interiorId: {} })])
    assert.equal(system.throw('grenade', context).ok, false);
  assert.equal(system.throw('firework', actor()).ok, false); assert.equal(debits.length, 0);
  assert.equal(createOrdnance({ moveProjectile: move }).throw('grenade', actor()).ok, false, 'missing inventory fails closed');
  assert.equal(createOrdnance({ consumeThrow: () => true }).throw('grenade', actor()).ok, false, 'missing physical sweep fails closed');
  const denied = fixture({ consumeThrow: () => ({ ok: false }), canThrow: () => true }).system;
  assert.equal(denied.throw('smoke', actor()).ok, false); assert.equal(denied.snapshot().projectiles.length, 0);
  assert.equal(fixture({ canThrow: () => false }).system.throw('grenade', actor({ sandbox: true })).ok, false);
  assert.equal(fixture({ heightAt: () => NaN }).system.throw('grenade', actor()).ok, false);
  assert.equal(fixture({ moveProjectile: () => ({ blocked: true }) }).system.throw('grenade', actor()).ok, false);
  for (const dt of [-1, NaN, Infinity]) assert.throws(() => system.step(dt), /dt/);
}
{
  const { system, debits } = fixture();
  for (let index = 0; index < 4; index++) assert(system.throw('grenade', actor({ aimYaw: Math.PI / 2 })).ok);
  assert.equal(debits.length, 4); assert.equal(system.throw('grenade', actor()).ok, false); assert.equal(debits.length, 4);
  const initial = system.snapshot(); assert(initial.projectiles.every(item => item.x < -.5 && Math.abs(item.z) < 1e-8 && item.y > 1));
  assert(Object.isFrozen(initial) && Object.isFrozen(initial.projectiles) && Object.isFrozen(initial.projectiles[0]));
  system.step(0); assert.deepEqual(system.snapshot(), initial); assert.deepEqual(system.drainEvents(), []);
  system.step(1000); assert.equal(system.snapshot().projectiles.length, 4, 'caller stalls are bounded to .25 active seconds');
  advance(system, 1.74); assert.equal(system.drainEvents().length, 0, 'fuse cannot detonate early');
  advance(system, .02);
  const events = system.drainEvents(); assert.equal(events.length, 4); assert.equal(system.snapshot().projectiles.length, 0);
  assert.equal(new Set(events.map(event => event.id)).size, 4);
  assert(events.every(event => event.type === 'explosion' && event.radius === 8 && event.maxDamage === 100 && [event.x, event.y, event.z].every(Number.isFinite)));
  advance(system, 4); assert.deepEqual(system.drainEvents(), [], 'each fuse emits exactly once');
  assert.equal(blastDamage(0), 100); assert.equal(blastDamage(4), 50); assert.equal(blastDamage(8), 0); assert.equal(blastDamage(9), 0);
  assert.equal(blastDamage(NaN), 0); assert.equal(blastDamage(-1), 0);
}
{
  const { system, debits } = fixture();
  for (let wave = 0; wave < 4; wave++) {
    for (let index = 0; index < 4; index++) assert(system.throw('grenade', actor()).ok);
    advance(system, 2.01);
  }
  assert.equal(system.throw('grenade', actor()).ok, false, 'undrained event capacity denies new throws before debit');
  assert.equal(debits.length, 16); assert.equal(system.drainEvents().length, 16, 'bounded event storage does not lose admitted fuses');
  assert(system.throw('grenade', actor()).ok);
}
{
  // Use the actual shared building sweep; a thrown item cannot tunnel through a wall.
  const source = { bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 }, roads: [],
    buildings: [{ id: 'wall', points: [[-10, -4], [10, -4], [10, -3.5], [-10, -3.5]], height: 8 }], spawn: { x: 50, z: 50, yaw: 0 } };
  const simulation = createSimulation(source, { trafficCount: 0 });
  const { system } = fixture({ moveProjectile: simulation.moveActor });
  assert(system.throw('grenade', actor()).ok); advance(system, 2.1);
  const [event] = system.drainEvents(); assert(event.z > -3.5 && event.z < -3, 'explosion remains on the thrower side');
  const blocked = actor({ pose: { x: 0, z: -3.1, yaw: 0 } });
  assert.equal(system.throw('grenade', blocked).ok, false, 'blocked launch sweep prevents consumption');
}
{
  const { system, debits } = fixture();
  for (let index = 0; index < 3; index++) assert(system.throw('smoke', actor({ interiorId: index === 0 ? 'room-a' : null })).ok);
  assert.equal(system.throw('smoke', actor()).ok, false); assert.equal(debits.length, 3);
  advance(system, 2.01); const snapshot = system.snapshot(); assert.equal(snapshot.clouds.length, 3);
  assert.equal(system.drainEvents().filter(event => event.type === 'smoke-deployed').length, 3);
  const cloud = snapshot.clouds[0], a = { x: cloud.x - 10, z: cloud.z }, b = { x: cloud.x + 10, z: cloud.z };
  assert(system.blocksSight(a, b, { interiorId: 'room-a' }));
  assert.equal(system.blocksSight(a, b, { interiorId: 'different-room' }), false);
  // Reset to retain just an indoor cloud at the same coordinates as outdoor bodies.
  system.reset(); assert(system.throw('smoke', actor({ interiorId: 'room-a' })).ok); advance(system, 2.01);
  assert.equal(system.drainEvents().length, 1);
  const indoor = system.snapshot().clouds[0], start = { x: indoor.x - 10, y: indoor.y + 1.6, z: indoor.z }, end = { x: indoor.x + 10, y: indoor.y + 1.6, z: indoor.z };
  assert.equal(system.blocksSight(start, end), false, 'indoor smoke cannot affect overlapping exterior space');
  assert(system.blocksSight(start, end, { interiorId: 'room-a' }));
  assert.equal(system.blocksSight({ ...start, interiorId: 'outside' }, end, { interiorId: 'room-a' }), false);
  assert.equal(system.blocksSight({ ...start, y: 10 }, { ...end, y: 10 }, { interiorId: 'room-a' }), false, 'high ray clears smoke');
  assert.equal(system.blocksSight({ ...start, z: indoor.z + 8 }, { ...end, z: indoor.z + 8 }, { interiorId: 'room-a' }), false);
  assert.equal(system.blocksSight({ ...start, x: NaN }, end, { interiorId: 'room-a' }), false);
  assert.equal(system.blocksSight({ ...start, y: NaN }, end, { interiorId: 'room-a' }), false);
  assert(system.blocksSight({ x: indoor.x, z: indoor.z }, { x: indoor.x, z: indoor.z }, { interiorId: 'room-a' }), 'zero-length sight in smoke is blocked');
  const beforePause = system.snapshot(); system.step(0); assert.deepEqual(system.snapshot(), beforePause);
  advance(system, 10); assert.equal(system.snapshot().clouds.length, 0); assert.equal(system.blocksSight(start, end, { interiorId: 'room-a' }), false);
  assert.deepEqual(system.drainEvents(), []); system.reset(); assert.deepEqual(system.snapshot(), { projectiles: [], clouds: [] });
}
{
  const { system, debits } = fixture(); assert(system.throw('smoke', actor({ sandbox: true })).ok); assert.equal(debits.length, 0);
  advance(system, 2.1); const scene = new THREE.Scene(), view = createOrdnanceView(scene, { quality: 'low' });
  const cloud = system.snapshot().clouds[0], focus = { x: cloud.x, z: cloud.z };
  for (let index = 0; index < 120; index++) view.update(system.snapshot(), focus);
  assert.equal(view.stats.clouds, 1); assert.equal(view.stats.geometryCount, 1); assert.equal(view.stats.materialCount, 3);
  assert.equal(view.stats.drawCalls, 1); assert.equal(view.stats.projectileCapacity, ORDNANCE_LIMITS.projectiles);
  assert.equal(view.stats.cloudCapacity, ORDNANCE_LIMITS.clouds);
  view.update(system.snapshot(), focus, { interiorId: 'unrelated-room' }); assert.equal(view.stats.clouds, 0);
  view.update(system.snapshot(), { x: 1000, z: 1000 }); assert.equal(view.stats.drawCalls, 0);
  view.dispose(); view.dispose(); assert.equal(view.stats.geometryCount, 0); assert.equal(view.stats.materialCount, 0); assert.equal(scene.children.length, 0);
}
console.log('Capital ordnance PASS: admission/debit, finite poses, 4/3 caps, arc/shared wall sweep, pause/bounded dt, exactly-once fuses, blast falloff, room-safe finite smoke sight, expiry and pooled view disposal');
