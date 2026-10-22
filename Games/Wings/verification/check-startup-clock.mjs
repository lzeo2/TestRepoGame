#!/usr/bin/env node
// CPU gate/lifecycle check against applied authored scene source, not a GPU/readiness fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
assert(process.argv[2], 'Usage: node check-startup-clock.mjs PATH_TO_APPLIED_SRC/render/scene.ts');
const source = stripTypeScriptTypes(readFileSync(process.argv[2], 'utf8'));
const failStart = source.indexOf('let failed = false');
const failEnd = source.indexOf('renderer.onDeviceLost', failStart);
const gateStart = source.lastIndexOf('applyPixelRatio()');
const gateEnd = source.indexOf('if (import.meta.env.DEV)', gateStart);
assert(failStart >= 0 && failEnd > failStart && gateStart > failEnd && gateEnd > gateStart);
const owner = source.match(/disposeWorld = \(\) => world\.dispose\(\)/g);
assert.equal(owner?.length, 1, 'one real world cleanup owner');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const gate = new AsyncFunction('world', 'renderer', 'window', 'clearTimeout', 'onStatus', 'onFailure', 'control', `
  let resolveDraw, rejectDraw;
  const firstDraw = new Promise((resolve, reject) => { resolveDraw = resolve; rejectDraw = reject });
  const backend = 'webgl2', quality = 'low';
  const canvas = {classList:{remove(){}}}, resize = () => {}, applyPixelRatio = () => {};
  const loop = () => resolveDraw(); // Only the firstDraw contract is faked; never native acceptance.
  ${source.slice(failStart, failEnd)}
  ${owner[0]};
  control.fail = fail;
  ${source.slice(gateStart, gateEnd)}
`);
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const unhandled = [];
const onUnhandled = error => unhandled.push(error);
process.on('unhandledRejection', onUnhandled);
try {
  for (const mode of ['boot-timeout', 'worker-error', 'handshake-failure', 'draw-timeout', 'success']) {
    let now = 0, id = 0, resolveStart, rejectStart, disposed = 0;
    const tasks = new Map(), statuses = [], errors = [];
    const window = {setTimeout(fn, delay) { const key = ++id; tasks.set(key, {fn, at:now+delay}); return key; }, removeEventListener(){}};
    const clearTimeout = key => tasks.delete(key);
    const advance = async ms => {
      now += ms;
      for (const [key, task] of [...tasks]) if (task.at <= now) {tasks.delete(key); task.fn();}
      await flush();
    };
    const started = new Promise((resolve, reject) => {resolveStart=resolve; rejectStart=reject;});
    const world = {whenTerrainStarted:()=>started, dispose(){disposed++;}};
    const renderer = {callback:null, setAnimationLoop(fn){this.callback=fn;}}, control = {};
    const running = gate(world, renderer, window, clearTimeout, s=>statuses.push([s,now]), e=>errors.push(e), control);
    const settled = running.then(()=>({ok:true}), error=>({ok:false,error}));
    await flush();
    assert.equal(renderer.callback, null, 'render loop must not start before handshake');
    assert.deepEqual([...tasks.values()].map(t=>t.at), [30000], 'boot has its own bound');
    if (mode === 'boot-timeout') {
      await advance(30000);
    } else if (mode === 'worker-error') {
      rejectStart(new Error('injected worker startup error'));
      await flush();
    } else if (mode === 'handshake-failure') {
      resolveStart(); control.fail(new Error('same-turn device loss')); await flush();
      assert.deepEqual(statuses, [['terrain-start',0]], 'failed boot must not advance or reinstall its loop');
    } else {
      await advance(27000); resolveStart(); await flush();
      assert.equal(typeof renderer.callback, 'function');
      assert.deepEqual([...tasks.values()].map(t=>t.at), [47000], 'the full 20s starts after real handshake');
      if (mode === 'draw-timeout') await advance(20000);
      else {await advance(19000); renderer.callback(); await flush();}
    }
    const result = await settled;
    assert.equal(result.ok, mode === 'success', mode);
    assert.equal(disposed, mode === 'success' ? 0 : 1, `${mode}: cleanup exactly once`);
    assert.equal(errors.length, mode === 'success' ? 0 : 1);
    assert.equal(tasks.size, 0, `${mode}: no retained timer`);
    if (mode !== 'success') assert.equal(renderer.callback, null);
    else assert.deepEqual(statuses, [['terrain-start',0],['terrain-ready',27000]]);
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(unhandled, []);
  console.log('PASS CPU source gate: real handshake boundary, 30s boot / unchanged 20s draw, valid 27s+19s, handshake/failure race blocked, error/timeout cleanup once, no timers or unhandled rejection');
  console.log('LIMIT: fake clock and firstDraw promise; no GPU, generated-world readiness, browser timing or gameplay acceptance');
} finally {
  process.off('unhandledRejection', onUnhandled);
}
