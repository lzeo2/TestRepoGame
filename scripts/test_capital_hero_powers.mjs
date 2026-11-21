import assert from 'node:assert/strict';
import { createHeroPowers, HERO_POWERS } from '../Games/Capital Drive/hero-powers.js';
const foot = character => ({ campaign: true, character, health: 100, mode: 'foot', impactTime: 0 });
const drive = () => ({ ...foot('basement'), mode: 'vehicle', manualDriving: true });
const defaults = { footSpeed: 1, jump: 1, gunAttack: 1, reload: 1, engine: 1, handling: 1 };
const powers = createHeroPowers();
for (const id of ['student', 'corporate', 'basement']) {
  assert(Object.isFrozen(HERO_POWERS[id]));
  assert.deepEqual(powers.modifiers(id === 'basement' ? drive() : foot(id)), defaults);
}
assert.equal(powers.activate('student', foot('student')).ok, true);
assert.deepEqual(powers.modifiers(foot('student')), { ...defaults, footSpeed: 1.35, jump: 1.35 });
assert.deepEqual(powers.modifiers(foot('corporate')), defaults, 'a different hero cannot borrow the active ability');
assert.deepEqual(powers.modifiers({ ...foot('student'), mode: 'vehicle' }), defaults, 'on-foot boost never affects driving');
assert.equal(powers.activate('student', foot('student')).ok, false, 'held/repeated activation cannot refresh the timer');
const initial = powers.snapshot();
assert.equal(initial.remaining, 8); assert.equal(initial.cooldown, 40);
assert(Object.isFrozen(initial) && Object.isFrozen(initial.heroes) && Object.isFrozen(initial.heroes.student));
assert.throws(() => { initial.heroes.student.cooldown = 0; }, TypeError);
for (const dt of [0, -1, NaN, Infinity]) powers.step(dt, foot('corporate'));
powers.step(1, { ...foot('student'), paused: true });
assert.deepEqual(powers.snapshot(), initial, 'invalid/paused time freezes every cooldown and active state');
powers.step(2, foot('student'));
assert.equal(powers.snapshot().remaining, 6); assert.equal(powers.snapshot().cooldown, 38);
powers.step(.1, foot('corporate'));
assert.equal(powers.snapshot().activeCharacter, null, 'switching hero ends the old active power');
assert.equal(powers.snapshot().heroes.student.cooldown, 37.9, 'switching preserves the original hero cooldown');
assert.equal(powers.activate('corporate', foot('corporate')).ok, true);
assert.deepEqual(powers.modifiers(foot('corporate')), { ...defaults, gunAttack: .65, reload: .65 });
powers.step(.1, drive());
assert.equal(powers.activate('basement', drive()).ok, true);
assert.deepEqual(powers.modifiers(drive()), { ...defaults, engine: 1.25, handling: 1.25 });
assert.deepEqual(powers.modifiers({ ...drive(), manualDriving: false }), defaults, 'passive transport cannot receive vehicle boosts');
assert.equal(powers.activate('student', foot('student')).ok, false, 'cycling all three heroes cannot reset Kit cooldown');
powers.step(8, drive());
assert.equal(powers.snapshot().activeCharacter, null); assert.equal(powers.snapshot().remaining, 0);
assert.deepEqual(powers.modifiers(drive()), defaults, 'all multipliers return to normal after eight active seconds');
powers.step(40, drive());
assert(Object.values(powers.snapshot().heroes).every(hero => hero.cooldown === 0));
assert.equal(powers.activate('student', foot('student')).ok, true, 'hero can activate again after its own full cooldown');

for (const [id, context] of [['student', foot('student')], ['corporate', foot('corporate')], ['basement', drive()]]) {
  for (const extra of [{ campaign: false }, { character: 'other' }, { health: 0 }, { health: -1 }, { health: NaN },
    { health: Infinity }, { health: undefined }, { paused: true }, { protectedWork: true }, { cutscene: true },
    { miniGame: true }, { recovering: {} }, { passenger: true }, { impactTime: .1 }, { impactTime: NaN },
    { impactTime: -1 }, { mode: 'invalid' }]) {
    const p = createHeroPowers(), before = p.snapshot();
    assert.equal(p.activate(id, { ...context, ...extra }).ok, false, `denies ${id} ${Object.keys(extra)[0]}`);
    assert.deepEqual(p.snapshot(), before, 'denied activation consumes no cooldown');
  }
  const p = createHeroPowers(); p.activate(id, context); p.step(1, { ...context, recovering: true });
  assert.equal(p.snapshot().activeCharacter, null, 'recovery immediately ends active effects through the supplied clock');
  assert.equal(p.snapshot().heroes[id].cooldown, 39, 'interruption cannot refund the cooldown');
}
for (const id of [null, undefined, '', 'kit', 'rowan', 'milo', '__proto__', 'constructor']) {
  assert.equal(createHeroPowers().activate(id, foot(id)).ok, false, 'only the canonical campaign identity is admitted');
}
assert.equal(createHeroPowers().activate('student', undefined).ok, false);
assert.equal(createHeroPowers().activate('student', { ...foot('student'), interiorId: 'gym-room' }).ok, true,
  'ordinary indoor foot use remains permitted');
const immutableModifiers = createHeroPowers(); immutableModifiers.activate('student', foot('student'));
assert(Object.isFrozen(immutableModifiers.modifiers(foot('student'))));
assert.equal(createHeroPowers().activate('basement', { ...drive(), manualDriving: false }).ok, false);
assert.equal(createHeroPowers().activate('basement', foot('basement')).ok, false);
const input = foot('student'), unchanged = structuredClone(input), isolated = createHeroPowers();
isolated.activate('student', input); isolated.step(.2, input); isolated.modifiers(input);
assert.deepEqual(input, unchanged, 'context is read-only and cannot be used to grant health/ammo/career state');
assert(Object.values(isolated.modifiers(input)).every(Number.isFinite));
const cooldownBeforeCancel = isolated.snapshot().heroes.student.cooldown;
isolated.cancelActive();
assert.equal(isolated.snapshot().activeCharacter, null);
assert.equal(isolated.snapshot().remaining, 0);
assert.equal(isolated.snapshot().heroes.student.cooldown, cooldownBeforeCancel, 'explicit paused hero/mode switches retain cooldowns');
assert.equal(isolated.activate('student', input).ok, false, 'cancel cannot refund a power');
assert.deepEqual(isolated.modifiers(input), defaults);
isolated.resetSession();
assert.equal(isolated.snapshot().character, null); assert.equal(isolated.snapshot().activeCharacter, null);
assert(Object.values(isolated.snapshot().heroes).every(hero => hero.cooldown === 0));
assert.deepEqual(isolated.modifiers(input), defaults);
console.log('PASS three distinct hero powers, canonical identity/context guards, independent cooldowns, hero switching, supplied clock/pause, immutable snapshots and reset');
