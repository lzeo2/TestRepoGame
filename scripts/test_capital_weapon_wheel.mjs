import assert from 'node:assert/strict';
import { createWeaponWheel, WHEEL_DEADZONE } from '../Games/Capital Drive/weapon-wheel.js';
import { WEAPONS } from '../Games/Capital Drive/weapons.js';

const ammo = (loaded, reserve) => ({ ammo: loaded, reserveAmmo: reserve });
const wheel = owned => createWeaponWheel({
  weapons: WEAPONS,
  ownedFor: () => owned,
  ammoFor: id => id === 'pistol' ? ammo(0, 0) : ammo(12, 30),
  currentFor: () => 'smg'
});

// Slots: unarmed first, owned in catalogue order, unarmed always present, capped at 8.
assert.deepEqual(wheel(['pistol']).snapshot().slots.map(s => s.id), ['unarmed', 'pistol']);
assert.deepEqual(wheel([]).snapshot().slots.map(s => s.id), ['unarmed']);
assert.equal(wheel([]).snapshot().slots[0].name, 'Fists');
const all = wheel(WEAPONS.map(w => w.id)).snapshot();
assert.deepEqual(all.slots.map(s => s.id), ['unarmed', ...WEAPONS.map(w => w.id)]);
assert.ok(all.slots.length <= 8, 'wheel caps at 8 slots');
assert.equal(all.highlighted, all.slots.findIndex(s => s.id === 'smg'), 'opens highlighted on the current weapon');

// Radial nearest-slot math at one probe angle per slot (7 slots here).
const full = wheel(WEAPONS.map(w => w.id));
full.open();
full.slotsLength = full.snapshot().slots.length;
for (let slot = 0; slot < full.slotsLength; slot++) {
  const angle = -Math.PI / 2 + slot * 2 * Math.PI / full.slotsLength;
  assert.equal(full.move({ x: Math.cos(angle) * .9, y: Math.sin(angle) * .9 }), slot,
    `probe angle for slot ${slot} highlights slot ${slot}`);
}

// Deadzone keeps the previous highlight.
full.move({ x: Math.cos(-Math.PI / 2) * .9, y: Math.sin(-Math.PI / 2) * .9 });
assert.equal(full.move({ x: .2, y: .2 }), 0, 'deadzone vector keeps the highlight');
assert.equal(full.move({ x: WHEEL_DEADZONE, y: 0 }), 0, 'exactly at the deadzone keeps the highlight');
assert.equal(full.move({ x: 0, y: 0 }), 0, 'no vector keeps the highlight');
assert.equal(full.move(), 0, 'missing vector keeps the highlight');

// select() returns the highlighted id and closes; select when closed returns null.
full.move({ x: 0, y: -1 });
assert.equal(full.select(), 'unarmed');
assert.equal(full.isOpen(), false);
assert.equal(full.select(), null);

// Ammo-dim state in the snapshot: unarmed always available, dry pool dimmed.
const dry = wheel(['pistol', 'shotgun']).snapshot();
assert.equal(dry.slots[0].available, true);
assert.equal(dry.slots[1].available, false, 'pistol with 0 rounds is dimmed');
assert.equal(dry.slots[2].available, true, 'shotgun with rounds stays active');
assert.deepEqual(dry.slots[1].ammo, ammo(0, 0));

// close() without selecting.
const closer = wheel(['pistol']);
closer.open();
assert.equal(closer.close(), false);
assert.equal(closer.isOpen(), false);

console.log('Capital weapon wheel: owned-list slots with unarmed, 8-slot cap, radial nearest-slot probes, deadzone, select/close, ammo-dim snapshot PASS');
