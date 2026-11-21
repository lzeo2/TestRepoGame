import assert from 'node:assert/strict';
import { planSafehouseReturn } from '../Games/Capital Drive/safehouse-recovery.js';

const house = (id, x, z, yaw = 0) => ({ id, type: 'house', name: id, x, z, yaw });
const near = house('Near house', 100, 15, Math.PI / 2);
const far = house('Far house', 190, 20);
const story = house('Story house', 12, -10);
const unowned = house('Unowned', 101, 16);
const shop = { ...house('Shop', 100, 20), type: 'shop' };
const entries = [far, story, near, unowned, shop];
const storyHome = { roomId: story.id, name: 'Milo’s safehouse', approach: { x: 12, z: -12 } };
const findEntry = pose => entries.filter(entry => Math.hypot(entry.x - pose.x, entry.z - pose.z) < 2.8)
  .sort((a, b) => Math.hypot(a.x - pose.x, a.z - pose.z) - Math.hypot(b.x - pose.x, b.z - pose.z))[0];
const defaults = {
  entries, storyHome, findEntry, origin: { x: 101, z: 17 },
  isOwned: id => [near.id, far.id, shop.id].includes(id), canStand: () => true,
};
const target = planSafehouseReturn(defaults);
assert.equal(target.entry, near);
assert.equal(target.name, near.name);
assert(target.approach.x < near.x, 'outward approach follows the mapped door heading');
const blocked = planSafehouseReturn({ ...defaults, canStand: pose => pose.x > 180 });
assert.equal(blocked.entry, far, 'blocked favourite yields to a clear owned house');
assert.deepEqual(planSafehouseReturn({ ...defaults, isOwned: () => false }), {
  entry: story, approach: { ...storyHome.approach, yaw: story.yaw }, name: storyHome.name,
});
assert.equal(planSafehouseReturn({ ...defaults, isOwned: () => false, storyHome: null }), null);
assert.equal(planSafehouseReturn({ ...defaults, canStand: () => false }), null);
assert.equal(planSafehouseReturn({ ...defaults, findEntry: () => unowned }), null, 'never bypasses the actual entry check');
assert.deepEqual(entries, [far, story, near, unowned, shop]);
console.log('PASS medical return chooses nearest clear owned house, checks exact doors, and falls back to the story safehouse');
