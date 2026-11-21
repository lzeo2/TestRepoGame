// Original arcade thrown equipment. The controller owns admission and inventory.
export const ORDNANCE_LIMITS = Object.freeze({ projectiles: 4, clouds: 3, bursts: 4, burstLifetime: .65, fuse: 2, smokeLifetime: 10, smokeRadius: 5, blastRadius: 8 });
export const DRONE_STRIKE_BLAST = Object.freeze({ radius: 12, maxDamage: 160 });
const GRENADE_BLAST = Object.freeze({ radius: ORDNANCE_LIMITS.blastRadius, maxDamage: 100 });
const ROCKET_BLAST = Object.freeze({ radius: 10, maxDamage: 130 });
const ROCKET_SPEED = 58;
const RADIUS = .12, MAX_STEP = .25, SLICE = 1 / 60;
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const room = value => value == null ? null : typeof value === 'string' && value.length > 0 && value.length <= 160 ? value : undefined;
const copy = value => Object.freeze({ ...value });

export const blastLimits = kind => kind === 'drone-strike' ? DRONE_STRIKE_BLAST : kind === 'rocket' ? ROCKET_BLAST : GRENADE_BLAST;

export function validExplosion(event) {
  if (event?.type !== 'explosion' || !point(event) || (event.kind === 'drone-strike' && event.interiorId != null)) return false;
  const limits = blastLimits(event.kind);
  return Number.isFinite(event.radius) && event.radius > 0 && event.radius <= limits.radius &&
    Number.isFinite(event.maxDamage) && event.maxDamage > 0 && event.maxDamage <= limits.maxDamage;
}

export function blastDamage(distance, maxDamage = 100) {
  return Number.isFinite(distance) && distance >= 0 && Number.isFinite(maxDamage) && maxDamage > 0 ?
    Math.max(0, maxDamage * (1 - distance / ORDNANCE_LIMITS.blastRadius)) : 0;
}

export function createOrdnance({ consumeThrow, moveProjectile, traceRocket, heightAt = () => 0, canThrow } = {}) {
  let projectiles = [], clouds = [], bursts = [], events = [], serial = 0;
  const failure = message => ({ ok: false, message });
  function emit(event) { if (events.length < 16) events.push(copy(event)); }
  function detonate({ id, kind, x, y, z, interiorId }) {
    const event={type:'explosion',id,kind,x,y,z,interiorId,...blastLimits(kind)};
    emit(event);
    if (bursts.length === ORDNANCE_LIMITS.bursts) bursts.shift();
    bursts.push({...event,age:0,remaining:ORDNANCE_LIMITS.burstLifetime});
  }
  function launchRocket(ray) {
    if (typeof traceRocket !== 'function' || !point(ray) || ![ray.y,ray.dx,ray.dy,ray.dz,ray.range].every(Number.isFinite) ||
      ray.range <= 0 || ray.range > 100 || Math.abs(Math.hypot(ray.dx,ray.dy,ray.dz)-1)>1e-6 ||
      projectiles.length >= ORDNANCE_LIMITS.projectiles || events.length + projectiles.length >= 16) return false;
    const interiorId=room(ray.interiorId);
    if(interiorId===undefined)return false;
    const {x,y,z,dx,dy,dz,range}=ray;
    projectiles.push({id:`ordnance:${++serial}`,kind:'rocket',x,y,z,dx,dy,dz,range,interiorId,age:0,remaining:range/ROCKET_SPEED});
    return true;
  }
  function stepRocket(item,dt) {
    const range=Math.min(item.range,ROCKET_SPEED*dt);
    const hit=traceRocket({x:item.x,y:item.y,z:item.z,dx:item.dx,dy:item.dy,dz:item.dz,range,interiorId:item.interiorId});
    const impact=!Number.isFinite(hit)||hit < range-1e-6;
    // Keep the blast on the launch side of the hit surface for the cover check.
    const advance=impact?Math.max(0,(Number.isFinite(hit)?hit:0)-.02):range;
    item.x+=item.dx*advance;item.y+=item.dy*advance;item.z+=item.dz*advance;
    item.age+=dt;item.range=Math.max(0,item.range-range);
    item.remaining=impact?0:item.range/ROCKET_SPEED;
    if(item.remaining<=1e-9)detonate(item);
  }
  function throwItem(kind, ctx) {
    if (!['grenade', 'smoke'].includes(kind)) return failure('Unknown thrown equipment.');
    if (!ctx || !point(ctx.pose) || ctx.onFoot !== true || ctx.recovering || ctx.passenger || ctx.bus || ctx.ride || ctx.activity)
      return failure('Throw equipment while standing on foot.');
    const interiorId = room(ctx.interiorId), yaw = ctx.aimYaw ?? ctx.yaw ?? ctx.pose.yaw;
    if (interiorId === undefined || !Number.isFinite(yaw) || (ctx.pose.y !== undefined && !Number.isFinite(ctx.pose.y)))
      return failure('Choose a clear direction first.');
    if (events.length + projectiles.length >= 16 || projectiles.length >= ORDNANCE_LIMITS.projectiles || (kind === 'smoke' && clouds.length + projectiles.filter(item => item.kind === 'smoke').length >= ORDNANCE_LIMITS.clouds))
      return failure('Wait for your thrown equipment to clear.');
    if (typeof moveProjectile !== 'function' || (typeof canThrow === 'function' && canThrow(kind, ctx) !== true))
      return failure('No clear throw is available.');
    const ground = heightAt(ctx.pose.x, ctx.pose.z, interiorId);
    if (!Number.isFinite(ground)) return failure('No clear throw is available.');
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
    const start = { id: `ordnance:${serial + 1}`, x: ctx.pose.x, z: ctx.pose.z, interiorId };
    const sweep = moveProjectile(start, dx * .55, dz * .55, RADIUS, { ...ctx, interiorId });
    if (!sweep || sweep.blocked || !point(start) || Math.hypot(start.x - ctx.pose.x - dx * .55, start.z - ctx.pose.z - dz * .55) > .05)
      return failure('No clear throw is available.');
    if (!ctx.sandbox) {
      if (typeof consumeThrow !== 'function') return failure('No equipment inventory is available.');
      const paid = consumeThrow(kind, ctx);
      if (paid !== true && paid?.ok !== true) return failure(paid?.message || 'Buy thrown equipment first.');
    }
    const item = { ...start, id: `ordnance:${++serial}`, kind, y: Math.max(ground + RADIUS, ctx.pose.y ?? ground) + 1.2,
      vx: dx * 13, vz: dz * 13, vy: 5, age: 0, remaining: ORDNANCE_LIMITS.fuse, groundY: ground };
    projectiles.push(item);
    return { ok: true, message: kind === 'grenade' ? 'Grenade thrown.' : 'Smoke grenade thrown.', projectile: copy(item) };
  }
  function step(dt, ctx = {}) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Ordnance dt must be finite and nonnegative.');
    let remaining = Math.min(dt, MAX_STEP);
    while (remaining > 1e-9) {
      const slice = Math.min(SLICE, remaining); remaining -= slice;
      for (const burst of bursts) { burst.age += slice; burst.remaining = Math.max(0, ORDNANCE_LIMITS.burstLifetime - burst.age); }
      bursts = bursts.filter(burst => burst.remaining > 1e-9);
      for (const cloud of clouds) { cloud.age += slice; cloud.remaining = Math.max(0, ORDNANCE_LIMITS.smokeLifetime - cloud.age); }
      clouds = clouds.filter(cloud => cloud.remaining > 1e-9);
      for (const item of projectiles) {
        if(item.kind==='rocket'){stepRocket(item,slice);continue;}
        const previousX = item.x, previousZ = item.z;
        const result = moveProjectile(item, item.vx * slice, item.vz * slice, RADIUS, { ...ctx, interiorId: item.interiorId });
        const finiteMove = point(item);
        if (!finiteMove) { item.x = previousX; item.z = previousZ; }
        if (!result || result.blocked || !finiteMove) { item.vx = 0; item.vz = 0; }
        const ground = heightAt(item.x, item.z, item.interiorId);
        if (Number.isFinite(ground)) item.groundY = ground;
        item.vy -= 9.8 * slice;
        item.y = Math.max(item.groundY + RADIUS, item.y + item.vy * slice);
        if (item.y <= item.groundY + RADIUS) { item.vy = 0; item.vx *= .9; item.vz *= .9; }
        item.age += slice; item.remaining = Math.max(0, ORDNANCE_LIMITS.fuse - item.age);
        if (item.remaining <= 1e-9) {
          const event = { type: item.kind === 'grenade' ? 'explosion' : 'smoke-deployed', id: item.id, kind: item.kind,
            x: item.x, y: item.y, z: item.z, interiorId: item.interiorId };
          if (item.kind === 'grenade') detonate(event);
          else {
            const cloud = { id: item.id, x: item.x, y: item.groundY, z: item.z, interiorId: item.interiorId,
              radius: ORDNANCE_LIMITS.smokeRadius, height: 4, age: 0, remaining: ORDNANCE_LIMITS.smokeLifetime };
            clouds.push(cloud); emit({ ...event, radius: cloud.radius });
          }
        }
      }
      projectiles = projectiles.filter(item => item.remaining > 1e-9);
    }
  }
  function blocksSight(a, b, { interiorId = null } = {}) {
    const space = room(interiorId);
    if (!point(a) || !point(b) || space === undefined ||
      (a.y !== undefined && !Number.isFinite(a.y)) || (b.y !== undefined && !Number.isFinite(b.y)) ||
      (a.interiorId !== undefined && room(a.interiorId) !== space) || (b.interiorId !== undefined && room(b.interiorId) !== space)) return false;
    for (const cloud of clouds) {
      if (cloud.interiorId !== space) continue;
      // Intersect a finite segment with the smoke's vertical cylinder, including a zero-length ray.
      const ax = a.x - cloud.x, az = a.z - cloud.z, dx = b.x - a.x, dz = b.z - a.z;
      const length2 = dx * dx + dz * dz, c = ax * ax + az * az - cloud.radius * cloud.radius;
      let enter = 0, exit = 1;
      if (length2 < 1e-12) { if (c > 0) continue; }
      else {
        const projection = ax * dx + az * dz, discriminant = projection * projection - length2 * c;
        if (discriminant < 0) continue;
        const root = Math.sqrt(discriminant);
        enter = Math.max(0, (-projection - root) / length2); exit = Math.min(1, (-projection + root) / length2);
        if (enter > exit) continue;
      }
      const ay = a.y ?? cloud.y + 1.5, by = b.y ?? cloud.y + 1.5, dy = by - ay;
      if (Math.abs(dy) < 1e-12) { if (ay >= cloud.y && ay <= cloud.y + cloud.height) return true; }
      else {
        const first = (cloud.y - ay) / dy, last = (cloud.y + cloud.height - ay) / dy;
        if (Math.max(enter, Math.min(first, last)) <= Math.min(exit, Math.max(first, last))) return true;
      }
    }
    return false;
  }
  function showExplosion(event) {
    if (!validExplosion(event) || !Number.isFinite(event.y) || event.interiorId != null) return false;
    if (bursts.length === ORDNANCE_LIMITS.bursts) bursts.shift();
    bursts.push({id:event.id,kind:event.kind,x:event.x,y:event.y,z:event.z,radius:event.radius,interiorId:null,age:0,remaining:ORDNANCE_LIMITS.burstLifetime});
    return true;
  }
  return { throw: throwItem, launchRocket, step, blocksSight, showExplosion, drainEvents: () => events.splice(0),
    snapshot: () => Object.freeze({ projectiles: Object.freeze(projectiles.map(copy)), clouds: Object.freeze(clouds.map(copy)), bursts: Object.freeze(bursts.map(copy)) }),
    reset() { projectiles = []; clouds = []; bursts = []; events = []; } };
}
