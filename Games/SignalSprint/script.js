/*
 * Signal Sprint - original 2-6 player reaction game.
 *
 * CONTROLS
 *   Keyboard:
 *     Menu:   2-6   pick number of players
 *             7/8/9 pick round length (30/60/90s)
 *             Enter start the round
 *     Game:   A S D F J K  = P1..P6 hit buttons
 *             Escape      quit back to the menu
 *     Result: Enter / R   play again
 *             Escape      back to menu
 *   Touch / Mouse:
 *     Tap a lane button to hit for that player.
 *
 * RULES
 *   A signal appears in the center: a colored shape. Its color shows whose
 *   turn it is. Signals cycle through all players fairly and speed up as
 *   the round goes on.
 *     GO     (circle)  - if it is YOUR color, hit fast for points.
 *     DOUBLE (star)    - worth 2x, rarer.
 *     ALL    (burst)   - EVERYONE hits for points.
 *     STOP   (square)  - a trap. If it is your color, do NOT hit.
 *   Hitting the wrong signal (not your color, a STOP, or nothing showing)
 *   is a false tap: -10 points and a short lockout. Missing your own GO
 *   just loses the opportunity. Consecutive hits build a streak bonus.
 *
 * SCORING
 *   GO: 10 + reaction bonus + streak bonus (streak adds up to +10).
 *   DOUBLE: 2x (10 + reaction bonus) + streak bonus.
 *   ALL: 5 + reaction bonus + streak bonus.
 *   False tap: -10. Best score is kept per player-count + round-length.
 */
(function () {
  "use strict";

  var PALETTE = [
    "#ff5d5d", // P1 red
    "#ffd23d", // P2 yellow
    "#3ddc84", // P3 green
    "#4da3ff", // P4 blue
    "#c44dff", // P5 purple
    "#ff9d3d"  // P6 orange
  ];
  var KEYS = ["A", "S", "D", "F", "J", "K"];
  var KEYCODES = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK"];
  var TIMES = [30, 60, 90];
  var GAP = 250;        // ms of idle between signals
  var DEFAULT_PLAYERS = 4;
  var DEFAULT_TIME = 60;
  var STORE_KEY = "signalsprint_best";

  var menuScreen = document.getElementById("screen-menu");
  var cdScreen = document.getElementById("screen-countdown");
  var gameScreen = document.getElementById("screen-game");
  var resultScreen = document.getElementById("screen-result");

  var menuBest = document.getElementById("menuBest");
  var menuGames = document.getElementById("menuGames");
  var playerRow = document.getElementById("playerRow");
  var timeRow = document.getElementById("timeRow");
  var startBtn = document.getElementById("startBtn");

  var cdLabel = document.getElementById("cdLabel");
  var cdNum = document.getElementById("cdNum");

  var timerChip = document.getElementById("timerChip");
  var timeLeftEl = document.getElementById("timeLeft");
  var speedLevelEl = document.getElementById("speedLevel");
  var signalPanel = document.getElementById("signalPanel");
  var lanesEl = document.getElementById("lanes");

  var resultTitle = document.getElementById("resultTitle");
  var winnerBanner = document.getElementById("winnerBanner");
  var scoreTableBody = document.querySelector("#scoreTable tbody");
  var resBest = document.getElementById("resBest");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");

  var saved = loadSaved();

  var players = DEFAULT_PLAYERS;
  var roundLen = DEFAULT_TIME;

  var scores = [];
  var streaks = [];
  var faults = [];
  var hits = [];
  var lockUntil = [];
  var laneEls = [];
  var flashTimeouts = [];

  var current = null;      // active signal { kind, color, start, dur, acted:{} }
  var colorQueue = [];     // fair round-robin color order
  var state = "menu";      // menu | countdown | play | over
  var endTime = 0;
  var timerId = null;
  var sigTimer = null;
  var sigGapTimer = null;
  var cdTimeouts = [];
  var audioCtx = null;

  /* ---------- persistence ---------- */
  function loadSaved() {
    var s = null;
    try {
      s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      s = {};
    }
    if (!s || typeof s !== "object") s = {};
    if (!s.best || typeof s.best !== "object") s.best = {};
    if (typeof s.games !== "number") s.games = 0;
    return s;
  }

  function saveSaved() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch (e) { /* ignore */ }
  }

  function configKey() {
    return players + "-" + roundLen;
  }

  /* ---------- audio (synthesized, no assets) ---------- */
  function beep(type) {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      var now = audioCtx.currentTime;
      if (type === "hit") o.frequency.setValueAtTime(880, now);
      else if (type === "double") o.frequency.setValueAtTime(1320, now);
      else if (type === "fault") o.frequency.setValueAtTime(160, now);
      else if (type === "go") o.frequency.setValueAtTime(1046, now);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.start(now);
      o.stop(now + 0.15);
    } catch (e) { /* audio is optional */ }
  }

  /* ---------- svg signal shapes (inline, no assets) ---------- */
  function starPoints(cx, cy, spikes, outer, inner) {
    var pts = [];
    for (var i = 0; i < spikes * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(" ");
  }

  function rainbowStops() {
    var s = "";
    for (var i = 0; i < PALETTE.length; i++) {
      s += '<stop offset="' + (i / (PALETTE.length - 1) * 100).toFixed(0) +
        '%" stop-color="' + PALETTE[i] + '"/>';
    }
    return s;
  }

  function signalSVG(kind, color) {
    var S = '<svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">';
    if (kind === "go") {
      S += '<circle cx="60" cy="60" r="48" fill="' + color + '"/>' +
        '<circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>';
    } else if (kind === "double") {
      S += '<polygon points="' + starPoints(60, 60, 5, 52, 22) + '" fill="' + color + '" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>';
    } else if (kind === "stop") {
      S += '<rect x="20" y="20" width="80" height="80" rx="10" fill="' + color + '"/>' +
        '<line x1="32" y1="32" x2="88" y2="88" stroke="#fff" stroke-width="9" stroke-linecap="round"/>';
    } else {
      // all: rainbow burst
      S += '<defs><linearGradient id="sig-rg" x1="0" y1="0" x2="1" y2="1">' +
        rainbowStops() + '</linearGradient></defs>' +
        '<polygon points="' + starPoints(60, 60, 8, 54, 30) + '" fill="url(#sig-rg)"/>';
    }
    return S + "</svg>";
  }

  function signalLabel(kind) {
    if (kind === "go") return "HIT!";
    if (kind === "double") return "DOUBLE!";
    if (kind === "stop") return "STOP!";
    return "EVERYONE!";
  }

  /* ---------- screens ---------- */
  function showScreen(which) {
    menuScreen.classList.add("hidden");
    cdScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function renderMenu() {
    menuBest.textContent = saved.best[configKey()] || 0;
    menuGames.textContent = saved.games;
    var segs = playerRow.querySelectorAll(".seg");
    for (var i = 0; i < segs.length; i++) {
      segs[i].classList.toggle("active", Number(segs[i].getAttribute("data-players")) === players);
    }
    var tsegs = timeRow.querySelectorAll(".seg");
    for (var k = 0; k < tsegs.length; k++) {
      tsegs[k].classList.toggle("active", Number(tsegs[k].getAttribute("data-time")) === roundLen);
    }
  }

  /* ---------- countdown ---------- */
  function startCountdown() {
    clearCdTimeouts();
    showScreen(cdScreen);
    cdLabel.textContent = players + " players \u00b7 " + roundLen + "s \u2014 get ready";
    var steps = [3, 2, 1];
    steps.forEach(function (n, idx) {
      cdTimeouts.push(setTimeout(function () {
        cdNum.textContent = n;
        cdNum.classList.remove("go");
      }, idx * 700));
    });
    cdTimeouts.push(setTimeout(function () {
      cdNum.textContent = "GO!";
      cdNum.classList.add("go");
      beep("go");
    }, steps.length * 700));
    cdTimeouts.push(setTimeout(function () {
      beginRound();
    }, steps.length * 700 + 600));
  }

  function clearCdTimeouts() {
    for (var i = 0; i < cdTimeouts.length; i++) clearTimeout(cdTimeouts[i]);
    cdTimeouts = [];
  }

  /* ---------- round ---------- */
  function beginRound() {
    state = "play";
    scores = [];
    streaks = [];
    faults = [];
    hits = [];
    lockUntil = [];
    for (var i = 0; i < players; i++) {
      scores.push(0);
      streaks.push(0);
      faults.push(0);
      hits.push(0);
      lockUntil.push(0);
    }
    current = null;
    colorQueue = [];
    renderLanes();
    endTime = Date.now() + roundLen * 1000;
    showScreen(gameScreen);
    startTimer();
    showNextSignal();
  }

  function progressFrac() {
    var total = roundLen * 1000;
    var elapsed = total - Math.max(0, endTime - Date.now());
    return Math.min(1, Math.max(0, elapsed / total));
  }

  function signalDur() {
    // 1400ms at the start, down to 450ms by the end.
    return Math.max(450, 1400 - progressFrac() * 950);
  }

  function nextSignalColor() {
    if (colorQueue.length === 0) {
      var arr = [];
      for (var i = 0; i < players; i++) arr.push(i);
      for (var j = arr.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = arr[j];
        arr[j] = arr[k];
        arr[k] = t;
      }
      colorQueue = arr;
    }
    return colorQueue.shift();
  }

  function pickKind() {
    var r = Math.random();
    if (r < 0.6) return "go";
    if (r < 0.75) return "double";
    if (r < 0.9) return "stop";
    return "all";
  }

  function showNextSignal() {
    if (state !== "play") return;
    clearTimeout(sigTimer);
    var kind = pickKind();
    var color = kind === "all" ? Math.floor(Math.random() * players) : nextSignalColor();
    var dur = signalDur();
    current = { kind: kind, color: color, start: Date.now(), dur: dur, acted: {} };
    renderSignal(current);
    sigTimer = setTimeout(function () {
      if (state !== "play") return;
      current = null;
      renderIdleSignal();
      clearLaneHighlights();
      sigGapTimer = setTimeout(showNextSignal, GAP);
    }, dur);
  }

  function renderSignal(s) {
    var label = signalLabel(s.kind);
    signalPanel.innerHTML =
      '<div class="signal-inner">' + signalSVG(s.kind, PALETTE[s.color]) +
      '<span class="sig-label' + (s.kind === "all" ? " rainbow" : "") + '">' + label + "</span></div>";
    highlightLanes(s);
  }

  function renderIdleSignal() {
    signalPanel.innerHTML = '<span class="signal-idle">\u2026</span>';
  }

  function highlightLanes(s) {
    clearLaneHighlights();
    if (s.kind === "all") {
      for (var i = 0; i < players; i++) laneEls[i].classList.add("active");
    } else {
      laneEls[s.color].classList.add("active");
    }
  }

  function clearLaneHighlights() {
    for (var i = 0; i < laneEls.length; i++) laneEls[i].classList.remove("active");
  }

  /* ---------- lanes ---------- */
  function renderLanes() {
    lanesEl.innerHTML = "";
    laneEls = [];
    flashTimeouts = [];
    for (var i = 0; i < players; i++) {
      var lane = document.createElement("button");
      lane.type = "button";
      lane.className = "lane";
      lane.style.setProperty("--pc", PALETTE[i]);
      lane.innerHTML =
        '<span class="pname">P' + (i + 1) + "</span>" +
        '<span class="pkey">' + KEYS[i] + "</span>" +
        '<span class="pscore" id="laneScore' + i + '">0</span>';
      lane.dataset.pid = String(i);
      (function (pid) {
        lane.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          press(pid);
        });
      })(i);
      lanesEl.appendChild(lane);
      laneEls.push(lane);
    }
  }

  function updateLaneScore(pid) {
    var el = document.getElementById("laneScore" + pid);
    if (el) el.textContent = scores[pid];
  }

  function flashLane(pid, cls, text) {
    var lane = laneEls[pid];
    if (!lane) return;
    lane.classList.remove("hit", "fault");
    void lane.offsetWidth;
    lane.classList.add(cls);
    var t = setTimeout(function () {
      lane.classList.remove("hit", "fault");
    }, 450);
    flashTimeouts.push(t);

    var float = document.createElement("span");
    float.className = "float" + (cls === "fault" ? " bad" : "");
    float.textContent = text;
    lane.appendChild(float);
    setTimeout(function () {
      if (float.parentNode) float.parentNode.removeChild(float);
    }, 700);
  }

  /* ---------- input ---------- */
  function press(pid) {
    if (state !== "play") return;
    var now = Date.now();
    if (now < lockUntil[pid]) return;
    lockUntil[pid] = now + 120;
    var lane = laneEls[pid];

    if (!current) {
      doFault(pid, lane);
      return;
    }
    if (current.acted[pid]) return;

    var elapsed = now - current.start;
    var fast = Math.max(0, Math.round((1 - elapsed / current.dur) * 5));

    if (current.kind === "all") {
      current.acted[pid] = true;
      scoreHit(pid, 5 + fast, lane);
    } else if (current.color === pid) {
      current.acted[pid] = true;
      if (current.kind === "stop") {
        doFault(pid, lane);
      } else {
        var base = current.kind === "double" ? 2 * (10 + fast) : 10 + fast;
        scoreHit(pid, base, lane);
      }
    } else {
      current.acted[pid] = true;
      doFault(pid, lane);
    }
  }

  function scoreHit(pid, base, lane) {
    hits[pid]++;
    streaks[pid]++;
    var streakBonus = Math.min(streaks[pid] * 2, 10);
    var total = base + streakBonus;
    scores[pid] += total;
    updateLaneScore(pid);
    flashLane(pid, "hit", "+" + total);
    beep(current && current.kind === "double" ? "double" : "hit");
  }

  function doFault(pid, lane) {
    faults[pid]++;
    streaks[pid] = 0;
    scores[pid] -= 10;
    updateLaneScore(pid);
    flashLane(pid, "fault", "-10");
    beep("fault");
  }

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    timerId = setInterval(tick, 100);
    tick();
  }

  function tick() {
    var remain = Math.max(0, endTime - Date.now());
    var secs = Math.ceil(remain / 1000);
    timeLeftEl.textContent = secs;
    timerChip.classList.toggle("low", secs <= 10);
    speedLevelEl.textContent = 1 + Math.floor(progressFrac() * 9);
    if (remain <= 0) {
      finishRound();
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  /* ---------- end ---------- */
  function finishRound() {
    if (state !== "play") return;
    state = "over";
    stopTimer();
    clearTimeout(sigTimer);
    clearTimeout(sigGapTimer);
    sigTimer = null;
    sigGapTimer = null;
    current = null;

    var rows = [];
    for (var i = 0; i < players; i++) {
      rows.push({ pid: i, score: scores[i], hits: hits[i], faults: faults[i] });
    }
    rows.sort(function (a, b) {
      return b.score - a.score || a.faults - b.faults;
    });

    var winner = rows[0];
    winnerBanner.textContent =
      "P" + (winner.pid + 1) + " takes the sprint with " + winner.score + " points!";

    scoreTableBody.innerHTML = "";
    for (var r = 0; r < rows.length; r++) {
      var tr = document.createElement("tr");
      if (r === 0) tr.className = "winner";
      var rankTd = document.createElement("td");
      rankTd.textContent = r === 0 ? "\uD83E\uDD47" : "#" + (r + 1);
      var nameTd = document.createElement("td");
      nameTd.innerHTML =
        '<span class="pcell"><span class="dot" style="--pc:' + PALETTE[rows[r].pid] + '"></span>P' +
        (rows[r].pid + 1) + "</span>";
      var scoreTd = document.createElement("td");
      scoreTd.textContent = rows[r].score;
      var hitsTd = document.createElement("td");
      hitsTd.textContent = rows[r].hits;
      var faultsTd = document.createElement("td");
      faultsTd.textContent = rows[r].faults;
      tr.appendChild(rankTd);
      tr.appendChild(nameTd);
      tr.appendChild(scoreTd);
      tr.appendChild(hitsTd);
      tr.appendChild(faultsTd);
      scoreTableBody.appendChild(tr);
    }

    saved.games++;
    var key = configKey();
    var isNewBest = winner.score > (saved.best[key] || 0);
    if (isNewBest) saved.best[key] = winner.score;
    saveSaved();

    resultTitle.textContent = "Time\u2019s Up!";
    resBest.textContent = isNewBest && winner.score > 0
      ? "\u2728 New best for " + players + "p \u00b7 " + roundLen + "s! \u2728"
      : "Best (" + players + "p \u00b7 " + roundLen + "s): " + (saved.best[key] || 0);

    showScreen(resultScreen);
    renderMenu();
  }

  function quitToMenu() {
    stopTimer();
    clearTimeout(sigTimer);
    clearTimeout(sigGapTimer);
    sigTimer = null;
    sigGapTimer = null;
    current = null;
    state = "menu";
    clearCdTimeouts();
    renderMenu();
    showScreen(menuScreen);
  }

  /* ---------- events ---------- */
  function handleKey(e) {
    if (!menuScreen.classList.contains("hidden")) {
      if (/^[2-6]$/.test(e.key)) {
        players = Number(e.key);
        renderMenu();
        return;
      }
      if (e.key === "7" || e.key === "8" || e.key === "9") {
        roundLen = TIMES[Number(e.key) - 7];
        renderMenu();
        return;
      }
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        startCountdown();
      }
      return;
    }

    if (!cdScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        clearCdTimeouts();
        quitToMenu();
      }
      return;
    }

    if (!gameScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        quitToMenu();
        return;
      }
      if (e.repeat) return;
      var idx = KEYCODES.indexOf(e.code);
      if (idx >= 0 && idx < players) {
        e.preventDefault();
        press(idx);
      }
      return;
    }

    if (!resultScreen.classList.contains("hidden")) {
      if (e.code === "Enter" || e.code === "Space" || e.code === "KeyR") {
        e.preventDefault();
        startCountdown();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        quitToMenu();
      }
    }
  }

  playerRow.addEventListener("click", function (e) {
    var seg = e.target.closest(".seg");
    if (!seg) return;
    players = Number(seg.getAttribute("data-players"));
    renderMenu();
  });
  timeRow.addEventListener("click", function (e) {
    var seg = e.target.closest(".seg");
    if (!seg) return;
    roundLen = Number(seg.getAttribute("data-time"));
    renderMenu();
  });
  startBtn.addEventListener("click", startCountdown);
  againBtn.addEventListener("click", startCountdown);
  menuBtn.addEventListener("click", quitToMenu);

  window.addEventListener("keydown", handleKey);

  renderMenu();
  showScreen(menuScreen);
})();
