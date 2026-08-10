/*
 * TypingTest - measure words-per-minute and accuracy.
 *
 * CONTROLS
 *   Keyboard:
 *     Any printable key   type the next character
 *     Space               commit the current word, move to the next
 *     Backspace           delete the last typed character in the word
 *     R                   restart the current passage
 *     Escape              back to the difficulty menu
 *   Touch / Mouse:
 *     Tap a difficulty card on the menu to begin.
 *     Tap the typing zone so the on-screen keyboard appears.
 *
 * SCORING
 *   WPM     = (correct characters / 5) / elapsed minutes
 *   Accuracy= correct keystrokes / total keystrokes
 *   The best WPM for each difficulty is stored in localStorage
 *   under the key "typingtest_best".
 */
(function () {
  "use strict";

  var TEXTS = {
    easy: [
      "The sun rose over the calm sea and the birds sang in the trees.",
      "We walked along the beach and collected shells in a small bag.",
      "It was a lovely quiet morning to be outside.",
      "Everyone smiled as the day began to warm up."
    ].join(" "),
    medium: [
      "Learning to type quickly takes practice and patience.",
      "Every day you should try to improve your speed a little.",
      "Keep your fingers on the home row and look at the screen, not at your hands.",
      "Accuracy matters more than raw speed when you first begin."
    ].join(" "),
    hard: [
      "Through the misty valleys of the high country, the winding road climbed steadily toward the ancient mountain pass.",
      "A cool breeze carried the scent of pine and damp stone, while distant waterfalls thundered beneath the dense canopy.",
      "The travellers pressed onward, their boots crunching on loose gravel, determined to reach the shelter before the storm arrived."
    ].join(" ")
  };

  var STORE_KEY = "typingtest_best";
  var bests = loadBests();

  var menuScreen = document.getElementById("screen-menu");
  var typingScreen = document.getElementById("screen-typing");
  var resultScreen = document.getElementById("screen-result");

  var wpmEl = document.getElementById("wpm");
  var accEl = document.getElementById("acc");
  var timeEl = document.getElementById("time");
  var passageEl = document.getElementById("passage");
  var typingZone = document.getElementById("typingZone");
  var zoneMsg = typingZone.querySelector(".zone-msg");
  var inputEl = document.getElementById("typeInput");

  var restartBtn = document.getElementById("restartBtn");
  var quitBtn = document.getElementById("quitBtn");
  var retryBtn = document.getElementById("retryBtn");
  var resMenuBtn = document.getElementById("resMenuBtn");

  var resWpm = document.getElementById("resWpm");
  var resAcc = document.getElementById("resAcc");
  var resTime = document.getElementById("resTime");
  var resDetail = document.getElementById("resDetail");
  var resBest = document.getElementById("resBest");

  // words[] entries: { el, chars[], len, token, done }
  var words = [];
  var curWord = 0;
  var charPos = 0;
  var diff = "easy";
  var running = false;
  var finished = false;
  var startTime = 0;
  var timerId = null;
  var typedCount = 0;
  var correctCount = 0;

  function loadBests() {
    var b = null;
    try {
      b = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      b = {};
    }
    if (!b || typeof b !== "object") b = {};
    ["easy", "medium", "hard"].forEach(function (d) {
      if (!b[d]) b[d] = null;
    });
    return b;
  }

  function saveBest(d, wpm, acc, sec) {
    var prev = bests[d];
    if (!prev || wpm > prev.wpm || (wpm === prev.wpm && acc > prev.acc)) {
      bests[d] = { wpm: Math.round(wpm), acc: Math.round(acc), time: sec };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(bests));
      } catch (e) { /* storage unavailable */ }
    }
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderBestLabels() {
    ["easy", "medium", "hard"].forEach(function (d) {
      var el = document.getElementById("best-" + d);
      var b = bests[d];
      el.textContent = b ? "Best: " + b.wpm + " WPM \u00b7 " + b.acc + "%" : "Best: --";
    });
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    typingScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function buildPassage() {
    passageEl.innerHTML = "";
    words = [];
    var tokens = TEXTS[diff].split(" ");
    for (var i = 0; i < tokens.length; i++) {
      var wEl = document.createElement("span");
      wEl.className = "word";
      var chars = [];
      for (var c = 0; c < tokens[i].length; c++) {
        var ch = document.createElement("span");
        ch.className = "ch";
        ch.textContent = tokens[i][c];
        wEl.appendChild(ch);
        chars.push(ch);
      }
      if (i < tokens.length - 1) {
        var sp = document.createElement("span");
        sp.className = "sp";
        sp.textContent = " ";
        wEl.appendChild(sp);
      }
      words.push({ el: wEl, chars: chars, len: tokens[i].length, token: tokens[i], done: false });
      passageEl.appendChild(wEl);
    }
  }

  function renderCursor() {
    for (var i = 0; i < words.length; i++) {
      var cls = "word";
      if (i === curWord) cls += " current";
      if (words[i].done) cls += " done";
      words[i].el.className = cls;
    }
  }

  function startTimer() {
    if (running) return;
    running = true;
    startTime = Date.now();
    timerId = setInterval(tick, 250);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    running = false;
  }

  function tick() {
    if (finished) return;
    var sec = Math.floor((Date.now() - startTime) / 1000);
    timeEl.textContent = fmtTime(sec);
    updateLiveStats(sec);
  }

  function updateLiveStats(sec) {
    var minutes = Math.max(sec, 1) / 60;
    var wpm = Math.round(correctCount / 5 / minutes);
    var acc = typedCount > 0 ? Math.round((correctCount / typedCount) * 100) : 100;
    wpmEl.textContent = wpm;
    accEl.textContent = acc + "%";
  }

  function typeChar(ch) {
    if (finished) return;
    if (curWord >= words.length) return;
    var w = words[curWord];
    if (charPos >= w.len) return;
    startTimer();
    zoneMsg.style.display = "none";
    typedCount++;
    if (ch === w.token[charPos]) {
      correctCount++;
      w.chars[charPos].className = "ch ok";
    } else {
      w.chars[charPos].className = "ch bad";
    }
    charPos++;
    if (charPos >= w.len && curWord === words.length - 1) {
      finish();
    }
  }

  function commitWord() {
    if (finished) return;
    if (curWord >= words.length) return;
    var w = words[curWord];
    while (charPos < w.len) {
      typedCount++;
      w.chars[charPos].className = "ch bad";
      charPos++;
    }
    w.done = true;
    curWord++;
    charPos = 0;
    renderCursor();
    if (curWord >= words.length) {
      finish();
    }
  }

  function backspace() {
    if (finished) return;
    if (charPos <= 0) return;
    charPos--;
    var w = words[curWord];
    w.chars[charPos].className = "ch";
  }

  function finish() {
    finished = true;
    stopTimer();
    var sec = Math.round((Date.now() - startTime) / 1000);
    var minutes = Math.max(sec, 1) / 60;
    var wpm = Math.round(correctCount / 5 / minutes);
    var acc = typedCount > 0 ? Math.round((correctCount / typedCount) * 100) : 100;
    timeEl.textContent = fmtTime(sec);
    wpmEl.textContent = wpm;
    accEl.textContent = acc + "%";
    saveBest(diff, wpm, acc, sec);

    resWpm.textContent = wpm;
    resAcc.textContent = acc + "%";
    resTime.textContent = fmtTime(sec);
    resDetail.textContent = "Correct characters: " + correctCount + " of " + typedCount + " keystrokes";
    var b = bests[diff];
    var isNewBest = b && b.wpm === Math.round(wpm) && b.acc === Math.round(acc);
    resBest.textContent = isNewBest
      ? "New personal best! \u2728"
      : (b ? "Personal best: " + b.wpm + " WPM \u00b7 " + b.acc + "%" : "No best yet");
    showScreen(resultScreen);
  }

  function startPassage(d) {
    diff = d;
    buildPassage();
    curWord = 0;
    charPos = 0;
    typedCount = 0;
    correctCount = 0;
    finished = false;
    stopTimer();
    running = false;
    wpmEl.textContent = "0";
    accEl.textContent = "100%";
    timeEl.textContent = "0:00";
    zoneMsg.style.display = "";
    renderCursor();
    showScreen(typingScreen);
    focusInput();
  }

  function focusInput() {
    try {
      inputEl.focus();
    } catch (e) { /* ignore */ }
  }

  window.addEventListener("keydown", function (e) {
    if (typingScreen.classList.contains("hidden")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.code === "Escape") {
      e.preventDefault();
      showScreen(menuScreen);
      return;
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      startPassage(diff);
      return;
    }
    if (e.code === "Backspace") {
      e.preventDefault();
      backspace();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (charPos > 0) commitWord();
      return;
    }
    var ch = e.key;
    if (ch && ch.length === 1) {
      e.preventDefault();
      typeChar(ch);
    }
  });

  // Fallback for mobile keyboards that do not fire keydown: any character
  // that lands in the hidden input is processed here and cleared.
  inputEl.addEventListener("input", function () {
    var v = inputEl.value;
    if (!v.length) return;
    inputEl.value = "";
    for (var i = 0; i < v.length; i++) {
      var ch = v.charAt(i);
      if (ch === " " || ch === "\n") {
        if (charPos > 0) commitWord();
      } else {
        typeChar(ch);
      }
    }
  });

  typingZone.addEventListener("click", focusInput);
  typingZone.addEventListener("pointerdown", function (e) {
    e.preventDefault();
  });

  restartBtn.addEventListener("click", function () {
    startPassage(diff);
  });
  quitBtn.addEventListener("click", function () {
    showScreen(menuScreen);
  });
  retryBtn.addEventListener("click", function () {
    startPassage(diff);
  });
  resMenuBtn.addEventListener("click", function () {
    showScreen(menuScreen);
  });

  var cards = document.querySelectorAll(".diff-card");
  for (var i = 0; i < cards.length; i++) {
    (function (card) {
      card.addEventListener("click", function () {
        startPassage(card.getAttribute("data-diff"));
      });
    })(cards[i]);
  }

  renderBestLabels();
  showScreen(menuScreen);
})();
