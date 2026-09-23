(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const W = 480, H = 480;
  const BG = "#0d0b14", FG = "#eae6f7", ACC = "#b5e853", WARN = "#ff7a5c";

  const WIN_WAVE = 3;
  const COLS = 10, ROWS = 5;
  const COL_W = 34, ROW_H = 26;
  const ALIEN_W = 22, ALIEN_H = 16;
  const ROW_PTS = [30, 20, 20, 10, 10];
  const GROUND_Y = 452;
  const PLAYER_Y = 428;
  const PLAYER_SPEED = 190;
  const BEST_KEY = "spaceInvadersBest";

  const el = (id) => document.getElementById(id);
  const screens = {
    start: el("startScreen"), over: el("overScreen"),
    win: el("winScreen"), pause: el("pauseScreen"),
  };
  const hud = { score: el("score"), lives: el("lives"), wave: el("wave"), best: el("best") };

  let raf = 0, state = "start", last = 0;
  const keys = { left: false, right: false, fire: false };
  let score, lives, wave, best;
  let player, pShot, aliens, grid, dir, marchT, legFrame, totalAliens;
  let bombs, bombCd, bunkers, fireCd, invuln, parts;

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

  function buildGrid() {
    grid = [];
    aliens = [];
    const x0 = (W - COLS * COL_W) / 2 + COL_W / 2;
    const y0 = 56 + (wave - 1) * 10;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Top row stays inset a little, like the classic wedge silhouette.
        if (r === 0 && (c === 0 || c === COLS - 1)) continue;
        const a = { col: c, row: r, x: x0 + c * COL_W, y: y0 + r * ROW_H, alive: true };
        aliens.push(a);
        grid.push(a);
      }
    }
    totalAliens = aliens.length;
    dir = 1;
    marchT = 0;
    legFrame = 0;
  }

  function buildBunkers() {
    bunkers = [];
    const cw = 5, cols = 12, rows = 8;
    for (const bx of [30, 150, 270, 390]) {
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) cells.push({ c, r, alive: true });
      }
      bunkers.push({ x: bx, y: 330, cw, cols, rows, cells });
    }
  }

  function erode(b, cx, cy, radius) {
    for (const cell of b.cells) {
      if (!cell.alive) continue;
      const px = b.x + cell.c * b.cw + b.cw / 2;
      const py = b.y + cell.r * b.cw + b.cw / 2;
      if (Math.hypot(px - cx, py - cy) < radius) cell.alive = false;
    }
  }

  function bunkerHit(x, y, radius) {
    for (const b of bunkers) {
      if (x >= b.x && x <= b.x + b.cols * b.cw && y >= b.y && y <= b.y + b.rows * b.cw) {
        erode(b, x, y, radius);
        return true;
      }
    }
    return false;
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 90;
      const life = 0.3 + Math.random() * 0.4;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  function gameOver(why) {
    state = "over";
    if (score > best) { best = score; saveBest(); }
    el("overReason").textContent = why;
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

  function killPlayer() {
    burst(player.x, PLAYER_Y, WARN, 20);
    lives--;
    updateHud();
    bombs = []; // brief respite after losing a life
    if (lives <= 0) { gameOver("You ran out of lives."); return; }
    player.x = W / 2;
    invuln = 2;
  }

  function fire() {
    if (pShot || fireCd > 0) return;
    pShot = { x: player.x, y: PLAYER_Y - 12, vy: -420 };
    fireCd = 0.15;
  }

  function alienSpeed() {
    const aliveFrac = grid.filter((a) => a && a.alive).length / totalAliens;
    return (15 + wave * 4) * (1 + (1 - aliveFrac) * 1.8);
  }

  function spawnBomb() {
    const cols = {};
    for (const a of grid) {
      if (!a.alive) continue;
      if (!cols[a.col] || a.y > cols[a.col].y) cols[a.col] = a;
    }
    const choices = Object.values(cols);
    if (!choices.length) return;
    const src = choices[Math.floor(Math.random() * choices.length)];
    bombs.push({ x: src.x, y: src.y + ALIEN_H / 2, base: src.x, phase: Math.random() * 6, speed: 100 + wave * 18, t: 0 });
  }

  function update(dt) {
    fireCd -= dt;
    if (invuln > 0) invuln -= dt;

    // Player
    if (keys.left) player.x -= PLAYER_SPEED * dt;
    if (keys.right) player.x += PLAYER_SPEED * dt;
    player.x = Math.max(16, Math.min(W - 16, player.x));
    if (keys.fire) fire();

    // Player shot
    if (pShot) {
      pShot.y += pShot.vy * dt;
      if (pShot.y < -8) pShot = null;
      else if (bunkerHit(pShot.x, pShot.y, 7)) pShot = null;
      else {
        for (const a of grid) {
          if (!a.alive) continue;
          if (Math.abs(pShot.x - a.x) < ALIEN_W / 2 && Math.abs(pShot.y - a.y) < ALIEN_H / 2) {
            a.alive = false;
            score += ROW_PTS[a.row];
            burst(a.x, a.y, ACC, 8);
            pShot = null;
            updateHud();
            break;
          }
        }
      }
    }

    // Marching grid: smooth drift, drop and reverse at the edges
    const aliveCount = grid.filter((a) => a.alive).length;
    if (aliveCount > 0) {
      const spd = alienSpeed();
      let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const a of grid) {
        if (!a.alive) continue;
        a.x += dir * spd * dt;
        minX = Math.min(minX, a.x);
        maxX = Math.max(maxX, a.x);
        maxY = Math.max(maxY, a.y);
      }
      if ((dir > 0 && maxX + ALIEN_W / 2 >= W - 6) || (dir < 0 && minX - ALIEN_W / 2 <= 6)) {
        dir = -dir;
        for (const a of grid) if (a.alive) a.y += 12;
      }
      marchT += dt;
      if (marchT >= 0.45) { marchT = 0; legFrame ^= 1; }

      // Bunkers erode underfoot, and landing on the player ends the game.
      for (const a of grid) {
        if (!a.alive) continue;
        if (a.y + ALIEN_H / 2 > 330) bunkerHit(a.x, a.y + ALIEN_H / 2, 9);
        if (a.y + ALIEN_H / 2 >= PLAYER_Y - 6) { gameOver("The invaders reached the ground."); return; }
      }
    }

    // Bombs
    bombCd -= dt;
    const cap = 2 + wave;
    if (bombCd <= 0 && bombs.length < cap && aliveCount > 0) {
      spawnBomb();
      bombCd = Math.max(0.35, 1.1 - wave * 0.15) * (0.5 + Math.random());
    }
    for (const b of bombs) {
      b.t += dt;
      b.y += b.speed * dt;
      b.x = b.base + Math.sin(b.t * 5 + b.phase) * 7;
    }
    bombs = bombs.filter((b) => {
      if (b.y > GROUND_Y - 2) return false;
      if (bunkerHit(b.x, b.y, 7)) return false;
      if (invuln <= 0 && Math.abs(b.x - player.x) < 15 && Math.abs(b.y - PLAYER_Y) < 9) {
        killPlayer();
        return false;
      }
      return true;
    });

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);

    if (aliveCount === 0) {
      if (wave >= WIN_WAVE) { winGame(); return; }
      wave++;
      buildGrid();
      buildBunkers();
      bombs = [];
      updateHud();
    }
  }

  function drawAlien(a) {
    const x = a.x, y = a.y;
    ctx.fillStyle = ACC;
    ctx.fillRect(x - ALIEN_W / 2, y - ALIEN_H / 2, ALIEN_W, ALIEN_H - 4);
    // legs alternate each march frame
    const off = legFrame ? 4 : 0;
    ctx.fillRect(x - ALIEN_W / 2 + off, y + ALIEN_H / 2 - 4, 4, 4);
    ctx.fillRect(x + ALIEN_W / 2 - 4 - off, y + ALIEN_H / 2 - 4, 4, 4);
    ctx.fillRect(x - 4, y + ALIEN_H / 2 - 4, 8, 4);
    // eyes
    ctx.fillStyle = BG;
    ctx.fillRect(x - 7, y - 4, 4, 4);
    ctx.fillRect(x + 3, y - 4, 4, 4);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // bunkers
    ctx.fillStyle = FG;
    for (const b of bunkers) {
      for (const cell of b.cells) {
        if (cell.alive) ctx.fillRect(b.x + cell.c * b.cw, b.y + cell.r * b.cw, b.cw, b.cw);
      }
    }

    for (const a of grid) if (a.alive) drawAlien(a);

    // bombs
    ctx.fillStyle = WARN;
    for (const b of bombs) ctx.fillRect(b.x - 2, b.y - 4, 4, 9);

    // player shot
    if (pShot) {
      ctx.fillStyle = FG;
      ctx.fillRect(pShot.x - 2, pShot.y - 7, 4, 12);
    }

    // ground
    ctx.fillStyle = FG;
    ctx.fillRect(0, GROUND_Y, W, 2);

    // player cannon (blinks while invulnerable)
    const blink = invuln > 0 && Math.floor(invuln * 8) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = FG;
      ctx.fillRect(player.x - 14, PLAYER_Y - 6, 28, 12);
      ctx.fillRect(player.x - 3, PLAYER_Y - 14, 6, 8);
      ctx.fillStyle = BG;
      ctx.fillRect(player.x - 8, PLAYER_Y - 2, 4, 4);
      ctx.fillRect(player.x + 4, PLAYER_Y - 2, 4, 4);
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
    player = { x: W / 2 };
    pShot = null; bombs = []; parts = [];
    fireCd = 0; invuln = 1.2; bombCd = 1.2;
    buildGrid();
    buildBunkers();
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
