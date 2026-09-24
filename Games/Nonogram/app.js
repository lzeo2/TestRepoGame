/*
 * Source: https://github.com/monkeyArms/nonogram
 * License: MIT (see LICENSE.txt)
 * Commit: a61efe2cb85452417fcdcdb6e2399eb4f7bd45b1
 * Wrapper around the vendored Nonogram library: start screen, 5x5 / 10x10
 * quick picks, mistakes counter, timer, win overlay, keyboard cursor,
 * resize redraw. The library provides puzzle creation, clue generation,
 * the play grid and solution checking.
 */

(function () {
  'use strict';

  var creator = new Nonogram.Creator();
  var gui = null;
  var mistakes = 0;
  var elapsed = 0;
  var timerId = null;
  var state = 'menu'; // menu | playing | won
  var cursorIndex = 0;
  var lastSize = 5;
  var wasWrong = false;

  var gridContainer = document.querySelector('[data-nonogram-puzzle-grid]');
  var genContainer = document.querySelector('[data-nonogram-generate-controls]');
  var startScreen = document.getElementById('startScreen');
  var winScreen = document.getElementById('winScreen');

  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
  }

  function formatTime(total) {
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateHud() {
    document.getElementById('mistakesLabel').textContent = 'Mistakes ' + mistakes;
    document.getElementById('timeLabel').textContent = 'Time ' + formatTime(elapsed);
    document.getElementById('sizeLabel').textContent = lastSize + ' x ' + lastSize;
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      elapsed++;
      updateHud();
    }, 1000);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function currentPuzzle() {
    return gui ? gui.puzzle : null;
  }

  function findCell(index) {
    return gridContainer.querySelector('td[data-index="' + index + '"]');
  }

  function cellIsWrong(puzzle, index) {
    var cell = puzzle.getCellByIndex(index);
    return cell.userSolution !== null && cell.userSolution !== undefined &&
           cell.userSolution !== cell.solution;
  }

  // Their generate handler reads the select inputs, so set them first and
  // reuse the vendored button. Retry briefly in case templates are still
  // being fetched on very slow starts.
  function startPuzzle(size, attempt) {
    attempt = attempt || 0;
    lastSize = size;
    var widthSel = document.querySelector('[data-nonogram-generate-width]');
    var heightSel = document.querySelector('[data-nonogram-generate-height]');
    var genBtn = document.querySelector('[data-nonogram-generate-button]');
    if (!widthSel || !heightSel || !genBtn) {
      if (attempt < 40) {
        setTimeout(function () { startPuzzle(size, attempt + 1); }, 50);
      }
      return;
    }
    widthSel.value = String(size);
    heightSel.value = String(size);
    genBtn.click();

    mistakes = 0;
    elapsed = 0;
    cursorIndex = 0;
    state = 'playing';
    setHidden(startScreen, true);
    setHidden(winScreen, true);
    updateHud();
    startTimer();
  }

  function onWin() {
    if (state !== 'playing') return;
    state = 'won';
    stopTimer();
    document.getElementById('winStats').textContent =
      lastSize + ' x ' + lastSize + ' solved in ' + formatTime(elapsed) +
      ' with ' + mistakes + (mistakes === 1 ? ' mistake.' : ' mistakes.');
    setHidden(winScreen, false);
  }

  function toMenu() {
    state = 'menu';
    stopTimer();
    setHidden(winScreen, true);
    setHidden(startScreen, false);
  }

  function handleGridClickBefore(ev) {
    var td = ev.target.closest ? ev.target.closest('td[data-index]') : null;
    if (!td || state !== 'playing') {
      wasWrong = false;
      return;
    }
    var puzzle = currentPuzzle();
    if (!puzzle) {
      wasWrong = false;
      return;
    }
    wasWrong = cellIsWrong(puzzle, parseInt(td.getAttribute('data-index'), 10));
  }

  function handleGridClickAfter(ev) {
    var td = ev.target.closest ? ev.target.closest('td[data-index]') : null;
    if (!td || state !== 'playing') return;
    var puzzle = currentPuzzle();
    if (!puzzle) return;
    var index = parseInt(td.getAttribute('data-index'), 10);
    if (cellIsWrong(puzzle, index) && !wasWrong) {
      mistakes++;
      updateHud();
    }
    if (puzzle.checkUserSolution()) {
      onWin();
    }
  }

  function moveCursor(deltaRow, deltaCol) {
    var puzzle = currentPuzzle();
    if (!puzzle || state !== 'playing') return;
    var row = Math.floor(cursorIndex / puzzle.width);
    var col = cursorIndex % puzzle.width;
    row = Math.max(0, Math.min(puzzle.height - 1, row + deltaRow));
    col = Math.max(0, Math.min(puzzle.width - 1, col + deltaCol));
    setCursor(row * puzzle.width + col);
  }

  function setCursor(index) {
    var prev = gridContainer.querySelector('td.kb-cursor');
    if (prev) prev.classList.remove('kb-cursor');
    cursorIndex = index;
    var td = findCell(index);
    if (td) td.classList.add('kb-cursor');
  }

  function activateCursor() {
    var td = findCell(cursorIndex);
    if (td) td.click();
  }

  function bindUi() {
    document.querySelectorAll('.size-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startPuzzle(parseInt(btn.getAttribute('data-size'), 10));
      });
    });
    document.getElementById('newBtn').addEventListener('click', function () {
      startPuzzle(lastSize);
    });
    document.getElementById('menuBtn').addEventListener('click', toMenu);
    document.getElementById('againBtn').addEventListener('click', function () {
      startPuzzle(lastSize);
    });
    document.getElementById('winMenuBtn').addEventListener('click', toMenu);

    // Capture records the cell state before the library flips it; bubble
    // runs after, so the pair detects transitions into a wrong mark.
    gridContainer.addEventListener('click', handleGridClickBefore, true);
    gridContainer.addEventListener('click', handleGridClickAfter, false);

    genContainer.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.closest && t.closest('[data-nonogram-game-reset]')) {
        mistakes = 0;
        elapsed = 0;
        if (state === 'playing') startTimer();
        updateHud();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (state !== 'playing') return;
      var key = ev.key;
      if (key === 'ArrowUp') { ev.preventDefault(); moveCursor(-1, 0); }
      else if (key === 'ArrowDown') { ev.preventDefault(); moveCursor(1, 0); }
      else if (key === 'ArrowLeft') { ev.preventDefault(); moveCursor(0, -1); }
      else if (key === 'ArrowRight') { ev.preventDefault(); moveCursor(0, 1); }
      else if (key === ' ' || key === 'Enter') { ev.preventDefault(); activateCursor(); }
    });

    document.addEventListener('keyup', function (ev) {
      // The library only listens for lowercase x; mirror it for X.
      if (state === 'playing' && ev.key === 'X') {
        var toggle = document.getElementById('nonogram-puzzle-fill-mode');
        if (toggle) toggle.click();
      }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (gui && gui.puzzle && state === 'playing') {
          gui.drawPreview('userSolution');
        }
      }, 150);
    });

    window.addEventListener('pagehide', stopTimer);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTimer();
      else if (state === 'playing') startTimer();
    });
  }

  gui = new Nonogram.Gui('./theme');
  var initial = creator.createRandom(5, 5);
  gui.draw(initial);
  bindUi();
  updateHud();
})();
