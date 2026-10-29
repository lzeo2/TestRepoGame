const TAU = 2 * Math.PI;
const MAX_OFFSET = 0.012; // metres
const GAIT_DISTANCE = 4; // horizontal metres per cycle
const FULL_SPEED = 8; // metres per second
const FADE_SECONDS = 0.2;
const smoothstep = x => x * x * (3 - 2 * x);

/**
 * Numeric, render-only vertical offset sampler. No camera/aim/shot mutation.
 *
 * sample({dt, distance?, speed?, grounded, aiming=false, enabled=true,
 *         reducedMotion=false}) -> absolute offset in metres, not a delta.
 * dt is elapsed simulation seconds, distance is actual horizontal path length
 * this interval (nonnegative, excluding warps). If omitted, actual speed in
 * m/s supplies distance = speed * dt. Explicit distance, including zero, wins.
 * grounded must mean eligible walking: pass false for air, rail/zipline rides,
 * hooks and other nongait traversal, even if the physics ground flag is true.
 * Aim/off/reduced motion/nongait immediately reset to zero. Invalid/nonpositive
 * dt holds the current sample; invalid travel behaves as rest. No clock reads.
 * Rest freezes phase and eases to exact zero within .2s; full rest resets gait.
 * Constant-speed travel and rest are partition-independent (float roundoff).
 * reset() on respawn/warp/restart. Persist preferences outside this module.
 * Apply once to a fresh render-camera clone, never add to yesterday's offset
 * or alter the logical camera, center sightpoint, shot direction or hit logic.
 */
export class CameraBob {
  constructor() { this.reset(); }

  reset() {
    this.phase = 0;
    this.blend = 0;
    this.speedScale = 0;
    this.offset = 0;
    return 0;
  }

  sample({dt, distance, speed = 0, grounded = false, aiming = false,
    enabled = true, reducedMotion = false} = {}) {
    if (!enabled || reducedMotion || aiming || !grounded) return this.reset();
    if (!Number.isFinite(dt) || dt <= 0) return this.offset;
    const travel = distance === undefined ? speed * dt : distance;
    const moving = Number.isFinite(travel) && travel > 0;
    this.blend = Math.max(0, Math.min(1,
      this.blend + (moving ? dt : -dt) / FADE_SECONDS));
    if (moving) {
      this.phase = (this.phase + (travel % GAIT_DISTANCE) * TAU / GAIT_DISTANCE) % TAU;
      this.speedScale = Math.min(1, travel / dt / FULL_SPEED);
    } else if (this.blend === 0) {
      return this.reset();
    }
    this.offset = MAX_OFFSET * this.speedScale * smoothstep(this.blend) * Math.sin(this.phase);
    return this.offset;
  }
}
