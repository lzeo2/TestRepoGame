import assert from 'node:assert/strict';
import {
  BUILTIN_BOTS, MAX_BOT_CODE_LENGTH, MAX_BOT_ELO, MAX_BOT_RULES, MAX_BOT_RULE_EVERY,
  MAX_BOT_TURN_MOVES, MIN_BOT_ELO, botStrength, botTurnMoves, createBotStore,
  decodeBotCode, describeBotRule, encodeBotCode, exportBot, importBot, normalizeBot,
} from '../Games/Chess Workshop/bots.js';

const fading = BUILTIN_BOTS.find(bot => bot.id === 'fading');
assert.equal(botStrength(fading), 2250);
assert.equal(botStrength(fading, { botMoves: 1 }), 2200);
assert.equal(botStrength(fading, { botMoves: 2, playerMoves: 2, botCaptures: 1, botChecks: 1 }), 2150);
assert.equal(botStrength(fading, { botMoves: 100 }), MIN_BOT_ELO);
assert.equal(botTurnMoves(fading, { botMoves: 100 }), 1);
assert.equal(BUILTIN_BOTS.find(bot => bot.id === 'draw').goal, 'draw');
assert.equal(botTurnMoves(BUILTIN_BOTS.find(bot => bot.id === 'double')), 2);
assert.equal(botTurnMoves(BUILTIN_BOTS.find(bot => bot.id === 'triple')), 3);
const momentum = BUILTIN_BOTS.find(bot => bot.id === 'momentum');
assert.equal(botTurnMoves(momentum, { botCaptures: 0, botMoves: 3 }), 1);
assert.equal(botTurnMoves(momentum, { botCaptures: 1, playerMoves: 2 }), 2);
assert.equal(botTurnMoves(momentum, { botCaptures: 10 }), MAX_BOT_TURN_MOVES);

const draft = normalizeBot({
  name: ' Counterplay ',
  elo: 1800,
  goal: 'draw',
  turnMoves: 2,
  rules: [
    { trigger: 'playerMove', action: 'drop', amount: 25 },
    { trigger: 'botCapture', action: 'raise', amount: 60 },
    { trigger: 'botCheck', action: 'raise', amount: 40 },
    { trigger: 'botMove', action: 'drop', amount: 20 },
    { trigger: 'botCapture', action: 'raiseMoves', amount: 1 },
    { trigger: 'playerMove', action: 'dropMoves', amount: 1 },
  ],
});
assert.equal(draft.name, 'Counterplay');
assert.equal(botStrength(draft, { playerMoves: 2, botCaptures: 2, botChecks: 1, botMoves: 2 }), 1870);
assert.equal(botStrength(draft, { botChecks: 200 }), MAX_BOT_ELO);
assert.equal(botStrength(draft, { botMoves: -9, playerMoves: 1.5, botCaptures: '10' }), draft.elo);
assert.equal(botTurnMoves(draft), 2);
assert.equal(botTurnMoves(draft, { playerMoves: 1, botCaptures: 2, botChecks: 1, botMoves: 2 }), 3);
assert.equal(botTurnMoves(draft, { playerMoves: 10, botCaptures: 2 }), 1);
assert.equal(botTurnMoves(draft, { botCaptures: 10 }), MAX_BOT_TURN_MOVES);
assert.equal(botTurnMoves(draft, { botCaptures: 1.5, playerMoves: -10 }), 2);
assert(Object.isFrozen(draft) && Object.isFrozen(draft.rules) && Object.isFrozen(draft.rules[0]));
assert.deepEqual(importBot(exportBot(draft)), draft);
assert.throws(() => importBot('not JSON'), /valid JSON/);
assert.throws(() => importBot('x'.repeat(8193)), /under 8 KB/);
assert.throws(() => importBot('{"format":"chess-workshop-bot","version":999}'), /Choose a Chess Workshop/);
assert.throws(() => normalizeBot({ ...draft, rules: Array(MAX_BOT_RULES + 1).fill(draft.rules[0]) }), /up to 6/);
assert.throws(() => normalizeBot({ ...draft, rules: Array(1) }), /Choose an If block/);
assert.throws(() => normalizeBot({ ...draft, rules: [{ trigger: '__proto__', action: 'drop', amount: 50 }] }), /Choose an If block/);
assert.throws(() => normalizeBot({ ...draft, rules: [{ ...draft.rules[0], amount: 501 }] }), /Elo change/);
assert.throws(() => normalizeBot({ ...draft, turnMoves: MAX_BOT_TURN_MOVES + 1 }), /starting moves per turn/);
assert.throws(() => normalizeBot({ ...draft, turnMoves: null }), /starting moves per turn/);
assert.throws(() => normalizeBot({ ...draft, rules: [{ ...draft.rules[0], action: 'raiseMoves', amount: 4 }] }), /move change/);
assert.throws(() => normalizeBot({ ...draft, rules: [{ ...draft.rules[0], action: 'dropMoves', amount: 0 }] }), /move change/);

const cadenceBot = normalizeBot({
  name: '♞ Échecs 前進', elo: 2000, goal: 'draw', turnMoves: 2,
  rules: [
    { trigger: 'playerMove', action: 'drop', amount: 80, every: 3 },
    { trigger: 'playerCapture', action: 'raise', amount: 10, every: 2 },
    { trigger: 'playerCheck', action: 'raiseMoves', amount: 1, every: 2 },
  ],
}, 'custom-identity');
assert.equal(botStrength(cadenceBot, { playerMoves: 2, playerCaptures: 1, playerChecks: 3 }), 2000);
assert.equal(botStrength(cadenceBot, { playerMoves: 3, playerCaptures: 3, playerChecks: 3 }), 1930);
assert.equal(botStrength(cadenceBot, { playerMoves: 7, playerCaptures: 4, playerChecks: 3 }), 1860);
assert.equal(botTurnMoves(cadenceBot, { playerChecks: 1, botChecks: 7 }), 2);
assert.equal(botTurnMoves(cadenceBot, { playerChecks: 3 }), 3);
assert.equal(describeBotRule(cadenceBot.rules[0]), 'After every 3 player moves, subtract 80 Elo.');
assert.equal(describeBotRule({ trigger: 'playerCheck', action: '', amount: 1 }), '');
assert.throws(() => normalizeBot({
  ...draft, rules: [{ ...draft.rules[0], every: MAX_BOT_RULE_EVERY + 1 }],
}), /run every/);
for (const every of [0, -1, 1.5, null, '3']) {
  assert.throws(() => normalizeBot({ ...draft, rules: [{ ...draft.rules[0], every }] }), /run every/);
}
assert.deepEqual(importBot(exportBot(cadenceBot)), { ...cadenceBot, id: null });

const code = encodeBotCode(cadenceBot);
assert.match(code, /^CW1\.[A-Za-z0-9_-]+$/);
assert.equal(code, encodeBotCode({ ...cadenceBot, id: 'custom-other-identity' }));
assert.deepEqual(decodeBotCode(` \n${code}\r\n`), { ...cadenceBot, id: null });
assert.equal(encodeBotCode(decodeBotCode(code)), code);
assert.deepEqual(decodeBotCode(encodeBotCode(fading)), { ...fading, id: null });
assert.equal(
  encodeBotCode({ ...fading, rules: [{ ...fading.rules[0], every: 1 }] }),
  encodeBotCode(fading),
);
const rawCode = wire => 'CW1.' + Buffer.from(wire).toString('base64url');
for (const invalid of [
  null, '', code + '=', 'CW2.' + code.slice(4), 'CW1.' + 'A'.repeat(MAX_BOT_CODE_LENGTH),
  rawCode(Uint8Array.of(0xC0, 0x80)), rawCode('{}'), rawCode('["X",1500,2,1,[]]'),
  rawCode('["X",1500,0,1,[[9,0,50,1]]]'), rawCode('["X",1500,0,1,[[0,0,50,0]]]'),
  rawCode('[ "X",1500,0,1,[]]'),
]) {
  assert.throws(() => decodeBotCode(invalid), /valid Chess Workshop bot code/);
}
const longestCode = encodeBotCode({
  name: '\ud800'.repeat(40), elo: MAX_BOT_ELO, goal: 'draw', turnMoves: MAX_BOT_TURN_MOVES,
  rules: Array(MAX_BOT_RULES).fill({ trigger: 'playerCapture', action: 'raise', amount: 500, every: MAX_BOT_RULE_EVERY }),
});
assert(longestCode.length <= MAX_BOT_CODE_LENGTH);
assert.equal(encodeBotCode(decodeBotCode(longestCode)), longestCode);

const legacy = { id: 'custom-legacy', name: 'Classic', elo: 1500, goal: 'win', rules: [{ trigger: 'botMove', action: 'drop', amount: 50 }] };
const legacyFile = JSON.stringify({ format: 'chess-workshop-bot', version: 1, bot: legacy });
const restoredLegacy = importBot(legacyFile);
assert.equal(restoredLegacy.turnMoves, 1);
assert.equal(botStrength(restoredLegacy, { botMoves: 2 }), 1400);
assert.equal(botTurnMoves(legacy), 1);

const local = new Map();
const storage = { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) };
const store = createBotStore(storage);
const { bot, persisted } = store.save(draft);
assert(persisted && bot.id.startsWith('custom-'));
assert.deepEqual(createBotStore(storage).list(), [bot]);
const edited = store.save({ ...bot, name: 'New name' }, bot.id).bot;
assert.equal(edited.id, bot.id);
assert.deepEqual(store.list(), [edited]);
assert.equal(store.delete(bot.id), true);
assert.deepEqual(createBotStore(storage).list(), []);
storage.setItem('chess-workshop-bots-v1', JSON.stringify([legacy]));
const legacyStore = createBotStore(storage);
assert.deepEqual(legacyStore.list(), [{ ...legacy, turnMoves: 1 }]);
legacyStore.save({ ...legacyStore.list()[0], turnMoves: 4 }, legacy.id);
assert.equal(createBotStore(storage).list()[0].turnMoves, 4);
const unavailable = createBotStore(null);
assert.equal(unavailable.save(draft).persisted, false);
assert.equal(unavailable.list().length, 1);
const corrupt = createBotStore({ getItem: () => 'This was never JSON.' });
assert.deepEqual(corrupt.list(), []);

console.log('PASS Chess Workshop rule cadence, bot codes, bounded presets, legacy imports, and local library');
