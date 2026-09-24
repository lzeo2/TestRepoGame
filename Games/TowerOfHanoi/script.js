/*
 * Source: https://github.com/Jayakrishna14s/Tower-of-Hanoi
 * License: MIT (see LICENSE.txt)
 * Commit: badd04c9d8d8d1a9d9be322fc2a268a566a950ee
 * Core rod model kept from the upstream script.js: topValues peg slots,
 * rodClick selection rules, undo stack and disc style swaps. Removed:
 * page-navigation functions, window.close exit, console.log spam and
 * the timed win/lose redirects. Added: overlay state machine with
 * restart paths, keyboard peg selection, HUD counters (moves left /
 * used / minimal budget).
 */

(function () {
  'use strict';

  var numberOfDiscs = 0;
  var MovesCount = 0; // moves left out of the minimal 2^n - 1 budget
  var topValues = [11, 21, 31];
  var MovesStored = [];
  var selectedDisc1 = 99;
  var selectedDisc2 = 99;
  var selectedRod1 = 0;
  var selectedRod2 = 0;
  var state = 'menu'; // menu | playing | won | lost

  var startScreen = document.getElementById('startScreen');
  var winScreen = document.getElementById('winScreen');
  var loseScreen = document.getElementById('loseScreen');
  var gameScreen = document.getElementById('gameScreen');

  function minimalMoves(n) {
    return Math.pow(2, n) - 1;
  }

  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
  }

  function hideOverlays() {
    setHidden(startScreen, true);
    setHidden(winScreen, true);
    setHidden(loseScreen, true);
  }

  function showOverlay(el) {
    hideOverlays();
    setHidden(el, false);
    var primary = el.querySelector('button.primary');
    if (primary) primary.focus();
  }

  function textBox(message) {
    document.getElementById('textbox').textContent = message;
  }

  function updateHud() {
    var minimal = minimalMoves(numberOfDiscs);
    document.getElementById('discLabel').textContent = 'Disks ' + numberOfDiscs;
    document.getElementById('movesLeftLabel').textContent = 'Moves left ' + MovesCount;
    document.getElementById('movesUsedLabel').textContent =
      'Moves used ' + (minimal - MovesCount);
    document.getElementById('minimalLabel').textContent = 'Minimal ' + minimal;
  }

  /* ---- Upstream board model ---- */

  function addElement(x, y) {
    MovesStored.push({ x: x, y: y });
  }

  function getColorByIndex(index) {
    var colors = ['gray', 'pink', 'cyan', 'magenta', 'purple', 'blue', 'green', 'yellow', 'orange', 'red'];
    return colors[index];
  }

  function resetAllDiscs() {
    var rods = document.querySelectorAll('.rod');
    rods.forEach(function (rod) {
      var locations = rod.querySelectorAll('.location');
      locations.forEach(function (location, index) {
        Object.assign(location.style, {
          width: (270 + index * 80) + '%',
          top: (2 + index * 10) + '%',
          backgroundColor: getColorByIndex(index),
          opacity: 1,
        });
      });
    });
  }

  function resetNumOfDiscs() {
    var rods = document.querySelectorAll('.rod');
    rods.forEach(function (rod, rodIndex) {
      var locations = rod.querySelectorAll('.location');
      locations.forEach(function (location, index) {
        var hide = rodIndex === 0 && index < 10 - numberOfDiscs;
        Object.assign(location.style, {
          width: (270 + index * 80) + '%',
          top: (2 + index * 10) + '%',
          backgroundColor: hide ? 'transparent' : (rodIndex === 0 ? getColorByIndex(index) : 'transparent'),
          opacity: 1,
        });
      });
    });
  }

  function SetNumberOfDiscs(num) {
    numberOfDiscs = num;
    MovesStored = [];
    MovesCount = minimalMoves(num);
    topValues = [11 - num, 21, 31];
    selectedDisc1 = 99;
    selectedDisc2 = 99;
    selectedRod1 = 0;
    selectedRod2 = 0;
    state = 'playing';
    hideOverlays();
    setHidden(gameScreen, false);
    resetAllDiscs();
    resetNumOfDiscs();
    textBox('Start');
    updateHud();
  }

  function Width(n) {
    var element = document.getElementById('location' + n);
    return element ? element.clientWidth : null;
  }

  function invalidMove() {
    selectedDisc1 = 99;
    selectedDisc2 = 99;
    selectedRod1 = 0;
    selectedRod2 = 0;
    textBox('Invalid move');
  }

  function validMove() {
    addElement(selectedDisc1, selectedDisc2);
    selectedDisc1 = 99;
    selectedDisc2 = 99;
    selectedRod1 = 0;
    selectedRod2 = 0;
    textBox('Valid move');
  }

  function fadeAway(n) {
    document.getElementById('location' + n).style.opacity = 0.5;
  }

  function emerge(n) {
    document.getElementById('location' + n).style.opacity = 1;
  }

  function swapColourWidthOpacity(s1, s2) {
    var element1 = document.getElementById('location' + s1);
    var element2 = document.getElementById('location' + s2);
    if (element1 && element2) {
      var tempColor = element1.style.backgroundColor;
      element1.style.backgroundColor = element2.style.backgroundColor;
      element2.style.backgroundColor = tempColor;
      var tempWidth = element1.style.width;
      element1.style.width = element2.style.width;
      element2.style.width = tempWidth;
      var tempOpacity = element1.style.opacity;
      element1.style.opacity = element2.style.opacity;
      element2.style.opacity = tempOpacity;
    }
  }

  // Selection and placement rules kept from the upstream rodClick.
  function rodClick(rodNumber) {
    if (state !== 'playing' || MovesCount === 0) return;
    textBox('');

    if (selectedDisc1 === 99 && topValues[rodNumber - 1] === 10 * rodNumber + 1) {
      invalidMove();
      return;
    }

    if (selectedDisc1 === 99 && topValues[rodNumber - 1] !== 10 * rodNumber + 1) {
      selectedRod1 = rodNumber;
      selectedDisc1 = topValues[rodNumber - 1];
      fadeAway(selectedDisc1);
      topValues[rodNumber - 1]++;
      return;
    }

    if (selectedDisc1 !== 99 && selectedDisc2 === 99 &&
        selectedDisc1 === topValues[rodNumber - 1] - 1) {
      // Clicking the source peg again cancels the selection.
      emerge(selectedDisc1);
      topValues[selectedRod1 - 1]--;
      invalidMove();
      return;
    }

    if (selectedDisc1 !== 99 && selectedDisc2 === 99 &&
        selectedDisc1 !== topValues[rodNumber - 1] - 1) {
      selectedRod2 = rodNumber;
      if (topValues[rodNumber - 1] !== rodNumber * 10 + 1 &&
          Width(selectedDisc1) > Width(topValues[rodNumber - 1])) {
        emerge(selectedDisc1);
        topValues[selectedRod1 - 1]--;
        invalidMove();
        return;
      }

      selectedDisc2 = --topValues[rodNumber - 1];
      swapColourWidthOpacity(selectedDisc1, selectedDisc2);
      emerge(selectedDisc2);
      validMove();
      MovesCount--;
      updateHud();

      if (MovesCount === 0) {
        if (topValues[1] === 21 - numberOfDiscs || topValues[2] === 31 - numberOfDiscs) {
          showWin();
        } else {
          showLose();
        }
      }
    }
  }

  function undo() {
    if (state !== 'playing' || MovesCount === 0) return;

    if (MovesStored.length === 0) {
      textBox('Nothing to undo');
      if (selectedDisc1 !== 99) {
        emerge(selectedDisc1);
        if (selectedDisc1 <= 10) topValues[0]--;
        else if (selectedDisc1 <= 20) topValues[1]--;
        else topValues[2]--;
        selectedDisc1 = 99;
      }
      return;
    }

    if (selectedDisc1 !== 99) {
      emerge(selectedDisc1);
      if (selectedDisc1 <= 10) topValues[0]--;
      else if (selectedDisc1 <= 20) topValues[1]--;
      else topValues[2]--;
      selectedDisc1 = 99;
    }

    textBox('Undo');
    var last = MovesStored[MovesStored.length - 1];
    var element1 = document.getElementById('location' + last.x);
    var element2 = document.getElementById('location' + last.y);
    if (element1 && element2) {
      var tempColor = element1.style.backgroundColor;
      element1.style.backgroundColor = element2.style.backgroundColor;
      element2.style.backgroundColor = tempColor;
      var tempWidth = element1.style.width;
      element1.style.width = element2.style.width;
      element2.style.width = tempWidth;
      var tempOpacity = element1.style.opacity;
      element1.style.opacity = element2.style.opacity;
      element2.style.opacity = tempOpacity;
    }

    if (last.y <= 10) topValues[0]++;
    else if (last.y <= 20) topValues[1]++;
    else topValues[2]++;

    if (last.x <= 10) topValues[0]--;
    else if (last.x <= 20) topValues[1]--;
    else topValues[2]--;

    MovesCount++;
    MovesStored.splice(MovesStored.length - 1, 1);
    updateHud();
  }

  /* ---- State flow ---- */

  function showWin() {
    state = 'won';
    document.getElementById('winStats').textContent =
      'All ' + numberOfDiscs + ' disks moved in ' + minimalMoves(numberOfDiscs) +
      ' moves, the exact minimum.';
    showOverlay(winScreen);
  }

  function showLose() {
    state = 'lost';
    document.getElementById('loseStats').textContent =
      'The budget of ' + minimalMoves(numberOfDiscs) +
      ' moves ran out before the transfer finished.';
    showOverlay(loseScreen);
  }

  function toMenu() {
    state = 'menu';
    setHidden(gameScreen, true);
    showOverlay(startScreen);
    textBox('');
  }

  function bindUi() {
    document.querySelectorAll('.disc-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        SetNumberOfDiscs(parseInt(btn.getAttribute('data-discs'), 10));
      });
    });

    document.querySelectorAll('.rod').forEach(function (rod, index) {
      rod.addEventListener('click', function () {
        rodClick(index + 1);
      });
      rod.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          rodClick(index + 1);
        }
      });
    });

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (state === 'playing' || state === 'won' || state === 'lost') {
        SetNumberOfDiscs(numberOfDiscs);
      }
    });
    document.getElementById('menuBtn').addEventListener('click', toMenu);
    document.getElementById('winAgainBtn').addEventListener('click', function () {
      SetNumberOfDiscs(numberOfDiscs);
    });
    document.getElementById('winMenuBtn').addEventListener('click', toMenu);
    document.getElementById('loseAgainBtn').addEventListener('click', function () {
      SetNumberOfDiscs(numberOfDiscs);
    });
    document.getElementById('loseMenuBtn').addEventListener('click', toMenu);

    document.addEventListener('keydown', function (ev) {
      if (state !== 'playing') return;
      if (ev.key === '1') { ev.preventDefault(); rodClick(1); }
      else if (ev.key === '2') { ev.preventDefault(); rodClick(2); }
      else if (ev.key === '3') { ev.preventDefault(); rodClick(3); }
      else if (ev.key === 'u' || ev.key === 'U' || ev.key === 'z' || ev.key === 'Z') {
        undo();
      } else if (ev.key === 'r' || ev.key === 'R') {
        SetNumberOfDiscs(numberOfDiscs);
      }
    });
  }

  bindUi();
  setHidden(gameScreen, true);
  showOverlay(startScreen);
})();
