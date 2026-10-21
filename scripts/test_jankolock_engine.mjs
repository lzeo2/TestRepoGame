import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as engine from '../Games/Jankolock/engine.js';
import { ARENA, statsFor } from '../Games/Jankolock/data.js';

// Unit fixtures only: instrument an isolated module copy, never the browser engine.
// Real two-round proof below uses the unmodified public API and input alone.
const source = (await readFile(new URL('../Games/Jankolock/engine.js', import.meta.url), 'utf8'))
  .replace("'./data.js'", JSON.stringify(new URL('../Games/Jankolock/data.js', import.meta.url).href));
const fixture = await import(`data:text/javascript;base64,${Buffer.from(source + `
export const inspectFixture = handle => cores.get(handle);
export { moveActor, clearLine, tickCapture, damageActor, tickBullets };
`).toString('base64')}`);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function isolated(hero = 'courier') {
  const handle = fixture.createMatch(hero);
  fixture.startMatch(handle);
  const s = fixture.inspectFixture(handle);
  for (const a of s.actors) { a.alive = false; a.respawn = 999; a.invulnerable = 0; }
  s.actors[0].alive = true;
  return { handle, s, player: s.actors[0] };
}

// FIXTURE: swept actor/dash, sliding, actor circles, LOS, bullet-before-target ordering.
{
  const { s, player } = isolated();
  Object.assign(player, { x: 200, y: 170 });
  fixture.moveActor(s, player, 180, 0);
  close(player.x, 235 - 180e-7);
  assert.equal(fixture.clearLine({ x: 200, y: 170 }, { x: 380, y: 170 }), false);
  fixture.moveActor(s, player, -50, 30);
  assert.ok(player.x < 200 && player.y > 190, 'can leave a wall contact');
  Object.assign(player, { x: 200, y: 300 });
  const target = s.actors[2];
  Object.assign(target, { alive: true, x: 300, y: 300 });
  fixture.moveActor(s, player, 180, 0);
  close(player.x, 270 - 180e-7);
  Object.assign(player, { x: 200, y: 170 });
  Object.assign(target, { x: 380, y: 170 });
  s.bullets = [{ x: 200, y: 170, px: 200, py: 170, vx: 10000, vy: 0, life: 1, team: 0, ownerId: 0, damage: 500 }];
  fixture.tickBullets(s, 0.05);
  assert.equal(target.hp, 100, 'cover blocks even a deliberately overspeed fixture bullet');
  assert.equal(s.bullets.length, 0);
  Object.assign(player, { x: 200, y: 300 });
  Object.assign(target, { x: 300, y: 300 });
  s.bullets = [{ x: 200, y: 300, px: 200, py: 300, vx: 10000, vy: 0, life: 1, team: 0, ownerId: 0, damage: 14 }];
  fixture.tickBullets(s, 0.05);
  assert.equal(target.hp, 86, 'swept bullet hits rather than tunnelling');
  s.bullets = [{ x: 260, y: 300, px: 260, py: 300, vx: 500, vy: 0, life: 0.05, team: 0, ownerId: 0, damage: 14 }];
  fixture.tickBullets(s, 0.05);
  assert.equal(target.hp, 72, 'exact endpoint hit still counts on the last lifetime slice');
}

// FIXTURE: warm-up, contested reset, exactly-once capture event, death and real respawn clock.
{
  const { handle, s, player } = isolated();
  Object.assign(player, ARENA.zone);
  for (let i = 0; i < 20; i++) fixture.tickCapture(s, 0.05);
  close(s.influence[0], 0);
  fixture.tickCapture(s, 0.05);
  close(s.influence[0], 0.1);
  assert.equal(s.events.filter(e => e.type === 'capture').length, 1);
  Object.assign(s.actors[2], { ...ARENA.zone, alive: true });
  fixture.tickCapture(s, 0.05);
  assert.equal(s.capture.contested, true);
  close(s.capture.warm, 0);
  close(s.influence[0], 0.1);
  fixture.damageActor(s, player, 500, s.actors[2]);
  assert.equal(player.alive, false);
  close(s.influence[1], 4);
  assert.equal(s.actors[2].kills, 1);
  s.actors[2].alive = false;
  for (let i = 0; i < 59; i++) fixture.step(handle, {}, 0.05);
  assert.equal(player.alive, false);
  fixture.step(handle, {}, 0.05);
  assert.equal(player.alive, true);
  close(player.hp, 100);
  close(player.invulnerable, 1);
  fixture.step(handle, { fire: true }, 1 / 60);
  close(player.invulnerable, 0);
}

// FIXTURE: every hero ability follows the same damage/collision/cooldown clock.
for (const hero of ['courier', 'warden', 'clerk']) {
  const { handle, s, player } = isolated(hero);
  Object.assign(player, hero === 'warden' ? { x: 400, y: 300 } : { x: 200, y: 170 });
  if (hero === 'warden') Object.assign(s.actors[2], { alive: true, x: 460, y: 300 });
  fixture.step(handle, { aimX: 700, aimY: player.y, q: true, e: true }, 1 / 60);
  const firstBulletCount = s.bullets.length;
  const abilityCount = s.events.filter(e => e.type === 'ability').length;
  assert.equal(abilityCount, 2);
  fixture.step(handle, { aimX: 400, aimY: 170, q: true, e: true }, 1 / 60);
  assert.equal(s.events.filter(e => e.type === 'ability').length, abilityCount);
  if (hero === 'courier') {
    assert.ok(player.x <= 235, 'actual rush stops at cover');
    assert.equal(firstBulletCount, 3);
  } else if (hero === 'warden') {
    assert.equal(s.actors[2].hp, 80);
    assert.ok(s.actors[2].x >= 490, 'slam applies bounded knockback');
    close(player.shield, 40);
    fixture.damageActor(s, player, 54, s.actors[2]);
    close(player.shield, 0); close(player.hp, 86);
  } else {
    assert.equal(firstBulletCount, 5);
    assert.equal(s.effects.filter(e => e.type === 'decoy').length, 1);
    for (let i = 0; i < 61; i++) fixture.step(handle, {}, 0.05);
    assert.equal(s.effects.filter(e => e.type === 'decoy').length, 0);
  }
}

// FIXTURE: timeout split, tie sudden death, no all-dead win, first-to-three and atomic draft.
{
  const { handle, s, player } = isolated();
  player.alive = false;
  s.influence = [10, 10]; s.time = 0.01;
  fixture.step(handle, {}, 0.05);
  assert.equal(s.phase, 'playing');
  assert.equal(s.suddenDeath, true);
  close(s.time, 0);
  assert.deepEqual(s.wins, [0, 0]);
  player.alive = true;
  Object.assign(s.actors[2], { alive: true, hp: 1 });
  fixture.damageActor(s, s.actors[2], 14, player);
  assert.equal(s.result.winner, 0);
  assert.equal(s.result.reason, 'kill');
  assert.equal(fixture.advanceRound(handle), true);
  assert.equal(new Set(s.offers).size, 3);
  const pick = s.offers[0];
  assert.equal(fixture.chooseItem(handle, 'not-an-item'), false);
  player.items = [pick, pick];
  assert.equal(fixture.chooseItem(handle, pick), false, 'capped pick rejects without changing any bot');
  assert.ok(s.actors.slice(1).every(a => a.items.length === 0));
  player.items = [];
  assert.equal(fixture.chooseItem(handle, pick), true);
  assert.equal(fixture.chooseItem(handle, pick), false);
  assert.equal(s.round, 2);
  for (const actor of s.actors) assert.equal(actor.items.length, 1);
  assert.equal(s.botPicks.length, 3);
  assert.equal(s.actors[0].maxHp, statsFor([pick]).maxHp);
  assert.deepEqual(s.influence, [0, 0]);
  assert.equal(s.bullets.length, 0);
  s.wins = [2, 2];
  s.time = 0.01; s.influence = [12, 8];
  fixture.step(handle, {}, 0.01);
  assert.equal(s.phase, 'matchResult');
  assert.equal(s.result.reason, 'timeout');
  assert.deepEqual(s.wins, [3, 2]);
  assert.equal(fixture.advanceRound(handle), false);
}

// Public trust boundary, frozen handle, deep snapshot, pause, dt clamp and restart.
{
  const a = engine.createMatch('invalid', NaN), b = engine.createMatch();
  assert.equal(a.phase, 'lobby');
  assert.equal(engine.selectHero(a, 'invalid'), false);
  assert.equal(engine.startMatch(a), true);
  engine.startMatch(b);
  assert.throws(() => { a.phase = 'matchResult'; }, TypeError);
  const detached = engine.snapshot(a);
  detached.actors[0].items.push('envelope'); detached.wins[0] = 99;
  assert.deepEqual(engine.snapshot(a).wins, [0, 0]);
  assert.equal(engine.snapshot(a).actors[0].items.length, 0);
  const before = engine.snapshot(a);
  for (const dt of [NaN, Infinity, -1, 0]) engine.step(a, { mx: Infinity, aimX: NaN }, dt);
  assert.deepEqual(engine.snapshot(a), before);
  engine.step(a, { mx: Infinity, aimX: NaN, fire: 'true' }, 100);
  engine.step(b, {}, 0.05);
  assert.deepEqual(engine.snapshot(a), engine.snapshot(b));
  engine.setPaused(a, true);
  const paused = engine.snapshot(a);
  engine.step(a, { fire: true, q: true }, 0.05);
  assert.deepEqual(engine.snapshot(a), paused);
  engine.setPaused(a, false);
  engine.restart(a);
  assert.deepEqual(engine.snapshot(a), engine.snapshot(engine.createMatch()));
}

function playTwoRounds() {
  const handle = engine.createMatch('warden', 240);
  engine.startMatch(handle);
  const history = [], totals = { shot: 0, ability: 0, kill: 0, capture: 0, deaths: 0, respawns: 0 };
  let seen = 0, firstPick, previousRound = 1, previousAlive = [true, true, true, true];
  for (let frame = 0; frame < 24000 && history.length < 2; frame++) {
    const s = engine.snapshot(handle), player = s.actors[0];
    if (s.round === previousRound) for (const a of s.actors) {
      if (previousAlive[a.id] && !a.alive) totals.deaths++;
      if (!previousAlive[a.id] && a.alive) totals.respawns++;
    }
    previousRound = s.round; previousAlive = s.actors.map(a => a.alive);
    for (const e of s.events) if (e.id > seen) { if (e.type in totals) totals[e.type]++; seen = e.id; }
    if (s.phase === 'roundResult') {
      history.push({ winner: s.result.winner, influence: s.influence, kills: s.actors.map(a => a.kills), capture: s.actors.map(a => a.captureSeconds) });
      if (history.length === 2) break;
      assert.equal(engine.advanceRound(handle), true);
      const draft = engine.snapshot(handle);
      assert.equal(new Set(draft.offers).size, 3);
      firstPick = draft.offers[0];
      assert.equal(engine.chooseItem(handle, firstPick), true);
      assert.equal(engine.chooseItem(handle, firstPick), false);
      const next = engine.snapshot(handle);
      assert.deepEqual(next.actors[0].items, [firstPick]);
      assert.equal(next.actors[0].maxHp, statsFor([firstPick]).maxHp);
      assert.equal(next.actors[0].hp, next.actors[0].maxHp);
      continue;
    }
    assert.equal(s.phase, 'playing');
    const enemy = s.actors.filter(a => a.alive && a.team !== 0)
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    const dx = 456 - player.x, dy = 300 - player.y, length = Math.hypot(dx, dy);
    engine.step(handle, { mx: length > 3 ? dx / length : 0, my: length > 3 ? dy / length : 0,
      aimX: enemy?.x ?? 480, aimY: enemy?.y ?? 300, fire: !!enemy, q: !!enemy,
      e: !!enemy && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 70 }, 1 / 60);
  }
  assert.equal(history.length, 2, 'ordinary input must finish two rounds');
  assert.ok(history.some(round => round.winner === 0), 'ordinary input must produce a real win');
  assert.ok(totals.shot > 10 && totals.ability > 0 && totals.kill > 0 && totals.capture > 0);
  assert.ok(totals.deaths > 0 && totals.respawns > 0, 'normal-input deaths and completed respawn countdowns');
  assert.ok(history.some(round => round.capture.some(seconds => seconds > 0)));
  const final = engine.snapshot(handle);
  assert.ok(final.events.length <= 64 && final.effects.length <= 48 && final.bullets.length <= 128);
  assert.ok(final.events.every((e, i, events) => i === 0 || e.id > events[i - 1].id));
  return { history, totals, firstPick, final };
}
const first = playTwoRounds();
assert.deepEqual(playTwoRounds(), first, 'same seed and normal input replay exactly');
console.log('PASS engine fixtures: sweep/LOS/capture/respawn/tie/draft/first3/validation/privacy');
console.log(`PASS deterministic two-round normal-input replay: ${JSON.stringify({ history: first.history, totals: first.totals, item: first.firstPick })}`);
