import assert from 'node:assert/strict';
import { analyzeReview, parseReview } from '../Games/Chess Workshop/review.js';
import { Chess } from '../Games/Chess Workshop/vendor/chess.js';

const cp = value => ({ type: 'cp', value });
const mate = value => ({ type: 'mate', value });
const analysisLine = (score, ...pv) => ({ score, move: pv[0], pv });
const game = parseReview('[White "Ada"]\n[Black "Rook"]\n\n1. e4 {A comment} (1. d4) e5 2. Nf3 Nc6 *');
assert.equal(game.white, 'Ada');
assert.equal(game.black, 'Rook');
assert.equal(game.result, '*');
assert.deepEqual(game.moves.map(move => [move.uci, move.san, move.color, move.number]), [
  ['e2e4', 'e4', 'w', 1], ['e7e5', 'e5', 'b', 1], ['g1f3', 'Nf3', 'w', 2], ['b8c6', 'Nc6', 'b', 2],
]);
assert.throws(() => parseReview(''), /at least one move/);
assert.throws(() => parseReview('1. e5'), /one legal chess game/);
assert.throws(() => parseReview('1. e4 1-0\n\n1. d4 1-0'), /one legal chess game/);
assert.throws(() => parseReview('[SetUp "1"]\n[FEN "8/8/8/8/8/8/4k3/4K3 w - - 0 1"]\n\n1. Kxe2 *'), /starting position is invalid/);
assert.throws(() => parseReview('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K3 w K - 0 1"]\n\n1. O-O *'), /starting position is invalid/);

const engine = [
  analysisLine(cp(24), 'd2d4', 'd7d5', 'e1e8'),
  analysisLine(cp(-12), 'c7c5'),
  analysisLine(cp(151), 'g1f3'),
  analysisLine(cp(-20), 'b8c6'),
  analysisLine(cp(10), 'f1b5'),
];
const signal = new AbortController().signal;
let requests = 0;
const updates = [];
const result = await analyzeReview(game, {
  search(fen, options) {
    assert.equal(fen, game.positions[requests]);
    assert.equal(options.signal, signal);
    assert(options.nodes > 0 && options.nodes < 100_000);
    assert.equal(options.elo, undefined);
    return engine[requests++];
  },
}, {
  signal,
  onUpdate({ analysis, positionIndex, moveIndex }) {
    updates.push([analysis.positions.length, analysis.moves.length, positionIndex, moveIndex, analysis.complete]);
  },
});
assert.deepEqual(result.positions.map(position => position.score.value), [24, 12, 151, 20, 10]);
assert.deepEqual(result.positions[0].line, ['d4', 'd5']);
assert.deepEqual(result.positions[0].pv, ['d2d4', 'd7d5']);
assert.deepEqual(result.moves.map(({ label, loss, bestSan }) => [label, loss, bestSan]), [
  ['Excellent', 12, 'd4'], ['Mistake', 139, 'c5'], ['Best', 0, 'Nf3'], ['Best', 0, 'Nc6'],
]);
assert.equal(requests, game.positions.length);
assert.deepEqual(updates, [[1, 0, 0, -1, false], [2, 1, 1, 0, false], [3, 2, 2, 1, false], [4, 3, 3, 2, false], [5, 4, 4, 3, true]]);

const foolsMate = parseReview('1. f3 e5 2. g4 Qh4# 0-1');
assert.equal(foolsMate.result, '0-1');
const mateEngine = [
  analysisLine(cp(26), 'e2e4'), analysisLine(cp(37), 'e7e5'),
  analysisLine(cp(-77), 'e2e4'), analysisLine(mate(1), 'd8h4'),
];
requests = 0;
const mating = await analyzeReview(foolsMate, { search: () => mateEngine[requests++] });
assert.equal(requests, 4, 'checkmate does not run an unnecessary search');
assert.deepEqual(mating.positions.at(-1).score, mate(-1));
assert.equal(mating.positions.at(-1).terminal, 'checkmate');
assert.equal(mating.moves[2].label, 'Blunder');
assert.equal(mating.moves[2].note, 'Allows a forced mate.');
assert.equal(mating.moves[2].loss, null);
assert.equal(mating.moves[3].label, 'Best');

const endgame = parseReview('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 12"]\n\n12... a1=N 1/2-1/2');
assert.equal(endgame.moves[0].uci, 'a2a1n');
assert.equal(endgame.moves[0].promotion, 'n');
assert.equal(endgame.moves[0].number, 12);
const drawn = await analyzeReview(endgame, { search: () => analysisLine(cp(864), 'a2a1q') });
assert.deepEqual(drawn.positions[0].score, cp(-864));
assert.equal(drawn.positions[1].terminal, 'draw');
assert.equal(drawn.moves[0].label, 'Blunder');
assert.equal(drawn.moves[0].loss, 864);
assert.equal(drawn.moves[0].bestSan, 'a1=Q+');

const repetition = parseReview('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2');
requests = 0;
const repeated = await analyzeReview(repetition, {
  search(fen) {
    requests++;
    return analysisLine(cp(23), new Chess(fen).moves({ verbose: true })[0].lan);
  },
});
assert.equal(requests, 8, 'repetition uses the actual game history rather than just FEN');
assert.equal(repeated.positions.at(-1).terminal, 'draw');
assert.deepEqual(repeated.positions.at(-1).score, cp(0));

const controller = new AbortController();
requests = 0;
await assert.rejects(analyzeReview(game, { search: () => engine[requests++] }, {
  signal: controller.signal,
  onUpdate: () => controller.abort(),
}), { name: 'AbortError' });
assert.equal(requests, 1, 'cancellation keeps partial review and starts no further requests');
const interrupted = new AbortController();
await assert.rejects(analyzeReview(game, {
  async search() {
    interrupted.abort();
    return engine[0];
  },
}, {
  signal: interrupted.signal,
  onUpdate: () => assert.fail('an aborted engine result should never render'),
}), { name: 'AbortError' });
console.log('PASS chess review legal PGN, engine score perspective, move comparisons, PV, draws, mate, promotion, and cancellation');
