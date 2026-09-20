(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const startScreen = document.getElementById('startScreen');
  const overScreen = document.getElementById('overScreen');
  const scoreEl = document.getElementById('score');
  const bestStartEl = document.getElementById('bestStart');
  const finalScoreEl = document.getElementById('finalScore');
  const bestOverEl = document.getElementById('bestOver');

  const BEST_KEY = 'neonFlappyBest';
  const C = {
    bg: '#05060a',
    cyan: '#19f0ff',
    magenta: '#ff3df0',
    yellow: '#f9f871',
    white: '#eafcff'
  };

  let W = 0, H = 0, dpr = 1;
  let state = 'start'; // 'start' | 'play' | 'over'
  let lastT = 0;
  let bob = 0;

  const bird = { x: 0, y: 0, vy: 0, r: 12, angle: 0 };
  const GRAVITY = 1500; // px/s^2
  const FLAP = -430;    // px/s impulse

  let pipes = [];
  let trail = [];
  let score = 0;
  let best = 0;
  let spawnTravel = 0;
  let speed = 0;
  let gap = 0;

  function loadBest() {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY), 10);
      best = Number.isFinite(v) ? v : 0;
    } catch (e) { best = 0; }
  }

  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* private mode */ }
  }

  function pipeW() { return Math.max(46, W * 0.085); }

  function difficulty() {
    gap = Math.max(96, 190 - score * 3.2);
    speed = Math.min(460, 200 + score * 9);
  }

  function makePipe(x) {
    const margin = 60;
    const minC = margin + gap / 2;
    const maxC = H - margin - gap / 2;
    const cy = minC + Math.random() * (maxC - minC);
    return { x, cy, scored: false };
  }

  function reset() {
    difficulty();
    bird.x = W * 0.28;
    bird.y = H * 0.45;
    bird.vy = 0;
    bird.angle = 0;
    pipes = [makePipe(W + 40)];
    trail = [];
    score = 0;
    spawnTravel = 0;
    scoreEl.textContent = '0';
  }

  function start() {
    reset();
    state = 'play';
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  function gameOver() {
    state = 'over';
    if (score > best) { best = score; saveBest(); }
    finalScoreEl.textContent = String(score);
    bestOverEl.textContent = String(best);
    bestStartEl.textContent = String(best);
    hud.classList.add('hidden');
    overScreen.classList.remove('hidden');
  }

  function flap() {
    if (state === 'start') { start(); return; }
    if (state !== 'play') return;
    bird.vy = FLAP;
  }

  function resize() {
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state !== 'play') {
      bird.x = W * 0.28;
      bird.y = H * 0.45;
    }
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function collides() {
    const pw = pipeW();
    for (const p of pipes) {
      const topH = p.cy - gap / 2;
      const botY = p.cy + gap / 2;
      if (circleRect(bird.x, bird.y, bird.r, p.x, 0, pw, topH)) return true;
      if (circleRect(bird.x, bird.y, bird.r, p.x, botY, pw, H - botY)) return true;
    }
    return false;
  }

  function update(dt) {
    if (state !== 'play') {
      bob += dt;
      bird.y = H * 0.45 + Math.sin(bob * 2) * 10;
      bird.angle = Math.sin(bob * 2) * 0.15;
      return;
    }

    difficulty();
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.angle = Math.max(-0.5, Math.min(1.1, bird.vy / 600));

    trail.push({ x: bird.x, y: bird.y });
    if (trail.length > 18) trail.shift();

    const dx = speed * dt;
    for (const p of pipes) p.x -= dx;

    spawnTravel += dx;
    const spawnDist = Math.max(220, Math.min(420, W * 0.62));
    if (spawnTravel >= spawnDist) {
      spawnTravel = 0;
      pipes.push(makePipe(W + 40));
    }

    while (pipes.length && pipes[0].x + pipeW() < -10) pipes.shift();

    for (const p of pipes) {
      if (!p.scored && p.x + pipeW() < bird.x) {
        p.scored = true;
        score++;
        scoreEl.textContent = String(score);
      }
    }

    if (collides() || bird.y + bird.r > H || bird.y - bird.r < 0) gameOver();
  }

  function drawPipe(p) {
    const pw = pipeW();
    const topH = p.cy - gap / 2;
    const botY = p.cy + gap / 2;
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.cyan;
    ctx.shadowBlur = 18;
    ctx.shadowColor = C.cyan;
    ctx.strokeRect(p.x, 0, pw, topH);
    ctx.strokeRect(p.x, botY, pw, H - botY);
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = i / trail.length;
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = C.magenta;
      ctx.shadowBlur = 12;
      ctx.shadowColor = C.magenta;
      ctx.lineWidth = bird.r * 1.4 * a;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.angle);
    ctx.shadowBlur = 20;
    ctx.shadowColor = C.yellow;
    ctx.strokeStyle = C.yellow;
    ctx.fillStyle = 'rgba(249, 248, 113, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(bird.r * 0.35, -bird.r * 0.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pipes) drawPipe(p);
    drawTrail();
    drawBird();
  }

  function frame(t) {
    if (!lastT) lastT = t;
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Input
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (state === 'over') start();
      else flap();
    } else if (e.code === 'Enter') {
      if (state === 'start') start();
      else if (state === 'over') start();
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'over') start();
    else flap();
  });

  startScreen.addEventListener('click', () => start());
  overScreen.addEventListener('click', () => start());

  window.addEventListener('resize', resize);

  // Boot
  loadBest();
  bestStartEl.textContent = String(best);
  resize();
  requestAnimationFrame(frame);
})();
