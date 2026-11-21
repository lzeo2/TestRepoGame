import assert from 'node:assert/strict';
import { Chess } from '../Games/Chess Workshop/vendor/chess.js';
import { createPuzzles, puzzleHint, puzzleReply } from '../Games/Chess Workshop/puzzles.js';

const themes = new Set();
const colors = new Set();
const depths = new Set();
let branched = false;
let alternatePromotion = false;
let puzzlesChecked = 0;

function uci(move) {
  return move.from + move.to + (move.promotion || '');
}

function apply(chess, move) {
  return chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
}

for (const seed of [7, 12345, 0xffffffff]) {
  const source = createPuzzles({ seed });
  const replay = createPuzzles({ seed });
  const seen = new Set();
  for (let i = 0; i < 96; i++) {
    const level = ['mixed', 'mate1', 'mate2'][i % 3];
    const puzzle = source.next(level);
    assert.deepEqual(puzzle, replay.next(level), 'specified seed repeats the same session');
    assert(!seen.has(puzzle.fen), 'no repeated position within the recent session window');
    seen.add(puzzle.fen);
    themes.add(puzzle.title);
    colors.add(puzzle.side);
    depths.add(puzzle.moves);
    puzzlesChecked++;
    if (level !== 'mixed') assert.equal(puzzle.moves, Number(level.at(-1)));
    const chess = new Chess(puzzle.fen);
    assert.equal(chess.turn(), puzzle.side);
    assert.equal(chess.isGameOver(), false);
    assert.equal(puzzle.plies, puzzle.solution.length);
    const start = chess.fen();
    const good = puzzleHint(puzzle, chess);
    assert.equal(good, puzzle.solution[0]);
    assert.deepEqual(puzzleReply(puzzle, chess, 'a0h9'), { correct: false, solved: false, reply: null });
    const response = puzzleReply(puzzle, chess, good);
    assert.equal(chess.fen(), start, 'hint and submission leave the caller board intact');
    assert.equal(response.correct, true);
    if (puzzle.moves === 1) {
      assert.equal(response.solved, true);
      for (const move of chess.moves({ verbose: true })) {
        const result = puzzleReply(puzzle, chess, uci(move));
        assert.equal(result.correct, move.san.endsWith('#'));
        if (move.promotion && result.correct && uci(move) !== good) alternatePromotion = true;
      }
      apply(chess, good);
    } else {
      assert.equal(response.solved, false);
      assert.equal(response.reply, puzzle.solution[1]);
      assert(!chess.moves().some(san => san.endsWith('#')), 'mate-in-two has no shorter answer');
      apply(chess, good);
      const replies = chess.moves({ verbose: true });
      if (replies.length > 1) branched = true;
      assert(replies.some(move => uci(move) === response.reply));
      for (const defence of replies) {
        const reply = uci(defence);
        apply(chess, reply);
        const terminal = puzzleHint(puzzle, chess);
        assert(terminal, 'every legal defence still allows mate');
        assert.equal(puzzleReply(puzzle, chess, terminal).solved, true);
        if (reply === response.reply) assert.equal(terminal, puzzle.solution.at(-1));
        chess.undo();
      }
      apply(chess, response.reply);
      apply(chess, puzzleHint(puzzle, chess));
    }
    assert.equal(chess.isCheckmate(), true, 'certified solution reaches real checkmate');
    assert.equal(puzzleHint(puzzle, chess), null);
  }
}
assert.equal(themes.size, 7);
assert.deepEqual(colors, new Set(['w', 'b']));
assert.deepEqual(depths, new Set([1, 2]));
assert(branched, 'at least one position exercised several legal defences');
assert(alternatePromotion, 'multiple legal mating promotions were accepted');
console.log(`PASS ${puzzlesChecked} seeded offline puzzles, seven tactical themes, both colors, all legal defences and alternate mating promotions`);
