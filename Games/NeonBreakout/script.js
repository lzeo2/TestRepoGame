'use strict';

// ---------- Setup ----------
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var W = canvas.width;   // 480
var H = canvas.height;  // 640

var HI_KEY = 'neonbreakout_highscore';

// ---------- Screens ----------
var screens = {
  start: document.getElementById('start'),
  death: document.getElementById('death'),
  win: document.getElementById('win'),
  pause: document.getElementById('pause')
};
function show(name) {
  for (var k in screens) screens[k].classList.add('hidden');
  if (name && screens[name]) screens[name].classList.remove('hidden');
}

// ---------- State ----------
var state = 'start'; // start | play | pause | death | win
var score = 0;
var lives = 3;
var high = 0;
try { high = parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0; } catch (e) { high = 0; }

// paddle
var paddle = { w: 90, h: 14, x: W / 2, y: H - 40, speed: 520 };
var basePaddleW = 90;

// balls
var balls = [];
// bricks
var bricks = [];
// falling powerups
var drops = [];

// input
var keys = { left: false, right: false };
var pointerTarget = null; // x in canvas coords, or null

// powerup timers (seconds)
var wideTimer = 0;
var slowTimer = 0;

var lastT = 0;

// ---------- Build level ----------
var ROW_COLORS = ['#ff2bd6', '#00f0ff', '#ffe600', '#7cff00', '#ff7a00', '#ff2bd6'];
function buildLevel() {
  bricks = [];
  var cols = 8, rows = 6;
  var side = 24, top = 80, gap = 8;
  var bw = (W - 2 * side - (cols - 1) * gap) / cols;
  var bh = 22;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      bricks.push({
        x: side + c * (bw + gap),
        y: top + r * (bh + gap),
        w: bw, h: bh,
        color: ROW_COLORS[r % ROW_COLORS.length],
        alive: true,
        points: (rows - r) * 10
      });
    }
  }
}

function newBall(x, y, vx, vy) {
  if (vx === undefined) {
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    var sp = 300;
    vx = Math.cos(ang) * sp;
    vy = Math.sin(ang) * sp;
  }
  return { x: x, y: y, vx: vx, vy: vy, r: 8 };
}

function resetBallOnPaddle() {
  balls = [newBall(paddle.x, paddle.y - 12)];
}

function startGame() {
  score = 0;
  lives = 3;
  wideTimer = 0;
  slowTimer = 0;
  paddle.w = basePaddleW;
  drops = [];
  buildLevel();
  paddle.x = W / 2;
  resetBallOnPaddle();
  state = 'play';
  show(null);
  lastT = performance.now();
}

function loseLife() {
  lives--;
  if (lives <= 0) {
    endGame(false);
    return;
  }
  // reset modifiers on life loss
  paddle.w = basePaddleW;
  wideTimer = 0;
  slowTimer = 0;
  resetBallOnPaddle();
}

function endGame(won) {
  state = won ? 'win' : 'death';
  if (score > high) {
    high = score;
    try { localStorage.setItem(HI_KEY, String(high)); } catch (e) {}
  }
  document.getElementById('hiStart').textContent = high;
  if (won) {
    document.getElementById('scoreWin').textContent = score;
    document.getElementById('hiWin').textContent = high;
    show('win');
  } else {
    document.getElementById('scoreDeath').textContent = score;
    document.getElementById('hiDeath').textContent = high;
    show('death');
  }
}

// ---------- Powerups ----------
var DROP_TYPES = ['wide', 'multi', 'slow'];
function maybeDrop(x, y) {
  if (Math.random() < 0.22) {
    var t = DROP_TYPES[(Math.random() * DROP_TYPES.length) | 0];
    drops.push({ x: x, y: y, vy: 150, type: t, r: 11 });
  }
}
function applyPower(type) {
  if (type === 'wide') {
    paddle.w = Math.min(basePaddleW * 1.7, paddle.w * 1.3 + 20);
    wideTimer = 10;
  } else if (type === 'slow') {
    slowTimer = 8;
    for (var i = 0; i < balls.length; i++) { balls[i].vx *= 0.6; balls[i].vy *= 0.6; }
  } else if (type === 'multi') {
    var extra = [];
    for (var j = 0; j < balls.length; j++) {
      var b = balls[j];
      var sp = Math.hypot(b.vx, b.vy) || 300;
      for (var k = 0; k < 2; k++) {
        var a = Math.atan2(b.vy, b.vx) + (k === 0 ? 0.4 : -0.4);
        extra.push(newBall(b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp));
      }
    }
    balls = balls.concat(extra);
  }
}
var DROP_COLORS = { wide: '#00f0ff', multi: '#ffe600', slow: '#7cff00' };
function dropLabel(t) { return t === 'wide' ? 'W' : t === 'multi' ? 'M' : 'S'; }

// ---------- Update ----------
function update(dt) {
  // paddle movement
  var moved = false;
  if (pointerTarget !== null) {
    paddle.x += (pointerTarget - paddle.x) * Math.min(1, dt * 18);
    moved = true;
  }
  if (keys.left) { paddle.x -= paddle.speed * dt; moved = true; }
  if (keys.right) { paddle.x += paddle.speed * dt; moved = true; }
  paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));

  // timers
  if (wideTimer > 0) { wideTimer -= dt; if (wideTimer <= 0) { paddle.w = basePaddleW; } }
  if (slowTimer > 0) {
    slowTimer -= dt;
    if (slowTimer <= 0) { for (var s = 0; s < balls.length; s++) { balls[s].vx /= 0.6; balls[s].vy /= 0.6; } }
  }

  // balls
  for (var i = balls.length - 1; i >= 0; i--) {
    var b = balls[i];
    if (slowTimer > 0) { /* already slowed; but keep consistent speed each frame by clamping */ }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // walls
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

    // paddle
    if (b.vy > 0 && b.y + b.r >= paddle.y && b.y - b.r <= paddle.y + paddle.h &&
        b.x >= paddle.x - paddle.w / 2 && b.x <= paddle.x + paddle.w / 2) {
      b.y = paddle.y - b.r;
      var rel = (b.x - paddle.x) / (paddle.w / 2); // -1..1
      var ang = -Math.PI / 2 + rel * (Math.PI / 3);
      var sp = Math.min(560, Math.max(280, Math.hypot(b.vx, b.vy)));
      b.vx = Math.cos(ang) * sp;
      b.vy = Math.sin(ang) * sp;
    }

    // bricks
    for (var bi = 0; bi < bricks.length; bi++) {
      var br = bricks[bi];
      if (!br.alive) continue;
      if (b.x + b.r > br.x && b.x - b.r < br.x + br.w &&
          b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
        // determine bounce side
        var overlapL = (b.x + b.r) - br.x;
        var overlapR = (br.x + br.w) - (b.x - b.r);
        var overlapT = (b.y + b.r) - br.y;
        var overlapB = (br.y + br.h) - (b.y - b.r);
        var minX = Math.min(overlapL, overlapR);
        var minY = Math.min(overlapT, overlapB);
        if (minX < minY) b.vx = -b.vx; else b.vy = -b.vy;
        br.alive = false;
        score += br.points;
        maybeDrop(br.x + br.w / 2, br.y + br.h / 2);
        break;
      }
    }

    // fell off bottom
    if (b.y - b.r > H) {
      balls.splice(i, 1);
    }
  }

  if (balls.length === 0 && state === 'play') {
    loseLife();
  }

  // drops
  for (var d = drops.length - 1; d >= 0; d--) {
    var dr = drops[d];
    dr.y += dr.vy * dt;
    if (dr.y + dr.r >= paddle.y && dr.y - dr.r <= paddle.y + paddle.h &&
        dr.x >= paddle.x - paddle.w / 2 && dr.x <= paddle.x + paddle.w / 2) {
      applyPower(dr.type);
      drops.splice(d, 1);
    } else if (dr.y - dr.r > H) {
      drops.splice(d, 1);
    }
  }

  // win check
  var anyAlive = false;
  for (var w = 0; w < bricks.length; w++) { if (bricks[w].alive) { anyAlive = true; break; } }
  if (!anyAlive && state === 'play') endGame(true);
}

// ---------- Draw ----------
function draw() {
  ctx.clearRect(0, 0, W, H);

  // subtle grid
  ctx.strokeStyle = 'rgba(0,240,255,0.05)';
  ctx.lineWidth = 1;
  for (var gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (var gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // bricks
  for (var i = 0; i < bricks.length; i++) {
    var br = bricks[i];
    if (!br.alive) continue;
    ctx.save();
    ctx.shadowColor = br.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = br.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(br.x, br.y, br.w, br.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = br.color;
    ctx.strokeRect(br.x + 2, br.y + 2, br.w - 4, br.h - 4);
    ctx.restore();
  }

  // drops
  for (var d = 0; d < drops.length; d++) {
    var dr = drops[d];
    ctx.save();
    ctx.shadowColor = DROP_COLORS[dr.type];
    ctx.shadowBlur = 14;
    ctx.fillStyle = DROP_COLORS[dr.type];
    ctx.beginPath();
    ctx.arc(dr.x, dr.y, dr.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#03040c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dropLabel(dr.type), dr.x, dr.y + 1);
    ctx.restore();
  }

  // paddle
  ctx.save();
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#00f0ff';
  roundRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 7);
  ctx.fill();
  ctx.restore();

  // balls
  for (var b = 0; b < balls.length; b++) {
    var ba = balls[b];
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ba.x, ba.y, ba.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // HUD
  ctx.save();
  ctx.fillStyle = '#d8fbff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE ' + score, 12, 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe600';
  ctx.fillText('BEST ' + high, W - 12, 26);
  ctx.fillStyle = '#ff2bd6';
  ctx.textAlign = 'center';
  ctx.fillText('LIVES ' + lives, W / 2, 26);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- Loop ----------
function frame(t) {
  var dt = Math.min(0.033, (t - lastT) / 1000 || 0);
  lastT = t;
  if (state === 'play') {
    update(dt);
    draw();
  } else if (state === 'pause') {
    draw();
  }
  requestAnimationFrame(frame);
}

// ---------- Input ----------
function clientXToCanvas(clientX) {
  var rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) / rect.width * W;
}

canvas.addEventListener('mousemove', function (e) {
  if (state !== 'play') return;
  pointerTarget = clientXToCanvas(e.clientX);
});

canvas.addEventListener('touchstart', function (e) {
  if (state !== 'play') return;
  e.preventDefault();
  pointerTarget = clientXToCanvas(e.touches[0].clientX);
}, { passive: false });
canvas.addEventListener('touchmove', function (e) {
  if (state !== 'play') return;
  e.preventDefault();
  pointerTarget = clientXToCanvas(e.touches[0].clientX);
}, { passive: false });
canvas.addEventListener('touchend', function (e) {
  e.preventDefault();
  pointerTarget = null;
}, { passive: false });

document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === 'p' || e.key === 'P') {
    if (state === 'play') { state = 'pause'; show('pause'); }
    else if (state === 'pause') { state = 'play'; show(null); lastT = performance.now(); }
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (state === 'start' || state === 'death' || state === 'win') startGame();
  }
});
document.addEventListener('keyup', function (e) {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

// On-screen buttons (hold to move)
function bindHold(id, dir) {
  var el = document.getElementById(id);
  var set = function (v) { return function (e) { e.preventDefault(); keys[dir] = v; }; };
  el.addEventListener('touchstart', set(true), { passive: false });
  el.addEventListener('touchend', set(false), { passive: false });
  el.addEventListener('touchcancel', set(false), { passive: false });
  el.addEventListener('mousedown', set(true));
  el.addEventListener('mouseup', set(false));
  el.addEventListener('mouseleave', set(false));
}
bindHold('left', 'left');
bindHold('right', 'right');

// Buttons
document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('winBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', function () {
  if (state === 'pause') { state = 'play'; show(null); lastT = performance.now(); }
});

// prevent page scroll on touch anywhere in game wrapper
document.getElementById('touch').addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

// ---------- Init ----------
document.getElementById('hiStart').textContent = high;
buildLevel();
resetBallOnPaddle();
draw();
show('start');
requestAnimationFrame(frame);
