import { BY_ID, ABILITIES, ELEMENT_WHEEL } from './data.js';
import { validateIndividual, TRAITS, perksFor, synergyFor } from './builds.js';

const STATS = ['attack', 'defense', 'speed'];
const STATUS_STAT = { Drag: 'speed', Fray: 'defense', Haze: 'attack' };
const STATUSES = ['Scorch', 'Drag', 'Fray', 'Haze', 'Hush'];
const RESULTS = ['won', 'lost', 'captured', 'fled'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function finite(n, label) {
  if (!Number.isFinite(n)) throw new TypeError(`${label} must be finite.`);
  return n;
}
function integer(n, min, max, label) {
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new RangeError(`Invalid ${label}.`);
  return n;
}
function record(value, keys, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).some(key => !keys.includes(key) ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value;
}
function array(value, max, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      value.length > max || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError(`Invalid ${label}.`);
  for (let i = 0; i < value.length; i++) {
    const field = Object.getOwnPropertyDescriptor(value, String(i));
    if (!field || !Object.hasOwn(field, 'value')) throw new TypeError(`Invalid ${label}.`);
  }
  return value;
}
function rankFor(id, side, key = 'classRank') {
  const rank = Object.hasOwn(side, key) ? side[key] : id === 'none' ? 0 : 1;
  integer(rank, id === 'none' ? 0 : 1, id === 'none' ? 0 : 3, 'class rank');
  perksFor(id, rank);
  return rank;
}
function uidFor(uid) {
  if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(uid)) throw new TypeError('Invalid creature uid.');
  return uid;
}
function speciesFor(c) {
  if (!c || typeof c.speciesId !== 'string' || !Object.hasOwn(BY_ID, c.speciesId)) {
    throw new RangeError('Unknown species.');
  }
  integer(c.level, 1, 40, 'level');
  const s = BY_ID[c.speciesId];
  if (!Object.hasOwn(ELEMENT_WHEEL, s.element) || s.abilities.length !== 4 ||
      s.abilities.some(name => !Object.hasOwn(ABILITIES, name))) throw new TypeError('Invalid species data.');
  for (const key of ['hp', 'energy', ...STATS]) {
    if (finite(s.stats[key], `base ${key}`) < 1) throw new RangeError('Invalid base stat.');
  }
  return s;
}

// Maxima are level-scaled, never affected by temporary battle modifiers.
export function statsFor(creature) {
  const s = speciesFor(creature);
  const scale = 1 + 0.045 * (creature.level - 1);
  const { profile } = validateIndividual(creature);
  const stats = Object.fromEntries(Object.entries(s.stats).map(([key, value]) =>
    [key, Math.max(1, Math.floor(value * scale * (1 + profile[key] / 100)))]));
  return { ...stats, maxHP: stats.hp, maxEnergy: stats.energy };
}

export function createCreature(speciesId, level = 3, uid = 'c1', options = {}) {
  record(options, ['profile', 'traitId', 'cosmeticId'], 'creature options');
  const c = { uid: uidFor(uid), speciesId, level, xp: 0, hp: 0, energy: 0,
    status: null, shield: null, buffs: {}, turnsTaken: 0, ...validateIndividual(options) };
  const s = statsFor(c);
  c.hp = s.maxHP;
  c.energy = s.maxEnergy;
  return c;
}

function validateEffect(effect, c, extra) {
  record(effect, ['remaining', 'appliedAt', extra], 'effect');
  integer(effect.remaining, 1, 2, 'effect duration');
  integer(effect.appliedAt, 0, c.turnsTaken, 'effect timestamp');
}

// Caps finite HP/energy; rejects corrupt numbers, identities and battle effects.
export function normalizeCreature(creature) {
  record(creature, ['uid', 'speciesId', 'level', 'xp', 'hp', 'energy', 'status',
    'shield', 'buffs', 'turnsTaken', 'profile', 'traitId', 'cosmeticId'], 'creature');
  const c = { uid: uidFor(creature.uid), speciesId: creature.speciesId, level: creature.level,
    xp: integer(creature.xp ?? 0, 0, Number.MAX_SAFE_INTEGER, 'xp'),
    hp: finite(creature.hp, 'hp'), energy: finite(creature.energy, 'energy'),
    turnsTaken: integer(creature.turnsTaken ?? 0, 0, Number.MAX_SAFE_INTEGER - 2, 'turn counter'),
    status: null, shield: null, buffs: {}, ...validateIndividual(creature) };
  const s = statsFor(c);
  c.hp = clamp(c.hp, 0, s.maxHP);
  c.energy = clamp(c.energy, 0, s.maxEnergy);
  if (creature.status != null) {
    validateEffect(creature.status, c, 'name');
    if (!STATUSES.includes(creature.status.name)) throw new RangeError('Unknown status.');
    c.status = { ...creature.status };
  }
  if (creature.shield != null) {
    validateEffect(creature.shield, c, 'hp');
    if (finite(creature.shield.hp, 'shield hp') <= 0 || creature.shield.hp > 26) throw new RangeError('Invalid shield.');
    c.shield = { ...creature.shield };
  }
  const buffs = record(creature.buffs ?? {}, STATS, 'buffs');
  for (const [stat, modifier] of Object.entries(buffs)) {
    validateEffect(modifier, c, 'percent');
    if (finite(modifier.percent, 'modifier percent') < -30 || modifier.percent > 30 || modifier.percent === 0) {
      throw new RangeError('Invalid modifier.');
    }
    c.buffs[stat] = { ...modifier };
  }
  return c;
}

export function clearEffects(creature) {
  const c = normalizeCreature(creature);
  c.status = null;
  c.shield = null;
  c.buffs = {};
  c.turnsTaken = 0;
  return c;
}

export function gainXP(creature, amount) {
  integer(amount, 0, Number.MAX_SAFE_INTEGER, 'xp amount');
  const c = normalizeCreature(creature);
  integer(c.xp + amount, 0, Number.MAX_SAFE_INTEGER, 'total xp');
  c.xp += amount;
  while (c.level < 40 && c.xp >= 30 + 12 * c.level) {
    const before = statsFor(c);
    c.xp -= 30 + 12 * c.level;
    c.level++;
    let s = speciesFor(c);
    while (s.evolvesTo && c.level >= s.evolveLevel) {
      c.speciesId = s.evolvesTo;
      s = speciesFor(c);
    }
    const after = statsFor(c);
    // Level gains are deltas, not a full heal; defeated creatures stay defeated.
    if (c.hp > 0) c.hp = clamp(c.hp + after.maxHP - before.maxHP, 1, after.maxHP);
    c.energy = clamp(c.energy + after.maxEnergy - before.maxEnergy, 0, after.maxEnergy);
  }
  // Retain accepted XP at level 40 without exceeding the world's save ceiling.
  c.xp = Math.min(c.xp, 1e6);
  return c;
}
export const GainXP = gainXP;

function teamCopy(team, max) {
  array(team, max, 'team');
  if (!team.length) throw new RangeError('Invalid team size.');
  const copy = team.map(normalizeCreature);
  if (new Set(copy.map(c => c.uid)).size !== copy.length) throw new RangeError('Duplicate team uid.');
  return copy;
}
function activeCreature(side) { return side.team[side.active]; }
function settle(b) {
  for (const side of [b.player, b.enemy]) {
    if (activeCreature(side).hp <= 0) {
      const index = side.team.findIndex(c => c.hp > 0);
      if (index >= 0) side.active = index;
    }
  }
  if (!b.player.team.some(c => c.hp > 0)) b.result = 'lost';
  else if (!b.enemy.team.some(c => c.hp > 0)) b.result = 'won';
  if (b.result) b.phase = 'ended';
}

export function createBattle(playerTeam, enemyTeam, options = {}) {
  record(options, ['kind', 'seed', 'active', 'classId', 'enemyClassId', 'synergyEnabled',
    'classRank', 'enemyClassRank'], 'battle options');
  const { kind = 'wild', seed = 1, active = 0, classId = 'none', enemyClassId = 'none', synergyEnabled = false } = options;
  const classRank = rankFor(classId, options), enemyClassRank = rankFor(enemyClassId, options, 'enemyClassRank');
  if (!['wild', 'rival'].includes(kind)) throw new RangeError('Invalid battle kind.');
  integer(seed, 0, 0xffffffff, 'seed');
  const player = teamCopy(playerTeam, 3);
  const enemy = teamCopy(enemyTeam, kind === 'wild' ? 1 : 3);
  integer(active, 0, player.length - 1, 'active index');
  if (typeof synergyEnabled !== 'boolean') throw new TypeError('Invalid synergy flag.');
  const b = { player: { team: player, active, classId, classRank, synergyId: synergyFor(player).id },
    enemy: { team: enemy, active: 0, classId: enemyClassId, classRank: enemyClassRank, synergyId: synergyFor(enemy).id },
    synergyEnabled, kind, seed, round: 1, phase: 'command', result: null, log: [], captured: null };
  settle(b);
  return b;
}

// Persistence boundary: copy canonical fields and derive bonuses, never import live perks.
export function validateBattle(battle) {
  record(battle, ['player', 'enemy', 'synergyEnabled', 'kind', 'seed', 'round', 'phase',
    'result', 'log', 'captured'], 'battle');
  if (!['wild', 'rival'].includes(battle.kind)) throw new RangeError('Invalid battle kind.');
  const sides = {};
  for (const name of ['player', 'enemy']) {
    const raw = record(battle[name], ['team', 'active', 'classId', 'classRank', 'synergyId'], 'battle side');
    const team = teamCopy(raw.team, name === 'enemy' && battle.kind === 'wild' ? 1 : 3);
    const classId = raw.classId === undefined ? 'none' : raw.classId;
    const classRank = rankFor(classId, raw);
    const synergyId = synergyFor(team).id;
    if (raw.synergyId !== undefined && raw.synergyId !== synergyId) throw new RangeError('Invalid derived synergy.');
    sides[name] = { team, active: integer(raw.active, 0, team.length - 1, 'active index'), classId, classRank, synergyId };
  }
  const synergyEnabled = battle.synergyEnabled === undefined ? false : battle.synergyEnabled;
  if (typeof synergyEnabled !== 'boolean') throw new TypeError('Invalid synergy flag.');
  integer(battle.seed, 0, 0xffffffff, 'seed');
  integer(battle.round, 1, Number.MAX_SAFE_INTEGER - 1, 'round');
  array(battle.log, 128, 'log');
  if (battle.log.some(line => typeof line !== 'string' || line.length > 512)) throw new TypeError('Invalid log.');
  if (!(battle.result === null || RESULTS.includes(battle.result)) ||
      battle.phase !== (battle.result ? 'ended' : 'command')) throw new RangeError('Invalid battle phase/result.');
  const captured = battle.captured === null ? null : normalizeCreature(battle.captured);
  if ((battle.result === 'captured') !== (captured !== null) ||
      (captured && (battle.kind !== 'wild' || sides.enemy.team[0].hp <= 0 ||
        sides.enemy.team[0].hp > statsFor(sides.enemy.team[0]).maxHP * 0.5))) {
    throw new RangeError('Invalid captured creature.');
  }
  if (captured) {
    const expected = clearEffects(sides.enemy.team[0]);
    expected.hp = Math.max(1, expected.hp);
    if (JSON.stringify(captured) !== JSON.stringify(expected)) throw new RangeError('Invalid captured creature.');
  }
  const playerAlive = sides.player.team.some(c => c.hp > 0), enemyAlive = sides.enemy.team.some(c => c.hp > 0);
  if ((battle.result === 'won' && (!playerAlive || enemyAlive)) ||
      (battle.result === 'lost' && playerAlive) ||
      (['captured', 'fled'].includes(battle.result) && (!playerAlive || !enemyAlive || battle.kind !== 'wild'))) {
    throw new RangeError('Invalid battle outcome.');
  }
  const b = { ...sides, synergyEnabled, kind: battle.kind, seed: battle.seed, round: battle.round,
    phase: battle.phase, result: battle.result, log: [...battle.log], captured };
  if (new TextEncoder().encode(JSON.stringify(b)).length > 256 * 1024) throw new RangeError('Battle snapshot too large.');
  return b;
}
function random(b) {
  b.seed = (Math.imul(1664525, b.seed) + 1013904223) >>> 0;
  return b.seed / 0x100000000;
}
function effective(c, stat) {
  let percent = c.buffs[stat]?.percent ?? 0;
  // Status and modifiers of the same stat replace each other at application.
  if (STATUS_STAT[c.status?.name] === stat) percent = -20;
  return Math.max(1, Math.floor(statsFor(c)[stat] * (1 + percent / 100)));
}
function cost(c, ability) { return ability.cost + (c.status?.name === 'Hush' ? 2 : 0); }
function timed(c) { return { remaining: 2, appliedAt: c.turnsTaken }; }
function endTurn(c, b) {
  if (c.status && c.turnsTaken > c.status.appliedAt) {
    if (c.status.name === 'Scorch' && c.hp > 0) {
      c.hp = Math.max(0, c.hp - 6);
      b.log.push(`${c.uid} took 6 Scorch damage.`);
    }
    if (--c.status.remaining === 0) c.status = null;
  }
  if (c.shield && c.turnsTaken > c.shield.appliedAt && --c.shield.remaining === 0) c.shield = null;
  for (const [stat, modifier] of Object.entries(c.buffs)) {
    if (c.turnsTaken > modifier.appliedAt && --modifier.remaining === 0) delete c.buffs[stat];
  }
}
function matchup(c, target) {
  const own = speciesFor(c).element, other = speciesFor(target).element;
  return ELEMENT_WHEEL[own] === other ? 1.5 : ELEMENT_WHEEL[other] === own ? 0.75 : 1;
}
function attackDamage(c, target, a) {
  return Math.max(1, Math.floor(a.power * effective(c, 'attack') / effective(target, 'defense') * matchup(c, target)));
}
function chooseEnemy(b) {
  const c = activeCreature(b.enemy), target = activeCreature(b.player);
  // Only one decision every three rounds; the same target cannot provoke switch-back ping-pong.
  if (b.kind === 'rival' && b.round % 3 === 0) {
    const index = b.enemy.team.findIndex((reserve, i) => i !== b.enemy.active &&
      reserve.hp > statsFor(reserve).maxHP * 0.25 && matchup(reserve, target) >= matchup(c, target) + 0.5);
    if (index >= 0) return { type: 'switch', index };
  }
  const choices = speciesFor(c).abilities.map((name, slot) => ({ name, slot, ...ABILITIES[name] }))
    .filter(a => cost(c, a) <= c.energy);
  const attacks = choices.filter(a => a.power);
  const incoming = speciesFor(target).abilities.map(name => ABILITIES[name])
    .filter(a => a.power && cost(target, a) <= target.energy);
  // ponytail: one-turn threat scoring; add lookahead only if campaign balance tests expose bad choices.
  const threat = Math.max(0, ...incoming.map(a => attackDamage(target, c, a)));
  const max = statsFor(c);
  // Utility only on alternate owner turns. With an affordable attack, it never loops utility forever.
  const utilityTurn = c.turnsTaken % 2 === 0;
  const scores = choices.map(a => {
    let score = a.power ? attackDamage(c, target, a) : 0;
    if (utilityTurn) {
      if (a.heal && c.hp < max.maxHP * 0.3) score += Math.min(a.heal, max.maxHP - c.hp) + 100;
      if (a.cleanse && c.status) score += c.status.name === 'Scorch' ? 18 : 10;
      if (a.shield && !c.shield && c.hp < max.maxHP * 0.65 && threat >= c.hp * 0.25) {
        score += Math.min(a.shield, threat) + 30;
      }
      if (a.restore && max.maxEnergy - c.energy >= a.restore &&
          (!attacks.length || c.energy < 4)) score += a.restore + 30;
    }
    if (!attacks.length && a.restore) score += a.restore;
    return { ...a, score };
  }).filter(a => a.score > 0);
  if (!scores.length) return { type: 'wait' };
  const top = Math.max(...scores.map(a => a.score));
  const best = scores.filter(a => a.score === top);
  const selected = best.length === 1 ? best[0] : best[Math.floor(random(b) * best.length)];
  return { type: 'ability', slot: selected.slot };
}
function perform(b, side, action) {
  const c = activeCreature(side), target = activeCreature(side === b.player ? b.enemy : b.player);
  if (c.hp <= 0 || target.hp <= 0) return;
  const perks = perksFor(side.classId, side.classRank), trait = TRAITS[c.traitId].perks;
  const synergy = b.synergyEnabled ? synergyFor(side.team) : { switchEnergy: 0, shieldBonus: 0 };
  c.turnsTaken++;
  if (action.type === 'switch') {
    const turns = c.turnsTaken;
    side.team[side.active] = clearEffects(c);
    side.team[side.active].turnsTaken = turns;
    side.active = action.index;
    const incoming = activeCreature(side);
    const bonus = perks.switchEnergy + TRAITS[incoming.traitId].perks.switchEnergy + synergy.switchEnergy;
    incoming.energy = Math.min(statsFor(incoming).maxEnergy, incoming.energy + bonus);
    b.log.push(`Switched to ${incoming.uid}.`);
    return;
  }
  const name = action.type === 'ability' ? speciesFor(c).abilities[action.slot] : null;
  const a = name ? ABILITIES[name] : null;
  if (!a || cost(c, a) > c.energy) {
    const restored = 3 + trait.waitEnergy + perks.waitEnergy;
    c.energy = Math.min(statsFor(c).maxEnergy, c.energy + restored);
    b.log.push(`${c.uid} waited and restored ${restored} energy.`);
  } else {
    c.energy -= cost(c, a);
    b.log.push(`${c.uid} used ${name}.`);
    if (a.power) {
      let damage = attackDamage(c, target, a);
      const absorbed = Math.min(target.shield?.hp ?? 0, damage);
      if (target.shield) {
        target.shield.hp -= absorbed;
        if (target.shield.hp === 0) target.shield = null;
      }
      damage -= absorbed;
      target.hp = Math.max(0, target.hp - damage);
      b.log.push(`${target.uid} took ${damage} damage (${absorbed} shield).`);
    }
    if (a.heal) c.hp = Math.min(statsFor(c).maxHP, c.hp + a.heal);
    if (a.restore) c.energy = Math.min(statsFor(c).maxEnergy, c.energy + a.restore);
    if (a.shield) c.shield = { hp: Math.min(26, a.shield + perks.shieldBonus + trait.shieldBonus + synergy.shieldBonus), ...timed(c) };
    if (a.cleanse) c.status = null;
    if (a.buff) {
      if (STATUS_STAT[c.status?.name] === a.buff.stat) c.status = null;
      c.buffs[a.buff.stat] = { percent: a.buff.percent, ...timed(c) };
    }
    if (target.hp > 0 && a.debuff) {
      if (STATUS_STAT[target.status?.name] === a.debuff.stat) target.status = null;
      target.buffs[a.debuff.stat] = { percent: -a.debuff.percent, ...timed(target) };
    }
    if (target.hp > 0 && a.status) {
      const stat = STATUS_STAT[a.status];
      if (stat) delete target.buffs[stat];
      target.status = { name: a.status, ...timed(target) };
    }
  }
  endTurn(c, b);
}
function finish(b) { b.log = b.log.slice(-128); return b; }
function notice(b, message) { b.log.push(message); return finish(b); }

export function applyAction(battle, action) {
  const b = validateBattle(battle);
  if (b.result) return b;
  settle(b);
  if (b.result) return b;
  if (!action || !['ability', 'wait', 'switch', 'capture', 'flee'].includes(action.type)) {
    return notice(b, 'Invalid action.');
  }
  const player = activeCreature(b.player);
  const enemy = activeCreature(b.enemy);
  if (action.type === 'ability') {
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot > 3) return notice(b, 'Invalid ability slot.');
    if (cost(player, ABILITIES[speciesFor(player).abilities[action.slot]]) > player.energy) {
      return notice(b, 'Not enough energy.');
    }
  }
  if (action.type === 'switch') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= b.player.team.length ||
        action.index === b.player.active || b.player.team[action.index].hp <= 0) return notice(b, 'Cannot switch there.');
  }
  if (action.type === 'capture' && (b.kind !== 'wild' || enemy.hp <= 0 || enemy.hp > statsFor(enemy).maxHP * 0.5)) {
    return notice(b, 'Capture requires a living wild creature at half HP or less.');
  }
  if (action.type === 'flee') {
    if (b.kind !== 'wild') return notice(b, 'Cannot flee a rival battle.');
    b.result = 'fled';
    b.phase = 'ended';
    return notice(b, 'Fled the battle.');
  }
  if (action.type === 'capture') {
    const chance = clamp(0.12 + 0.75 * (1 - enemy.hp / statsFor(enemy).maxHP) +
      (enemy.status ? 0.08 : 0) + perksFor(b.player.classId, b.player.classRank).captureBonus + TRAITS[player.traitId].perks.captureBonus, 0, 0.9);
    if (random(b) < chance) {
      b.captured = clearEffects(enemy);
      b.captured.hp = Math.max(1, b.captured.hp);
      b.result = 'captured';
      b.phase = 'ended';
      return notice(b, 'Captured the wild creature.');
    }
    b.log.push('Capture missed.');
    player.turnsTaken++;
    endTurn(player, b);
  }
  if (action.type === 'switch') perform(b, b.player, action);
  const enemyAction = chooseEnemy(b);
  if (action.type === 'capture' || action.type === 'switch') {
    perform(b, b.enemy, enemyAction);
  } else if (enemyAction.type === 'switch') {
    // Switching consumes the enemy turn before an attack chooses its real incoming target.
    perform(b, b.enemy, enemyAction);
    perform(b, b.player, action);
  } else {
    const order = effective(player, 'speed') >= effective(enemy, 'speed')
      ? [[b.player, action], [b.enemy, enemyAction]]
      : [[b.enemy, enemyAction], [b.player, action]];
    for (const [side, command] of order) perform(b, side, command);
  }
  b.round++;
  settle(b);
  return finish(b);
}
