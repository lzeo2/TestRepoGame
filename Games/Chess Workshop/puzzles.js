import { Chess } from './vendor/chess.js';

const FILES = 'abcdefgh';
const QUIET_SQUARES = ['a3', 'a4', 'a5', 'b3', 'b4', 'b5', 'c2', 'c3', 'c5', 'd3', 'd4', 'e2', 'e3'];
const RECENT_LIMIT = 96;
const ATTEMPTS = 16;

// Each recipe describes an original tactical idea. Its piece squares and
// supporting pawns vary, and every position is checked before it can appear.
const RECIPES = [
  {
    title: 'Back-rank finish',
    moves: 1,
    layout: pick => ({ a1: 'K', [pick(['d1', 'd2', 'e1', 'e3', 'c2'])]: 'R', g8: 'k', f7: 'p', g7: 'p', h7: 'p' }),
  },
  {
    title: 'Queen and king',
    moves: 1,
    layout: pick => ({ f6: 'K', [pick(['f7', 'e7', 'd7', 'c7', 'g3', 'g4'])]: 'Q', h8: 'k' }),
  },
  {
    title: 'Smothered finish',
    moves: 1,
    layout: pick => ({ a1: 'K', [pick(['g5', 'e5', 'h6', 'd6', 'd8'])]: 'N', h8: 'k', g8: 'r', h7: 'p', g7: 'p' }),
  },
  {
    title: 'Bishop diagonal',
    moves: 1,
    layout: pick => ({ a1: 'K', [pick(['d6', 'b8', 'c7', 'f4', 'g3', 'h2'])]: 'B', h8: 'k', g8: 'b', h7: 'p' }),
  },
  {
    title: 'Promotion finish',
    moves: 1,
    layout: pick => ({ a1: 'K', [pick(['f7', 'e7', 'd7', 'c7', 'b7'])]: 'P', h8: 'k', g7: 'p', h7: 'p' }),
  },
  {
    title: 'Queen sacrifice',
    moves: 2,
    layout: pick => ({ a1: 'K', [pick(['c4', 'b3', 'd5', 'e6', 'a2', 'f7'])]: 'Q', h6: 'N', h8: 'k', f8: 'r', h7: 'p', g7: 'p' }),
    opener: layout => Object.keys(layout).find(square => layout[square] === 'Q') + 'g8',
  },
  {
    title: 'Rook ladder',
    moves: 2,
    layout: pick => {
      const front = pick(['a6', 'b6', 'c6', 'd6', 'e6']);
      const rear = pick(['b1', 'b2', 'd1', 'e1', 'f1'].filter(square => square[0] !== front[0]));
      return { c2: 'K', [front]: 'R', [rear]: 'R', h8: 'k' };
    },
    opener: layout => {
      const [file] = Object.keys(layout).find(square => layout[square] === 'R' && square[1] === '6');
      return file + '6' + file + '7';
    },
  },
];

const queues = {
  mixed: RECIPES,
  mate1: RECIPES.filter(recipe => recipe.moves === 1),
  mate2: RECIPES.filter(recipe => recipe.moves === 2),
};

function uci(move) {
  return move.from + move.to + (move.promotion || '');
}

function mateMoves(chess) {
  return chess.moves({ verbose: true }).filter(move => move.san.endsWith('#'));
}

function forcedLine(chess, move) {
  chess.move(move);
  let hardest = null;
  for (const reply of chess.moves({ verbose: true })) {
    chess.move(reply);
    const mates = mateMoves(chess);
    chess.undo();
    if (!mates.length) {
      chess.undo();
      return null;
    }
    if (!hardest || mates.length < hardest.choices) {
      hardest = { reply: uci(reply), mate: uci(mates[0]), choices: mates.length };
    }
  }
  chess.undo();
  return hardest && [uci(move), hardest.reply, hardest.mate];
}

function squareFor(square, side, mirror) {
  const file = mirror ? FILES[7 - FILES.indexOf(square[0])] : square[0];
  const rank = side === 'b' ? 9 - Number(square[1]) : square[1];
  return file + rank;
}

function position(layout, side, mirror) {
  const pieces = new Map();
  for (const [square, piece] of Object.entries(layout)) {
    const value = side === 'w' ? piece : piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase();
    pieces.set(squareFor(square, side, mirror), value);
  }
  const ranks = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const file of FILES) {
      const piece = pieces.get(file + rank);
      if (piece) {
        row += (empty || '') + piece;
        empty = 0;
      } else {
        empty++;
      }
    }
    ranks.push(row + (empty || ''));
  }
  return ranks.join('/') + ' ' + side + ' - - 0 1';
}

function certify(recipe, layout, side, mirror, opener) {
  const fen = position(layout, side, mirror);
  const chess = new Chess(fen);
  const enemyKing = squareFor(Object.keys(layout).find(square => layout[square] === 'k'), side, mirror);
  if (chess.isCheck() || chess.isAttacked(enemyKing, side)) return null;

  const legal = chess.moves({ verbose: true });
  const mates = legal.filter(move => move.san.endsWith('#'));
  let solution;
  if (recipe.moves === 1) {
    if (!mates.length) return null;
    solution = [uci(mates[0])];
  } else {
    if (mates.length) return null;
    const first = squareFor(opener.slice(0, 2), side, mirror) + squareFor(opener.slice(2, 4), side, mirror);
    const move = legal.find(candidate => uci(candidate) === first);
    solution = move && forcedLine(chess, move);
    if (!solution) return null;
  }
  return {
    fen, title: recipe.title, side, moves: recipe.moves, plies: solution.length, solution,
    description: `${side === 'w' ? 'White' : 'Black'} to move and mate in ${recipe.moves === 1 ? 'one' : 'two'}.`,
  };
}

export function createPuzzles({ seed = Math.floor(Math.random() * 2 ** 32) } = {}) {
  // Mulberry32 permits a reproducible session without dependence on network or time.
  let state = seed >>> 0;
  function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  }
  const pick = options => options[Math.floor(random() * options.length)];
  const seen = new Set();
  let previousTitle = '';
  function remember(puzzle) {
    if (seen.size === RECENT_LIMIT) seen.delete(seen.values().next().value);
    seen.add(puzzle.fen);
    previousTitle = puzzle.title;
    return puzzle;
  }
  function next(difficulty = 'mixed') {
    const options = Object.hasOwn(queues, difficulty) ? queues[difficulty] : queues.mixed;
    const recipe = pick(options.filter(option => option.title !== previousTitle));
    const side = pick(['w', 'b']);
    const mirror = random() < 0.5;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const layout = recipe.layout(pick);
      const opener = recipe.opener?.(layout);
      let choices = QUIET_SQUARES.filter(square => !layout[square]);
      const pawns = 1 + Math.floor(random() * 4);
      for (let i = 0; i < pawns; i++) {
        const square = pick(choices);
        layout[square] = pick(['P', 'p']);
        choices = choices.filter(choice => choice[0] !== square[0]);
      }
      const puzzle = certify(recipe, layout, side, mirror, opener);
      if (puzzle && !seen.has(puzzle.fen)) return remember(puzzle);
    }
    const layout = recipe.layout(options => options[0]);
    return remember(certify(recipe, layout, side, mirror, recipe.opener?.(layout)));
  }
  return { next };
}

function stage(puzzle, chess) {
  if (chess.turn() !== puzzle.side) return 0;
  if (chess.fen() === puzzle.fen) return 1;
  return puzzle.moves === 2 && chess.moveNumber() === 2 ? 2 : 0;
}

export function puzzleHint(puzzle, chess) {
  const step = stage(puzzle, chess);
  if (step === 1) return puzzle.solution[0];
  const mate = step === 2 && mateMoves(chess)[0];
  return mate ? uci(mate) : null;
}

// Probe the move before the caller applies it. The selected defence leaves the
// fewest winning continuations among all legal replies, including captures.
export function puzzleReply(puzzle, chess, candidate) {
  const incorrect = { correct: false, solved: false, reply: null };
  const step = stage(puzzle, chess);
  if (!step) return incorrect;
  const position = new Chess(chess.fen());
  const move = position.moves({ verbose: true }).find(legal => uci(legal) === candidate);
  if (!move) return incorrect;
  if (puzzle.moves === 1 || step === 2) {
    return move.san.endsWith('#') ? { correct: true, solved: true, reply: null } : incorrect;
  }
  const line = forcedLine(position, move);
  return line ? { correct: true, solved: false, reply: line[1] } : incorrect;
}
