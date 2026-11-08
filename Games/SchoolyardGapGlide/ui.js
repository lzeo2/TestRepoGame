/* Original courtyard artwork. Physics, collisions and scoring live in engine.js. */
(function () {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const flapButton = document.getElementById('start');
  const pauseButton = document.getElementById('pause');
  const restartButton = document.getElementById('restart');
  const character = document.getElementById('character');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const statusLabel = document.getElementById('status');
  const announcement = document.getElementById('announcement');
  const engine = window.FlyerEngine;
  let state = engine.create(1);
  let started = false;
  let paused = false;
  let lastTime = null;
  let best = 0;
  try {
    const saved = Number(localStorage.getItem('gap-glide-best'));
    if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
  } catch (_) { /* Storage is optional, including on file://. */ }

  Schoolyard.roster.forEach(function (person) {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = person.name + (person.id === 'sim' ? ' (provisional)' : '');
    character.appendChild(option);
  });
  character.value = Schoolyard.selected;
  character.addEventListener('change', function () {
    Schoolyard.select(character.value);
    announce(character.options[character.selectedIndex].text + ' selected.');
    draw();
  });

  function announce(message) { announcement.textContent = message; }
  function failure() {
    return { floor: 'Hit the floor', ceiling: 'Hit the ceiling', gate: 'Hit a frame' }[state.reason] || 'Run ended';
  }
  function updateHUD() {
    scoreLabel.textContent = String(state.score).padStart(2, '0');
    bestLabel.textContent = String(best).padStart(2, '0');
    statusLabel.textContent = state.status === 'over' ? failure() : paused ? 'Paused' : started ? 'Gliding' : 'Ready';
    flapButton.disabled = paused || state.status === 'over';
    pauseButton.disabled = !started || state.status === 'over';
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
    restartButton.classList.toggle('prominent', state.status === 'over');
  }
  function restart() {
    state = engine.create(1);
    started = false;
    paused = false;
    lastTime = null;
    updateHUD();
    draw();
    announce('Restarted. Score zero. Flap to begin.');
  }
  function flap() {
    if (paused || document.hidden || state.status !== 'playing') return;
    if (engine.input(state, 'flap') && !started) {
      started = true;
      lastTime = null;
      updateHUD();
      announce('Gliding.');
    }
  }
  function setPaused(value) {
    if (!started || state.status === 'over' || paused === value) return;
    paused = value;
    lastTime = null;
    updateHUD();
    draw();
    announce(paused ? 'Paused.' : 'Gliding.');
  }
  flapButton.addEventListener('click', flap);
  flapButton.addEventListener('keydown', function (event) {
    if (event.repeat && (event.code === 'Space' || event.code === 'Enter')) event.preventDefault();
  });
  restartButton.addEventListener('click', restart);
  pauseButton.addEventListener('click', function () { setPaused(!paused); });
  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    flap();
  });
  window.addEventListener('keydown', function (event) {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    const target = event.target;
    // Native button Space/Enter clicks must remain the sole button activation.
    if (target instanceof Element && target.closest('button,select,input,textarea,a,[contenteditable]')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) flap();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) setPaused(true);
  });

  function rect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }
  function line(points, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    points.forEach(function (p, index) {
      if (index === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    });
    ctx.stroke();
  }
  function text(label, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = size + 'px system-ui, sans-serif';
    ctx.fillText(label, x, y);
  }
  function courtyard() {
    // Static scenery: no decorative motion or camera shake, even during play.
    rect(0, 0, 480, 640, '#29383e');
    rect(0, 95, 480, 355, '#684f46');
    for (let y = 105; y < 450; y += 24) {
      line([[0, y], [480, y]], '#775e53');
      for (let x = (Math.floor(y / 24) % 2 ? -40 : 0); x < 480; x += 80) {
        line([[x, y - 23], [x, y]], '#775e53');
      }
    }
    rect(0, 82, 480, 17, '#a6967c');
    rect(0, 98, 480, 5, '#3c4140');
    [32, 180, 328].forEach(function (x) {
      rect(x, 130, 112, 126, '#303e42');
      rect(x + 5, 135, 102, 116, '#819398');
      rect(x + 9, 139, 94, 108, '#384f59');
      rect(x + 54, 135, 4, 116, '#819398');
      rect(x + 5, 190, 102, 4, '#819398');
    });
    rect(28, 281, 138, 32, '#303e42');
    text('WEST COURT', 41, 302, 12, '#d5d5c7');
    rect(0, 342, 480, 174, '#34434a');
    for (let x = 12; x < 480; x += 57) {
      rect(x, 352, 51, 148, '#526b7a');
      rect(x + 3, 355, 45, 142, '#587483');
      [363, 369, 375].forEach(function (y) { rect(x + 12, y, 25, 2, '#344c59'); });
      rect(x + 38, 418, 3, 14, '#c2c4b9');
      rect(x + 4, 483, 43, 2, '#405d6c');
    }
    rect(0, 510, 480, 130, '#414b4c');
    rect(0, 510, 480, 7, '#a5967c');
    [550, 600].forEach(function (y) { line([[0, y], [480, y]], '#515b5a'); });
    [40, 180, 320, 460].forEach(function (x) { line([[x, 517], [x - 35, 640]], '#515b5a'); });
    line([[235, 549], [443, 549], [428, 604], [220, 604], [235, 549]], '#b3b3a0', 2);
    rect(0, 0, 480, 5, '#b2a78e');
    rect(0, 635, 480, 5, '#b2a78e');
  }
  function gateSolid(gate, y, height, upper) {
    if (height <= 0) return;
    const x = gate.x;
    const w = gate.width;
    // Every fill stays inside the engine's solid rectangle, not in the gap.
    rect(x, y, w, height, '#acc1c2');
    rect(x + 4, y, w - 8, height, '#354f60');
    rect(x + 9, y, w - 18, height, '#496776');
    for (let sy = y + 24; sy < y + height - 16; sy += 40) {
      rect(x + 17, sy, w - 34, 3, '#263e4c');
      rect(x + 17, sy + 7, w - 34, 3, '#263e4c');
    }
    const edgeY = upper ? y + height - 8 : y;
    rect(x, edgeY, w, 8, '#d9ba79');
    if (height > 60) text('G' + String(gate.id).padStart(2, '0'), x + 14, upper ? y + height - 24 : y + 33, 11, '#edf0e9');
  }
  function draw() {
    courtyard();
    state.gates.forEach(function (gate) {
      if (gate.x > 480 || gate.x + gate.width < 0) return;
      const upper = gate.center - gate.gap / 2;
      const lower = gate.center + gate.gap / 2;
      gateSolid(gate, 0, upper, true);
      gateSolid(gate, lower, 640 - lower, false);
    });
    const p = state.player;
    // drawAvatar takes bottom-center. Its 26px figure fits the r14 collider.
    Schoolyard.drawAvatar(ctx, Schoolyard.selected, p.x, p.y + 13, 26);
    ctx.fillStyle = '#ded8be';
    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y - 2);
    ctx.lineTo(p.x + 18, p.y + 2);
    ctx.lineTo(p.x - 8, p.y + 7);
    ctx.closePath();
    ctx.fill();
    line([[p.x - 8, p.y + 7], [p.x + 4, p.y + 3], [p.x + 18, p.y + 2]], '#8d9a9c');
    if (paused || state.status === 'over') {
      rect(78, 263, 324, 102, '#14191c');
      rect(78, 263, 4, 102, '#d9ba79');
      text(paused ? 'Paused' : failure(), 102, 303, 24, '#edf0e9');
      text(paused ? 'Resume when ready' : state.score + ' gaps · restart below', 102, 337, 16, '#b5bfc1');
    }
  }
  function frame(now) {
    const dt = lastTime === null ? 0 : (now - lastTime) / 1000;
    lastTime = now;
    if (started && !paused && !document.hidden && state.status === 'playing') {
      const oldScore = state.score;
      engine.step(state, dt); // The engine alone bounds and subdivides dt.
      if (state.score !== oldScore) {
        if (state.score > best) {
          best = state.score;
          try { localStorage.setItem('gap-glide-best', String(best)); } catch (_) {}
        }
        updateHUD();
        announce(state.score + (state.score === 1 ? ' gap cleared.' : ' gaps cleared.'));
      }
      if (state.status === 'over') {
        updateHUD();
        announce(failure() + '. ' + state.score + ' gaps. Restart to try again.');
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  window.schoolyardGame = { get state() { return state; }, restart };
  updateHUD();
  draw();
  requestAnimationFrame(frame);
}());
