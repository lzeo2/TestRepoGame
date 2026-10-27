export const DAY_LENGTH_SECONDS = 600
export const START_HOUR = 9

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Absolute simulation seconds, not wall time or accumulated render dt.
// Zero starts at 09:00; every 600 seconds repeats, including negative times.
export function sampleTimeOfDay(seconds: number) {
  if (!Number.isFinite(seconds)) throw new RangeError('Time of day requires finite seconds')
  // Reduce before scaling so even the largest finite input cannot overflow.
  const phase = ((seconds % DAY_LENGTH_SECONDS) + DAY_LENGTH_SECONDS) % DAY_LENGTH_SECONDS
  const hour = (START_HOUR + phase / DAY_LENGTH_SECONDS * 24) % 24
  const angle = (hour - 6) / 24 * Math.PI * 2
  const tilt = 0.35
  // Unit direction toward the sun: +X east at 06:00, -X west at 18:00, +Y up.
  const sun: [number, number, number] = [
    Math.cos(angle),
    Math.sin(angle) * Math.cos(tilt),
    Math.sin(angle) * Math.sin(tilt),
  ]
  const daylight = smoothstep(-0.12, 0.25, sun[1])
  const night = 1 - daylight
  // Keep horizon warmth through sunset and just below it, without a clock seam.
  const twilight = 1 - smoothstep(0, 0.28, Math.abs(sun[1]))
  return {
    hour, sun, daylight, twilight, night,
    sunIntensity: 2.4 * smoothstep(0, 0.25, sun[1]),
    ambientIntensity: 0.06 + 1.34 * daylight,
    fogBase: 0.00005 + 0.0007 * night,
    fogSea: 0.0003 + 0.0008 * night,
  }
}
