function LocalStorageManager() {
  this.bestScoreKey = "bestScore";
  this.gameStateKey = "gameState";
  this.best = 0;
  this.blocked = false;
  this.token = null;
  this.memory = null;
  // No destructive support probe: the actual reads/writes are the boundary.
  try {
    this.storage = window.localStorage;
    this.bestToken = this.storage.getItem(this.bestScoreKey);
    if (this.bestToken !== null) {
      var best = Number(this.bestToken);
      if (!/^\d+$/.test(this.bestToken) || !Number.isSafeInteger(best)) {
        this.stop("Best score is invalid; stored bytes preserved.");
      } else this.best = best;
    }
  } catch (error) {
    this.stop("Storage unavailable.");
  }
}

LocalStorageManager.prototype.status = function (text) {
  document.getElementById("save-status").textContent = text;
};

LocalStorageManager.prototype.stop = function (reason) {
  this.blocked = true;
  this.status(reason + " Playing in memory, NOT persisted. New Game asks before replacing only gameState; bestScore is preserved.");
};

// Validate plain JSON before Grid/Tile constructors see it. 8192 bytes is well
// above a canonical 16-tile board, even with safe-integer values and score.
LocalStorageManager.prototype.valid = function (state) {
  function keys(value, names) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).sort().join(",") === names;
  }
  function powerOfTwo(value) {
    while (value > 1 && value % 2 === 0) value /= 2;
    return value === 1;
  }
  if (!keys(state, "grid,keepPlaying,over,score,won") ||
      !keys(state.grid, "cells,size") || state.grid.size !== 4 ||
      !Array.isArray(state.grid.cells) || state.grid.cells.length !== 4 ||
      !Number.isSafeInteger(state.score) || state.score < 0 ||
      typeof state.over !== "boolean" || typeof state.won !== "boolean" ||
      typeof state.keepPlaying !== "boolean" || (state.keepPlaying && !state.won)) return false;
  var count = 0, won = false, moves = false;
  for (var x = 0; x < 4; x++) {
    var column = state.grid.cells[x];
    if (!Array.isArray(column) || column.length !== 4) return false;
    for (var y = 0; y < 4; y++) {
      var tile = column[y];
      if (tile === null) { moves = true; continue; }
      if (!keys(tile, "position,value") || !keys(tile.position, "x,y") ||
          tile.position.x !== x || tile.position.y !== y ||
          !Number.isSafeInteger(tile.value) || tile.value < 2 ||
          tile.value > Math.pow(2, 52) || !powerOfTwo(tile.value)) return false;
      count++;
      if (tile.value >= 2048) won = true;
    }
  }
  for (var a = 0; a < 4; a++) {
    for (var b = 0; b < 4; b++) {
      var cell = state.grid.cells[a][b];
      if (!cell) continue;
      var right = a < 3 && state.grid.cells[a + 1][b];
      var down = b < 3 && state.grid.cells[a][b + 1];
      if ((right && right.value === cell.value) || (down && down.value === cell.value)) moves = true;
    }
  }
  return count >= 2 && state.won === won && state.over === !moves;
};

LocalStorageManager.prototype.getBestScore = function () { return this.best; };

LocalStorageManager.prototype.getGameState = function () {
  try {
    // Capture the exact bytes from the same read that is parsed, not a later read.
    this.token = this.storage.getItem(this.gameStateKey);
    if (this.token === null) return null;
    if (this.token.length > 8192) throw new Error("Oversize save");
    var state = JSON.parse(this.token);
    if (!this.valid(state)) throw new Error("Invalid save");
    this.memory = state;
    return state;
  } catch (error) {
    this.stop("Save unreadable or invalid; stored bytes preserved.");
    return null;
  }
};

LocalStorageManager.prototype.unchanged = function () {
  if (this.blocked) return false;
  try {
    if (this.storage.getItem(this.gameStateKey) !== this.token ||
        this.storage.getItem(this.bestScoreKey) !== this.bestToken) {
      this.stop("Save changed in another page; stored bytes preserved.");
      return false;
    }
    return true;
  } catch (error) {
    this.stop("Storage unavailable.");
    return false;
  }
};

LocalStorageManager.prototype.setBestScore = function (score) {
  this.best = Math.max(this.best, score);
  if (!this.unchanged()) return;
  try {
    this.storage.setItem(this.bestScoreKey, String(this.best));
    this.bestToken = String(this.best);
  } catch (error) { this.stop("Best score could not be saved."); }
};

LocalStorageManager.prototype.setGameState = function (state) {
  this.memory = state;
  if (!this.valid(state)) { this.stop("Board exceeds safe save limits."); return; }
  this.writeState(JSON.stringify(state));
};

LocalStorageManager.prototype.writeState = function (bytes) {
  if (!this.unchanged()) return;
  try {
    // ponytail: comparison is best-effort, NOT an atomic cross-tab transaction.
    if (bytes === null) this.storage.removeItem(this.gameStateKey);
    else this.storage.setItem(this.gameStateKey, bytes);
    this.token = bytes;
    this.status(bytes === null ? "Game ended. Best score retained." : "Saved on this browser.");
  } catch (error) { this.stop("Save failed (storage denied or full)."); }
};

LocalStorageManager.prototype.clearGameState = function () {
  this.memory = null;
  this.writeState(null);
};

LocalStorageManager.prototype.restart = function () {
  this.unchanged();
  var token;
  try { token = this.storage.getItem(this.gameStateKey); }
  catch (error) { this.stop("Storage unavailable."); }
  if (!window.confirm(this.blocked ?
      "Start over? Replace only the saved gameState slot, which may be corrupt or belong to another page. bestScore and other keys will not be changed. If storage is unavailable, play will not be saved." :
      "Start a new game? Replace the current board and keep your best score?")) return false;
  try {
    if (this.storage.getItem(this.gameStateKey) !== token) {
      this.stop("Save changed during confirmation; restart cancelled.");
      return false;
    }
    // Recovery never adopts an unknown best score or writes over its bytes.
    if (this.storage.getItem(this.bestScoreKey) === this.bestToken) {
      this.token = token;
      this.blocked = false;
      // An invalid best score remains protected, including after consent.
      if (this.bestToken !== null && (!/^\d+$/.test(this.bestToken) ||
          !Number.isSafeInteger(Number(this.bestToken)))) this.blocked = true;
    }
  } catch (error) { this.stop("Storage unavailable."); }
  this.clearGameState();
  return true;
};
