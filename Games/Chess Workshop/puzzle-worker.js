import { createPuzzles } from './puzzles.js';

self.addEventListener('message', ({ data: { id, difficulty, options } }) => {
  try {
    self.postMessage({ id, puzzle: createPuzzles(options).next(difficulty) });
  } catch {
    self.postMessage({ id, puzzle: null });
  }
});
