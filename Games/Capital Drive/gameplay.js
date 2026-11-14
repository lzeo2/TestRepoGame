import { createPolice } from './police.js';
import { createVehicleChallenge } from './vehicle-challenges.js';
// Pure Street Life rules. The controller owns time, driving, persistence and rendering.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = n => Number.isFinite(n) ? n : 0;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const yawFor = (x, z) => Math.atan2(-x, -z);
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const MAGAZINE = 12;

export function createGameplay(map, simulation, options = {}) {
  const state = { mode: 'vehicle', actor: { x: 0, z: 0, yaw: 0, speed: 0, jumpHeight: 0 },
    health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: 0, reserveAmmo: 0,
    aiming: false, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0,
    police: [], shots: [], respawnSerial: 0, vehicle: { modelId: 'lantern', color: 0xd4d7d3, stolen: false },
    carjacking: null, recovery: null, event: '', message: '', sandbox: Boolean(options.sandbox) };
  let fireCooldown = 0, meleeCooldown = 0, jumpVelocity = 0;
  let previousCrashes = simulation.player.crashes || 0, witnessCooldown = 0;
  let retaliationCooldown = 0, crashCooldown = 0, recklessCooldown = 0, firstEquip = false;
  const theftChallenge = createVehicleChallenge();
  function clearTheftChallenge() { theftChallenge.clear(); theftChallenge.drainEvents(); }
  const policeController = createPolice(simulation, { onArrest: () => beginRecovery('arrest'), onEscape: () => emit('escaped', 'Search ended.') });
  const focus = () => state.mode === 'foot' ? state.actor : simulation.player;
  const visible = (a, b) => simulation.hasLineOfSight(a, b);
  function emit(kind, message, extra = {}) {
    state.event = kind; state.message = message;
    options.onEvent?.({ kind, message, ...extra });
  }
  function witnesses(point) {
    return state.police.some(p => p.health > 0 && distance(p, point) < 130 && visible(p, point)) ||
      (options.pedestrians?.snapshot?.() || []).some(p => p.health !== 0 && distance(p, point) < 65 && visible(p, point)) ||
      simulation.nearbyVehicles(point.x, point.z, 55).some(v => v.id !== 'player' && visible(v, point));
  }
  function reportOffence(kind = 'disturbance', severity = 1, details = {}) {
    if (typeof kind === 'object') {
      details = kind; severity = kind.severity ?? 1; kind = kind.kind || 'disturbance';
    }
    if (state.recovery) return false;
    const point = details.point || focus();
    if ((details.offenderId !== undefined && details.offenderId !== 'player') || state.sandbox || details.witnessed === false || (!details.witnessed && !witnesses(point))) return false;
    state.wanted = clamp(state.wanted + clamp(Math.ceil(finite(severity)), 1, 3), 0, 5);
    state.heat = 28 + state.wanted * 9; state.pursuit = 'search';
    if (kind !== 'reckless') witnessCooldown = 1;
    policeController.report(point);
    emit('offence', `Reported: ${kind}`, { offence: kind, wanted: state.wanted });
    return true;
  }
  function interact() {
    if (state.recovery || state.carjacking) return false;
    if (state.mode === 'vehicle') {
      if (Math.abs(simulation.player.speed) > 1.2) {
        simulation.player.speed = 0; simulation.player.vx = 0; simulation.player.vz = 0;
        emit('stop', 'Stopped. Press E again to step out.'); return false;
      }
      const car = simulation.player;
      for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
        const candidate = { x: car.x, z: car.z, yaw: car.yaw, speed: 0, jumpHeight: 0 };
        const dx = -Math.sin(car.yaw + angle) * 3.4, dz = -Math.cos(car.yaw + angle) * 3.4;
        candidate.x += dx; candidate.z += dz;
        const placement = simulation.moveActor(candidate, 0, 0, 0.45);
        if (!placement.blocked && visible(car, candidate)) {
          Object.assign(state.actor, candidate); state.mode = 'foot';
          emit('exit', 'On foot. E enters a nearby car.'); return true;
        }
      }
      emit('blocked', 'No clear place to step out.'); return false;
    }
    const target = simulation.nearbyVehicles(state.actor.x, state.actor.z, 7)
      .filter(v => visible(state.actor, v)).sort((a, b) => distance(a, state.actor) - distance(b, state.actor))[0];
    if (!target) { emit('no-vehicle', 'Move closer to a car.'); return false; }
    if (target.id !== 'player' && target.owned !== true && target.unlocked !== true) {
      clearTheftChallenge();
      if (target.occupied) simulation.requestVehicleStop(target.id, 5);
      state.carjacking = { id: target.id, phase: 'waiting', elapsed: 0, waited: 0, duration: 20, progress: 0, challenge: null };
      state.actor.speed = 0; state.actor.jumpHeight = 0; jumpVelocity = 0; state.aiming = false;
      emit('carjacking', target.occupied ? 'Waiting for the driver to stop.' : 'Getting ready to unlock the car.'); return false;
    }
    return enterVehicle(target);
  }
  function enterVehicle(target) {
    const result = simulation.claimVehicle(target.id);
    if (!result.ok) { emit('blocked', result.reason || 'Car unavailable.'); return false; }
    state.mode = 'vehicle'; state.actor.speed = 0; state.actor.jumpHeight = 0; jumpVelocity = 0;
    state.vehicle = { modelId: result.vehicle.modelId || 'lantern', color: result.vehicle.color ?? 0xd4d7d3,
      stolen: target.id === 'player' ? state.vehicle.stolen : Boolean(result.stolen) };
    state.vehicleHealth = target.id === 'player' ? state.vehicleHealth : 100;
    previousCrashes = simulation.player.crashes || 0;
    options.onVehicleChanged?.({ ...state.vehicle });
    if (result.stolen) reportOffence('vehicle theft', 1);
    emit('enter', result.stolen ? 'Vehicle taken.' : 'Back behind the wheel.'); return true;
  }
  function setWeapon(weapon) {
    if (state.recovery || !['unarmed', 'pistol'].includes(weapon)) return false;
    if (weapon === 'pistol' && !(state.sandbox || options.hasPistol?.())) return false;
    if (weapon === 'pistol' && !firstEquip) {
      const amount = Math.min(MAGAZINE, state.reserveAmmo); state.ammo += amount; state.reserveAmmo -= amount;
      firstEquip = true;
    }
    state.weapon = weapon; state.aiming = false; return true;
  }
  function reload() {
    if (state.recovery || state.weapon !== 'pistol' || state.ammo >= MAGAZINE || state.reserveAmmo <= 0 || state.reloading > 0) return false;
    state.reloading = 1.4; emit('reload', 'Reloading.'); return true;
  }
  function attack(kind) {
    const pistol = kind === 'pistol', actor = state.actor;
    if (pistol && (fireCooldown > 0 || state.reloading > 0)) return;
    if (!pistol && meleeCooldown > 0) return;
    if (pistol && state.ammo <= 0) { reload(); return; }
    if (pistol) { state.ammo--; fireCooldown = 0.28; } else meleeCooldown = 0.55;
    state.attackTimer = pistol ? 0.15 : 0.3;
    const requestedRange = pistol ? (state.aiming ? 65 : 40) : 2.3;
    const dx = -Math.sin(actor.yaw), dz = -Math.cos(actor.yaw);
    // Clip the whole strike segment before handing it to any target adapter.
    let range = requestedRange;
    const end = r => ({ x: actor.x + dx * r, z: actor.z + dz * r });
    if (!visible(actor, end(range))) {
      let lo = 0, hi = range;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (visible(actor, end(mid))) lo = mid; else hi = mid; }
      range = Math.max(0, lo - 0.05);
    }
    const result = options.pedestrians?.strike?.({ x: actor.x, z: actor.z, yaw: actor.yaw,
      range, damage: pistol ? 55 : 25, kind, hasLineOfSight: visible }) || { hits: 0, people: [] };
    let policeHits = 0;
    for (const police of state.police) {
      const px = police.x - actor.x, pz = police.z - actor.z;
      const along = px * dx + pz * dz, across = Math.abs(px * dz - pz * dx);
      if (police.health > 0 && along >= 0 && along <= range && across < (pistol ? 1.5 : 1.8) && visible(actor, police)) {
        police.health = Math.max(0, police.health - (pistol ? 45 : 20)); policeHits++;
      }
    }
    if (pistol || result.hits || policeHits) options.pedestrians?.alert?.({ x: actor.x, z: actor.z, radius: pistol ? 90 : 18, kind, hasLineOfSight: visible });
    if (pistol) state.shots.push({ x: actor.x, z: actor.z, endX: end(range).x, endZ: end(range).z,
      yaw: actor.yaw, range, life: 0.13, kind, hit: Boolean(result.hits || policeHits) });
    if (state.shots.length > 16) state.shots.splice(0, state.shots.length - 16);
    if (pistol || result.hits || policeHits) reportOffence(policeHits ? 'attack on police' : pistol ? 'gunfire' : 'assault', policeHits ? 2 : 1,
      { witnessed: policeHits ? true : undefined });
    emit('attack', result.hits || policeHits ? 'Impact.' : pistol ? 'Shot fired.' : 'Swing.');
  }
  function respawn(reason) {
    // Approximate public road approaches: Manuka police station / Canberra Hospital.
    const desired = reason === 'arrest' ? { x: -600, z: 160 } : { x: -4200, z: 2700 };
    const road = simulation.nearestRoad(desired.x, desired.z);
    const target = road || map.spawn || simulation.player;
    simulation.teleport({ x: target.x, z: target.z, yaw: target.yaw || 0 });
    state.mode = 'vehicle'; state.health = 100; state.vehicleHealth = 100; state.wanted = 0;
    state.heat = 0; state.pursuit = 'clear'; state.police.length = 0; state.shots.length = 0;
    state.actor.jumpHeight = 0; state.actor.speed = 0; state.aiming = false; state.reloading = 0;
    state.attackTimer = 0; state.arrestProgress = 0;
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; crashCooldown = 0; recklessCooldown = 0;
    jumpVelocity = 0; witnessCooldown = 0; state.respawnSerial++;
    previousCrashes = simulation.player.crashes || 0;
    emit('respawn', reason === 'arrest' ? 'Released near the station.' : 'Recovered near the hospital.', { reason });
    if (!state.sandbox) options.onRespawn?.(reason);
  }
  function beginRecovery(reason) {
    if (state.recovery) return;
    cancelCarjacking('recovery'); state.aiming = false; state.actor.speed = 0; state.attackTimer = 0;
    state.recovery = { reason, phase: 'out', elapsed: 0, duration: 3.4, progress: 0 };
    simulation.player.speed = 0; simulation.player.vx = 0; simulation.player.vz = 0;
    emit('recovery', reason === 'arrest' ? 'Being taken to the station.' : 'Medical help is arriving.', { reason });
  }
  function cancelCarjacking(reason = 'cancelled') {
    if (!state.carjacking) return false;
    theftChallenge.cancel(reason); clearTheftChallenge(); state.carjacking = null;
    state.actor.speed = 0; state.aiming = false;
    emit('carjacking-cancelled', `Vehicle attempt ended: ${reason}.`);
    return true;
  }
  function updateCarjacking(dt, input) {
    const action = state.carjacking;
    if (!action) return;
    const target = simulation.nearbyVehicles(state.actor.x, state.actor.z, 7).find(v => v.id === action.id);
    if (!target || !visible(state.actor, target) || state.mode !== 'foot') {
      cancelCarjacking('target lost'); return;
    }
    if (target.occupied) simulation.requestVehicleStop(target.id, 3);
    const ready = distance(target, state.actor) <= 5 && Math.abs(target.speed || 0) <= 0.7;
    if (action.phase === 'waiting') {
      action.waited += dt;
      if (action.waited > 8) { cancelCarjacking('driver did not stop nearby'); return; }
      if (!ready) return;
      if (!theftChallenge.start('car', { targetId: target.id, anchor: { x: target.x, z: target.z }, sandbox: state.sandbox })) {
        cancelCarjacking('car unavailable'); return;
      }
      action.phase = 'challenge';
      action.challenge = theftChallenge.snapshot();
      emit('carjacking', 'Match the unlock cues. E cancels.');
      return;
    }
    action.elapsed += dt;
    if (action.elapsed > action.duration) { cancelCarjacking('unlock timed out'); return; }
    theftChallenge.step(dt, input.challenge || {}, { valid: ready, sandbox: state.sandbox });
    action.challenge = theftChallenge.snapshot(); action.progress = action.challenge.progress;
    const completed = theftChallenge.drainEvents().some(event => event.type === 'complete' &&
      event.sessionId === action.challenge.sessionId && event.targetId === action.id);
    if (completed && action.challenge.phase === 'complete' && ready) {
      // Claim only this live target once; a parked car has no adult to displace.
      const displaced = target.occupied ? { id: `exit:${target.id}`, x: target.x + Math.cos(target.yaw || 0) * 2,
        z: target.z - Math.sin(target.yaw || 0) * 2, yaw: target.yaw || 0 } : null;
      state.carjacking = null; clearTheftChallenge();
      if (enterVehicle(target) && displaced) options.onCarjacked?.(displaced);
    } else if (!action.challenge.active) {
      const reason = action.challenge.reason || 'unlock failed';
      cancelCarjacking(reason);
    }
  }
  function addAmmo(amount) {
    if (state.recovery || !Number.isFinite(amount) || amount <= 0) return false;
    state.reserveAmmo = clamp(state.reserveAmmo + Math.floor(amount), 0, 240); return true;
  }
  function heal(amount) {
    if (state.recovery || !Number.isFinite(amount) || amount <= 0 || state.health >= 100) return false;
    state.health = clamp(state.health + amount, 0, 100); return true;
  }
  function step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (state.recovery) {
      const recovery = state.recovery; recovery.elapsed += dt;
      recovery.progress = clamp(recovery.elapsed / recovery.duration, 0, 1);
      if (recovery.phase === 'out' && recovery.elapsed >= 1.8) {
        respawn(recovery.reason); recovery.phase = 'in';
      }
      if (recovery.elapsed >= recovery.duration) state.recovery = null;
      return;
    }
    if (!state.sandbox && state.health <= 0) { beginRecovery('knockout'); return; }
    const takingVehicle = Boolean(state.carjacking);
    updateCarjacking(dt, input);
    fireCooldown = Math.max(0, fireCooldown - dt); meleeCooldown = Math.max(0, meleeCooldown - dt);
    witnessCooldown = Math.max(0, witnessCooldown - dt);
    crashCooldown = Math.max(0, crashCooldown - dt); recklessCooldown = Math.max(0, recklessCooldown - dt);
    retaliationCooldown = Math.max(0, retaliationCooldown - dt); state.attackTimer = Math.max(0, state.attackTimer - dt);
    state.shots.forEach(shot => { shot.life -= dt; }); state.shots = state.shots.filter(shot => shot.life > 0);
    if (state.reloading > 0) {
      state.reloading = Math.max(0, state.reloading - dt);
      if (state.reloading === 0) { const amount = Math.min(MAGAZINE - state.ammo, state.reserveAmmo); state.ammo += amount; state.reserveAmmo -= amount; }
    }
    if (state.mode === 'foot' && !takingVehicle) {
      const x = finite(input.moveX), z = finite(input.moveZ), length = Math.hypot(x, z);
      const speed = input.sprint ? 6.8 + clamp(finite(options.fitness?.()), 0, 3) * 0.6 : 3.6;
      const before = { x: state.actor.x, z: state.actor.z };
      if (length > 0) simulation.moveActor(state.actor, x / Math.max(1, length) * speed * dt, z / Math.max(1, length) * speed * dt, 0.45);
      state.actor.speed = distance(before, state.actor) / dt;
      state.aiming = Boolean(input.aim && state.weapon === 'pistol');
      if (Number.isFinite(input.aimYaw) && (state.aiming || input.fire)) state.actor.yaw = input.aimYaw;
      else if (length > 0) state.actor.yaw = yawFor(x, z);
      if (input.jump && state.actor.jumpHeight === 0 && jumpVelocity === 0) jumpVelocity = 5;
      if (jumpVelocity !== 0 || state.actor.jumpHeight > 0) {
        jumpVelocity -= 13 * dt; state.actor.jumpHeight = Math.max(0, state.actor.jumpHeight + jumpVelocity * dt);
        if (state.actor.jumpHeight === 0) jumpVelocity = 0;
      }
      if (input.melee || (input.fire && state.weapon === 'unarmed')) attack('melee');
      else if (input.fire && state.weapon === 'pistol') attack('pistol');
    } else state.aiming = false;
    const crashes = simulation.player.crashes || 0;
    if (state.mode === 'vehicle' && crashes > previousCrashes && crashCooldown <= 0) {
      // Contact count includes low-speed scraping: only impact velocity causes damage.
      const impact = Number.isFinite(simulation.player.lastImpactSpeed) ? simulation.player.lastImpactSpeed : Math.abs(simulation.player.speed || 10);
      if (impact >= 8) {
        const damage = clamp(4 + (impact - 8) * 1.25, 4, 24);
        state.vehicleHealth = Math.max(0, state.vehicleHealth - damage);
        if (!state.sandbox && impact >= 18) state.health = Math.max(0, state.health - Math.min(40, (impact - 16) * 2));
        crashCooldown = 0.8;
        emit('crash', state.vehicleHealth <= 0 ? 'Vehicle disabled. Press E to step out.' : 'Vehicle damaged.');
      }
    }
    if (state.mode === 'vehicle' && state.vehicleHealth <= 0) {
      simulation.player.speed = 0; simulation.player.vx = 0; simulation.player.vz = 0;
    }
    previousCrashes = crashes;
    for (const event of options.pedestrians?.drainEvents?.() || []) {
      // Ambient drivers can frighten adults without implicating the player.
      if (event.offenderId !== undefined && event.offenderId !== 'player') continue;
      if (event.targetId !== undefined && event.targetId !== 'player') continue;
      if ((event.type || event.kind) === 'retaliation' && state.mode === 'foot' && retaliationCooldown <= 0 &&
        distance(event, state.actor) < 3 && visible(event, state.actor)) {
        if (!state.sandbox) state.health = Math.max(0, state.health - clamp(finite(event.damage) || 8, 1, 20));
        retaliationCooldown = 0.8;
      } else if (((event.type || event.kind) === 'offence' || (event.type || event.kind) === 'witness')) {
        const kind = event.offence || event.kind || 'assault';
        if (kind === 'reckless' ? recklessCooldown <= 0 : witnessCooldown <= 0) {
          if (reportOffence(kind, event.severity || 1, { witnessed: true, point: Number.isFinite(event.x) && Number.isFinite(event.z) ? event : focus() })) {
            if (kind === 'reckless') recklessCooldown = 8;
          }
        }
      }
    }
    if (!state.sandbox && state.health <= 0) { beginRecovery('knockout'); return; }
    policeController.step(dt, state, focus());
  }
  function reset({ sandbox = state.sandbox } = {}) {
    clearTheftChallenge();
    state.mode = 'vehicle'; Object.assign(state.actor, { x: simulation.player.x, z: simulation.player.z, yaw: simulation.player.yaw,
      speed: 0, jumpHeight: 0 });
    Object.assign(state, { health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: 0, reserveAmmo: 0,
      aiming: false, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0, sandbox: Boolean(sandbox),
      event: '', message: '', arrestProgress: 0, recovery: null, carjacking: null });
    state.police.length = 0; state.shots.length = 0;
    policeController.reset(); firstEquip = false;
    if (state.sandbox) { state.ammo = MAGAZINE; state.reserveAmmo = 72; firstEquip = true; }
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; crashCooldown = 0; recklessCooldown = 0; jumpVelocity = 0; witnessCooldown = 0;
    previousCrashes = simulation.player.crashes || 0;
    options.pedestrians?.drainEvents?.();
  }
  reset();
  return { state, focus, step, interact, cancelCarjacking, setWeapon, reload, reportOffence, reset, addAmmo, heal,
    snapshot: () => freeze(JSON.parse(JSON.stringify(state))) };
}
