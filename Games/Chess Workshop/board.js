import { Chessground } from './vendor/chessground/chessground.min.js';
import { SQUARES } from './vendor/chess.js';

const FILES = 'abcdefgh';
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const COLORS = { w: 'white', b: 'black' };
const ARROWS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };

export const uciMove = uci => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

function squareAt(index, side) {
  const file = index % 8, rank = Math.floor(index / 8);
  return side === 'w' ? FILES[file] + (8 - rank) : FILES[7 - file] + (rank + 1);
}

const SAN_TARGET = /(?:([a-h][1-8])(?:=([QRBN]))?|^(O-O(?:-O)?))[+#]?$/;

export function legalMoveChoices(game) {
  const color = game.turn();
  const moves = [];
  // Each origin is known, so the public SAN list only needs to supply destinations.
  // Verbose moves also build before/after FEN and repeat legality work for every choice.
  for (const from of SQUARES) {
    if (game.get(from)?.color !== color) continue;
    for (const notation of game.moves({ square: from })) {
      const target = SAN_TARGET.exec(notation);
      if (!target) return game.moves({ verbose: true });
      const [, square, promoted, castle] = target;
      const to = castle ? (castle === 'O-O' ? 'g' : 'c') + from[1] : square;
      const promotion = promoted?.toLowerCase();
      moves.push({ from, to, promotion, lan: from + to + (promotion ?? '') });
    }
  }
  return moves;
}

function legalMoves(game) {
  const destinations = new Map(), choices = new Map();
  for (const move of legalMoveChoices(game)) {
    const id = move.from + move.to;
    if (choices.has(id)) choices.get(id).push(move);
    else {
      choices.set(id, [move]);
      if (!destinations.has(move.from)) destinations.set(move.from, []);
      destinations.get(move.from).push(move.to);
    }
  }
  return { destinations, choices };
}

const pair = move => move ? move.from + move.to : '';

export function createBoard(element, onMove) {
  let frame, revision = 0, legal, focusedIndex = 56, pressed = null;
  const labels = [];
  const overlay = document.createElement('div');
  overlay.className = 'board-keys';
  const cells = Array.from({ length: 64 }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'board-key';
    button.tabIndex = index === focusedIndex ? 0 : -1;
    button.setAttribute('aria-pressed', 'false');
    overlay.append(button);
    button.addEventListener('focus', () => {
      cells[focusedIndex].tabIndex = -1;
      focusedIndex = index;
      button.tabIndex = 0;
    });
    button.addEventListener('click', () => {
      if (!frame?.interactive) return;
      const square = button.dataset.square;
      ground.selectSquare(ground.state.selected === square ? null : square);
      syncSelection();
    });
    return button;
  });

  function syncSelection() {
    const square = ground.state.selected;
    if (pressed?.dataset.square === square) return;
    pressed?.setAttribute('aria-pressed', 'false');
    pressed = square ? cells.find(cell => cell.dataset.square === square) : null;
    pressed?.setAttribute('aria-pressed', 'true');
  }

  const ground = Chessground(element, {
    coordinates: true,
    animation: { enabled: false, duration: 160 },
    drawable: { enabled: false },
    premovable: { enabled: false },
    movable: { free: false, color: undefined, rookCastle: false },
    events: {
      select: syncSelection,
      insert(elements) {
        elements.board.setAttribute('aria-hidden', 'true');
        for (const child of elements.container.querySelectorAll('coords, svg')) child.setAttribute('aria-hidden', 'true');
        elements.container.append(overlay);
      },
    },
  });

  overlay.addEventListener('keydown', event => {
    const delta = ARROWS[event.key];
    if (!delta) return;
    event.preventDefault();
    const column = focusedIndex % 8;
    if ((delta === -1 && column === 0) || (delta === 1 && column === 7)) return;
    cells[focusedIndex + delta]?.focus({ preventScroll: true });
  });
  element.addEventListener('touchcancel', () => {
    ground.cancelMove();
    syncSelection();
  });
  for (const event of ['mouseup', 'touchend']) document.addEventListener(event, syncSelection);

  function moveConfig(inputRevision) {
    return {
      color: frame.interactive ? COLORS[frame.game.turn()] : undefined,
      dests: frame.interactive ? legal.destinations : undefined,
      showDests: frame.legalHints,
      events: {
        // Chessground schedules callbacks. Ignore a move superseded by a new position.
        after: (from, to) => {
          if (inputRevision === revision) submit(from, to);
        },
      },
    };
  }

  function restorePosition() {
    ground.cancelMove();
    ground.state.animation.current = undefined;
    // Cancel speculative animation when a puzzle rejects a move or a choice is pending.
    ground.set({
      fen: frame.fen,
      turnColor: COLORS[frame.game.turn()],
      lastMove: frame.last,
      check: frame.game.isCheck(),
      movable: moveConfig(revision),
      animation: { enabled: false },
    });
    if (frame.animation) ground.set({ animation: { enabled: true } });
    syncSelection();
  }

  function submit(from, to) {
    const choices = legal?.choices.get(from + to);
    if (!frame.interactive || !choices?.length) {
      restorePosition();
      return;
    }
    const submitted = revision;
    if (choices.length > 1) restorePosition();
    try {
      onMove(choices);
    } finally {
      // Accepted moves render the new position synchronously. Otherwise restore the old one.
      if (choices.length === 1 && revision === submitted) restorePosition();
    }
  }

  function updateLabels() {
    for (const [index, button] of cells.entries()) {
      const square = squareAt(index, frame.side), piece = frame.game.get(square);
      const name = piece ? `${square} ${piece.color === 'w' ? 'White' : 'Black'} ${NAMES[piece.type]}` : square;
      if (button.dataset.square !== square) button.dataset.square = square;
      if (labels[index] !== name) {
        button.setAttribute('aria-label', name);
        labels[index] = name;
      }
    }
  }

  return {
    show(next) {
      const fen = next.game.fen();
      const { coordinates = true, animation = true, legalHints = true } = next;
      const positionChanged = fen !== frame?.fen || next.game !== frame.game;
      const interactiveChanged = next.interactive !== frame?.interactive;
      const inputChanged = positionChanged || interactiveChanged;
      const sideChanged = next.side !== frame?.side;
      const prefsChanged = animation !== frame?.animation || legalHints !== frame.legalHints;
      const moveChanged = pair(next.last) !== frame?.lastKey;
      const hintChanged = pair(next.hint) !== frame?.hintKey;
      if (element.dataset.coordinates !== String(coordinates)) element.dataset.coordinates = String(coordinates);
      if (!inputChanged && !sideChanged && !prefsChanged && !moveChanged && !hintChanged) return;

      frame = {
        game: next.game, fen, side: next.side, interactive: next.interactive, legalHints, animation,
        last: next.last ? [next.last.from, next.last.to] : undefined,
        lastKey: pair(next.last), hintKey: pair(next.hint),
      };
      if (inputChanged) {
        revision++;
        legal = frame.interactive ? legalMoves(frame.game) : undefined;
        ground.cancelMove();
      }
      if (interactiveChanged) {
        element.dataset.interactive = String(frame.interactive);
        for (const button of cells) button.setAttribute('aria-disabled', String(!frame.interactive));
      }
      if (positionChanged || sideChanged) updateLabels();

      const focused = sideChanged && overlay.contains(document.activeElement);
      const config = {};
      if (sideChanged) config.orientation = COLORS[frame.side];
      if (inputChanged) {
        config.fen = fen;
        config.turnColor = COLORS[frame.game.turn()];
        config.check = frame.game.isCheck();
      }
      if (inputChanged || prefsChanged) config.movable = moveConfig(revision);
      if (inputChanged || moveChanged) config.lastMove = frame.last;
      if (hintChanged) {
        config.drawable = {
          autoShapes: frame.hintKey ? [{ orig: next.hint.from, dest: next.hint.to, brush: 'green' }] : [],
        };
      }
      config.animation = { enabled: animation && !sideChanged };
      if (!animation) ground.state.animation.current = undefined;
      ground.set(config);
      if (sideChanged && animation) ground.set({ animation: { enabled: true } });
      syncSelection();
      if (focused) cells[focusedIndex].focus({ preventScroll: true });
    },
  };
}
