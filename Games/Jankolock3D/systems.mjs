// Renderer-independent simulation. Positions are metres, y-up. No engine/DOM imports.
import { END_SHIFT_SPRINT, isEndShiftSprint } from './heroes/end-shift-sprint.mjs';
import { SPEED_TRAP, isSpeedTrap } from './heroes/speed-trap.mjs';
import { UNPRINTED_PASSAGE, isUnprintedPassage } from './heroes/unprinted-passage.mjs';
import { LAMINATED_SPRINT, isLaminatedSprint, APPROVED_ONLY, isApprovedOnly } from './heroes/laminate-slice.mjs';
import { PERMANENT_RECORD, isPermanentRecord } from './heroes/permanent-record.mjs';
import { SIDE_A, isSideA } from './heroes/side-a.mjs';
import { BAD_REWIND, isBadRewind } from './heroes/cassette-slice.mjs';
import { RECORDED_ASSEMBLY, isRecordedAssembly } from './heroes/recorded-assembly.mjs';
import { TAPE_SNAG, isTapeSnag } from './heroes/tape-snag.mjs';
import { KEEP_CLEAR, isKeepClear, keepClearBounds, panelSegment } from './heroes/keep-clear.mjs';
import { SHEEN_WALL, isSheenWall, sheenWallBounds } from './heroes/sheen-wall.mjs';
import { WINDOW_PATCH, PATIENT_GROWTH, isOfficePlantsSupport } from './heroes/office-plants.mjs';
import { WIDE_MARGIN, isWideMargin, CLEAN_BREAK, isCleanBreak } from './heroes/whitespace-slice.mjs';
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
const targetDistance = (origin, target) => target.kind === 'panel'
  ? Math.hypot(...['X','Y','Z'].map(axis => Math.max(target.bounds[`min${axis}`]-origin[axis.toLowerCase()],0,origin[axis.toLowerCase()]-target.bounds[`max${axis}`])))
  : distance(origin,target.position);
const fail = reason => ({ ok: false, reason });
const other = team => TEAMS.find(t => t !== team);
const isPureSlowDefinition = d => d.role === 'ability' && d.damageType === 'none' && d.baseDamage === 0 && d.baseHeal === 0 &&
  d.spiritScale === 0 && d.slow > 0 && d.slow <= .9 && d.duration > 0 && d.range > 0 &&
  !d.invulnerable && d.speedMultiplier === 1 && d.headshotMultiplier === 1;

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
  const boxes = data.boxes ?? [], ramps = data.ramps ?? []; // Keep the host's mutable cover array.
  if (!Array.isArray(boxes) || !Array.isArray(ramps)) throw new TypeError('world cover must be arrays');
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
    armor: 0.25, vulnerable: false, patronPhase: s.type === 'patron' ? 1 : undefined, nextAttack: 0, pendingAttack: null
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
  const panels = new Map();
  const entity = id => sim.heroes.find(h => h.id === id) ?? sim.troopers.find(t => t.id === id) ?? structures.find(s => s.id === id) ?? panels.get(id);
  const heroById = id => sim.heroes.find(h => h.id === id);
  const heroKits = new Map(), statuses = new Map();
  const deployments = new Map(), highestDeploymentId = new Map();
  const bursts = new Map(), highestBurstId = new Map();
  const panelLive = panel => panel.alive && panel.until > sim.time && sim.phase !== 'finished';
  const wallPanels = () => [...panels.values()].filter(panelLive).map(panel=>panel.descriptor);
  function removePanelOwner(anchor) {
    for(const id of anchor?.panelIds??[]){const panel=panels.get(id);if(panel){panel.alive=false;panels.delete(id);}}
  }
  function removeOwnedDeployment(key) {
    removePanelOwner(deployments.get(key));deployments.delete(key);
  }
  const overlaps = (a,b) => ['X','Y','Z'].every(axis=>a[`min${axis}`]<b[`max${axis}`]-1e-9&&a[`max${axis}`]>b[`min${axis}`]+1e-9);
  function actorBounds(actor) {
    if(actor.kind==='panel')return actor.bounds;
    const radius=actor.kind==='structure'?3:.6,height=actor.kind==='structure'?12:1.8,p=actor.position;
    return {minX:p.x-radius,maxX:p.x+radius,minY:p.y,maxY:p.y+height,minZ:p.z-radius,maxZ:p.z+radius};
  }
  function firstPanel(from,to,ignoreId=null,radius=0,height=0) {
    let nearest=null,fraction=Infinity;
    for(const panel of panels.values())if(panel.id!==ignoreId&&panelLive(panel)){
      const hit=panelSegment(from,to,panel.bounds,radius,height);
      if(hit!==null&&hit<fraction){nearest=panel;fraction=hit;}
    }
    return nearest;
  }
  function worldLineClear(source, target, origin = source.position) {
    if (!boxes.length && !ramps.length) return true;
    const from = { ...origin, y: origin.y + .9 }, to = { ...target.position, y: target.position.y + .9 };
    if (target.kind === 'panel') {
      const face = panelSegment(from, to, target.bounds);
      if (face !== null) for (const axis of ['x','y','z']) to[axis] = from[axis] + (to[axis]-from[axis])*face;
    }
    const minX=Math.min(from.x,to.x),maxX=Math.max(from.x,to.x),minY=Math.min(from.y,to.y),maxY=Math.max(from.y,to.y),minZ=Math.min(from.z,to.z),maxZ=Math.max(from.z,to.z);
    for (const box of boxes) {
      if(maxX<box.minX||minX>box.maxX||maxY<box.minY||minY>box.maxY||maxZ<box.minZ||minZ>box.maxZ)continue;
      // Live destructible panels use the existing interception/ownership path.
      if (box.panelTarget) continue;
      const ownPlatform = actor => actor.kind === 'structure' && actor.type === 'guardian' &&
        box.id === `${actor.team}-${actor.lane}-approach` && box.maxY <= actor.position.y;
      if (ownPlatform(source) || ownPlatform(target)) continue;
      if (panelSegment(from, to, box) !== null) return false;
    }
    for (const ramp of ramps) {
      // Conservative broad phase only; retain the exact rotated slab test below.
      if(maxX<ramp.minX-.2||minX>ramp.maxX+.2||maxZ<ramp.minZ-.2||minZ>ramp.maxZ+.2||maxY<Math.min(ramp.start,ramp.end)-.2||minY>Math.max(ramp.start,ramp.end)+.2)continue;
      // Same rotated 0.2m slab as traversal collision, not its enclosing AABB.
      const span = ramp.axis === 'x' ? ramp.maxX-ramp.minX : ramp.maxZ-ramp.minZ;
      const length = Math.hypot(span, ramp.end-ramp.start), c = span/length, s = (ramp.end-ramp.start)/length;
      const local = p => {
        const along = ramp.axis === 'x' ? p.x-(ramp.minX+ramp.maxX)/2 : p.z-(ramp.minZ+ramp.maxZ)/2;
        const across = ramp.axis === 'x' ? p.z-(ramp.minZ+ramp.maxZ)/2 : p.x-(ramp.minX+ramp.maxX)/2;
        const y = p.y-(ramp.start+ramp.end)/2+.1;
        return { x: c*along+s*y, y: -s*along+c*y, z: across };
      };
      const width = ramp.axis === 'x' ? ramp.maxZ-ramp.minZ : ramp.maxX-ramp.minX;
      if (panelSegment(local(from), local(to), { minX:-length/2, maxX:length/2, minY:-.1, maxY:.1, minZ:-width/2, maxZ:width/2 }) !== null) return false;
    }
    return true;
  }
  function attackVisible(source, target) {
    if (!boxes.length && !ramps.length && !panels.size) return true;
    const obstruction = firstPanel({ ...source.position, y:source.position.y+.9 }, { ...target.position, y:target.position.y+.9 }, target.kind === 'panel' ? target.id : null);
    return (!obstruction || obstruction.team !== source.team) && worldLineClear(source, obstruction ?? target);
  }
  function liveDeployment(key, event) {
    const anchor = deployments.get(key);
    return anchor && event.deploymentId === anchor.id && sim.time < anchor.until && point(event.origin) &&
      ['x', 'y', 'z'].every(axis => event.origin[axis] === anchor.origin[axis]) ? anchor : null;
  }
  function status(id) {
    const result = { slow: 0, speed: 1, invulnerable: false, movementStopped: false, parry: false, headshot: 1 };
    for (const effect of statuses.get(id)?.values() ?? []) {
      if (effect.until <= sim.time) continue;
      result.slow = Math.max(result.slow, effect.slow ?? 0);
      result.speed = Math.max(result.speed, effect.speedMultiplier ?? 1);
      result.headshot = Math.max(result.headshot, effect.headshotMultiplier ?? 1);
      result.invulnerable ||= !!effect.invulnerable;
      result.movementStopped ||= effect.movementStopped === true;
      result.parry ||= !!effect.parry;
    }
    return result;
  }
  function putStatus(targetId, sourceId, ability, effect) {
    const scaled = effect.until * 20, targetTick = Math.round(scaled);
    // Canonicalize only future-grid machine roundoff; preserve real subframe grants.
    if (targetTick > tick && Math.abs(scaled-targetTick) <= 2*Number.EPSILON*Math.max(1,Math.abs(scaled))) effect.until = targetTick / 20;
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
      movementStopped: effects.movementStopped,
      moveSpeed: effects.movementStopped ? 0 : 8 * (has('sprint') ? 1.25 : 1) * slowMultiplier(h) * effects.speed,
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
  function configureHeroKit(heroId, kit, options = {}) {
    const h = heroById(heroId);
    if (!h || sim.phase === 'finished') return fail('hero or match unavailable');
    if (heroKits.has(heroId)) return fail('kit already configured');
    const partial = options?.partialSlice === true;
    const white = partial && kit?.id === 'whitespace', lam = partial && kit?.id === 'laminate', cass = partial && kit?.id === 'cassette', fern = partial && kit?.id === 'office-plants';
    if (fern && (kit.partialSlice !== true || kit.health !== 560 || !Array.isArray(kit.abilities) || ![1,2].includes(kit.abilities.length) || !kit.abilities.some(a=>a?.id==='windowpatch'&&isOfficePlantsSupport(a)))) return fail('invalid Fern slice');
    if (cass && (kit.partialSlice !== true || kit.health !== 560 || !Array.isArray(kit.abilities) || ![1,2,3,4].includes(kit.abilities.length) || !kit.abilities.some(isSideA))) return fail('invalid Cassette slice');
    if (lam && (kit.partialSlice !== true || kit.health !== 740 || !Array.isArray(kit.abilities) || ![1, 2, 3, 4].includes(kit.abilities.length) || !kit.abilities.some(isLaminatedSprint))) return fail('invalid Laminate slice');
    if (white && (kit.partialSlice !== true || kit.health !== 560 || !Array.isArray(kit.abilities) || ![1, 2, 3, 4].includes(kit.abilities.length) || !kit.abilities.some(isWideMargin))) return fail('invalid Whitespace slice');
    if (partial && !white && !lam && !cass && !fern && (kit?.id !== 'odometer' || kit.partialSlice !== true || kit.melee?.name !== 'Mileage Tap' || !Array.isArray(kit.abilities) || ![2, 3, 4].includes(kit.abilities.length) || !kit.abilities.some(a => a?.id === 'fastlane' && a.slot === 1) || !kit.abilities.some(a => a?.id === 'flyingdigits' && a.slot === 3))) return fail('invalid partial slice');
    if (!kit || !validId(kit.id) || !finite(kit.health) || kit.health <= 0 || kit.health > 1e6 || !Array.isArray(kit.abilities) || (!partial && kit.abilities.length !== 4)) return fail('invalid kit');
    const definitions = new Map(), slots = new Set();
    const fields = { baseDamage: [0, 1e6], baseHeal: [0, 1e6], range: [0, 10000], radius: [0, 10000],
      duration: [0, 3600], slow: [0, 1], spiritScale: [0, 100], headshotMultiplier: [1, 10], speedMultiplier: [1, 10] };
    function definition(a, role) {
      const key = a?.id ?? a?.name;
      if (!a || !validId(key) || definitions.has(key) || !['weapon', 'melee', 'spirit', 'none'].includes(a.damageType)) return null;
      const d = { key, role, damageType: a.damageType };
      if (role === 'ability' && ['overtime', 'headshot', 'xray', 'chaingun', 'aura', 'turret', 'barricade', 'grenade', 'missionbomb', 'tether', 'puddle'].includes(key) && !finite(a.duration)) return null;
      if (role === 'ability' && ['turret', 'puddle', 'aura', 'chaingun'].includes(key)) {
        const interval = a.interval;
        if (!finite(interval) || interval <= 0) return null;
        d.interval = interval;
      }
      for (const [field, [min, max]] of Object.entries(fields)) {
        const value = a[field] === undefined ? (['headshotMultiplier', 'speedMultiplier'].includes(field) ? 1 : 0) : a[field];
        if (!finite(value) || value < min || value > max) return null;
        d[field] = value;
      }
      const hasSlowDuration = 'slowDuration' in a, slowDuration = hasSlowDuration ? a.slowDuration : d.duration;
      if (hasSlowDuration && (!finite(slowDuration) || slowDuration <= 0 || slowDuration > fields.duration[1])) return null;
      d.slowDuration = slowDuration;
      if (a.invulnerable !== undefined && typeof a.invulnerable !== 'boolean') return null;
      d.invulnerable = a.invulnerable ?? false;
      if (partial && role === 'melee' && (key !== (fern ? 'Pot Rim' : cass ? 'Cassette Corner' : lam ? 'Corner Clip' : white ? 'Blank Edge' : 'Mileage Tap') || a.name !== (fern ? 'Pot Rim' : cass ? 'Cassette Corner' : lam ? 'Corner Clip' : white ? 'Blank Edge' : 'Mileage Tap') || d.damageType !== 'weapon' || d.baseDamage !== (cass || fern ? 58 : 62) || d.range !== (lam ? 3 : white || cass || fern ? 2.9 : 2.8) || a.cooldown !== (lam ? 1.2 : 1) || d.baseHeal !== 0 || d.spiritScale !== 0 || d.slow !== 0 || d.invulnerable || d.duration !== 0 || d.radius !== 0 || d.speedMultiplier !== 1 || d.headshotMultiplier !== 1)) return null;
      if ((white || lam || cass || fern) && role === 'weapon' && (key !== (fern ? 'Seed Labeler' : cass ? 'Tape Spool' : lam ? 'Gloss Push' : 'Margin Flick') || a.name !== (fern ? 'Seed Labeler' : cass ? 'Tape Spool' : lam ? 'Gloss Push' : 'Margin Flick') || d.damageType !== 'weapon' || d.baseDamage !== (fern ? 15 : 18) || d.range !== (fern || cass ? 23 : lam ? 18 : 22) || a.interval !== (fern ? .28 : cass ? .32 : lam ? .35 : .3) || a.magazine !== (fern ? 18 : cass ? 15 : lam ? 14 : 16) || a.reload !== (lam || cass ? 1.5 : 1.4) || d.headshotMultiplier !== (lam || fern ? 1.3 : 1.4) || d.baseHeal !== 0 || d.spiritScale !== 0 || d.slow !== 0 || d.slowDuration !== 0 || d.invulnerable || d.duration !== 0 || d.radius !== 0 || d.speedMultiplier !== 1)) return null;
      if ((white || lam || cass || fern) && role === 'melee' && d.slowDuration !== 0) return null;
      if (['windowpatch','patientgrowth'].includes(key)) {
        const baseline=key==='windowpatch'?WINDOW_PATCH:PATIENT_GROWTH;
        if (!fern || role!=='ability' || !isOfficePlantsSupport(a) || d.headshotMultiplier!==1 || Object.keys(a).some(field=>!Object.hasOwn(baseline,field)&&!['description','fx','cast','summary','effects','counterplay','designNotes','headshotMultiplier'].includes(field))) return null;
        Object.assign(d,baseline);
      }
      if (key === 'widemargin') {
        if (!white || role !== 'ability' || !isWideMargin(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, WIDE_MARGIN);
      }
      if (key === 'cleanbreak') {
        if (!white || role !== 'ability' || !isCleanBreak(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, CLEAN_BREAK);
      }
      if (key === 'unprintedpassage') {
        if (!white || role !== 'ability' || !isUnprintedPassage(a) || d.headshotMultiplier !== 1 || 'anchoredSlow' in a || 'maxApplicationsPerTarget' in a) return null;
        Object.assign(d, UNPRINTED_PASSAGE);
      }
      if (key === 'laminatedsprint') {
        if (!lam || role !== 'ability' || !isLaminatedSprint(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, LAMINATED_SPRINT);
      }
      if (key === 'permanentrecord') {
        if (!lam || role !== 'ability' || !isPermanentRecord(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, PERMANENT_RECORD);
      }
      if (key === 'approvedonly') {
        if (!lam || role !== 'ability' || !isApprovedOnly(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, APPROVED_ONLY);
      }
      if (key === 'sidea') {
        if (!cass || role !== 'ability' || !isSideA(a) || d.headshotMultiplier !== 1 || 'anchoredSlow' in a || 'maxApplicationsPerTarget' in a) return null;
        Object.assign(d, SIDE_A);
      }
      if (key === 'badrewind') {
        if (!cass || role !== 'ability' || !isBadRewind(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d,BAD_REWIND);
      }
      if (key === 'recordedassembly') {
        if (!cass || role !== 'ability' || !isRecordedAssembly(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d,RECORDED_ASSEMBLY);
      }
      if (key === 'tapesnag') {
        if (!cass || role !== 'ability' || !isTapeSnag(a) || d.headshotMultiplier !== 1 || 'anchoredSlow' in a || 'maxApplicationsPerTarget' in a) return null;
        Object.assign(d,TAPE_SNAG);
      }
      if (key === 'keepclear') {
        if (!white || role !== 'ability' || !isKeepClear(a) || d.headshotMultiplier!==1) return null;
        Object.assign(d,KEEP_CLEAR);
      }
      if (key === 'sheenwall') {
        if (!lam || role !== 'ability' || !isSheenWall(a) || d.headshotMultiplier!==1) return null;
        Object.assign(d,SHEEN_WALL);
      }
      if (key === 'fastlane' && (!partial || role !== 'ability' || a.windup !== .1 || a.cooldown !== 6 || d.duration !== 2 || d.speedMultiplier !== 1.7 || d.invulnerable || d.baseDamage !== 0 || d.baseHeal !== 0 || d.spiritScale !== 0 || d.slow !== 0 || d.range !== 0 || d.radius !== 0 || d.damageType !== 'none' || d.headshotMultiplier !== 1)) return null;
      if (key === 'flyingdigits') {
        const exact = { windup: .25, cooldown: 8, projectileCount: 4, projectileSpeed: 40, projectileRadius: .2, spreadDegrees: 28, maxHitsPerTarget: 2, fireInterval: 0, pattern: 'fan' };
        if (!partial || role !== 'ability' || a.slot !== 3 || d.baseDamage !== 18 || d.baseHeal !== 0 || d.spiritScale !== 0 || d.slow !== 0 || d.invulnerable || d.damageType !== 'weapon' || d.range !== 25 || d.duration !== 25 / 40 || d.radius !== 0 || d.speedMultiplier !== 1 || d.headshotMultiplier !== 1 || Object.entries(exact).some(([field, value]) => a[field] !== value)) return null;
        Object.assign(d, exact);
      }
      if (key === 'endshiftsprint') {
        if (!partial || role !== 'ability' || !isEndShiftSprint(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, END_SHIFT_SPRINT);
      }
      if (key === 'speedtrap') {
        if (!partial || role !== 'ability' || !isSpeedTrap(a) || d.headshotMultiplier !== 1) return null;
        Object.assign(d, SPEED_TRAP);
      }
      const anchoredSlow = 'anchoredSlow' in a ? a.anchoredSlow : false;
      if (typeof anchoredSlow !== 'boolean') return null;
      d.anchoredSlow = anchoredSlow;
      if (anchoredSlow && (d.key !== 'puddle' || !isPureSlowDefinition(d) || d.radius <= 0)) return null;
      const hasBudget = 'maxApplicationsPerTarget' in a, budget = hasBudget ? a.maxApplicationsPerTarget : null;
      if (hasBudget && (!anchoredSlow || !Number.isSafeInteger(budget) || budget <= 0)) return null;
      d.maxApplicationsPerTarget = budget;
      if ((d.baseDamage || d.baseHeal) && !d.range && !d.radius) return null;
      definitions.set(key, d); return d;
    }
    const weapon = definition(kit.weapon, 'weapon'), melee = definition(kit.melee, 'melee');
    if (!weapon || !melee || melee.damageType !== (partial ? 'weapon' : 'melee') || weapon.damageType !== 'weapon' || !finite(kit.weapon.interval) || kit.weapon.interval <= 0 || kit.weapon.interval > 60 || !Number.isInteger(kit.weapon.magazine) || kit.weapon.magazine < 1 || kit.weapon.magazine > 100) return fail('invalid kit weapon/melee');
    for (const a of kit.abilities) {
      if (!Number.isInteger(a?.slot) || a.slot < 1 || a.slot > 4 || slots.has(a.slot) || !validId(a.id) || partial && !(fern ? ['windowpatch','patientgrowth'].includes(a.id) : cass ? ['sidea','badrewind','recordedassembly','tapesnag'].includes(a.id) : lam ? ['laminatedsprint','permanentrecord','approvedonly','sheenwall'].includes(a.id) : white ? ['widemargin', 'cleanbreak', 'unprintedpassage', 'keepclear'].includes(a.id) : ['fastlane', 'flyingdigits', 'endshiftsprint', 'speedtrap'].includes(a.id)) || !definition(a, 'ability')) return fail('invalid kit ability');
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
    // Owned buff/link/field cleanup must survive dead casters and inactive matches.
    const cleanup = event.kind === 'tether-end' || event.kind === 'deployment-end' || event.kind === 'buff-end' || event.kind === 'burst-end';
    if (!cleanup && (sim.phase === 'pregame' || sim.phase === 'finished')) return fail('match inactive');
    if ((!cleanup && !active(source)) || !source || !kit || !point(source.position)) return fail('source or kit inactive');
    if (event.team !== undefined && event.team !== source.team) return fail('invalid source team');
    const parry = event.kind === 'parry' && event.ability === 'parry';
    if (event.kind === 'parry' && !parry) return fail('invalid parry');
    const d = parry ? { key: 'parry', baseDamage: 0, baseHeal: 0, spiritScale: 0, slow: 0, duration: 0.65, damageType: 'none' } : kit.definitions.get(event.ability);
    if (!d) return fail('unknown kit effect');
    if (['windowpatch','patientgrowth'].includes(d.key)) {
      const {origin,...rest}=event;
      if(origin!==undefined){
        if(!origin||Object.getPrototypeOf(origin)!==Object.prototype)return fail('invalid Fern origin');
        event={...rest,origin:{x:origin.x,y:origin.y,z:origin.z}};
      }
    }
    if (['permanentrecord','sidea','recordedassembly','tapesnag','keepclear','sheenwall'].includes(d.key) && event.origin !== undefined) {
      const origin=event.origin;
      if (!origin || Object.getPrototypeOf(origin)!==Object.prototype) return fail('invalid ward origin');
      event={...event,origin:{x:origin.x,y:origin.y,z:origin.z}};
    }
    if (d.key === 'unprintedpassage' && event.kind === 'deployment-start') {
      const snapshot = value => value && Object.getPrototypeOf(value) === Object.prototype ? {x:value.x,y:value.y,z:value.z} : null;
      const rawCenters = event.centers;
      if (!Array.isArray(rawCenters) || rawCenters.length !== d.fieldCount) return fail('invalid passage geometry');
      const origin = snapshot(event.origin), direction = snapshot(event.direction);
      const centers = Array.from({length:d.fieldCount},(_,i)=>Object.hasOwn(rawCenters,i)?snapshot(rawCenters[i]):null);
      if (!point(origin) || !point(direction) || centers.some(center=>!point(center))) return fail('invalid passage geometry');
      event = {...event,origin,direction,centers};
    }
    for (const field of ['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration']) {
      if (event[field] !== undefined && (!finite(event[field]) || event[field] !== d[field])) return fail(`invalid ${field}`);
    }
    if ('movementStopped' in event && (d.key !== 'approvedonly' || typeof event.movementStopped !== 'boolean' || event.movementStopped !== d.movementStopped)) return fail('invalid movementStopped');
    if ('invulnerabilityDuration' in event && (!['cleanbreak','laminatedsprint','permanentrecord','badrewind','recordedassembly','patientgrowth'].includes(d.key) || !finite(event.invulnerabilityDuration) || event.invulnerabilityDuration !== d.invulnerabilityDuration)) return fail('invalid invulnerabilityDuration');
    if ('slowDuration' in event && (!finite(event.slowDuration) || event.slowDuration !== d.slowDuration)) return fail('invalid slowDuration');
    if ('anchoredSlow' in event && (typeof event.anchoredSlow !== 'boolean' || event.anchoredSlow !== (d.anchoredSlow ?? false))) return fail('invalid anchoredSlow');
    if ('maxApplicationsPerTarget' in event && (!Number.isSafeInteger(event.maxApplicationsPerTarget) || event.maxApplicationsPerTarget <= 0 || event.maxApplicationsPerTarget !== d.maxApplicationsPerTarget)) return fail('invalid maxApplicationsPerTarget');
    if (event.damageType !== undefined && event.damageType !== d.damageType) return fail('invalid damage type');
    if (event.invulnerable !== undefined && event.invulnerable !== d.invulnerable || event.speedMultiplier !== undefined && event.speedMultiplier !== d.speedMultiplier) return fail('invalid buff values');
    if (event.headshot !== undefined && typeof event.headshot !== 'boolean' || event.headshotMultiplier !== undefined && (!finite(event.headshotMultiplier) || event.headshotMultiplier < 1)) return fail('invalid headshot');
    const multiplier = event.headshotMultiplier ?? 1;
    const headshotLimit = Math.max(kit.weapon.headshotMultiplier, status(source.id).headshot);
    if (multiplier !== 1 && (!event.headshot || d.role !== 'weapon' && d.key !== 'longshot' || multiplier !== headshotLimit)) return fail('invalid headshot multiplier');
    if (event.origin !== undefined && !point(event.origin)) return fail('invalid effect origin');
    const burstAbility=['flyingdigits','sheenwall'].includes(d.key);
    if(d.key==='sheenwall'&&(['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field])||Object.keys(SHEEN_WALL).some(field=>field in event&&event[field]!==d[field])||Object.keys(event).some(field=>!Object.hasOwn(SHEEN_WALL,field)&&!['kind','source','target','team','ability','origin',...(['deployment-start','deployment-end'].includes(event.kind)?['deploymentId','axis']:[]),...(['burst-start','burst-end','damage'].includes(event.kind)?['burstId']:[]),...(event.kind==='damage'?['projectileIndex']:[])].includes(field))))return fail('invalid Sheen Wall payload');
    if (d.key === 'flyingdigits' && (['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration', 'damageType'].some(field => event[field] !== d[field]) || ['windup', 'cooldown', 'projectileCount', 'projectileSpeed', 'projectileRadius', 'spreadDegrees', 'maxHitsPerTarget', 'fireInterval', 'pattern'].some(field => field in event && event[field] !== d[field]))) return fail('invalid burst payload');
    if (event.kind === 'burst-start' || event.kind === 'burst-end') {
      if (!burstAbility || d.role !== 'ability' || event.target !== null || !Number.isSafeInteger(event.burstId) || event.burstId <= 0) return fail('invalid burst');
      const owned = bursts.get(source.id);
      if (event.kind === 'burst-end') {
        const burst = owned?.get(event.burstId);
        if (!burst) return { ok: true, ended: false };
        if(burst.ability!==d.key)return fail('mismatched burst ability');
        owned.delete(event.burstId); if (!owned.size) bursts.delete(source.id);
        return { ok: true, ended: sim.time < burst.until };
      }
      if (!point(event.origin) || Object.getPrototypeOf(event.origin) !== Object.prototype || distance(source.position, event.origin) > 1.5 || event.burstId <= (highestBurstId.get(source.id) ?? 0)) return fail('invalid burst start');
      const ledger = owned ?? new Map();
      ledger.set(event.burstId, { ability:d.key, origin: copy(event.origin), until: sim.time + (d.projectileDuration??d.duration) + H, used: new Set(), counts: new Map() });
      bursts.set(source.id, ledger); highestBurstId.set(source.id, event.burstId);
      return { ok: true };
    }
    const key = JSON.stringify([source.id, d.key]);
    const fern = d.key==='windowpatch'||d.key==='patientgrowth', patient=d.key==='patientgrowth';
    if(fern){
      const baseline=patient?PATIENT_GROWTH:WINDOW_PATCH;
      if(['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field])||Object.keys(baseline).some(field=>field in event&&event[field]!==d[field])||Object.keys(event).some(field=>!Object.hasOwn(baseline,field)&&!['kind','source','target','team','ability','origin','deploymentId',...(event.kind===(patient?'ward':'speed')?[patient?'pulseIndex':'applicationIndex']:[])].includes(field)))return fail('invalid Fern payload');
      if(!['deployment-start','deployment-end',patient?'ward':'speed'].includes(event.kind))return fail('invalid Fern role');
    }
    const keep = d.key === 'keepclear', sheen = d.key === 'sheenwall';
    if(keep&&(['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field])||Object.keys(KEEP_CLEAR).some(field=>field in event&&event[field]!==d[field])||Object.keys(event).some(field=>!Object.hasOwn(KEEP_CLEAR,field)&&!['kind','source','target','team','ability','deploymentId','origin','axis'].includes(field))))return fail('invalid Keep Clear payload');
    const tape = d.key === 'tapesnag';
    if (tape && (['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field]) || Object.keys(TAPE_SNAG).some(field=>field in event&&event[field]!==d[field]) || Object.keys(event).some(field=>!Object.hasOwn(TAPE_SNAG,field)&&!['kind','source','target','team','ability','deploymentId','origin',...(event.kind==='deployment-start'?['linkedTarget']:[]),...(event.kind==='status'?['pulseIndex']:[])].includes(field)))) return fail('invalid Tape Snag payload');
    const assembly = d.key === 'recordedassembly';
    if (assembly && (['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field]) || Object.keys(RECORDED_ASSEMBLY).some(field=>field in event&&event[field]!==d[field]))) return fail('invalid recorded assembly payload');
    const sideA = d.key === 'sidea';
    if (sideA && (['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field]) || Object.keys(SIDE_A).some(field=>field in event&&event[field]!==d[field]))) return fail('invalid Side A payload');
    const ward = d.key === 'permanentrecord';
    if (ward && (['baseDamage','baseHeal','spiritScale','slow','duration','damageType'].some(field=>event[field]!==d[field]) || Object.keys(PERMANENT_RECORD).some(field=>field in event&&event[field]!==d[field]))) return fail('invalid permanent ward payload');
    const passage = d.key === 'unprintedpassage';
    if (passage && (['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration', 'damageType'].some(field => event[field] !== d[field]) || Object.keys(UNPRINTED_PASSAGE).some(field => field in event && event[field] !== d[field]))) return fail('invalid passage payload');
    const trap = d.key === 'speedtrap';
    if (trap && (['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration', 'damageType'].some(field => event[field] !== d[field]) || Object.keys(SPEED_TRAP).some(field => field in event && event[field] !== d[field]))) return fail('invalid trap payload');
    const rally = d.key === 'endshiftsprint', openingKey = JSON.stringify([source.id, 'endshiftsprint-opening']);
    if (rally && (['baseDamage', 'baseHeal', 'spiritScale', 'slow', 'duration', 'damageType'].some(field => event[field] !== d[field]) || Object.keys(END_SHIFT_SPRINT).some(field => field in event && event[field] !== d[field]))) return fail('invalid rally payload');
    if (['deployment-start', 'deployment-end'].includes(event.kind)) {
      if (d.role !== 'ability' || !['turret', 'puddle', 'endshiftsprint', 'speedtrap', 'unprintedpassage', 'permanentrecord', 'sidea', 'recordedassembly', 'tapesnag', 'keepclear', 'sheenwall','windowpatch','patientgrowth'].includes(d.key) || event.target !== null ||
        !Number.isSafeInteger(event.deploymentId) || event.deploymentId <= 0) return fail('invalid deployment');
      if (event.kind === 'deployment-end') {
        const anchor = deployments.get(key);
        if (anchor?.id !== event.deploymentId) return { ok: true, ended: false };
        removeOwnedDeployment(key);
        if (rally) statuses.get(source.id)?.delete(openingKey);
        return { ok: true, ended: sim.time < anchor.until };
      }
      if (!point(event.origin) || Object.getPrototypeOf(event.origin) !== Object.prototype ||
        event.deploymentId <= (highestDeploymentId.get(source.id) ?? 0) ||
        (rally || passage || ward || tape ? ['x', 'y', 'z'].some(axis => Math.abs(event.origin[axis]-source.position[axis]) > 1e-9) : Math.hypot(event.origin.x-source.position.x, event.origin.z-source.position.z) > (d.key === 'turret' ? 4.5 : d.range) + (trap || sideA || assembly || keep || sheen || fern ? 1e-9 : 1e-6))) return fail('invalid deployment start');
      if(keep||sheen){
        if(!['x','z'].includes(event.axis))return fail('invalid panel axis');
        const bounds=keep?keepClearBounds(event.origin,event.axis):[sheenWallBounds(event.origin,event.axis)];
        const actors=[...sim.heroes,...sim.troopers,...structures].filter(active);
        if(bounds.some(box=>(data.boxes??[]).some(staticBox=>overlaps(box,staticBox))||actors.some(actor=>overlaps(box,actorBounds(actor)))||[...panels.values()].some(panel=>panelLive(panel)&&panel.sourceId!==source.id&&overlaps(box,panel.bounds))))return fail('Keep Clear placement occupied');
        // Validate the complete replacement before touching the prior pair or allocating IDs.
        removeOwnedDeployment(key);
        const panelIds=bounds.map((box,panelIndex)=>{
          const id=nextId('panel'),position=Object.freeze({x:(box.minX+box.maxX)/2,y:box.minY,z:(box.minZ+box.maxZ)/2});
          const panel={id,kind:'panel',abilityKey:d.key,color:sheen?'#3f7f6f':'#6c8589',team:source.team,sourceId:source.id,deploymentId:event.deploymentId,panelIndex,position,bounds:Object.freeze({...box}),height:d.height,radius:d.width/2,hp:d.health,maxHp:d.health,armor:0,alive:true,until:sim.time+d.duration};
          panel.descriptor=Object.freeze({id,kind:'panel',abilityKey:panel.abilityKey,color:panel.color,team:panel.team,sourceId:panel.sourceId,deploymentId:panel.deploymentId,panelIndex,position,bounds:panel.bounds,height:panel.height,radius:panel.radius,maxHp:panel.maxHp,armor:0,until:panel.until,get alive(){return panelLive(panel);},get hp(){return panel.hp;}});
          panels.set(id,panel);return id;
        });
        deployments.set(key,{id:event.deploymentId,until:sim.time+d.duration,origin:copy(event.origin),panelIds});highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (tape) {
        const linkedTarget=event.linkedTarget, target=validId(linkedTarget)?entity(linkedTarget):null;
        if (!active(target) || !point(target.position) || !['hero','trooper'].includes(target.kind) || target.team===source.team || distance(source.position,target.position)>d.range+1e-9) return fail('invalid Tape Snag linked target');
        deployments.set(key,{id:event.deploymentId,linkedTarget,startedAt:sim.time,until:sim.time+d.duration,origin:copy(event.origin),indices:new Set()});
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (passage) {
        const direction = event.direction, centers = event.centers;
        if (!point(direction) || Object.getPrototypeOf(direction) !== Object.prototype || Math.abs(direction.y) > 1e-9 || Math.abs(Math.hypot(direction.x, direction.z)-1) > 1e-9 || !Array.isArray(centers) || centers.length !== d.fieldCount || centers.some((center, i) => !point(center) || Object.getPrototypeOf(center) !== Object.prototype || Math.abs(center.x-event.origin.x-direction.x*i*d.spacing) > 1e-9 || Math.abs(center.z-event.origin.z-direction.z*i*d.spacing) > 1e-9) || Math.hypot(centers.at(-1).x-event.origin.x, centers.at(-1).z-event.origin.z) > d.range+1e-9) return fail('invalid passage geometry');
        deployments.set(key, { id:event.deploymentId, until:sim.time+d.duration, origin:copy(centers[0]), direction:copy(direction), centers:centers.map(copy), speedCounts:new Map(), slowCounts:new Map() });
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (fern) {
        deployments.set(key,{id:event.deploymentId,startedAt:sim.time,until:sim.time+d.duration,origin:copy(event.origin),indices:new Map()});
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (assembly) {
        deployments.set(key,{id:event.deploymentId,startedAt:sim.time,until:sim.time+d.duration,origin:copy(event.origin),wardIndices:new Map(),speedIndices:new Map()});
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (sideA) {
        deployments.set(key,{id:event.deploymentId,startedAt:sim.time,until:sim.time+d.duration,origin:copy(event.origin),targets:new Set()});
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      if (ward) {
        deployments.set(key,{id:event.deploymentId,startedAt:sim.time,until:sim.time+d.duration,origin:copy(event.origin),pulses:new Map()});
        highestDeploymentId.set(source.id,event.deploymentId);return {ok:true};
      }
      deployments.set(key, { id: event.deploymentId, until: sim.time+d.duration, counts: new Map(), revealCounts: trap ? new Map() : null,
        origin: { ...copy(event.origin), y: event.origin.y+(d.key === 'turret' ? .9 : 0) } });
      highestDeploymentId.set(source.id, event.deploymentId);
      if (rally) putStatus(source.id, source.id, 'endshiftsprint-opening', { until: sim.time + d.openingInvulnerabilityDuration, invulnerable: true });
      return { ok: true };
    }
    if (['buff', 'buff-end', 'parry'].includes(event.kind)) {
      if (event.target != null && event.target !== source.id) return fail('buff must target source');
      if (!parry && (d.role !== 'ability' || !['overtime', 'headshot', 'xray', 'chaingun', 'aura', 'fastlane', 'widemargin', 'cleanbreak', 'laminatedsprint', 'approvedonly', 'badrewind'].includes(d.key))) return fail('not a kit buff');
      if (d.key === 'approvedonly') {
        if (event.kind === 'buff-end') statuses.get(source.id)?.delete(key);
        else putStatus(source.id,source.id,d.key,{until:sim.time+d.duration,invulnerable:true,movementStopped:true});
        return {ok:true};
      }
      if (['cleanbreak','laminatedsprint','badrewind'].includes(d.key)) {
        const speedKey = JSON.stringify([source.id, `${d.key}-speed`]), invulnerabilityKey = JSON.stringify([source.id, `${d.key}-invulnerability`]);
        if (event.kind === 'buff-end') {
          statuses.get(source.id)?.delete(speedKey);statuses.get(source.id)?.delete(invulnerabilityKey);
        } else {
          putStatus(source.id, source.id, `${d.key}-speed`, { until: sim.time + d.duration, speedMultiplier: d.speedMultiplier });
          putStatus(source.id, source.id, `${d.key}-invulnerability`, { until: sim.time + d.invulnerabilityDuration, invulnerable: true });
        }
        return { ok: true };
      }
      if (event.kind === 'buff-end') statuses.get(source.id)?.delete(key);
      else putStatus(source.id, source.id, d.key, { until: sim.time + d.duration, invulnerable: d.invulnerable,
        speedMultiplier: d.speedMultiplier, headshotMultiplier: d.headshotMultiplier, parry });
      return { ok: true };
    }
    if (!validId(event.target)) return fail('invalid target');
    const target = entity(event.target);
    if (event.kind === 'tether-end') {
      if (d.key !== 'tether' || !target) return fail('invalid tether end');
      statuses.get(target.id)?.delete(key); return { ok: true };
    }
    if (!['damage', 'heal', 'status', 'speed', 'reveal', 'ward'].includes(event.kind)) return fail('invalid hero effect kind');
    if (!active(target) || !point(target.position)) return fail('target inactive');
    if (tape && event.kind==='status') {
      const anchor=deployments.get(key),index=event.pulseIndex;
      if (d.role!=='ability' || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId<=0 || event.deploymentId!==anchor.id || sim.time>=anchor.until || target.id!==anchor.linkedTarget || !['hero','trooper'].includes(target.kind) || target.team===source.team || !point(event.origin) || Object.getPrototypeOf(event.origin)!==Object.prototype || ['x','y','z'].some(axis=>Math.abs(event.origin[axis]-source.position[axis])>1e-9) || distance(source.position,target.position)>d.breakDistance+1e-9 || !Number.isInteger(index) || index<0 || index>=d.linkMaxApplicationsPerTarget || Math.abs(sim.time-(anchor.startedAt+index*d.interval))>H+1e-9 || event.slowDuration!==d.slowDuration || anchor.indices.has(index) || anchor.indices.size>=d.linkMaxApplicationsPerTarget) return fail('invalid Tape Snag status receipt');
      if (status(target.id).invulnerable) return fail('invulnerable');
      anchor.indices.add(index);putStatus(target.id,source.id,'tapesnag',{until:sim.time+d.slowDuration,slow:d.slow});
      emit('status',{sourceId:source.id,targetId:target.id,ability:d.key,pulseIndex:index,slow:d.slow,duration:d.slowDuration});return {ok:true};
    }
    if (fern) {
      const anchor=liveDeployment(key,event),index=patient?event.pulseIndex:event.applicationIndex,cap=patient?d.wardMaxApplicationsPerTarget:d.speedMaxApplicationsPerTarget;
      if(d.role!=='ability'||!anchor||!Number.isSafeInteger(event.deploymentId)||event.deploymentId<=0||!Number.isInteger(index)||index<0||index>=cap||Math.abs(sim.time-(anchor.startedAt+index*d.interval))>H+1e-9||!['hero','trooper'].includes(target.kind)||target.team!==source.team||distance(anchor.origin,target.position)>d.radius+1e-9||(patient?event.invulnerabilityDuration!==d.invulnerabilityDuration:event.speedMultiplier!==d.speedMultiplier||event.speedDuration!==d.speedDuration))return fail('invalid Fern receipt');
      const used=anchor.indices.get(target.id);
      if(used?.has(index)||(used?.size??0)>=cap)return fail('Fern application already accepted');
      const indices=used??new Set();indices.add(index);anchor.indices.set(target.id,indices);
      const duration=patient?d.invulnerabilityDuration:d.speedDuration;
      putStatus(target.id,source.id,patient?'patientgrowth-ward':'windowpatch-speed',{until:sim.time+duration,...(patient?{invulnerable:true}:{speedMultiplier:d.speedMultiplier})});
      emit(event.kind,{sourceId:source.id,targetId:target.id,ability:d.key,duration,...(patient?{pulseIndex:index}:{applicationIndex:index,speedMultiplier:d.speedMultiplier})});return {ok:true};
    }
    if (assembly && ['ward','speed'].includes(event.kind)) {
      const shield=event.kind==='ward',anchor=liveDeployment(key,event),index=shield?event.pulseIndex:event.applicationIndex,cap=shield?d.wardMaxApplicationsPerTarget:d.speedMaxApplicationsPerTarget,interval=shield?d.wardInterval:d.interval;
      if (d.role!=='ability' || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId<=0 || !Number.isInteger(index) || index<0 || index>=cap || Math.abs(sim.time-(anchor.startedAt+index*interval))>H+1e-9 || Object.getPrototypeOf(event.origin)!==Object.prototype || !['hero','trooper'].includes(target.kind) || target.team!==source.team || distance(anchor.origin,target.position)>d.radius+1e-9 || (shield?event.invulnerabilityDuration!==d.invulnerabilityDuration:event.speedMultiplier!==d.speedMultiplier||event.speedDuration!==d.speedDuration)) return fail('invalid recorded assembly receipt');
      const counts=shield?anchor.wardIndices:anchor.speedIndices,used=counts.get(target.id);
      if (used?.has(index)||(used?.size??0)>=cap) return fail('assembly application already accepted');
      const indices=used??new Set();indices.add(index);counts.set(target.id,indices);
      const duration=shield?d.invulnerabilityDuration:d.speedDuration;
      putStatus(target.id,source.id,shield?'recordedassembly-ward':'recordedassembly-speed',{until:sim.time+duration,...(shield?{invulnerable:true}:{speedMultiplier:d.speedMultiplier})});
      emit(shield?'ward':'speed',{sourceId:source.id,targetId:target.id,ability:d.key,duration,...(shield?{pulseIndex:index}:{applicationIndex:index,speedMultiplier:d.speedMultiplier})});return {ok:true};
    }
    if (event.kind === 'ward') {
      const anchor=deployments.get(key),index=event.pulseIndex;
      if (!ward || d.role!=='ability' || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId<=0 || event.deploymentId!==anchor.id || sim.time>=anchor.until || !Number.isInteger(index) || index<0 || index>=d.wardMaxApplicationsPerTarget || Math.abs(sim.time-(anchor.startedAt+index*d.interval))>H+1e-9 || !['hero','trooper'].includes(target.kind) || target.team!==source.team || !point(event.origin) || Object.getPrototypeOf(event.origin)!==Object.prototype || ['x','y','z'].some(axis=>Math.abs(event.origin[axis]-source.position[axis])>1e-9) || distance(source.position,target.position)>d.radius+1e-9 || event.invulnerabilityDuration!==d.invulnerabilityDuration) return fail('invalid permanent ward receipt');
      const used=anchor.pulses.get(target.id);
      if (used?.has(index) || (used?.size??0)>=d.wardMaxApplicationsPerTarget) return fail('ward pulse already applied');
      const indices=used??new Set();indices.add(index);anchor.pulses.set(target.id,indices);
      putStatus(target.id,source.id,'permanentrecord-ward',{until:sim.time+d.invulnerabilityDuration,invulnerable:true});
      emit('ward',{sourceId:source.id,targetId:target.id,ability:d.key,pulseIndex:index,duration:d.invulnerabilityDuration});return {ok:true};
    }
    if (sideA && event.kind === 'speed') {
      const anchor=liveDeployment(key,event);
      if (d.role!=='ability' || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId<=0 || event.pulseIndex!==0 || Math.abs(sim.time-anchor.startedAt)>H+1e-9 || Object.getPrototypeOf(event.origin)!==Object.prototype || !['hero','trooper'].includes(target.kind) || target.team!==source.team || distance(anchor.origin,target.position)>d.radius+1e-9 || event.speedMultiplier!==d.speedMultiplier || event.speedDuration!==d.speedDuration || anchor.targets.has(target.id)) return fail('invalid Side A pulse or target');
      anchor.targets.add(target.id);putStatus(target.id,source.id,'sidea-speed',{until:sim.time+d.speedDuration,speedMultiplier:d.speedMultiplier});
      emit('speed',{sourceId:source.id,targetId:target.id,ability:d.key,duration:d.speedDuration,speedMultiplier:d.speedMultiplier});return {ok:true};
    }
    if (passage && ['speed', 'status'].includes(event.kind)) {
      const speed = event.kind === 'speed', anchor = deployments.get(key), index = event.zoneIndex;
      if (d.role !== 'ability' || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId <= 0 || event.deploymentId !== anchor.id || sim.time >= anchor.until || !Number.isInteger(index) || index < 0 || index >= d.fieldCount || !point(event.origin) || Object.getPrototypeOf(event.origin) !== Object.prototype || ['x','y','z'].some(axis => Math.abs(event.origin[axis]-anchor.centers[index][axis]) > 1e-9) || distance(anchor.centers[index],target.position) > d.radius+1e-9 || !['hero','trooper'].includes(target.kind) || (speed ? target.team !== source.team || event.speedMultiplier !== d.speedMultiplier || event.speedDuration !== d.speedDuration : target.team === source.team || event.slowDuration !== d.slowDuration)) return fail('invalid passage target or receipt');
      if (!speed && status(target.id).invulnerable) return fail('invulnerable');
      const counts = speed ? anchor.speedCounts : anchor.slowCounts, count = counts.get(target.id) ?? 0;
      if (count >= (speed ? d.speedMaxApplicationsPerTarget : d.slowMaxApplicationsPerTarget)) return fail('passage application budget exhausted');
      counts.set(target.id,count+1);
      putStatus(target.id,source.id,speed?'unprintedpassage-speed':'unprintedpassage-slow',{until:sim.time+(speed?d.speedDuration:d.slowDuration),...(speed?{speedMultiplier:d.speedMultiplier}:{slow:d.slow})});
      emit(speed?'speed':'status',{sourceId:source.id,targetId:target.id,ability:d.key,duration:speed?d.speedDuration:d.slowDuration,...(speed?{speedMultiplier:d.speedMultiplier}:{slow:d.slow})});
      return {ok:true};
    }
    if (event.kind === 'speed') {
      const anchor = deployments.get(key);
      if (!rally || d.role !== 'ability' || target.team !== source.team || !['hero', 'trooper'].includes(target.kind) || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId <= 0 || event.deploymentId !== anchor.id || sim.time >= anchor.until || !point(event.origin) || Object.getPrototypeOf(event.origin) !== Object.prototype || ['x', 'y', 'z'].some(axis => Math.abs(event.origin[axis]-source.position[axis]) > 1e-9) || distance(source.position, target.position) > d.radius + 1e-9 || event.speedMultiplier !== d.speedMultiplier || event.speedDuration !== d.speedDuration) return fail('invalid rally speed');
      const count = anchor.counts.get(target.id) ?? 0;
      if (count >= d.speedMaxApplicationsPerTarget) return fail('speed application budget exhausted');
      anchor.counts.set(target.id, count + 1);
      putStatus(target.id, source.id, d.key, { until: sim.time + d.speedDuration, speedMultiplier: d.speedMultiplier });
      emit('speed', { sourceId: source.id, targetId: target.id, ability: d.key, speedMultiplier: d.speedMultiplier, duration: d.speedDuration });
      return { ok: true };
    }
    if (event.kind === 'reveal' || trap && event.kind === 'status') {
      const revealing = event.kind === 'reveal', anchor = liveDeployment(key, event);
      if (!trap || d.role !== 'ability' || target.team === source.team || !(revealing ? ['hero', 'trooper', 'structure'] : ['hero', 'trooper']).includes(target.kind) || !anchor || !Number.isSafeInteger(event.deploymentId) || event.deploymentId <= 0 || Object.getPrototypeOf(event.origin) !== Object.prototype || distance(anchor.origin, target.position) > d.radius + 1e-9 || (revealing ? event.revealDuration !== d.revealDuration || event.revealMode !== d.revealMode : event.slowDuration !== d.slowDuration)) return fail('invalid trap target or receipt');
      if (!revealing && status(target.id).invulnerable) return fail('invulnerable');
      const counts = revealing ? anchor.revealCounts : anchor.counts, count = counts.get(target.id) ?? 0;
      if (count >= (revealing ? d.revealMaxApplicationsPerTarget : d.slowMaxApplicationsPerTarget)) return fail('trap application budget exhausted');
      counts.set(target.id, count + 1);
      const duration = revealing ? d.revealDuration : d.slowDuration;
      putStatus(target.id, source.id, revealing ? 'speedtrap-reveal' : 'speedtrap-slow', { until: sim.time + duration, ...(revealing ? { revealTeam: source.team } : { slow: d.slow }) });
      emit(revealing ? 'reveal' : 'status', { sourceId: source.id, targetId: target.id, ability: d.key, duration, ...(revealing ? { revealTeam: source.team } : { slow: d.slow }) });
      return { ok: true };
    }
    if (event.kind === 'status') {
      // New pure slows must respect the controller's existing 10% movement floor.
      if (!isPureSlowDefinition(d) ||
        event.baseDamage !== 0 || event.baseHeal !== 0 || event.spiritScale !== 0 || event.damageType !== 'none' ||
        event.slow !== d.slow || event.duration !== d.duration || event.headshot || multiplier !== 1) return fail('invalid status-only slow');
      if (target.team === source.team || !['hero','trooper'].includes(target.kind)) return fail('invalid status target');
      let anchor;
      if (d.anchoredSlow) {
        anchor = liveDeployment(key, event);
        if (!anchor || Object.getPrototypeOf(event.origin) !== Object.prototype || distance(anchor.origin, target.position) > d.radius) return fail('invalid anchored slow target');
      } else if (distance(source.position, target.position) > d.range) return fail('out of range');
      if (status(target.id).invulnerable) return fail('invulnerable');
      if (d.anchoredSlow && d.maxApplicationsPerTarget !== null) {
        const count = anchor.counts.get(target.id) ?? 0;
        if (count >= d.maxApplicationsPerTarget) return fail('application budget exhausted');
        anchor.counts.set(target.id, count + 1);
      }
      putStatus(target.id, source.id, d.key, { until: sim.time + d.slowDuration, slow: d.slow });
      source.cloakUntil = 0; cancelRecall(source, 'attacked'); source.recallBlocked = source.retreatHeld;
      emit('status', { sourceId: source.id, targetId: target.id, ability: d.key, slow: d.slow, duration: d.slowDuration });
      return { ok: true };
    }
    let burst;
    if (burstAbility) {
      burst = bursts.get(source.id)?.get(event.burstId);
      if (event.kind !== 'damage' || !Number.isSafeInteger(event.burstId) || event.burstId <= 0 || !burst || burst.ability!==d.key || sim.time >= burst.until || !Number.isInteger(event.projectileIndex) || event.projectileIndex < 0 || event.projectileIndex >= d.projectileCount || burst.used.has(event.projectileIndex) || (burst.counts.get(target.id) ?? 0) >= d.maxHitsPerTarget || !point(event.origin) || Object.getPrototypeOf(event.origin) !== Object.prototype || distance(burst.origin, event.origin) > (d.projectileRange??d.range) + 1e-9) return fail('invalid or exhausted burst impact');
      if(target.kind==='panel'){
        if(['X','Y','Z'].some(axis=>event.origin[axis.toLowerCase()]<target.bounds[`min${axis}`]-d.projectileRadius-1e-9||event.origin[axis.toLowerCase()]>target.bounds[`max${axis}`]+d.projectileRadius+1e-9))return fail('impact outside panel bounds');
      }else{
        const radius = (target.kind === 'structure' ? 3 : .6) + d.projectileRadius, height = target.kind === 'structure' ? 12 : 1.8;
        if (Math.abs(event.origin.x - target.position.x) > radius + 1e-9 || Math.abs(event.origin.z - target.position.z) > radius + 1e-9 || event.origin.y < target.position.y - d.projectileRadius - 1e-9 || event.origin.y > target.position.y + height + d.projectileRadius + 1e-9) return fail('impact outside target bounds');
      }
    }
    const remote = ['turret', 'puddle', 'grenade', 'missionbomb', 'flyingdigits','sheenwall'].includes(d.key);
    if (remote && !point(event.origin)) return fail('effect origin required');
    if (['turret', 'puddle'].includes(d.key) && !liveDeployment(key, event)) return fail('inactive or mismatched deployment');
    const origin = remote ? event.origin : source.position, range = d.key==='sheenwall'?d.projectileRange:remote ? d.radius || d.range : d.range || d.radius;
    if (targetDistance(origin, target) > range) return fail('out of range');
    if (event.kind === 'heal') {
      if (event.baseHeal !== d.baseHeal || d.baseHeal <= 0 || target.team !== source.team || ['structure','panel'].includes(target.kind)) return fail('invalid healing target or amount');
      const amount = Math.min(target.maxHp - target.hp, d.baseHeal * stats(source.id).damageMultiplier);
      target.hp += amount;
      emit('heal', { sourceId: source.id, targetId: target.id, amount, ability: d.key });
      return { ok: true, amount };
    }
    if (event.baseDamage !== d.baseDamage || d.baseDamage <= 0) return fail('invalid base damage');
    const kind = d.damageType === 'weapon' ? 'projectile' : d.role === 'melee' ? 'melee' : 'ability';
    const result = resolveDamage(target.id, d.baseDamage * multiplier, source.id, kind, range, origin, false, d.role !== 'ability');
    if (result.ok && burst) { burst.used.add(event.projectileIndex); burst.counts.set(target.id, (burst.counts.get(target.id) ?? 0) + 1); }
    if (result.ok && !result.intercepted && d.slow && active(target) && !['structure','panel'].includes(target.kind)) putStatus(target.id, source.id, d.key, { until: sim.time + d.slowDuration, slow: d.slow });
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
    target.alive = false; target.hp = 0; target.deathTime = sim.time; target.pendingAttack = null;
    for (const attacker of [...sim.troopers, ...structures]) if (attacker.pendingAttack?.targetId === target.id) attacker.pendingAttack = null;
    if(target.kind==='panel'){panels.delete(target.id);emit('panel_destroyed',{id:target.id,sourceId:source.id,ownerId:target.sourceId});return;}
    if (['hero','trooper'].includes(target.kind)) for(const [key,anchor] of deployments) if(anchor.linkedTarget===target.id) removeOwnedDeployment(key);
    if (target.kind === 'trooper') dropOrbs(target, source);
    if (target.kind === 'hero') {
      target.respawnRemaining = 5 + Math.floor(Math.max(0, sim.time - PREGAME) / 60) * 2;
      cancelRecall(target, 'death'); target.retreatHeld = false; target.cloakUntil = 0; target.heavyCharge = null;
      statuses.delete(target.id); bursts.delete(target.id);
      for (const ability of ['turret', 'puddle', 'endshiftsprint', 'speedtrap', 'unprintedpassage', 'permanentrecord', 'sidea', 'recordedassembly', 'tapesnag', 'keepclear','sheenwall','windowpatch','patientgrowth']) removeOwnedDeployment(JSON.stringify([target.id, ability]));
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
        for (const attacker of [...sim.troopers, ...structures]) attacker.pendingAttack = null;
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
  function resolveDamage(targetId, amount, sourceId, kind, range, origin, consumeAmmo, checkWorld = true) {
    let target = entity(targetId);const source = entity(sourceId);
    if (sim.phase === 'pregame' || sim.phase === 'finished') return fail('match inactive');
    if (!active(target) || !active(source)) return fail('source or target inactive');
    if (source.team === target.team) return fail('friendly fire');
    if (target.kind === 'structure' && !target.vulnerable) return fail('objective locked');
    if(source.kind==='panel')return fail('panel cannot attack');
    const hs = source.kind === 'hero' ? stats(source.id) : null;
    if (!point(source.position) || !point(origin) || !point(target.position) || targetDistance(origin, target) > range) return fail('out of range');
    if(panels.size&&['projectile','melee'].includes(kind)){
      const obstruction=firstPanel({...origin,y:origin.y+.9},{...target.position,y:target.position.y+.9},target.kind==='panel'?target.id:null);
      if(obstruction){if(obstruction.team===source.team)return fail('friendly panel blocks attack');target=obstruction;}
    }
    if (checkWorld && ['projectile','melee'].includes(kind) && !worldLineClear(source, target, origin)) return fail('world cover blocks attack');
    const protection=status(target.id);
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
    if (hs?.projectileSlow && kind === 'projectile' && !['structure','panel'].includes(target.kind)) target.slowUntil = sim.time + 2;
    if (hs?.lifesteal && target.kind!=='panel') source.hp = Math.min(source.maxHp, source.hp + dealt * hs.lifesteal);
    if (target.kind === 'trooper') target.candleScale = target.emissiveScale = Math.max(0.15, target.hp / target.maxHp);
    emit('damage', { sourceId, sourceKind: source.kind, targetId, targetKind: target.kind, amount: dealt, kind });
    if (target.type === 'patron' && target.patronPhase === 1) {
      target.patronPhase = 2; target.maxHp = HEALTH.patron / 2; target.hp = target.maxHp;
      target.position.z += target.team === 'carbon' ? -20 : 20;
      emit('patron_phase', { id: target.id, team: target.team, from: 1, to: 2, maxHp: target.maxHp, position: copy(target.position) });
    } else if (target.hp <= 0) die(target, source);
    return { ok: true, amount: dealt, killed: !target.alive, ...(target.id!==targetId?{intercepted:target.id}:{}) };
  }
  function shootOrb(heroId, orbId, options = {}) {
    if (!options || typeof options !== 'object' || options.kitShot !== undefined && typeof options.kitShot !== 'boolean') return fail('invalid orb shot');
    if (options.kitShot && !heroKits.has(heroId)) return fail('kit not configured');
    const h = heroById(heroId), orb = sim.orbs.find(o => o.id === orbId);
    if (!active(h) || sim.phase === 'pregame' || sim.phase === 'finished') return fail('hero or match inactive');
    if (!orb || orb.type !== 'floating' || orb.claimed || sim.time >= orb.expiresAt) return fail('orb unavailable');
    if (!point(h.position) || distance(h.position, orb.position) > 60) return fail('out of range');
    if(panels.size&&firstPanel({...h.position,y:h.position.y+.9},orb.position))return fail('panel blocks orb shot');
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
      if (stats(h.id).movementStopped) return fail('movement stopped');
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
        slowUntil: 0, candleScale: 1, emissiveScale: 1, targetId: null, pendingAttack: null, distanceMarched: 0 });
    }
    emit('wave', { number: waveNumber, count: 24 });
  }
  function nearest(source, list, range) {
    // ponytail: linear scans per attacker; use spatial bins if population expands.
    let best = null, bestDistance = range;
    for (const t of list) {
      if (!active(t) || t.team === source.team || hidden(t)) continue;
      const d = distance(source.position, t.position);
      if (d <= bestDistance && attackVisible(source, t)) { best = t; bestDistance = d; }
    }
    return best;
  }
  function selectTarget(source, range) {
    return nearest(source, sim.troopers, range) ?? nearest(source, sim.heroes, range) ?? nearest(source, structures.filter(s => s.vulnerable), range);
  }
  function updateAttack(source, range, amount) {
    const target = selectTarget(source, range);
    source.targetId = target?.id ?? null;
    if (source.pendingAttack) {
      const attack = source.pendingAttack;
      if (target?.id !== attack.targetId) source.pendingAttack = null;
      else if (sim.time + 1e-9 >= attack.releaseAt) {
        source.pendingAttack = null;
        damage(attack.targetId, amount, source.id);
      }
    } else if (target && source.nextAttack <= sim.time + 1e-9) {
      source.pendingAttack = { targetId:target.id, started:sim.time, releaseAt:(tick+7)/20 };
      source.nextAttack = sim.time+1;
    }
    return target;
  }
  function walk(t) {
    let remaining = 8 * H * slowMultiplier(t) * status(t.id).speed;
    if (t.waypoint >= t.path.length) {
      const patron = structures.find(s => s.type === 'patron' && s.team !== t.team && s.vulnerable);
      if (patron && distance(t.position, patron.position) > 20) t.path.push(copy(patron.position));
    }
    if(panels.size){
      const position=copy(t.position);let waypoint=t.waypoint,marched=0;
      while(remaining>0&&waypoint<t.path.length){
        const to=t.path[waypoint],d=distance(position,to),used=Math.min(d,remaining),candidate=copy(position);
        if(d>0)for(const axis of ['x','y','z'])candidate[axis]+=(to[axis]-position[axis])*used/d;
        if(firstPanel(position,candidate,null,.4,1.8))return;
        Object.assign(position,candidate);marched+=used;remaining-=used;
        if(d<=used+1e-9)waypoint++;else break;
      }
      Object.assign(t.position,position);t.distanceMarched+=marched;t.waypoint=waypoint;return;
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
        const ring = retreatRings.find(r => r.team === h.team && distance(r.position, h.position) <= r.radius);
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
      for (const [key, anchor] of deployments) if (anchor.until <= sim.time) removeOwnedDeployment(key);
      for (const [sourceId, ledger] of bursts) {
        for (const [id, burst] of ledger) if (burst.until <= sim.time) ledger.delete(id);
        if (!ledger.size) bursts.delete(sourceId);
      }
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
        const target = updateAttack(t, 20, 12);
        if (!target) walk(t);
        if (sim.phase === 'finished') break;
      }
      if (sim.phase === 'finished') continue;
      for (const s of structures) {
        if (!active(s) || s.type === 'shrine') continue;
        updateAttack(s, 28, s.type === 'walker' ? 28 : 20);
      }
      updateOrbs();
      sim.troopers = sim.troopers.filter(t => t.alive || sim.time - t.deathTime < 1);
    }
    return { ok: true, steps, time: sim.time };
  }
  function isRevealedTo(targetId, viewerTeam) {
    if (!validId(targetId) || !TEAMS.includes(viewerTeam)) return false;
    for (const effect of statuses.get(targetId)?.values() ?? []) if (effect.revealTeam === viewerTeam && effect.until > sim.time) {
      const target = entity(targetId);
      return !!active(target) && target.team !== viewerTeam;
    }
    return false;
  }
  Object.assign(sim, { addHero, configureHeroKit, applyHeroEffect, isRevealedTo, wallPanels, step, damage, shootOrb, buyItem, activateItem, setRetreat, shopAvailable, stats, moveHero,
    drainEvents() { return sim.events.splice(0); } });
  return sim;
}
