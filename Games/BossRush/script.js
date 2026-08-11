(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var waveEl = document.getElementById("wave");
  var hpEl = document.getElementById("hp");
  var fireBtn = document.getElementById("fireBtn");
  var pauseBtn = document.getElementById("pauseBtn");

  var W = canvas.width;
  var H = canvas.height;

  var BEST_KEY = "bossrush_best";
  var best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch (e) { best = 0; }
  bestEl.textContent = best;

  // state: start | play | over
  var state = "start";
  var paused = false;
  var score = 0;
  var wave = 0;
  var last = 0;
  var time = 0;

  var player = {
    x: W / 2,
    y: H - 80,
    r: 12,
    hp: 100,
    maxHp: 100,
    speed: 290,
    fireCd: 0,
    invuln: 0,
    angle: -Math.PI / 2
  };

  var bullets = []; // player bullets
  var ebullets = []; // enemy bullets
  var enemies = [];
  var boss = null;
  var particles = [];
  var texts = [];

  var BULLET_SPEED = 600;

  // phase: enemies | boss | clear
  var phase = "enemies";
  var phaseTimer = 0;
  var grace = 0; // while > 0 enemies/boss hold fire

  var announce = null; // { text, sub, t }

  var shake = 0;

  var keys = {};
  var mouse = { x: W / 2, y: 0, used: false };
  var mouseDown = false;
  var btnFire = false;
  var kbFire = false;

  function isFiring() {
    return state === "play" && !paused && (mouseDown || btnFire || kbFire);
  }

  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function addText(x, y, txt, color, size) {
    texts.push({ x: x, y: y, txt: txt, color: color, size: size || 16, t: 1.1 });
  }

  function burst(x, y, color, n, speed) {
    var i, a, v;
    for (i = 0; i < n; i++) {
      a = Math.random() * Math.PI * 2;
      v = (speed || 160) * (0.4 + Math.random() * 0.8);
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        r: 2 + Math.random() * 3,
        color: color
      });
    }
  }

  function reset() {
    score = 0;
    wave = 0;
    player.hp = player.maxHp;
    player.x = W / 2;
    player.y = H - 80;
    player.invuln = 0;
    player.fireCd = 0;
    bullets = [];
    ebullets = [];
    enemies = [];
    boss = null;
    particles = [];
    texts = [];
    announce = null;
    shake = 0;
    paused = false;
    pauseBtn.textContent = "\u274B\u274B";
    state = "play";
    updateHud();
    nextWave();
  }

  function updateHud() {
    scoreEl.textContent = score;
    waveEl.textContent = wave;
    hpEl.textContent = Math.max(0, Math.ceil(player.hp));
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem(BEST_KEY, best); } catch (e) {}
    }
  }

  function announceWave() {
    announce = { text: "WAVE " + wave, sub: "Clear the ships, then face the boss", t: 2.0 };
  }

  function nextWave() {
    wave++;
    phase = "enemies";
    phaseTimer = 0;
    grace = 1.1;
    boss = null;
    ebullets = [];
    spawnEnemies();
    announceWave();
    updateHud();
  }

  function spawnEnemies() {
    var n = Math.min(3 + wave, 10);
    var hp = Math.min(1 + Math.floor(wave / 3), 4);
    var i, x, y, tries;
    for (i = 0; i < n; i++) {
      x = 30 + Math.random() * (W - 60);
      y = 30 + Math.random() * (H * 0.45);
      tries = 0;
      while (dist(x, y, player.x, player.y) < 130 && tries < 20) {
        x = 30 + Math.random() * (W - 60);
        y = 30 + Math.random() * (H * 0.45);
        tries++;
      }
      enemies.push({
        x: x, y: y, r: 11,
        hp: hp, maxHp: hp,
        fireCd: 1.2 + Math.random() * 1.6,
        wob: Math.random() * Math.PI * 2,
        speed: 40 + wave * 6 + Math.random() * 40,
        bulletSpeed: 150 + wave * 9,
        dmg: 6,
        vx: 0,
        vy: 0
      });
    }
  }

  function spawnBoss() {
    boss = {
      x: W / 2,
      y: 110,
      r: 34,
      hp: 30 + wave * 35,
      maxHp: 30 + wave * 35,
      atkType: -1,
      atkCd: 1.5,
      atkTimer: 0,
      atkAng: 0,
      acc: 0,
      dmg: 16,
      bob: 0,
      hitFlash: 0,
      vx: 0,
      vy: 0
    };
    ebullets = [];
    grace = 1.2;
    phase = "boss";
    announce = { text: "BOSS!", sub: "Wave " + wave + " guardian", t: 2.0 };
  }

  function startIfIdle() {
    if (state === "start" || state === "over") reset();
  }

  function togglePause() {
    if (state !== "play") return;
    paused = !paused;
    pauseBtn.textContent = paused ? "\u25B6" : "\u274B\u274B";
  }

  // ---------------- updates ----------------

  function update(dt) {
    if (paused || state !== "play") return;

    time += dt;
    if (grace > 0) grace -= dt;
    if (announce) {
      announce.t -= dt;
      if (announce.t <= 0) announce = null;
    }

    updatePlayer(dt);
    updateShooting(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateParticles(dt);

    // phase flow
    if (phase === "enemies" && enemies.length === 0) {
      spawnBoss();
    } else if (phase === "boss" && boss === null) {
      phase = "clear";
      phaseTimer = 2.0;
      announce = { text: "WAVE CLEARED", sub: "Score +" + (50 + wave * 30), t: 2.0 };
    } else if (phase === "clear") {
      phaseTimer -= dt;
      if (phaseTimer <= 0) nextWave();
    }

    updateHud();
  }

  function updatePlayer(dt) {
    var dx = 0, dy = 0, l;
    if (keys.up || keys.ArrowUp) dy -= 1;
    if (keys.down || keys.ArrowDown) dy += 1;
    if (keys.left || keys.ArrowLeft) dx -= 1;
    if (keys.right || keys.ArrowRight) dx += 1;
    if (dx || dy) {
      l = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / l) * player.speed * dt;
      player.y += (dy / l) * player.speed * dt;
    }
    player.x = clamp(player.x, player.r + 4, W - player.r - 4);
    player.y = clamp(player.y, player.r + 4, H - player.r - 4);

    if (player.invuln > 0) player.invuln -= dt;
    if (player.fireCd > 0) player.fireCd -= dt;

    // facing
    if (mouse.used) {
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    } else {
      player.angle = -Math.PI / 2;
    }
  }

  function aimTarget() {
    // auto-aim nearest enemy, else boss, leading the target's motion
    var bestD = Infinity, tgt = null;
    var i, e, d;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      d = dist(player.x, player.y, e.x, e.y);
      if (d < bestD) { bestD = d; tgt = e; }
    }
    if (boss) {
      d = dist(player.x, player.y, boss.x, boss.y);
      if (d < bestD) { bestD = d; tgt = boss; }
    }
    if (!tgt) return { x: player.x, y: player.y - 80 };
    var flight = bestD / BULLET_SPEED;
    return {
      x: tgt.x + (tgt.vx || 0) * flight,
      y: tgt.y + (tgt.vy || 0) * flight
    };
  }

  function updateShooting(dt) {
    if (!isFiring() || player.fireCd > 0) return;
    player.fireCd = 0.1;
    var t;
    if (mouse.used) {
      t = { x: mouse.x, y: mouse.y };
    } else {
      t = aimTarget();
    }
    var a = Math.atan2(t.y - player.y, t.x - player.x);
    bullets.push({
      x: player.x + Math.cos(a) * (player.r + 5),
      y: player.y + Math.sin(a) * (player.r + 5),
      vx: Math.cos(a) * BULLET_SPEED,
      vy: Math.sin(a) * BULLET_SPEED,
      r: 4,
      dmg: 1,
      life: 1.5
    });
    particles.push({
      x: player.x + Math.cos(a) * player.r,
      y: player.y + Math.sin(a) * player.r,
      vx: Math.cos(a) * 40, vy: Math.sin(a) * 40,
      life: 0.12, maxLife: 0.12,
      r: 3, color: "#9fe8ff"
    });
  }

  function updateEnemies(dt) {
    var i, e, a, d;
    for (i = enemies.length - 1; i >= 0; i--) {
      e = enemies[i];
      e.wob += dt * 2.4;
      var ox = e.x, oy = e.y;
      a = Math.atan2(player.y - e.y, player.x - e.x);
      d = dist(e.x, e.y, player.x, player.y);
      e.x += Math.cos(a) * e.speed * dt + Math.cos(e.wob) * 18 * dt;
      e.y += Math.sin(a) * e.speed * dt + Math.sin(e.wob) * 18 * dt;
      e.x = clamp(e.x, e.r, W - e.r);
      e.y = clamp(e.y, e.r, H - e.r);
      if (dt > 0) {
        e.vx = (e.x - ox) / dt;
        e.vy = (e.y - oy) / dt;
      }

      // fire aimed shot
      if (grace <= 0) {
        e.fireCd -= dt;
        if (e.fireCd <= 0 && d < 640) {
          e.fireCd = 1.7 + Math.random() * 1.4;
          ebullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * e.bulletSpeed,
            vy: Math.sin(a) * e.bulletSpeed,
            r: 5, dmg: e.dmg, life: 5
          });
        }
      }

      // body collision with player
      if (player.invuln <= 0 && d < e.r + player.r + 2) {
        hurtPlayer(e.dmg, e.x, e.y);
      }
    }
  }

  function updateBoss(dt) {
    if (!boss) return;
    var b = boss;
    b.bob += dt * 1.8;
    var bx = b.x, by = b.y;

    // drift toward player horizontally, hover with bob
    b.x += (player.x - b.x) * 0.35 * dt;
    b.y += Math.sin(b.bob) * 46 * dt;
    b.y += (player.y - b.y) * 0.12 * dt;
    b.x = clamp(b.x, b.r + 10, W - b.r - 10);
    b.y = clamp(b.y, b.r + 8, H * 0.55);
    if (dt > 0) {
      b.vx = (b.x - bx) / dt;
      b.vy = (b.y - by) / dt;
    }

    if (b.hitFlash > 0) b.hitFlash -= dt;

    // attack cycle
    if (grace <= 0) {
      b.atkCd -= dt;
      if (b.atkCd <= 0) {
        b.atkType = (b.atkType + 1) % 3;
        b.atkTimer = 1.5;
        b.atkAng = Math.random() * Math.PI * 2;
        b.atkCd = b.atkType === 2 ? 1.1 : 1.5;
        if (b.atkType === 0) radialBurst(b, 16);
        else if (b.atkType === 1) aimedBurst(b, 3, 0.16);
        else b.acc = 0;
      }
      if (b.atkType === 2 && b.atkTimer > 0) {
        b.atkTimer -= dt;
        b.acc -= dt;
        if (b.acc <= 0) {
          b.acc = 0.08;
          ebullets.push({
            x: b.x + Math.cos(b.atkAng) * b.r,
            y: b.y + Math.sin(b.atkAng) * b.r,
            vx: Math.cos(b.atkAng) * 190,
            vy: Math.sin(b.atkAng) * 190,
            r: 5, dmg: b.dmg - 10, life: 4
          });
          ebullets.push({
            x: b.x - Math.cos(b.atkAng) * b.r,
            y: b.y - Math.sin(b.atkAng) * b.r,
            vx: -Math.cos(b.atkAng) * 190,
            vy: -Math.sin(b.atkAng) * 190,
            r: 5, dmg: b.dmg - 10, life: 4
          });
          b.atkAng += 0.38;
        }
      }
    }

    // body collision
    if (player.invuln <= 0 && dist(player.x, player.y, b.x, b.y) < b.r + player.r) {
      hurtPlayer(b.dmg, b.x, b.y);
    }
  }

  function radialBurst(b, n) {
    var i, a;
    for (i = 0; i < n; i++) {
      a = b.atkAng + (i * Math.PI * 2) / n;
      ebullets.push({
        x: b.x + Math.cos(a) * b.r,
        y: b.y + Math.sin(a) * b.r,
        vx: Math.cos(a) * 165,
        vy: Math.sin(a) * 165,
        r: 6, dmg: b.dmg - 8, life: 4
      });
    }
    burst(b.x, b.y, "#ff6a8a", 10, 120);
  }

  function aimedBurst(b, n, spread) {
    var base = Math.atan2(player.y - b.y, player.x - b.x);
    var i, a;
    for (i = 0; i < n; i++) {
      a = base + (i - (n - 1) / 2) * spread;
      ebullets.push({
        x: b.x + Math.cos(a) * b.r,
        y: b.y + Math.sin(a) * b.r,
        vx: Math.cos(a) * 230,
        vy: Math.sin(a) * 230,
        r: 6, dmg: b.dmg - 8, life: 5
      });
    }
  }

  function hurtPlayer(dmg, srcx, srcy) {
    if (player.invuln > 0) return;
    player.hp -= dmg;
    player.invuln = 1.2;
    shake = Math.max(shake, 6);
    burst(player.x, player.y, "#ff5a5a", 14, 180);
    addText(player.x, player.y - 18, "-" + dmg, "#ff8a8a", 15);
    if (player.hp <= 0) {
      player.hp = 0;
      gameOver();
    }
  }

  function updateBullets(dt) {
    var i, j, e, b, d;
    // player bullets
    for (i = bullets.length - 1; i >= 0; i--) {
      b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        bullets.splice(i, 1);
        continue;
      }
      // hit enemies
      var hit = false;
      for (j = enemies.length - 1; j >= 0; j--) {
        e = enemies[j];
        if (dist(b.x, b.y, e.x, e.y) < e.r + b.r) {
          e.hp -= b.dmg;
          burst(b.x, b.y, "#ffd94a", 4, 90);
          if (e.hp <= 0) {
            score += 10 + wave * 2;
            burst(e.x, e.y, "#ff9a3c", 18, 200);
            addText(e.x, e.y - 14, "+" + (10 + wave * 2), "#ffd94a", 14);
            enemies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }
      if (hit) { bullets.splice(i, 1); continue; }
      // hit boss
      if (boss && dist(b.x, b.y, boss.x, boss.y) < boss.r + b.r) {
        boss.hp -= b.dmg;
        boss.hitFlash = 0.08;
        burst(b.x, b.y, "#ff6adf", 5, 120);
        if (boss.hp <= 0) {
          var pts = 50 + wave * 30;
          score += pts;
          burst(boss.x, boss.y, "#b04cff", 40, 280);
          burst(boss.x, boss.y, "#ffd94a", 24, 200);
          burst(boss.x, boss.y, "#ffffff", 16, 150);
          addText(boss.x, boss.y, "+" + pts, "#ffd94a", 20);
          shake = Math.max(shake, 8);
          boss = null;
        }
        bullets.splice(i, 1);
        continue;
      }
    }

    // enemy bullets
    for (i = ebullets.length - 1; i >= 0; i--) {
      b = ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        ebullets.splice(i, 1);
        continue;
      }
      if (player.invuln <= 0 && dist(b.x, b.y, player.x, player.y) < b.r + player.r) {
        hurtPlayer(b.dmg, b.x, b.y);
        ebullets.splice(i, 1);
      }
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

  function gameOver() {
    state = "over";
    burst(player.x, player.y, "#7fd0ff", 30, 220);
    burst(player.x, player.y, "#ffffff", 20, 160);
    shake = Math.max(shake, 10);
    try { localStorage.setItem(BEST_KEY, Math.max(best, score)); } catch (e) {}
    best = Math.max(best, score);
    bestEl.textContent = best;
  }

  // ---------------- drawing ----------------

  function draw() {
    ctx.save();
    ctx.fillStyle = "#0b0d1a";
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "rgba(120,140,200,0.07)";
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

    // arena border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(2, 2, W - 4, H - 4);

    if (shake > 0.3) {
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      shake *= 0.86;
    }

    drawEnemies();
    drawBoss();
    drawBullets();
    drawParticles();
    drawPlayer();
    drawTexts();
    drawPlayerBar();

    if (announce) {
      var alpha = announce.t > 1.6 ? 1 : Math.min(1, announce.t / 0.4);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 42px system-ui, sans-serif";
      ctx.fillText(announce.text, W / 2, H * 0.42);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(announce.sub, W / 2, H * 0.42 + 30);
      ctx.globalAlpha = 1;
    }

    if (paused) {
      ctx.fillStyle = "rgba(5,6,14,0.78)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("PAUSED", W / 2, H / 2 - 10);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press P or the pause button to resume", W / 2, H / 2 + 26);
    }

    if (state === "start") {
      ctx.fillStyle = "rgba(5,6,14,0.85)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 46px system-ui, sans-serif";
      ctx.fillText("BOSS RUSH", W / 2, H / 2 - 70);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Move: WASD / Arrow keys", W / 2, H / 2 - 30);
      ctx.fillText("Shoot: mouse (click or hold) or SPACE", W / 2, H / 2 - 6);
      ctx.fillText("Dodge the bullets. Survive each wave and its boss.", W / 2, H / 2 + 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("Click, press ENTER or R to start", W / 2, H / 2 + 66);
    } else if (state === "over") {
      ctx.fillStyle = "rgba(5,6,14,0.8)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6a6a";
      ctx.font = "bold 44px system-ui, sans-serif";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 60);
      ctx.fillStyle = "#fff";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText("Score: " + score, W / 2, H / 2 - 20);
      ctx.fillStyle = best >= score && best > 0 ? "#ffd94a" : "#7fd0ff";
      ctx.fillText("Best: " + best, W / 2, H / 2 + 8);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Reached wave " + wave, W / 2, H / 2 + 38);
      ctx.fillText("Press R to restart", W / 2, H / 2 + 70);
    }

    ctx.restore();
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(time * 14) % 2 === 0) return; // blink
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = "#7fd0ff";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d7f4ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemies() {
    var i, e;
    ctx.fillStyle = "#ff5a5a";
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(player.y - e.y, player.x - e.x));
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
      // hp pips
      ctx.fillStyle = "#ffd94a";
      ctx.fillRect(-6, -16, 12, 3);
      ctx.fillStyle = "#ff8a8a";
      ctx.fillRect(-6, -16, 12 * (e.hp / e.maxHp), 3);
      ctx.restore();
    }
  }

  function drawBoss() {
    if (!boss) return;
    var b = boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(time * 0.6);
    // outer ring spikes
    ctx.fillStyle = b.hitFlash > 0 ? "#ffffff" : "#b04cff";
    var spikes = 10, i, a;
    for (i = 0; i < spikes; i++) {
      a = (i / spikes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (b.r + 8), Math.sin(a) * (b.r + 8));
      ctx.lineTo(Math.cos(a + 0.18) * b.r, Math.sin(a + 0.18) * b.r);
      ctx.lineTo(Math.cos(a - 0.18) * b.r, Math.sin(a - 0.18) * b.r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = b.hitFlash > 0 ? "#ffd94a" : "#7a2fd0";
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4d4d";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd94a";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // boss hp bar (canvas top)
    var bw = 260;
    var bx = (W - bw) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx - 2, 8, bw + 4, 14);
    ctx.fillStyle = "#7a2fd0";
    ctx.fillRect(bx, 10, bw, 10);
    ctx.fillStyle = "#ff4d6a";
    ctx.fillRect(bx, 10, bw * clamp(b.hp / b.maxHp, 0, 1), 10);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(bx - 0.5, 9.5, bw + 1, 11);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOSS " + Math.ceil(b.hp), W / 2, 19);
  }

  function drawBullets() {
    var i, b;
    for (i = 0; i < bullets.length; i++) {
      b = bullets[i];
      ctx.fillStyle = "#9fe8ff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(159,232,255,0.35)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (i = 0; i < ebullets.length; i++) {
      b = ebullets[i];
      ctx.fillStyle = "#ff4d6a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,77,106,0.3)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
      ctx.fill();
    }
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

  function drawPlayerBar() {
    var bw = 150;
    var bx = 12;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx - 2, H - 18, bw + 4, 12);
    ctx.fillStyle = "#22335e";
    ctx.fillRect(bx, H - 16, bw, 8);
    ctx.fillStyle = player.hp / player.maxHp > 0.35 ? "#5af06a" : "#ff5a5a";
    ctx.fillRect(bx, H - 16, bw * clamp(player.hp / player.maxHp, 0, 1), 8);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(bx - 0.5, H - 16.5, bw + 1, 9);
  }

  // ---------------- loop ----------------

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (!paused) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------------- input ----------------

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
    switch (e.code) {
      case "KeyW": keys.up = true; break;
      case "KeyS": keys.down = true; break;
      case "KeyA": keys.left = true; break;
      case "KeyD": keys.right = true; break;
      case "ArrowUp": keys.ArrowUp = true; break;
      case "ArrowDown": keys.ArrowDown = true; break;
      case "ArrowLeft": keys.ArrowLeft = true; break;
      case "ArrowRight": keys.ArrowRight = true; break;
      case "Space":
        kbFire = true;
        startIfIdle();
        break;
      case "Enter":
        startIfIdle();
        break;
      case "KeyR":
        reset();
        break;
      case "KeyP":
        togglePause();
        break;
    }
  });

  window.addEventListener("keyup", function (e) {
    keys[e.code] = false;
    switch (e.code) {
      case "KeyW": keys.up = false; break;
      case "KeyS": keys.down = false; break;
      case "KeyA": keys.left = false; break;
      case "KeyD": keys.right = false; break;
      case "ArrowUp": keys.ArrowUp = false; break;
      case "ArrowDown": keys.ArrowDown = false; break;
      case "ArrowLeft": keys.ArrowLeft = false; break;
      case "ArrowRight": keys.ArrowRight = false; break;
      case "Space": kbFire = false; break;
    }
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
    el.addEventListener("touchstart", d, { passive: false });
    el.addEventListener("touchend", u, { passive: false });
    el.addEventListener("touchcancel", u, { passive: false });
    el.addEventListener("mousedown", d);
    el.addEventListener("mouseup", u);
    el.addEventListener("mouseleave", u);
    el.addEventListener("keydown", function (e) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        d(e);
      }
    });
    el.addEventListener("keyup", function (e) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        u(e);
      }
    });
  }

  hold(fireBtn, function () { btnFire = true; }, function () { btnFire = false; });

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    var p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.used = true;
    mouseDown = true;
    startIfIdle();
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.used = true;
  });
  window.addEventListener("pointerup", function () {
    mouseDown = false;
  });

  pauseBtn.addEventListener("click", togglePause);
  canvas.addEventListener("pointerup", function () { mouseDown = false; });

  // pause when the tab loses focus
  window.addEventListener("blur", function () {
    mouseDown = false;
    btnFire = false;
    kbFire = false;
    if (state === "play" && !paused) togglePause();
  });

  updateHud();
  requestAnimationFrame(loop);
})();
