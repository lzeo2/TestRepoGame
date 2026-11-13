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
    health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: MAGAZINE, reserveAmmo: 72,
    aiming: false, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0,
    police: [], shots: [], respawnSerial: 0, vehicle: { modelId: 'lantern', color: 0xd4d7d3, stolen: false },
    event: '', message: '', sandbox: Boolean(options.sandbox) };
  let fireCooldown = 0, meleeCooldown = 0, jumpVelocity = 0, arrestTime = 0;
  let previousCrashes = simulation.player.crashes || 0, witnessCooldown = 0, policeSerial = 0;
  let lastSeen = { x: simulation.player.x, z: simulation.player.z }, retaliationCooldown = 0;
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
    const point = details.point || focus();
    if (state.sandbox || details.witnessed === false || (!details.witnessed && !witnesses(point))) return false;
    state.wanted = clamp(state.wanted + clamp(Math.ceil(finite(severity)), 1, 3), 0, 5);
    state.heat = 28 + state.wanted * 9; state.pursuit = 'search'; witnessCooldown = 1;
    lastSeen = { x: point.x, z: point.z };
    emit('offence', `Reported: ${kind}`, { offence: kind, wanted: state.wanted });
    return true;
  }
  function interact() {
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
    if (!['unarmed', 'pistol'].includes(weapon)) return false;
    state.weapon = weapon; state.aiming = false; return true;
  }
  function reload() {
    if (state.weapon !== 'pistol' || state.ammo >= MAGAZINE || state.reserveAmmo <= 0 || state.reloading > 0) return false;
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
    state.ammo = MAGAZINE; state.reserveAmmo = 72; state.attackTimer = 0; state.arrestProgress = 0;
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0;
    jumpVelocity = 0; arrestTime = 0; witnessCooldown = 0; state.respawnSerial++;
    previousCrashes = simulation.player.crashes || 0;
    emit('respawn', reason === 'arrest' ? 'Released near the station.' : 'Recovered near the hospital.', { reason });
    if (!state.sandbox) options.onRespawn?.(reason);
  }
  function spawnPolice() {
    const target = focus(), index = state.police.length;
    const angle = index * 2.1 + 0.7;
    const road = simulation.nearestRoad(target.x + Math.cos(angle) * 110, target.z + Math.sin(angle) * 110);
    if (!road) return;
    state.police.push({ id: `police:${policeSerial++}`, x: road.x, z: road.z, yaw: road.yaw || 0,
      speed: 0, health: 100, seesPlayer: false, searchTime: 0, modelId: 'relay', color: 0xe7e7df });
  }
  function updatePolice(dt) {
    if (state.sandbox || state.wanted <= 0) { state.police.length = 0; state.pursuit = 'clear'; return; }
    const desiredCount = Math.min(4, state.wanted + 1);
    while (state.police.length < desiredCount) { const before = state.police.length; spawnPolice(); if (before === state.police.length) break; }
    let seen = false, arresting = false;
    const target = focus();
    for (const police of state.police) {
      police.seesPlayer = police.health > 0 && distance(police, target) < 145 && visible(police, target);
      if (police.health <= 0) { police.speed = 0; continue; }
      if (police.seesPlayer) { seen = true; lastSeen = { x: target.x, z: target.z }; police.searchTime = 0; }
      else police.searchTime += dt;
      const destination = police.seesPlayer ? target : lastSeen;
      const gap = distance(police, destination);
      const speed = police.seesPlayer ? 14 + state.wanted * 2 : 7;
      if (gap > 3) {
        const dx = (destination.x - police.x) / gap, dz = (destination.z - police.z) / gap;
        police.yaw = yawFor(dx, dz);
        const old = { x: police.x, z: police.z };
        simulation.moveActor(police, dx * Math.min(gap - 2, speed * dt), dz * Math.min(gap - 2, speed * dt), 1.25);
        police.speed = distance(old, police) / dt;
      } else police.speed = 0;
      if (police.seesPlayer && distance(police, target) < (state.mode === 'foot' ? 4.2 : 6) && Math.abs(target.speed) < 2) arresting = true;
    }
    if (seen) { state.pursuit = 'pursuit'; state.heat = 28 + state.wanted * 9; }
    else { state.pursuit = 'search'; state.heat = Math.max(0, state.heat - dt);
      if (state.heat <= 0) { state.wanted = 0; state.pursuit = 'clear'; state.police.length = 0; emit('escaped', 'Search ended.'); }
    }
    arrestTime = arresting ? arrestTime + dt : Math.max(0, arrestTime - dt * 2);
    state.arrestProgress = clamp(arrestTime / 3.5, 0, 1);
    if (arrestTime >= 3.5) respawn('arrest');
  }
  function step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    fireCooldown = Math.max(0, fireCooldown - dt); meleeCooldown = Math.max(0, meleeCooldown - dt);
    witnessCooldown = Math.max(0, witnessCooldown - dt);
    retaliationCooldown = Math.max(0, retaliationCooldown - dt); state.attackTimer = Math.max(0, state.attackTimer - dt);
    state.shots.forEach(shot => { shot.life -= dt; }); state.shots = state.shots.filter(shot => shot.life > 0);
    if (state.reloading > 0) {
      state.reloading = Math.max(0, state.reloading - dt);
      if (state.reloading === 0) { const amount = Math.min(MAGAZINE - state.ammo, state.reserveAmmo); state.ammo += amount; state.reserveAmmo -= amount; }
    }
    if (state.mode === 'foot') {
      const x = finite(input.moveX), z = finite(input.moveZ), length = Math.hypot(x, z);
      const speed = input.sprint ? 6.8 : 3.6;
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
    if (state.mode === 'vehicle' && crashes > previousCrashes) {
      const damage = Math.min(60, (crashes - previousCrashes) * 18);
      state.vehicleHealth = Math.max(0, state.vehicleHealth - damage);
      if (!state.sandbox) state.health = Math.max(0, state.health - damage * 0.35);
      emit('crash', 'Vehicle damaged.');
    }
    previousCrashes = crashes;
    for (const event of options.pedestrians?.drainEvents?.() || []) {
      if ((event.type || event.kind) === 'retaliation' && state.mode === 'foot' && retaliationCooldown <= 0 &&
        distance(event, state.actor) < 3 && visible(event, state.actor)) {
        if (!state.sandbox) state.health = Math.max(0, state.health - clamp(finite(event.damage) || 8, 1, 20));
        retaliationCooldown = 0.8;
      } else if (((event.type || event.kind) === 'offence' || (event.type || event.kind) === 'witness') && witnessCooldown <= 0) {
        reportOffence(event.offence || event.kind || 'assault', event.severity || 1, { witnessed: true, point: focus() });
      }
    }
    if (!state.sandbox && (state.health <= 0 || state.vehicleHealth <= 0)) { respawn('knockout'); return; }
    updatePolice(dt);
  }
  function reset({ sandbox = state.sandbox } = {}) {
    state.mode = 'vehicle'; Object.assign(state.actor, { x: simulation.player.x, z: simulation.player.z, yaw: simulation.player.yaw,
      speed: 0, jumpHeight: 0 });
    Object.assign(state, { health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: MAGAZINE, reserveAmmo: 72,
      aiming: false, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0, sandbox: Boolean(sandbox),
      event: '', message: '', arrestProgress: 0 });
    state.police.length = 0; state.shots.length = 0;
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; jumpVelocity = 0; arrestTime = 0; witnessCooldown = 0;
    previousCrashes = simulation.player.crashes || 0;
    options.pedestrians?.drainEvents?.();
  }
  reset();
  return { state, focus, step, interact, setWeapon, reload, reportOffence, reset,
    snapshot: () => freeze(JSON.parse(JSON.stringify(state))) };
}
