(function () {
  "use strict";

  /* ============================================================
     ORBIT RELAY
     2-4 player local timing game. Cursors orbit a shared center.
     Each player's cursor carries a moving gate (a colored arc on
     the outer ring that slides back and forth around the cursor).
     Tokens fire outward from the center at random angles; if your
     gate covers the token when it reaches the ring, you score and
     your streak grows. A miss wipes the streak.
     Keyboard + touch. No external assets.
     ============================================================ */

  // ---------------- DOM ----------------
  var $ = function (id) { return document.getElementById(id); };
  var screenMenu = $("screen-menu"),
    screenCountdown = $("screen-countdown"),
    screenGame = $("screen-game"),
    screenResult = $("screen-result");

  var playerSegs = Array.prototype.slice.call(document.querySelectorAll("#playerRow .seg"));
  var timeSegs = Array.prototype.slice.call(document.querySelectorAll("#timeRow .seg"));
  var startBtn = $("startBtn");
  var muteBtnMenu = $("muteBtnMenu");
  var cdNum = $("cdNum"), cdLabel = $("cdLabel");
  var timerChip = $("timerChip"), timerEl = $("timer");
  var hudChips = $("hudChips");
  var canvas = $("game"), ctx = canvas.getContext("2d");
  var pads = $("pads");
  var resultList = $("resultList"), resultTitle = $("resultTitle"), resBest = $("resBest");
  var againBtn = $("againBtn"), menuBtn = $("menuBtn");
  var pauseBtn = $("pauseBtn");
  var wrap = document.querySelector(".wrap");

  // ---------------- constants ----------------
  var PLAYER_COLORS = ["#4dd2ff", "#ffd94a", "#ff6b9d", "#7dff8a"];
  var CURSOR_SPEED = 3.1;          // rad/s max angular speed
  var ARC_HALF = 0.34;             // gate arc half-width (rad) ~ 19.5 deg
  var OSC_AMP = 0.12;              // gate slide amplitude (rad) ~ 7 deg
  var OSC_PERIOD = 1.6;            // gate slide period (s)
  var BASE_TRAVEL = 2.6;           // token travel time at streak 0 (s)
  var MIN_TRAVEL = 1.35;           // fastest token travel time (s)
  var STREAK_SCALE = 0.965;        // travel time shrink per streak
  var COOLDOWN = 0.55;             // seconds between tokens per player
  var BASE_PTS = 10;
  var STREAK_BONUS = 2;

  // ---------------- settings / stats ----------------
  var playerCount = 2;
  var roundTime = 90;
  var muted = localStorage.getItem("orbitrelay.muted") === "1";
  var bestKey = "";
  var stats = { best: {}, games: 0 };

  function loadStats() {
    try {
      var raw = localStorage.getItem("orbitrelay.stats");
      if (raw) stats = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!stats.best) stats.best = {};
    if (typeof stats.games !== "number") stats.games = 0;
  }
  function saveStats() {
    try { localStorage.setItem("orbitrelay.stats", JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }
  function bestFor() {
    return stats.best[bestKey] || 0;
  }

  // ---------------- state ----------------
  var state = "menu"; // menu | countdown | play | paused | result
  var gameTime = 0;   // accumulated play time (drives gate oscillation)
  var roundLeft = 0;
  var cdT = 0;
  var cdLastInt = -1;
  var goFlash = 0;
  var players = [];
  var fx = [];        // particles
  var popups = [];
  var ringFlash = null;
  var last = 0;
  var rafId = null;

  // canvas geometry
  var cw = 600, ch = 600, cx = 300, cy = 300, R = 264, dpr = 1;

  // ---------------- audio ----------------
  var actx = null;
  function ensureAudio() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
  }
  function beep(freq, dur, type, gain, delay) {
    if (muted || !actx) return;
    var t0 = actx.currentTime + (delay || 0);
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function soundTick() { beep(520, 0.07, "sine", 0.12); }
  function soundGo() { beep(760, 0.18, "sine", 0.16); }
  function soundPass(p) {
    beep(620 + Math.min(p.streak, 12) * 12, 0.09, "triangle", 0.16);
    beep(880 + Math.min(p.streak, 12) * 14, 0.12, "triangle", 0.14, 0.07);
  }
  function soundStreak(n) {
    var base = 660;
    [0, 4, 7, 12].forEach(function (semi, k) {
      beep(base * Math.pow(2, semi / 12), 0.14, "triangle", 0.15, k * 0.09);
    });
  }
  function soundMiss() { beep(130, 0.22, "sawtooth", 0.16); beep(80, 0.28, "square", 0.1, 0.02); }
  function soundEnd() {
    var seq = [523, 659, 784, 1047];
    seq.forEach(function (f, k) { beep(f, 0.16, "triangle", 0.16, k * 0.13); });
  }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem("orbitrelay.muted", m ? "1" : "0"); } catch (e) { /* ignore */ }
    muteBtnMenu.textContent = "Sound: " + (m ? "Off" : "On");
    muteBtnMenu.setAttribute("aria-pressed", m ? "true" : "false");
  }

  // ---------------- helpers ----------------
  function angDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function polar(ang, rad) {
    return { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------------- players ----------------
  function makePlayer(i) {
    return {
      i: i,
      name: "P" + (i + 1),
      color: PLAYER_COLORS[i],
      angle: rand(0, Math.PI * 2),
      vel: 0,
      left: false,
      right: false,
      r: 0,
      phase: (i / 4) * Math.PI * 2,
      score: 0,
      streak: 0,
      bestStreak: 0,
      passes: 0,
      misses: 0,
      token: null,
      cooldown: 0
    };
  }

  function gateAngle(p, t) {
    return p.angle + OSC_AMP * Math.sin((t * Math.PI * 2) / OSC_PERIOD + p.phase);
  }

  function startRound() {
    bestKey = playerCount + "p" + roundTime;
    players = [];
    var i;
    for (i = 0; i < playerCount; i++) players.push(makePlayer(i));
    layout();
    buildHudChips();
    buildPads();
    gameTime = 0;
    roundLeft = roundTime;
    fx = [];
    popups = [];
    ringFlash = null;
    goFlash = 0;
    layout();
    showScreen("countdown");
    cdT = 3.0;
    cdLastInt = -1;
    cdNum.className = "cd-num";
    cdLabel.textContent = "Get ready";
    state = "countdown";
  }

  // ---------------- layout ----------------
  function layout() {
    var side = Math.min(wrap.clientWidth, 600);
    if (side < 240) side = 240;
    dpr = window.devicePixelRatio || 1;
    cw = ch = side;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    canvas.style.width = side + "px";
    canvas.style.height = side + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = cw / 2;
    cy = ch / 2;
    R = cw / 2 - 34;
    for (var i = 0; i < players.length; i++) {
      players[i].r = R * (0.34 + 0.13 * players[i].i);
    }
  }

  // ---------------- HUD ----------------
  function buildHudChips() {
    hudChips.innerHTML = "";
    players.forEach(function (p) {
      var el = document.createElement("div");
      el.className = "chip";
      el.style.borderColor = p.color;
      el.innerHTML =
        '<span class="nm" style="color:' + p.color + '">' + p.name + "</span>" +
        '<span class="sc" style="color:' + p.color + '">0</span>' +
        '<span class="st">streak <b>0</b></span>';
      el.setAttribute("data-p", p.i);
      hudChips.appendChild(el);
    });
  }
  function updateHud() {
    timerEl.textContent = Math.max(0, Math.ceil(roundLeft));
    timerChip.classList.toggle("low", roundLeft <= 5);
    players.forEach(function (p) {
      var el = hudChips.querySelector('[data-p="' + p.i + '"]');
      if (!el) return;
      el.querySelector(".sc").textContent = p.score;
      var st = el.querySelector(".st b");
      st.textContent = p.streak;
      el.classList.toggle("active-streak", p.streak >= 3);
    });
  }

  // ---------------- touch pads ----------------
  function hold(el, on, off) {
    var active = false;
    function down(e) {
      e.preventDefault();
      if (!active) { active = true; on(); }
    }
    function up(e) {
      e.preventDefault();
      if (active) { active = false; off(); }
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  function buildPads() {
    pads.innerHTML = "";
    players.forEach(function (p) {
      var pad = document.createElement("div");
      pad.className = "pad";
      var lbl = document.createElement("span");
      lbl.className = "plabel";
      lbl.style.color = p.color;
      lbl.textContent = p.name;
      var l = document.createElement("button");
      l.type = "button"; l.className = "arrow"; l.textContent = "\u25C0";
      var r = document.createElement("button");
      r.type = "button"; r.className = "arrow"; r.textContent = "\u25B6";
      hold(l, function () { p.left = true; l.classList.add("held"); },
        function () { p.left = false; l.classList.remove("held"); });
      hold(r, function () { p.right = true; r.classList.add("held"); },
        function () { p.right = false; r.classList.remove("held"); });
      pad.appendChild(lbl); pad.appendChild(l); pad.appendChild(r);
      pads.appendChild(pad);
    });
  }

  // ---------------- screens ----------------
  function showScreen(id) {
    screenMenu.classList.add("hidden");
    screenCountdown.classList.add("hidden");
    screenGame.classList.add("hidden");
    screenResult.classList.add("hidden");
    if (id === "menu") screenMenu.classList.remove("hidden");
    if (id === "countdown") screenCountdown.classList.remove("hidden");
    if (id === "game") screenGame.classList.remove("hidden");
    if (id === "result") screenResult.classList.remove("hidden");
  }

  function toMenu() {
    state = "menu";
    showScreen("menu");
    $("menuBest").textContent = bestFor();
    $("menuGames").textContent = stats.games;
  }

  // ---------------- tokens ----------------
  function spawnToken(p) {
    var tt = Math.max(BASE_TRAVEL * Math.pow(STREAK_SCALE, p.streak), MIN_TRAVEL);
    p.token = { a: rand(0, Math.PI * 2), t: 0, tt: tt };
  }

  function resolveToken(p) {
    var tok = p.token;
    p.token = null;
    p.cooldown = COOLDOWN;
    var g = gateAngle(p, gameTime);
    var d = Math.abs(angDiff(g, tok.a));
    if (d <= ARC_HALF) {
      p.streak++;
      if (p.streak > p.bestStreak) p.bestStreak = p.streak;
      var pts = BASE_PTS + STREAK_BONUS * p.streak;
      p.score += pts;
      p.passes++;
      burst(tok.a, p.color, 0.5);
      addPopup(tok.a, "+" + pts, p.color);
      soundPass(p);
      if (p.streak % 5 === 0) soundStreak(p.streak);
    } else {
      p.streak = 0;
      p.misses++;
      burst(tok.a, "#ff6b6b", 0.9);
      addPopup(tok.a, "MISS", "#ff6b6b");
      ringFlash = { a: tok.a, t: 0, color: "#ff6b6b" };
      soundMiss();
    }
  }

  // ---------------- fx ----------------
  function burst(a, color, power) {
    var pt = polar(a, R);
    var n = 14;
    for (var k = 0; k < n; k++) {
      var ang = a + rand(-0.7, 0.7);
      var spd = rand(40, 160) * (0.5 + power);
      fx.push({
        x: pt.x, y: pt.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: rand(0.35, 0.7),
        t: 0,
        color: color,
        size: rand(2, 4.5)
      });
    }
  }
  function updateFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i];
      f.t += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.96;
      f.vy *= 0.96;
      if (f.t >= f.life) fx.splice(i, 1);
    }
    if (ringFlash) {
      ringFlash.t += dt;
      if (ringFlash.t > 0.45) ringFlash = null;
    }
    for (var j = popups.length - 1; j >= 0; j--) {
      var p = popups[j];
      p.t += dt;
      p.y -= 46 * dt;
      if (p.t >= 0.9) popups.splice(j, 1);
    }
  }
  function addPopup(a, text, color) {
    var pt = polar(a, R);
    popups.push({ x: pt.x, y: pt.y, t: 0, text: text, color: color });
  }

  // ---------------- update ----------------
  function update(dt) {
    if (state === "countdown") {
      cdT -= dt;
      var n = Math.ceil(cdT);
      if (n !== cdLastInt) {
        cdLastInt = n;
        cdNum.textContent = n > 0 ? n : "GO!";
        cdNum.classList.remove("go");
        if (n <= 0) cdNum.classList.add("go");
        if (n > 0) soundTick();
      }
      if (cdT <= 0) {
        state = "play";
        goFlash = 0.8;
        showScreen("game");
        soundGo();
        layout();
        // allow pre-positioning input during countdown: now live
      }
      // allow cursor repositioning while waiting
      moveCursors(dt);
      return;
    }
    if (state === "play") {
      gameTime += dt;
      roundLeft -= dt;
      if (goFlash > 0) goFlash -= dt;
      if (roundLeft <= 0) { endRound(); return; }
      moveCursors(dt);
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.cooldown > 0) p.cooldown -= dt;
        if (!p.token && p.cooldown <= 0) spawnToken(p);
        if (p.token) {
          p.token.t += dt;
          if (p.token.t >= p.token.tt) resolveToken(p);
        }
      }
      updateFx(dt);
      updateHud();
    }
  }

  function moveCursors(dt) {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      p.vel = 0;
      if (p.left) p.vel = -CURSOR_SPEED;
      if (p.right) p.vel = CURSOR_SPEED;
      p.angle += p.vel * dt;
    }
  }

  // ---------------- round end ----------------
  function endRound() {
    state = "result";
    stats.games++;
    var cur = bestFor();
    var top = 0;
    players.forEach(function (p) { if (p.score > top) top = p.score; });
    if (top > cur) stats.best[bestKey] = top;
    saveStats();
    soundEnd();

    var sorted = players.slice().sort(function (a, b) { return b.score - a.score; });
    resultTitle.textContent = top > 0 ? "Time\u2019s Up!" : "Round Over";
    resultList.innerHTML = "";
    sorted.forEach(function (p, rank) {
      var row = document.createElement("div");
      row.className = "rank-row" + (rank === 0 && top > 0 ? " winner" : "");
      var rk = document.createElement("span");
      rk.className = "rk"; rk.textContent = rank + 1;
      var nm = document.createElement("span");
      nm.className = "nm"; nm.style.color = p.color; nm.textContent = p.name;
      var dt = document.createElement("span");
      dt.className = "dt";
      dt.innerHTML = "<b>" + p.score + "</b> pts &middot; streak " + p.bestStreak +
        " &middot; " + p.passes + "/" + (p.passes + p.misses);
      row.appendChild(rk); row.appendChild(nm); row.appendChild(dt);
      resultList.appendChild(row);
    });
    resBest.textContent = stats.games + (stats.games === 1 ? " game" : " games") +
      " played &middot; best " + bestKey + ": " + bestFor();
    showScreen("result");
  }

  // ---------------- draw ----------------
  function draw() {
    ctx.clearRect(0, 0, cw, ch);
    drawBg();
    drawRings();
    drawGateArcs();
    drawTokens();
    drawCursors();
    drawFx();
    if (state === "paused") drawPaused();
    if (state === "play" && goFlash > 0) drawGo();
  }

  function drawBg() {
    var g = ctx.createRadialGradient(cx, cy, 8, cx, cy, R + 40);
    g.addColorStop(0, "rgba(70,110,160,0.28)");
    g.addColorStop(0.55, "rgba(18,30,52,0.25)");
    g.addColorStop(1, "rgba(6,10,18,0.9)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // center glow
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
    cg.addColorStop(0, "rgba(255,255,255,0.9)");
    cg.addColorStop(0.25, "rgba(180,210,255,0.45)");
    cg.addColorStop(1, "rgba(120,160,220,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRings() {
    // slow decorative rotation of the outer ring ticks ("moving gates" feel)
    var rot = gameTime * 0.3;
    ctx.strokeStyle = "#24364f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(90,120,160,0.35)";
    ctx.beginPath();
    for (var k = 0; k < 36; k++) {
      var a = rot + (k / 36) * Math.PI * 2;
      var p1 = polar(a, R - 5);
      var p2 = polar(a, R + 5);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // per-player cursor orbit rings
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function drawGateArcs() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var g = gateAngle(p, gameTime);
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 11;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, R, g - ARC_HALF, g + ARC_HALF);
      ctx.stroke();
      // bright center tick of the gate
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, R, g - 0.05, g + 0.05);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTokens() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var tok = p.token;
      if (!tok) continue;
      var prog = Math.min(tok.t / tok.tt, 1);
      var rad = R * prog;
      var pt = polar(tok.a, rad);

      // faint path
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // aim tick on the ring
      var tickPt = polar(tok.a, R + 14);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(tickPt.x, tickPt.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // token body with trail
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // trail behind the token
      var segs = 10;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var s = 1; s <= segs; s++) {
        var rr = rad - s * (rad / segs) - (1 - prog) * 30;
        if (rr < 6) break;
        var tp = polar(tok.a, rr);
        if (s === 1) ctx.moveTo(tp.x, tp.y);
        else ctx.lineTo(tp.x, tp.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawCursors() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var pt = polar(p.angle, p.r);
      // direction wedge
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, p.r, p.angle - 0.35, p.angle + 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // name label just outside cursor
      ctx.fillStyle = p.color;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      var lp = polar(p.angle, p.r + 16);
      ctx.globalAlpha = 0.85;
      ctx.fillText(p.name, lp.x, lp.y + 3.5);
      ctx.globalAlpha = 1;
    }
  }

  function drawFx() {
    // ring flash (miss)
    if (ringFlash) {
      var a = ringFlash.a;
      var prog = ringFlash.t / 0.45;
      ctx.strokeStyle = ringFlash.color;
      ctx.globalAlpha = 1 - prog;
      ctx.lineWidth = 3 + prog * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a - 0.5 - prog * 0.4, a + 0.5 + prog * 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // particles
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i];
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // popups
    for (var j = 0; j < popups.length; j++) {
      var p = popups[j];
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9);
      ctx.fillStyle = p.color;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawGo() {
    ctx.fillStyle = "#7dff8a";
    ctx.font = "bold 64px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#7dff8a";
    ctx.shadowBlur = 30;
    ctx.fillText("GO!", cx, cy + 20);
    ctx.shadowBlur = 0;
  }

  function drawPaused() {
    ctx.fillStyle = "rgba(5,8,14,0.72)";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#ffd94a";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", cx, cy - 8);
    ctx.fillStyle = "#cfe0ff";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Press P to resume", cx, cy + 26);
  }

  // ---------------- main loop ----------------
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ---------------- input ----------------
  var KEYMAP = [
    { left: "KeyA", right: "KeyD" },
    { left: "ArrowLeft", right: "ArrowRight" },
    { left: "KeyJ", right: "KeyL" },
    { left: "Digit1", right: "Digit2" }
  ];

  window.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    var code = e.code;
    if (state === "menu") {
      if (code === "Digit2" || code === "Digit3" || code === "Digit4") {
        selectPlayers(parseInt(code.slice(5), 10));
      } else if (code === "Digit6" || code === "Digit7" || code === "Digit8") {
        var tmap = { "Digit6": 60, "Digit7": 90, "Digit8": 120 };
        selectTime(tmap[code]);
      } else if (code === "Enter") {
        e.preventDefault();
        start();
      } else if (code === "KeyM") {
        setMuted(!muted);
      }
      return;
    }
    if (state === "countdown" || state === "play" || state === "paused") {
      var i;
      for (i = 0; i < KEYMAP.length; i++) {
        if (i >= players.length) break;
        if (code === KEYMAP[i].left) { e.preventDefault(); players[i].left = true; }
        if (code === KEYMAP[i].right) { e.preventDefault(); players[i].right = true; }
      }
      if (code === "KeyP") {
        e.preventDefault();
        if (state === "play") state = "paused";
        else if (state === "paused") state = "play";
      } else if (code === "KeyM") {
        setMuted(!muted);
      } else if (code === "Escape") {
        e.preventDefault();
        toMenu();
      }
      return;
    }
    if (state === "result") {
      if (code === "Enter" || code === "KeyR") {
        e.preventDefault();
        startRound();
      } else if (code === "Escape") {
        e.preventDefault();
        toMenu();
      }
    }
  });

  window.addEventListener("keyup", function (e) {
    var i;
    for (i = 0; i < KEYMAP.length; i++) {
      if (i >= players.length) break;
      if (e.code === KEYMAP[i].left) players[i].left = false;
      if (e.code === KEYMAP[i].right) players[i].right = false;
    }
  });

  // ---------------- menu controls ----------------
  function selectPlayers(n) {
    playerCount = n;
    playerSegs.forEach(function (el) {
      el.classList.toggle("active", parseInt(el.getAttribute("data-players"), 10) === n);
    });
    bestKey = playerCount + "p" + roundTime;
    $("menuBest").textContent = bestFor();
  }
  function selectTime(s) {
    roundTime = s;
    timeSegs.forEach(function (el) {
      el.classList.toggle("active", parseInt(el.getAttribute("data-time"), 10) === s);
    });
    bestKey = playerCount + "p" + roundTime;
    $("menuBest").textContent = bestFor();
  }

  playerSegs.forEach(function (el) {
    el.addEventListener("click", function () {
      selectPlayers(parseInt(el.getAttribute("data-players"), 10));
    });
  });
  timeSegs.forEach(function (el) {
    el.addEventListener("click", function () {
      selectTime(parseInt(el.getAttribute("data-time"), 10));
    });
  });

  startBtn.addEventListener("click", function () { ensureAudio(); start(); });
  againBtn.addEventListener("click", function () { ensureAudio(); startRound(); });
  menuBtn.addEventListener("click", toMenu);
  pauseBtn.addEventListener("click", function () {
    if (state === "play") state = "paused";
    else if (state === "paused") state = "play";
  });
  muteBtnMenu.addEventListener("click", function () { setMuted(!muted); });

  // ---------------- boot ----------------
  function start() {
    ensureAudio();
    if (state === "menu") startRound();
  }

  loadStats();
  setMuted(muted);
  selectPlayers(playerCount);
  selectTime(roundTime);
  showScreen("menu");
  window.addEventListener("resize", function () { if (state === "play" || state === "paused") layout(); });
  layout();
  requestAnimationFrame(loop);
})();
