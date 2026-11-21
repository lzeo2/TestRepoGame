import assert from 'node:assert/strict';
import { Chess } from '../Games/Chess Workshop/vendor/chess.js';
import { BONUS_PASS, BONUS_VARIANT, canTakeBonus, passForBonus, WorkshopChess } from '../Games/Chess Workshop/turns.js';

function canonicalHash(board) {
  return new Chess(board.fen({ forceEnpassantSquare: true })).hash();
}

for (const [color, moves] of [
  ['w', ['e4', 'd4', 'Nf3', 'Nc3']],
  ['b', ['e5', 'd5', 'Nf6', 'Nc6']],
]) {
  for (const slots of [1, 2, 3, 4]) {
    const game = new WorkshopChess();
    if (color === 'b') game.move('e4');
    for (const [index, san] of moves.slice(0, slots).entries()) {
      assert.equal(game.move(san).color, color);
      if (index + 1 < slots) {
        const pass = passForBonus(game);
        assert.equal(pass.san, BONUS_PASS);
        assert.notEqual(pass.color, color);
        assert.equal(game.turn(), color);
      }
      assert.equal(game.hash(), canonicalHash(game));
    }
    assert.notEqual(game.turn(), color);
    assert.equal(game.history().filter(san => san === BONUS_PASS).length, slots - 1);
  }
}

const checked = new WorkshopChess('4k3/8/8/8/8/8/3R4/4K3 w - - 0 1');
assert.equal(checked.move('Re2').san, 'Re2+');
assert.equal(checked.isCheckmate(), false);
assert.equal(canTakeBonus(checked), false);
const beforeCheck = checked.fen();
assert.equal(passForBonus(checked), null);
assert.throws(() => checked.move(null), /Cannot skip/);
assert.throws(() => checked.move('--!'), /Cannot skip/);
assert.equal(checked.fen(), beforeCheck);
assert.equal(checked.moves().length > 0, true);

const mate = new WorkshopChess();
for (const san of ['f3', 'e5', 'g4', 'Qh4']) mate.move(san);
assert.equal(mate.isCheckmate(), true);
assert.equal(passForBonus(mate), null);

const stale = new WorkshopChess('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1');
stale.move('Qg6');
assert.equal(stale.isStalemate(), true);
assert.equal(passForBonus(stale), null);
assert.equal(passForBonus(new WorkshopChess('4k3/8/8/8/8/8/8/4K3 w - - 0 1')), null);

const quiet = new WorkshopChess('4k3/8/8/8/8/8/3R4/4K3 w - - 99 40');
assert.equal(passForBonus(quiet).san, BONUS_PASS);
assert.equal(quiet.fen().split(' ').slice(1).join(' '), 'b - - 99 40');
assert.equal(quiet.isDrawByFiftyMoves(), false);
quiet.move('Kf8');
assert.equal(quiet.isDrawByFiftyMoves(), true);
assert.equal(passForBonus(quiet), null);

const epFen = '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 22';
const ep = new WorkshopChess(epFen);
const epHash = ep.hash();
assert.equal(ep.moves().includes('dxe3'), true);
const epPass = passForBonus(ep);
assert.equal(epPass.before, epFen);
assert.equal(epPass.after, '4k3/8/8/8/3pP3/8/8/4K3 w - - 0 23');
assert.equal(ep.hash(), canonicalHash(ep));
assert.notEqual(ep.hash(), epHash);
assert.equal(ep.undo().san, BONUS_PASS);
assert.equal(ep.fen(), epFen);
assert.equal(ep.hash(), epHash);
assert.equal(ep.history().length, 0);

const repeat = new WorkshopChess();
repeat.setHeader('Variant', BONUS_VARIANT);
const initialHash = repeat.hash();
const states = [];
for (let cycle = 0; cycle < 2; cycle++) {
  for (const san of ['Nf3', null, 'Ng1', null]) {
    const move = repeat.move(san);
    states.push(move.after);
    assert.equal(repeat.hash(), canonicalHash(repeat));
    if (states.length < 8) assert.equal(repeat.isThreefoldRepetition(), false);
  }
  assert.equal(repeat.hash(), initialHash);
}
assert.equal(repeat.isThreefoldRepetition(), true);
assert.equal(passForBonus(repeat), null);
assert.throws(() => repeat.move('--'), /Cannot skip/);

const pgn = repeat.pgn();
const restored = new WorkshopChess();
restored.loadPgn(pgn);
assert.equal(restored.getHeaders().Variant, BONUS_VARIANT);
assert.deepEqual(restored.history({ verbose: true }).map(move => move.after), states);
assert.equal(restored.hash(), repeat.hash());
assert.equal(restored.isThreefoldRepetition(), true);
assert.equal(restored.pgn(), pgn);
restored.undo();
assert.equal(restored.isThreefoldRepetition(), false);
assert.equal(restored.hash(), canonicalHash(restored));

const game = new WorkshopChess();
game.setHeader('Variant', BONUS_VARIANT);
game.setHeader('Black', 'Stockfish -- Double');
game.move('e4');
game.setComment('This -- is a PGN comment.');
game.move('e5');
game.move(null);
game.move('Nc6');
const replay = new WorkshopChess();
replay.loadPgn(game.pgn().replace('2. --', '2.--'));
assert.deepEqual(replay.history(), ['e4', 'e5', BONUS_PASS, 'Nc6']);
assert.equal(replay.getHeaders().Black, 'Stockfish -- Double');
replay.undo();
replay.undo();
replay.undo();
assert.equal(replay.getComment(), 'This -- is a PGN comment.');
assert.throws(() => new WorkshopChess().loadPgn('1. e4 e5 2. -- Nc6 *'), /require the Workshop Bonus Turns/);
assert.throws(() => new WorkshopChess().loadPgn(`[Variant "${BONUS_VARIANT}"]\n\n1. f3 e5 2. g4 Qh4# 3. -- *`), /cannot skip a checked or finished/);

const standardPgn = '[White "Stock -- Test"]\n\n1. e4 {a -- comment} e5 2. Nf3 Nc6 *';
const ordinary = new Chess();
ordinary.loadPgn(standardPgn);
const standard = new WorkshopChess();
standard.loadPgn(standardPgn);
assert.equal(standard.pgn(), ordinary.pgn());
assert.deepEqual(standard.history({ verbose: true }), ordinary.history({ verbose: true }));

console.log('PASS bonus turns for both colors at 1–4 moves, check/mate/draw guards, en passant and clocks, canonical repetition, undo, and PGN roundtrip');
