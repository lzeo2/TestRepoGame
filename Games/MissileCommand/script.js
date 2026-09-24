(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const W = 480, H = 480;
  const BG = "#100b12", FG = "#f0e6ef", ACC = "#7fd7ff", WARN = "#ff6b6b";

  const WIN_WAVE = 5;
  const CITY_X = [70, 130, 190, 290, 350, 410];
  const BASE_X = [24, 240, 456];
  const GROUND_Y = 452;
  const AMMO_PER_WAVE = 30;
  const SHOT_SPEED = 480;
  const BEST_KEY = "missileCommandBest";

  const el = (id) => document.getElementById(id);
  const screens = {
    start: el("startScreen"), over: el("overScreen"),
    win: el("winScreen"), pause: el("pauseScreen"),
  };
  const hud = { score: el("score"), cities: el("cities"), ammo: el("ammo"), wave: el("wave"), best: el("best") };

  let raf = 0, state = "start", last = 0;
  const keys = { left: false, right: false, up: false, down: false, fire: false };
  let score, wave, best;
  let cities, shots, enemy, explosions, cross, ammo;
  let toSpawn, spawnCd, fireCd, parts;

  function loadBest() {
    // localStorage can be unavailable or hold junk; fall back to 0.
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* storage unavailable, keep session best */ }
  }
  best = loadBest();

  function show(name) {
    for (const k in screens) screens[k].classList.toggle("hidden", k !== name);
  }
  function updateHud() {
    // start() initializes the run state; skip until then (boot call at file end).
    if (!cities) return;
    hud.score.textContent = score;
    hud.cities.textContent = cities.filter((c) => c.alive).length;
    hud.ammo.textContent = ammo;
    hud.wave.textContent = wave;
    hud.best.textContent = best;
    el("startBest").textContent = best;
    el("overBest").textContent = best;
    el("winBest").textContent = best;
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = 0.4 + Math.random() * 0.5;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  function explode(x, y, max) {
    explosions.push({ x, y, r: 0, max, growing: true });
  }

  function spawnEnemy() {
    const alive = cities.filter((c) => c.alive);
    if (!alive.length) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const sx = Math.random() * W;
    enemy.push({
      sx, sy: -6, x: sx, y: -6,
      tx: target.x + (Math.random() - 0.5) * 30,
      ty: GROUND_Y - 14,
      speed: 42 + wave * 12 + Math.random() * 14,
      city: target,
    });
  }

  function fireShot() {
    if (ammo <= 0 || shots.length > 14) return;
    // Launch from the battery nearest the crosshair, like the classic bases.
    let base = BASE_X[0];
    for (const b of BASE_X) if (Math.abs(b - cross.x) < Math.abs(base - cross.x)) base = b;
    const dx = cross.x - base, dy = cross.y - (GROUND_Y - 20);
    const d = Math.hypot(dx, dy) || 1;
    shots.push({ x: base, y: GROUND_Y - 20, vx: (dx / d) * SHOT_SPEED, vy: (dy / d) * SHOT_SPEED, tx: cross.x, ty: cross.y });
    ammo--;
    updateHud();
  }

  function citiesLeft() {
    let n = 0;
    for (const c of cities) if (c.alive) n++;
    return n;
  }

  function gameOver() {
    state = "over";
    if (score > best) { best = score; saveBest(); }
    el("overScore").textContent = score;
    updateHud();
    show("over");
    stop();
  }

  function winGame() {
    state = "win";
    if (score > best) { best = score; saveBest(); }
    el("winScore").textContent = score;
    updateHud();
    show("win");
    stop();
  }

  function update(dt) {
    // Crosshair via keyboard
    const cs = 260;
    if (keys.left) cross.x -= cs * dt;
    if (keys.right) cross.x += cs * dt;
    if (keys.up) cross.y -= cs * dt;
    if (keys.down) cross.y += cs * dt;
    cross.x = Math.max(8, Math.min(W - 8, cross.x));
    cross.y = Math.max(8, Math.min(H - 8, cross.y));

    fireCd -= dt;
    if (keys.fire && fireCd <= 0) { fireShot(); fireCd = 0.16; }

    // Wave spawning
    if (toSpawn > 0) {
      spawnCd -= dt;
      const cap = 2 + wave;
      if (spawnCd <= 0 && enemy.length < cap) {
        spawnEnemy();
        toSpawn--;
        spawnCd = Math.max(0.25, 1.0 - wave * 0.1) * (0.5 + Math.random());
      }
    }

    // Enemy missiles fall toward their target
    for (const m of enemy) {
      const dx = m.tx - m.x, dy = m.ty - m.y;
      const d = Math.hypot(dx, dy);
      const step = m.speed * dt;
      if (d <= step) {
        m.x = m.tx; m.y = m.ty;
        m.landed = true;
      } else {
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
      }
    }
    // Resolve impacts
    for (let i = enemy.length - 1; i >= 0; i--) {
      const m = enemy[i];
      if (!m.landed) continue;
      enemy.splice(i, 1);
      if (m.city.alive) {
        m.city.alive = false;
        burst(m.city.x, GROUND_Y - 14, WARN, 26, 150);
        explode(m.city.x, GROUND_Y - 20, 46);
        updateHud();
        if (citiesLeft() === 0) { gameOver(); return; }
      }
    }

    // Player interceptors
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10 || Math.hypot(s.x - s.tx, s.y - s.ty) < 8) {
        explode(Math.max(10, Math.min(W - 10, s.x)), Math.max(10, Math.min(H - 10, s.y)), 42);
        shots.splice(i, 1);
      }
    }

    // Explosions grow, hold, then fade; anything caught inside chains.
    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i];
      if (ex.growing) {
        ex.r += (ex.max / 0.45) * dt;
        if (ex.r >= ex.max) { ex.r = ex.max; ex.growing = false; ex.hold = 0.12; }
      } else if (ex.hold > 0) {
        ex.hold -= dt;
      } else {
        ex.r -= (ex.max / 0.4) * dt;
        if (ex.r <= 0) { explosions.splice(i, 1); continue; }
      }
      for (let j = enemy.length - 1; j >= 0; j--) {
        const m = enemy[j];
        if (Math.hypot(m.x - ex.x, m.y - ex.y) < ex.r) {
          enemy.splice(j, 1);
          score += 25;
          burst(m.x, m.y, WARN, 6, 90);
          explode(m.x, m.y, Math.max(26, ex.max * 0.85)); // chain reaction
          updateHud();
        }
      }
    }

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);

    // Wave clear
    if (toSpawn === 0 && enemy.length === 0 && explosions.length === 0) {
      const bonus = citiesLeft() * 50 + ammo * 2;
      score += bonus;
      if (wave >= WIN_WAVE) { winGame(); return; }
      wave++;
      ammo = AMMO_PER_WAVE;
      spawnCd = 1.4;
      updateHud();
    }
  }

  function drawCity(c, i) {
    if (!c.alive) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = FG;
      ctx.fillRect(c.x - 22, GROUND_Y - 7, 44, 7);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = FG;
    // simple varied skyline, deterministic per city
    const h1 = 14 + (i % 3) * 5;
    const h2 = 22 + ((i + 1) % 3) * 6;
    ctx.fillRect(c.x - 22, GROUND_Y - h1, 16, h1);
    ctx.fillRect(c.x - 5, GROUND_Y - h2, 12, h2);
    ctx.fillRect(c.x + 9, GROUND_Y - 12, 13, 12);
    ctx.fillRect(c.x - 1, GROUND_Y - h2 - 7, 3, 7); // antenna
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ground
    ctx.fillStyle = FG;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, GROUND_Y, W, 3);
    ctx.globalAlpha = 1;

    for (let i = 0; i < cities.length; i++) drawCity(cities[i], i);

    // launch batteries
    ctx.fillStyle = ACC;
    for (const b of BASE_X) {
      ctx.beginPath();
      ctx.moveTo(b - 18, GROUND_Y);
      ctx.lineTo(b, GROUND_Y - 22);
      ctx.lineTo(b + 18, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }

    // enemy missiles: trail line plus head
    ctx.strokeStyle = WARN;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = WARN;
    for (const m of enemy) {
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(m.sx, m.sy);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // interceptors
    ctx.strokeStyle = ACC;
    ctx.fillStyle = ACC;
    for (const s of shots) {
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(s.tx, s.ty);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // explosions: flat two-tone circle
    for (const ex of explosions) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = ACC;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = WARN;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // crosshair
    ctx.strokeStyle = ACC;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cross.x - 12, cross.y);
    ctx.lineTo(cross.x - 4, cross.y);
    ctx.moveTo(cross.x + 4, cross.y);
    ctx.lineTo(cross.x + 12, cross.y);
    ctx.moveTo(cross.x, cross.y - 12);
    ctx.lineTo(cross.x, cross.y - 4);
    ctx.moveTo(cross.x, cross.y + 4);
    ctx.lineTo(cross.x, cross.y + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cross.x, cross.y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    update(dt);
    draw();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  function start() {
    stop();
    score = 0; wave = 1;
    cities = CITY_X.map((x) => ({ x, alive: true }));
    shots = []; enemy = []; explosions = []; parts = [];
    cross = { x: W / 2, y: H / 2 };
    ammo = AMMO_PER_WAVE;
    toSpawn = 10 + wave * 4;
    spawnCd = 1.0;
    fireCd = 0;
    updateHud();
    show(null);
    state = "play";
    raf = requestAnimationFrame(loop);
  }

  function menu() {
    stop();
    state = "start";
    updateHud();
    show("start");
  }

  function togglePause() {
    if (state === "play") { stop(); state = "pause"; show("pause"); }
    else if (state === "pause") { state = "play"; show(null); last = 0; raf = requestAnimationFrame(loop); }
  }

  function canvasPoint(e) {
    const rect = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  cv.addEventListener("pointermove", (e) => {
    if (state !== "play") return;
    const p = canvasPoint(e);
    cross.x = Math.max(8, Math.min(W - 8, p.x));
    cross.y = Math.max(8, Math.min(H - 8, p.y));
  });
  cv.addEventListener("pointerdown", (e) => {
    if (state !== "play") return;
    e.preventDefault();
    const p = canvasPoint(e);
    cross.x = Math.max(8, Math.min(W - 8, p.x));
    cross.y = Math.max(8, Math.min(H - 8, p.y));
    fireShot();
  });

  const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "fire" };

  window.addEventListener("keydown", (e) => {
    const act = KEYMAP[e.code];
    // Keep Space/Enter usable on focused buttons; only swallow page scroll keys.
    const onBtn = document.activeElement && document.activeElement.tagName === "BUTTON";
    if (act && !onBtn) e.preventDefault();
    if (act) {
      if (state === "start" && e.code === "Space" && !onBtn) { start(); return; }
      keys[act] = true;
      return;
    }
    if (e.code === "Enter" && !onBtn && (state === "over" || state === "win")) start();
    else if (e.code === "KeyP") togglePause();
    else if (e.code === "KeyR" && !onBtn && state !== "start") start();
  });
  window.addEventListener("keyup", (e) => {
    const act = KEYMAP[e.code];
    if (act) keys[act] = false;
  });
  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
    if (state === "play") togglePause();
  });

  document.getElementById("startBtn").addEventListener("click", start);
  document.getElementById("restartBtn").addEventListener("click", start);
  document.getElementById("againBtn").addEventListener("click", start);
  document.getElementById("resumeBtn").addEventListener("click", togglePause);
  document.getElementById("menuBtn1").addEventListener("click", menu);
  document.getElementById("menuBtn2").addEventListener("click", menu);
  document.getElementById("menuBtn3").addEventListener("click", menu);

  updateHud();
  show("start");
})();
