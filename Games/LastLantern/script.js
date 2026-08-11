(function () {
  "use strict";

  // ---------------------------------------------------------------- canvas
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width,
    H = canvas.height;
  var CX = W / 2,
    CY = H / 2;
  var AR = 282; // arena radius
  var PI2 = Math.PI * 2;

  // Lighting buffer: darkness with light-pool holes punched out.
  var lx = document.createElement("canvas");
  lx.width = W;
  lx.height = H;
  var lctx = lx.getContext("2d");

  // Pre-rendered static layers (no per-frame gradient/shadow cost).
  // Canvas elements are created here; contents are baked after stars init.
  var bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  var vig = document.createElement("canvas");
  vig.width = W;
  vig.height = H;
  // Soft gold glow used to mark the safe zone (scaled each frame).
  var glowSpr = document.createElement("canvas");
  glowSpr.width = 256;
  glowSpr.height = 256;

  // ------------------------------------------------------------------ HUD
  var statsEl = document.getElementById("stats");
  var hintEl = document.getElementById("hint");

  // ----------------------------------------------------------------- math
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return 1 - Math.pow(1 - t, 2); }
  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // -------------------------------------------------------------- config
  var MATCH_T = 90;        // seconds
  var SAFE0 = 198;         // starting safe radius
  var SAFE1 = 78;          // final safe radius
  var SHRINK_START = 8;    // seconds before shrink begins
  var PLAYER_R = 11;
  var SPEED = 175;
  var DASH_SPEED = 330;
  var DASH_T = 0.22;
  var DASH_CD = 2.4;
  var BASE_LIGHT = 96;
  var BOOST_T = 5;
  var BOOST_MULT = 1.55;
  var DIM_T = 2.6;
  var DIM_MULT = 0.42;
  var OUT_MULT = 0.45;
  var OUT_DPS = 6;
  var HP = 3;
  var SPARK_VALUE = 10;
  var MAX_SPARKS = 6;
  var SPARK_SPAWN = 2.2;

  var PALETTE = [
    { c: "#ffb347", glow: "255,179,71", name: "P1" },
    { c: "#4dd2ff", glow: "77,210,255", name: "P2" },
    { c: "#9dff5e", glow: "157,255,94", name: "P3" },
    { c: "#c58cff", glow: "197,140,255", name: "P4" }
  ];

  var CTRL = [
    { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", dash: "KeyQ" },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", dash: "Slash" },
    { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", dash: "KeyU" },
    { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", dash: "Numpad0" }
  ];

  // ---------------------------------------------------------------- state
  var state = "setup"; // setup | countdown | play | end
  var numPlayers = 2;
  var players = [];
  var sparks = [];
  var parts = [];
  var flashes = [];
  var stars = [];
  var elapsed = 0;
  var countdown = 0;
  var last = 0;
  var spawnT = 1.2;
  var shake = 0;
  var roundSeed = 0; // changes every round so preview idles

  var keys = {};       // active key codes
  var joy = [];        // touch joystick vectors per player
  var dashQueued = []; // dash request flags

  // ------------------------------------------------------------ audio (all synthesized locally)
  var actx = null;
  function audio() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, delay) {
    var a = audio();
    if (!a) return;
    try {
      var t = a.currentTime + (delay || 0);
      var o = a.createOscillator();
      var g = a.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function sfxPickup() { tone(880, 0.08, "sine", 0.07); tone(1318, 0.12, "sine", 0.06, 0.06); }
  function sfxClash() { tone(170, 0.16, "triangle", 0.11); }
  function sfxExtinguish() { tone(320, 0.05, "square", 0.06); tone(220, 0.06, "square", 0.06, 0.05); tone(130, 0.16, "square", 0.07, 0.11); }
  function sfxTick() { tone(660, 0.06, "sine", 0.06); }
  function sfxGo() { tone(880, 0.16, "sine", 0.08); tone(1320, 0.18, "sine", 0.06, 0.08); }
  function sfxEnd() { tone(440, 0.16, "triangle", 0.08); tone(550, 0.16, "triangle", 0.08, 0.14); tone(660, 0.22, "triangle", 0.09, 0.28); }

  // ---------------------------------------------------------------- stars
  (function initStars() {
    for (var i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        p: Math.random() * PI2
      });
    }
  })();

  // ------------------------------------------------- pre-render layers
  // Background + stars are static; bake them once instead of per-frame.
  (function () {
    var c = bg.getContext("2d");
    var g = c.createRadialGradient(CX, CY, 40, CX, CY, AR + 120);
    g.addColorStop(0, "#0b1428");
    g.addColorStop(1, "#04060d");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      c.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(7 + s.p));
      c.fillStyle = "#cdd7ff";
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, PI2);
      c.fill();
    }
    c.globalAlpha = 1;
  })();

  (function () {
    var c = vig.getContext("2d");
    var g = c.createRadialGradient(CX, CY, AR * 0.7, CX, CY, AR * 1.35);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  })();

  (function () {
    var c = glowSpr.getContext("2d");
    var g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,217,74,0.55)");
    g.addColorStop(0.55, "rgba(255,217,74,0.16)");
    g.addColorStop(1, "rgba(255,217,74,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  })();

  // ------------------------------------------------------------ particles
  function emit(x, y, color, n, spd, life, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * PI2;
      var s = spd * (0.3 + Math.random() * 0.7);
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.5),
        max: life,
        color: color,
        size: size * (0.6 + Math.random() * 0.8)
      });
    }
  }
  function addFlash(x, y, r, color) {
    flashes.push({ x: x, y: y, r: r, t: 1, color: color });
  }

  // ----------------------------------------------------------------- game
  function buildMatch(n) {
    numPlayers = n;
    roundSeed = (roundSeed + 1) % 1000;
    players = [];
    sparks = [];
    parts = [];
    flashes = [];
    elapsed = 0;
    spawnT = 1.0;
    shake = 0;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * PI2 + roundSeed;
      var rr = SAFE0 * 0.45;
      var p = {
        id: i,
        name: PALETTE[i].name,
        color: PALETTE[i].c,
        glow: PALETTE[i].glow,
        x: CX + Math.cos(a) * rr,
        y: CY + Math.sin(a) * rr,
        vx: 0, vy: 0,
        fx: 0, fy: 0,          // facing
        hp: HP,
        score: 0,
        alive: true,
        respawnT: 0,
        boostT: 0,
        dimT: 0,
        dashT: 0,
        dashCd: 0,
        clashCd: 0,
        knockT: 0,
        flashT: 0,
        trailT: 0
      };
      players.push(p);
    }
    for (var k = 0; k < 3; k++) spawnSpark(true);
    drawStats();
    countdown = 3.2;
    state = "countdown";
    sfxTick();
  }

  function restartMatch() { buildMatch(numPlayers); }

  function safeRadius() {
    if (state !== "play") return SAFE0;
    var t = elapsed - SHRINK_START;
    if (t <= 0) return SAFE0;
    var k = clamp(t / (MATCH_T - SHRINK_START), 0, 1);
    return lerp(SAFE0, SAFE1, ease(k));
  }

  function effLight(p, safeR) {
    var r = BASE_LIGHT;
    if (p.boostT > 0) r *= BOOST_MULT;
    if (p.dashT > 0) r *= 1.2;
    if (p.dimT > 0) r *= DIM_MULT;
    if (p.alive && dist(p.x, p.y, CX, CY) > safeR) r *= OUT_MULT;
    return r;
  }

  function spawnSpark(instant) {
    var safeR = safeRadius();
    for (var i = 0; i < 6 && sparks.length < MAX_SPARKS; i++) {
      var a = Math.random() * PI2;
      var rr = Math.sqrt(Math.random()) * Math.max(20, safeR - 16);
      sparks.push({
        x: CX + Math.cos(a) * rr,
        y: CY + Math.sin(a) * rr,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        p: Math.random() * PI2
      });
    }
    if (!instant && sparks.length > 0) {
      // keep cap in check
    }
    if (instant) return;
  }

  function movePlayer(p, dt, safeR) {
    var mx = 0, my = 0;
    var k = CTRL[p.id];
    if (keys[k.right]) mx += 1;
    if (keys[k.left]) mx -= 1;
    if (keys[k.down]) my += 1;
    if (keys[k.up]) my -= 1;
    var jx = joy[p.id] ? joy[p.id].x : 0;
    var jy = joy[p.id] ? joy[p.id].y : 0;
    mx += jx;
    my += jy;
    var len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }

    // dash
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (dashQueued[p.id]) {
      dashQueued[p.id] = false;
      if (p.dashCd <= 0) {
        p.dashT = DASH_T;
        p.dashCd = DASH_CD;
        p.flashT = 0.5;
        var dx = len > 0.05 ? mx / len : (p.fx || 1);
        var dy = len > 0.05 ? my / len : (p.fy || 0);
        p.fx = dx; p.fy = dy;
        emit(p.x, p.y, PALETTE[p.id].c, 8, 140, 0.4, 2.5);
      }
    }
    p.dashT = Math.max(0, p.dashT - dt);

    // knockback / respawn stun
    p.knockT = Math.max(0, p.knockT - dt);

    var sp = SPEED * (p.boostT > 0 ? 1.25 : 1);
    var ax = mx, ay = my;
    if (p.dashT > 0) {
      sp = DASH_SPEED;
      ax = p.fx; ay = p.fy;
    }
    if (p.knockT > 0) {
      ax = p.vx * 0.15; ay = p.vy * 0.15;
      sp = 60;
    }
    p.vx = ax * sp;
    p.vy = ay * sp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // dash spark trail
    if (p.dashT > 0) {
      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.03;
        emit(p.x, p.y, PALETTE[p.id].c, 1, 20, 0.35, 2);
      }
    }

    // keep inside the arena circle
    var d = dist(p.x, p.y, CX, CY);
    var maxR = AR - PLAYER_R;
    if (d > maxR) {
      var nx = (p.x - CX) / (d || 1);
      var ny = (p.y - CY) / (d || 1);
      p.x = CX + nx * maxR;
      p.y = CY + ny * maxR;
      var rv = p.vx * nx + p.vy * ny;
      if (rv > 0) { p.vx -= rv * nx; p.vy -= rv * ny; }
    }

    // shrinking safe zone
    if (p.alive && d > safeR) {
      var dn = d > 0.001 ? (p.x - CX) / d : 0;
      var dy = d > 0.001 ? (p.y - CY) / d : 0;
      p.hp -= OUT_DPS * dt;
      if (Math.random() < dt * 6) emit(p.x, p.y, "#ff6b6b", 1, 40, 0.3, 1.8);
      // gentle push back into the light
      var deep = clamp(d - safeR, 0, 60);
      p.x -= dn * (24 + deep * 2.4) * dt;
      p.y -= dy * (24 + deep * 2.4) * dt;
      if (p.hp <= 0) extinguish(p);
    }

    // timers
    p.boostT = Math.max(0, p.boostT - dt);
    p.dimT = Math.max(0, p.dimT - dt);
    p.flashT = Math.max(0, p.flashT - dt);
    p.clashCd = Math.max(0, p.clashCd - dt);
  }

  function extinguish(p) {
    p.hp = 0;
    p.alive = false;
    p.respawnT = 3;
    p.dashT = 0;
    p.dimT = 0;
    addFlash(p.x, p.y, 90, PALETTE[p.id].c);
    emit(p.x, p.y, PALETTE[p.id].c, 26, 220, 0.8, 3);
    sfxExtinguish();
  }

  function respawn(p, safeR) {
    p.hp = HP;
    p.alive = true;
    var a = Math.random() * PI2;
    var rr = Math.max(14, Math.random() * Math.max(20, safeR - 24));
    p.x = CX + Math.cos(a) * rr;
    p.y = CY + Math.sin(a) * rr;
    p.vx = 0; p.vy = 0;
    p.clashCd = 1.2;
    addFlash(p.x, p.y, 50, PALETTE[p.id].c);
  }

  function clashPair(a, b) {
    var d = dist(a.x, a.y, b.x, b.y);
    var minD = PLAYER_R * 2;
    if (d >= minD) return;
    var nx = d > 0.001 ? (b.x - a.x) / d : (Math.random() - 0.5);
    var ny = d > 0.001 ? (b.y - a.y) / d : (Math.random() - 0.5);
    var overlap = (minD - d) * 0.5;

    // separate hard so they don't jitter on top of each other
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;

    if (a.clashCd > 0 || b.clashCd > 0) return;

    var la = effLight(a, safeRadius());
    var lb = effLight(b, safeRadius());
    var hi = la > lb ? a : b;
    var lo = la > lb ? b : a;
    var big = Math.max(la, lb), small = Math.min(la, lb);

    if (big > small * 1.12) {
      // brighter lantern overwhelms the dimmer one
      lo.hp -= 1;
      lo.dimT = DIM_T;
      lo.knockT = 0.5;
      lo.vx = nx * 330;
      lo.vy = ny * 330;
      hi.score += 15;
      addFlash(nx * 40 + a.x, ny * 40 + a.y, 60, PALETTE[hi.id].c);
      emit(a.x, a.y, "#ffffff", 10, 160, 0.5, 2.2);
      sfxClash();
      if (lo.hp <= 0) {
        lo.hp = 0;
        extinguish(lo);
        hi.score += 25;
      }
      a.clashCd = 2.2;
      b.clashCd = 2.2;
      shake = Math.min(10, shake + 5);
    } else {
      // equal lights: just a jostle in the dark
      a.vx = -nx * 90; a.vy = -ny * 90;
      b.vx = nx * 90; b.vy = ny * 90;
      a.clashCd = 0.8;
      b.clashCd = 0.8;
    }
    drawStats();
  }

  function updateSparks(dt, safeR) {
    spawnT -= dt;
    if (spawnT <= 0 && sparks.length < MAX_SPARKS) {
      spawnSpark(false);
      spawnT = SPARK_SPAWN;
    }
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.p += dt * 3;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      var d = dist(s.x, s.y, CX, CY);
      if (d > AR - 14) {
        s.x = CX + (s.x - CX) / d * (AR - 14);
        s.y = CY + (s.y - CY) / d * (AR - 14);
        s.vx = -s.vx * 0.6;
        s.vy = -s.vy * 0.6;
      }
      // pickups
      for (var j = 0; j < players.length; j++) {
        var p = players[j];
        if (!p.alive) continue;
        if (dist(p.x, p.y, s.x, s.y) < 24) {
          p.score += SPARK_VALUE;
          p.boostT = BOOST_T;
          emit(s.x, s.y, "#ffd94a", 14, 150, 0.6, 2.5);
          addFlash(s.x, s.y, 42, "#ffd94a");
          sfxPickup();
          sparks.splice(i, 1);
          drawStats();
          break;
        }
      }
    }
  }

  function update(dt) {
    var safeR = safeRadius();
    if (state === "countdown") {
      countdown -= dt;
      if (countdown <= 0) {
        state = "play";
        sfxGo();
      }
      // players still idle around during countdown
      for (var i = 0; i < players.length; i++) idlePlayer(players[i], dt);
      updateAmbient(dt);
      drawStats();
      return;
    }
    if (state !== "play") {
      updateAmbient(dt);
      return;
    }

    elapsed += dt;

    // respawns
    for (var j = 0; j < players.length; j++) {
      var p = players[j];
      if (!p.alive) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) respawn(p, safeR);
      }
    }

    // movement
    for (var k = 0; k < players.length; k++) {
      if (players[k].alive) movePlayer(players[k], dt, safeR);
    }

    // clashes
    for (var a = 0; a < players.length; a++) {
      for (var b = a + 1; b < players.length; b++) {
        if (players[a].alive && players[b].alive) clashPair(players[a], players[b]);
      }
    }

    updateSparks(dt, safeR);

    // particles
    for (var n = parts.length - 1; n >= 0; n--) {
      var q = parts[n];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.98;
      q.vy *= 0.98;
      if (q.life <= 0) parts.splice(n, 1);
    }
    for (var m = flashes.length - 1; m >= 0; m--) {
      flashes[m].t -= dt * 2.2;
      if (flashes[m].t <= 0) flashes.splice(m, 1);
    }
    shake = Math.max(0, shake - dt * 24);
    drawStats();

    if (elapsed >= MATCH_T) {
      state = "end";
      sfxEnd();
    }
  }

  // Gentle wandering so the preview never looks frozen.
  function idlePlayer(p, dt) {
    if (Math.random() < dt * 0.8) {
      p.fx = (Math.random() - 0.5) * 2;
      p.fy = (Math.random() - 0.5) * 2;
    }
    p.x += p.fx * 22 * dt;
    p.y += p.fy * 22 * dt;
    var d = dist(p.x, p.y, CX, CY);
    if (d > SAFE0 * 0.7) {
      p.x = CX + (p.x - CX) / d * SAFE0 * 0.7;
      p.y = CY + (p.y - CY) / d * SAFE0 * 0.7;
    }
  }

  function updateAmbient(dt) {
    // spark drift + pulses during setup
    for (var i = 0; i < sparks.length; i++) {
      sparks[i].p += dt * 3;
    }
    for (var n = parts.length - 1; n >= 0; n--) {
      var q = parts[n];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.life <= 0) parts.splice(n, 1);
    }
    for (var m = flashes.length - 1; m >= 0; m--) {
      flashes[m].t -= dt * 2.2;
      if (flashes[m].t <= 0) flashes.splice(m, 1);
    }
  }

  // ---------------------------------------------------------------- draw
  var twinkleStars = stars.slice(0, 16);

  function drawBackground(t) {
    ctx.drawImage(bg, 0, 0);
    // a handful of stars twinkle on top
    for (var i = 0; i < twinkleStars.length; i++) {
      var s = twinkleStars[i];
      ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2 + s.p));
      ctx.fillStyle = "#cdd7ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawArena(t) {
    // arena ring
    ctx.strokeStyle = "rgba(110,130,190,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, AR, 0, PI2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(110,130,190,0.12)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(CX, CY, AR - 4, 0, PI2);
    ctx.stroke();

    // safe zone: cached soft glow + bright ring
    var safeR = safeRadius();
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(t * 4);
    ctx.drawImage(glowSpr, CX - safeR - 8, CY - safeR - 8, safeR * 2 + 16, safeR * 2 + 16);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,217,74,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CX, CY, safeR, 0, PI2);
    ctx.stroke();

    // timer arc
    var frac = 1;
    if (state === "play" || state === "end") frac = clamp(elapsed / MATCH_T, 0, 1);
    ctx.lineWidth = 4;
    ctx.strokeStyle = elapsed > MATCH_T - 15 && state === "play" ? "#ff6b6b" : "#ffd94a";
    ctx.beginPath();
    ctx.arc(CX, CY, AR + 13, -Math.PI / 2, -Math.PI / 2 + PI2 * (1 - frac));
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(CX, CY, AR + 13, -Math.PI / 2 + PI2 * (1 - frac), -Math.PI / 2 + PI2);
    ctx.stroke();
  }

  function drawSparks() {
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      var fl = 0.75 + 0.25 * Math.sin(s.p * 2);
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 10);
      g.addColorStop(0, "rgba(255,240,170,0.95)");
      g.addColorStop(0.5, "rgba(255,217,74," + (0.5 * fl) + ")");
      g.addColorStop(1, "rgba(255,217,74,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10, 0, PI2);
      ctx.fill();
      ctx.fillStyle = "#fff7d6";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, PI2);
      ctx.fill();
    }
  }

  function drawPlayerBody(p, t) {
    if (!p.alive) return;
    // halo glow baked in by lighting pass; here the lantern body
    var flick = 0.85 + 0.15 * Math.sin(t * 13 + p.id * 2.4);
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, PLAYER_R * 2.1);
    g.addColorStop(0, "rgba(" + p.glow + ",0.55)");
    g.addColorStop(1, "rgba(" + p.glow + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R * 2.1, 0, PI2);
    ctx.fill();

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R, 0, PI2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, 3.4 * flick, 0, PI2);
    ctx.fill();

    if (p.boostT > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,217,74,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R + 7, 0, PI2);
      ctx.stroke();
      ctx.restore();
    }
    // hp pips
    for (var i = 0; i < HP; i++) {
      ctx.fillStyle = i < p.hp ? p.color : "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(p.x - (HP - 1) * 4 + i * 8, p.y + PLAYER_R + 9, 2.6, 0, PI2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i];
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlashes() {
    for (var i = 0; i < flashes.length; i++) {
      var f = flashes[i];
      ctx.globalAlpha = clamp(f.t, 0, 1) * 0.8;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - f.t), 0, PI2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function lighting(t) {
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = "rgba(3,5,13,0.93)";
    lctx.fillRect(0, 0, W, H);

    lctx.globalCompositeOperation = "destination-out";
    // ambient glimmer at the arena so players always know the bounds
    var ag = lctx.createRadialGradient(CX, CY, 0, CX, CY, AR);
    ag.addColorStop(0, "rgba(0,0,0,0.20)");
    ag.addColorStop(0.85, "rgba(0,0,0,0.20)");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = ag;
    lctx.beginPath();
    lctx.arc(CX, CY, AR, 0, PI2);
    lctx.fill();

    // player light pools
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (!p.alive) continue;
      var R = effLight(p, safeRadius());
      if (R <= 0) continue;
      var g = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.55, "rgba(0,0,0,0.92)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(p.x, p.y, R, 0, PI2);
      lctx.fill();
    }

    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(lx, 0, 0);
  }

  // Things you can faintly make out even in the dark.
  function drawAfterGlow(t) {
    // safe ring glows through the dark
    var safeR = safeRadius();
    ctx.strokeStyle = "rgba(255,217,74,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, safeR, 0, PI2);
    ctx.stroke();

    // sparks are visible as faint embers from anywhere
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(s.p * 2);
      ctx.fillStyle = "#ffd94a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // extinguished lanterns leave a dying ember
    for (var j = 0; j < players.length; j++) {
      var p = players[j];
      if (p.alive) continue;
      var tw = 0.4 + 0.3 * Math.sin(t * 6 + p.id);
      ctx.globalAlpha = tw;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // pickup flashes echo across the arena
    drawFlashes();
  }

  function vignette() {
    ctx.drawImage(vig, 0, 0);
  }

  function overlayDark() {
    ctx.fillStyle = "rgba(4,6,14,0.82)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawCountdown() {
    overlayDark();
    ctx.textAlign = "center";
    var n = Math.ceil(countdown);
    if (n > 3) n = 3;
    ctx.fillStyle = "#ffd94a";
    ctx.font = "bold 84px system-ui, sans-serif";
    ctx.fillText(String(n), CX, CY + 12);
    ctx.fillStyle = "#9aa5c8";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Get your lantern ready", CX, CY + 56);
  }

  function drawEnd() {
    overlayDark();
    var sorted = players.slice().sort(function (a, b) {
      return b.score - a.score;
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd94a";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText("LAST LANTERN", CX, CY - 120);
    ctx.fillStyle = "#cdd7ff";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("The arena dims. The score stands.", CX, CY - 92);

    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var y = CY - 46 + i * 40;
      ctx.fillStyle = p.color;
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText((i + 1) + ". " + p.name, CX - 60, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText(String(p.score), CX + 60, y);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("lanterns " + "x".repeat(Math.max(0, p.hp)), CX + 150, y);
    }
    ctx.fillStyle = "#9aa5c8";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("Press R or tap PLAYER COUNT to run it back", CX, CY + 140);
  }

  function drawSetup(t) {
    // hint text drawn above the dim arena
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(4,6,14,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffd94a";
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.fillText("LAST LANTERN", CX, CY - 70);
    ctx.fillStyle = "#cdd7ff";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("Carry the light. Feed on sparks. Dodge the dark.", CX, CY - 32);
    ctx.fillStyle = "#7f8db3";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("The safe zone shrinks - stay lit, out-light rivals, bank sparks", CX, CY + 150);
    ctx.fillStyle = "#ffd94a";
    ctx.font = "bold 19px system-ui, sans-serif";
    ctx.fillText("Choose a player count above to begin", CX, CY + 182);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawBackground(t);
    drawArena(t);
    drawSparks();
    for (var i = 0; i < players.length; i++) drawPlayerBody(players[i], t);
    drawParticles();
    lighting(t);
    drawAfterGlow(t);
    vignette();

    ctx.restore();

    if (state === "countdown") drawCountdown();
    else if (state === "end") drawEnd();
    else if (state === "setup") drawSetup(t);

    // respawn progress rings (bright, drawn above darkness)
    for (var j = 0; j < players.length; j++) {
      var p = players[j];
      if (p.alive) continue;
      var prog = clamp(1 - p.respawnT / 3, 0, 1);
      ctx.strokeStyle = "rgba(" + p.glow + ",0.7)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, -Math.PI / 2, -Math.PI / 2 + PI2 * prog);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- HUD
  function drawStats() {
    var html = "";
    if (state === "setup") {
      html = '<span class="timer">' + numPlayers + " players</span>";
    } else {
      var sec = Math.max(0, MATCH_T - elapsed);
      var mm = Math.floor(sec / 60);
      var ss = Math.floor(sec % 60);
      var low = sec <= 15 ? " low" : "";
      html = '<span class="timer' + low + '">' + mm + ":" + (ss < 10 ? "0" : "") + ss + "</span>";
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var hpx = "";
        for (var k = 0; k < HP; k++) {
          hpx += '<span class="' + (k < p.hp ? "" : "dead") + '">&#9679;</span>';
        }
        html += '<span class="p" style="border-color:' + p.color + '55">' +
          '<span class="dot" style="background:' + p.color + ";color:" + p.color + '"></span>' +
          p.name + ' <b style="color:' + p.color + '">' + p.score + "</b>" +
          '<span class="hp"> ' + hpx + "</span></span>";
      }
    }
    statsEl.innerHTML = html;
  }

  // ------------------------------------------------------------ main loop
  function loop(t) {
    // dt is wall-clock based so the sim tracks real time at any frame rate;
    // the clamp only guards against absurd gaps (tab switches, stalls).
    var now = performance.now();
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    draw(t / 1000);
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- input
  window.addEventListener("keydown", function (e) {
    audio();
    var c = e.code;
    keys[c] = true;

    if (state === "setup") {
      if (c === "Digit2" || c === "Numpad2") { e.preventDefault(); buildMatch(2); return; }
      if (c === "Digit3" || c === "Numpad3") { e.preventDefault(); buildMatch(3); return; }
      if (c === "Digit4" || c === "Numpad4") { e.preventDefault(); buildMatch(4); return; }
      if (c === "Space" || c === "Enter") { e.preventDefault(); buildMatch(numPlayers); return; }
    } else if (state === "play" || state === "countdown" || state === "end") {
      if (c === "KeyR") { e.preventDefault(); restartMatch(); return; }
      if (c === "Escape") { e.preventDefault(); toMenu(); return; }
    }

    // dash requests (ignore key auto-repeat)
    if (!e.repeat) {
      for (var i = 0; i < numPlayers; i++) {
        if (c === CTRL[i].dash) dashQueued[i] = true;
      }
    }
    if (c === "Space" || c === "ArrowUp" || c === "ArrowDown" || c === "ArrowLeft" || c === "ArrowRight") {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    keys[e.code] = false;
  });
  window.addEventListener("blur", function () {
    keys = {};
  });

  function toMenu() {
    state = "setup";
    players = [];
    sparks = [];
    parts = [];
    flashes = [];
    for (var i = 0; i < MAX_SPARKS; i++) spawnSpark(true);
    // seed some embers for the preview
    parts.push({ x: CX, y: CY, vx: 0, vy: 0, life: 99, max: 99, color: "#ffd94a", size: 2 });
    drawStats();
  }

  // --------------------------------------------------------- UI buttons
  function bindButton(id, fn) {
    var el = document.getElementById(id);
    el.addEventListener("click", function (e) {
      e.preventDefault();
      audio();
      fn();
    });
    el.addEventListener("touchstart", function (e) {
      e.preventDefault();
      audio();
      fn();
    }, { passive: false });
  }
  bindButton("btn2", function () { buildMatch(2); });
  bindButton("btn3", function () { buildMatch(3); });
  bindButton("btn4", function () { buildMatch(4); });
  bindButton("restartBtn", function () { restartMatch(); });
  bindButton("menuBtn", function () { toMenu(); });

  canvas.addEventListener("pointerdown", function () {
    audio();
    if (state === "setup") buildMatch(numPlayers);
  });

  // --------------------------------------------------------- touch pads
  function makeTouch() {
    var touchBox = document.getElementById("touch");
    var defs = [
      { i: 0, pad: { left: "8px", bottom: "8px" }, dash: { left: "112px", bottom: "42px" } },
      { i: 1, pad: { right: "8px", bottom: "8px" }, dash: { right: "112px", bottom: "42px" } },
      { i: 2, pad: { left: "8px", top: "8px" }, dash: { left: "112px", top: "42px" } },
      { i: 3, pad: { right: "8px", top: "8px" }, dash: { right: "112px", top: "42px" } }
    ];
    for (var n = 0; n < 4; n++) {
      var d = defs[n];
      var pad = document.createElement("div");
      pad.className = "jpad p" + d.i;
      pad.style.left = d.pad.left;
      pad.style.bottom = d.pad.bottom;
      pad.style.top = d.pad.top;
      pad.style.right = d.pad.right;
      var knob = document.createElement("div");
      knob.className = "knob";
      pad.appendChild(knob);
      touchBox.appendChild(pad);

      var dash = document.createElement("div");
      dash.className = "dbtn p" + d.i;
      dash.textContent = "DASH";
      dash.style.left = d.dash.left;
      dash.style.bottom = d.dash.bottom;
      dash.style.top = d.dash.top;
      dash.style.right = d.dash.right;
      touchBox.appendChild(dash);

      joy.push({ x: 0, y: 0, pid: null });
      dashQueued.push(false);

      (function (p, k, i) {
        var active = false, sx = 0, sy = 0;
        function center() { return { x: p.offsetWidth / 2, y: p.offsetHeight / 2 }; }
        function apply(e) {
          var r = p.getBoundingClientRect();
          var c = center();
          var dx = e.clientX - r.left - c.x;
          var dy = e.clientY - r.top - c.y;
          var len = Math.sqrt(dx * dx + dy * dy);
          var max = c.x;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          knob.style.transform = "translate(" + dx + "px," + dy + "px)";
          joy[i].x = dx / max;
          joy[i].y = dy / max;
        }
        function reset() {
          active = false;
          knob.style.transform = "translate(0,0)";
          joy[i].x = 0;
          joy[i].y = 0;
        }
        p.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          audio();
          p.setPointerCapture(e.pointerId);
          active = true;
          apply(e);
        });
        p.addEventListener("pointermove", function (e) {
          if (active) apply(e);
        });
        p.addEventListener("pointerup", reset);
        p.addEventListener("pointercancel", reset);

        var held = false;
        dash.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          audio();
          held = true;
          dash.classList.add("held");
          dashQueued[i] = true;
        });
        dash.addEventListener("pointerup", function () {
          held = false;
          dash.classList.remove("held");
        });
        dash.addEventListener("pointercancel", function () {
          held = false;
          dash.classList.remove("held");
        });
      })(pad, knob, d.i);
    }
  }

  function enableTouch() {
    if (("ontouchstart" in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) {
      document.body.classList.add("touch-mode");
    }
  }

  // ------------------------------------------------------------------ go
  enableTouch();
  makeTouch();
  toMenu();
  requestAnimationFrame(loop);

  // TEMP-DEBUG-HOOK (removed before finalizing)
  window.__LL = {
    dump: function () {
      return {
        state: state,
        elapsed: elapsed,
        countdown: countdown,
        numPlayers: numPlayers,
        safeR: Math.round(safeRadius()),
        players: players.map(function (p) {
          return {
            name: p.name, x: Math.round(p.x), y: Math.round(p.y),
            hp: p.hp, score: p.score, alive: p.alive,
            boostT: +p.boostT.toFixed(2), dashT: +p.dashT.toFixed(2),
            dashCd: +p.dashCd.toFixed(2), respawnT: +p.respawnT.toFixed(2),
            clashCd: +p.clashCd.toFixed(2), dimT: +p.dimT.toFixed(2),
            light: Math.round(effLight(p, safeRadius()))
          };
        }),
        sparks: sparks.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y) }; })
      };
    },
    test: {
      setPos: function (i, x, y) {
        if (players[i]) { players[i].x = x; players[i].y = y; players[i].vx = 0; players[i].vy = 0; }
      },
      setBoost: function (i, t) { if (players[i]) players[i].boostT = t; },
      setDim: function (i, t) { if (players[i]) players[i].dimT = t; },
      sparkNear: function (i) {
        var p = players[i];
        if (!p) return;
        sparks.push({ x: p.x, y: p.y + 30, vx: 0, vy: 0, p: 0 });
      },
      clearCd: function (i) { if (players[i]) players[i].clashCd = 0; },
      setHp: function (i, hp) { if (players[i]) players[i].hp = hp; },
      forceEnd: function () { elapsed = MATCH_T; }
    }
  };
  // /TEMP-DEBUG-HOOK
})();
