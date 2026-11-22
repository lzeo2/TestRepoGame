// Original game objectives for fictional storefronts and a parcel prop.
const RULES = Object.freeze({
  bank: { loot: 'cash', reward: 2750, severity: 3, escape: 52, time: 360, cooldown: 360 },
  jeweller: { loot: 'jewellery', reward: 1500, severity: 2, escape: 36, time: 300, cooldown: 300 },
  rail: { label: 'Parcel symbols', cues: ['up','y','x'], reward: 1950, severity: 2, escape: 42, time: 420, cooldown: 300 },
});
const BUTTONS = Object.freeze({ x: 'X', y: 'Y', up: '↑' });
const KEYS = Object.keys(BUTTONS);
const EMPTY = Object.freeze({ active: false, site: null, phase: null, guidance: '', target: null,
  indoorTarget: null, employeeId: null, challenge: null, remaining: 0 });
const THREAT_RANGE = 3.2;
const THREAT_DOT = Math.cos(Math.PI / 4);
const THREAT_PROMPT = 'Aim at the employee (Z / right mouse, or AIM), then press E / USE. A recent melee hit also counts.';
const isPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const toPoint = p => Object.freeze({ x: p.x, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const message = (ok, text) => ({ ok, message: text });
const onFoot = ctx => ctx.onFoot === true && !ctx.railPassenger && !ctx.swimming;

function matchingEmployee(ctx, room) {
  const employee = ctx.employee;
  return isPoint(employee) && employee.kind === 'employee' && Number.isFinite(employee.health) && employee.health > 0 &&
    employee.id === room.employeeId && employee.storeId === room.storeId && employee.roomId === room.id;
}

function aimedAtEmployee(ctx, gap) {
  if (ctx.armed !== true || ctx.aiming !== true || !Number.isFinite(ctx.aimYaw)) return false;
  const dx = ctx.employee.x - ctx.pose.x;
  const dz = ctx.employee.z - ctx.pose.z;
  return -Math.sin(ctx.aimYaw) * dx - Math.cos(ctx.aimYaw) * dz >= gap * THREAT_DOT;
}

function loadSites(sites) {
  const accepted = new Map();
  for (const site of sites) {
    if (!site || typeof site.id !== 'string' || !site.id || accepted.has(site.id) ||
        typeof site.name !== 'string' || !site.name || !isPoint(site) || !Object.hasOwn(RULES, site.kind) ||
        (site.kind === 'rail' && (typeof site.stopId !== 'string' || !site.stopId))) continue;
    const radius = Number.isFinite(site.radius) ? Math.max(1, Math.min(4, site.radius)) : 3;
    accepted.set(site.id, Object.freeze({ id: site.id, name: site.name, kind: site.kind, ...toPoint(site), radius,
      stopId: site.stopId, arrivalStopId: site.arrivalStopId,
      boarding: isPoint(site.boarding) ? toPoint(site.boarding) : null,
      pickup: isPoint(site.pickup) ? toPoint(site.pickup) : null }));
  }
  return [...accepted.values()];
}

export function createHeistActivities({ sites = [], onHeat, onReward, canSee = () => true } = {}) {
  const locations = loadSites(sites), cooldowns = new Map();
  let current = null, clock = 0, serial = 0;

  function nearby(pose) {
    if (!isPoint(pose)) return null;
    let nearest = null, gap = Infinity;
    for (const site of locations) {
      const metres = distance(pose, site);
      if (metres <= site.radius && metres < gap && canSee(pose, site)) {
        nearest = site;
        gap = metres;
      }
    }
    return nearest;
  }

  function indoorSite(ctx) {
    if (!ctx.indoors || !onFoot(ctx) || !ctx.room) return null;
    const { id, storeId, heistSiteId, employeeId, loot } = ctx.room;
    if (typeof storeId !== 'string' || id !== `interior-${storeId}` || heistSiteId !== storeId ||
        employeeId !== `${id}-employee` || !isPoint(loot) || loot.id !== `${id}-loot` ||
        !Number.isFinite(loot.radius) || loot.radius <= 0) return null;
    return locations.find(site => site.kind !== 'rail' && site.id === storeId) || null;
  }

  function canSeeInside(pose, target, roomId) {
    return canSee({ ...pose, interiorId:roomId }, { ...target, interiorId:roomId });
  }

  function cancel(reason = 'Heist cancelled.') {
    if (!current) return null;
    if (!current.sandbox && current.phase === 'escape') cooldowns.set(current.site.id, clock + 45);
    current = null;
    return message(false, reason);
  }

  function beginPuzzle(attempt) {
    attempt.phase = 'puzzle';
    attempt.index = 0;
    attempt.mistakes = 0;
    attempt.armed = false;
  }

  function startAvailability(site, ctx, sandbox, allowWanted = false) {
    if (!sandbox && !allowWanted && ctx.wanted !== 0) return message(false, 'Clear your wanted level before starting.');
    const readyIn = (cooldowns.get(site.id) ?? 0) - clock;
    return !sandbox && readyIn > 0 ? message(false, `Heist available in ${Math.ceil(readyIn)}s.`) : null;
  }

  function confront(ctx, site, sandbox) {
    const { room, employee, pose } = ctx;
    const nearLoot = distance(pose, room.loot) <= Math.min(2, room.loot.radius);
    if (!matchingEmployee(ctx, room)) return nearLoot ? message(false, 'There is no employee available to confront.') : null;
    const gap = distance(pose, employee);
    if (gap > THREAT_RANGE || !canSeeInside(pose, employee, room.id)) {
      return nearLoot ? message(false, 'Move within sight of the employee first.') : null;
    }
    const melee = employee.lastPlayerHit === true;
    if (!melee && !aimedAtEmployee(ctx, gap)) return message(false, THREAT_PROMPT);
    const unavailable = startAvailability(site, ctx, sandbox, melee);
    if (unavailable) return unavailable;
    const rules = RULES[site.kind];
    const loot = Object.freeze({ id:room.loot.id, ...toPoint(room.loot), radius:Math.min(2, room.loot.radius),
      name:rules.loot === 'cash' ? 'Cash' : 'Jewellery', interiorId:room.id });
    current = { site, rules, sandbox, loot, roomId:room.id, employeeId:employee.id,
      roomCrime:Object.freeze({ type:'robbery', targetId:employee.id, phase:'handover' }),
      remaining:rules.time, phase:'surrender', heatSeen:false, origin:null };
    return message(true, `Employee surrendered. E / USE takes the ${rules.loot}.`);
  }

  function interact(ctx = {}) {
    if (!isPoint(ctx.pose) || ctx.paused || ctx.recovering || ctx.busy || ctx.doorway) return null;
    const sandbox = ctx.sandbox === true;
    if (current) {
      if (current.sandbox !== sandbox) return null;
      if (current.phase === 'surrender') {
        if (indoorSite(ctx) !== current.site || ctx.room.id !== current.roomId ||
            !matchingEmployee(ctx, ctx.room) || distance(ctx.pose, current.loot) > current.loot.radius ||
            !canSeeInside(ctx.pose, current.loot, current.roomId)) return null;
        return collect(current, current.site);
      }
      if (current.phase === 'puzzle') return cancel();
      if (current.phase !== 'ride' || !ctx.railPassenger || !ctx.railStopId || ctx.railStopId === current.site.stopId ||
          (current.site.arrivalStopId && ctx.railStopId !== current.site.arrivalStopId) || ctx.indoors) return null;
      beginPuzzle(current);
      return message(true, 'Match the parcel symbols.');
    }
    if (ctx.indoors) {
      const site = indoorSite(ctx);
      return site ? confront(ctx, site, sandbox) : null;
    }
    if (!onFoot(ctx)) return null;
    const site = nearby(ctx.pose);
    if (site?.kind !== 'rail') return null;
    const unavailable = startAvailability(site, ctx, sandbox);
    if (unavailable) return unavailable;
    const rules = RULES[site.kind], offset = serial++ % rules.cues.length;
    const sequence = Object.freeze([...rules.cues.slice(offset), ...rules.cues.slice(0, offset)]);
    current = { site, rules, sequence, sandbox, remaining: rules.time, phase: 'board',
      heatSeen: false, origin: null };
    return message(true, 'Board the light rail at the marked stop.');
  }

  function collect(attempt, pose) {
    attempt.origin = toPoint(pose);
    attempt.phase = 'escape';
    attempt.escapeRemaining = attempt.rules.escape;
    attempt.awaitingDismount = attempt.site.kind === 'rail';
    attempt.awaitingExit = !!attempt.roomId;
    if (!attempt.sandbox) {
      const { id, kind } = attempt.site;
      onHeat?.(Object.freeze({ id, kind, point: attempt.origin, severity: attempt.rules.severity }));
    }
    return message(true, attempt.awaitingExit ? 'Loot collected. Exit the building and lose any wanted stars.' :
      'Loot collected. Leave the area and lose any wanted stars.');
  }

  function step(dt, ctx = {}, input = {}) {
    if (ctx.paused || !Number.isFinite(dt) || dt <= 0) return null;
    const elapsed = Math.min(dt, 1);
    clock += elapsed;
    if (!current) return null;
    const attempt = current;
    if (ctx.recovering || !isPoint(ctx.pose) || Boolean(ctx.sandbox) !== attempt.sandbox || ctx.busy) {
      return cancel('Heist interrupted.');
    }
    attempt.remaining -= elapsed;
    if (attempt.remaining <= 0) return cancel('Heist time expired. Return to the marker to retry.');

    if (attempt.phase === 'board') {
      if (ctx.railPassenger && ctx.railStopId === attempt.site.stopId) {
        attempt.phase = 'ride';
        return message(true, 'Stay on board. When the train stops at the pickup, press E.');
      }
      return null;
    }
    if (attempt.phase === 'ride') return ctx.railPassenger ? null : cancel('You left the train before the pickup.');

    if (attempt.phase === 'surrender') {
      if (indoorSite(ctx) !== attempt.site || ctx.room.id !== attempt.roomId) {
        return cancel('You left before collecting the loot. Return inside to retry.');
      }
      if (!matchingEmployee(ctx, ctx.room)) return cancel('The employee is unavailable. Return inside to retry.');
      return null;
    }

    if (attempt.phase === 'puzzle') {
      if (!ctx.railPassenger || ctx.indoors) return cancel('Move back to the heist marker to retry.');
      const held = KEYS.filter(key => input?.[key] === true);
      if (!held.length) { attempt.armed = true; return null; }
      if (!attempt.armed) return null;
      attempt.armed = false;
      if (held.length === 1 && held[0] === attempt.sequence[attempt.index]) {
        attempt.index++;
        return attempt.index === attempt.sequence.length ? collect(attempt, ctx.pose) : null;
      }
      attempt.index = 0;
      if (++attempt.mistakes >= 3) return cancel('Pattern missed. Press E at the marker to retry.');
      return message(false, 'Wrong symbol. Match the sequence again.');
    }

    if (ctx.wanted > 0) attempt.heatSeen = true;
    attempt.awaitingDismount = Boolean(ctx.railPassenger);
    attempt.awaitingExit = !!attempt.roomId && Boolean(ctx.indoors);
    attempt.escapeRemaining = Math.ceil(Math.max(0, attempt.rules.escape - distance(ctx.pose, attempt.origin)));
    if (attempt.awaitingDismount || ctx.indoors || attempt.escapeRemaining > 0 ||
        (!attempt.sandbox && (!attempt.heatSeen || ctx.wanted !== 0))) return null;
    const amount = attempt.sandbox ? 0 : attempt.rules.reward;
    current = null;
    if (amount) {
      cooldowns.set(attempt.site.id, clock + attempt.rules.cooldown);
      onReward?.(Object.freeze({ id: attempt.site.id, kind: attempt.site.kind, amount }));
    }
    return message(true, amount ? `Heist complete · +$${amount.toLocaleString('en-AU')}` : 'Practice heist complete.');
  }

  function snapshot() {
    if (!current) return EMPTY;
    const { site, phase, sequence, index, mistakes, rules, remaining } = current;
    let target = null, indoorTarget = null, challenge = null, guidance = '';
    if (phase === 'board') {
      target = { ...(site.boarding || site), name: 'Board light rail' };
      guidance = 'Board the light rail at the marked stop.';
    } else if (phase === 'ride') {
      if (site.pickup) target = { ...site.pickup, name: 'Parcel pickup stop' };
      guidance = 'At the pickup stop, press E on board to collect the parcel.';
    } else if (phase === 'puzzle') {
      guidance = 'Match the displayed symbols. Release each key before pressing the next.';
      challenge = Object.freeze({ active: true, kind: 'heist', phase: 'cue', label: rules.label, sequence, index, mistakes,
        maxMistakes: 3, expectedKey: sequence[index], instruction: `PRESS ${BUTTONS[sequence[index]]}`, guidance: `${guidance} E cancels.` });
    } else if (phase === 'surrender') {
      indoorTarget = current.loot;
      guidance = `E / USE to take the ${rules.loot}.`;
    } else {
      guidance = current.awaitingDismount ? 'Leave the train at a stop.' :
        current.awaitingExit ? 'Exit the building, then leave the area and lose any wanted stars.' :
        current.escapeRemaining > 0 ? `Get ${current.escapeRemaining} m farther from the pickup and lose any wanted stars.` :
          'Lose your wanted stars to complete the heist.';
    }
    return Object.freeze({ active: true, site, phase, guidance, target: target && Object.freeze(target),
      indoorTarget, employeeId:current.employeeId ?? null, challenge, remaining: Math.max(0, remaining) });
  }

  return { get active() { return !!current; },
    get roomCrime() { return current?.phase === 'surrender' || current?.awaitingExit ? current.roomCrime : null; },
    nearby, interact, step, snapshot, cancel };
}
