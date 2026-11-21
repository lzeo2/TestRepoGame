import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Chess } from '../Games/Chess Workshop/vendor/chess.js';
import { createEngine, MIN_ELO, MAX_ELO } from '../Games/Chess Workshop/engine.js';

const bin = fileURLToPath(new URL(
  '../Games/Chess Workshop/vendor/stockfish-17.1-lite-single-03e3232.js',
  import.meta.url,
));
let starts = 0;
let lastCommand = '';
const commands = [];

function makeWorker() {
  starts += 1;
  const process = spawn(globalThis.process.execPath, [bin], { stdio: ['pipe', 'pipe', 'inherit'] });
  const output = createInterface({ input: process.stdout });
  return {
    addEventListener(type, listener) {
      if (type === 'message') output.on('line', data => listener({ data }));
      if (type === 'error') {
        process.on('error', listener);
        process.stdin.on('error', listener);
      }
    },
    postMessage(command) {
      commands.push(command);
      lastCommand = command;
      process.stdin.write(`${command}\n`);
    },
    terminate() {
      output.close();
      process.kill();
    },
  };
}

const engine = createEngine({ makeWorker });
const game = new Chess();
const fen = game.fen();
const legal = new Set(game.moves({ verbose: true }).map(move => move.lan));
try {
  assert.equal(starts, 0, 'Engine must not boot before a search.');
  await assert.rejects(engine.search(`${fen}\nquit`), /Invalid position/);
  await assert.rejects(engine.search('4k3/8/8/8/8/8/8/4K3 w KQ - 0 1'), /Invalid position/);
  await assert.rejects(engine.search('8/8/8/8/8/8/4k3/4K3 w - - 0 1'), /Invalid position/);
  await assert.rejects(engine.search('4k3/8/8/8/8/8/8/4K3 w - - 0 11111111111'), /Invalid position/);
  await assert.rejects(engine.search(fen, { searchMoves: ['e2e4\nquit'] }), /Invalid analysis moves/);
  await assert.rejects(engine.search(fen, { history: { moves: [] } }), /Game history does not match/);
  await assert.rejects(engine.search(fen, { history: { fen, moves: ['e2e4'] } }), /Game history does not match/);
  await assert.rejects(engine.search(fen, { history: { fen, moves: ['e2e5'] } }), /Game history does not match/);
  await assert.rejects(engine.search(fen, { history: { fen, moves: ['e2e4\nquit'] } }), /Game history does not match/);
  assert.equal(starts, 0, 'Invalid requests must not boot the worker.');

  const cancelBoot = new AbortController();
  const opening = engine.search(fen, { signal: cancelBoot.signal });
  const real = engine.search(fen, { nodes: 5_000, elo: MIN_ELO - 50 });
  const forced = engine.search(fen, { nodes: 5_000, searchMoves: ['e2e4'] });
  cancelBoot.abort();
  await assert.rejects(opening, { name: 'AbortError' });
  const [result, line] = await Promise.all([real, forced]);
  assert.equal(starts, 1, 'Consecutive requests share the worker, including cancellation during startup.');
  assert(legal.has(result.move), 'Stockfish returned a legal opening move.');
  assert.deepEqual(line.pv[0], 'e2e4');
  assert.equal(line.move, 'e2e4');
  assert.equal(line.score.type, 'cp');
  assert(Number.isFinite(line.score.value));
  assert(commands.includes(`setoption name UCI_Elo value ${MIN_ELO}`));
  assert(commands.includes('setoption name UCI_LimitStrength value false'));
  assert.equal(MAX_ELO, 3190);

  const firstOption = commands.length;
  for (const elo of [1800, 1800, 1800, 1800, 1750, undefined, undefined]) {
    await engine.search(fen, { nodes: 1_000, elo, searchMoves: ['e2e4'] });
  }
  assert.deepEqual(commands.slice(firstOption).filter(command => command.startsWith('setoption')), [
    'setoption name UCI_LimitStrength value true', 'setoption name UCI_Elo value 1800',
    'setoption name UCI_Elo value 1750', 'setoption name UCI_LimitStrength value false',
  ]);

  const cancelQueued = new AbortController();
  const keepSearch = engine.search(fen, { nodes: 20_000, searchMoves: ['d2d4'] });
  const cancelled = engine.search(fen, { searchMoves: ['g1f3'], signal: cancelQueued.signal });
  cancelQueued.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.equal((await keepSearch).move, 'd2d4');
  assert.equal(starts, 1);
  assert(!commands.some(command => command.includes('g1f3')));

  const cancelActive = new AbortController();
  const active = engine.search(fen, { nodes: 400_000, signal: cancelActive.signal });
  const after = engine.search(fen, { nodes: 5_000, searchMoves: ['c2c4'] });
  cancelActive.abort();
  await assert.rejects(active, { name: 'AbortError' });
  assert.equal(lastCommand, 'stop', 'The next request waits for the cancelled search to drain.');
  assert.equal((await after).move, 'c2c4');
  assert.equal(starts, 1, 'Normal active cancellation keeps the initialized worker.');
  assert.match(lastCommand, /searchmoves c2c4$/);

  const repeatStart = '6nk/8/8/8/8/8/8/KR4N1 w - - 0 1';
  const trail = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1'];
  const repeating = new Chess(repeatStart);
  for (const move of trail) repeating.move(move);
  const repeatPosition = repeating.fen();
  repeating.move('f6g8');
  assert(repeating.isThreefoldRepetition());
  const onlyPosition = await engine.search(repeatPosition, { nodes: 5_000, searchMoves: ['f6g8'] });
  const withHistory = await engine.search(repeatPosition, {
    nodes: 5_000, searchMoves: ['f6g8'], history: { fen: repeatStart, moves: trail },
  });
  assert(onlyPosition.score.type === 'cp' && onlyPosition.score.value < -100);
  assert(withHistory.score.type === 'cp' && Math.abs(withHistory.score.value) <= 2,
    'Stockfish should see the imminent draw when supplied the legal history.');

  // Check an extension and a changed trail after a verified prefix was held.
  // The UCI stream receives the full trail, never the validation checkpoint.
  const extension = [...trail, 'f6g8'];
  await assert.rejects(engine.search(repeatPosition, { history: { fen: repeatStart, moves: extension } }), /Game history does not match/);
  await assert.rejects(engine.search(repeating.fen(), { history: { fen: repeatStart, moves: [...trail, null] } }), /Game history does not match/);
  await engine.search(repeating.fen(), { nodes: 1_000, searchMoves: ['g1f3'], history: { fen: repeatStart, moves: extension } });
  assert(commands.includes(`position fen ${repeatStart} moves ${extension.join(' ')}`));
  const branch = trail.slice(0, -1).concat('f3h4');
  const branched = new Chess(repeatStart);
  for (const move of branch) branched.move(move);
  assert.equal((await engine.search(branched.fen(), {
    nodes: 1_000, searchMoves: ['f6g8'], history: { fen: repeatStart, moves: branch },
  })).move, 'f6g8');
  assert(commands.includes(`position fen ${repeatStart} moves ${branch.join(' ')}`));

  const mate = await engine.search('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  assert.equal(mate.move, null);
  assert.deepEqual(mate.score, { type: 'mate', value: 0 });
} finally {
  engine.dispose();
}
await assert.rejects(engine.search(fen), { name: 'AbortError' });
console.log('PASS Stockfish WASM legality, retained Elo, forced lines, warm cancellation, validated history, and terminal scores');
