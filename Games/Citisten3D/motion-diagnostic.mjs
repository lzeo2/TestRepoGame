const WINDOW_MS = 5000, MAX_SAMPLES = 360, MAX_VECTOR = 1024;
const GROUPS = ['camera', 'projection', 'target', 'viewport', 'scene', 'projected', 'shading'];
const MOVEMENT = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const copy = value => value === null ? null : JSON.parse(JSON.stringify(value));
const finite = value => typeof value === 'number' && Number.isFinite(value);

// Only diagnostic metadata, never a save or arbitrary input event, belongs here.
function facts(value, note) {
  let left = 64;
  function visit(v, depth) {
    if (--left < 0 || depth > 4) { note('metadata-limit'); return null; }
    if (v === null || typeof v === 'boolean' || finite(v)) return v;
    if (typeof v === 'string') return v.slice(0, 64).replace(/[^\x20-\x7e]/g, '?');
    if (Array.isArray(v)) {
      if (v.length > 24) note('metadata-limit');
      return v.slice(0, 24).map(item => visit(item, depth + 1));
    }
    if (v && typeof v === 'object') {
      const result = {};
      let count = 0;
      for (const key in v) {
        if (!Object.hasOwn(v, key)) continue;
        if (++count > 8 || !/^[\x20-\x7e]{1,32}$/.test(key)) { note('metadata-limit'); break; }
        Object.defineProperty(result, key, { value: visit(v[key], depth + 1), enumerable: true });
      }
      return result;
    }
    note('metadata-invalid'); return null;
  }
  const result = visit(value, 0);
  if (JSON.stringify(result).length > 1800) { note('metadata-limit'); return null; }
  return result;
}

export function createMotionDiagnostic({ readSample, onFinish,
  now = () => globalThis.performance.now(),
  setTimer = (...args) => globalThis.setTimeout(...args),
  clearTimer = (...args) => globalThis.clearTimeout(...args)
} = {}) {
  let running = false, disposed = false, timer = null, generation = 0, data = null;
  let previous = {}, first = {}, lastSampleAt = null, previousInput = null;
  const note = reason => {
    if (!data.reasons.includes(reason) && data.reasons.length < 16) data.reasons.push(reason);
  };
  function clock() {
    try { const time = now(); if (finite(time)) return time; }
    catch { /* Observer clock failure is recorded below, not a game error. */ }
    note('clock-unavailable'); return null;
  }
  function cleanup() {
    if (timer === null) return;
    const handle = timer; timer = null;
    try { clearTimer(handle); } catch { note('timer-cleanup-error'); }
  }
  function finish(reason, notify = true, time) {
    if (!running) return false;
    if (time === undefined) time = clock();
    running = false; generation++; cleanup();
    data.finishReason = reason;
    data.finishedAtMs = time;
    data.elapsedMs = time === null ? null : time - data.startedAtMs;
    data.overrunMs = time === null ? null : Math.max(0, time - data.deadlineMs);
    data.sampleSpanMs = data.timing.firstAtMs === null ? null : data.timing.lastAtMs - data.timing.firstAtMs;
    const changed = name => data.groups[name].changedComparisons > 0;
    const observations = [];
    if (data.input.changed || changed('target')) observations.push('input/targetchanged');
    if (changed('camera')) observations.push('camerachanged');
    if (changed('viewport') || changed('projection')) observations.push('viewport/projectionchanged');
    if (changed('scene')) observations.push('sampledscenechanged');
    if (changed('shading')) observations.push('shadingchanged');
    if (changed('projected')) observations.push('projectedchanged');
    const groups = Object.values(data.groups);
    if (!observations.length && groups.some(g => g.comparisons > 0)) observations.push('noRecordedMotionInSampledData');
    if (data.sampleCount === 0 || groups.some(g => g.unavailableSamples > 0 || g.validSamples < 2) || data.readErrors || data.unavailableReads) observations.push('unavailable');
    // This is coverage of existing callbacks, never an FPS or native-loop verdict.
    data.partial = reason !== 'deadline' || data.sampleCount < 2 || data.readErrors > 0 ||
      data.input.unknownSamples > 0 || data.reasons.length > 0 ||
      groups.some(g => g.comparisons === 0 || g.coverageChanged > 0 || g.unavailableSamples > 0) ||
      data.timing.firstAtMs === null || data.timing.firstAtMs - data.startedAtMs > 250 ||
      data.deadlineMs - data.timing.lastAtMs > 250 || data.timing.maxIntervalMs > 250 || data.overrunMs > 250;
    if (data.partial) observations.push('partial');
    data.observations = observations;
    previous = {}; first = {}; previousInput = null;
    if (notify && !disposed && typeof onFinish === 'function') {
      try { onFinish(copy(data)); } catch { data.finishCallbackError = true; note('finish-callback-error'); }
    }
    return true;
  }
  function observation(raw) {
    const input = raw.input;
    const known = input?.known === true && Array.isArray(input.held) && input.held.length <= 16;
    const held = known ? MOVEMENT.filter(code => input.held.includes(code)) : [];
    const dragging = known && typeof input.dragging === 'boolean' ? input.dragging : null;
    const version = known && finite(input.version) ? input.version : null;
    if (known && (dragging === null || version === null)) note('input-detail-unavailable');
    if (!known) { data.input.unknownSamples++; note('input-unknown'); }
    else {
      data.input.knownSamples++;
      for (const code of held) if (!data.input.heldMovementCodes.includes(code)) data.input.heldMovementCodes.push(code);
      if (dragging === true) data.input.draggingObserved = true;
      else if (dragging === false && data.input.draggingObserved === null) data.input.draggingObserved = false;
      const signature = JSON.stringify([held, dragging, version]);
      if (previousInput !== null && signature !== previousInput) data.input.changed = true;
      previousInput = signature;
    }
    if (!known) previousInput = null;
    const render = {};
    for (const key of ['frame', 'calls', 'triangles', 'geometries', 'textures']) {
      render[key] = finite(raw.render?.[key]) ? raw.render[key] : null;
      if (render[key] === null) note('render-unavailable');
    }
    let sim = null;
    if (raw.sim !== null && raw.sim !== undefined) {
      sim = {};
      for (const key of ['time', 'tick', 'speed']) {
        sim[key] = finite(raw.sim[key]) ? raw.sim[key] : null;
        if (sim[key] === null) note('sim-unavailable');
      }
      sim.construction = Array.isArray(raw.sim.construction) ? facts(raw.sim.construction, note) : null;
      sim.constructionObservedCount = Array.isArray(raw.sim.construction) ? Math.min(24, raw.sim.construction.length) : null;
      if (sim.construction === null) note('construction-unavailable');
    } else note('sim-unavailable');
    return { input: { known, heldMovementCodes: known ? held : null, dragging, version }, render, sim };
  }
  function sample() {
    if (!running || disposed) return false;
    const time = clock();
    if (time === null) { finish('observer-error', true, null); return false; }
    if (time >= data.deadlineMs) { finish('deadline', true, time); return false; }
    if (lastSampleAt !== null && time < lastSampleAt) {
      note('clock-regressed'); finish('observer-error', true, time); return false;
    }
    data.sampleCount++;
    const timing = data.timing;
    if (lastSampleAt !== null) {
      const interval = time - lastSampleAt;
      timing.intervals++;
      timing.minIntervalMs = timing.minIntervalMs === null ? interval : Math.min(timing.minIntervalMs, interval);
      timing.maxIntervalMs = timing.maxIntervalMs === null ? interval : Math.max(timing.maxIntervalMs, interval);
      timing.totalIntervalMs += interval;
    }
    timing.firstAtMs ??= time; timing.lastAtMs = time; lastSampleAt = time;
    try {
      const raw = readSample();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Unavailable observer sample');
      data.successfulReads++;
      if (raw.available !== true) { data.unavailableReads++; note('sample-unavailable'); }
      // Reasons are sampler-owned diagnostics, not caught exception messages or input text.
      if (Array.isArray(raw.reasons)) for (const reason of raw.reasons.slice(0, 8)) {
        if (typeof reason === 'string') note(`sampler:${reason.slice(0, 64).replace(/[^\x20-\x7e]/g, '?')}`);
      }
      for (const name of GROUPS) {
        const stats = data.groups[name], values = raw.groups?.[name], keys = raw.keys?.[name];
        if (!Array.isArray(values) || values.length === 0 || values.length > MAX_VECTOR || !values.every(finite) ||
            !Array.isArray(keys) || keys.length === 0 || keys.length > MAX_VECTOR || !keys.every(k => typeof k === 'string' && k.length <= 96)) {
          stats.unavailableSamples++; note(`${name}-unavailable`); delete previous[name]; continue;
        }
        stats.validSamples++; stats.lastValueCount = values.length;
        const current = { values: values.slice(), keys: keys.slice() }, prior = previous[name];
        const same = other => other && other.values.length === values.length && other.keys.length === keys.length && other.keys.every((key, i) => key === keys[i]);
        const delta = other => {
          let max = 0;
          for (let i = 0; i < values.length; i++) max = Math.max(max, Math.abs(values[i] - other.values[i]));
          if (!finite(max)) { note(`${name}-delta-overflow`); return null; }
          return max;
        };
        if (prior && !same(prior)) stats.coverageChanged++;
        if (same(prior)) {
          const max = delta(prior);
          if (max !== null) {
            stats.comparisons++; if (max > 0) stats.changedComparisons++;
            stats.maxAbsDelta = Math.max(stats.maxAbsDelta ?? 0, max);
          }
        }
        if (!first[name]) first[name] = current;
        if (same(first[name])) {
          const max = delta(first[name]);
          if (max !== null) stats.maxAbsFromFirst = Math.max(stats.maxAbsFromFirst ?? 0, max);
        }
        previous[name] = current;
      }
      const observed = observation(raw);
      data.first ??= observed; data.last = observed;
      const coverage = facts(raw.coverage ?? null, note);
      if (data.successfulReads === 1) data.firstCoverage = coverage;
      data.lastCoverage = coverage;
    } catch {
      data.readErrors++; note('read-sample-error');
      data.primaryReadFault ??= 'read-sample-error';
      for (const name of GROUPS) data.groups[name].unavailableSamples++;
      previous = {}; previousInput = null;
    }
    const after = clock();
    if (after === null || after < time) {
      if (after !== null) note('clock-regressed');
      finish('observer-error', true, after);
    } else {
      data.timing.observerTotalMs += after - time;
      data.timing.observerMaxMs = Math.max(data.timing.observerMaxMs, after - time);
      if (after >= data.deadlineMs) finish('deadline', true, after);
      else if (data.sampleCount >= MAX_SAMPLES) finish('sample-cap', true, after);
    }
    return true;
  }
  return {
    start() {
      if (disposed || running) return false;
      data = { schema: 1, plannedDurationMs: WINDOW_MS, maxSamples: MAX_SAMPLES,
        startedAtMs: null, deadlineMs: null, finishedAtMs: null, elapsedMs: null, overrunMs: null,
        finishReason: null, finishCallbackError: false, sampleCount: 0, successfulReads: 0, unavailableReads: 0, readErrors: 0, primaryReadFault: null,
        timing: { firstAtMs: null, lastAtMs: null, intervals: 0, minIntervalMs: null, maxIntervalMs: null, totalIntervalMs: 0,
          observerTotalMs: 0, observerMaxMs: 0 },
        groups: Object.fromEntries(GROUPS.map(name => [name, { validSamples: 0, unavailableSamples: 0, comparisons: 0,
          changedComparisons: 0, coverageChanged: 0, lastValueCount: null, maxAbsDelta: null, maxAbsFromFirst: null }])),
        input: { knownSamples: 0, unknownSamples: 0, heldMovementCodes: [], draggingObserved: null, changed: false },
        first: null, last: null, firstCoverage: null, lastCoverage: null, reasons: [], observations: [], partial: true };
      previous = {}; first = {}; lastSampleAt = null; previousInput = null;
      running = true;
      const time = clock();
      if (time === null) { finish('observer-error', true, null); return false; }
      data.startedAtMs = time; data.deadlineMs = time + WINDOW_MS;
      const token = ++generation;
      function deadline() {
        if (!running || disposed || token !== generation) return;
        timer = null;
        const at = clock();
        if (at !== null && at < data.deadlineMs) {
          try { timer = setTimer(deadline, data.deadlineMs - at); }
          catch { note('timer-start-error'); finish('observer-error', true, at); }
        } else finish(at === null ? 'observer-error' : 'deadline', true, at);
      }
      try { timer = setTimer(deadline, WINDOW_MS); }
      catch { note('timer-start-error'); finish('observer-error', true, time); return false; }
      return true;
    },
    sample,
    cancel() { return finish('cancelled', false); },
    dispose() { if (disposed) return; disposed = true; if (running) finish('disposed', false); },
    get report() { return copy(data); },
    get isRunning() { return running; }
  };
}
