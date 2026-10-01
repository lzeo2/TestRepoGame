import * as THREE from './vendor/three.module.js';
import { PeerRoom } from './multiplayer.js';

const LIMIT = 10.6;
const COVER = [
  { x: -4.5, z: -3, w: 2.4, d: 1.2, h: 1.05 },
  { x: 4.5, z: -3, w: 2.4, d: 1.2, h: 1.05 },
  { x: -4.5, z: 3, w: 2.4, d: 1.2, h: 1.05 },
  { x: 4.5, z: 3, w: 2.4, d: 1.2, h: 1.05 }
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const wrap = yaw => Math.atan2(Math.sin(yaw), Math.cos(yaw));
const neutral = (yaw = 0, pitch = 0) => ({ mx: 0, mz: 0, yaw, pitch, fire: false });

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0;
  return run.seed / 4294967296;
}

function spawnWave(run) {
  const count = Math.min(24, Math.ceil((4 + run.wave * 2) * (1 + (run.players.length - 1) * 0.6)));
  run.bots = Array.from({ length: count }, (_, i) => {
    const edge = i % 4;
    const spread = random(run) * 16 - 8;
    const type = i % 3 === 2 ? 'drone' : 'walker';
    return {
      id: run.nextId++, type, x: edge < 2 ? spread : (edge === 2 ? -9.7 : 9.7),
      z: edge < 2 ? (edge === 0 ? -9.7 : 9.7) : spread,
      y: type === 'drone' ? 2.6 : 0, hp: type === 'drone' ? 60 : 100,
      cooldown: 1 + random(run), stun: 0
    };
  });
}

/** Pure API: createRun([0,1,...]) returns a fresh playing wave-one run.
 * stepRun(run, Map<id,{mx,mz,yaw,pitch,fire}>, seconds) returns a NEW run.
 * mx is right, mz is forward; yaw/pitch are radians, positive pitch aims up.
 * Internal cooldown/seed fields are not part of the wire/inspect snapshot.
 */
export function createRun(ids = [0]) {
  const roster = [...new Set(ids.filter(id => Number.isInteger(id) && id >= 0 && id <= 3))].slice(0, 4);
  if (!roster.length) roster.push(0);
  const run = {
    epoch: 1, phase: 'playing', wave: 1, score: 0, time: 0,
    players: roster.map((id, i) => ({ id, x: (i - (roster.length - 1) / 2) * 1.5, z: 6.5, yaw: 0, pitch: 0, hp: 100, shot: 0, cooldown: 0 })),
    bots: [], cells: [], seed: 222, nextId: 10, kills: 0, waveWait: 0
  };
  spawnWave(run);
  return run;
}

function blocked(x, z, radius) {
  return COVER.some(c => Math.abs(x - c.x) < c.w / 2 + radius && Math.abs(z - c.z) < c.d / 2 + radius);
}

function moveBody(body, dx, dz, radius) {
  const x = clamp(body.x + dx, -LIMIT, LIMIT);
  if (!blocked(x, body.z, radius)) body.x = x;
  const z = clamp(body.z + dz, -LIMIT, LIMIT);
  if (!blocked(body.x, z, radius)) body.z = z;
}

function boxRay(origin, direction, min, max) {
  let near = 0;
  let far = 35;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < 0.00001) {
      if (origin[i] < min[i] || origin[i] > max[i]) return Infinity;
    } else {
      let a = (min[i] - origin[i]) / direction[i];
      let b = (max[i] - origin[i]) / direction[i];
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a);
      far = Math.min(far, b);
      if (far < near) return Infinity;
    }
  }
  return near;
}

function coverDistance(origin, direction) {
  let distance = 35;
  for (const c of COVER) {
    distance = Math.min(distance, boxRay(origin, direction, [c.x - c.w / 2, 0, c.z - c.d / 2], [c.x + c.w / 2, c.h, c.z + c.d / 2]));
  }
  return distance;
}

function sphereRay(origin, direction, center, radius) {
  const v = center.map((n, i) => n - origin[i]);
  const projection = v.reduce((s, n, i) => s + n * direction[i], 0);
  const perpendicular = v.reduce((s, n) => s + n * n, 0) - projection * projection;
  if (projection < 0 || perpendicular > radius * radius) return Infinity;
  return Math.max(0, projection - Math.sqrt(radius * radius - perpendicular));
}

function heading(yaw, pitch) {
  return [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
}

function shoot(run, player) {
  player.shot++;
  player.cooldown = 0.15;
  const origin = [player.x, 1.55, player.z];
  const direction = heading(player.yaw, player.pitch);
  let closest = coverDistance(origin, direction);
  let target = null;
  for (const bot of run.bots) {
    const hit = bot.type === 'drone'
      ? sphereRay(origin, direction, [bot.x, bot.y, bot.z], 0.7)
      : Math.min(sphereRay(origin, direction, [bot.x, 1.22, bot.z], 0.6), sphereRay(origin, direction, [bot.x, 1.8, bot.z], 0.34));
    if (bot.hp > 0 && hit < closest) { closest = hit; target = bot; }
  }
  if (!target) return;
  target.hp = Math.max(0, target.hp - 34);
  target.stun = 0.12;
  if (target.hp === 0) {
    run.score += target.type === 'drone' ? 150 : 100;
    run.kills++;
    if (run.kills % 2 === 0 && run.cells.length < 8) run.cells.push({ id: run.nextId++, x: target.x, z: target.z });
  }
}

export function stepRun(previous, inputs, seconds) {
  const run = structuredClone(previous);
  if (run.phase !== 'playing') return run;
  const dt = clamp(finite(seconds), 0, 0.05);
  if (!dt) return run;
  run.time += dt;
  for (const player of run.players) {
    const input = inputs.get(player.id) || neutral(player.yaw, player.pitch);
    player.cooldown = Math.max(0, player.cooldown - dt);
    if (player.hp <= 0) continue;
    player.yaw = wrap(finite(input.yaw, player.yaw));
    player.pitch = clamp(finite(input.pitch, player.pitch), -1.3, 1.3);
    let mx = clamp(finite(input.mx), -1, 1), mz = clamp(finite(input.mz), -1, 1);
    const length = Math.hypot(mx, mz);
    if (length > 1) { mx /= length; mz /= length; }
    const speed = 4.5 * dt;
    moveBody(player, (mx * Math.cos(player.yaw) - mz * Math.sin(player.yaw)) * speed, (-mx * Math.sin(player.yaw) - mz * Math.cos(player.yaw)) * speed, 0.35);
    if (input.fire === true && player.cooldown <= 0) shoot(run, player);
    run.cells = run.cells.filter(cell => {
      if (player.hp < 100 && Math.hypot(cell.x - player.x, cell.z - player.z) < 0.85) {
        player.hp = Math.min(100, player.hp + 25);
        return false;
      }
      return true;
    });
  }
  run.bots = run.bots.filter(bot => bot.hp > 0);
  for (const bot of run.bots) {
    const alive = run.players.filter(player => player.hp > 0);
    if (!alive.length) break;
    const target = alive.reduce((a, b) => Math.hypot(a.x - bot.x, a.z - bot.z) < Math.hypot(b.x - bot.x, b.z - bot.z) ? a : b);
    const dx = target.x - bot.x, dz = target.z - bot.z;
    const distance = Math.hypot(dx, dz) || 0.001;
    bot.stun = Math.max(0, bot.stun - dt);
    const speed = (bot.type === 'drone' ? 1.45 : 1.15) + run.wave * 0.09;
    if (distance > (bot.type === 'drone' ? 3 : 1.05) && !bot.stun) {
      const oldX = bot.x, oldZ = bot.z;
      moveBody(bot, dx / distance * speed * dt, dz / distance * speed * dt, 0.5);
      // ponytail: local tangent steering for four rectangular covers, not a navmesh.
      if (Math.hypot(bot.x - oldX, bot.z - oldZ) < speed * dt * 0.6) {
        const side = bot.id % 2 ? 1 : -1;
        moveBody(bot, -dz / distance * speed * dt * side, dx / distance * speed * dt * side, 0.5);
      }
    }
    bot.y = bot.type === 'drone' ? 2.6 + Math.sin(run.time * 2 + bot.id) * 0.22 : 0;
    bot.cooldown -= dt;
    const range = bot.type === 'drone' ? 4.6 : 1.4;
    if (distance < range && bot.cooldown <= 0) {
      const origin = [bot.x, bot.type === 'drone' ? bot.y : 1.2, bot.z];
      const delta = [target.x - bot.x, 1.55 - origin[1], target.z - bot.z];
      const rayLength = Math.hypot(...delta);
      if (coverDistance(origin, delta.map(n => n / rayLength)) >= rayLength) {
        target.hp = Math.max(0, target.hp - (bot.type === 'drone' ? 8 : 10));
        bot.cooldown = bot.type === 'drone' ? 1.25 : 0.85;
      }
    }
  }
  if (run.players.every(player => player.hp <= 0)) run.phase = 'lost';
  else if (!run.bots.length) {
    if (run.wave === 6) run.phase = 'won';
    else if (run.waveWait === 0) {
      run.waveWait = 2.4;
      for (const player of run.players) if (player.hp <= 0) player.hp = 100;
    } else {
      run.waveWait = Math.max(0.001, run.waveWait - dt);
      if (run.waveWait <= 0.001) { run.wave++; run.waveWait = 0; spawnWave(run); }
    }
  }
  return run;
}

function wire(run) {
  return {
    epoch: run.epoch, phase: run.phase, wave: run.wave, score: run.score, time: run.time,
    players: run.players.map(({ id, x, z, yaw, pitch, hp, shot }) => ({ id, x, z, yaw, pitch, hp, shot })),
    bots: run.bots.map(({ id, type, x, y, z, hp }) => ({ id, type, x, y, z, hp })),
    cells: run.cells.map(({ id, x, z }) => ({ id, x, z }))
  };
}

let live = { epoch: 0, phase: 'lobby', wave: 0, score: 0, time: 0, players: [{ id: 0, x: 0, z: 6.5, yaw: 0, pitch: 0, hp: 100, shot: 0 }], bots: [], cells: [] };
let renderer = null;
let frames = 0;
/** Detached, deeply frozen wire snapshot. It cannot mutate the live game. */
export function inspect() {
  const snapshot = structuredClone(live);
  for (const list of [snapshot.players, snapshot.bots, snapshot.cells]) {
    list.forEach(Object.freeze);
    Object.freeze(list);
  }
  return Object.freeze(snapshot);
}
export function stats() {
  return Object.freeze({ drawCalls: renderer?.info.render.calls || 0, triangles: renderer?.info.render.triangles || 0, frames });
}

if (typeof document !== 'undefined') boot();

function boot() {
  const $ = id => document.getElementById(id);
  const canvas = $('arena');
  const room = new PeerRoom();
  let run = null, previous = null, snapshotAt = 0, snapshotGap = 50;
  let yaw = 0, pitch = 0, mouseFire = false, touchFire = false, pendingFire = false, localPaused = false;
  let disconnected = false, epoch = Date.now(), last = performance.now(), networkAt = 0, feedbackUntil = 0;
  const keys = new Set(), remote = new Map(), shots = new Map(), health = new Map();
  const touch = { mx: 0, mz: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let webgl = false, touchUsed = matchMedia('(pointer: coarse)').matches;
  let scene, camera, boxes, cylinders, weapon, pulses;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const colors = { orange: 0xd8772a, cream: 0xf2e5c6, dark: 0x192e3c, blue: 0x749fb9, white: 0xffffff };
  const traces = [];
  let boxCount = 0, cylinderCount = 0;

  function status(text) { $('status').textContent = text; $('status').hidden = !text; }
  function releasePointer() {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  function clearInput() {
    keys.clear(); mouseFire = false; touchFire = false; pendingFire = false; touch.mx = 0; touch.mz = 0;
    $('moveKnob').style.transform = '';
  }
  function lockPointer() {
    if (touchUsed || document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
    try {
      const request = canvas.requestPointerLock();
      if (request?.catch) request.catch(() => status('Mouse capture was unavailable. Use IJKL to aim, or click the bay to try again.'));
    } catch {
      status('Mouse capture was unavailable. IJKL aims and Space fires.');
    }
  }
  function currentPlayer() { return live.players.find(player => player.id === room.selfId); }
  function showPanel(title, message, canResume, canRetry, fresh = false) {
    $('menu').hidden = true; $('lobby').hidden = true; $('matchPanel').hidden = false;
    $('panelTitle').textContent = title; $('panelMessage').textContent = message;
    $('resumeBtn').hidden = !canResume; $('retryBtn').hidden = !canRetry; $('freshSolo').hidden = !fresh;
    $('touchControls').hidden = true; $('crosshair').hidden = true;
  }
  function refresh() {
    const active = !!run || room.role === 'client' && live.phase !== 'lobby';
    $('hud').hidden = !active;
    if (!active) return;
    const player = currentPlayer();
    $('shield').textContent = player ? String(Math.ceil(player.hp)) : '0';
    $('wave').textContent = `${live.wave} / 6`;
    $('score').textContent = String(live.score);
    $('remaining').textContent = String(live.bots.length);
    $('participants').textContent = live.players.map(p => `${p.id === room.selfId ? 'You' : `Player ${p.id + 1}`}: ${p.hp > 0 ? `${Math.ceil(p.hp)} shield` : 'disabled'}`).join(' · ');
    if (disconnected) return;
    if (live.phase === 'won' || live.phase === 'lost') {
      showPanel(live.phase === 'won' ? 'Bay secured' : 'System offline', `Wave ${live.wave} of 6. Pooled score: ${live.score}.${room.role === 'client' ? ' The host can restart the match.' : ''}`, false, room.role !== 'client');
      releasePointer();
    } else if (live.phase === 'paused' || localPaused) {
      releasePointer();
      showPanel(localPaused && room.role === 'client' ? 'Controls paused' : 'Paused', room.role === 'client' && !localPaused ? 'The host paused the match. Wait for the host to resume.' : room.role === 'client' ? 'Your inputs are stopped. The team match continues.' : 'The match is paused. Resume when ready.', localPaused || room.role !== 'client', room.role !== 'client');
    } else if (live.phase === 'playing') {
      $('menu').hidden = true; $('lobby').hidden = true; $('matchPanel').hidden = true;
      $('crosshair').hidden = !player || player.hp <= 0;
      $('touchControls').hidden = !touchUsed || !player || player.hp <= 0;
      $('playNote').hidden = !!player && player.hp > 0 && live.bots.length > 0 && (touchUsed || document.pointerLockElement === canvas);
      $('playNote').textContent = player?.hp <= 0 ? 'Disabled: spectating a teammate. Return when the wave clears.' : live.bots.length === 0 ? 'Wave cleared. Next wave incoming.' : 'Click the bay to aim with the mouse. IJKL also aims.';
    }
  }
  function publish() {
    if (run) live = wire(run);
    if (room.role === 'host') room.broadcast(live);
    refresh();
  }
  function start(ids) {
    clearInput(); remote.clear(); shots.clear(); health.clear(); traces.length = 0;
    localPaused = false; disconnected = false; previous = null;
    run = createRun(ids); run.epoch = ++epoch; live = wire(run);
    yaw = currentPlayer()?.yaw || 0; pitch = 0;
    status(''); $('playNote').hidden = true;
    publish();
  }
  function solo() { room.close(); start([0]); }
  function menu() {
    releasePointer(); clearInput(); room.close(); run = null; previous = null; remote.clear();
    localPaused = false; disconnected = false; traces.length = 0; shots.clear(); health.clear();
    live = { epoch: ++epoch, phase: 'lobby', wave: 0, score: 0, time: 0, players: [{ id: 0, x: 0, z: 6.5, yaw: 0, pitch: 0, hp: 100, shot: 0 }], bots: [], cells: [] };
    $('menu').hidden = false; $('lobby').hidden = true; $('matchPanel').hidden = true;
    $('hud').hidden = true; $('crosshair').hidden = true; $('playNote').hidden = true; $('touchControls').hidden = true;
    $('signalInput').value = ''; $('signalOutput').value = '';
    $('startSolo').focus();
  }
  function pause() {
    if (live.phase !== 'playing') return;
    clearInput();
    if (room.role === 'client') {
      localPaused = true;
      room.sendInput(neutral(yaw, pitch), live.epoch);
    } else if (run) { run.phase = 'paused'; publish(); }
    releasePointer(); refresh(); $('resumeBtn').focus();
  }
  function resume() {
    clearInput(); localPaused = false;
    if (room.role !== 'client' && run?.phase === 'paused') { run.phase = 'playing'; publish(); }
    status(''); refresh();
  }
  function enterLobby(host) {
    menu(); status('');
    if (host) room.host();
    $('menu').hidden = true; $('lobby').hidden = false;
    $('lobbyTitle').textContent = host ? 'Host co-op' : 'Join co-op';
    $('hostSteps').hidden = !host; $('joinSteps').hidden = host;
    $('makeOffer').hidden = !host; $('acceptAnswer').hidden = !host;
    $('createAnswer').hidden = host; $('startCoop').hidden = !host;
    $('roomStatus').textContent = host ? 'Host ready. Make an offer for your first guest.' : 'Paste the complete offer from the host.';
    $('startCoop').disabled = true;
    (host ? $('makeOffer') : $('signalInput')).focus();
  }
  async function signal(button, action) {
    button.disabled = true;
    $('roomStatus').textContent = 'Preparing connection. This can take up to 15 seconds.';
    try {
      const result = await action();
      if (result) {
        $('signalOutput').value = typeof result === 'string' ? result : JSON.stringify(result);
        $('signalOutput').focus(); $('signalOutput').select();
        $('roomStatus').textContent = 'Text is ready. Send the complete contents to your teammate.';
      }
    } catch (error) { $('roomStatus').textContent = error.message || 'Pairing failed. Try again or start fresh solo.'; }
    finally { button.disabled = false; }
  }
  $('startSolo').addEventListener('click', solo);
  $('fallbackSolo').addEventListener('click', solo);
  $('freshSolo').addEventListener('click', solo);
  $('hostRoom').addEventListener('click', () => enterLobby(true));
  $('joinRoom').addEventListener('click', () => enterLobby(false));
  $('makeOffer').addEventListener('click', () => signal($('makeOffer'), () => room.hostOffer()));
  $('acceptAnswer').addEventListener('click', () => signal($('acceptAnswer'), () => room.acceptAnswer($('signalInput').value)));
  $('createAnswer').addEventListener('click', () => signal($('createAnswer'), () => room.joinOffer($('signalInput').value)));
  $('copySignal').addEventListener('click', async () => {
    const text = $('signalOutput').value;
    if (!text) { $('roomStatus').textContent = 'Make an offer or answer first.'; return; }
    try { await navigator.clipboard.writeText(text); $('roomStatus').textContent = 'Copied. Send the full text to your teammate.'; }
    catch { $('signalOutput').focus(); $('signalOutput').select(); $('roomStatus').textContent = 'Select the text and copy it manually.'; }
  });
  $('startCoop').addEventListener('click', () => {
    if (room.role !== 'host' || room.ids.length < 2) return;
    room.lock(); start(room.ids);
  });
  $('pauseBtn').addEventListener('click', pause);
  $('resumeBtn').addEventListener('click', resume);
  $('retryBtn').addEventListener('click', () => { if (room.role !== 'client') start(room.role === 'host' ? room.ids : [0]); });
  $('menuBtn').addEventListener('click', () => { menu(); status(''); });
  $('lobbyMenu').addEventListener('click', () => { menu(); status(''); });
  room.addEventListener('change', event => {
    const detail = event.detail;
    if (live.phase === 'lobby') {
      live.players = room.ids.map(id => ({ id, x: 0, z: 6.5, yaw: 0, pitch: 0, hp: 100, shot: 0 }));
      if (!live.players.length) live.players = [{ id: room.selfId, x: 0, z: 6.5, yaw: 0, pitch: 0, hp: 100, shot: 0 }];
    }
    $('roomStatus').textContent = `${detail.message || detail.status || 'Pairing'} (${detail.count || room.ids.length} ready players)`;
    $('startCoop').disabled = room.role !== 'host' || room.ids.length < 2;
  });
  room.addEventListener('input', event => {
    const { id, input, epoch: inputEpoch } = event.detail;
    if (run && inputEpoch === run.epoch && run.players.some(player => player.id === id)) remote.set(id, { input, at: performance.now() });
  });
  room.addEventListener('state', event => {
    if (room.role !== 'client') return;
    const state = event.detail;
    if (state.epoch < live.epoch && live.phase !== 'lobby') return;
    if (state.epoch !== live.epoch) {
      localPaused = false; disconnected = false; shots.clear(); health.clear(); traces.length = 0;
      const player = state.players.find(p => p.id === room.selfId);
      yaw = player?.yaw || 0; pitch = player?.pitch || 0;
    }
    const now = performance.now();
    previous = state.epoch === live.epoch ? live : null;
    snapshotGap = clamp(now - snapshotAt, 25, 150); snapshotAt = now;
    live = structuredClone(state); refresh();
  });
  room.addEventListener('leave', event => {
    if (!run || room.role !== 'host') return;
    run.players = run.players.filter(player => player.id !== event.detail.id);
    remote.delete(event.detail.id); publish();
  });
  room.addEventListener('failure', event => {
    const message = event.detail.message || 'Connection failed.';
    if (!run && live.phase === 'lobby') { $('roomStatus').textContent = `${message} Solo is always available.`; return; }
    if (run && room.role === 'host') { status(message); return; }
    disconnected = true; clearInput(); releasePointer();
    showPanel('Host disconnected', `${message} Start a fresh solo run or return to the menu. No team score is carried over.`, false, false, true);
  });

  function isFormTarget(target) { return target instanceof Element && !!target.closest('button,textarea,input,a'); }
  addEventListener('keydown', event => {
    if (isFormTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','i','j','k','l','p','escape'].includes(key) && live.phase !== 'lobby') event.preventDefault();
    if ((key === 'p' || key === 'escape') && !event.repeat) { if (live.phase === 'playing' && !localPaused) pause(); return; }
    keys.add(key);
    if (key === ' ' && live.phase === 'playing' && !localPaused) pendingFire = true;
  });
  addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  addEventListener('blur', () => { clearInput(); if (live.phase === 'playing' && !localPaused) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (live.phase === 'playing' && !localPaused) pause(); } });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && live.phase === 'playing' && !localPaused && !touchUsed) pause();
    refresh();
  });
  document.addEventListener('pointerlockerror', () => status('Mouse capture was unavailable. Use IJKL to aim and Space to fire.'));
  document.addEventListener('mousemove', event => {
    if (document.pointerLockElement !== canvas || live.phase !== 'playing' || localPaused) return;
    yaw = wrap(yaw - event.movementX * 0.0024); pitch = clamp(pitch - event.movementY * 0.0024, -1.3, 1.3);
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { touchUsed = true; refresh(); return; }
    if (live.phase === 'playing' && !localPaused && event.button === 0) { lockPointer(); mouseFire = true; pendingFire = true; }
  });
  addEventListener('pointerup', () => { mouseFire = false; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  function pad(element, onMove, onEnd) {
    let pointer = null, x = 0, y = 0;
    element.addEventListener('pointerdown', event => {
      if (pointer !== null) return;
      touchUsed = true; pointer = event.pointerId; x = event.clientX; y = event.clientY;
      element.setPointerCapture(pointer); event.preventDefault(); onMove(event, x, y, true);
    });
    element.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer) return;
      onMove(event, x, y, false); x = event.clientX; y = event.clientY;
    });
    const end = event => { if (event.pointerId === pointer) { pointer = null; onEnd(); } };
    element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end); element.addEventListener('lostpointercapture', end);
  }
  let moveStartX = 0, moveStartY = 0;
  pad($('touchMove'), (event, x, y, start) => {
    if (start) { moveStartX = event.clientX; moveStartY = event.clientY; }
    const dx = clamp((event.clientX - moveStartX) / 40, -1, 1), dz = clamp((moveStartY - event.clientY) / 40, -1, 1);
    const length = Math.max(1, Math.hypot(dx, dz)); touch.mx = dx / length; touch.mz = dz / length;
    $('moveKnob').style.transform = `translate(${touch.mx * 25}px,${-touch.mz * 25}px)`;
  }, () => { touch.mx = 0; touch.mz = 0; $('moveKnob').style.transform = ''; });
  pad($('touchAim'), (event, x, y, start) => {
    if (!start) { yaw = wrap(yaw - (event.clientX - x) * 0.006); pitch = clamp(pitch - (event.clientY - y) * 0.006, -1.3, 1.3); }
  }, () => {});
  pad($('touchFire'), () => { touchFire = true; pendingFire = true; }, () => { touchFire = false; });
  $('touchFire').addEventListener('click', () => { if (live.phase === 'playing' && !localPaused) pendingFire = true; });

  function input(dt) {
    if (localPaused || live.phase !== 'playing' || currentPlayer()?.hp <= 0 || disconnected) return neutral(yaw, pitch);
    yaw = wrap(yaw + ((keys.has('j') ? 1 : 0) - (keys.has('l') ? 1 : 0)) * dt * 1.8);
    pitch = clamp(pitch + ((keys.has('i') ? 1 : 0) - (keys.has('k') ? 1 : 0)) * dt * 1.5, -1.3, 1.3);
    let mx = touch.mx + (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let mz = touch.mz + (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const length = Math.max(1, Math.hypot(mx, mz)); mx /= length; mz /= length;
    return { mx, mz, yaw, pitch, fire: pendingFire || mouseFire || touchFire || keys.has(' ') };
  }

  try {
    const context = canvas.getContext('webgl2', { antialias: false, alpha: false }) || canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!context) throw new Error('WebGL unavailable');
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false, alpha: false });
    renderer.setPixelRatio(1);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x314e65);
    scene.fog = new THREE.Fog(0x314e65, 16, 40);
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60); camera.rotation.order = 'YXZ';
    scene.add(camera, new THREE.HemisphereLight(0xfff3da, 0x4c6475, 2.3));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(-3, 9, 4); scene.add(light);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const staticBoxes = new THREE.InstancedMesh(boxGeometry, material, 100);
    let staticCount = 0;
    function staticBox(x, y, z, sx, sy, sz, tint) {
      dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
      staticBoxes.setMatrixAt(staticCount, dummy.matrix); staticBoxes.setColorAt(staticCount++, color.setHex(tint));
    }
    staticBox(0, -0.12, 0, 22.5, 0.24, 22.5, 0x526d80);
    for (const z of [-11.2, 11.2]) {
      staticBox(0, 2.5, z, 22.5, 5, 0.4, 0x395b72);
      staticBox(0, 4.5, z * 0.985, 22, 0.2, 0.2, colors.cream);
      for (let x = -10; x <= 10; x += 4) staticBox(x, 2.5, z * 0.985, 0.18, 5, 0.2, 0x233f52);
    }
    for (const x of [-11.2, 11.2]) {
      staticBox(x, 2.5, 0, 0.4, 5, 22.5, 0x395b72);
      staticBox(x * 0.985, 4.5, 0, 0.2, 0.2, 22, colors.cream);
      for (let z = -10; z <= 10; z += 4) staticBox(x * 0.985, 2.5, z, 0.2, 5, 0.18, 0x233f52);
    }
    for (const c of COVER) {
      staticBox(c.x, c.h / 2, c.z, c.w, c.h, c.d, 0x233f52);
      staticBox(c.x, c.h + 0.025, c.z, c.w + 0.1, 0.05, c.d + 0.1, colors.cream);
      staticBox(c.x, c.h + 0.057, c.z, 1.6, 0.02, 0.55, colors.blue);
      for (const side of [-1, 1]) staticBox(c.x + side * 1.08, 0.45, c.z, 0.16, 0.9, 1.25, colors.orange);
    }
    for (let i = -8; i <= 8; i += 4) {
      staticBox(i, 0.005, 0, 0.025, 0.01, 21, 0x8397a2);
      staticBox(0, 0.005, i, 21, 0.01, 0.025, 0x8397a2);
    }
    staticBoxes.count = staticCount; scene.add(staticBoxes);
    boxes = new THREE.InstancedMesh(boxGeometry, material, 420); boxes.frustumCulled = false; boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(boxes);
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
    cylinders = new THREE.InstancedMesh(cylinderGeometry, material, 72); cylinders.frustumCulled = false; cylinders.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(cylinders);
    weapon = new THREE.Group(); camera.add(weapon);
    function gunBox(x, y, z, sx, sy, sz, tint) {
      const mesh = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: tint, depthTest: false }));
      mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.renderOrder = 10; weapon.add(mesh);
    }
    gunBox(0.26, -0.23, -0.48, 0.18, 0.16, 0.42, colors.cream);
    gunBox(0.26, -0.26, -0.42, 0.21, 0.08, 0.3, colors.blue);
    gunBox(0.26, -0.32, -0.35, 0.1, 0.2, 0.12, colors.dark);
    gunBox(0.26, -0.21, -0.72, 0.13, 0.11, 0.13, colors.dark);
    for (let i = 0; i < 3; i++) gunBox(0.26, -0.137, -0.37 - i * 0.08, 0.13, 0.018, 0.025, colors.orange);
    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 6), 3));
    pulses = new THREE.LineSegments(pulseGeometry, new THREE.LineBasicMaterial({ color: 0xffffff })); pulses.frustumCulled = false; scene.add(pulses);
    webgl = true;
    resize();
  } catch {
    renderer = null;
    status('WebGL is unavailable. Enable hardware acceleration or use a WebGL-capable browser. You can still read the controls or return to the arcade.');
    for (const id of ['startSolo', 'hostRoom', 'joinRoom', 'fallbackSolo', 'freshSolo']) $(id).disabled = true;
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); webgl = false; pause();
    status('Graphics context was lost. Reload this page to restore the game, or return to the arcade.');
    $('resumeBtn').disabled = true; $('retryBtn').disabled = true;
  });
  function resize() {
    if (!renderer) return;
    const width = innerWidth, height = innerHeight;
    const scale = Math.min(1, 1280 / width, 720 / height);
    renderer.setSize(Math.round(width * scale), Math.round(height * scale), false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  function part(mesh, index, x, y, z, sx, sy, sz, tint, rotation = 0) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, rotation, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, color.setHex(tint));
  }
  function box(x, y, z, sx, sy, sz, tint, rotation = 0) { part(boxes, boxCount++, x, y, z, sx, sy, sz, tint, rotation); }
  function robot(x, z, angle, tint, bob = 0, flash = false) {
    function limb(dx, y, dz, sx, sy, sz, colorValue) {
      box(x + dx * Math.cos(angle) + dz * Math.sin(angle), y + bob, z - dx * Math.sin(angle) + dz * Math.cos(angle), sx, sy, sz, flash ? colors.white : colorValue, angle);
    }
    limb(0, 1.15, 0, 0.85, 0.7, 0.5, tint);
    limb(0, 1.76, 0, 0.55, 0.4, 0.44, colors.cream);
    limb(0, 1.79, -0.235, 0.43, 0.13, 0.04, colors.dark);
    for (const side of [-1, 1]) {
      limb(side * 0.25, 0.5, 0, 0.22, 0.65, 0.24, colors.cream);
      limb(side * 0.25, 0.15, -0.09, 0.32, 0.22, 0.42, colors.dark);
      limb(side * 0.59, 1.15, 0, 0.22, 0.5, 0.24, colors.cream);
      limb(side * 0.59, 0.9, -0.08, 0.24, 0.25, 0.32, tint);
    }
  }
  function interpolated(actor, list, amount) {
    const old = list?.find(item => item.id === actor.id);
    return old ? { ...actor, x: old.x + (actor.x - old.x) * amount, z: old.z + (actor.z - old.z) * amount, y: actor.y === undefined ? undefined : old.y + (actor.y - old.y) * amount } : actor;
  }
  function draw(now) {
    if (!webgl) return;
    boxCount = 0; cylinderCount = 0;
    const active = live.phase !== 'lobby';
    const amount = room.role === 'client' ? clamp((now - snapshotAt) / snapshotGap, 0, 1) : 1;
    const player = currentPlayer();
    const spectator = player?.hp <= 0 ? live.players.find(p => p.hp > 0) : null;
    const viewpoint = spectator || player;
    if (active && viewpoint) {
      camera.position.set(viewpoint.x, 1.55, viewpoint.z);
      camera.rotation.set(spectator ? viewpoint.pitch : pitch, spectator ? viewpoint.yaw : yaw, 0);
    } else {
      camera.position.set(0, 2.8, 9); camera.rotation.set(-0.12, 0, 0);
    }
    weapon.visible = active && !!player && player.hp > 0 && !spectator;
    weapon.position.x = camera.aspect < 0.7 ? -0.15 : 0;
    weapon.position.z = -Math.max(0, (feedbackUntil - now) / 90) * 0.035;
    const bots = active ? live.bots : [
      { id: -1, type: 'walker', x: -2.1, y: 0, z: -2.5, hp: 100 },
      { id: -2, type: 'walker', x: 2.7, y: 0, z: -5, hp: 100 },
      { id: -3, type: 'drone', x: 0.3, y: 2.6, z: -5, hp: 60 }
    ];
    for (const raw of bots) {
      const bot = interpolated(raw, previous?.bots, amount);
      const oldHP = health.get(`b${bot.id}`);
      if (oldHP !== undefined && bot.hp < oldHP) { health.set(`f${bot.id}`, now + 110); feedbackUntil = now + 110; }
      health.set(`b${bot.id}`, bot.hp);
      const flash = (health.get(`f${bot.id}`) || 0) > now;
      if (bot.type === 'walker') {
        const target = live.players.find(p => p.hp > 0) || { x: 0, z: 9 };
        const angle = Math.atan2(-(target.x - bot.x), -(target.z - bot.z));
        robot(bot.x, bot.z, angle, colors.orange, reducedMotion ? 0 : Math.sin(live.time * 7 + bot.id) * 0.025, flash);
      } else {
        box(bot.x, bot.y, bot.z, 0.65, 0.35, 0.6, flash ? colors.white : colors.cream);
        box(bot.x, bot.y - 0.18, bot.z - 0.12, 0.35, 0.18, 0.32, colors.dark);
        for (const side of [-1, 1]) {
          part(cylinders, cylinderCount++, bot.x + side * 0.53, bot.y, bot.z, 0.34, 0.15, 0.34, flash ? colors.white : colors.orange);
          part(cylinders, cylinderCount++, bot.x + side * 0.53, bot.y + 0.09, bot.z, 0.22, 0.05, 0.22, colors.dark);
        }
      }
    }
    for (const raw of live.players) {
      const actor = interpolated(raw, previous?.players, amount);
      if (actor.id !== viewpoint?.id && actor.hp > 0) robot(actor.x, actor.z, actor.yaw, colors.blue);
      const oldShot = shots.get(actor.id);
      if (oldShot !== undefined && actor.shot > oldShot) {
        const origin = [actor.x, 1.45, actor.z];
        const direction = heading(actor.yaw, actor.pitch);
        let distance = Math.min(22, coverDistance(origin, direction));
        for (const bot of live.bots) distance = Math.min(distance, sphereRay(origin, direction, [bot.x, bot.type === 'drone' ? bot.y : 1.3, bot.z], 0.6));
        traces.push({ origin, end: origin.map((n, i) => n + direction[i] * distance), until: now + 70 });
        if (actor.id === room.selfId) feedbackUntil = now + 70;
      }
      shots.set(actor.id, actor.shot);
      const oldHP = health.get(`p${actor.id}`);
      if (actor.id === room.selfId && oldHP !== undefined && actor.hp < oldHP) health.set('damage', now + 180);
      health.set(`p${actor.id}`, actor.hp);
    }
    for (const cell of live.cells) {
      const y = 0.27 + (reducedMotion ? 0 : Math.sin(live.time * 2 + cell.id) * 0.035);
      box(cell.x, y, cell.z, 0.32, 0.45, 0.32, colors.blue);
      box(cell.x, y, cell.z - 0.17, 0.08, 0.28, 0.025, colors.cream);
      box(cell.x, y, cell.z - 0.17, 0.23, 0.08, 0.025, colors.cream);
    }
    boxes.count = boxCount; cylinders.count = cylinderCount;
    boxes.instanceMatrix.needsUpdate = true; boxes.instanceColor.needsUpdate = true;
    cylinders.instanceMatrix.needsUpdate = true;
    if (cylinders.instanceColor) cylinders.instanceColor.needsUpdate = true;
    for (let i = traces.length - 1; i >= 0; i--) if (traces[i].until < now) traces.splice(i, 1);
    const positions = pulses.geometry.attributes.position;
    const visible = traces.slice(-4);
    visible.forEach((trace, i) => { positions.setXYZ(i * 2, ...trace.origin); positions.setXYZ(i * 2 + 1, ...trace.end); });
    positions.needsUpdate = true; pulses.geometry.setDrawRange(0, visible.length * 2);
    $('crosshair').classList.toggle('hit', feedbackUntil > now);
    document.body.classList.toggle('damaged', (health.get('damage') || 0) > now);
    renderer.render(scene, camera); frames++;
  }
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    const intent = input(dt);
    if (run?.phase === 'playing') {
      const inputs = new Map([[0, intent]]);
      for (const player of run.players) {
        if (player.id === 0) continue;
        const received = remote.get(player.id);
        inputs.set(player.id, received && now - received.at <= 250 ? received.input : neutral(player.yaw, player.pitch));
      }
      run = stepRun(run, inputs, dt); live = wire(run); pendingFire = false;
    }
    if (now - networkAt >= 50) {
      networkAt = now;
      if (room.role === 'client' && !disconnected && live.phase !== 'lobby') {
        if (room.sendInput(intent, live.epoch)) pendingFire = false;
      }
      else if (room.role === 'host') room.broadcast(live);
      refresh();
    }
    draw(now);
    requestAnimationFrame(frame);
  }
  if (webgl) requestAnimationFrame(frame);
}
