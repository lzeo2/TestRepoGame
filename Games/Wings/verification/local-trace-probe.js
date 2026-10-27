// Local diagnostic instrumentation only. No render, input, readiness or quality control.
(() => {
  'use strict';
  if (Object.prototype.hasOwnProperty.call(window, '__wingsDiagnosticTrace')) return;
  const now = () => performance.now();
  const trace = { version: 1, clock: 'performance.now', startedAt: now(),
    raf: { requested: 0, fired: 0, completed: 0, callbackThrows: 0, cancelCalls: 0,
      lastStart: null, lastEnd: null, maxCallbackMs: 0 }, abortCalls: 0,
    registrations: [], slowCallbacks: [], cancels: [], aborts: [], samples: [],
    dropped: { registrations: 0, slowCallbacks: 0, cancels: 0, aborts: 0, samples: 0, models: 0 },
    stringTruncations: 0, counterSaturations: 0, sampleErrors: 0 };
  const bump = (object, key, amount = 1) => {
    if (amount > Number.MAX_SAFE_INTEGER - object[key])
      trace.counterSaturations = Math.min(Number.MAX_SAFE_INTEGER, trace.counterSaturations + 1);
    object[key] = Math.min(Number.MAX_SAFE_INTEGER, object[key] + amount);
  };
  const text = (value, limit = 512) => {
    if (value.length > limit) bump(trace, 'stringTruncations');
    return value.slice(0, limit);
  };
  const primitive = value => typeof value === 'string' ? text(value) :
    typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) ? value : null;
  const stack = () => text(new Error().stack || '', 2048);
  const record = (key, limit, make) => {
    if (trace[key].length < limit) trace[key].push(make());
    else bump(trace.dropped, key);
  };
  const pick = (value, keys) => value == null ? null :
    Object.fromEntries(keys.split(' ').map(key => [key, primitive(value[key])]));
  const request = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = { requestAnimationFrame(callback) {
    // Invalid callbacks must reach native validation unchanged, synchronously.
    if (typeof callback !== 'function') return Reflect.apply(request, this, arguments);
    const args = Array.from(arguments);
    let id;
    args[0] = function () {
      const start = now();
      bump(trace.raf, 'fired'); trace.raf.lastStart = start;
      try {
        const result = Reflect.apply(callback, this, arguments);
        bump(trace.raf, 'completed'); return result;
      } catch (error) { bump(trace.raf, 'callbackThrows'); throw error; }
      finally {
        const end = now(), durationMs = end - start;
        trace.raf.lastEnd = end; trace.raf.maxCallbackMs = Math.max(trace.raf.maxCallbackMs, durationMs);
        if (durationMs >= 50) record('slowCallbacks', 64, () => ({ id: primitive(id), start, end, durationMs }));
      }
    };
    id = Reflect.apply(request, this, args);
    bump(trace.raf, 'requested');
    record('registrations', 8, () => ({ id: primitive(id), time: now(), stack: stack() }));
    return id;
  } }.requestAnimationFrame;
  window.cancelAnimationFrame = { cancelAnimationFrame(id) {
    bump(trace.raf, 'cancelCalls');
    try { return Reflect.apply(cancel, this, arguments); }
    finally { record('cancels', 32, () => ({ time: now(), id: primitive(id), stack: stack() })); }
  } }.cancelAnimationFrame;
  if (window.AbortController) {
    const abort = window.AbortController.prototype.abort;
    window.AbortController.prototype.abort = { abort() {
      const reason = arguments[0];
      bump(trace, 'abortCalls');
      try { return Reflect.apply(abort, this, arguments); }
      finally { record('aborts', 32, () => ({ time: now(), reasonType: reason === null ? 'null' : typeof reason,
        reason: ['string', 'number', 'boolean', 'bigint', 'undefined'].includes(typeof reason) ?
          text(String(reason)) : null, stack: stack() })); }
    } }.abort;
  }
  window.setInterval(() => {
    const sample = { time: now(), visibilityState: primitive(document.visibilityState), hasFocus: document.hasFocus(),
      startup: null, stats: null, game: null, error: false };
    try {
      const wings = window.__wings;
      const startup = wings?.startup, stats = wings?.stats, game = wings?.game, fleet = game?.fleet;
      sample.startup = pick(startup, 'phase blockedAt error shaderError backend callbacks pacedFrames completedRenders worldReady');
      if (sample.startup) {
        sample.startup.render = pick(startup.render, 'calls frameCalls drawCalls triangles points lines');
        sample.startup.worldStats = pick(startup.worldStats, 'clusters visibleClusters pending trees triangles lastWorkMs maxWorkMs shoreProgress');
      }
      sample.stats = pick(stats, 'fps frameMs drawCalls triangles backend');
      sample.game = pick(game, 'state seq team');
      if (sample.game) {
        sample.game.fleet = pick(fleet, 'hostTick roots visible objects elapsedMs');
        if (sample.game.fleet) {
          sample.game.fleet.fcTick = primitive(fleet.frame?.tick);
          const models = Array.isArray(fleet.models) ? fleet.models : [];
          sample.game.fleet.models = models.slice(0, 16).map(model => ({ ...pick(model, 'id visible'),
            position: Array.isArray(model.position) ? model.position.slice(0, 3).map(primitive) : null }));
          bump(trace.dropped, 'models', Math.max(0, models.length - 16));
        }
      }
    } catch { sample.error = true; bump(trace, 'sampleErrors'); }
    // Keep the latest two minutes; explicitly report overwritten samples.
    if (trace.samples.length === 120) { trace.samples.shift(); bump(trace.dropped, 'samples'); }
    trace.samples.push(sample);
  }, 1000);
  Object.defineProperty(window, '__wingsDiagnosticTrace', { value: Object.freeze({
    read: () => JSON.parse(JSON.stringify(trace)),
  }), enumerable: false, writable: false, configurable: false });
})();
