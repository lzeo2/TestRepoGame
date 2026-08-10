/*
 * Word Scramble - unscramble anagrams with optional hints.
 *
 * CONTROLS
 *   Keyboard:
 *     A-Z             type a letter into the next empty slot
 *     Backspace       remove the last typed (non-revealed) letter
 *     Enter           submit your answer
 *     H               use a hint (reveals the next hidden letter)
 *     S               skip the current word
 *     Escape          quit back to the menu
 *   Touch / Mouse:
 *     Tap the scrambled letter tiles to build the word.
 *     Shuffle / Hint / Skip / Submit buttons below the tiles.
 *
 * SCORING
 *   A correct word earns 10 + streak bonus (up to +10) minus 2 points
 *   for every hint used on that word (minimum 1 point). Wrong answers
 *   and skips reset the streak. 3 hints are available per game.
 *
 * PERSISTENCE
 *   Best score and games played are kept in localStorage under
 *   "wordscramble_best".
 */
(function () {
  "use strict";

  var GAME_LEN = 10;
  var HINTS_PER_GAME = 3;

  var WORDS = [
    { w: "guitar", h: "Stringed instrument you strum" },
    { w: "puzzle", h: "A game that tests your wits" },
    { w: "dragon", h: "A fire-breathing mythical beast" },
    { w: "orange", h: "A round citrus fruit and a colour" },
    { w: "planet", h: "A large body that orbits a star" },
    { w: "castle", h: "A fortified home for royalty" },
    { w: "rocket", h: "A vehicle that blasts into space" },
    { w: "coffee", h: "A caffeinated morning drink" },
    { w: "island", h: "Land surrounded by water" },
    { w: "tunnel", h: "An underground passage" },
    { w: "jungle", h: "A dense wild tropical forest" },
    { w: "thunder", h: "The sound that follows lightning" },
    { w: "wizard", h: "A magic-user who casts spells" },
    { w: "bridge", h: "A structure that spans a river" },
    { w: "candle", h: "Wax that melts to give light" },
    { w: "garden", h: "A plot where flowers and plants grow" },
    { w: "magnet", h: "A metal object that attracts iron" },
    { w: "pepper", h: "A spice that can make you sneeze" },
    { w: "silver", h: "A shiny grey precious metal" },
    { w: "pocket", h: "A small pouch sewn into clothes" },
    { w: "ladder", h: "Rungs you climb to reach high places" },
    { w: "window", h: "A glass pane set in a wall" },
    { w: "banana", h: "A long yellow curved fruit" },
    { w: "jacket", h: "An outer garment with sleeves" },
    { w: "bottle", h: "A container for drinks" },
    { w: "circle", h: "A round shape with no corners" },
    { w: "hammer", h: "A tool used to drive nails" },
    { w: "pillow", h: "A soft cushion for your head" },
    { w: "goblin", h: "A mischievous little creature" },
    { w: "anchor", h: "A heavy hook that holds a ship still" }
  ];

  var STORE_KEY = "wordscramble_best";
  var saved = loadSaved();

  var menuScreen = document.getElementById("screen-menu");
  var gameScreen = document.getElementById("screen-game");
  var resultScreen = document.getElementById("screen-result");

  var scoreEl = document.getElementById("score");
  var wCountEl = document.getElementById("wCount");
  var streakEl = document.getElementById("streak");
  var menuStats = document.getElementById("menuStats");

  var hintsEl = document.getElementById("hints");
  var hintWordEl = document.getElementById("hintWord");
  var slotsEl = document.getElementById("slots");
  var tilesEl = document.getElementById("tiles");
  var shuffleBtn = document.getElementById("shuffleBtn");
  var hintBtn = document.getElementById("hintBtn");
  var skipBtn = document.getElementById("skipBtn");
  var submitBtn = document.getElementById("submitBtn");
  var gameFeedback = document.getElementById("gameFeedback");

  var resultTitle = document.getElementById("resultTitle");
  var resScore = document.getElementById("resScore");
  var resDetail = document.getElementById("resDetail");
  var resBest = document.getElementById("resBest");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");
  var startBtn = document.getElementById("startBtn");

  var gameWords = [];   // [{w, h}] the 10 words for this game
  var wordIdx = 0;
  var slots = [];       // [{ch, revealed}]
  var tiles = [];       // letters still available (buttons)
  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var hintsLeft = HINTS_PER_GAME;
  var correctWords = 0;
  var answering = true; // lock between submissions

  function loadSaved() {
    var s = null;
    try {
      s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      s = {};
    }
    if (!s || typeof s !== "object") s = {};
    if (typeof s.best !== "number") s.best = 0;
    if (typeof s.games !== "number") s.games = 0;
    return s;
  }

  function saveSaved() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch (e) { /* ignore */ }
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

  function scramble(word) {
    var letters = word.split("");
    for (var attempt = 0; attempt < 12; attempt++) {
      shuffle(letters);
      var joined = letters.join("");
      if (joined !== word && joined.charAt(0) !== word.charAt(0)) {
        return letters;
      }
    }
    // fallback: still different from the answer
    shuffle(letters);
    if (letters.join("") === word) {
      var tmp = letters[0];
      letters[0] = letters[1];
      letters[1] = tmp;
    }
    return letters;
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function renderMenuStats() {
    menuStats.innerHTML =
      "<p>Word pool: <b>" + WORDS.length + "</b> &middot; Game: <b>" + GAME_LEN + "</b> words</p>" +
      "<p>Best score: <b>" + saved.best + "</b> &middot; Games played: <b>" + saved.games + "</b></p>";
  }

  function startGame() {
    var indexes = [];
    for (var i = 0; i < WORDS.length; i++) indexes.push(i);
    shuffle(indexes);
    gameWords = [];
    for (var k = 0; k < GAME_LEN; k++) {
      gameWords.push(WORDS[indexes[k]]);
    }
    wordIdx = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    hintsLeft = HINTS_PER_GAME;
    correctWords = 0;
    scoreEl.textContent = "0";
    streakEl.textContent = "0";
    renderMenuStats();
    renderWord();
    showScreen(gameScreen);
  }

  function renderWord() {
    var item = gameWords[wordIdx];
    hintWordEl.textContent = "?";
    slots = [];
    slotsEl.innerHTML = "";
    for (var i = 0; i < item.w.length; i++) {
      var slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "";
      slotsEl.appendChild(slot);
      slots.push({ ch: null, revealed: false, el: slot });
    }
    tiles = scramble(item.w);
    hintsEl.textContent = hintsLeft;
    wCountEl.textContent = (wordIdx + 1) + "/" + GAME_LEN;
    gameFeedback.textContent = "";
    gameFeedback.className = "game-feedback";
    answering = true;
    renderTiles();
  }

  function renderTiles() {
    tilesEl.innerHTML = "";
    for (var i = 0; i < tiles.length; i++) {
      (function (letter) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tile";
        b.textContent = letter;
        b.addEventListener("click", function () {
          addLetter(letter);
        });
        tilesEl.appendChild(b);
      })(tiles[i]);
    }
    if (tiles.length === 0) {
      var empty = document.createElement("span");
      empty.className = "tiles-empty";
      empty.textContent = "all letters used";
      tilesEl.appendChild(empty);
    }
  }

  function addLetter(letter) {
    if (!answering) return;
    // find the first empty, non-revealed slot
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].revealed && slots[i].ch === null) {
        slots[i].ch = letter;
        slots[i].el.textContent = letter;
        // remove one matching tile (if present)
        var idx = tiles.indexOf(letter);
        if (idx >= 0) tiles.splice(idx, 1);
        renderTiles();
        return;
      }
    }
    // no empty slot - maybe the word is complete; ignore
  }

  function removeLast() {
    if (!answering) return;
    for (var i = slots.length - 1; i >= 0; i--) {
      var s = slots[i];
      if (!s.revealed && s.ch !== null) {
        tiles.push(s.ch);
        s.ch = null;
        s.el.textContent = "";
        renderTiles();
        return;
      }
    }
  }

  function useHint() {
    if (!answering) return;
    if (hintsLeft <= 0) {
      flashHint();
      return;
    }
    var item = gameWords[wordIdx];
    // reveal the leftmost hidden slot
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].revealed && slots[i].ch === null) {
        slots[i].ch = item.w[i];
        slots[i].revealed = true;
        slots[i].el.textContent = item.w[i];
        slots[i].el.classList.add("revealed");
        hintsLeft--;
        hintsEl.textContent = hintsLeft;
        var idx = tiles.indexOf(item.w[i]);
        if (idx >= 0) tiles.splice(idx, 1);
        renderTiles();
        return;
      }
    }
  }

  function flashHint() {
    gameFeedback.textContent = "No hints left!";
    gameFeedback.className = "game-feedback bad";
    setTimeout(function () {
      if (answering) {
        gameFeedback.textContent = "";
        gameFeedback.className = "game-feedback";
      }
    }, 900);
  }

  function currentAnswer() {
    var s = "";
    for (var i = 0; i < slots.length; i++) {
      s += slots[i].ch === null ? "" : slots[i].ch;
    }
    return s;
  }

  function hintsUsedOnWord() {
    var used = 0;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].revealed) used++;
    }
    return used;
  }

  function submit() {
    if (!answering) return;
    var item = gameWords[wordIdx];
    var ans = currentAnswer();
    if (ans === "") return;
    answering = false;
    var hintsUsed = hintsUsedOnWord();

    if (ans === item.w) {
      correctWords++;
      var bonus = Math.min(streak * 2, 10);
      var pts = Math.max(1, 10 + bonus - hintsUsed * 2);
      score += pts;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      scoreEl.textContent = score;
      streakEl.textContent = streak;
      gameFeedback.textContent = "\u2714 Correct! +" + pts + " points" + (hintsUsed > 0 ? " (-" + (hintsUsed * 2) + " hints)" : "");
      gameFeedback.className = "game-feedback good";
      slotsEl.classList.add("celebrate");
      setTimeout(next, 900);
    } else {
      streak = 0;
      streakEl.textContent = "0";
      gameFeedback.textContent = "\u2718 Not quite - the word was \"" + item.w.toUpperCase() + "\"";
      gameFeedback.className = "game-feedback bad";
      revealAnswer();
      setTimeout(next, 1700);
    }
  }

  function skip() {
    if (!answering) return;
    answering = false;
    streak = 0;
    streakEl.textContent = "0";
    gameFeedback.textContent = "Skipped - the word was \"" + gameWords[wordIdx].w.toUpperCase() + "\"";
    gameFeedback.className = "game-feedback bad";
    revealAnswer();
    setTimeout(next, 1400);
  }

  function revealAnswer() {
    var item = gameWords[wordIdx];
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].ch === null) {
        slots[i].el.textContent = item.w[i];
      }
      slots[i].el.classList.add("shown");
    }
    hintWordEl.textContent = item.h;
  }

  function next() {
    slotsEl.classList.remove("celebrate");
    wordIdx++;
    if (wordIdx >= gameWords.length) {
      finishGame();
      return;
    }
    renderWord();
  }

  function finishGame() {
    var isNewBest = score > saved.best;
    saved.games++;
    if (isNewBest) saved.best = score;
    saveSaved();
    resScore.textContent = score;
    resDetail.textContent = "Words solved: " + correctWords + " / " + GAME_LEN + "  \u00b7  Best streak: " + bestStreak;
    resBest.textContent = isNewBest && score > 0
      ? "\u2728 New best score! \u2728"
      : "Best score: " + saved.best;
    resultTitle.textContent =
      score >= 140 ? "Scramble master!" :
      score >= 100 ? "Word wizard!" :
      score >= 60 ? "Nice work!" :
      "Keep practising!";
    showScreen(resultScreen);
  }

  window.addEventListener("keydown", function (e) {
    if (!gameScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        showScreen(menuScreen);
        return;
      }
      if (e.code === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.code === "Backspace") {
        e.preventDefault();
        removeLast();
        return;
      }
      if (e.code === "KeyH") {
        e.preventDefault();
        useHint();
        return;
      }
      if (e.code === "KeyS") {
        e.preventDefault();
        skip();
        return;
      }
      var ch = e.key;
      if (ch && ch.length === 1 && /[a-zA-Z]/.test(ch)) {
        e.preventDefault();
        addLetter(ch.toLowerCase());
      }
      return;
    }
    if (!resultScreen.classList.contains("hidden")) {
      if (e.code === "Enter" || e.code === "Space" || e.code === "KeyR") {
        e.preventDefault();
        startGame();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        showScreen(menuScreen);
      }
    }
  });

  shuffleBtn.addEventListener("click", function () {
    shuffle(tiles);
    renderTiles();
  });
  hintBtn.addEventListener("click", useHint);
  skipBtn.addEventListener("click", skip);
  submitBtn.addEventListener("click", submit);
  startBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", startGame);
  menuBtn.addEventListener("click", function () {
    showScreen(menuScreen);
  });

  renderMenuStats();
  showScreen(menuScreen);
})();
