import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from '../../assets/car-arcade/models.js';
import { createSimulation, projectSegment } from './simulation.js';
import { createWorldView } from './world-view.js';
import { findRoute } from './navigation.js';
import { createPedestrians } from './pedestrians.js';
import { createNeighbourhoodDetails } from './neighbourhood.js';

const $ = id => document.getElementById(id);
const keys = new Set(), touch = new Set();
const dialogs = [...document.querySelectorAll('dialog')];
const SAVE_KEY = 'capital-drive-v1';
const vehicles = [
  { id: 'lantern', name: 'Neighbourhood saloon', note: 'Everyday four-door', label: 'SALOON' },
  { id: 'orchard', name: 'Family wagon', note: 'Room for the long weekend', label: 'WAGON' },
  { id: 'gravel', name: 'Suburban SUV', note: 'A familiar sight in the inner south', label: 'SUV' },
  { id: 'relay', name: 'Executive tourer', note: 'A little more presence', label: 'TOURER' },
  { id: 'atlas', name: 'Weekend ute', note: 'Practical, with some attitude', label: 'UTE' },
];
let map, simulation, world, renderer, scene, camera, playerMesh, route = [], destination = null;
let trafficMeshes = [], parkedChunks = [], selectedCar = 'lantern', selectedPaint = '#e7e6df';
let quality = 'low', started = false, disposed = false, lastTime = 0, accumulator = 0, lastRender = 0, hudTime = 0;
let orbit = 0, orbitHeight = 0, orbitHold = 0, dragging = false, pointer = null, toastTimer;
let discovered = new Set(), mapImage, mapScale, savedError = '', routeClock = 0, audio = null;
let cameraReady = false, raf = 0, frameCount = 0;
let compatibility = false;
const parkedResources = [];
let pedestrians, neighbourhood;
const desiredCamera = new THREE.Vector3(), lookTarget = new THREE.Vector3();
document.body.classList.add('intro-open');

function notify(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    if (raw.length > 4096) throw new Error('Saved data is too large.');
    const save = JSON.parse(raw);
    if (save.version !== 1 || !Array.isArray(save.discovered) || save.discovered.length > 7 ||
        save.discovered.some(id => !map.landmarks.some(p => p.id === id))) throw new Error('Unrecognised saved progress.');
    discovered = new Set(save.discovered);
  } catch (error) {
    savedError = `Progress could not be loaded: ${error.message} This drive will not overwrite it.`;
    $('save-status').textContent = savedError;
  }
}
function saveProgress() {
  if (savedError) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, discovered: [...discovered] })); }
  catch (error) { savedError = `Progress could not be saved: ${error.message}`; $('save-status').textContent = savedError; notify('Browser storage is unavailable. You can keep driving.'); }
}
function paused() { return !started || dialogs.some(dialog => dialog.open) || document.hidden; }
function clearInput() { keys.clear(); touch.clear(); dragging = false; pointer = null; }
function openDialog(id) {
  if (!simulation || !started) return;
  clearInput();
  for (const d of dialogs) if (d.open) d.close();
  $(id).showModal();
  if (id === 'map-dialog') drawMap($('full-map'), true);
}
function closeDialogs() { for (const dialog of dialogs) if (dialog.open) dialog.close(); clearInput(); }
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
for (const dialog of dialogs) dialog.addEventListener('close', () => { clearInput(); renderer?.domElement.focus(); });
$('map-button').addEventListener('click', () => openDialog('map-dialog'));
$('minimap-button').addEventListener('click', () => openDialog('map-dialog'));
$('pause-button').addEventListener('click', () => openDialog('pause-dialog'));
$('garage-button').addEventListener('click', () => openDialog('garage-dialog'));
$('resume-button').addEventListener('click', closeDialogs);
$('start-button').addEventListener('click', () => {
  if (!simulation) return;
  started = true; $('start-panel').hidden = true; document.body.classList.remove('intro-open');
  clearInput(); cameraReady = false; renderer.domElement.focus();
  notify('Welcome to the inner south. Open the map to choose your next stop.');
});
function recover() {
  const p = simulation.player, nearby = simulation.nearestRoad(p.x, p.z);
  if (nearby && nearby.distance < 500) {
    const yaw = nearby.road.oneway === -1 ? nearby.yaw + Math.PI : nearby.yaw;
    const lane = Math.min(2.3, nearby.road.width * .23);
    const trip = p.odometer;
    simulation.reset({ x: nearby.x - Math.cos(yaw) * lane, z: nearby.z + Math.sin(yaw) * lane, yaw });
    p.odometer = trip;
  } else simulation.reset();
  pedestrians?.resetPopulation(simulation.player);
  cameraReady = false; clearInput(); notify('Back on the road.');
}
$('recover-button').addEventListener('click', () => { recover(); closeDialogs(); });
$('quality').addEventListener('change', () => { quality = $('quality').value; resize(); });
$('theme').addEventListener('change', () => document.body.classList.toggle('light', $('theme').value === 'light'));
$('clear-route').addEventListener('click', () => { route = []; destination = null; drawMap($('full-map'), true); });

function selectVehicle(id) {
  if (!scene) return;
  selectedCar = id;
  if (playerMesh) scene.remove(playerMesh);
  playerMesh = createCar(id, { color: selectedPaint });
  scene.add(playerMesh);
  $('car-label').textContent = vehicles.find(v => v.id === id).label;
  for (const button of $('car-options').children) button.setAttribute('aria-pressed', String(button.dataset.car === id));
}
for (const vehicle of vehicles) {
  const button = document.createElement('button');
  button.dataset.car = vehicle.id; button.textContent = vehicle.name;
  button.setAttribute('aria-pressed', String(vehicle.id === selectedCar));
  const note = document.createElement('span'); note.textContent = vehicle.note; button.append(note);
  button.addEventListener('click', () => { selectVehicle(vehicle.id); closeDialogs(); notify(vehicle.name + ' selected.'); });
  $('car-options').append(button);
}
$('paint').addEventListener('change', () => { selectedPaint = $('paint').value; selectVehicle(selectedCar); });

function toggleSound() {
  if (!audio) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      const context = new Audio(), oscillator = context.createOscillator(), filter = context.createBiquadFilter(), gain = context.createGain();
      oscillator.type = 'sawtooth'; oscillator.frequency.value = 36; filter.type = 'lowpass'; filter.frequency.value = 190; gain.gain.value = 0;
      oscillator.connect(filter).connect(gain).connect(context.destination); oscillator.start();
      audio = { context, oscillator, gain, enabled: false };
    } catch (error) { notify(`Audio unavailable: ${error.message}`); return; }
  }
  audio.enabled = !audio.enabled;
  if (audio.enabled) audio.context.resume().catch(() => notify('Your browser could not start audio.'));
  $('sound-button').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  $('sound-button').setAttribute('aria-pressed', String(audio.enabled));
}
$('sound-button').addEventListener('click', toggleSound);
function horn() {
  if (!audio?.enabled) return;
  for (const frequency of [311, 392]) {
    const tone = audio.context.createOscillator(), volume = audio.context.createGain();
    tone.frequency.value = frequency; volume.gain.setValueAtTime(.07, audio.context.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.context.currentTime + .3);
    tone.connect(volume).connect(audio.context.destination); tone.start(); tone.stop(audio.context.currentTime + .32);
    tone.onended = () => { tone.disconnect(); volume.disconnect(); };
  }
}
window.addEventListener('keydown', event => {
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) && event.code !== 'Escape') return;
  const controls = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
  if (controls.includes(event.code)) event.preventDefault();
  if (!event.repeat && started) {
    if (event.code === 'KeyM') { $('map-dialog').open ? closeDialogs() : openDialog('map-dialog'); return; }
    if (event.code === 'KeyP' || event.code === 'Escape') { dialogs.some(d => d.open) ? closeDialogs() : openDialog('pause-dialog'); return; }
    if (event.code === 'KeyR' && !paused()) recover();
    if (event.code === 'KeyH' && !paused()) horn();
  }
  if (!paused()) keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); if (started && !dialogs.some(d => d.open)) openDialog('pause-dialog'); });
document.addEventListener('visibilitychange', () => { clearInput(); if (document.hidden && started) openDialog('pause-dialog'); });
for (const button of document.querySelectorAll('[data-drive]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch.add(button.dataset.drive); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => touch.delete(button.dataset.drive));
}
function input() {
  const held = (...codes) => codes.some(c => keys.has(c));
  return { throttle: Number(held('KeyW', 'ArrowUp') || touch.has('throttle')) - Number(held('KeyS', 'ArrowDown') || touch.has('brake')),
    steer: Number(held('KeyD', 'ArrowRight') || touch.has('right')) - Number(held('KeyA', 'ArrowLeft') || touch.has('left')),
    handbrake: held('Space') || touch.has('handbrake'), boost: held('ShiftLeft', 'ShiftRight') };
}

function createMapImage() {
  const b = map.bounds;
  mapImage = document.createElement('canvas'); mapImage.width = 1800;
  mapScale = mapImage.width / (b.maxX - b.minX);
  mapImage.height = Math.round((b.maxZ - b.minZ) * mapScale);
  const ctx = mapImage.getContext('2d'); ctx.fillStyle = '#dfdfcc'; ctx.fillRect(0, 0, mapImage.width, mapImage.height);
  const path = points => { ctx.beginPath(); points.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo']((x - b.minX) * mapScale, (z - b.minZ) * mapScale)); };
  for (const area of map.areas) { path(area.points); ctx.fillStyle = area.type === 'water' ? '#9ab7ba' : '#bbca9b'; ctx.fill(); }
  ctx.fillStyle = '#bfc1b3';
  for (const building of map.buildings) { path(building.points); ctx.fill(); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const road of map.roads) { path(road.points); ctx.strokeStyle = '#c1c4b9'; ctx.lineWidth = Math.max(1.6, road.width * mapScale + 1.5); ctx.stroke(); }
  for (const road of map.roads) { path(road.points); ctx.strokeStyle = '#fffef3'; ctx.lineWidth = Math.max(1, road.width * mapScale); ctx.stroke(); }
}
function drawMap(canvas, full) {
  if (!mapImage) return;
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, p = simulation.player, b = map.bounds;
  ctx.fillStyle = '#dfdfcc'; ctx.fillRect(0, 0, w, h);
  const scale = full ? Math.min((w - 50) / (b.maxX - b.minX), (h - 50) / (b.maxZ - b.minZ)) : w / 760;
  const cx = full ? (b.minX + b.maxX) / 2 : p.x, cz = full ? (b.minZ + b.maxZ) / 2 : p.z;
  const sx = x => (x - cx) * scale + w / 2, sz = z => (z - cz) * scale + h / 2;
  ctx.drawImage(mapImage, sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
  ctx.strokeStyle = '#6d7d70'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale); ctx.setLineDash([]);
  if (route.length) {
    ctx.beginPath(); route.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo'](sx(x), sz(z)));
    ctx.strokeStyle = '#db742a'; ctx.lineWidth = full ? 5 : 6; ctx.lineJoin = 'round'; ctx.stroke();
  }
  for (const place of map.landmarks) {
    const x = sx(place.x), y = sz(place.z);
    ctx.beginPath(); ctx.arc(x, y, full ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = discovered.has(place.id) ? '#608467' : '#efb15e'; ctx.fill(); ctx.strokeStyle = '#fff8e7'; ctx.lineWidth = 2; ctx.stroke();
    if (full) { ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#253a36'; ctx.fillText(place.name, x + 14, y + 5); }
  }
  ctx.save(); ctx.translate(sx(p.x), sz(p.z)); ctx.rotate(-p.yaw);
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 10); ctx.lineTo(0, 6); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fillStyle = '#182d38'; ctx.fill(); ctx.strokeStyle = '#fff9e9'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
function updatePlaces() {
  $('explored').textContent = `${discovered.size} / ${map.landmarks.length} places discovered`;
  for (const place of map.landmarks) {
    const item = document.querySelector(`[data-place="${place.id}"]`);
    if (item) item.classList.toggle('discovered', discovered.has(place.id));
  }
}
function populatePlaces() {
  for (const place of map.landmarks) {
    const item = document.createElement('div'); item.className = 'place-item'; item.dataset.place = place.id;
    const label = document.createElement('strong'); label.textContent = place.name;
    const buttons = document.createElement('div'); buttons.className = 'button-row';
    const gps = document.createElement('button'); gps.textContent = 'Set route';
    gps.addEventListener('click', () => {
      destination = place; route = findRoute(simulation.graph, simulation.player, place);
      drawMap($('full-map'), true);
      notify(route.length ? `Route set to ${place.name}.` : 'No connected road route found. Choose another place.');
    });
    const start = document.createElement('button'); start.textContent = 'Start nearby';
    start.addEventListener('click', () => {
      let road = null;
      for (const street of map.roads) {
        if (!street.name || street.type === 'service') continue;
        for (let i = 1; i < street.points.length; i++) {
          const a = street.points[i - 1], b = street.points[i];
          const projected = projectSegment(place.x, place.z, a, b);
          if (!road || projected.distance < road.distance) road = { ...projected, road: street, yaw: Math.atan2(a[0] - b[0], a[1] - b[1]) };
        }
      }
      if (road) {
        const yaw = road.road.oneway === -1 ? road.yaw + Math.PI : road.yaw;
        simulation.reset(place.id === 'telopea' ? map.spawn : { x: road.x - Math.cos(yaw) * 2, z: road.z + Math.sin(yaw) * 2, yaw });
        pedestrians.resetPopulation(simulation.player);
        cameraReady = false; closeDialogs(); notify(`Starting near ${place.name}.`);
      }
    });
    buttons.append(gps, start); item.append(label, buttons); $('places').append(item);
  }
  updatePlaces();
}

function createParkedCars() {
  const chunks = new Map(), dummy = new THREE.Object3D(), color = new THREE.Color();
  const palette = [0xe0e0d9, 0xb9bdbb, 0x72797b, 0x344650, 0x3d4843, 0x934e40];
  let seed = 731;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (const road of map.roads) {
    if (!road.name || !['residential', 'tertiary', 'unclassified'].includes(road.type)) continue;
    let distance = 30 + random() * 40;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      while (distance < length) {
        const side = random() < .5 ? 1 : -1, offset = road.width / 2 - .8;
        const x = a[0] + dx * distance / length + dz / length * offset * side, z = a[1] + dz * distance / length - dx / length * offset * side;
        const key = `${Math.floor(x / 300)},${Math.floor(z / 300)}`;
        if (!chunks.has(key)) chunks.set(key, []);
        chunks.get(key).push({ x, z, yaw: Math.atan2(-dx, -dz) + (side < 0 ? Math.PI : 0), suv: random() < .43, color: palette[Math.floor(random() * palette.length)] });
        distance += 90 + random() * 90;
      }
      distance -= length;
    }
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  parkedResources.push(geometry, material);
  simulation.setParkedCars?.([...chunks.values()].flat());
  for (const cars of chunks.values()) {
    const group = new THREE.Group();
    const pieces = [new THREE.InstancedMesh(geometry, material, cars.length), new THREE.InstancedMesh(geometry, material, cars.length), new THREE.InstancedMesh(geometry, material, cars.length * 4)];
    cars.forEach((car, index) => {
      const y = world.heightAt(car.x, car.z), height = car.suv ? .88 : .62;
      dummy.position.set(car.x, y + .36 + height / 2, car.z); dummy.rotation.set(0, car.yaw, 0); dummy.scale.set(car.suv ? 1.98 : 1.85, height, car.suv ? 4.5 : 4.7); dummy.updateMatrix();
      pieces[0].setMatrixAt(index, dummy.matrix); pieces[0].setColorAt(index, color.set(car.color));
      dummy.position.y += height / 2 + .26; dummy.scale.set(1.58, .65, car.suv ? 2.7 : 2.3); dummy.updateMatrix(); pieces[1].setMatrixAt(index, dummy.matrix); pieces[1].setColorAt(index, color.set(0x43565a));
      for (let wheel = 0; wheel < 4; wheel++) {
        const x = wheel % 2 ? .96 : -.96, z = wheel < 2 ? -1.45 : 1.45;
        dummy.position.set(car.x + Math.cos(car.yaw) * x + Math.sin(car.yaw) * z, y + .35, car.z - Math.sin(car.yaw) * x + Math.cos(car.yaw) * z);
        dummy.scale.set(.22, .6, .6); dummy.updateMatrix(); pieces[2].setMatrixAt(index * 4 + wheel, dummy.matrix); pieces[2].setColorAt(index * 4 + wheel, color.set(0x252b2b));
      }
    });
    for (const mesh of pieces) { mesh.computeBoundingSphere(); group.add(mesh); }
    scene.add(group); parkedChunks.push({ group, x: cars[0].x, z: cars[0].z });
  }
}
function resize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight, scale = Math.min(1, (quality === 'low' ? 1100 : 1440) / w, (quality === 'low' ? 650 : 900) / h);
  renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); cameraReady = false;
}
function createCompatibilityRenderer(canvas) {
  const context = canvas.getContext('2d');
  return {
    domElement: canvas, info: { render: { calls: 1, triangles: 0 } },
    setSize(w, h) { canvas.width = w; canvas.height = h; },
    dispose() {},
    render() {
      if (!mapImage) return;
      const p = simulation.player, w = canvas.width, h = canvas.height, scale = 5;
      context.fillStyle = '#d5dbbb'; context.fillRect(0, 0, w, h);
      context.drawImage(mapImage, (map.bounds.minX - p.x) * scale + w / 2, (map.bounds.minZ - p.z) * scale + h / 2,
        (map.bounds.maxX - map.bounds.minX) * scale, (map.bounds.maxZ - map.bounds.minZ) * scale);
      const car = (state, color) => {
        const x = (state.x - p.x) * scale + w / 2, y = (state.z - p.z) * scale + h / 2;
        if (x < -30 || y < -30 || x > w + 30 || y > h + 30) return;
        context.save(); context.translate(x, y); context.rotate(-state.yaw);
        context.fillStyle = '#233135'; context.fillRect(-6, -10, 12, 20);
        context.fillStyle = color; context.fillRect(-4.5, -10.5, 9, 21);
        context.fillStyle = '#42606b'; context.fillRect(-3.7, -4.5, 7.4, 7); context.restore();
      };
      for (const other of simulation.traffic) car(other, '#' + other.color.toString(16).padStart(6, '0'));
      car(p, selectedPaint);
      context.fillStyle = '#976346';
      for (const person of pedestrians?.snapshot() || []) {
        const x = (person.x - p.x) * scale + w / 2, y = (person.z - p.z) * scale + h / 2;
        if (x > 0 && y > 0 && x < w && y < h) { context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fill(); }
      }
      context.fillStyle = '#172127'; context.fillRect(w - 265, 100, 250, 47);
      context.fillStyle = '#f5f2e9'; context.font = 'bold 12px Arial'; context.fillText('2D COMPATIBILITY VIEW', w - 252, 119);
      context.font = '10px Arial'; context.fillText('This browser does not provide WebGL.', w - 252, 135);
    },
  };
}
window.addEventListener('resize', resize);
function updateHud() {
  const p = simulation.player, nearby = simulation.nearestRoad(p.x, p.z);
  $('speed').textContent = String(Math.round(Math.abs(p.speed) * 3.6));
  $('gear').textContent = p.speed < -.5 ? 'R' : Math.abs(p.speed) < .6 ? 'N' : String(Math.min(6, Math.floor(Math.abs(p.speed) / 8) + 1));
  $('speed-fill').style.width = `${Math.min(100, Math.abs(p.speed) / 54 * 100)}%`;
  $('distance').textContent = `${(p.odometer / 1000).toFixed(1)} KM`;
  $('street').textContent = nearby?.road.name || 'Inner south backstreets';
  const nearestPlace = map.landmarks.reduce((a, b) => Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b);
  $('district').textContent = nearestPlace.id === 'telopea' ? 'BARTON' : nearestPlace.name.toUpperCase();
  $('driving-hint').textContent = p.offroad ? 'Off road · R returns you to the street' : 'SPACE handbrake · SHIFT boost';
  $('destination-line').textContent = destination ? `${destination.name} · ${(Math.hypot(destination.x - p.x, destination.z - p.z) / 1000).toFixed(1)} km away` : 'The inner south is yours to explore.';
  if (started && !paused()) for (const place of map.landmarks) {
    if (!discovered.has(place.id) && Math.hypot(place.x - p.x, place.z - p.z) < place.radius) {
      discovered.add(place.id); saveProgress(); updatePlaces();
      notify(discovered.size === map.landmarks.length ? 'Inner south explored. Every place discovered. Keep driving.' : `Discovered: ${place.name}`);
    }
  }
  drawMap($('minimap'), false);
}
function placeCar(mesh, car, dt) {
  const y = world.heightAt(car.x, car.z), fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  const pitch = Math.atan2(world.heightAt(car.x + fx * 2, car.z + fz * 2) - world.heightAt(car.x - fx * 2, car.z - fz * 2), 4);
  mesh.position.set(car.x, y + .18, car.z); mesh.rotation.set(pitch, car.yaw, 0, 'YXZ');
  for (const wheel of mesh.userData.wheels) wheel.rotation.x -= car.speed * dt / .34;
}
function animate(time) {
  if (disposed) return;
  raf = requestAnimationFrame(animate);
  const dt = Math.min(.075, (time - (lastTime || time)) / 1000); lastTime = time;
  if (!paused()) {
    accumulator += dt;
    while (accumulator >= 1 / 60) { simulation.step(1 / 60, input()); accumulator -= 1 / 60; }
    routeClock += dt;
    if (destination && routeClock > 6) { routeClock = 0; route = findRoute(simulation.graph, simulation.player, destination); }
  } else accumulator = 0;
  if (audio) {
    const active = audio.enabled && !paused();
    audio.gain.gain.setTargetAtTime(active ? .022 : 0, audio.context.currentTime, .08);
    audio.oscillator.frequency.setTargetAtTime(35 + Math.abs(simulation.player.speed) * 3.4, audio.context.currentTime, .08);
  }
  if (time - lastRender < (quality === 'low' ? 1000 / 30 : 1000 / 60) - 1) return;
  const renderDt = Math.min(.1, (time - (lastRender || time)) / 1000); lastRender = time;
  const p = simulation.player;
  pedestrians?.update(p, paused() ? 0 : renderDt, simulation.traffic);
  placeCar(playerMesh, p, renderDt);
  for (let i = 0; i < simulation.traffic.length; i++) {
    const car = simulation.traffic[i], mesh = trafficMeshes[i];
    mesh.visible = Math.hypot(car.x - p.x, car.z - p.z) < 300;
    if (mesh.visible) placeCar(mesh, car, paused() ? 0 : renderDt);
  }
  if (++frameCount % 8 === 0) {
    world.update(p, time / 1000);
    neighbourhood?.update(p);
    for (const chunk of parkedChunks) chunk.group.visible = Math.hypot(chunk.x - p.x, chunk.z - p.z) < 600;
  }
  orbitHold = Math.max(0, orbitHold - renderDt);
  if (!dragging && orbitHold === 0) orbit *= Math.exp(-renderDt * 1.6);
  const angle = p.yaw + orbit, distance = !started ? 21 : 10.8 + Math.min(4, Math.abs(p.speed) * .065);
  desiredCamera.set(p.x + Math.sin(angle) * distance, world.heightAt(p.x, p.z) + (!started ? 10 : 5.4) + orbitHeight, p.z + Math.cos(angle) * distance);
  desiredCamera.y = Math.max(desiredCamera.y, world.heightAt(desiredCamera.x, desiredCamera.z) + 2.4);
  camera.position.lerp(desiredCamera, cameraReady ? 1 - Math.exp(-renderDt * 5.5) : 1);
  lookTarget.set(p.x - Math.sin(p.yaw) * 5, world.heightAt(p.x, p.z) + 1.4, p.z - Math.cos(p.yaw) * 5);
  camera.lookAt(lookTarget); cameraReady = true;
  renderer.render(scene, camera);
  hudTime += renderDt;
  if (hudTime > .18) { updateHud(); hudTime = 0; }
}
async function boot() {
  const response = await fetch('./data/canberra.json');
  if (!response.ok) throw new Error(`Map request failed (${response.status}).`);
  map = await response.json();
  simulation = createSimulation(map);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c9d5); scene.fog = new THREE.Fog(0xa9c9d5, 230, 750);
  camera = new THREE.PerspectiveCamera(58, 1, .3, 1100);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' }) || canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
  compatibility = !context;
  if (context) {
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  } else renderer = createCompatibilityRenderer(document.createElement('canvas'));
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Drive with WASD or arrows. Drag to look around.');
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); clearInput(); notify('Graphics paused. Reload this page to restore the driving view.'); if (started) openDialog('pause-dialog'); });
  $('world').append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf8f5dc, 0x697258, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0ce, 2.0); sun.position.set(-300, 450, 180); scene.add(sun);
  world = compatibility ? { heightAt: () => 0, update() {}, dispose() {}, stats: {} } : createWorldView(scene, map);
  world.update(simulation.player, 0);
  pedestrians = createPedestrians(scene, map, world.heightAt);
  neighbourhood = compatibility ? { update() {}, dispose() {}, stats: {} } : createNeighbourhoodDetails(scene, map, world.heightAt);
  neighbourhood.update(simulation.player);
  selectVehicle(selectedCar);
  trafficMeshes = simulation.traffic.map(car => { const mesh = createCar(car.modelId, { color: car.color }); scene.add(mesh); return mesh; });
  if (!compatibility) createParkedCars();
  createMapImage(); loadProgress(); populatePlaces(); resize(); updateHud();
  const viewCanvas = renderer.domElement;
  viewCanvas.addEventListener('pointerdown', event => { if (paused()) return; dragging = true; pointer = [event.clientX, event.clientY]; viewCanvas.setPointerCapture(event.pointerId); });
  viewCanvas.addEventListener('pointermove', event => { if (!dragging || !pointer) return; orbit -= (event.clientX - pointer[0]) * .006; orbitHeight = THREE.MathUtils.clamp(orbitHeight + (event.clientY - pointer[1]) * .025, -1.5, 9); pointer = [event.clientX, event.clientY]; orbitHold = 3; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewCanvas.addEventListener(type, () => { dragging = false; pointer = null; });
  $('loading').textContent = `${map.roads.length.toLocaleString()} real road sections · ${map.buildings.length.toLocaleString()} building footprints${compatibility ? ' · 2D map view (WebGL unavailable)' : ''}`;
  $('start-button').disabled = false;
  // Read-only diagnostics for QA; no production state setters.
  window.capitalDriveSnapshot = () => Object.freeze({ ready: true, started, paused: paused(), player: Object.freeze({ ...simulation.player }),
    discovered: Object.freeze([...discovered]), roadCount: map.roads.length, buildings: map.buildings.length, traffic: simulation.traffic.length,
    visibleTraffic: trafficMeshes.filter(m => m.visible).length, destination: destination?.id ?? null, routePoints: route.length,
    rendering: Object.freeze({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, quality, compatibility }), world: Object.freeze({ ...world.stats }),
    pedestrians: Object.freeze({ ...pedestrians.stats, sample: Object.freeze(pedestrians.snapshot().slice(0, 8)) }), neighbourhood: Object.freeze({ ...neighbourhood.stats }) });
  raf = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', () => {
  disposed = true; cancelAnimationFrame(raf); clearTimeout(toastTimer); clearInput();
  if (audio) audio.context.close().catch(error => console.warn('Could not release audio:', error.message));
  for (const resource of parkedResources) resource.dispose();
  pedestrians?.dispose(); neighbourhood?.dispose(); world?.dispose(); disposeCars(); renderer?.dispose();
});
boot().catch(error => {
  $('loading').textContent = `Unable to start: ${error.message} Reload to try again.`;
  $('loading').setAttribute('role', 'alert'); $('start-button').textContent = 'Reload game'; $('start-button').disabled = false;
  $('start-button').addEventListener('click', () => location.reload(), { once: true });
  console.error('Capital Drive startup failed', error);
});
