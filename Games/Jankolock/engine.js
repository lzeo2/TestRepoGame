import { ARENA, HEROES, RULES, statsFor, draftOffers, botItem } from './data.js';

const cores = new WeakMap();
const RADIUS = 15;
const EPS = 1e-7;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const heroFor = id => HEROES.find(hero => hero.id === id);
const clone = value => JSON.parse(JSON.stringify(value));

// The handle has no writable simulation fields. Only snapshot crosses into UI code.
export function createMatch(heroId = 'courier', seed = 240) {
  if (!heroFor(heroId)) heroId = 'courier';
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) seed = 240;
  const handle = Object.freeze({ get phase() { return cores.get(handle).phase; } });
  cores.set(handle, initialState(heroId, seed));
  return handle;
}

function initialState(heroId, seed) {
  return { phase: 'lobby', heroId, seed, rng: seed, round: 1,
    wins: [0, 0], influence: [0, 0], time: RULES.roundSeconds, suddenDeath: false,
    actors: [], bullets: [], effects: [], capture: emptyCapture(), offers: [],
    result: null, events: [], nextEvent: 1, nextEntity: 1, botPicks: [] };
}

function emptyCapture() { return { team: null, warm: 0, contested: false, counts: [0, 0] }; }
function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function event(s, type, actorId, team) {
  s.events.push({ id: s.nextEvent++, type, actorId, team });
  if (s.events.length > 64) s.events.shift();
}
function effect(s, type, x, y, time, extra = {}) {
  s.effects.push({ id: s.nextEntity++, type, x, y, time, ...extra });
  if (s.effects.length > 48) s.effects.shift();
}

export function snapshot(handle) {
  const s = cores.get(handle);
  if (!s) return null;
  const { rng, nextEvent, nextEntity, ...view } = s;
  return clone({ ...view, actors: s.actors.map(({ brain, stats, ...actor }) => actor) });
}
export function selectHero(handle, heroId) {
  const s = cores.get(handle);
  if (!s || s.phase !== 'lobby' || !heroFor(heroId)) return false;
  s.heroId = heroId;
  return true;
}
export function restart(handle) {
  const s = cores.get(handle);
  if (!s) return false;
  cores.set(handle, initialState(s.heroId, s.seed));
  return true;
}
export function startMatch(handle) {
  const s = cores.get(handle);
  if (!s || s.phase !== 'lobby') return false;
  resetRound(s);
  return true;
}
export function setPaused(handle, paused) {
  const s = cores.get(handle);
  if (!s || typeof paused !== 'boolean') return false;
  if (paused && s.phase === 'playing') s.phase = 'paused';
  else if (!paused && s.phase === 'paused') s.phase = 'playing';
  else return false;
  return true;
}
export function advanceRound(handle) {
  const s = cores.get(handle);
  if (!s || s.phase !== 'roundResult') return false;
  s.offers = [...draftOffers(s.seed, s.round, s.actors[0].items)];
  s.phase = 'draft';
  return true;
}
export function chooseItem(handle, itemId) {
  const s = cores.get(handle);
  if (!s || s.phase !== 'draft' || !s.offers.includes(itemId)) return false;
  const picks = s.actors.map(a => a.id === 0 ? itemId : botItem(s.seed, s.round, a.id, a.items));
  // Resolve the full draft before applying anything, so a rejected pick is atomic.
  if (picks.some((id, i) => !id || s.actors[i].items.filter(item => item === id).length >= 2)) return false;
  s.botPicks = [];
  for (const a of s.actors) {
    a.items.push(picks[a.id]);
    if (a.id !== 0) s.botPicks.push({ actorId: a.id, itemId: picks[a.id] });
    event(s, 'item', a.id, a.team);
  }
  s.round++;
  resetRound(s);
  return true;
}

function resetRound(s) {
  const previous = s.actors;
  s.actors = [s.heroId, 'warden', 'courier', 'clerk'].map((heroId, id) => {
    const items = previous[id] ? [...previous[id].items] : [];
    const stats = statsFor(items);
    return { id, team: id < 2 ? 0 : 1, heroId, ...ARENA.spawns[id], aim: id < 2 ? 0 : Math.PI,
      hp: stats.maxHp, maxHp: stats.maxHp, alive: true, respawn: 0, shield: stats.spawnShield,
      invulnerable: 1, shieldTime: 0, cooldowns: [0, 0], items, kills: 0, captureSeconds: 0,
      shotCooldown: 0, stats, brain: { sense: 0, ready: 0.25, target: null, retreat: 0 } };
  });
  s.phase = 'playing';
  s.influence = [0, 0];
  s.time = RULES.roundSeconds;
  s.suddenDeath = false;
  s.bullets = [];
  s.effects = [];
  s.capture = emptyCapture();
  s.offers = [];
  s.result = null;
}

// Slab intersection is shared by movement, bullet sweep and line of sight.
function rectHit(x, y, dx, dy, rect, padding = 0) {
  let enter = -Infinity, leave = Infinity, nx = 0, ny = 0;
  for (const [p, d, lo, hi, ax, ay] of [
    [x, dx, rect.x - padding, rect.x + rect.w + padding, 1, 0],
    [y, dy, rect.y - padding, rect.y + rect.h + padding, 0, 1]
  ]) {
    if (Math.abs(d) < EPS) { if (p < lo || p > hi) return null; continue; }
    const t1 = (lo - p) / d, t2 = (hi - p) / d;
    const near = Math.min(t1, t2), far = Math.max(t1, t2);
    if (near > enter) { enter = near; nx = d > 0 ? -ax : ax; ny = d > 0 ? -ay : ay; }
    leave = Math.min(leave, far);
    if (enter > leave) return null;
  }
  if (enter < -EPS || enter > 1 || leave < 0) return null;
  return { t: Math.max(0, enter), nx, ny };
}
function circleHit(x, y, dx, dy, target, radius) {
  const ox = x - target.x, oy = y - target.y;
  const a = dx * dx + dy * dy, c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  if (a < EPS) return null;
  const b = ox * dx + oy * dy, discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}
function clearLine(a, b, padding = 0) {
  return !ARENA.cover.some(rect => rectHit(a.x, a.y, b.x - a.x, b.y - a.y, rect, padding));
}
function moveActor(s, a, dx, dy) {
  // At most two contacts: slide along a wall, then stop at the next corner.
  for (let pass = 0; pass < 2; pass++) {
    let hit = null;
    for (const rect of ARENA.cover) {
      const candidate = rectHit(a.x, a.y, dx, dy, rect, RADIUS);
      if (candidate && (!hit || candidate.t < hit.t)) hit = candidate;
    }
    for (const other of s.actors) {
      if (other === a || !other.alive) continue;
      const ox = a.x - other.x, oy = a.y - other.y;
      if (ox * dx + oy * dy >= 0) continue;
      const t = circleHit(a.x, a.y, dx, dy, other, RADIUS * 2);
      if (t !== null && (!hit || t < hit.t)) {
        const hx = a.x + dx * t - other.x, hy = a.y + dy * t - other.y;
        const length = Math.hypot(hx, hy) || 1;
        hit = { t, nx: hx / length, ny: hy / length };
      }
    }
    const t = hit ? Math.max(0, hit.t - EPS) : 1;
    a.x = clamp(a.x + dx * t, RADIUS, ARENA.width - RADIUS);
    a.y = clamp(a.y + dy * t, RADIUS, ARENA.height - RADIUS);
    if (!hit) break;
    dx *= 1 - t;
    dy *= 1 - t;
    const inward = Math.min(0, dx * hit.nx + dy * hit.ny);
    dx -= inward * hit.nx;
    dy -= inward * hit.ny;
  }
}

const navigation = ARENA.cover.flatMap(r => [
  { x: r.x - RADIUS - 3, y: r.y - RADIUS - 3 },
  { x: r.x + r.w + RADIUS + 3, y: r.y - RADIUS - 3 },
  { x: r.x - RADIUS - 3, y: r.y + r.h + RADIUS + 3 },
  { x: r.x + r.w + RADIUS + 3, y: r.y + r.h + RADIUS + 3 }
]);
const navigationEdges = navigation.map(a => navigation.map(b =>
  clearLine(a, b, RADIUS + 1) ? distance(a, b) : Infinity));
function waypoint(a, goal) {
  if (clearLine(a, goal, RADIUS + 1)) return goal;
  // ponytail: 16 fixed corners; a tiny visibility graph is enough for four blocks.
  const costs = navigation.map(p => clearLine(a, p, RADIUS + 1) ? distance(a, p) : Infinity);
  const first = navigation.map((_, i) => i), visited = new Set();
  let best = Infinity, next = goal;
  for (let count = 0; count < navigation.length; count++) {
    let at = -1;
    for (let i = 0; i < costs.length; i++) if (!visited.has(i) && (at < 0 || costs[i] < costs[at])) at = i;
    if (at < 0 || !Number.isFinite(costs[at])) break;
    visited.add(at);
    if (clearLine(navigation[at], goal, RADIUS + 1)) {
      const cost = costs[at] + distance(navigation[at], goal);
      if (cost < best) { best = cost; next = navigation[first[at]]; }
    }
    for (let i = 0; i < costs.length; i++) {
      const cost = costs[at] + navigationEdges[at][i];
      if (cost < costs[i]) { costs[i] = cost; first[i] = first[at]; }
    }
  }
  return next;
}

function botInput(s, a, dt) {
  const b = a.brain;
  b.sense -= dt;
  b.ready = Math.max(0, b.ready - dt);
  b.retreat = Math.max(0, b.retreat - dt);
  if (a.hp < a.maxHp * 0.28 && !b.retreated) { b.retreat = 1.4; b.retreated = true; }
  const candidates = [...s.actors.filter(o => o.alive && o.team !== a.team),
    ...s.effects.filter(e => e.type === 'decoy' && e.team !== a.team)];
  if (b.sense <= 0) {
    const visible = candidates.filter(o => distance(a, o) < 540 && clearLine(a, o));
    visible.sort((x, y) => distance(a, x) * (x.type === 'decoy' ? 0.4 : 1) - distance(a, y) * (y.type === 'decoy' ? 0.4 : 1));
    const target = visible[0];
    const key = target ? `${target.type === 'decoy' ? 'd' : 'a'}${target.id}` : null;
    if (key !== b.target) b.ready = 0.18 + random(s) * 0.17;
    b.target = key;
    if (target) {
      const angle = Math.atan2(target.y - a.y, target.x - a.x) + (random(s) - 0.5) * 0.16;
      const range = distance(a, target);
      b.aimX = a.x + Math.cos(angle) * range;
      b.aimY = a.y + Math.sin(angle) * range;
    }
    b.sense = 0.18 + random(s) * 0.12;
  }
  const target = candidates.find(o => `${o.type === 'decoy' ? 'd' : 'a'}${o.id}` === b.target);
  const canFire = !!target && b.ready <= 0 && distance(a, target) < 540 && clearLine(a, target);
  const goal = b.retreat > 0 ? ARENA.spawns[a.id] : {
    x: ARENA.zone.x + (a.team === 0 ? -24 : 24), y: ARENA.zone.y + (a.id % 2 ? 23 : -23)
  };
  const next = waypoint(a, goal);
  let mx = next.x - a.x, my = next.y - a.y;
  const length = Math.hypot(mx, my);
  if (length > 4) { mx /= length; my /= length; } else { mx = 0; my = 0; }
  for (const ally of s.actors) {
    if (ally === a || !ally.alive || ally.team !== a.team) continue;
    const d = distance(a, ally);
    if (d > EPS && d < 36) { mx += (a.x - ally.x) / d * 0.7; my += (a.y - ally.y) / d * 0.7; }
  }
  const rush = a.heroId === 'courier' && distance(a, goal) > 160 && !canFire;
  return { mx, my, aimX: rush ? next.x : b.aimX ?? goal.x, aimY: rush ? next.y : b.aimY ?? goal.y, fire: canFire,
    q: a.heroId === 'courier' ? rush : canFire,
    e: canFire && distance(a, target) < (a.heroId === 'warden' ? 75 : 380) };
}

function validatedInput(input, actor) {
  if (!input || typeof input !== 'object') input = {};
  const finite = (value, fallback, min, max) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
  return { mx: finite(input.mx, 0, -1, 1), my: finite(input.my, 0, -1, 1),
    aimX: finite(input.aimX, actor.x + Math.cos(actor.aim) * 100, 0, ARENA.width),
    aimY: finite(input.aimY, actor.y + Math.sin(actor.aim) * 100, 0, ARENA.height),
    fire: input.fire === true, q: input.q === true, e: input.e === true };
}
function shoot(s, a, offsets = [0], damage = a.stats.damage) {
  a.invulnerable = 0;
  for (const offset of offsets) {
    if (s.bullets.length >= 128) break;
    const angle = a.aim + offset;
    s.bullets.push({ x: a.x, y: a.y, px: a.x, py: a.y, team: a.team, ownerId: a.id,
      vx: Math.cos(angle) * 500, vy: Math.sin(angle) * 500, damage, life: 1.15 });
  }
  event(s, 'shot', a.id, a.team);
}
function useAbility(s, a, slot) {
  if (a.cooldowns[slot] > EPS) return;
  const ability = heroFor(a.heroId).abilities[slot];
  a.cooldowns[slot] = ability.cooldown * a.stats.abilityMultiplier;
  event(s, 'ability', a.id, a.team);
  if (ability.id === 'rush') {
    moveActor(s, a, Math.cos(a.aim) * 180, Math.sin(a.aim) * 180);
    effect(s, 'rush', a.x, a.y, 0.25);
  } else if (ability.id === 'burst') shoot(s, a, [-0.18, 0, 0.18], 12);
  else if (ability.id === 'shield') { a.shield += 40; a.shieldTime = 3; }
  else if (ability.id === 'slam') {
    effect(s, 'slam', a.x, a.y, 0.35);
    for (const target of s.actors) {
      if (s.phase !== 'playing') break;
      if (!target.alive || target.team === a.team || distance(a, target) > 70 || !clearLine(a, target)) continue;
      damageActor(s, target, 20, a);
      if (target.alive) {
        const d = Math.max(1, distance(a, target));
        moveActor(s, target, (target.x - a.x) / d * 34, (target.y - a.y) / d * 34);
      }
    }
  } else if (ability.id === 'decoy') effect(s, 'decoy', a.x, a.y, 3, { team: a.team, ownerId: a.id });
  else if (ability.id === 'fan') shoot(s, a, [-0.28, -0.14, 0, 0.14, 0.28], 8);
}
function damageActor(s, target, amount, owner) {
  if (!target.alive || target.invulnerable > 0) return;
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  target.hp = Math.max(0, target.hp - (amount - absorbed));
  if (target.hp > 0) return;
  target.alive = false;
  target.respawn = RULES.respawnSeconds;
  target.cooldowns = [0, 0];
  target.shotCooldown = 0;
  target.shield = 0;
  owner.kills++;
  event(s, 'kill', owner.id, owner.team);
  effect(s, 'death', target.x, target.y, 0.5);
  award(s, owner.team, RULES.killInfluence, 'kill');
}
function award(s, team, amount, reason) {
  if (s.phase !== 'playing' || amount <= 0) return;
  s.influence[team] += amount;
  if (s.suddenDeath || s.influence[team] >= RULES.winInfluence - EPS) finishRound(s, team, reason);
}
function finishRound(s, winner, reason) {
  if (s.phase !== 'playing') return;
  s.wins[winner]++;
  s.result = { winner, reason };
  s.phase = s.wins[winner] >= RULES.winsNeeded ? 'matchResult' : 'roundResult';
  event(s, 'round', null, winner);
}
function safeSpawn(s, a) {
  const base = ARENA.spawns[a.id];
  const candidates = [base, ...[-40, 0, 40].flatMap(dx => [-40, 0, 40].map(dy => ({ x: base.x + dx, y: base.y + dy })))];
  const living = s.actors.filter(other => other !== a && other.alive);
  return candidates.find(point => living.every(other => distance(point, other) >= RADIUS * 2 + 1)) || base;
}
function tickActor(s, a, input, dt) {
  if (!a.alive) {
    a.respawn = Math.max(0, a.respawn - dt);
    if (a.respawn <= EPS) {
      Object.assign(a, safeSpawn(s, a), { alive: true, hp: a.maxHp, respawn: 0,
        shield: a.stats.spawnShield, invulnerable: 1, shieldTime: 0 });
      a.brain = { sense: 0, ready: 0.25, target: null, retreat: 0 };
    }
    return;
  }
  a.invulnerable = Math.max(0, a.invulnerable - dt);
  a.shotCooldown = Math.max(0, a.shotCooldown - dt);
  a.cooldowns = a.cooldowns.map(value => Math.max(0, value - dt));
  if (a.shieldTime > 0) {
    a.shieldTime = Math.max(0, a.shieldTime - dt);
    if (a.shieldTime === 0) a.shield = Math.min(a.shield, a.stats.spawnShield);
  }
  const intent = validatedInput(input, a);
  if (Math.hypot(intent.aimX - a.x, intent.aimY - a.y) > EPS) a.aim = Math.atan2(intent.aimY - a.y, intent.aimX - a.x);
  const length = Math.max(1, Math.hypot(intent.mx, intent.my));
  moveActor(s, a, intent.mx / length * a.stats.speed * dt, intent.my / length * a.stats.speed * dt);
  if (intent.q) useAbility(s, a, 0);
  if (s.phase !== 'playing') return;
  if (intent.e) useAbility(s, a, 1);
  if (s.phase !== 'playing') return;
  if (intent.fire && a.shotCooldown <= EPS) { shoot(s, a); a.shotCooldown = a.stats.shotCooldown; }
}
function tickBullets(s, dt) {
  const remaining = [];
  for (const b of s.bullets) {
    if (s.phase !== 'playing') { remaining.push(b); continue; }
    const slice = Math.min(dt, b.life), dx = b.vx * slice, dy = b.vy * slice;
    b.px = b.x; b.py = b.y;
    let closest = Infinity, target = null;
    for (const rect of ARENA.cover) {
      const hit = rectHit(b.x, b.y, dx, dy, rect);
      if (hit && hit.t < closest) { closest = hit.t; target = null; }
    }
    for (const candidate of [...s.actors, ...s.effects.filter(e => e.type === 'decoy')]) {
      if (candidate.team === b.team || candidate.alive === false) continue;
      const t = circleHit(b.x, b.y, dx, dy, candidate, RADIUS);
      if (t !== null && t < closest - EPS) { closest = t; target = candidate; }
    }
    b.x += dx * Math.min(1, closest); b.y += dy * Math.min(1, closest);
    b.life -= dt;
    if (closest <= 1) {
      if (target && target.type !== 'decoy') damageActor(s, target, b.damage, s.actors[b.ownerId]);
    } else if (b.life > 0 && b.x >= 0 && b.x <= ARENA.width && b.y >= 0 && b.y <= ARENA.height) remaining.push(b);
  }
  s.bullets = remaining;
}
function tickCapture(s, dt) {
  const occupants = s.actors.filter(a => a.alive && distance(a, ARENA.zone) <= ARENA.zone.radius);
  const counts = [0, 0];
  for (const a of occupants) counts[a.team]++;
  const contested = counts[0] > 0 && counts[1] > 0;
  const team = contested || counts[0] + counts[1] === 0 ? null : counts[0] > 0 ? 0 : 1;
  const prior = s.capture;
  const warm = team === null ? 0 : (prior.team === team ? prior.warm : 0);
  const nextWarm = Math.min(RULES.captureWarmup, warm + dt);
  s.capture = { team, warm: team === null ? 0 : nextWarm, contested, counts };
  if (team === null) return;
  const scoringTime = Math.max(0, dt - Math.max(0, RULES.captureWarmup - warm));
  if (warm < RULES.captureWarmup - EPS && nextWarm >= RULES.captureWarmup - EPS) event(s, 'capture', null, team);
  if (scoringTime <= EPS) return;
  for (const a of occupants) a.captureSeconds += scoringTime;
  award(s, team, RULES.captureRate * scoringTime, 'capture');
}

export function step(handle, input = {}, dt = 1 / 60) {
  const s = cores.get(handle);
  if (!s || s.phase !== 'playing' || !Number.isFinite(dt)) return handle;
  dt = clamp(dt, 0, 0.05);
  if (dt === 0) return handle;
  // Split exactly at regulation expiry; overtime can never include regulation time.
  if (!s.suddenDeath && s.time > EPS && dt > s.time + EPS) {
    const regulation = s.time;
    step(handle, input, regulation);
    if (s.phase === 'playing') step(handle, input, dt - regulation);
    return handle;
  }
  for (const e of s.effects) e.time -= dt;
  s.effects = s.effects.filter(e => e.time > 0);
  for (const a of s.actors) {
    if (s.phase !== 'playing') break;
    tickActor(s, a, a.id === 0 || !a.alive ? input : botInput(s, a, dt), dt);
  }
  if (s.phase === 'playing') tickBullets(s, dt);
  if (s.phase === 'playing') tickCapture(s, dt);
  if (s.phase === 'playing' && !s.suddenDeath) {
    s.time = Math.max(0, s.time - dt);
    if (s.time <= EPS) {
      s.time = 0;
      if (Math.abs(s.influence[0] - s.influence[1]) <= EPS) s.suddenDeath = true;
      else finishRound(s, s.influence[0] > s.influence[1] ? 0 : 1, 'timeout');
    }
  }
  return handle;
}
