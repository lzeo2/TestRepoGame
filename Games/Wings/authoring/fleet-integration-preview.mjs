// Bounded diagnostic for ORIGINAL modules, not a game/host replacement or upstream integration.
import * as T from 'three';
import * as TSL from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFactionsComposition } from './fleet-composition.mjs';
import { createWeatherView } from './weather/weather-view.mjs';
import { createSeaView } from './fleet-sea-view.mjs';

const SCOPE = 'ORIGINAL MODULE INTEGRATION PREVIEW; not served Factions, natural flight, real-class ASW or hardware acceptance';
// Required authority schema only: no aircraft are spawned and no flight host is supplied.
const AIRCRAFT_FIXTURE = [[{ id: 'planeA', weapons: [] }], [{ id: 'planeB', weapons: [] }]];
const SIMULATION_RATE = 4; // Explicit time-compressed diagnostic, not game speed or a performance claim.
const $ = id => document.getElementById(id);
const assert = (condition, message) => { if (!condition) throw Error(message); };
const identity = {}, actor = {}, scene = new T.Scene();
const camera = new T.PerspectiveCamera(38, 1, .1, 22000);
scene.background = new T.Color('#c2cbd0');
const sun = new T.DirectionalLight(0xfff3dd, 3), ambient = new T.HemisphereLight(0xeaf1ff, 0x59605a, 2);
sun.position.set(-300, 600, -500); scene.add(sun, ambient);
const prepared = [], loadedScenes = [], owned = new WeakSet(), terrainResources = [];
const inputs = [...document.querySelectorAll('button,select')];
const listeners = new AbortController();
let renderer, controls, environment, app, consumer, sea, lease, sequence = 0, animation = 0, running = false;
let previousSeaFrame = null, seaFrame = null, trackingCamera = false;
let lastTime = 0, wakeTimer = 0, disposed = false, busy = true, ready = false, error = null;
let drawCalls = 0, triangles = 0, backend = null, resets = 0, phase = 'loading';
const disposeResource = resource => { if (resource && !owned.has(resource)) { owned.add(resource); resource.dispose(); } };
function stage(value, message) {
  phase = value; $('status').textContent = message;
  console.info('ORIGINAL-PREVIEW stage: ' + value);
}
function disposeTerrain() {
  const errors = [];
  for (const mesh of terrainResources.splice(0)) for (const action of [
    () => mesh.removeFromParent(), () => disposeResource(mesh.geometry), () => disposeResource(mesh.material)]) {
    try { action(); } catch (failure) { errors.push(failure); }
  }
  if (errors.length) throw new AggregateError(errors, 'Preview terrain cleanup failed');
}
function dispose() {
  if (disposed) return { disposed: true, animationActive: false, activeSessions: 0 };
  disposed = true; ready = false; running = false;
  cancelAnimationFrame(animation); clearTimeout(wakeTimer); animation = 0; wakeTimer = 0; listeners.abort();
  const errors = [], attempt = action => { try { action(); } catch (failure) { errors.push(String(failure)); } };
  attempt(() => app?.dispose(identity)); attempt(() => sea?.dispose()); attempt(disposeTerrain); attempt(() => controls?.dispose());
  const resources = new Set();
  for (const object of loadedScenes) object.traverse(node => {
    if (!node.isMesh) return;
    resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of [...resources, environment, renderer]) attempt(() => disposeResource(resource));
  scene.environment = null; loadedScenes.length = 0; prepared.length = 0;
  return { disposed: true, animationActive: false, activeSessions: app?.stats().clients ?? 0,
    weatherDisposed: consumer?.stats().disposed ?? true, errors };
}
function fail(failure) {
  error = String(failure); phase = 'failed'; const cleanup = dispose();
  $('status').textContent = error + (cleanup.errors?.length ? ' | cleanup: ' + cleanup.errors.join('; ') : '');
  for (const input of inputs) input.disabled = true;
  console.error(error);
}
function inspect() {
  const frame = app && app.stats().status !== 'disposed' ? app.snapshot(actor) : null;
  return { scope: SCOPE, ready, error, tick: frame?.tick ?? null, paused: app?.stats().paused ?? !running,
    mapId: $('map').value, weatherPreset: $('weather').value, scenario: $('scenario').value,
    simulationMs: frame?.environment?.simulationMs ?? null, drawCalls, triangles,
    loadedModels: prepared.length, backend, resets, phase, simulationRate: SIMULATION_RATE, weather: consumer?.stats() ?? null,
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov, aspect: camera.aspect },
    lighting: { sun: sun.intensity, ambient: ambient.intensity, exposure: renderer?.toneMappingExposure ?? null },
    viewFailures: app?.stats().viewFailures ?? 0, sea: sea?.stats() ?? null,
    units: frame?.units.map(({ id, team, hp, maxHp, position }) => ({ id, team, hp, maxHp, position })) ?? [],
    events: frame?.events ?? [], outcome: frame?.outcome ?? null,
    poses: frame?.units.flatMap(unit => {
      const object = scene.getObjectByName('fleet-unit:' + unit.id);
      if (!object?.visible) return [];
      const nodes = [];
      object.traverse(node => { if (/propeller|rudder|plane|turret|gun/i.test(node.name))
        nodes.push({ name: node.name, quaternion: node.quaternion.toArray() }); });
      return [{ id: unit.id, position: object.position.toArray(), nodes }];
    }) ?? [] };
}
window.fleetIntegration = { get ready() { return ready; }, get error() { return error; }, scope: SCOPE, inspect, dispose };
function status() {
  const frame = app.snapshot(actor);
  const damage = frame.units.filter(unit => unit.hp < 1000).map(unit => unit.id + ' HP ' + unit.hp).join(', ');
  const result = frame.outcome ? ` | AI team ${frame.outcome.winner ?? 'draw'} outcome: ${frame.outcome.reason}` : '';
  $('status').textContent = `${running ? 'Running 4x diagnostic' : 'Paused (Run is 4x diagnostic)'} | tick ${frame.tick} | ${(frame.environment.simulationMs / 1000).toFixed(2)} sim s | ${$('weather').value} | ${drawCalls} draws, ${triangles.toLocaleString()} triangles${damage ? ' | ' + damage : ''}${result}`;
}
function draw(now = performance.now()) {
  cancelAnimationFrame(animation); clearTimeout(wakeTimer); animation = 0; wakeTimer = 0;
  if (disposed || busy) return;
  try {
    if (running) for (let i = 0; i < SIMULATION_RATE; i++)
      app.update(lease, { sequence: ++sequence, elapsedMs: Math.max(0, Math.min(250, Math.floor(now - lastTime))) });
    lastTime = now;
    const canvas = renderer.domElement, width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    if (running && $('camera').value === 'battle') frameCamera(false);
    updateSea(); camera.updateMatrixWorld(true); renderer.render(scene, camera);
    drawCalls = renderer.info.render.drawCalls; triangles = renderer.info.render.triangles;
    assert(drawCalls > 0 && triangles > 0, 'No actual integration-scene draw');
    const gl = renderer.backend.gl;
    assert(gl.getError() === gl.NO_ERROR, 'WebGL2 error in integration-scene draw');
    assert(app.stats().viewFailures === 0, 'Authority presentation failed');
    status();
    // ponytail: at most eight continuous diagnostic draws/s; leave input time on software renderers.
    // The one authority lease still advances the existing fixed 50 ms simulation, never a second clock.
    if (running) wakeTimer = setTimeout(() => { wakeTimer = 0; invalidate(); }, 125);
  } catch (failure) { fail(failure); }
}
function invalidate() {
  clearTimeout(wakeTimer); wakeTimer = 0;
  if (!disposed && !animation) animation = requestAnimationFrame(draw);
}
function frameCamera(redraw = true) {
  const frame = app.snapshot(actor), kind = $('camera').value;
  let center, offset;
  if (kind === 'overview') { center = new T.Vector3(0, 0, 0); offset = new T.Vector3(7200, 6500, 7800); }
  else if (kind === 'submarine' && frame.units.some(unit => unit.id === 'sub0')) {
    center = new T.Vector3(...frame.units.find(unit => unit.id === 'sub0').position);
    offset = new T.Vector3(110, 36, -115);
  } else {
    const patrol = frame.units.filter(unit => unit.id.startsWith('escort'));
    const escorts = patrol.length ? patrol : frame.units.filter(unit => unit.kind === 'surface' && unit.modelId);
    center = escorts.reduce((sum, unit) => sum.add(new T.Vector3(...unit.position)), new T.Vector3()).multiplyScalar(1 / Math.max(1, escorts.length));
    const separation = escorts.length === 2 ? new T.Vector3(...escorts[0].position).distanceTo(new T.Vector3(...escorts[1].position)) : 500;
    const distance = Math.max(230, separation * 1.45);
    offset = new T.Vector3(distance * .78, distance * .65, distance * .9);
  }
  camera.position.copy(center).add(offset); camera.lookAt(center); camera.updateMatrixWorld(true);
  controls.target.copy(center); trackingCamera = true;
  try { controls.update(); } finally { trackingCamera = false; }
  if (redraw) invalidate();
}
function updateSea() {
  const next = { ...app.snapshot(actor), paused: app.stats().paused };
  if (!seaFrame || next.round !== seaFrame.round || next.tick < seaFrame.tick) previousSeaFrame = null;
  else if (next.tick > seaFrame.tick) previousSeaFrame = seaFrame;
  seaFrame = next; sea.update(next);
}
function makeSea() {
  sea = createSeaView(T, { parent: scene, models: prepared, quality: $('quality').value, reducedFlashes: true, waterSize: 10000 });
  if (previousSeaFrame) sea.update(previousSeaFrame);
  if (seaFrame) sea.update(seaFrame);
}
function makeTerrain(map) {
  // ponytail: 250 m visual LOD only; the authority retains the original full 25 m query mesh.
  const mesh = map.worldMesh(), step = 10, n = mesh.n / step, positions = [], colors = [], indices = [];
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
    const i = z * step * mesh.stride + x * step, h = mesh.h[i];
    positions.push(mesh.vx[i], h, mesh.vz[i]);
    const color = new T.Color(h < 0 ? '#59666b' : h < 12 ? '#a99a79' : h > 600 ? '#777872' : '#67705b');
    colors.push(...color.toArray());
  }
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const a = z * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const land = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 }));
  scene.add(land); terrainResources.push(land);
}
const gun = () => ({ id: 'gun', medium: 'surface', range: 1200, speed: 500, ttlMs: 4000,
  cooldownMs: 500, damage: 20, depths: ['surfaced'], ammo: 200, acquisition: 'nonvisual', mount: 'main_gun' });
const profile = (id, team, capital, extra = {}) => ({ id, team, capital, kind: 'surface', position: [0, 0, 0],
  half: [12, 8, 40], hp: 1000, speed: 15, turnRateRadS: .045, route: [], weapons: [], sensor: null, depth: 'surfaced', depthPlan: [], ...extra });
function profiles() {
  if ($('scenario').value === 'surface') return [0, 1].map(team =>
    profile('capital' + team, team, true, { modelId: team ? 'type054' : 'type45', weapons: [gun()], route: [[0, 0, 0]] }));
  return [0, 1].flatMap(team => [
    // Deliberately unmodelled anonymous legacy ASW counterplay, never a Type45/Type054A fit.
    profile('capital' + team, team, true, { speed: 0, weapons: [{ id: 'anonymousUW', medium: 'underwater',
      range: 1000, speed: 100, ttlMs: 20000, cooldownMs: 6000, damage: 1, depths: ['shallow', 'deep'], ammo: 2, acquisition: 'nonvisual' }],
    sensor: { enabled: true, range: 1000, depths: ['shallow', 'deep'] } }),
    profile('escort' + team, team, false, { modelId: team ? 'type054' : 'type45', weapons: [gun()] }),
    profile('sub' + team, team, false, { kind: 'sub', modelId: 'originalSub', half: [8, 10, 43], speed: 4,
      depth: 'deep', depthPlan: [{ atMs: 0, depth: 'shallow' }], weapons: [] })]);
}
async function rebuild() {
  busy = true; ready = false; phase = 'composing'; running = false;
  cancelAnimationFrame(animation); clearTimeout(wakeTimer); animation = 0; wakeTimer = 0;
  inputs.forEach(input => { input.disabled = true; }); $('toggle').textContent = 'Run';
  stage('composing', 'Composing measured authority, map, weather and real model rigs.');
  app?.dispose(identity); sea?.dispose(); disposeTerrain(); sequence = 0;
  previousSeaFrame = null; seaFrame = null;
  app = createFactionsComposition({ mode: 'factions', mapId: $('map').value, seed: 71, profiles: profiles(), models: prepared,
    aircraft: AIRCRAFT_FIXTURE, matchMs: 180000, intermissionMs: 15000,
    weather: { seed: 31, initialPreset: $('weather').value, holdMs: 90000, transitionMs: 30000 },
    host: { identity, authenticate: connection => connection === actor ? { id: 'previewObserver', team: 0 } : null,
      deriveAircraftAttack() { throw Error('No flight host in this diagnostic'); } }, THREE: T,
    createPresentation() {
      consumer = createWeatherView(T, TSL, { scene, sun, ambient,
        sampleDaylight: () => ({ sunIntensity: 3, ambientIntensity: 2, fogColor: scene.background.toArray() }) });
      return { parent: scene, applyEnvironment: consumer.applyEnvironment,
        presentation: { quality: 'low', reducedMotion: true, lightning: 'off' }, dispose: consumer.dispose };
    } });
  lease = app.start(identity); app.join(actor); app.setPaused(identity, true);
  makeTerrain(app.world(identity)); makeSea(); frameCamera();
  stage('compiling', 'Compiling the real scene with the original world-ray fog shader.');
  await renderer.compileAsync(scene, camera);
  busy = false; phase = 'ready'; resets++; inputs.forEach(input => { input.disabled = false; });
  draw(); assert(!error, error); ready = true;
}
function on(id, event, action) {
  $(id).addEventListener(event, () => { Promise.resolve().then(action).catch(fail); }, { signal: listeners.signal });
}
try {
  assert(T.REVISION === '186', 'Three 0.186.0 required');
  renderer = new T.WebGPURenderer({ canvas: document.querySelector('canvas'), antialias: true, forceWebGL: true });
  renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  stage('renderer-init', 'Initializing the local WebGL2 renderer backend.');
  await renderer.init();
  const gl = renderer.backend.gl, debug = gl.getExtension('WEBGL_debug_renderer_info');
  backend = { type: 'WebGPURenderer / WebGL2 backend', version: gl.getParameter(gl.VERSION),
    renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
  controls = new OrbitControls(camera, renderer.domElement); controls.minDistance = 35; controls.maxDistance = 16000;
  controls.addEventListener('change', () => { if (!trackingCamera) invalidate(); });
  stage('environment', 'Preparing the local procedural PBR reflection environment.');
  const pmrem = new T.PMREMGenerator(renderer), envScene = new T.Scene(); envScene.background = new T.Color('#9da8b0');
  try { environment = pmrem.fromScene(envScene, .04); scene.environment = environment.texture; scene.environmentIntensity = .8; }
  finally { pmrem.dispose(); }
  const json = async path => { const response = await fetch(path); assert(response.ok, 'Missing ' + path); return response.json(); };
  const escort = await json('/model-repairs.json'), submarine = await json('/submarine-model.json');
  const descriptors = [...escort.models, submarine], ids = ['type45', 'type054', 'originalSub'];
  for (const [i, descriptor] of descriptors.entries()) {
    stage('model-' + i, 'Hashing and decoding model ' + (i + 1) + ' of 3, including embedded PBR images.');
    assert(descriptor.objective_only && descriptor.player_vehicle_kind === null, 'Only objective models permitted');
    const response = await fetch('/' + descriptor.file); assert(response.ok, 'Missing supplied model');
    // Complete and hash the actual response before parsing. No incomplete streaming request is treated as loaded.
    const bytes = await response.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    assert(hash === descriptor.sha256, 'Supplied model bytes do not match the inspected descriptor');
    const gltf = await new GLTFLoader().parseAsync(bytes, '/'); loadedScenes.push(gltf.scene);
    for (const texture of await gltf.parser.getDependencies('texture')) {
      if (texture.image?.decode) await texture.image.decode();
      assert(texture.image?.width > 0 && texture.image?.height > 0, 'Embedded PBR image not decoded');
    }
    prepared.push({ id: ids[i], descriptor, object: gltf.scene });
  }
  on('toggle', 'click', () => {
    running = !running; app.setPaused(identity, !running); lastTime = performance.now();
    $('toggle').textContent = running ? 'Pause' : 'Run'; invalidate();
  });
  on('step', 'click', () => {
    running = false; $('toggle').textContent = 'Run'; app.setPaused(identity, false);
    try { for (let i = 0; i < 80; i++) app.update(lease, { sequence: ++sequence, elapsedMs: 250 }); }
    finally { app.setPaused(identity, true); }
    frameCamera(); draw();
  });
  on('dispose', 'click', () => {
    const receipt = dispose(); inputs.forEach(input => { input.disabled = true; });
    assert(!receipt.errors?.length, 'Preview cleanup failed: ' + receipt.errors?.join('; '));
    $('status').textContent = 'Preview closed. No active authority view or drawing loop. Reload to inspect again.';
  });
  on('restart', 'click', rebuild);
  for (const id of ['map', 'weather', 'scenario']) on(id, 'change', rebuild);
  on('quality', 'change', async () => {
    const resume = running; running = false; app.setPaused(identity, true);
    busy = true; ready = false; inputs.forEach(input => { input.disabled = true; });
    sea?.dispose(); makeSea(); await renderer.compileAsync(scene, camera);
    busy = false; ready = true; inputs.forEach(input => { input.disabled = false; });
    running = resume; app.setPaused(identity, !resume); lastTime = performance.now(); draw();
  });
  on('camera', 'change', () => { frameCamera(); draw(); });
  window.addEventListener('resize', invalidate, { signal: listeners.signal });
  window.addEventListener('pagehide', dispose, { once: true, signal: listeners.signal });
  await rebuild();
} catch (failure) { fail(failure); }
