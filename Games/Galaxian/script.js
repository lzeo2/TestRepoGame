(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const W = 480, H = 480;
  const BG = "#0a0f1a", FG = "#e6edf7", ACC = "#5cc8ff", WARN = "#ffd166";

  const WIN_WAVE = 3;
  const COLS = 10, ROWS = 4;
  const CELL_W = 36, CELL_H = 26;
  const PLAYER_Y = 440;
  const PLAYER_SPEED = 200;
  const PTS_FORM = 40, PTS_DIVE = 160;
  const BEST_KEY = "galaxianBest";

  const el = (id) => document.getElementById(id);
  const screens = {
    start: el("startScreen"), over: el("overScreen"),
    win: el("winScreen"), pause: el("pauseScreen"),
  };
  const hud = { score: el("score"), lives: el("lives"), wave: el("wave"), best: el("best") };

  let raf = 0, state = "start", last = 0;
  const keys = { left: false, right: false, fire: false };
  let score, lives, wave, best, elapsed;
  let player, shot, aliens, eShots, parts, fireCd, invuln, diveCd;

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
    hud.score.textContent = score;
    hud.lives.textContent = lives;
    hud.wave.textContent = wave;
    hud.best.textContent = best;
    el("startBest").textContent = best;
    el("overBest").textContent = best;
    el("winBest").textContent = best;
  }

  const sway = () => Math.sin(elapsed * 0.7) * 26;

  function buildFormation() {
    aliens = [];
    const x0 = (W - COLS * CELL_W) / 2 + CELL_W / 2;
    const y0 = 54;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 && (c === 0 || c === COLS - 1)) continue;
        const sx = x0 + c * CELL_W;
        const sy = y0 + r * CELL_H;
        aliens.push({ sx, sy, x: sx, y: sy, alive: true, state: "form", vy: 0, t: 0, shotCd: 2 + Math.random() * 2 });
      }
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 100;
      const life = 0.3 + Math.random() * 0.4;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  function launchDiver() {
    const form = aliens.filter((a) => a.alive && a.state === "form");
    if (!form.length) return;
    const a = form[Math.floor(Math.random() * form.length)];
    a.state = "dive";
    a.t = 0;
    a.vy = 70;
    a.x = a.sx + sway();
    a.y = a.sy;
  }

  function killPlayer() {
    burst(player.x, PLAYER_Y, WARN, 22);
    lives--;
    updateHud();
    eShots = [];
    if (lives <= 0) { gameOver(); return; }
    player.x = W / 2;
    invuln = 2;
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

  function hitAlien(a) {
    a.alive = false;
    score += a.state === "form" ? PTS_FORM : PTS_DIVE;
    burst(a.x, a.y, a.state === "form" ? ACC : WARN, a.state === "form" ? 8 : 14);
    updateHud();
  }

  function update(dt) {
    elapsed += dt;
    fireCd -= dt;
    if (invuln > 0) invuln -= dt;

    if (keys.left) player.x -= PLAYER_SPEED * dt;
    if (keys.right) player.x += PLAYER_SPEED * dt;
    player.x = Math.max(16, Math.min(W - 16, player.x));
    if (keys.fire && !shot && fireCd <= 0) {
      shot = { x: player.x, y: PLAYER_Y - 14, vy: -430 };
      fireCd = 0.16;
    }

    if (shot) {
      shot.y += shot.vy * dt;
      if (shot.y < -8) shot = null;
    }

    // Formation sway and diver behaviour
    const sw = sway();
    const maxDivers = wave;
    const divers = aliens.filter((a) => a.alive && a.state !== "form");
    diveCd -= dt;
    if (diveCd <= 0 && divers.length < maxDivers && aliens.some((a) => a.alive && a.state === "form")) {
      launchDiver();
      diveCd = Math.max(0.9, 2.4 - wave * 0.4) * (0.6 + Math.random() * 0.8);
    }

    for (const a of aliens) {
      if (!a.alive) continue;
      if (a.state === "form") {
        a.x = a.sx + sw;
        a.y = a.sy;
      } else if (a.state === "dive") {
        a.t += dt;
        a.vy = Math.min(a.vy + 110 * dt, 270);
        a.y += a.vy * dt;
        // Steer toward the cannon, plus a small weaving wobble.
        a.x += Math.max(-1, Math.min(1, player.x - a.x)) * 85 * dt;
        a.x += Math.sin(a.t * 5) * 34 * dt;
        a.x = Math.max(14, Math.min(W - 14, a.x));
        // Divers fire a single aimed shot on the way down.
        a.shotCd -= dt;
        if (a.shotCd <= 0 && a.y < PLAYER_Y - 90 && eShots.length < 3 + wave) {
          a.shotCd = 99; // one shot per dive
          const ang = Math.atan2(PLAYER_Y - a.y, player.x - a.x);
          eShots.push({ x: a.x, y: a.y + 10, vx: Math.cos(ang) * 170, vy: Math.max(140, Math.sin(ang) * 170) });
        }
        if (a.y >= H - 110) { a.state = "up"; a.vy = -175; }
      } else { // climbing back to its slot
        a.t += dt;
        a.vy = Math.max(a.vy - 80 * dt, -270);
        a.y += a.vy * dt;
        a.x += ((a.sx + sw) - a.x) * 2.4 * dt;
        if (a.y <= a.sy) { a.state = "form"; a.x = a.sx + sw; a.y = a.sy; }
      }
    }

    for (const s of eShots) { s.x += s.vx * dt; s.y += s.vy * dt; }
    eShots = eShots.filter((s) => {
      if (s.y > H + 8 || s.x < -8 || s.x > W + 8) return false;
      if (invuln <= 0 && Math.abs(s.x - player.x) < 15 && Math.abs(s.y - PLAYER_Y) < 10) {
        killPlayer();
        return false;
      }
      return true;
    });

    // Player shot vs enemy shot (they cancel) vs aliens
    if (shot) {
      for (let i = 0; i < eShots.length; i++) {
        const s = eShots[i];
        if (Math.hypot(s.x - shot.x, s.y - shot.y) < 9) {
          eShots.splice(i, 1);
          burst(s.x, s.y, WARN, 4);
          shot = null;
          break;
        }
      }
    }
    if (shot) {
      for (const a of aliens) {
        if (!a.alive) continue;
        if (Math.abs(shot.x - a.x) < 15 && Math.abs(shot.y - a.y) < 13) {
          hitAlien(a);
          shot = null;
          break;
        }
      }
    }

    // Diver collides with the cannon
    if (invuln <= 0) {
      for (const a of aliens) {
        if (!a.alive || a.state === "form") continue;
        if (Math.hypot(a.x - player.x, a.y - PLAYER_Y) < 20) {
          hitAlien(a);
          killPlayer();
          break;
        }
      }
    }

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);

    if (!aliens.some((a) => a.alive)) {
      if (wave >= WIN_WAVE) { winGame(); return; }
      wave++;
      buildFormation();
      eShots = [];
      diveCd = 1.2;
      updateHud();
    }
  }

  function drawAlien(a) {
    const diving = a.state !== "form";
    let color = diving ? WARN : ACC;
    if (diving && a.state === "dive" && Math.floor(a.t * 10) % 2 === 0) color = FG;
    ctx.fillStyle = color;
    // wings
    ctx.fillRect(a.x - 13, a.y - 1, 26, 6);
    // body
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 10);
    ctx.lineTo(a.x + 7, a.y - 2);
    ctx.lineTo(a.x, a.y + 8);
    ctx.lineTo(a.x - 7, a.y - 2);
    ctx.closePath();
    ctx.fill();
    // tail fins
    ctx.fillRect(a.x - 12, a.y + 4, 4, 5);
    ctx.fillRect(a.x + 8, a.y + 4, 4, 5);
    // eye
    ctx.fillStyle = BG;
    ctx.fillRect(a.x - 2, a.y - 4, 4, 4);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    for (const a of aliens) if (a.alive) drawAlien(a);

    ctx.fillStyle = WARN;
    for (const s of eShots) ctx.fillRect(s.x - 2, s.y - 4, 4, 9);

    if (shot) {
      ctx.fillStyle = FG;
      ctx.fillRect(shot.x - 2, shot.y - 7, 4, 12);
    }

    // cannon (blinks while invulnerable)
    const blink = invuln > 0 && Math.floor(invuln * 8) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = FG;
      ctx.beginPath();
      ctx.moveTo(player.x, PLAYER_Y - 14);
      ctx.lineTo(player.x + 10, PLAYER_Y + 8);
      ctx.lineTo(player.x + 4, PLAYER_Y + 8);
      ctx.lineTo(player.x, PLAYER_Y + 2);
      ctx.lineTo(player.x - 4, PLAYER_Y + 8);
      ctx.lineTo(player.x - 10, PLAYER_Y + 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = FG;
    ctx.fillRect(0, H - 22, W, 2);

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
    score = 0; lives = 3; wave = 1; elapsed = 0;
    player = { x: W / 2 };
    shot = null; eShots = []; parts = [];
    fireCd = 0; invuln = 1.2; diveCd = 1.5;
    buildFormation();
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

  const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire" };

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
