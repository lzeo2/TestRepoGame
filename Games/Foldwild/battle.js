import { BY_ID, ABILITIES, ELEMENT_WHEEL } from './data.js';

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
  const stats = Object.fromEntries(Object.entries(s.stats).map(([key, value]) =>
    [key, Math.max(1, Math.floor(value * scale))]));
  return { ...stats, maxHP: stats.hp, maxEnergy: stats.energy };
}

export function createCreature(speciesId, level = 3, uid = 'c1') {
  if (typeof uid !== 'string' || !uid.length) throw new TypeError('Invalid creature uid.');
  const c = { uid, speciesId, level, xp: 0, hp: 0, energy: 0,
    status: null, shield: null, buffs: {}, turnsTaken: 0 };
  const s = statsFor(c);
  c.hp = s.maxHP;
  c.energy = s.maxEnergy;
  return c;
}

function validateEffect(effect, c) {
  integer(effect.remaining, 1, 2, 'effect duration');
  integer(effect.appliedAt, 0, c.turnsTaken, 'effect timestamp');
}

// Caps finite HP/energy; rejects corrupt numbers, identities and battle effects.
export function normalizeCreature(creature) {
  const c = structuredClone(creature);
  const s = statsFor(c);
  if (typeof c.uid !== 'string' || !c.uid.length) throw new TypeError('Invalid creature uid.');
  if (finite(c.xp ?? 0, 'xp') < 0 || !Number.isSafeInteger(c.xp ?? 0)) throw new RangeError('Invalid xp.');
  c.xp ??= 0;
  c.hp = clamp(finite(c.hp, 'hp'), 0, s.maxHP);
  c.energy = clamp(finite(c.energy, 'energy'), 0, s.maxEnergy);
  c.turnsTaken ??= 0;
  integer(c.turnsTaken, 0, Number.MAX_SAFE_INTEGER - 2, 'turn counter');
  c.status ??= null;
  c.shield ??= null;
  c.buffs ??= {};
  if (c.status) {
    if (!STATUSES.includes(c.status.name)) throw new RangeError('Unknown status.');
    validateEffect(c.status, c);
  }
  if (c.shield) {
    validateEffect(c.shield, c);
    if (finite(c.shield.hp, 'shield hp') <= 0 || c.shield.hp > 22) throw new RangeError('Invalid shield.');
  }
  if (!c.buffs || typeof c.buffs !== 'object' || Array.isArray(c.buffs)) throw new TypeError('Invalid buffs.');
  for (const [stat, modifier] of Object.entries(c.buffs)) {
    if (!STATS.includes(stat)) throw new RangeError('Unknown stat modifier.');
    validateEffect(modifier, c);
    if (finite(modifier.percent, 'modifier percent') < -30 || modifier.percent > 30 || modifier.percent === 0) {
      throw new RangeError('Invalid modifier.');
    }
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
  return c;
}
export const GainXP = gainXP;

function teamCopy(team, max) {
  if (!Array.isArray(team) || !team.length || team.length > max) throw new RangeError('Invalid team size.');
  return team.map(normalizeCreature);
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

export function createBattle(playerTeam, enemyTeam, { kind = 'wild', seed = 1, active = 0 } = {}) {
  if (!['wild', 'rival'].includes(kind)) throw new RangeError('Invalid battle kind.');
  integer(seed, 0, 0xffffffff, 'seed');
  const player = teamCopy(playerTeam, 3);
  const enemy = teamCopy(enemyTeam, kind === 'wild' ? 1 : 3);
  integer(active, 0, player.length - 1, 'active index');
  const b = { player: { team: player, active }, enemy: { team: enemy, active: 0 },
    kind, seed, round: 1, phase: 'command', result: null, log: [], captured: null };
  settle(b);
  return b;
}

function snapshot(battle) {
  const b = structuredClone(battle);
  if (!b || !['wild', 'rival'].includes(b.kind)) throw new RangeError('Invalid battle.');
  b.player.team = teamCopy(b.player.team, 3);
  b.enemy.team = teamCopy(b.enemy.team, b.kind === 'wild' ? 1 : 3);
  for (const side of [b.player, b.enemy]) integer(side.active, 0, side.team.length - 1, 'active index');
  integer(b.seed, 0, 0xffffffff, 'seed');
  integer(b.round, 1, Number.MAX_SAFE_INTEGER - 1, 'round');
  if (!Array.isArray(b.log) || b.log.some(line => typeof line !== 'string')) throw new TypeError('Invalid log.');
  if (!(b.result === null || RESULTS.includes(b.result)) ||
      b.phase !== (b.result ? 'ended' : 'command')) throw new RangeError('Invalid battle phase/result.');
  if (b.captured !== null) b.captured = normalizeCreature(b.captured);
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
function chooseEnemy(c, b) {
  const choices = speciesFor(c).abilities.map((name, slot) => ({ name, slot, ...ABILITIES[name] }))
    .filter(a => cost(c, a) <= c.energy);
  // Low-HP healing has priority on alternate turns, so restore/heal cannot lock out attacks.
  let best = c.hp < statsFor(c).maxHP * 0.3 && c.turnsTaken % 2 === 0 ? choices.filter(a => a.heal) : [];
  if (!best.length) best = choices.filter(a => a.power);
  if (best.length) {
    const max = Math.max(...best.map(a => a.power ?? a.heal));
    best = best.filter(a => (a.power ?? a.heal) === max);
  } else {
    best = choices.filter(a => a.restore);
    if (!best.length) best = choices;
    const min = Math.min(...best.map(a => a.cost));
    best = best.filter(a => a.cost === min);
  }
  if (!best.length) return { type: 'wait' };
  const selected = best.length === 1 ? best[0] : best[Math.floor(random(b) * best.length)];
  return { type: 'ability', slot: selected.slot };
}
function perform(c, target, action, b) {
  if (c.hp <= 0 || target.hp <= 0) return;
  c.turnsTaken++;
  const name = action.type === 'ability' ? speciesFor(c).abilities[action.slot] : null;
  const a = name ? ABILITIES[name] : null;
  if (!a || cost(c, a) > c.energy) {
    c.energy = Math.min(statsFor(c).maxEnergy, c.energy + 3);
    b.log.push(`${c.uid} waited and restored 3 energy.`);
  } else {
    c.energy -= cost(c, a);
    b.log.push(`${c.uid} used ${name}.`);
    if (a.power) {
      const own = speciesFor(c).element;
      const other = speciesFor(target).element;
      const multiplier = ELEMENT_WHEEL[own] === other ? 1.5 : ELEMENT_WHEEL[other] === own ? 0.75 : 1;
      let damage = Math.max(1, Math.floor(a.power * effective(c, 'attack') / effective(target, 'defense') * multiplier));
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
    if (a.shield) c.shield = { hp: a.shield, ...timed(c) };
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
function notice(b, message) { b.log.push(message); return b; }

export function applyAction(battle, action) {
  const b = snapshot(battle);
  if (b.result) return b;
  settle(b);
  if (b.result) return b;
  if (!action || !['ability', 'wait', 'switch', 'capture', 'flee'].includes(action.type)) {
    return notice(b, 'Invalid action.');
  }
  let player = activeCreature(b.player);
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
    const chance = clamp(0.12 + 0.75 * (1 - enemy.hp / statsFor(enemy).maxHP) + (enemy.status ? 0.08 : 0), 0, 0.9);
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
  if (action.type === 'switch') {
    // Keep the owner's counter monotonic inside a battle; clearEffects is also an outside-battle reset.
    const turns = player.turnsTaken + 1;
    b.player.team[b.player.active] = clearEffects(player);
    b.player.team[b.player.active].turnsTaken = turns;
    b.player.active = action.index;
    player = activeCreature(b.player);
    b.log.push(`Switched to ${player.uid}.`);
  }
  const enemyAction = chooseEnemy(enemy, b);
  if (action.type === 'capture' || action.type === 'switch') {
    if (player.hp > 0) perform(enemy, player, enemyAction, b);
  } else {
    const order = effective(player, 'speed') >= effective(enemy, 'speed')
      ? [[player, enemy, action], [enemy, player, enemyAction]]
      : [[enemy, player, enemyAction], [player, enemy, action]];
    for (const [actor, target, command] of order) perform(actor, target, command, b);
  }
  b.round++;
  settle(b);
  return b;
}
