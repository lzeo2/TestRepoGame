import assert from 'node:assert/strict';
import { botStrength, botTurnMoves, encodeBotCode } from '../Games/Chess Workshop/bots.js';
import { decodeMarketCode, findMarketBots, MARKET_BOTS } from '../Games/Chess Workshop/market.js';

const profile = name => MARKET_BOTS.find(entry => entry.key === name)?.bot;
assert.equal(new Set(MARKET_BOTS.map(entry => entry.key)).size, MARKET_BOTS.length);
assert.ok(MARKET_BOTS.length >= 6);
assert.equal(new Set(MARKET_BOTS.map(entry => encodeBotCode(entry.bot))).size, MARKET_BOTS.length);

for (const { bot } of MARKET_BOTS) {
  const code = encodeBotCode(bot);
  assert.deepEqual(decodeMarketCode(code), bot);
  assert.deepEqual(decodeMarketCode(`  #bot=${encodeURIComponent(code)}  `), bot);
  assert.deepEqual(decodeMarketCode(`https://example.invalid/workshop#bot=${code}`), bot);
}
assert.deepEqual(findMarketBots('opening  RUSH', 'bonus').map(({ key }) => key), ['opening-rush']);
assert.deepEqual(findMarketBots('', 'bonus').map(({ key }) => key), ['opening-rush', 'three-beat', 'quiet-siege']);
assert.deepEqual(findMarketBots('', 'draw').map(({ key }) => key), ['truce']);
assert.deepEqual(findMarketBots('per move challenge'), []);
assert.equal(findMarketBots('CAPTURE', 'elo').length, 1);
assert.equal(findMarketBots('Counterpunch', 'draw').length, 0);
assert.throws(() => decodeMarketCode('#source=market'), /reusable bot code/);
assert.throws(() => decodeMarketCode('fake'));
assert.throws(() => decodeMarketCode('X'.repeat(5000)), /valid reusable bot code/);

assert.equal(botTurnMoves(profile('opening-rush'), { botMoves: 2 }), 2);
assert.equal(botTurnMoves(profile('opening-rush'), { botMoves: 4 }), 1);
assert.equal(botStrength(profile('counterpunch'), { playerCaptures: 2 }), 1600);
assert.equal(botTurnMoves(profile('three-beat'), { botMoves: 6 }), 3);
assert.equal(botTurnMoves(profile('quiet-siege'), { botChecks: 1 }), 1);
assert.equal(botStrength(profile('check-pressure'), { playerChecks: 2 }), 1850);
assert.equal(botStrength(profile('truce'), { playerMoves: 16 }), 1500);
console.log('PASS curated bot validation, reusable share links, market filters, and actual cadence/challenge behaviour');
