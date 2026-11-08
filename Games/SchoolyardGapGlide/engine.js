/*
 * Offline courtyard glider. Classic script: window.FlyerEngine; Node: require().
 * API: create(seed=1) -> fresh mutable state; step(state, dtSeconds) -> state;
 * input(state, 'flap') -> true if accepted, false otherwise. No DOM or timers.
 * Call step from the UI animation loop with elapsed seconds. Each call consumes
 * at most 1/30 s (excess is discarded), subdivided to <=1/240 s. Pause by not
 * stepping. Restart by replacing state with create(seed). Terminal states freeze.
 *
 * Coordinates are world pixels, 480x640, origin top-left, positive y downward.
 * State: {width,height,status:'playing'|'over',score,time,speed,player,gates,
 *         reason:null|'floor'|'ceiling'|'gate',hitGateId,flapCooldown,...}.
 * player={x,y,vy,r}: circle center, vertical pixels/second, radius. x is fixed.
 * gates=[{id,x,width,center,gap,passed,base,amplitude,phase,omega}]: x is LEFT
 * edge, center is CURRENT gap midpoint; draw solid rectangles from y=0 to
 * center-gap/2 and from center+gap/2 to height. Gates scroll left; gap center
 * oscillates in world time. Score increments once the whole player clears one.
 * speed is positive pixels/second. time advances only during play. rng/nextId
 * are internal seeded generation state; seed is the normalized unsigned seed.
 *
 * Flap sets vy=-300 (never additive), with 0.12 s cooldown. Gravity=900,
 * downward speed capped at 430. Contact with ground, ceiling, or a gate ends
 * play. No win condition: survive and score. First gate starts offscreen with
 * >2.5 s reaction room. Speed rises 150..215; newly generated gaps narrow
 * 224..188. Neighboring base centers differ by <=40, oscillations <=24 px,
 * so even at top speed transitions have >1.2 s and <=88 px center difference.
 * Render the fictional avatar centered on player, not at its upper-left.
 */
(function (root) {
  'use strict';

  var WIDTH = 480;
  var HEIGHT = 640;
  var SPACING = 300;
  var GATE_WIDTH = 62;
  var EPSILON = 1e-10;

  function random(state) {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 4294967296;
  }

  function addGate(state, x) {
    var last = state.gates[state.gates.length - 1];
    var base = last ? Math.max(235, Math.min(405,
      last.base + (random(state) * 2 - 1) * 40)) : 320;
    var gate = {
      id: state.nextId++, x: x, width: GATE_WIDTH,
      base: base, gap: 224 - Math.min(state.score, 18) * 2,
      amplitude: 18 + Math.min(state.score, 12) * 0.5,
      phase: random(state) * Math.PI * 2, omega: 0.75,
      center: base, passed: false
    };
    gate.center = base + Math.sin(state.time * gate.omega + gate.phase) * gate.amplitude;
    state.gates.push(gate);
  }

  function create(seed) {
    seed = seed === undefined ? 1 : seed;
    seed = typeof seed === 'number' && Number.isFinite(seed) ? seed >>> 0 : 1;
    var state = {
      width: WIDTH, height: HEIGHT, seed: seed, rng: seed, nextId: 1,
      status: 'playing', score: 0, time: 0, speed: 150,
      reason: null, hitGateId: null, flapCooldown: 0,
      player: { x: 120, y: 320, vy: 0, r: 14 }, gates: []
    };
    addGate(state, 560);
    addGate(state, 560 + SPACING);
    addGate(state, 560 + SPACING * 2);
    return state;
  }

  function input(state, action) {
    if (state.status !== 'playing' || action !== 'flap' || state.flapCooldown > EPSILON) {
      return false;
    }
    state.player.vy = -300;
    state.flapCooldown = 0.12;
    return true;
  }

  function end(state, reason, gate) {
    state.status = 'over';
    state.reason = reason;
    state.hitGateId = gate ? gate.id : null;
  }

  // Circle/rectangle contact, including rounded clearance at gate corners.
  function touchesRect(player, left, top, right, bottom) {
    var dx = player.x - Math.max(left, Math.min(right, player.x));
    var dy = player.y - Math.max(top, Math.min(bottom, player.y));
    return dx * dx + dy * dy <= player.r * player.r;
  }

  function advance(state, dt) {
    var p = state.player;
    state.time += dt;
    state.flapCooldown = Math.max(0, state.flapCooldown - dt);
    state.speed = 150 + Math.min(state.score * 3, 65);
    var nextVy = Math.min(430, p.vy + 900 * dt);
    p.y += (p.vy + nextVy) * 0.5 * dt;
    p.vy = nextVy;
    state.gates.forEach(function (gate) {
      gate.x -= state.speed * dt;
      gate.center = gate.base + Math.sin(state.time * gate.omega + gate.phase) * gate.amplitude;
    });

    if (p.y - p.r <= 0) {
      p.y = p.r;
      end(state, 'ceiling');
      return;
    }
    if (p.y + p.r >= HEIGHT) {
      p.y = HEIGHT - p.r;
      end(state, 'floor');
      return;
    }
    for (var i = 0; i < state.gates.length; i++) {
      var gate = state.gates[i];
      if (touchesRect(p, gate.x, 0, gate.x + gate.width, gate.center - gate.gap / 2) ||
          touchesRect(p, gate.x, gate.center + gate.gap / 2, gate.x + gate.width, HEIGHT)) {
        end(state, 'gate', gate);
        return;
      }
    }
    state.gates.forEach(function (gate) {
      if (!gate.passed && gate.x + gate.width < p.x - p.r) {
        gate.passed = true;
        state.score++;
      }
    });
    while (state.gates.length && state.gates[0].x + state.gates[0].width < 0) {
      state.gates.shift();
    }
    var last = state.gates[state.gates.length - 1];
    if (!last || last.x < WIDTH + SPACING) {
      addGate(state, last ? last.x + SPACING : WIDTH + SPACING);
    }
  }

  function step(state, dtSeconds) {
    if (state.status !== 'playing' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return state;
    var remaining = Math.min(dtSeconds, 1 / 30);
    while (remaining > EPSILON && state.status === 'playing') {
      var dt = Math.min(remaining, 1 / 240);
      advance(state, dt);
      remaining -= dt;
    }
    return state;
  }

  var api = { create: create, step: step, input: input, WIDTH: WIDTH, HEIGHT: HEIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FlyerEngine = api;
}(typeof window !== 'undefined' ? window : null));
