// Supplied-clock lock challenges. The controller owns admission, claims and offences.
const KEYS = ['x', 'y', 'up'];
const LABELS = { x: 'X', y: 'Y', up: 'ArrowUp' };
const RULES = {
  scooter: { length: 4, cue: 1.4, prepare: 0.38, duration: 20, maxMistakes: 3 },
  car: { length: 8, cue: 1, prepare: 0.38, duration: 24, maxMistakes: 2 },
};
const TERMINAL = new Set(['complete', 'failed', 'cancelled']);
const heldKeys = input => Object.fromEntries(KEYS.map(key => [key, input?.[key] === true]));
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
function makeSequence(kind, targetId, serial) {
  let seed = 2166136261;
  for (const char of `${kind}:${targetId}:${serial}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return Array.from({ length: RULES[kind].length }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return KEYS[seed % KEYS.length];
  });
}

export function createVehicleChallenge() {
  let session = null, serial = 0, previous = heldKeys(null);
  const events = [];
  const running = () => Boolean(session && !TERMINAL.has(session.phase));
  function finish(type, reason) {
    if (!running()) return false;
    session.phase = type === 'cancel' ? 'cancelled' : type;
    session.reason = reason;
    events.push(Object.freeze({ type, reason, sessionId: session.sessionId,
      kind: session.kind, targetId: session.targetId, sandbox: session.sandbox,
      anchor: Object.freeze({ ...session.anchor }) }));
    return true;
  }
  function cancel(reason = 'cancelled') { return finish('cancel', String(reason)); }
  function start(kind, options) {
    if (running() || !Object.hasOwn(RULES, kind) || typeof options?.targetId !== 'string' ||
        !options.targetId.trim() || !finitePoint(options.anchor) || typeof options.sandbox !== 'boolean') return false;
    const sessionId = ++serial;
    session = { kind, targetId: options.targetId, anchor: { x: options.anchor.x, z: options.anchor.z },
      sandbox: options.sandbox, sessionId, sequence: makeSequence(kind, options.targetId, sessionId),
      phase: 'prepare', phaseTime: 0, elapsed: 0, index: 0, mistakes: 0, reason: null, released: false };
    previous = heldKeys(null);
    return true;
  }
  function prepare() { session.phase = 'prepare'; session.phaseTime = 0; session.released = false; }
  function mistake(reason) {
    session.mistakes++;
    session.reason = reason;
    if (session.mistakes >= RULES[session.kind].maxMistakes) finish('failed', reason);
    else prepare();
  }
  function step(dt, input, context) {
    const held = heldKeys(input), pressed = KEYS.filter(key => held[key] && !previous[key]);
    previous = held;
    if (!running()) return snapshot();
    if (context?.valid !== true) { cancel('invalid-context'); return snapshot(); }
    if (context.sandbox !== session.sandbox) { cancel('mode-changed'); return snapshot(); }
    // Consume paused edges without advancing the clock or accepting a press after resume.
    if (!Number.isFinite(dt) || dt <= 0) return snapshot();
    const s = session, rules = RULES[s.kind], phaseBefore = s.phase;
    s.elapsed += dt;
    if (s.elapsed >= rules.duration) { finish('failed', 'Time ran out.'); return snapshot(); }
    const down = KEYS.filter(key => held[key]);
    if (!down.length) s.released = true;
    s.phaseTime += dt;
    if (s.phase === 'prepare' && s.phaseTime >= rules.prepare) {
      s.phase = 'cue'; s.phaseTime -= rules.prepare;
    }
    if (s.phase === 'cue' && s.phaseTime > rules.cue) {
      mistake('Too late. Wait for the next key cue.'); return snapshot();
    }
    if (!pressed.length) return snapshot();
    if (phaseBefore !== 'cue' || s.phase !== 'cue') mistake('Too early. Wait for the highlighted key.');
    else if (!s.released || pressed.length !== 1 || down.length !== 1 || pressed[0] !== s.sequence[s.index]) {
      mistake('Wrong key. Release all keys and follow the sequence.');
    } else {
      s.index++; s.reason = null;
      if (s.index === s.sequence.length) finish('complete', s.kind === 'car' ? 'Car lock bypassed.' : 'Lemon lock bypassed.');
      else prepare();
    }
    return snapshot();
  }
  function prompt() {
    const s = session;
    if (!s) return '';
    if (s.phase === 'complete') return s.reason;
    if (s.phase === 'failed') return `${s.reason} Press E to retry.`;
    if (s.phase === 'cancelled') return 'Lock challenge cancelled.';
    const label = LABELS[s.sequence[s.index]];
    return `${s.kind === 'car' ? 'CAR LOCK' : 'LEMON HACK'}: ${s.phase === 'cue' ? `Press ${label} now!` : `Release keys. Wait for ${label}.`} ${s.index}/${s.sequence.length}. ${s.mistakes}/${RULES[s.kind].maxMistakes} mistakes. E cancels.`;
  }
  function snapshot() {
    const s = session, rules = s ? RULES[s.kind] : null;
    return Object.freeze({ active: running(), sessionId: s?.sessionId ?? null,
      kind: s?.kind ?? null, targetId: s?.targetId ?? null, phase: s?.phase ?? 'idle',
      sequence: Object.freeze(s ? [...s.sequence] : []), index: s?.index ?? 0,
      expectedKey: running() ? s.sequence[s.index] : null,
      progress: s ? s.index / s.sequence.length : 0,
      remaining: s ? Math.max(0, rules.duration - s.elapsed) : 0,
      cueWindow: rules?.cue ?? 0,
      cueRemaining: s?.phase === 'cue' ? Math.max(0, rules.cue - s.phaseTime) : 0,
      mistakes: s?.mistakes ?? 0, maxMistakes: rules?.maxMistakes ?? 0,
      prompt: prompt(), reason: s?.reason ?? null, sandbox: s?.sandbox ?? false,
      anchor: s ? Object.freeze({ ...s.anchor }) : null });
  }
  function clear() { cancel('cleared'); session = null; previous = heldKeys(null); }
  return { start, step, cancel, clear, snapshot, drainEvents: () => events.splice(0) };
}
