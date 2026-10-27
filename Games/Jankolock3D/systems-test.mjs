import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, statfsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSystems, ITEMS } from './systems.mjs';
import * as THREE from './vendor/three.module.js';
import { PlayerController } from './heroes/player-controller.mjs';
import { HeroRuntime } from './heroes/hero-runtime.mjs';
import { preloadHeroes } from './character-assets.mjs';
await preloadHeroes();

const { heroes: kits } = JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json', import.meta.url), 'utf8'));
const intent = (source, definition, kind, target = null, extra = {}) => ({
  kind, source: source.id, target: target?.id ?? null, ability: definition.id ?? definition.name,
  baseDamage: definition.baseDamage ?? 0, baseHeal: definition.baseHeal ?? 0,
  damageType: definition.damageType ?? 'none', spiritScale: definition.spiritScale ?? 0,
  slow: definition.slow ?? 0, duration: definition.duration ?? 0, ...extra
});

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

test('split orbs, secure/deny once, magnet radius, late arrival, 6s/18s expiry', () => {
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
  s.step(6);
  assert.ok(!s.orbs.some(o => o.id === floating.id)); assert.equal(s.shootOrb(h.id, floating.id).ok, false);
  s.step(11.95); assert.ok(s.orbs.includes(ground));
  s.step(0.05); assert.ok(!s.orbs.includes(ground)); near(h.souls, 0);
  ({ s, h, ground } = orbFixture(0, 0, 6));
  s.step(1); near(h.souls, 0);
  s.moveHero(h.id, pos(4)); s.step(0.5); near(h.souls, 40); // arriving after the kill is valid.
  ({ s, h, floating, ground } = orbFixture());
  const target = s.troopers.find(t => t.alive && t.team === 'ivory'); target.position = pos(10);
  assert.ok(s.damage(target.id, 1, h.id).ok);
  assert.equal(s.shootOrb(h.id, floating.id).reason, 'weapon cooldown');
  s.step(0.3); assert.ok(s.shootOrb(h.id, floating.id).ok);
  assert.equal(s.damage(target.id, 1, h.id).reason, 'weapon cooldown');
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
  assert.equal(s.activateItem(h.id, 'dash-charge', { direction: null }).ok, false);
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
  const h = s.addHero({ id: 'hero', team: 'carbon', lane: 'graft' }), e = hero(s, 'enemy', 'ivory'); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(1));
  s.damage(h.id, 1e6, e.id, { kind: 'ability' }); near(h.respawnRemaining, 9);
  s.step(8.95); assert.equal(h.alive, false); s.step(0.05); assert.equal(h.alive, true);
  assert.deepEqual(h.position, s.bases.carbon); near(h.hp, h.maxHp);
  s.moveHero(e.id, h.position); s.damage(h.id, 100, e.id, { kind: 'ability' }); const hurt = h.hp;
  s.moveHero(e.id, pos(8000)); s.step(1); assert.ok(h.hp > hurt);
  const ring = s.retreatRings.find(r => r.team === 'carbon' && r.lane === h.lane);
  assert.ok(Math.hypot(ring.position.x - s.bases.carbon.x, ring.position.z - s.bases.carbon.z) > 200);
  s.moveHero(h.id, ring.position); s.setRetreat(h.id, true); s.step(1); assert.ok(h.recall);
  s.moveHero(h.id, { ...h.position, x: h.position.x + 0.2 }); s.step(4); assert.equal(h.recall, null);
  assert.ok(Math.abs(h.position.z - ring.position.z) < 1);
  s.setRetreat(h.id, false); s.setRetreat(h.id, true); s.step(1);
  s.moveHero(e.id, h.position); assert.ok(s.damage(h.id, 1, e.id, { kind: 'ability' }).ok);
  assert.equal(h.recall, null); s.moveHero(e.id, pos(8000)); s.step(4); assert.equal(h.recall, null);
  s.setRetreat(h.id, false); s.setRetreat(h.id, true); s.step(3.05);
  assert.deepEqual(h.position, s.bases.carbon);
  s.setRetreat(h.id, false);
  const enemyRing = s.retreatRings.find(r => r.team === 'ivory' && r.lane === h.lane);
  s.moveHero(h.id, enemyRing.position); s.setRetreat(h.id, true); s.step(3.05);
  assert.equal(h.recall, null); assert.deepEqual(h.position, enemyRing.position);
  assert.equal(s.setRetreat(h.id, 1).ok, false);
});

test('recall accepts any friendly base ring regardless of lane assignment, never enemy rings', () => {
  for (const team of ['carbon', 'ivory']) {
    const s = createSystems(), h = hero(s, 'traveler', team);
    s.step(30);
    for (const ring of s.retreatRings.filter(r => r.team === team)) {
      s.setRetreat(h.id, false); s.moveHero(h.id, ring.position); s.setRetreat(h.id, true);
      s.step(0.05); assert.ok(h.recall, `${team}/${ring.lane}: friendly ring must start recall`);
      s.step(3.05); assert.deepEqual(h.position, s.bases[team]);
      assert.equal(h.lane, 'midway', 'using another ring does not rewrite lane assignment');
    }
    const enemyRing = s.retreatRings.find(r => r.team !== team);
    s.setRetreat(h.id, false); s.moveHero(h.id, enemyRing.position); s.setRetreat(h.id, true);
    s.step(3.1); assert.equal(h.recall, null); assert.deepEqual(h.position, enemyRing.position);
  }
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

test('kit baselines are validated, copied, applied once and do not replace runtime resources', () => {
  const s = createSystems();
  for (const kit of kits) {
    const h = hero(s, kit.id), input = structuredClone(kit);
    assert.ok(s.configureHeroKit(h.id, input).ok);
    near(h.maxHp, kit.health); near(h.hp, kit.health);
    near(s.stats(h.id).range, kit.weapon.range); near(s.stats(h.id).damage, kit.weapon.baseDamage);
    assert.equal(s.stats(h.id).maxAmmo, kit.weapon.magazine);
    assert.equal(h.ammo, 12, 'legacy magazine is not runtime ammunition');
    input.health = 9999; input.weapon.range = 9999; input.abilities[0].baseDamage = 9999;
    near(s.stats(h.id).maxHp, kit.health); near(s.stats(h.id).range, kit.weapon.range);
    assert.equal(s.configureHeroKit(h.id, kit).ok, false);
  }
  const h = hero(s, 'invalid');
  for (const mutate of [k => { k.health = Infinity; }, k => { k.weapon.magazine = 0; }, k => { k.abilities[0].duration = NaN; }, k => { k.abilities[0].slot = 2; }, k => { k.weapon.range = -1; }]) {
    const kit = structuredClone(kits[0]); mutate(kit);
    assert.equal(s.configureHeroKit(h.id, kit).ok, false); near(h.maxHp, 500);
  }
  assert.equal(s.configureHeroKit('missing', kits[0]).ok, false);
  assert.equal(s.configureHeroKit(h.id, null).ok, false);
  assert.ok(s.configureHeroKit(h.id, kits[0]).ok, 'invalid configs do not partially register');
  assert.equal(s.applyHeroEffect(intent(h, kits[0].weapon, 'damage', s.heroes[0])).reason, 'match inactive');
});

test('periodic ability intervals reject transactionally; finite positive baselines have no new cadence limits', () => {
  const snapshot = (s, h) => structuredClone({ heroes: s.heroes, stats: s.stats(h.id), events: s.events, time: s.time, phase: s.phase });
  let rejected = 0;
  for (const id of ['turret', 'puddle', 'aura', 'chaingun']) {
    const baseline = kits.find(k => k.abilities.some(a => a.id === id));
    for (const interval of [undefined, 0, -1, NaN, Infinity, '1', null, false, {}]) {
      const s = createSystems(), h = hero(s, 'invalid-periodic', 'carbon', 10000), input = structuredClone(baseline);
      const a = input.abilities.find(a => a.id === id);
      if (interval === undefined) delete a.interval; else a.interval = interval;
      const before = snapshot(s, h);
      assert.equal(s.configureHeroKit(h.id, input).ok, false, `${id}/${String(interval)}`);
      assert.deepEqual(snapshot(s, h), before, 'invalid admission changes no resources, events or baseline');
      assert.ok(s.configureHeroKit(h.id, baseline).ok, 'rejected input does not partially register');
      rejected++;
    }
    for (const interval of [Number.MIN_VALUE, Number.MAX_VALUE]) {
      const s = createSystems(), h = hero(s), input = structuredClone(baseline);
      input.abilities.find(a => a.id === id).interval = interval;
      assert.ok(s.configureHeroKit(h.id, input).ok, 'only finite and positive, no new minimum/maximum');
    }
    const s = createSystems(), h = hero(s, 'configured', 'carbon', 10000), enemy = hero(s, 'attacker', 'ivory');
    assert.ok(s.configureHeroKit(h.id, baseline).ok);
    assert.ok(s.buyItem(h.id, 'ammo').ok); assert.ok(s.buyItem(h.id, 'health').ok);
    s.step(30); quiet(s);
    assert.ok(s.moveHero(enemy.id, { ...h.position, x: h.position.x + 1 }).ok);
    assert.ok(s.damage(h.id, 10, enemy.id, { kind: 'ability' }).ok);
    assert.ok(s.applyHeroEffect(intent(h, { id: 'parry', duration: .65 }, 'parry', h)).ok);
    assert.equal(s.stats(h.id).parry, true);
    const before = snapshot(s, h), replacement = structuredClone(baseline);
    replacement.abilities.find(a => a.id === id).interval = 0;
    assert.equal(s.configureHeroKit(h.id, replacement).ok, false);
    assert.deepEqual(snapshot(s, h), before, 'configured kit, injured HP, ammo, economy and active status survive rejection');
  }
  console.log(`periodic admission: ${rejected} malformed baselines rejected; 8 finite positive extremes and 4 configured-state guards passed`);
});

test('nonperiodic interval omission stays valid and unknown raw IDs do not gain runtime support', () => {
  const s = createSystems(), h = hero(s), input = structuredClone(kits[0]);
  for (const a of input.abilities) delete a.interval;
  input.abilities[0].id = 'raw-periodic-proposal';
  assert.ok(s.configureHeroKit(h.id, input).ok);
  const scene = new THREE.Scene(), controller = new PlayerController(), events = [];
  const runtime = new HeroRuntime({ scene, controller, kit: input, source: h.id, onEffect: event => events.push(event) });
  const before = runtime.snapshot();
  assert.equal(runtime.cast(input.abilities[0].slot), false);
  assert.deepEqual(runtime.snapshot(), before); assert.equal(events.length, 0);
  runtime.dispose(); assert.equal(scene.children.length, 0);
});

test('timer-owner abilities require explicit finite duration transactionally; zero and existing bounds remain valid', () => {
  const ids = ['overtime', 'headshot', 'xray', 'chaingun', 'aura', 'turret', 'barricade', 'grenade', 'missionbomb', 'tether', 'puddle'];
  const missing = Symbol('missing'), invalid = [missing, undefined, null, '1', false, {}, [], NaN, Infinity, -Infinity, -1, 3600.01];
  let rejected = 0, accepted = 0;
  for (const id of ids) {
    const baseline = kits.find(k => k.abilities.some(a => a.id === id));
    for (const duration of invalid) {
      const s = createSystems(), h = hero(s, 'invalid-owner', 'carbon', 1600), input = structuredClone(baseline);
      const a = input.abilities.find(a => a.id === id);
      if (duration === missing) delete a.duration; else a.duration = duration;
      const before = structuredClone({ hero: h, stats: s.stats(h.id), events: s.events });
      assert.equal(s.configureHeroKit(h.id, input).ok, false, `${id}/${String(duration)}`);
      assert.deepEqual({ hero: h, stats: s.stats(h.id), events: s.events }, before);
      assert.ok(s.configureHeroKit(h.id, baseline).ok, 'invalid duration cannot partially register');
      rejected++;
    }
    for (const duration of [0, Number.MIN_VALUE, 3600]) {
      const s = createSystems(), h = hero(s), input = structuredClone(baseline), a = input.abilities.find(a => a.id === id);
      a.duration = duration; const original = structuredClone(a);
      assert.ok(s.configureHeroKit(h.id, input).ok); s.step(30); quiet(s);
      const event = intent(h, original, 'buff', h), first = s.applyHeroEffect(event);
      const before = structuredClone({ hero: h, stats: s.stats(h.id), events: s.events });
      a.duration = NaN;
      assert.deepEqual(s.applyHeroEffect(event), first, 'configured duration is copied, not aliased to client input');
      assert.equal(s.applyHeroEffect({ ...event, duration: duration === 3600 ? 0 : 3600 }).reason, 'invalid duration');
      assert.deepEqual({ hero: h, stats: s.stats(h.id), events: s.events }, before);
      accepted++;
    }
  }
  console.log(`timer-owner admission: ${rejected} malformed baselines rejected; ${accepted} zero/positive boundary and immutable-copy checks passed`);
});

test('duration omission remains valid for instant abilities and weapon/melee roles; all eight live kits retain 32 slots', () => {
  for (const id of ['hook', 'volley', 'glue', 'slam', 'longshot']) {
    const input = structuredClone(kits.find(k => k.abilities.some(a => a.id === id)));
    delete input.abilities.find(a => a.id === id).duration;
    const s = createSystems(), h = hero(s); assert.ok(s.configureHeroKit(h.id, input).ok);
  }
  const input = structuredClone(kits[0]);
  input.weapon.id = 'aura'; input.melee.id = 'headshot'; delete input.weapon.duration; delete input.melee.duration;
  const s = createSystems(), h = hero(s); assert.ok(s.configureHeroKit(h.id, input).ok, 'ability timer names do not tighten weapon/melee roles');
  const live = [...kits, ...['jank3d-ribbon-seraph-kit.json', 'jank3d-trio-kits.json'].flatMap(name => JSON.parse(readFileSync(new URL(`../../docs/${name}`, import.meta.url))).heroes)];
  let slots = 0;
  for (const kit of live) { const sim = createSystems(), player = hero(sim); assert.ok(sim.configureHeroKit(player.id, kit).ok); slots += kit.abilities.length; }
  assert.equal(live.length, 8); assert.equal(slots, 32);
});

test('kit longshot, headshot and item scaling apply once, never consume generic ammo or timers', () => {
  const s = createSystems(), kit = kits[2], h = hero(s, 'sniper', 'carbon', 100000), e = hero(s, 'enemy', 'ivory', 100000);
  assert.ok(s.configureHeroKit(h.id, kit).ok); assert.ok(s.buyItem(h.id, 'glass-cannon').ok);
  assert.ok(s.buyItem(h.id, 'burst-fire').ok);
  s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(95));
  h.ammo = 0; h.reloadRemaining = 9; h.nextAttack = 999;
  const resources = [h.ammo, h.reloadRemaining, h.nextAttack, JSON.stringify(h.cooldowns)];
  const longshot = intent(h, kit.abilities[0], 'damage', e, { headshot: true, headshotMultiplier: 2 });
  near(s.applyHeroEffect(longshot).amount, 100 * 2 * 1.95 * 1.6 * 0.9);
  near(s.applyHeroEffect(longshot).amount, 100 * 2 * 1.95 * 1.6 * 0.9);
  assert.deepEqual([h.ammo, h.reloadRemaining, h.nextAttack, JSON.stringify(h.cooldowns)], resources);
  assert.equal(s.applyHeroEffect(intent(h, kit.weapon, 'damage', e)).reason, 'out of range');
  s.moveHero(e.id, pos(101)); assert.equal(s.applyHeroEffect(longshot).reason, 'out of range');
  s.moveHero(e.id, pos(1));
  for (const extra of [{ baseDamage: NaN }, { baseDamage: 100000 }, { duration: Infinity }, { slow: -1 }, { headshotMultiplier: 99 }, { headshotMultiplier: 1.5 }, { source: 'missing' }, { team: 'ivory' }, { headshot: 'yes' }, { origin: pos(Infinity) }, { kind: 'unknown' }]) {
    assert.equal(s.applyHeroEffect({ ...longshot, ...extra }).ok, false, JSON.stringify(extra));
  }
  assert.equal(s.applyHeroEffect(null).ok, false);
  const ally = hero(s, 'friend', 'carbon'); s.moveHero(ally.id, pos(1));
  assert.equal(s.applyHeroEffect({ ...longshot, target: ally.id }).reason, 'friendly fire');
  assert.ok(s.applyHeroEffect(intent(h, kit.abilities[2], 'buff', h, { invulnerable: false, speedMultiplier: 1 })).ok);
  const fresh = hero(s, 'fresh', 'ivory', 100000); s.moveHero(fresh.id, pos(2));
  near(s.applyHeroEffect(intent(h, kit.weapon, 'damage', fresh, { headshot: true, headshotMultiplier: 3 })).amount, 65 * 3 * 1.95 * 1.6 * 0.9);
  assert.ok(s.applyHeroEffect(intent(h, kit.abilities[2], 'buff-end', h)).ok);
  assert.equal(s.applyHeroEffect(intent(h, kit.weapon, 'damage', fresh, { headshot: true, headshotMultiplier: 3 })).ok, false);
  assert.ok(s.activateItem(h.id, 'burst-fire').ok);
  near(s.applyHeroEffect(intent(h, kit.weapon, 'damage', fresh)).amount, 65 * 1.95 * 1.6 * 3 * 0.9);
  s.moveHero(fresh.id, pos(3.25));
  assert.equal(s.applyHeroEffect(intent(h, kit.melee, 'damage', fresh)).reason, 'out of range');
  const unconfigured = hero(s, 'unconfigured'); s.moveHero(unconfigured.id, pos());
  assert.equal(s.applyHeroEffect(intent(unconfigured, kit.weapon, 'damage', fresh)).ok, false);
  assert.equal(s.applyHeroEffect({ ...longshot, source: s.structures[0].id }).ok, false);
});

test('systems enforces invulnerability, melee parry, independent slows, buff-end, expiry and death cleanup', () => {
  const s = createSystems(), tank = hero(s, 'tank'), sniper = hero(s, 'sniper', 'ivory'), second = hero(s, 'second', 'ivory');
  s.configureHeroKit(tank.id, kits[0]); s.configureHeroKit(sniper.id, kits[2]); s.configureHeroKit(second.id, kits[2]);
  s.step(30); quiet(s); s.moveHero(tank.id, pos()); s.moveHero(sniper.id, pos(1)); s.moveHero(second.id, pos(2));
  const overtime = intent(tank, kits[0].abilities[3], 'buff', tank, { invulnerable: true, speedMultiplier: 1.5 });
  assert.ok(s.applyHeroEffect(overtime).ok); near(s.stats(tank.id).moveSpeed, 12);
  assert.equal(s.damage(tank.id, 10, sniper.id, { kind: 'ability' }).reason, 'invulnerable');
  assert.equal(s.applyHeroEffect(intent(sniper, kits[2].weapon, 'damage', tank)).reason, 'invulnerable');
  assert.ok(s.applyHeroEffect(intent(tank, kits[0].abilities[3], 'buff-end', tank)).ok);
  assert.equal(s.stats(tank.id).invulnerable, false); near(s.stats(tank.id).moveSpeed, 8);
  assert.ok(s.applyHeroEffect({ kind: 'parry', source: tank.id, target: null, ability: 'parry', duration: 0.65 }).ok);
  assert.equal(s.damage(tank.id, 10, sniper.id, { kind: 'melee' }).reason, 'parried');
  assert.equal(s.applyHeroEffect(intent(sniper, kits[2].melee, 'damage', tank)).reason, 'parried');
  assert.ok(s.damage(tank.id, 10, sniper.id, { kind: 'ability' }).ok);
  s.step(0.65); assert.equal(s.stats(tank.id).parry, false);
  const tether = kits[2].abilities[1];
  assert.ok(s.applyHeroEffect(intent(sniper, tether, 'damage', tank)).ok);
  assert.ok(s.applyHeroEffect(intent(second, tether, 'damage', tank)).ok); near(s.stats(tank.id).moveSpeed, 4);
  assert.ok(s.applyHeroEffect(intent(sniper, tether, 'tether-end', tank)).ok); near(s.stats(tank.id).moveSpeed, 4);
  assert.ok(s.applyHeroEffect(intent(second, tether, 'tether-end', tank)).ok); near(s.stats(tank.id).moveSpeed, 8);
  s.applyHeroEffect(intent(sniper, tether, 'damage', tank)); s.step(3); near(s.stats(tank.id).moveSpeed, 8);
  s.applyHeroEffect(overtime); s.step(3); assert.equal(s.stats(tank.id).invulnerable, false);
  s.applyHeroEffect({ kind: 'parry', source: tank.id, ability: 'parry', duration: 0.65 });
  assert.ok(s.damage(tank.id, 1e6, sniper.id, { kind: 'ability' }).ok); assert.equal(s.stats(tank.id).parry, false);
  assert.equal(s.applyHeroEffect(overtime).ok, false, 'dead source cannot cast');
  s.step(tank.respawnRemaining); quiet(s); assert.equal(s.stats(tank.id).parry, false); near(tank.hp, tank.maxHp);
});

test('native buff-end revokes owned status in inactive matches and is idempotent after real owner death', () => {
  for (const kit of kits) for (const a of kit.abilities.filter(a => ['overtime', 'headshot', 'xray', 'chaingun', 'aura'].includes(a.id))) {
    for (const phase of ['active', 'pregame', 'finished']) {
      const s = createSystems(), h = hero(s), e = hero(s, 'buff-cleanup-enemy', 'ivory');
      assert.ok(s.configureHeroKit(h.id, kit).ok); s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(1));
      const livePhase = s.phase;
      assert.ok(s.applyHeroEffect(intent(h, a, 'buff', h)).ok);
      if (a.id === 'overtime') { assert.equal(s.stats(h.id).invulnerable, true); near(s.stats(h.id).moveSpeed, 12); }
      if (a.id === 'headshot') assert.ok(s.applyHeroEffect(intent(h, kit.weapon, 'damage', e, { headshot: true, headshotMultiplier: 3 })).ok);
      if (phase !== 'active') s.phase = phase; // CPU inactive-host fixture, not match progression proof.
      assert.ok(s.applyHeroEffect(intent(h, a, 'buff-end', h)).ok);
      assert.equal(s.stats(h.id).invulnerable, false); near(s.stats(h.id).moveSpeed, 8);
      const before = structuredClone({ heroes: s.heroes, events: s.events, stats: s.stats(h.id) });
      assert.ok(s.applyHeroEffect(intent(h, a, 'buff-end', h)).ok);
      assert.deepEqual({ heroes: s.heroes, events: s.events, stats: s.stats(h.id) }, before);
      if (phase !== 'active') for (const kind of ['buff', 'damage', 'status']) assert.equal(s.applyHeroEffect(intent(h, a, kind, kind === 'buff' ? h : e)).reason, 'match inactive');
      if (a.id === 'headshot') {
        s.phase = livePhase; // Restore the actual prior phase to observe revoked headshot authority.
        assert.equal(s.applyHeroEffect(intent(h, kit.weapon, 'damage', e, { headshot: true, headshotMultiplier: 3 })).reason, 'invalid headshot multiplier');
      }
    }
  }
  const s = createSystems(), h = hero(s), e = hero(s, 'buff-killer', 'ivory'), a = kits[2].abilities.find(a => a.id === 'headshot');
  assert.ok(s.configureHeroKit(h.id, kits[2]).ok); s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(1));
  assert.ok(s.applyHeroEffect(intent(h, a, 'buff', h)).ok); assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).killed);
  assert.ok(s.applyHeroEffect(intent(h, a, 'buff-end', h)).ok); assert.ok(s.applyHeroEffect(intent(h, a, 'buff-end', h)).ok);
  for (const kind of ['buff', 'damage', 'status']) assert.equal(s.applyHeroEffect(intent(h, a, kind, kind === 'buff' ? h : e)).reason, 'source or kit inactive');
});

test('inactive buff-end retains source/kit/team/self/role/payload guards without mutating live status', () => {
  const s = createSystems(), h = hero(s), e = hero(s, 'cleanup-foreign', 'ivory'), kit = kits[0], a = kit.abilities[3];
  assert.ok(s.configureHeroKit(h.id, kit).ok); s.step(30); quiet(s); assert.ok(s.applyHeroEffect(intent(h, a, 'buff', h)).ok);
  s.phase = 'finished'; // Negative inactive-host fixture only.
  const end = intent(h, a, 'buff-end', h);
  const reject = event => {
    const before = structuredClone({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events });
    assert.equal(s.applyHeroEffect(event).ok, false);
    assert.deepEqual({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events }, before);
  };
  for (const extra of [{ source: 'missing' }, { source: e.id }, { ability: 'unknown' }, { team: 'ivory' }, { target: e.id }, { target: 'missing' },
    { baseDamage: 1 }, { baseHeal: 1 }, { spiritScale: 1 }, { slow: 1 }, { duration: NaN }, { damageType: 'weapon' },
    { invulnerable: false }, { speedMultiplier: 99 }, { slowDuration: Infinity }, { headshot: true, headshotMultiplier: 3 }]) reject({ ...end, ...extra });
  for (const definition of [kit.weapon, kit.melee, kit.abilities[0]]) reject(intent(h, definition, 'buff-end', h));
  assert.equal(s.stats(h.id).invulnerable, true); near(s.stats(h.id).moveSpeed, 12);
  assert.ok(s.applyHeroEffect(end).ok); assert.equal(s.stats(h.id).invulnerable, false); near(s.stats(h.id).moveSpeed, 8);
});

test('deployed origins enforce kit ranges, healing is allied and capped, slow affects marching', () => {
  const s = createSystems(), engineer = hero(s, 'engineer'), support = hero(s, 'support', 'carbon', 100000), ally = hero(s, 'ally'), enemy = hero(s, 'enemy', 'ivory');
  s.configureHeroKit(engineer.id, kits[1]); s.configureHeroKit(support.id, kits[3]);
  assert.ok(s.buyItem(support.id, 'glass-cannon').ok);
  s.step(30); quiet(s);
  // CPU API placement/start setup, not native placement or traversal proof.
  s.moveHero(engineer.id, pos(100)); s.moveHero(support.id, pos(100));
  assert.ok(s.applyHeroEffect(intent(engineer, kits[1].abilities[0], 'deployment-start', null, { deploymentId: 1, origin: pos(100) })).ok);
  assert.ok(s.applyHeroEffect(intent(support, kits[3].abilities[0], 'deployment-start', null, { deploymentId: 1, origin: pos(100) })).ok);
  s.moveHero(engineer.id, pos(800)); s.moveHero(support.id, pos(700)); s.moveHero(ally.id, pos(104)); s.moveHero(enemy.id, pos(118));
  const turret = intent(engineer, kits[1].abilities[0], 'damage', enemy, { deploymentId: 1, origin: { ...pos(100), y: .9 } });
  assert.equal(s.applyHeroEffect({ ...turret, origin: undefined }).reason, 'effect origin required');
  near(s.applyHeroEffect(turret).amount, 18 * 0.9);
  s.moveHero(enemy.id, pos(121)); assert.equal(s.applyHeroEffect(turret).reason, 'out of range');
  s.moveHero(enemy.id, pos(104));
  const grenade = intent(engineer, kits[1].abilities[2], 'damage', enemy, { origin: pos(100) });
  near(s.applyHeroEffect(grenade).amount, 90 * 0.9);
  s.moveHero(enemy.id, pos(106)); assert.equal(s.applyHeroEffect(grenade).reason, 'out of range');
  assert.ok(s.damage(ally.id, 200, enemy.id, { kind: 'ability' }).ok);
  const puddle = intent(support, kits[3].abilities[0], 'heal', ally, { deploymentId: 1, origin: pos(100) });
  near(s.applyHeroEffect(puddle).amount, 20 * 1.95 * 1.6);
  for (let i = 0; i < 20; i++) assert.ok(s.applyHeroEffect(puddle).ok);
  near(ally.hp, ally.maxHp); near(s.applyHeroEffect(puddle).amount, 0);
  s.moveHero(enemy.id, pos(103)); assert.equal(s.applyHeroEffect({ ...puddle, target: enemy.id }).ok, false);
  s.moveHero(ally.id, pos(105)); assert.equal(s.applyHeroEffect(puddle).reason, 'out of range');
  const t = s.troopers.find(t => t.team === 'ivory'); t.position = pos(103);
  assert.ok(s.applyHeroEffect(intent(support, kits[3].abilities[0], 'damage', t, { deploymentId: 1, origin: pos(100) })).ok);
  const marched = t.distanceMarched;
  s.moveHero(enemy.id, pos(8000)); s.moveHero(ally.id, pos(8000)); s.step(0.5);
  near(t.distanceMarched - marched, 8 * 0.5 * 0.65);
});

// CPU API placement/start fixtures, not native cast, terrain or placement acceptance.
function emitterFixture(id, duration = 2) {
  const s = createSystems(), input = structuredClone(kits.find(k => k.abilities.some(a => a.id === id)));
  const a = input.abilities.find(a => a.id === id); a.duration = duration;
  const definition = structuredClone(a), h = hero(s, 'emitter'), e = hero(s, 'emitter-enemy', 'ivory'), ally = hero(s, 'emitter-ally'), foreign = hero(s, 'foreign');
  assert.ok(s.configureHeroKit(h.id, input).ok); assert.ok(s.configureHeroKit(foreign.id, input).ok);
  s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(1)); s.moveHero(ally.id, pos(1)); s.moveHero(foreign.id, pos(2));
  const ground = pos(), origin = { ...ground, y: id === 'turret' ? .9 : 0 };
  const start = deploymentId => intent(h, definition, 'deployment-start', null, { deploymentId, origin: ground });
  const end = deploymentId => intent(h, definition, 'deployment-end', null, { deploymentId });
  const hit = deploymentId => intent(h, definition, 'damage', e, { deploymentId, origin });
  const snapshot = () => structuredClone({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events });
  const reject = event => { const before = snapshot(); assert.equal(s.applyHeroEffect(event).ok, false); assert.deepEqual(snapshot(), before); };
  return { s, h, e, ally, foreign, a, definition, ground, origin, start, end, hit, reject };
}
test('persistent emitter starts bind exact immutable origins and IDs; rejects are transactional and caster movement stays valid', () => {
  for (const id of ['turret', 'puddle']) {
    const f = emitterFixture(id), { s, h, e, ally, foreign, a, ground, origin, start, end, hit, reject } = f;
    reject(hit(1)); assert.ok(s.applyHeroEffect(start(1)).ok);
    const limit = id === 'turret' ? 4.5 : a.range;
    for (const extra of [{ origin: pos(limit + .000002) }, { origin: null }, { origin: pos(Infinity) },
      { origin: new THREE.Vector3() }, { source: 'missing' }, { source: e.id }, { team: 'ivory' },
      { target: e.id }, { target: undefined }, { ability: 'unknown' }, { ability: id === 'turret' ? kits[1].weapon.name : kits[3].weapon.name }, { duration: 99 },
      ...[undefined, null, 0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1, 1].map(deploymentId => ({ deploymentId }))]) reject({ ...start(2), ...extra });
    for (const extra of [{ deploymentId: undefined }, { deploymentId: 2 }, { source: foreign.id },
      { origin: pos(10000) }, { origin: { ...origin, x: origin.x + .000001 } }, { origin: { ...origin, y: origin.y + .000001 } }]) reject({ ...hit(1), ...extra });
    ground.x = 999; a.duration = 300; // Neither original input object can move/extend the host anchor.
    assert.ok(s.moveHero(h.id, pos(100)).ok); assert.ok(s.applyHeroEffect(hit(1)).ok, 'registered emitter survives caster moving 100m');
    ground.x = 0; assert.ok(s.moveHero(h.id, pos()).ok);
    assert.ok(s.applyHeroEffect(start(2)).ok, 'rejected starts did not consume ID 2');
    reject(hit(1)); assert.deepEqual(s.applyHeroEffect(end(1)), { ok: true, ended: false });
    assert.ok(s.applyHeroEffect(hit(2)).ok, 'stale cleanup cannot remove replacement');
    if (id === 'puddle') {
      assert.ok(s.damage(ally.id, 20, e.id, { kind: 'ability' }).ok);
      const heal = intent(h, f.definition, 'heal', ally, { deploymentId: 2, origin });
      assert.ok(s.applyHeroEffect(heal).amount > 0); reject({ ...heal, deploymentId: 1 }); reject({ ...heal, origin: pos(9000) });
    }
    for (const extra of [{ deploymentId: 0 }, { deploymentId: '2' }, { target: e.id }, { team: 'ivory' }]) reject({ ...end(2), ...extra });
    assert.deepEqual(s.applyHeroEffect(end(2)), { ok: true, ended: true }); reject(hit(2));
    assert.deepEqual(s.applyHeroEffect(end(2)), { ok: true, ended: false });
    reject(start(2)); assert.ok(s.applyHeroEffect(start(3)).ok);
    s.step(2); reject(hit(3)); reject(start(3)); assert.ok(s.applyHeroEffect(start(4)).ok);
    assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).killed);
    assert.deepEqual(s.applyHeroEffect(end(4)), { ok: true, ended: false });
    s.step(h.respawnRemaining); quiet(s); s.moveHero(h.id, pos());
    reject(hit(4)); reject(start(4)); assert.ok(s.applyHeroEffect(start(5)).ok);
    s.phase = 'finished'; // Negative inactive-host fixture, not victory evidence.
    assert.deepEqual(s.applyHeroEffect(end(5)), { ok: true, ended: true });
    assert.deepEqual(s.applyHeroEffect(end(5)), { ok: true, ended: false });
  }
});
test('persistent emitter zero lifetime and horizontal boundary are literal; monotonic IDs are per source, not per ability', () => {
  for (const id of ['turret', 'puddle']) {
    const f = emitterFixture(id, 0); assert.ok(f.s.applyHeroEffect(f.start(1)).ok); f.reject(f.hit(1));
    assert.deepEqual(f.s.applyHeroEffect(f.end(1)), { ok: true, ended: false }); f.reject(f.start(1));
    const g = emitterFixture(id); g.ground.x = (id === 'turret' ? 4.5 : g.a.range) + .000001;
    assert.ok(g.s.applyHeroEffect(g.start(1)).ok, 'only the placement epsilon is allowed');
  }
  const s = createSystems(), h = hero(s), kit = structuredClone(kits[1]);
  kit.abilities[1] = { ...structuredClone(kits[3].abilities[0]), slot: 2 };
  assert.ok(s.configureHeroKit(h.id, kit).ok);
  const start = (a, deploymentId) => intent(h, a, 'deployment-start', null, { deploymentId, origin: pos() });
  const before = structuredClone(h); assert.equal(s.applyHeroEffect(start(kit.abilities[0], 1)).reason, 'match inactive'); assert.deepEqual(h, before);
  s.step(30); quiet(s); s.moveHero(h.id, pos());
  assert.ok(s.applyHeroEffect(start(kit.abilities[0], 1)).ok);
  assert.equal(s.applyHeroEffect(start(kit.abilities[1], 1)).ok, false);
  assert.ok(s.applyHeroEffect(start(kit.abilities[1], 2)).ok);
  assert.equal(s.applyHeroEffect(start(kit.abilities[0], 2)).ok, false);
});

test('persistent anchors do not widen pure status caster range; projectile remote origins remain a separate legacy finding', () => {
  const f = statusFixture({ id: 'puddle', interval: 1, duration: 2 });
  assert.ok(f.s.applyHeroEffect(intent(f.h, f.a, 'deployment-start', null, { deploymentId: 1, origin: pos(10) })).ok);
  f.s.moveHero(f.h.id, pos(100));
  assert.equal(f.s.applyHeroEffect({ ...f.event, deploymentId: 1, origin: pos(10) }).reason, 'out of range');
  for (const id of ['grenade', 'missionbomb']) {
    const s = createSystems(), kit = kits.find(k => k.abilities.some(a => a.id === id)), h = hero(s), e = hero(s, 'projectile-target', 'ivory');
    assert.ok(s.configureHeroKit(h.id, kit).ok); s.step(30); quiet(s); s.moveHero(h.id, pos()); s.moveHero(e.id, pos(10000));
    assert.ok(s.applyHeroEffect(intent(h, kit.abilities.find(a => a.id === id), 'damage', e, { origin: pos(10000) })).ok, 'legacy projectile origin finding, NOT new persistent emitter authority');
  }
});

test('actual HeroRuntime events bridge without double ammo, including slide, melee and buffs', () => {
  const s = createSystems(), h = hero(s, 'player'), e = hero(s, 'enemy', 'ivory');
  s.configureHeroKit(h.id, kits[0]); s.step(30); quiet(s); s.moveHero(h.id, pos(0, 8)); s.moveHero(e.id, pos());
  h.ammo = 0; h.reloadRemaining = 50; h.nextAttack = 1000;
  const scene = new THREE.Scene(), boxes = [], results = [];
  const controller = new PlayerController({ position: h.position, boxes });
  const runtime = new HeroRuntime({ scene, controller, kit: kits[0], targets: [e], source: h.id, onEffect: event => results.push(s.applyHeroEffect(event)) });
  assert.ok(runtime.fire()); assert.equal(runtime.ammo, 11); assert.ok(results.at(-1).ok);
  for (let i = 0; i < 40; i++) { controller.update(1 / 60, { forward: 1 }); runtime.update(1 / 60); }
  controller.update(1 / 60, { forward: 1, slide: true }); assert.ok(controller.infiniteAmmo);
  s.moveHero(h.id, controller.position); const ammo = runtime.ammo;
  assert.ok(runtime.fire()); assert.equal(runtime.ammo, ammo); assert.ok(results.at(-1).ok);
  s.moveHero(e.id, { ...h.position, z: h.position.z - 2 });
  assert.ok(runtime.melee()); assert.ok(results.at(-1).ok);
  assert.ok(runtime.parry()); assert.ok(s.stats(h.id).parry);
  assert.ok(runtime.cast(4)); assert.ok(s.stats(h.id).invulnerable);
  assert.equal(h.ammo, 0); near(h.reloadRemaining, 50); near(h.nextAttack, 1000);
  runtime.dispose(); assert.equal(scene.children.length, 0);
});

test('hero effect path preserves every objective lock, Patron transition and finished freeze', () => {
  const s = createSystems(), h = hero(s), kit = kits[2]; s.configureHeroKit(h.id, kit); s.step(30); quiet(s);
  const targets = s.structures.filter(t => t.team === 'ivory');
  const hit = target => { s.moveHero(h.id, { ...target.position, x: target.position.x + 1 }); return s.applyHeroEffect(intent(h, kit.abilities[0], 'damage', target)); };
  for (const type of ['walker', 'base-guardian', 'shrine', 'patron']) assert.equal(hit(targets.find(t => t.type === type)).reason, 'objective locked');
  for (const target of targets.filter(t => t.type !== 'patron')) {
    for (let i = 0; target.alive && i < 100; i++) assert.ok(hit(target).ok);
    assert.equal(target.alive, false);
  }
  const patron = targets.find(t => t.type === 'patron');
  assert.ok(hit(patron).ok); assert.equal(patron.patronPhase, 2); assert.equal(s.winner, null);
  for (let i = 0; patron.alive && i < 100; i++) assert.ok(hit(patron).ok);
  assert.equal(s.winner, 'carbon'); assert.equal(s.phase, 'finished');
  assert.equal(hit(patron).reason, 'match inactive');
  assert.equal(s.applyHeroEffect(intent(h, kit.abilities[2], 'buff', h)).reason, 'match inactive');
  assert.equal(s.configureHeroKit(h.id, kit).ok, false);
});

// Synthetic original-ID component fixture, not an expansion kit/adaptation.
function statusFixture(change = {}, activeMatch = true) {
  const s = createSystems(), h = hero(s, 'status-source'), e = hero(s, 'status-enemy', 'ivory'), ally = hero(s, 'status-ally');
  const kit = structuredClone(kits[0]), a = kit.abilities[1];
  Object.assign(a, { baseDamage: 0, baseHeal: 0, spiritScale: 0, damageType: 'none', slow: .4, duration: 2, range: 12 }, change);
  assert.ok(s.configureHeroKit(h.id, kit).ok); assert.ok(s.configureHeroKit(e.id, kits[0]).ok);
  if (activeMatch) { s.step(30); quiet(s); }
  s.moveHero(h.id, pos()); s.moveHero(e.id, pos(4)); s.moveHero(ally.id, pos(5));
  const event = intent(h, a, 'status', e);
  const resources = () => JSON.stringify([...s.heroes, ...s.troopers, ...s.structures].map(x =>
    [x.id, x.hp, x.ammo, x.reloadRemaining, x.nextAttack, x.souls, x.earnedSouls, x.level, x.items, x.cooldowns]));
  return { s, h, e, ally, kit, a, event, resources };
}
// Synthetic native puddle component, CPU API placement; not a registered kit/zone or native input proof.
const anchoredSlowFields = { id: 'puddle', interval: 1, duration: 3, slowDuration: .5, radius: 4, range: 12, anchoredSlow: true,
  baseDamage: 0, baseHeal: 0, spiritScale: 0, damageType: 'none', slow: .4, invulnerable: false, speedMultiplier: 1, headshotMultiplier: 1 };
function anchoredSlowFixture(change = {}) {
  const f = statusFixture({ ...anchoredSlowFields, ...change });
  const origin = pos(), start = intent(f.h, f.a, 'deployment-start', null, { deploymentId: 1, origin });
  assert.ok(f.s.applyHeroEffect(start).ok);
  return { ...f, origin, start, pulse: { ...f.event, anchoredSlow: true, deploymentId: 1, origin: { ...origin } } };
}
test('opt-in anchored pure slow refreshes remotely then lingers by last application, without HP/ammo/economy authority', () => {
  const f = anchoredSlowFixture(), { s, h, e, a, pulse, resources } = f;
  s.moveHero(h.id, pos(100)); const before = resources(), hp = e.hp;
  const heroResources = () => JSON.parse(resources()).filter(row => s.heroes.some(hero => hero.id === row[0])), heroBefore = heroResources();
  assert.ok(s.applyHeroEffect(pulse).ok); near(s.stats(e.id).moveSpeed, 4.8); assert.equal(resources(), before);
  for (let i = 0; i < 50; i++) { assert.ok(s.step(.05).ok); if (i % 4 === 0) assert.ok(s.applyHeroEffect(pulse).ok); }
  assert.ok(s.applyHeroEffect(pulse).ok); near(s.time, 32.5);
  assert.deepEqual(s.applyHeroEffect(intent(h, a, 'deployment-end', null, { deploymentId: 1 })), { ok: true, ended: true });
  assert.equal(s.applyHeroEffect(pulse).ok, false); near(s.stats(e.id).moveSpeed, 4.8);
  for (let i = 0; i < 9; i++) s.step(.05); near(s.stats(e.id).moveSpeed, 4.8);
  s.step(.05); near(s.stats(e.id).moveSpeed, 8); assert.equal(e.hp, hp);
  // The normal clock advances NPC combat; hero HP/ammo/economy must still be unchanged.
  assert.deepEqual(heroResources(), heroBefore);
  const g = anchoredSlowFixture(); g.s.moveHero(g.h.id, pos(100));
  for (let i = 0; i < 59; i++) { g.s.step(.05); if (i % 4 === 0) assert.ok(g.s.applyHeroEffect(g.pulse).ok); }
  assert.ok(g.s.applyHeroEffect(g.pulse).ok); g.s.step(.05);
  assert.equal(g.s.applyHeroEffect(g.pulse).ok, false, 'owner expiry stops refresh'); near(g.s.stats(g.e.id).moveSpeed, 4.8);
  for (let i = 0; i < 9; i++) g.s.step(.05); near(g.s.stats(g.e.id).moveSpeed, 8);
  const outside = anchoredSlowFixture(); assert.ok(outside.s.applyHeroEffect(outside.pulse).ok);
  outside.s.moveHero(outside.e.id, pos(5)); assert.equal(outside.s.applyHeroEffect(outside.pulse).ok, false);
  near(outside.s.stats(outside.e.id).moveSpeed, 4.8); outside.s.step(.5); near(outside.s.stats(outside.e.id).moveSpeed, 8);
});

test('anchoredSlow registration is opt-in, typed, immutable and transactional; legacy false/omitted stays caster-ranged', () => {
  const invalid = [undefined, null, 0, 1, 'true', {}, []].map(anchoredSlow => ({ anchoredSlow }));
  invalid.push(...[{ id: 'volley' }, { baseDamage: 1 }, { baseHeal: 1 }, { spiritScale: 1 }, { damageType: 'spirit' },
    { slow: 0 }, { slow: .95 }, { duration: 0 }, { range: 0 }, { radius: 0 }, { radius: NaN }, { radius: Infinity },
    { invulnerable: true }, { speedMultiplier: 2 }, { headshotMultiplier: 2 }]);
  for (const change of invalid) {
    const s = createSystems(), h = hero(s), kit = structuredClone(kits[0]);
    Object.assign(kit.abilities[1], anchoredSlowFields, change);
    const before = structuredClone({ hero: h, events: s.events, stats: s.stats(h.id) });
    assert.equal(s.configureHeroKit(h.id, kit).ok, false, JSON.stringify(change));
    assert.deepEqual({ hero: h, events: s.events, stats: s.stats(h.id) }, before);
    Object.assign(kit.abilities[1], anchoredSlowFields); assert.ok(s.configureHeroKit(h.id, kit).ok);
  }
  for (const role of ['weapon', 'melee']) {
    const s = createSystems(), h = hero(s), kit = structuredClone(kits[0]); kit[role].anchoredSlow = true;
    assert.equal(s.configureHeroKit(h.id, kit).ok, false); assert.ok(s.configureHeroKit(h.id, kits[0]).ok);
  }
  const s = createSystems(), h = hero(s), boundary = structuredClone(kits[0]);
  Object.assign(boundary.abilities[1], anchoredSlowFields, { duration: 3600, slowDuration: 3600, radius: 10000, range: 10000, slow: .9 });
  assert.ok(s.configureHeroKit(h.id, boundary).ok, 'existing maxima admitted, no long simulation');
  for (const explicit of [false, true]) {
    const change = { id: 'puddle', interval: 1, radius: 4, range: 12, duration: 3 };
    if (explicit) change.anchoredSlow = false;
    const f = statusFixture(change); assert.ok(f.s.applyHeroEffect(f.event).ok);
    assert.equal(f.s.applyHeroEffect({ ...f.event, anchoredSlow: true }).ok, false);
    f.s.moveHero(f.h.id, pos(100)); assert.equal(f.s.applyHeroEffect(f.event).reason, 'out of range');
  }
});

test('anchored slow rejects anchor/payload/eligibility spoofing without mutation and cannot downgrade immutable true', () => {
  const { s, h, e, ally, a, pulse, origin } = anchoredSlowFixture();
  const reject = candidate => {
    const before = structuredClone({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events });
    assert.equal(s.applyHeroEffect(candidate).ok, false);
    assert.deepEqual({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events }, before);
  };
  a.anchoredSlow = false; a.radius = 999; s.moveHero(ally.id, pos(1));
  for (const extra of [{ deploymentId: undefined }, { deploymentId: 0 }, { deploymentId: 2 }, { origin: undefined }, { origin: pos(1) },
    { origin: new THREE.Vector3() }, { anchoredSlow: false }, { anchoredSlow: undefined }, { anchoredSlow: 1 }, { anchoredSlow: null },
    { target: ally.id }, { target: h.id }, { target: s.structures.find(x => x.team === 'ivory').id }, { target: 'missing' },
    { ability: 'missing' }, { baseDamage: 1 }, { baseDamage: undefined }, { baseHeal: 1 }, { spiritScale: 1 }, { slow: .8 }, { duration: 99 }, { team: 'ivory' }]) reject({ ...pulse, ...extra });
  s.moveHero(e.id, pos(4.000001)); reject(pulse); reject({ ...pulse, radius: 999 }); s.moveHero(e.id, pos(4));
  assert.ok(s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff', e, { invulnerable: true, speedMultiplier: 1.5 })).ok);
  reject(pulse); assert.ok(s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff-end', e)).ok);
  const withoutFlag = { ...pulse }; delete withoutFlag.anchoredSlow;
  reject({ ...withoutFlag, deploymentId: undefined });
  s.moveHero(h.id, pos(100)); assert.ok(s.applyHeroEffect(withoutFlag).ok, 'missing event flag never downgrades host true to caster range');
  s.moveHero(h.id, pos());
  assert.ok(s.applyHeroEffect(intent(h, { ...a, duration: 3 }, 'deployment-start', null, { deploymentId: 2, origin })).ok);
  reject(pulse); const fresh = { ...pulse, deploymentId: 2 }; assert.ok(s.applyHeroEffect(fresh).ok);
  s.moveHero(h.id, pos()); assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).killed); reject(fresh);
  near(s.stats(e.id).moveSpeed, 4.8); s.step(.5); near(s.stats(e.id).moveSpeed, 8);
});

test('optional per-target application budget registration is typed, anchored-only and transactional', () => {
  const valid = structuredClone(kits[0]); Object.assign(valid.abilities[1], anchoredSlowFields, { maxApplicationsPerTarget: 2 });
  const changes = [undefined, null, false, true, .5, 0, -1, Infinity, NaN, '2', {}, [], Number.MAX_SAFE_INTEGER + 1].map(maxApplicationsPerTarget => ({ maxApplicationsPerTarget }));
  changes.push({ anchoredSlow: false }, { anchoredSlow: undefined }, { id: 'turret' }, { baseDamage: 1 }, { baseHeal: 1 });
  for (const change of changes) {
    const s = createSystems(), h = hero(s), input = structuredClone(valid); Object.assign(input.abilities[1], change);
    const before = structuredClone({ hero: h, stats: s.stats(h.id), events: s.events });
    assert.equal(s.configureHeroKit(h.id, input).ok, false);
    assert.deepEqual({ hero: h, stats: s.stats(h.id), events: s.events }, before);
    assert.ok(s.configureHeroKit(h.id, valid).ok, 'retry restores the complete valid baseline');
  }
  for (const role of ['weapon', 'melee']) {
    const s = createSystems(), h = hero(s), input = structuredClone(kits[0]); input[role].maxApplicationsPerTarget = 2;
    assert.equal(s.configureHeroKit(h.id, input).ok, false); assert.ok(s.configureHeroKit(h.id, kits[0]).ok);
  }
  const s = createSystems(), h = hero(s); valid.abilities[1].maxApplicationsPerTarget = Number.MAX_SAFE_INTEGER;
  assert.ok(s.configureHeroKit(h.id, valid).ok, 'safe-integer maximum is registration-only, no huge loop');
});

test('per-target caps preserve last accepted linger across rejection, field exit, status expiry and immutable intent spoofing', () => {
  const f = anchoredSlowFixture({ maxApplicationsPerTarget: 2 }), { s, h, e, a, pulse, resources } = f;
  const apply = event => { const before = resources(); const result = s.applyHeroEffect(event); assert.equal(resources(), before); return result; };
  const reject = (event, reason) => {
    const before = structuredClone({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events });
    const result = apply(event); assert.equal(result.ok, false); if (reason) assert.equal(result.reason, reason);
    assert.deepEqual({ heroes: s.heroes, stats: s.heroes.map(x => s.stats(x.id)), events: s.events }, before);
  };
  const tick = n => { for (let i = 0; i < n; i++) s.step(.05); };
  a.maxApplicationsPerTarget = 999;
  for (const extra of [{ deploymentId: 0 }, { deploymentId: 2 }, { origin: pos(1) }, { baseDamage: 1 }, { target: f.ally.id },
    ...[undefined, null, false, 0, 1, 3, 999, Infinity, '2'].map(maxApplicationsPerTarget => ({ maxApplicationsPerTarget }))]) reject({ ...pulse, ...extra });
  assert.ok(s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff', e, { invulnerable: true, speedMultiplier: 1.5 })).ok);
  reject(pulse, 'invulnerable'); assert.ok(s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff-end', e)).ok);
  s.moveHero(h.id, pos(100)); assert.ok(apply({ ...pulse, maxApplicationsPerTarget: 2 }).ok);
  tick(4); s.moveHero(e.id, pos(5)); reject(pulse); s.moveHero(e.id, pos(4)); assert.ok(apply(pulse).ok, 'failed attempts did not consume either application');
  tick(4); reject(pulse, 'application budget exhausted'); near(s.stats(e.id).moveSpeed, 4.8);
  s.moveHero(e.id, pos(5)); s.moveHero(e.id, pos(4)); reject(pulse, 'application budget exhausted');
  tick(6); near(s.stats(e.id).moveSpeed, 8); reject(pulse, 'application budget exhausted');
  s.moveHero(h.id, pos()); assert.ok(s.applyHeroEffect({ ...f.start, deploymentId: 2 }).ok); s.moveHero(h.id, pos(100));
  reject(pulse); const fresh = { ...pulse, deploymentId: 2 }; assert.ok(apply(fresh).ok); assert.ok(apply(fresh).ok); reject(fresh, 'application budget exhausted');
  assert.deepEqual(s.applyHeroEffect(intent(h, a, 'deployment-end', null, { deploymentId: 2 })), { ok: true, ended: true });
  reject(fresh); near(s.stats(e.id).moveSpeed, 4.8); tick(10); near(s.stats(e.id).moveSpeed, 8);
});

test('application counts are independent per source/target/current instance; expiry and death retain only S7 linger', () => {
  const f = anchoredSlowFixture({ maxApplicationsPerTarget: 1 }), { s, h, e, pulse } = f;
  assert.ok(s.applyHeroEffect(pulse).ok); assert.equal(s.applyHeroEffect(pulse).reason, 'application budget exhausted');
  const otherTarget = hero(s, 'other-budget-target', 'ivory'); s.moveHero(otherTarget.id, pos(1));
  assert.ok(s.applyHeroEffect({ ...pulse, target: otherTarget.id }).ok); assert.equal(s.applyHeroEffect({ ...pulse, target: otherTarget.id }).reason, 'application budget exhausted');
  const otherSource = hero(s, 'other-budget-source'); assert.ok(s.configureHeroKit(otherSource.id, f.kit).ok); s.moveHero(otherSource.id, pos());
  assert.ok(s.applyHeroEffect({ ...f.start, source: otherSource.id }).ok);
  assert.ok(s.applyHeroEffect({ ...pulse, source: otherSource.id }).ok); assert.equal(s.applyHeroEffect({ ...pulse, source: otherSource.id }).reason, 'application budget exhausted');
  for (let i = 0; i < 60; i++) s.step(.05);
  assert.equal(s.applyHeroEffect(pulse).ok, false); assert.ok(s.applyHeroEffect({ ...f.start, deploymentId: 2 }).ok);
  assert.ok(s.applyHeroEffect({ ...pulse, deploymentId: 2 }).ok);
  assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).killed); assert.equal(s.applyHeroEffect({ ...pulse, deploymentId: 2 }).ok, false);
  near(s.stats(e.id).moveSpeed, 4.8); for (let i = 0; i < 10; i++) s.step(.05); near(s.stats(e.id).moveSpeed, 8);
  s.step(h.respawnRemaining); s.moveHero(h.id, pos()); assert.ok(s.applyHeroEffect({ ...f.start, deploymentId: 3 }).ok);
  assert.ok(s.applyHeroEffect({ ...pulse, deploymentId: 3 }).ok); assert.equal(s.applyHeroEffect({ ...pulse, deploymentId: 3 }).reason, 'application budget exhausted');
  const uncapped = anchoredSlowFixture(); for (let i = 0; i < 5; i++) assert.ok(uncapped.s.applyHeroEffect(uncapped.pulse).ok);
  assert.equal(uncapped.s.applyHeroEffect({ ...uncapped.pulse, maxApplicationsPerTarget: 1 }).ok, false, 'event cannot opt into an absent baseline budget');
});

test('independent slow lifetime is host-owned for pure and damaging paths; omission preserves legacy lifetime', () => {
  for (const damaging of [false, true]) for (const separate of [false, true]) {
    const change = { duration: 3, ...(separate ? { slowDuration: .5 } : {}) };
    if (damaging) Object.assign(change, { baseDamage: 10, damageType: 'spirit' });
    const { s, h, e, a, event } = statusFixture(change), hp = e.hp, start = s.time;
    event.kind = damaging ? 'damage' : 'status';
    assert.ok(s.applyHeroEffect(event).ok);
    if (!damaging) assert.equal(s.events.filter(x => x.type === 'status').at(-1).duration, separate ? .5 : 3, 'status telemetry reports applied slow lifetime, not owner duration');
    assert.equal(e.hp < hp, damaging); near(s.stats(e.id).moveSpeed, 4.8);
    for (let i = 0; i < 9; i++) s.step(.05);
    near(s.stats(e.id).moveSpeed, 4.8); s.step(.05);
    near(s.stats(e.id).moveSpeed, separate ? 8 : 4.8);
    assert.equal(a.duration, 3); near(s.time, start + .5);
    s.step(2.5); near(s.stats(e.id).moveSpeed, 8);
  }
  const f = statusFixture({ duration: .5, slowDuration: 1 });
  assert.ok(f.s.applyHeroEffect(f.event).ok); f.s.step(.5); near(f.s.stats(f.e.id).moveSpeed, 4.8);
  f.s.step(.5); near(f.s.stats(f.e.id).moveSpeed, 8);
  const s = createSystems(), h = hero(s), kit = structuredClone(kits[0]), buff = kit.abilities[3];
  Object.assign(buff, { duration: 3, slowDuration: .5 });
  assert.ok(s.configureHeroKit(h.id, kit).ok); s.step(30); quiet(s);
  assert.ok(s.applyHeroEffect(intent(h, buff, 'buff', h, { invulnerable: true, speedMultiplier: 1.5 })).ok);
  s.step(.5); assert.equal(s.stats(h.id).invulnerable, true); near(s.stats(h.id).moveSpeed, 12);
  s.step(2.5); assert.equal(s.stats(h.id).invulnerable, false); near(s.stats(h.id).moveSpeed, 8);
});

test('slowDuration first admission rejects transactionally and immutable host baselines reject event overrides', () => {
  for (const value of [undefined, null, 0, -1, NaN, Infinity, 3600.01, '.5', false, {}]) {
    const s = createSystems(), h = hero(s, 'invalid-slow', 'carbon', 1600), input = structuredClone(kits[0]);
    input.abilities[1].slowDuration = value;
    const before = structuredClone({ hero: h, stats: s.stats(h.id), events: s.events });
    assert.equal(s.configureHeroKit(h.id, input).ok, false, String(value));
    assert.deepEqual({ hero: h, stats: s.stats(h.id), events: s.events }, before);
    assert.ok(s.configureHeroKit(h.id, kits[0]).ok, 'invalid slowDuration does not partially register');
  }
  for (const value of [Number.MIN_VALUE, 3600]) {
    const s = createSystems(), h = hero(s), input = structuredClone(kits[0]);
    input.abilities[1].slowDuration = value; assert.ok(s.configureHeroKit(h.id, input).ok);
  }
  for (const damaging of [false, true]) {
    const { s, h, e, a, event, resources } = statusFixture({ duration: 3, slowDuration: .5,
      ...(damaging ? { baseDamage: 10, damageType: 'spirit' } : {}) });
    event.kind = damaging ? 'damage' : 'status';
    a.slowDuration = 20; a.duration = 300;
    assert.ok(s.applyHeroEffect({ ...event, slowDuration: .5 }).ok);
    for (const slowDuration of [undefined, null, 0, -.5, NaN, Infinity, '.5', false, {}, 3, 20]) {
      const before = resources(), speed = s.stats(e.id).moveSpeed, events = structuredClone(s.events);
      assert.equal(s.applyHeroEffect({ ...event, slowDuration }).ok, false);
      assert.equal(resources(), before); near(s.stats(e.id).moveSpeed, speed); assert.deepEqual(s.events, events);
    }
    s.step(.5); near(s.stats(e.id).moveSpeed, 8);
    assert.ok(s.applyHeroEffect(event).ok, 'omitted event field uses immutable configured value');
    s.step(.5); near(s.stats(e.id).moveSpeed, 8); assert.equal(s.stats(h.id).kitId, kits[0].id);
  }
});

test('independent slow refresh/strongest-source ownership and tether cleanup keep existing semantics', () => {
  const { s, e, kit, event } = statusFixture({ duration: 3, slowDuration: .5 });
  const second = hero(s, 'independent-second'), stronger = structuredClone(kit);
  Object.assign(stronger.abilities[1], { slow: .6, slowDuration: .25 });
  s.moveHero(second.id, pos(1)); assert.ok(s.configureHeroKit(second.id, stronger).ok);
  assert.ok(s.applyHeroEffect(event).ok); s.step(.25);
  assert.ok(s.applyHeroEffect(event).ok);
  assert.ok(s.applyHeroEffect(intent(second, stronger.abilities[1], 'status', e)).ok);
  near(s.stats(e.id).moveSpeed, 3.2); s.step(.25); near(s.stats(e.id).moveSpeed, 4.8);
  s.step(.25); near(s.stats(e.id).moveSpeed, 8);
  const tetherKit = structuredClone(kits[2]), caster = hero(s, 'independent-tether');
  const tether = tetherKit.abilities.find(x => x.id === 'tether'); tether.slowDuration = .5;
  assert.ok(s.configureHeroKit(caster.id, tetherKit).ok); s.moveHero(caster.id, pos(1));
  assert.ok(s.applyHeroEffect(intent(caster, tether, 'damage', e)).ok); assert.ok(s.stats(e.id).moveSpeed < 8);
  assert.ok(s.applyHeroEffect(intent(caster, tether, 'tether-end', e)).ok); near(s.stats(e.id).moveSpeed, 8);
});

test('status-only fractional slow changes hero/trooper movement, never HP/ammo/economy; strongest source ownership and expiry', () => {
  const { s, h, e, kit, a, event, resources } = statusFixture(), before = resources();
  assert.ok(s.applyHeroEffect(event).ok); near(s.stats(e.id).moveSpeed, 4.8); assert.equal(resources(), before);
  assert.equal(s.events.filter(x => x.type === 'damage' || x.type === 'heal').length, 0);
  const second = hero(s, 'second-status'), stronger = structuredClone(kit);
  Object.assign(stronger.abilities[1], { slow: .6, duration: .5 }); s.moveHero(second.id, pos(1));
  assert.ok(s.configureHeroKit(second.id, stronger).ok);
  assert.ok(s.applyHeroEffect(intent(second, stronger.abilities[1], 'status', e)).ok);
  assert.ok(s.applyHeroEffect(event).ok); near(s.stats(e.id).moveSpeed, 3.2); // Strongest, not multiplied.
  s.step(.5); near(s.stats(e.id).moveSpeed, 4.8); s.step(1.5); near(s.stats(e.id).moveSpeed, 8);
  const t = s.troopers.find(x => x.team === 'ivory'); t.position = pos(4);
  s.moveHero(h.id, pos()); const troopHP = t.hp;
  assert.ok(s.applyHeroEffect(intent(h, a, 'status', t)).ok); assert.equal(t.hp, troopHP);
  for (const x of s.heroes) s.moveHero(x.id, pos(8000));
  const marched = t.distanceMarched; s.step(.5); near(t.distanceMarched - marched, 8 * .5 * .6);
  assert.equal(t.hp, troopHP);
});
test('status-only intent rejects malformed/spoofed/HP/role/root payloads and hostile boundary failures without mutation', () => {
  const f = statusFixture(), { s, h, e, ally, event, resources } = f;
  const rejected = candidate => {
    const before = resources(), speed = s.stats(e.id).moveSpeed, count = s.events.length;
    assert.equal(s.applyHeroEffect(candidate).ok, false); assert.equal(resources(), before);
    near(s.stats(e.id).moveSpeed, speed); assert.equal(s.events.length, count);
  };
  for (const extra of [{ baseDamage: 1 }, { baseHeal: 1 }, { spiritScale: 1 }, { slow: 1 }, { slow: 0 }, { slow: NaN },
    { duration: 0 }, { duration: Infinity }, { damageType: 'spirit' }, { source: 'missing' }, { team: 'ivory' },
    { target: 'missing' }, { target: ally.id }, { target: h.id }, { ability: 'missing' }, { headshot: true },
    { invulnerable: true }, { speedMultiplier: 2 }, { origin: pos(Infinity) }, { baseHeal: undefined }]) rejected({ ...event, ...extra });
  for (const definition of [f.kit.weapon, f.kit.melee]) rejected(intent(h, definition, 'status', e));
  s.moveHero(e.id, pos(13)); rejected({ ...event, origin: pos(13) }); s.moveHero(e.id, pos(4));
  const structure = s.structures.find(x => x.team === 'ivory'); s.moveHero(h.id, structure.position);
  rejected({ ...event, target: structure.id }); s.moveHero(h.id, pos());
  assert.ok(s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff', e, { invulnerable: true, speedMultiplier: 1.5 })).ok);
  rejected(event); s.applyHeroEffect(intent(e, kits[0].abilities[3], 'buff-end', e));
  for (const change of [{ slow: 0 }, { slow: 1 }, { slow: .900001 }, { slow: .95 }, { slow: .99 }, { duration: 0 }, { range: 0 }, { baseDamage: 1 }, { baseHeal: 1 },
    { spiritScale: 1 }, { damageType: 'spirit' }, { invulnerable: true }, { speedMultiplier: 2 }, { headshotMultiplier: 2 }]) {
    const x = statusFixture(change); const before = x.resources();
    assert.equal(x.s.applyHeroEffect(x.event).ok, false); assert.equal(x.resources(), before); near(x.s.stats(x.e.id).moveSpeed, 8);
  }
  const pre = statusFixture({}, false); assert.equal(pre.s.applyHeroEffect(pre.event).reason, 'match inactive');
  assert.ok(s.damage(e.id, 1e6, h.id, { kind: 'ability' }).ok); rejected(event);
  s.step(e.respawnRemaining); quiet(s); s.moveHero(e.id, pos(4));
  assert.ok(s.damage(h.id, 1e6, e.id, { kind: 'ability' }).ok); rejected(event);
  const end = statusFixture();
  for (const target of end.s.structures.filter(x => x.team === 'ivory' && x.type !== 'patron')) strike(end.s, end.h, target);
  const patron = end.s.structures.find(x => x.team === 'ivory' && x.type === 'patron'); strike(end.s, end.h, patron); strike(end.s, end.h, patron);
  assert.equal(end.s.phase, 'finished'); assert.equal(end.s.applyHeroEffect(end.event).reason, 'match inactive');
});
test('status-only .4/.9 agree with actual controller motion and one scaling, with normal dt and real clock expiry', () => {
  for (const slow of [.4, .9]) {
    const { s, e, a, event } = statusFixture({ slow }), start = s.time, hp = e.hp;
    const controller = new PlayerController({ position: e.position });
    assert.ok(s.applyHeroEffect(event).ok);
    const expected = 8 * (1 - slow), speed = () => Math.hypot(controller.velocity.x, controller.velocity.z);
    const step = () => {
      controller.speedMultiplier = s.stats(e.id).moveSpeed / 8; // Same single systems->controller bridge as production.
      controller.update(.05, { forward: 1 });
      assert.ok(s.moveHero(e.id, controller.position).ok); assert.ok(s.step(.05).ok);
    };
    for (let i = 0; i < 10; i++) step();
    near(s.stats(e.id).moveSpeed, expected); near(speed(), expected);
    const before = controller.position.clone();
    for (let i = 0; i < 10; i++) step();
    near(controller.position.distanceTo(before), expected * .5); near(speed(), expected);
    near(s.time, start + 1); assert.equal(e.hp, hp);
    for (let i = 0; i < 20; i++) step();
    near(s.time, start + a.duration); near(s.stats(e.id).moveSpeed, 8, 1e-6);
    for (let i = 0; i < 10; i++) step();
    near(speed(), 8); assert.equal(e.hp, hp);
  }
});
test('status-only hostile cast cancels caster cloak/recall, not victim recall; victim death clears slow', () => {
  const { s, h, e, a, event } = statusFixture({ duration: 30 });
  const cloaked = hero(s, 'cloaked-status', 'carbon', 4000), kit = structuredClone(kits[0]);
  Object.assign(kit.abilities[1], a); assert.ok(s.configureHeroKit(cloaked.id, kit).ok);
  assert.ok(s.buyItem(cloaked.id, 'shadow-cloak').ok); s.moveHero(cloaked.id, pos());
  assert.ok(s.activateItem(cloaked.id, 'shadow-cloak').ok); assert.ok(cloaked.cloakUntil > s.time);
  assert.ok(s.applyHeroEffect(intent(cloaked, a, 'status', e)).ok); assert.equal(cloaked.cloakUntil, 0);
  const ring = s.retreatRings.find(x => x.team === 'carbon'); s.moveHero(h.id, ring.position); s.moveHero(e.id, { ...ring.position, x: ring.position.x + 3 });
  s.setRetreat(h.id, true); s.step(.05); assert.ok(h.recall);
  assert.ok(s.applyHeroEffect(event).ok); assert.equal(h.recall, null); assert.equal(h.recallBlocked, true);
  s.setRetreat(h.id, false);
  const enemyRing = s.retreatRings.find(x => x.team === 'ivory'); s.moveHero(e.id, enemyRing.position); s.moveHero(h.id, { ...enemyRing.position, x: enemyRing.position.x + 3 });
  s.setRetreat(e.id, true); s.step(.05); const recall = structuredClone(e.recall); assert.ok(recall);
  const hp = e.hp; assert.ok(s.applyHeroEffect(event).ok); assert.equal(e.hp, hp); assert.deepEqual(e.recall, recall);
  assert.ok(s.damage(e.id, 1e6, h.id, { kind: 'ability' }).ok); near(s.stats(e.id).moveSpeed, 8);
  s.step(e.respawnRemaining); quiet(s); near(s.stats(e.id).moveSpeed, 8);
});

// This fixture is scripted API combat, not native input/hardware acceptance.
// No objective health assignments, vulnerability bypass, or winner assignment.
function scriptedMatch() {
  let world;
  try { world = JSON.parse(readFileSync(new URL('../../docs/jank3d-spawns.json', import.meta.url), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const s = createSystems(world);
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
  const falls = timeline.filter(e => e.type === 'objective_fall' && e.team === 'ivory');
  for (const lane of s.lanes) {
    const laneFalls = falls.filter(e => e.lane === lane.id);
    const guardian = laneFalls.find(e => e.objective === 'guardian'), walker = laneFalls.find(e => e.objective === 'walker');
    assert.ok(guardian.time < walker.time);
    const bases = laneFalls.filter(e => e.objective === 'base-guardian'), shrines = laneFalls.filter(e => e.objective === 'shrine');
    assert.equal(bases.length, 2); assert.equal(shrines.length, 2);
    assert.ok(bases.every(e => e.time > walker.time));
    assert.ok(shrines.every(e => e.time > Math.max(...bases.map(b => b.time))));
  }
  const phase2 = timeline.find(e => e.type === 'patron_phase'), win = timeline.find(e => e.type === 'victory');
  assert.ok(phase2.time > Math.max(...falls.filter(e => e.objective === 'shrine').map(e => e.time)));
  assert.ok(win.time > phase2.time);
  return { fixture: 'scripted 600-second API match, not native acceptance', durationSeconds: 600, world: world ? 'local docs/jank3d-spawns.json, metres' : 'procedural three-lane fallback, metres', buffs: [],
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
if (!process.argv.includes('--no-evidence')) {
  diskGuard(); mkdirSync(dirname(evidence), { recursive: true });
  diskGuard(); writeFileSync(evidence, JSON.stringify(receipt, null, 2) + '\n');
}
console.log(`scripted match: ${receipt.winner}; ${receipt.summary.waveCount} waves; ${receipt.summary.trooperCombatHits} trooper hits; ${receipt.summary.trooperObjectiveHits} objective hits (${receipt.summary.trooperObjectiveDamage} damage)`);
console.log(process.argv.includes('--no-evidence') ? 'timeline write skipped (--no-evidence)' : 'timeline: docs/maintenance/audits/jankolock-3d-qa/systems-timeline.json');
console.log(`${groups} regression groups completed; scripted match completed`);
