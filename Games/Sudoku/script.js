/*
 * Sudoku
 * ------
 * Classic 9x9 Sudoku with a built-in generator. Every puzzle is produced by
 * filling a blank grid with a randomized backtracking solver and then
 * removing clues one by one, keeping only removals that leave a *unique*
 * solution. Difficulty controls how many clues remain:
 *
 *     Easy 40 clues | Medium 33 clues | Hard 26 clues
 *
 * Controls
 * --------
 * Mouse / touch : tap a cell to select it, then tap a number on the pad
 *                 (or the keyboard). Toggle "Notes" to place pencil marks,
 *                 "Erase" to clear the selected cell.
 * Keyboard      : Arrow keys / WASD move the selection, 1-9 enter a value,
 *                 0 / Backspace / Delete erase, N toggles notes mode.
 *
 * Mistakes      : entering a number that clashes with an existing row,
 *                 column or box counts as an error. Three errors end the
 *                 game.
 */
(function () {
  "use strict";

  var MAX_ERRORS = 3;
  var DIFFS = {
    easy: 40,
    medium: 33,
    hard: 26
  };

  var boardEl = document.getElementById("board");
  var timeEl = document.getElementById("time");
  var errorsEl = document.getElementById("errors");
  var notesBtn = document.getElementById("notesBtn");
  var eraseBtn = document.getElementById("eraseBtn");
  var newBtn = document.getElementById("newBtn");
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");
  var diffBtns = {
    easy: document.getElementById("diffEasy"),
    medium: document.getElementById("diffMedium"),
    hard: document.getElementById("diffHard")
  };

  var solution = [];   // full solved grid
  var puzzle = [];     // grid with clues (0 = empty)
  var values = [];     // user-entered values per cell (0 = none)
  var notes = [];      // arrays of pencil marks per cell
  var given = [];      // boolean per cell: part of the original puzzle
  var cells = [];      // DOM elements, index 0..80
  var sel = -1;        // selected cell index
  var difficulty = "medium";
  var errors = 0;
  var gameOver = false;
  var startTime = 0;
  var timerId = null;
  var notesMode = false;

  function idx(r, c) {
    return r * 9 + c;
  }

  /* --------------------------- random helpers -------------------------- */

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function shuffled(nums) {
    var a = nums.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1);
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* ----------------------------- generator ----------------------------- */

  function isSafe(grid, r, c, v) {
    for (var k = 0; k < 9; k++) {
      if (grid[r * 9 + k] === v) return false;
      if (grid[k * 9 + c] === v) return false;
    }
    var br = Math.floor(r / 3) * 3;
    var bc = Math.floor(c / 3) * 3;
    for (var i = br; i < br + 3; i++) {
      for (var j = bc; j < bc + 3; j++) {
        if (grid[i * 9 + j] === v) return false;
      }
    }
    return true;
  }

  function fillGrid(grid, pos) {
    // Recursively fill the blank grid with a random candidate order.
    if (pos >= 81) return true;
    if (grid[pos] !== 0) return fillGrid(grid, pos + 1);
    var r = Math.floor(pos / 9);
    var c = pos % 9;
    var cands = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (var i = 0; i < cands.length; i++) {
      if (isSafe(grid, r, c, cands[i])) {
        grid[pos] = cands[i];
        if (fillGrid(grid, pos + 1)) return true;
        grid[pos] = 0;
      }
    }
    return false;
  }

  function countSolutions(grid, limit) {
    // Returns the number of solutions, stopping at `limit`.
    var firstEmpty = -1;
    for (var i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        firstEmpty = i;
        break;
      }
    }
    if (firstEmpty === -1) return 1;
    var r = Math.floor(firstEmpty / 9);
    var c = firstEmpty % 9;
    var total = 0;
    for (var v = 1; v <= 9; v++) {
      if (isSafe(grid, r, c, v)) {
        grid[firstEmpty] = v;
        total += countSolutions(grid, limit - total);
        grid[firstEmpty] = 0;
        if (total >= limit) break;
      }
    }
    return total;
  }

  function generate(clues) {
    var full = [];
    for (var i = 0; i < 81; i++) full.push(0);
    fillGrid(full, 0);
    solution = full.slice();

    // Randomly remove clues while the puzzle keeps a unique solution.
    var grid = full.slice();
    var order = shuffled(range(0, 81));
    var removed = 0;
    for (var k = 0; k < order.length && (81 - removed) > clues; k++) {
      var p = order[k];
      if (grid[p] === 0) continue;
      var saved = grid[p];
      grid[p] = 0;
      if (countSolutions(grid.slice(), 2) === 1) {
        removed++;
      } else {
        grid[p] = saved;
      }
    }
    // Hard difficulty sometimes cannot reach the target while preserving
    // uniqueness with a greedy pass; loop again on the tail positions.
    if ((81 - removed) > clues) {
      for (var k2 = 0; k2 < order.length && (81 - removed) > clues; k2++) {
        var q = order[k2];
        if (grid[q] === 0) continue;
        var saved2 = grid[q];
        grid[q] = 0;
        if (countSolutions(grid.slice(), 2) === 1) removed++;
        else grid[q] = saved2;
      }
    }
    return grid;
  }

  function range(a, b) {
    var out = [];
    for (var i = a; i < b; i++) out.push(i);
    return out;
  }

  /* ------------------------------ timer -------------------------------- */

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function startTimer() {
    if (timerId) return;
    startTime = Date.now();
    timerId = setInterval(function () {
      if (gameOver) return;
      timeEl.textContent = fmtTime(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  /* ------------------------------ helpers ------------------------------ */

  function peersOf(i) {
    var r = Math.floor(i / 9);
    var c = i % 9;
    var br = Math.floor(r / 3) * 3;
    var bc = Math.floor(c / 3) * 3;
    var out = {};
    for (var k = 0; k < 9; k++) {
      out[r * 9 + k] = true;
      out[k * 9 + c] = true;
    }
    for (var i2 = br; i2 < br + 3; i2++) {
      for (var j2 = bc; j2 < bc + 3; j2++) out[i2 * 9 + j2] = true;
    }
    delete out[i];
    return out;
  }

  function conflicts(i, v) {
    var peers = peersOf(i);
    for (var p in peers) {
      var n = p | 0;
      if (given[n]) {
        if (puzzle[n] === v) return true;
      } else if (values[n] === v) {
        return true;
      }
    }
    return false;
  }

  /* ------------------------------ rendering ---------------------------- */

  function renderCell(i) {
    var el = cells[i];
    var r = Math.floor(i / 9);
    var c = i % 9;
    el.className = "cell rb" + (r % 3) + " cb" + (c % 3);
    if (given[i]) el.classList.add("given");
    else el.classList.add("user");
    el.innerHTML = "";
    if (values[i] !== 0) {
      el.textContent = values[i];
      if (values[i] !== 0 && !given[i] && conflicts(i, values[i])) {
        el.classList.add("error");
      }
    } else if (notes[i].length) {
      var nw = document.createElement("div");
      nw.className = "notes";
      for (var d = 1; d <= 9; d++) {
        var s = document.createElement("span");
        s.textContent = notes[i].indexOf(d) >= 0 ? d : "";
        nw.appendChild(s);
      }
      el.appendChild(nw);
    }
    if (i === sel) el.classList.add("selected");
    else if (sel >= 0) {
      if (peersOf(sel)[i]) el.classList.add("peak");
      var sv = selValue();
      if (sv !== 0 && values[i] === sv && i !== sel) el.classList.add("sameval");
    }
  }

  function selValue() {
    if (sel < 0) return 0;
    if (given[sel]) return puzzle[sel];
    return values[sel];
  }

  function render() {
    for (var i = 0; i < 81; i++) renderCell(i);
    errorsEl.textContent = errors + "/" + MAX_ERRORS;
    if (errors >= MAX_ERRORS) errorsEl.style.color = "#ff8fa3";
    else errorsEl.style.color = "";
    notesBtn.classList.toggle("active", notesMode);
  }

  /* ------------------------------ actions ------------------------------ */

  function setCellValue(i, v) {
    if (gameOver || i < 0) return;
    if (given[i]) return;
    if (values[i] === v && v !== 0) {
      values[i] = 0;
      render();
      return;
    }
    if (v === 0) {
      values[i] = 0;
      notes[i] = [];
      render();
      return;
    }
    if (conflicts(i, v)) {
      errors++;
      values[i] = v;
      render();
      if (errors >= MAX_ERRORS) {
        fail();
      }
      return;
    }
    values[i] = v;
    notes[i] = [];
    // remove the same pencil mark from every peer cell
    var peers = peersOf(i);
    for (var p in peers) {
      var n = p | 0;
      var at = notes[n].indexOf(v);
      if (at >= 0) {
        notes[n].splice(at, 1);
      }
    }
    render();
    if (checkWin()) win();
  }

  function toggleNote(i, v) {
    if (gameOver || i < 0) return;
    if (given[i] || values[i] !== 0) return;
    var at = notes[i].indexOf(v);
    if (at >= 0) notes[i].splice(at, 1);
    else notes[i].push(v);
    render();
  }

  function eraseCell() {
    if (gameOver || sel < 0) return;
    if (given[sel]) return;
    values[sel] = 0;
    notes[sel] = [];
    render();
  }

  function checkWin() {
    for (var i = 0; i < 81; i++) {
      var v = given[i] ? puzzle[i] : values[i];
      if (v === 0) return false;
      if (conflicts(i, v)) return false;
    }
    return true;
  }

  function win() {
    stopTimer();
    gameOver = true;
    var sec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    timeEl.textContent = fmtTime(sec);
    panel.innerHTML =
      "<h2>Solved!</h2>" +
      "<p>Time " + fmtTime(sec) + " with " + errors +
      (errors === 1 ? " error." : " errors.") + "</p>" +
      '<button id="againBtn">New Game</button>';
    document.getElementById("againBtn").addEventListener("click", function () {
      overlay.classList.add("hidden");
      newGame();
    });
    overlay.classList.remove("hidden");
  }

  function fail() {
    stopTimer();
    gameOver = true;
    panel.innerHTML =
      "<h2>Too Many Errors</h2>" +
      "<p>Three mistakes and it\u2019s lights out. The puzzle had a unique " +
      "solution \u2014 try again!</p>" +
      '<button id="againBtn">Try Again</button>';
    document.getElementById("againBtn").addEventListener("click", function () {
      overlay.classList.add("hidden");
      newGame();
    });
    overlay.classList.remove("hidden");
  }

  /* ------------------------------ setup -------------------------------- */

  function newGame() {
    stopTimer();
    var clues = DIFFS[difficulty];
    puzzle = generate(clues);
    values = [];
    notes = [];
    given = [];
    for (var i = 0; i < 81; i++) {
      values.push(0);
      notes.push([]);
      given.push(puzzle[i] !== 0);
    }
    errors = 0;
    gameOver = false;
    sel = -1;
    timeEl.textContent = "0:00";
    overlay.classList.add("hidden");
    render();
  }

  function setDifficulty(d) {
    difficulty = d;
    for (var key in diffBtns) {
      diffBtns[key].classList.toggle("active", key === d);
    }
    newGame();
  }

  function buildCells() {
    boardEl.innerHTML = "";
    cells = [];
    for (var i = 0; i < 81; i++) {
      (function (n) {
        var d = document.createElement("div");
        d.className = "cell";
        d.addEventListener("click", function () {
          sel = n;
          render();
        });
        boardEl.appendChild(d);
        cells.push(d);
      })(i);
    }
  }

  /* ------------------------------ events ------------------------------- */

  document.querySelectorAll(".pbtn").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = parseInt(b.dataset.n, 10);
      if (sel < 0) return;
      startTimer();
      if (notesMode) toggleNote(sel, v);
      else setCellValue(sel, v);
    });
  });

  notesBtn.addEventListener("click", function () {
    notesMode = !notesMode;
    notesBtn.classList.toggle("active", notesMode);
  });

  eraseBtn.addEventListener("click", eraseCell);

  newBtn.addEventListener("click", function () {
    overlay.classList.add("hidden");
    newGame();
  });

  diffBtns.easy.addEventListener("click", function () { setDifficulty("easy"); });
  diffBtns.medium.addEventListener("click", function () { setDifficulty("medium"); });
  diffBtns.hard.addEventListener("click", function () { setDifficulty("hard"); });

  window.addEventListener("keydown", function (e) {
    var code = e.code;
    var r, c, next;
    if (sel < 0) sel = 0;
    r = Math.floor(sel / 9);
    c = sel % 9;
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        next = r > 0 ? sel - 9 : sel;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        next = r < 8 ? sel + 9 : sel;
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        next = c > 0 ? sel - 1 : sel;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        next = c < 8 ? sel + 1 : sel;
        e.preventDefault();
        break;
      case "Digit1":
      case "Numpad1": startTimer(); setCellValue(sel, 1); return;
      case "Digit2":
      case "Numpad2": startTimer(); setCellValue(sel, 2); return;
      case "Digit3":
      case "Numpad3": startTimer(); setCellValue(sel, 3); return;
      case "Digit4":
      case "Numpad4": startTimer(); setCellValue(sel, 4); return;
      case "Digit5":
      case "Numpad5": startTimer(); setCellValue(sel, 5); return;
      case "Digit6":
      case "Numpad6": startTimer(); setCellValue(sel, 6); return;
      case "Digit7":
      case "Numpad7": startTimer(); setCellValue(sel, 7); return;
      case "Digit8":
      case "Numpad8": startTimer(); setCellValue(sel, 8); return;
      case "Digit9":
      case "Numpad9": startTimer(); setCellValue(sel, 9); return;
      case "Digit0":
      case "Numpad0":
      case "Backspace":
      case "Delete":
        e.preventDefault();
        eraseCell();
        return;
      case "KeyN":
        e.preventDefault();
        notesMode = !notesMode;
        render();
        return;
      default:
        return;
    }
    if (next >= 0) {
      sel = next;
      render();
    }
  });

  buildCells();
  newGame();
})();
