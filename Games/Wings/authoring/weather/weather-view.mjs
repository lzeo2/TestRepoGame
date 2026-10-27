// Original Three/TSL weather consumer. No retained Wings shader, clock, RNG or combat code.
import { WEATHER_VERSION, WEATHER_IDS, WEATHER_LIMITS, visualTransmittance } from './weather.mjs';

const owners = new WeakMap();
const atmosphereRanges = Object.freeze({ cloudCover: [0, 1], rain: [0, 1], fogBase: [0, .003],
  fogSea: [0, .004], fogFalloff: [1/2000, 1/20], sunScale: [.25, 1], ambientScale: [.5, 1],
  desaturation: [0, .65], windSpeed: [0, 18], gustSpeed: [0, 6], turbulence: [0, 1], lightningActivity: [0, 1] });
function record(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)))
    throw new TypeError(`Invalid ${name} fields`);
}
function number(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new TypeError(`Invalid ${name}`);
  return value;
}
function vector(value, bound, name) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`Invalid ${name}`);
  return [0, 1, 2].map(i => number(value[i], -bound, bound, name));
}
function density(value) {
  record(value, ['fogBase', 'fogSea', 'fogFalloff'], 'visibility');
  // Reuse the authority's public density validation, not a separate set of optical bounds.
  // This zero-length call validates only; GPU factors below use the real world-space ray.
  visualTransmittance(value, [0, 0, 0], [0, 0, 0]);
  return { fogBase: value.fogBase, fogSea: value.fogSea, fogFalloff: value.fogFalloff };
}
function frameValues(frame) {
  record(frame, ['simulationMs', 'weather', 'visibility', 'minimumTransmittance'], 'environment');
  const time = number(frame.simulationMs, 0, WEATHER_LIMITS.maxTimeMs, 'simulationMs');
  const composed = density(frame.visibility);
  number(frame.minimumTransmittance, .01, 1, 'minimumTransmittance');
  const weather = frame.weather;
  record(weather, ['version', 'simulationMs', 'from', 'to', 'blend', 'atmosphere', 'visibility', 'wind', 'presentation'], 'weather sample');
  if (weather.version !== WEATHER_VERSION || weather.simulationMs !== time ||
      !WEATHER_IDS.includes(weather.from) || !WEATHER_IDS.includes(weather.to)) throw new TypeError('Invalid weather identity/time');
  number(weather.blend, 0, 1, 'weather blend');
  record(weather.atmosphere, Object.keys(atmosphereRanges), 'atmosphere');
  for (const [key, limits] of Object.entries(atmosphereRanges)) number(weather.atmosphere[key], ...limits, key);
  density(weather.visibility); // Validate metadata too, but NEVER use it instead of the composed density.
  record(weather.wind, ['steadyMs', 'gustMs', 'totalMs', 'turbulence'], 'wind');
  vector(weather.wind.steadyMs, 18, 'steady wind'); vector(weather.wind.gustMs, 6, 'gust wind');
  const wind = vector(weather.wind.totalMs, WEATHER_LIMITS.maxWindMs, 'total wind');
  if (Math.hypot(...wind) > WEATHER_LIMITS.maxWindMs) throw new TypeError('Invalid wind magnitude');
  vector(weather.wind.turbulence, 1, 'turbulence');
  const p = weather.presentation;
  record(p, ['quality', 'reducedMotion', 'lightning', 'flash', 'rainParticles', 'cloudLayers', 'cloudMotionScale'], 'presentation');
  if (!['low', 'balanced', 'high'].includes(p.quality) || typeof p.reducedMotion !== 'boolean' ||
      !['off', 'reduced'].includes(p.lightning)) throw new TypeError('Invalid weather preferences');
  number(p.flash, 0, .12, 'flash'); number(p.cloudMotionScale, 0, 1, 'cloud motion');
  number(p.rainParticles, 0, 1024, 'rain particles'); number(p.cloudLayers, 1, 3, 'cloud layers');
  if (!Number.isInteger(p.rainParticles) || !Number.isInteger(p.cloudLayers)) throw new TypeError('Invalid presentation count');
  return { time, ...composed, sunScale: weather.atmosphere.sunScale, ambientScale: weather.atmosphere.ambientScale };
}
function daylightValues(value) {
  record(value, ['sunIntensity', 'ambientIntensity', 'fogColor'], 'daylight');
  const sunIntensity = number(value.sunIntensity, 0, 1000, 'daylight sun intensity');
  const ambientIntensity = number(value.ambientIntensity, 0, 1000, 'daylight ambient intensity');
  const fogColor = vector(value.fogColor, 1, 'linear fog color');
  if (fogColor.some(x => x < 0)) throw new TypeError('Invalid linear fog color');
  return { sunIntensity, ambientIntensity, fogColor };
}

function belongsToScene(light, scene) {
  for (let parent = light.parent; parent; parent = parent.parent) {
    if (parent === scene) return true;
    if (parent.isScene) return false; // A nested different scene is a different lighting owner.
  }
  return false;
}

export function createWeatherView(THREE, TSL, options) {
  record(options, ['scene', 'sun', 'ambient', 'sampleDaylight'], 'weather view options');
  const { scene, sun, ambient, sampleDaylight } = options;
  if (THREE?.REVISION !== '186' || !(scene instanceof THREE.Scene) ||
      !(sun instanceof THREE.Light) || !(ambient instanceof THREE.Light) || sun === ambient ||
      typeof sampleDaylight !== 'function') throw new TypeError('Three 0.186 Scene, distinct lights and daylight sampler required');
  if (!belongsToScene(sun, scene) || !belongsToScene(ambient, scene))
    throw new TypeError('Both weather lights must belong to the actual scene');
  if (owners.has(scene)) throw new Error('Weather view already owns this scene');
  const priorFog = scene.fogNode, priorSun = number(sun.intensity, -Infinity, Infinity, 'initial sun intensity');
  const priorAmbient = number(ambient.intensity, -Infinity, Infinity, 'initial ambient intensity');
  if (!TSL || ['Fn', 'uniform', 'fog', 'float', 'min', 'max'].some(key => typeof TSL[key] !== 'function') ||
      !TSL.positionWorld?.isNode || !TSL.cameraPosition?.isNode) throw new TypeError('Actual Three TSL fog/world-position API required');
  const { Fn, uniform, fog, float, min, max, positionWorld, cameraPosition } = TSL;
  const base = uniform(0).setName('originalWeatherFogBase');
  const sea = uniform(0).setName('originalWeatherFogSea');
  const falloff = uniform(1/300).setName('originalWeatherFogFalloff');
  const color = uniform(new THREE.Color(0, 0, 0)).setName('originalWeatherFogColor');
  // Original stable expm1 equivalent for nonnegative optical lengths. Clamp the polynomial input
  // so even an unselected branch stays finite for long rays; no float32 cancellation near zero.
  const oneMinusExpNegative = Fn(([x]) => {
    const s = x.min(.01), s2 = s.mul(s), s3 = s2.mul(s), s4 = s3.mul(s), s5 = s4.mul(s);
    const polynomial = s.sub(s2.mul(.5)).add(s3.div(6)).sub(s4.div(24)).add(s5.div(120));
    return x.lessThan(.01).select(polynomial, x.negate().exp().oneMinus());
  });
  const factor = Fn(() => {
    const low = min(cameraPosition.y, positionWorld.y).toVar();
    const high = max(cameraPosition.y, positionWorld.y).toVar();
    const dy = high.sub(low).toVar();
    const under = high.min(0).sub(low).max(0);
    const start = low.max(0), span = high.sub(start).max(0);
    const above = start.mul(falloff).negate().exp().mul(oneMinusExpNegative(span.mul(falloff))).div(falloff);
    const crossingMean = under.add(above).div(dy.max(1e-8));
    const flatMean = low.add(high).mul(.5).max(0).mul(falloff).negate().exp();
    const mean = dy.lessThan(1e-8).select(flatMean, crossingMean);
    const rayLength = positionWorld.sub(cameraPosition).length();
    return oneMinusExpNegative(rayLength.mul(base.add(sea.mul(mean)))).clamp(0, 1);
  })();
  const fogNode = fog(color, factor), lease = {};
  let disposed = false, applying = false, last = null, lastSun = null, lastAmbient = null;
  scene.fogNode = fogNode; owners.set(scene, lease);
  function owned() {
    if (disposed) throw new Error('Weather view disposed');
    if (owners.get(scene) !== lease || scene.fogNode !== fogNode) throw new Error('Weather view ownership conflict');
    if (!belongsToScene(sun, scene) || !belongsToScene(ambient, scene)) throw new Error('Weather light scene ownership conflict');
  }
  function applyEnvironment(frame) {
    if (applying) throw new Error('Reentrant weather application forbidden');
    applying = true;
    try {
      owned();
      const values = frameValues(frame);
      const daylight = daylightValues(sampleDaylight(values.time));
      const sunIntensity = daylight.sunIntensity*values.sunScale;
      const ambientIntensity = daylight.ambientIntensity*values.ambientScale;
      owned(); // The trusted PURE callback must not replace ownership while it is sampled.
      // All validation/callback work finishes before the first visible state mutation.
      base.value = values.fogBase; sea.value = values.fogSea; falloff.value = values.fogFalloff;
      color.value.setRGB(...daylight.fogColor);
      sun.intensity = sunIntensity; ambient.intensity = ambientIntensity;
      lastSun = sunIntensity; lastAmbient = ambientIntensity; last = values;
    } finally { applying = false; }
  }
  function dispose() {
    if (disposed) return;
    if (scene.fogNode === fogNode) scene.fogNode = priorFog;
    if (belongsToScene(sun, scene) && lastSun !== null && Object.is(sun.intensity, lastSun)) sun.intensity = priorSun;
    if (belongsToScene(ambient, scene) && lastAmbient !== null && Object.is(ambient.intensity, lastAmbient)) ambient.intensity = priorAmbient;
    if (owners.get(scene) === lease) owners.delete(scene);
    disposed = true;
    fogNode.dispose(); // Owned node only; never dispose caller scene/lights/materials.
  }
  return Object.freeze({ applyEnvironment, dispose,
    stats: () => Object.freeze({ disposed, ownsFog: !disposed && owners.get(scene) === lease && scene.fogNode === fogNode,
      simulationMs: last?.time ?? null, fogBase: base.value, fogSea: sea.value, fogFalloff: falloff.value,
      sunIntensity: lastSun, ambientIntensity: lastAmbient }) });
}
