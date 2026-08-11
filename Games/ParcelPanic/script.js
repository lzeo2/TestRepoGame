(function () {
  "use strict";

  /* ================================================================
     Parcel Panic — top-down 2-4 player parcel delivery race.
     Grab parcels, deliver each to its matching drop zone. Zones shift
     and recolor mid-match; wrong-zone deliveries cost points.
     ================================================================ */

  // ---------- tiny helpers ----------
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[rndi(0, arr.length - 1)]; }

  // ---------- arena constants ----------
  var W = 900, H = 620;          // logical canvas size
  var M = 18;                    // wall margin
  var ZW = 170, ZH = 120;        // drop-zone size
  var SLOT_COLS = [120, 280, 450, 620, 780];
  var SLOT_ROWS = [100, 240, 380, 520];
  var SLOTS = [];
  for (var ri = 0; ri < SLOT_ROWS.length; ri++) {
    for (var ci = 0; ci < SLOT_COLS.length; ci++) {
      SLOTS.push({ x: SLOT_COLS[ci], y: SLOT_ROWS[ri] });
    }
  }

  var ZONE_INFO = [
    { name: "RED",    rgb: "255,92,92" },
    { name: "BLUE",   rgb: "77,141,255" },
    { name: "GREEN",  rgb: "70,224,140" },
    { name: "PURPLE", rgb: "197,107,255" }
  ];

  var PLAYER_COLORS = ["#4dd2ff", "#ffd94a", "#ff8ad4", "#7dff8a"];
  var PLAYER_NAMES = ["P1", "P2", "P3", "P4"];

  // Keyboard bindings per player slot (slots 0..3).
  var KEYMAP = [
    { up: "KeyW",    down: "KeyS",    left: "KeyA", right: "KeyD", act: "Space" },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", act: "Enter" },
    { up: "KeyI",    down: "KeyK",    left: "KeyJ", right: "KeyL", act: "KeyO" },
    { up: "KeyT",    down: "KeyG",    left: "KeyF", right: "KeyH", act: "KeyY" }
  ];

  var SCORE_GOOD = 100;
  var SCORE_BAD = -75;
  var PLAYER_SPEED = 245;
  var BOT_SPEED_FACTOR = 0.9;

  // ---------- DOM ----------
  var canvas = $("game");
  var ctx = canvas.getContext("2d");
  var screenMenu = $("screen-menu");
  var screenGame = $("screen-game");
  var screenResult = $("screen-result");
  var hudEl = $("hud");
  var controlsEl = $("controls");
  var gameHintEl = $("gameHint");

  // ---------- state ----------
  var mode = "menu";             // menu | countdown | play | over
  var cfg = { players: 4, bots: 1, time: 90 };
  var players = [];              // live player list (humans + bots), order = slot order
  var zones = [];
  var parcels = [];
  var floaters = [];
  var keysDown = {};
  var touch = [];                // per-slot touch direction state
  var shiftTimer = 12;
  var timeLeft = 90;
  var countdownT = 0;
  var banner = { text: "", t: 0 };
  var shake = 0;
  var last = 0;
  var stats = { best: 0, games: 0 };
  var statsKey = "parcelpanic_stats";
  var tmpId = 0;

  // ---------- localStorage ----------
  try {
    var saved = JSON.parse(localStorage.getItem(statsKey) || "null");
    if (saved) stats = saved;
  } catch (e) { /* ignore */ }

  function saveStats() {
    try { localStorage.setItem(statsKey, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  /* ================================================================
     Zone / parcel construction
     ================================================================ */

  function slotPos(i) { return SLOTS[i]; }

  function pickZoneSlots() {
    // Pick 4 distinct slots with a decent gap between each other.
    for (var tries = 0; tries < 120; tries++) {
      var ids = [];
      var ok = true;
      while (ids.length < 4) {
        var s = rndi(0, SLOTS.length - 1);
        if (ids.indexOf(s) !== -1) continue;
        var good = true;
        for (var k = 0; k < ids.length; k++) {
          if (dist(SLOTS[s].x, SLOTS[s].y, SLOTS[ids[k]].x, SLOTS[ids[k]].y) < 260) {
            good = false;
            break;
          }
        }
        if (good) ids.push(s);
        else { ok = false; break; }
      }
      if (ok && ids.length === 4) {
        return ids.map(function (id) { return { x: SLOTS[id].x, y: SLOTS[id].y }; });
      }
    }
    // Fallback: even spread of the four corners.
    return [
      { x: 120, y: 100 }, { x: 780, y: 100 },
      { x: 120, y: 520 }, { x: 780, y: 520 }
    ];
  }

  function buildZones() {
    zones = [];
    var slots = pickZoneSlots();
    for (var i = 0; i < 4; i++) {
      zones.push({
        id: i,
        name: ZONE_INFO[i].name,
        rgb: ZONE_INFO[i].rgb,
        x: slots[i].x - ZW / 2,
        y: slots[i].y - ZH / 2,
        slideT: 1, slideDur: 1,
        sx: slots[i].x - ZW / 2, sy: slots[i].y - ZH / 2,
        ex: slots[i].x - ZW / 2, ey: slots[i].y - ZH / 2
      });
    }
  }

  function zoneCenter(z) { return { x: z.x + ZW / 2, y: z.y + ZH / 2 }; }

  function zoneAt(x, y) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (x > z.x && x < z.x + ZW && y > z.y && y < z.y + ZH) return z;
    }
    return null;
  }

  function colorWithAlpha(rgb, a) {
    return "rgba(" + rgb + "," + a + ")";
  }

  function randomSpawnPoint(avoidZones, avoidDist) {
    for (var tries = 0; tries < 40; tries++) {
      var x = rnd(M + 24, W - M - 24);
      var y = rnd(M + 24, H - M - 24);
      var ok = true;
      if (avoidZones) {
        for (var i = 0; i < zones.length; i++) {
          var z = zones[i];
          if (x > z.x - 26 && x < z.x + ZW + 26 && y > z.y - 26 && y < z.y + ZH + 26) {
            ok = false;
            break;
          }
        }
      }
      if (ok && avoidDist) {
        for (var j = 0; j < players.length; j++) {
          if (dist(x, y, players[j].x, players[j].y) < avoidDist) { ok = false; break; }
        }
      }
      if (ok) return { x: x, y: y };
    }
    return { x: W / 2 + rnd(-100, 100), y: H / 2 + rnd(-100, 100) };
  }

  function maxParcels() { return 2 + players.length; }

  function makeParcel(at) {
    var pos = at || randomSpawnPoint(true, 60);
    var target = rndi(0, zones.length - 1);
    return {
      id: ++tmpId,
      x: pos.x, y: pos.y,
      target: target,
      carrier: null,
      respawn: 0,
      hidden: false
    };
  }

  function spawnParcels() {
    parcels = [];
    for (var i = 0; i < maxParcels(); i++) {
      parcels.push(makeParcel());
    }
  }

  /* ================================================================
     Players
     ================================================================ */

  function buildPlayers() {
    players = [];
    var humans = cfg.players;
    var total = cfg.bots ? Math.max(humans, 4) : humans;
    var spawns = [
      { x: 60, y: 60 }, { x: W - 60, y: 60 },
      { x: 60, y: H - 60 }, { x: W - 60, y: H - 60 }
    ];
    for (var i = 0; i < total; i++) {
      var s = spawns[i % 4];
      players.push({
        slot: i,
        human: i < humans,
        x: s.x, y: s.y,
        r: 13,
        color: PLAYER_COLORS[i],
        name: PLAYER_NAMES[i],
        score: 0,
        delivered: 0,
        wrong: 0,
        carrying: null,
        botCd: 0,
        wanderT: 0,
        wx: 0, wy: 0
      });
    }
  }

  function humanInput(p) {
    var k = KEYMAP[p.slot];
    return {
      up: keysDown[k.up] || touch[p.slot].up,
      down: keysDown[k.down] || touch[p.slot].down,
      left: keysDown[k.left] || touch[p.slot].left,
      right: keysDown[k.right] || touch[p.slot].right
    };
  }

  function botInput(p, dt) {
    var inp = { up: false, down: false, left: false, right: false };
    var tx, ty;
    if (!p.carrying) {
      // Head for the nearest free parcel.
      var best = null, bd = 1e9;
      for (var i = 0; i < parcels.length; i++) {
        var par = parcels[i];
        if (par.hidden || par.carrier) continue;
        var d = dist(p.x, p.y, par.x, par.y);
        if (d < bd) { bd = d; best = par; }
      }
      if (best) { tx = best.x; ty = best.y; }
      else {
        // Wander a bit while waiting for a new parcel.
        p.wanderT -= dt;
        if (p.wanderT <= 0) {
          var pos = randomSpawnPoint(true, 0);
          p.wx = pos.x; p.wy = pos.y;
          p.wanderT = rnd(1.5, 3);
        }
        tx = p.wx; ty = p.wy;
      }
    } else {
      var z = zones[p.carrying.target];
      tx = z.x + ZW / 2;
      ty = z.y + ZH / 2;
      // Deliver once inside the target zone.
      if (zoneAt(p.x, p.y) === z) {
        p.botCd -= dt;
        if (p.botCd <= 0) {
          tryDeliver(p);
          p.botCd = rnd(0.15, 0.35);
        }
      }
    }
    var dx = tx - p.x, dy = ty - p.y;
    var d = Math.hypot(dx, dy);
    if (d > 2) {
      var nx = dx / d, ny = dy / d;
      if (Math.abs(nx) > 0.2) { if (nx > 0) inp.right = true; else inp.left = true; }
      if (Math.abs(ny) > 0.2) { if (ny > 0) inp.down = true; else inp.up = true; }
    }
    return inp;
  }

  /* ================================================================
     Core mechanics
     ================================================================ */

  function tryPickup(p) {
    if (p.carrying) return;
    for (var i = 0; i < parcels.length; i++) {
      var par = parcels[i];
      if (par.hidden || par.carrier) continue;
      if (dist(p.x, p.y, par.x, par.y) < p.r + 14) {
        par.carrier = p;
        p.carrying = par;
        return;
      }
    }
  }

  function tryDeliver(p) {
    if (!p.carrying) return;
    var z = zoneAt(p.x, p.y);
    if (!z) {
      addFloater(p.x, p.y - 30, "Step into a zone!", "#ffd94a");
      return;
    }
    var par = p.carrying;
    if (z.id === par.target) {
      p.score += SCORE_GOOD;
      p.delivered++;
      addFloater(p.x, p.y - 34, "+" + SCORE_GOOD, "#7dff8a");
      p.carrying = null;
      par.carrier = null;
      par.hidden = true;
      par.respawn = 1.6;   // restock a new parcel shortly
    } else {
      p.score += SCORE_BAD;
      p.wrong++;
      addFloater(p.x, p.y - 34, "WRONG! " + SCORE_BAD, "#ff6b6b");
      shake = 0.3;
      p.carrying = null;
      par.carrier = null;
      par.hidden = true;
      par.respawn = 1.1;   // parcel comes back at a new spot, rerouted
    }
    updateHud();
  }

  function movePlayer(p, dt, inp, speed) {
    var ax = 0, ay = 0;
    if (inp.up) ay -= 1;
    if (inp.down) ay += 1;
    if (inp.left) ax -= 1;
    if (inp.right) ax += 1;
    if (ax !== 0 || ay !== 0) {
      var d = Math.hypot(ax, ay);
      ax /= d; ay /= d;
      p.x += ax * speed * dt;
      p.y += ay * speed * dt;
      // diagonal travel at same speed as straight
      p.x = clamp(p.x, M, W - M);
      p.y = clamp(p.y, M, H - M);
    }
  }

  function separatePlayers() {
    for (var i = 0; i < players.length; i++) {
      for (var j = i + 1; j < players.length; j++) {
        var a = players[i], b = players[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.hypot(dx, dy);
        var min = a.r + b.r;
        if (d < min && d > 0.001) {
          var push = (min - d) / 2;
          var nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  /* ================================================================
     Zone shifts
     ================================================================ */

  function doZoneShift() {
    var slots = pickZoneSlots();
    var colorsChanged = Math.random() < 0.5;
    var swapA = rndi(0, zones.length - 1);
    var swapB;
    do { swapB = rndi(0, zones.length - 1); } while (swapB === swapA);

    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      z.sx = z.x; z.sy = z.y;
      z.ex = slots[i].x - ZW / 2;
      z.ey = slots[i].y - ZH / 2;
      z.slideT = 0;
      z.slideDur = 1.15;
    }
    if (colorsChanged) {
      var a = zones[swapA], b = zones[swapB];
      var tmpName = a.name, tmpRgb = a.rgb;
      a.name = b.name; a.rgb = b.rgb;
      b.name = tmpName; b.rgb = tmpRgb;
      // Reroute most floor parcels to keep the scramble fair.
      for (var k = 0; k < parcels.length; k++) {
        var par = parcels[k];
        if (!par.hidden && !par.carrier && Math.random() < 0.65) {
          par.target = rndi(0, zones.length - 1);
          addFloater(par.x, par.y - 18, "REROUTED", "#ffb84d");
        }
      }
      banner.text = "ZONES SHIFTED + COLOR SWAP!";
    } else {
      banner.text = "ZONES SHIFTED!";
    }
    banner.t = 2.0;
    shake = 0.25;
  }

  function updateZones(dt) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (z.slideT < 1) {
        z.slideT = Math.min(1, z.slideT + dt / z.slideDur);
        var t = z.slideT;
        var e = 1 - (1 - t) * (1 - t); // ease-out
        z.x = z.sx + (z.ex - z.sx) * e;
        z.y = z.sy + (z.ey - z.sy) * e;
      }
    }
  }

  /* ================================================================
     Floating text + banner
     ================================================================ */

  function addFloater(x, y, text, color) {
    floaters.push({ x: x, y: y, text: text, color: color, t: 1.0 });
    if (floaters.length > 30) floaters.shift();
  }

  function updateFloaters(dt) {
    for (var i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.t -= dt * 1.1;
      f.y -= 34 * dt;
      if (f.t <= 0) floaters.splice(i, 1);
    }
    if (banner.t > 0) banner.t -= dt;
  }

  /* ================================================================
     Match flow
     ================================================================ */

  function resetMatch() {
    buildZones();
    buildPlayers();
    spawnParcels();
    floaters = [];
    for (var i = 0; i < players.length; i++) touch[i] = { up: false, down: false, left: false, right: false };
    timeLeft = cfg.time;
    shiftTimer = rnd(10, 13);
    banner = { text: "", t: 0 };
    shake = 0;
    countdownT = 3.2;
    mode = "countdown";
    buildHud();
    buildTouchControls();
    showScreen("game");
    updateHud();
  }

  function endMatch() {
    mode = "over";
    stats.games++;
    var bestScore = 0;
    for (var i = 0; i < players.length; i++) bestScore = Math.max(bestScore, players[i].score);
    if (bestScore > stats.best) stats.best = bestScore;
    saveStats();
    showResult();
  }

  function showResult() {
    var sorted = players.slice().sort(function (a, b) { return b.score - a.score; });
    var title = "Time's Up!";
    if (players.length > 1 && sorted[0].score !== sorted[1].score) {
      title = sorted[0].name + " WINS!";
    } else if (players.length === 1) {
      title = "Run Complete";
    }
    $("resultTitle").textContent = title;

    var list = $("resultList");
    list.innerHTML = "";
    var places = ["1st", "2nd", "3rd", "4th", "5th"];
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var row = document.createElement("div");
      row.className = "res-row" + (i === 0 ? " first" : "");
      var who = p.human ? p.name : p.name + " (bot)";
      row.innerHTML =
        '<span class="place">' + (places[i] || (i + 1) + "th") + '</span>' +
        '<span class="who" style="color:' + p.color + '">' + who +
          '<span class="sub2">' + p.delivered + " delivered &middot; " + p.wrong + " wrong</span>" +
        "</span>" +
        '<span class="pts" style="color:' + p.color + '">' + p.score + "</span>";
      list.appendChild(row);
    }
    showScreen("result");
  }

  /* ================================================================
     Screens + HUD + touch controls
     ================================================================ */

  function showScreen(name) {
    screenMenu.classList.add("hidden");
    screenGame.classList.add("hidden");
    screenResult.classList.add("hidden");
    if (name === "menu") screenMenu.classList.remove("hidden");
    if (name === "game") screenGame.classList.remove("hidden");
    if (name === "result") screenResult.classList.remove("hidden");
  }

  function buildHud() {
    hudEl.innerHTML = "";
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var chip = document.createElement("div");
      chip.className = "chip" + (p.human ? "" : " bot");
      chip.id = "chip" + p.slot;
      chip.innerHTML =
        '<span class="name" style="color:' + p.color + '">' + p.name + (p.human ? "" : "&nbsp;·&nbsp;bot") + "</span>" +
        '<span class="score">0</span>' +
        '<span class="parcel-dot empty"></span>';
      hudEl.appendChild(chip);
    }
    var timerChip = document.createElement("div");
    timerChip.className = "chip timer";
    timerChip.id = "chipTimer";
    timerChip.innerHTML = '<span class="name">TIME</span><span class="score">1:30</span>';
    hudEl.appendChild(timerChip);
  }

  function updateHud() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var chip = $("chip" + p.slot);
      if (!chip) continue;
      chip.querySelector(".score").textContent = p.score;
      var dot = chip.querySelector(".parcel-dot");
      if (p.carrying) {
        dot.classList.remove("empty");
        dot.style.background = colorWithAlpha(zones[p.carrying.target].rgb, 0.9);
        dot.style.borderColor = "rgba(255,255,255,0.9)";
      } else {
        dot.classList.add("empty");
        dot.style.background = "transparent";
      }
    }
    var t = Math.max(0, Math.ceil(timeLeft));
    var tc = $("chipTimer");
    tc.querySelector(".score").textContent = Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2);
    tc.classList.toggle("low", timeLeft <= 10);
  }

  function buildTouchControls() {
    controlsEl.innerHTML = "";
    gameHintEl.textContent = "";
    var hints = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (!p.human) continue;
      var k = KEYMAP[p.slot];
      var pad = document.createElement("div");
      pad.className = "pad";
      pad.innerHTML =
        '<span class="plabel" style="color:' + p.color + '">' + p.name + " &middot; " +
        k.up.replace("Key", "").replace("Arrow", "") + "/" +
        k.down.replace("Key", "").replace("Arrow", "") + "/" +
        k.left.replace("Key", "").replace("Arrow", "") + "/" +
        k.right.replace("Key", "").replace("Arrow", "") +
        " + " + (k.act === "Space" ? "SPACE" : k.act === "Enter" ? "ENTER" : k.act.replace("Key", "")) +
        '</span>' +
        '<div class="dpad">' +
          '<button class="dbtn up" type="button" aria-label="up">&#9650;</button>' +
          '<button class="dbtn left" type="button" aria-label="left">&#9664;</button>' +
          '<button class="dbtn act" type="button" aria-label="deliver">DELIVER</button>' +
          '<button class="dbtn right" type="button" aria-label="right">&#9654;</button>' +
          '<button class="dbtn down" type="button" aria-label="down">&#9660;</button>' +
        "</div>";
      controlsEl.appendChild(pad);

      var btns = pad.querySelectorAll(".dbtn");
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener("pointerdown", onPadDown(p.slot, btns[b]));
        btns[b].addEventListener("pointerup", onPadUp(p.slot, btns[b]));
        btns[b].addEventListener("pointercancel", onPadUp(p.slot, btns[b]));
        btns[b].addEventListener("pointerleave", onPadUp(p.slot, btns[b]));
      }
      hints.push(p.name + " " + k.up.replace("Key", "") + k.left.replace("Key", "") + k.down.replace("Key", "") + k.right.replace("Key", "") +
        "+" + (k.act === "Space" ? "SPACE" : k.act === "Enter" ? "ENTER" : k.act.replace("Key", "")));
    }
    if (players.length > 0) {
      gameHintEl.textContent = "Keyboard: " + hints.join("  &middot;  ").replace(/&middot;/g, "·") + "  ·  Touch: on-screen pads below";
    }
  }

  function onPadDown(slot, btn) {
    return function (e) {
      e.preventDefault();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      btn.classList.add("on");
      var dir = btn.getAttribute("aria-label");
      if (dir === "deliver") {
        var p = players[slot];
        if (p && mode === "play") tryDeliver(p);
      } else if (touch[slot]) {
        touch[slot][dir] = true;
      }
    };
  }

  function onPadUp(slot, btn) {
    return function (e) {
      e.preventDefault();
      btn.classList.remove("on");
      var dir = btn.getAttribute("aria-label");
      if (touch[slot] && dir !== "deliver") touch[slot][dir] = false;
    };
  }

  /* ================================================================
     Menu config
     ================================================================ */

  function bindSeg(rowId, key, callback) {
    var row = $(rowId);
    row.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg");
      if (!btn) return;
      var val = parseInt(btn.getAttribute("data-" + key), 10);
      cfg[key] = val;
      var segs = row.querySelectorAll(".seg");
      for (var i = 0; i < segs.length; i++) segs[i].classList.toggle("active", segs[i] === btn);
      if (callback) callback();
    });
  }

  function bindMenu() {
    bindSeg("playersRow", "players");
    bindSeg("botsRow", "bots");
    bindSeg("timeRow", "time");
    $("menuBest").textContent = stats.best;
    $("menuGames").textContent = stats.games;
  }

  /* ================================================================
     Main loop
     ================================================================ */

  function update(dt) {
    if (mode === "countdown") {
      countdownT -= dt;
      if (countdownT <= 0) {
        countdownT = 0;
        mode = "play";
      }
      return;
    }
    if (mode !== "play") return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endMatch();
      return;
    }

    // movement
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var inp = p.human ? humanInput(p) : botInput(p, dt);
      var speed = p.human ? PLAYER_SPEED : PLAYER_SPEED * BOT_SPEED_FACTOR;
      movePlayer(p, dt, inp, speed);
      tryPickup(p);
    }
    separatePlayers();

    updateZones(dt);
    updateFloaters(dt);
    if (shake > 0) shake -= dt;

    // zone shifts
    shiftTimer -= dt;
    if (shiftTimer <= 0) {
      doZoneShift();
      shiftTimer = rnd(11, 15);
    }

    // parcel restocks
    for (var j = 0; j < parcels.length; j++) {
      var par = parcels[j];
      if (par.hidden) {
        par.respawn -= dt;
        if (par.respawn <= 0) {
          var pos = randomSpawnPoint(true, 60);
          par.x = pos.x; par.y = pos.y;
          par.target = rndi(0, zones.length - 1);
          par.hidden = false;
        }
      }
    }
    // keep the floor stocked up to the cap
    var active = 0;
    for (var k = 0; k < parcels.length; k++) if (!parcels[k].hidden) active++;
    if (active < maxParcels()) {
      var p2 = makeParcel();
      p2.respawn = 0;
      parcels.push(p2);
    }

    updateHud();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // floor
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#101a24");
    grad.addColorStop(1, "#0c141c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= W; gx += 45) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (var gy = 0; gy <= H; gy += 45) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();

    // outer wall
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(M - 2, M - 2, W - 2 * M + 4, H - 2 * M + 4);

    // zones
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      ctx.save();
      ctx.beginPath();
      roundRect(z.x, z.y, ZW, ZH, 14);
      ctx.fillStyle = colorWithAlpha(z.rgb, 0.30);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(z.rgb, 0.95);
      ctx.lineWidth = 3;
      ctx.stroke();
      // hatch marks
      ctx.clip();
      ctx.strokeStyle = colorWithAlpha(z.rgb, 0.12);
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (var hx = z.x - ZH; hx < z.x + ZW + ZH; hx += 26) {
        ctx.moveTo(hx, z.y + ZH);
        ctx.lineTo(hx + ZH, z.y);
      }
      ctx.stroke();
      ctx.restore();
      // label
      ctx.fillStyle = colorWithAlpha(z.rgb, 1);
      ctx.font = "bold 17px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(z.name, z.x + ZW / 2, z.y + ZH / 2);
    }

    // parcels
    for (var pi = 0; pi < parcels.length; pi++) {
      var par = parcels[pi];
      if (par.hidden) continue;
      drawParcel(par);
    }

    // players
    for (var pl = 0; pl < players.length; pl++) {
      drawPlayer(players[pl]);
    }

    // floaters
    for (var fi = 0; fi < floaters.length; fi++) {
      var f = floaters[fi];
      ctx.globalAlpha = clamp(f.t * 1.6, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // banner
    if (banner.t > 0) {
      ctx.globalAlpha = Math.min(1, banner.t * 1.8);
      ctx.fillStyle = "rgba(10,16,24,0.85)";
      roundRect(W / 2 - 200, 70, 400, 46, 12);
      ctx.fill();
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 93);
      ctx.globalAlpha = 1;
    }

    // time bar
    var frac = clamp(timeLeft / cfg.time, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = frac > 0.25 ? "#7dd3ff" : "#ff6b6b";
    ctx.fillRect(0, 0, W * frac, 6);

    // countdown
    if (mode === "countdown") {
      ctx.fillStyle = "rgba(8,13,20,0.55)";
      ctx.fillRect(0, 0, W, H);
      var n = Math.max(1, Math.ceil(countdownT));
      var fracT = countdownT - Math.floor(countdownT);
      ctx.globalAlpha = clamp(fracT * 3, 0, 1);
      ctx.fillStyle = n === 1 ? "#7dff8a" : "#ffd94a";
      ctx.font = "bold 120px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), W / 2, H / 2 - 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("GRAB PARCELS \u2014 DELIVER!", W / 2, H / 2 + 70);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawParcel(par) {
    var z = zones[par.target];
    if (par.carrier) {
      var px = par.carrier.x, py = par.carrier.y - 26;
      box(px - 13, py - 9, 26, 18, z.rgb);
    } else {
      box(par.x - 13, par.y - 9, 26, 18, z.rgb);
    }
  }

  function box(cx, top, w, h, rgb) {
    ctx.fillStyle = "#c98a4b";
    ctx.strokeStyle = "#5c3a1e";
    ctx.lineWidth = 2;
    roundRect(cx, top, w, h, 4);
    ctx.fill();
    ctx.stroke();
    // ribbon showing the destination zone colour
    ctx.fillStyle = colorWithAlpha(rgb, 1);
    roundRect(cx + 2, top + 2, w - 4, 6, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPlayer(p) {
    var bob = Math.sin(last * 0.008) * 1.5;
    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();

    // direction nub
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob - 5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // carrying parcel is drawn by drawParcel above the head
    if (p.human) {
      ctx.fillStyle = p.color;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(p.name, p.x, p.y + bob + p.r + 10);
    }
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ================================================================
     Keyboard input
     ================================================================ */

  window.addEventListener("keydown", function (e) {
    if (mode === "menu") {
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        startMatch();
      }
      return;
    }
    if (mode === "over") {
      if (e.code === "KeyR") { e.preventDefault(); resetMatch(); }
      if (e.code === "Escape") { e.preventDefault(); toMenu(); }
      return;
    }
    // countdown / play
    var was = !!keysDown[e.code];
    keysDown[e.code] = true;
    if (e.code === "Escape") {
      e.preventDefault();
      toMenu();
      return;
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      resetMatch();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) !== -1) {
      e.preventDefault();
    }
    // deliver action on fresh press
    if (mode === "play" && !e.repeat && !was) {
      for (var i = 0; i < players.length; i++) {
        if (!players[i].human) continue;
        if (KEYMAP[players[i].slot].act === e.code) {
          tryDeliver(players[i]);
        }
      }
    }
  });

  window.addEventListener("keyup", function (e) {
    keysDown[e.code] = false;
  });

  window.addEventListener("blur", function () {
    keysDown = {};
  });

  function startMatch() {
    resetMatch();
  }

  function toMenu() {
    mode = "menu";
    $("menuBest").textContent = stats.best;
    $("menuGames").textContent = stats.games;
    showScreen("menu");
  }

  // Read-only snapshot so automated checks can verify live state.
  window.__ppState = function () {
    return {
      mode: mode,
      cfg: { players: cfg.players, bots: cfg.bots, time: cfg.time },
      timeLeft: timeLeft,
      shiftTimer: shiftTimer,
      players: players.map(function (p) {
        return {
          slot: p.slot, human: p.human, name: p.name,
          x: Math.round(p.x), y: Math.round(p.y),
          score: p.score, delivered: p.delivered, wrong: p.wrong,
          carrying: p.carrying ? p.carrying.target : null
        };
      }),
      zones: zones.map(function (z) {
        return { id: z.id, name: z.name, rgb: z.rgb,
                 x: Math.round(z.x), y: Math.round(z.y) };
      }),
      parcels: parcels.map(function (par) {
        return {
          id: par.id, x: Math.round(par.x), y: Math.round(par.y),
          target: par.target,
          carrier: par.carrier ? par.carrier.slot : null,
          hidden: par.hidden
        };
      }),
      banner: banner.text,
      floaters: floaters.map(function (f) { return f.text; })
    };
  };

  /* ================================================================
     Wire up
     ================================================================ */

  $("startBtn").addEventListener("click", startMatch);
  $("againBtn").addEventListener("click", function () { resetMatch(); });
  $("menuBtn").addEventListener("click", toMenu);
  bindMenu();
  showScreen("menu");
  requestAnimationFrame(loop);
})();
