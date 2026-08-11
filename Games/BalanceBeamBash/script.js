(function () {
  "use strict";

  // ---------------- DOM ----------------
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var p1scoreEl = document.getElementById("p1score");
  var p2scoreEl = document.getElementById("p2score");
  var p1bestEl = document.getElementById("p1best");
  var p2bestEl = document.getElementById("p2best");
  var timerEl = document.getElementById("timer");
  var clockEl = timerEl.parentNode;
  var muteBtn = document.getElementById("muteBtn");

  var W = canvas.width; // 720
  var H = canvas.height; // 480

  // ---------------- constants ----------------
  var PX = 360, PY = 258; // beam pivot
  var HALF = 280; // beam half length
  var R = 9; // token radius
  var WALL = HALF - R; // token bounce wall (beam-local)
  var BEAM_T = 18; // beam plank thickness

  var G = 300; // gravity along beam (px/s^2)
  var FRIC = 30; // rolling friction (px/s^2)
  var REST = 0.5; // wall restitution

  var CAP_R = 76; // pocket capture radius
  var CAP_V = 70; // pocket capture max speed
  var POCKETS = [
    { c: -160, v: 1 },
    { c: 0, v: 5 },
    { c: 160, v: 1 }
  ];

  var MAX_TILT = 0.35; // rad (~20 deg)
  var TORQUE = 1.5; // per weight unit
  var DAMP = 3.5;
  var RESTORE = 3.0; // beam returns to level

  var MAX_W = 6;
  var W_RAMP = 4.5; // weight gain per second while held
  var W_DECAY = 3.0; // weight drain per second when released

  var CHARGE_TIME = 0.8;
  var CHARGE_MIN = 90;
  var CHARGE_MAX = 210;
  var LAUNCH_CD = 0.25;
  var TOKEN_LIFE = 15;
  var MAX_TOKENS = 26;
  var ROUND_TIME = 60;

  var BEST1_KEY = "bbb_best1";
  var BEST2_KEY = "bbb_best2";
  var MUTE_KEY = "bbb_muted";

  // ---------------- state ----------------
  var state = "start"; // start | play | over
  var timer = ROUND_TIME;
  var score1 = 0, score2 = 0;
  var best1 = 0, best2 = 0;
  var theta = 0, omega = 0;
  var wL = 0, wR = 0;
  var tokens = [];
  var p1 = { charging: false, chargeT: 0, cd: 0 };
  var p2 = { charging: false, chargeT: 0, cd: 0 };
  var held = { p1w: false, p2w: false };
  var particles = [];
  var texts = [];
  var shake = 0;
  var muted = false;

  try { best1 = +localStorage.getItem(BEST1_KEY) || 0; } catch (e) {}
  try { best2 = +localStorage.getItem(BEST2_KEY) || 0; } catch (e) {}
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}
  muteBtn.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ---------------- audio ----------------
  var AC = null;
  function audio() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function tone(freq, dur, type, vol, delay) {
    if (muted) return;
    var a = audio();
    if (!a) return;
    try {
      var t = a.currentTime + (delay || 0);
      var o = a.createOscillator();
      var g = a.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  function sfxLaunch() { tone(300, 0.09, "square", 0.09); tone(560, 0.06, "square", 0.07, 0.05); }
  function sfxCapture(v) {
    if (v >= 5) { tone(880, 0.09, "triangle", 0.16); tone(1174, 0.14, "triangle", 0.13, 0.08); }
    else { tone(660, 0.1, "triangle", 0.13); }
  }
  function sfxTick() { tone(980, 0.05, "square", 0.07); }
  function sfxStart() { tone(520, 0.08, "square", 0.09); tone(784, 0.1, "square", 0.08, 0.08); }
  function sfxOver() { tone(392, 0.18, "triangle", 0.14); tone(262, 0.3, "triangle", 0.12, 0.16); }

  function toggleMute() {
    muted = !muted;
    muteBtn.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
  }

  // ---------------- helpers ----------------
  function burst(x, y, color, n, speed) {
    var i, a, v;
    for (i = 0; i < n; i++) {
      a = Math.random() * Math.PI * 2;
      v = (speed || 150) * (0.4 + Math.random() * 0.8);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85,
        r: 2 + Math.random() * 3,
        color: color
      });
    }
  }
  function addText(x, y, txt, color, size) {
    texts.push({ x: x, y: y, txt: txt, color: color, size: size || 16, t: 1.2 });
  }

  function tokenWorldPos(t) {
    return {
      x: PX + t.lx * Math.cos(theta),
      y: PY + t.lx * Math.sin(theta)
    };
  }

  // ---------------- physics ----------------
  function beamStep(dt) {
    if (held.p1w) wL = Math.min(MAX_W, wL + W_RAMP * dt);
    else wL = Math.max(0, wL - W_DECAY * dt);
    if (held.p2w) wR = Math.min(MAX_W, wR + W_RAMP * dt);
    else wR = Math.max(0, wR - W_DECAY * dt);

    var alpha = TORQUE * (wR - wL) * Math.cos(theta) - DAMP * omega - RESTORE * theta;
    omega += alpha * dt;
    theta += omega * dt;
    if (theta > MAX_TILT) { theta = MAX_TILT; omega = 0; }
    if (theta < -MAX_TILT) { theta = -MAX_TILT; omega = 0; }
  }

  function tokenStep(t, dt) {
    t.age += dt;
    var slope = G * Math.sin(theta);
    var a;
    if (Math.abs(t.vx) < 1 && Math.abs(slope) < FRIC) {
      a = 0;
      t.vx = 0;
    } else {
      a = slope - FRIC * Math.sign(t.vx);
    }
    t.vx += a * dt;
    t.lx += t.vx * dt;
    if (t.lx > WALL) { t.lx = WALL; t.vx = -t.vx * REST; }
    if (t.lx < -WALL) { t.lx = -WALL; t.vx = -t.vx * REST; }
  }

  function tokenCollide(a, b) {
    var d = a.lx - b.lx;
    if (Math.abs(d) < 2 * R) {
      var push = (2 * R - Math.abs(d)) / 2;
      if (d > 0) { a.lx += push; b.lx -= push; }
      else { a.lx -= push; b.lx += push; }
      var tmp = a.vx; a.vx = b.vx; b.vx = tmp;
    }
  }

  function captureCheck(t) {
    var i, p;
    for (i = 0; i < POCKETS.length; i++) {
      p = POCKETS[i];
      if (Math.abs(t.lx - p.c) < CAP_R && Math.abs(t.vx) < CAP_V) return p.v;
    }
    return null;
  }

  // ---------------- game flow ----------------
  function fire(side) {
    var pl = side === "left" ? p1 : p2;
    if (state !== "play" || pl.cd > 0 || tokens.length >= MAX_TOKENS) {
      pl.charging = false;
      pl.chargeT = 0;
      return;
    }
    var charge = Math.min(1, pl.chargeT / CHARGE_TIME);
    var speed = CHARGE_MIN + (CHARGE_MAX - CHARGE_MIN) * charge;
    tokens.push({
      side: side,
      lx: side === "left" ? -WALL : WALL,
      vx: side === "left" ? speed : -speed,
      age: 0
    });
    pl.charging = false;
    pl.chargeT = 0;
    pl.cd = LAUNCH_CD;
    var w = tokenWorldPos({ lx: side === "left" ? -WALL : WALL });
    burst(w.x, w.y, side === "left" ? "#4dd2ff" : "#ffd94a", 8, 120);
    sfxLaunch();
  }

  function startCharge(side) {
    if (state !== "play") return;
    var pl = side === "left" ? p1 : p2;
    audio(); // unlock on first gesture
    if (!pl.charging) {
      pl.charging = true;
      pl.chargeT = 0;
    }
  }

  function stepTokens(dt) {
    var i, j, t, c, w;
    for (i = tokens.length - 1; i >= 0; i--) {
      t = tokens[i];
      tokenStep(t, dt);
      if (t.age > TOKEN_LIFE) {
        tokens.splice(i, 1);
        continue;
      }
      c = captureCheck(t);
      if (c !== null) {
        w = tokenWorldPos(t);
        if (t.side === "left") score1 += c; else score2 += c;
        addText(w.x, w.y - 16, "+" + c, t.side === "left" ? "#7fdcff" : "#ffe08a", c >= 5 ? 22 : 16);
        burst(w.x, w.y, c >= 5 ? "#ffd94a" : "#9fe8ff", c >= 5 ? 18 : 10, c >= 5 ? 190 : 130);
        if (c >= 5) shake = Math.max(shake, 3);
        sfxCapture(c);
        tokens.splice(i, 1);
      }
    }
    for (i = 0; i < tokens.length; i++) {
      for (j = i + 1; j < tokens.length; j++) tokenCollide(tokens[i], tokens[j]);
    }
  }

  function updateParticles(dt) {
    var i, p;
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - 3 * dt);
      p.vy *= (1 - 3 * dt);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) {
      p = texts[i];
      p.y -= 34 * dt;
      p.t -= dt;
      if (p.t <= 0) texts.splice(i, 1);
    }
  }

  function updateHud() {
    p1scoreEl.textContent = score1;
    p2scoreEl.textContent = score2;
    p1bestEl.textContent = best1;
    p2bestEl.textContent = best2;
    timerEl.textContent = Math.max(0, Math.ceil(timer));
    clockEl.classList.toggle("low", state === "play" && timer <= 10);
  }

  function reset() {
    score1 = 0;
    score2 = 0;
    timer = ROUND_TIME;
    theta = 0;
    omega = 0;
    wL = 0;
    wR = 0;
    tokens = [];
    particles = [];
    texts = [];
    p1.charging = false; p1.chargeT = 0; p1.cd = 0;
    p2.charging = false; p2.chargeT = 0; p2.cd = 0;
    held.p1w = false;
    held.p2w = false;
    shake = 0;
    lastTickSec = -1;
    state = "play";
    updateHud();
    sfxStart();
  }

  function startIfIdle() {
    if (state === "start" || state === "over") reset();
  }

  function endRound() {
    state = "over";
    if (score1 > best1) { best1 = score1; try { localStorage.setItem(BEST1_KEY, best1); } catch (e) {} }
    if (score2 > best2) { best2 = score2; try { localStorage.setItem(BEST2_KEY, best2); } catch (e) {} }
    updateHud();
    sfxOver();
  }

  function update(dt) {
    if (state !== "play") return;
    timer -= dt;
    if (timer <= 0) { timer = 0; endRound(); return; }

    beamStep(dt);

    p1.cd = Math.max(0, p1.cd - dt);
    p2.cd = Math.max(0, p2.cd - dt);
    if (p1.charging) {
      p1.chargeT += dt;
      if (p1.chargeT >= CHARGE_TIME) fire("left");
    }
    if (p2.charging) {
      p2.chargeT += dt;
      if (p2.chargeT >= CHARGE_TIME) fire("right");
    }

    stepTokens(dt);
    updateParticles(dt);
    updateHud();

    var sec = Math.ceil(timer);
    if (sec <= 5 && sec > 0 && sec !== lastTickSec) {
      lastTickSec = sec;
      sfxTick();
    }
  }

  var lastTickSec = -1;

  // ---------------- drawing ----------------
  function draw() {
    ctx.save();
    ctx.fillStyle = "#0c1120";
    ctx.fillRect(0, 0, W, H);

    // faint sky grid
    ctx.strokeStyle = "rgba(120,150,210,0.05)";
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i <= W; i += 48) {
      ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, H); ctx.stroke();
    }
    for (i = 0; i <= H; i += 48) {
      ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(W, i + 0.5); ctx.stroke();
    }

    if (shake > 0.3) {
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      shake *= 0.86;
    }

    drawFloor();
    drawLaunchers();
    drawBeam();
    drawCounterweights();
    drawParticles();
    drawTexts();

    if (state === "start") {
      ctx.fillStyle = "rgba(6,9,18,0.85)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.fillText("BALANCE BEAM BASH", W / 2, H / 2 - 86);
      ctx.fillStyle = "#8fa3c8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("A seesaw tug-of-war over a 60-second round", W / 2, H / 2 - 58);
      ctx.fillStyle = "#4dd2ff";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText("P1 (blue): hold A to tip LEFT \u00B7 hold S to charge & launch", W / 2, H / 2 - 26);
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText("P2 (gold): hold L to tip RIGHT \u00B7 hold K to charge & launch", W / 2, H / 2 + 2);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Tilt the beam so your tokens settle in a pocket", W / 2, H / 2 + 30);
      ctx.fillStyle = "#9fe8ff";
      ctx.fillText("Side pockets +1 \u00B7 center pocket +5 \u00B7 collisions shove tokens", W / 2, H / 2 + 52);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("Press SPACE, tap the beam, or hit RESTART", W / 2, H / 2 + 92);
    } else if (state === "over") {
      ctx.fillStyle = "rgba(6,9,18,0.82)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("TIME'S UP!", W / 2, H / 2 - 64);
      var winnerTxt = score1 > score2 ? "P1 WINS!" : score2 > score1 ? "P2 WINS!" : "TIE GAME!";
      ctx.fillStyle = score1 > score2 ? "#4dd2ff" : score2 > score1 ? "#ffd94a" : "#cfe0ff";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.fillText(winnerTxt, W / 2, H / 2 - 24);
      ctx.fillStyle = "#fff";
      ctx.font = "22px system-ui, sans-serif";
      ctx.fillText(score1 + " - " + score2, W / 2, H / 2 + 14);
      ctx.fillStyle = "#8fa3c8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Best \u00B7 P1: " + best1 + "  \u00B7  P2: " + best2, W / 2, H / 2 + 42);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE, tap the beam, or hit RESTART to play again", W / 2, H / 2 + 76);
    }

    ctx.restore();
  }

  function drawFloor() {
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(0, 428, W, H - 428);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 428.5);
    ctx.lineTo(W, 428.5);
    ctx.stroke();
    // floor studs
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    var i;
    for (i = 24; i < W; i += 48) {
      ctx.beginPath();
      ctx.arc(i, 456, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLaunchers() {
    var i, side, x, pl, charge01;
    var posts = [
      { x: 66, pl: p1, color: "#4dd2ff", side: "left" },
      { x: 654, pl: p2, color: "#ffd94a", side: "right" }
    ];
    for (i = 0; i < posts.length; i++) {
      x = posts[i].x;
      pl = posts[i].pl;
      // pillar
      ctx.fillStyle = "#232c42";
      ctx.fillRect(x - 7, 240, 14, 188);
      ctx.fillStyle = "#2f3a55";
      ctx.fillRect(x - 7, 240, 14, 10);
      // cup
      ctx.fillStyle = "#3d4968";
      ctx.fillRect(x - 14, 232, 28, 10);
      ctx.fillStyle = "#556088";
      ctx.fillRect(x - 14, 232, 28, 4);
      // charge bar
      if (state === "play" && pl.charging) {
        charge01 = Math.min(1, pl.chargeT / CHARGE_TIME);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x - 5, 232 - 42, 10, 42);
        ctx.fillStyle = pl.color;
        ctx.fillRect(x - 5, 232 - 42 * charge01, 10, 42 * charge01);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 5.5, 232 - 42.5, 11, 43);
      }
    }
  }

  function drawCounterweights() {
    var tipLX = PX - HALF * Math.cos(theta);
    var tipLY = PY - HALF * Math.sin(theta);
    var tipRX = PX + HALF * Math.cos(theta);
    var tipRY = PY + HALF * Math.sin(theta);
    drawOneCounterweight(tipLX, tipLY, wL, "#4dd2ff");
    drawOneCounterweight(tipRX, tipRY, wR, "#ffd94a");
  }

  function drawOneCounterweight(tx, ty, w, color) {
    var n = Math.round(w);
    var bW = 26, bH = 10, gap = 2;
    var y = ty + 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, y);
    ctx.stroke();
    var i;
    for (i = 0; i < n; i++) {
      ctx.fillStyle = color;
      ctx.fillRect(tx - bW / 2, y + i * (bH + gap), bW, bH);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(tx - bW / 2, y + i * (bH + gap), bW, 3);
    }
    if (n === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.arc(tx, y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBeam() {
    ctx.save();
    ctx.translate(PX, PY);
    ctx.rotate(theta);

    // plank
    var grad = ctx.createLinearGradient(0, -BEAM_T / 2, 0, BEAM_T / 2);
    grad.addColorStop(0, "#8a5a2b");
    grad.addColorStop(0.45, "#7a4d23");
    grad.addColorStop(1, "#5f3818");
    ctx.fillStyle = grad;
    roundRect(-HALF, -BEAM_T / 2, HALF * 2, BEAM_T, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // plank stripes
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-HALF + 8, 0);
    ctx.lineTo(HALF - 8, 0);
    ctx.stroke();

    // tip caps
    ctx.fillStyle = "#3a4156";
    ctx.fillRect(-HALF - 3, -BEAM_T / 2 - 2, 6, BEAM_T + 4);
    ctx.fillRect(HALF - 3, -BEAM_T / 2 - 2, 6, BEAM_T + 4);

    // pocket rings
    var i, p, pulse = 0.75 + 0.25 * Math.sin(Date.now() / 300);
    for (i = 0; i < POCKETS.length; i++) {
      p = POCKETS[i];
      ctx.strokeStyle = p.v >= 5 ? "#ffd94a" : "rgba(220,235,255,0.55)";
      ctx.lineWidth = p.v >= 5 ? 3 : 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(p.c, 0, 40 * (p.v >= 5 ? pulse : 1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.v >= 5 ? "#ffd94a" : "rgba(220,235,255,0.75)";
      ctx.font = "bold " + (p.v >= 5 ? 17 : 13) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+" + p.v, p.c, 1);
      ctx.textBaseline = "alphabetic";
    }

    // tokens (drawn in beam frame)
    var j, t, bob, angle;
    for (j = 0; j < tokens.length; j++) {
      t = tokens[j];
      bob = Math.abs(t.vx) * 0.006;
      angle = t.lx / R; // rolling wheel
      ctx.fillStyle = t.side === "left" ? "#4dd2ff" : "#ffd94a";
      ctx.beginPath();
      ctx.arc(t.lx, -BEAM_T / 2 - R - bob, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.lx, -BEAM_T / 2 - R - bob, R - 2, angle, angle + 2.4);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(t.lx - 3, -BEAM_T / 2 - R - bob - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // pivot base + hub (world frame, stays upright)
    ctx.fillStyle = "#2b3350";
    ctx.beginPath();
    ctx.moveTo(PX - 30, PY + 12);
    ctx.lineTo(PX + 30, PY + 12);
    ctx.lineTo(PX, PY + 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#3d4968";
    ctx.beginPath();
    ctx.arc(PX, PY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#cfe0ff";
    ctx.beginPath();
    ctx.arc(PX, PY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    var i, p;
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    var i, t;
    ctx.textAlign = "center";
    for (i = 0; i < texts.length; i++) {
      t = texts[i];
      ctx.globalAlpha = clamp(t.t, 0, 1);
      ctx.fillStyle = t.color;
      ctx.font = "bold " + t.size + "px system-ui, sans-serif";
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- loop ----------------
  var last = 0;
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------------- input ----------------
  function keysDown(code) {
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        held.p1w = true;
        break;
      case "KeyS":
      case "ArrowDown":
        startCharge("left");
        break;
      case "KeyL":
      case "ArrowRight":
        held.p2w = true;
        break;
      case "KeyK":
      case "ArrowUp":
        startCharge("right");
        break;
      case "Space":
        startIfIdle();
        break;
      case "Enter":
        startIfIdle();
        break;
      case "KeyR":
        reset();
        break;
      case "KeyM":
        toggleMute();
        break;
    }
  }
  function keysUp(code) {
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        held.p1w = false;
        break;
      case "KeyS":
      case "ArrowDown":
        if (p1.charging) fire("left");
        break;
      case "KeyL":
      case "ArrowRight":
        held.p2w = false;
        break;
      case "KeyK":
      case "ArrowUp":
        if (p2.charging) fire("right");
        break;
    }
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowUp" || e.code === "ArrowDown" ||
        e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") {
      e.preventDefault();
    }
    if (!e.repeat) keysDown(e.code);
  });
  window.addEventListener("keyup", function (e) {
    keysUp(e.code);
  });

  function hold(el, on, off) {
    var active = false;
    function d(e) {
      e.preventDefault();
      if (!active) {
        active = true;
        on();
      }
    }
    function u(e) {
      e.preventDefault();
      if (active) {
        active = false;
        off();
      }
    }
    el.addEventListener("pointerdown", d);
    el.addEventListener("pointerup", u);
    el.addEventListener("pointercancel", u);
    el.addEventListener("touchstart", d, { passive: false });
    el.addEventListener("touchend", u, { passive: false });
    el.addEventListener("touchcancel", u, { passive: false });
    el.addEventListener("mousedown", d);
    el.addEventListener("mouseup", u);
    el.addEventListener("mouseleave", u);
  }

  hold(
    document.getElementById("p1W"),
    function () { held.p1w = true; },
    function () { held.p1w = false; }
  );
  hold(
    document.getElementById("p2W"),
    function () { held.p2w = true; },
    function () { held.p2w = false; }
  );
  hold(
    document.getElementById("p1L"),
    function () { startCharge("left"); },
    function () { if (p1.charging) fire("left"); }
  );
  hold(
    document.getElementById("p2L"),
    function () { startCharge("right"); },
    function () { if (p2.charging) fire("right"); }
  );

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    audio();
    startIfIdle();
  });

  document.getElementById("restartBtn").addEventListener("click", function () {
    reset();
  });
  muteBtn.addEventListener("click", toggleMute);

  window.addEventListener("blur", function () {
    held.p1w = false;
    held.p2w = false;
    p1.charging = false;
    p2.charging = false;
    p1.chargeT = 0;
    p2.chargeT = 0;
  });

  updateHud();
  requestAnimationFrame(loop);
})();
