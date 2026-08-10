/*
 * Mental Math - timed arithmetic drill.
 *
 * CONTROLS
 *   Keyboard:
 *     Menu:   1/2/3  pick difficulty
 *             4/5/6  pick round length
 *             Enter  start the drill
 *     Game:   digits 0-9  type your answer
 *             Backspace   delete last digit
 *             Enter       submit your answer
 *             Escape      quit back to the menu
 *     Result: Enter / R   play again
 *             Escape      back to menu
 *   Touch / Mouse:
 *     Tap difficulty and length buttons, then Start.
 *     Use the on-screen keypad to type answers (OK = submit).
 *
 * SCORING
 *   Each correct answer earns 10 + streak bonus (up to +20) multiplied
 *   by the difficulty factor (Easy 1, Medium 2, Hard 3). Wrong answers
 *   reset the streak. Best score is kept per difficulty in localStorage.
 */
(function () {
  "use strict";

  var DIFFS = {
    easy:   { label: "Easy",   mult: 1 },
    medium: { label: "Medium", mult: 2 },
    hard:   { label: "Hard",   mult: 3 }
  };
  var LENGTHS = [30, 60, 120];
  var DEFAULT_DIFF = "easy";
  var DEFAULT_TIME = 60;

  var STORE_KEY = "mentalmath_best";

  var menuScreen = document.getElementById("screen-menu");
  var cdScreen = document.getElementById("screen-countdown");
  var gameScreen = document.getElementById("screen-game");
  var resultScreen = document.getElementById("screen-result");

  var menuBest = document.getElementById("menuBest");
  var menuGames = document.getElementById("menuGames");
  var diffRow = document.getElementById("diffRow");
  var timeRow = document.getElementById("timeRow");
  var startBtn = document.getElementById("startBtn");

  var cdLabel = document.getElementById("cdLabel");
  var cdNum = document.getElementById("cdNum");

  var scoreEl = document.getElementById("score");
  var streakEl = document.getElementById("streak");
  var timerChip = document.getElementById("timerChip");
  var timeLeftEl = document.getElementById("timeLeft");
  var solvedEl = document.getElementById("solved");
  var questionEl = document.getElementById("question");
  var answerBoxEl = document.getElementById("answerBox");
  var feedbackEl = document.getElementById("feedback");
  var keypadEl = document.getElementById("keypad");

  var resultTitle = document.getElementById("resultTitle");
  var resScore = document.getElementById("resScore");
  var resDetail = document.getElementById("resDetail");
  var resBest = document.getElementById("resBest");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");

  var saved = loadSaved();

  var diff = DEFAULT_DIFF;
  var length = DEFAULT_TIME;

  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var correct = 0;
  var attempted = 0;
  var answer = "";      // current typed answer
  var questionText = "";
  var correctAnswer = 0;
  var lock = false;     // prevents input between submit and next question
  var endTime = 0;      // timestamp when the round ends
  var timerId = null;
  var nextId = null;    // pending timeout between questions
  var cdTimeouts = [];

  function loadSaved() {
    var s = null;
    try {
      s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      s = {};
    }
    if (!s || typeof s !== "object") s = {};
    if (!s.best || typeof s.best !== "object") s.best = { easy: 0, medium: 0, hard: 0 };
    if (typeof s.games !== "number") s.games = 0;
    return s;
  }

  function saveSaved() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch (e) { /* ignore */ }
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ---------- question generator ---------- */
  function genQuestion() {
    var text = "";
    var ans = 0;
    if (diff === "easy") {
      switch (rand(0, 3)) {
        case 0:
          var a = rand(1, 20);
          var b = rand(1, 20);
          ans = a + b;
          text = a + " + " + b;
          break;
        case 1:
          var c = rand(2, 9);
          var d = rand(2, 9);
          ans = c * d;
          text = c + " \u00d7 " + d;
          break;
        case 2:
          var e = rand(5, 30);
          var f = rand(1, e - 1);
          ans = e - f;
          text = e + " - " + f;
          break;
        case 3:
          var g = rand(2, 9);
          var h = rand(2, 9);
          ans = g;
          text = (g * h) + " \u00f7 " + h;
          break;
      }
    } else if (diff === "medium") {
      switch (rand(0, 3)) {
        case 0:
          var a = rand(11, 99);
          var b = rand(11, 99);
          ans = a + b;
          text = a + " + " + b;
          break;
        case 1:
          var c = rand(3, 12);
          var d = rand(3, 12);
          ans = c * d;
          text = c + " \u00d7 " + d;
          break;
        case 2:
          var e = rand(25, 99);
          var f = rand(11, e - 1);
          ans = e - f;
          text = e + " - " + f;
          break;
        case 3:
          var g = rand(3, 12);
          var h = rand(3, 12);
          ans = g;
          text = (g * h) + " \u00f7 " + h;
          break;
      }
    } else {
      // hard: multi-step and larger products
      switch (rand(0, 3)) {
        case 0:
          var a = rand(6, 15);
          var b = rand(6, 15);
          var c = rand(1, 20);
          var p = a * b;
          ans = p + c;
          text = "(" + a + " \u00d7 " + b + ") + " + c;
          break;
        case 1:
          var d = rand(6, 15);
          var e = rand(6, 15);
          var prod = d * e;
          var f = rand(1, prod - 1);
          ans = prod - f;
          text = "(" + d + " \u00d7 " + e + ") - " + f;
          break;
        case 2:
          var g = rand(11, 19);
          var h = rand(11, 19);
          ans = g * h;
          text = g + " \u00d7 " + h;
          break;
        case 3:
          var i = rand(6, 15);
          var j = rand(6, 15);
          ans = i;
          text = (i * j) + " \u00f7 " + j;
          break;
      }
    }
    return { text: text, ans: ans };
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
    menuBest.textContent = saved.best[diff] || 0;
    menuGames.textContent = saved.games;
    var segs = diffRow.querySelectorAll(".seg");
    for (var i = 0; i < segs.length; i++) {
      segs[i].classList.toggle("active", segs[i].getAttribute("data-diff") === diff);
    }
    var tsegs = timeRow.querySelectorAll(".seg");
    for (var k = 0; k < tsegs.length; k++) {
      tsegs[k].classList.toggle("active", Number(tsegs[k].getAttribute("data-time")) === length);
    }
  }

  /* ---------- countdown ---------- */
  function startCountdown() {
    clearCdTimeouts();
    showScreen(cdScreen);
    cdLabel.textContent = diff === "hard" ? "Hard \u2014 get ready" :
                          diff === "medium" ? "Medium \u2014 get ready" : "Easy \u2014 get ready";
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
    score = 0;
    streak = 0;
    bestStreak = 0;
    correct = 0;
    attempted = 0;
    lock = false;
    scoreEl.textContent = "0";
    streakEl.textContent = "0";
    solvedEl.textContent = "0";
    endTime = Date.now() + length * 1000;
    showScreen(gameScreen);
    renderQuestion();
    startTimer();
  }

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

  function renderQuestion() {
    var q = genQuestion();
    questionText = q.text;
    correctAnswer = q.ans;
    questionEl.textContent = q.text + "  = ?";
    answer = "";
    answerBoxEl.textContent = "\u00a0";
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    answerBoxEl.classList.remove("good-flash", "bad-flash");
    lock = false;
  }

  function addDigit(d) {
    if (lock) return;
    if (answer.length >= 4) return;
    answer += d;
    answerBoxEl.textContent = answer;
  }

  function backspace() {
    if (lock) return;
    answer = answer.slice(0, -1);
    answerBoxEl.textContent = answer === "" ? "\u00a0" : answer;
  }

  function submit() {
    if (lock) return;
    if (answer === "") {
      feedbackEl.textContent = "Type an answer first!";
      feedbackEl.className = "feedback bad";
      answerBoxEl.classList.remove("shake");
      void answerBoxEl.offsetWidth;
      answerBoxEl.classList.add("shake");
      return;
    }
    lock = true;
    attempted++;
    solvedEl.textContent = attempted;
    var given = parseInt(answer, 10);

    if (given === correctAnswer) {
      correct++;
      var bonus = Math.min(streak * 2, 10);
      var pts = (10 + bonus) * DIFFS[diff].mult;
      score += pts;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      scoreEl.textContent = score;
      streakEl.textContent = streak;
      feedbackEl.textContent = "\u2714 Correct! +" + pts;
      feedbackEl.className = "feedback good";
      answerBoxEl.classList.add("good-flash");
      scheduleNext(500);
    } else {
      streak = 0;
      streakEl.textContent = "0";
      feedbackEl.textContent = "\u2718 Not quite \u2014 " + questionText + " = " + correctAnswer;
      feedbackEl.className = "feedback bad";
      answerBoxEl.classList.add("bad-flash");
      answerBoxEl.classList.remove("shake");
      void answerBoxEl.offsetWidth;
      answerBoxEl.classList.add("shake");
      scheduleNext(1100);
    }
  }

  function scheduleNext(delay) {
    clearTimeout(nextId);
    nextId = setTimeout(function () {
      nextId = null;
      nextQuestion();
    }, delay);
  }

  function nextQuestion() {
    answerBoxEl.classList.remove("good-flash", "bad-flash", "shake");
    renderQuestion();
  }

  /* ---------- end ---------- */
  function finishRound() {
    if (timerId === null) return; // already finished
    stopTimer();
    clearTimeout(nextId);
    nextId = null;
    lock = true;
    var isNewBest = score > (saved.best[diff] || 0);
    saved.games++;
    if (isNewBest) saved.best[diff] = score;
    saveSaved();

    resScore.textContent = score;
    resDetail.textContent =
      "Correct: " + correct + " / " + attempted +
      "  \u00b7  Best streak: " + bestStreak +
      "  \u00b7  Accuracy: " + (attempted > 0 ? Math.round((correct / attempted) * 100) : 0) + "%";
    resBest.textContent = isNewBest && score > 0
      ? "\u2728 New best for " + DIFFS[diff].label + "! \u2728"
      : "Best for " + DIFFS[diff].label + ": " + (saved.best[diff] || 0);
    resBest.className = isNewBest && score > 0 ? "res-best" : "";
    resultTitle.textContent =
      score >= 120 ? "Mathlete!" :
      score >= 60 ? "Sharp mind!" :
      score >= 20 ? "Nice work!" :
      "Keep practising!";
    showScreen(resultScreen);
    renderMenu();
  }

  /* ---------- keypad ---------- */
  function buildKeypad() {
    var rows = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["CLR", "0", "\u232b"]
    ];
    for (var r = 0; r < rows.length; r++) {
      var row = document.createElement("div");
      row.className = "key-row";
      for (var c = 0; c < rows[r].length; c++) {
        var label = rows[r][c];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        btn.textContent = label;
        (function (l) {
          btn.addEventListener("click", function () {
            if (l === "CLR") {
              answer = "";
              answerBoxEl.textContent = "\u00a0";
            } else if (l === "\u232b") {
              backspace();
            } else {
              addDigit(l);
            }
          });
        })(label);
        row.appendChild(btn);
      }
      keypadEl.appendChild(row);
    }
    var goRow = document.createElement("div");
    goRow.className = "key-row";
    var goBtn = document.createElement("button");
    goBtn.type = "button";
    goBtn.className = "key key-wide key-go";
    goBtn.textContent = "OK \u2714";
    goBtn.addEventListener("click", submit);
    goRow.appendChild(goBtn);
    keypadEl.appendChild(goRow);
  }

  /* ---------- events ---------- */
  function handleKey(e) {
    if (!menuScreen.classList.contains("hidden")) {
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        diff = e.key === "1" ? "easy" : e.key === "2" ? "medium" : "hard";
        renderMenu();
        return;
      }
      if (e.key === "4" || e.key === "5" || e.key === "6") {
        length = LENGTHS[Number(e.key) - 4];
        renderMenu();
        return;
      }
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        startCountdown();
      }
      return;
    }

    if (!cdScreen.classList.contains("hidden")) return;

    if (!gameScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        stopTimer();
        clearTimeout(nextId);
        nextId = null;
        renderMenu();
        showScreen(menuScreen);
        return;
      }
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.code === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
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
        renderMenu();
        showScreen(menuScreen);
      }
    }
  }

  diffRow.addEventListener("click", function (e) {
    var seg = e.target.closest(".seg");
    if (!seg) return;
    diff = seg.getAttribute("data-diff");
    renderMenu();
  });
  timeRow.addEventListener("click", function (e) {
    var seg = e.target.closest(".seg");
    if (!seg) return;
    length = Number(seg.getAttribute("data-time"));
    renderMenu();
  });
  startBtn.addEventListener("click", startCountdown);
  againBtn.addEventListener("click", startCountdown);
  menuBtn.addEventListener("click", function () {
    renderMenu();
    showScreen(menuScreen);
  });

  window.addEventListener("keydown", handleKey);

  buildKeypad();
  renderMenu();
  showScreen(menuScreen);
})();
