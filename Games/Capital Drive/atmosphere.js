// Original deterministic arcade atmosphere; all time comes from the game loop.
const DAY_SECONDS = 720, WEATHER_SECONDS = 120, TRANSITION_SECONDS = 30;
const STATES = Object.freeze([
  Object.freeze({ id: 'clear', cloud: 0, rain: 0, haze: .12, wetness: 0 }),
  Object.freeze({ id: 'overcast', cloud: .8, rain: 0, haze: .45, wetness: .15 }),
  Object.freeze({ id: 'rain', cloud: 1, rain: 1, haze: .8, wetness: 1 }),
]);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, weight) => a + (b - a) * weight;
function color(a, b, weight) {
  const channel = shift => Math.round(mix((a >> shift) & 255, (b >> shift) & 255, weight));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function createAtmosphere() {
  let elapsed = 0;
  function snapshot() {
    const hour = (15 + elapsed * 24 / DAY_SECONDS) % 24;
    const angle = (hour - 6) / 24 * Math.PI * 2, elevation = Math.sin(angle);
    const daylight = smooth((elevation + .12) / .52), twilight = clamp(1 - Math.abs(elevation) / .32);
    const weatherPhase = elapsed % (WEATHER_SECONDS * STATES.length), index = Math.floor(weatherPhase / WEATHER_SECONDS);
    const current = STATES[index], next = STATES[(index + 1) % STATES.length];
    const blend = smooth((weatherPhase % WEATHER_SECONDS - (WEATHER_SECONDS - TRANSITION_SECONDS)) / TRANSITION_SECONDS);
    const cloud = mix(current.cloud, next.cloud, blend), rain = mix(current.rain, next.rain, blend);
    const haze = mix(current.haze, next.haze, blend), wetness = mix(current.wetness, next.wetness, blend);
    const daylightSky = color(0xa9c9d5, 0x8f9ba6, cloud * .72);
    const skyColor = color(color(0x182b43, daylightSky, daylight), 0xa87969, twilight * .22 * (1 - cloud));
    return Object.freeze({ elapsed, hour, daylight, weather: current.id, cloud, rain, haze, wetness,
      skyColor, fogColor: color(skyColor, 0x939fa5, haze * .25),
      hemisphereSkyColor: color(0x94aacd, 0xf8f5dc, daylight), hemisphereGroundColor: color(0x4a5149, 0x697258, daylight),
      hemisphereIntensity: .72 + daylight * .58 - rain * .08,
      sunColor: color(0xffb77c, 0xfff0ce, daylight), sunIntensity: .08 + daylight * 1.92 * (1 - cloud * .68),
      sunX: Math.cos(angle) * -430, sunY: Math.max(35, elevation * 500), sunZ: 180,
      fogNear: 230 - haze * 85, fogFar: 750 - haze * 230 - (1 - daylight) * 60,
      windX: 1.4 + Math.sin(elapsed * .037) * .6, windZ: -.6 + Math.cos(elapsed * .029) * .4 });
  }
  return { step(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Atmosphere dt must be finite and nonnegative.');
    // Both weather and the day repeat exactly within this bounded phase.
    elapsed = (elapsed + dt % DAY_SECONDS) % DAY_SECONDS;
  }, snapshot, reset() { elapsed = 0; } };
}
