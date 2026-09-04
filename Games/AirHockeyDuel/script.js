(function () {
  'use strict';

  /* ===== CONSTANTS ===== */
  var RW = 400;
  var RH = 600;
  var MALLET_R = 22;
  var PUCK_R = 14;
  var MALLET_SPEED = 330;
  var FRICTION_PER_SEC = 0.88;
  var MAX_PUCK_SPEED = 820;
  var HIT_BOOST = 1.05;
  var WIN_SCORE = 7;
  var FLASH_DUR = 0.9;
  var WALL_BOUNCE = 0.92;

  var GOAL_W_MAP = { normal: 120, wide: 180 };
  var SPEED_MULT = { slow: 0.7, normal: 1.0, fast: 1.3 };

  var AI_CFG = {
    easy:   { speed: 190, react: 0.45, predict: 0.0, jitter: 30 },
    normal: { speed: 310, react: 0.18, predict: 0.45, jitter: 12 },
    hard:   { speed: 470, react: 0.06, predict: 0.82, jitter: 4 }
  };

  var COL = {
    bg: '#0a0a0f',
    rink: '#111827',
    line: '#1e3a4a',
    centerCircle: '#1e3a4a',
    cyan: '#06b6d4',
    teal: '#0d9488',
    amber: '#f59e0b',
    puck: '#e2e8f0',
    puckEdge: '#94a3b8',
    goalArea: '#1a1a2e',
    flashWhite: '#ffffff',
    wall: '#2d3748',
    dimText: '#94a3b8'
  };

  /* ===== STATE ===== */
  var canvas, ctx;
  var gameState = 'start';
  var rafId = null;
  var lastTs = 0;

  var cfg = { speed: 'normal', goal: 'normal', mode: '2p', diff: 'normal' };

  var puck = { x: 0, y: 0, vx: 0, vy: 0, hitCount: 0 };
  var m1 = { x: 0, y: 0 };
  var m2 = { x: 0, y: 0 };
  var m1Prev = { x: 0, y: 0 };
  var m2Prev = { x: 0, y: 0 };
  var m1Vel = { x: 0, y: 0 };
  var m2Vel = { x: 0, y: 0 };

  var score = [0, 0];
  var saves = [0, 0];
  var matchTime = 0;
  var flashTimer = 0;
  var flashGoalSide = -1;
  var winnerIdx = -1;

  var keys = {};
  var touchDirs = {
    p1: { up: false, down: false, left: false, right: false },
    p2: { up: false, down: false, left: false, right: false }
  };
  var isTouchDevice = false;
  var activeTouches = {};

  var aiTarget = { x: RW / 2, y: RH * 0.15 };
  var aiReactTimer = 0;

  /* ===== DOM REFS ===== */
  var elStartScreen, elHud, elWinScreen;
  var elScoreP1, elScoreP2, elTimer;
  var elWinTitle, elWinStats;
  var elTouchControls, elTouchP1, elTouchP2;

  /* ===== HELPERS ===== */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dist(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function goalW() { return GOAL_W_MAP[cfg.goal]; }
  function goalLeft() { return (RW - goalW()) / 2; }
  function goalRight() { return (RW + goalW()) / 2; }
  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  /* ===== DOM CACHE ===== */
  function cacheDom() {
    canvas = document.getElementById('rink');
    ctx = canvas.getContext('2d');
    elStartScreen = document.getElementById('start-screen');
    elHud = document.getElementById('hud');
    elWinScreen = document.getElementById('win-screen');
    elScoreP1 = document.getElementById('score-p1');
    elScoreP2 = document.getElementById('score-p2');
    elTimer = document.getElementById('timer');
    elWinTitle = document.getElementById('win-title');
    elWinStats = document.getElementById('win-stats');
    elTouchControls = document.getElementById('touch-controls');
    elTouchP1 = document.getElementById('touch-p1');
    elTouchP2 = document.getElementById('touch-p2');
  }

  /* ===== SETTINGS UI ===== */
  function initSettings() {
    setupBtnGroup('speed-btns', function (val) { cfg.speed = val; });
    setupBtnGroup('goal-btns', function (val) { cfg.goal = val; });
    setupBtnGroup('mode-btns', function (val) {
      cfg.mode = val;
      var dg = document.getElementById('ai-difficulty-group');
      if (dg) dg.style.display = (val === 'ai') ? '' : 'none';
    });
    setupBtnGroup('diff-btns', function (val) { cfg.diff = val; });

    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('menuBtn').addEventListener('click', goToMenu);
  }

  function setupBtnGroup(id, cb) {
    var el = document.getElementById(id);
    if (!el) return;
    var btns = el.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        for (var j = 0; j < btns.length; j++) {
          btns[j].classList.remove('active');
          btns[j].setAttribute('aria-checked', 'false');
        }
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');
        cb(this.getAttribute('data-val'));
      });
    }
  }

  /* ===== INPUT ===== */
  function initInput() {
    document.addEventListener('keydown', function (e) {
      keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameState === 'start') startGame();
        else if (gameState === 'win') startGame();
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', function (e) {
      keys[e.key] = false;
    });

    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      initTouchButtons();
      initTouchDrag();
    }
  }

  function initTouchButtons() {
    var btns = elTouchControls.querySelectorAll('.touch-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var player = btn.getAttribute('data-player');
        var dir = btn.getAttribute('data-dir');
        function onPress(e) {
          e.preventDefault();
          touchDirs[player][dir] = true;
          btn.classList.add('pressed');
        }
        function onRelease(e) {
          e.preventDefault();
          touchDirs[player][dir] = false;
          btn.classList.remove('pressed');
        }
        btn.addEventListener('touchstart', onPress, { passive: false });
        btn.addEventListener('touchend', onRelease, { passive: false });
        btn.addEventListener('touchcancel', function () {
          touchDirs[player][dir] = false;
          btn.classList.remove('pressed');
        });
        btn.addEventListener('mousedown', onPress);
        btn.addEventListener('mouseup', onRelease);
        btn.addEventListener('mouseleave', function () {
          touchDirs[player][dir] = false;
          btn.classList.remove('pressed');
        });
      })(btns[i]);
    }
  }

  function initTouchDrag() {
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', onCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onCanvasTouchEnd, { passive: false });
  }

  function touchToCanvas(touch) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (RW / rect.width),
      y: (touch.clientY - rect.top) * (RH / rect.height)
    };
  }

  function onCanvasTouchStart(e) {
    if (gameState !== 'playing' && gameState !== 'goal-flash') return;
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var pos = touchToCanvas(t);
      if (pos.y > RH * 0.4 && !activeTouches['p1']) {
        activeTouches['p1'] = t.identifier;
      } else if (pos.y <= RH * 0.6 && cfg.mode === '2p' && !activeTouches['p2']) {
        activeTouches['p2'] = t.identifier;
      }
    }
  }

  function onCanvasTouchMove(e) {
    if (gameState !== 'playing' && gameState !== 'goal-flash') return;
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var pos = touchToCanvas(t);
      if (activeTouches['p1'] === t.identifier) {
        m1.x = clamp(pos.x, MALLET_R, RW - MALLET_R);
        m1.y = clamp(pos.y, RH / 2 + MALLET_R, RH - MALLET_R);
      }
      if (activeTouches['p2'] === t.identifier) {
        m2.x = clamp(pos.x, MALLET_R, RW - MALLET_R);
        m2.y = clamp(pos.y, MALLET_R, RH / 2 - MALLET_R);
      }
    }
  }

  function onCanvasTouchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var id = e.changedTouches[i].identifier;
      if (activeTouches['p1'] === id) delete activeTouches['p1'];
      if (activeTouches['p2'] === id) delete activeTouches['p2'];
    }
  }

  /* ===== GAME FLOW ===== */
  function startGame() {
    cancelRaf();
    score = [0, 0];
    saves = [0, 0];
    matchTime = 0;
    flashTimer = 0;
    flashGoalSide = -1;
    winnerIdx = -1;
    aiReactTimer = 0;
    aiTarget = { x: RW / 2, y: RH * 0.15 };

    resetPositions();
    resetPuck(0);

    elStartScreen.style.display = 'none';
    elWinScreen.style.display = 'none';
    elHud.style.display = '';
    updateHud();

    if (isTouchDevice) {
      elTouchControls.style.display = '';
      elTouchP2.style.display = (cfg.mode === '2p') ? '' : 'none';
    }

    gameState = 'playing';
    lastTs = 0;
    rafId = requestAnimationFrame(gameLoop);
  }

  function goToMenu() {
    cancelRaf();
    gameState = 'start';
    elWinScreen.style.display = 'none';
    elHud.style.display = 'none';
    elTouchControls.style.display = 'none';
    elStartScreen.style.display = '';
    drawIdleRink();
  }

  function cancelRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resetPositions() {
    m1.x = RW / 2;
    m1.y = RH * 0.78;
    m2.x = RW / 2;
    m2.y = RH * 0.22;
    m1Prev.x = m1.x; m1Prev.y = m1.y;
    m2Prev.x = m2.x; m2Prev.y = m2.y;
    m1Vel.x = 0; m1Vel.y = 0;
    m2Vel.x = 0; m2Vel.y = 0;
  }

  function resetPuck(direction) {
    puck.x = RW / 2;
    puck.y = RH / 2;
    puck.hitCount = 0;
    var baseSpeed = 200 * SPEED_MULT[cfg.speed];
    var angle;
    if (direction === 0) {
      angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    } else if (direction === 1) {
      angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    } else {
      angle = Math.random() * Math.PI * 2;
      if (Math.abs(Math.sin(angle)) < 0.3) angle += 0.5;
    }
    puck.vx = Math.cos(angle) * baseSpeed;
    puck.vy = Math.sin(angle) * baseSpeed;
  }

  /* ===== GAME LOOP ===== */
  function gameLoop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (gameState === 'playing') {
      update(dt);
    } else if (gameState === 'goal-flash') {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        if (score[0] >= WIN_SCORE || score[1] >= WIN_SCORE) {
          triggerWin();
          return;
        }
        resetPositions();
        resetPuck(flashGoalSide === 0 ? 1 : 0);
        gameState = 'playing';
      }
    }

    render();

    if (gameState === 'playing' || gameState === 'goal-flash') {
      rafId = requestAnimationFrame(gameLoop);
    }
  }

  /* ===== UPDATE ===== */
  function update(dt) {
    matchTime += dt;

    moveMallet1(dt);
    if (cfg.mode === '2p') {
      moveMallet2(dt);
    } else {
      updateAI(dt);
    }

    updatePuck(dt);
    checkWallBounce();
    checkGoal();
    checkMalletPuckCollision(m1, m1Vel, 0);
    checkMalletPuckCollision(m2, m2Vel, 1);

    updateHud();
  }

  function moveMallet1(dt) {
    var dx = 0, dy = 0;
    if (keys['w'] || keys['W'] || touchDirs.p1.up) dy -= 1;
    if (keys['s'] || keys['S'] || touchDirs.p1.down) dy += 1;
    if (keys['a'] || keys['A'] || touchDirs.p1.left) dx -= 1;
    if (keys['d'] || keys['D'] || touchDirs.p1.right) dx += 1;
    var mag = len(dx, dy);
    if (mag > 0) { dx /= mag; dy /= mag; }
    m1Prev.x = m1.x;
    m1Prev.y = m1.y;
    m1.x += dx * MALLET_SPEED * dt;
    m1.y += dy * MALLET_SPEED * dt;
    m1.x = clamp(m1.x, MALLET_R, RW - MALLET_R);
    m1.y = clamp(m1.y, RH / 2 + MALLET_R, RH - MALLET_R);
    if (dt > 0) {
      m1Vel.x = (m1.x - m1Prev.x) / dt;
      m1Vel.y = (m1.y - m1Prev.y) / dt;
    }
  }

  function moveMallet2(dt) {
    var dx = 0, dy = 0;
    if (keys['ArrowUp'] || touchDirs.p2.up) dy -= 1;
    if (keys['ArrowDown'] || touchDirs.p2.down) dy += 1;
    if (keys['ArrowLeft'] || touchDirs.p2.left) dx -= 1;
    if (keys['ArrowRight'] || touchDirs.p2.right) dx += 1;
    var mag = len(dx, dy);
    if (mag > 0) { dx /= mag; dy /= mag; }
    m2Prev.x = m2.x;
    m2Prev.y = m2.y;
    m2.x += dx * MALLET_SPEED * dt;
    m2.y += dy * MALLET_SPEED * dt;
    m2.x = clamp(m2.x, MALLET_R, RW - MALLET_R);
    m2.y = clamp(m2.y, MALLET_R, RH / 2 - MALLET_R);
    if (dt > 0) {
      m2Vel.x = (m2.x - m2Prev.x) / dt;
      m2Vel.y = (m2.y - m2Prev.y) / dt;
    }
  }

  /* ===== AI ===== */
  function updateAI(dt) {
    var ai = AI_CFG[cfg.diff];
    aiReactTimer -= dt;

    if (aiReactTimer <= 0) {
      aiReactTimer = ai.react;
      computeAiTarget(ai);
    }

    m2Prev.x = m2.x;
    m2Prev.y = m2.y;

    var dx = aiTarget.x - m2.x;
    var dy = aiTarget.y - m2.y;
    var d = len(dx, dy);
    if (d > 1) {
      var step = Math.min(ai.speed * dt, d);
      m2.x += (dx / d) * step;
      m2.y += (dy / d) * step;
    }

    m2.x = clamp(m2.x, MALLET_R, RW - MALLET_R);
    m2.y = clamp(m2.y, MALLET_R, RH / 2 - MALLET_R);

    if (dt > 0) {
      m2Vel.x = (m2.x - m2Prev.x) / dt;
      m2Vel.y = (m2.y - m2Prev.y) / dt;
    }
  }

  function computeAiTarget(ai) {
    var defendX = RW / 2;
    var defendY = RH * 0.12;
    var halfH = RH / 2;

    if (puck.vy < 0 && puck.y < halfH) {
      var predX = puck.x + puck.vx * ai.predict * 0.4;
      predX += (Math.random() - 0.5) * ai.jitter * 2;
      aiTarget.x = clamp(predX, MALLET_R, RW - MALLET_R);
      var strikeY = clamp(puck.y + PUCK_R + MALLET_R * 0.5, MALLET_R, halfH - MALLET_R);
      aiTarget.y = strikeY;
    } else if (puck.y < halfH + 40 && puck.vy >= 0) {
      aiTarget.x = clamp(puck.x + (Math.random() - 0.5) * ai.jitter, MALLET_R, RW - MALLET_R);
      aiTarget.y = clamp(puck.y + MALLET_R, MALLET_R, halfH - MALLET_R);
    } else {
      aiTarget.x = defendX + (Math.random() - 0.5) * ai.jitter;
      aiTarget.y = defendY;
    }
  }

  /* ===== PUCK PHYSICS ===== */
  function updatePuck(dt) {
    puck.vx *= Math.pow(FRICTION_PER_SEC, dt);
    puck.vy *= Math.pow(FRICTION_PER_SEC, dt);

    var spd = len(puck.vx, puck.vy);
    if (spd > MAX_PUCK_SPEED) {
      var scale = MAX_PUCK_SPEED / spd;
      puck.vx *= scale;
      puck.vy *= scale;
    }

    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;
  }

  function checkWallBounce() {
    var gL = goalLeft();
    var gR = goalRight();

    if (puck.x - PUCK_R < 0) {
      puck.x = PUCK_R;
      puck.vx = Math.abs(puck.vx) * WALL_BOUNCE;
    }
    if (puck.x + PUCK_R > RW) {
      puck.x = RW - PUCK_R;
      puck.vx = -Math.abs(puck.vx) * WALL_BOUNCE;
    }

    if (puck.y - PUCK_R < 0) {
      if (puck.x < gL || puck.x > gR) {
        puck.y = PUCK_R;
        puck.vy = Math.abs(puck.vy) * WALL_BOUNCE;
      }
    }
    if (puck.y + PUCK_R > RH) {
      if (puck.x < gL || puck.x > gR) {
        puck.y = RH - PUCK_R;
        puck.vy = -Math.abs(puck.vy) * WALL_BOUNCE;
      }
    }
  }

  function checkGoal() {
    var gL = goalLeft();
    var gR = goalRight();

    if (puck.y + PUCK_R < 0 && puck.x > gL && puck.x < gR) {
      score[0]++;
      flashGoalSide = 0;
      flashTimer = FLASH_DUR;
      gameState = 'goal-flash';
    } else if (puck.y - PUCK_R > RH && puck.x > gL && puck.x < gR) {
      score[1]++;
      flashGoalSide = 1;
      flashTimer = FLASH_DUR;
      gameState = 'goal-flash';
    }

    if (puck.y < -PUCK_R * 3) {
      puck.y = PUCK_R;
      puck.vy = Math.abs(puck.vy);
    }
    if (puck.y > RH + PUCK_R * 3) {
      puck.y = RH - PUCK_R;
      puck.vy = -Math.abs(puck.vy);
    }
  }

  /* ===== MALLETS-PUCK COLLISION ===== */
  function checkMalletPuckCollision(mallet, malletVel, playerIdx) {
    var d = dist(mallet.x, mallet.y, puck.x, puck.y);
    var minDist = MALLET_R + PUCK_R;
    if (d >= minDist || d === 0) return;

    var nx = (puck.x - mallet.x) / d;
    var ny = (puck.y - mallet.y) / d;

    var overlap = minDist - d;
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    var relVx = puck.vx - malletVel.x;
    var relVy = puck.vy - malletVel.y;
    var relDot = relVx * nx + relVy * ny;

    if (relDot < 0) {
      puck.vx -= 2 * relDot * nx;
      puck.vy -= 2 * relDot * ny;

      puck.vx += malletVel.x * 0.5;
      puck.vy += malletVel.y * 0.5;
    }

    var spd = len(puck.vx, puck.vy);
    if (spd > 0) {
      var boosted = Math.min(spd * HIT_BOOST, MAX_PUCK_SPEED);
      puck.vx = (puck.vx / spd) * boosted;
      puck.vy = (puck.vy / spd) * boosted;
    }

    puck.hitCount++;

    var towardGoal = (playerIdx === 0 && puck.vy < 0) || (playerIdx === 1 && puck.vy > 0);
    var inOwnHalf = (playerIdx === 0 && puck.y > RH / 2) || (playerIdx === 1 && puck.y < RH / 2);
    if (towardGoal && !inOwnHalf) {
      saves[playerIdx]++;
    }
  }

  /* ===== WIN ===== */
  function triggerWin() {
    cancelRaf();
    gameState = 'win';
    winnerIdx = score[0] >= WIN_SCORE ? 0 : 1;
    elHud.style.display = 'none';
    elTouchControls.style.display = 'none';

    var label;
    if (winnerIdx === 0) {
      label = 'PLAYER 1 WINS';
    } else {
      label = (cfg.mode === 'ai') ? 'AI WINS' : 'PLAYER 2 WINS';
    }
    elWinTitle.textContent = label;

    while (elWinStats.firstChild) {
      elWinStats.removeChild(elWinStats.firstChild);
    }

    var lines = [];
    lines.push('Score: ' + score[0] + ' - ' + score[1]);
    lines.push('P1 Saves: ' + saves[0]);
    var p2label = (cfg.mode === 'ai') ? 'AI Saves: ' : 'P2 Saves: ';
    lines.push(p2label + saves[1]);
    lines.push('Match Time: ' + formatTime(matchTime));

    var loserScore = score[winnerIdx === 0 ? 1 : 0];
    if (loserScore === 0) {
      lines.push('Shutout victory');
    }

    for (var i = 0; i < lines.length; i++) {
      var p = document.createElement('p');
      p.textContent = lines[i];
      elWinStats.appendChild(p);
    }

    elWinScreen.style.display = '';
    render();
  }

  /* ===== HUD ===== */
  function updateHud() {
    elScoreP1.textContent = score[0];
    elScoreP2.textContent = score[1];
    elTimer.textContent = formatTime(matchTime);
  }

  /* ===== RENDER ===== */
  function render() {
    ctx.clearRect(0, 0, RW, RH);
    drawRink();
    drawEntities();
    if (gameState === 'goal-flash') {
      drawGoalFlash();
    }
  }

  function drawIdleRink() {
    ctx.clearRect(0, 0, RW, RH);
    drawRink();
  }

  function drawRink() {
    ctx.fillStyle = COL.rink;
    ctx.fillRect(0, 0, RW, RH);

    var gL = goalLeft();
    var gR = goalRight();

    ctx.fillStyle = COL.goalArea;
    ctx.fillRect(gL, 0, gR - gL, 8);
    ctx.fillRect(gL, RH - 8, gR - gL, 8);

    ctx.strokeStyle = COL.wall;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(gL, 0);
    ctx.moveTo(gR, 0);
    ctx.lineTo(RW, 0);
    ctx.lineTo(RW, RH);
    ctx.lineTo(gR, RH);
    ctx.moveTo(gL, RH);
    ctx.lineTo(0, RH);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(10, RH / 2);
    ctx.lineTo(RW - 10, RH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = COL.centerCircle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(RW / 2, RH / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = COL.teal;
    ctx.beginPath();
    ctx.arc(RW / 2, RH / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gL + (gR - gL) / 2, 0, 60, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gL + (gR - gL) / 2, RH, 60, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  function drawEntities() {
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(m1.x, m1.y, MALLET_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#134e4a';
    ctx.beginPath();
    ctx.arc(m1.x, m1.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COL.amber;
    ctx.beginPath();
    ctx.arc(m2.x, m2.y, MALLET_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(m2.x, m2.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COL.puck;
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COL.puckEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawGoalFlash() {
    var progress = 1 - (flashTimer / FLASH_DUR);
    var alpha = Math.max(0, 0.4 * (1 - progress));

    ctx.fillStyle = COL.flashWhite;
    ctx.globalAlpha = alpha;
    var gL = goalLeft();
    var gR = goalRight();
    if (flashGoalSide === 0) {
      ctx.fillRect(gL - 10, 0, gR - gL + 20, 60);
    } else {
      ctx.fillRect(gL - 10, RH - 60, gR - gL + 20, 60);
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = COL.flashWhite;
    ctx.font = 'bold 36px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var textAlpha = Math.max(0, 1 - progress * 1.5);
    ctx.globalAlpha = textAlpha;
    ctx.fillText('GOAL', RW / 2, RH / 2);
    ctx.globalAlpha = 1.0;
  }

  /* ===== BOOTSTRAP ===== */
  function init() {
    cacheDom();
    initSettings();
    initInput();
    drawIdleRink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
