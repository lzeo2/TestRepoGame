/*
 * Memory Match - the classic card-flipping pairs game in three sizes.
 *
 * CONTROLS
 *   Keyboard:
 *     Arrows / WASD     move the highlighted cursor
 *     Space / Enter     flip the card under the cursor
 *     R                 restart with a fresh shuffled board
 *     Escape            quit back to the size menu
 *   Touch / Mouse:
 *     Tap any card to flip it.
 *     Buttons on the win panel to replay or change size.
 *
 * GAMEPLAY
 *   Choose Small (12 cards), Medium (16 cards) or Large (24 cards).
 *   Flip two cards per turn; matching pairs stay face up. The game ends
 *   when every pair is matched. Best scores (fewest moves, then fastest
 *   time) are stored per size in localStorage under "memorymatch_best".
 */
(function () {
  "use strict";

  var EMOJIS = ["\ud83c\udf4e", "\ud83c\udf4c", "\ud83c\udf47", "\ud83c\udf53", "\ud83c\udf49", "\ud83c\udf52", "\ud83e\udd5d", "\ud83c\udf4d", "\ud83c\udf4b", "\ud83e\uded0", "\ud83e\udd65", "\ud83c\udf51"];

  var SIZES = {
    "12": { cols: 4, rows: 3 },
    "16": { cols: 4, rows: 4 },
    "24": { cols: 6, rows: 4 }
  };

  var STORE_KEY = "memorymatch_best";
  var bests = loadBests();

  var menuScreen = document.getElementById("screen-menu");
  var gameScreen = document.getElementById("screen-game");
  var board = document.getElementById("board");
  var movesEl = document.getElementById("moves");
  var timeEl = document.getElementById("time");
  var pairsEl = document.getElementById("pairs");
  var bestEl = document.getElementById("best");
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");

  var N = 12;
  var cols = 4;
  var deck = []; // {emoji, flipped, matched, el}
  var cursor = 0;
  var state = "idle"; // idle | one | locked
  var first = -1;
  var moves = 0;
  var matched = 0;
  var pairs = 0;
  var startTime = 0;
  var timerId = null;
  var finished = false;

  function loadBests() {
    var b = null;
    try {
      b = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      b = {};
    }
    if (!b || typeof b !== "object") b = {};
    ["12", "16", "24"].forEach(function (k) {
      if (!b[k]) b[k] = null;
    });
    return b;
  }

  function saveBests() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(bests));
    } catch (e) { /* ignore */ }
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function fmtBest(b) {
    if (!b) return "Best: --";
    return "Best: " + b.moves + " moves \u00b7 " + fmtTime(b.time);
  }

  function renderBestLabels() {
    ["12", "16", "24"].forEach(function (k) {
      var el = document.getElementById("best-" + k);
      if (el) el.textContent = fmtBest(bests[k]);
    });
    if (bestEl) bestEl.textContent = fmtBest(bests[String(N)]);
  }

  function rankFor(moveCount) {
    if (moveCount === pairs) return "Flawless! \u2728";
    if (moveCount <= pairs + 2) return "Sharp memory! \ud83d\udcaf";
    if (moveCount <= pairs + 6) return "Good job!";
    return "Keep training!";
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function setBoardSize(n) {
    N = n;
    cols = SIZES[String(n)].cols;
    board.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
  }

  function build() {
    board.innerHTML = "";
    deck = [];
    pairs = N / 2;
    var emojis = EMOJIS.slice(0, pairs);
    var values = [];
    for (var i = 0; i < emojis.length; i++) values.push(emojis[i], emojis[i]);
    shuffle(values);
    for (var k = 0; k < values.length; k++) {
      var d = document.createElement("div");
      d.className = "card";
      d.innerHTML =
        '<div class="card-inner">' +
        '<div class="card-face card-front">' + values[k] + "</div>" +
        '<div class="card-face card-back"><span>?</span></div>' +
        "</div>";
      (function (idx) {
        d.addEventListener("click", function () {
          cursor = idx;
          renderCursor();
          flip(idx);
        });
      })(k);
      board.appendChild(d);
      deck.push({ emoji: values[k], flipped: false, matched: false, el: d });
    }
  }

  function renderCursor() {
    for (var i = 0; i < deck.length; i++) {
      var cls = "card";
      if (deck[i].flipped) cls += " flipped";
      if (deck[i].matched) cls += " matched";
      if (i === cursor) cls += " cursor";
      deck[i].el.className = cls;
    }
  }

  function tick() {
    if (startTime === 0 || finished) return;
    var s = Math.floor((Date.now() - startTime) / 1000);
    timeEl.textContent = fmtTime(s);
  }

  function flip(i) {
    if (finished) return;
    var card = deck[i];
    if (state === "locked") return;
    if (card.flipped || card.matched) return;

    if (startTime === 0) {
      startTime = Date.now();
      timerId = setInterval(tick, 250);
    }

    card.flipped = true;
    renderCursor();

    if (first < 0) {
      first = i;
      state = "one";
      return;
    }

    moves++;
    movesEl.textContent = moves;
    var a = first;
    first = -1;

    if (deck[a].emoji === card.emoji) {
      deck[a].matched = true;
      card.matched = true;
      matched++;
      pairsEl.textContent = matched + "/" + pairs;
      state = "idle";
      renderCursor();
      if (matched === pairs) {
        win();
      }
    } else {
      state = "locked";
      var b = i;
      setTimeout(function () {
        deck[a].flipped = false;
        deck[b].flipped = false;
        state = "idle";
        renderCursor();
      }, 800);
    }
  }

  function win() {
    finished = true;
    if (timerId) clearInterval(timerId);
    timerId = null;
    var sec = Math.round((Date.now() - startTime) / 1000);
    timeEl.textContent = fmtTime(sec);

    var key = String(N);
    var prev = bests[key];
    var newBest = !prev ||
      moves < prev.moves ||
      (moves === prev.moves && sec < prev.time);
    if (newBest) {
      bests[key] = { moves: moves, time: sec };
      saveBests();
      renderBestLabels();
    }

    panel.innerHTML =
      "<h2>All Matched!</h2>" +
      "<p class='rank'>" + rankFor(moves) + "</p>" +
      "<p>Moves: <b>" + moves + "</b> &middot; Time: <b>" + fmtTime(sec) + "</b></p>" +
      (newBest ? "<p class='newbest'>\u2728 New best score! \u2728</p>" : "") +
      '<div class="btn-row">' +
      '<button id="againWin" class="btn big" type="button">Play Again</button>' +
      '<button id="sizesWin" class="btn" type="button">Change Size</button>' +
      "</div>";
    document.getElementById("againWin").addEventListener("click", function () {
      overlay.classList.add("hidden");
      newGame(N);
    });
    document.getElementById("sizesWin").addEventListener("click", function () {
      overlay.classList.add("hidden");
      quitGame();
    });
    overlay.classList.remove("hidden");
  }

  function newGame(n) {
    setBoardSize(n);
    build();
    cursor = 0;
    state = "idle";
    first = -1;
    moves = 0;
    matched = 0;
    startTime = 0;
    finished = false;
    if (timerId) clearInterval(timerId);
    timerId = null;
    movesEl.textContent = "0";
    timeEl.textContent = "0:00";
    pairsEl.textContent = "0/" + (N / 2);
    renderBestLabels();
    overlay.classList.add("hidden");
    renderCursor();
    showScreen(gameScreen);
  }

  function quitGame() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    overlay.classList.add("hidden");
    showScreen(menuScreen);
  }

  window.addEventListener("keydown", function (e) {
    if (gameScreen.classList.contains("hidden")) return;
    if (e.code === "Escape") {
      e.preventDefault();
      quitGame();
      return;
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      newGame(N);
      return;
    }
    var rows = SIZES[String(N)].rows;
    var d = 0;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        d = -cols;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        d = cols;
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        d = -1;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        d = 1;
        e.preventDefault();
        break;
      case "Space":
      case "Enter":
        e.preventDefault();
        flip(cursor);
        return;
    }
    if (d) {
      var r = Math.floor(cursor / cols);
      var c = cursor % cols;
      var nr = r;
      var nc = c;
      if (d === -cols) nr--;
      if (d === cols) nr++;
      if (d === -1) nc--;
      if (d === 1) nc++;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        cursor = nr * cols + nc;
        renderCursor();
      }
    }
  });

  var sizeCards = document.querySelectorAll(".size-card");
  for (var i = 0; i < sizeCards.length; i++) {
    (function (card) {
      card.addEventListener("click", function () {
        newGame(parseInt(card.getAttribute("data-cards"), 10));
      });
    })(sizeCards[i]);
  }

  renderBestLabels();
  showScreen(menuScreen);
})();
