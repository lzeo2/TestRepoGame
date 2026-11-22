import assert from 'node:assert/strict';
import { createHeistActivities } from '../Games/Capital Drive/heist-activities.js';

const bank = { id:'civic-bank', name:'Civic Ledger Bank', kind:'bank', x:0, z:0, radius:3 };
const jewel = { id:'manuka-jewels', name:'Manuka Gems', kind:'jeweller', x:0, z:100 };
const rail = { id:'rail-parcels', name:'Metro Parcel Run', kind:'rail', x:100, z:0,
  stopId:'rail-alinga', arrivalStopId:'rail-elouera', boarding:{x:106,z:0}, pickup:{x:300,z:0} };
const onFoot = (pose, extra = {}) => ({ pose, onFoot:true, wanted:0, ...extra });
const aboard = (pose, railStopId = null, extra = {}) => ({ pose, wanted:0, railPassenger:true, railStopId, ...extra });

function fixture(options) {
  const heat = [], rewards = [];
  const heists = createHeistActivities({ sites:[bank,jewel,rail], onHeat:event=>heat.push(event),
    onReward:event=>rewards.push(event), ...options });
  return { heists, heat, rewards };
}

function playSequence(heists, ctx) {
  const sequence = heists.snapshot().challenge.sequence;
  for (const symbol of sequence) {
    heists.step(1/60, ctx);
    heists.step(1/60, ctx, { [symbol]:true });
  }
}

{
  let clear = false;
  const { heists, heat, rewards } = fixture({canSee:()=>clear});
  const entry = onFoot(bank);
  assert.equal(heists.interact(entry), null, 'the marker must be in clear reach');
  clear = true;
  for (const ctx of [onFoot({x:30,z:0}), onFoot(bank,{busy:true}), onFoot(bank,{indoors:true}),
    onFoot(bank,{swimming:true}), onFoot(bank,{paused:true}), onFoot(bank,{recovering:true})]) {
    assert.equal(heists.interact(ctx), null);
  }
  assert.equal(heists.interact(onFoot(bank,{wanted:2})).ok, false);
  assert.equal(heists.interact(entry).ok, true);
  assert.equal(heists.snapshot().phase, 'puzzle');
  assert.deepEqual(heists.snapshot().challenge.sequence,['x','up','y','up','x']);
  assert.equal(heists.snapshot().target.id, bank.id);
  heists.step(1/60, entry, {x:true});
  assert.equal(heists.snapshot().challenge.index, 0, 'input held at admission cannot count');
  heists.step(1/60, entry);
  heists.step(1/60, entry, {x:true});
  heists.step(1/60, entry, {x:true});
  assert.equal(heists.snapshot().challenge.index, 1, 'holding a key cannot repeat the action');
  heists.step(1/60, entry);
  assert.match(heists.step(1/60, entry, {y:true}).message,/Wrong symbol/);
  assert.equal(heists.snapshot().challenge.index, 0);
  assert.equal(heat.length, 0);
  playSequence(heists, entry);
  assert.equal(heists.snapshot().phase, 'escape');
  assert.deepEqual(heat, [{ id:bank.id, kind:'bank', point:{x:0,z:0}, severity:3 }]);
  assert.match(heists.snapshot().guidance, /52 m/);
  assert.equal(heists.interact(entry), null, 'Escape does not take the normal interaction button');
  heists.step(.1, onFoot({x:120,z:0}));
  assert.equal(rewards.length, 0, 'a career completion requires actually acquiring wanted stars');
  heists.step(.1, onFoot({x:25,z:0},{wanted:3}));
  heists.step(.1, onFoot({x:120,z:0},{wanted:1}));
  heists.step(.1, onFoot({x:25,z:0}));
  assert.equal(heists.active, true, 'clearing heat beside the pickup is insufficient');
  assert.match(heists.step(.1, onFoot({x:120,z:0})).message, /2,750/);
  assert.deepEqual(rewards, [{ id:bank.id, kind:'bank', amount:2750 }]);
  assert.equal(heists.step(.1,onFoot({x:120,z:0})), null);
  assert.equal(heists.snapshot().active, false);
  assert.match(heists.interact(entry).message, /available in 360s/);
  for (let second=0;second<360;second++) heists.step(1, onFoot(bank,{paused:true}));
  assert.match(heists.interact(entry).message, /available in 360s/);
  for (let second=0;second<360;second++) heists.step(1, entry);
  assert.equal(heists.interact(entry).ok, true, 'the cooled-down target can be replayed');
}

{
  const { heists, heat, rewards } = fixture();
  const entry = onFoot(jewel);
  assert.equal(heists.interact(entry).ok, true);
  assert.match(heists.interact(entry).message, /cancelled/);
  assert.equal(heists.interact(entry).ok, true, 'a cancelled puzzle is an immediate retry');
  assert.match(heists.step(1/60, onFoot({x:10,z:100})).message, /retry/);
  heists.interact(entry);
  playSequence(heists, entry);
  heists.step(.1, onFoot({x:10,z:100},{wanted:2}));
  assert.equal(heists.step(.1, onFoot({x:40,z:100})).ok, true);
  assert.equal(heat.at(0).severity, 2);
  assert.equal(rewards.at(0).amount, 1500);
}

{
  const { heists, heat, rewards } = fixture();
  const entry = onFoot(rail);
  assert.equal(heists.interact(entry).ok, true);
  assert.equal(heists.snapshot().phase, 'board');
  assert.equal(heists.snapshot().target.x, rail.boarding.x);
  assert.equal(heists.interact(entry), null, 'active job does not intercept the boarding button');
  assert.equal(heists.step(.1, aboard(rail.boarding, 'rail-ipima')), null);
  assert.equal(heists.step(.1, aboard(rail.boarding, rail.stopId)).ok, true);
  assert.equal(heists.snapshot().target.x, rail.pickup.x);
  assert.equal(heists.interact(aboard(rail.boarding, rail.stopId)), null);
  assert.equal(heists.interact(aboard(rail.pickup, 'rail-ipima')), null);
  assert.equal(heists.interact(aboard(rail.pickup)), null, 'pickup cannot start between stops');
  assert.equal(heists.interact(aboard(rail.pickup, rail.arrivalStopId)).ok, true);
  playSequence(heists, aboard(rail.pickup));
  assert.equal(heists.interact(aboard(rail.pickup)), null, 'departure can use normal disembarking');
  assert.equal(heists.step(.1, aboard({x:500,z:0},null,{wanted:2})), null);
  assert.equal(heists.step(.1, aboard({x:500,z:0})), null, 'staying aboard is not an extraction');
  assert.match(heists.snapshot().guidance,/leave the train/i);
  assert.equal(heists.step(.1,onFoot({x:500,z:0})).ok,true);
  assert.equal(heat.length,1);
  assert.equal(rewards.at(0).amount,1950);
}

{
  const { heists, heat, rewards } = fixture();
  const practice = onFoot(jewel,{sandbox:true});
  heists.interact(practice);
  playSequence(heists, practice);
  assert.equal(heists.step(.1,onFoot({x:55,z:100},{sandbox:true})).message,'Practice heist complete.');
  assert.deepEqual(heat, []);
  assert.deepEqual(rewards, []);
  assert.equal(heists.interact(onFoot(jewel)).ok, true, 'practice creates no cooldown');
  assert.match(heists.step(.1,onFoot(jewel,{recovering:true})).message,/interrupted/);
  heists.interact(onFoot(bank));
  assert.match(heists.step(.1,onFoot(bank,{sandbox:true})).message,/interrupted/);
  heists.interact(onFoot(rail));
  heists.step(.1,aboard(rail.boarding,rail.stopId));
  assert.match(heists.step(.1,onFoot(rail.pickup)).message,/left the train/);
}

console.log('PASS parody heists: gated markers, fixed-step symbol prompts, active rail boarding and stop pickup, actual heat and extraction, one payout, cooldown and practice isolation.');
