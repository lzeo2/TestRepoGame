import { createPuzzles, RECENT_LIMIT } from './puzzles.js';

function createWorker() {
  return new Worker(new URL('./puzzle-worker.js', import.meta.url), { type: 'module' });
}

function abortError() {
  return new DOMException('Puzzle generation was cancelled.', 'AbortError');
}

export function createPuzzleSource({
  seed = Math.floor(Math.random() * 2 ** 32), workerFactory = createWorker, timeoutMs = 4000,
} = {}) {
  const queued = [];
  const recent = [];
  let previousTitle = '';
  let worker = null;
  let useWorker = true;
  let active = null;
  let disposed = false;
  let serial = 0;

  function settle(task, error, puzzle) {
    if (task.settled) return;
    task.settled = true;
    task.signal?.removeEventListener('abort', task.abort);
    if (error) task.reject(error);
    else task.resolve(puzzle);
  }

  function finish(task, error, puzzle) {
    clearTimeout(task.timer);
    active = null;
    if (!task.settled) {
      if (!error) {
        if (recent.length === RECENT_LIMIT) recent.shift();
        recent.push(puzzle.fen);
        previousTitle = puzzle.title;
      }
      settle(task, error, puzzle);
    }
    pump();
  }

  function local(task) {
    clearTimeout(task.timer);
    // A blocked worker still yields before bounded fallback work.
    task.timer = setTimeout(() => {
      if (task.settled) return finish(task, abortError());
      const { difficulty, options } = task.message;
      let puzzle;
      try {
        puzzle = createPuzzles(options).next(difficulty);
      } catch (error) {
        finish(task, error);
        return;
      }
      finish(task, null, puzzle);
    }, 0);
  }

  function stopWorker() {
    const previous = worker;
    worker = null;
    useWorker = false;
    previous?.terminate();
  }

  function workerFailed(previous) {
    if (previous !== worker) return;
    stopWorker();
    if (active) local(active);
  }

  function initializeWorker() {
    const instance = workerFactory();
    instance.addEventListener('message', ({ data }) => {
      if (instance !== worker || !active || data?.id !== active.id) return;
      const puzzle = data.puzzle;
      if (typeof puzzle?.fen !== 'string' || typeof puzzle.title !== 'string' || !Array.isArray(puzzle.solution)) {
        workerFailed(instance);
        return;
      }
      finish(active, null, puzzle);
    });
    instance.addEventListener('error', event => {
      event.preventDefault();
      workerFailed(instance);
    });
    instance.addEventListener('messageerror', () => workerFailed(instance));
    return instance;
  }

  function pump() {
    if (disposed || active || !queued.length) return;
    const task = queued.shift();
    active = task;
    task.message = {
      id: task.id,
      difficulty: task.difficulty,
      options: { seed: (seed + Math.imul(task.id, 0x9e3779b9)) >>> 0, recent: recent.slice(), previousTitle },
    };
    if (useWorker) {
      try {
        worker ??= initializeWorker();
        const instance = worker;
        task.timer = setTimeout(() => workerFailed(instance), timeoutMs);
        worker.postMessage(task.message);
        return;
      } catch {
        stopWorker();
      }
    }
    local(task);
  }

  function next(difficulty, { signal } = {}) {
    if (disposed || signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const task = { id: ++serial, difficulty, signal, resolve, reject };
      task.abort = () => {
        const index = queued.indexOf(task);
        if (index !== -1) queued.splice(index, 1);
        settle(task, abortError());
      };
      signal?.addEventListener('abort', task.abort, { once: true });
      queued.push(task);
      pump();
    });
  }

  function dispose() {
    disposed = true;
    stopWorker();
    if (active) {
      clearTimeout(active.timer);
      settle(active, abortError());
      active = null;
    }
    for (const task of queued.splice(0)) settle(task, abortError());
  }

  return { next, dispose };
}
