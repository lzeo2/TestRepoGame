(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var startScreen = document.getElementById('startScreen');
  var overScreen = document.getElementById('overScreen');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var scoreEl = document.getElementById('scoreVal');
  var bestEl = document.getElementById('bestVal');
  var comboEl = document.getElementById('comboVal');
  var finalScoreEl = document.getElementById('finalScore');
  var finalBestEl = document.getElementById('finalBest');

  var W = 540;
  var H = 720;
  var BLOCK_H = 32;
  var INITIAL_W = 200;
  var INIT_SPEED = 240;
  var SPEED_INC = 24;
  var MAX_SPEED = 680;
  var PERFECT_TOL = 6;
  var GROW_BACK = 10;
  var VISIBLE_BLOCKS = 30;
  var MAX_DT = 0.033;

  var PALETTE = ['#06b6d4', '#0891b2', '#14b8a6', '#0d9488', '#38bdf8', '#22d3ee'];

  var state = 'start';
  var rafId = null;
  var lastTime = 0;
  var blocks = [];
  var slices = [];
  var current = null;
  var score = 0;
  var best = 0;
  var combo = 0;
  var cameraY = 0;
  var targetCamY = 0;
  var perfectFlash = 0;

  function loadBest() {
    try {
      if (typeof GameSave !== 'undefined' && GameSave && GameSave.load) {
        var data = GameSave.load('stacktower');
        if (data && typeof data.best === 'number') best = data.best;
      }
    } catch (e) {
      // ignore
    }
  }

  function saveBest() {
    try {
      if (typeof GameSave !== 'undefined' && GameSave && GameSave.save) {
        GameSave.save('stacktower', { best: best });
      }
    } catch (e) {
      // ignore
    }
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    comboEl.textContent = 'x' + String(Math.max(1, combo));
  }

  function spawnBlock() {
    var prev = blocks[blocks.length - 1];
    var idx = blocks.length % PALETTE.length;
    var dir = (blocks.length % 2 === 0) ? 1 : -1;
    var speed = Math.min(INIT_SPEED + (blocks.length - 1) * SPEED_INC, MAX_SPEED);
    current = {
      x: dir === 1 ? -prev.w : W,
      y: prev.y + BLOCK_H,
      w: prev.w,
      dir: dir,
      speed: speed,
      color: PALETTE[idx]
    };
  }

  function resetGame() {
    blocks = [];
    slices = [];
    score = 0;
    combo = 0;
    cameraY = 0;
    targetCamY = 0;
    perfectFlash = 0;
    blocks.push({
      x: (W - INITIAL_W) / 2,
      y: 0,
      w: INITIAL_W,
      color: PALETTE[0]
    });
    spawnBlock();
    updateHud();
  }

  function startGame() {
    if (state === 'playing') return;
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    resetGame();
    state = 'playing';
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function restartGame() {
    overScreen.classList.add('hidden');
    resetGame();
    state = 'playing';
    lastTime = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    state = 'gameover';
    if (score > best) {
      best = score;
      saveBest();
    }
    finalScoreEl.textContent = String(score);
    finalBestEl.textContent = String(best);
    overScreen.classList.remove('hidden');
    updateHud();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function dropBlock() {
    if (state !== 'playing' || !current) return;

    var prev = blocks[blocks.length - 1];
    var left = Math.max(current.x, prev.x);
    var right = Math.min(current.x + current.w, prev.x + prev.w);
    var overlap = right - left;

    if (overlap <= 0) {
      slices.push({
        x: current.x,
        y: current.y,
        w: current.w,
        vy: -120,
        color: current.color
      });
      current = null;
      endGame();
      return;
    }

    var isPerfect = Math.abs(current.x - prev.x) <= PERFECT_TOL;
    var newW = overlap;
    var newX = left;

    if (isPerfect) {
      combo += 1;
      perfectFlash = 0.22;
      var grow = Math.min(GROW_BACK, W - overlap);
      newW = overlap + grow;
      newX = prev.x + (prev.w - newW) / 2;
      score += combo * 10;
    } else {
      combo = 0;
      if (current.x < prev.x) {
        slices.push({
          x: current.x,
          y: current.y,
          w: prev.x - current.x,
          vy: -120,
          color: current.color
        });
      } else if (current.x + current.w > prev.x + prev.w) {
        slices.push({
          x: prev.x + prev.w,
          y: current.y,
          w: current.x + current.w - (prev.x + prev.w),
          vy: -120,
          color: current.color
        });
      }
    }

    newX = Math.max(0, Math.min(W - newW, newX));

    blocks.push({
      x: newX,
      y: current.y,
      w: newW,
      color: current.color
    });

    score += 1;
    current = null;
    updateHud();
    spawnBlock();
  }

  function sy(worldY) {
    return H - (worldY - cameraY);
  }

  function drawBlock(b, flash) {
    var y = sy(b.y + BLOCK_H);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, y, b.w, BLOCK_H);
    if (flash) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(b.x, y, b.w, BLOCK_H);
  }

  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    var groundY = sy(0);
    if (groundY < H) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, W, 2);
    }

    var total = blocks.length;
    var startIdx = 0;
    if (total > VISIBLE_BLOCKS) {
      startIdx = total - VISIBLE_BLOCKS;
    }

    if (startIdx > 0) {
      var anchor = blocks[startIdx];
      var topY = anchor.y + BLOCK_H;
      var bottomY = 0;
      var screenTop = sy(topY);
      var screenBottom = sy(bottomY);
      ctx.fillStyle = anchor.color;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(anchor.x, screenTop, anchor.w, screenBottom - screenTop);
      ctx.globalAlpha = 1;
    }

    for (var i = startIdx; i < total; i++) {
      drawBlock(blocks[i], false);
    }

    if (current) {
      drawBlock(current, perfectFlash > 0);
    }

    for (var j = 0; j < slices.length; j++) {
      var s = slices[j];
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, sy(s.y + BLOCK_H), s.w, BLOCK_H);
    }
  }

  function update(dt) {
    if (state !== 'playing') return;

    if (current) {
      current.x += current.dir * current.speed * dt;
      if (current.dir > 0 && current.x > W) {
        current.x = -current.w;
      } else if (current.dir < 0 && current.x + current.w < 0) {
        current.x = W;
      }
    }

    for (var i = slices.length - 1; i >= 0; i--) {
      var s = slices[i];
      s.vy -= 500 * dt;
      s.y += s.vy * dt;
      if (s.y < cameraY - H) {
        slices.splice(i, 1);
      }
    }

    if (blocks.length > 0) {
      var top = blocks[blocks.length - 1].y + BLOCK_H;
      targetCamY = Math.max(0, top - (H - 170));
    }
    cameraY += (targetCamY - cameraY) * Math.min(1, 7 * dt);

    if (perfectFlash > 0) {
      perfectFlash -= dt;
      if (perfectFlash < 0) perfectFlash = 0;
    }
  }

  function loop(timestamp) {
    rafId = requestAnimationFrame(loop);
    var dt = Math.min(MAX_DT, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    update(dt);
    draw();
  }

  function onKey(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (state === 'start') startGame();
      else if (state === 'playing') dropBlock();
      else if (state === 'gameover') restartGame();
    }
  }

  function onPointer(e) {
    if (e.target === startBtn || e.target === restartBtn || e.target === menuBtn) return;
    if (state === 'start') startGame();
    else if (state === 'playing') dropBlock();
    else if (state === 'gameover') restartGame();
  }

  var menuBtn = document.getElementById('menuBtn');

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', restartGame);
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onPointer);

  loadBest();
  updateHud();
  draw();
}());
