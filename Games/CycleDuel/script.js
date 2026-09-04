(function () {
  'use strict';

  const COLS = 45;
  const ROWS = 31;
  const CELL = 16;
  const WIN_SCORE = 5;
  const SUDDEN_DEATH_MS = 45000;
  const SHRINK_MS = 1000;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  const SPEED_TICK_MS = { slow: 100, normal: 71, fast: 56 };
  const AI_DEPTH = { easy: 1, normal: 2, hard: 3 };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const el = {
    hud: document.getElementById('hud'),
    score: document.getElementById('scoreVal'),
    timer: document.getElementById('timerVal'),
    startScreen: document.getElementById('startScreen'),
    roundScreen: document.getElementById('roundScreen'),
    winScreen: document.getElementById('winScreen'),
    roundTitle: document.getElementById('roundTitle'),
    roundDetail: document.getElementById('roundDetail'),
    winTitle: document.getElementById('winTitle'),
    winDetail: document.getElementById('winDetail'),
    startBtn: document.getElementById('startBtn'),
    nextRoundBtn: document.getElementById('nextRoundBtn'),
    restartBtn: document.getElementById('restartBtn'),
    menuBtn: document.getElementById('menuBtn'),
    diffRow: document.getElementById('diffRow'),
    touchNote: document.getElementById('touchNote'),
    touchControls: document.getElementById('touchControls')
  };

  const settings = {
    speed: 'normal',
    obstacles: false,
    mode: '2p',
    difficulty: 'normal'
  };

  let rafId = null;
  let lastFrame = 0;
  let accum = 0;
  let tickInterval = SPEED_TICK_MS.normal;
  let matchScore = [0, 0];
  let roundTime = 0;
  let suddenDeath = false;
  let lastShrink = 0;
  let margin = 0;
  let obstacles = new Set();
  let occupied = new Set();
  let players = [];
  let playing = false;

  function init() {
    bindSegments('speedSeg', 'speed', SPEED_TICK_MS);
    bindSegments('obsSeg', 'obstacles', { false: false, true: true });
    bindSegments('modeSeg', 'mode', { '2p': '2p', ai: 'ai' });
    bindSegments('diffSeg', 'difficulty', AI_DEPTH);

    el.startBtn.addEventListener('click', startMatch);
    el.nextRoundBtn.addEventListener('click', startRound);
    el.restartBtn.addEventListener('click', startMatch);
    el.menuBtn.addEventListener('click', showStart);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    document.querySelectorAll('.pad button').forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        queueInput(0, btn.dataset.dir);
      });
    });

    updateSettingsUI();
    showStart();
  }

  function bindSegments(groupId, key, map) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings[key] = map[btn.dataset.val];
        if (key === 'speed') tickInterval = SPEED_TICK_MS[settings.speed];
        if (key === 'mode') onModeChange();
        updateSettingsUI();
      });
    });
  }

  function updateSettingsUI() {
    setActive('speedSeg', settings.speed);
    setActive('obsSeg', String(settings.obstacles));
    setActive('modeSeg', settings.mode);
    setActive('diffSeg', settings.difficulty);
    el.diffRow.hidden = settings.mode !== 'ai';
  }

  function setActive(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.val === String(value));
    });
  }

  function onModeChange() {
    el.touchNote.hidden = !(isTouch() && settings.mode === '2p');
  }

  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  function showStart() {
    stopLoop();
    playing = false;
    matchScore = [0, 0];
    updateScore();
    hideScreens();
    el.startScreen.hidden = false;
    el.hud.hidden = true;
    el.touchControls.hidden = true;
    onModeChange();
    render();
  }

  function startMatch() {
    matchScore = [0, 0];
    updateScore();
    startRound();
  }

  function startRound() {
    hideScreens();
    el.hud.hidden = false;
    el.touchControls.hidden = !(isTouch() && settings.mode === 'ai');

    obstacles = new Set();
    if (settings.obstacles) generateObstacles();
    occupied = new Set(obstacles);

    const midY = Math.floor(ROWS / 2);
    const leftX = Math.floor(COLS / 4);
    const rightX = COLS - leftX - 1;

    players = [
      makePlayer(0, leftX, midY, 'right', '#06b6d4'),
      makePlayer(1, rightX, midY, 'left', '#f59e0b')
    ];

    roundTime = 0;
    suddenDeath = false;
    lastShrink = 0;
    margin = 0;
    playing = true;
    lastFrame = performance.now();
    accum = 0;
    tickInterval = SPEED_TICK_MS[settings.speed];

    stopLoop();
    rafId = requestAnimationFrame(gameLoop);
  }

  function makePlayer(id, x, y, dir, color) {
    return {
      id: id,
      x: x,
      y: y,
      dir: dir,
      color: color,
      alive: true,
      buffer: '',
      trail: new Set()
    };
  }

  function generateObstacles() {
    const count = 10;
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    const p1x = Math.floor(COLS / 4);
    const p2x = COLS - p1x - 1;
    const py = Math.floor(ROWS / 2);

    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 1000) {
      attempts += 1;
      const w = 2 + Math.floor(Math.random() * 3);
      const h = 2 + Math.floor(Math.random() * 3);
      const x = 2 + Math.floor(Math.random() * (COLS - w - 4));
      const y = 2 + Math.floor(Math.random() * (ROWS - h - 4));

      let tooClose = false;
      for (let yy = y - 2; yy <= y + h + 1 && !tooClose; yy++) {
        for (let xx = x - 2; xx <= x + w + 1 && !tooClose; xx++) {
          const dx = xx - centerX;
          const dy = yy - centerY;
          if (Math.abs(dx) < 6 && Math.abs(dy) < 4) tooClose = true;
          const dp1 = Math.abs(xx - p1x) + Math.abs(yy - py);
          const dp2 = Math.abs(xx - p2x) + Math.abs(yy - py);
          if (dp1 < 4 || dp2 < 4) tooClose = true;
        }
      }
      if (tooClose) continue;

      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          obstacles.add(key(xx, yy));
        }
      }
      placed += 1;
    }
  }

  function key(x, y) {
    return x + ',' + y;
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function hideScreens() {
    el.startScreen.hidden = true;
    el.roundScreen.hidden = true;
    el.winScreen.hidden = true;
  }

  function gameLoop(ts) {
    if (!playing) return;
    const delta = ts - lastFrame;
    lastFrame = ts;
    accum += delta;

    let steps = 0;
    while (accum >= tickInterval) {
      step();
      accum -= tickInterval;
      steps += 1;
      if (steps > 5) {
        accum = 0;
        break;
      }
    }

    render();
    rafId = requestAnimationFrame(gameLoop);
  }

  function step() {
    roundTime += tickInterval;

    if (!suddenDeath && roundTime >= SUDDEN_DEATH_MS) {
      suddenDeath = true;
      lastShrink = roundTime;
    }

    if (suddenDeath && roundTime - lastShrink >= SHRINK_MS) {
      margin += 1;
      lastShrink = roundTime;
      const maxMargin = Math.floor(Math.min(COLS, ROWS) / 2) - 2;
      if (margin > maxMargin) margin = maxMargin;
      killOutsideBounds();
    }

    if (settings.mode === 'ai') aiMove();

    applyInputs();

    const moves = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) continue;
      const d = DIRS[p.dir];
      const nx = wrap(p.x + d.x, COLS);
      const ny = wrap(p.y + d.y, ROWS);
      moves.push({ index: i, nx: nx, ny: ny });
    }

    const deaths = [];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      if (outsideShrink(m.nx, m.ny)) {
        deaths.push(m.index);
        continue;
      }
      if (occupied.has(key(m.nx, m.ny))) {
        deaths.push(m.index);
        continue;
      }
      for (let j = 0; j < players.length; j++) {
        if (!players[j].alive) continue;
        if (j === m.index) continue;
        if (players[j].x === m.nx && players[j].y === m.ny) {
          deaths.push(m.index);
          break;
        }
      }
    }

    for (let i = 0; i < moves.length; i++) {
      for (let j = i + 1; j < moves.length; j++) {
        if (moves[i].nx === moves[j].nx && moves[i].ny === moves[j].ny) {
          deaths.push(moves[i].index);
          deaths.push(moves[j].index);
        }
      }
    }

    const deadSet = new Set(deaths);
    let aliveCount = 0;
    let aliveIndex = -1;

    for (let i = 0; i < players.length; i++) {
      if (deadSet.has(i)) {
        players[i].alive = false;
      }
    }

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const p = players[m.index];
      if (deadSet.has(m.index)) continue;
      const k = key(p.x, p.y);
      occupied.add(k);
      p.trail.add(k);
      p.x = m.nx;
      p.y = m.ny;
      aliveCount += 1;
      aliveIndex = m.index;
    }

    if (aliveCount <= 1) {
      finishRound(aliveCount === 1 ? aliveIndex : -1);
    }
  }

  function wrap(v, max) {
    return (v + max) % max;
  }

  function outsideShrink(x, y) {
    if (!suddenDeath) return false;
    const minX = margin;
    const maxX = COLS - 1 - margin;
    const minY = margin;
    const maxY = ROWS - 1 - margin;
    return x < minX || x > maxX || y < minY || y > maxY;
  }

  function killOutsideBounds() {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.alive && outsideShrink(p.x, p.y)) {
        p.alive = false;
      }
    }
  }

  function applyInputs() {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive || !p.buffer) continue;
      if (p.buffer !== OPPOSITE[p.dir]) {
        p.dir = p.buffer;
      }
      p.buffer = '';
    }
  }

  function queueInput(playerIndex, dir) {
    if (!playing) return;
    const p = players[playerIndex];
    if (!p || !p.alive) return;
    if (dir === OPPOSITE[p.dir]) return;
    p.buffer = dir;
  }

  function onKeyDown(e) {
    const k = e.key;
    let consumed = false;

    if (k === ' ' || k === 'Spacebar') {
      if (!playing) {
        if (!el.startScreen.hidden) {
          startMatch();
        } else if (!el.roundScreen.hidden) {
          startRound();
        } else if (!el.winScreen.hidden) {
          startMatch();
        }
      }
      consumed = true;
    }

    const p1 = { w: 'up', a: 'left', s: 'down', d: 'right' }[k.toLowerCase()];
    if (p1) {
      queueInput(0, p1);
      consumed = true;
    }

    const p2 = {
      ArrowUp: 'up',
      ArrowLeft: 'left',
      ArrowDown: 'down',
      ArrowRight: 'right'
    }[k];
    if (p2) {
      queueInput(1, p2);
      consumed = true;
    }

    if (consumed) e.preventDefault();
  }

  function onKeyUp(e) {
    if ([' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key && e.key.toLowerCase && ['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }

  function aiMove() {
    const p = players[1];
    if (!p || !p.alive) return;

    const depth = AI_DEPTH[settings.difficulty];
    const candidates = [];
    const order = ['left', 'right', 'up', 'down'];

    for (let i = 0; i < order.length; i++) {
      const dir = order[i];
      if (dir === OPPOSITE[p.dir]) continue;
      const d = DIRS[dir];
      const nx = wrap(p.x + d.x, COLS);
      const ny = wrap(p.y + d.y, ROWS);
      if (outsideShrink(nx, ny) || occupied.has(key(nx, ny))) continue;
      if (hitsPlayerHead(nx, ny, p.id)) continue;
      const score = countFree(nx, ny, dir, depth);
      candidates.push({ dir: dir, score: score });
    }

    if (candidates.length === 0) return;
    candidates.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.dir === p.dir) return -1;
      if (b.dir === p.dir) return 1;
      return 0;
    });

    const chosen = candidates[0].dir;
    if (chosen !== OPPOSITE[p.dir]) {
      p.buffer = chosen;
    }
  }

  function hitsPlayerHead(x, y, selfId) {
    for (let i = 0; i < players.length; i++) {
      const other = players[i];
      if (!other.alive) continue;
      if (other.id === selfId) continue;
      if (other.x === x && other.y === y) return true;
    }
    return false;
  }

  function countFree(x, y, dir, depth) {
    const d = DIRS[dir];
    let free = 0;
    for (let i = 1; i <= depth; i++) {
      const nx = wrap(x + d.x * i, COLS);
      const ny = wrap(y + d.y * i, ROWS);
      if (outsideShrink(nx, ny) || occupied.has(key(nx, ny))) break;
      free += 1;
    }
    return free;
  }

  function finishRound(winner) {
    playing = false;
    stopLoop();

    if (winner === 0 || winner === 1) {
      matchScore[winner] += 1;
    }
    updateScore();

    if (matchScore[0] >= WIN_SCORE || matchScore[1] >= WIN_SCORE) {
      const matchWinner = winner >= 0 ? winner : (matchScore[0] > matchScore[1] ? 0 : 1);
      showMatchWin(matchWinner);
    } else {
      showRoundResult(winner);
    }
  }

  function updateScore() {
    el.score.textContent = matchScore[0] + ' - ' + matchScore[1];
  }

  function updateTimer() {
    const secs = Math.floor(roundTime / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    el.timer.textContent = m + ':' + (s < 10 ? '0' + s : s);
  }

  function showRoundResult(winner) {
    let title;
    let detail;
    if (winner === 0) {
      title = 'P1 wins the round';
      detail = 'Cyan rider survives.';
    } else if (winner === 1) {
      title = 'P2 wins the round';
      detail = settings.mode === 'ai' ? 'AI wins this round.' : 'Amber rider survives.';
    } else {
      title = 'Draw';
      detail = 'Both riders crashed.';
    }
    el.roundTitle.textContent = title;
    el.roundDetail.textContent = detail;
    el.roundScreen.hidden = false;
    el.touchControls.hidden = true;
  }

  function showMatchWin(winner) {
    const name = winner === 0 ? 'P1' : (settings.mode === 'ai' ? 'AI' : 'P2');
    el.winTitle.textContent = name + ' wins the match';
    el.winDetail.textContent = 'Final score ' + matchScore[0] + ' - ' + matchScore[1];
    el.winScreen.hidden = false;
    el.touchControls.hidden = true;
  }

  function render() {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawObstacles();
    drawShrink();
    drawTrails();
    drawHeads();
    updateTimer();
  }

  function drawGrid() {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(COLS * CELL, y * CELL + 0.5);
    }
    ctx.stroke();
  }

  function drawObstacles() {
    ctx.fillStyle = '#334155';
    obstacles.forEach(function (k) {
      const parts = k.split(',');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function drawShrink() {
    if (!suddenDeath) return;
    const minX = margin;
    const maxX = COLS - 1 - margin;
    const minY = margin;
    const maxY = ROWS - 1 - margin;
    if (minX > maxX || minY > maxY) return;

    const left = minX * CELL;
    const top = minY * CELL;
    const right = (maxX + 1) * CELL;
    const bottom = (maxY + 1) * CELL;
    const w = COLS * CELL;
    const h = ROWS * CELL;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.fillRect(0, 0, w, top);
    ctx.fillRect(0, bottom, w, h - bottom);
    ctx.fillRect(0, top, left, bottom - top);
    ctx.fillRect(right, top, w - right, bottom - top);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(left + 1, top + 1, right - left - 2, bottom - top - 2);
  }

  function drawTrails() {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      ctx.fillStyle = p.color;
      p.trail.forEach(function (k) {
        const parts = k.split(',');
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
      });
    }
  }

  function drawHeads() {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.alive) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4);
    }
  }

  init();
})();
