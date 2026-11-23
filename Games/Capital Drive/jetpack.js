const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const JETPACK_CAPACITY = 100;
const CRUISE_SPEED = 11;
const MAX_ALTITUDE = 40;
const axis = n => Number.isFinite(n) ? clamp(n, -1, 1) : 0;
const validPose = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

// Fictional personal flight. The controller retains mission, collision and time
// authority. Flight sweeps use absolute foot height so roofs and bridge decks
// block only their actual vertical span; the legacy ground mover is a fallback.
export function createJetpack({ moveActor, heightAt, moveFlight, supportHeightAt, canOccupy = () => true } = {}) {
  if (typeof moveActor !== 'function' || typeof heightAt !== 'function') throw new TypeError('Jetpack requires body movement and terrain clearance.');
  let active = false, landing = false, charge = JETPACK_CAPACITY, y = 0, velocity = 0, velocityX = 0, velocityZ = 0, thrust = false, reason = null;
  let lastX = 0, lastZ = 0;
  const ground = p => heightAt(p.x, p.z);
  const move=(actor,dx,dz)=>typeof moveFlight==='function'
    ?moveFlight(actor,dx,dz,{y,fromY:y,radius:.45,height:1.8})
    :moveActor(actor,dx,dz,.45);
  const support=(actor,floor)=>{
    const at=typeof supportHeightAt==='function'?supportHeightAt(actor.x,actor.z,{y,fromY:y,radius:.45,height:1.8}):floor;
    return Number.isFinite(at)&&at<=y+.05?Math.max(floor,at):floor;
  };
  function blocked(body, ctx) {
    return ctx.owned !== true || !validPose(body?.actor) || body.mode !== 'foot' || !(body.health > 0) || body.passenger || body.recovery ||
      body.carjacking || body.actor.impactTime > 0 || body.interiorId || ctx.interiorId || ctx.interior ||
      ctx.mission || ctx.job || ctx.activity || ctx.drone || ctx.aircraft || ctx.micromobility || ctx.recovering;
  }
  function toggle(body, ctx = {}) {
    if (ctx.paused) return false;
    if (active) {
      if(landing&&charge>0){landing=false;reason=null;}else{landing=true;reason='landing';}
      return true;
    }
    if (ctx.launchAllowed === false || blocked(body, ctx) || charge < 15 || body.actor.jumpHeight > .05) return false;
    const actor = body.actor, floor = ground(actor);
    if(!Number.isFinite(floor))return false;
    const launchY=Number.isFinite(ctx.feetY)?Math.max(floor,ctx.feetY):floor;
    const occupied=typeof moveFlight==='function'?moveFlight(actor,0,0,{y:launchY,fromY:launchY,radius:.45,height:1.8}):moveActor(actor,0,0,.45);
    if (!Number.isFinite(floor) || occupied?.blocked ||
      canOccupy({ x: actor.x, z: actor.z, y: launchY + .2 }, { fromY: launchY, radius: .45, height: 1.8 }) === false) return false;
    active = true; landing = false; y = launchY;actor.jumpHeight=y-floor; velocity = 0; velocityX = velocityZ = 0; thrust = false; reason = null;
    lastX = actor.x; lastZ = actor.z;
    return true;
  }
  function reset(body) {
    if (active && body?.actor) { body.actor.jumpHeight = 0; body.actor.speed = 0; }
    active = false; landing = false; charge = JETPACK_CAPACITY; velocity = 0; velocityX = velocityZ = 0; thrust = false; reason = null;
  }
  function step(dt, input = {}, body, ctx = {}) {
    if (ctx.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05);
    if (!active) {
      if (!blocked(body, ctx) && !(body.actor.jumpHeight > 0)) charge = Math.min(JETPACK_CAPACITY, charge + 3.5 * dt);
      return;
    }
    const actor = body?.actor;
    if (!validPose(actor)) { active = false; thrust = false; velocity = velocityX = velocityZ = 0; return; }
    // A controller-owned transfer/recovery must not inherit the old flight.
    if (body.mode !== 'foot' || body.passenger || body.recovery || !(body.health > 0) ||
      ctx.interior || ctx.interiorId || Math.hypot(actor.x - lastX, actor.z - lastZ) > 8) {
      actor.jumpHeight = 0; actor.speed = 0; active = false; landing = false; thrust = false; velocity = velocityX = velocityZ = 0; reason = 'body-unavailable'; return;
    }
    const raisedStanding=reason==='surface-supported',restricted=blocked(body,ctx);
    if (restricted) { landing = true; velocityX = velocityZ = 0; reason = 'restricted'; }
    if (charge <= 0) { landing = true; reason = 'empty'; }
    const floor = ground(actor);
    if (!Number.isFinite(floor)) { landing = true; thrust = false; reason = 'terrain-unavailable'; return; }
    const steering=!restricted&&((charge>0&&(!landing||['landing','landing-blocked','surface-supported'].includes(reason)))||raisedStanding);
    const cruise=raisedStanding&&charge<=0?3:CRUISE_SPEED;
    const x = steering ? axis(input.moveX) : 0, z = steering ? axis(input.moveZ) : 0, norm = Math.max(1, Math.hypot(x, z));
    const beforeX = actor.x, beforeZ = actor.z;
    // Exponential response is stable under the existing fixed step and avoids
    // instant sideways changes. Let a manual landing brake gently; restrictions
    // stop horizontal travel immediately through the same authority guard.
    const response = 1 - Math.exp(-(landing ? 5 : Math.hypot(x, z) > 0 ? 3 : 4.5) * dt);
    velocityX += (x * cruise / norm - velocityX) * response;
    velocityZ += (z * cruise / norm - velocityZ) * response;
    move(actor, velocityX * dt, velocityZ * dt);
    // Shared sweeps can clip either axis. Do not retain thrust velocity into
    // that obstacle or turn a later release into a sudden collision escape.
    if (Math.abs(actor.x - beforeX - velocityX * dt) > .0001) velocityX = 0;
    if (Math.abs(actor.z - beforeZ - velocityZ * dt) > .0001) velocityZ = 0;
    let nextFloor = ground(actor);
    if (!Number.isFinite(nextFloor) || nextFloor > y + .6) {
      actor.x = beforeX; actor.z = beforeZ; velocityX = velocityZ = 0; nextFloor = floor;
    }
    const baseFloor=nextFloor;nextFloor=support(actor,baseFloor);
    const lift = axis(input.lift);
    thrust = !landing && lift >= 0;
    const target = landing ? -Math.min(3, Math.max(.65, (y - nextFloor) * 1.8)) : lift > 0 ? 5.5 : lift < 0 ? -3 : 0;
    velocity += (target - velocity) * (1 - Math.exp(-10 * dt));
    let nextY = clamp(y + velocity * dt, nextFloor, Math.max(y,baseFloor + MAX_ALTITUDE));
    if (nextY <= nextFloor + .001 && move(actor, 0, 0)?.blocked) {
      nextY = nextFloor + .2; velocity = 0; landing = true; reason = 'landing-blocked';
    }
    if (canOccupy({ x: actor.x, z: actor.z, y: nextY }, { fromY: y, radius: .45, height: 1.8 }) !== false) y = nextY;
    else {
      // A ceiling blocks ascent, not a separately cleared horizontal slide.
      // Never restore stale positive vertical momentum against an underside.
      velocity=0;thrust=false;
    }
    // Neutral lift counteracts gravity: hovering still consumes fuel. A long
    // cross-town flight is possible, but ascent and forward thrust cost more.
    if (!landing) charge = Math.max(0, charge - ((lift > 0 ? 1.6 : lift < 0 ? .35 : .9) + Math.hypot(velocityX, velocityZ) / CRUISE_SPEED * .35) * dt);
    if(y<=nextFloor+.001&&nextFloor>baseFloor+.05){
      velocity=0;reason='surface-supported';
      // Keep absolute altitude ownership on roofs until grounded gameplay has
      // a matching support owner; releasing it would teleport through the roof.
    }else if(reason==='surface-supported'){reason=landing?'landing':null;}
    actor.jumpHeight = Math.max(0, y - ground(actor));
    actor.speed = Math.hypot(actor.x - beforeX, actor.z - beforeZ) / dt;
    if (actor.speed > .15 && body.aiming!==true && input.aiming!==true) actor.yaw = Math.atan2(-velocityX, -velocityZ);
    lastX = actor.x; lastZ = actor.z;
    if (actor.jumpHeight <= .001 && (landing || lift < 0)) {
      active = false; landing = false; velocity = velocityX = velocityZ = 0; thrust = false; actor.jumpHeight = 0; actor.speed = 0; reason = 'landed';
    }
  }
  return { toggle, step, reset, get active() { return active; }, get feetY(){return active?y:null;}, get landing() { return landing; },
    get thrust() { return thrust; }, get charge() { return charge; },
    get verticalSpeed() { return velocity; }, get leanX() { return velocityX / CRUISE_SPEED; }, get leanZ() { return velocityZ / CRUISE_SPEED; },
    get capacity() { return JETPACK_CAPACITY; }, get chargeFraction() { return charge / JETPACK_CAPACITY; },
    snapshot: () => ({ active, feetY:active?y:null, landing, charge, thrust, verticalSpeed: velocity, velocityX, velocityZ, horizontalSpeed: Math.hypot(velocityX, velocityZ),
      leanX: velocityX / CRUISE_SPEED, leanZ: velocityZ / CRUISE_SPEED, capacity: JETPACK_CAPACITY, chargeFraction: charge / JETPACK_CAPACITY, reason }) };
}
