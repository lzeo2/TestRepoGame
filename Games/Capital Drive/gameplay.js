import { createPolice } from './police.js';
import { createVehicleChallenge } from './vehicle-challenges.js';
import { WEAPONS, weaponById } from './weapons.js';
import { createShotRays, resolveShotRay, MAX_AIM_PITCH } from './ballistics.js';
import { createProtagonistState } from './protagonist-state.js';
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
  const state = { mode: 'vehicle', actor: { x: 0, z: 0, yaw: 0, speed: 0, jumpHeight: 0, aimPitch: 0,
    impactTime: 0, impactDuration: 0, impactStrength: 0, impactYaw: 0, impactSerial: 0 },
    health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: 0, reserveAmmo: 0,
    aiming: false, aimPitch: 0, combatFeedback: { shotSerial: 0, hitSerial: 0, hits: 0, recoil: 0 }, reloading: 0, attackTimer: 0, wanted: 0, pursuit: 'clear', heat: 0,
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
  let fireCooldown = 0, meleeCooldown = 0, jumpVelocity = 0, shotSerial = 0, triggerHeld = false;
  let previousCrashes = simulation.player.crashes || 0, witnessCooldown = 0;
  let retaliationCooldown = 0, crashCooldown = 0, recklessCooldown = 0;
  let impactX = 0, impactZ = 0, impactCooldown = 0;
  const powerFactor = key => clamp(finite(options.powerModifiers?.()?.[key]) || 1, .5, 1.5);
  function clearVehicleImpact() {
    impactX = 0; impactZ = 0; impactCooldown = 0;
    state.actor.impactTime = 0; state.actor.impactDuration = 0; state.actor.impactStrength = 0; state.actor.impactYaw = 0;
  }
  const vehicleFallPending = () => state.mode === 'foot' && state.health <= 0 && state.actor.impactTime > 0 && state.actor.impactDuration > .3;
  const needsMedicalRecovery = () => !state.sandbox && state.health <= 0 && !vehicleFallPending();
  const theftChallenge = createVehicleChallenge();
  function clearTheftChallenge() { theftChallenge.clear(); theftChallenge.drainEvents(); }
  const policeEvents=[];
  const policeController = createPolice(simulation, { shotClear:options.policeShotClear, heightAt:options.heightAt, getAllies:options.getAllies, playerAltitude:options.playerAltitude, getInterior:options.getInterior, resolveInterior:options.resolveInterior, onArrest: () => beginRecovery('arrest'), onEscape: () => emit('escaped', 'Search ended.') });
  const passengerPose=()=>{const pose=options.passengerPose?.();return pose&&Number.isFinite(pose.x)&&Number.isFinite(pose.z)?pose:null;};
  Object.defineProperty(state,'passenger',{enumerable:true,get:()=>!!passengerPose()});
  const focus = () => passengerPose()||(state.mode === 'foot' ? state.actor : simulation.player);
  const interiorId = () => options.getInterior?.()?.id || null;
  const sameSpace = person => (person.interiorId || null) === interiorId();
  const visible = (a, b) => simulation.hasLineOfSight(a, b);
  function emit(kind, message, extra = {}) {
    state.event = kind; state.message = message;
    options.onEvent?.({ kind, message, ...extra });
  }
  function witnesses(point) {
    return state.police.some(p => p.health > 0 && sameSpace(p) && distance(p, point) < 130 && visible(p, point)) ||
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
    if (state.recovery || state.carjacking || state.passenger || state.actor.impactTime > 0) return false;
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
    options.onVehicleChanged?.({ ...state.vehicle }, { newVehicle: target.id !== 'player' });
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
    if (options.isPiloting?.() || state.recovery || state.actor.impactTime > 0 || (id !== 'unarmed' && !weapon) ||
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
    if (options.isPiloting?.() || state.recovery || state.actor.impactTime > 0 || !weapon || !ownsWeapon(weapon.id) || state.ammo >= weapon.magazine || state.reserveAmmo <= 0 || state.reloading > 0) return false;
    state.reloading = weapon.reload * powerFactor('reload'); emit('reload', 'Reloading.'); return true;
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
    if(options.canAttack?.()===false || options.isPiloting?.()) return false;
    const weapon = weaponById(kind), actor = state.actor;
    if(weapon&&options.canFireWeapon?.()===false)return false;
    if (weapon && (!ownsWeapon(kind) || fireCooldown > 1e-9 || state.reloading > 0)) return false;
    if (!weapon && meleeCooldown > 0) return false;
    if (weapon && state.ammo <= 0) {
      if (!reload()) { fireCooldown = .25; emit('dry-fire', 'No ammunition.', { weapon: kind }); }
      return false;
    }
    if (weapon) { state.ammo--; fireCooldown += weapon.interval * powerFactor('gunAttack'); shotSerial++; } else meleeCooldown = 0.55;
    state.attackTimer = weapon ? 0.15 : 0.3;
    if(!weapon)state.attackSerial=(state.attackSerial||0)+1;
    const adapterKind = weapon && kind !== 'pistol' ? 'firearm' : kind;
    let hits = 0, policeHits = 0;
    if (weapon) {
      const ground = (x,z) => finite(options.heightAt?.(x,z));
      const space = interiorId(), muzzleY = ground(actor.x,actor.z) + 1.35 + actor.jumpHeight;
      const supplied = options.getShotTargets?.();
      const civilians = supplied || (options.pedestrians?.snapshot?.() || []);
      const targets = civilians.map(person => ({ ...person, feetY: person.feetY ?? person.y ?? ground(person.x,person.z),
        interiorId: person.interiorId === undefined ? space : person.interiorId }));
      for (const police of state.police) if (police.mode === 'foot' && police.health > 0 && sameSpace(police)) targets.push({ ...police,
        feetY: police.feetY ?? police.y ?? ground(police.x,police.z), police,
        damage: amount => { police.health = Math.max(0,police.health-amount); return true; } });
      const struck = new Set();
      const rays = createShotRays({ x:actor.x,y:muzzleY,z:actor.z,yaw:actor.yaw,pitch:state.aimPitch,
        range:state.aiming?weapon.aimRange:weapon.range,pellets:weapon.pellets,spread:weapon.spread,aiming:state.aiming,serial:shotSerial,interiorId:space });
      for (const ray of rays) {
        // Legacy adapters still receive exact ray geometry; controller adapters supply 3D solids.
        const obstruction = options.traceShot ? options.traceShot(ray) : clippedRange(actor,ray.yaw,ray.range*Math.cos(ray.pitch))/Math.cos(ray.pitch);
        const hit = resolveShotRay(ray,{targets,blockDistance:Number.isFinite(obstruction)?obstruction:0});
        let damaged = false;
        if (hit.target && !struck.has(hit.target)) {
          struck.add(hit.target);
          const spec = { ...ray, range:hit.distance+.02, damage:weapon.damage, kind:adapterKind,
            targetId:hit.target.id, shotSerial, endX:hit.endX,endY:hit.endY,endZ:hit.endZ,
            hasLineOfSight:(from,to)=> Math.hypot(to.x-hit.target.x,to.z-hit.target.z)<.01 && visible(from,to) };
          const result = hit.target.damage ? hit.target.damage(hit.target.police?weapon.policeDamage:weapon.damage,spec) : options.pedestrians?.strike?.(spec);
          damaged = result === true || Boolean(result?.hits);
          if (damaged) { if(hit.target.police)policeHits++;else hits++; }
        } else if (!supplied && !hit.target) {
          // Preserve the legacy strike observation contract without allowing a cone hit.
          options.pedestrians?.strike?.({ ...ray, range:hit.distance, damage:weapon.damage, kind:adapterKind, shotSerial, hasLineOfSight:()=>false });
        }
        state.shots.push({ ...ray,shotSerial,endX:hit.endX,endY:hit.endY,endZ:hit.endZ,range:hit.distance,life:.13,kind,hit:damaged });
      }
      const feedback = state.combatFeedback;
      feedback.shotSerial = shotSerial; feedback.hits = hits+policeHits;
      if(feedback.hits) feedback.hitSerial++;
      feedback.recoil = Math.min(1,feedback.recoil+(weapon.recoil||.2)*(state.aiming?.7:1));
    } else {
      const result=options.pedestrians?.strike?.({x:actor.x,z:actor.z,yaw:actor.yaw,range:2.3,damage:25,kind:adapterKind,hasLineOfSight:visible});
      hits=result?.hits||0;
      for(const police of state.police) if(sameSpace(police)&&police.mode==='foot'&&police.health>0) {
        const px=police.x-actor.x,pz=police.z-actor.z,dx=-Math.sin(actor.yaw),dz=-Math.cos(actor.yaw);
        if(px*dx+pz*dz>=0&&distance(actor,police)<=2.3&&Math.abs(px*dz-pz*dx)<1.8&&visible(actor,police)){police.health=Math.max(0,police.health-20);policeHits++;}
      }
    }
    if (weapon || hits || policeHits) options.pedestrians?.alert?.({ x: actor.x, z: actor.z, radius: weapon ? 90 : 18, kind: adapterKind, hasLineOfSight: visible });
    if (state.shots.length > MAX_SHOT_TRACES) state.shots.splice(0, state.shots.length - MAX_SHOT_TRACES);
    if (weapon || hits || policeHits) reportOffence(policeHits ? 'attack on police' : weapon ? 'gunfire' : 'assault', policeHits ? 2 : 1,
      { witnessed: policeHits ? true : undefined });
    emit('attack', hits || policeHits ? 'Impact.' : weapon ? 'Shot fired.' : 'Swing.', { weapon:weapon?.id||null,
      shotSerial,hitSerial:state.combatFeedback.hitSerial,hits:hits+policeHits,recoil:state.combatFeedback.recoil });
    return true;
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
    clearVehicleImpact(); state.actor.jumpHeight = 0; jumpVelocity = 0;
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
      const displaced = target.occupied ? { id: `exit:${target.id}`, personId: target.personId ?? target.id,
        x: target.x + Math.cos(target.yaw || 0) * 2,
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
  function addShot(from,to,kind,space=interiorId()) {
    const range=distance(from,to);
    state.shots.push({x:from.x,y:from.y,z:from.z,endX:to.x,endY:to.y,endZ:to.z,
      yaw:yawFor(to.x-from.x,to.z-from.z),range,life:.13,kind,interiorId:space,hit:true});
    if(state.shots.length>MAX_SHOT_TRACES) state.shots.splice(0,state.shots.length-MAX_SHOT_TRACES);
  }
  function strikePolice({from,targetId,damage,range}={}) {
    if(state.recovery || !from || ![from.x,from.z,damage,range].every(Number.isFinite) || damage<=0 || range<=0) return false;
    const unit=state.police.find(person=>person.id===targetId && person.health>0 && person.active!==false && person.mode==='foot');
    if(!unit || unit.interiorId || distance(from,unit)>Math.min(28,range) || !visible(from,unit)) return false;
    unit.health=Math.max(0,unit.health-clamp(damage,1,12));
    addShot(from,unit,'pistol',null);return true;
  }
  function heal(amount) {
    if (state.recovery || state.health <= 0 || !Number.isFinite(amount) || amount <= 0 || state.health >= 100) return false;
    state.health = clamp(state.health + amount, 0, 100); return true;
  }
  function receiveVehicleImpacts(events) {
    if (state.mode !== 'foot' || state.health <= 0 || state.passenger || state.recovery || impactCooldown > 0) return;
    // Simulation supplies only actual approaching contacts, before the car brakes.
    // Choose one strongest contact so several blocked sweep probes cannot stack it.
    let impact;
    for (const event of events) {
      if (event.targetId !== 'player-body' || !sameSpace(event) ||
        typeof event.offenderId !== 'string' || ![event.speed, event.vx, event.vz].every(Number.isFinite) ||
        event.speed < 1 || Math.hypot(event.vx, event.vz) < .01) continue;
      if (!impact || event.speed > impact.speed) impact = event;
    }
    if (!impact) return;
    const speed = clamp(impact.speed, 1, 34), launch = speed >= 8;
    // A stopped/repeated contact must not restart a tumble or shorten its get-up.
    if (state.actor.impactTime > 0 && speed <= state.actor.impactStrength * 34) return;
    cancelCarjacking('vehicle impact');
    const push = launch ? clamp(2.5 + (speed - 8) * .5, 2.5, 14) : .25 + (speed - 1) * .25;
    const length = Math.hypot(impact.vx, impact.vz);
    impactX = impact.vx / length * push; impactZ = impact.vz / length * push;
    impactCooldown = .8;
    state.actor.impactTime = state.actor.impactDuration = launch ? 2.6 : .3;
    state.actor.impactStrength = clamp(speed / 34, 0, 1);
    state.actor.impactYaw = yawFor(impact.vx, impact.vz); state.actor.impactSerial++;
    if (launch) jumpVelocity = Math.max(jumpVelocity, clamp(3.5 + (speed - 8) * .2, 3.5, 8));
    state.aiming = false; state.attackTimer = 0;
    if (!state.sandbox && speed >= 5) state.health = Math.max(0, state.health - clamp((speed - 4) * 1.2, 1, 36));
    emit('vehicle-impact', launch ? 'Hit by a vehicle.' : 'Bumped by a vehicle.', { offenderId: impact.offenderId, speed });
  }
  function step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    const vehicleImpacts = simulation.drainVehicleImpacts?.() || [];
    options.onVehicleImpacts?.(vehicleImpacts, dt);
    if (state.recovery) {
      const recovery = state.recovery; recovery.elapsed += dt;
      recovery.progress = clamp(recovery.elapsed / recovery.duration, 0, 1);
      if (recovery.phase === 'out' && recovery.elapsed >= 1.8) {
        respawn(recovery.reason); recovery.phase = 'in';
      }
      if (recovery.elapsed >= recovery.duration) state.recovery = null;
      return;
    }
    if (needsMedicalRecovery()) { beginRecovery('knockout'); return; }
    impactCooldown = Math.max(0, impactCooldown - dt);
    state.actor.impactTime = Math.max(0, state.actor.impactTime - dt);
    if (state.actor.impactTime === 0) state.actor.impactStrength = 0;
    receiveVehicleImpacts(vehicleImpacts);
    if (needsMedicalRecovery()) { beginRecovery('knockout'); return; }
    const takingVehicle = Boolean(state.carjacking);
    updateCarjacking(dt, input);
    fireCooldown = input.fire && triggerHeld ? fireCooldown-dt : Math.max(0, fireCooldown-dt);
    triggerHeld = Boolean(input.fire);
    state.combatFeedback.recoil *= Math.exp(-12*dt);
    meleeCooldown = Math.max(0, meleeCooldown - dt);
    witnessCooldown = Math.max(0, witnessCooldown - dt);
    crashCooldown = Math.max(0, crashCooldown - dt); recklessCooldown = Math.max(0, recklessCooldown - dt);
    retaliationCooldown = Math.max(0, retaliationCooldown - dt); state.attackTimer = Math.max(0, state.attackTimer - dt);
    state.shots.forEach(shot => { shot.life -= dt; }); state.shots = state.shots.filter(shot => shot.life > 0);
    if (state.reloading > 0) {
      state.reloading = Math.max(0, state.reloading - dt);
      if (state.reloading === 0) {
        const weapon = weaponById(state.weapon);
        if (weapon && ownsWeapon(weapon.id)) { const amount = Math.min(weapon.magazine - state.ammo, state.reserveAmmo); state.ammo += amount; state.reserveAmmo -= amount; emit('reload-complete','Reloaded.',{weapon:weapon.id}); }
      }
    }
    if(state.passenger){
      const pose=passengerPose();Object.assign(state.actor,{x:pose.x,z:pose.z,yaw:finite(pose.yaw),speed:finite(pose.speed),jumpHeight:0});jumpVelocity=0;
      clearVehicleImpact();
    }
    if (state.mode === 'foot' && !takingVehicle && !state.passenger) {
      const x = finite(input.moveX), z = finite(input.moveZ), length = Math.hypot(x, z);
      const speed = (input.sprint ? 6.8 + clamp(finite(options.fitness?.()), 0, 3) * 0.6 : 3.6) * powerFactor('footSpeed');
      const before = { x: state.actor.x, z: state.actor.z };
      const struck = state.actor.impactTime > 0;
      if (struck) {
        const result = simulation.moveActor(state.actor, impactX * dt, impactZ * dt, .45);
        // Shared actor sweeps include walls, vehicles and the controller's adults.
        if (result.blocked) { impactX = 0; impactZ = 0; }
        const drag = Math.exp(-(state.actor.jumpHeight > 0 || jumpVelocity > 0 ? .9 : 8) * dt);
        impactX *= drag; impactZ *= drag;
      } else if (length > 0) simulation.moveActor(state.actor, x / Math.max(1, length) * speed * dt, z / Math.max(1, length) * speed * dt, 0.45);
      state.actor.speed = distance(before, state.actor) / dt;
      state.aimPitch = clamp(finite(input.aimPitch),-MAX_AIM_PITCH,MAX_AIM_PITCH);
      state.actor.aimPitch = state.aimPitch;
      state.aiming = Boolean(!struck && input.aim && weaponById(state.weapon));
      if (!struck && Number.isFinite(input.aimYaw) && (state.aiming || input.fire || input.melee)) state.actor.yaw = input.aimYaw;
      else if (length > 0 && !struck) state.actor.yaw = yawFor(x, z);
      if (!struck && input.jump && state.actor.jumpHeight === 0 && jumpVelocity === 0) jumpVelocity = 5 * powerFactor('jump');
      if (jumpVelocity !== 0 || state.actor.jumpHeight > 0) {
        jumpVelocity -= 13 * dt; state.actor.jumpHeight = Math.max(0, state.actor.jumpHeight + jumpVelocity * dt);
        if (state.actor.jumpHeight === 0) jumpVelocity = 0;
      }
      if (!struck && (input.melee || (input.fire && state.weapon === 'unarmed'))) attack('melee');
      else if (!struck && input.fire && weaponById(state.weapon)) {
        for(let count=0;count<6;count++) { if(!attack(state.weapon)){fireCooldown=Math.max(0,fireCooldown);break;}if(fireCooldown>1e-9)break; }
      } else fireCooldown=Math.max(0,fireCooldown);
    } else { state.aiming = false; fireCooldown=Math.max(0,fireCooldown); triggerHeld=false; }
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
    if (needsMedicalRecovery()) { beginRecovery('knockout'); return; }
    if (vehicleFallPending()) return;
    policeController.step(dt, state, focus());
    for(const event of policeController.drainEvents()) {
      addShot(event.from,event.to,'pistol',event.interiorId || null);
      if(event.targetId==='player') state.health=Math.max(0,state.health-event.damage);
      else policeEvents.push(event);
    }
    if(policeEvents.length>16) policeEvents.splice(0,policeEvents.length-16);
    if(needsMedicalRecovery()) beginRecovery('knockout');
  }
  function reset({ sandbox = state.sandbox,startPose,onFoot=false } = {}) {
    clearTheftChallenge();
    clearVehicleImpact(); simulation.drainVehicleImpacts?.();
    state.mode = 'vehicle'; Object.assign(state.actor, { x: simulation.player.x, z: simulation.player.z, yaw: simulation.player.yaw,
      speed: 0, jumpHeight: 0 });
    if(onFoot&&startPose&&[startPose.x,startPose.z].every(Number.isFinite)){
      const candidate={x:startPose.x,z:startPose.z,yaw:Number.isFinite(startPose.yaw)?startPose.yaw:0};
      if(!simulation.moveActor(candidate,0,0,.45).blocked){Object.assign(state.actor,candidate);state.mode='foot';}
    }
    Object.assign(state, { health: 100, vehicleHealth: 100, weapon: 'unarmed', ammo: 0, reserveAmmo: 0,
      aiming: false, reloading: 0, attackTimer: 0, attackSerial:0, wanted: 0, pursuit: 'clear', heat: 0, sandbox: Boolean(sandbox),
      event: '', message: '', arrestProgress: 0, recovery: null, carjacking: null });
    state.police.length = 0; state.shots.length = 0;
    policeEvents.length=0;policeController.reset(); clearAmmo(state.sandbox); shotSerial = 0; triggerHeld = false;
    state.aimPitch=0;state.actor.aimPitch=0;Object.assign(state.combatFeedback,{shotSerial:0,hitSerial:0,hits:0,recoil:0});
    fireCooldown = 0; meleeCooldown = 0; retaliationCooldown = 0; crashCooldown = 0; recklessCooldown = 0; jumpVelocity = 0; witnessCooldown = 0;
    previousCrashes = simulation.player.crashes || 0;
    options.pedestrians?.drainEvents?.();
  }
  function restoreProtagonist(checkpoint) {
    if (state.wanted || state.recovery || state.carjacking || state.passenger) return { ok: false, reason: 'busy' };
    let saved;
    try { saved = createProtagonistState(null, { bounds: map.bounds }).capture('student', checkpoint); }
    catch { return { ok: false, reason: 'invalid-checkpoint' }; }
    if (saved.health <= 0) return { ok: false, reason: 'unconscious-checkpoint' };
    if (saved.weapon !== 'unarmed' && !ownsWeapon(saved.weapon)) return { ok: false, reason: 'unowned-weapon' };

    // Placement may adjust a stale pose, but never seeks a distant road. Nothing
    // in Gameplay changes until both live bodies have a checked resting place.
    const previous = { ...simulation.player };
    const rollback = reason => {
      for (const key of Object.keys(simulation.player)) if (!Object.hasOwn(previous, key)) delete simulation.player[key];
      Object.assign(simulation.player, previous);
      return { ok: false, reason };
    };
    const candidates = function* (origin, radii) {
      yield { x: origin.x, z: origin.z, yaw: origin.yaw };
      for (const radius of radii) for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8;
        yield { x: origin.x + Math.cos(angle) * radius, z: origin.z + Math.sin(angle) * radius, yaw: origin.yaw };
      }
    };
    let actor, adjusted = false;
    try {
      simulation.setPlayerVehicle({ modelId: saved.vehicle.modelId, color: Number.parseInt(saved.vehicle.color.slice(1), 16) });
      let placed = false;
      for (const candidate of candidates(saved.vehicle, [2, 4, 8, 12])) {
        const result = simulation.teleport(candidate);
        if (result.ok && distance(simulation.player, saved.vehicle) <= 12.000001 &&
          simulation.canOccupy(simulation.player, { ignoreId: 'player' })) { placed = true; break; }
      }
      if (!placed) return rollback('vehicle-blocked');
      adjusted = distance(simulation.player, saved.vehicle) > .000001;
      actor = { ...saved.actor, speed: 0, jumpHeight: 0 };
      if (saved.mode === 'foot') {
        let clear = false;
        for (const candidate of candidates(saved.actor, [1, 2, 4, 6])) {
          const checked = { ...candidate, speed: 0, jumpHeight: 0 };
          if (!simulation.moveActor(checked, 0, 0, .45).blocked) { actor = checked; clear = true; break; }
        }
        if (!clear) return rollback('actor-blocked');
        adjusted ||= distance(actor, saved.actor) > .000001;
      }
    } catch { return rollback('placement-unavailable'); }
    reset();
    state.mode = saved.mode; Object.assign(state.actor, actor);
    state.health = saved.health; state.vehicleHealth = saved.vehicle.health;
    state.vehicle = { modelId: saved.vehicle.modelId, color: saved.vehicle.color, stolen: saved.vehicle.stolen };
    for (const weapon of WEAPONS) {
      Object.assign(ammunition[weapon.id], saved.ammunition[weapon.id]);
      // Resuming an empty magazine must not trigger first-equip auto-loading.
      if (ownsWeapon(weapon.id)) equipped.add(weapon.id);
    }
    state.weapon = saved.weapon;
    return { ok: true, adjusted };
  }
  reset();
  function switchToCompanion(person, personal) {
    if (state.mode !== 'foot' || state.passenger || state.recovery || state.carjacking || state.actor.impactTime > 0 || state.health <= 0 ||
      !person || !/^campaign-ally:(student|corporate|basement)$/.test(person.id) || person.seated || person.active !== true ||
      ![person.x,person.z,person.yaw,person.health].every(Number.isFinite) || person.health <= 0 || person.health > 100) return {ok:false,reason:'Companion unavailable.'};
    let saved;
    try {
      saved=createProtagonistState(null,{bounds:map.bounds}).capture('student',{
        ...personal,mode:'foot',actor:{x:person.x,z:person.z,yaw:person.yaw},health:person.health,
        vehicle:{x:simulation.player.x,z:simulation.player.z,yaw:simulation.player.yaw,...state.vehicle,health:state.vehicleHealth}
      });
    } catch { return {ok:false,reason:'Companion equipment unavailable.'}; }
    if (saved.weapon !== 'unarmed' && !ownsWeapon(saved.weapon)) return {ok:false,reason:'Companion equipment unavailable.'};
    if (!simulation.canOccupy({...person,id:'player-body'},{length:1,width:.8,ignorePersonId:person.id})) return {ok:false,reason:'Companion position is blocked.'};
    Object.assign(state.actor,{x:person.x,z:person.z,yaw:person.yaw,speed:0,jumpHeight:0});
    state.health=person.health;state.aiming=false;state.reloading=0;state.attackTimer=0;jumpVelocity=0;
    for (const weapon of WEAPONS) { Object.assign(ammunition[weapon.id],saved.ammunition[weapon.id]);if(ownsWeapon(weapon.id))equipped.add(weapon.id); }
    state.weapon=saved.weapon;
    // The same mission, police, car, wanted level and world clock remain live.
    return {ok:true};
  }
  function applyExplosion(event) {
    if (!event || event.type !== 'explosion' || ![event.x,event.z,event.radius,event.maxDamage].every(Number.isFinite) || event.radius <= 0 || event.radius > 8 || event.maxDamage <= 0 || event.maxDamage > 100) return false;
    const space=event.interiorId||null, sight=options.hasBlastLineOfSight||visible;
    const damageAt=target=>Math.max(0,event.maxDamage*(1-distance(event,target)/event.radius));
    let hits=0;
    for (const unit of state.police) if (unit.health>0 && (unit.interiorId||null)===space && sight(event,unit)) {
      const damage=damageAt(unit);if(damage>0){unit.health=Math.max(0,unit.health-damage);hits++;}
    }
    if (space===interiorId() && !state.sandbox && !state.recovery && sight(event,focus())) state.health=Math.max(0,state.health-damageAt(focus()));
    if (!space && sight(event,simulation.player)) state.vehicleHealth=Math.max(0,state.vehicleHealth-damageAt(simulation.player)*.6);
    if (space===interiorId()) {
      const result=options.pedestrians?.strike?.({x:event.x,z:event.z,yaw:0,range:event.radius,damage:event.maxDamage,kind:'explosion',hasLineOfSight:sight});
      hits+=result?.hits||0;
    }
    emit('explosion','Grenade detonated.',{hits});return true;
  }
  return { state, focus, step, interact, cancelCarjacking, setWeapon, reload, reportOffence, reset, restoreProtagonist, switchToCompanion, applyExplosion, addAmmo, getAmmo, heal, strikePolice, drainPoliceEvents:()=>policeEvents.splice(0),
    snapshot: () => freeze(JSON.parse(JSON.stringify(state))) };
}
