// CPU/static diagnostics checks only. No renderer, browser or GPU acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../source/games/wings/src/render/scene.ts', import.meta.url), 'utf8');
const js = stripTypeScriptTypes(source, { mode: 'transform' });
assert.ok(js.includes('export async function createSceneHost'));
console.log('PASS CPU/static: actual scene.ts TypeScript transform');

const observer = source.slice(source.indexOf('  const startup ='), source.indexOf('  const forceWebGL ='));
const init = source.slice(source.indexOf('  try { await renderer.init() }'), source.indexOf('  // WebGL2 without'));
const terrainGuard = `    // Keep terrain updates and async replies progressing before the first expensive render.
    // Once startup completes, temporary terrain gaps must not pause normal flight rendering.
    if (!worldReadyReported && !world.ready()) {
      startup.phase = "awaiting-terrain"
      return
    }

`;
assert.equal(source.split(terrainGuard).length, 2);
assert.ok(source.includes(`${terrainGuard}    renderer.info.reset()`));
// Remove only the specific startup guard and observer patch; preserve the original hash.
const original = source.replace(terrainGuard, '').replace(observer, '').replace(init, '  await renderer.init()\n')
  .replace(', type WorldViewDebug', '')
  .replace(/^.*(?:startup\.|observedRenderer =|observedBackend =|observedWorld =).*\n/gm, '')
  .replace('  renderer.debug.onShaderError', '  let shaderError = ""\n  renderer.debug.onShaderError');
assert.equal(createHash('sha256').update(original).digest('hex'), '72f9b950a3863cf1765952c6d67ec83f183989ca98a5f05239adec51a6adddab');
assert.ok(source.includes('const drawTimeout = window.setTimeout(() => fail("First scene draw timed out"), 20000)'));
assert.ok(source.includes('renderer.setAnimationLoop(() => { try { loop() } catch (error) { fail(error) } })'));
assert.ok(source.includes('if (world.ready() && renderer.info.render.drawCalls === 0) throw new Error("No scene draw calls were submitted")'));
assert.ok(source.includes('if (!worldReadyReported && world.ready()) {'));
assert.ok(source.indexOf('startup.callbacks++') < source.indexOf('if (cap > 0 && now - last'));
assert.ok(source.indexOf('startup.pacedFrames++') > source.indexOf('if (cap > 0 && now - last'));
assert.ok(source.includes('else renderer.render(scene, camera)\n    startup.completedRenders++; startup.phase = "render-return"'));
console.log('PASS CPU/static: exact original render/quality/timer/readiness code preserved; counters bracket pacing/render');

const context = createContext({ window: { __wings: { perf: { marker: 1 } } } });
runInContext(stripTypeScriptTypes(observer, { mode: 'transform' }), context);
const snapshot = () => JSON.parse(JSON.stringify(context.window.__wings.startup));
assert.equal(snapshot().phase, 'renderer-init');
assert.equal(snapshot().worldReady, null);
assert.equal(snapshot().render, null);
assert.equal(snapshot().backend, null);
assert.equal(Object.getOwnPropertyDescriptor(context.window.__wings, 'startup').set, undefined);
assert.equal(context.window.__wings.perf.marker, 1);
runInContext(`
  let readyReads = 0;
  observedRenderer = { info: { render: { calls: 9, frameCalls: 2, drawCalls: 7, triangles: 80, points: 3, lines: 4, privateHandle: {} } } };
  observedWorld = { ready: () => { readyReads++; return false }, stats: () => ({ clusters: 2, visibleClusters: 1, pending: 4, trees: 6, triangles: 80, lastWorkMs: 1, maxWorkMs: 2, shoreProgress: 0.25, privateHandle: {} }) };
  observedBackend = 'webgl2'; shaderError = 'x'.repeat(5000);
  startup.callbacks = 3; startup.pacedFrames = 2; startup.completedRenders = 1;
`, context);
assert.equal(runInContext('readyReads', context), 0);
const dto = context.window.__wings.startup;
assert.equal(runInContext('readyReads', context), 1);
assert.equal(dto.shaderError.length, 4096);
assert.equal(dto.worldStats.shoreProgress, 0.25);
assert.equal(dto.render.drawCalls, 7);
assert.ok(!('privateHandle' in dto.render) && !('privateHandle' in dto.worldStats));
dto.phase = 'tampered'; dto.render.drawCalls = 0; dto.worldStats.pending = 0;
assert.equal(snapshot().phase, 'renderer-init');
assert.equal(snapshot().render.drawCalls, 7);
assert.equal(snapshot().worldStats.pending, 4);
assert.deepEqual([snapshot().callbacks, snapshot().pacedFrames, snapshot().completedRenders], [3, 2, 1]);
console.log('PASS CPU/static: pre-world getter, detached bounded DTO, namespace preserved, on-query world readiness');

// Execute the actual init failure observer with a rejecting CPU stub.
runInContext('const renderer = { init: async () => { throw new Error("init rejected") } }', context);
await assert.rejects(runInContext(`(async () => { ${stripTypeScriptTypes(init, { mode: 'transform' })} })()`, context), /init rejected/);
assert.equal(snapshot().phase, 'failed');
assert.equal(snapshot().blockedAt, 'renderer-init');
assert.equal(snapshot().error, 'init rejected');
// Execute the actual fail handler with only its existing side effects stubbed.
const fail = source.slice(source.indexOf('  const fail ='), source.indexOf('  renderer.onDeviceLost'));
runInContext(`let failed = false; const backend = 'webgl2', quality = 'low';
  renderer.setAnimationLoop = () => {}; const canvas = { classList: { remove() {} } };
  const resize = () => {}; window.removeEventListener = () => {};
  let rejected = '', reported = ''; const rejectDraw = e => { rejected = e.message }; const onFailure = e => { reported = e.message };
  startup.phase = 'render-return';
  ${stripTypeScriptTypes(fail, { mode: 'transform' })}
  fail('First scene draw timed out'); fail('later error');`, context);
assert.equal(snapshot().phase, 'failed');
assert.equal(snapshot().blockedAt, 'render-return');
assert.equal(snapshot().error, 'First scene draw timed out');
assert.equal(runInContext('rejected', context), 'Unsupported renderer (webgl2, low): First scene draw timed out');
assert.equal(runInContext('reported === rejected', context), true);
console.log('PASS CPU/static: init rejection and first failure retain blockedAt/cause; original failure propagation');
// Execute the actual loop, with CPU stubs only: no GPU/worker performance proof.
const loopStart = source.indexOf('  const loop = () => {');
const loopEnd = source.indexOf('  // ---- adaptive resolution:', loopStart);
assert.ok(loopStart >= 0 && loopEnd > loopStart);
const loopJs = stripTypeScriptTypes(source.slice(loopStart, loopEnd), { mode: 'transform' })
  .replaceAll('import.meta.env.DEV', 'false');
function loopFixture(usePipeline) {
  const calls = [];
  const state = {
    calls, terrainReply: false, terrainReady: false, draws: 1, resolutions: 0,
    startup: { callbacks: 0, pacedFrames: 0, completedRenders: 0 },
    performance: { now: () => state.now }, now: 0, last: 0,
    benchmarking: false, devNoCap: false, MENU_FPS: 30, BACKGROUND_FPS: 30,
    PLAY_FPS: { low: 60, balanced: 60 }, host: { quality: usePipeline ? 'balanced' : 'low' },
    document: { hasFocus: () => true, getElementById: () => ({ classList: { add: name => calls.push(name) } }) },
    frameFn: () => calls.push('frame'), adapt: () => calls.push('adapt'), frame: 0,
    camera: { position: {} }, scene: {}, speedKmh: 0, streakAmt: 0, boosting: false,
    streaks: { mesh: {}, uSpeed: {}, uOpacity: {} }, uBlur: {}, uExposure: {}, uBloom: {}, flash: 0,
    world: {
      update: () => { calls.push('update'); if (state.terrainReply) state.terrainReady = true; },
      prepareShadows: () => calls.push('shadows'), ready: () => state.terrainReady,
    },
    effects: { update: () => calls.push('effects') },
    worldReadyReported: false, shaderError: '', fallback: null,
    sampleGpu: () => calls.push('sampleGpu'), stats: { frameMs: 0 }, fpsFrames: 0, fpsT: 0,
    canvas: { classList: { add: name => calls.push(name) } },
    onStatus: status => calls.push(status), resolveDraw: () => { state.resolutions++; calls.push('resolve'); },
  };
  const render = route => {
    calls.push(route);
    state.renderer.info.render.drawCalls = state.draws;
  };
  state.renderer = {
    info: { render: { drawCalls: 0 }, reset: () => { calls.push('reset'); state.renderer.info.render.drawCalls = 0; } },
    render: (scene, camera) => { assert.equal(scene, state.scene); assert.equal(camera, state.camera); render('render'); },
  };
  state.pipeline = usePipeline ? { render: () => render('pipeline') } : null;
  const vm = createContext(state);
  runInContext(loopJs, vm);
  return { state, tick: () => { state.now += 40; runInContext('loop()', vm); } };
}
for (const usePipeline of [false, true]) {
  const route = usePipeline ? 'pipeline' : 'render';
  const { state: s, tick } = loopFixture(usePipeline);
  const updates = ['adapt', 'frame', 'update', 'shadows', 'effects'];
  tick(); tick();
  assert.deepEqual(s.calls, [...updates, ...updates]);
  assert.deepEqual([s.startup.callbacks, s.startup.pacedFrames, s.startup.completedRenders], [2, 2, 0]);
  assert.equal(s.startup.phase, 'awaiting-terrain');
  assert.equal(s.resolutions, 0);
  assert.equal(s.worldReadyReported, false);
  console.log(`PASS CPU actual-loop ${route}: two cold frames keep updates/shadows/effects, no reset/render/resolve`);

  s.calls.length = 0;
  s.terrainReply = true; // Deliver a controlled reply; the next actual world.update consumes it.
  tick();
  assert.deepEqual(s.calls, [...updates, 'reset', route, 'sampleGpu', 'ready', 'fade', 'world', 'resolve']);
  assert.equal(s.renderer.info.render.drawCalls, 1);
  assert.equal(s.startup.completedRenders, 1);
  assert.equal(s.resolutions, 1);
  assert.equal(s.worldReadyReported, true);
  assert.equal(s.startup.phase, 'ready');
  console.log(`PASS CPU actual-loop ${route}: terrain reply enables one full render and nonzero-draw readiness resolution`);

  s.calls.length = 0;
  s.terrainReply = false; s.terrainReady = false;
  tick();
  assert.deepEqual(s.calls, [...updates, 'reset', route, 'sampleGpu']);
  assert.equal(s.startup.completedRenders, 2);
  assert.equal(s.resolutions, 1);
  assert.equal(s.worldReadyReported, true);
  console.log(`PASS CPU actual-loop ${route}: post-start terrain gap still renders without resolving again`);

  for (const shaderFailure of [false, true]) {
    const bad = loopFixture(usePipeline);
    bad.state.terrainReply = true;
    bad.state.draws = shaderFailure ? 1 : 0;
    bad.state.shaderError = shaderFailure ? 'controlled shader failure' : '';
    assert.throws(bad.tick, shaderFailure ? /controlled shader failure/ : /No scene draw calls were submitted/);
    assert.deepEqual(bad.state.calls, [...updates, 'reset', route]);
    assert.equal(bad.state.startup.completedRenders, 1);
    assert.equal(bad.state.resolutions, 0);
    assert.equal(bad.state.worldReadyReported, false);
    console.log(`PASS CPU actual-loop ${route}: ${shaderFailure ? 'shader failure' : 'ready with zero draws'} still throws before readiness resolution`);
  }
}
console.log('4 preserved CPU/static groups + 10 actual-loop CPU cases passed; GPU/native startup remains unproven');
