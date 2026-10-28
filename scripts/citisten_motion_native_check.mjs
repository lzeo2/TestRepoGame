// node --experimental-vm-modules scripts/citisten_motion_native_check.mjs
// Fake DOM/world/RAF with the real native/UI/loop/sim/save dependency graph.
// This checks observer integration, not browser input, GPU or visual acceptance.
import assert from 'node:assert/strict';
import { runContinueScenario } from '../Games/Citisten3D/continue-loop-check.mjs';

async function exercise(recording) {
  const trace = [], pages = [];
  await runContinueScenario({ onMounted(page) {
    const { context, window, frames, renders, inspect, node, event } = page;
    const timers = new Map(); let timerId = 0, staleTimer;
    const snapshot = () => JSON.stringify(inspect().sim?.snapshot() ?? null);
    const saved = () => context.localStorage.getItem('citisten-save-v1');
    const report = () => window.citisten.motionReport;
    context.setTimeout = (fn, delay) => {
      timers.set(++timerId, { fn, at: context.performance.now() + delay }); return timerId;
    };
    context.clearTimeout = id => timers.delete(id);
    assert.equal(report(), null, 'diagnostic is off by default');
    const world = window.citisten.world;
    // Explicit fixture counters, not GPU observations. The hook must read AFTER render.
    world.renderer = { info: { render: { frame: 0, calls: 1, triangles: 0 }, memory: { geometries: 0, textures: 0 } } };
    const render = world.render;
    world.render = dt => { render(dt); world.renderer.info.render.frame++; };
    const pageNumber = pages.length; pages.push(page);
    let first = true;
    function start(targetOnly = false) {
      const before = snapshot(), bytes = saved(), count = frames.size;
      const button = node('#motion-check');
      if (!targetOnly) window.dispatchEvent(event('click', button));
      if (recording) button.dispatchEvent(event('click', button));
      assert.equal(snapshot(), before, 'starting observer cannot change simulation');
      assert.equal(saved(), bytes, 'starting observer cannot overwrite original save bytes');
      assert.equal(frames.size, targetOnly ? count : 1, 'only ordinary capture wake owns a frame');
      if (recording) {
        assert.equal(report().sampleCount, 0, 'start does not sample or render');
        assert.equal(report().finishReason, null);
        assert.equal(timers.size, 1);
        // Duplicate target activation cannot replace the running capture or timer.
        button.dispatchEvent(event('click', button));
        assert.equal(timers.size, 1);
      }
    }
    const step = page.step;
    page.step = ms => {
      if (first) { first = false; start(); }
      step(ms);
      if (pageNumber === 0 && ms === 0) {
        const output = node('#motion-report'), skip = node('#skip-night'), sim = inspect().sim;
        const hidden = skip.hidden, disabled = skip.disabled, closest = output.closest, skipToNight = sim.skipToNight;
        output.closest = selector => selector.split(',').includes('textarea') ? output : null;
        skip.hidden = false; skip.disabled = false;
        sim.skipToNight = () => assert.fail('report focus must not trigger defense skip');
        try {
          window.dispatchEvent(event('keydown', output, { code: 'KeyS' }));
          window.dispatchEvent(event('keydown', output, { code: 'Escape' }));
          assert.equal(inspect().paused, false, 'report focus cannot invoke game shortcuts');
        } finally {
          skip.hidden = hidden; skip.disabled = disabled; output.closest = closest; sim.skipToNight = skipToNight;
        }
      }
      if (recording && pageNumber === 0 && ms === 0) {
        assert.equal(report().sampleCount, 1);
        assert.equal(report().first.render.frame, 1, 'sample sees completed render counter');
        assert.equal(report().first.sim.time, inspect().sim.state.time);
      }
      if (recording && pageNumber === 1 && ms === 5000) {
        assert.equal(report().sampleCount, 0, 'first callback at deadline is not invented coverage');
        assert.equal(report().finishReason, 'deadline');
        assert.equal(report().partial, true);
      }
      if (pageNumber === 0 && ms === 46000) {
        assert.equal(frames.size, 0, 'original paused loop sleeps');
        // Target-only dispatch deliberately isolates handler ownership from the
        // ordinary window capture wake. It is not physical browser input proof.
        start(true);
        if (recording) {
          const before = snapshot(), bytes = saved(), renderCount = renders.length;
          const [id, timer] = [...timers][0], now = context.performance.now;
          const update = inspect().sim.update, renderWorld = world.render;
          inspect().sim.update = () => assert.fail('deadline cannot update simulation');
          world.render = () => assert.fail('deadline cannot render');
          try {
            // Only the observer timer sees this controlled deadline clock. No
            // original scenario callback timestamp or assertion is changed.
            context.performance.now = () => timer.at;
            timers.delete(id); timer.fn();
          } finally {
            context.performance.now = now; inspect().sim.update = update; world.render = renderWorld;
          }
          assert.equal(frames.size, 0, 'finishing report does not wake sleeping native loop');
          assert.equal(renders.length, renderCount);
          assert.equal(snapshot(), before); assert.equal(saved(), bytes);
          assert.equal(report().sampleCount, 0); assert.equal(report().elapsedMs, 5000);
          assert.equal(report().partial, true);
          assert.equal(JSON.stringify(JSON.parse(node('#motion-report').value)), JSON.stringify(report()));
          assert.equal(node('#motion-check').disabled, false);
          // The next real Continue action must cancel this new capture before
          // replacing the old simulation/cohort, without changing that action.
          start(true);
        }
      }
      if (recording && pageNumber === 0 && ms === 47000) {
        assert.equal(report().finishReason, 'cancelled', 'Continue invalidates previous town cohort');
        assert.equal(timers.size, 0);
      }
      if (recording && pageNumber === 0 && ms === 47900) {
        start(true); staleTimer = [...timers.values()][0].fn;
      }
      trace.push([pageNumber, ms, snapshot(), saved(), renders.length, frames.size]);
    };
    window.addEventListener('pagehide', () => {
      assert.equal(timers.size, 0, 'pagehide clears observer timer');
      assert.equal(frames.size, 0);
      const status = node('#motion-status').textContent;
      staleTimer?.();
      assert.equal(node('#motion-status').textContent, status, 'stale timer cannot write after disposal');
      if (recording && pageNumber === 0) assert.equal(report().finishReason, 'disposed');
    });
  } });
  assert.equal(pages.length, 2);
  return trace;
}

const baseline = await exercise(false), observed = await exercise(true);
assert.deepEqual(observed, baseline, 'all original native callback snapshots/save bytes/render counts/frame ownership are identical');
console.log(`MOTION NATIVE PASS: ${baseline.length} callback checkpoints x observer off/on; full snapshots/save bytes/render counts/one-owner identical; paused zero-frame deadline, Continue cancellation and pagehide cleanup`);
console.log('LIMIT: controlled VM clocks/fake DOM/world/RAF; native Water/Save/Continue and visible shaking remain unpassed');
