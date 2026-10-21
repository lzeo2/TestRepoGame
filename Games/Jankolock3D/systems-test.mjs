import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, statfsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSystems, ITEMS } from './systems.mjs';

const near = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const pos = (x = 0, z = 0) => ({ x, y: 0, z });
const enemyOf = t => t === 'carbon' ? 'ivory' : 'carbon';
function quiet(s) { for (const t of s.troopers) t.position = pos(9000, 9000); }
function hero(s, id = 'hero', team = 'carbon', souls = 0) { return s.addHero({ id, team, lane: 'midway', souls }); }
function strike(s, h, target, amount = 1e6) {
  assert.ok(s.moveHero(h.id, { ...target.position, x: target.position.x + 1 }).ok);
  const result = s.damage(target.id, amount, h.id, { kind: 'ability' });
  assert.ok(result.ok, `${target.id}: ${result.reason}`); return result;
}
function orbFixture(souls = 0, enemySouls = 0, radius = 0) {
  const s = createSystems(); s.step(30); quiet(s);
  const h = hero(s, 'killer', 'carbon', souls), e = hero(s, 'denier', 'ivory', enemySouls);
  s.moveHero(h.id, pos(radius)); s.moveHero(e.id, pos());
  const t = s.troopers.find(t => t.team === 'ivory'); t.position = pos();
  assert.ok(s.damage(t.id, 1e6, h.id, { kind: 'ability' }).ok);
  return { s, h, e, floating: s.orbs.find(o => o.type === 'floating'), ground: s.orbs.find(o => o.type === 'ground') };
}
let groups = 0;
function test(name, run) { run(); groups++; console.log(`ok ${groups} - ${name}`); }

test('trust boundaries, world contract, exact wave clock and chunk invariance', () => {
  assert.throws(() => createSystems(null), TypeError);
  assert.throws(() => createSystems({ lanes: [] }), TypeError);
  const a = createSystems(), b = createSystems();
  assert.throws(() => hero(a, 'bad', 'wrong'), TypeError);
  hero(a, 'trooper-1');
  assert.throws(() => hero(a, 'trooper-1'), TypeError);
  for (const dt of [-1, NaN, Infinity, '1', 3601]) assert.equal(a.step(dt).ok, false);
  near(a.time, 0); a.step(29.99); assert.equal(a.troopers.length, 0);
  a.step(0.01); assert.equal(a.troopers.length, 24);
  assert.equal(new Set(a.troopers.map(t => t.id)).size, 24);
  assert.ok(!a.troopers.some(t => t.id === 'trooper-1'));
  for (const team of ['carbon', 'ivory']) for (const lane of a.lanes) assert.equal(a.troopers.filter(t => t.team === team && t.lane === lane.id).length, 4);
  // Compare identical populations, independent of the test hero above.
  const c = createSystems(); c.step(80);
  for (let i = 0; i < 200; i++) b.step(0.4);
  assert.deepEqual(b.events, c.events);
  assert.deepEqual(b.troopers, c.troopers);
  assert.deepEqual(c.events.filter(e => e.type === 'wave').map(e => e.time), [30, 55, 80]);
  assert.equal(c.damage('missing', Infinity, 'missing').ok, false);
  assert.equal(c.damage('missing', 1, 'missing', null).ok, false);
  assert.ok(c.troopers.some(t => t.distanceMarched > 100));
});

test('custom waypoints are copied and followed; incomplete/duplicate world inputs fail', () => {
  const seed = createSystems();
  const lanes = seed.lanes.map(l => ({ id: l.id, x: l.x, waypoints: [{ x: l.x, y: 0, z: -390 }, { x: l.x + 50, y: 5, z: -200 }, { x: l.x, y: 0, z: 390 }] }));
  const before = JSON.stringify(lanes), s = createSystems({ lanes }); s.step(40);
  const t = s.troopers.find(t => t.team === 'carbon' && t.lane === 'midway');
  assert.ok(t.position.x > 10 && t.position.y > 0 && t.distanceMarched > 70);
  assert.equal(JSON.stringify(lanes), before);
  assert.throws(() => createSystems({ lanes, spawns: [] }), TypeError);
  assert.throws(() => createSystems({ lanes: [lanes[0], lanes[0], lanes[2]] }), TypeError);
  const invalid = structuredClone(lanes); invalid[0].waypoints[0].x = Infinity;
  assert.throws(() => createSystems({ lanes: invalid }), TypeError);
});

test('nearest targeting respects troopers > heroes > unlocked structures; candles dim', () => {
  const s = createSystems(); s.step(30); quiet(s);
  const guardian = s.structures.find(t => t.team === 'ivory' && t.type === 'guardian' && t.lane === 'midway');
  const t = s.troopers.find(t => t.team === 'carbon'), e = s.troopers.find(t => t.team === 'ivory');
  t.position = { ...guardian.position, x: guardian.position.x - 4 };
  e.position = { ...t.position, x: t.position.x + 3 };
  const rival = hero(s, 'rival', 'ivory'), killer = hero(s, 'killer');
  s.moveHero(rival.id, { ...t.position, x: t.position.x + 1 }); s.moveHero(killer.id, t.position);
  s.step(0.05); assert.equal(t.targetId, e.id); assert.ok(e.candleScale < 1 && e.emissiveScale < 1);
  s.damage(e.id, 1e6, killer.id, { kind: 'ability' });
  s.step(0.05); assert.equal(t.targetId, rival.id);
  s.damage(rival.id, 1e6, killer.id, { kind: 'ability' });
  s.step(0.05); assert.equal(t.targetId, guardian.id);
});

test('split orbs, secure/deny once, magnet radius, original eligibility, 6s/18s expiry', () => {
  let { s, h, floating, ground } = orbFixture();
  assert.equal(floating.souls, 40); assert.equal(ground.souls, 40);
  near(floating.expiresAt - floating.born, 6); near(ground.expiresAt - ground.born, 18);
  assert.ok(s.shootOrb(h.id, floating.id).ok); assert.equal(s.shootOrb(h.id, floating.id).ok, false);
  s.moveHero(h.id, pos(4)); s.step(0.1); assert.ok(ground.position.x > 0 && !ground.claimed);
  s.step(0.5); near(h.souls, 80);
  ({ s, h, floating } = orbFixture());
  assert.ok(s.shootOrb('denier', floating.id).ok); s.step(0.05);
  assert.ok(s.events.some(e => e.type === 'orb_shot' && e.outcome === 'deny'));
  near(s.heroes.find(h => h.id === 'denier').souls, 40);
  near(h.souls, 50.4); // trailing team's ground half earns the capped comeback bonus.
  ({ s, h, floating, ground } = orbFixture(0, 0, 5.01));
  s.moveHero(h.id, pos()); s.step(6);
  assert.ok(!s.orbs.some(o => o.id === floating.id)); assert.equal(s.shootOrb(h.id, floating.id).ok, false);
  assert.deepEqual(ground.eligibleIds, []); s.step(11.95); assert.ok(s.orbs.includes(ground));
  s.step(0.05); assert.ok(!s.orbs.includes(ground)); near(h.souls, 0);
  ({ s, h, ground } = orbFixture(0, 0, 4.9));
  s.moveHero(h.id, pos(6)); s.step(1); near(ground.position.x, 0);
  s.moveHero(h.id, pos(4)); s.step(0.5); assert.ok(h.souls > 0);
});

test('cumulative level XP survives spending; comeback uses earned totals and caps at 1.26', () => {
  const { s, h, floating } = orbFixture(799);
  assert.equal(h.level, 2); assert.ok(s.shootOrb(h.id, floating.id).ok); assert.equal(h.level, 3);
  s.moveHero(h.id, s.bases.carbon); assert.ok(s.buyItem(h.id, 'ammo').ok);
  near(h.souls, 39); near(h.earnedSouls, 839); assert.equal(h.level, 3);
  const f = orbFixture(0, 100000); f.s.shootOrb(f.h.id, f.floating.id);
  near(f.h.souls, 50.4);
  const event = f.s.events.filter(e => e.type === 'souls').at(-1); near(event.multiplier, 1.26);
});

test('shop tiers, funding, remote/dead access, six slots and team Walker flex cap', () => {
  assert.deepEqual([...new Set(ITEMS.map(i => i.cost))], [800, 1600, 3200, 6400]);
  const s = createSystems(); const poor = hero(s, 'poor');
  assert.equal(s.buyItem(poor.id, 'ammo').reason, 'insufficient souls');
  const h = hero(s, 'rich', 'carbon', 100000); s.step(30); quiet(s);
  s.moveHero(h.id, pos()); assert.equal(s.buyItem(h.id, 'ammo').reason, 'shop unavailable');
  const e = hero(s, 'enemy', 'ivory'); s.moveHero(e.id, pos());
  assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).ok);
  assert.equal(h.alive, false); assert.ok(s.shopAvailable(h.id)); assert.ok(s.buyItem(h.id, 'ammo').ok); near(h.hp, 0);
  s.step(h.respawnRemaining); quiet(s);
  for (const id of ['health', 'sprint', 'lifesteal', 'slow-rounds', 'dash-charge']) assert.ok(s.buyItem(h.id, id).ok);
  assert.equal(s.buyItem(h.id, 'burst-fire').reason, 'slots full');
  for (const lane of s.lanes) {
    for (const type of ['guardian', 'walker']) strike(s, h, s.structures.find(t => t.team === 'ivory' && t.lane === lane.id && t.type === type));
  }
  assert.equal(h.flexSlots, 3); assert.equal(hero(s, 'late').flexSlots, 3);
  s.moveHero(h.id, s.bases.carbon);
  for (const id of ['burst-fire', 'heavy-melee', 'shadow-cloak']) assert.ok(s.buyItem(h.id, id).ok);
  assert.equal(h.items.length, 9); assert.equal(s.buyItem(h.id, 'glass-cannon').reason, 'slots full');
  assert.equal(s.buyItem(h.id, 'ammo').reason, 'already owned');
});

test('passive stats, lifesteal, projectile slow, armor pierce and glass damage are effective', () => {
  const s = createSystems(), h = hero(s, 'rich', 'carbon', 100000), e = hero(s, 'enemy', 'ivory', 100000);
  const initial = s.stats(h.id);
  for (const id of ['ammo', 'health', 'sprint', 'lifesteal', 'slow-rounds', 'armor-pierce']) assert.ok(s.buyItem(h.id, id).ok);
  near(s.stats(h.id).maxHp, initial.maxHp + 200); near(s.stats(h.id).moveSpeed, 10); assert.equal(h.ammo, 24);
  s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(2));
  s.damage(h.id, 100, e.id, { kind: 'ability' }); const before = h.hp;
  const shot = s.damage(e.id, 20, h.id); assert.ok(shot.ok);
  near(shot.amount, 20 * initial.damageMultiplier * 0.98); near(h.hp - before, shot.amount * 0.2);
  near(s.stats(e.id).moveSpeed, 5.6);
  const troop = s.troopers.find(t => t.team === 'ivory'); troop.position = pos(10);
  s.step(0.3); assert.ok(s.damage(troop.id, 1, h.id).ok); assert.ok(troop.slowUntil > s.time);
  // Remove nearby threats without altering troop health, then compare actual slowed march distance.
  s.moveHero(h.id, pos(8000)); s.moveHero(e.id, pos(8000));
  const marched = troop.distanceMarched; s.step(0.5); near(troop.distanceMarched - marched, 2.8);
  const g = createSystems(), glass = hero(g, 'glass', 'carbon', 100000), victim = hero(g, 'victim', 'ivory', 100000);
  const hp = glass.maxHp; assert.ok(g.buyItem(glass.id, 'glass-cannon').ok); near(glass.maxHp, hp * 0.75);
  g.step(30); quiet(g); g.moveHero(glass.id, pos()); g.moveHero(victim.id, pos(1));
  const hit = g.damage(victim.id, 10, glass.id, { kind: 'ability' }); near(hit.amount, 10 * 1.95 * 1.6 * 0.9);
});

test('active burst, heavy melee, cloak targeting/break, dash distance/recharge and cooldowns', () => {
  const s = createSystems(), h = hero(s, 'rich', 'carbon', 100000), e = hero(s, 'enemy', 'ivory', 100000);
  for (const id of ['burst-fire', 'heavy-melee', 'shadow-cloak', 'dash-charge']) assert.ok(s.buyItem(h.id, id).ok);
  s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(2));
  assert.ok(s.activateItem(h.id, 'burst-fire').ok);
  near(s.damage(e.id, 10, h.id).amount, 10 * 1.95 * 3 * 0.9);
  assert.equal(s.activateItem(h.id, 'burst-fire').reason, 'item cooldown');
  const beforeHeavy = e.hp;
  assert.ok(s.activateItem(h.id, 'heavy-melee').ok); near(e.hp, beforeHeavy);
  assert.equal(s.activateItem(h.id, 'heavy-melee', { targetId: e.id }).reason, 'item cooldown');
  s.step(0.6); near(beforeHeavy - e.hp, 120 * 1.95 * 0.9);
  assert.ok(s.events.some(e => e.type === 'heavy_release' && e.ok));
  assert.ok(s.activateItem(h.id, 'shadow-cloak').ok);
  const t = s.troopers.find(t => t.team === 'ivory'); t.position = pos(5);
  s.step(0.05); assert.notEqual(t.targetId, h.id);
  s.damage(e.id, 1, h.id, { kind: 'ability' }); assert.equal(h.cloakUntil, 0);
  s.step(0.05); assert.equal(t.targetId, h.id);
  assert.equal(s.activateItem(h.id, 'dash-charge', { direction: { x: 0, z: 0 } }).ok, false);
  const start = { ...h.position };
  assert.ok(s.activateItem(h.id, 'dash-charge').ok);
  assert.ok(s.activateItem(h.id, 'dash-charge', { direction: { x: 1, z: 0 } }).ok);
  near(h.position.x - start.x, 10); near(h.position.z - start.z, 10); assert.equal(h.dashCharges, 0);
  assert.equal(s.activateItem(h.id, 'dash-charge', { direction: { x: 1, z: 0 } }).reason, 'no dash charges');
  s.moveHero(h.id, s.bases.carbon); s.moveHero(e.id, s.bases.ivory); s.step(5); assert.equal(h.dashCharges, 1);
  assert.equal(s.stats(h.id).burstMultiplier, 1);
});

test('minute-scaled respawn, own-base healing, held recall damage/move/release cancellation', () => {
  const s = createSystems(); s.step(150); quiet(s);
  const h = hero(s), e = hero(s, 'enemy', 'ivory'); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(1));
  s.damage(h.id, 1e6, e.id, { kind: 'ability' }); near(h.respawnRemaining, 9);
  s.step(8.95); assert.equal(h.alive, false); s.step(0.05); assert.equal(h.alive, true);
  assert.deepEqual(h.position, s.bases.carbon); near(h.hp, h.maxHp);
  s.moveHero(e.id, h.position); s.damage(h.id, 100, e.id, { kind: 'ability' }); const hurt = h.hp;
  s.moveHero(e.id, pos(8000)); s.step(1); assert.ok(h.hp > hurt);
  const ring = s.retreatRings.find(r => r.team === 'carbon' && r.lane === h.lane);
  s.moveHero(h.id, ring.position); s.setRetreat(h.id, true); s.step(1); assert.ok(h.recall);
  s.moveHero(h.id, { ...h.position, x: h.position.x + 0.2 }); s.step(4); assert.equal(h.recall, null);
  assert.ok(Math.abs(h.position.z - ring.position.z) < 1);
  s.setRetreat(h.id, false); s.setRetreat(h.id, true); s.step(1);
  s.moveHero(e.id, h.position); assert.ok(s.damage(h.id, 1, e.id, { kind: 'ability' }).ok);
  assert.equal(h.recall, null); s.moveHero(e.id, pos(8000)); s.step(4); assert.equal(h.recall, null);
  s.setRetreat(h.id, false); s.setRetreat(h.id, true); s.step(3.05);
  assert.deepEqual(h.position, s.bases.carbon);
  assert.equal(s.setRetreat(h.id, 1).ok, false);
});

test('600 active seconds changes phase and trooper bounty, not 600 wall seconds', () => {
  const s = createSystems(); s.step(600); assert.equal(s.phase, 'laning');
  s.step(29.95); assert.equal(s.phase, 'laning'); s.step(0.05); assert.equal(s.phase, 'midgame');
  const h = hero(s); const t = s.troopers.find(t => t.alive && t.team === 'ivory');
  strike(s, h, t); assert.equal(s.events.filter(e => e.type === 'orb_drop').at(-1).bounty, 120);
});

test('objective boundary, lane independence, both base guards, all shrines, two Patron phases; either side wins', () => {
  for (const winningTeam of ['carbon', 'ivory']) {
    const s = createSystems(), h = hero(s, 'attacker', winningTeam);
    const targets = s.structures.filter(t => t.team !== winningTeam);
    assert.equal(strikeInactive(), false);
    function strikeInactive() { s.moveHero(h.id, targets[0].position); return s.damage(targets[0].id, 1e6, h.id).ok; }
    s.step(30); quiet(s);
    for (const type of ['walker', 'base-guardian', 'shrine', 'patron']) {
      const t = targets.find(t => t.type === type); s.moveHero(h.id, t.position);
      assert.equal(s.damage(t.id, 1e6, h.id, { kind: 'ability' }).reason, 'objective locked');
    }
    for (const lane of s.lanes) {
      for (const type of ['guardian', 'walker', 'base-guardian', 'shrine']) {
        for (const t of targets.filter(t => t.lane === lane.id && t.type === type)) {
          strike(s, h, t);
          if (type === 'base-guardian' && targets.some(t => t.lane === lane.id && t.type === type && t.alive)) assert.ok(targets.filter(t => t.lane === lane.id && t.type === 'shrine').every(t => !t.vulnerable));
        }
        if (type === 'base-guardian') assert.ok(targets.filter(t => t.lane === lane.id && t.type === 'shrine').every(t => t.vulnerable));
      }
      const patron = targets.find(t => t.type === 'patron');
      assert.equal(patron.vulnerable, lane === s.lanes.at(-1));
    }
    const patron = targets.find(t => t.type === 'patron'), oldZ = patron.position.z;
    strike(s, h, patron); assert.equal(patron.patronPhase, 2); assert.equal(s.winner, null);
    near(patron.hp, 3000); near(Math.abs(patron.position.z - oldZ), 20);
    strike(s, h, patron); assert.equal(s.winner, winningTeam); assert.equal(s.phase, 'finished');
    assert.equal(s.events.filter(e => e.type === 'objective_fall').length, 19);
    assert.equal(s.damage(patron.id, 1, h.id).ok, false);
    const events = s.drainEvents(); assert.ok(events.length); assert.equal(s.events.length, 0);
  }
});

// This fixture is scripted API combat, not native input/hardware acceptance.
// No objective health assignments, vulnerability bypass, or winner assignment.
function scriptedMatch() {
  const s = createSystems();
  const attackers = s.lanes.map(l => s.addHero({ id: `script-${l.id}`, team: 'carbon', lane: l.id }));
  const timeline = [], summary = { waveCount: 0, trooperCombatHits: 0, trooperObjectiveHits: 0, trooperObjectiveDamage: 0, maxDistanceMarched: 0 };
  const collect = () => {
    for (const t of s.troopers) summary.maxDistanceMarched = Math.max(summary.maxDistanceMarched, t.distanceMarched);
    for (const event of s.drainEvents()) {
      if (event.type === 'wave') summary.waveCount++;
      if (event.type === 'damage' && event.sourceKind === 'trooper') {
        summary.trooperCombatHits++;
        if (event.targetKind === 'structure') { summary.trooperObjectiveHits++; summary.trooperObjectiveDamage += event.amount; }
      }
      if (['phase', 'wave', 'objective_fall', 'patron_phase', 'victory'].includes(event.type)) timeline.push(event);
    }
  };
  const scripts = [];
  for (let second = 0; second < 600; second++) {
    s.step(1); collect();
    if (s.time < 65 || s.phase === 'finished') continue;
    for (const h of attackers) {
      if (!h.alive) continue;
      // Clear advancing enemy squads near midfield so live allied squads push.
      for (const t of [...s.troopers].filter(t => t.alive && t.team === 'ivory' && t.lane === h.lane && t.position.z < 100)) {
        const result = strike(s, h, t, 180);
        scripts.push({ time: s.time, action: 'scripted_wave_clear', heroId: h.id, targetId: t.id, rawDamage: 180, damage: result.amount });
      }
      // Leave early objective pressure entirely to marching troopers, then assist.
      if (s.time >= 180 && s.time % 5 === 0) {
        const objective = s.structures.find(t => t.team === 'ivory' && t.lane === h.lane && t.type !== 'patron' && t.alive && t.vulnerable);
        if (objective) {
          const result = strike(s, h, objective, 250);
          scripts.push({ time: s.time, action: 'scripted_objective_shot', heroId: h.id, targetId: objective.id, rawDamage: 250, damage: result.amount });
        }
      }
      // Safe return after each fixture action. Movement is logged, not claimed as traversal.
      s.moveHero(h.id, s.bases.carbon);
    }
    const patron = s.structures.find(t => t.team === 'ivory' && t.type === 'patron');
    if (s.time >= 570 && patron.vulnerable) {
      const h = attackers[1];
      if (h.alive) {
        const result = strike(s, h, patron, 200);
        scripts.push({ time: s.time, action: 'scripted_patron_shot', heroId: h.id, targetId: patron.id, rawDamage: 200, damage: result.amount });
        s.moveHero(h.id, s.bases.carbon);
      }
    }
    collect();
  }
  assert.equal(s.time, 600); assert.equal(s.winner, 'carbon');
  assert.ok(summary.trooperCombatHits > 0 && summary.trooperObjectiveHits > 0 && summary.maxDistanceMarched > 100);
  assert.equal(timeline.filter(e => e.type === 'objective_fall' && e.team === 'ivory').length, 19);
  assert.equal(timeline.filter(e => e.type === 'patron_phase').length, 1);
  return { fixture: 'scripted 600-second API match, not native acceptance', durationSeconds: 600, world: 'procedural three-lane fallback, metres', buffs: [],
    interventions: 'Heroes reposition through moveHero, clear midfield enemy troopers with 180 raw ability damage, assist lane objectives with 250 raw damage every 5s from t180, shoot shared Patron for 200 raw damage per second from t570. No objective HP/winner/lock edits.',
    winner: s.winner, summary, timeline, scriptedActions: scripts };
}
const receipt = scriptedMatch();
// Always resolve from this module, independent of process.cwd(). No CLI-selected write paths.
const evidence = fileURLToPath(new URL('../../docs/maintenance/audits/jankolock-3d-qa/systems-timeline.json', import.meta.url));
function diskGuard() {
  const disk = statfsSync('/');
  const available = disk.bavail * disk.bsize;
  console.log(`disk available before write: ${available} bytes`);
  assert.ok(available >= 2178940928, 'disk guard: stop below 2,178,940,928 bytes');
}
diskGuard(); mkdirSync(dirname(evidence), { recursive: true });
diskGuard(); writeFileSync(evidence, JSON.stringify(receipt, null, 2) + '\n');
console.log(`scripted match: ${receipt.winner}; ${receipt.summary.waveCount} waves; ${receipt.summary.trooperCombatHits} trooper hits; ${receipt.summary.trooperObjectiveHits} objective hits (${receipt.summary.trooperObjectiveDamage} damage)`);
console.log('timeline: docs/maintenance/audits/jankolock-3d-qa/systems-timeline.json');
console.log(`${groups} regression groups completed; scripted match completed`);
