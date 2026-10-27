// Original dependency-free weather contracts. No renderer, flight engine, clock or upstream imports.
export const WEATHER_VERSION = 1;
export const WEATHER_LIMITS = Object.freeze({ maxTimeMs: 604800000, maxWindMs: 24,
  maxAcceleration: 1, maxAngularAcceleration: 0.05 });
const ranges = Object.freeze({ cloudCover: [0, 1], rain: [0, 1], fogBase: [0, 0.003],
  fogSea: [0, 0.004], fogFalloff: [1 / 2000, 1 / 20], sunScale: [0.25, 1],
  ambientScale: [0.5, 1], desaturation: [0, 0.65], windSpeed: [0, 18],
  gustSpeed: [0, 6], turbulence: [0, 1], lightningActivity: [0, 1] });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const preset = (cloudCover, rain, fogBase, fogSea, sunScale, ambientScale, desaturation,
  windSpeed, gustSpeed, turbulence, lightningActivity) => freeze({ cloudCover, rain, fogBase,
  fogSea, fogFalloff: 1 / 300, sunScale, ambientScale, desaturation,
  windSpeed, gustSpeed, turbulence, lightningActivity });
export const WEATHER_PRESETS = freeze({
  clear: preset(0.12, 0, 0, 0, 1, 1, 0, 2, 0.5, 0.05, 0),
  overcast: preset(0.9, 0, 0.00006, 0.0001, 0.5, 0.9, 0.2, 5, 1.5, 0.15, 0),
  rain: preset(0.95, 0.65, 0.0002, 0.0002, 0.4, 0.8, 0.3, 8, 3, 0.35, 0),
  fog: preset(0.8, 0, 0.0005, 0.002, 0.65, 0.95, 0.4, 1.5, 0.5, 0.05, 0),
  storm: preset(1, 1, 0.00045, 0.0004, 0.25, 0.65, 0.45, 14, 5, 0.8, 1),
});
export const WEATHER_IDS = Object.freeze(Object.keys(WEATHER_PRESETS));
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function fields(x, keys) {
  if (!object(x) || Object.keys(x).some(k => !keys.includes(k))) throw new TypeError('Unexpected weather fields');
}
function number(x, lo, hi) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi) throw new RangeError('Weather number out of bounds');
  return x;
}
function integer(x, lo, hi) {
  number(x, lo, hi); if (!Number.isSafeInteger(x)) throw new RangeError('Weather integer required'); return x;
}
function boolean(x) { if (typeof x !== 'boolean') throw new TypeError('Weather boolean required'); return x; }
function known(id) { if (!Object.hasOwn(WEATHER_PRESETS, id)) throw new TypeError('Unknown weather preset'); return id; }
export function validateAllowedPresets(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > WEATHER_IDS.length ||
      ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length)
    throw new TypeError('Nonempty unique weather preset list required');
  return Object.freeze(ids.map(known));
}
// Stateless integer mixing: neither global RNG state nor call order influences a sample.
function hash(seed, index, channel) {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const vector = (p, bound = 1000000) => {
  if (!Array.isArray(p) || p.length !== 3) throw new TypeError('Weather [x,y,z] required');
  return p.map(n => number(n, -bound, bound));
};
const capped = (v, limit) => { const scale = Math.min(1, limit / (Math.hypot(...v) || 1)); return v.map(n => n * scale); };

export function createWeather(options) {
  fields(options, ['version', 'seed', 'initialPreset', 'allowedPresets', 'holdMs', 'transitionMs', 'tuning']);
  if (options.version !== undefined && options.version !== WEATHER_VERSION) throw new TypeError('Unknown weather version');
  const seed = integer(options.seed, 0, 0xffffffff);
  const allowedPresets = validateAllowedPresets(options.allowedPresets);
  const initialPreset = known(options.initialPreset ?? allowedPresets[0]);
  if (!allowedPresets.includes(initialPreset)) throw new TypeError('Initial weather not allowed by map');
  const holdMs = integer(options.holdMs ?? 90000, 1000, 3600000);
  const transitionMs = integer(options.transitionMs ?? 30000, 1000, 600000);
  const tuning = options.tuning ?? {};
  fields(tuning, WEATHER_IDS);
  const presets = {}, cleanTuning = {};
  for (const id of WEATHER_IDS) {
    const override = tuning[id] ?? {};
    fields(override, Object.keys(ranges));
    cleanTuning[id] = {};
    for (const [key, value] of Object.entries(override)) cleanTuning[id][key] = number(value, ...ranges[key]);
    presets[id] = { ...WEATHER_PRESETS[id], ...cleanTuning[id] };
  }
  const config = freeze({ version: WEATHER_VERSION, seed, initialPreset, allowedPresets,
    holdMs, transitionMs, tuning: cleanTuning });
  const cycleMs = holdMs + transitionMs;
  const choice = epoch => epoch === 0 ? initialPreset : allowedPresets[Math.floor(hash(seed, epoch, 0) * allowedPresets.length)];
  function sample(simulationMs, presentation = {}) {
    number(simulationMs, 0, WEATHER_LIMITS.maxTimeMs);
    fields(presentation, ['quality', 'reducedMotion', 'lightning']);
    const quality = presentation.quality ?? 'balanced';
    const reducedMotion = boolean(presentation.reducedMotion ?? false);
    const lightning = presentation.lightning ?? 'off';
    if (!['low', 'balanced', 'high'].includes(quality) || !['off', 'reduced'].includes(lightning))
      throw new TypeError('Unknown weather presentation option');
    const epoch = Math.floor(simulationMs / cycleMs), localMs = simulationMs % cycleMs;
    const from = choice(epoch), to = choice(epoch + 1);
    const blend = smooth(Math.max(0, (localMs - holdMs) / transitionMs));
    const atmosphere = {};
    for (const key of Object.keys(ranges)) atmosphere[key] = mix(presets[from][key], presets[to][key], blend);
    const seconds = simulationMs / 1000;
    const wave = (channel, period) => Math.sin(seconds * 2 * Math.PI / period + hash(seed, 0, channel) * 2 * Math.PI);
    const heading = hash(seed, 0, 1) * 2 * Math.PI + 0.12 * wave(2, 180);
    const steadyMs = [Math.cos(heading) * atmosphere.windSpeed, 0, Math.sin(heading) * atmosphere.windSpeed];
    const gustMs = [0.6 * wave(3, 17), 0.2 * wave(4, 23), 0.6 * wave(5, 19)].map(n => n * atmosphere.gustSpeed);
    const wind = { steadyMs, gustMs, totalMs: steadyMs.map((n, i) => n + gustMs[i]),
      turbulence: [wave(6, 11), wave(7, 13), wave(8, 17)].map(n => n * atmosphere.turbulence) };
    // One broad, low-intensity pulse at most every 30 simulation seconds, no flickering bolt.
    const strikeSlot = Math.floor(simulationMs / 30000), slotMs = simulationMs % 30000;
    const strikeAtMs = 8000 + Math.floor(hash(seed, strikeSlot, 10) * 12000);
    const age = (slotMs - strikeAtMs) / 1000;
    const envelope = age > 0 && age < 2 ? Math.sin(Math.PI * age / 2) ** 2 : 0;
    const flash = !reducedMotion && lightning === 'reduced' ? envelope * atmosphere.lightningActivity * 0.12 : 0;
    const budget = { low: 128, balanced: 512, high: 1024 }[quality];
    const { fogBase, fogSea, fogFalloff } = atmosphere;
    return { version: WEATHER_VERSION, simulationMs, from, to, blend, atmosphere,
      visibility: { fogBase, fogSea, fogFalloff }, wind,
      presentation: { quality, reducedMotion, lightning, flash,
        rainParticles: reducedMotion ? 0 : Math.floor(budget * atmosphere.rain),
        cloudLayers: quality === 'low' ? 1 : quality === 'high' ? 3 : 2,
        cloudMotionScale: reducedMotion ? 0 : 1 } };
  }
  return Object.freeze({ config, sample });
}

// Pass the SAME composed density DTO to visual rendering and all visual-acquisition callers.
// Geometry occlusion, stealth and nonvisual sensors remain the owning authority's responsibility.
export function visualTransmittance(density, from, to) {
  fields(density, ['fogBase', 'fogSea', 'fogFalloff']);
  const base = number(density.fogBase, 0, 0.01), sea = number(density.fogSea, 0, 0.01);
  const falloff = number(density.fogFalloff, 1 / 2000, 1 / 20);
  const a = vector(from), b = vector(to), distance = Math.hypot(...a.map((n, i) => n - b[i]));
  const low = Math.min(a[1], b[1]), high = Math.max(a[1], b[1]), dy = high - low;
  // Exact integral of exp(-max(height,0)*falloff), symmetric and stable near horizontal.
  let average;
  if (dy < 1e-8) average = Math.exp(-Math.max(0, (low + high) / 2) * falloff);
  else {
    const under = Math.max(0, Math.min(high, 0) - low);
    const start = Math.max(0, low), span = Math.max(0, high - start);
    average = (under + Math.exp(-start * falloff) * -Math.expm1(-span * falloff) / falloff) / dy;
  }
  return Math.exp(-distance * (base + sea * average));
}
export function canAcquireVisual(density, from, to, minimumTransmittance = 0.1) {
  number(minimumTransmittance, 0.01, 1);
  return visualTransmittance(density, from, to) >= minimumTransmittance;
}

// Advisory acceleration DTO ONLY. Parent flight authority applies once per fixed sim step.
// Default gain 0; never modifies sticks, attitude, lift, stall, HP or flight state here.
export function flightDisturbance(state, options = {}) {
  fields(options, ['gain', 'maxAcceleration', 'maxAngularAcceleration', 'airborne', 'clearanceMeters', 'controlAuthority']);
  const gain = number(options.gain ?? 0, 0, 1);
  const maxAcceleration = number(options.maxAcceleration ?? 0.6, 0, WEATHER_LIMITS.maxAcceleration);
  const maxAngular = number(options.maxAngularAcceleration ?? 0.03, 0, WEATHER_LIMITS.maxAngularAcceleration);
  const airborne = boolean(options.airborne ?? false);
  const clearance = number(options.clearanceMeters ?? 0, 0, 1000000);
  const control = number(options.controlAuthority ?? 1, 0, 1);
  const wind = vector(state?.wind?.totalMs, WEATHER_LIMITS.maxWindMs);
  if (Math.hypot(...wind) > WEATHER_LIMITS.maxWindMs) throw new RangeError('Weather wind magnitude out of bounds');
  const turbulence = vector(state?.wind?.turbulence, 1);
  const strength = gain * control * (airborne ? smooth(Math.min(1, clearance / 40)) : 0);
  const linear = capped(wind.map((n, i) => n * 0.035 + turbulence[i] * 0.12), maxAcceleration);
  const angular = capped(turbulence.map(n => n * 0.02), maxAngular);
  return { accelerationWorld: linear.map(n => n * strength),
    angularAccelerationBody: angular.map(n => n * strength) };
}
