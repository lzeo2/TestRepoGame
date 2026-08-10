(function () {
  "use strict";

  var board = document.getElementById("board");
  var timeEl = document.getElementById("time");
  var movesEl = document.getElementById("moves");
  var bestEl = document.getElementById("best");
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");

  var N = 4;
  var EMOJIS = ["🍕", "🍩", "🐸", "🦊", "🍇", "🚗", "⚽", "🎲"];
  var deck = []; // { emoji, flipped, matched, el }
  var cursor = 0;
  var state = "idle"; // idle | one | locked
  var first = -1;
  var moves = 0;
  var matched = 0;
  var startTime = 0;
  var timerId = null;
  var best = parseInt(localStorage.getItem("matchflip_best") || "0", 10);
  if (best > 0) bestEl.textContent = fmt(best);

  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
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

  function build() {
    board.innerHTML = "";
    deck = [];
    var pairs = [];
    for (var i = 0; i < EMOJIS.length; i++) pairs.push(EMOJIS[i], EMOJIS[i]);
    shuffle(pairs);
    for (var k = 0; k < pairs.length; k++) {
      var d = document.createElement("div");
      d.className = "card";
      d.innerHTML =
        '<div class="card-inner">' +
        '<div class="card-face card-front">' + pairs[k] + "</div>" +
        '<div class="card-face card-back">?</div>' +
        "</div>";
      (function (idx) {
        d.addEventListener("click", function () {
          cursor = idx;
          renderCursor();
          flip(idx);
        });
      })(k);
      board.appendChild(d);
      deck.push({ emoji: pairs[k], flipped: false, matched: false, el: d });
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
    if (startTime === 0) return;
    var s = Math.floor((Date.now() - startTime) / 1000);
    timeEl.textContent = fmt(s);
  }

  function flip(i) {
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
      state = "idle";
      renderCursor();
      if (matched === EMOJIS.length) {
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
      }, 850);
    }
  }

  function win() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    var sec = Math.round((Date.now() - startTime) / 1000);
    timeEl.textContent = fmt(sec);
    var newBest = false;
    if (best === 0 || sec < best) {
      best = sec;
      bestEl.textContent = fmt(best);
      localStorage.setItem("matchflip_best", String(best));
      newBest = true;
    }
    panel.innerHTML =
      "<h2>You Win!</h2>" +
      "<p>Time: " + fmt(sec) + " &middot; Moves: " + moves +
      (newBest ? " &middot; <b>New best!</b>" : "") + "</p>" +
      "<button id=\"again\">Play Again</button>";
    document.getElementById("again").addEventListener("click", function () {
      overlay.classList.add("hidden");
      newGame();
    });
    overlay.classList.remove("hidden");
  }

  function newGame() {
    build();
    cursor = 0;
    state = "idle";
    first = -1;
    moves = 0;
    matched = 0;
    startTime = 0;
    if (timerId) clearInterval(timerId);
    timerId = null;
    movesEl.textContent = "0";
    timeEl.textContent = "0:00";
    renderCursor();
  }

  window.addEventListener("keydown", function (e) {
    var d = 0;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        d = -N;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        d = N;
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
      var r = Math.floor(cursor / N),
        c = cursor % N;
      var nr = r,
        nc = c;
      if (d === -N) nr--;
      if (d === N) nr++;
      if (d === -1) nc--;
      if (d === 1) nc++;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
        cursor = nr * N + nc;
        renderCursor();
      }
    }
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    overlay.classList.add("hidden");
    newGame();
  });

  newGame();
})();
