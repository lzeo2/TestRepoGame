// Fictional game hardware on supplied storefronts, not real camera-location data.
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const room = value => value ?? null;
const COS_HALF_FOV = Math.cos(35 * Math.PI / 180);
export function createSecurityCameras(locations = [], { hasLineOfSight, heightAt = () => 0 } = {}) {
  const cameras = [], ids = new Set(), events = [];
  for (const p of locations) {
    if (cameras.length === 6) break;
    if (!valid(p) || typeof p.id !== 'string' || !p.id || ids.has(p.id) || !Number.isFinite(p.yaw)) continue;
    const ground = heightAt(p.x, p.z);
    if (!Number.isFinite(ground)) continue;
    ids.add(p.id); cameras.push({ id: p.id, x: p.x, z: p.z, y: ground + 3, yaw: p.yaw,
      interiorId: room(p.interiorId), health: 40, enabled: true, nextCheck: 0 });
  }
  let time = 0, crime = null, lastSerial = -1, nextSighting = 0, disposed = false;
  const copy = c => Object.freeze({ id: c.id, x: c.x, y: c.y, z: c.z, yaw: c.yaw,
    interiorId: c.interiorId, health: c.health, enabled: c.enabled && c.health > 0 });
  function reportCrime(receipt) {
    if (disposed || !valid(receipt) || !Number.isSafeInteger(receipt.serial) || receipt.serial < 0 ||
      receipt.serial <= lastSerial || typeof receipt.kind !== 'string' || !receipt.kind ||
      !Number.isFinite(receipt.level) || receipt.level <= 0) return false;
    lastSerial = receipt.serial;
    crime = Object.freeze({ serial: receipt.serial, x: receipt.x, z: receipt.z, interiorId: room(receipt.interiorId),
      kind: receipt.kind, level: Math.min(5, Math.max(1, Math.floor(receipt.level))), expires: time + 12 });
    return true;
  }
  function eligible(c, p) {
    if (!valid(p) || room(p.interiorId) !== c.interiorId) return false;
    const dx = p.x - c.x, dz = p.z - c.z, distance = Math.hypot(dx, dz);
    return distance <= 40 && (distance < 1e-6 || (-Math.sin(c.yaw) * dx - Math.cos(c.yaw) * dz) / distance >= COS_HALF_FOV);
  }
  function step(dt, context = {}) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Camera dt must be finite and nonnegative.');
    if (disposed || context.paused || !dt) return;
    time += dt;
    if (crime && time > crime.expires) crime = null;
    const player = valid(context.player) ? { ...context.player, interiorId: room(context.interiorId),
      y: Number.isFinite(context.player.y) ? context.player.y : heightAt(context.player.x, context.player.z) + 1.5 } : null;
    for (const c of cameras) {
      if (!c.enabled || c.health <= 0 || time + 1e-9 < c.nextCheck) continue;
      const targetCrime = crime && eligible(c, crime);
      const target = targetCrime ? crime : context.wanted > 0 && time >= nextSighting && eligible(c, player) ? player : null;
      if (!target || typeof hasLineOfSight !== 'function') continue;
      c.nextCheck = time + .4;
      const y = Number.isFinite(target.y) ? target.y : heightAt(target.x, target.z) + 1.5;
      if (!Number.isFinite(y) || hasLineOfSight(copy(c), { ...target, y }) !== true) continue;
      if (targetCrime) {
        events.push(Object.freeze({ type: 'crime-spotted', cameraId: c.id, ...crime })); crime = null;
      } else {
        events.push(Object.freeze({ type: 'sighting', cameraId: c.id, x: player.x, z: player.z, interiorId: player.interiorId }));
        nextSighting = time + 2;
      }
    }
  }
  function shotTargets() {
    return Object.freeze(disposed ? [] : cameras.filter(c => c.health > 0).map(c => Object.freeze({
      ...copy(c), feetY: c.y - .18, height: .36, radius: .32 })));
  }
  function hitByShot(id, damage, ray = {}) {
    const c = cameras.find(c => c.id === id);
    if (disposed || !c || c.health <= 0 || !Number.isFinite(damage) || damage <= 0 || room(ray.interiorId) !== c.interiorId) return { hits: 0, people: [] };
    c.health = Math.max(0, c.health - Math.min(100, damage));
    return { hits: 1, people: [], cameraId: c.id, destroyed: c.health === 0 };
  }
  return Object.freeze({ reportCrime, step, shotTargets, hitByShot,
    setEnabled(id, enabled) { const c = cameras.find(c => c.id === id); if (c && !disposed) c.enabled = enabled === true; },
    remove(id) { const i = cameras.findIndex(c => c.id === id); if (i >= 0) cameras.splice(i, 1); },
    snapshot: () => Object.freeze(cameras.map(copy)), drainEvents: () => events.splice(0),
    dispose() { disposed = true; cameras.length = 0; events.length = 0; crime = null; } });
}
