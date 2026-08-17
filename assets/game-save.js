/**
 * UNBLOCKMATH // ARCADE -- shared game save utility.
 * Uses localStorage to persist game state (score, level, progress, settings).
 * Each game calls: GameSave.load(gameId) / GameSave.save(gameId, data) / GameSave.clear(gameId)
 * Include via: <script src="../../assets/game-save.js"></script>
 */
var GameSave = (function () {
  'use strict';
  var PREFIX = 'unblockmath_save_';

  function key(id) {
    return PREFIX + id;
  }

  /**
   * Load saved state for a game. Returns parsed object or null.
   * @param {string} gameId - unique game identifier (e.g., "tetris", "minesweeper")
   */
  function load(gameId) {
    try {
      var raw = localStorage.getItem(key(gameId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save state for a game.
   * @param {string} gameId
   * @param {object} data - serializable object (score, level, progress, settings, etc.)
   */
  function save(gameId, data) {
    try {
      data._ts = Date.now();
      localStorage.setItem(key(gameId), JSON.stringify(data));
    } catch (e) {
      // storage full or disabled -- silently ignore
    }
  }

  /**
   * Clear saved state for a game.
   */
  function clear(gameId) {
    try {
      localStorage.removeItem(key(gameId));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Get all saved games (for a stats/overview if needed).
   */
  function listAll() {
    var result = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) {
          var id = k.substring(PREFIX.length);
          result[id] = JSON.parse(localStorage.getItem(k));
        }
      }
    } catch (e) {
      // ignore
    }
    return result;
  }

  return { load: load, save: save, clear: clear, listAll: listAll };
})();
