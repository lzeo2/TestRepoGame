/*
 * Pattern Panic - a hot-seat memory sequence game for 2-6 players.
 *
 * CONTROLS
 *   Menu:   2-6  choose player count
 *           ENTER / SPACE  start the game
 *   Game:   1-6  press the matching symbol (keyboard)
 *           R    restart with the same players
 *           ESC  back to menu
 *           M    mute / unmute sounds
 *   Touch / Mouse:
 *           Tap symbols on the big board or on your own lane.
 *           The lane of the player whose turn it is lights up.
 *
 * GAMEPLAY
 *   Each round the game plays a growing pattern of symbols on the shared
 *   board. When playback ends, every surviving player, in turn, repeats the
 *   pattern using keys 1-6, the board, or their lane. A correct pattern
 *   scores round*10 points. Every wrong step costs one life (3 to start);
 *   losing all lives eliminates a player. The last player standing wins.
 */
(function () {
  "use strict";

  var SYMBOLS = [
    { ch: "\u25c6", c: "#ffd94a" },
    { ch: "\u25cf", c: "#7dd3ff" },
    { ch: "\u25b2", c: "#7dff8a" },
    { ch: "\u25a0", c: "#ff6b6b" },
    { ch: "\u2605", c: "#c77dff" },
    { ch: "\u2665", c: "#ff9d4a" }
  ];
  var TONES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0];
  var PLAYER_COLORS = ["#4dd2ff", "#ffd94a", "#7dff8a", "#ff6b6b", "#c77dff", "#ff9d4a"];
  var START_LIVES = 3;

  var menuScreen = document.getElementById("screen-menu");
  var gameScreen = document.getElementById("screen-game");
  var winScreen = document.getElementById("screen-win");
  var playersRow = document.getElementById("playersRow");
  var nameList = document.getElementById("nameList");
  var startBtn = document.getElementById("startBtn");
  var board = document.getElementById("board");
  var lanesEl = document.getElementById("lanes");
  var roundEl = document.getElementById("roundEl");
  var lenEl = document.getElementById("lenEl");
  var stepEl = document.getElementById("stepEl");
  var turnChip = document.getElementById("turnChip");
  var msgEl = document.getElementById("msg");
  var muteBtn = document.getElementById("muteBtn");
  var winTitle = document.getElementById("winTitle");
  var winScores = document.getElementById("winScores");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");

  var players = []; // {name,color,lives,score,alive,el}
  var sequence = [];
  var round = 0;
  var alive = []; // indices into players, in turn order
  var ptr = 0; // position in `alive` for the current turn
  var inputPos = 0;
  var phase = "menu"; // menu | playback | input | roundend | win
  var muted = false;
  var audio = null;
  var pending = []; // timeout ids, cleared on restart

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    pending.push(id);
    return id;
  }
  function clearPending() {
    pending.forEach(function (id) { clearTimeout(id); });
    pending = [];
  }

  /* ---------------- audio ---------------- */
  function ensureAudio() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }
  function tone(freq, dur, type, vol) {
    if (muted || !audio) return;
    var t = audio.currentTime;
    var o = audio.createOscillator();
    var g = audio.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function playTone(i) { tone(TONES[i], 0.35, "sine", 0.2); }
  function playSuccess() {
    tone(523.25, 0.14, "sine", 0.22);
    later(function () { tone(783.99, 0.22, "sine", 0.22); }, 130);
  }
  function playFail() { tone(130, 0.3, "sawtooth", 0.2); }

  /* ---------------- UI builders ---------------- */
  function makeBoard() {
    board.innerHTML = "";
    SYMBOLS.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bb";
      b.style.setProperty("--c", s.c);
      b.innerHTML =
        '<span class="sym">' + s.ch + "</span>" +
        '<span class="k">' + (i + 1) + "</span>";
      b.addEventListener("click", function () { ensureAudio(); pressSymbol(i); });
      board.appendChild(b);
    });
  }

  function buildMenu() {
    playersRow.innerHTML = "";
    for (var n = 2; n <= 6; n++) {
      (function (count) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "seg" + (count === 2 ? " active" : "");
        b.textContent = count + " Players";
        b.setAttribute("data-players", count);
        b.addEventListener("click", function () { setPlayerCount(count); });
        playersRow.appendChild(b);
      })(n);
    }
    nameList.innerHTML = "";
    for (var p = 0; p < 6; p++) {
      (function (idx) {
        var row = document.createElement("div");
        row.className = "name-row";
        row.style.setProperty("--pc", PLAYER_COLORS[idx]);
        row.innerHTML =
          '<span class="dot"></span>' +
          '<input class="name-in" maxlength="10" placeholder="Player ' + (idx + 1) +
          '" value="Player ' + (idx + 1) + '">';
        nameList.appendChild(row);
      })(p);
    }
    updateNameRows();
  }

  function setPlayerCount(n) {
    var segs = playersRow.querySelectorAll(".seg");
    segs.forEach(function (s) {
      s.classList.toggle("active", parseInt(s.getAttribute("data-players"), 10) === n);
    });
    updateNameRows();
  }

  function updateNameRows() {
    var count = playerCount();
    var rows = nameList.querySelectorAll(".name-row");
    rows.forEach(function (r, i) {
      r.style.display = i < count ? "" : "none";
    });
  }

  function playerCount() {
    var active = playersRow.querySelector(".seg.active");
    return active ? parseInt(active.getAttribute("data-players"), 10) : 2;
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  /* ---------------- game setup ---------------- */
  function startGame() {
    ensureAudio();
    clearPending();
    var count = playerCount();
    var inputs = nameList.querySelectorAll(".name-in");
    players = [];
    for (var i = 0; i < count; i++) {
      var val = (inputs[i] && inputs[i].value.trim()) || "Player " + (i + 1);
      players.push({
        name: val,
        color: PLAYER_COLORS[i],
        lives: START_LIVES,
        score: 0,
        alive: true,
        el: null
      });
    }
    sequence = [];
    round = 0;
    lanesEl.innerHTML = "";
    for (var p = 0; p < players.length; p++) {
      lanesEl.appendChild(makeLane(p));
    }
    updateLanes();
    showScreen(gameScreen);
    setTurn("Round 1 - watch the pattern!");
    newRound();
  }

  function makeLane(pIdx) {
    var p = players[pIdx];
    var lane = document.createElement("div");
    lane.className = "lane";
    lane.style.setProperty("--pc", p.color);

    var head = document.createElement("div");
    head.className = "lane-head";
    head.innerHTML =
      '<span class="pdot"></span>' +
      '<span class="pname"></span>' +
      '<span class="plives"></span>' +
      '<span class="pscore">0</span>';
    lane.appendChild(head);

    var btns = document.createElement("div");
    btns.className = "lane-btns";
    SYMBOLS.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lb";
      b.style.setProperty("--c", s.c);
      b.textContent = s.ch;
      b.addEventListener("click", function () { ensureAudio(); pressSymbol(i); });
      btns.appendChild(b);
    });
    lane.appendChild(btns);
    p.el = lane;
    return lane;
  }

  function updateLanes() {
    players.forEach(function (p, i) {
      var lane = p.el;
      lane.classList.toggle("turn", phase === "input" && alive[ptr] === i);
      lane.classList.toggle("out", !p.alive);
      lane.querySelector(".pname").textContent = p.name;
      lane.querySelector(".pscore").textContent = p.score;
      lane.querySelector(".plives").textContent =
        "\u2665".repeat(p.lives) + "\u2661".repeat(START_LIVES - p.lives);
    });
  }

  function setTurn(text) {
    turnChip.textContent = text;
    turnChip.style.color = "";
  }
  function setTurnPlayer(p) {
    turnChip.textContent = p.name + "'s turn";
    turnChip.style.color = p.color;
  }
  function setMsg(text, cls) {
    msgEl.textContent = text;
    msgEl.className = "msg" + (cls ? " " + cls : "");
  }

  /* ---------------- round flow ---------------- */
  function newRound() {
    round++;
    // Round 1 starts with two symbols so the opener is not trivial.
    if (sequence.length === 0) {
      sequence.push(Math.floor(Math.random() * SYMBOLS.length));
      sequence.push(Math.floor(Math.random() * SYMBOLS.length));
    } else {
      sequence.push(Math.floor(Math.random() * SYMBOLS.length));
    }
    roundEl.textContent = round;
    lenEl.textContent = sequence.length;
    alive = [];
    players.forEach(function (p, i) {
      if (p.alive) alive.push(i);
    });
    ptr = 0;
    setTurn("Round " + round + " - watch!");
    setMsg("Memorize the pattern...", "");
    phase = "playback";
    var onMs = Math.max(280, 620 - (round - 1) * 25);
    var gapMs = 130;
    (function play(idx) {
      if (idx >= sequence.length) {
        later(startTurn, 450);
        return;
      }
      var sym = sequence[idx];
      playTone(sym);
      board.children[sym].classList.add("lit");
      later(function () {
        board.children[sym].classList.remove("lit");
        later(function () { play(idx + 1); }, gapMs);
      }, onMs);
    })(0);
  }

  function startTurn() {
    if (alive.length === 1) {
      // Only one player left standing after the previous round's playback.
      declareWinner(players[alive[0]]);
      return;
    }
    var p = players[alive[ptr]];
    inputPos = 0;
    phase = "input";
    setTurnPlayer(p);
    setMsg(p.name + ", repeat the pattern!", "");
    updateStep();
    updateLanes();
  }

  function updateStep() {
    stepEl.textContent = inputPos + "/" + sequence.length;
  }

  /* ---------------- input handling ---------------- */
  function pressSymbol(i) {
    if (phase !== "input") return;
    if (i === sequence[inputPos]) {
      board.children[i].classList.add("ok");
      playTone(i);
      later(function () { board.children[i].classList.remove("ok"); }, 300);
      inputPos++;
      updateStep();
      if (inputPos === sequence.length) {
        // full pattern repeated -> success
        phase = "roundend";
        var p = players[alive[ptr]];
        p.score += round * 10;
        setMsg(p.name + " nailed it! +" + round * 10, "good");
        playSuccess();
        updateLanes();
        later(endTurn, 1100);
      }
    } else {
      phase = "roundend";
      board.children[i].classList.add("bad");
      playFail();
      later(function () { board.children[i].classList.remove("bad"); }, 400);
      var p2 = players[alive[ptr]];
      p2.lives--;
      if (p2.lives <= 0) {
        p2.alive = false;
        setMsg(p2.name + " is out!", "bad");
      } else {
        setMsg(p2.name + " wrong! -1 life", "bad");
      }
      updateLanes();
      later(endTurn, 1200);
    }
  }

  function endTurn() {
    var cur = alive[ptr];
    if (!players[cur].alive) {
      // current player was eliminated this turn; remove them from the order
      alive.splice(ptr, 1);
      // ptr stays: next living player now sits at this slot
    } else {
      ptr++;
    }
    if (alive.length === 0) {
      // Safety: should not happen (win is checked on elimination).
      declareWinner(players.slice().sort(function (a, b) { return b.score - a.score; })[0]);
      return;
    }
    if (alive.length === 1) {
      declareWinner(players[alive[0]]);
      return;
    }
    if (ptr >= alive.length) {
      // every surviving player attempted this round -> next round
      later(newRound, 600);
      return;
    }
    startTurn();
  }

  /* ---------------- win / restart ---------------- */
  function declareWinner(p) {
    phase = "win";
    setTurn(p.name + " wins!");
    setMsg("");
    var sorted = players.slice().sort(function (a, b) { return b.score - a.score; });
    winTitle.innerHTML = '<span style="color:' + p.color + '">' + p.name + "</span> wins!";
    winScores.innerHTML = "";
    sorted.forEach(function (pl, i) {
      var row = document.createElement("div");
      row.className = "ws-row";
      row.innerHTML =
        '<span class="ws-rank">' + (i + 1) + "</span>" +
        '<span class="ws-name" style="color:' + pl.color + '">' + pl.name + "</span>" +
        '<span class="ws-status">' + (pl.alive ? "standing" : "out") + "</span>" +
        '<span class="ws-score">' + pl.score + "</span>";
      winScores.appendChild(row);
    });
    updateLanes();
    showScreen(winScreen);
  }

  function toMenu() {
    clearPending();
    phase = "menu";
    showScreen(menuScreen);
  }

  /* ---------------- keyboard ---------------- */
  window.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.code === "Escape") {
      e.preventDefault();
      if (phase === "win" || phase === "input" || phase === "playback" || phase === "roundend") {
        toMenu();
      }
      return;
    }
    if (e.code === "KeyM") {
      muted = !muted;
      muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
      return;
    }

    if (phase === "menu") {
      var m = e.code.match(/^Digit([2-6])$/);
      if (m) {
        e.preventDefault();
        setPlayerCount(parseInt(m[1], 10));
        return;
      }
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (phase === "win") {
      if (e.code === "Enter" || e.code === "KeyR" || e.code === "Space") {
        e.preventDefault();
        startGame();
      }
      return;
    }

    // in-game
    var n = e.code.match(/^(?:Digit|Numpad)([1-6])$/);
    if (n) {
      e.preventDefault();
      ensureAudio();
      pressSymbol(parseInt(n[1], 10) - 1);
      return;
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      startGame();
    }
  });

  /* ---------------- wiring ---------------- */
  startBtn.addEventListener("click", function () { ensureAudio(); startGame(); });
  againBtn.addEventListener("click", function () { ensureAudio(); startGame(); });
  menuBtn.addEventListener("click", toMenu);
  muteBtn.addEventListener("click", function () {
    ensureAudio();
    muted = !muted;
    muteBtn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  });

  makeBoard();
  buildMenu();
  showScreen(menuScreen);
})();
