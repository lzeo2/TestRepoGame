/* Dots and Boxes, adapted from ayahae79/Dots-and-Boxes (MIT), flat restyle.
   Grid pattern (elements = 9): even/even = dot, even/odd = horizontal line,
   odd/even = vertical line, odd/odd = box. Claimed lines get owned1/owned2,
   completed boxes get owner1/owner2. */
"use strict";

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var startScreen = $("startScreen"), gameScreen = $("gameScreen"), endOverlay = $("endOverlay");
  var board = $("board"), statusEl = $("gameStatus"), boxesLeftEl = $("boxesLeft");
  var GRID = 9, TOTAL_BOXES = 16, POINTS = 10;

  var mode = "ai"; // "ai" | "2p"
  var currentPlayer = 1, score1 = 0, score2 = 0;
  var boxesDone = 0, gameOver = false, aiTimer = null;
  var kbRow = 0, kbCol = 1;
  var lineEls = [];   // lineEls[row][col] -> element or null
  var boxEls = [];    // boxEls[row][col] -> element or null

  function isLine(row, col) {
    if (row < 0 || col < 0 || row >= GRID || col >= GRID) return false;
    return (row % 2 === 0 && col % 2 === 1) || (row % 2 === 1 && col % 2 === 0);
  }
  function isBox(row, col) {
    return row > 0 && col > 0 && row < GRID - 1 && col < GRID - 1 && row % 2 === 1 && col % 2 === 1;
  }
  function ownerOf(el) {
    if (el.classList.contains("owned1")) return 1;
    if (el.classList.contains("owned2")) return 2;
    return 0;
  }
  function boxOwner(el) {
    if (el.classList.contains("owner1")) return 1;
    if (el.classList.contains("owner2")) return 2;
    return 0;
  }
  function adjacentBoxes(row, col) {
    var out = [];
    var candidates;
    if (row % 2 === 0) { // horizontal line
      candidates = [[row - 1, col], [row + 1, col]];
    } else {             // vertical line
      candidates = [[row, col - 1], [row, col + 1]];
    }
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i][0], c = candidates[i][1];
      if (isBox(r, c)) out.push(boxEls[r][c]);
    }
    return out;
  }
  function sidesOwned(r, c) { // number of claimed sides of box (r, c)
    var n = 0;
    if (ownerOf(lineEls[r - 1][c])) n++;
    if (ownerOf(lineEls[r + 1][c])) n++;
    if (ownerOf(lineEls[r][c - 1])) n++;
    if (ownerOf(lineEls[r][c + 1])) n++;
    return n;
  }

  function createBoard() {
    board.textContent = "";
    lineEls = []; boxEls = [];
    for (var row = 0; row < GRID; row++) {
      lineEls[row] = []; boxEls[row] = [];
      for (var col = 0; col < GRID; col++) {
        var el;
        if (row % 2 === 0 && col % 2 === 0) {
          el = document.createElement("div");
          el.className = "dot";
        } else if (row % 2 === 0) {
          el = document.createElement("button");
          el.type = "button";
          el.className = "hline";
          el.setAttribute("aria-label", "Horizontal line, row " + (row / 2 + 1) + ", position " + ((col + 1) / 2));
          el.addEventListener("click", onLineClick);
        } else if (col % 2 === 0) {
          el = document.createElement("button");
          el.type = "button";
          el.className = "vline";
          el.setAttribute("aria-label", "Vertical line, column " + (col / 2 + 1) + ", position " + ((row + 1) / 2));
          el.addEventListener("click", onLineClick);
        } else {
          el = document.createElement("div");
          el.className = "box";
          boxEls[row][col] = el;
        }
        el.dataset.row = String(row);
        el.dataset.col = String(col);
        if (el.className === "hline" || el.className === "vline") lineEls[row][col] = el;
        board.appendChild(el);
      }
    }
    moveKbCursor(0, 1, false);
  }

  function onLineClick(e) {
    if (gameOver || aiTimer) return;
    if (mode === "ai" && currentPlayer === 2) return;
    claim(e.currentTarget);
  }

  function claim(line) {
    if (gameOver || ownerOf(line)) return;
    line.classList.add(currentPlayer === 1 ? "owned1" : "owned2");
    var mover = currentPlayer;
    var completed = checkCompletedBoxes(mover);
    if (gameOver) return;
    if (!completed) switchPlayer();
    updateStatus();
    continuePlay();
  }

  function checkCompletedBoxes(mover) {
    var gotOne = false;
    for (var r = 1; r < GRID - 1; r += 2) {
      for (var c = 1; c < GRID - 1; c += 2) {
        var box = boxEls[r][c];
        if (boxOwner(box) === 0 && sidesOwned(r, c) === 4) {
          box.classList.add(mover === 1 ? "owner1" : "owner2");
          if (mover === 1) score1 += POINTS; else score2 += POINTS;
          boxesDone++;
          gotOne = true;
        }
      }
    }
    if (gotOne) {
      $("score1").textContent = String(score1);
      $("score2").textContent = String(score2);
      boxesLeftEl.textContent = (TOTAL_BOXES - boxesDone) + " boxes left";
    }
    if (boxesDone >= TOTAL_BOXES) {
      gameOver = true;
      showEndOverlay();
    }
    return gotOne;
  }

  function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    $("card1").classList.toggle("active1", currentPlayer === 1);
    $("card2").classList.toggle("active2", currentPlayer === 2);
  }

  function updateStatus() {
    if (gameOver) return;
    if (mode === "ai") {
      statusEl.textContent = currentPlayer === 1 ? "Your turn" : "Computer is thinking";
    } else {
      statusEl.textContent = (currentPlayer === 1 ? $("name1").textContent : $("name2").textContent) + "'s turn";
    }
  }

  /* ---- computer player: complete a box, else avoid gifting a third side ---- */
  function continuePlay() {
    if (gameOver) return;
    if (mode === "ai" && currentPlayer === 2) {
      if (aiTimer) clearTimeout(aiTimer);
      aiTimer = setTimeout(aiMove, 520);
    }
  }

  function aiMove() {
    aiTimer = null;
    if (gameOver || currentPlayer !== 2 || mode !== "ai") return;
    var completes = [], safe = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        if (!isLine(r, c)) continue;
        var line = lineEls[r][c];
        if (!line || ownerOf(line)) continue;
        var adj = adjacentBoxes(r, c);
        var wouldComplete = 0, wouldGift = 0;
        for (var i = 0; i < adj.length; i++) {
          if (boxOwner(adj[i])) continue;
          var sides = sidesOwned(Number(adj[i].dataset.row), Number(adj[i].dataset.col));
          if (sides === 3) wouldComplete++;
          else if (sides === 2) wouldGift++;
        }
        if (wouldComplete > 0) completes.push(line);
        if (wouldGift === 0) safe.push(line);
      }
    }
    var pool = completes.length ? completes : (safe.length ? safe : allOpenLines());
    claim(pool[Math.floor(Math.random() * pool.length)]);
  }

  function allOpenLines() {
    var out = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        if (isLine(r, c) && lineEls[r][c] && !ownerOf(lineEls[r][c])) out.push(lineEls[r][c]);
      }
    }
    return out;
  }

  /* ---- keyboard cursor ---- */
  function moveKbCursor(row, col, scrollIntoView) {
    row = Math.max(0, Math.min(GRID - 1, row));
    col = Math.max(0, Math.min(GRID - 1, col));
    var prev = board.querySelector(".kb-cursor");
    if (prev) prev.classList.remove("kb-cursor");
    var el = board.children[row * GRID + col];
    if (el) {
      el.classList.add("kb-cursor");
      if (scrollIntoView && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
    kbRow = row; kbCol = col;
  }

  /* ---- round lifecycle ---- */
  function startRound() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    currentPlayer = 1; score1 = 0; score2 = 0; boxesDone = 0; gameOver = false;
    $("score1").textContent = "0";
    $("score2").textContent = "0";
    boxesLeftEl.textContent = TOTAL_BOXES + " boxes left";
    endOverlay.classList.add("hidden");
    $("card1").classList.add("active1");
    $("card2").classList.remove("active2");
    createBoard();
    updateStatus();
  }

  function showEndOverlay() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    var title, result, cls;
    if (mode === "ai") {
      if (score1 > score2) { title = "You win"; result = "You " + score1 + " : " + score2 + " Computer"; cls = "good"; }
      else if (score2 > score1) { title = "Computer wins"; result = "Computer " + score2 + " : " + score1 + " You"; cls = "bad"; }
      else { title = "Draw"; result = "Both sides scored " + score1; cls = "neutral"; }
    } else {
      if (score1 > score2) { title = "Player 1 wins"; result = score1 + " : " + score2; cls = "neutral"; }
      else if (score2 > score1) { title = "Player 2 wins"; result = score2 + " : " + score1; cls = "neutral"; }
      else { title = "Draw"; result = "Both sides scored " + score1; cls = "neutral"; }
    }
    $("endTitle").textContent = title;
    var res = $("endResult");
    res.textContent = result;
    res.className = "result " + cls;
    $("endDetail").textContent = "All 16 boxes claimed.";
    endOverlay.classList.remove("hidden");
    $("againBtn").focus();
  }

  function setMode(next) {
    mode = next;
    $("modeAi").setAttribute("aria-pressed", String(mode === "ai"));
    $("mode2p").setAttribute("aria-pressed", String(mode === "2p"));
  }

  function toMenu() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    gameOver = true;
    endOverlay.classList.add("hidden");
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }

  function play() {
    $("name1").textContent = mode === "ai" ? "You" : "Player 1";
    $("name2").textContent = mode === "ai" ? "Computer" : "Player 2";
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startRound();
  }

  $("modeAi").addEventListener("click", function () { setMode("ai"); });
  $("mode2p").addEventListener("click", function () { setMode("2p"); });
  $("playBtn").addEventListener("click", play);
  $("newRoundBtn").addEventListener("click", startRound);
  $("menuBtn").addEventListener("click", toMenu);
  $("againBtn").addEventListener("click", startRound);
  $("overlayMenuBtn").addEventListener("click", toMenu);

  document.addEventListener("keydown", function (e) {
    if (gameScreen.classList.contains("hidden")) return;
    if (!endOverlay.classList.contains("hidden")) {
      if (e.key === "Escape") toMenu();
      return;
    }
    var handled = true;
    switch (e.key) {
      case "ArrowLeft": moveKbCursor(kbRow, kbCol - 1, true); break;
      case "ArrowRight": moveKbCursor(kbRow, kbCol + 1, true); break;
      case "ArrowUp": moveKbCursor(kbRow - 1, kbCol, true); break;
      case "ArrowDown": moveKbCursor(kbRow + 1, kbCol, true); break;
      case "Enter":
      case " ": {
        var el = board.children[kbRow * GRID + kbCol];
        if (el && (el.className === "hline" || el.className === "vline")) onLineClick({ currentTarget: el });
        break;
      }
      case "n": case "N": startRound(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  setMode("ai");
})();
