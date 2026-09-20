(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const GRID = 20;                       // cells per side
  const CELL = canvas.width / GRID;      // 20px
  const TARGET = 50;                     // apples to win
  const HS_KEY = "neonsnake_highscore";

  const el = {
    score: document.getElementById("score"),
    best: document.getElementById("best"),
    target: document.getElementById("target"),
    startScreen: document.getElementById("startScreen"),
    deathScreen: document.getElementById("deathScreen"),
    winScreen: document.getElementById("winScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    startBest: document.getElementById("startBest"),
    deathScore: document.getElementById("deathScore"),
    deathBest: document.getElementById("deathBest"),
    winScore: document.getElementById("winScore"),
    winBest: document.getElementById("winBest"),
    startBtn: document.getElementById("startBtn"),
    restartBtn: document.getElementById("restartBtn"),
    winBtn: document.getElementById("winBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    homeBtns: [
      document.getElementById("homeBtn1"),
      document.getElementById("homeBtn2"),
      document.getElementById("homeBtn3")
    ]
  };

  el.target.textContent = TARGET;

  let snake, dir, nextDir, food, score, best, running, paused, alive, lastStep, acc, stepMs;

  best = parseInt(localStorage.getItem(HS_KEY) || "0", 10) || 0;
  el.best.textContent = best;

  function reset() {
    const c = Math.floor(GRID / 2);
    snake = [
      { x: c, y: c },
      { x: c - 1, y: c },
      { x: c - 2, y: c }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    stepMs = 110;
    acc = 0;
    lastStep = 0;
    alive = true;
    paused = false;
    running = true;
    placeFood();
    el.score.textContent = score;
    el.best.textContent = best;
  }

  function placeFood() {
    let p;
    do {
      p = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
    } while (snake.some(s => s.x === p.x && s.y === p.y));
    food = p;
  }

  function showOnly(screen) {
    [el.startScreen, el.deathScreen, el.winScreen, el.pauseScreen].forEach(s =>
      s.classList.toggle("hidden", s !== screen)
    );
  }

  function startGame() {
    reset();
    showOnly(null);
  }

  function toMenu() {
    running = false;
    alive = false;
    el.startBest.textContent = best;
    el.best.textContent = best;
    showOnly(el.startScreen);
  }

  function die() {
    alive = false;
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem(HS_KEY, String(best));
    }
    el.deathScore.textContent = score;
    el.deathBest.textContent = best;
    el.best.textContent = best;
    showOnly(el.deathScreen);
  }

  function win() {
    alive = false;
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem(HS_KEY, String(best));
    }
    el.winScore.textContent = score;
    el.winBest.textContent = best;
    el.best.textContent = best;
    showOnly(el.winScreen);
  }

  function setDir(nx, ny) {
    // ignore reversal
    if (nx === -dir.x && ny === -dir.y) return;
    nextDir = { x: nx, y: ny };
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) return die();
    if (snake.some(s => s.x === head.x && s.y === head.y)) return die();

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      el.score.textContent = score;
      if (score >= TARGET) {
        snake.shift(); // keep length bounded visually
        return win();
      }
      placeFood();
      stepMs = Math.max(55, stepMs - 1.2);
    } else {
      snake.pop();
    }
  }

  // ---- Rendering ----
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "rgba(0,255,200,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    // food (glowing apple)
    glowCircle(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.36, "#ff2bd6", "#ff8df0");

    // snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const t = i / Math.max(1, snake.length - 1);
      const col = i === 0 ? "#00ffc8" : mix("#00ffc8", "#0066ff", t);
      glowRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, col);
    }
  }

  function glowRect(x, y, w, h, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.restore();
  }

  function glowCircle(cx, cy, r, color, inner) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, inner || color);
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
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

  function mix(a, b, t) {
    const pa = hex(a), pb = hex(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- Loop ----
  function loop(ts) {
    if (!running) { draw(); requestAnimationFrame(loop); return; }
    if (!paused) {
      if (!lastStep) lastStep = ts;
      acc += ts - lastStep;
      lastStep = ts;
      while (acc >= stepMs) {
        acc -= stepMs;
        if (alive) step();
      }
    } else {
      lastStep = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  // ---- Input ----
  const KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };

  window.addEventListener("keydown", (e) => {
    if (KEYS[e.key]) {
      e.preventDefault();
      if (running && alive) setDir(KEYS[e.key][0], KEYS[e.key][1]);
      return;
    }
    if (e.key === "p" || e.key === "P") {
      if (running && alive) { paused = !paused; showOnly(paused ? el.pauseScreen : null); }
    }
    if (e.key === "r" || e.key === "R") {
      if (running) startGame();
    }
    if (e.key === "Enter" || e.key === " ") {
      if (!running) startGame();
    }
  }, { passive: false });

  // Swipe
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { touchStart = null; return; }
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
    e.preventDefault();
  }, { passive: false });

  // D-pad
  document.getElementById("dpad").addEventListener("click", (e) => {
    const b = e.target.closest("[data-dir]");
    if (!b) return;
    const d = b.dataset.dir;
    if (d === "up") setDir(0, -1);
    else if (d === "down") setDir(0, 1);
    else if (d === "left") setDir(-1, 0);
    else if (d === "right") setDir(1, 0);
  });

  // Buttons
  el.startBtn.addEventListener("click", startGame);
  el.restartBtn.addEventListener("click", startGame);
  el.winBtn.addEventListener("click", startGame);
  el.resumeBtn.addEventListener("click", () => { paused = false; showOnly(null); });
  el.homeBtns.forEach(b => b && b.addEventListener("click", toMenu));

  // prevent scroll/zoom gestures globally on the page
  document.addEventListener("touchmove", (e) => {
    if (e.target.closest("#dpad") || e.target.closest("#game")) e.preventDefault();
  }, { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  window.addEventListener("contextmenu", (e) => e.preventDefault());

  // init
  reset();
  running = false;
  alive = false;
  el.startBest.textContent = best;
  showOnly(el.startScreen);
  requestAnimationFrame(loop);
})();
