import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { matchesMissionCode } from '../Games/Capital Drive/dev-missions.js';

const fixture = 'Fixture-Mission-Only';
const digest = createHash('sha256').update(fixture).digest('hex');
const options = { crypto: webcrypto, digest };
assert.equal(await matchesMissionCode(fixture, options), true);
for (const value of [undefined, null, true, 42, {}, [], new String(fixture), '', 'x'.repeat(33), fixture.toLowerCase(), ` ${fixture}`, `${fixture} `]) {
  assert.equal(await matchesMissionCode(value, options), false, 'input is bounded, exact and case-sensitive');
}
for (const crypto of [undefined, null, {}, { subtle: {} }, { subtle: { digest: async () => { throw new Error('unavailable'); } } }]) {
  assert.equal(await matchesMissionCode(fixture, { crypto, digest: '0'.repeat(64) }), false, 'crypto failure fails closed');
}
assert.equal(await matchesMissionCode(fixture, { ...options, digest: 'invalid' }), false);
assert.equal(await matchesMissionCode('x'.repeat(32), { ...options, digest: createHash('sha256').update('x'.repeat(32)).digest('hex') }), true);
assert.equal(await matchesMissionCode(fixture), false, 'test fixture cannot activate the configured code');
console.log('PASS mission code: exact bounded input, SHA-256 fixture, case sensitivity and unavailable-crypto rejection');
