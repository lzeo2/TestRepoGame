import assert from 'node:assert/strict';
import { createWeather, WEATHER_IDS, WEATHER_PRESETS, WEATHER_LIMITS, validateAllowedPresets,
  visualTransmittance, canAcquireVisual, flightDisturbance } from './weather.mjs';

let groups = 0;
function check(name, test) { test(); groups++; console.log(`PASS ${name}`); }
const close = (a, b, epsilon = 1e-10) => assert(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
const options = { seed: 12345, allowedPresets: [...WEATHER_IDS], initialPreset: 'clear', holdMs: 5000, transitionMs: 3000 };
const allFinite = x => typeof x === 'number' ? Number.isFinite(x) : typeof x !== 'object' || Object.values(x).every(allFinite);
const fixed = id => createWeather({ seed: 123, initialPreset: id, allowedPresets: [id] });

check('strict preset, config, clock and tuning validation', () => {
  for (const ids of [undefined, [], ['snow'], ['ice'], ['clear', 'clear'], ['__proto__'], 'rain', [1]])
    assert.throws(() => validateAllowedPresets(ids));
  for (const extra of [{ seed: -1 }, { seed: 1.1 }, { seed: Infinity }, { seed: 2 ** 32 },
    { initialPreset: 'ice' }, { allowedPresets: ['fog'], initialPreset: 'clear' }, { holdMs: 0 },
    { transitionMs: 0 }, { transitionMs: 600001 }, { tuning: { snow: {} } }, { tuning: { storm: { rain: 2 } } },
    { tuning: { clear: { windSpeed: 19 } } }, { tuning: { fog: { fogFalloff: NaN } } },
    { tuning: { rain: { unknown: 0 } } }, { version: 2 }, { hour: 12 }])
    assert.throws(() => createWeather({ ...options, ...extra }));
  const weather = createWeather(options);
  for (const time of [-1, NaN, Infinity, WEATHER_LIMITS.maxTimeMs + 1, '50']) assert.throws(() => weather.sample(time));
  for (const view of [{ quality: 'ultra' }, { lightning: 'full' }, { reducedMotion: 1 }, { hour: 12 }])
    assert.throws(() => weather.sample(0, view));
  assert(allFinite(weather.sample(WEATHER_LIMITS.maxTimeMs)));
});

check('absolute-time determinism, seeks, seeded variation and immutable config', () => {
  const a = createWeather(options), b = createWeather(options);
  for (const t of [0, 0.5, 1000 / 60, 1, 5000, 7999, 8000, 16000, 90000, 1, 0, 604800000]) assert.deepEqual(a.sample(t), b.sample(t));
  assert.notDeepEqual(a.sample(10000).wind, createWeather({ ...options, seed: 9876 }).sample(10000).wind);
  const input = structuredClone(options), weather = createWeather(input);
  input.allowedPresets.length = 0; input.seed = 0;
  assert.deepEqual(weather.config, a.config);
  assert.throws(() => { weather.config.allowedPresets.push('snow'); });
  assert.throws(() => { WEATHER_PRESETS.clear.rain = 1; });
  const sample = weather.sample(4000); sample.atmosphere.rain = 99; sample.wind.totalMs[0] = 99;
  assert.deepEqual(weather.sample(4000), a.sample(4000));
  const tuning = { rain: { rain: 0.4, windSpeed: 6, fogFalloff: 1 / 500, lightningActivity: 0 } };
  const tuned = createWeather({ seed: 0, allowedPresets: ['rain'], tuning });
  tuning.rain.rain = 1;
  assert.equal(tuned.sample(0).atmosphere.rain, 0.4);
  assert.equal(tuned.sample(0).atmosphere.windSpeed, 6);
  assert.equal(tuned.sample(0).visibility.fogFalloff, 1 / 500);
  assert.deepEqual(createWeather(JSON.parse(JSON.stringify(tuned.config))).sample(5000), tuned.sample(5000));
});

check('all presets and seeded transitions stay bounded over seven days', () => {
  const worlds = WEATHER_IDS.map(fixed).concat(createWeather(options));
  for (const weather of worlds) for (let t = 0; t <= WEATHER_LIMITS.maxTimeMs; t += 30017) {
    const s = weather.sample(t, { quality: 'high', lightning: 'reduced' });
    assert(allFinite(s));
    for (const key of Object.keys(WEATHER_PRESETS.clear)) {
      const values = WEATHER_IDS.map(id => WEATHER_PRESETS[id][key]);
      assert(s.atmosphere[key] >= Math.min(...values) - 1e-12 && s.atmosphere[key] <= Math.max(...values) + 1e-12, key);
    }
    assert(s.blend >= 0 && s.blend <= 1);
    assert(Math.hypot(...s.wind.totalMs) <= WEATHER_LIMITS.maxWindMs);
    assert(Math.hypot(...s.wind.gustMs) <= 6);
    assert(s.presentation.flash >= 0 && s.presentation.flash <= 0.12);
    assert(s.presentation.rainParticles <= 1024);
    assert(WEATHER_IDS.includes(s.from) && WEATHER_IDS.includes(s.to));
  }
});

check('smooth holds, transition endpoints, seeded targets and restricted lists', () => {
  let weather;
  for (let seed = 0; seed < 100; seed++) {
    weather = createWeather({ ...options, seed });
    if (weather.sample(0).to !== 'clear') break;
  }
  const first = weather.sample(0), mid = weather.sample(6500), end = weather.sample(8000);
  assert.notEqual(first.to, first.from);
  assert.deepEqual(weather.sample(5000).atmosphere, WEATHER_PRESETS.clear);
  close(mid.blend, 0.5);
  for (const key of Object.keys(first.atmosphere)) {
    close(mid.atmosphere[key], (WEATHER_PRESETS.clear[key] + WEATHER_PRESETS[first.to][key]) / 2);
    close(end.atmosphere[key], WEATHER_PRESETS[first.to][key]);
    close(weather.sample(7999).atmosphere[key], end.atmosphere[key], 0.00001);
    close(weather.sample(5001).atmosphere[key], first.atmosphere[key], 0.00001);
  }
  // Wind has no RNG/epoch jump at either transition edge, including the next hold.
  for (const t of [5000, 8000, 13000, 16000]) for (let axis = 0; axis < 3; axis++)
    close(weather.sample(t - 1).wind.totalMs[axis], weather.sample(t).wind.totalMs[axis], 0.02);
  for (const allowedPresets of [['fog'], ['clear', 'rain']]) {
    const w = createWeather({ ...options, allowedPresets, initialPreset: allowedPresets[0] });
    for (let t = 0; t < 1000000; t += 1001) {
      const s = w.sample(t); assert(allowedPresets.includes(s.from) && allowedPresets.includes(s.to));
    }
  }
});

check('host-clock pause, speed, partitions and JSON config/time replay', () => {
  const weather = createWeather(options);
  // No new weather clock: host samples its already-scaled authoritative simulation ms.
  let hostMs = 0;
  for (let i = 0; i < 100; i++) hostMs += 50;
  const paused = weather.sample(hostMs);
  for (let i = 0; i < 100; i++) assert.deepEqual(weather.sample(hostMs), paused);
  for (let i = 0; i < 50; i++) hostMs += 100; // host 2x speed, same end sim time
  assert.deepEqual(weather.sample(hostMs), weather.sample(10000));
  const receipt = JSON.parse(JSON.stringify({ config: weather.config, simulationMs: hostMs }));
  assert.deepEqual(createWeather(receipt.config).sample(receipt.simulationMs), weather.sample(hostMs));
  assert.deepEqual(createWeather(receipt.config).sample(0), weather.sample(0));
  const flightTimeMs = 301 * (1000 / 60); // Actual original RoomEngine flight-clock cadence.
  const flightReplay = JSON.parse(JSON.stringify({ config: weather.config, time: flightTimeMs }));
  assert.deepEqual(createWeather(flightReplay.config).sample(flightReplay.time), weather.sample(flightTimeMs));
  for (const t of [7900, 8000, 3500, 0, 10000])
    assert.deepEqual(createWeather(receipt.config).sample(t), weather.sample(t));
});

check('quality, reduced motion and lightning cannot change physical/visibility state', () => {
  const storm = fixed('storm'); let maximum = 0;
  for (let t = 0; t < 90000; t += 50) {
    const ordinary = storm.sample(t), high = storm.sample(t, { quality: 'high', lightning: 'reduced' });
    const low = storm.sample(t, { quality: 'low', reducedMotion: true, lightning: 'reduced' });
    for (const key of ['atmosphere', 'wind', 'visibility']) {
      assert.deepEqual(high[key], ordinary[key]); assert.deepEqual(low[key], ordinary[key]);
    }
    assert.equal(ordinary.presentation.flash, 0);
    assert.equal(low.presentation.flash, 0); assert.equal(low.presentation.rainParticles, 0);
    assert.equal(low.presentation.cloudMotionScale, 0);
    maximum = Math.max(maximum, high.presentation.flash);
  }
  assert(maximum > 0.11 && maximum <= 0.12);
  for (const id of ['clear', 'overcast', 'rain', 'fog']) assert.equal(fixed(id).sample(10000, { lightning: 'reduced' }).presentation.flash, 0);
  assert.equal(storm.sample(0, { quality: 'low' }).presentation.rainParticles, 128);
  assert.equal(storm.sample(0).presentation.rainParticles, 512);
});

check('shared optical visibility: symmetry, height, distance, water crossing and acquisition parity', () => {
  const fog = fixed('fog').sample(0).visibility, clear = fixed('clear').sample(0).visibility;
  const a = [0, 0, 0], b = [1000, 0, 0];
  close(visualTransmittance(clear, a, b), 1);
  close(visualTransmittance(fog, a, b), Math.exp(-2.5));
  close(visualTransmittance(fog, a, a), 1);
  assert(visualTransmittance(fog, a, [2000, 0, 0]) < visualTransmittance(fog, a, b));
  assert(visualTransmittance(fog, [0, 1000, 0], [1000, 1000, 0]) > visualTransmittance(fog, a, b));
  for (const [from, to] of [[a, b], [[0, -100, 0], [100, 100, 0]], [[0, -100, 0], [100, -5, 0]],
    [[0, 100, 0], [1000, 100.000000001, 0]]]) {
    close(visualTransmittance(fog, from, to), visualTransmittance(fog, to, from));
    // Independent midpoint integration also checks the below/above-water piecewise integral.
    let optical = 0;
    for (let i = 0; i < 20000; i++) {
      const h = from[1] + (to[1] - from[1]) * (i + 0.5) / 20000;
      optical += fog.fogBase + fog.fogSea * Math.exp(-Math.max(h, 0) * fog.fogFalloff);
    }
    close(visualTransmittance(fog, from, to), Math.exp(-Math.hypot(...from.map((n, i) => n - to[i])) * optical / 20000), 1e-8);
    const bot = canAcquireVisual(fog, from, to), player = canAcquireVisual(fog, from, to);
    assert.equal(bot, player); // Caller contract, NOT actual FC/player wiring.
  }
  assert(!canAcquireVisual(fog, a, b)); assert(canAcquireVisual(clear, a, b));
  assert.throws(() => visualTransmittance({ ...fog, radar: 0.5 }, a, b));
  assert.throws(() => visualTransmittance(fog, [NaN, 0, 0], b));
  assert.throws(() => canAcquireVisual(fog, a, b, 0));
});

check('opt-in conservative flight DTO bounds, ground fade, control authority and validation', () => {
  for (let t = 0; t < 300000; t += 137) {
    const state = fixed('storm').sample(t);
    const off = flightDisturbance(state), ground = flightDisturbance(state, { gain: 1, airborne: true });
    for (const result of [off, ground]) assert(Object.values(result).flat().every(n => n === 0));
    for (const opts of [{}, { maxAcceleration: 0.2, maxAngularAcceleration: 0.001 }]) {
      const on = flightDisturbance(state, { gain: 1, airborne: true, clearanceMeters: 80, ...opts });
      assert(Math.hypot(...on.accelerationWorld) <= (opts.maxAcceleration ?? 0.6) + 1e-12);
      assert(Math.hypot(...on.angularAccelerationBody) <= (opts.maxAngularAcceleration ?? 0.03) + 1e-12);
    }
  }
  const state = fixed('storm').sample(12000), copy = structuredClone(state);
  const on = flightDisturbance(state, { gain: 1, airborne: true, clearanceMeters: 40 });
  const half = flightDisturbance(state, { gain: 1, airborne: true, clearanceMeters: 20 });
  on.accelerationWorld.forEach((n, i) => close(half.accelerationWorld[i], n * 0.5));
  assert(Object.values(flightDisturbance(state, { gain: 1, airborne: true, clearanceMeters: 40, controlAuthority: 0 })).flat().every(n => n === 0));
  assert.deepEqual(state, copy);
  for (const opts of [{ gain: 2 }, { maxAcceleration: 2 }, { maxAngularAcceleration: 1 },
    { airborne: 1 }, { clearanceMeters: -1 }, { controlAuthority: -1 }, { dt: 100 }])
    assert.throws(() => flightDisturbance(state, opts));
  assert.throws(() => flightDisturbance({ wind: { totalMs: [24, 24, 24], turbulence: [0, 0, 0] } }));
});

console.log(`PASS ${groups}/8 weather CPU groups; no served renderer, map policy, FC or native gameplay acceptance.`);
