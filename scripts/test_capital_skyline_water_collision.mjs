import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';

// Repro for the Skylark river collision: the Molonglo river arm (polygon
// 1096148140) cuts through the west half of the freight yard, so on-foot
// routes between job caches hit an invisible wall. The fix is a yard-scoped
// water exemption that script.js enables only while the Skylark job runs.
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
map.lakeWaterLevel = 5.93;

const river = map.areas.find(area => String(area.id) === '1096148140');
assert(river, 'the real Molonglo river arm polygon 1096148140 is loaded');
const xs = river.points.map(p => p[0]), zs = river.points.map(p => p[1]);
assert(Math.min(...xs) < 2796 && Math.max(...xs) > 2589 && Math.min(...zs) < 2974 && Math.max(...zs) > 2669,
  'the river arm bbox matches the verified yard overlap x[2589,2795] z[2669,2973]');

const SITE = { x: 2760, z: 2750 }, YARD_RADIUS = 283;
const yard = (x, z) => Math.hypot(x - SITE.x, z - SITE.z) <= YARD_RADIUS;

// Probe points recomputed from the data: at z=2800 the channel inside the yard
// spans roughly x 2670..2715, so a walk from 2665 to 2720 crosses it on land
// at both ends. The outside control crosses the shoreline of water polygon
// 1016737478 at z=2660, which spans roughly x 1205..1305, far outside the yard.
const yardStep = { from: { x: 2665, z: 2800 }, dx: 55, dz: 0 };
const outsideStep = { from: { x: 1200, z: 2660 }, dx: 110, dz: 0 };
for (const point of [yardStep.from, { x: yardStep.from.x + yardStep.dx, z: yardStep.from.z }])
  assert(yard(point.x, point.z), `yard probe ${point.x},${point.z} is inside the yard ring`);
assert(!yard(outsideStep.from.x, outsideStep.from.z) && !yard(outsideStep.from.x + outsideStep.dx, outsideStep.from.z),
  'control probes stay outside the yard ring');

// sweepActor clamps each call to 8m, so walk the legs in 5m chunks like the
// game does across frames.
function walk(sim, from, dx, dz, chunk = 5) {
  const actor = { ...from };
  const length = Math.hypot(dx, dz), n = Math.round(length / chunk);
  let blocked = false;
  for (let i = 0; i < n; i++) {
    const step = sim.moveActor(actor, dx / n, dz / n, .45);
    blocked = blocked || step.blocked;
    if (!step.moved) break;
  }
  return { blocked, actor };
}

const vanilla = createSimulation(map, { trafficCount: 0 });
const mission = createSimulation(map, { trafficCount: 0, waterExemption: yard });
const idle = createSimulation(map, { trafficCount: 0, waterExemption: () => false });

// (a) Pre-fix: the on-foot step across the river arm inside the yard is blocked.
const pre = walk(vanilla, yardStep.from, yardStep.dx, yardStep.dz);
assert(pre.blocked === true, 'pre-fix the yard channel crossing is blocked by water');
assert(pre.actor.x < 2670, 'pre-fix the actor stops at the channel shoreline');

// After the fix, the same step inside the yard crosses cleanly.
const crossed = walk(mission, yardStep.from, yardStep.dx, yardStep.dz);
assert(crossed.blocked === false, 'yard-scoped exemption lets the crossing through');
assert(Math.abs(crossed.actor.x - 2720) < 1e-6 && crossed.actor.z === 2800, 'the actor reaches the far bank inside the yard');

// The exemption is reversible: with the job inactive the wall returns.
const restored = walk(idle, yardStep.from, yardStep.dx, yardStep.dz);
assert(restored.blocked === true && restored.actor.x < 2670, 'inactive exemption restores the pre-fix wall');

// (b) Control: the same kind of step outside the yard stays blocked pre and post.
const preOutside = walk(vanilla, outsideStep.from, outsideStep.dx, outsideStep.dz);
const postOutside = walk(mission, outsideStep.from, outsideStep.dx, outsideStep.dz);
assert(preOutside.blocked === true && preOutside.actor.x < 1210, 'outside the yard the shoreline blocks pre-fix');
assert(postOutside.blocked === true && postOutside.actor.x < 1210, 'outside the yard the shoreline still blocks post-fix');

// The ATV spawn seam: vehicle occupancy in the channel only clears inside the yard.
const atvBody = { id: 'skyline-atv-probe', x: 2690, z: 2780, yaw: 0, length: 2, width: 1.6 };
assert(vanilla.canOccupy(atvBody) === false, 'pre-fix water blocks ATV occupancy in the channel');
assert(mission.canOccupy(atvBody) === true, 'the yard exemption clears ATV occupancy in the channel');
assert(idle.canOccupy(atvBody) === false, 'inactive exemption keeps ATV occupancy blocked');

// Swimming and shore detection are untouched by the seam: the river arm has no
// surface, so waterAt keeps reporting no swimmable surface in every variant.
for (const sim of [vanilla, mission, idle]) {
  assert.equal(sim.waterAt(2690, 2780, { underBridge: true }), null,
    'waterAt stays byte-identical: the surfaceless river arm is never swimmable');
  assert.equal(sim.waterAt(2690, 2780), null, 'the shore check without options is unchanged too');
}

console.log('capital skyline water collision: yard-scoped exemption verified, outside-yard water unchanged');
