const LIMIT = 3, LIFETIME = 20, REACH = 4;
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

// The controller supplies physical queries and the existing inventory owner.
export function createEquipment({ consumeFlare, hasLineOfSight, canOccupy, heightAt = () => 0 } = {}) {
  let flares = [], serial = 0;
  const failure = message => ({ ok: false, message });
  function throwFlare(ctx) {
    if (!ctx || !validPoint(ctx.pose) || ctx.onFoot !== true || ctx.recovering || ctx.interior || ctx.passenger || ctx.bus || ctx.ride || ctx.activity)
      return failure('Throw flares outside on foot.');
    const yaw = ctx.aimYaw ?? ctx.pose.yaw;
    if (!Number.isFinite(yaw)) return failure('Choose a clear direction first.');
    if (flares.length >= LIMIT) return failure('Three flares are already burning.');
    if (typeof hasLineOfSight !== 'function' || typeof canOccupy !== 'function') return failure('No clear flare landing point.');
    const startY = heightAt(ctx.pose.x, ctx.pose.z);
    if (!Number.isFinite(startY)) return failure('No clear flare landing point.');
    let target;
    for (let distance = .5; distance <= REACH; distance += .5) {
      const next = { x: ctx.pose.x - Math.sin(yaw) * distance, z: ctx.pose.z - Math.cos(yaw) * distance, yaw };
      const y = heightAt(next.x, next.z);
      if (!Number.isFinite(y) || Math.abs(y - startY) > 1.5 || !hasLineOfSight(ctx.pose, next) || !canOccupy(next, { length: 1, width: .5, ignorePersonId: 'player-body' }))
        return failure('No clear flare landing point.');
      target = { ...next, y };
    }
    if (!ctx.sandbox) {
      if (typeof consumeFlare !== 'function') return failure('No flare inventory is available.');
      const paid = consumeFlare(ctx);
      if (paid !== true && paid?.ok !== true) return failure(paid?.message || 'Buy a flare pack first.');
    }
    const flare = { id: `flare:${++serial}`, ...target, age: 0, remaining: LIFETIME };
    flares.push(flare);
    return { ok: true, message: 'Flare thrown.', flare: Object.freeze({ ...flare }) };
  }
  function step(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Equipment dt must be finite and nonnegative.');
    if (dt === 0) return;
    for (const flare of flares) { flare.age += dt; flare.remaining = Math.max(0, LIFETIME - flare.age); }
    flares = flares.filter(flare => flare.remaining > 0);
  }
  return { throwFlare, step, reset() { flares = []; },
    snapshot() { return Object.freeze(flares.map(flare => Object.freeze({ ...flare }))); } };
}
