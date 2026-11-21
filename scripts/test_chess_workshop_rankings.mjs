import assert from 'node:assert/strict';
import { createRankingStore } from '../Games/Chess Workshop/rankings.js';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const store = createRankingStore(storage);
const match = (id, moves, seconds) => store.recordMatch({ botId: 'double', id, moves, seconds });

assert.deepEqual(store.rows('double'), []);
assert.equal(store.alias(), 'Player');
assert.equal(store.setAlias('  Nora  '), true);
assert.equal(store.alias(), 'Nora');
assert.equal(match('nora-first', 10, 51.5), true);
assert.equal(match('nora-worse', 11, 29), false, 'fewer moves outranks time');
assert.equal(match('nora-better', 10, 37.5), true);
assert.equal(store.setAlias('nora'), true);
assert.equal(match('nora-alias', 10, 40), false, 'names are case-insensitive for personal bests');
assert.equal(store.recordPuzzle({ kind: 'mate1', id: 'nora-worse', seconds: 3 }), false, 'ignored scores still count toward dedupe');
assert.equal(store.setAlias('Jin'), true);
assert.equal(match('jin', 9, 102), true);
assert.deepEqual(store.rows('double').map(({ alias, moves, ms }) => ({ alias, moves, ms })), [
  { alias: 'Jin', moves: 9, ms: 102_000 },
  { alias: 'Nora', moves: 10, ms: 37_500 },
]);
assert.equal(match('jin', 1, 0), false);
assert.equal(match('xx!', 1, 0), false);
assert.equal(match('invalid-time', 1, -1), false);
assert.equal(match('invalid-time', 1, Symbol('x')), false);
assert.equal(match('invalid-time', 1, Infinity), false);
assert.equal(match('invalid-moves', -1, 0), false);
assert.equal(store.recordMatch({ botId: 'custom-does-not-rank', moves: 1, id: 'custom', seconds: 1 }), false);
assert.equal(store.recordMatch(null), false);

assert.equal(store.recordPuzzle({ kind: 'mate1', seconds: 8.52, id: 'mate-a' }), true);
assert.equal(store.recordPuzzle({ kind: 'mate2', seconds: 19.1, id: 'mate-b' }), true);
assert.equal(store.recordPuzzle({ kind: 'mixed', seconds: 5, id: 'mate-other' }), false);
const freshTab = createRankingStore(storage);
assert.equal(freshTab.alias(), 'Jin');
assert.equal(freshTab.rows('mate1')[0].ms, 8520);
assert.equal(freshTab.rows('mate2')[0].ms, 19_100);
assert.equal(freshTab.setAlias('Maya'), true);
assert.equal(store.alias(), 'Maya', 'a later write sees scores and name from another tab');
assert.equal(store.recordPuzzle({ kind: 'mate1', seconds: 5, id: 'mate-c' }), true);
assert.deepEqual(freshTab.rows('mate1').map(row => row.alias), ['Maya', 'Jin']);
freshTab.rows('mate1')[0].alias = 'mutated';
assert.equal(freshTab.rows('mate1')[0].alias, 'Maya');

for (let rank = 0; rank < 35; rank++) {
  store.setAlias(`Guest ${rank}`);
  store.recordMatch({ botId: 'triple', seconds: 1, moves: 99 - rank, id: `limit-${rank}` });
}
assert.equal(store.rows('triple').length, 20);
assert.equal(store.rows('triple')[0].moves, 65);
assert.equal(store.rows('triple').at(-1).moves, 84);

const volatile = createRankingStore({ getItem: () => null, setItem() { throw new Error('Quota'); } });
assert.equal(volatile.setAlias('This tab'), false);
assert.equal(volatile.isPersistent(), false);
assert.equal(volatile.recordMatch({ botId: 'draw', moves: 3, seconds: 8, id: 'drawn' }), true);
assert.equal(volatile.rows('draw')[0].alias, 'This tab');
const broken = createRankingStore({ getItem: () => '{broken-json', setItem() {} });
assert.equal(broken.alias(), 'Player');
assert.deepEqual(broken.rows('mate1'), []);

console.log('PASS local leaderboards validate, rank, bound, dedupe and preserve personal bests');
