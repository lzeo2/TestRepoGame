import { createPolice } from './police.js';
import { createVehicleChallenge } from './vehicle-challenges.js';
import { WEAPONS, weaponById } from './weapons.js';
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
const MAX_SHOT_TRACES = 16;

export function createGameplay(map, simulation, options = {}) {
  const state = { mode: 'vehicle', actor: { x: 0, z: 0, yaw: 0, speed: 0, jumpHeight: 0 },
    health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: 0, reserveAmmo: 0,
    aiming: false, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0,
    police: [], shots: [], respawnSerial: 0, vehicle: { modelId: 'lantern', color: 0xd4d7d3, stolen: false },
    carjacking: null, recovery: null, event: '', message: '', sandbox: Boolean(options.sandbox) };
  const ammunition = Object.fromEntries(WEAPONS.map(weapon => [weapon.id, { ammo: 0, reserveAmmo: 0 }]));
  const equipped = new Set();
  state.ammunition = ammunition;
  const activePool = () => ammunition[state.weapon] || ammunition.pistol;
  // Keep legacy HUD fields as aliases to the selected weapon's independent pool.
  for (const field of ['ammo', 'reserveAmmo']) Object.defineProperty(state, field, {
    enumerable: true, get: () => activePool()[field], set: value => { activePool()[field] = value; },
  });
  let fireCooldown = 0, meleeCooldown = 0, jumpVelocity = 0, shotSerial = 0;
  let previousCrashes = simulation.player.crashes || 0, witnessCooldown = 0;
  let retaliationCooldown = 0, crashCooldown = 0, recklessCooldown = 0;
  const theftChallenge = createVehicleChallenge();
  function clearTheftChallenge() { theftChallenge.clear(); theftChallenge.drainEvents(); }
  const policeController = createPolice(simulation, { onArrest: () => beginRecovery('arrest'), onEscape: () => emit('escaped', 'Search ended.') });
  const passengerPose=()=>{const pose=options.passengerPose?.();return pose&&Number.isFinite(pose.x)&&Number.isFinite(pose.z)?pose:null;};
  Object.defineProperty(state,'passenger',{enumerable:true,get:()=>!!passengerPose()});
  const focus = () => passengerPose()||(state.mode === 'foot' ? state.actor : simulation.player);
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
    if (state.recovery || state.carjacking || state.passenger) return false;
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
  function ownsWeapon(id) {
    return state.sandbox || (options.hasWeapon ? options.hasWeapon(id) : id === 'pistol' && options.hasPistol?.());
  }
  function getAmmo(id = state.weapon === 'unarmed' ? 'pistol' : state.weapon) {
    return weaponById(id) ? { ...ammunition[id] } : null;
  }
  function clearAmmo(sandbox = false) {
    equipped.clear();
    for (const weapon of WEAPONS) {
      const pool = ammunition[weapon.id];
      pool.ammo = sandbox ? weapon.magazine : 0;
      const reserve = weapon.id === 'pistol' ? 72 : Math.min(weapon.reserveCap, weapon.ammoPack * 3);
      pool.reserveAmmo = sandbox ? reserve : 0;
      if (sandbox) equipped.add(weapon.id);
    }
  }
  function setWeapon(id) {
    const weapon = weaponById(id);
    if (state.recovery || (id !== 'unarmed' && !weapon) ||
      (state.reloading > 0 && id !== state.weapon)) return false;
    if (weapon && !ownsWeapon(id)) return false;
    if (weapon && !equipped.has(id)) {
      const pool = ammunition[id], amount = Math.min(weapon.magazine, pool.reserveAmmo);
      pool.ammo += amount; pool.reserveAmmo -= amount; equipped.add(id);
    }
    state.weapon = id; state.aiming = false; return true;
  }
  function reload() {
    const weapon = weaponById(state.weapon);
    if (state.recovery || !weapon || !ownsWeapon(weapon.id) || state.ammo >= weapon.magazine || state.reserveAmmo <= 0 || state.reloading > 0) return false;
    state.reloading = weapon.reload; emit('reload', 'Reloading.'); return true;
  }
  function clippedRange(actor, yaw, requestedRange) {
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
    const end = range => ({ x: actor.x + dx * range, z: actor.z + dz * range });
    if (visible(actor, end(requestedRange))) return requestedRange;
    let lo = 0, hi = requestedRange;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (visible(actor, end(mid))) lo = mid; else hi = mid; }
    return Math.max(0, lo - 0.05);
  }
  function attack(kind) {
    const weapon = weaponById(kind), actor = state.actor;
    if (weapon && (!ownsWeapon(kind) || fireCooldown > 0 || state.reloading > 0)) return;
    if (!weapon && meleeCooldown > 0) return;
    if (weapon && state.ammo <= 0) { reload(); return; }
    if (weapon) { state.ammo--; fireCooldown = weapon.interval; shotSerial++; } else meleeCooldown = 0.55;
    state.attackTimer = weapon ? 0.15 : 0.3;
    const requestedRange = weapon ? (state.aiming ? weapon.aimRange : weapon.range) : 2.3;
    const pellets = weapon ? clamp(Math.floor(weapon.pellets), 1, 6) : 1;
    const adapterKind = weapon && kind !== 'pistol' ? 'firearm' : kind;
    let hits = 0, policeHits = 0;
    const struckPolice = new Set();
    for (let pellet = 0; pellet < pellets; pellet++) {
      // A fixed fan for buckshot and a repeating offset for automatics avoid random/global clocks.
      const spread = weapon?.spread || 0;
      const offset = pellets > 1 ? (pellet / (pellets - 1) * 2 - 1) * spread :
        spread * (((shotSerial - 1) % 5) / 2 - 1);
      const yaw = actor.yaw + offset, dx = -Math.sin(yaw), dz = -Math.cos(yaw);
      const range = clippedRange(actor, yaw, requestedRange);
      const result = options.pedestrians?.strike?.({ x: actor.x, z: actor.z, yaw,
        range, damage: weapon ? weapon.damage : 25, kind: adapterKind, hasLineOfSight: visible }) || { hits: 0 };
      hits += result.hits || 0;
      let pelletPoliceHits = 0;
      for (const police of state.police) {
        const px = police.x - actor.x, pz = police.z - actor.z;
        const along = px * dx + pz * dz, across = Math.abs(px * dz - pz * dx);
        // One victim cannot receive six complete damage applications from a fan.
        if (!struckPolice.has(police) && police.health > 0 && along >= 0 && along <= range &&
          across < (weapon ? 1.5 : 1.8) && visible(actor, police)) {
          police.health = Math.max(0, police.health - (weapon ? weapon.policeDamage : 20));
          struckPolice.add(police); pelletPoliceHits++; policeHits++;
        }
      }
      if (weapon) state.shots.push({ x: actor.x, z: actor.z, endX: actor.x + dx * range, endZ: actor.z + dz * range,
        yaw, range, life: 0.13, kind, hit: Boolean(result.hits || pelletPoliceHits) });
    }
    if (weapon || hits || policeHits) options.pedestrians?.alert?.({ x: actor.x, z: actor.z, radius: weapon ? 90 : 18, kind: adapterKind, hasLineOfSight: visible });
    if (state.shots.length > MAX_SHOT_TRACES) state.shots.splice(0, state.shots.length - MAX_SHOT_TRACES);
    if (weapon || hits || policeHits) reportOffence(policeHits ? 'attack on police' : weapon ? 'gunfire' : 'assault', policeHits ? 2 : 1,
      { witnessed: policeHits ? true : undefined });
    emit('attack', hits || policeHits ? 'Impact.' : weapon ? 'Shot fired.' : 'Swing.');
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
    state.attackTimer = 0; state.arrestProgress = 0; state.weapon = 'unarmed'; clearAmmo(state.sandbox);
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; crashCooldown = 0; recklessCooldown = 0;
    jumpVelocity = 0; witnessCooldown = 0; state.respawnSerial++;
    previousCrashes = simulation.player.crashes || 0;
    emit('respawn', reason === 'arrest' ? 'Released near the station.' : 'Recovered near the hospital.', { reason });
    if (!state.sandbox) options.onRespawn?.(reason);
  }
  function beginRecovery(reason) {
    if (state.recovery) return;
    cancelCarjacking('recovery'); state.reloading = 0; state.aiming = false; state.actor.speed = 0; state.attackTimer = 0;
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
  function addAmmo(amount, id = state.weapon === 'unarmed' ? 'pistol' : state.weapon) {
    const weapon = weaponById(id);
    if (state.recovery || !weapon || !Number.isFinite(amount) || Math.floor(amount) <= 0) return false;
    const quantity = Math.floor(amount);
    const pool = ammunition[id];
    if (pool.reserveAmmo >= weapon.reserveCap) return false;
    pool.reserveAmmo = clamp(pool.reserveAmmo + quantity, 0, weapon.reserveCap); return true;
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
      if (state.reloading === 0) {
        const weapon = weaponById(state.weapon);
        if (weapon && ownsWeapon(weapon.id)) { const amount = Math.min(weapon.magazine - state.ammo, state.reserveAmmo); state.ammo += amount; state.reserveAmmo -= amount; }
      }
    }
    if(state.passenger){
      const pose=passengerPose();Object.assign(state.actor,{x:pose.x,z:pose.z,yaw:finite(pose.yaw),speed:finite(pose.speed),jumpHeight:0});jumpVelocity=0;
    }
    if (state.mode === 'foot' && !takingVehicle && !state.passenger) {
      const x = finite(input.moveX), z = finite(input.moveZ), length = Math.hypot(x, z);
      const speed = input.sprint ? 6.8 + clamp(finite(options.fitness?.()), 0, 3) * 0.6 : 3.6;
      const before = { x: state.actor.x, z: state.actor.z };
      if (length > 0) simulation.moveActor(state.actor, x / Math.max(1, length) * speed * dt, z / Math.max(1, length) * speed * dt, 0.45);
      state.actor.speed = distance(before, state.actor) / dt;
      state.aiming = Boolean(input.aim && weaponById(state.weapon));
      if (Number.isFinite(input.aimYaw) && (state.aiming || input.fire || input.melee)) state.actor.yaw = input.aimYaw;
      else if (length > 0) state.actor.yaw = yawFor(x, z);
      if (input.jump && state.actor.jumpHeight === 0 && jumpVelocity === 0) jumpVelocity = 5;
      if (jumpVelocity !== 0 || state.actor.jumpHeight > 0) {
        jumpVelocity -= 13 * dt; state.actor.jumpHeight = Math.max(0, state.actor.jumpHeight + jumpVelocity * dt);
        if (state.actor.jumpHeight === 0) jumpVelocity = 0;
      }
      if (input.melee || (input.fire && state.weapon === 'unarmed')) attack('melee');
      else if (input.fire && weaponById(state.weapon)) attack(state.weapon);
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
    policeController.reset(); clearAmmo(state.sandbox); shotSerial = 0;
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; crashCooldown = 0; recklessCooldown = 0; jumpVelocity = 0; witnessCooldown = 0;
    previousCrashes = simulation.player.crashes || 0;
    options.pedestrians?.drainEvents?.();
  }
  reset();
  return { state, focus, step, interact, cancelCarjacking, setWeapon, reload, reportOffence, reset, addAmmo, getAmmo, heal,
    snapshot: () => freeze(JSON.parse(JSON.stringify(state))) };
}
