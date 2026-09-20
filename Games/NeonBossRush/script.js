"use strict";

// ===== Neon Boss Rush =====
// Top-down arena boss-rush. One boss, 4 phases, each a distinct bullet pattern.
// Pure canvas/JS/CSS. No external fetches, no frameworks.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SKEY = "neonbossrush.best";

// Phase bullet palette (also used to tint the boss per phase).
const PHASE_COLOR = {
  1: "#19e6ff", // radial burst  - cyan
  2: "#9dff3c", // spiral        - lime
  3: "#ff9b3c", // aimed shotgun - orange
  4: "#ff3ca8", // laser sweep   - magenta
};

let W = 0, H = 0, scale = 1;
let state = "start"; // start | playing | over | win
let player, boss, bullets, particles, timeSurvived, damageDealt, score, furthestThisRun;

// ---------- Storage ----------
function loadBest() {
  try {
    const v = JSON.parse(localStorage.getItem(SKEY));
    if (v && typeof v.phase === "number" && typeof v.time === "number") return v;
  } catch (e) { /* corrupt data -> reset */ }
  return { phase: 0, time: 0 };
}
function saveBest(phase, time) {
  const b = loadBest();
  const next = { phase: Math.max(b.phase, phase), time: Math.max(b.time, time) };
  try { localStorage.setItem(SKEY, JSON.stringify(next)); } catch (e) { /* storage blocked */ }
}

// ---------- Canvas sizing (DPI aware, responsive) ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.min(W, H) / 800;
}
window.addEventListener("resize", resize);
resize();

// ---------- Input ----------
const keys = { left: 0, right: 0, up: 0, down: 0, dash: false };
const keyMap = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
  W: "up", S: "down", A: "left", D: "right",
};
window.addEventListener("keydown", (e) => {
  if (e.key === " ") { keys.dash = true; if (state === "playing") e.preventDefault(); }
  const k = keyMap[e.key];
  if (k) {
    keys[k] = 1;
    if (state === "playing") e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") keys.dash = false;
  const k = keyMap[e.key];
  if (k) keys[k] = 0;
});

// Touch joystick (left) + dash button (right)
const jb = document.getElementById("joystick");
const jk = document.getElementById("knob");
const dashBtn = document.getElementById("dashBtn");
let joy = { x: 0, y: 0 };
let joyId = null;
let touchDash = false;

function moveJoy(t) {
  const r = jb.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = t.clientX - cx, dy = t.clientY - cy;
  const max = r.width / 2;
  const d = Math.hypot(dx, dy) || 1;
  if (d > max) { dx = dx / d * max; dy = dy / d * max; }
  jk.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / max; joy.y = dy / max;
}
jb.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyId = t.identifier;
  moveJoy(t);
}, { passive: false });
jb.addEventListener("touchmove", (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === joyId) moveJoy(t);
}, { passive: false });
function endJoy(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) {
      joyId = null; joy.x = 0; joy.y = 0;
      jk.style.transform = "translate(0,0)";
    }
  }
}
jb.addEventListener("touchend", endJoy);
jb.addEventListener("touchcancel", endJoy);
dashBtn.addEventListener("touchstart", (e) => { e.preventDefault(); touchDash = true; }, { passive: false });
dashBtn.addEventListener("touchend", (e) => { e.preventDefault(); touchDash = false; }, { passive: false });

// ---------- Game setup ----------
function initGame() {
  player = {
    x: W / 2, y: H * 0.78, r: Math.max(9, 16 * scale),
    hp: 100, maxHp: 100,
    speed: 330 * scale, dashSpeed: 940 * scale,
    dashT: 0, dashCd: 0, dashCdMax: 1.2, dashAngle: 0,
    invuln: 0, aimAngle: -Math.PI / 2,
    fireT: 0, fireRate: 0.1, hitFlash: 0,
  };
  boss = {
    x: W / 2, y: H * 0.28, r: Math.max(26, 58 * scale),
    hp: 3000, maxHp: 3000, phase: 1,
    fireT: 0.8, spiral: 0, laserAngle: 0, hitFlash: 0,
  };
  bullets = [];
  particles = [];
  timeSurvived = 0;
  damageDealt = 0;
  score = 0;
  furthestThisRun = 1;
}

function fireBullet(x, y, angle, speed, color, r, dmg) {
  bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r, color, dmg, from: "boss", life: 6,
  });
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (40 + Math.random() * 140) * scale;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.3, max: 0.7, color,
    });
  }
}

// ---------- Boss patterns (one per phase) ----------
function updateBoss(dt) {
  const p = boss.phase;
  const bx = boss.x, by = boss.y;
  const toPlayer = Math.atan2(player.y - by, player.x - bx);

  if (p === 1) {
    // Radial burst: full rings of bullets on a timer.
    boss.fireT -= dt;
    if (boss.fireT <= 0) {
      boss.fireT = 1.1;
      const n = 18;
      for (let i = 0; i < n; i++) {
        fireBullet(bx, by, (i / n) * Math.PI * 2, 175 * scale, PHASE_COLOR[1], Math.max(4, 6 * scale), 12);
      }
    }
  } else if (p === 2) {
    // Spiral: continuous streams emitted at a rotating angle.
    boss.fireT -= dt;
    if (boss.fireT <= 0) {
      boss.fireT = 0.05;
      boss.spiral += 0.42;
      for (let k = 0; k < 3; k++) {
        const a = boss.spiral + (k * Math.PI * 2) / 3;
        fireBullet(bx, by, a, 155 * scale, PHASE_COLOR[2], Math.max(4, 6 * scale), 10);
      }
    }
  } else if (p === 3) {
    // Aimed shotgun: spread volleys locked onto the player.
    boss.fireT -= dt;
    if (boss.fireT <= 0) {
      boss.fireT = 1.25;
      const spread = 0.13, count = 7;
      for (let i = 0; i < count; i++) {
        const a = toPlayer + (i - (count - 1) / 2) * spread;
        fireBullet(bx, by, a, 235 * scale, PHASE_COLOR[3], Math.max(4, 6 * scale), 12);
      }
    }
  } else if (p === 4) {
    // Rotating laser sweep + periodic radial bursts.
    boss.laserAngle += dt * 1.1;
    // Continuous beam damage when the player sits inside the beam cone.
    const diff = Math.atan2(Math.sin(player.y - by), Math.cos(player.x - bx)) - boss.laserAngle;
    const ad = Math.atan2(Math.sin(diff), Math.cos(diff));
    const dist = Math.hypot(player.x - bx, player.y - by);
    if (Math.abs(ad) < 0.1 && dist < Math.hypot(W, H) && player.invuln <= 0) {
      player.hp -= 22 * dt;
      player.hitFlash = 0.08;
    }
    boss.fireT -= dt;
    if (boss.fireT <= 0) {
      boss.fireT = 2.2;
      const n = 14;
      for (let i = 0; i < n; i++) {
        fireBullet(bx, by, (i / n) * Math.PI * 2, 185 * scale, PHASE_COLOR[4], Math.max(4, 6 * scale), 12);
      }
    }
  }
}

// ---------- Update ----------
function update(dt) {
  timeSurvived += dt;

  // Movement input: keyboard + joystick combined.
  let mvx = (keys.right - keys.left) + joy.x;
  let mvy = (keys.down - keys.up) + joy.y;
  const ml = Math.hypot(mvx, mvy);
  if (ml > 1) { mvx /= ml; mvy /= ml; }
  if (ml > 0.01) player.aimAngle = Math.atan2(mvy, mvx);

  // Dash trigger.
  if ((keys.dash || touchDash) && player.dashCd <= 0 && player.dashT <= 0) {
    player.dashT = 0.16;
    player.dashCd = player.dashCdMax;
    player.dashAngle = ml > 0.01 ? Math.atan2(mvy, mvx) : player.aimAngle;
    player.invuln = Math.max(player.invuln, 0.24);
  }

  // Apply velocity.
  let vx, vy;
  if (player.dashT > 0) {
    vx = Math.cos(player.dashAngle) * player.dashSpeed;
    vy = Math.sin(player.dashAngle) * player.dashSpeed;
    player.dashT -= dt;
  } else {
    vx = mvx * player.speed;
    vy = mvy * player.speed;
  }
  player.x += vx * dt;
  player.y += vy * dt;
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));

  player.dashCd = Math.max(0, player.dashCd - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.hitFlash = Math.max(0, player.hitFlash - dt);
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);

  // Auto-fire at the boss.
  player.fireT -= dt;
  if (player.fireT <= 0) {
    player.fireT = player.fireRate;
    const a = Math.atan2(boss.y - player.y, boss.x - player.x);
    bullets.push({
      x: player.x + Math.cos(a) * player.r,
      y: player.y + Math.sin(a) * player.r,
      vx: Math.cos(a) * 520 * scale,
      vy: Math.sin(a) * 520 * scale,
      r: Math.max(3, 5 * scale), color: "#7ffcff", dmg: 10, from: "player", life: 3,
    });
  }

  updateBoss(dt);

  // Move + cull bullets.
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
      bullets.splice(i, 1);
      continue;
    }
    if (b.from === "player") {
      const d = Math.hypot(b.x - boss.x, b.y - boss.y);
      if (d < boss.r + b.r) {
        boss.hp -= b.dmg;
        damageDealt += b.dmg;
        boss.hitFlash = 0.1;
        spawnParticles(b.x, b.y, "#ff7fe0", 4);
        bullets.splice(i, 1);
      }
    } else {
      const d = Math.hypot(b.x - player.x, b.y - player.y);
      if (player.invuln <= 0 && d < player.r + b.r) {
        player.hp -= b.dmg;
        player.invuln = 0.8;
        player.hitFlash = 0.15;
        spawnParticles(player.x, player.y, "#19e6ff", 6);
        bullets.splice(i, 1);
      }
    }
  }

  // Particles.
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Phase advance by HP thresholds.
  const frac = boss.hp / boss.maxHp;
  const np = frac > 0.75 ? 1 : frac > 0.5 ? 2 : frac > 0.25 ? 3 : 4;
  if (np > boss.phase) {
    boss.phase = np;
    spawnParticles(boss.x, boss.y, PHASE_COLOR[np], 24);
  }
  if (boss.phase > furthestThisRun) furthestThisRun = boss.phase;

  score = Math.floor(damageDealt) + Math.floor(timeSurvived * 10);

  // End conditions.
  if (boss.hp <= 0) { win(); return; }
  if (player.hp <= 0) { gameOver(); return; }
}

// ---------- Render ----------
function drawGrid() {
  ctx.strokeStyle = "rgba(40, 60, 100, 0.18)";
  ctx.lineWidth = 1;
  const step = 44;
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

function glow(color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
function noGlow() { ctx.shadowBlur = 0; }

function render() {
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, W, H);
  drawGrid();

  if (state !== "playing" && state !== "over" && state !== "win") return;
  if (!boss || !player) return;

  // Laser beam (phase 4).
  if (boss.phase === 4) {
    const len = Math.hypot(W, H);
    glow(PHASE_COLOR[4], 24);
    ctx.strokeStyle = "rgba(255, 60, 168, 0.55)";
    ctx.lineWidth = 16 * scale;
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + Math.cos(boss.laserAngle) * len, boss.y + Math.sin(boss.laserAngle) * len);
    ctx.stroke();
    noGlow();
  }

  // Bullets.
  for (const b of bullets) {
    glow(b.color, 12);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  noGlow();

  // Boss.
  const bc = PHASE_COLOR[boss.phase];
  const flick = boss.hitFlash > 0 ? "#ffffff" : bc;
  glow(bc, 26);
  ctx.fillStyle = flick;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
  ctx.fill();
  // inner ring
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  noGlow();

  // Particles.
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    glow(p.color, 8);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  noGlow();

  // Player.
  const pc = player.hitFlash > 0 ? "#ffffff" : "#19e6ff";
  glow(pc, 20);
  ctx.fillStyle = pc;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  // aim pip
  ctx.fillStyle = "#eafcff";
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.aimAngle) * player.r, player.y + Math.sin(player.aimAngle) * player.r, player.r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  noGlow();

  // Dash cooldown ring around player.
  const ready = 1 - player.dashCd / player.dashCdMax;
  ctx.strokeStyle = player.dashT > 0 ? "#ffffff" : "rgba(255, 210, 60, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r + 7 * scale, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
  ctx.stroke();
}

// ---------- HUD ----------
const el = (id) => document.getElementById(id);
const bossHpEl = el("bossHp");
const phaseTextEl = el("phaseText");
const playerHpEl = el("playerHp");
const dashFillEl = el("dashFill");
const scoreTextEl = el("scoreText");

function updateHud() {
  bossHpEl.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
  phaseTextEl.textContent = "PHASE " + boss.phase + " / 4";
  playerHpEl.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + "%";
  dashFillEl.style.width = (1 - player.dashCd / player.dashCdMax) * 100 + "%";
  scoreTextEl.textContent = "SCORE " + score;
}

// ---------- Screens ----------
function show(id) { el(id).classList.remove("hidden"); }
function hide(id) { el(id).classList.add("hidden"); }

function refreshStartStats() {
  const b = loadBest();
  el("bestPhase").textContent = b.phase + " / 4";
  el("bestTime").textContent = b.time.toFixed(1) + "s";
}

function startGame() {
  initGame();
  state = "playing";
  hide("startScreen"); hide("gameOverScreen"); hide("winScreen");
  show("hud"); show("joystick"); show("dashBtn");
}

function gameOver() {
  state = "over";
  saveBest(furthestThisRun, timeSurvived);
  el("overScore").textContent = score;
  el("overTime").textContent = timeSurvived.toFixed(1) + "s";
  el("overPhase").textContent = boss.phase;
  hide("hud"); hide("joystick"); hide("dashBtn");
  show("gameOverScreen");
}

function win() {
  state = "win";
  saveBest(4, timeSurvived);
  el("winScore").textContent = score;
  el("winTime").textContent = timeSurvived.toFixed(1) + "s";
  hide("hud"); hide("joystick"); hide("dashBtn");
  show("winScreen");
}

el("startBtn").addEventListener("click", startGame);
el("overBtn").addEventListener("click", startGame);
el("winBtn").addEventListener("click", startGame);

// ---------- Main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state === "playing") { update(dt); if (state === "playing") updateHud(); }
  render();
  requestAnimationFrame(frame);
}

refreshStartStats();
requestAnimationFrame(frame);
