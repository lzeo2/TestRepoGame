const WARMUP_MS = 400;
const MEASURE_MS = 1400;
const MAX_INTERVALS = 2048;
const validTime = time => Number.isFinite(time) && time >= 0 && time <= Number.MAX_SAFE_INTEGER-1800;

/** Samples only completed renders; all timestamps use performance.now() milliseconds. */
export function createGraphicsDiagnostics(presets) {
  if (!Array.isArray(presets) || !presets.length || presets.some(p => !p || typeof p.id !== 'string' || !p.id || !Number.isFinite(p.fps) || p.fps <= 0) || new Set(presets.map(p => p.id)).size !== presets.length) {
    throw new TypeError('Graphics diagnostics need unique preset IDs and positive finite FPS targets.');
  }
  const profiles = presets.map(({id,fps}) => ({id,fps}));
  let running = false, index = 0, phaseStart = 0, observed = 0, results = [];
  let first = null, last = null, count = 0, intervals = [], maxGap = 0, overflow = false;
  function resetPhase(time) {
    phaseStart = time; first = last = null; count = 0; intervals = []; maxGap = 0; overflow = false;
  }
  function finishPhase(time) {
    const profile = profiles[index];
    // Include empty portions of the measurement window: a lone fast burst is not sustained FPS.
    const elapsed = time-(phaseStart+WARMUP_MS);
    const fps = count * 1000 / elapsed;
    const edgeGap = first === null ? elapsed : Math.max(first-(phaseStart+WARMUP_MS),time-last);
    const sorted = [...intervals].sort((a,b) => a-b);
    const p90Ms = sorted.length ? sorted[Math.ceil(sorted.length * .9)-1] : 0;
    const covered = first !== null && last-first >= MEASURE_MS * .7;
    // 45 FPS on a 60 Hz RAF alternates 16.7/33.3ms. A 1.65 cadence allowance
    // accepts that pacing while the sustained FPS requirement rejects a slower preset.
    const stable = !overflow && count >= 12 && covered && fps >= profile.fps * .88 && p90Ms <= 1000/profile.fps * 1.65 && Math.max(maxGap,edgeGap) <= 150;
    results.push({id:profile.id,targetFps:profile.fps,fps,stable,p90Ms});
  }
  return {
    get active() { return running; },
    get current() { return running ? profiles[index].id : null; },
    start(time) {
      if (!validTime(time)) return false;
      running = true; index = 0; observed = time; results = []; resetPhase(time); return true;
    },
    cancel() { running = false; results = []; intervals = []; },
    record(time) {
      if (!running || !validTime(time) || time < observed) return;
      observed = time;
      if (time < phaseStart+WARMUP_MS || time >= phaseStart+WARMUP_MS+MEASURE_MS || last !== null && time <= last) return;
      if (last !== null) {
        const gap = time-last; maxGap = Math.max(maxGap,gap);
        if (intervals.length < MAX_INTERVALS) intervals.push(gap); else overflow = true;
      }
      if (first === null) first = time;
      last = time; count++;
    },
    advance(time) {
      if (!running || !validTime(time) || time < observed) return null;
      observed = time;
      if (time < phaseStart+WARMUP_MS+MEASURE_MS) return null;
      finishPhase(time);
      if (++index < profiles.length) { resetPhase(time); return null; }
      running = false;
      const stable = results.find(result => result.stable);
      const fastest = results.reduce((best,result) => result.fps > best.fps ? result : best);
      return {recommendation:(stable || fastest).id,results:results.map(result => ({...result})),fallback:!stable};
    }
  };
}
