import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../Games/Chess/', import.meta.url);
const posts = [];
const context = vm.createContext({
  self: { postMessage: (message) => posts.push(message) },
  importScripts: (...paths) => {
    for (const path of paths) {
      const source = fs.readFileSync(new URL(path, base), 'utf8');
      vm.runInContext(source, context, { filename: path });
    }
  },
});
vm.runInContext(fs.readFileSync(new URL('chess-worker.js', base), 'utf8'), context, {
  filename: 'chess-worker.js',
});

const search = (fen, maxDepth = 2, requestId = 1) => {
  posts.length = 0;
  context.self.onmessage({ data: { type: 'search', fen, maxDepth, requestId } });
  return posts.slice();
};

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const game = new context.Chess(startingFen);
game.move({ from: 'e2', to: 'e4' });
const replies = search(game.fen(), 2, 7);
const progress = replies.filter((message) => message.type === 'progress');
const complete = replies.at(-1);
assert.deepEqual(progress.map((message) => message.depth), [0, 1, 2]);
assert.equal(complete.type, 'complete');
assert.equal(complete.requestId, 7);
assert.ok(complete.positions > 0);
assert.ok(complete.move.from && complete.move.to);
assert.ok(game.move(complete.move), 'worker returns a legal reply for the supplied board');

const terminal = search('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', 5, 8);
assert.equal(terminal.length, 1);
assert.equal(terminal[0].type, 'complete');
assert.equal(terminal[0].move, undefined);
assert.equal(terminal[0].positions, 0);

console.log('Chess worker: iterative depth, legal reply, request identity, and terminal position passed.');
