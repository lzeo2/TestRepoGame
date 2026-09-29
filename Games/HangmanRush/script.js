/* Hangman Rush - guess the hidden word before the hangman is complete. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Word list, embedded so the game never fetches anything. One line
     per category: "CATEGORY:word word ...". Lowercase A-Z only.
     Words are filtered by length so puzzles stay readable on phones.
     ------------------------------------------------------------------ */
  var BANK = [
    "Animal:cat dog bear mouse horse tiger zebra panda koala camel sheep whale shark eagle snake monkey rabbit lion wolf deer frog duck goose donkey ferret hamster lizard parrot turtle beaver falcon lynx",
    "Food:bread pizza pasta apple banana cheese butter pepper tomato noodle cookie donut honey salad burger waffle pancake lasagna meatball popcorn yogurt cabbage pumpkin avocado biscuit",
    "Country:china japan brazil canada norway greece france germany ireland mexico morocco panama russia sweden turkey vietnam ethiopia mongolia portugal",
    "Sport:soccer tennis hockey rugby skiing boxing sailing karate squash curling cricket surfing climbing baseball football basketball volleyball badminton",
    "Space:moon mars comet galaxy nebula meteor eclipse gravity asteroid telescope astronaut mercury jupiter saturn venus neptune pluto"
  ];

  var MIN_LEN = 3;
  var MAX_LEN = 12;
  var MAX_MISSES = 7;
  var PUZZLES_PER_RUN = 10;
  var LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

  /* Hangman stages: index = number of misses, capped at MAX_MISSES. */
  var ART = [
    "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
    "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========",
    "  +---+\n  |   |\n  X   |\n /|\\  |\n / \\  |\n      |\n========="
  ];

  var el = {
    startScreen: document.getElementById("startScreen"),
    playScreen: document.getElementById("playScreen"),
    endOverlay: document.getElementById("endOverlay"),
    endTitle: document.getElementById("endTitle"),
    endText: document.getElementById("endText"),
    score: document.getElementById("score"),
    streak: document.getElementById("streak"),
    category: document.getElementById("category"),
    hangman: document.getElementById("hangman"),
    display: document.getElementById("display"),
    msg: document.getElementById("msg"),
    keyboard: document.getElementById("keyboard"),
    menuBtn: document.getElementById("menuBtn"),
    startBtn: document.getElementById("startBtn"),
    nextBtn: document.getElementById("nextBtn"),
    endMenuBtn: document.getElementById("endMenuBtn")
  };

  /* ---------------------------- state ------------------------------- */

  var puzzles = [];    // [{category, word}] for the current run
  var index = 0;       // current puzzle
  var word = "";
  var guessed = {};    // letter -> true, for the current puzzle
  var misses = 0;
  var score = 0;
  var streak = 0;
  var over = false;

  /* ------------------------ puzzle building ------------------------- */

  function parseBank() {
    var out = [];
    var seen = {};
    BANK.forEach(function (line) {
      var i = line.indexOf(":");
      var cat = line.slice(0, i);
      line.slice(i + 1).split(" ").forEach(function (w) {
        if (w.length >= MIN_LEN && w.length <= MAX_LEN && !seen[w]) {
          seen[w] = true;
          out.push({ category: cat, word: w });
        }
      });
    });
    return out;
  }

  var ALL = parseBank();

  function dealPuzzles() {
    var pool = ALL.slice();
    puzzles = [];
    while (puzzles.length < PUZZLES_PER_RUN && pool.length) {
      var j = Math.floor(Math.random() * pool.length);
      puzzles.push(pool.splice(j, 1)[0]);
    }
  }

  /* --------------------------- rendering ---------------------------- */

  function updateScoreline() {
    el.score.textContent = score;
    el.streak.textContent = streak;
  }

  function render() {
    el.hangman.textContent = ART[Math.min(misses, MAX_MISSES)];
    el.hangman.setAttribute("aria-label",
      "the hangman drawing after " + misses + " wrong guesses");

    var shown = "";
    for (var i = 0; i < word.length; i++) {
      shown += guessed[word.charAt(i)] ? word.charAt(i) : "_";
    }
    el.display.textContent = shown;
    el.display.setAttribute("aria-label",
      "the word with guessed letters revealed: " +
      shown.split("").join(" "));

    Array.prototype.forEach.call(el.keyboard.children, function (btn) {
      var letter = btn.getAttribute("data-letter");
      var taken = guessed[letter] !== undefined;
      btn.disabled = taken || over;
      btn.className = taken ? "taken" : "";
    });
  }

  function say(m, cls) {
    el.msg.textContent = m;
    el.msg.className = cls || "";
  }

  /* --------------------------- game flow ---------------------------- */

  function loadPuzzle() {
    var p = puzzles[index];
    word = p.word;
    guessed = {};
    misses = 0;
    over = false;
    el.category.textContent = "Category: " + p.category +
      " - word " + (index + 1) + " of " + puzzles.length;
    say("");
    render();
  }

  function startRun() {
    dealPuzzles();
    index = 0;
    score = 0;
    streak = 0;
    updateScoreline();
    el.startScreen.classList.add("hidden");
    el.endOverlay.classList.add("hidden");
    el.playScreen.classList.remove("hidden");
    loadPuzzle();
  }

  function puzzleWon() {
    for (var i = 0; i < word.length; i++) {
      if (!guessed[word.charAt(i)]) return false;
    }
    return true;
  }

  function settlePuzzle() {
    if (puzzleWon()) {
      var spare = MAX_MISSES - misses;
      var points = 100 + 25 * spare;
      score += points;
      streak += 1;
      updateScoreline();
      if (index + 1 >= puzzles.length) {
        finish(true);
      } else {
        index += 1;
        say("+" + points + " points", "won");
        loadPuzzle();
      }
    } else if (misses >= MAX_MISSES) {
      finish(false);
    }
  }

  function guess(letter) {
    if (over || guessed[letter] !== undefined) return;
    guessed[letter] = word.indexOf(letter) !== -1;
    if (!guessed[letter]) misses += 1;
    render();
    if (misses > 0 && !guessed[letter]) {
      say("No " + letter.toUpperCase() + ". " +
        (MAX_MISSES - misses) + " guesses left.", "warn");
    } else {
      say("");
    }
    settlePuzzle();
  }

  function finish(won) {
    over = true;
    render();
    el.display.textContent = word; // reveal the answer
    el.display.setAttribute("aria-label", "the answer was: " + word);
    el.endTitle.textContent = won ? "Run complete" : "Out of guesses";
    var total = puzzles.length;
    if (won) {
      el.endText.textContent = "You solved all " + total +
        " words with " + score + " points. Great streak!";
    } else {
      el.endText.textContent = "The word was \"" + word +
        "\". You solved " + index + " of " + total +
        " words for " + score + " points.";
    }
    el.endOverlay.classList.remove("hidden");
    el.nextBtn.focus();
  }

  function goMenu() {
    over = true;
    el.endOverlay.classList.add("hidden");
    el.playScreen.classList.add("hidden");
    el.startScreen.classList.remove("hidden");
  }

  /* ---------------------------- input ------------------------------- */

  function buildKeyboard() {
    LETTERS.forEach(function (letter) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-letter", letter);
      btn.textContent = letter.toUpperCase();
      btn.addEventListener("click", function () { guess(letter); });
      el.keyboard.appendChild(btn);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (state() !== "playing") return;
    var letter = e.key.toLowerCase();
    if (letter.length === 1 && letter >= "a" && letter <= "z") {
      guess(letter);
      e.preventDefault();
    }
  });

  function state() {
    if (!el.playScreen.classList.contains("hidden") &&
        el.endOverlay.classList.contains("hidden")) {
      return "playing";
    }
    return "idle";
  }

  /* ---------------------------- wiring ------------------------------ */

  el.startBtn.addEventListener("click", startRun);
  el.nextBtn.addEventListener("click", startRun);
  el.menuBtn.addEventListener("click", goMenu);
  el.endMenuBtn.addEventListener("click", goMenu);

  buildKeyboard();
  updateScoreline();
  render();
})();
