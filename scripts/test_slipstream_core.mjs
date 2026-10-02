import assert from 'node:assert/strict';
import * as core from '../Games/Slipstream Borough/core.js';
import { CARS } from '../assets/car-arcade/fleet.js';

const { freshProfile, validateProfile, startRun, stepRun, settleRun, buyCar, selectCar, upgradeCar, upgradeCost, applyCode, carStats } = core;
const neutral = { steer: 0, throttle: 0, brake: 0 };
const drive = { steer: 0, throttle: 1, brake: 0 };
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function fixture(mode = 'cutup') { return startRun(freshProfile(), mode).run; }
function npc(id, x, distance, speed = 0) { return { id, carId: 'pip', x, distance, speed, passed: false, hit: false, finishTime: null }; }
function finite(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value && typeof value === 'object') for (const v of Object.values(value)) finite(v);
}
function runToEnd(run, controller, limit = 4802) {
  let r = run, maxNPC = 0;
  for (let i = 0; i < limit && r.status === 'running'; i++) {
    r = stepRun(r, controller(r), 0.05);
    maxNPC = Math.max(maxNPC, r.traffic.length + r.police.length + r.rivals.length);
    assert.ok(r.traffic.length <= 7 && r.police.length <= 2 && r.rivals.length <= 3 && maxNPC <= 12);
    finite(r);
  }
  assert.notEqual(r.status, 'running');
  return r;
}
// Deterministic source-only controller, NOT human/native or natural progression evidence.
const centerDrive = r => ({ ...drive, steer: Math.abs(r.x) < 0.06 ? 0 : Math.sign(-r.x) });

check('exact exports / fresh profile / canonical reload', () => {
  assert.deepEqual(Object.keys(core).sort(), ['freshProfile', 'validateProfile', 'startRun', 'stepRun', 'settleRun', 'buyCar', 'selectCar', 'upgradeCar', 'upgradeCost', 'applyCode', 'carStats'].sort());
  const p = freshProfile(); assert.equal(p.cash, 0); assert.equal(p.testMode, false); assert.deepEqual(p.owned, ['bricklet']);
  assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))), p);
  assert.deepEqual(validateProfile({ ...p, upgrades: {} }), p);
  const harder = { ...p, level: 12 }; assert.equal(validateProfile(JSON.parse(JSON.stringify(harder))).level, 12);
  assert.equal(startRun(harder, 'race').run.finishDistance, 3000);
});
check('hostile descriptors rejected before getter access', () => {
  let calls = 0;
  const p = freshProfile(); Object.defineProperty(p, 'cash', { get() { calls++; return 1e9; } });
  assert.throws(() => validateProfile(p));
  const ids = ['bricklet']; Object.defineProperty(ids, 0, { get() { calls++; return 'bricklet'; } });
  assert.throws(() => validateProfile({ ...freshProfile(), owned: ids }));
  const run = fixture(); Object.defineProperty(run, 'stats', { get() { calls++; return {}; } });
  assert.throws(() => stepRun(run, neutral, 0.05));
  assert.equal(calls, 0);
});
check('invalid profiles / params / bounds', () => {
  for (const p of [null, [], { ...freshProfile(), cash: -1 }, { ...freshProfile(), cash: Infinity }, { ...freshProfile(), level: 13 }, { ...freshProfile(), extra: true }, { ...freshProfile(), owned: ['bricklet', 'bricklet'] }, { ...freshProfile(), selected: 'sunray' }, { ...freshProfile(), upgrades: { pip: { engine: 0, handling: 0, armor: 0 } } }, { ...freshProfile(), testMode: true }]) assert.throws(() => validateProfile(p));
  for (const dt of [-1, 0.051, NaN, Infinity, '0.01']) assert.throws(() => stepRun(fixture(), neutral, dt));
  for (const input of [null, {}, { ...neutral, steer: -2 }, { ...neutral, throttle: -1 }, { ...neutral, brake: 2 }, { ...neutral, extra: 1 }]) assert.throws(() => stepRun(fixture(), input, 0.05));
  assert.throws(() => startRun(freshProfile(), 'demo'));
  assert.throws(() => applyCode(freshProfile(), 'x'.repeat(65)));
  assert.throws(() => buyCar(freshProfile(), '__proto__'));
});
check('copied deterministic finite stepping / ID stability / zero dt', () => {
  const initial = fixture('race'), snapshot = structuredClone(initial);
  let a = initial, b = structuredClone(initial);
  for (let i = 0; i < 250; i++) { a = stepRun(a, centerDrive(a), 0.02); b = stepRun(b, centerDrive(b), 0.02); }
  assert.deepEqual(a, b); assert.deepEqual(initial, snapshot); assert.equal(a.id, initial.id); finite(a);
  assert.deepEqual(stepRun(a, neutral, 0), a); assert.notEqual(stepRun(a, neutral, 0), a);
});
check('normal atomic purchases / performance upgrades / reset', () => {
  const p = freshProfile(); assert.throws(() => buyCar(p, 'pip')); assert.throws(() => selectCar(p, 'pip')); assert.throws(() => upgradeCar(p, 'bricklet', 'engine'));
  const funded = { ...p, cash: 10000 }; // Synthetic economy fixture, not earned funds.
  const bought = buyCar(funded, 'pip'); assert.equal(bought.cash, 9100); assert.equal(funded.cash, 10000); assert.throws(() => buyCar(bought, 'pip'));
  assert.equal(selectCar(bought, 'pip').selected, 'pip');
  let upgraded = funded;
  for (const kind of ['engine', 'handling', 'armor']) {
    const price = upgradeCost(upgraded, 'bricklet', kind), cash = upgraded.cash;
    upgraded = upgradeCar(upgraded, 'bricklet', kind);
    assert.equal(cash - upgraded.cash, price);
  }
  assert.equal(upgradeCost(upgraded, 'bricklet', 'engine'), 1000);
  assert.throws(() => upgradeCost({ ...funded, upgrades: { bricklet: { engine: 5, handling: 0, armor: 0 } } }, 'bricklet', 'engine'));
  assert.throws(() => upgradeCost(funded, 'pip', 'engine'));
  assert.throws(() => upgradeCost(funded, 'bricklet', 'unknown'));
  assert.equal(upgraded.cash, 9250);
  const before = carStats(funded), after = carStats(upgraded);
  for (const key of ['speed', 'acceleration', 'handling', 'toughness']) assert.ok(after[key] > before[key]);
  assert.ok(Object.isFrozen(after)); assert.equal(stepRun(startRun(upgraded, 'cutup').run, drive, 0.05).speed > stepRun(fixture(), drive, 0.05).speed, true);
  assert.equal(freshProfile().cash, 0); assert.equal(freshProfile().level, 0);
});
check('collision damages body / cooldown / armor / no reward', () => {
  const r = fixture(); r.traffic = [npc(1, r.x, 1)]; r.nextEntity = 2; r.speed = 20;
  const hit = stepRun(r, drive, 0.05); assert.ok(hit.hp < 100); assert.equal(hit.collisions, 1); assert.equal(hit.earnings, 0);
  assert.equal(stepRun(hit, drive, 0.05).hp, hit.hp); assert.equal(hit.nearMisses, 0);
  let p = { ...freshProfile(), cash: 1000 }; p = upgradeCar(p, 'bricklet', 'armor');
  const armored = startRun(p, 'cutup').run; armored.speed = 20; armored.traffic = [npc(1, armored.x, 1)]; armored.nextEntity = 2;
  assert.ok(stepRun(armored, drive, 0.05).hp > hit.hp);
});
check('near miss only once after passing / no collision farming', () => {
  const r = fixture(); r.distance = 100; r.elapsed = 5; r.score = 200; r.speed = 20; r.traffic = [npc(1, r.x + 2, 95.8)]; r.nextEntity = 2;
  const passed = stepRun(r, drive, 0.05); assert.equal(passed.nearMisses, 1); assert.equal(passed.traffic[0].passed, true);
  assert.equal(stepRun(passed, drive, 0.05).nearMisses, 1); assert.equal(passed.earnings, 0);
  r.traffic[0].hit = true; assert.equal(stepRun(r, drive, 0.05).nearMisses, 0);
});
check('real police approach / contact / containment bust', () => {
  let r = fixture(); r.distance = 400; r.elapsed = 20; r.score = 800;
  r = stepRun(r, neutral, 0.05); assert.equal(r.police.length, 1);
  const initialGap = r.distance - r.police[0].distance;
  for (let i = 0; i < 80; i++) r = stepRun(r, neutral, 0.05);
  assert.ok(Math.abs(r.police[0].distance - r.distance) < initialGap);
  r = runToEnd(r, () => neutral); assert.equal(r.status, 'busted'); assert.ok(r.arrest === 3 || r.hp === 0); assert.ok(r.collisions > 0);
});
check('three independent moving rivals finish by distance / loser / timeout', () => {
  let r = fixture('race');
  for (let i = 0; i < 1800; i++) r = stepRun(r, neutral, 0.05);
  assert.equal(r.rivals.length, 3); assert.ok(r.rivals.every(e => e.distance === r.finishDistance && e.finishTime !== null));
  assert.equal(new Set(r.rivals.map(e => e.finishTime)).size, 3); assert.equal(r.place, 4);
  const late = runToEnd(r, centerDrive); assert.equal(late.status, 'finished'); assert.equal(late.place, 4);
  assert.equal(runToEnd(fixture('race'), () => neutral).status, 'busted');
});
let raceResult, escapeResult;
check('starter race and escape deterministic controller fixtures / bounded NPCs', () => {
  raceResult = runToEnd(fixture('race'), centerDrive); escapeResult = runToEnd(fixture(), centerDrive);
  assert.equal(raceResult.status, 'finished'); assert.equal(raceResult.place, 1); assert.equal(escapeResult.status, 'escaped');
  console.log(`STATS starter race ${raceResult.elapsed.toFixed(2)}s place=${raceResult.place} hp=${raceResult.hp} cash=${raceResult.earnings}; escape ${escapeResult.elapsed.toFixed(2)}s hp=${escapeResult.hp} cash=${escapeResult.earnings}`);
});
check('reserved current results / one-shot settlement / escalation / no frame payout', () => {
  const p = startRun(freshProfile(), 'race').profile;
  assert.throws(() => settleRun(freshProfile(), raceResult)); assert.throws(() => settleRun(p, fixture('race')));
  const banked = settleRun(p, raceResult); assert.equal(banked.cash, raceResult.earnings); assert.equal(banked.level, 1); assert.equal(banked.best, raceResult.score);
  assert.throws(() => settleRun(banked, raceResult)); assert.deepEqual(stepRun(raceResult, drive, 0.05), raceResult);
  const newer = startRun(p, 'race').profile; assert.throws(() => settleRun(newer, raceResult));
  assert.throws(() => settleRun(p, { ...raceResult, earnings: 1e9 }));
  assert.throws(() => stepRun({ ...fixture(), id: -1 }, drive, 0.05));
  assert.throws(() => stepRun({ ...fixture(), hp: 0 }, drive, 0.05));
  assert.throws(() => stepRun({ ...fixture(), distance: 100, score: 200 }, drive, 0.05));
  assert.throws(() => stepRun({ ...raceResult, place: 2 }, drive, 0.05));
  assert.equal(settleRun(startRun(freshProfile(), 'cutup').profile, escapeResult).level, 1);
});
check('separate cheat fixtures / persistent all16 / inexhaustible spending', () => {
  const p = freshProfile(); assert.deepEqual(applyCode(p, 'wrong'), p); assert.notEqual(applyCode(p, 'wrong'), p);
  let cheated = applyCode(p, '  TaNaYr '); assert.equal(cheated.cash, 1e9); assert.equal(cheated.owned.length, 16); assert.equal(cheated.testMode, true);
  cheated = validateProfile(JSON.parse(JSON.stringify(cheated)));
  for (const { id } of CARS) for (const kind of ['engine', 'handling', 'armor']) {
    for (let level = 0; level < 5; level++) cheated = upgradeCar(cheated, id, kind);
    assert.throws(() => upgradeCar(cheated, id, kind));
  }
  assert.equal(cheated.cash, 1e9); assert.equal(freshProfile().testMode, false);
  const started = startRun(applyCode(freshProfile(), 'tanayr'), 'race');
  assert.equal(settleRun(started.profile, raceResult).cash, 1e9);
});
console.log(`PASS ${checks} Slipstream core groups; synthetic/controller/cheat evidence only, no native natural-progression claim.`);
