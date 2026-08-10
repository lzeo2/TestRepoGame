/* ============================================================================
 * FPS — original raycast first-person shooter
 * ----------------------------------------------------------------------------
 * CONTROLS
 *   Mouse ........... look (click canvas to capture pointer)
 *   WASD / Arrows ... move
 *   Left click ...... fire
 *   Right click ..... alternate fire (weapon dependent)
 *   1 / 2 / 3 ....... switch weapon
 *   R ............... reload
 *   Shift ........... walk slowly
 *   Space ........... small hop
 *   Esc ............. release mouse / pause
 *   Enter ........... respawn after death
 *
 * IMPLEMENTATION
 *   Software DDA raycast renderer writing pixels into an ImageData buffer.
 *   Procedural textures for walls, floor, ceiling. Enemies are billboard
 *   sprites with line-of-sight AI (patrol / chase / attack). Three weapons
 *   with distinct stats. All audio synthesized via WebAudio, no external
 *   assets and no network requests.
 * ==========================================================================*/
(function () {
  "use strict";

  /* ============================ CANVAS SETUP ============================ */
  var screen = document.getElementById("screen");
  var ctx = screen.getContext("2d");
  var overlay = document.getElementById("overlay");
  var btnStart = document.getElementById("btnStart");
  var hpEl = document.getElementById("hp");
  var scoreEl = document.getElementById("score");
  var killsEl = document.getElementById("kills");
  var ammoEl = document.getElementById("ammo");
  var weaponNameEl = document.getElementById("weaponName");
  var bestScoreEl = document.getElementById("bestScore");
  var bestLine = document.getElementById("bestLine");

  var W = 480, H = 300; // internal render resolution (scaled up)
  var sw = 0, sh = 0;   // actual canvas pixels
  var img = ctx.createImageData(W, H);
  var zbuf = new Float32Array(W);

  function resize() {
    sw = window.innerWidth;
    sh = window.innerHeight;
    screen.width = sw;
    screen.height = sh;
  }
  window.addEventListener("resize", resize);
  resize();

  /* ============================ CONFIG ============================ */
  var MAP_W = 24, MAP_H = 24;
  var MOVE_SPEED = 3.4;
  var PLAYER_R = 0.24;

  var weapons = [
    {
      name: "Pistol", slot: 1, dmg: 34, mag: 12, reserve: 96, rate: 0.22,
      reload: 1.1, spread: 0.016, pellets: 1, auto: false, kick: 0.02,
      alt: { rate: 0.5, spread: 0.05, dmg: 25, pellets: 3, label: "3-round burst" }
    },
    {
      name: "Shotgun", slot: 2, dmg: 14, mag: 6, reserve: 30, rate: 0.9,
      reload: 1.6, spread: 0.09, pellets: 8, auto: false, kick: 0.09,
      alt: { rate: 0.9, spread: 0.06, dmg: 9, pellets: 14, label: "wide spread" }
    },
    {
      name: "Auto Rifle", slot: 3, dmg: 11, mag: 30, reserve: 120, rate: 0.09,
      reload: 1.8, spread: 0.035, pellets: 1, auto: true, kick: 0.03,
      alt: { rate: 0.3, spread: 0.02, dmg: 30, pellets: 1, label: "precision shot" }
    }
  ];

  /* ============================ PROCEDURAL TEXTURES ============================ */
  var TEX = 64;
  var walls = [];   // per wall type: Uint32Array of RGB colors
  var floorTex = null, ceilTex = null, spriteTex = null;

  function makeTex(draw) {
    var data = new Uint32Array(TEX * TEX);
    for (var y = 0; y < TEX; y++) {
      for (var x = 0; x < TEX; x++) {
        data[y * TEX + x] = draw(x, y) >>> 0;
      }
    }
    return data;
  }
  function rgb(r, g, b) { return ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; }
  function shade(c, f) {
    var r = (c & 255) * f, g = ((c >> 8) & 255) * f, b = ((c >> 16) & 255) * f;
    return rgb(r, g, b);
  }

  function buildTextures() {
    // Stone bricks (wall type 1)
    walls[1] = makeTex(function (x, y) {
      var bx = Math.floor(x / 16), by = Math.floor(y / 16);
      var border = (x % 16 === 0) || (y % 16 === 0);
      var n = (bx * 7 + by * 13 + ((x + y) % 3)) % 100 / 100;
      var base = border ? 62 : 92 + n * 26;
      return rgb(base, base - 4, base - 10);
    });
    // Blue metal panels (wall type 2)
    walls[2] = makeTex(function (x, y) {
      var px = x % 32;
      var border = px === 0 || px === 31 || y < 4 || y > 60;
      var riv = (x % 8 === 0 && y % 8 === 0);
      var base = border ? 38 : 74;
      var b = base + ((x * 31 + y * 17) % 7) * 4;
      if (riv) return rgb(180, 200, 255);
      return rgb(b * 0.45, b * 0.75, b);
    });
    // Tech wall (type 3)
    walls[3] = makeTex(function (x, y) {
      var stripe = Math.floor(y / 8) % 2;
      var base = 46 + stripe * 14;
      var glow = (x > 24 && x < 40 && y > 20 && y < 44) ? 120 : 0;
      return rgb(base * 0.6 + glow * 0.6, base * 0.85 + glow, base + glow);
    });
    // Floor: dark asphalt with grid + noise
    floorTex = makeTex(function (x, y) {
      var n = ((x * 61 + y * 97) % 13) - 6;
      var line = (x % 64 < 2 || y % 64 < 2) ? 10 : 0;
      var v = 34 + n + line;
      return rgb(v, v * 0.92, v * 0.84);
    });
    // Ceiling: dark panels
    ceilTex = makeTex(function (x, y) {
      var panel = Math.floor(x / 32) % 2 === Math.floor(y / 32) % 2;
      var v = panel ? 40 : 32;
      v += ((x * 3 + y * 5) % 7) * 3;
      return rgb(v, v * 0.95, v * 1.1);
    });
    // Enemy sprite texture: procedurally drawn goblin-ish blob
    spriteTex = buildSprite();
  }

  function buildSprite() {
    var data = new Uint32Array(TEX * TEX);
    for (var y = 0; y < TEX; y++) {
      for (var x = 0; x < TEX; x++) {
        data[y * TEX + x] = 0; // transparent
        var nx = x / TEX - 0.5, ny = y / TEX - 0.5;
        var body = (nx * nx * 1.5 + ny * ny * 2.2) < 0.11; // ellipse
        if (y < TEX * 0.32 && body) body = (nx * nx * 3 + ny * ny * 6) < 0.05; // head smaller
        if (body) {
          var g = y < TEX * 0.3 ? 210 : 150;
          var r = y < TEX * 0.3 ? 130 : 190;
          data[y * TEX + x] = rgb(r, g, 60);
          // eyes
          if (y > TEX * 0.22 && y < TEX * 0.3 && (Math.abs(x - TEX * 0.37) < 3 || Math.abs(x - TEX * 0.63) < 3)) {
            data[y * TEX + x] = rgb(255, 240, 200);
          }
        }
      }
    }
    return data;
  }

  /* ============================ MAP ============================ */
  // 1=stone 2=metal 3=tech ; walls are solid
  var baseMap = [
    "111111111111111111111111",
    "1..3......3....2......1",
    "1..1..22..1..11..33...1",
    "1..1..2...1..1...1....1",
    "1..1..2...1..1...1.3..1",
    "1......2......1...1...1",
    "1..22..2..222...1.....1",
    "1..2...2..1....11.11..1",
    "1..2...2..1...........1",
    "1......2..1...2222....1",
    "11111..2..1...2...2...1",
    "1....3.2..1...2...2...1",
    "1..1..2...1...2...2...1",
    "1..1..2..33....222....1",
    "1..1......3...........1",
    "1..11..1..3..111..3...1",
    "1......1.....1....3...1",
    "1..22..1.....1..111...1",
    "1..2.....111..1........1",
    "1..2...1......11..2...1",
    "1..2...1..333....2....1",
    "1.....111..3...3.2....1",
    "1............3...222..1",
    "111111111111111111111111"
  ];

  var map = [];
  function parseMap() {
    for (var y = 0; y < MAP_H; y++) {
      map[y] = [];
      for (var x = 0; x < MAP_W; x++) {
        map[y][x] = parseInt(baseMap[y][x], 10) || 0;
      }
    }
  }

  function isWall(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 1;
    return map[Math.floor(y)][Math.floor(x)] > 0;
  }

  /* ============================ PLAYER ============================ */
  var player = {
    x: 2.5, y: 2.5,
    a: 0, // yaw
    pitch: 0,
    hp: 100,
    score: 0,
    kills: 0,
    alive: true,
    weapon: 0,
    mag: weapons[0].mag,
    reserve: weapons[0].reserve,
    fireT: 0,
    reloadT: 0,
    reloading: false,
    hopZ: 0, hopV: 0,
    bob: 0,
    flash: 0 // muzzle flash
  };
  var best = parseInt(localStorage.getItem("fps_best") || "0", 10);

  /* ============================ ENEMIES ============================ */
  function makeEnemy(x, y, hp, speed) {
    return {
      x: x + 0.5, y: y + 0.5, hp: hp, maxhp: hp, speed: speed,
      state: "patrol", // patrol | chase | attack | dead
      t: 0, // state timer
      px: 0, py: 0, // patrol target
      fireT: 0,
      angle: Math.random() * Math.PI * 2,
      bobT: Math.random() * 6
    };
  }

  var enemies = [];
  function spawnEnemies() {
    enemies = [];
    // Place enemies on floor tiles (value 0) away from the spawn corner
    var spots = [
      [6.5, 6.5], [18.5, 4.5], [12.5, 12.5], [20.5, 16.5],
      [5.5, 18.5], [16.5, 20.5], [9.5, 20.5], [20.5, 9.5],
      [14.5, 3.5], [3.5, 12.5], [10.5, 16.5], [21.5, 21.5]
    ];
    var counts = [12, 14, 16];
    var n = counts[Math.min(2, Math.floor(scoreTier() / 3))];
    for (var i = 0; i < n && i < spots.length; i++) {
      enemies.push(makeEnemy(spots[i][0], spots[i][1], 60 + scoreTier() * 4, 1.1 + scoreTier() * 0.12));
    }
  }
  function scoreTier() { return Math.floor(player.score / 400); }

  /* ============================ AUDIO (synthesized) ============================ */
  var actx = null;
  function audio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    return actx;
  }
  function playShot(kind) {
    if (!audio()) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = "square";
    var f = kind === "shotgun" ? 160 : kind === "rifle" ? 240 : 200;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t + 0.12);
    g.gain.setValueAtTime(kind === "shotgun" ? 0.5 : 0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + 0.16);
    // noise burst
    var nb = actx.createBufferSource();
    var buf = actx.createBuffer(1, 4000, actx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < 4000; i++) d[i] = Math.random() * 2 - 1;
    nb.buffer = buf;
    var ng = actx.createGain();
    ng.gain.setValueAtTime(kind === "shotgun" ? 0.5 : 0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    var fl = actx.createBiquadFilter();
    fl.type = "lowpass"; fl.frequency.value = 1400;
    nb.connect(fl).connect(ng).connect(actx.destination);
    nb.start(t);
  }
  function playHit() {
    if (!audio()) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.09);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + 0.11);
  }
  function playHurt() {
    if (!audio()) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + 0.34);
  }
  function playReload() {
    if (!audio()) return;
    var t = actx.currentTime;
    var o = actx.createOscillator();
    var g = actx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(300, t);
    o.frequency.setValueAtTime(180, t + 0.2);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + 0.3);
  }

  /* ============================ WEAPON HANDLING ============================ */
  function switchWeapon(idx) {
    if (idx < 0 || idx >= weapons.length || !player.alive) return;
    if (player.weapon === idx && player.reloading) return;
    player.weapon = idx;
    player.mag = weapons[idx].mag;
    player.reserve = weapons[idx].reserve;
    player.reloading = false;
    player.reloadT = 0;
    weaponNameEl.textContent = weapons[idx].name;
    ammoEl.textContent = player.mag + "/" + player.reserve;
  }

  function fire(altFire) {
    if (!player.alive || player.reloading || player.fireT > 0) return;
    var w = weapons[player.weapon];
    if (player.mag <= 0) {
      startReload();
      return;
    }
    player.mag--;
    player.fireT = altFire && w.alt ? w.alt.rate : w.rate;
    player.flash = 0.05;
    player.bob += 1.2;

    var pellets = altFire && w.alt ? w.alt.pellets : w.pellets;
    var dmg = altFire && w.alt ? w.alt.dmg : w.dmg;
    var spread = altFire && w.alt ? w.alt.spread : w.spread;
    var kick = altFire && w.alt ? w.alt.rate * 1.2 : w.kick;

    // hitscan for each pellet
    var hitSomething = false;
    for (var i = 0; i < pellets; i++) {
      var ang = player.a + (Math.random() - 0.5) * 2 * spread;
      var pitch = player.pitch + (Math.random() - 0.5) * spread * 1.4;
      var r = raycastHit(player.x, player.y, ang, 14);
      // find enemy hit along ray within range
      var bestT = r.t;
      var target = null;
      for (var e = 0; e < enemies.length; e++) {
        var en = enemies[e];
        if (en.state === "dead") continue;
        var dist = Math.hypot(en.x - player.x, en.y - player.y);
        if (dist > bestT) continue;
        // angular check
        var rel = Math.atan2(en.y - player.y, en.x - player.x);
        var da = normAng(rel - ang);
        if (Math.abs(da) > 0.35) continue;
        if (dist < bestT) { bestT = dist; target = en; }
      }
      if (target) {
        target.hp -= dmg;
        target.state = "chase";
        hitSomething = true;
        burst(target.x, target.y);
        playHit();
        if (target.hp <= 0) killEnemy(target);
      }
    }
    if (hitSomething) player.score += 5;
    player.pitch += (Math.random() - 0.5) * 0.01;
    playShot(w.name.toLowerCase());
    ammoEl.textContent = player.mag + "/" + player.reserve;
    if (player.mag <= 0) startReload();
  }

  function startReload() {
    if (player.reloading || !player.alive) return;
    var w = weapons[player.weapon];
    if (player.mag >= w.mag || player.reserve <= 0) return;
    player.reloading = true;
    player.reloadT = w.reload;
    playReload();
  }

  function finishReload() {
    var w = weapons[player.weapon];
    var need = w.mag - player.mag;
    var take = Math.min(need, player.reserve);
    player.mag += take;
    player.reserve -= take;
    player.reloading = false;
    ammoEl.textContent = player.mag + "/" + player.reserve;
  }

  function killEnemy(en) {
    en.state = "dead";
    en.deadT = 2.0;
    player.score += 100 + scoreTier() * 25;
    player.kills++;
    burst(en.x, en.y, true);
    if (player.score > best) {
      best = player.score;
      localStorage.setItem("fps_best", String(best));
      bestScoreEl.textContent = best;
    }
    updateHud();
    // ammo drop
    if (Math.random() < 0.4) {
      player.reserve += weapons[Math.floor(Math.random() * 3)].mag * 2;
    }
  }

  /* ============================ PARTICLES ============================ */
  var parts = [];
  function burst(x, y, big) {
    for (var i = 0; i < (big ? 30 : 10); i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * 0.4,
        y: y + (Math.random() - 0.5) * 0.4,
        a: Math.random() * Math.PI * 2,
        sp: 0.5 + Math.random() * 2.5,
        life: 0.3 + Math.random() * 0.5,
        max: 0.8, r: 1 + Math.random() * 2,
        c: Math.random() < 0.4 ? rgb(255, 60, 60) : rgb(255, 220, 120)
      });
    }
  }
  function stepParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      p.x += Math.cos(p.a) * p.sp * dt;
      p.y += Math.sin(p.a) * p.sp * dt;
      p.sp *= 0.9;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  /* ============================ INPUT ============================ */
  var keys = {};
  var mouseDx = 0, mouseDy = 0;
  var mouseDown = false, altDown = false;
  var locked = false;

  document.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (e.code === "Digit1") switchWeapon(0);
    if (e.code === "Digit2") switchWeapon(1);
    if (e.code === "Digit3") switchWeapon(2);
    if (e.code === "KeyR") startReload();
    if (e.code === "Enter" && !player.alive) respawn();
    if (e.code === "Space") {
      if (player.alive && player.hopV === 0) player.hopV = 3.2;
      e.preventDefault();
    }
  });
  document.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; mouseDown = false; altDown = false; });

  document.addEventListener("mousemove", function (e) {
    if (!locked) return;
    mouseDx += e.movementX;
    mouseDy += e.movementY;
  });
  document.addEventListener("mousedown", function (e) {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) altDown = true;
  });
  document.addEventListener("mouseup", function (e) {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) altDown = false;
  });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  screen.addEventListener("click", function () {
    if (!locked) {
      screen.requestPointerLock();
    }
  });
  document.addEventListener("pointerlockchange", function () {
    locked = document.pointerLockElement === screen;
    if (!locked) {
      mouseDown = false; altDown = false;
      keys = {};
    }
  });

  btnStart.addEventListener("click", function () {
    overlay.style.display = "none";
    bestLine.innerHTML = "Best: <b id='bestScore'>" + best + "</b>";
    bestScoreEl.textContent = best;
    startRun();
    screen.requestPointerLock();
  });

  function respawn() {
    player.x = 2.5; player.y = 2.5;
    player.a = 0; player.pitch = 0;
    player.hp = 100; player.alive = true;
    player.weapon = 0;
    switchWeapon(0);
    enemies.forEach(function (e) { if (e.state === "dead") { e.state = "patrol"; e.hp = e.maxhp; } });
    overlay.style.display = "none";
    screen.requestPointerLock();
  }

  /* ============================ RAYCASTING ============================ */
  function raycast(x, y, ang, maxDist) {
    // DDA
    var dirX = Math.cos(ang), dirY = Math.sin(ang);
    var mapX = Math.floor(x), mapY = Math.floor(y);
    var dX = Math.abs(1 / dirX), dY = Math.abs(1 / dirY);
    var stepX, stepY, sX, sY;
    if (dirX < 0) { stepX = -1; sX = (x - mapX) * dX; } else { stepX = 1; sX = (mapX + 1 - x) * dX; }
    if (dirY < 0) { stepY = -1; sY = (y - mapY) * dY; } else { stepY = 1; sY = (mapY + 1 - y) * dY; }
    var side = 0, t = maxDist + 1, tile = 0, hitX = 0, hitY = 0, wallX = 0;
    for (var i = 0; i < 64; i++) {
      if (sX < sY) { sX += dX; mapX += stepX; side = 0; } else { sY += dY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) break;
      tile = map[mapY][mapX];
      if (tile > 0) {
        t = side === 0 ? sX - dX : sY - dY;
        hitX = mapX; hitY = mapY;
        if (side === 0) wallX = y + t * dirY; else wallX = x + t * dirX;
        wallX -= Math.floor(wallX);
        break;
      }
    }
    if (t > maxDist || t <= 0) return { hit: false, t: maxDist, tile: 0, side: 0, wallX: 0 };
    return { hit: true, t: t, tile: tile, side: side, wallX: wallX, mapX: hitX, mapY: hitY };
  }
  function raycastHit(x, y, ang, maxDist) { return raycast(x, y, ang, maxDist); }

  function render() {
    var d = img.data;
    var fov = Math.PI / 3;
    var halfW = W / 2;
    var plane = 0.66;

    // ---- per-column wall casting ----
    var dirX = Math.cos(player.a), dirY = Math.sin(player.a);
    var planeX = -dirY * plane, planeY = dirX * plane;
    var camX = 0;

    for (var x = 0; x < W; x++) {
      camX = 2 * x / W - 1;
      var rdx = dirX + planeX * camX;
      var rdy = dirY + planeY * camX;
      var r = castRay(player.x, player.y, rdx, rdy);
      zbuf[x] = r.dist;
      var lineH = H / r.dist;
      var pitchOff = player.pitch * H * 0.5;
      var drawStart = Math.max(0, (H - lineH) / 2 + pitchOff);
      var drawEnd = Math.min(H - 1, (H + lineH) / 2 + pitchOff);
      var tex = walls[r.tile] || walls[1];
      var texx = Math.floor(r.wallX * TEX);
      if ((r.side === 0 && r.rdx > 0) || (r.side === 1 && r.rdy < 0)) texx = TEX - texx - 1;
      var stepT = TEX / lineH;
      var texPos = (drawStart - (H / 2) - pitchOff + lineH / 2) * stepT;
      for (var y = drawStart; y <= drawEnd; y++) {
        var texy = Math.min(TEX - 1, Math.floor(texPos));
        texPos += stepT;
        var c = tex[texy * TEX + texx];
        if (r.side === 1) c = shade(c, 0.72);
        var distF = 1 / (1 + r.dist * r.dist * 0.02);
        c = shade(c, Math.min(1, distF * 1.6));
        setPx(d, x, y, c);
      }
      // floor & ceiling for the rest of the column
      castFloor(d, x, drawEnd, drawStart, dirX, dirY, planeX, planeY, camX);
    }

    // ---- sprites (enemies + particles) ----
    drawSprites(d, dirX, dirY, planeX, planeY);

    // ---- vignette ----
    vignette(d);

    ctx.putImageData(img, 0, 0);
    drawWeapon();
    drawMinimap();
  }

  function setPx(d, x, y, c) {
    var i = (y * W + x) * 4;
    d[i] = c & 255;
    d[i + 1] = (c >> 8) & 255;
    d[i + 2] = (c >> 16) & 255;
    d[i + 3] = 255;
  }

  function castRay(px, py, rdx, rdy) {
    var mapX = Math.floor(px), mapY = Math.floor(py);
    var dX = Math.abs(1 / rdx), dY = Math.abs(1 / rdy);
    var stepX, stepY, sX, sY;
    if (rdx < 0) { stepX = -1; sX = (px - mapX) * dX; } else { stepX = 1; sX = (mapX + 1 - px) * dX; }
    if (rdy < 0) { stepY = -1; sY = (py - mapY) * dY; } else { stepY = 1; sY = (mapY + 1 - py) * dY; }
    var side = 0, tile = 1, wallX = 0;
    var hit = false, dist = 0;
    for (var i = 0; i < 64; i++) {
      if (sX < sY) { sX += dX; mapX += stepX; side = 0; } else { sY += dY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) break;
      tile = map[mapY][mapX];
      if (tile > 0) {
        dist = side === 0 ? sX - dX : sY - dY;
        hit = true;
        wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
        wallX -= Math.floor(wallX);
        break;
      }
    }
    if (!hit) dist = 100;
    return { dist: dist, side: side, tile: tile, wallX: wallX, rdx: rdx, rdy: rdy };
  }

  function castFloor(d, x, drawEnd, drawStart, dirX, dirY, planeX, planeY, camX) {
    var pitchOff = player.pitch * H * 0.5;
    // floor below
    for (var y = drawEnd + 1; y < H; y++) {
      var rowDist = (0.5 * H) / (y - H / 2 - pitchOff);
      if (rowDist <= 0) continue;
      var stepX = rowDist * (dirX + planeX * camX);
      var stepY = rowDist * (dirY + planeY * camX);
      var fx = player.x + rowDist * (dirX + planeX * camX);
      var fy = player.y + rowDist * (dirY + planeY * camX);
      var tx = Math.floor(TEX * (fx - Math.floor(fx)));
      var ty = Math.floor(TEX * (fy - Math.floor(fy)));
      var c = floorTex[ty * TEX + tx];
      var df = 1 / (1 + rowDist * rowDist * 0.015);
      c = shade(c, Math.min(1, df * 1.5));
      setPx(d, x, y, c);
      // ceiling mirrored
      var cy = H - y - 1;
      if (cy >= 0 && cy < drawStart) {
        var c2 = ceilTex[ty * TEX + tx];
        c2 = shade(c2, Math.min(1, df * 1.1));
        setPx(d, x, cy, c2);
      }
    }
  }

  function drawSprites(d, dirX, dirY, planeX, planeY) {
    var list = [];
    for (var i = 0; i < enemies.length; i++) {
      var en = enemies[i];
      if (en.state === "dead") continue;
      list.push({ type: "enemy", en: en });
    }
    for (var p = 0; p < parts.length; p++) {
      var pa = parts[p];
      list.push({ type: "part", pa: pa });
    }
    // sort by distance descending
    list.sort(function (a, b) {
      var da = distSq(a), db = distSq(b);
      return db - da;
    });
    for (var k = 0; k < list.length; k++) {
      var it = list[k];
      var sx, sy;
      if (it.type === "enemy") {
        sx = it.en.x - player.x; sy = it.en.y - player.y;
      } else {
        sx = it.pa.x - player.x; sy = it.pa.y - player.y;
      }
      var invDet = 1 / (planeX * dirY - dirX * planeY);
      var tx = invDet * (dirY * sx - dirX * sy);
      var ty = invDet * (-planeY * sx + planeX * sy);
      if (ty <= 0.1) continue;
      var screenX = (W / 2) * (1 + tx / ty);
      var size = it.type === "enemy"
        ? Math.abs((H / ty) * 1.1)
        : Math.abs((H / ty) * 0.2);
      if (size < 1) continue;
      var pitchOff = player.pitch * H * 0.5;
      var midY = H / 2 + pitchOff;
      var top = midY - size / 2;
      var bottom = midY + size / 2;
      // skip if behind zbuffer at column center
      var centerCol = Math.floor(screenX);
      if (centerCol >= 0 && centerCol < W && zbuf[centerCol] < ty) continue;

      for (var yy = Math.max(0, Math.floor(top)); yy < Math.min(H, Math.ceil(bottom)); yy++) {
        var texY = Math.floor(((yy - top) / (bottom - top)) * TEX);
        for (var xx = Math.max(0, Math.floor(screenX - size / 2)); xx < Math.min(W, Math.ceil(screenX + size / 2)); xx++) {
          var texX = Math.floor(((xx - (screenX - size / 2)) / size) * TEX);
          var col = it.type === "enemy"
            ? enemyPixel(it.en, texX, texY, yy)
            : shade(it.pa.c, Math.min(1, (it.pa.life / it.pa.max)));
          if (col === 0) continue;
          if (zbuf[xx] > ty) setPx(d, xx, yy, col);
        }
      }
      if (it.type === "enemy") {
        // hp bar
        var en2 = it.en;
        var barW = size * 0.8, barH = 5;
        var barX = screenX - barW / 2, barY = bottom + 6;
        for (var bx = Math.floor(barX); bx < barX + barW && bx < W; bx++) {
          if (bx < 0) continue;
          if (barY >= 0 && barY < H && zbuf[bx] > ty) {
            setPx(d, bx, barY, rgb(40, 40, 40));
            if ((bx - barX) / barW < en2.hp / en2.maxhp) setPx(d, bx, barY, rgb(240, 70, 70));
          }
        }
      }
    }
  }

  function enemyPixel(en, texX, texY, rowY) {
    if (texX < 0 || texY < 0 || texX >= TEX || texY >= TEX) return 0;
    // simple animation: legs/arms shift with bob
    var bob = Math.sin(en.bobT * 6) * 3;
    var c = spriteTex[texY * TEX + texX];
    if (c === 0) return 0;
    // eyes glow red when attacking
    if (en.state === "attack" && texY > 20 && texY < 28 && (Math.abs(texX - 25) < 2 || Math.abs(texX - 38) < 2)) {
      return rgb(255, 40, 40);
    }
    return c;
  }

  function distSq(it) {
    if (it.type === "enemy") {
      var dx = it.en.x - player.x, dy = it.en.y - player.y;
      return dx * dx + dy * dy;
    }
    var pdx = it.pa.x - player.x, pdy = it.pa.y - player.y;
    return pdx * pdx + pdy * pdy;
  }

  function vignette(d) {
    // precompute row factors lazily; cheap approximation
    var cx = W / 2, cy = H / 2;
    var maxD2 = cx * cx + cy * cy;
    for (var y = 0; y < H; y += 2) {
      var dy = y - cy;
      for (var x = 0; x < W; x += 2) {
        var dx = x - cx;
        var v = 1 - 0.5 * (dx * dx + dy * dy) / maxD2;
        if (v < 1) {
          var i = (y * W + x) * 4;
          d[i] = d[i] * v; d[i + 1] = d[i + 1] * v; d[i + 2] = d[i + 2] * v;
        }
      }
    }
  }

  /* ============================ WEAPON VIEWMODEL ============================ */
  function drawWeapon() {
    var c = ctx;
    var scale = sw / W;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, W, H);
    var bob = Math.sin(player.bob * 4) * 3;
    var w = weapons[player.weapon];
    // reload animation
    var reloadShift = player.reloading ? Math.sin(Math.min(1, (w.reload - player.reloadT) / w.reload) * Math.PI) * 60 : 0;
    var yOff = H * 0.78 + bob + reloadShift;
    var xOff = W * 0.34;

    if (player.flash > 0) {
      var g = c.createRadialGradient(W * 0.6, H * 0.72, 2, W * 0.6, H * 0.72, 30);
      g.addColorStop(0, "rgba(255,240,180,0.95)");
      g.addColorStop(1, "rgba(255,120,40,0)");
      c.fillStyle = g;
      c.fillRect(W * 0.55, H * 0.62, W * 0.12, H * 0.18);
    }

    c.save();
    c.translate(xOff, yOff);
    if (player.weapon === 0) drawPistol(c);
    else if (player.weapon === 1) drawShotgun(c);
    else drawRifle(c);
    c.restore();

    // crosshair handled by DOM; draw hitmarker-ish
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawPistol(c) {
    c.fillStyle = "#3a3f4a";
    c.fillRect(40, -16, 90, 34);
    c.fillStyle = "#2a2e38";
    c.fillRect(40, -6, 100, 12);
    c.fillStyle = "#555b68";
    c.fillRect(118, -10, 26, 20);
    c.fillStyle = "#1c1f26";
    c.fillRect(130, -16, 10, 40);
    // slide highlight
    c.fillStyle = "#4a505e";
    c.fillRect(46, -12, 78, 6);
  }
  function drawShotgun(c) {
    c.fillStyle = "#6b4a2a";
    c.fillRect(30, -14, 130, 30);
    c.fillStyle = "#57401f";
    c.fillRect(30, -4, 140, 10);
    c.fillStyle = "#2c2c33";
    c.fillRect(140, -20, 14, 42);
    c.fillStyle = "#7a5a32";
    c.fillRect(44, -18, 80, 10);
  }
  function drawRifle(c) {
    c.fillStyle = "#2f3540";
    c.fillRect(30, -12, 150, 26);
    c.fillStyle = "#232830";
    c.fillRect(30, -2, 160, 8);
    c.fillStyle = "#39404e";
    c.fillRect(150, -16, 40, 8);
    c.fillStyle = "#181c24";
    c.fillRect(170, -20, 8, 20);
    c.fillStyle = "#3d8b4d";
    c.fillRect(70, -18, 10, 8); // sight
  }

  /* ============================ MINIMAP ============================ */
  var mm = document.getElementById("minimap");
  var mmctx = mm.getContext("2d");
  function drawMinimap() {
    var s = mm.width / MAP_W;
    mmctx.fillStyle = "rgba(8,12,20,0.95)";
    mmctx.fillRect(0, 0, mm.width, mm.height);
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        if (map[y][x] > 0) {
          mmctx.fillStyle = map[y][x] === 2 ? "#3a5a86" : map[y][x] === 3 ? "#2a4a6a" : "#5a6478";
          mmctx.fillRect(x * s, y * s, s, s);
        }
      }
    }
    for (var e = 0; e < enemies.length; e++) {
      var en = enemies[e];
      if (en.state === "dead") continue;
      mmctx.fillStyle = en.state === "attack" ? "#ff4a4a" : "#d95252";
      mmctx.beginPath();
      mmctx.arc(en.x * s, en.y * s, 1.8, 0, Math.PI * 2);
      mmctx.fill();
    }
    mmctx.fillStyle = "#ffd94a";
    mmctx.beginPath();
    mmctx.arc(player.x * s, player.y * s, 2.6, 0, Math.PI * 2);
    mmctx.fill();
    mmctx.strokeStyle = "#fff";
    mmctx.lineWidth = 1;
    mmctx.beginPath();
    mmctx.moveTo(player.x * s, player.y * s);
    mmctx.lineTo((player.x + Math.cos(player.a) * 1.6) * s, (player.y + Math.sin(player.a) * 1.6) * s);
    mmctx.stroke();
  }

  /* ============================ ENEMY AI ============================ */
  function stepEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var en = enemies[i];
      en.bobT += dt;
      en.fireT -= dt;
      if (en.state === "dead") {
        en.deadT -= dt;
        if (en.deadT <= 0) {
          enemies.splice(i, 1);
          i--;
        }
        continue;
      }
      var dx = player.x - en.x, dy = player.y - en.y;
      var dist = Math.hypot(dx, dy);
      var canSee = lineOfSight(en.x, en.y, player.x, player.y);
      en.t -= dt;

      if (dist < 7 && canSee) {
        if (en.state !== "attack") { en.state = "attack"; en.t = 0.4; }
        // attack: shoot at player
        if (en.fireT <= 0) {
          en.fireT = 1.1 - scoreTier() * 0.05;
          en.angle = Math.atan2(dy, dx);
          hurtPlayer(6 + scoreTier() * 2);
          playHurt();
        }
        // strafe a little
        var strafe = Math.sin(en.t * 3) * 0.6;
        moveEnemy(en, Math.cos(en.angle + Math.PI / 2) * strafe * dt, Math.sin(en.angle + Math.PI / 2) * strafe * dt, dt);
        moveEnemy(en, dx / dist * en.speed * dt, dy / dist * en.speed * dt, dt);
      } else if (dist < 16 && canSee) {
        en.state = "chase";
        en.angle = Math.atan2(dy, dx);
        moveEnemy(en, dx / dist * en.speed * dt, dy / dist * en.speed * dt, dt);
      } else {
        // patrol: wander toward patrol point
        if (en.state !== "patrol" || en.t <= 0) {
          en.state = "patrol";
          if (en.t <= 0) {
            en.px = clampTile(en.x + (Math.random() - 0.5) * 4);
            en.py = clampTile(en.y + (Math.random() - 0.5) * 4);
            en.t = 3 + Math.random() * 3;
          }
        }
        var pdx = en.px - en.x, pdy = en.py - en.y;
        var pd = Math.hypot(pdx, pdy);
        if (pd > 0.3) {
          moveEnemy(en, pdx / pd * en.speed * 0.5 * dt, pdy / pd * en.speed * 0.5 * dt, dt);
          en.angle = Math.atan2(pdy, pdx);
        }
      }
    }
  }

  function clampTile(v) {
    return Math.max(1, Math.min(MAP_W - 1, v));
  }

  function moveEnemy(en, dx, dy, dt) {
    // slide along walls
    if (!isWall(en.x + dx, en.y) && !isWall(en.x + dx + 0.2, en.y + 0.2)) en.x += dx;
    else if (!isWall(en.x + dx, en.y + 0.2) && !isWall(en.x + dx, en.y - 0.2)) en.x += dx * 0.4;
    if (!isWall(en.x, en.y + dy) && !isWall(en.x + 0.2, en.y + dy + 0.2)) en.y += dy;
    else if (!isWall(en.x + 0.2, en.y + dy) && !isWall(en.x - 0.2, en.y + dy)) en.y += dy * 0.4;
    en.x = clampTile(en.x); en.y = clampTile(en.y);
  }

  function lineOfSight(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var steps = Math.ceil(dist * 4);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (isWall(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  function hurtPlayer(dmg) {
    if (!player.alive) return;
    player.hp -= dmg;
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      showDeath();
    }
    updateHud();
  }

  function showDeath() {
    document.exitPointerLock && document.exitPointerLock();
    overlay.style.display = "flex";
    var card = overlay.querySelector("h1");
    card.textContent = "YOU DIED";
    card.innerHTML = "YOU <span>DIED</span>";
    var sub = overlay.querySelector(".sub");
    sub.textContent = "Score: " + player.score + "  ·  Kills: " + player.kills +
      "  ·  Best: " + best;
    var hint = overlay.querySelector(".hint");
    hint.textContent = "Press Enter or click to respawn.";
    var btn = document.getElementById("btnStart");
    btn.textContent = "RESPAWN";
    btn.onclick = function () {
      respawn();
      btn.onclick = null;
      btn.textContent = "CLICK TO START";
    };
    // restore overlay default title when starting fresh
    overlay.querySelector("h1").innerHTML = "RAYCAST <span>FPS</span>";
    overlay.querySelector(".sub").textContent = "Original software-rendered first-person shooter";
    overlay.querySelector(".hint").textContent = "You need a mouse. Click the canvas to capture the pointer.";
  }

  function updateHud() {
    hpEl.textContent = Math.max(0, Math.round(player.hp));
    scoreEl.textContent = player.score;
    killsEl.textContent = player.kills;
  }

  /* ============================ GAME LOOP ============================ */
  var last = 0;
  var running = false;

  function startRun() {
    parseMap();
    buildTextures();
    player.hp = 100; player.score = 0; player.kills = 0; player.alive = true;
    player.x = 2.5; player.y = 2.5; player.a = 0; player.pitch = 0;
    player.bob = 0; player.flash = 0;
    parts = [];
    spawnEnemies();
    switchWeapon(0);
    updateHud();
    bestScoreEl.textContent = best;
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // mouse look
    var sens = 0.0022;
    player.a += mouseDx * sens;
    player.pitch -= mouseDy * sens;
    player.pitch = Math.max(-0.7, Math.min(0.7, player.pitch));
    mouseDx = 0; mouseDy = 0;

    if (player.alive) {
      // movement
      var fwd = 0, strafe = 0;
      if (keys["KeyW"] || keys["ArrowUp"]) fwd += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) fwd -= 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) strafe -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) strafe += 1;
      var speed = MOVE_SPEED * (keys["ShiftLeft"] || keys["ShiftRight"] ? 0.45 : 1);
      if (fwd && strafe) speed *= 0.7071;
      var ca = Math.cos(player.a), sa = Math.sin(player.a);
      var mx = (ca * fwd - sa * strafe) * speed * dt;
      var my = (sa * fwd + ca * strafe) * speed * dt;
      movePlayer(mx, my);

      // hop
      player.hopV -= 9 * dt;
      player.hopZ += player.hopV * dt;
      if (player.hopZ <= 0) { player.hopZ = 0; player.hopV = 0; }

      // firing
      player.fireT -= dt;
      if (player.flash > 0) player.flash -= dt;
      var w = weapons[player.weapon];
      if (mouseDown) {
        if (w.auto || !lastFired) fire(false);
        lastFired = true;
      } else if (altDown) {
        fire(true);
      } else {
        lastFired = false;
      }
      if (player.reloading) {
        player.reloadT -= dt;
        if (player.reloadT <= 0) finishReload();
      }
    }

    stepEnemies(dt);
    stepParts(dt);

    if (player.alive) player.bob += Math.hypot(
      Math.cos(player.a) * (keys["KeyW"] ? 1 : 0) + Math.sin(player.a) * (keys["KeyD"] ? 1 : 0), 0) * 0;
    if ((keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"]) && player.alive) {
      player.bob += dt * 7;
    }
  }

  var lastFired = false;

  function movePlayer(mx, my) {
    var r = PLAYER_R;
    if (!isWall(player.x + mx, player.y) && !isWall(player.x + mx + r, player.y + r) && !isWall(player.x + mx - r, player.y - r)) {
      player.x += mx;
    } else {
      player.x += mx * 0.2;
    }
    if (!isWall(player.x, player.y + my) && !isWall(player.x + r, player.y + my + r) && !isWall(player.x - r, player.y + my - r)) {
      player.y += my;
    } else {
      player.y += my * 0.2;
    }
    player.x = Math.max(0.5, Math.min(MAP_W - 0.5, player.x));
    player.y = Math.max(0.5, Math.min(MAP_H - 0.5, player.y));
  }

  function normAng(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /* ============================ BOOT ============================ */
  parseMap();
  buildTextures();
  bestScoreEl.textContent = best;
  render(); // draw a frame behind the overlay

  // expose for debugging
  window.__fps = { get player() { return player; }, get enemies() { return enemies; } };
})();
