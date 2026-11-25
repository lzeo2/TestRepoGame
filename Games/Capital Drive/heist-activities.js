// Original game objectives for playable businesses, exhibits and props.
const RULES = Object.freeze({
  bank: { loot: 'cash', lootName:'Secured cash', releaseSeconds:3.5, reward: 2750, severity: 3, escape: 52, time: 360, cooldown: 360 },
  jeweller: { loot: 'jewellery', reward: 1500, severity: 2, escape: 36, time: 300, cooldown: 300 },
  tower: { loot: 'archive case', lootName: 'Archive case', reward: 2200, severity: 2, escape: 48, time: 360, cooldown: 360 },
  memorial: { label: 'Exhibition case symbols', cues: ['up','x','y','x'], reward: 1800, severity: 2, escape: 44, time: 360, cooldown: 360 },
  rail: { label: 'Parcel symbols', cues: ['up','y','x'], reward: 1950, severity: 2, escape: 42, time: 420, cooldown: 300 },
});
const VAULT = Object.freeze({ ...RULES.bank, lootName:'Vault cash', label:'Vault symbols', cues:['x','up','y','x'], reward:3100 });
const BUTTONS = Object.freeze({ x: 'X', y: 'Y', up: '↑' });
const KEYS = Object.freeze(Object.keys(BUTTONS));
const PARCELS = Object.freeze({ x:'Blue circle', y:'Blue triangle', up:'Gold circle' });
const DISPATCH_NOTE = 'Dispatch note: choose the blue parcel with a triangle label.';
const EMPTY = Object.freeze({ active: false, site: null, phase: null, guidance: '', target: null,
  indoorTarget: null, employeeId: null, challenge: null, hostage: null, remaining: 0,
  nextAction: '', substep: 0, stepCount: 0, feedback: '' });
const THREAT_RANGE = 3.2;
const HOSTAGE_SECONDS = 12;
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
      ...(site.kind==='bank'&&site.vaultPuzzle===true?{vaultPuzzle:true}:{}),
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
    const site=locations.find(site => site.kind !== 'rail' && site.id === storeId);
    if(site?.kind==='bank'&&(!isPoint(ctx.room.console)||ctx.room.console.id!==`${id}-console`||!Number.isFinite(ctx.room.console.radius)||ctx.room.console.radius<=0))return null;
    return site || null;
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
    const { cues } = attempt.rules;
    const offset = serial++ % cues.length;
    attempt.sequence = Object.freeze([...cues.slice(offset), ...cues.slice(0, offset)]);
    attempt.phase = 'puzzle';
    attempt.index = 0;
    attempt.mistakes = 0;
    attempt.armed = false;
    attempt.feedback = 'Release the symbol buttons, then copy the highlighted symbol.';
  }

  function startAvailability(site, ctx, sandbox, allowWanted = false) {
    if (!sandbox && !allowWanted && ctx.wanted !== 0) return message(false, 'Clear your wanted level before starting.');
    const readyIn = (cooldowns.get(site.id) ?? 0) - clock;
    return !sandbox && readyIn > 0 ? message(false, `Heist available in ${Math.ceil(readyIn)}s.`) : null;
  }

  function caseWithinReach(ctx, loot, roomId) {
    return distance(ctx.pose, loot) <= Math.min(2, loot.radius) && canSeeInside(ctx.pose, loot, roomId);
  }

  function exitMarker(room) {
    return isPoint(room.exit) ? Object.freeze({ ...toPoint(room.exit), interiorId: room.id, name: 'Exit' }) : null;
  }

  function openExhibitionCase(ctx, site, sandbox) {
    const { loot, id:roomId } = ctx.room;
    if (!caseWithinReach(ctx, loot, roomId)) return null;
    const unavailable = startAvailability(site, ctx, sandbox);
    if (unavailable) return unavailable;
    const rules = RULES[site.kind];
    current = { site, rules, sandbox, roomId, loot, exit:exitMarker(ctx.room), remaining:rules.time, heatSeen:false };
    beginPuzzle(current);
    return message(true, 'Match the exhibition case symbols.');
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
    const rules = site.vaultPuzzle ? VAULT : RULES[site.kind];
    const loot = Object.freeze({ id:room.loot.id, ...toPoint(room.loot), radius:Math.min(2, room.loot.radius),
      name:rules.lootName || (rules.loot === 'cash' ? 'Cash' : 'Jewellery'), interiorId:room.id });
    current = { site, rules, sandbox, loot, exit:exitMarker(room), roomId:room.id, employeeId:employee.id,
      console:site.kind==='bank'?Object.freeze({id:room.console.id,...toPoint(room.console),radius:Math.min(2,room.console.radius),name:site.vaultPuzzle?'Vault console':'Cash release console',interiorId:room.id}):null,
      roomCrime:Object.freeze({ type:'robbery', targetId:employee.id, phase:'handover' }),
      remaining:rules.time, phase:'surrender', heatSeen:false, origin:null, hostage:null, hostageUsed:false };
    return message(true, site.kind==='bank'?(site.vaultPuzzle?'Employee surrendered. Press E / USE at the vault console.':'Employee surrendered. Press E / USE at the cash release console.'):
      `Employee surrendered. E / USE takes the ${rules.loot}.`);
  }

  // A short fictional standoff is an optional game state, not a police-immunity grant.
  function hostageAction(ctx = {}) {
    if (!current?.employeeId || !['surrender','release','loot','escape'].includes(current.phase) ||
        !isPoint(ctx.pose) || ctx.paused || ctx.recovering || ctx.busy || ctx.doorway ||
        Boolean(ctx.sandbox) !== current.sandbox || indoorSite(ctx) !== current.site ||
        ctx.room.id !== current.roomId || !matchingEmployee(ctx,ctx.room) ||
        distance(ctx.pose,ctx.employee) > THREAT_RANGE || !canSeeInside(ctx.pose,ctx.employee,current.roomId)) return null;
    if (current.hostage) return 'release';
    return current.hostageUsed ? null : 'hold';
  }

  function toggleHostage(ctx = {}) {
    const action = hostageAction(ctx);
    if (!action) return null;
    if (action === 'release') {
      current.hostage = null;
      return message(true,'Employee released.');
    }
    current.hostageUsed = true;
    current.hostage = { roomId:current.roomId, employeeId:current.employeeId,
      remaining:HOSTAGE_SECONDS, health:ctx.employee.health };
    return message(true,'Standoff started. Release the employee or the hold ends in 12 seconds.');
  }

  function interact(ctx = {}) {
    if (!isPoint(ctx.pose) || ctx.paused || ctx.recovering || ctx.busy || ctx.doorway) return null;
    const sandbox = ctx.sandbox === true;
    if (current) {
      if (current.sandbox !== sandbox) return null;
      if (current.phase === 'surrender') {
        const target=current.console||current.loot;
        if (indoorSite(ctx) !== current.site || ctx.room.id !== current.roomId ||
            !matchingEmployee(ctx, ctx.room) || distance(ctx.pose, target) > target.radius ||
            !canSeeInside(ctx.pose, target, current.roomId)) return null;
        if (current.site.vaultPuzzle) {
          beginPuzzle(current);
          return message(true, 'Match the vault symbols to unlock the cash pickup.');
        }
        if(current.site.kind==='bank'){current.phase='release';current.releaseRemaining=current.rules.releaseSeconds;return message(true,'Cash release started. Stay at the console.');}
        return collect(current, current.site);
      }
      if(current.phase==='loot'){
        if(indoorSite(ctx)!==current.site||ctx.room.id!==current.roomId||!caseWithinReach(ctx,current.loot,current.roomId))return null;
        return collect(current,current.site);
      }
      if (current.phase === 'puzzle' || current.phase === 'dispatch') return cancel();
      if (current.phase !== 'ride' || !ctx.railPassenger || !ctx.railStopId || ctx.railStopId === current.site.stopId ||
          (current.site.arrivalStopId && ctx.railStopId !== current.site.arrivalStopId) || ctx.indoors) return null;
      // Capture actual arrival once, so a departing tram does not erase the selection.
      current.pickupReceipt = Object.freeze({ stopId:ctx.railStopId, point:toPoint(ctx.pose) });
      current.phase = 'dispatch';
      current.armed = false;
      current.feedback = '';
      return message(true, DISPATCH_NOTE);
    }
    if (ctx.indoors) {
      const site = indoorSite(ctx);
      if (site?.kind === 'memorial') return openExhibitionCase(ctx, site, sandbox);
      return site ? confront(ctx, site, sandbox) : null;
    }
    if (!onFoot(ctx)) return null;
    const site = nearby(ctx.pose);
    if (site?.kind !== 'rail') return null;
    const unavailable = startAvailability(site, ctx, sandbox);
    if (unavailable) return unavailable;
    const rules = RULES[site.kind];
    current = { site, rules, sandbox, remaining: rules.time, phase: 'board',
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

  function unlockCash(attempt){
    attempt.phase='loot';
    return message(true,'Cash unlocked. Walk to the marked cash pickup and press E / USE.');
  }

  function railPickupReachable(attempt, ctx) {
    return !!attempt.pickupReceipt && !ctx.indoors && (ctx.railPassenger === true ||
      (onFoot(ctx) && (distance(ctx.pose, attempt.pickupReceipt.point) <= 6 ||
        (attempt.site.pickup && distance(ctx.pose, attempt.site.pickup) <= 6))));
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
    if (attempt.hostage) {
      const hostage = attempt.hostage;
      if (indoorSite(ctx) !== attempt.site || ctx.room.id !== hostage.roomId ||
          !matchingEmployee(ctx,ctx.room) || ctx.employee.health < hostage.health) attempt.hostage = null;
      else {
        hostage.remaining = Math.max(0,hostage.remaining-elapsed);
        if (!hostage.remaining) attempt.hostage = null;
      }
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

    if (['surrender','release','loot'].includes(attempt.phase)) {
      if (indoorSite(ctx) !== attempt.site || ctx.room.id !== attempt.roomId) {
        return cancel('You left before collecting the loot. Return inside to retry.');
      }
      if (attempt.phase==='surrender'&&!matchingEmployee(ctx, ctx.room)) return cancel('The employee is unavailable. Return inside to retry.');
      if(attempt.phase==='release'){
        if(!caseWithinReach(ctx,attempt.console,attempt.roomId))return cancel('Cash release interrupted. Return to the employee to retry.');
        attempt.releaseRemaining=Math.max(0,attempt.releaseRemaining-elapsed);
        if(!attempt.releaseRemaining)return unlockCash(attempt);
      }
      return null;
    }

    if (attempt.phase === 'dispatch') {
      if (!railPickupReachable(attempt, ctx)) return cancel('Return to the parcel pickup stop to retry.');
      const held = KEYS.filter(key => input?.[key] === true);
      if (!held.length) { attempt.armed = true; return null; }
      if (!attempt.armed) return null;
      attempt.armed = false;
      if (held.length === 1 && held[0] === 'y') {
        beginPuzzle(attempt);
        attempt.feedback = 'Blue triangle matched the dispatch note. Now copy the parcel seal symbols.';
        return message(true, attempt.feedback);
      }
      attempt.feedback = 'Try again: the note asks for BOTH blue and triangle. Choose Y: Blue triangle. Release the buttons first.';
      return message(false, attempt.feedback);
    }

    if (attempt.phase === 'puzzle') {
      const reachable = attempt.roomId
        ? indoorSite(ctx) === attempt.site && ctx.room.id === attempt.roomId && caseWithinReach(ctx, attempt.console||attempt.loot, attempt.roomId)
        : railPickupReachable(attempt, ctx);
      if (!reachable) return cancel('Move back to the heist marker to retry.');
      const held = KEYS.filter(key => input?.[key] === true);
      if (!held.length) { attempt.armed = true; return null; }
      if (!attempt.armed) return null;
      attempt.armed = false;
      if (held.length === 1 && held[0] === attempt.sequence[attempt.index]) {
        attempt.index++;
        attempt.feedback = `Symbol ${attempt.index} of ${attempt.sequence.length} matched. Release the button before the next symbol.`;
        return attempt.index === attempt.sequence.length ? (attempt.site.kind==='bank'?unlockCash(attempt):collect(attempt, attempt.pickupReceipt?.point || ctx.pose)) : null;
      }
      attempt.index = 0;
      if (++attempt.mistakes >= 3) return cancel('Pattern missed. Press E at the marker to retry.');
      attempt.feedback = `Wrong symbol. Pattern reset to symbol 1. ${3 - attempt.mistakes} attempts left. Release all buttons, then press ${BUTTONS[attempt.sequence[0]]}.`;
      return message(false, attempt.feedback);
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
    const stepCount = site.kind === 'rail' ? 5 : site.kind === 'bank' ? 4 : 2;
    let substep = 1, nextAction = '', feedback = '';
    if (phase === 'board') {
      target = { ...(site.boarding || site), name: 'Board light rail' };
      guidance = 'Walk to the marked boarding stop. Press E / USE when the train boarding prompt appears.';
      nextAction = 'Board at the marked stop';
    } else if (phase === 'ride') {
      if (site.pickup) target = { ...site.pickup, name: 'Parcel pickup stop' };
      guidance = 'Stay on board until the marked parcel pickup stop. When stopped there, press E / USE to read the dispatch note and identify the parcel.';
      substep = 2; nextAction = 'Ride to the parcel pickup stop';
    } else if (phase === 'dispatch') {
      substep=3; nextAction='Identify the parcel from the dispatch note';
      feedback=current.feedback || '';
      guidance=`${DISPATCH_NOTE} X: Blue circle. Y: Blue triangle. ↑: Gold circle. ${feedback}`;
      challenge=Object.freeze({ active:true, kind:'heist', phase:'dispatch', acceptsInput:true,
        label:`Parcel dispatch · Step 3/${stepCount}`, sequence:KEYS, options:PARCELS,
        instruction:DISPATCH_NOTE, guidance:`${feedback || 'Press X, Y or ↑, or tap its labelled button. Release between choices.'} E / USE cancels.` });
    } else if (phase === 'puzzle') {
      substep = site.kind === 'rail' ? 4 : site.kind === 'bank' ? 2 : 1;
      nextAction = `Match symbol ${index + 1} of ${sequence.length}`;
      feedback = current.feedback || '';
      guidance = `Copy the highlighted game symbol ${index + 1}/${sequence.length}: press ${BUTTONS[sequence[index]]} on the keyboard or tap the matching symbol button. Release each button before the next. ${feedback}`;
      challenge = Object.freeze({ active: true, kind: 'heist', phase: 'cue', label: `${rules.label} · Step ${substep}/${stepCount}`, sequence, index, mistakes,
        maxMistakes: 3, expectedKey: sequence[index], instruction: `${index + 1}/${sequence.length} · PRESS ${BUTTONS[sequence[index]]}`, guidance: `${feedback} E / USE cancels this attempt.` });
    } else if (phase === 'surrender') {
      indoorTarget = current.console||current.loot;
      nextAction = site.kind === 'bank' ? 'Use the marked game console' : 'Collect the marked pickup';
      guidance = site.kind==='bank'?(site.vaultPuzzle?'E / USE at the marked vault console.':'E / USE at the cash release console.'):`E / USE to take the ${rules.loot}.`;
    } else if(phase==='release'){
      indoorTarget=current.console; substep=2; nextAction='Wait for the game release meter';
      guidance=`Stay at the marked release console until the meter fills · ${Math.ceil(current.releaseRemaining)}s. No extra button press is needed. Leaving cancels this attempt.`;
    } else if(phase==='loot'){
      indoorTarget=current.loot; substep=3; nextAction='Collect the marked cash pickup';
      guidance='Cash unlocked. Walk to the separate marked cash pickup and press E / USE. The console does not collect it.';
    } else {
      if (current.awaitingExit) indoorTarget = current.exit;
      substep=stepCount; nextAction='Leave the pickup area';
      guidance = current.awaitingDismount ? 'Leave the train at a stop using E / USE when the exit prompt appears, then follow the distance objective.' :
        current.awaitingExit ? (indoorTarget ? 'Follow the exit marker. Press E / USE at the door to exit the building.' : 'Press E / USE at the door to exit the building.') :
        current.escapeRemaining > 0 ? `Move ${current.escapeRemaining} m farther from the pickup.` :
          'Lose your wanted stars to complete the heist.';
    }
    guidance = `Step ${substep}/${stepCount} · ${guidance}`;
    return Object.freeze({ active: true, site, phase, guidance, nextAction, substep, stepCount, feedback, target: target && Object.freeze(target),
      indoorTarget, employeeId:current.employeeId ?? null, challenge,
      progress:phase==='release'?1-current.releaseRemaining/rules.releaseSeconds:null,
      hostage:current.hostage ? Object.freeze({roomId:current.hostage.roomId,employeeId:current.hostage.employeeId,remaining:current.hostage.remaining}) : null, remaining: Math.max(0, remaining) });
  }

  return { get active() { return !!current; },
    get hostageRoomId() { return current?.hostage?.roomId ?? null; },
    get roomCrime() { return current?.employeeId&&(['surrender','release','puzzle','loot'].includes(current.phase)||current.awaitingExit) ? current.roomCrime : null; },
    nearby, interact, hostageAction, toggleHostage, step, snapshot, cancel };
}
