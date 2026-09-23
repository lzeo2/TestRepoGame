(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const W = 480, H = 480;
  const BG = "#0b0f17", FG = "#e6edf7", ACC = "#ffd166", WARN = "#ff7a5c";

  const STEP = 24, N = W / STEP + 1;
  const GRAVITY = 12, THRUST = 42, ROT = 2.4, BURN = 20;
  const SAFE_VY = 14, SAFE_VX = 8, SAFE_ANG = 0.18;
  const HALF_W = 10, HALF_H = 9;
  const BEST_KEY = "lunarLanderBest";

  const el = (id) => document.getElementById(id);
  const screens = {
    start: el("startScreen"), over: el("overScreen"),
    win: el("winScreen"), pause: el("pauseScreen"),
  };
  const hud = { score: el("score"), level: el("level"), fuel: el("fuel"), speed: el("speed"), alt: el("alt"), best: el("best") };

  let raf = 0, state = "start", last = 0;
  const keys = { left: false, right: false, thrust: false };
  let score, level, best;
  let lander, pts, parts, thrusting;

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
    const speed = Math.hypot(lander.vx, lander.vy);
    hud.score.textContent = score;
    hud.level.textContent = level;
    hud.fuel.textContent = Math.max(0, Math.round(lander.fuel));
    hud.speed.textContent = Math.round(speed * 10) / 10;
    hud.alt.textContent = Math.max(0, Math.round(terrainY(lander.x) - (lander.y + HALF_H)));
    hud.best.textContent = best;
    el("startBest").textContent = best;
    el("overBest").textContent = best;
    el("winBest").textContent = best;
  }

  const stars = [];
  for (let i = 0; i < 34; i++) {
    stars.push({ x: (i * 137.5) % W, y: 20 + ((i * 71.7) % (H * 0.6)) });
  }

  function buildTerrain() {
    pts = [];
    let y = H * 0.78 + Math.random() * H * 0.06;
    for (let i = 0; i < N; i++) {
      if (i > 0) {
        y += (Math.random() - 0.5) * 70;
        y = Math.max(H * 0.70, Math.min(H * 0.94, y));
      }
      pts.push({ x: i * STEP, y, pad: 0 });
    }
    // A wider 2x pad and a narrow 4x pad, each flattened to its highest cell.
    placePad(2 + Math.floor(Math.random() * 2), 2, 2, 9);
    placePad(3, 4, 13, 17);
  }

  function placePad(cells, mult, minI, maxI) {
    const i0 = minI + Math.floor(Math.random() * (maxI - minI));
    let py = Infinity;
    for (let k = i0; k < i0 + cells; k++) py = Math.min(py, pts[k].y);
    for (let k = i0; k < i0 + cells; k++) { pts[k].y = py; pts[k].pad = mult; }
  }

  function segAt(x) {
    return Math.max(0, Math.min(N - 2, Math.floor(x / STEP)));
  }

  function terrainY(x) {
    const cx = Math.max(0, Math.min(W - 0.01, x));
    const i = segAt(cx);
    const t = (cx - pts[i].x) / STEP;
    return pts[i].y + (pts[i + 1].y - pts[i].y) * t;
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      const life = 0.4 + Math.random() * 0.5;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  function resetLander() {
    lander = {
      x: 70 + Math.random() * (W - 140),
      y: 44,
      vx: (Math.random() - 0.5) * 20,
      vy: 8,
      ang: 0,
      fuel: 100,
    };
  }

  function gameOver() {
    state = "over";
    if (score > best) { best = score; saveBest(); }
    el("overScore").textContent = score;
    updateHud();
    show("over");
    stop();
  }

  function winLanding(mult) {
    const fuelLeft = Math.max(0, lander.fuel);
    const ptsWon = Math.round((200 + fuelLeft * 4) * mult);
    score += ptsWon;
    state = "win";
    if (score > best) { best = score; saveBest(); }
    el("winDetail").textContent = `Down on a ${mult}x pad, fuel left ${Math.round(fuelLeft)}, plus ${ptsWon} points.`;
    el("winScore").textContent = score;
    updateHud();
    show("win");
    stop();
  }

  function checkTouchdown() {
    const footY = lander.y + HALF_H;
    if (footY < terrainY(lander.x)) return false;
    // Both feet must sit on the same flat pad, at a safe speed and angle.
    const iL = segAt(lander.x - HALF_W);
    const iR = segAt(lander.x + HALF_W);
    const segPad = (i) => (pts[i].pad && pts[i].pad === pts[i + 1].pad &&
      Math.abs(pts[i].y - pts[i + 1].y) < 0.5) ? pts[i].pad : 0;
    const padL = segPad(iL), padR = segPad(iR);
    const onPad = padL > 0 && padL === padR;
    const ang = Math.abs(((lander.ang + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (onPad && lander.vy <= SAFE_VY && Math.abs(lander.vx) <= SAFE_VX && ang <= SAFE_ANG) {
      winLanding(padL);
    } else {
      burst(lander.x, lander.y, WARN, 26, 150);
      burst(lander.x, lander.y, FG, 14, 110);
      gameOver();
    }
    return true;
  }

  function update(dt) {
    if (keys.left) lander.ang -= ROT * dt;
    if (keys.right) lander.ang += ROT * dt;

    thrusting = keys.thrust && lander.fuel > 0;
    if (thrusting) {
      lander.vx += Math.sin(lander.ang) * THRUST * dt;
      lander.vy += -Math.cos(lander.ang) * THRUST * dt;
      lander.fuel = Math.max(0, lander.fuel - BURN * dt);
    }

    lander.vy = Math.min(lander.vy + GRAVITY * dt, 170);
    lander.vx = Math.max(-70, Math.min(70, lander.vx));
    lander.x += lander.vx * dt;
    lander.y += lander.vy * dt;

    if (lander.x < -HALF_W) lander.x += W + HALF_W * 2;
    else if (lander.x > W + HALF_W) lander.x -= W + HALF_W * 2;
    if (lander.y < 10) { lander.y = 10; lander.vy = Math.max(0, lander.vy); }

    if (checkTouchdown()) return;

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0);

    updateHud();
  }

  function drawLander() {
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.ang);
    ctx.fillStyle = FG;
    ctx.fillRect(-7, -6, 14, 9);           // cabin
    ctx.fillRect(-4, -10, 8, 4);           // top dome
    ctx.fillRect(-10, 3, 3, 4);            // feet
    ctx.fillRect(7, 3, 3, 4);
    ctx.fillRect(-8, 3, 4, 2);             // legs
    ctx.fillRect(4, 3, 4, 2);
    ctx.fillStyle = BG;
    ctx.fillRect(-2, -4, 4, 4);            // window
    if (thrusting) {
      ctx.fillStyle = WARN;
      const flicker = 8 + Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(0, 5 + flicker);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = FG;
    ctx.globalAlpha = 0.3;
    for (const s of stars) ctx.fillRect(s.x, s.y, 2, 2);
    ctx.globalAlpha = 1;

    // terrain line
    ctx.strokeStyle = FG;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, pts[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // lit pads
    ctx.lineWidth = 4;
    ctx.strokeStyle = ACC;
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = ACC;
    ctx.textAlign = "center";
    for (let i = 0; i < N - 1; i++) {
      if (!pts[i].pad || pts[i].pad !== pts[i + 1].pad || Math.abs(pts[i].y - pts[i + 1].y) > 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y - 1);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y - 1);
      ctx.stroke();
      if (i === 0 || !pts[i - 1].pad || pts[i - 1].pad !== pts[i].pad) {
        ctx.fillText(`${pts[i].pad}x`, (pts[i].x + pts[i + 1].x) / 2, pts[i].y - 8);
      }
    }

    if (state !== "over") drawLander();

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
    score = 0; level = 1;
    buildTerrain();
    resetLander();
    parts = [];
    thrusting = false;
    updateHud();
    show(null);
    state = "play";
    raf = requestAnimationFrame(loop);
  }

  function nextLanding() {
    level++;
    buildTerrain();
    resetLander();
    parts = [];
    thrusting = false;
    updateHud();
    show(null);
    state = "play";
    last = 0;
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

  const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "thrust", KeyW: "thrust", Space: "thrust" };

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
  document.getElementById("againBtn").addEventListener("click", nextLanding);
  document.getElementById("resumeBtn").addEventListener("click", togglePause);
  document.getElementById("menuBtn1").addEventListener("click", menu);
  document.getElementById("menuBtn2").addEventListener("click", menu);
  document.getElementById("menuBtn3").addEventListener("click", menu);

  // Build a preview terrain so the HUD shows real values before the first game.
  buildTerrain();
  resetLander();
  parts = [];
  updateHud();
  show("start");
})();
