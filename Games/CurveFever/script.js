/*
 * Source: https://github.com/stravid/achtung-die-kurve
 * License: MIT (see LICENSE.txt)
 * Commit: de0d347ee4c0a87c1928e7b339c771991a080dd8
 * Wrapper around the vendored engine: fixed rosters (1P vs AI or local 2P),
 * keyboard + touch steering, an AI driver, round/match scoring overlays
 * (first to 5) and interval cleanup. The upstream control loop pattern
 * (apply held direction 100 times per second) is preserved.
 */

(function () {
  'use strict';

  var MATCH_TARGET = 5;
  var CONTROL_HZ = 100;
  var AI_INTERVAL_MS = 100;

  var state = 'menu'; // menu | playing | roundOver | matchOver
  var mode = 'ai'; // ai | duo
  var game = null;
  var controlIntervalId = null;
  var aiIntervalId = null;
  var directions = {}; // playerID -> -1 | 0 | 1
  var keySet = {};
  var names = [];

  var startScreen = document.getElementById('startScreen');
  var roundScreen = document.getElementById('roundScreen');
  var finalScreen = document.getElementById('finalScreen');

  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
  }

  function hideOverlays() {
    setHidden(startScreen, true);
    setHidden(roundScreen, true);
    setHidden(finalScreen, true);
  }

  function showOverlay(el) {
    hideOverlays();
    setHidden(el, false);
  }

  function playerName(id) {
    return names[id] !== undefined ? names[id] : ('Player ' + (id + 1));
  }

  function updateScores() {
    var box = document.getElementById('scores');
    while (box.firstChild) box.removeChild(box.firstChild);
    for (var id = 0; id < names.length; id++) {
      var chip = document.createElement('span');
      chip.className = 'score-chip';
      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      var color = '#888';
      if (game) color = game.playerManager.getPlayerColor(id);
      swatch.style.background = color;
      var label = document.createElement('span');
      label.textContent = playerName(id) + ': ';
      var strong = document.createElement('strong');
      var wins = 0;
      if (game) wins = game.playerManager.getPlayerWins(id);
      strong.textContent = String(wins);
      label.appendChild(strong);
      chip.appendChild(swatch);
      chip.appendChild(label);
      box.appendChild(chip);
    }
  }

  function clearTimers() {
    if (controlIntervalId !== null) {
      clearInterval(controlIntervalId);
      controlIntervalId = null;
    }
    if (aiIntervalId !== null) {
      clearInterval(aiIntervalId);
      aiIntervalId = null;
    }
  }

  function stopPlay() {
    clearTimers();
    directions = {};
    keySet = {};
    if (game) {
      game.stop();
    }
  }

  function startControlLoop() {
    controlIntervalId = setInterval(function () {
      if (!game) return;
      for (var id in directions) {
        if (directions.hasOwnProperty(id)) {
          game.handleControl(Number(id), directions[id]);
        }
      }
    }, 1000 / CONTROL_HZ);
  }

  /* ---- AI ---- */

  // Mirrors Engine.hitTest: outside the border or on drawn pixels.
  function blocked(x, y) {
    if (x > Config.canvasWidth || y > Config.canvasHeight || x < 0 || y < 0) {
      return true;
    }
    var data = game.getDrawingContext().getImageData(x, y, 1, 1).data;
    return data[3] > Config.threshold;
  }

  // Walk the arc the line would trace over the next ticks and count how
  // long it survives. One tick equals one pixel and two degrees of turn.
  function simulate(player, dir) {
    var x = player.x;
    var y = player.y;
    var angle = player.angle;
    var survived = 0;
    var maxSteps = 150;
    for (var i = 0; i < maxSteps; i++) {
      angle += 2 * dir;
      angle %= 360;
      if (angle < 0) angle += 360;
      var rad = (angle * Math.PI) / 180;
      x += Math.cos(rad);
      y += Math.sin(rad);
      if (blocked(x, y)) break;
      survived++;
    }
    return survived;
  }

  function aiThink() {
    if (!game || state !== 'playing' || mode !== 'ai') return;
    var player = game.playerManager.getPlayerByID(1);
    if (!player || !player.isPlaying || !player.isAlive) {
      directions[1] = 0;
      return;
    }
    var bestDir = 0;
    var bestScore = -1;
    for (var dir = -1; dir <= 1; dir++) {
      var score = simulate(player, dir) + Math.random() * 6;
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }
    directions[1] = bestDir;
  }

  /* ---- Match flow ---- */

  function startMatch(selectedMode) {
    stopPlay();
    mode = selectedMode;
    names = mode === 'ai' ? ['You', 'Computer'] : ['Player 1', 'Player 2'];

    var stage = document.getElementById('stage');
    var w = Math.max(320, Math.min(960, stage.clientWidth - 2));
    var h = Math.max(240, Math.min(560, Math.round(w * 0.6)));

    game = new Game('curve', w, h);
    game.addPlayer(names[0]);
    game.addPlayer(names[1]);
    game.setRoundCallback(handleRoundEnd);
    game.startSession();
    game.start();

    document.getElementById('p1Label').textContent = names[0];
    document.getElementById('p2Label').textContent = names[1];
    setHidden(document.getElementById('p2Pair'), mode !== 'duo');

    state = 'playing';
    hideOverlays();
    updateScores();
    startControlLoop();
    if (mode === 'ai') {
      aiIntervalId = setInterval(aiThink, AI_INTERVAL_MS);
    }
  }

  function scoreline() {
    return playerName(0) + ' ' + game.playerManager.getPlayerWins(0) +
      ', ' + playerName(1) + ' ' + game.playerManager.getPlayerWins(1);
  }

  function handleRoundEnd(stats) {
    if (state !== 'playing') return;
    clearTimers();
    directions = {};
    updateScores();

    var winnerId = stats.winnerID;
    var wins = [
      game.playerManager.getPlayerWins(0),
      game.playerManager.getPlayerWins(1),
    ];

    if (wins[0] >= MATCH_TARGET || wins[1] >= MATCH_TARGET) {
      state = 'matchOver';
      var title;
      if (mode === 'ai') {
        title = winnerId === 0 ? 'You win the match' : 'Computer wins the match';
      } else {
        title = playerName(winnerId) + ' wins the match';
      }
      document.getElementById('finalTitle').textContent = title;
      document.getElementById('finalStats').textContent =
        'Final score: ' + scoreline() + '.';
      updateScores();
      showOverlay(finalScreen);
    } else {
      state = 'roundOver';
      document.getElementById('roundTitle').textContent =
        playerName(winnerId) + ' takes the round';
      document.getElementById('roundStats').textContent =
        'Score: ' + scoreline() + '. First to ' + MATCH_TARGET + ' wins the match.';
      showOverlay(roundScreen);
    }
  }

  function nextRound() {
    if (state !== 'roundOver' || !game) return;
    game.restart();
    state = 'playing';
    hideOverlays();
    updateScores();
    startControlLoop();
    if (mode === 'ai') {
      aiIntervalId = setInterval(aiThink, AI_INTERVAL_MS);
    }
  }

  function toMenu() {
    stopPlay();
    state = 'menu';
    showOverlay(startScreen);
    updateScores();
  }

  /* ---- Input ---- */

  function recomputeDirections() {
    if (mode === 'ai') {
      var d = 0;
      if (keySet.arrowleft || keySet.a) d = -1;
      else if (keySet.arrowright || keySet.d) d = 1;
      directions[0] = d;
    } else {
      directions[0] = keySet.a ? -1 : keySet.d ? 1 : 0;
      directions[1] = keySet.arrowleft ? -1 : keySet.arrowright ? 1 : 0;
    }
  }

  function bindInput() {
    document.addEventListener('keydown', function (ev) {
      if (state !== 'playing') return;
      var key = ev.key.toLowerCase();
      if (key === 'arrowleft' || key === 'arrowright' ||
          key === 'a' || key === 'd') {
        ev.preventDefault();
        keySet[key] = true;
        recomputeDirections();
      }
    });

    document.addEventListener('keyup', function (ev) {
      var key = ev.key.toLowerCase();
      if (key === 'arrowleft' || key === 'arrowright' ||
          key === 'a' || key === 'd') {
        keySet[key] = false;
        if (state === 'playing') recomputeDirections();
      }
    });

    var steerButtons = document.querySelectorAll('.steer');
    steerButtons.forEach(function (btn) {
      var playerId = parseInt(btn.getAttribute('data-player'), 10);
      var dir = parseInt(btn.getAttribute('data-dir'), 10);
      var press = function (ev) {
        if (state !== 'playing') return;
        if (mode !== 'duo' && playerId !== 0) return;
        ev.preventDefault();
        directions[playerId] = dir;
        if (btn.setPointerCapture && ev.pointerId !== undefined) {
          try { btn.setPointerCapture(ev.pointerId); } catch (e) { /* capture unsupported */ }
        }
      };
      var release = function () {
        if (mode !== 'duo' && playerId !== 0) return;
        directions[playerId] = 0;
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    document.getElementById('aiBtn').addEventListener('click', function () {
      startMatch('ai');
    });
    document.getElementById('duoBtn').addEventListener('click', function () {
      startMatch('duo');
    });
    document.getElementById('nextBtn').addEventListener('click', nextRound);
    document.getElementById('againBtn').addEventListener('click', function () {
      startMatch(mode);
    });
    document.getElementById('menuBtn').addEventListener('click', toMenu);
    document.getElementById('roundMenuBtn').addEventListener('click', toMenu);
    document.getElementById('finalMenuBtn').addEventListener('click', toMenu);

    window.addEventListener('pagehide', stopPlay);
  }

  bindInput();
  updateScores();
  showOverlay(startScreen);
})();
