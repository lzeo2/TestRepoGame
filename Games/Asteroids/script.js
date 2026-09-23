(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const W = 480, H = 480;
  const BG = "#0b0f17", FG = "#e6edf7", ACC = "#67e8c3", WARN = "#ffd166";

  const WIN_WAVE = 3;
  const SIZE_R = [46, 26, 14];      // big, medium, small
  const SIZE_PTS = [20, 50, 100];
  const THRUST = 175, MAX_SPEED = 320, ROT_SPEED = 3.4;
  const BEST_KEY = "asteroidsBest";

  const el = (id) => document.getElementById(id);
  const screens = {
    start: el("startScreen"), over: el("overScreen"),
    win: el("winScreen"), pause: el("pauseScreen"),
  };
  const hud = { score: el("score"), lives: el("lives"), wave: el("wave"), best: el("best") };

  let raf = 0, state = "start", last = 0;
  const keys = { left: false, right: false, thrust: false, fire: false };
  let score, lives, wave, ship, asteroids, bullets, parts, fireCd, invuln, respawnT, spin;

  function loadBest() {
    // localStorage can be unavailable (private mode) or hold junk; fall back to 0.
    try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* storage unavailable, keep session best */ }
  }
  let best = loadBest();

  function show(name) {
    for (const k in screens) screens[k].classList.toggle("hidden", k !== name);
  }
  function updateHud() {
    hud.score.textContent = score;
    hud.lives.textContent = lives;
    hud.wave.textContent = wave;
    hud.best.textContent = best;
    el("startBest").textContent = best;
    el("overBest").textContent = best;
    el("winBest").textContent = best;
  }

  function wrap(o, r) {
    if (o.x < -r) o.x += W + r * 2; else if (o.x > W + r) o.x -= W + r * 2;
    if (o.y < -r) o.y += H + r * 2; else if (o.y > H + r) o.y -= H + r * 2;
  }

  function makeAsteroid(x, y, size) {
    const n = 9;
    const verts = [];
    for (let i = 0; i < n; i++) verts.push(0.68 + Math.random() * 0.5);
    const speed = (35 + Math.random() * 30) * (1 + (2 - size) * 0.55);
    const a = Math.random() * Math.PI * 2;
    return {
      x, y, size, r: SIZE_R[size], verts,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      spin: (Math.random() - 0.5) * 2.2, rot: Math.random() * Math.PI * 2,
    };
  }

  function spawnWave() {
    for (let i = 0; i < 3 + wave; i++) {
      // Spawn off one edge heading inward so the ship start point stays clear.
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      if (edge === 0) { x = Math.random() * W; y = -SIZE_R[0]; }
      else if (edge === 1) { x = Math.random() * W; y = H + SIZE_R[0]; }
      else if (edge === 2) { x = -SIZE_R[0]; y = Math.random() * H; }
      else { x = W + SIZE_R[0]; y = Math.random() * H; }
      asteroids.push(makeAsteroid(x, y, 0));
    }
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = 0.4 + Math.random() * 0.5;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  function killShip() {
    burst(ship.x, ship.y, WARN, 22, 160);
    lives--;
    updateHud();
    if (lives <= 0) { gameOver(); return; }
    ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0; ship.ang = -Math.PI / 2;
    invuln = 2.5; respawnT = 1.0;
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
    // Ship control
    if (keys.left) ship.ang -= ROT_SPEED * dt;
    if (keys.right) ship.ang += ROT_SPEED * dt;
    const thrusting = keys.thrust && respawnT <= 0;
    if (thrusting) {
      ship.vx += Math.cos(ship.ang) * THRUST * dt;
      ship.vy += Math.sin(ship.ang) * THRUST * dt;
    }
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > MAX_SPEED) { ship.vx *= MAX_SPEED / sp; ship.vy *= MAX_SPEED / sp; }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship, 12);
    ship.thrusting = thrusting;

    fireCd -= dt;
    if (keys.fire && fireCd <= 0 && bullets.length < 5) {
      bullets.push({
        x: ship.x + Math.cos(ship.ang) * 13,
        y: ship.y + Math.sin(ship.ang) * 13,
        vx: Math.cos(ship.ang) * 400 + ship.vx,
        vy: Math.sin(ship.ang) * 400 + ship.vy,
        life: 1.1,
      });
      fireCd = 0.26;
    }

    if (invuln > 0) invuln -= dt;
    if (respawnT > 0) respawnT -= dt;

    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b, 3); }
    bullets = bullets.filter((b) => b.life > 0);

    for (const a of asteroids) { a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.spin * dt; wrap(a, a.r); }

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);

    // Bullet hits rock
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          bullets.splice(bi, 1);
          destroyAsteroid(ai);
          break;
        }
      }
    }

    // Ship hits rock
    if (respawnT <= 0 && invuln <= 0) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + 9) {
          destroyAsteroid(ai);
          killShip();
          break;
        }
      }
    }

    if (asteroids.length === 0) {
      if (wave >= WIN_WAVE) { winGame(); return; }
      wave++;
      spawnWave();
      updateHud();
    }
  }

  function destroyAsteroid(idx) {
    const a = asteroids[idx];
    asteroids.splice(idx, 1);
    score += SIZE_PTS[a.size];
    burst(a.x, a.y, FG, 6 + a.size * 4, 90);
    if (a.size < 2) {
      // Each rock splits into two faster children on a wider arc.
      for (let i = 0; i < 2; i++) {
        const child = makeAsteroid(a.x, a.y, a.size + 1);
        const ang = Math.atan2(a.vy, a.vx) + (i ? 0.7 : -0.7);
        const sp = Math.hypot(a.vx, a.vy) * 1.35 + 20;
        child.vx = Math.cos(ang) * sp;
        child.vy = Math.sin(ang) * sp;
        asteroids.push(child);
      }
    }
    updateHud();
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = FG;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      for (let i = 0; i < a.verts.length; i++) {
        const ang = (i / a.verts.length) * Math.PI * 2;
        const rr = a.r * a.verts[i];
        const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = ACC;
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);

    // Ship blinks while invulnerable after a respawn.
    const blink = invuln > 0 && Math.floor(invuln * 8) % 2 === 0;
    if (respawnT <= 0 && !blink) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.ang + Math.PI / 2); // art points up, angle 0 points right
      ctx.strokeStyle = FG;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(9, 11);
      ctx.lineTo(0, 6);
      ctx.lineTo(-9, 11);
      ctx.closePath();
      ctx.stroke();
      if (ship.thrusting) {
        ctx.strokeStyle = WARN;
        ctx.beginPath();
        ctx.moveTo(-4, 10);
        ctx.lineTo(0, 17 + Math.random() * 4);
        ctx.lineTo(4, 10);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
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
    score = 0; lives = 3; wave = 1;
    ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2, thrusting: false };
    asteroids = []; bullets = []; parts = [];
    fireCd = 0; invuln = 1.5; respawnT = 0.5;
    spawnWave();
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

  const KEYMAP = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "thrust", KeyW: "thrust",
    Space: "fire",
  };

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

  for (const btn of document.querySelectorAll(".pbtn")) {
    const act = btn.dataset.act;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); keys[act] = true; });
    const off = (e) => { e.preventDefault(); keys[act] = false; };
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("lostpointercapture", () => { keys[act] = false; });
  }

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
