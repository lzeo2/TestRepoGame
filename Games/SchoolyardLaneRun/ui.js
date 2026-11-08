/* UI only. RunnerEngine owns movement, timing, spawning, scoring and hits. */
(function () {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const startButton = document.getElementById('start');
  const pauseButton = document.getElementById('pause');
  const restartButton = document.getElementById('restart');
  const character = document.getElementById('character');
  const score = document.getElementById('score');
  const distance = document.getElementById('distance');
  const speed = document.getElementById('speed');
  const result = document.getElementById('result');
  const reason = document.getElementById('result-reason');
  const announcement = document.getElementById('announcement');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = RunnerEngine.create(1);
  let started = false;
  let paused = false;
  let previousFrame = null;

  Schoolyard.roster.forEach(function (person) {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = person.name;
    character.appendChild(option);
  });
  character.value = Schoolyard.selected;

  function announce(message) { announcement.textContent = message; }
  function focusCourt() { canvas.focus({ preventScroll: true }); }

  function updateControls() {
    const over = state.status === 'over';
    startButton.textContent = over ? 'Run ended' : paused ? 'Resume' : started ? 'Running' : 'Start';
    startButton.disabled = over || (started && !paused);
    pauseButton.disabled = !started || over;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(paused));
    restartButton.classList.toggle('retry', over);
  }

  function begin() {
    if (document.hidden || state.status !== 'playing') return;
    started = true;
    paused = false;
    previousFrame = null;
    updateControls();
    announce('Run started. Jump low hurdles, slide under frames, dodge planters.');
  }

  function setPaused(value, message) {
    if (!started || state.status !== 'playing') return;
    if (!value && document.hidden) return;
    paused = value;
    previousFrame = null;
    updateControls();
    announce(message || (paused ? 'Run paused.' : 'Run resumed.'));
  }

  function restart() {
    state = RunnerEngine.create(1);
    started = true;
    paused = document.hidden;
    previousFrame = null;
    result.hidden = true;
    reason.textContent = '';
    updateControls();
    updateStats();
    draw();
    announce(paused ? 'Fresh run paused while tab is hidden.' : 'Fresh run. Score reset.');
  }

  window.schoolyardGame = { get state() { return state; }, restart: restart };

  function action(name) {
    if (document.hidden || paused || state.status !== 'playing') return;
    if (!started) begin();
    RunnerEngine.input(state, name);
  }

  startButton.addEventListener('click', function () {
    if (paused) setPaused(false);
    else begin();
    focusCourt();
  });
  pauseButton.addEventListener('click', function () {
    setPaused(!paused);
    if (!paused) focusCourt();
  });
  restartButton.addEventListener('click', function () { restart(); focusCourt(); });
  character.addEventListener('change', function () {
    Schoolyard.select(character.value);
    announce(character.options[character.selectedIndex].text + ' selected. Fictional avatar.');
  });
  document.querySelectorAll('[data-action]').forEach(function (button) {
    button.addEventListener('click', function () { action(button.dataset.action); focusCourt(); });
  });

  const keys = {
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ArrowUp: 'jump', ' ': 'jump', ArrowDown: 'slide', s: 'slide'
  };
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    const target = event.target;
    if (target instanceof Element && (target.closest('input, select, textarea, button, a') || target.isContentEditable)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (/^[adsp]$/.test(key) && target !== canvas) return;
    if (!keys[key] && key !== 'p') return;
    event.preventDefault();
    if (event.repeat) return;
    if (key === 'p') setPaused(!paused);
    else action(keys[key]);
  });
  document.addEventListener('visibilitychange', function () {
    previousFrame = null;
    if (document.hidden && started && !paused && state.status === 'playing') {
      setPaused(true, 'Tab hidden. Run paused. Resume when ready.');
    }
  });

  function updateStats() {
    score.textContent = String(state.score).padStart(4, '0');
    distance.textContent = Math.floor(state.distance / 10) + ' m';
    speed.textContent = (state.speed / 10).toFixed(1) + ' m/s';
  }

  function finish() {
    const messages = {
      barrier: 'Hit a low hurdle. Jump or change lane.',
      frame: 'Hit an overhead frame. Slide or change lane.',
      planter: 'Hit a solid planter. Change lane to dodge.'
    };
    reason.textContent = messages[state.collision.type];
    result.hidden = false;
    updateControls();
    announce('Run ended. ' + reason.textContent + ' Score ' + state.score + '. Restart to try again.');
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function label(text, x, y, size, color, align) {
    ctx.fillStyle = color;
    ctx.font = size + 'px system-ui, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function background() {
    rect(0, 0, 480, 640, '#39464a');
    rect(0, 0, 480, 132, '#73544b');
    for (let y = 0; y < 132; y += 16) {
      rect(0, y, 480, 2, '#5a4540');
      for (let x = -40 + ((y / 16) % 2) * 40; x < 480; x += 80) rect(x, y, 2, 16, '#5a4540');
    }
    [16, 320].forEach(function (bank) {
      for (let i = 0; i < 4; i++) {
        const x = bank + i * 36;
        rect(x, 39, 32, 76, '#2b414c');
        rect(x + 1, 40, 30, 74, '#527483');
        [46, 50, 54].forEach(function (y) { rect(x + 6, y, 19, 1, '#91a9b1'); });
        rect(x + 24, 77, 3, 10, '#c5c5af');
      }
    });
    rect(187, 42, 106, 81, '#243338');
    rect(193, 48, 42, 69, '#3c535c');
    rect(245, 48, 42, 69, '#3c535c');
    rect(179, 8, 122, 24, '#d3c6a6');
    label('COURT 03', 240, 21, 14, '#263237', 'center');
    rect(0, 122, 480, 12, '#b2a48a');
    for (let y = 154; y < 640; y += 88) rect(0, y, 480, 1, '#445256');
    // Only decorative chalk motion is suppressed. Engine movement is unchanged.
    const offset = reducedMotion.matches ? 0 : state.distance % 72;
    [160, 320].forEach(function (x) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 146, 480, 494); ctx.clip();
      for (let y = 83 + offset; y < 640; y += 72) rect(x - 2, y, 3, 35, '#b9bba7');
      ctx.restore();
    });
    [12, 468].forEach(function (x) { rect(x, 146, 2, 480, '#b9bba7'); });
    ctx.strokeStyle = '#66736c'; ctx.lineWidth = 2;
    [80, 400].forEach(function (x) {
      ctx.beginPath(); ctx.arc(x, 370, 60, 0, Math.PI * 2); ctx.stroke();
    });
    [80, 240, 400].forEach(function (x, i) { label(String(i + 1), x, 596, 20, '#9ca798', 'center'); });
    rect(24, 620, 432, 3, '#b9bba7');
  }

  function propTag(text, x, y) {
    rect(x - 28, y - 9, 56, 18, '#202b31');
    label(text, x, y, 10, '#e6e9e5', 'center');
  }

  function drawProp(prop) {
    const x = prop.x, y = prop.y;
    if (y < -120 || y > 700) return;
    ctx.save();
    if (prop.passed && state.status !== 'over') ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#2a363b';
    ctx.beginPath(); ctx.ellipse(x, y + 11, 53, 12, 0, 0, Math.PI * 2); ctx.fill();
    if (prop.type === 'barrier') {
      rect(x - 38, y - 26, 8, 42, '#c6b185');
      rect(x + 30, y - 26, 8, 42, '#c6b185');
      rect(x - 47, y - 36, 94, 16, '#ccb077');
      rect(x - 26, y - 36, 12, 16, '#705b41');
      rect(x + 14, y - 36, 12, 16, '#705b41');
      propTag('JUMP', x, y - 51);
    } else if (prop.type === 'frame') {
      rect(x - 47, y - 103, 10, 120, '#7c9ca7');
      rect(x + 37, y - 103, 10, 120, '#7c9ca7');
      rect(x - 53, y - 111, 106, 16, '#7c9ca7');
      rect(x - 37, y - 94, 74, 12, '#c6b185');
      rect(x - 53, y + 10, 22, 7, '#4f6e7b');
      rect(x + 31, y + 10, 22, 7, '#4f6e7b');
      propTag('SLIDE', x, y - 124);
    } else {
      rect(x - 44, y - 31, 88, 48, '#9c7765');
      rect(x - 48, y - 35, 96, 10, '#b18a75');
      rect(x - 37, y - 58, 34, 23, '#74836a');
      rect(x - 15, y - 70, 32, 35, '#829173');
      rect(x + 10, y - 55, 28, 20, '#63765d');
      rect(x - 35, y - 18, 70, 3, '#805f51');
      propTag('DODGE', x, y - 84);
    }
    if (state.collision && state.collision.obstacleId === prop.id) {
      ctx.strokeStyle = '#e4ce98'; ctx.lineWidth = 3;
      ctx.strokeRect(x - 57, y - 140, 114, 165);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    const lift = p.jump > 0 ? Math.sin(Math.PI * p.jump / RunnerEngine.constants.jumpDuration) * 76 : 0;
    ctx.fillStyle = '#263237';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 26 - lift / 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (p.slide > 0) {
      ctx.translate(p.x, p.y);
      ctx.scale(1.18, 0.46);
      Schoolyard.drawAvatar(ctx, Schoolyard.selected, 0, 0, 76);
    } else {
      Schoolyard.drawAvatar(ctx, Schoolyard.selected, p.x, p.y - lift, 76);
    }
    ctx.restore();
  }

  function draw() {
    background();
    const props = state.obstacles.slice().sort(function (a, b) { return a.y - b.y; });
    props.filter(function (prop) { return prop.y < state.player.y; }).forEach(drawProp);
    drawPlayer();
    props.filter(function (prop) { return prop.y >= state.player.y; }).forEach(drawProp);
    if (!started || paused || state.status === 'over') {
      const text = state.status === 'over' ? 'RUN ENDED' : paused ? 'PAUSED' : 'COURT READY';
      rect(171, 170, 138, 34, '#202b31');
      label(text, 240, 187, 12, '#e6e9e5', 'center');
    }
  }

  function frame(now) {
    const dt = previousFrame === null ? 0 : (now - previousFrame) / 1000;
    previousFrame = now;
    if (started && !paused && !document.hidden && state.status === 'playing') {
      RunnerEngine.step(state, dt); // Engine caps dt and discards excess time.
      if (state.status === 'over') finish();
    }
    updateStats();
    draw();
    requestAnimationFrame(frame);
  }

  updateControls();
  updateStats();
  draw();
  requestAnimationFrame(frame);
}());
