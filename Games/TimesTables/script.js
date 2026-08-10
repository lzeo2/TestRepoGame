/*
 * TimesTables - speed multiplication drill for tables 1-12.
 *
 * CONTROLS
 *   Keyboard:
 *     0-9          type a digit
 *     Backspace    delete the last digit
 *     Enter        submit the current answer / continue
 *     Escape       quit the drill back to the menu
 *     M            start a Mixed Mode drill (from the menu)
 *   Touch / Mouse:
 *     Tap a table tile to choose that table.
 *     Tap "Mixed Mode" for questions from random tables.
 *     On-screen keypad: digits, BACKSPACE, ENTER.
 *
 * PERSISTENCE
 *   Per-table star ratings (0-3) and the Mixed Mode best are kept in
 *   localStorage under the key "timestables_progress".
 *   Stars earned for a 10-question drill:
 *     3 stars -> all 10 correct in 18 seconds or less
 *     2 stars -> all 10 correct in 35 seconds or less
 *     1 star  -> all 10 correct (any time) or 8-9 correct
 *     0 stars -> fewer than 8 correct
 */
(function () {
  "use strict";

  var QUESTIONS = 10;
  var STAR_3 = 18;
  var STAR_2 = 35;
  var STORE_KEY = "timestables_progress";

  var progress = loadProgress();

  var menuScreen = document.getElementById("screen-menu");
  var drillScreen = document.getElementById("screen-drill");
  var resultScreen = document.getElementById("screen-result");
  var progressScreen = document.getElementById("screen-progress");

  var tableGrid = document.getElementById("tableGrid");
  var mixedBtn = document.getElementById("mixedBtn");
  var progressBtn = document.getElementById("progressBtn");

  var drillTableEl = document.getElementById("drillTable");
  var drillQEl = document.getElementById("drillQ");
  var drillTimeEl = document.getElementById("drillTime");
  var drillStreakEl = document.getElementById("drillStreak");
  var questionEl = document.getElementById("question");
  var answerBoxEl = document.getElementById("answerBox");
  var feedbackEl = document.getElementById("feedback");
  var keypadEl = document.getElementById("keypad");

  var resultTitle = document.getElementById("resultTitle");
  var starsRow = document.getElementById("starsRow");
  var resultLine1 = document.getElementById("resultLine1");
  var resultLine2 = document.getElementById("resultLine2");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");

  var progressGrid = document.getElementById("progressGrid");
  var backBtn = document.getElementById("backBtn");
  var resetProgressBtn = document.getElementById("resetProgressBtn");
  var starTotalEl = document.getElementById("starTotal");

  var mode = 6; // table number, or 0 for mixed
  var round = [];
  var idx = 0;
  var input = "";
  var correct = 0;
  var bestStreak = 0;
  var streak = 0;
  var startTime = 0;
  var elapsed = 0;
  var timerId = null;
  var locked = false;

  function loadProgress() {
    var p = null;
    try {
      p = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      p = {};
    }
    if (!p || typeof p !== "object") p = {};
    if (!p.tables || typeof p.tables !== "object") p.tables = {};
    if (!p.mixed) p.mixed = null;
    return p;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* storage unavailable - play on without saving */
    }
    renderStarTotal();
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function starForTable(n) {
    var v = progress.tables[String(n)];
    return typeof v === "number" ? v : 0;
  }

  function renderStarTotal() {
    var sum = 0;
    for (var i = 1; i <= 12; i++) sum += starForTable(i);
    if (progress.mixed) sum += progress.mixed.stars;
    starTotalEl.textContent = sum;
  }

  function starsForRound(correctCount, sec) {
    if (correctCount < 8) return 0;
    if (correctCount < 10) return 1;
    if (sec <= STAR_3) return 3;
    if (sec <= STAR_2) return 2;
    return 1;
  }

  function starsHtml(n) {
    var s = "";
    for (var i = 0; i < 3; i++) s += i < n ? "&#9733;" : "&#9734;";
    return s;
  }

  function buildTableGrid(container, clickHandler) {
    container.innerHTML = "";
    for (var i = 1; i <= 12; i++) {
      (function (n) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "table-tile";
        tile.innerHTML = "<b>" + n + "</b><span class='tile-stars'>" + starsHtml(starForTable(n)) + "</span>";
        tile.addEventListener("click", function () {
          clickHandler(n);
        });
        container.appendChild(tile);
      })(i);
    }
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    drillScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    progressScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function pressKey(k) {
    if (locked) return;
    if (k >= "0" && k <= "9") {
      if (input.length < 3) {
        input += k;
        renderInput();
      }
    } else if (k === "BACK") {
      input = input.slice(0, -1);
      renderInput();
    } else if (k === "ENTER") {
      submit();
    }
  }

  function buildKeypad() {
    var rows = ["123", "456", "789", "0BACKENTER"];
    keypadEl.innerHTML = "";
    for (var r = 0; r < rows.length; r++) {
      var rowEl = document.createElement("div");
      rowEl.className = "key-row";
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        if (ch === "B") {
          btn.textContent = "⌫";
          btn.classList.add("key-wide");
        } else if (ch === "E") {
          btn.textContent = "ENTER";
          btn.classList.add("key-wide", "key-go");
        } else {
          btn.textContent = ch;
        }
        (function (k) {
          btn.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            pressKey(k);
          });
          btn.addEventListener("pointerup", function (e) {
            e.preventDefault();
          });
        })(ch);
        rowEl.appendChild(btn);
      }
      keypadEl.appendChild(rowEl);
    }
  }

  function renderInput() {
    answerBoxEl.textContent = input === "" ? "0" : input;
    answerBoxEl.classList.remove("shake");
  }

  function startDrill(t) {
    mode = t;
    round = [];
    for (var i = 0; i < QUESTIONS; i++) {
      var a, b;
      if (mode === 0) {
        a = 1 + Math.floor(Math.random() * 12);
        b = 1 + Math.floor(Math.random() * 12);
        if (Math.random() < 0.5) {
          var tmp = a;
          a = b;
          b = tmp;
        }
      } else {
        a = mode;
        b = 1 + Math.floor(Math.random() * 12);
      }
      round.push({ a: a, b: b, answer: a * b });
    }
    idx = 0;
    input = "";
    correct = 0;
    streak = 0;
    bestStreak = 0;
    elapsed = 0;
    locked = false;
    drillTableEl.textContent = mode === 0 ? "Mix" : String(mode);
    drillStreakEl.textContent = "0";
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    showScreen(drillScreen);
    renderQuestion();
    startTime = Date.now();
    timerId = setInterval(tickTimer, 200);
  }

  function tickTimer() {
    if (locked) return;
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    drillTimeEl.textContent = fmtTime(elapsed);
  }

  function renderQuestion() {
    var q = round[idx];
    questionEl.textContent = q.a + " \u00d7 " + q.b + " = ?";
    drillQEl.textContent = (idx + 1) + "/" + QUESTIONS;
    input = "";
    renderInput();
  }

  function submit() {
    if (locked) return;
    if (input === "") {
      answerBoxEl.classList.add("shake");
      return;
    }
    var val = parseInt(input, 10);
    var q = round[idx];
    locked = true;
    if (val === q.answer) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      feedbackEl.textContent = "\u2714 Correct!";
      feedbackEl.className = "feedback good";
    } else {
      streak = 0;
      feedbackEl.textContent = "\u2718 " + q.a + " \u00d7 " + q.b + " = " + q.answer;
      feedbackEl.className = "feedback bad";
    }
    drillStreakEl.textContent = bestStreak;
    setTimeout(next, 700);
  }

  function next() {
    locked = false;
    idx++;
    if (idx >= round.length) {
      finishDrill();
      return;
    }
    renderQuestion();
  }

  function finishDrill() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    var sec = Math.round((Date.now() - startTime) / 1000);
    elapsed = sec;
    drillTimeEl.textContent = fmtTime(sec);
    var stars = starsForRound(correct, sec);

    if (mode === 0) {
      var prevBest = progress.mixed && progress.mixed.best ? progress.mixed.best : 99999;
      if (!progress.mixed || stars > progress.mixed.stars ||
          (stars === progress.mixed.stars && sec < prevBest)) {
        progress.mixed = { stars: stars, best: sec };
        saveProgress();
      }
    } else {
      if (stars > starForTable(mode)) {
        progress.tables[String(mode)] = stars;
        saveProgress();
      }
    }

    starsRow.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      var sp = document.createElement("span");
      sp.textContent = i < stars ? "\u2605" : "\u2606";
      sp.className = i < stars ? "star on" : "star";
      starsRow.appendChild(sp);
    }
    resultTitle.textContent =
      stars === 3 ? "Perfect!" :
      stars === 2 ? "Great job!" :
      stars === 1 ? "Good effort!" : "Keep practicing!";
    resultLine1.textContent = correct + " / " + QUESTIONS + " correct in " + fmtTime(sec);
    if (stars > 0) {
      resultLine2.textContent = "Best streak: " + bestStreak + "  \u00b7  Earned " + stars + " star" + (stars > 1 ? "s" : "");
    } else {
      resultLine2.textContent = "Best streak: " + bestStreak + "  \u00b7  Try to get 8+ correct next time!";
    }
    showScreen(resultScreen);
  }

  function quitDrill() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    showScreen(menuScreen);
  }

  function showProgress() {
    buildTableGrid(progressGrid, function () {});
    var mixedTile = document.createElement("button");
    mixedTile.type = "button";
    mixedTile.className = "table-tile mixed";
    var m = progress.mixed;
    mixedTile.innerHTML = "<b>Mix</b><span class='tile-stars'>" +
      (m ? starsHtml(m.stars) : "&#9734;&#9734;&#9734;") +
      "</span><span class='tile-note'>" + (m ? "best " + fmtTime(m.best) : "not yet") + "</span>";
    progressGrid.appendChild(mixedTile);
    showScreen(progressScreen);
  }

  window.addEventListener("keydown", function (e) {
    if (!drillScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        quitDrill();
        return;
      }
      if (e.code === "Enter") {
        e.preventDefault();
        pressKey("ENTER");
        return;
      }
      if (e.code === "Backspace") {
        e.preventDefault();
        pressKey("BACK");
        return;
      }
      var ch = e.key;
      if (ch && ch.length === 1 && ch >= "0" && ch <= "9") {
        e.preventDefault();
        pressKey(ch);
      }
      return;
    }
    if (e.code === "KeyM" && !menuScreen.classList.contains("hidden")) {
      e.preventDefault();
      startDrill(0);
    }
  });

  buildTableGrid(tableGrid, function (n) {
    startDrill(n);
  });
  buildKeypad();
  renderStarTotal();

  mixedBtn.addEventListener("click", function () {
    startDrill(0);
  });
  progressBtn.addEventListener("click", showProgress);
  againBtn.addEventListener("click", function () {
    startDrill(mode);
  });
  menuBtn.addEventListener("click", function () {
    quitDrill();
  });
  backBtn.addEventListener("click", function () {
    showScreen(menuScreen);
  });
  resetProgressBtn.addEventListener("click", function () {
    if (resetProgressBtn.dataset.confirm === "1") {
      progress.tables = {};
      progress.mixed = null;
      saveProgress();
      resetProgressBtn.dataset.confirm = "0";
      resetProgressBtn.textContent = "Reset Progress";
      showProgress();
    } else {
      resetProgressBtn.dataset.confirm = "1";
      resetProgressBtn.textContent = "Tap again to confirm";
      setTimeout(function () {
        resetProgressBtn.dataset.confirm = "0";
        resetProgressBtn.textContent = "Reset Progress";
      }, 2500);
    }
  });
})();
