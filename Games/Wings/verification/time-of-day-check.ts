import assert from 'node:assert/strict'
import { DAY_LENGTH_SECONDS, START_HOUR, sampleTimeOfDay } from './src/sim/time-of-day'

const close = (actual: number, expected: number, epsilon = 1e-10) =>
  assert(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`)
const atHour = (hour: number) => (hour - START_HOUR) / 24 * DAY_LENGTH_SECONDS
const values = (seconds: number) => {
  const { hour, sun, ...lighting } = sampleTimeOfDay(seconds)
  return [hour, ...sun, ...Object.values(lighting)]
}

assert.equal(DAY_LENGTH_SECONDS, 600)
assert.equal(START_HOUR, 9)
assert.equal(sampleTimeOfDay(0).hour, 9)
assert.equal(sampleTimeOfDay(-DAY_LENGTH_SECONDS).hour, 9)
close(sampleTimeOfDay(-1).hour, 9 - 24 / 600)
for (let seconds = -1200; seconds <= 1200; seconds += 12.5) {
  const a = values(seconds), b = values(seconds + DAY_LENGTH_SECONDS)
  a.forEach((v, i) => close(v, b[i]))
}

const bounded = (value: number, min: number, max: number) => {
  assert(Number.isFinite(value))
  assert(value >= min - 1e-12 && value <= max + 1e-12, `${value} outside [${min}, ${max}]`)
}
const checkBounds = (seconds: number) => {
  const s = sampleTimeOfDay(seconds)
  assert(Number.isFinite(s.hour) && s.hour >= 0 && s.hour < 24)
  close(Math.hypot(...s.sun), 1)
  s.sun.forEach(v => bounded(v, -1, 1))
  for (const v of [s.daylight, s.twilight, s.night]) bounded(v, 0, 1)
  close(s.daylight + s.night, 1)
  bounded(s.sunIntensity, 0, 2.4)
  bounded(s.ambientIntensity, 0.06, 1.4)
  bounded(s.fogBase, 0.00005, 0.00075)
  bounded(s.fogSea, 0.0003, 0.0011)
  if (s.sun[1] <= 0) assert.equal(s.sunIntensity, 0)
}
for (let seconds = -1200; seconds <= 1200; seconds += 0.5) checkBounds(seconds)
for (const seconds of [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE]) checkBounds(seconds)

const sunrise = sampleTimeOfDay(atHour(6))
const sunset = sampleTimeOfDay(atHour(18))
const noon = sampleTimeOfDay(atHour(12))
const midnight = sampleTimeOfDay(atHour(0))
assert(sunrise.sun[0] > 0.99 && sunset.sun[0] < -0.99)
assert(-sunrise.sun[0] < 0 && -sunset.sun[0] > 0, 'ground shadows point west at sunrise, east at sunset')
close(sunrise.sun[1], 0)
close(sunset.sun[1], 0)
close(noon.sun[1], Math.cos(0.35))
assert(noon.sun[1] > sampleTimeOfDay(atHour(11)).sun[1])
assert(noon.sun[1] > sampleTimeOfDay(atHour(13)).sun[1])
close(sunrise.twilight, 1)
close(sunset.twilight, 1)
assert(sampleTimeOfDay(atHour(18.1)).twilight > 0.9, 'retain warmth after sunset')
assert.equal(noon.twilight, 0)
assert.equal(midnight.twilight, 0)
close(noon.sunIntensity, 2.4)
close(midnight.sunIntensity, 0)
close(noon.ambientIntensity, 1.4)
close(midnight.ambientIntensity, 0.06)
close(noon.fogBase, 0.00005)
close(midnight.fogBase, 0.00075)
close(noon.fogSea, 0.0003)
close(midnight.fogSea, 0.0011)
assert(midnight.sunIntensity < noon.sunIntensity && midnight.ambientIntensity < noon.ambientIntensity)
assert(midnight.fogBase > noon.fogBase && midnight.fogSea > noon.fogSea)

// Compare the circular hour separately at midnight; all physical outputs stay continuous.
for (const seconds of [atHour(6), atHour(18), atHour(24), 0, DAY_LENGTH_SECONDS]) {
  const a = values(seconds - 0.001), b = values(seconds + 0.001)
  const hourDistance = Math.abs(a[0] - b[0])
  assert(Math.min(hourDistance, 24 - hourDistance) < 0.001)
  a.slice(1).forEach((v, i) => close(v, b[i + 1], 0.001))
}

// Different exact-binary tick partitions and unrelated calls cannot change a sample.
for (const step of [0.25, 0.5, 1, 2]) {
  let seconds = 0
  for (let i = 0; i < 800 / step; i++) {
    seconds += step
    sampleTimeOfDay(seconds)
  }
  assert.deepEqual(sampleTimeOfDay(seconds), sampleTimeOfDay(800))
}
const snapshot = sampleTimeOfDay(123)
snapshot.sun[0] = 42
assert.notDeepEqual(sampleTimeOfDay(123), snapshot, 'samples do not share mutable direction arrays')
for (const seconds of [NaN, Infinity, -Infinity]) assert.throws(() => sampleTimeOfDay(seconds), RangeError)
console.log('PASS: time-of-day cycle/start/negative wrap; 4801 sweep samples; unit sun/bounds; shadows; night lights/fog; continuity; partition independence; nonfinite rejection')
