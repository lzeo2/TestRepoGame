const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const axis = n => Number.isFinite(n) ? clamp(n, -1, 1) : 0;
const validPose = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

// Fictional personal flight. The controller retains mission, collision and time
// authority. Horizontal sweeps deliberately keep ordinary body clearance, even
// above roofs: flight cannot skip a fence, building, water or occupied doorway.
export function createJetpack({ moveActor, heightAt, canOccupy = () => true } = {}) {
  if (typeof moveActor !== 'function' || typeof heightAt !== 'function') throw new TypeError('Jetpack requires body movement and terrain clearance.');
  let active = false, landing = false, charge = 100, y = 0, velocity = 0, thrust = false, reason = null;
  let lastX = 0, lastZ = 0;
  const ground = p => heightAt(p.x, p.z);
  function blocked(body, ctx) {
    return !validPose(body?.actor) || body.mode !== 'foot' || !(body.health > 0) || body.passenger || body.recovery ||
      body.carjacking || body.actor.impactTime > 0 || body.interiorId || ctx.interiorId || ctx.interior ||
      ctx.mission || ctx.job || ctx.activity || ctx.drone || ctx.aircraft || ctx.micromobility || ctx.recovering;
  }
  function toggle(body, ctx = {}) {
    if (ctx.paused) return false;
    if (active) { landing = true; reason = 'landing'; return true; }
    if (ctx.launchAllowed === false || blocked(body, ctx) || charge < 15 || body.actor.jumpHeight > .05) return false;
    const actor = body.actor, floor = ground(actor);
    if (!Number.isFinite(floor) || moveActor(actor, 0, 0, .45)?.blocked ||
      canOccupy({ x: actor.x, z: actor.z, y: floor + .2 }, { fromY: floor, radius: .45, height: 1.8 }) === false) return false;
    active = true; landing = false; y = floor; velocity = 0; thrust = false; reason = null;
    lastX = actor.x; lastZ = actor.z;
    return true;
  }
  function reset(body) {
    if (active && body?.actor) { body.actor.jumpHeight = 0; body.actor.speed = 0; }
    active = false; landing = false; charge = 100; velocity = 0; thrust = false; reason = null;
  }
  function step(dt, input = {}, body, ctx = {}) {
    if (ctx.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05);
    if (!active) {
      if (!blocked(body, ctx) && !(body.actor.jumpHeight > 0)) charge = Math.min(100, charge + 18 * dt);
      return;
    }
    const actor = body?.actor;
    if (!validPose(actor)) { active = false; thrust = false; return; }
    // A controller-owned transfer/recovery must not inherit the old flight.
    if (body.mode !== 'foot' || body.passenger || body.recovery || !(body.health > 0) ||
      ctx.interior || ctx.interiorId || Math.hypot(actor.x - lastX, actor.z - lastZ) > 8) {
      actor.jumpHeight = 0; actor.speed = 0; active = false; landing = false; thrust = false; velocity = 0; reason = 'body-unavailable'; return;
    }
    if (blocked(body, ctx)) { landing = true; reason = 'restricted'; }
    if (charge <= 0) { landing = true; reason = 'empty'; }
    const floor = ground(actor);
    if (!Number.isFinite(floor)) { landing = true; thrust = false; reason = 'terrain-unavailable'; return; }
    const x = landing ? 0 : axis(input.moveX), z = landing ? 0 : axis(input.moveZ), norm = Math.max(1, Math.hypot(x, z));
    const beforeX = actor.x, beforeZ = actor.z;
    moveActor(actor, x * 8 * dt / norm, z * 8 * dt / norm, .45);
    let nextFloor = ground(actor);
    if (!Number.isFinite(nextFloor) || nextFloor > y + .6) {
      actor.x = beforeX; actor.z = beforeZ; nextFloor = floor;
    }
    const lift = axis(input.lift);
    thrust = !landing && lift >= 0;
    const target = landing ? -3 : lift > 0 ? 4.5 : lift < 0 ? -3 : 0;
    velocity += (target - velocity) * Math.min(1, 8 * dt);
    let nextY = clamp(y + velocity * dt, nextFloor, nextFloor + 22);
    if (nextY <= nextFloor + .001 && moveActor(actor, 0, 0, .45)?.blocked) {
      nextY = nextFloor + .2; velocity = 0; landing = true; reason = 'landing-blocked';
    }
    if (canOccupy({ x: actor.x, z: actor.z, y: nextY }, { fromY: y, radius: .45, height: 1.8 }) !== false) y = nextY;
    else { actor.x = beforeX; actor.z = beforeZ; velocity = Math.min(0, velocity); thrust = false; }
    if (!landing) charge = Math.max(0, charge - (thrust ? 11 : 3) * dt);
    actor.jumpHeight = Math.max(0, y - ground(actor));
    actor.speed = Math.hypot(actor.x - beforeX, actor.z - beforeZ) / dt;
    if (Math.hypot(x, z) > 0) actor.yaw = Math.atan2(-x, -z);
    lastX = actor.x; lastZ = actor.z;
    if (actor.jumpHeight <= .001 && (landing || lift < 0)) {
      active = false; landing = false; velocity = 0; thrust = false; actor.jumpHeight = 0; actor.speed = 0; reason = 'landed';
    }
  }
  return { toggle, step, reset, get active() { return active; }, get landing() { return landing; },
    get thrust() { return thrust; }, get charge() { return charge; },
    snapshot: () => ({ active, landing, charge, thrust, verticalSpeed: velocity, reason }) };
}
