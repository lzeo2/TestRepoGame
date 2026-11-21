import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createPuzzleSource } from '../Games/Chess Workshop/puzzle-source.js';

const entry = new URL('../Games/Chess Workshop/puzzle-worker.js', import.meta.url);
let workers = 0;
function nodeWorker() {
  workers++;
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    globalThis.self = {
      addEventListener: (type, callback) => parentPort.on(type, data => callback({ data })),
      postMessage: message => parentPort.postMessage(message),
    };
    import(workerData).catch(error => setImmediate(() => { throw error; }));
  `, { eval: true, workerData: entry.href });
  return {
    addEventListener(type, callback) {
      worker.on(type, data => callback({ data, preventDefault() {} }));
    },
    postMessage(message) { worker.postMessage(message); },
    terminate() { void worker.terminate(); },
  };
}

const source = createPuzzleSource({ seed: 12, workerFactory: nodeWorker });
const blocked = createPuzzleSource({ seed: 12, workerFactory() { throw new Error('Blocked by browser policy'); } });
try {
  assert.equal(workers, 0, 'creation leaves the worker idle until the first puzzle');
  const difficulties = ['mate1', 'mate2', 'mixed', 'mate2', 'mate2'];
  const exact = await Promise.all(difficulties.map(mode => source.next(mode)));
  const fallback = await Promise.all(difficulties.map(mode => blocked.next(mode)));
  assert.deepEqual(exact, fallback, 'worker and fallback preserve the same seeded choices');
  assert.equal(workers, 1, 'one worker handles concurrent queries');
  assert.equal(new Set(exact.map(puzzle => puzzle.fen)).size, exact.length);
} finally {
  source.dispose();
  blocked.dispose();
}

let stopped = 0;
let silentWorkers = 0;
function silentWorker() {
  silentWorkers++;
  return { addEventListener() {}, postMessage() {}, terminate() { stopped++; } };
}

const silent = createPuzzleSource({ seed: 24, timeoutMs: 10, workerFactory: silentWorker });
const active = new AbortController();
const queued = new AbortController();
try {
  const first = silent.next('mate2', { signal: active.signal });
  const second = silent.next('mate2', { signal: queued.signal });
  const third = silent.next('mate1');
  const activeReject = assert.rejects(first, { name: 'AbortError' });
  const queuedReject = assert.rejects(second, { name: 'AbortError' });
  queued.abort();
  active.abort();
  await Promise.all([activeReject, queuedReject]);
  assert.equal((await third).moves, 1, 'timeout falls back for the next live request');
  assert.equal(stopped, 1, 'timeout terminates the unresponsive worker');
  assert.equal(silentWorkers, 1, 'later queries stay on the asynchronous fallback');
} finally {
  silent.dispose();
}

const disposed = createPuzzleSource({ workerFactory: silentWorker });
const waiting = assert.rejects(disposed.next('mate2'), { name: 'AbortError' });
const pending = assert.rejects(disposed.next('mate2'), { name: 'AbortError' });
disposed.dispose();
await Promise.all([waiting, pending]);
await assert.rejects(disposed.next('mate2'), { name: 'AbortError' });

console.log('PASS reusable module puzzle worker, deterministic local fallback, serial queue, cancellation, timeout and disposal');
