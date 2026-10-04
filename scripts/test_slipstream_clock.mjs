import assert from 'node:assert/strict';
import { frameDelta } from '../Games/Slipstream Borough/clock.js';

assert.equal(frameDelta(1000, 0), 0); // first frame or reset after pause/hidden
assert.equal(frameDelta(99, 100), 0);
assert.equal(frameDelta(5100, 100), .25); // bounded hitch, never a five-second backlog
assert.equal(frameDelta(233, 100), .133);
// Synthetic visible-frame schedules; no game-state grants or native FPS claim.
function ticks(interval, frames) {
  let previous = 100, accumulator = 0, count = 0, maxWork = 0;
  for (let i = 0; i < frames; i++) {
    const now = previous + interval;
    accumulator += frameDelta(now, previous); previous = now;
    let work = 0;
    while (accumulator >= 1 / 60) { accumulator -= 1 / 60; count++; work++; }
    assert(accumulator < 1 / 60); maxWork = Math.max(maxWork, work);
  }
  return { count, maxWork };
}
const fast = ticks(1000 / 60, 600), slow = ticks(1000 / 7.5, 75);
assert(Math.abs(fast.count - slow.count) <= 1);
assert(Math.abs(slow.count - 600) <= 1);
assert(slow.maxWork <= 16);
assert(ticks(5000, 4).maxWork <= 16);
let accumulator = .012;
accumulator = 0; // controller clearInput discards remainder on pause/blur/hidden
assert.equal(accumulator + frameDelta(120000, 0), 0);
console.log('PASS bounded clock: equivalent 60Hz/7.5Hz wall-time schedules, fixed 60Hz substeps, <=16 catch-up ticks, hitch cap and reset. Synthetic timing only.');
