/*
 * Courtyard launcher: dependency-free, deterministic, 960 x 600 world (pixels).
 * Classic script: window.LauncherEngine; Node: require('./engine.js'). No DOM.
 *
 * API:
 *   create(seed=1) -> mutable state, always level 1, status 'playing'. Layouts
 *     are fixed, not randomized; seed is retained for replay metadata only.
 *   step(state, dtSeconds) -> state. Finite positive dt is capped at 1/30;
 *     terminal states are frozen. Call once per animation frame, not per ms.
 *   input(state, 'launch', vx, vy) -> boolean accepted. Only while playing,
 *     projectile inactive, shotsRemaining > 0. Velocity is pixels/second;
 *     right is positive x, up is negative y. Left/down components clamp to 0;
 *     zero/nonfinite aim is rejected without spending a shot. Direction is
 *     preserved while power clamps to [160,850], even for huge finite input.
 *   input(state, 'next') -> boolean: advance a won level, retaining score/time.
 *     Last level stays won; restart/retry with create(seed), no reset action.
 *   levelCount = 3. No listeners, timers, randomness, or runtime dependencies.
 *
 * Render state (do not mutate while playing):
 *   width,height,groundY=540,gravity=600; anchor={x:145,y:420}; level (1-based),
 *   levelCount,levelName; status='playing'|'won'|'over'; score,time (simulated
 *   playing seconds); shotsRemaining,shotsTotal,shotNumber (current level).
 *   projectile={x,y,vx,vy,r:12,active,age}. Inactive initially at anchor; after
 *   flight it remains at its last position until the next accepted launch.
 *   targets=[{id,kind:'locker'|'frame',x,y,w,h,hp,maxHp,broken,lastHitShot}].
 *     Rectangles use top-left coordinates; broken targets stay in the array.
 *     Blue lockers and structural frames are the ONLY collision bodies.
 *     Raised fixtures are static, not falling stacks. Spectators belong only
 *     in the UI's protected area, not in this engine's physics world.
 *   minPower,maxPower expose aim constraints for UI. A preview can integrate
 *   x += vx*h; vy += gravity*h; y += vy*h at h=1/240 (until first collision).
 *
 * Physics: adaptive substeps limit travel to < half a projectile radius;
 * circle/rectangle collision with surface-normal bounce. Each body can take
 * one hit per shot: impact normal speed >=80 chips 1 hp, >=300 chips 2 hp.
 * Broken bodies let the projectile through at 90% speed; intact ones bounce.
 * Ground bounces/friction, out-of-world travel or 8s flight settle the shot.
 * 'over' is set ONLY after the last shot settles, never immediately on launch.
 * All bodies broken wins immediately. Damage earns 100/hp, breaking earns 100,
 * and a win earns 300 + 50 per unused shot. No time penalty or hidden RNG.
 *
 * QA winning (vx,vy) sequences, waiting for each shot to settle:
 *   Level 1: (500,-225) sweeps the row.
 *   Level 2: (550,-200) clears low bodies; (400,-500) clears the high frame.
 *   Level 3: (600,-150), (400,-500), (400,-275) clear the mixed-height set.
 * Each level has one more shot than bodies; strong arcs can break several.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LauncherEngine = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var WIDTH = 960, HEIGHT = 600, GROUND = 540, GRAVITY = 600;
  var RADIUS = 12, MIN_POWER = 160, MAX_POWER = 850;
  var LEVELS = [
    { name: 'Courtyard row', shots: 4, targets: [
      ['frame', 475, 410, 26, 130, 1],
      ['locker', 620, 444, 48, 96, 2],
      ['locker', 775, 420, 52, 120, 2]
    ] },
    { name: 'Hanging fixtures', shots: 5, targets: [
      ['frame', 430, 370, 24, 170, 1],
      ['locker', 560, 450, 50, 90, 2],
      ['frame', 695, 300, 30, 110, 1],
      ['locker', 810, 432, 50, 108, 2]
    ] },
    { name: 'Upper courtyard', shots: 6, targets: [
      ['frame', 390, 420, 26, 120, 1],
      ['locker', 520, 460, 48, 80, 2],
      ['frame', 610, 265, 100, 24, 1],
      ['locker', 735, 355, 50, 100, 2],
      ['locker', 840, 435, 52, 105, 2]
    ] }
  ];

  function loadLevel(state, index) {
    var spec = LEVELS[index];
    state.level = index + 1;
    state.levelName = spec.name;
    state.status = 'playing';
    state.shotsRemaining = state.shotsTotal = spec.shots;
    state.shotNumber = 0;
    state.projectile = { x: state.anchor.x, y: state.anchor.y,
      vx: 0, vy: 0, r: RADIUS, active: false, age: 0 };
    state.targets = spec.targets.map(function (t, i) {
      return { id: 'L' + state.level + '-' + i, kind: t[0],
        x: t[1], y: t[2], w: t[3], h: t[4], hp: t[5], maxHp: t[5],
        broken: false, lastHitShot: 0 };
    });
  }

  function create(seed) {
    var state = { seed: seed === undefined ? 1 : seed, width: WIDTH,
      height: HEIGHT, groundY: GROUND, gravity: GRAVITY,
      anchor: { x: 145, y: 420 }, levelCount: LEVELS.length,
      minPower: MIN_POWER, maxPower: MAX_POWER, score: 0, time: 0 };
    loadLevel(state, 0);
    return state;
  }

  function input(state, action, vx, vy) {
    if (action === 'next') {
      if (state.status !== 'won' || state.level >= LEVELS.length) return false;
      loadLevel(state, state.level);
      return true;
    }
    if (action !== 'launch' || state.status !== 'playing' ||
        state.projectile.active || state.shotsRemaining <= 0 ||
        !Number.isFinite(vx) || !Number.isFinite(vy)) return false;
    vx = Math.max(0, vx);
    vy = Math.min(0, vy);
    var scale = Math.max(vx, -vy);
    if (!scale) return false;
    // Normalize before computing length to avoid overflow for finite input.
    var nx = vx / scale, ny = vy / scale;
    var length = Math.hypot(nx, ny);
    var power = Math.max(MIN_POWER, Math.min(MAX_POWER, scale * length));
    var p = state.projectile;
    p.x = state.anchor.x;
    p.y = state.anchor.y;
    p.vx = nx / length * power;
    p.vy = ny / length * power;
    p.active = true;
    p.age = 0;
    state.shotsRemaining -= 1;
    state.shotNumber += 1;
    return true;
  }

  function settle(state) {
    state.projectile.active = false;
    state.projectile.vx = state.projectile.vy = 0;
    if (state.shotsRemaining === 0) state.status = 'over';
  }

  function collide(state, target) {
    var p = state.projectile;
    var cx = Math.max(target.x, Math.min(target.x + target.w, p.x));
    var cy = Math.max(target.y, Math.min(target.y + target.h, p.y));
    var dx = p.x - cx, dy = p.y - cy;
    var distance = Math.hypot(dx, dy);
    if (distance >= p.r) return;
    var nx, ny, depth;
    if (distance > 0) {
      nx = dx / distance;
      ny = dy / distance;
      depth = p.r - distance;
    } else {
      // Robust ejection if a circle center is inside a rectangle.
      var sides = [p.x - target.x, target.x + target.w - p.x,
        p.y - target.y, target.y + target.h - p.y];
      var side = sides.indexOf(Math.min.apply(null, sides));
      nx = side === 0 ? -1 : side === 1 ? 1 : 0;
      ny = side === 2 ? -1 : side === 3 ? 1 : 0;
      depth = p.r + sides[side];
    }
    var normalVelocity = p.vx * nx + p.vy * ny;
    var impact = -normalVelocity;
    if (impact >= 80 && target.lastHitShot !== state.shotNumber) {
      target.lastHitShot = state.shotNumber;
      var damage = Math.min(target.hp, impact >= 300 ? 2 : 1);
      target.hp -= damage;
      state.score += damage * 100;
      if (target.hp === 0) {
        target.broken = true;
        state.score += 100;
        p.vx *= 0.9;
        p.vy *= 0.9;
        return;
      }
    }
    p.x += nx * (depth + 0.01);
    p.y += ny * (depth + 0.01);
    if (normalVelocity < 0) {
      p.vx = (p.vx - 1.45 * normalVelocity * nx) * 0.96;
      p.vy = (p.vy - 1.45 * normalVelocity * ny) * 0.96;
    }
  }

  function advance(state, dt) {
    var p = state.projectile;
    p.age += dt;
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (var i = 0; i < state.targets.length; i += 1) {
      if (!state.targets[i].broken) collide(state, state.targets[i]);
    }
    if (state.targets.every(function (t) { return t.broken; })) {
      state.status = 'won';
      state.score += 300 + 50 * state.shotsRemaining;
      p.active = false;
      return;
    }
    if (p.y + p.r >= GROUND && p.vy >= 0) {
      p.y = GROUND - p.r;
      if (p.vy > 65) {
        p.vy *= -0.30;
        p.vx *= 0.78;
      } else {
        p.vy = 0;
        p.vx *= Math.max(0, 1 - 6 * dt);
      }
      if (Math.abs(p.vx) < 35 && Math.abs(p.vy) < 35) settle(state);
    }
    if (p.x < -p.r * 4 || p.x > WIDTH + p.r * 4 ||
        p.y > HEIGHT + p.r || p.age >= 8) settle(state);
  }

  function step(state, dtSeconds) {
    if (state.status !== 'playing' || !Number.isFinite(dtSeconds) ||
        dtSeconds <= 0) return state;
    var remaining = Math.min(dtSeconds, 1 / 30);
    while (remaining > 1e-10 && state.status === 'playing') {
      var p = state.projectile;
      var dt = Math.min(remaining, 1 / 240,
        p.r * 0.45 / Math.max(1, Math.hypot(p.vx, p.vy) + GRAVITY / 240));
      state.time += dt;
      if (p.active) advance(state, dt);
      remaining -= dt;
    }
    return state;
  }

  return { create: create, step: step, input: input, levelCount: LEVELS.length };
}));
