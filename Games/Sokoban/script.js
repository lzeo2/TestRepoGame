/*
 * Source: https://github.com/taniarascia/sokoban
 * License: MIT (see LICENSE.txt)
 * Commit: 23ee71c46566506d85445130c78dfae2b6347792
 * Modifications: level parsing from char maps, five hand-authored levels,
 * undo history, counters, generic win check, corner deadlock detection,
 * touch d-pad, resize-safe DPI-aware rendering, overlay state machine.
 * Cell vocabulary, paint rules and push rules kept from the original
 * constants.js / utils.js / Sokoban.js.
 */

(function () {
  'use strict';

  // Cell types (from upstream constants.js)
  var EMPTY = 'empty';
  var WALL = 'wall';
  var BLOCK = 'block';
  var SUCCESS_BLOCK = 'success_block';
  var VOID = 'void';
  var PLAYER = 'player';

  var directions = { up: 'up', down: 'down', left: 'left', right: 'right' };

  // Flat palette kept from upstream constants.js
  var colors = {
    empty: { fill: '#ded7b3', stroke: '#ded7b3' },
    wall: { fill: '#868687', stroke: '#505051' },
    block: { fill: '#d9ae0a', stroke: '#C79300' },
    success_block: { fill: '#4ccd5a', stroke: '#3ca448' },
    void: { fill: '#dfbbb1', stroke: '#ca8e7d' },
    player: { fill: '#4f99e8', stroke: '#3f7ab9' },
  };

  // Five hand-authored levels, each verified solvable with a BFS solver.
  // Legend: # wall, space floor, o target, $ crate, @ keeper.
  var LEVELS = [
    [
      '#######',
      '#     #',
      '#  o  #',
      '#  $  #',
      '#  @  #',
      '#######',
    ],
    [
      '#########',
      '#       #',
      '#  o o  #',
      '#  $ $  #',
      '#       #',
      '#   @   #',
      '#########',
    ],
    [
      '###########',
      '#    #    #',
      '# o  #  o #',
      '# $     $ #',
      '#         #',
      '#    @    #',
      '###########',
    ],
    [
      '##########',
      '#  #  #  #',
      '# o    o #',
      '#   ##   #',
      '# $ ## $ #',
      '#   $    #',
      '#  @  o  #',
      '##########',
    ],
    [
      '############',
      '#          #',
      '# o  o  o  #',
      '#    $     #',
      '# $  #  $  #',
      '#          #',
      '#  @       #',
      '############',
    ],
  ];

  function parseLevel(rows) {
    var base = [];
    var board = [];
    for (var y = 0; y < rows.length; y++) {
      var baseRow = [];
      var boardRow = [];
      for (var x = 0; x < rows[y].length; x++) {
        var ch = rows[y][x];
        if (ch === '#') {
          baseRow.push(WALL);
          boardRow.push(WALL);
        } else if (ch === 'o') {
          baseRow.push(VOID);
          boardRow.push(VOID);
        } else if (ch === '$') {
          baseRow.push(EMPTY);
          boardRow.push(BLOCK);
        } else if (ch === '*') {
          baseRow.push(VOID);
          boardRow.push(BLOCK);
        } else if (ch === '@') {
          baseRow.push(EMPTY);
          boardRow.push(PLAYER);
        } else if (ch === '+') {
          baseRow.push(VOID);
          boardRow.push(PLAYER);
        } else {
          baseRow.push(EMPTY);
          boardRow.push(EMPTY);
        }
      }
      base.push(baseRow);
      board.push(boardRow);
    }
    return { base: base, board: board };
  }

  // Predicates (from upstream utils.js)
  function isBlock(cell) { return cell === BLOCK || cell === SUCCESS_BLOCK; }
  function isTraversible(cell) { return cell === EMPTY || cell === VOID; }
  function isVoid(cell) { return cell === VOID || cell === SUCCESS_BLOCK; }

  function getX(x, direction, spaces) {
    if (direction === 'right') return x + spaces;
    if (direction === 'left') return x - spaces;
    return x;
  }

  function getY(y, direction, spaces) {
    if (direction === 'down') return y + spaces;
    if (direction === 'up') return y - spaces;
    return y;
  }

  function cloneBoard(board) {
    return board.map(function (row) { return row.slice(); });
  }

  var Game = {
    levelIndex: 0,
    base: null,
    board: null,
    rows: 0,
    cols: 0,
    moves: 0,
    pushes: 0,
    history: [],
    state: 'menu', // menu | playing | win | lose | complete
    totalMoves: 0,

    canvas: null,
    ctx: null,

    init: function () {
      this.canvas = document.getElementById('board');
      this.ctx = this.canvas.getContext('2d');
      this.bindUi();
      this.showOverlay('startScreen');
      window.addEventListener('resize', this.onResize.bind(this));
    },

    bindUi: function () {
      var self = this;
      document.getElementById('startBtn').addEventListener('click', function () {
        self.startRun();
      });
      document.getElementById('restartBtn').addEventListener('click', function () {
        self.restartLevel();
      });
      document.getElementById('undoBtn').addEventListener('click', function () {
        self.undo();
      });
      document.getElementById('menuBtn').addEventListener('click', function () {
        self.toMenu();
      });
      document.getElementById('nextBtn').addEventListener('click', function () {
        self.loadLevel(self.levelIndex + 1);
      });
      document.getElementById('winMenuBtn').addEventListener('click', function () {
        self.toMenu();
      });
      document.getElementById('loseUndoBtn').addEventListener('click', function () {
        self.hideOverlays();
        self.state = 'playing';
        self.undo();
      });
      document.getElementById('loseRestartBtn').addEventListener('click', function () {
        self.restartLevel();
      });
      document.getElementById('againBtn').addEventListener('click', function () {
        self.startRun();
      });
      document.getElementById('completeMenuBtn').addEventListener('click', function () {
        self.toMenu();
      });

      var dirButtons = document.querySelectorAll('.dpad button');
      dirButtons.forEach(function (btn) {
        btn.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          self.step(btn.getAttribute('data-dir'));
        });
      });

      document.addEventListener('keydown', function (ev) {
        if (self.state !== 'playing') return;
        var key = ev.key;
        var dir = null;
        if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = directions.up;
        else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = directions.down;
        else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = directions.left;
        else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = directions.right;
        if (dir) {
          ev.preventDefault();
          self.step(dir);
        } else if (key === 'u' || key === 'U' || key === 'z' || key === 'Z') {
          self.undo();
        } else if (key === 'r' || key === 'R') {
          self.restartLevel();
        }
      });
    },

    onResize: function () {
      if (this.board) this.render();
    },

    startRun: function () {
      this.totalMoves = 0;
      this.loadLevel(0);
    },

    toMenu: function () {
      this.state = 'menu';
      this.showOverlay('startScreen');
    },

    loadLevel: function (index) {
      this.levelIndex = index;
      var parsed = parseLevel(LEVELS[index]);
      this.base = parsed.base;
      this.board = parsed.board;
      this.rows = this.base.length;
      this.cols = this.base[0].length;
      this.moves = 0;
      this.pushes = 0;
      this.history = [];
      this.state = 'playing';
      this.hideOverlays();
      this.render();
      this.updateHud();
    },

    restartLevel: function () {
      this.loadLevel(this.levelIndex);
    },

    snapshot: function () {
      return {
        board: cloneBoard(this.board),
        moves: this.moves,
        pushes: this.pushes,
      };
    },

    undo: function () {
      if (this.state !== 'playing' && this.state !== 'lose') return;
      if (!this.history.length) return;
      var snap = this.history.pop();
      this.board = snap.board;
      this.moves = snap.moves;
      this.pushes = snap.pushes;
      this.state = 'playing';
      this.hideOverlays();
      this.render();
      this.updateHud();
    },

    findPlayerCoords: function () {
      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.cols; x++) {
          if (this.board[y][x] === PLAYER) return { x: x, y: y };
        }
      }
      return null;
    },

    // Movement rules kept from upstream Sokoban.js (move / movePlayer /
    // movePlayerAndBoxes), parameterised over this.board / this.base.
    step: function (direction) {
      if (this.state !== 'playing') return;
      var coords = this.findPlayerCoords();
      if (!coords) return;

      var adjacent = {
        up: this.board[coords.y - 1] && this.board[coords.y - 1][coords.x],
        down: this.board[coords.y + 1] && this.board[coords.y + 1][coords.x],
        left: this.board[coords.y][coords.x - 1],
        right: this.board[coords.y][coords.x + 1],
      };

      var before = this.snapshot();
      var target = adjacent[direction];
      var moved = false;

      if (isTraversible(target)) {
        moved = this.movePlayer(coords, direction);
      } else if (isBlock(target)) {
        moved = this.movePlayerAndBoxes(coords, direction);
      } else {
        return; // wall: no state change, do not count a move
      }
      if (!moved) return;

      this.history.push(before);
      this.moves++;
      this.totalMoves++;
      this.render();
      this.updateHud();

      if (this.checkWin()) {
        this.onWin();
      } else if (this.checkStuck()) {
        this.onLose();
      }
    },

    movePlayer: function (coords, direction) {
      this.board[coords.y][coords.x] =
        isVoid(this.base[coords.y][coords.x]) ? VOID : EMPTY;
      this.board[getY(coords.y, direction, 1)][getX(coords.x, direction, 1)] = PLAYER;
      return true;
    },

    movePlayerAndBoxes: function (coords, direction) {
      var newBoxY = getY(coords.y, direction, 2);
      var newBoxX = getX(coords.x, direction, 2);
      var cellAhead = this.board[newBoxY] && this.board[newBoxY][newBoxX];

      // Anything ahead that is neither open floor nor a box blocks the push
      // (wall or edge of the board).
      if (!isTraversible(cellAhead) && !isBlock(cellAhead)) return false;

      if (!isBlock(cellAhead)) {
        // Single box: it slides one cell forward.
        this.board[newBoxY][newBoxX] =
          isVoid(this.base[newBoxY][newBoxX]) ? SUCCESS_BLOCK : BLOCK;
        this.movePlayer(coords, direction);
        this.pushes++;
        return true;
      }

      // Chain: count consecutive boxes starting at the cell past the first
      // one (upstream pushes a whole row when the far side is clear).
      var run = 0;
      while (isBlock(this.board[getY(newBoxY, direction, run)] &&
                     this.board[getY(newBoxY, direction, run)][getX(newBoxX, direction, run)])) {
        run++;
      }

      // The landing cell is one step past the last box of the run.
      var landY = getY(newBoxY, direction, run);
      var landX = getX(newBoxX, direction, run);
      var land = this.board[landY] && this.board[landY][landX];
      if (!isTraversible(land)) return false;

      for (var i = 0; i <= run; i++) {
        var by = getY(newBoxY, direction, i);
        var bx = getX(newBoxX, direction, i);
        this.board[by][bx] = isVoid(this.base[by][bx]) ? SUCCESS_BLOCK : BLOCK;
      }
      this.movePlayer(coords, direction);
      this.pushes += run + 1;
      return true;
    },

    totalTargets: function () {
      var n = 0;
      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.cols; x++) {
          if (this.base[y][x] === VOID) n++;
        }
      }
      return n;
    },

    coveredTargets: function () {
      var n = 0;
      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.cols; x++) {
          if (this.base[y][x] === VOID && this.board[y][x] === SUCCESS_BLOCK) n++;
        }
      }
      return n;
    },

    checkWin: function () {
      return this.coveredTargets() === this.totalTargets();
    },

    // A crate parked on a non-target cell walled off on two perpendicular
    // sides can never move again: the level is unwinnable from here.
    checkStuck: function () {
      var self = this;
      function solid(x, y) {
        if (x < 0 || y < 0 || x >= self.cols || y >= self.rows) return true;
        return self.base[y][x] === WALL;
      }
      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.cols; x++) {
          if (this.board[y][x] !== BLOCK) continue;
          var corner =
            (solid(x - 1, y) && solid(x, y - 1)) ||
            (solid(x - 1, y) && solid(x, y + 1)) ||
            (solid(x + 1, y) && solid(x, y - 1)) ||
            (solid(x + 1, y) && solid(x, y + 1));
          if (corner) return true;
        }
      }
      return false;
    },

    onWin: function () {
      if (this.levelIndex === LEVELS.length - 1) {
        this.state = 'complete';
        document.getElementById('completeStats').textContent =
          'Every crate delivered in ' + this.totalMoves + ' moves across all five levels.';
        this.showOverlay('completeScreen');
      } else {
        this.state = 'win';
        document.getElementById('winStats').textContent =
          'Cleared in ' + this.moves + ' moves (' + this.pushes + ' pushes).';
        this.showOverlay('winScreen');
      }
    },

    onLose: function () {
      this.state = 'lose';
      this.showOverlay('loseScreen');
    },

    updateHud: function () {
      document.getElementById('levelLabel').textContent =
        'Level ' + (this.levelIndex + 1) + ' of ' + LEVELS.length;
      document.getElementById('movesLabel').textContent = 'Moves ' + this.moves;
      document.getElementById('pushesLabel').textContent = 'Pushes ' + this.pushes;
      document.getElementById('targetsLabel').textContent =
        'Targets ' + this.coveredTargets() + ' / ' + this.totalTargets();
    },

    showOverlay: function (id) {
      this.hideOverlays();
      document.getElementById(id).classList.remove('hidden');
    },

    hideOverlays: function () {
      ['startScreen', 'winScreen', 'loseScreen', 'completeScreen'].forEach(function (id) {
        document.getElementById(id).classList.add('hidden');
      });
    },

    // Cell size fits the container; backing store is scaled for the device
    // pixel ratio so the board stays crisp and resize-safe.
    render: function () {
      var wrap = this.canvas.parentElement;
      var available = Math.min(wrap.clientWidth, 720);
      var cell = Math.max(24, Math.min(72, Math.floor(available / this.cols)));
      var logicalW = cell * this.cols;
      var logicalH = cell * this.rows;
      var dpr = window.devicePixelRatio || 1;

      this.canvas.width = Math.round(logicalW * dpr);
      this.canvas.height = Math.round(logicalH * dpr);
      this.canvas.style.width = logicalW + 'px';
      this.canvas.style.height = logicalH + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.cols; x++) {
          this.paintCell(x, y, cell);
        }
      }
    },

    // Paint rules kept from upstream Sokoban.js paintCell.
    paintCell: function (x, y, cell) {
      var ctx = this.ctx;
      var type = this.board[y][x];
      var px = x * cell;
      var py = y * cell;

      if (type === VOID || type === PLAYER) {
        var radius = type === 'player' ? Math.round(cell * 0.27) : Math.round(cell * 0.13);
        ctx.beginPath();
        ctx.rect(px, py, cell, cell);
        ctx.fillStyle = colors.empty.fill;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px + cell / 2, py + cell / 2, radius, 0, 2 * Math.PI);
        ctx.lineWidth = Math.max(4, Math.round(cell * 0.13));
        ctx.strokeStyle = colors[type].stroke;
        ctx.fillStyle = colors[type].fill;
        ctx.fill();
        ctx.stroke();
      } else {
        var inset = Math.max(3, Math.round(cell * 0.07));
        var lineWidth = Math.max(3, Math.round(cell * 0.1));
        ctx.beginPath();
        ctx.rect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
        ctx.fillStyle = colors[type].fill;
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = colors[type].stroke;
        ctx.stroke();
      }
    },
  };

  Game.init();
})();
