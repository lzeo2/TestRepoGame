/**
 * Reaction Duel - 2P reaction game
 * Modes: 2P Duel, Solo Test, Tricky Duel
 */
(function () {
  'use strict';

  // Constants
  var ROUNDS_TO_WIN = 5;
  var SOLO_TRIALS = 5;
  var WAIT_MIN = 1000;
  var WAIT_MAX = 4000;
  var FAKE_DURATION = 300;
  var RESULT_DURATION = 1800;
  var MAX_FAKES = 2;
  var FAKE_CHANCE = 0.6;

  // State
  var state = {
    mode: 'duel',        // 'duel', 'solo', 'tricky'
    phase: 'menu',       // 'menu', 'countdown', 'waiting', 'fake', 'go', 'result', 'gameover'
    roundNum: 0,
    scoreP1: 0,
    scoreP2: 0,
    goTimestamp: 0,
    roundHistory: [],    // [{winner:1|2, ms:number|null, falseStart:boolean, forfeitPlayer:1|2|null}]
    soloResults: [],     // [ms, ms, ...]
    fakeCount: 0,
    timers: {
      main: null,
      fake: null,
      result: null
    }
  };

  // DOM refs
  var screens = {
    menu: document.getElementById('screen-menu'),
    play: document.getElementById('screen-play'),
    result: document.getElementById('screen-result'),
    win: document.getElementById('screen-win')
  };

  var els = {
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    menuBtn: document.getElementById('menuBtn'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    controlsInfo: document.getElementById('controls-info'),
    scoreboard: document.getElementById('scoreboard'),
    scoreP1: document.getElementById('score-p1'),
    scoreP2: document.getElementById('score-p2'),
    roundNum: document.getElementById('round-num'),
    playArea: document.getElementById('play-area'),
    stageText: document.getElementById('stage-text'),
    stageSub: document.getElementById('stage-sub'),
    touchZones: document.getElementById('touch-zones'),
    resultText: document.getElementById('result-text'),
    resultDetail: document.getElementById('result-detail'),
    winTitle: document.getElementById('win-title'),
    winStats: document.getElementById('win-stats'),
    roundHistory: document.getElementById('round-history')
  };

  // Detect touch
  function detectTouch() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-enabled');
    }
  }

  // Screen management
  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.remove('active');
    });
    if (screens[name]) {
      screens[name].classList.add('active');
    }
  }

  // Clear all timers
  function clearAllTimers() {
    if (state.timers.main) {
      clearTimeout(state.timers.main);
      state.timers.main = null;
    }
    if (state.timers.fake) {
      clearTimeout(state.timers.fake);
      state.timers.fake = null;
    }
    if (state.timers.result) {
      clearTimeout(state.timers.result);
      state.timers.result = null;
    }
  }

  // Random delay
  function randomDelay() {
    return WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
  }

  // Update controls info based on mode
  function updateControlsInfo() {
    var info = els.controlsInfo;
    info.textContent = '';

    if (state.mode === 'duel' || state.mode === 'tricky') {
      var p1p = document.createElement('p');
      var p1span = document.createElement('span');
      p1span.className = 'p1-label';
      p1span.textContent = 'P1';
      p1p.appendChild(p1span);
      p1p.appendChild(document.createTextNode(' press '));
      var p1kbd = document.createElement('kbd');
      p1kbd.textContent = 'A';
      p1p.appendChild(p1kbd);
      info.appendChild(p1p);

      var p2p = document.createElement('p');
      var p2span = document.createElement('span');
      p2span.className = 'p2-label';
      p2span.textContent = 'P2';
      p2p.appendChild(p2span);
      p2p.appendChild(document.createTextNode(' press '));
      var p2kbd = document.createElement('kbd');
      p2kbd.textContent = 'L';
      p2p.appendChild(p2kbd);
      info.appendChild(p2p);

      var note = document.createElement('p');
      note.className = 'controls-note';
      note.textContent = 'First to 5 rounds wins';
      info.appendChild(note);
    } else {
      var sp = document.createElement('p');
      sp.textContent = 'Press ';
      var kbd = document.createElement('kbd');
      kbd.textContent = 'A';
      sp.appendChild(kbd);
      sp.appendChild(document.createTextNode(' or '));
      var kbd2 = document.createElement('kbd');
      kbd2.textContent = 'Space';
      sp.appendChild(kbd2);
      sp.appendChild(document.createTextNode(' when you see GO!'));
      info.appendChild(sp);

      var note = document.createElement('p');
      note.className = 'controls-note';
      note.textContent = SOLO_TRIALS + ' trials - best time saved';
      info.appendChild(note);
    }
  }

  // Mode selection
  function selectMode(mode) {
    state.mode = mode;
    els.modeBtns.forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-mode') === mode);
    });
    updateControlsInfo();
  }

  // Reset game state
  function resetGame() {
    clearAllTimers();
    state.phase = 'menu';
    state.roundNum = 0;
    state.scoreP1 = 0;
    state.scoreP2 = 0;
    state.goTimestamp = 0;
    state.roundHistory = [];
    state.soloResults = [];
    state.fakeCount = 0;
    setPlayAreaState('');
    els.stageText.textContent = '';
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = '';
  }

  // Set play area visual state
  function setPlayAreaState(stateName) {
    els.playArea.classList.remove('state-waiting', 'state-go', 'state-false', 'state-fake');
    if (stateName) {
      els.playArea.classList.add('state-' + stateName);
    }
  }

  // Update scoreboard
  function updateScoreboard() {
    els.scoreP1.textContent = state.scoreP1;
    els.scoreP2.textContent = state.scoreP2;
    els.roundNum.textContent = state.roundNum;
  }

  // Start game
  function startGame() {
    resetGame();
    showScreen('play');

    if (state.mode === 'solo') {
      els.scoreboard.style.display = 'none';
      startSoloTrial();
    } else {
      els.scoreboard.style.display = '';
      startDuelRound();
    }
  }

  // Start a duel round (2P or Tricky)
  function startDuelRound() {
    state.roundNum++;
    state.fakeCount = 0;
    updateScoreboard();
    enterWaiting();
  }

  // Enter waiting phase
  function enterWaiting() {
    state.phase = 'waiting';
    setPlayAreaState('waiting');
    els.stageText.textContent = 'WAIT...';
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = 'Do not press yet';

    state.timers.main = setTimeout(function () {
      if (state.mode === 'tricky' && state.fakeCount < MAX_FAKES && Math.random() < FAKE_CHANCE) {
        showFake();
      } else {
        showGo();
      }
    }, randomDelay());
  }

  // Show fake signal (tricky mode)
  function showFake() {
    state.phase = 'fake';
    state.fakeCount++;
    setPlayAreaState('fake');

    var fakeTexts = ['READY...', 'SET...', 'STEADY...'];
    els.stageText.textContent = fakeTexts[Math.floor(Math.random() * fakeTexts.length)];
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = '';

    state.timers.fake = setTimeout(function () {
      enterWaiting();
    }, FAKE_DURATION);
  }

  // Show GO signal
  function showGo() {
    state.phase = 'go';
    state.goTimestamp = performance.now();
    setPlayAreaState('go');
    els.stageText.textContent = 'GO!';
    els.stageText.classList.add('go-text');
    els.stageSub.textContent = '';
  }

  // Handle player press
  function handlePress(player) {
    if (state.phase === 'waiting' || state.phase === 'fake') {
      // False start
      handleFalseStart(player);
    } else if (state.phase === 'go') {
      // Valid press
      handleValidPress(player);
    }
  }

  // Handle false start
  function handleFalseStart(player) {
    clearAllTimers();
    state.phase = 'result';
    setPlayAreaState('false');

    var winner = player === 1 ? 2 : 1;
    var loserLabel = player === 1 ? 'P1' : 'P2';
    var winnerLabel = winner === 1 ? 'P1' : 'P2';

    els.stageText.textContent = 'FALSE START!';
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = loserLabel + ' pressed too early - round to ' + winnerLabel;

    if (winner === 1) {
      state.scoreP1++;
    } else {
      state.scoreP2++;
    }

    state.roundHistory.push({
      winner: winner,
      ms: null,
      falseStart: true,
      forfeitPlayer: player
    });

    updateScoreboard();

    state.timers.result = setTimeout(function () {
      checkWinOrContinue();
    }, RESULT_DURATION);
  }

  // Handle valid press
  function handleValidPress(player) {
    clearAllTimers();
    state.phase = 'result';

    var reactionMs = Math.round(performance.now() - state.goTimestamp);
    var winnerLabel = player === 1 ? 'P1' : 'P2';

    setPlayAreaState('');
    els.stageText.textContent = reactionMs + ' ms';
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = winnerLabel + ' wins the round!';

    if (player === 1) {
      state.scoreP1++;
    } else {
      state.scoreP2++;
    }

    state.roundHistory.push({
      winner: player,
      ms: reactionMs,
      falseStart: false,
      forfeitPlayer: null
    });

    updateScoreboard();

    state.timers.result = setTimeout(function () {
      checkWinOrContinue();
    }, RESULT_DURATION);
  }

  // Check if game is won or continue
  function checkWinOrContinue() {
    if (state.scoreP1 >= ROUNDS_TO_WIN || state.scoreP2 >= ROUNDS_TO_WIN) {
      showWinScreen();
    } else {
      startDuelRound();
    }
  }

  // Show win screen
  function showWinScreen() {
    state.phase = 'gameover';
    showScreen('win');

    var winner = state.scoreP1 >= ROUNDS_TO_WIN ? 1 : 2;
    var winnerLabel = winner === 1 ? 'P1' : 'P2';
    var winnerClass = winner === 1 ? 'p1-label' : 'p2-label';

    els.winTitle.textContent = '';
    var winSpan = document.createElement('span');
    winSpan.className = winnerClass;
    winSpan.textContent = winnerLabel;
    els.winTitle.appendChild(winSpan);
    els.winTitle.appendChild(document.createTextNode(' WINS!'));

    els.winStats.textContent = 'Final Score: P1 ' + state.scoreP1 + ' - P2 ' + state.scoreP2;

    // Round history
    els.roundHistory.textContent = '';
    state.roundHistory.forEach(function (round, idx) {
      var item = document.createElement('div');
      item.className = 'round-history-item';

      var label = document.createElement('span');
      label.className = 'round-label';
      label.textContent = 'Round ' + (idx + 1);

      var detail = document.createElement('span');
      var winnerSpan = document.createElement('span');
      winnerSpan.className = 'round-winner ' + (round.winner === 1 ? 'p1-label' : 'p2-label');
      winnerSpan.textContent = round.winner === 1 ? 'P1' : 'P2';

      if (round.falseStart) {
        var loserLabel = round.forfeitPlayer === 1 ? 'P1' : 'P2';
        detail.textContent = loserLabel + ' false start - ';
        detail.appendChild(winnerSpan);
        detail.appendChild(document.createTextNode(' wins'));
      } else {
        detail.textContent = '';
        detail.appendChild(winnerSpan);
        detail.appendChild(document.createTextNode(' ' + round.ms + ' ms'));
      }

      item.appendChild(label);
      item.appendChild(detail);
      els.roundHistory.appendChild(item);
    });
  }

  // Solo mode
  function startSoloTrial() {
    state.roundNum = state.soloResults.length + 1;
    state.fakeCount = 0;
    updateScoreboard();
    enterSoloWaiting();
  }

  function enterSoloWaiting() {
    state.phase = 'waiting';
    setPlayAreaState('waiting');
    els.stageText.textContent = 'WAIT...';
    els.stageText.classList.remove('go-text');
    els.stageSub.textContent = 'Trial ' + state.roundNum + ' of ' + SOLO_TRIALS;

    state.timers.main = setTimeout(function () {
      showSoloGo();
    }, randomDelay());
  }

  function showSoloGo() {
    state.phase = 'go';
    state.goTimestamp = performance.now();
    setPlayAreaState('go');
    els.stageText.textContent = 'GO!';
    els.stageText.classList.add('go-text');
    els.stageSub.textContent = '';
  }

  function handleSoloPress() {
    if (state.phase === 'waiting') {
      // False start in solo - just show message and retry this trial
      clearAllTimers();
      state.phase = 'result';
      setPlayAreaState('false');
      els.stageText.textContent = 'TOO EARLY!';
      els.stageText.classList.remove('go-text');
      els.stageSub.textContent = 'Try this trial again';

      state.timers.result = setTimeout(function () {
        startSoloTrial();
      }, RESULT_DURATION);
    } else if (state.phase === 'go') {
      var reactionMs = Math.round(performance.now() - state.goTimestamp);
      state.soloResults.push(reactionMs);

      clearAllTimers();
      state.phase = 'result';
      setPlayAreaState('');
      els.stageText.textContent = reactionMs + ' ms';
      els.stageText.classList.remove('go-text');
      els.stageSub.textContent = 'Trial ' + state.soloResults.length + ' of ' + SOLO_TRIALS;

      state.timers.result = setTimeout(function () {
        if (state.soloResults.length >= SOLO_TRIALS) {
          showSoloResults();
        } else {
          startSoloTrial();
        }
      }, RESULT_DURATION);
    }
  }

  function showSoloResults() {
    state.phase = 'gameover';
    showScreen('win');

    var total = 0;
    var best = state.soloResults[0];
    state.soloResults.forEach(function (ms) {
      total += ms;
      if (ms < best) best = ms;
    });
    var avg = Math.round(total / state.soloResults.length);

    els.winTitle.textContent = 'RESULTS';

    els.winStats.textContent = '';
    var statsP = document.createElement('p');
    statsP.textContent = 'Average: ' + avg + ' ms';
    els.winStats.appendChild(statsP);
    var bestP = document.createElement('p');
    bestP.textContent = 'Best: ' + best + ' ms';
    els.winStats.appendChild(bestP);

    // Load previous best
    var prevBest = null;
    try {
      if (typeof GameSave !== 'undefined') {
        var saved = GameSave.load('reactionduel');
        if (saved && saved.best) {
          prevBest = saved.best;
        }
      }
    } catch (e) {
      // ignore
    }

    if (prevBest) {
      var prevP = document.createElement('p');
      prevP.textContent = 'Previous Best: ' + prevBest + ' ms';
      els.winStats.appendChild(prevP);
    }

    // Save new best
    if (!prevBest || best < prevBest) {
      try {
        if (typeof GameSave !== 'undefined') {
          GameSave.save('reactionduel', { best: best });
        }
      } catch (e) {
        // ignore
      }
    }

    // Round history (trials)
    els.roundHistory.textContent = '';
    state.soloResults.forEach(function (ms, idx) {
      var item = document.createElement('div');
      item.className = 'round-history-item';

      var label = document.createElement('span');
      label.className = 'round-label';
      label.textContent = 'Trial ' + (idx + 1);

      var detail = document.createElement('span');
      detail.className = 'round-winner';
      detail.textContent = ms + ' ms';

      item.appendChild(label);
      item.appendChild(detail);
      els.roundHistory.appendChild(item);
    });
  }

  // Keyboard handler
  function onKeyDown(e) {
    if (state.phase === 'menu' || state.phase === 'gameover') return;

    if (state.mode === 'solo') {
      if (e.code === 'KeyA' || e.code === 'KeyL' || e.code === 'Space') {
        e.preventDefault();
        handleSoloPress();
      }
    } else {
      if (e.code === 'KeyA') {
        e.preventDefault();
        handlePress(1);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        handlePress(2);
      }
    }
  }

  // Touch handlers
  function setupTouchZones() {
    var p1Zone = document.querySelector('.touch-p1');
    var p2Zone = document.querySelector('.touch-p2');

    p1Zone.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (state.mode === 'solo') {
        handleSoloPress();
      } else {
        handlePress(1);
      }
    });

    p2Zone.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (state.mode !== 'solo') {
        handlePress(2);
      }
    });
  }

  // Event listeners
  els.modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectMode(btn.getAttribute('data-mode'));
    });
  });

  els.startBtn.addEventListener('click', function () {
    startGame();
  });

  els.restartBtn.addEventListener('click', function () {
    resetGame();
    startGame();
  });

  els.menuBtn.addEventListener('click', function () {
    resetGame();
    showScreen('menu');
  });

  document.addEventListener('keydown', onKeyDown);

  // Init
  detectTouch();
  setupTouchZones();
  updateControlsInfo();
  showScreen('menu');
})();
