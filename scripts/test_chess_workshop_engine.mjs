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
  assert.equal(starts, 0, 'Invalid requests must not boot the worker.');

  const real = engine.search(fen, { nodes: 5_000, elo: MIN_ELO - 50 });
  const forced = engine.search(fen, { nodes: 5_000, searchMoves: ['e2e4'] });
  const [result, line] = await Promise.all([real, forced]);
  assert.equal(starts, 1, 'Consecutive requests should share the worker.');
  assert(legal.has(result.move), 'Stockfish returned a legal opening move.');
  assert.deepEqual(line.pv[0], 'e2e4');
  assert.equal(line.move, 'e2e4');
  assert.equal(line.score.type, 'cp');
  assert(Number.isFinite(line.score.value));
  assert(commands.includes(`setoption name UCI_Elo value ${MIN_ELO}`));
  assert(commands.includes('setoption name UCI_LimitStrength value false'));
  assert.equal(MAX_ELO, 3190);

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
  assert.equal((await after).move, 'c2c4');
  assert.equal(starts, 2, 'Cancelling an active search retires the worker.');
  assert.match(lastCommand, /searchmoves c2c4$/);

  const mate = await engine.search('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
  assert.equal(mate.move, null);
  assert.deepEqual(mate.score, { type: 'mate', value: 0 });
} finally {
  engine.dispose();
}
await assert.rejects(engine.search(fen), { name: 'AbortError' });
console.log('PASS chess.js legality, Stockfish WASM search, Elo, forced lines, cancellations, and terminal scores');
