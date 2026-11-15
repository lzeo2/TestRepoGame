// The supplied health is authoritative. This owner only clocks transient fire
// and returns damage requests for the controller to apply to that same car.
export function createVehicleDamage() {
  let key = null, health = 100, x = 0, z = 0, yaw = 0, burning = false, wrecked = false;
  let wreckRemaining = 0, age = 0, pendingDamage = 0;
  function reset() {
    key = null; health = 100; x = z = yaw = 0; burning = wrecked = false;
    wreckRemaining = age = pendingDamage = 0;
  }
  function step(dt, context) {
    if (!Number.isFinite(dt) || dt <= 0 || context?.paused) return;
    const car = context?.car, carKey = context?.carKey;
    if (!car || ![car.x, car.z, car.yaw, context.health].every(Number.isFinite) ||
      !(typeof carKey === 'string' && carKey.length > 0 || typeof carKey === 'number' && Number.isFinite(carKey))) {
      reset(); return;
    }
    dt = Math.min(.1, dt);
    if (key !== carKey) { reset(); key = carKey; }
    health = Math.max(0, Math.min(100, context.health));
    x = car.x; z = car.z; yaw = car.yaw;
    if (health > 30) { burning = false; wrecked = false; wreckRemaining = age = pendingDamage = 0; return; }
    if (health === 0) {
      if (!wrecked) { wrecked = true; wreckRemaining = 10; age = 0; }
      burning = false; pendingDamage = 0;
      wreckRemaining = Math.max(0, wreckRemaining - dt);
      age += dt;
      return;
    }
    if (wrecked) { wrecked = false; wreckRemaining = 0; age = 0; }
    if (health <= 25) burning = true;
    if (burning) {
      age += dt;
      pendingDamage = Math.min(health, pendingDamage + dt * 2);
    }
  }
  function snapshot() {
    const fire = burning ? 1 : wreckRemaining / 10;
    return Object.freeze({ carKey: key, active: key !== null, health, x, z, yaw, severity: (100 - health) / 100,
      burning, wrecked, fire, smoke: burning ? 1 : Math.min(1, fire * 1.5), wreckRemaining, age });
  }
  function drainEvents() {
    if (pendingDamage <= 0 || key === null) return [];
    const event = Object.freeze({ type: 'burnDamage', carKey: key, damage: pendingDamage });
    pendingDamage = 0; return [event];
  }
  return { step, snapshot, drainEvents, reset };
}
