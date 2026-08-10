/*
 * A-GEO Quiz - Australian geography: capital cities, states & territories,
 * and famous landmarks.
 *
 * CONTROLS
 *   Keyboard:
 *     1-4 or A-D      pick an answer option
 *     Enter           continue to the next question (after answering)
 *     R               restart the quiz (on the result screen)
 *     Escape          quit back to the menu
 *   Touch / Mouse:
 *     Tap an option button to answer.
 *     Buttons on the result screen to replay or return.
 *
 * GAMEPLAY
 *   20 random questions are drawn from a pool of 28. Every correct
 *   answer is worth 1 point. At the end, every question you answered
 *   wrong is listed with your answer and the correct one.
 *
 * PERSISTENCE
 *   Best score kept in localStorage under "ageography_best".
 */
(function () {
  "use strict";

  var QUIZ_LEN = 20;

  var POOL = [
    { q: "What is the capital city of Australia?", opts: ["Canberra", "Sydney", "Melbourne", "Perth"], ans: 0 },
    { q: "What is the capital of New South Wales?", opts: ["Sydney", "Newcastle", "Wollongong", "Parramatta"], ans: 0 },
    { q: "What is the capital of Victoria?", opts: ["Geelong", "Melbourne", "Ballarat", "Bendigo"], ans: 1 },
    { q: "What is the capital of Queensland?", opts: ["Cairns", "Gold Coast", "Brisbane", "Townsville"], ans: 2 },
    { q: "What is the capital of South Australia?", opts: ["Port Augusta", "Mount Gambier", "Whyalla", "Adelaide"], ans: 3 },
    { q: "What is the capital of Western Australia?", opts: ["Perth", "Fremantle", "Bunbury", "Albany"], ans: 0 },
    { q: "What is the capital of Tasmania?", opts: ["Launceston", "Devonport", "Hobart", "Burnie"], ans: 2 },
    { q: "What is the capital of the Northern Territory?", opts: ["Alice Springs", "Katherine", "Palmerston", "Darwin"], ans: 3 },
    { q: "Australia's capital Canberra sits inside which territory?", opts: ["Australian Capital Territory", "New South Wales", "Victoria", "Northern Territory"], ans: 0 },
    { q: "What is the largest city in Australia by population?", opts: ["Melbourne", "Brisbane", "Perth", "Sydney"], ans: 3 },
    { q: "Uluru (Ayers Rock) lies in which part of Australia?", opts: ["Northern Territory", "Queensland", "Western Australia", "South Australia"], ans: 0 },
    { q: "Which famous building is topped with sail-shaped shells?", opts: ["Sydney Opera House", "Parliament House", "Melbourne Museum", "Old Treasury"], ans: 0 },
    { q: "Which bridge spans the harbour between Sydney's CBD and the North Shore?", opts: ["West Gate Bridge", "Sydney Harbour Bridge", "Story Bridge", "Anzac Bridge"], ans: 1 },
    { q: "The Great Barrier Reef lies off the coast of which state?", opts: ["Western Australia", "Northern Territory", "Queensland", "New South Wales"], ans: 2 },
    { q: "The Daintree Rainforest, the world's oldest, is found in which state?", opts: ["Queensland", "Tasmania", "New South Wales", "Victoria"], ans: 0 },
    { q: "Kakadu National Park is located in which territory?", opts: ["Northern Territory", "Australian Capital Territory", "Western Australia", "Queensland"], ans: 0 },
    { q: "Bondi Beach is located in which city?", opts: ["Sydney", "Melbourne", "Gold Coast", "Adelaide"], ans: 0 },
    { q: "The Twelve Apostles rock stacks line which famous road?", opts: ["Great Ocean Road", "Pacific Highway", "Hume Highway", "Nullarbor Highway"], ans: 0 },
    { q: "The Melbourne Cricket Ground (MCG) is in which city?", opts: ["Sydney", "Perth", "Melbourne", "Hobart"], ans: 2 },
    { q: "Kangaroo Island lies off the coast of which state?", opts: ["Victoria", "New South Wales", "Queensland", "South Australia"], ans: 3 },
    { q: "Fraser Island (K'gari), the world's largest sand island, is off which coast?", opts: ["Queensland", "New South Wales", "Tasmania", "Victoria"], ans: 0 },
    { q: "Which of these is an Australian external territory?", opts: ["Norfolk Island", "Kangaroo Island", "Fraser Island", "Moreton Island"], ans: 0 },
    { q: "Which is the largest Australian state by area?", opts: ["Queensland", "New South Wales", "Western Australia", "South Australia"], ans: 2 },
    { q: "Which is the smallest Australian mainland state?", opts: ["Tasmania", "Victoria", "South Australia", "New South Wales"], ans: 1 },
    { q: "The Nullarbor Plain stretches across which two states?", opts: ["Western Australia & South Australia", "Queensland & NSW", "Victoria & Tasmania", "NT & Queensland"], ans: 0 },
    { q: "What is Australia's national animal emblem?", opts: ["Kangaroo", "Koala", "Emu", "Platypus"], ans: 0 },
    { q: "Which bird shares the Australian coat of arms with the kangaroo?", opts: ["Kookaburra", "Emu", "Sulphur-crested Cockatoo", "Galah"], ans: 1 },
    { q: "The Great Australian Bight is found along which coast?", opts: ["North coast", "East coast", "South coast", "West coast"], ans: 2 }
  ];

  var STORE_KEY = "ageography_best";
  var best = parseInt(localStorage.getItem(STORE_KEY) || "0", 10);

  var menuScreen = document.getElementById("screen-menu");
  var quizScreen = document.getElementById("screen-quiz");
  var resultScreen = document.getElementById("screen-result");

  var scoreEl = document.getElementById("score");
  var qCountEl = document.getElementById("qCount");
  var bestEl = document.getElementById("best");
  var menuStats = document.getElementById("menuStats");

  var progressFill = document.getElementById("progressFill");
  var questionEl = document.getElementById("question");
  var optsEl = document.getElementById("opts");
  var quizFeedback = document.getElementById("quizFeedback");

  var resultTitle = document.getElementById("resultTitle");
  var resScore = document.getElementById("resScore");
  var resPct = document.getElementById("resPct");
  var reviewBox = document.getElementById("reviewBox");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");
  var startBtn = document.getElementById("startBtn");

  var quiz = [];       // [{q, opts, ans, chosen}]
  var idx = 0;
  var score = 0;
  var answering = true; // true while the user may pick, false between questions

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
    quizScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function renderBest() {
    bestEl.textContent = best > 0 ? String(best) : "--";
    menuStats.innerHTML =
      "<p>Pool: <b>" + POOL.length + "</b> questions &middot; " +
      "Quiz: <b>" + QUIZ_LEN + "</b> questions</p>" +
      "<p>Best score: <b>" + (best > 0 ? best + " / " + QUIZ_LEN : "--") + "</b></p>";
  }

  function startQuiz() {
    var indexes = [];
    for (var i = 0; i < POOL.length; i++) indexes.push(i);
    shuffle(indexes);
    indexes = indexes.slice(0, QUIZ_LEN);
    quiz = [];
    for (var k = 0; k < indexes.length; k++) {
      var src = POOL[indexes[k]];
      var perm = [];
      for (var o = 0; o < src.opts.length; o++) perm.push({ label: src.opts[o], right: o === src.ans });
      shuffle(perm);
      var ans = 0;
      var opts = [];
      for (var p = 0; p < perm.length; p++) {
        opts.push(perm[p].label);
        if (perm[p].right) ans = p;
      }
      quiz.push({ q: src.q, opts: opts, ans: ans, chosen: -1 });
    }
    idx = 0;
    score = 0;
    scoreEl.textContent = "0";
    renderBest();
    renderQuestion();
    showScreen(quizScreen);
  }

  function renderQuestion() {
    var item = quiz[idx];
    questionEl.textContent = item.q;
    optsEl.innerHTML = "";
    var letters = ["A", "B", "C", "D"];
    for (var i = 0; i < item.opts.length; i++) {
      (function (n) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opt";
        btn.innerHTML = "<em>" + letters[n] + "</em><span>" + item.opts[n] + "</span>";
        btn.addEventListener("click", function () {
          pick(n);
        });
        optsEl.appendChild(btn);
      })(i);
    }
    qCountEl.textContent = (idx + 1) + "/" + QUIZ_LEN;
    progressFill.style.width = Math.round(((idx) / QUIZ_LEN) * 100) + "%";
    quizFeedback.textContent = "";
    quizFeedback.className = "quiz-feedback";
    answering = true;
  }

  function pick(n) {
    if (!answering) return;
    answering = false;
    var item = quiz[idx];
    item.chosen = n;
    var btns = optsEl.children;
    var right = item.ans === n;
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === item.ans) btns[i].classList.add("right");
      else if (i === n) btns[i].classList.add("wrong");
    }
    if (right) {
      score++;
      scoreEl.textContent = score;
      quizFeedback.textContent = "\u2714 Correct!";
      quizFeedback.className = "quiz-feedback good";
    } else {
      quizFeedback.textContent = "\u2718 Wrong - correct answer: " + item.opts[item.ans];
      quizFeedback.className = "quiz-feedback bad";
    }
    progressFill.style.width = Math.round(((idx + 1) / QUIZ_LEN) * 100) + "%";
    setTimeout(function () {
      idx++;
      if (idx >= quiz.length) {
        finishQuiz();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  function finishQuiz() {
    var pct = Math.round((score / QUIZ_LEN) * 100);
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(STORE_KEY, String(best));
      } catch (e) { /* ignore */ }
      renderBest();
    }
    resScore.textContent = score;
    resPct.textContent = pct + "% correct";
    resultTitle.textContent =
      pct === 100 ? "Perfect score!" :
      pct >= 80 ? "Top of the class!" :
      pct >= 60 ? "Good work, mate!" :
      pct >= 40 ? "Not bad - keep exploring!" :
      "Time for a road trip!";

    var wrong = quiz.filter(function (it) {
      return it.chosen !== it.ans;
    });
    reviewBox.innerHTML = "";
    if (wrong.length === 0) {
      var all = document.createElement("p");
      all.className = "all-right";
      all.textContent = "\u2728 Every answer correct! \u2728";
      reviewBox.appendChild(all);
    } else {
      var head = document.createElement("h3");
      head.textContent = "Review (" + wrong.length + " missed)";
      reviewBox.appendChild(head);
      for (var i = 0; i < wrong.length; i++) {
        var it = wrong[i];
        var row = document.createElement("div");
        row.className = "review-row";
        row.innerHTML =
          "<p class='rq'>" + it.q + "</p>" +
          "<p class='rbad'>You answered: " + it.opts[it.chosen] + "</p>" +
          "<p class='rgood'>Correct: " + it.opts[it.ans] + "</p>";
        reviewBox.appendChild(row);
      }
    }
    showScreen(resultScreen);
  }

  window.addEventListener("keydown", function (e) {
    if (!quizScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        showScreen(menuScreen);
        return;
      }
      if (!answering) return;
      var n = -1;
      if (e.code === "Digit1" || e.code === "KeyA") n = 0;
      else if (e.code === "Digit2" || e.code === "KeyB") n = 1;
      else if (e.code === "Digit3" || e.code === "KeyC") n = 2;
      else if (e.code === "Digit4" || e.code === "KeyD") n = 3;
      if (n >= 0 && n < quiz[idx].opts.length) {
        e.preventDefault();
        pick(n);
      }
      return;
    }
    if (!resultScreen.classList.contains("hidden")) {
      if (e.code === "Enter" || e.code === "KeyR" || e.code === "Space") {
        e.preventDefault();
        startQuiz();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        showScreen(menuScreen);
      }
    }
  });

  startBtn.addEventListener("click", startQuiz);
  againBtn.addEventListener("click", startQuiz);
  menuBtn.addEventListener("click", function () {
    showScreen(menuScreen);
  });

  renderBest();
  showScreen(menuScreen);
})();
