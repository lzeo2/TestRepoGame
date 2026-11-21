import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Chess } from '../Games/Chess Workshop/vendor/chess.js';
import { legalMoveChoices } from '../Games/Chess Workshop/board.js';

const cases = [
  ['White castles both sides', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['e1g1', 'e1c1']],
  ['Black castles both sides', 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', ['e8g8', 'e8c8']],
  ['White takes en passant', 'k7/8/8/3pP3/8/8/8/7K w - d6 0 2', ['e5d6']],
  ['Black takes en passant', 'k7/8/8/8/3Pp3/8/8/7K b - d3 0 2', ['e4d3']],
  ['White promotes with capture', '1r5k/P7/8/8/8/8/8/7K w - - 0 1', ['a7b8q', 'a7b8r', 'a7b8b', 'a7b8n']],
  ['Black promotes with capture', '7k/8/8/8/8/8/p7/1R5K b - - 0 1', ['a2b1q', 'a2b1r', 'a2b1b', 'a2b1n']],
  ['En passant exposes the king', 'k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', ['e5e6'], ['e5d6']],
  ['Pinned rook stays on its file', 'k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1', ['e2e8'], ['e2d2']],
  ['Stalemate', 'k7/2Q5/2K5/8/8/8/8/8 b - - 0 1', []],
];

const descriptor = ({ from, to, promotion, lan }) => ({ from, to, promotion, lan });
const prior = game => game.moves({ verbose: true });
const sort = moves => moves.map(descriptor).sort((a, b) => a.lan.localeCompare(b.lan));

function compare(board, label) {
  const fen = board.fen();
  const history = board.history();
  const fast = legalMoveChoices(board);
  assert.deepEqual(sort(fast), sort(prior(board)), label);
  assert.equal(board.fen(), fen, label + ' preserves position');
  assert.deepEqual(board.history(), history, label + ' preserves history');
  return new Set(fast.map(move => move.lan));
}

const positions = [];
for (const [title, fen, expected, forbidden = []] of cases) {
  const board = new Chess(fen);
  positions.push(board);
  const moves = compare(board, title);
  for (const move of expected) assert(moves.has(move), title + ' requires ' + move);
  for (const move of forbidden) assert(!moves.has(move), title + ' forbids ' + move);
  if (!expected.length) assert.equal(moves.size, 0, title);
}

// Sample both turns through eight independent legal games.
let random = 456;
for (let run = 0; run < 8; run++) {
  const board = new Chess();
  for (let ply = 0; ply < 49 && !board.isGameOver(); ply++) {
    if (ply % 2 === run % 2) {
      compare(board, `Game ${run + 1}, ply ${ply + 1}`);
      positions.push(new Chess(board.fen()));
    }
    const moves = board.moves();
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    board.move(moves[random % moves.length]);
  }
}

const fallback = [{ from: 'a2', to: 'a3', lan: 'a2a3' }];
assert.equal(legalMoveChoices({
  turn: () => 'w',
  get: square => square === 'a2' ? { color: 'w' } : undefined,
  moves: options => options.verbose ? fallback : ['unexpected notation'],
}), fallback, 'An unfamiliar notation falls back to the public verbose interface');

console.log(`PASS ${positions.length} Chessground positions match the public verbose move API`);

if (process.argv.includes('--benchmark')) {
  const samples = [[], []], generators = [prior, legalMoveChoices];
  for (let run = 0; run < 10; run++) {
    for (const side of [run % 2, 1 - run % 2]) {
      const start = performance.now();
      let count = 0;
      for (const board of positions) count += generators[side](board).length;
      assert(count > positions.length);
      if (run >= 3) samples[side].push(performance.now() - start);
    }
  }
  const [before, after] = samples.map(runs => runs.sort((a, b) => a - b)[3]);
  console.log(`Median chooser build across ${positions.length} positions: ${before.toFixed(2)}ms → ${after.toFixed(2)}ms (${(before / after).toFixed(1)}×)`);
}
