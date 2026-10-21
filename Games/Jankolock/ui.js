import { ARENA, HEROES, ITEMS, RULES } from './data.js';
import { createMatch, startMatch, step, setPaused, advanceRound, chooseItem, snapshot } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const STEP = 1 / 60;
const WIDTH = 1040, HEIGHT = 700;
const heroFor = id => HEROES.find(hero => hero.id === id);
const itemFor = id => ITEMS.find(item => item.id === id);
let selectedHero = HEROES[0].id;
let match = createMatch(selectedHero);
let current = snapshot(match), previous = current;
let raf = 0, lastFrame = 0, accumulator = 0, lastHud = 0;
let disposed = false, hallOpen = false, hallController = null, hallHandle = null, portraitModule = null;
let observedPhase = '', observedRound = 0, lastEvent = 0;
let palette = {}, audio = null, audioNodes = new Set();
const shotFlashes = new Map();
const keys = new Set();
const input = { aimX: 700, aimY: 300, pointerFire: false, q: false, e: false };
const moveStick = { id: null, x: 0, y: 0 };
const aimStick = { id: null, x: 0, y: 0 };
let arenaPointer = null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let settings = { theme: 'light', mute: true, motion: false };
try {
  const saved = JSON.parse(localStorage.getItem('jankolock-settings'));
  if (saved && typeof saved === 'object') settings = {
    theme: saved.theme === 'dark' ? 'dark' : 'light',
    mute: saved.mute !== false,
    motion: saved.motion === true
  };
} catch { /* Settings are optional; blocked or malformed storage uses defaults. */ }

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
Object.defineProperty(window, 'jankolockSnapshot', {
  value: () => freeze(snapshot(match)), writable: false, configurable: false
});

function saveSettings() {
  try { localStorage.setItem('jankolock-settings', JSON.stringify(settings)); }
  catch { $('status').textContent = 'Settings cannot be saved here. This match still works.'; }
}
function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  $('themeBtn').textContent = settings.theme === 'light' ? 'Dark theme' : 'Light theme';
  $('muteBtn').textContent = settings.mute ? 'Sound: off' : 'Sound: on';
  $('muteBtn').setAttribute('aria-pressed', String(settings.mute));
  $('motionBtn').textContent = reduced.matches ? 'Motion: reduced' : `Motion: ${settings.motion ? 'on' : 'off'}`;
  $('motionBtn').setAttribute('aria-pressed', String(settings.motion && !reduced.matches));
  $('motionBtn').disabled = reduced.matches;
  hallHandle?.setReducedMotion(reduced.matches || !settings.motion);
  const css = getComputedStyle(document.documentElement);
  for (const name of ['paper', 'panel', 'ink', 'muted', 'blue', 'coral', 'softblue', 'softcoral', 'floor', 'wall', 'walltop', 'shadow']) {
    palette[name] = css.getPropertyValue(`--${name}`).trim();
  }
  schedule();
}
function stopAudio() {
  for (const node of audioNodes) { try { node.stop(); } catch { /* Already ended. */ } }
  audioNodes.clear();
  if (audio) { audio.close().catch(() => {}); audio = null; }
}
function enableAudio() {
  if (settings.mute) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('WebAudio unavailable');
    if (!audio) audio = new Audio();
    audio.resume().catch(() => { $('status').textContent = 'Sound is unavailable. You can keep playing muted.'; });
  } catch {
    settings.mute = true;
    applySettings();
    $('status').textContent = 'Sound is unavailable. You can keep playing muted.';
  }
}
function sound(type) {
  if (settings.mute || !audio || audio.state !== 'running') return;
  const notes = { shot: [240, 100, .035], ability: [160, 330, .09], kill: [90, 45, .1], win: [390, 660, .2], lose: [180, 70, .22] };
  const [from, to, duration] = notes[type] || notes.shot;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = type === 'shot' ? 'square' : 'triangle';
  oscillator.frequency.setValueAtTime(from, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(to, audio.currentTime + duration);
  gain.gain.setValueAtTime(.025, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  audioNodes.add(oscillator);
  oscillator.onended = () => { audioNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(); oscillator.stop(audio.currentTime + duration);
}

function releaseInput() {
  keys.clear(); input.pointerFire = false; input.q = false; input.e = false;
  for (const [stick, element] of [[moveStick, $('movePad')], [aimStick, $('aimPad')]]) {
    if (stick.id !== null && element.hasPointerCapture?.(stick.id)) element.releasePointerCapture(stick.id);
    stick.id = null; stick.x = 0; stick.y = 0;
    element.querySelector('i').style.transform = '';
  }
  if (arenaPointer !== null && canvas.hasPointerCapture?.(arenaPointer)) canvas.releasePointerCapture(arenaPointer);
  arenaPointer = null;
  accumulator = 0; lastFrame = 0;
}
function observation() {
  previous = current;
  current = snapshot(match);
  if (current.phase !== observedPhase || current.round !== observedRound) {
    releaseInput();
    observedPhase = current.phase; observedRound = current.round;
    updatePanels();
  }
  for (const event of current.events) {
    if (event.id <= lastEvent) continue;
    if (event.type === 'shot') shotFlashes.set(event.actorId, performance.now() + 65);
    if (event.actorId === 0 && ['shot', 'ability', 'kill'].includes(event.type)) sound(event.type);
    if (event.type === 'round') sound(event.team === 0 ? 'win' : 'lose');
    lastEvent = Math.max(lastEvent, event.id);
  }
}
function act(action) {
  action(); observation(); updateHud(); schedule();
}
function resetMatch() {
  closeHall(); releaseInput(); stopAudio(); shotFlashes.clear();
  input.aimX = 700; input.aimY = 300;
  match = createMatch(selectedHero);
  current = previous = snapshot(match); observedPhase = ''; lastEvent = 0;
  observation(); updateHud(); schedule();
  $('startBtn').focus();
}
function pause() {
  if (current.phase === 'playing') act(() => setPaused(match, true));
}
function resume() {
  if (document.hidden || hallOpen) return;
  enableAudio(); act(() => setPaused(match, false)); canvas.focus({ preventScroll: true });
}
function gameplayInput() {
  const player = current.actors[0];
  const ax = Number(keys.has('KeyL')) - Number(keys.has('KeyJ'));
  const ay = Number(keys.has('KeyK')) - Number(keys.has('KeyI'));
  const aimAlong = (x, y) => {
    const scale = Math.min(400,
      x > 0 ? (ARENA.width - player.x) / x : x < 0 ? -player.x / x : Infinity,
      y > 0 ? (ARENA.height - player.y) / y : y < 0 ? -player.y / y : Infinity);
    input.aimX = player.x + x * scale; input.aimY = player.y + y * scale;
  };
  if (ax || ay) aimAlong(ax, ay);
  else if (aimStick.id !== null && Math.hypot(aimStick.x, aimStick.y) > .12) aimAlong(aimStick.x, aimStick.y);
  const intent = {
    mx: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + moveStick.x,
    my: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + moveStick.y,
    aimX: Math.max(0, Math.min(ARENA.width, input.aimX)),
    aimY: Math.max(0, Math.min(ARENA.height, input.aimY)),
    fire: input.pointerFire || keys.has('Space') || (aimStick.id !== null && Math.hypot(aimStick.x, aimStick.y) > .12),
    q: input.q, e: input.e
  };
  const length = Math.max(1, Math.hypot(intent.mx, intent.my));
  intent.mx /= length; intent.my /= length;
  input.q = false; input.e = false;
  return intent;
}
function schedule() {
  if (ctx && !raf && !disposed && !document.hidden) raf = requestAnimationFrame(frame);
}
function frame(now) {
  raf = 0;
  if (disposed || document.hidden) return;
  if (current.phase === 'playing' && !hallOpen) {
    const delta = lastFrame ? Math.max(0, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    accumulator = Math.min(.1, accumulator + delta);
    while (accumulator >= STEP && current.phase === 'playing') {
      accumulator -= STEP;
      step(match, gameplayInput(), STEP);
      observation();
    }
  } else { lastFrame = 0; accumulator = 0; }
  if (!hallOpen) draw(now, current.phase === 'playing' ? accumulator / STEP : 1);
  if (now - lastHud > 100) { updateHud(); lastHud = now; }
  if (current.phase === 'playing' && !hallOpen) schedule();
}

function makeHeroCards() {
  for (const hero of HEROES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'hero-card'; button.dataset.hero = hero.id;
    button.setAttribute('aria-pressed', String(hero.id === selectedHero));
    const mark = document.createElement('span'); mark.className = `hero-mark ${hero.id}`; mark.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'), name = document.createElement('strong'), description = document.createElement('small'), kit = document.createElement('small');
    name.textContent = hero.name; description.textContent = hero.description;
    kit.className = 'kit'; kit.textContent = hero.abilities.map((a, i) => `${i ? 'E' : 'Q'}: ${a.name} (${a.cooldown}s)`).join(' / ');
    text.append(name, description, kit); button.append(mark, text);
    button.addEventListener('click', () => {
      if (current.phase !== 'lobby') return;
      selectedHero = hero.id; match = createMatch(selectedHero); current = previous = snapshot(match);
      for (const card of $('heroCards').children) card.setAttribute('aria-pressed', String(card === button));
      $('status').textContent = `${hero.name} selected. Ready to clock in.`; schedule();
    });
    $('heroCards').append(button);
  }
}
function itemList(items) {
  if (!items.length) return 'No items';
  return [...new Set(items)].map(id => `${itemFor(id)?.name || id} x${items.filter(item => item === id).length}`).join(', ');
}
function showSummary() {
  $('roundSummary').replaceChildren();
  for (const actor of current.actors) {
    const row = document.createElement('div'); row.className = 'report-row';
    const name = document.createElement('strong'), stats = document.createElement('span'), items = document.createElement('small');
    name.textContent = `${actor.id === 0 ? 'You' : actor.id === 1 ? 'Ally' : `Rival ${actor.id - 1}`} / ${heroFor(actor.heroId).name}`;
    stats.textContent = `${actor.kills} kills / ${actor.captureSeconds.toFixed(1)}s capture contribution`;
    items.textContent = itemList(actor.items); row.append(name, stats, items); $('roundSummary').append(row);
  }
}
function updatePanels() {
  const phase = current.phase;
  $('lobbyPanel').hidden = phase !== 'lobby';
  $('matchPanel').hidden = phase !== 'playing';
  $('pausePanel').hidden = phase !== 'paused';
  $('resultPanel').hidden = !['roundResult', 'matchResult'].includes(phase);
  $('draftPanel').hidden = phase !== 'draft';
  $('playControls').hidden = phase === 'lobby';
  $('pauseBtn').disabled = !['playing', 'paused'].includes(phase);
  $('pauseBtn').textContent = phase === 'paused' ? 'Resume' : 'Pause';
  if (phase === 'lobby') $('status').textContent = 'Choose a hero, then start. Sound and cosmetic motion are optional.';
  if (phase === 'playing') {
    const hero = heroFor(current.heroId); $('playerName').textContent = hero.name;
    $('abilityHelp').textContent = hero.abilities.map((a, i) => `${i ? 'E' : 'Q'} / ${a.name}: ${a.description}`).join(' ');
    const picks = (current.botPicks || []).map(pick => `${pick.actorId === 1 ? 'Ally' : `Rival ${pick.actorId - 1}`}: ${itemFor(pick.itemId)?.name}`).join('; ');
    $('botDraft').textContent = picks ? `This round's bot draft: ${picks}.` : '';
    $('status').textContent = picks ? `Round ${current.round}. Bot draft: ${picks}.` : 'Clocked in. Hold the ring, use cover, watch your health.';
    canvas.focus({ preventScroll: true });
  }
  if (phase === 'paused') $('status').textContent = 'Paused. Resume when ready.';
  if (phase === 'roundResult' || phase === 'matchResult') {
    const won = current.result?.winner === 0;
    $('resultTitle').textContent = `${won ? 'Dispatch' : 'Returns'} wins ${phase === 'matchResult' ? 'the match' : 'the round'}.`;
    const reasons = { capture: 'Capture influence reached the target.', kill: 'Combat influence decided the round.', timeout: 'The higher influence total at the final bell wins.' };
    const reason = current.suddenDeath ? 'The next kill or uncontested capture score decided sudden death.' : reasons[current.result?.reason] || 'The final influence total decided the round.';
    $('resultReason').textContent = `${current.influence.map(n => n.toFixed(1)).join(' : ')} influence. ${reason} Rounds ${current.wins.join(' : ')}.`;
    $('continueBtn').hidden = phase === 'matchResult'; showSummary();
    $('status').textContent = phase === 'matchResult' ? 'Match complete. Reset returns to hero selection.' : 'Round complete. Continue to choose your next-round item.';
    (phase === 'matchResult' ? $('resultResetBtn') : $('continueBtn')).focus({ preventScroll: true });
  }
  if (phase === 'draft') {
    $('itemCards').replaceChildren();
    for (const id of current.offers) {
      const item = itemFor(id), button = document.createElement('button');
      button.type = 'button'; button.dataset.item = id; button.className = 'item-card';
      const name = document.createElement('strong'), description = document.createElement('small');
      name.textContent = item.name; description.textContent = item.description; button.append(name, description);
      button.addEventListener('click', () => {
        if (current.phase !== 'draft') return;
        act(() => chooseItem(match, id));
      });
      $('itemCards').append(button);
    }
    $('status').textContent = 'Choose one of three items. Combat and the clock are stopped.';
    $('itemCards').firstElementChild?.focus({ preventScroll: true });
  }
}
function updateHud() {
  $('blueScore').textContent = current.influence[0].toFixed(1);
  $('redScore').textContent = current.influence[1].toFixed(1);
  $('clock').textContent = current.suddenDeath ? 'OT' : String(Math.ceil(current.time));
  $('roundLabel').textContent = current.phase === 'lobby' ? `First to ${RULES.winsNeeded} rounds` : `Round ${current.round} / First to ${RULES.winsNeeded}`;
  $('winsLabel').textContent = `Rounds ${current.wins.join(' : ')}`;
  const capture = current.capture;
  $('captureLabel').textContent = capture.contested ? `Contested / Dispatch ${capture.counts[0]} : Returns ${capture.counts[1]} / no scoring` : capture.team === null ? 'Ring empty / no capture score' : `${capture.team === 0 ? 'Dispatch' : 'Returns'} holds / ${capture.warm < RULES.captureWarmup ? `warming ${capture.warm.toFixed(1)}s` : '+2 influence/s'} / ${capture.counts.join(' : ')} inside`;
  if (current.phase === 'lobby') $('captureLabel').textContent = 'Hold the center. First to 40 influence.';
  $('captureWarm').max = RULES.captureWarmup; $('captureWarm').value = capture.warm;
  const player = current.actors[0];
  if (!player) return;
  $('health').max = player.maxHp; $('health').value = player.hp;
  $('healthText').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  $('lifeStatus').textContent = !player.alive ? `Respawn ${player.respawn.toFixed(1)}s` : player.shield > 0 ? `Shield ${Math.ceil(player.shield)}` : player.invulnerable > 0 ? 'Spawn protection' : 'On duty';
  $('inventory').textContent = player.items.length ? itemList(player.items) : 'No items yet. Draft after a round.';
  for (const [i, id] of ['abilityQ', 'abilityE'].entries()) {
    const button = $(id), ability = heroFor(player.heroId).abilities[i];
    const reason = !player.alive ? 'respawning' : current.phase !== 'playing' ? 'combat stopped' : player.cooldowns[i] > .01 ? `${player.cooldowns[i].toFixed(1)}s` : 'ready';
    button.querySelector('span').textContent = `${ability.name} / ${reason}`;
    button.disabled = reason !== 'ready';
    button.title = `${ability.description} ${reason}.`;
  }
}

function project(x, y, elevation = 0) { return { x: 40 + x + (y - 300) * .07, y: 80 + y * .9 - elevation }; }
function polygon(points, fill, stroke = palette.ink, width = 2) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function groundRect(x, y, w, h, elevation, fill, stroke = palette.ink) {
  polygon([project(x, y, elevation), project(x + w, y, elevation), project(x + w, y + h, elevation), project(x, y + h, elevation)], fill, stroke);
}
function groundCircle(x, y, radius, fill, stroke, width = 2) {
  ctx.save(); ctx.translate(40 - 21, 80); ctx.transform(1, 0, .07, .9, 0, 0);
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  ctx.restore();
}
function drawCover(rect, index) {
  const { x, y, w, h } = rect, height = 34;
  const b = project(x + w, y), c = project(x + w, y + h), d = project(x, y + h);
  const at = project(x, y, height), bt = project(x + w, y, height), ct = project(x + w, y + h, height), dt = project(x, y + h, height);
  polygon([b, c, ct, bt], palette.wall);
  polygon([d, c, ct, dt], palette.wall);
  polygon([at, bt, ct, dt], palette.walltop);
  const p = project(x + w / 2, y + h / 2, height);
  ctx.save(); ctx.translate(p.x, p.y); ctx.transform(1, 0, .07, .9, 0, 0);
  ctx.fillStyle = palette.ink; ctx.font = 'bold 13px Atkinson, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(index % 2 ? 'RETURNS' : 'OUTBOUND', 0, 0); ctx.font = '11px Atkinson, sans-serif'; ctx.fillText(`CRATE 0${index + 1}`, 0, 16); ctx.restore();
}
function drawActor(actor, now, ghost = false) {
  const p = project(actor.x, actor.y), color = actor.team === 0 ? palette.blue : palette.coral;
  if (!actor.alive) {
    ctx.fillStyle = palette.ink; ctx.font = 'bold 13px Atkinson, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${actor.id === 0 ? 'YOU' : actor.id === 1 ? 'ALLY' : 'RIVAL'} / ${actor.respawn.toFixed(1)}s`, p.x, p.y - 10); return;
  }
  const wobble = settings.motion && !reduced.matches && current.phase === 'playing' ? Math.sin(now / 110 + actor.id * 2) * .055 : 0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobble); if (ghost) ctx.globalAlpha = .55;
  ctx.fillStyle = palette.ink; ctx.fillRect(-12, -8, 8, 9); ctx.fillRect(4, -8, 8, 9);
  ctx.strokeStyle = palette.ink; ctx.lineWidth = 2; ctx.fillStyle = color;
  ctx.beginPath();
  if (actor.heroId === 'postmaster') ctx.ellipse(0, -21, 21, 22, -.12, 0, Math.PI * 2);
  else { ctx.moveTo(-14, -38); ctx.lineTo(14, -34); ctx.lineTo(17, -10); ctx.lineTo(-16, -10); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.panel;
  if (actor.heroId === 'courier') {
    ctx.fillRect(-15, -51, 28, 20); ctx.strokeRect(-15, -51, 28, 20);
    ctx.fillStyle = palette.ink; ctx.fillRect(-10, -43, 18, 5);
    ctx.fillStyle = palette.walltop; ctx.fillRect(-21, -25, 13, 15); ctx.strokeRect(-21, -25, 13, 15);
  } else if (actor.heroId === 'clerk') {
    ctx.beginPath(); ctx.moveTo(-19, -36); ctx.lineTo(2, -71); ctx.lineTo(17, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.ink; ctx.fillRect(-8, -41, 18, 4);
    ctx.fillStyle = palette.panel; ctx.fillRect(-9, -31, 15, 9); ctx.strokeRect(-9, -31, 15, 9);
  } else {
    ctx.fillRect(-12, -49, 25, 15); ctx.strokeRect(-12, -49, 25, 15);
    ctx.fillStyle = palette.ink; ctx.fillRect(-6, -43, 14, 4);
    ctx.fillStyle = palette.panel; ctx.fillRect(-8, -28, 17, 12); ctx.strokeRect(-8, -28, 17, 12);
  }
  // The cosmetic stamp barrel follows the true aim; neither pose nor flash changes input.
  const dx = Math.cos(actor.aim), dy = Math.sin(actor.aim) * .9;
  ctx.strokeStyle = palette.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(5, -22); ctx.lineTo(5 + dx * 23, -22 + dy * 23); ctx.stroke();
  if ((shotFlashes.get(actor.id) || 0) > now) {
    ctx.fillStyle = palette.panel; ctx.fillRect(2 + dx * 28, -21 + dy * 28, 8, 5);
  }
  ctx.restore();
  if (actor.shield > 0 || actor.invulnerable > 0) groundCircle(actor.x, actor.y, 23, null, color, 3);
  const labelY = p.y - (actor.heroId === 'clerk' ? 84 : 64);
  if (!ghost) {
    ctx.fillStyle = palette.panel; ctx.fillRect(p.x - 21, labelY, 42, 7);
    ctx.fillStyle = color; ctx.fillRect(p.x - 20, labelY + 1, 40 * actor.hp / actor.maxHp, 5);
    ctx.strokeStyle = palette.ink; ctx.lineWidth = 1; ctx.strokeRect(p.x - 21, labelY, 42, 7);
  }
  ctx.fillStyle = palette.ink; ctx.font = 'bold 11px Atkinson, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(ghost ? 'DECOY' : actor.id === 0 ? 'YOU' : actor.id === 1 ? 'ALLY' : `RIVAL ${actor.id - 1}`, p.x, labelY - 7);
  if (actor.team === 0) { ctx.fillStyle = color; ctx.fillRect(p.x - 3, p.y + 7, 6, 6); }
  else polygon([{ x: p.x, y: p.y + 5 }, { x: p.x + 5, y: p.y + 14 }, { x: p.x - 5, y: p.y + 14 }], color, null);
}
function draw(now, alpha) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  groundRect(0, 0, ARENA.width, ARENA.height, -12, palette.wall);
  groundRect(0, 0, ARENA.width, ARENA.height, 0, palette.floor);
  ctx.save(); ctx.strokeStyle = palette.shadow; ctx.lineWidth = 1;
  for (let y = 60; y < ARENA.height; y += 60) { const a = project(0, y), b = project(ARENA.width, y); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let x = 60; x < ARENA.width; x += 60) { const a = project(x, 0), b = project(x, ARENA.height); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.restore();
  for (const [i, spawn] of ARENA.spawns.entries()) {
    groundCircle(spawn.x, spawn.y, 38, i < 2 ? palette.softblue : palette.softcoral, null);
    const p = project(spawn.x, spawn.y); ctx.fillStyle = i < 2 ? palette.blue : palette.coral; ctx.font = 'bold 12px Atkinson, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i < 2 ? 'DISPATCH' : 'RETURNS', p.x, p.y + 4);
  }
  const team = current.capture.team, ring = team === null ? palette.ink : team === 0 ? palette.blue : palette.coral;
  groundCircle(ARENA.zone.x, ARENA.zone.y, ARENA.zone.radius, team === null ? palette.panel : team === 0 ? palette.softblue : palette.softcoral, ring, 4);
  groundCircle(ARENA.zone.x, ARENA.zone.y, ARENA.zone.radius - 10, null, ring, 1);
  const center = project(ARENA.zone.x, ARENA.zone.y); ctx.fillStyle = ring; ctx.font = 'bold 14px Atkinson, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(current.capture.contested ? 'CONTESTED' : 'DISPATCH RING', center.x, center.y + 5);
  for (const rect of ARENA.cover) groundRect(rect.x + 13, rect.y + 12, rect.w + 4, rect.h + 6, 0, palette.shadow, null);
  let actors = current.actors;
  if (current.phase === 'lobby') actors = ARENA.spawns.map((spawn, id) => ({ ...spawn, id, team: id < 2 ? 0 : 1, heroId: id === 0 ? selectedHero : id === 1 ? 'postmaster' : id === 2 ? 'courier' : 'clerk', hp: 100, maxHp: 100, alive: true, aim: id < 2 ? 0 : Math.PI }));
  else actors = actors.map(actor => {
    const old = previous.actors.find(a => a.id === actor.id);
    if (!old || old.alive !== actor.alive || Math.hypot(actor.x - old.x, actor.y - old.y) > 40) return actor;
    return { ...actor, x: old.x + (actor.x - old.x) * alpha, y: old.y + (actor.y - old.y) * alpha };
  });
  for (const actor of actors) if (actor.alive) groundCircle(actor.x + 5, actor.y + 3, actor.heroId === 'postmaster' ? 22 : 17, palette.shadow, null);
  for (const effect of current.effects) {
    if (effect.type === 'slam') groundCircle(effect.x, effect.y, 70, null, palette.coral, 4);
    if (effect.type === 'rush' || effect.type === 'death') groundCircle(effect.x, effect.y, 24, null, palette.ink, 3);
  }
  const layers = ARENA.cover.map((rect, i) => ({ y: rect.y + rect.h, paint: () => drawCover(rect, i) }));
  for (const actor of actors) layers.push({ y: actor.y, paint: () => drawActor(actor, now) });
  for (const effect of current.effects) if (effect.type === 'decoy') layers.push({ y: effect.y, paint: () => drawActor({ ...effect, id: effect.ownerId, heroId: 'clerk', alive: true, aim: 0 }, now, true) });
  for (const bullet of current.bullets) layers.push({ y: bullet.y, paint: () => {
    const p = project(bullet.x, bullet.y, 12), old = project(bullet.px, bullet.py, 12);
    ctx.strokeStyle = bullet.team === 0 ? palette.blue : palette.coral; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(old.x, old.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = palette.panel; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
  } });
  layers.sort((a, b) => a.y - b.y).forEach(layer => layer.paint());
  if (current.phase === 'playing' && actors[0]?.alive) {
    const p = project(Math.max(0, Math.min(ARENA.width, input.aimX)), Math.max(0, Math.min(ARENA.height, input.aimY)));
    ctx.strokeStyle = palette.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.moveTo(p.x - 13, p.y); ctx.lineTo(p.x - 5, p.y); ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x + 13, p.y); ctx.moveTo(p.x, p.y - 13); ctx.lineTo(p.x, p.y - 5); ctx.moveTo(p.x, p.y + 5); ctx.lineTo(p.x, p.y + 13); ctx.stroke();
  }
}
function resize() {
  if (!ctx || hallOpen) return;
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0); schedule();
}
function pointerAim(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * WIDTH, y = (event.clientY - rect.top) / rect.height * HEIGHT;
  input.aimY = Math.max(0, Math.min(ARENA.height, (y - 80) / .9));
  input.aimX = Math.max(0, Math.min(ARENA.width, x - 40 - (input.aimY - 300) * .07));
}
canvas.addEventListener('pointermove', event => { if (current.phase === 'playing' && (arenaPointer === null || arenaPointer === event.pointerId)) pointerAim(event); });
canvas.addEventListener('pointerdown', event => {
  if (current.phase !== 'playing' || event.button !== 0 || arenaPointer !== null) return;
  event.preventDefault(); enableAudio(); canvas.focus({ preventScroll: true }); pointerAim(event);
  arenaPointer = event.pointerId; canvas.setPointerCapture(event.pointerId); input.pointerFire = true;
});
function releaseArena(event) {
  if (event.pointerId !== arenaPointer) return;
  input.pointerFire = false; arenaPointer = null;
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, releaseArena);
canvas.addEventListener('contextmenu', event => event.preventDefault());
function bindStick(element, stick) {
  const position = event => {
    const rect = element.getBoundingClientRect(), radius = rect.width * .35;
    let x = (event.clientX - rect.left - rect.width / 2) / radius, y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
    stick.x = Math.abs(x) < .1 ? 0 : x; stick.y = Math.abs(y) < .1 ? 0 : y;
    element.querySelector('i').style.transform = `translate(${x * radius * .65}px,${y * radius * .65}px)`;
  };
  element.addEventListener('pointerdown', event => {
    if (current.phase !== 'playing' || stick.id !== null) return;
    event.preventDefault(); enableAudio(); stick.id = event.pointerId; element.setPointerCapture(event.pointerId); position(event);
  });
  element.addEventListener('pointermove', event => { if (event.pointerId === stick.id) { event.preventDefault(); position(event); } });
  const release = event => { if (event.pointerId === stick.id) { stick.id = null; stick.x = 0; stick.y = 0; element.querySelector('i').style.transform = ''; } };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(type, release);
}
bindStick($('movePad'), moveStick); bindStick($('aimPad'), aimStick);
const gameKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'Space', 'KeyQ', 'KeyE']);
window.addEventListener('keydown', event => {
  if (hallOpen) { if (event.code === 'Escape') closeHall(); return; }
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (event.repeat || !['playing', 'paused'].includes(current.phase)) return;
    event.preventDefault(); current.phase === 'paused' ? resume() : pause(); return;
  }
  if (current.phase !== 'playing' || !gameKeys.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && event.target instanceof Element && event.target.closest('button,summary')) return;
  event.preventDefault(); keys.add(event.code);
  if (!event.repeat && event.code === 'KeyQ') input.q = true;
  if (!event.repeat && event.code === 'KeyE') input.e = true;
});
window.addEventListener('keyup', event => keys.delete(event.code));
$('abilityQ').addEventListener('click', () => { if (current.phase === 'playing') input.q = true; });
$('abilityE').addEventListener('click', () => { if (current.phase === 'playing') input.e = true; });
$('pauseBtn').addEventListener('click', () => current.phase === 'paused' ? resume() : pause());
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', resetMatch);
$('resultResetBtn').addEventListener('click', resetMatch);
$('startBtn').addEventListener('click', () => { closeHall(); enableAudio(); act(() => startMatch(match)); });
$('continueBtn').addEventListener('click', () => act(() => advanceRound(match)));
$('themeBtn').addEventListener('click', () => { settings.theme = settings.theme === 'light' ? 'dark' : 'light'; applySettings(); saveSettings(); });
$('motionBtn').addEventListener('click', () => { settings.motion = !settings.motion; applySettings(); saveSettings(); });
$('muteBtn').addEventListener('click', () => { settings.mute = !settings.mute; if (settings.mute) stopAudio(); else enableAudio(); applySettings(); saveSettings(); });
reduced.addEventListener('change', applySettings);

async function openHall() {
  if (current.phase !== 'lobby' || hallOpen) return;
  releaseInput(); hallOpen = true; hallController = new AbortController();
  const controller = hallController;
  document.querySelector('.workspace').hidden = true; document.querySelector('.scoreboard').hidden = true; $('hallPanel').hidden = false;
  $('hallPanel').querySelector('.hall-heading').hidden = false;
  $('hallStatus').hidden = false; $('hallStatus').textContent = 'Loading the local trophy hall...'; $('hallBackBtn').focus();
  try {
    portraitModule ||= import('./portrait.js');
    const module = await portraitModule;
    if (controller.signal.aborted) return;
    const pending = module.mountPortrait($('portraitHost'), { signal: controller.signal, reducedMotion: reduced.matches || !settings.motion });
    // The module owns its heading, status and Back control once mounted.
    $('hallPanel').querySelector('.hall-heading').hidden = true;
    $('hallStatus').hidden = true;
    const handle = await pending;
    if (controller.signal.aborted) { handle?.dispose(); return; }
    hallHandle = handle;
  } catch (error) {
    if (!controller.signal.aborted) {
      $('hallPanel').querySelector('.hall-heading').hidden = false;
      $('hallStatus').hidden = false;
      $('hallStatus').textContent = 'Trophy hall is unavailable. Return to dispatch to play a Canvas match.';
    }
  }
}
function closeHall() {
  hallController?.abort(); hallController = null;
  hallHandle?.dispose(); hallHandle = null;
  if (!hallOpen) return;
  hallOpen = false; $('portraitHost').replaceChildren(); $('hallPanel').hidden = true;
  document.querySelector('.workspace').hidden = false; document.querySelector('.scoreboard').hidden = false;
  resize(); $('hallBtn').focus({ preventScroll: true });
}
$('hallBtn').addEventListener('click', openHall);
$('hallBackBtn').addEventListener('click', closeHall);
$('portraitHost').addEventListener('portraitclose', closeHall);
function loseFocus() { releaseInput(); pause(); if (audio?.state === 'running') audio.suspend().catch(() => {}); }
window.addEventListener('blur', loseFocus);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { loseFocus(); if (raf) cancelAnimationFrame(raf); raf = 0; }
  else schedule();
});
const observer = new ResizeObserver(resize); observer.observe(canvas);
window.addEventListener('pagehide', () => {
  loseFocus(); closeHall(); stopAudio(); disposed = true;
  if (raf) cancelAnimationFrame(raf); raf = 0; observer.disconnect();
});
window.addEventListener('pageshow', () => {
  if (disposed) { disposed = false; observer.observe(canvas); resize(); }
});
if (!ctx) {
  $('status').textContent = 'Canvas is unavailable in this browser. A Canvas-capable browser is required.';
} else {
  makeHeroCards(); applySettings(); observation(); updateHud(); resize(); $('startBtn').disabled = false;
}
