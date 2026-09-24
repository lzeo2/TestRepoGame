/*
 * Offline glue for SameGame: touch input and keyboard cursor.
 * The game itself is samegame1k by Gabor Bata (MIT), unmodified
 * except for a coordinate-scale fix for the responsive canvas.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('a');
  var ctx = canvas.getContext('2d');
  var TILE = 26;
  var BORDER = 4;
  var COLS = 20;
  var ROWS = 10;
  var STATUS_TOP = ROWS * TILE + BORDER * 2; // status bar starts here
  var cur = { r: 7, c: 7 };
  var snap = null;

  function takeSnapshot() {
    snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function drawCursor() {
    if (!snap) return;
    ctx.putImageData(snap, 0, 0);
    var x = cur.c * TILE + BORDER;
    var y = cur.r * TILE + BORDER;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
  }

  function toClient(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return {
      x: r.left + cx * r.width / canvas.width,
      y: r.top + cy * r.height / canvas.height
    };
  }

  var origDown = canvas.onmousedown;
  canvas.onmousedown = function (event) {
    origDown(event);
    takeSnapshot();
    drawCursor();
  };

  function fire(cx, cy) {
    var p = toClient(cx, cy);
    canvas.onmousedown({ clientX: p.x, clientY: p.y });
  }

  function clickCell() {
    fire(cur.c * TILE + BORDER + TILE / 2, cur.r * TILE + BORDER + TILE / 2);
  }

  function newGame() {
    fire(10, STATUS_TOP + 10); // the "[New]" area in the status bar
  }

  // touch input: map a single-finger tap to the game's mouse handler
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // no emulated mouse event, no double action
    var t = e.touches[0];
    canvas.onmousedown({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });

  // keyboard input: cursor with arrow keys, Enter/Space clears, N starts a new game
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowUp': cur.r = Math.max(0, cur.r - 1); break;
      case 'ArrowDown': cur.r = Math.min(ROWS - 1, cur.r + 1); break;
      case 'ArrowLeft': cur.c = Math.max(0, cur.c - 1); break;
      case 'ArrowRight': cur.c = Math.min(COLS - 1, cur.c + 1); break;
      case 'Enter':
      case ' ':
        if (e.target === document.body || e.target === canvas) {
          e.preventDefault();
          clickCell();
        }
        return;
      case 'n':
      case 'N':
        newGame();
        return;
      default:
        return;
    }
    e.preventDefault();
    drawCursor();
  });

  takeSnapshot();
  drawCursor();
})();
