/*
 * Courtyard runner: classic script -> window.RunnerEngine; Node -> module.exports.
 * No DOM, assets, clock reads, or network. All distances are logical pixels.
 *
 * API:
 *   create(seed = 1) -> fresh mutable state, immediately playing.
 *   step(state, dtSeconds) -> same state; finite positive dt is capped at 1/30.
 *     Excess time is discarded (no catch-up); terminal states are untouched.
 *   input(state, 'left'|'right'|'jump'|'slide') -> whether action was accepted.
 *     Lane changes are immediate, including in the air/slide. Jump and slide
 *     cannot overlap or refresh; a short recovery follows either action.
 *     Restart by replacing state with create(seed), not by mutating status.
 *
 * Render contract (480 x 640, y increases toward player):
 *   status: 'playing'|'over'; time: simulated seconds; distance: pixels run;
 *   score: floor(distance/10) + avoided*25; speed: pixels/second (180..340).
 *   player: {lane: 0..2, x, y:536, jump, slide, cooldown}; timers are seconds
 *     remaining. Use jump/0.85 for a jump arc, slide>0 for a crouched pose.
 *   obstacles: [{id, rowId, lane, x, y, type, passed}]. Each prop moves down;
 *     'barrier' = low school hurdle (jump), 'frame' = overhead equipment frame
 *     (slide), 'planter' = solid courtyard planter (dodge). Never people.
 *     Draw props roughly 90px wide; collision is resolved once, when their
 *     center crosses player.y. Only the player's current lane is tested;
 *     jump/slide must still be active at that instant. passed props are safe.
 *   avoided: successfully passed individual props; collision: null or
 *     {obstacleId, lane, type, y}. The world freezes on collision.
 *   width, height mirror constants; fields beginning '_' are engine-private.
 *
 * Rows are 360px apart, contain 1..2 props and ALWAYS leave a lane clear.
 * First prop is a barrier in lane 1, initially at y=-48 (>3s reaction time).
 * At top speed rows remain >1s apart, longer than either action + recovery.
 * Speed rises with simulated time and caps; obstacles retire below the screen
 * (at most six active props). Same seed + inputs + time steps = same result.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RunnerEngine = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var C = Object.freeze({
    width: 480, height: 640, playerY: 536,
    laneCenters: Object.freeze([80, 240, 400]),
    spawnY: -48, rowSpacing: 360, maxStep: 1 / 30,
    minSpeed: 180, maxSpeed: 340,
    jumpDuration: 0.85, slideDuration: 0.75, recovery: 0.12
  });

  function random(state) {
    state._rng = (Math.imul(state._rng, 1664525) + 1013904223) >>> 0;
    return state._rng / 4294967296;
  }

  function addProp(state, rowId, lane, y, type) {
    state.obstacles.push({
      id: state._nextId++, rowId: rowId, lane: lane,
      x: C.laneCenters[lane], y: y, type: type, passed: false
    });
  }

  function spawnRow(state, y) {
    var rowId = state._nextRowId++;
    // A designated safe lane moves no more than one lane between rows.
    var safeOptions = [state._safeLane];
    if (state._safeLane > 0) safeOptions.push(state._safeLane - 1);
    if (state._safeLane < 2) safeOptions.push(state._safeLane + 1);
    state._safeLane = safeOptions[Math.floor(random(state) * safeOptions.length)];
    var blocked = [0, 1, 2].filter(function (lane) { return lane !== state._safeLane; });
    var count = random(state) < 0.75 ? 2 : 1;
    if (count === 1 && random(state) < 0.5) blocked.reverse();
    for (var i = 0; i < count; i++) {
      var roll = random(state);
      var type = roll < 0.4 ? 'barrier' : roll < 0.8 ? 'frame' : 'planter';
      addProp(state, rowId, blocked[i], y, type);
    }
  }

  function create(seed) {
    if (seed === undefined) seed = 1;
    var state = {
      width: C.width, height: C.height,
      status: 'playing', score: 0, time: 0, distance: 0,
      speed: C.minSpeed, avoided: 0, collision: null,
      player: {lane: 1, x: C.laneCenters[1], y: C.playerY, jump: 0, slide: 0, cooldown: 0},
      obstacles: [],
      _rng: Number.isFinite(seed) ? seed >>> 0 : 1,
      _nextId: 1, _nextRowId: 1, _nextRowDistance: C.rowSpacing,
      _safeLane: 0
    };
    state._safeLane = random(state) < 0.5 ? 0 : 2;
    addProp(state, 0, 1, C.spawnY, 'barrier');
    return state;
  }

  function input(state, action) {
    if (state.status !== 'playing') return false;
    var p = state.player;
    if (action === 'left' || action === 'right') {
      var next = Math.max(0, Math.min(2, p.lane + (action === 'left' ? -1 : 1)));
      if (next === p.lane) return false;
      p.lane = next;
      p.x = C.laneCenters[next];
      return true;
    }
    if ((action !== 'jump' && action !== 'slide') || p.cooldown > 0) return false;
    var duration = action === 'jump' ? C.jumpDuration : C.slideDuration;
    p[action] = duration;
    p.cooldown = duration + C.recovery;
    return true;
  }

  function step(state, dtSeconds) {
    if (state.status !== 'playing' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return state;
    var dt = Math.min(C.maxStep, dtSeconds);
    var p = state.player;
    var jumpBefore = p.jump;
    var slideBefore = p.slide;
    state.time += dt;
    state.speed = Math.min(C.maxSpeed, C.minSpeed + state.time * 1.5);
    var travel = state.speed * dt;
    state.distance += travel;
    p.jump = Math.max(0, p.jump - dt);
    p.slide = Math.max(0, p.slide - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);

    var crossed = [];
    state.obstacles.forEach(function (prop) {
      var previousY = prop.y;
      prop.y += travel;
      if (!prop.passed && previousY < p.y && prop.y >= p.y) {
        var crossingTime = (p.y - previousY) / state.speed;
        var protectedByAction = (prop.type === 'barrier' && jumpBefore > crossingTime) ||
          (prop.type === 'frame' && slideBefore > crossingTime);
        prop.passed = true;
        crossed.push(prop);
        if (prop.lane === p.lane && !protectedByAction) {
          state.status = 'over';
          state.collision = {obstacleId: prop.id, lane: prop.lane, type: prop.type, y: p.y};
        }
      }
    });
    if (state.status === 'playing') state.avoided += crossed.length;
    state.score = Math.floor(state.distance / 10) + state.avoided * 25;
    if (state.status !== 'playing') return state;

    state.obstacles = state.obstacles.filter(function (prop) { return prop.y <= C.height + 48; });
    // A capped step travels <=11.34px, so at most one new row is due per step.
    if (state.distance >= state._nextRowDistance) {
      spawnRow(state, C.spawnY + state.distance - state._nextRowDistance);
      state._nextRowDistance += C.rowSpacing;
    }
    return state;
  }

  return Object.freeze({create: create, step: step, input: input, constants: C});
}));
