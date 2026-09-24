/* Ultimate Tic-Tac-Toe, ingested from https://github.com/ZLouisMiguel/ult
   License: MIT (see LICENSE), commit 589416481de5aa70829b1c7221791649932ad5f1.
   engine.js + computer.js + ui.js + script.js concatenated; online
   multiplayer (remote.js / WebSocket / lobby) removed for offline policy;
   menu rebinding fixed (upstream called bindOnlineEvents without importing
   it, so the landing buttons never worked); keyboard cursor, match scoreboard
   and Esc-to-close added; rule PNGs dropped in favour of text rules. */
(function () {
"use strict";

/* ---------------- engine (upstream: src/js/engine.js) ---------------- */

var WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function createInitialState() {
  return {
    currentPlayer: "X",
    boards: Array.from({ length: 9 }, function () { return Array(9).fill(""); }),
    mainBoard: Array(9).fill(""),
    activeBoardIndex: -1,
    gameActive: true
  };
}

function getWinner(boardArray) {
  for (var i = 0; i < WINNING_COMBINATIONS.length; i++) {
    var a = WINNING_COMBINATIONS[i][0], b = WINNING_COMBINATIONS[i][1], c = WINNING_COMBINATIONS[i][2];
    if (boardArray[a] && boardArray[b] === boardArray[a] && boardArray[c] === boardArray[a]) {
      return boardArray[a];
    }
  }
  return boardArray.every(function (cell) { return cell !== ""; }) ? "Draw" : null;
}

function getWinningLine(boardArray) {
  for (var i = 0; i < WINNING_COMBINATIONS.length; i++) {
    var a = WINNING_COMBINATIONS[i][0], b = WINNING_COMBINATIONS[i][1], c = WINNING_COMBINATIONS[i][2];
    if (boardArray[a] && boardArray[b] === boardArray[a] && boardArray[c] === boardArray[a]) {
      return [a, b, c];
    }
  }
  return null;
}

function validateMove(state, boardIdx, cellIdx) {
  if (!state.gameActive) return { valid: false, reason: "The game is already over" };
  if (state.mainBoard[boardIdx] !== "")
    return { valid: false, reason: "That board is already finished" };
  if (state.boards[boardIdx][cellIdx] !== "")
    return { valid: false, reason: "That cell is already taken" };
  if (state.activeBoardIndex !== -1 && state.activeBoardIndex !== boardIdx) {
    return { valid: false, reason: "You must play on the highlighted board" };
  }
  return { valid: true, reason: null };
}

function applyMove(state, boardIdx, cellIdx) {
  var next = {
    currentPlayer: state.currentPlayer,
    boards: state.boards.map(function (b) { return b.slice(); }),
    mainBoard: state.mainBoard.slice(),
    activeBoardIndex: state.activeBoardIndex,
    gameActive: state.gameActive
  };

  next.boards[boardIdx][cellIdx] = next.currentPlayer;

  var localResult = getWinner(next.boards[boardIdx]);
  if (localResult && localResult !== "Draw") {
    next.mainBoard[boardIdx] = localResult;
  } else if (localResult === "Draw") {
    next.mainBoard[boardIdx] = "D";
  }

  next.activeBoardIndex = next.mainBoard[cellIdx] === "" ? cellIdx : -1;

  var globalResult = getWinner(next.mainBoard);
  if (globalResult && globalResult !== "Draw") {
    next.gameActive = false;
    next.winner = globalResult;
    next.winningLine = getWinningLine(next.mainBoard);
  } else if (globalResult === "Draw") {
    next.gameActive = false;
    next.winner = "Draw";
    next.winningLine = null;
  } else {
    next.currentPlayer = next.currentPlayer === "X" ? "O" : "X";
  }

  return next;
}

/* ---------------- computer (upstream: src/js/computer.js) ---------------- */

var MAX_DEPTH = 5;

function scoreLocalBoard(board, player) {
  var opponent = player === "O" ? "X" : "O";
  var score = 0;

  for (var i = 0; i < WINNING_COMBINATIONS.length; i++) {
    var line = [board[WINNING_COMBINATIONS[i][0]], board[WINNING_COMBINATIONS[i][1]], board[WINNING_COMBINATIONS[i][2]]];
    var mine = line.filter(function (v) { return v === player; }).length;
    var theirs = line.filter(function (v) { return v === opponent; }).length;

    if (theirs === 0) {
      if (mine === 2) score += 10;
      else if (mine === 1) score += 2;
      else score += 0.5;
    } else if (mine === 0) {
      if (theirs === 2) score -= 12;
      else if (theirs === 1) score -= 2;
    }
  }

  if (board[4] === player) score += 4;
  else if (board[4] === opponent) score -= 4;

  return score;
}

function scoreState(state) {
  var score = 0;
  var globalWeights = [3, 2, 3, 2, 4, 2, 3, 2, 3];

  for (var b = 0; b < 9; b++) {
    var globalCell = state.mainBoard[b];
    var weight = globalWeights[b];

    if (globalCell === "O") {
      score += 100 * weight;
    } else if (globalCell === "X") {
      score -= 100 * weight;
    } else if (globalCell === "") {
      score += scoreLocalBoard(state.boards[b], "O") * weight;
    }
  }

  for (var i = 0; i < WINNING_COMBINATIONS.length; i++) {
    var gLine = [state.mainBoard[WINNING_COMBINATIONS[i][0]], state.mainBoard[WINNING_COMBINATIONS[i][1]], state.mainBoard[WINNING_COMBINATIONS[i][2]]];
    var mine = gLine.filter(function (v) { return v === "O"; }).length;
    var theirs = gLine.filter(function (v) { return v === "X"; }).length;
    var empty = gLine.filter(function (v) { return v === ""; }).length;

    if (theirs === 0 && mine === 2 && empty === 1) score += 500;
    else if (mine === 0 && theirs === 2 && empty === 1) score -= 600;
  }

  return score;
}

function orderMoves(moves) {
  var centerCells = [4];
  var cornerCells = [0, 2, 6, 8];
  function scoreMove(m) {
    var s = 0;
    if (m.bIdx === 4) s += 4;
    else if (cornerCells.indexOf(m.bIdx) !== -1) s += 2;
    if (m.cIdx === 4) s += 3;
    else if (cornerCells.indexOf(m.cIdx) !== -1) s += 1;
    void centerCells;
    return s;
  }
  return moves.slice().sort(function (a, b) { return scoreMove(b) - scoreMove(a); });
}

function getLegalMoves(state) {
  var legalBoards;
  if (state.activeBoardIndex === -1) {
    legalBoards = state.mainBoard
      .map(function (status, idx) { return status === "" ? idx : null; })
      .filter(function (v) { return v !== null; });
  } else {
    legalBoards = [state.activeBoardIndex];
  }

  var moves = [];
  for (var i = 0; i < legalBoards.length; i++) {
    var bIdx = legalBoards[i];
    for (var cIdx = 0; cIdx < 9; cIdx++) {
      if (state.boards[bIdx][cIdx] === "") moves.push({ bIdx: bIdx, cIdx: cIdx });
    }
  }
  return moves;
}

function minimax(state, depth, alpha, beta, isMaximising) {
  if (!state.gameActive) {
    if (state.winner === "O") return 1000 + depth;
    if (state.winner === "X") return -1000 - depth;
    return 0;
  }

  if (depth === 0) return scoreState(state);
  var moves = orderMoves(getLegalMoves(state));

  if (isMaximising) {
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var next = applyMove(state, moves[i].bIdx, moves[i].cIdx);
      var val = minimax(next, depth - 1, alpha, beta, false);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  var worst = Infinity;
  for (var j = 0; j < moves.length; j++) {
    var nx = applyMove(state, moves[j].bIdx, moves[j].cIdx);
    var v = minimax(nx, depth - 1, alpha, beta, true);
    if (v < worst) worst = v;
    if (v < beta) beta = v;
    if (beta <= alpha) break;
  }
  return worst;
}

function getComputerMove(state) {
  var moves = orderMoves(getLegalMoves(state));
  if (moves.length === 1) return moves[0];
  var bestScore = -Infinity;
  var bestMove = moves[0];

  for (var i = 0; i < moves.length; i++) {
    var next = applyMove(state, moves[i].bIdx, moves[i].cIdx);
    var score = minimax(next, MAX_DEPTH - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = moves[i];
    }
  }
  return bestMove;
}

/* ---------------- ui (upstream: src/js/ui.js, online parts removed) ---------------- */

var LINE_LABELS = {
  "012": "the top row",
  "345": "the middle row",
  "678": "the bottom row",
  "036": "the left column",
  "147": "the center column",
  "258": "the right column",
  "048": "the main diagonal",
  "246": "the anti-diagonal"
};

function describeWin(line) {
  if (!line || !LINE_LABELS[line.join("")]) return "three in a row";
  return LINE_LABELS[line.join("")];
}

var boardContainer = document.getElementById("ultimate-board");
var landingPage = document.getElementById("landing");
var appPage = document.getElementById("app");
var modal = document.getElementById("gameEndModal");
var modalTitle = document.getElementById("modal-title");
var modalSubtitle = document.getElementById("modal-subtitle");
var modalRestartBtn = document.getElementById("modal-restart-btn");
var modalMenuBtn = document.getElementById("modal-menu-btn");
var currentPlayerEl = document.getElementById("current-player");
var turnIndicator = document.getElementById("turn-indicator");
var backBtn = document.getElementById("btn-back");
var restartBtn = document.getElementById("btn-restart");
var menuButtons = document.querySelectorAll(".next-controls button");
var toastEl = document.getElementById("toast");
var scoreXEl = document.getElementById("score-x");
var scoreOEl = document.getElementById("score-o");
var scoreDrawEl = document.getElementById("score-draw");

var toastTimer = null;

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.remove("hidden", "fade-out");
  toastTimer = setTimeout(function () {
    toastEl.classList.add("fade-out");
    toastTimer = setTimeout(function () {
      toastEl.classList.add("hidden");
      toastEl.classList.remove("fade-out");
    }, 400);
  }, 1800);
}

function clearToast() {
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  toastEl.classList.add("hidden");
  toastEl.classList.remove("fade-out");
}

function initBoard(onMove) {
  boardContainer.textContent = "";
  for (var b = 0; b < 9; b++) {
    var boardDiv = document.createElement("div");
    boardDiv.classList.add("small-board");
    boardDiv.dataset.boardId = String(b);

    for (var c = 0; c < 9; c++) {
      var cellDiv = document.createElement("div");
      cellDiv.classList.add("cell");
      (function (bb, cc) {
        cellDiv.addEventListener("click", function () { onMove(bb, cc); });
      })(b, c);
      boardDiv.appendChild(cellDiv);
    }
    boardContainer.appendChild(boardDiv);
  }
}

function renderState(state) {
  var boards = document.querySelectorAll(".small-board");
  boards.forEach(function (boardEl, b) {
    boardEl.className = "small-board";

    var result = state.mainBoard[b];
    if (result === "X") boardEl.classList.add("won-x");
    else if (result === "O") boardEl.classList.add("won-o");
    else if (result === "D") boardEl.classList.add("won-draw");

    var isActive = state.activeBoardIndex === -1
      ? result === ""
      : state.activeBoardIndex === b;
    if (isActive && result === "") boardEl.classList.add("active-board");

    boardEl.querySelectorAll(".cell").forEach(function (cellEl, c) {
      cellEl.textContent = state.boards[b][c];
    });
  });

  currentPlayerEl.textContent = state.currentPlayer;
  currentPlayerEl.className = state.currentPlayer === "X" ? "won-x" : "won-o";
}

function showInvalidMove(reason) { showToast(reason); }

var thinkingFlag = false;
function setThinking(isThinking) {
  thinkingFlag = isThinking;
  if (isThinking) {
    turnIndicator.classList.add("thinking");
    boardContainer.style.pointerEvents = "none";
  } else {
    turnIndicator.classList.remove("thinking");
    boardContainer.style.pointerEvents = "auto";
  }
}
function isThinking() { return thinkingFlag; }

function showEndModal(state) {
  if (state.winner === "Draw") {
    modalTitle.textContent = "It's a draw!";
    modalTitle.className = "";
    modalSubtitle.textContent = "Every board has been contested, no winner.";
  } else {
    modalTitle.textContent = "Player " + state.winner + " wins!";
    modalTitle.className = state.winner === "X" ? "won-x" : "won-o";
    modalSubtitle.textContent = "They claimed " + describeWin(state.winningLine) + " on the global board.";
  }
  modal.classList.remove("hidden");
  modalRestartBtn.focus();
}

function hideEndModal() { modal.classList.add("hidden"); }
function endModalVisible() { return !modal.classList.contains("hidden"); }

function showGame() {
  landingPage.classList.add("hidden");
  appPage.classList.remove("hidden");
}

function showLanding() {
  landingPage.classList.remove("hidden");
  appPage.classList.add("hidden");
}

function resetUI() {
  clearToast();
  hideEndModal();
  setThinking(false);
}

function updateScoreBoard(scores) {
  scoreXEl.textContent = String(scores.X);
  scoreOEl.textContent = String(scores.O);
  scoreDrawEl.textContent = String(scores.Draw);
}

/* ---------------- orchestration (upstream: src/js/script.js) ---------------- */

var state = createInitialState();
var mode = "local";
var computerTimer = null;
var scores = { X: 0, O: 0, Draw: 0 };

/* keyboard cursor, in 9x9 super-grid coordinates */
var kbRow = 0, kbCol = 0;

function kbToCell() {
  var b = Math.floor(kbRow / 3) * 3 + Math.floor(kbCol / 3);
  var c = (kbRow % 3) * 3 + (kbCol % 3);
  return { b: b, c: c };
}

function syncKbCursor() {
  var old = boardContainer.querySelectorAll(".kb-cursor");
  old.forEach(function (el) { el.classList.remove("kb-cursor"); });
  var pos = kbToCell();
  var board = boardContainer.children[pos.b];
  if (!board) return;
  var cell = board.children[pos.c];
  if (!cell) return;
  cell.classList.add("kb-cursor");
  if (cell.scrollIntoView) cell.scrollIntoView({ block: "nearest" });
}

function handleMove(boardIdx, cellIdx, fromAi) {
  if (!fromAi && mode === "computer" && state.currentPlayer === "O") return; // block input on the AI's turn
  var check = validateMove(state, boardIdx, cellIdx);
  if (!check.valid) {
    showInvalidMove(check.reason);
    return;
  }

  state = applyMove(state, boardIdx, cellIdx);
  renderState(state);

  if (!state.gameActive) {
    if (state.winner === "X") scores.X += 1;
    else if (state.winner === "O") scores.O += 1;
    else scores.Draw += 1;
    updateScoreBoard(scores);
    showEndModal(state);
    return;
  }

  if (mode === "computer" && state.currentPlayer === "O") {
    scheduleComputerMove();
  }
}

function scheduleComputerMove() {
  setThinking(true);
  computerTimer = setTimeout(function () {
    computerTimer = null;
    setThinking(false);
    var move = getComputerMove(state);
    handleMove(move.bIdx, move.cIdx, true);
  }, 600);
}

function cancelComputerMove() {
  if (computerTimer !== null) {
    clearTimeout(computerTimer);
    computerTimer = null;
    setThinking(false);
  }
}

function startGame(selectedMode) {
  mode = selectedMode;
  scores = { X: 0, O: 0, Draw: 0 };
  updateScoreBoard(scores);
  resetGame();
  showGame();
  boardContainer.focus();
}

function resetGame() {
  cancelComputerMove();
  resetUI();
  state = createInitialState();
  initBoard(handleMove);
  renderState(state);
  kbRow = 0; kbCol = 0;
  syncKbCursor();
}

function goToMenu() {
  cancelComputerMove();
  scores = { X: 0, O: 0, Draw: 0 };
  updateScoreBoard(scores);
  resetUI();
  showLanding();
}

menuButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    startGame(btn.dataset.mode === "computer" ? "computer" : "local");
  });
});
restartBtn.addEventListener("click", resetGame);
modalRestartBtn.addEventListener("click", resetGame);
backBtn.addEventListener("click", goToMenu);
modalMenuBtn.addEventListener("click", goToMenu);

/* keyboard controls */
boardContainer.addEventListener("keydown", function (e) {
  if (appPage.classList.contains("hidden") || endModalVisible()) return;
  var handled = true;
  switch (e.key) {
    case "ArrowLeft": kbCol = Math.max(0, kbCol - 1); syncKbCursor(); break;
    case "ArrowRight": kbCol = Math.min(8, kbCol + 1); syncKbCursor(); break;
    case "ArrowUp": kbRow = Math.max(0, kbRow - 1); syncKbCursor(); break;
    case "ArrowDown": kbRow = Math.min(8, kbRow + 1); syncKbCursor(); break;
    case "Enter":
    case " ": {
      if (isThinking()) { handled = true; break; }
      var pos = kbToCell();
      handleMove(pos.b, pos.c);
      break;
    }
    default: handled = false;
  }
  if (handled) e.preventDefault();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && endModalVisible()) hideEndModal();
});

/* keep the cursor visible once the board exists */
initBoard(handleMove);
renderState(state);
syncKbCursor();
updateScoreBoard(scores);

})();
