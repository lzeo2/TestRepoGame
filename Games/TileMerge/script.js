(function () {
  "use strict";

  var board = document.getElementById("board");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");

  var N = 4;
  var grid = [];
  var cells = [];
  var cursor = 0;
  var sel = -1; // selected tile index, -1 = none
  var score = 0;
  var best = parseInt(localStorage.getItem("tilemerge_best") || "0", 10);
  var winShown = false;
  bestEl.textContent = best;

  var DIRS = {
    up: -N,
    down: N,
    left: -1,
    right: 1
  };

  function idx(r, c) {
    return r * N + c;
  }

  function valid(i) {
    return i >= 0 && i < N * N;
  }

  function canStep(i, d) {
    if (!valid(i)) return false;
    var r = Math.floor(i / N),
      c = i % N;
    if (d === -N) return r > 0;
    if (d === N) return r < N - 1;
    if (d === -1) return c > 0;
    if (d === 1) return c < N - 1;
    return false;
  }

  function build() {
    board.innerHTML = "";
    cells = [];
    grid = [];
    for (var i = 0; i < N * N; i++) {
      grid.push(null);
      var d = document.createElement("div");
      d.className = "cell empty";
      d.dataset.i = i;
      d.addEventListener("click", function (e) {
        tapCell(parseInt(e.currentTarget.dataset.i, 10));
      });
      board.appendChild(d);
      cells.push(d);
    }
  }

  function spawn() {
    var empty = [];
    for (var i = 0; i < N * N; i++) if (!grid[i]) empty.push(i);
    if (!empty.length) return;
    var at = empty[Math.floor(Math.random() * empty.length)];
    grid[at] = Math.random() < 0.9 ? 2 : 4;
    return at;
  }

  function render() {
    for (var i = 0; i < N * N; i++) {
      var d = cells[i];
      var v = grid[i];
      d.className = "cell" + (v ? " v" + v : " empty");
      if (v) {
        if (v > 2048) d.className = "cell big";
        d.textContent = v;
      } else {
        d.textContent = "";
      }
      if (i === cursor) d.className += " cursor";
      if (i === sel) d.className += " sel";
    }
  }

  function tapCell(i) {
    if (sel >= 0) {
      // try to move selected tile into tapped cell
      var d = tappedDir(sel, i);
      if (d) {
        moveSel(d);
      } else {
        if (i === sel) {
          sel = -1;
          cursor = i;
          render();
        } else {
          // tapped a different non-adjacent cell: switch selection
          cursor = i;
          sel = grid[i] ? i : -1;
          render();
        }
      }
    } else {
      cursor = i;
      if (grid[i]) sel = i;
      render();
    }
  }

  function tappedDir(from, to) {
    var fr = Math.floor(from / N),
      fc = from % N;
    var tr = Math.floor(to / N),
      tc = to % N;
    var dr = tr - fr,
      dc = tc - fc;
    if (dr === 0 && dc === 1) return 1;
    if (dr === 0 && dc === -1) return -1;
    if (dc === 0 && dr === 1) return N;
    if (dc === 0 && dr === -1) return -N;
    return 0;
  }

  function moveSel(d) {
    var from = sel;
    if (from < 0 || !grid[from]) return;
    var to = from + d;
    if (!canStep(from, d)) {
      shake(from);
      return;
    }
    var moved = false;
    var mergedAt = -1;
    if (!grid[to]) {
      grid[to] = grid[from];
      grid[from] = null;
      sel = to;
      cursor = to;
      moved = true;
    } else if (grid[to] === grid[from]) {
      grid[to] *= 2;
      grid[from] = null;
      score += grid[to];
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem("tilemerge_best", String(best));
      }
      sel = -1;
      cursor = to;
      moved = true;
      mergedAt = to;
      if (grid[to] === 2048 && !winShown) {
        winShown = true;
        showPanel("2048!", "You built the legendary tile. Keep going!");
      }
    } else {
      shake(to);
      return;
    }
    render();
    if (moved) {
      if (mergedAt >= 0) {
        cells[mergedAt].classList.add("mergepop");
        setTimeout(function () {
          cells[mergedAt].classList.remove("mergepop");
        }, 240);
      }
      spawn();
      render();
      if (gameOver()) {
        showPanel("Game Over", "Score: " + score + " &middot; Best: " + best);
      }
    }
  }

  function shake(i) {
    var d = cells[i];
    d.classList.add("shake");
    setTimeout(function () { d.classList.remove("shake"); }, 220);
  }

  function moveCursor(d) {
    var to = cursor + d;
    if (canStep(cursor, d)) {
      cursor = to;
      render();
    }
  }

  function toggleSelect() {
    if (sel >= 0) {
      sel = -1;
      render();
    } else if (grid[cursor]) {
      sel = cursor;
      render();
    }
  }

  function gameOver() {
    for (var i = 0; i < N * N; i++) {
      if (!grid[i]) return false;
      if (canStep(i, -1) && grid[i] === grid[i - 1]) return false;
      if (canStep(i, N) && grid[i] === grid[i + N]) return false;
    }
    return true;
  }

  function showPanel(title, msg) {
    panel.innerHTML =
      "<h2>" + title + "</h2><p>" + msg + "</p>" +
      "<button id=\"again\">Play Again</button>";
    document.getElementById("again").addEventListener("click", function () {
      overlay.classList.add("hidden");
      newGame();
    });
    overlay.classList.remove("hidden");
  }

  function newGame() {
    build();
    winShown = false;
    score = 0;
    sel = -1;
    cursor = 0;
    scoreEl.textContent = "0";
    spawn();
    spawn();
    render();
  }

  window.addEventListener("keydown", function (e) {
    var d = 0;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        d = DIRS.up;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        d = DIRS.down;
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        d = DIRS.left;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        d = DIRS.right;
        e.preventDefault();
        break;
      case "Space":
      case "Enter":
        e.preventDefault();
        toggleSelect();
        break;
    }
    if (d) {
      if (sel >= 0) moveSel(d);
      else moveCursor(d);
    }
  });

  // hold-repeat for touch direction buttons
  function dirHold(el, dir) {
    var timer = null;
    function step() {
      if (sel >= 0) moveSel(dir);
      else moveCursor(dir);
    }
    function down(e) {
      e.preventDefault();
      step();
      timer = setInterval(step, 170);
    }
    function up(e) {
      e.preventDefault();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    el.addEventListener("touchstart", down, { passive: false });
    el.addEventListener("touchend", up, { passive: false });
    el.addEventListener("touchcancel", up, { passive: false });
    el.addEventListener("mousedown", down);
    el.addEventListener("mouseup", up);
    el.addEventListener("mouseleave", up);
  }

  dirHold(document.getElementById("upBtn"), DIRS.up);
  dirHold(document.getElementById("downBtn"), DIRS.down);
  dirHold(document.getElementById("leftBtn"), DIRS.left);
  dirHold(document.getElementById("rightBtn"), DIRS.right);

  document.getElementById("resetBtn").addEventListener("click", function () {
    overlay.classList.add("hidden");
    newGame();
  });

  newGame();
})();
