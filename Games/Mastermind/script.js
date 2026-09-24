/* Mastermind wrapper around the ingested meisterhirn engine (MIT).
   The engine exposes `Meisterhirn` (see engine.js): a controller with
   .model, .view, .newGame(). The wrapper adds the start screen, HUD/score,
   keyboard play and round bookkeeping. */
"use strict";

(function () {
  var $ = function (id) { return document.getElementById(id); };

  var ROWS = 8, COLS = 4, COLORS = 6;
  var PALETTE = ["#e63946", "#f4a300", "#2a9d8f", "#4361ee", "#9d4edd", "#8d99ae"];

  var startScreen = $("startScreen"), gameScreen = $("gameScreen");
  var statusEl = $("status");
  var mm = null, kbCursor = null;
  var cursorCol = 0, roundRecorded = false;
  var score = { won: 0, lost: 0 }, rounds = 0;

  function gridWidth() {
    var vw = document.documentElement.clientWidth || 360;
    var gw = Math.floor((Math.min(vw, 560) - 40 - 6) / 5); // width = 5*gw + 6
    return Math.max(40, Math.min(72, gw));
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function updateHud() {
    $("hudScore").textContent = "Won " + score.won + " : Lost " + score.lost;
    $("hudRounds").textContent = "Rounds " + rounds;
  }

  function updateStatus() {
    if (!mm) return;
    if (mm.model.won) {
      setStatus("You broke the code in " + (mm.model.count + 1) + " guesses", "win");
    } else if (mm.model.lost) {
      setStatus("Out of guesses. The code is revealed at the bottom", "loss");
    } else {
      setStatus("Guess " + (mm.model.count + 1) + " of " + ROWS);
    }
    updateCursor();
  }

  function updateCursor() {
    if (!kbCursor || !mm) return;
    var ended = mm.model.won || mm.model.lost || mm.model.count >= ROWS;
    if (gameScreen.classList.contains("hidden") || ended) {
      kbCursor.style.display = "none";
      return;
    }
    var gw = mm.view.options.gridWidth, rw = mm.view.options.ruleWidth;
    var x = cursorCol + 1, y = mm.model.count;
    kbCursor.style.display = "block";
    kbCursor.style.left = (x * gw + (x + 1) * rw) + "px";
    kbCursor.style.top = (y * gw + (y + 1) * rw) + "px";
    kbCursor.style.width = gw + "px";
    kbCursor.style.height = gw + "px";
  }

  function recordRound(won) {
    if (roundRecorded) return;
    roundRecorded = true;
    rounds += 1;
    if (won) score.won += 1; else score.lost += 1;
    updateHud();
  }

  function createGame() {
    mm = new Meisterhirn(
      { rows: ROWS, cols: COLS, colors: COLORS, multiple: true },
      {
        colors: PALETTE,
        gridWidth: gridWidth(),
        backgroundColor: "#20263f",
        leftBackgroundColor: "#161a2e",
        bottomBackgroundColor: "#2a3150",
        ruleColor: "#3b4470",
        numberFont: "bold 18px Arial, sans-serif",
        numberColor: "#c9d2f2",
        iconColor: "#eef2ff",
        questionColor: "#5a6390",
        holeColor: "#454d7a",
        matchesBlackColor: "#ffd166",
        matchesWhiteColor: "#eef2ff",
        messageFont: "bold " + Math.max(20, Math.round(gridWidth() * 0.4)) + "px Arial, sans-serif",
        messageColor: "#ffffff",
        messageShadowBlur: 0,
        messageBackgroundColor: "rgba(8, 10, 20, 0.78)",
        messageWon: "Code broken!",
        messageLost: "Out of guesses!",
        messageGaveUp: "Code revealed!",
        selectGridWidth: Math.min(50, gridWidth() - 6),
        selectBackgroundColor: "rgba(12, 15, 30, 0.94)"
      },
      false // no autosolver worker (offline single-file build)
    );
    mm.inject($("gameHost"));

    kbCursor = document.createElement("div");
    kbCursor.id = "kbCursor";
    kbCursor.style.display = "none";
    mm.toElement().appendChild(kbCursor);

    // listeners added after the controller's own, so they run last
    mm.model.addEventListener("row", updateStatus);
    mm.model.addEventListener("win", function () { recordRound(true); });
    mm.model.addEventListener("lose", function () { recordRound(false); });
    mm.view.addEventListener("restart", function () {
      roundRecorded = false;
      cursorCol = 0;
      updateStatus();
    });
    mm.view.addEventListener("show", function () {
      // give-up path: the controller has already set model.lost
      if (mm.model.lost) recordRound(false);
    });
  }

  function newRound() {
    if (!mm) return;
    roundRecorded = false;
    cursorCol = 0;
    mm.newGame();
    updateStatus();
  }

  function play() {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    if (!mm) {
      createGame();
      updateHud();
      updateStatus();
    } else {
      newRound();
    }
  }

  function toMenu() {
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    if (kbCursor) kbCursor.style.display = "none";
  }

  $("playBtn").addEventListener("click", play);
  $("menuBtn").addEventListener("click", toMenu);
  $("newRoundBtn").addEventListener("click", newRound);
  $("giveUpBtn").addEventListener("click", function () {
    if (!mm || mm.model.won || mm.model.lost) return;
    mm.view.fireEvent("show");
  });

  document.addEventListener("keydown", function (e) {
    if (gameScreen.classList.contains("hidden") || !mm) return;
    // let focused buttons handle their own Enter/Space activation
    if (e.target && e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;

    if (mm.model.won || mm.model.lost) return;

    var handled = true;
    switch (e.key) {
      case "ArrowLeft":
        cursorCol = Math.max(0, cursorCol - 1);
        updateCursor();
        break;
      case "ArrowRight":
        cursorCol = Math.min(COLS - 1, cursorCol + 1);
        updateCursor();
        break;
      case "Enter":
        if (mm.model.isRowSet()) {
          mm.view.fireEvent("check");
        } else {
          setStatus("Fill every hole with keys 1-6, then press Enter");
        }
        break;
      case "Escape":
        mm.view.closeSelect();
        break;
      default: {
        if (/^[1-9]$/.test(e.key)) {
          var colorIdx = Number(e.key) - 1;
          if (colorIdx < COLORS) {
            mm.view.fireEvent("select", cursorCol, colorIdx);
            if (cursorCol < COLS - 1) cursorCol += 1;
            updateCursor();
          }
        } else {
          handled = false;
        }
      }
    }
    if (handled) e.preventDefault();
  });
})();
