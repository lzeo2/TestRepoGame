import * as THREE from '../vendor/three.module.js';

const RADIUS = 0.45, HEIGHT = 1.8, CROUCH_HEIGHT = 0.95;
const WALK = 8, SPRINT = 12, GRAVITY = 24, JUMP = 9;
const DASH_COST = 30, DASH_SPEED = 28, DASH_TIME = 0.2;
const RECHARGE_DELAY = 1.25, RECHARGE = 22, SLIDE_TIME = 0.9;
const STEP = 0.45, MANTLE = 1.25, EPS = 1e-6, CAMERA_RADIUS = 0.3;
const clamp = THREE.MathUtils.clamp;
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const bounds = b => b.min ? {
  minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y,
  minZ: b.min.z, maxZ: b.max.z
} : b;
const horizontalOverlap = (p, b) => p.x + RADIUS > b.minX + EPS &&
  p.x - RADIUS < b.maxX - EPS && p.z + RADIUS > b.minZ + EPS && p.z - RADIUS < b.maxZ - EPS;

// Sphere sweep against AABBs expanded by the camera radius (slab intersection).
function cameraFraction(from, to, boxes) {
  let closest = 1;
  for (const raw of boxes) {
    const b = bounds(raw);
    let enter = 0, exit = 1;
    for (const axis of ['x', 'y', 'z']) {
      const suffix = axis.toUpperCase(), delta = to[axis] - from[axis];
      const lo = b[`min${suffix}`] - CAMERA_RADIUS, hi = b[`max${suffix}`] + CAMERA_RADIUS;
      if (Math.abs(delta) < EPS) {
        if (from[axis] < lo || from[axis] > hi) { exit = -1; break; }
      } else {
        const a = (lo - from[axis]) / delta, c = (hi - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, c));
        exit = Math.min(exit, Math.max(a, c));
      }
    }
    if (enter <= exit && exit >= 0 && enter <= 1) closest = Math.min(closest, enter);
  }
  return Math.max(0, closest - (closest < 1 ? 0.001 / Math.max(EPS, from.distanceTo(to)) : 0));
}

/**
 * Movement only. Units are metres/seconds; position is FEET, not the body centre.
 *
 * const hero = new PlayerController({ position: spawn, boxes: world.boxes,
 *   floorHeight: (x, z, maxY) => surfaceHeight(world, x, z, maxY) });
 * hero.update(dt, { forward: 1, side: 0, sprint: ctrlHeld, jump: spaceEdge,
 *   dash: shiftEdge, slide: cHeld, aim: rightMouseHeld, yaw, pitch });
 * hero.updateCamera(camera, dt);
 *
 * At yaw 0 forward is -Z and right is +X. Positive pitch looks up; angles are
 * radians. The harness owns all DOM input, pointer lock, rendering and teardown.
 * jump/dash are caller-supplied edges, not held keys. Slide requires existing
 * forward momentum and a fresh C press; holding C cannot restart its 0.9s cap.
 * update caps dt at 0.25s; discard suspended-tab time in the harness too.
 *
 * boxes accepts flat {minX,maxX,minY,maxY,minZ,maxZ} records or THREE.Box3.
 * The array is retained, not copied, so removing destroyed cover takes effect.
 * floorHeight returns the highest accessible surface <= maxY, or -Infinity
 * for a void. This module also handles box tops/undersides. Spawn/warp into
 * non-overlapping space; warp clears movement, action timers, stamina and jumps
 * but preserves view angles and speedMultiplier (default 1, supported 0.1..4).
 *
 * Public observations: position/velocity (THREE.Vector3), yaw/pitch, aiming,
 * state, stamina (0..100), grounded, jumps, height, radius, infiniteAmmo.
 * A low ceiling may keep the body crouched after a slide, but infiniteAmmo is
 * true only during an active slide. hookTo(point or {position}) optionally pulls
 * toward a target <=40m away, using the same collisions, with no damage logic.
 * No resources/listeners are allocated that need dispose().
 */
export class PlayerController {
  constructor({ position = { x: 0, y: 0, z: 8 }, boxes = [], floorHeight = () => 0 } = {}) {
    this.boxes = boxes;
    this.floorHeight = floorHeight;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.speedMultiplier = 1;
    this.radius = RADIUS;
    this.warp(position);
  }

  get height() { return this._slideTime > 0 || this._crouched ? CROUCH_HEIGHT : HEIGHT; }
  get infiniteAmmo() { return this.state === 'slide' && this._slideTime > 0; }

  warp(position) {
    this.position.set(finite(position.x), finite(position.y), finite(position.z));
    this.velocity.set(0, 0, 0);
    this.stamina = 100;
    this.jumps = 0;
    this.aiming = false;
    this._dashTime = this._slideTime = this._rechargeDelay = 0;
    this._slideHeld = this._crouched = false;
    this._mantle = this._hook = null;
    this._cameraReady = false;
    this.grounded = false;
    this._ground();
    this.state = this.grounded ? 'idle' : 'fall';
    return this;
  }

  _surface(maxY, p = this.position) {
    let height = this.floorHeight(p.x, p.z, maxY);
    if (!Number.isFinite(height) || height > maxY + EPS) height = -Infinity;
    for (const raw of this.boxes) {
      const b = bounds(raw);
      if (b.maxY <= maxY + EPS && horizontalOverlap(p, b)) height = Math.max(height, b.maxY);
    }
    return height;
  }

  _clear(p, height = this.height) {
    return !this.boxes.some(raw => {
      const b = bounds(raw);
      return horizontalOverlap(p, b) && p.y < b.maxY - EPS && p.y + height > b.minY + EPS;
    });
  }

  _ground() {
    const floor = this._surface(this.position.y + 0.035);
    this.grounded = this.velocity.y <= 0 && Math.abs(this.position.y - floor) <= 0.035;
    if (this.grounded) {
      this.position.y = floor;
      this.velocity.y = 0;
      this.jumps = 0;
    }
  }

  _stopSlide() {
    this._slideTime = 0;
    this._crouched = !this._clear(this.position, HEIGHT);
  }

  _tryMantle(b, axis, delta) {
    const rise = b.maxY - this.position.y;
    if (!this.grounded || rise <= STEP || rise > MANTLE) return false;
    const top = this.position.clone();
    top.y = b.maxY;
    if (!this._clear(top, HEIGHT)) return false;
    top[axis] += Math.sign(delta) * (RADIUS * 2 + 0.1);
    if (!this._clear(top, HEIGHT)) return false;
    this._mantle = { top: b.maxY, axis, sign: Math.sign(delta), push: 0.2 };
    this.velocity.set(0, 0, 0);
    return true;
  }

  _move(dx, dy, dz, mantle = false) {
    // Axis AABB approximation of the upright capsule. Bounded spatial steps
    // protect thin cover even for dash, external velocity and speed buffs.
    const count = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.18));
    let blocked = false;
    for (let i = 0; i < count; i++) {
      for (const [axis, delta] of [['x', dx / count], ['z', dz / count]]) {
        if (delta === 0) continue;
        const old = this.position[axis], oldY = this.position.y;
        this.position[axis] += delta;
        if (this.grounded && dy <= 0) {
          const floor = this._surface(oldY + STEP);
          if (floor > oldY + EPS) {
            const stepped = this.position.clone(); stepped.y = floor;
            if (this._clear(stepped)) this.position.y = floor;
          }
        }
        const hit = this.boxes.find(raw => {
          const b = bounds(raw);
          return horizontalOverlap(this.position, b) && this.position.y < b.maxY - EPS &&
            this.position.y + this.height > b.minY + EPS;
        });
        if (hit) {
          this.position[axis] = old;
          this.position.y = oldY;
          if (mantle && !this._mantle) this._tryMantle(bounds(hit), axis, delta);
          this.velocity[axis] = 0;
          blocked = true;
        }
      }
      const oldY = this.position.y, stepY = dy / count;
      let nextY = oldY + stepY;
      for (const raw of this.boxes) {
        const b = bounds(raw);
        if (!horizontalOverlap(this.position, b)) continue;
        if (stepY > 0 && oldY + this.height <= b.minY + EPS && nextY + this.height > b.minY) {
          nextY = Math.min(nextY, b.minY - this.height);
          this.velocity.y = 0;
          blocked = true;
        }
        if (stepY < 0 && oldY >= b.maxY - EPS && nextY < b.maxY) {
          nextY = Math.max(nextY, b.maxY);
          this.velocity.y = 0;
        }
      }
      const floor = this._surface(oldY + 0.035);
      if (stepY <= 0 && nextY <= floor && oldY >= floor - EPS) {
        nextY = floor;
        this.velocity.y = 0;
      }
      this.position.y = nextY;
      this._ground();
    }
    return blocked;
  }

  hookTo(target) {
    const point = target?.position ?? target;
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) return false;
    const destination = new THREE.Vector3(point.x, point.y, point.z);
    const distance = destination.distanceTo(this.position);
    if (distance < 0.5 || distance > 40) return false;
    this._stopSlide();
    this._dashTime = 0;
    this._mantle = null;
    this._hook = { target: destination, left: 0.8 };
    return true;
  }

  update(dt, input = {}) {
    this.yaw = finite(input.yaw, this.yaw);
    this.pitch = clamp(finite(input.pitch, this.pitch), -1.2, 1.2);
    this.aiming = Boolean(input.aim);
    dt = clamp(finite(dt), 0, 0.25);
    if (dt === 0) return this;
    this._ground();
    const forward = clamp(finite(input.forward), -1, 1), side = clamp(finite(input.side), -1, 1);
    const front = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const wish = new THREE.Vector3(Math.cos(this.yaw) * side, 0, -Math.sin(this.yaw) * side).addScaledVector(front, forward);
    if (wish.lengthSq() > 1) wish.normalize();
    const multiplier = clamp(finite(this.speedMultiplier, 1), 0.1, 4);
    const slidePressed = Boolean(input.slide) && !this._slideHeld;
    this._slideHeld = Boolean(input.slide);
    if (!input.slide) this._stopSlide();
    if (this._crouched && this._clear(this.position, HEIGHT)) this._crouched = false;

    if (input.jump && this.jumps < 2 && !this._crouched) {
      this._stopSlide();
      this._mantle = this._hook = null;
      this._dashTime = 0;
      this.velocity.y = JUMP;
      this.grounded = false;
      this.jumps++;
    }
    if (input.dash && this.stamina >= DASH_COST && this._dashTime <= 0 && !this._mantle) {
      this._stopSlide();
      this._hook = null;
      const direction = wish.lengthSq() > EPS ? wish.clone().normalize() : front;
      this._dashDirection = direction;
      this._dashTime = DASH_TIME;
      this.stamina -= DASH_COST;
      this._rechargeDelay = RECHARGE_DELAY;
    }
    if (slidePressed && this.grounded && !this._mantle && !this._hook && this._dashTime <= 0 &&
        this.velocity.dot(front) >= 6 * multiplier) {
      this._slideTime = SLIDE_TIME;
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      const boost = Math.max(speed, 13 * multiplier) / speed;
      this.velocity.x *= boost;
      this.velocity.z *= boost;
    }

    for (let left = dt; left > EPS;) {
      const h = Math.min(left, 1 / 120); left -= h;
      const wait = Math.min(h, this._rechargeDelay);
      this._rechargeDelay -= wait;
      this.stamina = clamp(this.stamina + RECHARGE * (h - wait), 0, 100);
      if (this._mantle) {
        const m = this._mantle;
        this._stopSlide();
        if (this.position.y < m.top - EPS) {
          if (this._move(0, Math.min(6 * h, m.top - this.position.y), 0)) this._mantle = null;
        } else {
          const dx = m.axis === 'x' ? m.sign * 5 * h : 0;
          const dz = m.axis === 'z' ? m.sign * 5 * h : 0;
          const blocked = this._move(dx, 0, dz);
          m.push -= h;
          if (blocked || m.push <= EPS) this._mantle = null;
        }
        continue;
      }
      if (this._hook) {
        const hook = this._hook, delta = hook.target.clone().sub(this.position);
        const distance = delta.length();
        this.velocity.copy(delta.normalize().multiplyScalar(Math.min(30 * multiplier, distance / h)));
        const blocked = this._move(this.velocity.x * h, this.velocity.y * h, this.velocity.z * h);
        hook.left -= h;
        if (blocked || distance < 0.5 || hook.left <= EPS) {
          this._hook = null;
          this.velocity.set(0, 0, 0);
        }
        continue;
      }
      const dashing = this._dashTime > EPS;
      if (dashing) {
        this.velocity.x = this._dashDirection.x * DASH_SPEED * multiplier;
        this.velocity.z = this._dashDirection.z * DASH_SPEED * multiplier;
        this._dashTime = Math.max(0, this._dashTime - h);
      } else if (this._slideTime > 0) {
        if (!this.grounded) this._stopSlide();
        else {
          this._slideTime = Math.max(0, this._slideTime - h);
          this.velocity.x *= Math.exp(-1.1 * h);
          this.velocity.z *= Math.exp(-1.1 * h);
          if (this._slideTime <= EPS || Math.hypot(this.velocity.x, this.velocity.z) < 3) this._stopSlide();
        }
      } else {
        const speed = (input.sprint && !this.aiming ? SPRINT : WALK) * multiplier * (this.aiming ? 0.7 : 1);
        const acceleration = (this.grounded ? 55 : 18) * h * multiplier;
        const targetX = wish.x * speed, targetZ = wish.z * speed;
        const dx = targetX - this.velocity.x, dz = targetZ - this.velocity.z;
        const length = Math.hypot(dx, dz), fraction = length > 0 ? Math.min(1, acceleration / length) : 0;
        this.velocity.x += dx * fraction;
        this.velocity.z += dz * fraction;
      }
      this.velocity.y -= GRAVITY * h;
      this._move(this.velocity.x * h, this.velocity.y * h, this.velocity.z * h,
        forward > 0 && !dashing && this._slideTime <= 0 && !this._crouched);
      if (!this.grounded && this._slideTime > 0) this._stopSlide();
    }
    this._setState(input);
    return this;
  }

  _setState(input) {
    if (this._mantle) this.state = 'mantle';
    else if (this._dashTime > EPS || this._hook) this.state = 'dash';
    else if (this._slideTime > 0) this.state = 'slide';
    else if (!this.grounded) this.state = this.velocity.y > 0 ? 'jump' : 'fall';
    else if (Math.hypot(this.velocity.x, this.velocity.z) > 0.15) this.state = input.sprint && !this.aiming ? 'sprint' : 'walk';
    else this.state = 'idle';
  }

  _cameraFraction(from, to) {
    let fraction = cameraFraction(from, to, this.boxes);
    // Terrain/ramps may exist only in the callback, not in the box array.
    // Sample the shortened boom, then bisect its first floor crossing.
    const count = Math.max(1, Math.ceil(from.distanceTo(to) * fraction / 0.1));
    const p = new THREE.Vector3();
    const aboveFloor = t => {
      p.lerpVectors(from, to, t);
      const floor = this.floorHeight(p.x, p.z, from.y + CAMERA_RADIUS);
      return !Number.isFinite(floor) || floor > from.y + CAMERA_RADIUS || p.y - CAMERA_RADIUS >= floor;
    };
    for (let i = 1; i <= count; i++) {
      const t = fraction * i / count;
      if (aboveFloor(t)) continue;
      let lo = fraction * (i - 1) / count, hi = t;
      for (let j = 0; j < 12; j++) {
        const mid = (lo + hi) / 2;
        if (aboveFloor(mid)) lo = mid; else hi = mid;
      }
      fraction = lo;
      break;
    }
    return fraction;
  }

  updateCamera(camera, dt = 0) {
    const blend = 1 - Math.exp(-14 * clamp(finite(dt), 0, 0.25));
    const forward = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    // Keep the sweep origin's whole sphere inside the body, including crouch
    // tunnels. A high eye point can already overlap an expanded ceiling box.
    const eyeHeight = Math.min(this.height * 0.85, this.height - CAMERA_RADIUS - 0.01);
    const eye = this.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
    const shoulder = eye.clone().add(new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(0.75));
    shoulder.lerpVectors(eye, shoulder, this._cameraFraction(eye, shoulder));
    const desired = shoulder.clone().addScaledVector(forward, this.aiming ? -3.3 : -5);
    desired.lerpVectors(shoulder, desired, this._cameraFraction(shoulder, desired));
    if (this._camera !== camera) {
      this._camera = camera;
      this._baseFov = finite(camera.fov, 70);
      this._cameraReady = false;
    }
    if (!this._cameraReady) camera.position.copy(desired);
    else camera.position.lerp(desired, blend);
    this._cameraReady = true;
    // Re-clamp after smoothing: a previous camera location may be behind cover
    // after the hero turns a corner. Also test the diagonal from the hero eye.
    camera.position.lerpVectors(shoulder, camera.position, this._cameraFraction(shoulder, camera.position));
    camera.position.lerpVectors(eye, camera.position, this._cameraFraction(eye, camera.position));
    camera.lookAt(eye.clone().addScaledVector(forward, 30));
    const targetFov = this.aiming ? this._baseFov * 0.74 : this._baseFov;
    camera.fov += (targetFov - camera.fov) * blend;
    camera.updateProjectionMatrix();
    return camera;
  }
}
