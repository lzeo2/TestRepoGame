/*
 * Connections
 * -----------
 * Find four words that share a hidden common theme. Each board hides four
 * groups of four words. Select exactly four words and submit them; if they
 * form one of the hidden groups it is revealed in its color. You get four
 * mistakes before the board is revealed.
 *
 * Controls
 * --------
 * Mouse / touch : tap words to toggle selection, then press Submit.
 * Keyboard      : Arrow keys / WASD move the cursor, SPACE toggles the
 *                 selection of the word under the cursor, ENTER submits
 *                 the selected group, S shuffles, B clears selection,
 *                 N starts a new board.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Handmade boards. `col` follows NYT difficulty colors: yellow is the
   * easiest theme, purple the sneakiest. Each group has exactly four
   * words and no word belongs to more than one theme on its board.
   * ------------------------------------------------------------------ */
  var BOARDS = [
    {
      groups: [
        { cat: "Chess pieces",        col: "yellow", words: ["PAWN", "ROOK", "KNIGHT", "BISHOP"] },
        { cat: "Fruits",              col: "green",  words: ["APPLE", "MANGO", "GRAPE", "PEACH"] },
        { cat: "Synonyms for BIG",    col: "blue",   words: ["LARGE", "HUGE", "GIANT", "MASSIVE"] },
        { cat: "Olympic sports",      col: "purple", words: ["BOXING", "JUDO", "ROWING", "HOCKEY"] }
      ]
    },
    {
      groups: [
        { cat: "Shades of color",     col: "yellow", words: ["CRIMSON", "AMBER", "VIOLET", "SCARLET"] },
        { cat: "Tree nuts",           col: "green",  words: ["ALMOND", "CASHEW", "PECAN", "WALNUT"] },
        { cat: "Bodies of water",     col: "blue",   words: ["OCEAN", "RIVER", "POND", "CANAL"] },
        { cat: "Silent-K words",      col: "purple", words: ["KNIFE", "KNOCK", "KNEE", "KNOT"] }
      ]
    },
    {
      groups: [
        { cat: "Dog breeds",          col: "yellow", words: ["BEAGLE", "PUG", "HUSKY", "CORGI"] },
        { cat: "Music genres",        col: "green",  words: ["JAZZ", "POP", "ROCK", "SOUL"] },
        { cat: "Kitchen tools",       col: "blue",   words: ["SPATULA", "WHISK", "LADLE", "TONGS"] },
        { cat: "European capitals",   col: "purple", words: ["OSLO", "LIMA", "RIGA", "BERNE"] }
      ]
    },
    {
      groups: [
        { cat: "Severe weather",      col: "yellow", words: ["THUNDER", "BLIZZARD", "DROUGHT", "TORNADO"] },
        { cat: "Car brands",          col: "green",  words: ["TESLA", "AUDI", "VOLVO", "KIA"] },
        { cat: "Dance styles",        col: "blue",   words: ["TANGO", "SALSA", "WALTZ", "FLAMENCO"] },
        { cat: "Greek letters",       col: "purple", words: ["ALPHA", "DELTA", "OMEGA", "SIGMA"] }
      ]
    },
    {
      groups: [
        { cat: "Birds",               col: "yellow", words: ["ROBIN", "EAGLE", "CROW", "SPARROW"] },
        { cat: "Math operations",     col: "green",  words: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] },
        { cat: "Ice cream flavors",   col: "blue",   words: ["VANILLA", "MINT", "COOKIE", "PISTACHIO"] },
        { cat: "______ Park",         col: "purple", words: ["CENTRAL", "JURASSIC", "NATIONAL", "AMUSEMENT"] }
      ]
    }
  ];

  var MAX_MISTAKES = 4;

  var boardEl = document.getElementById("board");
  var solvedEl = document.getElementById("solved");
  var msgEl = document.getElementById("msg");
  var boardNumEl = document.getElementById("boardNum");
  var mistakesEl = document.getElementById("mistakes");
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");
  var shuffleBtn = document.getElementById("shuffleBtn");
  var submitBtn = document.getElementById("submitBtn");
  var newBtn = document.getElementById("newBtn");

  var boardIndex = 0;
  var words = [];      // remaining words on the board
  var groups = [];     // remaining (unfound) groups
  var solved = [];     // found groups, in discovery order
  var mistakes = 0;
  var selected = {};   // index -> true for selected remaining words
  var cursor = 0;      // keyboard cursor index into `words`
  var finished = false;

  /* ------------------------------ helpers ------------------------------ */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function setMsg(text, cls) {
    msgEl.textContent = text || "\u00a0";
    msgEl.className = "msg" + (cls ? " " + cls : "");
  }

  /* ------------------------------ rendering ---------------------------- */

  function renderBoard() {
    boardEl.innerHTML = "";
    for (var i = 0; i < words.length; i++) {
      (function (idx) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "word";
        d.textContent = words[idx];
        if (selected[idx]) d.classList.add("selected");
        if (idx === cursor) d.classList.add("cursor");
        d.addEventListener("click", function () {
          cursor = idx;
          toggleSelect(idx);
        });
        boardEl.appendChild(d);
      })(i);
    }
    if (words.length === 0) boardEl.classList.add("solvedAll");
    else boardEl.classList.remove("solvedAll");
  }

  function renderSolved() {
    solvedEl.innerHTML = "";
    for (var i = 0; i < solved.length; i++) {
      var g = solved[i];
      var d = document.createElement("div");
      d.className = "group " + g.col;
      d.innerHTML =
        '<span class="cat">' + g.cat + "</span>" +
        g.words.join(" \u00b7 ");
      solvedEl.appendChild(d);
    }
  }

  function renderHud() {
    boardNumEl.textContent = (boardIndex + 1) + "/" + BOARDS.length;
    mistakesEl.textContent = mistakes + "/" + MAX_MISTAKES;
    if (mistakes >= MAX_MISTAKES) mistakesEl.style.color = "#ff6b6b";
    else mistakesEl.style.color = "";
  }

  function render() {
    renderSolved();
    renderBoard();
    renderHud();
  }

  /* ------------------------------ game logic --------------------------- */

  function toggleSelect(idx) {
    if (finished) return;
    if (selected[idx]) delete selected[idx];
    else selected[idx] = true;
    setMsg("");
    renderBoard();
  }

  function groupContains(g, chosen) {
    var set = {};
    for (var i = 0; i < g.words.length; i++) set[g.words[i]] = true;
    if (chosen.length !== g.words.length) return false;
    for (var k = 0; k < chosen.length; k++) {
      if (!set[chosen[k]]) return false;
      set[chosen[k]] = false;
    }
    return true;
  }

  function findGroup(chosen) {
    for (var i = 0; i < groups.length; i++) {
      if (groupContains(groups[i], chosen)) return groups[i];
    }
    return null;
  }

  function submitGroup() {
    if (finished) return;
    var chosen = [];
    for (var k in selected) if (selected[k]) chosen.push(words[k]);
    if (chosen.length !== 4) {
      setMsg("Select exactly four words before submitting.", "error");
      return;
    }
    var g = findGroup(chosen);
    if (!g) {
      mistakes++;
      selected = {};
      cursor = 0;
      setMsg("That\u2019s not a group \u2014 " + (MAX_MISTAKES - mistakes) + " mistake" +
        (MAX_MISTAKES - mistakes === 1 ? "" : "s") + " left.", "error");
      render();
      if (mistakes >= MAX_MISTAKES) lose();
      return;
    }
    solved.push(g);
    groups = groups.filter(function (x) {
      return x !== g;
    });
    words = words.filter(function (_, i) {
      return !selected[i];
    });
    selected = {};
    cursor = 0;
    setMsg("Group found: " + g.cat + "!", "ok");
    render();
    if (words.length === 0) win();
  }

  function shuffleWords() {
    if (finished) return;
    shuffle(words);
    selected = {};
    cursor = 0;
    setMsg("Shuffled.");
    renderBoard();
  }

  function clearSelection() {
    if (finished) return;
    selected = {};
    setMsg("");
    renderBoard();
  }

  /* ------------------------------ end states --------------------------- */

  function revealAll() {
    for (var i = 0; i < groups.length; i++) solved.push(groups[i]);
    groups = [];
    words = [];
    renderSolved();
    renderBoard();
  }

  function win() {
    finished = true;
    panel.innerHTML =
      "<h2>Solved!</h2>" +
      "<p>Board " + (boardIndex + 1) + " cleared with " + mistakes +
      (mistakes === 1 ? " mistake." : " mistakes.") + "</p>" +
      '<button id="againBtn">Next Board</button>';
    document.getElementById("againBtn").addEventListener("click", function () {
      overlay.classList.add("hidden");
      nextBoard();
    });
    overlay.classList.remove("hidden");
  }

  function lose() {
    finished = true;
    revealAll();
    panel.innerHTML =
      "<h2>Game Over</h2>" +
      "<p>You ran out of mistakes. Here is the full board:</p>" +
      '<button id="againBtn">Try Again</button>';
    document.getElementById("againBtn").addEventListener("click", function () {
      overlay.classList.add("hidden");
      loadBoard(boardIndex);
    });
    overlay.classList.remove("hidden");
  }

  /* ------------------------------ setup -------------------------------- */

  function loadBoard(idx) {
    boardIndex = idx;
    var board = BOARDS[idx];
    words = [];
    groups = [];
    for (var i = 0; i < board.groups.length; i++) {
      groups.push(board.groups[i]);
      for (var w = 0; w < board.groups[i].words.length; w++) {
        words.push(board.groups[i].words[w]);
      }
    }
    shuffle(words);
    solved = [];
    mistakes = 0;
    selected = {};
    cursor = 0;
    finished = false;
    setMsg("");
    render();
  }

  function nextBoard() {
    loadBoard((boardIndex + 1) % BOARDS.length);
  }

  /* ------------------------------ events ------------------------------- */

  shuffleBtn.addEventListener("click", shuffleWords);
  submitBtn.addEventListener("click", submitGroup);
  newBtn.addEventListener("click", function () {
    overlay.classList.add("hidden");
    nextBoard();
  });

  window.addEventListener("keydown", function (e) {
    if (finished) return;
    var cols = 4;
    var row = Math.floor(cursor / cols);
    var col = cursor % cols;
    var next = -1;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        next = cursor - cols;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        next = cursor + cols;
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        next = cursor - 1;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        next = cursor + 1;
        e.preventDefault();
        break;
      case "Space":
        e.preventDefault();
        toggleSelect(cursor);
        return;
      case "Enter":
        e.preventDefault();
        submitGroup();
        return;
      case "KeyS":
        e.preventDefault();
        shuffleWords();
        return;
      case "KeyB":
        e.preventDefault();
        clearSelection();
        return;
      case "KeyN":
        e.preventDefault();
        overlay.classList.add("hidden");
        nextBoard();
        return;
    }
    if (next >= 0 && next < words.length) {
      // keep the cursor inside the virtual 4-column grid
      var nr = Math.floor(next / cols);
      var nc = next % cols;
      if (nr >= 0 && nr < Math.ceil(words.length / cols) && nc >= 0 && nc < cols) {
        cursor = next;
        renderBoard();
      }
    }
  });

  loadBoard(0);
})();
