// Pure, active-room games. The controller owns input, clocks, health and rewards.
const KEYS = ['x', 'y', 'up'];
export const WORKOUT_KINDS = Object.freeze(['bench', 'treadmill', 'curls', 'rower']);
export const isWorkoutKind = kind => WORKOUT_KINDS.includes(kind);
const KINDS = new Set([...WORKOUT_KINDS, 'noodle', 'stock', 'tv', 'cooking', 'rest', 'arcade']);
const WORKOUTS = {
  treadmill: { target: 12, prepare: .4, window: .85, motion: .25 },
  curls: { target: 6, prepare: .8, window: 1.15, motion: .55 },
  rower: { target: 6, prepare: .7, window: 1.1, motion: .55 },
};
const TERMINAL = new Set(['complete', 'failed', 'cancelled']);
const KEY_LABEL = { x: 'X', y: 'Y', up: 'ArrowUp' };
const RECIPES = {
  noodle: ['x', 'y', 'up', 'x', 'up', 'y'],
  cooking: ['x', 'x', 'y', 'up', 'y', 'up'],
  stock: ['x', 'up', 'y', 'x'],
};
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const clamp = n => Math.max(0, Math.min(1, n));
const heldKeys = input => Object.fromEntries(KEYS.map(key => [key, input?.[key] === true]));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createInteriorActivities() {
  let stations = [], planId = null, session = null, serial = 0;
  let previous = heldKeys(null);
  const events = [];
  const running = () => Boolean(session && !TERMINAL.has(session.phase));
  function finish(type, reason) {
    if (!running()) return false;
    session.phase = type === 'cancel' ? 'cancelled' : type;
    session.reason = reason;
    session.lift = 0;
    events.push({ type, reason, id: session.station.id, kind: session.kind,
      planId, sessionId: session.sessionId, score: session.score, reps: session.reps,
      sandbox: session.sandbox, station: { ...session.station },
      ...(type === 'complete' && session.kind === 'rest' ? { heal: 20 } : {}) });
    return true;
  }
  function cancel(reason = 'cancelled') { return finish('cancel', reason); }
  function load(plan) {
    cancel('room-changed');
    planId = plan?.id ?? null;
    const ids = new Set();
    stations = (Array.isArray(plan?.activities) ? plan.activities : []).filter(station => {
      if (!station || typeof station.id !== 'string' || !station.id || ids.has(station.id) ||
          !KINDS.has(station.kind) || !finitePoint(station)) return false;
      ids.add(station.id); return true;
    }).map(station => Object.freeze({ id: station.id, kind: station.kind,
      label: typeof station.label === 'string' ? station.label : station.kind,
      x: station.x, z: station.z, yaw: Number.isFinite(station.yaw) ? station.yaw : 0,
      radius: Number.isFinite(station.radius) && station.radius > 0 ? station.radius : 1.8 }));
    session = null; previous = heldKeys(null);
    return stations.length;
  }
  function nearest(pose) {
    if (!finitePoint(pose)) return null;
    let best = null, bestDistance = Infinity;
    for (const station of stations) {
      const d = distance(pose, station);
      if (d <= station.radius && d < bestDistance) { best = station; bestDistance = d; }
    }
    return best ? { ...best } : null;
  }
  function invalidContext(station, context) {
    if (context?.recovering) return 'recovery';
    if (context?.onFoot !== true) return 'not-on-foot';
    if (!Number.isFinite(context?.wanted) || context.wanted > 0) return 'wanted';
    if (!finitePoint(context?.pose) || distance(context.pose, station) > station.radius) return 'left-station';
    if (running() && Boolean(context.sandbox) !== session.sandbox) return 'mode-changed';
    return null;
  }
  function start(id, context) {
    const station = stations.find(item => item.id === id);
    if (running() || !station || invalidContext(station, context)) return false;
    const kind = station.kind;
    session = { station, sessionId: ++serial, kind, label: station.label,
      phase: kind === 'bench' ? 'grip' : kind === 'stock' ? 'memorise' : kind === 'rest' ? 'rest' :
        isWorkoutKind(kind) || kind === 'tv' || kind === 'arcade' ? 'prepare' : 'recipe',
      phaseTime: 0, elapsed: 0, progress: 0, reps: 0, lift: 0, score: 0,
      mistakes: 0, reason: null, index: 0, hits: 0, sandbox: Boolean(context.sandbox),
      duration: kind === 'rest' ? 8 : isWorkoutKind(kind) ? 60 : 40 };
    previous = heldKeys(null);
    return true;
  }
  function mistake(reason) {
    session.mistakes++;
    session.reason = reason;
    session.score = Math.max(0, session.score - 10);
    if (session.mistakes >= 3) finish('failed', reason);
  }
  function bench(dt, held, edges) {
    const s = session;
    if (!held.x || !held.y) {
      if (s.phase !== 'grip') mistake('Grip released. Hold X and Y together.');
      else if (edges.up) mistake('Hold X and Y before waiting for the LIFT cue.');
      if (running()) { s.phase = 'grip'; s.phaseTime = 0; s.lift = 0; }
      return;
    }
    if (s.phase === 'grip') { s.phase = 'prepare'; s.phaseTime = 0; }
    else s.phaseTime += dt;
    if (s.phase === 'prepare' && s.phaseTime >= 1) { s.phase = 'cue'; s.phaseTime -= 1; }
    if (s.phase === 'lift') {
      s.lift = Math.max(0, 1 - s.phaseTime / 0.55);
      if (s.phaseTime >= 0.55) {
        s.lift = 0;
        if (s.reps === 6) { finish('complete', 'Six controlled repetitions.'); return; }
        s.phase = 'prepare'; s.phaseTime = 0;
      }
      // Repeated presses while the bar returns cannot award another repetition.
      if (edges.up && running()) mistake('Wait for the next LIFT cue.');
      return;
    }
    if (s.phase === 'cue' && s.phaseTime > 1.05) {
      mistake('Too late. Wait for the next LIFT cue.');
      if (running()) { s.phase = 'prepare'; s.phaseTime = 0; }
      return;
    }
    if (edges.up) {
      if (s.phase !== 'cue') {
        mistake('Too early. Wait for LIFT, then press ArrowUp.');
        if (running()) { s.phase = 'prepare'; s.phaseTime = 0; }
      } else {
        s.reps++; s.score += 100; s.progress = s.reps / 6;
        s.phase = 'lift'; s.phaseTime = 0; s.lift = 1; s.reason = null;
      }
    }
  }
  function workoutMistake(reason) {
    mistake(reason);
    if (running()) { session.phase = 'release'; session.phaseTime = 0; session.lift = 0; }
  }
  function awardWorkoutRep() {
    const s = session;
    s.reps++; s.score += 100; s.progress = s.reps / WORKOUTS[s.kind].target; s.reason = null;
  }
  function workout(dt, held, edges) {
    const s = session, rules = WORKOUTS[s.kind];
    const pressed = KEYS.filter(key => edges[key]), released = !KEYS.some(key => held[key]);
    s.phaseTime += dt;
    if (s.phase === 'release') {
      if (released) {
        if (s.kind !== 'treadmill' && s.lift === 1) awardWorkoutRep();
        s.phase = 'return'; s.phaseTime = 0;
      } else if (s.phaseTime > 1.2) workoutMistake('Release all keys before the next movement.');
      return;
    }
    if (s.phase === 'return') {
      s.lift = Math.max(0, s.lift - dt / .4);
      if (pressed.length) { workoutMistake('Too early. Release and wait for the next cue.'); return; }
      if (s.phaseTime >= .4) {
        if (s.reps === rules.target) { finish('complete', `${rules.target} controlled ${s.kind === 'treadmill' ? 'steps' : s.kind === 'rower' ? 'strokes' : 'curls'}.`); return; }
        s.phase = 'prepare'; s.phaseTime = 0; s.lift = 0;
      }
      return;
    }
    if (s.phase === 'drive' || s.phase === 'lift' || s.phase === 'stride') {
      if (s.kind === 'rower' && (!held.x || !held.y || held.up)) {
        workoutMistake('Keep X + Y held through DRIVE, then release at RETURN.'); return;
      }
      if (s.kind === 'curls' && (!held[s.reps % 2 ? 'y' : 'x'] || KEYS.some(key => key !== (s.reps % 2 ? 'y' : 'x') && held[key]))) {
        workoutMistake('Keep the cued curl key held through the lift. Release at RETURN.'); return;
      }
      if (pressed.length) { workoutMistake('Wait for the next cue before pressing again.'); return; }
      s.lift = s.kind === 'treadmill' ? Math.max(0, 1 - s.phaseTime / rules.motion) : clamp(s.phaseTime / rules.motion);
      if (s.phaseTime >= rules.motion) {
        s.phase = 'release'; s.phaseTime = 0; s.lift = s.kind === 'treadmill' ? 0 : 1;
      }
      return;
    }
    if (s.phase === 'prepare' && s.phaseTime >= rules.prepare) { s.phase = 'cue'; s.phaseTime -= rules.prepare; }
    if (s.phase === 'cue' && s.phaseTime > rules.window) { workoutMistake('Missed cue. Release all keys and try the movement again.'); return; }
    if (!pressed.length) return;
    if (s.phase !== 'cue') { workoutMistake('Too early. Wait for the movement cue.'); return; }
    if (s.kind === 'rower') {
      if (held.up) { workoutMistake('Use X + Y together for the rowing handle.'); return; }
      // The two grip keys may arrive on neighbouring frames; neither alone can score.
      if (!held.x || !held.y) return;
      s.phase = 'drive'; s.phaseTime = 0; s.lift = 0; s.reason = null;
    } else {
      const expected = s.reps % 2 ? 'y' : 'x';
      if (pressed.length !== 1 || pressed[0] !== expected || KEYS.some(key => key !== expected && held[key])) {
        workoutMistake(`Use only ${KEY_LABEL[expected]} at this cue. Release the other keys.`); return;
      }
      if (s.kind === 'treadmill') awardWorkoutRep();
      s.phase = s.kind === 'curls' ? 'lift' : 'stride'; s.phaseTime = 0; s.lift = s.kind === 'curls' ? 0 : 1;
    }
  }
  function sequence(dt, edges) {
    const s = session, recipe = RECIPES[s.kind];
    if (s.phase === 'memorise') {
      s.phaseTime += dt;
      if (s.phaseTime >= 3.5) { s.phase = 'repeat'; s.phaseTime = 0; }
      return;
    }
    const pressed = KEYS.filter(key => edges[key]);
    if (!pressed.length) return;
    if (pressed.length !== 1 || pressed[0] !== recipe[s.index]) {
      mistake('Wrong item. Read the order and try again.');
      if (running()) { s.index = 0; s.progress = 0; s.score = 0; if (s.kind === 'stock') { s.phase = 'memorise'; s.phaseTime = 0; } }
      return;
    }
    s.index++; s.score = Math.max(0, s.index * 50 - s.mistakes * 10); s.progress = s.index / recipe.length; s.reason = null;
    if (s.index === recipe.length) finish('complete', s.kind === 'stock' ? 'Stock order matched.' : 'Order served.');
  }
  function reflex(dt, edges) {
    const s = session, target = s.kind === 'arcade' ? 8 : 5;
    s.phaseTime += dt;
    const wait = s.kind === 'arcade' ? 0.65 + (s.hits % 3) * 0.2 : 1;
    if (s.phase === 'prepare' && s.phaseTime >= wait) { s.phase = 'cue'; s.phaseTime -= wait; }
    if (s.phase === 'cue' && s.phaseTime > 1) {
      mistake('Missed signal. Wait for GO.');
      if (running()) { s.phase = 'prepare'; s.phaseTime = 0; }
      return;
    }
    if (!edges.up) return;
    if (s.phase !== 'cue') mistake('Too early. Press ArrowUp only at GO.');
    else { s.hits++; s.score += 100; s.progress = s.hits / target; s.reason = null; }
    if (running()) {
      if (s.hits === target) finish('complete', 'All signals matched.');
      else { s.phase = 'prepare'; s.phaseTime = 0; }
    }
  }
  function step(dt, input, context) {
    const held = heldKeys(input), edges = Object.fromEntries(KEYS.map(key => [key, held[key] && !previous[key]]));
    previous = held;
    if (!running()) return snapshot();
    const invalid = invalidContext(session.station, context);
    if (invalid) { cancel(invalid); return snapshot(); }
    // Paused keys update the edge history so holding a key through pause is not a new press.
    if (!Number.isFinite(dt) || dt <= 0) return snapshot();
    const s = session;
    s.elapsed += dt;
    if (s.kind === 'rest') {
      s.progress = clamp(s.elapsed / s.duration);
      if (s.elapsed >= s.duration) { s.score = 100; finish('complete', 'Rested for eight seconds.'); }
    } else if (s.elapsed >= s.duration) finish('failed', 'Time ran out. Try again.');
    else if (s.kind === 'bench') bench(dt, held, edges);
    else if (WORKOUTS[s.kind]) workout(dt, held, edges);
    else if (RECIPES[s.kind]) sequence(dt, edges);
    else reflex(dt, edges);
    return snapshot();
  }
  function prompt() {
    const s = session;
    if (!s) return 'Walk to an activity station.';
    if (s.phase === 'complete') return `${s.reason} Score ${s.score}. Q to play again.`;
    if (s.phase === 'failed') return `${s.reason} Q to retry. E cancels.`;
    if (s.phase === 'cancelled') return 'Activity cancelled. Q to retry at the station.';
    if (s.kind === 'bench') return `Hold X + Y. ${s.phase === 'cue' ? 'LIFT: press ArrowUp now!' :
      s.phase === 'lift' ? 'Keep holding while the bar returns.' : 'Wait for the LIFT cue, then press ArrowUp.'} ${s.reps}/6 reps. ${s.mistakes}/3 mistakes.`;
    if (WORKOUTS[s.kind]) return `${s.reason ? `${s.reason} ` : ''}${instruction()} ${s.reps}/${WORKOUTS[s.kind].target} ${s.kind === 'treadmill' ? 'steps' : s.kind === 'rower' ? 'strokes' : 'curls'}. ${s.mistakes}/3 mistakes. E stops.`;
    if (s.kind === 'rest') return `Rest here for ${Math.max(0, s.duration - s.elapsed).toFixed(1)} seconds. Moving away cancels.`;
    if (s.kind === 'stock') return s.phase === 'memorise' ?
      `Remember: ${RECIPES.stock.map(key => KEY_LABEL[key]).join(', ')}. Release each key between presses.` :
      `Repeat: ${RECIPES.stock.map(key => KEY_LABEL[key]).join(', ')}. ${s.index}/4 items. ${s.mistakes}/3 mistakes. Release between presses.`;
    if (RECIPES[s.kind]) return `${s.kind === 'noodle' ? 'Serve noodles' : 'Cook a meal'}: ${RECIPES[s.kind].map((key, i) => `${i < s.index ? 'done' : KEY_LABEL[key]}`).join(', ')}. X chop, Y add, ArrowUp serve. Release between presses.`;
    return `${s.phase === 'cue' ? 'GO! Press ArrowUp now.' : 'Wait for GO, then press ArrowUp.'} ${s.hits}/${s.kind === 'arcade' ? 8 : 5} signals. ${s.mistakes}/3 mistakes.`;
  }
  function instruction() {
    const s = session;
    if (!s || !running()) return '';
    if (s.kind === 'bench') return s.phase === 'grip' ? 'Hold X + Y together to grip the bar.' : s.phase === 'cue' ? 'LIFT: keep X + Y held and press ArrowUp once.' : 'Keep X + Y held. Wait for LIFT.';
    if (!WORKOUTS[s.kind]) return '';
    if (s.phase === 'release') return 'RETURN: release all keys now.';
    if (s.phase === 'return') return 'Hands clear. Let the equipment return.';
    if (s.kind === 'rower') return s.phase === 'drive' ? 'DRIVE: keep X + Y held until RETURN.' : s.phase === 'cue' ? 'PULL: press and hold X + Y together.' : 'Hands clear. Wait for PULL, then hold X + Y.';
    const key = KEY_LABEL[s.reps % 2 ? 'y' : 'x'];
    if (s.phase === 'lift') return `Hold ${key} through the curl. Release at RETURN.`;
    if (s.phase === 'stride') return 'Step landed. Release the key for the next foot.';
    return s.phase === 'cue' ? s.kind === 'curls' ? `CURL: press and hold ${key}.` : `STEP: press ${key} once.` : `Hands clear. Wait for ${s.kind === 'treadmill' ? 'STEP' : 'CURL'}, then ${s.kind === 'curls' ? 'hold' : 'press'} ${key}.`;
  }
  function snapshot() {
    const s = session;
    const sequence = s ? RECIPES[s.kind] ?? (s.kind === 'bench' ? Array(6).fill('up') : WORKOUTS[s.kind] ? Array.from({length: WORKOUTS[s.kind].target}, (_, i) => s.kind === 'rower' ? 'xy' : i % 2 ? 'y' : 'x') :
      s.kind === 'tv' || s.kind === 'arcade' ? Array(s.kind === 'arcade' ? 8 : 5).fill('up') : []) : [];
    const index = s ? RECIPES[s.kind] ? s.index : isWorkoutKind(s.kind) ? s.reps : s.hits : 0;
    const cue = s?.phase === 'cue';
    const cueWindow = s?.kind === 'bench' ? 1.05 : WORKOUTS[s?.kind]?.window ?? (s?.kind === 'tv' || s?.kind === 'arcade' ? 1 : 0);
    const expectedKey = running() ? sequence[index] ?? null : null;
    return { active: running(), planId, sessionId: s?.sessionId ?? null,
      kind: s?.kind ?? null, label: s?.label ?? '', phase: s?.phase ?? 'idle', prompt: prompt(),
      sequence: Object.freeze([...sequence]), index,
      expectedKey, inputKeys: Object.freeze(!running() ? [] : s.kind === 'bench' ? ['x', 'y', 'up'] : s.kind === 'rower' ? ['x', 'y'] : expectedKey ? [expectedKey] : []),
      instruction: instruction(), exercisePose: isWorkoutKind(s?.kind) ? s.kind : null,
      cue, memorising: s?.phase === 'memorise', requiresGrip: s?.kind === 'bench' || s?.kind === 'rower' && s.phase === 'drive',
      acceptsInput: running() && (cue || s.phase === 'recipe' || s.phase === 'repeat' || s.phase === 'release'),
      cueWindow, cueRemaining: cue ? Math.max(0, cueWindow - s.phaseTime) : 0,
      progress: s?.progress ?? 0, reps: s?.reps ?? 0, lift: s?.lift ?? 0, score: s?.score ?? 0,
      remaining: s ? Math.max(0, s.duration - s.elapsed) : 0, mistakes: s?.mistakes ?? 0,
      reason: s?.reason ?? null, sandbox: s?.sandbox ?? false,
      station: s ? { ...s.station } : null, stations: stations.map(station => ({ ...station })) };
  }
  function clear() { cancel('room-cleared'); stations = []; planId = null; session = null; previous = heldKeys(null); }
  return { load, nearest, start, step, cancel, clear, snapshot,
    drainEvents: () => events.splice(0).map(event => ({ ...event, station: { ...event.station } })) };
}
