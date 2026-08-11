(function () {
  "use strict";

  /* ================================================================
     Queue Escape — cooperative 1-4 player queue/station game.
     Customers line up, each wanting a specific food station. Grab the
     front customer, read the order bubble, and route them to the right
     station before their patience bar empties. Every correct serve
     feeds a team combo. Furious customers cost lives.
     ================================================================ */

  // ---------- tiny helpers ----------
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------- arena constants ----------
  var W = 900, H = 620;          // logical canvas size
  var M = 16;                    // wall margin
  var HEAD = { x: 300, y: 310 }; // where the front customer waits
  var SLOT_DX = 58;              // spacing between waiting customers
  var MAX_QUEUE = 6;             // longest line (spawning pauses beyond)
  var MAX_CUSTOMERS = 9;         // total customers alive at once
  var GRAB_RADIUS = 84;          // how close to the head to grab
  var SERVE_RADIUS = 78;         // how close to a station to serve
  var PLAYER_SPEED = 250;

  var QUEUE_DRAIN = 6.2;         // patience/s for a waiting customer
  var QUEUE_DRAIN_PER_SLOT = 3.4; // extra drain per place further back
  var CARRIED_DRAIN = 15.5;      // patience/s while being carried
  var SERVE_TIME = 0.7;          // seconds a correct serve takes
  var COMBO_WINDOW = 6;          // seconds to keep the combo alive
  var START_LIVES = 3;

  var BASE_SCORE = 100;          // score of a correct serve at combo 1
  var COMBO_STEP = 25;           // extra points per combo level
  var COMBO_CAP = 400;           // max points for a single serve
  var WRONG_PENALTY = 60;        // points lost on a wrong station

  var STATIONS = [
    { type: 0, label: "🍔", name: "BURGER",  rgb: "255,107,107", x: 585, y: 150, w: 140, h: 112 },
    { type: 1, label: "🍕", name: "PIZZA",   rgb: "90,155,255",  x: 750, y: 150, w: 140, h: 112 },
    { type: 2, label: "🍦", name: "CREAM",   rgb: "84,224,138",  x: 585, y: 420, w: 140, h: 112 },
    { type: 3, label: "🍩", name: "DONUT",   rgb: "255,217,74",  x: 750, y: 420, w: 140, h: 112 }
  ];

  var PLAYER_COLORS = ["#4dd2ff", "#ff9d4d", "#d18bff", "#7dff8a"];
  var PLAYER_NAMES = ["P1", "P2", "P3", "P4"];

  // Keyboard bindings per player slot (slots 0..3).
  var KEYMAP = [
    { up: "KeyW",    down: "KeyS",    left: "KeyA",    right: "KeyD",    act: "Space" },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", act: "Enter" },
    { up: "KeyI",    down: "KeyK",    left: "KeyJ",    right: "KeyL",    act: "KeyO" },
    { up: "KeyT",    down: "KeyG",    left: "KeyF",    right: "KeyH",    act: "KeyY" }
  ];

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
  var mode = "menu";               // menu | countdown | play | over
  var cfg = { players: 3, time: 90 };
  var players = [];
  var customers = [];              // all live customers
  var queue = [];                  // customers currently waiting (ordered)
  var floaters = [];
  var keysDown = {};
  var touch = [];                  // per-slot touch direction state
  var score = 0;
  var combo = 0;
  var bestCombo = 0;
  var comboTimer = 0;
  var served = 0;
  var lost = 0;                    // furious walk-outs
  var wrong = 0;                   // wrong-station serves
  var lives = START_LIVES;
  var timeLeft = 90;
  var spawnTimer = 2.0;
  var countdownT = 0;
  var banner = { text: "", t: 0 };
  var shake = 0;
  var last = 0;
  var stats = { best: 0, games: 0 };
  var statsKey = "queueescape_stats";
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
     Customer construction
     ================================================================ */

  function customerType() { return rndi(0, STATIONS.length - 1); }

  function slotPos(i) {
    return { x: HEAD.x - i * SLOT_DX, y: HEAD.y };
  }

  function makeCustomer(atX, atY) {
    var t = customerType();
    return {
      id: ++tmpId,
      type: t,
      x: atX, y: atY,
      patience: 100,
      state: "queue",           // queue | carried | serving | gone
      queuePos: -1,
      carrier: null,            // player object
      serveStation: null,
      serveT: 0,
      pop: 0,                   // little bobbing phase
      anger: 0                  // 0..1 briefly shown when furious
    };
  }

  function spawnCustomer() {
    var c = makeCustomer(-40, HEAD.y);
    c.queuePos = queue.length;
    customers.push(c);
    queue.push(c);
    return c;
  }

  /* ================================================================
     Players
     ================================================================ */

  function buildPlayers() {
    players = [];
    var spawns = [
      { x: 130, y: 200 }, { x: 130, y: 420 },
      { x: 440, y: 180 }, { x: 440, y: 440 }
    ];
    for (var i = 0; i < cfg.players; i++) {
      var s = spawns[i];
      players.push({
        slot: i,
        x: s.x, y: s.y,
        r: 14,
        color: PLAYER_COLORS[i],
        name: PLAYER_NAMES[i],
        carrying: null,
        actCd: 0,               // tiny debounce on the action button
        walkT: 0
      });
    }
    touch = [];
    for (var j = 0; j < players.length; j++) {
      touch[j] = { up: false, down: false, left: false, right: false };
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

  /* ================================================================
     Core mechanics
     ================================================================ */

  function stationCenter(s) { return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }

  function nearestStation(x, y) {
    var best = null, bd = SERVE_RADIUS;
    for (var i = 0; i < STATIONS.length; i++) {
      var c = stationCenter(STATIONS[i]);
      var d = dist(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = STATIONS[i]; }
    }
    return best;
  }

  function grabFront(p) {
    if (p.carrying) return;
    if (queue.length === 0) {
      addFloater(p.x, p.y - 34, "Nobody in line yet!", "#9fb6d8");
      return;
    }
    var c = queue[0];
    queue.shift();
    // everyone behind shuffles up
    for (var i = 0; i < queue.length; i++) queue[i].queuePos = i;
    c.state = "carried";
    c.carrier = p;
    c.queuePos = -1;
    p.carrying = c;
    p.actCd = 0.15;
    addFloater(c.x, c.y - 30, "GOT " + orderName(c.type), p.color);
    updateHud();
  }

  function orderName(t) { return STATIONS[t].label; }

  function startServe(p) {
    var c = p.carrying;
    var st = nearestStation(p.x, p.y);
    if (!st) {
      addFloater(p.x, p.y - 34, "Step to a station!", "#9fb6d8");
      return;
    }
    if (st.type === c.type) {
      // correct station — animate the serve
      c.state = "serving";
      c.serveStation = st;
      c.serveT = 0;
      p.carrying = null;
      p.actCd = 0.15;
      addFloater(st.x + st.w / 2, st.y - 14, "SERVING...", "#7dff8a");
    } else {
      // wrong station — customer storms off
      score -= WRONG_PENALTY;
      wrong++;
      combo = 0;
      comboTimer = 0;
      c.anger = 1;
      c.state = "gone";
      c.goneT = 0.6;
      p.carrying = null;
      p.actCd = 0.15;
      addFloater(p.x, p.y - 40, "WRONG STATION  -" + WRONG_PENALTY, "#ff6b6b");
      shake = 0.3;
      updateHud();
    }
  }

  function completeServe(c) {
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    comboTimer = COMBO_WINDOW;
    served++;
    var pts = Math.min(COMBO_CAP, BASE_SCORE + (combo - 1) * COMBO_STEP);
    score += pts;
    var st = c.serveStation;
    addFloater(st.x + st.w / 2, st.y - 34, "+" + pts + (combo > 1 ? "  COMBO x" + combo : ""), "#7dff8a");
    c.state = "gone";
    c.goneT = 0.5;
    updateHud();
  }

  function furiousLeave(c) {
    lives--;
    lost++;
    combo = 0;
    comboTimer = 0;
    c.anger = 1;
    c.state = "gone";
    c.goneT = 0.7;
    addFloater(c.x, c.y - 44, "FURIOUS!", "#ff6b6b");
    banner.text = "CUSTOMER STORMED OFF  (" + lives + " lives left)";
    banner.t = 2.0;
    shake = 0.4;
    if (lives <= 0) {
      endMatch(true);
    }
    updateHud();
  }

  function movePlayer(p, dt, inp) {
    var ax = 0, ay = 0;
    if (inp.up) ay -= 1;
    if (inp.down) ay += 1;
    if (inp.left) ax -= 1;
    if (inp.right) ax += 1;
    if (ax !== 0 || ay !== 0) {
      var d = Math.hypot(ax, ay);
      ax /= d; ay /= d;
      p.x += ax * PLAYER_SPEED * dt;
      p.y += ay * PLAYER_SPEED * dt;
      p.x = clamp(p.x, M + 16, W - M - 16);
      p.y = clamp(p.y, M + 16, H - M - 16);
      p.walkT += dt;
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
     Round flow
     ================================================================ */

  function resetMatch() {
    buildPlayers();
    customers = [];
    queue = [];
    floaters = [];
    score = 0;
    combo = 0;
    bestCombo = 0;
    comboTimer = 0;
    served = 0;
    lost = 0;
    wrong = 0;
    lives = START_LIVES;
    timeLeft = cfg.time;
    spawnTimer = 1.2;
    banner = { text: "", t: 0 };
    shake = 0;
    countdownT = 3.2;
    mode = "countdown";
    // a starter queue so there is always something to do
    spawnCustomer();
    spawnCustomer();
    buildHud();
    buildTouchControls();
    showScreen("game");
    updateHud();
  }

  function endMatch(early) {
    mode = "over";
    stats.games++;
    if (score > stats.best) stats.best = score;
    saveStats();
    showResult(early);
  }

  function showResult(early) {
    $("resultTitle").textContent = early ? "Service Collapsed!" : "Shift Complete!";
    var rank = gradeFor(score);
    var list = $("resultList");
    list.innerHTML =
      '<div class="res-row first">' +
        '<span class="place">TEAM</span>' +
        '<span class="who">Score</span>' +
        '<span class="pts">' + score + "</span>" +
      "</div>" +
      '<div class="res-row">' +
        '<span class="place">S</span><span class="who">Customers served</span><span class="pts">' + served + "</span>" +
      "</div>" +
      '<div class="res-row">' +
        '<span class="place">C</span><span class="who">Best combo</span><span class="pts">x' + bestCombo + "</span>" +
      "</div>" +
      '<div class="res-row">' +
        '<span class="place">!</span><span class="who">Wrong stations</span><span class="pts">' + wrong + "</span>" +
      "</div>" +
      '<div class="res-row">' +
        '<span class="place">💢</span><span class="who">Furious walk-outs</span><span class="pts">' + lost + "</span>" +
      "</div>";
    var badge = document.createElement("div");
    badge.className = "winner-badge";
    badge.textContent = "RANK " + rank;
    list.insertBefore(badge, list.firstChild);
    showScreen("result");
  }

  function gradeFor(s) {
    if (s >= 4500) return "S";
    if (s >= 2800) return "A";
    if (s >= 1400) return "B";
    if (s >= 500) return "C";
    return "D";
  }

  /* ================================================================
     Floating text + banner
     ================================================================ */

  function addFloater(x, y, text, color) {
    floaters.push({ x: x, y: y, text: text, color: color, t: 1.0 });
    if (floaters.length > 30) floaters.shift();
  }

  /* ================================================================
     Update
     ================================================================ */

  function spawnInterval() {
    var f = timeLeft / cfg.time;          // 1 at start, 0 at the end
    return lerp(1.55, 4.4, f);            // faster as time runs out
  }

  function update(dt) {
    if (mode === "countdown") {
      countdownT -= dt;
      if (countdownT <= 0) {
        countdownT = 0;
        mode = "play";
        banner.text = "GO!";
        banner.t = 0.9;
      }
      return;
    }
    if (mode !== "play") return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endMatch(false);
      return;
    }

    // --- spawning ---
    spawnTimer -= dt;
    if (spawnTimer <= 0 && queue.length < MAX_QUEUE && customers.length < MAX_CUSTOMERS) {
      spawnCustomer();
      spawnTimer = spawnInterval() * rnd(0.85, 1.15);
    }

    // --- patience + movement of waiting customers ---
    for (var i = customers.length - 1; i >= 0; i--) {
      var c = customers[i];

      if (c.state === "queue") {
        var target = slotPos(c.queuePos);
        // ease toward slot (also covers the walk-in from the left)
        c.x = lerp(c.x, target.x, Math.min(1, dt * 5.5));
        c.y = lerp(c.y, target.y, Math.min(1, dt * 5.5));
        var drain = QUEUE_DRAIN + c.queuePos * QUEUE_DRAIN_PER_SLOT;
        c.patience -= drain * dt;
        if (c.patience <= 0) {
          c.patience = 0;
          removeFromQueue(c);
          furiousLeave(c);
        }
      } else if (c.state === "carried") {
        // bob above the carrier
        var p = c.carrier;
        if (p) {
          c.x = p.x;
          c.y = p.y - 26;
          c.patience -= CARRIED_DRAIN * dt;
          if (c.patience <= 0) {
            c.patience = 0;
            p.carrying = null;
            c.carrier = null;
            furiousLeave(c);
          }
        }
      } else if (c.state === "serving") {
        c.serveT += dt;
        if (c.serveT >= SERVE_TIME) {
          completeServe(c);
        }
      } else if (c.state === "gone") {
        c.goneT -= dt;
        if (c.goneT <= 0) {
          customers.splice(i, 1);
          continue;
        }
      }
      c.pop += dt * 4;
      if (c.anger > 0) c.anger = Math.max(0, c.anger - dt * 1.6);
    }

    // --- players ---
    for (var pi = 0; pi < players.length; pi++) {
      var pl = players[pi];
      var inp = humanInput(pl);
      movePlayer(pl, dt, inp);
      if (pl.actCd > 0) pl.actCd -= dt;
    }
    separatePlayers();

    // --- combo decay ---
    if (combo > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 0;
        comboTimer = 0;
        addFloater(W / 2, 110, "COMBO LOST", "#ffb84d");
      }
    }

    // --- misc timers ---
    if (banner.t > 0) banner.t -= dt;
    if (shake > 0) shake -= dt;
    for (var fi = floaters.length - 1; fi >= 0; fi--) {
      var f = floaters[fi];
      f.t -= dt * 1.05;
      f.y -= 32 * dt;
      if (f.t <= 0) floaters.splice(fi, 1);
    }

    // --- low-time warning ---
    if (timeLeft < 10 && Math.floor(timeLeft) % 2 === 0 && banner.t <= 0 && timeLeft > 0) {
      banner.text = "HURRY!";
      banner.t = 0.5;
    }

    updateHud();
  }

  function removeFromQueue(c) {
    var idx = queue.indexOf(c);
    if (idx !== -1) {
      queue.splice(idx, 1);
      for (var i = 0; i < queue.length; i++) queue[i].queuePos = i;
    }
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
      chip.className = "chip";
      chip.id = "chip" + p.slot;
      chip.innerHTML =
        '<span class="name" style="color:' + p.color + '">' + p.name + "</span>" +
        '<span class="score">-</span>' +
        '<span class="mini">idle</span>';
      hudEl.appendChild(chip);
    }
    var scoreChip = document.createElement("div");
    scoreChip.className = "chip accent";
    scoreChip.id = "chipScore";
    scoreChip.innerHTML = '<span class="name">SCORE</span><span class="score">0</span><span class="mini">combo x0</span>';
    hudEl.appendChild(scoreChip);

    var serveChip = document.createElement("div");
    serveChip.className = "chip";
    serveChip.id = "chipServed";
    serveChip.innerHTML = '<span class="name">SERVED</span><span class="score">0</span><span class="mini">best x0</span>';
    hudEl.appendChild(serveChip);

    var liveChip = document.createElement("div");
    liveChip.className = "chip lives";
    liveChip.id = "chipLives";
    liveChip.innerHTML = '<span class="name">LIVES</span><span class="score">♥♥♥</span><span class="mini">furious = lost</span>';
    hudEl.appendChild(liveChip);

    var timerChip = document.createElement("div");
    timerChip.className = "chip timer";
    timerChip.id = "chipTimer";
    timerChip.innerHTML = '<span class="name">TIME</span><span class="score">1:30</span><span class="mini">queue ' + queue.length + "</span>";
    hudEl.appendChild(timerChip);
  }

  function updateHud() {
    for (var i = 0; i < players.length; i++) {
      var chip = $("chip" + i);
      if (!chip) continue;
      var pl = players[i];
      if (pl.carrying) {
        chip.querySelector(".score").textContent = STATIONS[pl.carrying.type].label;
        chip.querySelector(".mini").textContent = "carrying";
      } else {
        chip.querySelector(".score").textContent = "-";
        chip.querySelector(".mini").textContent = "idle";
      }
    }
    var sc = $("chipScore");
    sc.querySelector(".score").textContent = score;
    sc.querySelector(".mini").textContent = "combo x" + combo;
    var sv = $("chipServed");
    sv.querySelector(".score").textContent = served;
    sv.querySelector(".mini").textContent = "best x" + bestCombo;
    var lc = $("chipLives");
    var hearts = "";
    for (var h = 0; h < lives; h++) hearts += "♥";
    lc.querySelector(".score").textContent = hearts || "✖";
    var tc = $("chipTimer");
    var t = Math.max(0, Math.ceil(timeLeft));
    tc.querySelector(".score").textContent = Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2);
    tc.querySelector(".mini").textContent = "queue " + queue.length;
    tc.classList.toggle("low", timeLeft <= 10);
  }

  function buildTouchControls() {
    controlsEl.innerHTML = "";
    gameHintEl.textContent = "";
    var hints = [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
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
          '<button class="dbtn act" type="button" aria-label="act">GRAB/SERVE</button>' +
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
      gameHintEl.textContent = "Keyboard: " + hints.join("  ·  ") + "  ·  Touch: on-screen pads below";
    }
  }

  function onPadDown(slot, btn) {
    return function (e) {
      e.preventDefault();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      btn.classList.add("on");
      var dir = btn.getAttribute("aria-label");
      if (dir === "act") {
        var p = players[slot];
        if (p && mode === "play" && p.actCd <= 0) doAction(p);
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
      if (touch[slot] && dir !== "act") touch[slot][dir] = false;
    };
  }

  /* ================================================================
     Action button behaviour (grab / serve)
     ================================================================ */

  function doAction(p) {
    if (p.actCd > 0) return;
    if (!p.carrying) {
      if (dist(p.x, p.y, HEAD.x, HEAD.y) < GRAB_RADIUS) {
        grabFront(p);
      } else {
        addFloater(p.x, p.y - 34, "Stand at the line head!", "#9fb6d8");
      }
    } else {
      startServe(p);
    }
  }

  /* ================================================================
     Drawing
     ================================================================ */

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rgba(rgb, a) { return "rgba(" + rgb + "," + a + ")"; }

  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate(rnd(-3, 3) * shake * 6, rnd(-3, 3) * shake * 6);
    }

    // floor
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#151d2b");
    grad.addColorStop(1, "#0c1218");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // tile grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= W; gx += 45) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    for (var gy = 0; gy <= H; gy += 45) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();

    // outer wall
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 4;
    ctx.strokeRect(M - 2, M - 2, W - 2 * M + 4, H - 2 * M + 4);

    // queue lane guide
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(40, HEAD.y);
    ctx.lineTo(HEAD.x - 10, HEAD.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // queue head mat
    var matPulse = 1 + Math.sin(last * 0.004) * 0.06;
    ctx.fillStyle = "rgba(255,217,74," + (0.14 * matPulse) + ")";
    roundRect(HEAD.x - 34, HEAD.y - 34, 68, 68, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,217,74,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,217,74,0.9)";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("GRAB", HEAD.x, HEAD.y + 40);

    // stations
    for (var s = 0; s < STATIONS.length; s++) {
      drawStation(STATIONS[s]);
    }

    // customers
    for (var ci = 0; ci < customers.length; ci++) {
      drawCustomer(customers[ci]);
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
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // banner
    if (banner.t > 0) {
      ctx.globalAlpha = Math.min(1, banner.t * 1.8);
      ctx.fillStyle = "rgba(10,16,24,0.85)";
      roundRect(W / 2 - 210, 64, 420, 44, 12);
      ctx.fill();
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.text, W / 2, 86);
      ctx.globalAlpha = 1;
    }

    // time bar
    var frac = clamp(timeLeft / cfg.time, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = frac > 0.25 ? "#7dd3ff" : "#ff6b6b";
    ctx.fillRect(0, 0, W * frac, 6);

    // countdown overlay
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
      ctx.font = "bold 19px system-ui, sans-serif";
      ctx.fillText("ROUTE THE HUNGRY — DON'T LET THEM BOIL!", W / 2, H / 2 + 70);
    }

    ctx.restore();
  }

  function drawStation(st) {
    var c = stationCenter(st);
    var busy = false;
    for (var i = 0; i < customers.length; i++) {
      if (customers[i].state === "serving" && customers[i].serveStation === st) { busy = true; break; }
    }
    ctx.save();
    ctx.beginPath();
    roundRect(st.x, st.y, st.w, st.h, 16);
    ctx.fillStyle = rgba(st.rgb, busy ? 0.34 : 0.22);
    ctx.fill();
    ctx.strokeStyle = rgba(st.rgb, 0.95);
    ctx.lineWidth = 3;
    ctx.stroke();

    // hatch
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(st.rgb, 0.10);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (var hx = st.x - st.h; hx < st.x + st.w + st.h; hx += 24) {
      ctx.moveTo(hx, st.y + st.h);
      ctx.lineTo(hx + st.h, st.y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.font = "34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.label, c.x, c.y - 14);

    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = rgba(st.rgb, 1);
    ctx.fillText(st.name, c.x, c.y + 24);

    if (busy) {
      // tiny sparkle while serving
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("SERVING", c.x, c.y + 44);
    }
    ctx.restore();
  }

  function drawCustomer(c) {
    var bob = Math.sin(c.pop) * 2;
    var x = c.x, y = c.y + bob;
    var r = c.state === "carried" ? 12 : 14;
    var rgb = STATIONS[c.type].rgb;

    if (c.state === "gone" && c.anger > 0.4) {
      // puffed-off silhouette
      ctx.globalAlpha = c.anger;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💢", x, y - 26);
      ctx.globalAlpha = 1;
      return;
    }
    if (c.state === "gone") return;

    // body
    ctx.save();
    ctx.shadowColor = rgba(rgb, 1);
    ctx.shadowBlur = 10;
    ctx.fillStyle = rgba(rgb, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();

    // order bubble
    ctx.fillStyle = "rgba(10,16,24,0.88)";
    ctx.beginPath();
    ctx.arc(x, y - r - 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(STATIONS[c.type].label, x, y - r - 12);

    // patience bar
    var pw = 40, ph = 6;
    var bx = x - pw / 2, by = y - r - 26;
    var pfrac = clamp(c.patience / 100, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(bx, by, pw, ph, 3);
    ctx.fill();
    var pcol = pfrac > 0.55 ? "#54e08a" : pfrac > 0.28 ? "#ffd94a" : "#ff6b6b";
    ctx.fillStyle = pcol;
    roundRect(bx, by, pw * pfrac, ph, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPlayer(p) {
    var bob = Math.sin(last * 0.008 + p.slot * 1.7) * 1.5;
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

    ctx.fillStyle = p.color;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(p.name, p.x, p.y + bob + p.r + 10);
  }

  /* ================================================================
     Main loop
     ================================================================ */

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
        resetMatch();
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
    // action on fresh press
    if (mode === "play" && !e.repeat && !was) {
      for (var i = 0; i < players.length; i++) {
        if (KEYMAP[players[i].slot].act === e.code) {
          doAction(players[i]);
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

  function toMenu() {
    mode = "menu";
    $("menuBest").textContent = stats.best;
    $("menuGames").textContent = stats.games;
    showScreen("menu");
  }

  // Read-only snapshot so automated checks can verify live state.
  window.__qeState = function () {
    return {
      mode: mode,
      cfg: { players: cfg.players, time: cfg.time },
      timeLeft: timeLeft,
      score: score,
      combo: combo,
      bestCombo: bestCombo,
      served: served,
      lost: lost,
      wrong: wrong,
      lives: lives,
      queueLen: queue.length,
      customers: customers.map(function (c) {
        return {
          id: c.id, type: c.type, state: c.state,
          x: Math.round(c.x), y: Math.round(c.y),
          patience: Math.round(c.patience),
          queuePos: c.queuePos,
          carrier: c.carrier ? c.carrier.slot : null
        };
      }),
      players: players.map(function (p) {
        return {
          slot: p.slot, x: Math.round(p.x), y: Math.round(p.y),
          carrying: p.carrying ? p.carrying.type : null
        };
      }),
      banner: banner.text
    };
  };

  /* ================================================================
     Menu config
     ================================================================ */

  function bindSeg(rowId, key) {
    var row = $(rowId);
    row.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg");
      if (!btn) return;
      var val = parseInt(btn.getAttribute("data-" + key), 10);
      cfg[key] = val;
      var segs = row.querySelectorAll(".seg");
      for (var i = 0; i < segs.length; i++) segs[i].classList.toggle("active", segs[i] === btn);
    });
  }

  function bindMenu() {
    bindSeg("playersRow", "players");
    bindSeg("timeRow", "time");
    $("menuBest").textContent = stats.best;
    $("menuGames").textContent = stats.games;
  }

  /* ================================================================
     Wire up
     ================================================================ */

  $("startBtn").addEventListener("click", resetMatch);
  $("againBtn").addEventListener("click", function () { resetMatch(); });
  $("menuBtn").addEventListener("click", toMenu);
  bindMenu();
  showScreen("menu");
  requestAnimationFrame(loop);
})();
