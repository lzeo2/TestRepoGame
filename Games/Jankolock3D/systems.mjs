// Renderer-independent simulation. Positions are metres, y-up. No engine/DOM imports.
export const ITEMS = Object.freeze([
  { id: 'ammo', name: 'Deep Stapler', tier: 1, cost: 800, description: '+12 magazine capacity.' },
  { id: 'health', name: 'Padded Folder', tier: 1, cost: 800, description: '+200 maximum health.' },
  { id: 'sprint', name: 'Runner Clips', tier: 1, cost: 800, description: '+25% movement speed.' },
  { id: 'lifesteal', name: 'Ink Siphon', tier: 2, cost: 1600, description: 'Heal 20% of damage dealt.' },
  { id: 'slow-rounds', name: 'Sticky Rounds', tier: 2, cost: 1600, description: 'Projectiles slow movement 30% for 2 seconds.' },
  { id: 'dash-charge', name: 'Spare Spring', tier: 2, cost: 1600, description: 'Two rechargeable 10m dashes.', active: true },
  { id: 'burst-fire', name: 'Triplicate', tier: 3, cost: 3200, description: 'Triple projectile damage and faster fire for 3 seconds; 15s cooldown.', active: true },
  { id: 'heavy-melee', name: 'Heavy Stamp', tier: 3, cost: 3200, description: 'Charge for 0.6s, then strike within 4m for 120 base damage; 12s cooldown.', active: true },
  { id: 'shadow-cloak', name: 'Carbon Copy', tier: 3, cost: 3200, description: 'Hidden from automatic targeting for 5 seconds; 20s cooldown.', active: true },
  { id: 'armor-pierce', name: 'Hole Punch', tier: 4, cost: 6400, description: 'Ignore 80% of target armor.' },
  { id: 'glass-cannon', name: 'Glass Nib', tier: 4, cost: 6400, description: '+60% damage, -25% maximum health.' }
].map(Object.freeze));

const TEAMS = ['carbon', 'ivory'];
const H = 0.05, PREGAME = 30, WAVE = 25, GROUND_LIFE = 18, FLOAT_LIFE = 6;
const TYPES = ['guardian', 'walker', 'base-guardian', 'shrine', 'patron'];
const HEALTH = { guardian: 1600, walker: 3200, 'base-guardian': 2200, shrine: 1200, patron: 6000 };
const finite = n => typeof n === 'number' && Number.isFinite(n);
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 120;
const point = p => p && ['x', 'y', 'z'].every(k => finite(p[k]) && Math.abs(p[k]) <= 1e6);
const copy = p => ({ x: p.x, y: p.y, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const fail = reason => ({ ok: false, reason });
const other = team => TEAMS.find(t => t !== team);

function fallback(lanes = [{ id: 'graft', x: -240 }, { id: 'midway', x: 0 }, { id: 'greenhedge', x: 240 }]) {
  const spawns = [];
  for (const lane of lanes) for (const team of TEAMS) {
    const sign = team === 'carbon' ? -1 : 1;
    for (const [type, z, offsets] of [['guardian', 105, [12]], ['walker', 220, [12]], ['base-guardian', 315, [-13, 13]], ['shrine', 360, [-13, 13]], ['patron', 415, [0]]]) {
      offsets.forEach((dx, i) => spawns.push({ id: `${team}-${lane.id}-${type}-${i + 1}`, team, lane: lane.id, type, position: { x: lane.x + dx, y: 0, z: sign * z } }));
    }
  }
  return { lanes, spawns };
}

export function createSystems(world) {
  if (world !== undefined && (!world || typeof world !== 'object')) throw new TypeError('world must be an object');
  const data = world ?? fallback();
  if (!Array.isArray(data.lanes) || data.lanes.length !== 3) throw new TypeError('three lanes required');
  const laneIds = new Set();
  const lanes = data.lanes.map(l => {
    if (!l || !validId(l.id) || laneIds.has(l.id) || !finite(l.x)) throw new TypeError('invalid/duplicate lane');
    laneIds.add(l.id);
    if (l.waypoints !== undefined && (!Array.isArray(l.waypoints) || l.waypoints.length < 2 || !l.waypoints.every(point))) throw new TypeError('invalid lane waypoints');
    return { id: l.id, x: l.x, color: l.color, waypoints: l.waypoints?.map(copy) ?? [{ x: l.x, y: 0, z: -390 }, { x: l.x, y: 0, z: 0 }, { x: l.x, y: 0, z: 390 }] };
  });
  const spawns = data.spawns ?? fallback(lanes).spawns;
  if (!Array.isArray(spawns)) throw new TypeError('spawns must be an array');
  const ids = new Set();
  for (const s of spawns) {
    if (!s || !validId(s.id) || ids.has(s.id) || !TEAMS.includes(s.team) || !laneIds.has(s.lane) || !TYPES.includes(s.type) || !point(s.position)) throw new TypeError('invalid/duplicate objective spawn');
    ids.add(s.id);
  }
  for (const team of TEAMS) for (const lane of lanes) for (const type of TYPES) {
    const count = spawns.filter(s => s.team === team && s.lane === lane.id && s.type === type).length;
    if (count !== (['base-guardian', 'shrine'].includes(type) ? 2 : 1)) throw new TypeError(`incomplete objective chain: ${team}/${lane.id}/${type}`);
  }
  const middle = lanes.find(l => l.id === 'midway') ?? [...lanes].sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
  const structures = spawns.filter(s => s.type !== 'patron' || s.lane === middle.id).map(s => ({
    ...s, kind: 'structure', position: copy(s.position), hp: HEALTH[s.type], maxHp: HEALTH[s.type], alive: true,
    armor: 0.25, vulnerable: false, patronPhase: s.type === 'patron' ? 1 : undefined, nextAttack: 0
  }));
  const bases = {}, retreatRings = [];
  for (const team of TEAMS) {
    const patron = structures.find(s => s.team === team && s.type === 'patron');
    const sign = team === 'carbon' ? -1 : 1;
    bases[team] = { x: patron.position.x, y: 0, z: patron.position.z + sign * 15 };
    for (const lane of lanes) {
      const lanePatron = spawns.find(s => s.team === team && s.lane === lane.id && s.type === 'patron');
      retreatRings.push({ team, lane: lane.id, radius: 6, position: { x: lane.x, y: 0, z: lanePatron.position.z + sign * 15 } });
    }
  }
  const sim = { time: 0, phase: 'pregame', winner: null, heroes: [], troopers: [], orbs: [], structures, events: [], lanes, bases, retreatRings };
  let tick = 0, pending = 0, serial = 0, waveNumber = 0;
  const teamFlex = { carbon: 0, ivory: 0 };
  const emit = (type, details = {}) => sim.events.push({ time: sim.time, type, ...details });
  const nextId = prefix => {
    let id;
    do { id = `${prefix}-${++serial}`; } while (ids.has(id));
    ids.add(id); return id;
  };
  const entity = id => sim.heroes.find(h => h.id === id) ?? sim.troopers.find(t => t.id === id) ?? structures.find(s => s.id === id);
  const heroById = id => sim.heroes.find(h => h.id === id);
  const heroKits = new Map(), statuses = new Map();
  function status(id) {
    const result = { slow: 0, speed: 1, invulnerable: false, parry: false, headshot: 1 };
    for (const effect of statuses.get(id)?.values() ?? []) {
      if (effect.until <= sim.time) continue;
      result.slow = Math.max(result.slow, effect.slow ?? 0);
      result.speed = Math.max(result.speed, effect.speedMultiplier ?? 1);
      result.headshot = Math.max(result.headshot, effect.headshotMultiplier ?? 1);
      result.invulnerable ||= !!effect.invulnerable;
      result.parry ||= !!effect.parry;
    }
    return result;
  }
  function putStatus(targetId, sourceId, ability, effect) {
    if (!statuses.has(targetId)) statuses.set(targetId, new Map());
    statuses.get(targetId).set(JSON.stringify([sourceId, ability]), effect);
  }
  const slowMultiplier = e => 1 - Math.max(e.slowUntil > sim.time ? 0.3 : 0, status(e.id).slow);
  const active = e => e?.alive && e.hp > 0;
  const hidden = e => e.kind === 'hero' && e.cloakUntil > sim.time;

  function stats(heroId) {
    const h = heroById(heroId);
    if (!h) return null;
    const has = id => h.items.includes(id), kit = heroKits.get(heroId), effects = status(heroId);
    const damageMultiplier = (1 + (h.level - 1) * 0.05) * (has('glass-cannon') ? 1.6 : 1);
    return {
      maxHp: ((kit?.health ?? 500) + (h.level - 1) * 35 + (has('health') ? 200 : 0)) * (has('glass-cannon') ? 0.75 : 1),
      damage: (kit?.weapon.baseDamage ?? 24) * damageMultiplier, damageMultiplier,
      moveSpeed: 8 * (has('sprint') ? 1.25 : 1) * slowMultiplier(h) * effects.speed,
      maxAmmo: (kit?.weapon.magazine ?? 12) + (has('ammo') ? 12 : 0),
      fireInterval: (kit?.weapon.interval ?? 0.3) / (h.burstUntil > sim.time ? 3 : 1),
      range: kit?.weapon.range ?? 32, armor: 0.1, armorPierce: has('armor-pierce') ? 0.8 : 0,
      invulnerable: effects.invulnerable, parry: effects.parry, kitId: kit?.id ?? null,
      lifesteal: has('lifesteal') ? 0.2 : 0, projectileSlow: has('slow-rounds') ? 0.3 : 0,
      burstMultiplier: h.burstUntil > sim.time ? 3 : 1, maxDashCharges: has('dash-charge') ? 2 : 1,
      tier: ['clerk', 'associate', 'supervisor', 'director'][Math.min(3, Math.floor((h.level - 1) / 5))]
    };
  }
  function refresh(h) {
    h.level = Math.max(h.level, Math.min(20, 1 + Math.floor(h.earnedSouls / 400)));
    const maximum = stats(h.id).maxHp;
    h.hp = h.alive ? Math.min(maximum, h.hp + Math.max(0, maximum - h.maxHp)) : 0;
    h.maxHp = maximum;
  }
  function grant(h, amount, cause) {
    if (!h || amount <= 0) return;
    const totals = Object.fromEntries(TEAMS.map(t => [t, sim.heroes.filter(a => a.team === t).reduce((n, a) => n + a.earnedSouls, 0)]));
    const lead = totals[other(h.team)], own = totals[h.team];
    const multiplier = lead > own ? 1 + Math.min(0.26, (lead - own) / Math.max(1, lead) * 0.26) : 1;
    const gained = amount * multiplier;
    h.souls += gained; h.earnedSouls += gained;
    refresh(h);
    emit('souls', { heroId: h.id, amount: gained, baseAmount: amount, multiplier, cause });
  }
  function updateVulnerability() {
    for (const s of structures) {
      const preceding = type => structures.filter(a => a.team === s.team && a.lane === s.lane && a.type === type);
      s.vulnerable = s.alive && sim.phase !== 'pregame' && sim.phase !== 'finished' && (
        s.type === 'guardian' ||
        s.type === 'walker' && preceding('guardian').every(a => !a.alive) ||
        s.type === 'base-guardian' && preceding('walker').every(a => !a.alive) ||
        s.type === 'shrine' && preceding('base-guardian').every(a => !a.alive) ||
        s.type === 'patron' && structures.filter(a => a.team === s.team && a.type === 'shrine').every(a => !a.alive)
      );
    }
  }
  function addHero(options) {
    if (!options || typeof options !== 'object') throw new TypeError('hero options required');
    const { id, team, lane = middle.id, position = bases[team], souls = 0, earnedSouls = souls } = options;
    if (!validId(id) || ids.has(id) || entity(id) || !TEAMS.includes(team) || !laneIds.has(lane) || !point(position) || !finite(souls) || !finite(earnedSouls) || souls < 0 || earnedSouls < souls || earnedSouls > 1e9) throw new TypeError('invalid hero');
    ids.add(id);
    const h = { id, kind: 'hero', team, lane, position: copy(position), hp: 500, maxHp: 500, alive: true,
      souls, earnedSouls, level: 1, items: [], flexSlots: teamFlex[team], respawnRemaining: 0,
      ammo: 12, reloadRemaining: 0, nextAttack: 0, slowUntil: 0, cloakUntil: 0, burstUntil: 0,
      dashCharges: 1, dashRecharge: 0, cooldowns: {}, heavyCharge: null, retreatHeld: false, recall: null, targetId: null };
    sim.heroes.push(h); refresh(h); return h;
  }
  // Register immutable baselines, not mutable runtime ammo/cooldown state.
  function configureHeroKit(heroId, kit) {
    const h = heroById(heroId);
    if (!h || sim.phase === 'finished') return fail('hero or match unavailable');
    if (heroKits.has(heroId)) return fail('kit already configured');
    if (!kit || !validId(kit.id) || !finite(kit.health) || kit.health <= 0 || kit.health > 1e6 || !Array.isArray(kit.abilities) || kit.abilities.length !== 4) return fail('invalid kit');
    const definitions = new Map(), slots = new Set();
    const fields = { baseDamage: [0, 1e6], baseHeal: [0, 1e6], range: [0, 10000], radius: [0, 10000],
      duration: [0, 3600], slow: [0, 1], spiritScale: [0, 100], headshotMultiplier: [1, 10], speedMultiplier: [1, 10] };
    function definition(a, role) {
      const key = a?.id ?? a?.name;
      if (!a || !validId(key) || definitions.has(key) || !['weapon', 'melee', 'spirit', 'none'].includes(a.damageType)) return null;
      const d = { key, role, damageType: a.damageType };
      for (const [field, [min, max]] of Object.entries(fields)) {
        const value = a[field] === undefined ? (['headshotMultiplier', 'speedMultiplier'].includes(field) ? 1 : 0) : a[field];
        if (!finite(value) || value < min || value > max) return null;
        d[field] = value;
      }
      if (a.invulnerable !== undefined && typeof a.invulnerable !== 'boolean') return null;
      d.invulnerable = a.invulnerable ?? false;
      if ((d.baseDamage || d.baseHeal) && !d.range && !d.radius) return null;
      definitions.set(key, d); return d;
    }
    const weapon = definition(kit.weapon, 'weapon'), melee = definition(kit.melee, 'melee');
    if (!weapon || !melee || weapon.damageType !== 'weapon' || melee.damageType !== 'melee' || !finite(kit.weapon.interval) || kit.weapon.interval <= 0 || kit.weapon.interval > 60 || !Number.isInteger(kit.weapon.magazine) || kit.weapon.magazine < 1 || kit.weapon.magazine > 100) return fail('invalid kit weapon/melee');
    for (const a of kit.abilities) {
      if (!Number.isInteger(a?.slot) || a.slot < 1 || a.slot > 4 || slots.has(a.slot) || !validId(a.id) || !definition(a, 'ability')) return fail('invalid kit ability');
      slots.add(a.slot);
    }
    Object.assign(weapon, { interval: kit.weapon.interval, magazine: kit.weapon.magazine });
    heroKits.set(heroId, { id: kit.id, health: kit.health, weapon, definitions });
    refresh(h);
    return { ok: true, kitId: kit.id };
  }
  function applyHeroEffect(event) {
    if (!event || typeof event !== 'object' || !validId(event.source) || !validId(event.ability)) return fail('invalid hero effect');
    const source = heroById(event.source), kit = heroKits.get(event.source);
    if (sim.phase === 'pregame' || sim.phase === 'finished') return fail('match inactive');
    if (!active(source) || !kit || !point(source.position)) return fail('source or kit inactive');
    if (event.team !== undefined && event.team !== source.team) return fail('invalid source team');
    const parry = event.kind === 'parry' && event.ability === 'parry';
    if (event.kind === 'parry' && !parry) return fail('invalid parry');
    const d = parry ? { key: 'parry', baseDamage: 0, baseHeal: 0, spiritScale: 0, slow: 0, duration: 0.65, damageType: 'none' } : kit.definitions.get(event.ability);
    if (!d) return fail('unknown kit effect');
    for (const field of ['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration']) {
      if (event[field] !== undefined && (!finite(event[field]) || event[field] !== d[field])) return fail(`invalid ${field}`);
    }
    if (event.damageType !== undefined && event.damageType !== d.damageType) return fail('invalid damage type');
    if (event.invulnerable !== undefined && event.invulnerable !== d.invulnerable || event.speedMultiplier !== undefined && event.speedMultiplier !== d.speedMultiplier) return fail('invalid buff values');
    if (event.headshot !== undefined && typeof event.headshot !== 'boolean' || event.headshotMultiplier !== undefined && (!finite(event.headshotMultiplier) || event.headshotMultiplier < 1)) return fail('invalid headshot');
    const multiplier = event.headshotMultiplier ?? 1;
    const headshotLimit = Math.max(kit.weapon.headshotMultiplier, status(source.id).headshot);
    if (multiplier !== 1 && (!event.headshot || d.role !== 'weapon' && d.key !== 'longshot' || multiplier !== headshotLimit)) return fail('invalid headshot multiplier');
    if (event.origin !== undefined && !point(event.origin)) return fail('invalid effect origin');
    const key = JSON.stringify([source.id, d.key]);
    if (['buff', 'buff-end', 'parry'].includes(event.kind)) {
      if (event.target != null && event.target !== source.id) return fail('buff must target source');
      if (!parry && (d.role !== 'ability' || !['overtime', 'headshot', 'xray', 'chaingun', 'aura'].includes(d.key))) return fail('not a kit buff');
      if (event.kind === 'buff-end') statuses.get(source.id)?.delete(key);
      else putStatus(source.id, source.id, d.key, { until: sim.time + d.duration, invulnerable: d.invulnerable,
        speedMultiplier: d.speedMultiplier, headshotMultiplier: d.headshotMultiplier, parry });
      return { ok: true };
    }
    if (!validId(event.target)) return fail('invalid target');
    const target = entity(event.target);
    if (event.kind === 'tether-end') {
      if (d.key !== 'tether' || !target || target.team === source.team) return fail('invalid tether end');
      statuses.get(target.id)?.delete(key); return { ok: true };
    }
    if (!['damage', 'heal'].includes(event.kind)) return fail('invalid hero effect kind');
    if (!active(target) || !point(target.position)) return fail('target inactive');
    const remote = ['turret', 'puddle', 'grenade', 'missionbomb'].includes(d.key);
    if (remote && !point(event.origin)) return fail('effect origin required');
    const origin = remote ? event.origin : source.position, range = remote ? d.radius || d.range : d.range || d.radius;
    if (distance(origin, target.position) > range) return fail('out of range');
    if (event.kind === 'heal') {
      if (event.baseHeal !== d.baseHeal || d.baseHeal <= 0 || target.team !== source.team || target.kind === 'structure') return fail('invalid healing target or amount');
      const amount = Math.min(target.maxHp - target.hp, d.baseHeal * stats(source.id).damageMultiplier);
      target.hp += amount;
      emit('heal', { sourceId: source.id, targetId: target.id, amount, ability: d.key });
      return { ok: true, amount };
    }
    if (event.baseDamage !== d.baseDamage || d.baseDamage <= 0) return fail('invalid base damage');
    const kind = d.damageType === 'weapon' ? 'projectile' : d.role === 'melee' ? 'melee' : 'ability';
    const result = resolveDamage(target.id, d.baseDamage * multiplier, source.id, kind, range, origin, false);
    if (result.ok && d.slow && active(target) && target.kind !== 'structure') putStatus(target.id, source.id, d.key, { until: sim.time + d.duration, slow: d.slow });
    return result;
  }
  function shopAvailable(heroId) {
    const h = heroById(heroId);
    return !!h && sim.phase !== 'finished' && (!h.alive || distance(h.position, bases[h.team]) <= 20);
  }
  function buyItem(heroId, itemId) {
    const h = heroById(heroId), item = ITEMS.find(i => i.id === itemId);
    if (!h || !item) return fail('unknown hero or item');
    if (!shopAvailable(heroId)) return fail('shop unavailable');
    if (h.items.includes(itemId)) return fail('already owned');
    if (h.items.length >= 6 + h.flexSlots) return fail('slots full');
    if (h.souls < item.cost) return fail('insufficient souls');
    h.souls -= item.cost; h.items.push(itemId); refresh(h);
    if (itemId === 'ammo') h.ammo += 12;
    if (itemId === 'dash-charge') h.dashCharges = 2;
    emit('purchase', { heroId, itemId, cost: item.cost }); return { ok: true };
  }
  function cancelRecall(h, reason) {
    if (h.recall) { h.recall = null; emit('recall_cancel', { heroId: h.id, reason }); }
  }
  function setRetreat(heroId, held) {
    const h = heroById(heroId);
    if (!h || typeof held !== 'boolean') return fail('invalid retreat input');
    h.retreatHeld = held;
    if (!held) { cancelRecall(h, 'released'); h.recallBlocked = false; }
    return { ok: true };
  }
  function dropOrbs(t, source) {
    const bounty = sim.time - PREGAME >= 600 ? 120 : 80;
    for (const type of ['floating', 'ground']) {
      sim.orbs.push({ id: nextId('orb'), kind: 'orb', type, team: source.team, position: { ...t.position, y: t.position.y + (type === 'floating' ? 2 : 0) },
        souls: bounty / 2, born: sim.time, expiresAt: sim.time + (type === 'floating' ? FLOAT_LIFE : GROUND_LIFE), claimed: false });
    }
    emit('orb_drop', { trooperId: t.id, team: source.team, bounty });
  }
  function die(target, source) {
    target.alive = false; target.hp = 0; target.deathTime = sim.time;
    if (target.kind === 'trooper') dropOrbs(target, source);
    if (target.kind === 'hero') {
      target.respawnRemaining = 5 + Math.floor(Math.max(0, sim.time - PREGAME) / 60) * 2;
      cancelRecall(target, 'death'); target.retreatHeld = false; target.cloakUntil = 0; target.heavyCharge = null;
      statuses.delete(target.id);
      if (source.kind === 'hero') grant(source, 100, 'hero kill');
      emit('hero_death', { heroId: target.id, sourceId: source.id, respawnSeconds: target.respawnRemaining });
    }
    if (target.kind === 'structure') {
      emit('objective_fall', { id: target.id, team: target.team, lane: target.lane, objective: target.type, sourceId: source.id, sourceKind: source.kind });
      if (target.type === 'walker') {
        const team = source.team;
        teamFlex[team] = Math.min(3, teamFlex[team] + 1);
        sim.heroes.filter(h => h.team === team).forEach(h => { h.flexSlots = teamFlex[team]; });
        emit('flex_slot', { team, flexSlots: teamFlex[team] });
      }
      if (target.type === 'patron') {
        sim.winner = source.team; sim.phase = 'finished';
        emit('victory', { winner: sim.winner });
      }
      updateVulnerability();
    }
  }
  function damage(targetId, amount, sourceId, options = {}) {
    if (!validId(targetId) || !validId(sourceId) || !finite(amount) || amount <= 0 || amount > 1e9 || !options || typeof options !== 'object') return fail('invalid damage arguments');
    const kind = options.kind ?? 'projectile';
    if (!['projectile', 'melee', 'ability'].includes(kind)) return fail('invalid damage kind');
    const source = entity(sourceId), hs = source?.kind === 'hero' ? stats(sourceId) : null;
    const range = kind === 'melee' ? 4 : hs?.range ?? (source?.kind === 'structure' ? 28 : 20);
    return resolveDamage(targetId, amount, sourceId, kind, range, source?.position, true);
  }
  function resolveDamage(targetId, amount, sourceId, kind, range, origin, consumeAmmo) {
    const target = entity(targetId), source = entity(sourceId);
    if (sim.phase === 'pregame' || sim.phase === 'finished') return fail('match inactive');
    if (!active(target) || !active(source)) return fail('source or target inactive');
    if (source.team === target.team) return fail('friendly fire');
    if (target.kind === 'structure' && !target.vulnerable) return fail('objective locked');
    const hs = source.kind === 'hero' ? stats(source.id) : null, protection = status(target.id);
    if (!point(source.position) || !point(origin) || !point(target.position) || distance(origin, target.position) > range) return fail('out of range');
    if (protection.invulnerable) return fail('invulnerable');
    if (protection.parry && kind === 'melee') return fail('parried');
    if (source.kind === 'structure' && (source.type === 'shrine' || !source.alive)) return fail('source cannot attack');
    if (hs && kind === 'projectile' && consumeAmmo) {
      if (source.reloadRemaining > 0 || source.ammo <= 0) return fail('reloading');
      if (source.nextAttack > sim.time + 1e-9) return fail('weapon cooldown');
      source.ammo--; source.nextAttack = sim.time + hs.fireInterval;
      if (!source.ammo) source.reloadRemaining = 1.5;
    }
    if (hs) { source.cloakUntil = 0; cancelRecall(source, 'attacked'); source.recallBlocked = source.retreatHeld; }
    const armor = target.kind === 'hero' ? stats(target.id).armor : target.armor ?? 0;
    const raw = amount * (hs?.damageMultiplier ?? 1) * (kind === 'projectile' ? hs?.burstMultiplier ?? 1 : 1);
    const dealt = Math.min(target.hp, raw * (1 - armor * (1 - (hs?.armorPierce ?? 0))));
    target.hp -= dealt;
    if (target.kind === 'hero') { cancelRecall(target, 'damaged'); target.recallBlocked = target.retreatHeld; target.cloakUntil = 0; }
    if (hs?.projectileSlow && kind === 'projectile' && target.kind !== 'structure') target.slowUntil = sim.time + 2;
    if (hs?.lifesteal) source.hp = Math.min(source.maxHp, source.hp + dealt * hs.lifesteal);
    if (target.kind === 'trooper') target.candleScale = target.emissiveScale = Math.max(0.15, target.hp / target.maxHp);
    emit('damage', { sourceId, sourceKind: source.kind, targetId, targetKind: target.kind, amount: dealt, kind });
    if (target.type === 'patron' && target.patronPhase === 1) {
      target.patronPhase = 2; target.maxHp = HEALTH.patron / 2; target.hp = target.maxHp;
      target.position.z += target.team === 'carbon' ? -20 : 20;
      emit('patron_phase', { id: target.id, team: target.team, from: 1, to: 2, maxHp: target.maxHp, position: copy(target.position) });
    } else if (target.hp <= 0) die(target, source);
    return { ok: true, amount: dealt, killed: !target.alive };
  }
  function shootOrb(heroId, orbId, options = {}) {
    if (!options || typeof options !== 'object' || options.kitShot !== undefined && typeof options.kitShot !== 'boolean') return fail('invalid orb shot');
    if (options.kitShot && !heroKits.has(heroId)) return fail('kit not configured');
    const h = heroById(heroId), orb = sim.orbs.find(o => o.id === orbId);
    if (!active(h) || sim.phase === 'pregame' || sim.phase === 'finished') return fail('hero or match inactive');
    if (!orb || orb.type !== 'floating' || orb.claimed || sim.time >= orb.expiresAt) return fail('orb unavailable');
    if (!point(h.position) || distance(h.position, orb.position) > 60) return fail('out of range');
    // A configured runtime has already consumed its one round and shot timer.
    if (!options.kitShot) {
      if (h.ammo <= 0 || h.reloadRemaining > 0) return fail('reloading');
      if (h.nextAttack > sim.time + 1e-9) return fail('weapon cooldown');
      h.ammo--; h.nextAttack = sim.time + stats(h.id).fireInterval;
      if (!h.ammo) h.reloadRemaining = 1.5;
    }
    h.cloakUntil = 0; cancelRecall(h, 'attacked'); h.recallBlocked = h.retreatHeld; orb.claimed = true;
    grant(h, orb.souls, h.team === orb.team ? 'secure' : 'deny');
    emit('orb_shot', { heroId, orbId, outcome: h.team === orb.team ? 'secure' : 'deny' });
    return { ok: true };
  }
  function activateItem(heroId, itemId, options = {}) {
    const h = heroById(heroId), item = ITEMS.find(i => i.id === itemId);
    if (!active(h) || !item?.active || !h.items.includes(itemId) || !options || typeof options !== 'object') return fail('active unavailable');
    if (sim.phase === 'pregame' || sim.phase === 'finished') return fail('match inactive');
    if ((h.cooldowns[itemId] ?? 0) > sim.time) return fail('item cooldown');
    if (itemId === 'heavy-melee') {
      const target = options.targetId === undefined ? selectTarget(h, 4) : entity(options.targetId);
      if (!active(target) || target.team === h.team || distance(h.position, target.position) > 4) return fail('no melee target within 4m');
      if (target.kind === 'structure' && !target.vulnerable) return fail('objective locked');
      h.heavyCharge = { targetId: target.id, releaseAt: sim.time + 0.6 };
      h.cooldowns[itemId] = sim.time + 12;
      h.cloakUntil = 0; cancelRecall(h, 'attacked'); h.recallBlocked = h.retreatHeld;
    } else if (itemId === 'dash-charge') {
      const d = options.direction === undefined ? { x: 0, z: h.team === 'carbon' ? 1 : -1 } : options.direction;
      const n = d && finite(d.x) && finite(d.z) ? Math.hypot(d.x, d.z) : NaN;
      if (!finite(n) || n < 1e-9) return fail('invalid dash direction');
      if (h.dashCharges <= 0) return fail('no dash charges');
      const destination = { ...h.position, x: h.position.x + d.x / n * 10, z: h.position.z + d.z / n * 10 };
      if (!point(destination)) return fail('invalid dash destination');
      h.position = destination;
      h.dashCharges--; if (!h.dashRecharge) h.dashRecharge = 5;
      cancelRecall(h, 'moved'); h.recallBlocked = h.retreatHeld;
    } else if (itemId === 'burst-fire') {
      h.burstUntil = sim.time + 3; h.cooldowns[itemId] = sim.time + 15;
    } else {
      h.cloakUntil = sim.time + 5; h.cooldowns[itemId] = sim.time + 20;
    }
    emit('item_active', { heroId, itemId }); return { ok: true };
  }
  function moveHero(heroId, position) {
    const h = heroById(heroId);
    if (!active(h) || !point(position)) return fail('invalid movement');
    if (distance(h.position, position) > 0.1) { cancelRecall(h, 'moved'); h.recallBlocked = h.retreatHeld; }
    h.position = copy(position); return { ok: true };
  }
  function spawnWave() {
    waveNumber++;
    for (const team of TEAMS) for (const lane of lanes) for (let i = 0; i < 4; i++) {
      const path = lane.waypoints.map(copy);
      if (path[0].z > path.at(-1).z) path.reverse();
      if (team === 'ivory') path.reverse();
      const offset = (i - 1.5) * 2;
      path.forEach(p => { p.x += offset; });
      sim.troopers.push({ id: nextId('trooper'), kind: 'trooper', team, lane: lane.id, position: copy(path[0]),
        hp: 180, maxHp: 180, alive: true, armor: 0, path, waypoint: 1, nextAttack: sim.time,
        slowUntil: 0, candleScale: 1, emissiveScale: 1, targetId: null, distanceMarched: 0 });
    }
    emit('wave', { number: waveNumber, count: 24 });
  }
  function nearest(source, list, range) {
    // ponytail: linear scans per attacker; use spatial bins if population expands.
    let best = null, bestDistance = range;
    for (const t of list) {
      if (!active(t) || t.team === source.team || hidden(t)) continue;
      const d = distance(source.position, t.position);
      if (d <= bestDistance) { best = t; bestDistance = d; }
    }
    return best;
  }
  function selectTarget(source, range) {
    return nearest(source, sim.troopers, range) ?? nearest(source, sim.heroes, range) ?? nearest(source, structures.filter(s => s.vulnerable), range);
  }
  function walk(t) {
    let remaining = 8 * H * slowMultiplier(t);
    if (t.waypoint >= t.path.length) {
      const patron = structures.find(s => s.type === 'patron' && s.team !== t.team && s.vulnerable);
      if (patron && distance(t.position, patron.position) > 20) t.path.push(copy(patron.position));
    }
    while (remaining > 0 && t.waypoint < t.path.length) {
      const to = t.path[t.waypoint], d = distance(t.position, to), used = Math.min(d, remaining);
      if (d > 0) for (const axis of ['x', 'y', 'z']) t.position[axis] += (to[axis] - t.position[axis]) * used / d;
      t.distanceMarched += used; remaining -= used;
      if (d <= used + 1e-9) t.waypoint++; else break;
    }
  }
  function updateHeroes() {
    for (const h of sim.heroes) {
      if (!h.alive) {
        h.respawnRemaining = Math.max(0, h.respawnRemaining - H);
        if (h.respawnRemaining <= 1e-9) {
          h.alive = true; h.position = copy(bases[h.team]); h.hp = h.maxHp; h.ammo = stats(h.id).maxAmmo;
          h.reloadRemaining = 0; h.slowUntil = 0; h.recallBlocked = false;
          emit('respawn', { heroId: h.id });
        }
        continue;
      }
      if (h.heavyCharge && sim.time + 1e-9 >= h.heavyCharge.releaseAt) {
        const { targetId } = h.heavyCharge; h.heavyCharge = null;
        const result = damage(targetId, 120, h.id, { kind: 'melee' });
        emit('heavy_release', { heroId: h.id, targetId, ...result });
        if (sim.phase === 'finished') return;
      }
      if (h.reloadRemaining > 0) {
        h.reloadRemaining = Math.max(0, h.reloadRemaining - H);
        if (h.reloadRemaining <= 1e-9) { h.reloadRemaining = 0; h.ammo = stats(h.id).maxAmmo; }
      }
      if (h.dashCharges < stats(h.id).maxDashCharges) {
        h.dashRecharge -= H;
        if (h.dashRecharge <= 1e-9) { h.dashCharges++; h.dashRecharge = h.dashCharges < stats(h.id).maxDashCharges ? 5 : 0; }
      }
      if (distance(h.position, bases[h.team]) <= 20) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.1 * H);
      if (h.recall && distance(h.position, h.recall.position) > 0.1) { cancelRecall(h, 'moved'); h.recallBlocked = h.retreatHeld; }
      if (h.retreatHeld && !h.recall && !h.recallBlocked) {
        const ring = retreatRings.find(r => r.team === h.team && r.lane === h.lane && distance(r.position, h.position) <= r.radius);
        if (ring) { h.recall = { position: copy(h.position), started: sim.time }; emit('recall_start', { heroId: h.id }); }
      }
      if (h.recall && sim.time - h.recall.started >= 3 - 1e-9) {
        h.position = copy(bases[h.team]); h.recall = null; h.recallBlocked = true;
        emit('recall_complete', { heroId: h.id });
      }
    }
  }
  function updateOrbs() {
    for (const orb of sim.orbs) {
      if (orb.claimed || sim.time >= orb.expiresAt || orb.type !== 'ground') continue;
      const eligible = sim.heroes.filter(h => active(h) && h.team === orb.team && distance(h.position, orb.position) <= 5);
      eligible.sort((a, b) => distance(a.position, orb.position) - distance(b.position, orb.position));
      const h = eligible[0];
      if (!h) continue;
      const d = distance(h.position, orb.position), travel = 10 * H;
      if (d <= travel + 0.4) {
        orb.claimed = true; grant(h, orb.souls, 'ground'); emit('orb_pickup', { heroId: h.id, orbId: orb.id });
      } else for (const axis of ['x', 'y', 'z']) orb.position[axis] += (h.position[axis] - orb.position[axis]) / d * travel;
    }
    sim.orbs = sim.orbs.filter(o => !o.claimed && sim.time < o.expiresAt);
  }
  function step(dt) {
    // One call is bounded to an hour to reject accidental timestamps/unbounded work.
    if (!finite(dt) || dt < 0 || dt > 3600) return fail('dt must be seconds in [0, 3600]');
    pending += dt;
    const steps = Math.floor((pending + 1e-9) / H);
    pending = Math.max(0, pending - steps * H);
    for (let i = 0; i < steps; i++) {
      tick++; sim.time = tick / 20;
      if (sim.phase === 'finished') continue;
      const phase = sim.time < PREGAME ? 'pregame' : sim.time < PREGAME + 600 ? 'laning' : 'midgame';
      if (phase !== sim.phase) { sim.phase = phase; emit('phase', { phase }); updateVulnerability(); }
      if (sim.phase === 'pregame') continue;
      if (tick >= PREGAME * 20 && (tick - PREGAME * 20) % (WAVE * 20) === 0) spawnWave();
      for (const [id, effects] of statuses) {
        for (const [key, effect] of effects) if (effect.until <= sim.time) effects.delete(key);
        if (!effects.size) statuses.delete(id);
      }
      updateHeroes();
      if (sim.phase === 'finished') continue;
      for (const t of sim.troopers) {
        if (!active(t)) continue;
        const target = selectTarget(t, 20); t.targetId = target?.id ?? null;
        if (!target) walk(t);
        else if (t.nextAttack <= sim.time + 1e-9) {
          damage(target.id, 12, t.id); t.nextAttack = sim.time + 1;
        }
        if (sim.phase === 'finished') break;
      }
      if (sim.phase === 'finished') continue;
      for (const s of structures) {
        if (!active(s) || s.type === 'shrine') continue;
        const target = selectTarget(s, 28); s.targetId = target?.id ?? null;
        if (target && s.nextAttack <= sim.time + 1e-9) { damage(target.id, s.type === 'walker' ? 28 : 20, s.id); s.nextAttack = sim.time + 1; }
      }
      updateOrbs();
      sim.troopers = sim.troopers.filter(t => t.alive || sim.time - t.deathTime < 1);
    }
    return { ok: true, steps, time: sim.time };
  }
  Object.assign(sim, { addHero, configureHeroKit, applyHeroEffect, step, damage, shootOrb, buyItem, activateItem, setRetreat, shopAvailable, stats, moveHero,
    drainEvents() { return sim.events.splice(0); } });
  return sim;
}
