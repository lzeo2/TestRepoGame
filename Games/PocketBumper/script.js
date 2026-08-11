(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var p1El = document.getElementById("p1score");
  var p2El = document.getElementById("p2score");
  var timerEl = document.getElementById("timer");
  var startBtn = document.getElementById("startBtn");

  var W = canvas.width;
  var H = canvas.height;

  // ---- tuning ----
  var MARGIN = 26;          // arena inset from canvas edge when full size
  var MIN_HALF = 108;       // arena half-size when fully shrunk
  var MATCH_TIME = 90;      // seconds
  var P_R = 15;             // bumper car radius
  var ORB_VALUE = 10;
  var ORB_METER = 25;
  var MAX_ORBS = 6;
  var JOY_R = 46;           // virtual joystick radius (canvas units)

  // state: start | play | over
  var state = "start";
  var time = 0;
  var last = 0;
  var shake = 0;
  var orbTimer = 0;

  var arena = { left: 0, top: 0, right: 0, bottom: 0 };

  var players = [];
  var orbs = [];
  var particles = [];
  var floats = [];

  var keys = {};
  var joy = [
    { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },
    { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 }
  ];

  var THEMES = [
    { body: "#3fd6ff", dark: "#1d7fa8" },
    { body: "#ffb83d", dark: "#b06a12" }
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function makePlayer(x, y, idx) {
    return {
      x: x, y: y, vx: 0, vy: 0, r: P_R,
      idx: idx, theme: THEMES[idx],
      score: 0, meter: 0, boost: 0,
      stun: 0, bumpCd: 0,
      angle: idx === 0 ? 0 : Math.PI
    };
  }

  function reset() {
    time = 0;
    orbTimer = 0.4;
    orbs = [];
    particles = [];
    floats = [];
    shake = 0;
    players = [
      makePlayer(W / 2 - 150, H / 2, 0),
      makePlayer(W / 2 + 150, H / 2, 1)
    ];
    updateArena();
    spawnOrb(4);
    state = "play";
    startBtn.textContent = "\u25B6 START";
    updateHud();
  }

  // ---- arena ----

  function updateArena() {
    var prog = clamp(time / MATCH_TIME, 0, 1);
    var ease = prog * prog; // slow first, accelerating shrink
    var cx = W / 2, cy = H / 2;
    var hw0 = (W - MARGIN * 2) / 2;
    var hh0 = (H - MARGIN * 2) / 2;
    var hw = lerp(hw0, MIN_HALF, ease);
    var hh = lerp(hh0, MIN_HALF, ease);
    arena.left = cx - hw;
    arena.right = cx + hw;
    arena.top = cy - hh;
    arena.bottom = cy + hh;
  }

  function spawnOrb(n) {
    var i, tries, x, y, ok;
    for (i = 0; i < n; i++) {
      if (orbs.length >= MAX_ORBS) break;
      tries = 0;
      do {
        x = arena.left + 18 + Math.random() * (arena.right - arena.left - 36);
        y = arena.top + 18 + Math.random() * (arena.bottom - arena.top - 36);
        ok = dist(x, y, players[0].x, players[0].y) > 60 &&
             dist(x, y, players[1].x, players[1].y) > 60;
        tries++;
      } while (!ok && tries < 12);
      orbs.push({ x: x, y: y, r: 7, phase: Math.random() * Math.PI * 2 });
    }
  }

  // ---- update ----

  function update(dt) {
    if (state !== "play") return;
    time += dt;
    updateArena();
    if (time >= MATCH_TIME) {
      time = MATCH_TIME;
      endMatch();
      return;
    }

    orbTimer -= dt;
    if (orbTimer <= 0) {
      orbTimer = 0.9;
      spawnOrb(1);
    }

    updatePlayer(players[0], dt);
    updatePlayer(players[1], dt);
    collideVehicles(players[0], players[1]);
    collectOrbs(dt);
    updateParticles(dt);
    updateHud();
  }

  function endMatch() {
    state = "over";
    startBtn.textContent = "\u21BB RESTART";
    var a = players[0].score, b = players[1].score;
    if (a === b) {
      addFloat(W / 2, H / 2 - 120, "DRAW!", "#ffffff", 30);
    } else {
      addFloat(W / 2, H / 2 - 120, (a > b ? "P1" : "P2") + " WINS!", a > b ? "#3fd6ff" : "#ffb83d", 30);
    }
    updateHud();
  }

  function getInput(p) {
    var ix = 0, iy = 0;
    if (p.idx === 0) {
      if (keys.KeyW) iy -= 1;
      if (keys.KeyS) iy += 1;
      if (keys.KeyA) ix -= 1;
      if (keys.KeyD) ix += 1;
    } else {
      if (keys.ArrowUp) iy -= 1;
      if (keys.ArrowDown) iy += 1;
      if (keys.ArrowLeft) ix -= 1;
      if (keys.ArrowRight) ix += 1;
    }
    var j = joy[p.idx];
    if (j.active) {
      ix += j.dx;
      iy += j.dy;
    }
    var l = Math.sqrt(ix * ix + iy * iy);
    if (l > 1) { ix /= l; iy /= l; }
    return { x: ix, y: iy };
  }

  function updatePlayer(p, dt) {
    var inp = getInput(p);
    var maxSpeed = p.boost > 0 ? 345 : 265;
    if (p.stun > 0) {
      p.stun -= dt;
      inp.x = 0;
      inp.y = 0;
    }
    p.vx += inp.x * 900 * dt;
    p.vy += inp.y * 900 * dt;
    var f = Math.max(0, 1 - 3.4 * dt);
    p.vx *= f;
    p.vy *= f;
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > maxSpeed) {
      p.vx *= maxSpeed / sp;
      p.vy *= maxSpeed / sp;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (sp > 20) p.angle = Math.atan2(p.vy, p.vx);
    if (p.bumpCd > 0) p.bumpCd -= dt;
    clampToArena(p);
  }

  function clampToArena(p) {
    var r = p.r;
    var nx = 0, ny = 0;
    if (p.x - r < arena.left) { nx = 1; p.x = arena.left + r; }
    else if (p.x + r > arena.right) { nx = -1; p.x = arena.right - r; }
    if (p.y - r < arena.top) { ny = 1; p.y = arena.top + r; }
    else if (p.y + r > arena.bottom) { ny = -1; p.y = arena.bottom - r; }
    if (nx || ny) {
      var dot = p.vx * nx + p.vy * ny;
      if (dot < 0) {
        p.vx -= dot * nx * 1.7; // bounce with 0.7 restitution
        p.vy -= dot * ny * 1.7;
      }
      if (p.stun <= 0) {
        p.stun = 0.4;
        burst(p.x - nx * r, p.y - ny * r, "#ffe14d", 7, 130);
        shake = Math.max(shake, 2);
      }
    }
  }

  function collideVehicles(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var minD = a.r + b.r;
    if (d >= minD) return;
    if (d < 0.001) { dx = 1; dy = 0; d = 1; }
    var nx = dx / d, ny = dy / d;
    var overlap = minD - d;
    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;

    var speedA = a.vx * nx + a.vy * ny;   // a toward b
    var speedB = -(b.vx * nx + b.vy * ny); // b toward a
    var closing = speedA + speedB;

    if (a.bumpCd > 0 || b.bumpCd > 0) {
      resolveElastic(a, b, nx, ny);
      return;
    }

    if (closing > 120 && (speedA > 35 || speedB > 35)) {
      var bumper = speedA >= speedB ? a : b;
      var loser = bumper === a ? b : a;
      var sign = bumper === a ? 1 : -1; // loser knocked along sign*n
      var superHit = bumper.boost > 0;
      var pts = superHit ? 10 : 5;
      bumper.score += pts;
      addFloat(loser.x, loser.y - 22, "+" + pts, superHit ? "#ffd94a" : "#ffffff", 15);
      loser.stun = Math.max(loser.stun, superHit ? 0.9 : 0.6);
      var knock = superHit ? 430 : 300;
      loser.vx = nx * sign * knock;
      loser.vy = ny * sign * knock;
      bumper.vx = -nx * sign * knock * 0.12;
      bumper.vy = -ny * sign * knock * 0.12;
      a.bumpCd = 0.55;
      b.bumpCd = 0.55;
      if (superHit) shake = Math.max(shake, 5);
      burst((a.x + b.x) / 2, (a.y + b.y) / 2, loser.theme.body, superHit ? 16 : 9, knock);
    } else {
      resolveElastic(a, b, nx, ny);
    }
  }

  function resolveElastic(a, b, nx, ny) {
    var e = 0.85;
    var vnA = a.vx * nx + a.vy * ny;
    var vnB = b.vx * nx + b.vy * ny;
    var vnA2 = ((1 - e) * vnA + (1 + e) * vnB) / 2;
    var vnB2 = ((1 + e) * vnA + (1 - e) * vnB) / 2;
    a.vx += (vnA2 - vnA) * nx;
    a.vy += (vnA2 - vnA) * ny;
    b.vx += (vnB2 - vnB) * nx;
    b.vy += (vnB2 - vnB) * ny;
  }

  function collectOrbs(dt) {
    var i, j, p, o;
    for (i = orbs.length - 1; i >= 0; i--) {
      o = orbs[i];
      for (j = 0; j < 2; j++) {
        p = players[j];
        if (dist(p.x, p.y, o.x, o.y) < p.r + o.r + 3) {
          p.score += ORB_VALUE;
          p.meter += ORB_METER;
          if (p.meter >= 100) {
            p.meter = 0;
            p.boost = 5;
            addFloat(p.x, p.y - 24, "BOOST!", "#ffd94a", 16);
          }
          addFloat(o.x, o.y - 14, "+" + ORB_VALUE, "#9dff8a", 14);
          burst(o.x, o.y, p.theme.body, 12, 150);
          orbs.splice(i, 1);
          break;
        }
      }
    }
    for (j = 0; j < 2; j++) {
      p = players[j];
      if (p.boost > 0) {
        p.boost -= dt;
        if (Math.random() < 0.7) {
          particles.push({
            x: p.x + (Math.random() * 10 - 5),
            y: p.y + (Math.random() * 10 - 5),
            vx: -p.vx * 0.15 + (Math.random() * 30 - 15),
            vy: -p.vy * 0.15 + (Math.random() * 30 - 15),
            life: 0.35, maxLife: 0.35,
            r: 3 + Math.random() * 3, color: p.theme.body
          });
        }
      }
    }
  }

  function updateParticles(dt) {
    var i, p;
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - 3.5 * dt);
      p.vy *= (1 - 3.5 * dt);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (i = floats.length - 1; i >= 0; i--) {
      p = floats[i];
      p.y -= 36 * dt;
      p.t -= dt;
      if (p.t <= 0) floats.splice(i, 1);
    }
  }

  function burst(x, y, color, n, speed) {
    var i, a, v;
    for (i = 0; i < n; i++) {
      a = Math.random() * Math.PI * 2;
      v = speed * (0.3 + Math.random() * 0.8);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.35, maxLife: 0.7,
        r: 1.5 + Math.random() * 2.5, color: color
      });
    }
  }

  function addFloat(x, y, txt, color, size) {
    floats.push({ x: x, y: y, txt: txt, color: color, size: size || 15, t: 1.1 });
  }

  function updateHud() {
    p1El.textContent = players[0].score;
    p2El.textContent = players[1].score;
    var rem = Math.max(0, Math.ceil(MATCH_TIME - time));
    timerEl.textContent = rem;
    if (rem <= 10 && state === "play") timerEl.classList.add("warn");
    else timerEl.classList.remove("warn");
  }

  // ---- drawing ----

  function draw() {
    ctx.save();
    ctx.fillStyle = "#0a0d1f";
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawArena();
    if (shake > 0.3) {
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      shake *= 0.85;
    }
    drawOrbs();
    drawVehicles();
    drawParticles();
    drawFloats();
    drawJoysticks();
    drawOverlays();
    ctx.restore();
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(120,140,210,0.06)";
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i <= W; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, H);
      ctx.stroke();
    }
    for (i = 0; i <= H; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(W, i + 0.5);
      ctx.stroke();
    }
  }

  function drawArena() {
    var prog = clamp(time / MATCH_TIME, 0, 1);
    var x = arena.left, y = arena.top;
    var w = arena.right - arena.left, h = arena.bottom - arena.top;

    ctx.fillStyle = "rgba(18,24,48,0.95)";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "rgba(120,140,210,0.06)";
    ctx.lineWidth = 1;
    var i;
    for (i = arena.left; i < arena.right; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, arena.top);
      ctx.lineTo(i + 0.5, arena.bottom);
      ctx.stroke();
    }
    for (i = arena.top; i < arena.bottom; i += 26) {
      ctx.beginPath();
      ctx.moveTo(arena.left, i + 0.5);
      ctx.lineTo(arena.right, i + 0.5);
      ctx.stroke();
    }

    // electric wall: cyan -> red as the arena closes in
    var R = Math.round(lerp(63, 255, prog));
    var G = Math.round(lerp(214, 59, prog));
    var B = Math.round(lerp(255, 92, prog));
    var col = "rgb(" + R + "," + G + "," + B + ")";

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 9;
    ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);

    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -time * 60;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }

  function drawOrbs() {
    var i, o, pulse, r;
    for (i = 0; i < orbs.length; i++) {
      o = orbs[i];
      pulse = 0.5 + 0.5 * Math.sin(time * 6 + o.phase * 7);
      r = o.r + pulse * 1.5;
      ctx.fillStyle = "rgba(157,255,138,0.22)";
      ctx.beginPath();
      ctx.arc(o.x, o.y, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9dff8a";
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(o.x - r * 0.3, o.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVehicles() {
    drawVehicle(players[0]);
    drawVehicle(players[1]);
  }

  function drawVehicle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    var a = p.stun > 0 ? time * 9 : p.angle; // spin while stunned
    ctx.rotate(a);

    if (p.boost > 0) {
      ctx.shadowColor = p.theme.body;
      ctx.shadowBlur = 22 + 10 * Math.sin(time * 16);
    }

    // rim studs (bumper-car look)
    ctx.fillStyle = p.theme.dark;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    var i, a2;
    for (i = 0; i < 8; i++) {
      a2 = (i / 8) * Math.PI * 2 + 0.2;
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * (p.r - 2), Math.sin(a2) * (p.r - 2), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // body
    ctx.fillStyle = p.theme.body;
    ctx.beginPath();
    ctx.arc(0, 0, p.r - 4, 0, Math.PI * 2);
    ctx.fill();
    // driver dome
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, p.r - 9, 0, Math.PI * 2);
    ctx.fill();
    // facing notch
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(p.r - 1, 0);
    ctx.lineTo(p.r - 7, -4);
    ctx.lineTo(p.r - 7, 4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    if (p.boost > 0) {
      ctx.fillStyle = "rgba(255,210,80,0.85)";
      var fl = 6 + Math.sin(time * 30) * 2;
      ctx.beginPath();
      ctx.moveTo(-p.r + 3, 0);
      ctx.lineTo(-p.r - fl, -4);
      ctx.lineTo(-p.r - fl - 3, 0);
      ctx.lineTo(-p.r - fl, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // energy meter above the car
    var bw = 26;
    var mx = p.x - bw / 2;
    var my = p.y - p.r - 12;
    var frac = p.boost > 0 ? p.boost / 5 : p.meter / 100;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(mx - 1, my - 1, bw + 2, 6);
    ctx.fillStyle = p.boost > 0 ? "#ffd94a" : "#4de6ff";
    ctx.fillRect(mx, my, bw * clamp(frac, 0, 1), 4);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(mx - 0.5, my - 0.5, bw + 1, 5);
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

  function drawFloats() {
    var i, t;
    ctx.textAlign = "center";
    for (i = 0; i < floats.length; i++) {
      t = floats[i];
      ctx.globalAlpha = clamp(t.t, 0, 1);
      ctx.fillStyle = t.color;
      ctx.font = "bold " + t.size + "px system-ui, sans-serif";
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawJoysticks() {
    var i, j;
    for (i = 0; i < 2; i++) {
      j = joy[i];
      if (!j.active) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(j.ax, j.ay, JOY_R - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = players[i].theme.body;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(j.ax + j.dx * JOY_R, j.ay + j.dy * JOY_R, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawOverlays() {
    ctx.textAlign = "center";
    if (state === "start") {
      ctx.fillStyle = "rgba(6,8,20,0.88)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffb83d";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.fillText("POCKET BUMPER", W / 2, H / 2 - 96);
      ctx.fillStyle = "#dfe8ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Grab energy orbs to score and build boost.", W / 2, H / 2 - 52);
      ctx.fillText("Ram the rival to shove them and score points.", W / 2, H / 2 - 28);
      ctx.fillText("The arena shrinks - don't get pinned on the walls!", W / 2, H / 2 - 4);
      ctx.fillStyle = "#3fd6ff";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("P1: WASD", W / 2 - 130, H / 2 + 30);
      ctx.fillStyle = "#ffb83d";
      ctx.fillText("P2: Arrows", W / 2 + 130, H / 2 + 30);
      ctx.fillStyle = "#9dff8a";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Touch: drag the left / right half of the arena", W / 2, H / 2 + 62);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("Press SPACE / ENTER or tap START", W / 2, H / 2 + 106);
    } else if (state === "over") {
      ctx.fillStyle = "rgba(6,8,20,0.8)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("TIME UP!", W / 2, H / 2 - 70);
      ctx.fillStyle = "#3fd6ff";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.fillText(players[0].score, W / 2 - 80, H / 2 - 22);
      ctx.fillStyle = "#7f8db3";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText("-", W / 2, H / 2 - 22);
      ctx.fillStyle = "#ffb83d";
      ctx.fillText(players[1].score, W / 2 + 80, H / 2 - 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillText(players[0].score === players[1].score ? "DRAW!" : (players[0].score > players[1].score ? "P1 WINS!" : "P2 WINS!"), W / 2, H / 2 + 16);
      ctx.fillStyle = "#dfe8ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE or R to restart", W / 2, H / 2 + 58);
    }
  }

  // ---- loop ----

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (state === "play") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- input ----

  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") {
      e.preventDefault();
    }
    keys[e.code] = true;
    if (e.code === "Space" || e.code === "Enter") {
      if (state === "start" || state === "over") reset();
    } else if (e.code === "KeyR") {
      if (state === "play" || state === "over") reset();
    }
  });

  window.addEventListener("keyup", function (e) {
    keys[e.code] = false;
  });

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    var p = canvasPos(e);
    if (state === "start" || state === "over") reset();
    var half = p.x < W / 2 ? 0 : 1;
    var j = joy[half];
    if (j.active) return;
    j.active = true;
    j.id = e.pointerId;
    j.ax = p.x;
    j.ay = p.y;
    j.dx = 0;
    j.dy = 0;
  });

  canvas.addEventListener("pointermove", function (e) {
    var i, j, p, dx, dy, l;
    for (i = 0; i < 2; i++) {
      j = joy[i];
      if (j.active && j.id === e.pointerId) {
        p = canvasPos(e);
        dx = p.x - j.ax;
        dy = p.y - j.ay;
        l = Math.sqrt(dx * dx + dy * dy);
        if (l < 6) { j.dx = 0; j.dy = 0; return; }
        if (l > JOY_R) { dx = dx / l * JOY_R; dy = dy / l * JOY_R; }
        j.dx = dx / JOY_R;
        j.dy = dy / JOY_R;
        return;
      }
    }
  });

  function endPointer(e) {
    var i, j;
    for (i = 0; i < 2; i++) {
      j = joy[i];
      if (j.active && j.id === e.pointerId) {
        j.active = false;
        j.id = -1;
        j.dx = 0;
        j.dy = 0;
      }
    }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  window.addEventListener("pointerup", endPointer);

  startBtn.addEventListener("click", function () {
    if (state !== "play") reset();
  });

  window.addEventListener("blur", function () {
    keys = {};
    var i;
    for (i = 0; i < 2; i++) {
      joy[i].active = false;
      joy[i].id = -1;
      joy[i].dx = 0;
      joy[i].dy = 0;
    }
  });

  // ---- init ----
  players = [
    makePlayer(W / 2 - 150, H / 2, 0),
    makePlayer(W / 2 + 150, H / 2, 1)
  ];
  updateArena();
  updateHud();
  requestAnimationFrame(loop);
})();
